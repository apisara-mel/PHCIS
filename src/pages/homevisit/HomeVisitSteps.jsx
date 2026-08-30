import React, { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import TimePicker from '@/components/forms/TimePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import { FieldGrid } from '@/components/forms/Fields';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import PhotoUploadField from '@/components/forms/PhotoUploadField';
import AddressMapBlock from '@/components/forms/AddressMapBlock';
import CarriedDentalPanel from '@/components/dental/CarriedDentalPanel';
import {
  DtxFields,
  HealthRiskFields,
  MinorIllnessFields,
} from '@/components/homevisit/homeScreeningSections';
import { PATIENT_GROUP_OPTIONS, MOBILITY_OPTIONS } from '@/data/registrationForm';
import { MEDICATION_NAME_OPTIONS } from '@/data/medicationCatalog';
import {
  NATIONALITY_OPTIONS,
  ETHNICITY_OPTIONS,
  RELIGION_OPTIONS,
} from '@/data/homeScreeningForm';
/* ยกชุดคำ/ระดับของขั้น "อาการป่วย" ที่จุดคัดกรอง OPD มาใช้ตรง ๆ
   (มติผู้ใช้ 30 ส.ค. 69) — ถ้าประกาศใหม่ที่นี่ คำที่พยาบาลเลือกจะไม่ตรงกัน
   ระหว่างจุดคัดกรองกับที่บ้าน แล้วเอามาเทียบ/รวมรายงานไม่ได้ */
import {
  CHIEF_COMPLAINT_SUGGESTIONS,
  DURATION_SUGGESTIONS,
  PRESENT_ILLNESS_SUGGESTIONS,
} from '@/pages/opd/ScreeningPage';
/* พฤติกรรมสุขภาพ (ToR ๑.๒.๒.๖) — ยกขั้นของจุดคัดกรองมาทั้งก้อนเช่นกัน
   สูบบุหรี่ · ดื่มสุรา · ออกกำลังกาย + รายละเอียด เก็บที่ทะเบียนกลางคีย์ด้วย HN */
import ScreeningStep4 from '@/pages/opd/ScreeningStep4';
import {
  StepConsent as RegistrationConsentStep,
  Step2Address as RegistrationAddressStep,
  Step1Personal as RegistrationPersonalStep,
  Step3Contact as RegistrationContactStep,
  Step4Rights as RegistrationRightsStep,
  Step5Flags as RegistrationFlagsStep,
  PatientStatusCard,
} from '@/components/forms/RegistrationSteps';
import { findMrPatientByHn } from '@/data/mrPatients';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
/* ปุ่มลบแถวเป็นสีเทา ไม่ใช่สีแบรนด์ (มติผู้ใช้ 30 ส.ค. 69) — การลบแถวเป็น
   การกระทำรอง ไม่ควรเด่นเท่าปุ่มหลักของฟอร์ม */
import NeutralIconButton from '@/components/button/NeutralIconButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
/* ฟอร์มสัญญาณชีพชุดเดียวกับขั้น "สัญญาณชีพ" ของจุดคัดกรอง OPD — การ์ดตัวเลข
   ใหญ่ + ปุ่ม −/+ + เกณฑ์ปกติ + "เพิ่มรอบการวัด" + ไทม์ไลน์รอบก่อนหน้า
   (มติผู้ใช้ 30 ส.ค. 69) */
import VitalsForm from '@/components/forms/VitalsForm';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import {
  HOMEVISIT_TIME_SLOTS,
  HOMEVISIT_CENTER,
  HOMEVISIT_CENTER_LOCATION,
  VITAL_FIELDS,
  BARTHEL_ITEMS,
  BARTHEL_MAX_SCORE,
  CAREGIVER_OPTIONS,
  SCREEN_2Q_QUESTIONS,
  PAIN_SCALE,
  NUTRITION_OPTIONS,
  PRESSURE_SORE_OPTIONS,
  ROLE_NOTE_SECTIONS,
  CARE_ACTIVITIES,
  FAMILY_RELATIONS,
  FAMILY_HEALTH_OPTIONS,
  HOMEVISIT_ASSESSMENT_SUGGESTIONS,
  HOMEVISIT_PLAN_SUGGESTIONS,
  HOMEVISIT_FAMILY_SUGGESTIONS,
  ARRIVAL_DISTANCE_THRESHOLD_M,
  distanceMeters,
  formatDistance,
  formatHomeVisitDate,
  todayIsoDate,
  nowHHMM,
  readDeviceVitals,
  getDeviceConnected,
  setDeviceConnected,
  evaluateVital,
  summarizeVitals,
  calcBmi,
  scoreBarthel,
  countBarthelAnswered,
  isBarthelComplete,
  interpretBarthel,
  getArrivalCheckIn,
  saveArrivalCheckIn,
  getVisitSubmission,
  saveVisitSubmission,
  saveHomeVisitDraft,
  summarizeOrders,
  HOMEVISIT_MED_OTHER,
  HOMEVISIT_MED_SIG_OPTIONS,
  getHomeVisitAccess,
  resolveGroup,
  resolveSource,
  HOMEVISIT_SOURCES,
} from '@/data/homevisitVisits';
import {
  MNA_ITEMS,
  MNA_MAX_SCORE,
  mnaBmiScore,
  scoreMna,
  countMnaAnswered,
  isMnaComplete,
  interpretMna,
  SCREEN_9Q_QUESTIONS,
  SCREEN_9Q_FREQUENCY,
  SCREEN_9Q_MAX_SCORE,
  score9q,
  count9qAnswered,
  is9qComplete,
  has9qSuicidalRisk,
  interpret9q,
  PPS_LEVELS,
  interpretPps,
  summarizeStandardTools,
  toolScoresFromSummary,
} from '@/data/homevisitAssessments';
import {
  sendNhsoClaim,
  getNhsoClaim,
  NHSO_REQUIRED_FIELDS,
} from '@/data/homevisitHhc';
import {
  HOMEVISIT_ORDER_GROUPS,
  HOMEVISIT_ORDER_NOTE_SUGGESTIONS,
  collectHomeVisitOrderItems,
  countHomeVisitOrders,
  homeVisitOrderLabel,
  sendOrdersToCpoe,
  getCpoeHandoff,
} from '@/data/homevisitCpoe';
import { getVisitHistory, appendVisitHistory, saveFamilyMembers, getFamilyMembers } from '@/data/homevisitRegistry';
import { printHomeVisitSummary } from '@/pages/homevisit/homevisitPrint';
import {
  TopicHeader,
  Field,
  StepCard,
  StepSection,
  SectionCard,
  NoticeBand,
  EmptyHint,
  AuditStamp,
} from '@/pages/homevisit/homevisitShared';

/* HomeVisitSteps — เนื้อหา 7 ขั้นตอนของ "บันทึกประเมินการเยี่ยมบ้าน"
   (TOR 1.10.12.2 + 1.10.12.3 + §1.18.3–1.18.10) ที่เสียบเข้า
   `TreatmentFormShell` ผ่าน `HomeVisitRecordPage` — โครงเดียวกับ
   AncSteps / AddictionSteps ทุกประการ.

     1 แบบฟอร์มความยินยอม         — ชุดเดียวกับหน้าเวชระเบียน (PDPA · ด.1.x)
     2 ข้อมูลส่วนตัว               — สถานะผู้รับบริการ + `Step1Personal` ของเวชระเบียน
     3 ที่อยู่และการเดินทาง        — `Step2Address` + GPS (1.18.8) + เวลาถึงบ้าน (1.18.9)
     4 สัญญาณชีพ                   — บันทึกเอง + อ่านจากอุปกรณ์ (1.18.4)
     5 อาการป่วย                    — ชุดฟิลด์เดียวกับจุดคัดกรอง OPD + ยาที่บ้าน
                                     · ประวัติการแพ้ · ผลทันตกรรม (1.18.3)
     6 พฤติกรรมสุขภาพ               — ขั้นของจุดคัดกรอง (ToR ๑.๒.๒.๖)
     6 ประเมิน/คัดกรอง/ADL         — ดัชนีบาร์เธล ป้อนหน้าติดตาม (1.10.12.4)
     7 บันทึกตามบทบาท + กิจกรรม    — EMR รายวิชาชีพ (1.18.5) · กิจกรรม (1.18.7)
                                     · ปรึกษาแพทย์ทางไกล (1.18.10)
     8 สั่งการรักษา                — CPOE (1.18.6)
     9 Family Folder + ส่งศูนย์ฯ   — (1.10.12.3) + ลิงก์โมดูลงานชุมชน + พิมพ์ */

/* ระยะเวลาที่มีอาการ — ใช้ชุดเดียวกับจุดคัดกรอง แต่ตัดกลุ่ม "เริ่มวันนี้"
   (ตั้งแต่ตื่นนอน · ตั้งแต่เช้านี้ · ตั้งแต่เมื่อคืน) ออก (มติผู้ใช้ 30 ส.ค. 69)
   — คำพวกนี้เป็นภาษาของคนเดินมาห้องฉุกเฉินในวันเดียวกัน ส่วนการเยี่ยมบ้านนัด
   ล่วงหน้าเป็นรอบ อาการที่ทีมเจอจึงนับเป็นวัน/สัปดาห์/เดือนขึ้นไป */
const HOMEVISIT_DURATION_EXCLUDED = ['ตั้งแต่ตื่นนอน', 'ตั้งแต่เช้านี้', 'ตั้งแต่เมื่อคืน'];

const HOMEVISIT_DURATION_OPTIONS = DURATION_SUGGESTIONS
  .filter((v) => !HOMEVISIT_DURATION_EXCLUDED.includes(v))
  .map((v) => ({ value: v, label: v }));

/* ทะเบียนยากลาง + "อื่นๆ" ท้ายสุดเสมอ — ตัวเลือกชุดเดียวกับที่ห้องยา/CPOE ใช้
   พร้อมรูปแผงยาจากแคตตาล็อกเดียวกัน (มติผู้ใช้ 30 ส.ค. 69) — ที่บ้านผู้รับบริการ
   มักหยิบซองยามาให้ดูโดยไม่รู้ชื่อ ทีมจึงเทียบจากรูปได้เร็วกว่าอ่านชื่อทีละตัว */
const HOMEVISIT_MED_NAME_OPTIONS = [
  ...MEDICATION_NAME_OPTIONS.map((o) => ({ value: o.value, label: o.value, image: o.image })),
  { value: HOMEVISIT_MED_OTHER, label: 'อื่นๆ (ไม่มีในทะเบียนยา)', icon: 'edit' },
];

/* วิธีใช้ก็ต้องมี "อื่นๆ" เหมือนชื่อยา (มติผู้ใช้ 30 ส.ค. 69) — ยาพ่น ยาหยอด
   ยาอมใต้ลิ้น มีวิธีใช้ที่ไม่เข้ารูปความถี่×เวลาของยาเม็ด */
const HOMEVISIT_MED_SIG_OPTIONS_WITH_OTHER = [
  ...HOMEVISIT_MED_SIG_OPTIONS.map((v) => ({ value: v, label: v })),
  { value: HOMEVISIT_MED_OTHER, label: 'อื่นๆ (ระบุเอง)', icon: 'edit' },
];

/* ── Step 1 — แบบฟอร์มความยินยอม ───────────────────────────────────
   ยกขั้น "แบบฟอร์มยินยอม" ของหน้าเวชระเบียนมาทั้งก้อน (`StepConsent`) —
   เหตุผลเดียวกับ `Step1Personal` / `Step2Address` (มติผู้ใช้ 30 ส.ค. 69):
   ทะเบียนความยินยอมเป็นทะเบียนกลางใบเดียว ถ้าหน้านี้ทำฟอร์มของตัวเองขึ้นมา
   ใบที่ลงนามที่บ้านจะไม่ไปโผล่ที่ห้องบัตร และเวอร์ชันของแบบฟอร์มจะหลุดกัน */
export const HomeVisitStep0Consent = ({ form, setForm, hn, blockedMsg }) => {
  const mrPatient = useMemo(() => findMrPatientByHn(hn) || null, [hn]);
  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}
      <RegistrationConsentStep form={form} setForm={setForm} patient={mrPatient} />
    </StepCard>
  );
};

/* ── Step 1 — ข้อมูลทั่วไปและการเดินทาง ───────────────────────────── */

/* ── Step 1 — ข้อมูลส่วนตัว ────────────────────────────────────────
   สามส่วนเรียงจาก "ใครคือคนนี้" ไป "การเยี่ยมครั้งนี้":
     1. สถานะผู้รับบริการ + ข้อมูลส่วนตัว — ยกการ์ด `PatientStatusCard` และขั้น
        `Step1Personal` ของหน้าเวชระเบียนมาทั้งก้อน (มติผู้ใช้ 30 ส.ค. 69)
        เหตุผลเดียวกับที่ขั้นที่ 2 ยก `Step2Address` มา: ทีมเยี่ยมบ้านต้องกรอก
        ด้วยหน้าตาเดียวกันเป๊ะ และข้อมูลสองที่ต้องเทียบกันได้
     2. ข้อมูลการเยี่ยมครั้งนี้ (กลุ่มผู้รับบริการ · ที่มาของเคส · ประเภทการเยี่ยม)
     3. รูปถ่ายระหว่างการเยี่ยม
   ที่อยู่/แผนที่/บันทึกการเดินทางอยู่ขั้นที่ 2 */
