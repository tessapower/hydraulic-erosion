// LandscapeControls.ts: GUI controls for landscape generator parameters

import GUI from "lil-gui";
import { Landscape } from "../terrain/Landscape";
import type { IGuiModule } from "./GuiManager";

/**
 * Registers landscape generation controls with the GUI manager for interactive
 * parameter adjustment.
 */
export class LandscapeControls implements IGuiModule {
  private landscape: Landscape;

  private readonly controls = {
    terrainFrequency: { min: 0.001, max: 0.1, step: 0.001 },
    terrainAmplitude: { min: 10, max: 200, step: 5 },
    baseHeight: { min: -50, max: 50, step: 5 },
  } as const;

  constructor(landscape: Landscape) {
    this.landscape = landscape;
  }

  setupControls(gui: GUI): void {
    const generator = this.landscape.getGenerator();

    const folder = gui.addFolder("Landscape Generation");

    folder
      .add(
        generator,
        "terrainFrequency",
        this.controls.terrainFrequency.min,
        this.controls.terrainFrequency.max,
        this.controls.terrainFrequency.step,
      )
      .name("Terrain Frequency")
      .onFinishChange(() => {
        this.landscape.regenerate();
      });

    folder
      .add(
        generator,
        "terrainAmplitude",
        this.controls.terrainAmplitude.min,
        this.controls.terrainAmplitude.max,
        this.controls.terrainAmplitude.step,
      )
      .name("Terrain Amplitude")
      .onFinishChange(() => {
        this.landscape.regenerate();
      });

    folder
      .add(
        generator,
        "baseHeight",
        this.controls.baseHeight.min,
        this.controls.baseHeight.max,
        this.controls.baseHeight.step,
      )
      .name("Base Height")
      .onFinishChange(() => {
        this.landscape.regenerate();
      });

    // Add regenerate button
    const regenerateControl = {
      regenerate: () => {
        this.landscape.regenerate();
      },
    };
    folder.add(regenerateControl, "regenerate").name("Regenerate");

    folder.open();
  }

  getModuleName(): string {
    return "Landscape";
  }
}

