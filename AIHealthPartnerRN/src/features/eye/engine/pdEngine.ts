// src/features/eye/engine/pdEngine.ts
// Hybrid Su+Luo PD/IPD pipeline — pure-JS, no native dependencies.
// Su (2023): iris diameter pixel → mm conversion via 12 mm constant.
// Luo (2022): multi-frame capture + user accept/reject QC gate.

export interface PdFrameResult {
  /** Eye-center pixel coords in the PROCESSING frame (PROC_W × PROC_H). */
  leftCenterX: number;
  leftCenterY: number;
  rightCenterX: number;
  rightCenterY: number;
  /** Average iris radius in pixels (processing frame). */
  irisRadiusPx: number;
  interpupilPx: number;
  pdMm: number;
  frameConfidence: 'high' | 'medium' | 'low';
}

export interface PdCaptureResult {
  pdMm: number;
  variationMm: number;
  confidence: 'High' | 'Medium' | 'Low';
  frames: PdFrameResult[];
  bestFrame: PdFrameResult;
  flags: string[];
}

// ── 1. Grayscale ─────────────────────────────────────────────────────────────

function toGrayscale(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i++) {
    gray[i] = Math.round(
      0.299 * data[i * 4] +
      0.587 * data[i * 4 + 1] +
      0.114 * data[i * 4 + 2],
    );
  }
  return gray;
}

// ── 2. Histogram equalization ────────────────────────────────────────────────

function equalizeHistogram(gray: Uint8ClampedArray): Uint8ClampedArray {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;

  const cdf = new Array(256).fill(0);
  cdf[0] = hist[0];
  for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i];

  const cdfMin = cdf.find(v => v > 0) ?? 0;
  const n = gray.length;

  const eq = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i++) {
    eq[i] = Math.round(((cdf[gray[i]] - cdfMin) / (n - cdfMin)) * 255);
  }
  return eq;
}

// ── 3. Iris/pupil detection in a rectangular ROI ────────────────────────────
// Strategy: threshold-based centroid. Darker pixels = iris/pupil candidate.
// Returns eye-center (full-image coords) + estimated radius, or null on failure.

function findIrisInROI(
  gray: Uint8ClampedArray,
  width: number,
  roiX: number,
  roiY: number,
  roiW: number,
  roiH: number,
): { cx: number; cy: number; radius: number } | null {
  // Compute ROI mean
  let sum = 0;
  const total = roiW * roiH;
  for (let y = roiY; y < roiY + roiH; y++) {
    for (let x = roiX; x < roiX + roiW; x++) {
      sum += gray[y * width + x];
    }
  }
  const mean = sum / total;

  // Threshold: pixels darker than 70 % of mean are iris candidates
  const threshold = mean * 0.70;

  let darkX = 0, darkY = 0, darkN = 0;
  for (let y = roiY; y < roiY + roiH; y++) {
    for (let x = roiX; x < roiX + roiW; x++) {
      if (gray[y * width + x] < threshold) {
        darkX += x;
        darkY += y;
        darkN++;
      }
    }
  }

  // Need a minimum cluster of dark pixels to be credible
  const MIN_DARK_PIXELS = Math.round(total * 0.005); // 0.5 % of ROI
  if (darkN < MIN_DARK_PIXELS) return null;

  const cx = darkX / darkN;
  const cy = darkY / darkN;
  const radius = Math.sqrt(darkN / Math.PI); // circle area → radius

  // Sanity: radius must be non-trivial and centroid inside ROI
  if (radius < 3) return null;
  if (cx < roiX || cx > roiX + roiW || cy < roiY || cy > roiY + roiH) return null;

  return { cx, cy, radius };
}

// ── 4. Process a single RGBA frame ──────────────────────────────────────────
// data: Uint8ClampedArray of RGBA pixels (width × height × 4 bytes)
// Typical usage: pass ImageData from a <canvas> at PROC_W × PROC_H.

// Typical human iris diameter (Calossi 2007): 11.5–12.5 mm. Use 12.0.
const IRIS_ACTUAL_DIAMETER_MM = 12.0;

export function processFrame(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): PdFrameResult | null {
  const gray = toGrayscale(data, width, height);
  const eq = equalizeHistogram(gray);

  // Eye ROIs — front-facing camera, face centered at ~40 cm.
  // Eyes occupy roughly y = [30 %, 55 %] of the frame.
  // Each eye spans x = [5 %, 43 %] or [57 %, 95 %] (gap at nose bridge).
  const eyeY  = Math.round(height * 0.28);
  const eyeH  = Math.round(height * 0.28);
  const roiW  = Math.round(width * 0.37);
  const lROIX = Math.round(width * 0.05);
  const rROIX = Math.round(width * 0.58);

  const left  = findIrisInROI(eq, width, lROIX, eyeY, roiW, eyeH);
  const right = findIrisInROI(eq, width, rROIX, eyeY, roiW, eyeH);

  if (!left || !right) return null;

  // Vertical alignment check — eyes should be at similar heights
  if (Math.abs(left.cy - right.cy) > height * 0.12) return null;

  const avgRadius     = (left.radius + right.radius) / 2;
  const interpupilPx  = Math.abs(right.cx - left.cx);
  const mmPerPx       = IRIS_ACTUAL_DIAMETER_MM / (avgRadius * 2);
  const pdMm          = interpupilPx * mmPerPx;

  // Confidence heuristics
  const radiusSymmetry = Math.abs(left.radius - right.radius) / avgRadius;
  const pdInRange      = pdMm >= 50 && pdMm <= 82;

  const frameConfidence: 'high' | 'medium' | 'low' =
    pdInRange && radiusSymmetry < 0.20 ? 'high'  :
    pdInRange && radiusSymmetry < 0.40 ? 'medium' : 'low';

  return {
    leftCenterX:  left.cx,
    leftCenterY:  left.cy,
    rightCenterX: right.cx,
    rightCenterY: right.cy,
    irisRadiusPx: avgRadius,
    interpupilPx,
    pdMm,
    frameConfidence,
  };
}

// ── 5. Aggregate 3 frames → final PD (Luo multi-frame median) ───────────────

export function aggregateFrames(frames: PdFrameResult[]): PdCaptureResult {
  if (frames.length === 0) throw new Error('aggregateFrames: empty array');

  const good = frames.filter(f => f.frameConfidence !== 'low');
  const source = good.length >= 2 ? good : frames;

  const sorted = [...source].sort((a, b) => a.pdMm - b.pdMm);
  const pdMm = sorted[Math.floor(sorted.length / 2)].pdMm; // median
  const variationMm = sorted[sorted.length - 1].pdMm - sorted[0].pdMm;

  const flags: string[] = [];
  if (variationMm > 2)          flags.push('Frame variation > 2 mm — retake in steadier conditions');
  if (good.length === 0)        flags.push('Low detection confidence — verify result manually');
  if (pdMm < 54 || pdMm > 78)  flags.push('PD outside typical adult range (54–78 mm)');

  const confidence: 'High' | 'Medium' | 'Low' =
    variationMm <= 1.5 && good.length >= 2 ? 'High'   :
    variationMm <= 3.0 && good.length >= 1 ? 'Medium'  : 'Low';

  // Best frame = valid frame closest to median PD
  const bestFrame = source.reduce(
    (best, f) => Math.abs(f.pdMm - pdMm) < Math.abs(best.pdMm - pdMm) ? f : best,
    source[0],
  );

  return {
    pdMm:         Math.round(pdMm * 10) / 10,
    variationMm:  Math.round(variationMm * 10) / 10,
    confidence,
    frames,
    bestFrame,
    flags,
  };
}
