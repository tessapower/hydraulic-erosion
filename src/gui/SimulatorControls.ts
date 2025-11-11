// ErosionControls.ts: GUI controls for hydraulic erosion parameters

import GUI, {Controller, FunctionController} from "lil-gui";
import {Simulator, type State} from "../erosion/Simulator";
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
  private static readonly ITERATIONS_STEP = 100;
  private readonly simulator: Simulator;
  private erosionFolder: GUI = null!;
  // Folder for model-specific parameters, which will be dynamically
  // Buttons for controlling the simulation
  private startButton: Controller = null!;
  private pauseButton: Controller = null!;
  private resetButton: Controller = null!;
  private batchButton: Controller = null!;
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
    this.erosionFolder.add(this.statusObj, 'status')
      .name('Status')
      .listen().disable();

    // Progress display
    // This will show the current progress of the simulation
    this.erosionFolder.add(this.statusObj, 'progress')
      .name('Progress')
      .listen().disable();

    this.updateStatus();

    // Create buttons for controlling the simulation
    this.startButton = this.erosionFolder.add(this.animationControls, 'start')
      .name('▶ Start Erosion');

    // Only show batch button in debug mode
    if (import.meta.env.VITE_DEBUG_MODE === "true") {
      this.batchButton = this.erosionFolder.add(
        {
          runBatch: () => {
            this.simulator.startBatch();
            this.updateButtonStates();
          }
        },
        'runBatch'
      ).name('⏩ Run Batch Mode');
      this.batchButton.domElement.title = "Run the entire erosion process in" +
        " one go, without animating updates. Can be faster for large" +
        " simulations but will not show progress until completion.";
    }

    this.pauseButton = this.erosionFolder.add(this.animationControls, 'pause')
      .name('⏸ Pause Erosion');
    this.resetButton = this.erosionFolder.add(this.animationControls, 'reset')
      .name('🔄 Reset');

    // Add CSS classes to buttons
    (this.startButton as FunctionController)?.$button.classList.add('erosion-start-btn');
    if (this.batchButton) {
      (this.batchButton as FunctionController)?.$button.classList.add('erosion-batch-btn');
    }
    (this.pauseButton as FunctionController)?.$button.classList.add('erosion-pause-btn');

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
      this.iterationsControl.disable();
      this.modelSelector.disable();
      this.updateButtonStates();
    });

    // Set up a callback to update button states when the simulation completes
    this.simulator.registerOnCompleteCallback(() => {
      // Enable adjusting the parameters when the simulation is complete
      this.iterationsControl.enable();
      this.modelSelector.enable();
      this.updateButtonStates();
    });

    this.simulator.registerOnResetCallback(() => {
      // Re-enable the parameters when the simulation is reset
      this.iterationsControl.enable();
      this.modelSelector.enable();
      this.updateButtonStates();
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
    const state: State = this.simulator.getState();

    switch (state) {
      case "READY": {
        this.statusObj.status = '⚪ Ready';
        break;
      }
      case "RUNNING": {
        this.statusObj.status = '🟢 Running';
        break;
      }
      case "COMPLETE": {
        this.statusObj.status = '✅ Complete';
        break;
      }
      case "PAUSED": {
        this.statusObj.status = '🟡 Paused';
        break;
      }
    }

    const current = this.simulator.getIterationsCompleted();
    const total = this.simulator.getTotalIterations();
    const percentage = this.simulator.getProgress().toFixed(1);
    this.statusObj.progress = `${current} / ${total} (${percentage}%)`;

    requestAnimationFrame(this.updateStatus);
  };

  private setupModelParams(): void {
    const model: IErosionModel = this.simulator.getErosionModel();

    // Check if model implements IErosionControls
    if (this.implementsErosionControls(model)) {
      this.erosionModelParams = this.erosionFolder.addFolder(model.getControlsFolderName());

      // Let the model setup its own controls
      (model as IErosionControls).setupControls(this.erosionModelParams, this.simulator);
    }
  }

  private implementsErosionControls(obj: any): obj is IErosionControls {
    return (
      typeof obj.setupControls === 'function' &&
      typeof obj.getControlsFolderName === 'function'
    );
  }

  private updateButtonStates(): void {
    const state: State = this.simulator.getState();

    switch (state) {
      case "READY": {
        this.startButton.enable();
        this.pauseButton.disable();
        this.resetButton.disable();
        if (this.batchButton) this.batchButton.enable();
        break;
      }
      case "PAUSED": {
        this.startButton.enable();
        this.pauseButton.disable();
        this.resetButton.enable();
        if (this.batchButton) this.batchButton.disable();
        break;
      }
      case "RUNNING": {
        this.startButton.disable();
        this.pauseButton.enable();
        this.resetButton.disable();
        if (this.batchButton) this.batchButton.disable();
        break;
      }
      case "COMPLETE": {
        this.startButton.disable();
        this.pauseButton.disable();
        this.resetButton.enable();
        if (this.batchButton) this.batchButton.enable();
        break;
      }
    }
  }
}
