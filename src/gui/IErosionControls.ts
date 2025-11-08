// IErosionControls.ts: Interface for erosion models to provide GUI controls.

import GUI from "lil-gui";
import type {IGuiModule} from "./GuiManager";
import type {Simulator} from "../erosion/Simulator.ts";

/**
 * Interface for erosion models that can provide their own GUI controls.
 */
export interface IErosionControls extends IGuiModule {
  /**
   * Setup GUI controls for this erosion model
   * @param gui - The lil-gui instance or folder to add controls to
   * @param onParameterChange - Callback when parameters change
   * (for reset triggers, etc.)
   * @param simulator - The simulator instance, which may be needed for certain
   * controls or to hook into onStart/onComplete events.
   */
  setupControls(gui: GUI, simulator: Simulator, onParameterChange?: () => void): void;

  /**
   * Get the folder name for these controls
   */
  getControlsFolderName(): string;
}