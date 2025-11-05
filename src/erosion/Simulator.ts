// Simulator.ts
import { Landscape } from "../terrain/Landscape";
import { PBErosion } from "./PBErosion";

export class Simulator {
  private landscape: Landscape;
  private erosion: PBErosion;
  private isRunning: boolean = false;
  private iterationsPerFrame: number = 500;
  private totalIterations: number = 0;

  constructor(landscape: Landscape, erosion: PBErosion) {
    this.landscape = landscape;
    this.erosion = erosion;
  }

  start(): void {
    this.isRunning = true;
  }

  stop(): void {
    this.isRunning = false;
  }

  reset(): void {
    this.totalIterations = 0;
    this.landscape.regenerate();
  }

  setIterationsPerFrame(iterations: number): void {
    this.iterationsPerFrame = Math.max(1, iterations);
  }

  update(): void {
    if (!this.isRunning) return;

    // Check if we've reached the maximum iterations
    const maxIterations = this.erosion.params.iterations;
    if (this.totalIterations >= maxIterations) {
      this.stop();
      console.log(`Erosion complete: ${this.totalIterations} droplets simulated`);

      return;
    }

    const heightMap = this.landscape.getHeightMap();
    // Since this is a square heightmap, width === height
    const size = Math.sqrt(heightMap.length);

    // Run multiple erosion iterations per frame, but don't exceed max
    const iterationsToRun = Math.min(
      this.iterationsPerFrame,
      maxIterations - this.totalIterations
    );

    // Apply changes every N droplets
    const APPLY_EVERY = 10;
    for (let i = 0; i < iterationsToRun; i++) {
      this.erosion.simulateSingleDroplet(heightMap, size, size);
      this.totalIterations++;

      // Apply changes more frequently
      if (i % APPLY_EVERY === 0) {
        // Apply changes to heightmap, changeMap will be reset in this method
        this.erosion.applyChanges(heightMap, size, size);
      }
    }

    // Apply accumulated changes to heightmap
    this.erosion.applyChanges(heightMap, size, size);

    // Apply heightmap back to landscape
    const vertices = this.landscape.getMesh().geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      vertices.setZ(i, heightMap[i]);
    }

    // Update the mesh to reflect changes
    this.landscape.updateMesh();
  }

  getTotalIterations(): number {
    return this.totalIterations;
  }

  getMaxIterations(): number {
    return this.erosion.params.iterations;
  }

  getProgress(): number {
    const max = this.erosion.params.iterations;
    return max > 0 ? (this.totalIterations / max) * 100 : 0;
  }

  isComplete(): boolean {
    return this.totalIterations >= this.erosion.params.iterations;
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }
}
