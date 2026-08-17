import React, { useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import CarriedScreeningPanel from '@/components/screening/CarriedScreeningPanel';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import DatePicker from '@/components/forms/DatePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import FileUploadField from '@/components/forms/FileUploadField';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { useTelemedCall } from '@/components/telemed/TelemedCallProvider';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import AddDiagnosisPopup from '@/components/popup/AddDiagnosisPopup';
import AddMedicationPopup from '@/components/popup/AddMedicationPopup';
import {
  HIV_STI_DOCTORS,
  HIV_STI_KEY_POPULATIONS,
  HIV_STI_RISK_BEHAVIORS,
  HIV_STI_SYPHILIS_TESTS,
  HIV_STI_OTHER_SCREENINGS,
  HIV_TEST_DECISIONS,
  HIV_NO_TEST_REASONS,
  HIV_TEST_RESULT_OPTIONS,
  PARTNER_HIV_RESULT_OPTIONS,
  STI_DIAGNOSES,
  PEP_REGIMEN_OPTIONS,
  PREP_REGIMEN_OPTIONS,
  computePepDueDate,
  computePepDayNumber,
  HEALTH_EDUCATION_TOPICS,
  HIV_STI_DOC_TYPES,
  HIV_STI_UPLOAD_ACCEPT,
  HIV_STI_UPLOAD_MAX_MB,
  validateHivStiUpload,
  HIV_STI_APPOINTMENT_TYPES,
  HIV_STI_HISTORY_SUGGESTIONS,
  HIV_STI_RISK_NOTE_SUGGESTIONS,
  VCT_PRETEST_SUGGESTIONS,
  VCT_POSTTEST_SUGGESTIONS,
  HIV_STI_DIAGNOSIS_NOTE_SUGGESTIONS,
  HIV_STI_EDUCATION_NOTE_SUGGESTIONS,
  HIV_STI_APPOINTMENT_NOTE_SUGGESTIONS,
  resolveArvStatus,
  formatHivStiDate,
  hivStiNowStamp,
  HIV_STI_CURRENT_STAFF,
  getHivStiVisitHistoryByHn,
} from '@/data/hivStiVisits';
import { TopicHeader, Field, StepCard, clientTypeBadge } from '@/pages/clinic/hiv-sti/hivStiShared';

/* HivStiSteps — step bodies for บันทึกงาน HIV/STI (TOR §1.10.6.7 plus
   .1/.3/.4/.5), plugged into the shared TreatmentFormShell scaffold the
   same way AncSteps / AddictionSteps are.

   The legacy HCIS screen "บันทึกการดูแลรักษาเอดส์ฯ" (คู่มือ บทที่ 2) is an
   8-tab form: ข้อมูลทั่วไป · VCT · HIV Test · สังคมสงเคราะห์ · ข้อมูล STI ·
   บริการคัดกรอง · การวินิจฉัยรักษา · การให้สุขศึกษา. Those tabs are folded
   onto the 7-step scaffold as:
     1 ซักประวัติ                 ← ข้อมูลทั่วไป (+ vital signs)
     2 พฤติกรรมเสี่ยงและคัดกรอง   ← ข้อมูล STI + บริการคัดกรอง
     3 VCT & HIV Test             ← VCT + HIV Test (+ สังคมสงเคราะห์ note)
     4 วินิจฉัย                   ← การวินิจฉัยรักษา (checklist + ICD-10)
     5 สั่งการรักษา               ← คำสั่งแพทย์ + PEP/PrEP
     6 สุขศึกษาและเอกสาร          ← การให้สุขศึกษา + อัปโหลดเอกสาร (2.14)
     7 นัดหมาย                    ← ใบนัด (2.11) — ข้อความกลางเสมอ

   Every step is a controlled view over the ONE `form` object owned by
   HivStiFormPage; nothing here writes to the stores directly (the page
   owns draft-saving), so a step can be rendered inert (`readOnly`) by
   the page without any extra bookkeeping. */

/* ── Local notice band (hivStiShared owns only ReadOnlyBanner) ─────── */

const NOTICE_TONES = {
  info: {
    background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
    color: 'var(--text-brandPrimary-default, #007549)',
  },
  warning: {
    background: 'var(--surface-alert-warning, #FFF9F0)',
    color: 'var(--text-warning-default, #C2410C)',
  },
  danger: {
    background: 'var(--surface-danger-quaternary, #FFF0F0)',
    color: 'var(--text-danger-default, #B91C1C)',
  },
};

const NoticeBand = ({ tone = 'warning', icon = 'warning', children }) => {
  const palette = NOTICE_TONES[tone] || NOTICE_TONES.warning;
  return (
    <div
      className='flex items-start w-full'
      style={{
        gap: 'var(--dim-space-200, 8px)',
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-medium)',
        ...palette,
      }}
    >
      <Icon name={icon} size={18} />
      <span>{children}</span>
    </div>
  );
};

/* Flat info panel — reused for the carried registry block + saved
   appointment card so both read like the ANC/Addiction equivalents. */
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
      border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
    }}
  >
    {children}
  </div>
);

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const isoFromDate = (d) => (d ? d.toISOString().slice(0, 10) : '');

const keyPopulationLabel = (value) =>
  HIV_STI_KEY_POPULATIONS.find((o) => o.value === value)?.label || '—';

/* ── Step 1 — ซักประวัติ (แท็บข้อมูลทั่วไป + Vital signs) ───────────── */

