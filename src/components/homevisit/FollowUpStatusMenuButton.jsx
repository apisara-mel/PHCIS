import React, { useLayoutEffect, useRef, useState } from 'react';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Popover from '@/components/popup/Popover';
import ActionList from '@/components/list/ActionList';

/* SubHeader "ติดตามสถานะ" split button (งานเยี่ยมบ้าน)
   ══════════════════════════════════════════════════════════════════
   ทีมเยี่ยมบ้านเป็นคนที่ถูกถามที่บ้านว่า "ผ้าอ้อมรอบหน้าได้เมื่อไหร่" — เดิมต้อง
   ออกจากบันทึกการเยี่ยมไปเปิดหน้าคลังของสังคมสงเคราะห์เอง (มติผู้ใช้ 2 ก.ย. 69)
   ปุ่มนี้จึงพาไปที่ทะเบียนของโครงการนั้นตรง ๆ โดยเปิดเป็น **แท็บใหม่** เพื่อไม่ให้
   บันทึกการเยี่ยมที่กรอกค้างอยู่ถูกทิ้ง (มติผู้ใช้ 2 ก.ย. 69)

   ตอนนี้มีรายการเดียวคือ "ติดตามโครงการผ้าอ้อม" — โครงการอื่น (นมผง ·
   อาหารทางการแพทย์ · กายอุปกรณ์) เพิ่มเป็นรายการถัดไปในเมนูเดียวกันได้ */

const MENU_ITEMS = [
  { key: 'diaper', label: 'ติดตามโครงการผ้าอ้อม', icon: 'child_care' },
];

export default function FollowUpStatusMenuButton({ hn, size = 'sm', className = '' }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const [menuWidth, setMenuWidth] = useState(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    setMenuWidth(Math.max(240, Math.round(triggerRef.current.getBoundingClientRect().width)));
  }, [open]);

  /* ทะเบียนผู้ขอรับวัสดุของงานสังคมสงเคราะห์คือที่เดียวที่สถานะโครงการผ้าอ้อม
     อยู่จริง — เปิดเป็นแท็บใหม่พร้อม `?hn=` ให้หน้านั้นค้นหาให้เอง
     (มติผู้ใช้ 2 ก.ย. 69) */
  const openDiaperTab = () => {
    const url = hn
      ? `/clinic/social-work/requesters?hn=${encodeURIComponent(hn)}`
      : '/clinic/social-work/requesters';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`inline-flex shrink-0 ${className}`}>
      <BrandSubdueButton
        ref={triggerRef}
        variant='outline'
        size={size}
        leadingIcon='fact_check'
        trailingIcon='expand_more'
        active={open}
        aria-haspopup='menu'
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ติดตามสถานะ
      </BrandSubdueButton>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        style={{
          width: menuWidth ?? 240,
          background: 'var(--surface-dropdown-default)',
          border: 'var(--dim-stroke-100) solid var(--border-dropdown-default)',
          borderRadius: 'var(--dim-radius-500)',
          boxShadow: 'var(--shadow-dropdown)',
          padding: 'var(--dim-space-100)',
          zIndex: 'var(--sm-z-modal-popover, 1450)',
        }}
      >
        <div role='menu' aria-label='ติดตามสถานะ'>
          {MENU_ITEMS.map((item) => (
            <ActionList
              key={item.key}
              as='button'
              role='menuitem'
              label={item.label}
              leadingIcon={item.icon}
              showLeadingIcon
              showSubtext={false}
              showSwitch={false}
              showBadge={false}
              showCheck={false}
              showChevronRight={false}
              /* เปิดเป็นแท็บใหม่ (มติผู้ใช้ 2 ก.ย. 69) — บันทึกการเยี่ยมที่กรอกค้าง
                 อยู่ต้องไม่ถูกทิ้ง และทีมมักเปิดค้างไว้เทียบกับที่ถามที่บ้าน */
              onClick={() => {
                setOpen(false);
                if (item.key === 'diaper') openDiaperTab();
              }}
            />
          ))}
        </div>
      </Popover>
    </div>
  );
}
