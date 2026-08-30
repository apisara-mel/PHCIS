import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { getCarriedScreening } from '@/data/screeningHandoff';
import {
  SectionTitle, FieldGrid, Field, Sym,
} from '@/components/forms/Fields';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Checkbox from '@/components/checkbox/Checkbox';
import Textarea from '@/components/forms/Textarea';
import DatePicker from '@/components/forms/DatePicker';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Table from '@/components/table/Table';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandIconButton from '@/components/button/BrandIconButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import TabCapsule from '@/components/tab/TabCapsule';
import TabPill, { TabBar, TabPillSmall } from '@/components/tab/TabPill';
import VitalsSignHorizontalPanel from '@/components/vitals/VitalsSignHorizontalPanel';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import Alert from '@/components/alert/Alert';
import RadioGroup from '@/components/radio/RadioGroup';
import RadioButton from '@/components/radio/RadioButton';
/* Timeslot picker is back in Step 6 when "มีคำสั่งล่วงหน้า" is the
   selected advance state — Figma 4025:14538 shows the 3×5 grid sitting
   below the วันที่นัดหมาย DatePicker inside Card 3. */
import Timeslot from '@/components/timeslot/Timeslot';
import Information from '@/components/information/Information';
import {
  resolveSeverityBadgeStyle,
  resolveLikelihoodBadgeStyle,
  resolveTreatmentStatusBadgeStyle,
} from '@/components/badge/clinicalBadgeStyles';
import ServiceDateList from '@/components/list/ServiceDateList';
import Topic from '@/components/topic/Topic';
import BodyDiagramPanel from '@/components/examination/BodyDiagramPanel';
import BrandButton from '@/components/button/BrandButton';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import medicalCheckupAnim from '@/assets/illustrations/Medical checkup.json';
/* Step 5 order empty-state illustration (Figma PHCIS|CPOE 270:27583) —
   a "first-aid kit" Lottie loop (white kit with red cross, stethoscope,
   pills, soft cloud backdrop). Used only by the Step 5 treatment-order
   empty state; the other in-form empty states (Steps 3 / 4) keep the
   "Medical checkup" doctor-with-patient scene imported above. */
import firstaidKitAnim from '@/assets/illustrations/Firstaid Kit.json';
import DoctorAiIcdPanel from '@/components/search/DoctorAiIcdPanel';
import ExamNotesPanel from '@/components/examination/ExamNotesPanel';
/* EMR §1.4 panels — แต่ละอันเป็นไฟล์ของตัวเองใน src/pages/treat/panels/
   เพื่อไม่ให้ไฟล์นี้ (ใหญ่อยู่แล้ว) โตต่อและกัน conflict ระหว่าง agent */
import LabRadiologyResultsPanel from '@/pages/treat/panels/LabRadiologyResultsPanel';
import Popup from '@/components/popup/Popup';
import VaccineGrowthPanel from '@/pages/treat/panels/VaccineGrowthPanel';
import ReferralHistoryPanel from '@/pages/treat/panels/ReferralHistoryPanel';
import { VisitJourneyStagePanel } from '@/pages/treat/panels/VisitJourneyPanel';
import { vaccinesForPatient } from '@/data/treatmentVaccines';
import { referralHistoryForPatient } from '@/data/treatmentRefer';
import { consultsForPatient, clinicMeta, consultStatusMeta } from '@/data/treatmentConsult';
import {
  imagingHistoryForPatient, FILM_ASSETS, RESULT_CLASS_META,
} from '@/data/treatmentImagingHistory';
import MedRecPanel from '@/pages/treat/panels/MedRecPanel';
/* CPOE §1.5 — panel ของหมวดสั่งการรักษาแยกเป็นไฟล์ละหมวดใน
   src/pages/treat/panels/ (pattern เดียวกับ MedRecPanel) เพื่อไม่ให้
   ไฟล์นี้บวมต่อ. ทุก panel อ่าน `form` แบบ optional-chaining ทั้งหมด
   เพราะ NcdSteps.jsx ส่ง form คนละรูปเข้ามาที่ Step5Orders เดียวกัน. */
import MedicationCdssPanel from '@/pages/treat/panels/MedicationCdssPanel';
import LabOrderPanel from '@/pages/treat/panels/LabOrderPanel';
import RadiologyOrderPanel from '@/pages/treat/panels/RadiologyOrderPanel';
import ProcedureOrderPanel from '@/pages/treat/panels/ProcedureOrderPanel';
import ConsultComposerPanel from '@/pages/treat/panels/ConsultComposerPanel';
import MedicalSupplyOrderPanel, { MEDICAL_SUPPLY_CATALOG } from '@/pages/treat/panels/MedicalSupplyOrderPanel';
import { CpoeWorkflowPanel } from '@/pages/treat/CpoeWorkflowPage';
import { ICD9_PROCEDURES } from '@/pages/treat/panels/ProcedureOrderPanel';
import ReDiagnosisPopup from '@/components/popup/ReDiagnosisPopup';
import ReMedicinePopup from '@/components/popup/ReMedicinePopup';
import DeleteDiagnosisConfirmPopup from '@/components/popup/DeleteDiagnosisConfirmPopup';
import DeleteMedicationConfirmPopup from '@/components/popup/DeleteMedicationConfirmPopup';
import EditDiagnosisPopup from '@/components/popup/EditDiagnosisPopup';
import AddDiagnosisPopup from '@/components/popup/AddDiagnosisPopup';
import AdvanceOrderPickerPopup from '@/components/popup/AdvanceOrderPickerPopup';
import DeleteAdvanceOrderConfirmPopup from '@/components/popup/DeleteAdvanceOrderConfirmPopup';
import AddMedicationPopup from '@/components/popup/AddMedicationPopup';
import TreatmentOrderPickerPopup from '@/components/popup/TreatmentOrderPickerPopup';
import ConfirmAddDiagnosisPopup from '@/components/popup/ConfirmAddDiagnosisPopup';
import MedicalHistoryPopup from '@/components/popup/MedicalHistoryPopup';
import AppointmentHistoryPopup from '@/components/popup/AppointmentHistoryPopup';
import { INITIAL_APPOINTMENTS } from '@/pages/appointment/appointmentShared';
import {
  FALLBACK_MED_IMG,
  medImg,
  medicationRegistryDefaults,
  resolveMedicationImage,
} from '@/data/medicationCatalog';
import {
  findVisitDetailsByHn,
  DEFAULT_MEASUREMENT_ROUNDS,
  DEFAULT_NURSE_EXAM_NOTES,
  DEFAULT_DOCTOR_EXAM_NOTES,
  DEFAULT_EXAM_ATTACHMENTS,
  DEFAULT_BODY_MARKERS,
  EXAM_SYSTEM_TABS,
  EXAM_VIEW_TABS,
  DIAGNOSIS_TYPE_OPTIONS,
  TREATMENT_DOCTOR_OPTIONS,
  DIAGNOSIS_SUGGESTIONS,
  DEFAULT_ICD_SUGGESTIONS,
  PAST_VISIT_DIAGNOSES,
  PAST_VISIT_MEDICATIONS,
  DOCTOR_ORDER_SUGGESTIONS,
  DIAGNOSIS_NOTE_PLACEHOLDER,
  DOCTOR_ORDER_NOTE_PLACEHOLDER,
  TREATMENT_ORDER_CATEGORIES,
  APPT_CLINIC_OPTIONS,
  APPT_TYPE_OPTIONS,
  APPT_DOCTOR_OPTIONS,
  APPT_ADVANCE_ORDER_OPTIONS,
  APPT_REASON_SUGGESTIONS,
  APPT_PREPARATION_SUGGESTIONS,
  APPT_PREPROCEDURE_SUGGESTIONS,
  APPT_TIMESLOTS,
  CERT_ISSUE_OPTIONS,
  CERT_TYPE_CARDS,
  CERT_REST_DAY_PILLS,
  computeCertRestDateRange,
  formatCertRestDate,
  parseCertRestDate,
  formatCertSignedAt,
  CERT_DOCTOR_OPTIONS,
  CERT_LICENSE_OPTIONS,
  resolveDiagnosisType,
} from '@/data/treatmentVisits';
/* Step 5 · X-ray category (TOR §1.12.5.4) — the same RIS picker + catalog
   the X-ray order screen uses, so the doctor's CPOE and the radiology
   worklist speak one vocabulary (exam ids, ท่าถ่าย keys, สิทธิ math).
   `Badge` carries the picker's attribute chips (สารทึบรังสี / ส่งตรวจ
   ภายนอก) into the order table so the safety context follows the row. */
import XrayOrderPicker from '@/components/xray/XrayOrderPicker';
import Badge from '@/components/badge/Badge';
import {
  XRAY_EXAM_BY_ID,
  XRAY_EXAMS,
  XRAY_VIEWS,
  getRegion,
  claimFor,
  summariseSelection,
  duplicateWarning,
} from '@/data/xrayCatalog';
import { LAB_TESTS } from '@/data/labCatalog';
import { CONSULT_CLINICS, blankConsult, doctorsForClinic, saveConsult } from '@/data/treatmentConsult';
import { getPendingCpoeHandoff, markCpoeHandoffImported } from '@/data/homevisitCpoe';
import {
  XRAY_URGENCIES,
  xrayHistoryFor,
  /* Doctor-side view of this patient's radiology reports — see
     `XrayHistoryTabPanel` (TOR §1.12.6.4). */
  XRAY_ORDERS,
  withExamLabel,
} from '@/data/xrayOrders';
import DatePickerRange from '@/components/forms/DatePickerRange';
import FormBuilderSignature from '@/components/form-builder/Signature';
import DoctorProfileAvatar, { DOCTOR_PROFILE_AVATAR_SRC } from '@/components/layout/DoctorProfileAvatar';

/* Per-step form bodies for ระบบบันทึกการรักษา (treatment record).
   Each step takes (form, setForm, patient) and reads its own slice.
   Uses the existing MR form primitives (SectionTitle, SubCard, Field, …)
   to avoid duplication. */

/* ─────────────────────────────────────────────────────────────
   Step 1 — ประวัติการรักษา (Medical History)  · Figma PHCIS | CPOE 176:41635
   Two-column layout: 316px "วันที่รับบริการ" rail on the left +
   detail panel on the right (tab strip, vital signs grid, อาการป่วย,
   pain score, ประวัติการแพ้ยา, ประวัติโรคประจำตัว). The same layout is
   reused in Step 6 inside a modal (Figma PHCIS | Appointment 4034:3723)
   via `MedicalHistoryReadOnlyLayout`.
   ───────────────────────────────────────────────────────────── */

/* แท็บ "ภาพรวมการรักษา (ลงทะเบียน → ชำระเงิน)" ถูกเอาออก 28 ส.ค. 69 —
   ไฟล์ VisitJourneyPanel.jsx ยังอยู่เพราะ `VisitJourneyStagePanel` ในไฟล์
   เดียวกันยังถูกใช้โดยแท็บผลแล็บ / ตรวจร่างกาย / วินิจฉัย */
const HISTORY_TABS = [
  'ผลการคัดกรองและซักประวัติ',
  'ผลการตรวจแล็บ',
  'ผลการ X-ray / RIS',
  'ผลการตรวจร่างกาย',
  'ผลการวินิจฉัย',
  /* EMR §1.4 — แท็บที่เพิ่มในเวฟ TOR §1.4. แต่ละแท็บมี panel เป็นไฟล์ของ
     ตัวเองใน src/pages/treat/panels/ เพื่อไม่ให้ไฟล์นี้บวมต่อ */
  'ผลตรวจแล็บและรังสีวิทยา',
  'วัคซีน',
  'กราฟการเจริญเติบโต',
  /* TOR §1.4.3.4 — แพทย์ต้องเห็นประวัติการส่งต่อของผู้ป่วยได้จากในหน้า
     บันทึกการรักษาโดยตรง ไม่ต้องข้ามไป /treat/refer */
  'ประวัติการจ่ายยา',
  'ประวัติการส่งปรึกษา',
  'ประวัติการส่งต่อ',
];

const HISTORY_TAB_SCREENING = 'ผลการคัดกรองและซักประวัติ';
const HISTORY_TAB_LAB = 'ผลการตรวจแล็บ';
const HISTORY_TAB_EXAM = 'ผลการตรวจร่างกาย';
const HISTORY_TAB_DX = 'ผลการวินิจฉัย';

/* The X-ray capsule is the one HISTORY_TABS entry with a real data source
   behind it (the RIS worklist), so it renders its own panel instead of the
   default vitals summary — see `XrayHistoryTabPanel`. The remaining
   capsules still all show the same summary; that predates the RIS module. */
const HISTORY_TAB_XRAY = 'ผลการ X-ray / RIS';

/* แท็บที่อ่านข้อมูลของ "การรับบริการครั้งเดียว" — ต้องมีตัวเลือกวันที่กำกับ
   เมื่อรางวันที่ถูกซ่อนในโหมดดูตามรายการตรวจ */
const DATE_SCOPED_HISTORY_TABS = new Set([
  HISTORY_TAB_SCREENING,
  HISTORY_TAB_LAB,
  HISTORY_TAB_EXAM,
  HISTORY_TAB_DX,
]);

/* แต่ละหมวดอ่านคนละช่องของบันทึกการรับบริการ จึงประกาศไว้ที่เดียว —
   ช่องที่ครั้งนั้นไม่มีค่าจะถูกตัดออก ไม่แสดงเป็นขีดกลางเรียงกันเป็นพืด */
const TIMELINE_FIELDS_BY_TAB = {
  [HISTORY_TAB_SCREENING]: (v) => [
    ['อาการสำคัญ (CC)', v.cc],
    ['ระยะเวลาที่มีอาการ', v.duration],
    ['ระดับความเจ็บปวด', v.painLabel],
    ['ความเร่งด่วน (Triage)', v.triage],
    ['อุณหภูมิ', v.temp],
    ['ความดันโลหิต', v.bp],
    ['ชีพจร', v.pulse],
    ['น้ำหนัก', v.weightText],
    ['ห้องตรวจ', v.room],
    ['สิทธิการรักษา', v.rights],
  ],
  [HISTORY_TAB_LAB]: (v) => [
    ['ผลตรวจทางห้องปฏิบัติการ', v.labs],
    ['ผลตรวจทางรังสีวิทยา', v.imaging],
    ['การวินิจฉัย', v.dx],
    ['การรักษา/ยาที่สั่ง', v.rx],
    ['แพทย์ผู้สั่งตรวจ', v.doctor],
    ['แผนก/คลินิก', v.dept],
    ['การนัดติดตาม', v.followUp],
  ],
  [HISTORY_TAB_EXAM]: (v) => [
    ['อาการสำคัญ (CC)', v.cc],
    ['อุณหภูมิ', v.temp],
    ['ความดันโลหิต', v.bp],
    ['ชีพจร', v.pulse],
    ['น้ำหนัก', v.weightText],
    ['แผนก/คลินิก', v.dept],
    ['แพทย์ผู้ตรวจ', v.doctor],
    ['ห้องตรวจ', v.room],
    ['บันทึกเพิ่มเติม', v.note],
  ],
  [HISTORY_TAB_DX]: (v) => [
    ['การวินิจฉัย', v.dx],
    ['การรักษา/ยาที่สั่ง', v.rx],
    ['อาการสำคัญ (CC)', v.cc],
    ['ระยะเวลาที่มีอาการ', v.duration],
    ['แพทย์ผู้ตรวจ', v.doctor],
    ['แผนก/คลินิก', v.dept],
    ['การนัดติดตาม', v.followUp],
    ['บันทึกเพิ่มเติม', v.note],
  ],
};

const TimelineField = ({ label, value }) => (
  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
    <span style={{
      color: 'var(--text-content-tertiary)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs)',
      lineHeight: 1.5,
    }}>{label}</span>
    <span style={{
      color: 'var(--text-content-default)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm)',
      lineHeight: 1.5,
    }}>{value}</span>
  </div>
);

const TIMELINE_RAIL_X = 7;   /* กึ่งกลางจุด 14px */
const TIMELINE_INDENT = 32;  /* ระยะจากรางถึงเนื้อหา */

/* หนึ่งครั้งที่มารับบริการ = หนึ่งหมุดบนราง — จุด + เส้นต่อเนื่อง + การ์ดเนื้อหา */
const VisitTimelineEntry = ({ entry, isLast }) => (
  <li className='relative w-full min-w-0' style={{ paddingLeft: TIMELINE_INDENT }}>
    {/* เส้นรางต่อลงไปหาหมุดถัดไป — หมุดสุดท้ายไม่มีเส้นห้อย */}
    {!isLast && (
      <span
        aria-hidden
        style={{
          position: 'absolute', left: TIMELINE_RAIL_X - 1, top: 18, bottom: -18, width: 2,
          background: 'var(--border-brandPrimary-quaternary, #E2F3EB)',
        }}
      />
    )}
    <span
      aria-hidden
      style={{
        position: 'absolute', left: 0, top: 4, width: 14, height: 14,
        borderRadius: '50%',
        background: 'var(--surface-card-default, #FFFFFF)',
        border: 'var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-secondary, #08A768)',
      }}
    />

    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
      <div className='flex flex-wrap items-baseline' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          fontWeight: 'var(--type-weight-medium)',
          lineHeight: 1.5,
        }}>{entry.date}</span>
        {entry.subtitle && (
          <span style={{
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            lineHeight: 1.5,
          }}>{entry.subtitle}</span>
        )}
      </div>

      {entry.films?.length ? (
        <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
          {entry.films.map((film, i) => (
            <figure
              key={`${film.label}-${i}`}
              className='flex flex-col'
              style={{ gap: 'var(--dim-space-150)', margin: 0 }}
            >
              <img
                src={film.src}
                alt={film.label}
                loading='lazy'
                style={{
                  width: 132, height: 165, objectFit: 'cover',
                  borderRadius: 'var(--dim-radius-300)',
                  border: 'var(--dim-stroke-100) solid var(--border-neutral-tertiary)',
                  background: 'var(--surface-neutral-secondary, #1B2227)',
                }}
              />
              <figcaption style={{
                color: 'var(--text-content-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
              }}>{film.label}</figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      {entry.fields.length === 0 ? (
        <span style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
        }}>ไม่มีข้อมูลหมวดนี้ในครั้งนั้น</span>
      ) : (
        <div
          className='grid w-full'
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--dim-space-300)',
            padding: 'var(--dim-space-400)',
            borderRadius: 'var(--dim-radius-400)',
            border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
            background: 'var(--surface-neutral-quaternary)',
          }}
        >
          {entry.fields.map(([label, value]) => (
            <TimelineField key={label} label={label} value={value} />
          ))}
        </div>
      )}
    </div>
  </li>
);

/* ── Timeline ของโหมด "ดูตามรายการตรวจ" ─────────────────────────────────
   หมวดที่ผูกกับการรับบริการครั้งเดียวไม่ได้อ่านทีละใบ แต่ไล่ทุกครั้งที่มา
   รับบริการเป็นไทม์ไลน์แนวตั้ง — จุดบนรางเดียวกันทั้งชุด ใหม่สุดอยู่บน
   ตัวหนังสือขนาด xs (ป้ายกำกับ) / sm (ค่า) ล้วน เพราะเป็นรายการที่ต้องกวาดตา
   อ่านย้อนหลัง ไม่ใช่หน้าอ่านทีละใบ · แต่ละหมวดอ่านคนละช่องของบันทึก จึง
   ประกาศ TIMELINE_FIELDS_BY_TAB ไว้ที่เดียว (มติผู้ใช้ 28 ส.ค. 69) */
const RecordTimeline = ({ entries, emptyText }) => {
  if (!entries.length) return <ValueText>{emptyText}</ValueText>;
  return (
    <ol className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-600)' }}>
      {entries.map((entry, i) => (
        <VisitTimelineEntry
          key={entry.key}
          entry={entry}
          isLast={i === entries.length - 1}
        />
      ))}
    </ol>
  );
};

/* ทะเบียนวัคซีนอ่านเป็นไทม์ไลน์เข็มต่อเข็ม — ดูอย่างเดียว ไม่มีปุ่มบันทึก/ยกเลิก
   เพราะป๊อปอัปประวัติเป็นหน้าอ่าน การบันทึกเข็มอยู่ที่คลินิกสร้างเสริมภูมิคุ้มกันโรค
   (มติผู้ใช้ 28 ส.ค. 69) */
const VaccineDoseTimeline = ({ patient, form }) => {
  const doses = useMemo(() => vaccinesForPatient(patient?.hn || ''), [patient?.hn]);
  const entries = useMemo(() => doses.map((v, i) => ({
    key: v.id || `dose-${i}`,
    date: v.injectedOn,
    subtitle: v.unit,
    fields: [
      ['วัคซีน', v.vaccine],
      ['เข็มที่', v.doseNo ? `เข็มที่ ${v.doseNo}` : ''],
      ['Lot', v.lot],
      ['วันหมดอายุ', v.expiry],
      ['ตำแหน่ง/วิธีให้', v.site],
      ['ผู้ฉีด', v.injectedBy],
      ['ปฏิกิริยาหลังฉีด', v.reaction],
      ['สถานะ', v.cancelledAt ? `ยกเลิก — ${v.cancelReason || 'ไม่ระบุเหตุผล'}` : ''],
    ].filter(([, value]) => value),
  })), [doses]);
  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-500)' }}>
      {/* ตารางวัคซีนพื้นฐาน (EPI) ตามช่วงอายุ อยู่เหนือไทม์ไลน์ — บอกว่า "ยังขาด
          เข็มไหน" ซึ่งไทม์ไลน์ของเข็มที่ฉีดไปแล้วตอบไม่ได้ (มติผู้ใช้ 28 ส.ค. 69) */}
      <VaccineGrowthPanel patient={patient} form={form || {}} section='epi' />
      <RecordTimeline entries={entries} emptyText='ยังไม่มีประวัติการได้รับวัคซีนในระบบ' />
    </div>
  );
};

/* ประวัติการส่งต่ออ่านเป็นไทม์ไลน์เช่นกัน (ToR §1.4.3.4) — ดูอย่างเดียว
   การออกใบส่งต่ออยู่ที่ /treat/refer */
const REFER_DIRECTION_LABEL = { out: 'ส่งต่อออก', in: 'รับเข้า', internal: 'ส่งต่อภายในหน่วยงาน' };

const ReferralTimeline = ({ patient }) => {
  const rows = useMemo(
    () => referralHistoryForPatient(patient?.hn || ''),
    [patient?.hn],
  );
  const entries = useMemo(() => rows.map((r, i) => ({
    key: r.id || `refer-${i}`,
    date: r.sentDate || r.lastVisitDate || '—',
    subtitle: REFER_DIRECTION_LABEL[r.direction] || '',
    fields: [
      ['เลขที่ใบส่งต่อ', r.referNo],
      ['ปลายทาง', r.targetLabel],
      ['อาการ', r.symptom],
      ['ผลตรวจที่ส่งไปด้วย', r.labResult],
      ['การรักษาที่ให้ก่อนส่ง', r.treatmentGiven],
      ['เหตุผลที่ส่งต่อ', r.requirement],
      ['ผู้ส่ง', r.sender],
      ['ใช้ได้ถึง', r.validUntil],
      ['สถานะ', r.status === 'cancelled' ? 'ยกเลิกแล้ว' : (r.expired ? 'หมดอายุแล้ว' : '')],
    ].filter(([, value]) => value),
  })), [rows]);
  return <RecordTimeline entries={entries} emptyText='ผู้รับบริการรายนี้ยังไม่เคยถูกส่งต่อ' />;
};

/* ผลตรวจทางรังสีวิทยาอ่านเป็นไทม์ไลน์พร้อมภาพฟิล์ม — ภาพเป็นภาพแทนแบบ stylized
   ใน public/images/films/ ไม่ใช่ภาพรังสีจริง (ต้นแบบยังไม่มี PACS/DICOMweb) */
const ImagingTimeline = ({ patient }) => {
  const studies = useMemo(
    () => imagingHistoryForPatient(patient?.hn || ''),
    [patient?.hn],
  );
  const entries = useMemo(() => studies.map((st, i) => ({
    key: st.id || `img-${i}`,
    date: st.reportedOn,
    subtitle: [st.center, st.reportedAt ? `อ่านผล ${st.reportedAt}` : ''].filter(Boolean).join(' · '),
    films: (st.films || []).map((f) => ({ label: f.label, src: FILM_ASSETS[f.key] })),
    fields: [
      ['รายการตรวจ', st.bodyPart],
      ['วิธีตรวจ', st.modality],
      ['เลข XN', st.xn],
      ['ผลการอ่าน', RESULT_CLASS_META[st.resultClass]?.label],
      ['แพทย์ผู้สั่งตรวจ', st.orderedBy],
      ['รังสีแพทย์ผู้อ่านผล', st.radiologist],
      ['สิ่งที่ตรวจพบ (Findings)', st.findings],
      ['สรุปผล (Impression)', st.impression],
    ].filter(([, value]) => value),
  })), [studies]);
  return (
    <RecordTimeline
      entries={entries}
      emptyText='ยังไม่มีผลตรวจทางรังสีวิทยาของผู้รับบริการรายนี้'
    />
  );
};

/* ประวัติการจ่ายยา — ไล่ตามครั้งที่มารับบริการ แต่ละครั้งกางรายการยาที่จ่าย
   พร้อมวิธีใช้และจำนวน (มติผู้ใช้ 28 ส.ค. 69) */
const MedicationTimeline = ({ visits }) => {
  const entries = useMemo(
    () => (visits || [])
      .filter((v) => (v.meds || []).length > 0)
      .map((v, i) => ({
        key: `${v.date}-med-${i}`,
        date: v.date,
        subtitle: [v.center, v.doctor ? `สั่งโดย ${v.doctor}` : ''].filter(Boolean).join(' · '),
        fields: [
          ...(v.meds || []).flatMap((m, mi) => [
            [`ยารายการที่ ${mi + 1}`, m.name],
            [`วิธีใช้ (${m.name})`, m.sig],
            [`จำนวนที่จ่าย (${m.name})`, m.qty],
          ]),
          ['การวินิจฉัยของครั้งนั้น', v.dx],
        ].filter(([, value]) => value),
      })),
    [visits],
  );
  return (
    <RecordTimeline
      entries={entries}
      emptyText='ยังไม่มีประวัติการจ่ายยาของผู้รับบริการรายนี้'
    />
  );
};

/* ประวัติการส่งปรึกษาแพทย์เฉพาะทาง (CPOE §1.5.6) — ดูอย่างเดียว
   การเปิดใบปรึกษาใหม่อยู่ที่ทะเบียนการส่งปรึกษาแพทย์ */
const ConsultTimeline = ({ patient }) => {
  const rows = useMemo(() => consultsForPatient(patient?.hn || ''), [patient?.hn]);
  const entries = useMemo(() => rows.map((c, i) => ({
    key: c.id || `consult-${i}`,
    date: c.requestedAt || c.createdAt || '—',
    subtitle: [clinicMeta(c.toClinic)?.label, consultStatusMeta(c.status)?.label]
      .filter(Boolean).join(' · '),
    fields: [
      ['เลขที่ใบปรึกษา', c.consultNo],
      ['คลินิกที่ส่งปรึกษา', clinicMeta(c.toClinic)?.label],
      ['การวินิจฉัยเบื้องต้น', c.provisionalDx],
      ['ประเด็นที่ปรึกษา', c.question],
      ['ข้อมูลประกอบ', c.context],
      ['สิ่งที่ขอให้ช่วย', c.request],
      ['ผู้ส่งปรึกษา', c.requestedBy],
      ['ผู้ตอบกลับ', c.repliedBy],
      ['ความเห็นที่ตอบกลับ', c.replyBody],
      ['คำแนะนำการรักษา', c.replyAdvice],
    ].filter(([, value]) => value),
  })), [rows]);
  return (
    <RecordTimeline
      entries={entries}
      emptyText='ยังไม่มีประวัติการส่งปรึกษาของผู้รับบริการรายนี้'
    />
  );
};

const VisitFieldTimeline = ({ visits, tabLabel }) => {
  const fieldsOf = TIMELINE_FIELDS_BY_TAB[tabLabel];
  const entries = useMemo(
    () => (visits || []).map((v, i) => ({
      key: `${v.date}-${i}`,
      date: v.date,
      subtitle: v.center,
      fields: (fieldsOf ? fieldsOf(v) : []).filter(([, value]) => value),
    })),
    [visits, fieldsOf],
  );

  return (
    <RecordTimeline
      entries={entries}
      emptyText='ยังไม่มีประวัติการรับบริการของผู้รับบริการรายนี้'
    />
  );
};

/* EMR §1.4 tab → panel component (ไฟล์แยกใน src/pages/treat/panels/) */
const HISTORY_TAB_LABRAD  = 'ผลตรวจแล็บและรังสีวิทยา';
/* แท็บนี้อ่านเป็นไทม์ไลน์ด้วยเหมือนหมวดอื่น (มติผู้ใช้ 28 ส.ค. 69) — แผงเดิม
   ยังใช้อยู่ในโหมด "ดูตามวันที่รับบริการ" */
DATE_SCOPED_HISTORY_TABS.add(HISTORY_TAB_LABRAD);
TIMELINE_FIELDS_BY_TAB[HISTORY_TAB_LABRAD] = (v) => [
  ['ผลตรวจทางห้องปฏิบัติการ', v.labs],
  ['ผลตรวจทางรังสีวิทยา', v.imaging],
  ['การวินิจฉัย', v.dx],
  ['การรักษา/ยาที่สั่ง', v.rx],
  ['แพทย์ผู้สั่งตรวจ', v.doctor],
  ['แผนก/คลินิก', v.dept],
  ['การนัดติดตาม', v.followUp],
];
const HISTORY_TAB_VACCINE = 'วัคซีน';
const HISTORY_TAB_GROWTH  = 'กราฟการเจริญเติบโต';
const HISTORY_TAB_REFER   = 'ประวัติการส่งต่อ';
const HISTORY_TAB_PHARMACY = 'ประวัติการจ่ายยา';
const HISTORY_TAB_CONSULT  = 'ประวัติการส่งปรึกษา';

/* Step 5 "สั่งการรักษา" อยู่ที่ index 4 ใน STEP_RENDERERS — ใช้โดย CTA
   ของ empty state ในแท็บผลแล็บ ("ไปสั่งตรวจ") */
const STEP_ORDERS_INDEX = 4;

/* คีย์แท็บที่ 6 ของ Step 5 — ไม่อยู่ใน TREATMENT_ORDER_CATEGORIES เพราะ
   ORDER_EMPTY_STATE_TEXT / ORDER_TABLE_TEXT map ตาม 5 คีย์เดิม */
const MEDREC_CATEGORY = 'medrec';


const ValueText = ({ children }) => (
  <span style={{
    color: 'var(--text-content-default)',
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-sm)',
    fontWeight: 'var(--type-weight-regular)',
    lineHeight: 1.5,
  }}>{children}</span>
);

/* ── Shared SummaryPanel helpers — used by both Step 1 and Step 2.
   `SummaryPanel` is the titled quaternary-grey card per PHCIS-ALL 2624:122782
   / CPOE 176:38630. Fields alias Figma Information (2550:10442) via
   `HistoryInfoText`. `IconTile` fronts mobility + pain summary tiles. */

