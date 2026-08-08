import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import FileUploadField from '@/components/forms/FileUploadField';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { Step1History, Step5Orders } from '@/components/forms/TreatmentSteps';
import DotCalendarLog from '@/pages/clinic/tb/DotCalendarLog';
import {
  TopicHeader, Field, StepCard, Banner, ErrorNote, ReadOnlyBanner, EmptyPanel,
} from '@/pages/clinic/tb/tbShared';
import {
  TB_SYMPTOM_ITEMS,
  TB_SPUTUM_COLORS,
  TB_BCG_OPTIONS,
  TB_DIAGNOSIS_STATUS,
  TB_FINAL_STATUS,
  TB_DOCTOR_OPTIONS,
  TB_APPOINTMENT_TIMES,
  TB_DOC_TYPES,
  TB_UPLOAD_ACCEPT,
  TB_UPLOAD_MAX_MB,
  validateTbUpload,
  resolveTbDocType,
  isTbSlotBooked,
  TB_HISTORY_SUGGESTIONS,
  TB_EXAM_SUGGESTIONS,
  TB_DIAGNOSIS_SUGGESTIONS,
  TB_ADVICE_SUGGESTIONS,
  TB_APPOINTMENT_SUGGESTIONS,
  TB_OVERRIDE_SUGGESTIONS,
  TB_DOT_NOTE_SUGGESTIONS,
  TB_DOT_EDIT_REASON_SUGGESTIONS,
  TB_NO_APPOINTMENT_SUGGESTIONS,
  TB_PRIOR_TREATMENT_SUGGESTIONS,
  TB_OBSERVER_NAME_SUGGESTIONS,
  TB_CURRENT_USER,
} from '@/data/tbVisits';
import { getTbTriageByHn } from '@/data/tbQueue';
import {
  TB_REGIMENS,
  TB_DISEASE_SITES,
  TB_EP_SITES,
  resolveTbRegimen,
  formatTbDate,
} from '@/data/tbRegistry';
import { TB_PATIENT_TYPES, resolveTbPatientType } from '@/data/tbQueue';
import {
  DOT_FREQUENCIES,
  DOT_OBSERVER_TYPES,
  DOT_DAY_STATUSES,
  resolveDotObserverType,
  resolveDotDayStatus,
  computeDotAdherence,
} from '@/data/tbDotLog';

/* TbSteps — ตัวเนื้อ 6 ขั้นตอนของ "บันทึกการตรวจรักษาคลินิกวัณโรค"
   (TOR §1.10.4.3–.7) เสียบเข้า TreatmentFormShell เหมือน AncSteps /
   HivStiSteps. ลำดับขั้นถูกล็อกไว้แล้วโดย getTbCompletedSteps() ใน
   tbVisits.js — ชื่อ field ทุกตัวต้องตรงกับ DEFAULT_TB_VISIT ไม่งั้น
   stepper จะไม่ติ๊กและไม่มี error ให้เห็น:

     [0] symptoms / bcgHistory / historyNote
     [1] physicalExamNote / lungExamNote
     [2] diagnosisStatus + diseaseSite
     [3] regimen | labs | xrayOrders | medications
     [4] attachments
     [5] doctor + finalStatus

   แผงคำสั่งการรักษา (ขั้นที่ 4) เสียบ <Step5Orders> ของ CPOE ตรง ๆ —
   DEFAULT_TB_VISIT ถือ contract ของมันครบ (orderCategory / medications /
   labs / xrayOrders / procedureOrders / consultOrders / showAllergyAlert)
   จึงไม่ต้องเขียน CPOE ใหม่. ทุกขั้นเป็น controlled view บน `form`
   ก้อนเดียวที่ TbFormPage เป็นเจ้าของ; ขั้นที่แตะ store (ขึ้นทะเบียน /
   DOT) เรียก callback ของหน้าเพื่อ bump tick. */

const isoFromDate = (d) => (d ? d.toISOString().slice(0, 10) : '');
const todayIso = () => new Date().toISOString().slice(0, 10);

/* แพ้ยา/โรคประจำตัวมาได้ 2 ทรง — string (คิววัณโรค) กับ { name, severity }
   (เวชระเบียน MR ที่แผง CPOE ใช้). ดึงชื่อออกมาให้เป็นทรงเดียว. */
const nameOf = (item) => (typeof item === 'string' ? item : (item?.name || ''));

const InfoPanel = ({ children }) => (
  <div
    className='flex flex-col w-full'
    style={{
      gap: 'var(--dim-space-200, 8px)',
      paddingTop: 'var(--dim-space-400, 16px)',
      paddingBottom: 'var(--dim-space-400, 16px)',
      paddingLeft: 'var(--dim-space-400, 16px)',
      paddingRight: 'var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #C5EDDA)',
    }}
  >
    {children}
  </div>
);

const KeyValue = ({ label, value }) => (
  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
    <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>{label}</span>
    <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)' }}>{value || '—'}</span>
  </div>
);

/* ── ขั้นที่ 1 — ผลการซักประวัติ + อาการวัณโรค (TOR 1.10.4.3) ──────── */

