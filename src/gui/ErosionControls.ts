// ErosionControls.ts: GUI controls for hydraulic erosion parameters

import GUI from "lil-gui";
import { Simulator } from '../erosion/Simulator';
import { BeyerErosion } from '../erosion/BeyerErosion';
import type { IGuiModule } from './GuiManager';

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
    iterationsPerFrame: {min: 1, max: 100, step: 1},
    iterations: {min: 1000, max: 1000000, step: 1000},
    maxPath: {min: 16, max: 128, step: 1},
    inertia: {min: 0, max: 1, step: 0.01},
    capacity: {min: 1, max: 20, step: 0.5},
    minSlope: {min: 0.001, max: 0.02, step: 0.001},
    erosionSpeed: {min: 0, max: 1, step: 0.01},
    depositionSpeed: {min: 0, max: 1, step: 0.01},
    evaporationSpeed: {min: 0, max: 0.1, step: 0.01},
    gravity: {min: 1, max: 20, step: 0.5},
    erosionRadius: {min: 1, max: 10, step: 0.5},
    depositionRadius: {min: 1, max: 10, step: 0.5},
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
      speed: 5, // Default iterations per frame
    };

    erosionFolder
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

    // Erosion parameters
    const params = erosionFolder.addFolder('Parameters');

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
        // If erosion is complete, reset the completion state by updating button states
        this.updateButtonStates();
      });

    params
      .add(
        this.erosion.params,
        'maxPath',
        this.controls.maxPath.min,
        this.controls.maxPath.max,
        this.controls.maxPath.step
      )
      .name('Max Path Length');

    params
      .add(
        this.erosion.params,
        'inertia',
        this.controls.inertia.min,
        this.controls.inertia.max,
        this.controls.inertia.step
      )
      .name('Inertia');

    params
      .add(
        this.erosion.params,
        'capacity',
        this.controls.capacity.min,
        this.controls.capacity.max,
        this.controls.capacity.step
      )
      .name('Sediment Capacity');

    params
      .add(
        this.erosion.params,
        'minSlope',
        this.controls.minSlope.min,
        this.controls.minSlope.max,
        this.controls.minSlope.step
      )
      .name('Min Slope');

    params
      .add(
        this.erosion.params,
        'erosionSpeed',
        this.controls.erosionSpeed.min,
        this.controls.erosionSpeed.max,
        this.controls.erosionSpeed.step
      )
      .name('Erosion Speed');

    params
      .add(
        this.erosion.params,
        'depositionSpeed',
        this.controls.depositionSpeed.min,
        this.controls.depositionSpeed.max,
        this.controls.depositionSpeed.step
      )
      .name('Deposition Speed');

    params
      .add(
        this.erosion.params,
        'evaporationSpeed',
        this.controls.evaporationSpeed.min,
        this.controls.evaporationSpeed.max,
        this.controls.evaporationSpeed.step
      )
      .name('Evaporation Speed');

    params
      .add(
        this.erosion.params,
        'gravity',
        this.controls.gravity.min,
        this.controls.gravity.max,
        this.controls.gravity.step
      )
      .name('Gravity');

    params
      .add(
        this.erosion.params,
        'erosionRadius',
        this.controls.erosionRadius.min,
        this.controls.erosionRadius.max,
        this.controls.erosionRadius.step
      )
      .name('Erosion Radius');

    params
      .add(
        this.erosion.params,
        'depositionRadius',
        this.controls.depositionRadius.min,
        this.controls.depositionRadius.max,
        this.controls.depositionRadius.step
      )
      .name('Deposition Radius');
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
