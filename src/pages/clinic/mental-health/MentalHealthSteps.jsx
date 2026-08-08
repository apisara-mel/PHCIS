import React, { useMemo, useRef, useState } from 'react';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import DatePicker from '@/components/forms/DatePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import TabCapsule from '@/components/tab/TabCapsule';
import FileUploadField from '@/components/forms/FileUploadField';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import {
  MH_CURRENT_USER,
  MH_ASSESSORS,
  MH_DOCTORS,
  formatMhDate,
  formatMhDateTime,
  hasMentalHealthRights,
  MH_MSE_CHOICE_FIELDS,
  MH_MSE_TEXT_FIELDS,
  MH_MSE_NOTE_SUGGESTIONS,
  MH_2Q_QUESTIONS,
  interpret2Q,
  MH_9Q_SCALE,
  MH_9Q_QUESTIONS,
  score9Q,
  is9QComplete,
  interpret9Q,
  MH_8Q_QUESTIONS,
  score8Q,
  is8QComplete,
  interpret8Q,
  MH_ST5_SCALE,
  MH_ST5_QUESTIONS,
  scoreSt5,
  isSt5Complete,
  interpretSt5,
  MH_DEMENTIA_QUESTIONS,
  scoreDementia,
  isDementiaComplete,
  interpretDementia,
  MH_PHYSICAL_FIELDS,
  MH_PHYSICAL_NOTE_SUGGESTIONS,
  MH_ICD10_F_CODES,
  MH_DIAGNOSIS_SUGGESTIONS,
  MH_MED_ORDERS,
  MH_THERAPY_OPTIONS,
  MH_COUNSELING_SUGGESTIONS,
  MH_REFERRAL_DESTINATIONS,
  MH_REFERRAL_SUGGESTIONS,
  MH_ILLNESS_HISTORY_SUGGESTIONS,
  MH_FAMILY_HISTORY_SUGGESTIONS,
  MH_BEHAVIOR_SUGGESTIONS,
  MH_UPLOAD_ACCEPT,
  validateMhUpload,
  MH_APPOINTMENT_TYPES,
  getMhVisitRecords,
  resolveMhIssuedAt,
  logMhPrint,
  getMhPrintLog,
} from '@/data/mentalHealthClinic';

/* MentalHealthSteps — step bodies for บันทึกสุขภาพจิต (TOR 1.10.3.3/.4/.5/.7),
   plugged into TreatmentFormShell by MentalHealthFormPage. Same section
   conventions as AncSteps (TopicHeader + flat AssessmentCard + capsule
   jump-tabs); questionnaire matrices reuse AncStep2Screening's
   SelectableTag row pattern (ST-5 + 2Q already render this way there, so
   no new DS component is introduced).

   Hard rule from the legacy manual §2.7: 9Q รวม ≥ 7 → the 8Q suicide
   assessment becomes required + ส่งแพทย์; 2Q ทั้งสองข้อ "ไม่ใช่" → 9Q/8Q
   are auto-skipped with การแปลผล "ปกติ". การแปลผล is always COMPUTED
   (interpret*) — never hand-typed. */

/* ── shared bits (AncSteps conventions) ───────────────────────────── */
const TopicHeader = ({ icon, children }) => (
  <div className='flex items-center gap-2 w-full'>
    <span className='text-brand-500'><Icon name={icon} size={20} /></span>
    <h2 className='text-base font-bold text-brand-500'>{children}</h2>
  </div>
);

