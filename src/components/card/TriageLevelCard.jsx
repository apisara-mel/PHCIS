import React from 'react';
import SelectableCardButton from '@/components/button/SelectableCardButton';

/* MIH TriageLevelCard — การ์ดเลือกระดับความเร่งด่วน (ESI 1–5)
   ตัวเดียวของทั้งระบบ ก่อนหน้านี้มีสองสำเนาที่วาดเองเกือบเหมือนกัน
   (คัดกรอง OPD และ AddVitalsModal ของงานสังเกตอาการ) แล้วเพี้ยนกันทีละนิด

   เลย์เอาต์ (มติผู้ใช้ 27 ส.ค. 69): **badge อยู่ซ้าย** แล้วต่อด้วยคอลัมน์
   ข้อความ — ภาษาไทยบรรทัดบน · ภาษาอังกฤษบรรทัดล่าง ตัวเล็กลงและสีอ่อนลง
   (ไทยคือสิ่งที่พยาบาลอ่านจริง อังกฤษเป็นคำอ้างอิงทางคลินิก)

   `level` = { lv, th, en, bg, fg } — รูปแบบเดียวกับ TRIAGE_LEVELS
   (`@/data/opdScreeningCatalog`) และ OBSERVATION_ESI_LEVELS
   (`@/data/observationMock`) สีมาจาก token `--surface-triage-levelN` /
   `--text-triage-levelN` เหมือนกันทุกโมดูล */

const TriageLevelCard = ({
  level,
  selected = false,
  onClick,
  /** คำนำหน้าใน aria-label — 'ระดับ' (คัดกรอง) หรือ 'ESI' (สังเกตอาการ) */
  ariaPrefix = 'ระดับ',
  badgeLabel,
}) => (
  <SelectableCardButton
    selected={selected}
    onClick={onClick}
    ariaLabel={`${ariaPrefix} ${level.lv} ${level.en} ${level.th}`}
    minHeight={64}
    padX='var(--dim-space-300, 12px)'
  >
    <span className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      <span
        className='inline-flex items-center whitespace-nowrap shrink-0'
        style={{
          height: 'var(--dim-size-500, 20px)',
          paddingLeft: 'var(--dim-space-200, 8px)',
          paddingRight: 'var(--dim-space-200, 8px)',
          borderRadius: 'var(--dim-radius-full, 9999px)',
          backgroundColor: level.bg,
          color: level.fg,
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xxs, 11px)',
          fontWeight: 'var(--type-weight-bold, 700)',
          lineHeight: 1,
        }}
      >
        {badgeLabel || `Level ${level.lv}`}
      </span>
      <span className='flex flex-col items-start min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <span
          className='whitespace-nowrap'
          style={{
            color: 'var(--text-content-default, #363B3F)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            fontWeight: 'var(--type-weight-medium, 500)',
            lineHeight: 1.3,
          }}
        >
          {level.th}
        </span>
        <span
          className='whitespace-nowrap'
          style={{
            color: 'var(--text-content-tertiary, #858C92)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xxs, 11px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.2,
          }}
        >
          {level.en}
        </span>
      </span>
    </span>
  </SelectableCardButton>
);

export default TriageLevelCard;
