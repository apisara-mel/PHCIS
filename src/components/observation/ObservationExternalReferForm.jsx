import React from 'react';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Alert from '@/components/alert/Alert';
import {
  REFER_FACILITIES,
  facilityMeta,
  COMMUNICABLE_NOTIFY_OPTIONS,
  REFER_HISTORY_SUGGESTIONS,
  REFER_SYMPTOM_SUGGESTIONS,
  REFER_TREATMENT_SUGGESTIONS,
  REFER_REASON_SUGGESTIONS,
} from '@/data/treatmentRefer';

/** Pre-fill แบบส่งต่อ §2.5.1 จากข้อมูลผู้ป่วยใน Observation record */
export function buildObservationExternalReferDraft(patient = {}) {
  const latest = patient.vitalsTrend?.[patient.vitalsTrend.length - 1];
  const vitalsLine = latest
    ? `BP ${latest.bpSys}/${latest.bpDia} mmHg · HR ${latest.pulse} bpm · SpO2 ${latest.spo2}% · T ${latest.temp}°C · RR ${latest.rr}`
    : '';
  const ordersLine = (patient.statOrders || [])
    .filter((o) => o.status !== 'cancelled')
    .map((o) => o.orderText)
    .join('; ');

  return {
    toFacility: '',
    toFacilityOther: '',
    history: [patient.chiefComplaint, patient.diagnosis].filter(Boolean).join(' · '),
    symptom: patient.chiefComplaint || '',
    labResult: vitalsLine,
    treatmentGiven: ordersLine,
    requirement: '',
    communicableNotify: 'none',
    note: '',
    sender: patient.doctorName || '',
    validUntil: '',
  };
}

const facilityOptions = REFER_FACILITIES.map((f) => ({ value: f.value, label: f.label }));

/**
 * Nested external-referral form — lives inside the ส่งต่อผู้ป่วย popup when
 * «ส่งต่อภายนอก» is selected (แบบฟอร์มในเครือสำนักการแพทย์ · §2.5.1).
 */
