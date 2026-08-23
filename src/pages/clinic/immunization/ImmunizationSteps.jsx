import React, { useMemo, useRef, useState } from 'react';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import DatePicker from '@/components/forms/DatePicker';
import TimePicker from '@/components/forms/TimePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import FileUploadField from '@/components/forms/FileUploadField';
import TabCapsule from '@/components/tab/TabCapsule';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import GrowthPercentileChart from '@/pages/clinic/immunization/GrowthPercentileChart';
import EpiScheduleMatrix from '@/pages/clinic/immunization/EpiScheduleMatrix';
import CarriedDentalPanel from '@/components/dental/CarriedDentalPanel';
import {
  getActiveVaccines,
  getVaccineById,
  getVaccineLots,
  resolveLotWarning,
  isLotExpired,
  resolveVaccineRoute,
  INJECTION_SITE_OPTIONS,
  resolveInjectionSite,
  describeSchedule,
} from '@/data/immunizationVaccines';
import {
  IMM_CURRENT_USER,
  IMM_NURSES,
  IMM_DOCTORS,
  formatImmDate,
  formatImmDateTime,
  formatAgeYMD,
  formatAgeShort,
  ageInMonths,
  todayIso,
  DELIVERY_TYPES,
  ANC_LAB_OPTIONS,
  ANC_PLACE_SUGGESTIONS,
  FEEDING_OPTIONS,
  NUTRITION_STATUS_OPTIONS,
  GENERAL_EXAM_ITEMS,
  GROWTH_CHART_DEFS,
  GROWTH_REFERENCE,
  buildGrowthPoints,
  evaluatePercentile,
  getGrowthRecords,
  DSPM_DOMAINS,
  resolveDspmBand,
  evaluateDspm,
  buildEpiMatrix,
  summarizeEpi,
  getImmVisitRecords,
  getImmPrintLog,
  logImmPrint,
  IMM_UPLOAD_ACCEPT,
  validateImmUpload,
  IMM_APPOINTMENT_TYPES,
  IMM_LAB_ORDERS,
  IMM_MED_ORDERS,
  NURSE_NOTE_SUGGESTIONS,
  FEEDING_NOTE_SUGGESTIONS,
  GROWTH_NOTE_SUGGESTIONS,
  DSPM_NOTE_SUGGESTIONS,
  REACTION_SUGGESTIONS,
  EXAM_NOTE_SUGGESTIONS,
  ILLNESS_HISTORY_SUGGESTIONS,
  ALLERGY_NOTE_SUGGESTIONS,
  ORDER_NOTE_SUGGESTIONS,
} from '@/data/immunizationClinic';

/* ImmunizationSteps — เนื้อหาแต่ละขั้นตอนของใบบันทึกสุขภาพเด็กดี
   (TOR 1.10.9.1/.3/.4/.5/.7 + IIS 1.11.2.1) เสียบเข้า TreatmentFormShell
   โดย ImmunizationFormPage. ใช้ section convention เดียวกับ AncSteps /
   MentalHealthSteps (TopicHeader + AssessmentCard + capsule jump-tabs).

   กฎจากคู่มือ HCIS ที่บังคับในไฟล์นี้:
     • น้ำหนักเป็นค่าบังคับ — บันทึกไม่ได้ถ้าเว้นว่าง (validate ที่ขั้นตอนสรุป)
     • วัน-เวลามาตรวจแก้ไขไม่ได้ (read-only)
     • Lot ที่หมดอายุแล้ว → บล็อคการบันทึกเข็มนั้น; ใกล้หมดอายุ → เตือน
     • การแปลผล percentile และผล DSPM คำนวณอัตโนมัติ ไม่ให้พิมพ์เอง */

/* ── shared bits ───────────────────────────────────────────────────── */
const TopicHeader = ({ icon, children }) => (
  <div className='flex items-center gap-2 w-full'>
    <span className='text-brand-500'><Icon name={icon} size={20} /></span>
    <h2 className='text-base font-bold text-brand-500'>{children}</h2>
  </div>
);

const Field = ({ label, required, children, hint, hintTone, width }) => (
  <div className='flex flex-col gap-1.5 min-w-0' style={{ flex: width ? `0 0 ${width}px` : '1 1 0', minWidth: 180 }}>
    <div className='flex items-center text-sm text-ink leading-snug'>
      <span>{label}</span>
      {required && <span className='ml-0.5' style={{ color: 'var(--text-input-require)' }}>*</span>}
    </div>
    {children}
    {hint && (
      <span style={{
        color: hintTone === 'error'
          ? 'var(--text-danger-default, #B91C1C)'
          : hintTone === 'warning'
            ? 'var(--text-warning-default, #C2410C)'
            : 'var(--text-content-quaternary, #ADB2B7)',
        fontSize: 'var(--type-size-xs)',
      }}>
        {hint}
      </span>
    )}
  </div>
);

const StepCard = ({ children }) => (
  <section className='flex flex-col' style={{ gap: 'var(--dim-space-600)' }}>{children}</section>
);

const AssessmentCard = React.forwardRef(({ children }, ref) => (
  <div ref={ref} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)', scrollMarginTop: 110 }}>
    {children}
  </div>
));
AssessmentCard.displayName = 'AssessmentCard';

const Banner = ({ tone = 'info', icon = 'info', children }) => {
  const palette = {
    info:    { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)' },
    warning: { bg: 'var(--surface-warning-quaternary, #FFF9F0)',      fg: 'var(--text-warning-default, #C2410C)' },
    danger:  { bg: 'var(--surface-danger-quaternary, #FFF0F0)',       fg: 'var(--text-danger-default, #B91C1C)' },
    neutral: { bg: 'var(--surface-card-quaternary, #F9FBFB)',         fg: 'var(--text-content-secondary, #636B72)' },
  }[tone];
  return (
    <div
      className='flex items-start gap-2 w-full'
      style={{
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        background: palette.bg,
        color: palette.fg,
        fontSize: 'var(--type-size-sm)',
      }}
    >
      <Icon name={icon} size={18} />
      <span className='min-w-0'>{children}</span>
    </div>
  );
};

