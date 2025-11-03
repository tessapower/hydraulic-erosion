// src/main.ts
import './style.css'
import { SceneManager } from './SceneManager';

const canvas: HTMLCanvasElement = document.querySelector<HTMLCanvasElement>('#three-canvas')!;
const sceneManager = new SceneManager(canvas);
sceneManager.start();

/* ensure the canvas pixel buffer matches CSS size and devicePixelRatio */
function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }
  return false;
}

resizeCanvasToDisplaySize(canvas);
window.addEventListener('resize', () => {
  if (resizeCanvasToDisplaySize(canvas)) {
    /* if SceneManager exposes a resize handler, call it */
    if (typeof (sceneManager as any).onResize === 'function') {
      (sceneManager as any).onResize();
    }
  }
});