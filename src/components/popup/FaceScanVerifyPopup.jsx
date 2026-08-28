import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import { useHeadPoseGestures, GESTURE_KEYS } from '@/lib/useHeadPoseGestures';
import { useFaceInFrame } from '@/lib/useFaceInFrame';
import TabCapsule from '@/components/tab/TabCapsule';
import Checkbox from '@/components/checkbox/Checkbox';
import StatusBadge from '@/components/badge/StatusBadge';

/* MIH FaceScanVerifyPopup — Figma PHCIS-Registration 402:52908 chrome.

   Capture method: **การถ่าย 360 องศา** — iOS Face ID–style enrollment ported
   from bma.kiosk `06-FaceRecognition.tsx` + `useHeadPoseGestures.ts` (ring of
   64 ticks, 4 discrete head poses held 500 ms each), then one still frame the
   operator confirms against the reference photo.

   ⚠️ วิธีถ่ายสลับไปมาแล้วสองรอบ — 360° → กรอบคนถ่ายนิ่ง (10 ส.ค. 69) → 360°
   (27 ส.ค. 69) สุดท้ายเลิกสลับ **ให้เลือกได้ทั้งสองแบบในป๊อปอัปเดียว** โดย
   ค่าเริ่มต้นคือ 360° (มติผู้ใช้ 27 ส.ค. 69) — ทั้งสอง hook จึงต้องอยู่ครบ
   ห้ามลบตัวใดตัวหนึ่ง · รายละเอียดอยู่ในสกิล `face-identity-capture`

   hook ทั้งคู่ถูกเรียกเสมอ (กฎ hooks ห้ามเรียกแบบมีเงื่อนไข) แต่ส่ง `active`
   ให้ทำงานเฉพาะโหมดที่เลือก อีกตัวจะรีเซ็ตตัวเองและไม่แตะกล้อง */

const REF_AVATAR = '/illustration/registration/face-scan-ref.png';
/* กรอบคนของโหมด "ถ่ายหน้าตรง" — artwork 322×439 */
const GUIDE = '/illustration/registration/face-photo-guide.svg';
const GUIDE_ACTIVE = '/illustration/registration/face-photo-guide-active.svg';
const FRONT_FRAME_RATIO = '322 / 439';

const MODE_360 = '360';
const MODE_FRONT = 'front';

/* วงแหวนความคืบหน้า — ค่าเดียวกับ kiosk (Figma node 92:8516) เพื่อให้สองที่
   ดูเป็นตัวเดียวกัน: ขีด 64 ขีด ไม่ใช่ arc ต่อเนื่อง */
const RING_TICKS = 64;
const RING_FADE_TICKS = 3;

/* ⚠️ TOKEN DEBT — สี่ค่านี้ยังไม่มี token
   ใน Figma (MIH Design System — Popup `404:17893` / kiosk `92:8516`) วงแหวนนี้
   ถูกวาดด้วย hex ดิบ ไม่ได้ผูกกับ variable จึงไม่มีอะไรให้ alias ใน design.md
   ค่าที่ใกล้ที่สุดในระบบไม่ตรงพอจะสลับเงียบ ๆ (brand-p400 #6ad6a5 ต่างจาก
   ring green ~Δ11 · surface-profile-avatar-default #cfe6f7 ต่างจาก ring rest ~Δ8)
   ต้องเพิ่ม token ใน repo `mih-design` (design.md + tokens.css) แล้ว
   `npm run tokens:pull` — จนกว่าจะทำ ค่าพวกนี้รวมไว้ที่เดียวตรงนี้เท่านั้น
   ห้ามกระจายไปตามที่อื่น */
const RING_GREEN = '#63daac';   /* ขีดที่สแกนแล้ว */
const RING_FADE = '#b4f7dd';    /* สามขีดถัดไป ไล่จาง */
const RING_BLUE = '#cfe8ff';    /* ขีดที่ยังไม่ถึง */

/* กล้องหรือโมเดลใช้ไม่ได้ → เดินความคืบหน้าเองใน 3 วิ ไม่ปล่อยให้ค้าง */
const FALLBACK_DURATION_MS = 3000;
const FALLBACK_TICK_MS = 60;

const POSE_LABELS = {
  center: 'ตรงกลาง',
  left: 'ด้านซ้าย',
  right: 'ด้านขวา',
  up: 'เงยขึ้น',
};

/* Figma 130:29033 — พื้นหลังวงกล้องก่อนภาพขึ้น · token debt ชุดเดียวกับวงแหวน */
const CAMERA_BG = '#eaf5ff';

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

