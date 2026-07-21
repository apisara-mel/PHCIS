import React, { useEffect, useRef, useState } from 'react';
import {
  compositeVirtualBackground,
  createSelfieSegmenter,
  loadBackgroundImage,
  resetVirtualBackgroundTemporalState,
} from '@/utils/telemedVirtualBackground';

/**
 * Meet/Zoom-style virtual background feed.
 * - mode `none`  → raw mirrored camera
 * - mode `blur`  → die-cut person + blurred room
 * - mode `image` → die-cut person + selected background image
 *
 * Segmentation runs only when mode is blur/image (saves CPU when off).
 */
const VB_OPTS = {
  blurPx: 20,
  edgeBlurPx: 4,
  solidThreshold: 0.32,
  edgeFeather: 0.25,
  temporalStrength: 0.30,
  resoldifyAt: 0.78,
};

const VirtualBackgroundFeed = ({
  stream,
  mode = 'none', // 'none' | 'blur' | 'image'
  backgroundSrc = null,
  mirror = true,
  style,
  className = '',
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const segmenterRef = useRef(null);
  const bgImageRef = useRef(null);
  const modeRef = useRef(mode);
  const mirrorRef = useRef(mirror);
  const rafRef = useRef(0);
  const busyRef = useRef(false);
  const lastTsRef = useRef(-1);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const needsFx = mode === 'blur' || mode === 'image';
  modeRef.current = mode;
  mirrorRef.current = mirror;

  /* Attach camera stream to the hidden source video. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    if (stream) {
      if (video.srcObject !== stream) video.srcObject = stream;
      const play = () => { video.play().catch(() => {}); };
      if (video.readyState >= 2) play();
      else video.addEventListener('loadedmetadata', play, { once: true });
    } else {
      video.srcObject = null;
    }
    return undefined;
  }, [stream]);

  /* Preload selected background image. */
  useEffect(() => {
    let cancelled = false;
    bgImageRef.current = null;
    if (mode !== 'image' || !backgroundSrc) return undefined;
    loadBackgroundImage(backgroundSrc).then((img) => {
      if (!cancelled) bgImageRef.current = img;
    });
    return () => { cancelled = true; };
  }, [mode, backgroundSrc]);

  /* Create / tear down the MediaPipe segmenter when FX is needed. */
  useEffect(() => {
    if (!needsFx || !stream) {
      setReady(false);
      resetVirtualBackgroundTemporalState();
      return undefined;
    }
    let cancelled = false;
    setFailed(false);
    setReady(false);
    resetVirtualBackgroundTemporalState();

    const paint = (results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: false });
      if (!ctx) return;
      compositeVirtualBackground(ctx, results, {
        mode: modeRef.current,
        backgroundImage: bgImageRef.current,
        mirror: mirrorRef.current,
        ...VB_OPTS,
      });
      busyRef.current = false;
    };

    createSelfieSegmenter()
      .then((segmenter) => {
        if (cancelled) {
          segmenter.close?.();
          return;
        }
        segmenterRef.current = segmenter;
        segmenter.onResults(paint);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setReady(false);
        }
      });

    return () => {
      cancelled = true;
      const seg = segmenterRef.current;
      segmenterRef.current = null;
      seg?.close?.();
      resetVirtualBackgroundTemporalState();
      setReady(false);
    };
  }, [needsFx, stream]);

  /* Animation loop — feed frames into MediaPipe. */
  useEffect(() => {
    if (!needsFx || !ready || !stream) return undefined;

    const tick = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const segmenter = segmenterRef.current;
      if (!video || !canvas || !segmenter) {
        rafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw && vh && (canvas.width !== vw || canvas.height !== vh)) {
        canvas.width = vw;
        canvas.height = vh;
        resetVirtualBackgroundTemporalState();
      }

      if (
        !busyRef.current
        && video.readyState >= 2
        && vw > 0
        && !video.paused
        && !video.ended
      ) {
        busyRef.current = true;
        try {
          const ts = performance.now();
          if (ts !== lastTsRef.current) {
            lastTsRef.current = ts;
            await segmenter.send({ image: video });
          } else {
            busyRef.current = false;
          }
        } catch {
          busyRef.current = false;
        }
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      busyRef.current = false;
    };
  }, [needsFx, ready, stream]);

  const fillStyle = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    ...style,
  };

  const showCanvas = needsFx && ready && !failed;
  const showRaw = !showCanvas;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #232B36 0%, #131922 100%)',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={showRaw ? {
          ...fillStyle,
          transform: mirror ? 'scaleX(-1)' : 'none',
        } : {
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden={!showCanvas}
        style={{
          ...fillStyle,
          display: showCanvas ? 'block' : 'none',
        }}
      />
    </div>
  );
};

export default VirtualBackgroundFeed;