export const HomeVisitStep1Service = ({ form, setForm, readOnly, hn, blockedMsg }) => {
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  /* ผู้รับบริการในทะเบียนกลาง — `Step1Personal` ใช้เป็นค่าสำรองของ HN
     และรูปบัตร ค่าฟิลด์จริงถูกเติมไว้ตั้งแต่ `createEmptyHomeVisitForm` แล้ว */
  const mrPatient = useMemo(() => findMrPatientByHn(hn) || null, [hn]);

  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      {/* สถานะผู้รับบริการ — การ์ดใบเดียวกับที่หน้าเวชระเบียนวางไว้เหนือฟอร์ม */}
      <PatientStatusCard form={form} setForm={setForm} patient={mrPatient} />

      {/* ข้อมูลส่วนตัวทั้งขั้นจากหน้าเวชระเบียน · `Step1Personal` ยังไม่มี prop
          readOnly เหมือน `Step2Address` ที่ขั้น 2 — การเยี่ยมที่ปิดแล้วจึงยัง
          แก้ช่องชุดนี้ได้ ตรงกันทั้งสองขั้น ถ้าจะล็อกต้องเพิ่ม prop ที่ต้นทาง */}
      <SectionCard>
      {/* จังหวะห่างหัวข้อ→เนื้อหาใช้ `--dim-space-600` ให้เท่ากับการ์ด
          "ข้อมูลส่วนตัว" ของหน้าเวชระเบียนที่อยู่เหนือมัน (STEP1_FIELD_GAP) —
          `StepSection` ใช้ 12px ซึ่งชิดกว่าการ์ดอื่นในขั้นเดียวกันอย่างเห็นได้ */}
      <StepSection gap='var(--dim-space-600)'>
        <TopicHeader icon='event'>ข้อมูลการให้บริการ</TopicHeader>
        {/* 24px เท่ากับจังหวะฟิลด์ของการ์ด "ข้อมูลส่วนตัว" (STEP1_FIELD_GAP) */}
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-600, 24px)' }}>
          {/* ถอด "วันที่ให้บริการ" กับ "เวลาออกเดินทางจากศูนย์บริการฯ" ออก
              (มติผู้ใช้ 30 ส.ค. 69) — วันที่ยังถูกบันทึกเป็นวันนี้อัตโนมัติ
              (`serviceDate` ตั้งค่าเริ่มต้นใน `buildEmptyHomeVisitForm`) และ
              เวลาที่ใช้จริงคือ "เวลาถึงบ้าน" ที่ปั๊มจาก GPS ตาม TOR 1.18.9
              ไม่ใช่เวลาที่ออกจากศูนย์ */}
          {/* ๖ กลุ่มผู้รับบริการ (TOR ๑.๑๐.๑๒.๑) กับที่มาของเคส — ย้ายมาจาก
              เวชระเบียนเยี่ยมบ้านให้กรอกที่บันทึกการเยี่ยมโดยตรง ไม่ต้องสลับหน้า */}
          <Field label='ประเภทผู้รับบริการ 6 กลุ่ม'>
            <Select
              showLabel={false} showHelperText={false} searchable={false} size='lg'
              value={form.patientGroup} onChange={set('patientGroup')} disabled={readOnly}
              options={PATIENT_GROUP_OPTIONS.map((g) => ({ value: g.key, label: g.label }))}
              placeholder='เลือกกลุ่มผู้รับบริการ'
            />
          </Field>
          <Field label='ที่มาของเคส (ประเภทรับ–ส่งต่อ)'>
            <Select
              showLabel={false} showHelperText={false} searchable={false} size='lg'
              value={form.homevisitSource} onChange={set('homevisitSource')} disabled={readOnly}
              options={HOMEVISIT_SOURCES.map((o) => ({ value: o.value, label: o.label }))}
              placeholder='เลือกที่มาของเคส'
            />
          </Field>
          {/* สภาพการเคลื่อนไหว — ช่องสุดท้ายของเวชระเบียนเยี่ยมบ้านที่ย้ายมาอยู่ที่นี่
              บันทึกการเยี่ยมจึงเป็นเจ้าของข้อมูลชุดนี้ครบทั้งสามช่อง */}
          <Field label='สภาพการเคลื่อนไหว'>
            <Select
              showLabel={false} showHelperText={false} searchable={false} size='lg'
              value={form.mobility} onChange={set('mobility')} disabled={readOnly}
              options={MOBILITY_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
              placeholder='เลือกสภาพการเคลื่อนไหว'
            />
          </Field>
          {form.mobility === 'other' && (
            <Field label='ระบุสภาพการเคลื่อนไหว'>
              <InputField
                showLabel={false} showHelperText={false}
                value={form.mobilityOther || ''}
                onChange={set('mobilityOther')}
                disabled={readOnly}
                placeholder='เช่น ใช้ walker · ต้องมีผู้พยุง'
              />
            </Field>
          )}
          <Field label='ประเภทการเยี่ยม'>
            <Select
              showLabel={false} showHelperText={false} searchable={false} size='lg'
              value={form.visitType} onChange={set('visitType')} disabled={readOnly}
              options={[
                { value: 'first', label: 'เยี่ยมครั้งแรก (แรกรับ)' },
                { value: 'followup', label: 'เยี่ยมติดตาม' },
                { value: 'urgent', label: 'เยี่ยมกรณีเร่งด่วน' },
              ]}
              placeholder='เลือกประเภทการเยี่ยม'
            />
          </Field>
        </div>

        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          {/* ถอดแถบ "ทีมผู้ออกเยี่ยม (เลือกได้หลายคน)" ออก (มติผู้ใช้ 30 ส.ค. 69)
              — ToR §๑.๑๐.๑๒ ไม่ได้ขอช่องนี้ และฟอร์มกระดาษของทีมเยี่ยมบ้านก็ไม่มี
              `form.team` ยังอยู่ในบันทึก โดยตั้งค่าเป็นผู้รับผิดชอบของนัด (หรือ
              ผู้ใช้ที่ล็อกอิน) ให้เอง — §๑.๑๘.๕ ยังต้องรู้ว่าวิชาชีพไหนเป็นผู้บันทึก */}
        </div>
      </StepSection>
      </SectionCard>

      {/* ห่อการ์ดขาวเอง เพราะขั้นนี้ถูกตั้งเป็น plain body ใน shell แล้ว
          (`Step1Personal` เป็นเนื้อการ์ด ไม่ได้พกการ์ดมาเองเหมือน
          `PatientStatusCard` / `Step2Address`) */}
      <SectionCard>
        <RegistrationPersonalStep
          form={form}
          setForm={setForm}
          patient={mrPatient}
          /* ศาสนา · เชื้อชาติ · สัญชาติ วางเหนือแถวเลขบัตรประชาชน
             (มติผู้ใช้ 30 ส.ค. 69) — ฟอร์มกระดาษ ศบส. เก็บสามอย่างนี้ไว้ใน
             ส่วนข้อมูลประชากร ระบบนี้ย้ายมาอยู่กับข้อมูลส่วนตัว เก็บที่คีย์เดิม
             ของแบบคัดกรอง (`homeScreening.*`) จึงไม่มีข้อมูลซ้ำสองชุด */
          beforeIdRow={(
            <FieldGrid cols={3} rowGap='var(--dim-space-600)' columnGap='var(--dim-space-600)'>
              {[
                { key: 'religion', other: 'religionOther', label: 'ศาสนา', options: RELIGION_OPTIONS, placeholder: 'เช่น ซิกข์ · ฮินดู · ไม่นับถือศาสนา' },
                { key: 'ethnicity', other: 'ethnicityOther', label: 'เชื้อชาติ', options: ETHNICITY_OPTIONS, placeholder: 'เช่น จีน · มอญ · กะเหรี่ยง' },
                { key: 'nationality', other: 'nationalityOther', label: 'สัญชาติ', options: NATIONALITY_OPTIONS, placeholder: 'เช่น เมียนมา · กัมพูชา · ลาว' },
              ].map((f) => (
                <React.Fragment key={f.key}>
                  <Field label={f.label}>
                    <Select
                      showLabel={false} showHelperText={false} searchable={false} size='lg'
                      value={form.homeScreening?.[f.key] || ''}
                      onChange={(v) => setForm((s2) => ({
                        ...s2,
                        homeScreening: {
                          ...s2.homeScreening,
                          [f.key]: v,
                          /* เปลี่ยนใจจาก "อื่นๆ" ต้องล้างข้อความที่พิมพ์ไว้ ไม่งั้น
                             ค่าที่ไม่ตรงกับตัวเลือกจะติดไปกับบันทึก */
                          ...(v === 'อื่นๆ' ? {} : { [f.other]: '' }),
                        },
                      }))}
                      disabled={readOnly}
                      options={f.options.map((o) => ({ value: o, label: o }))}
                      placeholder={`เลือก${f.label}`}
                    />
                  </Field>
                  {form.homeScreening?.[f.key] === 'อื่นๆ' && (
                    <Field label={`ระบุ${f.label}`}>
                      <InputField
                        showLabel={false} showHelperText={false}
                        value={form.homeScreening?.[f.other] || ''}
                        onChange={(v) => setForm((s2) => ({
                          ...s2, homeScreening: { ...s2.homeScreening, [f.other]: v },
                        }))}
                        disabled={readOnly}
                        placeholder={f.placeholder}
                      />
                    </Field>
                  )}
                </React.Fragment>
              ))}
            </FieldGrid>
          )}
        />
      </SectionCard>

    </StepCard>
  );
};

/* ── Step 2 — ที่อยู่และการเดินทาง ────────────────────────────────
   หน้าตาเหมือนขั้น "ที่อยู่" ของหน้าเวชระเบียนทุกอย่าง (ใช้คอมโพเนนต์ตัวเดียวกัน)
   ต่างแค่ต่อท้ายด้วยตำแหน่งบ้าน/เวลาถึงบ้าน และบันทึกการเดินทาง
   (มติผู้ใช้ 30 ส.ค. 69) */
export const HomeVisitStep2Address = ({
  form, setForm, readOnly, visitId, appointment, registryEntry, onDataChanged, blockedMsg,
}) => {
  /* state ของ GPS check-in / เวลาถึงบ้าน ถูกถอดพร้อมหมวด "การเดินทางและ
     เวลาถึงบ้าน" (มติผู้ใช้ 30 ส.ค. 69) — ตัวช่วยฝั่งข้อมูล (saveArrivalCheckIn ·
     distanceMeters · ARRIVAL_DISTANCE_THRESHOLD_M) ยังอยู่ครบใน
     `homevisitVisits.js` รอวันที่ปุ่มถูกวางกลับเข้าไปในการ์ดที่อยู่ปัจจุบัน */

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));


  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      {/* ยกขั้น "ที่อยู่" ของหน้าเวชระเบียนมาทั้งก้อน (`Step2Address`)
          — ที่อยู่ตามทะเบียนบ้าน / ที่อยู่ปัจจุบัน (+ปักหมุดแผนที่) / ที่อยู่ติดต่อได้
          พร้อมธง "เหมือนที่อยู่…" ครบเหมือนกันทุกช่อง (มติผู้ใช้ 30 ส.ค. 69)
          หน้านี้เพิ่มเฉพาะการเดินทาง/เวลาถึงบ้านต่อท้าย */}
      <RegistrationAddressStep
        form={form}
        setForm={setForm}
        mapHeading='ตำแหน่งบ้านและการเดินทาง'
        /* 640 = เพดานความกว้างช่องกรอกของ `FieldShell` — แผนที่กับกล่อง
           "บันทึกการเดินทาง" ใต้มันจึงกว้างเท่ากันพอดี (มติผู้ใช้ 30 ส.ค. 69) */
        mapMaxWidth={640}
        /* บันทึกการเดินทางอยู่ในการ์ด "ที่อยู่ปัจจุบัน" (มติผู้ใช้ 30 ส.ค. 69) —
           เป็นเรื่องของการเดินทางไปยังที่อยู่นั้นโดยตรง ไม่ใช่หัวข้อแยก */
        currentAddressExtra={(
        <SuggestibleTextarea
          label='บันทึกการเดินทาง'
          required
          /* ถอดแถบปุ่ม (เลือกภาษา + ไมค์) ออก (มติผู้ใช้ 30 ส.ค. 69) */
          value={form.travelNote}
          onChange={(e) => set('travelNote')(e.target.value)}
          suggestions={[
            'เดินทางโดยรถของศูนย์บริการฯ ใช้เวลาประมาณ 20 นาที',
            'บ้านอยู่ในซอยแคบ ต้องจอดรถปากซอยและเดินเข้า 200 เมตร',
            'ไม่พบผู้รับบริการที่บ้านในรอบแรก ต้องกลับมาเยี่ยมซ้ำในช่วงบ่าย',
          ]}
          minChars={2}
          disabled={readOnly}
          placeholder='เส้นทาง อุปสรรคการเข้าถึงบ้าน และข้อมูลที่ทีมครั้งถัดไปควรรู้'
        />
        )}
      />

      {/* ถอดหมวด "การเดินทางและเวลาถึงบ้าน" ออกทั้งก้อน (มติผู้ใช้ 30 ส.ค. 69)
          — หลังถอดแผนที่ซ้ำออก เหลือแค่บรรทัดที่อยู่กับปุ่มเดียวลอย ๆ
          ⚠️ ผลข้างเคียง: หน้าจอไม่มีทางบันทึก "เวลาถึงบ้าน" (GPS check-in ตาม
          ToR §1.18.8/.9) อีกแล้ว — `saveArrivalCheckIn` / `form.arrivalTime`
          ยังอยู่ในโมเดลและใน `homevisitVisits.js` ครบ ถ้าจะเอากลับมาให้ย้าย
          ปุ่มไปไว้ในการ์ด "ที่อยู่ปัจจุบัน" คู่กับแผนที่ ไม่ใช่สร้างหมวดใหม่ */}

    </StepCard>
  );
};

/* ── Step 2 — ประวัติ ─────────────────────────────────────────────── */

/* ── Step 7 — ประวัติการแพ้ / โรคประจำตัว ─────────────────────────
   แยกออกมาเป็นขั้นของตัวเองต่อจากสัญญาณชีพ (มติผู้ใช้ 30 ส.ค. 69) — เป็นชุด
   ข้อมูลระดับผู้ป่วยที่ต้องอ่าน/แก้ก่อนลงมือประเมินอาการ ไม่ใช่ส่วนหนึ่งของ
   การซักอาการครั้งนี้ · ใช้ขั้น "หมายเหตุและ Flag" ของหน้าเวชระเบียนทั้งก้อน */
export const HomeVisitStepAllergy = ({ form, setForm, blockedMsg }) => (
  <StepCard>
    {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}
    <RegistrationFlagsStep form={form} setForm={setForm} showMobilityCard={false} />
  </StepCard>
);

/* ── ปรึกษาแพทย์ทางไกล (Telemedicine · TOR 1.18.10) ────────────────
   ย้ายมาอยู่ในขั้น "ประเมินอาการป่วย" (มติผู้ใช้ 30 ส.ค. 69) — ทีมตัดสินใจว่า
   ต้องปรึกษาแพทย์ตอนที่กำลังประเมินอาการอยู่ ไม่ใช่ตอนพิมพ์บันทึกตามบทบาท
   ซึ่งเป็นขั้นหลังจากนั้น · แยกเป็นคอมโพเนนต์เพราะถือ state ป๊อปอัปของตัวเอง */
