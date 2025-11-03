// BeyerErosion.ts: Complete implementation of Beyer's hydraulic erosion algorithm

import Droplet from "./Droplet";
import * as THREE from "three";
import { type RandomFn } from "../utils/Random.ts";

export interface ErosionParams {
  // Core simulation parameters
  iterations: number; // Number of droplets to simulate
  inertia: number; // Direction blending (0-1)
  capacity: number; // Sediment carry capacity multiplier
  minSlope: number; // Minimum slope for capacity calculation
  erosionSpeed: number; // How fast erosion happens (0-1)
  depositionSpeed: number; // How fast deposition happens (0-1)
  evaporationSpeed: number; // How fast water evaporates (0-1)
  gravity: number; // Gravity acceleration factor
  maxPath: number; // Maximum steps per droplet
  erosionRadius: number; // Radius for erosion brush
  depositionRadius: number; // Radius for deposition brush (can be larger for smoother deposits)

  // Droplet variation parameters
  minLifetime: number; // Minimum lifetime multiplier (0.5 = 50% of maxPath)
  maxLifetime: number; // Maximum lifetime multiplier (1.5 = 150% of maxPath)
  minWater: number; // Minimum initial water (0.5 = half water)
  maxWater: number; // Maximum initial water (1.5 = 1.5x water)

  // Blurring parameters
  enableBlurring: boolean; // Enable change map blurring
  blurRadius: number; // Blur kernel radius
  blendFactor: number; // Blend between blurred/unblurred (0-1)
  randomFn: RandomFn; // Random function for reproducibility
}

export class BeyerErosion {
  public readonly params: ErosionParams;

  private static readonly EPSILON = 1e-3;

  // Change map for incremental erosion
  private changeMap: Float32Array | null = null;
  private changeMapWidth: number = 0;
  private changeMapHeight: number = 0;

  // Default parameters from Beyer's paper
  static readonly DEFAULT_PARAMS: ErosionParams = {
    iterations: 300000,
    inertia: 0.3,
    capacity: 8,
    minSlope: 0.005,
    erosionSpeed: 0.7,
    depositionSpeed: 0.2,
    evaporationSpeed: 0.02,
    gravity: 9.81,
    maxPath: 64,
    erosionRadius: 5,
    depositionRadius: 6, // Larger radius for smoother deposits
    minLifetime: 0.5, // 50% to 150% of maxPath
    maxLifetime: 1.5,
    minWater: 0.7, // 70% to 130% initial water
    maxWater: 1.3,
    enableBlurring: true,
    blurRadius: 1,
    blendFactor: 0.5,
    randomFn: Math.random,
  };

  constructor(params: Partial<ErosionParams> = {}) {
    this.params = { ...BeyerErosion.DEFAULT_PARAMS, ...params };
  }

  /**
   * Initialize change map for incremental erosion
   */
  initializeChangeMap(width: number, height: number): void {
    this.changeMapWidth = width;
    this.changeMapHeight = height;
    this.changeMap = new Float32Array(width * height);
  }

  /**
   * Simulate a single droplet for incremental erosion
   * @param heights - Float32Array representing the heightmap
   * @param width - Width of the heightmap
   * @param height - Height of the heightmap
   */
  simulateSingleDroplet(heights: Float32Array, width: number, height: number): void {
    if (!this.changeMap || this.changeMapWidth !== width || this.changeMapHeight !== height) {
      this.initializeChangeMap(width, height);
    }
    this.simulateDroplet(heights, this.changeMap!, width, height);
  }

  /**
   * Apply accumulated changes from change map to heightmap
   * @param heights - Float32Array representing the heightmap
   * @param width - Width of the heightmap
   * @param height - Height of the heightmap
   */
  applyChanges(heights: Float32Array, width: number, height: number): void {
    if (!this.changeMap) return;

    if (this.params.enableBlurring) {
      this.applyChangeMapWithBlur(heights, this.changeMap, width, height);
    } else {
      // Apply changes directly
      for (let i = 0; i < heights.length; i++) {
        heights[i] += this.changeMap[i];
      }
    }

    // Reset change map
    this.changeMap.fill(0);
  }

  /**
   * Reset the change map
   */
  resetChangeMap(): void {
    if (this.changeMap) {
      this.changeMap.fill(0);
    }
  }

