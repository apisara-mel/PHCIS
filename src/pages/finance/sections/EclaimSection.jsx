import React, { useMemo } from 'react';
import Table, { EllipsisText } from '@/components/table/Table';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { formatBaht } from '@/data/financePaymentPrototype';

/* NHSO e-Claim export — TOR appendix ก finance requirements. Lists every
   paid receipt billed under the "บัตรทอง (สปสช.)" rights group (the only
   rights group NHSO reimburses in this mock) and exports the claimable
   amount (the rights-covered portion, not what the patient paid) as a
   CSV shaped for NHSO's e-Claim upload. */

const csvEscape = (value) => {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const buildCsv = (rows) => {
  const header = ['เลขที่ใบเสร็จ', 'HN', 'ชื่อ-สกุล', 'แผนก', 'วันที่', 'ยอดเบิกจาก สปสช.'];
  const lines = rows.map((r) => [r.receiptNo, r.hn, r.patient.shortName, r.dept, r.visitDate, r.rightsCoverage]
    .map(csvEscape).join(','));
  return [header.join(','), ...lines].join('\n');
};

const downloadCsv = (rows) => {
  const csv = '﻿' + buildCsv(rows); // BOM so Thai text opens correctly in Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nhso-eclaim-${rows.length}-receipts.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const EclaimSection = ({ queue }) => {
  const claimRows = useMemo(
    () => queue.filter((r) => r.status === 'paid' && r.rights.key === 'gold'),
    [queue],
  );
  const claimTotal = claimRows.reduce((s, r) => s + r.rightsCoverage, 0);

  const columns = [
    { key: 'receiptNo', label: 'เลขที่ใบเสร็จ', width: 140 },
    {
      key: 'patient', label: 'ผู้ป่วย', flex: true, minWidth: 200,
      render: (row) => (
        <div className='flex flex-col min-w-0'>
          <EllipsisText text={row.patient.shortName} />
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>HN {row.hn}</span>
        </div>
      ),
    },
    { key: 'dept', label: 'แผนก', width: 160 },
    { key: 'visitDate', label: 'วันที่', width: 140 },
    { key: 'rightsCoverage', label: 'ยอดเบิกจาก สปสช.', width: 160, render: (row) => <span style={{ fontWeight: 'var(--type-weight-bold)' }}>{formatBaht(row.rightsCoverage)}</span> },
  ];

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
      <div className='flex items-center justify-between'>
        <div className='flex flex-col'>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>รายการที่เบิกได้ ({claimRows.length} ใบเสร็จ)</span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-bold)' }}>{formatBaht(claimTotal)}</span>
        </div>
        <BrandSubdueButton disabled={claimRows.length === 0} onClick={() => downloadCsv(claimRows)}>
          ส่งออกไฟล์ e-Claim (.csv)
        </BrandSubdueButton>
      </div>

      <Table columns={columns} rows={claimRows} rowKey={(row) => row.id} emptyMessage='ไม่มีรายการที่เบิกสปสช.ได้วันนี้' />
    </div>
  );
};

export default EclaimSection;
