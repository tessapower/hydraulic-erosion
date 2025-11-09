// Mesh.ts: Manages a landscape plane with two visible walls that update based on
// landscape edges.
import * as THREE from "three";

/**
 * Manages a landscape plane with two visible walls that update based on landscape
 * edges. Optimized for orthographic view where only front and right walls are
 * visible.
 */
export class Mesh {
  private readonly group: THREE.Group;
  private readonly landscapeMesh: THREE.Mesh;
  private readonly leftWallMesh: THREE.Mesh;
  private readonly rightWallMesh: THREE.Mesh;

  private readonly size: number;
  private readonly segments: number;
  private readonly wallHeight: number;

  private heightMap: Float32Array;

  constructor(
    size: number,
    segments: number,
    wallHeight: number,
    initialHeightMap: Float32Array,
    landscapeMaterial: THREE.ShaderMaterial,
    wallMaterial: THREE.Material
  ) {
    this.size = size;
    this.segments = segments;
    this.wallHeight = wallHeight;
    this.heightMap = initialHeightMap;

    this.group = new THREE.Group();

    // Create landscape plane
    const planeGeometry = new THREE.PlaneGeometry(
      this.size,
      this.size,
      this.segments,
      this.segments
    );
    planeGeometry.rotateX(-Math.PI / 2);
    
    this.landscapeMesh = new THREE.Mesh(planeGeometry, landscapeMaterial);
    this.landscapeMesh.castShadow = true;
    this.group.add(this.landscapeMesh);

    // Create right wall (positive Z side, closest to camera)
    const LeftWallGeometry = new THREE.PlaneGeometry(
      this.size,
      this.wallHeight,
      this.segments,
      1
    );

    // No rotation needed - default facing is correct
    LeftWallGeometry.translate(0, -this.wallHeight / 2, this.size / 2);
    this.leftWallMesh = new THREE.Mesh(LeftWallGeometry, wallMaterial);
    this.leftWallMesh.receiveShadow = true;
    this.group.add(this.leftWallMesh);

    // Create left wall (positive X side, closest to camera)
    const rightWallGeometry = new THREE.PlaneGeometry(
      this.size,
      this.wallHeight,
      this.segments,
      1
    );
    rightWallGeometry.rotateY(Math.PI / 2); // Face outward toward -X (camera side)
    rightWallGeometry.translate(this.size / 2, -this.wallHeight / 2, 0);
    this.rightWallMesh = new THREE.Mesh(rightWallGeometry, wallMaterial);
    this.rightWallMesh.receiveShadow = true;
    this.group.add(this.rightWallMesh);

    // Apply initial heightmap
    this.updateLandscape(this.heightMap, true);
  }

  /**
   * Updates the landscape with a new heightmap
   * @param heightMap - Float32Array of heights (must match segments + 1)^2
   * @param updateNormals - Whether to recalculate normals (can skip during rapid updates)
   */
  updateLandscape(heightMap: Float32Array, updateNormals: boolean = true): void {
    this.heightMap = heightMap;

    // Update landscape plane heights
    const landscapePositions = this.landscapeMesh.geometry.attributes.position;
    for (let i = 0; i < landscapePositions.count; i++) {
      landscapePositions.setY(i, heightMap[i]);
    }
    landscapePositions.needsUpdate = true;

    // Update wall edges to match landscape
    this.updateWallEdges();

    if (updateNormals) this.landscapeMesh.geometry.computeVertexNormals();
  }

  /**
   * Gets the Three.js group containing all meshes
   */
  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Gets individual meshes for material updates
   */
  getMesh(): THREE.Mesh {
    return this.landscapeMesh;
  }

  getFrontWallMesh(): THREE.Mesh {
    return this.leftWallMesh;
  }

  getRightWallMesh(): THREE.Mesh {
    return this.rightWallMesh;
  }

  /**
   * Cleans up resources
   */
  dispose(): void {
    this.landscapeMesh.geometry.dispose();
    this.leftWallMesh.geometry.dispose();
    this.rightWallMesh.geometry.dispose();

    if (this.landscapeMesh.material instanceof THREE.ShaderMaterial) {
      this.landscapeMesh.material.dispose();
    }
    if (this.leftWallMesh.material instanceof THREE.Material) {
      this.leftWallMesh.material.dispose();
    }
    if (this.rightWallMesh.material instanceof THREE.Material) {
      this.rightWallMesh.material.dispose();
    }
  }

  private updateWallEdges(): void {
    const verticesPerRow = this.segments + 1;

    // Update right wall (matches right edge of landscape: column segments)
    const rightWallPositions = this.rightWallMesh.geometry.attributes.position;
    for (let row: number = 0; row < verticesPerRow; row++) {
      const landscapeIndex = row * verticesPerRow + this.segments;
      const height = this.heightMap[landscapeIndex];

      const wallIndex = verticesPerRow - 1 - row;
      rightWallPositions.setY(wallIndex, height);
    }
    rightWallPositions.needsUpdate = true;

    // Update back wall (matches back edge of landscape: last row)
    const backWallPositions = this.leftWallMesh.geometry.attributes.position;
    const lastRowStart = (verticesPerRow - 1) * verticesPerRow;
    for (let i: number = 0; i < verticesPerRow; i++) {
      const landscapeIndex = lastRowStart + i; // Back edge
      const height = this.heightMap[landscapeIndex];

      backWallPositions.setY(i, height);
    }
    backWallPositions.needsUpdate = true;
  }
}