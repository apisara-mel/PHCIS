import React, { useCallback, useEffect, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import { useFaceInFrame } from '@/lib/useFaceInFrame';

/* MIH FaceScanVerifyPopup — Figma PHCIS-Registration 402:52908 chrome.
   Capture method mirrored from bma.kiosk `06-FaceRecognition.tsx` +
   `06b-FacePhotoPreview.tsx`: a dashed bust guide (กรอบคน) that the user lines
   themselves up inside, then a still shot they can confirm or retake.
   (Replaced the 360° head-rotation enrollment ring — `useHeadPoseGestures` —
   on 2026-08-10 at the user's request.) */

const REF_AVATAR = '/illustration/registration/face-scan-ref.png';
const GUIDE = '/illustration/registration/face-photo-guide.svg';
const GUIDE_ACTIVE = '/illustration/registration/face-photo-guide-active.svg';

/* Guide artwork is 322×439 — the frame keeps that ratio at any width. */
const FRAME_RATIO = '322 / 439';
const FRAME_MAX_WIDTH = 322;

const GLOW_STYLE_ID = 'mih-face-frame-glow';

/* Idempotent injection so HMR re-runs replace the rule instead of stacking. */
const ensureGlowStyles = () => {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(GLOW_STYLE_ID);
  if (existing) existing.remove();
  const style = document.createElement('style');
  style.id = GLOW_STYLE_ID;
  style.textContent = `
    @keyframes mih-face-frame-glow {
      0%, 100% {
        filter: drop-shadow(0 0 4px rgba(99, 218, 172, 0.45)) drop-shadow(0 0 10px rgba(99, 218, 172, 0.25));
      }
      50% {
        filter: drop-shadow(0 0 12px rgba(99, 218, 172, 0.95)) drop-shadow(0 0 24px rgba(99, 218, 172, 0.5));
      }
    }
    .mih-face-frame-active { animation: mih-face-frame-glow 1.15s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      .mih-face-frame-active { animation: none; }
    }
  `;
  document.head.appendChild(style);
};

const CAPTION = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
  textAlign: 'center',
  margin: 0,
};

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

  const [cameraError, setCameraError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [shot, setShot] = useState(null);

  useEffect(ensureGlowStyles, []);

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
      setShot(null);
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

  /* Re-attach when the video node remounts (camera-error toggle, retake). */
  useEffect(() => {
    if (!open || shot || !streamRef.current || !videoRef.current) return;
    const el = videoRef.current;
    if (el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(() => setCameraError(true));
    }
  }, [open, shot, cameraError]);

  const detecting = open && !shot && cameraReady && !cameraError;
  const { modelStatus, faceInFrame } = useFaceInFrame(videoRef, detecting);

  /* No landmarker (model failed / unsupported) → keep the frame as a visual
     guide and let the operator judge the framing themselves. */
  const manualFraming = modelStatus === 'error';
  const framed = faceInFrame || manualFraming;
  const canCapture = cameraReady && !cameraError && framed;

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    setShot(canvas.toDataURL('image/jpeg', 0.92));
  }, []);

  const confirm = () => {
    onCapture?.(shot);
    onClose?.();
  };

  const statusText = shot
    ? 'ตรวจสอบรูปก่อนยืนยัน — ถ่ายใหม่ได้หากไม่ชัด'
    : cameraError
      ? 'ไม่สามารถเข้าถึงกล้องได้'
      : !cameraReady
        ? 'กำลังเปิดกล้อง โปรดรอสักครู่'
        : manualFraming
          ? 'จัดใบหน้าผู้รับบริการให้อยู่ในกรอบ แล้วกดถ่ายภาพ'
          : framed
            ? 'อยู่ในกรอบแล้ว — กดถ่ายภาพได้เลย'
            : 'ขยับให้ใบหน้าอยู่กลางกรอบ';

  const actions = shot
    ? [
        { key: 'retake', kind: 'secondary', label: 'ถ่ายใหม่', onClick: () => setShot(null) },
        { key: 'use', kind: 'primary', label: 'ใช้รูปนี้', onClick: confirm },
      ]
    : [
        { key: 'cancel', kind: 'secondary', label: 'ยกเลิก', onClick: onClose },
        { key: 'shoot', kind: 'primary', label: 'ถ่ายภาพ', onClick: capture, disabled: !canCapture },
      ];

  const avatarSrc = referencePhoto || REF_AVATAR;

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='ถ่ายรูปเพื่อยืนยันตัวตน'
      subtitle='วางใบหน้าให้อยู่ในกรอบ'
      size='default'
      showCloseButton
      actions={actions}
      bodyStyle={{ paddingRight: 'var(--dim-space-200)' }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <div
          className='flex items-center w-full overflow-hidden'
          style={{
            gap: 'var(--dim-space-200)',
            padding: 'var(--dim-space-200)',
            borderRadius: 'var(--dim-radius-300, 10px)',
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

        <div
          className='relative w-full mx-auto overflow-hidden'
          style={{
            maxWidth: FRAME_MAX_WIDTH,
            aspectRatio: FRAME_RATIO,
            borderRadius: 'var(--dim-radius-500, 16px)',
            background: 'var(--surface-neutral-tertiary, #F4F5F5)',
          }}
        >
          {shot ? (
            <img
              src={shot}
              alt='รูปที่ถ่ายเพื่อยืนยันตัวตน'
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : !cameraError ? (
            <>
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
              <img
                src={GUIDE}
                alt=''
                aria-hidden
                className='absolute inset-0 pointer-events-none'
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'fill',
                  opacity: framed ? 0 : 1,
                  transition: 'opacity 300ms',
                }}
              />
              <img
                src={GUIDE_ACTIVE}
                alt=''
                aria-hidden
                className={`absolute inset-0 pointer-events-none${framed ? ' mih-face-frame-active' : ''}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'fill',
                  opacity: framed ? 1 : 0,
                  transition: 'opacity 300ms',
                }}
              />
            </>
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

        <p style={CAPTION} role='status'>{statusText}</p>

        <p style={{
          margin: 0,
          color: 'var(--text-content-quaternary, #ADB2B7)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
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
