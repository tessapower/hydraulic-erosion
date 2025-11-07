import * as THREE from "three";
import vertShader from "../shaders/terrain.vs.glsl?raw";
import fragShader from "../shaders/terrain.fs.glsl?raw";

export function createLandscapeShader(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog, // Automatically includes fogColor, fogNear, fogFar
      {
        // Color based on slope
        u_flatColor: {value: new THREE.Color(0xffffff)},  // Grass green
        u_steepColor: {value: new THREE.Color(0xb5b3b0)}, // Dirt brown
        u_steepness: {value: 0.6},                                 // Threshold
        // Lighting
        u_lightDirection: {value: new THREE.Vector3(1, 1, 1).normalize()},
        u_lightColor: {value: new THREE.Color(1.0, 1.0, 0.9)},
        u_lightStrength: {value: 1.3},
      }
    ]),
    vertexShader: vertShader,
    fragmentShader: fragShader,
    toneMapped: false,
    fog: true,
  });
}
