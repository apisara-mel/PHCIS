import React, { useCallback, useEffect, useState } from 'react';
import AlertDialog from '@/components/popup/AlertDialog';
import Tooltip from '@/components/tooltip/Tooltip';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import BrandButton from '@/components/button/BrandButton';
import { PanelEmptyState, Sym, PANEL_LABEL_STYLE, PANEL_VALUE_STYLE } from '@/pages/treat/panels/panelKit';
import {
  getTreatmentAccess, subscribeTreatmentAccess, NO_EDIT_RIGHT_TOOLTIP,
} from '@/data/treatmentAccess';

/* PHCIS | EMR §1.4 — hook + chrome ที่ทุก panel ในโมดูลใช้ร่วมกัน.
   แยกออกจาก panelKit.jsx (ซึ่งเป็น layout ล้วน ๆ) เพราะไฟล์นี้ผูกกับ
   สิทธิ์ + dialog ที่มี state. ทั้งหมดเป็น React 17 safe:
   subscribe + useEffect เท่านั้น — ไม่มี useSyncExternalStore. */

/* ── สิทธิ์ปัจจุบัน (4 โหมดจาก treatmentAccess) ───────────────── */
export const useTreatmentAccess = () => {
  const [access, setAccess] = useState(() => getTreatmentAccess());
  useEffect(() => subscribeTreatmentAccess(setAccess), []);
  return access;
};

/* ── ตัวอ่าน store แบบ pub/sub ที่ใช้ซ้ำได้ทุกไฟล์ข้อมูล ─────────
   `subscribe` คือ subscribeXxx ของ store, `read` คือ getter ที่คืน
   snapshot ใหม่. React 17: setState ใน callback ของ subscribe. */
export const useTreatmentStore = (subscribe, read, deps = []) => {
  const [snapshot, setSnapshot] = useState(read);
  const refresh = useCallback(() => setSnapshot(read()), deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    refresh();
    return subscribe(() => refresh());
  }, [subscribe, refresh]);
  return [snapshot, refresh];
};

/* ── ปุ่มที่ปิดตัวเองเมื่อสิทธิ์ไม่พอ ────────────────────────────
   TOR/edge case: ห้ามซ่อนปุ่มเงียบ ๆ — ต้อง disable + บอกเหตุผล
   ผ่าน Tooltip เสมอ. */
export const GuardedAction = ({ allowed, reason = NO_EDIT_RIGHT_TOOLTIP, children }) => {
  if (allowed) return children;
  return (
    <Tooltip content={reason} position='top'>
      <span style={{ display: 'inline-flex', cursor: 'not-allowed' }}>
        {React.isValidElement(children)
          ? React.cloneElement(children, { disabled: true, onClick: undefined })
          : children}
      </span>
    </Tooltip>
  );
};

/* ── หน้าปฏิเสธการเข้าถึงทั้ง panel (โหมด none) ───────────────── */
export const AccessDeniedPanel = ({ onBack, what = 'ข้อมูลส่วนนี้' }) => (
  <PanelEmptyState
    icon='lock'
    title={`ไม่มีสิทธิ์เข้าถึง${what}`}
    subtitle='บัญชีผู้ใช้ปัจจุบันไม่ได้รับสิทธิ์ดูข้อมูลการรักษาของผู้รับบริการรายนี้ — ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เพิ่มเติม'
    action={onBack ? (
      <BrandButton variant='outline' size='sm' leadingIcon='arrow_back' onClick={onBack}>
        กลับไปหน้าคิวตรวจรักษา
      </BrandButton>
    ) : null}
  />
);

/* ── ค่าที่ถูกปิดบังเมื่อสิทธิ์ระดับข้อมูลลับไม่ถึง ──────────────
   ไม่ลบค่าออกจาก DOM ตอน reveal — แค่แทนที่ด้วยจุดไข่ปลาและให้กด
   ขอเปิดดู ซึ่งผู้เรียกต้องบันทึก access log ทุกครั้ง. */
export const MaskedValue = ({ masked, children, onReveal }) => {
  if (!masked) return children;
  return (
    <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      <span style={{ ...PANEL_VALUE_STYLE, letterSpacing: 'var(--dim-space-050, 2px)' }}>••••••••</span>
      {onReveal ? (
        <button
          type='button'
          onClick={onReveal}
          style={{
            ...PANEL_LABEL_STYLE,
            color: 'var(--text-brandPrimary-default, #007549)',
            textDecoration: 'underline',
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
          }}
        >
          ขอเปิดดู
        </button>
      ) : null}
    </span>
  );
};

/* ── Dialog "ระบุเหตุผล" ที่ทุกการยกเลิก/แก้สถานะต้องผ่าน ───────
   บังคับกรอกเหตุผลจริง (ปุ่มยืนยัน disable จนกว่าจะถึง minLength)
   และใช้ SuggestibleTextarea + suggestions + minChars ตามกฎ. */
