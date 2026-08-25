import React, { useMemo } from 'react';
import CheckboxButton from '@/components/checkbox/CheckboxButton';
import FormScopeEditor from '@/components/consent/FormScopeEditor';
import { consentScopeKey } from '@/data/consentFormScopes';

/* Shared “บทบาทที่มีสิทธิเข้าถึงได้” block — CreateConsentFormPage step 2
   and FormScopeViewPopup edit mode use the same layout (heading + select-all +
   checkbox tree)

   คำว่า "กิจกรรม" เปลี่ยนเป็น "บทบาท" (มติผู้ใช้ 25 ส.ค. 69) — การ์ดในบล็อกนี้
   คือ แพทย์ / พยาบาล ซึ่งเป็นบทบาทวิชาชีพ ส่วนรายการย่อยข้างในถึงจะเป็นกิจกรรม
   PharmacyPrescriberScopePopup ส่ง allLabel + showHeading ของตัวเองมาอยู่แล้ว
   จึงไม่กระทบ */

const COLUMN_HEADING_STYLE = {
  margin: 0,
  color: 'var(--text-brandPrimary-default, #007549)',
  fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.4,
};

const SECTION_CARD_STYLE = {
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

export default function FormScopeAccessEditor({
  catalog = [],
  selectedKeys,
  onToggle,
  onToggleMany,
  columns = 2,
  /** คอลัมน์ของกิจกรรมย่อยภายในการ์ดบทบาท — ส่งต่อให้ FormScopeEditor */
  branchColumns = 1,
  variant = 'card',
  heading = 'บทบาทที่มีสิทธิเข้าถึงได้',
  allLabel = 'ทุกบทบาท',
  readOnly = false,
  showHeading = true,
  style,
}) {
  const allSelected = useMemo(
    () => catalog.length > 0 && catalog.every((s) => selectedKeys.has(consentScopeKey(s))),
    [catalog, selectedKeys],
  );

  const handleToggleAll = (select) => {
    if (readOnly) return;
    onToggleMany?.(catalog, select);
  };

  const body = (
    <>
      {showHeading && heading ? (
        <h3 style={COLUMN_HEADING_STYLE}>{heading}</h3>
      ) : null}
      <CheckboxButton
        checked={allSelected}
        onChange={handleToggleAll}
        label={allLabel}
        border
        showCircleIcon={false}
        showIcon={false}
        showBadge={false}
        showBadge2={false}
        showDescription={false}
        disabled={readOnly}
        className='w-fit max-w-full shrink-0'
        style={{ width: 'fit-content' }}
      />
      <FormScopeEditor
        catalog={catalog}
        selectedKeys={selectedKeys}
        onToggle={readOnly ? undefined : onToggle}
        onToggleMany={readOnly ? () => {} : onToggleMany}
        columns={columns}
        branchColumns={branchColumns}
        readOnly={readOnly}
      />
    </>
  );

  if (variant === 'plain') {
    return (
      <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)', ...style }}>
        {body}
      </div>
    );
  }

  return (
    <section className='w-full flex flex-col min-w-0' style={{ ...SECTION_CARD_STYLE, ...style }}>
      {body}
    </section>
  );
}
