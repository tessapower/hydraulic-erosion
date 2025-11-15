# Hydraulic Erosion

A real-time, interactive 3D terrain erosion simulator built with Three.js,
WebGL, and TypeScript. This project provides an easy way to compare different
hydraulic erosion algorithms and their effects on procedurally generated
terrain.

[View Live Demo!](https://tessapower.xyz/hydraulic-erosion)

![Hydraulic Erosion Demo](./docs/erosion.gif)

## Features

- **Multiple Erosion Algorithms**: Compare different approaches to hydraulic
  erosion simulation.
- **Interactive Controls**: Fine-tune erosion parameters and terrain generation
  in real-time via GUI.
- **Real-time 3D Visualization**: Interactive camera controls and smooth
  animation with Three.js.
- **Procedural Terrain Generation**: Simplex noise-based terrain with
  customizable parameters.
- **Mobile Support**: Responsive design with touch controls optimized for mobile
  devices.
- **Extensible Architecture**: Easy to add new erosion algorithms through the
  `IErosionModel` interface.

## Tech Stack

- **[Three.js](https://threejs.org/)**: 3D rendering engine
- **[TypeScript](https://www.typescriptlang.org/)**: Type-safe JavaScript
- **[Vite](https://vitejs.dev/)**: Fast build tool and dev server
- **[lil-gui](https://lil-gui.georgealways.com/)**: Lightweight GUI library
- **[simplex-noise](https://github.com/jwagner/simplex-noise.js)**: Procedural
  terrain generation
- **[Stats.js](https://github.com/mrdoob/stats.js/)**: Performance monitoring

## Installation

### Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn

### Setup

1. Clone the repository:

```bash
git clone https://github.com/tessapower/hydraulic-erosion.git
cd hydraulic-erosion
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173/hydraulic-erosion`
   to see the application in action.

## Usage

### Controls

- **Mouse Wheel**: Zoom in/out.
- **GUI Panel**: Adjust erosion parameters, terrain settings, and visual
  options.

### GUI Panels

- **Landscape Controls**:
    - Regenerate terrain with different seeds.
    - Adjust terrain size and resolution.
    - Configure noise parameters.
- **Erosion Controls**:
    - Select erosion algorithm.
    - Adjust algorithm-specific parameters.
    - Run erosion simulation step-by-step or in batch mode.
    - Reset terrain to original state
- **Shader Controls**:
    - Modify terrain colors (flat vs steep areas)
    - Configure steepness threshold for coloring
- **Comparison Controls**:
    - Hold right mouse button (or tap and hold on mobile) to toggle between
      original and eroded terrain

## Project Structure

```
hydraulic-erosion/
├── src/
│   ├── main.ts                   # Application entry point
│   ├── SceneManager.ts           # Three.js scene orchestration
│   ├── style.css                 # Global styles
│   ├── erosion/
│   │   ├── BeyerErosion.ts       # Beyer's hydraulic erosion implementation
│   │   ├── IErosionModel.ts      # Erosion algorithm interface
│   │   ├── PBErosion.ts          # Physics-based erosion implementation
│   │   └── Simulator.ts          # Erosion simulation coordinator
│   ├── gui/
│   │   ├── ComparisonControls.ts # Before/after comparison controls
│   │   ├── GuiManager.ts         # lil-gui integration
│   │   ├── IErosionControls.ts   # Erosion controls interface
│   │   ├── LandscapeControls.ts  # Terrain generation controls
│   │   ├── ShaderControls.ts     # Visual/shader controls
│   │   └── SimulatorControls.ts  # Simulation control panel
│   ├── shaders/
│   │   ├── terrain.fs.glsl       # Fragment shader
│   │   └── terrain.vs.glsl       # Vertex shader
│   ├── terrain/
│   │   ├── HeightGenerator.ts    # Procedural terrain generation
│   │   ├── Landscape.ts          # Terrain mesh and heightmap management
│   │   └── Mesh.ts               # Mesh geometry utilities
│   └── utils/
│       ├── ColorUtils.ts         # Color manipulation utilities
│       ├── MobileDetector.ts     # Mobile device detection
│       └── Random.ts             # Random number generation utilities
├── index.html                    # HTML entry point
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite build configuration
└── README.md                     # This file
```

## Adding New Erosion Algorithms

The project is designed to be extensible. To add a new erosion algorithm:

1. **Create a new erosion class** in `src/erosion/` that implements the
   `IErosionModel` interface:

```typescript
import type {IErosionModel} from "./IErosionModel";

export class MyErosion implements IErosionModel {
  getName(): string {
    return "My Custom Erosion";
  }

  initialize(width: number, height: number): void {
    // Initialize internal state
  }

  getIterations(): number {
    return this.iterations;
  }

  setIterations(n: number): void {
    this.iterations = n;
  }

  simulateStep(heightMap: Float32Array, width: number, height: number): void {
    // Implement one simulation step
  }

  erode(heightMap: Float32Array, width: number, height: number): void {
    // Implement full erosion process
  }

  applyChanges(heightMap: Float32Array, width: number, height: number): void {
    // Apply accumulated changes if needed
  }
}
```

2. **Register the algorithm** in `SceneManager.ts`:

```typescript
import {MyErosion} from "./erosion/MyErosion";

// In SceneManager constructor or initialization:
const myErosion = new MyErosion(/* parameters */);
this.erosionModels.push(myErosion);
```

3. **Add GUI controls** if your algorithm has custom parameters (see
   `src/erosion/PBErosion.ts` for examples).

## Build

To create a production build:

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment.

To preview the production build locally:

```bash
npm run preview
```

## Future Enhancements

- [ ] Additional erosion algorithms (thermal erosion, fluvial erosion, etc.)
- [ ] Export/import heightmap functionality
- [ ] Multithreaded simulation using Web Workers
- [ ] Water flow visualization
- [x] Comparison view (before/after or side-by-side algorithms)

## Contributing

Contributions are welcome! Whether you want to add new erosion algorithms or
improve existing features:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-algorithm`)
3. Commit your changes (`git commit -m 'Add new erosion algorithm'`)
4. Push to the branch (`git push origin feature/new-algorithm`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for
details.

## Acknowledgments

- Nick McDonald for the physics-based erosion approach.
- Hans Theobald Beyer for the original Beyer erosion algorithm implementation.
- Sebastian Lague for inspiration on terrain generation techniques.
- Three.js community for excellent documentation and examples.

## Contact

For questions or suggestions, please open an issue.

---

Made with ❤️ and TypeScript
