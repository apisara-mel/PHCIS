import React, { useMemo } from 'react';

/* TelemedRpmSparkline — เส้นแนวโน้ม 7 วันแบบย่อสำหรับกระดาน RPM.

   ทำไมไม่ใช้ VitalTrendChart: VitalTrendChart รองรับเฉพาะ parameter
   bp / pulse / spo2 / temp / rr และวาดกราฟเต็มขนาด (สูง ~300px พร้อมแกน
   + legend + tooltip) — กระดาน RPM ต้องการเส้นสูง 36–44 px ในตารางและ
   ต้องวาด DTX (mg/dL) ซึ่งไม่มีใน SINGLE_SERIES_CONFIG. หน้าที่ต่างกัน
   คนละระดับ (micro-viz ในเซลล์ตาราง vs กราฟวิเคราะห์เต็มหน้า) จึงไม่ใช่
   การสร้าง component ซ้ำ — ดูรายละเอียดใน manifest.newComponents.

   ค่าที่เกินเกณฑ์จะถูกเน้นเป็นจุดสีแดงบนเส้น เพื่อให้เห็น "ติดกันกี่ครั้ง"
   ตามเกณฑ์คู่มือ (BP > 160/90 ×2 · DTX < 80 ×2 · DTX > 180 ×3). */

const H = 40;
const PAD = 4;

const TelemedRpmSparkline = ({
  points = [],
  width = 132,
  height = H,
  stroke = 'var(--text-colorfulbadge-teal, #196C65)',
  isBreach,
  ariaLabel = 'แนวโน้มค่า 7 วันล่าสุด',
}) => {
  const geometry = useMemo(() => {
    const values = points.map((p) => Number(p.value)).filter((v) => Number.isFinite(v));
    if (values.length === 0) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const innerW = width - PAD * 2;
    const innerH = height - PAD * 2;
    const step = points.length > 1 ? innerW / (points.length - 1) : 0;
    const coords = points.map((p, i) => ({
      x: PAD + i * step,
      y: PAD + innerH - ((Number(p.value) - min) / span) * innerH,
      point: p,
    }));
    return { coords, min, max };
  }, [points, width, height]);

  if (!geometry) {
    return (
      <span
        style={{
          fontSize: 'var(--type-size-xs, 12px)',
          color: 'var(--text-content-tertiary, #858C92)',
          fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
        }}
      >
        ไม่มีค่าย้อนหลัง
      </span>
    );
  }

  const { coords } = geometry;
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role='img'
      aria-label={ariaLabel}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <path
        d={path}
        fill='none'
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      {coords.map((c, i) => {
        const breach = isBreach ? isBreach(c.point) : false;
        return (
          <circle
            key={`${c.point.at || i}-${i}`}
            cx={c.x}
            cy={c.y}
            r={breach ? 3.5 : 2}
            fill={breach ? 'var(--text-alert-error, #B91C1C)' : stroke}
          >
            <title>{`${c.point.label || ''} ${c.point.value}`}</title>
          </circle>
        );
      })}
    </svg>
  );
};

export default TelemedRpmSparkline;
