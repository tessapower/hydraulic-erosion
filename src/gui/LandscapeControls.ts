// LandscapeControls.ts: GUI controls for landscape generator parameters

import GUI, {Controller} from "lil-gui";
import {Landscape} from "../terrain/Landscape";
import type {IGuiModule} from "./GuiManager";

/**
 * Registers landscape generation controls with the GUI manager for interactive
 * parameter adjustment.
 */
export class LandscapeControls implements IGuiModule {
  // Default values from HeightGenerator.ts
  private static readonly DEFAULT_SEED = 42;
  private static readonly DEFAULT_TERRAIN_FREQUENCY = 0.005;
  private static readonly DEFAULT_TERRAIN_AMPLITUDE = 60;
  private static readonly DEFAULT_BASE_HEIGHT = 0;
  private static readonly DEFAULT_OCTAVES = 15;
  private static readonly DEFAULT_PERSISTENCE = 0.6;
  private static readonly DEFAULT_LACUNARITY = 2.0;

  private landscape: Landscape;
  private landscapeFolder: GUI = null!;
  private controllers: Array<Controller> = [];

  private readonly controls = {
    seed: {start: 42},
    terrainFrequency: {min: 0, max: 0.015, step: 0.001},
    terrainAmplitude: {min: 10, max: 200, step: 5},
    baseHeight: {min: 0, max: 50, step: 5},
    octaves: {min: 1, max: 15, step: 1},
    persistence: {min: 0.1, max: 0.9, step: 0.05},
    lacunarity: {min: 1.5, max: 3.0, step: 0.1},
  } as const;

  constructor(landscape: Landscape) {
    this.landscape = landscape;
  }

  registerParent(parentGui: GUI): void {
    this.landscapeFolder = parentGui.addFolder(this.getModuleName());

    const generator = this.landscape.getGenerator();
    const seedCtrl = this.landscapeFolder.add(generator, "seed", 0)
      .name("Seed")
      .onFinishChange((value: number) => {
        if (!isNaN(value) && value >= 0) {
          generator.seed = value;
          this.landscape.regenerate();
        }
      });
    seedCtrl.domElement.title = "Random seed for terrain generation (integer >= 0)";

    const freqCtrl = this.landscapeFolder
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
    freqCtrl.domElement.title = "Frequency of base terrain noise (higher = more detailed features)";

    const ampCtrl = this.landscapeFolder
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
    ampCtrl.domElement.title = "Height multiplier for terrain features (higher = taller mountains)";

    const baseHeightCtrl = this.landscapeFolder
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
    baseHeightCtrl.domElement.title = "Base elevation offset for the entire terrain";

    const octavesCtrl = this.landscapeFolder
      .add(
        generator,
        "octaves",
        this.controls.octaves.min,
        this.controls.octaves.max,
        this.controls.octaves.step,
      )
      .name("Octaves")
      .onFinishChange(() => {
        this.landscape.regenerate();
      });
    octavesCtrl.domElement.title = "Number of noise layers to combine (more = finer detail but slower)";

    const persistenceCtrl = this.landscapeFolder
      .add(
        generator,
        "persistence",
        this.controls.persistence.min,
        this.controls.persistence.max,
        this.controls.persistence.step,
      )
      .name("Persistence")
      .onFinishChange(() => {
        this.landscape.regenerate();
      });
    persistenceCtrl.domElement.title = "How much each octave contributes (higher = rougher terrain)";

    const lacunarityCtrl = this.landscapeFolder
      .add(
        generator,
        "lacunarity",
        this.controls.lacunarity.min,
        this.controls.lacunarity.max,
        this.controls.lacunarity.step,
      )
      .name("Lacunarity")
      .onFinishChange(() => {
        this.landscape.regenerate();
      });
    lacunarityCtrl.domElement.title = "Frequency multiplier between octaves (higher = more varied detail)";

    this.controllers.push(seedCtrl, freqCtrl, ampCtrl, baseHeightCtrl, octavesCtrl, persistenceCtrl, lacunarityCtrl);

    // Add reset button
    this.landscapeFolder.add({reset: () => this.resetParameters()}, "reset")
      .name("Reset Parameters");

    this.landscapeFolder.close();
  }

  resetParameters(): void {
    const generator = this.landscape.getGenerator();

    // Reset generator parameters to defaults
    generator.seed = LandscapeControls.DEFAULT_SEED;
    generator.terrainFrequency = LandscapeControls.DEFAULT_TERRAIN_FREQUENCY;
    generator.terrainAmplitude = LandscapeControls.DEFAULT_TERRAIN_AMPLITUDE;
    generator.baseHeight = LandscapeControls.DEFAULT_BASE_HEIGHT;
    generator.octaves = LandscapeControls.DEFAULT_OCTAVES;
    generator.persistence = LandscapeControls.DEFAULT_PERSISTENCE;
    generator.lacunarity = LandscapeControls.DEFAULT_LACUNARITY;

    // Update the GUI controllers to reflect new values
    this.controllers.forEach(controller => controller.updateDisplay());

    // Regenerate the landscape with default parameters
    this.landscape.regenerate();
  }

  enable(enabled: boolean): void {
    for (const control of this.landscapeFolder.children) {
      if (control instanceof Controller) {
        control.enable(enabled);
      }
    }
  }

  getModuleName(): string {
    return "Landscape Generation";
  }
}