  /**
   * Apply hydraulic erosion to a heightmap
   * @param heights - Float32Array representing the heightmap
   * @param width - Width of the heightmap
   * @param height - Height of the heightmap
   */
  erode(heights: Float32Array, width: number, height: number): void {
    const startTime = performance.now();

    // Track changes for blurring
    const changeMap = new Float32Array(heights.length);

    for (let i = 0; i < this.params.iterations; i++) {
      this.simulateDroplet(heights, changeMap, width, height);

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
        this.applyChangeMapWithBlur(heights, changeMap, width, height);
      } else {
        // Apply changes directly
        for (let i = 0; i < heights.length; i++) {
          heights[i] += changeMap[i];
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
   * Simulate a single water droplet
   * Returns the reason the droplet died
   */
  private simulateDroplet(
    heights: Float32Array,
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
    const droplet: Droplet = new Droplet(startPosition);

    // Random initial water (70% to 130% by default)
    const initialWater =
      this.params.minWater +
      this.params.randomFn() * (this.params.maxWater - this.params.minWater);
    droplet.water = initialWater;

    // Random droplet lifetime (50% to 150% of maxPath by default)
    const lifetimeMultiplier =
      this.params.minLifetime +
      this.params.randomFn() *
      (this.params.maxLifetime - this.params.minLifetime);
    const dropletMaxPath = Math.floor(this.params.maxPath * lifetimeMultiplier);

    for (let step = 0; step < dropletMaxPath; step++) {
      // Calculate current gradient
      const gradient = this.calculateGradient(
        heights,
        droplet.position,
        width,
        height,
      );

      // Calculate current height
      const currentHeight = this.interpolateHeight(
        heights,
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
        heights,
        droplet.position,
        width,
        height,
      );
      const heightDiff = newHeight - currentHeight;

      // Calculate droplet's new capacity
      const capacity: number =
        Math.max(-heightDiff, this.params.minSlope) *
        droplet.velocity *
        droplet.water *
        this.params.capacity;

      // If droplet is going uphill or sediment exceeds capacity,
      // deposit portion of sediment at droplet's original position
      if (heightDiff > 0 || droplet.sediment > capacity) {
        // Calculate amount of sediment to deposit
        let amountToDeposit =
          heightDiff > 0
            ? Math.min(droplet.sediment, heightDiff)
            : (droplet.sediment - capacity) * this.params.depositionSpeed;
        // Scale to droplet size
        amountToDeposit *= droplet.water / initialWater;
        droplet.sediment -= amountToDeposit;

        this.depositSediment(
          changeMap,
          origPosition,
          width,
          height,
          amountToDeposit,
        );
      } else {
        // Going downhill, erode terrain
        const amountToErode = Math.min(
          (capacity - droplet.sediment) * this.params.erosionSpeed,
          -heightDiff,
        );
        droplet.sediment += amountToErode;

        this.erodeTerrain(
          changeMap,
          origPosition,
          width,
          height,
          amountToErode,
        );
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

      droplet.water *= 1 - this.params.evaporationSpeed;
      if (droplet.water < 0.01) break; // Droplet dies (evaporated)
    }
  }

  /**
   * Calculate gradient at position using bilinear interpolation
   */
  private calculateGradient(
    heights: Float32Array,
    position: THREE.Vector2,
    width: number,
    height: number,
  ): THREE.Vector2 {
    const x = Math.floor(position.x);
    const y = Math.floor(position.y);
    const u = position.x - x;
    const v = position.y - y;

    // Clamp to valid bounds
    const cx = Math.max(0, Math.min(x, width - 2));
    const cy = Math.max(0, Math.min(y, height - 2));

    // Sample heights at corners
    const h00 = heights[cy * width + cx];
    const h10 = heights[cy * width + cx + 1];
    const h01 = heights[(cy + 1) * width + cx];
    const h11 = heights[(cy + 1) * width + cx + 1];

    // Calculate gradients
    const gradX = (h10 - h00) * (1 - v) + (h11 - h01) * v;
    const gradY = (h01 - h00) * (1 - u) + (h11 - h10) * u;

    return new THREE.Vector2(gradX, gradY);
  }

  /**
   * Interpolate height at position using bilinear interpolation
   */
  private interpolateHeight(
    heights: Float32Array,
    position: THREE.Vector2,
    width: number,
    height: number,
  ): number {
    const x = Math.floor(position.x);
    const y = Math.floor(position.y);
    const u = position.x - x;
    const v = position.y - y;

    // Clamp to valid bounds
    const cx = Math.max(0, Math.min(x, width - 2));
    const cy = Math.max(0, Math.min(y, height - 2));

    // Sample heights at corners
    const h00 = heights[cy * width + cx];
    const h10 = heights[cy * width + cx + 1];
    const h01 = heights[(cy + 1) * width + cx];
    const h11 = heights[(cy + 1) * width + cx + 1];

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
            changes.push({ index: y * width + x, weight });
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
            changes.push({ index: y * width + x, weight });
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
    heights: Float32Array,
    changeMap: Float32Array,
    width: number,
    height: number,
  ): void {
    if (!this.params.enableBlurring) {
      // Apply changes directly
      for (let i = 0; i < heights.length; i++) {
        heights[i] += changeMap[i];
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
    for (let i = 0; i < heights.length; i++) {
      const blendedChange =
        blurredChangeMap[i] * blendFactor + changeMap[i] * (1 - blendFactor);
      heights[i] += blendedChange;
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
