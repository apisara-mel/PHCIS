import React, { useLayoutEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Popover from '@/components/popup/Popover';
import Popup from '@/components/popup/Popup';
import ActionList from '@/components/list/ActionList';
import AppointmentCreationHistoryTimeline from '@/components/appointment/AppointmentCreationHistoryTimeline';
import { MY_CREATED_APPOINTMENTS } from '@/pages/appointment/appointmentCreationHistory';
import { PHCIS_CURRENT_USER } from '@/data/phcisCurrentUser';

/* SubHeader "การนัดหมาย" split button — Figma PHCIS-ALL 2120:32577.
   BrandSubdue outline trigger opens a dropdown with:
     • ดูการนัดหมาย        (calendar_month)  → /appointment (ระบบนัดหมาย)
     • สร้างการนัดหมาย      (calendar_add_on) — เดิมชื่อ "เพิ่มการนัดหมาย"
       เปลี่ยนให้ตรงกับคำว่า "สร้าง…" ที่ใช้ทั้งระบบ (มติผู้ใช้ 25 ส.ค. 69)
     • ประวัติสร้างการนัดหมาย (history) → popup timeline ของผู้ใช้คนนี้
       (คู่ขนานกับ "ประวัติคำขอเข้าถึงข้อมูล" ในเมนูคำขอเข้าถึงข้อมูล) */

const MENU_ITEMS = [
  { key: 'view', label: 'ดูการนัดหมาย', icon: 'calendar_month' },
  { key: 'add', label: 'สร้างการนัดหมาย', icon: 'calendar_add_on' },
  { key: 'history', label: 'ประวัติสร้างการนัดหมาย', icon: 'history' },
];

export default function AppointmentMenuButton({
  onView,
  onAdd,
  size = 'lg',
  className = '',
}) {
  const history = useHistory();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const triggerRef = useRef(null);
  const [menuWidth, setMenuWidth] = useState(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const w = triggerRef.current.getBoundingClientRect().width;
    setMenuWidth(Math.max(220, Math.round(w)));
  }, [open]);

  const close = () => setOpen(false);

  const handleView = () => {
    if (onView) onView();
    else history.push('/appointment');
  };

  return (
    <div className={`inline-flex shrink-0 ${className}`}>
      <BrandSubdueButton
        ref={triggerRef}
        variant='outline'
        size={size}
        leadingIcon='calendar_clock'
        trailingIcon='expand_more'
        active={open}
        aria-haspopup='menu'
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        การนัดหมาย
      </BrandSubdueButton>
      <Popover
        open={open}
        onClose={close}
        anchorRef={triggerRef}
        style={{
          width: menuWidth ?? 220,
          background: 'var(--surface-dropdown-default)',
          border: 'var(--dim-stroke-100) solid var(--border-dropdown-default)',
          borderRadius: 'var(--dim-radius-500)',
          boxShadow: 'var(--shadow-dropdown)',
          padding: 'var(--dim-space-100)',
          zIndex: 'var(--sm-z-modal-popover, 1450)',
        }}
      >
        <div role='menu' aria-label='การนัดหมาย'>
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
              onClick={() => {
                close();
                if (item.key === 'view') handleView();
                if (item.key === 'add') onAdd?.();
                if (item.key === 'history') setHistoryOpen(true);
              }}
            />
          ))}
        </div>
      </Popover>

      <Popup
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        size='extraLarge'
        title='ประวัติสร้างการนัดหมาย'
        subtitle={`นัดหมายที่ ${PHCIS_CURRENT_USER.displayName} เป็นผู้สร้าง · ${MY_CREATED_APPOINTMENTS.length} นัดหมาย`}
        secondaryAction={{ label: 'ปิด', onClick: () => setHistoryOpen(false) }}
      >
        <AppointmentCreationHistoryTimeline records={MY_CREATED_APPOINTMENTS} />
      </Popup>
    </div>
  );
}
