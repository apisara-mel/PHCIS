import React, { useState } from 'react';
import BrandButton from '@/components/button/BrandButton';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { appendCounselingNote } from '@/data/pharmacyQueue';

/* คำแนะนำการใช้ยา (ToR §1.9.4.4 — "บันทึกการให้คำแนะนำการใช้ยาแก่ผู้รับ
   บริการ...และสามารถเรียกดูประวัติการให้คำแนะนำย้อนหลังได้"). Timestamped,
   newest-first append-only list — lighter-weight version of the
   `HistoryTimeline.jsx` "add note → prepend to list" pattern (prepend
   handled by `appendCounselingNote` in pharmacyQueue.js). */

const PRESET_NOTES = [
  'แนะนำรับประทานยาให้ครบตามแพทย์สั่ง',
  'แนะนำรับประทานก่อนอาหาร 30 นาที',
  'อาจทำให้ง่วงซึม ควรงดขับขี่ยานพาหนะ',
  'หากมีผื่นหรืออาการแพ้ ให้หยุดยาและมาพบแพทย์ทันที',
];

const PharmacyCounselingPanel = ({ queueNo, row, onChange }) => {
  const [note, setNote] = useState('');

  const handleAdd = () => {
    if (!note.trim()) return;
    appendCounselingNote(queueNo, note.trim());
    setNote('');
    onChange?.();
  };

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <h3 style={{ margin: 0, fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
        บันทึกคำแนะนำการใช้ยา
      </h3>

      <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-150)' }}>
        {PRESET_NOTES.map((p) => (
          <button
            key={p}
            type='button'
            onClick={() => setNote(p)}
            className='inline-flex items-center'
            style={{
              height: 'var(--dim-size-600, 32px)', padding: '0 var(--dim-space-300)', borderRadius: 'var(--dim-radius-full)',
              background: 'var(--surface-card-100)', border: 'var(--dim-stroke-100) solid var(--border-card-default)',
              color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs)', cursor: 'pointer',
            }}
          >
            {p}
          </button>
        ))}
      </div>

      <div className='flex flex-wrap items-end' style={{ gap: 'var(--dim-space-300)' }}>
        <div className='flex-1 min-w-[240px]'>
          <SuggestibleTextarea
            value={note}
            onChange={(e) => setNote(e?.target?.value ?? e ?? '')}
            placeholder='พิมพ์คำแนะนำการใช้ยา หรือเลือกจากปุ่มด้านบน'
            rows={2}
            minHeight={56}
            showLabel={false}
          />
        </div>
        <BrandButton size='sm' leadingIcon='record_voice_over' onClick={handleAdd} disabled={!note.trim()}>
          บันทึก
        </BrandButton>
      </div>

      {row.counselingLog.length > 0 && (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            ประวัติการให้คำแนะนำ ({row.counselingLog.length} รายการ · เรียงจากใหม่ไปเก่า)
          </span>
          {row.counselingLog.map((n) => (
            <div key={n.id} className='flex items-start' style={{ gap: 'var(--dim-space-200)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
              <span style={{ color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap' }}>{n.at} · {n.by}</span>
              <span>{n.note}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PharmacyCounselingPanel;
