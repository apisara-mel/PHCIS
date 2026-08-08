import React, { useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import PHCIS_CHART from '@/data/phcisChartPalette';
import { formatImmDate } from '@/data/immunizationClinic';

/* GrowthPercentileChart — กราฟการเจริญเติบโตแบบมีแถบ percentile (P3 / P50 / P97)
   สำหรับกราฟ 4 แบบตามคู่มือ HCIS: ความยาว-น้ำหนักตามอายุ 0–36 เดือน,
   เส้นรอบศีรษะ percentile, น้ำหนักตามเกณฑ์ส่วนสูง, และน้ำหนัก-ส่วนสูง 2–19 ปี.

   ทำไมไม่ใช้ components/graph/Charts.jsx: LineChart ของ DS รับเฉพาะ
   `months[]` (แกน x เป็น label เว้นระยะเท่ากัน) กับ series ที่ยาวเท่ากันทุกชุด
   จึงวาด "แถบเกณฑ์ต่อเนื่อง + จุดของเด็กที่อยู่คนละตำแหน่งแกน x" ไม่ได้ —
   ค่าอายุจริงของเด็กต้องอยู่ตามสเกลจริง ไม่ใช่ระยะเท่ากัน มิฉะนั้นการอ่าน
   percentile จะผิด. คอมโพเนนต์นี้จึงอยู่ในโฟลเดอร์โมดูล และรายงานผ่าน
   manifest (newComponents) ให้ integrator เป็นผู้พิจารณายกขึ้น DS.

   ทุกค่าสี/ระยะ alias token; แกน/เส้นวาดด้วย <svg> (ไม่ใช่ไอคอน จึงไม่ขัดกฎ
   "ห้าม inline svg สำหรับ glyph ที่มีใน library"). */

const BAND_FILL = 'var(--surface-brandPrimary-quaternary, #F4FBF8)';
const BAND_LINE = 'var(--border-neutral-tertiary, #C6CACD)';
const MEDIAN_LINE = 'var(--border-brandPrimary-tertiary, #C5EDDA)';
const AXIS_COLOR = 'var(--border-neutral-quaternary, #EEF0F1)';
const POINT_COLOR = PHCIS_CHART.teal;

const PAD = { top: 16, right: 16, bottom: 32, left: 44 };

const niceTicks = (min, max, count = 5) => {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [min];
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
};

const round1 = (n) => Math.round(n * 10) / 10;

const EmptyState = ({ title, children }) => (
  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>
      {title}
    </span>
    <div
      className='flex flex-col items-center text-center w-full'
      style={{
        gap: 'var(--dim-space-200, 8px)',
        paddingTop: 'var(--dim-space-600, 24px)',
        paddingBottom: 'var(--dim-space-600, 24px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-300, 10px)',
        border: 'var(--dim-stroke-100, 1px) dashed var(--border-neutral-tertiary, #C6CACD)',
        color: 'var(--text-content-tertiary, #858C92)',
        fontSize: 'var(--type-size-sm)',
      }}
    >
      <Icon name='monitoring' size={24} />
      <span>{children}</span>
    </div>
  </div>
);

const GrowthPercentileChart = ({
  title,
  unit,
  axisLabel,
  reference = [],
  points = [],
  height = 220,
  latestEvaluation = null,
  emptyMessage = 'ยังไม่มีข้อมูลการเจริญเติบโตในช่วงนี้',
}) => {
  const [hoverIdx, setHoverIdx] = useState(null);

  const geom = useMemo(() => {
    if (reference.length === 0) return null;
    const width = 640;
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;

    const xs = [...reference.map((r) => r.x), ...points.map((p) => p.x)];
    const ys = [
      ...reference.map((r) => r.p3),
      ...reference.map((r) => r.p97),
      ...points.map((p) => p.y),
    ];
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMinRaw = Math.min(...ys);
    const yMaxRaw = Math.max(...ys);
    const yPad = (yMaxRaw - yMinRaw) * 0.08 || 1;
    const yMin = Math.max(0, yMinRaw - yPad);
    const yMax = yMaxRaw + yPad;

    const sx = (x) => PAD.left + ((x - xMin) / (xMax - xMin || 1)) * innerW;
    const sy = (y) => PAD.top + innerH - ((y - yMin) / (yMax - yMin || 1)) * innerH;

    const line = (key) => reference.map((r, i) => `${i === 0 ? 'M' : 'L'}${sx(r.x)},${sy(r[key])}`).join(' ');
    const bandPath = [
      ...reference.map((r, i) => `${i === 0 ? 'M' : 'L'}${sx(r.x)},${sy(r.p3)}`),
      ...[...reference].reverse().map((r) => `L${sx(r.x)},${sy(r.p97)}`),
      'Z',
    ].join(' ');

    return {
      width, innerW, innerH, xMin, xMax, yMin, yMax, sx, sy,
      p3: line('p3'), p50: line('p50'), p97: line('p97'), bandPath,
      xTicks: niceTicks(xMin, xMax, 5),
      yTicks: niceTicks(yMin, yMax, 4),
    };
  }, [reference, points, height]);

  if (!geom) return <EmptyState title={title}>ยังไม่มีเกณฑ์อ้างอิงสำหรับกราฟนี้</EmptyState>;
  if (points.length === 0) return <EmptyState title={title}>{emptyMessage}</EmptyState>;

  const patientPath = points.length > 1
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'}${geom.sx(p.x)},${geom.sy(p.y)}`).join(' ')
    : null;

  const hovered = hoverIdx != null ? points[hoverIdx] : null;

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      <div className='flex items-baseline w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>
          {title}
        </span>
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
          หน่วย {unit} · {points.length} ครั้ง
        </span>
        {latestEvaluation && (
          <ColorfulBadge style={latestEvaluation.style} size='small' hierarchy='secondary'>
            ล่าสุด {latestEvaluation.label} (P{latestEvaluation.percentile})
          </ColorfulBadge>
        )}
      </div>

      <div className='w-full' style={{ overflowX: 'auto' }}>
        <svg
          role='img'
          aria-label={`${title} — แถบเกณฑ์ P3 ถึง P97 พร้อมค่าของเด็ก ${points.length} จุด`}
          viewBox={`0 0 ${geom.width} ${height}`}
          style={{ width: '100%', minWidth: 420, height }}
        >
          {/* แถบเกณฑ์ P3–P97 */}
          <path d={geom.bandPath} fill={BAND_FILL} stroke='none' />
          <path d={geom.p3} fill='none' stroke={BAND_LINE} strokeWidth='1' strokeDasharray='4 3' />
          <path d={geom.p97} fill='none' stroke={BAND_LINE} strokeWidth='1' strokeDasharray='4 3' />
          <path d={geom.p50} fill='none' stroke={MEDIAN_LINE} strokeWidth='2' />

          {/* แกน */}
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + geom.innerH} stroke={AXIS_COLOR} strokeWidth='1' />
          <line x1={PAD.left} y1={PAD.top + geom.innerH} x2={PAD.left + geom.innerW} y2={PAD.top + geom.innerH} stroke={AXIS_COLOR} strokeWidth='1' />

          {geom.yTicks.map((t) => (
            <g key={`y-${t}`}>
              <line x1={PAD.left} y1={geom.sy(t)} x2={PAD.left + geom.innerW} y2={geom.sy(t)} stroke={AXIS_COLOR} strokeWidth='1' />
              <text
                x={PAD.left - 6} y={geom.sy(t) + 4} textAnchor='end'
                style={{ fontSize: 10, fill: 'var(--text-content-tertiary, #858C92)' }}
              >
                {round1(t)}
              </text>
            </g>
          ))}

          {geom.xTicks.map((t) => (
            <text
              key={`x-${t}`}
              x={geom.sx(t)} y={PAD.top + geom.innerH + 16} textAnchor='middle'
              style={{ fontSize: 10, fill: 'var(--text-content-tertiary, #858C92)' }}
            >
              {Math.round(t)}
            </text>
          ))}
          <text
            x={PAD.left + geom.innerW / 2} y={height - 4} textAnchor='middle'
            style={{ fontSize: 10, fill: 'var(--text-content-tertiary, #858C92)' }}
          >
            {axisLabel}
          </text>

          {/* เส้น/จุดของเด็ก — จุดเดียวไม่ลากเส้น */}
          {patientPath && <path d={patientPath} fill='none' stroke={POINT_COLOR} strokeWidth='2' />}
          {points.map((p, i) => (
            <circle
              key={`${p.date}-${p.x}`}
              cx={geom.sx(p.x)} cy={geom.sy(p.y)}
              r={hoverIdx === i ? 6 : 4}
              fill={POINT_COLOR}
              stroke='var(--surface-card-100, #FFFFFF)'
              strokeWidth='1.5'
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          ))}
        </svg>
      </div>

      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ width: 16, height: 2, background: MEDIAN_LINE, display: 'inline-block' }} />
          เส้นกลาง P50
        </span>
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ width: 16, height: 8, background: BAND_FILL, border: `1px dashed ${BAND_LINE}`, display: 'inline-block' }} />
          ช่วงปกติ P3–P97
        </span>
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 'var(--dim-radius-full, 9999px)', background: POINT_COLOR, display: 'inline-block' }} />
          ค่าของเด็ก
        </span>
        {points.length === 1 && <span>มีข้อมูลเพียง 1 ครั้ง — แสดงเป็นจุด ยังไม่ลากเส้นแนวโน้ม</span>}
      </div>

      {hovered && (
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary, #636B72)' }}>
          {formatImmDate(hovered.date)} · {round1(hovered.y)} {unit} ({axisLabel} {round1(hovered.x)})
        </span>
      )}
    </div>
  );
};

export default GrowthPercentileChart;
