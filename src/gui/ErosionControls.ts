// ErosionControls.ts: GUI controls for hydraulic erosion parameters

import GUI from "lil-gui";
import { Simulator } from "../erosion/Simulator";
import { PBErosion } from "../erosion/PBErosion";
import type { IGuiModule } from "./GuiManager";

/**
 * Registers erosion-related controls with the GUI manager for interactive
 * parameter adjustment.
 */
export class ErosionControls implements IGuiModule {
  private simulator: Simulator;
  private erosion: BeyerErosion;
  private startButton: any;
  private stopButton: any;

  private readonly controls = {
    iterationsPerFrame: {min: 1, max: 500, step: 1},
    iterations: {min: 1000, max: 1000000, step: 1000},
    maxPath: {min: 16, max: 128, step: 1},
    inertia: {min: 0, max: 1, step: 0.01},
    capacity: {min: 1, max: 32, step: 1},
    minSlope: {min: 0.001, max: 0.02, step: 0.001},
    erosionSpeed: {min: 0, max: 1, step: 0.01},
    depositionSpeed: {min: 0, max: 1, step: 0.01},
    evaporationSpeed: {min: 0, max: 0.1, step: 0.01},
    gravity: {min: 1, max: 32, step: 1},
    erosionRadius: {min: 1, max: 16, step: 1},
    depositionRadius: {min: 1, max: 16, step: 1},
  } as const;

  constructor(simulator: Simulator, erosion: BeyerErosion) {
    this.simulator = simulator;
    this.erosion = erosion;
  }

