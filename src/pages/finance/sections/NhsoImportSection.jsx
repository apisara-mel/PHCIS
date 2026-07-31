import React, { useMemo, useRef, useState } from 'react';
import Table from '@/components/table/Table';
import Alert from '@/components/alert/Alert';
import StatusBadge from '@/components/badge/StatusBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { Icon } from '@/components/icons/Icon';
import { formatBaht } from '@/data/financePaymentPrototype';
import {
  decodeThaiFile, parseNhsoStatement, summariseNhso, SAMPLE_STATEMENT,
} from '@/data/nhsoImport';

/* นำเข้าไฟล์การเงินจาก สปสช. (Import NHSO statement) — TOR §1.8.6.7.

   ต่างจากแท็บ "NHSO e-Claim" ที่ *ส่งออก* ใบเสร็จไปเบิก — แท็บนี้ *นำเข้า*
   ไฟล์สรุปการโอนเงินที่ สปสช. ส่งกลับมา แล้วยอดที่อนุมัติจะไหลไปโผล่ใน
   "รายงานการเงิน" (§1.20.3.1 ช่องทางเครดิต) ตามที่ TOR กำหนดว่าไฟล์นี้ต้อง
   "ใช้เป็นข้อมูลประกอบการทำรายงานทางการเงิน" — เดิมแท็บนี้แค่นับบรรทัด
   แล้วทิ้ง จึงยังไม่ตอบข้อนี้จริง.

   State ถูกยกไปไว้ที่ FinancePaymentPage เพราะรายงานต้องอ่านด้วย และการ
   สลับแท็บ unmount section นี้ทิ้ง. */

