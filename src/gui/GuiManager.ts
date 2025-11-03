// GuiManager.ts: Central GUI (Plugin pattern) that modules implementing
// the IGuiModule interface can register with.

import GUI from "lil-gui";

/**
 * Interface that GUI modules must implement to register with GUIManager
 */
export interface IGuiModule {
  /**
   * Sets up controls using the provided GUI instance
   * @param gui The lil-gui instance to add controls to
   */
  setupControls(gui: GUI): void;

  /**
   * Get the name for this module's folder
   */
  getModuleName?(): string;
}

/**
 * Central manager for lil-gui controls, allowing modules to register their own
 * folders and controls.
 */
export class GuiManager {
  private readonly gui: GUI;
  private modules: Map<string, IGuiModule> = new Map();

  constructor() {
    this.gui = new GUI();
  }

  /**
   * Registers a GUI module
   * @param name Unique identifier for this module
   * @param module The module implementing IGUIModule
   */
  register(name: string, module: IGuiModule): void {
    if (this.modules.has(name)) {
      console.warn(`GUI module "${name}" already registered. Skipping.`);
      return;
    }

    this.modules.set(name, module);

    // Setup controls for this module
    module.setupControls(this.gui);
  }

  /**
   * Cleans up all GUI resources
   */
  dispose(): void {
    this.modules.clear();
    this.gui.destroy();
  }
}
