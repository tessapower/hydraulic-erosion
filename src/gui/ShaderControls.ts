// ShaderControls.ts

import * as THREE from "three";
import type {IGuiModule} from "./GuiManager";
import GUI, {type Controller} from "lil-gui";

export class ShaderControls implements IGuiModule {
  // Default shader parameters (from Landscape.ts)
  private static readonly DEFAULT_FLAT_COLOR = 0x8ea187;
  private static readonly DEFAULT_STEEP_COLOR = 0xb5b3b0;
  private static readonly DEFAULT_STEEPNESS = 0.6;

  private material: THREE.ShaderMaterial;
  private wallMaterial: THREE.MeshStandardMaterial | null = null;
  private shaderFolder: GUI = null!;
  private controllers: Array<Controller> = [];
  private colorControllers: { flatColor: number; steepColor: number } = {
    flatColor: ShaderControls.DEFAULT_FLAT_COLOR,
    steepColor: ShaderControls.DEFAULT_STEEP_COLOR,
  };

  constructor(material: THREE.ShaderMaterial, wallMaterial?: THREE.MeshStandardMaterial) {
    this.material = material;
    this.wallMaterial = wallMaterial || null;
  }

  registerParent(parentGui: GUI): void {
    this.shaderFolder = parentGui.addFolder(this.getModuleName());

    // Initialize color controllers with current values
    this.colorControllers = {
      flatColor: this.material.uniforms.u_flatColor.value.getHex(),
      steepColor: this.material.uniforms.u_steepColor.value.getHex(),
    };

    const flatColorCtrl = this.shaderFolder.addColor(this.colorControllers, "flatColor").onChange((value: number) => {
      this.material.uniforms.u_flatColor.value.setHex(value);
      this.updateWallColor();
    }).name("Flat Color");

    const steepColorCtrl = this.shaderFolder.addColor(this.colorControllers, "steepColor").onChange((value: number) => {
      this.material.uniforms.u_steepColor.value.setHex(value);
      this.updateWallColor();
    }).name("Steep Color");

    const steepnessCtrl = this.shaderFolder
      .add(this.material.uniforms.u_steepness, "value", 0.0, 1.0, 0.05)
      .name("Steepness Threshold");

    this.controllers.push(flatColorCtrl, steepColorCtrl, steepnessCtrl);

    // Add reset button
    this.shaderFolder.add({reset: () => this.resetParameters()}, "reset")
      .name("Reset Parameters");

    this.shaderFolder.close();
  }

  resetParameters(): void {
    // Reset material uniforms to defaults
    this.material.uniforms.u_flatColor.value.setHex(ShaderControls.DEFAULT_FLAT_COLOR);
    this.material.uniforms.u_steepColor.value.setHex(ShaderControls.DEFAULT_STEEP_COLOR);
    this.material.uniforms.u_steepness.value = ShaderControls.DEFAULT_STEEPNESS;

    // Update the color controllers object so the GUI displays the new values
    this.colorControllers.flatColor = ShaderControls.DEFAULT_FLAT_COLOR;
    this.colorControllers.steepColor = ShaderControls.DEFAULT_STEEP_COLOR;

    // Update wall color based on reset colors
    this.updateWallColor();

    // Update the GUI controllers to reflect new values
    this.controllers.forEach(controller => controller.updateDisplay());
  }

  getModuleName(): string {
    return "Rendering";
  }

  /**
   * Calculate a wall color by blending flat and steep colors, then darkening
   * The wall color is a blend (70% steep, 30% flat) that's darkened by 30%
   */
  private calculateWallColor(steepColor: number, flatColor: number): THREE.Color {
    const steep = new THREE.Color(steepColor);
    const flat = new THREE.Color(flatColor);

    // Blend: 70% steep, 30% flat
    const blended = new THREE.Color(
      steep.r * 0.7 + flat.r * 0.3,
      steep.g * 0.7 + flat.g * 0.3,
      steep.b * 0.7 + flat.b * 0.3
    );

    // Darken by 30% (multiply by 0.70) since walls are typically in shadow
    blended.multiplyScalar(0.70);

    return blended;
  }

  /**
   * Update the wall material color based on current steep and flat colors
   */
  private updateWallColor(): void {
    if (this.wallMaterial) {
      const wallColor = this.calculateWallColor(
        this.colorControllers.steepColor,
        this.colorControllers.flatColor
      );
      this.wallMaterial.color.copy(wallColor);
    }
  }
}

