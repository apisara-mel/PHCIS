import React, { useRef, useState } from 'react';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { Icon } from '@/components/icons/Icon';

/* นำเข้าไฟล์การเงินจาก สปสช. (Import NHSO Financial File) — TOR §1.5.
   Distinct from the "NHSO e-Claim" section (which *exports* claimable
   receipts out); this one *imports* สปสช.'s reconciliation/remittance
   file so its figures can feed financial reports. Mocked: accepts a
   file, "parses" only its line count, and keeps a local import log —
   no real 18-แฟ้ม/12-แฟ้ม schema parsing in this prototype. */

const NhsoImportSection = () => {
  const [history, setHistory] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const rowCount = text ? text.split('\n').filter((l) => l.trim()).length : 0;
      setHistory((prev) => [{ filename: file.name, rowCount, importedAt: new Date().toLocaleString('th-TH') }, ...prev]);
      setImporting(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
      <div
        className='flex flex-col items-center justify-center'
        style={{
          gap: 'var(--dim-space-200)',
          padding: 'var(--dim-space-600)',
          background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
          borderRadius: 'var(--dim-radius-400)',
        }}
      >
        <Icon name='upload_file' size={28} />
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
          นำเข้าไฟล์ข้อมูลการเงินจากสำนักงานหลักประกันสุขภาพแห่งชาติ (สปสช.) เพื่อใช้ประกอบรายงานทางการเงิน
        </span>
        <input ref={fileInputRef} type='file' accept='.csv,.txt' onChange={handleFile} style={{ display: 'none' }} />
        <BrandSubdueButton disabled={importing} onClick={() => fileInputRef.current?.click()}>
          {importing ? 'กำลังนำเข้า…' : 'เลือกไฟล์เพื่อนำเข้า'}
        </BrandSubdueButton>
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>ประวัติการนำเข้า</span>
        {history.length === 0 && (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>ยังไม่มีการนำเข้าไฟล์</span>
        )}
        {history.map((h, idx) => (
          <div key={idx} className='flex items-center justify-between' style={{ padding: 'var(--dim-space-200) 0', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)' }}>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>{h.filename}</span>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{h.rowCount} รายการ · {h.importedAt}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NhsoImportSection;
