import React from 'react';
import SelectableCardButton from '@/components/button/SelectableCardButton';
import { MaterialSymbol } from '@/components/icons/Icon';
import { PAIN_SCALE_10, painToneStyle } from '@/data/opdScreeningCatalog';

/* ระดับความปวด 10 ระดับ — การ์ดเลือกได้ที่มีไอคอนหน้าคนนำหน้าตัวเลข
   ══════════════════════════════════════════════════════════════════
   ทรงเดียวกับปุ่มระดับความเจ็บปวดของจุดคัดกรอง (Figma 160:26321..26326)
   ต่างแค่จำนวนระดับ (มติผู้ใช้ 2 ก.ย. 69) — วงกลมไอคอน 36×36 ไล่โทนตาม
   ความรุนแรงทีละขั้น (เขียว → เหลือง → ส้ม → แดง) ไอคอนหน้าคนไม่ซ้ำกันสักระดับ
   แล้วตามด้วยตัวเลขระดับ

   ใช้ร่วมกันทั้งจุดคัดกรอง (`/opd/screening`) และงานเยี่ยมบ้าน เพื่อไม่ให้
   สองหน้าวาดปุ่มคนละทรงอีก · ค่าที่ส่งเข้า/ออกเป็น "ตัวเลข 1–10" */

const PainScaleCards = ({ value, onChange, disabled = false, ariaPrefix = 'ระดับความปวด' }) => (
  <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
    {PAIN_SCALE_10.map((p) => {
      const tone = painToneStyle(p);
      return (
        <SelectableCardButton
          key={p.score}
          selected={Number(value) === p.score}
          onClick={disabled ? undefined : () => onChange?.(p.score)}
          ariaLabel={`${ariaPrefix} ${p.score} — ${p.bandLabel}`}
          title={`${p.score} · ${p.bandLabel}`}
          padX='var(--dim-space-300, 12px)'
        >
          <span
            aria-hidden
            className='inline-flex items-center justify-center shrink-0'
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: tone.bg,
              color: tone.fg,
            }}
          >
            <MaterialSymbol name={p.icon} size={20} />
          </span>
          {p.label}
        </SelectableCardButton>
      );
    })}
  </div>
);

export default PainScaleCards;
