import React, { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Popover from '@/components/popup/Popover';
import ActionList from '@/components/list/ActionList';
import { triggerPharmacyPrint } from '@/components/pharmacy/pharmacyPrintUtils';

/* Print trigger with TH / EN label-language choice (ToR §1.9.2.5 /
   §1.9.2.12). Opens a dropdown so the pharmacist picks ฉลากภาษาไทย or
   ฉลากภาษาอังกฤษ before `window.print()` — used for both ฉลากยา and ใบสั่งยา. */

const LANG_ITEMS = [
  { key: 'th', label: 'ฉลากภาษาไทย' },
  { key: 'en', label: 'ฉลากภาษาอังกฤษ' },
];

export default function PharmacyPrintLangButton({
  mode,
  label,
  leadingIcon = 'print',
  size = 'sm',
  onLangChange,
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

  const printWithLang = (lang) => {
    close();
    /* Commit language into the print sheet before window.print() —
       otherwise the dialog still sees the previous lang. */
    flushSync(() => {
      onLangChange?.(lang);
    });
    triggerPharmacyPrint(mode);
  };

  return (
    <div className={`inline-flex shrink-0 ${className}`.trim()}>
      <BrandSubdueButton
        ref={triggerRef}
        variant='outline'
        size={size}
        leadingIcon={leadingIcon}
        trailingIcon='expand_more'
        active={open}
        aria-haspopup='menu'
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
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
        <div role='menu' aria-label={`${label} — เลือกภาษาฉลาก`}>
          {LANG_ITEMS.map((item) => (
            <ActionList
              key={item.key}
              as='button'
              role='menuitem'
              label={item.label}
              showLeadingIcon={false}
              showSubtext={false}
              showSwitch={false}
              showBadge={false}
              showCheck={false}
              showChevronRight={false}
              onClick={() => printWithLang(item.key)}
            />
          ))}
        </div>
      </Popover>
    </div>
  );
}
