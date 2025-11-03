// ErosionControls.ts: GUI controls for hydraulic erosion parameters

import GUI from "lil-gui";
import { Landscape } from "../terrain/Landscape";
import type { IGuiModule } from "./GuiManager";

/**
 * Registers erosion-related controls with the GUI manager for interactive
 * parameter adjustment.
 */
export class ErosionControls implements IGuiModule {
  private landscape: Landscape;

  private readonly controls = {
    iterations: { min: 1000, max: 500000, step: 1000 },
    inertia: { min: 0, max: 1, step: 0.01 },
    capacity: { min: 1, max: 20, step: 0.5 },
    minSlope: { min: 0.001, max: 0.1, step: 0.001 },
    erosionSpeed: { min: 0, max: 1, step: 0.05 },
    depositionSpeed: { min: 0, max: 1, step: 0.05 },
    evaporationSpeed: { min: 0, max: 0.5, step: 0.01 },
    gravity: { min: 1, max: 20, step: 0.5 },
    maxPath: { min: 8, max: 128, step: 4 },
    erosionRadius: { min: 1, max: 10, step: 1 },
    depositionRadius: { min: 1, max: 20, step: 1 },
    minLifetime: { min: 0.1, max: 1, step: 0.1 },
    maxLifetime: { min: 1, max: 3, step: 0.1 },
    minWater: { min: 0.1, max: 1, step: 0.1 },
    maxWater: { min: 1, max: 2, step: 0.1 },
    blurRadius: { min: 0, max: 5, step: 1 },
    blendFactor: { min: 0, max: 1, step: 0.05 },
  } as const;

  constructor(landscape: Landscape) {
    this.landscape = landscape;
  }

  setupControls(gui: GUI): void {
    const erosion = this.landscape.getErosion();
    const params = erosion.params;

    const erosionFolder = gui.addFolder("Hydraulic Erosion");

    // Core parameters folder
    const coreFolder = erosionFolder.addFolder("Core Parameters");

    coreFolder
      .add(
        params,
        "iterations",
        this.controls.iterations.min,
        this.controls.iterations.max,
        this.controls.iterations.step,
      )
      .name("Iterations");

    coreFolder
      .add(
        params,
        "inertia",
        this.controls.inertia.min,
        this.controls.inertia.max,
        this.controls.inertia.step,
      )
      .name("Inertia");

    coreFolder
      .add(
        params,
        "capacity",
        this.controls.capacity.min,
        this.controls.capacity.max,
        this.controls.capacity.step,
      )
      .name("Capacity");

    coreFolder
      .add(
        params,
        "minSlope",
        this.controls.minSlope.min,
        this.controls.minSlope.max,
        this.controls.minSlope.step,
      )
      .name("Min Slope");

    coreFolder
      .add(
        params,
        "gravity",
        this.controls.gravity.min,
        this.controls.gravity.max,
        this.controls.gravity.step,
      )
      .name("Gravity");

    coreFolder.onFinishChange(() => {
      this.landscape.regenerate();
    });

    // Speed parameters folder
    const speedFolder = erosionFolder.addFolder("Speed Parameters");

    speedFolder
      .add(
        params,
        "erosionSpeed",
        this.controls.erosionSpeed.min,
        this.controls.erosionSpeed.max,
        this.controls.erosionSpeed.step,
      )
      .name("Erosion Speed");

    speedFolder
      .add(
        params,
        "depositionSpeed",
        this.controls.depositionSpeed.min,
        this.controls.depositionSpeed.max,
        this.controls.depositionSpeed.step,
      )
      .name("Deposition Speed");

    speedFolder
      .add(
        params,
        "evaporationSpeed",
        this.controls.evaporationSpeed.min,
        this.controls.evaporationSpeed.max,
        this.controls.evaporationSpeed.step,
      )
      .name("Evaporation Speed");

    speedFolder.onFinishChange(() => {
      this.landscape.regenerate();
    });

    // Droplet parameters folder
    const dropletFolder = erosionFolder.addFolder("Droplet Parameters");

    dropletFolder
      .add(
        params,
        "maxPath",
        this.controls.maxPath.min,
        this.controls.maxPath.max,
        this.controls.maxPath.step,
      )
      .name("Max Path Length");

    dropletFolder
      .add(
        params,
        "minLifetime",
        this.controls.minLifetime.min,
        this.controls.minLifetime.max,
        this.controls.minLifetime.step,
      )
      .name("Min Lifetime");

    dropletFolder
      .add(
        params,
        "maxLifetime",
        this.controls.maxLifetime.min,
        this.controls.maxLifetime.max,
        this.controls.maxLifetime.step,
      )
      .name("Max Lifetime");

    dropletFolder
      .add(
        params,
        "minWater",
        this.controls.minWater.min,
        this.controls.minWater.max,
        this.controls.minWater.step,
      )
      .name("Min Water");

    dropletFolder
      .add(
        params,
        "maxWater",
        this.controls.maxWater.min,
        this.controls.maxWater.max,
        this.controls.maxWater.step,
      )
      .name("Max Water");

    dropletFolder.onFinishChange(() => {
      this.landscape.regenerate();
    });

    // Radius parameters folder
    const radiusFolder = erosionFolder.addFolder("Radius Parameters");

    radiusFolder
      .add(
        params,
        "erosionRadius",
        this.controls.erosionRadius.min,
        this.controls.erosionRadius.max,
        this.controls.erosionRadius.step,
      )
      .name("Erosion Radius");

    radiusFolder
      .add(
        params,
        "depositionRadius",
        this.controls.depositionRadius.min,
        this.controls.depositionRadius.max,
        this.controls.depositionRadius.step,
      )
      .name("Deposition Radius");

    radiusFolder.onFinishChange(() => {
      this.landscape.regenerate();
    });

    // Blurring parameters folder
    const blurFolder = erosionFolder.addFolder("Blurring");

    blurFolder.add(params, "enableBlurring").name("Enable Blurring");

    blurFolder
      .add(
        params,
        "blurRadius",
        this.controls.blurRadius.min,
        this.controls.blurRadius.max,
        this.controls.blurRadius.step,
      )
      .name("Blur Radius");

    blurFolder
      .add(
        params,
        "blendFactor",
        this.controls.blendFactor.min,
        this.controls.blendFactor.max,
        this.controls.blendFactor.step,
      )
      .name("Blend Factor");

    blurFolder.onFinishChange(() => {
      this.landscape.regenerate();
    });

    erosionFolder.open();
  }

  getModuleName(): string {
    return "Erosion";
  }
}

