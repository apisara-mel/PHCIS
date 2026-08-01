import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

/* Shared with bma.kiosk `src/lib/faceLandmarker.ts` — same CDN model + GPU
   Face Landmarker instance reused across mounts within a session. */

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let landmarkerPromise = null;

export function getFaceLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = FilesetResolver.forVisionTasks(WASM_BASE).then((vision) =>
      FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
      }),
    );
  }
  return landmarkerPromise;
}
