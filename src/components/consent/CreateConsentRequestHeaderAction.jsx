import React, { useLayoutEffect, useRef, useState } from 'react';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Popover from '@/components/popup/Popover';
import ActionList from '@/components/list/ActionList';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import { CreateConsentRequestPopup } from '@/pages/consent/consentWorkflowPopups';
import { enqueueAccessImport } from '@/data/accessRecords';
import { canCreateConsentRequest } from '@/data/consentPermissions';

/** Material Symbols — เอกสาร + plus (Figma consent access-request action). */
export const CREATE_CONSENT_REQUEST_ICON = 'note_add';

const MENU_LABEL = 'สร้างคำขอเข้าถึงแบบฟอร์มยินยอม';

/** SubHeader action — ด.1.1.4 / ด.1.1.6 สร้างคำขอ → dropdown → เปิด popup สร้างคำขอเข้าถึงแบบฟอร์มยินยอม. */
export default function CreateConsentRequestHeaderAction({ className = '' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const triggerRef = useRef(null);
  const [menuWidth, setMenuWidth] = useState(null);

  useLayoutEffect(() => {
    if (!menuOpen || !triggerRef.current) return;
    const w = triggerRef.current.getBoundingClientRect().width;
    setMenuWidth(Math.max(280, Math.round(w)));
  }, [menuOpen]);

  if (!canCreateConsentRequest()) return null;

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className={`inline-flex shrink-0 ${className}`.trim()}>
      <BrandSubdueButton
        ref={triggerRef}
        variant='outline'
        size='md'
        leadingIcon={CREATE_CONSENT_REQUEST_ICON}
        trailingIcon='expand_more'
        active={menuOpen}
        className='shrink-0'
        aria-label='สร้างคำขอ'
        aria-haspopup='menu'
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
      >
        สร้างคำขอ
      </BrandSubdueButton>

      <Popover
        open={menuOpen}
        onClose={closeMenu}
        anchorRef={triggerRef}
        style={{
          width: menuWidth ?? 280,
          background: 'var(--surface-dropdown-default)',
          border: 'var(--dim-stroke-100) solid var(--border-dropdown-default)',
          borderRadius: 'var(--dim-radius-500)',
          boxShadow: 'var(--shadow-dropdown)',
          padding: 'var(--dim-space-100)',
          zIndex: 'var(--sm-z-modal-popover, 1450)',
        }}
      >
        <div role='menu' aria-label='สร้างคำขอ'>
          <ActionList
            as='button'
            role='menuitem'
            label={MENU_LABEL}
            leadingIcon={CREATE_CONSENT_REQUEST_ICON}
            showLeadingIcon
            showSubtext={false}
            showSwitch={false}
            showBadge={false}
            showCheck={false}
            showChevronRight={false}
            onClick={() => {
              closeMenu();
              setPopupOpen(true);
            }}
          />
        </div>
      </Popover>

      <CreateConsentRequestPopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        onCreate={(payload) => {
          const rec = enqueueAccessImport(payload);
          setPopupOpen(false);
          setToast({
            id: Date.now(),
            variant: 'success',
            message: `ส่งคำขอสิทธิ์ของ ${rec.name} แล้ว — รออนุมัติที่เมนูจัดการสิทธิ์การขอเข้าถึงแบบฟอร์ม`,
          });
        }}
      />

      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
