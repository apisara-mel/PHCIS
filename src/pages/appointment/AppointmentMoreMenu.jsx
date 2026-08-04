import React, { useEffect, useRef, useState } from 'react';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ActionList from '@/components/list/ActionList';

/* เมนู "เพิ่มเติม" ของระบบนัดหมาย — รวมทางเข้าที่ใช้ไม่บ่อย (นัดต่อเนื่อง /
   รูปแบบการนัดหมาย / ตั้งค่าระบบ) ไว้จุดเดียว เพื่อให้แถบ action ของหน้าหลัก
   เหลือ CTA หลักเพียงชุดเดียว (Nielsen #8 · Krug "อย่าให้ต้องคิด").

   ไม่มี dropdown-menu กลางใน design.md §6 (มีแต่ OverflowFlexRow ที่ซ่อนตาม
   ความกว้าง ซึ่งเป็นคนละพฤติกรรม) จึงประกอบจาก NeutralSubdueButton + ActionList
   ที่มีอยู่แล้ว — ไม่ได้สร้าง visual ใหม่. */

const AppointmentMoreMenu = ({ items = [], label = 'เพิ่มเติม' }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className='relative shrink-0'>
      <NeutralSubdueButton
        variant='outline'
        size='lg'
        leadingIcon='more_horiz'
        aria-haspopup='menu'
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </NeutralSubdueButton>

      {open ? (
        <div
          role='menu'
          className='absolute right-0 flex flex-col'
          style={{
            top: 'calc(100% + var(--dim-space-200, 8px))',
            minWidth: 'var(--dim-size-2450, 280px)',
            zIndex: 1300,
            paddingTop: 'var(--dim-space-200, 8px)',
            paddingBottom: 'var(--dim-space-200, 8px)',
            paddingLeft: 'var(--dim-space-200, 8px)',
            paddingRight: 'var(--dim-space-200, 8px)',
            gap: 'var(--dim-space-050, 2px)',
            borderRadius: 'var(--dim-radius-300, 10px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-dropdown-default)',
            background: 'var(--surface-card-100)',
            boxShadow: 'var(--shadow-dropdown)',
          }}
        >
          {items.map((item) => (
            <ActionList
              key={item.key || item.label}
              as='button'
              role='menuitem'
              label={item.label}
              subtext={item.subtext}
              showSubtext={!!item.subtext}
              leadingIcon={item.icon}
              showSwitch={false}
              showBadge={false}
              showCheck={false}
              showChevronRight={false}
              onClick={() => { setOpen(false); item.onSelect?.(); }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default AppointmentMoreMenu;