const SummaryPanel = ({
  title,
  action,
  children,
  fill,
  titleVariant = 'tertiary',
  radius = 'lg',
  headerGap = 'narrow',
}) => {
  const titleColor = titleVariant === 'secondary'
    ? 'var(--text-topic-secondary-title)'
    : titleVariant === 'tertiary'
      ? 'var(--text-topic-tertiary-title)'
      : 'var(--text-content-default)';
  const borderRadius = radius === 'lg'
    ? 'var(--dim-radius-500)'
    : 'var(--dim-radius-400)';
  const headerGapValue = headerGap === 'wide'
    ? 'var(--dim-space-400)'
    : 'var(--dim-space-200)';

  return (
    <div className='flex flex-col w-full' style={{
      gap: 'var(--dim-space-300)',
      padding: 'var(--dim-space-400)',
      borderRadius,
      border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
      background: fill || 'var(--surface-neutral-quaternary)',
      flex: 1,
      minWidth: 0,
    }}
    >
      {(title || action) && (
        <div className='flex items-center w-full' style={{ gap: headerGapValue }}>
          {title && (
            <span style={{
              flex: 1,
              minWidth: 0,
              color: titleColor,
              fontFamily: 'var(--type-family-heading-content)',
              fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
              fontSize: 'var(--type-size-base)',
              lineHeight: 1.5,
            }}
            >
              {title}
            </span>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
};

const IconTile = ({ icon, tone = 'brand' }) => {
  const palette = tone === 'warning'
    ? { bg: 'var(--surface-alert-warning)',           fg: 'var(--text-alert-warning)' }
    : { bg: 'var(--surface-brandPrimary-quaternary)', fg: 'var(--text-brandPrimary-default)' };
  return (
    <div
      className='shrink-0 inline-flex items-center justify-center'
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: palette.bg,
        color: palette.fg,
      }}
    >
      <Sym name={icon} size={20} color='currentColor' />
    </div>
  );
};

const PainTile = ({ pain }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
    <IconTile icon={pain.icon} tone='warning' />
    <ValueText>{pain.label}</ValueText>
  </div>
);

/* PHCIS-ALL Step 1 · allergy / chronic panels (nodes 176:38678 · 176:38700). */

const HISTORY_CARD_TITLE_STYLE = {
  color: 'var(--text-topic-tertiary-title)',
  fontFamily: 'var(--type-family-heading-content)',
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
  fontSize: 'var(--type-size-base)',
  lineHeight: 1.5,
};

const HistoryInfoText = ({ label, value }) => (
  <Information
    className='flex-1 min-w-0 w-full'
    style={{ maxWidth: 640 }}
    subText={label}
    text={value || '—'}
    showBadge={false}
    showBadge2={false}
  />
);

/* แถวสรุปแบบ "ป้ายซ้าย · ค่าขวา" ให้การ์ด "บันทึกจากการตรวจร่างกาย" อ่านเป็น
   จังหวะเดียวกับคอลัมน์บันทึกจากพยาบาล (มติผู้ใช้ 31 ส.ค. 69) — `HistoryInfoText`
   วางป้ายไว้เหนือค่า ทำให้สองการ์ดที่แสดงช่องชุดเดียวกันอ่านคนละแบบ
   ป้ายกว้างคงที่ค่าทุกแถวจึงเริ่มตรงคอลัมน์เดียวกัน (เท่ากับ NurseRow) */
const EXAM_SUMMARY_LABEL_WIDTH = 148;

const ExamSummaryRow = ({ label, value }) => (
  <div
    className='grid w-full items-start'
    style={{
      gridTemplateColumns: `${EXAM_SUMMARY_LABEL_WIDTH}px minmax(0, 1fr)`,
      columnGap: 'var(--dim-space-300)',
    }}
  >
    <span style={{
      color: 'var(--text-content-tertiary)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs)',
      lineHeight: 1.5,
    }}
    >
      {label}
    </span>
    <span
      className='min-w-0'
      style={{
        color: value ? 'var(--text-content-default)' : 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
      }}
    >
      {String(value || '').trim() || '—'}
    </span>
  </div>
);

const hasBodyDiagramInput = (form, systemKey) => (
  ((form.bodyMarkers?.[systemKey] || []).length > 0)
  || ((form.bodyDrawings?.[systemKey] || []).length > 0)
);

const resolveBodyDiagramSummaryKeys = (form) => EXAM_SYSTEM_TABS
  .filter((tab) => hasBodyDiagramInput(form, tab.key))
  .map((tab) => tab.key);

const markerFallbackViewKeys = (markers) => {
  const sides = new Set(markers.map((marker) => marker.side).filter(Boolean));
  return [
    sides.has('front') && 'front',
    sides.has('back') && 'back',
  ].filter(Boolean);
};

const resolveBodyDiagramSummaryViewKeys = (form, systemKey) => {
  if (!systemKey) return [];
  const markers = form.bodyMarkers?.[systemKey] || [];
  const drawings = form.bodyDrawings?.[systemKey] || [];
  const viewKeys = new Set();

  markers.forEach((marker) => {
    if (marker.viewKey) viewKeys.add(marker.viewKey);
  });
  markerFallbackViewKeys(markers.filter((marker) => !marker.viewKey))
    .forEach((viewKey) => viewKeys.add(viewKey));
  drawings.forEach((drawing) => {
    if (drawing.viewKey) viewKeys.add(drawing.viewKey);
  });

  return EXAM_VIEW_TABS
    .filter((tab) => viewKeys.has(tab.key))
    .map((tab) => tab.key);
};

const HistoryInfoBadge = ({ label, badgeStyle, badgeLabel }) => (
  <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-100)', maxWidth: 640 }}>
    <span style={{
      color: 'var(--text-content-tertiary)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs)',
      fontWeight: 'var(--type-weight-medium)',
      lineHeight: 1.5,
      whiteSpace: 'nowrap',
    }}
    >
      {label}
    </span>
    <ColorfulBadge
      style={badgeStyle}
      size='small'
      hierarchy='secondary'
      width='hug'
      className='self-start'
      showDot={false}
      showIcon={false}
    >
      {badgeLabel}
    </ColorfulBadge>
  </div>
);

const HistoryFieldRow = ({ padEnd = false, children }) => (
  <div
    className={`flex w-full ${padEnd ? 'items-center' : 'items-start'}`}
    style={{ gap: 'var(--dim-space-600)' }}
  >
    {children}
    {padEnd && (
      <div className='flex-1 min-w-0 opacity-0 pointer-events-none' aria-hidden />
    )}
  </div>
);

const HistoryInnerCard = ({ title, children }) => (
  <div
    className='flex flex-col w-full'
    style={{
      gap: 'var(--dim-space-600)',
      padding: 'var(--dim-space-600)',
      borderRadius: 'var(--dim-radius-400)',
      background: 'var(--surface-card-100)',
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
    }}
  >
    <span style={HISTORY_CARD_TITLE_STYLE}>{title}</span>
    {children}
  </div>
);

const AllergyCard = ({ index, entry, recordLabel = 'ยาตัวที่' }) => (
  <HistoryInnerCard title={`${recordLabel} ${index + 1}`}>
    <HistoryFieldRow>
      <HistoryInfoText label='ชื่อยา/ปัญหาที่แพ้' value={entry.name} />
      <HistoryInfoBadge
        label='ระดับความรุนแรง (Severity)'
        badgeStyle={resolveSeverityBadgeStyle(entry.severity)}
        badgeLabel={entry.severity}
      />
      <HistoryInfoBadge
        label='ระดับความน่าจะเป็น (Probability)'
        badgeStyle={resolveLikelihoodBadgeStyle(entry.probability)}
        badgeLabel={entry.probability}
      />
    </HistoryFieldRow>
    <HistoryFieldRow padEnd>
      <HistoryInfoText label='อาการ' value={entry.symptom} />
      <HistoryInfoText label='หมายเหตุ' value={entry.note} />
    </HistoryFieldRow>
  </HistoryInnerCard>
);

const ChronicDiseaseCard = ({ index, entry, recordLabel = 'โรคประจำตัวที่' }) => (
  <HistoryInnerCard title={`${recordLabel} ${index + 1}`}>
    <HistoryFieldRow>
      <HistoryInfoText label='โรคประจำตัว' value={entry.name} />
      <HistoryInfoBadge
        label='ระดับความรุนแรง (Severity)'
        badgeStyle={resolveSeverityBadgeStyle(entry.severity)}
        badgeLabel={entry.severity}
      />
      <HistoryInfoBadge
        label='สถานะการรักษา (Treatment Status)'
        badgeStyle={resolveTreatmentStatusBadgeStyle(entry.status)}
        badgeLabel={entry.status}
      />
    </HistoryFieldRow>
    <HistoryFieldRow padEnd>
      <HistoryInfoText label='อาการ' value={entry.symptom} />
      <HistoryInfoText label='หมายเหตุ' value={entry.note} />
    </HistoryFieldRow>
  </HistoryInnerCard>
);

/* ผลการ X-ray / RIS — the doctor-side view of this patient's radiology
   reports (TOR §1.12.6.4 "ดูผลเอกซเรย์ย้อนหลังได้", read from the CPOE
   record instead of making the doctor open the RIS worklist).

   Only รายงานผลแล้ว / ยืนยันผลแล้ว rows appear: a study that has not been
   read yet carries no result, and showing it here would imply otherwise.
   ยืนยันผลแล้ว is the clinically citable state, so an unverified report is
   labelled as such rather than silently mixed in. Newest first — the most
   recent film is what the doctor is comparing against. */
/* เลือกภาพฟิล์มแทนจากบริเวณที่ตรวจ — ต้นแบบยังไม่มี PACS/DICOMweb จริง จึงใช้
   ภาพแทนแบบ stylized ใน public/images/films/ (ดู treatmentImagingHistory.js) */
const filmForRegion = (text) => {
  const t = String(text || '');
  if (/เข่า|knee/i.test(t)) return FILM_ASSETS.knee;
  if (/ท้อง|KUB|abdomen/i.test(t)) return FILM_ASSETS.kub;
  if (/สันหลัง|spine|เอว|L-S/i.test(t)) return FILM_ASSETS.lsspine;
  return FILM_ASSETS.cxr;
};

const FilmThumb = ({ src, label }) => (
  <figure className='flex flex-col shrink-0' style={{ gap: 'var(--dim-space-150)', margin: 0 }}>
    <img
      src={src}
      alt={label}
      loading='lazy'
      style={{
        width: 108, height: 135, objectFit: 'cover',
        borderRadius: 'var(--dim-radius-300)',
        border: 'var(--dim-stroke-100) solid var(--border-neutral-tertiary)',
        background: 'var(--surface-neutral-secondary, #1B2227)',
      }}
    />
    <figcaption style={{
      color: 'var(--text-content-tertiary)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs)',
      maxWidth: 108,
    }}>{label}</figcaption>
  </figure>
);

const XrayHistoryTabPanel = ({ patient }) => {
  const rows = useMemo(() => {
    const hn = patient?.hn;
    if (!hn) return [];
    return XRAY_ORDERS
      .filter((o) => o.hn === hn && (o.status === 'verified' || o.status === 'reported'))
      .map(withExamLabel)
      .sort((a, b) => String(b.verifiedAt || b.reportedAt || '')
        .localeCompare(String(a.verifiedAt || a.reportedAt || '')));
  }, [patient?.hn]);

  if (rows.length === 0) {
    return (
      <SummaryPanel title='ผลการตรวจทางรังสีวิทยา'>
        <span style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
        }}>
          ไม่พบผลการตรวจทางรังสีวิทยาของผู้รับบริการรายนี้
        </span>
      </SummaryPanel>
    );
  }

  return (
    <SummaryPanel title={`ผลการตรวจทางรังสีวิทยา (${rows.length} รายการ)`}>
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        {rows.map((r) => (
          <div
            key={r.id}
            className='flex w-full'
            style={{
              gap: 'var(--dim-space-400)',
              paddingTop: 'var(--dim-space-400)',
              paddingRight: 'var(--dim-space-400)',
              paddingBottom: 'var(--dim-space-400)',
              paddingLeft: 'var(--dim-space-400)',
              borderRadius: 'var(--dim-radius-400)',
              border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
              background: 'var(--surface-card-100)',
            }}
          >
            <FilmThumb
              src={filmForRegion(`${r.regionLabel} ${r.examLabel}`)}
              label={r.regionLabel || r.examLabel}
            />
            <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-200)', flex: 1 }}>
            <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-200)' }}>
              <span style={{
                color: 'var(--text-content-default)',
                fontFamily: 'var(--type-family-heading-content)',
                fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                fontSize: 'var(--type-size-sm)',
              }}>
                {r.examLabel}
              </span>
              {/* ประเภทผลตรวจ (TOR §1.12.6.9) — text + colour, never colour alone. */}
              <StatusBadge style={r.resultTypeColor || 'neutral'} size='small'>
                {r.resultTypeLabel || 'ยังไม่ระบุประเภทผล'}
              </StatusBadge>
              {r.status === 'reported' ? (
                <StatusBadge style='warning' size='small'>รอยืนยันผล</StatusBadge>
              ) : null}
            </div>

            <div className='flex items-center flex-wrap w-full' style={{
              gap: 'var(--dim-space-300)',
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
            }}>
              <span>เลข XN {r.xn}</span>
              <span>{r.modalityLabel}</span>
              <span>{r.regionLabel}</span>
              <span>อ่านผล {r.verifiedAt || r.reportedAt}</span>
              <span>โดย {r.radiologist || '—'}</span>
            </div>

            {r.impression ? (
              <HistoryInfoText label='Impression' value={r.impression} />
            ) : null}
            </div>
          </div>
        ))}
      </div>
    </SummaryPanel>
  );
};

/* Same read-only medical-history chrome as Step 1 — reused by Step 6
   "ประวัติการรักษา" modal (Figma PHCIS | Appointment 4034:3723). */
/* `form` / `setForm` / `onStepChange` เป็น optional เพื่อความเข้ากันได้ย้อนหลัง:
   Step 6 และ ANC เรียก layout นี้โดยไม่ส่ง form มา — แท็บ EMR §1.4 ที่ต้องใช้
   form จะ fallback เป็น object ว่างแทนที่จะพัง */
/* สองแกนของประวัติการรักษา — เดิมมีทั้งคู่บนจอพร้อมกัน (รายวันที่อยู่ราง
   ซ้าย · รายการตรวจเป็นชิปด้านบน) แต่ไม่มีอะไรบอกว่าแกนไหนเป็นตัวนำ
   ป๊อปอัปจึงมีตัวสลับให้เลือก โดยตั้งต้นที่ "ดูตามรายการตรวจ" ซึ่งเป็นวิธีที่
   หมอเปิดดูจริง (อยากรู้ว่าผลแล็บ/ภาพรังสีของคนนี้เป็นอย่างไร มากกว่าอยากรู้
   ว่าวันที่ 8 ม.ค. เกิดอะไรขึ้น) — มติผู้ใช้ 28 ส.ค. 69 */
/* แถวชิปหมวดยาวเกินความกว้างเสมอ เดิมตัดขึ้นบรรทัดใหม่ทำให้กินความสูงสองแถว
   ตอนนี้เลื่อนแนวนอนได้ พร้อมปุ่มลูกศรสองข้างที่โผล่เฉพาะตอนยังเลื่อนต่อได้
   (มติผู้ใช้ 28 ส.ค. 69) */
const ChipScroller = ({ children }) => {
  const ref = useRef(null);
  const [edge, setEdge] = useState({ left: false, right: false });

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdge({ left: el.scrollLeft > 2, right: el.scrollLeft < max - 2 });
  }, []);

  useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return undefined;
    el.addEventListener('scroll', sync, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null;
    ro?.observe(el);
    return () => { el.removeEventListener('scroll', sync); ro?.disconnect(); };
  }, [sync, children]);

  const nudge = (dir) => () => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.7), behavior: 'smooth' });
  };

  const arrow = (side) => (
    <button
      type='button'
      onClick={nudge(side === 'left' ? -1 : 1)}
      aria-label={side === 'left' ? 'เลื่อนหมวดไปทางซ้าย' : 'เลื่อนหมวดไปทางขวา'}
      className='shrink-0 inline-flex items-center justify-center'
      style={{
        width: 28, height: 28,
        borderRadius: 'var(--dim-radius-full, 9999px)',
        border: 'var(--dim-stroke-100) solid var(--border-neutralbutton-tertiary)',
        background: 'var(--surface-neutralbutton-default, #FFFFFF)',
        color: 'var(--text-neutralbutton-default)',
        cursor: 'pointer',
      }}
    >
      <Sym name={side === 'left' ? 'chevron_left' : 'chevron_right'} size={18} />
    </button>
  );

  return (
    <div className='flex items-center w-full shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
      {edge.left ? arrow('left') : null}
      <div
        ref={ref}
        className='flex flex-nowrap items-center overflow-x-auto'
        style={{ gap: 'var(--dim-space-200)', flex: 1, scrollbarWidth: 'none' }}
      >
        {children}
      </div>
      {edge.right ? arrow('right') : null}
    </div>
  );
};

const HISTORY_VIEW_MODES = [
  { key: 'order', label: 'ดูตามรายการตรวจ' },
  { key: 'date', label: 'ดูตามวันที่รับบริการ' },
];

export const MedicalHistoryReadOnlyLayout = ({
  patient, hideSectionTitle = false, independentScroll = false,
  /** แสดงตัวสลับแกน (ป๊อปอัปประวัติการรักษาใช้ · ขั้นในหน้าคลินิกไม่ใช้) */
  viewModes = false,
  form = null, setForm = null, onStepChange = null,
  /* CPOE §1.5 — /treat/record มี 8 ขั้นแล้ว (แทรก SOAP Note) ทำให้ index
     ของ "สั่งการรักษา" เลื่อนจาก 4 → 5. ผู้เรียกที่ส่ง `stepIndexes` มา
     (TreatmentFormPage) จะได้ index ที่ถูกต้อง ส่วนคลินิกอื่นที่ยังใช้ 7 ขั้น
     (NCD ฯลฯ) ไม่ส่งมา จึง fallback เป็นค่าคงที่เดิม — พฤติกรรมไม่เปลี่ยน */
  stepIndexes = null,
}) => {
  /* ใช้เปิดทะเบียนการส่งต่อจากแท็บ "ประวัติการส่งต่อ" (TOR §1.4.3.4).
     layout นี้อยู่ใต้ Router เสมอ (ทั้ง /treat/record และ modal ของ Step 6) */
  const historyNav = useHistory();
  const pastVisits = useMemo(() => findVisitDetailsByHn(patient?.hn), [patient?.hn]);
  const hasCurrentVisit = Boolean(form);
  const visits = useMemo(() => {
    if (!hasCurrentVisit) return pastVisits;
    return [
      {
        ...pastVisits[0],
        date: 'ครั้งนี้ (กำลังรักษา)',
        isCurrent: true,
        center: pastVisits[0]?.center ?? 'ศูนย์ 8 บางนา',
      },
      ...pastVisits,
    ];
  }, [hasCurrentVisit, pastVisits]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState('order');
  /* โหมด "ตามรายการตรวจ" ซ่อนรางวันที่ — แผงที่ผูกกับครั้งเดียว (ภาพรวมการรักษา ·
     ผลแล็บ · ตรวจร่างกาย · วินิจฉัย · สรุปคัดกรอง) ได้ตัวเลือกวันที่แบบดรอปดาวน์
     ไว้ในแผงแทน ส่วนแผงที่รวมข้ามครั้งอยู่แล้ว (X-ray · เปรียบเทียบแล็บ/รังสี ·
     วัคซีน · ส่งต่อ) ไม่ต้องเลือกวันที่เลย */
  const byOrder = viewModes && viewMode === 'order';
  const selected = visits[selectedIndex] ?? visits[0];
  const isCurrentVisit = Boolean(selected?.isCurrent);

  const dateItems = useMemo(
    () => visits.map((v, i) => ({
      id: `${v.date}-${i}`,
      date: v.date,
      center: v.center,
    })),
    [visits],
  );

  const activeTabLabel = HISTORY_TABS[activeTab];

  return (
    <div
      className='flex flex-col w-full min-w-0'
      style={{
        gap: 'var(--dim-space-400)',
        /* ตัวเลื่อนมีตัวเดียวคือชั้นนอกนี้ (มติผู้ใช้ 29 ส.ค. 69) — เดิมแผงขวา
           เลื่อนเอง ตัวสลับแกนที่อยู่ในแผงจึงถูกจัดกึ่งกลางของแผงขวา ซึ่งกว้าง
           ไม่เท่ากันเมื่อรางวันที่โผล่/หาย ปุ่มเลยกระโดดซ้าย-ขวาทุกครั้งที่สลับ
           พอชั้นนอกเป็นตัวเลื่อน ตัวสลับแกนอยู่บนความกว้างเต็มของป๊อปอัปเสมอ
           รางวันที่ใช้ sticky แทนการเลื่อนเอง แถบหัวข้อ sticky ในแผงขวาก็ยัง
           ทำงานเพราะ sticky ยึดกับตัวเลื่อนที่ใกล้ที่สุดคือชั้นนอก */
        ...(independentScroll
          ? { flex: 1, minHeight: 0, height: '100%', overflowY: 'auto', overflowX: 'hidden' }
          : null),
      }}
    >

    {/* ตัวสลับแกนบนความกว้างเต็ม เหนือทั้งสองแผง — จุดกึ่งกลางจึงนิ่งไม่ว่า
        รางวันที่จะมีหรือไม่ และยังเลื่อนหายขึ้นไปพร้อมเนื้อหาตามเดิม */}
    {viewModes && (
      <div className='flex w-full justify-center shrink-0'>
        <TabBar aria-label='มุมมองประวัติการรักษา'>
          {HISTORY_VIEW_MODES.map((m) => (
            <TabPill
              key={m.key}
              size='small'
              selected={viewMode === m.key}
              onClick={() => setViewMode(m.key)}
            >
              {m.label}
            </TabPill>
          ))}
        </TabBar>
      </div>
    )}

    <div
      className='flex w-full min-w-0 items-start'
      style={{
        gap: 'var(--dim-space-0)',
        alignItems: 'stretch',
        /* When mounted inside a popup with `bodyScrollable={false}`,
           the layout fills the body and each pane owns its own scroll.
           `min-height: 0` is required for the children's `overflow-y:
           auto` to actually trigger inside a flex container. */
        ...(independentScroll ? { flex: 1, minHeight: 0 } : null),
      }}
    >
      {/* Left rail — sticky ที่ขอบบนของตัวเลื่อนชั้นนอก และเลื่อนในตัวเองได้เมื่อ
          รายการวันยาวกว่าจอ รางจึงติดตาอยู่ขณะไล่อ่านแผงขวาลงไป */}
      {!byOrder && (
        <div
          style={
            independentScroll
              ? { flexShrink: 0, position: 'sticky', top: 0, maxHeight: '100%', overflowY: 'auto', overflowX: 'hidden' }
              : undefined
          }
        >
          <ServiceDateList
            items={dateItems}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
          />
        </div>
      )}

      <section
        className='flex flex-col flex-1 min-w-0'
        style={{
          gap: 'var(--dim-space-500)',
          ...(hideSectionTitle
            ? {
                paddingTop: 0,
                paddingRight: 0,
                paddingBottom: 0,
                paddingLeft: 24,
              }
            : { padding: 'var(--dim-space-600)' }),
          /* แผงขวาไม่เลื่อนเองแล้ว — ชั้นนอกเป็นตัวเลื่อน (ดูคำอธิบายที่ชั้นนอก) */
          ...(independentScroll
            ? {
                minHeight: 0,
                paddingTop: 'var(--dim-space-200)',
                paddingRight: 'var(--dim-space-400)',
                paddingBottom: 'var(--dim-space-600)',
                paddingLeft: 'var(--dim-space-600)',
              }
            : null),
        }}
      >
        {!hideSectionTitle && (
          <SectionTitle icon='description'>ประวัติการรักษา (Medical History)</SectionTitle>
        )}

        {/* แถบหัวข้อ sticky ที่ขอบบนของแผงที่เลื่อน — ไล่อ่านไทม์ไลน์ยาวแล้วยังสลับ
            หัวข้อได้โดยไม่ต้องเลื่อนกลับขึ้นไป พื้นทึบกันเนื้อหาลอดใต้แถบ */}
        <div
          className='w-full'
          style={independentScroll ? {
            position: 'sticky',
            top: 0,
            zIndex: 2,
            background: 'var(--surface-card-100)',
            paddingTop: 'var(--dim-space-200)',
            paddingBottom: 'var(--dim-space-200)',
            marginTop: 'calc(-1 * var(--dim-space-200))',
          } : undefined}
        >
        <ChipScroller>
          {HISTORY_TABS.map((label, i) => (
            <span key={label} className='shrink-0'>
              <TabCapsule
                variant='filter'
                label={label}
                selected={i === activeTab}
                onClick={() => setActiveTab(i)}
              />
            </span>
          ))}
        </ChipScroller>
        </div>



        {byOrder && activeTabLabel === HISTORY_TAB_PHARMACY ? (
          <MedicationTimeline visits={visits} />
        ) : byOrder && activeTabLabel === HISTORY_TAB_CONSULT ? (
          <ConsultTimeline patient={patient} />
        ) : byOrder && activeTabLabel === HISTORY_TAB_XRAY ? (
          <ImagingTimeline patient={patient} />
        ) : byOrder && activeTabLabel === HISTORY_TAB_VACCINE ? (
          <VaccineDoseTimeline patient={patient} form={form} />
        ) : byOrder && activeTabLabel === HISTORY_TAB_REFER ? (
          <ReferralTimeline patient={patient} />
        ) : byOrder && DATE_SCOPED_HISTORY_TABS.has(activeTabLabel) ? (
          <VisitFieldTimeline visits={visits} tabLabel={activeTabLabel} />
        ) : activeTabLabel === HISTORY_TAB_PHARMACY ? (
          <MedicationTimeline visits={visits} />
        ) : activeTabLabel === HISTORY_TAB_CONSULT ? (
          <ConsultTimeline patient={patient} />
        ) : activeTabLabel === HISTORY_TAB_XRAY ? (
          <XrayHistoryTabPanel patient={patient} />
        ) : activeTabLabel === HISTORY_TAB_LABRAD ? (
          <LabRadiologyResultsPanel
            patient={patient}
            onGoToOrders={onStepChange
              ? () => onStepChange(stepIndexes?.orders ?? STEP_ORDERS_INDEX)
              : undefined}
          />
        ) : activeTabLabel === HISTORY_TAB_VACCINE ? (
          <VaccineGrowthPanel patient={patient} form={form || {}} section='vaccine' />
        ) : activeTabLabel === HISTORY_TAB_GROWTH ? (
          <VaccineGrowthPanel patient={patient} form={form || {}} section='growth' />
        ) : activeTabLabel === HISTORY_TAB_REFER ? (
          /* TOR §1.4.3.4 — อ่านจาก store เดียวกับ /treat/refer ไม่มีสำเนาข้อมูล */
          <ReferralHistoryPanel
            patient={patient}
            onOpenRegister={() => historyNav.push('/treat/refer')}
          />
        ) : activeTabLabel === HISTORY_TAB_LAB ? (
          <VisitJourneyStagePanel
            patient={patient}
            visitDate={isCurrentVisit ? 'ครั้งนี้' : selected.date}
            visitDetail={selected}
            form={form}
            isCurrentVisit={isCurrentVisit}
            stageKey='orders'
            listKey='labs'
            title='ผลการตรวจแล็บ'
            emptyTitle='ยังไม่มีผลแล็บสำหรับครั้งนี้'
          />
        ) : activeTabLabel === HISTORY_TAB_EXAM ? (
          <VisitJourneyStagePanel
            patient={patient}
            visitDate={isCurrentVisit ? 'ครั้งนี้' : selected.date}
            visitDetail={selected}
            form={form}
            isCurrentVisit={isCurrentVisit}
            stageKey='exam'
            title='ผลการตรวจร่างกาย'
          />
        ) : activeTabLabel === HISTORY_TAB_DX ? (
          <VisitJourneyStagePanel
            patient={patient}
            visitDate={isCurrentVisit ? 'ครั้งนี้' : selected.date}
            visitDetail={selected}
            form={form}
            isCurrentVisit={isCurrentVisit}
            stageKey='diagnosis'
            title='ผลการวินิจฉัย'
          />
        ) : (
        <>
        {/* สัญญาณชีพเป็นแถวเดียว (`single`) แทนกริด 5×2 ของ `tablet` — ประหยัด
            ความสูงไปครึ่งหนึ่ง และค่าทั้ง 9 อ่านไล่ไปทางเดียวได้ในสายตาเดียว
            อาการป่วย + Pain score วางคู่กันเป็นสองคอลัมน์แทนการซ้อนกันเต็มแถว
            (มติผู้ใช้ 28 ส.ค. 69) */}
        <VitalsSignHorizontalPanel
          key={selected.date}
          layout='single'
          measurementRounds={selected.measurementRounds ?? DEFAULT_MEASUREMENT_ROUNDS}
          graphSubtitle={selected.date ? `การวัด — ${selected.date}` : undefined}
        />

        <div
          className='grid w-full'
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'var(--dim-space-400)',
            alignItems: 'start',
          }}
        >
          <SummaryPanel title='อาการป่วย'>
            <div className='flex w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <HistoryInfoText label='อาการ (Chief Complaint)' value={selected.cc} />
              <HistoryInfoText label='ระยะเวลาที่มีอาการ (Duration of Illness)' value={selected.duration} />
            </div>
          </SummaryPanel>

          <SummaryPanel title='ระดับความเจ็บปวด (Pain Score)'>
            <PainTile pain={selected.pain} />
          </SummaryPanel>
        </div>

        <SummaryPanel title='ประวัติการแพ้ยา / สารเคมี'>
          {/* คอลัมน์เดียว — สองใบต่อแถวทำให้ป้าย "ระดับความรุนแรง (Severity)" กับ
              "ระดับความน่าจะเป็น (Probability)" ทับกันจนอ่านไม่ออก
              (มติผู้ใช้ 28 ส.ค. 69) */}
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            {selected.allergies.map((entry, i) => (
              <AllergyCard key={`allergy-${i}`} index={i} entry={entry} />
            ))}
          </div>
        </SummaryPanel>

        <SummaryPanel title='ประวัติโรคประจำตัว (Underlying Disease / Congenital Disease)'>
          {/* คอลัมน์เดียว — สองใบต่อแถวทำให้ป้าย "ระดับความรุนแรง (Severity)" กับ
              "ระดับความน่าจะเป็น (Probability)" ทับกันจนอ่านไม่ออก
              (มติผู้ใช้ 28 ส.ค. 69) */}
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            {selected.chronicDiseases.map((entry, i) => (
              <ChronicDiseaseCard key={`chronic-${i}`} index={i} entry={entry} />
            ))}
          </div>
        </SummaryPanel>
        </>
        )}
      </section>
    </div>
    </div>
  );
};

export const Step1History = ({ patient, form, setForm, onStepChange, stepIndexes }) => (
  <MedicalHistoryReadOnlyLayout
    patient={patient}
    form={form}
    setForm={setForm}
    onStepChange={onStepChange}
    stepIndexes={stepIndexes}
  />
);

/* ─────────────────────────────────────────────────────────────
   Step 2 — คัดกรองและซักประวัติ (Screening) · Figma PHCIS | CPOE 183:14937
   Read-only summary of the latest OPD screening.
     • 4 capsule tabs (ผลการคัดกรอง · การแพ้ยา · โรคประจำตัว · แบบประเมิน)
     • Vitals panel (ครั้งที่วัด tag + ดูแบบกราฟ + 9-tile grid)
     • อาการป่วย (2-col)
     • ความเร่งด่วน + สภาพของผู้รับบริการ (2-col)
     • ระดับความเจ็บปวด + คำสั่งการพยาบาลและการสังเกตอาการ (2-col)
     • Assessor row (avatar + role + name)
   ───────────────────────────────────────────────────────────── */

/* หัวข้อล้อแท็บของจุดคัดกรองแบบหนึ่งต่อหนึ่ง — ขั้นที่ 3 ของ /opd/screening มี
   5 หมวด (แพ้ยา · แพ้อาหาร · แพ้สารเคมี · โรคประจำตัว · อื่น ๆ) และขั้นที่ 4 คือ
   พฤติกรรมสุขภาพ ฝั่งแพทย์เคยยุบสี่หมวดแรกเป็น "การแพ้ยา / สารเคมี" อันเดียว
   ทำให้หาไม่เจอว่าที่พยาบาลกรอกไว้อยู่หมวดไหน (มติผู้ใช้ 28 ส.ค. 69) */
const SCREENING_ALLERGY_TABS = [
  { label: 'แพ้ยา', topic: 'drug', title: 'ประวัติการแพ้ยา', recordLabel: 'ยาตัวที่' },
  { label: 'แพ้อาหาร', topic: 'food', title: 'ประวัติการแพ้อาหาร', recordLabel: 'อาหารที่' },
  { label: 'แพ้สารเคมี', topic: 'chemical', title: 'ประวัติการแพ้สารเคมี', recordLabel: 'สารเคมีที่' },
  { label: 'โรคประจำตัว', topic: 'disease', title: 'ประวัติโรคประจำตัว (Underlying Disease)', recordLabel: 'โรคประจำตัวที่', chronic: true },
  { label: 'อื่น ๆ', topic: 'other', title: 'ประวัติการแพ้อื่น ๆ', recordLabel: 'รายการที่' },
];

const SCREENING_TABS = [
  'ผลการคัดกรอง',
  ...SCREENING_ALLERGY_TABS.map((t) => t.label),
  'พฤติกรรมสุขภาพ',
];

const TriageBadge = ({ triage }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
    <ColorfulBadge style={triage.tone} size='default' hierarchy='secondary'>
      {`Level ${triage.level}`}
    </ColorfulBadge>
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
      <span style={{
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
      }}>{triage.label}</span>
      <span style={{
        color: 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
      }}>{triage.subLabel}</span>
    </div>
  </div>
);

/* หนึ่งหมวดของประวัติการแพ้/โรคประจำตัว ตามแท็บของจุดคัดกรอง */
const ScreeningTopicPanel = ({ tab, data }) => {
  const records = data?.records ?? [];
  const Card = tab.chronic ? ChronicDiseaseCard : AllergyCard;
  return (
    <SummaryPanel title={tab.title}>
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        {records.length > 0
          ? records.map((entry, i) => (
            <Card key={`${tab.topic}-${i}`} index={i} entry={entry} recordLabel={tab.recordLabel} />
          ))
          : (
            <ValueText>
              {data?.denied
                ? `พยาบาลระบุว่าผู้รับบริการไม่มี${tab.label === 'โรคประจำตัว' ? 'โรคประจำตัว' : tab.label.replace('แพ้', 'ประวัติการแพ้')}`
                : `ยังไม่ได้บันทึก${tab.title}`}
            </ValueText>
          )}
      </div>
    </SummaryPanel>
  );
};

const AllergyHistoryPanel = ({ allergies = [], denied = false }) => (
  <SummaryPanel title='ประวัติการแพ้ยา / สารเคมี'>
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      {allergies.length > 0
        ? allergies.map((entry, i) => (
          <AllergyCard key={`allergy-${i}`} index={i} entry={entry} />
        ))
        /* "ระบุว่าไม่แพ้" คือคำตอบ ไม่ใช่ช่องว่าง — หมอต้องอ่านออกว่าถามแล้ว */
        : <ValueText>{denied ? 'พยาบาลระบุว่าผู้รับบริการไม่มีประวัติการแพ้' : 'ยังไม่ได้บันทึกประวัติการแพ้'}</ValueText>}
    </div>
  </SummaryPanel>
);

const ChronicHistoryPanel = ({ chronicDiseases = [], denied = false }) => (
  <SummaryPanel title='ประวัติโรคประจำตัว (Underlying Disease / Congenital Disease)'>
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      {chronicDiseases.length > 0
        ? chronicDiseases.map((entry, i) => (
          <ChronicDiseaseCard key={`chronic-${i}`} index={i} entry={entry} />
        ))
        : <ValueText>{denied ? 'พยาบาลระบุว่าผู้รับบริการไม่มีโรคประจำตัว' : 'ยังไม่ได้บันทึกโรคประจำตัว'}</ValueText>}
    </div>
  </SummaryPanel>
);

const ScreeningSummaryBody = ({ summary }) => {
  const vitalItems = (summary.vitalItems || []).filter((item) => item.value);
  return (
    <>
    <SummaryPanel title='สัญญาณชีพล่าสุด'>
      {vitalItems.length > 0 ? (
        /* ป้ายกำกับกับค่าอยู่บรรทัดเดียวกัน ซ้าย-ขวา — เดิมซ้อนกันสองบรรทัดต่อค่า
            กินความสูงเป็นเท่าตัวและเหลือที่ว่างด้านขวาเปล่า ๆ (มติผู้ใช้ 28 ส.ค. 69) */
        <div
          className='grid w-full'
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            columnGap: 'var(--dim-space-500)',
          }}
        >
          {vitalItems.map((item) => (
            <div
              key={item.label}
              className='flex items-baseline w-full'
              style={{
                gap: 'var(--dim-space-300)',
                paddingTop: 'var(--dim-space-150)',
                paddingBottom: 'var(--dim-space-150)',
                borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
              }}
            >
              <span style={{
                color: 'var(--text-content-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                lineHeight: 1.5,
              }}>{item.label}</span>
              <span className='ml-auto text-right' style={{
                color: 'var(--text-content-default)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                lineHeight: 1.5,
              }}>{item.value}</span>
            </div>
          ))}
        </div>
      ) : <ValueText>ยังไม่มีค่าสัญญาณชีพที่บันทึก</ValueText>}
    </SummaryPanel>

    <SummaryPanel title='อาการป่วย'>
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <div className='flex w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <HistoryInfoText label='อาการ (Chief Complaint)' value={summary.cc || '—'} />
          <HistoryInfoText label='ระยะเวลาที่มีอาการ (Duration of Illness)' value={summary.duration || '—'} />
        </div>
        {/* พยาบาลพิมพ์ประวัติปัจจุบันไว้ตั้งแต่ขั้นคัดกรอง แต่ไม่เคยถูกแสดงฝั่งแพทย์
            ทั้งที่เป็นเนื้อความยาวที่สุดของการซักประวัติ (28 ส.ค. 69) */}
        <HistoryInfoText
          label='ประวัติการเจ็บป่วยปัจจุบัน (Present Illness)'
          value={summary.presentIllness || '—'}
        />
      </div>
    </SummaryPanel>

    {summary.triage && (
      <SummaryPanel title='ความเร่งด่วน'>
        <TriageBadge triage={summary.triage} />
      </SummaryPanel>
    )}

    <div className='flex w-full' style={{ gap: 'var(--dim-space-400)' }}>
      <SummaryPanel title='ระดับความเจ็บปวด (Pain Score)'>
        {summary.pain ? <PainTile pain={summary.pain} /> : <ValueText>—</ValueText>}
      </SummaryPanel>
      <SummaryPanel title='คำสั่งการพยาบาลและการสังเกตอาการ'>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
          {summary.orders.length > 0
            ? summary.orders.map((order, i) => <ValueText key={i}>{order}</ValueText>)
            : <ValueText>—</ValueText>}
        </div>
      </SummaryPanel>
    </div>

    {(summary.cert !== null && summary.cert !== undefined) || summary.bedId ? (
      <SummaryPanel title='สิ่งที่จุดคัดกรองระบุไว้'>
        <div className='flex w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <HistoryInfoText
            label='ใบรับรองแพทย์'
            value={summary.cert === null || summary.cert === undefined
              ? '—'
              : (summary.cert ? 'ต้องการ' : 'ไม่ต้องการ')}
          />
          <HistoryInfoText
            label='เตียงสังเกตอาการ'
            value={summary.bedId || '—'}
          />
        </div>
      </SummaryPanel>
    ) : null}

    {summary.assessor && <AssessorRow assessor={summary.assessor} />}
    </>
  );
};

