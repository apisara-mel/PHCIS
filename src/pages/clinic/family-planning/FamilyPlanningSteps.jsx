import React, { useMemo, useRef, useState } from 'react';
import Icon from '@/components/icons/Icon';
import CarriedScreeningPanel from '@/components/screening/CarriedScreeningPanel';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import DatePicker from '@/components/forms/DatePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import Checkbox from '@/components/checkbox/Checkbox';
import TabCapsule from '@/components/tab/TabCapsule';
import FileUploadField from '@/components/forms/FileUploadField';
import DragAndDrop from '@/components/form-builder/DragAndDrop';
import EDocumentBuilderPopup from '@/components/form-builder/EDocumentBuilderPopup';
import EDocumentSheetPopup from '@/components/form-builder/EDocumentSheet';
import { countBlockFields } from '@/utils/formBuilderModel';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import AddMedicationPopup from '@/components/popup/AddMedicationPopup';
import DrawingCanvasPopup from '@/components/popup/DrawingCanvasPopup';
import FamilyPlanningFollowUpCard, { printFpFollowUpCard } from '@/pages/clinic/family-planning/FamilyPlanningFollowUpCard';
import {
  FP_CURRENT_USER,
  FP_DOCTORS,
  FP_CLIENT_TYPES,
  FP_LAST_METHODS,
  FP_SERVICES,
  FP_REMOVAL_OPTIONS,
  FP_SERVICES_ALLOWED_WHEN_FLAGGED,
  FP_PREGNANCY_TEST_OPTIONS,
  FP_SCREENING_ITEMS,
  FP_SCREENING_ANSWERS,
  FP_URINE_SUGAR_OPTIONS,
  FP_URINE_ALBUMIN_OPTIONS,
  FP_EXAM_RESULT_OPTIONS,
  FP_BREAST_SIDES,
  FP_BREAST_DETAIL_SUGGESTIONS,
  FP_PV_VAGINA_OPTIONS,
  FP_PV_CERVIX_OPTIONS,
  FP_PV_UTERUS_POSITION_OPTIONS,
  FP_PV_UTERUS_SIZE_OPTIONS,
  FP_PV_ADNEXA_OPTIONS,
  FP_SPECIMEN_TYPES,
  FP_CYTOLOGY_ADEQUACY,
  FP_CYTOLOGY_CATEGORIES,
  FP_PAP_METHOD_OPTIONS,
  FP_PAP_RESULT_OPTIONS,
  FP_PAP_AUTO_DETAIL,
  FP_PV_DETAIL_SUGGESTIONS,
  FP_COUNSELING_TYPES,
  FP_POSTPARTUM_MOTHER_FIELDS,
  FP_POSTPARTUM_MOTHER_SUMMARY,
  FP_POSTPARTUM_CHILD_FIELDS,
  FP_POSTPARTUM_ADVICE_SUGGESTIONS,
  FP_DELIVERY_METHOD_OPTIONS,
  FP_DELIVERY_PLACE_OPTIONS,
  FP_PREGNANCY_OUTCOME_OPTIONS,
  FP_MED_ORDERS,
  FP_ADVANCE_ORDERS,
  FP_INTERNAL_REFER_UNITS,
  FP_EXTERNAL_REFER_HOSPITALS,
  FP_APPOINTMENT_TYPES,
  FP_ADVICE_SUGGESTIONS,
  FP_REFER_REASON_SUGGESTIONS,
  FP_ILLNESS_HISTORY_SUGGESTIONS,
  FP_UPLOAD_ACCEPT,
  validateFpUpload,
  interpretFpScreening,
  validateFpVisit,
  resolveFpClientType,
  resolveFpService,
  resolveFpAppointmentType,
  summarizeFpServices,
  getFpVisitRecords,
  getFpTriageVitals,
  hasFamilyPlanningRights,
  logFpPrint,
  getFpPrintLog,
  buildFpFollowUpCard,
  formatFpDate,
  formatFpDateTime,
  todayIso,
} from '@/data/familyPlanningVisits';

/* FamilyPlanningSteps — ตัวเนื้อหาแต่ละขั้นตอนของ "บันทึกวางแผนครอบครัว"
   (TOR 1.10.8.1/.3/.4/.5/.7) เสียบเข้ากับ TreatmentFormShell โดย
   FamilyPlanningFormPage.

   โครงหัวข้อ (TopicHeader / Field / StepCard / AssessmentCard) และ
   questionnaire row ใช้ convention เดียวกับ AncSteps + MentalHealthSteps
   ทุกประการ — ไม่มี component ใหม่ที่ต้องขึ้นทะเบียน DS ยกเว้น
   ConfidentialMask (screen-local เช่นเดียวกับของสุขภาพจิต)

   กฎบังคับจากคู่มือ (คลินิกส่งเสริมสุขภาพ วางแผนครอบครัว) ที่ฝังไว้ใน UI:
     • p.2-5 ข้อ 1–2 — คัดกรอง 11 ข้อ ตอบ "ไม่มี" ทุกข้อ → จ่ายยาได้;
       ตอบ "มี" แม้ข้อเดียว → ห้ามจ่ายยา ต้องส่งปรึกษาแพทย์ก่อน
     • p.2-6 ข้อ 2 — ความดัน/น้ำหนัก/ส่วนสูง ดึงจากห้องซักประวัติ แก้ไม่ได้
       เว้นแต่กด "แก้ไขจากห้องตรวจ"
     • p.2-6 ข้อ 5 — P.V.Examination ต้องบันทึกในหน้าตรวจภายในก่อน
     • p.2-3 ข้อ 4.1 — วิธีคุมกำเนิดครั้งสุดท้าย = อื่นๆ → เปิดช่อง "ระบุ"
     • §2.1.3 ข้อ 5.2 — ผล Pap = ปกติ → เติมรายละเอียดอัตโนมัติ */

/* ── shared bits (AncSteps / MentalHealthSteps conventions) ────────── */
const TopicHeader = ({ icon, children, trailing }) => (
  <div className='flex items-center gap-2 w-full'>
    <span className='text-brand-500'><Icon name={icon} size={20} /></span>
    <h2 className='text-base font-bold text-brand-500'>{children}</h2>
    {trailing ? (<><div className='flex-1' />{trailing}</>) : null}
  </div>
);

/* ใบผลเซลล์วิทยา (§2.1.3 ข้อ 7) เป็นรหัสหลายสิบตัวจัดเป็นชั้น — เขียนซ้ำทีละ
   ช่องจะยาวจนอ่านไม่ออก จึงมีตัวเรนเดอร์กลุ่มรหัสตัวเดียวใช้ทั้งใบ
   `freeText` คือรหัสที่ใบเดิมมีช่องพิมพ์ต่อท้าย (029 Other · 241 SLI) */
const CodeCheckList = ({ items, selected, onToggle, disabled, freeTextValue, onFreeTextChange }) => (
  <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    {items.map((item) => (
      <div key={item.code} className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <Checkbox
          checked={selected.includes(item.code)}
          onChange={() => onToggle(item.code)}
          disabled={disabled}
          label={`${item.code} ${item.label}`}
        />
        {item.freeText && selected.includes(item.code) ? (
          <InputField
            value={freeTextValue[item.code] || ''}
            onChange={(value) => onFreeTextChange(item.code, value)}
            disabled={disabled}
            placeholder='ระบุ'
          />
        ) : null}
      </div>
    ))}
  </div>
);

const CodeGroupLabel = ({ children }) => (
  children ? (
    <span
      style={{
        color: 'var(--text-content-tertiary, #858C92)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        lineHeight: 1.5,
      }}
    >
      {children}
    </span>
  ) : null
);

const Field = ({ label, required, children, hint, hintTone }) => (
  <div className='flex-1 flex flex-col gap-1.5 min-w-0' style={{ minWidth: 200 }}>
    <div className='flex items-center text-sm text-ink leading-snug'>
      <span>{label}</span>
      {required && <span className='ml-0.5' style={{ color: 'var(--text-input-require)' }}>*</span>}
    </div>
    {children}
    {hint && (
      <span style={{
        color: hintTone === 'error'
          ? 'var(--text-danger-default, #B91C1C)'
          : 'var(--text-content-quaternary, #ADB2B7)',
        fontSize: 'var(--type-size-xs)',
      }}>
        {hint}
      </span>
    )}
  </div>
);

const StepCard = ({ children }) => (
  <section className='flex flex-col' style={{ gap: 'var(--dim-space-600, 24px)' }}>{children}</section>
);

const AssessmentCard = React.forwardRef(({ children }, ref) => (
  <div
    ref={ref}
    className='flex flex-col w-full'
    style={{ gap: 'var(--dim-space-300, 12px)', scrollMarginTop: 110 }}
  >
    {children}
  </div>
));
AssessmentCard.displayName = 'AssessmentCard';

