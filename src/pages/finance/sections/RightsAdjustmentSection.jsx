import React, { useState } from 'react';
import Table, { EllipsisText } from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import RadioGroup from '@/components/radio/RadioGroup';
import InputField from '@/components/forms/InputField';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Popup from '@/components/popup/Popup';
import { RIGHTS_GROUPS } from '@/data/financePaymentPrototype';

/* ปรับสิทธิ (Rights Adjustment) — TOR §2.5. Corrects a patient's rights
   group after the fact (e.g. registration picked the wrong scheme) and
   keeps an audit trail (from → to, reason, approving staff) on the row.

   Scope note: this mock only relabels `row.rights` + logs the adjustment.
   Re-deriving the charge split (covered/patientPortion per line item)
   needs a real per-rights-group coverage rule from the backend, which is
   out of scope for this prototype pass — see FinancePaymentPage's TOR
   scope note. */

const RIGHTS_ADJUST_REASON_SUGGESTIONS = [
  'ลงทะเบียนสิทธิผิดพลาดตั้งแต่ขั้นตอนคัดกรอง',
  'สิทธิการรักษาหมดอายุ ผู้ป่วยชำระเงินเองชั่วคราว',
  'ผู้ป่วยแจ้งสิทธิใหม่ภายหลังจากลงทะเบียน',
  'ตรวจสอบสิทธิ ณ วันนัดพบว่าไม่ตรงกับระบบ',
  'หน่วยงานต้นสังกัดแจ้งเปลี่ยนแปลงสิทธิการรักษา',
];

const RightsAdjustForm = ({ row, onCancel, onConfirm }) => {
  const [toKey, setToKey] = useState(row.rights.key);
  const [reason, setReason] = useState('');
  const [signer, setSigner] = useState('');
  const canConfirm = toKey !== row.rights.key && reason.trim().length > 0 && signer.trim().length > 0;

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
      <RadioGroup
        legend='สิทธิใหม่'
        direction='row'
        value={toKey}
        onChange={setToKey}
        options={Object.values(RIGHTS_GROUPS).map((g) => ({ value: g.key, label: g.label }))}
      />
      <SuggestibleTextarea
        voice
        label='เหตุผลการปรับสิทธิ'
        required
        height={140}
        minHeight={96}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder='เช่น ลงทะเบียนสิทธิผิด, สิทธิหมดอายุ, ผู้ป่วยแจ้งสิทธิใหม่'
        suggestions={RIGHTS_ADJUST_REASON_SUGGESTIONS}
        minChars={3}
      />
      <InputField label='ผู้อนุมัติ' value={signer} onChange={setSigner} placeholder='ชื่อ-นามสกุล เจ้าหน้าที่ผู้อนุมัติ' />
      <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-200)' }}>
        <NeutralSubdueButton size='sm' onClick={onCancel}>ยกเลิก</NeutralSubdueButton>
        <BrandSubdueButton size='sm' disabled={!canConfirm} onClick={() => onConfirm({ toKey, reason: reason.trim(), signer: signer.trim() })}>
          ยืนยันการปรับสิทธิ
        </BrandSubdueButton>
      </div>
    </div>
  );
};

const RightsAdjustmentSection = ({ queue, onAdjustRights }) => {
  const [activeRow, setActiveRow] = useState(null);

  const columns = [
    { key: 'queueNo', label: 'คิว' },
    {
      key: 'patient', label: 'ผู้ป่วย', flex: true, minWidth: 200,
      render: (row) => (
        <div className='flex flex-col min-w-0'>
          <EllipsisText text={row.patient.shortName} />
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>HN {row.hn}</span>
        </div>
      ),
    },
    { key: 'rights', label: 'สิทธิปัจจุบัน', render: (row) => <ColorfulBadge badgeStyle={row.rights.badge} size='small'>{row.rights.label}</ColorfulBadge> },
    {
      key: 'adjustment', label: 'ประวัติการปรับสิทธิ', flex: true, minWidth: 220,
      render: (row) => (row.rightsAdjustment
        ? <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {RIGHTS_GROUPS[row.rightsAdjustment.fromKey]?.label} → {row.rights.label} · {row.rightsAdjustment.reason} · โดย {row.rightsAdjustment.signer}
          </span>
        : <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>-</span>),
    },
    {
      key: 'action', label: '',
      render: (row) => <NeutralSubdueButton size='sm' onClick={(e) => { e.stopPropagation(); setActiveRow(row); }}>แก้ไขสิทธิ</NeutralSubdueButton>,
    },
  ];

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
      <Table columns={columns} rows={queue} rowKey={(row) => row.id} emptyMessage='ไม่มีรายการ' />

      {activeRow && (
        <Popup
          open
          onClose={() => setActiveRow(null)}
          size='medium'
          title='ปรับสิทธิผู้ป่วย'
          subtitle={`${activeRow.patient.shortName} · HN ${activeRow.hn} · คิว ${activeRow.queueNo} · สิทธิปัจจุบัน: ${activeRow.rights.label}`}
        >
          <RightsAdjustForm
            row={activeRow}
            onCancel={() => setActiveRow(null)}
            onConfirm={({ toKey, reason, signer }) => {
              onAdjustRights(activeRow.id, { toKey, reason, signer });
              setActiveRow(null);
            }}
          />
        </Popup>
      )}
    </div>
  );
};

export default RightsAdjustmentSection;
