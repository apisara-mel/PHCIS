/* queueDisplayStyles — keyframes / utility class ของโมดูลจอ TV เรียกคิว

   ฉีดเป็น stylesheet แบบ idempotent ตอน module load (pattern เดียวกับ
   `src/components/search/AISearch.jsx`) เพื่อให้ HMR อัปเดตทับของเดิมได้
   โดยไม่ทิ้ง <style> ค้างไว้

   เหตุผลที่ต้องเป็น stylesheet ไม่ใช่ inline style:
   · @keyframes เขียนใน inline style ไม่ได้
   · Tailwind 2.1 ของโปรเจกต์นี้ compile `bg-[var(--x)]` เป็น CSS ว่าง จึงใช้
     arbitrary value class ไม่ได้เลย
   ทุกค่าใน stylesheet นี้ยัง alias token เหมือนกับ inline style ที่อื่น */

const STYLE_ID = 'mih-queue-display-styles';

const CSS = `
@keyframes qd-marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(var(--qd-marquee-shift, -50%)); }
}

@keyframes qd-pulse {
  0%   { transform: scale(1);    opacity: 1; }
  18%  { transform: scale(1.04); opacity: 0.55; }
  36%  { transform: scale(1);    opacity: 1; }
  54%  { transform: scale(1.04); opacity: 0.55; }
  72%  { transform: scale(1);    opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}

/* กล่องเลขคิวตอนถูกเรียกใหม่/เรียกซ้ำ — cancel ของเดิมอัตโนมัติเพราะ
   คลาสถูกถอดออกแล้วใส่ใหม่ ไม่มีการซ้อนแอนิเมชัน */
.qd-pulse {
  animation: qd-pulse 2.4s ease-in-out 1;
  will-change: transform, opacity;
}

.qd-marquee-track {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  animation-name: qd-marquee;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: transform;
}

/* จอ TV ไม่มีคนคุม — ซ่อน cursor เมื่อไม่ขยับ */
.qd-cursor-hidden,
.qd-cursor-hidden * { cursor: none !important; }

/* แถบชิป "หมายเลขที่เรียกผ่านไปแล้ว" เลื่อนแนวนอนได้โดยไม่โชว์ scrollbar */
.qd-hscroll {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.qd-hscroll::-webkit-scrollbar { display: none; }

/* ตัวเลขขนาด 300px+ บน Safari จะฟุ้งเมื่ออยู่ใน transform: scale()
   — บังคับ rasterise ให้คมและปิด subpixel jitter */
.qd-canvas {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: geometricPrecision;
  backface-visibility: hidden;
}

/* ช่องกรอกเลขคิวบนหน้าติดตามออนไลน์ — กรอบเป็นของ wrapper ตัวนอก
   จึงต้องถอด chrome ของ native input ให้หมดตาม CLAUDE.md
   (global focus reset ใน index.css คุมแค่ outline ไม่คุม border/box-shadow/
   -webkit-appearance จึงต้องใช้ !important) */
.mih-qd-ticket-input,
.mih-qd-ticket-input:focus,
.mih-qd-ticket-input:focus-visible {
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-qd-ticket-input::placeholder {
  color: var(--text-content-tertiary, #858C92);
  opacity: 1; /* Firefox default 0.54 */
}

@media (prefers-reduced-motion: reduce) {
  .qd-pulse { animation: none; }
  .qd-marquee-track { animation: none; }
}
`;

export const injectQueueDisplayStyles = () => {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  if (el.textContent !== CSS) el.textContent = CSS;
};

injectQueueDisplayStyles();

export default injectQueueDisplayStyles;