export default function ObservationExternalReferForm({ draft, onChange }) {
  const set = (key) => (value) => onChange((prev) => ({ ...prev, [key]: value }));
  const setText = (key) => (e) => onChange((prev) => ({
    ...prev,
    [key]: typeof e === 'string' ? e : e?.target?.value ?? '',
  }));

  const destination = facilityMeta(draft.toFacility);

  return (
    <div
      className='flex flex-col w-full'
      style={{
        gap: 'var(--dim-space-400)',
        padding: 'var(--dim-space-400)',
        borderRadius: 'var(--dim-radius-400)',
        border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
        background: 'var(--surface-neutral-quaternary)',
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            color: 'var(--text-content-default)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-bold)',
          }}
        >
          แบบส่งต่อผู้รับบริการ (ในเครือสำนักการแพทย์)
        </p>
        <p
          style={{
            margin: 0,
            marginTop: 'var(--dim-space-100)',
            color: 'var(--text-content-tertiary)',
            fontSize: 'var(--type-size-xs)',
          }}
        >
          กรอกข้อมูลก่อนยืนยันส่งต่อ — ฟอร์มนี้อยู่ใน popup เดียวกับการเลือกปลายทาง
        </p>
      </div>

      <Select
        label='โรงพยาบาลปลายทาง (Destination Referral Hospital)'
        value={draft.toFacility}
        onChange={set('toFacility')}
        options={facilityOptions}
        placeholder='-- เลือกโรงพยาบาลส่งต่อ --'
        size='sm'
        required
      />

      {destination && (
        <div
          className='grid grid-cols-1 sm:grid-cols-3'
          style={{ gap: 'var(--dim-space-200)', fontSize: 'var(--type-size-xs)' }}
        >
          <div>
            <span style={{ color: 'var(--text-content-tertiary)' }}>โทรศัพท์ </span>
            <span style={{ color: 'var(--text-content-secondary)' }}>{destination.phone}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-content-tertiary)' }}>โทรสาร </span>
            <span style={{ color: 'var(--text-content-secondary)' }}>{destination.fax}</span>
          </div>
          <div className='min-w-0 truncate'>
            <span style={{ color: 'var(--text-content-tertiary)' }}>อีเมล </span>
            <span style={{ color: 'var(--text-content-secondary)' }}>{destination.email}</span>
          </div>
        </div>
      )}

      <SuggestibleTextarea
        voice
        label='ประวัติการเจ็บป่วย'
        rows={2}
        value={draft.history}
        onChange={setText('history')}
        suggestions={REFER_HISTORY_SUGGESTIONS}
        minChars={2}
        popoverAriaLabel='ตัวอย่างประวัติการเจ็บป่วย'
        placeholder='โรคประจำตัว การรักษาที่ผ่านมา ประวัติแพ้ยา'
      />

      <SuggestibleTextarea
        voice
        label='อาการสำคัญ / อาการปัจจุบัน'
        rows={2}
        value={draft.symptom}
        onChange={setText('symptom')}
        suggestions={REFER_SYMPTOM_SUGGESTIONS}
        minChars={2}
        popoverAriaLabel='ตัวอย่างอาการสำคัญ'
        placeholder='อาการที่นำมาพบแพทย์และระยะเวลาที่เป็น'
        required
      />

      <SuggestibleTextarea
        voice
        label='ผลการตรวจทางห้องปฏิบัติการ / รังสีวิทยา'
        rows={2}
        value={draft.labResult}
        onChange={setText('labResult')}
        suggestions={['ผลตรวจอยู่ระหว่างรอ — จะส่งตามภายหลัง']}
        minChars={2}
        popoverAriaLabel='ตัวอย่างผลตรวจ'
        placeholder='ค่าที่ผิดปกติพร้อมหน่วย หรือสรุปสัญญาณชีพล่าสุด'
      />

      <SuggestibleTextarea
        voice
        label='การรักษาที่ให้ไปแล้ว'
        rows={2}
        value={draft.treatmentGiven}
        onChange={setText('treatmentGiven')}
        suggestions={REFER_TREATMENT_SUGGESTIONS}
        minChars={2}
        popoverAriaLabel='ตัวอย่างการรักษาที่ให้ไปแล้ว'
        placeholder='ยา / หัตถการ / การดูแลก่อนส่งต่อ'
      />

      <SuggestibleTextarea
        voice
        label='เหตุผลที่ส่งต่อ / สิ่งที่ต้องการให้ช่วยเหลือ'
        rows={2}
        value={draft.requirement}
        onChange={setText('requirement')}
        suggestions={REFER_REASON_SUGGESTIONS}
        minChars={2}
        popoverAriaLabel='ตัวอย่างเหตุผลการส่งต่อ'
        placeholder='ระบุสิ่งที่ต้องการให้ปลายทางดำเนินการ'
        required
      />

      <div
        className='grid grid-cols-1 sm:grid-cols-2'
        style={{ gap: 'var(--dim-space-300)' }}
      >
        <Select
          label='หมายเหตุโรคติดต่อที่ต้องแจ้ง'
          value={draft.communicableNotify}
          onChange={set('communicableNotify')}
          options={COMMUNICABLE_NOTIFY_OPTIONS}
          placeholder='เลือกสถานะการแจ้งโรคติดต่อ'
          size='sm'
        />
        <InputField
          label='ผู้ส่ง (แพทย์ผู้รับผิดชอบ)'
          value={draft.sender}
          onChange={set('sender')}
          showLeadingIcon={false}
          placeholder='ชื่อแพทย์ผู้ส่งต่อ'
          required
        />
      </div>

      {draft.communicableNotify === 'pending' && (
        <Alert
          type='error'
          title='ยังไม่ได้แจ้งงานระบาดวิทยา'
          subtext='ผู้รับบริการเข้าข่ายโรคติดต่อที่ต้องแจ้ง — ต้องแจ้งงานระบาดวิทยาก่อนหรือพร้อมกับการส่งต่อ'
          showCloseButton={false}
          style={{ maxWidth: '100%' }}
        />
      )}
    </div>
  );
}

export function isObservationExternalReferIncomplete(draft) {
  if (!draft) return true;
  if (!draft.toFacility) return true;
  if (!String(draft.symptom || '').trim()) return true;
  if (!String(draft.requirement || '').trim()) return true;
  if (!String(draft.sender || '').trim()) return true;
  return false;
}

export function externalReferHospitalLabel(draft) {
  if (!draft) return '';
  return facilityMeta(draft.toFacility)?.label || draft.toFacilityOther || '';
}
