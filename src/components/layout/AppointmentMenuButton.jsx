import React, { useLayoutEffect, useRef, useState } from 'react';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Popover from '@/components/popup/Popover';
import ActionList from '@/components/list/ActionList';

/* SubHeader "การนัดหมาย" split button — Figma PHCIS-ALL 2120:32577.
   BrandSubdue outline trigger opens a dropdown with:
     • ดูการนัดหมาย   (calendar_month)
     • เพิ่มการนัดหมาย (calendar_add_on) */

const MENU_ITEMS = [
  { key: 'view', label: 'ดูการนัดหมาย', icon: 'calendar_month' },
  { key: 'add', label: 'เพิ่มการนัดหมาย', icon: 'calendar_add_on' },
];

export default function AppointmentMenuButton({
  onView,
  onAdd,
  size = 'lg',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const [menuWidth, setMenuWidth] = useState(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const w = triggerRef.current.getBoundingClientRect().width;
    setMenuWidth(Math.max(220, Math.round(w)));
  }, [open]);

  const close = () => setOpen(false);

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
                if (item.key === 'view') onView?.();
                if (item.key === 'add') onAdd?.();
              }}
            />
          ))}
        </div>
      </Popover>
    </div>
  );
}
