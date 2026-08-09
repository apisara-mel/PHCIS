import React, { useRef, useState } from 'react';
import Popover from '@/components/popup/Popover';
import Icon from '@/components/icons/Icon';
import BrandIconButton from '@/components/button/BrandIconButton';

/* RowActionMenu — เมนู ⋮ ประจำแถว/การ์ด
   ══════════════════════════════════════════════════════════════════════
   ปุ่ม more_vert + Popover รายการคำสั่ง เดิมโค้ดชุดนี้ถูกเขียนซ้ำในหน้าคิว
   (QueueCenterConsolePage) จึงยกออกมาให้หน้าอื่นเรียกใช้ได้ตรง ๆ แทนการ
   คัดลอก markup ไปทั้งก้อน.

   items: [{ key, icon, label, onClick, disabled?, danger? }]

   ยังไม่มีใน MIH Design System — ลงทะเบียนไว้ที่ docs/awaiting-components.md
   ตอนนี้มีผู้ใช้ 2 ที่ (โครงสร้างศูนย์ + สิทธิการเข้าถึง) จึงเข้าเกณฑ์เสนอ
   ยกขึ้น DS แล้ว. */

export default function RowActionMenu({
  items = [],
  ariaLabel = 'ตัวเลือกเพิ่มเติม',
  size = 'sm',
  variant = 'quaternary',
  minWidth = 'var(--dim-size-2050, 220px)',
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);

  if (!items.length) return null;

  return (
    <>
      <span ref={anchorRef} className='inline-flex'>
        <BrandIconButton
          icon='more_vert'
          size={size}
          variant={variant}
          aria-label={ariaLabel}
          aria-haspopup='menu'
          aria-expanded={open}
          onClick={(e) => { e.stopPropagation?.(); setOpen((v) => !v); }}
        />
      </span>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} style={{ zIndex: 1600 }}>
        <div
          role='menu'
          className='flex flex-col'
          style={{
            minWidth,
            background: 'var(--surface-card-100)',
            borderRadius: 'var(--dim-radius-300, 10px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
            boxShadow: 'var(--shadow-drop-bottom-400)',
            paddingTop: 'var(--dim-space-100)',
            paddingBottom: 'var(--dim-space-100)',
          }}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type='button'
              role='menuitem'
              disabled={item.disabled}
              onClick={() => { setOpen(false); item.onClick?.(); }}
              className='w-full flex items-center text-left'
              style={{
                gap: 'var(--dim-space-300)',
                paddingTop: 'var(--dim-space-200)',
                paddingRight: 'var(--dim-space-400)',
                paddingBottom: 'var(--dim-space-200)',
                paddingLeft: 'var(--dim-space-400)',
                background: 'transparent',
                border: 'none',
                color: item.disabled
                  ? 'var(--text-content-tertiary)'
                  : item.danger ? 'var(--text-danger-default)' : 'var(--text-content-default)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                opacity: item.disabled ? 0.55 : 1,
                cursor: item.disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {item.icon ? <Icon name={item.icon} size={18} /> : null}
              {item.label}
            </button>
          ))}
        </div>
      </Popover>
    </>
  );
}
