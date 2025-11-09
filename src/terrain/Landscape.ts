// Landscape.ts: Manages landscape mesh creation and updates

import * as THREE from "three";
import HeightGenerator from "./HeightGenerator";
import {Mesh} from "./Mesh";
import vertShader from "../shaders/terrain.vs.glsl?raw";
import fragShader from "../shaders/terrain.fs.glsl?raw";

/**
 * Manages landscape mesh creation, shader material, and height generation.
 */
export class Landscape {
  private static readonly DEFAULT_SIZE: number = 512;
  private static readonly DEFAULT_RESOLUTION: number = 512;
  private static readonly FLAT_COLOR: THREE.Color = new THREE.Color(0xffffff);
  private static readonly STEEP_COLOR: THREE.Color = new THREE.Color(0xb5b3b0);
  private static readonly WALL_COLOR: THREE.Color = new THREE.Color(0x9f9a93);
  private static readonly WALL_HEIGHT_SCALE: number = 0.1;
  private static readonly TEXTURE_REPEAT: number = 2;
  private static readonly TEXTURE_NORMAl_SCALE: THREE.Vector2 = new THREE.Vector2(3, 3);
  private static readonly TEXTURE_ROUGHNESS: number = 0.7;
  private static readonly TEXTURE_METALNESS: number = 0.0;
  private static readonly LIGHT_INTENSITY: number = 1.3;
  private static readonly LIGHT_COLOR: THREE.Color = new THREE.Color(1.0, 1.0, 0.9);
  private static readonly LIGHT_DIRECTION: THREE.Vector3 = new THREE.Vector3(1, 1, 1).normalize();
  private static readonly INTIAL_SLOPE_THRESHOLD: number = 0.6;

  private readonly mesh: Mesh;
  private readonly shader: THREE.ShaderMaterial;
  private readonly generator: HeightGenerator;
  private readonly segments: number;
  private readonly size: number;

  private heightMap: Float32Array = new Float32Array();

  constructor(
    size: number = Landscape.DEFAULT_SIZE,
    resolution: number = Landscape.DEFAULT_RESOLUTION,
    generator: HeightGenerator,
  ) {
    this.size = size;
    this.segments = resolution;
    this.generator = generator;

    // Create initial height map
    this.heightMap = this.generator.generateHeightMap();

    // Create materials
    this.shader = this.createLandscapeShader();

    // Load normal map texture
    const textureLoader = new THREE.TextureLoader();
    const normalTexture = textureLoader.load(
      `${import.meta.env.BASE_URL}textures/normal-map.jpg`
    );

    normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(Landscape.TEXTURE_REPEAT, Landscape.TEXTURE_REPEAT);

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: Landscape.WALL_COLOR,
      normalMap: normalTexture,
      normalScale: Landscape.TEXTURE_NORMAl_SCALE,
      metalness: Landscape.TEXTURE_METALNESS,
      roughness: Landscape.TEXTURE_ROUGHNESS,
    });

    // Create terrain mesh with walls
    this.mesh = new Mesh(
      this.size,
      this.segments,
      this.size * Landscape.WALL_HEIGHT_SCALE,
      this.heightMap,
      this.shader,
      wallMaterial
    );
  }

  /**
   * Regenerate the landscape with the current settings
   * (uses the same random seed if it was seeded)
   */
  regenerate(): void {
    this.heightMap = this.generator.generateHeightMap();
    this.updateMesh();
  }

  /**
   * Gets the Three.js group containing terrain and walls
   */
  getGroup(): THREE.Group {
    return this.mesh.getGroup();
  }

  /**
   * Gets the shader for accessing uniforms
   */
  getShader(): THREE.ShaderMaterial {
    return this.shader;
  }

  /**
   * Gets the generator for accessing landscape generation parameters
   */
  getGenerator(): HeightGenerator {
    return this.generator;
  }

  /**
   * Gets the current heightmap as a Float32Array
   */
  getHeightMap(): Float32Array {
    return this.heightMap;
  }

  /**
   * Updates the mesh with the current geometry
   */
  updateMesh(): void {
    this.mesh.updateLandscape(this.heightMap, true);
  }

  /**
   * Cleans up resources
   */
  dispose(): void {
    this.mesh.dispose();
    this.shader.dispose();
  }


  private createLandscapeShader(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog, // Automatically includes fogColor, fogNear, fogFar
        {
          // Color based on slope
          u_flatColor: {value: Landscape.FLAT_COLOR},
          u_steepColor: {value: Landscape.STEEP_COLOR},
          u_steepness: {value: Landscape.INTIAL_SLOPE_THRESHOLD},
          // Lighting
          u_lightDirection: {value: Landscape.LIGHT_DIRECTION},
          u_lightColor: {value: Landscape.LIGHT_COLOR},
          u_lightStrength: {value: Landscape.LIGHT_INTENSITY},
        }
      ]),
      vertexShader: vertShader,
      fragmentShader: fragShader,
      toneMapped: false,
      fog: true,
    });
  }
}