export const HivStiStep1History = ({ form, setForm, hn, clinicPatient, visitNo, readOnly }) => {
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setVital = (key) => (value) => setForm((f) => ({ ...f, vitals: { ...f.vitals, [key]: value } }));
  const history = useMemo(() => getHivStiVisitHistoryByHn(hn), [hn]);
  const arv = resolveArvStatus(clinicPatient?.arvStatus);
  const badge = clientTypeBadge(clinicPatient?.clientType);

  return (
    <StepCard>
      {/* ผลจากจุดคัดกรองเดียวของระบบ (`/opd/screening`) — อ่านอย่างเดียว
          คลินิกไม่คัดกรองซ้ำเอง step 2 เก็บเฉพาะแบบประเมินพฤติกรรมเสี่ยง */}
      <CarriedScreeningPanel patient={{ hn }} />

      {/* ข้อมูลระดับคลินิกจากทะเบียน — read-only; แก้ไขที่ทะเบียนผู้รับบริการ
          เท่านั้น เพื่อไม่ให้ข้อมูลทะเบียนถูกแก้จากหน้าบันทึกการรักษา. */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='history'>ข้อมูลจากทะเบียนผู้รับบริการคลินิก</TopicHeader>
        {clinicPatient ? (
          <InfoPanel>
            <div className='flex items-center gap-2 flex-wrap'>
              <span style={{ fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)', fontSize: 'var(--type-size-sm)' }}>
                {clinicPatient.uic || '—'} · การมารับบริการครั้งที่ {visitNo}
              </span>
              <ColorfulBadge style={badge.style} size='small' hierarchy='secondary'>{badge.label}</ColorfulBadge>
              {arv && <ColorfulBadge style='blue' size='small' hierarchy='secondary'>{arv.label}</ColorfulBadge>}
            </div>
            <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm)' }}>
              กลุ่มประชากรเฉพาะ: {keyPopulationLabel(clinicPatient.keyPopulation)}
            </span>
            <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-xs)' }}>
              เหตุผลที่มารับบริการวันนี้: {clinicPatient.visitReason || '—'} (อ่านอย่างเดียว — แก้ไขได้ที่ทะเบียนผู้รับบริการ)
            </span>
          </InfoPanel>
        ) : (
          <NoticeBand tone='info' icon='info'>
            ผู้รับบริการรายนี้ยังไม่มีข้อมูลในทะเบียนคลินิก HIV/STI — บันทึกการรักษาได้ตามปกติ
            และลงทะเบียนภายหลังที่หน้าทะเบียนผู้รับบริการ
          </NoticeBand>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard'>ข้อมูลการตรวจครั้งนี้</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='แพทย์ผู้ตรวจ' required>
            <Select
              showLabel={false} searchable={false} size='lg'
              value={form.examiningDoctor}
              onChange={set('examiningDoctor')}
              options={HIV_STI_DOCTORS}
              placeholder='เลือกแพทย์ผู้ตรวจ'
              disabled={readOnly}
            />
          </Field>
          <Field label='อาการสำคัญ (Chief complaint)'>
            <InputField
              value={form.chiefComplaint}
              onChange={set('chiefComplaint')}
              placeholder='เช่น มีแผลบริเวณอวัยวะเพศ'
              disabled={readOnly}
            />
          </Field>
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='file-text'>ประวัติการเจ็บป่วยปัจจุบัน</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.illnessHistory}
          onChange={(e) => set('illnessHistory')(e.target.value)}
          suggestions={HIV_STI_HISTORY_SUGGESTIONS}
          minChars={3}
          placeholder='เช่น มีไข้ต่ำ ๆ ต่อมน้ำเหลืองโต 2 สัปดาห์'
          disabled={readOnly}
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='users'>ประวัติครอบครัวและผู้ดูแล</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.familyHistory}
          onChange={(e) => set('familyHistory')(e.target.value)}
          suggestions={[
            'อาศัยอยู่กับคู่ ทราบผลเลือดของคู่แล้ว',
            'อาศัยอยู่คนเดียว ไม่มีผู้ดูแล',
            'ครอบครัวยังไม่ทราบผลเลือด — ผู้รับบริการขอปกปิด',
            'มีผู้ดูแลช่วยเตือนการกินยาต่อเนื่อง',
          ]}
          minChars={3}
          placeholder='บันทึกสภาพครอบครัว ผู้ดูแล และการเปิดเผยผลเลือด'
          disabled={readOnly}
        />
      </div>

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
        <TopicHeader icon='history'>ประวัติการมารับบริการครั้งก่อนหน้า</TopicHeader>
        <Table
          columns={[
            { key: 'visitNo', label: 'ครั้งที่' },
            { key: 'date', label: 'วันที่' },
            { key: 'chiefComplaint', label: 'อาการสำคัญ', flex: true, minWidth: 180 },
            { key: 'summary', label: 'สรุปการรักษา', flex: true, minWidth: 260 },
            { key: 'hivResult', label: 'ผล HIV' },
            { key: 'doctor', label: 'แพทย์ผู้ตรวจ', flex: true, minWidth: 160 },
          ]}
          rows={history}
          rowKey={(r) => `${r.visitNo}-${r.date}`}
          emptyMessage='ยังไม่มีประวัติการมารับบริการ — ครั้งนี้เป็นครั้งแรกของผู้รับบริการ'
        />
      </div>
    </StepCard>
  );
};

/* ── Step 2 — พฤติกรรมเสี่ยงและบริการคัดกรอง ──────────────────────── */

