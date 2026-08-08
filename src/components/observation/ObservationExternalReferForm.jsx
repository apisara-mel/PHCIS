import React, { useState } from 'react';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import DatePicker from '@/components/forms/DatePicker';
import TimePicker from '@/components/forms/TimePicker';
import VoiceTextarea from '@/components/forms/VoiceTextarea';
import CheckboxButton from '@/components/checkbox/CheckboxButton';
import RadioButton from '@/components/radio/RadioButton';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import Icd10SearchPopup from '@/components/popup/Icd10SearchPopup';
import { DISEASE_OPTIONS } from '@/components/forms/DiseaseForm';
import {
  REFER_FACILITIES,
  facilityMeta,
} from '@/data/treatmentRefer';
import {
  CLINIC_OPTIONS,
  DEFAULT_CLINIC_VALUE,
} from '@/components/layout/HeaderClinicContext';
import { OBSERVATION_ESI_LEVELS } from '@/data/observationMock';
import { USERS } from '@/data/usersAccess';
import { STAFF_AVATARS } from '@/data/avatarAssets';

const facilityOptions = REFER_FACILITIES.map((f) => ({ value: f.value, label: f.label }));

/** Same catalog as Screening Step 4 / DiseaseForm — skip empty sentinel. */
const UNDERLYING_DISEASE_OPTIONS = DISEASE_OPTIONS.filter((o) => o.value);

const ESI_BADGE_BY_LEVEL = { 1: 'red', 2: 'orange', 3: 'yellow', 4: 'blue', 5: 'grey' };

const ESI_OPTIONS = OBSERVATION_ESI_LEVELS.map((e) => ({
  value: String(e.lv),
  label: `ESI ${e.lv} — ${e.th}`,
  colorfulBadgeStyle: ESI_BADGE_BY_LEVEL[e.lv] || 'grey',
}));

/** Resolve nurse/staff portrait for read-only ผู้แจ้งผล. */
function resolveReporterAvatar(name = '', fallback = '') {
  if (fallback) return fallback;
  const hit = USERS.find((u) => u.name === name);
  if (hit?.avatarUrl) return hit.avatarUrl;
  if (!name || !STAFF_AVATARS?.length) return '';
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return STAFF_AVATARS[hash % STAFF_AVATARS.length];
}

const REFER_REASON_OPTIONS = [
  { value: 'rights', label: 'ตามสิทธิ' },
  { value: 'capacity', label: 'เกินศักยภาพ' },
  { value: 'relative', label: 'ญาติมีความต้องการ' },
  { value: 'other', label: 'อื่นๆ' },
];

const LEVEL_OPTIONS = ['U', 'H', 'M', 'L', 'N'];

/** Gap between fields inside a group (row + column). */
const FIELD_GAP = 'var(--dim-space-400, 16px)';
/** Gap between option cards (radio / checkbox) — tighter than field rows. */
const OPTION_GAP = 'var(--dim-space-300, 12px)';
/** Gap between titled groups — larger than FIELD_GAP so groups read as separate. */
const GROUP_GAP = 'var(--dim-space-800, 32px)';
/** Gap between group title and its fields. */
const SECTION_GAP = 'var(--dim-space-300, 12px)';

const sectionTitleStyle = {
  margin: 0,
  color: 'var(--text-brandPrimary-default, #007549)',
  fontSize: 'var(--type-size-title, var(--type-size-base, 16px))',
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
  lineHeight: 1.5,
};

const fieldLabelStyle = {
  color: 'var(--text-content-secondary)',
  fontSize: 'var(--type-size-xs)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.4,
};

/** Section block with title + consistent internal gap.
 *  `tone="brandSoft"` → light green panel (read-only patient summary). */
const FormSection = ({ title, children, tone }) => (
  <section
    className='flex flex-col w-full min-w-0'
    style={{
      gap: SECTION_GAP,
      ...(tone === 'brandSoft'
        ? {
            background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
            borderRadius: 'var(--dim-radius-200, 8px)',
            padding: 'var(--dim-space-400, 16px)',
          }
        : {}),
    }}
  >
    {title ? <h3 style={sectionTitleStyle}>{title}</h3> : null}
    <div className='flex flex-col w-full min-w-0' style={{ gap: FIELD_GAP }}>
      {children}
    </div>
  </section>
);

