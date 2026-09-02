import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import TimePicker from '@/components/forms/TimePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import SelectableCardButton from '@/components/button/SelectableCardButton';
import PainScaleCards from '@/components/forms/PainScaleCards';
import { FieldGrid } from '@/components/forms/Fields';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import VoiceTextarea from '@/components/forms/VoiceTextarea';
import { useTelemedCall } from '@/components/telemed/TelemedCallProvider';
import Checkbox from '@/components/checkbox/Checkbox';
import PhotoUploadField from '@/components/forms/PhotoUploadField';
import AddressMapBlock from '@/components/forms/AddressMapBlock';
import CarriedDentalPanel from '@/components/dental/CarriedDentalPanel';
import {
  DtxFields,
  HealthRiskFields,
  MinorIllnessFields,
} from '@/components/homevisit/homeScreeningSections';
import { PATIENT_GROUP_OPTIONS, MOBILITY_OPTIONS, buildMockRightsGroups } from '@/data/registrationForm';
/* รายชื่อใบยินยอมชุดเดียวกับที่ขั้นที่ 1 แสดง (`StepConsent`) — ถ้าใช้ catalog
   คนละชุด หน้าทวนจะบอกว่ายังไม่ได้เซ็นทั้งที่เซ็นครบแล้ว */
import { REGISTRATION_PENDING_CONSENT_CARDS } from '@/data/registrationConsentForms';
import { MEDICATION_NAME_OPTIONS } from '@/data/medicationCatalog';
import {
  NATIONALITY_OPTIONS,
  ETHNICITY_OPTIONS,
  HEALTH_RISK_OPTIONS,
  homeScreeningSummaryRows,
} from '@/data/homeScreeningForm';
/* ยกชุดคำ/ระดับของขั้น "อาการป่วย" ที่จุดคัดกรอง OPD มาใช้ตรง ๆ
   (มติผู้ใช้ 30 ส.ค. 69) — ถ้าประกาศใหม่ที่นี่ คำที่พยาบาลเลือกจะไม่ตรงกัน
   ระหว่างจุดคัดกรองกับที่บ้าน แล้วเอามาเทียบ/รวมรายงานไม่ได้ */