export const HomeVisitTelemedSection = ({ form, setForm, readOnly, visitId, hn, appointment }) => {
  const routerHistory = useHistory();
  const [telemedOpen, setTelemedOpen] = useState(false);

  const launchTelemed = () => {
    /* push ด้านล่างจะ unmount HomeVisitRecordPage ใน commit เดียวกับ setForm —
       autosave effect ของหน้าไม่ทันทำงาน จึงต้องบันทึกร่างตรงนี้เองก่อนออก
       (ตรงกับข้อความใน popup ว่า "แบบร่างจะถูกบันทึกอัตโนมัติก่อนออกจากหน้านี้")
       stepIndex 6 = ขั้น "ประเมินอาการป่วย" ซึ่งเป็นที่อยู่ใหม่ของปุ่มนี้. */
    saveHomeVisitDraft(visitId, { ...form, telemedRequested: true }, 6);
    setForm((f) => ({ ...f, telemedRequested: true }));
    setTelemedOpen(false);
    routerHistory.push({
      pathname: '/telemed/worklist',
      state: {
        hn,
        name: appointment?.name,
        from: 'homevisit',
        reason: 'ปรึกษาแพทย์ทางไกลระหว่างการเยี่ยมบ้าน',
      },
    });
  };

  return (
    <>
      <StepSection>
        <TopicHeader icon='videocam'>ปรึกษาแพทย์ทางไกล (Telemedicine · TOR 1.18.10)</TopicHeader>
        <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <BrandSubdueButton
            variant='fill' size='md' leadingIcon='videocam'
            onClick={() => setTelemedOpen(true)}
            disabled={readOnly}
          >
            ปรึกษาแพทย์ทางไกล
          </BrandSubdueButton>
          {form.telemedRequested && (
            <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug' maxWidth={420}>
              ส่งคำขอปรึกษาแพทย์ทางไกลจากการเยี่ยมครั้งนี้แล้ว
            </ColorfulBadge>
          )}
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            เปิดห้องปรึกษาในระบบ Telemedicine ที่มีอยู่ พร้อมส่งบริบทผู้รับบริการไปด้วย
            (ระบบเยี่ยมบ้านไม่แก้ไขหน้าจอ Telemedicine)
          </span>
        </div>
      </StepSection>
      <Popup
        open={telemedOpen}
        onClose={() => setTelemedOpen(false)}
        title='เปิดห้องปรึกษาแพทย์ทางไกล'
        subtitle={appointment ? `${appointment.name} · HN: ${appointment.hn}` : ''}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setTelemedOpen(false) }}
        primaryAction={{ label: 'เปิดระบบ Telemedicine', onClick: launchTelemed }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
            ระบบจะพาไปยังรายการปรึกษาทางไกลของ PHCIS พร้อมบริบทผู้รับบริการรายนี้
            — เมื่อสนทนาเสร็จ ให้กลับมาบันทึกผลการปรึกษาในช่อง “บันทึกแพทย์” ของขั้นตอนนี้
          </span>
          <NoticeBand tone='neutral' icon='info'>
            แบบร่างการเยี่ยมจะถูกบันทึกอัตโนมัติก่อนออกจากหน้านี้ กลับมาทำต่อได้จากแท็บ “ที่ร่างไว้” ในคิวเยี่ยมบ้าน
          </NoticeBand>
        </div>
      </Popup>
    </>
  );
};

export const HomeVisitStep2History = ({ form, setForm, readOnly, visitId, hn, appointment, registryEntry, blockedMsg }) => {
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const addMedication = () => setForm((f) => ({
    ...f,
    medications: [...f.medications, { id: `med-${Date.now()}`, name: '', nameOther: '', dose: '', doseOther: '', adherence: '' }],
  }));
  const updateMedication = (id, key, value) => setForm((f) => ({
    ...f,
    medications: f.medications.map((m) => (m.id === id ? { ...m, [key]: value } : m)),
  }));
  const removeMedication = (id) => setForm((f) => ({
    ...f,
    medications: f.medications.filter((m) => m.id !== id),
  }));

  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      {/* ถอดการ์ด "ข้อมูลจากเวชระเบียน" ออกจากขั้นนี้ (มติผู้ใช้ 30 ส.ค. 69) —
          สิทธิ/แพ้ยา/โรคประจำตัว/ธงต่าง ๆ อยู่บนหัวแฟ้มผู้รับบริการด้านบนแล้ว
          ส่วน ๖ กลุ่มผู้รับบริการ · ประเภทรับ–ส่งต่อ · การเคลื่อนไหว ย้ายไปกรอกที่
          ขั้นที่ 1 ของบันทึกการเยี่ยมโดยตรง */}

      {/* สามหัวข้อนี้แยกเป็นการ์ดคนละใบ (มติผู้ใช้ 30 ส.ค. 69) — เดิมอยู่ใน
          การ์ดขาวใบเดียวกันทั้งหมด อ่านแล้วเหมือนเป็นเรื่องเดียวกัน ทั้งที่
          ประวัติเจ็บป่วย / ยาที่บ้าน / ผลตรวจทันตกรรม มาจากคนละแหล่งและคนละ
          จังหวะการบันทึก */}
      <SectionCard>
      <StepSection gap='var(--dim-space-600)'>
        <TopicHeader icon='stethoscope'>อาการป่วยที่พบในการเยี่ยมครั้งนี้</TopicHeader>
        {/* กริด 2 คอลัมน์ — อาการสำคัญ / ระยะเวลา / ประวัติปัจจุบัน กว้างเท่ากันหมด
            (มติผู้ใช้ 30 ส.ค. 69) เดิมประวัติปัจจุบันเป็นแถวเต็มความกว้างอยู่ใต้
            สองช่องนั้น ขนาดจึงไม่ตรงกัน */}
        <FieldGrid cols={2} rowGap='var(--dim-space-600)' columnGap='var(--dim-space-600)'>
          <Field label='อาการสำคัญ (Chief Complaint)' required>
            <SuggestibleTextarea
              showLabel={false}
              value={form.chiefComplaint}
              onChange={(e) => set('chiefComplaint')(e?.target ? e.target.value : e)}
              suggestions={CHIEF_COMPLAINT_SUGGESTIONS}
              minChars={2}
              rows={3}
              voice
              disabled={readOnly}
              placeholder='อาการที่ผู้รับบริการหรือผู้ดูแลแจ้งในการเยี่ยมครั้งนี้'
            />
          </Field>
          {/* ระยะเวลาเป็นดรอปดาวน์ (มติผู้ใช้ 30 ส.ค. 69) — ใช้ชุดคำเดียวกับ
              จุดคัดกรอง ข้อความอิสระอย่าง "3 วัน" กับ "สามวัน" นับรวมกันไม่ได้ */}
          <Field label='ระยะเวลาที่มีอาการ'>
            <Select
              showLabel={false} showHelperText={false} searchable size='lg'
              value={form.symptomDuration} onChange={set('symptomDuration')} disabled={readOnly}
              options={HOMEVISIT_DURATION_OPTIONS}
              placeholder='เลือกระยะเวลาที่มีอาการ'
            />
          </Field>

          <Field label='ประวัติปัจจุบัน (Present Illness)'>
            <SuggestibleTextarea
              showLabel={false}
              value={form.presentIllness}
              onChange={(e) => set('presentIllness')(e?.target ? e.target.value : e)}
              suggestions={PRESENT_ILLNESS_SUGGESTIONS}
              minChars={3}
              rows={3}
              voice
              disabled={readOnly}
              placeholder='ลำดับอาการ สิ่งที่ทำมาแล้ว และการตอบสนองต่อการรักษาที่บ้าน'
            />
          </Field>
        </FieldGrid>

      </StepSection>
      </SectionCard>

      {/* ถอดการ์ด "ประวัติการเจ็บป่วยและการรักษาปัจจุบัน" ออก (มติผู้ใช้ 30 ส.ค. 69)
          — ซ้ำกับ "ประวัติปัจจุบัน (Present Illness)" ในการ์ดอาการป่วยด้านบน
          คีย์ `illnessHistory` ยังอยู่ในโมเดล (ทะเบียนเยี่ยมบ้านเติมค่ามาให้ และ
          ประวัติเก่าที่บันทึกไว้แล้วยังอ่านได้) แค่ไม่มีช่องให้กรอกซ้ำอีก */}

      <SectionCard>
      <StepSection gap='var(--dim-space-600)'>
        <TopicHeader icon='pill'>ยาที่ใช้อยู่ที่บ้าน</TopicHeader>
        {form.medications.length === 0 ? (
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
            ยังไม่ได้บันทึกรายการยา — กดปุ่มด้านล่างเพื่อเพิ่มรายการยาที่พบที่บ้าน
          </span>
        ) : (
          /* 24px ทั้งแนวตั้ง (ระหว่างแถวยา) และแนวนอน (ระหว่างช่อง)
             เท่าจังหวะฟิลด์ของการ์ดอื่นในฟอร์มนี้ (มติผู้ใช้ 30 ส.ค. 69) */
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-600, 24px)' }}>
            {form.medications.map((m) => (
              <div key={m.id} className='flex items-end w-full flex-wrap' style={{ gap: 'var(--dim-space-600, 24px)' }}>
                {/* เลือกจากทะเบียนยากลางแทนการพิมพ์อิสระ (มติผู้ใช้ 30 ส.ค. 69)
                    — ชื่อยาที่พิมพ์เองสะกดไม่ตรงกัน เอาไปทบทวนยาหรือจับคู่กับ
                    รายการที่ห้องยาจ่ายไปไม่ได้ · ยาที่ไม่มีในทะเบียน (ยาสมุนไพร
                    ยาซื้อเอง ยาจากคลินิกอื่น) เลือก "อื่นๆ" แล้วพิมพ์ชื่อได้ */}
                <Field label='ชื่อยา'>
                  <Select
                    showLabel={false} showHelperText={false} searchable size='lg'
                    value={m.name} onChange={(v) => updateMedication(m.id, 'name', v)} disabled={readOnly}
                    options={HOMEVISIT_MED_NAME_OPTIONS}
                    placeholder='พิมพ์เพื่อค้นหาจากทะเบียนยา'
                  />
                </Field>
                {m.name === HOMEVISIT_MED_OTHER && (
                  <Field label='ระบุชื่อยา (ไม่มีในทะเบียน)'>
                    <InputField
                      showLabel={false} showHelperText={false}
                      value={m.nameOther || ''}
                      onChange={(v) => updateMedication(m.id, 'nameOther', v)}
                      disabled={readOnly}
                      placeholder='เช่น ยาสมุนไพรฟ้าทะลายโจร · ยาชุดที่ซื้อจากร้านชำ'
                    />
                  </Field>
                )}
                {/* วิธีใช้เลือกจากคำศัพท์ชุดเดียวกับหน้าทะเบียนยา (มติผู้ใช้ 30 ส.ค. 69) */}
                <Field label='วิธีใช้'>
                  <Select
                    showLabel={false} showHelperText={false} searchable size='lg'
                    value={m.dose} onChange={(v) => updateMedication(m.id, 'dose', v)} disabled={readOnly}
                    options={HOMEVISIT_MED_SIG_OPTIONS_WITH_OTHER}
                    placeholder='เลือกวิธีใช้'
                  />
                </Field>
                {m.dose === HOMEVISIT_MED_OTHER && (
                  <Field label='ระบุวิธีใช้'>
                    <InputField
                      showLabel={false} showHelperText={false}
                      value={m.doseOther || ''}
                      onChange={(v) => updateMedication(m.id, 'doseOther', v)}
                      disabled={readOnly}
                      placeholder='เช่น อมใต้ลิ้นเมื่อเจ็บหน้าอก · พ่น 2 ครั้งเช้า-เย็น'
                    />
                  </Field>
                )}
                <Field label='ความร่วมมือในการใช้ยา'>
                  <Select
                    showLabel={false} showHelperText={false} searchable={false} size='lg'
                    value={m.adherence} onChange={(v) => updateMedication(m.id, 'adherence', v)} disabled={readOnly}
                    options={[
                      { value: 'good', label: 'รับประทานครบตามสั่ง' },
                      { value: 'partial', label: 'ลืมบางมื้อ' },
                      { value: 'poor', label: 'ไม่ได้รับประทาน' },
                      { value: 'stopped', label: 'หยุดยาเอง' },
                    ]}
                    placeholder='เลือก'
                  />
                </Field>
                {/* เหลือรายการเดียวลบไม่ได้ (มติผู้ใช้ 30 ส.ค. 69) — ลิสต์ที่เปิด
                    ไว้แล้วต้องมีอย่างน้อยหนึ่งแถวให้กรอกเสมอ ถ้าลบหมดจะเหลือ
                    ข้อความว่างที่ต้องกด "เพิ่มรายการ" ใหม่ทุกครั้ง */}
                {!readOnly && (
                  <NeutralIconButton
                    icon='delete'
                    variant='ghost'
                    size='sm'
                    disabled={form.medications.length <= 1}
                    onClick={() => removeMedication(m.id)}
                    aria-label={form.medications.length <= 1 ? 'ลบไม่ได้ — ต้องเหลืออย่างน้อย 1 รายการ' : 'ลบรายการยา'}
                    title={form.medications.length <= 1 ? 'ต้องเหลืออย่างน้อย 1 รายการ' : 'ลบรายการยา'}
                  />
                )}
              </div>
            ))}
          </div>
        )}
        {!readOnly && <BrandDashedAddButton onClick={addMedication}>เพิ่มรายการยาที่พบที่บ้าน</BrandDashedAddButton>}
      </StepSection>
      </SectionCard>

      {/* ใช้ขั้น "หมายเหตุและ Flag" ของหน้าเวชระเบียนทั้งก้อน (มติผู้ใช้ 30 ส.ค. 69)
          — ต้องมีหมวดครบเท่ากันทั้ง 9: VIP · แพ้ยา · แพ้อาหาร · แพ้สารเคมี ·
          โรคประจำตัว · ความปลอดภัย · DNR · บริจาคอวัยวะ · อื่น ๆ (แผงของจุด
          คัดกรองมีแค่ 5 หมวด ไม่มี VIP/ความปลอดภัย/DNR/บริจาคอวัยวะ)
          ⚠️ ค่าที่กรอกที่นี่ผูกกับ *ร่างการเยี่ยมครั้งนี้* ไม่ใช่ทะเบียนกลาง
          ตาม D-043 ซึ่งกำหนดให้เวชระเบียนเป็นเจ้าของ Flag เพียงที่เดียว —
          ต้องต่อสะพานเขียนกลับก่อนใช้งานจริง */}
      {/* มติ คทง.6 — งานทันตกรรมของทีมเยี่ยมบ้านต้องเชื่อมกลับมาที่ระบบ
          ทันตกรรม: พยาบาลเยี่ยมบ้านเห็นผลตรวจฟันล่าสุดได้โดยไม่ต้องเปิด
          Visit ทันตกรรมใหม่ และส่งตรวจได้เมื่อพบปัญหาช่องปากที่บ้าน */}
      {/* แบบประเมินทั้งชุดจากขั้น "ประเมิน" เดิม (ADL · MNA-SF · 2Q/9Q · PPS ·
          ความปวด · DTX · สรุปผลการประเมิน · รูปถ่าย) ย้ายมารวมที่ขั้นนี้และลบ
          ขั้นเดิมทิ้ง (มติผู้ใช้ 30 ส.ค. 69) — การซักอาการกับการประเมินเป็น
          จังหวะเดียวกันของการเยี่ยม แยกสองขั้นทำให้ต้องเดินกลับไปกลับมา
          หัวข้อย่อยของแต่ละแบบประเมินยังแยก section ชัดเหมือนเดิม */}
      <SectionCard>
        <HomeVisitStep4Assessment form={form} setForm={setForm} readOnly={readOnly} />
      </SectionCard>

      {/* การ์ด "ปรึกษาแพทย์ทางไกล" ถูกถอดออก (มติผู้ใช้ 30 ส.ค. 69) — ปุ่มเดียวกัน
          อยู่บนหัวหน้าจอแล้ว (SubHeader) ซึ่งกดได้จากทุกขั้น */}

      <SectionCard>
      <StepSection gap='var(--dim-space-600)'>
        <CarriedDentalPanel
          hn={hn}
          patientName={registryEntry?.name}
          from='homevisit'
          readOnly={readOnly}
          showReadOnlyNote={false}
          showSummaryRow={false}
          showStatusBadge={false}
          bordered={false}
        />
      </StepSection>
      </SectionCard>

      {/* ตารางประวัติการเยี่ยมย้อนหลังถูกถอดออก (มติผู้ใช้ 30 ส.ค. 69) — ย้ายไปดูที่
          ปุ่ม "ประวัติการเยี่ยมบ้าน" บนแถบหัวข้อ ซึ่งเปิดอ่านทีละครั้งได้เต็ม ๆ
          และเปิดจากขั้นไหนก็ได้ ไม่ต้องเลื่อนลงมาที่ขั้นประวัติ */}
    </StepCard>
  );
};

