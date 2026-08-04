import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import { getConsentRecords, subscribeConsentStore } from '@/data/consentWorkflowStore';
import { buildConsentCompareGroups } from '@/data/consentPatientHistory';
import { resolveConsentPatientCard } from '@/data/consentPatientDisplay';
import { CONSENT_TYPE_TONE, CONSENT_STATUS } from '@/data/consentRecords';
import { PHCIS_CHART } from '@/data/phcisChartPalette';
import { buildConsentCompareExportReport, ExportFormatPopup } from '@/pages/consent/consentExportPopup';

/* PHCIS | Consent — เปรียบเทียบแบบฟอร์มที่ให้ / ไม่ให้ความยินยอม
   เปิดจาก icon button ใน worklist จัดการความยินยอม */

const TITLE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.4,
  margin: 0,
};
const MUTED = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};
const BODY = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

const COLUMN_STYLE = {
  flex: '1 1 280px',
  minWidth: 260,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--dim-space-300)',
  padding: 'var(--dim-space-400)',
  borderRadius: 'var(--dim-radius-400)',
  background: 'var(--surface-card-100)',
  border: 'var(--dim-stroke-100) solid var(--border-card-default)',
  boxSizing: 'border-box',
  minHeight: 200,
};

const FormRow = ({ item }) => {
  const statusTone = (CONSENT_STATUS[item.status] || {}).tone || 'grey';
  const statusLabel = (CONSENT_STATUS[item.status] || {}).label || item.status;
  return (
    <div
      className='flex flex-col w-full'
      style={{
        gap: 'var(--dim-space-150)',
        padding: 'var(--dim-space-300)',
        borderRadius: 'var(--dim-radius-300)',
        background: 'var(--surface-card-200)',
        border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #E2E4E6)',
      }}
    >
      <div className='flex items-start justify-between' style={{ gap: 'var(--dim-space-200)' }}>
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
          <span className='truncate' style={BODY}>{item.formName}</span>
          <span style={MUTED}>{item.formCode} · {item.version}</span>
        </div>
        {item.reconsentSent && (
          <ColorfulBadge style='orange' size='small' hierarchy='secondary' width='hug'>
            ส่ง Reconsent แล้ว
          </ColorfulBadge>
        )}
      </div>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
        <ColorfulBadge style={CONSENT_TYPE_TONE[item.type] || 'grey'} size='small' hierarchy='secondary' width='hug'>
          {item.type}
        </ColorfulBadge>
        <ColorfulBadge style={statusTone} size='small' hierarchy='secondary' width='hug'>
          {statusLabel}
        </ColorfulBadge>
      </div>
    </div>
  );
};

const GroupColumn = ({ title, icon, tone, items, emptyLabel }) => {
  const accent = tone === 'teal' ? PHCIS_CHART.teal : PHCIS_CHART.pink;
  return (
    <div style={COLUMN_STYLE}>
      <div className='flex items-center justify-between' style={{ gap: 'var(--dim-space-200)' }}>
        <div className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
          <Icon name={icon} size={18} color={accent} />
          <h3 style={{ ...TITLE, color: accent }}>{title}</h3>
        </div>
        <span style={MUTED}>{items.length} รายการ</span>
      </div>
      {items.length === 0 ? (
        <span style={MUTED}>{emptyLabel}</span>
      ) : (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
          {items.map((item) => (
            <FormRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

const ConsentComparePopup = ({ open, onClose, hn = null }) => {
  const [records, setRecords] = useState(getConsentRecords);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  useEffect(() => subscribeConsentStore(() => setRecords(getConsentRecords())), []);

  useEffect(() => {
    if (!open) {
      setExportOpen(false);
      setExportDone(false);
    }
  }, [open]);

  const groups = useMemo(
    () => (hn ? buildConsentCompareGroups(hn, records) : { patient: null, consented: [], declined: [] }),
    [hn, records],
  );

  const patientCard = useMemo(() => {
    if (!groups.patient) return null;
    return resolveConsentPatientCard(groups.patient.hn, groups.patient.name);
  }, [groups.patient]);

  const exportReport = useMemo(() => buildConsentCompareExportReport(groups), [groups]);

  const canExport = exportReport && (groups.consented.length + groups.declined.length) > 0;

  return (
    <>
      <Popup
        open={open}
        onClose={onClose}
        size='extraLarge'
        title='เปรียบเทียบการให้ความยินยอม'
        subtitle='แบบฟอร์มที่ให้ความยินยอม และแบบฟอร์มที่ไม่ให้ความยินยอม ของผู้รับบริการรายนี้'
        headerTrailing={(
          <NeutralSubdueButton
            variant='outline'
            size='md'
            leadingIcon='ios_share'
            disabled={!canExport}
            onClick={() => setExportOpen(true)}
          >
            นำส่งออกรายงาน
          </NeutralSubdueButton>
        )}
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

          <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <GroupColumn
              title='ให้ความยินยอม'
              icon='check_circle'
              tone='teal'
              items={groups.consented}
              emptyLabel='ยังไม่มีแบบฟอร์มที่ให้ความยินยอม'
            />
            <GroupColumn
              title='ไม่ให้ความยินยอม'
              icon='cancel'
              tone='pink'
              items={groups.declined}
              emptyLabel='ยังไม่มีแบบฟอร์มที่ไม่ให้ความยินยอม'
            />
          </div>
        </div>
      </Popup>

      <ExportFormatPopup
        open={exportOpen}
        report={exportReport}
        onClose={() => setExportOpen(false)}
        onExported={() => {
          setExportOpen(false);
          setExportDone(true);
        }}
      />
      <SuccessToast
        open={exportDone}
        message='นำส่งออกรายงานแล้ว — ระบบบันทึก log การส่งออกข้อมูล'
        onClose={() => setExportDone(false)}
      />
    </>
  );
};

export default ConsentComparePopup;