/* พฤติกรรมสุขภาพจากขั้นที่ 4 ของการคัดกรอง (ToR 1.2.2.6) — เดิมแท็บ
   "แบบประเมิน" ฝั่งแพทย์เป็นขีดกลางค้างไว้ ทั้งที่พยาบาลกรอกไว้แล้ว */
const BEHAVIOUR_LABELS = {
  smoking: 'การสูบบุหรี่',
  alcohol: 'การดื่มแอลกอฮอล์',
  exercise: 'การออกกำลังกาย',
};

const BehaviourPanel = ({ behaviour }) => {
  const rows = Object.keys(BEHAVIOUR_LABELS)
    .map((key) => ({ label: BEHAVIOUR_LABELS[key], value: behaviour?.[key] || '' }))
    .filter((r) => r.value);
  return (
    <SummaryPanel title='พฤติกรรมสุขภาพ (Health Behaviour)'>
      {rows.length > 0 || behaviour?.detail ? (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          {rows.length > 0 && (
            <div className='grid grid-cols-3 w-full' style={{ gap: 'var(--dim-space-300)' }}>
              {rows.map((r) => (
                <HistoryInfoText key={r.label} label={r.label} value={r.value} />
              ))}
            </div>
          )}
          {behaviour?.detail && (
            <HistoryInfoText label='รายละเอียดเพิ่มเติม' value={behaviour.detail} />
          )}
        </div>
      ) : <ValueText>ยังไม่ได้บันทึกพฤติกรรมสุขภาพ</ValueText>}
    </SummaryPanel>
  );
};

const AssessorRow = ({ assessor }) => (
  <div className='flex items-center' style={{
    gap: 'var(--dim-space-300)',
    paddingTop: 'var(--dim-space-300)',
  }}>
    <img
      src={assessor.avatarUrl}
      alt=''
      className='shrink-0'
      style={{
        width: 40, height: 40,
        borderRadius: '50%',
        objectFit: 'cover',
        background: 'var(--surface-neutral-quaternary)',
      }}
      aria-hidden
    />
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
      <span style={{
        color: 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
      }}>{assessor.role}</span>
      <ValueText>{assessor.name}</ValueText>
    </div>
  </div>
);

/* `patient` มาแล้วจะอ่านผลคัดกรองรอบล่าสุดของ HN นั้นจาก `/opd/screening`
   (จุดคัดกรองที่เดียวของระบบ) — ไม่มีข้อมูลจริงจะแสดง empty state ที่ชัดเจน
   `title` ให้คลินิกพิเศษเปลี่ยนหัวข้อเป็น "ผลคัดกรองจากจุดคัดกรอง" ได้ */
export const Step2Screening = ({ patient, title = 'คัดกรองและซักประวัติ (Screening)' }) => {
  const summary = useMemo(
    () => getCarriedScreening(patient || {}),
    [patient],
  );
  const [activeTab, setActiveTab] = useState(0);
  return (
    /* เนื้อหาเดิมชนขอบการ์ดทั้งสี่ด้าน — เว้นระยะรอบให้เท่ากับการ์ดอื่นในขั้นตอน
       (มติผู้ใช้ 28 ส.ค. 69) */
    <section
      className='flex flex-col w-full'
      style={{ gap: 'var(--dim-space-500)', padding: 'var(--dim-space-500)' }}
    >
      <SectionTitle icon='description'>{title}</SectionTitle>

      <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        {SCREENING_TABS.map((label, i) => (
          <TabCapsule
            key={label}
            variant='filter'
            label={label}
            selected={i === activeTab}
            onClick={() => setActiveTab(i)}
          />
        ))}
      </div>

      {activeTab === 0 && (
        summary.captured
          ? <ScreeningSummaryBody summary={summary} />
          : (
            <Alert
              type='warning'
              title='ยังไม่มีผลคัดกรองสำหรับการเข้ารับบริการครั้งนี้'
              subtext='กรุณาส่งผู้รับบริการไปจุดคัดกรองก่อนเริ่มตรวจรักษา ข้อมูลตัวอย่างจะไม่ถูกนำมาแสดงแทนข้อมูลจริง'
            />
          )
      )}
      {activeTab >= 1 && activeTab <= SCREENING_ALLERGY_TABS.length && (() => {
        const tab = SCREENING_ALLERGY_TABS[activeTab - 1];
        return <ScreeningTopicPanel tab={tab} data={summary.allergyTopics?.[tab.topic]} />;
      })()}
      {activeTab === SCREENING_ALLERGY_TABS.length + 1 && (
        <BehaviourPanel behaviour={summary.behaviour} />
      )}
    </section>
  );
};

/* Persistent quick-look rail for the doctor's OPD record. This deliberately
   keeps only safety-critical screening facts; Step 2 remains available for
   the complete read-only screening record and its four detail tabs. */
const ScreeningRailMetric = ({ label, value }) => (
  <div
    className='flex flex-col min-w-0'
    style={{
      gap: 'var(--dim-space-050, 2px)',
      padding: 'var(--dim-space-300, 12px)',
      borderRadius: 'var(--dim-radius-300, 12px)',
      background: 'var(--surface-neutral-quaternary, #F9FBFB)',
    }}
  >
    <span style={{
      color: 'var(--text-content-tertiary, #697077)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs, 12px)',
    }}>
      {label}
    </span>
    <span style={{
      color: 'var(--text-content-default, #202427)',
      fontFamily: 'var(--type-family-heading-content)',
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-medium, 500)',
      overflowWrap: 'anywhere',
    }}>
      {value || '—'}
    </span>
  </div>
);

const clinicalEntryName = (entry) => (
  typeof entry === 'string' ? entry : entry?.name
);

const formatScreeningCapturedAt = (value) => {
  if (!value) return 'ไม่ระบุเวลาบันทึก';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'ไม่ระบุเวลาบันทึก';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

export const ScreeningSummaryRail = ({ patient, collapsed = false, onToggle }) => {
  const summary = useMemo(
    () => getCarriedScreening(patient || {}),
    [patient],
  );
  const vitalMetrics = (summary.vitalItems || []).filter((item) => item.value);

  return (
    <section
      className='flex flex-col w-full'
      style={{
        width: collapsed ? 'var(--dim-size-1600, 72px)' : '100%',
        gap: collapsed ? 'var(--dim-space-200, 8px)' : 'var(--dim-space-400, 16px)',
        padding: collapsed ? 'var(--dim-space-300, 12px)' : 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-500, 20px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        background: 'var(--surface-card-100, #FFFFFF)',
        boxShadow: 'var(--shadow-brand-drop-bottom-200)',
      }}
    >
      <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        {!collapsed && <span
          className='inline-flex items-center justify-center shrink-0'
          style={{
            width: 'var(--dim-size-800, 40px)',
            height: 'var(--dim-size-800, 40px)',
            borderRadius: 'var(--dim-radius-full, 9999px)',
            background: 'var(--surface-brandPrimary-quaternary, #E2F3EB)',
            color: 'var(--icon-brandPrimary-default, #007549)',
          }}
        >
          <Sym name='vital_signs' size='var(--dim-size-500, 24px)' color='currentColor' />
        </span>}
        {!collapsed && <div className='flex flex-col min-w-0 flex-1' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{
            color: 'var(--text-topic-primary-title, #007549)',
            fontFamily: 'var(--type-family-heading-content)',
            fontSize: 'var(--type-size-base, 16px)',
            fontWeight: 'var(--type-weight-medium, 500)',
          }}>
            สรุปคัดกรองและซักประวัติ
          </span>
          <span style={{
            color: 'var(--text-content-tertiary, #697077)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
          }}>
            {summary.captured
              ? `บันทึก ${formatScreeningCapturedAt(summary.capturedAt)}`
              : 'ยังไม่มีข้อมูลจากจุดคัดกรอง'}
          </span>
        </div>}
        {onToggle && (
          <NeutralSubdueIconButton
            icon={collapsed ? 'chevron_left' : 'chevron_right'}
            size='lg'
            variant='fill'
            onClick={onToggle}
            aria-label={collapsed ? 'ขยายสรุปคัดกรอง' : 'ย่อสรุปคัดกรอง'}
            aria-expanded={!collapsed}
          />
        )}
      </div>

      {!collapsed && !summary.captured && (
        <Alert
          type='warning'
          title='ยังไม่มีผลคัดกรองครั้งนี้'
          subtext='ข้อมูลตัวอย่างจะไม่ถูกนำมาแสดงแทนข้อมูลจริง'
        />
      )}

      {!collapsed && summary.captured && <>
      <div className='grid grid-cols-2' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        {vitalMetrics.map((metric) => <ScreeningRailMetric key={metric.label} {...metric} />)}
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <ScreeningRailMetric label='อาการสำคัญ' value={summary.cc} />
        <ScreeningRailMetric label='ระยะเวลาที่มีอาการ' value={summary.duration} />
      </div>

      {summary.triage && <div className='flex items-center justify-between' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <span style={{
          color: 'var(--text-content-secondary, #454B50)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
        }}>
          ระดับคัดกรอง
        </span>
        <ColorfulBadge style={summary.triage.tone} size='small' hierarchy='secondary'>
          {`Level ${summary.triage.level} · ${summary.triage.label}`}
        </ColorfulBadge>
      </div>}

      <ScreeningRailMetric label='Pain score' value={summary.pain?.label} />
      <ScreeningRailMetric
        label='ประวัติแพ้ยา / สารเคมี'
        value={(summary.allergies || []).map(clinicalEntryName).filter(Boolean).join(', ') || 'ไม่พบข้อมูล'}
      />
      <ScreeningRailMetric
        label='โรคประจำตัว'
        value={(summary.chronicDiseases || []).map(clinicalEntryName).filter(Boolean).join(', ') || 'ไม่พบข้อมูล'}
      />
      </>}
    </section>
  );
};

/* Treatment step grey panels — Figma 151:36633 · 317:29773 (บันทึกการตรวจ · บันทึกจากการตรวจร่างกาย · วินิจฉัย) */
/* พื้นขาว ไม่ใช่เทาแล้ว (มติผู้ใช้ 31 ส.ค. 69) — ตั้งแต่ขั้นวินิจฉัยแยกเป็นสอง
   คอลัมน์ พื้นเทาสองผืนวางเคียงกันอ่านเป็นสองบล็อกทึบ ๆ แข่งกับการ์ดขาวข้างใน
   (ชื่อค่าคงที่คงไว้เพื่อไม่ให้กระทบผู้เรียกอื่นที่อ้างถึงในคอมเมนต์) */
const TREATMENT_GREY_PANEL_SHELL = {
  /* ระยะห่างเท่ากับ STEP4_SECTION_SHELL ของคอลัมน์ซ้าย (มติผู้ใช้ 31 ส.ค. 69) */
  gap: 'var(--dim-space-400)',
  /* ไม่มี padding ของตัวเอง (มติผู้ใช้ 31 ส.ค. 69) — TreatmentFormShell ให้
     ระยะขอบการ์ด 24px มาแล้ว พอพาเนลเป็นพื้นขาวเหมือนการ์ด padding ซ้อนกัน
     สองชั้นจึงกลายเป็นระยะ 48px ที่ไม่มีขอบอะไรมาอธิบาย */
  padding: 0,
  borderRadius: 'var(--dim-radius-400)',
  background: 'var(--surface-card-100, #FFFFFF)',
};

const TREATMENT_PANEL_TITLE_STYLE = {
  color: 'var(--text-topic-secondary-title)',
  fontFamily: 'var(--type-family-heading-content)',
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
  fontSize: 'var(--type-size-base)',
  lineHeight: 1.5,
};

/* ─────────────────────────────────────────────────────────────
   Step 3 — ตรวจร่างกาย (Physical Examination)
   Figma PHCIS | Medical-examination 151:36633 · diagram 191:25071
   · บันทึกการตรวจ 150:36350 (grey panel)
   ───────────────────────────────────────────────────────────── */

/* การ์ดขาวหนึ่งใบต่อหนึ่งหัวข้อในขั้นตรวจร่างกาย — คุมทรงที่เดียวเพื่อให้
   ทุกใบกว้าง เว้นขอบ และวางหัวข้อเหมือนกัน */
const ExamStepCard = ({ title, children }) => (
  <section
    className='flex flex-col w-full min-w-0'
    style={{
      gap: 'var(--dim-space-400)',
      padding: 'var(--dim-space-600)',
      borderRadius: 'var(--dim-radius-400)',
      border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
      background: 'var(--surface-card-100)',
      boxShadow: 'var(--shadow-brand-drop-bottom-200)',
    }}
  >
    {title ? (
      <span style={{
        color: 'var(--text-topic-secondary-title)',
        fontFamily: 'var(--type-family-heading-content)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
        fontSize: 'var(--type-size-base)',
      }}>{title}</span>
    ) : null}
    {children}
  </section>
);

const EXAM_SUBTABS = ['บันทึกการตรวจ', 'ตรวจร่างกาย'];