const Banner = ({ tone = 'brand', icon = 'info', children, trailing }) => {
  const palette = {
    brand:   { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)' },
    warning: { bg: 'var(--surface-warning-quaternary, #FFF9F0)',      fg: 'var(--text-warning-default, #C2410C)' },
    danger:  { bg: 'var(--surface-danger-quaternary, #FFF0F0)',       fg: 'var(--text-danger-default, #B91C1C)' },
    neutral: { bg: 'var(--surface-card-quaternary, #F9FBFB)',         fg: 'var(--text-content-secondary, #636B72)' },
  }[tone];
  return (
    <div
      className='flex items-center w-full'
      style={{
        gap: 'var(--dim-space-200, 8px)',
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
      {trailing ? (<><div className='flex-1' />{trailing}</>) : null}
    </div>
  );
};

/* ข้อมูลลับ §1.4.2 — วิธีคุมกำเนิด / ผลตรวจภายใน / ผลมะเร็งปากมดลูก
   แสดงเฉพาะผู้มีสิทธิคลินิกวางแผนครอบครัว (screen-local เช่นเดียวกับ
   ConfidentialMask ของงานสุขภาพจิต — ยังไม่มี primitive กลางใน DS). */
export const FpConfidentialMask = ({ what = 'ข้อมูลการวางแผนครอบครัว' }) => (
  <div
    className='flex flex-col items-center justify-center w-full text-center'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      paddingTop: 'var(--dim-space-800, 48px)',
      paddingBottom: 'var(--dim-space-800, 48px)',
      paddingLeft: 'var(--dim-space-600, 24px)',
      paddingRight: 'var(--dim-space-600, 24px)',
      borderRadius: 'var(--dim-radius-400, 12px)',
      border: 'var(--dim-stroke-100, 1px) dashed var(--border-neutral-tertiary, #E2E4E6)',
      background: 'var(--surface-card-quaternary, #F9FBFB)',
    }}
  >
    <Icon name='lock_person' size={32} />
    <span style={{ fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default, #363B3F)' }}>
      สิทธิการเข้าถึงไม่เพียงพอ
    </span>
    <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)', maxWidth: 480 }}>
      {what}เป็นข้อมูลลับ (ตามข้อกำหนด §1.4.2) — แสดงเฉพาะผู้ใช้ที่ได้รับสิทธิ
      คลินิกวางแผนครอบครัวเท่านั้น หากต้องการเข้าถึงโปรดติดต่อผู้ดูแลระบบ
    </span>
  </div>
);

const EmptyState = ({ icon = 'inbox', title, subtitle, action }) => (
  <div
    className='flex flex-col items-center justify-center w-full text-center'
    style={{
      gap: 'var(--dim-space-200, 8px)',
      paddingTop: 'var(--dim-space-700, 32px)',
      paddingBottom: 'var(--dim-space-700, 32px)',
      paddingLeft: 'var(--dim-space-600, 24px)',
      paddingRight: 'var(--dim-space-600, 24px)',
      borderRadius: 'var(--dim-radius-400, 12px)',
      border: 'var(--dim-stroke-100, 1px) dashed var(--border-neutral-tertiary, #E2E4E6)',
      background: 'var(--surface-card-quaternary, #F9FBFB)',
    }}
  >
    <Icon name={icon} size={28} />
    <span style={{ fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>{title}</span>
    {subtitle && (
      <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)', maxWidth: 460 }}>{subtitle}</span>
    )}
    {action}
  </div>
);

/* คำถาม + choice chips (แถวคำถามแบบเดียวกับ AncStep2Screening) */
const ChoiceRow = ({ label, options, value, onSelect, locked, tone }) => (
  <div
    className='flex items-center justify-between gap-4 w-full flex-wrap'
    style={{
      paddingTop: 'var(--dim-space-200, 8px)',
      paddingBottom: 'var(--dim-space-200, 8px)',
      paddingLeft: 'var(--dim-space-300, 12px)',
      paddingRight: 'var(--dim-space-300, 12px)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      background: tone === 'danger'
        ? 'var(--surface-danger-quaternary, #FFF0F0)'
        : 'transparent',
    }}
  >
    <span className='text-sm' style={{ color: 'var(--text-content-default, #363B3F)', maxWidth: 620 }}>{label}</span>
    <div className='flex items-center gap-2 shrink-0 flex-wrap'>
      {options.map((opt) => (
        <SelectableTag
          key={String(opt.value)}
          label={opt.label}
          size='md'
          selected={value === opt.value}
          onClick={() => { if (!locked) onSelect(opt.value); }}
        />
      ))}
    </div>
  </div>
);

const SummaryRow = ({ label, children }) => (
  <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
    <span style={{ width: 200, flexShrink: 0, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>{label}</span>
    <span className='min-w-0' style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>{children}</span>
  </div>
);

/* ══ Step 1 — ประวัติการรักษา (TOR 1.10.8.1 / 1.10.8.3) ═════════════ */
const STEP1_SECTIONS = [
  /* ผลจากจุดคัดกรอง (`/opd/screening`) — อ่านอย่างเดียว. คลินิกพิเศษไม่คัดกรอง
     ซ้ำเอง เพราะทุกคนผ่านจุดคัดกรองเดียวกัน จึงดึงผลรอบล่าสุดมาแสดงหัวสุด */
  { key: 'screening', label: 'ผลคัดกรอง' },
  { key: 'registration', label: 'ทะเบียนวางแผนครอบครัว' },
  { key: 'triage',       label: 'ผลการซักประวัติ' },
  { key: 'illness',      label: 'ประวัติการเจ็บป่วย' },
  { key: 'history',      label: 'ประวัติการรับบริการ' },
];

export const FpStep1History = ({ form, setForm, fpHn, registration, queueRow, locked, onGoRegistry }) => {
  const [activeSection, setActiveSection] = useState('registration');
  const sectionRefs = useRef({});
  const jumpTo = (key) => {
    setActiveSection(key);
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const visits = useMemo(() => getFpVisitRecords(fpHn), [fpHn]);
  const triage = useMemo(() => getFpTriageVitals(fpHn), [fpHn]);

  const setVital = (key) => (value) => setForm((f) => ({ ...f, vitals: { ...f.vitals, [key]: value } }));
  const enableOverride = () => setForm((f) => ({
    ...f,
    vitalsOverride: true,
    vitals: {
      bp: f.vitals.bp || triage?.bp || '',
      pulse: f.vitals.pulse || String(triage?.pulse ?? ''),
      temp: f.vitals.temp || String(triage?.temp ?? ''),
      weight: f.vitals.weight || String(triage?.weight ?? ''),
      height: f.vitals.height || String(triage?.height ?? ''),
    },
  }));
  const cancelOverride = () => setForm((f) => ({
    ...f,
    vitalsOverride: false,
    vitals: { bp: '', pulse: '', temp: '', weight: '', height: '' },
  }));

  const shown = {
    bp: form.vitalsOverride ? form.vitals.bp : (triage?.bp ?? ''),
    pulse: form.vitalsOverride ? form.vitals.pulse : (triage?.pulse ?? ''),
    temp: form.vitalsOverride ? form.vitals.temp : (triage?.temp ?? ''),
    weight: form.vitalsOverride ? form.vitals.weight : (triage?.weight ?? ''),
    height: form.vitalsOverride ? form.vitals.height : (triage?.height ?? ''),
  };

  const historyColumns = [
    { key: 'date',       label: 'วันที่รับบริการ', render: (r) => formatFpDate(r.date) },
    { key: 'clientType', label: 'ประเภทผู้รับบริการ', render: (r) => resolveFpClientType(r.clientType) },
    { key: 'services',   label: 'บริการที่ได้รับ', flex: true, minWidth: 200, render: (r) => summarizeFpServices(r.services) },
    { key: 'pregnancyTest', label: 'ผลทดสอบการตั้งครรภ์', render: (r) => FP_PREGNANCY_TEST_OPTIONS.find((o) => o.value === r.pregnancyTest)?.label || '—' },
    { key: 'bp',         label: 'ความดันโลหิต', render: (r) => r.bp || '—' },
    { key: 'weight',     label: 'น้ำหนัก (กก.)', render: (r) => r.weight || '—' },
    { key: 'note',       label: 'บันทึก', flex: true, minWidth: 220, render: (r) => r.note || '—' },
    {
      key: 'savedBy', label: 'ผู้บันทึก', sortable: false,
      render: (r) => (
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary, #636B72)' }}>
          {r.savedBy || '—'}<br />{formatFpDateTime(r.savedAt)}
        </span>
      ),
    },
  ];

  return (
    <StepCard>
      <div className='flex items-center gap-2 flex-wrap'>
        {STEP1_SECTIONS.map((s) => (
          <TabCapsule
            key={s.key}
            variant='filter'
            label={s.label}
            selected={activeSection === s.key}
            onClick={() => jumpTo(s.key)}
          />
        ))}
      </div>

      {/* ── ทะเบียนวางแผนครอบครัว (carried forward) ────────────────── */}
      <AssessmentCard ref={(el) => { sectionRefs.current.screening = el; }}>
        <CarriedScreeningPanel patient={{ hn: fpHn }} />
      </AssessmentCard>

      <AssessmentCard ref={(el) => { sectionRefs.current.registration = el; }}>
        <TopicHeader icon='badge'>ทะเบียนวางแผนครอบครัว</TopicHeader>
        {registration && registration.status !== 'cancelled' ? (
          <>
            <Banner tone='brand' icon='history'>
              ดึงทะเบียนเดิมของผู้รับบริการมาให้แล้ว — เลขที่วางแผนครอบครัว{' '}
              <strong>{registration.fpNumber}</strong> · ลงทะเบียนเมื่อ {formatFpDateTime(registration.registeredAt)}{' '}
              · ผู้บันทึก {registration.recordedBy}
            </Banner>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='เลขที่วางแผนครอบครัว'>
                <InputField value={registration.fpNumber} onChange={() => {}} disabled />
              </Field>
              <Field label='วันเริ่มรับบริการครั้งแรก'>
                <InputField value={formatFpDate(registration.firstServiceDate)} onChange={() => {}} disabled />
              </Field>
              <Field label='บริการเดิมในทะเบียน'>
                <InputField value={summarizeFpServices(registration.services)} onChange={() => {}} disabled />
              </Field>
            </div>
          </>
        ) : (
          /* คู่มือ p.2-1/2-2 — HN ที่ยังไม่เคยลงทะเบียน */
          <EmptyState
            icon='person_search'
            title='ไม่พบข้อมูล กรุณาลงทะเบียน'
            subtitle={`HN ${fpHn} ยังไม่มีเลขที่วางแผนครอบครัว — ต้องลงทะเบียนก่อนจึงจะบันทึกการให้บริการได้ (คู่มือระบบงาน หน้า 2-1)`}
            action={(
              <BrandSubdueButton variant='fill' size='sm' leadingIcon='person_add' onClick={onGoRegistry} disabled={locked}>
                ลงทะเบียนวางแผนครอบครัว
              </BrandSubdueButton>
            )}
          />
        )}
      </AssessmentCard>

      {/* ── ผลการซักประวัติ (read-only จากห้องซักประวัติ) ────────────── */}
      <AssessmentCard ref={(el) => { sectionRefs.current.triage = el; }}>
        <TopicHeader
          icon='monitor_heart'
          trailing={!locked && (form.vitalsOverride ? (
            <NeutralSubdueButton size='sm' leadingIcon='undo' onClick={cancelOverride}>
              ยกเลิกการแก้ไข ใช้ค่าจากห้องซักประวัติ
            </NeutralSubdueButton>
          ) : (
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={enableOverride} disabled={!triage}>
              แก้ไขจากห้องตรวจ
            </BrandSubdueButton>
          ))}
        >
          ผลการซักประวัติและสัญญาณชีพ
        </TopicHeader>

        {triage ? (
          <>
            <Banner tone={form.vitalsOverride ? 'warning' : 'neutral'} icon={form.vitalsOverride ? 'edit' : 'lock'}>
              {form.vitalsOverride
                ? `กำลังแก้ไขค่าจากห้องตรวจ — ค่าเดิมจากห้องซักประวัติ: ${triage.bp} mmHg · ${triage.weight} กก. · ${triage.height} ซม.`
                : `ความดันโลหิต / น้ำหนัก / ส่วนสูง ดึงมาจากห้องซักประวัติ (${triage.recordedBy} · ${formatFpDateTime(triage.recordedAt)}) — แก้ไขไม่ได้ เว้นแต่กด "แก้ไขจากห้องตรวจ" (คู่มือ หน้า 2-6)`}
            </Banner>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='ความดันโลหิต (mmHg)'>
                <InputField value={String(shown.bp ?? '')} onChange={setVital('bp')} disabled={!form.vitalsOverride || locked} placeholder='เช่น 120/80' />
              </Field>
              <Field label='ชีพจร (ครั้ง/นาที)'>
                <InputField value={String(shown.pulse ?? '')} onChange={setVital('pulse')} disabled={!form.vitalsOverride || locked} placeholder='เช่น 78' />
              </Field>
              <Field label='อุณหภูมิ (°C)'>
                <InputField value={String(shown.temp ?? '')} onChange={setVital('temp')} disabled={!form.vitalsOverride || locked} placeholder='เช่น 36.8' />
              </Field>
              <Field label='น้ำหนัก (กก.)'>
                <InputField value={String(shown.weight ?? '')} onChange={setVital('weight')} disabled={!form.vitalsOverride || locked} placeholder='เช่น 54' />
              </Field>
              <Field label='ส่วนสูง (ซม.)'>
                <InputField value={String(shown.height ?? '')} onChange={setVital('height')} disabled={!form.vitalsOverride || locked} placeholder='เช่น 158' />
              </Field>
            </div>
          </>
        ) : (
          <EmptyState
            icon='monitor_heart'
            title='ยังไม่มีผลการซักประวัติของผู้รับบริการรายนี้'
            subtitle='ค่าความดันโลหิต น้ำหนัก และส่วนสูงจะแสดงอัตโนมัติเมื่อห้องซักประวัติบันทึกแล้ว — ระหว่างนี้บันทึกด้วยมือได้ที่ปุ่ม "แก้ไขจากห้องตรวจ"'
            action={(
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={enableOverride} disabled={locked}>
                บันทึกค่าจากห้องตรวจเอง
              </BrandSubdueButton>
            )}
          />
        )}

        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Field label='การตรวจน้ำตาลในปัสสาวะ' hint='คู่มือ หน้า 2-6 ข้อ 3'>
            <Select
              showLabel={false} searchable={false} size='lg' disabled={locked}
              value={form.urineSugar} onChange={(v) => setForm((f) => ({ ...f, urineSugar: v }))}
              options={FP_URINE_SUGAR_OPTIONS} placeholder='เลือกระดับน้ำตาล'
            />
          </Field>
          <Field label='การตรวจไข่ขาวในปัสสาวะ' hint='คู่มือ หน้า 2-6 ข้อ 4'>
            <Select
              showLabel={false} searchable={false} size='lg' disabled={locked}
              value={form.urineAlbumin} onChange={(v) => setForm((f) => ({ ...f, urineAlbumin: v }))}
              options={FP_URINE_ALBUMIN_OPTIONS} placeholder='เลือกระดับไข่ขาว'
            />
          </Field>
        </div>
      </AssessmentCard>

      {/* ── ประวัติการเจ็บป่วย ─────────────────────────────────────── */}
      <AssessmentCard ref={(el) => { sectionRefs.current.illness = el; }}>
        <TopicHeader icon='clipboard'>ประวัติการเจ็บป่วยและการใช้ยา</TopicHeader>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={form.illnessHistory}
          onChange={(e) => setForm((f) => ({ ...f, illnessHistory: e.target.value }))}
          suggestions={FP_ILLNESS_HISTORY_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น ไม่มีโรคประจำตัว ไม่แพ้ยา / ความดันโลหิตสูง รับประทานยาต่อเนื่อง'
        />
        {queueRow?.rightsExpired && (
          <Banner tone='warning' icon='warning'>
            สิทธิการรักษาของผู้รับบริการหมดอายุ ({queueRow.insurance}) — ยังบันทึกการให้บริการได้
            แต่ค่าบริการจะถูกส่งเป็น "ชำระเงินเอง" ไปยังห้องเงิน โปรดแจ้งผู้รับบริการก่อนกลับ
          </Banner>
        )}
      </AssessmentCard>

      {/* ── ประวัติการรับบริการวางแผนครอบครัว ─────────────────────── */}
      <AssessmentCard ref={(el) => { sectionRefs.current.history = el; }}>
        <TopicHeader icon='history'>ประวัติการรับบริการวางแผนครอบครัว</TopicHeader>
        {visits.length > 0 ? (
          <Table
            columns={historyColumns}
            rows={[...visits].reverse()}
            rowKey={(r) => `${r.date}-${r.savedAt || ''}`}
            emptyMessage='ยังไม่เคยรับบริการวางแผนครอบครัว'
          />
        ) : (
          <EmptyState
            icon='history'
            title='ยังไม่เคยรับบริการวางแผนครอบครัว'
            subtitle='ผู้รับบริการรายนี้ยังไม่มีประวัติการรับบริการในคลินิกวางแผนครอบครัว — ครั้งนี้จะเป็นการรับบริการครั้งแรก'
          />
        )}
      </AssessmentCard>
    </StepCard>
  );
};

/* ══ Step 2 — ซักประวัติคัดกรอง 11 ข้อ (คู่มือ p.2-5) ═══════════════ */
export const FpStep2Screening = ({ form, setForm, locked }) => {
  const screen = interpretFpScreening(form.screening);

  const setAnswer = (key) => (value) => setForm((f) => ({
    ...f,
    screening: { ...f.screening, [key]: value },
  }));

  const answerAllNo = () => setForm((f) => {
    const next = { ...f.screening };
    FP_SCREENING_ITEMS.forEach((q) => { if (!next[q.key]) next[q.key] = 'no'; });
    return { ...f, screening: next };
  });

  const clearAnswers = () => setForm((f) => ({ ...f, screening: {} }));

  const recordConsult = () => setForm((f) => ({
    ...f,
    doctorConsulted: true,
    doctorConsultedBy: FP_CURRENT_USER,
    doctorConsultedAt: new Date().toISOString(),
  }));

  const undoConsult = () => setForm((f) => ({
    ...f, doctorConsulted: false, doctorConsultedBy: '', doctorConsultedAt: '',
  }));

  return (
    <StepCard>
      <Banner tone='neutral' icon='rule'>
        กฎการจ่ายยา (คู่มือ หน้า 2-5): ตอบ <strong>"ไม่มี" ทุกข้อ → จ่ายยาได้</strong> ·
        ตอบ <strong>"มี" แม้เพียงข้อเดียว → ห้ามจ่ายยาเด็ดขาด ต้องส่งไปปรึกษาแพทย์ก่อน</strong>
      </Banner>

      {screen.mustReferDoctor && !form.doctorConsulted && (
        <Banner tone='danger' icon='e911_emergency'>
          พบข้อคัดกรองที่ตอบ "มี" {screen.flagged.length} ข้อ — ห้ามจ่ายยาคุมกำเนิด
          ระบบได้ปิดการสั่งยาในขั้นตอนที่ 6 ไว้จนกว่าจะบันทึกการส่งปรึกษาแพทย์
        </Banner>
      )}

      {screen.mustReferDoctor && form.doctorConsulted && (
        <Banner tone='warning' icon='medical_services'>
          บันทึกการส่งปรึกษาแพทย์แล้ว โดย {form.doctorConsultedBy} · {formatFpDateTime(form.doctorConsultedAt)} —
          ปลดล็อกการสั่งยาในขั้นตอนที่ 6 แล้ว โปรดยืนยันคำสั่งกับแพทย์ก่อนจ่ายจริง
        </Banner>
      )}

      {screen.answeredAll && !screen.mustReferDoctor && (
        <Banner tone='brand' icon='check-circle'>
          ตอบครบ 11 ข้อ และ "ไม่มี" ทุกข้อ — จ่ายยาคุมกำเนิดได้ตามเกณฑ์
        </Banner>
      )}

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <TopicHeader
          icon='fact_check'
          trailing={(
            <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                ตอบแล้ว {screen.answeredCount}/11 ข้อ
              </span>
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='done_all' onClick={answerAllNo} disabled={locked}>
                ตอบ "ไม่มี" ทุกข้อที่ยังว่าง
              </BrandSubdueButton>
              <NeutralSubdueButton size='sm' leadingIcon='restart_alt' onClick={clearAnswers} disabled={locked}>
                ล้างคำตอบ
              </NeutralSubdueButton>
            </div>
          )}
        >
          ซักประวัติการเจ็บป่วยและตรวจร่างกาย (11 ข้อ)
        </TopicHeader>

        {FP_SCREENING_ITEMS.map((q) => (
          <ChoiceRow
            key={q.key}
            label={q.label}
            options={FP_SCREENING_ANSWERS}
            value={form.screening?.[q.key]}
            onSelect={setAnswer(q.key)}
            locked={locked}
            tone={form.screening?.[q.key] === 'yes' ? 'danger' : undefined}
          />
        ))}
      </div>

      {screen.mustReferDoctor && (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <TopicHeader icon='medical_services'>ส่งปรึกษาแพทย์ (บังคับ)</TopicHeader>
          <div
            className='flex flex-col w-full'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              paddingTop: 'var(--dim-space-400, 16px)',
              paddingBottom: 'var(--dim-space-400, 16px)',
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
              borderRadius: 'var(--dim-radius-400, 12px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-danger-tertiary, #F6C9C9)',
              background: 'var(--surface-danger-quaternary, #FFF0F0)',
            }}
          >
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-danger-default, #B91C1C)', fontWeight: 'var(--type-weight-medium)' }}>
              ข้อที่ตอบ "มี":
            </span>
            {screen.flagged.map((label) => (
              <span key={label} style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-danger-default, #B91C1C)' }}>• {label}</span>
            ))}
            <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)', marginTop: 'var(--dim-space-200, 8px)' }}>
              {form.doctorConsulted ? (
                <NeutralSubdueButton size='sm' leadingIcon='undo' onClick={undoConsult} disabled={locked}>
                  ยกเลิกการบันทึกส่งปรึกษาแพทย์
                </NeutralSubdueButton>
              ) : (
                <BrandSubdueButton variant='fill' size='sm' leadingIcon='forward_to_inbox' onClick={recordConsult} disabled={locked}>
                  บันทึกว่าส่งปรึกษาแพทย์แล้ว
                </BrandSubdueButton>
              )}
            </div>
          </div>
        </div>
      )}

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='edit_note'>บันทึกเพิ่มเติมจากการซักประวัติ</TopicHeader>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={form.screeningNote}
          onChange={(e) => setForm((f) => ({ ...f, screeningNote: e.target.value }))}
          suggestions={[
            'ไม่พบข้อห้ามใช้ยาคุมกำเนิดจากการซักประวัติ',
            'มีอาการปวดศีรษะเล็กน้อย ไม่เข้าเกณฑ์ไมเกรนที่มีอาการนำ',
            'ความดันโลหิตสูงกว่าเกณฑ์ ส่งวัดซ้ำและปรึกษาแพทย์',
            'ผู้รับบริการปฏิเสธประวัติเจ็บป่วยเรื้อรัง',
            'แนะนำให้สังเกตอาการผิดปกติและกลับมาพบแพทย์ทันทีหากมีอาการ',
          ]}
          minChars={3}
          placeholder='บันทึกรายละเอียดที่ได้จากการซักประวัติเพิ่มเติม'
        />
      </div>
    </StepCard>
  );
};

/* ══ Step 3 — วางแผนครอบครัวและคำแนะนำ (TOR 1.10.8.7) ══════════════ */
export const FpStep3Plan = ({ form, setForm, locked }) => {
  const screen = interpretFpScreening(form.screening);
  const dispensingBlocked = screen.mustReferDoctor && !form.doctorConsulted;
  const pregnant = form.pregnancyTest === 'positive';

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleService = (key) => {
    if (locked) return;
    const service = resolveFpService(key);
    /* บล็อกเฉพาะการ "เพิ่ม" รายการใหม่ — รายการที่เลือกไว้แล้วต้องถอน
       ติ๊กออกได้เสมอ ไม่งั้นติดธง/ตั้งครรภ์ทีหลังแล้ว deadlock ปลดไม่ได้ */
    const alreadySelected = form.services.includes(key);
    if (!alreadySelected) {
      if (dispensingBlocked && !FP_SERVICES_ALLOWED_WHEN_FLAGGED.includes(key)) return;
      if (pregnant && service?.hormonal) return;
    }
    setForm((f) => ({
      ...f,
      services: f.services.includes(key)
        ? f.services.filter((k) => k !== key)
        : [...f.services, key],
    }));
  };

  const toggleRemoval = (key) => {
    if (locked) return;
    setForm((f) => ({
      ...f,
      removals: f.removals.includes(key)
        ? f.removals.filter((k) => k !== key)
        : [...f.removals, key],
    }));
  };

  const lmpFuture = !!form.lmp && form.lmp > todayIso();
  const monthValue = Number(form.lastDeliveryMonth);
  const monthInvalid = !!form.lastDeliveryMonth && (!Number.isInteger(monthValue) || monthValue < 1 || monthValue > 12);

  const serviceDisabledReason = (key) => {
    const service = resolveFpService(key);
    if (dispensingBlocked && !FP_SERVICES_ALLOWED_WHEN_FLAGGED.includes(key)) {
      return 'ปิดไว้ — ผลคัดกรองมีข้อ "มี" ต้องส่งปรึกษาแพทย์ก่อน (คู่มือ หน้า 2-5)';
    }
    if (pregnant && service?.hormonal) {
      return 'ปิดไว้ — ผลทดสอบการตั้งครรภ์เป็น "ตั้งครรภ์" ห้ามใช้วิธีที่มีฮอร์โมน';
    }
    return undefined;
  };

  return (
    <StepCard>
      {dispensingBlocked && (
        <Banner tone='danger' icon='block'>
          ผลคัดกรอง 11 ข้อ มีข้อที่ตอบ "มี" — เลือกได้เฉพาะถุงยางอนามัย/การให้คำปรึกษา
          จนกว่าจะบันทึกการส่งปรึกษาแพทย์ในขั้นตอนที่ 2
        </Banner>
      )}

      {pregnant && (
        <Banner tone='warning' icon='pregnant_woman'>
          ผลทดสอบการตั้งครรภ์เป็นบวก — ระบบปิดวิธีคุมกำเนิดชนิดฮอร์โมน (ยาเม็ด/ยาฉีด/ยาฝัง)
          ให้ส่งต่อคลินิกฝากครรภ์ (ANC) ในขั้นตอนที่ 6 และให้คำแนะนำการดูแลครรภ์
        </Banner>
      )}

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='event'>ข้อมูลการรับบริการ</TopicHeader>
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Field label='วันที่รับบริการ' required hint='ระบบกำหนดเป็นวันที่ปัจจุบัน แก้ไขได้'>
            <DatePicker
              showLabel={false}
              disabled={locked}
              value={form.serviceDate ? new Date(form.serviceDate) : null}
              onChange={(d) => set('serviceDate')(d ? d.toISOString().slice(0, 10) : '')}
              placeholder='เลือกวันที่รับบริการ'
            />
          </Field>
          <Field label='ผลทดสอบการตั้งครรภ์' hint='คู่มือ หน้า 2-4 ข้อ 6'>
            <Select
              showLabel={false} searchable={false} size='lg' disabled={locked}
              value={form.pregnancyTest} onChange={set('pregnancyTest')}
              options={FP_PREGNANCY_TEST_OPTIONS} placeholder='เลือกผลทดสอบ'
            />
          </Field>
        </div>
      </div>

      {/* ประเภทผู้รับบริการ — 5 Radio Box (คู่มือ หน้า 2-3 ข้อ 3) */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='how_to_reg'>ประเภทผู้รับบริการ</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {FP_CLIENT_TYPES.map((t) => (
            <SelectableTag
              key={t.value}
              label={t.label}
              size='lg'
              selected={form.clientType === t.value}
              onClick={() => { if (!locked) set('clientType')(t.value); }}
            />
          ))}
        </div>
        {!form.clientType && (
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-danger-default, #B91C1C)' }}>
            ต้องเลือกประเภทผู้รับบริการก่อนบันทึก
          </span>
        )}
      </div>

      {/* วิธีคุมกำเนิดครั้งสุดท้าย — เลือก "อื่นๆ" เปิดช่องระบุ (ข้อ 4.1) */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='history'>วิธีคุมกำเนิดครั้งสุดท้าย</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {FP_LAST_METHODS.map((m) => (
            <SelectableTag
              key={m.value}
              label={m.label}
              size='lg'
              selected={form.lastMethod === m.value}
              onClick={() => {
                if (locked) return;
                set('lastMethod')(m.value);
                if (m.value !== 'other') set('lastMethodOther')('');
              }}
            />
          ))}
        </div>
        {form.lastMethod === 'other' && (
          <Field
            label='ระบุวิธีคุมกำเนิดอื่นๆ'
            required
            hint={form.lastMethodOther.trim() ? undefined : 'จำเป็นต้องระบุเมื่อเลือก "อื่นๆ" (คู่มือ ข้อ 4.1)'}
            hintTone={form.lastMethodOther.trim() ? undefined : 'error'}
          >
            <InputField
              value={form.lastMethodOther}
              onChange={set('lastMethodOther')}
              disabled={locked}
              placeholder='เช่น นับวันปลอดภัย / หลั่งภายนอก / ห่วงอนามัยชนิดฮอร์โมน'
              error={form.lastMethodOther.trim() ? undefined : ' '}
            />
          </Field>
        )}
      </div>

      {/* บริการที่ได้รับ (คู่มือ หน้า 2-4 ข้อ 5) */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='vaccines'>บริการที่ได้รับ</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {FP_SERVICES.map((s) => {
            const reason = serviceDisabledReason(s.key);
            return (
              <span key={s.key} title={reason} style={{ opacity: reason ? 0.45 : 1 }}>
                <SelectableTag
                  label={s.label}
                  size='lg'
                  selected={form.services.includes(s.key)}
                  onClick={() => toggleService(s.key)}
                />
              </span>
            );
          })}
        </div>
        {form.services.length === 0 && (
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-danger-default, #B91C1C)' }}>
            ต้องเลือกบริการที่ได้รับอย่างน้อย 1 รายการก่อนบันทึก
          </span>
        )}
        {/* เหตุผลที่บางบริการถูกปิด — แสดงเป็นข้อความเสมอ ไม่ผูกกับ hover
            เพื่อให้ผู้ใช้คีย์บอร์ด/แท็บเล็ตเห็นด้วย */}
        {(dispensingBlocked || pregnant) && (
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-warning-default, #C2410C)' }}>
            บริการที่จางลงถูกปิดไว้:{' '}
            {FP_SERVICES.filter((s) => !!serviceDisabledReason(s.key)).map((s) => s.label).join(' · ')}
            {dispensingBlocked ? ' — เนื่องจากผลคัดกรองมีข้อ "มี" ต้องส่งปรึกษาแพทย์ก่อน' : ''}
            {pregnant ? ' — เนื่องจากผลทดสอบการตั้งครรภ์เป็นบวก (ห้ามวิธีที่มีฮอร์โมน)' : ''}
          </span>
        )}

        <div className='flex items-center gap-3 flex-wrap'>
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
            การถอด (เข้าทะเบียนถอดห่วง/ถอดยาฝัง):
          </span>
          {FP_REMOVAL_OPTIONS.map((r) => (
            <SelectableTag
              key={r.key}
              label={r.label}
              size='md'
              selected={form.removals.includes(r.key)}
              onClick={() => toggleRemoval(r.key)}
            />
          ))}
          <SelectableTag
            label='จ่ายยาคุมกำเนิดจริงในครั้งนี้'
            size='md'
            selected={form.dispensed}
            onClick={() => {
              /* ถอนติ๊กได้เสมอ — บล็อกเฉพาะการติ๊กใหม่ตอน dispensingBlocked */
              if (!locked && (form.dispensed || !dispensingBlocked)) set('dispensed')(!form.dispensed);
            }}
          />
        </div>
      </div>

      {/* คลอด/แท้งครั้งสุดท้าย + LMP (คู่มือ หน้า 2-4 ข้อ 7-8) */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='calendar'>ประวัติการคลอด / แท้ง และประจำเดือน</TopicHeader>
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Field label='ครั้งสุดท้ายเป็น'>
            <Select
              showLabel={false} searchable={false} size='lg' disabled={locked}
              value={form.lastDeliveryType} onChange={set('lastDeliveryType')}
              options={[
                { value: 'none', label: 'ไม่เคยคลอด/แท้ง' },
                { value: 'delivery', label: 'คลอดบุตร' },
                { value: 'abortion', label: 'แท้งบุตร' },
              ]}
              placeholder='เลือกประเภท'
            />
          </Field>
          <Field
            label='เดือน (1–12)'
            hint={monthInvalid ? 'เดือนต้องอยู่ระหว่าง 1–12' : 'คลอด/แท้งครั้งสุดท้ายผ่านมาแล้วเมื่อเดือน/ปีใด'}
            hintTone={monthInvalid ? 'error' : undefined}
          >
            <InputField
              value={form.lastDeliveryMonth}
              onChange={set('lastDeliveryMonth')}
              disabled={locked || form.lastDeliveryType === 'none'}
              placeholder='เช่น 6'
              error={monthInvalid ? ' ' : undefined}
            />
          </Field>
          <Field label='ปี (พ.ศ.)'>
            <InputField
              value={form.lastDeliveryYear}
              onChange={set('lastDeliveryYear')}
              disabled={locked || form.lastDeliveryType === 'none'}
              placeholder='เช่น 2568'
            />
          </Field>
          <Field
            label='วันแรกของประจำเดือนครั้งสุดท้าย (LMP)'
            hint={lmpFuture ? 'LMP ต้องไม่เป็นวันในอนาคต' : 'วันแรกของประจำเดือนครั้งสุดท้ายก่อนมารับบริการ'}
            hintTone={lmpFuture ? 'error' : undefined}
          >
            <DatePicker
              showLabel={false}
              disabled={locked}
              value={form.lmp ? new Date(form.lmp) : null}
              onChange={(d) => set('lmp')(d ? d.toISOString().slice(0, 10) : '')}
              placeholder='เลือกวันที่'
              error={lmpFuture ? ' ' : undefined}
            />
          </Field>
        </div>
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='clipboard'>คำแนะนำการวางแผนครอบครัว</TopicHeader>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={form.adviceNote}
          onChange={(e) => setForm((f) => ({ ...f, adviceNote: e.target.value }))}
          suggestions={FP_ADVICE_SUGGESTIONS}
          minChars={3}
          placeholder='คำแนะนำการใช้วิธีคุมกำเนิด อาการข้างเคียงที่ต้องเฝ้าระวัง และการมาตามนัด'
        />
      </div>
    </StepCard>
  );
};

/* ══ Step 4 — ตรวจสตรี (มะเร็งเต้านม / ตรวจภายใน-ปากมดลูก) ═══════════ */
const S4_TABS = [
  { key: 'breast', label: 'มะเร็งเต้านม' },
  { key: 'pv',     label: 'ตรวจภายใน / มะเร็งปากมดลูก' },
];

export const FpStep4WomenExam = ({ form, setForm, fpHn, locked }) => {
  const [tab, setTab] = useState('breast');
  const [canvasOpen, setCanvasOpen] = useState(false);
  const canRead = hasFamilyPlanningRights();

  const setBreast = (side, key) => (value) => setForm((f) => ({
    ...f,
    breast: { ...f.breast, [side]: { ...f.breast[side], [key]: value } },
  }));

  const setPv = (key) => (value) => setForm((f) => ({ ...f, pv: { ...f.pv, [key]: value } }));
  const setCytology = (key) => (value) => setForm((f) => ({
    ...f,
    cytologyRequest: { ...f.cytologyRequest, [key]: value },
  }));
  const setCytologyResult = (key) => (value) => setForm((f) => ({
    ...f,
    cytologyResult: { ...f.cytologyResult, [key]: value },
  }));
  const toggleInList = (list, code) => (
    list.includes(code) ? list.filter((c) => c !== code) : [...list, code]
  );
  const toggleSpecimen = (value) => {
    if (locked) return;
    setCytology('specimenTypes')(toggleInList(form.cytologyRequest.specimenTypes || [], value));
  };
  const toggleAdequacy = (code) => {
    if (locked) return;
    setCytologyResult('adequacy')(toggleInList(form.cytologyResult.adequacy || [], code));
  };
  const toggleCategory = (code) => {
    if (locked) return;
    setCytologyResult('categories')(toggleInList(form.cytologyResult.categories || [], code));
  };
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  /* คู่มือ §2.1.3 ข้อ 5.2 — เลือกผล "ปกติ" → เติมรายละเอียดอัตโนมัติ;
     "รอผล/ผิดปกติ" → ล้างช่องไว้ให้คีย์เอง */
  const setPapResult = (value) => setForm((f) => ({
    ...f,
    papResult: value,
    papDetail: value === 'normal' ? FP_PAP_AUTO_DETAIL : (f.papDetail === FP_PAP_AUTO_DETAIL ? '' : f.papDetail),
  }));

  const priorVisits = useMemo(() => getFpVisitRecords(fpHn), [fpHn]);
  const priorBreastExams = useMemo(
    () => priorVisits.filter((v) => v.breast?.left?.result || v.breast?.right?.result),
    [priorVisits],
  );

  if (!canRead) {
    return (
      <StepCard>
        <TopicHeader icon='lock'>ตรวจสตรี</TopicHeader>
        <FpConfidentialMask what='ผลการตรวจมะเร็งเต้านม การตรวจภายใน และผลตรวจมะเร็งปากมดลูก' />
      </StepCard>
    );
  }

  return (
    <StepCard>
      <div className='flex items-center gap-2 flex-wrap'>
        {S4_TABS.map((t) => (
          <TabCapsule
            key={t.key}
            variant='filter'
            label={t.label}
            selected={tab === t.key}
            onClick={() => setTab(t.key)}
          />
        ))}
      </div>

      {tab === 'breast' && (
        <>
          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Field label='วันที่รับบริการตรวจเต้านม' hint='ค่าเริ่มต้นเป็นวันที่ปัจจุบัน แก้ไขได้ (คู่มือ ข้อ 2.1)'>
              <DatePicker
                showLabel={false}
                disabled={locked}
                value={form.breastExamDate ? new Date(form.breastExamDate) : null}
                onChange={(d) => set('breastExamDate')(d ? d.toISOString().slice(0, 10) : '')}
                placeholder='เลือกวันที่'
              />
            </Field>
          </div>

          {FP_BREAST_SIDES.map((side) => (
            <div key={side.key} className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <TopicHeader icon='diagnosis'>{side.label}</TopicHeader>
              <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                <Field label='ผลการตรวจ'>
                  <Select
                    showLabel={false} searchable={false} size='lg' disabled={locked}
                    value={form.breast[side.key].result}
                    onChange={setBreast(side.key, 'result')}
                    options={FP_EXAM_RESULT_OPTIONS}
                    placeholder='เลือกผลการตรวจ'
                  />
                </Field>
              </div>
              <SuggestibleTextarea
                voice
                disabled={locked}
                value={form.breast[side.key].detail}
                onChange={(e) => setBreast(side.key, 'detail')(e.target.value)}
                suggestions={FP_BREAST_DETAIL_SUGGESTIONS}
                minChars={3}
                rows={2}
                minHeight={64}
                placeholder={`รายละเอียดผลการตรวจ${side.label}`}
              />
            </div>
          ))}

          {/* ภาพประกอบ/มาร์คตำแหน่ง — แทน Abstract PaintImage ของระบบเดิม */}
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <TopicHeader icon='draw'>ภาพประกอบและการมาร์คตำแหน่ง</TopicHeader>
            <div className='flex items-center gap-3 flex-wrap'>
              <BrandSubdueButton variant='outline' leadingIcon='edit_square' onClick={() => setCanvasOpen(true)} disabled={locked}>
                {form.breastMarkers.length > 0 || form.breastDrawings.length > 0 ? 'แก้ไข/ดูภาพประกอบ' : 'เพิ่มภาพประกอบการตรวจ'}
              </BrandSubdueButton>
              {form.breastMarkers.length > 0 && (
                <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
                  มาร์คตำแหน่งไว้ {form.breastMarkers.length} จุด
                </ColorfulBadge>
              )}
              {form.breastDrawings.length > 0 && (
                <ColorfulBadge style='blue' size='small' hierarchy='secondary'>
                  มีการวาดประกอบ {form.breastDrawings.length} ชิ้น
                </ColorfulBadge>
              )}
              {(form.breastMarkers.length > 0 || form.breastDrawings.length > 0) && !locked && (
                <NeutralSubdueButton
                  size='sm' leadingIcon='delete'
                  onClick={() => setForm((f) => ({ ...f, breastMarkers: [], breastDrawings: [] }))}
                >
                  ล้างภาพประกอบ
                </NeutralSubdueButton>
              )}
            </div>

            <DrawingCanvasPopup
              open={canvasOpen}
              onClose={() => setCanvasOpen(false)}
              onSave={(nextMarkers, nextDrawings) => {
                setForm((f) => ({
                  ...f,
                  breastMarkers: nextMarkers ?? f.breastMarkers,
                  breastDrawings: nextDrawings ?? f.breastDrawings,
                }));
                setCanvasOpen(false);
              }}
              title='บันทึกภาพการตรวจมะเร็งเต้านม'
              subtitle='คลิกที่ตำแหน่งบนร่างกายเพื่อมาร์คก้อน/รอยโรค และวาดประกอบผลการตรวจ'
              viewKey='front'
              markers={form.breastMarkers}
              onMarkersChange={(next) => setForm((f) => ({ ...f, breastMarkers: next }))}
              drawings={form.breastDrawings}
              onDrawingsChange={(next) => setForm((f) => ({ ...f, breastDrawings: next }))}
            />
          </div>

          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <TopicHeader icon='history'>ประวัติการตรวจเต้านมครั้งก่อน</TopicHeader>
            {priorBreastExams.length > 0 ? (
              <Table
                columns={[
                  { key: 'date',  label: 'วันที่ตรวจ', render: (r) => formatFpDate(r.breastExamDate || r.date) },
                  { key: 'left',  label: 'ผลข้างซ้าย', render: (r) => FP_EXAM_RESULT_OPTIONS.find((o) => o.value === r.breast?.left?.result)?.label || '—' },
                  { key: 'right', label: 'ผลข้างขวา', render: (r) => FP_EXAM_RESULT_OPTIONS.find((o) => o.value === r.breast?.right?.result)?.label || '—' },
                  { key: 'detail', label: 'รายละเอียด', flex: true, minWidth: 240, render: (r) => [r.breast?.left?.detail, r.breast?.right?.detail].filter(Boolean).join(' · ') || '—' },
                  { key: 'savedBy', label: 'ผู้บันทึก', sortable: false, render: (r) => r.savedBy || '—' },
                ]}
                rows={[...priorBreastExams].reverse()}
                rowKey={(r) => `breast-${r.savedAt || r.date}`}
                emptyMessage='ยังไม่มีประวัติการตรวจเต้านม'
              />
            ) : (
              <EmptyState icon='diagnosis' title='ยังไม่มีประวัติการตรวจมะเร็งเต้านม' subtitle='ผลการตรวจครั้งนี้จะถูกบันทึกเป็นครั้งแรกของผู้รับบริการ' />
            )}
          </div>
        </>
      )}

      {tab === 'pv' && (
        <>
          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Field label='วันที่รับบริการ' hint='ค่าเริ่มต้นเป็นวันที่ปัจจุบัน (คู่มือ §2.1.3 ข้อ 2)'>
              <DatePicker
                showLabel={false}
                disabled={locked}
                value={form.pvExamDate ? new Date(form.pvExamDate) : null}
                onChange={(d) => set('pvExamDate')(d ? d.toISOString().slice(0, 10) : '')}
                placeholder='เลือกวันที่'
              />
            </Field>
            <Field label='ประเภทผู้ป่วย' hint='คู่มือ §2.1.3 ข้อ 3'>
              <Select
                showLabel={false} searchable={false} size='lg' disabled={locked}
                value={form.pvPatientType} onChange={set('pvPatientType')}
                options={[{ value: 'new', label: 'ผู้ป่วยใหม่' }, { value: 'old', label: 'ผู้ป่วยเก่า' }]}
                placeholder='เลือกประเภท'
              />
            </Field>
          </div>

          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <TopicHeader icon='forum'>การให้คำปรึกษา</TopicHeader>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='ได้รับคำปรึกษา'>
                <Select
                  showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={form.counselingReceived} onChange={set('counselingReceived')}
                  options={[{ value: 'yes', label: 'ได้รับ' }, { value: 'no', label: 'ไม่ได้รับ' }]}
                  placeholder='เลือก'
                />
              </Field>
              <Field label='ประเภทคำปรึกษา'>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  disabled={locked || form.counselingReceived !== 'yes'}
                  value={form.counselingType} onChange={set('counselingType')}
                  options={FP_COUNSELING_TYPES} placeholder='เลือกประเภท'
                />
              </Field>
            </div>
            <SuggestibleTextarea
              voice
              disabled={locked || form.counselingReceived !== 'yes'}
              value={form.counselingDetail}
              onChange={(e) => set('counselingDetail')(e.target.value)}
              suggestions={[
                'อธิบายขั้นตอนการตรวจภายในและการเก็บสิ่งส่งตรวจ',
                'ให้คำปรึกษาเรื่องการป้องกันโรคติดต่อทางเพศสัมพันธ์',
                'อธิบายผลการตรวจและแผนการติดตาม',
                'ให้คำปรึกษาการเลือกวิธีคุมกำเนิดที่เหมาะสม',
              ]}
              minChars={3}
              rows={2}
              minHeight={64}
              placeholder='รายละเอียดการให้คำปรึกษา'
            />
          </div>

          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <TopicHeader icon='stethoscope'>P.V. Examination</TopicHeader>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='Vagina'>
                <Select showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={form.pv.vagina} onChange={setPv('vagina')} options={FP_PV_VAGINA_OPTIONS} placeholder='เลือกผลตรวจ' />
              </Field>
              <Field label='Cervix'>
                <Select showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={form.pv.cervix} onChange={setPv('cervix')} options={FP_PV_CERVIX_OPTIONS} placeholder='เลือกผลตรวจ' />
              </Field>
              <Field label='Uterus position'>
                <Select showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={form.pv.uterusPosition} onChange={setPv('uterusPosition')} options={FP_PV_UTERUS_POSITION_OPTIONS} placeholder='เลือกตำแหน่ง' />
              </Field>
              <Field label='Uterus size'>
                <Select showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={form.pv.uterusSize} onChange={setPv('uterusSize')} options={FP_PV_UTERUS_SIZE_OPTIONS} placeholder='เลือกขนาด' />
              </Field>
              <Field label='Adnexa'>
                <Select showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={form.pv.adnexa} onChange={setPv('adnexa')} options={FP_PV_ADNEXA_OPTIONS} placeholder='เลือกผลตรวจ' />
              </Field>
            </div>
            <SuggestibleTextarea
              voice
              disabled={locked}
              value={form.pv.detail}
              onChange={(e) => setPv('detail')(e.target.value)}
              suggestions={FP_PV_DETAIL_SUGGESTIONS}
              minChars={3}
              placeholder='รายละเอียดผลการตรวจภายใน (Detail / Dx / Px)'
            />
          </div>

          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <TopicHeader icon='biotech'>ผลการตรวจมะเร็งปากมดลูก</TopicHeader>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='วิธีการตรวจ'>
                <Select showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={form.papMethod} onChange={set('papMethod')} options={FP_PAP_METHOD_OPTIONS} placeholder='เลือกวิธีการตรวจ' />
              </Field>
              <Field label='ผลการตรวจ'>
                <Select showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={form.papResult} onChange={setPapResult} options={FP_PAP_RESULT_OPTIONS} placeholder='เลือกผลการตรวจ' />
              </Field>
              <Field label='ผู้ทำเสมียร์'>
                <Select showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={form.papSmearBy} onChange={set('papSmearBy')}
                  options={[...FP_DOCTORS, FP_CURRENT_USER].map((n) => ({ value: n, label: n }))}
                  placeholder='เลือกผู้ทำเสมียร์' />
              </Field>
              <Field label='ผู้ทำการตรวจ'>
                <Select showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={form.papExaminedBy} onChange={set('papExaminedBy')}
                  options={FP_DOCTORS.map((n) => ({ value: n, label: n }))}
                  placeholder='เลือกผู้ตรวจ' />
              </Field>
            </div>
            <SuggestibleTextarea
              voice
              disabled={locked}
              value={form.papDetail}
              onChange={(e) => set('papDetail')(e.target.value)}
              suggestions={FP_PV_DETAIL_SUGGESTIONS}
              minChars={3}
              rows={2}
              minHeight={64}
              placeholder='รายละเอียดผลการตรวจมะเร็งปากมดลูก'
            />
            <div className='flex items-center gap-3 flex-wrap'>
              <SelectableTag
                label='ส่งสิ่งส่งตรวจไปห้องปฏิบัติการแล้ว'
                size='md'
                selected={form.papSentToLab}
                onClick={() => { if (!locked) set('papSentToLab')(!form.papSentToLab); }}
              />
              <SelectableTag
                label='แจ้งผลให้ผู้รับบริการทราบ'
                size='md'
                selected={form.papNotifyClient}
                onClick={() => { if (!locked) set('papNotifyClient')(!form.papNotifyClient); }}
              />
              <SelectableTag
                label='ติดตามการรักษา / นัดแจ้งผล'
                size='md'
                selected={form.papFollowUp}
                onClick={() => { if (!locked) set('papFollowUp')(!form.papFollowUp); }}
              />
            </div>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='ค่าใช้จ่ายบริการรวม (บาท)'>
                <InputField
                  value={form.papServiceCost}
                  onChange={set('papServiceCost')}
                  disabled={locked}
                  type='number'
                  placeholder='0.00'
                />
              </Field>
              <Field label='การเบิกค่าบริการ'>
                <SelectableTag
                  label='ขอเบิกค่าบริการ'
                  size='md'
                  selected={form.papReimbursement}
                  onClick={() => { if (!locked) set('papReimbursement')(!form.papReimbursement); }}
                />
              </Field>
            </div>
            {form.papResult === 'abnormal' && (
              <Banner tone='danger' icon='warning'>
                ผลตรวจมะเร็งปากมดลูกผิดปกติ — ต้องบันทึกการส่งต่อสูตินรีแพทย์ในขั้นตอนที่ 6
                และนัดแจ้งผลในขั้นตอนที่ 7
              </Banner>
            )}
          </div>

          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <TopicHeader icon='description'>Cytologic Request</TopicHeader>
            <Banner tone='neutral' icon='info'>
              ประวัติประกอบการขอตรวจเซลล์วิทยา - บันทึกเฉพาะเมื่อมีการส่งตรวจมะเร็งปากมดลูก
            </Banner>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <CodeGroupLabel>Type of Specimen — เลือกได้มากกว่าหนึ่งชนิด</CodeGroupLabel>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                {FP_SPECIMEN_TYPES.map((type) => (
                  <Checkbox
                    key={type.value}
                    checked={(form.cytologyRequest.specimenTypes || []).includes(type.value)}
                    onChange={() => toggleSpecimen(type.value)}
                    disabled={locked}
                    label={type.label}
                  />
                ))}
                {(form.cytologyRequest.specimenTypes || []).includes('other') ? (
                  <InputField
                    value={form.cytologyRequest.specimenOther}
                    onChange={setCytology('specimenOther')}
                    disabled={locked}
                    placeholder='ระบุชนิดสิ่งส่งตรวจ'
                  />
                ) : null}
              </div>
            </div>
            <CodeGroupLabel>Pertinent Clinical History</CodeGroupLabel>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='คลอดครบกำหนด (คน)'>
                <InputField value={form.cytologyRequest.termBirths} onChange={setCytology('termBirths')} disabled={locked} type='number' placeholder='0' />
              </Field>
              <Field label='คลอดก่อนกำหนด (คน)'>
                <InputField value={form.cytologyRequest.pretermBirths} onChange={setCytology('pretermBirths')} disabled={locked} type='number' placeholder='0' />
              </Field>
              <Field label='แท้ง (ครั้ง)'>
                <InputField value={form.cytologyRequest.abortions} onChange={setCytology('abortions')} disabled={locked} type='number' placeholder='0' />
              </Field>
              <Field label='บุตรมีชีวิต (คน)'>
                <InputField value={form.cytologyRequest.livingChildren} onChange={setCytology('livingChildren')} disabled={locked} type='number' placeholder='0' />
              </Field>
              <Field label='อายุบุตรคนสุดท้าย'>
                <InputField value={form.cytologyRequest.youngestChildAge} onChange={setCytology('youngestChildAge')} disabled={locked} placeholder='เช่น 2 ปี 3 เดือน' />
              </Field>
            </div>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='Yrs. L.M.P. (ปี)'>
                <InputField value={form.cytologyRequest.lmpYears} onChange={setCytology('lmpYears')} disabled={locked} type='number' placeholder='0' />
              </Field>
              <Field label='ระยะเวลามีประจำเดือน (วัน)'>
                <InputField value={form.cytologyRequest.lmpDays} onChange={setCytology('lmpDays')} disabled={locked} type='number' placeholder='เช่น 5' />
              </Field>
              <Field label='L.M.P. อื่น / จำวันไม่ได้'>
                <InputField value={form.cytologyRequest.lmpOther} onChange={setCytology('lmpOther')} disabled={locked} placeholder='เช่น หมดประจำเดือน 3 เดือน' />
              </Field>
              <Field label='การคุมกำเนิด'>
                <Select
                  showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={form.cytologyRequest.contraception}
                  onChange={setCytology('contraception')}
                  options={FP_LAST_METHODS}
                  placeholder='เลือกวิธีคุมกำเนิด'
                />
              </Field>
              <Field label='เคยทำ smear มาก่อน'>
                <Select
                  showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={form.cytologyRequest.previousSmear}
                  onChange={setCytology('previousSmear')}
                  options={[{ value: 'yes', label: 'เคย' }, { value: 'no', label: 'ไม่เคย' }]}
                  placeholder='เลือก'
                />
              </Field>
              {/* ของเดิมถามต่อว่า "เคยทำเมื่อกี่ปีก่อน" — ถามเฉพาะเมื่อตอบว่าเคย */}
              {form.cytologyRequest.previousSmear === 'yes' ? (
                <Field label='เคยทำ smear เมื่อ (ปี)'>
                  <InputField
                    value={form.cytologyRequest.previousSmearYears}
                    onChange={setCytology('previousSmearYears')}
                    disabled={locked}
                    type='number'
                    placeholder='เช่น 3'
                  />
                </Field>
              ) : null}
            </div>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='Previous treatment'>
                <InputField value={form.cytologyRequest.previousTreatment} onChange={setCytology('previousTreatment')} disabled={locked} placeholder='การรักษาที่เคยได้รับ' />
              </Field>
              <Field label='Last Pap in 5 years'>
                <InputField value={form.cytologyRequest.lastPapInFiveYears} onChange={setCytology('lastPapInFiveYears')} disabled={locked} placeholder='ผล Pap ครั้งล่าสุดใน 5 ปี' />
              </Field>
            </div>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='Clinical Findings'>
                <InputField value={form.cytologyRequest.clinicalFindings} onChange={setCytology('clinicalFindings')} disabled={locked} placeholder='สิ่งที่ตรวจพบทางคลินิก' />
              </Field>
              <Field label='Clinical Dx'>
                <InputField value={form.cytologyRequest.clinicalDx} onChange={setCytology('clinicalDx')} disabled={locked} placeholder='การวินิจฉัยทางคลินิก' />
              </Field>
            </div>
          </div>

          {/* §2.1.3 ข้อ 7 — แท็บ "ผลการตรวจ" ของใบเดิม ห้องเซลล์วิทยาเป็นคน
              กรอกกลับมา จึงเปิดให้บันทึกเฉพาะเมื่อส่งสิ่งส่งตรวจไปแล้ว */}
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <TopicHeader icon='biotech'>ผลการตรวจเซลล์วิทยา (Bethesda)</TopicHeader>
            {!form.papSentToLab ? (
              <Banner tone='neutral' icon='info'>
                ยังไม่ได้ส่งสิ่งส่งตรวจไปห้องปฏิบัติการ — ติ๊ก “ส่งสิ่งส่งตรวจไปห้องปฏิบัติการแล้ว”
                ด้านบนก่อน จึงจะบันทึกผลที่ห้องเซลล์วิทยาอ่านกลับมาได้
              </Banner>
            ) : (
              <>
                <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <Field label='วันที่รับสิ่งส่งตรวจ'>
                    <DatePicker
                      showLabel={false}
                      disabled={locked}
                      value={form.cytologyResult.receivedDate ? new Date(form.cytologyResult.receivedDate) : null}
                      onChange={(d) => setCytologyResult('receivedDate')(d ? d.toISOString().slice(0, 10) : '')}
                    />
                  </Field>
                </div>

                <CodeGroupLabel>Specimen Adequacy</CodeGroupLabel>
                {FP_CYTOLOGY_ADEQUACY.map((group) => (
                  <div key={group.code} className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <Checkbox
                      checked={(form.cytologyResult.adequacy || []).includes(group.code)}
                      onChange={() => toggleAdequacy(group.code)}
                      disabled={locked}
                      label={`${group.code} ${group.label}`}
                    />
                    <div style={{ paddingInlineStart: 'var(--dim-space-600, 24px)' }}>
                      <CodeCheckList
                        items={group.items}
                        selected={form.cytologyResult.adequacy || []}
                        onToggle={toggleAdequacy}
                        disabled={locked}
                        freeTextValue={{ '029': form.cytologyResult.adequacyOther }}
                        onFreeTextChange={(_code, value) => setCytologyResult('adequacyOther')(value)}
                      />
                    </div>
                  </div>
                ))}

                <CodeGroupLabel>General Categorization (optional)</CodeGroupLabel>
                {FP_CYTOLOGY_CATEGORIES.map((group) => (
                  <div key={group.code} className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <Checkbox
                      checked={(form.cytologyResult.categories || []).includes(group.code)}
                      onChange={() => toggleCategory(group.code)}
                      disabled={locked}
                      label={`${group.code} ${group.label}`}
                    />
                    <div
                      className='flex flex-col'
                      style={{ paddingInlineStart: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-200, 8px)' }}
                    >
                      {group.groups.map((sub, index) => (
                        <div key={sub.label || `${group.code}-${index}`} className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                          <CodeGroupLabel>{sub.label}</CodeGroupLabel>
                          <CodeCheckList
                            items={sub.items}
                            selected={form.cytologyResult.categories || []}
                            onToggle={toggleCategory}
                            disabled={locked}
                            freeTextValue={{ 241: form.cytologyResult.sliDetail }}
                            onFreeTextChange={(_code, value) => setCytologyResult('sliDetail')(value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </StepCard>
  );
};

/* ══ Step 5 — ดูแลหลังคลอด (มารดา / เด็ก) ═══════════════════════════ */
const S5_TABS = [
  { key: 'mother', label: 'ดูแลมารดาหลังคลอด' },
  { key: 'child',  label: 'ดูแลเด็กหลังคลอด' },
];

export const FpStep5Postpartum = ({ form, setForm, locked }) => {
  const [tab, setTab] = useState('mother');

  const setMother = (key) => (value) => setForm((f) => ({
    ...f, postpartumMother: { ...f.postpartumMother, [key]: value },
  }));
  const setMotherField = (key) => (value) => setForm((f) => ({
    ...f,
    postpartumMother: { ...f.postpartumMother, fields: { ...f.postpartumMother.fields, [key]: value } },
  }));
  const setChild = (key) => (value) => setForm((f) => ({
    ...f, postpartumChild: { ...f.postpartumChild, [key]: value },
  }));
  const setChildField = (key) => (value) => setForm((f) => ({
    ...f,
    postpartumChild: { ...f.postpartumChild, fields: { ...f.postpartumChild.fields, [key]: value } },
  }));

  const mother = form.postpartumMother;
  const child = form.postpartumChild;

  if (!form.hasPostpartum) {
    return (
      <StepCard>
        <TopicHeader icon='family_restroom'>การดูแลหลังคลอด</TopicHeader>
        <EmptyState
          icon='child_care'
          title='ไม่มีข้อมูลหลังคลอด'
          subtitle='ผู้รับบริการรายนี้ไม่มีประวัติการคลอดที่ต้องติดตามในครั้งนี้ — เปิดบันทึกได้หากเป็นการเยี่ยมหลังคลอด (คู่มือ §2.1.4 / §2.1.5)'
          action={(
            <BrandDashedAddButton
              disabled={locked}
              onClick={() => { if (!locked) setForm((f) => ({ ...f, hasPostpartum: true })); }}
            >
              เปิดบันทึกการดูแลหลังคลอด
            </BrandDashedAddButton>
          )}
        />
        <Banner tone='neutral' icon='info'>
          หมายเหตุการบูรณาการ: บันทึกส่วนนี้เป็น "สมุดเยี่ยมหลังคลอด" แบบย่อของคลินิกวางแผนครอบครัว
          — ข้อมูลการตั้งครรภ์ฉบับเต็มอยู่ในงานฝากครรภ์ (ANC) และงานสร้างเสริมภูมิคุ้มกันโรค (EPI)
        </Banner>
      </StepCard>
    );
  }

  return (
    <StepCard>
      <div className='flex items-center gap-2 flex-wrap'>
        {S5_TABS.map((t) => (
          <TabCapsule key={t.key} variant='filter' label={t.label} selected={tab === t.key} onClick={() => setTab(t.key)} />
        ))}
        <div className='flex-1' />
        <NeutralSubdueButton
          size='sm' leadingIcon='close' disabled={locked}
          onClick={() => setForm((f) => ({ ...f, hasPostpartum: false }))}
        >
          ยกเลิกบันทึกหลังคลอด
        </NeutralSubdueButton>
      </div>

      {tab === 'mother' && (
        <>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <TopicHeader icon='pregnant_woman'>ข้อมูลครรภ์</TopicHeader>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='ครรภ์ที่'>
                <InputField value={mother.pregnancyNo} onChange={setMother('pregnancyNo')} disabled={locked} placeholder='เช่น 2' />
              </Field>
              <Field label='วันที่คลอด'>
                <DatePicker
                  showLabel={false} disabled={locked}
                  value={mother.deliveryDate ? new Date(mother.deliveryDate) : null}
                  onChange={(d) => setMother('deliveryDate')(d ? d.toISOString().slice(0, 10) : '')}
                  placeholder='เลือกวันที่คลอด'
                />
              </Field>
              <Field label='ผลสิ้นสุดการตั้งครรภ์'>
                <Select showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={mother.outcome} onChange={setMother('outcome')} options={FP_PREGNANCY_OUTCOME_OPTIONS} placeholder='เลือกผล' />
              </Field>
              <Field label='วิธีการคลอด'>
                <Select showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={mother.deliveryMethod} onChange={setMother('deliveryMethod')} options={FP_DELIVERY_METHOD_OPTIONS} placeholder='เลือกวิธีการคลอด' />
              </Field>
              <Field label='สถานที่คลอด'>
                <Select showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={mother.deliveryPlace} onChange={setMother('deliveryPlace')} options={FP_DELIVERY_PLACE_OPTIONS} placeholder='เลือกสถานที่' />
              </Field>
              <Field label='สถานพยาบาลที่คลอด'>
                <InputField value={mother.deliveryFacility} onChange={setMother('deliveryFacility')} disabled={locked} placeholder='เช่น โรงพยาบาลกลาง' />
              </Field>
            </div>
          </div>

          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <TopicHeader icon='monitor_heart'>ข้อมูลการดูแลมารดา</TopicHeader>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='ดูแลครั้งที่'>
                <InputField value={mother.visitNo} onChange={setMother('visitNo')} disabled={locked} placeholder='1' />
              </Field>
              <Field label='วันที่ดูแล'>
                <DatePicker
                  showLabel={false} disabled={locked}
                  value={mother.visitDate ? new Date(mother.visitDate) : null}
                  onChange={(d) => setMother('visitDate')(d ? d.toISOString().slice(0, 10) : '')}
                  placeholder='เลือกวันที่ดูแล'
                />
              </Field>
            </div>
            <Banner tone='neutral' icon='lock'>
              ชีพจร อุณหภูมิ และความดันโลหิตดึงมาจากห้องซักประวัติ (ขั้นตอนที่ 1) — แก้ไขได้ที่ขั้นตอนที่ 1
            </Banner>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {FP_POSTPARTUM_MOTHER_FIELDS.map((f) => (
                <ChoiceRow
                  key={f.key}
                  label={f.label}
                  options={f.options}
                  value={mother.fields?.[f.key]}
                  onSelect={setMotherField(f.key)}
                  locked={locked}
                />
              ))}
            </div>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='ระดับน้ำตาลในปัสสาวะ'>
                <Select showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={mother.sugarLevel} onChange={setMother('sugarLevel')} options={FP_URINE_SUGAR_OPTIONS} placeholder='เลือกระดับ' />
              </Field>
              <Field label='ระดับอัลบูมินในปัสสาวะ'>
                <Select showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={mother.albuminLevel} onChange={setMother('albuminLevel')} options={FP_URINE_ALBUMIN_OPTIONS} placeholder='เลือกระดับ' />
              </Field>
              <Field label='สรุปภาวะสุขภาพ'>
                <Select showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={mother.summary} onChange={setMother('summary')} options={FP_POSTPARTUM_MOTHER_SUMMARY} placeholder='เลือกภาวะสุขภาพ' />
              </Field>
              <Field label='พยาบาล/เจ้าหน้าที่' hint='ระบบกำหนดเป็นเจ้าหน้าที่วางแผนครอบครัวอัตโนมัติ'>
                <InputField value={mother.nurse} onChange={setMother('nurse')} disabled placeholder='' />
              </Field>
            </div>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <ChoiceRow
                label='เคยได้รับการตรวจมะเร็งปากมดลูก'
                options={[{ value: 'yes', label: 'เคย' }, { value: 'no', label: 'ไม่เคย' }]}
                value={mother.cervicalScreened} onSelect={setMother('cervicalScreened')} locked={locked}
              />
              <ChoiceRow
                label='ได้รับการซักประวัติแล้ว'
                options={[{ value: 'yes', label: 'ใช่' }, { value: 'no', label: 'ไม่ใช่' }]}
                value={mother.historyTaken} onSelect={setMother('historyTaken')} locked={locked}
              />
              <ChoiceRow
                label='ได้รับการตรวจร่างกายตอนตั้งครรภ์'
                options={[{ value: 'yes', label: 'ใช่' }, { value: 'no', label: 'ไม่ใช่' }]}
                value={mother.physicalExamed} onSelect={setMother('physicalExamed')} locked={locked}
              />
              <ChoiceRow
                label='มีการวางแผนคุมกำเนิดหลังคลอด'
                options={[{ value: 'yes', label: 'มี' }, { value: 'no', label: 'ไม่มี' }]}
                value={mother.familyPlanned} onSelect={setMother('familyPlanned')} locked={locked}
              />
            </div>
            {mother.familyPlanned === 'yes' && (
              <Field label='วิธีคุมกำเนิดหลังคลอดที่เลือก'>
                <Select showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={mother.familyPlanMethod} onChange={setMother('familyPlanMethod')}
                  options={FP_SERVICES.map((s) => ({ value: s.key, label: s.label }))}
                  placeholder='เลือกวิธีคุมกำเนิด' />
              </Field>
            )}
            <SuggestibleTextarea
              voice
              disabled={locked}
              value={mother.advice}
              onChange={(e) => setMother('advice')(e.target.value)}
              suggestions={FP_POSTPARTUM_ADVICE_SUGGESTIONS}
              minChars={3}
              placeholder='คำแนะนำที่ให้แก่มารดาหลังคลอด'
            />
            <SuggestibleTextarea
              voice
              disabled={locked}
              value={mother.note}
              onChange={(e) => setMother('note')(e.target.value)}
              suggestions={FP_POSTPARTUM_ADVICE_SUGGESTIONS}
              minChars={3}
              rows={2}
              minHeight={64}
              placeholder='หมายเหตุอื่นๆ'
            />
          </div>
        </>
      )}

      {tab === 'child' && (
        <>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <TopicHeader icon='child_care'>ข้อมูลการดูแลเด็กหลังคลอด</TopicHeader>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='ดูแลครั้งที่'>
                <InputField value={child.visitNo} onChange={setChild('visitNo')} disabled={locked} placeholder='1' />
              </Field>
              <Field label='วันที่ดูแล'>
                <DatePicker
                  showLabel={false} disabled={locked}
                  value={child.visitDate ? new Date(child.visitDate) : null}
                  onChange={(d) => setChild('visitDate')(d ? d.toISOString().slice(0, 10) : '')}
                  placeholder='เลือกวันที่ดูแล'
                />
              </Field>
              <Field label='น้ำหนักแรกคลอด (กรัม)'>
                <InputField value={child.birthWeight} onChange={setChild('birthWeight')} disabled={locked} placeholder='เช่น 3100' />
              </Field>
              <Field label='น้ำหนักปัจจุบัน (กรัม)'>
                <InputField value={child.weight} onChange={setChild('weight')} disabled={locked} placeholder='เช่น 3450' />
              </Field>
              <Field label='ชื่อ-สกุลมารดา'>
                <InputField value={child.motherName} onChange={setChild('motherName')} disabled={locked} placeholder='ชื่อ-สกุลมารดา' />
              </Field>
              <Field label='เลขบัตรประชาชนมารดา'>
                <InputField value={child.motherCid} onChange={setChild('motherCid')} disabled={locked} placeholder='13 หลัก' />
              </Field>
            </div>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {FP_POSTPARTUM_CHILD_FIELDS.map((f) => (
                <ChoiceRow
                  key={f.key}
                  label={f.label}
                  options={f.options}
                  value={child.fields?.[f.key]}
                  onSelect={setChildField(f.key)}
                  locked={locked}
                />
              ))}
            </div>
            <Field label='ผลการตรวจทารกหลังคลอด'>
              <Select showLabel={false} searchable={false} size='lg' disabled={locked}
                value={child.examSummary} onChange={setChild('examSummary')}
                options={[{ value: 'normal', label: 'ปกติ' }, { value: 'abnormal', label: 'ผิดปกติ ต้องติดตาม' }]}
                placeholder='เลือกผลการตรวจ' />
            </Field>
            <SuggestibleTextarea
              voice
              disabled={locked}
              value={child.advice}
              onChange={(e) => setChild('advice')(e.target.value)}
              suggestions={FP_POSTPARTUM_ADVICE_SUGGESTIONS}
              minChars={3}
              placeholder='คำแนะนำการดูแลเด็กหลังคลอด'
            />
          </div>
        </>
      )}
    </StepCard>
  );
};

/* ══ Step 6 — คำสั่งทางการแพทย์ + ส่งปรึกษา/ส่งต่อ ═══════════════════ */
export const FpStep6Orders = ({ form, setForm, locked }) => {
  const screen = interpretFpScreening(form.screening);
  const dispensingBlocked = screen.mustReferDoctor && !form.doctorConsulted;
  const pregnant = form.pregnancyTest === 'positive';
  const [medPopupOpen, setMedPopupOpen] = useState(false);
  const [removeMed, setRemoveMed] = useState(null);

  /* §1.10.8.7 — ยานอกชุดมาตรฐานสั่งผ่าน AddMedicationPopup ตัวเดียวกับ OPD
     เพื่อให้ได้ขนาด/วิธีใช้/ความถี่/จำนวนครบแบบใบสั่งยาจริง
     (chip ด้านบนบอกได้แค่สั่ง/ไม่สั่ง ใช้เป็นทางลัดของชุดยาประจำคลินิก) */
  const addMedication = (med) => {
    setForm((f) => ({
      ...f,
      medications: [...(f.medications || []), { ...med, id: `fpmed-${Date.now()}` }],
    }));
    setMedPopupOpen(false);
  };
  const confirmRemoveMed = () => {
    setForm((f) => ({ ...f, medications: (f.medications || []).filter((m) => m.id !== removeMed.id) }));
    setRemoveMed(null);
  };
  const [orderPopupOpen, setOrderPopupOpen] = useState(false);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleGroup = (group) => (key) => {
    if (locked) return;
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: !f[group][key] } }));
  };

  const medBlocked = (m) => (dispensingBlocked && m.hormonal) || (pregnant && m.hormonal);

  const orderedMeds = FP_MED_ORDERS.filter((m) => form.medOrders[m.key]);
  const orderedAdvance = FP_ADVANCE_ORDERS.filter((o) => form.advanceOrders[o.key]);

  return (
    <StepCard>
      {dispensingBlocked && (
        <Banner tone='danger' icon='block'>
          ห้ามจ่ายยาคุมกำเนิด — ผลคัดกรอง 11 ข้อ มีข้อที่ตอบ "มี" และยังไม่ได้บันทึกการส่งปรึกษาแพทย์
          (กลับไปที่ขั้นตอนที่ 2 เพื่อบันทึก)
        </Banner>
      )}
      {pregnant && (
        <Banner tone='warning' icon='pregnant_woman'>
          ผู้รับบริการตั้งครรภ์ — ยาคุมกำเนิดชนิดฮอร์โมนถูกปิดไว้ทั้งหมด แนะนำส่งต่อคลินิกฝากครรภ์ (ANC)
        </Banner>
      )}

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='badge'>แพทย์ผู้สั่งการรักษา</TopicHeader>
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Field label='แพทย์' hint='ระบุเมื่อมีคำสั่งยา/ส่งต่อที่ต้องมีแพทย์ลงนาม'>
            <Select
              showLabel={false} searchable={false} size='lg' disabled={locked}
              value={form.doctor} onChange={set('doctor')}
              options={FP_DOCTORS.map((d) => ({ value: d, label: d }))}
              placeholder='เลือกแพทย์ผู้สั่งการรักษา'
            />
          </Field>
        </div>
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader
          icon='pill'
          trailing={(
            <BrandSubdueButton
              variant='outline' size='sm' leadingIcon='add'
              onClick={() => setMedPopupOpen(true)}
              disabled={locked || dispensingBlocked}
            >
              เพิ่มรายการยา
            </BrandSubdueButton>
          )}
        >
          สั่งยาและเวชภัณฑ์คุมกำเนิด (CPOE)
        </TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {FP_MED_ORDERS.map((m) => {
            const blocked = medBlocked(m);
            return (
              <span
                key={m.key}
                title={blocked ? 'ปิดไว้ — ต้องส่งปรึกษาแพทย์ก่อน หรือผู้รับบริการตั้งครรภ์' : undefined}
                style={{ opacity: blocked ? 0.45 : 1 }}
              >
                <SelectableTag
                  label={m.label}
                  size='lg'
                  selected={!!form.medOrders[m.key]}
                  onClick={() => {
                    /* รายการที่สั่งไว้แล้วต้องถอนออกได้แม้ถูกบล็อก —
                       บล็อกเฉพาะการ "เพิ่ม" รายการใหม่ */
                    if (!blocked || form.medOrders[m.key]) toggleGroup('medOrders')(m.key);
                  }}
                />
              </span>
            );
          })}
        </div>
        {/* ยาที่สั่งพร้อมขนาด/วิธีใช้ — ส่วนที่ chip ให้ไม่ได้ */}
        <Table
          columns={[
            { key: 'name', label: 'ชื่อยา', flex: true, minWidth: 220 },
            { key: 'usage', label: 'วิธีใช้', flex: true, minWidth: 140 },
            { key: 'dosePerTake', label: 'ครั้งละ' },
            { key: 'frequency', label: 'ความถี่', flex: true, minWidth: 140 },
            { key: 'when', label: 'เวลาใช้ยา', flex: true, minWidth: 130 },
            { key: 'quantity', label: 'จำนวน' },
            {
              key: 'actions', label: 'การดำเนินการ', sortable: false,
              render: (row) => (locked ? null : (
                <NeutralSubdueButton size='sm' leadingIcon='delete' onClick={() => setRemoveMed(row)}>
                  ลบ
                </NeutralSubdueButton>
              )),
            },
          ]}
          rows={form.medications || []}
          rowKey={(r) => r.id || r.name}
          emptyMessage='ยังไม่มียาที่ระบุขนาด/วิธีใช้ — กด "เพิ่มรายการยา" ด้านบน'
        />

        {(dispensingBlocked || pregnant) && (
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-warning-default, #C2410C)' }}>
            รายการยาที่จางลงถูกปิดไว้:{' '}
            {FP_MED_ORDERS.filter((m) => medBlocked(m)).map((m) => m.label).join(' · ')}
            {dispensingBlocked ? ' — ต้องบันทึกการส่งปรึกษาแพทย์ในขั้นตอนที่ 2 ก่อน' : ''}
            {pregnant ? ' — ผู้รับบริการตั้งครรภ์ ห้ามใช้ยาคุมกำเนิดชนิดฮอร์โมน' : ''}
          </span>
        )}
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader
          icon='science'
          trailing={(
            <BrandSubdueButton
              variant='outline' size='sm' leadingIcon='add'
              onClick={() => setOrderPopupOpen(true)}
              disabled={locked}
            >
              เพิ่มคำสั่งตรวจ
            </BrandSubdueButton>
          )}
        >
          คำสั่งตรวจทางห้องปฏิบัติการ / หัตถการ
        </TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {FP_ADVANCE_ORDERS.map((o) => (
            <SelectableTag
              key={o.key}
              label={o.label}
              size='lg'
              selected={!!form.advanceOrders[o.key]}
              onClick={() => toggleGroup('advanceOrders')(o.key)}
            />
          ))}
        </div>
      </div>

      {/* ส่งปรึกษาภายใน */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='forward_to_inbox'>ส่งปรึกษาภายในหน่วยบริการ</TopicHeader>
        <SelectableTag
          label='ส่งปรึกษาหน่วยงานภายใน'
          size='lg'
          selected={form.internalReferEnabled}
          onClick={() => { if (!locked) set('internalReferEnabled')(!form.internalReferEnabled); }}
        />
        {form.internalReferEnabled && (
          <>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field
                label='หน่วยงานปลายทาง'
                required
                hint={form.internalReferUnit ? undefined : 'ต้องเลือกหน่วยงานปลายทาง'}
                hintTone={form.internalReferUnit ? undefined : 'error'}
              >
                <Select
                  showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={form.internalReferUnit} onChange={set('internalReferUnit')}
                  options={FP_INTERNAL_REFER_UNITS} placeholder='เลือกหน่วยงานปลายทาง'
                  error={form.internalReferUnit ? undefined : ' '}
                />
              </Field>
            </div>
            <SuggestibleTextarea
              voice
              disabled={locked}
              value={form.internalReferReason}
              onChange={(e) => set('internalReferReason')(e.target.value)}
              suggestions={FP_REFER_REASON_SUGGESTIONS}
              minChars={3}
              rows={2}
              minHeight={64}
              placeholder='เหตุผลการส่งปรึกษาภายใน'
            />
          </>
        )}
      </div>

      {/* ส่งต่อภายนอก */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='send'>ส่งต่อภายนอก (Refer out)</TopicHeader>
        <SelectableTag
          label='ส่งต่อไปสถานพยาบาลภายนอก'
          size='lg'
          selected={form.externalReferEnabled}
          onClick={() => { if (!locked) set('externalReferEnabled')(!form.externalReferEnabled); }}
        />
        {form.externalReferEnabled && (
          <>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field
                label='โรงพยาบาลปลายทาง'
                required
                hint={form.externalReferHospital ? undefined : 'ต้องเลือกโรงพยาบาลปลายทาง'}
                hintTone={form.externalReferHospital ? undefined : 'error'}
              >
                <Select
                  showLabel={false} searchable size='lg' disabled={locked}
                  value={form.externalReferHospital} onChange={set('externalReferHospital')}
                  options={FP_EXTERNAL_REFER_HOSPITALS} placeholder='ค้นหาโรงพยาบาล'
                  error={form.externalReferHospital ? undefined : ' '}
                />
              </Field>
              <Field label='วันที่ส่งต่อ'>
                <DatePicker
                  showLabel={false} disabled={locked}
                  value={form.externalReferDate ? new Date(form.externalReferDate) : null}
                  onChange={(d) => set('externalReferDate')(d ? d.toISOString().slice(0, 10) : '')}
                  placeholder='เลือกวันที่ส่งต่อ'
                />
              </Field>
            </div>
            <SuggestibleTextarea
              voice
              disabled={locked}
              value={form.externalReferReason}
              onChange={(e) => set('externalReferReason')(e.target.value)}
              suggestions={FP_REFER_REASON_SUGGESTIONS}
              minChars={3}
              rows={2}
              minHeight={64}
              placeholder='เหตุผลการส่งต่อภายนอก'
            />
          </>
        )}
      </div>

      {(orderedMeds.length > 0 || orderedAdvance.length > 0) && (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <TopicHeader icon='summarize'>สรุปคำสั่งที่บันทึกไว้</TopicHeader>
          <SummaryRow label='ยา/เวชภัณฑ์'>{orderedMeds.map((m) => m.label).join(' · ') || '—'}</SummaryRow>
          <SummaryRow label='คำสั่งตรวจ'>{orderedAdvance.map((o) => o.label).join(' · ') || '—'}</SummaryRow>
        </div>
      )}

      {/* §1.10.8.7 — ใช้ AddMedicationPopup ตัวเดียวกับ OPD ไม่ใช่ป๊อปอัป
          สั่ง/ไม่สั่งของคลินิกเอง ใบสั่งยาจึงมีขนาด-วิธีใช้-จำนวนครบ */}
      <AddMedicationPopup
        open={medPopupOpen}
        onClose={() => setMedPopupOpen(false)}
        onConfirm={addMedication}
        title='เพิ่มรายการยา — คลินิกวางแผนครอบครัว'
      />

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

      <Popup
        open={orderPopupOpen}
        onClose={() => setOrderPopupOpen(false)}
        size='large'
        title='เพิ่มคำสั่งตรวจล่วงหน้า'
        subtitle='เลือกรายการตรวจที่ต้องการสั่งในการรับบริการครั้งนี้'
        tertiaryAction={{ label: 'ปิด', onClick: () => setOrderPopupOpen(false) }}
        primaryAction={{ label: 'เสร็จสิ้น', onClick: () => setOrderPopupOpen(false) }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {FP_ADVANCE_ORDERS.map((o) => (
            <ChoiceRow
              key={o.key}
              label={o.label}
              options={[{ value: true, label: 'สั่ง' }, { value: false, label: 'ไม่สั่ง' }]}
              value={!!form.advanceOrders[o.key]}
              onSelect={(v) => setForm((f) => ({ ...f, advanceOrders: { ...f.advanceOrders, [o.key]: v } }))}
              locked={locked}
            />
          ))}
        </div>
      </Popup>
    </StepCard>
  );
};

/* ══ Step 7 — e-Document + นัดหมาย + พิมพ์บัตร + ยืนยันบันทึก ═══════ */
const APPOINTMENT_TIMES = ['09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'];

export const FpStep7Documents = ({
  form, setForm, fpHn, registration, cardPatient, locked, saved, onConfirmSave,
}) => {
  const [printTick, setPrintTick] = useState(0);
  const [printPreview, setPrintPreview] = useState(false);
  const [uploadError, setUploadError] = useState('');
  /* File objects ไม่ถูก serialize ลง sessionStorage draft — เก็บเฉพาะ
     metadata ใน form.documents ส่วน File จริงอยู่ใน local state ของหน้านี้ */
  const [dropFiles, setDropFiles] = useState([]);

  const validationErrors = useMemo(() => validateFpVisit(form), [form]);
  const printLog = useMemo(() => getFpPrintLog(fpHn), [fpHn, printTick]);
  const visits = useMemo(() => getFpVisitRecords(fpHn), [fpHn]);

  const setAppt = (key) => (value) => {
    if (locked) return;
    setForm((f) => ({ ...f, appointment: { ...f.appointment, [key]: value } }));
  };

  const appt = form.appointment;
  const dateInPast = !!appt.date && appt.date < todayIso();
  const booked = !!appt.date && !appt.cancelled;

  const cancelAppointment = () => setForm((f) => ({ ...f, appointment: { ...f.appointment, cancelled: true } }));
  const rebook = () => setForm((f) => ({ ...f, appointment: { date: '', time: '', type: '', note: '', cancelled: false } }));

  const addDocument = (file) => {
    const err = validateFpUpload(file);
    if (err) { setUploadError(err); return; }
    setUploadError('');
    setForm((f) => ({
      ...f,
      documents: [...f.documents, {
        name: file.name,
        size: file.size,
        uploadedBy: FP_CURRENT_USER,
        uploadedAt: new Date().toISOString(),
      }],
    }));
  };

  const removeDocument = (index) => setForm((f) => ({
    ...f, documents: f.documents.filter((_, i) => i !== index),
  }));

  /* ── e-Document ที่สร้างเอง (TOR §1.10.8.4) ─────────────────────────
     `documents` = ไฟล์ที่แนบเข้ามา · `eDocuments` = เอกสารที่สร้างจาก
     form-builder ในการมารับบริการครั้งนี้ — คนละเรื่องกัน จึงแยกรายการ */
  const [eDocBuilderOpen, setEDocBuilderOpen] = useState(false);
  const [eDocEditing, setEDocEditing] = useState(null);
  const [eDocViewing, setEDocViewing] = useState(null);

  const eDocuments = form.eDocuments ?? [];

  const saveEDocument = ({ name, blocks, templateSlug }) => {
    const now = new Date().toISOString();
    setForm((f) => {
      const list = f.eDocuments ?? [];
      const next = eDocEditing
        ? list.map((d) => (d.id === eDocEditing.id
          ? { ...d, name, blocks, templateSlug, updatedAt: now }
          : d))
        : [...list, {
          id: `edoc-${Date.now().toString(36)}`,
          name,
          templateSlug,
          blocks,
          createdBy: FP_CURRENT_USER,
          createdAt: now,
          updatedAt: now,
        }];
      /* keep the legacy single-document alias pointing at the first one */
      return { ...f, eDocuments: next, eDocBlocks: next[0]?.blocks ?? [] };
    });
    setEDocEditing(null);
  };

  const removeEDocument = (id) => setForm((f) => {
    const next = (f.eDocuments ?? []).filter((d) => d.id !== id);
    return { ...f, eDocuments: next, eDocBlocks: next[0]?.blocks ?? [] };
  });

  const handleDrop = (files) => {
    setDropFiles(files);
    const metas = (files || []).map((file) => ({
      name: file.name,
      size: file.size,
      uploadedBy: FP_CURRENT_USER,
      uploadedAt: new Date().toISOString(),
    }));
    setForm((f) => {
      const manual = f.documents.filter((d) => !d.fromDropZone);
      return { ...f, documents: [...manual, ...metas.map((m) => ({ ...m, fromDropZone: true }))] };
    });
  };

  const card = useMemo(
    () => buildFpFollowUpCard({
      registration,
      patient: { hn: fpHn, name: cardPatient?.fullName },
      visits,
      appointment: appt,
    }),
    [registration, fpHn, cardPatient, visits, appt],
  );

  /* พิมพ์ก่อน ปิดตัวอย่างทีหลัง — window.print() เป็น synchronous และ
     setState ยังไม่ทัน re-render ในรอบเดียวกัน ถ้าปิดก่อนจะไม่มีบัตรให้พิมพ์ */
  const doPrint = () => {
    logFpPrint(fpHn, 'บัตรติดตามวางแผนครอบครัว');
    printFpFollowUpCard();
    setPrintTick((t) => t + 1);
    setForm((f) => ({ ...f, cardPrinted: true }));
    setPrintPreview(false);
  };

  return (
    <StepCard>
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

      {/* ── เอกสารแนบ (TOR 1.10.8.4) ───────────────────────────────── */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='attach_file'>เอกสารแนบ / e-Document</TopicHeader>
        <FileUploadField
          label='แนบไฟล์ทีละรายการ'
          helperText={uploadError || 'รองรับ PDF / JPG / PNG ขนาดไม่เกิน 10 MB — เช่น ใบผลตรวจ Pap smear, ใบส่งต่อ, ใบยินยอม'}
          accept={FP_UPLOAD_ACCEPT}
          buttonLabel='เลือกไฟล์'
          onFile={addDocument}
          disabled={locked}
        />
        {uploadError && (
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-danger-default, #B91C1C)' }}>{uploadError}</span>
        )}
        <DragAndDrop
          size='sm'
          disabled={locked}
          value={dropFiles}
          onChange={handleDrop}
          accept={FP_UPLOAD_ACCEPT}
          title='ลากและวางไฟล์เอกสาร หรือคลิกเพื่ออัปโหลด'
          helper='PDF, JPG, PNG ไม่เกิน 10 MB ต่อไฟล์'
        />
        {form.documents.length > 0 ? (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            {form.documents.map((d, i) => (
              <div key={`${d.name}-${i}`} className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <Icon name='file-text' size={16} />
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>{d.name}</span>
                <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  · แนบโดย {d.uploadedBy} · {formatFpDateTime(d.uploadedAt)}
                </span>
                <div className='flex-1' />
                {!locked && (
                  <NeutralSubdueButton size='sm' leadingIcon='delete' onClick={() => removeDocument(i)}>ลบ</NeutralSubdueButton>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon='attach_file' title='ยังไม่มีเอกสารแนบ' subtitle='แนบใบผลตรวจ ใบส่งต่อ หรือเอกสารยินยอมของผู้รับบริการได้ที่นี่' />
        )}

        {/* ── สร้าง e-Document เอง (TOR §1.10.8.4) ───────────────────
            แนบไฟล์อย่างเดียวปิดข้อนี้ไม่ได้ — TOR ขอ "ตัวสร้าง e-Document"
            คือหน่วยบริการต้องออกเอกสารเองได้จากแบบฟอร์มในคลัง */}
        <div
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-250, 10px)',
            marginTop: 'var(--dim-space-300, 12px)',
            paddingTop: 'var(--dim-space-300, 12px)',
            borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #EDEFF1)',
          }}
        >
          <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span
              className='flex items-center'
              style={{
                gap: 'var(--dim-space-100, 4px)',
                fontSize: 'var(--type-size-sm)',
                fontWeight: 'var(--type-weight-bold)',
                color: 'var(--text-content-default, #363B3F)',
              }}
            >
              <Icon name='post_add' size={16} />
              e-Document ที่สร้างในครั้งนี้
            </span>
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              สร้างจากแบบฟอร์มในคลังเอกสาร e-document แล้วปรับให้ตรงกับผู้รับบริการรายนี้
            </span>
            <div className='flex-1' />
            {!locked && (
              <BrandSubdueButton
                variant='outline'
                size='sm'
                leadingIcon='note_add'
                onClick={() => { setEDocEditing(null); setEDocBuilderOpen(true); }}
              >
                สร้าง e-Document
              </BrandSubdueButton>
            )}
          </div>

          {eDocuments.length > 0 ? (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              {eDocuments.map((d) => (
                <div key={d.id} className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <Icon name='description' size={16} />
                  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>{d.name}</span>
                  <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>
                    {countBlockFields(d.blocks)} ช่องกรอก
                  </ColorfulBadge>
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    · สร้างโดย {d.createdBy} · {formatFpDateTime(d.createdAt)}
                  </span>
                  <div className='flex-1' />
                  <NeutralSubdueButton size='sm' leadingIcon='visibility' onClick={() => setEDocViewing(d)}>
                    ดู / พิมพ์
                  </NeutralSubdueButton>
                  {!locked && (
                    <>
                      <NeutralSubdueButton
                        size='sm'
                        leadingIcon='edit'
                        onClick={() => { setEDocEditing(d); setEDocBuilderOpen(true); }}
                      >
                        แก้ไข
                      </NeutralSubdueButton>
                      <NeutralSubdueButton size='sm' leadingIcon='delete' onClick={() => removeEDocument(d.id)}>ลบ</NeutralSubdueButton>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon='post_add'
              title='ยังไม่ได้สร้าง e-Document'
              subtitle='เช่น ใบยินยอมคุมกำเนิด หรือแบบประเมินที่ต้องให้ผู้รับบริการลงนามในครั้งนี้'
            />
          )}
        </div>

        <EDocumentBuilderPopup
          open={eDocBuilderOpen}
          editing={eDocEditing}
          patientName={cardPatient?.fullName}
          onClose={() => { setEDocBuilderOpen(false); setEDocEditing(null); }}
          onSave={saveEDocument}
        />
        <EDocumentSheetPopup
          open={Boolean(eDocViewing)}
          doc={eDocViewing}
          patient={{ fullName: cardPatient?.fullName, hn: fpHn }}
          onClose={() => setEDocViewing(null)}
        />
      </div>

      {/* ── นัดหมาย (TOR 1.10.8.5) ─────────────────────────────────── */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='calendar'>นัดหมายครั้งถัดไป</TopicHeader>

        {appt.cancelled && (
          <div className='flex items-center gap-3 flex-wrap'>
            <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกนัดหมายแล้ว</ColorfulBadge>
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='event_repeat' onClick={rebook} disabled={locked}>
              นัดหมายใหม่
            </BrandSubdueButton>
          </div>
        )}

        {!appt.cancelled && (
          <>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='ประเภทนัดหมาย'>
                <Select
                  showLabel={false} searchable={false} size='lg' disabled={locked}
                  value={appt.type} onChange={setAppt('type')}
                  options={FP_APPOINTMENT_TYPES} placeholder='เลือกประเภทนัดหมาย'
                />
              </Field>
              <Field
                label='วันนัดหมาย'
                hint={dateInPast ? 'วันที่นัดต้องไม่เป็นวันในอดีต' : undefined}
                hintTone={dateInPast ? 'error' : undefined}
              >
                <DatePicker
                  showLabel={false} disabled={locked}
                  value={appt.date ? new Date(appt.date) : null}
                  onChange={(d) => setAppt('date')(d ? d.toISOString().slice(0, 10) : '')}
                  placeholder='เลือกวันที่'
                  error={dateInPast ? ' ' : undefined}
                />
              </Field>
              <Field label='เวลานัด'>
                <Select
                  showLabel={false} searchable={false} size='lg' disabled={locked}
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
                'นัดรับยาเม็ดคุมกำเนิดต่อเนื่อง 3 แผง',
                'นัดฉีดยาคุมกำเนิดครั้งถัดไปตามกำหนด 12 สัปดาห์',
                'นัดตรวจสายห่วงอนามัยหลังใส่ 1 เดือน',
                'นัดฟังผลตรวจมะเร็งปากมดลูก',
                'นัดเยี่ยมมารดาหลังคลอดครั้งถัดไป',
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
                  นัดแล้ว: {formatFpDate(appt.date)}{appt.time ? ` เวลา ${appt.time} น.` : ''}
                  {appt.type ? ` · ${resolveFpAppointmentType(appt.type)}` : ''}
                </span>
                <div className='flex-1' />
                <NeutralSubdueButton size='sm' leadingIcon='event_busy' onClick={cancelAppointment} disabled={locked}>
                  ยกเลิกนัด
                </NeutralSubdueButton>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── พิมพ์บัตรติดตามวางแผนครอบครัว (คู่มือ p.2-8/2-9) ────────── */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='print'>บัตรติดตามวางแผนครอบครัว</TopicHeader>
        {registration && registration.status !== 'cancelled' ? (
          <div className='flex items-center gap-3 flex-wrap'>
            <BrandSubdueButton variant='outline' leadingIcon='print' onClick={() => setPrintPreview(true)}>
              ดูตัวอย่างก่อนพิมพ์
            </BrandSubdueButton>
            {form.cardPrinted && (
              <ColorfulBadge style='green' size='small' hierarchy='secondary'>พิมพ์บัตรแล้ว</ColorfulBadge>
            )}
          </div>
        ) : (
          <Banner tone='warning' icon='info'>
            ยังพิมพ์บัตรติดตามไม่ได้ — ผู้รับบริการยังไม่มีเลขที่วางแผนครอบครัว
            กรุณาลงทะเบียนที่หน้า "ทะเบียนผู้รับบริการวางแผนครอบครัว" ก่อน
          </Banner>
        )}
        {printLog.length > 0 && (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            {printLog.map((e, i) => (
              <span key={`${e.at}-${i}`} style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                พิมพ์{e.docType} โดย {e.by} · {formatFpDateTime(e.at)}
              </span>
            ))}
          </div>
        )}
      </div>

      <Popup
        open={printPreview}
        onClose={() => setPrintPreview(false)}
        size='large'
        title='ตัวอย่างก่อนพิมพ์ — บัตรติดตามวางแผนครอบครัว'
        subtitle={`${card.name} · HN ${card.hn} · ${card.fpNumber}`}
        tertiaryAction={{ label: 'ปิด', onClick: () => setPrintPreview(false) }}
        primaryAction={{ label: 'สั่งพิมพ์', onClick: doPrint }}
      >
        <FamilyPlanningFollowUpCard card={card} preview />
      </Popup>

      {/* สำเนา print-only (portal ไป <body>) — ให้ window.print() พิมพ์
          เฉพาะบัตร ไม่ติด chrome ของแอป */}
      {printPreview && <FamilyPlanningFollowUpCard card={card} />}

      {/* ── ยืนยันบันทึก ───────────────────────────────────────────── */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='check-circle'>ยืนยันการบันทึก</TopicHeader>
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
          <SummaryRow label='ผู้รับบริการ'>{cardPatient?.fullName || '—'} · HN {fpHn}</SummaryRow>
          <SummaryRow label='เลขที่วางแผนครอบครัว'>{registration?.fpNumber || 'ยังไม่มีทะเบียน'}</SummaryRow>
          <SummaryRow label='วันที่รับบริการ'>{formatFpDate(form.serviceDate)}</SummaryRow>
          <SummaryRow label='ประเภทผู้รับบริการ'>{resolveFpClientType(form.clientType)}</SummaryRow>
          <SummaryRow label='บริการที่ได้รับ'>{summarizeFpServices(form.services)}</SummaryRow>
          <SummaryRow label='ผลคัดกรอง 11 ข้อ'>
            {(() => {
              const s = interpretFpScreening(form.screening);
              if (!s.answeredAll) return `ยังตอบไม่ครบ (${s.answeredCount}/11)`;
              return s.mustReferDoctor
                ? `พบข้อ "มี" ${s.flagged.length} ข้อ — ${form.doctorConsulted ? 'ส่งปรึกษาแพทย์แล้ว' : 'ยังไม่ได้ส่งปรึกษาแพทย์'}`
                : 'ไม่มีข้อห้าม — จ่ายยาได้';
            })()}
          </SummaryRow>
          <SummaryRow label='ส่งปรึกษา/ส่งต่อ'>
            {[
              form.internalReferEnabled ? `ภายใน: ${FP_INTERNAL_REFER_UNITS.find((u) => u.value === form.internalReferUnit)?.label || 'ยังไม่เลือก'}` : null,
              form.externalReferEnabled ? `ภายนอก: ${FP_EXTERNAL_REFER_HOSPITALS.find((h) => h.value === form.externalReferHospital)?.label || 'ยังไม่เลือก'}` : null,
            ].filter(Boolean).join(' · ') || 'ไม่มีการส่งต่อ'}
          </SummaryRow>
          <SummaryRow label='เอกสารแนบ'>{form.documents.length > 0 ? `${form.documents.length} ไฟล์` : 'ไม่มี'}</SummaryRow>
          <SummaryRow label='e-Document ที่สร้าง'>
            {(form.eDocuments ?? []).length > 0
              ? (form.eDocuments ?? []).map((d) => d.name).join(' · ')
              : 'ไม่มี'}
          </SummaryRow>
          <SummaryRow label='นัดหมาย'>
            {appt.cancelled ? 'ยกเลิกนัดหมาย' : (appt.date ? `${formatFpDate(appt.date)}${appt.time ? ` เวลา ${appt.time} น.` : ''}` : 'ไม่มีนัดหมาย')}
          </SummaryRow>
        </div>

        {saved ? (
          <div className='flex items-center gap-2' style={{ color: 'var(--text-brandPrimary-default, #007549)', fontSize: 'var(--type-size-sm)' }}>
            <Icon name='check-circle' size={18} />
            บันทึกการให้บริการวางแผนครอบครัวเรียบร้อยแล้ว · ผู้บันทึก {FP_CURRENT_USER} — กด "จบการบันทึก" ด้านล่างเพื่อกลับหน้าคิว
          </div>
        ) : (
          <BrandSubdueButton
            variant='fill'
            size='lg'
            leadingIcon='save'
            disabled={validationErrors.length > 0 || locked}
            onClick={() => { if (validationErrors.length === 0 && !locked) onConfirmSave(); }}
          >
            ยืนยันบันทึกการให้บริการวางแผนครอบครัว
          </BrandSubdueButton>
        )}
      </div>
    </StepCard>
  );
};
