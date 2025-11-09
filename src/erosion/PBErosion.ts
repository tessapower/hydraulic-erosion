// PBErosion.ts: Physics-based hydraulic erosion, uses a particle-based approach
// to simulate droplets moving over a heightfield and eroding/depositing
// sediment.
//
// Source(s):
// - https://nickmcd.me/2020/04/10/simple-particle-based-hydraulic-erosion/


import * as THREE from "three";
import {type RandomFn} from "../utils/Random";
import type {IErosionControls} from "../gui/IErosionControls";
import type {IErosionModel} from "./IErosionModel";
import GUI, {type Controller} from "lil-gui";
import type {Simulator} from "./Simulator";

/**
 * Parameters for the physics-based erosion simulation.
 */
export interface IErosionParams {
  /** Number of droplets to simulate */
  iterations: number;

  /** Simulation timestep (higher = faster movement) */
  dt: number;

  /** Droplet density (affects momentum and inertia) */
  density: number;

  /** Rate at which water evaporates per timestep */
  evaporationRate: number;

  /** Rate at which sediment is deposited/eroded (approach to capacity) */
  depositionRate: number;

  /** Minimum droplet volume before evaporation stops simulation */
  minVolume: number;

  /** Velocity loss factor per timestep (simulates drag) */
  friction: number;

  /** Physical height scale used in surface normal calculations */
  heightScale: number;

  /** Random number generator function */
  randomFn: RandomFn;

  /**
   * Seed for the random number generator.
   */
  seed: number;
}

export class PBErosion implements IErosionModel, IErosionControls {
  static readonly DEFAULTS: IErosionParams = {
    iterations: 200_000,
    dt: 1.2,
    density: 1.0,
    evaporationRate: 0.001,
    depositionRate: 0.1,
    minVolume: 0.01,
    friction: 0.05,
    heightScale: 1.0,
    randomFn: THREE.MathUtils.seededRandom,
    seed: 42,
  };

  private static Droplet = class {
    position: THREE.Vector2;
    direction: THREE.Vector2;
    volume: number;
    sediment: number;

    constructor(
      startPosition: THREE.Vector2 = new THREE.Vector2(0, 0),
      direction: THREE.Vector2 = new THREE.Vector2(0, 0),
    ) {
      this.position = startPosition.clone();
      this.direction = direction.clone();
      this.volume = 1.0;
      this.sediment = 0;
    }
  }

  public readonly params: IErosionParams;
  public readonly usesChangeMap: boolean = false;

  private readonly paramsControllers: Array<Controller> = [];

  constructor(params: Partial<IErosionParams> = {}) {
    this.params = {...PBErosion.DEFAULTS, ...params};
  }

  //========================================== IErosionControls Interface ====//
  setupControls(gui: GUI, simulator: Simulator, onParameterChange?: () => void): void {
    const seed = gui.add(this.params, 'seed')
      .onFinishChange((value: number) => {
        onParameterChange?.()
        if (!isNaN(value) && value >= 0) {
          this.params.seed = value;
        }
      })
      .name('Seed');
    seed.domElement.title = 'Seed for the random number generator';

    const timeStep = gui.add(this.params, 'dt', 0.1, 3.0, 0.1)
      .onFinishChange(() => onParameterChange?.())
      .name('Time Step');
    timeStep.domElement.title = 'Time Step';

    const density = gui.add(this.params, 'density', 0.5, 2.0, 0.1)
      .onFinishChange(() => onParameterChange?.())
      .name('Droplet Density');
    density.domElement.title = 'The density of the droplet fluid';

    const evaporation = gui.add(this.params, 'evaporationRate', 0.001, 1.0, 0.001)
      .onFinishChange(() => onParameterChange?.())
      .name('Evaporation Rate');
    evaporation.domElement.title = 'Rate at which droplets evaporate (smaller = longer simulation)';

    const deposition = gui.add(this.params, 'depositionRate', 0.001, 1.0, 0.001)
      .onFinishChange(() => onParameterChange?.())
      .name('Deposition Rate');
    deposition.domElement.title = 'Rate at which sediment is deposited/eroded';

    const minVolume = gui.add(this.params, 'minVolume', 0.01, 1.0, 0.01)
      .onFinishChange(() => onParameterChange?.())
      .name('Min Droplet Volume');
    minVolume.domElement.title = 'Minimum droplet volume before evaporation stops simulation';

    const friction = gui.add(this.params, 'friction', 0.01, 1.0, 0.01)
      .onFinishChange(() => onParameterChange?.())
      .name('Friction');
    friction.domElement.title = 'Velocity loss factor per timestep';

    this.paramsControllers.push(seed, timeStep, density, evaporation, deposition, minVolume, friction);

    simulator.registerOnStartCallback(() => {
      // Disable adjusting the parameters when the simulation is running
      this.paramsControllers.forEach(controller => controller.disable());
      // Set the random seed for the simulation to ensure reproducibility
      this.params.randomFn(this.params.seed);
    });

    simulator.registerOnCompleteCallback(() => {
      // Enable adjusting the parameters when the simulation is complete
      this.paramsControllers.forEach(controller => controller.enable());
    });

    simulator.registerOnResetCallback(() => {
      // Re-enable the parameters when the simulation is reset
      this.paramsControllers.forEach(controller => controller.enable(!simulator.getIsRunning()));
    });
  }

