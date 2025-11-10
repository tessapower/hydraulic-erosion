// IErosionModel.ts: represents an erosion simulation model interface which
// can be used by the Simulator to apply erosion to a Landscape.

/**
 * Serializable configuration for erosion models, used for worker communication.
 */
export interface SerializableModelConfig {
  /** Type identifier for the model ('beyer' | 'pb') */
  modelType: string;
  /** Model parameters (plain object, no functions) */
  params: Record<string, any>;
}

/**
 * Core interface for erosion models.
 */
export interface IErosionModel {
  readonly usesChangeMap: boolean;

  /**
   * Get the display name for this erosion model
   */
  getName(): string;

  /**
   * Initialize any internal state needed for simulation
   */
  initialize(width: number, height: number): void;

  getIterations(): number;

  setIterations(n: number): void;

  setSeed(seed: number): void;

  simulateStep(heightMap: Float32Array, width: number, height: number): void;

  /**
   * Performs the full erosion process on the height map (batch mode).
   * @param onProgress Optional callback for progress updates (iteration, total)
   */
  erode(heightMap: Float32Array, width: number, height: number, onProgress?: (iteration: number, total: number) => void): void;

  /**
   * Applies accumulated changes to the height map. Requires tracking changes
   * internally on the model side. Some models may apply changes directly
   * during simulation.
   */
  applyChanges(heightMap: Float32Array, width: number, height: number): void;

  /**
   * Serialize model configuration for transfer to worker.
   * Returns a plain object with no functions that can be sent via postMessage.
   */
  toSerializable(): SerializableModelConfig;
}

