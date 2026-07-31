import { useEffect, useRef, useState } from 'react';
import { getFaceLandmarker } from '@/lib/faceLandmarker';

/* Port of bma.kiosk `src/lib/useHeadPoseGestures.ts` — identical thresholds /
   baseline calibration / dwell gating (iOS Face ID–style enrollment). */

export const GESTURE_KEYS = ['center', 'left', 'right', 'up'];

const DWELL_MS = 500;
const WARMUP_FRAMES = 25;
const BASELINE_SAMPLES = 15;
const YAW_CENTER_MAX = 0.22;
const YAW_TURN_MIN = 0.55;
const PITCH_CENTER_MAX = 0.07;
const PITCH_UP_MIN = 0.14;
const MODEL_LOAD_TIMEOUT_MS = 8000;

const EMPTY_ANGLES = {
  center: false,
  left: false,
  right: false,
  up: false,
};

/**
 * @param {React.RefObject<HTMLVideoElement|null>} videoRef
 * @param {boolean} active
 */
export function useHeadPoseGestures(videoRef, active) {
  const [modelStatus, setModelStatus] = useState('idle');
  const [angles, setAngles] = useState(EMPTY_ANGLES);
  const dwellRef = useRef({});
  const baselineSamplesRef = useRef([]);
  const baselineRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setModelStatus('idle');
      setAngles(EMPTY_ANGLES);
      dwellRef.current = {};
      baselineSamplesRef.current = [];
      baselineRef.current = null;
      return undefined;
    }

    let cancelled = false;
    let rafId = 0;
    setModelStatus('loading');

    const timeoutId = setTimeout(() => {
      if (!cancelled) setModelStatus((s) => (s === 'loading' ? 'error' : s));
    }, MODEL_LOAD_TIMEOUT_MS);

    let smoothYaw = null;
    let smoothPitch = null;
    let frameCount = 0;
    const SMOOTHING = 0.25;

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
            if (lm) {
              const nose = lm[1];
              const leftEye = lm[33];
              const rightEye = lm[263];
              const forehead = lm[10];
              const chin = lm[152];
              const eyeSpan = rightEye.x - leftEye.x;
              const faceHeight = chin.y - forehead.y;
              const rawYaw = eyeSpan ? (nose.x - (leftEye.x + rightEye.x) / 2) / (eyeSpan / 2) : 0;
              const rawPitch = faceHeight ? (nose.y - forehead.y) / faceHeight : 0.5;

              smoothYaw = smoothYaw === null ? rawYaw : smoothYaw + SMOOTHING * (rawYaw - smoothYaw);
              smoothPitch = smoothPitch === null ? rawPitch : smoothPitch + SMOOTHING * (rawPitch - smoothPitch);
              const yaw = smoothYaw;
              const pitch = smoothPitch;
              frameCount += 1;

              if (!baselineRef.current && frameCount > WARMUP_FRAMES) {
                baselineSamplesRef.current.push({ yaw, pitch });
                if (baselineSamplesRef.current.length >= BASELINE_SAMPLES) {
                  const n = baselineSamplesRef.current.length;
                  baselineRef.current = {
                    yaw: baselineSamplesRef.current.reduce((s, v) => s + v.yaw, 0) / n,
                    pitch: baselineSamplesRef.current.reduce((s, v) => s + v.pitch, 0) / n,
                  };
                }
              }

              const baseline = baselineRef.current;
              const dYaw = baseline ? yaw - baseline.yaw : 0;
              const dPitch = baseline ? pitch - baseline.pitch : 0;
              const now = performance.now();

              const hits = baseline
                ? {
                    center: Math.abs(dYaw) < YAW_CENTER_MAX && Math.abs(dPitch) < PITCH_CENTER_MAX,
                    left: dYaw < -YAW_TURN_MIN,
                    right: dYaw > YAW_TURN_MIN,
                    up: dPitch < -PITCH_UP_MIN,
                  }
                : { center: false, left: false, right: false, up: false };

              setAngles((prev) => {
                let changed = false;
                const next = { ...prev };
                Object.keys(hits).forEach((key) => {
                  if (prev[key]) return;
                  if (hits[key]) {
                    const start = dwellRef.current[key] ?? now;
                    dwellRef.current[key] = start;
                    if (now - start >= DWELL_MS) {
                      next[key] = true;
                      changed = true;
                    }
                  } else {
                    dwellRef.current[key] = undefined;
                  }
                });
                return changed ? next : prev;
              });
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

  return { modelStatus, angles };
}
