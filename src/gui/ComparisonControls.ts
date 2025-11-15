// ComparisonControls.ts: Controls for comparing original vs eroded terrain

import type {Landscape} from "../terrain/Landscape";
import type {Simulator} from "../erosion/Simulator";

export class ComparisonControls {
  private static readonly LONG_PRESS_DURATION: number = 500; // ms
  private landscape: Landscape;
  private simulator: Simulator;
  private canvas: HTMLCanvasElement;
  private isShowingOriginal: boolean = false;
  private overlayElement: HTMLElement | null = null;
  private mouseDownListener: ((e: MouseEvent) => void) | null = null;
  private mouseUpListener: ((e: MouseEvent) => void) | null = null;
  private contextMenuListener: ((e: MouseEvent) => void) | null = null;
  private touchStartListener: ((e: TouchEvent) => void) | null = null;
  private touchEndListener: ((e: TouchEvent) => void) | null = null;
  private touchCancelListener: ((e: TouchEvent) => void) | null = null;
  private longPressTimer: number | null = null;
  private initialTouchCount: number = 0;

  constructor(landscape: Landscape, simulator: Simulator, canvas: HTMLCanvasElement) {
    this.landscape = landscape;
    this.simulator = simulator;
    this.canvas = canvas;
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
      this.canvas.removeEventListener('mousedown', this.mouseDownListener);
    }
    if (this.mouseUpListener) {
      this.canvas.removeEventListener('mouseup', this.mouseUpListener);
    }
    if (this.contextMenuListener) {
      this.canvas.removeEventListener('contextmenu', this.contextMenuListener);
    }
    if (this.touchStartListener) {
      this.canvas.removeEventListener('touchstart', this.touchStartListener);
    }
    if (this.touchEndListener) {
      this.canvas.removeEventListener('touchend', this.touchEndListener);
    }
    if (this.touchCancelListener) {
      this.canvas.removeEventListener('touchcancel', this.touchCancelListener);
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

    // Attach to canvas element to avoid capturing mouse events on GUI elements
    this.canvas.addEventListener('mousedown', this.mouseDownListener);
    this.canvas.addEventListener('mouseup', this.mouseUpListener);
    this.canvas.addEventListener('contextmenu', this.contextMenuListener);
  }

  private setupTouchControls(): void {
    this.touchStartListener = (e: TouchEvent) => {
      // Cancel long-press if user adds a second finger (pinch gesture)
      if (this.initialTouchCount === 1 && e.touches.length > 1) {
        if (this.longPressTimer !== null) {
          window.clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }
        this.initialTouchCount = e.touches.length;
        return;
      }

      // Only start long-press timer on single-finger touch
      if (e.touches.length === 1 && !this.isShowingOriginal && this.landscape.hasOriginal()) {
        this.initialTouchCount = 1;

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
      } else {
        this.initialTouchCount = e.touches.length;
      }
    };

    this.touchEndListener = () => {
      // Reset touch count
      this.initialTouchCount = 0;

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
      // Reset touch count
      this.initialTouchCount = 0;

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

    // Attach to canvas element to avoid capturing touches on GUI elements
    this.canvas.addEventListener('touchstart', this.touchStartListener, {passive: true});
    this.canvas.addEventListener('touchend', this.touchEndListener, {passive: true});
    this.canvas.addEventListener('touchcancel', this.touchCancelListener, {passive: true});
  }
}