/** Labeled sub-group inside a section (LEVEL, V/S, สาเหตุ…). */
const FieldGroup = ({ label, children, align = 'stretch', gap = FIELD_GAP }) => (
  <div
    className='flex flex-col w-full min-w-0'
    style={{ gap: 'var(--dim-space-100, 4px)' }}
  >
    {label ? <div style={fieldLabelStyle}>{label}</div> : null}
    <div
      className='flex flex-wrap w-full min-w-0'
      style={{
        gap,
        alignItems: align,
      }}
    >
      {children}
    </div>
  </div>
);

/** Equal 4-column row — every input row in ส่งต่อภายนอก uses this. */
const COLS_4 = 'repeat(4, minmax(0, 1fr))';

const FieldRow = ({ children, template = COLS_4 }) => (
  <div
    className='grid w-full min-w-0'
    style={{
      gap: FIELD_GAP,
      gridTemplateColumns: template,
      alignItems: 'start',
    }}
  >
    {children}
  </div>
);

/** Span N equal columns inside a FieldRow (default full width = 4). */
const FieldSpan = ({ cols = 4, children }) => (
  <div className='min-w-0' style={{ gridColumn: `span ${cols}` }}>
    {children}
  </div>
);

/** Read-only label + value (no input chrome) — used for auto-filled patient info. */
const TextValue = ({ label, value }) => (
  <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
    <span style={fieldLabelStyle}>{label}</span>
    <span
      style={{
        color: value ? 'var(--text-content-default)' : 'var(--text-content-tertiary)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
        lineHeight: 1.5,
        wordBreak: 'break-word',
      }}
    >
      {value || '—'}
    </span>
  </div>
);

const OBSERVATION_UNIT_NAME = 'ห้องสังเกตอาการ (Observation Unit)';
const OBSERVATION_UNIT_PHONE = '02-354-7991';

/** Header chip uses short "ศูนย์ N …" — paper refer form wants full ศูนย์บริการ name. */
function resolveServiceCenterName(centerId) {
  const opt = CLINIC_OPTIONS.find((c) => c.value === (centerId || DEFAULT_CLINIC_VALUE));
  const short = opt?.label || '';
  if (!short) return 'ศูนย์บริการสาธารณสุข';
  if (short.startsWith('ศูนย์บริการสาธารณสุข')) return short;
  if (short.startsWith('ศูนย์ ')) return short.replace(/^ศูนย์ /, 'ศูนย์บริการสาธารณสุข ');
  return short;
}

function formatObservationUnit(centerId) {
  return `${resolveServiceCenterName(centerId)} · ${OBSERVATION_UNIT_NAME}`;
}

const SectionDivider = () => (
  <hr
    style={{
      width: '100%',
      height: 0,
      border: 0,
      borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
      margin: 0,
    }}
  />
);

const blankVitals = () => ({
  temp: '',
  pulse: '',
  rr: '',
  bpSys: '',
  bpDia: '',
  spo2: '',
});

const blankNeuro = () => ({
  gcsE: '',
  gcsV: '',
  gcsM: '',
  pupilRt: '',
  pupilLt: '',
  motorPower: '',
});

