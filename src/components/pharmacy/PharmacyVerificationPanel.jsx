import React, { useState } from 'react';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandButton from '@/components/button/BrandButton';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { verifyPrescription, appendPharmacistNote } from '@/data/pharmacyQueue';

/* Pharmacist verification + audit trail + Pharmacist note (ToR §1.9.2.7-8
   — "บันทึกการคัดกรองและตรวจสอบคำสั่งใช้ยาจากแพทย์โดยเภสัชกร รวมถึงตรวจสอบ
   ได้ว่าใครเป็นผู้ดำเนินการ" + "บันทึกข้อมูลที่สำคัญเพื่อการสื่อสารระหว่าง
   เภสัชกรกับบุคลากรทางแพทย์"). The audit table reuses the exact column
   shape of `RegistrationEditHistoryPanel.jsx` (เวลา/ผู้ดำเนินการ/รายการ/
   หมายเหตุ, newest-first). */

const LOG_COLUMNS = [
  { key: 'at', label: 'เวลา' },
  { key: 'actor', label: 'ผู้ดำเนินการ', flex: true, minWidth: 200 },
  { key: 'action', label: 'รายการ' },
  { key: 'note', label: 'หมายเหตุ', flex: true, minWidth: 200, render: (r) => r.note || '—' },
];

const PharmacyVerificationPanel = ({ queueNo, row, onChange }) => {
  const [note, setNote] = useState('');
  const [pharmacistNote, setPharmacistNote] = useState('');

  const handleVerify = () => {
    verifyPrescription(queueNo, note);
    setNote('');
    onChange?.();
  };

  const handleAddNote = () => {
    if (!pharmacistNote.trim()) return;
    appendPharmacistNote(queueNo, pharmacistNote.trim());
    setPharmacistNote('');
    onChange?.();
  };

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      <div className='flex items-center justify-between flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
            การตรวจสอบคำสั่งใช้ยาโดยเภสัชกร
          </h3>
          {row.verifiedBy ? (
            <Badge style='success' size='small'>ตรวจสอบแล้วโดย {row.verifiedBy} ({row.verifiedAt})</Badge>
          ) : (
            <Badge style='warning' size='small'>ยังไม่ได้ตรวจสอบ</Badge>
          )}
        </div>
      </div>

      <div className='flex flex-wrap items-end' style={{ gap: 'var(--dim-space-300)' }}>
        <div className='flex-1 min-w-[240px]'>
          <SuggestibleTextarea
            label='บันทึกผลการตรวจสอบ (ถ้ามี)'
            value={note}
            onChange={(e) => setNote(e?.target?.value ?? e ?? '')}
            placeholder='เช่น ตรวจสอบแล้ว ไม่พบความผิดปกติ'
            rows={2}
            minHeight={56}
          />
        </div>
        <BrandPrimaryButton leadingIcon='task_alt' onClick={handleVerify}>
          {row.verifiedBy ? 'ตรวจสอบซ้ำ' : 'ตรวจสอบคำสั่งใช้ยา'}
        </BrandPrimaryButton>
      </div>

      {row.verificationLog.length > 0 && (
        <Table columns={LOG_COLUMNS} rows={row.verificationLog} rowKey={(r) => r.id} emptyMessage='ยังไม่มีประวัติการตรวจสอบ' />
      )}

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)', borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)', paddingTop: 'var(--dim-space-300)' }}>
        <h4 style={{ margin: 0, fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
          Pharmacist note — สื่อสารกับบุคลากรทางการแพทย์
        </h4>
        <div className='flex flex-wrap items-end' style={{ gap: 'var(--dim-space-300)' }}>
          <div className='flex-1 min-w-[240px]'>
            <SuggestibleTextarea
              value={pharmacistNote}
              onChange={(e) => setPharmacistNote(e?.target?.value ?? e ?? '')}
              placeholder='เช่น ควรพิจารณาปรับขนาดยาในผู้ป่วยไตเสื่อม'
              rows={2}
              minHeight={56}
              showLabel={false}
            />
          </div>
          <BrandButton size='sm' leadingIcon='chat_add_on' onClick={handleAddNote} disabled={!pharmacistNote.trim()}>
            บันทึกหมายเหตุ
          </BrandButton>
        </div>
        {row.pharmacistNotes.length > 0 && (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
            {row.pharmacistNotes.map((n) => (
              <div key={n.id} className='flex items-start' style={{ gap: 'var(--dim-space-200)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
                <span style={{ color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap' }}>{n.at} · {n.by}</span>
                <span>{n.note}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacyVerificationPanel;
