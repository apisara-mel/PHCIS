import React, { useEffect, useMemo } from 'react';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Textarea from '@/components/forms/Textarea';
import DatePicker from '@/components/forms/DatePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import BrandIconButton from '@/components/button/BrandIconButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import Table from '@/components/table/Table';
import DragAndDrop from '@/components/form-builder/DragAndDrop';
import {
  formatAncDate,
  calculateGestationalAge,
  formatGestationalAge,
  calculateEDC,
  ANC_STRESS_QUESTIONS,
  ANC_STRESS_SCALE,
  interpretAncStressScore,
  ANC_MENTAL_HEALTH_QUESTIONS,
  ANC_SMOKING_STATUS,
  ANC_FAMILY_ILLNESS_HISTORY,
  ANC_RISK_FACTORS,
  ANC_DANGER_SIGNS,
  ANC_RISK_LEVELS,
  resolveAncRiskLevel,
  ANC_LAB1_ORDERS,
  ANC_LAB1_RESULT_FIELDS,
  ANC_LAB2_RESULT_FIELDS,
  summarizeLabResults,
  ANC_SECOND_TRIMESTER_SCREENING,
  ANC_DIABETES_SCREENING,
  ANC_LAB2_ORDERS,
  ANC_VACCINES,
  ANC_SUPPLEMENTS,
  ANC_TERM_ASSESSMENT,
  getAncVisitTier,
  summarizeAncProcedures,
  getNextAncAppointmentPlan,
  getAncVisitHistoryByHn,
  saveAncVisitRecord,
} from '@/data/ancVisits';

/* AncSteps — ANC (แผนกฝากครรภ์) form bodies, plugged into the shared
   `TreatmentFormShell` 7-step scaffold (same shell `TreatmentSteps.jsx`
   uses for OPD). Covers the full FigJam "Antenatal care" swimlane map
   (A-E) + TOR §1.10.7 — Step 5's order chips adapt to the current
   visit's gestational age via `getAncVisitTier` (see AncStep5Orders),
   so one form covers first visit through 32wk+ referral instead of
   needing a separate flow per visit type. */

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

/* ── Step 1 — ประวัติการรักษา ──────────────────────────────────────
   Personal/illness history + obstetric registry fields (TOR 1.10.7.6):
   ครรภ์ที่ (gravida/para/abortion/living children), LMP → auto EDC +
   gestational age, obstetric history rows, ลักษณะเต้านม, ข้อมูลการตั้ง
   ครรภ์ปัจจุบัน, สุขภาพของสามี. Also surfaces the read-only prior-visit
   trend (TOR 1.10.7.8) when the patient has follow-up history. */
