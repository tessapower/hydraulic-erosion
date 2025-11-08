// Simulator.ts
import {Landscape} from "../terrain/Landscape";
import type {IErosionModel} from "./IErosionModel";

export class Simulator {
  private static readonly TIME_BUDGET: number = 16;
  private landscape: Landscape;
  private erosionModel: IErosionModel;
  private isRunning: boolean = false;
  private iterationsCompleted: number = 0;
  private updateStart: number = 0;
  private onCompleteCallbacks: (() => void)[] = [];

  constructor(landscape: Landscape, erosion: IErosionModel) {
    this.landscape = landscape;
    this.erosionModel = erosion;
  }

  start(): void {
    this.isRunning = true;
  }

  stop(): void {
    this.isRunning = false;
  }

  reset(): void {
    this.iterationsCompleted = 0;
    this.landscape.regenerate();
  }

  update(): void {
    if (!this.isRunning) return;

    const heightMap = this.landscape.getHeightMap();
    // Since this is a square heightmap, width === height
    const size = Math.sqrt(heightMap.length);

    // Apply changes to heightmap, if the model uses one
    if (this.erosionModel.usesChangeMap) {
      this.erosionModel.applyChanges(heightMap, size, size);
    }

    // Update the mesh to reflect changes
    this.landscape.updateMesh();
    const updateEnd = performance.now();

    // Check if we've reached the maximum iterations
    const maxIterations = this.erosionModel.getIterations();

    // Run erosion until we hit the time budget or complete the required
    // iterations. Ensure we always run at least one iteration to avoid
    // stalling on the first update.
    const timeAllowance: number = Math.max(1, Simulator.TIME_BUDGET - (updateEnd - this.updateStart));
    while (this.iterationsCompleted < maxIterations && (performance.now() - updateEnd) < timeAllowance) {
      this.erosionModel.simulateStep(heightMap, size, size);
      this.iterationsCompleted++;
    }

    if (this.isComplete()) {
      this.stop();
      this.onComplete();
    }
    this.updateStart = performance.now();
  }

  getErosionModel(): IErosionModel {
    return this.erosionModel;
  }

  setErosionModel(model: IErosionModel): void {
    this.erosionModel = model;
  }

  getIterationsCompleted(): number {
    return this.iterationsCompleted;
  }

  getTotalIterations(): number {
    return this.erosionModel.getIterations();
  }

  /**
   * Returns the progress of the simulation as a percentage (0-100).
   */
  getProgress(): number {
    const max = this.erosionModel.getIterations();
    return max > 0 ? (this.iterationsCompleted / max) * 100 : 0;
  }

  isComplete(): boolean {
    return this.iterationsCompleted >= this.erosionModel.getIterations();
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  registerOnCompleteCallback(callback: () => void): void {
    if (!this.onCompleteCallbacks) {
      this.onCompleteCallbacks = [];
    }
    this.onCompleteCallbacks.push(callback);
  }

  onComplete(): void {
    for (const callback of this.onCompleteCallbacks) {
      callback();
    }
  }
}
