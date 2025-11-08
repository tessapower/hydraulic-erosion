// ShaderControls.ts

import * as THREE from "three";
import type {IGuiModule} from "./GuiManager";
import type GUI from "lil-gui";

export class ShaderControls implements IGuiModule {
  private material: THREE.ShaderMaterial;

  constructor(material: THREE.ShaderMaterial) {
    this.material = material;
  }

  registerParent(parentGui: GUI): void {
    const folder = gui.addFolder("Rendering");

    const colors = {
      flatColor: this.material.uniforms.u_flatColor.value.getHex(),
      steepColor: this.material.uniforms.u_steepColor.value.getHex(),
    };

    folder.addColor(colors, "flatColor").onChange((value: number) => {
      this.material.uniforms.u_flatColor.value.setHex(value);
    }).name("Flat Color");

    folder.addColor(colors, "steepColor").onChange((value: number) => {
      this.material.uniforms.u_steepColor.value.setHex(value);
    }).name("Steep Color");

    folder
      .add(this.material.uniforms.u_steepness, "value", 0.0, 1.0, 0.05)
      .name("Steepness Threshold");

    folder
      .add(this.material.uniforms.u_lightStrength, "value", 0.0, 3.0, 0.1)
      .name("Light Strength");

    folder.close();
  }

  getModuleName(): string {
    return "Rendering";
  }
}
