import React, { useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import FileUploadField from '@/components/forms/FileUploadField';
import TabCapsule from '@/components/tab/TabCapsule';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import Popup from '@/components/popup/Popup';
import { Step1History, Step5Orders } from '@/components/forms/TreatmentSteps';
import {
  NCD_DISEASE_GROUPS,
  resolveNcdGroup,
  NCD_SEVERITY_OPTIONS,
  NCD_ASSESSMENT_TEMPLATES,
  NCD_APPOINTMENT_TIMES,
  isNcdSlotBooked,
  NCD_ILLNESS_HISTORY_SUGGESTIONS,
  NCD_FAMILY_HISTORY_ITEMS,
  NCD_FAMILY_HISTORY_SUGGESTIONS,
  NCD_BEHAVIOR_ITEMS,
  NCD_BEHAVIOR_SUGGESTIONS,
  NCD_PHYSICAL_EXAM_SUGGESTIONS,
  NCD_DIAGNOSIS_SUGGESTIONS,
  NCD_ADVICE_SUGGESTIONS,
  formatNcdDate,
} from '@/data/ncdVisits';

/* NcdSteps — step bodies for บันทึกการตรวจรักษาโรคเฉพาะ NCD (TOR
   1.10.2.3/.4/.5/.7), plugged into the shared TreatmentFormShell scaffold
   exactly like AncSteps does for ANC (playbook §3):

     1. ผลการซักประวัติ   — read-only Step1History (vitals · nurse note ·
                            แพ้ยา · โรคประจำตัว) reused from TreatmentSteps
     2. ประเมิน NCD       — ประวัติเจ็บป่วย / ครอบครัว / พฤติกรรมสุขภาพ +
                            per-disease template selector (TOR 1.10.2.7
                            "ตามรูปแบบที่ผู้ใช้งานกำหนด" — mocked as curated
                            DM / HT / Asthma / COPD templates; wiring the real
                            form-builder is a reported follow-up)
     3. ตรวจร่างกาย       — vitals + FBS / PEFR + per-disease exam notes
     4. วินิจฉัย + สั่งการรักษา — diagnosis fields + the full Step5Orders
                            CPOE (ยา / Lab / X-ray / หัตถการ / consult)
     5. เอกสารแนบ         — upload / preview / remove with type + size
                            validation (TOR 1.10.2.4)
     6. นัดหมาย + ยืนยัน   — follow-up appointment with past-date + slot
                            conflict validation, optional skip, telemed mode,
                            then บันทึกร่าง / ยืนยัน / audit summary

   Every clinician-typed multiline field is a SuggestibleTextarea with
   `voice` + `suggestions` + `minChars` (memory rule — no bare textarea). */

const TopicHeader = ({ icon, children }) => (
  <div className='flex items-center gap-2 w-full'>
    <span className='text-brand-500'><Icon name={icon} size={20} /></span>
    <h2 className='text-base font-bold text-brand-500'>{children}</h2>
  </div>
);

const Field = ({ label, required, children, hint }) => (
  <div className='flex-1 flex flex-col gap-1.5 min-w-0'>
    <div className='flex items-center text-sm text-ink leading-snug'>
      <span>{label}</span>
      {required && <span className='ml-0.5' style={{ color: 'var(--text-input-require)' }}>*</span>}
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

/* ── Step 1 — ผลการซักประวัติ (read-only, TOR 1.10.2.1) ─────────────
   Reuses OPD's MedicalHistoryReadOnlyLayout wholesale: service-date rail,
   vitals panel, อาการป่วย / nurse note, แพ้ยา, โรคประจำตัว — the "เชื่อม
   EMR" here is the same in-app mock data link the OPD record uses. */
export const NcdStep1History = ({ patient }) => (
  <Step1History patient={patient} />
);

/* ── Step 2 — ประเมิน NCD (TOR 1.10.2.7) ──────────────────────────── */
export const NcdStep2Assessment = ({ form, setForm, diseaseGroups = [], readOnly = false }) => {
  const groups = diseaseGroups.length > 0 ? diseaseGroups : NCD_DISEASE_GROUPS.map((g) => g.key);
  const activeKey = form.activeTemplate && groups.includes(form.activeTemplate) ? form.activeTemplate : groups[0];
  const template = NCD_ASSESSMENT_TEMPLATES[activeKey];

  const setNote = (key) => (e) => {
    if (readOnly) return;
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };
  const toggleKeyed = (group, key) => {
    if (readOnly) return;
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: !f[group][key] } }));
  };
  const setAnswer = (fieldKey, value) => {
    if (readOnly) return;
    setForm((f) => ({
      ...f,
      templateAnswers: {
        ...f.templateAnswers,
        [activeKey]: { ...(f.templateAnswers[activeKey] || {}), [fieldKey]: value },
      },
    }));
  };
  const answers = form.templateAnswers[activeKey] || {};

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='file-text'>ประวัติการเจ็บป่วย</TopicHeader>
        <SuggestibleTextarea
          voice
          disabled={readOnly}
          value={form.illnessHistoryNote}
          onChange={setNote('illnessHistoryNote')}
          suggestions={NCD_ILLNESS_HISTORY_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น ควบคุมระดับน้ำตาลได้ดีขึ้น / มีอาการใจสั่นช่วงก่อนมื้ออาหาร'
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='users'>ประวัติครอบครัว</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {NCD_FAMILY_HISTORY_ITEMS.map((item) => (
            <SelectableTag
              key={item.key}
              label={item.label}
              size='lg'
              selected={!!form.familyHistory[item.key]}
              onClick={() => toggleKeyed('familyHistory', item.key)}
            />
          ))}
        </div>
        <SuggestibleTextarea
          voice
          disabled={readOnly}
          value={form.familyHistoryNote}
          onChange={setNote('familyHistoryNote')}
          suggestions={NCD_FAMILY_HISTORY_SUGGESTIONS}
          minChars={3}
          placeholder='รายละเอียดเพิ่มเติม เช่น บิดาเป็นเบาหวานชนิดที่ 2'
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='activity'>พฤติกรรมสุขภาพ</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {NCD_BEHAVIOR_ITEMS.map((item) => (
            <SelectableTag
              key={item.key}
              label={item.label}
              size='lg'
              selected={!!form.behaviorFlags[item.key]}
              onClick={() => toggleKeyed('behaviorFlags', item.key)}
            />
          ))}
        </div>
        <SuggestibleTextarea
          voice
          disabled={readOnly}
          value={form.behaviorNote}
          onChange={setNote('behaviorNote')}
          suggestions={NCD_BEHAVIOR_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น ออกกำลังกายเดินเร็ววันละ 30 นาที / ยังดื่มกาแฟใส่น้ำตาล 3 แก้วต่อวัน'
        />
      </div>

      {/* แบบประเมินตามรูปแบบที่ผู้ใช้งานกำหนด (TOR 1.10.2.7) — one curated
          template per disease group; the capsule row only offers the groups
          this patient is registered with. */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard-list'>แบบประเมินเฉพาะโรค (ตามรูปแบบที่ผู้ใช้งานกำหนด)</TopicHeader>
        <div
          className='flex items-center gap-2'
          style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}
        >
          <Icon name='info' size={14} />
          รูปแบบแบบประเมินกำหนดโดยผู้ดูแลระบบต่อกลุ่มโรค — เลือกกลุ่มโรคเพื่อสลับแบบประเมิน
        </div>
        <div className='flex items-center gap-2 flex-wrap'>
          {groups.map((key) => {
            const g = resolveNcdGroup(key);
            if (!g) return null;
            const touched = Object.keys(form.templateAnswers[key] || {}).length > 0;
            return (
              <TabCapsule
                key={key}
                variant='filter'
                type={touched ? 'success' : 'default'}
                showLeadingIcon={touched}
                label={NCD_ASSESSMENT_TEMPLATES[key]?.label || g.label}
                selected={activeKey === key}
                onClick={() => setForm((f) => ({ ...f, activeTemplate: key }))}
              />
            );
          })}
        </div>

        {template && (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
            {template.fields.map((field) => {
              if (field.type === 'choice') {
                return (
                  <div key={field.key} className='flex items-center justify-between gap-4 w-full flex-wrap'>
                    <span className='text-sm' style={{ color: 'var(--text-content-default, #363B3F)' }}>{field.label}</span>
                    <div className='flex items-center gap-2 shrink-0'>
                      <SelectableTag
                        label='ใช่'
                        size='md'
                        selected={answers[field.key] === true}
                        onClick={() => setAnswer(field.key, true)}
                      />
                      <SelectableTag
                        label='ไม่ใช่'
                        size='md'
                        selected={answers[field.key] === false}
                        onClick={() => setAnswer(field.key, false)}
                      />
                    </div>
                  </div>
                );
              }
              if (field.type === 'select') {
                return (
                  <div key={field.key} className='flex items-start gap-4 w-full flex-wrap'>
                    <Field label={field.label}>
                      <Select
                        showLabel={false}
                        searchable={false}
                        size='lg'
                        disabled={readOnly}
                        value={answers[field.key] || ''}
                        onChange={(v) => setAnswer(field.key, v)}
                        options={field.options}
                        placeholder='เลือกคำตอบ'
                      />
                    </Field>
                  </div>
                );
              }
              return (
                <div key={field.key} className='flex items-start gap-4 w-full flex-wrap'>
                  <Field label={field.label}>
                    <InputField
                      disabled={readOnly}
                      value={answers[field.key] || ''}
                      onChange={(v) => setAnswer(field.key, v)}
                      placeholder={field.placeholder}
                    />
                  </Field>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StepCard>
  );
};

/* ── Step 3 — ตรวจร่างกาย ─────────────────────────────────────────── */
export const NcdStep3Examination = ({ form, setForm, diseaseGroups = [], readOnly = false }) => {
  const setVital = (key) => (value) => {
    if (readOnly) return;
    setForm((f) => ({ ...f, vitals: { ...f.vitals, [key]: value } }));
  };
  const set = (key) => (value) => {
    if (readOnly) return;
    setForm((f) => ({ ...f, [key]: value }));
  };
  const setNote = (key) => (e) => {
    if (readOnly) return;
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const hasDm = diseaseGroups.includes('dm');
  const hasResp = diseaseGroups.includes('asthma') || diseaseGroups.includes('copd');

  const sbp = Number(String(form.vitals.bp || '').split('/')[0]);
  const highBp = Number.isFinite(sbp) && sbp >= 140;
  const highFbs = form.fbs !== '' && Number(form.fbs) >= 126;

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='stethoscope'>สัญญาณชีพ</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='ความดันโลหิต (BP)'>
            <InputField disabled={readOnly} value={form.vitals.bp} onChange={setVital('bp')} placeholder='120/80' />
          </Field>
          <Field label='ชีพจร (HR)'>
            <InputField disabled={readOnly} value={form.vitals.hr} onChange={setVital('hr')} type='number' />
          </Field>
          <Field label='อุณหภูมิ (°C)'>
            <InputField disabled={readOnly} value={form.vitals.temp} onChange={setVital('temp')} type='number' />
          </Field>
          <Field label='อัตราหายใจ (RR)'>
            <InputField disabled={readOnly} value={form.vitals.rr} onChange={setVital('rr')} type='number' />
          </Field>
          <Field label='SpO₂ (%)'>
            <InputField disabled={readOnly} value={form.vitals.spo2} onChange={setVital('spo2')} type='number' />
          </Field>
          <Field label='น้ำหนัก (กก.)'>
            <InputField disabled={readOnly} value={form.vitals.weight} onChange={setVital('weight')} type='number' />
          </Field>
          <Field label='ส่วนสูง (ซม.)'>
            <InputField disabled={readOnly} value={form.vitals.height} onChange={setVital('height')} type='number' />
          </Field>
        </div>
        {highBp && (
          <ColorfulBadge style='red' size='small' hierarchy='secondary' width='hug' maxWidth={640}>
            SBP ≥ 140 mmHg — เข้าเกณฑ์ความดันโลหิตสูงที่ยังควบคุมไม่ได้ พิจารณาทบทวนแผนการรักษา
          </ColorfulBadge>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='biotech'>ผลตรวจข้างเตียง (Point-of-care)</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='น้ำตาลปลายนิ้ว (FBS, mg/dL)' hint={hasDm ? 'ผู้ป่วยเบาหวาน — บันทึกทุกครั้งที่มารับบริการ' : undefined}>
            <InputField disabled={readOnly} value={form.fbs} onChange={set('fbs')} type='number' placeholder='เช่น 126' />
          </Field>
          <Field label='Peak Expiratory Flow (PEFR, L/min)' hint={hasResp ? 'หอบหืด/ถุงลมโป่งพอง — เทียบค่าดีที่สุดของผู้ป่วย' : undefined}>
            <InputField disabled={readOnly} value={form.pefr} onChange={set('pefr')} type='number' placeholder='เช่น 350' />
          </Field>
        </div>
        {highFbs && (
          <ColorfulBadge style='yellow' size='small' hierarchy='secondary' width='hug' maxWidth={640}>
            FBS ≥ 126 mg/dL — ระดับน้ำตาลสูงกว่าเกณฑ์ควบคุม
          </ColorfulBadge>
        )}
      </div>

      {hasDm && (
        <div className='flex flex-col gap-3'>
          <TopicHeader icon='clipboard-list'>ตรวจเท้าเบาหวาน (Diabetic foot exam)</TopicHeader>
          <SuggestibleTextarea
            voice
            disabled={readOnly}
            value={form.footExam}
            onChange={setNote('footExam')}
            suggestions={NCD_PHYSICAL_EXAM_SUGGESTIONS}
            minChars={3}
            placeholder='เช่น ผิวแห้ง ไม่มีแผล ชีพจรหลังเท้าปกติ / monofilament test ปกติ'
          />
        </div>
      )}

      {hasResp && (
        <div className='flex flex-col gap-3'>
          <TopicHeader icon='stethoscope'>ฟังเสียงปอด (Lung auscultation)</TopicHeader>
          <SuggestibleTextarea
            voice
            disabled={readOnly}
            value={form.lungSound}
            onChange={setNote('lungSound')}
            suggestions={NCD_PHYSICAL_EXAM_SUGGESTIONS}
            minChars={3}
            placeholder='เช่น ฟัง wheezing เล็กน้อยขณะหายใจออก / เสียงปอดลดลงทั้งสองข้าง'
          />
        </div>
      )}

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard'>ผลตรวจร่างกายโดยรวม</TopicHeader>
        <SuggestibleTextarea
          voice
          disabled={readOnly}
          value={form.physicalExamNote}
          onChange={setNote('physicalExamNote')}
          suggestions={NCD_PHYSICAL_EXAM_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น หัวใจและปอดปกติ ไม่มีอาการบวมที่ขาทั้งสองข้าง'
        />
      </div>
    </StepCard>
  );
};

/* ── Step 4 — วินิจฉัย + คำสั่งการรักษา (TOR 1.10.2.3/.5) ───────────── */
const NCD_ICD10_OPTIONS = NCD_DISEASE_GROUPS.map((g) => ({ value: g.icd10, label: g.icd10Label }));

export const NcdStep4Diagnosis = ({ form, setForm, patient, rightsExpired = false, readOnly = false }) => {
  const setNote = (key) => (e) => {
    if (readOnly) return;
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard'>วินิจฉัย (Diagnosis)</TopicHeader>
        <SuggestibleTextarea
          voice
          required
          disabled={readOnly}
          value={form.diagnosisNote}
          onChange={setNote('diagnosisNote')}
          suggestions={NCD_DIAGNOSIS_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น เบาหวานชนิดที่ 2 ควบคุมไม่ได้ (T2DM, poorly controlled)'
        />
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='รหัส ICD-10' required>
            <Select
              showLabel={false}
              searchable={false}
              size='lg'
              disabled={readOnly}
              value={form.icd10}
              onChange={(v) => { if (!readOnly) setForm((f) => ({ ...f, icd10: v })); }}
              options={NCD_ICD10_OPTIONS}
              placeholder='เลือกรหัส ICD-10'
            />
          </Field>
          <Field label='สถานะการควบคุมโรค'>
            <div className='flex items-center gap-2 flex-wrap'>
              {NCD_SEVERITY_OPTIONS.map((opt) => (
                <SelectableTag
                  key={opt.value}
                  label={opt.label}
                  size='lg'
                  selected={form.controlStatus === opt.value}
                  onClick={() => { if (!readOnly) setForm((f) => ({ ...f, controlStatus: opt.value })); }}
                />
              ))}
            </div>
          </Field>
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard-list'>คำแนะนำผู้รับบริการ</TopicHeader>
        <SuggestibleTextarea
          voice
          disabled={readOnly}
          value={form.adviceNote}
          onChange={setNote('adviceNote')}
          suggestions={NCD_ADVICE_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น กินยาสม่ำเสมอ ห้ามหยุดยาเอง / วัดความดันที่บ้านและจดบันทึก'
        />
      </div>

      {/* คำสั่งการรักษา — the full CPOE surface (ยา / Lab / X-ray /
          หัตถการ / Consult) reused from the OPD record so ordering behaves
          identically across clinics (TOR 1.10.2.5 "เชื่อมโยงระบบสั่งยา,
          Lab, X-ray"). */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='pill'>คำสั่งการรักษา (CPOE)</TopicHeader>
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

/* ── Step 5 — เอกสารแนบเพิ่มเติมระหว่างการรักษา (TOR 1.10.2.4) ───────── */
const ATTACH_ACCEPT = ['pdf', 'png', 'jpg', 'jpeg'];
const ATTACH_MAX_BYTES = 10 * 1024 * 1024;

const formatBytes = (n) => {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
};

export const NcdStep5Attachments = ({ form, setForm, readOnly = false }) => {
  const [error, setError] = useState('');
  const [previewTarget, setPreviewTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);

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
    setForm((f) => ({
      ...f,
      attachments: [
        ...f.attachments,
        {
          id: `att-${Date.now()}-${f.attachments.length}`,
          name: file.name,
          sizeLabel: formatBytes(file.size),
          type: ext,
          addedAt: new Date().toISOString(),
        },
      ],
    }));
  };

  const confirmRemove = () => {
    setForm((f) => ({ ...f, attachments: f.attachments.filter((a) => a.id !== removeTarget.id) }));
    setRemoveTarget(null);
  };

  return (
    <StepCard>
      <Popup
        open={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
        size='large'
        title='ตัวอย่างเอกสารแนบ'
        subtitle={previewTarget ? `${previewTarget.name} · ${previewTarget.sizeLabel}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setPreviewTarget(null) }}
      >
        <div
          className='flex flex-col items-center justify-center text-center w-full'
          style={{
            gap: 'var(--dim-space-300)',
            padding: 'var(--dim-space-800, 48px)',
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

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='file'>เอกสารแนบเพิ่มเติมระหว่างการรักษา</TopicHeader>
        {!readOnly && (
          <FileUploadField
            label='แนบเอกสาร (ผล Lab ภายนอก, ใบส่งตัว, ภาพถ่ายแผล ฯลฯ)'
            helperText='รองรับ .pdf .png .jpg ขนาดไม่เกิน 10 MB ต่อไฟล์'
            accept={ATTACH_ACCEPT.map((e) => `.${e}`).join(',')}
            buttonLabel='เลือกไฟล์แนบ'
            onFile={addFile}
          />
        )}
        {error && <ErrorNote>{error}</ErrorNote>}

        {form.attachments.length === 0 ? (
          <div
            className='flex flex-col items-center text-center w-full'
            style={{
              gap: 'var(--dim-space-200)',
              padding: 'var(--dim-space-700, 40px)',
              borderRadius: 'var(--dim-radius-400)',
              border: 'var(--dim-stroke-100) dashed var(--border-neutral-tertiary, #C6CACD)',
              color: 'var(--text-content-tertiary)',
            }}
          >
            <Icon name='folder_open' size={32} />
            <span style={{ fontSize: 'var(--type-size-sm)' }}>ยังไม่มีเอกสารแนบ</span>
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
                  <span className='text-sm truncate' style={{ color: 'var(--text-content-default)' }}>{att.name}</span>
                  <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>
                    {att.sizeLabel} · แนบเมื่อ {formatNcdDate(att.addedAt)}
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

/* ── Step 6 — นัดหมายติดตาม + ยืนยันการบันทึก ─────────────────────── */

const APPOINTMENT_NOTE_SUGGESTIONS = [
  'นัดเจาะ FBS / HbA1c ก่อนพบแพทย์ 1 สัปดาห์',
  'งดน้ำงดอาหารอย่างน้อย 8 ชั่วโมงก่อนเจาะเลือด',
  'นำสมุดบันทึกความดัน/น้ำตาลที่วัดเองที่บ้านมาด้วย',
  'นำยาเดิมทั้งหมดมาให้เภสัชกรตรวจสอบ',
  'นัดตรวจจอประสาทตาประจำปีในวันเดียวกัน',
  'หากอาการกำเริบให้มาก่อนนัดทันที',
];

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Appointment validation shared with the confirm gate on NcdFormPage —
    returns '' when valid (or explicitly skipped / left blank). */
export const validateNcdAppointment = (appointment) => {
  if (appointment.skipped || !appointment.date) return '';
  if (appointment.date < todayIso()) return 'ไม่สามารถบันทึกนัดหมายย้อนหลังได้ — เลือกวันที่ตั้งแต่วันนี้เป็นต้นไป';
  if (appointment.time && isNcdSlotBooked(appointment.date, appointment.time)) {
    return `ช่วงเวลา ${appointment.time} น. ของวันที่เลือกมีนัดหมายเต็มแล้ว — เลือกเวลาอื่น`;
  }
  return '';
};

export const NcdStep6Appointment = ({
  form, setForm, readOnly = false,
  saveState, confirmError,
  onSaveDraft, onConfirm,
}) => {
  const setAppt = (key) => (value) => {
    if (readOnly) return;
    setForm((f) => ({ ...f, appointment: { ...f.appointment, [key]: value } }));
  };

  const apptError = validateNcdAppointment(form.appointment);
  const slotHint = form.appointment.date && !form.appointment.skipped
    ? NCD_APPOINTMENT_TIMES.filter((t) => !isNcdSlotBooked(form.appointment.date, t)).length
    : null;

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='calendar'>นัดหมายติดตามครั้งถัดไป</TopicHeader>

        <SelectableTag
          label='ไม่นัดหมายครั้งถัดไป (สิ้นสุดการติดตาม / นัดผ่านช่องทางอื่น)'
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
            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field
                label='วันนัดหมาย'
                hint={slotHint != null ? `มีช่วงเวลาว่าง ${slotHint} ช่วงในวันที่เลือก` : 'เลือกวันที่ตั้งแต่วันนี้เป็นต้นไป'}
              >
                <DatePicker
                  value={form.appointment.date ? new Date(form.appointment.date) : null}
                  onChange={(d) => setAppt('date')(d ? d.toISOString().slice(0, 10) : '')}
                  placeholder='เลือกวันที่'
                  showLabel={false}
                  disabled={readOnly}
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
                  options={NCD_APPOINTMENT_TIMES.map((t) => ({
                    value: t,
                    label: form.appointment.date && isNcdSlotBooked(form.appointment.date, t) ? `${t} น. (เต็ม)` : `${t} น.`,
                  }))}
                  placeholder='เลือกเวลา'
                />
              </Field>
            </div>
            {apptError && <ErrorNote>{apptError}</ErrorNote>}

            <Field label='รูปแบบการนัดหมาย'>
              <div className='flex items-center gap-2 flex-wrap'>
                <SelectableTag
                  label='เข้ารับบริการที่คลินิก'
                  size='lg'
                  selected={form.appointment.mode !== 'telemedicine'}
                  onClick={() => {
                    if (readOnly) return;
                    setForm((f) => ({ ...f, appointment: { ...f.appointment, mode: 'onsite', telemedStatus: 'none' } }));
                  }}
                />
                <SelectableTag
                  label='ปรึกษาผ่าน Telemedicine'
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
              value={form.appointment.note}
              onChange={(e) => { if (!readOnly) setForm((f) => ({ ...f, appointment: { ...f.appointment, note: e.target.value } })); }}
              suggestions={APPOINTMENT_NOTE_SUGGESTIONS}
              minChars={3}
              placeholder='คำแนะนำการเตรียมตัวก่อนมาตามนัด เช่น งดน้ำงดอาหาร 8 ชม.'
            />
          </>
        )}
      </div>

      {/* ยืนยันการบันทึก — the record's บันทึก (ร่าง + ยืนยัน) actions with
          the TOR audit stamp; validation errors from the confirm gate on
          NcdFormPage surface here (spec edge case "cannot confirm visit
          without วินิจฉัย"). */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='check-circle'>สรุปและยืนยันการบันทึก</TopicHeader>

        <div className='grid grid-cols-2 gap-x-6 gap-y-2' style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
          <span>วินิจฉัย: {form.diagnosisNote ? form.diagnosisNote : '— ยังไม่ระบุ —'}</span>
          <span>ICD-10: {form.icd10 || '— ยังไม่ระบุ —'}</span>
          <span>รายการยา: {form.medications.length} รายการ · Lab: {form.labs.length} · X-ray: {form.xrayOrders.length}</span>
          <span>เอกสารแนบ: {form.attachments.length} ไฟล์</span>
          <span>
            นัดหมาย: {form.appointment.skipped
              ? 'ไม่นัดหมายครั้งถัดไป'
              : form.appointment.date
                ? `${formatNcdDate(form.appointment.date)}${form.appointment.time ? ` · ${form.appointment.time} น.` : ''}${form.appointment.mode === 'telemedicine' ? ' · Telemedicine' : ''}`
                : '— ยังไม่ระบุ —'}
          </span>
        </div>

        {confirmError && <ErrorNote>{confirmError}</ErrorNote>}

        {saveState?.confirmedAt ? (
          <div className='flex items-center gap-2' style={{ color: 'var(--text-brandPrimary-default, #007549)', fontSize: 'var(--type-size-sm)' }}>
            <Icon name='check-circle' size={18} />
            ยืนยันการบันทึกแล้ว · ผู้บันทึก {saveState.by} · {saveState.confirmedAt}
          </div>
        ) : readOnly ? (
          <WarningNote icon='visibility'>สิทธิ์ของคุณดูได้อย่างเดียว — ไม่สามารถบันทึกหรือยืนยันได้</WarningNote>
        ) : (
          <div className='flex items-center gap-3 flex-wrap'>
            <BrandSubdueButton variant='outline' size='lg' leadingIcon='save' onClick={onSaveDraft}>
              บันทึกร่าง (กลับเข้าคิวที่ร่างไว้)
            </BrandSubdueButton>
            <BrandPrimaryButton size='lg' trailingIcon='check' onClick={onConfirm}>
              ยืนยันการบันทึกการตรวจรักษา
            </BrandPrimaryButton>
            {saveState?.draftAt && (
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                บันทึกร่างล่าสุด {saveState.draftAt}
              </span>
            )}
          </div>
        )}
      </div>
    </StepCard>
  );
};