const ReadOnlyRow = ({ label, children }) => (
  <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
    <span style={{ width: 180, flexShrink: 0, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>{label}</span>
    <span className='min-w-0' style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>{children}</span>
  </div>
);

const AuditLine = ({ children }) => (
  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>{children}</span>
);

const SectionTabs = ({ sections, active, onJump }) => (
  <div className='flex items-center gap-2 flex-wrap'>
    {sections.map((s) => (
      <TabCapsule key={s.key} variant='filter' label={s.label} selected={active === s.key} onClick={() => onJump(s.key)} />
    ))}
  </div>
);

const useSectionJump = (initial) => {
  const [activeSection, setActiveSection] = useState(initial);
  const sectionRefs = useRef({});
  const jumpToSection = (key) => {
    setActiveSection(key);
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return { activeSection, sectionRefs, jumpToSection };
};

/* ── Step 1 — ข้อมูลทั่วไป + ผลซักประวัติพยาบาล (1.10.9.1 / 1.10.9.3) ── */
const STEP1_SECTIONS = [
  { key: 'visit',   label: 'ข้อมูลการมารับบริการ' },
  { key: 'intake',  label: 'ผลการซักประวัติพยาบาล' },
  { key: 'history', label: 'ประวัติการตรวจครั้งก่อน' },
];

export const ImmStep1General = ({ form, setForm, immHn, child, intake, registration, queueRow, locked }) => {
  const { activeSection, sectionRefs, jumpToSection } = useSectionJump('visit');
  const visitHistory = useMemo(() => getImmVisitRecords(immHn), [immHn]);
  const epi = useMemo(() => summarizeEpi(immHn), [immHn]);

  const vitalsPairs = [
    ['อุณหภูมิ', `${intake.vitals.temp} °C`],
    ['ชีพจร', `${intake.vitals.hr} /นาที`],
    ['อัตราหายใจ', `${intake.vitals.rr} /นาที`],
    ['SpO₂', `${intake.vitals.spo2} %`],
    ['น้ำหนัก', intake.vitals.weight ? `${intake.vitals.weight} กก.` : '—'],
    ['ส่วนสูง/ความยาว', intake.vitals.height ? `${intake.vitals.height} ซม.` : '—'],
  ];

  return (
    <StepCard>
      <SectionTabs sections={STEP1_SECTIONS} active={activeSection} onJump={jumpToSection} />

      <AssessmentCard ref={(el) => { sectionRefs.current.visit = el; }}>
        <TopicHeader icon='badge'>ข้อมูลทั่วไปผู้รับบริการ</TopicHeader>
        <div
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-200, 8px)',
            paddingTop: 'var(--dim-space-400, 16px)',
            paddingBottom: 'var(--dim-space-400, 16px)',
            paddingLeft: 'var(--dim-space-400, 16px)',
            paddingRight: 'var(--dim-space-400, 16px)',
            borderRadius: 'var(--dim-radius-200, 8px)',
            background: 'var(--surface-card-quaternary, #F9FBFB)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
          }}
        >
          <ReadOnlyRow label='ชื่อ-นามสกุล'>{child?.fullName || '—'}</ReadOnlyRow>
          <ReadOnlyRow label='HN / เลขบัตรประชาชน'>{immHn} · {child?.nationalId || '—'}</ReadOnlyRow>
          <ReadOnlyRow label='วันเกิด / อายุ'>
            {formatImmDate(child?.birthDate)} · {formatAgeYMD(child?.birthDate)}
          </ReadOnlyRow>
          <ReadOnlyRow label='สิทธิการรักษา'>{child?.insurance || '—'}</ReadOnlyRow>
          <ReadOnlyRow label='ทะเบียนสร้างเสริมภูมิคุ้มกัน'>
            {registration
              ? `${registration.epiNumber} · ลงทะเบียน ${formatImmDate(registration.registeredDate)}`
              : 'ยังไม่ได้ลงทะเบียน — บันทึกได้ที่หน้าทะเบียนผู้รับบริการ'}
          </ReadOnlyRow>
          <ReadOnlyRow label='ผู้ปกครอง'>
            {(registration?.guardians || []).length > 0
              ? registration.guardians.map((g) => `${g.name} (${g.phone || 'ไม่ระบุเบอร์'})`).join(' · ')
              : '—'}
          </ReadOnlyRow>
          <ReadOnlyRow label='สถานะวัคซีน EPI'>
            <ColorfulBadge style={epi.style} size='small' hierarchy='secondary'>{epi.label}</ColorfulBadge>
          </ReadOnlyRow>
          {/* วัน-เวลามาตรวจ แก้ไขไม่ได้ตามคู่มือ HCIS */}
          <ReadOnlyRow label='วัน-เวลามาตรวจ'>
            {formatImmDateTime(queueRow?.arrivedAt) } <AuditLine>(แก้ไขไม่ได้)</AuditLine>
          </ReadOnlyRow>
          <ReadOnlyRow label='เหตุผลที่มารับบริการ'>{queueRow?.reason || '—'}</ReadOnlyRow>
        </div>
      </AssessmentCard>

      <AssessmentCard ref={(el) => { sectionRefs.current.intake = el; }}>
        <TopicHeader icon='clipboard'>ผลการซักประวัติจากพยาบาล (อ่านอย่างเดียว)</TopicHeader>
        <div
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-300, 12px)',
            paddingTop: 'var(--dim-space-400, 16px)',
            paddingBottom: 'var(--dim-space-400, 16px)',
            paddingLeft: 'var(--dim-space-400, 16px)',
            paddingRight: 'var(--dim-space-400, 16px)',
            borderRadius: 'var(--dim-radius-200, 8px)',
            background: 'var(--surface-card-quaternary, #F9FBFB)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
          }}
        >
          <div className='flex items-center gap-3 flex-wrap'>
            {vitalsPairs.map(([label, value]) => (
              <span key={label} className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-sm)' }}>
                <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>{label}</span>
                <span style={{ fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>{value}</span>
              </span>
            ))}
          </div>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <AuditLine>บันทึกพยาบาลที่จุดคัดกรอง</AuditLine>
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>{intake.nurseNote}</span>
          </div>
          <div className='flex items-center gap-3 flex-wrap'>
            <AuditLine>แพ้ยา</AuditLine>
            {intake.drugAllergies.map((a) => (
              <ColorfulBadge key={a} style={a.startsWith('ไม่มี') ? 'green' : 'red'} size='small' hierarchy='secondary'>{a}</ColorfulBadge>
            ))}
            <AuditLine>โรคประจำตัว</AuditLine>
            {intake.chronicDiseases.map((d) => (
              <ColorfulBadge key={d} style={d.startsWith('ไม่มี') ? 'green' : 'orange'} size='small' hierarchy='secondary'>{d}</ColorfulBadge>
            ))}
          </div>
        </div>

        <TopicHeader icon='edit_note'>บันทึกเพิ่มเติมของผู้ตรวจ</TopicHeader>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={form.nurseNote}
          onChange={(e) => setForm((f) => ({ ...f, nurseNote: e.target.value }))}
          suggestions={NURSE_NOTE_SUGGESTIONS}
          minChars={3}
          placeholder='บันทึกอาการ/ข้อสังเกตเพิ่มเติมก่อนให้บริการ'
        />
      </AssessmentCard>

      <AssessmentCard ref={(el) => { sectionRefs.current.history = el; }}>
        <TopicHeader icon='history'>ประวัติการตรวจสุขภาพเด็กดีครั้งก่อนหน้า</TopicHeader>
        <Table
          columns={[
            { key: 'savedAt', label: 'วันที่บันทึก', render: (r) => formatImmDateTime(r.savedAt) },
            { key: 'weight',  label: 'น้ำหนัก (กก.)', render: (r) => r.growth?.weight || '—' },
            { key: 'height',  label: 'ส่วนสูง (ซม.)', render: (r) => r.growth?.height || '—' },
            { key: 'doses',   label: 'วัคซีนที่ให้', flex: true, minWidth: 220, render: (r) => ((r.todayDoses || []).map((d) => `${getVaccineById(d.vaccineId)?.abbr || ''} เข็ม ${d.seq}`).join(', ') || '—') },
            { key: 'savedBy', label: 'ผู้บันทึก', flex: true, minWidth: 160 },
          ]}
          rows={visitHistory}
          rowKey={(r) => r.savedAt}
          emptyMessage='ยังไม่มีประวัติการตรวจในระบบ — ครั้งนี้เป็นการบันทึกครั้งแรก'
        />
      </AssessmentCard>
    </StepCard>
  );
};

