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
import {ComparisonControls} from "./gui/ComparisonControls";
import {MobileDetector} from "./utils/MobileDetector";

/**
 * Orchestrates the Three.js scene, including terrain, lighting, camera,
 * and GUI. Handles initialization, animation loop, resizing, and cleanup.
 */
export class SceneManager {
  // Landscape settings
  private static readonly TERRAIN_SIZE: number = 256;
  private static readonly TERRAIN_RESOLUTION: number = 256;

  // Colors, fog, camera, lighting constants
  private static readonly BACKGROUND_COLOR: THREE.Color = new THREE.Color(0x8b8479);
  private static readonly FOG_NEAR: number = 675;
  private static readonly FOG_FAR: number = 850;
  private static readonly CAMERA_NEAR: number = -800;
  private static readonly CAMERA_FAR: number = 900;
  private static readonly CAMERA_POS: THREE.Vector3 = new THREE.Vector3(400, 400, 400);
  private static readonly CAMERA_TARGET: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private static readonly LIGHT_COLOR: THREE.Color = new THREE.Color(1.0, 1.0, 0.9);
  private static readonly LIGHT_POSITION: THREE.Vector3 = new THREE.Vector3(1, 1, 0).normalize().multiplyScalar(100);
  private static readonly LIGHT_INTENSITY: number = 1.3;
  private static readonly AMBIENT_INTENSITY: number = 0.5;

  // Camera Constants
  private static readonly FRUSTUM_SIZE: number = SceneManager.TERRAIN_SIZE * 1.2;
  private static readonly ZOOM_MIN: number = 0.2;
  private static readonly ZOOM_MAX: number = 5.0;
  // Sensitivity: smaller = slower zoom
  private static readonly ZOOM_SENSITIVITY: number = 0.001;
  private static readonly WHEEL_LINE_HEIGHT: number = 16;

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

  private readonly comparisonControls: ComparisonControls;
  private readonly landscapeControls: LandscapeControls;

  // Touch zoom support
  private touchStartDistance: number = 0;
  private touchStartZoom: number = 1;

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

    // Use canvas client dimensions for accurate aspect ratio
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;

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

    // Set up renderer to match canvas dimensions
    // Use false for updateStyle to prevent renderer from modifying canvas CSS
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.renderer.setPixelRatio(MobileDetector.getRecommendedPixelRatio());

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;

    // Background color
    this.scene.background = SceneManager.BACKGROUND_COLOR;

    // Handle resize
    window.addEventListener("resize", this.handleResize);

    // Handle zooming in and out with mouse wheel
    this.canvas.addEventListener("wheel", this.onWheel, {passive: false});

    // Handle touch zoom for mobile devices
    if (MobileDetector.hasTouch()) {
      this.canvas.addEventListener("touchstart", this.onTouchStart, {passive: true});
      this.canvas.addEventListener("touchmove", this.onTouchMove, {passive: false});
      this.canvas.addEventListener("touchend", this.onTouchEnd, {passive: true});
    }

    // Create landscape generator
    const generator = new HeightGenerator(
      SceneManager.TERRAIN_RESOLUTION + 1,
      SceneManager.TERRAIN_RESOLUTION + 1,
    );

    // Create landscape
    this.landscape = new Landscape(
      SceneManager.TERRAIN_SIZE,
      SceneManager.TERRAIN_RESOLUTION,
      generator,
    );
    this.scene.add(this.landscape.getGroup());

    // Create erosion models
    const beyer = new BeyerErosion();
    const physicsBased: PBErosion = new PBErosion();

    // Create simulator to manage erosion process with mobile-optimized time budget
    const timeBudget = MobileDetector.getTimeBudget();
    this.simulator = new Simulator(this.landscape, physicsBased, timeBudget);

    // Create comparison controls (no GUI needed)
    this.comparisonControls = new ComparisonControls(this.landscape, this.simulator);
    this.comparisonControls.initialize();