import {
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
  PatientStatusCard,
} from '@/components/forms/RegistrationSteps';
import { findMrPatientByHn } from '@/data/mrPatients';
import { getPatientByHN } from '@/data/patientProfiles';
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
import VitalsSignGraph from '@/components/graph/VitalsSignGraph';
import Table from '@/components/table/Table';
import QueuePatientAvatar from '@/components/patient/QueuePatientAvatar';
import ViewToggle from '@/components/toggle/ViewToggle';
import FamilyGenogram from '@/components/homevisit/FamilyGenogram';
import Popup from '@/components/popup/Popup';
import {
  HOMEVISIT_TIME_SLOTS,
  HOMEVISIT_SUPPLY_SETS,
  DIAPER_SIZES,
  describeSupplyNeed,
  HOMEVISIT_CENTER,
  HOMEVISIT_CENTER_LOCATION,
  VITAL_FIELDS,
  BARTHEL_ITEMS,
  BARTHEL_MAX_SCORE,
  CAREGIVER_OPTIONS,
  SCREEN_2Q_QUESTIONS,
  PAIN_SCALE,
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
import {
  getVisitHistory, appendVisitHistory, saveFamilyMembers, getFamilyMembers, getHouseholdProfile,
  familyMemberAvatar,
} from '@/data/homevisitRegistry';
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
/* มุมมองของแฟ้มครอบครัว — ผังเครือญาติ / ตาราง (มติผู้ใช้ 2 ก.ย. 69) */
const FAMILY_VIEW_OPTIONS = [
  { value: 'map', icon: 'account_tree', label: 'มุมมองผังเครือญาติ' },
  { value: 'table', icon: 'table_rows', label: 'มุมมองตาราง' },
];

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
export const HomeVisitStep1Service = ({ form, setForm, readOnly, hn, blockedMsg, ...props }) => {
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
          /* เชื้อชาติ · สัญชาติ วางเหนือแถวเลขบัตรประชาชน (มติผู้ใช้ 30 ส.ค. 69)
             — ฟอร์มกระดาษ ศบส. เก็บไว้ในส่วนข้อมูลประชากร ระบบนี้ย้ายมาอยู่กับ
             ข้อมูลส่วนตัว เก็บที่คีย์เดิมของแบบคัดกรอง (`homeScreening.*`)
             · "ศาสนา" ถูกถอดออก (มติผู้ใช้ 2 ก.ย. 69) เพราะซ้ำกับช่องศาสนาของ
             การ์ด "ข้อมูลส่วนตัว" ที่อยู่ในขั้นเดียวกัน (`form.religion`) */
          beforeIdRow={(
            <FieldGrid cols={3} rowGap='var(--dim-space-600)' columnGap='var(--dim-space-600)'>
              {[
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


      {/* Family Folder ย้ายมาอยู่ในขั้นนี้ (มติผู้ใช้ 2 ก.ย. 69) — แฟ้มครอบครัว
          เป็นข้อมูลระดับครัวเรือนที่อ่านคู่กับข้อมูลตัวผู้รับบริการ ไม่ใช่ขั้นตอน
          ท้ายสุดของการเยี่ยม · คอมโพเนนต์เดิมยกมาทั้งก้อน ไม่ได้เขียนใหม่ */}
      <HomeVisitStep7Family {...props} form={form} setForm={setForm} readOnly={readOnly} hn={hn} blockedMsg='' />
    </StepCard>
  );
};

/* รูปถ่ายบ้าน (หน้าบ้าน + เลขที่บ้าน) — อยู่คู่กับบันทึกการเดินทางในขั้นที่อยู่
   (มติผู้ใช้ 2 ก.ย. 69) เก็บที่ `form.housePhotos` แยกจากรูปประกอบการประเมิน
   เพราะเป็นหลักฐานของ "บ้านหลังนี้" ไม่ใช่ของการเยี่ยมครั้งใดครั้งหนึ่ง */
/* กล่องถ่ายรูปบ้าน 5 ช่องคงที่ (มติผู้ใช้ 2 ก.ย. 69) — สองช่องแรกเป็นรูปที่
   ต้องมีเสมอและมีคำกำกับว่าถ่ายอะไร (บริเวณรอบบ้าน แล้วป้ายเลขที่บ้าน)
   ช่องที่ 3–5 ถ่ายเพิ่มได้ตามสถานการณ์ ไม่บังคับ
   เก็บใน `form.housePhotos` โดยยึดตำแหน่ง index ตรงกับช่อง */
const HOUSE_PHOTO_SLOTS = [
  { key: 'around', title: 'ถ่ายรูปที่ 1', caption: 'บริเวณรอบบ้าน', required: true },
  { key: 'houseNo', title: 'ถ่ายรูปที่ 2', caption: 'ติดบ้านเลขที่', required: true },
  { key: 'extra3', title: 'ถ่ายภาพที่ 3' },
  { key: 'extra4', title: 'ถ่ายภาพที่ 4' },
  { key: 'extra5', title: 'ถ่ายภาพที่ 5' },
];

export const HOMEVISIT_HOUSE_PHOTO_LIMIT = HOUSE_PHOTO_SLOTS.length;

/* กรอบรูปบ้านเป็นสัดส่วน 4:3 (มติผู้ใช้ 2 ก.ย. 69) — ตรงกับภาพที่ได้จากกล้อง
   มือถือแนวนอน ไม่ต้องครอบตัดจนเลขที่บ้านหาย */
const HOUSE_PHOTO_W = 192;
const HOUSE_PHOTO_H = 144;

const readAsDataUrl = (file, done) => {
  if (typeof FileReader === 'undefined') { done(''); return; }
  const reader = new FileReader();
  reader.onload = () => done(String(reader.result || ''));
  reader.onerror = () => done('');
  reader.readAsDataURL(file);
};

const houseSlotCaption = (slot) => [slot.title, slot.caption].filter(Boolean).join(' · ');

const HouseThumb = ({ photo, caption, onRemove, readOnly }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
    <div className='relative shrink-0'>
      <img
        src={photo.previewUrl}
        alt={`${caption} — ${photo.name || ''}`.trim()}
        style={{
          width: HOUSE_PHOTO_W,
          height: HOUSE_PHOTO_H,
          objectFit: 'cover',
          borderRadius: 'var(--dim-radius-300, 10px)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
          display: 'block',
        }}
      />
      {!readOnly && (
        <span style={{ position: 'absolute', top: 'var(--dim-space-100, 4px)', right: 'var(--dim-space-100, 4px)' }}>
          <NeutralIconButton
            icon='close'
            variant='ghost'
            size='sm'
            aria-label={`ลบรูป ${caption}`}
            onClick={onRemove}
          />
        </span>
      )}
    </div>
    <span style={{
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs)',
      color: 'var(--text-content-tertiary, #858C92)',
      maxWidth: HOUSE_PHOTO_W,
    }}>
      {caption}
    </span>
  </div>
);

const HomeVisitHousePhotoField = ({ form, setForm, readOnly }) => {
  const photos = form.housePhotos || [];

  /* ทุกช่องผูกกับตำแหน่งคงที่ — ถ่ายทับได้โดยไม่กระทบรูปช่องอื่น */
  const setSlot = (index, entry) => setForm((f) => {
    const next = [...(f.housePhotos || [])];
    while (next.length < HOUSE_PHOTO_SLOTS.length) next.push(null);
    next[index] = entry;
    return { ...f, housePhotos: next };
  });

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      <span style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        color: 'var(--text-content-default, #363B3F)',
      }}>
        รูปถ่ายบ้าน (หน้าบ้าน + เลขที่บ้าน)
        <span style={{ color: 'var(--text-input-require)' }}> *</span>
      </span>
      <span style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-tertiary, #858C92)',
      }}>
        บังคับสองรูปแรก (บริเวณรอบบ้าน · ป้ายเลขที่บ้าน) — รูปที่ 3–5 ถ่ายเพิ่มได้ตามสถานการณ์
      </span>
      <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        {HOUSE_PHOTO_SLOTS.map((slot, index) => {
          const photo = photos[index];
          if (photo && photo.previewUrl) {
            return (
              <HouseThumb
                key={slot.key}
                photo={photo}
                caption={houseSlotCaption(slot)}
                readOnly={readOnly}
                onRemove={() => setSlot(index, null)}
              />
            );
          }
          return (
            <PhotoUploadField
              key={slot.key}
              icon={slot.caption ? 'photo_camera' : 'add_a_photo'}
              capture='environment'
              disabled={readOnly}
              style={{ width: HOUSE_PHOTO_W, height: HOUSE_PHOTO_H }}
              aria-label={houseSlotCaption(slot)}
              label={(
                /* ชื่อรูปขึ้นบรรทัดใหม่จากคำว่า "ถ่ายรูปที่ N" (มติผู้ใช้ 2 ก.ย. 69) */
                <>
                  {slot.title}
                  {slot.required && <span style={{ color: 'var(--text-input-require)' }}> *</span>}
                  {slot.caption && <><br />{slot.caption}</>}
                </>
              )}
              onFiles={(files) => {
                const file = files[0];
                if (!file) return;
                readAsDataUrl(file, (previewUrl) => setSlot(index, {
                  id: `hv-house-${slot.key}-${Date.now()}`,
                  name: file.name,
                  previewUrl,
                }));
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

/* ── Step 3 — ที่อยู่และการติดต่อ ──────────────────────────────────
   หน้าตาเหมือนขั้น "ที่อยู่" ของหน้าเวชระเบียนทุกอย่าง (ใช้คอมโพเนนต์ตัวเดียวกัน)
   ต่างแค่ต่อท้ายด้วยตำแหน่งบ้าน/เวลาถึงบ้าน และบันทึกการเดินทาง
   (มติผู้ใช้ 30 ส.ค. 69) · รวมขั้น "ข้อมูลการติดต่อ" เข้ามาต่อท้ายในขั้นเดียวกัน
   (มติผู้ใช้ 2 ก.ย. 69) — ที่อยู่กับเบอร์ติดต่อเป็นชุดข้อมูลเดียวกันของบ้านหลังนั้น */
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
        /* บันทึกการเดินทาง ↔ รูปถ่ายบ้าน ห่างกัน 24px (มติผู้ใช้ 2 ก.ย. 69) */
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
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

        {/* รูปถ่ายบ้าน — อยู่ใต้บันทึกการเดินทาง (มติผู้ใช้ 2 ก.ย. 69)
            "หน้าบ้าน + เลขที่บ้าน" คือหลักฐานว่าไปถึงบ้านถูกหลัง คู่กับหมุด
            ที่บันทึกไว้ด้านบน · เก็บแยกจากรูปประกอบการประเมิน (`form.photos`) */}
        <HomeVisitHousePhotoField form={form} setForm={setForm} readOnly={readOnly} />
        </div>
        )}
      />

      {/* ถอดหมวด "การเดินทางและเวลาถึงบ้าน" ออกทั้งก้อน (มติผู้ใช้ 30 ส.ค. 69)
          — หลังถอดแผนที่ซ้ำออก เหลือแค่บรรทัดที่อยู่กับปุ่มเดียวลอย ๆ
          ⚠️ ผลข้างเคียง: หน้าจอไม่มีทางบันทึก "เวลาถึงบ้าน" (GPS check-in ตาม
          ToR §1.18.8/.9) อีกแล้ว — `saveArrivalCheckIn` / `form.arrivalTime`
          ยังอยู่ในโมเดลและใน `homevisitVisits.js` ครบ ถ้าจะเอากลับมาให้ย้าย
          ปุ่มไปไว้ในการ์ด "ที่อยู่ปัจจุบัน" คู่กับแผนที่ ไม่ใช่สร้างหมวดใหม่ */}

      {/* ข้อมูลการติดต่อ — ยกขั้นเดียวกันของหน้าเวชระเบียนมาทั้งก้อน
          (มติผู้ใช้ 2 ก.ย. 69 — เดิมเป็นขั้นที่ 4 แยกต่างหาก) */}
      <RegistrationContactStep form={form} setForm={setForm} />

    </StepCard>
  );
};

/* ── Step 2 — ประวัติ ─────────────────────────────────────────────── */

/* ── Step 6 — ประวัติการแพ้ / โรคประจำตัว ─────────────────────────
   แยกออกมาเป็นขั้นของตัวเองต่อจากสัญญาณชีพ (มติผู้ใช้ 30 ส.ค. 69) — เป็นชุด
   ข้อมูลระดับผู้ป่วยที่ต้องอ่าน/แก้ก่อนลงมือประเมินอาการ ไม่ใช่ส่วนหนึ่งของ
   การซักอาการครั้งนี้.

   เดิมยกขั้น "หมายเหตุและ Flag" ของหน้าเวชระเบียนมาทั้งก้อน (แถบประเภท VIP ·
   แพ้ยา · แพ้อาหาร · แพ้สารเคมี · โรคประจำตัว · ความปลอดภัย · DNR · บริจาค
   อวัยวะ) — ถอดออกทั้งชุด (มติผู้ใช้ 2 ก.ย. 69): ที่บ้านผู้รับบริการเล่าเป็น
   คำพูด ทีมจึงติ๊กว่ามี/ไม่มี แล้วพิมพ์หรือ "พูด" ใส่ VoiceTextarea เอา
   เร็วกว่าไล่จำแนกประเภทให้ตรงช่อง · คีย์ของทะเบียน (`drugAllergies` ฯลฯ)
   ยังอยู่ในโมเดลและยังเป็นตัวจริงที่ห้องบัตร ไม่ได้ถูกลบ */
export const HomeVisitStepAllergy = ({ form, setForm, readOnly, blockedMsg }) => {
  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setFlag = (key) => (checked) => setForm((f) => ({
    ...f, flags: { ...f.flags, [key]: checked },
  }));

  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      <SectionCard icon='flag' title='ประวัติการแพ้ · โรคประจำตัว'>
        <StepSection gap='var(--dim-space-400, 16px)'>
          <Checkbox
            label='มีประวัติการแพ้ยา / แพ้อาหาร / แพ้สารเคมี'
            checked={!!form.flags?.allergyDrug}
            onChange={setFlag('allergyDrug')}
            disabled={readOnly}
          />
          {form.flags?.allergyDrug && (
            <VoiceTextarea
              label='รายละเอียดการแพ้'
              value={form.allergyFreeText || ''}
              onChange={setField('allergyFreeText')}
              disabled={readOnly}
              placeholder='สิ่งที่แพ้ อาการที่เกิด และสิ่งที่ทีมต้องระวัง เช่น แพ้ Penicillin ผื่นลมพิษทั้งตัว'
              helperText='พิมพ์หรือกดไมโครโฟนเพื่อพูดแทนการพิมพ์ได้'
              style={{ width: '100%', maxWidth: 'none' }}
            />
          )}

          <Checkbox
            label='มีโรคประจำตัว'
            checked={!!form.flags?.chronic}
            onChange={setFlag('chronic')}
            disabled={readOnly}
          />
          {form.flags?.chronic && (
            <VoiceTextarea
              label='รายละเอียดโรคประจำตัว'
              value={form.chronicFreeText || ''}
              onChange={setField('chronicFreeText')}
              disabled={readOnly}
              placeholder='โรคที่เป็น ระยะเวลา และการรักษาที่ได้รับ เช่น เบาหวานชนิดที่ 2 มา 10 ปี ฉีดอินซูลินเช้า-เย็น'
              helperText='พิมพ์หรือกดไมโครโฟนเพื่อพูดแทนการพิมพ์ได้'
              style={{ width: '100%', maxWidth: 'none' }}
            />
          )}

          <VoiceTextarea
            label='หมายเหตุเพิ่มเติม'
            value={form.allergyNote || ''}
            onChange={setField('allergyNote')}
            disabled={readOnly}
            placeholder='ข้อควรระวังอื่นที่ทีมครั้งถัดไปควรรู้ (ไม่บังคับ)'
            helperText='ไม่บังคับกรอก — กดไมโครโฟนเพื่อพูดแทนการพิมพ์ได้'
            style={{ width: '100%', maxWidth: 'none' }}
          />
        </StepSection>
      </SectionCard>
    </StepCard>
  );
};

/* ── ปรึกษาแพทย์ทางไกล (Telemedicine · TOR 1.18.10) ────────────────
   ย้ายมาอยู่ในขั้น "ประเมินอาการป่วย" (มติผู้ใช้ 30 ส.ค. 69) — ทีมตัดสินใจว่า
   ต้องปรึกษาแพทย์ตอนที่กำลังประเมินอาการอยู่ ไม่ใช่ตอนพิมพ์บันทึกตามบทบาท
   ซึ่งเป็นขั้นหลังจากนั้น · แยกเป็นคอมโพเนนต์เพราะถือ state ป๊อปอัปของตัวเอง */
export const HomeVisitTelemedSection = ({ form, setForm, readOnly, visitId, hn, appointment }) => {
  const { start: startTelemedCall } = useTelemedCall();
  const [telemedOpen, setTelemedOpen] = useState(false);

  const launchTelemed = () => {
    /* เปิด "ห้องตรวจรักษาออนไลน์" เป็นป๊อปอัปทับหน้าเดิม (มติผู้ใช้ 2 ก.ย. 69) —
       เดิม push ไป /telemed/worklist ซึ่ง unmount หน้าเยี่ยมบ้านทิ้ง จึงยัง
       บันทึกร่างไว้ก่อนเปิดสายเหมือนเดิม (ผู้ใช้ปิดสายแล้วกลับมาทำต่อได้ทันที)
       stepIndex 5 = ขั้น "ประเมินอาการป่วย" ซึ่งเป็นที่อยู่ของปุ่มนี้
       (เลื่อนมาจาก 6 ตอนยุบสัญญาณชีพ+ประวัติการแพ้เป็นขั้น "คัดกรอง") */
    saveHomeVisitDraft(visitId, { ...form, telemedRequested: true }, 5);
    setForm((f) => ({ ...f, telemedRequested: true }));
    setTelemedOpen(false);
    startTelemedCall({ visitId });
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
            เปิดห้องปรึกษาของระบบ Telemedicine เป็นป๊อปอัปทับหน้านี้ พร้อมส่งบริบทผู้รับบริการไปด้วย
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
        primaryAction={{ label: 'เปิดห้องตรวจรักษาออนไลน์', onClick: launchTelemed }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
            ระบบจะเปิดห้องตรวจรักษาออนไลน์ทับหน้านี้ พร้อมบริบทผู้รับบริการรายนี้
            — เมื่อสนทนาเสร็จ ปิดห้องแล้วบันทึกผลการปรึกษาในช่อง “บันทึกแพทย์” ของขั้นตอนนี้ได้ทันที
          </span>
          <NoticeBand tone='neutral' icon='info'>
            แบบร่างการเยี่ยมจะถูกบันทึกอัตโนมัติก่อนเปิดห้อง — หน้าที่กรอกค้างไว้ยังอยู่หลังป๊อปอัป
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
  /* เปิดตัวเลือกไฟล์/กล้องของแถวยา — สร้าง input ชั่วคราวแทนการถือ ref ราย
     แถว (มติผู้ใช้ 2 ก.ย. 69) */
  const pickMedicationPhoto = (id) => {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) readAsDataUrl(file, (url) => updateMedication(id, 'photoUrl', url));
    };
    input.click();
  };

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
        {/* ถอดช่อง "อาการสำคัญ (Chief Complaint)" ออก แล้วให้ "ประวัติปัจจุบัน"
            ขึ้นเป็นช่องแรก (มติผู้ใช้ 2 ก.ย. 69) — ที่บ้านผู้รับบริการเล่าเป็น
            ลำดับเหตุการณ์ต่อเนื่อง ไม่ได้แยกเป็นประโยคอาการสำคัญเหมือนที่ห้องตรวจ
            · คีย์ `chiefComplaint` ยังอยู่ในโมเดลและในบันทึกเก่า/ใบสรุป */}
        <FieldGrid cols={2} rowGap='var(--dim-space-600)' columnGap='var(--dim-space-600)'>
          <Field label='ประวัติปัจจุบัน (Present Illness)' required>
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
        </FieldGrid>

        {/* ผู้ดูแลหลัก · ภาวะโภชนาการ · แผลกดทับ ย้ายมาอยู่ในการ์ดอาการป่วย
            (มติผู้ใช้ 2 ก.ย. 69) — เป็นบริบทที่ทีมอ่านคู่กับอาการที่พบ ไม่ใช่
            หมวดของตัวเอง · หัวข้อ "คัดกรองสุขภาพรายบุคคล" ถูกถอดออกด้วย */}
        {/* ระยะระหว่างช่อง 24px เท่ากับแถวอื่นในการ์ดนี้ (มติผู้ใช้ 2 ก.ย. 69) */}
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-600, 24px)' }}>
          <Field label='ผู้ดูแลหลัก'>
            <Select
              showLabel={false} showHelperText={false} searchable={false} size='lg'
              value={form.caregiver} onChange={set('caregiver')} disabled={readOnly}
              options={CAREGIVER_OPTIONS}
              placeholder='เลือกลักษณะผู้ดูแล'
            />
          </Field>
          {/* ช่อง "ภาวะโภชนาการ" ถูกถอดออก (มติผู้ใช้ 2 ก.ย. 69) — ค่าที่แสดง
              เป็นผลแปลจาก MNA-SF ซึ่งอ่านได้จากการ์ดแบบประเมินด้านล่างอยู่แล้ว
              คีย์ `form.nutrition` ยังอยู่ในโมเดลและในใบสรุป */}
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
            ระดับความปวด (1 = ปวดน้อยที่สุด · 10 = ปวดมากที่สุด)
          </span>
          {/* ปุ่มชุดเดียวกับจุดคัดกรอง — ไอคอนหน้าคนนำหน้าตัวเลข 10 ระดับ
              (มติผู้ใช้ 2 ก.ย. 69) */}
          <PainScaleCards
            value={form.painScore}
            onChange={(n) => set('painScore')(n)}
            disabled={readOnly}
          />
          {Number.isFinite(form.painScore) && form.painScore >= 7 && (
            <NoticeBand tone='danger' icon='priority_high'>
              ความปวดระดับรุนแรง ({form.painScore}/10) — ควรทบทวนแผนจัดการความปวดและพิจารณาปรึกษาแพทย์ทางไกล
            </NoticeBand>
          )}
        </div>

        {/* รูปถ่ายอยู่ในการ์ดอาการป่วย (มติผู้ใช้ 2 ก.ย. 69) — รูปแผล/สภาพแวดล้อม
            เป็นหลักฐานของสิ่งที่บันทึกในการ์ดนี้ ไม่ใช่การ์ดแยกท้ายขั้น */}
        <HomeVisitPhotoSection form={form} setForm={setForm} readOnly={readOnly} />

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
                {/* รูปยาแต่ละรายการ (มติผู้ใช้ 2 ก.ย. 69) — ที่บ้านมักหยิบซองยา
                    มาให้ดูโดยไม่รู้ชื่อ ถ่ายเก็บไว้คู่กับแถวนั้นจะทวนทีหลังได้ */}
                <Field label='รูปยา'>
                  {m.photoUrl ? (
                    <div className='relative' style={{ width: 96, height: 72 }}>
                      <img
                        src={m.photoUrl}
                        alt={`รูปยา ${m.nameOther || m.name || ''}`.trim()}
                        style={{
                          width: 96,
                          height: 72,
                          objectFit: 'cover',
                          borderRadius: 'var(--dim-radius-300, 10px)',
                          border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
                          display: 'block',
                        }}
                      />
                      {!readOnly && (
                        <span style={{ position: 'absolute', top: 'var(--dim-space-50, 2px)', right: 'var(--dim-space-50, 2px)' }}>
                          <NeutralIconButton
                            icon='close'
                            variant='ghost'
                            size='sm'
                            aria-label='ลบรูปยา'
                            onClick={() => updateMedication(m.id, 'photoUrl', '')}
                          />
                        </span>
                      )}
                    </div>
                  ) : (
                    /* ปุ่มแทนกล่องอัปโหลด (มติผู้ใช้ 2 ก.ย. 69) — แถวยาแคบ กล่อง
                       96×72 ดันความสูงของทั้งแถว · size md สูง 40px เท่ากับ
                       Select size lg ที่อยู่ข้างกัน (--dim-size-800) ปุ่มกับช่อง
                       เลือกจึงอยู่ระดับเดียวกัน (มติผู้ใช้ 2 ก.ย. 69) */
                    <NeutralSubdueButton
                      size='md'
                      leadingIcon='photo_camera'
                      disabled={readOnly}
                      onClick={() => pickMedicationPhoto(m.id)}
                    >
                      เพิ่มรูปยา
                    </NeutralSubdueButton>
                  )}
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

      {/* ความต้องการ/สิ่งที่ควรได้รับ — ชุดผ้าอ้อม/แผ่นรองซับตามแบบฟอร์มกระดาษ
          ของ ศบส. (มติผู้ใช้ 2 ก.ย. 69) เลือกได้ชุดเดียวเพราะเบิกได้วันละหนึ่งชุด */}
      <SectionCard icon='clipboard-list' title='มีความต้องการ / ควรได้รับ'>
        <StepSection gap='var(--dim-space-400, 16px)'>
          {/* ดรอปดาวน์แทนแถวการ์ด (มติผู้ใช้ 2 ก.ย. 69) — หกตัวเลือกที่ข้อความยาว
              กินพื้นที่สองแถวเต็มโดยที่เลือกได้ชุดเดียวอยู่ดี */}
          <Field label='ชุดที่ควรได้รับ'>
            <Select
              showLabel={false} showHelperText={false} searchable={false} size='lg'
              value={form.supplyNeedSet}
              onChange={set('supplyNeedSet')}
              disabled={readOnly}
              options={HOMEVISIT_SUPPLY_SETS.map((opt) => ({
                value: opt.value,
                label: [opt.label, opt.detail, opt.price].filter(Boolean).join(' — '),
              }))}
              placeholder='เลือกชุดที่ควรได้รับ'
            />
          </Field>

          {form.supplyNeedSet === 'other' && (
            <Field label='ระบุความต้องการ'>
              <InputField
                showLabel={false} showHelperText={false}
                value={form.supplyNeedOther || ''}
                onChange={set('supplyNeedOther')}
                disabled={readOnly}
                placeholder='เช่น แผ่นรองซับขนาดใหญ่ · ถุงมือยาง · สำลี/ผ้าก๊อซทำแผล'
              />
            </Field>
          )}

          {/* ไซซ์ถามเฉพาะชุดที่มีผ้าอ้อมผู้ใหญ่ */}
          {['A', 'C', 'D', 'E'].includes(form.supplyNeedSet) && (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                ไซซ์ผ้าอ้อมผู้ใหญ่
              </span>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                {DIAPER_SIZES.map((size) => (
                  <SelectableCardButton
                    key={size}
                    selected={form.diaperSize === size}
                    onClick={readOnly ? undefined : () => set('diaperSize')(form.diaperSize === size ? '' : size)}
                    ariaLabel={`ไซซ์ ${size}`}
                    padX='var(--dim-space-400, 16px)'
                  >
                    {size}
                  </SelectableCardButton>
                ))}
              </div>
            </div>
          )}
        </StepSection>
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
        {/* กราฟแนวโน้มอยู่เหนือตาราง (มติผู้ใช้ 2 ก.ย. 69) — ตัวเลขรายรอบอ่าน
            ความเปลี่ยนแปลงข้ามครั้งได้ยาก ใช้กราฟชุดเดียวกับหน้าสัญญาณชีพอื่น */}
        <div className='w-full' style={{ marginBottom: 'var(--dim-space-500, 20px)' }}>
          <VitalsSignGraph />
        </div>

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

/* ── Step 4 — สิทธิการรักษา ────────────────────────────────────────
   ยกขั้นเดียวกันของหน้าเวชระเบียนมาทั้งก้อนแบบเดียวกับที่อยู่/ข้อมูลส่วนตัว
   (มติผู้ใช้ 30 ส.ค. 69) — ทีมเยี่ยมบ้านเป็นคนที่เห็นบัตรสิทธิที่บ้าน จึงควร
   แก้ได้ตรงนั้นด้วยหน้าตาเดียวกับห้องบัตร · ขั้น "ข้อมูลการติดต่อ" ถูกยุบเข้า
   ขั้นที่อยู่แล้ว (มติผู้ใช้ 2 ก.ย. 69) */
export const HomeVisitStepRights = ({ form, setForm, blockedMsg }) => {
  /* ที่บ้านตรวจสอบสิทธิออนไลน์ไม่ได้ทุกครั้ง และผู้รับบริการอยู่ในทะเบียนเยี่ยมบ้าน
     อยู่แล้ว — ขั้นนี้จึงกางรายการสิทธิให้เลย ไม่ต้องกด "ตรวจสอบสิทธิ" ก่อน
     (มติผู้ใช้ 2 ก.ย. 69) · ยังกดตรวจสอบซ้ำได้จากแผงด้านบนของผลลัพธ์ */
  useEffect(() => {
    if (form.rightsLookupDone) return;
    setForm((f) => (f.rightsLookupDone ? f : {
      ...f,
      rightsLookupDone: true,
      rightsGroups: (f.rightsGroups || []).length ? f.rightsGroups : buildMockRightsGroups(),
    }));
  }, [form.rightsLookupDone, setForm]);

  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}
      <RegistrationRightsStep form={form} setForm={setForm} />
    </StepCard>
  );
};

