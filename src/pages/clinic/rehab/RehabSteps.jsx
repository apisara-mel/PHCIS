import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import TimePicker from '@/components/forms/TimePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import FileUploadField from '@/components/forms/FileUploadField';
import UploadProgressBar, { useSmoothUploadProgress } from '@/components/forms/UploadProgressBar';
import TabCapsule from '@/components/tab/TabCapsule';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import Popup from '@/components/popup/Popup';
import MedicalHistoryPopup from '@/components/popup/MedicalHistoryPopup';
import Icd10SearchPopup from '@/components/popup/Icd10SearchPopup';
import CameraCapturePopup from '@/components/popup/CameraCapturePopup';
import BodyDiagramPanel from '@/components/examination/BodyDiagramPanel';
import { Step5Orders } from '@/components/forms/TreatmentSteps';
import BarthelIndexGrid from '@/pages/clinic/rehab/BarthelIndexGrid';
import {
  REHAB_CAUSES,
  resolveRehabCause,
  REHAB_THERAPIST_OPTIONS,
  REHAB_DISCHARGE_STATUS,
  ROM_JOINT_OPTIONS,
  ROM_MOTION_OPTIONS,
  MUSCLE_GRADE_OPTIONS,
  MUSCLE_GROUP_OPTIONS,
  BRUNNSTROM_STAGES,
  BRUNNSTROM_PARTS,
  SENSATION_TYPE_OPTIONS,
  SENSATION_RESULT_OPTIONS,
  REFLEX_OPTIONS,
  PATHOLOGIC_REFLEX_OPTIONS,
  REFLEX_GRADE_OPTIONS,
  PATHOLOGIC_RESULT_OPTIONS,
  SPECIAL_TEST_OPTIONS,
  SPECIAL_TEST_RESULT_OPTIONS,
  SIDE_OPTIONS,
  REHAB_PROGRAM_ACTIVITIES,
  resolveRehabActivity,
  REHAB_FREQUENCY_OPTIONS,
  REHAB_APPOINTMENT_TIMES,
  isRehabSlotBooked,
  scoreBarthel,
  barthelDependency,
  getRehabPreviousExam,
  getPreviousBarthel,
  REHAB_HISTORY_SUGGESTIONS,
  REHAB_EXAM_SUGGESTIONS,
  REHAB_BARTHEL_NOTE_SUGGESTIONS,
  REHAB_DIAGNOSIS_SUGGESTIONS,
  REHAB_GOAL_SUGGESTIONS,
  REHAB_PROGRAM_NOTE_SUGGESTIONS,
  REHAB_PROCEDURE_NOTE_SUGGESTIONS,
  REHAB_COURSE_SUMMARY_SUGGESTIONS,
  REHAB_APPOINTMENT_NOTE_SUGGESTIONS,
  formatRehabDate,
  formatRehabDateTime,
  todayIso,
} from '@/data/rehabVisits';

/* RehabSteps — step bodies สำหรับ "บันทึกกิจกรรมการฟื้นฟูและกายภาพบำบัด"
   (TOR 1.10.10.1/.3/.4/.5/.7) เสียบเข้ากับ TreatmentFormShell แบบเดียวกับที่
   AncSteps / NcdSteps ทำ (playbook §3):

     1. ประวัติและผลการซักประวัติ  — .3 อ่านอย่างเดียวจากหน้าซักประวัติ
                                    (Chief complaint + ผลคัดกรอง + สัญญาณชีพ)
                                    + บันทึกเพิ่มโดยนักกายภาพบำบัด
     2. ตรวจร่างกาย (Physical Exam) — .7 ครบ 7 แทบตามคู่มือเดิม §2.4:
                                    ROM · Motor/Brunnstrom · Sensation ·
                                    Reflex/Pathologic · Special test ·
                                    ภาพร่างกายที่วาดกำกับ · บันทึกสรุป
     3. ประเมิน ADLs (Barthel)     — .7 ตารางให้คะแนน 10 หัวข้อ + เทียบครั้งก่อน
     4. วินิจฉัยและเป้าหมาย        — .7 ICD-10 + Goal list + Treatment Course
                                    (เลขที่ Course · วันที่ประเมิน · สถานะจำหน่าย)
     5. โปรแกรมฟื้นฟู + หัตถการ    — .7 แผนกิจกรรม/ความถี่ + ตารางหัตถการ
                                    (ผู้ทำ · เวลา · note) + CPOE ที่ใช้ร่วมกับ OPD
     6. เอกสารแนบ                  — .4 อัปโหลด/ถ่ายภาพ/ดูตัวอย่าง/ลบ
     7. นัดหมายต่อเนื่อง + ยืนยัน   — .5 นัดครั้งถัดไปใน Course + พิมพ์ใบนัด

   ทุกช่องข้อความหลายบรรทัดที่บุคลากรพิมพ์ใช้ SuggestibleTextarea พร้อม
   `voice` + `suggestions` + `minChars` (กติกาจำ — ห้าม textarea เปล่า). */

/* ─── Shared bits ────────────────────────────────────────────────── */

const TopicHeader = ({ icon, children, action }) => (
  <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
    <span style={{ color: 'var(--text-brandPrimary-default, #007549)' }}><Icon name={icon} size={20} /></span>
    <h2
      className='flex-1 min-w-0'
      style={{
        fontSize: 'var(--type-size-base)',
        fontWeight: 'var(--type-weight-bold)',
        color: 'var(--text-brandPrimary-default, #007549)',
      }}
    >
      {children}
    </h2>
    {action}
  </div>
);

const Field = ({ label, required, children, hint }) => (
  <div className='flex-1 flex flex-col min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
    <div className='flex items-center' style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
      <span>{label}</span>
      {required && <span style={{ marginLeft: 'var(--dim-space-050)', color: 'var(--text-input-require)' }}>*</span>}
    </div>
    {children}
    {hint && (
      <span style={{ color: 'var(--text-content-quaternary, #ADB2B7)', fontSize: 'var(--type-size-xs)' }}>
        {hint}
      </span>
    )}
  </div>
);

const StepCard = ({ children }) => (
  <section className='flex flex-col' style={{ gap: 'var(--dim-space-600)' }}>{children}</section>
);

const WarningNote = ({ icon = 'error', children }) => (
  <div
    className='flex items-center'
    style={{
      gap: 'var(--dim-space-200)',
      paddingTop: 'var(--dim-space-300)',
      paddingBottom: 'var(--dim-space-300)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-alert-warning, #FFF9F0)',
      color: 'var(--text-warning-default, #C2410C)',
      fontSize: 'var(--type-size-sm)',
    }}
  >
    <Icon name={icon} size={18} />
    <span>{children}</span>
  </div>
);

const ErrorNote = ({ children }) => (
  <div
    className='flex items-center'
    style={{
      gap: 'var(--dim-space-200)',
      paddingTop: 'var(--dim-space-200)',
      paddingBottom: 'var(--dim-space-200)',
      paddingLeft: 'var(--dim-space-300)',
      paddingRight: 'var(--dim-space-300)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-danger-quaternary, #FFF0F0)',
      color: 'var(--text-danger-default, #C72121)',
      fontSize: 'var(--type-size-sm)',
    }}
  >
    <Icon name='error' size={16} />
    <span>{children}</span>
  </div>
);

const EmptyRows = ({ children }) => (
  <div
    className='flex flex-col items-center text-center w-full'
    style={{
      gap: 'var(--dim-space-200)',
      paddingTop: 'var(--dim-space-600)',
      paddingBottom: 'var(--dim-space-600)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-300)',
      border: 'var(--dim-stroke-100) dashed var(--border-neutral-tertiary, #C6CACD)',
      color: 'var(--text-content-tertiary)',
      fontSize: 'var(--type-size-sm)',
    }}
  >
    <Icon name='playlist_add' size={24} />
    <span>{children}</span>
  </div>
);

const ReadOnlyStrip = ({ label, value, icon = 'lock' }) => (
  <div
    className='flex items-start w-full'
    style={{
      gap: 'var(--dim-space-300)',
      paddingTop: 'var(--dim-space-300)',
      paddingBottom: 'var(--dim-space-300)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-200)',
      border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
      background: 'var(--surface-neutral-quaternary)',
    }}
  >
    <Icon name={icon} size={16} />
    <span className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
      <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{label}</span>
      <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
        {value || '— ไม่มีข้อมูลจากหน้าซักประวัติ —'}
      </span>
    </span>
  </div>
);

/** แถวของตารางเพิ่ม/ลบรายการ (ROM · Muscle · Sensation · Reflex · Special
    test · หัตถการ) — โครงเดียวกันทุกแทบตามคู่มือเดิม §2.4. */
const RowShell = ({ children, onRemove, readOnly, removeLabel = 'ลบแถวนี้' }) => (
  <div
    className='flex items-end w-full flex-wrap'
    style={{
      gap: 'var(--dim-space-300)',
      paddingTop: 'var(--dim-space-300)',
      paddingBottom: 'var(--dim-space-300)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-300)',
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      background: 'var(--surface-card-100)',
    }}
  >
    {children}
    {!readOnly && (
      <NeutralSubdueButton size='sm' leadingIcon='delete' aria-label={removeLabel} onClick={onRemove}>
        ลบ
      </NeutralSubdueButton>
    )}
  </div>
);

