import React from 'react';
import Popup from '@/components/popup/Popup';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import VitalCard, { PressureCard } from '@/components/card/VitalCard';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import StatusBadge from '@/components/badge/StatusBadge';
import { calculateEwsScore } from '@/data/observationMock';
import { getPatientByHN } from '@/data/patientProfiles';

export const VITALS_NOTE_SUGGESTIONS = [
  'พ่นยาครบคอร์ส ผู้ป่วยหายใจสะดวกขึ้น',
  'ผู้ป่วยลุกนั่งได้ดี ไม่มีอาการเวียนศีรษะ',
  'มีอาการเวียนศีรษะเบาลง สัญญาณชีพคงที่',
  'ผู้ป่วยรู้สึกตัวดี ไม่มีอาการแน่นหน้าอกเพิ่ม',
  'วัดซ้ำหลังพักผู้ป่วย 15 นาที ค่าคงที่',
  'ผู้ป่วยมีไข้ต่ำๆ เฝ้าระวังอาการต่อเนื่อง',
];

/* Shared "วัด Vital Signs ใหม่" popup — first built for ObservationQueuePage's
   quick-log-from-card action, reused as-is by ObservationDetailPage's
   Observation Timeline header button so both entry points share one
   visual + validation contract instead of two hand-rolled forms. Built on
   the design-system Popup (size='extraLarge') so it matches OPD screening's
   own "กราฟสัญญาณชีพ" popup (VitalsGraphPopup) in size and chrome instead of
   a bespoke fixed-width dialog. */
export default function AddVitalsModal({
  open,
  patient,
  form,
  setForm,
  setFieldValid,
  isFormValid,
  onSubmit,
  onClose,
  noteSuggestions = VITALS_NOTE_SUGGESTIONS,
  title = 'วัด Vital Signs ใหม่',
}) {
  if (!patient) return null;

  const ewsRes = calculateEwsScore({
    bpSys: Number(form.bpSys),
    pulse: Number(form.pulse),
    temp: Number(form.temp),
    spo2: Number(form.spo2),
    rr: Number(form.rr),
  });

  return (
    <Popup
      open={open}
      onClose={onClose}
      title={title}
      leading={<span className='material-symbols-outlined text-2xl' style={{ color: 'var(--brand-p700)' }}>monitor_heart</span>}
      size='extraLarge'
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      primaryAction={{ label: 'บันทึกสัญญาณชีพ', onClick: onSubmit, disabled: !isFormValid }}
    >
      <PatientSummaryCard
        avatarUrl={patient.avatar || getPatientByHN(patient.hn)?.avatarUrl}
        avatarAlt={patient.patientName}
        cells={[
          { label: 'ชื่อ-นามสกุล ผู้ป่วย', value: patient.patientName },
          { label: 'HN (Hospital Number)', value: patient.hn },
          { label: 'เตียง', value: patient.bedNo },
        ]}
      />

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
        <PressureCard
          sys={form.bpSys}
          dia={form.bpDia}
          onChange={({ sys, dia }) => setForm({ ...form, bpSys: sys, bpDia: dia })}
          onValidityChange={(v) => setFieldValid('pressure', v)}
        />
        <VitalCard
          label='ชีพจร (Pulse)'
          unit='ครั้ง/นาที'
          required
          value={form.pulse}
          onChange={(val) => setForm({ ...form, pulse: val })}
          onValidityChange={(v) => setFieldValid('pulse', v)}
          hint='ปกติ 60–100 ครั้ง/นาที'
        />
        <VitalCard
          label='อุณหภูมิ (Temp)'
          unit='°C'
          required
          step={0.1}
          value={form.temp}
          onChange={(val) => setForm({ ...form, temp: val })}
          onValidityChange={(v) => setFieldValid('temp', v)}
          hint='ปกติ 36.1–37.2 °C'
        />
        <VitalCard
          label='ออกซิเจนปลายนิ้ว (SpO2)'
          unit='%'
          required
          value={form.spo2}
          onChange={(val) => setForm({ ...form, spo2: val })}
          onValidityChange={(v) => setFieldValid('spo2', v)}
          hint='ปกติ ≥ 95%'
        />
        <VitalCard
          label='อัตราการหายใจ (RR)'
          unit='ครั้ง/นาที'
          required
          value={form.rr}
          onChange={(val) => setForm({ ...form, rr: val })}
          onValidityChange={(v) => setFieldValid('rr', v)}
          hint='ปกติ 12–20 ครั้ง/นาที'
        />
      </div>

      <SuggestibleTextarea
        voice
        label='หมายเหตุเพิ่มเติม / อาการขณะวัด'
        rows={2}
        value={form.note}
        onChange={(e) => setForm({ ...form, note: e.target.value })}
        placeholder='เช่น พ่นยาครบคอร์ส, ผู้ป่วยลุกนั่งได้ดี, มีอาการเวียนศีรษะเบาลง'
        suggestions={noteSuggestions}
        minChars={3}
        popoverAriaLabel='คำแนะนำหมายเหตุการวัดสัญญาณชีพ'
      />

      <div className='p-3 bg-ink-neutral rounded-xl border border-ink-line flex items-center justify-between text-xs text-ink-secondary'>
        <span className='font-semibold text-ink-secondary'>คะแนนเตือนภัยล่วงหน้า (EWS Calculated):</span>
        <StatusBadge style={ewsRes.tier.style} size='small' showDot>
          Score: {ewsRes.score} ({ewsRes.tier.label})
        </StatusBadge>
      </div>
      {!isFormValid && (
        <p style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>
          กรุณากรอกค่าให้ครบทุกช่อง (ความดัน, ชีพจร, อุณหภูมิ, SpO2, อัตราการหายใจ) ก่อนบันทึก
        </p>
      )}
    </Popup>
  );
}
