import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import DatePicker from '@/components/forms/DatePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import RadioButton from '@/components/radio/RadioButton';
import Checkbox from '@/components/checkbox/Checkbox';
import { SNOMED_CONCEPTS } from '@/data/treatmentSnomed';
import { DEFAULT_ICD_SUGGESTIONS } from '@/data/treatmentVisits';
import { ICD9_PROCEDURES } from '@/pages/treat/panels/ProcedureOrderPanel';
import { Field, FieldGrid } from '@/components/forms/Fields';
import CarriedScreeningPanel from '@/components/screening/CarriedScreeningPanel';
import CarriedDentalPanel from '@/components/dental/CarriedDentalPanel';
import BodyDiagramPanel from '@/components/examination/BodyDiagramPanel';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import BrandIconButton from '@/components/button/BrandIconButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import Table from '@/components/table/Table';
import DragAndDrop from '@/components/form-builder/DragAndDrop';
import Popup from '@/components/popup/Popup';
import AddMedicationPopup from '@/components/popup/AddMedicationPopup';
import {
  MEDICATION_NAME_OPTIONS,
  medicationRegistryDefaults,
  resolveMedicationImage,
} from '@/data/medicationCatalog';
import { LineChart } from '@/components/graph/Charts';
import {
  SCREEN_9Q_QUESTIONS,
  SCREEN_9Q_FREQUENCY,
  SCREEN_9Q_MAX_SCORE,
  score9q,
  is9qComplete,
  has9qSuicidalRisk,
  interpret9q,
} from '@/data/homevisitAssessments';
import {
  ANC_GDM_ADVICE_MESSAGE,
  formatAncDate,
  calculateGestationalAge,
  formatGestationalAge,
  calculateEDC,
  calcBmi,
  evaluateWeightGain,
  buildAncWeightSeries,
  ANC_ILLNESS_CHECKLIST,
  ANC_ILLNESS_HISTORY_SUGGESTIONS,
  ANC_DELIVERY_TYPE_OPTIONS,
  ANC_DELIVERY_OUTCOME_OPTIONS,
  ANC_SPOUSE_SMOKING_OPTIONS,
  ANC_STRESS_QUESTIONS,
  ANC_STRESS_SCALE,
  interpretAncStressScore,
  ANC_MENTAL_HEALTH_QUESTIONS,
  ANC_SMOKING_STATUS,
  ANC_FAMILY_ILLNESS_HISTORY,
  ANC_HUSBAND_LAB_FIELDS,
  ANC_ORAL_HEALTH_QUESTIONS,
  interpretOralHealthScreen,
  getTetanusVaccinePlan,
  ANC_FIRST_VISIT_RISK_GROUPS,
  ANC_RISK_FACTORS,
  deriveFirstVisitRiskSuggestions,
  ANC_PERVISIT_RISK_FACTORS,
  interpretPerVisitRisk,
  deriveAncRiskSuggestions,
  ANC_GDM_SCREENING_FACTORS,
  evaluateGdmRisk,
  ANC_DANGER_SIGNS,
  ANC_RISK_LEVELS,
  resolveAncRiskLevel,
  ANC_URINE_SUGAR_OPTIONS,
  ANC_URINE_ALBUMIN_OPTIONS,
  ANC_FUNDUS_LEVEL_OPTIONS,
  ANC_PRESENTATION_OPTIONS,
  ANC_DESCENT_OPTIONS,
  ANC_FETAL_MOVEMENT_OPTIONS,
  ANC_NIPPLE_SIDE_OPTIONS,
  ANC_GUM_OPTIONS,
  ANC_BREAST_EXAM_OPTIONS,
  ANC_SPOUSE_HEALTH_OPTIONS,
  ANC_LAB1_ORDERS,
  ANC_LAB1_RESULT_FIELDS,
  ANC_LAB2_ORDERS,
  ANC_LAB2_RESULT_FIELDS,
  summarizeLabResults,
  summarizeLabRiskFindings,
  ANC_SECOND_TRIMESTER_SCREENING,
  ANC_DOWN_SCREENING_METHODS,
  ANC_ULTRASOUND_RESULT_FIELDS,
  ANC_DIABETES_SCREENING,
  ANC_VACCINES,
  ANC_SUPPLEMENTS,
  ANC_TERM_ASSESSMENT,
  ANC_DISPENSE_ITEMS,
  ANC_VACCINE_DOSES,
  ANC_ADVICE_TOPICS,
  getAncAdviceTopicsForGa,
  ANC_DELIVERY_MODE_OPTIONS,
  ANC_DIAGNOSIS_SUGGESTIONS,
  ANC_EXTERNAL_EXAM_SUGGESTIONS,
  ANC_ADVICE_SUGGESTIONS,
  ANC_CURRENT_PREGNANCY_SUGGESTIONS,
  ANC_RISK_SCREENING_SUGGESTIONS,
  getAncVisitTier,
  getNextAncAppointmentPlan,
  summarizeAncProcedures,
  getAncVisitHistoryByHn,
  saveAncVisitRecord,
  saveAncRegistration,
} from '@/data/ancVisits';

/* AncSteps — เนื้อในทั้ง 7 ขั้นของบันทึกการตรวจครรภ์ เสียบเข้ากับ
   `TreatmentFormShell` ที่ `AncFormPage` ถือไว้ (ลำดับขั้น · footer · ร่าง)
   ══════════════════════════════════════════════════════════════════════
   ที่มาของเนื้อหา สามชั้นซ้อนกัน:
     • TOR §1.10.7.1–.8 — ทะเบียนฝากครรภ์ · EMR/CPOE/Telemedicine ·
       การติดตามผลตรวจครรภ์และ Lab ตามช่วงเวลา
     • คู่มือการฝากครรภ์สำหรับบุคลากรสาธารณสุข (กรมอนามัย 2565) +
       คู่มือระบบงานฝากครรภ์ (HCIS เดิม) — แบบประเมิน เกณฑ์ และลำดับกิจกรรม
       ตามอายุครรภ์ ทั้งหมดอยู่ใน `ancVisits.js` ไฟล์นี้ไม่นิยาม catalog เอง
     • มติ คทง.2 ครั้งที่ 4 (24 ก.ย. 68) และ คทง.6 ครั้งที่ 3 (25 ก.ย. 68) —
       แบบคัดกรอง 27 ข้อเฉพาะครั้งแรก · GDM แจ้งเตือนอัตโนมัติ · Lab ครั้งแรก
       ติ๊กส่งตรวจ/ครั้งถัดไปสรุปผล · ทันตกรรม · จ่ายยา-วัคซีนเป็น checkbox ·
       คำแนะนำตามอายุครรภ์ · กราฟการเพิ่มขึ้นของน้ำหนัก

   ขั้นตอนข้ามได้อิสระ — การตรวจสอบทุกจุดในไฟล์นี้ "บอก" ไม่ "กั้น" */

/* ── ชิ้นส่วนที่ใช้ร่วมกันทุกขั้น ─────────────────────────────────── */

/* `small` — หัวข้อของหมวดรองที่ไม่ควรมีน้ำหนักเท่าหัวข้อหลักของขั้น
   `tone='neutral'` — สีดำ ใช้ในการ์ดที่หัวการ์ดเป็นสีเขียวอยู่แล้ว หัวข้อย่อย
   ข้างในจึงไม่ควรเขียวซ้ำกันทั้งใบ (มติผู้ใช้ 2 ก.ย. 69) */
const TopicHeader = ({ icon, children, trailing, small = false, tone = 'brand' }) => {
  const neutral = tone === 'neutral';
  return (
    <div className='flex items-center justify-between gap-2 w-full flex-wrap'>
      <div className='flex items-center gap-2 min-w-0'>
        {/* ไม่มีไอคอนนำหน้าหัวข้อแล้ว (มติผู้ใช้ 2 ก.ย. 69) — ข้อความหัวข้อ
            บอกได้ครบอยู่แล้ว ไอคอนซ้ำ ๆ ทุกหัวข้อเป็นเสียงรบกวน */}
        <h2
          className={`${small ? 'text-sm' : 'text-base'} font-bold ${neutral ? '' : 'text-brand-500'}`}
          style={neutral ? { color: 'var(--text-content-default, #363B3F)' } : undefined}
        >
          {children}
        </h2>
      </div>
      {trailing}
    </div>
  );
};

const StepCard = ({ children }) => (
  <section className='flex flex-col' style={{ gap: 'var(--dim-space-600)' }}>{children}</section>
);

/* จุดยึดของแท็บ capsule ด้านบน — ไม่มีกรอบการ์ด ใช้ระยะห่างอย่างเดียว
   เหมือนหมวดของหน้าจุดคัดกรอง `scrollMarginTop` กันไม่ให้หัวข้อไปอยู่ใต้
   การ์ดผู้ป่วยที่ sticky อยู่ตอนเลื่อนมาถึง */
const SectionAnchor = React.forwardRef(({ children }, ref) => (
  <div
    ref={ref}
    className='flex flex-col w-full'
    style={{ gap: 'var(--dim-space-300)', scrollMarginTop: 110 }}
  >
    {children}
  </div>
));
SectionAnchor.displayName = 'SectionAnchor';

/** เก็บ ref ของแต่ละหมวดไว้ให้ที่อื่นเลื่อนมาหาได้ — แถวแท็บ capsule ถูกถอด
    ออกจากทุกขั้นแล้ว (มติผู้ใช้ 2 ก.ย. 69) จึงเหลือแค่การผูก ref */
const useSectionJump = () => {
  const refs = useRef({});
  const bind = (key) => (el) => { refs.current[key] = el; };
  return { bind };
};

/* ป้ายสีเดียวกับที่ใช้ทั้งไฟล์ — คุมโทนของแบนเนอร์เตือน 3 ระดับไว้ที่เดียว */
const NoticeLine = ({ tone = 'info', icon = 'info', children }) => {
  const TONES = {
    info:    { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)' },
    warning: { bg: 'var(--surface-warning-quaternary, #FFF9F0)',      fg: 'var(--text-warning-default, #F46928)' },
    danger:  { bg: 'var(--surface-danger-quaternary, #FFF0F0)',       fg: 'var(--text-danger-default, #C72121)' },
  };
  const tint = TONES[tone] || TONES.info;
  return (
    <div
      className='flex items-start gap-2 w-full'
      style={{
        padding: 'var(--dim-space-300) var(--dim-space-400)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        background: tint.bg,
        color: tint.fg,
        fontSize: 'var(--type-size-sm)',
      }}
    >
      <Icon name={icon} size={18} />
      <span>{children}</span>
    </div>
  );
};

/** ช่องผลแล็บ — ค่าที่มีชุดตัวเลือกตายตัว (หมู่เลือด · Reactive/Non-reactive)
    เป็น dropdown ส่วนค่าตัวเลขต่อเนื่อง (Hb/HCT/MCV) เป็นช่องกรอก เพื่อไม่ให้
    ผลเดียวกันแตกเป็นหลายสะกดจนดูแนวโน้มไม่ได้ */
const LabResultField = ({ field, value, onChange }) => (
  field.options ? (
    <Select
      showLabel={false}
      searchable={false}
      size='lg'
      value={value || ''}
      onChange={onChange}
      options={field.options}
      placeholder={field.placeholder}
    />
  ) : (
    <InputField value={value || ''} onChange={onChange} placeholder={field.placeholder} />
  )
);

/* จำนวนครรภ์/คลอด/แท้ง/บุตรมีชีวิต เป็นจำนวนเต็มบวกค่าน้อยเสมอ — dropdown
   ปิดโอกาสพิมพ์ทศนิยมหรือค่าติดลบ */
const numberOptions = (max, min = 0) => Array.from({ length: max - min + 1 }, (_, i) => String(min + i));

/** แถว "ใช่/ไม่ใช่" ของแบบประเมิน — ใช้ทั้ง 2Q และ MOS */
const YesNoRow = ({ label, value, onYes, onNo }) => (
  <div className='flex items-center justify-between gap-4 w-full flex-wrap'>
    <span className='text-sm' style={{ color: 'var(--text-content-default, #363B3F)' }}>{label}</span>
    <div className='flex items-center gap-2 shrink-0'>
      <SelectableTag label='ใช่' size='md' selected={value === true} onClick={onYes} />
      <SelectableTag label='ไม่ใช่' size='md' selected={value === false} onClick={onNo} />
    </div>
  </div>
);

/* แบบประเมินในป๊อปอัปอ่านยากเมื่อคำถามอยู่ซ้ายสุดแล้วตัวเลือกไปกองขวาสุด
   (มติผู้ใช้ 2 ก.ย. 69) — จัดใหม่เป็น "คำถามหนึ่งบรรทัด ตัวเลือกอยู่ใต้คำถาม"
   คั่นแต่ละข้อด้วยพื้นสลับสี และใช้ radio/checkbox แทนชิปที่มีเครื่องหมาย +
   ซึ่งอ่านเหมือนปุ่ม "เพิ่ม" มากกว่าตัวเลือกของคำตอบ */
const QuestionRow = ({ index, label, zebra = false, children }) => (
  <div
    className='flex flex-col w-full'
    style={{
      gap: 'var(--dim-space-200, 8px)',
      padding: 'var(--dim-space-300, 12px)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      background: zebra ? 'var(--surface-neutral-quaternary, #F9FBFB)' : 'transparent',
    }}
  >
    <span style={{
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm)',
      color: 'var(--text-content-default, #363B3F)',
      lineHeight: 1.5,
    }}
    >
      {index != null ? `${index}. ` : ''}{label}
    </span>
    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      {children}
    </div>
  </div>
);

/** ตัวเลือกคำตอบแบบเลือกได้ค่าเดียว */
const ChoiceOptions = ({ name, options, value, onPick }) => (
  <>
    {options.map((o) => (
      <RadioButton
        key={String(o.value)}
        name={name}
        value={o.value}
        checked={value === o.value}
        onChange={() => onPick(o.value)}
        title={o.label}
      />
    ))}
  </>
);

/** รายการติ๊กหลายข้อ — สองคอลัมน์ อ่านไล่ลงได้ ไม่ใช่ชิปกองกัน */
const CheckList = ({ items, values, onToggle }) => (
  <FieldGrid cols={2}>
    {items.map((item) => (
      <Checkbox
        key={item.key}
        label={item.label}
        checked={!!values?.[item.key]}
        onChange={() => onToggle(item.key)}
      />
    ))}
  </FieldGrid>
);

/** ข้อเสนอจากค่าที่บันทึกไว้แล้ว — บอกเหตุผลของทุกข้อ และต้องกดรับเอง
    (ทั้งแบบ 27 ข้อ และภาวะเสี่ยงรายครั้งใช้กล่องเดียวกัน) */
const RiskSuggestionBox = ({ suggestions, onAccept, onAcceptAll }) => (
  <div
    className='flex flex-col gap-2 w-full'
    style={{
      padding: 'var(--dim-space-300) var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      background: 'var(--surface-alert-warning, #FFF9F0)',
    }}
  >
    <div className='flex items-center justify-between gap-3 flex-wrap'>
      <span
        className='flex items-center gap-2'
        style={{ color: 'var(--text-warning-default, #C2410C)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}
      >
        <Icon name='activity' size={18} />
        ระบบตรวจพบ {suggestions.length} ข้อจากข้อมูลที่บันทึกไว้แล้ว — ตรวจสอบก่อนรับเข้าแบบประเมิน
      </span>
      <BrandSubdueButton variant='fill' size='sm' leadingIcon='check' onClick={onAcceptAll}>
        เลือกทั้งหมด
      </BrandSubdueButton>
    </div>
    <div className='flex flex-col gap-1'>
      {suggestions.map((s) => (
        <button
          key={s.key}
          type='button'
          onClick={() => onAccept(s.key)}
          className='flex items-start gap-2 text-left w-full'
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: 'var(--text-content-default, #363B3F)', fontSize: 'var(--type-size-sm)',
          }}
        >
          <Icon name='plus' size={16} />
          <span>
            {s.label}
            <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}> — {s.reason}</span>
          </span>
        </button>
      ))}
    </div>
  </div>
);