/* ── Step 3 — สัญญาณชีพ ──────────────────────────────────────────── */

/* ช่องที่วาดเป็นการ์ดเดี่ยว — ความดันใช้ `PressureCard` (บน/ล่างในใบเดียว)
   ส่วนน้ำหนัก/ส่วนสูงต้องอยู่ติดกับ BMI จึงแยกออกมาอีกชุด */
const CARD_VITALS = VITAL_FIELDS.filter((f) => ['temp', 'pulse', 'respiration', 'oxygen'].includes(f.key));
const ANTHRO_VITALS = VITAL_FIELDS.filter((f) => ['weight', 'height'].includes(f.key));

export const HomeVisitStep3Vitals = ({ form, setForm, readOnly, blockedMsg, hn }) => {
  /* ยกฟอร์มสัญญาณชีพของจุดคัดกรองมาทั้งก้อน (มติผู้ใช้ 30 ส.ค. 69) — ได้
     "เพิ่มรอบการวัด" · ไทม์ไลน์รอบก่อนหน้า · กราฟ · BMI/กราฟการเจริญเติบโต
     ครบชุดเหมือนกัน แทนกริดการ์ดที่ประกอบเอง.

     ⚠️ `VitalsForm` ถือ state ของตัวเองและไม่มี prop ให้เติมค่าเริ่มต้น (ไฟล์นั้น
     เป็นของโมดูล OPD และมี terminal อื่นแก้ค้างอยู่ จึงไม่แตะ) — ค่าที่พยาบาล
     กรอกจึงถูก *มิเรอร์* กลับเข้า `form.vitals` ผ่าน `onValuesChange` เพื่อให้
     ใบสรุป/การส่งข้อมูล/หน้าติดตามยังอ่านได้ที่เดิม แต่ถ้าปิดแล้วเปิดร่างใหม่
     การ์ดจะเริ่มจากค่าว่างของมันเอง (ค่าที่บันทึกไว้ยังอยู่ในร่าง) */
  const [historyOpen, setHistoryOpen] = useState(false);

  const mirrorVitals = useCallback((v) => {
    setForm((f) => {
      const next = {
        ...f.vitals,
        temp: v.temp ?? '',
        pulse: v.pulse ?? '',
        respiration: v.respiration ?? '',
        oxygen: v.oxygen ?? '',
        sys: v.pressureSys ?? '',
        dia: v.pressureDia ?? '',
        weight: v.weight ?? '',
        height: v.height ?? '',
      };
      /* อย่าเขียนทับด้วยค่าว่างตอน mount — ร่างที่บันทึกไว้จะหายทันทีที่เปิดขั้น */
      const allEmpty = Object.values(next).every((x) => String(x).trim() === '');
      if (allEmpty) return f;
      const same = Object.keys(next).every((k) => String(f.vitals?.[k] ?? '') === String(next[k]));
      return same ? f : { ...f, vitals: next };
    });
  }, [setForm]);

  /* ประวัติสัญญาณชีพของงานเยี่ยมบ้านคือ "การเยี่ยมครั้งก่อน ๆ" ของ HN นี้
     ไม่ใช่ชุดจำลองของ OPD — ใช้ข้อมูลเดียวกับหน้าติดตามการเยี่ยมบ้าน */
  const vitalHistory = useMemo(() => (hn ? getVisitHistory(hn) : []), [hn]);

  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      <VitalsForm
        onValuesChange={mirrorVitals}
        beforeAddRoundSlot={(
          <SuggestibleTextarea
            label='บันทึกเพิ่มเติมเกี่ยวกับการวัดสัญญาณชีพ'
            value={form.vitalsNote}
            onChange={(e) => setForm((f) => ({ ...f, vitalsNote: e?.target ? e.target.value : e }))}
            suggestions={[
              'วัดความดันในท่านั่งหลังพัก 5 นาที ค่าอยู่ในเกณฑ์เดิม',
              'ผู้ป่วยมีไข้ต่ำ ๆ ให้เช็ดตัวและติดตามซ้ำใน 2 ชั่วโมง',
              'ค่าออกซิเจนต่ำกว่าปกติ ปรับอัตราออกซิเจนที่บ้านและแจ้งแพทย์',
            ]}
            minChars={2}
            disabled={readOnly}
            style={{ width: '100%', maxWidth: 'none' }}
            placeholder='สภาวะขณะวัด ความผิดปกติที่พบ และการดูแลเบื้องต้น'
          />
        )}
        headerAction={(
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='monitoring'
            onClick={() => setHistoryOpen(true)}
          >
            ดูประวัติสัญญาณชีพ
          </BrandSubdueButton>
        )}
      />

      <Popup
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        size='large'
        title='ประวัติสัญญาณชีพจากการเยี่ยมครั้งก่อน'
        subtitle={hn ? `HN ${hn}` : undefined}
        primaryAction={{ label: 'ปิด', onClick: () => setHistoryOpen(false) }}
      >
        <Table
          columns={[
            { key: 'no', label: 'ครั้งที่' },
            { key: 'date', label: 'วันที่เยี่ยม', render: (r) => formatHomeVisitDate(r.date) },
            { key: 'bp', label: 'ความดัน (mmHg)', render: (r) => (r.vitals?.sys && r.vitals?.dia ? `${r.vitals.sys}/${r.vitals.dia}` : '—') },
            { key: 'pulse', label: 'ชีพจร', render: (r) => r.vitals?.pulse || '—' },
            { key: 'temp', label: 'อุณหภูมิ', render: (r) => r.vitals?.temp || '—' },
            { key: 'oxygen', label: 'SpO2', render: (r) => (r.vitals?.oxygen ? `${r.vitals.oxygen}%` : '—') },
            { key: 'weight', label: 'น้ำหนัก', render: (r) => r.vitals?.weight || '—' },
            { key: 'by', label: 'ผู้เยี่ยม', flex: true, minWidth: 160 },
          ]}
          rows={[...vitalHistory].reverse()}
          rowKey={(r) => `${hn}-${r.no}`}
          emptyMessage='ยังไม่มีประวัติการวัดสัญญาณชีพของผู้รับบริการรายนี้'
        />
      </Popup>
    </StepCard>
  );
};

/* ── Step 4 — ข้อมูลการติดต่อ · Step 5 — สิทธิการรักษา ─────────────
   ยกสองขั้นของหน้าเวชระเบียนมาทั้งก้อนแบบเดียวกับที่อยู่/ข้อมูลส่วนตัว
   (มติผู้ใช้ 30 ส.ค. 69) — ทีมเยี่ยมบ้านเป็นคนที่ได้เบอร์ผู้ดูแลตัวจริงและ
   เห็นบัตรสิทธิที่บ้าน จึงควรแก้ได้ตรงนั้นด้วยหน้าตาเดียวกับห้องบัตร */
export const HomeVisitStepContact = ({ form, setForm, blockedMsg }) => (
  <StepCard>
    {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}
    <RegistrationContactStep form={form} setForm={setForm} />
  </StepCard>
);

export const HomeVisitStepRights = ({ form, setForm, blockedMsg }) => (
  <StepCard>
    {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}
    <RegistrationRightsStep form={form} setForm={setForm} />
  </StepCard>
);

/* ── Step 8 — พฤติกรรมสุขภาพ ───────────────────────────────────── */
export const HomeVisitStepBehaviour = ({ form, setForm, readOnly, hn, blockedMsg }) => (
  /* การ์ดขาวใบเดียวของทั้งขั้น (มติผู้ใช้ 30 ส.ค. 69) — แถวสูบบุหรี่/แอลกอฮอล์/
     ออกกำลังกายของจุดคัดกรอง กับความเสี่ยงจากฟอร์มกระดาษ ศบส. เป็นเรื่องเดียวกัน
     ทั้งหมด แยกเป็นสองการ์ดทำให้อ่านเหมือนคนละหัวข้อ · `ScreeningStep4` ไม่มี
     พื้นหลังการ์ดของตัวเอง จึงต้องห่อให้ */
  <StepCard>
    {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}
    <SectionCard>
      <ScreeningStep4 patient={{ hn }} />
      <HealthRiskFields
        value={form.homeScreening}
        onChange={(next) => setForm((f) => ({ ...f, homeScreening: next }))}
        readOnly={readOnly}
      />

      <StepSection gap='var(--dim-space-200)'>
        <span style={{
          color: 'var(--text-content-secondary, #636B72)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
        }}>
          การปฏิบัติตัวเมื่อเจ็บป่วยเล็กน้อย (เลือกได้หลายข้อ)
        </span>
        <MinorIllnessFields
          value={form.homeScreening}
          onChange={(next) => setForm((f) => ({ ...f, homeScreening: next }))}
          readOnly={readOnly}
        />
      </StepSection>
    </SectionCard>
  </StepCard>
);

/* รูปถ่ายระหว่างการเยี่ยม — อยู่ในขั้น "ประเมิน" (มติผู้ใช้ 30 ส.ค. 69)
   รูปเป็นหลักฐานประกอบ *การประเมิน* (แผล สภาพแวดล้อม อุปกรณ์) จึงต้องอยู่ที่
   เดียวกับที่ทีมกำลังตัดสินใจ ไม่ใช่ขั้นข้อมูลส่วนตัวซึ่งเป็นเรื่องตัวตนผู้ป่วย.
   แยกเป็นคอมโพเนนต์เพราะถือ state ป๊อปอัปดูรูปของตัวเอง. */

export const HOMEVISIT_PHOTO_LIMIT = 20;

