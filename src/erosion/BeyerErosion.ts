// BeyerErosion.ts: Adapted implementation of Beyer's hydraulic erosion
// algorithm, estimating hydraulic erosion using a particle-based model.
//
// Source(s):
// - http://www.firespark.de/resources/downloads/implementation%20of%20a%20methode%20for%20hydraulic%20erosion.pdf
// - https://ranmantaru.com/blog/2011/10/08/water-erosion-on-heightmap-terrain/

import * as THREE from "three";
import {type RandomFn} from "../utils/Random";
import type {IErosionModel} from "./IErosionModel.ts";
import type {IErosionControls} from "../gui/IErosionControls.ts";
import type GUI from "lil-gui";

/**
 * Parameters for Beyer's hydraulic erosion simulation.
 * Controls droplet behavior, erosion/deposition rates, and post-processing.
 */
export interface IErosionParams {
  // Core simulation parameters

  /** Number of water droplets to simulate */
  iterations: number;

  /** Direction inertia factor (0-1). Higher values make droplets flow straighter */
  inertia: number;

  /** Sediment carrying capacity multiplier. Higher values allow more sediment transport */
  capacity: number;

  /** Minimum slope angle for capacity calculation. Prevents erosion on flat terrain */
  minSlope: number;

  /** Rate of terrain erosion (0-1). Higher values erode terrain faster */
  erosionSpeed: number;

  /** Rate of sediment deposition (0-1). Higher values deposit sediment faster */
  depositionSpeed: number;

  /** Rate of water evaporation per step (0-1). Higher values shorten droplet lifetime */
  evaporationSpeed: number;

  /** Gravity acceleration factor. Affects droplet velocity on slopes */
  gravity: number;

  /** Maximum number of simulation steps per droplet */
  maxPath: number;

  /** Radius in pixels for erosion brush. Larger values create smoother erosion */
  erosionRadius: number;

  /** Radius in pixels for deposition brush. Can be larger than erosionRadius for smoother deposits */
  depositionRadius: number;

  // Droplet variation parameters

  /** Minimum lifetime multiplier (e.g., 0.5 = 50% of maxPath) */
  minLifetime: number;

  /** Maximum lifetime multiplier (e.g., 1.5 = 150% of maxPath) */
  maxLifetime: number;

  /** Minimum initial water volume (e.g., 0.7 = 70% of standard volume) */
  minWater: number;

  /** Maximum initial water volume (e.g., 1.3 = 130% of standard volume) */
  maxWater: number;

  // Blurring parameters

  /** Enable Gaussian blur on change map to smooth erosion artifacts */
  enableBlurring: boolean;

  /** Blur kernel radius in pixels. Larger values create smoother results */
  blurRadius: number;

  /** Blend factor between blurred and unblurred change map (0-1). 0 = no blur, 1 = full blur */
  blendFactor: number;

  /** Random number generator function for reproducible terrain generation */
  randomFn: RandomFn;
}

export class BeyerErosion implements IErosionModel, IErosionControls {
  // Default parameters from Beyer's paper
  static readonly DEFAULT_PARAMS: IErosionParams = {
    iterations: 200000,
    inertia: 0.05,
    capacity: 6,
    minSlope: 0.01,
    erosionSpeed: 0.3,
    depositionSpeed: 0.3,
    evaporationSpeed: 0.001,
    gravity: 4,
    maxPath: 24,
    erosionRadius: 4,
    depositionRadius: 4,
    minLifetime: 0.7,
    maxLifetime: 1.0,
    minWater: 0.7,
    maxWater: 1.2,
    enableBlurring: true,
    blurRadius: 1,
    blendFactor: 0.5,
    randomFn: Math.random,
  };