/* ── กราฟการเพิ่มขึ้นของน้ำหนัก (มติ คทง.2) ────────────────────────
   เปิดจากปุ่ม "ประมวลผลกราฟน้ำหนัก" ในขั้นที่ 1 — เทียบน้ำหนักก่อนตั้งครรภ์
   กับน้ำหนักทุกครั้งที่มาตรวจ พร้อมแถบเกณฑ์ IOM 2009 ของกลุ่ม BMI นั้น
   และข้อความสรุปสามระดับ (น้ำหนักเพิ่มน้อย / เพิ่มดี / เพิ่มมาก) */
const WeightGainPopup = ({ open, onClose, history, form }) => {
  const { points, band, expectedAt } = useMemo(
    () => buildAncWeightSeries(history, form),
    [history, form],
  );
  const gaWeeks = calculateGestationalAge(form.lmp)?.weeks;
  const summary = useMemo(() => evaluateWeightGain({
    prePregnancyWeight: form.prePregnancyWeight,
    currentWeight: form.vitals?.weight,
    heightCm: form.vitals?.height,
    gaWeeks,
  }), [form.prePregnancyWeight, form.vitals?.weight, form.vitals?.height, gaWeeks]);

  const labels = points.map((p) => (p.gaWeeks != null ? `${p.gaWeeks} สัปดาห์` : p.label));
  const expected = points.map((p) => expectedAt(p.gaWeeks));
  const series = [
    {
      label: 'น้ำหนักที่ชั่งได้',
      color: 'var(--text-colorfulbadge-green, #007549)',
      values: points.map((p) => p.weight),
    },
  ];
  if (band && expected.every(Boolean)) {
    series.push(
      { label: 'เกณฑ์ต่ำสุด', color: 'var(--text-colorfulbadge-blue, #2580EA)', values: expected.map((e) => Math.round(e.min * 10) / 10) },
      { label: 'เกณฑ์สูงสุด', color: 'var(--text-colorfulbadge-orange, #F46928)', values: expected.map((e) => Math.round(e.max * 10) / 10) },
    );
  }

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='large'
      title='กราฟการเพิ่มขึ้นของน้ำหนักในหญิงตั้งครรภ์'
      subtitle={band ? `${band.label} · ควรเพิ่มตลอดครรภ์ ${band.totalGain[0]}–${band.totalGain[1]} กก.` : 'ระบุน้ำหนักก่อนตั้งครรภ์และส่วนสูงเพื่อคำนวณเกณฑ์'}
      primaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        {points.length < 2 ? (
          <NoticeLine tone='info' icon='info'>
            มีน้ำหนักที่บันทึกไว้เพียงจุดเดียว — ต้องมีอย่างน้อย 2 ครั้ง (รวมน้ำหนักก่อนตั้งครรภ์)
            จึงจะวาดเป็นเส้นแนวโน้มได้
          </NoticeLine>
        ) : (
          <LineChart months={labels} series={series} height={220} />
        )}
        {summary && (
          <div className='flex flex-col gap-2'>
            <div className='flex items-center gap-2 flex-wrap'>
              <ColorfulBadge style={summary.band?.badge || 'grey'} size='small' hierarchy='secondary' width='hug' maxWidth={520}>
                {`BMI ก่อนตั้งครรภ์ ${summary.bmi} — ${summary.band?.label || '—'}`}
              </ColorfulBadge>
              <ColorfulBadge style={summary.badge || 'grey'} size='small' hierarchy='secondary' width='hug' maxWidth={520}>
                {summary.label ? `${summary.label} — เพิ่มขึ้น ${summary.gained} กก.` : `น้ำหนักเพิ่ม ${summary.gained} กก.`}
              </ColorfulBadge>
            </div>
            <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-sm)', lineHeight: 1.5 }}>
              {summary.message || summary.band?.advice}
            </span>
          </div>
        )}
        <Table
          columns={[
            { key: 'label', label: 'ครั้งที่ชั่ง', flex: true, minWidth: 160 },
            { key: 'ga', label: 'อายุครรภ์', render: (r) => (r.gaWeeks != null ? `${r.gaWeeks} สัปดาห์` : '-') },
            { key: 'weight', label: 'น้ำหนัก (กก.)' },
            {
              key: 'expected',
              label: 'เกณฑ์ที่ควรเป็น (กก.)',
              flex: true,
              minWidth: 180,
              render: (r) => {
                const e = expectedAt(r.gaWeeks);
                return e ? `${Math.round(e.min * 10) / 10} – ${Math.round(e.max * 10) / 10}` : '-';
              },
            },
          ]}
          rows={points.map((p, i) => ({ ...p, id: `${p.label}-${i}` }))}
          rowKey={(r) => r.id}
          emptyMessage='ยังไม่มีน้ำหนักที่บันทึกไว้'
        />
      </div>
    </Popup>
  );
};

/* ── ขั้นที่ 1 — ประวัติการรักษา ────────────────────────────────────
   ทะเบียนฝากครรภ์ (TOR 1.10.7.6) + ตารางติดตามครั้งก่อนหน้า (TOR 1.10.7.8)
   + เอกสารแนบ (TOR 1.10.7.4) ลำดับการ์ดตามมติ คทง.2: กล่อง "การตั้งครรภ์
   ปัจจุบัน" มาก่อนส่วนประวัติสามี */

/* หมวดที่ค่าถูกดึงมาจากทะเบียนของครั้งก่อน — ใช้ตั้งชื่อในแบนเนอร์ ไม่ให้
   ขึ้นเป็นชื่อฟิลด์ดิบ */
const CARRIED_FIELD_SECTION = {
  illnessHistory: 'ประวัติเจ็บป่วยในอดีต', illnessChecklist: 'ประวัติเจ็บป่วยในอดีต',
  gravida: 'ประวัติสูติกรรม', para: 'ประวัติสูติกรรม', abortion: 'ประวัติสูติกรรม',
  livingChildren: 'ประวัติสูติกรรม', obstetricHistory: 'ประวัติสูติกรรม',
  lmp: 'การตั้งครรภ์ปัจจุบัน', contraceptionHistory: 'การตั้งครรภ์ปัจจุบัน',
  motherChildHealthBookGiven: 'การตั้งครรภ์ปัจจุบัน',
  breastExamNote: 'เต้านม/สามี', spouseHealthNote: 'เต้านม/สามี', spouseInfo: 'เต้านม/สามี',
  husbandLabResults: 'Lab สามี/คู่',
  tetanusDoseCount: 'วัคซีน dT', tetanusLastDoseYear: 'วัคซีน dT', tetanusExempt: 'วัคซีน dT',
  familyIllnessHistory: 'ประวัติครอบครัว', familyIllnessOtherNote: 'ประวัติครอบครัว',
  riskFactors: 'แบบคัดกรองความเสี่ยง',
  gdmScreeningFactors: 'คัดกรองเบาหวาน',
  labResults: 'ผลตรวจ Lab',
};

