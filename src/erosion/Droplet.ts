// Droplet.ts: Base droplet type and implementations

import { Vector2 } from "three";

/**
 * Droplet that helps to simulate erosion.
 */
export default class Droplet {
  position: Vector2;
  direction: Vector2;
  velocity: number;
  water: number;
  sediment: number;

  constructor(
    startPosition: Vector2 = new Vector2(0, 0),
    direction: Vector2 = new Vector2(0, 0),
    initialWater: number = 1.0,
  ) {
    this.position = startPosition.clone();
    this.direction = direction.clone();
    this.velocity = 1.0;
    this.water = initialWater;
    this.sediment = 0;
  }
}
