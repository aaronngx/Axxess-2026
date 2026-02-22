// src/features/eye/engine/pdEngineWeb.ts
// Web-only: MediaPipe FaceLandmarker → iris landmarks → Su PD formula.
// WASM + model loaded from CDN at runtime (no WASM bundler config needed).
//
// Iris landmark indices in the 478-point FaceLandmarker model:
//   Left  iris: 468 (center) 469 (right) 470 (bottom) 471 (left)  472 (top)
//   Right iris: 473 (center) 474 (left)  475 (bottom) 476 (right) 477 (top)
// All landmarks are normalized [0,1] relative to image width/height.

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

// ── Constants ─────────────────────────────────────────────────────────────────

const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Human iris is ~12 mm diameter (Calossi 2007)
const IRIS_ACTUAL_DIAMETER_MM = 12.0;

// Iris landmark indices
const L_CENTER = 468, L_RIGHT = 469, L_BOTTOM = 470, L_LEFT = 471, L_TOP = 472;
const R_CENTER = 473, R_LEFT  = 474, R_BOTTOM = 475, R_RIGHT = 476, R_TOP = 477;

// ── Types ─────────────────────────────────────────────────────────────────────

/** All positions are normalized [0,1]. Multiply by displayW/displayH for pixels. */
export interface WebPdFrame {
  leftCenter:  { x: number; y: number };
  rightCenter: { x: number; y: number };
  /** Normalized iris radii — multiply by displayW / displayH for display */
  leftRadiusNormX:  number;
  leftRadiusNormY:  number;
  rightRadiusNormX: number;
  rightRadiusNormY: number;
  pdMm: number;
  frameConfidence: 'high' | 'medium' | 'low';
}

export interface WebPdResult {
  pdMm: number;
  variationMm: number;
  confidence: 'High' | 'Medium' | 'Low';
  bestFrame: WebPdFrame;
  frames: WebPdFrame[];
  flags: string[];
}

// ── Singleton detector (cached after first load) ──────────────────────────────

let _detector: FaceLandmarker | null = null;
let _loading: Promise<FaceLandmarker> | null = null;

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
let _status: LoadStatus = 'idle';

export function getLoadStatus(): LoadStatus { return _status; }

export async function initDetector(
  onProgress?: (status: LoadStatus) => void,
): Promise<FaceLandmarker> {
  if (_detector) return _detector;
  if (_loading) return _loading;

  _status = 'loading';
  onProgress?.('loading');

  _loading = (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
    const detector = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'IMAGE',
      numFaces: 1,
      outputFaceBlendshapes: false,
    });
    _detector = detector;
    _status = 'ready';
    onProgress?.('ready');
    return detector;
  })().catch(err => {
    _status = 'error';
    onProgress?.('error');
    _loading = null;
    throw err;
  });

  return _loading;
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function dist(a: NormalizedLandmark, b: NormalizedLandmark, W: number, H: number): number {
  return Math.sqrt(((a.x - b.x) * W) ** 2 + ((a.y - b.y) * H) ** 2);
}

// ── Single-frame analysis ─────────────────────────────────────────────────────

export async function detectPdFromImageElement(
  img: HTMLImageElement,
): Promise<WebPdFrame | null> {
  const detector = await initDetector();
  const result   = detector.detect(img);

  if (!result.faceLandmarks?.length) return null;
  const lm = result.faceLandmarks[0];

  const W = img.naturalWidth  || img.width;
  const H = img.naturalHeight || img.height;

  // Iris diameters in pixels (using image pixel space to handle non-square images)
  const lDiamX = dist(lm[L_LEFT], lm[L_RIGHT],  W, H); // horizontal
  const lDiamY = dist(lm[L_TOP],  lm[L_BOTTOM], W, H); // vertical
  const rDiamX = dist(lm[R_LEFT], lm[R_RIGHT],  W, H);
  const rDiamY = dist(lm[R_TOP],  lm[R_BOTTOM], W, H);

  const lDiam = (lDiamX + lDiamY) / 2;
  const rDiam = (rDiamX + rDiamY) / 2;
  const avgDiam = (lDiam + rDiam) / 2;

  if (avgDiam < 1) return null; // degenerate

  // Interpupillary distance in pixels
  const interpupilPx = dist(lm[L_CENTER], lm[R_CENTER], W, H);

  // Su formula: scale via iris-as-ruler
  const mmPerPx = IRIS_ACTUAL_DIAMETER_MM / avgDiam;
  const pdMm    = interpupilPx * mmPerPx;

  // Confidence
  const symmetry    = Math.abs(lDiam - rDiam) / avgDiam;
  const pdInRange   = pdMm >= 50 && pdMm <= 82;
  const frameConfidence: WebPdFrame['frameConfidence'] =
    pdInRange && symmetry < 0.10 ? 'high'   :
    pdInRange && symmetry < 0.25 ? 'medium' : 'low';

  return {
    leftCenter:       { x: lm[L_CENTER].x, y: lm[L_CENTER].y },
    rightCenter:      { x: lm[R_CENTER].x, y: lm[R_CENTER].y },
    leftRadiusNormX:  (lDiamX / 2) / W,
    leftRadiusNormY:  (lDiamY / 2) / H,
    rightRadiusNormX: (rDiamX / 2) / W,
    rightRadiusNormY: (rDiamY / 2) / H,
    pdMm,
    frameConfidence,
  };
}

/** Capture a photo from CameraView ref and run detection. Returns null if no face found. */
export async function captureAndDetect(
  cameraRef: React.RefObject<any>,
): Promise<{ uri: string; frame: WebPdFrame | null }> {
  const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: false });
  const uri: string = photo.uri;

  const frame = await new Promise<WebPdFrame | null>(resolve => {
    const img = document.createElement('img') as HTMLImageElement;
    img.crossOrigin = 'anonymous';
    img.onload  = async () => resolve(await detectPdFromImageElement(img).catch(() => null));
    img.onerror = () => resolve(null);
    img.src = uri;
  });

  return { uri, frame };
}

// ── Multi-frame aggregation ───────────────────────────────────────────────────

export function aggregateWebFrames(
  frames: WebPdFrame[],
  uris: string[],
): WebPdResult {
  if (frames.length === 0) throw new Error('aggregateWebFrames: empty');

  const good   = frames.filter(f => f.frameConfidence !== 'low');
  const source = good.length >= 2 ? good : frames;

  const sorted = [...source].sort((a, b) => a.pdMm - b.pdMm);
  const pdMm   = sorted[Math.floor(sorted.length / 2)].pdMm;
  const variationMm = sorted[sorted.length - 1].pdMm - sorted[0].pdMm;

  const flags: string[] = [];
  if (variationMm > 2)         flags.push('Frame variation > 2 mm — hold steadier');
  if (good.length === 0)       flags.push('Low confidence — check lighting and face position');
  if (pdMm < 54 || pdMm > 78) flags.push('PD outside typical adult range (54–78 mm)');

  const confidence: WebPdResult['confidence'] =
    variationMm <= 1.5 && good.length >= 2 ? 'High'   :
    variationMm <= 3.0 && good.length >= 1 ? 'Medium' : 'Low';

  const bestFrame = source.reduce(
    (best, f) => Math.abs(f.pdMm - pdMm) < Math.abs(best.pdMm - pdMm) ? f : best,
    source[0],
  );

  return {
    pdMm:         Math.round(pdMm * 10) / 10,
    variationMm:  Math.round(variationMm * 10) / 10,
    confidence,
    bestFrame,
    frames,
    flags,
  };
}
