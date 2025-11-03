// LandscapeGenerator.ts: generates a landscape procedurally

import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import { type RandomFn } from "../utils/Random.ts";

/**
 * Generates procedural terrain heightmaps using noise,
 * Voronoi, warping, and peaks.
 *
 * Key concepts:
 * - Simplex noise for organic terrain variation
 * - Voronoi falloff for island shapes
 * - Domain warping for more natural, less grid-like features
 * - Peaks for mountainous regions
 *
 * Parameters:
 * - numIslands: Number of Voronoi seed points for islands
 * - islandThreshold: Controls land/sea boundary
 * - voronoiFalloff: Controls how sharply islands fall off into sea
 * - warpStrength, warpFrequency: Control domain warping
 * - peaksFrequency, peaksAmplitude: Control peak generation
 * - terrainFrequency: Controls base terrain variation
 * - islandsWeight, terrainWeight, peaksWeight: Blend weights for each feature
 */
export default class LandscapeGenerator {
  private static readonly DEFAULT_WIDTH_SEGMENTS: number = 513;
  private static readonly DEFAULT_HEIGHT_SEGMENTS: number = 513;

  // returns a value between -1 and 1
  private readonly simplex: NoiseFunction2D;

  private readonly widthSegments: number;
  private readonly heightSegments: number;

  // Terrain generation parameters (public for GUI control)
  public terrainFrequency: number = 0.01;
  public terrainAmplitude: number = 100;
  public baseHeight: number = 0;

  constructor(
    widthSegments: number = LandscapeGenerator.DEFAULT_WIDTH_SEGMENTS,
    heightSegments: number = LandscapeGenerator.DEFAULT_HEIGHT_SEGMENTS,
    rng: RandomFn,
  ) {
    this.widthSegments = widthSegments;
    this.heightSegments = heightSegments;
    this.simplex = createNoise2D(rng);
  }

  /**
   * Generates a height map for a plane with widthSegments x heightSegments.
   *
   */
  generateHeightMap(): Float32Array {
    const heights = new Float32Array(this.widthSegments * this.heightSegments);
    this.generateHeights(this.widthSegments, this.heightSegments, heights);
    return heights;
  }

  private generateHeights(
    width: number,
    height: number,
    heights: Float32Array,
  ): void {
    for (let y: number = 0; y < height; y++) {
      for (let x: number = 0; x < width; x++) {
        const worldX = x - width / 2;
        const worldY = y - height / 2;

        // Lower frequency = larger features
        const noiseValue = this.simplex(
          worldX * this.terrainFrequency,
          worldY * this.terrainFrequency,
        );
        // noiseValue is now between -1 and 1

        // Convert from [-1, 1] to [0, terrainAmplitude]
        const normalizedNoise = (noiseValue + 1) / 2; // [0, 1]
        const scaledHeight = normalizedNoise * this.terrainAmplitude + this.baseHeight;

        const index = y * width + x;
        heights[index] = scaledHeight;
      }
    }
  }
}