/** Pre-fill แบบส่งต่อภายนอก จากข้อมูลผู้ป่วยใน Observation record */
export function buildObservationExternalReferDraft(patient = {}, { centerId } = {}) {
  const latest = patient.vitalsTrend?.[patient.vitalsTrend.length - 1];
  const ordersLine = (patient.statOrders || [])
    .filter((o) => o.status !== 'cancelled')
    .map((o) => o.orderText)
    .join('; ');

  return {
    unit: formatObservationUnit(centerId || patient.centerId),
    unitPhone: patient.unitPhone || OBSERVATION_UNIT_PHONE,
    hn: patient.hn || '',
    an: patient.vn || patient.an || '',
    patientName: patient.patientName || '',
    age: patient.age != null ? String(patient.age) : '',
    nationalId: patient.nationalId || patient.cid || '',
    toFacility: '',
    toFacilityPhone: '',
    receiver: '',
    rights: patient.rights || '',
    rightsNetwork: '',
    referReasons: [],
    referReasonOther: '',

    visitDate: null,
    visitTime: '',
    dx: patient.diagnosis || '',
    underlyingDisease: [],
    level: '',
    esi: '',
    icd10: '',
    presentingSymptoms: patient.chiefComplaint || '',
    consciousness: '',
    neuroAdmit: blankNeuro(),
    vsAdmit: {
      temp: latest?.temp != null ? String(latest.temp) : '',
      pulse: latest?.pulse != null ? String(latest.pulse) : '',
      rr: latest?.rr != null ? String(latest.rr) : '',
      bpSys: latest?.bpSys != null ? String(latest.bpSys) : '',
      bpDia: latest?.bpDia != null ? String(latest.bpDia) : '',
      spo2: latest?.spo2 != null ? String(latest.spo2) : '',
    },
    hasLab: false,
    labResult: '',
    hasXray: false,
    xrayResult: '',
    hasOther: false,
    otherNotes: '',

    currentSymptoms: patient.chiefComplaint || '',
    neuroCurrent: blankNeuro(),
    vsCurrent: blankVitals(),
    transferAssessment: '',

    actionsTaken: ordersLine,

    finalStatus: '',
    receivingHospital: '',
    receivingDoctor: '',
    acceptedDate: null,
    acceptedTime: '',
    rejectReason: '',
    note: '',
    reporter: patient.nurseName || '',
    reporterAvatar: resolveReporterAvatar(
      patient.nurseName || '',
      patient.nurseAvatar || '',
    ),

    /* Compat keys for saveReferral / blankReferral merge */
    toFacilityOther: '',
    history: '',
    symptom: patient.chiefComplaint || '',
    treatmentGiven: ordersLine,
    requirement: '',
    communicableNotify: 'none',
    sender: patient.doctorName || '',
    validUntil: '',
  };
}