export const TbStep1History = ({ form, setForm, patient, hn, readOnly }) => {
  const triage = useMemo(() => getTbTriageByHn(hn), [hn]);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const toggleSymptom = (key) => setForm((f) => ({
    ...f,
    symptoms: { ...f.symptoms, [key]: !f.symptoms?.[key] },
  }));

  const symptomCount = Object.values(form.symptoms || {}).filter(Boolean).length;

  return (
    <StepCard>
      {/* ผลซักประวัติจากจุดคัดกรอง — อ่านอย่างเดียว ไม่ให้กรอกซ้ำ */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='monitor_heart'>สัญญาณชีพและบันทึกพยาบาลจากจุดคัดกรอง (อ่านอย่างเดียว)</TopicHeader>
        {triage ? (
          <InfoPanel>
            <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
              <KeyValue label='ความดันโลหิต (mmHg)' value={triage.vitals.bp} />
              <KeyValue label='ชีพจร (ครั้ง/นาที)' value={triage.vitals.hr} />
              <KeyValue label='อุณหภูมิ (°C)' value={triage.vitals.temp} />
              <KeyValue label='อัตราหายใจ (ครั้ง/นาที)' value={triage.vitals.rr} />
              <KeyValue label='SpO₂ (%)' value={triage.vitals.spo2} />
              <KeyValue label='น้ำหนัก (กก.)' value={triage.vitals.weight} />
              <KeyValue label='ส่วนสูง (ซม.)' value={triage.vitals.height} />
            </div>
            <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
              บันทึกพยาบาล: {triage.nurseNote}
            </span>
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
              บันทึกโดย {triage.recordedBy} · {triage.recordedAt} — แก้ไขได้ที่จุดคัดกรองเท่านั้น
            </span>
          </InfoPanel>
        ) : (
          <EmptyPanel
            icon='monitor_heart'
            title='ยังไม่มีผลการคัดกรองของผู้รับบริการรายนี้'
            subtitle='ให้จุดคัดกรองบันทึกสัญญาณชีพก่อน หรือบันทึกอาการวัณโรคด้านล่างต่อได้เลย'
          />
        )}
      </div>

      {/* แพ้ยา / โรคประจำตัว — จาก MR profile */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='warning'>ประวัติแพ้ยาและโรคประจำตัว</TopicHeader>
        <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {(patient?.drugAllergies || []).length === 0 ? (
            <ColorfulBadge style='green' size='small' hierarchy='secondary'>ไม่มีประวัติแพ้ยา</ColorfulBadge>
          ) : (patient.drugAllergies).map((a, i) => (
            <ColorfulBadge key={`${nameOf(a)}-${i}`} style='red' size='small' hierarchy='secondary'>
              แพ้ {nameOf(a)}
            </ColorfulBadge>
          ))}
          {(patient?.chronicDiseases || []).map((c, i) => (
            <ColorfulBadge key={`${nameOf(c)}-${i}`} style='orange' size='small' hierarchy='secondary'>
              {nameOf(c)}
            </ColorfulBadge>
          ))}
        </div>
      </div>

      {/* อาการสงสัยวัณโรค */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='pulmonology'>อาการสงสัยวัณโรค</TopicHeader>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          {TB_SYMPTOM_ITEMS.map((item) => (
            <SelectableTag
              key={item.key}
              label={item.label}
              size='lg'
              selected={!!form.symptoms?.[item.key]}
              onClick={() => { if (!readOnly) toggleSymptom(item.key); }}
            />
          ))}
        </div>
        {symptomCount >= 3 && (
          <Banner tone='warning' icon='warning'>
            พบอาการเข้าได้กับวัณโรค {symptomCount} ข้อ — ควรส่งเสมหะ AFB 2–3 ครั้ง และถ่ายภาพรังสีทรวงอกในขั้นตอนสั่งการรักษา
          </Banner>
        )}
        <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Field label='ระยะเวลาที่มีอาการ (สัปดาห์)'>
            <InputField
              value={form.symptomDurationWeeks}
              onChange={set('symptomDurationWeeks')}
              type='number'
              placeholder='เช่น 3'
              showLabel={false}
              showHelperText={false}
              disabled={readOnly}
            />
          </Field>
          <Field label='ลักษณะเสมหะ'>
            <Select
              showLabel={false}
              showHelperText={false}
              searchable={false}
              size='lg'
              value={form.sputumColor}
              onChange={set('sputumColor')}
              options={TB_SPUTUM_COLORS}
              placeholder='เลือกลักษณะเสมหะ'
              disabled={readOnly}
            />
          </Field>
          <Field label='ประวัติวัคซีน BCG'>
            <Select
              showLabel={false}
              showHelperText={false}
              searchable={false}
              size='lg'
              value={form.bcgHistory}
              onChange={set('bcgHistory')}
              options={TB_BCG_OPTIONS}
              placeholder='เลือกประวัติ BCG'
              disabled={readOnly}
            />
          </Field>
        </div>
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='file-text'>ประวัติการเจ็บป่วย ครอบครัว พฤติกรรม และผู้สัมผัสโรค</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.historyNote}
          onChange={(e) => set('historyNote')(e.target.value)}
          suggestions={TB_HISTORY_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น มีประวัติสัมผัสผู้ป่วยวัณโรคร่วมบ้าน · เคยรักษาวัณโรคมาก่อน · สูบบุหรี่/ดื่มสุรา'
          disabled={readOnly}
        />
      </div>

      {/* ประวัติการรักษาย้อนหลัง (EMR read-only จาก CPOE) */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='history'>ประวัติการรักษาย้อนหลัง (EMR)</TopicHeader>
        <Step1History patient={patient} />
      </div>
    </StepCard>
  );
};

/* ── ขั้นที่ 2 — ตรวจร่างกาย / EMR (TOR 1.10.4.3) ─────────────────── */

export const TbStep2Examination = ({ form, setForm, readOnly }) => {
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  return (
    <StepCard>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='pulmonology'>ตรวจปอดและระบบทางเดินหายใจ</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.lungExamNote}
          onChange={(e) => set('lungExamNote')(e.target.value)}
          suggestions={TB_EXAM_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น ฟังปอดพบ crepitation บริเวณปอดขวาส่วนบน'
          disabled={readOnly}
        />
      </div>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='stethoscope'>ตรวจร่างกายทั่วไป</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.physicalExamNote}
          onChange={(e) => set('physicalExamNote')(e.target.value)}
          suggestions={TB_EXAM_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น ต่อมน้ำเหลืองที่คอโต 2 ซม. · BMI 17.5 · ไม่พบนิ้วปุ้ม'
          disabled={readOnly}
        />
      </div>
    </StepCard>
  );
};

/* ── ขั้นที่ 3 — วินิจฉัย + ขึ้นทะเบียน (TOR 1.10.4.6) ────────────── */

export const TbStep3Diagnosis = ({
  form, setForm, hn, readOnly, registration, onRegister, registerError, onClearRegisterError,
  duplicateExisting,
}) => {
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const [regDraft, setRegDraft] = useState(() => ({
    patientType: '',
    registeredDate: todayIso(),
    doctor: '',
    priorTreatment: '',
  }));

  const needsEpSite = form.diseaseSite === 'extrapulmonary';
  const epMissing = needsEpSite && !form.epSite;

  const submitRegistration = () => {
    onRegister({
      hn,
      patientType: regDraft.patientType,
      registeredDate: regDraft.registeredDate,
      diseaseSite: form.diseaseSite,
      epSite: form.epSite,
      regimen: form.regimen,
      doctor: regDraft.doctor,
      priorTreatment: regDraft.priorTreatment,
    });
  };

  return (
    <StepCard>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='clipboard'>ชนิดวัณโรค</TopicHeader>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          {TB_DISEASE_SITES.map((s) => (
            <SelectableTag
              key={s.value}
              label={s.label}
              size='lg'
              selected={form.diseaseSite === s.value}
              onClick={() => { if (!readOnly) set('diseaseSite')(s.value); }}
            />
          ))}
        </div>
        {needsEpSite && (
          <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Field
              label='ตำแหน่งวัณโรคนอกปอด'
              required
              error={epMissing ? 'เลือกชนิด "นอกปอด" แล้วต้องระบุตำแหน่งด้วย' : ''}
            >
              <Select
                showLabel={false}
                showHelperText={false}
                searchable={false}
                size='lg'
                value={form.epSite}
                onChange={set('epSite')}
                options={TB_EP_SITES.map((s) => ({ value: s, label: s }))}
                placeholder='เลือกตำแหน่ง'
                disabled={readOnly}
              />
            </Field>
          </div>
        )}
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='clipboard-list'>ผลการวินิจฉัย</TopicHeader>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          {TB_DIAGNOSIS_STATUS.map((s) => (
            <SelectableTag
              key={s.value}
              label={s.label}
              size='lg'
              selected={form.diagnosisStatus === s.value}
              onClick={() => { if (!readOnly) set('diagnosisStatus')(s.value); }}
            />
          ))}
        </div>
        <SuggestibleTextarea
          voice
          value={form.diagnosisNote}
          onChange={(e) => set('diagnosisNote')(e.target.value)}
          suggestions={TB_DIAGNOSIS_SUGGESTIONS}
          minChars={3}
          placeholder='สรุปการวินิจฉัยและเหตุผล เช่น Pulmonary TB, smear positive — เริ่มสูตร CAT-1'
          disabled={readOnly}
        />
      </div>

      {/* ขึ้นทะเบียนผู้ป่วยวัณโรค — TOR 1.10.4.6 (บันทึก) */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='contract'>ทะเบียนผู้ป่วยวัณโรค</TopicHeader>

        {registration ? (
          <InfoPanel>
            <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-content-default, #363B3F)' }}>
                เลขที่ขึ้นทะเบียน {registration.regNo}
              </span>
              <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
                {resolveTbPatientType(registration.patientType)?.label || registration.patientType}
              </ColorfulBadge>
              <ColorfulBadge style='blue' size='small' hierarchy='secondary'>
                เดือนที่ {registration.treatmentMonth ?? 0}
              </ColorfulBadge>
            </div>
            <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
              <KeyValue label='วันที่ขึ้นทะเบียน' value={formatTbDate(registration.registeredDate)} />
              <KeyValue label='วันที่เริ่มการรักษา' value={registration.treatmentStartDate ? formatTbDate(registration.treatmentStartDate) : 'ยังไม่เริ่มยา'} />
              <KeyValue label='ชนิดวัณโรค' value={TB_DISEASE_SITES.find((s) => s.value === registration.diseaseSite)?.label} />
              <KeyValue label='สูตรยาปัจจุบัน' value={resolveTbRegimen(registration.regimen)?.label} />
              <KeyValue label='แพทย์ผู้ดูแล' value={registration.doctor} />
            </div>
            <Link
              to={{ pathname: '/clinic/tb/registry', state: { regNo: registration.regNo } }}
              style={{
                fontSize: 'var(--type-size-sm, 14px)',
                color: 'var(--text-brandPrimary-default, #007549)',
                textDecoration: 'none',
                fontWeight: 'var(--type-weight-medium, 500)',
              }}
            >
              เปิดทะเบียนฉบับเต็ม (7 แท็บ) →
            </Link>
          </InfoPanel>
        ) : readOnly ? (
          <ReadOnlyBanner>
            สิทธิ์ของคุณดูได้อย่างเดียว — ไม่สามารถขึ้นทะเบียนผู้ป่วยวัณโรคได้
          </ReadOnlyBanner>
        ) : (
          <>
            <Banner tone='info' icon='info'>
              ผู้รับบริการรายนี้ยังไม่มีทะเบียนวัณโรคที่เปิดอยู่ — บันทึกการขึ้นทะเบียนได้จากแบบฟอร์มด้านล่าง
            </Banner>
            <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='ประเภทผู้ป่วย' required>
                <Select
                  showLabel={false}
                  showHelperText={false}
                  searchable={false}
                  size='lg'
                  value={regDraft.patientType}
                  onChange={(v) => { setRegDraft((d) => ({ ...d, patientType: v })); onClearRegisterError(); }}
                  options={TB_PATIENT_TYPES.map((t) => ({ value: t.value, label: `${t.label} — ${t.description}` }))}
                  placeholder='เลือกประเภทผู้ป่วย'
                />
              </Field>
              <Field label='วันที่ขึ้นทะเบียน' required>
                <DatePicker
                  value={regDraft.registeredDate ? new Date(regDraft.registeredDate) : null}
                  onChange={(d) => { setRegDraft((prev) => ({ ...prev, registeredDate: isoFromDate(d) })); onClearRegisterError(); }}
                  placeholder='เลือกวันที่'
                  showLabel={false}
                  showHelperText={false}
                />
              </Field>
              <Field label='แพทย์ผู้ดูแล'>
                <Select
                  showLabel={false}
                  showHelperText={false}
                  searchable={false}
                  size='lg'
                  value={regDraft.doctor}
                  onChange={(v) => setRegDraft((d) => ({ ...d, doctor: v }))}
                  options={TB_DOCTOR_OPTIONS}
                  placeholder='เลือกแพทย์'
                />
              </Field>
            </div>
            <SuggestibleTextarea
              label='ประวัติการรักษาวัณโรคเดิม'
              voice
              value={regDraft.priorTreatment}
              onChange={(e) => setRegDraft((d) => ({ ...d, priorTreatment: e.target.value }))}
              suggestions={TB_PRIOR_TREATMENT_SUGGESTIONS}
              minChars={3}
              placeholder='เช่น ไม่เคยรักษาวัณโรคมาก่อน / เคยรักษาหายจากทะเบียน 18/2565'
            />

            {registerError === 'duplicate' && duplicateExisting ? (
              <Banner
                tone='danger'
                icon='error'
                action={(
                  <Link
                    to={{ pathname: '/clinic/tb/registry', state: { regNo: duplicateExisting.regNo } }}
                    style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-brandPrimary-default, #007549)', textDecoration: 'none' }}
                  >
                    เปิดทะเบียนเดิม
                  </Link>
                )}
              >
                ผู้รับบริการมีทะเบียน {duplicateExisting.regNo} ที่ยังไม่ปิด — ให้ใช้ทะเบียนเดิมแทนการขึ้นทะเบียนซ้ำ
              </Banner>
            ) : registerError ? (
              <ErrorNote>{registerError}</ErrorNote>
            ) : null}

            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <BrandSubdueButton variant='fill' size='md' leadingIcon='person_add' onClick={submitRegistration}>
                บันทึกขึ้นทะเบียนผู้ป่วยวัณโรค
              </BrandSubdueButton>
              <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                ต้องระบุประเภทผู้ป่วย · วันขึ้นทะเบียน · ชนิดวัณโรค ให้ครบก่อนบันทึก
              </span>
            </div>
          </>
        )}
      </div>
    </StepCard>
  );
};

/* ── ขั้นที่ 4 — สั่งการรักษา (CPOE) + สูตรยา + DOT (TOR 1.10.4.7) ── */

export const TbStep4Orders = ({
  form, setForm, patient, cardPatient, readOnly, registration,
  dotConfig, dotLog, onSaveDotConfig, onSaveDotDay, onGoToRegistration,
}) => {
  const [dayTarget, setDayTarget] = useState(null); // { key, entry }
  const [dayDraft, setDayDraft] = useState({ status: '', note: '', editReason: '' });
  const [dayError, setDayError] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [configDraft, setConfigDraft] = useState({ frequency: '', observerType: '', observerName: '' });
  const [configError, setConfigError] = useState('');

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const regimen = resolveTbRegimen(form.regimen);
  const allergyNames = useMemo(
    () => (patient?.drugAllergies || []).map(nameOf),
    [patient],
  );
  /* ตัวยาในสูตรที่ชนกับประวัติแพ้ยา — เทียบชื่อสามัญแบบไม่สนตัวพิมพ์. */
  const conflictDrugs = useMemo(() => {
    if (!regimen) return [];
    return regimen.drugs.filter((d) =>
      allergyNames.some((a) => a.toLowerCase().includes(String(d).toLowerCase())));
  }, [regimen, allergyNames]);
  const overrideMissing = conflictDrugs.length > 0 && !form.allergyOverrideNote.trim();

  const adherence = useMemo(
    () => (registration ? computeDotAdherence(registration.id) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registration, dotLog],
  );

  const openDay = (key, entry) => {
    setDayTarget({ key, entry });
    setDayDraft({ status: entry?.status || 'taken', note: entry?.note || '', editReason: '' });
    setDayError('');
  };

  const commitDay = () => {
    if (!dayDraft.status) { setDayError('เลือกสถานะการกินยาก่อน'); return; }
    const result = onSaveDotDay(dayTarget.key, dayDraft);
    if (!result?.ok) {
      setDayError(result?.error || 'บันทึกไม่สำเร็จ');
      return;
    }
    setDayTarget(null);
  };

  const openConfig = () => {
    setConfigDraft({
      frequency: dotConfig?.frequency || 'daily',
      observerType: dotConfig?.observerType || '',
      observerName: dotConfig?.observerName || '',
    });
    setConfigError('');
    setConfigOpen(true);
  };

  const commitConfig = () => {
    if (!configDraft.frequency || !configDraft.observerType || !configDraft.observerName.trim()) {
      setConfigError('ต้องระบุความถี่ ประเภทผู้กำกับ และชื่อผู้กำกับให้ครบ');
      return;
    }
    onSaveDotConfig({ ...configDraft, observerName: configDraft.observerName.trim() });
    setForm((f) => ({
      ...f,
      dotObserverType: configDraft.observerType,
      dotObserverName: configDraft.observerName.trim(),
      votEnabled: configDraft.observerType === 'vot' ? true : f.votEnabled,
    }));
    setConfigOpen(false);
  };

  return (
    <StepCard>
      {/* บันทึก DOT รายวัน */}
      <Popup
        open={!!dayTarget}
        onClose={() => setDayTarget(null)}
        title='บันทึกการกำกับการกินยา (DOT) รายวัน'
        subtitle={dayTarget ? `วันที่ ${formatTbDate(dayTarget.key)}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setDayTarget(null) }}
        primaryAction={{ label: 'บันทึก', onClick: commitDay }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {DOT_DAY_STATUSES.map((s) => (
              <SelectableTag
                key={s.value}
                label={s.label}
                size='lg'
                selected={dayDraft.status === s.value}
                onClick={() => { setDayDraft((d) => ({ ...d, status: s.value })); setDayError(''); }}
              />
            ))}
          </div>
          <SuggestibleTextarea
            label='บันทึกเพิ่มเติม'
            voice
            value={dayDraft.note}
            onChange={(e) => setDayDraft((d) => ({ ...d, note: e.target.value }))}
            suggestions={TB_DOT_NOTE_SUGGESTIONS}
            minChars={3}
            placeholder='เช่น กินยาต่อหน้า อสส. ครบถ้วน ไม่มีอาการข้างเคียง'
          />
          {dayTarget?.entry && (
            <SuggestibleTextarea
              label='เหตุผลการแก้ไขย้อนหลัง'
              required
              voice
              value={dayDraft.editReason}
              onChange={(e) => { setDayDraft((d) => ({ ...d, editReason: e.target.value })); setDayError(''); }}
              suggestions={TB_DOT_EDIT_REASON_SUGGESTIONS}
              minChars={2}
              placeholder='วันนี้มีบันทึกอยู่แล้ว — ต้องระบุเหตุผลที่แก้ไข'
            />
          )}
          {dayError && <ErrorNote>{dayError}</ErrorNote>}
          {dayTarget?.entry && (
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
              บันทึกเดิม: {resolveDotDayStatus(dayTarget.entry.status)?.label || dayTarget.entry.status}
              {dayTarget.entry.recordedBy ? ` · โดย ${dayTarget.entry.recordedBy}` : ''}
            </span>
          )}
        </div>
      </Popup>

      {/* ตั้งค่า DOT schedule */}
      <Popup
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        title='กำหนดรูปแบบการกำกับการกินยา (DOT)'
        subtitle={registration ? `ทะเบียน ${registration.regNo}` : ''}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setConfigOpen(false) }}
        primaryAction={{ label: 'บันทึก DOT schedule', onClick: commitConfig }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Field label='ความถี่การกำกับ' required>
            <Select
              showLabel={false}
              showHelperText={false}
              searchable={false}
              size='lg'
              value={configDraft.frequency}
              onChange={(v) => { setConfigDraft((d) => ({ ...d, frequency: v })); setConfigError(''); }}
              options={DOT_FREQUENCIES}
              placeholder='เลือกความถี่'
            />
          </Field>
          <Field label='ประเภทผู้กำกับการกินยา' required>
            <Select
              showLabel={false}
              showHelperText={false}
              searchable={false}
              size='lg'
              value={configDraft.observerType}
              onChange={(v) => { setConfigDraft((d) => ({ ...d, observerType: v })); setConfigError(''); }}
              options={DOT_OBSERVER_TYPES}
              placeholder='เลือกประเภทผู้กำกับ'
            />
          </Field>
          <Field label='ชื่อผู้กำกับการกินยา' required>
            <SuggestibleTextarea
              voice
              rows={2}
              minHeight={72}
              value={configDraft.observerName}
              onChange={(e) => { setConfigDraft((d) => ({ ...d, observerName: e.target.value })); setConfigError(''); }}
              suggestions={TB_OBSERVER_NAME_SUGGESTIONS}
              minChars={2}
              placeholder='ระบุชื่อ-สกุลผู้กำกับ และความสัมพันธ์'
            />
          </Field>
          {configError && <ErrorNote>{configError}</ErrorNote>}
          {(dotConfig?.history || []).length > 0 && (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                ประวัติการเปลี่ยน schedule
              </span>
              {dotConfig.history.map((h, i) => (
                <span key={`${h.at}-${i}`} style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  {h.at} · {DOT_FREQUENCIES.find((f) => f.value === h.frequency)?.label || h.frequency} · {h.observerName}
                </span>
              ))}
            </div>
          )}
        </div>
      </Popup>

      {/* สูตรยาวัณโรค */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='medication'>สูตรยาวัณโรค (CAT-1 … CAT-4)</TopicHeader>
        <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Field label='สูตรยา'>
            <Select
              showLabel={false}
              showHelperText={false}
              searchable={false}
              size='lg'
              value={form.regimen}
              onChange={set('regimen')}
              options={TB_REGIMENS.map((r) => ({ value: r.value, label: r.label, subtext: r.description }))}
              placeholder='เลือกสูตรยามาตรฐาน'
              disabled={readOnly}
            />
          </Field>
          <Field label='น้ำหนักที่ใช้คำนวณขนาดยา (กก.)'>
            <InputField
              value={form.regimenWeightKg}
              onChange={set('regimenWeightKg')}
              type='number'
              placeholder='เช่น 58.5'
              showLabel={false}
              showHelperText={false}
              disabled={readOnly}
            />
          </Field>
        </div>
        {regimen && (
          <InfoPanel>
            <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)', color: 'var(--text-content-default, #363B3F)' }}>
              {regimen.label} · ระยะเวลารักษา {regimen.months} เดือน
            </span>
            <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
              {regimen.description} — ตัวยา: {regimen.drugs.join(', ')}
            </span>
          </InfoPanel>
        )}
        {conflictDrugs.length > 0 && (
          <>
            <Banner tone='danger' icon='error'>
              สูตรยาที่เลือกมี {conflictDrugs.join(', ')} ซึ่งตรงกับประวัติแพ้ยาของผู้รับบริการ —
              ต้องบันทึกเหตุผลการยืนยันใช้ยา (override) ก่อนจึงจะบันทึกการรักษาได้
            </Banner>
            <SuggestibleTextarea
              label='เหตุผลการยืนยันใช้ยาแม้มีประวัติแพ้'
              required
              voice
              value={form.allergyOverrideNote}
              onChange={(e) => set('allergyOverrideNote')(e.target.value)}
              suggestions={TB_OVERRIDE_SUGGESTIONS}
              minChars={3}
              placeholder='เช่น ปรึกษาอายุรแพทย์โรคติดเชื้อแล้ว ให้ใช้สูตรเดิมร่วมกับ antihistamine'
              disabled={readOnly}
            />
            {overrideMissing && <ErrorNote>ยังไม่ได้ระบุเหตุผลการยืนยันใช้ยา — บันทึกยืนยันไม่ได้</ErrorNote>}
          </>
        )}
      </div>

      {/* กำกับการทานยา (DOT / VOT) */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader
          icon='event_available'
          trailing={!readOnly && registration ? (
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='tune' onClick={openConfig}>
              ตั้งค่าการกำกับการกินยา
            </BrandSubdueButton>
          ) : null}
        >
          การกำกับการกินยา (DOT / VOT)
        </TopicHeader>

        {!registration ? (
          <EmptyPanel
            icon='contract'
            title='ยังไม่ได้ขึ้นทะเบียนผู้ป่วยวัณโรค'
            subtitle='ปฏิทิน DOT ผูกกับเลขที่ขึ้นทะเบียน — ต้องขึ้นทะเบียนในขั้นตอนที่ 3 ก่อน'
            action={(
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='arrow_forward' onClick={onGoToRegistration}>
                ไปขั้นตอนที่ 3 — วินิจฉัย + ขึ้นทะเบียน
              </BrandSubdueButton>
            )}
          />
        ) : (
          <>
            {dotConfig ? (
              <InfoPanel>
                <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
                  <KeyValue label='ความถี่' value={DOT_FREQUENCIES.find((f) => f.value === dotConfig.frequency)?.label} />
                  <KeyValue label='ประเภทผู้กำกับ' value={resolveDotObserverType(dotConfig.observerType)?.label} />
                  <KeyValue label='ผู้กำกับการกินยา' value={dotConfig.observerName} />
                  <KeyValue
                    label='ความสม่ำเสมอสะสม'
                    value={adherence ? `${adherence.percent}% (กินยา ${adherence.taken}/${adherence.total} วัน · ขาด ${adherence.missed} วัน)` : 'ยังไม่มีข้อมูล'}
                  />
                </div>
              </InfoPanel>
            ) : (
              <Banner tone='warning' icon='warning'>
                ยังไม่ได้กำหนดผู้กำกับการกินยาสำหรับทะเบียนนี้ — กด "ตั้งค่าการกำกับการกินยา" ก่อนเริ่มบันทึก DOT
              </Banner>
            )}

            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <SelectableTag
                label='เปิดใช้ VOT (Video Observed Therapy) ผ่าน Telemedicine'
                size='lg'
                selected={!!form.votEnabled}
                onClick={() => { if (!readOnly) setForm((f) => ({ ...f, votEnabled: !f.votEnabled })); }}
              />
            </div>

            <DotCalendarLog
              log={dotLog}
              startDate={registration.treatmentStartDate}
              onDayClick={openDay}
              readOnly={readOnly || !dotConfig}
            />
          </>
        )}
      </div>

      {/* CPOE — ยา / Lab / X-ray / หัตถการ / ปรึกษา */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='clipboard-list'>คำสั่งการรักษา (CPOE)</TopicHeader>
        {readOnly ? (
          <>
            <ReadOnlyBanner>สิทธิ์ของคุณดูได้อย่างเดียว — แผงสั่งการรักษาถูกปิดการแก้ไข</ReadOnlyBanner>
            <div style={{ pointerEvents: 'none', opacity: 0.6 }} aria-disabled='true'>
              <Step5Orders form={form} setForm={setForm} patient={patient} cardPatient={cardPatient} />
            </div>
          </>
        ) : (
          <Step5Orders form={form} setForm={setForm} patient={patient} cardPatient={cardPatient} />
        )}
      </div>
    </StepCard>
  );
};

/* ── ขั้นที่ 5 — เอกสารแนบระหว่างการรักษา (TOR 1.10.4.4) ─────────── */

export const TbStep5Attachments = ({ form, setForm, readOnly }) => {
  const [docType, setDocType] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const addAttachment = () => {
    if (!docType) { setUploadError('เลือกประเภทเอกสารก่อนอัปโหลด'); return; }
    const problem = validateTbUpload(pendingFile);
    if (problem) { setUploadError(problem); return; }
    setUploadError('');
    setForm((f) => ({
      ...f,
      attachments: [
        {
          id: `tbatt-${Date.now()}`,
          docType,
          docTypeLabel: resolveTbDocType(docType)?.label || docType,
          name: pendingFile.name,
          sizeLabel: `${Math.max(1, Math.round((pendingFile.size || 0) / 1024))} KB`,
          uploadedBy: TB_CURRENT_USER.name,
          uploadedAt: new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
          }).format(new Date()),
        },
        ...(f.attachments || []),
      ],
    }));
    setDocType('');
    setPendingFile(null);
  };

  const confirmDelete = () => {
    setForm((f) => ({ ...f, attachments: (f.attachments || []).filter((a) => a.id !== deleteTarget.id) }));
    setDeleteTarget(null);
  };

  return (
    <StepCard>
      <Popup
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title='ลบเอกสารแนบ'
        subtitle={deleteTarget ? `${deleteTarget.docTypeLabel} · ${deleteTarget.name}` : ''}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setDeleteTarget(null) }}
        primaryAction={{ label: 'ยืนยันลบเอกสาร', onClick: confirmDelete, tone: 'danger' }}
      >
        <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
          เอกสารที่ลบแล้วไม่สามารถกู้คืนได้ ต้องการลบใช่หรือไม่?
        </span>
      </Popup>

      {readOnly ? (
        <ReadOnlyBanner>สิทธิ์ของคุณดูได้อย่างเดียว — อัปโหลด/ลบเอกสารแนบไม่ได้</ReadOnlyBanner>
      ) : (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <TopicHeader icon='upload_file'>อัปโหลดเอกสารประกอบการรักษา</TopicHeader>
          <div className='flex items-end flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Field label='ประเภทเอกสาร' required>
              <Select
                showLabel={false}
                showHelperText={false}
                searchable={false}
                size='lg'
                value={docType}
                onChange={(v) => { setDocType(v); setUploadError(''); }}
                options={TB_DOC_TYPES}
                placeholder='เลือกประเภทเอกสาร'
              />
            </Field>
            <Field
              label={`ไฟล์เอกสาร (${TB_UPLOAD_ACCEPT} ไม่เกิน ${TB_UPLOAD_MAX_MB} MB)`}
              required
              error={uploadError}
            >
              <FileUploadField
                accept={TB_UPLOAD_ACCEPT}
                fileName={pendingFile?.name || null}
                onFile={(file) => { setPendingFile(file); setUploadError(''); }}
                onClear={() => setPendingFile(null)}
              />
            </Field>
            <BrandSubdueButton variant='fill' size='md' leadingIcon='upload' onClick={addAttachment}>
              อัปโหลด
            </BrandSubdueButton>
          </div>
        </div>
      )}

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='folder_open'>เอกสารแนบของการตรวจครั้งนี้</TopicHeader>
        {(form.attachments || []).length === 0 ? (
          <EmptyPanel
            icon='folder_open'
            title='ยังไม่มีเอกสารแนบ'
            subtitle={readOnly ? 'ผู้มีสิทธิแก้ไขสามารถอัปโหลดเอกสารได้จากแบบฟอร์มด้านบน' : 'อัปโหลดเอกสารแรกได้จากแบบฟอร์มด้านบน'}
          />
        ) : (
          <Table
            columns={[
              { key: 'docTypeLabel', label: 'ประเภทเอกสาร', flex: true, minWidth: 200 },
              { key: 'name', label: 'ชื่อไฟล์', flex: true, minWidth: 200 },
              { key: 'sizeLabel', label: 'ขนาด' },
              { key: 'uploadedBy', label: 'ผู้อัปโหลด', flex: true, minWidth: 160 },
              { key: 'uploadedAt', label: 'เวลาอัปโหลด', flex: true, minWidth: 190 },
              {
                key: 'actions', label: 'การดำเนินการ', sortable: false,
                render: (row) => (readOnly ? null : (
                  <NeutralSubdueButton size='sm' leadingIcon='delete' onClick={() => setDeleteTarget(row)}>
                    ลบ
                  </NeutralSubdueButton>
                )),
              },
            ]}
            rows={form.attachments}
            rowKey={(r) => r.id}
            emptyMessage='ยังไม่มีเอกสารแนบ'
          />
        )}
      </div>
    </StepCard>
  );
};

/* ── ขั้นที่ 6 — นัดหมาย + สรุป (TOR 1.10.4.5) ────────────────────── */

/* คืนข้อความ error ของนัดหมาย (null = ผ่าน) — ใช้ทั้งใน step และตอนยืนยัน. */
export const validateTbAppointment = (appt) => {
  if (!appt || appt.skipped) return null;
  if (!appt.date && !appt.time) return null; // ยังไม่ได้ตั้งนัด — ไม่บล็อก
  if (!appt.date) return 'ต้องเลือกวันนัดหมายก่อน';
  if (!appt.time) return 'ต้องเลือกเวลานัดหมายก่อน';
  if (appt.date < todayIso()) return 'ไม่สามารถนัดหมายย้อนหลังได้ — เลือกวันที่ตั้งแต่วันนี้เป็นต้นไป';
  if (isTbSlotBooked(appt.date, appt.time)) return `ช่วงเวลา ${appt.time} ของวันที่เลือกเต็มแล้ว — เลือกเวลาอื่น`;
  return null;
};

export const TbStep6Appointment = ({
  form, setForm, readOnly, saveState, confirmError, onSaveDraft, onConfirm, blockingIssue,
}) => {
  const appt = form.appointment || { date: '', time: '', mode: 'onsite', note: '', skipped: false };
  const setAppt = (key) => (value) => setForm((f) => ({
    ...f,
    appointment: { ...(f.appointment || {}), [key]: value },
  }));
  const apptError = validateTbAppointment(appt);

  return (
    <StepCard>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='calendar'>นัดหมายครั้งถัดไป</TopicHeader>

        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <SelectableTag
            label='ไม่นัดครั้งถัดไป'
            size='lg'
            selected={!!appt.skipped}
            onClick={() => { if (!readOnly) setAppt('skipped')(!appt.skipped); }}
          />
          <SelectableTag
            label='นัดที่ศูนย์บริการ (Onsite)'
            size='lg'
            selected={appt.mode === 'onsite'}
            onClick={() => { if (!readOnly) setAppt('mode')('onsite'); }}
          />
          <SelectableTag
            label='นัด Telemedicine / VOT'
            size='lg'
            selected={appt.mode === 'telemedicine'}
            onClick={() => { if (!readOnly) setAppt('mode')('telemedicine'); }}
          />
        </div>

        {appt.skipped ? (
          <SuggestibleTextarea
            label='เหตุผลที่ไม่นัดครั้งถัดไป'
            required
            voice
            value={appt.note}
            onChange={(e) => setAppt('note')(e.target.value)}
            suggestions={TB_NO_APPOINTMENT_SUGGESTIONS}
            minChars={2}
            placeholder='เช่น ครบการรักษา — เตรียมปิดทะเบียน / ส่งต่อสถานพยาบาลอื่น'
            disabled={readOnly}
          />
        ) : (
          <>
            <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='วันนัดหมาย' hint='เลือกวันที่ตั้งแต่วันนี้เป็นต้นไป'>
                <DatePicker
                  value={appt.date ? new Date(appt.date) : null}
                  onChange={(d) => setAppt('date')(isoFromDate(d))}
                  placeholder='เลือกวันที่'
                  showLabel={false}
                  showHelperText={false}
                  disabled={readOnly}
                />
              </Field>
              <Field label='เวลานัดหมาย'>
                <Select
                  showLabel={false}
                  showHelperText={false}
                  searchable={false}
                  size='lg'
                  value={appt.time}
                  onChange={setAppt('time')}
                  options={TB_APPOINTMENT_TIMES.map((t) => ({
                    value: t,
                    label: isTbSlotBooked(appt.date, t) ? `${t} น. (เต็มแล้ว)` : `${t} น.`,
                    disabled: isTbSlotBooked(appt.date, t),
                  }))}
                  placeholder='เลือกเวลา'
                  disabled={readOnly}
                />
              </Field>
            </div>
            {apptError && <ErrorNote>{apptError}</ErrorNote>}
            <SuggestibleTextarea
              label='คำแนะนำที่จะพิมพ์ลงใบนัด'
              voice
              value={appt.note}
              onChange={(e) => setAppt('note')(e.target.value)}
              suggestions={TB_APPOINTMENT_SUGGESTIONS}
              minChars={3}
              placeholder='เช่น นำกล่องยาและสมุดบันทึกการกินยา (DOT) มาด้วยทุกครั้ง'
              disabled={readOnly}
            />
          </>
        )}
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='forum'>คำแนะนำผู้รับบริการและผู้ดูแล</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.adviceNote || ''}
          onChange={(e) => setForm((f) => ({ ...f, adviceNote: e.target.value }))}
          suggestions={TB_ADVICE_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น กินยาต่อหน้าผู้กำกับทุกวัน ห้ามหยุดยาเองแม้อาการดีขึ้น'
          disabled={readOnly}
        />
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <TopicHeader icon='clipboard'>สรุปผลการตรวจครั้งนี้</TopicHeader>
        <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Field label='แพทย์ผู้ตรวจ' required>
            <Select
              showLabel={false}
              showHelperText={false}
              searchable={false}
              size='lg'
              value={form.doctor}
              onChange={(v) => setForm((f) => ({ ...f, doctor: v }))}
              options={TB_DOCTOR_OPTIONS}
              placeholder='เลือกแพทย์ผู้ตรวจ'
              disabled={readOnly}
            />
          </Field>
          <Field label='สถานะสรุปการรักษา' required>
            <Select
              showLabel={false}
              showHelperText={false}
              searchable={false}
              size='lg'
              value={form.finalStatus}
              onChange={(v) => setForm((f) => ({ ...f, finalStatus: v }))}
              options={TB_FINAL_STATUS}
              placeholder='เลือกสถานะ'
              disabled={readOnly}
            />
          </Field>
        </div>

        {blockingIssue && <Banner tone='danger' icon='error'>{blockingIssue}</Banner>}
        {confirmError && <ErrorNote>{confirmError}</ErrorNote>}

        {readOnly ? (
          <ReadOnlyBanner>สิทธิ์ของคุณดูได้อย่างเดียว — ปุ่มบันทึกร่าง/ยืนยันถูกซ่อน</ReadOnlyBanner>
        ) : saveState?.cancelled ? (
          <Banner tone='danger' icon='block'>
            การบันทึกครั้งนี้ถูกยกเลิกแล้ว — เปิดบันทึกใหม่จากหน้าคิวหากต้องการตรวจซ้ำ
          </Banner>
        ) : (
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <NeutralSubdueButton size='md' leadingIcon='save' onClick={onSaveDraft}>
              บันทึกร่าง
            </NeutralSubdueButton>
            <BrandSubdueButton variant='fill' size='md' leadingIcon='check' onClick={onConfirm}>
              ยืนยันการบันทึกการตรวจ
            </BrandSubdueButton>
          </div>
        )}

        {/* แถบ audit ท้ายฟอร์ม — ร่างเมื่อ / ยืนยันเมื่อ / โดยใคร */}
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {saveState?.draftAt ? `บันทึกร่างเมื่อ ${saveState.draftAt} · ${saveState.by}` : 'ยังไม่ได้บันทึกร่าง'}
          </span>
          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {saveState?.confirmedAt ? `ยืนยันการบันทึกเมื่อ ${saveState.confirmedAt} · ${saveState.by}` : 'ยังไม่ได้ยืนยันการบันทึก'}
          </span>
          {saveState?.cancelled && (
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-danger-default, #B91C1C)' }}>
              ยกเลิกโดย {saveState.cancelled.by} · {saveState.cancelled.at} · เหตุผล: {saveState.cancelled.reason}
            </span>
          )}
        </div>
      </div>
    </StepCard>
  );
};
