import React, { useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import DatePicker from '@/components/forms/DatePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import FileUploadField from '@/components/forms/FileUploadField';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import { useTelemedCall } from '@/components/telemed/TelemedCallProvider';
import {
  ADDICTION_PROGRAMS,
  ADDICTION_SUBSTANCES,
  ADDICTION_USE_METHODS,
  ASSIST_QUESTIONS,
  ASSIST_SCALE,
  interpretAssistScore,
  SMOKING_READINESS_QUESTIONS,
  NICOTINE_QUESTIONS,
  interpretNicotineScore,
  SMOKING_CAUSE_OPTIONS,
  AUDIT_QUESTIONS,
  AUDIT_SCALE,
  interpretAuditScore,
  MATRIX_ACTIVITIES,
  METHADONE_DOSES,
  getMethadoneDispenses,
  hasMethadoneDispenseToday,
  saveMethadoneDispense,
  ADDICTION_DRUG_ORDERS,
  ADDICTION_LAB_ORDERS,
  ADDICTION_XRAY_ORDERS,
  ADDICTION_DOCUMENT_TYPES,
  DOCUMENT_ACCEPT,
  DOCUMENT_MAX_MB,
  ADDICTION_HISTORY_SUGGESTIONS,
  ADDICTION_FAMILY_SUGGESTIONS,
  ADDICTION_BEHAVIOR_SUGGESTIONS,
  ADDICTION_PSYCH_SUGGESTIONS,
  ADDICTION_SOCIAL_SUGGESTIONS,
  ADDICTION_ACTIVITY_SUGGESTIONS,
  ADDICTION_COUNSELING_SUGGESTIONS,
  ADDICTION_PLAN_SUGGESTIONS,
  getOpdCarriedScreening,
  getAddictionPriorSessions,
  hasProgramAssessmentData,
  isRightsExpired,
  resolveProgram,
  ADDICTION_CURRENT_USER,
  formatAddictionDateTime,
  todayIsoDate,
} from '@/data/addictionVisits';
import { TopicHeader, Field, StepCard, NoticeBand } from '@/pages/clinic/addiction/addictionShared';

/* AddictionSteps — step bodies for บันทึกบำบัดผู้ติดสารเสพติด (TOR
   1.10.5.3/.4/.5/.7), plugged into the shared TreatmentFormShell scaffold
   exactly like AncSteps. Steps 2 and 4 switch their content by the
   patient's โปรแกรมบำบัด (BMA Matrix Model · เมทาโดน/IDU Care สยส. ·
   บุหรี่ แบบประเมิน 1-3 · แอลกอฮอล์ AUDIT + BI) per the legacy manual —
   its ~30 sub-forms are condensed into program-aware content, TOR-leaf
   complete, per-form representative. */

const ScaleQuestion = ({ question, scale, value, onPick, readOnly }) => (
  <div className='flex items-center justify-between gap-4 w-full flex-wrap'>
    <span className='text-sm' style={{ color: 'var(--text-content-default, #363B3F)', maxWidth: 520 }}>
      {question.label}
    </span>
    <div className='flex items-center gap-2 shrink-0 flex-wrap'>
      {scale.map((opt) => (
        <SelectableTag
          key={opt.value}
          label={opt.label}
          size='md'
          selected={value === opt.value}
          onClick={() => { if (!readOnly) onPick(opt.value); }}
        />
      ))}
    </div>
  </div>
);

/* ── Step 1 — ซักประวัติ / แรกรับ (manual §2.2.1) ─────────────────── */

export const AddictionStep1History = ({ form, setForm, hn, readOnly, onProgramChange }) => {
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const carried = getOpdCarriedScreening(hn);
  const program = resolveProgram(form.program);

  return (
    <StepCard>
      {/* 1.10.5.3 — แสดงผลการซักประวัติจาก OPD (read-only, cross-module).
          Same HN keys the OPD screening mock, so the carried block is
          demonstrably the other module's data, not re-typed here. */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='history'>ผลการซักประวัติจากจุดคัดกรอง (OPD)</TopicHeader>
        {carried ? (
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
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            }}
          >
            <span style={{ fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)', fontSize: 'var(--type-size-sm)' }}>
              อาการสำคัญ: {carried.chiefComplaint}
            </span>
            <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm)' }}>
              {carried.screeningNote}
            </span>
            <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-xs)' }}>
              บันทึกโดย {carried.recordedBy} · {carried.recordedAt} (อ่านอย่างเดียว — แก้ไขได้ที่ระบบคัดกรอง OPD)
            </span>
          </div>
        ) : (
          <NoticeBand tone='info' icon='info'>
            ผู้รับบริการรายนี้ยังไม่มีผลการซักประวัติจากจุดคัดกรอง OPD ของวันนี้
          </NoticeBand>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard'>โปรแกรมบำบัดและสารเสพติดที่ใช้</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='โปรแกรมบำบัด' required hint={program ? program.label : undefined}>
            <Select
              showLabel={false} searchable={false} size='lg'
              value={form.program}
              onChange={(v) => onProgramChange(v)}
              options={ADDICTION_PROGRAMS.map((p) => ({ value: p.value, label: p.label }))}
              placeholder='เลือกโปรแกรมบำบัด'
              disabled={readOnly}
            />
          </Field>
          <Field label='สารเสพติดหลัก' required>
            <Select
              showLabel={false} searchable={false} size='lg'
              value={form.mainSubstance}
              onChange={set('mainSubstance')}
              options={ADDICTION_SUBSTANCES}
              placeholder='เลือกสารเสพติดหลัก'
              disabled={readOnly}
            />
          </Field>
          <Field label='สารเสพติดรอง (ถ้ามี)'>
            <Select
              showLabel={false} searchable={false} size='lg'
              value={form.secondarySubstance}
              onChange={set('secondarySubstance')}
              options={ADDICTION_SUBSTANCES}
              placeholder='ไม่มี'
              disabled={readOnly}
            />
          </Field>
        </div>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='วิธีใช้'>
            <Select
              showLabel={false} searchable={false} size='lg'
              value={form.useMethod}
              onChange={set('useMethod')}
              options={ADDICTION_USE_METHODS}
              placeholder='เลือกวิธีใช้'
              disabled={readOnly}
            />
          </Field>
          <Field label='อายุที่เริ่มใช้ครั้งแรก (ปี)'>
            <InputField
              value={form.firstUseAge}
              onChange={set('firstUseAge')}
              type='number'
              placeholder='เช่น 18'
              disabled={readOnly}
            />
          </Field>
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='file-text'>ประวัติการเจ็บป่วย</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.illnessHistory}
          onChange={(e) => set('illnessHistory')(e.target.value)}
          suggestions={ADDICTION_HISTORY_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น ไม่มีโรคประจำตัว ปฏิเสธการแพ้ยา'
          disabled={readOnly}
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='users'>ประวัติครอบครัว</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.familyHistory}
          onChange={(e) => set('familyHistory')(e.target.value)}
          suggestions={ADDICTION_FAMILY_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น อาศัยกับครอบครัว ครอบครัวสนับสนุนการบำบัด'
          disabled={readOnly}
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='activity'>พฤติกรรมการใช้สารเสพติด</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.drugBehavior}
          onChange={(e) => set('drugBehavior')(e.target.value)}
          suggestions={ADDICTION_BEHAVIOR_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น เริ่มใช้ครั้งแรกอายุ 18 ปี ความถี่ ปริมาณ และเหตุกระตุ้น'
          disabled={readOnly}
        />
      </div>
    </StepCard>
  );
};

/* ── Step 2 — คัดกรองและแบบประเมิน ────────────────────────────────── */

export const AddictionStep2Assessment = ({ form, setForm, readOnly, blockedMsg }) => {
  const setAssist = (key, value) => setForm((f) => ({ ...f, assistAnswers: { ...f.assistAnswers, [key]: value } }));
  const setReadiness = (key, value) => setForm((f) => ({ ...f, smokingReadiness: { ...f.smokingReadiness, [key]: value } }));
  const setNicotine = (key, value) => setForm((f) => ({ ...f, nicotineAnswers: { ...f.nicotineAnswers, [key]: value } }));
  const toggleCause = (key) => setForm((f) => ({ ...f, smokingCauses: { ...f.smokingCauses, [key]: !f.smokingCauses[key] } }));
  const setAudit = (key, value) => setForm((f) => ({ ...f, auditAnswers: { ...f.auditAnswers, [key]: value } }));

  const assistDone = Object.keys(form.assistAnswers).length === ASSIST_QUESTIONS.length;
  const assistTotal = Object.values(form.assistAnswers).reduce((sum, v) => sum + v, 0);
  const assistResult = assistDone ? interpretAssistScore(assistTotal) : null;

  const nicotineDone = Object.keys(form.nicotineAnswers).length === NICOTINE_QUESTIONS.length;
  const nicotineTotal = Object.values(form.nicotineAnswers).reduce((sum, v) => sum + v, 0);
  const nicotineResult = nicotineDone ? interpretNicotineScore(nicotineTotal) : null;

  const auditDone = Object.keys(form.auditAnswers).length === AUDIT_QUESTIONS.length;
  const auditTotal = Object.values(form.auditAnswers).reduce((sum, v) => sum + v, 0);
  const auditResult = auditDone ? interpretAuditScore(auditTotal) : null;

  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard-list'>แบบคัดกรองการใช้สารเสพติด (ASSIST)</TopicHeader>
        <div className='flex flex-col gap-3'>
          {ASSIST_QUESTIONS.map((q) => (
            <ScaleQuestion
              key={q.key}
              question={q}
              scale={ASSIST_SCALE}
              value={form.assistAnswers[q.key]}
              onPick={(v) => setAssist(q.key, v)}
              readOnly={readOnly}
            />
          ))}
        </div>
        {assistResult && (
          <ColorfulBadge style={assistResult.badge} size='small' hierarchy='secondary' width='hug' maxWidth={640}>
            คะแนนรวม {assistTotal} — {assistResult.label}
          </ColorfulBadge>
        )}
      </div>

      {form.program === 'smoking' && (
        <>
          <div className='flex flex-col gap-3'>
            <TopicHeader icon='clipboard'>แบบประเมิน 1 — ความพร้อมในการเลิกบุหรี่ (manual 2.3.2)</TopicHeader>
            <div className='flex flex-col gap-2'>
              {SMOKING_READINESS_QUESTIONS.map((q) => (
                <div key={q.key} className='flex items-center justify-between gap-4 w-full flex-wrap'>
                  <span className='text-sm' style={{ color: 'var(--text-content-default, #363B3F)' }}>{q.label}</span>
                  <div className='flex items-center gap-2 shrink-0'>
                    <SelectableTag label='ใช่' size='md' selected={form.smokingReadiness[q.key] === true} onClick={() => { if (!readOnly) setReadiness(q.key, true); }} />
                    <SelectableTag label='ไม่ใช่' size='md' selected={form.smokingReadiness[q.key] === false} onClick={() => { if (!readOnly) setReadiness(q.key, false); }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className='flex flex-col gap-3'>
            <TopicHeader icon='clipboard'>แบบประเมิน 2 — การติดสารนิโคติน (manual 2.3.3)</TopicHeader>
            <div className='flex flex-col gap-3'>
              {NICOTINE_QUESTIONS.map((q) => (
                <div key={q.key} className='flex items-center justify-between gap-4 w-full flex-wrap'>
                  <span className='text-sm' style={{ color: 'var(--text-content-default, #363B3F)', maxWidth: 420 }}>{q.label}</span>
                  <div className='flex items-center gap-2 shrink-0 flex-wrap'>
                    {q.options.map((opt) => (
                      <SelectableTag
                        key={opt.label}
                        label={opt.label}
                        size='md'
                        selected={form.nicotineAnswers[q.key] === opt.value}
                        onClick={() => { if (!readOnly) setNicotine(q.key, opt.value); }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {nicotineResult && (
              <ColorfulBadge style={nicotineResult.badge} size='small' hierarchy='secondary' width='hug' maxWidth={640}>
                คะแนนรวม {nicotineTotal} — {nicotineResult.label}
              </ColorfulBadge>
            )}
          </div>

          <div className='flex flex-col gap-3'>
            <TopicHeader icon='clipboard'>แบบประเมิน 3 — สาเหตุการสูบบุหรี่ (manual 2.3.4)</TopicHeader>
            <div className='flex items-center gap-3 flex-wrap'>
              {SMOKING_CAUSE_OPTIONS.map((c) => (
                <SelectableTag
                  key={c.key}
                  label={c.label}
                  size='lg'
                  selected={!!form.smokingCauses[c.key]}
                  onClick={() => { if (!readOnly) toggleCause(c.key); }}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {form.program === 'alcohol' && (
        <div className='flex flex-col gap-3'>
          <TopicHeader icon='clipboard'>แบบประเมิน AUDIT — พฤติกรรมการดื่มสุรา (manual 2.4.3)</TopicHeader>
          <div className='flex flex-col gap-3'>
            {AUDIT_QUESTIONS.map((q) => (
              <ScaleQuestion
                key={q.key}
                question={q}
                scale={AUDIT_SCALE}
                value={form.auditAnswers[q.key]}
                onPick={(v) => setAudit(q.key, v)}
                readOnly={readOnly}
              />
            ))}
          </div>
          {auditResult && (
            <ColorfulBadge style={auditResult.badge} size='small' hierarchy='secondary' width='hug' maxWidth={640}>
              คะแนนรวม {auditTotal} — {auditResult.label}
            </ColorfulBadge>
          )}
        </div>
      )}

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='meh'>ประเมินและทดสอบทางจิตวิทยา (manual 2.2.5)</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.psychNote}
          onChange={(e) => setForm((f) => ({ ...f, psychNote: e.target.value }))}
          suggestions={ADDICTION_PSYCH_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น 2Q ปกติ ไม่พบความเสี่ยงทำร้ายตนเอง'
          disabled={readOnly}
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='users'>ประเมินวินิจฉัยทางสังคม (manual 2.2.6)</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.socialDiagnosisNote}
          onChange={(e) => setForm((f) => ({ ...f, socialDiagnosisNote: e.target.value }))}
          suggestions={ADDICTION_SOCIAL_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น อาชีพ รายได้ ที่พัก และผู้ดูแล'
          disabled={readOnly}
        />
      </div>
    </StepCard>
  );
};

/* ── Step 3 — ตรวจร่างกาย ─────────────────────────────────────────── */

export const AddictionStep3Examination = ({ form, setForm, readOnly }) => {
  const setVital = (key) => (value) => setForm((f) => ({ ...f, vitals: { ...f.vitals, [key]: value } }));

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='stethoscope'>สัญญาณชีพ</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='ความดันโลหิต (BP)'>
            <InputField value={form.vitals.bp} onChange={setVital('bp')} placeholder='120/80' disabled={readOnly} />
          </Field>
          <Field label='ชีพจร (HR)'>
            <InputField value={form.vitals.hr} onChange={setVital('hr')} type='number' placeholder='80' disabled={readOnly} />
          </Field>
          <Field label='อุณหภูมิ (°C)'>
            <InputField value={form.vitals.temp} onChange={setVital('temp')} type='number' placeholder='36.5' disabled={readOnly} />
          </Field>
          <Field label='น้ำหนัก (กก.)'>
            <InputField value={form.vitals.weight} onChange={setVital('weight')} type='number' placeholder='60' disabled={readOnly} />
          </Field>
          <Field label='ส่วนสูง (ซม.)'>
            <InputField value={form.vitals.height} onChange={setVital('height')} type='number' placeholder='170' disabled={readOnly} />
          </Field>
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='stethoscope'>ผลการตรวจร่างกาย</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.physicalNote}
          onChange={(e) => setForm((f) => ({ ...f, physicalNote: e.target.value }))}
          suggestions={[
            'ตรวจร่างกายทั่วไปปกติ ไม่พบร่องรอยการฉีดยา',
            'พบรอยฉีดยาบริเวณแขนซ้าย แผลแห้งดี ไม่มีการอักเสบ',
            'ฟังปอดปกติ ไม่มีเสียงผิดปกติ',
            'ตับโตคลำได้ 2 FB ใต้ชายโครงขวา — นัดตรวจ LFT',
          ]}
          minChars={3}
          placeholder='บันทึกผลการตรวจร่างกาย'
          disabled={readOnly}
        />
      </div>
    </StepCard>
  );
};

/* ── Step 4 — กิจกรรมบำบัด (program-aware) ────────────────────────── */

export const AddictionStep4Activity = ({ form, setForm, hn, sessionNo, readOnly, onDataChanged }) => {
  const telemed = useTelemedCall();
  const [methadoneError, setMethadoneError] = useState('');
  const priorSessions = getAddictionPriorSessions(hn);
  const dispenses = getMethadoneDispenses(hn);
  const dispensedToday = hasMethadoneDispenseToday(hn);

  const dispenseMethadone = () => {
    const res = saveMethadoneDispense(hn, form.methadoneDose);
    if (res.error) {
      setMethadoneError(res.error);
      return;
    }
    setMethadoneError('');
    onDataChanged?.();
  };

  return (
    <StepCard>
      {form.program === 'matrix' && (
        <div className='flex flex-col gap-3'>
          <TopicHeader icon='users'>บันทึกกิจกรรม BMA MATRIX MODEL — ครั้งที่ {sessionNo} (manual 2.2.2)</TopicHeader>
          <div className='flex items-start gap-4 w-full flex-wrap'>
            <Field label='กิจกรรมที่เข้าร่วมวันนี้' required>
              <Select
                showLabel={false} searchable={false} size='lg'
                value={form.matrixActivity}
                onChange={(v) => setForm((f) => ({ ...f, matrixActivity: v }))}
                options={MATRIX_ACTIVITIES}
                placeholder='เลือกกิจกรรมกลุ่ม'
                disabled={readOnly}
              />
            </Field>
          </div>
          <SuggestibleTextarea
            voice
            value={form.activityNote}
            onChange={(e) => setForm((f) => ({ ...f, activityNote: e.target.value }))}
            suggestions={ADDICTION_ACTIVITY_SUGGESTIONS}
            minChars={3}
            placeholder='บันทึกการมีส่วนร่วมและผลของกิจกรรม'
            disabled={readOnly}
          />
        </div>
      )}

      {form.program === 'methadone' && (
        <div className='flex flex-col gap-3'>
          <TopicHeader icon='medication'>บันทึกรับ-จ่ายยาเมทาโดนรายวัน (สยส.3, manual 2.5.9-2.5.10)</TopicHeader>
          <div className='flex items-end gap-4 w-full flex-wrap'>
            <Field label='ขนาดยาเมทาโดนวันนี้'>
              <Select
                showLabel={false} searchable={false} size='lg'
                value={form.methadoneDose}
                onChange={(v) => setForm((f) => ({ ...f, methadoneDose: v }))}
                options={METHADONE_DOSES}
                placeholder='เลือกขนาดยา'
                disabled={readOnly || dispensedToday}
              />
            </Field>
            {dispensedToday ? (
              <ColorfulBadge style='green' size='small' hierarchy='secondary'>
                จ่ายยาเมทาโดนของวันนี้แล้ว
              </ColorfulBadge>
            ) : (
              <BrandSubdueButton variant='fill' size='md' leadingIcon='medication' onClick={dispenseMethadone} disabled={readOnly}>
                บันทึกจ่ายยาวันนี้
              </BrandSubdueButton>
            )}
          </div>
          {/* Duplicate same-day dispense — blocked with the สยส.3 explanation. */}
          {methadoneError && <NoticeBand tone='danger' icon='error'>{methadoneError}</NoticeBand>}
          {dispenses.length > 0 && (
            <Table
              columns={[
                { key: 'date', label: 'วันที่' },
                { key: 'dose', label: 'ขนาดยา' },
                { key: 'by',   label: 'ผู้จ่ายยา', flex: true, minWidth: 160 },
                { key: 'at',   label: 'เวลาบันทึก', flex: true, minWidth: 180 },
              ]}
              rows={dispenses}
              rowKey={(r) => `${r.date}-${r.at}`}
              emptyMessage='ยังไม่มีบันทึกจ่ายยา'
            />
          )}
        </div>
      )}

      {form.program === 'smoking' && (
        <div className='flex flex-col gap-3'>
          <TopicHeader icon='calendar'>แผนการบำบัดบุหรี่ (manual 2.3.5)</TopicHeader>
          <div className='flex items-start gap-4 w-full flex-wrap'>
            <Field label='กำหนดวันเลิกบุหรี่ (Quit date)'>
              <DatePicker
                value={form.smokingQuitDate ? new Date(form.smokingQuitDate) : null}
                onChange={(d) => setForm((f) => ({ ...f, smokingQuitDate: d ? d.toISOString().slice(0, 10) : '' }))}
                placeholder='เลือกวันที่'
                showLabel={false}
                disabled={readOnly}
              />
            </Field>
          </div>
          <SuggestibleTextarea
            voice
            value={form.smokingPlanNote}
            onChange={(e) => setForm((f) => ({ ...f, smokingPlanNote: e.target.value }))}
            suggestions={ADDICTION_PLAN_SUGGESTIONS}
            minChars={3}
            placeholder='แผนการบำบัดและการใช้ตัวช่วยเลิกบุหรี่'
            disabled={readOnly}
          />
        </div>
      )}

      {form.program === 'alcohol' && (
        <div className='flex flex-col gap-3'>
          <TopicHeader icon='forum'>การบำบัดแอลกอฮอล์ — BI & Counselling (manual 2.4.4)</TopicHeader>
          <SuggestibleTextarea
            voice
            value={form.counselingNote}
            onChange={(e) => setForm((f) => ({ ...f, counselingNote: e.target.value }))}
            suggestions={ADDICTION_COUNSELING_SUGGESTIONS}
            minChars={3}
            placeholder='บันทึกการให้คำปรึกษาและเป้าหมายที่ตกลงร่วมกัน'
            disabled={readOnly}
          />
        </div>
      )}

      {/* Telemedicine (EMR/CPOE/Telemedicine clause of 1.10.5.7) — reuses the
          global TelemedCallProvider overlay mounted in Routes.jsx. */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='videocam'>Telemedicine</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {form.telemedStatus === 'completed' ? (
            <ColorfulBadge style='green' size='small' hierarchy='secondary'>ให้คำปรึกษาผ่าน Telemedicine เสร็จสิ้นแล้ว</ColorfulBadge>
          ) : (
            <BrandSubdueButton
              variant='fill'
              size='md'
              leadingIcon='videocam'
              disabled={readOnly}
              onClick={() => {
                telemed.start();
                setForm((f) => ({ ...f, telemedStatus: 'started' }));
              }}
            >
              เริ่มให้คำปรึกษาผ่าน Telemedicine
            </BrandSubdueButton>
          )}
          {form.telemedStatus === 'started' && (
            <NeutralSubdueButton
              size='md'
              leadingIcon='call_end'
              onClick={() => setForm((f) => ({ ...f, telemedStatus: 'completed' }))}
            >
              บันทึกจบการปรึกษา
            </NeutralSubdueButton>
          )}
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='history'>ประวัติการบำบัดครั้งก่อนหน้า</TopicHeader>
        <Table
          columns={[
            { key: 'sessionNo', label: 'ครั้งที่' },
            { key: 'date',      label: 'วันที่' },
            { key: 'activity',  label: 'กิจกรรม/การบำบัด', flex: true, minWidth: 220 },
            { key: 'urine',     label: 'ผลปัสสาวะ' },
            { key: 'therapist', label: 'ผู้บำบัด', flex: true, minWidth: 150 },
            { key: 'note',      label: 'บันทึก', flex: true, minWidth: 200 },
          ]}
          rows={priorSessions}
          rowKey={(r) => `${r.sessionNo}-${r.date}`}
          emptyMessage='ยังไม่มีประวัติการบำบัดครั้งก่อนหน้า — ครั้งนี้เป็นการบำบัดครั้งแรก'
        />
      </div>
    </StepCard>
  );
};

/* ── Step 5 — สั่งการรักษา (CPOE) ─────────────────────────────────── */

export const AddictionStep5Orders = ({ form, setForm, hn, readOnly }) => {
  const toggle = (group) => (key) => setForm((f) => ({ ...f, [group]: { ...f[group], [key]: !f[group][key] } }));
  const rightsExpired = isRightsExpired(hn);
  const anyBillableSelected = ADDICTION_DRUG_ORDERS.some((d) => d.billable && form.drugOrders[d.key]);

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
            onClick={() => { if (!readOnly) onToggle(item.key); }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <StepCard>
      {/* สิทธิหมดอายุ (§1.4.2 rights edge case) — warn BEFORE billable orders. */}
      {rightsExpired && (
        <NoticeBand tone='warning' icon='warning'>
          สิทธิการรักษาของผู้รับบริการหมดอายุ — รายการยาที่มีค่าใช้จ่ายจะถูกเรียกเก็บเงินเอง
          โปรดแจ้งผู้รับบริการหรือส่งต่องานสิทธิประโยชน์ก่อนสั่ง
        </NoticeBand>
      )}
      {rightsExpired && anyBillableSelected && (
        <NoticeBand tone='danger' icon='error'>
          มีรายการยาที่มีค่าใช้จ่ายถูกเลือกไว้ขณะสิทธิหมดอายุ — ตรวจสอบก่อนยืนยันการสั่ง
        </NoticeBand>
      )}

      <ChipGroup icon='medication' title='สั่งยา' items={ADDICTION_DRUG_ORDERS} values={form.drugOrders} onToggle={toggle('drugOrders')} />
      <ChipGroup icon='biotech' title='สั่งตรวจ Lab' items={ADDICTION_LAB_ORDERS} values={form.labOrders} onToggle={toggle('labOrders')} />
      <ChipGroup icon='radiology' title='สั่งตรวจ X-ray' items={ADDICTION_XRAY_ORDERS} values={form.xrayOrders} onToggle={toggle('xrayOrders')} />

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='file-text'>หมายเหตุการสั่งการรักษา</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.orderNote}
          onChange={(e) => setForm((f) => ({ ...f, orderNote: e.target.value }))}
          suggestions={[
            'สุ่มตรวจปัสสาวะประจำเดือนตามแผน สยส.',
            'นัดเจาะ LFT ก่อนพบแพทย์ครั้งถัดไป',
            'ให้ยากลับบ้าน 7 วัน พร้อมคำแนะนำการใช้ยา',
          ]}
          minChars={3}
          placeholder='รายละเอียดเพิ่มเติมของการสั่งการรักษา'
          disabled={readOnly}
        />
      </div>
    </StepCard>
  );
};

/* ── Step 6 — เอกสารระหว่างการรักษา ──────────────────────────────── */

export const AddictionStep6Documents = ({ form, setForm, readOnly }) => {
  const [docType, setDocType] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const addDocument = () => {
    /* Validation: type + file both required; oversize / unsupported-type
       mock errors mirror what the real uploader would reject. */
    if (!docType || !pendingFile) {
      setUploadError('ต้องเลือกประเภทเอกสารและไฟล์ก่อนอัปโหลด');
      return;
    }
    if (pendingFile.size > DOCUMENT_MAX_MB * 1024 * 1024) {
      setUploadError(`ไฟล์มีขนาดเกิน ${DOCUMENT_MAX_MB} MB — โปรดย่อไฟล์ก่อนอัปโหลด`);
      return;
    }
    const okExt = DOCUMENT_ACCEPT.split(',').some((ext) => pendingFile.name.toLowerCase().endsWith(ext.trim()));
    if (!okExt) {
      setUploadError(`รองรับเฉพาะไฟล์ ${DOCUMENT_ACCEPT} เท่านั้น`);
      return;
    }
    setUploadError('');
    setForm((f) => ({
      ...f,
      documents: [
        {
          id: `doc-${Date.now()}`,
          type: docType,
          fileName: pendingFile.name,
          uploadedBy: ADDICTION_CURRENT_USER,
          uploadedAt: formatAddictionDateTime(),
        },
        ...f.documents,
      ],
    }));
    setDocType('');
    setPendingFile(null);
  };

  const confirmDelete = () => {
    setForm((f) => ({ ...f, documents: f.documents.filter((d) => d.id !== deleteTarget.id) }));
    setDeleteTarget(null);
  };

  return (
    <StepCard>
      <Popup
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title='ลบเอกสารแนบ'
        subtitle={deleteTarget ? `${deleteTarget.type} · ${deleteTarget.fileName}` : ''}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setDeleteTarget(null) }}
        primaryAction={{ label: 'ยืนยันลบเอกสาร', onClick: confirmDelete, tone: 'danger' }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
          เอกสารที่ลบแล้วไม่สามารถกู้คืนได้ ต้องการลบใช่หรือไม่?
        </span>
      </Popup>

      {!readOnly && (
        <div className='flex flex-col gap-3'>
          <TopicHeader icon='upload_file'>อัปโหลดเอกสารระหว่างการรักษา</TopicHeader>
          <div className='flex items-end gap-4 w-full flex-wrap'>
            <Field label='ประเภทเอกสาร' required>
              <Select
                showLabel={false} searchable={false} size='lg'
                value={docType}
                onChange={setDocType}
                options={ADDICTION_DOCUMENT_TYPES}
                placeholder='เลือกประเภทเอกสาร'
              />
            </Field>
            <Field label={`ไฟล์เอกสาร (${DOCUMENT_ACCEPT} ไม่เกิน ${DOCUMENT_MAX_MB} MB)`} required>
              <FileUploadField
                accept={DOCUMENT_ACCEPT}
                fileName={pendingFile?.name || null}
                onFile={(file) => { setPendingFile(file); setUploadError(''); }}
                onClear={() => setPendingFile(null)}
              />
            </Field>
            <BrandSubdueButton variant='fill' size='md' leadingIcon='upload' onClick={addDocument}>
              อัปโหลด
            </BrandSubdueButton>
          </div>
          {uploadError && <NoticeBand tone='danger' icon='error'>{uploadError}</NoticeBand>}
        </div>
      )}

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='folder_open'>เอกสารแนบของการรักษาครั้งนี้</TopicHeader>
        <Table
          columns={[
            { key: 'type',       label: 'ประเภทเอกสาร', flex: true, minWidth: 220 },
            { key: 'fileName',   label: 'ชื่อไฟล์', flex: true, minWidth: 200 },
            { key: 'uploadedBy', label: 'ผู้อัปโหลด', flex: true, minWidth: 160 },
            { key: 'uploadedAt', label: 'เวลาอัปโหลด', flex: true, minWidth: 180 },
            {
              key: 'actions', label: 'การดำเนินการ', sortable: false,
              render: (row) => (
                readOnly ? null : (
                  <NeutralSubdueButton size='sm' leadingIcon='delete' onClick={() => setDeleteTarget(row)}>
                    ลบ
                  </NeutralSubdueButton>
                )
              ),
            },
          ]}
          rows={form.documents}
          rowKey={(r) => r.id}
          emptyMessage='ยังไม่มีเอกสารแนบ — อัปโหลดเอกสารแรกได้จากแบบฟอร์มด้านบน'
        />
      </div>
    </StepCard>
  );
};

/* ── Step 7 — นัดหมาย ─────────────────────────────────────────────── */

const APPOINTMENT_TIMES = ['09:00', '09:30', '10:00', '10:30', '13:00', '13:30', '14:00', '14:30'];

/** Mock existing bookings — 10:00 is "เต็ม" so the conflict warning is
    demonstrable without a backend. */
const CONFLICT_TIMES = ['10:00'];

export const AddictionStep7Appointment = ({ form, setForm, readOnly }) => {
  const [error, setError] = useState('');
  const appt = form.appointment;
  const setAppt = (key) => (value) => setForm((f) => ({ ...f, appointment: { ...f.appointment, [key]: value } }));

  const isPast = appt.date && appt.date < todayIsoDate();
  const hasConflict = appt.time && CONFLICT_TIMES.includes(appt.time);

  const saveAppointment = () => {
    if (!appt.date) { setError('ต้องเลือกวันนัดหมายก่อนบันทึก'); return; }
    if (isPast) { setError('ไม่สามารถนัดหมายย้อนหลังได้ — โปรดเลือกวันที่ตั้งแต่วันนี้เป็นต้นไป'); return; }
    if (!appt.time) { setError('ต้องเลือกเวลานัดหมายก่อนบันทึก'); return; }
    setError('');
    setForm((f) => ({
      ...f,
      appointment: { ...f.appointment, status: 'saved', savedAt: formatAddictionDateTime() },
    }));
  };

  const cancelAppointment = () => setForm((f) => ({
    ...f,
    appointment: { date: '', time: '', note: '', status: 'cancelled', savedAt: formatAddictionDateTime() },
  }));

  const editAppointment = () => setForm((f) => ({
    ...f,
    appointment: { ...f.appointment, status: 'editing' },
  }));

  /* แสดง — saved appointment card with แก้ไข + ยกเลิก (ครบ 4 การดำเนินการ). */
  if (appt.status === 'saved') {
    return (
      <StepCard>
        <div className='flex flex-col gap-3'>
          <TopicHeader icon='event_available'>นัดหมายครั้งถัดไป</TopicHeader>
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
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            }}
          >
            <span style={{ fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}>
              นัดวันที่ {appt.date} เวลา {appt.time} น. — งานบำบัดสารเสพติด
            </span>
            {appt.note && (
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>{appt.note}</span>
            )}
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              บันทึกนัดหมายเมื่อ {appt.savedAt}
            </span>
          </div>
          {!readOnly && (
            <div className='flex items-center gap-3'>
              <BrandSubdueButton variant='outline' size='md' leadingIcon='edit' onClick={editAppointment}>
                แก้ไขนัดหมาย
              </BrandSubdueButton>
              <NeutralSubdueButton size='md' leadingIcon='event_busy' onClick={cancelAppointment}>
                ยกเลิกนัดหมาย
              </NeutralSubdueButton>
            </div>
          )}
        </div>
      </StepCard>
    );
  }

  return (
    <StepCard>
      {appt.status === 'cancelled' && (
        <NoticeBand tone='info' icon='event_busy'>
          นัดหมายถูกยกเลิกเมื่อ {appt.savedAt} — บันทึกนัดหมายใหม่ได้จากแบบฟอร์มด้านล่าง
        </NoticeBand>
      )}

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='calendar'>บันทึกนัดหมายครั้งถัดไป</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='วันนัดหมาย' required hint={isPast ? undefined : 'เลือกวันที่ตั้งแต่วันนี้เป็นต้นไป'}>
            <DatePicker
              value={appt.date ? new Date(appt.date) : null}
              onChange={(d) => { setAppt('date')(d ? d.toISOString().slice(0, 10) : ''); setError(''); }}
              placeholder='เลือกวันที่'
              showLabel={false}
              disabled={readOnly}
            />
          </Field>
          <Field label='เวลานัดหมาย' required>
            <Select
              showLabel={false} searchable={false} size='lg'
              value={appt.time}
              onChange={(v) => { setAppt('time')(v); setError(''); }}
              options={APPOINTMENT_TIMES}
              placeholder='เลือกเวลา'
              disabled={readOnly}
            />
          </Field>
        </div>

        {isPast && (
          <NoticeBand tone='danger' icon='error'>
            วันที่ที่เลือกเป็นวันในอดีต — ไม่สามารถบันทึกนัดหมายย้อนหลังได้
          </NoticeBand>
        )}
        {hasConflict && !isPast && (
          <NoticeBand tone='warning' icon='warning'>
            เวลา {appt.time} น. มีผู้รับบริการนัดไว้เต็มแล้ว — บันทึกซ้อนได้แต่ควรพิจารณาเลือกเวลาอื่น
          </NoticeBand>
        )}

        <SuggestibleTextarea
          voice
          value={appt.note}
          onChange={(e) => setAppt('note')(e.target.value)}
          suggestions={[
            'นัดกิจกรรมกลุ่ม Matrix ครั้งถัดไป',
            'นัดรับยาเมทาโดนรายวัน',
            'นัดติดตามผลหลังกำหนดวันเลิกบุหรี่',
            'นัดให้คำปรึกษาต่อเนื่องครั้งถัดไป',
          ]}
          minChars={3}
          placeholder='หมายเหตุการนัดหมาย'
          disabled={readOnly}
        />

        {error && <NoticeBand tone='danger' icon='error'>{error}</NoticeBand>}

        {!readOnly && (
          <BrandSubdueButton variant='fill' size='md' leadingIcon='event_available' onClick={saveAppointment}>
            บันทึกนัดหมาย
          </BrandSubdueButton>
        )}
      </div>
    </StepCard>
  );
};

/* Re-export the program-switch guard helper for the form page. */
export { hasProgramAssessmentData };
