import React, { useCallback, useEffect, useRef, useState } from 'react';
import Topic from '@/components/topic/Topic';
import VitalCard, { PressureCard, BMICard } from '@/components/card/VitalCard';
import GrowthStatusCard from '@/components/growth/GrowthStatusCard';
import FilterTag from '@/components/forms/FilterTag';
import HistoryTimeline from '@/components/timeline/HistoryTimeline';
import VitalsSignGraphDialog from '@/components/vitals/VitalsSignGraphDialog';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
/* Figma: Radio Button (MIH Design System Foundation,
   componentKey 7a57c74d0bfe62652d33bc5b8bddd1a5ae84994b)
   Variants used here:
     • State=Selected, Border=Yes  → 2px brand-tertiary stroke, white bg, #363B3F text
     • State=Disabled-Unchecked, Border=Yes → 1px neutral-tertiary stroke, white bg, #ADB2B7 text */

/* Figma node 80:12916 — Vitals (สัญญาณชีพ) Step 1
   Tokens (design.md §4·§6):
     surface/topic/default              → #FFFFFF
     text/topic/primary-title           → brand-p700 (icon + title)
     surface/neutralbutton/quinary      → #FFFFFF (radio pill bg)
     border/brandprimarybutton/tertiary → #C5EDDA (radio pill selected, 2px)
     border/neutralbutton/tertiary      → #E2E4E6 (radio pill default, 1px)
     text/content/default               → #363B3F (radio pill selected text)
     text/content/quaternary            → #ADB2B7 (radio pill default/disabled text)
     text/neutralbutton/default         → #4D5358 (Neutral Subdue Button text)
     surface/neutral/quaternary         → right vitals panel bg (160:28034)
     border/neutral/quaternary          → right vitals panel stroke (1px)
     text/topic/tertiary-title          → #363B3F (right panel title)         */

/* Demo seed values — shown for any historical round that already has
   measurements logged. When wiring to the API, swap this for a per-round
   payload keyed by activeRound.id. */
const SEED_VITALS = {
  temp:        { value: '36.5', badge: { tone: 'teal', label: 'ปกติ' } },
  pulse:       { value: '78',   badge: { tone: 'teal', label: 'ปกติ' } },
  pressure:    { sys: '128', dia: '80' },
  respiration: { value: '20',   badge: { tone: 'teal', label: 'ปกติ' } },
  oxygen:      { value: '98',   badge: { tone: 'teal', label: 'ปกติ' } },
  height:      { value: '182' },
  weight:      { value: '62' },
  waist:       { value: '80' },
};

/* Fresh-round overrides — only the four "วัดทุกครั้ง" vitals reset to empty
   on a new round (อุณหภูมิ · ชีพจร · ความดัน · อัตราการหายใจ).
   ออกซิเจน / ส่วนสูง / น้ำหนัก / BMI / เส้นรอบเอว carry forward from the
   previous round (anthropometric + general info that doesn't change per visit). */
const FRESH_OVERRIDES = {
  temp:        { value: '' },
  pulse:       { value: '' },
  pressure:    { sys: '', dia: '' },
  respiration: { value: '' },
};

/* First-visit baseline — Figma PHCIS-ALL 3133:138917 ("OPD · ขั้นตอนคัด
   กรองและซักประวัติ / สัญญาณชีพ — empty"). Every input lands on a
   literal `0` (per product spec). All badges are undefined so the
   empty-state panel never certifies an unmeasured 0 reading as "ปกติ"
   — VitalCard / PressureCard / BMICard each enforce a positive-value
   gate before any status badge renders, so the panel stays clean
   until a clinician keys in real numbers. */
const FIRST_VISIT_VITALS = {
  temp:        { value: '0', badge: undefined },
  pulse:       { value: '0', badge: undefined },
  pressure:    { sys: '0', dia: '0' },
  respiration: { value: '0', badge: undefined },
  oxygen:      { value: '0', badge: undefined },
  height:      { value: '0' },
  weight:      { value: '0' },
  waist:       { value: '0' },
};

