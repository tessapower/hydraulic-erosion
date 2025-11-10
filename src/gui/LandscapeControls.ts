// LandscapeControls.ts: GUI controls for landscape generator parameters

import GUI from "lil-gui";
import {Landscape} from "../terrain/Landscape";
import type {IGuiModule} from "./GuiManager";

/**
 * Registers landscape generation controls with the GUI manager for interactive
 * parameter adjustment.
 */
export class LandscapeControls implements IGuiModule {
  private landscape: Landscape;
  private landscapeFolder: GUI = null!;

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
    this.landscapeFolder.add(generator, "seed", 0)
      .name("Seed")
      .onFinishChange((value: number) => {
        if (!isNaN(value) && value >= 0) {
          generator.seed = value;
          this.landscape.regenerate();
        }
      }).domElement.title = "Random seed for terrain generation (integer >= 0)";

    this.landscapeFolder
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
      }).domElement.title = "Frequency of base terrain noise (higher = more detailed features)";

    this.landscapeFolder
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
      }).domElement.title = "Height multiplier for terrain features (higher = taller mountains)";

    this.landscapeFolder
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
      }).domElement.title = "Base elevation offset for the entire terrain";

    this.landscapeFolder
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
      }).domElement.title = "Number of noise layers to combine (more = finer detail but slower)";

    this.landscapeFolder
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
      }).domElement.title = "How much each octave contributes (higher = rougher terrain)";

    this.landscapeFolder
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
      }).domElement.title = "Frequency multiplier between octaves (higher = more varied detail)";

    this.landscapeFolder.close();
  }

  getModuleName(): string {
    return "Landscape Generation";
  }
}

