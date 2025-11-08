// ShaderControls.ts

import * as THREE from "three";
import type {IGuiModule} from "./GuiManager";
import GUI from "lil-gui";

export class ShaderControls implements IGuiModule {
  private material: THREE.ShaderMaterial;
  private shaderFolder: GUI = null!;

  constructor(material: THREE.ShaderMaterial) {
    this.material = material;
  }

  registerParent(parentGui: GUI): void {
    this.shaderFolder = parentGui.addFolder(this.getModuleName());

    const colors = {
      flatColor: this.material.uniforms.u_flatColor.value.getHex(),
      steepColor: this.material.uniforms.u_steepColor.value.getHex(),
    };

    this.shaderFolder.addColor(colors, "flatColor").onChange((value: number) => {
      this.material.uniforms.u_flatColor.value.setHex(value);
    }).name("Flat Color");

    this.shaderFolder.addColor(colors, "steepColor").onChange((value: number) => {
      this.material.uniforms.u_steepColor.value.setHex(value);
    }).name("Steep Color");

    this.shaderFolder
      .add(this.material.uniforms.u_steepness, "value", 0.0, 1.0, 0.05)
      .name("Steepness Threshold");

    this.shaderFolder
      .add(this.material.uniforms.u_lightStrength, "value", 0.0, 3.0, 0.1)
      .name("Light Strength");

    this.shaderFolder.close();
  }

  getModuleName(): string {
    return "Rendering";
  }
}
