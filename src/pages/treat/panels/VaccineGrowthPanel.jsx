import React, { useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import { FilterDropdown } from '@/components/forms/FilterTag';
import { resolveMilestoneLabel } from '@/data/immunizationVaccines';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import AlertDialog from '@/components/popup/AlertDialog';
import Pagination from '@/components/pagination/Pagination';
import {
  PanelCard, PanelEmptyState, CancelledMark, strikeIf, InfoPair,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, AccessDeniedPanel,
  ReasonDialog, PanelAlert, CountLabel, paginate,
} from '@/pages/treat/panels/panelHooks';
import {
  EPI_SCHEDULE, VACCINE_OPTIONS, VACCINE_REACTION_SUGGESTIONS, VACCINE_CANCEL_SUGGESTIONS,
  subscribeVaccines, vaccinesForPatient, findDuplicateVaccine,
  addVaccine, updateVaccine, cancelVaccine,
  GROWTH_METRICS, GROWTH_PERCENTILE_KEYS, GROWTH_MOPH_ZONES, MOPH_CHART_AGE_MAX,
  GROWTH_BAND_PROVENANCE,
  growthDisplayForPatient, growthBandsFor, computeBmi, addGrowthMeasurement, mophZoneFor,
} from '@/data/treatmentVaccines';

/* PHCIS | EMR §1.4.3.10 / §1.4.3.11 — ทะเบียนวัคซีนรายคน + กราฟการเจริญเติบโต.

   ข้อจำกัดที่ต้องรายงานตามจริง (partial ไม่ใช่ done): แถบ percentile
   p3–p97 ใน GROWTH_BANDS เป็นชุดค่าประมาณสำหรับ prototype ยังไม่ใช่
   dataset ทางการของสมาคมต่อมไร้ท่อเด็กและวัยรุ่นไทย — ต้องเปลี่ยนเป็น
   ชุดข้อมูลจริงก่อนใช้งานทางคลินิก. */

const PER_PAGE = 10;

/* ── กราฟการเจริญเติบโต (SVG — แถบสีตามเกณฑ์ กรมอนามัย / Facts for Life) ── */

const CHART_W = 720;
const CHART_H = 380;
const PAD_L = 52;
const PAD_B = 40;
const PAD_T = 16;
const PAD_R = 16;

const ZONE_FILL = {
  red: 'var(--surface-colorfulbadge-red, #FEE2E2)',
  orange: 'var(--surface-colorfulbadge-orange, #FFEDD5)',
  green: 'var(--surface-colorfulbadge-green, #E2F3EB)',
  yellow: 'var(--surface-colorfulbadge-yellow, #FEF9C3)',
};

const ZONE_STROKE = {
  red: 'var(--surface-colorfulbadge-red-bold, #EF4444)',
  orange: 'var(--surface-colorfulbadge-orange-bold, #F97316)',
  green: 'var(--surface-colorfulbadge-green-bold, #54CF97)',
  yellow: 'var(--surface-colorfulbadge-yellow-bold, #EAB308)',
};

const GrowthZoneLegend = ({ metric }) => {
  const zones = GROWTH_MOPH_ZONES[metric] || GROWTH_MOPH_ZONES.weight;
  return (
    <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      {zones.map((z) => (
        <div
          key={z.key}
          className='flex items-center min-w-0'
          style={{ gap: 'var(--dim-space-150, 6px)' }}
        >
          <span
            aria-hidden
            style={{
              width: 'var(--dim-size-300, 12px)',
              height: 'var(--dim-size-300, 12px)',
              borderRadius: 'var(--dim-radius-100, 4px)',
              background: ZONE_FILL[z.tone] || ZONE_FILL.green,
              border: `var(--dim-stroke-100, 1px) solid ${ZONE_STROKE[z.tone] || ZONE_STROKE.green}`,
              flexShrink: 0,
            }}
          />
          <span style={PANEL_LABEL_STYLE}>{z.label}</span>
        </div>
      ))}
    </div>
  );
};

/* export ให้ `GrowthStatusCard` (ขั้นสัญญาณชีพของหน้าคัดกรอง) ใช้กราฟใบเดียวกับ
   คลินิกวัคซีน — เกณฑ์กรมอนามัยจึงมาจากที่เดียวทั้งระบบ */
export const GrowthChart = ({ bands, points, unit, metric, xMode = 'months' }) => {
  /* ชี้เมาส์บนกราฟแล้วอ่านค่าได้ (มติผู้ใช้ 28 ส.ค. 69) — เดิมกราฟบอกได้แค่ว่า
     จุดของผู้รับบริการตกอยู่แถบสีไหน แต่อ่านตัวเลขเกณฑ์ที่อายุนั้นไม่ได้เลย
     เก็บเป็น "ดัชนีของ band" ไม่ใช่พิกัดพิกเซล เพื่อให้เส้นนำทางสแนปเข้าจุดข้อมูลจริง */
  const [hoverIdx, setHoverIdx] = useState(null);
  const hasBands = Array.isArray(bands) && bands.length > 0;
  const measured = points.filter((p) => Number.isFinite(p.value));

  if (!hasBands && measured.length === 0) {
    return (
      <PanelEmptyState
        icon='show_chart'
        title='ยังไม่มีค่าที่วัดสำหรับกราฟนี้'
        subtitle='บันทึกน้ำหนัก/ส่วนสูงของวันนี้ แล้วค่าจะมาแสดงบนกราฟทันที'
      />
    );
  }

  const xKey = xMode === 'months' ? 'ageMonths' : 'age';
  const pointX = (p) => (xMode === 'months' ? p.ageYears * 12 : p.ageYears);

  const xs = hasBands
    ? bands.map((b) => b[xKey] ?? b.ageMonths ?? b.age * 12)
    : measured.map(pointX);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  const allVals = hasBands
    ? bands.flatMap((b) => GROWTH_PERCENTILE_KEYS.map((k) => b[k]))
    : [];
  const rawMin = Math.min(...allVals, ...measured.map((p) => p.value));
  const rawMax = Math.max(...allVals, ...measured.map((p) => p.value));
  const padVal = hasBands ? 0 : ((rawMax - rawMin) || 1) * 0.15;
  const minVal = rawMin - padVal;
  const maxVal = rawMax + padVal;
  const span = maxVal - minVal || 1;

  const x = (xv) => PAD_L + ((xv - minX) / (maxX - minX || 1)) * (CHART_W - PAD_L - PAD_R);
  const y = (v) => PAD_T + (1 - (v - minVal) / span) * (CHART_H - PAD_T - PAD_B);

  const bandX = (b) => b[xKey] ?? b.ageMonths ?? b.age * 12;

  const valAt = (b, key) => {
    if (!key) return null;
    return b[key];
  };

  const areaBetweenKeys = (loKey, hiKey, fill) => {
    const up = bands.map((b) => {
      const hi = hiKey ? valAt(b, hiKey) : maxVal;
      return `${x(bandX(b))},${y(hi ?? maxVal)}`;
    }).join(' ');
    const down = [...bands].reverse().map((b) => {
      const lo = loKey ? valAt(b, loKey) : minVal;
      return `${x(bandX(b))},${y(lo ?? minVal)}`;
    }).join(' ');
    return <polygon key={`${loKey}-${hiKey}`} points={`${up} ${down}`} fill={fill} opacity='0.85' />;
  };

  const zones = GROWTH_MOPH_ZONES[metric] || GROWTH_MOPH_ZONES.weight;

  const ageTicks = xMode === 'months'
    ? [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60].filter((m) => m >= minX && m <= maxX)
    : [...new Set(bands.map((b) => b.age))];

  const segments = [];
  let current = [];
  points.forEach((p) => {
    if (Number.isFinite(p.value)) current.push(p);
    else if (current.length) { segments.push(current); current = []; }
  });
  if (current.length) segments.push(current);

  const yTicks = 6;
  const crossMark = (cx, cy, r = 5) => (
    <g key={`x-${cx}-${cy}`}>
      <line x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} stroke='var(--border-dangerButton-default, #DC2626)' strokeWidth='2' />
      <line x1={cx + r} y1={cy - r} x2={cx - r} y2={cy + r} stroke='var(--border-dangerButton-default, #DC2626)' strokeWidth='2' />
    </g>
  );

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
        <svg
          width={CHART_W}
          height={CHART_H}
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          role='img'
          aria-label='กราฟการเจริญเติบโตเทียบเกณฑ์กรมอนามัย'
          onMouseMove={hasBands ? (e) => {
            const box = e.currentTarget.getBoundingClientRect();
            /* แปลงพิกัดจอ → พิกัด viewBox ก่อน เพราะ svg ถูกย่อ/ขยายตามคอนเทนเนอร์ */
            const svgX = ((e.clientX - box.left) / box.width) * CHART_W;
            let best = 0;
            let bestD = Infinity;
            bands.forEach((b, i) => {
              const d = Math.abs(x(bandX(b)) - svgX);
              if (d < bestD) { bestD = d; best = i; }
            });
            setHoverIdx(best);
          } : undefined}
          onMouseLeave={hasBands ? () => setHoverIdx(null) : undefined}
          style={{
            minWidth: CHART_W,
            display: 'block',
            /* ไม่มีกรอบรอบกราฟ (มติผู้ใช้ 29 ส.ค. 69) — กราฟอยู่ใน PanelCard
               ที่มีขอบของตัวเองแล้ว กรอบอีกชั้นเป็นการ์ดซ้อนการ์ด */
            background: 'var(--surface-neutral-primary, #FFFFFF)',
          }}
        >
          {hasBands ? zones.map((z) => areaBetweenKeys(
            z.lo,
            z.hi,
            ZONE_FILL[z.tone] || ZONE_FILL.green,
          )) : null}

          <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={CHART_H - PAD_B} stroke='var(--border-neutral-secondary, #C8CDD1)' strokeWidth='1.2' />
          <line x1={PAD_L} y1={CHART_H - PAD_B} x2={CHART_W - PAD_R} y2={CHART_H - PAD_B} stroke='var(--border-neutral-secondary, #C8CDD1)' strokeWidth='1.2' />

          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const v = minVal + (span * i) / yTicks;
            return (
              <g key={i}>
                <line
                  x1={PAD_L} y1={y(v)} x2={CHART_W - PAD_R} y2={y(v)}
                  stroke='var(--border-neutral-quaternary, #F4F5F5)' strokeWidth='1'
                  strokeDasharray={i === 0 ? '' : '4 4'}
                />
                <text
                  x={PAD_L - 8} y={y(v) + 4} textAnchor='end'
                  fill='var(--text-content-secondary, #5C656D)'
                  style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 10px)' }}
                >
                  {Math.round(v * 10) / 10}
                </text>
              </g>
            );
          })}

          {ageTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={x(tick)} y1={PAD_T} x2={x(tick)} y2={CHART_H - PAD_B}
                stroke='var(--border-neutral-quaternary, #F4F5F5)' strokeWidth='1'
              />
              <text
                x={x(tick)} y={CHART_H - PAD_B + 16} textAnchor='middle'
                fill='var(--text-content-secondary, #5C656D)'
                style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 10px)' }}
              >
                {xMode === 'months' ? tick : tick}
              </text>
            </g>
          ))}

          {hasBands ? ['p3', 'p10', 'p50', 'p90', 'p97'].map((k) => (
            <polyline
              key={k}
              points={bands.map((b) => `${x(bandX(b))},${y(b[k])}`).join(' ')}
              fill='none'
              stroke={k === 'p50' ? 'var(--border-brandPrimary-default, #007549)' : 'var(--border-neutral-tertiary, #E2E4E6)'}
              strokeWidth={k === 'p50' ? 1.8 : 1}
              strokeDasharray={k === 'p50' ? '' : '4 3'}
              opacity={k === 'p50' ? 1 : 0.7}
            />
          )) : null}

          {segments.filter((s) => s.length > 1).map((seg, i) => (
            <polyline
              key={`seg-${i}`}
              points={seg.map((p) => `${x(pointX(p))},${y(p.value)}`).join(' ')}
              fill='none'
              stroke='var(--border-dangerButton-default, #DC2626)'
              strokeWidth='2.2'
            />
          ))}
          {measured.map((p, i) => crossMark(x(pointX(p)), y(p.value)))}

          {/* เส้นนำทาง + กล่องอ่านค่าเมื่อชี้เมาส์ — สแนปเข้าจุดข้อมูลจริงของเกณฑ์ */}
          {hasBands && hoverIdx != null && bands[hoverIdx] ? (() => {
            const b = bands[hoverIdx];
            const hx = x(bandX(b));
            const ageLabel = xMode === 'months'
              ? `อายุ ${Math.round(bandX(b))} เดือน`
              : `อายุ ${Math.round(bandX(b))} ปี`;
            /* ค่าที่ผู้รับบริการวัดได้ ณ อายุใกล้เคียงที่สุด (ถ้ามี) */
            const near = measured.reduce((acc, pt) => {
              const d = Math.abs(x(pointX(pt)) - hx);
              return (!acc || d < acc.d) ? { pt, d } : acc;
            }, null);
            const rows = [
              ['สูงกว่าเกณฑ์ (P97)', b.p97],
              ['เกณฑ์กลาง (P50)', b.p50],
              ['ต่ำกว่าเกณฑ์ (P3)', b.p3],
            ].filter(([, v]) => Number.isFinite(v));
            if (near && near.d <= 12) rows.push(['ค่าที่วัดได้', near.pt.value]);
            const boxW = 150;
            const boxH = 22 + rows.length * 15;
            /* กล่องพลิกไปฝั่งซ้ายเมื่อชนขอบขวา จะได้ไม่ล้นออกนอกกราฟ */
            const bx = hx + 10 + boxW > CHART_W - PAD_R ? hx - 10 - boxW : hx + 10;
            return (
              <g pointerEvents='none'>
                <line
                  x1={hx} y1={PAD_T} x2={hx} y2={CHART_H - PAD_B}
                  stroke='var(--border-neutral-secondary, #C8CDD1)' strokeWidth='1' strokeDasharray='3 3'
                />
                {rows.filter(([label]) => label !== 'ค่าที่วัดได้').map(([label, v]) => (
                  <circle key={label} cx={hx} cy={y(v)} r='3' fill='var(--border-brandPrimary-default, #007549)' />
                ))}
                <rect
                  x={bx} y={PAD_T} width={boxW} height={boxH} rx='6'
                  fill='var(--surface-neutral-primary, #FFFFFF)'
                  stroke='var(--border-neutral-tertiary, #E2E4E6)'
                />
                <text
                  x={bx + 8} y={PAD_T + 15}
                  fill='var(--text-content-default, #363B3F)'
                  style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 10px)', fontWeight: 'var(--type-weight-medium, 500)' }}
                >
                  {ageLabel}
                </text>
                {rows.map(([label, v], i) => (
                  <text
                    key={label}
                    x={bx + 8} y={PAD_T + 30 + i * 15}
                    fill='var(--text-content-secondary, #5C656D)'
                    style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 10px)' }}
                  >
                    {`${label} ${Math.round(v * 10) / 10} ${unit}`}
                  </text>
                ))}
              </g>
            );
          })() : null}

          <text
            x={PAD_L} y={PAD_T - 2} textAnchor='start'
            fill='var(--text-content-secondary, #5C656D)'
            style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 11px)', fontWeight: 'var(--type-weight-medium, 500)' }}
          >
            {unit}
          </text>
          <text
            x={CHART_W - PAD_R} y={CHART_H - 6} textAnchor='end'
            fill='var(--text-content-secondary, #5C656D)'
            style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 11px)' }}
          >
            {xMode === 'months' ? 'อายุ (เดือน)' : 'อายุ (ปี)'}
          </text>
        </svg>
      </div>
      {hasBands ? <GrowthZoneLegend metric={metric} /> : null}
    </div>
  );
};

