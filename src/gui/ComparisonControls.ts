// ComparisonControls.ts: Controls for comparing original vs eroded terrain

import type {Landscape} from "../terrain/Landscape";
import type {Simulator} from "../erosion/Simulator";

export class ComparisonControls {
  private static readonly LONG_PRESS_DURATION: number = 500; // ms
  private landscape: Landscape;
  private simulator: Simulator;
  private isShowingOriginal: boolean = false;
  private overlayElement: HTMLElement | null = null;
  private mouseDownListener: ((e: MouseEvent) => void) | null = null;
  private mouseUpListener: ((e: MouseEvent) => void) | null = null;
  private contextMenuListener: ((e: MouseEvent) => void) | null = null;
  private touchStartListener: ((e: TouchEvent) => void) | null = null;
  private touchEndListener: ((e: TouchEvent) => void) | null = null;
  private touchCancelListener: ((e: TouchEvent) => void) | null = null;
  private longPressTimer: number | null = null;

  constructor(landscape: Landscape, simulator: Simulator) {
    this.landscape = landscape;
    this.simulator = simulator;
  }

  initialize(): void {
    this.createOverlay();
    this.setupMouseControls();
    this.setupTouchControls();
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
    if (this.longPressTimer !== null) {
      window.clearTimeout(this.longPressTimer);
    }
    if (this.mouseDownListener) {
      window.removeEventListener('mousedown', this.mouseDownListener);
    }
    if (this.mouseUpListener) {
      window.removeEventListener('mouseup', this.mouseUpListener);
    }
    if (this.contextMenuListener) {
      window.removeEventListener('contextmenu', this.contextMenuListener);
    }
    if (this.touchStartListener) {
      window.removeEventListener('touchstart', this.touchStartListener);
    }
    if (this.touchEndListener) {
      window.removeEventListener('touchend', this.touchEndListener);
    }
    if (this.touchCancelListener) {
      window.removeEventListener('touchcancel', this.touchCancelListener);
    }
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.parentNode.removeChild(this.overlayElement);
    }
  }

  private createOverlay(): void {
    // Create overlay element
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'comparison-hint';

    // Detect if device has touch support
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.overlayElement.textContent = hasTouch
      ? 'TAP AND HOLD to toggle view'
      : 'Hold RIGHT MOUSE BUTTON to toggle view';

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

  private setupTouchControls(): void {
    this.touchStartListener = (e: TouchEvent) => {
      if (e.touches.length === 1 && !this.isShowingOriginal && this.landscape.hasOriginal()) {
        // Start long press timer
        this.longPressTimer = window.setTimeout(() => {
          this.isShowingOriginal = true;
          this.landscape.showOriginal();
          this.overlayElement?.classList.add('active');

          // Add haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }, ComparisonControls.LONG_PRESS_DURATION);
      }
    };

    this.touchEndListener = () => {
      // Clear the long press timer
      if (this.longPressTimer !== null) {
        window.clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      // If we were showing original, hide it
      if (this.isShowingOriginal) {
        this.isShowingOriginal = false;
        this.landscape.showCurrent();
        this.overlayElement?.classList.remove('active');
      }
    };

    this.touchCancelListener = () => {
      // Clear the long press timer
      if (this.longPressTimer !== null) {
        window.clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      // If we were showing original, hide it
      if (this.isShowingOriginal) {
        this.isShowingOriginal = false;
        this.landscape.showCurrent();
        this.overlayElement?.classList.remove('active');
      }
    };

    window.addEventListener('touchstart', this.touchStartListener, {passive: true});
    window.addEventListener('touchend', this.touchEndListener, {passive: true});
    window.addEventListener('touchcancel', this.touchCancelListener, {passive: true});
  }
}