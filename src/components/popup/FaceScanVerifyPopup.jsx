import React, { useCallback, useEffect, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import { GESTURE_KEYS, useHeadPoseGestures } from '@/lib/useHeadPoseGestures';

/* MIH FaceScanVerifyPopup — Figma PHCIS-Registration 402:52908 chrome.
   Scan method + logic mirrored from bma.kiosk `06-FaceRecognition.tsx`
   (MediaPipe Face Landmarker + useHeadPoseGestures, timed fallback). */

const REF_AVATAR = '/illustration/registration/face-scan-ref.png';
const ICON_CHECK = '/illustration/registration/face-scan-check.svg';
const ICON_DOT = '/illustration/registration/face-scan-dot.svg';

const RING_GREEN = '#63daac';
const RING_FADE = '#b4f7dd';
const RING_BLUE = '#cfe8ff';
const FALLBACK_DURATION_MS = 3000;
const TICK_MS = 60;
const RING_TICKS = 64;
const RING_FADE_TICKS = 3;

const POSE_LABELS = [
  { key: 'center', label: 'ตรงกลาง' },
  { key: 'left', label: 'ด้านซ้าย' },
  { key: 'right', label: 'ด้านขวา' },
  { key: 'up', label: 'เงยขึ้น' },
];

const tickColor = (index, progress, matched) => {
  if (matched) return RING_GREEN;
  const lit = Math.round((progress / 100) * RING_TICKS);
  if (index < lit) return RING_GREEN;
  if (index < lit + RING_FADE_TICKS) return RING_FADE;
  return RING_BLUE;
};

const PoseChip = ({ label, done }) => (
  <div
    className='inline-flex items-center justify-center shrink-0'
    style={{
      gap: 'var(--dim-space-150, 6px)',
      height: 32,
      minWidth: 40,
      maxWidth: 224,
      padding: 'var(--dim-space-100) var(--dim-space-300)',
      borderRadius: 'var(--dim-radius-full, 9999px)',
      background: done
        ? 'var(--surface-statusbadge-success, #D1F6EE)'
        : 'var(--surface-statusbadge-neutral, #F5F7F9)',
    }}
  >
    {done ? (
      <img src={ICON_CHECK} alt='' width={16} height={16} style={{ width: 16, height: 16, display: 'block' }} />
    ) : (
      <img src={ICON_DOT} alt='' width={8} height={8} style={{ width: 8, height: 8, display: 'block' }} />
    )}
    <span style={{
      color: done
        ? 'var(--text-colorfulbadge-teal, #196C65)'
        : 'var(--text-statusbadge-neutral, #4D5358)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm)',
      fontWeight: 'var(--type-weight-medium)',
      lineHeight: 1.5,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  </div>
);

const FaceScanVerifyPopup = ({
  open,
  onClose,
  onCapture,
  patientName = 'นายสมชาย มั่นใจดี',
  referencePhoto,
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const completedRef = useRef(false);

  const [cameraError, setCameraError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [fallbackProgress, setFallbackProgress] = useState(0);

  /* Camera — same getUserMedia path as bma.kiosk FaceRecognition. */
  useEffect(() => {
    if (!open) {
      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraError(false);
      setCameraReady(false);
      setFallbackProgress(0);
      completedRef.current = false;
      return undefined;
    }

    let cancelled = false;
    let activeStream = null;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(true);
    } else {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then((s) => {
          if (cancelled) {
            s.getTracks().forEach((t) => t.stop());
            return;
          }
          activeStream = s;
          streamRef.current = s;
          const el = videoRef.current;
          if (el) {
            el.srcObject = s;
            el.play().catch(() => setCameraError(true));
          }
        })
        .catch(() => setCameraError(true));
    }

    return () => {
      cancelled = true;
      activeStream?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [open]);

  /* Re-attach when video node mounts after stream grant. */
  useEffect(() => {
    if (!open || !streamRef.current || !videoRef.current) return;
    const el = videoRef.current;
    if (el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(() => setCameraError(true));
    }
  }, [open, cameraError]);

  const { modelStatus, angles } = useHeadPoseGestures(
    videoRef,
    open && cameraReady && !cameraError,
  );

  const useFallback = cameraError || modelStatus === 'error';

  useEffect(() => {
    if (!open || !useFallback) return undefined;
    setFallbackProgress(0);
    const id = setInterval(() => {
      setFallbackProgress((p) => Math.min(100, p + 100 / (FALLBACK_DURATION_MS / TICK_MS)));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [open, useFallback]);

  const doneCount = GESTURE_KEYS.filter((key) => angles[key]).length;
  const progress = useFallback ? fallbackProgress : doneCount * 25;
  const matched = useFallback ? fallbackProgress >= 100 : doneCount === GESTURE_KEYS.length;
  const scanStarted = useFallback || modelStatus === 'ready';

  const chipDone = useFallback
    ? {
        center: fallbackProgress > 25,
        left: fallbackProgress > 50,
        right: fallbackProgress > 75,
        up: fallbackProgress >= 100,
      }
    : angles;

  const snapshot = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        return canvas.toDataURL('image/png');
      }
    }
    return referencePhoto || REF_AVATAR;
  }, [referencePhoto]);

  useEffect(() => {
    if (!open || !matched || completedRef.current) return undefined;
    completedRef.current = true;
    const dataUrl = snapshot();
    const id = setTimeout(() => {
      onCapture?.(dataUrl);
      onClose?.();
    }, 800);
    return () => clearTimeout(id);
  }, [open, matched, snapshot, onCapture, onClose]);

  const displayProgress = Math.round(progress);
  const avatarSrc = referencePhoto || REF_AVATAR;

  const statusText = matched
    ? 'ยืนยันตัวตนสำเร็จ'
    : scanStarted
      ? 'กำลังสแกนใบหน้า โปรดมองที่กล้อง'
      : 'กำลังเปิดกล้อง โปรดรอสักครู่';

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='ถ่ายรูปเพื่อยืนยันตัวตน'
      size='default'
      showCloseButton
      actions={[]}
      bodyStyle={{ paddingRight: 'var(--dim-space-200)' }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <div
          className='flex items-center w-full overflow-hidden'
          style={{
            gap: 'var(--dim-space-200)',
            padding: 'var(--dim-space-200)',
            borderRadius: 10,
            background: 'var(--surface-card-indigo-100, #F3F5FC)',
          }}
        >
          <img
            src={avatarSrc}
            alt=''
            width={40}
            height={39}
            style={{
              width: 40,
              height: 39,
              borderRadius: 'var(--dim-radius-200)',
              objectFit: 'cover',
              display: 'block',
              flexShrink: 0,
            }}
          />
          <div className='flex flex-col min-w-0 flex-1' style={{ gap: 2 }}>
            <span style={{
              color: 'var(--text-content-default)',
              fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-heading-content))',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {patientName}
            </span>
            <span style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-medium)',
              lineHeight: 1.5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              เปรียบเทียบใบหน้ากับภาพในระบบ/บัตรประชาชน
            </span>
          </div>
        </div>

        <div className='flex flex-col w-full text-center' style={{ gap: 2 }}>
          <span style={{
            color: 'var(--text-content-default)',
            fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-heading-content))',
            fontSize: 'var(--type-size-xl)',
            lineHeight: 1.375,
          }}>
            สแกนใบหน้าเพื่อยืนยันตัวตน
          </span>
          <span style={{
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            lineHeight: 1.5,
          }}>
            ค่อยๆ หมุนศีรษะเป็นวงกลมช้าๆ จนกรอบรอบใบหน้าครบวง
          </span>
        </div>

        <div className='relative w-full mx-auto' style={{ maxWidth: 320, aspectRatio: '1 / 1' }}>
          {Array.from({ length: RING_TICKS }, (_, i) => (
            <div
              key={i}
              className='absolute inset-0'
              style={{ transform: `rotate(${(i / RING_TICKS) * 360}deg)` }}
            >
              <div
                className='absolute left-1/2'
                style={{
                  top: 8,
                  width: 5,
                  height: 18,
                  marginLeft: -2.5,
                  borderRadius: 3.5,
                  background: tickColor(i, progress, matched),
                  transition: 'background-color 200ms',
                }}
              />
            </div>
          ))}
          <div
            className='absolute overflow-hidden'
            style={{
              inset: '13.33%',
              borderRadius: '999999px',
              border: matched ? '10px solid #63daac' : '10px solid #fff',
              background: '#EAF5FF',
              boxSizing: 'border-box',
              transition: 'border-color 300ms',
            }}
          >
            {!cameraError ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onPlaying={() => setCameraReady(true)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                }}
              />
            ) : (
              <div
                className='absolute inset-0 flex items-center justify-center text-center'
                style={{ padding: 'var(--dim-space-400)' }}
              >
                <span style={{
                  color: 'var(--text-content-secondary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                }}>
                  ไม่สามารถเข้าถึงกล้องได้
                </span>
              </div>
            )}
          </div>
        </div>

        <p style={{
          margin: 0,
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-5xl, 48px)',
          fontWeight: 800,
          lineHeight: 1,
          textAlign: 'center',
        }}>
          {displayProgress}%
        </p>

        <p style={{
          margin: 0,
          color: 'var(--text-content-secondary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          lineHeight: 1.5,
          textAlign: 'center',
        }}>
          {statusText}
        </p>

        <div className='flex flex-wrap items-center justify-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
          {POSE_LABELS.map((p) => (
            <PoseChip key={p.key} label={p.label} done={!!chipDone[p.key]} />
          ))}
        </div>

        <p style={{
          margin: 0,
          color: 'var(--text-content-quaternary, #ADB2B7)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 12,
          lineHeight: 1.5,
          textAlign: 'center',
        }}>
          ระบบจะเปรียบเทียบใบหน้ากับภาพอ้างอิงเพื่อยืนยันตัวตน
          <br />
          ข้อมูลใบหน้าเป็น biometric ตาม PDPA
        </p>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Popup>
  );
};

export default FaceScanVerifyPopup;
