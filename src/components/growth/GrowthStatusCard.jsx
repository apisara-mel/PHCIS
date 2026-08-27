import React, { useState } from 'react';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { GrowthChart } from '@/pages/treat/panels/VaccineGrowthPanel';
import { growthBandsFor, mophZoneFor } from '@/data/treatmentVaccines';

/* MIH GrowthStatusCard — ภาวะโภชนาการของผู้รับบริการอายุต่ำกว่า 18 ปี
   ToR ผนวก ก ข้อ ๑.๒.๒.๕: "แสดงภาวะโภชนาการของผู้รับบริการโดยอัตโนมัติ
   โดยผู้ที่อายุ < ๑๘ ปี ให้เทียบจากกราฟการเจริญเติบโต ส่วนผู้ที่อายุตั้งแต่
   ๑๘ ปีขึ้นไป ให้ดูจากค่า BMI"

   คำนวณเองจากน้ำหนัก/ส่วนสูงที่พยาบาลเพิ่งกรอก เทียบกับแถบ percentile ของ
   กรมอนามัย (`growthBandsFor` แยกชาย/หญิง) ผ่าน `mophZoneFor` ซึ่งเป็นตัว
   เดียวกับที่คลินิกวัคซีนใช้ — เกณฑ์จึงตรงกันทั้งระบบ ไม่ได้ตัดสินซ้ำที่นี่

   ปุ่ม "ดูกราฟการเจริญเติบโต" เปิดกราฟสองใบ (น้ำหนักตามเกณฑ์อายุ ·
   ส่วนสูงตามเกณฑ์อายุ) ของเพศนั้น พร้อมจุดของผู้รับบริการรายนี้ */

const METRICS = [
  { key: 'weight', label: 'น้ำหนักตามเกณฑ์อายุ', unit: 'กก.' },
  { key: 'height', label: 'ส่วนสูงตามเกณฑ์อายุ', unit: 'ซม.' },
];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const GrowthStatusCard = ({ sex, ageYears, weight, height, measuredLabel = 'การวัดครั้งนี้' }) => {
  const [chartOpen, setChartOpen] = useState(false);

  const w = num(weight);
  const h = num(height);
  const age = Number.isFinite(Number(ageYears)) ? Number(ageYears) : null;
  const values = { weight: w, height: h };

  const zones = METRICS.map((m) => ({
    ...m,
    value: values[m.key],
    zone: age != null && values[m.key] != null
      ? mophZoneFor(m.key, growthBandsFor(sex, m.key), age, values[m.key])
      : null,
  }));

  /* ยังไม่ครบพอจะตัดสิน — บอกตรง ๆ ว่าขาดอะไร ดีกว่าโชว์แถบสีที่เดาเอา */
  const missing = [
    age == null ? 'อายุ' : null,
    w == null ? 'น้ำหนัก' : null,
    h == null ? 'ส่วนสูง' : null,
  ].filter(Boolean);

  return (
    <div className='bg-surface-card border border-ink-line rounded-card p-4 flex flex-col gap-2 w-full'>
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
        <span className='text-sm text-ink'>ภาวะโภชนาการ</span>
        <span
          className='inline-flex items-center whitespace-nowrap'
          style={{
            height: 'var(--dim-size-500, 20px)',
            paddingLeft: 'var(--dim-space-200, 8px)',
            paddingRight: 'var(--dim-space-200, 8px)',
            borderRadius: 'var(--dim-radius-full, 9999px)',
            background: 'var(--surface-brandPrimary-quaternary)',
            color: 'var(--text-brandPrimary-default)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xxs, 11px)',
            fontWeight: 'var(--type-weight-bold, 700)',
          }}
        >
          กราฟการเจริญเติบโต · {sex || '—'}
        </span>
      </div>

      {missing.length > 0 ? (
        <span className='text-base font-bold' style={{ color: 'var(--text-content-tertiary)' }}>
          ยังประเมินไม่ได้ — ขาด{missing.join(' / ')}
        </span>
      ) : (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
          {zones.map((z) => (
            <div key={z.key} className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
              {z.zone
                ? <ColorfulBadge style={z.zone.tone} size='small' width='hug'>{z.zone.label}</ColorfulBadge>
                : <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>ไม่มีเกณฑ์ที่อายุนี้</span>}
              <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>
                {z.value} {z.unit}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className='w-full'>
        <BrandSubdueButton
          type='button'
          variant='outline'
          size='sm'
          leadingIcon='show_chart'
          onClick={() => setChartOpen(true)}
        >
          ดูกราฟการเจริญเติบโต
        </BrandSubdueButton>
      </div>

      <Popup
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        title='กราฟแสดงเกณฑ์อ้างอิงการเจริญเติบโต'
        subtitle={`เพศ${sex || '—'}${age != null ? ` · อายุ ${age} ปี` : ''} · เกณฑ์กรมอนามัย`}
        size='extraLarge'
        primaryAction={{ label: 'ปิด', onClick: () => setChartOpen(false) }}
      >
        {/* สองใบวางซ้าย-ขวาบนจอกว้าง แล้วค่อยตกลงมาเป็นแถวเดียวเมื่อจอแคบ
            (มติผู้ใช้ 27 ส.ค. 69) — กราฟทั้งคู่อ่านคู่กันเสมอ ไม่ควรต้องเลื่อน
            หน้าจอเพื่อเทียบน้ำหนักกับส่วนสูง */}
        <div
          className='grid w-full grid-cols-1 lg:grid-cols-2'
          style={{ gap: 'var(--dim-space-600, 24px)' }}
        >
          {METRICS.map((m) => (
            <section key={m.key} className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
              <h3 className='text-sm font-bold text-ink'>{m.label}</h3>
              <GrowthChart
                bands={growthBandsFor(sex, m.key)}
                points={age != null && values[m.key] != null
                  ? [{ ageYears: age, value: values[m.key], date: measuredLabel }]
                  : []}
                metric={m.key}
                unit={m.unit}
                xMode='years'
              />
            </section>
          ))}
        </div>
      </Popup>
    </div>
  );
};

export default GrowthStatusCard;
