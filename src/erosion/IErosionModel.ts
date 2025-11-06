// IErosionModel.ts: represents an erosion simulation model interface which
// can be used by the Simulator to apply erosion to a Landscape.

/**
 * Core interface for erosion models.
 */
export interface IErosionModel {
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

  simulateStep(heightMap: Float32Array, width: number, height: number): void;

  /**
   * Performs the full erosion process on the height map (batch mode).
   */
  erode(heightMap: Float32Array, width: number, height: number): void;

  /**
   * Applies accumulated changes to the height map. Requires tracking changes
   * internally on the model side. Some models may apply changes directly
   * during simulation.
   */
  applyChanges(heightMap: Float32Array, width: number, height: number): void;
}

