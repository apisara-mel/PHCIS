import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Popup from '@/components/popup/Popup';
import FormScopeAccessEditor from '@/components/consent/FormScopeAccessEditor';
import FormScopeGrouping from '@/components/consent/FormScopeGrouping';
import { resolveFormScopes } from '@/components/consent/FormScopeGrouping';
import { CONSENT_FORM_SCOPE_CATALOG } from '@/data/consentFormRecords';
import { consentScopeKey, dedupeConsentScopes, stripConsentScopes } from '@/data/consentFormScopes';

const META_LABEL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.4,
};

const VIEW_SECTION_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  boxSizing: 'border-box',
  /* มุมมองใช้ surface/card/200 ซึ่งเข้มขึ้นจาก card/100 หนึ่งระดับ */
  background: 'var(--surface-card-200, #FDFDFD)',
  borderRadius: 'var(--dim-radius-500, 16px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600, 24px)',
  gap: 'var(--dim-space-400, 16px)',
};

const VIEW_HEADING_STYLE = {
  margin: 0,
  color: 'var(--text-brandPrimary-default, #007549)',
  fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.4,
};

const FORM_NAME = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
};

const scopesToKeySet = (scopes) => new Set(scopes.map(consentScopeKey));

const keySetToScopes = (keys, catalog) =>
  dedupeConsentScopes(catalog.filter((s) => keys.has(consentScopeKey(s))));

/** Popup — Group Policy / สาขาย่อย / แผนก ที่เข้าถึงได้ (เปิดจากตารางแบบฟอร์ม). */
export default function FormScopeViewPopup({
  open,
  record,
  onClose,
  onSave,
  catalog = CONSENT_FORM_SCOPE_CATALOG,
}) {
  const [mode, setMode] = useState('view');
  const [draftKeys, setDraftKeys] = useState(() => new Set());

  const recordScopes = useMemo(
    () => stripConsentScopes(resolveFormScopes(record)),
    [record],
  );

  const resetDraft = useCallback(() => {
    setDraftKeys(scopesToKeySet(recordScopes));
  }, [recordScopes]);

  useEffect(() => {
    if (!open) setMode('view');
  }, [open]);

  useEffect(() => {
    resetDraft();
    setMode('view');
  }, [record?.id, resetDraft]);

  const handleToggle = (scope) => {
    const key = consentScopeKey(scope);
    setDraftKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleToggleMany = (scopes, select) => {
    setDraftKeys((prev) => {
      const next = new Set(prev);
      scopes.forEach((scope) => {
        const key = consentScopeKey(scope);
        if (select) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  };

  const handleCancelEdit = () => {
    resetDraft();
    setMode('view');
  };

  const originalKeys = useMemo(
    () => scopesToKeySet(recordScopes),
    [recordScopes],
  );

  const isDirty = useMemo(() => {
    if (draftKeys.size !== originalKeys.size) return true;
    for (const key of draftKeys) {
      if (!originalKeys.has(key)) return true;
    }
    return false;
  }, [draftKeys, originalKeys]);

  const handleSave = () => {
    if (!isDirty) return;
    const scopes = keySetToScopes(draftKeys, catalog);
    onSave?.(record, scopes);
    setMode('view');
  };

  const isEdit = mode === 'edit';
  const title = isEdit
    ? 'แก้ไข Group Policy / สาขาย่อย / แผนก ที่เข้าถึงได้'
    : 'Group Policy / สาขาย่อย / แผนก ที่เข้าถึงได้';

  return (
    <Popup
      open={!!open && !!record}
      onClose={onClose}
      size='extraLarge'
      title={title}
      primaryAction={isEdit
        ? { label: 'บันทึกการเปลี่ยนแปลง', onClick: handleSave, disabled: !isDirty }
        : { label: 'ปิด', onClick: onClose }}
      secondaryAction={isEdit
        ? { label: 'ยกเลิกการแก้ไข', onClick: handleCancelEdit }
        : { label: 'แก้ไข', leadingIcon: 'edit', onClick: () => { resetDraft(); setMode('edit'); } }}
    >
      {record && (
        <div
          className='flex flex-col w-full min-w-0'
          style={{ gap: 'var(--dim-space-400)' }}
        >
          <div
            className='flex flex-wrap items-start w-full min-w-0 shrink-0'
            style={{
              gap: 'var(--dim-space-400)',
              padding: 'var(--dim-space-300) var(--dim-space-400)',
              background: 'var(--surface-brandPrimary-quaternary)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            }}
          >
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
              <span style={META_LABEL}>รหัสแบบฟอร์ม</span>
              <ColorfulBadge style='teal' size='small' hierarchy='secondary' width='hug'>
                {record.code || '—'}
              </ColorfulBadge>
            </div>
            <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-100)', minWidth: 'min(100%, 240px)' }}>
              <span style={META_LABEL}>ชื่อแบบฟอร์ม</span>
              <span style={FORM_NAME}>{record.name || '—'}</span>
            </div>
          </div>

          {isEdit ? (
            <FormScopeAccessEditor
              catalog={catalog}
              selectedKeys={draftKeys}
              onToggle={handleToggle}
              onToggleMany={handleToggleMany}
              columns={2}
            />
          ) : (
            <section className='w-full flex flex-col min-w-0' style={VIEW_SECTION_STYLE}>
              <h3 style={VIEW_HEADING_STYLE}>Group Policy ที่มีสิทธิเข้าถึงได้</h3>
              <FormScopeGrouping scopes={recordScopes} columns={2} variant='panel' />
            </section>
          )}
        </div>
      )}
    </Popup>
  );
}