  private static Droplet = class {
    position: THREE.Vector2;
    direction: THREE.Vector2;
    velocity: number;
    volume: number;
    sediment: number;

    constructor(
      startPosition: THREE.Vector2 = new THREE.Vector2(0, 0),
      direction: THREE.Vector2 = new THREE.Vector2(0, 0),
    ) {
      this.position = startPosition.clone();
      this.direction = direction.clone();
      this.velocity = 1.0;
      this.volume = 1.0;
      this.sediment = 0;
    }
  }
  private static readonly EPSILON = 1e-3;
  public readonly params: IErosionParams;
  // Change map for incremental erosion
  private changeMap: Float32Array | null = null;
  private changeMapWidth: number = 0;
  private changeMapHeight: number = 0;

  constructor(params: Partial<IErosionParams> = {}) {
    this.params = {...BeyerErosion.DEFAULT_PARAMS, ...params};
  }

  //======================================== IErosionControls Interface ====//
  setupControls(gui: GUI, onParameterChange?: () => void): void {
    gui.add(this.params, 'maxPath', 16, 128, 1)
      .onFinishChange(() => onParameterChange?.())
      .name('Droplet Lifetime')
      .domElement.title = 'Maximum length of droplet lifetime (higher = more erosion per droplet)';

    gui.add(this.params, 'inertia', 0, 1, 0.1)
      .onFinishChange(() => onParameterChange?.())
      .name('Inertia')
      .domElement.title = 'How much droplets maintain their direction (0 = follow slope exactly, 1 = ignore slope)';

    gui.add(this.params, 'capacity', 1, 32, 1)
      .onFinishChange(() => onParameterChange?.())
      .name('Sediment Capacity')
      .domElement.title = 'Multiplier for how much sediment a droplet can carry';

    gui.add(this.params, 'minSlope', 0.001, 0.02, 0.001)
      .onFinishChange(() => onParameterChange?.())
      .name('Min Slope')
      .domElement.title = 'Minimum slope used in sediment capacity calculation';

    gui.add(this.params, 'erosionSpeed', 0.01, 1, 0.01)
      .onFinishChange(() => onParameterChange?.())
      .name('Erosion Speed')
      .domElement.title = 'How quickly terrain is eroded (0.01 = minimum, 1 = maximum)';

    gui.add(this.params, 'depositionSpeed', 0, 1, 0.01)
      .onFinishChange(() => onParameterChange?.())
      .name('Deposition Speed')
      .domElement.title = 'How quickly sediment is deposited (0 = no deposition, 1 = maximum)';

    gui.add(this.params, 'evaporationSpeed', 0, 0.1, 0.01)
      .onFinishChange(() => onParameterChange?.())
      .name('Evaporation Speed')
      .domElement.title = 'How quickly water evaporates from droplets (higher = shorter droplet lifetime)';

    gui.add(this.params, 'gravity', 1, 32, 1)
      .onFinishChange(() => onParameterChange?.())
      .name('Gravity')
      .domElement.title = 'Gravity acceleration factor affecting droplet velocity';

    gui.add(this.params, 'erosionRadius', 1, 16, 1)
      .onFinishChange(() => onParameterChange?.())
      .name('Erosion Radius')
      .domElement.title = 'Radius of terrain affected when eroding (larger = smoother erosion)';

    gui.add(this.params, 'depositionRadius', 1, 16, 1)
      .onFinishChange(() => onParameterChange?.())
      .name('Deposition Radius')
      .domElement.title = 'Radius of terrain affected when depositing sediment (larger = smoother deposits)';

  }

  getControlsFolderName(): string {
    return "Parameter Settings";
  }

  //============================================= IErosionModel Interface ====//
  getName(): string {
    return "Beyer";
  }

  initialize(width: number, height: number): void {
    this.changeMapWidth = width;
    this.changeMapHeight = height;
    this.changeMap = new Float32Array(width * height);
  }

  getIterations(): number {
    return this.params.iterations;
  }

  setIterations(n: number): void {
    this.params.iterations = n;
  }

