import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import PrivacyRevealPopup from '@/components/popup/PrivacyRevealPopup';
import {
  hasHivStiGatePassed,
  passHivStiGate,
  logHivStiPiiReveal,
} from '@/data/hivStiVisits';

/* hivStiShared — building blocks every HIV/STI clinic page shares
   (TOR §1.10.6 + ข้อมูลลับ §1.4.2).

   • HivStiConfidentialGate — module entry gate: first navigation into any
     /clinic/hiv-sti/* page in a session must re-authenticate through
     PrivacyRevealPopup before ANY client data renders. Cancelling bounces
     back to the System Hub. Passing is remembered per session
     (sessionStorage — see hivStiVisits.js) and audited.
     NOTE: mock authentication only — PrivacyRevealPopup does not verify
     credentials; this is a UX simulation of §1.4.2, not real security.

   • MaskedPii — a masked table cell (UIC code / ชื่อย่อ / เลขบัตร / เบอร์โทร)
     with a per-field reveal that goes through the same PrivacyRevealPopup;
     every reveal is stamped ผู้เปิด+เวลา via logHivStiPiiReveal.

   • ReadOnlyBanner / TopicHeader / Field / StepCard — the flat layout
     primitives AncSteps.jsx established, reused verbatim so the HIV/STI
     form reads like every other special-clinic form. */

/* ── Layout primitives (same visual contract as AncSteps.jsx) ─────── */

export const TopicHeader = ({ icon, children }) => (
  <div className='flex items-center gap-2 w-full'>
    <span className='text-brand-500'><Icon name={icon} size={20} /></span>
    <h2 className='text-base font-bold text-brand-500'>{children}</h2>
  </div>
);

export const Field = ({ label, required, children, hint, error }) => (
  <div className='flex-1 flex flex-col gap-1.5 min-w-0'>
    <div className='flex items-center text-sm text-ink leading-snug'>
      <span>{label}</span>
      {required && <span className='ml-0.5' style={{ color: 'var(--text-input-require)' }}>*</span>}
    </div>
    {children}
    {error ? (
      <span style={{ color: 'var(--text-input-error, #DC2626)', fontSize: 'var(--type-size-xs)' }}>
        {error}
      </span>
    ) : hint ? (
      <span style={{ color: 'var(--text-content-quaternary, #ADB2B7)', fontSize: 'var(--type-size-xs)' }}>
        {hint}
      </span>
    ) : null}
  </div>
);

export const StepCard = ({ children }) => (
  <section className='flex flex-col' style={{ gap: 'var(--dim-space-600)' }}>{children}</section>
);

/* ── Confidential gate (§1.4.2) ───────────────────────────────────── */

const LockedPanel = () => (
  <div
    className='flex flex-col items-center justify-center text-center w-full'
    style={{
      paddingTop: 'var(--dim-space-700, 32px)',
      paddingBottom: 'var(--dim-space-700, 32px)',
      paddingLeft: 'var(--dim-space-600, 24px)',
      paddingRight: 'var(--dim-space-600, 24px)',
      gap: 'var(--dim-space-300, 12px)',
      background: 'var(--surface-card-100, #FFFFFF)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
      boxShadow: 'var(--shadow-card)',
      minHeight: 320,
    }}
  >
    <span style={{ color: 'var(--text-brandPrimary-default, #007549)' }}>
      <Icon name='lock_person' size={40} />
    </span>
    <span style={{ fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>
      โมดูลข้อมูลลับ — งาน HIV และโรคติดต่อทางเพศสัมพันธ์
    </span>
    <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)', maxWidth: 480 }}>
      ข้อมูลผู้รับบริการในโมดูลนี้จัดเป็นข้อมูลลับตามข้อกำหนด §1.4.2
      กรุณายืนยันตัวตนก่อนเข้าใช้งาน — การเข้าถึงทุกครั้งจะถูกบันทึกไว้ในระบบ
    </span>
  </div>
);

/** Wrap a page's BODY content. Chrome (shell/tabs) stays visible; data
    renders only after the gate passes. Cancel → back to System Hub. */
export const HivStiConfidentialGate = ({ children }) => {
  const history = useHistory();
  const [passed, setPassed] = useState(() => hasHivStiGatePassed());

  if (passed) return children;

  return (
    <>
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
        }}
      >
        <LockedPanel />
      </div>
      <PrivacyRevealPopup
        open
        fieldLabel='ข้อมูลผู้รับบริการคลินิกรักปลอดภัย (ข้อมูลลับ §1.4.2)'
        onClose={() => history.push('/hub')}
        onConfirm={() => {
          passHivStiGate();
          setPassed(true);
        }}
      />
    </>
  );
};

/* ── PII mask + per-field reveal (§1.4.2) ─────────────────────────── */

/** Masked value + eye toggle. Reveal opens PrivacyRevealPopup; confirming
    shows the full value for this cell only and logs ผู้เปิด+เวลา. A second
    click re-masks without a popup (hiding is always safe). */
export const MaskedPii = ({ hn, masked, full, fieldLabel = 'ข้อมูลส่วนบุคคล' }) => {
  const [revealed, setRevealed] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
      <span
        style={revealed
          ? { color: 'var(--text-content-default, #363B3F)' }
          : { color: 'var(--text-content-secondary, #636B72)', letterSpacing: '0.02em' }}
      >
        {revealed ? (full || '—') : (masked || '—')}
      </span>
      <button
        type='button'
        aria-label={revealed ? `ซ่อน${fieldLabel}` : `แสดง${fieldLabel}`}
        onClick={(e) => {
          e.stopPropagation();
          if (revealed) setRevealed(false);
          else setPopupOpen(true);
        }}
        className='inline-flex items-center justify-center'
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-content-tertiary, #858C92)',
          paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0,
        }}
      >
        <Icon name={revealed ? 'visibility_off' : 'visibility'} size={16} />
      </button>
      <PrivacyRevealPopup
        open={popupOpen}
        fieldLabel={fieldLabel}
        onClose={() => setPopupOpen(false)}
        onConfirm={() => {
          logHivStiPiiReveal(hn, fieldLabel);
          setRevealed(true);
          setPopupOpen(false);
        }}
      />
    </span>
  );
};

/* ── Read-only banner (สิทธิไม่พอ / บันทึกที่ปิดแล้ว) ─────────────── */

export const ReadOnlyBanner = () => null;

/* ── Small shared helpers ─────────────────────────────────────────── */

/** Client-type badge style — รายใหม่ blue, รายเก่า grey. */
export const clientTypeBadge = (clientType) => (
  clientType === 'new'
    ? { style: 'blue', label: 'รายใหม่' }
    : { style: 'grey', label: 'รายเก่า' }
);

/** Buddhist-era today string for stamping UI copy. */
export const useTodayLabel = () => useMemo(() => new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
  day: 'numeric', month: 'long', year: 'numeric',
}).format(new Date()), []);

export default HivStiConfidentialGate;
