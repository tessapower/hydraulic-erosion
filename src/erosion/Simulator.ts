// Simulator.ts
import {Landscape} from "../terrain/Landscape";
import type {IErosionModel} from "./IErosionModel";

export class Simulator {
  private landscape: Landscape;
  private erosionModel: IErosionModel;
  private isRunning: boolean = false;
  private iterationsPerFrame: number = 500;
  private iterationsCompleted: number = 0;

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

  setIterationsPerFrame(iterations: number): void {
    this.iterationsPerFrame = Math.max(1, iterations);
  }

  update(): void {
    if (!this.isRunning) return;

    // Check if we've reached the maximum iterations
    const maxIterations = this.erosionModel.getIterations();
    if (this.iterationsCompleted >= maxIterations) {
      this.stop();
      console.log(`Erosion complete: ${this.iterationsCompleted} droplets simulated`);

      return;
    }

    const heightMap = this.landscape.getHeightMap();
    // Since this is a square heightmap, width === height
    const size = Math.sqrt(heightMap.length);

    // Run multiple erosion iterations per frame, but don't exceed max
    const iterationsToRun = Math.min(
      this.iterationsPerFrame,
      maxIterations - this.iterationsCompleted
    );

    // Apply changes every N droplets
    const APPLY_EVERY = 10;
    for (let i = 0; i < iterationsToRun; i++) {
      this.erosionModel.simulateStep(heightMap, size, size);
      this.iterationsCompleted++;

      if (i % APPLY_EVERY === 0) {
        // Apply changes to heightmap, changeMap will be reset in this method
        this.erosionModel.applyChanges(heightMap, size, size);
      }
    }

    // Apply accumulated changes to heightmap
    this.erosionModel.applyChanges(heightMap, size, size);

    // Apply heightmap back to landscape
    const vertices = this.landscape.getMesh().geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      vertices.setZ(i, heightMap[i]);
    }

    // Update the mesh to reflect changes
    this.landscape.updateMesh();
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
}
