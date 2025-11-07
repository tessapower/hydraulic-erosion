// SceneManager.ts: Three.js scene setup and orchestration

import * as THREE from "three";
import {Landscape} from "./terrain/Landscape";
import LandscapeGenerator from "./terrain/LandscapeGenerator";
import {BeyerErosion} from "./erosion/BeyerErosion";
import {PBErosion} from "./erosion/PBErosion";
import {GuiManager} from "./gui/GuiManager";
import {LandscapeControls} from "./gui/LandscapeControls";
import {ErosionControls} from "./gui/ErosionControls";
import {ShaderControls} from "./gui/ShaderControls";
import {Simulator} from "./erosion/Simulator";
import Stats from "stats.js";
import type {IErosionModel} from "./erosion/IErosionModel";

/**
 * Orchestrates the Three.js scene, including terrain, lighting, camera,
 * and GUI. Handles initialization, animation loop, resizing, and cleanup.
 */
export class SceneManager {
  // Landscape settings
  private static readonly TERRAIN_SIZE: number = 256;
  private static readonly TERRAIN_RESOLUTION: number = 256;
  private static readonly RANDOM_SEED: number = 42;

  // Colors and fog settings
  private static readonly BACKGROUND_COLOR: THREE.Color = new THREE.Color(0x8b8479);
  private static readonly FOG_NEAR: number = 675;
  private static readonly FOG_FAR: number = 850;
  private static readonly CAMERA_NEAR: number = -800;
  private static readonly CAMERA_FAR: number = 800;
  private static readonly CAMERA_POS: THREE.Vector3 = new THREE.Vector3(400, 400, 400);
  private static readonly CAMERA_TARGET: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

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
      this.stats.showPanel(1); // 0: fps, 1: ms, 2: mb, 3+: custom
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
    // Disable shadows, we handle lighting in the shader
    this.renderer.shadowMap.enabled = false;
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
    const generator = new LandscapeGenerator(
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

    // Create erosion models
    const beyer = new BeyerErosion({randomFn: rng});
    const physicsBased: PBErosion = new PBErosion({randomFn: rng});

    // Create simulator to manage erosion process
    this.simulator = new Simulator(this.landscape, physicsBased);

    this.scene.add(this.landscape.getMesh());

    // Setup GUI
    this.guiManager = new GuiManager();
    this.guiManager.register("shader",
      new ShaderControls(this.landscape.getShader())
    );

    this.guiManager.register("landscape",
      new LandscapeControls(this.landscape));

    this.guiManager.register("erosion",
      new ErosionControls(this.simulator,
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
