import {BeyerErosion} from '../erosion/BeyerErosion';
import {PBErosion} from '../erosion/PBErosion';
import type {
  IErosionModel,
  SerializableModelConfig
} from '../erosion/IErosionModel';
import * as THREE from 'three';

// Message types
type StartErosionMessage = {
  type: 'start';
  heightMap: Float32Array;
  width: number;
  height: number;
  modelConfig: SerializableModelConfig;
};

type CompleteMessage = {
  type: 'complete';
  heightMap: Float32Array;
};

type ProgressMessage = {
  type: 'progress';
  iteration: number;
  total: number;
};

// Worker message handler
self.onmessage = (e: MessageEvent<StartErosionMessage>) => {
  const {type, heightMap, width, height, modelConfig} = e.data;

  if (type === 'start') {
    // Reconstruct the randomFn for the worker context
    const paramsWithRandom = {
      ...modelConfig.params,
      randomFn: THREE.MathUtils.seededRandom
    };

    // Create erosion model based on type
    let model: IErosionModel;
    switch (modelConfig.modelType) {
      case 'beyer':
        model = new BeyerErosion(paramsWithRandom);
        break;
      case 'pb':
        model = new PBErosion(paramsWithRandom);
        break;
      default:
        throw new Error(`Unknown model type: ${modelConfig.modelType}`);
    }

    model.initialize(width, height);

    // Run erosion with progress callback (much faster than manual iteration)
    model.erode(heightMap, width, height, (iteration, total) => {
      // Send progress update to main thread
      self.postMessage({
        type: 'progress',
        iteration: iteration,
        total: total
      } as ProgressMessage);
    });

    // Apply any pending changes (for models that use change maps)
    if (model.usesChangeMap) {
      model.applyChanges(heightMap, width, height);
    }

    // Send completed heightmap back to main thread
    // Using Transferable to avoid copying the large array
    const message: CompleteMessage = {
      type: 'complete',
      heightMap,
    };
    self.postMessage(message, {transfer: [heightMap.buffer]});
  }
};
