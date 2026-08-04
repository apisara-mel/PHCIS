import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import {
  ConsentHistorySearch,
  ConsentHistoryTimeline,
} from '@/pages/consent/ConsentHistoryPage';
import { getConsentRecords, subscribeConsentStore } from '@/data/consentWorkflowStore';
import { buildPatientConsentTimeline } from '@/data/consentPatientHistory';
import { resolveConsentPatientCard } from '@/data/consentPatientDisplay';

/* PHCIS | Consent — ประวัติความยินยอมใน Popup (Figma 299:86535).
   เปิดจาก worklist: ปุ่มหัวข้อ = ค้นหา · ไอคอนแถว = timeline ของ HN นั้น */

const ConsentHistoryPopup = ({
  open,
  onClose,
  initialHn = null,
}) => {
  const [records, setRecords] = useState(getConsentRecords);
  const [selectedHn, setSelectedHn] = useState(initialHn);

  useEffect(() => subscribeConsentStore(() => setRecords(getConsentRecords())), []);

  useEffect(() => {
    if (open) setSelectedHn(initialHn || null);
  }, [open, initialHn]);

  const startedWithHn = Boolean(initialHn);
  const hn = selectedHn || null;

  const patientCard = useMemo(() => {
    if (!hn) return null;
    const { patient } = buildPatientConsentTimeline(hn, records);
    return patient ? resolveConsentPatientCard(patient.hn, patient.name) : null;
  }, [hn, records]);

  const handleBack = () => {
    if (hn && !startedWithHn) {
      setSelectedHn(null);
      return;
    }
    onClose?.();
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='extraLarge'
      title={hn ? 'Timeline การเปลี่ยนแปลงความยินยอม' : 'ประวัติความยินยอม'}
      subtitle={hn ? undefined : 'ค้นหาชื่อหรือ HN เพื่อดูประวัติความยินยอมรายบุคคล'}
      onBack={hn && !startedWithHn ? handleBack : undefined}
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
        {patientCard && (
          <PatientSummaryCard
            variant='gradient'
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
        {hn ? (
          <ConsentHistoryTimeline hn={hn} records={records} embedded />
        ) : (
          <ConsentHistorySearch
            records={records}
            onSelectHn={setSelectedHn}
            embedded
          />
        )}
      </div>
    </Popup>
  );
};

export default ConsentHistoryPopup;