export const HivStiStep2Risk = ({ form, setForm, readOnly }) => {
  const toggleRisk = (key) => setForm((f) => ({
    ...f,
    riskBehaviors: { ...f.riskBehaviors, [key]: !f.riskBehaviors?.[key] },
  }));
  const setSyphilis = (key) => (value) => setForm((f) => ({
    ...f,
    syphilisResults: { ...f.syphilisResults, [key]: value },
  }));
  const setScreening = (key) => (value) => setForm((f) => ({
    ...f,
    otherScreenings: { ...f.otherScreenings, [key]: value },
  }));

  const riskCount = Object.values(form.riskBehaviors || {}).filter(Boolean).length;
  const anyReactive = HIV_STI_SYPHILIS_TESTS
    .some((t) => String(form.syphilisResults?.[t.key] || '').startsWith('Reactive'));

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='activity'>พฤติกรรมเสี่ยง (3 เดือนที่ผ่านมา)</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {HIV_STI_RISK_BEHAVIORS.map((item) => (
            <SelectableTag
              key={item.key}
              label={item.label}
              size='lg'
              selected={!!form.riskBehaviors?.[item.key]}
              onClick={() => { if (!readOnly) toggleRisk(item.key); }}
            />
          ))}
        </div>
        {riskCount >= 3 && (
          <NoticeBand tone='warning' icon='warning'>
            ผู้รับบริการมีพฤติกรรมเสี่ยง {riskCount} ข้อ — เข้าเกณฑ์ให้คำปรึกษาเชิงลึกและพิจารณา PrEP/PEP
            ในขั้นตอนสั่งการรักษา
          </NoticeBand>
        )}
        <SuggestibleTextarea
          voice
          value={form.riskNote}
          onChange={(e) => setForm((f) => ({ ...f, riskNote: e.target.value }))}
          suggestions={HIV_STI_RISK_NOTE_SUGGESTIONS}
          minChars={3}
          placeholder='รายละเอียดความเสี่ยง เช่น วันที่สัมผัสความเสี่ยงครั้งล่าสุด'
          disabled={readOnly}
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='biotech'>ผลตรวจซิฟิลิส (Antibody tests for Syphilis)</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          {HIV_STI_SYPHILIS_TESTS.map((test) => (
            <Field key={test.key} label={test.label}>
              <Select
                showLabel={false} searchable={false} size='lg'
                value={form.syphilisResults?.[test.key] || ''}
                onChange={setSyphilis(test.key)}
                options={test.options}
                placeholder='เลือกผลตรวจ'
                disabled={readOnly}
              />
            </Field>
          ))}
        </div>
        {anyReactive && (
          <NoticeBand tone='warning' icon='warning'>
            พบผล Reactive — ต้องบันทึกการวินิจฉัยซิฟิลิสและแผนการรักษาในขั้นตอนถัดไป
            พร้อมนัดติดตามผลการรักษา
          </NoticeBand>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='biotech'>บริการคัดกรองอื่น ๆ</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          {HIV_STI_OTHER_SCREENINGS.map((test) => (
            <Field key={test.key} label={test.label}>
              <Select
                showLabel={false} searchable={false} size='lg'
                value={form.otherScreenings?.[test.key] || ''}
                onChange={setScreening(test.key)}
                options={test.options}
                placeholder='เลือกผลตรวจ'
                disabled={readOnly}
              />
            </Field>
          ))}
        </div>
      </div>
    </StepCard>
  );
};

/* ── Step 3 — VCT & HIV Test ──────────────────────────────────────── */

export const HivStiStep3Vct = ({ form, setForm, readOnly }) => {
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const isPositive = form.hivTestResult === 'positive';
  const noTest = form.hivTestDecision === 'no-test';
  const resultOption = HIV_TEST_RESULT_OPTIONS.find((o) => o.value === form.hivTestResult);

  return (
    <StepCard>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='forum'>การให้คำปรึกษาก่อนตรวจ (Pre-test counselling)</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          <SelectableTag
            label='ให้คำปรึกษาก่อนตรวจแล้ว'
            size='lg'
            selected={!!form.preTestDone}
            onClick={() => { if (!readOnly) set('preTestDone')(!form.preTestDone); }}
          />
        </div>
        <SuggestibleTextarea
          voice
          value={form.preTestNote}
          onChange={(e) => set('preTestNote')(e.target.value)}
          suggestions={VCT_PRETEST_SUGGESTIONS}
          minChars={3}
          placeholder='บันทึกสาระสำคัญของการให้คำปรึกษาก่อนตรวจ'
          disabled={readOnly}
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard'>การตัดสินใจตรวจ HIV</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {HIV_TEST_DECISIONS.map((opt) => (
            <SelectableTag
              key={opt.value}
              label={opt.label}
              size='lg'
              selected={form.hivTestDecision === opt.value}
              onClick={() => { if (!readOnly) set('hivTestDecision')(opt.value); }}
            />
          ))}
        </div>
        {!form.preTestDone && form.hivTestDecision === 'test' && (
          <NoticeBand tone='warning' icon='warning'>
            ยังไม่ได้บันทึกการให้คำปรึกษาก่อนตรวจ — การตรวจ HIV ต้องผ่าน Pre-test counselling
            และความยินยอมของผู้รับบริการเสมอ
          </NoticeBand>
        )}
        {noTest && (
          <div className='flex items-start gap-4 w-full flex-wrap'>
            <Field label='เหตุผลที่ยังไม่ตรวจครั้งนี้' required>
              <Select
                showLabel={false} searchable={false} size='lg'
                value={form.hivNoTestReason}
                onChange={set('hivNoTestReason')}
                options={HIV_NO_TEST_REASONS}
                placeholder='เลือกเหตุผล'
                disabled={readOnly}
              />
            </Field>
          </div>
        )}
      </div>

      {form.hivTestDecision === 'test' && (
        <div className='flex flex-col gap-3'>
          <TopicHeader icon='biotech'>ผลการตรวจ HIV</TopicHeader>
          <div className='flex items-center gap-3 flex-wrap'>
            {HIV_TEST_RESULT_OPTIONS.map((opt) => (
              <SelectableTag
                key={opt.value}
                label={opt.label}
                size='lg'
                selected={form.hivTestResult === opt.value}
                onClick={() => { if (!readOnly) set('hivTestResult')(opt.value); }}
              />
            ))}
          </div>
          {resultOption && (
            <div className='flex items-center gap-2 flex-wrap'>
              <ColorfulBadge style={resultOption.badge} size='small' hierarchy='secondary'>
                {resultOption.label}
              </ColorfulBadge>
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                ผลตรวจถูกจัดเป็นข้อมูลลับ §1.4.2 — เอกสารที่พิมพ์ออกจากระบบใช้ข้อความกลางเท่านั้น
              </span>
            </div>
          )}
          <div className='flex items-center gap-3 flex-wrap'>
            <SelectableTag
              label='อยู่ในช่วง Window period — ต้องนัดตรวจซ้ำ'
              size='lg'
              selected={!!form.windowPeriod}
              onClick={() => { if (!readOnly) set('windowPeriod')(!form.windowPeriod); }}
            />
          </div>
          <div className='flex items-start gap-4 w-full flex-wrap'>
            <Field label='ผลเลือดของคู่ (Partner status)'>
              <Select
                showLabel={false} searchable={false} size='lg'
                value={form.partnerHivResult}
                onChange={set('partnerHivResult')}
                options={PARTNER_HIV_RESULT_OPTIONS}
                placeholder='เลือกผลเลือดของคู่'
                disabled={readOnly}
              />
            </Field>
          </div>
        </div>
      )}

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='forum'>การให้คำปรึกษาหลังตรวจ (Post-test counselling)</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          <SelectableTag
            label='ให้คำปรึกษาหลังฟังผลแล้ว'
            size='lg'
            selected={!!form.postTestDone}
            onClick={() => { if (!readOnly) set('postTestDone')(!form.postTestDone); }}
          />
        </div>
        {isPositive && !form.postTestDone && (
          <NoticeBand tone='danger' icon='error'>
            ผลตรวจเป็น Positive — ต้องบันทึกการให้คำปรึกษาหลังฟังผลก่อนจึงจะถือว่าขั้นตอนนี้ครบถ้วน
            และควรเชื่อมต่อระบบรับยา ARV โดยเร็วที่สุด (Same-day ART)
          </NoticeBand>
        )}
        <SuggestibleTextarea
          voice
          value={form.postTestNote}
          onChange={(e) => set('postTestNote')(e.target.value)}
          suggestions={VCT_POSTTEST_SUGGESTIONS}
          minChars={3}
          placeholder='บันทึกการแจ้งผล การประเมินสภาพจิตใจ และการส่งต่อทีมสหวิชาชีพ'
          disabled={readOnly}
        />
      </div>
    </StepCard>
  );
};