const Field = ({ label, required, children, hint, hintTone }) => (
  <div className='flex-1 flex flex-col gap-1.5 min-w-0'>
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
  <section className='flex flex-col' style={{ gap: 'var(--dim-space-600)' }}>{children}</section>
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

/* ข้อมูลลับ (§1.4.2) — assessment/diagnosis content is masked for users
   without the mental-health-clinic right. Screen-local (no shared masked
   primitive exists in the DS yet — flagged via manifest). */
export const ConfidentialMask = ({ what = 'ข้อมูลการประเมินสุขภาพจิต' }) => (
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
      คลินิกสุขภาพจิตเท่านั้น หากต้องการเข้าถึงโปรดติดต่อผู้ดูแลระบบ
    </span>
  </div>
);

/* คำถาม + choice chips row — AncStep2Screening's questionnaire row. */
const ChoiceRow = ({ label, options, value, onSelect, locked }) => (
  <div className='flex items-center justify-between gap-4 w-full flex-wrap'>
    <span className='text-sm' style={{ color: 'var(--text-content-default, #363B3F)', maxWidth: 560 }}>{label}</span>
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

/* คะแนน + การแปลผล + ผู้ประเมิน + วันเวลา — every assessment tool renders
   this same result strip; การแปลผล is computed, never editable. */
const ScoreStrip = ({ complete, score, scoreMax, interp, assessor, assessedAt }) => (
  <div className='flex items-center gap-3 flex-wrap'>
    <ColorfulBadge style={complete ? (interp?.style || 'grey') : 'grey'} size='small' hierarchy='secondary' width='hug' maxWidth={640}>
      {complete
        ? `คะแนน ${score}${scoreMax ? `/${scoreMax}` : ''} — ${interp.label}`
        : 'ยังประเมินไม่ครบทุกข้อ'}
    </ColorfulBadge>
    {complete && assessor && (
      <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
        ผู้ประเมิน {assessor}{assessedAt ? ` · ${formatMhDateTime(assessedAt)}` : ''}
      </span>
    )}
  </div>
);

const WarningBanner = ({ tone = 'danger', icon = 'e911_emergency', children }) => (
  <div
    className='flex items-center gap-2'
    style={{
      paddingTop: 'var(--dim-space-300, 12px)',
      paddingBottom: 'var(--dim-space-300, 12px)',
      paddingLeft: 'var(--dim-space-400, 16px)',
      paddingRight: 'var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      background: tone === 'danger'
        ? 'var(--surface-danger-quaternary, #FFF0F0)'
        : 'var(--surface-warning-quaternary, #FFF9F0)',
      color: tone === 'danger'
        ? 'var(--text-danger-default, #B91C1C)'
        : 'var(--text-warning-default, #C2410C)',
      fontSize: 'var(--type-size-sm)',
      fontWeight: 'var(--type-weight-medium)',
    }}
  >
    <Icon name={icon} size={18} />
    <span>{children}</span>
  </div>
);

/* ── Step 1 — ประวัติการรักษา (TOR 1.10.3.3 + 1.10.3.4) ───────────── */
const STEP1_SECTIONS = [
  { key: 'intake',    label: 'ผลการซักประวัติ' },
  { key: 'illness',   label: 'ประวัติการเจ็บป่วย' },
  { key: 'family',    label: 'ประวัติครอบครัว' },
  { key: 'behavior',  label: 'พฤติกรรมสุขภาพ' },
  { key: 'documents', label: 'เอกสารแนบ' },
  { key: 'visits',    label: 'ประวัติการตรวจ' },
];

export const MhStep1History = ({ form, setForm, mhHn, intake, registration, locked }) => {
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const [activeSection, setActiveSection] = useState('intake');
  const sectionRefs = useRef({});
  const jumpToSection = (key) => {
    setActiveSection(key);
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const visitHistory = useMemo(() => getMhVisitRecords(mhHn), [mhHn]);

  /* เอกสารแนบ (TOR 1.10.3.4) — validated upload list with audit + remove
     confirm. */
  const [uploadError, setUploadError] = useState('');
  const [removeTarget, setRemoveTarget] = useState(null);

  const addDocument = (file) => {
    const err = validateMhUpload(file.name, file.size);
    if (err) {
      setUploadError(err);
      return;
    }
    setUploadError('');
    setForm((f) => ({
      ...f,
      documents: [
        ...(f.documents || []),
        {
          id: `doc-${Date.now()}`,
          name: file.name,
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
          by: MH_CURRENT_USER,
          at: new Date().toISOString(),
        },
      ],
    }));
  };

  const confirmRemove = () => {
    setForm((f) => ({ ...f, documents: (f.documents || []).filter((d) => d.id !== removeTarget.id) }));
    setRemoveTarget(null);
  };

  const vitalsPairs = [
    ['BP', `${intake.vitals.bp} mmHg`],
    ['HR', `${intake.vitals.hr} /นาที`],
    ['Temp', `${intake.vitals.temp} °C`],
    ['RR', `${intake.vitals.rr} /นาที`],
    ['SpO₂', `${intake.vitals.spo2} %`],
    ['น้ำหนัก', `${intake.vitals.weight} กก.`],
    ['ส่วนสูง', `${intake.vitals.height} ซม.`],
  ];

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

      <div className='flex items-center gap-2 flex-wrap'>
        {STEP1_SECTIONS.map((s) => (
          <TabCapsule
            key={s.key}
            variant='filter'
            label={s.label}
            selected={activeSection === s.key}
            onClick={() => jumpToSection(s.key)}
          />
        ))}
      </div>

      {/* ผลการซักประวัติจากจุดคัดกรอง — read-only (TOR 1.10.3.3: Vital
          Signs · Nurse Note · แพ้ยา · โรคประจำตัว). */}
      <AssessmentCard ref={(el) => { sectionRefs.current.intake = el; }}>
        <TopicHeader icon='clipboard'>ผลการซักประวัติจากจุดคัดกรอง (อ่านอย่างเดียว)</TopicHeader>
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
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>Nurse Note</span>
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>{intake.nurseNote}</span>
          </div>
          <div className='flex items-center gap-3 flex-wrap'>
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>แพ้ยา</span>
            {intake.drugAllergies.map((a) => (
              <ColorfulBadge key={a} style={a.startsWith('ไม่มี') ? 'green' : 'red'} size='small' hierarchy='secondary'>{a}</ColorfulBadge>
            ))}
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>โรคประจำตัว</span>
            {intake.chronicDiseases.map((d) => (
              <ColorfulBadge key={d} style={d.startsWith('ไม่มี') ? 'green' : 'orange'} size='small' hierarchy='secondary'>{d}</ColorfulBadge>
            ))}
          </div>
          {registration && (
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              ทะเบียนสุขภาพจิต: {registration.mhNumber} · ออกที่ {resolveMhIssuedAt(registration.issuedAt)} · ลงทะเบียน {formatMhDate(registration.registeredDate)}
            </span>
          )}
        </div>
      </AssessmentCard>

      <AssessmentCard ref={(el) => { sectionRefs.current.illness = el; }}>
        <TopicHeader icon='file-text'>ประวัติการเจ็บป่วยทางจิตเวช</TopicHeader>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={form.illnessHistory}
          onChange={(e) => set('illnessHistory')(e.target.value)}
          suggestions={MH_ILLNESS_HISTORY_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น ไม่เคยมีประวัติการรักษาทางจิตเวชมาก่อน / เคยรักษาโรคซึมเศร้าเมื่อ 2 ปีก่อน'
        />
      </AssessmentCard>

      <AssessmentCard ref={(el) => { sectionRefs.current.family = el; }}>
        <TopicHeader icon='users'>ประวัติครอบครัว (ด้านสุขภาพจิต)</TopicHeader>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={form.familyHistory}
          onChange={(e) => set('familyHistory')(e.target.value)}
          suggestions={MH_FAMILY_HISTORY_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น มารดามีประวัติโรคซึมเศร้า / ไม่มีประวัติโรคทางจิตเวชในครอบครัว'
        />
      </AssessmentCard>

      <AssessmentCard ref={(el) => { sectionRefs.current.behavior = el; }}>
        <TopicHeader icon='activity'>พฤติกรรมสุขภาพ</TopicHeader>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={form.healthBehavior}
          onChange={(e) => set('healthBehavior')(e.target.value)}
          suggestions={MH_BEHAVIOR_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น การสูบบุหรี่ การดื่มสุรา การนอน การออกกำลังกาย'
        />
      </AssessmentCard>

      {/* เอกสารแนบ (TOR 1.10.3.4) — file-type/size validation, audit per
          file (ผู้แนบ + เวลา), remove-with-confirm, empty state. */}
      <AssessmentCard ref={(el) => { sectionRefs.current.documents = el; }}>
        <TopicHeader icon='file'>เอกสารแนบประกอบการตรวจ</TopicHeader>
        {!locked && (
          <FileUploadField
            showLabel={false}
            accept={MH_UPLOAD_ACCEPT}
            buttonLabel='แนบเอกสาร'
            helperText={`รองรับ ${MH_UPLOAD_ACCEPT} ขนาดไม่เกิน 10 MB`}
            onFile={addDocument}
          />
        )}
        {uploadError && (
          <WarningBanner tone='danger' icon='error'>{uploadError}</WarningBanner>
        )}
        {(form.documents || []).length === 0 ? (
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
            ยังไม่มีเอกสารแนบ
          </span>
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
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    {doc.sizeKb} KB · แนบโดย {doc.by} · {formatMhDateTime(doc.at)}
                  </span>
                </div>
                {!locked && (
                  <NeutralSubdueButton size='sm' leadingIcon='delete' onClick={() => setRemoveTarget(doc)}>
                    ลบ
                  </NeutralSubdueButton>
                )}
              </div>
            ))}
          </div>
        )}
      </AssessmentCard>

      {/* ประวัติการตรวจครั้งก่อน (EMR view — TOR 1.10.3.7 แสดง) */}
      <AssessmentCard ref={(el) => { sectionRefs.current.visits = el; }}>
        <TopicHeader icon='history'>ประวัติการตรวจสุขภาพจิตครั้งก่อนหน้า</TopicHeader>
        <Table
          columns={[
            { key: 'savedAt', label: 'วันที่บันทึก', render: (r) => formatMhDateTime(r.savedAt) },
            { key: 'doctor', label: 'แพทย์', render: (r) => r.doctor || '—' },
            {
              key: 'diagnoses', label: 'วินิจฉัย (ICD-10)', flex: true, minWidth: 200,
              render: (r) => (hasMentalHealthRights() ? ((r.diagnoses || []).join(', ') || '—') : '••••••••')},
            {
              key: 'scores', label: 'ผลประเมิน', flex: true, minWidth: 180,
              render: (r) => {
                if (!hasMentalHealthRights()) return '••••••••';
                const parts = [];
                if (is9QComplete(r.q9Answers)) parts.push(`9Q ${score9Q(r.q9Answers)}`);
                if (is8QComplete(r.q8Answers)) parts.push(`8Q ${score8Q(r.q8Answers)}`);
                if (isSt5Complete(r.st5Answers)) parts.push(`ST-5 ${scoreSt5(r.st5Answers)}`);
                return parts.join(' · ') || '—';
              },
            },
            { key: 'savedBy', label: 'ผู้บันทึก', render: (r) => r.savedBy },
          ]}
          rows={visitHistory}
          rowKey={(r) => r.savedAt}
          emptyMessage='ยังไม่มีประวัติการตรวจในระบบ — ครั้งนี้เป็นการบันทึกครั้งแรก'
        />
      </AssessmentCard>
    </StepCard>
  );
};

/* ── Step 2 — คัดกรองและแบบประเมิน (manual §2.6-2.7) ──────────────── */
const STEP2_SECTIONS = [
  { key: 'mse',      label: 'คัดกรองทางจิต (MSE)' },
  { key: 'q2',       label: '2Q' },
  { key: 'q9',       label: '9Q' },
  { key: 'q8',       label: '8Q (ฆ่าตัวตาย)' },
  { key: 'st5',      label: 'ความเครียด (ST-5)' },
  { key: 'dementia', label: 'ภาวะสมองเสื่อม' },
];

const MSE_RESULT_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'abnormal', label: 'Abnormal' },
];

