import * as THREE from "three";
import vertShader from "../shaders/terrain.vs.glsl?raw";
import fragShader from "../shaders/terrain.fs.glsl?raw";

export function createLandscapeShader(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      // Color based on slope
      u_flatColor: {value: new THREE.Color(0x72a172)},  // Grass green
      u_steepColor: {value: new THREE.Color(0xcbbfb4)}, // Dirt brown
      u_steepness: {value: 0.6},                                 // Threshold
      // Lighting
      u_lightDirection: {value: new THREE.Vector3(1, 1, 1).normalize()},
      u_lightColor: {value: new THREE.Color(1.0, 1.0, 0.9)},
      u_lightStrength: {value: 1.3},
      // Fog: initialize with default values - will be set by SceneManager
      fogColor: {value: new THREE.Color()},
      fogNear: {value: 0},
      fogFar: {value: 0},
    },
    vertexShader: vertShader,
    fragmentShader: fragShader,
    toneMapped: false,
    fog: true,
  });
}
