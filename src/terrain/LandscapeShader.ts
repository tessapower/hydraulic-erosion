// LandscapeShader.ts: Manages shader material and textures for landscape rendering

import * as THREE from "three";
import vertShader from "../shaders/terrain.vs.glsl?raw";
import fragShader from "../shaders/terrain.fs.glsl?raw";

export interface ShaderUniforms extends Record<string, THREE.IUniform<any>> {
  // Textures
  u_grassTexture: THREE.IUniform<THREE.Texture>;
  u_rockTexture: THREE.IUniform<THREE.Texture>;

  // Texture Scale
  u_textureScale: THREE.IUniform<number>;

  // Slope-based texture blending
  u_slopeThreshold: THREE.IUniform<number>;
  u_slopeBlendRange: THREE.IUniform<number>;

  // Lighting
  u_sunPosition: THREE.IUniform<THREE.Vector3>;
  u_ambientLight: THREE.IUniform<THREE.Color>;
  u_ambientIntensity: THREE.IUniform<number>;
  u_sunColor: THREE.IUniform<THREE.Color>;
  u_sunIntensity: THREE.IUniform<number>;
}

/**
 * Manages shader material creation and texture loading for landscape rendering
 */
export class LandscapeShader {
  private material: THREE.ShaderMaterial;

  // Default slope thresholds
  // Slope is calculated as dot(normal, up) where 1.0 = flat, 0.0 = vertical
  private static readonly DEFAULT_SLOPE_THRESHOLD = 0.7; // Below this = rock
  private static readonly DEFAULT_SLOPE_BLEND_RANGE = 0.15; // Blend range

  constructor() {
    this.material = this.createShaderMaterial();
  }

  /**
   * Creates and configures the shader material with textures
   */
  private createShaderMaterial(): THREE.ShaderMaterial {
    // Load textures
    const basePath = import.meta.env.BASE_URL || '/';
    const loader = new THREE.TextureLoader();
    const grassTexture: THREE.Texture = loader.load(`${basePath}textures/grass.jpg`);
    const rockTexture: THREE.Texture = loader.load(`${basePath}textures/rock.jpg`);

    // Configure texture wrapping and repeat
    const textures: THREE.Texture[] = [grassTexture, rockTexture];
    textures.forEach(texture => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(256, 256);

      // Add anisotropic filtering for better texture quality
      texture.anisotropy = 16;

      // Use better minification filter
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
    });

    const uniforms: ShaderUniforms = {
      // Textures
      u_grassTexture: { value: grassTexture },
      u_rockTexture: { value: rockTexture },

      // Texture Scale
      u_textureScale: { value: 0.05 },

      // Slope-based texture blending
      u_slopeThreshold: { value: LandscapeShader.DEFAULT_SLOPE_THRESHOLD },
      u_slopeBlendRange: { value: LandscapeShader.DEFAULT_SLOPE_BLEND_RANGE },

      // Lighting
      u_sunPosition: { value: new THREE.Vector3(350, 150, 0) },
      u_ambientLight: { value: new THREE.Color(0xffffff) },
      u_ambientIntensity: { value: 1.0 },
      u_sunColor: { value: new THREE.Color(0xffffff) },
      u_sunIntensity: { value: 3.0 },
    };

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vertShader,
      fragmentShader: fragShader,
      lights: false,
    });
  }

  /**
   * Gets the shader material
   */
  getMaterial(): THREE.ShaderMaterial {
    return this.material;
  }

  /**
   * Gets the shader uniforms for direct access
   */
  getUniforms(): ShaderUniforms {
    return this.material.uniforms as ShaderUniforms;
  }

  /**
   * Updates a uniform value
   */
  setUniform(name: keyof ShaderUniforms, value: any): void {
    if (this.material.uniforms[name]) {
      this.material.uniforms[name].value = value;
    }
  }

  /**
   * Disposes of textures and material
   */
  dispose(): void {
    const uniforms = this.material.uniforms as ShaderUniforms;
    uniforms.u_grassTexture.value?.dispose();
    uniforms.u_rockTexture.value?.dispose();
    this.material.dispose();
  }
}