export const MhStep2Assessment = ({ form, setForm, locked }) => {
  const [activeSection, setActiveSection] = useState('mse');
  const sectionRefs = useRef({});
  const jumpToSection = (key) => {
    setActiveSection(key);
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!hasMentalHealthRights()) {
    return (
      <StepCard>
        <ConfidentialMask what='แบบคัดกรองทางจิตและแบบประเมิน (2Q/9Q/8Q/ST-5)' />
      </StepCard>
    );
  }

  const setMseChoice = (key, result) => setForm((f) => ({
    ...f,
    mse: { ...f.mse, [key]: { ...(f.mse[key] || {}), result } },
  }));
  const setMseNote = (key, note) => setForm((f) => ({
    ...f,
    mse: { ...f.mse, [key]: { ...(f.mse[key] || {}), note } },
  }));
  const setMseText = (key, value) => setForm((f) => ({
    ...f,
    mseText: { ...f.mseText, [key]: value },
  }));

  const setAnswer = (group) => (key, value) => setForm((f) => ({
    ...f,
    [group]: { ...f[group], [key]: value },
  }));
  const set2Q = setAnswer('q2Answers');
  const set9Q = setAnswer('q9Answers');
  const set8Q = setAnswer('q8Answers');
  const setSt5 = setAnswer('st5Answers');
  const setDementia = setAnswer('dementiaAnswers');

  const r2 = interpret2Q(form.q2Answers);
  const s9 = score9Q(form.q9Answers);
  const complete9 = is9QComplete(form.q9Answers);
  const i9 = interpret9Q(s9);
  const requires8Q = complete9 && i9.requires8Q;
  const s8 = score8Q(form.q8Answers);
  const complete8 = is8QComplete(form.q8Answers);
  const i8 = interpret8Q(s8);
  const sSt5 = scoreSt5(form.st5Answers);
  const completeSt5 = isSt5Complete(form.st5Answers);
  const sDem = scoreDementia(form.dementiaAnswers);
  const completeDem = isDementiaComplete(form.dementiaAnswers);

  const skip9and8 = r2.negative;

  const stampAssessment = () => setForm((f) => ({ ...f, assessedAt: new Date().toISOString() }));
  const stampMse = () => setForm((f) => ({ ...f, mseAt: new Date().toISOString() }));

  const SECTION_COMPLETE = {
    mse: MH_MSE_CHOICE_FIELDS.every((fld) => form.mse[fld.key]?.result),
    q2: r2.complete,
    q9: skip9and8 || complete9,
    q8: skip9and8 || (requires8Q ? complete8 : true) && (requires8Q ? complete8 : false),
    st5: completeSt5,
    dementia: form.dementiaTaken ? completeDem : false,
  };

  return (
    <StepCard>
      <div className='flex items-center gap-2 flex-wrap'>
        {STEP2_SECTIONS.map((s) => (
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

      {/* บันทึกคัดกรองทางจิต — MSE (manual §2.6) */}
      <AssessmentCard ref={(el) => { sectionRefs.current.mse = el; }}>
        <TopicHeader icon='psychology'>บันทึกคัดกรองทางจิต (Mental Status Examination)</TopicHeader>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          {MH_MSE_CHOICE_FIELDS.map((fld) => (
            <div key={fld.key} className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <ChoiceRow
                label={fld.label}
                options={MSE_RESULT_OPTIONS}
                value={form.mse[fld.key]?.result}
                onSelect={(v) => setMseChoice(fld.key, v)}
                locked={locked}
              />
              {form.mse[fld.key]?.result === 'abnormal' && (
                <SuggestibleTextarea
                  voice
                  disabled={locked}
                  value={form.mse[fld.key]?.note || ''}
                  onChange={(e) => setMseNote(fld.key, e.target.value)}
                  suggestions={MH_MSE_NOTE_SUGGESTIONS}
                  minChars={3}
                  rows={2}
                  minHeight={64}
                  placeholder={fld.notePlaceholder}
                />
              )}
            </div>
          ))}
          <div className='flex items-start gap-4 w-full flex-wrap'>
            {MH_MSE_TEXT_FIELDS.map((fld) => (
              <Field key={fld.key} label={fld.label}>
                <InputField
                  value={form.mseText[fld.key] || ''}
                  onChange={(v) => setMseText(fld.key, v)}
                  disabled={locked}
                  placeholder={fld.placeholder}
                />
              </Field>
            ))}
          </div>
          <div className='flex items-end gap-4 w-full flex-wrap'>
            <Field label='ผู้คัดกรอง' required>
              <Select
                showLabel={false} searchable={false} size='lg'
                value={form.mseAssessor}
                onChange={(v) => setForm((f) => ({ ...f, mseAssessor: v }))}
                options={MH_ASSESSORS.map((a) => ({ value: a, label: a }))}
                placeholder='เลือกผู้คัดกรอง'
              />
            </Field>
            <Field label='วันเวลาที่คัดกรอง' required hint={form.mseAt ? formatMhDateTime(form.mseAt) : 'ยังไม่ได้บันทึกเวลา'}>
              <BrandSubdueButton variant='outline' size='lg' leadingIcon='schedule' onClick={() => { if (!locked) stampMse(); }}>
                บันทึกเวลาปัจจุบัน
              </BrandSubdueButton>
            </Field>
          </div>
        </div>
      </AssessmentCard>

      {/* 2Q — gate ของ 9Q/8Q (manual §2.7) */}
      <AssessmentCard ref={(el) => { sectionRefs.current.q2 = el; }}>
        <TopicHeader icon='meh'>แบบประเมินโรคซึมเศร้า 2 คำถาม (2Q)</TopicHeader>
        <div className='flex flex-col gap-3'>
          {MH_2Q_QUESTIONS.map((q) => (
            <ChoiceRow
              key={q.key}
              label={q.label}
              options={[{ value: true, label: 'ใช่' }, { value: false, label: 'ไม่ใช่' }]}
              value={form.q2Answers[q.key]}
              onSelect={(v) => set2Q(q.key, v)}
              locked={locked}
            />
          ))}
        </div>
        <ScoreStrip
          complete={r2.complete}
          score={Object.values(form.q2Answers || {}).filter((v) => v === true).length}
          scoreMax={2}
          interp={{ label: r2.label, style: r2.style }}
          assessor={form.assessor}
          assessedAt={form.assessedAt}
        />
      </AssessmentCard>

      {/* 9Q — เฉพาะเมื่อ 2Q ผลบวก */}
      <AssessmentCard ref={(el) => { sectionRefs.current.q9 = el; }}>
        <TopicHeader icon='clipboard-list'>แบบประเมินโรคซึมเศร้า 9 คำถาม (9Q)</TopicHeader>
        {skip9and8 ? (
          <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug' maxWidth={640}>
            2Q ปกติทั้งสองข้อ — ระบบข้ามการประเมิน 9Q ให้อัตโนมัติ (การแปลผล: ปกติ)
          </ColorfulBadge>
        ) : !r2.complete ? (
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
            ประเมิน 2Q ให้ครบก่อน — 9Q จะเปิดเมื่อ 2Q มีผลบวก
          </span>
        ) : (
          <>
            <div className='flex flex-col gap-3'>
              {MH_9Q_QUESTIONS.map((q) => (
                <ChoiceRow
                  key={q.key}
                  label={q.label}
                  options={MH_9Q_SCALE}
                  value={form.q9Answers[q.key]}
                  onSelect={(v) => set9Q(q.key, v)}
                  locked={locked}
                />
              ))}
            </div>
            <ScoreStrip
              complete={complete9}
              score={s9}
              scoreMax={27}
              interp={i9}
              assessor={form.assessor}
              assessedAt={form.assessedAt}
            />
            {requires8Q && (
              <WarningBanner tone='danger'>
                9Q รวม {s9} คะแนน (≥ 7) — ต้องประเมินการฆ่าตัวตายด้วย 8Q และส่งพบแพทย์ (กฎบังคับตามคู่มือ §2.7)
              </WarningBanner>
            )}
          </>
        )}
      </AssessmentCard>

      {/* 8Q — บังคับเมื่อ 9Q ≥ 7 */}
      <AssessmentCard ref={(el) => { sectionRefs.current.q8 = el; }}>
        <TopicHeader icon='e911_emergency'>แบบประเมินการฆ่าตัวตาย 8 คำถาม (8Q)</TopicHeader>
        {skip9and8 ? (
          <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug' maxWidth={640}>
            2Q ปกติทั้งสองข้อ — ระบบข้ามการประเมิน 8Q ให้อัตโนมัติ (การแปลผล: ปกติ)
          </ColorfulBadge>
        ) : !requires8Q ? (
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
            8Q จะบังคับประเมินเมื่อคะแนน 9Q รวม ≥ 7
          </span>
        ) : (
          <>
            <div className='flex flex-col gap-3'>
              {MH_8Q_QUESTIONS.map((q) => (
                <ChoiceRow
                  key={q.key}
                  label={`${q.label} (${q.period})`}
                  options={[{ value: true, label: `มี (${q.yesScore})` }, { value: false, label: 'ไม่มี (0)' }]}
                  value={form.q8Answers[q.key]}
                  onSelect={(v) => set8Q(q.key, v)}
                  locked={locked}
                />
              ))}
            </div>
            <ScoreStrip
              complete={complete8}
              score={s8}
              interp={i8}
              assessor={form.assessor}
              assessedAt={form.assessedAt}
            />
            {complete8 && s8 > 0 && (
              <WarningBanner tone='danger'>
                พบแนวโน้มการฆ่าตัวตาย ({i8.label}) — ต้องส่งพบแพทย์และวางแผนเฝ้าระวังใกล้ชิด
              </WarningBanner>
            )}
          </>
        )}
      </AssessmentCard>

      {/* ST-5 */}
      <AssessmentCard ref={(el) => { sectionRefs.current.st5 = el; }}>
        <TopicHeader icon='activity'>แบบประเมินความเครียด (ST-5)</TopicHeader>
        <div className='flex flex-col gap-3'>
          {MH_ST5_QUESTIONS.map((q) => (
            <ChoiceRow
              key={q.key}
              label={q.label}
              options={MH_ST5_SCALE}
              value={form.st5Answers[q.key]}
              onSelect={(v) => setSt5(q.key, v)}
              locked={locked}
            />
          ))}
        </div>
        <ScoreStrip
          complete={completeSt5}
          score={sSt5}
          scoreMax={15}
          interp={interpretSt5(sSt5)}
          assessor={form.assessor}
          assessedAt={form.assessedAt}
        />
      </AssessmentCard>

      {/* ภาวะสมองเสื่อม — ทำเมื่อสงสัย (ผู้สูงอายุ/หลงลืม) */}
      <AssessmentCard ref={(el) => { sectionRefs.current.dementia = el; }}>
        <TopicHeader icon='neurology'>แบบคัดกรองภาวะสมองเสื่อม (AMT)</TopicHeader>
        <SelectableTag
          label='ทำแบบคัดกรองภาวะสมองเสื่อมในการตรวจครั้งนี้'
          size='lg'
          selected={form.dementiaTaken}
          onClick={() => { if (!locked) setForm((f) => ({ ...f, dementiaTaken: !f.dementiaTaken })); }}
        />
        {form.dementiaTaken && (
          <>
            <div className='flex flex-col gap-3'>
              {MH_DEMENTIA_QUESTIONS.map((q) => (
                <ChoiceRow
                  key={q.key}
                  label={q.label}
                  options={[{ value: true, label: 'ตอบถูก (1)' }, { value: false, label: 'ตอบผิด (0)' }]}
                  value={form.dementiaAnswers[q.key]}
                  onSelect={(v) => setDementia(q.key, v)}
                  locked={locked}
                />
              ))}
            </div>
            <ScoreStrip
              complete={completeDem}
              score={sDem}
              scoreMax={10}
              interp={interpretDementia(sDem)}
              assessor={form.assessor}
              assessedAt={form.assessedAt}
            />
          </>
        )}
      </AssessmentCard>

      {/* ผู้ประเมิน + เวลา — audit ของชุดแบบประเมิน (playbook §5) */}
      <AssessmentCard>
        <TopicHeader icon='badge'>ผู้ประเมินและเวลาที่ประเมิน</TopicHeader>
        <div className='flex items-end gap-4 w-full flex-wrap'>
          <Field label='ผู้ประเมิน' required>
            <Select
              showLabel={false} searchable={false} size='lg'
              value={form.assessor}
              onChange={(v) => setForm((f) => ({ ...f, assessor: v }))}
              options={MH_ASSESSORS.map((a) => ({ value: a, label: a }))}
              placeholder='เลือกผู้ประเมิน'
            />
          </Field>
          <Field label='วันเวลาที่ประเมิน' required hint={form.assessedAt ? formatMhDateTime(form.assessedAt) : 'ยังไม่ได้บันทึกเวลา'}>
            <BrandSubdueButton variant='outline' size='lg' leadingIcon='schedule' onClick={() => { if (!locked) stampAssessment(); }}>
              บันทึกเวลาปัจจุบัน
            </BrandSubdueButton>
          </Field>
        </div>
      </AssessmentCard>
    </StepCard>
  );
};

/* ── Step 3 — ตรวจร่างกาย (manual §2.5) ───────────────────────────── */
export const MhStep3Physical = ({ form, setForm, locked }) => {
  const setPhysical = (key) => (value) => setForm((f) => ({ ...f, physical: { ...f.physical, [key]: value } }));

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='stethoscope'>ตรวจร่างกาย</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          {MH_PHYSICAL_FIELDS.map((fld) => (
            <Field key={fld.key} label={fld.label}>
              <InputField
                value={form.physical[fld.key] || ''}
                onChange={setPhysical(fld.key)}
                disabled={locked}
                placeholder={fld.placeholder}
              />
            </Field>
          ))}
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard-list'>ผลการตรวจร่างกาย (Result)</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          <SelectableTag
            label='Normal — ปกติ'
            size='lg'
            selected={form.physicalResult === 'normal'}
            onClick={() => { if (!locked) setForm((f) => ({ ...f, physicalResult: 'normal' })); }}
          />
          <SelectableTag
            label='Abnormal — ผิดปกติ (ระบุ)'
            size='lg'
            selected={form.physicalResult === 'abnormal'}
            onClick={() => { if (!locked) setForm((f) => ({ ...f, physicalResult: 'abnormal' })); }}
          />
        </div>
        {form.physicalResult === 'abnormal' && (
          <SuggestibleTextarea
            voice
            disabled={locked}
            value={form.physicalNote}
            onChange={(e) => setForm((f) => ({ ...f, physicalNote: e.target.value }))}
            suggestions={MH_PHYSICAL_NOTE_SUGGESTIONS}
            minChars={3}
            placeholder='ระบุสิ่งที่ตรวจพบผิดปกติ เช่น พบรอยแผลเก่าบริเวณข้อมือซ้าย'
          />
        )}
      </div>
    </StepCard>
  );
};

/* ── Step 4 — วินิจฉัย (ICD-10 F-codes) ───────────────────────────── */
export const MhStep4Diagnosis = ({ form, setForm, locked }) => {
  if (!hasMentalHealthRights()) {
    return (
      <StepCard>
        <ConfidentialMask what='ผลวินิจฉัยโรคทางจิตเวช' />
      </StepCard>
    );
  }

  const toggleDiagnosis = (code) => {
    if (locked) return;
    setForm((f) => ({
      ...f,
      diagnoses: f.diagnoses.includes(code)
        ? f.diagnoses.filter((c) => c !== code)
        : [...f.diagnoses, code],
    }));
  };

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard-list'>วินิจฉัย (ICD-10 หมวด F)</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {MH_ICD10_F_CODES.map((d) => (
            <SelectableTag
              key={d.code}
              label={d.label}
              size='lg'
              selected={form.diagnoses.includes(d.code)}
              onClick={() => toggleDiagnosis(d.code)}
            />
          ))}
        </div>
        {form.diagnoses.length > 0 && (
          <ColorfulBadge style='teal' size='small' hierarchy='secondary' width='hug' maxWidth={640}>
            เลือกแล้ว {form.diagnoses.length} รหัส: {form.diagnoses.join(', ')}
          </ColorfulBadge>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='file-text'>บันทึกวินิจฉัย</TopicHeader>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={form.diagnosisNote}
          onChange={(e) => setForm((f) => ({ ...f, diagnosisNote: e.target.value }))}
          suggestions={MH_DIAGNOSIS_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น ภาวะซึมเศร้าระดับปานกลาง ตอบสนองต่อยาดี'
        />
      </div>
    </StepCard>
  );
};

/* ── Step 5 — สั่งการรักษา + บำบัด (manual §2.8) + ส่งต่อ (§2.11) ─── */
export const MhStep5Orders = ({ form, setForm, locked }) => {
  const toggle = (group) => (key) => {
    if (locked) return;
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: !f[group][key] } }));
  };
  const toggleMed = toggle('medOrders');
  const toggleTherapy = toggle('therapies');

  const s9 = score9Q(form.q9Answers);
  const complete9 = is9QComplete(form.q9Answers);
  const s8 = score8Q(form.q8Answers);
  const referAdvised = (complete9 && interpret9Q(s9).referDoctor) || s8 > 0;

  return (
    <StepCard>
      {referAdvised && (
        <WarningBanner tone='danger'>
          ผลประเมิน 9Q/8Q เข้าเกณฑ์ต้องส่งแพทย์ — ตรวจสอบการสั่งการรักษาและพิจารณาส่งต่อสุขภาพจิต
        </WarningBanner>
      )}

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='badge'>แพทย์ผู้สั่งการรักษา</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='แพทย์' required>
            <Select
              showLabel={false} searchable={false} size='lg'
              value={form.doctor}
              onChange={(v) => setForm((f) => ({ ...f, doctor: v }))}
              options={MH_DOCTORS.map((d) => ({ value: d, label: d }))}
              placeholder='เลือกแพทย์ผู้สั่งการรักษา'
            />
          </Field>
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='pill'>สั่งยา (CPOE)</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {MH_MED_ORDERS.map((m) => (
            <SelectableTag
              key={m.key}
              label={m.label}
              size='lg'
              selected={!!form.medOrders[m.key]}
              onClick={() => toggleMed(m.key)}
            />
          ))}
        </div>
        {form.medOrders.lithium && (
          <ColorfulBadge style='yellow' size='small' hierarchy='secondary' width='hug' maxWidth={640}>
            สั่ง Lithium — ต้องติดตามระดับยาในเลือด (ดูผล Lab ในหน้าติดตามผลการดูแล)
          </ColorfulBadge>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='psychology'>การบำบัดทางจิตและส่งเสริมสุขภาพ</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {MH_THERAPY_OPTIONS.map((t) => (
            <SelectableTag
              key={t.key}
              label={t.label}
              size='lg'
              selected={!!form.therapies[t.key]}
              onClick={() => toggleTherapy(t.key)}
            />
          ))}
        </div>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={form.counselingNote}
          onChange={(e) => setForm((f) => ({ ...f, counselingNote: e.target.value }))}
          suggestions={MH_COUNSELING_SUGGESTIONS}
          minChars={3}
          placeholder='รายละเอียดการให้คำปรึกษา / การดูแลรักษาทางจิตวิทยา'
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='send'>ส่งต่อสุขภาพจิต</TopicHeader>
        <SelectableTag
          label='ส่งต่อผู้รับบริการไปหน่วยงานเฉพาะทาง'
          size='lg'
          selected={form.referralEnabled}
          onClick={() => { if (!locked) setForm((f) => ({ ...f, referralEnabled: !f.referralEnabled })); }}
        />
        {form.referralEnabled && (
          <>
            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field label='ส่งต่อไปยัง' required>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  value={form.referralDestination}
                  onChange={(v) => setForm((f) => ({ ...f, referralDestination: v }))}
                  options={MH_REFERRAL_DESTINATIONS}
                  placeholder='เลือกหน่วยงานปลายทาง'
                />
              </Field>
            </div>
            <SuggestibleTextarea
              voice
              disabled={locked}
              value={form.referralReason}
              onChange={(e) => setForm((f) => ({ ...f, referralReason: e.target.value }))}
              suggestions={MH_REFERRAL_SUGGESTIONS}
              minChars={3}
              placeholder='เหตุผลการส่งต่อ เช่น ผล 8Q ระดับสูง ต้องเฝ้าระวังการฆ่าตัวตาย'
            />
          </>
        )}
      </div>
    </StepCard>
  );
};

/* ── Step 6 — นัดหมาย (TOR 1.10.3.5) ──────────────────────────────── */
const APPOINTMENT_TIMES = ['09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'];

export const MhStep6Appointment = ({ form, setForm, locked }) => {
  const setAppt = (key) => (value) => {
    if (locked) return;
    setForm((f) => ({ ...f, appointment: { ...f.appointment, [key]: value } }));
  };

  const appt = form.appointment;
  const todayStr = new Date().toISOString().slice(0, 10);
  const dateInPast = !!appt.date && appt.date < todayStr;
  const booked = !!appt.date && !appt.cancelled;

  const cancelAppointment = () => {
    if (locked) return;
    setForm((f) => ({ ...f, appointment: { ...f.appointment, cancelled: true } }));
  };
  const rebook = () => {
    if (locked) return;
    setForm((f) => ({ ...f, appointment: { date: '', time: '', type: '', note: '', cancelled: false } }));
  };

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='calendar'>นัดหมายครั้งถัดไป</TopicHeader>

        {appt.cancelled && (
          <div className='flex items-center gap-3 flex-wrap'>
            <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกนัดหมายแล้ว</ColorfulBadge>
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='event_repeat' onClick={rebook}>
              นัดหมายใหม่
            </BrandSubdueButton>
          </div>
        )}

        {!appt.cancelled && (
          <>
            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field label='ประเภทนัดหมาย' required>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  value={appt.type}
                  onChange={setAppt('type')}
                  options={MH_APPOINTMENT_TYPES}
                  placeholder='เลือกประเภทนัดหมาย'
                />
              </Field>
              <Field
                label='วันนัดหมาย'
                required
                hint={dateInPast ? 'วันที่นัดต้องไม่เป็นวันในอดีต' : undefined}
                hintTone={dateInPast ? 'error' : undefined}
              >
                <DatePicker
                  value={appt.date ? new Date(appt.date) : null}
                  onChange={(d) => setAppt('date')(d ? d.toISOString().slice(0, 10) : '')}
                  placeholder='เลือกวันที่'
                  showLabel={false}
                />
              </Field>
              <Field label='เวลานัด'>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  value={appt.time}
                  onChange={setAppt('time')}
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
                'นัดติดตามอาการหลังปรับยา 1 เดือน',
                'นัดประเมิน 9Q ซ้ำก่อนพบแพทย์',
                'นัดจิตบำบัดรายบุคคลครั้งถัดไป',
                'งดน้ำงดอาหารก่อนเจาะเลือดติดตามระดับยา',
              ]}
              minChars={3}
              rows={2}
              minHeight={64}
              placeholder='หมายเหตุการนัดหมาย'
            />

            {/* Telemedicine consult entry (TOR 1.10.3.7 telemed clause) —
                same start/end session pattern as AncStep6Appointment. */}
            {appt.type === 'telemed' && (
              <div className='flex items-center gap-3 flex-wrap'>
                {appt.telemedStatus === 'completed' ? (
                  <ColorfulBadge style='green' size='small' hierarchy='secondary'>ปรึกษาผ่าน Telemedicine เสร็จสิ้นแล้ว</ColorfulBadge>
                ) : appt.telemedStatus === 'started' ? (
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
                  นัดแล้ว: {formatMhDate(appt.date)}{appt.time ? ` เวลา ${appt.time} น.` : ''}
                  {appt.type ? ` · ${MH_APPOINTMENT_TYPES.find((t) => t.value === appt.type)?.label || ''}` : ''}
                </span>
                <div className='flex-1' />
                <NeutralSubdueButton size='sm' leadingIcon='event_busy' onClick={cancelAppointment}>
                  ยกเลิกนัด
                </NeutralSubdueButton>
              </div>
            )}
          </>
        )}
      </div>
    </StepCard>
  );
};