/* ── Step 8 — พฤติกรรมสุขภาพ ───────────────────────────────────── */
export const HomeVisitStepBehaviour = ({ form, setForm, readOnly, hn, blockedMsg }) => (
  /* การ์ดขาวใบเดียวของทั้งขั้น (มติผู้ใช้ 30 ส.ค. 69) — แถวสูบบุหรี่/แอลกอฮอล์/
     ออกกำลังกายของจุดคัดกรอง กับความเสี่ยงจากฟอร์มกระดาษ ศบส. เป็นเรื่องเดียวกัน
     ทั้งหมด แยกเป็นสองการ์ดทำให้อ่านเหมือนคนละหัวข้อ · `ScreeningStep4` ไม่มี
     พื้นหลังการ์ดของตัวเอง จึงต้องห่อให้ */
  <StepCard>
    {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}
    <SectionCard>
      {/* ช่อง "รายละเอียดพฤติกรรมเพิ่มเติม" ต้องอยู่ล่างสุดของการ์ด (มติผู้ใช้
          2 ก.ย. 69) — ส่งความเสี่ยง/การปฏิบัติตัวเข้าไปเป็น slot ก่อนช่องนั้น
          แทนการวางต่อท้าย `ScreeningStep4` (state ของช่องอยู่ในคอมโพเนนต์นั้น) */}
      <ScreeningStep4
        patient={{ hn }}
        padded={false}
        beforeDetailSlot={(
          <>
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
          </>
        )}
      />
    </SectionCard>
  </StepCard>
);

