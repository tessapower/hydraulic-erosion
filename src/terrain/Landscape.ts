// Landscape.ts: Manages landscape mesh creation and updates

import * as THREE from "three";
import LandscapeGenerator from "./LandscapeGenerator.ts";
import { BeyerErosion } from "../erosion/BeyerErosion.ts";
import { createPlaneMesh } from "./Plane.ts";
/**
 * Manages landscape mesh creation, shader material, and height generation.
 */
export class Landscape {
  private static readonly DEFAULT_SIZE = 512;
  private static readonly DEFAULT_RESOLUTION = 512;

  private readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly generator: LandscapeGenerator;
  private readonly erosion: BeyerErosion;
  private readonly segments: number;
  private readonly size: number;

  constructor(
    size: number = Landscape.DEFAULT_SIZE,
    resolution: number = Landscape.DEFAULT_RESOLUTION,
    generator: LandscapeGenerator,
    erosion: BeyerErosion,
  ) {
    this.size = size;
    this.segments = resolution;
    this.generator = generator;
    this.erosion = erosion;

    // Create initial terrain
    this.material = new THREE.MeshStandardMaterial({});
    this.mesh = createPlaneMesh(this.size, this.segments, this.material);
    this.generateHeights();
  }

  private generateHeights(): void {
    const heightMap = this.generator.generateHeightMap();

    // Apply erosion
    this.erosion.erode(
      heightMap,
      this.segments + 1,
      this.segments + 1,
    );

    this.applyHeightMap(heightMap);
  }

  private applyHeightMap(heightMap: Float32Array): void {
    const vertices = this.mesh.geometry.attributes.position;

    for (let i = 0; i < vertices.count; i++) {
      vertices.setZ(i, heightMap[i]);
    }

    vertices.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
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
   * Gets the generator for accessing erosion parameters
   */
  getGenerator(): LandscapeGenerator {
    return this.generator;
  }

  /**
   * Gets the erosion simulator for accessing erosion parameters
   */
  getErosion(): BeyerErosion {
    return this.erosion;
  }

  /**
   * Cleans up resources
   */
  dispose(): void {
    this.mesh.geometry.dispose();
    if (this.mesh.material instanceof THREE.MeshStandardMaterial) {
      this.mesh.material.dispose();
    }
  }
}