/* ── Step 7 — สรุปและพิมพ์เอกสาร ──────────────────────────────────── */
export const MhStep7Summary = ({ form, mhHn, cardPatient, onConfirmSave, saved, locked }) => {
  const [printTick, setPrintTick] = useState(0);
  const canRead = hasMentalHealthRights();

  const r2 = interpret2Q(form.q2Answers);
  const s9 = score9Q(form.q9Answers);
  const complete9 = is9QComplete(form.q9Answers);
  const i9 = interpret9Q(s9);
  const s8 = score8Q(form.q8Answers);
  const complete8 = is8QComplete(form.q8Answers);
  const sSt5 = scoreSt5(form.st5Answers);
  const completeSt5 = isSt5Complete(form.st5Answers);
  const sDem = scoreDementia(form.dementiaAnswers);
  const completeDem = isDementiaComplete(form.dementiaAnswers);

  /* Validation (manual required fields) — surfaced here where the commit
     action lives; save is blocked while any error remains. */
  const validationErrors = useMemo(() => {
    const errs = [];
    if (!form.doctor) errs.push('ยังไม่ได้เลือกแพทย์ผู้สั่งการรักษา (ขั้นตอนที่ 5)');
    const mseTouched = Object.keys(form.mse || {}).length > 0 || Object.values(form.mseText || {}).some(Boolean);
    if (mseTouched && !form.mseAssessor) errs.push('บันทึกคัดกรองทางจิตแล้ว แต่ยังไม่ได้ระบุผู้คัดกรอง (ขั้นตอนที่ 2)');
    if (mseTouched && !form.mseAt) errs.push('บันทึกคัดกรองทางจิตแล้ว แต่ยังไม่ได้บันทึกวันเวลาที่คัดกรอง (ขั้นตอนที่ 2)');
    const anyAssessment = r2.complete || complete9 || complete8 || completeSt5 || (form.dementiaTaken && completeDem);
    if (anyAssessment && !form.assessor) errs.push('ทำแบบประเมินแล้ว แต่ยังไม่ได้ระบุผู้ประเมิน (ขั้นตอนที่ 2)');
    if (anyAssessment && !form.assessedAt) errs.push('ทำแบบประเมินแล้ว แต่ยังไม่ได้บันทึกวันเวลาที่ประเมิน (ขั้นตอนที่ 2)');
    if (complete9 && i9.requires8Q && !complete8) errs.push('9Q ≥ 7 คะแนน — ต้องประเมิน 8Q ให้ครบก่อนบันทึก (กฎบังคับ §2.7)');
    if (form.appointment.date && !form.appointment.cancelled) {
      const todayStr = new Date().toISOString().slice(0, 10);
      if (form.appointment.date < todayStr) errs.push('วันนัดหมายเป็นวันในอดีต — แก้ไขในขั้นตอนที่ 6');
    }
    if (form.referralEnabled && !form.referralDestination) errs.push('เปิดการส่งต่อแล้ว แต่ยังไม่ได้เลือกหน่วยงานปลายทาง (ขั้นตอนที่ 5)');
    return errs;
  }, [form, r2.complete, complete9, complete8, completeSt5, completeDem, i9.requires8Q]);

  const printLog = useMemo(() => getMhPrintLog(mhHn), [mhHn, printTick]);

  const doPrint = (docType) => {
    logMhPrint(mhHn, docType);
    setPrintTick((t) => t + 1);
  };

  const orderedMeds = MH_MED_ORDERS.filter((m) => form.medOrders[m.key]).map((m) => m.label);
  const chosenTherapies = MH_THERAPY_OPTIONS.filter((t) => form.therapies[t.key]).map((t) => t.label);

  const SummaryRow = ({ label, children }) => (
    <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      <span style={{ width: 180, flexShrink: 0, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>{label}</span>
      <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>{children}</span>
    </div>
  );

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

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='summarize'>สรุปการตรวจสุขภาพจิต</TopicHeader>
        <div
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-300, 12px)',
            paddingTop: 'var(--dim-space-600, 24px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
            paddingLeft: 'var(--dim-space-600, 24px)',
            paddingRight: 'var(--dim-space-600, 24px)',
            borderRadius: 'var(--dim-radius-400, 12px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            background: 'var(--surface-card-100, #FFFFFF)',
          }}
        >
          <div className='flex items-center justify-between flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span style={{ fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-brandPrimary-default, #007549)' }}>
              ใบสรุปการตรวจ — คลินิกสุขภาพจิต
            </span>
            <ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ §1.4.2</ColorfulBadge>
          </div>
          <SummaryRow label='ผู้รับบริการ'>{cardPatient?.fullName || '—'} · HN {mhHn}</SummaryRow>
          <SummaryRow label='แพทย์'>{form.doctor || '—'}</SummaryRow>
          <SummaryRow label='ผลประเมิน'>
            {canRead ? (
              [
                r2.complete ? `2Q: ${r2.negative ? 'ปกติ' : 'ผลบวก'}` : null,
                complete9 ? `9Q: ${s9} (${i9.label})` : (r2.negative ? '9Q: ข้าม (ปกติ)' : null),
                complete8 ? `8Q: ${s8} (${interpret8Q(s8).label})` : (r2.negative ? '8Q: ข้าม (ปกติ)' : null),
                completeSt5 ? `ST-5: ${sSt5} (${interpretSt5(sSt5).label})` : null,
                form.dementiaTaken && completeDem ? `สมองเสื่อม: ${sDem}/10 (${interpretDementia(sDem).label})` : null,
              ].filter(Boolean).join(' · ') || 'ยังไม่มีการประเมิน'
            ) : '•••••••• (สิทธิไม่เพียงพอ)'}
          </SummaryRow>
          <SummaryRow label='ผู้ประเมิน'>
            {form.assessor ? `${form.assessor}${form.assessedAt ? ` · ${formatMhDateTime(form.assessedAt)}` : ''}` : '—'}
          </SummaryRow>
          <SummaryRow label='วินิจฉัย'>
            {canRead ? (form.diagnoses.join(', ') || '—') : '•••••••• (สิทธิไม่เพียงพอ)'}
          </SummaryRow>
          <SummaryRow label='สั่งยา'>{orderedMeds.join(' · ') || '—'}</SummaryRow>
          <SummaryRow label='การบำบัด'>{chosenTherapies.join(' · ') || '—'}</SummaryRow>
          <SummaryRow label='ส่งต่อ'>
            {form.referralEnabled
              ? `${MH_REFERRAL_DESTINATIONS.find((d) => d.value === form.referralDestination)?.label || 'ยังไม่เลือกปลายทาง'}${form.referralReason ? ` — ${form.referralReason}` : ''}`
              : 'ไม่มีการส่งต่อ'}
          </SummaryRow>
          <SummaryRow label='นัดหมาย'>
            {form.appointment.cancelled
              ? 'ยกเลิกนัดหมาย'
              : form.appointment.date
                ? `${formatMhDate(form.appointment.date)}${form.appointment.time ? ` เวลา ${form.appointment.time} น.` : ''}`
                : 'ไม่มีนัดหมาย'}
          </SummaryRow>
          <SummaryRow label='เอกสารแนบ'>{(form.documents || []).length > 0 ? `${form.documents.length} ไฟล์` : 'ไม่มี'}</SummaryRow>
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='print'>พิมพ์เอกสาร</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          <BrandSubdueButton variant='outline' leadingIcon='print' onClick={() => doPrint('ใบสรุปการตรวจ')}>
            พิมพ์ใบสรุปการตรวจ
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' leadingIcon='print' onClick={() => doPrint('ใบรับรองแพทย์')}>
            พิมพ์ใบรับรองแพทย์
          </BrandSubdueButton>
        </div>
        {printLog.length > 0 && (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            {printLog.map((e, i) => (
              <span key={`${e.at}-${i}`} style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                พิมพ์{e.docType} โดย {e.by} · {formatMhDateTime(e.at)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='check-circle'>ยืนยันการบันทึก</TopicHeader>
        {saved ? (
          <div className='flex items-center gap-2' style={{ color: 'var(--text-brandPrimary-default, #007549)', fontSize: 'var(--type-size-sm)' }}>
            <Icon name='check-circle' size={18} />
            บันทึกการตรวจเรียบร้อยแล้ว · ผู้บันทึก {MH_CURRENT_USER} — กด "จบการบันทึก" ด้านล่างเพื่อกลับหน้าคิว
          </div>
        ) : (
          <BrandSubdueButton
            variant='fill'
            size='lg'
            leadingIcon='save'
            disabled={validationErrors.length > 0 || locked}
            onClick={() => { if (validationErrors.length === 0 && !locked) onConfirmSave(); }}
          >
            ยืนยันบันทึกการตรวจสุขภาพจิต
          </BrandSubdueButton>
        )}
      </div>
    </StepCard>
  );
};
