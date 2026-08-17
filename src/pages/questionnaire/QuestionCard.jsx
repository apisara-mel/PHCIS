import React, { useEffect, useRef, useState } from 'react';
import Textarea from '@/components/forms/Textarea';
import InputField from '@/components/forms/InputField';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import SelectableTag from '@/components/forms/SelectableTag';
import { STATUSES, resolveStatus, setEntry } from '@/pages/questionnaire/questionnaireStore';

/* หนึ่งการ์ด = หนึ่งคำถามที่ผู้สัมภาษณ์ถามลูกค้า
   ซ้าย: ลำดับ + หัวข้อ + คำถามเต็ม (ยังเห็นตลอดขณะพิมพ์ — recognition over recall)
   ขวา/ล่าง: ช่องคำตอบ + หมายเหตุ + ปุ่มสถานะ

   พิมพ์แล้วเก็บลง state ในการ์ดก่อน แล้ว debounce 350ms ค่อยเขียนลง store
   เพื่อไม่ให้ list ทั้งหน้า re-render ทุกตัวอักษร */

const BADGE_TONE = {
  'กระบวนการทำงาน': 'blue',
  'ข้อมูล': 'teal',
  'เงื่อนไข': 'orange',
  'ฟอร์ม': 'purple',
  'รายงาน': 'indigo',
  'รูปแบบ': 'magenta',
};

const LABEL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
};

const QUESTION_TEXT = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.7,
  whiteSpace: 'pre-line',
};

const NO_CHIP = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 44,
  height: 24,
  borderRadius: 'var(--dim-radius-full, 999px)',
  background: 'var(--surface-brandPrimary-quaternary)',
  color: 'var(--text-brandPrimary-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  fontWeight: 'var(--type-weight-medium)',
  paddingLeft: 'var(--dim-space-200)',
  paddingRight: 'var(--dim-space-200)',
};

const QuestionCard = ({ item, entry, index }) => {
  const status = resolveStatus(entry);
  const [answer, setAnswer] = useState(entry?.answer || '');
  const [note, setNote] = useState(entry?.note || '');
  const dirty = useRef(false);

  /* สลับคำถาม (เปลี่ยนตัวกรอง / โมดูล) → รับค่าใหม่จาก store */
  useEffect(() => {
    dirty.current = false;
    setAnswer(entry?.answer || '');
    setNote(entry?.note || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  useEffect(() => {
    if (!dirty.current) return undefined;
    const t = setTimeout(() => setEntry(item.id, { answer, note }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer, note]);

  const edit = (fn) => (v) => { dirty.current = true; fn(v); };

  const toggleStatus = (key) => {
    setEntry(item.id, { status: entry?.status === key ? null : key });
  };

  return (
    <article
      id={`q-${item.id}`}
      className='flex flex-col w-full'
      style={{
        background: 'var(--surface-card-100)',
        border: `var(--dim-stroke-100) solid ${status === 'followup'
          ? 'var(--border-statusbadge-warning)'
          : 'var(--border-brandPrimary-quaternary)'}`,
        borderRadius: 'var(--dim-radius-400)',
        boxShadow: 'var(--shadow-card)',
        paddingTop: 'var(--dim-space-400)',
        paddingRight: 'var(--dim-space-400)',
        paddingBottom: 'var(--dim-space-400)',
        paddingLeft: 'var(--dim-space-400)',
        gap: 'var(--dim-space-300)',
        opacity: status === 'na' ? 0.62 : 1,
      }}
    >
      {/* หัวการ์ด — ลำดับ · หัวข้อ · สถานะ */}
      <header className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <span style={NO_CHIP}>{item.no || `#${index + 1}`}</span>
        <span className='flex-1 min-w-0' style={{ ...LABEL, lineHeight: 1.6 }}>
          {item.topic || '—'}
        </span>
        {entry?.updatedAt && (
          <span style={{ ...LABEL, whiteSpace: 'nowrap' }}>
            บันทึก {new Date(entry.updatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
          </span>
        )}
        <StatusBadge style={STATUSES[status].badge} size='small' showDot>
          {STATUSES[status].label}
        </StatusBadge>
      </header>

      {/* คำถามที่ใช้ถามลูกค้า */}
      <p style={{ ...QUESTION_TEXT, margin: 0 }}>{item.question}</p>

      {item.types.length > 0 && (
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-150)' }}>
          {item.types.map((t) => (
            <ColorfulBadge key={t} style={BADGE_TONE[t] || 'grey'} size='small'>{t}</ColorfulBadge>
          ))}
        </div>
      )}

      {/* คำตอบ */}
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
        <Textarea
          label='คำตอบ / ข้อมูลที่ได้รับจากลูกค้า'
          showHelperText={false}
          placeholder='พิมพ์คำตอบระหว่างสัมภาษณ์ได้เลย — ระบบบันทึกให้อัตโนมัติ'
          value={answer}
          onChange={edit(setAnswer)}
          rows={3}
          minHeight={84}
          /* FieldShell จำกัด maxWidth 640 เป็นค่าเริ่มต้น — ช่องคำตอบต้องเต็มการ์ด */
          style={{ maxWidth: '100%' }}
        />
        <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <div className='flex-1' style={{ minWidth: 'min(100%, 260px)' }}>
            <InputField
              label='หมายเหตุ / สิ่งที่ต้องขอเพิ่ม'
              showHelperText={false}
              showLeadingIcon={false}
              size='md'
              placeholder='เช่น ขอไฟล์ตัวอย่าง, รอยืนยันจากฝ่ายไอที'
              value={note}
              onChange={edit(setNote)}
              style={{ maxWidth: '100%' }}
            />
          </div>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)', paddingBottom: 'var(--dim-space-100)' }}>
            <SelectableTag
              size='md'
              label={STATUSES.followup.label}
              selected={entry?.status === 'followup'}
              onClick={() => toggleStatus('followup')}
            />
            <SelectableTag
              size='md'
              label={STATUSES.na.label}
              selected={entry?.status === 'na'}
              onClick={() => toggleStatus('na')}
            />
          </div>
        </div>
      </div>
    </article>
  );
};

export default QuestionCard;
