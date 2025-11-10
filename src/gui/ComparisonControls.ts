// ComparisonControls.ts: Controls for comparing original vs eroded terrain

import type {Landscape} from "../terrain/Landscape";
import type {Simulator} from "../erosion/Simulator";

export class ComparisonControls {
  private landscape: Landscape;
  private simulator: Simulator;
  private isShowingOriginal: boolean = false;
  private overlayElement: HTMLElement | null = null;
  private mouseDownListener: ((e: MouseEvent) => void) | null = null;
  private mouseUpListener: ((e: MouseEvent) => void) | null = null;
  private contextMenuListener: ((e: MouseEvent) => void) | null = null;

  constructor(landscape: Landscape, simulator: Simulator) {
    this.landscape = landscape;
    this.simulator = simulator;
  }

  initialize(): void {
    this.createOverlay();
    this.setupMouseControls();
  }

  public updateVisibility(): void {
    if (this.overlayElement) {
      // Show hint only if original is saved, and we're either in the middle
      // of a simulation or finished.
      let showHint: boolean = this.landscape.hasOriginal()
        && (this.simulator.getState() === "PAUSED"
          || this.simulator.getState() === "COMPLETE");
      this.overlayElement.style.display = showHint ? 'block' : 'none';
    }
  }

  dispose(): void {
    if (this.mouseDownListener) {
      window.removeEventListener('mousedown', this.mouseDownListener);
    }
    if (this.mouseUpListener) {
      window.removeEventListener('mouseup', this.mouseUpListener);
    }
    if (this.contextMenuListener) {
      window.removeEventListener('contextmenu', this.contextMenuListener);
    }
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.parentNode.removeChild(this.overlayElement);
    }
  }

  private createOverlay(): void {
    // Create overlay element
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'comparison-hint';
    this.overlayElement.textContent = 'Hold RIGHT MOUSE BUTTON to toggle view';

    // Add to body
    document.body.appendChild(this.overlayElement);
  }

  private setupMouseControls(): void {
    this.mouseDownListener = (e: MouseEvent) => {
      // Right mouse button (button 2)
      if (e.button === 2 && !this.isShowingOriginal && this.landscape.hasOriginal()) {
        e.preventDefault();
        this.isShowingOriginal = true;
        this.landscape.showOriginal();
        this.overlayElement?.classList.add('active');
      }
    };

    this.mouseUpListener = (e: MouseEvent) => {
      // Right mouse button (button 2)
      if (e.button === 2 && this.isShowingOriginal) {
        e.preventDefault();
        this.isShowingOriginal = false;
        this.landscape.showCurrent();
        this.overlayElement?.classList.remove('active');
      }
    };

    // Prevent context menu when right-clicking
    this.contextMenuListener = (e: MouseEvent) => {
      if (this.landscape.hasOriginal()) {
        e.preventDefault();
      }
    };

    window.addEventListener('mousedown', this.mouseDownListener);
    window.addEventListener('mouseup', this.mouseUpListener);
    window.addEventListener('contextmenu', this.contextMenuListener);
  }
}