const SEED_VITALS_BY_ROUND_ID = {
  'seed-0': { temp: '36.5', pressureSys: '128', pressureDia: '80', weight: '60' },
  'seed-1': { temp: '36.7', pressureSys: '130', pressureDia: '82', weight: '60' },
  'seed-2': { temp: '36.4', pressureSys: '126', pressureDia: '79', weight: '60' },
  'seed-3': { temp: '36.6', pressureSys: '124', pressureDia: '78', weight: '59.8' },
  'seed-4': { temp: '36.8', pressureSys: '132', pressureDia: '84', weight: '60.2' },
  'seed-5': { temp: '36.5', pressureSys: '129', pressureDia: '81', weight: '60' },
  'seed-6': { temp: '36.3', pressureSys: '127', pressureDia: '80', weight: '59.9' },
  'seed-7': { temp: '36.4', pressureSys: '125', pressureDia: '78', weight: '59.9' },
  'seed-8': { temp: '36.7', pressureSys: '131', pressureDia: '83', weight: '60.1' },
  'seed-9': { temp: '36.2', pressureSys: '123', pressureDia: '77', weight: '59.7' },
  'seed-10': { temp: '36.1', pressureSys: '122', pressureDia: '76', weight: '59.6' },
  'seed-11': { temp: '36.4', pressureSys: '126', pressureDia: '79', weight: '59.8' },
};

const toDisplay = (value, unit) => {
  const raw = value == null ? '' : String(value).trim();
  return raw ? `${raw} ${unit}` : '—';
};

const toPressureDisplay = (sys, dia) => {
  const s = sys == null ? '' : String(sys).trim();
  const d = dia == null ? '' : String(dia).trim();
  return s && d ? `${s}/${d} mmHg` : '—';
};

const resolveWeightForRound = (roundId, overrides) =>
  overrides?.[roundId]?.weight ??
  SEED_VITALS_BY_ROUND_ID[roundId]?.weight ??
  SEED_VITALS.weight.value;

/* The screening footer's "ถัดไป" button enables only when ALL of these
   fields have a positive numeric value — matches the `required` flag
   on each VitalCard and the Figma 293:65594 first-visit annotation
   ("เติมข้อความที่ require ไม่ครบ จะ disabled"). BMI is intentionally
   omitted because it's derived from weight + height; once those two
   are valid, BMI is auto-valid.                                     */
const REQUIRED_VITAL_FIELDS = [
  'temp',
  'pulse',
  'pressure',
  'respiration',
  'oxygen',
  'height',
  'weight',
  'waist',
];