/* ── Step 2 — ประวัติฝากครรภ์และคลอด + โภชนาการ (1.10.9.7) ─────────── */
export const ImmStep2BirthNutrition = ({ form, setForm, child, locked }) => {
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const toggleFeeding = (key) => {
    if (locked) return;
    setForm((f) => ({ ...f, feeding: { ...f.feeding, [key]: !f.feeding?.[key] } }));
  };

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='pregnant_woman'>ประวัติฝากครรภ์และการคลอด</TopicHeader>
        <Banner tone='neutral' icon='info'>
          ข้อมูลจากสมุดบันทึกสุขภาพแม่และเด็ก (สมุดสีชมพู) — หากคลอดที่โรงพยาบาลอื่น
          ให้คีย์จากสำเนาใบสรุปการคลอดที่ผู้ปกครองนำมา
        </Banner>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='ครรภ์ที่'>
            <InputField
              showLabel={false} showHelperText={false} showLeadingIcon={false}
              disabled={locked}
              value={form.ancGravida}
              onChange={(v) => set('ancGravida')(v)}
              placeholder='เช่น 2'
              type='number'
            />
          </Field>
          <Field label='สถานที่ฝากครรภ์'>
            <Select
              showLabel={false} searchable size='lg'
              disabled={locked}
              value={form.ancPlace}
              onChange={set('ancPlace')}
              options={ANC_PLACE_SUGGESTIONS.map((p) => ({ value: p, label: p }))}
              placeholder='เลือก/พิมพ์สถานที่ฝากครรภ์'
            />
          </Field>
          <Field label='การคลอด'>
            <Select
              showLabel={false} searchable={false} size='lg'
              disabled={locked}
              value={form.deliveryType}
              onChange={set('deliveryType')}
              options={DELIVERY_TYPES}
              placeholder='เลือกวิธีการคลอด'
            />
          </Field>
          <Field label='น้ำหนักแรกเกิด (กรัม)'>
            <InputField
              showLabel={false} showHelperText={false} showLeadingIcon={false}
              disabled={locked}
              value={form.birthWeight}
              onChange={(v) => set('birthWeight')(v)}
              placeholder={child?.birthWeight ? String(Math.round(child.birthWeight * 1000)) : '3000'}
              type='number'
            />
          </Field>
        </div>

        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='ผล VDRL ของมารดา'>
            <Select
              showLabel={false} searchable={false} size='lg'
              disabled={locked}
              value={form.vdrl} onChange={set('vdrl')}
              options={ANC_LAB_OPTIONS} placeholder='เลือกผล'
            />
          </Field>
          <Field label='ผลตับอักเสบบี (HBsAg) ของมารดา'>
            <Select
              showLabel={false} searchable={false} size='lg'
              disabled={locked}
              value={form.hbsAg} onChange={set('hbsAg')}
              options={ANC_LAB_OPTIONS} placeholder='เลือกผล'
            />
          </Field>
          <Field label='ผล Anti-HIV ของมารดา'>
            <Select
              showLabel={false} searchable={false} size='lg'
              disabled={locked}
              value={form.hiv} onChange={set('hiv')}
              options={ANC_LAB_OPTIONS} placeholder='เลือกผล'
            />
          </Field>
        </div>

        {form.hbsAg === 'positive' && (
          <Banner tone='warning' icon='warning'>
            มารดามีผล HBsAg เป็นบวก — เด็กต้องได้รับ HBIG ภายใน 12 ชั่วโมงหลังคลอด
            และวัคซีนตับอักเสบบีเข็มที่ 2 เมื่ออายุ 1 เดือน (ตรวจสอบในตาราง EPI ขั้นตอนที่ 5)
          </Banner>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='restaurant'>โภชนาการ</TopicHeader>
        <div className='flex items-center gap-2 flex-wrap'>
          {FEEDING_OPTIONS.map((o) => (
            <SelectableTag
              key={o.key}
              label={o.label}
              size='lg'
              selected={!!form.feeding?.[o.key]}
              onClick={() => toggleFeeding(o.key)}
            />
          ))}
        </div>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={form.feedingNote}
          onChange={(e) => set('feedingNote')(e.target.value)}
          suggestions={FEEDING_NOTE_SUGGESTIONS}
          minChars={3}
          placeholder='รายละเอียดการกินนม/อาหารเสริม เช่น จำนวนมื้อ ปริมาณ ปัญหาที่พบ'
        />
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='ภาวะโภชนาการ (แปลผลโดยผู้ตรวจ)'>
            <Select
              showLabel={false} searchable={false} size='lg'
              disabled={locked}
              value={form.nutritionStatus}
              onChange={set('nutritionStatus')}
              options={NUTRITION_STATUS_OPTIONS}
              placeholder='เลือกภาวะโภชนาการ'
            />
          </Field>
        </div>
        {(form.nutritionStatus === 'underweight' || form.nutritionStatus === 'stunted') && (
          <Banner tone='warning' icon='warning'>
            ภาวะโภชนาการต่ำกว่าเกณฑ์ — ให้คำแนะนำผู้ปกครองและนัดชั่งน้ำหนักซ้ำภายใน 1 เดือน (ขั้นตอนที่ 8)
          </Banner>
        )}
      </div>
    </StepCard>
  );
};

/* ── Step 3 — การเจริญเติบโต + กราฟ percentile (1.10.9.7) ──────────── */
export const ImmStep3Growth = ({ form, setForm, immHn, child, locked }) => {
  const [chartKey, setChartKey] = useState(GROWTH_CHART_DEFS[0].key);
  const setGrowth = (key) => (value) => {
    if (locked) return;
    setForm((f) => ({ ...f, growth: { ...f.growth, [key]: value } }));
  };

  const records = useMemo(() => {
    const base = getGrowthRecords(immHn);
    /* ค่าที่กำลังกรอกในวันนี้ถูกวางบนกราฟทันที เพื่อให้เห็น percentile สด ๆ */
    if (form.growth?.weight || form.growth?.height || form.growth?.headCirc) {
      return [...base, {
        date: todayIso(),
        weight: Number(form.growth.weight) || null,
        height: Number(form.growth.height) || null,
        headCirc: Number(form.growth.headCirc) || null,
        chestCirc: Number(form.growth.chestCirc) || null,
        draft: true,
      }];
    }
    return base;
  }, [immHn, form.growth]);

  const months = ageInMonths(child?.birthDate);
  const availableCharts = GROWTH_CHART_DEFS.filter((d) => {
    if (months == null) return true;
    if (d.maxX != null && d.minX == null && months > d.maxX + 6) return false;
    if (d.minX != null && months < d.minX) return false;
    return true;
  });
  const activeDef = availableCharts.find((d) => d.key === chartKey) || availableCharts[0] || GROWTH_CHART_DEFS[0];
  const reference = GROWTH_REFERENCE[activeDef.referenceKey]?.[child?.sex] || [];
  const points = buildGrowthPoints(activeDef, records, child?.birthDate);
  const lastPoint = points[points.length - 1];
  const evaluation = lastPoint ? evaluatePercentile(reference, lastPoint.x, lastPoint.y) : null;

  const weightMissing = !String(form.growth?.weight || '').trim();

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='monitor_weight'>การเจริญเติบโตวันนี้</TopicHeader>
        {weightMissing && !locked && (
          <Banner tone='warning' icon='warning'>
            น้ำหนักเป็นค่าบังคับตามคู่มือระบบงานสร้างเสริมภูมิคุ้มกันโรค —
            ต้องกรอกก่อนจึงจะบันทึกการตรวจได้
          </Banner>
        )}
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field
            label='น้ำหนัก (กก.)'
            required
            hint={weightMissing ? 'กรุณากรอกน้ำหนัก' : undefined}
            hintTone={weightMissing ? 'error' : undefined}
          >
            <InputField
              showLabel={false} showHelperText={false} showLeadingIcon={false}
              disabled={locked}
              error={weightMissing ? 'required' : undefined}
              value={form.growth?.weight}
              onChange={(v) => setGrowth('weight')(v)}
              placeholder='เช่น 7.8'
              type='number'
            />
          </Field>
          <Field label='ส่วนสูง / ความยาว (ซม.)'>
            <InputField
              showLabel={false} showHelperText={false} showLeadingIcon={false}
              disabled={locked}
              value={form.growth?.height}
              onChange={(v) => setGrowth('height')(v)}
              placeholder='เช่น 67.0'
              type='number'
            />
          </Field>
          <Field label='เส้นรอบศีรษะ (ซม.)'>
            <InputField
              showLabel={false} showHelperText={false} showLeadingIcon={false}
              disabled={locked}
              value={form.growth?.headCirc}
              onChange={(v) => setGrowth('headCirc')(v)}
              placeholder='เช่น 43.0'
              type='number'
            />
          </Field>
          <Field label='เส้นรอบอก (ซม.)'>
            <InputField
              showLabel={false} showHelperText={false} showLeadingIcon={false}
              disabled={locked}
              value={form.growth?.chestCirc}
              onChange={(v) => setGrowth('chestCirc')(v)}
              placeholder='เช่น 42.5'
              type='number'
            />
          </Field>
        </div>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='กระหม่อมหน้า'>
            <InputField
              showLabel={false} showHelperText={false} showLeadingIcon={false}
              disabled={locked}
              value={form.growth?.fontanelleAnterior}
              onChange={(v) => setGrowth('fontanelleAnterior')(v)}
              placeholder='เช่น 1.5x1.5 ซม. ปกติ / ปิดแล้ว'
            />
          </Field>
          <Field label='กระหม่อมหลัง'>
            <InputField
              showLabel={false} showHelperText={false} showLeadingIcon={false}
              disabled={locked}
              value={form.growth?.fontanellePosterior}
              onChange={(v) => setGrowth('fontanellePosterior')(v)}
              placeholder='เช่น ปิดแล้ว'
            />
          </Field>
        </div>

        {evaluation && (
          <div className='flex items-center gap-3 flex-wrap'>
            <ColorfulBadge style={evaluation.style} size='small' hierarchy='secondary'>
              แปลผลอัตโนมัติ: {evaluation.label} · percentile ที่ {evaluation.percentile} (z = {evaluation.z})
            </ColorfulBadge>
            <AuditLine>เทียบเกณฑ์ {activeDef.title} เพศ{child?.sex}</AuditLine>
          </div>
        )}

        <SuggestibleTextarea
          voice
          disabled={locked}
          value={form.growthNote}
          onChange={(e) => setForm((f) => ({ ...f, growthNote: e.target.value }))}
          suggestions={GROWTH_NOTE_SUGGESTIONS}
          minChars={3}
          placeholder='ข้อสังเกต/คำแนะนำเรื่องการเจริญเติบโต'
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='show_chart'>กราฟการเจริญเติบโต</TopicHeader>
        <div className='flex items-center gap-2 flex-wrap'>
          {availableCharts.map((d) => (
            <TabCapsule
              key={d.key}
              variant='filter'
              label={d.title}
              selected={activeDef.key === d.key}
              onClick={() => setChartKey(d.key)}
            />
          ))}
        </div>
        <GrowthPercentileChart
          title={activeDef.title}
          unit={activeDef.unit}
          axisLabel={activeDef.axisLabel}
          reference={reference}
          points={points}
          latestEvaluation={evaluation}
          emptyMessage='ยังไม่มีข้อมูลการเจริญเติบโตของเด็กในช่วงอายุนี้ — กรอกน้ำหนัก/ส่วนสูงด้านบนเพื่อลงจุดแรก'
        />
        <AuditLine>
          เกณฑ์อ้างอิงเป็นชุดย่อสำหรับต้นแบบ (P3 / P50 / P97) — ตาราง LMS ฉบับเต็มของกรมอนามัยรอเชื่อมกับ backend
        </AuditLine>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='table_chart'>ตารางบันทึกการเจริญเติบโตย้อนหลัง</TopicHeader>
        <Table
          columns={[
            { key: 'date', label: 'วันที่', render: (r) => formatImmDate(r.date) },
            { key: 'age', label: 'อายุ', render: (r) => formatAgeShort(child?.birthDate, r.date) },
            { key: 'weight', label: 'น้ำหนัก (กก.)', render: (r) => r.weight ?? '—' },
            { key: 'height', label: 'ส่วนสูง (ซม.)', render: (r) => r.height ?? '—' },
            { key: 'headCirc', label: 'รอบศีรษะ (ซม.)', render: (r) => r.headCirc ?? '—' },
            { key: 'chestCirc', label: 'รอบอก (ซม.)', render: (r) => r.chestCirc ?? '—' },
            {
              key: 'note', label: 'สถานะ', sortable: false,
              render: (r) => (r.draft
                ? <ColorfulBadge style='blue' size='small' hierarchy='secondary'>กำลังบันทึกครั้งนี้</ColorfulBadge>
                : <ColorfulBadge style='grey' size='small' hierarchy='secondary'>บันทึกแล้ว</ColorfulBadge>),
            },
          ]}
          rows={[...records].reverse()}
          rowKey={(r) => `${r.date}-${r.weight}`}
          emptyMessage='ยังไม่มีบันทึกการเจริญเติบโต'
        />
      </div>
    </StepCard>
  );
};