/* ── Step 4 — วินิจฉัย STI + ICD-10 ───────────────────────────────── */

export const HivStiStep4Diagnosis = ({ form, setForm, readOnly }) => {
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  const toggleSti = (key) => setForm((f) => ({
    ...f,
    stiChecklist: { ...f.stiChecklist, [key]: !f.stiChecklist?.[key] },
  }));

  const addDiagnosis = (row) => {
    setForm((f) => ({
      ...f,
      diagnoses: [
        ...(f.diagnoses || []),
        { id: `dx-${Date.now()}`, code: row.code, name: row.name, type: row.type },
      ],
    }));
    setAddOpen(false);
  };

  const confirmRemove = () => {
    setForm((f) => ({ ...f, diagnoses: (f.diagnoses || []).filter((d) => d.id !== removeTarget.id) }));
    setRemoveTarget(null);
  };

  return (
    <StepCard>
      <AddDiagnosisPopup
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onConfirm={addDiagnosis}
      />
      <Popup
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title='ลบรหัสการวินิจฉัย'
        subtitle={removeTarget ? `${removeTarget.code} · ${removeTarget.name}` : ''}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setRemoveTarget(null) }}
        primaryAction={{ label: 'ยืนยันลบ', onClick: confirmRemove, tone: 'danger' }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
          รายการที่ลบแล้วไม่สามารถกู้คืนได้ ต้องการลบใช่หรือไม่?
        </span>
      </Popup>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard'>ผลการตรวจพบโรคติดต่อทางเพศสัมพันธ์</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {STI_DIAGNOSES.map((item) => (
            <SelectableTag
              key={item.key}
              label={`${item.label} · ${item.icd10}`}
              size='lg'
              selected={!!form.stiChecklist?.[item.key]}
              onClick={() => { if (!readOnly) toggleSti(item.key); }}
            />
          ))}
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard-list'>รหัสการวินิจฉัย (ICD-10)</TopicHeader>
        {!readOnly && (
          <div className='flex items-center gap-3 flex-wrap'>
            <BrandSubdueButton variant='outline' size='md' leadingIcon='add' onClick={() => setAddOpen(true)}>
              เพิ่มรหัสการวินิจฉัย
            </BrandSubdueButton>
          </div>
        )}
        <Table
          columns={[
            { key: 'code', label: 'รหัส ICD-10' },
            { key: 'name', label: 'โรค / การวินิจฉัย', flex: true, minWidth: 260 },
            { key: 'type', label: 'ประเภทการวินิจฉัย', flex: true, minWidth: 180 },
            {
              key: 'actions', label: 'การดำเนินการ', sortable: false,
              render: (row) => (readOnly ? null : (
                <NeutralSubdueButton size='sm' leadingIcon='delete' onClick={() => setRemoveTarget(row)}>
                  ลบ
                </NeutralSubdueButton>
              )),
            },
          ]}
          rows={form.diagnoses || []}
          rowKey={(r) => r.id || r.code}
          emptyMessage='ยังไม่มีรหัสการวินิจฉัย — เพิ่มได้จากปุ่มด้านบน'
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='file-text'>บันทึกการวินิจฉัยและแผนการรักษา</TopicHeader>
        <SuggestibleTextarea
          voice
          value={form.diagnosisNote}
          onChange={(e) => setForm((f) => ({ ...f, diagnosisNote: e.target.value }))}
          suggestions={HIV_STI_DIAGNOSIS_NOTE_SUGGESTIONS}
          minChars={3}
          placeholder='สรุปผลการตรวจร่างกาย รอยโรคที่พบ และแผนการรักษา'
          disabled={readOnly}
        />
      </div>
    </StepCard>
  );
};

/* ── Step 5 — สั่งการรักษา (CPOE) + PEP / PrEP ────────────────────── */

/* รายการที่สั่งบ่อยของคลินิก — chips ที่เลือกจะถูกส่งเป็นคำสั่งไปยัง
   ระบบ Lab (§1.15) / รังสีวินิจฉัย (§1.12) ตามข้อกำหนดการเชื่อมโยง. */
const HIV_STI_LAB_ORDERS = [
  'Anti-HIV (Rapid test)',
  'CD4 count',
  'HIV Viral load',
  'RPR / VDRL',
  'TPHA / TPPA',
  'HBsAg / Anti-HCV',
  'Creatinine (ก่อนเริ่ม PrEP/PEP)',
  'Gram stain / Wet smear',
];

const HIV_STI_XRAY_ORDERS = [
  'Chest X-ray (PA) — คัดกรองวัณโรค',
];

