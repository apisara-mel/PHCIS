import React from 'react';

import logoAnamai from '@/assets/queue-display/logo-anamai.png';
import clock24Src from '@/assets/queue-display/clock-24.svg';
import clock32FaceSrc from '@/assets/queue-display/clock-32-face.svg';
import clock32HandsSrc from '@/assets/queue-display/clock-32-hands.svg';
import volume2SpeakerSrc from '@/assets/queue-display/volume2-speaker.svg';
import volume2WaveInnerSrc from '@/assets/queue-display/volume2-wave-inner.svg';
import volume2WaveOuterSrc from '@/assets/queue-display/volume2-wave-outer.svg';
import triangleAlertBodySrc from '@/assets/queue-display/triangle-alert-body.svg';
import triangleAlertStemSrc from '@/assets/queue-display/triangle-alert-stem.svg';
import triangleAlertDotSrc from '@/assets/queue-display/triangle-alert-dot.svg';

/* queueDisplayUi — primitives ร่วมของโมดูลจอ TV เรียกคิว (TOR §1.3.4)

   ── ที่มาของ asset ──────────────────────────────────────────────────────
   ไอคอน/โลโก้ทุกตัว export ตรงจาก Figma file tobdR9prwt00v4X3aSMsxF
   (TV1 129:62395 · TV2 129:62394 · TV3 129:62393) แล้วดาวน์โหลดเก็บไว้ที่
   `src/assets/queue-display/` — ไม่มีการวาด SVG เองและไม่ดึง icon set อื่น
   (`src/components/icons/Icon.jsx` ไม่มี glyph volume-2 / triangle-alert
   และ repo ไม่ได้ติดตั้ง lucide-react)

   ไอคอนถูก render ผ่าน CSS mask (pattern เดียวกับ MaskIcon ใน
   `src/components/layout/SummaryCardsBar.jsx`) เพราะ SVG ที่ export มามีสี
   baked มาจาก Figma (เช่น clock-32 เป็นสีชมพู #F472B6 ของ "รอเข้าห้องตรวจ")
   ซึ่งใช้ไม่ได้กับจุดบริการสีอื่น — mask ทำให้ glyph รับสีจาก token จริง
   โดยยังใช้ "ไฟล์ที่ export มา" เป็นแหล่งรูปทรงเดียว

   ── หมายเหตุเรื่อง type scale ────────────────────────────────────────────
   ตัวเลขคิวใน Figma คือ 88 / 112 / 320px ซึ่ง **เกินสุดของ token ramp**
   (`--type-size-6xl` = 60px คือค่ามากสุดใน src/styles/tokens.css) จึงเขียน
   เป็น calc() ที่ alias token จริงพร้อมตัวคูณที่มองเห็นได้ แทนที่จะ hardcode
   ตัวเลข px ลอย ๆ — ดู DISPLAY_SIZE ด้านล่าง */

/* ── Design canvas ────────────────────────────────────────────────────────
   ขนาด artboard ของ Figma ทั้งสามจอ ใช้เป็นหน่วยของ transform scale
   (ไม่ใช่ค่า visual ที่ต้อง alias token — เป็นตัวเลขในสมการ layout) */
export const CANVAS_W = 1920;
export const CANVAS_H = 1270;

/* ── สีประจำแผนก ──────────────────────────────────────────────────────────
   ⚠ Figma ใช้ blue/400 #60A5FA และ pink/400 #F472B6 ซึ่ง **ไม่มี token**
   ใน src/styles/tokens.css — ใกล้สุดคือ *-bold (blue/500 #3B82F6,
   pink/500 #EC4899) จึงใช้ค่านั้นพร้อม fallback ที่ตรงกับค่าจริงของ token
   (ห้ามใส่ fallback #60A5FA/#F472B6 เพราะจะเป็น fallback ที่โกหก)
   มีเพียง indigo #818CF8 ที่ตรงเป๊ะ ทั้งหมดรายงานไว้ใน manifest notes */
export const ACCENT = {
  blue: 'var(--surface-colorfulbadge-blue-bold, #3B82F6)',
  pink: 'var(--surface-colorfulbadge-pink-bold, #EC4899)',
  indigo: 'var(--surface-colorfulbadge-indigo-bold, #818CF8)',
  grey: 'var(--text-colorfulbadge-grey, #4D5358)',
};

export const accentOf = (key) => ACCENT[key] || ACCENT.grey;

