import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import DatePicker from '@/components/forms/DatePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import TabCapsule from '@/components/tab/TabCapsule';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import BrandIconButton from '@/components/button/BrandIconButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import Table from '@/components/table/Table';
import DragAndDrop from '@/components/form-builder/DragAndDrop';
import {
  formatAncDate,
  calculateGestationalAge,
  formatGestationalAge,
  calculateEDC,
  ANC_STRESS_QUESTIONS,
  ANC_STRESS_SCALE,
  ANC_MENTAL_HEALTH_QUESTIONS,
  ANC_SMOKING_STATUS,
  ANC_FAMILY_ILLNESS_HISTORY,
  ANC_HUSBAND_LAB_FIELDS,
  ANC_ORAL_HEALTH_QUESTIONS,
  interpretOralHealthScreen,
  getTetanusVaccinePlan,
  ANC_RISK_FACTORS,
  ANC_DANGER_SIGNS,
  ANC_RISK_LEVELS,
  resolveAncRiskLevel,
  ANC_LAB1_ORDERS,
  ANC_LAB1_RESULT_FIELDS,
  ANC_LAB2_RESULT_FIELDS,
  summarizeLabResults,
  ANC_SECOND_TRIMESTER_SCREENING,
  ANC_ULTRASOUND_RESULT_FIELDS,
  ANC_DIABETES_SCREENING,
  ANC_LAB2_ORDERS,
  ANC_VACCINES,
  ANC_SUPPLEMENTS,
  ANC_TERM_ASSESSMENT,
  ANC_NIPPLE_ASSESSMENT_OPTIONS,
  ANC_DELIVERY_MODE_OPTIONS,
  ANC_BREAST_EXAM_OPTIONS,
  ANC_SPOUSE_HEALTH_OPTIONS,
  ANC_ILLNESS_HISTORY_SUGGESTIONS,
  ANC_CURRENT_PREGNANCY_SUGGESTIONS,
  ANC_RISK_SCREENING_SUGGESTIONS,
  ANC_DIAGNOSIS_SUGGESTIONS,
  ANC_EXTERNAL_EXAM_SUGGESTIONS,
  ANC_ADVICE_SUGGESTIONS,
  getAncVisitTier,
  summarizeAncProcedures,
  getNextAncAppointmentPlan,
  getAncVisitHistoryByHn,
  saveAncVisitRecord,
  ANC_PERVISIT_RISK_FACTORS,
  ANC_GDM_SCREENING_FACTORS,
  interpretPerVisitRisk,
  deriveAncRiskSuggestions,
  ANC_URINE_SUGAR_OPTIONS,
  ANC_URINE_ALBUMIN_OPTIONS,
  ANC_FUNDUS_LEVEL_OPTIONS,
  ANC_PRESENTATION_OPTIONS,
  ANC_DESCENT_OPTIONS,
  ANC_FETAL_MOVEMENT_OPTIONS,
  saveAncRegistration,
} from '@/data/ancVisits';

/* AncSteps — ANC (แผนกฝากครรภ์) form bodies, plugged into the shared
   `TreatmentFormShell` 7-step scaffold (same shell `TreatmentSteps.jsx`
   uses for OPD). Covers the full FigJam "Antenatal care" swimlane map
   (A-E) + TOR §1.10.7 — Step 5's order chips adapt to the current
   visit's gestational age via `getAncVisitTier` (see AncStep5Orders),
   so one form covers first visit through 32wk+ referral instead of
   needing a separate flow per visit type. */

const TopicHeader = ({ icon, children }) => (
  <div className='flex items-center gap-2 w-full'>
    <span className='text-brand-500'><Icon name={icon} size={20} /></span>
    <h2 className='text-base font-bold text-brand-500'>{children}</h2>
  </div>
);

const Field = ({ label, required, children, hint }) => (
  <div className='flex-1 flex flex-col gap-1.5 min-w-0'>
    <div className='flex items-center text-sm text-ink leading-snug'>
      <span>{label}</span>
      {required && <span className='ml-0.5' style={{ color: 'var(--text-input-require)' }}>*</span>}
    </div>
    {children}
    {hint && (
      <span style={{ color: 'var(--text-content-quaternary, #ADB2B7)', fontSize: 'var(--type-size-xs)' }}>
        {hint}
      </span>
    )}
  </div>
);

/* Lab result value field — renders a dropdown (Select) for categorical
   results (blood group, reactive/non-reactive, positive/negative) so a
   handful of valid lab values can't fragment into typo'd free text, or a
   plain number InputField for continuous values (Hb, HCT, MCV) that have
   no `options` list. Shared by the husband/partner lab grid and both
   Lab#1/Lab#2 ResultFieldsGrid instances in Step 5. */
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

/* 0..max (or min..max) as string options — obstetric counts (gravida/para/
   abortion/living children) are always small non-negative integers, so a
   dropdown removes the risk of a stray decimal/negative number entry. */
const numberOptions = (max, min = 0) => Array.from({ length: max - min + 1 }, (_, i) => String(min + i));

const StepCard = ({ children }) => (
  <section className='flex flex-col' style={{ gap: 'var(--dim-space-600)' }}>{children}</section>
);

/* AssessmentCard — anchors each screening tool (ST-5, 2Q, risk factors,
   danger signs, smoking) for the capsule tab row above to scroll to. No
   card chrome at all — same flat "flex-col gap-3, no border/background"
   convention OPD's ScreeningPage uses for its own sections (ระดับความเจ็บปวด,
   ความเร่งด่วน, etc.) — only the scroll anchor is new, the visual style
   matches ScreeningPage exactly. `scrollMarginTop` keeps the section's
   heading clear of the sticky PatientCard header when a tab scrolls it
   into view. */
const AssessmentCard = React.forwardRef(({ children }, ref) => (
  <div
    ref={ref}
    className='flex flex-col w-full'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      scrollMarginTop: 110,
    }}
  >
    {children}
  </div>
));
AssessmentCard.displayName = 'AssessmentCard';

/* ── Step 1 — ประวัติการรักษา ──────────────────────────────────────
   Personal/illness history + obstetric registry fields (TOR 1.10.7.6):
   ครรภ์ที่ (gravida/para/abortion/living children), LMP → auto EDC +
   gestational age, obstetric history rows, ลักษณะเต้านม, ข้อมูลการตั้ง
   ครรภ์ปัจจุบัน, สุขภาพของสามี. Also surfaces the read-only prior-visit
   trend (TOR 1.10.7.8) when the patient has follow-up history. */
/* Topics in Step 1 scroll into view when their capsule tab is clicked —
   same pattern as Step 2's ASSESSMENT_SECTIONS. "trend" only appears when
   the patient actually has follow-up history, so it's appended at
   render time rather than listed here. */
const STEP1_BASE_SECTIONS = [
  { key: 'illness',     label: 'ประวัติเจ็บป่วย' },
  { key: 'obstetric',   label: 'ประวัติสูติกรรม' },
  { key: 'breastSpouse', label: 'เต้านม/สามี' },
  { key: 'husbandLab',  label: 'Lab สามี/คู่' },
  { key: 'vaccine',     label: 'วัคซีน dT' },
  { key: 'familyIllness', label: 'ประวัติครอบครัว' },
  { key: 'currentPregnancy', label: 'การตั้งครรภ์ปัจจุบัน' },
  { key: 'documents',   label: 'เอกสารแนบ' },
];

/* Which Step-1 card each carried-forward registration field belongs to, so
   the follow-up banner can name the sections that were pre-filled instead
   of listing raw field keys. Fields that map to the same card collapse to
   one label. */
const CARRIED_FIELD_SECTION = {
  illnessHistory: 'ประวัติเจ็บป่วย',
  gravida: 'ประวัติสูติกรรม', para: 'ประวัติสูติกรรม', abortion: 'ประวัติสูติกรรม',
  livingChildren: 'ประวัติสูติกรรม', lmp: 'ประวัติสูติกรรม', obstetricHistory: 'ประวัติสูติกรรม',
  breastExamNote: 'เต้านม/สามี', spouseHealthNote: 'เต้านม/สามี',
  husbandLabResults: 'Lab สามี/คู่',
  tetanusDoseCount: 'วัคซีน dT', tetanusLastDoseYear: 'วัคซีน dT', tetanusExempt: 'วัคซีน dT',
  familyIllnessHistory: 'ประวัติครอบครัว', familyIllnessOtherNote: 'ประวัติครอบครัว',
  motherChildHealthBookGiven: 'วัคซีน dT',
  riskFactors: 'ความเสี่ยงการตั้งครรภ์',
  gdmScreeningFactors: 'คัดกรองเบาหวาน',
  labResults: 'ผลตรวจ Lab',
};