/* ขีดวงแหวน — ขีดที่ scan แล้วเป็นเขียว ไล่จางสามขีดถัดไป ที่เหลือฟ้า */
const ProgressRing = ({ progress }) => {
  const litCount = Math.round((progress / 100) * RING_TICKS);
  const ticks = useMemo(() => Array.from({ length: RING_TICKS }, (_, i) => i), []);
  return (
    <svg
      viewBox='0 0 100 100'
      aria-hidden
      className='absolute inset-0 pointer-events-none'
      style={{ width: '100%', height: '100%' }}
    >
      {ticks.map((i) => {
        const lit = i < litCount;
        const fading = !lit && i < litCount + RING_FADE_TICKS;
        return (
          <rect
            key={i}
            x={49.4}
            y={1.5}
            width={1.2}
            height={6}
            rx={0.6}
            fill={lit ? RING_GREEN : fading ? RING_FADE : RING_BLUE}
            transform={`rotate(${(360 / RING_TICKS) * i} 50 50)`}
            style={{ transition: 'fill 200ms ease' }}
          />
        );
      })}
    </svg>
  );
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
  /** % ความตรงของใบหน้า (mock — ของจริงมาจากบริการเปรียบเทียบใบหน้า)
      ค่าเดียวกับที่ผู้เรียกเขียนลง `faceMatchScore` */
  matchScore = 96,
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraError, setCameraError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [shot, setShot] = useState(null);
  const [comparisonConfirmed, setComparisonConfirmed] = useState(false);
  /* ค่าเริ่มต้น = 360° (มติผู้ใช้ 27 ส.ค. 69) */
  const [mode, setMode] = useState(MODE_360);

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
      setComparisonConfirmed(false);
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
  const is360 = mode === MODE_360;
  const { modelStatus, angles } = useHeadPoseGestures(videoRef, detecting && is360);
  const { modelStatus: frontModelStatus, faceInFrame } = useFaceInFrame(videoRef, detecting && !is360);

  /* ความคืบหน้าจริง = ท่าที่ผ่านแล้ว × 25% (4 ท่า) */
  const doneCount = GESTURE_KEYS.filter((k) => angles[k]).length;
  const poseProgress = (doneCount / GESTURE_KEYS.length) * 100;

  /* กล้องเปิดไม่ได้ หรือโมเดลโหลดไม่ขึ้น → เดินความคืบหน้าเองแทนการค้าง
     (เหมือน kiosk) เจ้าหน้าที่ยังถ่ายรูปให้ผู้รับบริการได้ */
  const simulating = open && !shot && is360 && (cameraError || modelStatus === 'error');
  const [simProgress, setSimProgress] = useState(0);
  useEffect(() => {
    if (!simulating) { setSimProgress(0); return undefined; }
    const step = (100 * FALLBACK_TICK_MS) / FALLBACK_DURATION_MS;
    const id = setInterval(() => {
      setSimProgress((v) => (v >= 100 ? 100 : Math.min(100, v + step)));
    }, FALLBACK_TICK_MS);
    return () => clearInterval(id);
  }, [simulating]);

  const progress = simulating ? simProgress : poseProgress;
  const scanComplete = progress >= 100;

  /* โหมดหน้าตรง — โมเดลพังก็ยังถ่ายได้ กรอบกลายเป็นแค่ตัวช่วยเล็ง */
  const manualFraming = frontModelStatus === 'error';
  const framed = faceInFrame || manualFraming;

  const canCapture = is360
    ? (scanComplete && !cameraError)
    : (cameraReady && !cameraError && framed);

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
    setComparisonConfirmed(false);
  }, []);

  const confirm = () => {
    if (!shot || !comparisonConfirmed) return;
    onCapture?.(shot);
    onClose?.();
  };

  /* เกณฑ์ผ่านของ mock — ต่ำกว่านี้ให้เจ้าหน้าที่ดูเองว่าจะใช้รูปหรือถ่ายใหม่ */
  const matchTone = matchScore >= 80 ? 'success' : matchScore >= 60 ? 'warning' : 'error';

  /* ก่อนติ๊กยืนยันไม่มีข้อความบอกสถานะ (มติผู้ใช้ 28 ส.ค. 69) — ประโยคเดิมบอก
     สิ่งที่หน้าจอแสดงอยู่แล้ว (คะแนนความตรง สองรูปเทียบกัน ปุ่มถ่ายใหม่) และไป
     แย่งความสนใจจากช่องติ๊กยืนยันที่อยู่ถัดลงมา ซึ่งเป็นสิ่งที่ต้องทำจริง */
  const statusText = shot
    ? (comparisonConfirmed
        ? 'ตรวจสอบเรียบร้อย — รูปทั้งสองเป็นบุคคลเดียวกัน'
        : '')
    : cameraError
      ? 'ไม่สามารถเข้าถึงกล้องได้ — ระบบกำลังเดินขั้นตอนให้แทน'
      : !cameraReady
        ? 'กำลังเปิดกล้อง โปรดรอสักครู่'
        : !is360
          ? (manualFraming
              ? 'จัดใบหน้าผู้รับบริการให้อยู่ในกรอบ แล้วกดถ่ายภาพ'
              : framed
                ? 'อยู่ในกรอบแล้ว — กดถ่ายภาพได้เลย'
                : 'ขยับให้ใบหน้าอยู่กลางกรอบ')
          : simulating
            ? 'ตรวจจับใบหน้าไม่ได้ — ระบบกำลังเดินขั้นตอนให้แทน'
            : scanComplete
              ? 'สแกนครบทุกด้านแล้ว — กำลังบันทึกภาพ'
              : '';

  /* ครบทั้งสี่ท่า → ถ่ายให้เองหลัง 800 ms (เท่ากับที่ kiosk หน่วงก่อนไปหน้าถัดไป)
     ดีไซน์ Figma 404:17893 ไม่มีปุ่มระหว่างสแกน — ออกได้ทางปุ่ม X มุมบน */
  useEffect(() => {
    if (!is360 || !canCapture || shot) return undefined;
    const id = setTimeout(capture, 800);
    return () => clearTimeout(id);
  }, [is360, canCapture, shot, capture]);

  const actions = shot
    ? [
        { key: 'retake', kind: 'secondary', label: 'ถ่ายใหม่', onClick: () => setShot(null) },
        { key: 'use', kind: 'primary', label: 'ใช้รูปนี้', onClick: confirm, disabled: !comparisonConfirmed },
      ]
    : is360
      ? []
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

        {/* เลือกวิธีถ่าย — ค่าเริ่มต้น 360° · เปลี่ยนได้ก่อนเริ่มถ่ายเท่านั้น
            (ถ่ายไปแล้วเปลี่ยนโหมดกลางคันจะสับสนว่ารูปมาจากวิธีไหน) */}
        {!shot && (
          <div className='flex items-center justify-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <TabCapsule
              variant='filter'
              label='ถ่าย 360°'
              selected={is360}
              onClick={() => setMode(MODE_360)}
            />
            <TabCapsule
              variant='filter'
              label='ถ่ายหน้าตรง'
              selected={!is360}
              onClick={() => setMode(MODE_FRONT)}
            />
          </div>
        )}

        {/* Figma 404:17850 — หัวข้อจริงอยู่ในเนื้อ ไม่ใช่ subtitle ของ Popup */}
        {!shot && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-050, 2px)', textAlign: 'center' }}>
            <span style={{
              color: 'var(--text-content-default)',
              fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-heading-content))',
              fontSize: 'var(--type-size-xl)',
              lineHeight: 1.375,
            }}>
              {is360 ? 'สแกนใบหน้าเพื่อยืนยันตัวตน' : 'ถ่ายรูปหน้าตรงเพื่อยืนยันตัวตน'}
            </span>
            <span style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.5,
            }}>
              {is360
                ? 'ค่อยๆ หมุนศีรษะเป็นวงกลมช้าๆ จนกรอบรอบใบหน้าครบวง'
                : 'วางใบหน้าให้อยู่ในกรอบ แล้วกดถ่ายภาพ'}
            </span>
          </div>
        )}

        <div
          className='relative w-full mx-auto'
          style={{
            maxWidth: FRAME_MAX_WIDTH,
            /* 360° = จัตุรัส (วงแหวนเป็นวงกลม) · หน้าตรง = 322/439 ตาม artwork
               กรอบคน · เฟสเทียบรูปสูงตามเนื้อหา */
            aspectRatio: shot ? undefined : (is360 ? '1 / 1' : FRONT_FRAME_RATIO),
          }}
        >
          {shot ? (
            /* เทียบสองรูป — ไม่มีพื้นเทาครอบ, สองรูปกว้างเท่ากันและชิดบนตรงกัน
               (มติผู้ใช้ 27 ส.ค. 69) คำบรรยายสองบรรทัดฝั่งขวาเคยดันรูปให้เหลื่อม
               จึงจัด items-start แล้วให้ตัวรูปเป็นแถวของมันเอง */
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
                {[
                  { src: shot, alt: 'รูปที่ถ่ายเพื่อยืนยันตัวตน', caption: 'รูปถ่ายปัจจุบัน', position: 'center' },
                  { src: avatarSrc, alt: 'รูปถ่ายจากบัตรประชาชน', caption: 'รูปจากบัตรประชาชน', position: 'center 12%' },
                ].map((item) => (
                  <div key={item.caption} className='flex flex-col items-center min-w-0' style={{ gap: 'var(--dim-space-100)', flex: '1 1 0' }}>
                    <img
                      src={item.src}
                      alt={item.alt}
                      style={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        objectFit: 'cover',
                        objectPosition: item.position,
                        display: 'block',
                        borderRadius: 'var(--dim-radius-300, 10px)',
                      }}
                    />
                    <span style={{
                      color: 'var(--text-content-secondary)',
                      fontSize: 'var(--type-size-xs)',
                      fontFamily: 'var(--type-family-body)',
                      lineHeight: 1.5,
                      textAlign: 'center',
                      whiteSpace: 'pre-line',
                    }}>
                      {item.caption}
                    </span>
                  </div>
                ))}
              </div>

              {/* ผลการเปรียบเทียบ — บอกเป็น % ไม่ใช่แค่ผ่าน/ไม่ผ่าน */}
              <div className='flex items-center justify-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
                <StatusBadge
                  size='default'
                  style={matchTone}
                  icon={matchTone === 'success' ? 'check_circle' : 'error'}
                >
                  {`ความตรงของใบหน้า ${matchScore}%`}
                </StatusBadge>
              </div>
            </div>
          ) : !cameraError ? (
            is360 ? (
              <>
                {/* กล้องเป็นวงกลมอยู่ในวงแหวน — สัดส่วนเดียวกับ kiosk (inset 13.33%) */}
                <div
                  className='absolute overflow-hidden'
                  style={{
                    inset: '13.33%',
                    borderRadius: 'var(--dim-radius-full, 9999px)',
                    /* Figma 130:29033 — ขอบขาวหนา 10 กันวงแหวนชนขอบภาพ */
                    background: CAMERA_BG,
                    /* Figma วาดขอบ 10 แต่ token สเกลนี้มีถึง stroke-800 = 8px */
                    border: `var(--dim-stroke-800) solid ${scanComplete ? RING_GREEN : 'var(--surface-card-100)'}`,
                    transition: 'border-color 300ms',
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onPlaying={() => setCameraReady(true)}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)',
                      display: 'block',
                    }}
                  />
                </div>
                <div className={scanComplete ? 'mih-face-frame-active absolute inset-0' : 'absolute inset-0'}>
                  <ProgressRing progress={progress} />
                </div>
              </>
            ) : (
              /* โหมดหน้าตรง — กรอบคนเส้นประ เปลี่ยนเป็นเส้นเรืองแสงเมื่อเข้ากรอบ */
              <div
                className='absolute inset-0 overflow-hidden'
                style={{
                  borderRadius: 'var(--dim-radius-500, 16px)',
                  background: 'var(--surface-neutral-tertiary, #F4F5F5)',
                }}
              >
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
                    width: '100%', height: '100%', objectFit: 'fill',
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
                    width: '100%', height: '100%', objectFit: 'fill',
                    opacity: framed ? 1 : 0,
                    transition: 'opacity 300ms',
                  }}
                />
              </div>
            )
          ) : (
            <div
              className='absolute inset-0 flex items-center justify-center text-center'
              style={{
                padding: 'var(--dim-space-400)',
                borderRadius: 'var(--dim-radius-500, 16px)',
                background: 'var(--surface-neutral-tertiary, #F4F5F5)',
              }}
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

        {/* Figma 404:17847 — ตัวเลขความคืบหน้าตัวใหญ่กลางจอ (เฉพาะโหมด 360°) */}
        {!shot && is360 && (
          <p style={{
            margin: 0,
            color: 'var(--text-content-default)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-5xl)',
            /* Figma ใช้ Sarabun ExtraBold (800) แต่ token หนักสุดคือ bold 700 */
            fontWeight: 'var(--type-weight-bold)',
            textAlign: 'center',
          }}>
            {Math.round(progress)}%
          </p>
        )}

        {/* Figma 404:17880 — ท่าทั้งสี่เป็น StatusBadge ติ๊กเมื่อค้างท่านั้นครบ 500 ms */}
        {!shot && is360 && (
          <div className='flex items-center justify-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            {GESTURE_KEYS.map((key, i) => {
              const done = simulating ? progress >= (i + 1) * 25 : !!angles[key];
              return (
                <StatusBadge
                  key={key}
                  size='default'
                  style={done ? 'success' : 'neutral'}
                  icon={done ? 'check_circle' : undefined}
                  showDot={!done}
                >
                  {POSE_LABELS[key]}
                </StatusBadge>
              );
            })}
          </div>
        )}

        {statusText && <p style={CAPTION} role='status'>{statusText}</p>}

        {shot && (
          <Checkbox
            checked={comparisonConfirmed}
            onChange={setComparisonConfirmed}
            label='ยืนยันว่ารูปถ่ายปัจจุบันเป็นบุคคลเดียวกับรูปจากบัตรประชาชน'
            description='ตรวจสอบใบหน้าให้ตรงกันก่อนกดยืนยัน ระบบจะเก็บผลการตรวจสอบไว้ในประวัติการใช้งาน'
            style={{ width: '100%' }}
          />
        )}

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