/* ── Step 4 — พัฒนาการเด็ก DSPM (1.10.9.7) ─────────────────────────── */
export const ImmStep4Development = ({ form, setForm, child, locked }) => {
  const band = useMemo(() => resolveDspmBand(child?.birthDate), [child?.birthDate]);
  const result = useMemo(() => evaluateDspm(band, form.dspmAnswers), [band, form.dspmAnswers]);

  const answer = (key, pass) => {
    if (locked) return;
    setForm((f) => ({
      ...f,
      dspmAnswers: { ...f.dspmAnswers, [key]: pass },
      dspmAssessor: f.dspmAssessor || IMM_CURRENT_USER,
      dspmAssessedAt: f.dspmAssessedAt || new Date().toISOString(),
    }));
  };

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='child_care'>ประเมินพัฒนาการตามช่วงอายุ (DSPM)</TopicHeader>
        <Banner tone='neutral' icon='info'>
          ช่วงอายุที่ระบบเลือกให้อัตโนมัติ: <strong>{band.label}</strong> (อายุปัจจุบัน {formatAgeShort(child?.birthDate)})
          — ประเมิน 5 ด้าน: {DSPM_DOMAINS.map((d) => d.key).join(' / ')}
        </Banner>

        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {band.items.map((item, idx) => {
            const key = `${band.months}-${idx}`;
            const value = form.dspmAnswers?.[key];
            const domain = DSPM_DOMAINS.find((d) => d.key === item.domain);
            return (
              <div
                key={key}
                className='flex items-center justify-between gap-4 w-full flex-wrap'
                style={{
                  paddingTop: 'var(--dim-space-300, 12px)',
                  paddingBottom: 'var(--dim-space-300, 12px)',
                  paddingLeft: 'var(--dim-space-300, 12px)',
                  paddingRight: 'var(--dim-space-300, 12px)',
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
                  background: 'var(--surface-card-100, #FFFFFF)',
                }}
              >
                <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)', maxWidth: 560 }}>
                  <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>{domain?.label || item.domain}</ColorfulBadge>
                  <span className='text-sm' style={{ color: 'var(--text-content-default, #363B3F)' }}>{item.text}</span>
                </div>
                <div className='flex items-center gap-2 shrink-0 flex-wrap'>
                  <SelectableTag label='ผ่าน' size='md' selected={value === true} onClick={() => answer(key, true)} />
                  <SelectableTag label='ไม่ผ่าน' size='md' selected={value === false} onClick={() => answer(key, false)} />
                </div>
              </div>
            );
          })}
        </div>

        <div className='flex items-center gap-3 flex-wrap'>
          <ColorfulBadge style={result.style} size='small' hierarchy='secondary' width='hug' maxWidth={640}>
            ประเมินผลอัตโนมัติ: {result.label}
          </ColorfulBadge>
          {form.dspmAssessor && (
            <AuditLine>
              ผู้ประเมิน {form.dspmAssessor}{form.dspmAssessedAt ? ` · ${formatImmDateTime(form.dspmAssessedAt)}` : ''}
            </AuditLine>
          )}
        </div>

        {result.refer && (
          <Banner tone='warning' icon='warning'>
            สงสัยพัฒนาการล่าช้า — แนะนำสอนผู้ปกครองกระตุ้นพัฒนาการตามคู่มือ DSPM
            และนัดประเมินซ้ำภายใน 1 เดือน หากยังไม่ผ่านให้ส่งต่อคลินิกกระตุ้นพัฒนาการ
          </Banner>
        )}

        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='ผู้ประเมิน'>
            <Select
              showLabel={false} searchable={false} size='lg'
              disabled={locked}
              value={form.dspmAssessor}
              onChange={(v) => setForm((f) => ({ ...f, dspmAssessor: v }))}
              options={IMM_NURSES.map((n) => ({ value: n, label: n }))}
              placeholder='เลือกผู้ประเมิน'
            />
          </Field>
        </div>

        <SelectableTag
          label='ส่งต่อเพื่อกระตุ้น/ประเมินพัฒนาการโดยละเอียด'
          size='lg'
          selected={!!form.dspmReferral}
          onClick={() => { if (!locked) setForm((f) => ({ ...f, dspmReferral: !f.dspmReferral })); }}
        />

        <SuggestibleTextarea
          voice
          disabled={locked}
          value={form.dspmNote}
          onChange={(e) => setForm((f) => ({ ...f, dspmNote: e.target.value }))}
          suggestions={DSPM_NOTE_SUGGESTIONS}
          minChars={3}
          placeholder='รายละเอียดการกระตุ้นพัฒนาการ / คำแนะนำแก่ผู้ปกครอง / การส่งต่อ'
        />
        <AuditLine>
          เกณฑ์ข้อประเมินในต้นแบบนี้เป็นชุดย่อของ DSPM — เกณฑ์ฉบับเต็มรอเชื่อมกับ backend
        </AuditLine>
      </div>
    </StepCard>
  );
};

/* ── Step 5 — ให้วัคซีนวันนี้ (1.11.2.1 + 1.10.9.7) ────────────────── */
const emptyTodayDose = () => ({
  key: `td-${Date.now()}`,
  vaccineId: '', seq: 1, date: todayIso(), time: '',
  site: '', lotNo: '', expiry: '', vialNo: '',
  place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, facilityName: '', reference: '',
  immediateReaction: '', reactionOnsetTime: '',
  nurse: IMM_CURRENT_USER, claimSubmitted: false,
});

