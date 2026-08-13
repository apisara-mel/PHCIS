import { useEffect, useRef, useState } from 'react';
import { getFaceLandmarker } from '@/lib/faceLandmarker';

/* Port of bma.kiosk `src/lib/useFaceInFrame.ts` — identical thresholds and dwell
   gating. Answers one question: is a single face centred and sized for the
   bust-guide frame? (vs `useHeadPoseGestures`, which drives the 360° enrollment
   ring the kiosk uses on its *enrollment* screen.) */

const MODEL_LOAD_TIMEOUT_MS = 8000;
const DWELL_MS = 400;

/* Normalized video coords — the nose must sit inside this oval-ish region. */
const CENTER_X_MIN = 0.38;
const CENTER_X_MAX = 0.62;
const CENTER_Y_MIN = 0.32;
const CENTER_Y_MAX = 0.68;
const MIN_EYE_SPAN = 0.12;
const MAX_EYE_SPAN = 0.45;

const isFaceFramed = (lm) => {
  const nose = lm[1];
  const leftEye = lm[33];
  const rightEye = lm[263];
  if (!nose || !leftEye || !rightEye) return false;
  const eyeSpan = Math.abs(rightEye.x - leftEye.x);
  if (eyeSpan < MIN_EYE_SPAN || eyeSpan > MAX_EYE_SPAN) return false;
  return (
    nose.x >= CENTER_X_MIN
    && nose.x <= CENTER_X_MAX
    && nose.y >= CENTER_Y_MIN
    && nose.y <= CENTER_Y_MAX
  );
};

/**
 * True once a single face has been centred and correctly sized for DWELL_MS.
 * @param {React.RefObject<HTMLVideoElement|null>} videoRef
 * @param {boolean} active
 * @returns {{ modelStatus: 'idle'|'loading'|'ready'|'error', faceInFrame: boolean }}
 */
export function useFaceInFrame(videoRef, active) {
  const [modelStatus, setModelStatus] = useState('idle');
  const [faceInFrame, setFaceInFrame] = useState(false);
  const dwellStartRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setModelStatus('idle');
      setFaceInFrame(false);
      dwellStartRef.current = null;
      return undefined;
    }

    let cancelled = false;
    let rafId = 0;
    setModelStatus('loading');
    setFaceInFrame(false);
    dwellStartRef.current = null;

    const timeoutId = setTimeout(() => {
      if (!cancelled) setModelStatus((s) => (s === 'loading' ? 'error' : s));
    }, MODEL_LOAD_TIMEOUT_MS);

    getFaceLandmarker()
      .then((landmarker) => {
        clearTimeout(timeoutId);
        if (cancelled) return;
        setModelStatus('ready');

        const detect = () => {
          if (cancelled) return;
          const video = videoRef.current;
          if (video && video.readyState >= 2) {
            const result = landmarker.detectForVideo(video, performance.now());
            const lm = result.faceLandmarks?.[0];
            const framed = lm ? isFaceFramed(lm) : false;
            const now = performance.now();

            if (framed) {
              const start = dwellStartRef.current ?? now;
              dwellStartRef.current = start;
              if (now - start >= DWELL_MS) setFaceInFrame(true);
            } else {
              dwellStartRef.current = null;
              setFaceInFrame(false);
            }
          }
          rafId = requestAnimationFrame(detect);
        };
        rafId = requestAnimationFrame(detect);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        if (!cancelled) setModelStatus('error');
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
    };
  }, [active, videoRef]);

  return { modelStatus, faceInFrame };
}

export default useFaceInFrame;