function NeuroFields({ value = {}, onChange }) {
  const set = (key) => (e) => {
    const next = typeof e === 'string' ? e : e?.target?.value ?? '';
    onChange({ ...value, [key]: next });
  };
  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: FIELD_GAP }}>
      <FieldRow>
        <InputField label='GCS E' value={value.gcsE} onChange={set('gcsE')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 4' />
        <InputField label='GCS V' value={value.gcsV} onChange={set('gcsV')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 5' />
        <InputField label='GCS M' value={value.gcsM} onChange={set('gcsM')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 6' />
        <InputField label='Motor power' value={value.motorPower} onChange={set('motorPower')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 5/5 ทั้งตัว' />
      </FieldRow>
      <FieldRow>
        <InputField label='pupil RT' value={value.pupilRt} onChange={set('pupilRt')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 3 mm react' />
        <InputField label='pupil LT' value={value.pupilLt} onChange={set('pupilLt')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 3 mm react' />
        <div aria-hidden />
        <div aria-hidden />
      </FieldRow>
    </div>
  );
}

function VitalsFields({ value = {}, onChange }) {
  const set = (key) => (e) => {
    const next = typeof e === 'string' ? e : e?.target?.value ?? '';
    onChange({ ...value, [key]: next });
  };
  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: FIELD_GAP }}>
      <FieldRow>
        <InputField label='T (°C)' value={value.temp} onChange={set('temp')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 37.0' />
        <InputField label='P (/min)' value={value.pulse} onChange={set('pulse')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 80' />
        <InputField label='R (/min)' value={value.rr} onChange={set('rr')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 20' />
        <InputField label='O₂ Sat (%)' value={value.spo2} onChange={set('spo2')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 98' />
      </FieldRow>
      <FieldRow>
        <InputField label='BP Systolic (mmHg)' value={value.bpSys} onChange={set('bpSys')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 120' />
        <InputField label='BP Diastolic (mmHg)' value={value.bpDia} onChange={set('bpDia')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 80' />
        <div aria-hidden />
        <div aria-hidden />
      </FieldRow>
    </div>
  );
}

/**
 * Nested external-referral form — matches the paper ส่งต่อภายนอก form
 * (หน่วยงาน / สิทธิ / สาเหตุ Refer · อาการแรกรับ · อาการปัจจุบัน · สถานะสุดท้าย).
 */
export default function ObservationExternalReferForm({ draft, onChange }) {
  const [icdSearchOpen, setIcdSearchOpen] = useState(false);
  const set = (key) => (value) => onChange((prev) => ({ ...prev, [key]: value }));
  const setText = (key) => (e) => onChange((prev) => ({
    ...prev,
    [key]: typeof e === 'string' ? e : e?.target?.value ?? '',
  }));
  const setNested = (key) => (next) => onChange((prev) => ({ ...prev, [key]: next }));

  const toggleReason = (value) => {
    const current = Array.isArray(draft.referReasons) ? draft.referReasons : [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange((prev) => ({
      ...prev,
      referReasons: next,
      referReasonOther: value === 'other' && !next.includes('other') ? '' : prev.referReasonOther,
    }));
  };

  const handleFacility = (value) => {
    const meta = facilityMeta(value);
    onChange((prev) => ({
      ...prev,
      toFacility: value,
      toFacilityPhone: meta?.phone || prev.toFacilityPhone,
      receivingHospital: prev.finalStatus === 'accepted'
        ? (prev.receivingHospital || meta?.label || '')
        : prev.receivingHospital,
    }));
  };

  return (
    <div
      className='flex flex-col w-full min-w-0'
      style={{ gap: GROUP_GAP }}
    >
      {/* ── 1. ข้อมูลหน่วยงาน / ผู้ป่วย (read-only, auto-filled) ─── */}
      <FormSection title='ข้อมูลหน่วยงานและผู้ป่วย' tone='brandSoft'>
        <FieldRow>
          <TextValue label='หน่วยงาน' value={draft.unit} />
          <TextValue label='เบอร์โทร' value={draft.unitPhone} />
          <TextValue label='HN' value={draft.hn} />
          <TextValue label='AN' value={draft.an} />
        </FieldRow>

        <FieldRow>
          <TextValue label='ชื่อ-สกุล' value={draft.patientName} />
          <TextValue label='อายุ (ปี)' value={draft.age} />
          <TextValue label='ID' value={draft.nationalId} />
          <TextValue label='สิทธิการรักษา' value={draft.rights} />
        </FieldRow>
      </FormSection>

      <FormSection title='ปลายทางส่งต่อ'>
        <FieldRow>
          <Select
            label='ส่งต่อโรงพยาบาล'
            value={draft.toFacility}
            onChange={handleFacility}
            options={facilityOptions}
            placeholder='-- เลือกโรงพยาบาลส่งต่อ --'
            required
          />
          <InputField
            label='เบอร์โทรศัพท์'
            value={draft.toFacilityPhone}
            onChange={setText('toFacilityPhone')}
            showLeadingIcon={false}
            showHelperText={false}
            placeholder='02-xxx-xxxx'
          />
          <InputField
            label='ผู้รับเรื่อง'
            value={draft.receiver}
            onChange={setText('receiver')}
            showLeadingIcon={false}
            showHelperText={false}
            placeholder='ชื่อผู้รับเรื่องปลายทาง'
          />
          <div aria-hidden />
        </FieldRow>

        <FieldGroup label='เครือข่ายสิทธิ' align='center' gap={OPTION_GAP}>
          {[
            { value: 'in', label: 'ในเครือสำนักการแพทย์' },
            { value: 'out', label: 'นอกเครือสำนักการแพทย์' },
          ].map((opt) => (
            <RadioButton
              key={opt.value}
              name='external-refer-rights-network'
              value={opt.value}
              checked={draft.rightsNetwork === opt.value}
              onChange={() => set('rightsNetwork')(opt.value)}
              border
              title={opt.label}
              showRadio={false}
              showCircleIcon={false}
              showIcon={false}
              showDescription={false}
              showBadge={false}
              showBadgeTitle={false}
              showPalette={false}
              className='w-fit shrink-0'
              style={{
                width: 'fit-content',
                minWidth: 0,
                minHeight: 'var(--dim-size-800, 40px)',
                paddingTop: 'var(--dim-space-150, 6px)',
                paddingBottom: 'var(--dim-space-150, 6px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
              }}
            />
          ))}
        </FieldGroup>

        <FieldGroup label='สาเหตุที่ Refer' align='center' gap={OPTION_GAP}>
          {REFER_REASON_OPTIONS.map((opt) => (
            <CheckboxButton
              key={opt.value}
              label={opt.label}
              checked={(draft.referReasons || []).includes(opt.value)}
              onChange={() => toggleReason(opt.value)}
              border
              showDescription={false}
              showCircleIcon={false}
              showIcon={false}
              showBadge={false}
              showBadge2={false}
              className='w-fit shrink-0'
              style={{
                width: 'fit-content',
                minWidth: 0,
                minHeight: 'var(--dim-size-800, 40px)',
                paddingTop: 'var(--dim-space-150, 6px)',
                paddingBottom: 'var(--dim-space-150, 6px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
              }}
            />
          ))}
        </FieldGroup>
        {(draft.referReasons || []).includes('other') && (
          <FieldRow>
            <FieldSpan cols={4}>
              <InputField
                label='อื่นๆ (ระบุ)'
                value={draft.referReasonOther}
                onChange={setText('referReasonOther')}
                showLeadingIcon={false}
                showHelperText={false}
                placeholder='ระบุสาเหตุอื่น'
              />
            </FieldSpan>
          </FieldRow>
        )}
      </FormSection>

      <SectionDivider />

      {/* ── 2. ข้อมูลคลินิกแรกรับ ─────────────────────────────────── */}
      <FormSection title='ข้อมูลคลินิกแรกรับ'>
        <FieldRow>
          <DatePicker
            label='มาตรวจ OPD/ER/Admit วันที่'
            value={draft.visitDate}
            onChange={set('visitDate')}
          />
          <TimePicker
            label='เวลา'
            value={draft.visitTime}
            onChange={setText('visitTime')}
            showHelperText={false}
            placeholder='HH:MM'
          />
          <Select
            label='โรคประจำตัว'
            value={Array.isArray(draft.underlyingDisease) ? draft.underlyingDisease : []}
            onChange={set('underlyingDisease')}
            options={UNDERLYING_DISEASE_OPTIONS}
            placeholder='เลือก'
            multiple
            showHelperText={false}
          />
          <div aria-hidden />
        </FieldRow>

        <FieldRow>
          <FieldSpan cols={4}>
            <VoiceTextarea
              label='Dx (Diagnosis)'
              value={draft.dx}
              onChange={setText('dx')}
              showHelperText={false}
              placeholder='การวินิจฉัย เช่น Acute Bronchospasm'
            />
          </FieldSpan>
        </FieldRow>

        <FieldGroup label='LEVEL' align='center' gap='var(--dim-space-200, 8px)'>
          {LEVEL_OPTIONS.map((lv) => (
            <RadioButton
              key={lv}
              name='external-refer-level'
              value={lv}
              checked={draft.level === lv}
              onChange={() => set('level')(lv)}
              border
              title={lv}
              showRadio={false}
              showCircleIcon={false}
              showIcon={false}
              showDescription={false}
              showBadge={false}
              showBadgeTitle={false}
              showPalette={false}
              className='w-fit shrink-0'
              style={{
                width: 'fit-content',
                minWidth: 0,
                minHeight: 'var(--dim-size-800, 40px)',
                paddingTop: 'var(--dim-space-150, 6px)',
                paddingBottom: 'var(--dim-space-150, 6px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
              }}
            />
          ))}
        </FieldGroup>

        <FieldRow>
          <Select
            label='ESI'
            value={draft.esi ? String(draft.esi) : ''}
            onChange={set('esi')}
            options={ESI_OPTIONS}
            placeholder='เลือก'
            showHelperText={false}
          />
          <div className='flex items-end w-full min-w-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <div className='flex-1 min-w-0'>
              <InputField
                label='ICD 10'
                value={draft.icd10}
                onChange={setText('icd10')}
                showLeadingIcon={false}
                showHelperText={false}
                placeholder='เช่น J45.9'
              />
            </div>
            <BrandSubdueIconButton
              size='md'
              icon='auto_awesome'
              aria-label='ค้นหารหัส ICD-10 ด้วย Doctor AI'
              onClick={() => setIcdSearchOpen(true)}
            />
          </div>
          <div aria-hidden />
          <div aria-hidden />
        </FieldRow>

        <FieldRow>
          <FieldSpan cols={4}>
            <VoiceTextarea
              label='อาการแรกรับ'
              value={draft.presentingSymptoms}
              onChange={setText('presentingSymptoms')}
              showHelperText={false}
              placeholder='อาการที่พบเมื่อแรกรับ'
            />
          </FieldSpan>
        </FieldRow>

        <FieldGroup label='ระดับความรู้สึกตัว' align='center' gap='var(--dim-space-200, 8px)'>
          {[
            { value: 'alert', label: 'รู้สึกตัวดี' },
            { value: 'unconscious', label: 'ไม่รู้สึกตัว' },
          ].map((opt) => (
            <RadioButton
              key={opt.value}
              name='external-refer-consciousness'
              value={opt.value}
              checked={draft.consciousness === opt.value}
              onChange={() => set('consciousness')(opt.value)}
              border
              title={opt.label}
              showRadio={false}
              showCircleIcon={false}
              showIcon={false}
              showDescription={false}
              showBadge={false}
              showBadgeTitle={false}
              showPalette={false}
              className='w-fit shrink-0'
              style={{
                width: 'fit-content',
                minWidth: 0,
                minHeight: 'var(--dim-size-800, 40px)',
                paddingTop: 'var(--dim-space-150, 6px)',
                paddingBottom: 'var(--dim-space-150, 6px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
              }}
            />
          ))}
        </FieldGroup>

        <FieldGroup label='GCS / Pupil / Motor (แรกรับ)'>
          <div className='w-full min-w-0'>
            <NeuroFields value={draft.neuroAdmit} onChange={setNested('neuroAdmit')} />
          </div>
        </FieldGroup>

        <FieldGroup label='V/S (แรกรับ)'>
          <div className='w-full min-w-0'>
            <VitalsFields value={draft.vsAdmit} onChange={setNested('vsAdmit')} />
          </div>
        </FieldGroup>

        <FieldGroup label='ผลการตรวจเพิ่มเติม' align='center' gap='var(--dim-space-200, 8px)'>
          {[
            {
              key: 'hasLab',
              label: 'ผล Lab',
              checked: !!draft.hasLab,
              onChange: (checked) => onChange((prev) => ({
                ...prev,
                hasLab: checked,
                labResult: checked ? prev.labResult : '',
              })),
            },
            {
              key: 'hasXray',
              label: 'ผล X-Ray',
              checked: !!draft.hasXray,
              onChange: (checked) => onChange((prev) => ({
                ...prev,
                hasXray: checked,
                xrayResult: checked ? prev.xrayResult : '',
              })),
            },
            {
              key: 'hasOther',
              label: 'อื่นๆ',
              checked: !!draft.hasOther,
              onChange: (checked) => onChange((prev) => ({
                ...prev,
                hasOther: checked,
                otherNotes: checked ? prev.otherNotes : '',
              })),
            },
          ].map((opt) => (
            <CheckboxButton
              key={opt.key}
              label={opt.label}
              checked={opt.checked}
              onChange={opt.onChange}
              border
              showDescription={false}
              showCircleIcon={false}
              showIcon={false}
              showBadge={false}
              showBadge2={false}
              className='w-fit shrink-0'
              style={{
                width: 'fit-content',
                minWidth: 0,
                minHeight: 'var(--dim-size-800, 40px)',
                paddingTop: 'var(--dim-space-150, 6px)',
                paddingBottom: 'var(--dim-space-150, 6px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
              }}
            />
          ))}
        </FieldGroup>

        {draft.hasLab && (
          <FieldRow>
            <FieldSpan cols={4}>
              <InputField
                label='รายละเอียดผล Lab'
                value={draft.labResult}
                onChange={setText('labResult')}
                showLeadingIcon={false}
                showHelperText={false}
                placeholder='เช่น CBC WBC 12,000 · Cr 1.2'
              />
            </FieldSpan>
          </FieldRow>
        )}
        {draft.hasXray && (
          <FieldRow>
            <FieldSpan cols={4}>
              <InputField
                label='รายละเอียดผล X-Ray'
                value={draft.xrayResult}
                onChange={setText('xrayResult')}
                showLeadingIcon={false}
                showHelperText={false}
                placeholder='เช่น CXR: no infiltrate'
              />
            </FieldSpan>
          </FieldRow>
        )}
        {draft.hasOther && (
          <FieldRow>
            <FieldSpan cols={4}>
              <VoiceTextarea
                label='อื่นๆ (ระบุ)'
                value={draft.otherNotes}
                onChange={setText('otherNotes')}
                showHelperText={false}
                placeholder='ระบุรายละเอียดเพิ่มเติม'
              />
            </FieldSpan>
          </FieldRow>
        )}
      </FormSection>

      <SectionDivider />

      {/* ── 3. สถานะปัจจุบันก่อนส่งต่อ ────────────────────────────── */}
      <FormSection title='อาการปัจจุบันและการดำเนินการ'>
        <FieldRow>
          <FieldSpan cols={4}>
            <VoiceTextarea
              label='อาการปัจจุบัน'
              value={draft.currentSymptoms}
              onChange={setText('currentSymptoms')}
              showHelperText={false}
              placeholder='อาการ ณ เวลาส่งต่อ'
              required
            />
          </FieldSpan>
        </FieldRow>

        <FieldGroup label='GCS / Pupil / Motor (ปัจจุบัน)'>
          <div className='w-full min-w-0'>
            <NeuroFields value={draft.neuroCurrent} onChange={setNested('neuroCurrent')} />
          </div>
        </FieldGroup>

        <FieldGroup label='V/S (ปัจจุบัน)'>
          <div className='w-full min-w-0'>
            <VitalsFields value={draft.vsCurrent} onChange={setNested('vsCurrent')} />
          </div>
        </FieldGroup>

        <FieldGroup label='ประเมินการเคลื่อนย้าย' align='center' gap={OPTION_GAP}>
          {[
            { value: 'safe', label: 'เคลื่อนย้ายได้' },
            { value: 'unsafe', label: 'มีความเสี่ยงไม่ปลอดภัยในการเคลื่อนย้าย' },
          ].map((opt) => (
            <RadioButton
              key={opt.value}
              name='external-refer-transfer-assessment'
              value={opt.value}
              checked={draft.transferAssessment === opt.value}
              onChange={() => set('transferAssessment')(opt.value)}
              border
              title={opt.label}
              showRadio={false}
              showCircleIcon={false}
              showIcon={false}
              showDescription={false}
              showBadge={false}
              showBadgeTitle={false}
              showPalette={false}
              className='w-fit shrink-0'
              style={{
                width: 'fit-content',
                minWidth: 0,
                minHeight: 'var(--dim-size-800, 40px)',
                paddingTop: 'var(--dim-space-150, 6px)',
                paddingBottom: 'var(--dim-space-150, 6px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
              }}
            />
          ))}
        </FieldGroup>

        <FieldRow>
          <FieldSpan cols={4}>
            <VoiceTextarea
              label='การดำเนินการ'
              value={draft.actionsTaken}
              onChange={setText('actionsTaken')}
              showHelperText={false}
              placeholder='การรักษา / หัตถการที่ให้ก่อนส่งต่อ'
            />
          </FieldSpan>
        </FieldRow>
      </FormSection>

      <SectionDivider />

      {/* ── 4. สถานะสุดท้าย ───────────────────────────────────────── */}
      <FormSection title='สถานะสุดท้าย'>
        <FieldGroup label='ผลการติดต่อปลายทาง' align='center' gap='var(--dim-space-200, 8px)'>
          {[
            { value: 'accepted', label: 'รับ Refer' },
            { value: 'rejected', label: 'ไม่รับ' },
          ].map((opt) => (
            <RadioButton
              key={opt.value}
              name='external-refer-final-status'
              value={opt.value}
              checked={draft.finalStatus === opt.value}
              onChange={() => set('finalStatus')(opt.value)}
              border
              title={opt.label}
              showRadio={false}
              showCircleIcon={false}
              showIcon={false}
              showDescription={false}
              showBadge={false}
              showBadgeTitle={false}
              showPalette={false}
              className='w-fit shrink-0'
              style={{
                width: 'fit-content',
                minWidth: 0,
                minHeight: 'var(--dim-size-800, 40px)',
                paddingTop: 'var(--dim-space-150, 6px)',
                paddingBottom: 'var(--dim-space-150, 6px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
              }}
            />
          ))}
        </FieldGroup>

        {draft.finalStatus === 'accepted' && (
          <FieldRow>
            <InputField
              label='โรงพยาบาลที่รับ'
              value={draft.receivingHospital}
              onChange={setText('receivingHospital')}
              showLeadingIcon={false}
              showHelperText={false}
              placeholder='ชื่อโรงพยาบาลที่รับ Refer'
            />
            <InputField
              label='แพทย์ที่รับ'
              value={draft.receivingDoctor}
              onChange={setText('receivingDoctor')}
              showLeadingIcon={false}
              showHelperText={false}
              placeholder='ชื่อแพทย์ผู้รับ'
            />
            <DatePicker
              label='วันที่'
              value={draft.acceptedDate}
              onChange={set('acceptedDate')}
            />
            <TimePicker
              label='เวลา'
              value={draft.acceptedTime}
              onChange={setText('acceptedTime')}
              showHelperText={false}
              placeholder='HH:MM'
            />
          </FieldRow>
        )}

        {draft.finalStatus === 'rejected' && (
          <FieldRow>
            <FieldSpan cols={4}>
              <InputField
                label='เหตุผลที่ไม่รับ'
                value={draft.rejectReason}
                onChange={setText('rejectReason')}
                showLeadingIcon={false}
                showHelperText={false}
                placeholder='ระบุเหตุผลที่ปลายทางไม่รับ'
                required
              />
            </FieldSpan>
          </FieldRow>
        )}

        <FieldRow>
          <FieldSpan cols={4}>
            <VoiceTextarea
              label='หมายเหตุ'
              value={draft.note}
              onChange={setText('note')}
              showHelperText={false}
              placeholder='บันทึกเพิ่มเติม (ถ้ามี)'
            />
          </FieldSpan>
        </FieldRow>

        <FieldRow>
          <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <span style={fieldLabelStyle}>ผู้แจ้งผล</span>
            <div
              className='flex items-center min-w-0'
              style={{ gap: 'var(--dim-space-200, 8px)' }}
            >
              <div
                className='shrink-0 overflow-hidden'
                style={{
                  width: 'var(--dim-size-800, 40px)',
                  height: 'var(--dim-size-800, 40px)',
                  borderRadius: 'var(--dim-radius-full)',
                  background: 'var(--surface-neutral-tertiary, #F1F5F9)',
                }}
              >
                {draft.reporterAvatar ? (
                  <img
                    src={draft.reporterAvatar}
                    alt={draft.reporter || 'ผู้แจ้งผล'}
                    draggable={false}
                    className='w-full h-full object-cover'
                  />
                ) : null}
              </div>
              <span
                style={{
                  color: draft.reporter ? 'var(--text-content-default)' : 'var(--text-content-tertiary)',
                  fontSize: 'var(--type-size-sm)',
                  fontWeight: 'var(--type-weight-medium)',
                  lineHeight: 1.5,
                }}
              >
                {draft.reporter || '—'}
              </span>
            </div>
          </div>
          <div aria-hidden />
          <div aria-hidden />
          <div aria-hidden />
        </FieldRow>
      </FormSection>

      <Icd10SearchPopup
        open={icdSearchOpen}
        onClose={() => setIcdSearchOpen(false)}
        initialQuery={draft.icd10 || ''}
        onSelect={({ code }) => {
          onChange((prev) => ({ ...prev, icd10: code }));
        }}
      />
    </div>
  );
}

export function isObservationExternalReferIncomplete(draft) {
  if (!draft) return true;
  if (!draft.toFacility) return true;
  if (!String(draft.currentSymptoms || draft.presentingSymptoms || '').trim()) return true;
  if (draft.finalStatus === 'rejected' && !String(draft.rejectReason || '').trim()) return true;
  return false;
}

export function externalReferHospitalLabel(draft) {
  if (!draft) return '';
  return facilityMeta(draft.toFacility)?.label
    || draft.receivingHospital
    || draft.toFacilityOther
    || '';
}

/** Flatten paper-form draft into fields blankReferral / saveReferral understand. */
export function flattenExternalReferForSave(draft) {
  if (!draft) return {};
  const reasonLabels = REFER_REASON_OPTIONS
    .filter((o) => (draft.referReasons || []).includes(o.value))
    .map((o) => (o.value === 'other' && draft.referReasonOther
      ? `อื่นๆ: ${draft.referReasonOther}`
      : o.label));
  const underlyingKeys = Array.isArray(draft.underlyingDisease)
    ? draft.underlyingDisease
    : (draft.underlyingDisease ? [draft.underlyingDisease] : []);
  const underlyingLabel = underlyingKeys
    .map((key) => UNDERLYING_DISEASE_OPTIONS.find((o) => o.value === key)?.label || key)
    .filter(Boolean)
    .join(' · ');
  return {
    toFacility: draft.toFacility,
    toFacilityOther: draft.toFacilityOther || '',
    hn: draft.hn,
    name: draft.patientName,
    rights: draft.rights,
    history: underlyingLabel,
    symptom: draft.currentSymptoms || draft.presentingSymptoms || '',
    labResult: [
      draft.hasLab && draft.labResult ? `Lab: ${draft.labResult}` : null,
      draft.hasXray && draft.xrayResult ? `X-Ray: ${draft.xrayResult}` : null,
      draft.hasOther && draft.otherNotes ? `อื่นๆ: ${draft.otherNotes}` : null,
    ].filter(Boolean).join(' · '),
    treatmentGiven: draft.actionsTaken || '',
    requirement: reasonLabels.join(' · '),
    note: draft.note || '',
    sender: draft.reporter || draft.sender || '',
    communicableNotify: draft.communicableNotify || 'none',
  };
}
