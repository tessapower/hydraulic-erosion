// LandscapeGenerator.ts: generates a landscape procedurally

import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import { type RandomFn } from "../utils/Random.ts";
import { BeyerErosion } from "../erosion/BeyerErosion.ts";

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

  private readonly erosionSimulator: BeyerErosion;

  // returns a value between -1 and 1
  private readonly simplex: NoiseFunction2D;

  private readonly widthSegments: number;
  private readonly heightSegments: number;

  constructor(
    widthSegments: number = LandscapeGenerator.DEFAULT_WIDTH_SEGMENTS,
    heightSegments: number = LandscapeGenerator.DEFAULT_HEIGHT_SEGMENTS,
    rng: RandomFn,
  ) {

    this.widthSegments = widthSegments;
    this.heightSegments = heightSegments;
    this.simplex = createNoise2D(rng);

    this.erosionSimulator = new BeyerErosion({
      iterations: 50000,
      inertia: 0.05,
      capacity: 4,
      minSlope: 0.01,
      erosionSpeed: 0.5,
      depositionSpeed: 0.15,
      evaporationSpeed: 0.2,
      gravity: 8,
      maxPath: 32,
      erosionRadius: 4,
      depositionRadius: 12,
      minLifetime: 0.7,
      maxLifetime: 1.0,
      minWater: 0.7,
      maxWater: 1.2,
      enableBlurring: true,
      blurRadius: 1,
      blendFactor: 0.5,
      randomFn: rng,
    });
  }

  /**
   * Generates a height map for a plane with widthSegments x heightSegments.
   *
   */
  generateHeightMap(): Float32Array {
    const heights = new Float32Array(this.widthSegments * this.heightSegments);
    this.generateHeights(this.widthSegments, this.heightSegments, heights);

    this.erosionSimulator.erode(
      heights,
      this.widthSegments,
      this.heightSegments,
    );

    return heights;
  }

  private generateHeights(
    width: number,
    height: number,
    heights: Float32Array,
  ): void {
    // 0.01-0.05 typical
    const terrainFrequency = 0.01;
    // 50 - 100 typical
    const terrainAmplitude = 100;
    // Minimum height, raises overall landscape
    const baseHeight = 0;

    for (let y: number = 0; y < height; y++) {
      for (let x: number = 0; x < width; x++) {
        const worldX = x - width / 2;
        const worldY = y - height / 2;

        // Lower frequency = larger features
        const noiseValue = this.simplex(
          worldX * terrainFrequency,
          worldY * terrainFrequency,
        );
        // noiseValue is now between -1 and 1

        // Convert from [-1, 1] to [0, terrainAmplitude]
        const normalizedNoise = (noiseValue + 1) / 2; // [0, 1]
        const scaledHeight = normalizedNoise * terrainAmplitude + baseHeight;

        const index = y * width + x;
        heights[index] = scaledHeight;
      }
    }
  }
}