    // Directional Light
    const directionalLight = new THREE.DirectionalLight(SceneManager.LIGHT_COLOR, SceneManager.LIGHT_INTENSITY);
    directionalLight.position.set(SceneManager.LIGHT_POSITION.x, SceneManager.LIGHT_POSITION.y, SceneManager.LIGHT_POSITION.z);
    this.scene.add(directionalLight);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(SceneManager.LIGHT_COLOR, SceneManager.AMBIENT_INTENSITY);
    this.scene.add(ambientLight);

    // Setup GUI
    this.guiManager = new GuiManager();

    this.landscapeControls = new LandscapeControls(this.landscape);
    this.guiManager.register("landscape", this.landscapeControls);

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

    // After setting up the simulator controls, add callbacks to show/hide hint
    this.simulator.registerOnStartCallback(() => {
      this.comparisonControls.updateVisibility();
      this.landscapeControls.enable(false);
    });

    this.simulator.registerOnPauseCallback(() => {
      this.comparisonControls.updateVisibility();
    });

    this.simulator.registerOnResetCallback(() => {
      this.comparisonControls.updateVisibility();
      this.landscapeControls.enable(true);
    });

    this.simulator.registerOnCompleteCallback(() => {
      this.comparisonControls.updateVisibility();
    });
  }

  start(): void {
    this.animate();
  }

  onResize(): void {
    this.handleResize();
  }

  dispose(): void {
    if (this.animationId !== null) cancelAnimationFrame(this.animationId);

    window.removeEventListener("resize", this.handleResize);
    this.canvas.removeEventListener("wheel", this.onWheel);

    if (MobileDetector.hasTouch()) {
      this.canvas.removeEventListener("touchstart", this.onTouchStart);
      this.canvas.removeEventListener("touchmove", this.onTouchMove);
      this.canvas.removeEventListener("touchend", this.onTouchEnd);
    }

    // Dispose scene objects
    this.landscape.dispose();
    this.guiManager.dispose();
    this.comparisonControls.dispose();
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
    // Use canvas client dimensions for accurate aspect ratio
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;

    const halfH = SceneManager.FRUSTUM_SIZE / 2;
    const halfW = halfH * aspect;

    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();

    // Use false for updateStyle to prevent renderer from modifying canvas CSS
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
  };

  // Normalize wheel delta across browsers and zoom the active camera
  private onWheel = (e: WheelEvent): void => {
    // Prevent page scroll
    e.preventDefault();

    // Normalize delta (DOM_DELTA_LINE ≈ lines, DOM_DELTA_PIXEL ≈ pixels)
    const delta: number = e.deltaMode === 1 ? e.deltaY * SceneManager.WHEEL_LINE_HEIGHT : e.deltaY;

    // Multiply zoom for smooth exponential feel
    const nextZoom: number = this.camera.zoom * (1 - delta * SceneManager.ZOOM_SENSITIVITY);
    this.camera.zoom = THREE.MathUtils.clamp(nextZoom, SceneManager.ZOOM_MIN, SceneManager.ZOOM_MAX);
    this.camera.updateProjectionMatrix();
  };

  // Calculate distance between two touch points
  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Handle touch start for pinch-to-zoom
  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 2) {
      this.touchStartDistance = this.getTouchDistance(e.touches);
      this.touchStartZoom = this.camera.zoom;
    }
  };

  // Handle touch move for pinch-to-zoom
  private onTouchMove = (e: TouchEvent): void => {
    if (e.touches.length === 2) {
      e.preventDefault(); // Prevent page zoom

      const currentDistance = this.getTouchDistance(e.touches);
      const scale = currentDistance / this.touchStartDistance;

      const nextZoom = this.touchStartZoom * scale;
      this.camera.zoom = THREE.MathUtils.clamp(nextZoom, SceneManager.ZOOM_MIN, SceneManager.ZOOM_MAX);
      this.camera.updateProjectionMatrix();
    }
  };

  // Handle touch end
  private onTouchEnd = (e: TouchEvent): void => {
    if (e.touches.length < 2) {
      this.touchStartDistance = 0;
    }
  };
}

