import React from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import { formatVersionTransition } from '@/data/consentFormVersion';

const CONFIRM_DIALOG_TEXT = {
  margin: 0,
  color: 'var(--text-alertdialog-subtext, var(--text-content-secondary))',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.5,
  textAlign: 'center',
};

/** AlertDialog body — แบบฟอร์ม PH-104 / เปลี่ยนเวอร์ชัน badge / หลังบันทึก (3 บรรทัด). */
export function ConsentFormSaveConfirmBody({ formCode, fromVersion, toVersion }) {
  const codeLabel = formCode ? `แบบฟอร์ม ${formCode}` : 'แบบฟอร์ม';
  const versionBadge = fromVersion && toVersion
    ? formatVersionTransition(fromVersion, toVersion)
    : toVersion || '—';

  return (
    <div
      id='mih-alertdialog-desc'
      className='flex flex-col items-center w-full'
      style={{ gap: 'var(--dim-space-300, 12px)' }}
    >
      <p style={CONFIRM_DIALOG_TEXT}>{codeLabel}</p>
      <div
        className='flex flex-col items-center w-full'
        style={{ gap: 'var(--dim-space-150, 6px)' }}
      >
        <p style={CONFIRM_DIALOG_TEXT}>จะเปลี่ยนเวอร์ชัน</p>
        <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>
          {versionBadge}
        </ColorfulBadge>
      </div>
      <p style={CONFIRM_DIALOG_TEXT}>หลังบันทึกการแก้ไข</p>
    </div>
  );
}

const PANEL = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--surface-card-100, #FFFFFF)',
  borderRadius: 'var(--dim-radius-500, 16px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600, 24px)',
  gap: 'var(--dim-space-400, 16px)',
};

const DIFF_PANEL = {
  ...PANEL,
  background: 'var(--surface-alert-warning, #FFF9F0)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-alert-warning, #FFEDD5)',
};

const DIFF_TITLE = {
  margin: 0,
  color: 'var(--text-alert-warning, #C2410C)',
  fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.4,
};

const DIFF_GROUP_LABEL = {
  color: 'var(--text-content-default, #363B3F)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-bold)',
  lineHeight: 1.5,
};

const GROUP_LABEL = {
  margin: 0,
  color: 'var(--text-brandPrimary-default, #007549)',
  fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.4,
};

const META = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};

const ROW = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

const DIFF_CHANGE_INNER = {
  gap: 'var(--dim-space-150, 6px)',
};

function DiffChangeRow({ item }) {
  return (
    <div
      className='grid w-full min-w-0 items-start text-left'
      style={{
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)',
        columnGap: 'var(--dim-space-400, 16px)',
        rowGap: 'var(--dim-space-100, 4px)',
      }}
    >
      <span style={{ ...ROW, fontWeight: 'var(--type-weight-medium)', textAlign: 'left' }}>{item.label}</span>
      <div
        className='flex flex-wrap items-start justify-start min-w-0 text-left'
        style={DIFF_CHANGE_INNER}
      >
        <span
          className='min-w-0 break-words text-left'
          style={{ ...META, textDecoration: 'line-through', maxWidth: '100%' }}
          title={item.before}
        >
          {item.before}
        </span>
        <Icon name='arrow_forward' size={14} color='var(--text-content-tertiary)' />
        <span
          className='min-w-0 break-words text-left'
          style={{ ...ROW, color: 'var(--text-brandPrimary-default)', maxWidth: '100%' }}
          title={item.after}
        >
          {item.after}
        </span>
      </div>
    </div>
  );
}

/** Step 4 — summary of edits vs baseline template. */
export function ConsentFormVersionDiffPanel({ diff, fromVersion, toVersion }) {
  if (!diff?.hasChanges && !fromVersion) return null;

  return (
    <section style={{ ...DIFF_PANEL, textAlign: 'left' }}>
      <div className='flex flex-wrap items-center justify-start w-full min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
        <h3 style={DIFF_TITLE}>สรุปการเปลี่ยนแปลง</h3>
        {fromVersion && toVersion ? (
          <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>
            {`เปลี่ยนเวอร์ชัน ${fromVersion} → ${toVersion}`}
          </ColorfulBadge>
        ) : null}
      </div>

      {!diff?.hasChanges ? (
        <span style={{ ...META, textAlign: 'left' }}>ไม่พบการเปลี่ยนแปลงจากเวอร์ชันเดิม</span>
      ) : (
        <div className='flex flex-col w-full min-w-0 items-start' style={{ gap: 'var(--dim-space-800, 32px)' }}>
          {diff.groups.map((group) => (
            <div key={group.id} className='flex flex-col min-w-0 w-full items-start' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span style={{ ...DIFF_GROUP_LABEL, textAlign: 'left' }}>
                {group.label}
              </span>
              <div className='flex flex-col min-w-0 w-full items-start' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {group.changes.map((item, idx) => (
                  <DiffChangeRow key={`${group.id}-${idx}`} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Step 4 — dry-run preview of signed-consent supersede impact. */
export function ConsentSupersedeImpactPanel({ impact }) {
  if (!impact?.signedCount) return null;

  return (
    <section style={PANEL}>
      <div className='flex items-start w-full min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
        <span
          className='inline-flex items-center justify-center shrink-0'
          style={{
            width: 'var(--dim-size-800, 40px)',
            height: 'var(--dim-size-800, 40px)',
            borderRadius: 'var(--dim-radius-200, 8px)',
            background: 'var(--surface-warning-tertiary, #FEF3C7)',
            color: 'var(--text-warning-default, #B45309)',
          }}
        >
          <Icon name='warning' size={20} />
        </span>
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
          <h3 style={GROUP_LABEL}>ผลกระทบต่อความยินยอมที่ลงนามแล้ว</h3>
          <span style={ROW}>
            {`มีความยินยอมที่ลงนามแล้ว ${impact.signedCount} รายการ (${impact.patientCount} ผู้รับบริการ)`}
          </span>
          <span style={ROW}>
            {`เมื่อเผยแพร่เวอร์ชัน ${impact.newVersion} ระบบจะเปลี่ยนสถานะเป็น "ถูกแทนที่ด้วยเวอร์ชันใหม่" และส่งคำขอลงนามใหม่ ${impact.reconsentCount} รายการไปเวชระเบียนอัตโนมัติ`}
          </span>
          {impact.skippedOpenRequestCount > 0 ? (
            <span style={META}>
              {`ข้าม ${impact.skippedOpenRequestCount} รายการที่มีคำขอลงนามค้างอยู่แล้ว`}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