  simulateStep(heightMap: Float32Array, width: number, height: number): void {
    if (!this.changeMap || this.changeMapWidth !== width || this.changeMapHeight !== height) {
      this.initialize(width, height);
    }

    this.simulateDroplet(heightMap, this.changeMap!, width, height);
  }

  /**
   * Apply hydraulic erosion to a heightmap
   * @param heightMap - Float32Array representing the heightmap
   * @param width - Width of the heightmap
   * @param height - Height of the heightmap
   */
  erode(heightMap: Float32Array, width: number, height: number): void {
    const startTime = performance.now();

    // Track changes for blurring
    const changeMap = new Float32Array(heightMap.length);

    for (let i = 0; i < this.params.iterations; i++) {
      this.simulateDroplet(heightMap, changeMap, width, height);

      // Progress logging
      {
        if (i % 10000 === 0 && i > 0) {
          const progress: string = ((i / this.params.iterations) * 100).toFixed(1);
          console.log(`${progress} % complete`);
        }
      }
    }

    // Blurring
    {
      if (this.params.enableBlurring) {
        this.applyChangeMapWithBlur(heightMap, changeMap, width, height);
      } else {
        // Apply changes directly
        for (let i = 0; i < heightMap.length; i++) {
          heightMap[i] += changeMap[i];
        }
      }
    }

    // Time tracking
    {
      const elapsed: string = ((performance.now() - startTime) / 1000).toFixed(2);
      console.log(`Elapsed: ${elapsed}s`);
    }
  }

  /**
   * Apply accumulated changes from change map to heightmap
   * @param heightMap - Float32Array representing the heightmap
   * @param width - Width of the heightmap
   * @param height - Height of the heightmap
   */
  applyChanges(heightMap: Float32Array, width: number, height: number): void {
    if (!this.changeMap) return;

    if (this.params.enableBlurring) {
      this.applyChangeMapWithBlur(heightMap, this.changeMap, width, height);
    } else {
      // Apply changes directly
      for (let i = 0; i < heightMap.length; i++) {
        heightMap[i] += this.changeMap[i];
      }
    }

    // Reset change map
    this.resetChangeMap();
  }

  //========================================== Erosion Simulation Methods ====//
  /**
   * Reset the change map
   */
  resetChangeMap(): void {
    if (this.changeMap) {
      this.changeMap.fill(0);
    }
  }