export const ReasonDialog = ({
  open, title, description, suggestions = [], confirmLabel = 'ยืนยัน',
  type = 'warning', minLength = 5, onConfirm, onClose, extra = null,
}) => {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) { setReason(''); setTouched(false); }
  }, [open]);

  const tooShort = reason.trim().length < minLength;

  return (
    <AlertDialog
      open={open}
      type={type}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel='ยกเลิก'
      onCancel={onClose}
      onClose={onClose}
      onConfirm={() => {
        setTouched(true);
        if (tooShort) return;
        onConfirm(reason.trim());
      }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        {extra}
        <SuggestibleTextarea
          voice
          label='เหตุผล'
          required
          value={reason}
          onChange={(e) => setReason(typeof e === 'string' ? e : e?.target?.value ?? '')}
          suggestions={suggestions}
          minChars={2}
          height={120}
          minHeight={88}
          popoverAriaLabel='ตัวอย่างเหตุผล'
          placeholder='ระบุเหตุผลเพื่อเก็บไว้ในประวัติการแก้ไข'
        />
        {touched && tooShort ? (
          <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-alert-error, #B91C1C)' }}>
            ต้องระบุเหตุผลอย่างน้อย {minLength} ตัวอักษร — เหตุผลนี้จะถูกบันทึกในประวัติการแก้ไขและลบไม่ได้
          </span>
        ) : null}
      </div>
    </AlertDialog>
  );
};

/* ── แถบเตือนแบบปิดได้ (per-visit) ──────────────────────────── */
export const PanelAlert = ({ tone = 'warning', icon = 'warning', title, children, onDismiss }) => {
  const palette = tone === 'error'
    ? { bg: 'var(--surface-danger-quaternary, #FFF0F0)', border: 'var(--border-colorfulbadge-error, #FECACA)', fg: 'var(--text-alert-error, #B91C1C)' }
    : tone === 'success'
      ? { bg: 'var(--surface-colorfulbadge-teal, #D1F6EE)', border: 'var(--border-colorfulbadge-success, #A2EDDE)', fg: 'var(--text-alert-success, #196C65)' }
      : tone === 'info'
        ? { bg: 'var(--surface-colorfulbadge-blue, #DBEAFE)', border: 'var(--border-colorfulbadge-info, #BFDBFE)', fg: 'var(--text-alert-info, #1D4ED8)' }
        : { bg: 'var(--surface-colorfulbadge-yellow, #FEF9C3)', border: 'var(--border-colorfulbadge-warning, #FEF08A)', fg: 'var(--text-colorfulbadge-yellow, #A16207)' };

  return (
    <div
      className='flex items-start w-full'
      style={{
        gap: 'var(--dim-space-300, 12px)',
        borderRadius: 'var(--dim-radius-300, 10px)',
        border: `var(--dim-stroke-100, 1px) solid ${palette.border}`,
        background: palette.bg,
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingRight: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        paddingLeft: 'var(--dim-space-300, 12px)',
      }}
      role='status'
    >
      <span className='shrink-0' style={{ lineHeight: 1 }}>
        <Sym name={icon} size={18} color={palette.fg} />
      </span>
      <div className='flex flex-col min-w-0 flex-1' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        {title ? (
          <span style={{ ...PANEL_VALUE_STYLE, color: palette.fg, fontWeight: 'var(--type-weight-bold)' }}>{title}</span>
        ) : null}
        <span style={{ ...PANEL_LABEL_STYLE, color: palette.fg }}>{children}</span>
      </div>
      {onDismiss ? (
        <button
          type='button'
          onClick={onDismiss}
          aria-label='ปิดคำเตือน'
          style={{ background: 'transparent', border: 0, cursor: 'pointer', color: palette.fg, lineHeight: 1 }}
        >
          <Sym name='close' size={18} color={palette.fg} />
        </button>
      ) : null}
    </div>
  );
};

/* ── หัวข้อ + ตัวนับ "จำนวน N รายการ" ตามคำศัพท์คู่มือ HCIS ───── */
export const CountLabel = ({ n, unit = 'รายการ' }) => (
  <span style={PANEL_LABEL_STYLE}>จำนวน {Number(n || 0).toLocaleString('th-TH')} {unit}</span>
);

/* ── แบ่งหน้า client-side (ทุกตารางเกิน 10 แถวต้องใช้) ────────── */
export const paginate = (rows, page, perPage = 10) => {
  const pageCount = Math.max(1, Math.ceil(rows.length / perPage));
  const safe = Math.min(Math.max(1, page), pageCount);
  return { pageCount, page: safe, slice: rows.slice((safe - 1) * perPage, safe * perPage) };
};

export default useTreatmentAccess;
