// ColorUtils.ts: Utility functions for color calculations

import * as THREE from "three";

/**
 * Utility class for color-related calculations
 */
export class ColorUtils {
  /**
   * Calculate a wall color by blending flat and steep colors, then darkening
   * The wall color is a blend (70% steep, 30% flat) that's darkened by 30%
   *
   * @param steepColor - The steep terrain color
   * @param flatColor - The flat terrain color
   * @returns The calculated wall color
   */
  static calculateWallColor(
    steepColor: THREE.Color,
    flatColor: THREE.Color
  ): THREE.Color {
    // Blend: 70% steep, 30% flat
    const blended = new THREE.Color(
      steepColor.r * 0.7 + flatColor.r * 0.3,
      steepColor.g * 0.7 + flatColor.g * 0.3,
      steepColor.b * 0.7 + flatColor.b * 0.3
    );

    // Darken by 30% (multiply by 0.70) since walls are typically in shadow
    blended.multiplyScalar(0.70);

    return blended;
  }
}

