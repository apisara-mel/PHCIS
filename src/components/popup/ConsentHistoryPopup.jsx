import React from 'react';
import Popup from '@/components/popup/Popup';
import Table, { EllipsisText } from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
import { CONSENT_TYPE_TONE, CONSENT_STATUS } from '@/data/consentRecords';

/* MIH ConsentHistoryPopup — Figma "PHCIS | Consent" Popup ExtraLarge
   (node 299:86535). Shows a patient's full consent history including
   grants and withdrawals. Built on the shared Popup + Table; all values
   alias design.md tokens. */

const TEXT_CELL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

const HISTORY_COLUMNS = [
  { key: 'date', header: 'วันที่', width: 150, render: (r) => <span style={TEXT_CELL}>{r.date}</span> },
  {
    key: 'formCode', header: 'รหัสแบบฟอร์ม', width: 150,
    render: (r) => <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>{r.formCode}</ColorfulBadge>,
  },
  {
    key: 'formName', header: 'ชื่อแบบฟอร์ม', flex: true, minWidth: 360,
    render: (r) => (
      <div className='min-w-0 w-full' style={TEXT_CELL}>
        <EllipsisText text={r.formName || '-'} />
      </div>
    ),
  },
  {
    key: 'type', header: 'ประเภท', width: 120,
    render: (r) => <ColorfulBadge style={CONSENT_TYPE_TONE[r.type] || 'grey'} size='small' hierarchy='secondary' width='hug'>{r.type}</ColorfulBadge>,
  },
  {
    key: 'version', header: 'เวอร์ชั่น', width: 110,
    render: (r) => <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{r.version}</ColorfulBadge>,
  },
  {
    key: 'status', header: 'สถานะ', width: 150,
    render: (r) => <ColorfulBadge style={(CONSENT_STATUS[r.status] || {}).tone || 'grey'} size='small' hierarchy='secondary' width='hug'>{r.status}</ColorfulBadge>,
  },
  { key: 'channel', header: 'ช่องทางที่ถอน', width: 150, render: (r) => <span style={TEXT_CELL}>{r.channel}</span> },
];

const Initials = ({ name }) => (
  <span
    className='inline-flex items-center justify-center shrink-0'
    style={{
      width: 'var(--dim-size-1000)', height: 'var(--dim-size-1000)',
      borderRadius: 'var(--dim-radius-600)',
      background: 'var(--surface-brandPrimary-quaternary)',
      color: 'var(--text-brandPrimary-default)',
      fontFamily: 'var(--type-family-heading-graphic2)',
      fontSize: 'var(--type-size-base)', lineHeight: 1,
    }}
    aria-hidden
  >
    {(name || '?').trim().charAt(0)}
  </span>
);

const InfoCol = ({ label, value }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
    <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', lineHeight: 1.5 }}>{label}</span>
    <span style={{ color: 'var(--text-content-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', lineHeight: 1.5 }}>{value}</span>
  </div>
);

export default function ConsentHistoryPopup({ open, onClose, record }) {
  const rows = (record && record.history && record.history.length)
    ? record.history
    : [];

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='extraLarge'
      title='ประวัติความยินยอม'
      subtitle='ประวัติการให้ความยินยอม รวมถึงการเพิกถอนความยินยอม'
      footer={<BrandButton variant='fill' size='md' onClick={onClose}>ปิด</BrandButton>}
    >
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
        {/* Patient context card */}
        <div
          className='flex items-center'
          style={{
            gap: 'var(--dim-space-600)',
            padding: 'var(--dim-space-400)',
            borderRadius: 'var(--dim-radius-400)',
            background: 'var(--surface-brandPrimary-quaternary)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          }}
        >
          <Initials name={record && record.name} />
          <InfoCol label='ชื่อ-นามสกุล ผู้ป่วย' value={(record && record.name) || '-'} />
          <InfoCol label='HN (Hospital Number)' value={(record && record.hn) || '-'} />
          {record && record.guardian && (
            <InfoCol label='ผู้แทนโดยชอบธรรม (กรณีผู้เยาว์)' value={record.guardian} />
          )}
        </div>

        <Table
          columns={HISTORY_COLUMNS}
          rows={rows}
          rowKey={(r, i) => `${r.formCode}-${r.date}-${i}`}
          emptyMessage='ยังไม่มีประวัติความยินยอม'
          emptySubtext='เมื่อผู้ป่วยให้หรือถอนความยินยอม รายการจะปรากฏที่นี่'
        />

        {/* Audit trail ของรายการนี้ — TOR 1.4.3.16 */}
        {record && (
          <ConsentAuditBar
            recordedBy={record.requester || '-'}
            recordedAt={record.createdDate || '-'}
            editedAt={record.signedDate && record.signedDate !== '-' ? record.signedDate : undefined}
          />
        )}
      </div>
    </Popup>
  );
}
