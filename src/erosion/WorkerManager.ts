import type {IErosionModel} from './IErosionModel';

export class ErosionWorkerManager {
  private worker: Worker | null = null;
  private onProgress?: (iteration: number, total: number) => void;
  private onComplete?: (heightMap: Float32Array) => void;

  constructor() {
  }

  /**
   * Start batch erosion in a worker thread
   */
  startBatchErosion(
    heightMap: Float32Array,
    width: number,
    height: number,
    model: IErosionModel,
    onProgress?: (iteration: number, total: number) => void,
    onComplete?: (heightMap: Float32Array) => void
  ): void {
    this.onProgress = onProgress;
    this.onComplete = onComplete;

    // Create worker
    this.worker = new Worker(
      new URL('../workers/erosion.worker.ts', import.meta.url),
      {type: 'module'}
    );

    // Listen for messages from worker
    this.worker.onmessage = (e) => {
      if (e.data.type === 'progress') {
        this.onProgress?.(e.data.iteration, e.data.total);
      } else if (e.data.type === 'complete') {
        this.onComplete?.(e.data.heightMap);
        this.cleanup();
      }
    };

    this.worker.onerror = (error) => {
      console.error('Worker error:', error);
      this.cleanup();
    };

    // Get serializable model configuration
    const modelConfig = model.toSerializable();

    // Send heightmap to worker (transfer ownership for performance)
    this.worker.postMessage(
      {
        type: 'start',
        heightMap: heightMap,
        width: width,
        height: height,
        modelConfig: modelConfig,
      },
      [heightMap.buffer] // Transfer the ArrayBuffer
    );
  }

  /**
   * Cancel the current batch erosion
   */
  cancel(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