const nextId = (prefix) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e4)}`;

/* ─── Step 1 — ประวัติและผลการซักประวัติ (TOR 1.10.10.3) ─────────── */

export const RehabStep1History = ({
  form, setForm, patient, readOnly = false, screening, registration,
}) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const cause = resolveRehabCause(registration?.cause);

  const setNote = (key) => (e) => {
    if (readOnly) return;
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  return (
    <StepCard>
      <MedicalHistoryPopup open={historyOpen} onClose={() => setHistoryOpen(false)} patient={patient} />

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader
          icon='clipboard'
          action={(
            <NeutralSubdueButton size='sm' leadingIcon='history' onClick={() => setHistoryOpen(true)}>
              ดูประวัติการรักษาย้อนหลัง
            </NeutralSubdueButton>
          )}
        >
          ผลการซักประวัติจากพยาบาล (อ่านอย่างเดียว)
        </TopicHeader>

        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
          ข้อมูลชุดนี้ดึงมาจากหน้าคัดกรองและซักประวัติของพยาบาล — แก้ไขที่หน้าซักประวัติเท่านั้น
          เพื่อไม่ให้ต้นทางกับปลายทางไม่ตรงกัน
        </span>

        <ReadOnlyStrip label='อาการสำคัญ (Chief complaint)' value={screening?.chiefComplaint} icon='sick' />
        <ReadOnlyStrip label='ผลการคัดกรองแรกรับ' value={screening?.screeningResult} icon='fact_check' />
        <ReadOnlyStrip label='บันทึกแพทย์ (Doctor note)' value={screening?.doctorNote} icon='stethoscope' />
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='activity'>สัญญาณชีพก่อนทำกายภาพ (Vital Signs)</TopicHeader>
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
          <Field label='ความดันโลหิต (BP)'>
            <InputField
              disabled={readOnly}
              value={form.vitals.bp}
              onChange={(v) => setForm((f) => ({ ...f, vitals: { ...f.vitals, bp: v } }))}
              placeholder='120/80'
            />
          </Field>
          <Field label='ชีพจร (HR)'>
            <InputField
              disabled={readOnly}
              type='number'
              value={form.vitals.hr}
              onChange={(v) => setForm((f) => ({ ...f, vitals: { ...f.vitals, hr: v } }))}
            />
          </Field>
          <Field label='อัตราหายใจ (RR)'>
            <InputField
              disabled={readOnly}
              type='number'
              value={form.vitals.rr}
              onChange={(v) => setForm((f) => ({ ...f, vitals: { ...f.vitals, rr: v } }))}
            />
          </Field>
          <Field label='SpO₂ (%)'>
            <InputField
              disabled={readOnly}
              type='number'
              value={form.vitals.spo2}
              onChange={(v) => setForm((f) => ({ ...f, vitals: { ...f.vitals, spo2: v } }))}
            />
          </Field>
          <Field label='น้ำหนัก (กก.)'>
            <InputField
              disabled={readOnly}
              type='number'
              value={form.vitals.weight}
              onChange={(v) => setForm((f) => ({ ...f, vitals: { ...f.vitals, weight: v } }))}
            />
          </Field>
          <Field label='ส่วนสูง (ซม.)'>
            <InputField
              disabled={readOnly}
              type='number'
              value={form.vitals.height}
              onChange={(v) => setForm((f) => ({ ...f, vitals: { ...f.vitals, height: v } }))}
            />
          </Field>
        </div>
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='edit'>ประวัติเพิ่มเติมโดยนักกายภาพบำบัด</TopicHeader>
        {cause && (
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
              สาเหตุหลักตามทะเบียน:
            </span>
            <ColorfulBadge style={cause.badge} size='small' hierarchy='secondary'>{cause.label}</ColorfulBadge>
            {registration?.onsetDate && (
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                วันเกิดโรค {formatRehabDate(registration.onsetDate)}
              </span>
            )}
          </div>
        )}
        <SuggestibleTextarea
          voice
          disabled={readOnly}
          label='ประวัติ / อาการที่ตรวจพบเพิ่มเติม'
          value={form.historyNote}
          onChange={setNote('historyNote')}
          suggestions={REHAB_HISTORY_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น อ่อนแรงซีกขวา เดินต้องมีคนพยุง / ปวดหลังร้าวลงขาขวา 3 สัปดาห์'
        />
      </div>
    </StepCard>
  );
};

/* ─── Step 2 — ตรวจร่างกาย 7 แทบ (TOR 1.10.10.7) ─────────────────── */

const EXAM_TABS = [
  { key: 'rom',       label: 'ROM (พิสัยการเคลื่อนไหว)' },
  { key: 'motor',     label: 'Motor / Brunnstrom' },
  { key: 'sensation', label: 'Sensation' },
  { key: 'reflex',    label: 'Reflex / Pathologic reflex' },
  { key: 'special',   label: 'Special test' },
  { key: 'diagram',   label: 'ภาพร่างกาย (Body diagram)' },
];

const sideOptionsFor = () => SIDE_OPTIONS;

export const RehabStep2Examination = ({
  form, setForm, readOnly = false, rehabHn,
}) => {
  const [copyNotice, setCopyNotice] = useState('');
  const [bodySystem, setBodySystem] = useState('extremities');
  const [bodyView, setBodyView] = useState('both');

  /* ผลครั้งก่อนคีย์ด้วย HN ที่คิวส่งมา (rehabHn) เสมอ — ห้ามคีย์จาก
     cardPatient.hn (ANC DEFAULT_PATIENT bug: ผู้ป่วยที่ไม่มีโปรไฟล์จะ
     fallback ไปดึงผลของผู้ป่วยตัวอย่าง). */
  const previous = getRehabPreviousExam(rehabHn);

  const activeTab = form.examTab || 'rom';
  const setTab = (key) => setForm((f) => ({ ...f, examTab: key }));

  const updateRow = (listKey, id, patch) => {
    if (readOnly) return;
    setForm((f) => ({
      ...f,
      [listKey]: f[listKey].map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };
  const addRow = (listKey, seed) => {
    if (readOnly) return;
    setForm((f) => ({ ...f, [listKey]: [...f[listKey], { id: nextId(listKey), ...seed }] }));
  };
  const removeRow = (listKey, id) => {
    if (readOnly) return;
    setForm((f) => ({ ...f, [listKey]: f[listKey].filter((r) => r.id !== id) }));
  };

  /* Re-ROM / Re-Muscle / Re-Sensation — คู่มือเดิมเรียก "เรียกข้อมูลเดิม":
     คัดลอกแถวของครั้งก่อนมาเป็นค่าตั้งต้น แล้วให้นักกายภาพแก้ค่าใหม่.
     แถวเดิมในฟอร์มถูกแทนที่ทั้งชุด — เพื่อไม่ให้เกิดแถวซ้ำเมื่อกดซ้ำ. */
  const copyForward = (listKey, label) => {
    if (readOnly || !previous) return;
    const source = previous[listKey] || [];
    if (source.length === 0) {
      setCopyNotice(`ครั้งก่อน (${formatRehabDate(previous.date)}) ไม่มีข้อมูล${label} — ไม่มีอะไรให้คัดลอก`);
      return;
    }
    setForm((f) => ({
      ...f,
      [listKey]: source.map((r) => ({ ...r, id: nextId(listKey) })),
    }));
    setCopyNotice(`คัดลอก${label} ${source.length} รายการจากการประเมินวันที่ ${formatRehabDate(previous.date)} แล้ว — ตรวจสอบและแก้ค่าให้ตรงกับวันนี้`);
  };

  const setNote = (key) => (e) => {
    if (readOnly) return;
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const CopyButton = ({ listKey, label }) => (
    previous && !readOnly ? (
      <NeutralSubdueButton size='sm' leadingIcon='content_copy' onClick={() => copyForward(listKey, label)}>
        {`เรียกผลครั้งก่อน (${formatRehabDate(previous.date)})`}
      </NeutralSubdueButton>
    ) : null
  );

  return (
    <StepCard>
      <TopicHeader icon='stethoscope'>ตรวจร่างกาย (Physical Examination)</TopicHeader>
      <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
        แบ่งตามแบบฟอร์มประเมินคนไข้ของงานเวชศาสตร์ฟื้นฟู — บันทึกเฉพาะแทบที่ตรวจจริง
        แทบที่ไม่ได้ตรวจปล่อยว่างไว้ได้ ระบบจะแสดงเป็น “ไม่ได้ตรวจ” ในหน้าติดตาม
      </span>

      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        {EXAM_TABS.map((t) => {
          const touched = t.key === 'rom' ? form.romRows.length > 0
            : t.key === 'motor' ? form.muscleRows.length > 0 || Object.values(form.brunnstrom || {}).some(Boolean)
              : t.key === 'sensation' ? form.sensationRows.length > 0
                : t.key === 'reflex' ? form.reflexRows.length > 0 || form.pathologicRows.length > 0
                  : t.key === 'special' ? form.specialTestRows.length > 0
                    : Object.values(form.bodyMarkers || {}).some((slot) => (slot || []).length > 0)
                      || Object.values(form.bodyDrawings || {}).some((slot) => (slot || []).length > 0);
          return (
            <TabCapsule
              key={t.key}
              variant='filter'
              type={touched ? 'success' : 'default'}
              showLeadingIcon={touched}
              label={t.label}
              selected={activeTab === t.key}
              onClick={() => setTab(t.key)}
            />
          );
        })}
      </div>

      {copyNotice && (
        <div
          className='flex items-center'
          style={{
            gap: 'var(--dim-space-200)',
            paddingTop: 'var(--dim-space-200)',
            paddingBottom: 'var(--dim-space-200)',
            paddingLeft: 'var(--dim-space-300)',
            paddingRight: 'var(--dim-space-300)',
            borderRadius: 'var(--dim-radius-200)',
            background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
            color: 'var(--text-brandPrimary-default, #007549)',
            fontSize: 'var(--type-size-sm)',
          }}
        >
          <Icon name='info' size={16} />
          <span className='flex-1 min-w-0'>{copyNotice}</span>
          <NeutralSubdueButton size='sm' leadingIcon='close' onClick={() => setCopyNotice('')}>ปิด</NeutralSubdueButton>
        </div>
      )}

      {/* ── ROM ─────────────────────────────────────────────────── */}
      {activeTab === 'rom' && (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <TopicHeader icon='straighten' action={<CopyButton listKey='romRows' label='ROM' />}>
            พิสัยการเคลื่อนไหวของข้อ (Range of Motion)
          </TopicHeader>
          {form.romRows.length === 0 ? (
            <EmptyRows>ยังไม่มีรายการ ROM — กด “เพิ่มข้อที่ตรวจ” เพื่อบันทึกองศาข้างขวา/ซ้าย</EmptyRows>
          ) : (
            form.romRows.map((row) => (
              <RowShell key={row.id} readOnly={readOnly} onRemove={() => removeRow('romRows', row.id)}>
                <Field label='ชื่อข้อ' required>
                  <Select
                    showLabel={false}
                    size='lg'
                    disabled={readOnly}
                    value={row.joint}
                    onChange={(v) => updateRow('romRows', row.id, { joint: v })}
                    options={ROM_JOINT_OPTIONS.map((j) => ({ value: j, label: j }))}
                    placeholder='เลือกข้อ'
                  />
                </Field>
                <Field label='การเคลื่อนไหว' required>
                  <Select
                    showLabel={false}
                    size='lg'
                    disabled={readOnly}
                    value={row.motion}
                    onChange={(v) => updateRow('romRows', row.id, { motion: v })}
                    options={ROM_MOTION_OPTIONS.map((m) => ({ value: m, label: m }))}
                    placeholder='เลือกทิศทาง'
                  />
                </Field>
                <Field label='ขวา (องศา)'>
                  <InputField
                    disabled={readOnly}
                    value={row.right}
                    onChange={(v) => updateRow('romRows', row.id, { right: v })}
                    placeholder='เช่น 150'
                  />
                </Field>
                <Field label='ซ้าย (องศา)'>
                  <InputField
                    disabled={readOnly}
                    value={row.left}
                    onChange={(v) => updateRow('romRows', row.id, { left: v })}
                    placeholder='เช่น 120'
                  />
                </Field>
                <Field label='หมายเหตุ'>
                  <InputField
                    disabled={readOnly}
                    value={row.note}
                    onChange={(v) => updateRow('romRows', row.id, { note: v })}
                    placeholder='เช่น มีอาการปวดขณะเคลื่อนไหว'
                  />
                </Field>
              </RowShell>
            ))
          )}
          {!readOnly && (
            <BrandDashedAddButton onClick={() => addRow('romRows', { joint: '', motion: '', right: '', left: '', note: '' })}>
              เพิ่มข้อที่ตรวจ
            </BrandDashedAddButton>
          )}
        </div>
      )}

      {/* ── Motor / Brunnstrom ──────────────────────────────────── */}
      {activeTab === 'motor' && (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <TopicHeader icon='fitness_center' action={<CopyButton listKey='muscleRows' label='กำลังกล้ามเนื้อ' />}>
              กำลังกล้ามเนื้อ (Manual Muscle Testing — grade 0–5)
            </TopicHeader>
            {form.muscleRows.length === 0 ? (
              <EmptyRows>ยังไม่มีรายการกล้ามเนื้อ — กด “เพิ่มกลุ่มกล้ามเนื้อ” เพื่อบันทึกเกรด</EmptyRows>
            ) : (
              form.muscleRows.map((row) => (
                <RowShell key={row.id} readOnly={readOnly} onRemove={() => removeRow('muscleRows', row.id)}>
                  <Field label='กลุ่มกล้ามเนื้อ' required>
                    <Select
                      showLabel={false}
                      size='lg'
                      disabled={readOnly}
                      value={row.group}
                      onChange={(v) => updateRow('muscleRows', row.id, { group: v })}
                      options={MUSCLE_GROUP_OPTIONS.map((g) => ({ value: g, label: g }))}
                      placeholder='เลือกกลุ่มกล้ามเนื้อ'
                    />
                  </Field>
                  <Field label='ข้าง' required>
                    <Select
                      showLabel={false}
                      searchable={false}
                      size='lg'
                      disabled={readOnly}
                      value={row.side}
                      onChange={(v) => updateRow('muscleRows', row.id, { side: v })}
                      options={sideOptionsFor()}
                      placeholder='เลือกข้าง'
                    />
                  </Field>
                  <Field label='เกรด (MMT)' required>
                    <Select
                      showLabel={false}
                      searchable={false}
                      size='lg'
                      disabled={readOnly}
                      value={row.grade}
                      onChange={(v) => updateRow('muscleRows', row.id, { grade: v })}
                      options={MUSCLE_GRADE_OPTIONS}
                      placeholder='เลือกเกรด'
                    />
                  </Field>
                  <Field label='หมายเหตุ'>
                    <InputField
                      disabled={readOnly}
                      value={row.note}
                      onChange={(v) => updateRow('muscleRows', row.id, { note: v })}
                      placeholder='เช่น อ่อนแรงมากช่วงปลายพิสัย'
                    />
                  </Field>
                </RowShell>
              ))
            )}
            {!readOnly && (
              <BrandDashedAddButton onClick={() => addRow('muscleRows', { group: '', side: '', grade: '', note: '' })}>
                เพิ่มกลุ่มกล้ามเนื้อ
              </BrandDashedAddButton>
            )}
          </div>

          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <TopicHeader icon='psychology'>ระยะการฟื้นตัว Brunnstrom (สำหรับผู้ป่วยโรคหลอดเลือดสมอง)</TopicHeader>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
              {BRUNNSTROM_PARTS.map((part) => (
                <Field key={part.key} label={part.label}>
                  <Select
                    showLabel={false}
                    searchable={false}
                    size='lg'
                    disabled={readOnly}
                    value={form.brunnstrom?.[part.key] || ''}
                    onChange={(v) => {
                      if (readOnly) return;
                      setForm((f) => ({ ...f, brunnstrom: { ...f.brunnstrom, [part.key]: v } }));
                    }}
                    options={BRUNNSTROM_STAGES}
                    placeholder='เลือกระยะ'
                  />
                </Field>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Sensation ───────────────────────────────────────────── */}
      {activeTab === 'sensation' && (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <TopicHeader icon='touch_app' action={<CopyButton listKey='sensationRows' label='การรับความรู้สึก' />}>
            การรับความรู้สึก (Sensation)
          </TopicHeader>
          {form.sensationRows.length === 0 ? (
            <EmptyRows>ยังไม่มีรายการ Sensation — กด “เพิ่มการตรวจความรู้สึก”</EmptyRows>
          ) : (
            form.sensationRows.map((row) => (
              <RowShell key={row.id} readOnly={readOnly} onRemove={() => removeRow('sensationRows', row.id)}>
                <Field label='ชนิดการรับรู้' required>
                  <Select
                    showLabel={false}
                    size='lg'
                    disabled={readOnly}
                    value={row.type}
                    onChange={(v) => updateRow('sensationRows', row.id, { type: v })}
                    options={SENSATION_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
                    placeholder='เลือกชนิด'
                  />
                </Field>
                <Field label='บริเวณที่ตรวจ' required>
                  <InputField
                    disabled={readOnly}
                    value={row.area}
                    onChange={(v) => updateRow('sensationRows', row.id, { area: v })}
                    placeholder='เช่น ปลายเท้าทั้งสองข้าง / ต่ำกว่าระดับ T10'
                  />
                </Field>
                <Field label='ข้าง' required>
                  <Select
                    showLabel={false}
                    searchable={false}
                    size='lg'
                    disabled={readOnly}
                    value={row.side}
                    onChange={(v) => updateRow('sensationRows', row.id, { side: v })}
                    options={sideOptionsFor()}
                    placeholder='เลือกข้าง'
                  />
                </Field>
                <Field label='ผลการตรวจ' required>
                  <Select
                    showLabel={false}
                    searchable={false}
                    size='lg'
                    disabled={readOnly}
                    value={row.result}
                    onChange={(v) => updateRow('sensationRows', row.id, { result: v })}
                    options={SENSATION_RESULT_OPTIONS}
                    placeholder='เลือกผล'
                  />
                </Field>
              </RowShell>
            ))
          )}
          {!readOnly && (
            <BrandDashedAddButton onClick={() => addRow('sensationRows', { type: '', area: '', side: '', result: '' })}>
              เพิ่มการตรวจความรู้สึก
            </BrandDashedAddButton>
          )}
        </div>
      )}

      {/* ── Reflex / Pathologic reflex ──────────────────────────── */}
      {activeTab === 'reflex' && (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <TopicHeader icon='bolt'>Deep tendon reflex</TopicHeader>
            {form.reflexRows.length === 0 ? (
              <EmptyRows>ยังไม่มีรายการ Reflex — กด “เพิ่ม Reflex”</EmptyRows>
            ) : (
              form.reflexRows.map((row) => (
                <RowShell key={row.id} readOnly={readOnly} onRemove={() => removeRow('reflexRows', row.id)}>
                  <Field label='Reflex' required>
                    <Select
                      showLabel={false}
                      size='lg'
                      disabled={readOnly}
                      value={row.reflex}
                      onChange={(v) => updateRow('reflexRows', row.id, { reflex: v })}
                      options={REFLEX_OPTIONS.map((r) => ({ value: r, label: r }))}
                      placeholder='เลือก reflex'
                    />
                  </Field>
                  <Field label='ข้าง' required>
                    <Select
                      showLabel={false}
                      searchable={false}
                      size='lg'
                      disabled={readOnly}
                      value={row.side}
                      onChange={(v) => updateRow('reflexRows', row.id, { side: v })}
                      options={sideOptionsFor()}
                      placeholder='เลือกข้าง'
                    />
                  </Field>
                  <Field label='ผล' required>
                    <Select
                      showLabel={false}
                      searchable={false}
                      size='lg'
                      disabled={readOnly}
                      value={row.grade}
                      onChange={(v) => updateRow('reflexRows', row.id, { grade: v })}
                      options={REFLEX_GRADE_OPTIONS}
                      placeholder='เลือกระดับ'
                    />
                  </Field>
                </RowShell>
              ))
            )}
            {!readOnly && (
              <BrandDashedAddButton onClick={() => addRow('reflexRows', { reflex: '', side: '', grade: '' })}>
                เพิ่ม Reflex
              </BrandDashedAddButton>
            )}
          </div>

          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <TopicHeader icon='warning'>Pathologic reflex</TopicHeader>
            {form.pathologicRows.length === 0 ? (
              <EmptyRows>ยังไม่มีรายการ Pathologic reflex — กด “เพิ่ม Pathologic reflex”</EmptyRows>
            ) : (
              form.pathologicRows.map((row) => (
                <RowShell key={row.id} readOnly={readOnly} onRemove={() => removeRow('pathologicRows', row.id)}>
                  <Field label='Pathologic reflex' required>
                    <Select
                      showLabel={false}
                      size='lg'
                      disabled={readOnly}
                      value={row.reflex}
                      onChange={(v) => updateRow('pathologicRows', row.id, { reflex: v })}
                      options={PATHOLOGIC_REFLEX_OPTIONS.map((r) => ({ value: r, label: r }))}
                      placeholder='เลือกรายการ'
                    />
                  </Field>
                  <Field label='ข้าง' required>
                    <Select
                      showLabel={false}
                      searchable={false}
                      size='lg'
                      disabled={readOnly}
                      value={row.side}
                      onChange={(v) => updateRow('pathologicRows', row.id, { side: v })}
                      options={sideOptionsFor()}
                      placeholder='เลือกข้าง'
                    />
                  </Field>
                  <Field label='ผล' required>
                    <Select
                      showLabel={false}
                      searchable={false}
                      size='lg'
                      disabled={readOnly}
                      value={row.result}
                      onChange={(v) => updateRow('pathologicRows', row.id, { result: v })}
                      options={PATHOLOGIC_RESULT_OPTIONS}
                      placeholder='เลือกผล'
                    />
                  </Field>
                </RowShell>
              ))
            )}
            {!readOnly && (
              <BrandDashedAddButton onClick={() => addRow('pathologicRows', { reflex: '', side: '', result: '' })}>
                เพิ่ม Pathologic reflex
              </BrandDashedAddButton>
            )}
          </div>
        </div>
      )}

      {/* ── Special test ────────────────────────────────────────── */}
      {activeTab === 'special' && (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <TopicHeader icon='rule'>Special test</TopicHeader>
          {form.specialTestRows.length === 0 ? (
            <EmptyRows>ยังไม่มีรายการ Special test — กด “เพิ่ม Special test”</EmptyRows>
          ) : (
            form.specialTestRows.map((row) => (
              <RowShell key={row.id} readOnly={readOnly} onRemove={() => removeRow('specialTestRows', row.id)}>
                <Field label='ชื่อการทดสอบ' required>
                  <Select
                    showLabel={false}
                    size='lg'
                    disabled={readOnly}
                    value={row.test}
                    onChange={(v) => updateRow('specialTestRows', row.id, { test: v })}
                    options={SPECIAL_TEST_OPTIONS.map((t) => ({ value: t, label: t }))}
                    placeholder='เลือกการทดสอบ'
                  />
                </Field>
                <Field label='ข้าง' required>
                  <Select
                    showLabel={false}
                    searchable={false}
                    size='lg'
                    disabled={readOnly}
                    value={row.side}
                    onChange={(v) => updateRow('specialTestRows', row.id, { side: v })}
                    options={sideOptionsFor()}
                    placeholder='เลือกข้าง'
                  />
                </Field>
                <Field label='ผล' required>
                  <Select
                    showLabel={false}
                    searchable={false}
                    size='lg'
                    disabled={readOnly}
                    value={row.result}
                    onChange={(v) => updateRow('specialTestRows', row.id, { result: v })}
                    options={SPECIAL_TEST_RESULT_OPTIONS}
                    placeholder='เลือกผล'
                  />
                </Field>
                <Field label='หมายเหตุ'>
                  <InputField
                    disabled={readOnly}
                    value={row.note}
                    onChange={(v) => updateRow('specialTestRows', row.id, { note: v })}
                    placeholder='เช่น positive ที่ 45 องศา'
                  />
                </Field>
              </RowShell>
            ))
          )}
          {!readOnly && (
            <BrandDashedAddButton onClick={() => addRow('specialTestRows', { test: '', side: '', result: '', note: '' })}>
              เพิ่ม Special test
            </BrandDashedAddButton>
          )}
        </div>
      )}

      {/* ── Body diagram (คู่มือเดิม §2.3 ข้อ 6 — บันทึกรูปภาพ + วาดกำกับ) */}
      {activeTab === 'diagram' && (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <TopicHeader icon='draw'>ภาพร่างกายพร้อมบันทึกตำแหน่งที่ทำกายภาพ</TopicHeader>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            กด “บันทึกร่างกาย” เพื่อเปิดกระดานวาด — วาดตำแหน่งที่ปวด/ที่ทำหัตถการลงบนภาพ
            แล้วกดบันทึก (ปุ่มบันทึกจะเปิดใช้งานเมื่อมีการวาดอย่างน้อย 1 เส้น)
          </span>
          {/* Per-system marker + drawing isolation (contract เดียวกับ
              TreatmentSteps): `bodyMarkers` / `bodyDrawings` เป็น object
              คีย์ตามระบบร่างกาย — panel เห็นเฉพาะ slice ของระบบที่เลือกอยู่
              และบันทึกกลับเฉพาะ key นั้น ไม่ทับ annotation ของระบบอื่น. */}
          <BodyDiagramPanel
            systemKey={bodySystem}
            viewKey={bodyView}
            markers={(form.bodyMarkers && form.bodyMarkers[bodySystem]) || []}
            drawings={(form.bodyDrawings && form.bodyDrawings[bodySystem]) || []}
            onSystemChange={setBodySystem}
            onViewChange={setBodyView}
            onMarkersChange={(next) => {
              if (readOnly) return;
              setForm((f) => ({ ...f, bodyMarkers: { ...(f.bodyMarkers || {}), [bodySystem]: next } }));
            }}
            onDrawingsChange={(next) => {
              if (readOnly) return;
              setForm((f) => ({ ...f, bodyDrawings: { ...(f.bodyDrawings || {}), [bodySystem]: next } }));
            }}
            variant={readOnly ? 'summary' : 'default'}
          />
        </div>
      )}

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='clipboard'>สรุปผลการตรวจร่างกาย</TopicHeader>
        <SuggestibleTextarea
          voice
          disabled={readOnly}
          label='บันทึกสรุปผลการตรวจ'
          value={form.examNote}
          onChange={setNote('examNote')}
          suggestions={REHAB_EXAM_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น ROM ข้อไหล่ซ้ายจำกัด · MMT ซีกขวา 3/5 · ทรงตัวขณะยืนต้องมีคนดูแล'
        />
      </div>
    </StepCard>
  );
};

/* ─── Step 3 — ประเมิน ADLs (Barthel Index, TOR 1.10.10.7) ───────── */

export const RehabStep3Adl = ({ form, setForm, readOnly = false, rehabHn }) => {
  const previousTotal = getPreviousBarthel(rehabHn);
  const { complete } = scoreBarthel(form.barthel);

  return (
    <StepCard>
      <TopicHeader icon='accessibility_new'>ประเมินความสามารถในการทำกิจวัตรประจำวัน (Barthel ADL Index)</TopicHeader>
      <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
        ให้คะแนนตามความสามารถจริงในช่วง 24–48 ชั่วโมงที่ผ่านมา (ไม่ใช่สิ่งที่ผู้รับบริการ “น่าจะทำได้”)
        — คะแนนรวมใช้ประเมินสิทธิ Intermediate Care และวัดผลการฟื้นฟูในหน้าติดตาม
      </span>

      <BarthelIndexGrid
        value={form.barthel}
        readOnly={readOnly}
        previousTotal={previousTotal}
        previousLabel='คะแนนครั้งก่อน'
        onChange={(itemKey, score) => {
          if (readOnly) return;
          setForm((f) => ({ ...f, barthel: { ...f.barthel, [itemKey]: score } }));
        }}
      />

      {!complete && !readOnly && (
        <WarningNote icon='assignment_late'>
          ยังให้คะแนนไม่ครบทุกหัวข้อ — บันทึกร่างได้ แต่จะยืนยันการบันทึกไม่ได้จนกว่าจะประเมินครบ
          (คะแนนที่ไม่ครบแปลผลผิดพลาดได้)
        </WarningNote>
      )}

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='edit'>บันทึกเพิ่มเติมเกี่ยวกับการทำกิจวัตรประจำวัน</TopicHeader>
        <SuggestibleTextarea
          voice
          disabled={readOnly}
          label='บันทึกผู้ประเมิน'
          value={form.barthelNote}
          onChange={(e) => { if (!readOnly) setForm((f) => ({ ...f, barthelNote: e.target.value })); }}
          suggestions={REHAB_BARTHEL_NOTE_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น ยังต้องช่วยเรื่องอาบน้ำและขึ้น-ลงบันได · ญาติเข้าใจวิธีช่วยเคลื่อนย้ายตัวแล้ว'
        />
      </div>
    </StepCard>
  );
};

/* ─── Step 4 — วินิจฉัยและเป้าหมาย + Treatment Course ─────────────── */

const REHAB_ICD10_OPTIONS = REHAB_CAUSES.map((c) => ({ value: c.icd10, label: c.icd10Label }));

export const RehabStep4Diagnosis = ({
  form, setForm, readOnly = false, registration,
}) => {
  const [icdOpen, setIcdOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [goalError, setGoalError] = useState('');
  const [removeGoalTarget, setRemoveGoalTarget] = useState(null);

  const setNote = (key) => (e) => {
    if (readOnly) return;
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const addGoal = () => {
    if (readOnly) return;
    if (!goalDraft.trim()) {
      setGoalError('พิมพ์เป้าหมายก่อนกดเพิ่ม');
      return;
    }
    setForm((f) => ({
      ...f,
      goals: [...f.goals, { id: nextId('goal'), text: goalDraft.trim(), achieved: false }],
    }));
    setGoalDraft('');
    setGoalError('');
  };

  const toggleGoal = (id) => {
    if (readOnly) return;
    setForm((f) => ({
      ...f,
      goals: f.goals.map((g) => (g.id === id ? { ...g, achieved: !g.achieved } : g)),
    }));
  };

  const confirmRemoveGoal = () => {
    setForm((f) => ({ ...f, goals: f.goals.filter((g) => g.id !== removeGoalTarget.id) }));
    setRemoveGoalTarget(null);
  };

  return (
    <StepCard>
      <Icd10SearchPopup
        open={icdOpen}
        onClose={() => setIcdOpen(false)}
        onSelect={(pick) => {
          if (readOnly) return;
          setForm((f) => ({
            ...f,
            icd10: pick.code,
            diagnosisNote: f.diagnosisNote?.trim() ? f.diagnosisNote : pick.name,
          }));
        }}
        initialQuery={form.diagnosisNote || ''}
      />

      <Popup
        open={!!removeGoalTarget}
        onClose={() => setRemoveGoalTarget(null)}
        title='ลบเป้าหมายการฟื้นฟู?'
        subtitle={removeGoalTarget ? removeGoalTarget.text : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setRemoveGoalTarget(null) }}
        primaryAction={{ label: 'ลบเป้าหมาย', onClick: confirmRemoveGoal, tone: 'danger' }}
      />

      {/* Treatment Course — คู่มือเดิม §2.4 "ข้อมูลการวินิจฉัย" */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='assignment'>Treatment Course</TopicHeader>
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
          <Field label='เลขที่ Course' hint={registration?.courseNo ? `Course ปัจจุบันตามทะเบียน: ${registration.courseNo}` : undefined}>
            <InputField
              disabled={readOnly}
              value={form.courseNo}
              onChange={(v) => setForm((f) => ({ ...f, courseNo: v }))}
              placeholder='เช่น C-2569-014'
            />
          </Field>
          <Field label='วันที่ประเมิน'>
            <DatePicker
              showLabel={false}
              disabled={readOnly}
              value={form.assessDate ? new Date(form.assessDate) : null}
              onChange={(d) => { if (!readOnly) setForm((f) => ({ ...f, assessDate: d ? d.toISOString().slice(0, 10) : '' })); }}
              placeholder='เลือกวันที่'
            />
          </Field>
          <Field label='สถานะจำหน่าย'>
            <Select
              showLabel={false}
              searchable={false}
              size='lg'
              disabled={readOnly}
              value={form.dischargeStatus}
              onChange={(v) => { if (!readOnly) setForm((f) => ({ ...f, dischargeStatus: v })); }}
              options={REHAB_DISCHARGE_STATUS}
              placeholder='เลือกสถานะ'
            />
          </Field>
        </div>
        <SuggestibleTextarea
          voice
          disabled={readOnly}
          label='สรุปผลการรักษาของ Course'
          value={form.courseSummary}
          onChange={setNote('courseSummary')}
          suggestions={REHAB_COURSE_SUMMARY_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น บรรลุเป้าหมายการเดินตามแผน · แนะนำโปรแกรมออกกำลังกายต่อเนื่องที่บ้าน'
        />
      </div>

      {/* Diagnosis */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader
          icon='clipboard'
          action={!readOnly ? (
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='search' onClick={() => setIcdOpen(true)}>
              ค้นหา ICD-10 ด้วย AI
            </BrandSubdueButton>
          ) : undefined}
        >
          การวินิจฉัย (Diagnosis)
        </TopicHeader>
        <SuggestibleTextarea
          voice
          required
          disabled={readOnly}
          label='คำวินิจฉัย'
          value={form.diagnosisNote}
          onChange={setNote('diagnosisNote')}
          suggestions={REHAB_DIAGNOSIS_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น Hemiparesis ซีกขวาจากโรคหลอดเลือดสมองตีบ'
        />
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
          <Field label='รหัส ICD-10' required hint='เลือกจากรายการที่พบบ่อยในงานฟื้นฟู หรือค้นหาเพิ่มด้วยปุ่มด้านบน'>
            <Select
              showLabel={false}
              size='lg'
              disabled={readOnly}
              value={form.icd10}
              onChange={(v) => { if (!readOnly) setForm((f) => ({ ...f, icd10: v })); }}
              options={
                form.icd10 && !REHAB_ICD10_OPTIONS.some((o) => o.value === form.icd10)
                  ? [...REHAB_ICD10_OPTIONS, { value: form.icd10, label: `${form.icd10} — เลือกจากการค้นหา` }]
                  : REHAB_ICD10_OPTIONS
              }
              placeholder='เลือกรหัส ICD-10'
            />
          </Field>
        </div>
      </div>

      {/* Goal list — คู่มือเดิม: ปุ่ม + เพิ่มบรรทัดเป้าหมาย */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='flag'>เป้าหมายการฟื้นฟู (Goal)</TopicHeader>
        {form.goals.length === 0 ? (
          <EmptyRows>ยังไม่มีเป้าหมาย — เพิ่มอย่างน้อย 1 ข้อเพื่อใช้วัดผลในหน้าติดตาม</EmptyRows>
        ) : (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            {form.goals.map((goal, idx) => (
              <div
                key={goal.id}
                className='flex items-center w-full flex-wrap'
                style={{
                  gap: 'var(--dim-space-300)',
                  paddingTop: 'var(--dim-space-300)',
                  paddingBottom: 'var(--dim-space-300)',
                  paddingLeft: 'var(--dim-space-400)',
                  paddingRight: 'var(--dim-space-400)',
                  borderRadius: 'var(--dim-radius-300)',
                  border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                  background: 'var(--surface-card-100)',
                }}
              >
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>{idx + 1}.</span>
                <span className='flex-1 min-w-0' style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
                  {goal.text}
                </span>
                <SelectableTag
                  label={goal.achieved ? 'บรรลุแล้ว' : 'ยังไม่บรรลุ'}
                  size='md'
                  selected={goal.achieved}
                  onClick={() => toggleGoal(goal.id)}
                />
                {!readOnly && (
                  <NeutralSubdueButton size='sm' leadingIcon='delete' onClick={() => setRemoveGoalTarget(goal)}>
                    ลบ
                  </NeutralSubdueButton>
                )}
              </div>
            ))}
          </div>
        )}

        {!readOnly && (
          <>
            <SuggestibleTextarea
              voice
              label='เพิ่มเป้าหมายใหม่'
              value={goalDraft}
              onChange={(e) => { setGoalDraft(e.target.value); if (goalError) setGoalError(''); }}
              suggestions={REHAB_GOAL_SUGGESTIONS}
              minChars={3}
              placeholder='เช่น เดินด้วยไม้เท้าได้เองในระยะ 50 เมตรภายใน 4 สัปดาห์'
            />
            {goalError && <ErrorNote>{goalError}</ErrorNote>}
            <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='add' onClick={addGoal}>
                เพิ่มเป้าหมาย
              </BrandSubdueButton>
            </div>
          </>
        )}
      </div>
    </StepCard>
  );
};

/* ─── Step 5 — โปรแกรมฟื้นฟู + หัตถการ + CPOE ────────────────────── */

export const RehabStep5Program = ({
  form, setForm, patient, readOnly = false, rightsExpired = false, therapistDefault = '',
}) => {
  const [removeProcTarget, setRemoveProcTarget] = useState(null);

  const toggleActivity = (key) => {
    if (readOnly) return;
    setForm((f) => ({
      ...f,
      programActivities: { ...f.programActivities, [key]: !f.programActivities[key] },
    }));
  };

  const addProcedure = () => {
    if (readOnly) return;
    setForm((f) => ({
      ...f,
      procedureRows: [
        ...f.procedureRows,
        {
          id: nextId('proc'),
          name: '',
          performer: therapistDefault || '',
          time: new Date().toTimeString().slice(0, 5),
          note: '',
          cancelled: false,
        },
      ],
    }));
  };

  const updateProcedure = (id, patch) => {
    if (readOnly) return;
    setForm((f) => ({
      ...f,
      procedureRows: f.procedureRows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  /* ยกเลิกหัตถการ = ทำเครื่องหมายไว้ ไม่ลบทิ้ง (audit trail ตาม playbook §5)
     ส่วน "ลบ" ใช้เฉพาะแถวที่เพิ่งเพิ่มผิดและยังไม่ได้บันทึก. */
  const confirmRemoveProcedure = () => {
    setForm((f) => ({ ...f, procedureRows: f.procedureRows.filter((r) => r.id !== removeProcTarget.id) }));
    setRemoveProcTarget(null);
  };

  const selectedActivities = REHAB_PROGRAM_ACTIVITIES.filter((a) => form.programActivities[a.key]);

  return (
    <StepCard>
      <Popup
        open={!!removeProcTarget}
        onClose={() => setRemoveProcTarget(null)}
        title='ลบรายการหัตถการ?'
        subtitle={removeProcTarget ? (removeProcTarget.name || 'รายการที่ยังไม่ได้ระบุชื่อ') : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setRemoveProcTarget(null) }}
        primaryAction={{ label: 'ลบรายการ', onClick: confirmRemoveProcedure, tone: 'danger' }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
          หากหัตถการนี้ทำไปแล้วแต่ต้องการยกเลิก ให้ใช้ปุ่ม “ทำเครื่องหมายยกเลิก” แทน
          เพื่อให้ประวัติการรักษายังคงตรวจสอบย้อนหลังได้
        </span>
      </Popup>

      {/* แผนโปรแกรมฟื้นฟู */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='fitness_center'>แผนโปรแกรมฟื้นฟู (Rehabilitation program)</TopicHeader>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          {REHAB_PROGRAM_ACTIVITIES.map((a) => (
            <SelectableTag
              key={a.key}
              label={a.label}
              size='lg'
              selected={!!form.programActivities[a.key]}
              onClick={() => toggleActivity(a.key)}
            />
          ))}
        </div>
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
          <Field label='ความถี่'>
            <Select
              showLabel={false}
              searchable={false}
              size='lg'
              disabled={readOnly}
              value={form.programFrequency}
              onChange={(v) => { if (!readOnly) setForm((f) => ({ ...f, programFrequency: v })); }}
              options={REHAB_FREQUENCY_OPTIONS}
              placeholder='เลือกความถี่'
            />
          </Field>
          <Field label='ระยะเวลา (สัปดาห์)'>
            <InputField
              disabled={readOnly}
              type='number'
              value={form.programWeeks}
              onChange={(v) => { if (!readOnly) setForm((f) => ({ ...f, programWeeks: v })); }}
              placeholder='เช่น 6'
            />
          </Field>
        </div>
        {selectedActivities.length === 0 && (
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            ยังไม่ได้เลือกกิจกรรมในโปรแกรม — เลือกอย่างน้อย 1 กิจกรรม หรือบันทึกหัตถการที่ทำจริงด้านล่าง
          </span>
        )}
        <SuggestibleTextarea
          voice
          disabled={readOnly}
          label='หมายเหตุแผนการฟื้นฟู'
          value={form.programNote}
          onChange={(e) => { if (!readOnly) setForm((f) => ({ ...f, programNote: e.target.value })); }}
          suggestions={REHAB_PROGRAM_NOTE_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น ประคบร้อน 15 นาทีก่อนออกกำลังกาย · สอนญาติทำ PROM ต่อที่บ้านวันละ 2 รอบ'
        />
      </div>

      {/* หัตถการที่ทำจริงในวิสิตนี้ — คู่มือเดิม §2.3 "บันทึกหัตถการทั่วไป" */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='healing'>หัตถการที่ทำในวันนี้</TopicHeader>
        {form.procedureRows.length === 0 ? (
          <EmptyRows>ยังไม่มีรายการหัตถการ — กด “เพิ่มหัตถการ” เพื่อบันทึกผู้ทำ เวลา และผลการทำ</EmptyRows>
        ) : (
          form.procedureRows.map((row) => (
            <div
              key={row.id}
              className='flex flex-col w-full'
              style={{
                gap: 'var(--dim-space-300)',
                paddingTop: 'var(--dim-space-400)',
                paddingBottom: 'var(--dim-space-400)',
                paddingLeft: 'var(--dim-space-400)',
                paddingRight: 'var(--dim-space-400)',
                borderRadius: 'var(--dim-radius-300)',
                border: `var(--dim-stroke-100) solid ${row.cancelled
                  ? 'var(--border-danger-default, #E58585)'
                  : 'var(--border-card-default)'}`,
                background: row.cancelled
                  ? 'var(--surface-danger-quaternary, #FFF0F0)'
                  : 'var(--surface-card-100)',
              }}
            >
              <div className='flex items-end w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <Field label='ชื่อหัตถการ' required>
                  <Select
                    showLabel={false}
                    size='lg'
                    disabled={readOnly || row.cancelled}
                    value={row.name}
                    onChange={(v) => updateProcedure(row.id, { name: v })}
                    options={REHAB_PROGRAM_ACTIVITIES.map((a) => ({ value: a.key, label: a.label }))}
                    placeholder='เลือกหัตถการ'
                  />
                </Field>
                <Field label='ผู้ทำหัตถการ' required>
                  <Select
                    showLabel={false}
                    size='lg'
                    disabled={readOnly || row.cancelled}
                    value={row.performer}
                    onChange={(v) => updateProcedure(row.id, { performer: v })}
                    options={REHAB_THERAPIST_OPTIONS.map((t) => ({ value: t, label: t }))}
                    placeholder='เลือกผู้ทำ'
                  />
                </Field>
                <Field label='เวลาที่ทำ'>
                  <TimePicker
                    showLabel={false}
                    disabled={readOnly || row.cancelled}
                    value={row.time}
                    onChange={(v) => updateProcedure(row.id, { time: v })}
                    minuteStep={5}
                  />
                </Field>
                {row.cancelled && (
                  <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกหัตถการแล้ว</ColorfulBadge>
                )}
              </div>

              <SuggestibleTextarea
                voice
                disabled={readOnly || row.cancelled}
                label='บันทึกผลการทำหัตถการ'
                value={row.note}
                onChange={(e) => updateProcedure(row.id, { note: e.target.value })}
                suggestions={REHAB_PROCEDURE_NOTE_SUGGESTIONS}
                minChars={3}
                placeholder='เช่น ทำครบตามแผน ผู้รับบริการทนได้ดี ไม่มีอาการข้างเคียง'
              />

              {!readOnly && (
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                  {row.cancelled ? (
                    <BrandSubdueButton
                      variant='outline'
                      size='sm'
                      leadingIcon='restart_alt'
                      onClick={() => updateProcedure(row.id, { cancelled: false })}
                    >
                      เปิดใช้งานรายการนี้อีกครั้ง
                    </BrandSubdueButton>
                  ) : (
                    <NeutralSubdueButton
                      size='sm'
                      leadingIcon='block'
                      onClick={() => updateProcedure(row.id, { cancelled: true })}
                    >
                      ทำเครื่องหมายยกเลิก
                    </NeutralSubdueButton>
                  )}
                  <NeutralSubdueButton size='sm' leadingIcon='delete' onClick={() => setRemoveProcTarget(row)}>
                    ลบรายการ
                  </NeutralSubdueButton>
                </div>
              )}
            </div>
          ))
        )}
        {!readOnly && (
          <BrandDashedAddButton onClick={addProcedure}>เพิ่มหัตถการ</BrandDashedAddButton>
        )}
      </div>

      {/* CPOE — สั่งยา / Lab / X-ray / consult ชุดเดียวกับหน้า OPD */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='pill'>คำสั่งการรักษาเพิ่มเติม (CPOE)</TopicHeader>
        {rightsExpired && (
          <WarningNote icon='shield_question'>
            สิทธิการรักษาของผู้รับบริการหมดอายุ / ชำระเอง — ตรวจสอบสิทธิอีกครั้งก่อนสั่งยาและส่งตรวจ
            (ค่าใช้จ่ายอาจไม่สามารถเบิกได้)
          </WarningNote>
        )}
        {readOnly ? (
          <WarningNote icon='visibility'>
            สิทธิ์ของคุณดูได้อย่างเดียว — เปิดดูรายการคำสั่งการรักษาได้จากประวัติการรักษา (ขั้นตอนที่ 1)
          </WarningNote>
        ) : (
          <Step5Orders form={form} setForm={setForm} patient={patient} />
        )}
      </div>
    </StepCard>
  );
};

/* ─── Step 6 — เอกสารแนบ (TOR 1.10.10.4) ────────────────────────── */

const ATTACH_ACCEPT = ['pdf', 'png', 'jpg', 'jpeg'];
const ATTACH_MAX_BYTES = 10 * 1024 * 1024;

const formatBytes = (n) => {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
};

export const RehabStep6Attachments = ({ form, setForm, readOnly = false }) => {
  const [error, setError] = useState('');
  const [previewTarget, setPreviewTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  /* ไฟล์ที่ผ่าน validation แล้วและกำลัง "อัปโหลด" — mock ใช้แถบ progress ของ
     DS เพื่อให้ผู้ใช้เห็นว่าระบบรับไฟล์แล้ว (แทน spinner ที่ไม่บอกอะไร) */
  const [uploading, setUploading] = useState(null);

  const pushAttachment = (att) => {
    setForm((f) => ({ ...f, attachments: [...f.attachments, att] }));
  };

  const progress = useSmoothUploadProgress({
    active: !!uploading,
    durationMs: 1100,
    onDone: () => {
      setUploading((pending) => {
        if (pending) pushAttachment(pending.attachment);
        return null;
      });
    },
  });

  const addFile = (file) => {
    if (readOnly) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ATTACH_ACCEPT.includes(ext)) {
      setError(`ไฟล์ .${ext} ไม่รองรับ — แนบได้เฉพาะ ${ATTACH_ACCEPT.map((e) => `.${e}`).join(' ')}`);
      return;
    }
    if (file.size > ATTACH_MAX_BYTES) {
      setError(`ไฟล์ ${file.name} ขนาด ${formatBytes(file.size)} เกินขนาดสูงสุด 10 MB`);
      return;
    }
    setError('');
    setUploading({
      fileName: file.name,
      attachment: {
        id: nextId('att'),
        name: file.name,
        sizeLabel: formatBytes(file.size),
        type: ext,
        addedAt: new Date().toISOString(),
      },
    });
  };

  const confirmRemove = () => {
    setForm((f) => ({ ...f, attachments: f.attachments.filter((a) => a.id !== removeTarget.id) }));
    setRemoveTarget(null);
  };

  return (
    <StepCard>
      <CameraCapturePopup
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={() => {
          setCameraOpen(false);
          if (readOnly) return;
          setError('');
          pushAttachment({
            id: nextId('att'),
            name: `ภาพถ่ายจากกล้อง-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.jpg`,
            sizeLabel: '~1.2 MB',
            type: 'jpg',
            addedAt: new Date().toISOString(),
            fromCamera: true,
          });
        }}
      />

      <Popup
        open={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
        size='large'
        title='ตัวอย่างเอกสารแนบ'
        subtitle={previewTarget ? `${previewTarget.name} · ${previewTarget.sizeLabel}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setPreviewTarget(null) }}
        secondaryAction={{ label: 'พิมพ์เอกสาร', onClick: () => window.print() }}
      >
        <div
          className='flex flex-col items-center justify-center text-center w-full'
          style={{
            gap: 'var(--dim-space-300)',
            padding: 'var(--dim-space-800, 32px)',
            borderRadius: 'var(--dim-radius-400)',
            border: 'var(--dim-stroke-100) dashed var(--border-neutral-tertiary, #C6CACD)',
            background: 'var(--surface-neutral-quaternary)',
            color: 'var(--text-content-tertiary)',
          }}
        >
          <Icon name={previewTarget?.type === 'pdf' ? 'picture_as_pdf' : 'image'} size={48} />
          <span style={{ fontSize: 'var(--type-size-sm)' }}>
            ตัวอย่างเอกสาร (mock) — ระบบจริงจะแสดงไฟล์ที่อัปโหลดจากเครื่องบริการจัดเก็บเอกสาร
          </span>
        </div>
      </Popup>

      <Popup
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title='ลบเอกสารแนบ?'
        subtitle={removeTarget ? removeTarget.name : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setRemoveTarget(null) }}
        primaryAction={{ label: 'ลบเอกสาร', onClick: confirmRemove, tone: 'danger' }}
      />

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader
          icon='file'
          action={!readOnly ? (
            <NeutralSubdueButton size='sm' leadingIcon='photo_camera' onClick={() => setCameraOpen(true)}>
              ถ่ายภาพจากกล้อง
            </NeutralSubdueButton>
          ) : undefined}
        >
          เอกสารแนบระหว่างการฟื้นฟู
        </TopicHeader>
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
          เช่น ใบส่งตัวจากโรงพยาบาลแม่ข่าย · ผลเอกซเรย์เดิม · ใบรับรองความพิการ · ภาพถ่ายท่าทางการเดิน
        </span>

        {!readOnly && (
          <FileUploadField
            label='แนบเอกสาร'
            helperText='รองรับ .pdf .png .jpg ขนาดไม่เกิน 10 MB ต่อไฟล์'
            accept={ATTACH_ACCEPT.map((e) => `.${e}`).join(',')}
            buttonLabel='เลือกไฟล์แนบ'
            onFile={addFile}
          />
        )}
        {error && <ErrorNote>{error}</ErrorNote>}
        {uploading && (
          <UploadProgressBar
            progress={progress}
            fileName={uploading.fileName}
            label='กำลังแนบเอกสารเข้าสู่บันทึกการฟื้นฟู…'
          />
        )}

        {form.attachments.length === 0 && !uploading ? (
          <div
            className='flex flex-col items-center text-center w-full'
            style={{
              gap: 'var(--dim-space-200)',
              padding: 'var(--dim-space-800, 32px)',
              borderRadius: 'var(--dim-radius-400)',
              border: 'var(--dim-stroke-100) dashed var(--border-neutral-tertiary, #C6CACD)',
              color: 'var(--text-content-tertiary)',
            }}
          >
            <Icon name='folder_open' size={32} />
            <span style={{ fontSize: 'var(--type-size-sm)' }}>ยังไม่มีเอกสารแนบในวิสิตนี้</span>
          </div>
        ) : (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            {form.attachments.map((att) => (
              <div
                key={att.id}
                className='flex items-center w-full'
                style={{
                  gap: 'var(--dim-space-300)',
                  paddingTop: 'var(--dim-space-200)',
                  paddingBottom: 'var(--dim-space-200)',
                  paddingLeft: 'var(--dim-space-300)',
                  paddingRight: 'var(--dim-space-300)',
                  borderRadius: 'var(--dim-radius-200)',
                  border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                  background: 'var(--surface-card-100)',
                }}
              >
                <Icon name={att.type === 'pdf' ? 'picture_as_pdf' : 'image'} size={20} />
                <div className='flex-1 min-w-0 flex flex-col'>
                  <span className='truncate' style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
                    {att.name}
                  </span>
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                    {att.sizeLabel} · แนบเมื่อ {formatRehabDateTime(att.addedAt)}
                    {att.fromCamera ? ' · ถ่ายจากกล้องในระบบ' : ''}
                  </span>
                </div>
                <NeutralSubdueButton size='sm' leadingIcon='visibility' onClick={() => setPreviewTarget(att)}>
                  ดูตัวอย่าง
                </NeutralSubdueButton>
                {!readOnly && (
                  <NeutralSubdueButton size='sm' leadingIcon='delete' onClick={() => setRemoveTarget(att)}>
                    ลบ
                  </NeutralSubdueButton>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </StepCard>
  );
};

/* ─── Step 7 — นัดหมายต่อเนื่อง + ยืนยันการบันทึก ────────────────── */

/** ตรวจสอบนัดหมาย — คืน '' เมื่อผ่าน (หรือข้ามการนัด / ยังไม่กรอก).
    `exceptHn` ทำให้ผู้ป่วยบันทึกทับนัดของตัวเองได้โดยไม่ชนตัวเอง.
    `remaining` = จำนวนครั้งคงเหลือใน Course — 0 แปลว่าครบแล้ว. */
export const validateRehabAppointment = (appointment, exceptHn, remaining = null) => {
  if (appointment.skipped || !appointment.date) return '';
  if (appointment.date < todayIso()) {
    return 'ไม่สามารถบันทึกนัดหมายย้อนหลังได้ — เลือกวันที่ตั้งแต่วันนี้เป็นต้นไป';
  }
  if (appointment.time && isRehabSlotBooked(appointment.date, appointment.time, exceptHn)) {
    return `ช่วงเวลา ${appointment.time} น. ของวันที่เลือกมีนัดหมายเต็มแล้ว — เลือกเวลาอื่น`;
  }
  if (remaining != null && remaining <= 0) {
    return 'ครบจำนวนครั้งใน Course นี้แล้ว — เปิด Course ใหม่ที่หน้าทะเบียนก่อนนัดครั้งถัดไป';
  }
  return '';
};

const SavedAppointmentStrip = ({ appt, readOnly, onEdit, onCancel, onRebook, onPrint }) => {
  const cancelled = appt.status === 'cancelled';
  return (
    <div
      className='flex flex-col w-full'
      style={{
        gap: 'var(--dim-space-200)',
        paddingTop: 'var(--dim-space-400)',
        paddingBottom: 'var(--dim-space-400)',
        paddingLeft: 'var(--dim-space-400)',
        paddingRight: 'var(--dim-space-400)',
        borderRadius: 'var(--dim-radius-300)',
        border: `var(--dim-stroke-100) solid ${cancelled
          ? 'var(--border-danger-default, #E58585)'
          : 'var(--border-brandPrimary-quaternary)'}`,
        background: cancelled
          ? 'var(--surface-danger-quaternary, #FFF0F0)'
          : 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
      }}
    >
      <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        <Icon name={cancelled ? 'block' : 'event_available'} size={20} />
        <span style={{ fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>
          {formatRehabDate(appt.date)}{appt.time ? ` · ${appt.time} น.` : ''}
        </span>
        {appt.mode === 'telemedicine'
          ? <ColorfulBadge style='blue' size='small' hierarchy='secondary'>Telemedicine</ColorfulBadge>
          : <ColorfulBadge style='teal' size='small' hierarchy='secondary'>ที่ห้องกายภาพบำบัด</ColorfulBadge>}
        {cancelled
          ? <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกนัดหมายแล้ว</ColorfulBadge>
          : <ColorfulBadge style='green' size='small' hierarchy='secondary'>บันทึกนัดหมายแล้ว</ColorfulBadge>}
        <div className='flex-1' />
        <Link
          to='/appointment'
          className='inline-flex items-center hover:underline'
          style={{
            gap: 'var(--dim-space-100)',
            fontSize: 'var(--type-size-sm)',
            color: 'var(--text-brandPrimary-default, #007549)',
            textDecoration: 'none',
          }}
        >
          <Icon name='open_in_new' size={16} />
          เปิดในระบบนัดหมาย
        </Link>
      </div>

      <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
        ผู้รักษา {appt.therapist || '—'} · รหัสนัดหมาย {appt.id}
        {appt.courseNo ? ` · Course ${appt.courseNo}` : ''}
        {appt.note ? ` · เตรียมตัว: ${appt.note}` : ''}
      </span>

      <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
        ผู้บันทึก {appt.createdBy} · {formatRehabDateTime(appt.createdAt)}
        {appt.updatedAt ? ` · แก้ไขล่าสุดโดย ${appt.updatedBy} · ${formatRehabDateTime(appt.updatedAt)}` : ''}
      </span>

      {cancelled && (
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-danger-default, #C72121)' }}>
          ผู้ยกเลิก {appt.cancelledBy} · {formatRehabDateTime(appt.cancelledAt)} · เหตุผล: {appt.cancelReason}
        </span>
      )}

      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        {!cancelled && (
          <BrandSubdueButton variant='outline' size='sm' leadingIcon='print' onClick={onPrint}>
            พิมพ์ใบนัด
          </BrandSubdueButton>
        )}
        {!readOnly && (
          cancelled ? (
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='event_available' onClick={onRebook}>
              นัดหมายใหม่
            </BrandSubdueButton>
          ) : (
            <>
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={onEdit}>
                แก้ไขนัดหมาย
              </BrandSubdueButton>
              <NeutralSubdueButton size='sm' leadingIcon='block' onClick={onCancel}>
                ยกเลิกนัดหมาย
              </NeutralSubdueButton>
            </>
          )
        )}
      </div>
    </div>
  );
};

export const RehabStep7Appointment = ({
  form, setForm, readOnly = false,
  saveState, confirmError,
  onSaveDraft, onConfirm, onReopenRecord,
  rehabHn,
  registration,
  visitNo,
  savedAppointment = null,
  apptEditing = false,
  apptSaveError = '',
  registryCancelled = false,
  onEditAppointment,
  onSaveAppointmentEdit,
  onDiscardAppointmentEdit,
  onCancelAppointment,
  onRebookAppointment,
  onPrintAppointmentSlip,
  onPrintCourseSummary,
}) => {
  const setAppt = (key) => (value) => {
    if (readOnly) return;
    setForm((f) => ({ ...f, appointment: { ...f.appointment, [key]: value } }));
  };

  const courseTotal = registration?.courseTotal ?? null;
  const remaining = courseTotal != null && visitNo != null ? Math.max(0, courseTotal - visitNo) : null;

  const apptError = validateRehabAppointment(form.appointment, rehabHn, remaining);
  const slotHint = form.appointment.date && !form.appointment.skipped
    ? REHAB_APPOINTMENT_TIMES.filter((t) => !isRehabSlotBooked(form.appointment.date, t, rehabHn)).length
    : null;

  const showFields = !savedAppointment || apptEditing;
  const barthel = scoreBarthel(form.barthel);
  const dependency = barthelDependency(barthel.complete ? barthel.total : null);
  const activityCount = REHAB_PROGRAM_ACTIVITIES.filter((a) => form.programActivities[a.key]).length;
  const activeProcedures = form.procedureRows.filter((r) => !r.cancelled).length;

  return (
    <StepCard>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='calendar'>นัดหมายฟื้นฟูครั้งถัดไป</TopicHeader>

        {registryCancelled && (
          <WarningNote icon='shield_question'>
            ทะเบียนฟื้นฟูของผู้รับบริการรายนี้ถูกยกเลิกแล้ว — ยังบันทึกนัดหมายได้
            แต่ควรเปิดใช้งานทะเบียนอีกครั้งที่หน้าทะเบียนก่อนนัดติดตาม
          </WarningNote>
        )}

        {remaining != null && (
          <div
            className='flex items-center flex-wrap'
            style={{
              gap: 'var(--dim-space-200)',
              paddingTop: 'var(--dim-space-200)',
              paddingBottom: 'var(--dim-space-200)',
              paddingLeft: 'var(--dim-space-300)',
              paddingRight: 'var(--dim-space-300)',
              borderRadius: 'var(--dim-radius-200)',
              background: remaining > 0
                ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
                : 'var(--surface-alert-warning, #FFF9F0)',
              color: remaining > 0
                ? 'var(--text-brandPrimary-default, #007549)'
                : 'var(--text-warning-default, #C2410C)',
              fontSize: 'var(--type-size-sm)',
            }}
          >
            <Icon name='event_repeat' size={16} />
            {remaining > 0
              ? `Course ${registration?.courseNo || form.courseNo || '—'} · ครั้งที่ ${visitNo} จาก ${courseTotal} — เหลืออีก ${remaining} ครั้ง`
              : `Course ${registration?.courseNo || form.courseNo || '—'} ครบ ${courseTotal} ครั้งแล้ว — ต้องเปิด Course ใหม่ก่อนนัดครั้งถัดไป`}
          </div>
        )}

        {savedAppointment && (
          <SavedAppointmentStrip
            appt={savedAppointment}
            readOnly={readOnly}
            onEdit={onEditAppointment}
            onCancel={onCancelAppointment}
            onRebook={onRebookAppointment}
            onPrint={onPrintAppointmentSlip}
          />
        )}

        {showFields && (
          <>
            <SelectableTag
              label='ไม่นัดหมายครั้งถัดไป (จำหน่ายจาก Course / นัดผ่านช่องทางอื่น)'
              size='lg'
              selected={!!form.appointment.skipped}
              onClick={() => {
                if (readOnly) return;
                setForm((f) => ({
                  ...f,
                  appointment: { ...f.appointment, skipped: !f.appointment.skipped },
                }));
              }}
            />

            {!form.appointment.skipped && (
              <>
                <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                  <Field
                    label='วันนัดหมาย'
                    hint={slotHint != null ? `มีช่วงเวลาว่าง ${slotHint} ช่วงในวันที่เลือก` : 'เลือกวันที่ตั้งแต่วันนี้เป็นต้นไป'}
                  >
                    <DatePicker
                      showLabel={false}
                      disabled={readOnly}
                      value={form.appointment.date ? new Date(form.appointment.date) : null}
                      onChange={(d) => setAppt('date')(d ? d.toISOString().slice(0, 10) : '')}
                      placeholder='เลือกวันที่'
                    />
                  </Field>
                  <Field label='เวลานัดหมาย'>
                    <Select
                      showLabel={false}
                      searchable={false}
                      size='lg'
                      disabled={readOnly}
                      value={form.appointment.time}
                      onChange={(v) => setAppt('time')(v)}
                      options={REHAB_APPOINTMENT_TIMES.map((t) => ({
                        value: t,
                        label: form.appointment.date && isRehabSlotBooked(form.appointment.date, t, rehabHn)
                          ? `${t} น. (เต็ม)`
                          : `${t} น.`,
                      }))}
                      placeholder='เลือกเวลา'
                    />
                  </Field>
                  <Field label='ผู้รักษาที่นัด'>
                    <Select
                      showLabel={false}
                      size='lg'
                      disabled={readOnly}
                      value={form.appointment.therapist}
                      onChange={(v) => setAppt('therapist')(v)}
                      options={REHAB_THERAPIST_OPTIONS.map((t) => ({ value: t, label: t }))}
                      placeholder='เลือกผู้รักษา'
                    />
                  </Field>
                </div>
                {apptError && <ErrorNote>{apptError}</ErrorNote>}

                <Field label='รูปแบบการนัดหมาย'>
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                    <SelectableTag
                      label='มาที่ห้องกายภาพบำบัด'
                      size='lg'
                      selected={form.appointment.mode !== 'telemedicine'}
                      onClick={() => {
                        if (readOnly) return;
                        setForm((f) => ({ ...f, appointment: { ...f.appointment, mode: 'onsite' } }));
                      }}
                    />
                    <SelectableTag
                      label='ติดตามผ่าน Telemedicine'
                      size='lg'
                      selected={form.appointment.mode === 'telemedicine'}
                      onClick={() => setAppt('mode')('telemedicine')}
                    />
                    {form.appointment.mode === 'telemedicine' && (
                      <ColorfulIconBadge style='blue' size='medium' fill='default' icon='videocam' />
                    )}
                  </div>
                </Field>

                <SuggestibleTextarea
                  voice
                  disabled={readOnly}
                  label='คำแนะนำการเตรียมตัวก่อนมาตามนัด'
                  value={form.appointment.note}
                  onChange={(e) => { if (!readOnly) setForm((f) => ({ ...f, appointment: { ...f.appointment, note: e.target.value } })); }}
                  suggestions={REHAB_APPOINTMENT_NOTE_SUGGESTIONS}
                  minChars={3}
                  placeholder='เช่น สวมเสื้อผ้าที่เคลื่อนไหวสะดวก และนำอุปกรณ์ช่วยเดินมาด้วย'
                />
              </>
            )}

            {apptEditing && !readOnly && (
              <>
                {apptSaveError && <ErrorNote>{apptSaveError}</ErrorNote>}
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                  <BrandPrimaryButton size='sm' trailingIcon='check' onClick={onSaveAppointmentEdit}>
                    บันทึกการแก้ไขนัดหมาย
                  </BrandPrimaryButton>
                  <NeutralSubdueButton size='sm' leadingIcon='close' onClick={onDiscardAppointmentEdit}>
                    ยกเลิกการแก้ไข
                  </NeutralSubdueButton>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* สรุปและยืนยัน */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader
          icon='check-circle'
          action={(
            <NeutralSubdueButton size='sm' leadingIcon='print' onClick={onPrintCourseSummary}>
              พิมพ์สรุป Course
            </NeutralSubdueButton>
          )}
        >
          สรุปและยืนยันการบันทึก
        </TopicHeader>

        <div
          className='grid grid-cols-1 md:grid-cols-2'
          style={{ gap: 'var(--dim-space-200)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}
        >
          <span>วินิจฉัย: {form.diagnosisNote || '— ยังไม่ระบุ —'}</span>
          <span>ICD-10: {form.icd10 || '— ยังไม่ระบุ —'}</span>
          <span>
            Barthel: {barthel.complete
              ? `${barthel.total} คะแนน · ${dependency.label}`
              : `ประเมินแล้ว ${barthel.answered}/10 หัวข้อ — ยังไม่ครบ`}
          </span>
          <span>ผลตรวจร่างกาย: ROM {form.romRows.length} · กล้ามเนื้อ {form.muscleRows.length} · Special test {form.specialTestRows.length} รายการ</span>
          <span>โปรแกรมฟื้นฟู: {activityCount} กิจกรรม · หัตถการที่ทำ {activeProcedures} รายการ</span>
          <span>เป้าหมาย: {form.goals.length} ข้อ (บรรลุแล้ว {form.goals.filter((g) => g.achieved).length} ข้อ)</span>
          <span>เอกสารแนบ: {form.attachments.length} ไฟล์</span>
          <span>
            นัดหมาย: {form.appointment.skipped
              ? 'ไม่นัดหมายครั้งถัดไป'
              : form.appointment.date
                ? `${formatRehabDate(form.appointment.date)}${form.appointment.time ? ` · ${form.appointment.time} น.` : ''}${form.appointment.mode === 'telemedicine' ? ' · Telemedicine' : ''}`
                : '— ยังไม่ระบุ —'}
          </span>
        </div>

        {confirmError && <ErrorNote>{confirmError}</ErrorNote>}

        {saveState?.confirmedAt ? (
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <span
              className='inline-flex items-center'
              style={{ gap: 'var(--dim-space-200)', color: 'var(--text-brandPrimary-default, #007549)', fontSize: 'var(--type-size-sm)' }}
            >
              <Icon name='check-circle' size={18} />
              ยืนยันการบันทึกแล้ว · ผู้บันทึก {saveState.by} · {saveState.confirmedAt}
            </span>
            {!readOnly && (
              <NeutralSubdueButton size='sm' leadingIcon='edit' onClick={onReopenRecord}>
                แก้ไขบันทึกการฟื้นฟู
              </NeutralSubdueButton>
            )}
          </div>
        ) : readOnly ? (
          <WarningNote icon='visibility'>สิทธิ์ของคุณดูได้อย่างเดียว — ไม่สามารถบันทึกหรือยืนยันได้</WarningNote>
        ) : (
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <BrandSubdueButton variant='outline' size='lg' leadingIcon='save' onClick={onSaveDraft}>
              บันทึกร่าง (กลับเข้าคิวที่ร่างไว้)
            </BrandSubdueButton>
            <BrandPrimaryButton size='lg' trailingIcon='check' onClick={onConfirm}>
              ยืนยันการบันทึกการฟื้นฟู
            </BrandPrimaryButton>
            {saveState?.draftAt && (
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                บันทึกร่างล่าสุด {saveState.draftAt}
              </span>
            )}
            {saveState?.reopenedAt && (
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                เปิดแก้ไขโดย {saveState.by} · {saveState.reopenedAt} — ยืนยันอีกครั้งเพื่อบันทึกทับรายการเดิม
              </span>
            )}
          </div>
        )}
      </div>
    </StepCard>
  );
};

/** ใช้ในหน้า RehabFormPage เพื่อแปลง key กิจกรรมเป็นชื่อไทยตอนบันทึก. */
export const describeActivities = (programActivities = {}) =>
  Object.keys(programActivities)
    .filter((k) => programActivities[k])
    .map((k) => resolveRehabActivity(k)?.label || k);
