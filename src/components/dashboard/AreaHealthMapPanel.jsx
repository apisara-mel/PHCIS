import React, { useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import PHCIS_CHART from '@/data/phcisChartPalette';

/* §1.20.10.1 — "แสดงผลในรูปแบบของแผนที่" แยกตามเขต/แขวง/สถานบริการ

   แผนที่เชิงตำแหน่ง (schematic) ที่ผูกกับตัวกรองเขต/แขวงของหน้า Dashboard ผู้บริหาร
   — ไม่เพิ่ม library แผนที่ภายนอก (กติกา CSP + design system) แต่ฉายพิกัด lat/lng
   ของศูนย์บริการลงบนกรอบสัดส่วนจริงของกรุงเทพฯ แล้วให้ขนาด/สีของหมุดสื่อความชุก
   ของโรคไม่ติดต่อเรื้อรังในพื้นที่นั้น กดหมุดเพื่อเลือกเขต (กราฟทุกตัวเปลี่ยนตาม)

   หน้า /dashboard ยังมี ServiceCenterMapCard (แผนที่ OSM เต็มรูปแบบ) สำหรับภาพรวม
   ทั้งกรุงเทพฯ — แผงนี้ต่างกันตรงที่ "ผูกกับตัวกรอง" ของหน้าผู้บริหาร */

const PAD = 0.08; /* เว้นขอบ 8% ไม่ให้หมุดชนกรอบ */

const tierColor = (prevalence) => {
  if (prevalence >= 6.5) return PHCIS_CHART.pink;
  if (prevalence >= 5.5) return PHCIS_CHART.yellow;
  if (prevalence >= 4.5) return PHCIS_CHART.indigo;
  return PHCIS_CHART.teal;
};

const tierLabel = (prevalence) => {
  if (prevalence >= 6.5) return 'ความชุกสูงมาก';
  if (prevalence >= 5.5) return 'ความชุกสูง';
  if (prevalence >= 4.5) return 'ความชุกปานกลาง';
  return 'ความชุกต่ำ';
};

const LEGEND = [
  { label: 'ความชุกต่ำ (< 4.5%)', color: PHCIS_CHART.teal },
  { label: 'ปานกลาง (4.5–5.4%)', color: PHCIS_CHART.indigo },
  { label: 'สูง (5.5–6.4%)', color: PHCIS_CHART.yellow },
  { label: 'สูงมาก (≥ 6.5%)', color: PHCIS_CHART.pink },
];

const AreaHealthMapPanel = ({ districts, selectedKey = 'all', onSelect }) => {
  const [hover, setHover] = useState(null);

  const projected = useMemo(() => {
    if (!districts?.length) return [];
    const lats = districts.map((d) => d.lat);
    const lngs = districts.map((d) => d.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const spanLat = maxLat - minLat || 1;
    const spanLng = maxLng - minLng || 1;
    const maxNcd = Math.max(...districts.map((d) => d.ncdTotal)) || 1;
    return districts.map((d) => ({
      ...d,
      /* ละติจูดมากขึ้น = เหนือขึ้น = ค่า top น้อยลง */
      leftPct: (PAD + ((d.lng - minLng) / spanLng) * (1 - PAD * 2)) * 100,
      topPct: (PAD + ((maxLat - d.lat) / spanLat) * (1 - PAD * 2)) * 100,
      /* หมุดใหญ่ตามจำนวนผู้ป่วย NCD (28–56 px) */
      dot: 28 + Math.round((d.ncdTotal / maxNcd) * 28),
    }));
  }, [districts]);

  const focus = hover || (selectedKey !== 'all' ? projected.find((p) => p.key === selectedKey) : null);

  if (!projected.length) {
    return (
      <div
        className='flex flex-col items-center justify-center w-full'
        style={{
          gap: 'var(--dim-space-200)',
          paddingTop: 'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-600)',
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
        }}
      >
        <Icon name='location_off' size={28} />
        ไม่พบพื้นที่ที่ตรงกับตัวกรอง
      </div>
    );
  }

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
      <div
        className='relative w-full'
        style={{
          aspectRatio: '4 / 3',
          minHeight: 'var(--dim-size-2500, 320px)',
          borderRadius: 'var(--dim-radius-400, 12px)',
          border: 'var(--dim-stroke-100) solid var(--border-card-default)',
          /* พื้นหลังเป็นตารางพิกัดจาง ๆ — gradient เป็นข้อยกเว้นเดียวที่ไม่ต้อง alias token */
          background:
            'linear-gradient(0deg, rgba(0,117,73,0.05) 1px, transparent 1px) 0 0 / 100% 12.5%,'
            + 'linear-gradient(90deg, rgba(0,117,73,0.05) 1px, transparent 1px) 0 0 / 12.5% 100%,'
            + 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
          overflow: 'hidden',
        }}
      >
        <span
          className='absolute'
          style={{
            top: 'var(--dim-space-300)',
            left: 'var(--dim-space-300)',
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
          }}
        >
          กรุงเทพมหานคร · แสดงตำแหน่งศูนย์บริการสาธารณสุขตามพิกัดจริง
        </span>

        {projected.map((d) => {
          const selected = selectedKey === d.key;
          const isFocus = focus?.key === d.key;
          const color = tierColor(d.prevalence);
          return (
            <button
              key={d.key}
              type='button'
              onClick={() => onSelect?.(selected ? 'all' : d.key)}
              onMouseEnter={() => setHover(d)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(d)}
              onBlur={() => setHover(null)}
              aria-label={`${d.district} · ผู้ป่วยโรคไม่ติดต่อเรื้อรัง ${d.ncdTotal.toLocaleString('th-TH')} ราย · ความชุก ${d.prevalence}%`}
              aria-pressed={selected}
              className='absolute inline-flex items-center justify-center'
              style={{
                left: `${d.leftPct}%`,
                top: `${d.topPct}%`,
                transform: 'translate(-50%, -50%)',
                width: d.dot,
                height: d.dot,
                borderRadius: 'var(--dim-radius-full, 9999px)',
                background: color,
                opacity: selectedKey === 'all' || selected ? 1 : 0.45,
                border: `var(--dim-stroke-${isFocus ? '400' : '200'}) solid var(--surface-card-100, #FFFFFF)`,
                boxShadow: isFocus ? 'var(--shadow-card)' : 'none',
                color: 'var(--text-content-on-content, #FFFFFF)',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-xs)',
                cursor: 'pointer',
                transition: 'opacity 160ms ease, box-shadow 160ms ease, transform 160ms ease',
                zIndex: isFocus ? 2 : 1,
              }}
            >
              {d.prevalence}%
            </button>
          );
        })}

        {focus ? (
          <div
            className='absolute flex flex-col'
            style={{
              right: 'var(--dim-space-300)',
              bottom: 'var(--dim-space-300)',
              gap: 'var(--dim-space-100)',
              background: 'var(--surface-card-100, #FFFFFF)',
              border: 'var(--dim-stroke-100) solid var(--border-card-default)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              boxShadow: 'var(--shadow-card)',
              paddingTop: 'var(--dim-space-200)',
              paddingBottom: 'var(--dim-space-200)',
              paddingLeft: 'var(--dim-space-300)',
              paddingRight: 'var(--dim-space-300)',
              maxWidth: 'var(--dim-size-2500, 320px)',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                color: 'var(--text-content-default)',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-sm)',
              }}
            >
              {focus.district}
            </span>
            <span
              style={{
                color: 'var(--text-content-secondary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
              }}
            >
              {focus.center} · ประชากร {focus.population.toLocaleString('th-TH')} คน
            </span>
            <span
              style={{
                color: 'var(--text-content-secondary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
              }}
            >
              เบาหวาน {focus.dm.toLocaleString('th-TH')} · ความดัน {focus.ht.toLocaleString('th-TH')} ราย
            </span>
            <span
              style={{
                color: tierColor(focus.prevalence),
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
              }}
            >
              {tierLabel(focus.prevalence)} ({focus.prevalence}%)
            </span>
          </div>
        ) : null}
      </div>

      <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
        {LEGEND.map((l) => (
          <span
            key={l.label}
            className='inline-flex items-center'
            style={{
              gap: 'var(--dim-space-150)',
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 'var(--dim-size-200, 10px)',
                height: 'var(--dim-size-200, 10px)',
                borderRadius: 'var(--dim-radius-full, 9999px)',
                background: l.color,
                display: 'inline-block',
              }}
            />
            {l.label}
          </span>
        ))}
        <span
          style={{
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
          }}
        >
          ขนาดหมุด = จำนวนผู้ป่วย NCD · กดหมุดเพื่อกรองทุกกราฟตามเขต
        </span>
      </div>
    </div>
  );
};

export default AreaHealthMapPanel;