/* ── สีพื้น / ตัวอักษรที่ใช้ซ้ำทั้งสามจอ ─────────────────────────────────── */
export const SURFACE_CARD = 'var(--surface-card-100, #FFFFFF)';
/** Figma #F9FAFB — ใกล้สุดใน DS คือ neutral/50 #F9FBFB */
export const SURFACE_ROW_ALT = 'var(--surface-neutralButton-quaternary, #F9FBFB)';
/** Figma #F3F4F6 / #F5F6F7 — ใกล้สุดใน DS คือ neutral/100 #F4F5F5 */
export const SURFACE_STRIP = 'var(--surface-neutral-tertiary, #F4F5F5)';
/** Figma #0F172A (slate/900) — ไม่มี token, ใกล้สุดคือ text/content/default */
export const INK_STRONG = 'var(--text-content-default, #363B3F)';
export const INK_SECONDARY = 'var(--text-content-secondary, #636B72)';
export const INK_BRANDTAG = 'var(--text-brandtag-default, #4D5358)';
/** Figma #F04242 — ใกล้สุดใน DS คือ text/danger/secondary #DC2626 */
export const INK_DANGER = 'var(--text-danger-secondary, #DC2626)';
export const BORDER_HAIRLINE = 'var(--border-neutral-tertiary, #E2E4E6)';

export const FONT_DISPLAY = 'var(--type-family-heading-graphic2)';
export const FONT_BODY = 'var(--type-family-body)';

/* ── Display type scale ───────────────────────────────────────────────────
   ไม่มี token สำหรับ 88 / 112 / 320px และไม่มี --type-weight-extrabold (800)
   → alias --type-size-6xl (60px) แล้วคูณตามอัตราส่วนของ Figma
   → น้ำหนักใช้ --type-weight-bold (700) เพราะ index.html โหลดเฉพาะ
     Sarabun/Mitr 400–700 (ไม่มี Inter และไม่มีน้ำหนัก 800) — ห้าม import
     ฟอนต์ใหม่ตามสเปก จึงเป็นการเบี่ยงจาก Figma ที่รายงานไว้ใน manifest */
const SIZE_6XL = 'var(--type-size-6xl, 60px)';
export const DISPLAY_SIZE = {
  /** 320px = 60 × 5.3333 — เลขคิวยักษ์ TV2 */
  hero: (fit = 1) => `calc(${SIZE_6XL} * ${(5.3333 * fit).toFixed(4)})`,
  /** 112px = 60 × 1.8667 — เลขคิวปัจจุบัน TV1/TV3 */
  current: (fit = 1) => `calc(${SIZE_6XL} * ${(1.8667 * fit).toFixed(4)})`,
  /** 88px = 60 × 1.4667 — คิวถัดไป + คิวคงเหลือ ของ TV2 */
  rail: (fit = 1) => `calc(${SIZE_6XL} * ${(1.4667 * fit).toFixed(4)})`,
};

/** letter-spacing ของ Figma เป็นสัดส่วน −5% ของขนาดตัวอักษร (−5.6/112,
    −2.2/88 ≈ −2.5%, −1.76/88 = −2%) — ผูกกับ font-size เพื่อไม่ให้ล้นกล่อง
    ตอนตัวเลขยาวผิดปกติ */
export const trackingFor = (fontSize, ratio) => `calc(${fontSize} * ${ratio})`;

/** ตัวคูณย่อขนาดเลขคิวเมื่อยาวผิดปกติ (เช่น "ABC-1234" 8 ตัวอักษร)
    ป้องกันไม่ให้ล้นขอบ border ของกล่อง — edge case "เลขคิวยาวผิดปกติ" */
export const fitFactor = (text, baseLen = 5) => {
  const len = String(text || '').length;
  if (len <= baseLen) return 1;
  return Math.max(0.42, baseLen / len);
};

/* ── Glyphs จาก Figma (mask-recoloured) ───────────────────────────────── */

/** ชั้นเดียวของ glyph — ตำแหน่ง inset มาจาก Figma ตรง ๆ เพื่อรักษา geometry
    ของกล่องนอก (outer) และของ leaf ข้างในแยกกันตามที่ skill กำหนด */
const MaskLayer = ({ src, color, top, right, bottom, left }) => (
  <span
    aria-hidden
    style={{
      position: 'absolute',
      top,
      right,
      bottom,
      left,
      background: color,
      WebkitMaskImage: `url(${src})`,
      maskImage: `url(${src})`,
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
      WebkitMaskSize: '100% 100%',
      maskSize: '100% 100%',
    }}
  />
);