const NhsoImportSection = ({ value, onChange }) => {
  const { records = [], batches = [] } = value || {};
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const fileInputRef = useRef(null);

  const summary = useMemo(() => summariseNhso(records), [records]);

  const ingest = (text, filename) => {
    const existingRefs = new Set(records.map((r) => r.ref));
    const { records: fresh, skipped, duplicates } = parseNhsoStatement(text, existingRefs);
    onChange({
      records: [...records, ...fresh],
      batches: [
        {
          filename,
          added: fresh.length,
          duplicates,
          skipped: skipped.length,
          approvedTotal: summariseNhso(fresh).approvedTotal,
          importedAt: new Date().toLocaleString('th-TH'),
        },
        ...batches,
      ],
    });
    setLastResult({ added: fresh.length, duplicates, skipped });
    setImporting(false);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    /* อ่านเป็น ArrayBuffer เพื่อให้ตัดสินใจ encoding เองได้ (TIS-620) */
    reader.onload = () => ingest(decodeThaiFile(reader.result), file.name);
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const downloadSample = () => {
    const blob = new Blob(['﻿', SAMPLE_STATEMENT], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nhso-statement-ตัวอย่าง.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const recordColumns = [
    { key: 'ref', label: 'เลขที่อ้างอิง', width: 170 },
    { key: 'hn', label: 'HN', width: 110 },
    { key: 'serviceDate', label: 'วันที่รับบริการ', width: 140 },
    { key: 'rightsCode', label: 'รหัสสิทธิ', width: 100 },
    { key: 'billed', label: 'ยอดเรียกเก็บ', width: 130, align: 'right', render: (r) => formatBaht(r.billed) },
    {
      key: 'approved', label: 'ยอดอนุมัติ', width: 130, align: 'right',
      render: (r) => <span style={{ fontWeight: 'var(--type-weight-bold)' }}>{formatBaht(r.approved)}</span>,
    },
    {
      key: 'shortfall', label: 'ส่วนต่าง', width: 120, align: 'right',
      render: (r) => {
        const diff = r.billed - (r.status === 'approved' ? r.approved : 0);
        return diff > 0
          ? <span style={{ color: 'var(--text-statusbadge-warning, #C2410C)' }}>-{formatBaht(diff)}</span>
          : <span style={{ color: 'var(--text-content-tertiary)' }}>-</span>;
      },
    },
    {
      key: 'status', label: 'สถานะ', width: 120,
      render: (r) => (r.status === 'approved'
        ? <StatusBadge style='success' size='small'>อนุมัติ</StatusBadge>
        : <StatusBadge style='error' size='small'>ปฏิเสธ</StatusBadge>),
    },
  ];

  const batchColumns = [
    { key: 'filename', label: 'ไฟล์', flex: true, minWidth: 220 },
    { key: 'importedAt', label: 'เวลานำเข้า', width: 190 },
    { key: 'added', label: 'เพิ่มใหม่', width: 100, align: 'right' },
    {
      key: 'duplicates', label: 'ซ้ำ (ข้าม)', width: 110, align: 'right',
      render: (b) => (b.duplicates > 0
        ? <span style={{ color: 'var(--text-statusbadge-warning, #C2410C)' }}>{b.duplicates}</span>
        : '-'),
    },
    { key: 'skipped', label: 'อ่านไม่ได้', width: 110, align: 'right', render: (b) => b.skipped || '-' },
    { key: 'approvedTotal', label: 'ยอดอนุมัติ', width: 140, align: 'right', render: (b) => formatBaht(b.approvedTotal) },
  ];

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
      <div
        className='flex flex-col items-center justify-center'
        style={{
          gap: 'var(--dim-space-200)',
          paddingTop: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
          borderRadius: 'var(--dim-radius-400)',
        }}
      >
        <Icon name='upload_file' size={28} />
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)', textAlign: 'center' }}>
          นำเข้าไฟล์สรุปการโอนเงินจากสำนักงานหลักประกันสุขภาพแห่งชาติ (สปสช.)
          <br />
          รูปแบบ: เลขที่อ้างอิง · HN · วันที่รับบริการ · รหัสสิทธิ · ยอดเรียกเก็บ · ยอดอนุมัติ · สถานะ
          <br />
          รองรับ CSV / pipe / TAB และ encoding TIS-620 · เลขที่อ้างอิงซ้ำจะถูกข้าม ไม่บวกยอดทบ
        </span>
        <input ref={fileInputRef} type='file' accept='.csv,.txt' onChange={handleFile} style={{ display: 'none' }} />
        <div className='flex items-center flex-wrap justify-center' style={{ gap: 'var(--dim-space-200)' }}>
          <BrandSubdueButton disabled={importing} onClick={() => fileInputRef.current?.click()}>
            {importing ? 'กำลังนำเข้า…' : 'เลือกไฟล์เพื่อนำเข้า'}
          </BrandSubdueButton>
          <NeutralSubdueButton leadingIcon='download' onClick={downloadSample}>ดาวน์โหลดไฟล์ตัวอย่าง</NeutralSubdueButton>
        </div>
      </div>

      {lastResult && (
        <Alert
          type={lastResult.skipped.length > 0 ? 'warning' : 'success'}
          title={`นำเข้าสำเร็จ ${lastResult.added} รายการ`}
          subtext={[
            lastResult.duplicates > 0 ? `ข้ามรายการซ้ำ ${lastResult.duplicates}` : null,
            lastResult.skipped.length > 0 ? `อ่านไม่ได้ ${lastResult.skipped.length} บรรทัด (${lastResult.skipped[0].reason})` : null,
          ].filter(Boolean).join(' · ') || 'ยอดอนุมัติถูกนำไปรวมในรายงานการเงินแล้ว'}
        />
      )}

      {records.length > 0 && (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
          {[
            { label: `รายการทั้งหมด (${summary.count})`, value: formatBaht(summary.billedTotal), sub: 'ยอดเรียกเก็บ' },
            { label: `อนุมัติ (${summary.approvedCount})`, value: formatBaht(summary.approvedTotal), sub: 'ไหลเข้ารายงานการเงิน', highlight: true },
            { label: `ปฏิเสธ (${summary.rejectedCount})`, value: formatBaht(summary.shortfall), sub: 'ส่วนต่าง/ยอดที่ไม่ได้รับ' },
          ].map((tile) => (
            <div
              key={tile.label}
              className='flex flex-col'
              style={{
                minWidth: 200,
                background: tile.highlight ? 'var(--surface-brandPrimary-default, #007549)' : 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                borderRadius: 'var(--dim-radius-300)',
                paddingTop: 'var(--dim-space-300)',
                paddingRight: 'var(--dim-space-300)',
                paddingBottom: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-300)',
                gap: 'var(--dim-space-050, 2px)',
              }}
            >
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: tile.highlight ? 'var(--text-content-on-content, #FFFFFF)' : 'var(--text-content-tertiary)' }}>{tile.label}</span>
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-bold)', color: tile.highlight ? 'var(--text-content-on-content, #FFFFFF)' : undefined }}>{tile.value}</span>
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: tile.highlight ? 'var(--text-content-on-content, #FFFFFF)' : 'var(--text-content-secondary)' }}>{tile.sub}</span>
            </div>
          ))}
        </div>
      )}

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>รายการที่นำเข้า</span>
        <Table columns={recordColumns} rows={records} rowKey={(r) => r.ref} emptyMessage='ยังไม่มีข้อมูลที่นำเข้า' />
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>ประวัติการนำเข้า</span>
        <Table columns={batchColumns} rows={batches} rowKey={(b, i) => `${b.filename}-${i}`} emptyMessage='ยังไม่มีการนำเข้าไฟล์' />
      </div>
    </div>
  );
};

export default NhsoImportSection;
