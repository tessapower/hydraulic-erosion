// LandscapeGenerator.ts: generates a landscape procedurally

import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import { type RandomFn } from "../utils/Random.ts";

/**
 * Generates procedural terrain heightmaps using multi-octave noise.
 *
 * Key concepts:
 * - Multi-octave Simplex noise for organic terrain variation (fBm)
 * - Octaves: Number of noise layers to combine
 * - Persistence: How much each octave contributes (typically 0.5 - 0.6)
 * - Lacunarity (Gain): Frequency multiplier between octaves (typically 2.0)
 */
export default class LandscapeGenerator {
  private static readonly DEFAULT_WIDTH_SEGMENTS: number = 513;
  private static readonly DEFAULT_HEIGHT_SEGMENTS: number = 513;

  // returns a value between -1 and 1
  private readonly simplex: NoiseFunction2D;

  private readonly widthSegments: number;
  private readonly heightSegments: number;

  // Terrain generation parameters (public for GUI control)
  public terrainFrequency: number = 0.005;
  public terrainAmplitude: number = 100;
  public baseHeight: number = 0;

  // Multi-octave noise parameters
  // Number of noise layers
  public octaves: number = 6;
  // Amplitude multiplier per octave (0.5 = each octave is half as strong)
  public persistence: number = 0.5;
  // Frequency multiplier per octave (2.0 = each octave is twice as frequent)
  public lacunarity: number = 2.0;

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
   */
  generateHeightMap(): Float32Array {
    const heights = new Float32Array(this.widthSegments * this.heightSegments);
    this.generateHeights(this.widthSegments, this.heightSegments, heights);
    return heights;
  }

  /**
   * Generates multi-octave noise using fractional Brownian motion (fBm)
   */
  private generateOctaveNoise(x: number, y: number): number {
    let value: number = 0;
    let amplitude: number = 1;
    let frequency: number = 1;
    // Used for normalization
    let maxValue: number = 0;

    for (let i = 0; i < this.octaves; i++) {
      // Sample noise at current frequency and scale by amplitude
      value += this.simplex(x * frequency, y * frequency) * amplitude;

      // Track max possible value for normalization
      maxValue += amplitude;

      // Increase frequency and decrease amplitude for next octave
      frequency *= this.lacunarity;
      amplitude *= this.persistence;
    }

    // Normalize to [-1, 1] range
    return value / maxValue;
  }

  private generateHeights(
    width: number,
    height: number,
    heights: Float32Array,
  ): void {
    for (let y: number = 0; y < height; y++) {
      for (let x: number = 0; x < width; x++) {
        const worldX: number = x - width / 2;
        const worldY: number = y - height / 2;

        // Use multi-octave noise for richer terrain features
        // noiseValue ∈ [-1, 1];
        const noiseValue: number = this.generateOctaveNoise(
          worldX * this.terrainFrequency,
          worldY * this.terrainFrequency,
        );

        // Convert from [-1, 1] to [0, terrainAmplitude]
        const normalizedNoise: number = (noiseValue + 1) / 2; // [0, 1]
        const scaledHeight: number = normalizedNoise * this.terrainAmplitude + this.baseHeight;

        const idx: number = y * width + x;
        heights[idx] = scaledHeight;
      }
    }
  }
}