export const ImmStep5Vaccine = ({ form, setForm, immHn, child, locked }) => {
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState([]);
  const [removeTarget, setRemoveTarget] = useState(null);

  const matrix = useMemo(() => buildEpiMatrix(immHn), [immHn]);
  const vaccines = getActiveVaccines();
  const selectedVaccine = editing?.vaccineId ? getVaccineById(editing.vaccineId) : null;
  const lots = selectedVaccine ? getVaccineLots(selectedVaccine.id) : [];
  const selectedLot = lots.find((l) => l.lotNo === editing?.lotNo) || null;
  const lotWarning = resolveLotWarning(selectedLot);

  const openNew = (prefill) => {
    setErrors([]);
    setEditing({ ...emptyTodayDose(), ...(prefill || {}) });
  };

  const openEdit = (dose) => {
    setErrors([]);
    setEditing({ ...dose });
  };

  const validate = (d) => {
    const errs = [];
    if (!d.vaccineId) errs.push('กรุณาเลือกวัคซีน');
    if (!d.seq) errs.push('กรุณาระบุครั้งที่/เข็มที่');
    if (!d.date) errs.push('กรุณาระบุวันที่รับวัคซีน');
    if (!d.time) errs.push('กรุณาระบุเวลาที่ให้วัคซีน');
    if (!d.site) errs.push('กรุณาระบุตำแหน่งที่ให้วัคซีน');
    if (!d.lotNo) errs.push('กรุณาระบุ Lot No. (เลือกจากคลัง หรือคีย์เองหากคลังไม่มีข้อมูล)');
    if (!d.expiry) errs.push('กรุณาระบุวันหมดอายุของวัคซีน');
    if (d.expiry && isLotExpired(d.expiry)) errs.push('วันหมดอายุของวัคซีนเลยวันที่ปัจจุบันแล้ว — ห้ามใช้และบันทึกไม่ได้');
    if (!d.nurse) errs.push('กรุณาระบุพยาบาลผู้ให้วัคซีน');
    if (d.otherFacility && !d.facilityName) errs.push('ระบุชื่อสถานพยาบาลที่ให้วัคซีน (กรณีรับจากหน่วยงานอื่น)');
    if (d.immediateReaction && !d.reactionOnsetTime) errs.push('กรอกอาการไม่พึงประสงค์แล้ว ต้องระบุเวลาที่เริ่มมีอาการด้วย');
    return errs;
  };

  const commit = () => {
    const errs = validate(editing);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setForm((f) => {
      const list = f.todayDoses || [];
      const idx = list.findIndex((d) => d.key === editing.key);
      const next = idx >= 0
        ? list.map((d) => (d.key === editing.key ? editing : d))
        : [...list, editing];
      return { ...f, todayDoses: next };
    });
    setEditing(null);
    setErrors([]);
  };

  const confirmRemove = () => {
    setForm((f) => ({ ...f, todayDoses: (f.todayDoses || []).filter((d) => d.key !== removeTarget.key) }));
    setRemoveTarget(null);
  };

  const setField = (key) => (value) => setEditing((d) => ({ ...d, [key]: value }));

  const onPickVaccine = (vaccineId) => {
    const v = getVaccineById(vaccineId);
    const nextSeq = (() => {
      const row = matrix.find((m) => m.vaccineId === vaccineId);
      const pending = row?.cells.find((c) => c.status !== 'done');
      return pending?.seq || 1;
    })();
    setEditing((d) => ({
      ...d,
      vaccineId,
      seq: nextSeq,
      lotNo: '',
      expiry: '',
      vialNo: '',
      site: v?.route === 'PO' ? 'oral' : d.site,
    }));
  };

  const onPickLot = (lotNo) => {
    const lot = lots.find((l) => l.lotNo === lotNo);
    setEditing((d) => ({ ...d, lotNo, expiry: lot?.expiry || d.expiry }));
  };

  const dueCells = matrix.flatMap((row) => row.cells
    .filter((c) => c.status === 'due' || c.status === 'overdue')
    .map((c) => ({ ...c, vaccineId: row.vaccineId, abbr: row.abbr, nameTh: row.nameTh })));

  return (
    <StepCard>
      <Popup
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title='ยกเลิกรายการวัคซีนที่จะให้วันนี้'
        subtitle={removeTarget ? `${getVaccineById(removeTarget.vaccineId)?.abbr || ''} เข็มที่ ${removeTarget.seq}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setRemoveTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกรายการ', onClick: confirmRemove, tone: 'danger' }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
          รายการนี้ยังไม่ถูกบันทึกลงสมุดวัคซีน — การยกเลิกจะเอาออกจากใบบันทึกครั้งนี้เท่านั้น
        </span>
      </Popup>

      <Popup
        open={!!editing}
        onClose={() => setEditing(null)}
        title={form.todayDoses?.some((d) => d.key === editing?.key) ? 'แก้ไขการให้วัคซีน' : 'บันทึกการให้วัคซีน'}
        subtitle={`${child?.fullName || ''} · HN ${immHn} · อายุ ${formatAgeYMD(child?.birthDate)}`}
        size='large'
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setEditing(null) }}
        primaryAction={{ label: 'บันทึกรายการ', onClick: commit }}
      >
        {editing && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            {errors.length > 0 && (
              <Banner tone='danger' icon='error'>
                <span className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                  {errors.map((e) => <span key={e}>• {e}</span>)}
                </span>
              </Banner>
            )}

            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field label='ชื่อวัคซีน' required>
                <Select
                  showLabel={false} searchable size='lg'
                  value={editing.vaccineId}
                  onChange={onPickVaccine}
                  options={vaccines.map((v) => ({ value: v.id, label: `${v.abbr} — ${v.nameTh}` }))}
                  placeholder='เลือกวัคซีน'
                />
              </Field>
              <Field label='ครั้งที่ / เข็มที่' required width={140}>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  value={String(editing.seq)}
                  onChange={(v) => setField('seq')(Number(v))}
                  options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `ครั้งที่ ${n}` }))}
                  placeholder='เลือก'
                />
              </Field>
              <Field label='วันที่รับวัคซีน' required>
                <DatePicker
                  showLabel={false}
                  value={editing.date ? new Date(editing.date) : null}
                  onChange={(d) => setField('date')(d ? d.toISOString().slice(0, 10) : '')}
                  placeholder='เลือกวันที่'
                />
              </Field>
              <Field label='เวลาที่ให้' required width={160}>
                <TimePicker
                  showLabel={false}
                  value={editing.time}
                  onChange={setField('time')}
                  placeholder='--:--'
                />
              </Field>
            </div>

            {selectedVaccine && (
              <Banner tone='neutral' icon='info'>
                วิธีบริหาร {resolveVaccineRoute(selectedVaccine.route)} · ขนาด {selectedVaccine.dose} ·
                โปรแกรม EPI: {describeSchedule(selectedVaccine)} · อายุปัจจุบัน {formatAgeShort(child?.birthDate)}
              </Banner>
            )}

            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field label='ตำแหน่งที่ให้' required>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  value={editing.site}
                  onChange={setField('site')}
                  options={INJECTION_SITE_OPTIONS}
                  placeholder='เลือกตำแหน่ง'
                />
              </Field>
              <Field
                label='Lot No. (จากคลัง)'
                required
                hint={lotWarning ? lotWarning.message : (selectedVaccine && lots.length === 0 ? 'คลังไม่มี lot ของวัคซีนนี้ — คีย์ Lot No. เองในช่องถัดไป' : undefined)}
                hintTone={lotWarning ? (lotWarning.blocking ? 'error' : 'warning') : undefined}
              >
                <Select
                  showLabel={false} searchable size='lg'
                  value={editing.lotNo}
                  onChange={onPickLot}
                  options={lots.map((l) => ({ value: l.lotNo, label: `${l.lotNo} · หมดอายุ ${formatImmDate(l.expiry)} · คงเหลือ ${l.remaining}` }))}
                  placeholder={lots.length === 0 ? 'คลังไม่มีข้อมูล lot' : 'เลือก Lot No.'}
                />
              </Field>
              <Field label='Lot No. (คีย์เอง กรณีไม่มีในคลัง)'>
                <InputField
                  showLabel={false} showHelperText={false} showLeadingIcon={false}
                  value={editing.lotNo}
                  onChange={(v) => setField('lotNo')(v)}
                  placeholder='เช่น ROTA-6912'
                />
              </Field>
            </div>

            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field
                label='วันหมดอายุ'
                required
                hint={editing.expiry && isLotExpired(editing.expiry) ? 'วัคซีนหมดอายุแล้ว — บันทึกไม่ได้' : undefined}
                hintTone={editing.expiry && isLotExpired(editing.expiry) ? 'error' : undefined}
              >
                <DatePicker
                  showLabel={false}
                  value={editing.expiry ? new Date(editing.expiry) : null}
                  onChange={(d) => setField('expiry')(d ? d.toISOString().slice(0, 10) : '')}
                  placeholder='เลือกวันหมดอายุ'
                />
              </Field>
              <Field label='ขวดที่' width={140}>
                <InputField
                  showLabel={false} showHelperText={false} showLeadingIcon={false}
                  value={editing.vialNo}
                  onChange={(v) => setField('vialNo')(v)}
                  placeholder='เช่น 3'
                />
              </Field>
              <Field label='พยาบาลผู้ให้วัคซีน' required>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  value={editing.nurse}
                  onChange={setField('nurse')}
                  options={IMM_NURSES.map((n) => ({ value: n, label: n }))}
                  placeholder='เลือกผู้ให้วัคซีน'
                />
              </Field>
            </div>

            <div className='flex items-center gap-2 flex-wrap'>
              <SelectableTag
                label='รับวัคซีนจากหน่วยงานอื่น (บันทึกย้อนหลัง)'
                size='lg'
                selected={!!editing.otherFacility}
                onClick={() => setEditing((d) => ({ ...d, otherFacility: !d.otherFacility }))}
              />
              <SelectableTag
                label='ส่งเบิกค่าบริการ'
                size='lg'
                selected={!!editing.claimSubmitted}
                onClick={() => setEditing((d) => ({ ...d, claimSubmitted: !d.claimSubmitted }))}
              />
            </div>

            {editing.otherFacility ? (
              <div className='flex items-start gap-4 w-full flex-wrap'>
                <Field label='ชื่อสถานพยาบาลที่ให้วัคซีน' required>
                  <InputField
                    showLabel={false} showHelperText={false} showLeadingIcon={false}
                    value={editing.facilityName}
                    onChange={(v) => setField('facilityName')(v)}
                    placeholder='เช่น โรงพยาบาลเจริญกรุงประชารักษ์'
                  />
                </Field>
                <Field label='เอกสารอ้างอิง'>
                  <InputField
                    showLabel={false} showHelperText={false} showLeadingIcon={false}
                    value={editing.reference}
                    onChange={(v) => setField('reference')(v)}
                    placeholder='เช่น สมุดสีชมพู หน้า 12 / ใบสรุปการคลอดเลขที่...'
                  />
                </Field>
              </div>
            ) : (
              <div className='flex items-start gap-4 w-full flex-wrap'>
                <Field label='สถานที่รับวัคซีน'>
                  <InputField
                    showLabel={false} showHelperText={false} showLeadingIcon={false}
                    value={editing.place}
                    onChange={(v) => setField('place')(v)}
                    placeholder='ศบส.22 วัดปากบ่อ'
                  />
                </Field>
              </div>
            )}

            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field
                label='เวลาที่เริ่มมีอาการผิดปกติ'
                required={!!editing.immediateReaction}
                width={200}
                hint={editing.immediateReaction && !editing.reactionOnsetTime ? 'ต้องระบุเวลาเริ่มมีอาการ' : undefined}
                hintTone={editing.immediateReaction && !editing.reactionOnsetTime ? 'error' : undefined}
              >
                <TimePicker
                  showLabel={false}
                  value={editing.reactionOnsetTime}
                  onChange={setField('reactionOnsetTime')}
                  placeholder='--:--'
                />
              </Field>
            </div>

            <SuggestibleTextarea
              voice
              label='อาการผิดปกติหลังได้รับวัคซีน (สังเกตอาการ 30 นาที)'
              value={editing.immediateReaction}
              onChange={(e) => setField('immediateReaction')(e.target.value)}
              suggestions={REACTION_SUGGESTIONS}
              minChars={3}
              rows={2}
              minHeight={64}
              placeholder='เช่น ไม่พบอาการผิดปกติหลังสังเกตอาการ 30 นาที'
            />
          </div>
        )}
      </Popup>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='vaccines'>วัคซีนที่ถึงกำหนดตามโปรแกรม EPI</TopicHeader>
        {dueCells.length === 0 ? (
          <Banner tone='info' icon='check-circle'>
            ไม่มีเข็มที่ถึงกำหนดหรือค้างตามโปรแกรม EPI ในขณะนี้ — หากต้องการบันทึกเข็มนอกโปรแกรม กด "เพิ่มการให้วัคซีน"
          </Banner>
        ) : (
          <div className='flex items-center gap-2 flex-wrap'>
            {dueCells.map((c) => (
              <BrandSubdueButton
                key={`${c.vaccineId}-${c.seq}`}
                variant='outline'
                size='sm'
                leadingIcon='add'
                disabled={locked}
                onClick={() => openNew({ vaccineId: c.vaccineId, seq: c.seq, site: getVaccineById(c.vaccineId)?.route === 'PO' ? 'oral' : '' })}
              >
                {`${c.abbr} เข็ม ${c.seq} · ครบกำหนด ${formatImmDate(c.dueDate)}`}
              </BrandSubdueButton>
            ))}
          </div>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <TopicHeader icon='vaccines'>รายการวัคซีนที่ให้ในการมาครั้งนี้</TopicHeader>
          <BrandSubdueButton variant='fill' size='sm' leadingIcon='add' disabled={locked} onClick={() => openNew()}>
            เพิ่มการให้วัคซีน
          </BrandSubdueButton>
        </div>

        <Table
          columns={[
            { key: 'vaccine', label: 'วัคซีน', flex: true, minWidth: 200, render: (r) => `${getVaccineById(r.vaccineId)?.abbr || '—'} — ${getVaccineById(r.vaccineId)?.nameTh || ''}` },
            { key: 'seq', label: 'ครั้งที่' },
            { key: 'date', label: 'วันที่', render: (r) => formatImmDate(r.date) },
            { key: 'time', label: 'เวลา', render: (r) => (r.time ? `${r.time} น.` : '—') },
            { key: 'route', label: 'วิธีบริหาร', render: (r) => resolveVaccineRoute(getVaccineById(r.vaccineId)?.route) },
            { key: 'site', label: 'ตำแหน่ง', render: (r) => resolveInjectionSite(r.site) },
            { key: 'lotNo', label: 'Lot No.' },
            { key: 'expiry', label: 'วันหมดอายุ', render: (r) => formatImmDate(r.expiry) },
            { key: 'vialNo', label: 'ขวดที่', render: (r) => r.vialNo || '—' },
            { key: 'place', label: 'สถานที่รับ', flex: true, minWidth: 180, render: (r) => (r.otherFacility
              ? <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>{r.facilityName || 'หน่วยงานอื่น'}</ColorfulBadge>
              : (r.place || '—')) },
            { key: 'nurse', label: 'ผู้ให้วัคซีน', flex: true, minWidth: 160 },
            { key: 'reaction', label: 'อาการผิดปกติ', flex: true, minWidth: 180, render: (r) => (r.immediateReaction
              ? `${r.immediateReaction}${r.reactionOnsetTime ? ` (เริ่ม ${r.reactionOnsetTime} น.)` : ''}`
              : 'ไม่พบ') },
            { key: 'claim', label: 'ส่งเบิก', render: (r) => (r.claimSubmitted
              ? <ColorfulBadge style='teal' size='small' hierarchy='secondary'>ส่งเบิกแล้ว</ColorfulBadge>
              : <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่ส่ง</ColorfulBadge>) },
            {
              key: 'actions', label: 'การดำเนินการ', sortable: false,
              render: (r) => (
                <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' disabled={locked} onClick={() => openEdit(r)}>
                    แก้ไข
                  </BrandSubdueButton>
                  <NeutralSubdueButton size='sm' leadingIcon='delete' disabled={locked} onClick={() => setRemoveTarget(r)}>
                    ยกเลิก
                  </NeutralSubdueButton>
                </div>
              ),
            },
          ]}
          rows={form.todayDoses || []}
          rowKey={(r) => r.key}
          emptyMessage='ยังไม่มีการให้วัคซีนในการมาครั้งนี้ — กด "เพิ่มการให้วัคซีน" หรือเลือกจากเข็มที่ถึงกำหนดด้านบน'
        />
        {(form.todayDoses || []).length > 0 && (
          <AuditLine>
            รายการเหล่านี้จะถูกบันทึกลงสมุดวัคซีนของเด็กเมื่อกดยืนยันบันทึกในขั้นตอนที่ 8 ·
            ผู้บันทึก {IMM_CURRENT_USER}
          </AuditLine>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='fact_check'>ตารางความครบถ้วนวัคซีน EPI (ก่อนบันทึกครั้งนี้)</TopicHeader>
        <EpiScheduleMatrix matrix={matrix} />
      </div>
    </StepCard>
  );
};

/* ── Step 6 — ตรวจสุขภาพทั่วไป 14 ระบบ (1.10.9.7) ──────────────────── */
export const ImmStep6GeneralExam = ({ form, setForm, immHn, child, locked }) => {
  const setExam = (key, value) => {
    if (locked) return;
    setForm((f) => ({ ...f, exam: { ...f.exam, [key]: value }, examAllNormal: false }));
  };

  const toggleAllNormal = () => {
    if (locked) return;
    setForm((f) => {
      const next = !f.examAllNormal;
      if (!next) return { ...f, examAllNormal: false };
      const exam = {};
      GENERAL_EXAM_ITEMS.forEach((it) => { exam[it.key] = 'normal'; });
      return { ...f, examAllNormal: true, exam };
    });
  };

  const abnormalItems = GENERAL_EXAM_ITEMS.filter((it) => form.exam?.[it.key] === 'abnormal');

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <TopicHeader icon='stethoscope'>การตรวจสุขภาพทั่วไป (14 ระบบ)</TopicHeader>
          <SelectableTag
            label='ปกติทุกรายการ'
            size='lg'
            selected={!!form.examAllNormal}
            onClick={toggleAllNormal}
          />
        </div>

        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {GENERAL_EXAM_ITEMS.map((item) => (
            <div
              key={item.key}
              className='flex items-center justify-between gap-4 w-full flex-wrap'
              style={{
                paddingTop: 'var(--dim-space-200, 8px)',
                paddingBottom: 'var(--dim-space-200, 8px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
                borderRadius: 'var(--dim-radius-200, 8px)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
              }}
            >
              <span className='text-sm' style={{ color: 'var(--text-content-default, #363B3F)' }}>{item.label}</span>
              <div className='flex items-center gap-2 shrink-0'>
                <SelectableTag label='ปกติ' size='md' selected={form.exam?.[item.key] === 'normal'} onClick={() => setExam(item.key, 'normal')} />
                <SelectableTag label='ผิดปกติ' size='md' selected={form.exam?.[item.key] === 'abnormal'} onClick={() => setExam(item.key, 'abnormal')} />
              </div>
            </div>
          ))}
        </div>

        {abnormalItems.length > 0 && (
          <Banner tone='warning' icon='warning'>
            พบความผิดปกติ {abnormalItems.length} ระบบ: {abnormalItems.map((i) => i.label).join(', ')} —
            ระบุรายละเอียดในช่องบันทึกด้านล่างและพิจารณาส่งพบแพทย์ในขั้นตอนที่ 7
          </Banner>
        )}

        <SuggestibleTextarea
          voice
          label='รายละเอียดผลการตรวจร่างกาย'
          disabled={locked}
          value={form.examNote}
          onChange={(e) => setForm((f) => ({ ...f, examNote: e.target.value }))}
          suggestions={EXAM_NOTE_SUGGESTIONS}
          minChars={3}
          placeholder='บันทึกสิ่งที่ตรวจพบ โดยเฉพาะระบบที่ผิดปกติ'
        />
      </div>

      {/* สุขภาพช่องปากเด็กดี (มติ คทง.6 ครั้งที่ 3) — ผลตรวจฟันจริงมาจาก
          หน้าทันตกรรมที่เดียว (แผงด้านล่าง อ่านอย่างเดียว) ส่วนที่ WBC ลงเอง
          คือข้อมูลส่งเสริมสุขภาพช่องปาก: ฟันซี่แรกขึ้นเมื่ออายุเท่าไร และ
          เริ่มแปรงสีฟันซี่แรกแล้วหรือยัง (blueprint หน้า 9) */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='dentistry'>สุขภาพช่องปากเด็ก</TopicHeader>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <div style={{ minWidth: 220, flex: '1 1 220px' }}>
            <InputField
              label='ฟันซี่แรกขึ้นเมื่ออายุ (เดือน)'
              disabled={locked}
              value={form.firstToothAge}
              onChange={(e) => setForm((f) => ({ ...f, firstToothAge: e.target.value }))}
              placeholder='เช่น 7'
            />
          </div>
          <div style={{ minWidth: 240, flex: '1 1 240px' }}>
            <Select
              label='เริ่มแปรงสีฟันซี่แรกแล้วหรือยัง'
              disabled={locked}
              value={form.firstToothBrushStarted}
              onChange={(v) => setForm((f) => ({ ...f, firstToothBrushStarted: v }))}
              options={[
                { value: 'yes', label: 'แปรงแล้ว (ผู้ปกครองแปรงให้)' },
                { value: 'wipe', label: 'ยังไม่แปรง — ใช้ผ้าเช็ดเหงือก/ฟัน' },
                { value: 'no', label: 'ยังไม่ได้ทำความสะอาดช่องปาก' },
                { value: 'na', label: 'ยังไม่มีฟันขึ้น' },
              ]}
              placeholder='เลือกสถานะ'
            />
          </div>
        </div>
        {(form.firstToothBrushStarted === 'no' || form.firstToothBrushStarted === 'wipe') && (
          <ColorfulBadge style='orange' size='small' hierarchy='secondary' width='hug' maxWidth={640}>
            ยังไม่ได้แปรงสีฟัน — ต้องให้คำแนะนำการทำความสะอาดช่องปากแก่ผู้ปกครองก่อนกลับ
          </ColorfulBadge>
        )}
        <SelectableTag
          label='ให้คำแนะนำการดูแลช่องปากแก่ผู้ปกครองแล้ว'
          size='lg'
          selected={!!form.oralCareAdvice}
          onClick={() => { if (!locked) setForm((f) => ({ ...f, oralCareAdvice: !f.oralCareAdvice })); }}
        />
        <CarriedDentalPanel
          hn={immHn}
          patientName={child?.fullName || child?.shortName}
          from='wbc'
          readOnly={locked}
          title='ผลการตรวจทันตกรรม (จากคลินิกทันตกรรม)'
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='history_edu'>ประวัติการเจ็บป่วยและการแพ้</TopicHeader>
        <SuggestibleTextarea
          voice
          label='ประวัติการเจ็บป่วย'
          disabled={locked}
          value={form.illnessHistory}
          onChange={(e) => setForm((f) => ({ ...f, illnessHistory: e.target.value }))}
          suggestions={ILLNESS_HISTORY_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น เคยนอนโรงพยาบาลด้วยไข้สูงชัก 1 ครั้ง'
        />
        <SuggestibleTextarea
          voice
          label='ประวัติการแพ้ยา / แพ้อาหาร / แพ้วัคซีน'
          disabled={locked}
          value={form.allergyNote}
          onChange={(e) => setForm((f) => ({ ...f, allergyNote: e.target.value }))}
          suggestions={ALLERGY_NOTE_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น ไม่มีประวัติแพ้ยาและแพ้วัคซีน'
        />
      </div>
    </StepCard>
  );
};

/* ── Step 7 — EMR / CPOE + Telemedicine (1.10.9.7) ─────────────────── */
export const ImmStep7Orders = ({ form, setForm, locked }) => {
  const toggle = (group, key) => {
    if (locked) return;
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: !f[group]?.[key] } }));
  };

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='assignment_ind'>แพทย์ผู้รับผิดชอบ</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='แพทย์ผู้ตรวจ / ผู้สั่งการรักษา' required>
            <Select
              showLabel={false} searchable={false} size='lg'
              disabled={locked}
              value={form.doctor}
              onChange={(v) => setForm((f) => ({ ...f, doctor: v }))}
              options={IMM_DOCTORS.map((d) => ({ value: d, label: d }))}
              placeholder='เลือกแพทย์'
            />
          </Field>
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='science'>สั่งตรวจทางห้องปฏิบัติการ (CPOE)</TopicHeader>
        <div className='flex flex-col gap-2'>
          {IMM_LAB_ORDERS.map((o) => (
            <SelectableTag
              key={o.key}
              label={o.label}
              size='lg'
              selected={!!form.labOrders?.[o.key]}
              onClick={() => toggle('labOrders', o.key)}
            />
          ))}
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='pill'>สั่งยา / เวชภัณฑ์</TopicHeader>
        <div className='flex flex-col gap-2'>
          {IMM_MED_ORDERS.map((o) => (
            <SelectableTag
              key={o.key}
              label={o.label}
              size='lg'
              selected={!!form.medOrders?.[o.key]}
              onClick={() => toggle('medOrders', o.key)}
            />
          ))}
        </div>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={form.orderNote}
          onChange={(e) => setForm((f) => ({ ...f, orderNote: e.target.value }))}
          suggestions={ORDER_NOTE_SUGGESTIONS}
          minChars={3}
          placeholder='คำสั่งการรักษาเพิ่มเติม / คำแนะนำแก่ผู้ปกครอง'
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='videocam'>ปรึกษาผ่าน Telemedicine</TopicHeader>
        <Banner tone='neutral' icon='info'>
          ต้นแบบนี้จำลองเฉพาะการเปิด/ปิดห้องปรึกษา (launch + สถานะ) — การเชื่อมต่อสายจริงใช้บริการกลางของระบบ Telemedicine
        </Banner>
        <div className='flex items-center gap-3 flex-wrap'>
          {form.telemedStatus === 'completed' ? (
            <ColorfulBadge style='green' size='small' hierarchy='secondary'>ปรึกษาผ่าน Telemedicine เสร็จสิ้นแล้ว</ColorfulBadge>
          ) : form.telemedStatus === 'started' ? (
            <>
              <ColorfulBadge style='blue' size='small' hierarchy='secondary'>กำลังปรึกษาผ่าน Telemedicine</ColorfulBadge>
              <NeutralSubdueButton size='sm' leadingIcon='call_end' disabled={locked} onClick={() => setForm((f) => ({ ...f, telemedStatus: 'completed' }))}>
                จบการปรึกษา
              </NeutralSubdueButton>
            </>
          ) : (
            <BrandSubdueButton variant='fill' size='sm' leadingIcon='videocam' disabled={locked} onClick={() => setForm((f) => ({ ...f, telemedStatus: 'started' }))}>
              เริ่มปรึกษา Telemedicine
            </BrandSubdueButton>
          )}
        </div>
      </div>
    </StepCard>
  );
};

/* ── Step 8 — เอกสารแนบ + นัดหมาย + สรุป/พิมพ์ (1.10.9.4 / .5) ─────── */
const APPOINTMENT_TIMES = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00'];

export const ImmStep8Summary = ({ form, setForm, immHn, child, locked, saved, onConfirmSave }) => {
  const [uploadError, setUploadError] = useState('');
  const [removeTarget, setRemoveTarget] = useState(null);
  const [printTick, setPrintTick] = useState(0);

  const printLog = useMemo(() => getImmPrintLog(immHn), [immHn, printTick]);
  const doPrint = (docType) => { logImmPrint(immHn, docType); setPrintTick((t) => t + 1); };

  const addDocument = (file) => {
    const err = validateImmUpload(file.name, file.size);
    if (err) { setUploadError(err); return; }
    setUploadError('');
    setForm((f) => ({
      ...f,
      documents: [
        ...(f.documents || []),
        {
          id: `doc-${Date.now()}`,
          name: file.name,
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
          by: IMM_CURRENT_USER,
          at: new Date().toISOString(),
        },
      ],
    }));
  };

  const confirmRemove = () => {
    setForm((f) => ({ ...f, documents: (f.documents || []).filter((d) => d.id !== removeTarget.id) }));
    setRemoveTarget(null);
  };

  const appt = form.appointment || {};
  const setAppt = (key) => (value) => {
    if (locked) return;
    setForm((f) => ({ ...f, appointment: { ...f.appointment, [key]: value } }));
  };
  const todayStr = todayIso();
  const dateInPast = !!appt.date && appt.date < todayStr;
  const booked = !!appt.date && !appt.cancelled;

  const validationErrors = useMemo(() => {
    const errs = [];
    if (!String(form.growth?.weight || '').trim()) errs.push('น้ำหนักเป็นค่าบังคับ — กรอกในขั้นตอนที่ 3 การเจริญเติบโต');
    if (!form.doctor) errs.push('ยังไม่ได้เลือกแพทย์ผู้ตรวจ (ขั้นตอนที่ 7)');
    (form.todayDoses || []).forEach((d) => {
      if (d.expiry && d.expiry < todayStr) {
        errs.push(`วัคซีน Lot ${d.lotNo} หมดอายุแล้ว — แก้ไขหรือยกเลิกรายการในขั้นตอนที่ 5`);
      }
      if (d.immediateReaction && !d.reactionOnsetTime) {
        errs.push(`บันทึกอาการผิดปกติของ ${d.lotNo} แล้ว แต่ยังไม่ระบุเวลาเริ่มมีอาการ (ขั้นตอนที่ 5)`);
      }
    });
    if (appt.date && !appt.cancelled && appt.date < todayStr) {
      errs.push('วันนัดหมายเป็นวันในอดีต — แก้ไขในหัวข้อนัดหมายด้านล่าง');
    }
    if (appt.date && !appt.type) errs.push('เลือกวันนัดแล้ว แต่ยังไม่ได้ระบุประเภทนัดหมาย');
    return errs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, todayStr]);

  const rightsExpired = !!child?.rightsExpired;

  return (
    <StepCard>
      <Popup
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title='ลบเอกสารแนบ'
        subtitle={removeTarget ? removeTarget.name : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setRemoveTarget(null) }}
        primaryAction={{ label: 'ยืนยันลบเอกสาร', onClick: confirmRemove, tone: 'danger' }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
          เอกสารที่ลบจะไม่ถูกแนบไปกับการบันทึกครั้งนี้ ต้องการลบใช่หรือไม่
        </span>
      </Popup>

      {validationErrors.length > 0 && (
        <div
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-200, 8px)',
            paddingTop: 'var(--dim-space-300, 12px)',
            paddingBottom: 'var(--dim-space-300, 12px)',
            paddingLeft: 'var(--dim-space-400, 16px)',
            paddingRight: 'var(--dim-space-400, 16px)',
            borderRadius: 'var(--dim-radius-200, 8px)',
            background: 'var(--surface-danger-quaternary, #FFF0F0)',
          }}
        >
          <span className='flex items-center gap-2' style={{ color: 'var(--text-danger-default, #B91C1C)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>
            <Icon name='error' size={18} />
            ต้องแก้ไข {validationErrors.length} รายการก่อนบันทึก
          </span>
          {validationErrors.map((e) => (
            <span key={e} style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-danger-default, #B91C1C)' }}>• {e}</span>
          ))}
        </div>
      )}

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='attach_file'>เอกสารแนบประกอบการตรวจ</TopicHeader>
        {!locked && (
          <FileUploadField
            showLabel={false}
            accept={IMM_UPLOAD_ACCEPT}
            buttonLabel='แนบเอกสาร'
            helperText={`รองรับ ${IMM_UPLOAD_ACCEPT} ขนาดไม่เกิน 10 MB (เช่น สำเนาสมุดสีชมพู ใบสรุปการคลอด)`}
            onFile={addDocument}
          />
        )}
        {uploadError && <Banner tone='danger' icon='error'>{uploadError}</Banner>}
        {(form.documents || []).length === 0 ? (
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>ยังไม่มีเอกสารแนบ</span>
        ) : (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {form.documents.map((doc) => (
              <div
                key={doc.id}
                className='flex items-center w-full'
                style={{
                  gap: 'var(--dim-space-300, 12px)',
                  paddingTop: 'var(--dim-space-200, 8px)',
                  paddingBottom: 'var(--dim-space-200, 8px)',
                  paddingLeft: 'var(--dim-space-300, 12px)',
                  paddingRight: 'var(--dim-space-300, 12px)',
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
                  background: 'var(--surface-card-100, #FFFFFF)',
                }}
              >
                <Icon name='description' size={20} />
                <div className='flex flex-col min-w-0 flex-1'>
                  <span className='truncate' style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}>
                    {doc.name}
                  </span>
                  <AuditLine>{doc.sizeKb} KB · แนบโดย {doc.by} · {formatImmDateTime(doc.at)}</AuditLine>
                </div>
                {!locked && (
                  <NeutralSubdueButton size='sm' leadingIcon='delete' onClick={() => setRemoveTarget(doc)}>ลบ</NeutralSubdueButton>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='calendar'>นัดหมายเข็มถัดไป</TopicHeader>
        {appt.cancelled && (
          <div className='flex items-center gap-3 flex-wrap'>
            <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกนัดหมายแล้ว</ColorfulBadge>
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)', textDecoration: 'line-through' }}>
              {formatImmDate(appt.date)}{appt.time ? ` เวลา ${appt.time} น.` : ''}
            </span>
            <BrandSubdueButton
              variant='outline' size='sm' leadingIcon='event_repeat'
              disabled={locked}
              onClick={() => setForm((f) => ({ ...f, appointment: { date: '', time: '', type: '', note: '', cancelled: false } }))}
            >
              นัดหมายใหม่
            </BrandSubdueButton>
          </div>
        )}

        {!appt.cancelled && (
          <>
            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field label='ประเภทนัดหมาย' required={!!appt.date}>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  disabled={locked}
                  value={appt.type} onChange={setAppt('type')}
                  options={IMM_APPOINTMENT_TYPES}
                  placeholder='เลือกประเภทนัดหมาย'
                />
              </Field>
              <Field
                label='วันนัดหมาย'
                hint={dateInPast ? 'วันที่นัดต้องไม่เป็นวันในอดีต' : undefined}
                hintTone={dateInPast ? 'error' : undefined}
              >
                <DatePicker
                  showLabel={false}
                  value={appt.date ? new Date(appt.date) : null}
                  onChange={(d) => setAppt('date')(d ? d.toISOString().slice(0, 10) : '')}
                  placeholder='เลือกวันที่'
                />
              </Field>
              <Field label='เวลานัด'>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  disabled={locked}
                  value={appt.time} onChange={setAppt('time')}
                  options={APPOINTMENT_TIMES.map((t) => ({ value: t, label: `${t} น.` }))}
                  placeholder='เลือกเวลา'
                />
              </Field>
            </div>

            <SuggestibleTextarea
              voice
              disabled={locked}
              value={appt.note}
              onChange={(e) => setAppt('note')(e.target.value)}
              suggestions={[
                'นัดรับวัคซีนเข็มถัดไปตามโปรแกรม EPI',
                'นัดชั่งน้ำหนักติดตามภาวะโภชนาการ 1 เดือน',
                'นัดประเมินพัฒนาการซ้ำหลังกระตุ้น 1 เดือน',
                'แนะนำผู้ปกครองนำสมุดสีชมพูมาด้วยทุกครั้ง',
              ]}
              minChars={3}
              rows={2}
              minHeight={64}
              placeholder='หมายเหตุการนัดหมาย'
            />

            {booked && !dateInPast && (
              <div
                className='flex items-center w-full'
                style={{
                  gap: 'var(--dim-space-300, 12px)',
                  paddingTop: 'var(--dim-space-300, 12px)',
                  paddingBottom: 'var(--dim-space-300, 12px)',
                  paddingLeft: 'var(--dim-space-400, 16px)',
                  paddingRight: 'var(--dim-space-400, 16px)',
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
                }}
              >
                <Icon name='event_available' size={20} />
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                  นัดแล้ว: {formatImmDate(appt.date)}{appt.time ? ` เวลา ${appt.time} น.` : ''}
                  {appt.type ? ` · ${IMM_APPOINTMENT_TYPES.find((t) => t.value === appt.type)?.label || ''}` : ''}
                </span>
                <div className='flex-1' />
                <NeutralSubdueButton size='sm' leadingIcon='event_busy' disabled={locked} onClick={() => setAppt('cancelled')(true)}>
                  ยกเลิกนัด
                </NeutralSubdueButton>
              </div>
            )}
          </>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='summarize'>สรุปการให้บริการ</TopicHeader>
        <div
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-200, 8px)',
            paddingTop: 'var(--dim-space-600, 24px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
            paddingLeft: 'var(--dim-space-600, 24px)',
            paddingRight: 'var(--dim-space-600, 24px)',
            borderRadius: 'var(--dim-radius-400, 12px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            background: 'var(--surface-card-100, #FFFFFF)',
          }}
        >
          <span style={{ fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-brandPrimary-default, #007549)' }}>
            ใบสรุปการตรวจ — คลินิกสุขภาพเด็กดี
          </span>
          <ReadOnlyRow label='ผู้รับบริการ'>{child?.fullName || '—'} · HN {immHn} · อายุ {formatAgeYMD(child?.birthDate)}</ReadOnlyRow>
          <ReadOnlyRow label='แพทย์ผู้ตรวจ'>{form.doctor || '—'}</ReadOnlyRow>
          <ReadOnlyRow label='การเจริญเติบโต'>
            {`น้ำหนัก ${form.growth?.weight || '—'} กก. · ส่วนสูง ${form.growth?.height || '—'} ซม. · รอบศีรษะ ${form.growth?.headCirc || '—'} ซม.`}
          </ReadOnlyRow>
          <ReadOnlyRow label='ภาวะโภชนาการ'>
            {NUTRITION_STATUS_OPTIONS.find((o) => o.value === form.nutritionStatus)?.label || '—'}
          </ReadOnlyRow>
          <ReadOnlyRow label='วัคซีนที่ให้วันนี้'>
            {(form.todayDoses || []).length > 0
              ? form.todayDoses.map((d) => `${getVaccineById(d.vaccineId)?.abbr || ''} เข็ม ${d.seq}`).join(' · ')
              : 'ไม่มี'}
          </ReadOnlyRow>
          <ReadOnlyRow label='ตรวจร่างกาย'>
            {form.examAllNormal ? 'ปกติทุกรายการ' : (form.examNote || '—')}
          </ReadOnlyRow>
          <ReadOnlyRow label='นัดหมาย'>
            {appt.cancelled
              ? 'ยกเลิกนัดหมาย'
              : appt.date
                ? `${formatImmDate(appt.date)}${appt.time ? ` เวลา ${appt.time} น.` : ''}`
                : 'ไม่มีนัดหมาย'}
          </ReadOnlyRow>
          <ReadOnlyRow label='เอกสารแนบ'>{(form.documents || []).length > 0 ? `${form.documents.length} ไฟล์` : 'ไม่มี'}</ReadOnlyRow>
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='print'>พิมพ์เอกสาร</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          <BrandSubdueButton variant='outline' leadingIcon='print' onClick={() => doPrint('ใบสรุปการตรวจสุขภาพเด็กดี')}>
            พิมพ์ใบสรุปการตรวจ
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' leadingIcon='print' onClick={() => doPrint('ใบนัดหมายครั้งถัดไป')}>
            พิมพ์ใบนัดหมาย
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' leadingIcon='print' onClick={() => doPrint('สมุดบันทึกการได้รับวัคซีน')}>
            พิมพ์สมุดวัคซีน
          </BrandSubdueButton>
        </div>
        {printLog.length > 0 && (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            {printLog.map((e, i) => (
              <AuditLine key={`${e.at}-${i}`}>พิมพ์{e.docType} โดย {e.by} · {formatImmDateTime(e.at)}</AuditLine>
            ))}
          </div>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='check-circle'>ยืนยันการบันทึก</TopicHeader>
        {rightsExpired && (
          <Banner tone='warning' icon='warning'>
            สิทธิการรักษาของเด็กหมดอายุ — ยังบันทึกการตรวจได้ แต่ช่อง "ส่งเบิก" ในขั้นตอนที่ 5
            จะไม่ถูกส่งจนกว่าจะต่อสิทธิเรียบร้อย
          </Banner>
        )}
        {saved ? (
          <div className='flex items-center gap-2' style={{ color: 'var(--text-brandPrimary-default, #007549)', fontSize: 'var(--type-size-sm)' }}>
            <Icon name='check-circle' size={18} />
            บันทึกการตรวจเรียบร้อยแล้ว · ผู้บันทึก {IMM_CURRENT_USER} — กด "จบการบันทึก" ด้านล่างเพื่อกลับหน้าคิว
          </div>
        ) : (
          <BrandSubdueButton
            variant='fill'
            size='lg'
            leadingIcon='save'
            disabled={validationErrors.length > 0 || locked}
            onClick={() => { if (validationErrors.length === 0 && !locked) onConfirmSave(); }}
          >
            ยืนยันบันทึกการตรวจสุขภาพเด็กดี
          </BrandSubdueButton>
        )}
      </div>
    </StepCard>
  );
};
