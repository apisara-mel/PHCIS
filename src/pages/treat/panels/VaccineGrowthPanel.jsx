import React, { useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import TabPill from '@/components/tab/TabPill';
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
  GROWTH_METRICS, GROWTH_PERCENTILE_KEYS, growthMeasurementsFor, growthBandsFor, computeBmi,
  addGrowthMeasurement,
} from '@/data/treatmentVaccines';

/* PHCIS | EMR §1.4.3.10 / §1.4.3.11 — ทะเบียนวัคซีนรายคน + กราฟการเจริญเติบโต.

   ข้อจำกัดที่ต้องรายงานตามจริง (partial ไม่ใช่ done): แถบ percentile
   p3–p97 ใน GROWTH_BANDS เป็นชุดค่าประมาณสำหรับ prototype ยังไม่ใช่
   dataset ทางการของสมาคมต่อมไร้ท่อเด็กและวัยรุ่นไทย — ต้องเปลี่ยนเป็น
   ชุดข้อมูลจริงก่อนใช้งานทางคลินิก. */

const PER_PAGE = 10;
const MAX_GROWTH_AGE = 18;

/* ── กราฟการเจริญเติบโต (SVG ในตัว — ข้อมูลเชิงสถิติ ไม่ใช่ icon) ── */

const CHART_W = 640;
const CHART_H = 320;
const PAD_L = 44;
const PAD_B = 32;
const PAD_T = 12;
const PAD_R = 12;

const BAND_FILLS = [
  'var(--surface-brandPrimary-quaternary, #F4FBF8)',
  'var(--surface-brandPrimary-tertiary, #E2F3EB)',
  'var(--surface-brandPrimary-quaternary, #F4FBF8)',
];

