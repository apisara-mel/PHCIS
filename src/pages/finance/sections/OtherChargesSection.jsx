import React, { useMemo, useState } from 'react';
import Table, { EllipsisText } from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import RadioGroup from '@/components/radio/RadioGroup';
import InputField from '@/components/forms/InputField';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Popup from '@/components/popup/Popup';
import { RIGHTS_GROUPS, formatBaht } from '@/data/financePaymentPrototype';

/* บันทึกค่าใช้จ่ายอื่นๆ (Record Other/Miscellaneous Charges) — คู่มือ
   ระบบงานห้องเงิน §2.3. Adds an ad-hoc charge line (รายการ, จำนวนเงิน,
   สิทธิการรักษา, หน่วยงานที่ทำ, หน่วยงานที่ส่ง, แพทย์) to a patient's
   receipt — the manual's screen for costs that don't come from a normal
   service/lab/medication order.

   Scope note: the manual lets the operator pick rights independently
   per misc charge; this mock reuses the visit's existing coverage ratio
   for the new line (same simplification noted on ปรับสิทธิ) rather than
   modelling a full rights → coverage-percentage table. */

const AddChargeForm = ({ row, onCancel, onConfirm }) => {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [rightsKey, setRightsKey] = useState(row.rights.key);
  const [performingUnit, setPerformingUnit] = useState('');
  const [referringUnit, setReferringUnit] = useState('');
  const [doctor, setDoctor] = useState('');
  const canConfirm = label.trim().length > 0 && Number(amount) > 0;

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
      <div className='flex items-end' style={{ gap: 'var(--dim-space-300)' }}>
        <InputField label='รายการ' value={label} onChange={setLabel} placeholder='เช่น ค่าธรรมเนียมเอกสาร, ค่าส่งต่อ' />
        <InputField label='จำนวนเงิน' type='number' value={amount} onChange={setAmount} placeholder='0.00' />
      </div>
      <RadioGroup
        legend='สิทธิการรักษา'
        direction='row'
        value={rightsKey}
        onChange={setRightsKey}
        options={Object.values(RIGHTS_GROUPS).map((g) => ({ value: g.key, label: g.label }))}
      />
      <div className='flex items-end' style={{ gap: 'var(--dim-space-300)' }}>
        <InputField label='หน่วยงานที่ทำ' value={performingUnit} onChange={setPerformingUnit} placeholder='เช่น แผนกอายุรกรรม' />
        <InputField label='หน่วยงานที่ส่ง' value={referringUnit} onChange={setReferringUnit} placeholder='เช่น ห้องบัตร' />
      </div>
      <InputField label='แพทย์เจ้าของไข้' value={doctor} onChange={setDoctor} placeholder='ชื่อ-นามสกุลแพทย์' />
      <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-200)' }}>
        <NeutralSubdueButton size='sm' onClick={onCancel}>ยกเลิก</NeutralSubdueButton>
        <BrandSubdueButton
          size='sm'
          disabled={!canConfirm}
          onClick={() => onConfirm({
            label: label.trim(),
            amount: Number(amount),
            rightsKey,
            performingUnit: performingUnit.trim(),
            referringUnit: referringUnit.trim(),
            doctor: doctor.trim(),
          })}
        >
          บันทึกค่าใช้จ่าย
        </BrandSubdueButton>
      </div>
    </div>
  );
};

const OtherChargesSection = ({ queue, onAddCharge }) => {
  const [activeRow, setActiveRow] = useState(null);

  const otherItemCounts = useMemo(() => Object.fromEntries(
    queue.map((r) => [r.id, r.items.filter((i) => i.category === 'other' && i.addedManually).length]),
  ), [queue]);

  const columns = [
    { key: 'queueNo', label: 'คิว', width: 80 },
    {
      key: 'patient', label: 'ผู้ป่วย', flex: true, minWidth: 200,
      render: (row) => (
        <div className='flex flex-col min-w-0'>
          <EllipsisText text={row.patient.shortName} />
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>HN {row.hn}</span>
        </div>
      ),
    },
    { key: 'rights', label: 'สิทธิ', width: 140, render: (row) => <ColorfulBadge badgeStyle={row.rights.badge} size='small'>{row.rights.short}</ColorfulBadge> },
    { key: 'dept', label: 'แผนก', width: 140 },
    {
      key: 'otherCharges', label: 'ค่าใช้จ่ายอื่นๆที่เพิ่ม', flex: true, minWidth: 200,
      render: (row) => (otherItemCounts[row.id] > 0
        ? <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {row.items.filter((i) => i.category === 'other' && i.addedManually).map((i) => `${i.label} (${formatBaht(i.amount)})`).join(', ')}
          </span>
        : <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>-</span>),
    },
    {
      key: 'action', label: '', width: 160,
      render: (row) => <NeutralSubdueButton size='sm' onClick={(e) => { e.stopPropagation(); setActiveRow(row); }}>เพิ่มค่าใช้จ่าย</NeutralSubdueButton>,
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
          title='บันทึกค่าใช้จ่ายอื่นๆ'
          subtitle={`${activeRow.patient.shortName} · HN ${activeRow.hn} · คิว ${activeRow.queueNo}`}
        >
          <AddChargeForm
            row={activeRow}
            onCancel={() => setActiveRow(null)}
            onConfirm={(charge) => {
              onAddCharge(activeRow.id, charge);
              setActiveRow(null);
            }}
          />
        </Popup>
      )}
    </div>
  );
};

export default OtherChargesSection;