  /**
   * Simulate a single water droplet
   * Returns the reason the droplet died
   */
  private simulateDroplet(
    heightMap: Float32Array,
    changeMap: Float32Array,
    width: number,
    height: number,
  ): void {
    // Initialize droplet at random position
    const startPosition: THREE.Vector2 = new THREE.Vector2(
      this.params.randomFn() * width,
      this.params.randomFn() * height,
    );

    // Create droplet instance
    const droplet = new BeyerErosion.Droplet(startPosition);

    // Random initial water (70% to 130% by default)
    const initialWater =
      this.params.minWater +
      this.params.randomFn() * (this.params.maxWater - this.params.minWater);
    droplet.volume = initialWater;

    // Random droplet lifetime (50% to 150% of maxPath by default)
    const lifetimeMultiplier =
      this.params.minLifetime +
      this.params.randomFn() *
      (this.params.maxLifetime - this.params.minLifetime);
    const dropletMaxPath = Math.floor(this.params.maxPath * lifetimeMultiplier);

    for (let step = 0; step < dropletMaxPath; step++) {
      // Calculate current gradient
      const gradient = this.calculateGradient(
        heightMap,
        droplet.position,
        width,
        height,
      );

      // Calculate current height
      const currentHeight = this.interpolateHeight(
        heightMap,
        droplet.position,
        width,
        height,
      );

      // Calculate and normalize new direction
      droplet.direction = droplet.direction
        .multiplyScalar(this.params.inertia)
        .sub(gradient.multiplyScalar(1 - this.params.inertia));

      // Normalize the 2D direction vector
      droplet.direction.normalize();

      if (droplet.direction.length() < BeyerErosion.EPSILON) {
        // Direction is zero - pick random direction, ensuring direction is
        // normalized
        const angle = this.params.randomFn() * Math.PI * 2;
        droplet.direction = new THREE.Vector2(Math.cos(angle), Math.sin(angle));
        droplet.direction.normalize();
      }

      // Store current position
      const origPosition = droplet.position.clone();

      // Move droplet (fixed step size of 1 unit)
      droplet.position.add(droplet.direction);

      // Stop if new position is out of bounds or not moving
      if (
        droplet.position.x < 0 ||
        droplet.position.x >= width ||
        droplet.position.y < 0 ||
        droplet.position.y >= height ||
        droplet.direction.equals(new THREE.Vector2())
      ) {
        return;
      }

      const newHeight = this.interpolateHeight(
        heightMap,
        droplet.position,
        width,
        height,
      );
      const heightDiff = newHeight - currentHeight;

      // Calculate droplet's new capacity
      const capacity: number =
        Math.max(-heightDiff, this.params.minSlope) *
        droplet.velocity *
        droplet.volume *
        this.params.capacity;

      // Calculate sediment capacity difference
      const sedimentDiff = capacity - droplet.sediment;

      // Deposit/erode based on whether we can carry more or need to deposit
      if (sedimentDiff < 0) {
        // Carrying too much - deposit
        let amountToDeposit = -sedimentDiff * this.params.depositionSpeed;
        amountToDeposit *= droplet.volume / initialWater;
        droplet.sediment -= amountToDeposit;

        this.depositSediment(changeMap, origPosition, width, height, amountToDeposit);
      } else {
        // Can carry more - erode
        const amountToErode = Math.min(
          sedimentDiff * this.params.erosionSpeed,
          Math.max(0, -heightDiff)  // Can't erode when going uphill
        );
        droplet.sediment += amountToErode;

        this.erodeTerrain(changeMap, origPosition, width, height, amountToErode);
      }

      // Update droplet velocity and evaporate water
      droplet.velocity =
        heightDiff > 0
          ? Math.max(0.1, droplet.velocity * 0.5)
          : Math.sqrt(
            droplet.velocity ** 2 +
            Math.max(0, -heightDiff) * this.params.gravity,
          );
      if (droplet.velocity < 0.05) break; // Droplet dies (stuck/stalled)

      droplet.volume *= 1 - this.params.evaporationSpeed;
      if (droplet.volume < 0.01) break; // Droplet dies (evaporated)
    }
  }

  /**
   * Calculate gradient at position using bilinear interpolation
   */
  private calculateGradient(
    heightMap: Float32Array,
    position: THREE.Vector2,
    width: number,
    height: number,
  ): THREE.Vector2 {
    const x = Math.floor(position.x);
    const y = Math.floor(position.y);
    const [h00, h10, h01, h11] = this.sampleCorners(heightMap, x, y, width, height);

    const u = position.x - x;
    const v = position.y - y;
    // Calculate gradients
    const gradX = (h10 - h00) * (1 - v) + (h11 - h01) * v;
    const gradY = (h01 - h00) * (1 - u) + (h11 - h10) * u;

    return new THREE.Vector2(gradX, gradY);
  }

  /**
   * Sample heights at the four corners around (x, y)
   */
  private sampleCorners(heightMap: Float32Array, x: number, y: number, width: number, height: number): [number, number, number, number] {
    // Clamp to valid bounds
    const cx = Math.max(0, Math.min(x, width - 2));
    const cy = Math.max(0, Math.min(y, height - 2));

    // Sample heights at corners
    const h00 = heightMap[cy * width + cx];
    const h10 = heightMap[cy * width + cx + 1];
    const h01 = heightMap[(cy + 1) * width + cx];
    const h11 = heightMap[(cy + 1) * width + cx + 1];

    return [h00, h10, h01, h11];
  }

