import React from 'react';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import DatePicker from '@/components/forms/DatePicker';
import VoiceTextarea from '@/components/forms/VoiceTextarea';
import Checkbox from '@/components/checkbox/Checkbox';
import CheckboxButton from '@/components/checkbox/CheckboxButton';
import RadioGroup from '@/components/radio/RadioGroup';
import {
  REFER_FACILITIES,
  facilityMeta,
} from '@/data/treatmentRefer';

const facilityOptions = REFER_FACILITIES.map((f) => ({ value: f.value, label: f.label }));

const REFER_REASON_OPTIONS = [
  { value: 'rights', label: 'ตามสิทธิ' },
  { value: 'capacity', label: 'เกินศักยภาพ' },
  { value: 'relative', label: 'ญาติต้องการ' },
  { value: 'other', label: 'อื่นๆ' },
];

const LEVEL_OPTIONS = ['U', 'H', 'M', 'L', 'N'];

const groupLabelStyle = {
  color: 'var(--text-content-secondary)',
  fontSize: 'var(--type-size-xs)',
  fontWeight: 'var(--type-weight-medium)',
  marginBottom: 'var(--dim-space-200)',
};

const dividerStyle = {
  width: '100%',
  height: 0,
  border: 0,
  borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
  margin: 0,
};

const FieldRow = ({ children, cols = 2 }) => (
  <div
    className='grid grid-cols-1 w-full'
    style={{
      gap: 'var(--dim-space-300)',
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    }}
  >
    {children}
  </div>
);