/* รูปถ่ายระหว่างการเยี่ยม — อยู่ในขั้น "ประเมิน" (มติผู้ใช้ 30 ส.ค. 69)
   รูปเป็นหลักฐานประกอบ *การประเมิน* (แผล สภาพแวดล้อม อุปกรณ์) จึงต้องอยู่ที่
   เดียวกับที่ทีมกำลังตัดสินใจ ไม่ใช่ขั้นข้อมูลส่วนตัวซึ่งเป็นเรื่องตัวตนผู้ป่วย.
   แยกเป็นคอมโพเนนต์เพราะถือ state ป๊อปอัปดูรูปของตัวเอง. */

export const HOMEVISIT_PHOTO_LIMIT = 20;

/* รูปถ่ายระหว่างการเยี่ยม — 5 ช่องคงที่ ทรงเดียวกับรูปถ่ายบ้าน (มติผู้ใช้
   2 ก.ย. 69) แต่ละช่องบอกว่าต้องถ่ายอะไร ทีมจึงถ่ายชุดเดียวกันทุกครั้งและ
   เอามาเทียบข้ามรอบได้ · ไม่มีช่องไหนบังคับ (บางบ้านไม่มีแผล/ไม่มีอุปกรณ์) */
const VISIT_PHOTO_SLOTS = [
  { key: 'wound', title: 'ถ่ายภาพที่ 1', caption: 'แผล/รอยโรค' },
  { key: 'env', title: 'ถ่ายภาพที่ 2', caption: 'สภาพแวดล้อมที่เป็นความเสี่ยง' },
  { key: 'meds', title: 'ถ่ายภาพที่ 3', caption: 'ยาที่พบในบ้าน' },
  { key: 'device', title: 'ถ่ายภาพที่ 4', caption: 'อุปกรณ์การแพทย์ที่ใช้อยู่' },
  { key: 'other', title: 'ถ่ายภาพที่ 5', caption: 'ภาพเพิ่มเติม' },
];