  getControlsFolderName(): string {
    return "Parameter Settings";
  }

  registerParent(_parentGui: GUI): void {
    // No-op, controls are added directly to the parent GUI in setupControls
  }

  //============================================= IErosionModel Interface ====//
  getName(): string {
    return "Physics-Based";
  }

  initialize(_width: number, _height: number): void {
    // No-op
  }

  setSeed(seed: number) {
    this.params.seed = seed;
  }

  getIterations(): number {
    return this.params.iterations;
  }

  setIterations(n: number): void {
    this.params.iterations = n;
  }

  simulateStep(heightMap: Float32Array, width: number, height: number): void {
    this.simulateDroplet(heightMap, width, height);
  }

  // No change map; writes go directly to 'heightMap'
  applyChanges(_heightMap: Float32Array, _width: number, _height: number): void {
    // no-op by design
  }

  // Bulk erosion function
  erode(heightMap: Float32Array, width: number, height: number): void {
    for (let i = 0; i < this.params.iterations; i++) {
      this.simulateDroplet(heightMap, width, height);
    }
  }

  //========================================== Erosion Simulation Methods ====//
  private simulateDroplet(
    heightMap: Float32Array,
    width: number,
    height: number
  ): void {
    const rng = this.params.randomFn;
    // Initialize droplet at random position
    const startPosition: THREE.Vector2 = new THREE.Vector2(
      rng() * width,
      rng() * height,
    );

    // Create droplet instance
    const droplet = new PBErosion.Droplet(startPosition);

    const timeStep = this.params.dt;

    // Run until droplet evaporates below minimum
    while (droplet.volume > this.params.minVolume) {
      const x: number = Math.floor(droplet.position.x);
      const y: number = Math.floor(droplet.position.y);
      if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) break;

      // Compute surface normal at integer cell (weighted neighbors)
      const normal = this.surfaceNormal(heightMap, width, height, x, y, this.params.heightScale);

      // Accelerate by surface slope (project X/Z)
      // Scaled by droplet mass (volume * density)
      // inverseMass = 1 / (volume * density)
      const inverseMass: number = 1.0 / (droplet.volume * this.params.density);
      // Update velocity
      droplet.direction.x += timeStep * normal.x * inverseMass;
      droplet.direction.y += timeStep * normal.z * inverseMass;

      // Integrate position
      droplet.position.x += timeStep * droplet.direction.x;
      droplet.position.y += timeStep * droplet.direction.y;

      // Apply friction
      droplet.direction.multiplyScalar(1.0 - timeStep * this.params.friction);

      // Bounds check after movement
      if (droplet.position.x < 0 || droplet.position.x >= width || droplet.position.y < 0 || droplet.position.y >= height) break;

      const nextCell = new THREE.Vector2(Math.floor(droplet.position.x), Math.floor(droplet.position.y));

      const startCellHeight: number = heightMap[y * width + x];
      const nextCellHeight: number = heightMap[nextCell.y * width + nextCell.x];

      // max. sediment capacity = volume * |speed| * (h(ipos) - h(floor(pos)))
      let capacity: number =
        droplet.volume *
        // Droplet speed magnitude
        Math.hypot(droplet.direction.x, droplet.direction.y) *
        // Height difference
        (startCellHeight - nextCellHeight);
      // Ensure no negative capacities
      capacity = Math.max(0.0, capacity);

      const capacityDelta = capacity - droplet.sediment;

      // Update sediment and terrain at original integer cell
      droplet.sediment += timeStep * this.params.depositionRate * capacityDelta;
      heightMap[y * width + x] -= timeStep * droplet.volume * this.params.depositionRate * capacityDelta;

      // Evaporate (proportional to volume)
      droplet.volume *= (1.0 - timeStep * this.params.evaporationRate);
    }
  }

  /**
   * Computes the surface normal at integer cell (i, j) using a weighted
   * combination of the normals of the surrounding facets (cardinal + diagonal).
   * The resulting normal is not normalized, as its magnitude encodes slope strength.
   */
  private surfaceNormal(
    heightMap: Float32Array,
    width: number,
    height: number,
    i: number,
    j: number,
    verticalScale: number,
  ): THREE.Vector3 {
    // Require interior cells to avoid bounds branching each sample
    if (i <= 0 || i >= width - 1 || j <= 0 || j >= height - 1) {
      // Fallback: central-difference normal
      return this.centralDiffNormal(heightMap, width, height, i, j, verticalScale);
    }

    // Helper to compute 1D index
    const idx: (x: number, y: number) => number
      = (x: number, y: number) => y * width + x;

    const h00 = heightMap[idx(i, j)];
    //  ┌─────┬─────┬─────┐
    //  │ hnn │ hny │ hpn │
    //  ├─────┼─────┼─────┤
    //  │ hnx │ h00 │ hpx │
    //  ├─────┼─────┼─────┤
    //  │ hnp │ hpy │ hpp │
    //  └─────┴─────┴─────┘

    // Cardinals
    const hpx = heightMap[idx(i + 1, j)];
    const hnx = heightMap[idx(i - 1, j)];
    const hpy = heightMap[idx(i, j + 1)];
    const hny = heightMap[idx(i, j - 1)];
    // Diagonals
    const hpp = heightMap[idx(i + 1, j + 1)];
    const hpn = heightMap[idx(i + 1, j - 1)];
    const hnp = heightMap[idx(i - 1, j + 1)];
    const hnn = heightMap[idx(i - 1, j - 1)];

    const cardinalWeight = 0.15;
    const diagonalWeight = 0.10;
    const root2 = Math.SQRT2;

    const n = new THREE.Vector3(0, 0, 0);

    // +X facet
    n.add(
      new THREE.Vector3(verticalScale * (h00 - hpx), 1.0, 0.0)
        .normalize()
        .multiplyScalar(cardinalWeight),
    );

    // -X facet
    n.add(
      new THREE.Vector3(verticalScale * (hnx - h00), 1.0, 0.0)
        .normalize()
        .multiplyScalar(cardinalWeight),
    );

    // +Y facet
    n.add(
      new THREE.Vector3(0.0, 1.0, verticalScale * (h00 - hpy))
        .normalize()
        .multiplyScalar(cardinalWeight),
    );

    // -Y facet
    n.add(
      new THREE.Vector3(0.0, 1.0, verticalScale * (hny - h00))
        .normalize()
        .multiplyScalar(cardinalWeight),
    );

    // Diagonals (note horizontal step length is √2)
    n.add(
      new THREE.Vector3(
        verticalScale * (h00 - hpp) / root2,
        root2,
        verticalScale * (h00 - hpp) / root2,
      )
        .normalize()
        .multiplyScalar(diagonalWeight),
    );

    n.add(
      new THREE.Vector3(
        verticalScale * (h00 - hpn) / root2,
        root2,
        verticalScale * (h00 - hpn) / root2,
      )
        .normalize()
        .multiplyScalar(diagonalWeight),
    );

    n.add(
      new THREE.Vector3(
        verticalScale * (h00 - hnp) / root2,
        root2,
        verticalScale * (h00 - hnp) / root2,
      )
        .normalize()
        .multiplyScalar(diagonalWeight),
    );

    n.add(
      new THREE.Vector3(
        verticalScale * (h00 - hnn) / root2,
        root2,
        verticalScale * (h00 - hnn) / root2,
      )
        .normalize()
        .multiplyScalar(diagonalWeight),
    );

    // Return the weighted sum without normalizing.
    // Magnitude encodes slope strength and is used to accelerate the droplet.
    return n;
  }

  private centralDiffNormal(
    heightMap: Float32Array,
    width: number,
    height: number,
    i: number,
    j: number,
    verticalScale: number,
  ): THREE.Vector3 {
    // Clamp edges for safety
    const ix0 = Math.max(1, Math.min(width - 2, i));
    const jy0 = Math.max(1, Math.min(height - 2, j));
    const idx = (x: number, y: number) => y * width + x;

    const dzdx =
      ((heightMap[idx(ix0 + 1, jy0)] - heightMap[idx(ix0 - 1, jy0)]) * 0.5) *
      verticalScale;
    const dzdy =
      ((heightMap[idx(ix0, jy0 + 1)] - heightMap[idx(ix0, jy0 - 1)]) * 0.5) *
      verticalScale;

    // Normal to the heightfield z = h(x,y) is (-dz/dx, 1, -dz/dy)
    return new THREE.Vector3(-dzdx, 1.0, -dzdy).normalize();
  }
}
