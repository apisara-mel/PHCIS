import React from 'react';
import { createPortal } from 'react-dom';

/* NestedPopupPanel — overlay panel ภายใน Popup แม่ (ไม่สร้าง backdrop ชั้นที่สอง)
   ใช้แทนการเปิด Popup ซ้อน Popup สำหรับ confirm / form / picker ย่อย */

if (typeof document !== 'undefined' && !document.getElementById('mih-nested-popup-panel-style')) {
  const css = document.createElement('style');
  css.id = 'mih-nested-popup-panel-style';
  css.textContent = `
.mih-nested-popup-panel {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--surface-modal-default);
  overflow: hidden;
}
.mih-nested-popup-panel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: clip;
  -webkit-overflow-scrolling: touch;
}
@media (prefers-reduced-motion: reduce) {
  .mih-nested-popup-panel[data-direction="forward"],
  .mih-nested-popup-panel[data-direction="backward"] {
    animation: none !important;
  }
}
`;
  document.head.appendChild(css);
}

export default function NestedPopupPanel({
  open,
  direction = 'forward',
  children,
  className = '',
  bodyClassName = '',
}) {
  if (!open) return null;

  return (
    <div
      className={`mih-nested-popup-panel ${className}`.trim()}
      data-direction={direction}
      role='region'
      aria-modal='true'
    >
      <div className={`mih-nested-popup-panel__body ${bodyClassName}`.trim()}>
        {children}
      </div>
    </div>
  );
}

/** ตรวจว่ามี Popup เปิดอยู่ — ใช้ตัดสินใจ render แบบ nested แทน Popup ซ้อน */
export function hasVisiblePopupOverlay() {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector('.mih-popup-overlay[data-state="visible"]'));
}

/** dialog ชั้นบนสุดของ popup stack — ใช้เป็น portal target สำหรับ nested panel */
export function getTopPopupDialog() {
  if (typeof document === 'undefined') return null;
  const overlays = document.querySelectorAll('.mih-popup-overlay[data-state="visible"]');
  if (!overlays.length) return null;
  return overlays[overlays.length - 1].querySelector('.mih-popup-dialog');
}

/** Portal children เข้า dialog ชั้นบนสุด (overlay ภายใน popup แม่) */
export function portalNestedToTopPopup(children, open) {
  if (!open || typeof document === 'undefined') return null;
  const dialog = getTopPopupDialog();
  if (!dialog) return null;
  return createPortal(children, dialog);
}
