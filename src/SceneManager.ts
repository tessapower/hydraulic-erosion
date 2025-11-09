// SceneManager.ts: Three.js scene setup and orchestration

import * as THREE from "three";
import {Landscape} from "./terrain/Landscape";
import HeightGenerator from "./terrain/HeightGenerator";
import {BeyerErosion} from "./erosion/BeyerErosion";
import {PBErosion} from "./erosion/PBErosion";
import {GuiManager} from "./gui/GuiManager";
import {LandscapeControls} from "./gui/LandscapeControls";
import {SimulatorControls} from "./gui/SimulatorControls";
import {Simulator} from "./erosion/Simulator";
import Stats from "stats.js";
import type {IErosionModel} from "./erosion/IErosionModel";
import {ShaderControls} from "./gui/ShaderControls";

/**
 * Orchestrates the Three.js scene, including terrain, lighting, camera,
 * and GUI. Handles initialization, animation loop, resizing, and cleanup.
 */
export class SceneManager {
  // Landscape settings
  private static readonly TERRAIN_SIZE: number = 256;
  private static readonly TERRAIN_RESOLUTION: number = 256;
  private static readonly RANDOM_SEED: number = 42;

  // Colors, fog, camera, lighting constants
  private static readonly BACKGROUND_COLOR: THREE.Color = new THREE.Color(0x8b8479);
  private static readonly FOG_NEAR: number = 675;
  private static readonly FOG_FAR: number = 850;
  private static readonly CAMERA_NEAR: number = -800;
  private static readonly CAMERA_FAR: number = 800;
  private static readonly CAMERA_POS: THREE.Vector3 = new THREE.Vector3(400, 400, 400);
  private static readonly CAMERA_TARGET: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private static readonly LIGHT_COLOR: THREE.Color = new THREE.Color(1.0, 1.0, 0.9);
  private static readonly LIGHT_POSITION: THREE.Vector3 = new THREE.Vector3(1, 1, 0).normalize().multiplyScalar(100);
  private static readonly LIGHT_INTENSITY: number = 1.3;
  private static readonly AMBIENT_INTENSITY: number = 0.1;

  // Camera Constants
  private static readonly FRUSTUM_SIZE: number = SceneManager.TERRAIN_SIZE * 1.2;
  private static readonly ZOOM_MIN: number = 0.2;
  private static readonly ZOOM_MAX: number = 5.0;
  // Sensitivity: smaller = slower zoom (tweak to taste)
  private static readonly ZOOM_SENSITIVITY: number = 0.001;
  private static readonly WHEEL_LINE_HEIGHT: number = 16;

  // Renderer constants
  private static readonly MAX_PIXEL_RATIO: number = 2;

  // Scene components
  private readonly canvas: HTMLCanvasElement;
  private readonly camera: THREE.OrthographicCamera;
  private readonly scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private animationId: number | null = null;
  private readonly landscape: Landscape;
  private readonly simulator: Simulator;
  private readonly guiManager: GuiManager;
  // Performance monitoring (only in debug mode)
  private stats?: Stats;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();

    // Fog
    this.scene.fog = new THREE.Fog(
      SceneManager.BACKGROUND_COLOR,
      SceneManager.FOG_NEAR,
      SceneManager.FOG_FAR,
    );

    // Set up performance monitoring only in debug mode
    if (import.meta.env.VITE_DEBUG_MODE === "true") {
      this.stats = new Stats();
      document.body.appendChild(this.stats.dom);
      this.stats.dom.style.position = "absolute";
      this.stats.dom.style.top = "1px";
      this.stats.dom.style.left = "1px";
      this.stats.showPanel(1); // 0: fps, 1: ms, 2: mb
    }

    const aspect = window.innerWidth / window.innerHeight;

    const halfH = SceneManager.FRUSTUM_SIZE / 2;
    const halfW = halfH * aspect;

    this.camera = new THREE.OrthographicCamera(
      -halfW, // left
      halfW,  // right
      halfH,  // top
      -halfH, // bottom
      SceneManager.CAMERA_NEAR,
      SceneManager.CAMERA_FAR,
    );

    this.camera.position.set(
      SceneManager.CAMERA_POS.x,
      SceneManager.CAMERA_POS.y,
      SceneManager.CAMERA_POS.z
    );
    this.camera.lookAt(SceneManager.CAMERA_TARGET);

    this.camera.zoom = 1.0;
    this.camera.updateProjectionMatrix();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });

    // Set up renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, SceneManager.MAX_PIXEL_RATIO));

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;

    // Background color
    this.scene.background = SceneManager.BACKGROUND_COLOR;

    // Handle resize
    window.addEventListener("resize", this.handleResize);

    // Handle zooming in and out with mouse wheel
    this.canvas.addEventListener("wheel", this.onWheel, {passive: false});

    // Seed random number generator to pass to landscape for generating
    // reproducible terrain features
    THREE.MathUtils.seededRandom(SceneManager.RANDOM_SEED);
    const rng = () => THREE.MathUtils.seededRandom();

    // Create landscape generator
    const generator = new HeightGenerator(
      SceneManager.TERRAIN_RESOLUTION + 1,
      SceneManager.TERRAIN_RESOLUTION + 1,
      rng,
    );

    // Create landscape
    this.landscape = new Landscape(
      SceneManager.TERRAIN_SIZE,
      SceneManager.TERRAIN_RESOLUTION,
      generator,
    );
    this.scene.add(this.landscape.getGroup());

    // Create erosion models
    const beyer = new BeyerErosion({randomFn: rng});
    const physicsBased: PBErosion = new PBErosion({randomFn: rng});

    // Create simulator to manage erosion process
    this.simulator = new Simulator(this.landscape, physicsBased);

    // Directional Light
    const directionalLight = new THREE.DirectionalLight(SceneManager.LIGHT_COLOR, SceneManager.LIGHT_INTENSITY);
    directionalLight.position.set(SceneManager.LIGHT_POSITION.x, SceneManager.LIGHT_POSITION.y, SceneManager.LIGHT_POSITION.z);
    this.scene.add(directionalLight);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(SceneManager.LIGHT_COLOR, SceneManager.AMBIENT_INTENSITY);
    this.scene.add(ambientLight);

    // Setup GUI
    this.guiManager = new GuiManager();
    this.guiManager.register("landscape",
      new LandscapeControls(this.landscape));

    this.guiManager.register("shader",
      new ShaderControls(this.landscape.getShader())
    );

    this.guiManager.register("erosion",
      new SimulatorControls(this.simulator,
        new Map<string, IErosionModel>([
          ["Physics Based", physicsBased],
          ["Beyer", beyer],
        ])
      )
    );
  }

  start(): void {
    this.animate();
  }

  dispose(): void {
    if (this.animationId !== null) cancelAnimationFrame(this.animationId);

    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("wheel", this.onWheel);

    // Dispose scene objects
    this.landscape.dispose();
    this.guiManager.dispose();
    this.renderer.dispose();
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

    const halfH = SceneManager.FRUSTUM_SIZE / 2;
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
    const delta = e.deltaMode === 1 ? e.deltaY * SceneManager.WHEEL_LINE_HEIGHT : e.deltaY;

    // Multiply zoom for smooth exponential feel
    const nextZoom = this.camera.zoom * (1 - delta * SceneManager.ZOOM_SENSITIVITY);
    this.camera.zoom = THREE.MathUtils.clamp(nextZoom, SceneManager.ZOOM_MIN, SceneManager.ZOOM_MAX);
    this.camera.updateProjectionMatrix();
  };
}