const GrowthChart = ({ bands, points, unit }) => {
  const hasBands = Array.isArray(bands) && bands.length > 0;
  const measured = points.filter((p) => Number.isFinite(p.value));

  /* ไม่มีแถบอ้างอิง (เช่นแท็บ BMI ที่ยังไม่มี dataset BMI-for-age) →
     วาดเฉพาะเส้นค่าที่วัดจริง ห้ามยืมแถบของค่าอื่นมาเทียบเด็ดขาด */
  if (!hasBands && measured.length === 0) {
    return (
      <PanelEmptyState
        icon='show_chart'
        title='ยังไม่มีค่าที่วัดสำหรับกราฟนี้'
        subtitle='บันทึกน้ำหนัก/ส่วนสูงของวันนี้ แล้วค่าจะมาแสดงบนกราฟทันที'
      />
    );
  }

  const ages = hasBands ? bands.map((b) => b.age) : measured.map((p) => p.ageYears);
  const minAge = Math.min(...ages);
  const maxAge = Math.max(...ages);
  const allVals = hasBands
    ? bands.flatMap((b) => GROWTH_PERCENTILE_KEYS.map((k) => b[k]))
    : [];
  const rawMin = Math.min(...allVals, ...measured.map((p) => p.value));
  const rawMax = Math.max(...allVals, ...measured.map((p) => p.value));
  /* เผื่อขอบบน/ล่างเมื่อไม่มีแถบ ไม่งั้นเส้นจะแนบขอบกราฟจนอ่านไม่ออก */
  const padVal = hasBands ? 0 : ((rawMax - rawMin) || 1) * 0.15;
  const minVal = rawMin - padVal;
  const maxVal = rawMax + padVal;
  const span = maxVal - minVal || 1;

  const x = (age) => PAD_L + ((age - minAge) / (maxAge - minAge || 1)) * (CHART_W - PAD_L - PAD_R);
  const y = (v) => PAD_T + (1 - (v - minVal) / span) * (CHART_H - PAD_T - PAD_B);

  const lineFor = (key) => bands.map((b) => `${x(b.age)},${y(b[key])}`).join(' ');

  /* พื้นที่ระหว่าง p3–p97 / p10–p90 / p25–p75 ให้อ่านแถบได้ง่าย */
  const areaBetween = (lo, hi) => {
    const up = bands.map((b) => `${x(b.age)},${y(b[hi])}`).join(' ');
    const down = [...bands].reverse().map((b) => `${x(b.age)},${y(b[lo])}`).join(' ');
    return `${up} ${down}`;
  };

  const ageTicks = hasBands ? bands.map((b) => b.age) : [...new Set(measured.map((p) => p.ageYears))];

  /* จุดวัดจริง — ข้ามค่าที่หายไป (ไม่ลากเส้นทะลุ) */
  const segments = [];
  let current = [];
  points.forEach((p) => {
    if (Number.isFinite(p.value)) current.push(p);
    else if (current.length) { segments.push(current); current = []; }
  });
  if (current.length) segments.push(current);

  const yTicks = 5;

  return (
    <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
      <svg
        width={CHART_W}
        height={CHART_H}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        role='img'
        aria-label='กราฟการเจริญเติบโตเทียบแถบเปอร์เซ็นไทล์'
        style={{ minWidth: CHART_W, display: 'block' }}
      >
        {hasBands ? (
          <>
            <polygon points={areaBetween('p3', 'p97')} fill={BAND_FILLS[0]} />
            <polygon points={areaBetween('p10', 'p90')} fill={BAND_FILLS[1]} />
            <polygon points={areaBetween('p25', 'p75')} fill={BAND_FILLS[2]} />
          </>
        ) : null}

        {/* แกน */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={CHART_H - PAD_B} stroke='var(--border-neutral-tertiary, #E2E4E6)' strokeWidth='1' />
        <line x1={PAD_L} y1={CHART_H - PAD_B} x2={CHART_W - PAD_R} y2={CHART_H - PAD_B} stroke='var(--border-neutral-tertiary, #E2E4E6)' strokeWidth='1' />

        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const v = minVal + (span * i) / yTicks;
          return (
            <g key={i}>
              <line
                x1={PAD_L} y1={y(v)} x2={CHART_W - PAD_R} y2={y(v)}
                stroke='var(--border-neutral-quaternary, #F4F5F5)' strokeWidth='1'
              />
              <text
                x={PAD_L - 6} y={y(v) + 4} textAnchor='end'
                fill='var(--text-content-tertiary, #858C92)'
                style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 10px)' }}
              >
                {Math.round(v * 10) / 10}
              </text>
            </g>
          );
        })}

        {ageTicks.map((age) => (
          <text
            key={age}
            x={x(age)} y={CHART_H - PAD_B + 14} textAnchor='middle'
            fill='var(--text-content-tertiary, #858C92)'
            style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 10px)' }}
          >
            {age}
          </text>
        ))}

        {hasBands ? GROWTH_PERCENTILE_KEYS.map((k) => (
          <polyline
            key={k}
            points={lineFor(k)}
            fill='none'
            stroke={k === 'p50' ? 'var(--border-brandPrimary-default, #007549)' : 'var(--border-neutral-tertiary, #E2E4E6)'}
            strokeWidth={k === 'p50' ? 1.6 : 1}
            strokeDasharray={k === 'p50' ? '' : '3 3'}
          />
        )) : null}

        {/* เส้นค่าที่วัดจริง — ต่อเฉพาะช่วงที่มีค่าติดกัน */}
        {segments.filter((s) => s.length > 1).map((seg, i) => (
          <polyline
            key={`seg-${i}`}
            points={seg.map((p) => `${x(p.ageYears)},${y(p.value)}`).join(' ')}
            fill='none'
            stroke='var(--border-dangerButton-default, #DC2626)'
            strokeWidth='2'
          />
        ))}
        {measured.map((p, i) => (
          <circle
            key={`pt-${i}`}
            cx={x(p.ageYears)} cy={y(p.value)} r='4'
            fill='var(--surface-dangerButton-default, #B91C1C)'
          />
        ))}

        <text
          x={PAD_L} y={PAD_T + 2} textAnchor='start'
          fill='var(--text-content-tertiary, #858C92)'
          style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 10px)' }}
        >
          {unit}
        </text>
        <text
          x={CHART_W - PAD_R} y={CHART_H - 4} textAnchor='end'
          fill='var(--text-content-tertiary, #858C92)'
          style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 10px)' }}
        >
          อายุ (ปี)
        </text>
      </svg>
    </div>
  );
};

/* หาว่าค่าที่วัดตกอยู่ในแถบใด */
const bandLabelFor = (bands, ageYears, value) => {
  if (!Number.isFinite(value) || !bands.length) return null;
  let ref = bands[0];
  bands.forEach((b) => { if (b.age <= ageYears) ref = b; });
  if (value < ref.p3) return { label: 'ต่ำกว่าเปอร์เซ็นไทล์ที่ 3', tone: 'red' };
  if (value < ref.p10) return { label: 'ระหว่าง P3 – P10', tone: 'orange' };
  if (value < ref.p25) return { label: 'ระหว่าง P10 – P25', tone: 'yellow' };
  if (value < ref.p75) return { label: 'ระหว่าง P25 – P75 (เกณฑ์ปกติ)', tone: 'green' };
  if (value < ref.p90) return { label: 'ระหว่าง P75 – P90', tone: 'yellow' };
  if (value < ref.p97) return { label: 'ระหว่าง P90 – P97', tone: 'orange' };
  return { label: 'สูงกว่าเปอร์เซ็นไทล์ที่ 97', tone: 'red' };
};