const VitalsForm = ({ onValidityChange, onValuesChange, patientSex, patientAgeYears }) => {
  const [roundVitalOverrides, setRoundVitalOverrides] = useState({});

  /* Per-field validity map populated by each VitalCard / PressureCard
     via their `onValidityChange` hook. `isFormValid` collapses to true
     only when every required field reports `hasMeasurement = true`,
     which we forward to ScreeningPage so the footer can gate the
     "ถัดไป" button. Setter is idempotent (no-op when value unchanged)
     to keep the per-keystroke cascade cheap.                         */
  const [vitalValidity, setVitalValidity] = useState({});
  const setFieldValid = useCallback((field, valid) => {
    setVitalValidity((prev) => (prev[field] === valid ? prev : { ...prev, [field]: valid }));
  }, []);

  const historyTimelineRef = useRef(null);
  /* ToR ผนวก ก ๑.๒.๒.๕ — อายุ < 18 ปี เทียบกราฟการเจริญเติบโต · ตั้งแต่ 18 ปี
     ขึ้นไปดูจาก BMI ปุ่มคู่นี้จึงสลับ "การ์ดภาวะโภชนาการ" ในกริดจริง ๆ ไม่ใช่
     ตัวกรองเปล่า (ชิป ≥2 ปี ชุดเดิมถูกตัดออกเพราะกดไม่ได้ — มติผู้ใช้ 28 ส.ค. 69)
     ค่าเริ่มต้นเดาจากอายุผู้รับบริการถ้ารู้ ไม่รู้ก็ถือเป็นผู้ใหญ่ */
  const [ageBand, setAgeBand] = useState(
    Number(patientAgeYears) > 0 && Number(patientAgeYears) < 18 ? 'child' : 'adult',
  );
  const [activeRound, setActiveRound] = useState({
    id: 'seed-0',
    date: '6 พฤษภาคม 2569',
    time: '21:19:27',
    isFresh: false,
  });

  const handleActiveRoundChange = useCallback(({ round }) => {
    setActiveRound((prev) => {
      if (round?.isFresh) {
        setRoundVitalOverrides((prevOverrides) => {
          const currentNext = prevOverrides[round.id] || {};
          if (currentNext.weight != null && String(currentNext.weight).trim() !== '') return prevOverrides;
          const carryWeight = resolveWeightForRound(prev.id, prevOverrides);
          return {
            ...prevOverrides,
            [round.id]: {
              ...currentNext,
              weight: carryWeight,
            },
          };
        });
      }
      return {
        id: round.id,
        date: round.date,
        time: round.time,
        isFresh: !!round.isFresh,
      };
    });
  }, []);

  /* `roundsCount` mirrors the HistoryTimeline's row count so the graph
     button below can disable itself when the patient has no recorded
     rounds yet — Figma 293:65594 (empty / first-visit state). Defaults to
     0 so the very first render lands in the disabled / empty look. */
  const [roundsCount, setRoundsCount] = useState(0);
  const handleRoundsChange = useCallback((nextRows, meta) => {
    void meta;
    setRoundsCount(Array.isArray(nextRows) ? nextRows.length : 0);
  }, []);

  const measurementTitle = `การวัดวันที่ ${activeRound.date}, เวลา ${activeRound.time}`;
  const activeSeed = SEED_VITALS_BY_ROUND_ID[activeRound.id] || {};
  const activeOverride = roundVitalOverrides[activeRound.id] || {};
  /* `firstVisit` mirrors the graph-button's empty state (Figma 293:65594)
     — once the timeline reports zero rounds the panel switches to the
     first-visit baseline (all fields = 0, no auto badges). The moment
     the clinician adds a round (`roundsCount > 0`) we fall back to the
     normal seed / fresh-round resolution below. */
  const firstVisit = roundsCount === 0;
  const vitals = firstVisit
    ? FIRST_VISIT_VITALS
    : activeRound.isFresh
      ? { ...SEED_VITALS, ...FRESH_OVERRIDES }
      : SEED_VITALS;
  const resolveScalar = (override, freshValue, seedValue, baseValue) => {
    if (override != null) return override;
    if (firstVisit) return '0';
    if (activeRound.isFresh) return freshValue;
    return seedValue ?? baseValue;
  };
  const activeVitals = {
    ...vitals,
    temp: {
      ...vitals.temp,
      value: resolveScalar(activeOverride.temp, '', activeSeed.temp, vitals.temp.value),
    },
    pressure: {
      ...vitals.pressure,
      sys: resolveScalar(activeOverride.pressureSys, '', activeSeed.pressureSys, vitals.pressure.sys),
      dia: resolveScalar(activeOverride.pressureDia, '', activeSeed.pressureDia, vitals.pressure.dia),
    },
    weight: {
      ...vitals.weight,
      value: resolveScalar(activeOverride.weight, '', activeSeed.weight, vitals.weight.value),
    },
    /* Height tracks the same override → seed → fallback chain as weight
       so BMICard can react to live edits. Without this, the height
       VitalCard would update its internal state but the parent's BMI
       computation would keep reading the original seed. */
    height: {
      ...vitals.height,
      value: resolveScalar(activeOverride.height, '', activeSeed.height, vitals.height.value),
    },
  };
  const timelineOverrides = Object.entries(roundVitalOverrides).reduce((acc, [roundId, v]) => {
    acc[roundId] = {
      temp: toDisplay(v.temp, '°C'),
      pressure: toPressureDisplay(v.pressureSys, v.pressureDia),
      weight: toDisplay(v.weight, 'kg'),
    };
    return acc;
  }, {});

  /* Optional, observational mirror of the round being edited — used by the
     OPD screening review step. Callers that omit it are unaffected. */
  useEffect(() => {
    if (typeof onValuesChange !== 'function') return;
    onValuesChange({
      round: { date: activeRound.date, time: activeRound.time },
      temp: activeVitals.temp?.value ?? '',
      pressureSys: activeVitals.pressure?.sys ?? '',
      pressureDia: activeVitals.pressure?.dia ?? '',
      weight: activeVitals.weight?.value ?? '',
      height: activeVitals.height?.value ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeRound.id, activeRound.date, activeRound.time,
    activeVitals.temp?.value, activeVitals.pressure?.sys, activeVitals.pressure?.dia,
    activeVitals.weight?.value, activeVitals.height?.value,
  ]);

  const updateActiveRoundVitals = useCallback((patch) => {
    setRoundVitalOverrides((prev) => {
      const current = prev[activeRound.id] || {};
      return {
        ...prev,
        [activeRound.id]: {
          ...current,
          ...patch,
        },
      };
    });
  }, [activeRound.id]);

  /* Roll the per-field map up to a single boolean and propagate. The
     dep array intentionally omits `onValidityChange` because parents
     pass an inline closure bound to the current step index. */
  const isFormValid = REQUIRED_VITAL_FIELDS.every((f) => vitalValidity[f] === true);
  useEffect(() => {
    onValidityChange?.(isFormValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFormValid]);

  return (
    <section className='bg-surface-card rounded-b-card p-6 flex flex-col gap-3'>
      {/* Topic — DS atom (Figma "Topic" 2334:1841, hierarchy=Primary,
         state=default). Aliases the Vitals section header so it inherits
         the same surface tint, leading-icon styling, and brand-tinted
         title used everywhere else in the design system. Trailing badge
         / success / chevron are off because this row only labels the
         form section and exposes no action affordance. */}
      <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <FilterTag
          value='ต่ำกว่า 18 ปี'
          selected={ageBand === 'child'}
          onClick={() => setAgeBand('child')}
        />
        <FilterTag
          value='ตั้งแต่ 18 ปีขึ้นไป'
          selected={ageBand === 'adult'}
          onClick={() => setAgeBand('adult')}
        />
      </div>

      {/* Two-column body — left: history timeline (brand-tinted aside);
          right: vitals form panel (Figma 160:28034 — PHCIS OPD). Per Figma
          this panel is the neutral grey shell, NOT brand-tinted, so use
          surface.neutral.quaternary + border.neutral.quaternary
          (design.md rows 1869 / 303). Inline style instead of arbitrary
          Tailwind `[var(...)]` because Tailwind v2 JIT can inline the
          fallback hex at build-time. */}
      <div className='flex items-start gap-6 w-full'>
        {/* ไทม์ไลน์ซ้ายโผล่หลังกด "เพิ่มรอบการวัด" เท่านั้น — เข้ามาครั้งแรกยังไม่มี
            รอบวัดสักรอบ คอลัมน์ซ้ายที่ว่างเปล่าจึงเป็นที่ว่างที่ไม่ได้บอกอะไร
            **ซ่อนด้วย `display:none` ไม่ใช่ถอดออกจาก DOM** เพราะปุ่มเพิ่มรอบวัดใน
            พาเนลขวาสั่งงานผ่าน `historyTimelineRef` ถ้า unmount ref จะเป็น null
            แล้วปุ่มจะกดไม่ติด และรอบที่เคยเพิ่มไว้จะหายไปด้วย */}
        <div style={firstVisit ? { display: 'none' } : undefined}>
          <HistoryTimeline
            ref={historyTimelineRef}
            hideOutlineAddButton
            initialRows={[] /* Figma 293:65594 — empty on first visit; user adds rounds via the panel */}
            onRoundsChange={handleRoundsChange}
            onActiveRoundChange={handleActiveRoundChange}
            roundDisplayOverrides={timelineOverrides}
          />
        </div>

        <div
          /* ไม่มีพื้นเทารองแล้ว (มติผู้ใช้ 28 ส.ค. 69) — การ์ดค่าแต่ละตัวมีขอบของ
             ตัวเองอยู่แล้ว พื้นเทาอีกชั้นเลยเป็นกล่องซ้อนกล่องที่ไม่ได้แบ่งอะไรเพิ่ม */
          className='flex-1 min-w-0 self-stretch flex flex-col gap-4'
          style={{ boxSizing: 'border-box' }}
        >
          <h3 className='text-base font-bold text-token-topicTertiaryTitle'>
            {measurementTitle}
          </h3>
          {/* React key — `activeRound.id` reseeds the cards when the user
              switches rounds or adds a fresh one so VitalCard's internal
              `useState(initial)` re-reads the current displayed values. */}
          <div
            key={activeRound.id}
            className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3'
          >
            <VitalCard
              label='อุณหภูมิ'
              unit='°C'
              required
              value={activeVitals.temp.value}
              onChange={(next) => updateActiveRoundVitals({ temp: next })}
              onValidityChange={(v) => setFieldValid('temp', v)}
              step={0.1}
              hint='ปกติ 36.1–37.2 °C'
              badge={activeVitals.temp.badge}
            />
            <VitalCard
              label='ชีพจร'
              unit='ครั้ง/นาที'
              required
              value={vitals.pulse.value}
              onValidityChange={(v) => setFieldValid('pulse', v)}
              hint='ปกติ 60–100 ครั้ง/นาที'
              badge={vitals.pulse.badge}
            />
            <PressureCard
              sys={activeVitals.pressure.sys}
              dia={activeVitals.pressure.dia}
              onChange={({ sys, dia }) => updateActiveRoundVitals({ pressureSys: sys, pressureDia: dia })}
              onValidityChange={(v) => setFieldValid('pressure', v)}
            />
            <VitalCard
              label='อัตราการหายใจ'
              unit='ครั้ง/นาที'
              required
              value={vitals.respiration.value}
              onValidityChange={(v) => setFieldValid('respiration', v)}
              hint='ปกติ 12–20 ครั้ง/นาที'
              badge={vitals.respiration.badge}
            />
            <VitalCard
              label='ออกซิเจนปลายนิ้ว'
              unit='%'
              required
              value={vitals.oxygen.value}
              onValidityChange={(v) => setFieldValid('oxygen', v)}
              hint='ปกติ ≥ 95%'
              badge={vitals.oxygen.badge}
            />
            <VitalCard
              label='ส่วนสูง'
              unit='ซม.'
              required
              value={activeVitals.height.value}
              onChange={(next) => updateActiveRoundVitals({ height: next })}
              onValidityChange={(v) => setFieldValid('height', v)}
              hint='ส่วนสูงผู้ป่วย'
            />
            <VitalCard
              label='น้ำหนัก'
              unit='กก.'
              required
              value={activeVitals.weight.value}
              onChange={(next) => updateActiveRoundVitals({ weight: next })}
              onValidityChange={(v) => setFieldValid('weight', v)}
              step={0.1}
              hint='น้ำหนักล่าสุด'
            />
            {ageBand === 'child' ? (
              <GrowthStatusCard
                sex={patientSex}
                ageYears={patientAgeYears}
                weight={activeVitals.weight.value}
                height={activeVitals.height.value}
                measuredLabel={measurementTitle}
              />
            ) : (
              <BMICard
                weight={activeVitals.weight.value}
                height={activeVitals.height.value}
                /* On a first visit BOTH weight & height are 0, so anthro
                   maths returns undefined (div-by-zero guard). Pass an
                   explicit `0` so the card mirrors the rest of the panel
                   instead of falling back to "—". BMICard's badge/marker
                   are suppressed at the source (bmi ≤ 0). */
                value={firstVisit ? '0' : undefined}
              />
            )}
            <VitalCard
              label='เส้นรอบเอว'
              unit='ซม.'
              required
              value={vitals.waist.value}
              onValidityChange={(v) => setFieldValid('waist', v)}
              hint='ปกติ ≤ 90 ซม. (ชาย)'
            />
          </div>

          {/* Figma 332:55917 — BrandDashedAddButton; disabled until `isFormValid`
             (same gate as footer "ถัดไป"). */}
          <div className='w-full'>
            <BrandDashedAddButton
              type='button'
              disabled={!isFormValid}
              onClick={() => historyTimelineRef.current?.openAddRound?.()}
            >
              เพิ่มรอบการวัด
            </BrandDashedAddButton>
          </div>
        </div>
      </div>

    </section>
  );
};

export default VitalsForm;