export const AncStep1History = ({ form, setForm, cardPatient, ancHn, visitNo = 1, isFollowUp = false, carriedFields = [] }) => {
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const toggleFamilyIllness = (key) => setForm((f) => ({
    ...f,
    familyIllnessHistory: { ...f.familyIllnessHistory, [key]: !f.familyIllnessHistory[key] },
  }));

  const gestationalAge = useMemo(() => calculateGestationalAge(form.lmp), [form.lmp]);
  const edc = useMemo(() => calculateEDC(form.lmp), [form.lmp]);
  /* Last dT dose is always a recent year, not decades back — last 20 BE
     years covers it without a free-text field. */
  const tetanusYearOptions = useMemo(() => {
    const currentYearBE = new Date().getFullYear() + 543;
    return Array.from({ length: 20 }, (_, i) => String(currentYearBE - i));
  }, []);

  /* `ancHn` (the HN the queue navigated with) keys the follow-up trend —
     NOT `cardPatient.hn`, which silently degrades to DEFAULT_PATIENT for
     any HN missing from patientProfiles (67-00027, 67-00029) and would
     show one mother another mother's visit history. `cardPatient` is for
     display only. See AncFormPage for the full reasoning. */
  const history = useMemo(() => getAncVisitHistoryByHn(ancHn), [ancHn]);

  const addObstetricRow = () => setForm((f) => ({
    ...f,
    obstetricHistory: [
      ...f.obstetricHistory,
      { id: `ob-${f.obstetricHistory.length + 1}-${Date.now()}`, year: '', deliveryType: '', outcome: '', complication: '' },
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

  const [activeSection, setActiveSection] = useState('illness');
  const sectionRefs = useRef({});
  const jumpToSection = (key) => {
    setActiveSection(key);
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const step1Sections = history.length > 0
    ? [...STEP1_BASE_SECTIONS, { key: 'trend', label: 'ประวัติการฝากครรภ์' }]
    : STEP1_BASE_SECTIONS;

  /* Distinct section names, in ANC_REGISTRATION_FIELDS order. */
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
      {/* Follow-up visits (ตรวจครรภ์ครั้งที่ 2+) open with the pregnancy-level
          ทะเบียนฝากครรภ์ already filled in from earlier visits — legacy HCIS
          keeps that on its own screen (§2.2) and only ever asks for it once.
          The banner names what was carried so the clinician knows which
          answers are inherited (and still editable — TOR 1.10.7.6 "แก้ไข")
          rather than freshly taken today. */}
      {isFollowUp && carriedSections.length > 0 && (
        <div
          className='flex items-start gap-2 w-full'
          style={{
            paddingTop: 'var(--dim-space-300, 12px)',
            paddingBottom: 'var(--dim-space-300, 12px)',
            paddingLeft: 'var(--dim-space-400, 16px)',
            paddingRight: 'var(--dim-space-400, 16px)',
            borderRadius: 'var(--dim-radius-200, 8px)',
            background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
            color: 'var(--text-brandPrimary-default, #007549)',
            fontSize: 'var(--type-size-sm)',
          }}
        >
          <Icon name='history' size={18} />
          <span>
            ตรวจครรภ์ครั้งที่ {visitNo} — ดึงข้อมูลทะเบียนฝากครรภ์จากครั้งก่อนหน้ามาให้แล้ว
            ({carriedSections.join(', ')}) ตรวจสอบและแก้ไขได้หากมีการเปลี่ยนแปลง
          </span>
        </div>
      )}

      <div className='flex items-center gap-2 flex-wrap'>
        {step1Sections.map((s) => (
          <TabCapsule
            key={s.key}
            variant='filter'
            label={s.label}
            selected={activeSection === s.key}
            onClick={() => jumpToSection(s.key)}
          />
        ))}
      </div>

      <AssessmentCard ref={(el) => { sectionRefs.current.illness = el; }}>
        <TopicHeader icon='file-text'>ประวัติส่วนตัวและการเจ็บป่วย</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.illnessHistory}
          onChange={(e) => set('illnessHistory')(e.target.value)}
          suggestions={ANC_ILLNESS_HISTORY_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น ไม่มีโรคประจำตัว / เป็นเบาหวานก่อนตั้งครรภ์'
        />
      </AssessmentCard>

      <AssessmentCard ref={(el) => { sectionRefs.current.obstetric = el; }}>
        <TopicHeader icon='clipboard'>ประวัติทางสูติกรรม</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
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
        </div>

        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='วันแรกของประจำเดือนครั้งสุดท้าย (LMP)' required
            hint={gestationalAge
              ? `อายุครรภ์ ${formatGestationalAge(gestationalAge)} · กำหนดคลอด (EDC) ${formatAncDate(edc)}`
              : 'ระบุ LMP เพื่อคำนวณอายุครรภ์และกำหนดคลอดอัตโนมัติ'}
          >
            <DatePicker
              value={form.lmp ? new Date(form.lmp) : null}
              onChange={(d) => setForm((f) => ({ ...f, lmp: d ? d.toISOString().slice(0, 10) : '' }))}
              placeholder='เลือกวันที่'
              showLabel={false}
            />
          </Field>
        </div>

        {form.obstetricHistory.length > 0 && (
          <div className='flex flex-col gap-2'>
            {form.obstetricHistory.map((row, idx) => (
              <div key={row.id} className='flex items-end gap-3 w-full'>
                <Field label={`ครรภ์ที่ ${idx + 1} — ปี พ.ศ.`}>
                  <InputField value={row.year} onChange={(v) => updateObstetricRow(row.id, 'year', v)} placeholder='2565' />
                </Field>
                <Field label='วิธีคลอด'>
                  <InputField value={row.deliveryType} onChange={(v) => updateObstetricRow(row.id, 'deliveryType', v)} placeholder='คลอดปกติ / ผ่าตัดคลอด' />
                </Field>
                <Field label='ผลลัพธ์'>
                  <InputField value={row.outcome} onChange={(v) => updateObstetricRow(row.id, 'outcome', v)} placeholder='บุตรมีชีวิต / แท้ง / เสียชีวิต' />
                </Field>
                <Field label='ภาวะแทรกซ้อน'>
                  <InputField value={row.complication} onChange={(v) => updateObstetricRow(row.id, 'complication', v)} placeholder='ไม่มี' />
                </Field>
                <BrandIconButton icon='close' variant='ghost' size='sm' onClick={() => removeObstetricRow(row.id)} aria-label='ลบรายการ' />
              </div>
            ))}
          </div>
        )}
        <BrandDashedAddButton onClick={addObstetricRow}>เพิ่มประวัติการตั้งครรภ์ก่อนหน้า</BrandDashedAddButton>
      </AssessmentCard>

      <AssessmentCard ref={(el) => { sectionRefs.current.breastSpouse = el; }}>
        <TopicHeader icon='stethoscope'>ลักษณะเต้านมและสุขภาพของสามี</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='ลักษณะเต้านม'>
            <Select showLabel={false} searchable={false} size='lg' value={form.breastExamNote} onChange={set('breastExamNote')} options={ANC_BREAST_EXAM_OPTIONS} placeholder='เลือกลักษณะเต้านม' />
          </Field>
          <Field label='สุขภาพของสามี'>
            <Select showLabel={false} searchable={false} size='lg' value={form.spouseHealthNote} onChange={set('spouseHealthNote')} options={ANC_SPOUSE_HEALTH_OPTIONS} placeholder='เลือกสุขภาพของสามี' />
          </Field>
        </div>
      </AssessmentCard>

      <AssessmentCard ref={(el) => { sectionRefs.current.husbandLab = el; }}>
        <TopicHeader icon='biotech'>ผลตรวจทางห้องปฏิบัติการของสามี/คู่</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          {ANC_HUSBAND_LAB_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <LabResultField
                field={f}
                value={form.husbandLabResults[f.key]}
                onChange={(v) => setForm((prev) => ({ ...prev, husbandLabResults: { ...prev.husbandLabResults, [f.key]: v } }))}
              />
            </Field>
          ))}
        </div>
      </AssessmentCard>

      <AssessmentCard ref={(el) => { sectionRefs.current.vaccine = el; }}>
        <TopicHeader icon='clipboard'>ประวัติการฉีดวัคซีนป้องกันโรคคอตีบ บาดทะยัก (dT)</TopicHeader>
        <div className='flex items-end gap-4 w-full flex-wrap'>
          <Field label='ก่อนตั้งครรภ์นี้เคยได้รับมาแล้ว (ครั้ง)'>
            <Select showLabel={false} searchable={false} size='lg' value={form.tetanusDoseCount} onChange={set('tetanusDoseCount')} options={numberOptions(5)} placeholder='0' />
          </Field>
          <Field label='ครั้งสุดท้ายเมื่อปี พ.ศ.'>
            <Select showLabel={false} searchable={false} size='lg' value={form.tetanusLastDoseYear} onChange={set('tetanusLastDoseYear')} options={tetanusYearOptions} placeholder='เลือกปี พ.ศ.' />
          </Field>
          <SelectableTag
            label='ไม่ต้องฉีดในครรภ์นี้ — เคยได้รับ dT/dT3 มาไม่เกิน 10 ปี'
            size='lg'
            selected={form.tetanusExempt}
            onClick={() => setForm((f) => ({ ...f, tetanusExempt: !f.tetanusExempt }))}
          />
        </div>
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
        <SelectableTag
          label='แจกสมุดบันทึกสุขภาพแม่และเด็กแล้ว'
          size='lg'
          selected={form.motherChildHealthBookGiven}
          onClick={() => setForm((f) => ({ ...f, motherChildHealthBookGiven: !f.motherChildHealthBookGiven }))}
        />
      </AssessmentCard>

      <AssessmentCard ref={(el) => { sectionRefs.current.familyIllness = el; }}>
        <TopicHeader icon='users'>ประวัติการเจ็บป่วยของครอบครัว</TopicHeader>
        <div className='flex flex-wrap gap-2'>
          {ANC_FAMILY_ILLNESS_HISTORY.map((item) => (
            <SelectableTag
              key={item.key}
              label={item.label}
              size='lg'
              selected={!!form.familyIllnessHistory[item.key]}
              onClick={() => toggleFamilyIllness(item.key)}
            />
          ))}
        </div>
        <SuggestibleTextarea
          voice
          value={form.familyIllnessOtherNote}
          onChange={(e) => set('familyIllnessOtherNote')(e.target.value)}
          placeholder='อื่นๆ (ระบุ)'
        />
      </AssessmentCard>

      <AssessmentCard ref={(el) => { sectionRefs.current.currentPregnancy = el; }}>
        <TopicHeader icon='activity'>ข้อมูลการตั้งครรภ์ปัจจุบัน</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.currentPregnancyNote}
          onChange={(e) => set('currentPregnancyNote')(e.target.value)}
          suggestions={ANC_CURRENT_PREGNANCY_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น อาการแพ้ท้อง, การเคลื่อนไหวของทารก, อาการผิดปกติที่พบ'
        />
      </AssessmentCard>

      <AssessmentCard ref={(el) => { sectionRefs.current.documents = el; }}>
        <TopicHeader icon='file'>อัปโหลดเอกสาร</TopicHeader>
        <DragAndDrop
          value={form.documents}
          onChange={(files) => setForm((f) => ({ ...f, documents: files }))}
          accept='.png,.jpg,.jpeg,.pdf'
        />
      </AssessmentCard>

      {history.length > 0 && (
        <AssessmentCard ref={(el) => { sectionRefs.current.trend = el; }}>
          <TopicHeader icon='history'>การติดตามการฝากครรภ์ (ครั้งก่อนหน้า)</TopicHeader>
          {/* Column set mirrors the legacy exam-history grid (p.2-10):
              ครั้งที่ · วันที่ตรวจ · การตรวจปัสสาวะ · BP · มดลูก · ส่วนนำ ·
              เสียงหัวใจเด็ก — plus the trending columns TOR 1.10.7.8 adds
              (น้ำหนัก, ความเสี่ยง, ผล Lab). `visitNo` is backfilled from row
              order for records saved before it was captured. */}
          <Table
            columns={[
              { key: 'visitNo', label: 'ครั้งที่', width: 72, render: (r, i) => r.visitNo ?? (i + 1) },
              { key: 'date', label: 'วันที่', width: 128 },
              { key: 'gestWeeks', label: 'อายุครรภ์', width: 96, render: (r) => `${r.gestWeeks} สัปดาห์` },
              { key: 'fundusHeight', label: 'ยอดมดลูก', width: 112 },
              { key: 'presentation', label: 'ส่วนนำ', width: 112, render: (r) => r.presentation || '-' },
              { key: 'fetalHeartRate', label: 'FHR', width: 96 },
              { key: 'bp', label: 'BP', width: 96 },
              { key: 'weight', label: 'น้ำหนัก', width: 96, render: (r) => `${r.weight} กก.` },
              { key: 'urineResult', label: 'ปัสสาวะ', width: 140, render: (r) => r.urineResult || '-' },
              {
                key: 'riskLevel', label: 'ความเสี่ยง', width: 128,
                render: (r) => resolveAncRiskLevel(r.riskLevel)?.label || '-',
              },
              { key: 'labSummary', label: 'ผล Lab', width: 200, render: (r) => r.labSummary || '-' },
              { key: 'note', label: 'บันทึก', flex: true, minWidth: 200 },
            ]}
            rows={history}
            rowKey={(r) => `${r.visitNo ?? ''}-${r.date}-${r.gestWeeks}`}
            emptyMessage='ไม่มีประวัติการฝากครรภ์ครั้งก่อนหน้า'
          />
        </AssessmentCard>
      )}
    </StepCard>
  );
};

/* ── Step 2 — คัดกรองและซักประวัติ ─────────────────────────────────
   Mental-health screen (2Q, TOR 1.10.7.3) + pregnancy-risk screening
   checklist (TOR 1.10.7.7). */
/* Each screening tool scrolls into view when its capsule tab is clicked —
   `refs` map keys to the AssessmentCard DOM node, `activeKey` drives the
   selected tab highlight (set on click; there's no scroll-spy since the
   user only asked for click-to-jump, not scroll tracking). */
const ASSESSMENT_SECTIONS = [
  { key: 'stress',  label: 'ความเครียด (ST-5)' },
  { key: 'mental',  label: 'สุขภาพจิต (2Q)' },
  { key: 'risk',    label: 'ความเสี่ยงการตั้งครรภ์' },
  { key: 'perVisitRisk', label: 'ภาวะเสี่ยงครั้งนี้' },
  { key: 'gdm',     label: 'คัดกรองเบาหวาน' },
  { key: 'danger',  label: 'สัญญาณอันตราย' },
  { key: 'smoking', label: 'การสูบบุหรี่' },
];

export const AncStep2Screening = ({ form, setForm }) => {
  const [activeSection, setActiveSection] = useState(ASSESSMENT_SECTIONS[0].key);
  const sectionRefs = useRef({});
  const jumpToSection = (key) => {
    setActiveSection(key);
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const setStress = (key, value) => setForm((f) => ({
    ...f,
    stressAnswers: { ...f.stressAnswers, [key]: value },
  }));
  const toggleMentalAnswer = (key, value) => setForm((f) => ({
    ...f,
    mentalHealthAnswers: { ...f.mentalHealthAnswers, [key]: value },
  }));
  const toggleRiskFactor = (key) => setForm((f) => ({
    ...f,
    riskFactors: { ...f.riskFactors, [key]: !f.riskFactors[key] },
  }));
  const toggleDangerSign = (key) => setForm((f) => ({
    ...f,
    dangerSigns: { ...f.dangerSigns, [key]: !f.dangerSigns[key] },
  }));
  const togglePerVisitRisk = (key) => setForm((f) => ({
    ...f,
    perVisitRiskFactors: { ...f.perVisitRiskFactors, [key]: !f.perVisitRiskFactors[key] },
  }));
  const toggleGdmFactor = (key) => setForm((f) => ({
    ...f,
    gdmScreeningFactors: { ...f.gdmScreeningFactors, [key]: !f.gdmScreeningFactors[key] },
  }));

  const perVisitRisk = interpretPerVisitRisk(form.perVisitRiskFactors);
  const gdmFlaggedCount = Object.values(form.gdmScreeningFactors || {}).filter(Boolean).length;

  /* Risk items this visit's own measurements already imply but the
     clinician hasn't ticked yet. Suggestions only — accepting them is an
     explicit click, so the checklist stays the clinician's judgement. */
  const riskSuggestions = useMemo(
    () => deriveAncRiskSuggestions(form).filter((s) => !form.perVisitRiskFactors?.[s.key]),
    [form],
  );
  const acceptAllSuggestions = () => setForm((f) => {
    const next = { ...f.perVisitRiskFactors };
    riskSuggestions.forEach((s) => { next[s.key] = true; });
    return { ...f, perVisitRiskFactors: next };
  });

  const stressAnsweredCount = Object.keys(form.stressAnswers).length;
  const anyMentalYes = Object.values(form.mentalHealthAnswers).some((v) => v === true);
  const answeredMentalCount = Object.keys(form.mentalHealthAnswers).length;
  const flaggedDangerCount = Object.values(form.dangerSigns).filter(Boolean).length;

  /* Leading check icon on a capsule tab (TabCapsule `type='success'`) only
     where "done" is unambiguous — a fixed question count fully answered,
     or a single-select field with a value. ความเสี่ยงการตั้งครรภ์ /
     สัญญาณอันตราย are open checklists where "nothing selected" is itself a
     common valid answer, indistinguishable from "not reviewed yet", so
     they intentionally stay unmarked rather than show a misleading check. */
  const SECTION_COMPLETE = {
    stress: stressAnsweredCount === ANC_STRESS_QUESTIONS.length,
    mental: answeredMentalCount === ANC_MENTAL_HEALTH_QUESTIONS.length,
    smoking: !!form.smokingStatus,
  };

  return (
    <StepCard>
      {/* Capsule tabs — click jumps to that assessment's own card below;
          a leading check appears once that assessment is answered. */}
      <div className='flex items-center gap-2 flex-wrap'>
        {ASSESSMENT_SECTIONS.map((s) => (
          <TabCapsule
            key={s.key}
            variant='filter'
            type={SECTION_COMPLETE[s.key] ? 'success' : 'default'}
            showLeadingIcon={!!SECTION_COMPLETE[s.key]}
            label={s.label}
            selected={activeSection === s.key}
            onClick={() => jumpToSection(s.key)}
          />
        ))}
      </div>

      {/* แบบประเมินความเครียด ST-5 (pp.40-41) — runs ahead of the 2Q per
          the manual's flowchart (pp.42-43). */}
      <AssessmentCard ref={(el) => { sectionRefs.current.stress = el; }}>
        <TopicHeader icon='activity'>แบบประเมินความเครียด (ST-5)</TopicHeader>
        <div className='flex flex-col gap-3'>
          {ANC_STRESS_QUESTIONS.map((q) => (
            <div key={q.key} className='flex items-center justify-between gap-4 w-full flex-wrap'>
              <span className='text-sm' style={{ color: 'var(--text-content-default, #363B3F)' }}>{q.label}</span>
              <div className='flex items-center gap-2 shrink-0 flex-wrap'>
                {ANC_STRESS_SCALE.map((opt) => (
                  <SelectableTag
                    key={opt.value}
                    label={opt.label}
                    size='md'
                    selected={form.stressAnswers[q.key] === opt.value}
                    onClick={() => setStress(q.key, opt.value)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </AssessmentCard>

      <AssessmentCard ref={(el) => { sectionRefs.current.mental = el; }}>
        <TopicHeader icon='meh'>แบบประเมินสุขภาพจิต (2Q)</TopicHeader>
        <div className='flex flex-col gap-3'>
          {ANC_MENTAL_HEALTH_QUESTIONS.map((q) => (
            <div key={q.key} className='flex items-center justify-between gap-4 w-full flex-wrap'>
              <span className='text-sm' style={{ color: 'var(--text-content-default, #363B3F)' }}>{q.label}</span>
              <div className='flex items-center gap-2 shrink-0'>
                <SelectableTag
                  label='ใช่'
                  size='md'
                  selected={form.mentalHealthAnswers[q.key] === true}
                  onClick={() => toggleMentalAnswer(q.key, true)}
                />
                <SelectableTag
                  label='ไม่ใช่'
                  size='md'
                  selected={form.mentalHealthAnswers[q.key] === false}
                  onClick={() => toggleMentalAnswer(q.key, false)}
                />
              </div>
            </div>
          ))}
        </div>
        {anyMentalYes && (
          <div
            className='flex items-center gap-2'
            style={{
              padding: 'var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-warning-quaternary, #FFF9F0)',
              color: 'var(--text-warning-default, #F46928)',
              fontSize: 'var(--type-size-sm)',
            }}
          >
            <Icon name='activity' size={18} />
            พบผลบวก — ควรประเมินต่อด้วยแบบประเมิน 9Q / 8Q ฉบับเต็ม
          </div>
        )}
      </AssessmentCard>

      <AssessmentCard ref={(el) => { sectionRefs.current.risk = el; }}>
        <TopicHeader icon='clipboard-list'>แบบประเมินความเสี่ยงการตั้งครรภ์</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {ANC_RISK_FACTORS.map((rf) => (
            <SelectableTag
              key={rf.key}
              label={rf.label}
              size='lg'
              selected={!!form.riskFactors[rf.key]}
              onClick={() => toggleRiskFactor(rf.key)}
            />
          ))}
        </div>
        <SuggestibleTextarea
          voice
          value={form.riskScreeningNote}
          onChange={(e) => setForm((f) => ({ ...f, riskScreeningNote: e.target.value }))}
          suggestions={ANC_RISK_SCREENING_SUGGESTIONS}
          minChars={3}
          placeholder='รายละเอียดเพิ่มเติมจากการคัดกรองความเสี่ยง'
        />
      </AssessmentCard>

      {/* ภาวะเสี่ยงที่ต้องประเมิน "ทุกครั้งที่มีการให้บริการตรวจครรภ์" —
          legacy p.2-13, items 8-20. Unlike the registration risk panel
          above (history facts, carried forward), every item here is a
          finding of TODAY's visit, so it starts blank at each follow-up
          and any tick means "ต้องส่งต่อหรือรายงานแพทย์". */}
      <AssessmentCard ref={(el) => { sectionRefs.current.perVisitRisk = el; }}>
        <TopicHeader icon='clipboard-list'>ภาวะเสี่ยงที่ประเมินทุกครั้งที่ตรวจครรภ์</TopicHeader>

        {/* What the visit's own numbers already imply. Each row says WHY it
            fired, so accepting is a judgement call on a stated reason
            rather than trusting a black box. */}
        {riskSuggestions.length > 0 && (
          <div
            className='flex flex-col gap-2 w-full'
            style={{
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
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
                ระบบตรวจพบภาวะเสี่ยง {riskSuggestions.length} ข้อจากข้อมูลที่บันทึกไว้แล้ว
              </span>
              <BrandSubdueButton variant='fill' size='sm' leadingIcon='check' onClick={acceptAllSuggestions}>
                เลือกทั้งหมด
              </BrandSubdueButton>
            </div>
            <div className='flex flex-col gap-1'>
              {riskSuggestions.map((s) => (
                <button
                  key={s.key}
                  type='button'
                  onClick={() => togglePerVisitRisk(s.key)}
                  className='flex items-start gap-2 text-left w-full'
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--text-content-default, #363B3F)',
                    fontSize: 'var(--type-size-sm)',
                  }}
                >
                  <Icon name='plus' size={16} />
                  <span>{s.label} <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>— {s.reason}</span></span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className='flex items-center gap-3 flex-wrap'>
          {ANC_PERVISIT_RISK_FACTORS.map((rf) => (
            <SelectableTag
              key={rf.key}
              label={rf.label}
              size='lg'
              selected={!!form.perVisitRiskFactors[rf.key]}
              onClick={() => togglePerVisitRisk(rf.key)}
            />
          ))}
        </div>
        {perVisitRisk.mustRefer && (
          <ColorfulBadge style='red' size='small' hierarchy='secondary' width='hug' maxWidth={640}>
            พบภาวะเสี่ยง {perVisitRisk.flagged.length} ข้อ — ต้องส่งต่อหรือรายงานแพทย์
          </ColorfulBadge>
        )}
      </AssessmentCard>

      {/* แบบคัดกรองเบาหวานในหญิงมีครรภ์ — legacy p.2-13, third panel. These
          are history-based facts (carried forward), and a positive screen
          is what justifies the GCT/OGTT orders Step 5 offers at 20-27wk. */}
      <AssessmentCard ref={(el) => { sectionRefs.current.gdm = el; }}>
        <TopicHeader icon='activity'>แบบคัดกรองเบาหวานในหญิงมีครรภ์</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {ANC_GDM_SCREENING_FACTORS.map((rf) => (
            <SelectableTag
              key={rf.key}
              label={rf.label}
              size='lg'
              selected={!!form.gdmScreeningFactors[rf.key]}
              onClick={() => toggleGdmFactor(rf.key)}
            />
          ))}
        </div>
        {gdmFlaggedCount > 0 && (
          <ColorfulBadge style='yellow' size='small' hierarchy='secondary' width='hug' maxWidth={640}>
            พบปัจจัยเสี่ยงเบาหวาน {gdmFlaggedCount} ข้อ — ควรคัดกรองด้วย GCT (24-28 สัปดาห์) ในขั้นตอนสั่งการรักษา
          </ColorfulBadge>
        )}
      </AssessmentCard>

      {/* สัญญาณอันตราย — exact referral triggers from the official manual
          pp.11-12. Any checked item is an immediate-referral situation,
          not a routine risk factor, so it gets its own red-flagged
          section rather than living inside ANC_RISK_FACTORS. */}
      <AssessmentCard ref={(el) => { sectionRefs.current.danger = el; }}>
        <TopicHeader icon='activity'>สัญญาณอันตราย (ต้องส่งพบแพทย์ทันทีหากพบ)</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {ANC_DANGER_SIGNS.map((sign) => (
            <SelectableTag
              key={sign.key}
              label={sign.label}
              size='lg'
              selected={!!form.dangerSigns[sign.key]}
              onClick={() => toggleDangerSign(sign.key)}
            />
          ))}
        </div>
        {flaggedDangerCount > 0 && (
          <div
            className='flex items-center gap-2'
            style={{
              padding: 'var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-danger-quaternary, #FFF0F0)',
              color: 'var(--text-danger-default, #C72121)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-medium)',
            }}
          >
            <Icon name='activity' size={18} />
            พบสัญญาณอันตราย — ควรส่งพบแพทย์เพื่อประเมินและรักษาทันที
          </div>
        )}
      </AssessmentCard>

      {/* การคัดกรองการสูบบุหรี่ (p.46) — screened every visit; brief-advice
          checkbox once flagged as a smoker. Full Varenicline/4A cessation
          protocol is a doctor-level treatment plan, out of scope here. */}
      <AssessmentCard ref={(el) => { sectionRefs.current.smoking = el; }}>
        <TopicHeader icon='activity'>การคัดกรองการสูบบุหรี่</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {ANC_SMOKING_STATUS.map((opt) => (
            <SelectableTag
              key={opt.value}
              label={opt.label}
              size='lg'
              selected={form.smokingStatus === opt.value}
              onClick={() => setForm((f) => ({ ...f, smokingStatus: opt.value }))}
            />
          ))}
          {form.smokingStatus === 'smoker' && (
            <SelectableTag
              label='ให้คำแนะนำเลิกบุหรี่แล้ว (Brief advice)'
              size='lg'
              selected={form.smokingAdviceGiven}
              onClick={() => setForm((f) => ({ ...f, smokingAdviceGiven: !f.smokingAdviceGiven }))}
            />
          )}
        </div>
      </AssessmentCard>
    </StepCard>
  );
};

/* ── Step 3 — ตรวจร่างกาย ──────────────────────────────────────────
   Vitals + ANC-specific additions: ระดับยอดมดลูก (fundus height) +
   fetal heart rate + oral-health check (TOR 1.10.7.7). */
export const AncStep3Examination = ({ form, setForm }) => {
  const setVital = (key) => (value) => setForm((f) => ({ ...f, vitals: { ...f.vitals, [key]: value } }));

  const gaByLmp = useMemo(() => calculateGestationalAge(form.lmp), [form.lmp]);

  /* Anything past a Trace reading counts as positive for risk item 10 —
     Trace alone is not actionable on its own per the dipstick convention. */
  const POSITIVE_DIPSTICK = ['1+', '2+', '3+', '4+'];
  const abnormalUrine = POSITIVE_DIPSTICK.includes(form.urineSugar)
    || POSITIVE_DIPSTICK.includes(form.urineAlbumin);

  /* Only flag a clinically meaningful gap. ±2 weeks is normal measurement
     spread on fundal height; 3+ is what the legacy risk item is after. */
  const gaMismatch = useMemo(() => {
    const exam = Number(form.gaByExam);
    if (!gaByLmp || !form.gaByExam || !Number.isFinite(exam)) return 0;
    const diff = Math.abs(gaByLmp.weeks - exam);
    return diff >= 3 ? diff : 0;
  }, [gaByLmp, form.gaByExam]);

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='stethoscope'>สัญญาณชีพ</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='ความดันโลหิต (BP)'>
            <InputField value={form.vitals.bp} onChange={setVital('bp')} placeholder='120/80' />
          </Field>
          <Field label='ชีพจร (HR)'>
            <InputField value={form.vitals.hr} onChange={setVital('hr')} type='number' />
          </Field>
          <Field label='อุณหภูมิ (°C)'>
            <InputField value={form.vitals.temp} onChange={setVital('temp')} type='number' />
          </Field>
          <Field label='น้ำหนัก (กก.)'>
            <InputField value={form.vitals.weight} onChange={setVital('weight')} type='number' />
          </Field>
          <Field label='ส่วนสูง (ซม.)'>
            <InputField value={form.vitals.height} onChange={setVital('height')} type='number' />
          </Field>
        </div>
      </div>

      {/* ตรวจปัสสาวะ — the legacy exam screen (p.2-10) records Sugar and
          Albumin as two separate dipstick grades, not one ปกติ/ผิดปกติ
          flag; per-visit risk item 10 keys off either being positive. */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='biotech'>ตรวจปัสสาวะ (Urine dipstick)</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='น้ำตาล (Sugar)'>
            <Select
              showLabel={false} searchable={false} size='lg'
              value={form.urineSugar}
              onChange={(v) => setForm((f) => ({ ...f, urineSugar: v }))}
              options={ANC_URINE_SUGAR_OPTIONS}
              placeholder='เลือกผลตรวจน้ำตาล'
            />
          </Field>
          <Field label='ไข่ขาว (Albumin)'>
            <Select
              showLabel={false} searchable={false} size='lg'
              value={form.urineAlbumin}
              onChange={(v) => setForm((f) => ({ ...f, urineAlbumin: v }))}
              options={ANC_URINE_ALBUMIN_OPTIONS}
              placeholder='เลือกผลตรวจไข่ขาว'
            />
          </Field>
        </div>
        {abnormalUrine && (
          <ColorfulBadge style='red' size='small' hierarchy='secondary' width='hug' maxWidth={640}>
            พบน้ำตาลและ/หรือไข่ขาวในปัสสาวะ — เข้าเกณฑ์ภาวะเสี่ยงที่ต้องรายงานแพทย์ (ข้อ 10)
          </ColorfulBadge>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='activity'>ตรวจครรภ์</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='ระดับยอดมดลูก (Fundal height, ซม.)'>
            <InputField
              value={form.fundusHeight}
              onChange={(v) => setForm((f) => ({ ...f, fundusHeight: v }))}
              type='number'
              placeholder='เช่น 20'
            />
          </Field>
          <Field label='ระดับมดลูก'>
            <Select
              showLabel={false} searchable={false} size='lg'
              value={form.fundusLevel}
              onChange={(v) => setForm((f) => ({ ...f, fundusLevel: v }))}
              options={ANC_FUNDUS_LEVEL_OPTIONS}
              placeholder='เลือกระดับมดลูก'
            />
          </Field>
          <Field label='ส่วนนำ (Presentation)'>
            <Select
              showLabel={false} searchable={false} size='lg'
              value={form.presentation}
              onChange={(v) => setForm((f) => ({ ...f, presentation: v }))}
              options={ANC_PRESENTATION_OPTIONS}
              placeholder='เลือกส่วนนำ'
            />
          </Field>
          <Field label='การลง (Descent)'>
            <Select
              showLabel={false} searchable={false} size='lg'
              value={form.descent}
              onChange={(v) => setForm((f) => ({ ...f, descent: v }))}
              options={ANC_DESCENT_OPTIONS}
              placeholder='เลือกการลง'
            />
          </Field>
          <Field label='ท่าเด็ก'>
            <InputField
              value={form.fetalPosition}
              onChange={(v) => setForm((f) => ({ ...f, fetalPosition: v }))}
              placeholder='เช่น LOA / ROA'
            />
          </Field>
          <Field label='อัตราการเต้นหัวใจทารก (FHR, bpm)'>
            <InputField
              value={form.fetalHeartRate}
              onChange={(v) => setForm((f) => ({ ...f, fetalHeartRate: v }))}
              type='number'
              placeholder='เช่น 148'
            />
          </Field>
          <Field label='เด็กดิ้น'>
            <Select
              showLabel={false} searchable={false} size='lg'
              value={form.fetalMovement}
              onChange={(v) => setForm((f) => ({ ...f, fetalMovement: v }))}
              options={ANC_FETAL_MOVEMENT_OPTIONS}
              placeholder='เลือกการดิ้นของทารก'
            />
          </Field>
        </div>
      </div>

      {/* อายุครรภ์ 3 ทาง — the legacy screen (p.2-10) keeps LMP, ตรวจครรภ์
          and อัลตราซาวด์ estimates side by side precisely because they
          disagree; a gap between LMP and clinical exam IS per-visit risk
          item 14 ("ขนาดของมดลูกไม่สัมพันธ์กับอายุครรภ์"), so the mismatch
          is surfaced rather than left for the clinician to subtract. */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard'>อายุครรภ์ (เปรียบเทียบ 3 วิธี)</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='จากการคำนวณ LMP (สัปดาห์)' hint={gaByLmp ? formatGestationalAge(gaByLmp) : 'ระบุ LMP ในขั้นตอนที่ 1'}>
            <InputField value={gaByLmp ? String(gaByLmp.weeks) : ''} onChange={() => {}} disabled placeholder='—' />
          </Field>
          <Field label='จากการตรวจครรภ์ (สัปดาห์)'>
            <InputField
              value={form.gaByExam}
              onChange={(v) => setForm((f) => ({ ...f, gaByExam: v }))}
              type='number'
              placeholder='เช่น 20'
            />
          </Field>
          <Field label='จากการอัลตราซาวด์ (สัปดาห์)'>
            <InputField
              value={form.gaByUltrasoundWeeks}
              onChange={(v) => setForm((f) => ({ ...f, gaByUltrasoundWeeks: v }))}
              type='number'
              placeholder='เช่น 20'
            />
          </Field>
        </div>
        {gaMismatch && (
          <ColorfulBadge style='yellow' size='small' hierarchy='secondary' width='hug' maxWidth={640}>
            อายุครรภ์จากการตรวจครรภ์ต่างจาก LMP {gaMismatch} สัปดาห์ — พิจารณาภาวะเสี่ยงข้อ 14 (ขนาดมดลูกไม่สัมพันธ์กับอายุครรภ์)
          </ColorfulBadge>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard-list'>คัดกรองสุขภาพช่องปาก (Maternal Oral Screening)</TopicHeader>
        <div className='flex flex-col gap-2'>
          {ANC_ORAL_HEALTH_QUESTIONS.map((q) => (
            <div key={q.key} className='flex items-center justify-between gap-4 w-full flex-wrap'>
              <span className='text-sm' style={{ color: 'var(--text-content-default, #363B3F)' }}>{q.label}</span>
              <div className='flex items-center gap-2 shrink-0'>
                <SelectableTag
                  label='ใช่'
                  selected={form.oralHealthAnswers[q.key] === true}
                  onClick={() => setForm((f) => ({ ...f, oralHealthAnswers: { ...f.oralHealthAnswers, [q.key]: true } }))}
                />
                <SelectableTag
                  label='ไม่ใช่'
                  selected={form.oralHealthAnswers[q.key] === false}
                  onClick={() => setForm((f) => ({ ...f, oralHealthAnswers: { ...f.oralHealthAnswers, [q.key]: false } }))}
                />
              </div>
            </div>
          ))}
        </div>
        {Object.keys(form.oralHealthAnswers).length === ANC_ORAL_HEALTH_QUESTIONS.length && (() => {
          const result = interpretOralHealthScreen(form.oralHealthAnswers);
          return (
            <ColorfulBadge style={result.highRisk ? 'red' : 'green'} size='small' hierarchy='secondary'>
              {result.highRisk ? `คะแนน ${result.score} — ควรส่งพบทันตแพทย์` : 'ไม่พบความเสี่ยงด้านสุขภาพช่องปาก'}
            </ColorfulBadge>
          );
        })()}
      </div>
    </StepCard>
  );
};

/* ── Step 4 — วินิจฉัย ─────────────────────────────────────────────
   Doctor picks the pregnancy risk tier (drives Step 6 routing) + free
   diagnosis note (TOR 1.10.7.7). */
export const AncStep4Diagnosis = ({ form, setForm }) => {
  const gestationalAge = calculateGestationalAge(form.lmp);
  const tier = getAncVisitTier(gestationalAge?.weeks);
  /* GDM confirmation only makes sense once the diabetes-screening tier has
     been reached (GCT 24-28wk / OGTT 30wk, pp.5-8) — surfaces as the "GDM+"
     flag on the pregnancy-progress header once ticked. */
  const showGdmToggle = tier === 'diabetesScreening' || tier === 'lab2AndVaccines';

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard-list'>ผลประเมินความเสี่ยงการตั้งครรภ์</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {ANC_RISK_LEVELS.map((lvl) => {
            const active = form.riskLevel === lvl.value;
            return (
              <button
                key={lvl.value}
                type='button'
                aria-pressed={active}
                onClick={() => setForm((f) => ({ ...f, riskLevel: lvl.value }))}
                className='inline-flex items-center'
                style={{
                  minHeight: 56,
                  paddingLeft: 'var(--dim-space-400, 16px)',
                  paddingRight: 'var(--dim-space-400, 16px)',
                  gap: 'var(--dim-space-200, 8px)',
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  background: active ? lvl.tone.bg : 'var(--surface-neutralbutton-quinary, #FFFFFF)',
                  boxShadow: active
                    ? `0 0 0 var(--dim-stroke-200, 2px) ${lvl.tone.fg}`
                    : '0 0 0 var(--dim-stroke-100, 1px) var(--border-neutralbutton-tertiary, #E2E4E6)',
                  color: active ? lvl.tone.fg : 'var(--text-content-default, #363B3F)',
                  fontSize: 'var(--type-size-sm)',
                  fontWeight: 'var(--type-weight-medium)',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                {lvl.label} ({lvl.en})
              </button>
            );
          })}
        </div>
        {showGdmToggle && (
          <SelectableTag
            label='ยืนยันเบาหวานขณะตั้งครรภ์ (GDM) จากผล OGTT'
            size='lg'
            selected={form.gdmConfirmed}
            onClick={() => setForm((f) => ({ ...f, gdmConfirmed: !f.gdmConfirmed }))}
          />
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='file-text'>บันทึกวินิจฉัย</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.diagnosisNote}
          onChange={(e) => setForm((f) => ({ ...f, diagnosisNote: e.target.value }))}
          suggestions={ANC_DIAGNOSIS_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น ครรภ์แรก อายุครรภ์ 8 สัปดาห์ ไม่พบภาวะเสี่ยง'
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='biotech'>ผลการตรวจครรภ์จากภายนอก</TopicHeader>
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

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard'>คำแนะนำ</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.adviceNote}
          onChange={(e) => setForm((f) => ({ ...f, adviceNote: e.target.value }))}
          suggestions={ANC_ADVICE_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น รับประทานยาเสริมธาตุเหล็ก, สังเกตการดิ้นของทารก, มาพบแพทย์ก่อนนัดหากมีเลือดออกทางช่องคลอด'
        />
      </div>
    </StepCard>
  );
};

/* ── Step 5 — สั่งการรักษา ─────────────────────────────────────────
   Order chips adapt to the CURRENT visit's gestational age (TOR
   1.10.7.5/.7) — FigJam swimlane A (Lab #1, <12wk) · C (Down-syndrome +
   2nd ultrasound, 12-19wk) · D (GCT/OGTT diabetes screen, 20-27wk) ·
   E (Lab #2 + vaccines, 28wk+), so the same form covers the whole
   pregnancy instead of only the first visit. */
export const AncStep5Orders = ({ form, setForm }) => {
  const gestationalAge = useMemo(() => calculateGestationalAge(form.lmp), [form.lmp]);
  const tier = getAncVisitTier(gestationalAge?.weeks);

  const toggle = (group) => (key) => setForm((f) => ({ ...f, [group]: { ...f[group], [key]: !f[group][key] } }));
  const toggleLab = toggle('lab1Orders');
  const toggleScreening = toggle('secondTrimesterScreening');
  const toggleDiabetes = toggle('diabetesScreening');
  const toggleLab2 = toggle('lab2Orders');
  const toggleVaccine = toggle('vaccines');
  const toggleSupplement = toggle('supplements');
  const toggleTermAssessment = toggle('termAssessment');

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

  const setLabResult = (key) => (value) => setForm((f) => ({
    ...f,
    labResults: { ...f.labResults, [key]: value },
  }));
  const setUltrasoundResult = (key) => (value) => setForm((f) => ({
    ...f,
    ultrasoundResults: { ...f.ultrasoundResults, [key]: value },
  }));

  /* ผลตรวจ Lab (result VALUES, not just which labs were ordered) — TOR
     1.10.7.7 names "การตรวจปัสสาวะ" as an explicit exam-history column, and
     1.10.7.8 requires trending "Lab" over time, so both need the actual
     result captured here rather than only the order chips above. */
  const ResultFieldsGrid = ({ fields }) => (
    <div className='flex flex-col gap-3'>
      <TopicHeader icon='biotech'>ผลตรวจ Lab</TopicHeader>
      <div className='flex items-start gap-4 w-full flex-wrap'>
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <LabResultField field={f} value={form.labResults[f.key]} onChange={setLabResult(f.key)} />
          </Field>
        ))}
      </div>
    </div>
  );

  /* Structured Ultrasound findings (pp.50-52) — shared by the 20wk (2nd)
     and 34wk (3rd) ultrasound, since only one tier is active per visit. */
  const UltrasoundResultsGrid = () => (
    <div className='flex flex-col gap-3'>
      <TopicHeader icon='activity'>ผลตรวจ Ultrasound</TopicHeader>
      <div className='flex items-start gap-4 w-full flex-wrap'>
        {ANC_ULTRASOUND_RESULT_FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <InputField value={form.ultrasoundResults[f.key] || ''} onChange={setUltrasoundResult(f.key)} placeholder={f.placeholder} />
          </Field>
        ))}
      </div>
    </div>
  );

  const SingleChoiceChips = ({ options, value, onChange }) => (
    <div className='flex items-center gap-3 flex-wrap'>
      {options.map((opt) => (
        <SelectableTag
          key={opt.value}
          label={opt.label}
          size='lg'
          selected={value === opt.value}
          onClick={() => onChange(opt.value)}
        />
      ))}
    </div>
  );

  return (
    <StepCard>
      {tier === 'first' && (
        <>
          <ChipGroup icon='biotech' title='สั่งตรวจ Lab ครั้งที่ 1' items={ANC_LAB1_ORDERS} values={form.lab1Orders} onToggle={toggleLab} />
          <ResultFieldsGrid fields={ANC_LAB1_RESULT_FIELDS} />
        </>
      )}
      {tier === 'secondTrimesterScreening' && (
        <>
          <ChipGroup icon='biotech' title='คัดกรองไตรมาสที่ 2 (14-18 สัปดาห์)' items={ANC_SECOND_TRIMESTER_SCREENING} values={form.secondTrimesterScreening} onToggle={toggleScreening} />
          {form.secondTrimesterScreening.ultrasound2 && <UltrasoundResultsGrid />}
        </>
      )}
      {tier === 'diabetesScreening' && (
        <ChipGroup icon='biotech' title='คัดกรองเบาหวานขณะตั้งครรภ์' items={ANC_DIABETES_SCREENING} values={form.diabetesScreening} onToggle={toggleDiabetes} />
      )}
      {tier === 'lab2AndVaccines' && (
        <>
          <ChipGroup icon='biotech' title='สั่งตรวจ Lab ครั้งที่ 2' items={ANC_LAB2_ORDERS} values={form.lab2Orders} onToggle={toggleLab2} />
          <ResultFieldsGrid fields={ANC_LAB2_RESULT_FIELDS} />
          <ChipGroup icon='clipboard' title='ฉีดวัคซีน' items={ANC_VACCINES} values={form.vaccines} onToggle={toggleVaccine} />
          <ChipGroup icon='clipboard' title='ยาเสริม (กินทุกวันตลอดการตั้งครรภ์)' items={ANC_SUPPLEMENTS} values={form.supplements} onToggle={toggleSupplement} />
          <ChipGroup icon='activity' title='ประเมินสุขภาพทารกในครรภ์และการคลอด' items={ANC_TERM_ASSESSMENT} values={form.termAssessment} onToggle={toggleTermAssessment} />
          {form.termAssessment.ultrasound3 && <UltrasoundResultsGrid />}
          <div className='flex flex-col gap-3'>
            <TopicHeader icon='clipboard-list'>ตรวจประเมินด้านและหัวนม</TopicHeader>
            <SingleChoiceChips
              options={ANC_NIPPLE_ASSESSMENT_OPTIONS}
              value={form.nippleAssessment}
              onChange={(v) => setForm((f) => ({ ...f, nippleAssessment: v }))}
            />
          </div>
          <div className='flex flex-col gap-3'>
            <TopicHeader icon='clipboard-list'>แผนการคลอด</TopicHeader>
            <SingleChoiceChips
              options={ANC_DELIVERY_MODE_OPTIONS}
              value={form.plannedDeliveryMode}
              onChange={(v) => setForm((f) => ({ ...f, plannedDeliveryMode: v }))}
            />
          </div>
        </>
      )}

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard-list'>ทันตกรรม</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          <SelectableTag
            label='ส่งตรวจสุขภาพช่องปาก'
            size='lg'
            selected={form.dentalReferral}
            onClick={() => setForm((f) => ({ ...f, dentalReferral: !f.dentalReferral }))}
          />
          {tier !== 'first' && (
            <>
              <SelectableTag
                label='ขัดทำความสะอาดฟันแล้ว'
                size='lg'
                selected={form.dentalCleaningDone}
                onClick={() => setForm((f) => ({ ...f, dentalCleaningDone: !f.dentalCleaningDone }))}
              />
              <SelectableTag
                label='ฝึกแปรงฟันแบบลงมือปฏิบัติแล้ว'
                size='lg'
                selected={form.dentalBrushingPractice}
                onClick={() => setForm((f) => ({ ...f, dentalBrushingPractice: !f.dentalBrushingPractice }))}
              />
            </>
          )}
        </div>
      </div>
    </StepCard>
  );
};

/* ── Step 6 — นัดหมาย ──────────────────────────────────────────────
   Prefills facility + suggested week from `getNextAncAppointmentPlan`,
   date picker for the actual next-visit date, "โรงเรียนพ่อแม่" education
   toggle (TOR 1.10.7.5). */
export const AncStep6Appointment = ({ form, setForm }) => {
  const gestationalAge = useMemo(() => calculateGestationalAge(form.lmp), [form.lmp]);
  const plan = useMemo(
    () => getNextAncAppointmentPlan(gestationalAge?.weeks, form.riskLevel),
    [gestationalAge, form.riskLevel],
  );

  /* Prefill facility once a plan is available and the field hasn't been
     touched yet — mirrors TreatmentFormPage seeding `appointment.doctor`. */
  useEffect(() => {
    if (plan && !form.appointment.facility) {
      setForm((f) => ({ ...f, appointment: { ...f.appointment, facility: plan.facility } }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const setAppt = (key) => (value) => setForm((f) => ({ ...f, appointment: { ...f.appointment, [key]: value } }));

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='calendar'>นัดหมายครั้งถัดไป</TopicHeader>
        {plan && (
          <div
            className='flex items-start gap-3'
            style={{
              padding: 'var(--dim-space-400, 16px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            }}
          >
            <Icon name='calendar' size={20} />
            <div className='flex flex-col gap-1'>
              <span style={{ fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}>
                {plan.facilityLabel}{plan.suggestedWeek ? ` · แนะนำอายุครรภ์ ${plan.suggestedWeek} สัปดาห์` : ''}
              </span>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>{plan.label}</span>
            </div>
          </div>
        )}

        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='สถานที่นัดหมาย'>
            <div className='flex items-center gap-2'>
              <SelectableTag label='หน่วยปฐมภูมิ / รพ.สต.' size='lg' selected={form.appointment.facility === 'pcu'} onClick={() => setAppt('facility')('pcu')} />
              <SelectableTag label='โรงพยาบาล' size='lg' selected={form.appointment.facility === 'hospital'} onClick={() => setAppt('facility')('hospital')} />
            </div>
          </Field>
          <Field label='วันนัดหมายครั้งถัดไป' required>
            <DatePicker
              value={form.appointment.date ? new Date(form.appointment.date) : null}
              onChange={(d) => setAppt('date')(d ? d.toISOString().slice(0, 10) : '')}
              placeholder='เลือกวันที่'
              showLabel={false}
            />
          </Field>
        </div>

        <Field label='รูปแบบการนัดหมาย'>
          <div className='flex items-center gap-2'>
            <SelectableTag
              label='เข้ารับบริการที่คลินิก'
              size='lg'
              selected={form.appointment.mode !== 'telemedicine'}
              onClick={() => setForm((f) => ({ ...f, appointment: { ...f.appointment, mode: 'onsite', telemedStatus: 'none' } }))}
            />
            <SelectableTag label='ปรึกษาผ่าน Telemedicine' size='lg' selected={form.appointment.mode === 'telemedicine'} onClick={() => setAppt('mode')('telemedicine')} />
            {form.appointment.mode === 'telemedicine' && (
              <ColorfulIconBadge style='blue' size='medium' fill='default' icon='videocam' />
            )}
          </div>
        </Field>

        {/* Real session-state workflow — not just a label. Mirrors mobile's
            เข้าสู่ห้องรอตรวจ → telemedDone pattern (MobileTelemedPage), scoped
            to a start/end toggle since there's no shared web call-room UI
            yet (TOR 1.10.7.7). */}
        {form.appointment.mode === 'telemedicine' && (
          <div className='flex items-center gap-3'>
            {form.appointment.telemedStatus === 'completed' ? (
              <ColorfulBadge style='green' size='small' hierarchy='secondary'>ปรึกษาผ่าน Telemedicine เสร็จสิ้นแล้ว</ColorfulBadge>
            ) : form.appointment.telemedStatus === 'started' ? (
              <>
                <ColorfulBadge style='blue' size='small' hierarchy='secondary'>กำลังปรึกษาผ่าน Telemedicine</ColorfulBadge>
                <NeutralSubdueButton size='sm' leadingIcon='call_end' onClick={() => setAppt('telemedStatus')('completed')}>
                  จบการปรึกษา
                </NeutralSubdueButton>
              </>
            ) : (
              <BrandSubdueButton variant='fill' size='sm' leadingIcon='videocam' onClick={() => setAppt('telemedStatus')('started')}>
                เริ่มปรึกษา Telemedicine
              </BrandSubdueButton>
            )}
          </div>
        )}

        <div className='flex items-center gap-3 flex-wrap'>
          <SelectableTag
            label='โรงเรียนพ่อแม่ (การเตรียมตัวคลอด / การเลี้ยงลูกด้วยนมแม่)'
            size='lg'
            selected={form.appointment.parentSchool}
            onClick={() => setAppt('parentSchool')(!form.appointment.parentSchool)}
          />
          {/* สอนการนับลูกดิ้น — manual p.15: fetal movement is usually felt
              from 18-20wk onward, so this only makes sense once the
              pregnancy has reached that point. */}
          {(gestationalAge?.weeks ?? 0) >= 18 && (
            <SelectableTag
              label='สอนการนับลูกดิ้น'
              size='lg'
              selected={form.appointment.kickCountEducation}
              onClick={() => setAppt('kickCountEducation')(!form.appointment.kickCountEducation)}
            />
          )}
        </div>
      </div>
    </StepCard>
  );
};

/* ── Step 7 — ใบฝากครรภ์ ───────────────────────────────────────────
   ANC-card + appointment-slip print preview (TOR 1.10.7.5/.6), same
   print-card shell shape as `Step7Certificate` in TreatmentSteps.jsx. */
export const AncStep7Card = ({ form, setForm, patient, cardPatient, ancHn, visitNo = 1 }) => {
  const gestationalAge = useMemo(() => calculateGestationalAge(form.lmp), [form.lmp]);
  const edc = useMemo(() => calculateEDC(form.lmp), [form.lmp]);
  const riskLevel = resolveAncRiskLevel(form.riskLevel);

  const confirm = () => {
    /* Append this visit onto the patient's real follow-up trend (TOR
       1.10.7.8) so the NEXT visit's Step 1 shows it — not just the
       static mock rows. */
    /* `cardPatient.hn` (patientProfiles.js) is canonical — see
       AncStep1History for why `patient.hn` (MR roster) isn't safe here. */
    /* Urine now comes from the two dipstick grades the legacy exam screen
       records (p.2-10); the older single ปกติ/ผิดปกติ lab field is kept as
       a fallback so visits saved before this change still read correctly. */
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

    /* Persist the pregnancy-level ทะเบียนฝากครรภ์ (legacy §2.2) so the next
       visit opens pre-filled instead of blank — this is what makes visit 2+
       a follow-up rather than a second first-visit. Saved on confirm, the
       same moment the visit itself becomes part of the record. */
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
          <div className='flex items-center justify-between'>
            <span style={{ fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-brandPrimary-default, #007549)' }}>
              บัตรฝากครรภ์ (ANC Card)
            </span>
            {riskLevel && (
              <ColorfulBadge style={riskLevel.value === 'low' ? 'green' : riskLevel.value === 'intermediate' ? 'yellow' : 'red'} size='small' hierarchy='secondary'>
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
            <span>นัดหมายครั้งถัดไป: {formatAncDate(form.appointment.date)}</span>
            <span>สถานที่นัด: {form.appointment.facility === 'pcu' ? 'หน่วยปฐมภูมิ / รพ.สต.' : form.appointment.facility === 'hospital' ? 'โรงพยาบาล' : '—'}</span>
            {form.appointment.mode === 'telemedicine' && (
              <span>Telemedicine: {form.appointment.telemedStatus === 'completed' ? 'ปรึกษาเสร็จสิ้นแล้ว' : form.appointment.telemedStatus === 'started' ? 'กำลังปรึกษา' : 'ยังไม่เริ่ม'}</span>
            )}
          </div>
        </div>

        {form.cardConfirmed ? (
          <div className='flex items-center gap-2' style={{ color: 'var(--text-brandPrimary-default, #007549)', fontSize: 'var(--type-size-sm)' }}>
            <Icon name='check-circle' size={18} />
            ยืนยันและพิมพ์ใบฝากครรภ์แล้ว · {form.cardConfirmedAt}
          </div>
        ) : (
          <button
            type='button'
            onClick={confirm}
            className='self-start inline-flex items-center'
            style={{
              height: 'var(--dim-size-1000, 44px)',
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
              gap: 'var(--dim-space-200, 8px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-brandPrimaryButton-default, #007549)',
              color: 'var(--text-brandPrimaryButton-on-brand, #FFFFFF)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-medium)',
            }}
          >
            <Icon name='check' size={18} />
            ยืนยันและพิมพ์ใบฝากครรภ์
          </button>
        )}
      </div>
    </StepCard>
  );
};
