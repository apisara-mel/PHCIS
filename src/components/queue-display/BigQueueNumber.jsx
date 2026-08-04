import React from 'react';
import './queueDisplayStyles';
import {
  DISPLAY_SIZE,
  FONT_BODY,
  FONT_DISPLAY,
  INK_SECONDARY,
  INK_STRONG,
  SURFACE_CARD,
  fitFactor,
  trackingFor,
} from './queueDisplayUi';

/* BigQueueNumber — กล่องเลขคิวปัจจุบัน

   variant='default'  Figma TV1 129:62061 / TV3 129:62308
                      กรอบ 6px · radius 24px · ตัวเลข 112px
   variant='hero'     Figma TV2 129:62215
                      กรอบ 8px · radius 24px · ตัวเลข 320px

   ⚠ TOKEN GAP: Figma ใช้ dimension/stroke/600 = 6px สำหรับ variant default
   แต่ `src/styles/tokens.css` มีแค่ stroke 100/150/200/400/500/800 —
   ไม่มี 600 จึงใช้ --dim-stroke-500 (5px) ซึ่งเป็น stroke token จริงและ
   fallback ตรงกับค่าจริงของ token (ห้ามเขียน fallback 6px เพราะจะโกหก)
   ต้องเสนอเพิ่ม --dim-stroke-600: 6px ที่ repo mih-design → รายงานใน manifest
   variant='hero' ใช้ 8px = --dim-stroke-800 ซึ่งมีจริงและตรงเป๊ะ

   Edge cases:
   · ยังไม่มีคิว → แสดง "—" + คำว่า "ยังไม่มีคิว" (ไม่ปล่อยกล่องว่าง)
   · เลขคิวยาวผิดปกติ (เช่น ABC-1234) → ย่อขนาดตามความยาวด้วย fitFactor
     พร้อม letter-spacing ที่ผูกกับ font-size จึงไม่ล้นขอบกรอบ */

const VARIANT = {
  default: {
    borderWidth: 'var(--dim-stroke-500, 5px)',
    size: DISPLAY_SIZE.current,
    baseLen: 5,
    tracking: -0.05,
    emptySize: 'var(--type-size-3xl, 30px)',
  },
  hero: {
    borderWidth: 'var(--dim-stroke-800, 8px)',
    size: DISPLAY_SIZE.hero,
    baseLen: 5,
    tracking: -0.0175,
    emptySize: 'var(--type-size-5xl, 48px)',
  },
};

const BigQueueNumber = ({
  number,
  accent,
  variant = 'default',
  pulsing = false,
  emptyLabel = 'ยังไม่มีคิว',
  ariaLabel,
}) => {
  const cfg = VARIANT[variant] || VARIANT.default;
  const hasNumber = !!number;
  const fontSize = cfg.size(fitFactor(number, cfg.baseLen));

  return (
    <div
      /* กล่องเปลี่ยน key ตาม pulsing ไม่ได้ — ใช้คลาสสลับแทน จึงถอด/ใส่
         คลาสทีเดียว ไม่มีแอนิเมชันซ้อนกันตอนเรียกซ้ำถี่ ๆ */
      className={pulsing ? 'qd-pulse' : undefined}
      role='status'
      aria-live='assertive'
      aria-label={ariaLabel || (hasNumber ? `หมายเลขปัจจุบัน ${number}` : emptyLabel)}
      style={{
        flex: '1 1 0%',
        minHeight: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        background: SURFACE_CARD,
        borderStyle: 'solid',
        borderWidth: cfg.borderWidth,
        borderColor: accent,
        borderRadius: 'var(--dim-radius-600, 24px)',
        paddingLeft: 'var(--dim-space-600, 24px)',
        paddingRight: 'var(--dim-space-600, 24px)',
        overflow: 'hidden',
      }}
    >
      {hasNumber ? (
        <span
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'center',
            fontFamily: FONT_BODY,
            fontSize,
            fontWeight: 'var(--type-weight-bold, 700)',
            lineHeight: 1.05,
            letterSpacing: trackingFor(fontSize, cfg.tracking),
            color: INK_STRONG,
          }}
        >
          {number}
        </span>
      ) : (
        <React.Fragment>
          <span
            style={{
              display: 'block',
              fontFamily: FONT_BODY,
              fontSize,
              fontWeight: 'var(--type-weight-bold, 700)',
              lineHeight: 1.05,
              color: INK_SECONDARY,
            }}
          >
            —
          </span>
          <span
            style={{
              display: 'block',
              marginTop: 'var(--dim-space-200, 8px)',
              fontFamily: FONT_DISPLAY,
              fontSize: cfg.emptySize,
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.375,
              color: INK_SECONDARY,
            }}
          >
            {emptyLabel}
          </span>
        </React.Fragment>
      )}
    </div>
  );
};

export default BigQueueNumber;
