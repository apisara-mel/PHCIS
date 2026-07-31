import React, { useState } from 'react';
import Table, { EllipsisText } from '@/components/table/Table';
import Checkbox from '@/components/checkbox/Checkbox';
import StatusBadge from '@/components/badge/StatusBadge';
import RadioGroup from '@/components/radio/RadioGroup';
import InputField from '@/components/forms/InputField';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { QUEUE_STATUSES, formatBaht } from '@/data/financePaymentPrototype';

/* บันทึกปรับปรุงสถานะการรับชำระ (Payment-Status Correction) — คู่มือ
   ระบบงานห้องเงิน §2.4. A blunt batch-correction tool: tick one or more
   rows, pick the correct status, save — for fixing a data-entry mistake
   in what got marked paid/pending/voided, distinct from the §2.1 void
   sub-flow (single receipt, requires reason + signer, paid→voided only)
   and from §2.5 rights adjustment (changes rights, not payment status). */

const STATUS_STYLE = { pending: 'info', paid: 'success', voided: 'error' };

const PaymentStatusAdjustmentSection = ({ queue, onAdjustStatus }) => {
  const [selected, setSelected] = useState(new Set());
  const [newStatus, setNewStatus] = useState(QUEUE_STATUSES[0].key);
  const [signer, setSigner] = useState('');

  const allSelected = selected.size > 0 && selected.size === queue.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(queue.map((r) => r.id)));
  const toggleOne = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const canSave = selected.size > 0 && signer.trim().length > 0;

  const handleSave = () => {
    onAdjustStatus([...selected], newStatus, signer.trim());
    setSelected(new Set());
    setSigner('');
  };

  const columns = [
    {
      key: 'select', label: '', width: 48,
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected.has(row.id)} onChange={() => toggleOne(row.id)} />
        </div>
      ),
    },
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
    { key: 'amountDue', label: 'ยอดชำระ', width: 120, render: (row) => formatBaht(row.amountDue) },
    { key: 'status', label: 'สถานะปัจจุบัน', width: 140, render: (row) => <StatusBadge style={STATUS_STYLE[row.status]} size='small'>{QUEUE_STATUSES.find((s) => s.key === row.status)?.label}</StatusBadge> },
  ];

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
      <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
        <Checkbox checked={allSelected} onChange={toggleAll} />
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>เลือกทั้งหมด ({selected.size}/{queue.length})</span>
      </div>

      <Table columns={columns} rows={queue} rowKey={(row) => row.id} onRowClick={(row) => toggleOne(row.id)} emptyMessage='ไม่มีรายการ' />

      <div
        className='flex items-end flex-wrap'
        style={{ gap: 'var(--dim-space-400)', background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', borderRadius: 'var(--dim-radius-300)', padding: 'var(--dim-space-400)' }}
      >
        <RadioGroup
          legend='สถานะใหม่'
          direction='row'
          value={newStatus}
          onChange={setNewStatus}
          options={QUEUE_STATUSES.map((s) => ({ value: s.key, label: s.label }))}
        />
        <InputField label='เจ้าหน้าที่ผู้แก้ไข' value={signer} onChange={setSigner} placeholder='ชื่อ-นามสกุล' />
        <BrandSubdueButton disabled={!canSave} onClick={handleSave}>
          บันทึกการปรับสถานะ ({selected.size} รายการ)
        </BrandSubdueButton>
      </div>
    </div>
  );
};

export default PaymentStatusAdjustmentSection;