/* ── panel หลัก ─────────────────────────────────────────────── */

const blankVaccine = () => ({
  epiKey: '', doseNo: 1, injectedOn: '', lot: '', expiry: '', site: '', reaction: '',
});

const VaccineGrowthPanel = ({ form, patient, section = 'all' }) => {
  const access = useTreatmentAccess();
  const hn = patient?.hn || '';
  const gender = patient?.gender || '';
  const ageYears = Number(patient?.age);

  const [vaccines] = useTreatmentStore(
    subscribeVaccines,
    () => vaccinesForPatient(hn),
    [hn],
  );

  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState(blankVaccine);
  const [editTarget, setEditTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [dupWarn, setDupWarn] = useState(null);
  const [seqWarn, setSeqWarn] = useState(null);
  const [formError, setFormError] = useState('');
  const [metric, setMetric] = useState('weight');
  /* GROWTH_MEASUREMENTS ไม่มี pub/sub — bump tick เพื่อให้อ่านค่าใหม่หลังบันทึก */
  const [growthTick, setGrowthTick] = useState(0);
  const [growthSaved, setGrowthSaved] = useState('');

  const active = vaccines.filter((v) => !v.cancelledAt);
  const { pageCount, page: safePage, slice } = paginate(vaccines, page, PER_PAGE);

  /* สถานะ EPI ต่อรายการ — ครบ / ค้าง / ถึงกำหนด */
  const epiStatus = useMemo(() => EPI_SCHEDULE.map((s) => {
    const done = active.filter((v) => v.epiKey === s.key);
    const dueAgeYears = s.dueMonths == null ? null : s.dueMonths / 12;
    const overdue = dueAgeYears != null && Number.isFinite(ageYears) && ageYears > dueAgeYears && done.length < s.dose;
    return {
      ...s,
      doneCount: done.length,
      status: done.length >= s.dose ? 'complete' : overdue ? 'overdue' : 'due',
      lastDate: done[0]?.injectedOn || '',
    };
  }), [active, ageYears]);

  /* จัดกลุ่ม EPI ตามช่วงอายุที่ถึงกำหนด — ป้ายช่วงอายุใช้ EPI_AGE_MILESTONES
     ชุดเดียวกับ matrix ของคลินิกวัคซีน จะได้พูดภาษาเดียวกันทั้งระบบ
     เข็มที่ไม่มี dueMonths (เช่น วัคซีนตามฤดูกาล / กระตุ้นผู้ใหญ่) ไปอยู่กลุ่ม
     ท้ายสุด "ตามความเสี่ยง / ผู้ใหญ่" ไม่ทิ้งหาย */
  const epiByAge = useMemo(() => {
    const groups = new Map();
    epiStatus.forEach((s) => {
      const key = s.dueMonths == null ? 'adult' : s.dueMonths;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(s);
    });
    return [...groups.entries()]
      .sort(([a], [b]) => (a === 'adult' ? 1 : b === 'adult' ? -1 : a - b))
      .map(([months, items]) => ({
        months,
        label: months === 'adult' ? 'ตามความเสี่ยง / ผู้ใหญ่' : resolveMilestoneLabel(months),
        items,
        /* หนึ่งรายการใน EPI_SCHEDULE = หนึ่งเข็มที่ถึงกำหนดในช่วงอายุนี้ — ตัวเลข
           `dose` บนการ์ดเป็นลำดับสะสม (เข็มที่ 3 = 3) ใช้รวมไม่ได้ ไม่งั้นแถบ
           "4 เดือน" ที่มีเข็มเดียวจะขึ้น 0/2 */
        total: items.length,
        done: items.filter((i) => i.status === 'complete').length,
        overdue: items.filter((i) => i.status === 'overdue').length,
      }));
  }, [epiStatus]);

  const growthCtx = useMemo(() => growthDisplayForPatient(hn, ageYears), [hn, ageYears]);
  const isDemo = growthCtx.mode === 'demo';
  const chartGender = isDemo ? (growthCtx.gender || gender) : gender;

  const measurements = useMemo(
    () => growthCtx.measurements,
    [growthCtx.measurements, growthTick], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const metricMeta = [...GROWTH_METRICS, { key: 'bmi', label: 'ดัชนีมวลกาย (BMI)', unit: 'kg/m²' }]
    .find((m) => m.key === metric);
  const metricOutOfAge = !isDemo && metricMeta?.maxAge != null
    && Number.isFinite(ageYears) && ageYears > metricMeta.maxAge;
  const showGrowthChart = isDemo || !metricOutOfAge;

  /* BMI ไม่มีชุด BMI-for-age ใน GROWTH_BANDS — ห้ามยืมแถบน้ำหนักตามอายุมาใช้ */
  const bmiBandsMissing = metric === 'bmi';
  const useMophMonthly = !bmiBandsMissing && metric !== 'bmi'
    && (GROWTH_METRICS.find((m) => m.key === metric)?.mophAgeMax ?? MOPH_CHART_AGE_MAX) === MOPH_CHART_AGE_MAX;
  const bands = bmiBandsMissing
    ? []
    : growthBandsFor(chartGender, metric, { monthly: useMophMonthly && showGrowthChart });

  const growthPoints = useMemo(() => measurements.map((m) => {
    if (metric === 'bmi') {
      const bmi = computeBmi({ weight: m.weight, height: m.height });
      return { ...m, value: bmi.value, missing: bmi.missing };
    }
    return { ...m, value: m[metric] };
  }), [measurements, metric]);

  const latest = [...growthPoints].reverse().find((p) => Number.isFinite(p.value));
  const latestBand = (latest && bands.length && metric !== 'bmi')
    ? mophZoneFor(metric, bands, latest.ageYears, latest.value)
    : null;

  /* ค่าที่วัดวันนี้จากขั้นตอนคัดกรอง */
  const todayWeight = Number(form?.vitals?.weight);
  const todayHeight = Number(form?.vitals?.height);
  const hasTodayValue = Number.isFinite(todayWeight) || Number.isFinite(todayHeight);
  const canAddMeasurement = access.canEdit && Number.isFinite(ageYears) && hasTodayValue && !!hn;

  const addTodayMeasurement = () => {
    const saved = addGrowthMeasurement(hn, {
      ageYears, weight: todayWeight, height: todayHeight,
    });
    if (!saved) return;
    setGrowthTick((t) => t + 1);
    setGrowthSaved(`บันทึกค่าของ ${saved.date} ลงกราฟแล้ว — ${[
      saved.weight != null ? `น้ำหนัก ${saved.weight} กก.` : '',
      saved.height != null ? `ส่วนสูง ${saved.height} ซม.` : '',
    ].filter(Boolean).join(' · ')}`);
  };

  const validateAndSave = (force = false) => {
    setFormError('');
    if (!draft.epiKey) { setFormError('ต้องเลือกชนิดวัคซีน'); return; }
    if (!draft.injectedOn.trim()) { setFormError('ต้องระบุวันที่ฉีด'); return; }

    /* วันที่ฉีดล่วงหน้าเกินวันนี้ */
    const m = draft.injectedOn.match(/(\d{1,2})\s+(\S+)\s+(\d{4})/);
    if (m) {
      const TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
      const mi = TH.indexOf(m[2]);
      if (mi >= 0) {
        const d = new Date(Number(m[3]) - 543, mi, Number(m[1]));
        if (d.getTime() > Date.now()) {
          setFormError(`วันที่ฉีด (${draft.injectedOn}) เป็นวันในอนาคต — บันทึกได้เฉพาะวันที่ฉีดจริงเท่านั้น`);
          return;
        }
      }
    }

    if (!force) {
      const dup = findDuplicateVaccine(hn, draft);
      if (dup) { setDupWarn(dup); return; }

      /* เข็มข้ามลำดับ — เตือนแต่ยอมให้บันทึกพร้อมเหตุผล */
      const prevDoses = active.filter((v) => v.epiKey === draft.epiKey).length;
      if (Number(draft.doseNo) > prevDoses + 1) {
        setSeqWarn({ expected: prevDoses + 1, got: Number(draft.doseNo) });
        return;
      }
    }

    if (editTarget) updateVaccine(editTarget.id, draft);
    else addVaccine({ hn, ...draft });

    setDraft(blankVaccine()); setAddOpen(false); setEditTarget(null);
    setDupWarn(null); setSeqWarn(null);
  };

  const columns = [
    {
      key: 'vaccine', header: 'วัคซีน', flex: 1,
      render: (row) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ ...PANEL_VALUE_STYLE, ...strikeIf(!!row.cancelledAt) }}>{row.vaccine}</span>
          <span style={PANEL_LABEL_STYLE}>เข็มที่ {row.doseNo} · {row.site || 'ไม่ระบุตำแหน่งฉีด'}</span>
          {row.cancelledAt ? <CancelledMark at={row.cancelledAt} reason={row.cancelReason} /> : null}
        </div>
      ),
    },
    { key: 'injectedOn', header: 'วันที่ฉีด' },
    {
      key: 'lot', header: 'Lot / วันหมดอายุ',
      render: (row) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={PANEL_VALUE_STYLE}>{row.lot || '—'}</span>
          <span style={PANEL_LABEL_STYLE}>หมดอายุ {row.expiry || '—'}</span>
        </div>
      ),
    },
    { key: 'injectedBy', header: 'ผู้ฉีด' },
    {
      key: 'reaction', header: 'ปฏิกิริยาหลังฉีด',
      render: (row) => <span style={PANEL_LABEL_STYLE}>{row.reaction || 'ไม่ได้บันทึก'}</span>,
    },
    {
      key: 'actions', header: '',
      render: (row) => (row.cancelledAt ? <span style={PANEL_LABEL_STYLE}>ยกเลิกแล้ว</span> : (
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <GuardedAction allowed={access.canEdit}>
            <NeutralSubdueButton
              variant='outline' size='sm' leadingIcon='edit'
              onClick={() => { setEditTarget(row); setDraft({ epiKey: row.epiKey, doseNo: row.doseNo, injectedOn: row.injectedOn, lot: row.lot, expiry: row.expiry, site: row.site, reaction: row.reaction }); setAddOpen(true); }}
            >
              แก้ไข
            </NeutralSubdueButton>
          </GuardedAction>
          <GuardedAction allowed={access.canEdit}>
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='block' onClick={() => setCancelTarget(row)}>
              ยกเลิก
            </NeutralSubdueButton>
          </GuardedAction>
        </div>
      )),
    },
  ];

  if (!access.canView) return <AccessDeniedPanel what='ทะเบียนวัคซีนและกราฟการเจริญเติบโต' />;

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      {/* แท็บ "วัคซีน" กับ "กราฟการเจริญเติบโต" แยกกันแล้ว (มติผู้ใช้ 28 ส.ค. 69)
          — แผงเดียวกันแต่แสดงคนละส่วนตาม prop `section`
          `epi` = เฉพาะตารางวัคซีนพื้นฐาน สำหรับป๊อปอัปประวัติที่วางตารางไว้เหนือ
          ไทม์ไลน์เข็มของตัวเอง จึงไม่ต้องการทะเบียนการฉีดซ้ำอีกชุด */}
      {section !== 'growth' && (
      <>
      {/* ── ตาราง EPI ตามช่วงอายุ ─────────────────────────── */}
      <PanelCard
        title='ตารางวัคซีนพื้นฐาน (EPI) ตามช่วงอายุ'
        subtitle='สถานะเทียบกับกำหนดการสร้างเสริมภูมิคุ้มกันโรคของกระทรวงสาธารณสุข'
      >
        {/* แบ่งตามช่วงอายุ (มติผู้ใช้ 29 ส.ค. 69) — ตาราง EPI ของกระทรวงเป็น
            "อายุเท่านี้ ต้องได้เข็มไหนบ้าง" ไม่ใช่รายการเข็มเรียงกัน 13 ใบ
            กลุ่มตาม dueMonths ของ EPI_SCHEDULE เรียงจากแรกเกิดขึ้นไป แต่ละกลุ่ม
            ติดป้ายรวมว่าครบ/ค้าง กี่เข็ม ทำให้กวาดตาเจอทันทีว่าช่วงอายุไหนตกหล่น */}
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          {epiByAge.map((g) => (
            <div key={g.months} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-medium)' }}>
                  {g.label}
                </span>
                {g.overdue > 0 ? (
                  <StatusBadge style='error' size='small' icon='schedule'>{`ค้างรับ ${g.overdue} เข็ม`}</StatusBadge>
                ) : g.done === g.total ? (
                  <StatusBadge style='success' size='small' icon='check_circle'>ครบแล้ว</StatusBadge>
                ) : null}
                <span style={PANEL_LABEL_STYLE}>{`${g.done}/${g.total} เข็ม`}</span>
              </div>
              <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {g.items.map((s) => (
                  <div
                    key={s.key}
                    className='flex flex-col min-w-0'
                    style={{
                      gap: 'var(--dim-space-100, 4px)',
                      minWidth: 200,
                      borderRadius: 'var(--dim-radius-300, 10px)',
                      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
                      paddingTop: 'var(--dim-space-200, 8px)',
                      paddingRight: 'var(--dim-space-300, 12px)',
                      paddingBottom: 'var(--dim-space-200, 8px)',
                      paddingLeft: 'var(--dim-space-300, 12px)',
                    }}
                  >
                    <span style={PANEL_VALUE_STYLE}>{s.vaccine}</span>
                    <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                      {s.status === 'complete' ? (
                        <StatusBadge style='success' size='small' icon='check_circle'>ครบแล้ว</StatusBadge>
                      ) : s.status === 'overdue' ? (
                        <StatusBadge style='error' size='small' icon='schedule'>ค้างรับ</StatusBadge>
                      ) : null}
                      <span style={PANEL_LABEL_STYLE}>{s.doneCount}/{s.dose} เข็ม</span>
                    </div>
                    {s.lastDate ? <span style={PANEL_LABEL_STYLE}>ล่าสุด {s.lastDate}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PanelCard>

      {section !== 'epi' && (
      <>
      {/* ── ทะเบียนการฉีดรายคน ──────────────────────────── */}
      <PanelCard
        title='ประวัติการได้รับวัคซีน'
        subtitle='บันทึกทุกเข็มพร้อม Lot ผู้ฉีด และปฏิกิริยาหลังฉีด — ยกเลิกได้แบบขีดฆ่า ไม่ลบทิ้ง'
        action={
          <>
            <CountLabel n={vaccines.length} unit='เข็ม' />
            <GuardedAction allowed={access.canEdit}>
              <BrandButton
                variant='fill' size='sm' leadingIcon='vaccines'
                onClick={() => { setEditTarget(null); setDraft(blankVaccine()); setFormError(''); setAddOpen(true); }}
              >
                บันทึกเข็มใหม่
              </BrandButton>
            </GuardedAction>
          </>
        }
      >
        {vaccines.length === 0 ? (
          <PanelEmptyState
            icon='vaccines'
            title='ยังไม่มีประวัติการได้รับวัคซีนในระบบ'
            subtitle='บันทึกเข็มแรกเพื่อเริ่มทะเบียนวัคซีนของผู้รับบริการรายนี้'
            action={
              <GuardedAction allowed={access.canEdit}>
                <BrandButton variant='outline' size='sm' leadingIcon='vaccines' onClick={() => setAddOpen(true)}>
                  บันทึกเข็มใหม่
                </BrandButton>
              </GuardedAction>
            }
          />
        ) : (
          <>
            <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
              <Table columns={columns} rows={slice} rowKey={(r) => r.id} />
            </div>
            {pageCount > 1 ? (
              <div className='flex justify-end w-full'>
                <Pagination currentPage={safePage} pageCount={pageCount} onPageChange={setPage} />
              </div>
            ) : null}
          </>
        )}
      </PanelCard>
      </>
      )}
      </>
      )}

      {section !== 'vaccine' && section !== 'epi' && (
      <>
      {/* ── กราฟการเจริญเติบโต ──────────────────────────── */}
      <PanelCard
        title='กราฟการเจริญเติบโต (0–5 ปี)'
        subtitle='แถบสีตามเกณฑ์กรมอนามัย / Facts for Life — จุดกากบาท = ค่าที่วัดจริง'
        action={
          !isDemo ? (
            <GuardedAction
              allowed={canAddMeasurement}
              reason={
                !access.canEdit ? undefined
                  : !hasTodayValue ? 'ยังไม่มีน้ำหนัก/ส่วนสูงของวันนี้ — บันทึกสัญญาณชีพในขั้นตอนคัดกรองก่อน'
                    : 'ไม่ทราบอายุของผู้รับบริการ จึงพล็อตลงกราฟตามอายุไม่ได้'
              }
            >
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='add_chart' onClick={addTodayMeasurement}>
                เพิ่มค่าที่วัดวันนี้ ({form?.vitals?.weight || '—'} กก. / {form?.vitals?.height || '—'} ซม.)
              </NeutralSubdueButton>
            </GuardedAction>
          ) : null
        }
      >
        {growthSaved ? (
          <PanelAlert tone='success' icon='check_circle' title='บันทึกค่าลงกราฟแล้ว' onDismiss={() => setGrowthSaved('')}>
            {growthSaved}
          </PanelAlert>
        ) : null}

        {/* แถบอธิบายที่มาของแถบ percentile และแถบกราฟตัวอย่าง ถูกเอาออก 28 ส.ค. 69 */}


        {/* หน่วยวัดเป็น FilterTag แบบ dropdown (มติผู้ใช้ 29 ส.ค. 69) — เป็นตัวกรอง
            ว่ากราฟแสดงค่าอะไร ไม่ใช่แท็บที่สลับหน้า ทรงเดียวกับตัวกรองบน worklist
            ทุกหน้า และกินที่แค่ชิปเดียวแทนแถบแคปซูลยาว */}
        <div className='flex w-full shrink-0'>
          <FilterDropdown
            prefix='หน่วยวัด:'
            options={[...GROWTH_METRICS, { key: 'bmi', label: 'ดัชนีมวลกาย (BMI)' }]
              .map((m) => ({ value: m.key, label: m.label }))}
            value={metric}
            onChange={setMetric}
          />
        </div>

        {!showGrowthChart ? (
          <PanelEmptyState
            icon='block'
            title={`${metricMeta.label}ใช้ติดตามถึงอายุ ${metricMeta.maxAge} ปีเท่านั้น`}
            subtitle={`ผู้รับบริการอายุ ${ageYears} ปี — เกินช่วงที่มีแถบอ้างอิง เลือกน้ำหนักหรือส่วนสูงตามอายุแทน`}
          />
        ) : growthCtx.mode === 'empty' && growthPoints.length === 0 ? (
              <PanelEmptyState
                icon='monitoring'
                title='ยังไม่มีค่าที่วัดของผู้รับบริการรายนี้'
                subtitle='บันทึกน้ำหนัก/ส่วนสูงจากขั้นตอนคัดกรอง แล้วกด "เพิ่มค่าที่วัดวันนี้" เพื่อพล็อตลงกราฟ'
              />
        ) : (
          <>
            {growthPoints.filter((p) => Number.isFinite(p.value)).length === 1 ? (
              <PanelAlert tone='info' icon='scatter_plot' title='มีค่าที่วัดเพียงจุดเดียว'>
                ระบบจะพล็อตจุดกากบาทบนแถบสีให้ แต่ยังลากเส้นแนวโน้มไม่ได้จนกว่าจะมีการวัดครั้งที่ 2
              </PanelAlert>
            ) : null}
            {metric === 'bmi' && growthPoints.some((p) => (p.missing || []).length) ? (
              <PanelAlert tone='warning' icon='calculate' title='คำนวณ BMI ไม่ได้บางจุด'>
                การวัดบางครั้งขาด{[...new Set(growthPoints.flatMap((p) => p.missing || []))].join(' / ')} — ระบบข้ามจุดนั้นไป
              </PanelAlert>
            ) : null}

            <GrowthChart
              bands={bands}
              points={growthPoints}
              metric={metric === 'bmi' ? 'weight' : metric}
              unit={metric === 'bmi' ? 'kg/m²' : (GROWTH_METRICS.find((m) => m.key === metric)?.unit || '')}
              xMode={useMophMonthly && metric !== 'bmi' ? 'months' : 'years'}
            />

            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <InfoPair
                label={isDemo ? 'ค่าล่าสุด (ตัวอย่าง)' : 'ค่าล่าสุด'}
                value={latest ? `${latest.value} ${metric === 'bmi' ? 'kg/m²' : GROWTH_METRICS.find((m) => m.key === metric)?.unit}` : '—'}
              />
              <InfoPair label='วันที่วัด' value={latest?.date} />
              <InfoPair label='อายุขณะวัด' value={latest ? `${Math.round(latest.ageYears * 12)} เดือน (${latest.ageYears} ปี)` : '—'} />
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)', minWidth: 220 }}>
                <span style={PANEL_LABEL_STYLE}>ภาวะโภชนาการ (แถบสี)</span>
                {latestBand
                  ? <ColorfulBadge style={latestBand.tone} size='small' width='hug'>{latestBand.label}</ColorfulBadge>
                  : (
                    <span style={PANEL_VALUE_STYLE}>
                      {bmiBandsMissing ? 'ยังไม่มีเกณฑ์ BMI ตามอายุให้เทียบ' : '—'}
                    </span>
                  )}
              </div>
            </div>
          </>
        )}
      </PanelCard>
      </>
      )}

      {/* ── ฟอร์มบันทึก/แก้ไขเข็ม ───────────────────────── */}
      <AlertDialog
        open={addOpen}
        type='info'
        title={editTarget ? 'แก้ไขบันทึกการฉีดวัคซีน' : 'บันทึกการฉีดวัคซีนเข็มใหม่'}
        description={editTarget ? 'ระบบจะประทับเวลาที่แก้ไขเพิ่ม โดยไม่ทับเวลาที่บันทึกเดิม' : 'กรอกข้อมูลให้ครบเพื่อให้ตรวจสอบย้อนหลังได้'}
        confirmLabel={editTarget ? 'บันทึกการแก้ไข' : 'บันทึก'}
        cancelLabel='ยกเลิก'
        onConfirm={() => validateAndSave(false)}
        onCancel={() => { setAddOpen(false); setEditTarget(null); setDraft(blankVaccine()); setFormError(''); }}
        onClose={() => setAddOpen(false)}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <Select
            label='ชนิดวัคซีน'
            required
            value={draft.epiKey}
            onChange={(v) => setDraft((d) => ({ ...d, epiKey: v }))}
            options={VACCINE_OPTIONS}
            placeholder='เลือกชนิดวัคซีน'
          />
          <InputField label='เข็มที่' value={String(draft.doseNo)} onChange={(v) => setDraft((d) => ({ ...d, doseNo: Number(v) || 1 }))} showLeadingIcon={false} placeholder='1' />
          <InputField label='วันที่ฉีด' required value={draft.injectedOn} onChange={(v) => setDraft((d) => ({ ...d, injectedOn: v }))} showLeadingIcon={false} placeholder='เช่น 18 มิถุนายน 2569' />
          <InputField label='Lot' value={draft.lot} onChange={(v) => setDraft((d) => ({ ...d, lot: v }))} showLeadingIcon={false} placeholder='เช่น FLU-2569-A21' />
          <InputField label='วันหมดอายุของ Lot' value={draft.expiry} onChange={(v) => setDraft((d) => ({ ...d, expiry: v }))} showLeadingIcon={false} placeholder='เช่น 30 เมษายน 2570' />
          <InputField label='ตำแหน่งที่ฉีด' value={draft.site} onChange={(v) => setDraft((d) => ({ ...d, site: v }))} showLeadingIcon={false} placeholder='เช่น ต้นแขนซ้าย (IM)' />
          <SuggestibleTextarea
            voice
            label='ปฏิกิริยาหลังฉีด'
            value={draft.reaction}
            onChange={(e) => setDraft((d) => ({ ...d, reaction: typeof e === 'string' ? e : e?.target?.value ?? '' }))}
            suggestions={VACCINE_REACTION_SUGGESTIONS}
            minChars={2}
            height={110}
            minHeight={88}
            popoverAriaLabel='ตัวอย่างปฏิกิริยาหลังฉีด'
            placeholder='สังเกตอาการ 30 นาทีแล้วบันทึกผล'
          />
          {formError ? (
            <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-alert-error, #B91C1C)' }}>{formError}</span>
          ) : null}
        </div>
      </AlertDialog>

      {/* เตือนบันทึกซ้ำ */}
      <AlertDialog
        open={!!dupWarn}
        type='warning'
        title='พบบันทึกวัคซีนที่ซ้ำกัน'
        description={dupWarn ? `มีบันทึก "${dupWarn.vaccine}" เข็มที่ ${dupWarn.doseNo} ฉีดเมื่อ ${dupWarn.injectedOn} อยู่แล้ว — ยืนยันว่าเป็นการฉีดคนละครั้งจริงหรือไม่` : ''}
        confirmLabel='ยืนยัน บันทึกเพิ่ม'
        cancelLabel='กลับไปแก้ไข'
        onConfirm={() => { setDupWarn(null); validateAndSave(true); }}
        onCancel={() => setDupWarn(null)}
        onClose={() => setDupWarn(null)}
      />

      {/* เตือนเข็มข้ามลำดับ */}
      <AlertDialog
        open={!!seqWarn}
        type='warning'
        title='ลำดับเข็มไม่ต่อเนื่อง'
        description={seqWarn ? `กำลังบันทึกเข็มที่ ${seqWarn.got} ทั้งที่ในระบบยังไม่มีเข็มที่ ${seqWarn.expected} — หากผู้รับบริการได้รับเข็มก่อนหน้าจากที่อื่น ให้บันทึกต่อได้ และควรระบุไว้ในช่องปฏิกิริยา/หมายเหตุ` : ''}
        confirmLabel='บันทึกต่อ'
        cancelLabel='กลับไปแก้ไข'
        onConfirm={() => { setSeqWarn(null); validateAndSave(true); }}
        onCancel={() => setSeqWarn(null)}
        onClose={() => setSeqWarn(null)}
      />

      {/* ยกเลิกเข็ม */}
      <ReasonDialog
        open={!!cancelTarget}
        type='destructive'
        title='ยกเลิกบันทึกการฉีดวัคซีน'
        description={cancelTarget ? `${cancelTarget.vaccine} เข็มที่ ${cancelTarget.doseNo} (${cancelTarget.injectedOn}) — ระบบจะขีดฆ่าไว้พร้อมเหตุผล ไม่ลบออกจากทะเบียน` : ''}
        confirmLabel='ยืนยันการยกเลิก'
        suggestions={VACCINE_CANCEL_SUGGESTIONS}
        onConfirm={(reason) => { cancelVaccine(cancelTarget.id, reason); setCancelTarget(null); }}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  );
};

export default VaccineGrowthPanel;
