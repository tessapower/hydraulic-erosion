// GuiManager.ts: Central GUI (Plugin pattern) that modules implementing
// the IGuiModule interface can register with.

import GUI from "lil-gui";
import {MobileDetector} from "../utils/MobileDetector";

/**
 * Interface that GUI modules must implement to register with GUIManager
 */
export interface IGuiModule {
  /**
   * Allows registering this GUI module with a parent.
   */
  registerParent(parentGui: GUI): void;

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
    // Detect mobile before creating GUI
    const isMobile = MobileDetector.isMobile();

    // Create GUI with title and initial closed state for mobile
    this.gui = new GUI({
      title: 'Controls',
      closeFolders: isMobile
    });

    // Auto-collapse GUI on mobile devices to save screen space
    if (isMobile) {
      this.gui.close();

      // Add mobile-friendly class for custom styling
      this.gui.domElement.classList.add('mobile-gui');
    }
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
    module.registerParent(this.gui);
  }

  /**
   * Cleans up all GUI resources
   */
  dispose(): void {
    this.modules.clear();
    this.gui.destroy();
  }
}