export const AncStep1History = ({
  form, setForm, cardPatient, ancHn, visitNo = 1, isFollowUp = false, carriedFields = [],
}) => {
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const toggleIn = (group, key) => setForm((f) => ({
    ...f, [group]: { ...f[group], [key]: !f[group]?.[key] },
  }));
  const setSpouse = (key) => (value) => setForm((f) => ({
    ...f, spouseInfo: { ...f.spouseInfo, [key]: value },
  }));

  const gestationalAge = useMemo(() => calculateGestationalAge(form.lmp), [form.lmp]);
  const edc = useMemo(() => calculateEDC(form.lmp), [form.lmp]);

  /* เข็มสุดท้ายของ dT เป็นปีที่ไม่ไกลนัก — 20 ปีย้อนหลังพอ ไม่ต้องเปิดช่องพิมพ์ */
  const tetanusYearOptions = useMemo(() => {
    const currentYearBE = new Date().getFullYear() + 543;
    return Array.from({ length: 20 }, (_, i) => String(currentYearBE - i));
  }, []);

  /* `ancHn` คือ HN ที่คิวส่งมา — ไม่ใช่ `cardPatient.hn` ซึ่งจะกลายเป็นคนไข้
     ตั้งต้นเมื่อ HN ไม่มีใน patientProfiles และจะพาประวัติของคนอื่นมาแสดง */
  const history = useMemo(() => getAncVisitHistoryByHn(ancHn), [ancHn]);
  const [weightOpen, setWeightOpen] = useState(false);

  const addObstetricRow = () => setForm((f) => ({
    ...f,
    obstetricHistory: [
      ...f.obstetricHistory,
      {
        id: `ob-${f.obstetricHistory.length + 1}-${Date.now()}`,
        year: '', deliveryType: '', gaAtDelivery: '', complication: '', outcome: '', birthWeight: '',
      },
    ],
  }));
  const updateObstetricRow = (id, key, value) => setForm((f) => ({
    ...f,
    obstetricHistory: f.obstetricHistory.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
  }));
  const removeObstetricRow = (id) => setForm((f) => ({
    ...f,
    obstetricHistory: f.obstetricHistory.filter((row) => row.id !== id),
  }));

  /* ขั้นนี้ไม่มีแถวแท็บ capsule แล้ว (มติผู้ใช้ 2 ก.ย. 69) — เหลือแต่จุดยึดของ
     แต่ละหมวดไว้ เผื่อที่อื่นเลื่อนมาหา และเพื่อให้ระยะห่างของการ์ดเท่าเดิม */
  const { bind } = useSectionJump();

  const carriedSections = useMemo(() => {
    const seen = [];
    carriedFields.forEach((key) => {
      const label = CARRIED_FIELD_SECTION[key];
      if (label && !seen.includes(label)) seen.push(label);
    });
    return seen;
  }, [carriedFields]);

  return (
    <StepCard>
      {/* ครั้งที่ 2 ขึ้นไปเปิดมาพร้อมทะเบียนฝากครรภ์ที่กรอกไว้แล้ว — บอกให้ชัด
          ว่าหมวดไหนเป็นค่าที่ยกมา (ยังแก้ได้ ตาม TOR 1.10.7.6 "แก้ไข")
          ไม่ใช่คำตอบที่เพิ่งซักวันนี้ */}
      {isFollowUp && carriedSections.length > 0 && (
        <NoticeLine tone='info' icon='history'>
          ตรวจครรภ์ครั้งที่ {visitNo} — ดึงข้อมูลทะเบียนฝากครรภ์จากครั้งก่อนหน้ามาให้แล้ว
          ({carriedSections.join(', ')}) ตรวจสอบและแก้ไขได้หากมีการเปลี่ยนแปลง
        </NoticeLine>
      )}

      {history.length > 0 && (
        <SectionAnchor ref={bind('trend')}>
          <TopicHeader
            icon='history'
            trailing={(
              <BrandSubdueButton
                variant='outline'
                size='sm'
                leadingIcon='monitoring'
                onClick={() => setWeightOpen(true)}
              >
                ประมวลผลกราฟน้ำหนัก
              </BrandSubdueButton>
            )}
          >
            ประวัติการฝากครรภ์ (ครั้งก่อนหน้า)
          </TopicHeader>
          {/* คอลัมน์ตามตารางบันทึกการตรวจครรภ์ของคู่มือเดิม (หน้า 2-10) บวก
              คอลัมน์ที่ TOR 1.10.7.8 เพิ่ม (น้ำหนัก · ความเสี่ยง · ผล Lab) */}
          <Table
            columns={[
              { key: 'visitNo', label: 'ครั้งที่', render: (r, i) => r.visitNo ?? (i + 1) },
              { key: 'date', label: 'วันที่' },
              { key: 'gestWeeks', label: 'อายุครรภ์', render: (r) => `${r.gestWeeks} สัปดาห์` },
              { key: 'fundusHeight', label: 'ยอดมดลูก' },
              { key: 'presentation', label: 'ส่วนนำ', render: (r) => r.presentation || '-' },
              { key: 'fetalHeartRate', label: 'FHR' },
              { key: 'bp', label: 'BP' },
              { key: 'weight', label: 'น้ำหนัก', render: (r) => `${r.weight} กก.` },
              { key: 'urineResult', label: 'ปัสสาวะ', render: (r) => r.urineResult || '-' },
              { key: 'riskLevel', label: 'ความเสี่ยง', render: (r) => resolveAncRiskLevel(r.riskLevel)?.label || '-' },
              { key: 'labSummary', label: 'ผล Lab', render: (r) => r.labSummary || '-' },
              { key: 'note', label: 'บันทึก', flex: true, minWidth: 200 },
            ]}
            rows={history}
            rowKey={(r) => `${r.visitNo ?? ''}-${r.date}-${r.gestWeeks}`}
            emptyMessage='ไม่มีประวัติการฝากครรภ์ครั้งก่อนหน้า'
          />
        </SectionAnchor>
      )}

      <SectionAnchor ref={bind('screening')}>
        <CarriedScreeningPanel patient={{ hn: ancHn }} />
      </SectionAnchor>

      {/* มติ คทง.2 — ประวัติเจ็บป่วยเป็น checkbox แทน free text และไม่มีช่อง
          "โรคประจำตัว" อีก (ซ้ำกับหมวดนี้ และอยู่บนการ์ดผู้ป่วยแล้ว) */}
      <SectionAnchor ref={bind('illness')}>
        <TopicHeader icon='file-text'>ประวัติการเจ็บป่วยในอดีต</TopicHeader>
        <div className='flex flex-wrap gap-2'>
          {ANC_ILLNESS_CHECKLIST.map((item) => (
            <SelectableTag
              key={item.key}
              label={item.label}
              size='lg'
              selected={!!form.illnessChecklist?.[item.key]}
              onClick={() => toggleIn('illnessChecklist', item.key)}
            />
          ))}
        </div>
        <SuggestibleTextarea
          voice
          value={form.illnessHistory}
          onChange={(e) => set('illnessHistory')(e.target.value)}
          suggestions={ANC_ILLNESS_HISTORY_SUGGESTIONS}
          minChars={3}
          placeholder='อื่นๆ (ระบุ) — เช่น เคยผ่าตัด แพ้ยา หรือโรคที่ไม่อยู่ในรายการ'
        />
      </SectionAnchor>

      <SectionAnchor ref={bind('obstetric')}>
        <TopicHeader icon='clipboard'>ประวัติทางสูติกรรม</TopicHeader>
        <FieldGrid cols={4}>
          <Field label='ครรภ์ที่ (Gravida)' required>
            <Select showLabel={false} searchable={false} size='lg' value={form.gravida} onChange={set('gravida')} options={numberOptions(10, 1)} placeholder='เลือกครรภ์ที่' />
          </Field>
          <Field label='คลอดแล้ว (Para)'>
            <Select showLabel={false} searchable={false} size='lg' value={form.para} onChange={set('para')} options={numberOptions(10)} placeholder='0' />
          </Field>
          <Field label='แท้ง (Abortion)'>
            <Select showLabel={false} searchable={false} size='lg' value={form.abortion} onChange={set('abortion')} options={numberOptions(10)} placeholder='0' />
          </Field>
          <Field label='บุตรมีชีวิต (Living)'>
            <Select showLabel={false} searchable={false} size='lg' value={form.livingChildren} onChange={set('livingChildren')} options={numberOptions(10)} placeholder='0' />
          </Field>
        </FieldGrid>

        {/* ตารางการตั้งครรภ์และการคลอดในอดีต — คอลัมน์ตามมติ คทง.2 */}
        {form.obstetricHistory.length > 0 && (
          <div className='flex flex-col gap-3'>
            {form.obstetricHistory.map((row, idx) => (
              <div key={row.id} className='flex items-end gap-3 w-full'>
                <div className='flex-1 min-w-0'>
                  <FieldGrid cols={6}>
                    <Field label={`ครรภ์ที่ ${idx + 1} — ปีที่คลอด (พ.ศ.)`}>
                      <InputField value={row.year} onChange={(v) => updateObstetricRow(row.id, 'year', v)} placeholder='2565' />
                    </Field>
                    <Field label='วิธีคลอด'>
                      <Select showLabel={false} searchable={false} size='lg' value={row.deliveryType} onChange={(v) => updateObstetricRow(row.id, 'deliveryType', v)} options={ANC_DELIVERY_TYPE_OPTIONS} placeholder='เลือกวิธีคลอด' />
                    </Field>
                    <Field label='อายุครรภ์เมื่อคลอด (สัปดาห์)'>
                      <InputField value={row.gaAtDelivery || ''} onChange={(v) => updateObstetricRow(row.id, 'gaAtDelivery', v)} type='number' placeholder='เช่น 38' />
                    </Field>
                    <Field label='ภาวะแทรกซ้อน'>
                      <InputField value={row.complication} onChange={(v) => updateObstetricRow(row.id, 'complication', v)} placeholder='ไม่มี' />
                    </Field>
                    <Field label='ผลการคลอด'>
                      <Select showLabel={false} searchable={false} size='lg' value={row.outcome} onChange={(v) => updateObstetricRow(row.id, 'outcome', v)} options={ANC_DELIVERY_OUTCOME_OPTIONS} placeholder='เลือกผลการคลอด' />
                    </Field>
                    <Field label='น้ำหนักแรกเกิด (กรัม)'>
                      <InputField value={row.birthWeight || ''} onChange={(v) => updateObstetricRow(row.id, 'birthWeight', v)} type='number' placeholder='เช่น 3000' />
                    </Field>
                  </FieldGrid>
                </div>
                <BrandIconButton icon='close' variant='ghost' size='sm' onClick={() => removeObstetricRow(row.id)} aria-label='ลบรายการ' />
              </div>
            ))}
          </div>
        )}
        <BrandDashedAddButton onClick={addObstetricRow}>เพิ่มประวัติการตั้งครรภ์ก่อนหน้า</BrandDashedAddButton>
      </SectionAnchor>

      {/* มติ คทง.2 — กล่องใหม่ วางไว้ก่อนส่วนประวัติสามี อ้างอิงหัวข้อใน
          สมุดฝากครรภ์สีชมพู: LMP · EDC · ประวัติคุมกำเนิด · วัคซีนบาดทะยัก
          (ตัววัคซีนอยู่การ์ดถัดไปเพราะมีเกณฑ์คำนวณของตัวเอง) */}
      <SectionAnchor ref={bind('currentPregnancy')}>
        <TopicHeader icon='activity'>การตั้งครรภ์ปัจจุบัน</TopicHeader>
        <FieldGrid cols={3}>
          <Field
            label='วันแรกของประจำเดือนครั้งสุดท้าย (LMP)'
            required
            hint={gestationalAge
              ? `อายุครรภ์ ${formatGestationalAge(gestationalAge)}`
              : 'ระบุ LMP เพื่อคำนวณอายุครรภ์และกำหนดคลอดอัตโนมัติ'}
          >
            <DatePicker
              value={form.lmp ? new Date(form.lmp) : null}
              onChange={(d) => setForm((f) => ({ ...f, lmp: d ? d.toISOString().slice(0, 10) : '' }))}
              placeholder='เลือกวันที่'
              showLabel={false}
              minDate={new Date(1900, 0, 1)}
            />
          </Field>
          {/* EDC คำนวณจาก LMP + 280 วัน (Naegele) — อ่านอย่างเดียว ไม่ให้พิมพ์ทับ
              เพราะเป็นค่าที่ต้องตรงกับ LMP เสมอ */}
          <Field label='กำหนดคลอด (EDC)' hint='คำนวณอัตโนมัติจาก LMP + 280 วัน'>
            <InputField value={edc ? formatAncDate(edc) : ''} onChange={() => {}} disabled placeholder='—' />
          </Field>
          <Field label='ประวัติการคุมกำเนิดก่อนตั้งครรภ์นี้'>
            <InputField
              value={form.contraceptionHistory}
              onChange={set('contraceptionHistory')}
              placeholder='เช่น ยาเม็ดคุมกำเนิด / ยาฉีด / ห่วงอนามัย / ไม่ได้คุมกำเนิด'
            />
          </Field>
        </FieldGrid>
        <SuggestibleTextarea
          voice
          value={form.currentPregnancyNote}
          onChange={(e) => set('currentPregnancyNote')(e.target.value)}
          suggestions={ANC_CURRENT_PREGNANCY_SUGGESTIONS}
          minChars={3}
          placeholder='อาการของการตั้งครรภ์ครั้งนี้ เช่น อาการแพ้ท้อง การเคลื่อนไหวของทารก อาการผิดปกติที่พบ'
        />
        <SelectableTag
          label='แจกสมุดบันทึกสุขภาพแม่และเด็กแล้ว'
          size='lg'
          selected={form.motherChildHealthBookGiven}
          onClick={() => setForm((f) => ({ ...f, motherChildHealthBookGiven: !f.motherChildHealthBookGiven }))}
        />
      </SectionAnchor>

      <SectionAnchor ref={bind('vaccine')}>
        <TopicHeader icon='clipboard'>ประวัติการฉีดวัคซีนป้องกันโรคคอตีบ บาดทะยัก (dT)</TopicHeader>
        <FieldGrid cols={3}>
          <Field label='ก่อนตั้งครรภ์นี้เคยได้รับมาแล้ว (ครั้ง)'>
            <Select showLabel={false} searchable={false} size='lg' value={form.tetanusDoseCount} onChange={set('tetanusDoseCount')} options={numberOptions(5)} placeholder='0' />
          </Field>
          <Field label='ครั้งสุดท้ายเมื่อปี พ.ศ.'>
            <Select showLabel={false} searchable={false} size='lg' value={form.tetanusLastDoseYear} onChange={set('tetanusLastDoseYear')} options={tetanusYearOptions} placeholder='เลือกปี พ.ศ.' />
          </Field>
          <Field label='ข้อยกเว้น'>
            <SelectableTag
              label='ไม่ต้องฉีดในครรภ์นี้ — เคยได้รับ dT ครบและไม่เกิน 10 ปี'
              size='lg'
              selected={form.tetanusExempt}
              onClick={() => setForm((f) => ({ ...f, tetanusExempt: !f.tetanusExempt }))}
            />
          </Field>
        </FieldGrid>
        {form.tetanusDoseCount !== '' && (() => {
          const currentYearBE = new Date().getFullYear() + 543;
          const lastYear = Number(form.tetanusLastDoseYear);
          const yearsAgo = form.tetanusLastDoseYear && Number.isFinite(lastYear) ? currentYearBE - lastYear : null;
          const plan = getTetanusVaccinePlan(form.tetanusDoseCount, yearsAgo);
          return (
            <ColorfulBadge style={plan.doseCount === 0 ? 'green' : 'yellow'} size='small' hierarchy='secondary' width='hug' maxWidth={640}>
              คำแนะนำวัคซีน dT: {plan.label}
            </ColorfulBadge>
          );
        })()}
      </SectionAnchor>

      <SectionAnchor ref={bind('familyIllness')}>
        <TopicHeader icon='users'>ประวัติการเจ็บป่วยของครอบครัว</TopicHeader>
        <div className='flex flex-wrap gap-2'>
          {ANC_FAMILY_ILLNESS_HISTORY.map((item) => (
            <SelectableTag
              key={item.key}
              label={item.label}
              size='lg'
              selected={!!form.familyIllnessHistory[item.key]}
              onClick={() => toggleIn('familyIllnessHistory', item.key)}
            />
          ))}
        </div>
        <SuggestibleTextarea
          voice
          value={form.familyIllnessOtherNote}
          onChange={(e) => set('familyIllnessOtherNote')(e.target.value)}
          placeholder='อื่นๆ (ระบุ)'
        />
      </SectionAnchor>

      {/* มติ คทง.2 — ประวัติสามี/คู่: ข้อมูลพื้นฐาน + โรคประจำตัว + หมู่เลือด/Rh
          + สถานะสูบบุหรี่ (ประเมินความเสี่ยงจากบุหรี่มือสอง) */}
      <SectionAnchor ref={bind('spouse')}>
        <TopicHeader icon='stethoscope'>ลักษณะเต้านมและข้อมูลสามี/คู่</TopicHeader>
        <FieldGrid cols={3}>
          <Field label='ลักษณะเต้านม'>
            <Select showLabel={false} searchable={false} size='lg' value={form.breastExamNote} onChange={set('breastExamNote')} options={ANC_BREAST_EXAM_OPTIONS} placeholder='เลือกลักษณะเต้านม' />
          </Field>
          <Field label='สุขภาพของสามี/คู่ โดยรวม'>
            <Select showLabel={false} searchable={false} size='lg' value={form.spouseHealthNote} onChange={set('spouseHealthNote')} options={ANC_SPOUSE_HEALTH_OPTIONS} placeholder='เลือกสุขภาพของสามี' />
          </Field>
          <Field label='สถานะการสูบบุหรี่ของสามี/คู่' hint='ใช้ประเมินความเสี่ยงจากบุหรี่มือสอง'>
            <Select showLabel={false} searchable={false} size='lg' value={form.spouseInfo?.smokingStatus} onChange={setSpouse('smokingStatus')} options={ANC_SPOUSE_SMOKING_OPTIONS} placeholder='เลือกสถานะ' />
          </Field>
        </FieldGrid>
        <FieldGrid cols={4}>
          <Field label='ชื่อ-นามสกุลสามี/คู่'>
            <InputField value={form.spouseInfo?.name || ''} onChange={setSpouse('name')} placeholder='ชื่อ-นามสกุล' />
          </Field>
          <Field label='วันเดือนปีเกิด' hint={(() => {
            const d = form.spouseInfo?.birthDate ? new Date(form.spouseInfo.birthDate) : null;
            if (!d || Number.isNaN(d.getTime())) return 'คำนวณอายุอัตโนมัติเมื่อระบุวันเกิด';
            const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000));
            return `อายุ ${age} ปี`;
          })()}>
            <DatePicker
              value={form.spouseInfo?.birthDate ? new Date(form.spouseInfo.birthDate) : null}
              onChange={(d) => setSpouse('birthDate')(d ? d.toISOString().slice(0, 10) : '')}
              placeholder='เลือกวันเกิด'
              showLabel={false}
              minDate={new Date(1900, 0, 1)}
            />
          </Field>
          <Field label='เลขบัตรประชาชน'>
            <InputField value={form.spouseInfo?.citizenId || ''} onChange={setSpouse('citizenId')} placeholder='13 หลัก' />
          </Field>
          <Field label='อาชีพ'>
            <InputField value={form.spouseInfo?.occupation || ''} onChange={setSpouse('occupation')} placeholder='อาชีพ' />
          </Field>
          <Field label='เบอร์โทรศัพท์'>
            <InputField value={form.spouseInfo?.phone || ''} onChange={setSpouse('phone')} placeholder='08X-XXX-XXXX' />
          </Field>
          <Field label='โรคประจำตัวของสามี/คู่'>
            <InputField value={form.spouseInfo?.illness || ''} onChange={setSpouse('illness')} placeholder='ไม่มี / ระบุ' />
          </Field>
          <Field label='หมู่เลือด (ABO)'>
            <Select showLabel={false} searchable={false} size='lg' value={form.spouseInfo?.bloodGroup} onChange={setSpouse('bloodGroup')} options={['A', 'B', 'AB', 'O']} placeholder='เลือกหมู่เลือด' />
          </Field>
          <Field label='Rh'>
            <Select showLabel={false} searchable={false} size='lg' value={form.spouseInfo?.rh} onChange={setSpouse('rh')} options={['Positive', 'Negative']} placeholder='เลือกผล Rh' />
          </Field>
        </FieldGrid>
      </SectionAnchor>

      <SectionAnchor ref={bind('husbandLab')}>
        <TopicHeader icon='biotech'>ผลตรวจทางห้องปฏิบัติการของสามี/คู่</TopicHeader>
        <FieldGrid cols={3}>
          {ANC_HUSBAND_LAB_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <LabResultField
                field={f}
                value={form.husbandLabResults[f.key]}
                onChange={(v) => setForm((prev) => ({ ...prev, husbandLabResults: { ...prev.husbandLabResults, [f.key]: v } }))}
              />
            </Field>
          ))}
        </FieldGrid>
      </SectionAnchor>

      <SectionAnchor ref={bind('documents')}>
        <TopicHeader icon='file'>อัปโหลดเอกสาร</TopicHeader>
        <DragAndDrop
          value={form.documents}
          onChange={(files) => setForm((f) => ({ ...f, documents: files }))}
          accept='.png,.jpg,.jpeg,.pdf'
        />
      </SectionAnchor>

      <WeightGainPopup open={weightOpen} onClose={() => setWeightOpen(false)} history={history} form={form} />
    </StepCard>
  );
};

/* ── ขั้น "แบบประเมิน" — ทรงเดียวกับแบบฟอร์มเยี่ยมบ้าน (มติผู้ใช้ 2 ก.ย. 69) ──
   ตารางรายชื่อแบบประเมิน + คะแนน + สถานะ แล้วกด "ทำแบบประเมิน" เพื่อเปิดป๊อปอัป
   ของชุดนั้น — เดิมกางทั้งเจ็ดชุดต่อกันในขั้นเดียว เลื่อนหาไม่เจอว่าเหลือชุดไหน
   ที่ยังไม่ได้ทำ · คอลัมน์คะแนน/สถานะทำหน้าที่ "แสดงผลการซักประวัติทันที"
   ตาม TOR 1.10.7.3 แทนแถวป้ายสรุปที่เคยลอยอยู่หัวขั้น */