  /**
   * Interpolate height at position using bilinear interpolation
   */
  private interpolateHeight(
    heightMap: Float32Array,
    position: THREE.Vector2,
    width: number,
    height: number,
  ): number {
    const x = Math.floor(position.x);
    const y = Math.floor(position.y);
    const [h00, h10, h01, h11] = this.sampleCorners(heightMap, x, y, width, height);

    const u = position.x - x;
    const v = position.y - y;

    // Bilinear interpolation
    return (
      h00 * (1 - u) * (1 - v) +
      h10 * u * (1 - v) +
      h01 * (1 - u) * v +
      h11 * u * v
    );
  }

  /**
   * Erode terrain in radius around position
   */
  private erodeTerrain(
    changeMap: Float32Array,
    position: THREE.Vector2,
    width: number,
    height: number,
    amount: number,
  ): void {
    const centerX = Math.floor(position.x);
    const centerY = Math.floor(position.y);
    const radius = this.params.erosionRadius;

    let totalWeight = 0;
    const changes: Array<{ index: number; weight: number }> = [];

    // Calculate weights for all points in radius
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x >= 0 && x < width && y >= 0 && y < height) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            const weight = Math.max(0, radius - distance);
            changes.push({index: y * width + x, weight});
            totalWeight += weight;
          }
        }
      }
    }

    // Apply weighted erosion
    if (totalWeight > 0) {
      for (const change of changes) {
        const normalizedWeight = change.weight / totalWeight;
        const erosionAmount = amount * normalizedWeight;
        changeMap[change.index] -= erosionAmount;
      }
    }
  }

  /**
   * Deposit sediment using radius-based distribution.
   * This prevents spikes by spreading deposits smoothly.
   */
  private depositSediment(
    changeMap: Float32Array,
    position: THREE.Vector2,
    width: number,
    height: number,
    amount: number,
  ): void {
    const centerX = Math.floor(position.x);
    const centerY = Math.floor(position.y);
    const radius = this.params.depositionRadius;

    let totalWeight = 0;
    const changes: Array<{ index: number; weight: number }> = [];

    // Calculate weights for all points in radius
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x >= 0 && x < width && y >= 0 && y < height) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            const weight = Math.max(0, radius - distance);
            changes.push({index: y * width + x, weight});
            totalWeight += weight;
          }
        }
      }
    }

    // Apply weighted deposition
    if (totalWeight > 0) {
      for (const change of changes) {
        const normalizedWeight = change.weight / totalWeight;
        changeMap[change.index] += amount * normalizedWeight;
      }
    }
  }

  /**
   * Apply change map with blurring
   */
  private applyChangeMapWithBlur(
    heightMap: Float32Array,
    changeMap: Float32Array,
    width: number,
    height: number,
  ): void {
    if (!this.params.enableBlurring) {
      // Apply changes directly
      for (let i = 0; i < heightMap.length; i++) {
        heightMap[i] += changeMap[i];
      }
      return;
    }

    // Create blurred version of change map
    const blurredChangeMap = this.blurArray(
      changeMap,
      width,
      height,
      this.params.blurRadius,
    );

    // Blend blurred and unblurred versions
    const blendFactor = this.params.blendFactor;
    for (let i = 0; i < heightMap.length; i++) {
      const blendedChange =
        blurredChangeMap[i] * blendFactor + changeMap[i] * (1 - blendFactor);
      heightMap[i] += blendedChange;
    }
  }

  /**
   * Simple box blur for change map
   */
  private blurArray(
    input: Float32Array,
    width: number,
    height: number,
    radius: number,
  ): Float32Array {
    const output = new Float32Array(input.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              sum += input[ny * width + nx];
              count++;
            }
          }
        }

        output[y * width + x] = count > 0 ? sum / count : 0;
      }
    }

    return output;
  }
}
