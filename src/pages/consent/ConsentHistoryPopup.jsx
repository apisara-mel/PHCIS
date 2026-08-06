import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import { useStepDirection } from '@/components/step/stepTransition';
import {
  ConsentHistorySearch,
  ConsentHistoryTimeline,
} from '@/pages/consent/ConsentHistoryPage';
import { getConsentRecords, subscribeConsentStore } from '@/data/consentWorkflowStore';
import { buildPatientConsentTimeline } from '@/data/consentPatientHistory';
import { resolveConsentPatientCard } from '@/data/consentPatientDisplay';
import SignedConsentFormBody from '@/pages/consent/SignedConsentFormBody';

/* PHCIS | Consent — ประวัติความยินยอมใน Popup (Figma 299:86535).
   เปิดจาก worklist: ปุ่มหัวข้อ = ค้นหา · ไอคอนแถว = timeline ของ HN นั้น
   ดูแบบฟอร์ม = nested drill-down ภายใน popup เดียว (slide microinteraction) */

const ConsentHistoryPopup = ({
  open,
  onClose,
  initialHn = null,
}) => {
  const [records, setRecords] = useState(getConsentRecords);
  const [selectedHn, setSelectedHn] = useState(initialHn);
  const [viewEvent, setViewEvent] = useState(null);

  useEffect(() => subscribeConsentStore(() => setRecords(getConsentRecords())), []);

  useEffect(() => {
    if (open) {
      setSelectedHn(initialHn || null);
      setViewEvent(null);
    }
  }, [open, initialHn]);

  const startedWithHn = Boolean(initialHn);
  const hn = selectedHn || null;

  const patientCard = useMemo(() => {
    if (!hn) return null;
    const { patient } = buildPatientConsentTimeline(hn, records);
    return patient ? resolveConsentPatientCard(patient.hn, patient.name) : null;
  }, [hn, records]);

  const handleBack = () => {
    if (viewEvent) {
      setViewEvent(null);
      return;
    }
    if (hn && !startedWithHn) {
      setSelectedHn(null);
      return;
    }
    onClose?.();
  };

  const showBack = Boolean(viewEvent || (hn && !startedWithHn));

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
    : (hn ? 'Timeline การเปลี่ยนแปลงความยินยอม' : 'ประวัติความยินยอม');

  const popupSubtitle = viewEvent
    ? [
      viewEvent.formCode,
      viewEvent.version,
      viewEvent.dateTime ? `ลงนาม ${viewEvent.dateTime}` : null,
    ].filter(Boolean).join(' · ')
    : (hn ? undefined : 'ค้นหาชื่อหรือ HN เพื่อดูประวัติความยินยอมรายบุคคล');

  const panelStep = viewEvent ? 2 : hn ? 1 : 0;
  const panelDirection = useStepDirection(panelStep);
  const panelKey = viewEvent
    ? `form-${viewEvent.id}`
    : hn
      ? `timeline-${hn}`
      : 'search';

  const isTimelinePanel = Boolean(hn && !viewEvent);

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='extraLarge'
      title={popupTitle}
      subtitle={popupSubtitle}
      onBack={showBack ? handleBack : undefined}
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
      bodyScrollable={!isTimelinePanel}
    >
      <div
        className={`flex flex-col w-full min-w-0${isTimelinePanel ? ' flex-1 min-h-0' : ''}`}
        style={{ gap: 'var(--dim-space-400)' }}
      >
        {patientCard && (
          <div className={isTimelinePanel ? 'shrink-0' : undefined}>
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
          </div>
        )}
        {viewEvent ? (
          <div
            key={panelKey}
            data-direction={panelDirection}
            className='mih-step-content flex flex-col w-full min-w-0'
            style={{ gap: 'var(--dim-space-400)' }}
          >
            <SignedConsentFormBody
              event={viewEvent}
              patientHn={patientCard?.hn || hn || ''}
              patientName={patientCard?.fullName || patientCard?.shortName || ''}
              showFormHeader
            />
          </div>
        ) : hn ? (
          /* Timeline อยู่นอก mih-step-content — scroll แยกใน embedded panel */
          <div
            className='flex flex-col flex-1 min-h-0 w-full min-w-0'
            style={{ flex: '1 1 0' }}
          >
            <ConsentHistoryTimeline
              hn={hn}
              records={records}
              embedded
              onViewForm={setViewEvent}
            />
          </div>
        ) : (
          <div
            key={panelKey}
            data-direction={panelDirection}
            className='mih-step-content flex flex-col w-full min-w-0'
            style={{ gap: 'var(--dim-space-400)' }}
          >
            <ConsentHistorySearch
              records={records}
              onSelectHn={setSelectedHn}
              embedded
            />
          </div>
        )}
      </div>
    </Popup>
  );
};

export default ConsentHistoryPopup;