export const HomeVisitPhotoSection = ({ form, setForm, readOnly }) => {
  const [photoPreview, setPhotoPreview] = useState(null);
  /* เตือนเมื่อเลือกไฟล์มาเกินโควตา — ตัดทิ้งเงียบ ๆ แล้วทีมจะไม่รู้ว่ารูปหาย */
  const [limitMsg, setLimitMsg] = useState('');
  const remaining = HOMEVISIT_PHOTO_LIMIT - form.photos.length;

  const removePhotoAt = (index) => setForm((f) => ({
    ...f,
    photos: f.photos.filter((_, idx) => idx !== index),
  }));

  return (
    <StepSection>
      <TopicHeader icon='photo_camera'>รูปถ่ายระหว่างการเยี่ยม</TopicHeader>
      {limitMsg && <NoticeBand tone='warning' icon='filter_alt'>{limitMsg}</NoticeBand>}

      {/* คำแนะนำว่าควรถ่ายอะไร (มติผู้ใช้ 30 ส.ค. 69) — เดิมเป็นช่องอัปโหลด
          เปล่า ๆ แต่ละทีมจึงถ่ายไม่เหมือนกัน พอเอารูปมาเทียบข้ามครั้งหรือ
          ส่งต่อให้ทีมถัดไปจึงใช้ไม่ได้ */}
      <div
        className='flex flex-col w-full'
        style={{
          gap: 'var(--dim-space-100, 4px)',
          padding: 'var(--dim-space-300, 12px)',
          borderRadius: 'var(--dim-radius-300, 8px)',
          background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
          fontSize: 'var(--type-size-xs)',
          color: 'var(--text-content-secondary, #636B72)',
        }}
      >
        <span style={{ color: 'var(--text-content-default, #363B3F)', fontWeight: 'var(--type-weight-medium, 500)' }}>
          {form.photos.length === 0
            ? 'รูปแรก: ถ่าย “หน้าบ้านพร้อมเลขที่บ้าน” — ใช้ยืนยันว่าไปถึงบ้านถูกหลังคู่กับพิกัดที่บันทึกไว้'
            : 'ถ่ายให้ครบตามรายการนี้ เพื่อให้ทีมครั้งถัดไปเทียบความเปลี่ยนแปลงได้'}
        </span>
        <span>1. หน้าบ้าน + เลขที่บ้าน · 2. สภาพแวดล้อมที่เป็นความเสี่ยง (ทางเดิน ห้องน้ำ ราวจับ พื้นลื่น)</span>
        <span>3. แผล/รอยโรค — ถ่ายระยะเดิมทุกครั้งและวางวัตถุเทียบขนาดไว้ข้าง ๆ · 4. ยาที่พบในบ้านทั้งหมด</span>
        <span>5. อุปกรณ์การแพทย์ที่ใช้อยู่ (สายให้อาหาร ออกซิเจน เตียง ที่นอนลม)</span>
        <span style={{ color: 'var(--text-warning-default, #B45309)' }}>
          ขอความยินยอมจากผู้รับบริการหรือผู้ดูแลก่อนถ่ายทุกครั้ง และไม่ถ่ายใบหน้าคนอื่นในบ้านที่ไม่ใช่ผู้รับบริการ
        </span>
      </div>

      {/* ปุ่มอัปโหลดกับรูปย่ออยู่แถวเดียวกัน — เดิมรูปย่อต่อท้ายลงข้างล่าง
          บล็อกจึงยาวขึ้นเรื่อย ๆ และมองไม่เห็นพร้อมกันว่าถ่ายอะไรไปแล้วบ้าง */}
      <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <PhotoUploadField
          label={form.photos.length
            ? `เพิ่มรูป (${form.photos.length}/${HOMEVISIT_PHOTO_LIMIT} รูป)`
            : 'ถ่าย/อัปโหลดรูป'}
          icon='photo_camera'
          capture='environment'
          multiple
          disabled={readOnly || remaining <= 0}
          /* อ่านเป็น data URL ไม่ใช่ blob URL — blob URL ใช้ได้เฉพาะในหน้าที่เปิดอยู่
             พอบันทึกร่างลง sessionStorage แล้วกลับมาเปิดใหม่ ลิงก์จะตาย */
          onFiles={(files) => {
            /* รับได้ไม่เกินโควตาที่เหลือ ส่วนที่เกินถูกตัดพร้อมบอกให้รู้ */
            const picked = Array.from(files);
            const accepted = picked.slice(0, Math.max(0, remaining));
            setLimitMsg(accepted.length < picked.length
              ? `เลือกมา ${picked.length} รูป แต่เก็บได้อีก ${Math.max(0, remaining)} รูป (สูงสุด ${HOMEVISIT_PHOTO_LIMIT} รูปต่อการเยี่ยม 1 ครั้ง) — เก็บให้ ${accepted.length} รูปแรก`
              : '');
            accepted.forEach((file, i) => {
              const entryId = `hv-photo-${Date.now()}-${i}`;
              const push = (previewUrl) => setForm((f) => ({
                ...f,
                photos: [...f.photos, { id: entryId, name: file.name, previewUrl }],
              }));
              if (typeof FileReader === 'undefined') {
                push('');
                return;
              }
              const reader = new FileReader();
              reader.onload = () => push(String(reader.result || ''));
              reader.onerror = () => push('');
              reader.readAsDataURL(file);
            });
          }}
        />
        {form.photos.length > 0 && (
          <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {form.photos.map((photo, i) => {
              const entry = typeof photo === 'string' ? { name: photo, previewUrl: '' } : photo;
              const key = entry.id || `${entry.name}-${i}`;
              return entry.previewUrl ? (
                <div
                  key={key}
                  className='relative'
                  style={{
                    /* สูงเท่ากล่องอัปโหลด และกว้างตามอัตราส่วน 4:3 ของกล้อง —
                       กรอบจัตุรัสครอบรูปแนวนอนจนดูไม่ออกว่าถ่ายอะไร */
                    width: 171,
                    height: 'var(--dim-size-2000, 128px)',
                    borderRadius: 'var(--dim-radius-300, 8px)',
                    overflow: 'hidden',
                    border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #E5E7EB)',
                    background: 'var(--surface-neutral-quaternary, #F3F4F6)',
                  }}
                >
                  {/* กดที่รูปเพื่อเปิดดูขนาดเต็ม — ปุ่มลบเป็นพี่น้องกันข้างนอก
                      ไม่ใช่ปุ่มซ้อนปุ่ม (HTML ห้าม) */}
                  <button
                    type='button'
                    onClick={() => setPhotoPreview(entry)}
                    aria-label={`ดูรูป ${entry.name} ขนาดเต็ม`}
                    title={entry.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'zoom-in',
                      display: 'block',
                    }}
                  >
                    <img
                      src={entry.previewUrl}
                      alt={entry.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </button>
                  {/* ปุ่มลบเป็นวงกลมเทาเล็ก ไม่ใช่ปุ่มแบรนด์สี่เหลี่ยมขนาดปกติ —
                      ปุ่มเต็มใบทับรูปย่อจนดูไม่ออกว่ารูปอะไร และสีเขียวอ่านเป็น
                      "ปุ่มหลัก" ทั้งที่เป็นการกระทำรอง */}
                  {!readOnly && (
                    <button
                      type='button'
                      aria-label={`ลบรูป ${entry.name}`}
                      title={`ลบรูป ${entry.name}`}
                      /* หยุด event ไม่ให้ทะลุไปเปิดป๊อปอัปดูรูปของกรอบด้านหลัง */
                      onClick={(e) => { e.stopPropagation(); removePhotoAt(i); }}
                      className='absolute inline-flex items-center justify-center'
                      style={{
                        top: 'var(--dim-space-150, 6px)',
                        right: 'var(--dim-space-150, 6px)',
                        width: 24,
                        height: 24,
                        borderRadius: 'var(--dim-radius-full, 9999px)',
                        background: 'var(--surface-neutralButton-secondary, #6B7280)',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        zIndex: 1,
                      }}
                    >
                      <span
                        className='material-symbols-outlined'
                        aria-hidden
                        style={{
                          fontFamily: 'Material Symbols Outlined',
                          fontSize: 16,
                          lineHeight: 1,
                          color: 'var(--icon-neutralButton-on-neutral, #FFFFFF)',
                        }}
                      >
                        close
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <ColorfulBadge key={key} style='grey' size='small' hierarchy='secondary' width='hug' maxWidth={220}>
                  {entry.name}
                </ColorfulBadge>
              );
            })}
          </div>
        )}
      </div>

      {/* ดูรูปขนาดเต็ม — ลบจากในป๊อปอัปได้เลย จะได้ไม่ต้องปิดแล้วไปหาปุ่มกากบาท
          บนรูปย่ออีกที หลังจากเพิ่งเห็นว่ารูปนี้ถ่ายพลาด */}
      <Popup
        open={!!photoPreview}
        onClose={() => setPhotoPreview(null)}
        title='รูปถ่ายระหว่างการเยี่ยม'
        subtitle={photoPreview?.name}
        size='large'
        primaryAction={{ label: 'ปิด', onClick: () => setPhotoPreview(null) }}
        tertiaryAction={readOnly ? undefined : {
          label: 'ลบรูปนี้',
          onClick: () => {
            const index = form.photos.findIndex((ph) => (
              typeof ph === 'string' ? ph === photoPreview?.name : ph.id === photoPreview?.id
            ));
            if (index >= 0) removePhotoAt(index);
            setPhotoPreview(null);
          },
        }}
      >
        {photoPreview?.previewUrl && (
          <img
            src={photoPreview.previewUrl}
            alt={photoPreview.name}
            style={{
              width: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
              display: 'block',
              borderRadius: 'var(--dim-radius-300, 8px)',
              background: 'var(--surface-neutral-quaternary, #F3F4F6)',
            }}
          />
        )}
      </Popup>
    </StepSection>
  );
};

/* การ์ดแบบประเมินมาตรฐาน — ทรงเดียวกับการ์ดใบยินยอมของหน้าเวชระเบียน
   (หัวการ์ดพื้นอ่อน + รหัส/ป้ายเวอร์ชัน + ชื่อ + แถวปุ่มล่าง) แต่ "เวอร์ชัน"
   ของแบบประเมินคือ *คะแนน* และป้ายคือ *การแปลผล* ซึ่งเป็นสิ่งที่พยาบาลต้อง
   เห็นก่อนตัดสินใจว่าจะเปิดชุดไหน (มติผู้ใช้ 30 ส.ค. 69) */
const AssessmentToolCard = ({ code, title, done, scoreLabel, interp, readOnly, onOpen }) => (
  <section
    className='flex flex-col w-full min-w-0'
    style={{
      borderRadius: 'var(--dim-radius-400, 12px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
      background: 'var(--surface-card-100, #FFFFFF)',
      overflow: 'hidden',
    }}
  >
    <div
      className='flex flex-col items-center w-full'
      style={{
        gap: 'var(--dim-space-100, 4px)',
        paddingTop: 'var(--dim-space-500, 20px)',
        paddingBottom: 'var(--dim-space-500, 20px)',
        background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
      }}
    >
      <span style={{
        color: 'var(--text-brandPrimary-default, #007549)',
        fontFamily: 'var(--type-family-heading-content)',
        fontSize: 'var(--type-size-xl)',
      }}>
        {scoreLabel}
      </span>
      <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
        {code}
      </span>
    </div>

    <div
      className='flex flex-col w-full flex-1'
      style={{
        gap: 'var(--dim-space-200, 8px)',
        padding: 'var(--dim-space-400, 16px)',
      }}
    >
      <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
        {title}
      </span>
      {done && interp ? (
        <ColorfulBadge style={interp.badge} size='small' hierarchy='secondary' width='hug' maxWidth={260}>
          {interp.label}
        </ColorfulBadge>
      ) : (
        <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>
          ยังไม่ได้ประเมิน
        </ColorfulBadge>
      )}
      <div className='flex-1' />
      <BrandSubdueButton
        variant='outline'
        size='sm'
        leadingIcon={done ? 'edit' : 'clipboard-list'}
        onClick={onOpen}
      >
        {readOnly ? 'ดูผลประเมิน' : (done ? 'แก้ไข' : 'ทำแบบประเมิน')}
      </BrandSubdueButton>
    </div>
  </section>
);

export const HomeVisitStep4Assessment = ({ form, setForm, readOnly, blockedMsg }) => {
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));


  const setAdl = (itemKey, value) => setForm((f) => ({
    ...f,
    adlAnswers: { ...f.adlAnswers, [itemKey]: value },
  }));

  const adlTotal = useMemo(() => scoreBarthel(form.adlAnswers), [form.adlAnswers]);
  const adlAnswered = useMemo(() => countBarthelAnswered(form.adlAnswers), [form.adlAnswers]);
  const adlInterp = useMemo(() => interpretBarthel(adlTotal), [adlTotal]);

  const q2Positive = SCREEN_2Q_QUESTIONS.filter((q) => form.screen2q?.[q.key] === true).length;
  /* เครื่องมือที่กำลังเปิดทำอยู่ในป๊อปอัป — null = ยังไม่เปิด */
  const [openTool, setOpenTool] = useState(null);


  /* ── เครื่องมือมาตรฐาน (มติ คทง.4 ต่อ §1.18.5) ──────────────────
     MNA-SF · 9Q (เมื่อ 2Q ผลบวก) · PPS — คำนวณคะแนนและแปลผลอัตโนมัติ
     ทุกตัว ไม่มีช่องให้ผู้บันทึกสรุปเป็น "ดีขึ้น/แย่ลง" เองอีก */
  const bmi = useMemo(() => calcBmi(form.vitals?.weight, form.vitals?.height), [form.vitals]);
  const bmiScore = useMemo(() => mnaBmiScore(bmi), [bmi]);

  const mnaTotal = useMemo(() => scoreMna(form.mna), [form.mna]);
  const mnaAnswered = useMemo(() => countMnaAnswered(form.mna), [form.mna]);
  const mnaDone = isMnaComplete(form.mna);
  const mnaInterp = useMemo(() => interpretMna(mnaTotal), [mnaTotal]);

  /** ตอบ MNA — พร้อมเติมผลแปล (`nutrition`) ให้อัตโนมัติเมื่อครบทุกข้อ. */
  const setMna = (itemKey, value) => setForm((f) => {
    const mna = { ...f.mna, [itemKey]: value };
    return {
      ...f,
      mna,
      nutrition: isMnaComplete(mna) ? interpretMna(scoreMna(mna)).nutrition : '',
    };
  });

  const applyBmiToMna = () => {
    if (bmiScore === null) return;
    setMna('f', bmiScore);
  };

  const q9Total = useMemo(() => score9q(form.screen9q), [form.screen9q]);
  const q9Answered = useMemo(() => count9qAnswered(form.screen9q), [form.screen9q]);
  const q9Done = is9qComplete(form.screen9q);
  const q9Interp = useMemo(() => interpret9q(q9Total), [q9Total]);
  const q9Suicidal = has9qSuicidalRisk(form.screen9q);

  const set9q = (key, value) => setForm((f) => ({
    ...f,
    screen9q: { ...f.screen9q, [key]: value },
  }));

  const ppsInterp = useMemo(() => interpretPps(form.pps), [form.pps]);

  /* meta ของการ์ดสี่ใบ — คะแนน/การแปลผลอ่านจากตัวแปรเดียวกับที่ฟอร์มข้างในใช้
     จึงไม่มีทางที่การ์ดกับป๊อปอัปจะบอกคนละเรื่อง */
  const q2Answered = SCREEN_2Q_QUESTIONS.filter((q) => typeof form.screen2q?.[q.key] === 'boolean').length;
  const q2Done = q2Answered === SCREEN_2Q_QUESTIONS.length;
  const ASSESSMENT_TOOL_CARDS = [
    {
      key: '2q',
      code: '2Q / 9Q',
      title: 'คัดกรองภาวะซึมเศร้า 2Q',
      done: q2Done,
      scoreLabel: q2Done ? `${q2Positive}/${SCREEN_2Q_QUESTIONS.length} ข้อ` : '—',
      interp: q2Done
        ? (q2Positive > 0
          ? { badge: 'orange', label: `2Q ผลบวก ${q2Positive} ข้อ — ต้องทำ 9Q ต่อ` }
          : { badge: 'green', label: 'ไม่พบความเสี่ยงซึมเศร้า' })
        : null,
    },
    {
      key: 'mna',
      code: 'MNA-SF',
      title: 'ประเมินภาวะโภชนาการ',
      done: mnaDone,
      scoreLabel: mnaDone ? `${mnaTotal}/${MNA_MAX_SCORE}` : `${mnaAnswered}/${MNA_ITEMS.length} ข้อ`,
      interp: mnaDone ? mnaInterp : null,
    },
    {
      key: 'pps',
      code: 'PPS',
      title: 'ระดับความสามารถผู้ป่วยประคับประคอง',
      done: !!ppsInterp,
      scoreLabel: ppsInterp ? `${form.pps}%` : '—',
      interp: ppsInterp,
    },
    {
      key: 'adl',
      code: 'Barthel Index',
      title: 'ประเมิน ADL — ดัชนีบาร์เธล',
      done: isBarthelComplete(form.adlAnswers),
      scoreLabel: `${adlTotal}/${BARTHEL_MAX_SCORE}`,
      interp: isBarthelComplete(form.adlAnswers) ? adlInterp : null,
    },
  ];

  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      {/* ถอด "ประเมินสภาพแวดล้อมในบ้าน" ออกจากงานเยี่ยมบ้าน (มติผู้ใช้ 30 ส.ค. 69)
          — สภาพบ้าน/สุขาภิบาลเป็นหมวดของ "แบบสำรวจบ้าน" ซึ่งเป็นระบบของทีมอื่น
          คีย์ `form.environment` ยังอยู่ในโมเดลเผื่อบันทึกเก่า */}

      {/* แบบคัดกรองสุขภาพรายบุคคล — ฟอร์มเดียวกับหน้า "คัดกรองเยี่ยมบ้าน" ที่เคยทำไว้
          ยกมาไว้ทั้งชุดในขั้น "ประเมินและคัดกรอง" (มติผู้ใช้ 30 ส.ค. 69) ซึ่งเป็นที่ของ
          เครื่องมือคัดกรองทั้งหมดอยู่แล้ว (ADL/Barthel · MNA-SF · 2Q/9Q · PPS)
          ช่องที่ระบบมีอยู่แล้วไม่ถูกยกมาซ้ำ: ชื่อ-ที่อยู่-เบอร์-สิทธิ (เวชระเบียน) ·
          น้ำหนัก/ส่วนสูง/BMI/BP/PR/RR/T (ขั้นสัญญาณชีพ) · รายการยา/อาหารที่แพ้และ
          โรคประจำตัว (ขั้นประวัติ) · วันที่สำรวจ (ใช้วันที่ให้บริการของบันทึกนี้) */}
      {/* ถอดแผง "แบบคัดกรองสุขภาพรายบุคคล — ข้อมูลประชากรและสิทธิ" ออก
          (มติผู้ใช้ 30 ส.ค. 69) — สัญชาติ/เชื้อชาติ/ศาสนา ย้ายไปขั้นข้อมูลส่วนตัว
          แล้ว ส่วนสถานะบุคคล/สถานะในชุมชน/การใช้สิทธิ ผู้ใช้ให้ตัดออก
          คีย์ใน `form.homeScreening` ยังอยู่ครบเผื่อบันทึกเก่า */}

      {/* "ความเสี่ยงด้านสุขภาพ 15 ข้อ" ย้ายไปขั้น "พฤติกรรมสุขภาพ" แล้ว
          (มติผู้ใช้ 30 ส.ค. 69) — เป็นเรื่องพฤติกรรม ไม่ใช่ผลการประเมิน */}

      {/* DTX คู่กับสถานะการอดอาหาร — ค่าน้ำตาลอ่านไม่ได้ถ้าไม่รู้ว่าอดอาหารมาหรือไม่ */}
      <StepSection>
        <TopicHeader icon='bloodtype'>น้ำตาลปลายนิ้ว (DTX)</TopicHeader>
        <DtxFields
          value={form.homeScreening}
          onChange={(next) => setForm((f) => ({ ...f, homeScreening: next }))}
          readOnly={readOnly}
        />
      </StepSection>

      <StepSection>
        <TopicHeader icon='health_metrics'>คัดกรองสุขภาพรายบุคคล</TopicHeader>
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Field label='ผู้ดูแลหลัก'>
            <Select
              showLabel={false} showHelperText={false} searchable={false} size='lg'
              value={form.caregiver} onChange={set('caregiver')} disabled={readOnly}
              options={CAREGIVER_OPTIONS}
              placeholder='เลือกลักษณะผู้ดูแล'
            />
          </Field>
          <Field
            label='ภาวะโภชนาการ'
            hint='ระบบแปลผลจากคะแนน MNA-SF ด้านล่างให้อัตโนมัติ — ไม่ต้องเลือกเอง'
          >
            <div
              className='flex items-center'
              style={{
                minHeight: 'var(--dim-size-1000, 48px)',
                gap: 'var(--dim-space-200, 8px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
                borderRadius: 'var(--dim-radius-200, 8px)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-input-default, #DFE1E3)',
                background: 'var(--surface-neutral-quaternary, #F9FBFB)',
              }}
            >
              {mnaDone ? (
                <ColorfulBadge style={mnaInterp.badge} size='small' hierarchy='secondary' width='hug' maxWidth={320}>
                  {NUTRITION_OPTIONS.find((o) => o.value === mnaInterp.nutrition)?.label || mnaInterp.label}
                </ColorfulBadge>
              ) : (
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  ยังประเมิน MNA-SF ไม่ครบ
                </span>
              )}
            </div>
          </Field>
          <Field label='แผลกดทับ'>
            <Select
              showLabel={false} showHelperText={false} searchable={false} size='lg'
              value={form.pressureSore} onChange={set('pressureSore')} disabled={readOnly}
              options={PRESSURE_SORE_OPTIONS}
              placeholder='เลือกระยะแผลกดทับ'
            />
          </Field>
        </div>

        {form.caregiver === 'none' && (
          <NoticeBand tone='warning' icon='person_alert'>
            ผู้รับบริการไม่มีผู้ดูแล — ควรประสานงานสังคมสงเคราะห์และ อสส. ในชุมชนก่อนปิดการเยี่ยม
          </NoticeBand>
        )}

        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
            ระดับความปวด (0 = ไม่ปวด · 10 = ปวดมากที่สุด)
          </span>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            {PAIN_SCALE.map((n) => (
              <SelectableTag
                key={n}
                label={String(n)}
                size='md'
                selected={form.painScore === n}
                onClick={readOnly ? undefined : () => set('painScore')(n)}
              />
            ))}
          </div>
          {Number.isFinite(form.painScore) && form.painScore >= 7 && (
            <NoticeBand tone='danger' icon='priority_high'>
              ความปวดระดับรุนแรง ({form.painScore}/10) — ควรทบทวนแผนจัดการความปวดและพิจารณาปรึกษาแพทย์ทางไกล
            </NoticeBand>
          )}
        </div>

        {/* แบบประเมินมาตรฐาน 4 ชุดเป็น "การ์ด" ทรงเดียวกับใบยินยอมของหน้า
            เวชระเบียน (มติผู้ใช้ 30 ส.ค. 69) — เดิมกางเป็นฟอร์มยาวเรียงกันสี่ชุด
            ในขั้นเดียว ทำให้เลื่อนหาไม่เจอว่าเหลือชุดไหนยังไม่ได้ทำ · การ์ดบอก
            สถานะ/คะแนน/การแปลผลของแต่ละชุดในบรรทัดเดียว แล้วค่อยกดเข้าไปทำ */}
        <FieldGrid cols={4} rowGap='var(--dim-space-400)' columnGap='var(--dim-space-400)'>
          {ASSESSMENT_TOOL_CARDS.map((t) => (
            <AssessmentToolCard
              key={t.key}
              code={t.code}
              title={t.title}
              done={t.done}
              scoreLabel={t.scoreLabel}
              interp={t.interp}
              readOnly={readOnly}
              onOpen={() => setOpenTool(t.key)}
            />
          ))}
        </FieldGrid>

        <Popup
          open={!!openTool}
          onClose={() => setOpenTool(null)}
          size='extraLarge'
          title={ASSESSMENT_TOOL_CARDS.find((t) => t.key === openTool)?.title || ''}
          primaryAction={{ label: 'เสร็จสิ้น', onClick: () => setOpenTool(null) }}
        >
          {/* ระยะจากเนื้อหาถึงขอบป๊อปอัป 24px ทุกด้าน (มติผู้ใช้ 30 ส.ค. 69) */}
          <div
            className='flex flex-col w-full'
            style={{ gap: 'var(--dim-space-600, 24px)', padding: 'var(--dim-space-600, 24px)' }}
          >
            {openTool === '2q' && (
              <>
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                  คัดกรองภาวะซึมเศร้า 2Q
                </span>
                {SCREEN_2Q_QUESTIONS.map((q, idx) => (
                  <div key={q.key} className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <span className='flex-1 min-w-0' style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
                      {idx + 1}. {q.label}
                    </span>
                    <SelectableTag
                      label='มี'
                      size='md'
                      selected={form.screen2q?.[q.key] === true}
                      onClick={readOnly ? undefined : () => setForm((f) => ({ ...f, screen2q: { ...f.screen2q, [q.key]: true } }))}
                    />
                    <SelectableTag
                      label='ไม่มี'
                      size='md'
                      selected={form.screen2q?.[q.key] === false}
                      onClick={readOnly ? undefined : () => setForm((f) => ({ ...f, screen2q: { ...f.screen2q, [q.key]: false } }))}
                    />
                  </div>
                ))}
                {q2Positive > 0 && (
                  <NoticeBand tone='warning' icon='psychology'>
                    คัดกรอง 2Q ผลบวก {q2Positive} ข้อ — ต้องประเมิน 9Q ต่อให้ครบก่อนไปขั้นตอนถัดไป
                    และส่งต่อคลินิกสุขภาพจิตหากเข้าเกณฑ์
                  </NoticeBand>
                )}
              </div>

              {/* 9Q — บังคับเมื่อ 2Q ผลบวก (มติ คทง.4 ต่อ §1.18.5) */}
              {q2Positive > 0 && (
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <span style={{
                      fontSize: 'var(--type-size-sm)',
                      fontWeight: 'var(--type-weight-bold)',
                      color: 'var(--text-content-default, #363B3F)',
                    }}>
                      แบบประเมินโรคซึมเศร้า 9Q
                    </span>
                    <div className='flex-1' />
                    <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>
                      {q9Total}/{SCREEN_9Q_MAX_SCORE} คะแนน
                    </span>
                    {q9Done && (
                      <ColorfulBadge style={q9Interp.badge} size='small' hierarchy='secondary' width='hug' maxWidth={420}>
                        {q9Interp.label}
                      </ColorfulBadge>
                    )}
                  </div>
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    ถามความถี่ของอาการใน 2 สัปดาห์ที่ผ่านมา ระบบรวมคะแนนและแปลผลระดับความรุนแรงให้อัตโนมัติ
                    (ตอบแล้ว {q9Answered}/{SCREEN_9Q_QUESTIONS.length} ข้อ)
                  </span>
                  {SCREEN_9Q_QUESTIONS.map((q, idx) => (
                    <div key={q.key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
                      <span style={{
                        fontSize: 'var(--type-size-sm)',
                        color: q.critical ? 'var(--text-pill-red, #B91C1C)' : 'var(--text-content-default, #363B3F)',
                      }}>
                        {idx + 1}. {q.label}
                      </span>
                      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                        {SCREEN_9Q_FREQUENCY.map((opt) => (
                          <SelectableTag
                            key={opt.value}
                            label={`${opt.label} (${opt.value})`}
                            size='md'
                            selected={form.screen9q?.[q.key] === opt.value}
                            onClick={readOnly ? undefined : () => set9q(q.key, opt.value)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {q9Suicidal && (
                    <NoticeBand tone='danger' icon='crisis_alert'>
                      ผู้รับบริการตอบข้อ 9 (คิดทำร้ายตนเอง) — ต้องประเมินความเสี่ยงฆ่าตัวตาย (8Q)
                      และส่งต่อจิตแพทย์ทันทีในการเยี่ยมครั้งนี้ ห้ามรอรอบเยี่ยมถัดไป
                    </NoticeBand>
                  )}
                  {q9Done && !q9Suicidal && (
                    <NoticeBand tone={q9Interp.key === 'none' ? 'info' : 'warning'} icon='psychology_alt'>
                      {q9Interp.label} — {q9Interp.advice}
                    </NoticeBand>
                  )}
                </div>
              )}
              </>
            )}
            {openTool === 'mna' && (
              <>
              <TopicHeader
                icon='nutrition'
                aside={(
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>
                      {mnaTotal}/{MNA_MAX_SCORE} คะแนน
                    </span>
                    <ColorfulBadge style={mnaInterp.badge} size='small' hierarchy='secondary' width='hug' maxWidth={420}>
                      {mnaDone ? mnaInterp.label : `ตอบแล้ว ${mnaAnswered}/${MNA_ITEMS.length} ข้อ`}
                    </ColorfulBadge>
                  </div>
                )}
              >
                ประเมินภาวะโภชนาการ — MNA-SF
              </TopicHeader>
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                ใช้แบบประเมินมาตรฐานแทนการเลือก “ดี/เสี่ยง/ขาดสารอาหาร” เอง — ระบบรวมคะแนน แปลผล
                และเติมช่อง “ภาวะโภชนาการ” ด้านบนให้อัตโนมัติเมื่อตอบครบทั้ง {MNA_ITEMS.length} ข้อ
              </span>
              {MNA_ITEMS.map((item, idx) => (
                <div key={item.key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <span className='flex-1 min-w-0' style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                      {idx + 1}. {item.label}
                    </span>
                    {item.autoFromBmi && bmiScore !== null && form.mna?.f !== bmiScore && !readOnly && (
                      <NeutralSubdueButton variant='outline' size='sm' leadingIcon='calculate' onClick={applyBmiToMna}>
                        ใช้ค่า BMI {bmi} ที่ระบบคำนวณ
                      </NeutralSubdueButton>
                    )}
                  </div>
                  {item.autoFromBmi && bmiScore === null && (
                    <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                      ยังไม่มีค่า BMI — กรอกน้ำหนักและส่วนสูงในขั้นตอนสัญญาณชีพ แล้วกลับมากดใช้ค่าอัตโนมัติได้
                    </span>
                  )}
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    {item.options.map((opt) => (
                      <SelectableTag
                        key={opt.value}
                        label={`${opt.label} (${opt.value})`}
                        size='md'
                        selected={form.mna?.[item.key] === opt.value}
                        onClick={readOnly ? undefined : () => setMna(item.key, opt.value)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {mnaDone && (
                <NoticeBand tone={mnaInterp.key === 'normal' ? 'info' : 'warning'} icon='restaurant'>
                  {mnaInterp.label} — {mnaInterp.advice}
                </NoticeBand>
              )}
              </>
            )}
            {openTool === 'pps' && (
              <>
              <TopicHeader
                icon='monitor_heart'
                aside={ppsInterp ? (
                  <ColorfulBadge style={ppsInterp.badge} size='small' hierarchy='secondary' width='hug' maxWidth={420}>
                    {ppsInterp.label}
                  </ColorfulBadge>
                ) : undefined}
              >
                ระดับความสามารถ — PPS (Palliative Performance Scale)
              </TopicHeader>
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                เลือกระดับที่ตรงกับผู้รับบริการมากที่สุด — ระบบใช้ผลนี้เสนอรอบการเยี่ยมครั้งถัดไปให้อัตโนมัติ
              </span>
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
                {PPS_LEVELS.map((level) => (
                  <SelectableTag
                    key={level.value}
                    label={level.label}
                    size='md'
                    selected={Number(form.pps) === level.value && form.pps !== ''}
                    onClick={readOnly ? undefined : () => set('pps')(level.value)}
                  />
                ))}
              </div>
              {ppsInterp && (
                <NoticeBand tone={ppsInterp.key === 'stable' ? 'info' : 'warning'} icon='event_repeat'>
                  {ppsInterp.label} — {ppsInterp.advice}
                  {ppsInterp.followUpDays ? ` (ระบบเสนอรอบเยี่ยมถัดไปทุก ${ppsInterp.followUpDays} วัน)` : ''}
                </NoticeBand>
              )}
              </>
            )}
            {openTool === 'adl' && (
              <>
              <TopicHeader
                icon='accessible'
                aside={(
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>
                      {adlTotal}/{BARTHEL_MAX_SCORE} คะแนน
                    </span>
                    <ColorfulBadge style={adlInterp.badge} size='small' hierarchy='secondary' width='hug' maxWidth={420}>
                      {adlInterp.label}
                    </ColorfulBadge>
                  </div>
                )}
              >
                ประเมิน ADL — ดัชนีบาร์เธล (Barthel Index)
              </TopicHeader>
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                ตอบครบทุกข้อ ระบบคำนวณคะแนนรวมและแปลผลกลุ่มติดสังคม/ติดบ้าน/ติดเตียงให้อัตโนมัติ
                และส่งคะแนนไปแสดงเป็นแนวโน้มในหน้าติดตามการเยี่ยมบ้าน (ตอบแล้ว {adlAnswered}/{BARTHEL_ITEMS.length} ข้อ)
              </span>
              {BARTHEL_ITEMS.map((item, idx) => (
                <div key={item.key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                    {idx + 1}. {item.label}
                  </span>
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    {item.options.map((opt) => (
                      <SelectableTag
                        key={opt.value}
                        label={`${opt.label} (${opt.value})`}
                        size='md'
                        selected={form.adlAnswers?.[item.key] === opt.value}
                        onClick={readOnly ? undefined : () => setAdl(item.key, opt.value)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              </>
            )}
          </div>
        </Popup>

      </StepSection>

      <StepSection>
        <TopicHeader icon='clipboard-list'>สรุปผลการประเมินการเยี่ยมบ้าน</TopicHeader>
        <SuggestibleTextarea
          label='สรุปผลการประเมิน'
          required
          voice
          value={form.assessmentNote}
          onChange={(e) => set('assessmentNote')(e.target.value)}
          suggestions={HOMEVISIT_ASSESSMENT_SUGGESTIONS}
          minChars={3}
          disabled={readOnly}
          placeholder='สภาพผู้รับบริการ สภาพแวดล้อม ผู้ดูแล และปัญหาที่ต้องแก้ไขเร่งด่วน'
        />
      </StepSection>

      <HomeVisitPhotoSection form={form} setForm={setForm} readOnly={readOnly} />
    </StepCard>
  );
};

/* ── Step 10 — บันทึกตามบทบาทวิชาชีพ + กิจกรรมการดูแล ───────────────
   ปุ่มปรึกษาแพทย์ทางไกลย้ายไปขั้น "ประเมินอาการป่วย" แล้ว
   (ดู `HomeVisitTelemedSection`) */

export const HomeVisitStep5Care = ({ form, setForm, readOnly, blockedMsg }) => {

  const toggleActivity = (key) => setForm((f) => ({
    ...f,
    activities: { ...f.activities, [key]: !f.activities[key] },
  }));

  const activityGroups = useMemo(() => {
    const map = new Map();
    CARE_ACTIVITIES.forEach((a) => {
      if (!map.has(a.group)) map.set(a.group, []);
      map.get(a.group).push(a);
    });
    return Array.from(map.entries());
  }, []);

  const selectedActivities = CARE_ACTIVITIES.filter((a) => form.activities?.[a.key]);


  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      {/* ถอดหมวด "บันทึกเวชระเบียนตามบทบาทวิชาชีพ" ออก (มติผู้ใช้ 30 ส.ค. 69)
          — คีย์ `form.roleNotes` ยังอยู่ในโมเดลและในใบสรุป/บันทึกเก่า */}

      <StepSection>
        <TopicHeader
          icon='checklist'
          aside={(
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              เลือกแล้ว {selectedActivities.length} กิจกรรม (TOR 1.18.7)
            </span>
          )}
        >
          กิจกรรมการดูแลที่ให้ในการเยี่ยมครั้งนี้
        </TopicHeader>
        {activityGroups.map(([group, items]) => (
          <div key={group} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>{group}</span>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {items.map((a) => (
                <SelectableTag
                  key={a.key}
                  label={a.label}
                  size='md'
                  selected={!!form.activities?.[a.key]}
                  onClick={readOnly ? undefined : () => toggleActivity(a.key)}
                />
              ))}
            </div>
          </div>
        ))}
      </StepSection>

    </StepCard>
  );
};

/* ── Step 6 — สั่งการรักษา (CPOE · TOR 1.18.6) ────────────────────────
   รายการทั้งหมดมาจากแคตตาล็อกกลางชุดเดียวกับหน้าจอ CPOE (`labCatalog` ·
   `xrayCatalog` · ICD-9-CM · รายการยา/เวชภัณฑ์ของ Step5Orders) และส่งต่อ
   ด้วย id เดิม เพื่อให้แพทย์ที่ศูนย์ฯ กด "นำเข้า" แล้วได้แถวคำสั่งจริง
   ผ่านการตรวจซ้ำซ้อน/CDSS ของ CPOE — ไม่ใช่ข้อความที่ต้องคีย์ใหม่. */

export const HomeVisitStep6Orders = ({
  form, setForm, readOnly, hn, appointment, registryEntry, blockedMsg,
}) => {
  const routerHistory = useHistory();
  const patientHn = hn || registryEntry?.hn || appointment?.hn || '';
  const [handoff, setHandoff] = useState(() => (patientHn ? getCpoeHandoff(patientHn) : null));

  const toggleOrder = (groupKey, id) => setForm((f) => ({
    ...f,
    [groupKey]: (f[groupKey] || []).includes(id)
      ? f[groupKey].filter((v) => v !== id)
      : [...(f[groupKey] || []), id],
  }));

  const totalOrders = countHomeVisitOrders(form);
  /* คำสั่งที่ "ส่งไปแล้ว" ต่างจากที่เลือกอยู่ตอนนี้หรือไม่ — ถ้าต่างต้องส่งซ้ำ */
  const sentIds = (handoff?.items || []).map((i) => i.id).sort().join('|');
  const currentIds = collectHomeVisitOrderItems(form).map((i) => i.id).sort().join('|');
  const handoffStale = !!handoff && sentIds !== currentIds;

  const sendToCpoe = () => {
    if (!patientHn || totalOrders === 0) return;
    setHandoff(sendOrdersToCpoe({ hn: patientHn, visitId: appointment?.id, form }));
  };

  const openCpoe = () => routerHistory.push({
    pathname: '/treat/record',
    state: {
      hn: patientHn,
      name: registryEntry?.name || appointment?.name,
      from: 'homevisit',
    },
  });

  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      <NoticeBand tone='neutral' icon='info'>
        รายการในขั้นตอนนี้เป็นรายการเดียวกับแคตตาล็อกของระบบ CPOE ที่ศูนย์บริการฯ (รหัสแล็บ/เอกซเรย์/ICD-9-CM
        ชุดเดียวกัน) — กด “ส่งคำสั่งเข้า CPOE” แล้วแพทย์ที่ศูนย์ฯ นำเข้าเป็นคำสั่งจริงได้ทันที
        โดยผ่านการตรวจซ้ำซ้อนและ CDSS ของ CPOE (TOR 1.18.6) · ขั้นตอนนี้ไม่บังคับกรอก
      </NoticeBand>

      {HOMEVISIT_ORDER_GROUPS.map((group) => (
        <StepSection key={group.key}>
          <TopicHeader
            icon={group.icon}
            aside={(
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                เลือกแล้ว {form[group.key]?.length || 0} รายการ
              </span>
            )}
          >
            {group.label}
          </TopicHeader>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {group.hint}
          </span>
          <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {group.items.map((opt) => (
              <SelectableTag
                key={opt.id}
                label={opt.detail ? `${opt.name} · ${opt.detail}` : opt.name}
                size='md'
                selected={(form[group.key] || []).includes(opt.id)}
                onClick={readOnly ? undefined : () => toggleOrder(group.key, opt.id)}
              />
            ))}
          </div>
        </StepSection>
      ))}

      <StepSection>
        <TopicHeader icon='edit'>รายละเอียดคำสั่งการรักษา</TopicHeader>
        {totalOrders === 0 && (
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
            ยังไม่ได้เลือกคำสั่งการรักษา — การเยี่ยมบางครั้งไม่มีคำสั่งการรักษา สามารถข้ามขั้นตอนนี้ได้
          </span>
        )}
        <SuggestibleTextarea
          label='รายละเอียด/เงื่อนไขของคำสั่ง'
          voice
          value={form.orderNote}
          onChange={(e) => setForm((f) => ({ ...f, orderNote: e.target.value }))}
          suggestions={HOMEVISIT_ORDER_NOTE_SUGGESTIONS}
          minChars={2}
          disabled={readOnly}
          placeholder='ความถี่ ระยะเวลา ผู้รับผิดชอบ และเงื่อนไขพิเศษของคำสั่งการรักษา'
        />
      </StepSection>

      {/* TOR 1.18.6 — ส่งคำสั่งเข้าคิวนำเข้าของ CPOE */}
      <StepSection>
        <TopicHeader
          icon='swap_horiz'
          aside={handoff && !handoffStale ? (
            <ColorfulBadge
              style={handoff.status === 'imported' ? 'teal' : 'blue'}
              size='small' hierarchy='secondary' width='hug' maxWidth={460}
            >
              {handoff.status === 'imported'
                ? `แพทย์นำเข้าเป็นคำสั่งจริงแล้ว ${handoff.importedCount} รายการ`
                : `รอแพทย์นำเข้าที่หน้าจอ CPOE ${handoff.items.length} รายการ`}
            </ColorfulBadge>
          ) : undefined}
        >
          ส่งคำสั่งการรักษาเข้าระบบ CPOE ของศูนย์บริการฯ
        </TopicHeader>

        <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <BrandSubdueButton
            variant='fill' size='md' leadingIcon='send'
            onClick={sendToCpoe}
            disabled={readOnly || totalOrders === 0 || !patientHn || (!!handoff && !handoffStale)}
          >
            {handoffStale ? 'ส่งคำสั่งชุดใหม่เข้า CPOE' : 'ส่งคำสั่งเข้า CPOE'}
          </BrandSubdueButton>
          <NeutralSubdueButton
            variant='outline' size='md' leadingIcon='stethoscope'
            onClick={openCpoe}
            disabled={!patientHn}
          >
            เปิดหน้าจอ CPOE ของผู้รับบริการ
          </NeutralSubdueButton>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            เลือกไว้ {totalOrders} รายการ
          </span>
        </div>

        {!patientHn && (
          <NoticeBand tone='warning' icon='person_alert'>
            ยังไม่ทราบ HN ของผู้รับบริการ — เปิดบันทึกการเยี่ยมจากคิวหรือทะเบียน จึงจะส่งคำสั่งเข้า CPOE ได้
          </NoticeBand>
        )}

        {handoff && handoff.status === 'imported' && !handoffStale && (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <AuditStamp by={handoff.by} at={handoff.at} prefix='ส่งจากการเยี่ยมโดย' />
            <AuditStamp by={handoff.importedBy} at={handoff.importedAt} prefix='นำเข้าเป็นคำสั่งจริงโดย' />
          </div>
        )}

        {handoff && handoff.status === 'pending' && !handoffStale && (
          <>
            <AuditStamp by={handoff.by} at={handoff.at} prefix='ส่งจากการเยี่ยมโดย' />
            <NoticeBand tone='info' icon='pending_actions'>
              คำสั่งรออยู่ในหน้าจอ CPOE ของ HN {patientHn} แล้ว — แพทย์จะเห็นแถบ “คำสั่งจากการเยี่ยมบ้าน”
              ที่ขั้นสั่งการรักษา และกดนำเข้าเพื่อให้ผ่านการตรวจซ้ำซ้อน/CDSS ก่อนยืนยัน
            </NoticeBand>
          </>
        )}

        {handoffStale && (
          <NoticeBand tone='warning' icon='sync_problem'>
            รายการที่เลือกไว้ตอนนี้ไม่ตรงกับชุดที่ส่งเข้า CPOE เมื่อ {handoff.at}
            {' '}— กด “ส่งคำสั่งชุดใหม่เข้า CPOE” เพื่อให้แพทย์เห็นรายการล่าสุด
          </NoticeBand>
        )}
      </StepSection>
    </StepCard>
  );
};

/* ── Step 7 — Family Folder + ส่งข้อมูลกลับศูนย์ ───────────────────── */

export const HomeVisitStep7Family = ({
  form, setForm, readOnly, visitId, hn, appointment, registryEntry, onDataChanged, blockedMsg,
}) => {
  const routerHistory = useHistory();
  const [submitOpen, setSubmitOpen] = useState(false);
  const submission = visitId ? getVisitSubmission(visitId) : null;
  /* §1.7.1.1 (มติ คทง.4) — คีย์ที่นี่ที่เดียว แล้วส่งชุดข้อมูล สปสช. ต่อ
     ให้อัตโนมัติ ไม่ต้องไปคีย์ซ้ำที่ระบบ BKK Home Care */
  const [nhsoClaim, setNhsoClaim] = useState(() => (visitId ? getNhsoClaim(visitId) : null));

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const addMember = () => setForm((f) => ({
    ...f,
    familyMembers: [...f.familyMembers, {
      id: `fam-${Date.now()}`, name: '', relation: '', age: '', health: '',
    }],
  }));
  const updateMember = (id, key, value) => setForm((f) => ({
    ...f,
    familyMembers: f.familyMembers.map((m) => (m.id === id ? { ...m, [key]: value } : m)),
  }));
  const removeMember = (id) => setForm((f) => ({
    ...f,
    familyMembers: f.familyMembers.filter((m) => m.id !== id),
  }));

  const adlTotal = scoreBarthel(form.adlAnswers);
  const adlInterp = interpretBarthel(adlTotal);

  const claimContext = {
    entry: registryEntry || appointment,
    form,
    adlComplete: isBarthelComplete(form.adlAnswers),
  };

  const sendClaim = () => setNhsoClaim(sendNhsoClaim(visitId, claimContext));

  const confirmSubmit = () => {
    saveVisitSubmission(visitId, {
      hn,
      summary: form.assessmentNote,
      orders: summarizeOrders(form, homeVisitOrderLabel),
      nextVisitDate: form.nextVisitDate,
    });
    appendVisitHistory(hn, {
      date: form.serviceDate || todayIsoDate(),
      profession: registryEntry?.profession || appointment?.profession || 'nurse',
      adl: adlTotal,
      vitals: form.vitals,
      summary: form.assessmentNote,
      orders: summarizeOrders(form, homeVisitOrderLabel),
      /* ส่งเป็น "คะแนนดิบรายเครื่องมือ" ไม่ใช่ข้อความสรุป — หน้าติดตามต้อง
         เอาไปวาดกราฟแนวโน้มตาม TOR ๑.๑๐.๑๒.๔ ซึ่งทำจากสตริงไม่ได้ */
      toolScores: toolScoresFromSummary(summarizeStandardTools(form)),
    });
    /* แฟ้มครอบครัวกลับเข้าทะเบียนระดับครัวเรือน — ครั้งถัดไปเปิดมาเจอรายชื่อเดิม */
    saveFamilyMembers(hn, form.familyMembers);
    /* ส่งชุดข้อมูลเบิกจ่าย สปสช. ต่อทันทีในขั้นตอนเดียวกัน */
    sendClaim();
    setSubmitOpen(false);
    onDataChanged?.();
  };

  const doPrint = () => {
    const vitalMap = {};
    VITAL_FIELDS.forEach((f) => {
      const v = String(form.vitals?.[f.key] ?? '').trim();
      if (v) vitalMap[f.key] = { label: f.label, value: v, unit: f.unit };
    });
    printHomeVisitSummary({
      patientName: registryEntry?.name || appointment?.name,
      hn,
      groupLabel: resolveGroup(registryEntry?.group || appointment?.group)?.label,
      sourceLabel: resolveSource(registryEntry?.source || appointment?.source)?.label,
      address: registryEntry?.address || appointment?.address,
      visitNo: (appointment?.visitCount || 0) + 1,
      serviceDate: form.serviceDate,
      arrivalTime: form.arrivalTime,
      distanceLabel: form.currentLocation && (registryEntry?.home || appointment?.home)
        ? formatDistance(distanceMeters(form.currentLocation, registryEntry?.home || appointment?.home))
        : '—',
      team: form.team,
      vitals: vitalMap,
      adlScore: adlTotal,
      adlLabel: adlInterp.label,
      assessment: form.assessmentNote,
      roleNotes: ROLE_NOTE_SECTIONS
        .filter((s) => String(form.roleNotes?.[s.profession] || '').trim())
        .map((s) => [s.label, form.roleNotes[s.profession]]),
      activities: CARE_ACTIVITIES.filter((a) => form.activities?.[a.key]).map((a) => a.label),
      orders: [
        ['ยาและเวชภัณฑ์', (form.drugOrders || []).map(homeVisitOrderLabel).join(' · ') || '—'],
        ['ห้องปฏิบัติการ', (form.labOrders || []).map(homeVisitOrderLabel).join(' · ') || '—'],
        ['เอกซเรย์', (form.xrayOrders || []).map(homeVisitOrderLabel).join(' · ') || '—'],
        ['หัตถการ/ต่อเนื่อง', (form.procedureOrders || []).map(homeVisitOrderLabel).join(' · ') || '—'],
      ].filter((row) => row[1] !== '—'),
      familyNote: form.familyNote,
      nextVisitDate: form.nextVisitDate,
      planNote: form.planNote,
      submission,
    });
  };

  /* ── Family Folder — แสดงข้อมูล แก้ไขในป๊อปอัป (มติผู้ใช้ 30 ส.ค. 69) ──
     ToR ให้แฟ้มครอบครัวเป็นข้อมูลที่ *อ่าน* ระหว่างเยี่ยมเป็นหลัก (ระดับครัวเรือน
     ตามคู่มือระบบงานสาธารณสุขในชุมชน S011) การแก้จึงไม่ควรกางเป็นฟอร์มยาว
     กลางขั้นตอน แต่เปิดเป็นป๊อปอัปเมื่อพบว่าข้อมูลไม่ตรงกับที่บ้านจริง

     ⚠️ ปุ่ม "ส่งข้อมูลเข้ารักษาที่ศูนย์ฯ" ถูกถอดออกตามคำสั่ง — ฟังก์ชันที่หายไป
     จากหน้าจอคือ `appendVisitHistory` (ป้อนหน้าติดตาม TOR ๑.๑๐.๑๒.๔) ·
     ชุดเบิกจ่าย สปสช. (§1.7.1.1) · เขียนแฟ้มครอบครัวกลับทะเบียน
     โค้ดยังอยู่ครบในไฟล์นี้ รอต่อกลับเข้าปุ่มใหม่ */
  const [familyEditOpen, setFamilyEditOpen] = useState(false);
  /* ครัวเรือนที่ยังไม่เคยบันทึกสมาชิกได้ชุด mock คงที่ต่อ HN — ตารางจะได้ไม่ว่าง
     เปล่าทุกราย (มติผู้ใช้ 30 ส.ค. 69) กดแก้ไขแล้วบันทึกจึงกลายเป็นข้อมูลจริง */
  const familyRows = form.familyMembers.length > 0 ? form.familyMembers : getFamilyMembers(hn);

  /* เปิดป๊อปอัปครั้งแรกบนครัวเรือนที่ยังใช้ชุด mock — ย้ายเข้าฟอร์มก่อน
     เพื่อให้แก้ไข/ลบทีละแถวทำงานกับ state จริง */
  const openFamilyEdit = () => {
    if (form.familyMembers.length === 0 && familyRows.length > 0) {
      setForm((f) => ({ ...f, familyMembers: familyRows.map(({ mock, ...m }) => m) }));
    }
    setFamilyEditOpen(true);
  };

  const saveFamily = () => {
    saveFamilyMembers(hn, form.familyMembers);
    setFamilyEditOpen(false);
    onDataChanged?.();
  };

  const householdRows = [
    { label: 'ที่อยู่ครัวเรือน', value: registryEntry?.address || appointment?.address || '—' },
    { label: 'ชุมชน', value: registryEntry?.community || '—' },
    { label: 'เขต', value: registryEntry?.district || '—' },
    { label: 'ผู้ติดต่อหลัก', value: registryEntry?.contactName || '—' },
    { label: 'เบอร์ผู้ติดต่อ', value: registryEntry?.contactPhone || '—' },
  ];

  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      <StepSection gap='var(--dim-space-600)'>
        <TopicHeader
          icon='family_restroom'
          aside={!readOnly && (
            <BrandSubdueButton
              variant='outline' size='sm' leadingIcon='edit'
              onClick={openFamilyEdit}
            >
              แก้ไข Family Folder
            </BrandSubdueButton>
          )}
        >
          Family Folder — แฟ้มครอบครัว
        </TopicHeader>
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-600, 24px)' }}>
          {householdRows.map((r) => (
            <div key={r.label} className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)', minWidth: 200 }}>
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                {r.label}
              </span>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                {r.value}
              </span>
            </div>
          ))}
        </div>

        <Table
          columns={[
            { key: 'name', label: 'ชื่อ-สกุล', flex: true, minWidth: 220 },
            { key: 'relation', label: 'ความสัมพันธ์', flex: true, minWidth: 140 },
            { key: 'age', label: 'อายุ (ปี)', flex: true, minWidth: 100 },
            {
              key: 'health',
              label: 'ภาวะสุขภาพ',
              flex: true,
              minWidth: 260,
              /* เก็บเป็น value ของดรอปดาวน์ ตารางจึงต้องแปลงกลับเป็นคำอ่าน —
                 ข้อมูลเก่าที่เคยพิมพ์อิสระไว้ยังแสดงตามที่พิมพ์ */
              render: (r) => FAMILY_HEALTH_OPTIONS.find((o) => o.value === r.health)?.label || r.health || '—',
            },
          ]}
          rows={familyRows}
          rowKey={(r) => r.id}
          emptyMessage='ยังไม่มีข้อมูลสมาชิกในครอบครัวในทะเบียนของครัวเรือนนี้'
        />

      </StepSection>

      {/* แก้ไขในป๊อปอัป — บันทึกแล้วเขียนกลับทะเบียนระดับครัวเรือนทันที
          ครั้งถัดไปที่เยี่ยมบ้านหลังนี้จึงเห็นรายชื่อชุดใหม่ */}
      <Popup
        open={familyEditOpen}
        onClose={() => setFamilyEditOpen(false)}
        size='extraLarge'
        title='แก้ไข Family Folder'
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setFamilyEditOpen(false) }}
        primaryAction={{ label: 'บันทึกแฟ้มครอบครัว', onClick: saveFamily }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
          {familyRows.map((m) => (
            <div key={m.id} className='flex items-end w-full flex-wrap' style={{ gap: 'var(--dim-space-600, 24px)' }}>
              <Field label='ชื่อ-สกุล'>
                <InputField showLabel={false} showHelperText={false} value={m.name} onChange={(v) => updateMember(m.id, 'name', v)} placeholder='ชื่อสมาชิกในครอบครัว' />
              </Field>
              <Field label='ความสัมพันธ์'>
                <Select
                  showLabel={false} showHelperText={false} searchable={false} size='lg'
                  value={m.relation} onChange={(v) => updateMember(m.id, 'relation', v)}
                  options={FAMILY_RELATIONS}
                  placeholder='เลือกความสัมพันธ์'
                />
              </Field>
              <Field label='อายุ (ปี)'>
                <InputField showLabel={false} showHelperText={false} value={m.age} onChange={(v) => updateMember(m.id, 'age', v)} placeholder='ปี' />
              </Field>
              <Field label='ภาวะสุขภาพ'>
                <Select
                  showLabel={false} showHelperText={false} searchable={false} size='lg'
                  value={m.health} onChange={(v) => updateMember(m.id, 'health', v)}
                  options={FAMILY_HEALTH_OPTIONS}
                  placeholder='เลือกภาวะสุขภาพ'
                />
              </Field>
              <NeutralIconButton icon='delete' variant='ghost' size='sm' onClick={() => removeMember(m.id)} aria-label='ลบสมาชิก' />
            </div>
          ))}
          <BrandDashedAddButton onClick={addMember}>เพิ่มสมาชิกในครอบครัว</BrandDashedAddButton>

          <SuggestibleTextarea
            label='บันทึก Family Folder'
            voice
            value={form.familyNote}
            onChange={(e) => set('familyNote')(e.target.value)}
            suggestions={HOMEVISIT_FAMILY_SUGGESTIONS}
            minChars={3}
            style={{ maxWidth: 'none' }}
            placeholder='โครงสร้างครอบครัว ผู้ดูแลหลัก เศรษฐานะ และปัจจัยเสี่ยงของครัวเรือน'
          />
        </div>
      </Popup>
    </StepCard>
  );
};

export const HOMEVISIT_STEP_RENDERERS = [
  HomeVisitStep0Consent,
  HomeVisitStep1Service,
  HomeVisitStep2Address,
  HomeVisitStepContact,
  HomeVisitStepRights,
  HomeVisitStep3Vitals,
  HomeVisitStepAllergy,
  HomeVisitStep2History,
  HomeVisitStepBehaviour,
  /* ขั้น "ประเมิน" ถูกยุบเข้าไปในขั้น "ประเมินอาการป่วย" แล้ว
     (มติผู้ใช้ 30 ส.ค. 69) — `HomeVisitStep4Assessment` ยัง export อยู่และถูก
     เรียกจากขั้นนั้นโดยตรง */
  HomeVisitStep5Care,
  /* ขั้น "สั่งการรักษา" (CPOE) ถูกถอดออกจากโฟลว์ (มติผู้ใช้ 30 ส.ค. 69) —
     `HomeVisitStep6Orders` กับสะพาน `homevisitCpoe.js` ยังอยู่ครบ รอที่ทางใหม่ */
  HomeVisitStep7Family,
];

export default HOMEVISIT_STEP_RENDERERS;