/* ── panel หลัก ─────────────────────────────────────────────── */

const blankVaccine = () => ({
  epiKey: '', doseNo: 1, injectedOn: '', lot: '', expiry: '', site: '', reaction: '',
});

const VaccineGrowthPanel = ({ form, patient }) => {
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

  const measurements = useMemo(() => growthMeasurementsFor(hn), [hn, growthTick]); // eslint-disable-line react-hooks/exhaustive-deps

  /* BMI ไม่มีชุด BMI-for-age ใน GROWTH_BANDS — ห้ามยืมแถบน้ำหนักตามอายุมาใช้
     (kg/m² เทียบกับเกณฑ์หน่วย kg จะได้ผลแปลผลผิดแบบอันตราย) จึงไม่มีแถบเลย */
  const bmiBandsMissing = metric === 'bmi';
  const bands = bmiBandsMissing ? [] : growthBandsFor(gender, metric);

  const growthPoints = useMemo(() => measurements.map((m) => {
    if (metric === 'bmi') {
      const bmi = computeBmi({ weight: m.weight, height: m.height });
      return { ...m, value: bmi.value, missing: bmi.missing };
    }
    return { ...m, value: m[metric] };
  }), [measurements, metric]);

  const latest = [...growthPoints].reverse().find((p) => Number.isFinite(p.value));
  const latestBand = (latest && bands.length)
    ? bandLabelFor(bands, latest.ageYears, latest.value)
    : null;

  const outOfRange = Number.isFinite(ageYears) && ageYears > MAX_GROWTH_AGE;

  /* เส้นรอบศีรษะใช้ติดตามถึงอายุ 5 ปีเท่านั้น — เกินนั้นแถบอ้างอิงหมด
     ระบบจึงต้องบอกเหตุผล ไม่ใช่พล็อตจุดลอยนอกแถบเงียบ ๆ */
  const metricMeta = [...GROWTH_METRICS, { key: 'bmi', label: 'ดัชนีมวลกาย (BMI)', unit: 'kg/m²' }]
    .find((m) => m.key === metric);
  const metricOutOfAge = metricMeta?.maxAge != null
    && Number.isFinite(ageYears) && ageYears > metricMeta.maxAge;

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
    { key: 'injectedOn', header: 'วันที่ฉีด', width: 150 },
    {
      key: 'lot', header: 'Lot / วันหมดอายุ', width: 180,
      render: (row) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={PANEL_VALUE_STYLE}>{row.lot || '—'}</span>
          <span style={PANEL_LABEL_STYLE}>หมดอายุ {row.expiry || '—'}</span>
        </div>
      ),
    },
    { key: 'injectedBy', header: 'ผู้ฉีด', width: 170 },
    {
      key: 'reaction', header: 'ปฏิกิริยาหลังฉีด', width: 240,
      render: (row) => <span style={PANEL_LABEL_STYLE}>{row.reaction || 'ไม่ได้บันทึก'}</span>,
    },
    {
      key: 'actions', header: '', width: 170,
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
      {/* ── ตาราง EPI ตามช่วงอายุ ─────────────────────────── */}
      <PanelCard
        title='ตารางวัคซีนพื้นฐาน (EPI) ตามช่วงอายุ'
        subtitle='สถานะเทียบกับกำหนดการสร้างเสริมภูมิคุ้มกันโรคของกระทรวงสาธารณสุข'
      >
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {epiStatus.map((s) => (
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
                ) : (
                  <StatusBadge style='warning' size='small' icon='event_upcoming'>ถึงกำหนด</StatusBadge>
                )}
                <span style={PANEL_LABEL_STYLE}>{s.doneCount}/{s.dose} เข็ม</span>
              </div>
              {s.lastDate ? <span style={PANEL_LABEL_STYLE}>ล่าสุด {s.lastDate}</span> : null}
            </div>
          ))}
        </div>
      </PanelCard>

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

      {/* ── กราฟการเจริญเติบโต ──────────────────────────── */}
      <PanelCard
        title='กราฟการเจริญเติบโต (0–18 ปี)'
        subtitle='เทียบค่าที่วัดจริงกับแถบเปอร์เซ็นไทล์ P3–P97 แยกตามเพศ'
        action={
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
        }
      >
        {growthSaved ? (
          <PanelAlert tone='success' icon='check_circle' title='บันทึกค่าลงกราฟแล้ว' onDismiss={() => setGrowthSaved('')}>
            {growthSaved}
          </PanelAlert>
        ) : null}

        <PanelAlert tone='warning' icon='science' title='แถบเปอร์เซ็นไทล์เป็นชุดค่าประมาณ'>
          ชุดข้อมูลอ้างอิงในเวอร์ชันนี้ยังไม่ใช่ dataset ทางการของสมาคมต่อมไร้ท่อเด็กและวัยรุ่นไทย — ใช้ประกอบการดูแนวโน้มเท่านั้น
        </PanelAlert>

        {outOfRange ? (
          <PanelEmptyState
            icon='block'
            title={`ผู้รับบริการอายุ ${ageYears} ปี — ไม่อยู่ในช่วงที่ใช้กราฟนี้ (0–18 ปี)`}
            subtitle='กราฟการเจริญเติบโตใช้สำหรับเด็กและวัยรุ่นเท่านั้น สำหรับผู้ใหญ่ให้ติดตามค่าดัชนีมวลกาย (BMI) จากสัญญาณชีพแทน'
          />
        ) : (
          <>
            <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {[...GROWTH_METRICS, { key: 'bmi', label: 'ดัชนีมวลกาย (BMI)', unit: 'kg/m²' }].map((m) => (
                <TabPill key={m.key} selected={metric === m.key} onClick={() => setMetric(m.key)}>
                  {m.label}
                </TabPill>
              ))}
            </div>

            {metricOutOfAge ? (
              <PanelEmptyState
                icon='block'
                title={`${metricMeta.label}ใช้ติดตามถึงอายุ ${metricMeta.maxAge} ปีเท่านั้น`}
                subtitle={`ผู้รับบริการอายุ ${ageYears} ปี — เกินช่วงที่มีแถบเปอร์เซ็นไทล์อ้างอิง ระบบจึงไม่พล็อตค่าเพื่อไม่ให้แปลผลผิด เลือกน้ำหนักหรือส่วนสูงแทน`}
              />
            ) : growthPoints.length === 0 ? (
              <PanelEmptyState
                icon='monitoring'
                title='ยังไม่มีค่าที่วัดของผู้รับบริการรายนี้'
                subtitle='บันทึกน้ำหนัก/ส่วนสูงจากขั้นตอนคัดกรอง แล้วกด "เพิ่มค่าที่วัดวันนี้" เพื่อพล็อตลงกราฟ'
              />
            ) : (
              <>
                {bmiBandsMissing ? (
                  <PanelAlert tone='info' icon='info' title='แท็บ BMI ยังไม่มีแถบเปอร์เซ็นไทล์'>
                    ระบบยังไม่มีชุดข้อมูล BMI-for-age (kg/m² ตามอายุ) จึงแสดงเป็นเส้นแนวโน้มอย่างเดียว
                    และไม่แปลผลว่าอยู่แถบใด — การเทียบ BMI กับเกณฑ์น้ำหนักตามอายุให้ผลผิด จึงไม่ทำ
                  </PanelAlert>
                ) : null}
                {growthPoints.filter((p) => Number.isFinite(p.value)).length === 1 ? (
                  <PanelAlert tone='info' icon='scatter_plot' title='มีค่าที่วัดเพียงจุดเดียว'>
                    ระบบจะพล็อตจุดบนแถบเปอร์เซ็นไทล์ให้ แต่ยังลากเส้นแนวโน้มไม่ได้จนกว่าจะมีการวัดครั้งที่ 2
                  </PanelAlert>
                ) : null}
                {metric === 'bmi' && growthPoints.some((p) => (p.missing || []).length) ? (
                  <PanelAlert tone='warning' icon='calculate' title='คำนวณ BMI ไม่ได้บางจุด'>
                    การวัดบางครั้งขาด{[...new Set(growthPoints.flatMap((p) => p.missing || []))].join(' / ')} — ระบบข้ามจุดนั้นไป ไม่ลากเส้นทะลุ
                  </PanelAlert>
                ) : null}

                <GrowthChart
                  bands={bands}
                  points={growthPoints}
                  unit={metric === 'bmi' ? 'kg/m²' : (GROWTH_METRICS.find((m) => m.key === metric)?.unit || '')}
                />

                <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <InfoPair label='ค่าล่าสุด' value={latest ? `${latest.value} ${metric === 'bmi' ? 'kg/m²' : GROWTH_METRICS.find((m) => m.key === metric)?.unit}` : '—'} />
                  <InfoPair label='วันที่วัด' value={latest?.date} />
                  <InfoPair label='อายุขณะวัด' value={latest ? `${latest.ageYears} ปี` : '—'} />
                  <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)', minWidth: 220 }}>
                    <span style={PANEL_LABEL_STYLE}>ตกอยู่ในแถบ</span>
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
          </>
        )}
      </PanelCard>

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
