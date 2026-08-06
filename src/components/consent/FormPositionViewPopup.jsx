import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Popup from '@/components/popup/Popup';
import FormPositionAccessEditor from '@/components/consent/FormPositionAccessEditor';
import FormPositionGrouping from '@/components/consent/FormPositionGrouping';
import { resolveRecordPositions } from '@/data/consentFormScopes';

const META_LABEL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.4,
};

const FORM_NAME = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
};

/** Popup — ตำแหน่งที่มีสิทธิเข้าถึงได้ (เปิดจากตารางแบบฟอร์ม). */
export default function FormPositionViewPopup({
  open,
  record,
  onClose,
  onSave,
}) {
  const [mode, setMode] = useState('view');
  const [draftPositions, setDraftPositions] = useState([]);

  const recordPositions = useMemo(
    () => resolveRecordPositions(record),
    [record],
  );

  const resetDraft = useCallback(() => {
    setDraftPositions([...recordPositions]);
  }, [recordPositions]);

  useEffect(() => {
    if (!open) setMode('view');
  }, [open]);

  useEffect(() => {
    resetDraft();
    setMode('view');
  }, [record?.id, resetDraft]);

  const handleCancelEdit = () => {
    resetDraft();
    setMode('view');
  };

  const originalSet = useMemo(
    () => new Set(recordPositions),
    [recordPositions],
  );

  const isDirty = useMemo(() => {
    const draftSet = new Set(draftPositions);
    if (draftSet.size !== originalSet.size) return true;
    for (const value of draftSet) {
      if (!originalSet.has(value)) return true;
    }
    return false;
  }, [draftPositions, originalSet]);

  const handleSave = () => {
    if (!isDirty) return;
    onSave?.(record, [...draftPositions]);
    setMode('view');
  };

  const isEdit = mode === 'edit';
  const title = isEdit
    ? 'แก้ไขตำแหน่งที่มีสิทธิเข้าถึงได้'
    : 'ตำแหน่งที่มีสิทธิเข้าถึงได้';

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
            <FormPositionAccessEditor
              value={draftPositions}
              onChange={setDraftPositions}
              columns={2}
              variant='plain'
              showHeading={false}
            />
          ) : (
            <FormPositionGrouping source={record} columns={2} variant='panel' />
          )}
        </div>
      )}
    </Popup>
  );
}