  setupControls(gui: GUI): void {
    const erosionFolder = gui.addFolder('Erosion Simulation');

    // Status display
    const statusObj = {
      status: '⚪ Ready',
      progress: '0 / 0 (0%)',
    };
    erosionFolder.add(statusObj, 'progress').name('Progress').listen().disable();

    // Update status in animation loop
    const updateStatus = () => {
      const isRunning = this.simulator.getIsRunning();
      const isComplete = this.simulator.isComplete();

      if (isComplete) {
        statusObj.status = '✅ Complete';
      } else if (isRunning) {
        statusObj.status = '🟢 Running';
      } else {
        statusObj.status = '⚪ Ready';
      }

      const current = this.simulator.getTotalIterations();
      const max = this.simulator.getMaxIterations();
      const percentage = this.simulator.getProgress().toFixed(1);
      statusObj.progress = `${current} / ${max} (${percentage}%)`;

      requestAnimationFrame(updateStatus);
    };
    updateStatus();

    // Animation controls
    const animationControls = {
      start: () => {
        this.simulator.start();
        this.updateButtonStates();
      },
      stop: () => {
        this.simulator.stop();
        this.updateButtonStates();
      },
      reset: () => {
        this.simulator.reset();
        this.updateButtonStates();
      },
    };

    this.startButton = erosionFolder.add(animationControls, 'start').name('▶ Start Erosion');
    this.stopButton = erosionFolder.add(animationControls, 'stop').name('⏸ Stop Erosion');
    erosionFolder.add(animationControls, 'reset').name('🔄 Reset');

    // Add CSS classes to buttons
    if (this.startButton?.$button) {
      this.startButton.$button.classList.add('erosion-start-btn');
    }
    if (this.stopButton?.$button) {
      this.stopButton.$button.classList.add('erosion-stop-btn');
    }

    // Set initial button states
    this.updateButtonStates();

    // Speed control
    const speedControl = {
      speed: 100, // Default iterations per frame
    };

    const speedController = erosionFolder
      .add(
        speedControl,
        'speed',
        this.controls.iterationsPerFrame.min,
        this.controls.iterationsPerFrame.max,
        this.controls.iterationsPerFrame.step
      )
      .name('Speed')
      .onChange((value: number) => {
        this.simulator.setIterationsPerFrame(value);
      });
    speedController.domElement.title = 'Number of droplets to simulate per frame (higher = faster erosion)';


    // Erosion parameters
    const params = erosionFolder.addFolder('Erosion Parameters');

    params
      .add(
        this.erosion.params,
        'iterations',
        this.controls.iterations.min,
        this.controls.iterations.max,
        this.controls.iterations.step
      )
      .name('Max Droplets')
      .onChange(() => {
        // Stop and reset simulation when max droplets changes
        this.simulator.stop();
        this.simulator.reset();
        this.updateButtonStates();
      }).domElement.title = 'Maximum number of water droplets to simulate';

    params
      .add(
        this.erosion.params,
        'maxPath',
        this.controls.maxPath.min,
        this.controls.maxPath.max,
        this.controls.maxPath.step
      )
      .name('Droplet Lifetime').domElement.title = 'Maximum length of' +
      ' droplet lifetime (higher = more erosion per droplet)';

    params
      .add(
        this.erosion.params,
        'inertia',
        this.controls.inertia.min,
        this.controls.inertia.max,
        this.controls.inertia.step
      )
      .name('Inertia').domElement.title = 'How much droplets maintain their direction (0 = follow slope exactly, 1 = ignore slope)';

    params
      .add(
        this.erosion.params,
        'capacity',
        this.controls.capacity.min,
        this.controls.capacity.max,
        this.controls.capacity.step
      )
      .name('Sediment Capacity').domElement.title = 'Multiplier for how much sediment a droplet can carry';

    params
      .add(
        this.erosion.params,
        'minSlope',
        this.controls.minSlope.min,
        this.controls.minSlope.max,
        this.controls.minSlope.step
      )
      .name('Min Slope').domElement.title = 'Minimum slope used in sediment capacity calculation';

    params
      .add(
        this.erosion.params,
        'erosionSpeed',
        this.controls.erosionSpeed.min,
        this.controls.erosionSpeed.max,
        this.controls.erosionSpeed.step
      )
      .name('Erosion Speed').domElement.title = 'How quickly terrain is eroded (0 = no erosion, 1 = maximum)';

    params
      .add(
        this.erosion.params,
        'depositionSpeed',
        this.controls.depositionSpeed.min,
        this.controls.depositionSpeed.max,
        this.controls.depositionSpeed.step
      )
      .name('Deposition Speed').domElement.title = 'How quickly sediment is deposited (0 = no deposition, 1 = maximum)';

    params
      .add(
        this.erosion.params,
        'evaporationSpeed',
        this.controls.evaporationSpeed.min,
        this.controls.evaporationSpeed.max,
        this.controls.evaporationSpeed.step
      )
      .name('Evaporation Speed').domElement.title = 'How quickly water evaporates from droplets (higher = shorter droplet lifetime)';

    params
      .add(
        this.erosion.params,
        'gravity',
        this.controls.gravity.min,
        this.controls.gravity.max,
        this.controls.gravity.step
      )
      .name('Gravity').domElement.title = 'Gravity acceleration factor affecting droplet velocity';

    params
      .add(
        this.erosion.params,
        'erosionRadius',
        this.controls.erosionRadius.min,
        this.controls.erosionRadius.max,
        this.controls.erosionRadius.step
      )
      .name('Erosion Radius').domElement.title = 'Radius of terrain affected when eroding (larger = smoother erosion)';

    params
      .add(
        this.erosion.params,
        'depositionRadius',
        this.controls.depositionRadius.min,
        this.controls.depositionRadius.max,
        this.controls.depositionRadius.step
      )
      .name('Deposition Radius').domElement.title = 'Radius of terrain affected when depositing sediment (larger = smoother deposits)';
  }

  private updateButtonStates(): void {
    const isRunning = this.simulator.getIsRunning();
    const isComplete = this.simulator.isComplete();

    // Update Start button - CSS handles styling via :disabled pseudo-class
    if (this.startButton) {
      if (isRunning || isComplete) {
        this.startButton.disable();
      } else {
        this.startButton.enable();
      }
    }

    // Update Stop button - CSS handles styling via :disabled pseudo-class
    if (this.stopButton) {
      if (isRunning) {
        this.stopButton.enable();
      } else {
        this.stopButton.disable();
      }
    }
  }

  getModuleName(): string {
    return 'Erosion';
  }
}
