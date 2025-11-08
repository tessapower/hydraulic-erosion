// ErosionControls.ts: GUI controls for hydraulic erosion parameters

import GUI, {Controller, FunctionController} from "lil-gui";
import {Simulator} from "../erosion/Simulator";
import type {IGuiModule} from "./GuiManager";
import type {IErosionModel} from "../erosion/IErosionModel";
import type {IErosionControls} from "./IErosionControls";

/**
 * Registers erosion-related controls with the GUI manager for interactive
 * parameter adjustment.
 */
export class SimulatorControls implements IGuiModule {
  private static readonly MIN_ITERATIONS = 1000;
  private static readonly MAX_ITERATIONS = 1_000_000;
  private static readonly ITERATIONS_STEP = 1000;
  private readonly simulator: Simulator;
  private erosionFolder: GUI = null!;
  // Folder for model-specific parameters, which will be dynamically
  // Buttons for controlling the simulation
  private startButton: Controller = null!;
  private pauseButton: Controller = null!;
  private resetButton: Controller = null!;
  // References to controls that will be dynamically enabled/disabled
  // based on simulation state
  private iterationsControl: Controller = null!;
  private modelSelector: Controller = null!

  // generated based on the selected model
  private erosionModelParams?: GUI;
  private modelsRegistry: Map<string, IErosionModel>;
  // Animation controls for starting, stopping, and resetting the simulation
  private readonly animationControls = {
    start: () => {
      this.simulator.start();
      this.updateButtonStates();
    },
    pause: () => {
      this.simulator.pause();
      this.updateButtonStates();
    },
    reset: () => {
      this.simulator.reset();
      this.updateButtonStates();
    },
  };
  // Status display object for showing progress and status in the GUI
  private readonly statusObj = {
    status: '⚪ Ready',
    progress: '0 / 0 (0%)',
  };

  constructor(simulator: Simulator, models: Map<string, IErosionModel>) {
    this.simulator = simulator;
    this.modelsRegistry = models;
  }

  registerParent(parentGui: GUI): void {
    this.erosionFolder = parentGui.addFolder(this.getModuleName());

    // Status display
    this.erosionFolder.add(this.statusObj, 'progress')
      .name('Progress')
      .listen().disable();
    
    this.updateStatus();

    // Create buttons for controlling the simulation
    this.startButton = this.erosionFolder.add(this.animationControls, 'start')
      .name('▶ Start Erosion');
    this.pauseButton = this.erosionFolder.add(this.animationControls, 'pause')
      .name('⏸ Pause Erosion');
    this.resetButton = this.erosionFolder.add(this.animationControls, 'reset')
      .name('🔄 Reset');

    // Add CSS classes to buttons
    (this.startButton as FunctionController)?.$button.classList.add('erosion-start-btn');
    (this.pauseButton as FunctionController)?.$button.classList.add('erosion-stop-btn');

    // Set initial button states
    this.updateButtonStates();

    // Max iterations control (common to all models)
    const maxIterations = {
      value: this.simulator.getTotalIterations(),
    };

    this.iterationsControl = this.erosionFolder
      .add(maxIterations, 'value',
        SimulatorControls.MIN_ITERATIONS,
        SimulatorControls.MAX_ITERATIONS,
        SimulatorControls.ITERATIONS_STEP)
      .name('# Iterations')
      .onFinishChange((value: number) => {
        this.simulator.getErosionModel().setIterations(value);
        this.simulator.pause();
        this.simulator.reset();
        this.updateButtonStates();
      });

    this.iterationsControl.domElement.title = 'Maximum number of iterations to simulate';

    this.simulator.registerOnStartCallback(() => {
      // Disable adjusting the parameters when the simulation is running
      this.iterationsControl.enable(false);
      this.modelSelector.enable(false);
    });

    // Set up a callback to update button states when the simulation completes
    this.simulator.registerOnCompleteCallback(() => {
      // Enable adjusting the parameters when the simulation is complete
      this.iterationsControl.enable();
      this.modelSelector.enable();
    });

    this.simulator.registerOnResetCallback(() => {
      // Re-enable the parameters when the simulation is reset
      this.iterationsControl.enable();
      this.modelSelector.enable();
    });

    this.setupModelSelector();
    this.setupModelParams();
  }

  getModuleName(): string {
    return 'Erosion';
  }

  private setupModelSelector(): void {
    const modelNames = Array.from(this.modelsRegistry.keys());
    const currentModel = this.simulator.getErosionModel();

    const selector = {
      model: currentModel.getName(),
    };

    this.modelSelector = this.erosionFolder
      .add(selector, 'model', modelNames)
      .name('Erosion Model')
      .onFinishChange((modelName: string) => {
        const newModel = this.modelsRegistry.get(modelName);
        if (newModel) {
          this.simulator.setErosionModel(newModel);

          // Rebuild model-specific controls
          if (this.erosionModelParams) {
            this.erosionModelParams.destroy();
            this.erosionModelParams = undefined;
          }

          this.setupModelParams();
        }
      });

    this.modelSelector.domElement.title = 'Select the erosion model to use for the simulation';
  }

  private readonly updateStatus = (): void => {
    const isRunning = this.simulator.getIsRunning();
    const isComplete = this.simulator.isComplete();

    if (isComplete) {
      this.statusObj.status = '✅ Complete';
    } else if (isRunning) {
      this.statusObj.status = '🟢 Running';
    } else {
      this.statusObj.status = '⚪ Ready';
    }

    const current = this.simulator.getIterationsCompleted();
    const total = this.simulator.getTotalIterations();
    const percentage = this.simulator.getProgress().toFixed(1);
    this.statusObj.progress = `${current} / ${total} (${percentage}%)`;

    requestAnimationFrame(this.updateStatus);
  };

  private setupModelParams(): void {
    const model = this.simulator.getErosionModel();

    // Check if model implements IErosionControls
    if (this.implementsErosionControls(model)) {
      this.erosionModelParams = this.erosionFolder.addFolder(model.getControlsFolderName());

      // Let the model setup its own controls
      (model as IErosionControls).setupControls(this.erosionModelParams, this.simulator,
        () => {
          // Callback when parameters change
          this.updateButtonStates();
        });
    }
  }

  private implementsErosionControls(obj: any): obj is IErosionControls {
    return (
      typeof obj.setupControls === 'function' &&
      typeof obj.getControlsFolderName === 'function'
    );
  }

  private updateButtonStates(): void {
    const isRunning = this.simulator.getIsRunning();
    const isComplete = this.simulator.isComplete();

    if (isComplete) {
      this.startButton.disable();
      this.pauseButton.disable();
      // Only enable reset when complete
      this.resetButton.enable();
    } else if (isRunning && !isComplete) {
      this.startButton.disable();
      this.pauseButton.enable();
      this.resetButton.enable();
    } else {
      this.startButton.enable();
      this.pauseButton.disable();
      if (this.simulator.getIterationsCompleted() === 0) {
        this.resetButton.disable();
      } else {
        this.resetButton.enable();
      }
    }
  }
}
