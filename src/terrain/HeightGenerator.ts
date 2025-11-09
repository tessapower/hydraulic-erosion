// LandscapeGenerator.ts: generates a landscape procedurally

import {createNoise2D, type NoiseFunction2D} from "simplex-noise";
import {type RandomFn} from "../utils/Random";

/**
 * Generates procedural terrain heightmaps using multi-octave noise.
 *
 * Key concepts:
 * - Multi-octave Simplex noise for organic terrain variation (fBm)
 * - Octaves: Number of noise layers to combine
 * - Persistence: How much each octave contributes (typically 0.5 - 0.6)
 * - Lacunarity (Gain): Frequency multiplier between octaves (typically 2.0)
 */
export default class HeightGenerator {
  private static readonly DEFAULT_WIDTH_SEGMENTS: number = 513;
  private static readonly DEFAULT_HEIGHT_SEGMENTS: number = 513;
  // Terrain generation parameters (public for GUI control)
  public terrainFrequency: number = 0.005;
  public baseFrequency: number = 1.0;
  public terrainAmplitude: number = 60;
  public baseHeight: number = 0;
  public minHeight: number = Infinity;
  public maxHeight: number = -Infinity;
  // Number of noise layers
  public octaves: number = 15;
  // Amplitude multiplier per octave (0.5 = each octave is half as strong)
  public persistence: number = 0.6;
  // Frequency multiplier per octave (2.0 = each octave is twice as frequent)
  public lacunarity: number = 2.0;

  // Multi-octave noise parameters
  // returns a value between -1 and 1
  private readonly simplex: NoiseFunction2D;
  private readonly widthSegments: number;
  private readonly heightSegments: number;

  constructor(
    widthSegments: number = HeightGenerator.DEFAULT_WIDTH_SEGMENTS,
    heightSegments: number = HeightGenerator.DEFAULT_HEIGHT_SEGMENTS,
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
   * Returns raw noise value (not normalized)
   */
  private fbm(x: number, y: number): number {
    let value: number = 0;
    let amplitude: number = 1;
    let frequency: number = this.baseFrequency;

    for (let i: number = 0; i < this.octaves; i++) {
      // Sample noise at current frequency and scale by amplitude
      value += this.simplex(x * frequency, y * frequency) * amplitude;

      // Increase frequency and decrease amplitude for next octave
      frequency *= this.lacunarity;
      amplitude *= this.persistence;
    }

    // Return raw value
    return value;
  }

  private generateHeights(
    width: number,
    height: number,
    heights: Float32Array,
  ): void {
    // First pass: Generate all heights and track actual min/max
    // Pass 1: raw values + min/max
    for (let y: number = 0; y < height; y++) {
      const v: number = y / (height - 1); // unit domain [0,1]
      for (let x: number = 0; x < width; x++) {
        const u: number = x / (width - 1); // unit domain [0,1]

        const noiseValue: number = this.fbm(u, v); // raw fBm sample

        const idx: number = y * width + x;
        heights[idx] = noiseValue;

        if (noiseValue < this.minHeight) this.minHeight = noiseValue;
        if (noiseValue > this.maxHeight) this.maxHeight = noiseValue;
      }
    }

    // Second pass: Normalize to [0, 1] based on actual range, then scale
    const range: number = this.maxHeight - this.minHeight || 1;
    for (let i: number = 0; i < heights.length; i++) {
      // Normalize to [0, 1] using actual min/max
      const normalized: number = (heights[i] - this.minHeight) / range;
      heights[i] = normalized * this.terrainAmplitude + this.baseHeight;
    }
  }
}
