// Simulator.ts
import {Landscape} from "../terrain/Landscape";
import type {IErosionModel} from "./IErosionModel";
import {ErosionWorkerManager} from "./WorkerManager";

export type State = "READY" | "RUNNING" | "PAUSED" | "COMPLETE";

export class Simulator {
  private static readonly TIME_BUDGET: number = 16;
  private runInBatchMode: boolean = false;
  private workerManager: ErosionWorkerManager;
  private landscape: Landscape;
  private erosionModel: IErosionModel;
  private iterationsCompleted: number = 0;
  private updateStart: number = 0;
  private onStartCallbacks: (() => void)[] = [];
  private onPauseCallbacks: (() => void)[] = [];
  private onCompleteCallbacks: (() => void)[] = [];
  private onResetCallbacks: (() => void)[] = [];
  private state: State = "READY";

  constructor(landscape: Landscape, erosion: IErosionModel) {
    this.landscape = landscape;
    this.erosionModel = erosion;
    this.workerManager = new ErosionWorkerManager();
  }

  /**
   * Start erosion in batch mode (runs to completion in worker)
   */
  startBatch(): void {
    if (!this.landscape.hasOriginal()) this.landscape.saveOriginal();

    // Show loading overlay
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex';

    // Reset progress display
    const progressElement = document.getElementById('loading-progress');
    if (progressElement) progressElement.textContent = '0%';

    this.state = "RUNNING";
    this.runInBatchMode = true;
    this.onStart();

    const heightMap = this.landscape.getHeightMap();
    const size = Math.sqrt(heightMap.length);

    // Copy heightMap before transferring to worker (transfer will detach the original buffer)
    const heightMapCopy = new Float32Array(heightMap);

    this.workerManager.startBatchErosion(
      heightMapCopy,
      size,
      size,
      this.erosionModel,
      (iteration, total) => {
        // Update progress on overlay
        this.iterationsCompleted = iteration;
        const progressElement = document.getElementById('loading-progress');
        if (progressElement) {
          const percentage = ((iteration / total) * 100).toFixed(0);
          progressElement.textContent = `${percentage}%`;
        }
      },
      (resultHeightMap) => {
        // Worker completed - update landscape with result
        this.landscape.getHeightMap().set(resultHeightMap);
        this.landscape.updateMesh();

        this.state = "COMPLETE";
        this.runInBatchMode = false;
        this.iterationsCompleted = this.erosionModel.getIterations();
        this.onComplete();

        // Hide loading overlay
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
      }
    );
  }

  start(): void {
    // Save the original heightmap before starting erosion
    if (!this.landscape.hasOriginal()) this.landscape.saveOriginal();

    this.state = "RUNNING";
    this.onStart();
  }

  pause(): void {
    this.state = "PAUSED";
    this.onPause();
  }

  reset(): void {
    // Cancel any running worker
    if (this.runInBatchMode) {
      this.workerManager.cancel();
      this.runInBatchMode = false;
    }

    // Hide loading overlay if it's visible
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';

    this.state = "READY";
    this.iterationsCompleted = 0;
    this.landscape.regenerate();
    this.onReset();
  }

  update(): void {
    if (this.state !== "RUNNING" || this.runInBatchMode) return;

    const heightMap: Float32Array = this.landscape.getHeightMap();
    // Since this is a square heightmap, width === height
    // TODO: Check this is correct and handle non-square heightmaps if needed
    const size: number = Math.sqrt(heightMap.length);

    // Apply changes to heightmap, if the model uses one
    if (this.erosionModel.usesChangeMap) {
      this.erosionModel.applyChanges(heightMap, size, size);
    }

    // Update the mesh to reflect changes
    this.landscape.updateMesh();
    const updateEnd: number = performance.now();

    // Run erosion until we hit the time budget or complete the required
    // iterations. Ensure we always run at least one iteration to avoid
    // stalling on the first update.
    const maxIterations: number = this.erosionModel.getIterations();
    const timeAllowance: number = Math.max(1, Simulator.TIME_BUDGET - (updateEnd - this.updateStart));
    while (this.iterationsCompleted < maxIterations && (performance.now() - updateEnd) < timeAllowance) {
      this.erosionModel.simulateStep(heightMap, size, size);
      this.iterationsCompleted++;
    }

    if (this.getProgress() === 100) {
      this.state = "COMPLETE";
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

  getState(): State {
    return this.state;
  }

  registerOnStartCallback(callback: () => void): void {
    this.onStartCallbacks.push(callback);
  }

  registerOnCompleteCallback(callback: () => void): void {
    this.onCompleteCallbacks.push(callback);
  }

  registerOnResetCallback(callback: () => void): void {
    this.onResetCallbacks.push(callback);
  }

  registerOnPauseCallback(callback: () => void): void {
    this.onPauseCallbacks.push(callback);
  }

  onStart(): void {
    for (const callback of this.onStartCallbacks) callback();
  }

  onPause(): void {
    for (const callback of this.onPauseCallbacks) callback();
  }

  onComplete(): void {
    for (const callback of this.onCompleteCallbacks) callback();
  }

  onReset(): void {
    for (const callback of this.onResetCallbacks) callback();
  }

}
