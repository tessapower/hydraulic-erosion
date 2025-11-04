// SceneManager.ts: Three.js scene setup and orchestration

import * as THREE from "three";
import { Landscape } from "./terrain/Landscape";
import LandscapeGenerator from "./terrain/LandscapeGenerator";
import { BeyerErosion } from "./erosion/BeyerErosion";
import { GuiManager } from "./gui/GuiManager";
import { LandscapeControls } from "./gui/LandscapeControls";
import { ErosionControls } from "./gui/ErosionControls";
import { ShaderControls } from "./gui/ShaderControls";
import { Simulator } from "./erosion/Simulator";
import Stats from "stats.js";

/**
 * Orchestrates the Three.js scene, including terrain, lighting, camera,
 * and GUI. Handles initialization, animation loop, resizing, and cleanup.
 */
export class SceneManager {
  private static readonly TERRAIN_SIZE = 256;
  private static readonly TERRAIN_RESOLUTION = 256;
  private static readonly RANDOM_SEED = 42;

  private readonly canvas: HTMLCanvasElement;
  private readonly scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private animationId: number | null = null;
  private frustumSize: number = SceneManager.TERRAIN_SIZE * 1.2;

  private readonly landscape: Landscape;
  private readonly simulator: Simulator;
  private readonly guiManager: GuiManager;

  // Camera
  private readonly camera: THREE.OrthographicCamera;
  private readonly target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Performance monitoring (only in debug mode)
  private stats?: Stats;

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

    const aspect = window.innerWidth / window.innerHeight;

    // How much of the terrain we want to fit in view (pad a bit beyond size)
    this.frustumSize = SceneManager.TERRAIN_SIZE * 1.2;

    const halfH = this.frustumSize / 2;
    const halfW = halfH * aspect;

    this.camera = new THREE.OrthographicCamera(
      -halfW,  // left
      halfW,  // right
      halfH,  // top
      -halfH,  // bottom
      -800,    // near
      800     // far
    );

// Set camera position and target similar to before
    this.camera.position.set(400, 400, 400);
    this.camera.lookAt(this.target);

    this.camera.zoom = 1.0;
    this.camera.updateProjectionMatrix();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });

    // Set up renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Disable shadows, we handle lighting in the shader
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.NoToneMapping

    // Handle resize
    window.addEventListener("resize", this.handleResize);

    // Handle zooming in and out with mouse wheel
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });

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
      iterations: 200000,
      inertia: 0.05,
      capacity: 6,
      minSlope: 0.01,
      erosionSpeed: 0.3,
      depositionSpeed: 0.3,
      evaporationSpeed: 0.001,
      gravity: 4,
      maxPath: 24,
      erosionRadius: 4,
      depositionRadius: 4,
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

    // Setup GUI
    this.guiManager = new GuiManager();
    this.guiManager.register("shader", new ShaderControls(this.landscape.getShader()));
    this.guiManager.register("landscape", new LandscapeControls(this.landscape));
    this.guiManager.register("erosion", new ErosionControls(this.simulator, erosion));
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
    const aspect = window.innerWidth / window.innerHeight;

    const halfH = this.frustumSize / 2;
    const halfW = halfH * aspect;

    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  // Normalize wheel delta across browsers and zoom the active camera
  private onWheel = (e: WheelEvent): void => {
    // Prevent page scroll
    e.preventDefault();

    // Normalize delta (DOM_DELTA_LINE ≈ lines, DOM_DELTA_PIXEL ≈ pixels)
    const lineHeight = 16;
    const delta = e.deltaMode === 1 ? e.deltaY * lineHeight : e.deltaY;

    // Sensitivity: smaller = slower zoom (tweak to taste)
    const sensitivity = 0.0015;

    // Multiply zoom for smooth exponential feel
    const nextZoom = this.camera.zoom * (1 - delta * sensitivity);
    this.camera.zoom = THREE.MathUtils.clamp(nextZoom, 0.2, 5.0);
    this.camera.updateProjectionMatrix();
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