export const Step3Examination = ({ form, setForm, patient }) => {
  const set = (k) => (v) => setForm((s) => ({ ...s, [k]: v }));
  /* สองงานของขั้นนี้สลับกันด้วยแท็บแคปซูล แทนการวางต่อกันลงมาให้เลื่อนยาว —
     "บันทึกการตรวจ" คือพิมพ์สิ่งที่ตรวจพบ · "ตรวจร่างกาย" คือชี้ตำแหน่งบนภาพ
     (มติผู้ใช้ 28 ส.ค. 69) */
  const [examTab, setExamTab] = useState(0);
  /* ผลตรวจชันสูตร / ผลตรวจรังสี ย้ายจากรางข้างแผนภาพร่างกายมาอยู่แถวเดียวกับแท็บ
     แล้วเปิดเป็นป๊อปอัป — รางเดิมอยู่ลึกในแท็บ "ตรวจร่างกาย" หมอที่กำลังพิมพ์
     บันทึกอยู่จึงมองไม่เห็น (มติผู้ใช้ 28 ส.ค. 69) */
  const [supportPopup, setSupportPopup] = useState('');
  /* ปุ่ม "ข้อมูลทางการแพทย์ (EMR)" ย้ายมาจากหัวการ์ดผู้ป่วย (มติผู้ใช้ 31 ส.ค. 69)
     — อยู่แถวเดียวกับผลตรวจชันสูตร/รังสี เพราะทั้งสามเปิดข้อมูลประกอบการตรวจ
     เหมือนกัน ป๊อปอัปเป็นตัวเดียวกับที่ PatientCard เคยเปิด */
  const [emrOpen, setEmrOpen] = useState(false);

  const handleCopyFromNurse = (key) => {
    const fromNurse = form.nurseExam?.[key];
    if (fromNurse == null) return;
    setForm((s) => ({
      ...s,
      doctorExam: { ...s.doctorExam, [key]: fromNurse === '-' ? '' : fromNurse },
    }));
  };

  const handleAttachmentsChange = (files) => {
    const next = Array.from(files || []).map((f, i) => ({
      id: `upload-${Date.now()}-${i}`,
      name: f.name,
      sizeBytes: f.size,
    }));
    setForm((s) => ({
      ...s,
      examAttachments: [...(s.examAttachments || []), ...next],
    }));
  };

  return (
    /* สามส่วนของขั้นนี้เป็น "การ์ดขาวคนละใบ" ที่หัวข้อของตัวเอง — สัญญาณชีพ ·
       บันทึกของแพทย์ · ตรวจร่างกาย เดิมทั้งสามซ้อนกันจนอ่านเป็นก้อนเดียว
       (มติผู้ใช้ 28 ส.ค. 69) `ExamStepCard` คุมทรงการ์ดที่เดียว ทั้งสามใบจึง
       กว้าง เว้นขอบ และมีหัวข้อในระดับเดียวกันเสมอ */
    <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      {/* การ์ดสัญญาณชีพเดี่ยว ๆ ถูกเอาออก 28 ส.ค. 69 — ค่าทั้งชุดย้ายไปอยู่ใน
          คอลัมน์ "บันทึกจากพยาบาล" ของการ์ดถัดไป พร้อมหัวข้ออื่นของจุดคัดกรอง */}
      {/* แท็บกับเนื้อหาอยู่ในการ์ดขาวใบเดียวกัน — แท็บลอยอยู่นอกการ์ดทำให้ดูเหมือน
          คุมทั้งหน้า ทั้งที่คุมเฉพาะเนื้อหาในการ์ดนี้ (มติผู้ใช้ 28 ส.ค. 69) */}
      <ExamStepCard>
        {/* จัดกึ่งกลาง — แท็บคุมทั้งการ์ด ไม่ใช่ของคอลัมน์ซ้าย (มติผู้ใช้ 28 ส.ค. 69)
            กริด `1fr auto 1fr` แทน flex-1 (มติผู้ใช้ 31 ส.ค. 69) — ของเดิมจัดแท็บ
            กึ่งกลาง "ที่ว่างที่เหลือ" หลังหักปุ่มสองใบทางขวา แท็บจึงเยื้องซ้ายจาก
            กึ่งกลางการ์ดจริงเท่ากับครึ่งหนึ่งของความกว้างปุ่ม ช่องซ้ายเปล่าที่กว้าง
            เท่าช่องขวาดันแท็บกลับมาอยู่กึ่งกลางการ์ดพอดี */}
        <div
          className='grid w-full items-center'
          style={{ gridTemplateColumns: '1fr auto 1fr', gap: 'var(--dim-space-300)' }}
        >
          <div aria-hidden />
          <div className='flex justify-center'>
            <TabBar aria-label='ส่วนของขั้นตรวจร่างกาย'>
              {EXAM_SUBTABS.map((label, i) => (
                <TabPill
                  key={label}
                  size='small'
                  selected={i === examTab}
                  onClick={() => setExamTab(i)}
                >
                  {label}
                </TabPill>
              ))}
            </TabBar>
          </div>
          <div className='flex shrink-0 items-center justify-end' style={{ gap: 'var(--dim-space-200)' }}>
            <BrandSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='history'
              onClick={() => setEmrOpen(true)}
            >
              ข้อมูลทางการแพทย์ (EMR)
            </BrandSubdueButton>
            <BrandSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='biotech'
              onClick={() => setSupportPopup('lab')}
            >
              ผลตรวจชันสูตร
            </BrandSubdueButton>
            <BrandSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='radiology'
              onClick={() => setSupportPopup('imaging')}
            >
              ผลตรวจรังสี
            </BrandSubdueButton>
          </div>
        </div>

        <MedicalHistoryPopup
          open={emrOpen}
          onClose={() => setEmrOpen(false)}
          patient={patient}
        />

        <Popup
          open={supportPopup === 'lab'}
          onClose={() => setSupportPopup('')}
          title='ผลตรวจชันสูตร'
          subtitle='ผลตรวจทางห้องปฏิบัติการและรังสีวิทยาของผู้รับบริการรายนี้'
          size='extraLarge'
          primaryAction={{ label: 'ปิด', onClick: () => setSupportPopup('') }}
        >
          <LabRadiologyResultsPanel patient={patient} />
        </Popup>

        <Popup
          open={supportPopup === 'imaging'}
          onClose={() => setSupportPopup('')}
          title='ผลตรวจรังสี'
          subtitle='ไล่ตามครั้งที่ตรวจ พร้อมภาพฟิล์มและผลอ่านของรังสีแพทย์'
          size='extraLarge'
          primaryAction={{ label: 'ปิด', onClick: () => setSupportPopup('') }}
        >
          <ImagingTimeline patient={patient} />
        </Popup>

      {examTab === 0 ? (
      <>
        <ExamNotesPanel
          embedded
          patient={patient}
          nurseNotes={form.nurseExam}
          doctorNotes={form.doctorExam}
          attachments={form.examAttachments}
          linkedResults={form.examLinkedResults || {}}
          onLinkedResultsChange={set('examLinkedResults')}
          onDoctorChange={set('doctorExam')}
          onCopyFromNurse={handleCopyFromNurse}
          onAttachmentsChange={handleAttachmentsChange}
          onRemoveAttachment={(id) => setForm((s) => ({
            ...s,
            examAttachments: (s.examAttachments || []).filter((f) => f.id !== id),
          }))}
        />
      </>
      ) : (
      <>
        {/* Per-tab marker + drawing isolation. Both `form.bodyMarkers`
            and `form.bodyDrawings` are keyed by exam system (HEENT /
            Heart / Lungs / …). The panel only sees the active
            system's slice; saves write back to that slot, preserving
            the other systems' annotations untouched. Drawings cover
            pen / text / circle / square / arrow strokes. */}
        <BodyDiagramPanel
          systemKey={form.examSystem}
          viewKey={form.examView}
          markers={(form.bodyMarkers && form.bodyMarkers[form.examSystem]) || []}
          onMarkersChange={(next) => setForm((s) => ({
            ...s,
            bodyMarkers: { ...(s.bodyMarkers || {}), [s.examSystem]: next },
          }))}
          drawings={(form.bodyDrawings && form.bodyDrawings[form.examSystem]) || []}
          onDrawingsChange={(next) => setForm((s) => ({
            ...s,
            bodyDrawings: { ...(s.bodyDrawings || {}), [s.examSystem]: next },
          }))}
          onSystemChange={set('examSystem')}
          onViewChange={set('examView')}
        />
      </>
      )}
      </ExamStepCard>

      {/* การ์ด "ไฟล์แนบของการตรวจครั้งนี้" (VisitAttachmentsPanel) ถูกเอาออก
          28 ส.ค. 69 — การ์ด "บันทึกของแพทย์" มีโซนแนบไฟล์ของตัวเองอยู่แล้ว
          (DragAndDrop ใน ExamNotesPanel) จึงมีสองที่ให้แนบไฟล์ซ้ำกัน */}
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────
   Step 4 — แพทย์บันทึกการรักษา (Figma 2431:217692)
   ───────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────
   Step 4 — วินิจฉัย / Diagnosis (Figma PHCIS | Medical-examination
   317:29773). Two-column "Diagnosis" card (voice textareas + ordering
   doctor) followed by a full "รหัสการวินิจฉัย
   (ICD10)" panel — Doctor AI search, suggestion capsules, and the
   ICD-10 table. All chrome aliased from existing components.
   ───────────────────────────────────────────────────────────── */

/* Read-only chip pattern used by the บันทึกจากการตรวจร่างกาย summary
   to mirror the attachment cards from Step 3 without re-using
   DragAndDrop's editable variant. */
const AttachmentSummaryChip = ({ file }) => (
  <div
    className='inline-flex items-center'
    style={{
      gap: 'var(--dim-space-300)',
      /* 160 / 320 are layout-only growth bounds (no matching dimension
         token in design.md) — kept as raw px while every spacing/border
         radius/stroke value below aliases the design token. */
      minWidth: 160,
      maxWidth: 320,
      flex: '1 1 160px',
      padding: 'var(--dim-space-400)',
      background: 'var(--surface-formbuilder-card)',
      border: 'var(--dim-stroke-100) solid var(--border-formbuilder-filled)',
      borderRadius: 'var(--dim-radius-200)',
      boxShadow: 'var(--shadow-card, 0 1px 4px rgba(100, 116, 139, 0.10))',
    }}
  >
    <span
      className='inline-flex items-center justify-center shrink-0'
      style={{
        width: 'var(--dim-size-800)',
        height: 'var(--dim-size-800)',
        borderRadius: 'var(--dim-radius-200)',
        background: 'var(--primary-100, #E2F3EB)',
        color: 'var(--text-brandPrimary-default)',
        /* Emoji glyph — no matching type-size token (xs/sm/base only).
           Kept as raw 18 px so the icon scales with the 40 px tile. */
        fontSize: 18,
      }}
      aria-hidden
    >
      📄
    </span>
    <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
      <span style={{
        color: 'var(--text-formbuilder-text)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>{file.name}</span>
      <span style={{
        color: 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
      }}>{Math.round(file.sizeBytes / 1024)} KB</span>
    </div>
  </div>
);

const STEP4_ICD_TITLE_STYLE = {
  color: 'var(--text-topic-tertiary-title)',
  fontFamily: 'var(--type-family-heading-content)',
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
  fontSize: 'var(--type-size-base)',
  lineHeight: 1.5,
};

const STEP4_INNER_CARD_STYLE = {
  gap: 'var(--dim-space-600)',
  padding: 'var(--dim-space-600)',
  borderRadius: 'var(--dim-radius-400)',
  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
  background: 'var(--surface-card-100, #FFFFFF)',
};

/* Outer wrapper for the "บันทึกจากการตรวจร่างกาย" summary card —
   matches Figma 153:19741 (white card hosting body diagram + read-only
   notes column inside Step 4) when the section is populated. */
const STEP4_SECTION_SHELL = {
  gap: 'var(--dim-space-400)',
  /* ไม่มี padding ของตัวเอง (มติผู้ใช้ 31 ส.ค. 69) — TreatmentFormShell ให้
     ระยะขอบการ์ด 24px มาแล้ว พอพาเนลเป็นพื้นขาวเหมือนการ์ด padding ซ้อนกัน
     สองชั้นจึงกลายเป็นระยะ 48px ที่ไม่มีขอบอะไรมาอธิบาย */
  padding: 0,
  borderRadius: 'var(--dim-radius-500)',
  background: 'var(--surface-card-100, #FFFFFF)',
};

/* Empty-state shell for the same section — Figma PHCIS|Medical-examination
   330:42665 "Doctor note group" (data-name="Empty"). Annotated "If no
   physical exam has been recorded, the empty state appears". Renders a
   subtle neutral-tinted backdrop (`surface/neutral/quaternary`) that hosts
   the disabled title row + bordered white empty card, giving the three-tone
   visual hierarchy that distinguishes the empty state from the populated
   white summary card above. */
/* พื้นเทาถูกเปลี่ยนเป็นขาว 31 ส.ค. 69 (มติผู้ใช้) — สามโทน (เทา/ขาว/กรอบ) ที่ Figma
   ออกแบบไว้ใช้ได้ตอนการ์ดนี้กินความกว้างเต็มหน้า พอย้ายมาอยู่คอลัมน์ซ้ายครึ่งเดียว
   พื้นเทากลายเป็นบล็อกทึบแข่งกับคอลัมน์วินิจฉัยฝั่งขวา */
const STEP4_SECTION_EMPTY_SHELL = {
  gap: 'var(--dim-space-300)',
  /* ไม่มี padding ของตัวเอง (มติผู้ใช้ 31 ส.ค. 69) — TreatmentFormShell ให้
     ระยะขอบการ์ด 24px มาแล้ว พอพาเนลเป็นพื้นขาวเหมือนการ์ด padding ซ้อนกัน
     สองชั้นจึงกลายเป็นระยะ 48px ที่ไม่มีขอบอะไรมาอธิบาย */
  padding: 0,
  borderRadius: 'var(--dim-radius-400)',
  background: 'var(--surface-card-100, #FFFFFF)',
};

/* Section title used by STEP4_SECTION_SHELL (Figma 153:19743 — bold
   tertiary-content title row + edit button). */
const STEP4_SECTION_TITLE_STYLE = {
  color: 'var(--text-topic-tertiary-title)',
  fontFamily: 'var(--type-family-heading-content)',
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
  fontSize: 'var(--type-size-base)',
  lineHeight: 1.5,
};

/* ICD-10 table columns (Figma PHCIS · Medical-examination 345:41388).
   Code 80 (blue-bold primary badge) · diagnosis name (flex) · type 256
   (severity badge) · row actions 128 (edit + delete). The earlier
   variant carried date + time columns; both were dropped in 345:41388
   because the encounter date/time is already pinned by the visit
   header — the per-row stamp added redundant noise. */
const ICD_TABLE_COLUMNS = [
  {
    key: 'code',  header: 'รหัส',
    render: (row) => (
      <ColorfulBadge style='blue' size='small' width='hug' hierarchy='primary'>
        {row.code}
      </ColorfulBadge>
    ),
  },
  /* Prefer key `diagnosis` (not `name`) — Table auto-wraps `name` /
     `patientName` with MaskedWorklistName for PII, which must not apply
     to ICD diagnosis labels. */
  {
    key: 'diagnosis',
    header: 'การวินิจฉัย',
    flex: true,
    minWidth: 220,
    render: (row) => row.name || '—',
  },
  {
    key: 'type', header: 'Diagnosis Type',
    render: (row) => {
      const meta = resolveDiagnosisType(row.type);
      return (
        <ColorfulBadge style={meta.badgeStyle} size='small' width='hug'>
          {meta.label}
        </ColorfulBadge>
      );
    },
  },
];

/* ค่าสำรองสำหรับหน้าที่ไม่ส่ง `stepIndexes` มา (คลินิกอื่นที่ยังใช้ลำดับเดิม
   และ ComponentsLibraryPage) — หน้า CPOE ส่ง `stepIndexes` มาเสมอ */
const STEP_EXAMINATION_INDEX = 2;
const STEP_DOCTOR_RECORD_INDEX = 3;

export const Step4DoctorRecord = ({ form, setForm, onStepChange, patient, stepIndexes = null }) => {
  /* พาไปขั้น "ตรวจร่างกาย" ที่มีตัวแก้ไขจริง — อ่าน index จาก `stepIndexes`
     ที่หน้าเรียกส่งมา ไม่ใช่ค่าคงที่ ลำดับขั้นเปลี่ยนมาแล้วสองรอบ (ตัดประวัติ
     การรักษาออก · ย้าย SOAP ไปลำดับ 5) ค่าคงที่เดิมจึงพาไปผิดขั้น
     (มติผู้ใช้ 28 ส.ค. 69) · `?.` กันหน้าเดโมที่ไม่ส่ง prop มา */
  /* คงไว้เผื่อผู้เรียกอื่น — ปุ่มในการ์ดเปลี่ยนไปเปิดป๊อปอัปแทนแล้ว */
  const goToExamStep = () => onStepChange?.(
    stepIndexes?.examination ?? STEP_EXAMINATION_INDEX,
  );
  void goToExamStep;

  const set = (k) => (v) => setForm((s) => ({ ...s, [k]: v }));
  /* SuggestibleTextarea (and Voice variant) forwards onChange as a
     DOM-event-like `{ target: { value } }`. */
  const setFromEvent = (k) => (e) => setForm((s) => ({ ...s, [k]: e?.target?.value ?? '' }));

  const removeDx = (idx) => setForm((s) => ({
    ...s,
    diagnoses: s.diagnoses.filter((_, i) => i !== idx),
  }));

  /* Delete-confirm popup state — Figma 348:50870. `pendingDelete` holds
     the row index to remove while the popup is open; null means closed.
     The base table's delete icon no longer calls `removeDx` directly —
     it opens this popup so the destructive action requires an explicit
     "ลบการวินิจฉัย" red-fill button press. */
  /* ปุ่ม "แก้ไข" ของการ์ดบันทึกการตรวจร่างกายเปิดเป็นป๊อปอัป ไม่ใช่กระโดดข้ามขั้น
     (มติผู้ใช้ 31 ส.ค. 69) — การถูกดีดไปขั้นก่อนหน้าทำให้เสียตำแหน่งที่กำลังทำอยู่
     ในขั้นวินิจฉัย แล้วต้องเดินกลับมาเอง ป๊อปอัปแก้เสร็จปิดแล้วอยู่ที่เดิม
     เนื้อในเป็น `Step3Examination` ตัวเดียวกับขั้นตรวจร่างกาย จึงไม่มีฟอร์มชุดที่สอง */
  const [examEditOpen, setExamEditOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const confirmDelete = () => {
    if (pendingDelete != null) removeDx(pendingDelete);
    setPendingDelete(null);
  };

  /* Re-Diagnosis popup state (Figma 161:42074). Opens from the Re-Diagnosis
     CTA below the ICD table / empty-state. On confirm, selected past-visit
     diagnoses are appended to `form.diagnoses` with today's date/time and
     a default `principle` type — same shape every other diagnosis row
     uses, so they slot straight into the table renderer. */
  const [reDiagnosisOpen, setReDiagnosisOpen] = useState(false);

  /* Add-Diagnosis popup state — Figma 350:35255. Opens from the
     "เพิ่มรหัสการวินิจฉัย" CTA. Commits one new diagnosis row composed
     of { code, name, type } (all required) directly into
     `form.diagnoses` with the default badge styles. */
  const [addDiagnosisOpen, setAddDiagnosisOpen] = useState(false);
  const appendDiagnosis = (entry) => {
    if (!entry || !entry.code || !entry.name || !entry.type) return;
    setForm((s) => ({
      ...s,
      diagnoses: [
        ...s.diagnoses,
        { code: entry.code, name: entry.name, type: entry.type },
      ],
    }));
  };

  /* Doctor AI pick → "Add this code?" confirmation state (Figma
     339:42259). When the clinician picks an ICD row out of the Doctor
     AI AISearch dropdown, we stash the `{ code, name }` here and pop
     the confirmation modal; only `เพิ่มรหัส` actually appends to the
     diagnoses table. The Diag Type defaults to 'principle' on commit
     (clinician can update from the row's edit button afterwards). */
  const [pendingIcdPick, setPendingIcdPick] = useState(null);
  const confirmAddIcdPick = () => {
    if (pendingIcdPick) {
      setForm((s) => ({
        ...s,
        diagnoses: [
          ...s.diagnoses,
          { code: pendingIcdPick.code, name: pendingIcdPick.name, type: 'principle' },
        ],
        /* Clear the Doctor AI search input after committing so the
           panel resets to its DEFAULT state and the clinician can
           pick the next code with a fresh search. */
        icdQuery: '',
      }));
    }
    setPendingIcdPick(null);
  };

  /* Edit-Diagnosis popup state. `editingDiagnosis` holds the row + its
     index in `form.diagnoses` while the popup is open; null otherwise.
     The index is captured at click time so the merge writes back to the
     correct row even if the list mutates (e.g. delete) while editing.
     The popup may update `code` + `name` + `type` (date stays read-only),
     so the merger spreads the updated patch on top of the existing row. */
  const [editingDiagnosis, setEditingDiagnosis] = useState(null);
  const updateDiagnosis = (idx, updatedRow) => setForm((s) => ({
    ...s,
    diagnoses: s.diagnoses.map((row, i) => (i === idx ? { ...row, ...updatedRow } : row)),
  }));
  const appendPastDiagnoses = (picked) => {
    if (!picked || picked.length === 0) return;
    setForm((s) => ({
      ...s,
      diagnoses: [
        ...s.diagnoses,
        ...picked.map((p) => ({
          code: p.code,
          name: p.name,
          /* Diag Type is OPTIONAL in the Re-Diagnosis popup per the
             revised product spec — untyped picks fall back to
             'principle' here so the table's `ประเภท` column always has
             a defined badge style (the clinician can edit later via
             the row's edit button). The date + time columns from the
             earlier table variant were dropped in Figma 345:41388, so
             we no longer stamp those fields. */
          type: p.type || 'principle',
        })),
      ],
    }));
  };

  /* Table action column wires the per-row icons to the form state.
     Kept inside the component so the closure can call `removeDx`. */
  const columns = useMemo(() => [
    ...ICD_TABLE_COLUMNS,
    {
      key: 'actions',
      header: 'การดำเนินการ',
      render: (row, rowIdx) => (
        <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-200)' }}>
          {/* Figma PHCIS | Medical-examination 339:36817 — Brand Icon
              Button "quaternary" variant: brand-p50 surface + brand-p100
              border + brand-p700 icon. Sits next to the neutral-subdue
              delete chip for a consistent row-action pair. Opens the
              EditDiagnosisTypePopup so the clinician can change the
              row's Diag Type without re-picking the ICD code. */}
          <BrandIconButton
            variant='quaternary'
            size='sm'
            icon='edit'
            aria-label={`แก้ไขการวินิจฉัย ${row.code}`}
            onClick={() => setEditingDiagnosis({ idx: rowIdx, row })}
          />
          <NeutralSubdueIconButton
            variant='outline'
            size='sm'
            icon='delete'
            aria-label={`ลบการวินิจฉัย ${row.code}`}
            onClick={() => setPendingDelete(rowIdx)}
          />
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const bodySummarySystemKeys = useMemo(
    () => resolveBodyDiagramSummaryKeys(form),
    [form.bodyDrawings, form.bodyMarkers],
  );
  const summaryExamSystem = bodySummarySystemKeys.includes(form.examSystem)
    ? form.examSystem
    : bodySummarySystemKeys[0];
  const hasBodyDiagramSummary = Boolean(summaryExamSystem);
  const bodySummaryViewKeys = useMemo(
    () => resolveBodyDiagramSummaryViewKeys(form, summaryExamSystem),
    [form.bodyDrawings, form.bodyMarkers, summaryExamSystem],
  );
  const summaryExamView = bodySummaryViewKeys.includes(form.examView)
    ? form.examView
    : bodySummaryViewKeys[0];

  /* "Has the clinician saved ANY exam record in Step 3?" — true when
     either side of the panel has content (body diagram or one of the
     four doctor narrative fields). When false, the entire section
     collapses to the centered empty state from Figma 329:38544. */
  const doctorExamHasText =
    !!(form.doctorExam?.cc?.trim()
      || form.doctorExam?.pi?.trim()
      || form.doctorExam?.pe?.trim()
      || form.doctorExam?.duration?.trim());
  const hasExamRecord = hasBodyDiagramSummary
    || doctorExamHasText
    || (form.examAttachments?.length || 0) > 0;

  return (
    <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      {/* หัวข้อ "วินิจฉัย" ถูกเอาออก — แถบขั้นตอนด้านบนบอกอยู่แล้ว (28 ส.ค. 69) */}

      {/* แถบสัญญาณชีพในขั้นวินิจฉัยถูกเอาออก 28 ส.ค. 69 — ค่าชุดเดียวกันอยู่ใน
          คอลัมน์ "บันทึกจากพยาบาล" ของขั้นตรวจร่างกายแล้ว */}

      {/* ขั้นวินิจฉัยอ่านเป็นสองคอลัมน์ (มติผู้ใช้ 31 ส.ค. 69) — ซ้ายคือสิ่งที่ตรวจเจอ
          (บันทึกจากการตรวจร่างกาย) ขวาคือข้อสรุปจากสิ่งนั้น (วินิจฉัย + ICD10)
          แพทย์จึงอ่านหลักฐานกับข้อสรุปพร้อมกันได้ ของเดิมวางซ้อนกันลงมา ต้อง
          เลื่อนหน้าขึ้นลงเพื่อเทียบ · ต่ำกว่า xl กลับไปเรียงบนล่างเหมือนเดิม */}
      <div
        className='flex w-full flex-col xl:flex-row items-start min-w-0'
        style={{ gap: 'var(--dim-space-400)' }}
      >
      <div className='flex flex-col min-w-0 w-full xl:w-auto' style={{ flex: '1 1 0' }}>
      {/* บันทึกจากการตรวจร่างกาย — read-only summary of Step 3 with the
          body diagram + doctor textareas + attachments. The "แก้ไข"
          button sends the doctor back to Step 3 to update the live
          editors (Step 3 owns the truth for these fields). When no
          Step 3 record has been saved yet, the two-column body
          collapses to the centered empty state from Figma 330:42665
          (data-name="Empty"). In that empty branch the outer shell
          switches to the neutral-tinted Doctor-note panel
          (`STEP4_SECTION_EMPTY_SHELL`) so the bordered white empty
          card sits on a grey backdrop — matches the Figma three-tone
          layout and the disabled "แก้ไข" treatment for the topic row
          (the empty state surfaces its own primary CTA below instead). */}
      <div
        className='flex flex-col w-full'
        style={hasExamRecord ? STEP4_SECTION_SHELL : STEP4_SECTION_EMPTY_SHELL}
      >
        {/* แถวหัวข้อสองฝั่งสูงเท่ากัน (มติผู้ใช้ 31 ส.ค. 69) — ฝั่งซ้ายมีปุ่ม "แก้ไข"
            ดันแถวให้สูงกว่าฝั่งขวาที่มีแต่ข้อความ กล่องเนื้อหาใต้หัวข้อจึงเริ่ม
            คนละระดับ · ตรึงความสูงเท่าปุ่ม sm ทั้งสองฝั่ง */}
        <div
          className='flex items-center w-full'
          style={{ gap: 'var(--dim-space-300)', minHeight: 'var(--dim-size-700, 36px)' }}
        >
          {/* หัวข้อสองคอลัมน์ใช้สไตล์เดียวกัน (มติผู้ใช้ 31 ส.ค. 69) — ของเดิมฝั่งซ้าย
              เป็น topic/tertiary สีเทา ส่วนฝั่งขวาเป็น topic/secondary สีแบรนด์
              อ่านเหมือนคนละระดับชั้นทั้งที่เป็นหัวข้อคู่กัน */}
          <span className='flex-1 min-w-0' style={TREATMENT_PANEL_TITLE_STYLE}>
            บันทึกจากการตรวจร่างกาย
          </span>
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='edit'
            disabled={!hasExamRecord}
            onClick={() => setExamEditOpen(true)}
          >
            แก้ไข
          </BrandSubdueButton>
        </div>

        {hasExamRecord ? (
          /* คอลัมน์ซ้ายกว้างครึ่งเดียวแล้ว แผนภาพร่างกายกับบันทึกของแพทย์จึงเรียง
             บนล่างเสมอ ไม่แตกเป็นสองคอลัมน์ซ้อนในคอลัมน์อีกชั้น */
          <div className='flex w-full flex-col items-stretch min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
            {/* บันทึกของแพทย์อยู่บน แผนภาพร่างกายอยู่ล่าง (มติผู้ใช้ 31 ส.ค. 69) —
                ข้อความคือสิ่งที่อ่านก่อนเสมอ ส่วนแผนภาพเป็นภาพประกอบของสิ่งที่เขียนไว้
                ของเดิมแผนภาพสูงเกือบเต็มจอ ดันบันทึกลงไปใต้แนวที่มองเห็น */}
            {/* Read-only doctor notes column — Figma 153:19744. */}
            <div
              className='flex flex-col min-w-0'
              style={{
                flex: '1 1 0',
                gap: 'var(--dim-space-400)',
                padding: 'var(--dim-space-600)',
                borderRadius: 'var(--dim-radius-400)',
                border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
                background: 'var(--surface-card-100, #FFFFFF)',
              }}
            >
              {/* หัวข้อบอกว่ากล่องนี้คือบันทึกของแพทย์ (มติผู้ใช้ 31 ส.ค. 69) —
                  เดิมเป็นกล่องข้อความลอย ๆ ไม่มีชื่อ ต่างจากแผนภาพร่างกายที่อ่านออก
                  จากตัวมันเอง · ลำดับและป้ายตรงกับคอลัมน์ "บันทึกของแพทย์" ของขั้น
                  ตรวจร่างกายเป๊ะ ๆ เพราะเป็นภาพสรุปของช่องชุดเดียวกัน */}
              <span style={{
                color: 'var(--text-content-default)',
                fontFamily: 'var(--type-family-heading-content)',
                fontSize: 'var(--type-size-sm)',
                fontWeight: 'var(--type-weight-bold)',
                lineHeight: 1.5,
              }}
              >
                บันทึกของแพทย์
              </span>
              <ExamSummaryRow label='อาการ (Chief Complaint)' value={form.doctorExam?.cc} />
              <ExamSummaryRow label='ประวัติการเจ็บป่วยปัจจุบัน (Present Illness)' value={form.doctorExam?.pi} />
              <ExamSummaryRow label='ระยะเวลาที่มีอาการ' value={form.doctorExam?.duration} />
              <ExamSummaryRow label='ตรวจร่างกาย (Physical Examination)' value={form.doctorExam?.pe} />
              {form.examAttachments?.length > 0 && (
                <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  {form.examAttachments.map((file) => (
                    <AttachmentSummaryChip key={file.id} file={file} />
                  ))}
                </div>
              )}
            </div>
            {/* Summary variant matches Figma 153:19741: tabs and body image sit
                together inside one bordered white card. */}
            {hasBodyDiagramSummary && (
              <div className='min-w-0' style={{ flex: '1.15 1 0' }}>
                <BodyDiagramPanel
                  variant='summary'
                  systemKey={summaryExamSystem}
                  viewKey={summaryExamView}
                  markers={(form.bodyMarkers && form.bodyMarkers[summaryExamSystem]) || []}
                  onMarkersChange={(next) => setForm((s) => ({
                    ...s,
                    bodyMarkers: { ...(s.bodyMarkers || {}), [summaryExamSystem]: next },
                  }))}
                  drawings={(form.bodyDrawings && form.bodyDrawings[summaryExamSystem]) || []}
                  onDrawingsChange={(next) => setForm((s) => ({
                    ...s,
                    bodyDrawings: { ...(s.bodyDrawings || {}), [summaryExamSystem]: next },
                  }))}
                  onSystemChange={set('examSystem')}
                  onViewChange={set('examView')}
                  visibleSystemKeys={bodySummarySystemKeys}
                  visibleViewKeys={bodySummaryViewKeys}
                />
              </div>
            )}

          </div>
        ) : (
          /* Empty state — Figma 330:42665 (data-name="Empty"). White inner
             card with 1px neutral-quaternary border on the grey backdrop
             above. Hosts the "Medical checkup" Lottie + bilingual headline
             + outline CTA that points the clinician back to Step 3.
             Figma specs the row at h-[613px]; minHeight matches that floor
             so the empty card always feels weighty regardless of viewport. */
          <div
            className='flex flex-col items-center justify-center w-full'
            style={{
              gap: 'var(--dim-space-300)',
              padding: 'var(--dim-space-600)',
              borderRadius: 'var(--dim-radius-400)',
              border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
              background: 'var(--surface-card-100, #FFFFFF)',
              minHeight: 613,
            }}
          >
            <LottieIllustration animationData={medicalCheckupAnim} size={160} />
            <div
              className='flex flex-col items-center'
              style={{ gap: 'var(--dim-space-150)' }}
            >
              <span style={{
                color: 'var(--text-brandPrimary-default, #007549)',
                fontFamily: 'var(--type-family-heading-content)',
                fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                fontSize: 'var(--type-size-sm)',
                lineHeight: 1.5,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}>
                ยังไม่มีบันทึกการตรวจร่างกาย
              </span>
              <span style={{
                color: 'var(--text-content-quaternary, #ADB2B7)',
                fontFamily: 'var(--type-family-body)',
                fontWeight: 'var(--type-weight-medium)',
                fontSize: 'var(--type-size-sm)',
                lineHeight: 1.5,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}>
                กรุณาบันทึกการตรวจร่างกายผู้รับบริการก่อน
              </span>
            </div>
            {/* Empty-state CTA — sends the doctor to Step 3 to enter the
                physical examination record this card is waiting on. */}
            <BrandButton variant='outline' leadingIcon='edit' onClick={() => setExamEditOpen(true)}>
              ตรวจร่างกาย
            </BrandButton>
          </div>
        )}
      </div>

      </div>

      {/* เส้นคั่นกลางระหว่างสองคอลัมน์ (มติผู้ใช้ 31 ส.ค. 69) — พอทั้งสองฝั่งเป็น
          พื้นขาวเหมือนกันแล้ว ไม่มีอะไรบอกว่าคอลัมน์ไหนจบตรงไหน · ต่ำกว่า xl
          ที่กลับไปเรียงบนล่าง เส้นซ้ายจะกลายเป็นเส้นลอย จึงเปิดเฉพาะ xl ขึ้นไป */}
      <div
        className='flex flex-col min-w-0 w-full xl:w-auto xl:border-l'
        style={{
          flex: '1 1 0',
          borderColor: 'var(--border-neutral-quaternary)',
          paddingLeft: 'var(--dim-space-600)',
        }}
      >
      {/* วินิจฉัย + ICD10 — Figma 155:20725 · 156:27355 */}
      <div className='flex flex-col w-full' style={TREATMENT_GREY_PANEL_SHELL}>
        <div
          className='flex items-center w-full'
          style={{ minHeight: 'var(--dim-size-700, 36px)' }}
        >
          <span style={TREATMENT_PANEL_TITLE_STYLE}>วินิจฉัย (Diagnosis)</span>
        </div>

        <div className='flex w-full items-stretch min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
          <div className='flex flex-1 min-w-0 flex-col' style={STEP4_INNER_CARD_STYLE}>
            <Field label='วินิจฉัยเบื้องต้น (Diagnosis)' required>
              <SuggestibleTextarea
                voice
                value={form.diagnosisNote}
                onChange={setFromEvent('diagnosisNote')}
                height={160}
                minHeight={96}
                suggestions={DIAGNOSIS_SUGGESTIONS}
                minChars={2}
                popoverAriaLabel='คำแนะนำวินิจฉัย'
                placeholder={DIAGNOSIS_NOTE_PLACEHOLDER}
              />
            </Field>
            <Field label='คำสั่งแพทย์ (Doctor Order)' required>
              <SuggestibleTextarea
                voice
                value={form.doctorOrderNote}
                onChange={setFromEvent('doctorOrderNote')}
                height={160}
                minHeight={96}
                suggestions={DOCTOR_ORDER_SUGGESTIONS}
                minChars={1}
                popoverAriaLabel='คำแนะนำคำสั่งแพทย์'
                placeholder={DOCTOR_ORDER_NOTE_PLACEHOLDER}
              />
            </Field>
            {/* ช่อง "แพทย์ผู้สั่ง" ถูกเอาออก 31 ส.ค. 69 (มติผู้ใช้) — เป็นดรอปดาวน์ที่
                `disabled` อยู่แล้ว แพทย์แก้ไม่ได้ ค่าคือผู้ที่กำลังบันทึกเอง ระบบ
                เติมให้จากผู้ใช้ที่ล็อกอิน · `form.orderingDoctor` ยังถูกบันทึกและ
                ยังขึ้นในขั้นตรวจสอบข้อมูลตามเดิม */}
          </div>
          {/* รางข้อมูลประกอบการตรวจร่างกาย (ผลตรวจชันสูตร / ผลตรวจรังสี) ถูกเอาออก
              28 ส.ค. 69 — ทั้งสองอย่างเป็นปุ่มเปิดป๊อปอัปอยู่บนแถวแท็บของขั้น
              ตรวจร่างกายแล้ว */}
        </div>

        <div
          className='flex flex-col w-full'
          style={{
            ...STEP4_INNER_CARD_STYLE,
            gap: 'var(--dim-space-400)',
            justifyContent: 'flex-start',
            alignItems: 'center',
          }}
        >
          <span style={{ ...STEP4_ICD_TITLE_STYLE, alignSelf: 'flex-start' }}>รหัสการวินิจฉัย (ICD10)</span>

        <DoctorAiIcdPanel
          value={form.icdQuery}
          onChange={set('icdQuery')}
          /* Picked an ICD suggestion → open the confirm-add popup so
             the clinician explicitly OKs the row before it lands in
             the diagnosis table. `picked.badge` carries the ICD code
             (per icdToRow), `picked.label` carries the diagnosis name. */
          onSubmit={(_next, picked) => {
            if (!picked) return;
            const code = picked.badge ?? picked.id;
            const name = picked.label;
            if (!code || !name) return;
            setPendingIcdPick({ code, name });
          }}
        />

        {form.diagnoses.length === 0 ? (
          /* Empty state — Figma PHCIS | Medical-examination 345:35724.
             Renders the "Medical checkup" Lottie + emerald-700 headline +
             quaternary subtext that points the clinician at the Doctor AI
             search above. Replaces the Table entirely so the empty-state
             reads as a single quiet card instead of an "empty-row" table
             skeleton. The Re-Diagnosis / เพิ่มรหัสการวินิจฉัย CTAs sit
             below in their own row (rendered regardless of state). */
          <div
            className='flex flex-col items-center justify-center w-full'
            style={{
              gap: 'var(--dim-space-300)',
              padding: 'var(--dim-space-600)',
            }}
          >
            <LottieIllustration animationData={medicalCheckupAnim} size={160} />
            <div
              className='flex flex-col items-center'
              style={{ gap: 'var(--dim-space-150)' }}
            >
              <span style={{
                color: 'var(--text-brandPrimary-default, #007549)',
                fontFamily: 'var(--type-family-heading-content)',
                fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                fontSize: 'var(--type-size-sm)',
                lineHeight: 1.5,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}>
                ยังไม่มีบันทึกรหัสการวินิจฉัย (ICD10)
              </span>
              <span style={{
                color: 'var(--text-content-quaternary, #ADB2B7)',
                fontFamily: 'var(--type-family-body)',
                fontWeight: 'var(--type-weight-medium)',
                fontSize: 'var(--type-size-sm)',
                lineHeight: 1.5,
                textAlign: 'center',
              }}>
                กรุณาบันทึกรหัสการวินิจฉัย (ICD10) โดยสามารถใช้ตัวช่วย Doctor AI ในการค้นหารหัส
              </span>
            </div>
          </div>
        ) : (
          <Table
            columns={columns}
            rows={form.diagnoses}
            /* ตรึงคอลัมน์ "รหัส" ไว้ (มติผู้ใช้ 31 ส.ค. 69) — ชื่อโรคภาษาอังกฤษ+ไทย
               ดันตารางให้เลื่อนแนวนอน พอเลื่อนแล้วรหัส ICD หลุดจอ อ่านไม่ออกว่า
               แถวที่กำลังดูอยู่คือรหัสอะไร */
            stickyColCount={1}
          />
        )}

        {/* Footer CTAs — Figma 161:37221. Both buttons are outline-style:
           Re-Diagnosis uses Brand Subdue (tertiary border #C5EDDA),
           เพิ่มรหัสการวินิจฉัย uses BrandButton outline (primary border
           #007549). They sit left-aligned with a 12 px gap. */}
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
          <BrandSubdueButton
            variant='outline'
            leadingIcon='history'
            onClick={() => setReDiagnosisOpen(true)}
          >
            Re-Diagnosis
          </BrandSubdueButton>
          {/* ป้ายปุ่มบอกให้ชัดว่าเป็นทางเลือกสำรองของ Doctor AI ด้านบน — คีย์รหัส
              เองเมื่อค้นไม่เจอ ไม่ใช่ปุ่มเพิ่มรหัสตัวหลัก (มติผู้ใช้ 31 ส.ค. 69) */}
          <BrandButton
            variant='outline'
            leadingIcon='add'
            onClick={() => setAddDiagnosisOpen(true)}
          >
            เพิ่มรหัสการวินิจฉัยด้วยตนเอง
          </BrandButton>
        </div>
        </div>

        {/* EMR §1.4 — พาเนลที่เคยต่อท้ายตาราง ICD ถูกเอาออกครบแล้ว ไฟล์ยังอยู่ทุกตัว:
              • DiagnosisCodingPanel (ประเภทการวินิจฉัยของการตรวจครั้งนี้) — เอาออก
                31 ส.ค. 69 เพราะเป็นตารางชุดเดียวกับตาราง ICD ด้านบนทุกแถว
                ต่างกันแค่คอลัมน์ประเภท ซึ่งแก้ได้จากปุ่มแก้ไขของแถวอยู่แล้ว
              • ProblemListPanel (§1.4.3.8/9) · ClinicalNotesPanel (§1.4.4.1/2)
                — เอาออก 28 ส.ค. 69 */}
      </div>
      </div>
      </div>

      {/* Re-Diagnosis popup (Figma 161:42074). Mounted at the section
          root so it portals outside the page's flex tree but still
          shares Step-4's form state via closure. Items come from the
          mocked PAST_VISIT_DIAGNOSES — in a real surface this would
          query the patient's visit-history API. */}
      <Popup
        open={examEditOpen}
        onClose={() => setExamEditOpen(false)}
        size='extraLarge'
        title='บันทึกการตรวจร่างกาย'
        subtitle='แก้ไขบันทึกและแผนภาพร่างกายของการตรวจครั้งนี้'
        primaryAction={{ label: 'เสร็จสิ้น', onClick: () => setExamEditOpen(false) }}
      >
        <Step3Examination form={form} setForm={setForm} patient={patient} />
      </Popup>

      <ReDiagnosisPopup
        open={reDiagnosisOpen}
        onClose={() => setReDiagnosisOpen(false)}
        onConfirm={appendPastDiagnoses}
        items={PAST_VISIT_DIAGNOSES}
      />

      {/* Delete-confirm popup (Figma 348:50870). Triggered by any row's
          trash icon in the ICD table; cancel + overlay/Esc keep the row,
          only the red ลบการวินิจฉัย fill button removes it. */}
      <DeleteDiagnosisConfirmPopup
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      {/* Add-Diagnosis popup (Figma 350:35255). Triggered by the
          "เพิ่มรหัสการวินิจฉัย" outline-brand CTA below the ICD table.
          On confirm, a single { code, name, type } row is appended to
          `form.diagnoses` and the table renderer renders it
          immediately. */}
      <AddDiagnosisPopup
        open={addDiagnosisOpen}
        onClose={() => setAddDiagnosisOpen(false)}
        onConfirm={appendDiagnosis}
      />

      {/* Doctor-AI confirm-add popup (Figma 339:42259). Mounted at the
          section root so it portals outside the form's flex tree.
          Triggered when the clinician picks an ICD row from the
          Doctor AI AISearch dropdown. */}
      <ConfirmAddDiagnosisPopup
        open={pendingIcdPick != null}
        onClose={() => setPendingIcdPick(null)}
        onConfirm={confirmAddIcdPick}
        diagnosis={pendingIcdPick}
      />

      {/* Edit-Diagnosis popup — opens from the per-row edit chip in
          the ICD table. Reuses the AddDiagnosisPopup chrome with the
          row's existing code / name / type pre-filled, so add + edit
          share the exact same form (only the title differs). The
          merge in `updateDiagnosis` preserves the row's `date` /
          `time` metadata that the popup intentionally doesn't expose. */}
      <EditDiagnosisPopup
        open={!!editingDiagnosis}
        onClose={() => setEditingDiagnosis(null)}
        diagnosis={editingDiagnosis?.row}
        onConfirm={(updatedRow) => {
          if (editingDiagnosis) updateDiagnosis(editingDiagnosis.idx, updatedRow);
        }}
      />
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────
   Step 5 — สั่งการรักษา / Treatment Order (Figma PHCIS-ALL 2508:98417).
   Layout aliases the existing components end-to-end:
     • Topic (white) for the page title
     • TabCapsule strip for the 5 order categories (ยา / แล็บ / X-ray /
       หัตถการ / ปรึกษา) — `type` maps to status: 'in-progress' renders
       the blue dot, 'success' renders the green tick
     • Sub-section header row with Topic + Re-Diagnosis + เพิ่มยา buttons
     • Alert (warning) for cross-class drug-allergy notice
     • Table for the medication order list — 18 columns, scrolls
       horizontally
     • Often-order suggestion chips (TabCapsule filter variant) that one-
       click insert a new row.
   ───────────────────────────────────────────────────────────── */

/* Medication-row image tile — 40 × 40 circular avatar.
   When `src` is set, renders the actual drug photo cropped to a
   perfect circle; otherwise falls back to a brand-tinted pill glyph.
   Figma PHCIS|CPOE 200:18648 specifies a circular thumbnail (radius
   --dim-radius-full) across both populated + empty states so the
   tile reads as a "drug avatar" matching the row-portrait pattern
   used elsewhere in the app (PatientCard, doctor avatars, etc.). */
const MedImageTile = ({ src, alt }) => {
  /* 36 × 36 px per Figma 195:34338 (was 40 × 40). The avatar reads as
     a tighter row-portrait that doesn't dominate the 68-px image cell,
     and the 1-px neutral-quaternary ring matches the Figma spec
     (`border-[var(--border/neutral/quaternary,#F4F5F5)]`) so empty /
     low-contrast drug photos still read as a distinct circular tile
     instead of melting into the row background. */
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [src]);
  const baseStyle = {
    width: 36,
    height: 36,
    borderRadius: 'var(--dim-radius-full)',
    border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
    flexShrink: 0,
    boxSizing: 'border-box',
  };
  if (src && !broken) {
    return (
      <img
        src={src}
        alt={alt || 'medication'}
        loading='lazy'
        onError={() => setBroken(true)}
        style={{
          ...baseStyle,
          objectFit: 'cover',
          background: 'var(--surface-card-quaternary, #F9FBFB)',
        }}
      />
    );
  }
  return (
    <span
      className='inline-flex items-center justify-center'
      style={{
        ...baseStyle,
        background: 'var(--surface-brandPrimary-quaternary)',
        color: 'var(--text-brandPrimary-default)',
      }}
      aria-hidden
    >
      <Sym name='medication' size={18} color='currentColor' />
    </span>
  );
};

/* Medication-table columns (Figma PHCIS|CPOE 276:34332). Data fields
   render as read-only body text (EllipsisText); workflow flags stay
   as inline <Checkbox> toggles; row edits go through AddMedicationPopup. */
const buildMedTableColumns = ({ updateRow, editRow, removeRow }) => [
  { key: 'image', header: 'รูป',
    render: (row) => (
      <MedImageTile
        src={resolveMedicationImage(row.name, row.image)}
        alt={row.name}
      />
    ),
  },
  { key: 'name',       header: 'ชื่อยา' },
  { key: 'orderStatus', header: 'สถานะคำสั่งยา', align: 'center',
    render: (row) => {
      const statusMeta = {
        continue: { style: 'green', label: 'Continue' },
        /* ต้องมีคู่กับตัวเลือกใน AddMedicationPopup เสมอ ไม่งั้นแถวที่เลือก
           ลักษณะใหม่จะตกไปที่ป้าย "Continue" เงียบ ๆ (มติผู้ใช้ 31 ส.ค. 69) */
        'one-time': { style: 'blue', label: 'รายครั้ง (One-time)' },
        stat: { style: 'red', label: 'STAT' },
        discontinue: { style: 'red', label: 'Discontinue' },
        completed: { style: 'teal', label: 'Completed' },
        'on-hold': { style: 'orange', label: 'On hold' },
      }[row.orderStatus] || { style: 'green', label: 'Continue' };
      return (
        <ColorfulBadge
          style={statusMeta.style}
          size='small'
          width='hug'
          showDot
        >
          {statusMeta.label}
        </ColorfulBadge>
      );
    },
  },
  /* Figma PHCIS|CPOE 276:34332 — วิธีใช้ is read-only body text in the
     table (not an inline Select). Edits go through AddMedicationPopup. */
  { key: 'usage',      header: 'วิธีใช้' },
  { key: 'dosePerTake', header: 'ทานครั้งละ', align: 'center' },
  { key: 'unit',       header: 'หน่วย' },
  { key: 'frequency',  header: 'ความถี่' },
  { key: 'when',       header: 'เวลาใช้ยา' },
  { key: 'warning',    header: 'คำเตือน' },
  { key: 'quantity',   header: 'จำนวน' },
  { key: 'totalPrice', header: 'ราคารวม', align: 'center',
    /* Per Figma PHCIS|CPOE 276:34342 the ราคารวม cell renders the
       plain money number centered — no "฿" suffix. The currency
       context lives in the header. */
    render: (row) => row.totalPrice ?? 0},
  { key: 'reimbursable', header: 'เบิกได้',
    /* Per Figma PHCIS|CPOE 276:34343 the เบิกได้ cell shows the
       reimbursable AMOUNT as a plain number, not a checkbox. The data
       model still carries a `reimbursable: boolean`: when true the
       row's full totalPrice is eligible for reimbursement, otherwise 0. */
    render: (row) => (row.reimbursable ? (row.totalPrice ?? 0) : 0)},
  { key: 'purpose',    header: 'การใช้' },
  { key: 'consult',    header: 'รอ Consult', align: 'center',
    render: (row, idx) => (
      <Checkbox
        checked={!!row.consult}
        onChange={(next) => updateRow(idx, { consult: next })}
        aria-label={`รอ Consult ${row.name}`}
      />
    ),
  },
  { key: 'stat',       header: 'STAT', align: 'center',
    render: (row, idx) => (
      <Checkbox
        checked={!!row.stat}
        onChange={(next) => updateRow(idx, { stat: next })}
        aria-label={`STAT ${row.name}`}
      />
    ),
  },
  { key: 'actions',    header: 'การดำเนินการ', align: 'center',
    /* Figma PHCIS|CPOE 195:34355 — row-action cluster: Edit then Delete. */
    render: (row, idx) => (
      <div
        className='flex items-center justify-center'
        style={{ gap: 'var(--dim-space-150)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <BrandIconButton
          variant='quaternary'
          size='sm'
          icon='edit'
          aria-label={`แก้ไข ${row.name}`}
          onClick={() => editRow?.(idx)}
        />
        {/* ปุ่มลบหายไปจากคอลัมน์นี้ (คอมเมนต์ Figma บอกว่าเป็นคู่ Edit + Delete
            มาตลอด) — ใส่กลับ 31 ส.ค. 69 ตามมติผู้ใช้ · ป๊อปอัปยืนยันลบ
            (`pendingMedDelete`) มีอยู่แล้ว แค่ไม่มีอะไรเรียก */}
        <NeutralSubdueIconButton
          variant='outline'
          size='sm'
          icon='delete'
          aria-label={`ลบ ${row.name}`}
          onClick={() => removeRow?.(idx)}
        />
      </div>
    ),
  },
];

/* ── Step 5 · X-ray order table (TOR §1.12.5.4) ──────────────────────────
   Column set is the TOR list verbatim — ความเร่งด่วน · รายการตรวจ ·
   ตำแหน่งที่ตรวจ · ท่าถ่าย · ราคา · ยอดที่เบิกได้ · ผู้ป่วยจ่าย · ลบ —
   the same table XrayOrderPage renders, re-expressed through the shared
   <Table> component this step already uses for medications so both
   categories read as one surface. Money resolves through
   `claimFor(exam, rightKey)` because an X-ray exam reimburses differently
   per สิทธิ (TOR §1.12.4.2), unlike the flat medication ราคารวม column. */

const XRAY_VIEW_BY_KEY = Object.fromEntries(XRAY_VIEWS.map((v) => [v.key, v]));

/* Thai-locale money formatter — same helper the RIS order surfaces use. */
const bahtText = (n) => (n ?? 0).toLocaleString('th-TH');

/* สิทธิ label (MR roster's Thai `rights` string) → claimByRight key.
   The MR registration issues Thai labels while the X-ray catalog keys its
   reimbursement table by fund code (TOR §1.12.4.2); anything the roster
   knows but the catalog doesn't (รัฐวิสาหกิจ, ประกันชีวิต AIA) falls back
   to CASH — ชำระเอง — so the ผู้ป่วยจ่าย column never under-promises. */
const XRAY_RIGHT_KEY_BY_MR_RIGHT = {
  'บัตรทอง':       'UCS',
  'ประกันสังคม':    'SSS',
  'ข้าราชการ':      'OFC',
  'ข้าราชการ กทม.': 'BMA',
  'ชำระเงินเอง':    'CASH',
};

/* Modalities that do NOT ionise — everything else (xr/fl/mg/ct/bd/dn)
   carries radiation dose, which is what makes the pregnancy screening
   (§1.12.5.3) and the duplicate gate (§1.12.5.9) matter on this tab. */
const XRAY_NON_IONIZING = new Set(['us', 'mri']);

/* Chrome-free inline select for the ความเร่งด่วน / ท่าถ่าย cells — the
   same bordered-select idiom XrayOrderPicker's region filter uses (its
   own border + radius from tokens, native chrome suppressed via
   `outline: none`), sized down to sit inside a 40-px table row. */
const xrayCellSelectStyle = {
  width: '100%',
  paddingTop: 'var(--dim-space-100, 4px)',
  paddingRight: 'var(--dim-space-200, 8px)',
  paddingBottom: 'var(--dim-space-100, 4px)',
  paddingLeft: 'var(--dim-space-200, 8px)',
  background: 'var(--surface-input-default)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-input-default)',
  borderRadius: 'var(--dim-radius-200, 8px)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  color: 'var(--text-content-secondary)',
  outline: 'none',
};

/* X-ray-table columns — same factory pattern as `buildMedTableColumns`
   so every cell renderer closes over the current updateRow / removeRow
   callbacks. `rightKey` is per-patient (สิทธิ) and changes only with the
   open visit, so it rides in as a factory argument too. Rows are
   `{ examId, view, urgency }`; everything display-worthy dereferences
   through XRAY_EXAM_BY_ID at render time so a catalog edit (Setup page)
   reflects here without migrating stored rows. */
const buildXrayTableColumns = ({ updateRow, removeRow, rightKey }) => [
  { key: 'urgency', header: 'ความเร่งด่วน',
    /* §1.12.5.4 lists ความเร่งด่วน first; editable per row because one
       visit can mix a STAT portable chest with a routine follow-up film. */
    render: (row, idx) => (
      <select
        value={row.urgency}
        onChange={(e) => updateRow(idx, { urgency: e.target.value })}
        aria-label={`ความเร่งด่วนของ ${XRAY_EXAM_BY_ID[row.examId]?.name ?? row.examId}`}
        style={xrayCellSelectStyle}
      >
        {XRAY_URGENCIES.map((u) => (
          <option key={u.key} value={u.key}>{u.thai}</option>
        ))}
      </select>
    ),
  },
  { key: 'exam', header: 'รายการตรวจ',
    /* ชื่อไทย + code/ชื่ออังกฤษ subtext — the same identity pair the RIS
       worklist columns show, plus the safety badges (สารทึบรังสี /
       ส่งตรวจภายนอก) so the row itself explains any alert above it. */
    render: (row) => {
      const exam = XRAY_EXAM_BY_ID[row.examId];
      if (!exam) return row.examId;
      return (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
          <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
            <span style={{
              fontFamily: 'var(--type-family-body)',
              fontWeight: 'var(--type-weight-medium)',
              fontSize: 'var(--type-size-sm)',
              color: 'var(--text-content-default)',
            }}>
              {exam.name}
            </span>
            {exam.referralOnly && <Badge style='info' size='small'>ส่งตรวจภายนอก</Badge>}
            {exam.contrast && <Badge style='warning' size='small'>สารทึบรังสี</Badge>}
          </span>
          <span style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            color: 'var(--text-content-tertiary)',
          }}>
            {exam.code} · {exam.nameEn}
          </span>
        </div>
      );
    },
  },
  { key: 'region', header: 'ตำแหน่งที่ตรวจ',
    /* §1.12.5.4 — ตำแหน่งที่ตรวจ is its own column, sourced from the
       exam's first-class `region` key, never parsed out of the name. */
    render: (row) => getRegion(XRAY_EXAM_BY_ID[row.examId])?.thai ?? '—'},
  { key: 'view', header: 'ท่าถ่าย',
    /* Per-row select over THIS exam's registered views — ใบฉายรังสี
       prints one line per exposure, so the doctor narrows the ท่า here
       instead of free-texting it (legacy §2.1 item 11 vocabulary). */
    render: (row, idx) => {
      const exam = XRAY_EXAM_BY_ID[row.examId];
      const views = exam?.views ?? [];
      if (views.length === 0) return '—';
      return (
        <select
          value={row.view}
          onChange={(e) => updateRow(idx, { view: e.target.value })}
          aria-label={`ท่าถ่ายของ ${exam?.name ?? row.examId}`}
          style={xrayCellSelectStyle}
        >
          {views.map((k) => (
            <option key={k} value={k}>{XRAY_VIEW_BY_KEY[k]?.thai ?? k}</option>
          ))}
        </select>
      );
    },
  },
  /* Money trio — §1.12.4.2: ราคา is flat, เบิกได้ is per-สิทธิ, and a
     positive ผู้ป่วยจ่าย is the partial-claim case the สปสช. reviewers
     probe (e.g. อัลตราซาวด์ under UCS/SSS). Warning-toned when > 0 so
     the doctor can flag the copay at the desk, matching XrayOrderPage. */
  { key: 'price', header: 'ราคา (บาท)', align: 'center',
    render: (row) => bahtText(claimFor(XRAY_EXAM_BY_ID[row.examId], rightKey).price)},
  { key: 'claim', header: 'ยอดที่เบิกได้ (บาท)', align: 'center',
    render: (row) => bahtText(claimFor(XRAY_EXAM_BY_ID[row.examId], rightKey).claim)},
  { key: 'patientPay', header: 'ผู้ป่วยจ่าย (บาท)', align: 'center',
    render: (row) => {
      const { patientPay } = claimFor(XRAY_EXAM_BY_ID[row.examId], rightKey);
      return (
        <span style={{
          color: patientPay > 0
            ? 'var(--text-statusbadge-warning, #C2410C)'
            : 'var(--text-content-default)',
        }}>
          {bahtText(patientPay)}
        </span>
      );
    },
  },
  { key: 'actions', header: 'ลบ', align: 'center',
    /* Direct remove, no confirm dialog — parity with XrayOrderPage's row
       delete: unlike a medication row (dose/frequency worth protecting),
       an un-submitted exam line is one checkbox away in the picker. */
    render: (row, idx) => (
      <NeutralSubdueIconButton
        variant='outline'
        size='sm'
        icon='delete'
        aria-label={`ลบ ${XRAY_EXAM_BY_ID[row.examId]?.name ?? row.examId}`}
        onClick={() => removeRow(idx)}
      />
    ),
  },
];

/* Disease-specific "frequently-ordered" card — Figma PHCIS|CPOE 266:26956.
   Bordered shell (1 px brand-quaternary border · 12 px radius · 24 px
   padding) containing:
     • Topic header  · pill icon + bold green title
     • TabBar (3 pills) · ที่ฉันบันทึกไว้ / ที่แพทย์มักสั่งบ่อย / ที่ผู้ป่วยรายนี้ใช้บ่อย
     • Subtext     · 'กด " + " เพื่อเพิ่มยารายการใหม่เข้าใน Order'
     • Chip row    · FREQUENT_ORDER_CHIPS_BY_TAB[activeTab] rendered as
                     add (`+`) tags — 10 entries per persona, all
                     curated for the hypertension context the card
                     advertises. */
const FREQUENT_ORDER_TABS = [
  { key: 'mine',    label: 'ที่ฉันบันทึกไว้' },
  { key: 'doctor',  label: 'ที่แพทย์มักสั่งบ่อย' },
  { key: 'patient', label: 'ที่ผู้ป่วยรายนี้ใช้บ่อย' },
];

/* Per-tab chip rosters for FrequentOrdersCard. All three lists are
   themed for the disease context the card advertises (hypertension /
   common comorbidities like dyslipidaemia, diabetes, gastric
   protection) but vary by persona:
     • mine     — the doctor's personal bookmark shelf (HT first-line
                  + statins + antiplatelet + diuretic / β-blocker).
     • doctor   — generally most-prescribed HT-context meds across
                  the clinic (overlap with `mine` plus broader picks).
     • patient  — what THIS patient already takes / has taken in past
                  visits (per their HT + comorbidity history). Maps
                  loosely to TREATMENT_VISITS for HN 67-00004 / 67-00006.
   Images fall back to the ibuprofen tile when the medication doesn't
   have a dedicated `med-<slug>.png` in /public/images/medications/ —
   same fallback policy as OFTEN_ORDER_CHIPS / MEDICATION_NAME_OPTIONS. */
const MED_IMG_PATH = medImg;
const MED_FALLBACK = FALLBACK_MED_IMG;
const FREQUENT_ORDER_CHIPS_BY_TAB = {
  mine: [
    { key: 'amlodipine-5',     label: 'Amlodipine 5 mg',           image: MED_FALLBACK },
    { key: 'enalapril-5',      label: 'Enalapril 5 mg',            image: MED_FALLBACK },
    { key: 'losartan-50',      label: 'Losartan 50 mg',            image: MED_FALLBACK },
    { key: 'hctz-25',          label: 'Hydrochlorothiazide 25 mg', image: MED_FALLBACK },
    { key: 'metoprolol-50',    label: 'Metoprolol 50 mg',          image: MED_FALLBACK },
    { key: 'atorvastatin-20',  label: 'Atorvastatin 20 mg',        image: MED_FALLBACK },
    { key: 'aspirin-81',       label: 'Aspirin 81 mg',             image: MED_FALLBACK },
    { key: 'furosemide-40',    label: 'Furosemide 40 mg',          image: MED_FALLBACK },
    { key: 'bisoprolol-5',     label: 'Bisoprolol 5 mg',           image: MED_FALLBACK },
    { key: 'spironolactone-25',label: 'Spironolactone 25 mg',      image: MED_FALLBACK },
  ],
  doctor: [
    { key: 'amlodipine-5',     label: 'Amlodipine 5 mg',           image: MED_FALLBACK },
    { key: 'losartan-50',      label: 'Losartan 50 mg',            image: MED_FALLBACK },
    { key: 'enalapril-5',      label: 'Enalapril 5 mg',            image: MED_FALLBACK },
    { key: 'hctz-25',          label: 'Hydrochlorothiazide 25 mg', image: MED_FALLBACK },
    { key: 'simvastatin-20',   label: 'Simvastatin 20 mg',         image: MED_FALLBACK },
    { key: 'aspirin-81',       label: 'Aspirin 81 mg',             image: MED_FALLBACK },
    { key: 'metformin-500',    label: 'Metformin 500 mg',          image: MED_FALLBACK },
    { key: 'atorvastatin-10',  label: 'Atorvastatin 10 mg',        image: MED_FALLBACK },
    { key: 'atenolol-50',      label: 'Atenolol 50 mg',            image: MED_FALLBACK },
    { key: 'indapamide-1-5',   label: 'Indapamide 1.5 mg',         image: MED_FALLBACK },
  ],
  patient: [
    { key: 'amlodipine-5',     label: 'Amlodipine 5 mg',           image: MED_FALLBACK },
    { key: 'enalapril-5',      label: 'Enalapril 5 mg',            image: MED_FALLBACK },
    { key: 'metformin-500',    label: 'Metformin 500 mg',          image: MED_FALLBACK },
    { key: 'simvastatin-20',   label: 'Simvastatin 20 mg',         image: MED_FALLBACK },
    { key: 'aspirin-81',       label: 'Aspirin 81 mg',             image: MED_FALLBACK },
    { key: 'omeprazole-20',    label: 'Omeprazole 20 mg',          image: MED_IMG_PATH('omeprazole')   },
    { key: 'paracetamol-500',  label: 'Paracetamol 500 mg',        image: MED_IMG_PATH('paracetamol') },
    { key: 'cetirizine-10',    label: 'Cetirizine 10 mg',          image: MED_IMG_PATH('cetirizine')  },
    { key: 'vitamin-b',        label: 'Vitamin B Complex',         image: MED_FALLBACK },
    { key: 'folic-acid-5',     label: 'Folic Acid 5 mg',           image: MED_FALLBACK },
  ],
};

const FrequentOrdersCard = ({ onInsertChip, selectedLabels }) => {
  const [activeTab, setActiveTab] = useState(FREQUENT_ORDER_TABS[0].key);
  /* Normalize the caller's `selectedLabels` into a Set for O(1) lookup
     during the chip render. Accepting either a Set or an Array means
     the parent can pass `form.medications.map(m => m.name)` directly
     without re-wrapping. Falsy / missing prop ⇒ empty Set so the chips
     all render in their default (add) state. Same selection-feedback
     pattern the Select dropdown's `DropdownRow` uses (tick + active
     tone for the option that matches the current value). */
  const selectedSet = selectedLabels instanceof Set
    ? selectedLabels
    : new Set(Array.isArray(selectedLabels) ? selectedLabels : []);
  /* กรอบ พื้นเทา และหัวข้อ "รายการที่สั่งบ่อยสำหรับโรคนี้" ถูกถอดออก
     31 ส.ค. 69 (มติผู้ใช้) — ชุดชิปนี้ย้ายไปวางใต้ตารางในการ์ดขาวของขั้นสั่ง
     การรักษาแล้ว จึงไม่ต้องมีเปลือกการ์ดของตัวเองซ้อนอีกชั้น */
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <div
        className='flex flex-col w-full'
        style={{ gap: 'var(--dim-space-300)' }}
      >
        {/* Figma PHCIS|CPOE 207:21567 — Default Tab Pill (32 px h · 14 px
            sm label · 12/6 px pad). TabPillSmall = Figma "Default" on
            node 370:30; TabPillLarge oversizes the bar (~56 px). */}
        <TabBar aria-label='รายการที่สั่งบ่อย' className='self-start'>
          {FREQUENT_ORDER_TABS.map((tab) => (
            <TabPillSmall
              key={tab.key}
              selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </TabPillSmall>
          ))}
        </TabBar>
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <span style={{
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            lineHeight: 1.5,
          }}>
            กด &quot; + &quot; เพื่อเพิ่มยารายการใหม่เข้าใน Order
          </span>
          <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-300)' }}>
            {(FREQUENT_ORDER_CHIPS_BY_TAB[activeTab] || []).map((chip) => {
              /* Selected = this chip's medication is already in the
                 current order (matched by label, which mirrors the
                 medication-row `name`). When selected, the chip:
                   • swaps its leading `add` glyph for `check` (same
                     positive-success affordance the Select dropdown
                     uses for its picked option), AND
                   • flips into TabCapsule's `active` visual state so
                     the surface/border/text retint to the brand
                     selected tone — making the picked chip read as
                     "already in the order" at a glance.
                 Click still routes through `onInsertChip` so the
                 doctor can re-add (duplicate) a chip if they really
                 want to; the popup is the gate for that, not the
                 chip. */
              const isSelected = selectedSet.has(chip.label);
              return (
                <TabCapsule
                  key={chip.key}
                  variant='filter'
                  leadingIcon={isSelected ? 'check' : 'add'}
                  label={chip.label}
                  showLeadingIcon
                  showTrailingIcon={false}
                  selected={isSelected}
                  onClick={() => onInsertChip(chip)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/* Per-category empty-state copy (Figma PHCIS|CPOE 269:32427 — "Empty").
   When the active order category has no rows yet, the title row +
   allergy alert + table are replaced by an illustrated placeholder
   (Lottie `Medical checkup` + bold green title + tertiary subtitle +
   the same Re-Diagnosis / เพิ่ม CTA pair the top row would have shown).
   Only the medication tab is fleshed out in the Figma node; the other
   four categories reuse the same shell with category-specific copy so
   switching tabs still reads as "ยังไม่มีรายการ … ที่สั่ง · กรุณาสั่ง …". */
const ORDER_EMPTY_STATE_TEXT = {
  medication: { title: 'ยังไม่มีรายการยาที่สั่ง',         subtitle: 'กรุณาสั่งยา',        addLabel: 'เพิ่มยา'      },
  medicalSupply: { title: 'ยังไม่มีเวชภัณฑ์มิใช่ยาที่สั่ง', subtitle: 'กรุณาเพิ่มเวชภัณฑ์', addLabel: 'เพิ่มเวชภัณฑ์' },
  lab:        { title: 'ยังไม่มีรายการแล็บที่สั่ง',        subtitle: 'กรุณาสั่งแล็บ',       addLabel: 'เพิ่มแล็บ'    },
  xray:       { title: 'ยังไม่มีรายการ X-ray ที่สั่ง',    subtitle: 'กรุณาสั่ง X-ray',     addLabel: 'เพิ่ม X-ray'  },
  procedure:  { title: 'ยังไม่มีรายการหัตถการที่สั่ง',     subtitle: 'กรุณาสั่งหัตถการ',     addLabel: 'เพิ่มหัตถการ' },
  consult:    { title: 'ยังไม่มีรายการขอปรึกษา',          subtitle: 'กรุณาขอปรึกษา',       addLabel: 'ขอปรึกษา'    },
};

/* Per-category populated-table copy — sibling of ORDER_EMPTY_STATE_TEXT
   above so the title/subtitle pair lives in one lookup instead of
   conditionals sprinkled through the JSX. The medication strings are the
   pre-existing hardcoded copy verbatim (Figma 2508:98437 — do not touch,
   /treat/record is a live demoed screen); only medication + xray tables
   can currently populate, but all five keys exist so a future lab /
   procedure / consult table slots in without touching the JSX again. */
const ORDER_TABLE_TEXT = {
  medication: { title: 'รายการยาที่สั่ง',                  subtitle: 'กด " + " เพื่อเพิ่มยารายการใหม่เข้าใน Order' },
  medicalSupply: { title: 'รายการเวชภัณฑ์มิใช่ยาที่สั่ง', subtitle: 'รายการจะถูกส่งไปห้องยาพร้อมใบสั่งเดียวกัน' },
  lab:        { title: 'รายการแล็บที่สั่ง',                 subtitle: 'กด " + " เพื่อเพิ่มรายการตรวจเข้าใน Order' },
  xray:       { title: 'รายการตรวจทางรังสีวิทยาที่สั่ง',     subtitle: 'กด " + " เพื่อเพิ่มรายการตรวจเข้าใน Order' },
  procedure:  { title: 'รายการหัตถการที่สั่ง',              subtitle: 'กด " + " เพื่อเพิ่มรายการหัตถการเข้าใน Order' },
  consult:    { title: 'รายการขอปรึกษา',                   subtitle: 'กด " + " เพื่อเพิ่มรายการขอปรึกษาเข้าใน Order' },
};

/* CPOE §1.5 — หมวดที่มี panel เต็มรูปของตัวเองแล้ว (แทน empty state เดิม
   ที่ไม่มี picker). `medication` และ `xray` ยังใช้ตาราง/ปุ่มเดิมทั้งหมด
   แล้วเสริม panel ต่อท้าย จึงไม่อยู่ในชุดนี้. */
const CPOE_PANEL_CATEGORIES = new Set(['medicalSupply', 'lab', 'procedure', 'consult']);

const normalizeTreatmentOrderIdentity = (value) => String(value || '')
  .toLocaleLowerCase('th-TH')
  .replace(/\s+/g, '')
  .replace(/[()\-–—]/g, '');

const pickerTreatmentOrderKey = (item = {}) => {
  const source = item.source || {};
  if (item.category === 'medication' || item.category === 'medicalSupply') {
    return `${item.category}:${normalizeTreatmentOrderIdentity(item.name)}`;
  }
  if (item.category === 'lab' || item.category === 'xray') {
    return `${item.category}:${source.id || item.name}`;
  }
  if (item.category === 'procedure') {
    return `procedure:${source.code || normalizeTreatmentOrderIdentity(item.name)}`;
  }
  if (item.category === 'consult') {
    return `consult:${source.key || normalizeTreatmentOrderIdentity(item.name)}`;
  }
  return `${item.category || 'unknown'}:${normalizeTreatmentOrderIdentity(item.name)}`;
};

/* `onStepChange` / `stepIndexes` ถูกส่งมาจาก TreatmentFormPage อยู่แล้ว —
   รับไว้เพื่อให้สัญญาณ §1.5.4.15 มีปุ่ม "ไปแนบเอกสาร" ที่กระโดดไปขั้นเอกสาร
   ได้จริง. ผู้เรียกที่ไม่มีขั้นเอกสาร (ไม่ส่ง stepIndexes) จะไม่เห็นปุ่มนี้ */
/* หัวข้อของสองส่วนในขั้น "สั่งการรักษา" (มติผู้ใช้ 31 ส.ค. 69) — ขั้นนี้มีสองงาน
   ที่ต้องทำตามลำดับ: ประเมินความปลอดภัยก่อน แล้วจึงสั่งการรักษา ของเดิมทั้งสอง
   ไหลต่อกันโดยไม่มีอะไรบอกว่าเป็นคนละงาน */
const OrderStepHeading = ({ number, title, subtitle }) => (
  <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
    <span
      className='shrink-0 inline-flex items-center justify-center'
      style={{
        width: 'var(--dim-size-600, 32px)',
        height: 'var(--dim-size-600, 32px)',
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: 'var(--surface-brandPrimary-quaternary, #E2F3EB)',
        color: 'var(--text-brandPrimary-default, #007549)',
        fontFamily: 'var(--type-family-heading-content)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-bold)',
      }}
    >
      {number}
    </span>
    <span className='flex flex-col min-w-0'>
      <span style={{
        color: 'var(--text-brandPrimary-default, #007549)',
        fontFamily: 'var(--type-family-heading-content)',
        fontSize: 'var(--type-size-base)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
        lineHeight: 1.5,
      }}
      >
        {title}
      </span>
      {subtitle && (
        <span style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          lineHeight: 1.5,
        }}
        >
          {subtitle}
        </span>
      )}
    </span>
  </div>
);

export const Step5Orders = ({
  form, setForm, patient, cardPatient, onStepChange = null, stepIndexes = null,
}) => {
  const setCategory = (key) => setForm((s) => ({ ...s, orderCategory: key }));
  const dismissAlert = () => setForm((s) => ({ ...s, showAllergyAlert: false }));
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const orderPickerItems = useMemo(() => {
    const medicationCatalog = [
      { name: 'Paracetamol 500mg', allergyTerms: ['paracetamol', 'acetaminophen'] },
      { name: 'Cetirizine 10mg', allergyTerms: ['cetirizine'] },
      { name: 'Ibuprofen 400mg', allergyTerms: ['ibuprofen', 'nsaid', 'nsaids', 'aspirin'] },
      { name: 'Amoxicillin 500mg', allergyTerms: ['amoxicillin', 'penicillin', 'penicillins'] },
    ];
    const recordedAllergies = (patient?.drugAllergies || []).map((item) => String(item.name || '').toLowerCase());
    const medicationItems = medicationCatalog.map(({ name, allergyTerms }, index) => {
      const source = PAST_VISIT_MEDICATIONS.find((item) => item.name === name)
        || PAST_VISIT_MEDICATIONS.find((item) => item.name?.startsWith(name.split(' ')[0]));
      const allergyMatch = recordedAllergies.find((allergy) => allergyTerms.some((term) => allergy.includes(term) || term.includes(allergy)));
      return {
        id: index === 0 ? 'med-paracetamol' : index === 1 ? 'med-cetirizine' : `med-catalog-${index}`,
        category: 'medication', name, unit: source?.unit || 'เม็ด', source,
        allergyMatch: allergyMatch || '',
      };
    });
    const supplyId = { 'gauze-sterile-2x2': 'supply-gauze', 'cotton-ball': 'supply-cotton', 'medical-tape-1': 'supply-tape', 'syringe-5ml': 'supply-syringe', 'surgical-mask': 'supply-mask' };
    return [
      ...medicationItems,
      ...MEDICAL_SUPPLY_CATALOG.map((item) => ({ id: supplyId[item.value] || `supply-${item.value}`, category: 'medicalSupply', name: item.label, unit: item.unit })),
      ...LAB_TESTS.filter((item) => !item.retired).map((item) => ({ id: `lab-${item.id}`, category: 'lab', name: `${item.nameEn} — ${item.nameTh}`, detail: `${item.code} · ${item.price.toLocaleString('th-TH')} บาท`, source: item })),
      ...XRAY_EXAMS.filter((item) => !item.retired).map((item) => ({ id: `xray-${item.id}`, category: 'xray', name: item.name, detail: `${item.code} · ${item.price.toLocaleString('th-TH')} บาท`, source: item })),
      ...ICD9_PROCEDURES.map((item) => ({ id: `procedure-${item.code}`, category: 'procedure', name: item.nameTh, unit: item.unit, detail: `ICD-9-CM ${item.code} · ${item.price.toLocaleString('th-TH')} บาท`, source: item })),
      ...CONSULT_CLINICS.map((item) => ({ id: `consult-${item.key}`, category: 'consult', name: item.label, detail: `คิวรอ ${item.waiting} ราย · สร้างเป็นคำขอปรึกษาฉบับร่าง`, source: item })),
    ];
  }, [patient?.drugAllergies]);
  const commitPickedOrders = (picked) => {
    if (!picked?.length) return false;

    /* One semantic order may enter with different UI ids (manual list vs
       preset). De-duplicate both within this batch and against active rows. */
    const batchKeys = new Set();
    const uniquePicked = picked.filter((item) => {
      const key = pickerTreatmentOrderKey(item);
      if (batchKeys.has(key)) return false;
      batchKeys.add(key);
      return true;
    });
    const existingKeys = new Set([
      ...(form.medications || []).filter((row) => !row.cancelledAt)
        .map((row) => `medication:${normalizeTreatmentOrderIdentity(row.name)}`),
      ...(form.medicalSupplies || []).filter((row) => !row.cancelledAt)
        .map((row) => `medicalSupply:${normalizeTreatmentOrderIdentity(row.name)}`),
      ...(form.labs || []).filter((row) => !row.cancelledAt).map((row) => `lab:${row.testId}`),
      ...(form.xrayOrders || []).map((row) => `xray:${row.examId}`),
      ...(form.procedureOrders || []).filter((row) => !row.cancelledAt)
        .map((row) => `procedure:${row.code || normalizeTreatmentOrderIdentity(row.name)}`),
      ...(form.consultOrders || []).filter((row) => !row.cancelledAt && row.status !== 'cancelled')
        .map((row) => `consult:${row.toClinic}`),
    ]);
    const pending = uniquePicked.filter((item) => !existingKeys.has(pickerTreatmentOrderKey(item)));
    const now = Date.now();

    const pickedConsults = pending.filter((item) => item.category === 'consult').map((item) => {
      const clinic = item.source;
      const defaults = item.presetDefaults || {};
      const doctor = doctorsForClinic(clinic.key).find((candidate) => candidate.onDuty);
      return saveConsult({
        ...blankConsult(), hn: patient?.hn || '', cid: patient?.cid || patient?.nationalId || '',
        name: cardPatient?.fullName || patient?.name || '', rights: patient?.rights || '',
        age: patient?.age ? `${patient.age} ปี` : '', gender: patient?.gender || '',
        visitId: form?.visitId || 'v-current', toClinic: clinic.key, toDoctor: doctor?.key || '',
        provisionalDx: (form?.diagnoses || []).map((d) => `${d.code || ''} ${d.name || ''}`.trim()).join(' · '),
        provisionalDxAutoFilled: (form?.diagnoses?.length || 0) > 0,
        question: `ขอปรึกษา${clinic.short || clinic.label}`,
        urgency: defaults.urgency || 'routine', consultType: 'general',
        confidential: !!clinic.confidential, note: defaults.note || '',
        quantity: Number(defaults.quantity || 1), unit: defaults.unit || 'คำขอ',
        days: defaults.days || '', dosePerTake: defaults.dosePerTake || '',
        frequency: defaults.frequency || '', presetDefaults: defaults,
      });
    });
    let blockedXray = null;
    const pickedXrays = pending.filter((item) => {
      if (item.category !== 'xray') return false;
      const warning = duplicateWarning(item.source.id, xrayHistory);
      if (warning?.level === 'block') { blockedXray = { examId: item.source.id, warning }; return false; }
      return true;
    });
    if (blockedXray) setXrayBlockNotice(blockedXray);

    setForm((current) => ({
      ...current,
      medications: [
        ...(current.medications || []),
        ...pending.filter((item) => item.category === 'medication').map((item, index) => {
          const source = item.source || {};
          const defaults = item.presetDefaults || {};
          const quantity = Number(defaults.quantity ?? source.quantity ?? 1);
          const unit = defaults.unit || source.unit || item.unit || 'เม็ด';
          const dosePerTake = defaults.dosePerTake || source.dosePerTake || '1';
          const frequency = defaults.frequency || source.frequency || 'วันละ 1 ครั้ง';
          const when = defaults.when || source.when || 'หลังอาหาร';
          const presetUsage = defaults.dosePerTake || defaults.frequency || defaults.days
            ? `รับประทานครั้งละ ${dosePerTake} ${unit} ${frequency}${when ? ` ${when}` : ''}${defaults.days ? ` เป็นเวลา ${defaults.days} วัน` : ''}`
            : '';
          const unitPrice = Number(source.unitPrice || 0);
          return {
            id: `med-${now}-${index}`, registryId: source.registryId || '',
            image: resolveMedicationImage(item.name, source.image), name: item.name,
            orderStatus: 'continue', usage: presetUsage || source.usage || 'รับประทาน (Oral)',
            dosePerTake, unit, frequency, when,
            warning: source.warning || '', quantity,
            totalPrice: unitPrice ? unitPrice * quantity : (source.totalPrice ?? 0),
            reimbursable: !!source.reimbursable, purpose: source.purpose || '',
            days: defaults.days || '', urgency: defaults.urgency || 'routine', note: defaults.note || '',
            sigDetail: defaults.days ? { durationDays: defaults.days, doseAmount: dosePerTake } : undefined,
            presetDefaults: defaults,
            approve: false, consult: false, stat: defaults.urgency === 'stat', print: false, editor: 'พญ.สมหญิง',
          };
        }),
      ],
      medicalSupplies: [
        ...(current.medicalSupplies || []),
        ...pending.filter((item) => item.category === 'medicalSupply').map((item, index) => {
          const defaults = item.presetDefaults || {};
          return {
            id: `supply-${now}-${index}`, itemType: 'non_drug_supply', name: item.name,
            unit: defaults.unit || item.unit || 'ชิ้น', quantity: Number(defaults.quantity || 1),
            orderStatus: 'continue', urgency: defaults.urgency || 'routine', note: defaults.note || '',
            days: defaults.days || '', dosePerTake: defaults.dosePerTake || '',
            frequency: defaults.frequency || '', presetDefaults: defaults,
          };
        }),
      ],
      labs: [
        ...(current.labs || []),
        ...pending.filter((item) => item.category === 'lab').map((item, index) => {
          const defaults = item.presetDefaults || {};
          return {
            id: `lab-${item.source.id}-${now}-${index}`, testId: item.source.id,
            urgency: defaults.urgency || 'routine', note: defaults.note || '',
            quantity: Number(defaults.quantity || 1), unit: defaults.unit || 'ครั้ง',
            days: defaults.days || '', dosePerTake: defaults.dosePerTake || '',
            frequency: defaults.frequency || '', presetDefaults: defaults,
            duplicateWarned: false, duplicateReason: '', cancelledAt: '', cancelReason: '',
          };
        }),
      ],
      xrayOrders: [
        ...(current.xrayOrders || []),
        ...pickedXrays.map((item) => {
          const defaults = item.presetDefaults || {};
          return {
            examId: item.source.id, view: item.source.views?.[0] || '',
            urgency: defaults.urgency || 'routine', note: defaults.note || '',
            quantity: Number(defaults.quantity || 1), unit: defaults.unit || 'ครั้ง',
            days: defaults.days || '', dosePerTake: defaults.dosePerTake || '',
            frequency: defaults.frequency || '', presetDefaults: defaults,
          };
        }),
      ],
      procedureOrders: [
        ...(current.procedureOrders || []),
        ...pending.filter((item) => item.category === 'procedure').map((item, index) => {
          const defaults = item.presetDefaults || {};
          return {
            id: `proc-${now}-${index}`, code: item.source.code, name: item.source.nameTh,
            uncoded: !item.source.code,
            startDate: new Date().toISOString().slice(0, 10), startTime: '', endDate: '', endTime: '', site: '',
            qty: Number(defaults.quantity || 1), unit: defaults.unit || item.source.unit,
            unitPrice: item.source.price, claimPerUnit: item.source.claim,
            performer: 'somying', detail: defaults.note || '', note: defaults.note || '',
            urgency: defaults.urgency || 'routine', days: defaults.days || '',
            dosePerTake: defaults.dosePerTake || '', frequency: defaults.frequency || '',
            presetDefaults: defaults, otherActivity: '', cancelledAt: '', cancelReason: '',
          };
        }),
      ],
      consultOrders: [...(current.consultOrders || []), ...pickedConsults],
      orderCategory: pending[0]?.category || current.orderCategory,
    }));
    return true;
  };

  /* Re-Medicine popup state (Figma PHCIS|CPOE 200:23111). Opens from
     either Re-Diagnosis CTA — the title-row button (rows.length > 0)
     and the empty-state button (rows.length === 0) share the same
     popup so the clinician can re-issue prescriptions whether or not
     the current visit already has medication rows. On confirm,
     selected past-visit prescriptions are appended to
     `form.medications` with fresh ids + workflow flags reset, so the
     re-issued rows enter the table in a "not yet routed" state
     (Approve / Consult / STAT / พิมพ์ all false) the doctor can
     re-flag from the table's edit step. */
  const [reMedicineOpen, setReMedicineOpen] = useState(false);
  const appendPastMedications = (picked) => {
    if (!picked || picked.length === 0) return;
    setForm((s) => ({
      ...s,
      medications: [
        ...s.medications,
        ...picked.map((p, i) => ({
          /* Fresh id so React's keyed reconciliation doesn't collide
             with the popup's own `pvm-*` ids if the same row is
             re-picked across multiple sessions. */
          id: `med-${Date.now()}-${i}`,
          image: resolveMedicationImage(p.name, p.image),
          name: p.name,
          orderStatus: p.orderStatus || 'continue',
          statusEffectiveMode: p.statusEffectiveMode || 'immediate',
          statusEffectiveAt: p.statusEffectiveAt || '',
          lastDoseAt: p.lastDoseAt || '',
          statusReason: p.statusReason || '',
          usage: p.usage || 'รับประทาน',
          dosePerTake: p.dosePerTake || '1',
          unit: p.unit || 'เม็ด',
          frequency: p.frequency || 'วันละครั้ง',
          when: p.when || 'หลังอาหาร',
          warning: p.warning || '',
          quantity: p.quantity ?? 1,
          totalPrice: p.totalPrice ?? 0,
          reimbursable: !!p.reimbursable,
          purpose: p.purpose || '',
          /* Workflow flags reset — re-issued rows start as plain
             orders so the doctor can re-route via the table's per-row
             actions (Approve / Consult / STAT / พิมพ์ icons). */
          approve: false,
          consult: false,
          stat: false,
          print: false,
          editor: 'พญ.สมหญิง',
        })),
      ],
    }));
  };

  /* ── TOR §1.18.6 — คำสั่งจากการเยี่ยมบ้านที่รอนำเข้า ─────────────
     พยาบาลเยี่ยมบ้านเลือกคำสั่งจากแคตตาล็อกกลางชุดเดียวกันนี้ที่บ้าน
     (`src/data/homevisitCpoe.js`) แล้วส่งมาเป็น handoff ราย HN. ที่นี่แค่
     map id กลับเป็น picker item แล้วส่งเข้า `commitPickedOrders` ตัวเดิม
     — ไม่มีเส้นทางสร้างแถวคำสั่งเส้นที่สองให้ต้องดูแล. */
  const [homeVisitHandoff, setHomeVisitHandoff] = useState(
    () => getPendingCpoeHandoff(patient?.hn),
  );
  const [homeVisitImportNote, setHomeVisitImportNote] = useState('');

  const importHomeVisitOrders = () => {
    if (!homeVisitHandoff) return;
    const byId = new Map(orderPickerItems.map((item) => [item.id, item]));
    const matched = homeVisitHandoff.items.map((i) => byId.get(i.id)).filter(Boolean);
    const missing = homeVisitHandoff.items.length - matched.length;
    /* กติกาของ CPOE ยังบังคับกับคำสั่งที่มาจากบ้านเหมือนกันทุกข้อ — เช่น
       เอกซเรย์ซ้ำในระยะป้องกันรังสีถูก block. คำนวณไว้ก่อนเพื่อรายงานตามจริง
       ว่ารายการไหน "ไม่ได้เข้า" แทนที่จะขึ้นว่าเข้าครบทุกรายการ */
    const blocked = matched.filter((item) => item.category === 'xray'
      && duplicateWarning(item.source?.id, xrayHistory)?.level === 'block');
    const accepted = matched.length - blocked.length;
    const committed = commitPickedOrders(matched);
    markCpoeHandoffImported(patient?.hn, accepted, 'พญ.สมหญิง รักษ์ดี');
    setHomeVisitHandoff(null);
    setHomeVisitImportNote(
      committed && accepted > 0
        ? `นำเข้าคำสั่งจากการเยี่ยมบ้าน ${accepted} รายการเข้าขั้นสั่งการรักษาแล้ว`
          + `${missing > 0 ? ` · ข้าม ${missing} รายการที่ไม่มีในแคตตาล็อกปัจจุบัน` : ''}`
          + `${blocked.length > 0 ? ` · ระบบไม่อนุญาต ${blocked.length} รายการ (${blocked.map((b) => b.name).join(' · ')}) — ดูเหตุผลที่แท็บ X-ray / RIS` : ''}`
          + ' — ตรวจสอบรายละเอียดแต่ละรายการก่อนยืนยัน'
        : blocked.length > 0
          ? `คำสั่งจากการเยี่ยมบ้านถูกกันไว้ทั้งหมด ${blocked.length} รายการ (${blocked.map((b) => b.name).join(' · ')})`
            + ' — เปิดแท็บ X-ray / RIS เพื่อดูเหตุผลและตัดสินใจ'
          : 'คำสั่งจากการเยี่ยมบ้านมีอยู่ใน Visit นี้แล้วทั้งหมด — ไม่มีรายการใหม่ที่ต้องเพิ่ม',
    );
  };

  /* AddMedicationPopup state — shared between "เพิ่มยา" (add), the
     per-row Edit icon button (Figma 195:34355), and the "Often order"
     chips that pre-seed the ชื่อยา field. `addMedEditIndex` is null
     for add mode (popup commits via append) or a row index for edit
     mode (popup commits via in-place patch + seeds from the existing
     row's values). `addMedSeed` holds the chip-driven prefill (name +
     image only — the doctor still picks วิธีใช้ / หน่วย / ทาน /
     จำนวน / ความถี่ / เวลาใช้ยา / การใช้ / คำเตือน). Closing always
     resets all three so the next open starts in add mode with a blank
     draft unless re-seeded. */
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [addMedEditIndex, setAddMedEditIndex] = useState(null);
  const [addMedSeed, setAddMedSeed] = useState(null);
  const openAddMed = () => {
    setAddMedEditIndex(null);
    setAddMedSeed(null);
    setAddMedOpen(true);
  };
  const openEditMed = (idx) => {
    setAddMedEditIndex(idx);
    setAddMedSeed(null);
    setAddMedOpen(true);
  };
  /* Chip-driven open — same popup as "เพิ่มยา" but with ชื่อยา
     pre-filled from the chip's label. Mode stays "add" (no
     `addMedEditIndex`), so committing appends a fresh row. */
  /* กดชิปแล้วเพิ่มลงตารางทันที ไม่เปิดป๊อปอัปให้กรอกก่อน (มติผู้ใช้ 31 ส.ค. 69)
     — ชิปคือ "ยาที่สั่งบ่อย" ทั้งชุด ค่าเริ่มต้นของวิธีใช้/ขนาด/ความถี่จึงใช้ชุด
     เดียวกับที่ `commitMedFromPopup` เติมให้เมื่อผู้ใช้ไม่ได้แก้ ถ้าต้องปรับ
     รายละเอียดยังกดปุ่มแก้ไขที่แถวได้เหมือนเดิม
     กดซ้ำที่ชิปที่เพิ่มไปแล้วจะไม่เพิ่มซ้ำ — ชิปนั้นขึ้นติ๊กถูกอยู่แล้ว
     (`selectedLabels` มาจากชื่อยาในตาราง) การกดซ้ำจึงถือว่าไม่ได้ตั้งใจสั่งซ้ำ */
  const openAddMedFromChip = (chip) => {
    const registryMeta = medicationRegistryDefaults(chip.label);
    setForm((s) => {
      const rows = s.medications || [];
      if (rows.some((m) => m.name === chip.label)) return s;
      return {
        ...s,
        medications: [
          ...rows,
          {
            id: `med-${Date.now()}`,
            image: resolveMedicationImage(chip.label, chip.image),
            name: chip.label,
            orderStatus: 'continue',
            statusEffectiveMode: 'immediate',
            statusEffectiveAt: '',
            lastDoseAt: '',
            statusReason: '',
            usage: 'รับประทาน (Oral)',
            dosePerTake: '1',
            unit: 'เม็ด',
            frequency: 'วันละ 1 ครั้ง',
            when: 'หลังอาหาร',
            warning: registryMeta.warning,
            quantity: 1,
            reimbursable: false,
            purpose: registryMeta.purpose,
            totalPrice: 0,
            approve: false, consult: false, stat: false, print: false,
            editor: 'พญ.สมหญิง',
          },
        ],
      };
    });
  };
  const closeAddMed = () => {
    setAddMedOpen(false);
    setAddMedEditIndex(null);
    setAddMedSeed(null);
  };

  /* "ยาทั้งหมด" — Figma PHCIS|CPOE 200:18623. Browse-the-whole-drug-
     catalog CTA, sits beside Re-Diagnosis in the title-row action
     cluster. The destination popup (all-formulary picker) has not been
     designed yet; until it lands we no-op so the button still ships in
     its Figma-mandated position without inventing UX we don't have
     spec for. Swap this stub for `setAllMedsOpen(true)` once the
     picker exists. */
  const openAllMeds = () => {
    /* TODO(treatment-step5): wire to AllMedicationsPopup once
       designed. Tracked in Figma 200:18623's parent flow. */
  };
  /* Commit handler for AddMedicationPopup — branches on the popup's
     current mode (`addMedEditIndex === null` ⇒ add, otherwise edit
     the row at that index). In edit mode the popup's full field set
     overwrites the row's editable columns; workflow flags
     (approve / consult / stat / print) are preserved so a row that
     was already routed for approval doesn't get reset when the doctor
     tweaks dose/frequency. In add mode the new row enters with all
     workflow flags false (untouched). */
  const commitMedFromPopup = (entry) => {
    /* ช่อง "คำเตือน" กับ "การใช้" ที่ปล่อยว่างให้ตกไปที่ค่าของทะเบียนยา
       (มติผู้ใช้ 31 ส.ค. 69) — เป็นข้อมูลของตัวยา ไม่ใช่สิ่งที่แพทย์ต้องพิมพ์ซ้ำ
       ทุกครั้ง ถ้าพิมพ์เองมาแล้วของที่พิมพ์ชนะเสมอ */
    const registryMeta = medicationRegistryDefaults(entry.name);
    const normalized = {
      name: entry.name,
      orderStatus: entry.orderStatus || 'continue',
      statusEffectiveMode: entry.statusEffectiveMode || 'immediate',
      statusEffectiveAt: entry.statusEffectiveAt || '',
      lastDoseAt: entry.lastDoseAt || '',
      statusReason: entry.statusReason || '',
      usage: entry.usage || 'รับประทาน (Oral)',
      dosePerTake: entry.dosePerTake || '1',
      unit: entry.unit || 'เม็ด',
      frequency: entry.frequency || 'วันละ 1 ครั้ง',
      when: entry.when || 'หลังอาหาร',
      warning: entry.warning || registryMeta.warning,
      quantity: entry.quantity ?? 1,
      reimbursable: !!entry.reimbursable,
      purpose: entry.purpose || registryMeta.purpose,
    };
    setForm((s) => {
      if (addMedEditIndex == null) {
        return {
          ...s,
          medications: [
            ...s.medications,
            {
              id: `med-${Date.now()}`,
              /* Chip-seeded opens round-trip `image` through the popup's
                 draft so the new row keeps the blister-pack thumbnail
                 the chip rendered. Falls back to '' for blank-start
                 opens that never receive an image. */
              image: resolveMedicationImage(entry.name, entry.image),
              ...normalized,
              totalPrice: 0,
              approve: false, consult: false, stat: false, print: false,
              editor: 'พญ.สมหญิง',
            },
          ],
        };
      }
      return {
        ...s,
        medications: s.medications.map((row, i) => (
          i === addMedEditIndex
            ? {
              ...row,
              ...normalized,
              image: resolveMedicationImage(entry.name, entry.image ?? row.image),
              editor: 'พญ.สมหญิง',
            }
            : row
        )),
      };
    });
  };
  /* Delete-confirm — Figma PHCIS|CPOE 280:28154. `pendingMedDelete` holds
     the row index while the AlertDialog is open; the table delete icon
     opens this popup and requires an audit reason before removal. */
  const [pendingMedDelete, setPendingMedDelete] = useState(null);
  const confirmDeleteMed = (reason) => {
    if (pendingMedDelete != null) {
      const deleted = form.medications[pendingMedDelete];
      setForm((s) => ({
        ...s,
        medications: s.medications.filter((_, i) => i !== pendingMedDelete),
        medicationDeletionLog: [
          ...(s.medicationDeletionLog || []),
          {
            id: deleted?.id || `deleted-med-${Date.now()}`,
            name: deleted?.name || '',
            reason,
            deletedAt: new Date().toISOString(),
            deletedBy: 'พญ.สมหญิง',
          },
        ],
      }));
    }
    setPendingMedDelete(null);
  };
  const requestRemoveMed = (idx) => setPendingMedDelete(idx);
  /* Patch a single medication row in-place — used by every inline-
     editable cell (Select / Stepper / Checkbox renderers) so the form
     state stays the single source of truth as the doctor edits the
     table. `patch` is a shallow merge over the row at `idx`. */
  const updateMed = (idx, patch) => setForm((s) => ({
    ...s,
    medications: s.medications.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
  }));

  /* Medication-table columns — built once per render via the
     `buildMedTableColumns` factory so every cell renderer closes over
     the current `updateMed` / `removeMed` / `openEditMed` callbacks.
     `setForm` and `setAddMedOpen` are stable across renders (React
     useState) so passing the helpers through `[]` deps is safe — the
     helpers are recreated every render but only reference stable
     setters, so a stale closure can't bind to stale form state. */
  const columns = useMemo(
    () => buildMedTableColumns({
      updateRow: updateMed,
      editRow: openEditMed,
      removeRow: setPendingMedDelete,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /* ── X-ray category (TOR §1.12.5.4) ──────────────────────────────────
     "เพิ่ม X-ray" opens the shared RIS picker (XrayOrderPicker, popup
     variant — no router hooks, safe inside this form) instead of the
     medication popup. Selection persists into `form.xrayOrders` as
     `[{ examId, view, urgency }]` — mock-only on the doctor's side; the
     RIS worklist mock (XRAY_ORDERS) is never written to from here. */
  const [xrayPickerOpen, setXrayPickerOpen] = useState(false);
  const openAddXray = () => setXrayPickerOpen(true);
  /* A refused (level 'block') add — defence-in-depth roll-up surfaced as
     a destructive banner above the table. The picker itself already
     refuses blocked exams (it receives the same history), but the gate
     is re-run on every add here because what it protects is radiation
     dose, not money: a second identical film inside ~10% of the repeat
     window re-irradiates the patient (TOR §1.12.5.9). */
  const [xrayBlockNotice, setXrayBlockNotice] = useState(null);

  /* Prior imaging for THIS patient — feeds the picker's inline warnings
     and the add-gate below (same shape §1.12.5.7 / §1.12.5.9 share). */
  const xrayHistory = useMemo(() => xrayHistoryFor(patient?.hn), [patient?.hn]);
  /* สิทธิ from the MR roster's Thai label → claimByRight fund key
     (TOR §1.12.4.2). Unknown / missing right ⇒ CASH (ชำระเอง). */
  const xrayRightKey = XRAY_RIGHT_KEY_BY_MR_RIGHT[patient?.rights] ?? 'CASH';

  /* Commit from the picker — reconcile its examId[] against the current
     rows so per-row edits (ท่าถ่าย / ความเร่งด่วน) survive a reopen:
     retained ids keep their row object, dropped ids fall away, new ids
     enter with the exam's first registered view + routine urgency. Each
     NEW id re-runs duplicateWarning: 'block' is refused (banner explains
     days-ago vs window), 'warn' proceeds — the roll-up Alert above the
     table keeps it visible (TOR §1.12.5.9). */
  const commitXraySelection = (nextIds) => {
    const prevById = Object.fromEntries(form.xrayOrders.map((o) => [o.examId, o]));
    const next = [];
    let refused = null;
    nextIds.forEach((id) => {
      if (prevById[id]) { next.push(prevById[id]); return; }
      const w = duplicateWarning(id, xrayHistory);
      if (w?.level === 'block') { refused = { examId: id, warning: w }; return; }
      const exam = XRAY_EXAM_BY_ID[id];
      next.push({ examId: id, view: exam?.views?.[0] ?? '', urgency: 'routine' });
    });
    setXrayBlockNotice(refused);
    setForm((s) => ({ ...s, xrayOrders: next }));
  };

  /* Same in-place patch / remove idiom as updateMed / removeMed above —
     the inline ท่าถ่าย + ความเร่งด่วน selects and the row delete keep
     `form.xrayOrders` as the single source of truth. */
  const updateXrayRow = (idx, patch) => setForm((s) => ({
    ...s,
    xrayOrders: s.xrayOrders.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
  }));
  const removeXrayRow = (idx) => setForm((s) => ({
    ...s,
    xrayOrders: s.xrayOrders.filter((_, i) => i !== idx),
  }));

  /* Column factory — same stable-setter argument as the medication
     `columns` memo above; `xrayRightKey` is the only render-time input
     and it only changes with the open visit's patient. */
  const xrayColumns = useMemo(
    () => buildXrayTableColumns({
      updateRow: updateXrayRow,
      removeRow: removeXrayRow,
      rightKey: xrayRightKey,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [xrayRightKey],
  );

  /* ── Clinical safety derivations (TOR §1.12.5.3 / §1.12.5.9) ─────────
     Carried over from the RIS order screen so the doctor sees the same
     gates the radiology desk would raise, at the moment of ordering. */
  const xrayExamsInOrder = form.xrayOrders
    .map((o) => XRAY_EXAM_BY_ID[o.examId])
    .filter(Boolean);
  const xrayContrastExams = xrayExamsInOrder.filter((e) => e.contrast);
  /* แจ้งเตือนแพ้สารทึบรังสี — recorded drug allergy × a contrast exam.
     Destructive tone on purpose: iodinated-contrast anaphylaxis is the
     death-on-the-table scenario (§1.12.5.3). */
  const xrayContrastAllergyDanger = xrayContrastExams.length > 0
    && ((patient?.drugAllergies?.length ?? 0) > 0 || patient?.flags?.allergyDrug);
  /* ตั้งครรภ์ — female patient + an IONISING exam flagged femaleScreening
     (abdomen/pelvis radiography, mammography). US/MRI don't irradiate,
     so they never trip this (§1.12.5.3). */
  const xrayPregnancyWatch = patient?.gender === 'หญิง'
    && xrayExamsInOrder.some((e) => e.femaleScreening && !XRAY_NON_IONIZING.has(e.modality));
  /* Warn-level repeats among the CHOSEN rows — ordering anyway is allowed
     for 'warn' (§1.12.5.9 only refuses 'block'), so this informs for as
     long as the row stays in the order, not just at add time. */
  const xrayDupWarns = form.xrayOrders
    .map((o) => ({ id: o.examId, warning: duplicateWarning(o.examId, xrayHistory) }))
    .filter((x) => x.warning?.level === 'warn');
  /* Totals footer — §1.12.5.4 "ข้อมูลยอดรวมทั้งหมด", per-สิทธิ split. */
  const xraySummary = summariseSelection(form.xrayOrders.map((o) => o.examId), xrayRightKey);

  const activeCategory = form.orderCategory || 'medication';
  /* `medication` and `xray` are the two categories with a real table on
     this branch; the other three stay empty-state-only (their pickers
     don't exist yet — do not invent them here). */
  const rows = activeCategory === 'medication'
    ? form.medications
    : activeCategory === 'xray'
      ? form.xrayOrders
      : [];

  const hasAnyTreatmentOrder = (form.medications?.length || 0)
    + (form.medicalSupplies?.length || 0)
    + (form.labs?.filter((item) => !item.cancelledAt).length || 0)
    + (form.xrayOrders?.length || 0)
    + (form.procedureOrders?.filter((item) => !item.cancelledAt).length || 0)
    + (form.consultOrders?.filter((item) => !item.cancelledAt).length || 0) > 0;

  if (!hasAnyTreatmentOrder) {
    return (
      <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        {/* สองส่วนอยู่บนการ์ดขาวคนละใบ (มติผู้ใช้ 31 ส.ค. 69) — ขั้นนี้ถูกย้ายไป
            เป็น plain body step ที่ TreatmentFormPage แล้ว เปลือกการ์ดจึงมาจาก
            สองกล่องนี้ ไม่ใช่การ์ดใบเดียวของ shell */}
        <div className='flex flex-col w-full' style={{
          gap: 'var(--dim-space-400)',
          padding: 'var(--dim-space-600)',
          borderRadius: 'var(--dim-radius-500)',
          background: 'var(--surface-card-100)',
          /* เงาแบรนด์ใต้แผ่นขาว (มติผู้ใช้ 31 ส.ค. 69) — แยกการ์ดออกจากพื้นหลัง
             ของหน้าโดยไม่ต้องใช้เส้นขอบ */
          boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        }}>
          <OrderStepHeading number={1} title='แบบประเมินความปลอดภัยก่อนส่งคำสั่ง' />
          <CpoeWorkflowPanel embedded patient={patient} form={form} setForm={setForm} />
        </div>

        <div className='flex flex-col w-full' style={{
          gap: 'var(--dim-space-400)',
          padding: 'var(--dim-space-600)',
          borderRadius: 'var(--dim-radius-500)',
          background: 'var(--surface-card-100)',
          /* เงาแบรนด์ใต้แผ่นขาว (มติผู้ใช้ 31 ส.ค. 69) — แยกการ์ดออกจากพื้นหลัง
             ของหน้าโดยไม่ต้องใช้เส้นขอบ */
          boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        }}>
        <OrderStepHeading number={2} title='สั่งการรักษา' subtitle='Treatment Order' />
        {/* TOR §1.18.6 — แถบเดียวกับ branch ที่มีคำสั่งแล้ว: เคสเยี่ยมบ้าน
            ส่วนใหญ่มาถึงตอน Visit ยังไม่มีคำสั่งเลย จึงต้องแสดงที่ empty
            state ด้วย ไม่งั้นคำสั่งที่ส่งมาจะไม่มีทางถูกเห็น */}
        {homeVisitHandoff && (
          <Alert
            type='info'
            title={`มีคำสั่งการรักษาจากการเยี่ยมบ้าน ${homeVisitHandoff.items.length} รายการรอนำเข้า`}
            subtext={`ส่งโดย ${homeVisitHandoff.by} · ${homeVisitHandoff.at}${homeVisitHandoff.note ? ` · ${homeVisitHandoff.note}` : ''}`}
            indicators={homeVisitHandoff.items.map((i) => i.name)}
            action={(
              <BrandPrimaryButton size='md' leadingIcon='download' onClick={importHomeVisitOrders}>
                นำเข้าเป็นคำสั่งของ Visit นี้
              </BrandPrimaryButton>
            )}
          />
        )}
        {homeVisitImportNote && (
          <Alert type='success' title={homeVisitImportNote} onClose={() => setHomeVisitImportNote('')} />
        )}
        <div className='flex flex-col items-center justify-center w-full text-center' style={{ gap: 'var(--dim-space-300, 12px)', padding: 'var(--dim-space-800, 32px) var(--dim-space-600, 24px)', background: 'var(--surface-card-default, #FFFFFF)', border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #E2E4E6)', borderRadius: 'var(--dim-radius-500, 20px)' }}>
          <LottieIllustration animationData={firstaidKitAnim} size={160} />
          <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <p style={{ margin: 0, color: 'var(--text-content-default, #202427)', fontFamily: 'var(--type-family-heading-content)', fontSize: 'var(--type-size-lg, 20px)', fontWeight: 'var(--type-weight-medium, 500)' }}>ยังไม่มีการสั่งการรักษา</p>
            <p style={{ margin: 0, color: 'var(--text-content-tertiary, #697077)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>เพิ่มรายการทีละรายการ เลือกหลายรายการ หรือเลือกจาก Order Set</p>
          </div>
          <BrandPrimaryButton size='lg' leadingIcon='add' onClick={() => setOrderPickerOpen(true)}>เพิ่มรายการ</BrandPrimaryButton>
        </div>
        </div>
        <TreatmentOrderPickerPopup open={orderPickerOpen} onClose={() => setOrderPickerOpen(false)} items={orderPickerItems} onConfirm={commitPickedOrders} patient={patient} cardPatient={cardPatient} />
      </section>
    );
  }

  return (
    <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      {/* สองส่วนอยู่บนการ์ดขาวคนละใบ (มติผู้ใช้ 31 ส.ค. 69) */}
      <div className='flex flex-col w-full' style={{
          gap: 'var(--dim-space-400)',
          padding: 'var(--dim-space-600)',
          borderRadius: 'var(--dim-radius-500)',
          background: 'var(--surface-card-100)',
          /* เงาแบรนด์ใต้แผ่นขาว (มติผู้ใช้ 31 ส.ค. 69) — แยกการ์ดออกจากพื้นหลัง
             ของหน้าโดยไม่ต้องใช้เส้นขอบ */
          boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        }}>
        <OrderStepHeading number={1} title='แบบประเมินความปลอดภัยก่อนส่งคำสั่ง' />
        <CpoeWorkflowPanel embedded patient={patient} form={form} setForm={setForm} />
      </div>

      <div
        className='flex flex-col w-full'
        style={{
          gap: 'var(--dim-space-400)',
          padding: 'var(--dim-space-600)',
          borderRadius: 'var(--dim-radius-500)',
          background: 'var(--surface-card-100)',
          boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        }}
      >
        {/* หัวข้อ Topic เดิม ("สั่งการรักษา (Treatment Order)") ถูกแทนด้วยหัวข้อ
            ส่วนที่ 2 เพื่อไม่ให้มีสองหัวข้อที่พูดเรื่องเดียวกันซ้อนกัน */}
        <OrderStepHeading number={2} title='สั่งการรักษา' subtitle='Treatment Order' />
        {/* แถวหัว (คำอธิบาย + ปุ่ม "เพิ่มรายการ") ถูกเอาออกทั้งแถว 31 ส.ค. 69
            (มติผู้ใช้) — คำอธิบายซ้ำกับป๊อปอัปที่ปุ่มเปิด ส่วนปุ่มเพิ่มรายการมีอยู่
            แล้วในแต่ละหมวดด้านล่าง · `setOrderPickerOpen` ยังถูกเรียกจากที่อื่น */}

        {/* TOR §1.18.6 — คำสั่งที่พยาบาลบันทึกไว้ตอนเยี่ยมบ้านของ HN นี้
            รอให้แพทย์ "นำเข้า" ผ่าน commitPickedOrders ตัวเดียวกับการเพิ่ม
            รายการเอง จึงผ่านการตรวจซ้ำซ้อน/CDSS ครบเหมือนกัน */}
        {homeVisitHandoff && (
          <Alert
            type='info'
            title={`มีคำสั่งการรักษาจากการเยี่ยมบ้าน ${homeVisitHandoff.items.length} รายการรอนำเข้า`}
            subtext={`ส่งโดย ${homeVisitHandoff.by} · ${homeVisitHandoff.at}${homeVisitHandoff.note ? ` · ${homeVisitHandoff.note}` : ''}`}
            indicators={homeVisitHandoff.items.map((i) => i.name)}
            action={(
              <BrandPrimaryButton size='md' leadingIcon='download' onClick={importHomeVisitOrders}>
                นำเข้าเป็นคำสั่งของ Visit นี้
              </BrandPrimaryButton>
            )}
          />
        )}
        {homeVisitImportNote && (
          <Alert
            type='success'
            title={homeVisitImportNote}
            onClose={() => setHomeVisitImportNote('')}
          />
        )}
        {/* Category tabs — text-only TabCapsule per Figma PHCIS|CPOE
            200:18615. No leading status dot/icon and no trailing arrow:
            the brand-50 pill with brand-100 border carries the entire
            selected affordance, and the label alone reads cleanest
            against the dense order table below. `variant='filter'`
            opts the chip out of the status-icon mapping that `type`
            would otherwise apply. */}
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          {TREATMENT_ORDER_CATEGORIES.map((cat) => (
            <React.Fragment key={cat.key}>
              <TabCapsule
                variant='filter'
                label={cat.label}
                selected={activeCategory === cat.key}
                showLeadingIcon={false}
                showTrailingIcon={false}
                onClick={() => setCategory(cat.key)}
              />
              {/* EMR §1.4.3.5/§1.4.3.6 — แท็บที่ 6 วางถัดจากแท็บ "ยา" ทันที
                  (มติผู้ใช้ 31 ส.ค. 69) เพราะเป็นงานของยาเหมือนกัน ของเดิมอยู่
                  ท้ายสุดหลังแล็บ/รังสี/หัตถการ/ปรึกษา ซึ่งเป็นคนละเรื่อง ·
                  ยังเก็บไว้นอก TREATMENT_ORDER_CATEGORIES โดยตั้งใจ เพราะ
                  ORDER_EMPTY_STATE_TEXT / ORDER_TABLE_TEXT map ตาม 5 คีย์เดิม
                  การเพิ่มคีย์เข้าไปจะทำให้ lookup เดิมพัง */}
              {cat.key === 'medication' && (
                <TabCapsule
                  variant='filter'
                  label={`ประสานรายการยาเดิม${form.medRecPending ? ` (${form.medRecPending})` : ''}`}
                  selected={activeCategory === MEDREC_CATEGORY}
                  showLeadingIcon={false}
                  showTrailingIcon={false}
                  onClick={() => setCategory(MEDREC_CATEGORY)}
                />
              )}
            </React.Fragment>
          ))}
          {/* ปุ่มเพิ่มรายการย้ายมาอยู่ท้ายแถวฟิลเตอร์แท็ก (มติผู้ใช้ 31 ส.ค. 69) —
              ที่เดิมอยู่บนหัวตารางรวมกับ "ยาทั้งหมด / Re-Diagnosis" ซึ่งถูกถอด
              ออกทั้งชุดแล้ว · เปิด `TreatmentOrderPickerPopup` ที่ค้นได้ทุกหมวด
              จึงใช้ได้กับทุกแท็บ ไม่ต้องมีปุ่มเพิ่มแยกรายหมวด */}
          <span className='ml-auto shrink-0'>
            <BrandPrimaryButton size='sm' leadingIcon='add' onClick={() => setOrderPickerOpen(true)}>
              เพิ่มรายการ
            </BrandPrimaryButton>
          </span>
        </div>

        <div
          style={{
            width: '100%',
            height: 'var(--dim-stroke-100)',
            background: 'var(--border-neutral-quaternary)',
          }}
          aria-hidden
        />

        {/* EMR §1.4 — แท็บประสานรายการยาเดิมมี body ของตัวเอง (ไฟล์แยก)
            จึงลัดออกก่อนถึง empty-state/ตารางของ 5 หมวดเดิม */}
        {activeCategory === MEDREC_CATEGORY ? (
          <MedRecPanel form={form} setForm={setForm} patient={patient} />
        ) : CPOE_PANEL_CATEGORIES.has(activeCategory) ? (
          /* CPOE §1.5.2 / §1.5.5 / §1.5.6 — สามหมวดนี้เดิมมีแต่ empty state
             (ยังไม่มี picker) ตอนนี้มี panel เต็มรูปของตัวเองแล้ว ซึ่งมี
             empty state ของตัวเองด้วยคำเดียวกับ ORDER_EMPTY_STATE_TEXT */
          <>
            {activeCategory === 'lab'
              ? <LabOrderPanel form={form} setForm={setForm} patient={patient} />
              : null}
            {activeCategory === 'medicalSupply'
              ? <MedicalSupplyOrderPanel form={form} setForm={setForm} />
              : null}
            {activeCategory === 'procedure'
              ? <ProcedureOrderPanel form={form} setForm={setForm} patient={patient} />
              : null}
            {activeCategory === 'consult'
              ? <ConsultComposerPanel form={form} setForm={setForm} patient={patient} cardPatient={cardPatient} />
              : null}
          </>
        ) : (
        <>

        {/* Empty state (Figma PHCIS|CPOE 269:32427) — when no item has been
            recorded for the active category, the title row + allergy
            alert + table are all replaced by this illustrated placeholder
            so the user sees a clear "ยังไม่มีรายการ · กรุณาสั่ง …" CTA
            instead of an empty table. Once a row is added the layout
            flips back to the table + alert combo (`rows.length > 0`
            branch below). */}
        {rows.length === 0 ? (
          <div
            className='flex flex-col items-center justify-center w-full text-center'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              paddingTop: 'var(--dim-space-600)',
              paddingBottom: 'var(--dim-space-800)',
              paddingLeft: 'var(--dim-space-600)',
              paddingRight: 'var(--dim-space-600)',
              marginBottom: 'var(--dim-space-600)',
            }}
          >
            <LottieIllustration animationData={firstaidKitAnim} size={160} />
            <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-100)' }}>
              <p style={{
                margin: 0,
                color: 'var(--text-brandPrimary-default, #007549)',
                fontFamily: 'var(--type-family-heading-content)',
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                lineHeight: 1.5,
              }}>
                {ORDER_EMPTY_STATE_TEXT[activeCategory].title}
              </p>
              <p style={{
                margin: 0,
                color: 'var(--text-content-quaternary, #ADB2B7)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: 'var(--type-weight-medium, 500)',
                lineHeight: 1.5,
              }}>
                {ORDER_EMPTY_STATE_TEXT[activeCategory].subtitle}
              </p>
            </div>
            <div className='flex items-center flex-wrap justify-center' style={{ gap: 'var(--dim-space-300)' }}>
              <BrandButton
                variant='outline'
                size='sm'
                leadingIcon='history'
                onClick={() => setReMedicineOpen(true)}
              >
                Re-Diagnosis
              </BrandButton>
              {/* The add CTA dispatches per category: xray opens the RIS
                  picker (this was the bug — "เพิ่ม X-ray" used to open the
                  medication popup); medication keeps openAddMed; the other
                  three categories keep today's behaviour untouched until
                  their pickers exist on this branch. */}
              <BrandPrimaryButton
                size='sm'
                leadingIcon='add'
                onClick={activeCategory === 'xray' ? openAddXray : openAddMed}
              >
                {ORDER_EMPTY_STATE_TEXT[activeCategory].addLabel}
              </BrandPrimaryButton>
            </div>
          </div>
        ) : (
          <>
            {/* Title + action buttons row (Figma 2508:98437) */}
            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
                <span style={{
                  color: 'var(--text-content-default)',
                  fontFamily: 'var(--type-family-heading-content)',
                  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                  fontSize: 'var(--type-size-base)',
                }}>
                  {/* Per-category copy from ORDER_TABLE_TEXT — medication
                      keeps its original strings verbatim, xray reads
                      'รายการตรวจทางรังสีวิทยาที่สั่ง' (TOR §1.12.5.4). */}
                  {ORDER_TABLE_TEXT[activeCategory].title}
                </span>
                <span style={{
                  color: 'var(--text-content-tertiary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                }}>
                  {ORDER_TABLE_TEXT[activeCategory].subtitle}
                </span>
              </div>
              {/* Title-row action cluster — Figma PHCIS|CPOE 200:18623.
                  Left to right:
                    • ยาทั้งหมด     (BrandButton outline sm, `pill`)
                    • 1-px vertical divider (border/neutral/tertiary)
                    • Re-Diagnosis  (BrandButton outline sm, `history`)
                    • เพิ่มยา       (BrandPrimaryButton filled,   `add`)
                  The divider groups the two browse-style CTAs
                  (ยาทั้งหมด / Re-Diagnosis — both open picker popups)
                  visually away from the destructive-free "add new" CTA
                  on the right, matching the design's clear primary /
                  secondary split. */}
              {/* ปุ่ม "ยาทั้งหมด · Re-Diagnosis · เพิ่มยา" (และสาขา "เพิ่ม X-ray")
                  ถูกเอาออกจากหัวตารางทั้งชุด 31 ส.ค. 69 (มติผู้ใช้) — การเพิ่ม
                  รายการทำจากปุ่ม "เพิ่มรายการ" ท้ายแถวฟิลเตอร์แท็กที่เดียว
                  `openAllMeds` / `setReMedicineOpen` / `openAddMed` / `openAddXray`
                  ยังอยู่ครบ พร้อมเสียบกลับถ้าต้องการทางลัดเหล่านี้อีก */}
            </div>

            {/* Drug-allergy cross-class warning (Figma 2508:98442) — dismissible.
                Only renders alongside an active order list per the user
                spec ("เพิ่มแล้วจะแสดงเป็น table เหมือนเดิม และ alert
                เตือนเกี่ยวการแพ้ยา"). Hidden while the empty state is
                showing so the placeholder reads cleanly. Gated to the
                medication category: cross-class DRUG allergy copy makes
                no sense above the X-ray table (which raises its own
                contrast / pregnancy gates below), and before this branch
                existed the alert could only ever co-render with
                medication rows anyway — so today's behaviour holds. */}
            {activeCategory === 'medication' && form.showAllergyAlert && (
              <Alert
                type='warning'
                title='ความเสี่ยงการแพ้ยาข้ามกลุ่ม'
                subtext='ผู้ป่วยมีประวัติแพ้ยาในกลุ่ม Triphenylmethane dye Gentian Violet อาจก่อให้เกิดอาการแพ้ได้ กรุณาติดตามอาการหลังใช้ยาอย่างใกล้ชิด'
                showDetail={false}
                showIndicator={false}
                showBadge={false}
                onClose={dismissAlert}
                style={{ maxWidth: 768 }}
              />
            )}

            {/* ── X-ray safety rail (TOR §1.12.5.3 / §1.12.5.9) ──────────
                Carried over from the RIS order screen so the same gates
                fire at the doctor's desk. Order: refused-add (block) →
                contrast allergy → pregnancy screening → warn-level
                repeats — most severe first, all above the table they
                explain. */}
            {activeCategory === 'xray' && xrayBlockNotice && (
              /* The refused add — §1.12.5.9 'block'. The reason and the
                 days-ago must be shown: "the computer said no" without
                 the dose rationale teaches users to distrust the gate. */
              <Alert
                type='destructive'
                iconName='block'
                title='ไม่สามารถเพิ่มรายการได้ — สั่งซ้ำเร็วเกินไป'
                subtext={`${xrayBlockNotice.warning.message} · ${XRAY_EXAM_BY_ID[xrayBlockNotice.examId]?.name ?? ''} ตรวจล่าสุด ${xrayBlockNotice.warning.daysAgo} วันก่อน (เกณฑ์ ${xrayBlockNotice.warning.windowDays} วัน)${xrayBlockNotice.warning.resultSummary ? ` · ผลเดิม: ${xrayBlockNotice.warning.resultSummary}` : ''} — ผู้ป่วยจะได้รับปริมาณรังสีซ้ำโดยไม่จำเป็น หากจำเป็นทางคลินิกให้ปรึกษารังสีแพทย์`}
                showBadge={false}
                showIndicator={false}
                showDetail={false}
                onClose={() => setXrayBlockNotice(null)}
              />
            )}
            {activeCategory === 'xray' && xrayContrastAllergyDanger && (
              /* แจ้งเตือนแพ้สารทึบรังสี — same destructive alert as
                 XrayOrderPage: recorded drug allergy × contrast exam
                 (§1.12.5.3). Exams and allergens are named so the doctor
                 knows exactly which row tripped the alarm. */
              <Alert
                type='destructive'
                iconName='warning'
                iconFill={1}
                title='แจ้งเตือนแพ้สารทึบรังสี — ผู้ป่วยมีประวัติการแพ้ และรายการที่เลือกใช้สารทึบรังสี'
                subtext={`รายการที่ใช้สารทึบรังสี: ${xrayContrastExams.map((e) => e.name).join(' · ')} · สารที่แพ้: ${(patient?.drugAllergies ?? []).map((a) => a.name).join(', ') || 'ดูประวัติการแพ้ยา'} — ปรึกษารังสีแพทย์ก่อนส่งตรวจ และพิจารณา premedication หรือเปลี่ยนวิธีตรวจ`}
                showBadge={false}
                showIndicator={false}
                showDetail={false}
              />
            )}
            {activeCategory === 'xray' && xrayPregnancyWatch && (
              /* ตั้งครรภ์ — §1.12.5.3: female patient + ionising exam
                 flagged femaleScreening. The CPOE step has no LMP form
                 (that intake lives on the RIS order screen), so this
                 warns the doctor to ask before the beam, not after. */
              <Alert
                type='warning'
                iconName='pregnant_woman'
                title='ซักประวัติประจำเดือน / การตั้งครรภ์ก่อนส่งตรวจ'
                subtext='ผู้ป่วยหญิง และรายการที่เลือกมีการฉายรังสีบริเวณช่องท้อง/เชิงกราน หรือเป็นแมมโมแกรม — กรุณาสอบถาม LMP และสถานะการตั้งครรภ์ก่อนส่งตรวจ หากตั้งครรภ์ให้ปรึกษารังสีแพทย์ หรือพิจารณาอัลตราซาวด์แทน'
                showBadge={false}
                showIndicator={false}
                showDetail={false}
              />
            )}
            {activeCategory === 'xray' && xrayDupWarns.length > 0 && (
              /* Warn-level repeats — ordering anyway is allowed
                 (§1.12.5.9 only refuses 'block'), so this informs for as
                 long as the rows stay in the order. */
              <Alert
                type='warning'
                iconName='content_copy'
                title={`มี ${xrayDupWarns.length} รายการที่เพิ่งตรวจไปไม่นาน`}
                subtext={xrayDupWarns
                  .map(({ id, warning }) => `${XRAY_EXAM_BY_ID[id]?.name ?? id} (${warning.daysAgo} วันก่อน · เกณฑ์ ${warning.windowDays} วัน)`)
                  .join(' · ')}
                showBadge={false}
                showIndicator={false}
                showDetail={false}
              />
            )}

            {/* Medication order table (Figma 2508:98443).
                `stickyColCount={2}` pins รูป (68 px) + ชื่อยา (256 px) to the
                left edge so they remain visible while the other 17 columns
                scroll horizontally. The Table component handles the
                sticky-positioning, drop-shadow, and z-index stacking
                internally — see `stickyLeft` / `stickyShadow` in Table.jsx.
                The xray category reuses the same <Table> with its own
                column set (TOR §1.12.5.4) — no sticky columns (8 columns
                fit most laptop widths) and examId as the row key because
                xray rows carry no synthetic `id`. */}
            <Table
              columns={activeCategory === 'xray' ? xrayColumns : columns}
              rows={rows}
              rowKey={activeCategory === 'xray' ? (row) => row.examId : undefined}
              stickyColCount={activeCategory === 'xray' ? 0 : 2}
              emptyMessage={
                activeCategory === 'medication'
                  ? 'ยังไม่มีรายการยา คลิก "เพิ่มยา" หรือเลือกจาก "Often order" ด้านล่าง'
                  : 'ยังไม่มีรายการในหมวดนี้ — สลับไปแท็บ "ยา" เพื่อดูตัวอย่าง'
              }
            />

            {/* §1.12.5.4 "ข้อมูลยอดรวมทั้งหมด" — the totals strip under the
                xray table (the legacy screen's "รวมเงินทั้งหมด" line),
                split per-สิทธิ. Styled with the Table system's footer
                tokens (FooterCell in Table.jsx uses the same pair) so it
                reads as the table's own tfoot even though the shared
                <Table> has no footer slot. */}
            {activeCategory === 'xray' && (
              <div
                className='flex items-center justify-end flex-wrap w-full'
                style={{
                  gap: 'var(--dim-space-600)',
                  background: 'var(--surface-table-footer, var(--brand-p100, #E2F3EB))',
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  paddingTop: 'var(--dim-space-300, 12px)',
                  paddingRight: 'var(--dim-space-400, 16px)',
                  paddingBottom: 'var(--dim-space-300, 12px)',
                  paddingLeft: 'var(--dim-space-400, 16px)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                  color: 'var(--text-table-footer, var(--brand-p800, #004C31))',
                }}
              >
                <span>รวมทั้งหมด ({xraySummary.count} รายการ) {bahtText(xraySummary.total)} บาท</span>
                <span>รวมเบิกได้ {bahtText(xraySummary.claimTotal)} บาท</span>
                <span
                  style={{
                    color: xraySummary.patientPay > 0
                      ? 'var(--text-statusbadge-warning, #C2410C)'
                      : 'var(--text-table-footer, var(--brand-p800, #004C31))',
                  }}
                >
                  รวมผู้ป่วยจ่าย {bahtText(xraySummary.patientPay)} บาท
                </span>
              </div>
            )}
          </>
        )}

        {/* CPOE §1.5.4 — แถบ CDSS + ตารางรายละเอียดคำสั่งยา (ราคา/สิทธิ/
            หยุดยา/ยกเลิก/ชุดยาของฉัน/วิธีใช้ยาแบบละเอียด). ต่อท้ายตารางเดิม
            แบบ additive — ตารางยาเดิมและปุ่มทุกตัวยังทำงานเหมือนเดิม */}
        {activeCategory === 'medication' ? (
          <MedicationCdssPanel
            form={form}
            setForm={setForm}
            patient={patient}
            onGoToMedRec={() => setCategory(MEDREC_CATEGORY)}
            onGoToDocuments={onStepChange && stepIndexes?.documents != null
              ? () => onStepChange(stepIndexes.documents)
              : undefined}
          />
        ) : null}

        {/* CPOE §1.5.3 — Note ต่อรายการ · ข้อเสนอแก้ไขจากรังสีแพทย์ ·
            สถานะและผลตรวจ · ผลผิดปกติที่ต้องรับทราบ */}
        {activeCategory === 'xray' ? (
          <RadiologyOrderPanel form={form} setForm={setForm} patient={patient} />
        ) : null}
        </>
        )}

        {/* ชิป "ยาที่สั่งบ่อย" กลับมาอยู่ใต้ตาราง ในการ์ดขาวใบเดียวกัน
            (มติผู้ใช้ 31 ส.ค. 69) — กดชิปแล้วแถวไปโผล่ในตารางที่อยู่เหนือมัน
            ทันที การอยู่คนละการ์ดทำให้ความสัมพันธ์นี้อ่านไม่ออก
            แสดงเฉพาะแท็บ "ยา" เพราะชิปเป็นชื่อยาทั้งชุด */}
        {activeCategory === 'medication' ? (
          <FrequentOrdersCard
            onInsertChip={openAddMedFromChip}
            /* ชื่อยาที่อยู่ในตารางแล้ว — ชิปเหล่านั้นขึ้นติ๊กถูกแทนเครื่องหมาย + */
            selectedLabels={form.medications.map((m) => m.name)}
          />
        ) : null}

      </div>


      {/* Re-Medicine popup (Figma 200:23111). Mounted at the section
          root so it portals outside the page's flex tree but still
          shares Step-5's form state via closure. Items come from the
          mocked PAST_VISIT_MEDICATIONS — in a real surface this would
          query the patient's prescription-history API. */}
      <ReMedicinePopup
        open={reMedicineOpen}
        onClose={() => setReMedicineOpen(false)}
        onConfirm={appendPastMedications}
        items={PAST_VISIT_MEDICATIONS}
      />

      {/* X-ray order picker (popup variant) — the same
          "เลือกรายการตรวจทางรังสีวิทยา" control the RIS order screen
          mounts, opened from every "เพิ่ม X-ray" CTA (TOR §1.12.5.4).
          Controlled: `value` mirrors form.xrayOrders' examIds so the
          picker reopens with the current order ticked, and
          `commitXraySelection` reconciles every change back into the
          form (keeping per-row ท่าถ่าย / ความเร่งด่วน edits, re-running
          the §1.12.5.9 duplicate gate on each add). `history` +
          `rightKey` give it the same repeat warnings and per-สิทธิ money
          the RIS screen shows. The MR roster has no `fullName`, so the
          composed display name rides in as one for the picker's summary
          line. */}
      <XrayOrderPicker
        open={xrayPickerOpen}
        onClose={() => setXrayPickerOpen(false)}
        value={form.xrayOrders.map((o) => o.examId)}
        onChange={commitXraySelection}
        patient={patient ? { ...patient, fullName: patient.name } : null}
        rightKey={xrayRightKey}
        history={xrayHistory}
      />

      {/* AddMedicationPopup — shared add/edit surface (Figma
          PHCIS|CPOE 195:34355 Edit button + 200:18621 เพิ่มยา CTA).
          Opens via:
            • "เพิ่มยา" header / empty-state buttons → add mode,
              `addMedEditIndex` is null, popup commits via append.
            • Per-row Edit icon button → edit mode,
              `addMedEditIndex` is the row index, popup seeds from
              that row's values via `initialValue`, commits via
              in-place patch (workflow flags preserved).
          `commitMedFromPopup` reads `addMedEditIndex` to pick the
          right branch. Title swaps "เพิ่มรายการยา" ↔
          "แก้ไขรายการยา" so the header reads true to the mode. */}
      <AddMedicationPopup
        open={addMedOpen}
        onClose={closeAddMed}
        onConfirm={commitMedFromPopup}
        /* Seed precedence: edit-mode row > chip seed > undefined.
           Edit mode pulls the full row so every field hydrates; chip
           opens only seed name + image (everything else stays at the
           popup's EMPTY defaults so the doctor still picks them). */
        initialValue={
          addMedEditIndex != null
            ? form.medications[addMedEditIndex]
            : (addMedSeed || undefined)
        }
        title={addMedEditIndex != null ? 'แก้ไขรายการยา' : 'เพิ่มรายการยา'}
      />

      {/* Delete medication confirm (Figma 280:28154). Row trash icon
          opens this dialog; only the red ลบรายการยา button removes the row. */}
      <DeleteMedicationConfirmPopup
        open={pendingMedDelete != null}
        onClose={() => setPendingMedDelete(null)}
        onConfirm={confirmDeleteMed}
        medicationName={
          pendingMedDelete != null
            ? form.medications[pendingMedDelete]?.name
            : undefined
        }
      />
      <TreatmentOrderPickerPopup
        open={orderPickerOpen}
        onClose={() => setOrderPickerOpen(false)}
        items={orderPickerItems}
        onConfirm={commitPickedOrders}
        patient={patient}
        cardPatient={cardPatient}
      />
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────
   Step 6 — นัดหมาย / Appointment (Figma PHCIS-ALL 2633:126009).
   Layout aliases existing components only — Topic, BrandSubdueButton,
   NeutralSubdueButton, Select, Textarea, RadioButton, RadioGroup, Timeslot,
   ColorfulBadge, Information. The mini-patient strip and the timeslot
   grid are inline because they only ship in this step. Form state
   lives on `form.appointment`.
   ───────────────────────────────────────────────────────────── */

/* Mini patient strip — Figma 4025:14067. 3 read-only columns separated
   by 48 px vertical rules, with a 48 × 48 profile photo on the left
   (Figma 4025:14068 — compact strip avatar). Falls back to the person
   icon when the image is missing or fails to load. */
/* `cardPatient` mirrors the sticky page-header PatientCard's display
   shape (fullName / hn / insurance from PATIENT_PROFILES). `patient`
   carries the MR roster shape (prefixTh / firstNameTh / lastNameTh /
   rights). Step 6's strip must show the same person the header does,
   so the display name + HN come from cardPatient when present; the
   short insurance tag still comes from `patient.rights` to match the
   Figma blue badge ("ประกันสังคม", not the long hospital code). */
const AppointmentPatientStrip = ({ patient, cardPatient }) => {
  const fullName = cardPatient?.fullName
    || patient?.fullName
    || `${patient?.prefixTh || ''}${patient?.firstNameTh || ''} ${patient?.lastNameTh || ''}`.trim()
    || '—';
  const hn = cardPatient?.hn || patient?.hn || '—';
  const insuranceLabel = patient?.rights || cardPatient?.insurance || '—';
  const avatarUrl = cardPatient?.avatarUrl || patient?.avatarUrl;
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [avatarUrl]);

  return (
    <div
      className='flex items-center w-full flex-wrap'
      style={{
        gap: 'var(--dim-space-600)',
        padding: 'var(--dim-space-400)',
        borderRadius: 'var(--dim-radius-400)',
        background: 'var(--surface-brandPrimary-quaternary)',
        alignItems: 'center',
      }}
    >
      <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-300)' }}>
        <span
          className='inline-flex items-center justify-center shrink-0 overflow-hidden'
          style={{
            width: 'var(--dim-size-1000)',
            height: 'var(--dim-size-1000)',
            boxSizing: 'border-box',
            borderRadius: 'var(--dim-radius-full)',
            border: 'var(--dim-stroke-400) solid var(--border-image-default)',
            background: 'var(--patient-card-avatar-bg)',
            boxShadow:
              'var(--sds-size-depth-0, 0px) var(--sds-size-depth-025, 1px) var(--sds-size-depth-100, 4px) var(--sds-size-depth-0, 0px) var(--color-shadow-050, rgba(100, 116, 139, 0.10))',
            color: 'var(--text-content-on-content, #FFFFFF)',
          }}
          aria-hidden={!avatarUrl || imgError}
        >
          {!imgError && avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName}
              onError={() => setImgError(true)}
              className='w-full h-full object-cover'
            />
          ) : (
            <Sym name='person' size={24} color='currentColor' />
          )}
        </span>
        <Information
          subText='ชื่อ-นามสกุล ผู้ป่วย'
          text={fullName}
          showBadge={false}
          showBadge2={false}
          className='shrink-0'
          style={{ gap: 'var(--dim-space-100)' }}
        />
      </div>
      <div
        aria-hidden
        className='shrink-0'
        style={{
          width: 'var(--dim-stroke-100)',
          height: '48px',
          background: 'var(--border-brandPrimary-tertiary)',
        }}
      />
      <Information
        subText='HN (Hospital Number)'
        text={hn}
        showBadge={false}
        showBadge2={false}
        className='shrink-0'
        style={{ gap: 'var(--dim-space-100)' }}
      />
      <div
        aria-hidden
        className='shrink-0'
        style={{
          width: 'var(--dim-stroke-100)',
          height: '48px',
          background: 'var(--border-brandPrimary-tertiary)',
        }}
      />
      <div className='flex flex-col shrink-0 justify-center' style={{ gap: 'var(--dim-space-100)' }}>
        <span style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
        }}>
          สิทธิ์การรักษา
        </span>
        <ColorfulBadge style='blue' size='small' width='hug'>
          {insuranceLabel}
        </ColorfulBadge>
      </div>
    </div>
  );
};

const APPT_MODE_OPTIONS = [
  { value: 'skip',     label: 'ไม่นัดหมาย' },
  { value: 'schedule', label: 'นัดหมาย' },
];

const APPT_LOCATION_OPTIONS = [
  { value: 'onsite',       label: 'ตรวจที่โรงพยาบาล (Onsite)' },
  { value: 'telemedicine', label: 'ปรึกษาแพทย์ออนไลน์ (Telemedicine)' },
];

/* Yes/no radio for the "คำสั่งล่วงหน้า" card (Figma 4046:18305 section 2).
   `none` is the default — the doctor opts in to having an advance order
   tied to the next appointment. */
const APPT_ADVANCE_OPTIONS = [
  { value: 'none', label: 'ไม่มีคำสั่งล่วงหน้า' },
  { value: 'has',  label: 'มีคำสั่งล่วงหน้า' },
];

/* Typography for Step-6 sub-card headings — Figma PHCIS | Appointment
   `4046:18305` (three grey cards). Titles use `text/topic/primary-title`
   (brand-p700) on `--surface-neutral-quaternary`, matching the Topic /
   appointment chrome rather than neutral tertiary-title. */
const APPT_CARD_TITLE_STYLE = {
  color: 'var(--text-topic-primary-title, var(--brand-p700, #007549))',
  fontFamily: 'var(--type-family-heading-content)',
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
  fontSize: 'var(--type-size-base)',
  lineHeight: 1.5,
};

/* Tinted card shell used by all three Step-6 sub-cards (รายละเอียด /
   คำสั่งล่วงหน้า / วันเวลา). Per Figma 4046:18305, each card sits on a
   light neutral tint (--surface-neutral-quaternary #F9FBFB) with a
   matching neutral hairline border — the cooler grey contrasts with
   the brand-tinted patient strip above so the three sections read as
   their own grouped surfaces rather than melting into the chrome.
   24 px padding · 16 px gap · 12 px radius — mirrors the FrequentOrders
   shell over in Step 5. */
const ApptCard = ({ title, children }) => (
  <div
    className='flex flex-col w-full'
    style={{
      gap: 'var(--dim-space-400)',
      padding: 'var(--dim-space-600)',
      borderRadius: 'var(--dim-radius-400)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
      background: 'var(--surface-neutral-quaternary, #F9FBFB)',
    }}
  >
    {/* String titles use `APPT_CARD_TITLE_STYLE`; a React `title` node is
        rendered as-is (rare — prefer strings for these sub-cards). */}
    {typeof title === 'string' ? (
      <span style={APPT_CARD_TITLE_STYLE}>
        {title}
      </span>
    ) : (
      title
    )}
    {children}
  </div>
);

/* `ApptCollapse` — smooth show/hide for the conditional Step-6 blocks
   (three sub-cards when mode flips, advance-order detail fields when
   "มีคำสั่งล่วงหน้า" is picked). Animates `grid-template-rows` from
   0fr → 1fr, which lets the wrapper measure its own intrinsic content
   height instead of needing a hard-coded max-height. Opacity + a tiny
   translateY ride alongside the height transition so the block doesn't
   just snap in. Uses the project's shared cubic-bezier ease so the
   motion feels consistent with the SideSubMenu / QueueSubMenu chrome. */
const ApptCollapse = ({ open, children, gapBefore = 'var(--dim-space-600)' }) => (
  <div
    aria-hidden={!open}
    style={{
      display: 'grid',
      gridTemplateRows: open ? '1fr' : '0fr',
      opacity: open ? 1 : 0,
      transform: open ? 'translateY(0)' : 'translateY(-4px)',
      pointerEvents: open ? 'auto' : 'none',
      /* `marginTop: gapBefore` keeps the parent's natural gap-based
         spacing when open, then collapses to 0 when closed so the
         siblings sit flush. */
      marginTop: open ? gapBefore : 0,
      transition: [
        'grid-template-rows 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        'opacity 240ms cubic-bezier(0.32, 0.72, 0, 1)',
        'transform 240ms cubic-bezier(0.32, 0.72, 0, 1)',
        'margin-top 280ms cubic-bezier(0.32, 0.72, 0, 1)',
      ].join(', '),
    }}
  >
    {/* Inner row owns `overflow: hidden` so the children clip cleanly
        while the wrapper animates its height. `min-height: 0` is the
        critical bit — without it the row can't shrink below its
        children's intrinsic height. */}
    <div style={{ overflow: 'hidden', minHeight: 0 }}>
      {children}
    </div>
  </div>
);

/* Parse an "ISO" or "DD/MM/YYYY" date string into a Date for the
   DatePicker `value` prop. Returns null when empty/invalid so the
   trigger shows its placeholder. */
const parseApptDate = (raw) => {
  if (!raw) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Minimum lead before the start of a booked timeslot (product rule). */
const APPT_MIN_LEAD_MS = 60 * 60 * 1000;

const startOfLocalDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Parses "HH:MM-HH:MM" → local Date on the same calendar day as `dayDate`. */
const parseTimeslotStartOnDate = (slotValue, dayDate) => {
  const m = String(slotValue).match(/^(\d{1,2}):(\d{2})\s*-\s*\d{1,2}:\d{2}/);
  if (!m) return null;
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return new Date(
    dayDate.getFullYear(),
    dayDate.getMonth(),
    dayDate.getDate(),
    hh,
    mm,
    0,
    0,
  );
};

const isNonEmptyStr = (v) => String(v ?? '').trim().length > 0;

export const Step6Appointment = ({ form, setForm, patient, cardPatient }) => {
  const appt = form.appointment || {};
  const setAppt = (k) => (v) => setForm((s) => ({
    ...s,
    appointment: { ...(s.appointment || {}), [k]: v },
  }));
  /* Same event shape as Step 4 SuggestibleTextarea + `setFromEvent`. */
  const setApptFromEvent = (k) => (e) => setAppt(k)(e?.target?.value ?? '');
  const [medicalHistoryOpen, setMedicalHistoryOpen] = useState(false);
  const [appointmentHistoryOpen, setAppointmentHistoryOpen] = useState(false);
  /* Advance-order picker popup state — opens from the Step-6 "เลือก
     คำสั่งล่วงหน้า" trigger. Multi-select; commits as an array of ids
     into `appt.advanceOrders`. */
  const [advanceOrderPickerOpen, setAdvanceOrderPickerOpen] = useState(false);
  /* Delete-confirm — Figma PHCIS | Appointment 4054:5628. Holds the
     advance-order option id while the AlertDialog is open; row trash
     opens this instead of mutating `advanceOrders` immediately. */
  const [pendingAdvanceOrderDeleteId, setPendingAdvanceOrderDeleteId] = useState(null);
  const pendingAdvanceOrderLabel = useMemo(() => {
    if (pendingAdvanceOrderDeleteId == null) return undefined;
    return APPT_ADVANCE_ORDER_OPTIONS.find((o) => o.value === pendingAdvanceOrderDeleteId)?.label;
  }, [pendingAdvanceOrderDeleteId]);
  const confirmDeleteAdvanceOrder = () => {
    if (pendingAdvanceOrderDeleteId != null) {
      setAppt('advanceOrders')(
        advanceOrderIds.filter((id) => id !== pendingAdvanceOrderDeleteId),
      );
    }
    setPendingAdvanceOrderDeleteId(null);
  };
  const advanceOrderIds = Array.isArray(appt.advanceOrders) ? appt.advanceOrders : [];
  const selectedAdvanceOrders = useMemo(
    () => advanceOrderIds
      .map((id) => APPT_ADVANCE_ORDER_OPTIONS.find((o) => o.value === id))
      .filter(Boolean),
    [advanceOrderIds],
  );

  const apptDay = parseApptDate(appt.date);
  /* Re-evaluate the 1-hour cutoff while the grid for "today" is open so
     slots unlock/lock on the wall clock without a full navigation. */
  const [apptSlotClock, setApptSlotClock] = useState(0);
  const apptIsToday = !!(apptDay && startOfLocalDay(apptDay).getTime() === startOfLocalDay(new Date()).getTime());
  useEffect(() => {
    if (!appt.date || !apptIsToday) return undefined;
    const id = window.setInterval(() => setApptSlotClock((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, [appt.date, apptIsToday]);

  useEffect(() => {
    const day = parseApptDate(appt.date);
    if (!day || !appt.slot) return;
    const start = parseTimeslotStartOnDate(appt.slot, day);
    if (!start || Number.isNaN(start.getTime())) return;
    if (start.getTime() < Date.now() + APPT_MIN_LEAD_MS) {
      setForm((s) => ({
        ...s,
        appointment: { ...(s.appointment || {}), slot: '' },
      }));
    }
  }, [appt.date, appt.slot, apptSlotClock, setForm]);

  const startTodayTs = startOfLocalDay(new Date()).getTime();
  const apptDayStartTs = apptDay ? startOfLocalDay(apptDay).getTime() : null;
  const isPastApptDay = apptDayStartTs != null && apptDayStartTs < startTodayTs;

  /* พิมพ์ใบนัด — Figma 4030:9506 (hidden when ไม่นัดหมาย) + 4046:18305
     (disabled until every required Step-6 appointment field is filled). */
  const apptSlipPrintReady = useMemo(() => {
    if (appt.mode !== 'schedule') return false;
    if (!isNonEmptyStr(appt.clinic) || !isNonEmptyStr(appt.type) || !isNonEmptyStr(appt.doctor)) {
      return false;
    }
    if (!isNonEmptyStr(appt.reason) || !isNonEmptyStr(appt.preparation)) return false;
    if (appt.advance !== 'none' && appt.advance !== 'has') return false;
    if (appt.advance === 'has') {
      if (!(Array.isArray(appt.advanceOrders) && appt.advanceOrders.length > 0)) return false;
      if (!isNonEmptyStr(appt.condition)) return false;
    }
    return true;
  }, [
    appt.mode,
    appt.clinic,
    appt.type,
    appt.doctor,
    appt.reason,
    appt.preparation,
    appt.advance,
    appt.advanceOrders,
    appt.condition,
  ]);

  return (
    <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      <Topic
        hierarchy='primary'
        title='นัดหมาย (Appointment)'
        leadingIcon='calendar_clock'
        showSubText={false}
        showBadge={false}
        showChevron={false}
        showSuccess={false}
        /* PHCIS | Appointment — Figma 4046:18305: title + action cluster
           one row; flush L/R (shell owns horizontal padding). */
        style={{
          gap: 'var(--dim-space-300)',
          paddingLeft: 0,
          paddingRight: 0,
        }}
        trailing={(
          <div
            className='flex items-center shrink-0 flex-wrap'
            style={{ gap: 'var(--dim-space-300)' }}
          >
            {/* Figma PHCIS | Appointment 4025:14538 — L→R: ประวัติการรักษา ·
                ประวัติการนัด (outline); พิมพ์ใบนัด last as brand fill. */}
            <BrandButton
              variant='outline'
              size='sm'
              leadingIcon='stethoscope'
              onClick={() => setMedicalHistoryOpen(true)}
            >
              ประวัติการรักษา
            </BrandButton>
            <BrandButton variant='outline' size='sm' leadingIcon='history' onClick={() => setAppointmentHistoryOpen(true)}>
              ประวัติการนัด
            </BrandButton>
            {appt.mode === 'schedule' && (
              <BrandButton
                variant='fill'
                size='sm'
                leadingIcon='print'
                disabled={!apptSlipPrintReady}
                /* onClick: TODO(print-appt-slip) — wire print / PDF when flow exists. */
              >
                พิมพ์ใบนัด
              </BrandButton>
            )}
          </div>
        )}
      />

      <div
        className='flex flex-col w-full'
        style={{
          gap: 'var(--dim-space-600)',
          padding: 0,
          borderRadius: 'var(--dim-radius-500)',
          background: 'var(--surface-card-100)',
          /* Min-height matches Figma 4046:19444 — the default-state
             page still reserves ~720 px of body so the footer doesn't
             crowd up against the mode radio when only the radio is
             showing (or "ไม่นัดหมาย" is selected). */
          minHeight: 720,
        }}
      >
        {/* Mini patient strip (Figma 2635:131109) */}
        <AppointmentPatientStrip patient={patient} cardPatient={cardPatient} />

        {/* Mode radio (Figma 4025:14538 / 4030:1578). Default state per
            Figma 4046:19444 — neither pill is selected on first paint;
            the doctor explicitly picks "ไม่นัดหมาย" (collapses the body,
            Figma 4030:9506) or "นัดหมาย" (reveals the three detail
            cards, Figma 4046:18305). */}
        <Field label='การนัดหมาย' required>
          <div
            role='radiogroup'
            aria-label='การนัดหมาย'
            className='flex flex-row flex-wrap w-full'
            style={{ gap: 'var(--dim-space-300)' }}
          >
            {APPT_MODE_OPTIONS.map((o) => (
              <RadioButton
                key={o.value}
                name='appt-mode'
                value={o.value}
                checked={appt.mode === o.value}
                onChange={setAppt('mode')}
                title={o.label}
                /* Step 6 radios hide the inner radio dot per Figma
                   4025:14538 — the brand outline + title pill carry the
                   entire selected affordance. */
                showRadio={false}
                showCircleIcon={false}
                showIcon={false}
                showBadgeTitle={false}
                showBadge={false}
                showDescription={false}
              />
            ))}
          </div>
        </Field>

        {/* Three sub-cards only render when "นัดหมาย" is explicitly
            picked. The undefined-mode default and the "ไม่นัดหมาย"
            choice both collapse the body — Figma 4046:19444 and
            4030:9506 show only the radios above this point. Layout
            inside follows Figma 4046:18305:

              Card 1 รายละเอียดการนัดหมาย — clinic / type / doctor +
                                            reason / preparation (Voice).
              Card 2 คำสั่งล่วงหน้า       — yes/no radio.
              Card 3 วันเวลาที่ต้องการ —    location radio + next-visit
                                            date picker. */}
        {/* Cards stay mounted so toggling the mode radio glides
            instead of snapping — ApptCollapse handles the height +
            opacity transition. */}
        <ApptCollapse open={appt.mode === 'schedule'}>
          <div
            className='flex flex-col w-full'
            style={{
              gap: 'var(--dim-space-600)',
              /* 24 px below the last ApptCard so the stack clears the shell /
                 next section (matches --dim-space-600). */
              paddingBottom: 'var(--dim-space-600)',
            }}
          >
            <ApptCard title='รายละเอียดการนัดหมาย'>
              <FieldGrid cols={2} rowGap='var(--dim-space-400)' columnGap='var(--dim-space-600)'>
                <Field label='คลินิกที่นัดตรวจ' required>
                  <Select
                    value={appt.clinic}
                    onChange={setAppt('clinic')}
                    options={APPT_CLINIC_OPTIONS}
                    placeholder='เลือกคลินิก'
                  />
                </Field>
                <Field label='ลักษณะการนัดหมาย' required>
                  <Select
                    value={appt.type}
                    onChange={setAppt('type')}
                    options={APPT_TYPE_OPTIONS}
                    placeholder='เลือกลักษณะการนัดหมาย'
                  />
                </Field>
                <Field label='แพทย์ผู้ตรวจ' required>
                  <Select
                    value={appt.doctor}
                    onChange={setAppt('doctor')}
                    options={APPT_DOCTOR_OPTIONS}
                    placeholder='เลือกแพทย์'
                  />
                </Field>
                <div aria-hidden />
                {/* เหตุผลการนัดหมาย / การเตรียมตัวก่อนตรวจ — Voice +
                    SuggestibleTextarea (mic + language + typing suggestions). */}
                <Field label='เหตุผลการนัดหมาย / อาการเบื้องต้น' required>
                  <SuggestibleTextarea
                    voice
                    value={appt.reason || ''}
                    onChange={setApptFromEvent('reason')}
                    placeholder='พิมพ์หรือกดปุ่มไมโครโฟนเพื่อพูด...'
                    height={160}
                    minHeight={96}
                    suggestions={APPT_REASON_SUGGESTIONS}
                    minChars={2}
                    popoverAriaLabel='คำแนะนำเหตุผลการนัดหมาย'
                  />
                </Field>
                <Field label='การเตรียมตัวก่อนตรวจ' required>
                  <SuggestibleTextarea
                    voice
                    value={appt.preparation || ''}
                    onChange={setApptFromEvent('preparation')}
                    placeholder='พิมพ์หรือกดปุ่มไมโครโฟนเพื่อพูด...'
                    height={160}
                    minHeight={96}
                    suggestions={APPT_PREPARATION_SUGGESTIONS}
                    minChars={2}
                    popoverAriaLabel='คำแนะนำการเตรียมตัวก่อนตรวจ'
                  />
                </Field>
              </FieldGrid>
            </ApptCard>

            <ApptCard title='คำสั่งล่วงหน้า'>
              <div
                role='radiogroup'
                aria-label='คำสั่งล่วงหน้า'
                className='flex flex-row flex-wrap w-full'
                style={{ gap: 'var(--dim-space-300)' }}
              >
                {APPT_ADVANCE_OPTIONS.map((o) => (
                  <RadioButton
                    key={o.value}
                    name='appt-advance'
                    value={o.value}
                    checked={appt.advance === o.value}
                    onChange={setAppt('advance')}
                    title={o.label}
                    showRadio={false}
                    showCircleIcon={false}
                    showIcon={false}
                    showBadgeTitle={false}
                    showBadge={false}
                    showDescription={false}
                  />
                ))}
              </div>
              {/* Detail fields per Figma 4025:14538 — only render when
                  the doctor has picked "มีคำสั่งล่วงหน้า". Wrapped in
                  ApptCollapse so toggling the radio glides instead of
                  snapping. Two side-by-side fields:
                    1. คำสั่ง — Brand outline + list (4053:7794) + picker popup.
                    2. เงื่อนไขก่อนทำ — Voice + suggestions (typed or dictated). */}
              <ApptCollapse open={appt.advance === 'has'} gapBefore='var(--dim-space-400)'>
                <FieldGrid cols={2} rowGap='var(--dim-space-400)' columnGap='var(--dim-space-600)'>
                  {/*
                    Advance orders — PHCIS | Appointment:
                      • Empty: 4025:14538 — Brand outline + `add` "เลือกคำสั่งล่วงหน้า".
                      • Filled: 4053:7794 — list rows (badge 72 + label + trash) +
                        outline "เลือกคำสั่งล่วงหน้าเพิ่ม" (opens same popup).
                  */}
                  <Field label='คำสั่ง' required>
                    {selectedAdvanceOrders.length === 0 ? (
                      <BrandButton
                        type='button'
                        variant='outline'
                        size='sm'
                        leadingIcon='add'
                        onClick={() => setAdvanceOrderPickerOpen(true)}
                      >
                        เลือกคำสั่งล่วงหน้า
                      </BrandButton>
                    ) : (
                      <div
                        className='flex w-full flex-col'
                        style={{ gap: 'var(--dim-space-150, 6px)' }}
                      >
                        <div
                          className='flex w-full flex-col overflow-hidden'
                          style={{ borderRadius: 'var(--dim-radius-400, 12px)' }}
                        >
                          {selectedAdvanceOrders.map((opt) => (
                            <div
                              key={opt.value}
                              className='flex w-full min-w-0 items-center'
                              style={{
                                gap: 'var(--dim-space-200, 8px)',
                                minHeight: 48,
                                padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
                                background: 'var(--surface-list-default, #FFFFFF)',
                                borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
                              }}
                            >
                              {opt.badge?.style && opt.badge?.label && (
                                <ColorfulBadge
                                  style={opt.badge.style}
                                  size='small'
                                  width='hug'
                                  minWidth={72}
                                  hierarchy='secondary'
                                >
                                  {opt.badge.label}
                                </ColorfulBadge>
                              )}
                              <span
                                className='min-w-0 flex-1 truncate'
                                style={{
                                  fontFamily: 'var(--type-family-body)',
                                  fontSize: 'var(--type-size-sm, 14px)',
                                  lineHeight: 1.5,
                                  color: 'var(--text-list-default, #4D5358)',
                                }}
                              >
                                {opt.label}
                              </span>
                              <NeutralSubdueIconButton
                                type='button'
                                variant='outline'
                                size='sm'
                                icon='delete_outline'
                                aria-label={`ลบ ${opt.label}`}
                                onClick={() => setPendingAdvanceOrderDeleteId(opt.value)}
                              />
                            </div>
                          ))}
                        </div>
                        <BrandButton
                          type='button'
                          variant='outline'
                          size='sm'
                          leadingIcon='add'
                          onClick={() => setAdvanceOrderPickerOpen(true)}
                        >
                          เลือกคำสั่งล่วงหน้าเพิ่ม
                        </BrandButton>
                      </div>
                    )}
                  </Field>
                  <Field label='เงื่อนไขก่อนทำ' required>
                    {/* Figma 4053:7799 — VoiceTextarea with suggestion
                        popover (APPT_PREPROCEDURE_SUGGESTIONS).
                        `minChars=1` so the doctor sees stock prep
                        conditions on the very first keystroke instead
                        of needing two-letter prefix matches. */}
                    <SuggestibleTextarea
                      voice
                      value={appt.condition || ''}
                      onChange={setApptFromEvent('condition')}
                      placeholder='พิมพ์หรือกดปุ่มไมโครโฟนเพื่อพูด...'
                      height={160}
                      minHeight={96}
                      suggestions={APPT_PREPROCEDURE_SUGGESTIONS}
                      minChars={1}
                      popoverAriaLabel='คำแนะนำเงื่อนไขก่อนทำ'
                    />
                  </Field>
                </FieldGrid>
              </ApptCollapse>
            </ApptCard>

            <ApptCard title='วันเวลาที่ต้องการนัดหมาย'>
              {/* Visit type + date + slots — Figma 4025:14538: all optional
                  (no required asterisk on labels). */}
              <Field label='ประเภทการรับตรวจ'>
                <div
                  role='radiogroup'
                  aria-label='ประเภทการรับตรวจ'
                  className='flex flex-row flex-wrap w-full'
                  style={{ gap: 'var(--dim-space-300)' }}
                >
                  {APPT_LOCATION_OPTIONS.map((o) => (
                    <RadioButton
                      key={o.value}
                      name='appt-location'
                      value={o.value}
                      checked={appt.location === o.value}
                      onChange={setAppt('location')}
                      title={o.label}
                      showRadio={false}
                      showCircleIcon={false}
                      showIcon={false}
                      showBadgeTitle={false}
                      showBadge={false}
                      showDescription={false}
                    />
                  ))}
                </div>
              </Field>

              {/* วันที่นัดหมาย — DatePicker (Figma 4025:14538). Persisted
                  as an ISO string so the value round-trips cleanly
                  through the form state. */}
              <Field label='วันที่นัดหมาย'>
                <div style={{ maxWidth: 320 }}>
                  <DatePicker
                    modal
                    value={parseApptDate(appt.date)}
                    onChange={(d) => setAppt('date')(d ? d.toISOString() : '')}
                    placeholder='เลือกวันที่'
                    showLabel={false}
                    showHelperText={false}
                  />
                </div>
              </Field>

              {/* Timeslot grid — Figma 4025:14538 / 2624:104788 ·
                  3 rows × 5 cols. Only renders once the doctor has
                  picked a `วันที่นัดหมาย` date so the slot picker maps
                  to a concrete day. Wrapped in ApptCollapse so the
                  reveal glides instead of snapping. Disabled "(เต็ม)"
                  cells driven by APPT_TIMESLOTS' `taken` flag; slots
                  whose start is before now + 1 hour are disabled
                  (past days or same-day lead time). */}
              <ApptCollapse open={!!appt.date} gapBefore='var(--dim-space-400)'>
                <div
                  style={{
                    padding: 'var(--dim-space-400)',
                    borderRadius: 'var(--dim-radius-400)',
                    background: 'var(--surface-card-100, #FFFFFF)',
                    /* Tray border aliases the same `--border-timeslot-
                       default` token the slot pills use for their idle
                       outline, so the tray hairline + pill outlines
                       share one source of truth (Figma 4025:14538). */
                    border: 'var(--dim-stroke-100, 1px) solid var(--border-timeslot-default, var(--border-brandPrimary-quaternary, #E2F3EB))',
                  }}
                >
                  <div
                    className='grid w-full'
                    style={{
                      gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                      gap: 'var(--dim-space-200)',
                    }}
                  >
                    {APPT_TIMESLOTS.map((slot) => {
                      const slotStart = apptDay
                        ? parseTimeslotStartOnDate(slot.value, apptDay)
                        : null;
                      const beforeLead = !!(
                        slotStart
                        && !Number.isNaN(slotStart.getTime())
                        && slotStart.getTime() < Date.now() + APPT_MIN_LEAD_MS
                      );
                      const disabled = slot.taken || beforeLead;
                      const disabledLabel = slot.taken
                        ? '(เต็ม)'
                        : beforeLead
                          ? (isPastApptDay ? '(วันที่ผ่านมา)' : '(ก่อน 1 ชม.)')
                          : undefined;
                      return (
                        <Timeslot
                          key={slot.value}
                          value={slot.value}
                          selected={appt.slot === slot.value}
                          disabled={disabled}
                          disabledLabel={disabledLabel}
                          onClick={() => setAppt('slot')(slot.value)}
                        />
                      );
                    })}
                  </div>
                </div>
              </ApptCollapse>
            </ApptCard>
          </div>
        </ApptCollapse>
      </div>

      {/* ประวัติการรักษา — same read-only layout as Step 1 (Figma PHCIS | Appointment 4034:3723 / 4048:1126).
          `bodyScrollable={false}` hands scroll control to the inner
          layout so the left rail and right pane scroll independently —
          the date list stays put while the doctor reads through the
          right pane's full visit detail. */}
      <MedicalHistoryPopup
        open={medicalHistoryOpen}
        onClose={() => setMedicalHistoryOpen(false)}
        patient={patient}
      />

      <AppointmentHistoryPopup
        open={appointmentHistoryOpen}
        onClose={() => setAppointmentHistoryOpen(false)}
        hn={patient?.hn}
        appointments={INITIAL_APPOINTMENTS}
      />

      {/* Advance-order picker (Figma 4053:6953). Multi-select; commits
          the picked ids into `appt.advanceOrders` as an array. */}
      <AdvanceOrderPickerPopup
        open={advanceOrderPickerOpen}
        onClose={() => setAdvanceOrderPickerOpen(false)}
        onConfirm={(ids) => setAppt('advanceOrders')(ids)}
        options={APPT_ADVANCE_ORDER_OPTIONS}
        value={advanceOrderIds}
      />

      <DeleteAdvanceOrderConfirmPopup
        open={pendingAdvanceOrderDeleteId != null}
        onClose={() => setPendingAdvanceOrderDeleteId(null)}
        onConfirm={confirmDeleteAdvanceOrder}
        orderLabel={pendingAdvanceOrderLabel}
      />
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────
   Step 7 — ใบรับรองแพทย์ / Medical Certificate (Figma PHCIS-ALL
   2767:120407). Aliases existing components — Topic, RadioGroup,
   ColorfulBadge, Information, Select, Textarea, DatePickerRange,
   BrandPrimaryButton, NeutralSubdueButton, Sym. The cert-type icon
   card grid and the signature pad are inline because they are
   step-specific.
   ───────────────────────────────────────────────────────────── */

/* Certificate-type glyphs — Figma 226:32124 assets (20 px in 36 px circle). */
const CERT_TYPE_ICON_SRC = {
  stethoscope: '/icons/cert-type/stethoscope.svg',
  sick: '/icons/cert-type/sick.svg',
  balance: '/icons/cert-type/balance.svg',
  flights_and_hotels: '/icons/cert-type/flights-and-hotels.svg',
  flight: '/icons/cert-type/flights-and-hotels.svg',
};

/* Figma 226:32128 — flights_and_hotels sits in a 20×20 slot with
   inset 4.17% top/bottom and 16.67% left/right → 13.33×18.33 px.
   Inline SVG keeps that aspect ratio; forcing 20×20 skews the glyph. */
const FlightsAndHotelsGlyph = ({ color }) => (
  <svg
    viewBox='0 0 13.3333 18.3333'
    width='13.333'
    height='18.333'
    fill='none'
    aria-hidden
    style={{ display: 'block', flexShrink: 0 }}
  >
    <path
      d='M2.98958 11.3229C3.31597 10.9965 3.70833 10.8333 4.16667 10.8333C4.625 10.8333 5.01736 10.9965 5.34375 11.3229C5.67014 11.6493 5.83333 12.0417 5.83333 12.5C5.83333 12.9583 5.67014 13.3507 5.34375 13.6771C5.01736 14.0035 4.625 14.1667 4.16667 14.1667C3.70833 14.1667 3.31597 14.0035 2.98958 13.6771C2.66319 13.3507 2.5 12.9583 2.5 12.5C2.5 12.0417 2.66319 11.6493 2.98958 11.3229ZM0.239583 18.0938C0.0798611 17.934 0 17.7361 0 17.5V10.8333C0 10.5972 0.0798611 10.3993 0.239583 10.2396C0.399306 10.0799 0.597222 10 0.833333 10C1.06944 10 1.26736 10.0799 1.42708 10.2396C1.58681 10.3993 1.66667 10.5972 1.66667 10.8333V15H6.66667V11.6667C6.66667 11.4306 6.74653 11.2326 6.90625 11.0729C7.06597 10.9132 7.26389 10.8333 7.5 10.8333H11.6667C12.125 10.8333 12.5174 10.9965 12.8438 11.3229C13.1701 11.6493 13.3333 12.0417 13.3333 12.5V17.5C13.3333 17.7361 13.2535 17.934 13.0938 18.0938C12.934 18.2535 12.7361 18.3333 12.5 18.3333C12.2639 18.3333 12.066 18.2535 11.9063 18.0938C11.7465 17.934 11.6667 17.7361 11.6667 17.5V16.6667H1.66667V17.5C1.66667 17.7361 1.58681 17.934 1.42708 18.0938C1.26736 18.2535 1.06944 18.3333 0.833333 18.3333C0.597222 18.3333 0.399306 18.2535 0.239583 18.0938ZM7.33333 5.54167L5.125 7.75L5.3125 8.95833C5.32639 9.02778 5.32292 9.09028 5.30208 9.14583C5.28125 9.20139 5.24306 9.25695 5.1875 9.3125L5.10417 9.39583C4.99306 9.50695 4.87153 9.54861 4.73958 9.52083C4.60764 9.49306 4.50694 9.41667 4.4375 9.29167L3.72917 7.95833L2.3125 7.1875C2.20139 7.13194 2.13889 7.04514 2.125 6.92708C2.11111 6.80903 2.14583 6.70833 2.22917 6.625L2.39583 6.45833C2.42361 6.43056 2.52083 6.39583 2.6875 6.35417L3.9375 6.52083L6.14583 4.3125L2.22917 2.1875C2.07639 2.11806 1.99306 2 1.97917 1.83333C1.96528 1.66667 2.01389 1.52778 2.125 1.41667L2.27083 1.27083C2.34028 1.20139 2.41319 1.15625 2.48958 1.13542C2.56597 1.11458 2.64583 1.11806 2.72917 1.14583L7.95833 2.5L10.2083 0.25C10.375 0.0833333 10.5764 0 10.8125 0C11.0486 0 11.25 0.0833333 11.4167 0.25C11.5833 0.416667 11.6667 0.618056 11.6667 0.854167C11.6667 1.09028 11.5833 1.29167 11.4167 1.45833L9.16667 3.70833L10.5 8.91667C10.5278 9.01389 10.5312 9.10417 10.5104 9.1875C10.4896 9.27083 10.4444 9.34722 10.375 9.41667L10.2917 9.5C10.1667 9.625 10.0139 9.67361 9.83333 9.64583C9.65278 9.61806 9.52083 9.52778 9.4375 9.375L7.33333 5.54167ZM11.6667 15V12.5H8.33333V15H11.6667Z'
      fill={color}
    />
  </svg>
);

const CertTypeCircleIcon = ({ option }) => {
  const iconKey = option.icon ?? 'stethoscope';
  const isTravel = iconKey === 'flights_and_hotels' || iconKey === 'flight';
  return (
    <span
      className='inline-flex items-center justify-center shrink-0'
      style={{
        width: 36,
        height: 36,
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: option.tone.bg,
      }}
      aria-hidden
    >
      {isTravel ? (
        <FlightsAndHotelsGlyph color={option.tone.fg} />
      ) : (
        <img
          src={CERT_TYPE_ICON_SRC[iconKey] ?? CERT_TYPE_ICON_SRC.stethoscope}
          alt=''
          width={20}
          height={20}
          draggable={false}
          style={{ display: 'block', flexShrink: 0 }}
        />
      )}
    </span>
  );
};

/* Read-only patient field column for the "ข้อมูลผู้ป่วย" auto-fill row
   (Figma 228:25929). Each field is a 43-px-tall flex-col stack with
   4 px between the Medium-12 tertiary label and the Regular-14 default
   value. `whiteSpace: nowrap` mirrors the Figma frame — every value
   sits on a single line; the parent row owns the 48-px gap. */
const CertPatientField = ({ label, value }) => (
  <div
    className='flex flex-col items-start shrink-0'
    style={{ gap: 'var(--dim-space-100)', height: 43 }}
  >
    <span style={{
      color: 'var(--text-content-tertiary)',
      fontFamily: 'var(--type-family-body)',
      fontWeight: 'var(--type-weight-medium)',
      fontSize: 'var(--type-size-xs)',
      lineHeight: 1.5,
      whiteSpace: 'nowrap',
    }}>{label}</span>
    <span style={{
      color: 'var(--text-content-default)',
      fontFamily: 'var(--type-family-body)',
      fontWeight: 'var(--type-weight-regular)',
      fontSize: 'var(--type-size-sm)',
      lineHeight: 1.5,
      whiteSpace: 'nowrap',
    }}>{value || '—'}</span>
  </div>
);

/* ผู้ออกใบรับรองแพทย์ — Figma 295:34330 read-only issuer row. */
const CertSignerIssuerRow = ({ doctorName, licenseNo, avatarUrl }) => (
  <div
    className='flex w-full min-w-0 items-center'
    style={{ gap: 'var(--dim-space-1200)' }}
  >
    <div
      className='flex flex-1 min-w-0 items-center'
      style={{ gap: 'var(--dim-space-300)', maxWidth: 640 }}
    >
      <DoctorProfileAvatar src={avatarUrl} alt={doctorName} size={40} />
      <CertPatientField label='แพทย์ผู้ตรวจ' value={doctorName} />
    </div>
    <div className='flex flex-1 min-w-0' style={{ maxWidth: 640 }}>
      <CertPatientField label='เลขใบอนุญาตประกอบวิชาชีพ' value={licenseNo} />
    </div>
  </div>
);

/* "ดึงข้อมูลอัตโนมัติ" badge used by ข้อมูลผู้ป่วย + การวินิจฉัยโรค headers
   (Figma 3263:174930 / 3263:174954). */
const CertAutoFillBadge = () => (
  <ColorfulBadge
    style='green'
    size='small'
    width='hug'
    icon='check'
    iconFill={1}
    iconWeight={500}
  >
    ดึงข้อมูลอัตโนมัติ
  </ColorfulBadge>
);

/* Section hairline — Figma 228:27018 card body (226:33423):
   border/neutral/quaternary 1 px full width between each major block
   (227:25576, 227:25577, 228:25882, 228:26524). */
const CertSectionDivider = () => (
  <div
    aria-hidden
    className='w-full shrink-0'
    style={{
      height: 'var(--dim-stroke-100)',
      background: 'var(--border-neutral-quaternary, #F4F5F5)',
    }}
  />
);

/* การวินิจฉัยโรค empty — Figma PHCIS-ALL 294:31586 / 294:29416 when Step 4
   has no diagnosis note or ICD row yet. Mirrors Step 4 physical-exam empty
   (Lottie + headline + outline CTA) but routes to Step 4 (วินิจฉัย). */
const CertDiagnosisEmptyState = ({ onRecordDiagnosis }) => (
  <div
    className='flex flex-col items-center justify-center w-full'
    style={{
      gap: 'var(--dim-space-300)',
      minHeight: 272,
      padding: 'var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-400)',
      border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <LottieIllustration animationData={medicalCheckupAnim} size={160} />
    <div
      className='flex flex-col items-center'
      style={{ gap: 'var(--dim-space-150)' }}
    >
      <span style={{
        color: 'var(--text-brandPrimary-default, #007549)',
        fontFamily: 'var(--type-family-heading-content)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.5,
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}>
        ยังไม่มีบันทึกการวินิจฉัยโรค
      </span>
      <span style={{
        color: 'var(--text-content-quaternary, #ADB2B7)',
        fontFamily: 'var(--type-family-body)',
        fontWeight: 'var(--type-weight-medium)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.5,
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}>
        กรุณาบันทึกการวินิจฉัยโรคก่อน
      </span>
    </div>
    <BrandButton variant='outline' size='md' leadingIcon='edit' onClick={onRecordDiagnosis}>
      บันทึกการวินิจฉัยโรค
    </BrandButton>
  </div>
);

/* Clinical readout card — Figma 228:27018 / 226:33185 (Information 2550:10442).
   Neutral-quaternary tile with multiline body copy (pre-wrap). */
const CertClinicalInfoCard = ({ label, value }) => (
  <div
    className='flex w-full min-w-0'
    style={{
      maxWidth: 640,
      /* กล่องยืดเต็มความสูงของแถว กล่องซ้าย/ขวาจึงเท่ากันเสมอ แม้ข้อความยาว
         ไม่เท่ากัน (มติผู้ใช้ 31 ส.ค. 69) */
      height: '100%',
      padding: 'var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-400)',
      background: 'var(--surface-neutral-quaternary, #F9FBFB)',
    }}
  >
    <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
      <span style={{
        color: 'var(--text-content-tertiary, #858C92)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        fontWeight: 'var(--type-weight-medium)',
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <span style={{
        color: 'var(--text-content-default, #363B3F)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-regular)',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
      }}>
        {value?.trim() ? value : '—'}
      </span>
    </div>
  </div>
);

/* การวินิจฉัยโรค filled — Figma 228:27018 / card 226:32981.
   226:33422 = blue ICD strip only; 226:33184 = grey Information grid below
   (siblings, not nested inside the blue box). */
const CertDiagnosisFilledState = ({ form, primaryDx }) => {
  const diagnosisText =
    (form.diagnosisNote && String(form.diagnosisNote).trim())
    || (form.diagnoses || []).map((d) => `${d.code} ${d.name}`).join('\n');
  const doctorOrderText =
    (form.doctorOrderNote && String(form.doctorOrderNote).trim())
    || (form.medications || []).map((m, i) => `${i + 1}. ${m.name}`).join('\n');

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
      {primaryDx && (
        <div
          className='flex w-full min-w-0'
          style={{
            padding: 'var(--dim-space-400)',
            borderRadius: 'var(--dim-radius-400)',
            background: 'var(--surface-info-quaternary, #F0F6FF)',
          }}
        >
          <div className='flex items-center w-full min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
            <ColorfulBadge style='blue' size='small' width='hug' hierarchy='primary'>
              {primaryDx.code}
            </ColorfulBadge>
            <span style={{
              flex: 1,
              minWidth: 0,
              color: 'var(--text-info-default, #1D4ED8)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.5,
            }}>
              {primaryDx.name}
            </span>
          </div>
        </div>
      )}
      {/* กริด 2×2 แทนสองคอลัมน์ที่แยกกัน (มติผู้ใช้ 31 ส.ค. 69) — สองคอลัมน์เดิม
          ต่างคนต่างสูงตามข้อความของตัวเอง กล่องซ้ายจึงเตี้ยกว่ากล่องขวาที่มี
          รายการยาวกว่า กริดบังคับให้กล่องในแถวเดียวกันสูงเท่ากัน (CC ↔ วินิจฉัย ·
          ตรวจร่างกาย ↔ คำสั่งแพทย์) จึงต้องเรียงแบบไล่แถว ไม่ใช่ไล่คอลัมน์ */}
      <div
        className='grid w-full min-w-0'
        style={{
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          columnGap: 'var(--dim-space-1200)',
          rowGap: 'var(--dim-space-400)',
          alignItems: 'stretch',
        }}
      >
        <CertClinicalInfoCard
          label='อาการ (Chief Complaint)'
          value={form.doctorExam?.cc}
        />
        <CertClinicalInfoCard label='วินิจฉัย (Diagnosis)' value={diagnosisText} />
        <CertClinicalInfoCard
          label='ตรวจร่างกาย (Physical Examination)'
          value={form.doctorExam?.pe}
        />
        <CertClinicalInfoCard label='คำสั่งแพทย์ (Doctor Order)' value={doctorOrderText} />
      </div>
    </div>
  );
};

export const Step7Certificate = ({ form, setForm, patient, onStepChange, stepIndexes }) => {
  const set = (k) => (v) => setForm((s) => ({ ...s, [k]: v }));
  const setRange = ([a, b]) => setForm((s) => ({ ...s, startDate: a, endDate: b }));
  const handleCertSignatureChange = (dataUrl) => {
    setForm((s) => ({
      ...s,
      certSignature: dataUrl,
      certSignedAt: dataUrl ? s.certSignedAt : '',
    }));
  };
  const handleCertSignatureConfirm = () => {
    setForm((s) => (
      s.certSignature
        ? { ...s, certSignedAt: formatCertSignedAt() }
        : s
    ));
  };
  const handleRestDaysChange = (pillValue) => {
    const pill = CERT_REST_DAY_PILLS.find((p) => p.value === pillValue);
    setForm((s) => {
      if (!pill || pill.custom) {
        return { ...s, restDays: pillValue };
      }
      const { startDate, endDate } = computeCertRestDateRange(pill.days);
      return { ...s, restDays: pillValue, startDate, endDate };
    });
  };
  /* index ของขั้น "วินิจฉัย" เลื่อน 3 → 4 บน /treat/record หลังแทรก SOAP
     ผู้เรียกที่ไม่ส่ง stepIndexes (คลินิก 7 ขั้น) ยังได้ค่าเดิม */
  const goToDiagnosisStep = () => onStepChange?.(stepIndexes?.diagnosis ?? STEP_DOCTOR_RECORD_INDEX);

  const issueYes = form.certIssue === 'yes';
  /* ความประสงค์เรื่องใบรับรองแพทย์ที่พยาบาลถามไว้ตอนคัดกรอง (มติผู้ใช้ 31 ส.ค. 69)
     — เดิมค่านี้ไปโผล่ในคอลัมน์ "บันทึกจากพยาบาล" ของขั้นตรวจร่างกาย ซึ่งอยู่คนละ
     ขั้นกับตอนที่แพทย์ต้องตัดสินใจจริง จึงย้ายมาอยู่ใต้ปุ่มรับ/ไม่รับตรงนี้แทน
     `null` = จุดคัดกรองไม่ได้ถาม — ไม่ขึ้นอะไรเลย ดีกว่าเดาว่าไม่ต้องการ */
  const screeningCert = getCarriedScreening(patient || {}).cert;
  const primaryDx = (form.diagnoses || [])[0];
  /* Step 7 "การวินิจฉัยโรค" — Figma 294:31586 empty vs 228:27018 filled.
     True when Step 4 has a diagnosis note and/or at least one ICD row. */
  const hasDiagnosisData = Boolean(
    primaryDx
    || (form.diagnosisNote && String(form.diagnosisNote).trim())
    || (form.diagnoses && form.diagnoses.length > 0),
  );
  const certDoctor =
    CERT_DOCTOR_OPTIONS.find((d) => d.value === form.certSignerDoctor) || null;
  const doctorLabel = certDoctor?.label || form.signedBy || '—';
  const licenseLabel =
    (CERT_LICENSE_OPTIONS.find((l) => l.value === form.certSignerLicense) || {}).label
    || certDoctor?.licenseValue
    || form.licenseNo
    || '—';
  const doctorAvatarUrl = certDoctor?.avatarUrl || DOCTOR_PROFILE_AVATAR_SRC;

  return (
    <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      <Topic
        hierarchy='primary'
        title='ใบรับรองแพทย์'
        leadingIcon='description'
        showSubText={false}
        showBadge={false}
        showChevron={false}
        showSuccess={false}
      />

      {/* Issuance toggle — Figma 287:29898 first-load: both pills
          (`ไม่รับ` / `รับ`) render in neutral default state, no field
          label above them (the section topic "ใบรับรองแพทย์" already
          sits immediately above). Inner radio dot hidden like Step 6.
          The bordered certificate card below only mounts once the
          doctor explicitly picks `รับ`. */}
      <div
        role='radiogroup'
        aria-label='ใบรับรองแพทย์'
        className='flex flex-row flex-wrap w-full'
        style={{ gap: 'var(--dim-space-300)' }}
      >
        {CERT_ISSUE_OPTIONS.map((o) => (
          <RadioButton
            key={o.value}
            name='cert-issue'
            value={o.value}
            checked={form.certIssue === o.value}
            onChange={set('certIssue')}
            title={o.label}
            showRadio={false}
            showCircleIcon={false}
            showIcon={false}
            showBadgeTitle={false}
            showBadge={false}
            showDescription={false}
          />
        ))}
      </div>

      {screeningCert != null && (
        <span style={{
          color: 'var(--text-content-tertiary, #858C92)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          lineHeight: 1.5,
        }}
        >
          {screeningCert
            ? 'ผู้ป่วยระบุว่าต้องการรับใบรับรองแพทย์ (บันทึกไว้ที่จุดคัดกรอง)'
            : 'ผู้ป่วยระบุว่าไม่ต้องการรับใบรับรองแพทย์ (บันทึกไว้ที่จุดคัดกรอง)'}
        </span>
      )}

      {/* Certificate card — Figma 228:27018 / 226:33424–33423. Mounts when
          "ใช่". Layer stack: full-bleed document strip (226:27191) →
          padded body (ประเภท … signature). */}
      {issueYes && (
        <div
          className='flex flex-col w-full min-w-0 overflow-hidden'
          style={{
            borderRadius: 'var(--dim-radius-500)',
            background: 'var(--surface-card-100)',
            boxShadow: 'var(--shadow-brand-drop-bottom-200)',
          }}
        >
          {/* Document strip — Figma 226:27191; full-bleed header cap (no card inset). */}
          <div
            className='flex w-full min-w-0 shrink-0 items-center self-stretch'
            style={{
              gap: 'var(--dim-space-400)',
              padding: 'var(--dim-space-400)',
              borderTopLeftRadius: 'var(--dim-radius-400)',
              borderTopRightRadius: 'var(--dim-radius-400)',
              background: 'var(--surface-table-header, var(--brand-p50, #F4FBF8))',
              borderBottom: 'var(--dim-stroke-200, 2px) solid var(--border-table-default, var(--brand-p100, #E2F3EB))',
            }}
          >
              <ColorfulIconBadge style='green' shape='pill' icon='stethoscope' />
              <span
                className='min-w-0 flex-1'
                style={{
                  color: 'var(--text-table-title)',
                  fontFamily: 'var(--type-family-heading-content)',
                  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                  fontSize: 'var(--type-size-sm)',
                  lineHeight: 1.5,
                }}
              >
                {/* หัวข้อภายในการ์ดลดจาก base เป็น sm (มติผู้ใช้ 31 ส.ค. 69) —
                    ขั้นนี้มีหัวข้อย่อยหกอัน ขนาด base ทำให้แต่ละอันอ่านเป็นหัวเรื่อง
                    ระดับเดียวกับชื่อการ์ด จนไล่ลำดับไม่ออก */}
                ใบรับรองแพทย์
              </span>
              <div
                className='flex shrink-0 items-center'
                style={{ gap: 'var(--dim-space-300)' }}
              >
                <span
                  style={{
                    color: 'var(--text-content-secondary)',
                    fontFamily: 'var(--type-family-body)',
                    fontWeight: 'var(--type-weight-medium)',
                    fontSize: 'var(--type-size-sm)',
                    lineHeight: 1.5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  เลขที่เอกสาร:
                </span>
                <ColorfulBadge style='blue' size='default' width='hug' hierarchy='primary'>
                  {form.certNo || 'MC-2569-000000'}
                </ColorfulBadge>
              </div>
          </div>

          {/* Card body — Figma 226:33423: padded inset below the full-width strip. */}
          <div
            className='flex flex-col w-full min-w-0'
            style={{
              gap: 'var(--dim-space-600)',
              padding: 'var(--dim-space-600)',
              borderLeft: 'var(--dim-stroke-100) solid var(--border-table-default)',
              borderRight: 'var(--dim-stroke-100) solid var(--border-table-default)',
              borderBottom: 'var(--dim-stroke-100) solid var(--border-table-default)',
              borderBottomLeftRadius: 'var(--dim-radius-500)',
              borderBottomRightRadius: 'var(--dim-radius-500)',
            }}
          >
            {/* Certificate type picker — Figma 228:27018 / 226:32124 */}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <span style={{
                color: 'var(--text-content-default)',
                fontFamily: 'var(--type-family-heading-content)',
                fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                fontSize: 'var(--type-size-sm)',
              }}>
                ประเภทใบรับรองแพทย์
              </span>
              <div
                role='radiogroup'
                aria-label='ประเภทใบรับรองแพทย์'
                className='flex items-start w-full'
                style={{ gap: 'var(--dim-space-200)' }}
              >
                {CERT_TYPE_CARDS.map((opt) => (
                  <RadioButton
                    key={opt.value}
                    name='cert-type'
                    value={opt.value}
                    checked={form.certType === opt.value}
                    onChange={set('certType')}
                    title={opt.titleTh}
                    description={opt.titleEn}
                    circleIcon={<CertTypeCircleIcon option={opt} />}
                    className='w-fit min-w-0'
                    style={{ width: 'fit-content' }}
                    showRadio={false}
                    showIcon={false}
                    showBadgeTitle={false}
                    showBadge={false}
                  />
                ))}
              </div>
            </div>

            {/* ภาษาใบรับรองแพทย์ (มติผู้ใช้ 31 ส.ค. 69) — TOR §1.5.11.3 กำหนดให้ออก
                ใบภาษาอังกฤษได้ ย้ายมาอยู่ในการ์ดเดียวกับประเภทใบ แทนที่จะเป็นการ์ด
                แยกท้ายขั้น เพราะเป็นคุณสมบัติของใบที่กำลังจะออก ไม่ใช่งานคนละชิ้น */}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <span style={{
                color: 'var(--text-content-default)',
                fontFamily: 'var(--type-family-heading-content)',
                fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                fontSize: 'var(--type-size-sm)',
              }}>
                ภาษาใบรับรองแพทย์
              </span>
              <div
                role='radiogroup'
                aria-label='ภาษาใบรับรองแพทย์'
                className='flex items-start w-full'
                style={{ gap: 'var(--dim-space-200)' }}
              >
                {[
                  { value: 'th', titleTh: 'ไทย', titleEn: 'Thai' },
                  { value: 'en', titleTh: 'อังกฤษ', titleEn: 'English' },
                ].map((opt) => (
                  <RadioButton
                    key={opt.value}
                    name='cert-language'
                    value={opt.value}
                    checked={(form.certLang || 'th') === opt.value}
                    onChange={set('certLang')}
                    title={opt.titleTh}
                    description={opt.titleEn}
                    className='w-fit min-w-0'
                    style={{ width: 'fit-content' }}
                    showRadio={false}
                    showCircleIcon={false}
                    showIcon={false}
                    showBadgeTitle={false}
                    showBadge={false}
                  />
                ))}
              </div>
            </div>

            <CertSectionDivider />

            {/* ข้อมูลผู้ป่วย — read-only auto-fill row (Figma 3263:174928) */}
            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <span
                className='shrink-0'
                style={{
                  color: 'var(--text-content-default)',
                  fontFamily: 'var(--type-family-heading-content)',
                  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                  fontSize: 'var(--type-size-sm)',
                  whiteSpace: 'nowrap',
                }}
              >
                ข้อมูลผู้ป่วย
              </span>
              <CertAutoFillBadge />
            </div>
            {/* Figma 228:25929 — gap space/1200 (48 px), single-row,
                items-center. Allows horizontal scroll on narrower
                viewports rather than wrapping so the five-field
                rhythm matches the design. */}
            <div
              className='flex items-center w-full'
              style={{ gap: 'var(--dim-space-1200)', overflowX: 'auto' }}
            >
              <CertPatientField
                label='ชื่อ-นามสกุล'
                value={`${patient?.prefixTh || ''}${patient?.firstNameTh || ''} ${patient?.lastNameTh || ''}`.trim()}
              />
              <CertPatientField label='เลขบัตรประชาชน' value={patient?.nationalId} />
              <CertPatientField
                label='อายุ (ปี-เดือน-วัน)'
                value={patient?.age != null ? `${patient.age} ปี` : null}
              />
              <CertPatientField label='หมู่เลือด' value={patient?.bloodType} />
              <CertPatientField label='สถานพยาบาล' value='โรงพยาบาลพระนั่งเกล้า' />
            </div>

            <CertSectionDivider />

            {/* การวินิจฉัยโรค — Figma 226:32981: space/300 (12px) between
                header, ICD strip, and clinical cards (not card-body 24px). */}
            <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-400)' }}>
                <div
                  className='flex flex-1 items-center min-w-0'
                  style={{ gap: 'var(--dim-space-300)' }}
                >
                  <span
                    className='shrink-0'
                    style={{
                      color: 'var(--text-content-default)',
                      fontFamily: 'var(--type-family-heading-content)',
                      fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                      fontSize: 'var(--type-size-sm)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    การวินิจฉัยโรค
                  </span>
                  <CertAutoFillBadge />
                </div>
                {hasDiagnosisData && (
                  <NeutralSubdueButton
                    variant='outline'
                    size='sm'
                    leadingIcon='edit'
                    className='shrink-0'
                    onClick={goToDiagnosisStep}
                  >
                    แก้ไข
                  </NeutralSubdueButton>
                )}
              </div>
              {hasDiagnosisData ? (
                <CertDiagnosisFilledState form={form} primaryDx={primaryDx} />
              ) : (
                <CertDiagnosisEmptyState onRecordDiagnosis={goToDiagnosisStep} />
              )}
            </div>

            <CertSectionDivider />

            {/* คำแนะนำการพักรักษา — Figma 228:25830 / row 228:25930.
                Two flex-1 columns, gap space/1200 (48px), items-end so
                56px day pills (228:26222) baseline-align with the 40px
                date triggers under Input Field Range (228:26206). */}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <span style={{
                color: 'var(--text-content-default)',
                fontFamily: 'var(--type-family-heading-content)',
                fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                fontSize: 'var(--type-size-sm)',
              }}>
                คำแนะนำการพักรักษา
              </span>
              <div
                className='flex w-full min-w-0 items-end'
                style={{ gap: 'var(--dim-space-1200)' }}
              >
                {/* Left — Figma 228:25930 left slot + 228:26222 pill row */}
                <div className='flex flex-1 flex-row items-end self-stretch min-w-0'>
                  <div
                    role='radiogroup'
                    aria-label='ระยะเวลาพักรักษา'
                    className='flex flex-1 items-end min-w-0'
                    /* ปุ่มชุดเดียวกันควรอยู่ชิดกัน (มติผู้ใช้ 31 ส.ค. 69) — 16px ทำให้
                       อ่านเป็นปุ่มเดี่ยว ๆ หกอันมากกว่าเป็นตัวเลือกของคำถามเดียว */
                    style={{ gap: 'var(--dim-space-200)' }}
                  >
                    {CERT_REST_DAY_PILLS.map((pill) => (
                      <RadioButton
                        key={pill.value}
                        name='cert-rest-days'
                        value={pill.value}
                        checked={form.restDays === pill.value}
                        onChange={handleRestDaysChange}
                        title={pill.label}
                        showRadio={false}
                        showCircleIcon={false}
                        showIcon={false}
                        showBadgeTitle={false}
                        showBadge={false}
                        showDescription={false}
                      />
                    ))}
                  </div>
                </div>
                {/* Right — Figma 228:26206: flex-1, min 320, max 640,
                    label→inputs gap space/150 (6px). */}
                <div
                  className='flex flex-1 flex-col items-start min-w-0'
                  style={{ minWidth: 320, maxWidth: 640 }}
                >
                  <DatePickerRange
                    className='w-full'
                    label='วันที่เริ่มพัก - วันที่สิ้นสุด'
                    value={[form.startDate || '', form.endDate || '']}
                    onChange={setRange}
                    format={formatCertRestDate}
                    parse={parseCertRestDate}
                    leadingIcon='calendar_today'
                    placeholders={['เลือกวันที่เริ่มต้น', 'เลือกวันที่สิ้นสุด']}
                  />
                </div>
              </div>
            </div>

            <CertSectionDivider />

            {/* ผู้ออกใบรับรองแพทย์ — Figma 295:34330: avatar + read-only
                Information columns (auto-fill from certSignerDoctor). */}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <span style={{
                color: 'var(--text-content-default)',
                fontFamily: 'var(--type-family-heading-content)',
                fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                fontSize: 'var(--type-size-sm)',
              }}>
                ผู้ออกใบรับรองแพทย์
              </span>
              <CertSignerIssuerRow
                doctorName={doctorLabel}
                licenseNo={licenseLabel}
                avatarUrl={doctorAvatarUrl}
              />
            </div>

            {/* Form Builder Signature — Figma 228:26614 / 2451:13969 */}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <FormBuilderSignature
                value={form.certSignature || ''}
                onChange={handleCertSignatureChange}
                onBeginDrawing={() => setForm((s) => ({ ...s, certSignedAt: '' }))}
                onConfirm={handleCertSignatureConfirm}
                signerName={doctorLabel}
                licenseNo={licenseLabel}
                signedAt={form.certSignedAt || undefined}
                disabled={!form.certSignerDoctor || !form.certSignerLicense}
              />
            </div>
          </div>
        </div>
      )}

      {/* ศูนย์เอกสารและ e-Document (`DocumentCenterPanel`) ถูกเอาออกจากขั้นนี้
          28 ส.ค. 69 — ขั้นเอกสารจบที่การ์ดใบรับรองแพทย์และกล่องลายเซ็น
          ไฟล์พาเนลยังอยู่ และหน้าทันตกรรมยังเรียกใช้อยู่ */}
    </section>
  );
};