export const AncStep1History = ({ form, setForm, cardPatient }) => {
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const toggleFamilyIllness = (key) => setForm((f) => ({
    ...f,
    familyIllnessHistory: { ...f.familyIllnessHistory, [key]: !f.familyIllnessHistory[key] },
  }));

  const gestationalAge = useMemo(() => calculateGestationalAge(form.lmp), [form.lmp]);
  const edc = useMemo(() => calculateEDC(form.lmp), [form.lmp]);

  /* `cardPatient` (from patientProfiles.js via getPatientByHN) is the
     canonical HN for this visit — `patient` (MR roster) doesn't have
     entries for every ANC mock patient and would silently fall back to
     DEFAULT_MR_PATIENT's HN, misattributing the follow-up trend. */
  const history = useMemo(() => getAncVisitHistoryByHn(cardPatient?.hn), [cardPatient?.hn]);

  const addObstetricRow = () => setForm((f) => ({
    ...f,
    obstetricHistory: [
      ...f.obstetricHistory,
      { id: `ob-${f.obstetricHistory.length + 1}-${Date.now()}`, year: '', deliveryType: '', outcome: '', complication: '' },
    ],
  }));
  const updateObstetricRow = (id, key, value) => setForm((f) => ({
    ...f,
    obstetricHistory: f.obstetricHistory.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
  }));
  const removeObstetricRow = (id) => setForm((f) => ({
    ...f,
    obstetricHistory: f.obstetricHistory.filter((row) => row.id !== id),
  }));

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='file-text'>ประวัติส่วนตัวและการเจ็บป่วย</TopicHeader>
        <Textarea
          label='ประวัติการเจ็บป่วย'
          value={form.illnessHistory}
          onChange={set('illnessHistory')}
          placeholder='เช่น ไม่มีโรคประจำตัว / เป็นเบาหวานก่อนตั้งครรภ์'
          showLabel={false}
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard'>ประวัติทางสูติกรรม</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='ครรภ์ที่ (Gravida)' required>
            <InputField value={form.gravida} onChange={set('gravida')} placeholder='เช่น 1' type='number' />
          </Field>
          <Field label='คลอดแล้ว (Para)'>
            <InputField value={form.para} onChange={set('para')} placeholder='0' type='number' />
          </Field>
          <Field label='แท้ง (Abortion)'>
            <InputField value={form.abortion} onChange={set('abortion')} placeholder='0' type='number' />
          </Field>
          <Field label='บุตรมีชีวิต (Living)'>
            <InputField value={form.livingChildren} onChange={set('livingChildren')} placeholder='0' type='number' />
          </Field>
        </div>

        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='วันแรกของประจำเดือนครั้งสุดท้าย (LMP)' required
            hint={gestationalAge
              ? `อายุครรภ์ ${formatGestationalAge(gestationalAge)} · กำหนดคลอด (EDC) ${formatAncDate(edc)}`
              : 'ระบุ LMP เพื่อคำนวณอายุครรภ์และกำหนดคลอดอัตโนมัติ'}
          >
            <DatePicker
              value={form.lmp ? new Date(form.lmp) : null}
              onChange={(d) => setForm((f) => ({ ...f, lmp: d ? d.toISOString().slice(0, 10) : '' }))}
              placeholder='เลือกวันที่'
              showLabel={false}
            />
          </Field>
        </div>

        {form.obstetricHistory.length > 0 && (
          <div className='flex flex-col gap-2'>
            {form.obstetricHistory.map((row, idx) => (
              <div key={row.id} className='flex items-end gap-3 w-full'>
                <Field label={`ครรภ์ที่ ${idx + 1} — ปี พ.ศ.`}>
                  <InputField value={row.year} onChange={(v) => updateObstetricRow(row.id, 'year', v)} placeholder='2565' />
                </Field>
                <Field label='วิธีคลอด'>
                  <InputField value={row.deliveryType} onChange={(v) => updateObstetricRow(row.id, 'deliveryType', v)} placeholder='คลอดปกติ / ผ่าตัดคลอด' />
                </Field>
                <Field label='ผลลัพธ์'>
                  <InputField value={row.outcome} onChange={(v) => updateObstetricRow(row.id, 'outcome', v)} placeholder='บุตรมีชีวิต / แท้ง / เสียชีวิต' />
                </Field>
                <Field label='ภาวะแทรกซ้อน'>
                  <InputField value={row.complication} onChange={(v) => updateObstetricRow(row.id, 'complication', v)} placeholder='ไม่มี' />
                </Field>
                <BrandIconButton icon='close' variant='ghost' size='sm' onClick={() => removeObstetricRow(row.id)} aria-label='ลบรายการ' />
              </div>
            ))}
          </div>
        )}
        <BrandDashedAddButton onClick={addObstetricRow}>เพิ่มประวัติการตั้งครรภ์ก่อนหน้า</BrandDashedAddButton>
      </div>

      <div className='flex items-start gap-4 w-full flex-wrap'>
        <Field label='ลักษณะเต้านม'>
          <InputField value={form.breastExamNote} onChange={set('breastExamNote')} placeholder='เช่น ปกติทั้งสองข้าง' />
        </Field>
        <Field label='สุขภาพของสามี'>
          <InputField value={form.spouseHealthNote} onChange={set('spouseHealthNote')} placeholder='เช่น แข็งแรงดี ไม่มีโรคประจำตัว' />
        </Field>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard'>ประวัติการฉีดวัคซีนป้องกันโรคคอตีบ บาดทะยัก (dT)</TopicHeader>
        <div className='flex items-end gap-4 w-full flex-wrap'>
          <Field label='ก่อนตั้งครรภ์นี้เคยได้รับมาแล้ว (ครั้ง)'>
            <InputField value={form.tetanusDoseCount} onChange={set('tetanusDoseCount')} placeholder='0' type='number' />
          </Field>
          <Field label='ครั้งสุดท้ายเมื่อปี พ.ศ.'>
            <InputField value={form.tetanusLastDoseYear} onChange={set('tetanusLastDoseYear')} placeholder='เช่น 2567' />
          </Field>
          <SelectableTag
            label='ไม่ต้องฉีดในครรภ์นี้ — เคยได้รับ dT/dT3 มาไม่เกิน 10 ปี'
            size='lg'
            selected={form.tetanusExempt}
            onClick={() => setForm((f) => ({ ...f, tetanusExempt: !f.tetanusExempt }))}
          />
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='users'>ประวัติการเจ็บป่วยของครอบครัว</TopicHeader>
        <div className='flex flex-wrap gap-2'>
          {ANC_FAMILY_ILLNESS_HISTORY.map((item) => (
            <SelectableTag
              key={item.key}
              label={item.label}
              selected={!!form.familyIllnessHistory[item.key]}
              onClick={() => toggleFamilyIllness(item.key)}
            />
          ))}
        </div>
        <InputField
          value={form.familyIllnessOtherNote}
          onChange={set('familyIllnessOtherNote')}
          placeholder='อื่นๆ (ระบุ)'
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='activity'>ข้อมูลการตั้งครรภ์ปัจจุบัน</TopicHeader>
        <Textarea
          value={form.currentPregnancyNote}
          onChange={set('currentPregnancyNote')}
          placeholder='เช่น อาการแพ้ท้อง, การเคลื่อนไหวของทารก, อาการผิดปกติที่พบ'
          showLabel={false}
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='file'>อัปโหลดเอกสาร</TopicHeader>
        <DragAndDrop
          value={form.documents}
          onChange={(files) => setForm((f) => ({ ...f, documents: files }))}
          accept='.png,.jpg,.jpeg,.pdf'
        />
      </div>

      {history.length > 0 && (
        <div className='flex flex-col gap-3'>
          <TopicHeader icon='history'>การติดตามการฝากครรภ์ (ครั้งก่อนหน้า)</TopicHeader>
          <Table
            columns={[
              { key: 'date', label: 'วันที่', width: 128 },
              { key: 'gestWeeks', label: 'อายุครรภ์', width: 96, render: (r) => `${r.gestWeeks} สัปดาห์` },
              { key: 'fundusHeight', label: 'ยอดมดลูก', width: 112 },
              { key: 'fetalHeartRate', label: 'FHR', width: 96 },
              { key: 'bp', label: 'BP', width: 96 },
              { key: 'weight', label: 'น้ำหนัก', width: 96, render: (r) => `${r.weight} กก.` },
              { key: 'urineResult', label: 'ปัสสาวะ', width: 112, render: (r) => r.urineResult || '-' },
              {
                key: 'riskLevel', label: 'ความเสี่ยง', width: 128,
                render: (r) => resolveAncRiskLevel(r.riskLevel)?.label || '-',
              },
              { key: 'labSummary', label: 'ผล Lab', width: 200, render: (r) => r.labSummary || '-' },
              { key: 'note', label: 'บันทึก', flex: true, minWidth: 200 },
            ]}
            rows={history}
            rowKey={(r) => `${r.date}-${r.gestWeeks}`}
            emptyMessage='ไม่มีประวัติการฝากครรภ์ครั้งก่อนหน้า'
          />
        </div>
      )}
    </StepCard>
  );
};

