// SceneManager.ts: Three.js scene setup and orchestration

import * as THREE from "three";
import { Landscape } from "./terrain/Landscape";
import LandscapeGenerator from "./terrain/LandscapeGenerator";
import { BeyerErosion } from "./erosion/BeyerErosion";
import { GuiManager } from "./gui/GuiManager";
import { LandscapeControls } from "./gui/LandscapeControls";
import { ErosionControls } from "./gui/ErosionControls";
import { Simulator } from "./erosion/Simulator";
import Stats from "stats.js";

/**
 * Orchestrates the Three.js scene, including terrain, lighting, camera,
 * and GUI. Handles initialization, animation loop, resizing, and cleanup.
 */
export class SceneManager {
  private static readonly TERRAIN_SIZE = 512;
  private static readonly TERRAIN_RESOLUTION = 512;
  private static readonly RANDOM_SEED = 42;

  private readonly canvas: HTMLCanvasElement;
  private readonly scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private animationId: number | null = null;

  private readonly landscape: Landscape;
  private readonly simulator: Simulator;
  private readonly guiManager: GuiManager;

  // Camera
  private readonly camera: THREE.Camera;

  // Performance monitoring (only in debug mode)
  private stats?: Stats;

  // Lighting
  private readonly lightingConfig = {
    ambient: {
      color: 0xffffff,
      intensity: 1,
    },
    sun: {
      color: 0xffffff,
      intensity: 3,
      position: new THREE.Vector3(350, 150, 0),
      targetPosition: new THREE.Vector3(0, 0, 0),
    },
    shadow: {
      mapSize: 2048,
      cameraNear: 0.5,
      cameraFar: 800,
      cameraBounds: 600,
      bias: -0.0005,
      normalBias: 0.05,
      radius: 15,
    },
    hemisphere: {
      skyColor: 0xffffff,
      groundColor: 0xf5f5f5,
      intensity: 0.3,
    },
  } as const;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();

    // Set up performance monitoring only in debug mode
    if (import.meta.env.VITE_DEBUG_MODE === "true") {
      this.stats = new Stats();
      document.body.appendChild(this.stats.dom);
      this.stats.dom.style.position = "absolute";
      this.stats.dom.style.top = "1px";
      this.stats.dom.style.left = "1px";
      this.stats.showPanel(1); // 0: fps, 1: ms, 2: mb, 3+: custom
    }

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    // Set camera position
    this.camera.position.set(400, 400, 400);
    // Look at origin
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });

    // Set up renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Enable shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Handle resize
    window.addEventListener("resize", this.handleResize);


    // Seed random number generator to pass to landscape for generating
    // reproducible terrain features
    THREE.MathUtils.seededRandom(SceneManager.RANDOM_SEED);
    const rng = () => THREE.MathUtils.seededRandom();

    // Create landscape generator
    const generator = new LandscapeGenerator(
      SceneManager.TERRAIN_RESOLUTION + 1,
      SceneManager.TERRAIN_RESOLUTION + 1,
      rng,
    );

    // Create erosion model
    const erosion = new BeyerErosion({
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

    // Create landscape with injected dependencies
    this.landscape = new Landscape(
      SceneManager.TERRAIN_SIZE,
      SceneManager.TERRAIN_RESOLUTION,
      generator,
    );

    // Create simulator to manage erosion process
    this.simulator = new Simulator(this.landscape, erosion);

    this.scene.background = new THREE.Color(0xa1a2a6);
    this.scene.add(this.landscape.getMesh());

    // Setup lighting
    this.setupLighting();

    // Setup GUI
    this.guiManager = new GuiManager();
    this.guiManager.register("landscape", new LandscapeControls(this.landscape));
    this.guiManager.register("erosion", new ErosionControls(this.simulator, erosion));
  }

  private setupLighting(): void {
    const { ambient, sun, shadow, hemisphere } = this.lightingConfig;

    // Ambient light provides base illumination
    const ambientLight = new THREE.AmbientLight(
      ambient.color,
      ambient.intensity,
    );

    // Directional light simulates sunlight
    const sunLight = new THREE.DirectionalLight(sun.color, sun.intensity);
    sunLight.position.copy(sun.position);
    sunLight.castShadow = true;

    // Create a dedicated Object3D for the sun's target at the center of the terrain
    // This ensures shadows remain fixed and do not shift with camera movement
    const sunTarget = new THREE.Object3D();
    sunTarget.position.copy(sun.targetPosition);
    this.scene.add(sunTarget);
    sunLight.target = sunTarget;

    // Configure shadow camera bounds to cover the terrain
    // Large bounds help prevent shadow "swimming" artifacts
    sunLight.shadow.mapSize.width = shadow.mapSize;
    sunLight.shadow.mapSize.height = shadow.mapSize;
    sunLight.shadow.camera.near = shadow.cameraNear;
    sunLight.shadow.camera.far = shadow.cameraFar;
    sunLight.shadow.camera.left = -shadow.cameraBounds;
    sunLight.shadow.camera.right = shadow.cameraBounds;
    sunLight.shadow.camera.top = shadow.cameraBounds;
    sunLight.shadow.camera.bottom = -shadow.cameraBounds;
    sunLight.shadow.bias = shadow.bias;
    sunLight.shadow.normalBias = shadow.normalBias;
    sunLight.shadow.radius = shadow.radius;

    // Hemisphere light simulates sky and ground lighting
    const hemiLight = new THREE.HemisphereLight(
      hemisphere.skyColor,
      hemisphere.groundColor,
      hemisphere.intensity,
    );

    this.scene.add(sunLight, ambientLight, hemiLight);
  }

  start(): void {
    this.animate();
  }

  private animate = (): void => {
    this.stats?.begin();

    // Update erosion simulation
    this.simulator.update();

    this.renderer.render(this.scene, this.camera);

    this.stats?.end();

    this.animationId = requestAnimationFrame(this.animate);
  };

  private handleResize = (): void => {
    // Update camera aspect ratio and projection matrix
    const aspectRatio = window.innerWidth / window.innerHeight;
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = aspectRatio;
      this.camera.updateProjectionMatrix();
    }

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  dispose(): void {
    if (this.animationId !== null) cancelAnimationFrame(this.animationId);

    window.removeEventListener("resize", this.handleResize);

    // Dispose scene objects
    this.landscape.dispose();
    this.guiManager.dispose();
    this.renderer.dispose();
  }
}
