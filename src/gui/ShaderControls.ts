// ShaderControls.ts: GUI controls for shader parameters

import GUI from "lil-gui";
import { LandscapeShader } from "../terrain/LandscapeShader";
import type { IGuiModule } from "./GuiManager";

/**
 * Registers shader-related controls with the GUI manager for interactive
 * parameter adjustment.
 */
export class ShaderControls implements IGuiModule {
  private shader: LandscapeShader;

  private readonly controls = {
    textureScale: { min: 0.01, max: 0.2, step: 0.01 },
    slopeThreshold: { min: 0, max: 1, step: 0.01 },
    slopeBlendRange: { min: 0, max: 0.3, step: 0.01 },
  } as const;

  constructor(shader: LandscapeShader) {
    this.shader = shader;
  }

  setupControls(gui: GUI): void {
    const uniforms = this.shader.getUniforms();
    const folder = gui.addFolder("Shader & Textures");

    // Texture scale control
    folder
      .add(
        uniforms.u_textureScale,
        'value',
        this.controls.textureScale.min,
        this.controls.textureScale.max,
        this.controls.textureScale.step
      )
      .name("Texture Scale")
      .domElement.title = "Scale of texture tiling (lower = larger features)";

    // Slope threshold controls
    const slopeFolder = folder.addFolder("Slope-Based Texturing");

    slopeFolder
      .add(
        uniforms.u_slopeThreshold,
        'value',
        this.controls.slopeThreshold.min,
        this.controls.slopeThreshold.max,
        this.controls.slopeThreshold.step
      )
      .name("Slope Threshold")
      .domElement.title = "Slope threshold for grass vs rock (1.0 = flat, 0.0 = vertical). Above this = grass, below = rock";

    slopeFolder
      .add(
        uniforms.u_slopeBlendRange,
        'value',
        this.controls.slopeBlendRange.min,
        this.controls.slopeBlendRange.max,
        this.controls.slopeBlendRange.step
      )
      .name("Blend Range")
      .domElement.title = "Smoothness of transition between grass and rock";

    // Add reset button
    const resetControls = {
      reset: () => {
        uniforms.u_slopeThreshold.value = 0.7;
        uniforms.u_slopeBlendRange.value = 0.15;
        uniforms.u_textureScale.value = 0.05;
      }
    };

    folder.add(resetControls, 'reset').name('Reset to Defaults').domElement.title =
      "Reset all shader parameters to default values";
  }

  getModuleName(): string {
    return "Shader";
  }
}