/* ── Step 2 — คัดกรองและซักประวัติ ─────────────────────────────────
   Mental-health screen (2Q, TOR 1.10.7.3) + pregnancy-risk screening
   checklist (TOR 1.10.7.7). */
export const AncStep2Screening = ({ form, setForm }) => {
  const setStress = (key, value) => setForm((f) => ({
    ...f,
    stressAnswers: { ...f.stressAnswers, [key]: value },
  }));
  const toggleMentalAnswer = (key, value) => setForm((f) => ({
    ...f,
    mentalHealthAnswers: { ...f.mentalHealthAnswers, [key]: value },
  }));
  const toggleRiskFactor = (key) => setForm((f) => ({
    ...f,
    riskFactors: { ...f.riskFactors, [key]: !f.riskFactors[key] },
  }));
  const toggleDangerSign = (key) => setForm((f) => ({
    ...f,
    dangerSigns: { ...f.dangerSigns, [key]: !f.dangerSigns[key] },
  }));

  const stressAnsweredCount = Object.keys(form.stressAnswers).length;
  const stressTotal = Object.values(form.stressAnswers).reduce((sum, v) => sum + (v || 0), 0);
  const stressResult = stressAnsweredCount === ANC_STRESS_QUESTIONS.length ? interpretAncStressScore(stressTotal) : null;

  const anyMentalYes = Object.values(form.mentalHealthAnswers).some((v) => v === true);
  const answeredMentalCount = Object.keys(form.mentalHealthAnswers).length;
  const flaggedRiskCount = Object.values(form.riskFactors).filter(Boolean).length;
  const flaggedDangerCount = Object.values(form.dangerSigns).filter(Boolean).length;

  return (
    <StepCard>
      {/* ผลการซักประวัติ — TOR 1.10.7.3. Computed live so the result of
          this step is always visible, not just captured on save. */}
      <div className='flex items-center gap-3 flex-wrap'>
        {stressResult && (
          <ColorfulBadge style={stressResult.level === 'high' ? 'red' : stressResult.level === 'suspect' ? 'yellow' : 'green'} size='small' hierarchy='secondary'>
            ST-5: {stressResult.label} ({stressTotal}/15)
          </ColorfulBadge>
        )}
        <ColorfulBadge style={answeredMentalCount === 0 ? 'grey' : anyMentalYes ? 'orange' : 'green'} size='small' hierarchy='secondary'>
          {answeredMentalCount === 0
            ? 'ยังไม่ได้ประเมินสุขภาพจิต'
            : anyMentalYes ? 'ผล 2Q: พบความเสี่ยง' : 'ผล 2Q: ไม่พบความเสี่ยง'}
        </ColorfulBadge>
        <ColorfulBadge style={flaggedRiskCount === 0 ? 'green' : 'yellow'} size='small' hierarchy='secondary'>
          {flaggedRiskCount === 0 ? 'ไม่พบปัจจัยเสี่ยงจากการซักประวัติ' : `พบปัจจัยเสี่ยง ${flaggedRiskCount} ข้อ`}
        </ColorfulBadge>
        {flaggedDangerCount > 0 && (
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>
            พบสัญญาณอันตราย {flaggedDangerCount} ข้อ
          </ColorfulBadge>
        )}
      </div>

      {/* แบบประเมินความเครียด ST-5 (pp.40-41) — runs ahead of the 2Q per
          the manual's flowchart (pp.42-43). */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='activity'>แบบประเมินความเครียด (ST-5)</TopicHeader>
        <div className='flex flex-col gap-3'>
          {ANC_STRESS_QUESTIONS.map((q) => (
            <div key={q.key} className='flex items-center justify-between gap-4 w-full flex-wrap'>
              <span className='text-sm' style={{ color: 'var(--text-content-default, #363B3F)' }}>{q.label}</span>
              <div className='flex items-center gap-2 shrink-0 flex-wrap'>
                {ANC_STRESS_SCALE.map((opt) => (
                  <SelectableTag
                    key={opt.value}
                    label={opt.label}
                    size='md'
                    selected={form.stressAnswers[q.key] === opt.value}
                    onClick={() => setStress(q.key, opt.value)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='meh'>แบบประเมินสุขภาพจิต (2Q)</TopicHeader>
        <div className='flex flex-col gap-3'>
          {ANC_MENTAL_HEALTH_QUESTIONS.map((q) => (
            <div key={q.key} className='flex items-center justify-between gap-4 w-full flex-wrap'>
              <span className='text-sm' style={{ color: 'var(--text-content-default, #363B3F)' }}>{q.label}</span>
              <div className='flex items-center gap-2 shrink-0'>
                <SelectableTag
                  label='ใช่'
                  size='md'
                  selected={form.mentalHealthAnswers[q.key] === true}
                  onClick={() => toggleMentalAnswer(q.key, true)}
                />
                <SelectableTag
                  label='ไม่ใช่'
                  size='md'
                  selected={form.mentalHealthAnswers[q.key] === false}
                  onClick={() => toggleMentalAnswer(q.key, false)}
                />
              </div>
            </div>
          ))}
        </div>
        {anyMentalYes && (
          <div
            className='flex items-center gap-2'
            style={{
              padding: 'var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-warning-quaternary, #FFF9F0)',
              color: 'var(--text-warning-default, #F46928)',
              fontSize: 'var(--type-size-sm)',
            }}
          >
            <Icon name='activity' size={18} />
            พบผลบวก — ควรประเมินต่อด้วยแบบประเมิน 9Q / 8Q ฉบับเต็ม
          </div>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard-list'>แบบประเมินความเสี่ยงการตั้งครรภ์</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {ANC_RISK_FACTORS.map((rf) => (
            <SelectableTag
              key={rf.key}
              label={rf.label}
              size='lg'
              selected={!!form.riskFactors[rf.key]}
              onClick={() => toggleRiskFactor(rf.key)}
            />
          ))}
        </div>
        <Textarea
          label='บันทึกเพิ่มเติม'
          value={form.riskScreeningNote}
          onChange={(v) => setForm((f) => ({ ...f, riskScreeningNote: v }))}
          placeholder='รายละเอียดเพิ่มเติมจากการคัดกรองความเสี่ยง'
        />
      </div>

      {/* สัญญาณอันตราย — exact referral triggers from the official manual
          pp.11-12. Any checked item is an immediate-referral situation,
          not a routine risk factor, so it gets its own red-flagged
          section rather than living inside ANC_RISK_FACTORS. */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='activity'>สัญญาณอันตราย (ต้องส่งพบแพทย์ทันทีหากพบ)</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {ANC_DANGER_SIGNS.map((sign) => (
            <SelectableTag
              key={sign.key}
              label={sign.label}
              size='lg'
              selected={!!form.dangerSigns[sign.key]}
              onClick={() => toggleDangerSign(sign.key)}
            />
          ))}
        </div>
        {flaggedDangerCount > 0 && (
          <div
            className='flex items-center gap-2'
            style={{
              padding: 'var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-danger-quaternary, #FFF0F0)',
              color: 'var(--text-danger-default, #C72121)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-medium)',
            }}
          >
            <Icon name='activity' size={18} />
            พบสัญญาณอันตราย — ควรส่งพบแพทย์เพื่อประเมินและรักษาทันที
          </div>
        )}
      </div>

      {/* การคัดกรองการสูบบุหรี่ (p.46) — screened every visit; brief-advice
          checkbox once flagged as a smoker. Full Varenicline/4A cessation
          protocol is a doctor-level treatment plan, out of scope here. */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='activity'>การคัดกรองการสูบบุหรี่</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {ANC_SMOKING_STATUS.map((opt) => (
            <SelectableTag
              key={opt.value}
              label={opt.label}
              size='lg'
              selected={form.smokingStatus === opt.value}
              onClick={() => setForm((f) => ({ ...f, smokingStatus: opt.value }))}
            />
          ))}
          {form.smokingStatus === 'smoker' && (
            <SelectableTag
              label='ให้คำแนะนำเลิกบุหรี่แล้ว (Brief advice)'
              size='lg'
              selected={form.smokingAdviceGiven}
              onClick={() => setForm((f) => ({ ...f, smokingAdviceGiven: !f.smokingAdviceGiven }))}
            />
          )}
        </div>
      </div>
    </StepCard>
  );
};

/* ── Step 3 — ตรวจร่างกาย ──────────────────────────────────────────
   Vitals + ANC-specific additions: ระดับยอดมดลูก (fundus height) +
   fetal heart rate + oral-health check (TOR 1.10.7.7). */
export const AncStep3Examination = ({ form, setForm }) => {
  const setVital = (key) => (value) => setForm((f) => ({ ...f, vitals: { ...f.vitals, [key]: value } }));

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='stethoscope'>สัญญาณชีพ</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='ความดันโลหิต (BP)'>
            <InputField value={form.vitals.bp} onChange={setVital('bp')} placeholder='120/80' />
          </Field>
          <Field label='ชีพจร (HR)'>
            <InputField value={form.vitals.hr} onChange={setVital('hr')} type='number' />
          </Field>
          <Field label='อุณหภูมิ (°C)'>
            <InputField value={form.vitals.temp} onChange={setVital('temp')} type='number' />
          </Field>
          <Field label='น้ำหนัก (กก.)'>
            <InputField value={form.vitals.weight} onChange={setVital('weight')} type='number' />
          </Field>
          <Field label='ส่วนสูง (ซม.)'>
            <InputField value={form.vitals.height} onChange={setVital('height')} type='number' />
          </Field>
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='activity'>ตรวจครรภ์</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='ระดับยอดมดลูก (Fundal height, ซม.)'>
            <InputField
              value={form.fundusHeight}
              onChange={(v) => setForm((f) => ({ ...f, fundusHeight: v }))}
              type='number'
              placeholder='เช่น 20'
            />
          </Field>
          <Field label='อัตราการเต้นหัวใจทารก (FHR, bpm)'>
            <InputField
              value={form.fetalHeartRate}
              onChange={(v) => setForm((f) => ({ ...f, fetalHeartRate: v }))}
              type='number'
              placeholder='เช่น 148'
            />
          </Field>
        </div>
        <div className='flex items-center gap-3'>
          <SelectableTag
            label='ตรวจสุขภาพช่องปากแล้ว'
            size='lg'
            selected={form.oralHealthChecked}
            onClick={() => setForm((f) => ({ ...f, oralHealthChecked: !f.oralHealthChecked }))}
          />
        </div>
      </div>
    </StepCard>
  );
};

/* ── Step 4 — วินิจฉัย ─────────────────────────────────────────────
   Doctor picks the pregnancy risk tier (drives Step 6 routing) + free
   diagnosis note (TOR 1.10.7.7). */
export const AncStep4Diagnosis = ({ form, setForm }) => {
  const gestationalAge = calculateGestationalAge(form.lmp);
  const tier = getAncVisitTier(gestationalAge?.weeks);
  /* GDM confirmation only makes sense once the diabetes-screening tier has
     been reached (GCT 24-28wk / OGTT 30wk, pp.5-8) — surfaces as the "GDM+"
     flag on the pregnancy-progress header once ticked. */
  const showGdmToggle = tier === 'diabetesScreening' || tier === 'lab2AndVaccines';

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard-list'>ผลประเมินความเสี่ยงการตั้งครรภ์</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {ANC_RISK_LEVELS.map((lvl) => {
            const active = form.riskLevel === lvl.value;
            return (
              <button
                key={lvl.value}
                type='button'
                aria-pressed={active}
                onClick={() => setForm((f) => ({ ...f, riskLevel: lvl.value }))}
                className='inline-flex items-center'
                style={{
                  minHeight: 56,
                  paddingLeft: 'var(--dim-space-400, 16px)',
                  paddingRight: 'var(--dim-space-400, 16px)',
                  gap: 'var(--dim-space-200, 8px)',
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  background: active ? lvl.tone.bg : 'var(--surface-neutralbutton-quinary, #FFFFFF)',
                  boxShadow: active
                    ? `0 0 0 var(--dim-stroke-200, 2px) ${lvl.tone.fg}`
                    : '0 0 0 var(--dim-stroke-100, 1px) var(--border-neutralbutton-tertiary, #E2E4E6)',
                  color: active ? lvl.tone.fg : 'var(--text-content-default, #363B3F)',
                  fontSize: 'var(--type-size-sm)',
                  fontWeight: 'var(--type-weight-medium)',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                {lvl.label} ({lvl.en})
              </button>
            );
          })}
        </div>
        {showGdmToggle && (
          <SelectableTag
            label='ยืนยันเบาหวานขณะตั้งครรภ์ (GDM) จากผล OGTT'
            size='lg'
            selected={form.gdmConfirmed}
            onClick={() => setForm((f) => ({ ...f, gdmConfirmed: !f.gdmConfirmed }))}
          />
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='file-text'>บันทึกวินิจฉัย</TopicHeader>
        <Textarea
          value={form.diagnosisNote}
          onChange={(v) => setForm((f) => ({ ...f, diagnosisNote: v }))}
          placeholder='เช่น ครรภ์แรก อายุครรภ์ 8 สัปดาห์ ไม่พบภาวะเสี่ยง'
          showLabel={false}
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='biotech'>ผลการตรวจครรภ์จากภายนอก</TopicHeader>
        <Textarea
          value={form.externalExamResults}
          onChange={(v) => setForm((f) => ({ ...f, externalExamResults: v }))}
          placeholder='เช่น ผล Ultrasound / Lab จากสถานพยาบาลอื่นที่ผู้รับบริการนำมาแสดง'
          showLabel={false}
        />
        <DragAndDrop
          size='sm'
          value={form.externalExamAttachments}
          onChange={(files) => setForm((f) => ({ ...f, externalExamAttachments: files }))}
          accept='.png,.jpg,.jpeg,.pdf'
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard'>คำแนะนำ</TopicHeader>
        <Textarea
          value={form.adviceNote}
          onChange={(v) => setForm((f) => ({ ...f, adviceNote: v }))}
          placeholder='เช่น รับประทานยาเสริมธาตุเหล็ก, สังเกตการดิ้นของทารก, มาพบแพทย์ก่อนนัดหากมีเลือดออกทางช่องคลอด'
          showLabel={false}
        />
      </div>
    </StepCard>
  );
};

/* ── Step 5 — สั่งการรักษา ─────────────────────────────────────────
   Order chips adapt to the CURRENT visit's gestational age (TOR
   1.10.7.5/.7) — FigJam swimlane A (Lab #1, <12wk) · C (Down-syndrome +
   2nd ultrasound, 12-19wk) · D (GCT/OGTT diabetes screen, 20-27wk) ·
   E (Lab #2 + vaccines, 28wk+), so the same form covers the whole
   pregnancy instead of only the first visit. */
export const AncStep5Orders = ({ form, setForm }) => {
  const gestationalAge = useMemo(() => calculateGestationalAge(form.lmp), [form.lmp]);
  const tier = getAncVisitTier(gestationalAge?.weeks);

  const toggle = (group) => (key) => setForm((f) => ({ ...f, [group]: { ...f[group], [key]: !f[group][key] } }));
  const toggleLab = toggle('lab1Orders');
  const toggleScreening = toggle('secondTrimesterScreening');
  const toggleDiabetes = toggle('diabetesScreening');
  const toggleLab2 = toggle('lab2Orders');
  const toggleVaccine = toggle('vaccines');
  const toggleSupplement = toggle('supplements');
  const toggleTermAssessment = toggle('termAssessment');

  const ChipGroup = ({ icon, title, items, values, onToggle }) => (
    <div className='flex flex-col gap-3'>
      <TopicHeader icon={icon}>{title}</TopicHeader>
      <div className='flex items-center gap-3 flex-wrap'>
        {items.map((item) => (
          <SelectableTag
            key={item.key}
            label={`${item.th} (${item.en})`}
            size='lg'
            selected={!!values[item.key]}
            onClick={() => onToggle(item.key)}
          />
        ))}
      </div>
    </div>
  );

  const setLabResult = (key) => (value) => setForm((f) => ({
    ...f,
    labResults: { ...f.labResults, [key]: value },
  }));

  /* ผลตรวจ Lab (result VALUES, not just which labs were ordered) — TOR
     1.10.7.7 names "การตรวจปัสสาวะ" as an explicit exam-history column, and
     1.10.7.8 requires trending "Lab" over time, so both need the actual
     result captured here rather than only the order chips above. */
  const ResultFieldsGrid = ({ fields }) => (
    <div className='flex flex-col gap-3'>
      <TopicHeader icon='biotech'>ผลตรวจ Lab</TopicHeader>
      <div className='flex items-start gap-4 w-full flex-wrap'>
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <InputField value={form.labResults[f.key] || ''} onChange={setLabResult(f.key)} placeholder={f.placeholder} />
          </Field>
        ))}
      </div>
    </div>
  );

  return (
    <StepCard>
      {tier === 'first' && (
        <>
          <ChipGroup icon='biotech' title='สั่งตรวจ Lab ครั้งที่ 1' items={ANC_LAB1_ORDERS} values={form.lab1Orders} onToggle={toggleLab} />
          <ResultFieldsGrid fields={ANC_LAB1_RESULT_FIELDS} />
        </>
      )}
      {tier === 'secondTrimesterScreening' && (
        <ChipGroup icon='biotech' title='คัดกรองไตรมาสที่ 2 (14-18 สัปดาห์)' items={ANC_SECOND_TRIMESTER_SCREENING} values={form.secondTrimesterScreening} onToggle={toggleScreening} />
      )}
      {tier === 'diabetesScreening' && (
        <ChipGroup icon='biotech' title='คัดกรองเบาหวานขณะตั้งครรภ์' items={ANC_DIABETES_SCREENING} values={form.diabetesScreening} onToggle={toggleDiabetes} />
      )}
      {tier === 'lab2AndVaccines' && (
        <>
          <ChipGroup icon='biotech' title='สั่งตรวจ Lab ครั้งที่ 2' items={ANC_LAB2_ORDERS} values={form.lab2Orders} onToggle={toggleLab2} />
          <ResultFieldsGrid fields={ANC_LAB2_RESULT_FIELDS} />
          <ChipGroup icon='clipboard' title='ฉีดวัคซีน' items={ANC_VACCINES} values={form.vaccines} onToggle={toggleVaccine} />
          <ChipGroup icon='clipboard' title='ยาเสริม (กินทุกวันตลอดการตั้งครรภ์)' items={ANC_SUPPLEMENTS} values={form.supplements} onToggle={toggleSupplement} />
          <ChipGroup icon='activity' title='ประเมินสุขภาพทารกในครรภ์และการคลอด' items={ANC_TERM_ASSESSMENT} values={form.termAssessment} onToggle={toggleTermAssessment} />
        </>
      )}

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard-list'>ทันตกรรม</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          <SelectableTag
            label='ส่งตรวจสุขภาพช่องปาก'
            size='lg'
            selected={form.dentalReferral}
            onClick={() => setForm((f) => ({ ...f, dentalReferral: !f.dentalReferral }))}
          />
          {tier !== 'first' && (
            <>
              <SelectableTag
                label='ขัดทำความสะอาดฟันแล้ว'
                size='lg'
                selected={form.dentalCleaningDone}
                onClick={() => setForm((f) => ({ ...f, dentalCleaningDone: !f.dentalCleaningDone }))}
              />
              <SelectableTag
                label='ฝึกแปรงฟันแบบลงมือปฏิบัติแล้ว'
                size='lg'
                selected={form.dentalBrushingPractice}
                onClick={() => setForm((f) => ({ ...f, dentalBrushingPractice: !f.dentalBrushingPractice }))}
              />
            </>
          )}
        </div>
      </div>
    </StepCard>
  );
};

/* ── Step 6 — นัดหมาย ──────────────────────────────────────────────
   Prefills facility + suggested week from `getNextAncAppointmentPlan`,
   date picker for the actual next-visit date, "โรงเรียนพ่อแม่" education
   toggle (TOR 1.10.7.5). */
export const AncStep6Appointment = ({ form, setForm }) => {
  const gestationalAge = useMemo(() => calculateGestationalAge(form.lmp), [form.lmp]);
  const plan = useMemo(
    () => getNextAncAppointmentPlan(gestationalAge?.weeks, form.riskLevel),
    [gestationalAge, form.riskLevel],
  );

  /* Prefill facility once a plan is available and the field hasn't been
     touched yet — mirrors TreatmentFormPage seeding `appointment.doctor`. */
  useEffect(() => {
    if (plan && !form.appointment.facility) {
      setForm((f) => ({ ...f, appointment: { ...f.appointment, facility: plan.facility } }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const setAppt = (key) => (value) => setForm((f) => ({ ...f, appointment: { ...f.appointment, [key]: value } }));

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='calendar'>นัดหมายครั้งถัดไป</TopicHeader>
        {plan && (
          <div
            className='flex items-start gap-3'
            style={{
              padding: 'var(--dim-space-400, 16px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            }}
          >
            <Icon name='calendar' size={20} />
            <div className='flex flex-col gap-1'>
              <span style={{ fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}>
                {plan.facilityLabel}{plan.suggestedWeek ? ` · แนะนำอายุครรภ์ ${plan.suggestedWeek} สัปดาห์` : ''}
              </span>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>{plan.label}</span>
            </div>
          </div>
        )}

        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='สถานที่นัดหมาย'>
            <div className='flex items-center gap-2'>
              <SelectableTag label='หน่วยปฐมภูมิ / รพ.สต.' size='lg' selected={form.appointment.facility === 'pcu'} onClick={() => setAppt('facility')('pcu')} />
              <SelectableTag label='โรงพยาบาล' size='lg' selected={form.appointment.facility === 'hospital'} onClick={() => setAppt('facility')('hospital')} />
            </div>
          </Field>
          <Field label='วันนัดหมายครั้งถัดไป' required>
            <DatePicker
              value={form.appointment.date ? new Date(form.appointment.date) : null}
              onChange={(d) => setAppt('date')(d ? d.toISOString().slice(0, 10) : '')}
              placeholder='เลือกวันที่'
              showLabel={false}
            />
          </Field>
        </div>

        <Field label='รูปแบบการนัดหมาย'>
          <div className='flex items-center gap-2'>
            <SelectableTag
              label='เข้ารับบริการที่คลินิก'
              size='lg'
              selected={form.appointment.mode !== 'telemedicine'}
              onClick={() => setForm((f) => ({ ...f, appointment: { ...f.appointment, mode: 'onsite', telemedStatus: 'none' } }))}
            />
            <SelectableTag label='ปรึกษาผ่าน Telemedicine' size='lg' selected={form.appointment.mode === 'telemedicine'} onClick={() => setAppt('mode')('telemedicine')} />
            {form.appointment.mode === 'telemedicine' && (
              <ColorfulIconBadge style='blue' size='medium' fill='default' icon='videocam' />
            )}
          </div>
        </Field>

        {/* Real session-state workflow — not just a label. Mirrors mobile's
            เข้าสู่ห้องรอตรวจ → telemedDone pattern (MobileTelemedPage), scoped
            to a start/end toggle since there's no shared web call-room UI
            yet (TOR 1.10.7.7). */}
        {form.appointment.mode === 'telemedicine' && (
          <div className='flex items-center gap-3'>
            {form.appointment.telemedStatus === 'completed' ? (
              <ColorfulBadge style='green' size='small' hierarchy='secondary'>ปรึกษาผ่าน Telemedicine เสร็จสิ้นแล้ว</ColorfulBadge>
            ) : form.appointment.telemedStatus === 'started' ? (
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

        <div className='flex items-center gap-3 flex-wrap'>
          <SelectableTag
            label='โรงเรียนพ่อแม่ (การเตรียมตัวคลอด / การเลี้ยงลูกด้วยนมแม่)'
            size='lg'
            selected={form.appointment.parentSchool}
            onClick={() => setAppt('parentSchool')(!form.appointment.parentSchool)}
          />
          {/* สอนการนับลูกดิ้น — manual p.15: fetal movement is usually felt
              from 18-20wk onward, so this only makes sense once the
              pregnancy has reached that point. */}
          {(gestationalAge?.weeks ?? 0) >= 18 && (
            <SelectableTag
              label='สอนการนับลูกดิ้น'
              size='lg'
              selected={form.appointment.kickCountEducation}
              onClick={() => setAppt('kickCountEducation')(!form.appointment.kickCountEducation)}
            />
          )}
        </div>
      </div>
    </StepCard>
  );
};

/* ── Step 7 — ใบฝากครรภ์ ───────────────────────────────────────────
   ANC-card + appointment-slip print preview (TOR 1.10.7.5/.6), same
   print-card shell shape as `Step7Certificate` in TreatmentSteps.jsx. */
export const AncStep7Card = ({ form, setForm, patient, cardPatient }) => {
  const gestationalAge = useMemo(() => calculateGestationalAge(form.lmp), [form.lmp]);
  const edc = useMemo(() => calculateEDC(form.lmp), [form.lmp]);
  const riskLevel = resolveAncRiskLevel(form.riskLevel);

  const confirm = () => {
    /* Append this visit onto the patient's real follow-up trend (TOR
       1.10.7.8) so the NEXT visit's Step 1 shows it — not just the
       static mock rows. */
    /* `cardPatient.hn` (patientProfiles.js) is canonical — see
       AncStep1History for why `patient.hn` (MR roster) isn't safe here. */
    saveAncVisitRecord(cardPatient?.hn, {
      date: formatAncDate(new Date()),
      gestWeeks: gestationalAge?.weeks ?? '-',
      fundusHeight: form.fundusHeight ? `${form.fundusHeight} ซม.` : '-',
      fetalHeartRate: form.fetalHeartRate ? `${form.fetalHeartRate} bpm` : '-',
      bp: form.vitals.bp,
      weight: form.vitals.weight,
      urineResult: form.labResults?.urineResult || '-',
      riskLevel: form.riskLevel || '-',
      labSummary: summarizeLabResults(form.labResults),
      note: summarizeAncProcedures(form) || form.diagnosisNote || form.currentPregnancyNote || '-',
    });
    setForm((f) => ({
      ...f,
      cardConfirmed: true,
      cardConfirmedAt: new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }).format(new Date()),
    }));
  };

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='file-text'>ใบฝากครรภ์ / ใบนัดหมาย</TopicHeader>
        <div
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-300, 12px)',
            padding: 'var(--dim-space-600, 24px)',
            borderRadius: 'var(--dim-radius-400, 12px)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            background: 'var(--surface-card-100, #FFFFFF)',
          }}
        >
          <div className='flex items-center justify-between'>
            <span style={{ fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-brandPrimary-default, #007549)' }}>
              บัตรฝากครรภ์ (ANC Card)
            </span>
            {riskLevel && (
              <ColorfulBadge style={riskLevel.value === 'low' ? 'green' : riskLevel.value === 'intermediate' ? 'yellow' : 'red'} size='small' hierarchy='secondary'>
                {riskLevel.label}
              </ColorfulBadge>
            )}
          </div>
          <div className='grid grid-cols-2 gap-x-6 gap-y-2' style={{ fontSize: 'var(--type-size-sm)' }}>
            <span>HN: {cardPatient?.hn}</span>
            <span>ชื่อ-สกุล: {cardPatient?.fullName || patient?.name}</span>
            <span>ครรภ์ที่ (G-P-A-L): {form.gravida || '—'}-{form.para || 0}-{form.abortion || 0}-{form.livingChildren || 0}</span>
            <span>LMP: {formatAncDate(form.lmp)}</span>
            <span>กำหนดคลอด (EDC): {formatAncDate(edc)}</span>
            <span>อายุครรภ์ปัจจุบัน: {gestationalAge ? formatGestationalAge(gestationalAge) : '—'}</span>
            <span>นัดหมายครั้งถัดไป: {formatAncDate(form.appointment.date)}</span>
            <span>สถานที่นัด: {form.appointment.facility === 'pcu' ? 'หน่วยปฐมภูมิ / รพ.สต.' : form.appointment.facility === 'hospital' ? 'โรงพยาบาล' : '—'}</span>
            {form.appointment.mode === 'telemedicine' && (
              <span>Telemedicine: {form.appointment.telemedStatus === 'completed' ? 'ปรึกษาเสร็จสิ้นแล้ว' : form.appointment.telemedStatus === 'started' ? 'กำลังปรึกษา' : 'ยังไม่เริ่ม'}</span>
            )}
          </div>
        </div>

        {form.cardConfirmed ? (
          <div className='flex items-center gap-2' style={{ color: 'var(--text-brandPrimary-default, #007549)', fontSize: 'var(--type-size-sm)' }}>
            <Icon name='check-circle' size={18} />
            ยืนยันและพิมพ์ใบฝากครรภ์แล้ว · {form.cardConfirmedAt}
          </div>
        ) : (
          <button
            type='button'
            onClick={confirm}
            className='self-start inline-flex items-center'
            style={{
              height: 'var(--dim-size-1000, 44px)',
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
              gap: 'var(--dim-space-200, 8px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-brandPrimaryButton-default, #007549)',
              color: 'var(--text-brandPrimaryButton-on-brand, #FFFFFF)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-medium)',
            }}
          >
            <Icon name='check' size={18} />
            ยืนยันและพิมพ์ใบฝากครรภ์
          </button>
        )}
      </div>
    </StepCard>
  );
};
