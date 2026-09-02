import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Popover from '@/components/popup/Popover';
import Popup from '@/components/popup/Popup';
import ActionList from '@/components/list/ActionList';
import AccessRequestHistoryTimeline from '@/components/consent/AccessRequestHistoryTimeline';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import { CreateConsentRequestPopup } from '@/pages/consent/consentWorkflowPopups';
import { ACCESS_RECORDS, enqueueAccessImport, isMyAccessRequest } from '@/data/accessRecords';
import { PHCIS_CURRENT_USER } from '@/data/phcisCurrentUser';
import { canCreateConsentRequest } from '@/data/consentPermissions';

/** Material Symbols — เอกสาร + plus (Figma consent access-request action). */
export const CREATE_CONSENT_REQUEST_ICON = 'note_add';

const MENU_LABEL = 'สร้างคำขอเข้าถึงข้อมูล';

/** SubHeader action — ด.1.1.4 / ด.1.1.6 สร้างคำขอ → dropdown → เปิด popup สร้างคำขอเข้าถึงแบบฟอร์มยินยอม. */
export default function CreateConsentRequestHeaderAction({ className = '' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const triggerRef = useRef(null);
  const [menuWidth, setMenuWidth] = useState(null);
  /* popup นี้คือ "ประวัติของฉัน" ไม่ใช่คิวของผู้ดูแลระบบ — กรองด้วย predicate
     ตัวเดียวกับหน้า "รายการคำขอของฉัน" (มติผู้ใช้ 25 ส.ค. 69) */
  const myRequests = useMemo(() => ACCESS_RECORDS.filter(isMyAccessRequest), []);

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
        size='sm'
        leadingIcon={CREATE_CONSENT_REQUEST_ICON}
        /* เปิดเมนูอยู่ให้ลูกศรชี้ขึ้น (มติผู้ใช้ 2 ก.ย. 69) */
        trailingIcon={open ? 'expand_less' : 'expand_more'}
        active={menuOpen}
        className='shrink-0'
        aria-label='คำขอเข้าถึงข้อมูล'
        aria-haspopup='menu'
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
      >
        คำขอเข้าถึงข้อมูล
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
        <div role='menu' aria-label='คำขอเข้าถึงข้อมูล'>
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
          <ActionList
            as='button'
            role='menuitem'
            label='ประวัติคำขอเข้าถึงข้อมูล'
            leadingIcon='history'
            showLeadingIcon
            showSubtext={false}
            showSwitch={false}
            showBadge={false}
            showCheck={false}
            showChevronRight={false}
            onClick={() => {
              closeMenu();
              setHistoryOpen(true);
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
            message: `ส่งคำขอเข้าถึงข้อมูลของ ${rec.name} แล้ว — รอผู้ดูแลระบบตรวจสอบ`,
          });
        }}
      />

      <Popup
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        size='extraLarge'
        title='ประวัติคำขอเข้าถึงข้อมูล'
        subtitle={`คำขอที่ ${PHCIS_CURRENT_USER.displayName} เป็นผู้ยื่น · ${myRequests.length} คำขอ`}
        secondaryAction={{ label: 'ปิด', onClick: () => setHistoryOpen(false) }}
      >
        <AccessRequestHistoryTimeline records={myRequests} />
      </Popup>

      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