const InlineUnit = ({ children, unit }) => (
  <div className='flex items-end w-full' style={{ gap: 'var(--dim-space-200)' }}>
    <div className='flex-1 min-w-0'>{children}</div>
    {unit ? (
      <span
        className='shrink-0'
        style={{
          paddingBottom: 'var(--dim-space-200)',
          color: 'var(--text-content-tertiary)',
          fontSize: 'var(--type-size-xs)',
        }}
      >
        {unit}
      </span>
    ) : null}
  </div>
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
export function buildObservationExternalReferDraft(patient = {}) {
  const latest = patient.vitalsTrend?.[patient.vitalsTrend.length - 1];
  const ordersLine = (patient.statOrders || [])
    .filter((o) => o.status !== 'cancelled')
    .map((o) => o.orderText)
    .join('; ');

  return {
    unit: 'ห้องสังเกตอาการ (Observation Unit)',
    unitPhone: '',
    hn: patient.hn || '',
    an: patient.vn || '',
    patientName: patient.patientName || '',
    age: patient.age != null ? String(patient.age) : '',
    nationalId: patient.nationalId || '',
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
    underlyingDisease: '',
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
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <FieldRow cols={3}>
        <InputField label='GCS E' value={value.gcsE} onChange={set('gcsE')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 4' />
        <InputField label='GCS V' value={value.gcsV} onChange={set('gcsV')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 5' />
        <InputField label='GCS M' value={value.gcsM} onChange={set('gcsM')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 6' />
      </FieldRow>
      <FieldRow cols={3}>
        <InputField label='pupil RT' value={value.pupilRt} onChange={set('pupilRt')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 3 mm react' />
        <InputField label='pupil LT' value={value.pupilLt} onChange={set('pupilLt')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 3 mm react' />
        <InputField label='Motor power' value={value.motorPower} onChange={set('motorPower')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 5/5 ทั้งตัว' />
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
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <FieldRow cols={3}>
        <InlineUnit unit='°C'>
          <InputField label='T' value={value.temp} onChange={set('temp')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 37.0' />
        </InlineUnit>
        <InlineUnit unit='/min'>
          <InputField label='P' value={value.pulse} onChange={set('pulse')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 80' />
        </InlineUnit>
        <InlineUnit unit='/min'>
          <InputField label='R' value={value.rr} onChange={set('rr')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 20' />
        </InlineUnit>
      </FieldRow>
      <FieldRow cols={3}>
        <div className='flex items-end w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <div className='flex-1 min-w-0'>
            <InputField label='BP' value={value.bpSys} onChange={set('bpSys')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 120' />
          </div>
          <span style={{ paddingBottom: 'var(--dim-space-200)', color: 'var(--text-content-tertiary)' }}>/</span>
          <div className='flex-1 min-w-0'>
            <InputField value={value.bpDia} onChange={set('bpDia')} showLeadingIcon={false} showHelperText={false} showLabel={false} placeholder='เช่น 80' />
          </div>
          <span
            className='shrink-0'
            style={{
              paddingBottom: 'var(--dim-space-200)',
              color: 'var(--text-content-tertiary)',
              fontSize: 'var(--type-size-xs)',
            }}
          >
            mmHg
          </span>
        </div>
        <InlineUnit unit='%'>
          <InputField label='O₂ Sat' value={value.spo2} onChange={set('spo2')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 98' />
        </InlineUnit>
        <div />
      </FieldRow>
    </div>
  );
}

/**
 * Nested external-referral form — matches the paper ส่งต่อภายนอก form
 * (หน่วยงาน / สิทธิ / สาเหตุ Refer · อาการแรกรับ · อาการปัจจุบัน · สถานะสุดท้าย).
 */
export default function ObservationExternalReferForm({ draft, onChange }) {
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
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      {/* ── Section 1: administrative ─────────────────────────────── */}
      <FieldRow cols={4}>
        <InputField label='หน่วยงาน' value={draft.unit} onChange={setText('unit')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น ห้องสังเกตอาการ' />
        <InputField label='เบอร์โทร' value={draft.unitPhone} onChange={setText('unitPhone')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 02-xxx-xxxx' />
        <InputField label='HN' value={draft.hn} onChange={setText('hn')} showLeadingIcon={false} showHelperText={false} placeholder='เลข HN' />
        <InputField label='AN' value={draft.an} onChange={setText('an')} showLeadingIcon={false} showHelperText={false} placeholder='เลข AN (ถ้ามี)' />
      </FieldRow>

      <FieldRow cols={3}>
        <InputField label='ชื่อ-สกุล' value={draft.patientName} onChange={setText('patientName')} showLeadingIcon={false} showHelperText={false} placeholder='ชื่อ-นามสกุลผู้ป่วย' />
        <InlineUnit unit='ปี'>
          <InputField label='อายุ' value={draft.age} onChange={setText('age')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 58' />
        </InlineUnit>
        <InputField label='ID' value={draft.nationalId} onChange={setText('nationalId')} showLeadingIcon={false} showHelperText={false} placeholder='เลขบัตรประชาชน 13 หลัก' />
      </FieldRow>

      <FieldRow cols={3}>
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
          placeholder='เบอร์โทรโรงพยาบาลปลายทาง'
        />
        <InputField
          label='ผู้รับเรื่อง'
          value={draft.receiver}
          onChange={setText('receiver')}
          showLeadingIcon={false}
          showHelperText={false}
          placeholder='ชื่อผู้รับเรื่องปลายทาง'
        />
      </FieldRow>

      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <InputField
          label='สิทธิการรักษา'
          value={draft.rights}
          onChange={setText('rights')}
          showLeadingIcon={false}
          showHelperText={false}
          placeholder='เช่น สิทธิบัตรทอง / ประกันสังคม'
        />
        <RadioGroup
          legend='เครือข่ายสิทธิ'
          direction='row'
          value={draft.rightsNetwork || ''}
          onChange={set('rightsNetwork')}
          options={[
            { value: 'in', label: 'ในเครือสำนักการแพทย์' },
            { value: 'out', label: 'นอกเครือสำนักการแพทย์' },
          ]}
        />
      </div>

      <div>
        <div style={groupLabelStyle}>สาเหตุที่ Refer</div>
        <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
          {REFER_REASON_OPTIONS.map((opt) => (
            <Checkbox
              key={opt.value}
              label={opt.label}
              checked={(draft.referReasons || []).includes(opt.value)}
              onChange={() => toggleReason(opt.value)}
            />
          ))}
        </div>
        {(draft.referReasons || []).includes('other') && (
          <div style={{ marginTop: 'var(--dim-space-300)' }}>
            <InputField
              label='อื่นๆ (ระบุ)'
              value={draft.referReasonOther}
              onChange={setText('referReasonOther')}
              showLeadingIcon={false}
              showHelperText={false}
              placeholder='ระบุสาเหตุอื่น'
            />
          </div>
        )}
      </div>

      <hr style={dividerStyle} />

      {/* ── Section 2: clinical on arrival ────────────────────────── */}
      <FieldRow cols={3}>
        <DatePicker
          label='มาตรวจ OPD/ER/Admit วันที่'
          value={draft.visitDate}
          onChange={set('visitDate')}
        />
        <InputField
          label='เวลา'
          type='time'
          value={draft.visitTime}
          onChange={setText('visitTime')}
          showLeadingIcon={false}
          showHelperText={false}
        />
        <InputField label='Dx' value={draft.dx} onChange={setText('dx')} showLeadingIcon={false} showHelperText={false} placeholder='การวินิจฉัย เช่น Acute Bronchospasm' />
      </FieldRow>

      <FieldRow cols={2}>
        <InputField
          label='โรคประจำตัว'
          value={draft.underlyingDisease}
          onChange={setText('underlyingDisease')}
          showLeadingIcon={false}
          showHelperText={false}
          placeholder='เช่น เบาหวาน ความดันโลหิตสูง หรือไม่มี'
        />
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
          <div style={groupLabelStyle}>LEVEL</div>
          <div
            className='flex flex-wrap'
            role='group'
            aria-label='LEVEL'
            style={{ gap: 'var(--dim-space-200)' }}
          >
            {LEVEL_OPTIONS.map((lv) => (
              <CheckboxButton
                key={lv}
                label={lv}
                checked={draft.level === lv}
                onChange={(checked) => set('level')(checked ? lv : '')}
                showDescription={false}
                showCircleIcon={false}
                showIcon={false}
                showBadge={false}
                showBadge2={false}
                style={{ width: 'fit-content', minWidth: 'var(--dim-size-1400, 64px)' }}
              />
            ))}
          </div>
        </div>
      </FieldRow>

      <FieldRow cols={2}>
        <InputField label='ESI' value={draft.esi} onChange={setText('esi')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น 3' />
        <InputField label='ICD 10' value={draft.icd10} onChange={setText('icd10')} showLeadingIcon={false} showHelperText={false} placeholder='เช่น J45.9' />
      </FieldRow>

      <VoiceTextarea
        label='อาการแรกรับ'
        value={draft.presentingSymptoms}
        onChange={setText('presentingSymptoms')}
        showHelperText={false}
        placeholder='อาการที่พบเมื่อแรกรับ'
      />

      <div>
        <RadioGroup
          legend='ระดับความรู้สึกตัว'
          direction='row'
          value={draft.consciousness || ''}
          onChange={set('consciousness')}
          options={[
            { value: 'alert', label: 'รู้สึกตัวดี' },
            { value: 'unconscious', label: 'ไม่รู้สึกตัว' },
          ]}
        />
        <div style={{ marginTop: 'var(--dim-space-300)' }}>
          <NeuroFields value={draft.neuroAdmit} onChange={setNested('neuroAdmit')} />
        </div>
      </div>

      <div>
        <div style={groupLabelStyle}>V/S</div>
        <VitalsFields value={draft.vsAdmit} onChange={setNested('vsAdmit')} />
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <Checkbox
          label='ผล Lab'
          checked={!!draft.hasLab}
          onChange={(checked) => onChange((prev) => ({
            ...prev,
            hasLab: checked,
            labResult: checked ? prev.labResult : '',
          }))}
        />
        {draft.hasLab && (
          <InputField
            label='รายละเอียดผล Lab'
            value={draft.labResult}
            onChange={setText('labResult')}
            showLeadingIcon={false}
            showHelperText={false}
            placeholder='เช่น CBC WBC 12,000 · Cr 1.2'
          />
        )}
        <Checkbox
          label='ผล X-Ray'
          checked={!!draft.hasXray}
          onChange={(checked) => onChange((prev) => ({
            ...prev,
            hasXray: checked,
            xrayResult: checked ? prev.xrayResult : '',
          }))}
        />
        {draft.hasXray && (
          <InputField
            label='รายละเอียดผล X-Ray'
            value={draft.xrayResult}
            onChange={setText('xrayResult')}
            showLeadingIcon={false}
            showHelperText={false}
            placeholder='เช่น CXR: no infiltrate'
          />
        )}
        <Checkbox
          label='อื่นๆ'
          checked={!!draft.hasOther}
          onChange={(checked) => onChange((prev) => ({
            ...prev,
            hasOther: checked,
            otherNotes: checked ? prev.otherNotes : '',
          }))}
        />
        {draft.hasOther && (
          <VoiceTextarea
            label='อื่นๆ (ระบุ)'
            value={draft.otherNotes}
            onChange={setText('otherNotes')}
            showHelperText={false}
            placeholder='ระบุรายละเอียดเพิ่มเติม'
          />
        )}
      </div>

      <hr style={dividerStyle} />

      {/* ── Section 3: current status ─────────────────────────────── */}
      <VoiceTextarea
        label='อาการปัจจุบัน'
        value={draft.currentSymptoms}
        onChange={setText('currentSymptoms')}
        showHelperText={false}
        placeholder='อาการ ณ เวลาส่งต่อ'
        required
      />

      <NeuroFields value={draft.neuroCurrent} onChange={setNested('neuroCurrent')} />

      <div>
        <div style={groupLabelStyle}>V/S</div>
        <VitalsFields value={draft.vsCurrent} onChange={setNested('vsCurrent')} />
      </div>

      <RadioGroup
        legend='ประเมินการเคลื่อนย้าย'
        direction='row'
        value={draft.transferAssessment || ''}
        onChange={set('transferAssessment')}
        options={[
          { value: 'safe', label: 'เคลื่อนย้ายได้' },
          { value: 'unsafe', label: 'มีความเสี่ยงไม่ปลอดภัยในการเคลื่อนย้าย' },
        ]}
      />

      <VoiceTextarea
        label='การดำเนินการ'
        value={draft.actionsTaken}
        onChange={setText('actionsTaken')}
        showHelperText={false}
        placeholder='การรักษา / หัตถการที่ให้ก่อนส่งต่อ'
      />

      <hr style={dividerStyle} />

      {/* ── Section 4: final status ───────────────────────────────── */}
      <RadioGroup
        legend='สถานะสุดท้าย'
        value={draft.finalStatus || ''}
        onChange={set('finalStatus')}
        options={[
          { value: 'accepted', label: 'รับ Refer' },
          { value: 'rejected', label: 'ไม่รับ' },
        ]}
      />

      {draft.finalStatus === 'accepted' && (
        <FieldRow cols={2}>
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
          <InputField
            label='เวลา'
            type='time'
            value={draft.acceptedTime}
            onChange={setText('acceptedTime')}
            showLeadingIcon={false}
            showHelperText={false}
          />
        </FieldRow>
      )}

      {draft.finalStatus === 'rejected' && (
        <InputField
          label='เหตุผลที่ไม่รับ'
          value={draft.rejectReason}
          onChange={setText('rejectReason')}
          showLeadingIcon={false}
          showHelperText={false}
          placeholder='ระบุเหตุผลที่ปลายทางไม่รับ'
          required
        />
      )}

      <VoiceTextarea
        label='หมายเหตุ'
        value={draft.note}
        onChange={setText('note')}
        showHelperText={false}
        placeholder='บันทึกเพิ่มเติม (ถ้ามี)'
      />

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
        <InputField
          label='ผู้แจ้งผล'
          value={draft.reporter}
          onChange={setText('reporter')}
          showLeadingIcon={false}
          showHelperText={false}
          placeholder='ชื่อพยาบาลผู้แจ้งผล'
        />
        <span
          style={{
            color: 'var(--text-content-tertiary)',
            fontSize: 'var(--type-size-xs)',
          }}
        >
          พยาบาลศูนย์รับ-ส่งต่อผู้ป่วย
        </span>
      </div>
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
  return {
    toFacility: draft.toFacility,
    toFacilityOther: draft.toFacilityOther || '',
    hn: draft.hn,
    name: draft.patientName,
    rights: draft.rights,
    history: draft.underlyingDisease || '',
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