const GlyphBox = ({ size, children, title }) => (
  <span
    role={title ? 'img' : undefined}
    aria-label={title || undefined}
    aria-hidden={title ? undefined : true}
    style={{
      position: 'relative',
      display: 'inline-block',
      flexShrink: 0,
      width: size,
      height: size,
    }}
  >
    {children}
  </span>
);

/** Clock 24 — Figma "Clock" (MIH library 403:76080) · outer 24, leaf inset 4.17% */
export const ClockGlyph24 = ({ color = INK_BRANDTAG }) => (
  <GlyphBox size='var(--dim-size-500, 24px)'>
    <MaskLayer src={clock24Src} color={color} top='4.17%' right='4.17%' bottom='4.17%' left='4.17%' />
  </GlyphBox>
);

/** Clock 32 — Figma TV2 129:62218 · สองชั้น (หน้าปัด + เข็ม) */
export const ClockGlyph32 = ({ color = INK_SECONDARY }) => (
  <GlyphBox size='var(--dim-size-600, 32px)'>
    <MaskLayer src={clock32FaceSrc} color={color} top='4.28%' right='4.28%' bottom='4.28%' left='4.28%' />
    <MaskLayer src={clock32HandsSrc} color={color} top='20.87%' right='29.19%' bottom='37.56%' left='45.88%' />
  </GlyphBox>
);

/** volume-2 48 — Figma TV2 129:62204 · สามชั้น (ลำโพง + คลื่นใน + คลื่นนอก) */
export const Volume2Glyph = ({ color = INK_STRONG }) => (
  <GlyphBox size='var(--dim-size-1000, 48px)'>
    <MaskLayer src={volume2SpeakerSrc} color={color} top='12.49%' right='50%' bottom='12.49%' left='4.17%' />
    <MaskLayer src={volume2WaveInnerSrc} color={color} top='33.33%' right='25%' bottom='33.33%' left='62.5%' />
    <MaskLayer src={volume2WaveOuterSrc} color={color} top='19.32%' right='4.17%' bottom='19.32%' left='76.52%' />
  </GlyphBox>
);

/** triangle-alert 24 — Figma 129:62492 · สามชั้น (กรอบ + ขีด + จุด) */
export const TriangleAlertGlyph = ({ color = INK_DANGER }) => (
  <GlyphBox size='var(--dim-size-500, 24px)'>
    <MaskLayer src={triangleAlertBodySrc} color={color} top='8.28%' right='4.18%' bottom='8.33%' left='4.09%' />
    <MaskLayer src={triangleAlertStemSrc} color={color} top='33.33%' right='45.83%' bottom='41.67%' left='45.83%' />
    <MaskLayer src={triangleAlertDotSrc} color={color} top='66.67%' right='45.79%' bottom='25%' left='45.83%' />
  </GlyphBox>
);

/* เส้นคั่นแถวของราง "คิวถัดไป" บน TV2 (Figma 129:62231, 572×2) วาดด้วย
   borderBottom ของ RailRow ใน StationDisplayPage — geometry เดียวกันแต่ไม่ต้อง
   โหลด asset เพิ่ม จึงไม่มี component RowDivider (และไฟล์ row-divider.svg
   ถูกลบออกจาก src/assets/queue-display/ แล้ว) */

/** โลโก้สำนักอนามัย — ไฟล์ PNG ที่ export จาก Figma (129:62043) */
export const AnamaiLogo = ({ size = 'var(--dim-size-1500, 68px)' }) => (
  <img
    src={logoAnamai}
    alt='ตราสัญลักษณ์สำนักอนามัย กรุงเทพมหานคร'
    style={{ width: size, height: size, objectFit: 'cover', flexShrink: 0, pointerEvents: 'none' }}
  />
);

/* ── Material Symbols helper ─────────────────────────────────────────────
   ใช้เฉพาะหน้าเจ้าหน้าที่ / launcher / mobile ที่ไม่ได้ผูกกับ node Figma
   (pattern เดียวกับ src/pages/kiosk/kioskUi.jsx) */
export const Sym = ({ name, size = 24, color, fill = false }) => (
  <span
    aria-hidden
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      lineHeight: 1,
      color: color || 'inherit',
      fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      userSelect: 'none',
    }}
  >
    {name}
  </span>
);

/** ตัดบรรทัดเดียวด้วย ellipsis — ใช้กับชื่อจุดบริการที่ยาวเกินหัวการ์ด/header */
export const ELLIPSIS_ONE_LINE = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
};

export default {
  CANVAS_W,
  CANVAS_H,
  ACCENT,
  accentOf,
  DISPLAY_SIZE,
  fitFactor,
};
