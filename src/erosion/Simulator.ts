// Simulator.ts: orchestrates the erosion simulation, managing the current state
// of the simulation and the landscape. Also handles timing and progress
// tracking, as well as callbacks for when the simulation starts, pauses,
// completes, or resets.
import {Landscape} from "../terrain/Landscape";
import type {IErosionModel} from "./IErosionModel";

export type State = "READY" | "RUNNING" | "PAUSED" | "COMPLETE";

export class Simulator {
  private static readonly DEFAULT_TIME_BUDGET: number = 16;
  private timeBudget: number = Simulator.DEFAULT_TIME_BUDGET;
  private landscape: Landscape;
  private erosionModel: IErosionModel;
  private iterationsCompleted: number = 0;
  private updateStart: number = 0;
  private onStartCallbacks: (() => void)[] = [];
  private onPauseCallbacks: (() => void)[] = [];
  private onCompleteCallbacks: (() => void)[] = [];
  private onResetCallbacks: (() => void)[] = [];
  private state: State = "READY";

  constructor(landscape: Landscape, erosion: IErosionModel, timeBudget?: number) {
    this.landscape = landscape;
    this.erosionModel = erosion;
    if (timeBudget !== undefined) {
      this.timeBudget = timeBudget;
    }
  }

  setTimeBudget(budget: number): void {
    this.timeBudget = budget;
  }

  getTimeBudget(): number {
    return this.timeBudget;
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
    this.state = "READY";
    this.iterationsCompleted = 0;
    this.landscape.regenerate();
    this.onReset();
  }

  update(): void {
    if (this.state !== "RUNNING") return;

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
    const timeAllowance: number = Math.max(1, this.timeBudget - (updateEnd - this.updateStart));
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