export const AncStep2Screening = ({
  form, setForm, cardPatient, ancHn, visitNo = 1, isFollowUp = false, carriedFields = [],
}) => {
  const [openTool, setOpenTool] = useState(null);
  /* ทะเบียนฝากครรภ์เปิดเป็นป๊อปอัปจากแถวแรกของตาราง (มติผู้ใช้ 2 ก.ย. 69) —
     เป็นข้อมูลระดับการตั้งครรภ์ที่กรอกครั้งเดียวแล้วยกไปทุกครั้ง จึงไม่ควรกิน
     พื้นที่เป็นขั้นตอนของตัวเอง แต่ต้องเข้าถึงได้จากขั้นแรกเสมอ */
  const [registryOpen, setRegistryOpen] = useState(false);

  const setStress = (key, value) => setForm((f) => ({ ...f, stressAnswers: { ...f.stressAnswers, [key]: value } }));
  const setMental = (key, value) => setForm((f) => ({ ...f, mentalHealthAnswers: { ...f.mentalHealthAnswers, [key]: value } }));
  const set9Q = (key, value) => setForm((f) => {
    const answers = { ...(f.mentalHealth9Q?.answers || {}), [key]: value };
    return {
      ...f,
      mentalHealth9Q: {
        answers,
        total: score9q(answers),
        completedAt: is9qComplete(answers)
          ? new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
          }).format(new Date())
          : '',
      },
    };
  });
  const toggleIn = (group, key) => setForm((f) => ({ ...f, [group]: { ...f[group], [key]: !f[group]?.[key] } }));
  const acceptMany = (group, keys) => setForm((f) => {
    const next = { ...f[group] };
    keys.forEach((k) => { next[k] = true; });
    return { ...f, [group]: next };
  });

  const stressTotal = ANC_STRESS_QUESTIONS.reduce((sum, q) => sum + (Number(form.stressAnswers?.[q.key]) || 0), 0);
  const stressAnswered = Object.keys(form.stressAnswers || {}).length;
  const stressDone = stressAnswered === ANC_STRESS_QUESTIONS.length;
  const stressResult = interpretAncStressScore(stressTotal);

  const answeredMentalCount = Object.keys(form.mentalHealthAnswers || {}).length;
  const mentalDone = answeredMentalCount === ANC_MENTAL_HEALTH_QUESTIONS.length;
  const anyMentalYes = Object.values(form.mentalHealthAnswers || {}).some((v) => v === true);
  const nineQ = form.mentalHealth9Q || {};
  const nineQDone = is9qComplete(nineQ.answers || {});

  const perVisitRisk = interpretPerVisitRisk(form.perVisitRiskFactors);
  const flaggedRiskCount = Object.values(form.riskFactors || {}).filter(Boolean).length;
  const gdmFlagged = Object.values(form.gdmScreeningFactors || {}).filter(Boolean).length;
  const flaggedDangerCount = Object.values(form.dangerSigns || {}).filter(Boolean).length;

  const age = cardPatient?.age;
  const gdm = useMemo(() => evaluateGdmRisk(form, { age }), [form, age]);

  /* ข้อเสนอสองชุด — ของแบบ 27 ข้อ (ครั้งแรก) และของภาวะเสี่ยงรายครั้ง
     ทั้งคู่ต้องกดรับเอง ไม่ติ๊กให้ */
  const firstVisitSuggestions = useMemo(
    () => deriveFirstVisitRiskSuggestions(form, { age }).filter((s) => !form.riskFactors?.[s.key]),
    [form, age],
  );
  const perVisitSuggestions = useMemo(
    () => deriveAncRiskSuggestions(form).filter((s) => !form.perVisitRiskFactors?.[s.key]),
    [form],
  );

  const stressBadge = stressResult.level === 'none' ? 'green' : stressResult.level === 'suspect' ? 'yellow' : 'red';

  const registered = String(form.gravida ?? '').trim() !== '' && String(form.lmp ?? '').trim() !== '';

  const TOOLS = [
    {
      key: 'registry',
      title: 'ลงทะเบียนฝากครรภ์',
      code: 'ทะเบียนฝากครรภ์ · ประวัติสูติกรรม · สามี/คู่',
      done: registered,
      scoreLabel: registered
        ? `G${form.gravida} P${form.para || 0} A${form.abortion || 0}`
        : '—',
      interp: registered
        ? { badge: 'green', label: isFollowUp ? 'ลงทะเบียนแล้ว (ยกมาจากครั้งก่อน)' : 'ลงทะเบียนแล้ว' }
        : null,
      pendingLabel: 'ยังไม่ได้ลงทะเบียน',
      onOpen: () => setRegistryOpen(true),
    },
    {
      key: 'stress',
      title: 'ประเมินความเครียด',
      code: 'ST-5',
      done: stressDone,
      scoreLabel: stressAnswered ? `${stressTotal}/15` : '—',
      interp: stressDone ? { badge: stressBadge, label: stressResult.label } : null,
    },
    {
      key: 'mental',
      title: 'คัดกรองภาวะซึมเศร้า',
      code: nineQDone ? '2Q / 9Q' : '2Q',
      done: mentalDone && (!anyMentalYes || nineQDone),
      scoreLabel: nineQDone ? `9Q ${nineQ.total}/${SCREEN_9Q_MAX_SCORE}` : (mentalDone ? `2Q ${Object.values(form.mentalHealthAnswers).filter(Boolean).length}/2` : '—'),
      interp: nineQDone
        ? { badge: interpret9q(nineQ.total).badge, label: interpret9q(nineQ.total).label }
        : (mentalDone ? { badge: anyMentalYes ? 'red' : 'green', label: anyMentalYes ? '2Q ผลบวก — ต้องประเมิน 9Q ต่อ' : '2Q ผลลบ' } : null),
    },
    {
      key: 'risk',
      title: 'คัดกรองความเสี่ยงของหญิงตั้งครรภ์',
      code: `สมุดสีชมพู ${ANC_RISK_FACTORS.length} ข้อ`,
      done: flaggedRiskCount > 0 || isFollowUp,
      scoreLabel: `${flaggedRiskCount}/${ANC_RISK_FACTORS.length} ข้อ`,
      interp: flaggedRiskCount > 0
        ? { badge: 'yellow', label: `พบปัจจัยเสี่ยง ${flaggedRiskCount} ข้อ` }
        : (isFollowUp ? { badge: 'green', label: 'ไม่พบปัจจัยเสี่ยงจากครั้งแรก' } : null),
    },
    {
      key: 'perVisit',
      title: 'ภาวะเสี่ยงที่ประเมินทุกครั้งที่ตรวจครรภ์',
      code: `คู่มือ ข้อ 8–20 · ${ANC_PERVISIT_RISK_FACTORS.length} ข้อ`,
      done: perVisitRisk.flagged.length > 0,
      scoreLabel: `${perVisitRisk.flagged.length}/${ANC_PERVISIT_RISK_FACTORS.length} ข้อ`,
      interp: perVisitRisk.mustRefer
        ? { badge: 'red', label: `พบ ${perVisitRisk.flagged.length} ข้อ — ต้องส่งต่อหรือรายงานแพทย์` }
        : null,
    },
    {
      key: 'gdm',
      title: 'คัดกรองเบาหวานขณะตั้งครรภ์',
      code: 'GDM',
      done: gdmFlagged > 0,
      scoreLabel: `${gdmFlagged}/${ANC_GDM_SCREENING_FACTORS.length} ข้อ`,
      interp: gdm.highRisk ? { badge: 'yellow', label: ANC_GDM_ADVICE_MESSAGE } : null,
    },
    {
      key: 'danger',
      title: 'สัญญาณอันตราย',
      code: `คู่มือ หน้า 11–12 · ${ANC_DANGER_SIGNS.length} ข้อ`,
      done: flaggedDangerCount > 0,
      scoreLabel: `${flaggedDangerCount}/${ANC_DANGER_SIGNS.length} ข้อ`,
      interp: flaggedDangerCount > 0
        ? { badge: 'red', label: 'พบสัญญาณอันตราย — ส่งพบแพทย์ทันที' }
        : null,
    },
    {
      key: 'smoking',
      title: 'คัดกรองการสูบบุหรี่',
      code: 'Brief advice',
      done: !!form.smokingStatus,
      scoreLabel: form.smokingStatus
        ? (ANC_SMOKING_STATUS.find((o) => o.value === form.smokingStatus)?.label || '—')
        : '—',
      interp: form.smokingStatus
        ? { badge: form.smokingStatus === 'smoker' ? 'orange' : 'green', label: form.smokingStatus === 'smoker' ? 'สูบบุหรี่ — ให้คำแนะนำเลิกบุหรี่' : 'ไม่สูบบุหรี่' }
        : null,
    },
  ];

  const openTitle = TOOLS.find((t) => t.key === openTool)?.title || '';

  return (
    <StepCard>
      <TopicHeader icon='clipboard-list'>แบบประเมิน</TopicHeader>
      <Table
        columns={[
          {
            key: 'tool',
            label: 'หัวข้อแบบประเมิน',
            flex: true,
            minWidth: 260,
            render: (t) => (
              <span className='flex flex-col' style={{ gap: 'var(--dim-space-50, 2px)' }}>
                <span style={{ color: 'var(--text-content-default, #363B3F)' }}>{t.title}</span>
                <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  {t.code}
                </span>
              </span>
            ),
          },
          {
            key: 'score',
            label: 'คะแนนประเมิน',
            minWidth: 140,
            render: (t) => (
              <span style={{
                color: 'var(--text-brandPrimary-default, #007549)',
                fontFamily: 'var(--type-family-heading-content)',
              }}
              >
                {t.scoreLabel}
              </span>
            ),
          },
          {
            key: 'status',
            label: 'สถานะการประเมิน',
            minWidth: 220,
            render: (t) => (t.interp ? (
              <ColorfulBadge style={t.interp.badge} size='small' hierarchy='secondary' width='hug' maxWidth={260}>
                {t.interp.label}
              </ColorfulBadge>
            ) : (
              <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>
                {t.pendingLabel || 'ยังไม่ได้ประเมิน'}
              </ColorfulBadge>
            )),
          },
          {
            key: 'action',
            label: 'ดำเนินการ',
            minWidth: 180,
            render: (t) => (
              <BrandSubdueButton
                variant='outline'
                size='sm'
                leadingIcon={t.done ? 'edit' : 'assignment'}
                onClick={() => (t.onOpen ? t.onOpen() : setOpenTool(t.key))}
              >
                {t.done ? 'แก้ไข' : (t.key === 'registry' ? 'ลงทะเบียน' : 'ทำแบบประเมิน')}
              </BrandSubdueButton>
            ),
          },
        ]}
        rows={TOOLS}
        rowKey={(t) => t.key}
      />

      {/* บันทึกเพิ่มเติมของการคัดกรองอยู่นอกป๊อปอัป เพราะเป็นสรุปของทั้งขั้น
          ไม่ใช่ของแบบประเมินชุดใดชุดหนึ่ง */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='file-text' small>บันทึกเพิ่มเติม</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.riskScreeningNote}
          onChange={(e) => setForm((f) => ({ ...f, riskScreeningNote: e.target.value }))}
          suggestions={ANC_RISK_SCREENING_SUGGESTIONS}
          minChars={3}
          placeholder='รายละเอียดเพิ่มเติมจากการคัดกรองความเสี่ยง'
        />
      </div>

      <Popup
        open={registryOpen}
        onClose={() => setRegistryOpen(false)}
        size='extraLarge'
        title='ลงทะเบียนฝากครรภ์'
        subtitle='ข้อมูลระดับการตั้งครรภ์ — กรอกครั้งแรกแล้วยกไปให้การตรวจครั้งถัดไปอัตโนมัติ'
        primaryAction={{ label: 'เสร็จสิ้น', onClick: () => setRegistryOpen(false) }}
      >
        <div style={{ padding: 'var(--dim-space-600, 24px)' }}>
          <AncStep1History
            form={form}
            setForm={setForm}
            cardPatient={cardPatient}
            ancHn={ancHn}
            visitNo={visitNo}
            isFollowUp={isFollowUp}
            carriedFields={carriedFields}
          />
        </div>
      </Popup>

      <Popup
        open={!!openTool}
        onClose={() => setOpenTool(null)}
        size='extraLarge'
        title={openTitle}
        primaryAction={{ label: 'เสร็จสิ้น', onClick: () => setOpenTool(null) }}
      >
        <div
          className='flex flex-col w-full'
          style={{ gap: 'var(--dim-space-600, 24px)', padding: 'var(--dim-space-600, 24px)' }}
        >
          {openTool === 'stress' && (
            <>
              <div className='flex flex-col w-full'>
                {ANC_STRESS_QUESTIONS.map((q, idx) => (
                  <QuestionRow key={q.key} index={idx + 1} label={q.label} zebra={idx % 2 === 1}>
                    <ChoiceOptions
                      name={`st5-${q.key}`}
                      options={ANC_STRESS_SCALE}
                      value={form.stressAnswers[q.key]}
                      onPick={(v) => setStress(q.key, v)}
                    />
                  </QuestionRow>
                ))}
              </div>
              {stressDone && (
                <ColorfulBadge style={stressBadge} size='small' hierarchy='secondary' width='hug' maxWidth={640}>
                  {`คะแนนรวม ${stressTotal}/15 — ${stressResult.label}`}
                </ColorfulBadge>
              )}
            </>
          )}

          {openTool === 'mental' && (
            <>
              <div className='flex flex-col w-full'>
                {ANC_MENTAL_HEALTH_QUESTIONS.map((q, idx) => (
                  <QuestionRow key={q.key} index={idx + 1} label={q.label} zebra={idx % 2 === 1}>
                    <ChoiceOptions
                      name={`q2-${q.key}`}
                      options={[{ value: true, label: 'ใช่' }, { value: false, label: 'ไม่ใช่' }]}
                      value={form.mentalHealthAnswers[q.key]}
                      onPick={(v) => setMental(q.key, v)}
                    />
                  </QuestionRow>
                ))}
              </div>
              {anyMentalYes && (
                <>
                  <NoticeLine tone='warning' icon='activity'>
                    2Q ได้ผลบวก — ต้องประเมินต่อด้วยแบบประเมินโรคซึมเศร้า 9 คำถาม (9Q) ให้ครบ
                  </NoticeLine>
                  {/* 9Q อยู่ในป๊อปอัปเดียวกัน ทรงเดียวกับงานเยี่ยมบ้าน — ชุดคำถาม
                      มาจากคลังแบบประเมินเดียวกัน (`homevisitAssessments.js`) */}
                  <div className='flex flex-col gap-3'>
                    <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>
                      แบบประเมินโรคซึมเศร้า 9Q
                    </span>
                    {SCREEN_9Q_QUESTIONS.map((q, idx) => (
                      <QuestionRow key={q.key} index={idx + 1} label={q.label} zebra={idx % 2 === 1}>
                        <ChoiceOptions
                          name={`q9-${q.key}`}
                          options={SCREEN_9Q_FREQUENCY}
                          value={nineQ.answers?.[q.key]}
                          onPick={(v) => set9Q(q.key, v)}
                        />
                      </QuestionRow>
                    ))}
                    {nineQDone && (
                      <ColorfulBadge style={interpret9q(nineQ.total).badge} size='small' hierarchy='secondary' width='hug' maxWidth={640}>
                        {`9Q ${nineQ.total}/${SCREEN_9Q_MAX_SCORE} — ${interpret9q(nineQ.total).label}`}
                      </ColorfulBadge>
                    )}
                    {has9qSuicidalRisk(nineQ.answers || {}) && (
                      <NoticeLine tone='danger' icon='activity'>
                        ตอบข้อ 9 (ความคิดทำร้ายตนเอง) มากกว่า 0 — ส่งต่อคลินิกสุขภาพจิตทันที
                        ไม่ว่าคะแนนรวมจะเท่าใด
                      </NoticeLine>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {openTool === 'risk' && (
            isFollowUp ? (
              <FollowUpRiskSummary form={form} setForm={setForm} suggestions={firstVisitSuggestions} onAcceptAll={acceptMany} />
            ) : (
              <>
                {firstVisitSuggestions.length > 0 && (
                  <RiskSuggestionBox
                    suggestions={firstVisitSuggestions}
                    onAccept={(key) => toggleIn('riskFactors', key)}
                    onAcceptAll={() => acceptMany('riskFactors', firstVisitSuggestions.map((s) => s.key))}
                  />
                )}
                {ANC_FIRST_VISIT_RISK_GROUPS.map((group) => (
                  <div key={group.key} className='flex flex-col gap-2'>
                    <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)' }}>
                      {group.label}
                    </span>
                    <CheckList
                      items={group.items}
                      values={form.riskFactors}
                      onToggle={(key) => toggleIn('riskFactors', key)}
                    />
                  </div>
                ))}
              </>
            )
          )}

          {openTool === 'perVisit' && (
            <>
              {perVisitSuggestions.length > 0 && (
                <RiskSuggestionBox
                  suggestions={perVisitSuggestions}
                  onAccept={(key) => toggleIn('perVisitRiskFactors', key)}
                  onAcceptAll={() => acceptMany('perVisitRiskFactors', perVisitSuggestions.map((s) => s.key))}
                />
              )}
              <CheckList
                items={ANC_PERVISIT_RISK_FACTORS}
                values={form.perVisitRiskFactors}
                onToggle={(key) => toggleIn('perVisitRiskFactors', key)}
              />
              {perVisitRisk.mustRefer && (
                <NoticeLine tone='danger' icon='activity'>
                  พบภาวะเสี่ยง {perVisitRisk.flagged.length} ข้อ — ต้องส่งต่อหรือรายงานแพทย์
                  ({perVisitRisk.flagged.join(' · ')})
                </NoticeLine>
              )}
            </>
          )}

          {openTool === 'gdm' && (
            <>
              <CheckList
                items={ANC_GDM_SCREENING_FACTORS}
                values={form.gdmScreeningFactors}
                onToggle={(key) => toggleIn('gdmScreeningFactors', key)}
              />
              {gdm.highRisk && (
                <NoticeLine tone='warning' icon='activity'>
                  {gdm.message} — จากข้อมูลที่บันทึกไว้: {gdm.reasons.join(' · ')}
                </NoticeLine>
              )}
            </>
          )}

          {openTool === 'danger' && (
            <>
              <CheckList
                items={ANC_DANGER_SIGNS}
                values={form.dangerSigns}
                onToggle={(key) => toggleIn('dangerSigns', key)}
              />
              {flaggedDangerCount > 0 && (
                <NoticeLine tone='danger' icon='activity'>
                  พบสัญญาณอันตราย — ควรส่งพบแพทย์เพื่อประเมินและรักษาทันที
                </NoticeLine>
              )}
            </>
          )}

          {openTool === 'smoking' && (
            <>
              <QuestionRow label='สถานะการสูบบุหรี่ของหญิงตั้งครรภ์'>
                <ChoiceOptions
                  name='anc-smoking'
                  options={ANC_SMOKING_STATUS}
                  value={form.smokingStatus}
                  onPick={(v) => setForm((f) => ({ ...f, smokingStatus: v }))}
                />
              </QuestionRow>
              {form.smokingStatus === 'smoker' && (
                <QuestionRow label='การให้คำแนะนำ' zebra>
                  <Checkbox
                    label='ให้คำแนะนำเลิกบุหรี่แล้ว (Brief advice)'
                    checked={form.smokingAdviceGiven}
                    onChange={() => setForm((f) => ({ ...f, smokingAdviceGiven: !f.smokingAdviceGiven }))}
                  />
                </QuestionRow>
              )}
              {form.spouseInfo?.smokingStatus === 'smoker' && (
                <NoticeLine tone='warning' icon='info'>
                  สามี/คู่สูบบุหรี่ — ประเมินความเสี่ยงจากบุหรี่มือสองและให้คำแนะนำแก่ทั้งคู่
                </NoticeLine>
              )}
            </>
          )}
        </div>
      </Popup>
    </StepCard>
  );
};

/** ครั้งที่ 2 เป็นต้นไป — แบบ 27 ข้อไม่ต้องถามซ้ำ แสดงเป็นสรุปสิ่งที่ตรวจพบ
    ตอนฝากครรภ์ครั้งแรก พร้อมปุ่มเปิดแก้ไขเมื่อมีอะไรเปลี่ยน (ทะเบียนแก้ไขได้) */
const FollowUpRiskSummary = ({ form, setForm, suggestions, onAcceptAll }) => {
  const [editing, setEditing] = useState(false);
  const flagged = ANC_RISK_FACTORS.filter((rf) => form.riskFactors?.[rf.key]);

  if (editing) {
    return (
      <div className='flex flex-col gap-3'>
        {suggestions.length > 0 && (
          <RiskSuggestionBox
            suggestions={suggestions}
            onAccept={(key) => setForm((f) => ({ ...f, riskFactors: { ...f.riskFactors, [key]: !f.riskFactors?.[key] } }))}
            onAcceptAll={() => onAcceptAll('riskFactors', suggestions.map((s) => s.key))}
          />
        )}
        {ANC_FIRST_VISIT_RISK_GROUPS.map((group) => (
          <div key={group.key} className='flex flex-col gap-2'>
            <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)' }}>
              {group.label}
            </span>
            <div className='flex items-center gap-3 flex-wrap'>
              {group.items.map((rf) => (
                <SelectableTag
                  key={rf.key}
                  label={rf.label}
                  size='lg'
                  selected={!!form.riskFactors[rf.key]}
                  onClick={() => setForm((f) => ({ ...f, riskFactors: { ...f.riskFactors, [rf.key]: !f.riskFactors?.[rf.key] } }))}
                />
              ))}
            </div>
          </div>
        ))}
        <NeutralSubdueButton size='sm' leadingIcon='check' onClick={() => setEditing(false)}>
          เสร็จสิ้นการแก้ไข
        </NeutralSubdueButton>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-3'>
      <NoticeLine tone='info' icon='history'>
        แบบคัดกรอง 27 ข้อบันทึกไว้ตั้งแต่การฝากครรภ์ครั้งแรก — ครั้งนี้แสดงเป็นผลสรุป
        ความเสี่ยงที่ตรวจพบ กดแก้ไขได้หากมีข้อมูลเปลี่ยนแปลง
      </NoticeLine>
      {flagged.length > 0 ? (
        <div className='flex items-center gap-2 flex-wrap'>
          {flagged.map((rf) => (
            <ColorfulBadge key={rf.key} style='yellow' size='small' hierarchy='secondary' width='hug' maxWidth={520}>
              {rf.label}
            </ColorfulBadge>
          ))}
        </div>
      ) : (
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
          ไม่พบปัจจัยเสี่ยงจากแบบคัดกรองครั้งแรก
        </span>
      )}
      <NeutralSubdueButton size='sm' leadingIcon='edit' onClick={() => setEditing(true)}>
        แก้ไขแบบคัดกรอง 27 ข้อ
      </NeutralSubdueButton>
    </div>
  );
};

/* ── ขั้นที่ 3 — ตรวจร่างกาย ────────────────────────────────────────
   สัญญาณชีพ + BMI/น้ำหนักตามเกณฑ์ (มติ คทง.2) + บันทึกการตรวจครรภ์ของครั้งนี้
   (คู่มือเดิมหน้า 2-10/2-11) + ทันตกรรม (คทง.6 + คทง.2) + เต้านม/หัวนม */

export const AncStep3Examination = ({ form, setForm, ancHn, cardPatient }) => {
  const setVital = (key) => (value) => setForm((f) => ({ ...f, vitals: { ...f.vitals, [key]: value } }));
  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const { bind } = useSectionJump();

  const gaByLmp = useMemo(() => calculateGestationalAge(form.lmp), [form.lmp]);
  const tier = getAncVisitTier(gaByLmp?.weeks);

  /* เกิน Trace ขึ้นไปจึงนับเป็นผลบวกของภาวะเสี่ยงข้อ 10 — Trace อย่างเดียว
     ยังไม่ใช่สิ่งที่ต้องรายงานตามคู่มือ */
  const POSITIVE_DIPSTICK = ['1+', '2+', '3+', '4+'];
  const abnormalUrine = POSITIVE_DIPSTICK.includes(form.urineSugar)
    || POSITIVE_DIPSTICK.includes(form.urineAlbumin);

  /* ต่างกัน ±2 สัปดาห์เป็นความคลาดเคลื่อนปกติของการวัดยอดมดลูก — 3 สัปดาห์
     ขึ้นไปคือสิ่งที่ภาวะเสี่ยงข้อ 14 พูดถึง */
  const gaMismatch = useMemo(() => {
    const exam = Number(form.gaByExam);
    if (!gaByLmp || !form.gaByExam || !Number.isFinite(exam)) return 0;
    const diff = Math.abs(gaByLmp.weeks - exam);
    return diff >= 3 ? diff : 0;
  }, [gaByLmp, form.gaByExam]);

  const oralResult = interpretOralHealthScreen(form.oralHealthAnswers);
  const oralAnswered = Object.keys(form.oralHealthAnswers || {}).length === ANC_ORAL_HEALTH_QUESTIONS.length;
  return (
    <StepCard>
      {/* การ์ด "สัญญาณชีพและน้ำหนัก" ถูกลบออกจากขั้นนี้ (มติผู้ใช้ 2 ก.ย. 69) —
          ค่าที่วัดได้แสดงเป็นข้อความบนแถบใต้แถบขั้นตอนแล้ว ส่วนการแปลผล BMI/
          เกณฑ์การเพิ่มน้ำหนักยังอยู่ในกราฟน้ำหนักของหมวดประวัติการฝากครรภ์ */}
      {/* คู่มือเดิมหน้า 2-10 บันทึกน้ำตาลกับไข่ขาวเป็นสองช่องแยกกัน ไม่ใช่
          ปกติ/ผิดปกติช่องเดียว — ภาวะเสี่ยงข้อ 10 อ่านจากทั้งสองค่า */}
      <SectionAnchor ref={bind('urine')}>
        <TopicHeader icon='biotech' small tone='neutral'>ตรวจปัสสาวะ (Urine dipstick)</TopicHeader>
        <FieldGrid cols={3} rowGap='var(--dim-space-600, 24px)' columnGap='var(--dim-space-600, 24px)'>
          <Field label='น้ำตาล (Sugar)'>
            <Select showLabel={false} searchable={false} size='lg' value={form.urineSugar} onChange={setField('urineSugar')} options={ANC_URINE_SUGAR_OPTIONS} placeholder='เลือกผลตรวจน้ำตาล' />
          </Field>
          <Field label='ไข่ขาว (Albumin/Protein)'>
            <Select showLabel={false} searchable={false} size='lg' value={form.urineAlbumin} onChange={setField('urineAlbumin')} options={ANC_URINE_ALBUMIN_OPTIONS} placeholder='เลือกผลตรวจไข่ขาว' />
          </Field>
        </FieldGrid>
        {abnormalUrine && (
          <NoticeLine tone='danger' icon='activity'>
            พบน้ำตาลและ/หรือไข่ขาวในปัสสาวะ — เข้าเกณฑ์ภาวะเสี่ยงที่ต้องรายงานแพทย์ (ข้อ 10)
            และให้ประเมินการติดเชื้อทางเดินปัสสาวะ
          </NoticeLine>
        )}
      </SectionAnchor>

      <SectionAnchor ref={bind('abdomen')}>
        <FieldGrid cols={3} rowGap='var(--dim-space-600, 24px)' columnGap='var(--dim-space-600, 24px)'>
          <Field label='ระดับยอดมดลูก'>
            <Select showLabel={false} searchable={false} size='lg' value={form.fundusLevel} onChange={setField('fundusLevel')} options={ANC_FUNDUS_LEVEL_OPTIONS} placeholder='เลือกระดับมดลูก' />
          </Field>
          <Field label='ความสูงมดลูก (ซม.)'>
            <InputField value={form.fundusHeight} onChange={setField('fundusHeight')} type='number' placeholder='เช่น 20' />
          </Field>
          <Field label='ส่วนนำของทารก (Presentation)'>
            <Select showLabel={false} searchable={false} size='lg' value={form.presentation} onChange={setField('presentation')} options={ANC_PRESENTATION_OPTIONS} placeholder='เลือกส่วนนำ' />
          </Field>
          <Field label='การลง (Descent)'>
            <Select showLabel={false} searchable={false} size='lg' value={form.descent} onChange={setField('descent')} options={ANC_DESCENT_OPTIONS} placeholder='เลือกการลง' />
          </Field>
          <Field label='ท่าเด็ก'>
            <InputField value={form.fetalPosition} onChange={setField('fetalPosition')} placeholder='เช่น LOA / ROA' />
          </Field>
          <Field label='เสียงหัวใจทารก (FHR, ครั้ง/นาที)'>
            <InputField value={form.fetalHeartRate} onChange={setField('fetalHeartRate')} type='number' placeholder='เช่น 148' />
          </Field>
          <Field label='การดิ้นของทารก'>
            <Select showLabel={false} searchable={false} size='lg' value={form.fetalMovement} onChange={setField('fetalMovement')} options={ANC_FETAL_MOVEMENT_OPTIONS} placeholder='เลือกการดิ้นของทารก' />
          </Field>
        </FieldGrid>
      </SectionAnchor>

      {/* คู่มือเดิมวางอายุครรภ์สามทางไว้ข้างกันเพราะมันไม่ตรงกันเป็นปกติ และ
          ช่องว่างระหว่าง LMP กับการตรวจครรภ์คือภาวะเสี่ยงข้อ 14 เอง */}
      <SectionAnchor ref={bind('ga')}>
        <TopicHeader icon='clipboard' small tone='neutral'>อายุครรภ์ (เปรียบเทียบ 3 วิธี)</TopicHeader>
        <FieldGrid cols={3} rowGap='var(--dim-space-600, 24px)' columnGap='var(--dim-space-600, 24px)'>
          <Field label='จากการคำนวณ LMP (สัปดาห์)' hint={gaByLmp ? formatGestationalAge(gaByLmp) : "ระบุ LMP ที่ป๊อปอัป 'ลงทะเบียนฝากครรภ์' ในขั้นแบบประเมิน"}>
            <InputField value={gaByLmp ? String(gaByLmp.weeks) : ''} onChange={() => {}} disabled placeholder='—' />
          </Field>
          <Field label='จากการตรวจครรภ์ (สัปดาห์)'>
            <InputField value={form.gaByExam} onChange={setField('gaByExam')} type='number' placeholder='เช่น 20' />
          </Field>
          <Field label='จากการอัลตราซาวด์ (สัปดาห์)'>
            <InputField value={form.gaByUltrasoundWeeks} onChange={setField('gaByUltrasoundWeeks')} type='number' placeholder='เช่น 20' />
          </Field>
        </FieldGrid>
        {gaMismatch > 0 && (
          <NoticeLine tone='warning' icon='activity'>
            อายุครรภ์จากการตรวจครรภ์ต่างจาก LMP {gaMismatch} สัปดาห์ — พิจารณาภาวะเสี่ยงข้อ 14
            (ขนาดมดลูกไม่สัมพันธ์กับอายุครรภ์) ในขั้นแบบประเมิน
          </NoticeLine>
        )}
      </SectionAnchor>

      <SectionAnchor ref={bind('dental')}>
        {/* คำถามคัดกรองช่องปากเป็นดรอปดาวน์ อยู่แถวเดียวกันทั้งสองข้อ และใช้กริด
            3 คอลัมน์เท่ากับหมวดอื่นในการ์ด (มติผู้ใช้ 2 ก.ย. 69) — ขอบซ้ายของ
            ทุกกล่องในการ์ดจึงตรงกันเป็นแนวเดียว */}
        <FieldGrid cols={3} rowGap='var(--dim-space-600, 24px)' columnGap='var(--dim-space-600, 24px)'>
          {ANC_ORAL_HEALTH_QUESTIONS.map((q) => (
            <Field key={q.key} label={q.short || q.label}>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                value={form.oralHealthAnswers[q.key] === true ? 'yes' : form.oralHealthAnswers[q.key] === false ? 'no' : ''}
                onChange={(v) => setForm((f) => ({
                  ...f,
                  oralHealthAnswers: { ...f.oralHealthAnswers, [q.key]: v === 'yes' },
                }))}
                options={(q.options || []).map((o) => ({ value: o.value ? 'yes' : 'no', label: o.label }))}
                placeholder='เลือกคำตอบ'
              />
            </Field>
          ))}
        </FieldGrid>
        {oralAnswered && (
          <ColorfulBadge style={oralResult.highRisk ? 'red' : 'green'} size='small' hierarchy='secondary' width='hug' maxWidth={520}>
            {oralResult.highRisk ? `คะแนน ${oralResult.score} — ควรส่งพบทันตแพทย์` : 'ไม่พบความเสี่ยงด้านสุขภาพช่องปาก'}
          </ColorfulBadge>
        )}
        {/* มติ คทง.2 — บันทึกทันตกรรมของงานฝากครรภ์เอง (ผลตรวจฟัน/เหงือก)
            วางเป็นกล่องก่อนส่วนการดูแลและให้คำแนะนำ */}
        <FieldGrid cols={3} rowGap='var(--dim-space-600, 24px)' columnGap='var(--dim-space-600, 24px)'>
          <Field label='ฟันผุ (จำนวนซี่)'>
            <InputField value={form.dentalCariesCount} onChange={setField('dentalCariesCount')} type='number' placeholder='0' />
          </Field>
          <Field label='ผลการตรวจเหงือก'>
            <Select showLabel={false} searchable={false} size='lg' value={form.dentalGum} onChange={setField('dentalGum')} options={ANC_GUM_OPTIONS} placeholder='เลือกผลตรวจเหงือก' />
          </Field>
        </FieldGrid>
      </SectionAnchor>

      <SectionAnchor ref={bind('breast')}>
        <TopicHeader icon='stethoscope' small tone='neutral'>ตรวจเต้านมและหัวนม</TopicHeader>
        {/* แสดงแบบประเมินทันทีทุกอายุครรภ์ (มติผู้ใช้ 2 ก.ย. 69) — เดิมขึ้นเป็น
            ข้อความอธิบายจนกว่าจะถึงไตรมาส 3 ทำให้กรอกไม่ได้ทั้งที่ตรวจไปแล้ว
            มติ คทง.2 — บันทึกแยกซ้าย/ขวา ผลเป็น ปกติ · สั้น · บอด */}
        <FieldGrid cols={3} rowGap='var(--dim-space-600, 24px)' columnGap='var(--dim-space-600, 24px)'>
          <Field label='หัวนมข้างซ้าย'>
            <Select showLabel={false} searchable={false} size='lg' value={form.nippleLeft} onChange={setField('nippleLeft')} options={ANC_NIPPLE_SIDE_OPTIONS} placeholder='เลือกผลตรวจ' />
          </Field>
          <Field label='หัวนมข้างขวา'>
            <Select showLabel={false} searchable={false} size='lg' value={form.nippleRight} onChange={setField('nippleRight')} options={ANC_NIPPLE_SIDE_OPTIONS} placeholder='เลือกผลตรวจ' />
          </Field>
        </FieldGrid>
        {(form.nippleLeft === 'inverted' || form.nippleRight === 'inverted'
          || form.nippleLeft === 'short' || form.nippleRight === 'short') && (
          <NoticeLine tone='warning' icon='info'>
            พบหัวนมสั้นหรือบอด — ให้คำแนะนำการเตรียมหัวนมก่อนคลอด และติดตามซ้ำในการตรวจครั้งถัดไป
          </NoticeLine>
        )}
      </SectionAnchor>


      {/* คัดกรองไตรมาส 2 และ Ultrasound — เป็นดรอปดาวน์อยู่แถวเดียวกัน
          (มติผู้ใช้ 2 ก.ย. 69) สองช่องแรกขึ้นเฉพาะช่วง 12–19 สัปดาห์ตามแผนภูมิ
          ฝากครรภ์คุณภาพ ส่วนช่อง Ultrasound ของครรภ์นี้แสดงทุกช่วง */}
      <SectionAnchor ref={bind('screeningUltrasound')}>
        <TopicHeader icon='biotech' small tone='neutral'>การคัดกรองและการตรวจ Ultrasound</TopicHeader>
        <FieldGrid cols={3} rowGap='var(--dim-space-600, 24px)' columnGap='var(--dim-space-600, 24px)'>
          {tier === 'secondTrimesterScreening' && ANC_SECOND_TRIMESTER_SCREENING.map((item) => (
            <Field key={item.key} label={item.th}>
              <Select
                showLabel={false} searchable={false} size='lg'
                value={form.secondTrimesterScreening?.[item.key] ? 'done' : ''}
                onChange={(v) => setForm((f) => ({
                  ...f,
                  secondTrimesterScreening: { ...f.secondTrimesterScreening, [item.key]: v === 'done' },
                }))}
                options={[{ value: 'done', label: 'ตรวจแล้ว' }, { value: 'pending', label: 'ยังไม่ได้ตรวจ' }]}
                placeholder='เลือกสถานะ'
              />
            </Field>
          ))}
        </FieldGrid>

        {/* มติ คทง.2 — รองรับผลคัดกรองดาวน์ทั้ง Quadruple test และ NIPT */}
        {tier === 'secondTrimesterScreening' && form.secondTrimesterScreening?.downSyndrome2 && (
          <FieldGrid cols={3} rowGap='var(--dim-space-600, 24px)' columnGap='var(--dim-space-600, 24px)'>
            <Field label='วิธีคัดกรองกลุ่มอาการดาวน์'>
              <Select
                showLabel={false} searchable={false} size='lg'
                value={form.downScreeningMethod}
                onChange={setField('downScreeningMethod')}
                options={ANC_DOWN_SCREENING_METHODS}
                placeholder='เลือกวิธีตรวจ'
              />
            </Field>
          </FieldGrid>
        )}

        {/* มติ คทง.2 — บันทึกอายุครรภ์ ณ วันที่ตรวจด้วย (ศูนย์ฯ ทำก่อน 12 สัปดาห์ได้ยาก) */}
        {form.ultrasoundDone && (
          <>
            <FieldGrid cols={3} rowGap='var(--dim-space-600, 24px)' columnGap='var(--dim-space-600, 24px)'>
              <Field label='วันที่ตรวจ'>
                <DatePicker
                  value={form.ultrasoundDate ? new Date(form.ultrasoundDate) : null}
                  onChange={(d) => setField('ultrasoundDate')(d ? d.toISOString().slice(0, 10) : '')}
                  placeholder='เลือกวันที่'
                  showLabel={false}
                  minDate={new Date(1900, 0, 1)}
                />
              </Field>
              <Field label='อายุครรภ์ ณ วันที่ตรวจ (สัปดาห์)'>
                <InputField value={form.ultrasoundGaWeeks} onChange={setField('ultrasoundGaWeeks')} type='number' placeholder='เช่น 20' />
              </Field>
            </FieldGrid>
            <FieldGrid cols={3} rowGap='var(--dim-space-600, 24px)' columnGap='var(--dim-space-600, 24px)'>
              {ANC_ULTRASOUND_RESULT_FIELDS.map((f) => (
                <Field key={f.key} label={f.label}>
                  <InputField
                    value={form.ultrasoundResults?.[f.key] || ''}
                    onChange={(v) => setForm((prev) => ({
                      ...prev,
                      ultrasoundResults: { ...prev.ultrasoundResults, [f.key]: v },
                    }))}
                    placeholder={f.placeholder}
                  />
                </Field>
              ))}
            </FieldGrid>
          </>
        )}
      </SectionAnchor>

      {/* วาดและมาร์คจุดบนรูปร่างกาย (มติผู้ใช้ 2 ก.ย. 69) — ใช้แผงเดียวกับ CPOE
          OPD ไม่สร้างกลไกใหม่ · ปุ่ม "บันทึกบนรูปภาพ" เปิด BodyRecordPopup
          ให้วาด/มาร์ค แล้วเก็บแยกตามระบบที่ตรวจ */}
      <SectionAnchor ref={bind('bodyDiagram')}>
        <TopicHeader icon='activity' small tone='neutral'>บันทึกบนรูปร่างกาย</TopicHeader>
        {/* กล่องของตัวเอง + ย่อรูปให้พอดีหน้าจอเดียว (มติผู้ใช้ 2 ก.ย. 69) —
            ความสูงของแผงเป็นค่าคงที่ในคอมโพเนนต์กลาง (ใช้ร่วมกับ CPOE OPD)
            จึงย่อด้วย `zoom` ที่กล่องนี้แทนการไปแก้ค่ากลาง ซึ่งจะกระทบหน้าอื่น
            `zoom` (ไม่ใช่ `transform: scale`) เพราะมันย่อ layout จริง พิกัดที่
            แคนวาสอ่านจาก getBoundingClientRect จึงยังตรงกับตำแหน่งที่คลิก */}
        <div
          className='w-full min-w-0'
          style={{
            padding: 'var(--dim-space-400, 16px)',
            borderRadius: 'var(--dim-radius-400, 12px)',
            border: 'var(--dim-stroke-100) solid var(--border-neutral-tertiary, #F4F5F5)',
            background: 'var(--surface-card-100, #FFFFFF)',
            zoom: 0.7,
          }}
        >
        <BodyDiagramPanel
          /* รูปร่างกายของงานฝากครรภ์ — หญิงตั้งครรภ์ (มติผู้ใช้ 2 ก.ย. 69)
             ไฟล์อยู่ใน public/illustration/ คู่กับรูปชุดเดิมของระบบ */
          frontSrc='/illustration/body-anatomy-anc-front.png'
          backSrc='/illustration/body-anatomy-anc-back.png'
          systemKey={form.examSystem}
          viewKey={form.examView}
          markers={(form.bodyMarkers && form.bodyMarkers[form.examSystem]) || []}
          onMarkersChange={(next) => setForm((f) => ({
            ...f,
            bodyMarkers: { ...(f.bodyMarkers || {}), [f.examSystem]: next },
          }))}
          drawings={(form.bodyDrawings && form.bodyDrawings[form.examSystem]) || []}
          onDrawingsChange={(next) => setForm((f) => ({
            ...f,
            bodyDrawings: { ...(f.bodyDrawings || {}), [f.examSystem]: next },
          }))}
          onSystemChange={setField('examSystem')}
          onViewChange={setField('examView')}
        />
        </div>
      </SectionAnchor>

      {/* แนบรูปภาพประกอบการตรวจ (มติผู้ใช้ 2 ก.ย. 69) — เช่น ภาพผิวหนัง/บวม
          หรือภาพผลตรวจที่ผู้รับบริการถ่ายมา เก็บไว้กับวิสิตนี้ */}
      <SectionAnchor ref={bind('photos')}>
        <TopicHeader icon='image' small tone='neutral'>ภาพประกอบการตรวจ</TopicHeader>
        <DragAndDrop
          size='sm'
          value={form.examPhotos}
          onChange={(files) => setForm((f) => ({ ...f, examPhotos: files }))}
          accept='.png,.jpg,.jpeg'
        />
      </SectionAnchor>

    </StepCard>
  );
};

/* ── ขั้นที่ 4 — วินิจฉัย ───────────────────────────────────────────
   ระดับความเสี่ยงเป็นตัวขับเส้นทางนัดหมายในขั้นที่ 6 + คำแนะนำที่ระบบเลือก
   หัวข้อตามอายุครรภ์ให้ (มติ คทง.2) */
export const AncStep4Diagnosis = ({ form, setForm }) => {
  /* ตัวช่วยค้นหารหัสวินิจฉัย (มติผู้ใช้ 3 ก.ย. 69) — กดปุ่มแล้วกางแถวค้นหาใต้หัวข้อ:
     ดรอปดาวน์เลือกระบบรหัส (ICD-9 · ICD-10 · SNOMED CT) อยู่หน้ากล่องค้นหา
     เลือกรายการแล้วต่อท้าย "รหัส ชื่อโรค" ลงในช่องบันทึก แถวยังเปิดค้างให้ค้นตัวถัดไป */
  const [icdOpen, setIcdOpen] = useState(false);
  const [codeSystem, setCodeSystem] = useState('icd10');
  const [codeQuery, setCodeQuery] = useState('');
  const codeOptions = useMemo(() => {
    if (codeSystem === 'icd9') return ICD9_PROCEDURES.map((p) => ({ value: p.code, label: `${p.code} · ${p.nameTh}`, badge: { style: 'orange', label: 'ICD-9' } }));
    if (codeSystem === 'snomed') return SNOMED_CONCEPTS.map((c) => ({ value: c.code, label: `${c.code} · ${c.termTh} (${c.term})`, badge: { style: 'purple', label: 'SNOMED' } }));
    return DEFAULT_ICD_SUGGESTIONS.map((d) => ({ value: d.code, label: `${d.code} · ${d.name}`, badge: { style: 'blue', label: 'ICD-10' } }));
  }, [codeSystem]);
  /* บรรทัดในช่องบันทึก = "รหัส ชื่อโรค" — ใช้เช็คว่ารหัสนี้ถูกเพิ่มแล้วหรือยัง */
  const codeLine = (value) => (codeOptions.find((o) => o.value === value)?.label || '').replace(' · ', ' ');
  const hasCode = (value) => (form.diagnosisNote || '').split('\n').some((l) => l.trim() === codeLine(value));
  const appendCode = (value) => {
    const line = codeLine(value);
    if (!line || hasCode(value)) return;
    setForm((f) => ({ ...f, diagnosisNote: f.diagnosisNote?.trim() ? `${f.diagnosisNote.trim()}\n${line}` : line }));
    setCodeQuery('');
  };
  const removeCode = (value) => {
    const line = codeLine(value);
    setForm((f) => ({ ...f, diagnosisNote: (f.diagnosisNote || '').split('\n').filter((l) => l.trim() !== line).join('\n') }));
  };
  const gestationalAge = calculateGestationalAge(form.lmp);
  const weeks = gestationalAge?.weeks;
  const tier = getAncVisitTier(weeks);
  /* ยืนยัน GDM ได้ก็ต่อเมื่อถึงช่วงที่มีผล GCT/OGTT แล้ว */
  const showGdmToggle = tier === 'diabetesScreening' || tier === 'lab2AndVaccines';
  /* แสดงเฉพาะหัวข้อของช่วงอายุครรภ์นี้ — ปุ่มดูหัวข้อช่วงอื่นถูกตัดออก
     (มติผู้ใช้ 2 ก.ย. 69) */
  const suggestedTopics = useMemo(() => getAncAdviceTopicsForGa(weeks), [weeks]);
  const toggleTopic = (key) => setForm((f) => ({ ...f, adviceTopics: { ...f.adviceTopics, [key]: !f.adviceTopics?.[key] } }));

  return (
    <StepCard>
      {/* ระดับความเสี่ยงเป็นดรอปดาวน์ และไม่มีหัวข้อซ้ำเหนือช่อง (มติผู้ใช้ 2 ก.ย. 69)
          — ป้ายของช่องบอกอยู่แล้วว่าเลือกอะไร ค่านี้เป็นตัวขับเส้นทางนัดหมาย */}
      <div className='flex flex-col gap-3'>
        <FieldGrid cols={2}>
          <Field label='ผลประเมินความเสี่ยง' required>
            <Select
              showLabel={false}
              searchable={false}
              size='lg'
              value={form.riskLevel}
              onChange={(v) => setForm((f) => ({ ...f, riskLevel: v }))}
              options={ANC_RISK_LEVELS.map((lvl) => ({ value: lvl.value, label: `${lvl.label} (${lvl.en})` }))}
              placeholder='เลือกระดับความเสี่ยง'
            />
          </Field>
        </FieldGrid>
        {showGdmToggle && (
          <Checkbox
            label='ยืนยันเบาหวานขณะตั้งครรภ์ (GDM) จากผล OGTT'
            checked={!!form.gdmConfirmed}
            onChange={() => setForm((f) => ({ ...f, gdmConfirmed: !f.gdmConfirmed }))}
          />
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <div className='min-w-0 flex-1'>
            <TopicHeader icon='file-text' small tone='neutral'>บันทึกวินิจฉัย</TopicHeader>
          </div>
          <BrandSubdueButton variant='outline' size='sm' leadingIcon='search' onClick={() => setIcdOpen((v) => !v)}>
            ค้นหารหัสวินิจฉัย
          </BrandSubdueButton>
        </div>
        {icdOpen && (
          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <div style={{ flex: '0 0 170px' }}>
              <Select
                showLabel={false} searchable={false} size='lg'
                value={codeSystem}
                onChange={setCodeSystem}
                options={[
                  { value: 'icd10', label: 'ICD-10' },
                  { value: 'icd9', label: 'ICD-9' },
                  { value: 'snomed', label: 'SNOMED CT' },
                ]}
              />
            </div>
            <div className='min-w-0 flex-1'>
              {/* ทรงเดียวกับช่องค้นหายาในขั้นสั่งการรักษา: พิมพ์ค้นได้ + ปุ่ม เลือก/เพิ่มแล้ว
                  ท้ายแต่ละแถว กดสลับเพิ่ม-เอาออกจากช่องบันทึกโดยไม่ปิดลิสต์ (มติผู้ใช้ 3 ก.ย. 69) */}
              <Select
                showLabel={false} searchable size='lg'
                value={codeQuery}
                onChange={appendCode}
                options={codeOptions}
                optionAction={{
                  label: 'เลือก',
                  activeLabel: 'เพิ่มแล้ว',
                  isActive: hasCode,
                  onToggle: (val) => (hasCode(val) ? removeCode(val) : appendCode(val)),
                }}
                placeholder='พิมพ์รหัสหรือชื่อโรคเพื่อค้นหา'
              />
            </div>
          </div>
        )}
        <SuggestibleTextarea
          voice
          value={form.diagnosisNote}
          onChange={(e) => setForm((f) => ({ ...f, diagnosisNote: e.target.value }))}
          suggestions={ANC_DIAGNOSIS_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น ครรภ์แรก อายุครรภ์ 8 สัปดาห์ ไม่พบภาวะเสี่ยง'
        />
      </div>

      {/* TOR 1.10.7.7 — ผลการตรวจครรภ์จากภายนอกที่ผู้รับบริการนำมาแสดง
          พร้อมแนบหลักฐาน */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='biotech' small tone='neutral'>ผลการตรวจครรภ์จากภายนอก</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.externalExamResults}
          onChange={(e) => setForm((f) => ({ ...f, externalExamResults: e.target.value }))}
          suggestions={ANC_EXTERNAL_EXAM_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น ผล Ultrasound / Lab จากสถานพยาบาลอื่นที่ผู้รับบริการนำมาแสดง'
        />
        <DragAndDrop
          size='sm'
          value={form.externalExamAttachments}
          onChange={(files) => setForm((f) => ({ ...f, externalExamAttachments: files }))}
          accept='.png,.jpg,.jpeg,.pdf'
        />
      </div>

      {/* มติ คทง.2 — คำแนะนำเป็น checkbox list ที่ระบบเลือกหัวข้อตามอายุครรภ์
          ของการมาตรวจครั้งนั้นให้อัตโนมัติ ส่วนหัวข้อนอกช่วงยังเปิดดูและติ๊กได้ */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard' small tone='neutral'>การดูแลและให้คำแนะนำ</TopicHeader>
        <div className='flex flex-col gap-2'>
          {suggestedTopics.map((t) => (
            <Checkbox
              key={t.key}
              label={t.label}
              checked={!!form.adviceTopics?.[t.key]}
              onChange={() => toggleTopic(t.key)}
            />
          ))}
        </div>
        <SuggestibleTextarea
          voice
          value={form.adviceNote}
          onChange={(e) => setForm((f) => ({ ...f, adviceNote: e.target.value }))}
          suggestions={ANC_ADVICE_SUGGESTIONS}
          minChars={3}
          placeholder='รายละเอียดคำแนะนำเพิ่มเติมที่ให้ในครั้งนี้'
        />
      </div>

      {/* แผนการคลอดคุยกันเมื่อใกล้กำหนด (คู่มือหน้า 59-60) */}
      {(weeks ?? 0) >= 28 && (
        <div className='flex flex-col gap-3'>
          {/* ดรอปดาวน์แทนชิป (มติผู้ใช้ 3 ก.ย. 69) */}
          <FieldGrid cols={2}>
            <Field label='แผนการคลอด'>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                value={form.plannedDeliveryMode}
                onChange={(v) => setForm((f) => ({ ...f, plannedDeliveryMode: v }))}
                options={ANC_DELIVERY_MODE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                placeholder='เลือกแผนการคลอด'
              />
            </Field>
          </FieldGrid>
        </div>
      )}
    </StepCard>
  );
};

/* ── ตรวจร่างกาย + วินิจฉัย อยู่หน้าเดียวกัน แบ่งซ้าย-ขวา ─────────────
   (มติผู้ใช้ 2 ก.ย. 69 · ทรงเดียวกับขั้นวินิจฉัยของ CPOE OPD) — ซ้ายคือสิ่งที่
   ตรวจเจอวันนี้ ขวาคือข้อสรุปจากสิ่งนั้น อ่านคู่กันได้โดยไม่ต้องเลื่อนหน้ากลับไปมา
   ต่ำกว่า xl กลับไปเรียงบนล่าง และเส้นคั่นกลางเปิดเฉพาะ xl ขึ้นไป ไม่งั้นจะกลาย
   เป็นเส้นลอย */
/* การ์ดของแต่ละฝั่ง — พื้นขาว เงาแบรนด์ ทรงเดียวกับการ์ดของเปลือกฟอร์ม
   (มติผู้ใช้ 2 ก.ย. 69 ให้แยกเป็นสองการ์ด ไม่ใช่การ์ดเดียวคั่นด้วยเส้น) */
const SPLIT_CARD_STYLE = {
  flex: '1 1 0',
  gap: 'var(--dim-space-500, 20px)',
  padding: 'var(--dim-space-600, 24px)',
  borderRadius: 'var(--dim-radius-500)',
  background: 'var(--surface-card-100)',
  boxShadow: 'var(--shadow-brand-drop-bottom-200)',
};

const SplitCardTitle = ({ children }) => (
  <h2
    style={{
      fontFamily: 'var(--type-family-heading-content)',
      fontSize: 'var(--type-size-base)',
      fontWeight: 'var(--type-weight-bold)',
      color: 'var(--text-brandPrimary-default, #007549)',
      lineHeight: 1.5,
    }}
  >
    {children}
  </h2>
);

export const AncStepExamDiagnosis = ({ form, setForm, ancHn, cardPatient, ...rest }) => {
  const stepProps = { form, setForm, ancHn, cardPatient, ...rest };
  return (
    <div className='flex w-full flex-col min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
      <div
        className='flex w-full flex-col xl:flex-row items-stretch min-w-0'
        style={{ gap: 'var(--dim-space-400)' }}
      >
        <div className='flex flex-col min-w-0 w-full xl:w-auto' style={SPLIT_CARD_STYLE}>
          <SplitCardTitle>ตรวจร่างกาย</SplitCardTitle>
          <AncStep3Examination {...stepProps} />
        </div>
        <div className='flex flex-col min-w-0 w-full xl:w-auto' style={SPLIT_CARD_STYLE}>
          <SplitCardTitle>วินิจฉัย</SplitCardTitle>
          <AncStep4Diagnosis {...stepProps} />
        </div>
      </div>

      {/* ผลตรวจทันตกรรมเป็นการ์ดของตัวเองเต็มความกว้าง (มติผู้ใช้ 2 ก.ย. 69) —
          เป็นข้อมูลอ้างอิงจากคลินิกทันตกรรม ไม่ใช่สิ่งที่กรอกในขั้นนี้ จึงไม่ควร
          อยู่ปนกับช่องกรอกของการ์ดตรวจร่างกาย · ปิดกรอบของแผงเองเพื่อไม่ให้เป็น
          กล่องซ้อนกล่อง */}
      <div className='flex flex-col w-full min-w-0' style={{ ...SPLIT_CARD_STYLE, flex: '0 0 auto' }}>
        <CarriedDentalPanel
          hn={ancHn}
          patientName={cardPatient?.name}
          from='anc'
          title='ผลการตรวจทันตกรรม (จากคลินิกทันตกรรม)'
          showReadOnlyNote={false}
          showSummaryRow={false}
          showLastDiagnoses={false}
          bordered={false}
          /* ป้ายสถานะชิดหัวข้อ และไม่มีปุ่มส่งตรวจบนแผงนี้ (มติผู้ใช้ 2 ก.ย. 69)
             — การส่งตรวจทันตกรรมของงานฝากครรภ์อยู่ที่ขั้นสั่งการรักษาแล้ว */
          badgeNextToTitle
          showAskButton={false}
        />
      </div>
    </div>
  );
};

/* รายการที่ค้นได้ในช่องค้นหาของขั้นสั่งการรักษา (มติผู้ใช้ 2 ก.ย. 69) —
   สามกลุ่มในช่องเดียว: ยาจากทะเบียนยากลาง + ยาเสริมของงานฝากครรภ์ · วัคซีนที่
   ให้ระหว่างตั้งครรภ์ · หัตถการที่ทำในคลินิก ทุกตัวเลือกกดเพิ่มแล้วลงตาราง
   เดียวกัน โดยมีคอลัมน์ "ประเภท" กำกับว่ามาจากกลุ่มไหน */
const ANC_ORDER_KIND_LABEL = { drug: 'ยา', vaccine: 'วัคซีน', procedure: 'หัตถการ' };

const ANC_ORDER_SEARCH_OPTIONS = [
  ...MEDICATION_NAME_OPTIONS.map((o) => ({ value: o.value, kind: 'drug', image: o.image })),
  ...ANC_DISPENSE_ITEMS.map((o) => ({ value: o.label, kind: 'drug', image: resolveMedicationImage(o.label) })),
  ...ANC_VACCINE_DOSES.map((o) => ({ value: o.label, kind: 'vaccine' })),
  ...ANC_VACCINES.map((o) => ({ value: `${o.th}`, kind: 'vaccine' })),
  ...ANC_TERM_ASSESSMENT.map((o) => ({ value: `${o.th}`, kind: 'procedure' })),
  /* งานทันตกรรมนับเป็นหัตถการ (มติผู้ใช้ 2 ก.ย. 69) — ทั้งการส่งตรวจและ
     หัตถการที่ทำเองในคลินิก ค้นได้จากช่องเดียวกัน */
  { value: 'ส่งตรวจสุขภาพช่องปาก (ทันตกรรม)', kind: 'procedure' },
  { value: 'ขัดทำความสะอาดฟัน', kind: 'procedure' },
  { value: 'ฝึกแปรงฟันแบบลงมือปฏิบัติ', kind: 'procedure' },
  { value: 'ตรวจ Ultrasound', kind: 'procedure' },
].filter((o, i, arr) => arr.findIndex((x) => x.value === o.value) === i);

/* ── ขั้นที่ 5 — สั่งการรักษา ────────────────────────────────────────
   ชุดคำสั่งเปลี่ยนตามอายุครรภ์ของครั้งนี้ (`getAncVisitTier`) ตามแผนภูมิ
   ฝากครรภ์คุณภาพ กรมอนามัย 2565 หน้า 4-8 · Workflow Lab ตามมติ คทง.2:
   ครั้งแรกติ๊ก "ส่งตรวจ" ทีละรายการเพื่อให้นับจำนวนผู้ได้รับการตรวจได้
   ครั้งถัดไปดึงผลมาสรุปเป็นตารางภาวะเสี่ยงที่ตรวจพบ */
export const AncStep5Orders = ({ form, setForm, isFollowUp = false }) => {
  const gestationalAge = useMemo(() => calculateGestationalAge(form.lmp), [form.lmp]);
  const tier = getAncVisitTier(gestationalAge?.weeks);
  const [medOpen, setMedOpen] = useState(false);
  const [removeMed, setRemoveMed] = useState(null);
  /* ค้นยาจากทะเบียนแล้วกดเพิ่มลงตารางได้ทันที (มติผู้ใช้ 2 ก.ย. 69) — ใช้
     ทะเบียนยาเดียวกับ OPD (`medicationCatalog`) และเติม "การใช้"/"คำเตือน"
     จากทะเบียนให้เอง ไม่ให้ผู้สั่งพิมพ์เองจนข้อความของยาตัวเดียวกันไม่ตรงกัน */
  const [medQuery, setMedQuery] = useState('');

  const toggle = (group) => (key) => setForm((f) => ({ ...f, [group]: { ...f[group], [key]: !f[group]?.[key] } }));
  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setLabResult = (key) => (value) => setForm((f) => ({ ...f, labResults: { ...f.labResults, [key]: value } }));

  const addMedication = (med) => {
    setForm((f) => ({ ...f, medications: [...(f.medications || []), { ...med, id: `anc-med-${Date.now()}` }] }));
    setMedOpen(false);
  };
  /* กดที่รายการในลิสต์แล้วเพิ่มลงตารางทันที (มติผู้ใช้ 2 ก.ย. 69) — ไม่ต้อง
     เลือกแล้วกดปุ่มอีกชั้น ช่องค้นหาจึงล้างตัวเองหลังเพิ่มเสร็จ พร้อมค้นตัวถัดไป */
  const addFromRegistry = (picked_name) => {
    const name = String(picked_name ?? medQuery).trim();
    if (!name) return;
    const picked = ANC_ORDER_SEARCH_OPTIONS.find((o) => o.value === name);
    const kind = picked?.kind || 'drug';
    const meta = kind === 'drug' ? medicationRegistryDefaults(name) : { purpose: '', warning: '' };
    setForm((f) => ({
      ...f,
      medications: [...(f.medications || []), {
        id: `anc-order-${Date.now()}`,
        kind,
        name,
        image: picked?.image || resolveMedicationImage(name),
        usage: '',
        dosePerTake: '',
        frequency: '',
        when: '',
        quantity: '',
        purpose: meta.purpose,
        warning: meta.warning,
      }],
    }));
    setMedQuery('');
  };
  const confirmRemoveMed = () => {
    setForm((f) => ({ ...f, medications: (f.medications || []).filter((m) => m.id !== removeMed.id) }));
    setRemoveMed(null);
  };

  const labFindings = useMemo(() => summarizeLabRiskFindings(form.labResults), [form.labResults]);

  const ChipGroup = ({ icon, title, items, values, onToggle }) => (
    <div className='flex flex-col gap-3'>
      <TopicHeader icon={icon}>{title}</TopicHeader>
      <div className='flex items-center gap-3 flex-wrap'>
        {items.map((item) => (
          <SelectableTag
            key={item.key}
            label={`${item.th} (${item.en})`}
            size='lg'
            selected={!!values[item.key]}
            onClick={() => onToggle(item.key)}
          />
        ))}
      </div>
    </div>
  );

  const ResultFieldsGrid = ({ fields, title = 'ผลตรวจ Lab' }) => (
    <div className='flex flex-col gap-3'>
      <TopicHeader icon='biotech'>{title}</TopicHeader>
      <FieldGrid cols={4}>
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <LabResultField field={f} value={form.labResults[f.key]} onChange={setLabResult(f.key)} />
          </Field>
        ))}
      </FieldGrid>
    </div>
  );

  return (
    <StepCard>
      {/* ครั้งที่ 2 เป็นต้นไปคือ "มาฟังผล" — สรุปภาวะเสี่ยงที่ตรวจพบให้เห็น
          ภาพรวมก่อน แล้วจึงเป็นชุดคำสั่งของครั้งนี้ (มติ คทง.2) */}
      {isFollowUp && labFindings.length > 0 && (
        <div className='flex flex-col gap-3'>
          <TopicHeader icon='biotech'>สรุปผลตรวจทางห้องปฏิบัติการและภาวะเสี่ยงที่ตรวจพบ</TopicHeader>
          <Table
            columns={[
              { key: 'label', label: 'รายการตรวจ', flex: true, minWidth: 200 },
              { key: 'value', label: 'ผลตรวจ' },
              {
                key: 'risk',
                label: 'การแปลผล',
                render: (r) => (
                  <ColorfulBadge style={r.risk ? 'red' : 'green'} size='small' hierarchy='secondary'>
                    {r.risk ? 'ผิดปกติ' : 'ปกติ'}
                  </ColorfulBadge>
                ),
              },
              { key: 'note', label: 'ข้อควรปฏิบัติ', flex: true, minWidth: 260, render: (r) => r.note || '-' },
            ]}
            rows={labFindings.map((r, i) => ({ ...r, id: `${r.label}-${i}` }))}
            rowKey={(r) => r.id}
            emptyMessage='ยังไม่มีผลตรวจจากห้องปฏิบัติการ'
          />
        </div>
      )}

      {tier === 'first' && (
        <>
          {/* มติ คทง.2 — ครั้งแรกติ๊ก "ส่งตรวจ" รายการต่อรายการ เพื่อให้กอง
              สร้างเสริมสุขภาพนับ "จำนวนผู้ที่ได้รับการตรวจ" ได้ */}
          <div className='flex flex-col gap-3'>
            <TopicHeader icon='biotech'>ส่งตรวจ Lab ครั้งที่ 1</TopicHeader>
            <FieldGrid cols={2}>
              {ANC_LAB1_ORDERS.map((item) => (
                <Checkbox
                  key={item.key}
                  label={item.th}
                  description={item.en}
                  checked={!!form.lab1Orders[item.key]}
                  onChange={() => toggle('lab1Orders')(item.key)}
                />
              ))}
            </FieldGrid>
          </div>
          <ResultFieldsGrid fields={ANC_LAB1_RESULT_FIELDS} title='ผลตรวจ Lab ครั้งที่ 1' />
        </>
      )}

      {tier === 'diabetesScreening' && (
        <ChipGroup
          icon='biotech'
          title='คัดกรองเบาหวานขณะตั้งครรภ์'
          items={ANC_DIABETES_SCREENING}
          values={form.diabetesScreening}
          onToggle={toggle('diabetesScreening')}
        />
      )}

      {tier === 'lab2AndVaccines' && (
        <>
          <ChipGroup icon='biotech' title='สั่งตรวจ Lab ครั้งที่ 2' items={ANC_LAB2_ORDERS} values={form.lab2Orders} onToggle={toggle('lab2Orders')} />
          <ResultFieldsGrid fields={ANC_LAB2_RESULT_FIELDS} title='ผลตรวจ Lab ครั้งที่ 2' />
          <ChipGroup icon='clipboard' title='ยาเสริม (กินทุกวันตลอดการตั้งครรภ์)' items={ANC_SUPPLEMENTS} values={form.supplements} onToggle={toggle('supplements')} />
          <ChipGroup icon='activity' title='ประเมินสุขภาพทารกในครรภ์และการคลอด' items={ANC_TERM_ASSESSMENT} values={form.termAssessment} onToggle={toggle('termAssessment')} />
        </>
      )}

      {/* มติ คทง.2 — จ่ายยาเป็น checkbox ท้ายขั้น ส่วนใบสั่งยาจริงไปทางเดียว
          กับ OPD (AddMedicationPopup) เพื่อให้ห้องยาได้รายการชุดเดียวกัน */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='pill'>การจ่ายยา</TopicHeader>
        {/* ค้นจากทะเบียนยา แล้วกด "เพิ่ม" เพื่อส่งลงตารางด้านล่างทันที */}
        <div className='flex items-end gap-3 w-full flex-wrap'>
          <div style={{ flex: '1 1 320px', minWidth: 240 }}>
            <Field label='ค้นหายา วัคซีน และหัตถการจากทะเบียน'>
              <Select
                showLabel={false}
                searchable
                size='lg'
                value={medQuery}
                onChange={addFromRegistry}
                options={ANC_ORDER_SEARCH_OPTIONS.map((o) => ({
                  value: o.value,
                  label: `${o.value} · ${ANC_ORDER_KIND_LABEL[o.kind]}`,
                  image: o.image || undefined,
                }))}
                /* ปุ่ม "เลือก" ท้ายแต่ละแถว (มติผู้ใช้ 3 ก.ย. 69) — กดแล้วเพิ่มลงตาราง
                   ทันทีโดยไม่ปิดลิสต์ ปุ่มเปลี่ยนเป็น "เพิ่มแล้ว" และกดซ้ำเพื่อเอาออก */
                optionAction={{
                  label: 'เลือก',
                  activeLabel: 'เพิ่มแล้ว',
                  isActive: (val) => (form.medications || []).some((m) => m.name === val),
                  onToggle: (val) => {
                    if ((form.medications || []).some((m) => m.name === val)) {
                      setForm((f) => ({ ...f, medications: (f.medications || []).filter((m) => m.name !== val) }));
                    } else {
                      addFromRegistry(val);
                    }
                  },
                }}
                placeholder='พิมพ์ชื่อยา วัคซีน หรือหัตถการเพื่อค้นหา'
              />
            </Field>
          </div>
        </div>
        <Table
          columns={[
            { key: 'kind', label: 'ประเภท', render: (r) => ANC_ORDER_KIND_LABEL[r.kind] || 'ยา' },
            {
              key: 'name',
              label: 'รายการ',
              flex: true,
              minWidth: 240,
              /* รูปยาจากทะเบียนแสดงคู่กับชื่อ (มติผู้ใช้ 2 ก.ย. 69) — วัคซีน/
                 หัตถการไม่มีรูปในทะเบียน จึงแสดงเฉพาะชื่อ */
              render: (r) => (
                <span className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  {r.image && (
                    <img
                      src={r.image}
                      alt=''
                      style={{
                        width: 'var(--dim-size-600, 32px)',
                        height: 'var(--dim-size-600, 32px)',
                        borderRadius: 'var(--dim-radius-full, 9999px)',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <span className='min-w-0'>{r.name}</span>
                </span>
              ),
            },
            /* คอลัมน์ที่ทะเบียนยาตอบได้เอง (มติผู้ใช้ 2 ก.ย. 69 · D-057 — ข้อมูล
               ระดับยามาจากทะเบียน ไม่ใช่สิ่งที่ผู้สั่งพิมพ์เอง) เดิมเป็นช่อง
               วิธีใช้/ครั้งละ/ความถี่/จำนวน ซึ่งทะเบียนไม่มีข้อมูล จึงว่างทุกแถว */
            { key: 'purpose', label: 'การใช้', flex: true, minWidth: 180, render: (r) => r.purpose || '—' },
            { key: 'warning', label: 'คำเตือน', flex: true, minWidth: 260, render: (r) => r.warning || '—' },
            {
              key: 'actions', label: 'การดำเนินการ', sortable: false,
              render: (row) => (
                <NeutralSubdueButton size='sm' leadingIcon='delete' onClick={() => setRemoveMed(row)}>ลบ</NeutralSubdueButton>
              ),
            },
          ]}
          rows={form.medications || []}
          rowKey={(r) => r.id || r.name}
          emptyMessage='ยังไม่มีรายการยา — เพิ่มได้จากปุ่มด้านบน'
        />
      </div>

      <Popup
        open={!!removeMed}
        onClose={() => setRemoveMed(null)}
        title='ลบรายการยา'
        subtitle={removeMed ? removeMed.name : ''}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setRemoveMed(null) }}
        primaryAction={{ label: 'ยืนยันลบ', onClick: confirmRemoveMed, tone: 'danger' }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
          รายการยาที่ลบแล้วไม่สามารถกู้คืนได้ ต้องการลบใช่หรือไม่?
        </span>
      </Popup>
    </StepCard>
  );
};

/* ── ขั้นที่ 6 — นัดหมาย ────────────────────────────────────────────
   เหลือช่องบันทึกข้อความช่องเดียว (มติผู้ใช้ 2 ก.ย. 69) — แผนนัดตามอายุครรภ์/
   ความเสี่ยง สถานที่ รูปแบบ และ Telemedicine ถูกถอดออกจากขั้นนี้ทั้งหมด
   โค้ดเดิมอยู่ในประวัติ git ถ้าจะเอากลับ */
export const AncStep6Appointment = ({ form, setForm }) => {
  const ga = calculateGestationalAge(form.lmp);
  /* placeholder เป็นแนวทางให้แพทย์กรอก (มติผู้ใช้ 2 ก.ย. 69) — ประกอบจากแผน
     นัดตามอายุครรภ์และระดับความเสี่ยงของผู้รับบริการรายนี้ (แผนภูมิฝากครรภ์
     คุณภาพ กรมอนามัย 2565) ไม่ใช่ข้อความตายตัว */
  const plan = getNextAncAppointmentPlan(ga?.weeks, form.riskLevel);
  const guideline = plan
    ? [
      `แนวทาง: ${plan.facilityLabel}`,
      plan.suggestedWeek ? `นัดช่วงอายุครรภ์ ${plan.suggestedWeek} สัปดาห์` : '',
      plan.label,
      'ระบุวัน–เวลา สถานที่ และสิ่งที่ต้องเตรียมมา',
    ].filter(Boolean).join(' · ')
    : 'ระบุวัน–เวลา สถานที่นัด และสิ่งที่ต้องเตรียมมา';

  const suggestions = [
    plan?.label,
    plan?.suggestedWeek ? `นัดตรวจครรภ์ครั้งถัดไปที่อายุครรภ์ ${plan.suggestedWeek} สัปดาห์` : '',
    'นัดฟังผลตรวจทางห้องปฏิบัติการ',
    'นัดตรวจ Ultrasound',
    'นัดเข้าโรงเรียนพ่อแม่ (เตรียมตัวคลอด / การเลี้ยงลูกด้วยนมแม่)',
    'ให้มาก่อนนัดหากมีเลือดออกทางช่องคลอด ปวดท้องรุนแรง หรือลูกดิ้นน้อยลง',
  ].filter(Boolean);

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='calendar' small tone='neutral'>นัดหมายครั้งถัดไป</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.appointment?.note || ''}
          onChange={(e) => setForm((f) => ({ ...f, appointment: { ...f.appointment, note: e.target.value } }))}
          suggestions={suggestions}
          minChars={2}
          placeholder={guideline}
        />
      </div>
    </StepCard>
  );
};

/* ── ขั้นที่ 7 — ใบฝากครรภ์ ─────────────────────────────────────────
   สรุปทั้งวิสิตแบบอ่านอย่างเดียวก่อนยืนยัน (TOR 1.10.7.5/.6) — การยืนยัน
   เป็นจุดเดียวที่เขียนวิสิตนี้ลงประวัติและอัปเดตทะเบียนฝากครรภ์ */
export const AncStep7Card = ({ form, setForm, patient, cardPatient, ancHn, visitNo = 1 }) => {
  const gestationalAge = useMemo(() => calculateGestationalAge(form.lmp), [form.lmp]);
  const edc = useMemo(() => calculateEDC(form.lmp), [form.lmp]);
  const riskLevel = resolveAncRiskLevel(form.riskLevel);
  const adviceGiven = ANC_ADVICE_TOPICS.filter((t) => form.adviceTopics?.[t.key]);

  const confirm = () => {
    /* ปัสสาวะบันทึกเป็นสองค่าตามคู่มือ (หน้า 2-10) — ค่าเดิมช่องเดียวยังอ่านได้
       เพื่อให้วิสิตที่บันทึกไว้ก่อนหน้ายังแสดงถูก */
    const urineParts = [
      form.urineSugar ? `น้ำตาล ${form.urineSugar}` : '',
      form.urineAlbumin ? `ไข่ขาว ${form.urineAlbumin}` : '',
    ].filter(Boolean);

    saveAncVisitRecord(ancHn, {
      visitNo,
      date: formatAncDate(new Date()),
      gestWeeks: gestationalAge?.weeks ?? '-',
      fundusHeight: form.fundusHeight ? `${form.fundusHeight} ซม.` : '-',
      presentation: ANC_PRESENTATION_OPTIONS.find((o) => o.value === form.presentation)?.label || '-',
      fetalHeartRate: form.fetalHeartRate ? `${form.fetalHeartRate} bpm` : '-',
      bp: form.vitals.bp,
      weight: form.vitals.weight,
      urineResult: urineParts.join(' · ') || form.labResults?.urineResult || '-',
      riskLevel: form.riskLevel || '-',
      labSummary: summarizeLabResults(form.labResults),
      note: summarizeAncProcedures(form) || form.diagnosisNote || form.currentPregnancyNote || '-',
    });

    /* ทะเบียนฝากครรภ์ (ระดับการตั้งครรภ์) บันทึกพร้อมกัน — นี่คือสิ่งที่ทำให้
       ครั้งที่ 2 เป็น "ครั้งถัดไป" ไม่ใช่การฝากครรภ์ครั้งแรกรอบสอง */
    saveAncRegistration(ancHn, form);
    setForm((f) => ({
      ...f,
      cardConfirmed: true,
      cardConfirmedAt: new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }).format(new Date()),
    }));
  };

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='file-text'>ใบฝากครรภ์ / ใบนัดหมาย</TopicHeader>
        <div
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-300, 12px)',
            padding: 'var(--dim-space-600, 24px)',
            borderRadius: 'var(--dim-radius-400, 12px)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            background: 'var(--surface-card-100, #FFFFFF)',
          }}
        >
          <div className='flex items-center justify-between gap-2 flex-wrap'>
            <span style={{ fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-brandPrimary-default, #007549)' }}>
              บัตรฝากครรภ์ (ANC Card)
            </span>
            {riskLevel && (
              <ColorfulBadge
                style={riskLevel.value === 'low' ? 'green' : riskLevel.value === 'intermediate' ? 'yellow' : 'red'}
                size='small' hierarchy='secondary'
              >
                {riskLevel.label}
              </ColorfulBadge>
            )}
          </div>
          <div className='grid grid-cols-2 gap-x-6 gap-y-2' style={{ fontSize: 'var(--type-size-sm)' }}>
            <span>HN: {cardPatient?.hn}</span>
            <span>ชื่อ-สกุล: {cardPatient?.fullName || patient?.name}</span>
            <span>ตรวจครรภ์ครั้งที่: {visitNo}</span>
            <span>ครรภ์ที่ (G-P-A-L): {form.gravida || '—'}-{form.para || 0}-{form.abortion || 0}-{form.livingChildren || 0}</span>
            <span>LMP: {formatAncDate(form.lmp)}</span>
            <span>กำหนดคลอด (EDC): {formatAncDate(edc)}</span>
            <span>อายุครรภ์ปัจจุบัน: {gestationalAge ? formatGestationalAge(gestationalAge) : '—'}</span>
            <span>น้ำหนักครั้งนี้: {form.vitals?.weight ? `${form.vitals.weight} กก.` : '—'}</span>
            <span>ความดันโลหิต: {form.vitals?.bp || '—'}</span>
            <span>ผล Lab: {summarizeLabResults(form.labResults)}</span>
            <span>นัดหมายครั้งถัดไป: {form.appointment?.note?.trim() || formatAncDate(form.appointment?.date) || '—'}</span>
          </div>
          {adviceGiven.length > 0 && (
            <div className='flex flex-col gap-1' style={{ fontSize: 'var(--type-size-sm)' }}>
              <span style={{ fontWeight: 'var(--type-weight-medium)' }}>คำแนะนำที่ให้ในครั้งนี้</span>
              <ul style={{ paddingLeft: 'var(--dim-space-500)', listStyle: 'disc' }}>
                {adviceGiven.map((t) => <li key={t.key}>{t.label}</li>)}
              </ul>
            </div>
          )}
        </div>

        {form.cardConfirmed ? (
          <div className='flex items-center gap-2' style={{ color: 'var(--text-brandPrimary-default, #007549)', fontSize: 'var(--type-size-sm)' }}>
            <Icon name='check-circle' size={18} />
            ยืนยันและพิมพ์ใบฝากครรภ์แล้ว · {form.cardConfirmedAt}
          </div>
        ) : (
          <BrandSubdueButton variant='fill' size='md' leadingIcon='check' onClick={confirm}>
            ยืนยันและพิมพ์ใบฝากครรภ์
          </BrandSubdueButton>
        )}
      </div>
    </StepCard>
  );
};
