import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import { getConsentRecords, subscribeConsentStore } from '@/data/consentWorkflowStore';
import { resolveConsentPatientCard } from '@/data/consentPatientDisplay';
import { toSignedFormViewEventFromRecord } from '@/data/signedConsentFormView';
import SignedConsentFormBody from '@/pages/consent/SignedConsentFormBody';

/* PHCIS | Consent — ดูแบบฟอร์มที่ลงนามแล้ว (read-only inline)
   เปิดจาก icon view ใน worklist จัดการความยินยอม */

const MUTED = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};

const ConsentConsentedFormsPopup = ({
  open,
  onClose,
  hn = null,
  name = null,
  record = null,
  focusRecordId = null,
}) => {
  const [records, setRecords] = useState(getConsentRecords);

  useEffect(() => subscribeConsentStore(() => setRecords(getConsentRecords())), []);

  const sourceRecord = useMemo(() => {
    if (record) return record;
    if (!focusRecordId) return null;
    return records.find((r) => String(r.id) === String(focusRecordId)) || null;
  }, [record, focusRecordId, records]);

  const viewEvent = useMemo(
    () => toSignedFormViewEventFromRecord(sourceRecord),
    [sourceRecord],
  );

  const patientCard = useMemo(() => {
    const resolvedHn = sourceRecord?.hn || hn;
    const resolvedName = sourceRecord?.name || name;
    if (!resolvedHn) return null;
    return resolveConsentPatientCard(resolvedHn, resolvedName);
  }, [sourceRecord, hn, name]);

  const popupTitle = viewEvent?.formName
    ? (
      <span
        style={{
          fontSize: 'var(--type-size-sm)',
          fontWeight: 'var(--type-weight-bold)',
          lineHeight: 1.4,
          display: 'block',
        }}
      >
        {viewEvent.formName}
      </span>
    )
    : 'แบบฟอร์มที่ให้ความยินยอม';
  const popupSubtitle = viewEvent
    ? [
      viewEvent.formCode,
      viewEvent.version,
      viewEvent.dateTime !== '—' ? `ลงนาม ${viewEvent.dateTime}` : null,
    ].filter(Boolean).join(' · ')
    : 'รายการแบบฟอร์มที่ผู้รับบริการให้ความยินยอมแล้ว';

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='large'
      title={popupTitle}
      subtitle={popupSubtitle}
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
        {patientCard && (
          <PatientSummaryCard
            avatarUrl={patientCard.avatarUrl}
            avatarAlt={patientCard.fullName || patientCard.shortName || ''}
            cells={[
              {
                label: 'ชื่อ-นามสกุล ผู้รับบริการ',
                value: patientCard.fullName || patientCard.shortName || '—',
              },
              {
                label: 'HN (Hospital Number)',
                value: patientCard.hn || '—',
              },
            ]}
          />
        )}

        {viewEvent ? (
          <SignedConsentFormBody
            event={viewEvent}
            patientHn={sourceRecord?.hn || hn || ''}
            patientName={sourceRecord?.name || name || ''}
            showFormHeader
          />
        ) : (
          <span style={MUTED}>ไม่พบข้อมูลแบบฟอร์มที่ให้ความยินยอม</span>
        )}
      </div>
    </Popup>
  );
};

export default ConsentConsentedFormsPopup;