export const HomeVisitPhotoSection = ({ form, setForm, readOnly }) => {
  const [photoPreview, setPhotoPreview] = useState(null);
  const photos = form.photos || [];

  const setSlot = (index, entry) => setForm((f) => {
    const next = [...(f.photos || [])];
    while (next.length < VISIT_PHOTO_SLOTS.length) next.push(null);
    next[index] = entry;
    return { ...f, photos: next };
  });

  return (
    <StepSection>
      {/* หัวข้อใช้สไตล์เดียวกับป้าย "ระดับความปวด …" ที่อยู่เหนือมัน
          (มติผู้ใช้ 2 ก.ย. 69) — เป็นช่องหนึ่งของการ์ดอาการป่วย ไม่ใช่หัวข้อใหญ่ */}
      <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
        รูปถ่ายระหว่างการเยี่ยม
      </span>
      <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
        ขอความยินยอมจากผู้รับบริการหรือผู้ดูแลก่อนถ่ายทุกครั้ง และไม่ถ่ายใบหน้าคนอื่นในบ้านที่ไม่ใช่ผู้รับบริการ
      </span>

      <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        {VISIT_PHOTO_SLOTS.map((slot, index) => {
          const entry = photos[index];
          if (entry && entry.previewUrl) {
            return (
              <div key={slot.key} className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                <div className='relative shrink-0'>
                  {/* กดที่รูปเพื่อเปิดดูขนาดเต็ม — ปุ่มลบเป็นพี่น้องกันข้างนอก
                      ไม่ใช่ปุ่มซ้อนปุ่ม (HTML ห้าม) */}
                  <button
                    type='button'
                    onClick={() => setPhotoPreview(entry)}
                    aria-label={`ดูรูป ${slot.caption} ขนาดเต็ม`}
                    title={entry.name}
                    style={{
                      width: HOUSE_PHOTO_W,
                      height: HOUSE_PHOTO_H,
                      padding: 0,
                      border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
                      borderRadius: 'var(--dim-radius-300, 10px)',
                      overflow: 'hidden',
                      background: 'var(--surface-neutral-quaternary, #F3F4F6)',
                      cursor: 'zoom-in',
                      display: 'block',
                    }}
                  >
                    <img
                      src={entry.previewUrl}
                      alt={`${slot.caption} — ${entry.name || ''}`.trim()}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </button>
                  {!readOnly && (
                    <span style={{ position: 'absolute', top: 'var(--dim-space-100, 4px)', right: 'var(--dim-space-100, 4px)' }}>
                      <NeutralIconButton
                        icon='close'
                        variant='ghost'
                        size='sm'
                        aria-label={`ลบรูป ${slot.caption}`}
                        onClick={() => setSlot(index, null)}
                      />
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: 'var(--type-size-xs)',
                  color: 'var(--text-content-tertiary, #858C92)',
                  maxWidth: HOUSE_PHOTO_W,
                }}>
                  {`${slot.title} · ${slot.caption}`}
                </span>
              </div>
            );
          }
          return (
            <PhotoUploadField
              key={slot.key}
              icon='photo_camera'
              capture='environment'
              disabled={readOnly}
              style={{ width: HOUSE_PHOTO_W, height: HOUSE_PHOTO_H }}
              aria-label={`${slot.title} ${slot.caption}`}
              label={(
                <>
                  {slot.title}
                  <br />
                  {slot.caption}
                </>
              )}
              /* อ่านเป็น data URL ไม่ใช่ blob URL — blob URL ใช้ได้เฉพาะในหน้าที่
                 เปิดอยู่ พอบันทึกร่างแล้วกลับมาเปิดใหม่ลิงก์จะตาย */
              onFiles={(files) => {
                const file = files[0];
                if (!file) return;
                readAsDataUrl(file, (previewUrl) => setSlot(index, {
                  id: `hv-photo-${slot.key}-${Date.now()}`,
                  name: file.name,
                  previewUrl,
                }));
              }}
            />
          );
        })}
      </div>

      <Popup
        open={!!photoPreview}
        onClose={() => setPhotoPreview(null)}
        size='large'
        title={photoPreview?.name || 'รูปถ่ายระหว่างการเยี่ยม'}
        primaryAction={{ label: 'ปิด', onClick: () => setPhotoPreview(null) }}
      >
        {photoPreview?.previewUrl && (
          <img
            src={photoPreview.previewUrl}
            alt={photoPreview.name}
            style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', display: 'block' }}
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
/* แบบประเมินสี่ชุดแสดงเป็นตาราง (มติผู้ใช้ 2 ก.ย. 69) — หัวข้อ/คะแนน/สถานะ/
   ปุ่มดำเนินการ อยู่ในคอลัมน์ที่ตรงกันทุกแถว ใช้ <Table> ตัวเดียวกับที่อื่น
   ในระบบ ไม่ได้จัดแถวเอง */

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

      {/* "น้ำตาลปลายนิ้ว (DTX)" ย้ายไปขั้น "คัดกรอง" แล้ว (มติผู้ใช้ 2 ก.ย. 69)
          — เจาะ DTX พร้อมวัดสัญญาณชีพตอนเพิ่งถึงบ้าน และเจาะเฉพาะรายที่เป็น
          เบาหวาน · คีย์ `dtx` / `dtxFasting` ยังอยู่ที่ `form.homeScreening` เดิม */}

      <StepSection>
        {/* แถวการ์ดต้องมีหัวข้อของตัวเอง (มติผู้ใช้ 2 ก.ย. 69) — เดิมลอยอยู่
            ใต้ช่องอื่นจนอ่านไม่ออกว่าสี่ใบนี้เป็นชุดเดียวกัน */}
        <TopicHeader icon='checklist'>แบบประเมิน</TopicHeader>

        {/* แบบประเมินมาตรฐาน 4 ชุดเป็น "การ์ด" ทรงเดียวกับใบยินยอมของหน้า
            เวชระเบียน (มติผู้ใช้ 30 ส.ค. 69) — เดิมกางเป็นฟอร์มยาวเรียงกันสี่ชุด
            ในขั้นเดียว ทำให้เลื่อนหาไม่เจอว่าเหลือชุดไหนยังไม่ได้ทำ · การ์ดบอก
            สถานะ/คะแนน/การแปลผลของแต่ละชุดในบรรทัดเดียว แล้วค่อยกดเข้าไปทำ */}
        <Table
          columns={[
            {
              key: 'tool',
              label: 'หัวข้อแบบประเมิน',
              flex: true,
              minWidth: 260,
              render: (t) => (
                <span className='flex flex-col' style={{ gap: 'var(--dim-space-50, 2px)' }}>
                  <span style={{ color: 'var(--text-content-default, #363B3F)' }}>{t.title}</span>
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    {t.code}
                  </span>
                </span>
              ),
            },
            {
              key: 'score',
              label: 'คะแนนประเมิน',
              minWidth: 140,
              render: (t) => (
                <span style={{
                  color: 'var(--text-brandPrimary-default, #007549)',
                  fontFamily: 'var(--type-family-heading-content)',
                }}>
                  {t.scoreLabel}
                </span>
              ),
            },
            {
              key: 'status',
              label: 'สถานะการประเมิน',
              minWidth: 220,
              render: (t) => (t.done && t.interp ? (
                <ColorfulBadge style={t.interp.badge} size='small' hierarchy='secondary' width='hug' maxWidth={260}>
                  {t.interp.label}
                </ColorfulBadge>
              ) : (
                <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>
                  ยังไม่ได้ประเมิน
                </ColorfulBadge>
              )),
            },
            {
              key: 'action',
              label: 'ดำเนินการ',
              minWidth: 180,
              render: (t) => (
                <BrandSubdueButton
                  variant='outline'
                  size='sm'
                  /* ปุ่มของ DS เรนเดอร์ไอคอนเป็น Material Symbols (ligature) —
                     ชื่อที่ไม่มีในฟอนต์จะโผล่เป็นตัวอักษรบนปุ่ม */
                  leadingIcon={t.done ? 'edit' : 'assignment'}
                  onClick={() => setOpenTool(t.key)}
                >
                  {readOnly ? 'ดูผลประเมิน' : (t.done ? 'แก้ไข' : 'ทำแบบประเมิน')}
                </BrandSubdueButton>
              ),
            },
          ]}
          rows={ASSESSMENT_TOOL_CARDS}
          rowKey={(t) => t.key}
        />

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
        {/* หัวข้อ "สรุปผลการประเมินการเยี่ยมบ้าน" ถูกถอดออก (มติผู้ใช้ 2 ก.ย. 69)
            — ป้ายของช่องกรอกบอกอยู่แล้วว่าเป็นสรุปผลการประเมิน */}
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

      {/* "รูปถ่ายระหว่างการเยี่ยม" แยกเป็นการ์ดของตัวเอง (มติผู้ใช้ 2 ก.ย. 69) —
          ถูกย้ายไปเรนเดอร์ที่ขั้น "ประเมินอาการป่วย" นอกการ์ดแบบประเมิน */}
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
      /* เก็บแบบบันทึกทั้งใบไว้กับประวัติ เพื่อให้เปิดย้อนดูได้ครบทุกช่อง
         (มติผู้ใช้ 2 ก.ย. 69) */
      form: { ...form },
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
  /* สลับดูแฟ้มครอบครัวเป็น "ผังเครือญาติ" หรือ "ตาราง" (มติผู้ใช้ 2 ก.ย. 69) —
     ผังอ่านโครงสร้างครัวเรือนได้เร็วกว่า ส่วนตารางไว้กวาดตาอ่านรายละเอียด */
  const [familyView, setFamilyView] = useState('map');
  /* ครัวเรือนที่ยังไม่เคยบันทึกสมาชิกได้ชุด mock คงที่ต่อ HN — ตารางจะได้ไม่ว่าง
     เปล่าทุกราย (มติผู้ใช้ 30 ส.ค. 69) กดแก้ไขแล้วบันทึกจึงกลายเป็นข้อมูลจริง */
  const familyRows = form.familyMembers.length > 0 ? form.familyMembers : getFamilyMembers(hn);

  /* ป๊อปอัปข้อมูลรายบุคคล — กดจากแถวในตารางหรือการ์ดในผังก็เปิดตัวเดียวกัน
     (มติผู้ใช้ 2 ก.ย. 69) */
  const [personDetail, setPersonDetail] = useState(null);

  /* ชื่อที่จะขึ้นบนการ์ด "ผู้รับบริการ" ของผังเครือญาติ */
  const mrPatientOfVisit = useMemo(() => (hn ? findMrPatientByHn(hn) : null), [hn]);
  const patientDisplayName = registryEntry?.name
    || appointment?.name
    || (mrPatientOfVisit
      ? `${mrPatientOfVisit.firstNameTh || ''} ${mrPatientOfVisit.lastNameTh || ''}`.trim()
      : '')
    || 'ผู้รับบริการ';

  /* ตารางต้องมีตัวผู้รับบริการอยู่ด้วย (มติผู้ใช้ 2 ก.ย. 69) — แฟ้มครอบครัวคือ
     "ทั้งครัวเรือน" ไม่ใช่เฉพาะคนอื่นในบ้าน · แถวนี้ไม่ถูกเขียนกลับทะเบียน
     (ไม่ได้อยู่ใน `form.familyMembers`) */
  const selfRow = {
    id: '__self__',
    name: patientDisplayName,
    relation: 'ผู้รับบริการ',
    age: mrPatientOfVisit?.age || '',
    health: '',
    hn,
    avatarUrl: registryEntry?.avatarUrl || appointment?.avatarUrl || mrPatientOfVisit?.avatarUrl,
    self: true,
  };
  const tableRows = [selfRow, ...familyRows];

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

  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      {/* การ์ดของตัวเอง — ตั้งแต่ย้ายมาอยู่ในขั้น "ข้อมูลส่วนตัว" (มติผู้ใช้
          2 ก.ย. 69) เนื้อหาของขั้นนั้นเป็นการ์ดขาวของตัวเองทุกก้อน */}
      <SectionCard>
      <StepSection gap='var(--dim-space-600)'>
        <TopicHeader
          icon='family_restroom'
          aside={!readOnly && (
            <BrandSubdueButton
              variant='outline' size='sm' leadingIcon='edit'
              onClick={openFamilyEdit}
            >
              แก้ไขข้อมูลสุขภาพครอบครัว
            </BrandSubdueButton>
          )}
        >
          ข้อมูลสุขภาพครอบครัว
        </TopicHeader>
        {/* แถวหัวแฟ้ม (ที่อยู่ครัวเรือน · ชุมชน · เขต · ผู้ติดต่อ) ถูกถอดออก
            (มติผู้ใช้ 2 ก.ย. 69) — ข้อมูลชุดนี้อยู่ที่ขั้น "ที่อยู่และการติดต่อ"
            อยู่แล้ว แฟ้มครอบครัวจึงเหลือเฉพาะสมาชิกในครัวเรือน
            (`getHouseholdProfile` ยังใช้ที่ใบสรุปพิมพ์) */}

        {/* สลับมุมมองอยู่เหนือผัง/ตารางที่มันควบคุม (มติผู้ใช้ 2 ก.ย. 69) —
            บนหัวข้อมันปนกับปุ่มแก้ไขจนอ่านไม่ออกว่าคุมอะไร */}
        <div className='flex items-center justify-end w-full'>
          <ViewToggle
            value={familyView}
            onChange={setFamilyView}
            options={FAMILY_VIEW_OPTIONS}
            aria-label='สลับมุมมองแฟ้มครอบครัว'
          />
        </div>

        {familyView === 'map' ? (
          <FamilyGenogram
            members={familyRows}
            /* ชื่อผู้รับบริการต้องขึ้นในผังเสมอ (มติผู้ใช้ 2 ก.ย. 69) — เคสที่เปิด
               บันทึกแบบ ad-hoc ไม่มี registryEntry/appointment จึงตกไปอ่านจาก
               ทะเบียนกลางด้วย HN */
            patientName={patientDisplayName}
            patientHn={hn}
            /* รูปเดียวกับหัวแฟ้มผู้รับบริการด้านบน (มติผู้ใช้ 2 ก.ย. 69) — หัวแฟ้มอ่าน
       จาก `getPatientByHN` ถ้าผังไปหยิบรูปจากทะเบียนอื่นจะกลายเป็นคนละคน */
    patientAvatarUrl={getPatientByHN(hn)?.avatarUrl
      || registryEntry?.avatarUrl
      || appointment?.avatarUrl
      || mrPatientOfVisit?.avatarUrl}
            onSelect={(person) => setPersonDetail(person)}
            selfRow={selfRow}
          />
        ) : (
        <Table
          columns={[
            {
              key: 'name',
              label: 'ชื่อ-สกุล',
              flex: true,
              minWidth: 260,
              /* รูปประจำตัวคู่ชื่อเหมือนตารางคิวอื่นในระบบ (มติผู้ใช้ 2 ก.ย. 69) */
              render: (r) => (
                <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <QueuePatientAvatar name={r.name} avatarUrl={r.self ? r.avatarUrl : familyMemberAvatar(r)} size={32} />
                  <span>{r.name || '—'}</span>
                </span>
              ),
            },
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
          rows={tableRows}
          rowKey={(r) => r.id}
          onRowClick={(r) => setPersonDetail(r)}
          emptyMessage='ยังไม่มีข้อมูลสมาชิกในครอบครัวในทะเบียนของครัวเรือนนี้'
        />
        )}

      </StepSection>
      </SectionCard>

      {/* ข้อมูลรายบุคคลของสมาชิกในครัวเรือน — เปิดจากแถวในตารางหรือการ์ดในผัง */}
      <Popup
        open={!!personDetail}
        onClose={() => setPersonDetail(null)}
        size='small'
        title={personDetail?.name || 'ข้อมูลสมาชิกในครอบครัว'}
        subtitle={personDetail?.self ? 'ผู้รับบริการของการเยี่ยมครั้งนี้' : 'สมาชิกในครัวเรือนเดียวกัน'}
        primaryAction={{ label: 'ปิด', onClick: () => setPersonDetail(null) }}
      >
        <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <QueuePatientAvatar
            name={personDetail?.name}
            avatarUrl={personDetail?.self ? personDetail?.avatarUrl : (personDetail ? familyMemberAvatar(personDetail) : undefined)}
            size={56}
          />
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {[
              ['ความสัมพันธ์', personDetail?.relation],
              ['อายุ', personDetail?.age ? `${personDetail.age} ปี` : ''],
              ['ภาวะสุขภาพ', FAMILY_HEALTH_OPTIONS.find((o) => o.value === personDetail?.health)?.label || personDetail?.health],
              ['HN', personDetail?.hn],
            ].filter(([, value]) => String(value || '').trim()).map(([label, value]) => (
              <div key={label} className='flex items-baseline' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)', minWidth: 96 }}>
                  {label}
                </span>
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Popup>

      {/* แก้ไขในป๊อปอัป — บันทึกแล้วเขียนกลับทะเบียนระดับครัวเรือนทันที
          ครั้งถัดไปที่เยี่ยมบ้านหลังนี้จึงเห็นรายชื่อชุดใหม่ */}
      <Popup
        open={familyEditOpen}
        onClose={() => setFamilyEditOpen(false)}
        size='extraLarge'
        title='แก้ไขข้อมูลสุขภาพครอบครัว'
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setFamilyEditOpen(false) }}
        primaryAction={{ label: 'บันทึกข้อมูลสุขภาพครอบครัว', onClick: saveFamily }}
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
            label='บันทึกข้อมูลสุขภาพครอบครัว'
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

/* ── Step 5 — คัดกรอง (สัญญาณชีพ · ประวัติการแพ้/โรคประจำตัว · พฤติกรรมสุขภาพ) ─
   สองขั้นนี้คือ "สิ่งที่ทีมทำทันทีที่ถึงบ้าน ก่อนเริ่มซักอาการ" จึงยุบเป็นขั้นเดียว
   (มติผู้ใช้ 2 ก.ย. 69) — คอมโพเนนต์เดิมทั้งสองตัวยังอยู่ครบ ขั้นนี้แค่วางต่อกัน
   ไม่ได้คัดลอกเนื้อหามาเขียนใหม่ */
/* น้ำตาลปลายนิ้ว (DTX) ในขั้นคัดกรอง — ถามก่อนว่าเป็นเบาหวานหรือไม่
   (มติผู้ใช้ 2 ก.ย. 69) ทีมเยี่ยมบ้านเจาะ DTX เฉพาะรายที่เป็นเบาหวาน
   ช่องกรอกจึงไม่ควรค้างอยู่บนจอของทุกคน · ธง `dtxDiabetic` เก็บใน
   `form.homeScreening` ก้อนเดียวกับค่าที่เจาะได้ */
export const HomeVisitDtxCard = ({ form, setForm, readOnly }) => {
  const screening = form.homeScreening || {};
  const setScreening = (next) => setForm((f) => ({ ...f, homeScreening: next }));
  /* ร่างเก่าที่กรอก DTX ไว้ก่อนมีธงนี้ ต้องเปิดการ์ดค้างไว้ให้เห็นค่าที่บันทึกแล้ว */
  const diabetic = screening.dtxDiabetic ?? !!String(screening.dtx || '').trim();

  return (
    <SectionCard icon='bloodtype' title='น้ำตาลปลายนิ้ว (DTX)'>
      <StepSection gap='var(--dim-space-400, 16px)'>
        <Checkbox
          label='เป็นเบาหวาน'
          description='ติ๊กเมื่อผู้รับบริการเป็นเบาหวาน แล้วจึงบันทึกค่าน้ำตาลปลายนิ้วที่เจาะได้'
          checked={diabetic}
          onChange={(checked) => setScreening({
            ...screening,
            dtxDiabetic: checked,
            /* ยกเลิกการติ๊กแล้วค่าที่กรอกค้างไว้ต้องไม่ถูกส่งต่อไปใบสรุป */
            ...(checked ? null : { dtx: '', dtxFasting: '' }),
          })}
          disabled={readOnly}
        />
        {diabetic && (
          <DtxFields
            value={screening}
            onChange={setScreening}
            readOnly={readOnly}
          />
        )}
      </StepSection>
    </SectionCard>
  );
};

export const HomeVisitStepScreening = ({ blockedMsg, ...props }) => (
  <StepCard>
    {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

    {/* สัญญาณชีพกับประวัติการแพ้เป็นคนละการ์ด (มติผู้ใช้ 2 ก.ย. 69) — `VitalsForm`
        เป็นการ์ดที่มนเฉพาะมุมล่าง (เดิมวางต่อจากหัวการ์ดของ shell) จึงต้องห่อ
        ให้มนครบสี่มุมเมื่อยืนเป็นการ์ดของตัวเอง */}
    <div
      className='w-full'
      style={{
        background: 'var(--surface-card-100, #FFFFFF)',
        borderRadius: 'var(--dim-radius-500, 16px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        boxShadow: 'var(--shadow-card-strong)',
        overflow: 'hidden',
      }}
    >
      <HomeVisitStep3Vitals {...props} blockedMsg='' />
    </div>

    {/* น้ำตาลปลายนิ้ว — ต่อจากสัญญาณชีพ ก่อนประวัติการแพ้ (มติผู้ใช้ 2 ก.ย. 69)
        เป็นค่าที่เจาะพร้อมรอบวัดสัญญาณชีพ · เจาะเฉพาะรายที่เป็นเบาหวาน
        ติ๊ก "เป็นเบาหวาน" ก่อน ช่องกรอกจึงจะขึ้น */}
    <HomeVisitDtxCard {...props} />

    <HomeVisitStepAllergy {...props} blockedMsg='' />

    {/* พฤติกรรมสุขภาพย้ายมารวมในขั้นคัดกรอง (มติผู้ใช้ 2 ก.ย. 69) — สูบบุหรี่/
        ดื่มสุรา/ออกกำลังกาย เป็นชุดคำถามคัดกรองชุดเดียวกับที่จุดคัดกรอง OPD
        ถามไปพร้อมกับสัญญาณชีพและประวัติการแพ้ตอนเพิ่งถึงบ้าน */}
    <HomeVisitStepBehaviour {...props} blockedMsg='' />
  </StepCard>
);

/* ── Step 7 — ตรวจสอบข้อมูล ────────────────────────────────────────
   ขั้นสุดท้ายก่อนจบการบันทึก (มติผู้ใช้ 2 ก.ย. 69) — กางทุกอย่างที่กรอกไว้แบบ
   อ่านอย่างเดียวให้ทวนก่อนปิดเยี่ยม ทรงเดียวกับขั้น "ตรวจสอบข้อมูล" ของหน้า
   เวชระเบียน · ค่าที่ยังไม่ได้กรอกขึ้น "—" เพื่อให้เห็นว่าอะไรยังขาด */

const REVIEW_LABEL_STYLE = {
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  color: 'var(--text-content-tertiary, #858C92)',
};
const REVIEW_VALUE_STYLE = {
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  color: 'var(--text-content-default, #363B3F)',
  whiteSpace: 'pre-line',
};

const ReviewItem = ({ label, value }) => (
  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
    <span style={REVIEW_LABEL_STYLE}>{label}</span>
    <span style={REVIEW_VALUE_STYLE}>{String(value ?? '').trim() || '—'}</span>
  </div>
);

const ReviewCard = ({ icon, title, items, onEdit, children }) => (
  <SectionCard
    icon={icon}
    title={title}
    aside={onEdit && (
      <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={onEdit}>
        แก้ไข
      </BrandSubdueButton>
    )}
  >
    {items?.length > 0 && (
      /* กริดคอลัมน์เท่ากันทุกใบ ค่าจึงตรงแนวกันทั้งหน้า (มติผู้ใช้ 2 ก.ย. 69) —
         flex-wrap เดิมทำให้ความกว้างแต่ละช่องไม่เท่ากันในแต่ละแถว */
      <div
        className='w-full'
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: 'var(--dim-space-400, 16px) var(--dim-space-600, 24px)',
          alignItems: 'start',
        }}
      >
        {items.map(([label, value]) => <ReviewItem key={label} label={label} value={value} />)}
      </div>
    )}
    {children}
  </SectionCard>
);

const reviewAddressLine = (a) => {
  if (!a) return '';
  return [a.houseNo, a.moo && `หมู่ ${a.moo}`, a.road, a.subdistrict, a.district, a.province, a.postcode || a.zip]
    .filter((x) => String(x || '').trim())
    .join(' ');
};

/* หมวดในหน้าตรวจสอบ ↔ ขั้นที่เป็นเจ้าของฟอร์มนั้น — กดแก้ไขแล้วเปิดขั้นนั้น
   เป็นป๊อปอัป (มติผู้ใช้ 2 ก.ย. 69) ไม่ต้องเดินกลับไปทีละขั้น */
const REVIEW_EDIT_SECTIONS = {
  consent: { title: 'แบบฟอร์มความยินยอม', Step: HomeVisitStep0Consent },
  personal: { title: 'ข้อมูลส่วนตัว', Step: HomeVisitStep1Service },
  service: { title: 'ข้อมูลการให้บริการ', Step: HomeVisitStep1Service },
  rights: { title: 'สิทธิการรักษา', Step: HomeVisitStepRights },
  address: { title: 'ที่อยู่และการติดต่อ', Step: HomeVisitStep2Address },
  screening: { title: 'คัดกรอง', Step: HomeVisitStepScreening },
  illness: { title: 'ประเมินอาการป่วย', Step: HomeVisitStep2History },
  family: { title: 'ข้อมูลสุขภาพครอบครัว', Step: HomeVisitStep7Family },
};

export const HomeVisitStepReview = ({ form, hn, registryEntry, appointment, blockedMsg, ...props }) => {
  const [editing, setEditing] = useState(null);
  const EditStep = editing ? REVIEW_EDIT_SECTIONS[editing]?.Step : null;
  const screening = form.homeScreening || {};
  const vitals = form.vitals || {};
  const adlTotal = scoreBarthel(form.adlAnswers);
  const adlInterp = interpretBarthel(adlTotal);
  const photoCount = (form.photos || []).length;
  const housePhotoCount = (form.housePhotos || []).filter(Boolean).length;

  /* ── ค่าที่ต้องกางให้ครบทุกขั้นก่อนหน้า (มติผู้ใช้ 2 ก.ย. 69) ──────────
     ขั้นนี้คือที่สุดท้ายก่อนกดบันทึกและส่งต่อ ถ้ามีอะไรที่กรอกไว้แล้วไม่โผล่
     ตรงนี้ คนทวนจะไม่มีทางรู้ว่าตกหล่น จึงไล่จากขั้นที่ 1 ถึงขั้นที่ 6 ให้ครบ */

  const consentDone = Array.isArray(form.consentCompletedIds) ? form.consentCompletedIds : [];
  const consentSigned = REGISTRATION_PENDING_CONSENT_CARDS.filter((f) => consentDone.includes(f.id));
  const consentPending = REGISTRATION_PENDING_CONSENT_CARDS.filter((f) => !consentDone.includes(f.id));

  const fullNameTh = [form.prefixTh, form.firstNameTh, form.lastNameTh].filter(Boolean).join(' ')
    || registryEntry?.name || appointment?.name || '';
  const birthLine = form.dobUnknown
    ? (form.birthYearBE ? `ปีเกิด ${form.birthYearBE}` : '')
    : form.dob;
  const mobilityLine = form.mobility === 'other'
    ? (form.mobilityOther || 'อื่นๆ')
    : (MOBILITY_OPTIONS.find((o) => o.key === form.mobility)?.label || '');

  const contactAddressLine = form.useRegisteredForContact
    ? 'เหมือนที่อยู่ตามทะเบียนบ้าน'
    : (form.useCurrentForContact ? 'เหมือนที่อยู่ปัจจุบัน' : reviewAddressLine(form.addressContact));
  const emergencyLine = (Array.isArray(form.emergency) ? form.emergency : [])
    .filter((e) => e?.name)
    .map((e) => [e.name, e.relation && `(${e.relation})`, e.phone].filter(Boolean).join(' '))
    .join('\n');

  /* สิทธิการรักษา — กางทุกกลุ่มพร้อมลำดับที่จัดไว้ในขั้นนั้น ลำดับคือสิ่งที่
     ตัดสินว่าจะเบิกสิทธิไหนก่อน จึงต้องเห็นในหน้าทวน */
  const rightsLine = (form.rightsGroups || [])
    .map((g) => {
      const items = (g.priorityItems || [])
        .map((it, i) => `${i + 1}. ${it.label}${it.role ? ` (${it.role})` : ''}`)
        .join(' · ');
      return items ? `${g.title}: ${items}` : '';
    })
    .filter(Boolean)
    .join('\n');

  const bmi = calcBmi(vitals.weight, vitals.height);
  const behaviourRisks = (screening.risks || [])
    .map((k) => HEALTH_RISK_OPTIONS.find((o) => o.key === k)?.label)
    .filter(Boolean)
    .join(' · ');

  const medicationLine = (form.medications || [])
    .map((m) => {
      const name = m.name === HOMEVISIT_MED_OTHER ? m.nameOther : m.name;
      if (!String(name || '').trim()) return '';
      const dose = m.dose === HOMEVISIT_MED_OTHER ? m.doseOther : m.dose;
      const adherence = {
        good: 'รับประทานครบตามสั่ง',
        partial: 'ลืมบางมื้อ',
        poor: 'ไม่ได้รับประทาน',
        stopped: 'หยุดยาเอง',
      }[m.adherence] || '';
      return [name, dose, adherence, m.photoUrl && 'มีรูปยา'].filter(Boolean).join(' · ');
    })
    .filter(Boolean)
    .join('\n');

  /* แบบประเมินทั้งชุดในขั้น "ประเมินอาการป่วย" — เดิมหน้าทวนมีแต่ ADL
     ทั้งที่กรอก 2Q/9Q/MNA/PPS ไปด้วย (มติผู้ใช้ 2 ก.ย. 69) */
  const q2Positive = SCREEN_2Q_QUESTIONS.filter((q) => form.screen2q?.[q.key] === true).length;
  const q2Answered = SCREEN_2Q_QUESTIONS.filter((q) => typeof form.screen2q?.[q.key] === 'boolean').length;
  const q9Total = score9q(form.screen9q);
  const mnaTotal = scoreMna(form.mna);
  const ppsInterp = interpretPps(form.pps);

  return (
    /* การ์ดในหน้าตรวจสอบห่างกัน 12px (มติผู้ใช้ 2 ก.ย. 69) — เป็นสรุปอ่านต่อเนื่อง
       ไม่ใช่ฟอร์มที่ต้องเว้นจังหวะเท่าขั้นอื่น */
    <section className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      <ReviewCard
        icon='assignment_turned_in'
        title='แบบฟอร์มความยินยอม'
        onEdit={() => setEditing('consent')}
        items={[
          ['เซ็นแล้ว', consentSigned.length ? `${consentSigned.length}/${REGISTRATION_PENDING_CONSENT_CARDS.length} ฉบับ` : ''],
          ['รายการที่เซ็นแล้ว', consentSigned.map((f) => f.title).join('\n')],
          ['ยังไม่ได้เซ็น', consentPending.map((f) => f.title).join('\n')],
        ]}
      />

      <ReviewCard
        icon='person'
        title='ข้อมูลส่วนตัว'
        onEdit={() => setEditing('personal')}
        items={[
          ['ชื่อ-นามสกุล', fullNameTh],
          ['เลขบัตรประชาชน', form.nationalId],
          ['วันเดือนปีเกิด', birthLine],
          ['เพศ', form.gender],
          ['หมู่เลือด', form.bloodType],
          ['สถานะการมีชีวิต', form.lifeStatus === 'deceased' ? `เสียชีวิต (${form.deceasedDate || 'ไม่ระบุวันที่'})` : 'มีชีวิตอยู่'],
          ['สภาพการเคลื่อนไหว', mobilityLine],
        ]}
      />

      <ReviewCard
        icon='event_available'
        title='ข้อมูลการให้บริการ'
        onEdit={() => setEditing('service')}
        items={[
          ['ผู้รับบริการ', registryEntry?.name || appointment?.name || ''],
          ['HN', hn],
          ['ประเภทการเยี่ยม', { first: 'เยี่ยมครั้งแรก (แรกรับ)', followup: 'เยี่ยมติดตาม', urgent: 'เยี่ยมกรณีเร่งด่วน' }[form.visitType] || form.visitType],
          ['วันที่ให้บริการ', form.serviceDate ? formatHomeVisitDate(form.serviceDate) : ''],
          ['กลุ่มผู้รับบริการ', PATIENT_GROUP_OPTIONS.find((g) => g.key === form.patientGroup)?.label],
          ['ที่มาของเคส', HOMEVISIT_SOURCES.find((o) => o.value === form.homevisitSource)?.label],
          ['ทีมผู้รับผิดชอบ', form.team],
        ]}
      />

      {/* คัดกรองสุขภาพรายบุคคลอยู่ในขั้น "ข้อมูลส่วนตัว" — ใช้ป้ายชุดเดียวกับ
          ที่ฟอร์มนั้นประกาศไว้ จะได้ไม่หลุดเมื่อฟอร์มเพิ่มข้อ */}
      <ReviewCard
        icon='fact_check'
        title='คัดกรองสุขภาพรายบุคคล'
        onEdit={() => setEditing('personal')}
        items={homeScreeningSummaryRows(screening).map((r) => [r.label, r.value])}
      />

      <ReviewCard
        icon='family_restroom'
        title='ข้อมูลสุขภาพครอบครัว'
        onEdit={() => setEditing('family')}
        items={[
          ['สมาชิกในครัวเรือน', (form.familyMembers || [])
            .map((m) => [m.name, m.relation, m.age && `${m.age} ปี`].filter(Boolean).join(' · '))
            .join('\n')],
          ['บันทึกข้อมูลสุขภาพครอบครัว', form.familyNote],
        ]}
      />

      <ReviewCard
        icon='map-pin'
        title='ที่อยู่และการติดต่อ'
        onEdit={() => setEditing('address')}
        items={[
          ['ที่อยู่ตามทะเบียนบ้าน', reviewAddressLine(form.addressRegistered)],
          ['ที่อยู่ปัจจุบัน', form.useRegisteredForCurrent ? 'เหมือนที่อยู่ตามทะเบียนบ้าน' : reviewAddressLine(form.addressCurrent)],
          ['ที่อยู่ติดต่อได้', contactAddressLine],
          ['พิกัดบ้าน', form.home?.lat ? `${form.home.lat}, ${form.home.lng}${form.home.pinSaved ? ' (ปักหมุดแล้ว)' : ''}` : ''],
          ['บันทึกการเดินทาง', form.travelNote],
          ['เวลาถึงบ้าน', form.arrivalTime],
          ['รูปถ่ายบ้าน', housePhotoCount ? `${housePhotoCount} รูป` : ''],
          ['เบอร์โทรศัพท์', form.phone],
          ['อีเมล', form.email],
          ['ผู้ติดต่อฉุกเฉิน', emergencyLine],
        ]}
      />

      <ReviewCard
        icon='verified_user'
        title='สิทธิการรักษา'
        onEdit={() => setEditing('rights')}
        items={[
          ['สิทธิหลัก', form.rightsType || form.rights],
          ['สถานพยาบาลหลัก', form.rightsHospital],
          ['ลำดับสิทธิที่ตรวจพบ', rightsLine],
        ]}
      />

      <ReviewCard
        icon='favorite'
        title='คัดกรอง'
        onEdit={() => setEditing('screening')}
        items={[
          ['ความดันโลหิต', vitals.sys && vitals.dia ? `${vitals.sys}/${vitals.dia} mmHg` : ''],
          ['ชีพจร', vitals.pulse ? `${vitals.pulse} ครั้ง/นาที` : ''],
          ['การหายใจ', vitals.respiration ? `${vitals.respiration} ครั้ง/นาที` : ''],
          ['อุณหภูมิ', vitals.temp ? `${vitals.temp} °C` : ''],
          ['ออกซิเจนปลายนิ้ว', vitals.oxygen ? `${vitals.oxygen}%` : ''],
          ['น้ำหนัก', vitals.weight ? `${vitals.weight} กก.` : ''],
          ['ส่วนสูง', vitals.height ? `${vitals.height} ซม.` : ''],
          ['BMI', bmi ? `${bmi} kg/m²` : ''],
          ['บันทึกการวัดสัญญาณชีพ', form.vitalsNote],
          ['น้ำตาลปลายนิ้ว (DTX)', screening.dtx ? `${screening.dtx} mg% ${screening.dtxFasting ? `(${screening.dtxFasting})` : ''}`.trim() : ''],
          ['ประวัติการแพ้', form.flags?.allergyDrug ? (form.allergyFreeText || 'มี') : ''],
          ['โรคประจำตัว', form.flags?.chronic ? (form.chronicFreeText || 'มี') : ''],
          ['บันทึกเพิ่มเติม (การแพ้/โรคประจำตัว)', form.allergyNote],
          ['พฤติกรรม/ความเสี่ยงด้านสุขภาพ', behaviourRisks],
        ]}
      />

      <ReviewCard
        icon='stethoscope'
        title='ประเมินอาการป่วย'
        onEdit={() => setEditing('illness')}
        items={[
          ['ประวัติปัจจุบัน', form.presentIllness],
          ['ระยะเวลาที่มีอาการ', form.symptomDuration],
          ['ผู้ดูแลหลัก', CAREGIVER_OPTIONS.find((o) => o.value === form.caregiver)?.label],
          ['แผลกดทับ', PRESSURE_SORE_OPTIONS.find((o) => o.value === form.pressureSore)?.label],
          ['ระดับความปวด', Number.isFinite(form.painScore) ? `${form.painScore}/10` : ''],
          ['ยาที่ใช้อยู่', medicationLine],
          ['ADL (ดัชนีบาร์เธล)', adlTotal ? `${adlTotal}/${BARTHEL_MAX_SCORE} · ${adlInterp.label}` : ''],
          ['2Q (คัดกรองซึมเศร้า)', q2Answered ? `ตอบ ${q2Answered}/${SCREEN_2Q_QUESTIONS.length} ข้อ · พบ ${q2Positive} ข้อ` : ''],
          ['9Q (ประเมินซึมเศร้า)', Number.isFinite(q9Total) && q9Total > 0 ? `${q9Total} คะแนน` : ''],
          ['MNA (ภาวะโภชนาการ)', Number.isFinite(mnaTotal) && mnaTotal > 0 ? `${mnaTotal} คะแนน` : ''],
          ['PPS (ระดับผู้ป่วยประคับประคอง)', ppsInterp ? `${form.pps}% · ${ppsInterp.label || ''}`.trim() : ''],
          ['ความต้องการ/ควรได้รับ', describeSupplyNeed(form)],
          ['สรุปผลการประเมิน', form.assessmentNote],
          ['รูปถ่ายระหว่างการเยี่ยม', photoCount ? `${photoCount} รูป` : ''],
        ]}
      />

      {/* แก้ไขในป๊อปอัป — เนื้อหาเป็นคอมโพเนนต์ขั้นเดิมทั้งก้อน ค่าที่แก้จึงเขียน
          ลง `form` ชุดเดียวกันทันที ปิดป๊อปอัปแล้วสรุปด้านหลังอัปเดตตาม */}
      <Popup
        open={!!editing}
        onClose={() => setEditing(null)}
        size='extraLarge'
        title={`แก้ไข${REVIEW_EDIT_SECTIONS[editing]?.title || ''}`}
        subtitle='แก้แล้วค่าจะอัปเดตในหน้าตรวจสอบทันที'
        primaryAction={{ label: 'เสร็จสิ้น', onClick: () => setEditing(null) }}
      >
        {EditStep && (
          <EditStep
            {...props}
            form={form}
            hn={hn}
            registryEntry={registryEntry}
            appointment={appointment}
            blockedMsg=''
          />
        )}
      </Popup>
    </section>
  );
};

export const HOMEVISIT_STEP_RENDERERS = [
  HomeVisitStep0Consent,
  HomeVisitStep1Service,
  HomeVisitStep2Address,
  HomeVisitStepRights,
  /* สัญญาณชีพ + ประวัติการแพ้/โรคประจำตัว + พฤติกรรมสุขภาพ = ขั้น "คัดกรอง"
     ขั้นเดียว (มติผู้ใช้ 2 ก.ย. 69) */
  HomeVisitStepScreening,
  HomeVisitStep2History,
  HomeVisitStepReview,
  /* ขั้น "Family Folder" ถูกยุบเข้าไปในขั้น "ข้อมูลส่วนตัว" แล้ว
     (มติผู้ใช้ 2 ก.ย. 69) — แฟ้มครอบครัวเป็นข้อมูลระดับครัวเรือนที่อ่านคู่กับ
     ข้อมูลตัวผู้รับบริการ ไม่ใช่ขั้นตอนท้ายสุดของการเยี่ยม */
  /* ขั้น "ประเมิน" ถูกยุบเข้าไปในขั้น "ประเมินอาการป่วย" แล้ว
     (มติผู้ใช้ 30 ส.ค. 69) — `HomeVisitStep4Assessment` ยัง export อยู่และถูก
     เรียกจากขั้นนั้นโดยตรง */
  /* ขั้น "บันทึกตามบทบาท/กิจกรรม" ถูกถอดออกจากโฟลว์ (มติผู้ใช้ 2 ก.ย. 69) —
     คีย์ `form.activities` ยังอยู่ในโมเดลและในใบสรุป/บันทึกเก่า */
  /* ขั้น "สั่งการรักษา" (CPOE) ถูกถอดออกจากโฟลว์ (มติผู้ใช้ 30 ส.ค. 69) —
     `HomeVisitStep6Orders` กับสะพาน `homevisitCpoe.js` ยังอยู่ครบ รอที่ทางใหม่ */
];

export default HOMEVISIT_STEP_RENDERERS;
