// Landscape.ts: Manages landscape mesh creation and updates

import * as THREE from "three";
import LandscapeGenerator from "./LandscapeGenerator";
import { createPlaneMesh } from "./Plane";
import { createLandscapeShader } from "./LandscapeShader";

/**
 * Manages landscape mesh creation, shader material, and height generation.
 */
export class Landscape {
  private static readonly DEFAULT_SIZE: number = 512;
  private static readonly DEFAULT_RESOLUTION: number = 512;

  private readonly mesh: THREE.Mesh;
  private readonly shader: THREE.ShaderMaterial;
  private readonly generator: LandscapeGenerator;
  private readonly segments: number;
  private readonly size: number;

  private heightMap: Float32Array = new Float32Array();

  constructor(
    size: number = Landscape.DEFAULT_SIZE,
    resolution: number = Landscape.DEFAULT_RESOLUTION,
    generator: LandscapeGenerator,
  ) {
    this.size = size;
    this.segments = resolution;
    this.generator = generator;

    this.shader = createLandscapeShader();
    // Create initial terrain
    this.mesh = createPlaneMesh(this.size, this.segments, this.shader);
    this.generateHeights();
  }

  /**
   * Regenerate the landscape with the current settings
   * (uses the same random seed if it was seeded)
   */
  regenerate(): void {
    this.generateHeights();
  }

  /**
   * Gets the Three.js mesh
   */
  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  /**
   * Gets the shader for accessing uniforms
   */
  getShader(): THREE.ShaderMaterial {
    return this.shader;
  }

  /**
   * Gets the generator for accessing erosion parameters
   */
  getGenerator(): LandscapeGenerator {
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
    const vertices = this.mesh.geometry.attributes.position;

    // Apply heightmap to mesh
    for (let i = 0; i < vertices.count; i++) {
      vertices.setZ(i, this.heightMap[i]);
    }
    vertices.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  /**
   * Cleans up resources
   */
  dispose(): void {
    this.mesh.geometry.dispose();
    this.shader.dispose();
  }

  private generateHeights(): void {
    this.heightMap = this.generator.generateHeightMap();
    this.updateMesh();
  }
}