export const HivStiStep5Orders = ({ form, setForm, clinicPatient, readOnly }) => {
  const [medOpen, setMedOpen] = useState(false);
  const [removeMed, setRemoveMed] = useState(null);
  const telemed = useTelemedCall();
  /* ปรึกษาทางไกลแสดงเฉพาะเมื่อวิสิตนี้ถูกทำเครื่องหมาย telemedicine จากคิว */
  const isTelemedVisit = !!clinicPatient?.telemedicine;

  const toggleArray = (key, value) => setForm((f) => {
    const current = f[key] || [];
    return {
      ...f,
      [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    };
  });

  const addMedication = (med) => {
    setForm((f) => ({
      ...f,
      medications: [...(f.medications || []), { ...med, id: `med-${Date.now()}` }],
    }));
    setMedOpen(false);
  };

  const confirmRemoveMed = () => {
    setForm((f) => ({ ...f, medications: (f.medications || []).filter((m) => m.id !== removeMed.id) }));
    setRemoveMed(null);
  };

  const pepDue = useMemo(() => computePepDueDate(form.pepStartDate), [form.pepStartDate]);
  const pepDay = useMemo(() => computePepDayNumber(form.pepStartDate), [form.pepStartDate]);

  return (
    <StepCard>
      <AddMedicationPopup open={medOpen} onClose={() => setMedOpen(false)} onConfirm={addMedication} />
      <Popup
        open={!!removeMed}
        onClose={() => setRemoveMed(null)}
        title='ลบรายการยา'
        subtitle={removeMed ? removeMed.name : ''}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setRemoveMed(null) }}
        primaryAction={{ label: 'ยืนยันลบ', onClick: confirmRemoveMed, tone: 'danger' }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
          รายการยาที่ลบแล้วไม่สามารถกู้คืนได้ ต้องการลบใช่หรือไม่?
        </span>
      </Popup>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='medication'>สั่งยา</TopicHeader>
        {!readOnly && (
          <div className='flex items-center gap-3 flex-wrap'>
            <BrandSubdueButton variant='outline' size='md' leadingIcon='add' onClick={() => setMedOpen(true)}>
              เพิ่มรายการยา
            </BrandSubdueButton>
          </div>
        )}
        <Table
          columns={[
            { key: 'name', label: 'ชื่อยา', flex: true, minWidth: 220 },
            { key: 'usage', label: 'วิธีใช้', flex: true, minWidth: 140 },
            { key: 'dosePerTake', label: 'ครั้งละ' },
            { key: 'frequency', label: 'ความถี่', flex: true, minWidth: 140 },
            { key: 'when', label: 'เวลาใช้ยา', flex: true, minWidth: 130 },
            { key: 'quantity', label: 'จำนวน' },
            {
              key: 'actions', label: 'การดำเนินการ', sortable: false,
              render: (row) => (readOnly ? null : (
                <NeutralSubdueButton size='sm' leadingIcon='delete' onClick={() => setRemoveMed(row)}>
                  ลบ
                </NeutralSubdueButton>
              )),
            },
          ]}
          rows={form.medications || []}
          rowKey={(r) => r.id || r.name}
          emptyMessage='ยังไม่มีรายการยา — เพิ่มได้จากปุ่มด้านบน'
        />
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='biotech'>สั่งตรวจทางห้องปฏิบัติการ</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {HIV_STI_LAB_ORDERS.map((item) => (
            <SelectableTag
              key={item}
              label={item}
              size='lg'
              selected={(form.labOrders || []).includes(item)}
              onClick={() => { if (!readOnly) toggleArray('labOrders', item); }}
            />
          ))}
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='radiology'>สั่งตรวจทางรังสีวินิจฉัย</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {HIV_STI_XRAY_ORDERS.map((item) => (
            <SelectableTag
              key={item}
              label={item}
              size='lg'
              selected={(form.xrayOrders || []).includes(item)}
              onClick={() => { if (!readOnly) toggleArray('xrayOrders', item); }}
            />
          ))}
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='pill'>ยาป้องกันหลังสัมผัสเชื้อ (PEP)</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          <SelectableTag
            label='สั่งยา PEP ครั้งนี้'
            size='lg'
            selected={!!form.pepPrescribed}
            onClick={() => { if (!readOnly) setForm((f) => ({ ...f, pepPrescribed: !f.pepPrescribed })); }}
          />
        </div>
        {form.pepPrescribed && (
          <>
            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field label='สูตรยา PEP' required>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  value={form.pepRegimen}
                  onChange={(v) => setForm((f) => ({ ...f, pepRegimen: v }))}
                  options={PEP_REGIMEN_OPTIONS}
                  placeholder='เลือกสูตรยา'
                  disabled={readOnly}
                />
              </Field>
              <Field label='วันที่เริ่มยา' required hint='PEP ต้องเริ่มภายใน 72 ชั่วโมงหลังสัมผัสความเสี่ยง'>
                <DatePicker
                  value={form.pepStartDate ? new Date(form.pepStartDate) : null}
                  onChange={(d) => setForm((f) => ({ ...f, pepStartDate: isoFromDate(d) }))}
                  placeholder='เลือกวันที่'
                  showLabel={false}
                  disabled={readOnly}
                />
              </Field>
            </div>
            {pepDue && (
              <InfoPanel>
                <span style={{ fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)', fontSize: 'var(--type-size-sm)' }}>
                  ครบกำหนด 28 วันในวันที่ {formatHivStiDate(pepDue)} (ขณะนี้เป็นวันที่ {pepDay} ของการรับยา)
                </span>
                <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm)' }}>
                  ตั้งนัดติดตามผลการกินยาครบ 28 วันในขั้นตอนนัดหมาย
                </span>
              </InfoPanel>
            )}
          </>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='pill'>ยาป้องกันก่อนสัมผัสเชื้อ (PrEP)</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          <SelectableTag
            label='สั่งยา PrEP ครั้งนี้'
            size='lg'
            selected={!!form.prepPrescribed}
            onClick={() => { if (!readOnly) setForm((f) => ({ ...f, prepPrescribed: !f.prepPrescribed })); }}
          />
        </div>
        {form.prepPrescribed && (
          <>
            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field label='สูตรยา PrEP' required>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  value={form.prepRegimen}
                  onChange={(v) => setForm((f) => ({ ...f, prepRegimen: v }))}
                  options={PREP_REGIMEN_OPTIONS}
                  placeholder='เลือกสูตรยา'
                  disabled={readOnly}
                />
              </Field>
            </div>
            {form.hivTestResult === 'positive' && (
              <NoticeBand tone='danger' icon='error'>
                ผลตรวจ HIV เป็น Positive — ห้ามสั่ง PrEP ต้องส่งต่อเข้าระบบรับยา ARV แทน
              </NoticeBand>
            )}
            {!(form.labOrders || []).includes('Creatinine (ก่อนเริ่ม PrEP/PEP)') && (
              <NoticeBand tone='warning' icon='warning'>
                ยังไม่ได้สั่งตรวจ Creatinine — ควรตรวจการทำงานของไตและ HBsAg ก่อนเริ่ม PrEP
              </NoticeBand>
            )}
          </>
        )}
      </div>

      {/* ── ปรึกษาทางไกล (Telemedicine) — ข้อ Telemedicine ของ 1.10.6.7 ──
          แสดงเฉพาะวิสิตที่เป็นการปรึกษาทางไกล ใช้ overlay กลางจาก
          TelemedCallProvider (Routes.jsx) ไม่สร้างกลไกใหม่ */}
      {isTelemedVisit && (
        <div className='flex flex-col gap-3'>
          <TopicHeader icon='videocam'>ปรึกษาทางไกล (Telemedicine)</TopicHeader>
          <div className='flex items-center gap-3 flex-wrap'>
            {form.telemedStatus === 'completed' ? (
              <ColorfulBadge style='green' size='small' hierarchy='secondary'>ปรึกษาทางไกลเสร็จสิ้นแล้ว</ColorfulBadge>
            ) : form.telemedStatus === 'started' ? (
              <>
                <ColorfulBadge style='blue' size='small' hierarchy='secondary'>กำลังปรึกษาทางไกล</ColorfulBadge>
                <BrandSubdueButton
                  variant='outline'
                  size='md'
                  leadingIcon='videocam'
                  disabled={readOnly}
                  onClick={() => telemed.start()}
                >
                  กลับเข้าห้องปรึกษา
                </BrandSubdueButton>
                <NeutralSubdueButton
                  size='md'
                  leadingIcon='call_end'
                  onClick={() => { if (!readOnly) setForm((f) => ({ ...f, telemedStatus: 'completed' })); }}
                >
                  บันทึกจบการปรึกษา
                </NeutralSubdueButton>
              </>
            ) : (
              <>
                <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่เริ่มการปรึกษา</ColorfulBadge>
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
                  เข้าห้องปรึกษาทางไกล
                </BrandSubdueButton>
              </>
            )}
          </div>
          <SuggestibleTextarea
            voice
            value={form.telemedNote}
            onChange={(e) => setForm((f) => ({ ...f, telemedNote: e.target.value }))}
            suggestions={HIV_STI_TELEMED_NOTE_SUGGESTIONS}
            minChars={3}
            placeholder='สรุปการปรึกษาทางไกล (ไม่ระบุผลการตรวจในช่องทางที่ผู้อื่นเห็นได้)'
            disabled={readOnly}
          />
          <NoticeBand tone='info' icon='shield_person'>
            การปรึกษาทางไกลของคลินิกนี้เป็นข้อมูลลับ §1.4.2 — ห้ามบันทึกภาพหน้าจอ
            และให้ยืนยันตัวตนผู้รับบริการก่อนเปิดเผยผลการตรวจทุกครั้ง
          </NoticeBand>
        </div>
      )}
    </StepCard>
  );
};

/* ── Step 6 — สุขศึกษา + เอกสารแนบ ───────────────────────────────── */

export const HivStiStep6Education = ({ form, setForm, readOnly }) => {
  const [docType, setDocType] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const toggleTopic = (key) => setForm((f) => ({
    ...f,
    educationTopics: { ...f.educationTopics, [key]: !f.educationTopics?.[key] },
  }));

  const addAttachment = () => {
    if (!docType || !pendingFile) {
      setUploadError('ต้องเลือกประเภทเอกสารและไฟล์ก่อนอัปโหลด');
      return;
    }
    const problem = validateHivStiUpload(pendingFile);
    if (problem) {
      setUploadError(problem);
      return;
    }
    setUploadError('');
    setForm((f) => ({
      ...f,
      attachments: [
        {
          id: `att-${Date.now()}`,
          docType,
          name: pendingFile.name,
          sizeLabel: `${Math.max(1, Math.round((pendingFile.size || 0) / 1024))} KB`,
          uploadedBy: HIV_STI_CURRENT_STAFF.name,
          uploadedAt: hivStiNowStamp(),
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
        subtitle={deleteTarget ? `${deleteTarget.docType} · ${deleteTarget.name}` : ''}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setDeleteTarget(null) }}
        primaryAction={{ label: 'ยืนยันลบเอกสาร', onClick: confirmDelete, tone: 'danger' }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
          เอกสารที่ลบแล้วไม่สามารถกู้คืนได้ ต้องการลบใช่หรือไม่?
        </span>
      </Popup>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='forum'>หัวข้อสุขศึกษาที่ให้วันนี้</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {HEALTH_EDUCATION_TOPICS.map((topic) => (
            <SelectableTag
              key={topic.key}
              label={topic.label}
              size='lg'
              selected={!!form.educationTopics?.[topic.key]}
              onClick={() => { if (!readOnly) toggleTopic(topic.key); }}
            />
          ))}
        </div>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='จำนวนถุงยางอนามัยที่แจก (ชิ้น)'>
            <InputField
              value={form.condomCount}
              onChange={(v) => setForm((f) => ({ ...f, condomCount: v }))}
              type='number'
              placeholder='เช่น 10'
              disabled={readOnly}
            />
          </Field>
        </div>
        <SuggestibleTextarea
          voice
          value={form.educationNote}
          onChange={(e) => setForm((f) => ({ ...f, educationNote: e.target.value }))}
          suggestions={HIV_STI_EDUCATION_NOTE_SUGGESTIONS}
          minChars={3}
          placeholder='บันทึกสาระสำคัญของการให้สุขศึกษาและความเข้าใจของผู้รับบริการ'
          disabled={readOnly}
        />
      </div>

      {!readOnly && (
        <div className='flex flex-col gap-3'>
          <TopicHeader icon='upload_file'>อัปโหลดเอกสารประกอบการรักษา</TopicHeader>
          <div className='flex items-end gap-4 w-full flex-wrap'>
            <Field label='ประเภทเอกสาร' required>
              <Select
                showLabel={false} searchable={false} size='lg'
                value={docType}
                onChange={setDocType}
                options={HIV_STI_DOC_TYPES}
                placeholder='เลือกประเภทเอกสาร'
              />
            </Field>
            <Field label={`ไฟล์เอกสาร (${HIV_STI_UPLOAD_ACCEPT} ไม่เกิน ${HIV_STI_UPLOAD_MAX_MB} MB)`} required>
              <FileUploadField
                accept={HIV_STI_UPLOAD_ACCEPT}
                fileName={pendingFile?.name || null}
                onFile={(file) => { setPendingFile(file); setUploadError(''); }}
                onClear={() => setPendingFile(null)}
              />
            </Field>
            <BrandSubdueButton variant='fill' size='md' leadingIcon='upload' onClick={addAttachment}>
              อัปโหลด
            </BrandSubdueButton>
          </div>
          {uploadError && <NoticeBand tone='danger' icon='error'>{uploadError}</NoticeBand>}
        </div>
      )}

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='folder_open'>เอกสารแนบของการมารับบริการครั้งนี้</TopicHeader>
        <Table
          columns={[
            { key: 'docType', label: 'ประเภทเอกสาร', flex: true, minWidth: 200 },
            { key: 'name', label: 'ชื่อไฟล์', flex: true, minWidth: 200 },
            { key: 'sizeLabel', label: 'ขนาด' },
            { key: 'uploadedBy', label: 'ผู้อัปโหลด', flex: true, minWidth: 160 },
            { key: 'uploadedAt', label: 'เวลาอัปโหลด', flex: true, minWidth: 180 },
            {
              key: 'actions', label: 'การดำเนินการ', sortable: false,
              render: (row) => (readOnly ? null : (
                <NeutralSubdueButton size='sm' leadingIcon='delete' onClick={() => setDeleteTarget(row)}>
                  ลบ
                </NeutralSubdueButton>
              )),
            },
          ]}
          rows={form.attachments || []}
          rowKey={(r) => r.id || r.name}
          emptyMessage='ยังไม่มีเอกสารแนบ — อัปโหลดเอกสารแรกได้จากแบบฟอร์มด้านบน'
        />
      </div>
    </StepCard>
  );
};

/* ── Step 7 — นัดหมาย (ใบนัดใช้ข้อความกลางเสมอ · §1.4.2) ──────────── */

export const HivStiStep7Appointment = ({ form, setForm, readOnly, onConfirmRecord }) => {
  const [error, setError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmRecordOpen, setConfirmRecordOpen] = useState(false);
  const appt = form.appointment || { type: '', date: '', note: '' };
  const booked = !!appt.confirmed;
  const locked = readOnly || booked;
  const setAppt = (key) => (value) => setForm((f) => ({
    ...f,
    appointment: { ...(f.appointment || {}), [key]: value },
  }));

  const isPast = !!appt.date && appt.date < todayIsoDate();
  const typeLabel = HIV_STI_APPOINTMENT_TYPES.find((t) => t.value === appt.type)?.label || '';

  /* บันทึกนัดหมาย — validate ก่อน แล้วจึงยืนยันเป็นนัดจริง (stamp ผู้บันทึก) */
  const saveAppointment = () => {
    if (!appt.type) { setError('ต้องเลือกประเภทการนัดหมายก่อน'); return; }
    if (!appt.date) { setError('ต้องเลือกวันนัดหมายก่อน'); return; }
    if (isPast) { setError('ไม่สามารถนัดหมายย้อนหลังได้ — โปรดเลือกวันที่ตั้งแต่วันนี้เป็นต้นไป'); return; }
    setError('');
    setForm((f) => ({
      ...f,
      appointment: {
        ...(f.appointment || {}),
        confirmed: true,
        confirmedAt: hivStiNowStamp(),
        confirmedBy: HIV_STI_CURRENT_STAFF.name,
      },
      appointmentCancelled: null,
    }));
  };

  /* แก้ไขนัดหมาย — ปลดล็อกกลับเข้าโหมดกรอก (ยังคงค่าที่บันทึกไว้) */
  const editAppointment = () => {
    setError('');
    setForm((f) => ({ ...f, appointment: { ...(f.appointment || {}), confirmed: false } }));
  };

  /* ยกเลิกนัดหมาย — ล้างนัดแล้วเก็บ stamp ผู้ยกเลิก + เวลาไว้ในบันทึก */
  const confirmCancelAppointment = () => {
    setForm((f) => ({
      ...f,
      appointmentCancelled: {
        type: f.appointment?.type || '',
        date: f.appointment?.date || '',
        at: hivStiNowStamp(),
        by: HIV_STI_CURRENT_STAFF.name,
      },
      appointment: { type: '', date: '', note: '', confirmed: false, confirmedAt: '', confirmedBy: '' },
    }));
    setCancelOpen(false);
    setError('');
  };

  return (
    <StepCard>
      <Popup
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title='ยกเลิกนัดหมาย'
        subtitle={appt.date ? `${typeLabel || 'นัดหมาย'} · ${formatHivStiDate(appt.date)}` : ''}
        tertiaryAction={{ label: 'ไม่ยกเลิก', onClick: () => setCancelOpen(false) }}
        primaryAction={{ label: 'ยืนยันยกเลิกนัด', onClick: confirmCancelAppointment, tone: 'danger' }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
          ระบบจะลบนัดหมายนี้ออกจากบันทึกและเก็บชื่อผู้ยกเลิกกับเวลาไว้ในระบบ — บันทึกนัดใหม่ได้ทันที
        </span>
      </Popup>

      <Popup
        open={confirmRecordOpen}
        onClose={() => setConfirmRecordOpen(false)}
        title='ยืนยันบันทึกการรักษา'
        subtitle='บันทึกการมารับบริการครั้งนี้เข้าประวัติผู้รับบริการ'
        tertiaryAction={{ label: 'กลับไปตรวจทาน', onClick: () => setConfirmRecordOpen(false) }}
        primaryAction={{
          label: 'ยืนยันบันทึก',
          onClick: () => { setConfirmRecordOpen(false); onConfirmRecord && onConfirmRecord(); },
        }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
          ระบบจะบันทึกการรักษาครั้งนี้ต่อท้ายประวัติผู้รับบริการ ล้างร่างที่ค้างไว้
          และประทับชื่อผู้บันทึกกับเวลา จากนั้นกลับไปยังหน้าคิว
        </span>
      </Popup>

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='calendar'>นัดหมายครั้งถัดไป</TopicHeader>
        <div className='flex items-start gap-4 w-full flex-wrap'>
          <Field label='ประเภทการนัดหมาย' required>
            <Select
              showLabel={false} searchable={false} size='lg'
              value={appt.type}
              onChange={(v) => { setAppt('type')(v); setError(''); }}
              options={HIV_STI_APPOINTMENT_TYPES}
              placeholder='เลือกประเภทการนัดหมาย'
              disabled={locked}
            />
          </Field>
          <Field label='วันนัดหมาย' required hint='เลือกวันที่ตั้งแต่วันนี้เป็นต้นไป'>
            <DatePicker
              value={appt.date ? new Date(appt.date) : null}
              onChange={(d) => { setAppt('date')(isoFromDate(d)); setError(''); }}
              placeholder='เลือกวันที่'
              showLabel={false}
              disabled={locked}
            />
          </Field>
        </div>

        {isPast && (
          <NoticeBand tone='danger' icon='error'>
            วันที่ที่เลือกเป็นวันในอดีต — ไม่สามารถบันทึกนัดหมายย้อนหลังได้
          </NoticeBand>
        )}
        {form.windowPeriod && appt.type !== 'retest' && (
          <NoticeBand tone='warning' icon='warning'>
            บันทึกไว้ว่าผู้รับบริการอยู่ในช่วง Window period — ควรนัดเจาะเลือดซ้ำเพื่อยืนยันผล
          </NoticeBand>
        )}
        {form.pepPrescribed && appt.type !== 'pep28' && (
          <NoticeBand tone='warning' icon='warning'>
            ครั้งนี้มีการสั่งยา PEP — ต้องมีนัดติดตามผลการกินยาครบ 28 วันตามข้อกำหนดการติดตามการดูแล
          </NoticeBand>
        )}

        <SuggestibleTextarea
          voice
          value={appt.note}
          onChange={(e) => setAppt('note')(e.target.value)}
          suggestions={HIV_STI_APPOINTMENT_NOTE_SUGGESTIONS}
          minChars={3}
          placeholder='คำแนะนำที่จะพิมพ์ลงใบนัด (ใช้ข้อความกลาง ไม่ระบุผลการตรวจ)'
          disabled={locked}
        />

        {error && <NoticeBand tone='danger' icon='error'>{error}</NoticeBand>}

        {/* แถบปฏิบัติการนัดหมาย — ครบ 4 กริยาตาม TOR 1.10.6.5
            (แสดง = สรุปนัดด้านล่าง · บันทึก · แก้ไข · ยกเลิก) */}
        {!readOnly && (
          <div className='flex items-center gap-3 flex-wrap'>
            {!booked ? (
              <BrandSubdueButton variant='fill' size='md' leadingIcon='event_available' onClick={saveAppointment}>
                บันทึกนัดหมาย
              </BrandSubdueButton>
            ) : (
              <>
                <BrandSubdueButton variant='outline' size='md' leadingIcon='edit_calendar' onClick={editAppointment}>
                  แก้ไขนัดหมาย
                </BrandSubdueButton>
                <NeutralSubdueButton size='md' leadingIcon='event_busy' onClick={() => setCancelOpen(true)}>
                  ยกเลิกนัดหมาย
                </NeutralSubdueButton>
              </>
            )}
          </div>
        )}

        {form.appointmentCancelled && (
          <NoticeBand tone='warning' icon='event_busy'>
            {`ยกเลิกนัด ${HIV_STI_APPOINTMENT_TYPES.find((t) => t.value === form.appointmentCancelled.type)?.label || 'นัดหมาย'}`
              + ` วันที่ ${formatHivStiDate(form.appointmentCancelled.date)}`
              + ` โดย ${form.appointmentCancelled.by} · ${form.appointmentCancelled.at}`}
          </NoticeBand>
        )}
      </div>

      {appt.date && !isPast && (
        <div className='flex flex-col gap-3'>
          <TopicHeader icon='event_available'>สรุปนัดหมาย</TopicHeader>
          <InfoPanel>
            <div className='flex items-center gap-3 flex-wrap'>
              <span style={{ fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}>
                {typeLabel || 'นัดหมาย'} · วันที่ {formatHivStiDate(appt.date)}
              </span>
              <ColorfulBadge style={booked ? 'green' : 'yellow'} size='small' hierarchy='secondary'>
                {booked ? 'บันทึกนัดแล้ว' : 'ยังไม่บันทึกนัด'}
              </ColorfulBadge>
            </div>
            {appt.note && (
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>{appt.note}</span>
            )}
            {booked && appt.confirmedAt && (
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                {`บันทึกโดย ${appt.confirmedBy} · ${appt.confirmedAt}`}
              </span>
            )}
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              ใบนัดที่พิมพ์จะระบุเพียง "คลินิกเวชกรรม" ตามข้อกำหนดข้อมูลลับ §1.4.2 — ไม่ระบุชื่อคลินิกหรือผลการตรวจ
            </span>
          </InfoPanel>
        </div>
      )}

      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard'>เอกสารที่พิมพ์จากระบบ</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          <SelectableTag
            label='ใช้ข้อความกลางในเอกสารที่พิมพ์ (แนะนำ)'
            size='lg'
            selected={form.printNeutralSlip !== false}
            onClick={() => { if (!readOnly) setForm((f) => ({ ...f, printNeutralSlip: !f.printNeutralSlip })); }}
          />
        </div>
        {form.printNeutralSlip === false && (
          <NoticeBand tone='danger' icon='error'>
            ปิดข้อความกลางแล้ว — ใบนัดจะระบุชื่อคลินิก HIV/STI ซึ่งเสี่ยงต่อการเปิดเผยข้อมูลลับ
            ให้เลือกเฉพาะกรณีที่ผู้รับบริการยินยอมเป็นลายลักษณ์อักษรเท่านั้น
          </NoticeBand>
        )}
      </div>

      {/* ── ปิดงาน — ยืนยันบันทึกการรักษา (TOR 1.10.6.7) ──────────────
          เดิม "จบการบันทึก" ของ TreatmentFormShell แค่ push กลับหน้าคิว
          ทำให้บันทึกไม่ลงประวัติ ร่างค้าง และ dirty-guard เด้ง — ปุ่มนี้
          เป็นทางปิดงานจริงในขอบเขตโมดูล (ไม่แก้ template กลาง) */}
      {!readOnly && (
        <div className='flex flex-col gap-3'>
          <TopicHeader icon='task_alt'>ปิดการบันทึกการรักษา</TopicHeader>
          {form.recordConfirmed ? (
            <InfoPanel>
              <span style={{ fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}>
                บันทึกการรักษาครั้งนี้เรียบร้อยแล้ว
              </span>
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                {`บันทึกโดย ${form.recordConfirmedBy || HIV_STI_CURRENT_STAFF.name} · ${form.recordConfirmedAt}`}
              </span>
            </InfoPanel>
          ) : (
            <>
              {!appt.confirmed && (
                <NoticeBand tone='warning' icon='warning'>
                  ยังไม่ได้บันทึกนัดหมายครั้งถัดไป — ปิดบันทึกได้ แต่ผู้รับบริการจะไม่เข้าสู่ระบบติดตามการดูแล
                </NoticeBand>
              )}
              <div className='flex items-center gap-3 flex-wrap'>
                <BrandSubdueButton
                  variant='fill'
                  size='md'
                  leadingIcon='task_alt'
                  onClick={() => setConfirmRecordOpen(true)}
                >
                  ยืนยันบันทึกการรักษา
                </BrandSubdueButton>
              </div>
            </>
          )}
        </div>
      )}
    </StepCard>
  );
};
