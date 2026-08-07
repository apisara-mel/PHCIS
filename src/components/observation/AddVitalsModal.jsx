import React from 'react';
import Popup from '@/components/popup/Popup';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import VitalCard, { PressureCard } from '@/components/card/VitalCard';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Alert from '@/components/alert/Alert';
import Icon from '@/components/icons/Icon';
import SelectableCardButton from '@/components/button/SelectableCardButton';
import {
  getOutOfRangeVitals,
  OBSERVATION_PAIN_LEVELS,
  OBSERVATION_PAIN_TONE,
  OBSERVATION_ESI_LEVELS,
} from '@/data/observationMock';
import { getPatientByHN } from '@/data/patientProfiles';

export const VITALS_NOTE_SUGGESTIONS = [
  'พ่นยาครบคอร์ส ผู้ป่วยหายใจสะดวกขึ้น',
  'ผู้ป่วยลุกนั่งได้ดี ไม่มีอาการเวียนศีรษะ',
  'มีอาการเวียนศีรษะเบาลง สัญญาณชีพคงที่',
  'ผู้ป่วยรู้สึกตัวดี ไม่มีอาการแน่นหน้าอกเพิ่ม',
  'วัดซ้ำหลังพักผู้ป่วย 15 นาที ค่าคงที่',
  'ผู้ป่วยมีไข้ต่ำๆ เฝ้าระวังอาการต่อเนื่อง',
];

const SECTION_LABEL = {
  color: 'var(--text-content-default, #363B3F)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-medium, 500)',
};

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

  const outOfRange = getOutOfRangeVitals(form);
  const hasOutOfRange = outOfRange.length > 0;
  const painMissing = !form.pain;
  const esiMissing = form.esi == null || form.esi === '';

  return (
    <Popup
      open={open}
      onClose={onClose}
      title={title}
      size='extraLarge'
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      primaryAction={{ label: 'บันทึกสัญญาณชีพ', onClick: onSubmit, disabled: !isFormValid || hasOutOfRange }}
      /* Space between body groups (patient card · vitals · pain · ESI · note).
         Overrides Popup default --dim-space-400 so sections breathe. */
      bodyStyle={{ gap: 'var(--dim-space-600, 24px)' }}
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

      {/* Pain Score — same 5-level scale as OPD screening */}
      <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <span style={SECTION_LABEL}>
          ระดับความเจ็บปวด (Pain Score)
          <span style={{ color: 'var(--text-input-require, #DC2626)', marginLeft: 'var(--dim-space-100, 4px)' }} aria-hidden>*</span>
        </span>
        <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {OBSERVATION_PAIN_LEVELS.map((p) => {
            const active = form.pain === p.key;
            const tone = OBSERVATION_PAIN_TONE[p.tone];
            return (
              <SelectableCardButton
                key={p.key}
                selected={active}
                onClick={() => setForm({ ...form, pain: p.key })}
                ariaLabel={p.label}
              >
                <span
                  aria-hidden
                  className='inline-flex items-center justify-center shrink-0'
                  style={{
                    width: 'var(--dim-size-900, 36px)',
                    height: 'var(--dim-size-900, 36px)',
                    borderRadius: 'var(--dim-radius-full, 9999px)',
                    background: tone.bg,
                    color: tone.fg,
                  }}
                >
                  <Icon name={p.icon} size={20} />
                </span>
                {p.label}
              </SelectableCardButton>
            );
          })}
        </div>
      </div>

      {/* ESI — Emergency Severity Index (1–5) */}
      <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <span style={SECTION_LABEL}>
          ระดับความเร่งด่วน (ESI)
          <span style={{ color: 'var(--text-input-require, #DC2626)', marginLeft: 'var(--dim-space-100, 4px)' }} aria-hidden>*</span>
        </span>
        <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {OBSERVATION_ESI_LEVELS.map((lv) => {
            const active = Number(form.esi) === lv.lv;
            return (
              <SelectableCardButton
                key={lv.lv}
                selected={active}
                onClick={() => setForm({ ...form, esi: lv.lv })}
                ariaLabel={`ESI ${lv.lv} ${lv.en} ${lv.th}`}
                minHeight={64}
                padX='var(--dim-space-300, 12px)'
              >
                <span className='flex flex-col items-start' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                  <span
                    className='inline-flex items-center whitespace-nowrap'
                    style={{
                      height: 'var(--dim-size-500, 20px)',
                      paddingLeft: 'var(--dim-space-200, 8px)',
                      paddingRight: 'var(--dim-space-200, 8px)',
                      borderRadius: 'var(--dim-radius-full, 9999px)',
                      backgroundColor: lv.bg,
                      color: lv.fg,
                      fontSize: 'var(--type-size-xxs, 11px)',
                      fontWeight: 'var(--type-weight-bold, 700)',
                      lineHeight: 1,
                    }}
                  >
                    Level {lv.lv}
                  </span>
                  <span
                    style={{
                      color: 'var(--text-content-default, #363B3F)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-xs, 12px)',
                      fontWeight: 'var(--type-weight-medium, 500)',
                      lineHeight: 1.3,
                    }}
                  >
                    {lv.th}
                  </span>
                  <span
                    style={{
                      color: 'var(--text-content-tertiary, #858C92)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-xxs, 11px)',
                      lineHeight: 1.2,
                    }}
                  >
                    {lv.en}
                  </span>
                </span>
              </SelectableCardButton>
            );
          })}
        </div>
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

      {hasOutOfRange && (
        <Alert
          type='error'
          title='กรุณาตรวจสอบตัวเลขก่อนบันทึก — ค่าที่กรอกอยู่นอกช่วงที่เป็นไปได้'
          indicators={outOfRange.map((f) => `${f.label}: กรอก ${f.value} ${f.unit} — ค่าที่รับได้คือ ${f.min}–${f.max} ${f.unit}`)}
          showCloseButton={false}
          style={{ maxWidth: '100%' }}
        />
      )}

      {!isFormValid && (
        <p style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>
          กรุณากรอกค่าให้ครบทุกช่อง (ความดัน, ชีพจร, อุณหภูมิ, SpO2, อัตราการหายใจ, Pain Score, ESI) ก่อนบันทึก
        </p>
      )}
      {isFormValid && (painMissing || esiMissing) && (
        <p style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>
          {painMissing && esiMissing
            ? 'เลือกระดับความเจ็บปวดและระดับ ESI ก่อนบันทึก'
            : painMissing
              ? 'เลือกระดับความเจ็บปวด (Pain Score) ก่อนบันทึก'
              : 'เลือกระดับความเร่งด่วน (ESI) ก่อนบันทึก'}
        </p>
      )}
    </Popup>
  );
}
