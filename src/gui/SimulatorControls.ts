// ErosionControls.ts: GUI controls for hydraulic erosion parameters

import GUI from "lil-gui";
import {Simulator} from "../erosion/Simulator";
import type {IGuiModule} from "./GuiManager";
import type {IErosionModel} from "../erosion/IErosionModel";
import type {IErosionControls} from "./IErosionControls";

/**
 * Registers erosion-related controls with the GUI manager for interactive
 * parameter adjustment.
 */
export class SimulatorControls implements IGuiModule {
  private simulator: Simulator;
  private startButton: any;
  private stopButton: any;
  private modelFolder?: GUI;
  private modelsRegistry: Map<string, IErosionModel>;

  constructor(simulator: Simulator, models: Map<string, IErosionModel>) {
    this.simulator = simulator;
    this.modelsRegistry = models;
  }

  registerParent(parentGui: GUI): void {
    const erosionFolder = gui.addFolder('Erosion Simulation');

    // Model selection dropdown
    this.setupModelSelector(erosionFolder);

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

      const current = this.simulator.getIterationsCompleted();
      const total = this.simulator.getTotalIterations();
      const percentage = this.simulator.getProgress().toFixed(1);
      statusObj.progress = `${current} / ${total} (${percentage}%)`;

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

    // Max iterations control (common to all models)
    const maxIterations = {
      value: this.simulator.getTotalIterations(),
    };

    erosionFolder
      .add(maxIterations, 'value', 1000, 1000000, 1000)
      .name('# Iterations')
      .onFinishChange((value: number) => {
        this.simulator.getErosionModel().setIterations(value);
        this.simulator.stop();
        this.simulator.reset();
        this.updateButtonStates();
      }).domElement.title = 'Maximum number of iterations to simulate';

    // Setup model-specific controls
    this.setupModelControls(erosionFolder);
    // Set up a callback to update button states when the simulation completes
    this.simulator.registerOnCompleteCallback(() => {
      this.updateButtonStates();
    });

  }

  getModuleName(): string {
    return 'Erosion';
  }

  private setupModelSelector(folder: GUI): void {
    const modelNames = Array.from(this.modelsRegistry.keys());
    const currentModel = this.simulator.getErosionModel();

    const selector = {
      model: currentModel.getName(),
    };

    folder
      .add(selector, 'model', modelNames)
      .name('Erosion Model')
      .onFinishChange((modelName: string) => {
        const newModel = this.modelsRegistry.get(modelName);
        if (newModel) {
          this.simulator.setErosionModel(newModel);

          // Rebuild model-specific controls
          if (this.modelFolder) {
            this.modelFolder.destroy();
            this.modelFolder = undefined;
          }
          this.setupModelControls(folder);
        }
      });
  }

  private setupModelControls(parentFolder: GUI): void {
    const model = this.simulator.getErosionModel();

    // Check if model implements IErosionControls
    if (this.implementsErosionControls(model)) {
      this.modelFolder = parentFolder.addFolder(model.getControlsFolderName());

      // Let the model setup its own controls
      (model as IErosionControls).setupControls(this.modelFolder, () => {
        // Callback when parameters change
        this.simulator.stop();
        this.simulator.reset();
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

    if (this.startButton) {
      if (isRunning || isComplete) {
        this.startButton.disable();
      } else {
        this.startButton.enable();
      }
    }

    if (this.stopButton) {
      if (isRunning) {
        this.stopButton.enable();
      } else {
        this.stopButton.disable();
      }
    }
  }
}
