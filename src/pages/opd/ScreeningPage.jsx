import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header, { SubHeader } from '@/components/layout/Header';
import PatientCard from '@/components/card/PatientCard';
import RecordWizardMorphBand, { MORPH_STICKY_BELOW_PATIENT } from '@/components/layout/RecordWizardMorphBand';
import QueueSubMenu from '@/components/layout/QueueSubMenu';
import QueueCallActions from '@/components/queue/QueueCallActions';
import DeleteQueueConfirmPopup from '@/components/popup/DeleteQueueConfirmPopup';
import { useStepDirection } from '@/components/step/stepTransition';
import ScreeningStep1 from '@/pages/opd/ScreeningStep1';
import ScreeningStep3 from '@/pages/opd/ScreeningStep3';
import { setScreeningSection, getScreeningReview } from '@/data/opdScreeningReview';
import ScreeningStep4 from '@/pages/opd/ScreeningStep4';
import { findMrPatientByHn } from '@/data/mrPatients';
import ScreeningStep5 from '@/pages/opd/ScreeningStep5';
import ScreeningStepDoctor from '@/pages/opd/ScreeningStepDoctor';
import AlertDialog from '@/components/popup/AlertDialog';
import Select from '@/components/forms/Select';
import { VISIT_DOCTORS } from '@/data/registrationVisits';
import { UNASSIGNED_DOCTOR, addToUnassignedPool, TREAT_CLINICS } from '@/data/unassignedWorklist';
import Textarea from '@/components/forms/Textarea';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Icon from '@/components/icons/Icon';
import { PAIN_LEVELS, TRIAGE_LEVELS } from '@/data/opdScreeningCatalog';
import Footer from '@/components/layout/Footer';
import ObservationAdmitPopup from '@/components/observation/ObservationAdmitPopup';
import InternalReferPopup from '@/components/popup/InternalReferPopup';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import SelectableCardButton from '@/components/button/SelectableCardButton';
import { formatThaiBedChipLabel } from '@/data/mockPatientBeds';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import {
  DEFAULT_PATIENT,
  getPatientByHN,
  getPatientByShortName,
} from '@/data/patientProfiles';
import {
  saveOpdScreeningDraft,
  getScreeningRounds,
  appendScreeningRound,
  getScreeningRoundCount,
  ensureSeedRound,
  stampStationTime,
  isScreeningCompleted,
} from '@/data/opdScreeningDrafts';
import { addWalkinRequest } from '@/data/opdWalkinRequests';
import {
  buildOpdQueueSubMenuBuckets,
  OPD_QUEUE_ROWS,
  OPD_QUEUE_SUBMENU_LABELS,
} from '@/data/opdQueue';

/* คัดกรองเยี่ยมบ้านใช้ "คัดกรองสุขภาพรายบุคคล" (แบบฟอร์มกระดาษของทีมเยี่ยมบ้าน)
   แทนขั้น "พฤติกรรมสุขภาพ" ของคัดกรองที่ศูนย์ — รายการความเสี่ยง 15 ข้อในฟอร์ม
   คลุมบุหรี่/เหล้า/ออกกำลังกายอยู่แล้ว ถามสองที่จะได้คำตอบที่ขัดกันเอง
   (มติผู้ใช้ 29 ส.ค. 69) ลำดับขั้นอื่นเหมือนกันทุกประการ */
const STEPS = [
  'สัญญาณชีพ',
  'อาการป่วย',
  /* แพ้ยา · แพ้อาหาร · แพ้สารเคมี · โรคประจำตัว · อื่น ๆ — pill sub-tabs
     inside one step (ScreeningStep3). โรคประจำตัว moved in from step 4 so
     only one DiseaseForm instance exists in the flow. */
  'ประวัติการแพ้ / โรคประจำตัว',
  'พฤติกรรมสุขภาพ',
  /* เลือกแพทย์ + ลงช่วงเวลา — อยู่ก่อนขั้นตรวจสอบข้อมูล เพราะเป็นการตัดสินใจ
     สุดท้ายของจุดคัดกรอง และขั้นตรวจสอบต้องอ่านค่านี้ไปสรุปด้วย
     (มติผู้ใช้ 28 ส.ค. 69) */
  'เลือกคลินิกและแพทย์',
  'ตรวจสอบข้อมูล',
];

/* ── Step 2 — อาการป่วย (Chief Complaint) ─────────────────────
   Composed inline from canonical sub-components: Textarea (Figma 268:26)
   for the three free-text fields, plus a single `SelectableCardButton`
   shell (declared above) that backs all four button groups — Pain,
   Triage, Care orders, and Cert — so they share identical chrome
   (white surface, neutral border default, brand-tertiary 2px selected
   border) and only differ in their internal content layout. */

const TopicHeader = ({ icon, children }) => (
  <div className='flex items-center gap-2 w-full'>
    <span className='text-brand-500'><Icon name={icon} size={20} /></span>
    <h2 className='text-base font-bold text-brand-500'>{children}</h2>
  </div>
);

const SymptomField = ({ label, required, children }) => (
  <div className='flex-1 flex flex-col gap-1.5 min-w-0'>
    <div className='flex items-center text-sm text-ink leading-snug'>
      <span>{label}</span>
      {required && <span className='ml-0.5 text-[color:var(--text-input-require)]'>*</span>}
    </div>
    {children}
  </div>
);

/* Pain level catalogue — Figma PHCIS | OPD 294:47891 → 160:26322..26326
   ("Radio Button" row). Material names match the Figma icon layers:
   `sentiment_satisfied` (ไม่ปวด), `sentiment_calm`, `sentiment_neutral`,
   `sentiment_dissatisfied`, `sentiment_stressed` — not `sentiment_very_satisfied`
   for the first step, which is a different glyph in the font. */
/* ย้ายไป `@/data/opdScreeningCatalog` แล้ว — จุดคัดกรองมีที่เดียว แต่ฝั่งอ่าน
   (คลินิกพิเศษ + CPOE) ต้องแปลง key/level กลับเป็น label ให้ตรงกัน */

/* Pain tone tokens — every pair below aliases a variable that is actually
   emitted by `src/styles/tokens.css`, with a fallback equal to the token's
   real value (CLAUDE.md). NOTE for mih-design: design.md documents a
   `surface.{info,warning,progress}.quaternary` + `text.progress.default`
   family that the generated tokens.css does NOT emit; until it does, the
   alert-surface aliases below are the closest real tokens.
     • brandPrimary → green   (#F4FBF8 / brand-p700 #007549)
     • alert-info   → blue    (#F0F6FF / #1D4ED8)
     • colorfulbadge-yellow → yellow (#FEF9C3 / #A16207)
     • alert-warning → orange (#FFF9F0 / #C2410C)
     • danger       → red     (#FFF0F0 / #B91C1C)                       */
const PAIN_TONE_TOKENS = {
  green:  {
    bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
    fg: 'var(--text-brandPrimary-default, #007549)',
  },
  blue:   {
    bg: 'var(--surface-alert-info, #F0F6FF)',
    fg: 'var(--text-info-default, #1D4ED8)',
  },
  yellow: {
    bg: 'var(--surface-colorfulbadge-yellow, #FEF9C3)',
    fg: 'var(--text-colorfulbadge-yellow, #A16207)',
  },
  orange: {
    bg: 'var(--surface-alert-warning, #FFF9F0)',
    fg: 'var(--text-warning-default, #C2410C)',
  },
  red:    {
    bg: 'var(--surface-danger-quaternary, #FFF0F0)',
    fg: 'var(--text-danger-default, #B91C1C)',
  },
};

/* Triage catalogue — Figma PHCIS-OPD "ความเร่งด่วน" row (5 levels).
   Each entry carries the colored "Level N" badge (top-left of the
   button) plus a bilingual label (Thai / English). Surface + text
   tokens flow through `--surface-triage-levelN` / `--text-triage-levelN`
   already declared in index.css so brand swaps retint correctly. */
/* ย้ายไป `@/data/opdScreeningCatalog` แล้ว (เหตุผลเดียวกับ PAIN_LEVELS) */

/* Common Thai chief-complaint phrases clinicians type into the Step 2
   "อาการ (Chief Complaint)" field. Surface as autocomplete suggestions
   after ≥ 3 characters typed — same `SuggestibleTextarea` pattern
   that Step 3 uses for drug-allergy symptoms (Figma 162:24221).
   Matched substring highlights in brand-p600 inside the popover.

   List spans the common presentations across body systems so any
   3-character lead (ปวด / ไข้ / ไอ / ท้อง / เจ็บ / ผื่น / เวียน / หาย /
   คลื่น / ปัสสาวะ …) surfaces at least one realistic match. */
export const CHIEF_COMPLAINT_SUGGESTIONS = [
  /* — เจ็บปวด / Musculoskeletal — */
  'ปวดหลังช่วงเอวมา 1 สัปดาห์ ปวดมากเวลาก้มตัวหรือยกของหนัก',
  'ปวดเข่าทั้งสองข้าง ลุก-นั่งลำบาก เป็นมา 2 สัปดาห์',
  'ปวดต้นคอ บ่า ไหล่ ร้าวลงแขนซ้าย',
  'ปวดข้อมือขวา บวมแดง หลังจากการใช้งานหนัก',
  /* — ปวดท้อง / GI — */
  'ปวดท้องบริเวณลิ้นปี่ คลื่นไส้ อาเจียน หลังรับประทานอาหาร',
  'ปวดท้องน้อยด้านขวา รบกวนการเคลื่อนไหว',
  'ท้องเสีย ถ่ายเหลววันละ 5-6 ครั้ง เริ่มมีอาการเมื่อ 2 วันก่อน',
  'คลื่นไส้ อาเจียนหลายครั้ง ทานอาหารไม่ลง',
  /* — Infectious / Systemic — */
  'ไข้สูง 38.5°C หนาวสั่น มาประมาณ 2 วัน รับประทานยาลดไข้ไม่ดีขึ้น',
  'ไข้ต่ำๆ ร่วมกับเจ็บคอ กลืนน้ำลายลำบาก',
  /* — Respiratory — */
  'ไอเรื้อรัง มีเสมหะสีเหลือง ติดต่อกัน 2 สัปดาห์',
  'ไอแห้ง ระคายคอ ตอนกลางคืน',
  'หายใจมีเสียงหวีด หอบเหนื่อย มีประวัติเป็นโรคหอบหืด',
  'หายใจไม่อิ่ม แน่นหน้าอก เป็นมา 1 ชั่วโมง',
  /* — Cardiovascular — */
  'เจ็บหน้าอกขณะออกแรง ร้าวไปแขนซ้าย ใจสั่น',
  /* — Neurology — */
  'ปวดศีรษะรุนแรงข้างเดียวเป็นพักๆ คลื่นไส้ ไวต่อแสง',
  'เวียนศีรษะ บ้านหมุน ทรงตัวลำบาก เป็นมา 1 สัปดาห์',
  'ชาปลายมือเท้า แขนขาอ่อนแรงครึ่งซีก',
  /* — Skin / Allergy — */
  'ผื่นคันทั่วตัว สงสัยแพ้ยา หลังรับประทานยาเมื่อเช้านี้',
  'ผื่นแดงคันบริเวณแขนทั้งสองข้าง เป็นมา 3 วัน',
  /* — Genitourinary — */
  'ปัสสาวะแสบขัด ปัสสาวะบ่อย มีสีขุ่น',
  'ปัสสาวะเป็นเลือด ปวดหลังด้านขวา',
  /* — Endocrine / Metabolic — */
  'น้ำหนักลดผิดปกติ กระหายน้ำ ปัสสาวะบ่อย',
  /* — Eye / ENT — */
  'ตามัวข้างขวา มองภาพไม่ชัด เป็นมา 2 วัน',
  'มีน้ำมูก คัดจมูก จาม เป็นมา 3 วัน',
];

/* Common Thai phrases clinicians type for "ระยะเวลาที่มีอาการ" (duration
   since onset). Ordered roughly shortest → longest so the dropdown
   reads like a timeline. `minChars: 1` is intentional — duration
   phrases often start with a single digit ("1 วัน", "2 สัปดาห์"), so
   typing the leading number alone should surface matches. */
export const DURATION_SUGGESTIONS = [
  /* — Minutes / Hours (acute) — */
  '30 นาที',
  'ประมาณ 1 ชั่วโมง',
  '2-3 ชั่วโมง',
  '6 ชั่วโมง',
  '12 ชั่วโมง',
  /* — Same-day onset — */
  'ตั้งแต่ตื่นนอน',
  'ตั้งแต่เช้านี้',
  'ตั้งแต่เมื่อคืน',
  /* — Days — */
  '1 วัน',
  '2 วัน',
  '2-3 วัน',
  '3-4 วัน',
  '5 วัน',
  '1 สัปดาห์',
  '10 วัน',
  /* — Weeks — */
  '2 สัปดาห์',
  '3 สัปดาห์',
  /* — Months — */
  '1 เดือน',
  '2 เดือน',
  '3 เดือน',
  '6 เดือน',
  /* — Chronic / Years — */
  '1 ปี',
  '2 ปี',
  'หลายปี',
  /* — Pattern descriptors — */
  'เป็นๆ หายๆ มาประมาณ 1 เดือน',
  'เป็นๆ หายๆ มาประมาณ 3 เดือน',
  'เป็นๆ หายๆ มาหลายเดือน',
  'เรื้อรังมาหลายปี',
  /* — Trigger-related — */
  'หลังออกกำลังกาย',
  'หลังรับประทานอาหาร',
  'หลังได้รับยา',
];

/* Common Thai narrative phrases clinicians type into the "ประวัติปัจจุบัน
   (Present Illness)" field. Each entry is a full HPI-style sentence
   (onset · character · severity · negative findings) so the user can
   pick the closest match and edit a few values. Same `SuggestibleTextarea`
   pattern (Figma 162:24221). */
export const PRESENT_ILLNESS_SUGGESTIONS = [
  /* — Musculoskeletal — */
  'ผู้ป่วยมีอาการปวดหลังช่วงเอวมาประมาณ 1 สัปดาห์ ปวดมากขึ้นเมื่อก้มตัวหรือยกของหนัก ไม่มีอาการชาขาหรือควบคุมการขับถ่ายผิดปกติ',
  'ผู้ป่วยมีอาการปวดเข่าทั้งสองข้างเรื้อรังมา 3 เดือน ปวดมากขณะลุก-นั่ง รับประทานยา NSAIDs แล้วดีขึ้นชั่วคราว',
  'ผู้ป่วยมีอาการปวดต้นคอ บ่า ไหล่ ร้าวลงแขนซ้าย เป็นมา 2 สัปดาห์ ปวดมากขณะนั่งทำงาน',
  /* — GI — */
  'ผู้ป่วยมีอาการปวดท้องบริเวณลิ้นปี่ คลื่นไส้ อาเจียน 2-3 ครั้ง หลังรับประทานอาหารเย็นเมื่อคืน',
  'ผู้ป่วยมีอาการท้องเสีย ถ่ายเหลววันละ 5-6 ครั้ง เริ่มมีอาการเมื่อ 2 วันก่อน ไม่มีไข้ ไม่มีถ่ายเป็นมูกเลือด',
  'ผู้ป่วยมีอาการคลื่นไส้ อาเจียนหลายครั้ง รับประทานอาหารไม่ลง เป็นมา 1 วัน',
  'ผู้ป่วยมีอาการปวดท้องน้อยด้านขวา รบกวนการเคลื่อนไหว เริ่มเป็นเมื่อ 6 ชั่วโมงก่อน',
  /* — Infectious / Systemic — */
  'ผู้ป่วยมีไข้สูง 38.5°C หนาวสั่น มาประมาณ 2 วัน รับประทานยาลดไข้แล้วไม่ดีขึ้น ไม่มีประวัติเดินทางต่างประเทศ',
  'ผู้ป่วยมีไข้ต่ำๆ ร่วมกับเจ็บคอ กลืนน้ำลายลำบาก เป็นมา 3 วัน',
  /* — Respiratory — */
  'ผู้ป่วยมีอาการไอเรื้อรัง มีเสมหะสีเหลือง ติดต่อกันมาประมาณ 2 สัปดาห์ ไม่มีน้ำหนักลด ไม่มีไอเป็นเลือด',
  'ผู้ป่วยมีอาการไอแห้ง ระคายคอ ตอนกลางคืน เป็นมาประมาณ 1 สัปดาห์',
  'ผู้ป่วยมีอาการหายใจมีเสียงหวีด หอบเหนื่อย เป็นมาประมาณ 2 ชั่วโมง มีประวัติเป็นโรคหอบหืดมาก่อน',
  'ผู้ป่วยมีอาการหายใจไม่อิ่ม แน่นหน้าอก ขณะออกแรง เป็นมา 1 สัปดาห์',
  /* — Cardiovascular — */
  'ผู้ป่วยมีอาการเจ็บหน้าอก ขณะออกแรง หายใจไม่สะดวก ร้าวไปแขนซ้าย เริ่มเป็นเมื่อ 2 ชั่วโมงก่อน',
  'ผู้ป่วยมีอาการใจสั่น เหนื่อยง่ายผิดปกติ เป็นมา 1 สัปดาห์',
  /* — Neurology — */
  'ผู้ป่วยมีอาการปวดศีรษะข้างเดียวเป็นพักๆ คลื่นไส้ ไวต่อแสงเสียง เป็นมาประมาณ 1 เดือน',
  'ผู้ป่วยมีอาการปวดศีรษะรุนแรงทันที ไม่เคยเป็นมาก่อน เริ่มเป็นเมื่อ 1 ชั่วโมงก่อน',
  'ผู้ป่วยมีอาการเวียนศีรษะ บ้านหมุน ทรงตัวลำบาก เป็นมา 1 สัปดาห์ ไม่มีอาการชาตามแขนขา',
  'ผู้ป่วยมีอาการชาปลายมือเท้าทั้งสองข้าง เป็นมาประมาณ 2 เดือน มีประวัติเป็นเบาหวานมา 10 ปี',
  /* — Skin / Allergy — */
  'ผู้ป่วยมีอาการผื่นคันทั่วตัว สงสัยแพ้ยา หลังรับประทานยาแก้ปวดเมื่อเช้านี้',
  'ผู้ป่วยมีอาการผื่นแดงคันบริเวณแขนทั้งสองข้าง เป็นมา 3 วัน ไม่ทราบสาเหตุชัดเจน',
  /* — Genitourinary — */
  'ผู้ป่วยมีอาการปัสสาวะแสบขัด ปัสสาวะบ่อย สีขุ่น เป็นมา 2 วัน',
  'ผู้ป่วยมีอาการปัสสาวะเป็นเลือด ปวดหลังด้านขวา เป็นมา 1 วัน',
  /* — Endocrine / Metabolic — */
  'ผู้ป่วยมีอาการน้ำหนักลดผิดปกติ กระหายน้ำ ปัสสาวะบ่อย เป็นมา 1 เดือน',
  /* — Eye / ENT — */
  'ผู้ป่วยมีอาการตามัวข้างขวา มองภาพไม่ชัด เป็นมา 2 วัน ไม่มีอาการปวดตา',
  'ผู้ป่วยมีน้ำมูก คัดจมูก จาม เป็นมา 3 วัน ไม่มีไข้',
];

/* Physical Examination (ตรวจร่างกาย) — narrative sentences clinicians
   type into the Step 3 doctor column's "ตรวจร่างกาย" field. Each entry
   blends a head-to-toe finding (general appearance · HEENT · chest ·
   abdomen · neuro · skin · MS) so that any 3-character lead (ผู้ป่วย /
   ฟัง / คลำ / เคาะ / ตรวจ / ผิว / ขา / ข้อ …) surfaces a usable match. */
export const PHYSICAL_EXAM_SUGGESTIONS = [
  /* — General appearance / Vital — */
  'ผู้ป่วยรู้สึกตัวดี พูดคุยรู้เรื่อง ไม่มีอาการหายใจลำบาก',
  'ผู้ป่วยดูซีดเล็กน้อย ไม่มี jaundice ไม่มี cyanosis',
  'ผู้ป่วยรู้สึกตัวดี หายใจสะดวก สัญญาณชีพปกติ',
  /* — HEENT — */
  'ตรวจ HEENT: คอหอยไม่แดง ต่อมทอนซิลไม่โต ต่อมน้ำเหลืองที่คอไม่โต',
  'ตรวจตา: conjunctiva ไม่ซีด sclera ไม่เหลือง pupil 3 mm RTL ทั้งสองข้าง',
  'ตรวจหู: ear canal สะอาด tympanic membrane ปกติ ไม่บวมแดง',
  'ตรวจจมูก: nasal mucosa ปกติ ไม่มี discharge ไม่มี polyp',
  'ตรวจช่องปาก: ไม่พบ ulcer ฟันและเหงือกปกติ ลิ้นไม่มี coating ผิดปกติ',
  /* — Neck / Lymph — */
  'คอ: ต่อมไทรอยด์ไม่โต ไม่มี mass ไม่พบ JVP สูง',
  'ต่อมน้ำเหลืองคอ รักแร้ ขาหนีบ ไม่โต ไม่กดเจ็บ',
  /* — Chest / Lung — */
  'ฟังปอด: vesicular breath sound ทั้งสองข้าง ไม่ได้ยินเสียง wheezing / rhonchi / crepitation',
  'ฟังปอด: ได้ยินเสียง crepitation บริเวณ lower lung field ทั้งสองข้าง',
  'ฟังปอด: ได้ยินเสียง wheezing ทั้งสองข้าง expiration phase ยาวขึ้น',
  /* — Heart / CV — */
  'ฟังหัวใจ: rate และ rhythm สม่ำเสมอ ไม่ได้ยิน murmur / gallop',
  'ฟังหัวใจ: ได้ยิน systolic murmur grade 2/6 บริเวณ apex',
  'ตรวจขา: ไม่มี pitting edema คลำชีพจรปลายเท้าได้ปกติทั้งสองข้าง',
  /* — Abdomen — */
  'ตรวจช่องท้อง: นิ่ม ไม่กดเจ็บ ไม่พบ mass ไม่พบ hepatosplenomegaly',
  'ตรวจช่องท้อง: นิ่ม กดเจ็บบริเวณท้องน้อยด้านขวา ไม่พบ rebound tenderness',
  'ฟังเสียง bowel sound: ปกติ',
  'เคาะท้อง: ไม่พบ shifting dullness',
  /* — Neuro — */
  'ตรวจระบบประสาท: cranial nerves I-XII ปกติ motor power grade V ทั้งสี่ระยาง',
  'ตรวจระบบประสาท: ไม่พบ neurological deficit reflex สมมาตรทั้งสองข้าง',
  'ตรวจระบบประสาท: motor power แขนขาข้างซ้ายลดลง grade IV reflex เพิ่มขึ้น',
  /* — Skin — */
  'ตรวจผิวหนัง: ไม่พบผื่น ไม่พบ rash ผิวหนังปกติ',
  'ตรวจผิวหนัง: พบผื่นแดงคันบริเวณแขนทั้งสองข้าง ขนาดประมาณ 1-2 cm',
  /* — MS / Joints / Spine — */
  'ตรวจกล้ามเนื้อและข้อ: ไม่พบข้อบวม ไม่กดเจ็บ การเคลื่อนไหวปกติ',
  'ตรวจหลัง: paraspinal muscle เกร็ง กดเจ็บบริเวณ L4-L5 ไม่มี neurological deficit',
  'ตรวจข้อเข่า: บวมเล็กน้อยทั้งสองข้าง กดเจ็บ range of motion ลดลง',
  /* — Others / closing summary — */
  'ตรวจร่างกายอื่นๆ ไม่พบความผิดปกติ',
];

/* Care order catalogue — Figma "คำสั่งการพยาบาล…" row. Each chip pairs
   Thai shorthand with an English clinical label so nurses can scan
   quickly while still seeing the canonical drug / item name. */
const CARE_ORDERS = [
  { key: 'paracetamol', th: 'ยาแก้ปวด 500 mg',      en: 'Paracetamol'      },
  { key: 'dressing',    th: 'ชุดล้างแผล',            en: 'Wound dressing set' },
  { key: 'changewound', th: 'เปลี่ยนผ้าปิดแผล',     en: 'Change dressing'  },
  { key: 'bed',         th: 'รับผู้ป่วยเข้าเตียงสังเกตการณ์', en: 'Admit to observation bed' },
  { key: 'others',      th: 'อื่นๆ',                  en: 'Others'           },
];

/* Common nursing-order phrases for the "อื่นๆ" free-text panel. */
const OTHERS_CARE_ORDER_SUGGESTIONS = [
  'ให้ยาแก้แพ้ก่อนรับยาหลัก',
  'เฝ้าระวังสัญญาณชีพทุก 15 นาที',
  'เฝ้าระวังสัญญาณชีพทุก 30 นาที',
  'ให้น้ำเกลือแร่ตามแพทย์สั่ง',
  'ประคบเย็นบริเวณที่ปวด',
  'ประคบร้อนบริเวณที่ปวด',
  'ให้งดน้ำงดอาหารก่อนตรวจ',
  'แจ้งแพทย์เมื่อมีไข้สูงกว่า 38.5°C',
  'วัดอุณหภูมิทุก 4 ชั่วโมง',
  'บันทึกปัสสาวะทุกครั้ง',
];

/* Material Symbols — pain row only (Figma 294:47891 uses outline style,
   not filled). `'FILL' 0` renders outlined glyphs on the Outlined font. */
const Sym = ({ name, size = 20 }) => (
  <span
    className='material-symbols-outlined'
    aria-hidden
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      lineHeight: 1,
      width: size,
      height: size,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
    }}
  >
    {name}
  </span>
);

const SymptomStep = ({ onValidityChange, patient = {} }) => {
  /* All defaults are empty / unselected so step 2 lands in the
     Figma 294:47891 empty-state on first entry — chief complaint,
     duration, present illness textareas blank; pain / triage / orders /
     cert chip rows show every option idle. The user fills in values
     before the footer's "ถัดไป" can advance to step 3. */
  const [complaint, setComplaint] = useState('');
  const [duration, setDuration] = useState('');
  const [presentIllness, setPresentIllness] = useState('');
  const [pain, setPain] = useState(null);
  const [triage, setTriage] = useState(null);
  const [orders, setOrders] = useState({});
  const [cert, setCert] = useState(null);
  const [admitOpen, setAdmitOpen] = useState(false);
  const [selectedBedId, setSelectedBedId] = useState(null);
  /* "อื่นๆ" (Others) care order — Figma 329:51905 reveals a free-text
     textarea below the chip row once selected so the nurse can spell
     out the bespoke order. Kept independent of `orders.others` so the
     note isn't lost if the chip is briefly toggled off then back on. */
  const [othersNote, setOthersNote] = useState('');

  /* Validity contract — the footer's "ถัดไป" button is gated on this.
     A step is valid only when every required field per Figma 329:51905
     is filled:
       • 3 textareas (chief complaint, duration, present illness)
       • Pain level chosen
       • Triage level chosen
       • At least one care order picked
       • Doctor's note (ต้องการ / ไม่ต้องการ) chosen
       • If "อื่นๆ" care order is active → its free-text detail filled
     Each anyCareOrder / care-order chip click drives the same gate so
     un-clicking the last selection re-disables Next, keeping the
     UX honest about which fields the clinician owes. */
  const anyCareOrder = Object.values(orders).some(Boolean);
  const valid =
    complaint.trim() !== '' &&
    duration.trim() !== '' &&
    presentIllness.trim() !== '' &&
    pain !== null &&
    triage !== null &&
    anyCareOrder &&
    cert !== null &&
    (!orders.others || othersNote.trim() !== '');

  useEffect(() => {
    if (typeof onValidityChange === 'function') onValidityChange(valid);
  }, [valid, onValidityChange]);

  /* ส่งค่าที่กรอกให้ step "ตรวจสอบข้อมูล" อ่านต่อ */
  useEffect(() => {
    setScreeningSection(patient.hn, 'symptom', {
      complaint,
      duration,
      presentIllness,
      pain,
      triage,
      cert,
      orders: CARE_ORDERS.filter((o) => orders[o.key]).map((o) => o.th),
      othersNote: orders.others ? othersNote : '',
      bedId: selectedBedId,
    });
  }, [patient.hn, complaint, duration, presentIllness, pain, triage, cert, orders, othersNote, selectedBedId]);

  const toggleOrder = (k) => setOrders((o) => ({ ...o, [k]: !o[k] }));

  const onCareOrderClick = (k) => {
    if (k === 'bed') {
      /* กดแล้วเปิดป๊อปอัป "ลงทะเบียนรับผู้ป่วยเข้าเตียงสังเกตอาการ" ตัวเดียวกับ
         หน้าคิวสังเกตอาการ (มติผู้ใช้ 28 ส.ค. 69) — ส่ง HN ไปด้วย ป๊อปอัปจึงซ่อน
         ช่องค้นหาผู้ป่วยเอง เพราะหน้านี้รู้อยู่แล้วว่ากำลังคัดกรองใคร
         เปิดซ้ำได้แม้เลือกเตียงไปแล้ว เพื่อให้เปลี่ยนเตียงได้โดยชิปไม่ toggle ปิด */
      setAdmitOpen(true);
      return;
    }
    toggleOrder(k);
  };

  return (
    <section className='bg-surface-card rounded-b-card p-6 flex flex-col gap-6'>
      {/* ระยะระหว่างกล่องกรอกอาการ 24px เท่าแนวนอน (มติผู้ใช้ 28 ส.ค. 69) */}
      <div className='flex flex-col gap-6'>
        <div className='flex items-start gap-6 w-full'>
          <SymptomField label='อาการ (Chief Complaint)' required>
            <SuggestibleTextarea
              voice
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder='เช่น ปวดหลังช่วงล่างมาก ในเวลาที่ก้ม'
              suggestions={CHIEF_COMPLAINT_SUGGESTIONS}
              minChars={3}
              popoverAriaLabel='คำแนะนำอาการ'
            />
          </SymptomField>
          <SymptomField label='ระยะเวลาที่มีอาการ' required>
            <SuggestibleTextarea
              voice
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder='เช่น 1 สัปดาห์'
              suggestions={DURATION_SUGGESTIONS}
              minChars={1}
              popoverAriaLabel='คำแนะนำระยะเวลา'
            />
          </SymptomField>
        </div>
        {/* กว้างเท่า "อาการ (Chief Complaint)" ด้านบน (มติผู้ใช้ 28 ส.ค. 69) —
            เดิมกินเต็มความกว้าง กล่องสามใบเลยไม่เข้าคอลัมน์เดียวกัน
            ใช้แถวเดียวกับข้างบน แล้วเว้นคอลัมน์ขวาไว้ให้ความกว้างตรงกันพอดี */}
        <div className='flex items-start gap-6 w-full'>
        <SymptomField label='ประวัติปัจจุบัน (Present Illness)' required>
          <SuggestibleTextarea
            voice
            value={presentIllness}
            onChange={(e) => setPresentIllness(e.target.value)}
            placeholder='เช่น ผู้ป่วยมีอาการปวดหลังช่วงเอวมาประมาณ 1 สัปดาห์ ปวดมากขึ้นเมื่อก้มตัวหรือยกของหนัก ไม่มีอาการชาขาหรือควบคุมการขับถ่ายผิดปกติ'
            suggestions={PRESENT_ILLNESS_SUGGESTIONS}
            minChars={3}
            popoverAriaLabel='คำแนะนำประวัติปัจจุบัน'
          />
        </SymptomField>
          <div className='flex-1 min-w-0' aria-hidden />
        </div>
      </div>

      {/* Pain level (ระดับความเจ็บปวด) — Figma 160:26321..26326.
          Each card pairs a 36×36 tone-tinted circle (Material Symbols
          `sentiment_*` icon) with a Thai label. Selected variant flips
          to 2px brand-tertiary border; only one is selected at a time
          (radio-style). */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='frown'>ระดับความเจ็บปวด</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {PAIN_LEVELS.map((p) => {
            const active = pain === p.key;
            const tone = PAIN_TONE_TOKENS[p.tone];
            return (
              <SelectableCardButton
                key={p.key}
                selected={active}
                onClick={() => setPain(p.key)}
                ariaLabel={p.label}
              >
                <span
                  aria-hidden
                  className='inline-flex items-center justify-center shrink-0'
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--dim-radius-full, 9999px)',
                    background: tone.bg,
                    color: tone.fg,
                  }}
                >
                  <Sym name={p.icon} size={20} />
                </span>
                {p.label}
              </SelectableCardButton>
            );
          })}
        </div>
      </div>

      {/* Triage (ความเร่งด่วน) — Figma "Level N" card. Two-line layout:
          coloured Level badge on the top-left, then Thai + English label
          underneath. ESI 1-5 colour scale comes from the triage
          surface/text tokens, identical across all PHCIS modules. */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='fast-forward'>ความเร่งด่วน</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {TRIAGE_LEVELS.map((lv) => {
            const active = triage === lv.lv;
            return (
              <SelectableCardButton
                key={lv.lv}
                selected={active}
                onClick={() => setTriage(lv.lv)}
                ariaLabel={`ระดับ ${lv.lv} ${lv.en} ${lv.th}`}
                minHeight={64}
                padX='var(--dim-space-300, 12px)'
              >
                <span className='flex flex-col items-start' style={{ gap: 'var(--dim-space-050)' }}>
                  <span
                    className='inline-flex items-center whitespace-nowrap'
                    style={{
                      height: 20,
                      paddingLeft: 'var(--dim-space-200, 8px)',
                      paddingRight: 'var(--dim-space-200, 8px)',
                      borderRadius: 'var(--dim-radius-full, 9999px)',
                      backgroundColor: lv.bg,
                      color: lv.fg,
                      fontSize: 11,
                      fontWeight: 600,
                      lineHeight: 1,
                    }}
                  >
                    Level {lv.lv}
                  </span>
                  <span
                    className='whitespace-nowrap'
                    style={{
                      color: 'var(--text-content-default, #363B3F)',
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    {lv.en} / {lv.th}
                  </span>
                </span>
              </SelectableCardButton>
            );
          })}
        </div>
      </div>

      {/* Care orders (คำสั่งการพยาบาลและการสังเกตอาการ) — Figma 160:26393+.
          Two-line: Thai shorthand (label1) over English clinical name
          (caption1/quaternary). Multi-select chips (`orders[k]` is a
          boolean map). Same border treatment as pain/triage so the
          three rows read as one button family. Patient bed (เตียงผู้ป่วย)
          shows a green ColorfulBadge with the chosen bed ordinal once a
          bed is confirmed — Figma 163:34956 ("เตียงที่ N"). */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='clipboard-list'>คำสั่งการพยาบาลและการสังเกตอาการ</TopicHeader>
        <div className='flex items-center gap-3 flex-wrap'>
          {CARE_ORDERS.map((o) => {
            const active = !!orders[o.key];
            const bedChipLabel =
              o.key === 'bed' && active && selectedBedId
                ? formatThaiBedChipLabel(selectedBedId)
                : '';
            const ariaCare = bedChipLabel
              ? `${o.en} ${o.th} ${bedChipLabel}`
              : `${o.en} ${o.th}`;
            const labelStack = (
              <span className='flex flex-col items-start' style={{ gap: 'var(--dim-space-050)' }}>
                <span
                  className='whitespace-nowrap'
                  style={{
                    color: 'var(--text-content-default, #363B3F)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    fontWeight: 'var(--type-weight-medium, 500)',
                  }}
                >
                  {o.th}
                </span>
                <span
                  className='whitespace-nowrap'
                  style={{
                    color: 'var(--text-content-quaternary, #ADB2B7)',
                    fontSize: 'var(--type-size-xs, 12px)',
                    fontWeight: 'var(--type-weight-regular, 400)',
                  }}
                >
                  {o.en}
                </span>
              </span>
            );
            return (
              <SelectableCardButton
                key={o.key}
                selected={active}
                onClick={() => onCareOrderClick(o.key)}
                ariaLabel={ariaCare}
                minHeight={56}
              >
                {bedChipLabel ? (
                  <span className='inline-flex items-center gap-2 min-w-0'>
                    {labelStack}
                    <ColorfulBadge
                      style='green'
                      size='small'
                      hierarchy='secondary'
                      showDot={false}
                      className='shrink-0'
                    >
                      {bedChipLabel}
                    </ColorfulBadge>
                  </span>
                ) : (
                  labelStack
                )}
              </SelectableCardButton>
            );
          })}
        </div>

        {/* "อื่นๆ" follow-up textarea — Figma 329:51905. Appears below the
            chip row only when the Others chip is active; lets the nurse
            describe the bespoke care order in free text. Required so the
            bespoke entry can't be left blank once the chip is toggled on.

            Per Figma the field sits inside a brand-tinted panel
            (background/screen/brand-100 → --brand-p50) so it visually
            stands out from the surrounding white card. Both surface +
            border use brand-aliased tokens — flipping <html data-brand>
            retints the panel automatically across all brand modes. */}
        {orders.others && (
          <div
            className='w-full flex flex-col'
            style={{
              gap: 'var(--dim-space-300, 12px)',
              padding: 'var(--dim-space-400, 16px)',
              background: 'var(--background-screen-brand-100, var(--surface-brandPrimary-quaternary, #F4FBF8))',
              borderRadius: 'var(--dim-radius-400, 12px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            }}
          >
            <SymptomField label='รายละเอียดคำสั่งอื่นๆ' required>
              <SuggestibleTextarea
                voice
                value={othersNote}
                onChange={(e) => setOthersNote(e.target.value)}
                placeholder='ระบุรายละเอียดคำสั่งการพยาบาลเพิ่มเติม เช่น ให้ยาแก้แพ้ก่อน, เฝ้าระวังสัญญาณชีพทุก 15 นาที'
                suggestions={OTHERS_CARE_ORDER_SUGGESTIONS}
                minChars={3}
                popoverAriaLabel='คำแนะนำคำสั่งการพยาบาล'
              />
            </SymptomField>
          </div>
        )}
      </div>

      <ObservationAdmitPopup
        open={admitOpen}
        onClose={() => setAdmitOpen(false)}
        patientHn={patient.hn}
        chiefComplaint={complaint}
        chiefComplaintSuggestions={CHIEF_COMPLAINT_SUGGESTIONS}
        onSubmit={(f) => {
          setAdmitOpen(false);
          setSelectedBedId(f.bedId);
          setOrders((o) => ({ ...o, bed: true }));
          /* สั่งเตียง = ส่งผู้ป่วยเข้าระบบสังเกตอาการ — เปิดคิวสังเกตอาการใน
             แท็บใหม่ เพื่อให้พยาบาลรับเคสต่อได้ทันทีโดยไม่ทิ้งแบบคัดกรอง
             ที่ยังกรอกค้างอยู่ในแท็บเดิม (เรียกจากปุ่มยืนยันของ popup จึง
             ไม่โดน popup blocker) */
          if (typeof window !== 'undefined' && f.bedId) {
            window.open(`/observation?bed=${encodeURIComponent(f.bedId)}`, '_blank', 'noopener,noreferrer');
          }
        }}
      />

      {/* Doctor's note (ใบรับรองแพทย์) — Figma 160:26432. Same chrome
          as pain/triage/orders but single-line, no icon. ต้องการ /
          ไม่ต้องการ are mutually exclusive (radio-style). */}
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='file-text'>ใบรับรองแพทย์</TopicHeader>
        <div className='flex items-center gap-3'>
          {[
            { key: 'want', label: 'ต้องการ' },
            { key: 'no',   label: 'ไม่ต้องการ' },
          ].map((opt) => (
            <SelectableCardButton
              key={opt.key}
              selected={cert === opt.key}
              onClick={() => setCert(opt.key)}
              ariaLabel={opt.label}
            >
              {opt.label}
            </SelectableCardButton>
          ))}
        </div>
      </div>

    </section>
  );
};

/* Step bodies — steps 1/4/5 are OPD sibling wrappers (ScreeningStep1/4/5)
   that add TOR 1.2.2.3/1.2.2.4/1.2.2.6/1.2.3.4 on top of the shared DS
   forms without touching them (playbook §4 + "ห้ามรื้อ" note). */
const STEP_COMPONENTS = [
  ScreeningStep1,
  SymptomStep,
  ScreeningStep3,
  ScreeningStep4,
  ScreeningStepDoctor,
  ScreeningStep5,
];

/* จุดคัดกรองเหลือแห่งเดียว (ของศูนย์) — การคัดกรองที่บ้านย้ายไปอยู่ในบันทึก
   การเยี่ยมบ้านทั้งชุดแล้ว (มติผู้ใช้ 30 ส.ค. 69) หน้านี้จึงมีลำดับขั้นชุดเดียว */

/* ปลายทางจากป๊อปอัปส่งต่อเป็น "ชื่อแผนก" ส่วนคิวรวมรอรับเคสพูดภาษา "คลินิก"
   ตามเมนู จับคู่ด้วยชื่อที่ตรงกันก่อน แล้วค่อยจับคำที่ซ้อนกัน ถ้าไม่เข้าเลยให้
   ลงคลินิกตรวจรักษาซึ่งเป็นปลายทางกลางของศูนย์ — ดีกว่าปล่อยเคสค้างไร้คลินิก */
const clinicKeyForDepartment = (departmentLabel = '') => {
  const label = String(departmentLabel).trim();
  if (!label) return 'opd-treat';
  const exact = TREAT_CLINICS.find((c) => c.label === label);
  if (exact) return exact.key;
  const loose = TREAT_CLINICS.find((c) => {
    const bare = c.label.replace(/^คลินิก/, '');
    return label.includes(bare) || bare.includes(label);
  });
  return loose?.key ?? 'opd-treat';
};

/* Vitals ที่พยาบาลวัดไว้ ส่งไปแสดงในคิวรวมด้วย — แพทย์ใช้ตัดสินว่าจะหยิบเคสไหน
   ก่อน ถ้าไม่มีค่าให้ปล่อยขีดไว้ ไม่ต้องเดา */
const vitalsFromReview = (review = {}) => {
  const v = review.vitals || {};
  const bp = v.pressureSys && v.pressureDia ? `${v.pressureSys}/${v.pressureDia}` : '—';
  return { bp, pr: v.pulse || '—', spo2: v.oxygen ? `${v.oxygen}%` : '—' };
};

const ScreeningPage = () => {
  const [current, setCurrent] = useState(0);
  /* Step-content slide animation (forward / backward). Shared with
     FormShell so the OPD Screening flow matches Registration's UX. */
  const stepDirection = useStepDirection(current);
  /* Look up the selected patient from QueuePage's <Link state={...}>.
     Fall back to the default profile so direct visits don't render empty. */
  const { state: navState } = useLocation();
  const history = useHistory();
  const patient =
    (navState && (getPatientByHN(navState.hn) || getPatientByShortName(navState.name))) ||
    DEFAULT_PATIENT;

  /* ประวัติแพ้ยา/โรคประจำตัวของทะเบียนกลาง — หัวแฟ้มคัดกรองต้องเห็นชุดเดียวกับ
     ห้องตรวจและห้องยา */
  const mrPatient = findMrPatientByHn(patient?.hn) || {};
  /* ⚠️ ต้องประกาศก่อน `nextStepLabel` — ป้ายปุ่มถัดไปอ่าน `isLast` (const เป็น TDZ
     ถ้าอ่านก่อนประกาศจะพังทั้งหน้า) */
  const steps = STEPS;
  const stepComponents = STEP_COMPONENTS;
  /* ขั้นที่วางการ์ดของตัวเองมาแล้ว จึงไม่ต้องการการ์ดครอบจาก fieldset */
  const stepHasOwnCards = steps[current] === 'เลือกคลินิกและแพทย์'
    || steps[current] === 'ตรวจสอบข้อมูล';
  const StepBody = stepComponents[current];
  const isLast = current === steps.length - 1;

  /* TOR 1.2.1.3 → 1.2.1.4 — the last step completes the screening by
     forwarding the patient to a destination department, which is what
     PRODUCES the Walk-in Request row consumed by /opd/requests. */
  const nextStepLabel = isLast
    ? 'บันทึกและส่งต่อ'
    : `ถัดไป: ${steps[current + 1]}`;

  /* ป๊อปอัป "ยืนยันรับผู้ป่วย" อยู่ที่หน้าคิว (QueuePage) ก่อนมาถึงหน้านี้ —
     ถอดออก 27 ส.ค. 69 เพราะมองเป็นคลิกเปล่า และกลับมา 29 ส.ค. 69 เพราะต้องการ
     "เวลารับเข้า" ที่ประทับตอนกดยืนยัน (stampScreeningAccept) เป็นจุดเริ่มนับ
     เวลาต่อสถานีตาม TOR 1.2.3.4 หน้านี้จึงไม่ถามซ้ำ */

  /* ── TOR 1.2.2.2 — re-screen (คัดกรองซ้ำ) vs read-only ────────────────
     Opening a คัดกรองแล้ว row (QueuePage passes statusKey in Link state)
     offers อ่านอย่างเดียว vs คัดกรองซ้ำ. Re-screen creates round N+1;
     earlier rounds render in a read-only history strip. Round storage is
     append-only (opdScreeningDrafts round store). */
  /* Shared predicate with QueuePage's actionModeForOpdStatus — 'screened' AND
     'done' both mean the screening round is complete, so both must offer the
     อ่านอย่างเดียว / คัดกรองซ้ำ choice. Guarding on 'screened' alone dropped
     'done' rows straight into an editable flow with no round history and no
     re-screen record. */
  const alreadyScreened = isScreeningCompleted(navState?.statusKey);
  const [modeChoiceOpen, setModeChoiceOpen] = useState(false);
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const [rescreenActive, setRescreenActive] = useState(false);
  const [rounds, setRounds] = useState([]);
  const [staleAlertOpen, setStaleAlertOpen] = useState(false);
  const roundCountAtOpenRef = useRef(0);

  /* เดิมงานนี้ทำตอนกดยืนยันในป๊อปอัป — ตอนนี้ทำตอนเปิดหน้าแทน เพื่อให้เคสที่
     "คัดกรองแล้ว" ยังได้เลือกอ่านอย่างเดียว / คัดกรองซ้ำ เหมือนเดิม */
  useEffect(() => {
    if (alreadyScreened && patient.hn) {
      ensureSeedRound(patient.hn);
      const list = getScreeningRounds(patient.hn);
      setRounds(list);
      roundCountAtOpenRef.current = list.length;
      setModeChoiceOpen(true);
    }
    /* ครั้งเดียวตอนเปิดหน้า — ผู้ป่วยรายเดิมตลอดอายุหน้านี้ */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseReadOnly = () => {
    setModeChoiceOpen(false);
    setReadOnlyMode(true);
  };

  const chooseRescreen = () => {
    /* Concurrency/staleness — another tab may have appended a newer round
       since this record was opened. Detect and offer reload. */
    if (patient.hn && getScreeningRoundCount(patient.hn) !== roundCountAtOpenRef.current) {
      setModeChoiceOpen(false);
      setStaleAlertOpen(true);
      return;
    }
    setModeChoiceOpen(false);
    setRescreenActive(true);
  };

  const reloadRounds = () => {
    const list = getScreeningRounds(patient.hn);
    setRounds(list);
    roundCountAtOpenRef.current = list.length;
    setStaleAlertOpen(false);
    setModeChoiceOpen(true);
  };

  /* ── TOR 1.2.1.3 → 1.2.1.4 — ส่งต่อไปยังแผนก ──────────────────────────
     Completing the screening forwards the patient to a destination
     department. That creates the Walk-in Request row the department board
     (/opd/requests) works from, where staff assign a doctor slot and the
     exam queue number is issued. */
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardEsi, setForwardEsi] = useState('4');
  const [forwardDone, setForwardDone] = useState(null);

  const submitForward = (refer) => {
    if (!refer?.departmentLabel) return;
    const noteSuffix = refer.note ? ` · ${refer.note}` : '';
    const created = addWalkinRequest({
      hn: patient.hn,
      name: patient.shortName || navState?.name || patient.name,
      complaint: `ส่งต่อจากจุดคัดกรอง (คิว ${navState?.queue || '-'}) → ${refer.servicePointLabel}${noteSuffix}`,
      esi: Number(forwardEsi),
      dept: refer.departmentLabel,
      requestedBy: 'พว.กานดา ศรีวิไล',
    });
    /* ถ้าพยาบาลไม่ได้ระบุแพทย์ เคสต้องไปกองรวมให้แพทย์หยิบเอง — ทำที่นี่ที่เดียว
       เพราะเป็นจุดที่ "คัดกรองเสร็จ" จริง ไม่ใช่ตอนพิมพ์แต่ละตัวอักษรในฟอร์ม */
    const review = getScreeningReview(patient.hn) || {};
    const symptom = review.symptom || {};
    const chosenDoctor = review.doctor?.assignedDoctor ?? UNASSIGNED_DOCTOR;
    if (chosenDoctor === UNASSIGNED_DOCTOR) {
      addToUnassignedPool({
        hn: patient.hn,
        name: patient.shortName || navState?.name || patient.name,
        avatarUrl: patient.avatarUrl,
        /* คลินิกที่พยาบาลเลือกไว้ในขั้น "เลือกคลินิกและแพทย์" ชนะเสมอ — เป็นการ
           ระบุตรง ๆ ส่วน clinicKeyForDepartment เป็นการเดาจากชื่อแผนกปลายทาง
           ซึ่งใช้เฉพาะระเบียนเก่าที่คัดกรองก่อนจะมีขั้นนี้ */
        clinicKey: review.doctor?.assignedClinicKey
          || clinicKeyForDepartment(refer.departmentLabel),
        cc: symptom.complaint || refer.servicePointLabel,
        esi: Number(forwardEsi),
        vitals: vitalsFromReview(review),
        screenedBy: 'พว.กานดา ศรีวิไล',
        queue: navState?.queue,
      });
    }
    setForwardOpen(false);
    setForwardDone(created);
  };

  /* ── TOR 1.2.3.4 — per-station enter/leave stamps ─────────────────────
     Every step change closes the previous station entry and opens the next
     one in the sessionStorage store; ScreeningStep5 renders the audit
     table. Skipped in read-only mode (no service is being delivered). */
  const prevStepRef = useRef(null);
  useEffect(() => {
    if (readOnlyMode || !patient.hn) return;
    const provider = 'พว.กานดา ศรีวิไล';
    /* ชื่อสถานีต้องเป็นชื่อขั้นของผู้รับบริการรายนี้ (โฟลว์เยี่ยมบ้านมีชื่อขั้นที่ 4
       ต่างออกไป) ไม่ใช่ชื่อขั้นของโฟลว์ศูนย์เสมอ */
    const stationOf = (idx) => `จุดคัดกรอง — ${steps[idx]}`;
    if (prevStepRef.current !== null && prevStepRef.current !== current) {
      stampStationTime(patient.hn, stationOf(prevStepRef.current), provider); // close
    }
    if (prevStepRef.current !== current) {
      stampStationTime(patient.hn, stationOf(current), provider); // open
      prevStepRef.current = current;
    }
  }, [current, readOnlyMode, patient.hn]);

  const goNext = () => setCurrent((c) => Math.min(steps.length - 1, c + 1));
  const goPrev = () => setCurrent((c) => Math.max(0, c - 1));

  /* ── Dirty tracking + unsaved-changes guard ──────────────────
     We don't need every step's form to call setDirty(): a single bubbled
     `input` / `change` listener on the form wrapper catches every <input>,
     <textarea>, and <select> change anywhere in the tree. Click on tag
     pills / radio cards also fires `change` because they wrap a hidden
     input — or we mark dirty via the wrapper's `onClick` fallback when
     they don't.

     Two-layer state:
       • `dirtyStepsRef`  — mutable Set, source-of-truth for the
                            unsaved-changes guard (read synchronously
                            from callbacks, no re-render needed).
       • `dirtySteps`     — React state mirror, drives footer rendering.

     We track dirty *per step* (not a single global flag) so the footer
     can honour the spec precisely:
       • "บันทึกร่าง" appears as soon as ANY step has been touched
         (`dirtySteps.size > 0`). Once shown, it stays shown — hiding it
         again would yank a destination button out from under the user.
       • "ถัดไป: …" stays disabled until the CURRENT step has at least
         one edit (`dirtySteps.has(current)`). This is the closest proxy
         to "all required fields filled" we can express until per-step
         validation hooks land — a clinician must engage with the
         current step before being allowed to advance.

     `markDirty` is idempotent — if the current step is already marked,
     we early-out so per-keystroke handlers don't trigger pointless
     setState churn. It also gates on `event.isTrusted` so programmatic
     events (browser autofill, library dispatchEvent calls, React
     strict-mode artefacts) cannot flip the flag without a real user
     gesture — otherwise the footer's "ถัดไป" button would un-disable
     itself before the clinician has actually entered any data.       */
  const dirtyStepsRef = useRef(new Set());
  const [dirtySteps, setDirtySteps] = useState(() => new Set());
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const markDirty = useCallback((event) => {
    const native = event && (event.nativeEvent || event);
    if (native && native.isTrusted === false) return;
    if (dirtyStepsRef.current.has(current)) return;
    const next = new Set(dirtyStepsRef.current);
    next.add(current);
    dirtyStepsRef.current = next;
    setDirtySteps(next);
  }, [current]);
  const anyDirty = dirtySteps.size > 0;
  const currentStepDirty = dirtySteps.has(current);

  /* Per-step explicit validity — step components that implement a
     "required fields complete" check (VitalsForm is the first) report
     their result via the `onValidityChange` prop. Steps that haven't
     adopted the protocol leave their slot `undefined`, which the
     Next-button gate below treats as "fall back to dirty tracking".
     Setter is idempotent so repeated reports with the same boolean
     don't churn renders.                                              */
  const [stepValidities, setStepValidities] = useState({});
  const setStepValid = useCallback((stepIndex, valid) => {
    setStepValidities((prev) => (prev[stepIndex] === valid ? prev : { ...prev, [stepIndex]: valid }));
  }, []);
  const currentStepValid =
    stepValidities[current] !== undefined ? stepValidities[current] : currentStepDirty;

  /* StepProgress check mark — a step earns ✓ only when its `<Field
     required>` payload is satisfied. Steps that have adopted the
     `onValidityChange` protocol (Vitals, SymptomStep, allergy /
     disease history) provide the answer directly via `stepValidities`.
     Steps that haven't adopted it yet fall back to "complete after
     advance" semantics so the user still sees a green check once they
     move past, instead of an indefinite empty circle. */
  const completedSteps = steps.map((_, idx) => {
    const reported = stepValidities[idx];
    if (reported !== undefined) return reported;
    return idx < current;
  });

  const leaveScreen = useCallback(() => {
    /* `goBack` falls back to the OPD queue when there's no history entry
       (e.g. direct visit) so the user is never stuck. */
    if (history.length > 1) history.goBack();
    else history.push('/opd/queue');
  }, [history]);

  const handleBack = useCallback(() => {
    if (dirtyStepsRef.current.size > 0) {
      setUnsavedOpen(true);
      return;
    }
    leaveScreen();
  }, [leaveScreen]);

  /* Reset both the ref and state mirror — Set identity matters so the
     ref keeps a fresh instance (callers compare via `.size` / `.has`). */
  const clearDirty = useCallback(() => {
    dirtyStepsRef.current = new Set();
    setDirtySteps(new Set());
  }, []);

  const handleSaveDraftAndLeave = useCallback(() => {
    saveOpdScreeningDraft({
      hn: patient.hn,
      name: patient.shortName || navState?.name,
      queue: navState?.queue,
    });
    /* Re-screen — persist the new round (append-only) with its audit stamp
       so the round-history strip shows it on the next open (TOR 1.2.2.2). */
    if (rescreenActive && patient.hn) {
      appendScreeningRound(patient.hn, {
        by: 'พว.กานดา ศรีวิไล',
        summary: `คัดกรองซ้ำรอบที่ ${rounds.length + 1} — บันทึกร่างระหว่างดำเนินการ`,
      });
    }
    clearDirty();
    setUnsavedOpen(false);
    history.push('/opd/queue', { activeTab: 'progress', focusDrafts: true });
  }, [clearDirty, history, navState?.name, navState?.queue, patient.hn, patient.shortName, rescreenActive, rounds.length]);

  const handleDiscardAndLeave = useCallback(() => {
    clearDirty();
    setUnsavedOpen(false);
    leaveScreen();
  }, [clearDirty, leaveScreen]);

  /* QueueSubMenu — same Sub Menu B pattern as TreatmentFormPage /
     RegistrationFormPage. Buckets come from the shared OPD roster so
     counts match /opd/queue. */
  /* ปุ่มจัดการคิวในพาเนล (มติผู้ใช้ 28 ส.ค. 69) — roster กลางยังเป็นค่าคงที่
     ไม่มี store ที่เขียนได้ จึงเก็บผลของ พักคิว/ยกเลิกคิว เป็น state ของหน้านี้
     แบบเดียวกับพาเนลคิวของหน้าลงทะเบียน: `paused` แค่สลับปุ่ม ส่วนยกเลิกเอาแถวออก */
  const [queuePaused, setQueuePaused] = useState({});
  /* เรียกคิวไปแล้วคนไหนบ้าง — ปุ่มขึ้นสถานะ "เรียกแล้ว" แต่ยังกดซ้ำได้ */
  const [queueCalled, setQueueCalled] = useState({});
  const [queueCancelled, setQueueCancelled] = useState({});
  const [queueCancelCandidate, setQueueCancelCandidate] = useState(null);

  const queueBuckets = useMemo(() => {
    /* หมวด "คิวที่รออยู่" แสดงครบทุกคิว ไม่ตัดเหลือ 2 แถวแบบ preview —
       พาเนลเหลือหมวดเดียวและมี overflow-y อยู่แล้ว ลิสต์ยาวจึงเลื่อนได้ */
    const raw = buildOpdQueueSubMenuBuckets(
      OPD_QUEUE_ROWS.filter((r) => !queueCancelled[r.id]),
      { waiting: Infinity },
    );
    const map = (rows) => rows.map((r) => ({
      id: r.id,
      hn: r.hn,
      name: r.name,
      avatarUrl: r.avatarUrl,
      queue: r.queue,
      badge: r.vipBadge,
      statusKey: r.statusKey,
      /* หมวด "กำลังคัดกรอง" ต้องบอกว่าใครกำลังทำอยู่ — ไม่งั้นพยาบาลอีกคน
         ไม่รู้ว่าเคสนี้มีเจ้าของแล้ว แล้วไปหยิบซ้ำ (มติผู้ใช้ 30 ส.ค. 69)
         ชุดเดียวกับ "ลงทะเบียนโดย …" ของพาเนลเวชระเบียน */
      sublabel: r.screenedBy ? `คัดกรองโดย ${r.screenedBy}` : undefined,
    }));
    return {
      done: { items: map(raw.done.items), total: raw.done.total },
      draft: { items: map(raw.draft.items), total: raw.draft.total },
      inProgress: { items: map(raw.inProgress.items), total: raw.inProgress.total },
      waiting: { items: map(raw.waiting.items), total: raw.waiting.total },
    };
  }, [queueCancelled]);

  const goToPatientScreening = useCallback((p) => {
    history.push({
      pathname: '/opd/screening',
      state: { hn: p.hn, queue: p.queue, name: p.name, statusKey: p.statusKey },
    });
  }, [history]);

  return (
    <ClinicFilterProvider>
    {/* TOR 1.2.2.2 — อ่านอย่างเดียว vs คัดกรองซ้ำ on a screened record */}
    <AlertDialog
      open={modeChoiceOpen}
      onClose={chooseReadOnly}
      onCancel={chooseReadOnly}
      onConfirm={chooseRescreen}
      type='info'
      title='ผู้ป่วยรายนี้คัดกรองแล้ว'
      description={`มีประวัติการคัดกรอง ${rounds.length} รอบ — ต้องการเปิดอ่านอย่างเดียว หรือเริ่มคัดกรองซ้ำเป็นรอบที่ ${rounds.length + 1}?`}
      cancelLabel='อ่านอย่างเดียว'
      confirmLabel='คัดกรองซ้ำ (รอบใหม่)'
    />
    {/* Stale-round guard — record was re-opened in another tab */}
    <AlertDialog
      open={staleAlertOpen}
      onClose={() => setStaleAlertOpen(false)}
      onCancel={() => setStaleAlertOpen(false)}
      onConfirm={reloadRounds}
      type='warning'
      title='พบรอบคัดกรองใหม่กว่า'
      description='ระเบียนนี้ถูกเปิดคัดกรองซ้ำจากแท็บ/เครื่องอื่นหลังจากที่คุณเปิดหน้า — โหลดประวัติรอบล่าสุดก่อนเริ่มรอบใหม่'
      cancelLabel='ปิด'
      confirmLabel='โหลดรอบล่าสุด'
    />
    {/* TOR 1.2.1.3 → 1.2.1.4 — ส่งต่อภายใน (creates the walk-in request) */}
    <InternalReferPopup
      open={forwardOpen}
      onClose={() => setForwardOpen(false)}
      onConfirm={submitForward}
      fromDepartment='คัดกรองและซักประวัติ'
      title='ส่งต่อภายใน'
      subtitle={`${patient.shortName || navState?.name || ''} · คิว ${navState?.queue || '-'} — ระบบจะสร้างคำขอ Walk-in ให้แผนกปลายทาง`}
      primaryLabel='ส่งคำขอ'
      extra={(
        <Select
          label='ระดับความเร่งด่วน (ESI)'
          value={forwardEsi}
          onChange={setForwardEsi}
          options={[
            { value: '1', label: 'ESI 1 — วิกฤต ต้องช่วยชีวิตทันที' },
            { value: '2', label: 'ESI 2 — ฉุกเฉินเร่งด่วน' },
            { value: '3', label: 'ESI 3 — เร่งด่วน' },
            { value: '4', label: 'ESI 4 — กึ่งเร่งด่วน' },
            { value: '5', label: 'ESI 5 — ไม่เร่งด่วน' },
          ]}
        />
      )}
    />
    <AlertDialog
      open={!!forwardDone}
      onClose={() => setForwardDone(null)}
      onConfirm={() => {
        const dept = forwardDone?.dept;
        setForwardDone(null);
        clearDirty();
        history.push('/opd/requests', { dept });
      }}
      onCancel={() => { setForwardDone(null); clearDirty(); history.push('/opd/queue'); }}
      type='success'
      title='ส่งคำขอไปยังแผนกแล้ว'
      description={forwardDone
        ? `สร้างคำขอ ${forwardDone.requestQueue} ให้แผนก${forwardDone.dept} เวลา ${forwardDone.requestedAt} น. (ผู้บันทึก ${forwardDone.requestedBy}) — รอเจ้าหน้าที่แผนกให้ Slot แพทย์`
        : ''}
      cancelLabel='กลับหน้าคิว OPD'
      confirmLabel='ไปที่บอร์ดคำขอ Walk-in'
    />
    <UnsavedChangesPopup
      open={unsavedOpen}
      onClose={() => setUnsavedOpen(false)}
      onSave={handleSaveDraftAndLeave}
      onDiscard={handleDiscardAndLeave}
    />
    <div
      className='flex w-full min-h-screen'
      style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}
    >
      <Sidebar activeKey='opd' />
      {/* QueueSubMenu — Figma "Sub Menu B" (same as /treat/record). Sits
          between Sidebar and the screening form so nurses can jump to
          another queue patient without returning to /opd/queue first. */}
      <DeleteQueueConfirmPopup
        open={!!queueCancelCandidate}
        onClose={() => setQueueCancelCandidate(null)}
        onConfirm={() => {
          setQueueCancelled((s2) => ({ ...s2, [queueCancelCandidate.id]: true }));
          setQueueCancelCandidate(null);
        }}
        title='ยืนยันการยกเลิกคิว'
        subtitle='คิวนี้จะถูกนำออกจากรายการ และไม่สามารถย้อนกลับได้'
        queue={queueCancelCandidate?.queue}
        hn={queueCancelCandidate?.hn || '—'}
        patientName={queueCancelCandidate?.name || '—'}
      />
      <QueueSubMenu
        /* แถวเรียบคั่นด้วยเส้น ไม่ใช่การ์ดซ้อนการ์ด (มติผู้ใช้ 28 ส.ค. 69) —
           กรอบรอบทุกแถวในพาเนลแคบทำให้ดูเป็นกล่องเล็ก ๆ เรียงกันแทนที่จะเป็นคิว */
        rowVariant='divider'
        queue={queueBuckets}
        sectionLabels={OPD_QUEUE_SUBMENU_LABELS}
        /* เห็นแค่ "คิวที่รออยู่" พร้อมเลขคิวและปุ่มจัดการคิว · ไม่มีจุดสีนำหน้า
           และไม่มีปุ่ม "ดูทั้งหมด" แล้ว (มติผู้ใช้ 28 ส.ค. 69) — พาเนลเหลือ
           หมวดเดียว จุดสีจึงไม่ได้แยกอะไร และทางออกไปคิวเต็มอยู่ที่ rail อยู่แล้ว */
        /* สองหมวด: คิวที่รอ + คิวที่กำลังทำอยู่ (มติผู้ใช้ 29 ส.ค. 69) — เดิมเห็น
           แต่คิวที่รอ เจ้าหน้าที่จึงไม่รู้ว่าใครกำลังถูกให้บริการอยู่ ทั้งที่เป็นคน
           ที่ต้องรู้ก่อนจะเรียกคิวถัดไป · คำเรียกหมวดมาจาก sectionLabels ของแต่ละ
           โมดูล (ลงทะเบียน / คัดกรอง / ตรวจ) จึงใช้คำที่ถูกของงานนั้น */
        sections={['inProgress', 'waiting']}
        showQueueNo
        showDots={false}
        onPickPatient={goToPatientScreening}
        renderRowActions={(p, section, rowIdx) => (
          <QueueCallActions
            /* หมวดที่กำลังทำอยู่ → ปุ่มบอกสถานะจริง · หมวดที่รอ แถวแรกคือคิวที่
               กำลังถูกเรียก (มติผู้ใช้ 29 ส.ค. 69) */
            statusLabel={section === 'inProgress' ? 'กำลังคัดกรอง' : undefined}
            /* แถวที่กำลังทำอยู่แสดงเป็นป้าย ไม่ใช่ปุ่ม — ตรรกะเดียวกับเวชระเบียน
               ปุ่มที่อ่านเหมือนสถานะทำให้กดเรียกคิวซ้ำโดยไม่ตั้งใจ */
            statusAsBadge
            called={!!queueCalled[p.id] || (section === 'waiting' && rowIdx === 0)}
            paused={!!queuePaused[p.id]}
            onPause={() => setQueuePaused((s2) => ({ ...s2, [p.id]: !s2[p.id] }))}
            onCancel={() => setQueueCancelCandidate(p)}
            onCall={() => {
              setQueueCalled((s2) => ({ ...s2, [p.id]: true }));
              goToPatientScreening(p);
            }}
          />
        )}
      />
      <main className='flex-1 flex flex-col min-w-0'>
        {/* ส่ง breadcrumb เองแทนการพึ่ง default ของ <Header> (ซึ่งยังเป็น
           "ระบบงานผู้รับบริการนอก (OPD)" และเป็น default ของทั้งแอป) —
           ต้นทางต้องอ่านว่า "คัดกรอง" ให้ตรงกับชื่อเมนูและหน้าคิว */}
        <Header standalone={false} breadcrumb={['คัดกรอง', 'คัดกรองและซักประวัติ']} />
        <SubHeader title='คัดกรองและซักประวัติ' hideBottomBorder />
        {/* ไม่มีปุ่ม "ข้อมูลทางการแพทย์ (EMR)" บนหัวแฟ้มของหน้าคัดกรอง
            (มติผู้ใช้ 30 ส.ค. 69) · แถวแพ้ยา/โรคประจำตัวขึ้นเฉพาะเคสที่มีจริง
            รายการดึงจากทะเบียนกลางชุดเดียวกับห้องตรวจและห้องยา */}
        <PatientCard
          sticky
          patient={patient}
          embedded
          showMedicalHistory={false}
          drugAllergies={mrPatient.drugAllergies}
          chronicDiseases={mrPatient.chronicDiseases}
        />
        <RecordWizardMorphBand
          title='คัดกรองและซักประวัติ'
          hideTitle
          steps={steps}
          current={current}
          completedSteps={completedSteps}
          onStepClick={setCurrent}
          stickyTop={MORPH_STICKY_BELOW_PATIENT}
        />
        <div className='p-3 md:p-6 flex-1'>
          {/* Round-history strip (TOR 1.2.2.2) — read-only, append-only */}
          {(readOnlyMode || rescreenActive) && rounds.length > 0 && (
            <div
              className='flex flex-col'
              style={{
                gap: 'var(--dim-space-200)',
                marginBottom: 'var(--dim-space-300)',
                paddingTop: 'var(--dim-space-300)',
                paddingBottom: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-400)',
                paddingRight: 'var(--dim-space-400)',
                background: 'var(--surface-card-100, #FFFFFF)',
                borderRadius: 'var(--dim-radius-400, 12px)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
              }}
            >
              <span
                style={{
                  color: 'var(--text-content-default, #363B3F)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  fontWeight: 'var(--type-weight-bold)',
                }}
              >
                ประวัติรอบคัดกรอง ({rounds.length} รอบ)
                {rescreenActive && ` — กำลังคัดกรองรอบที่ ${rounds.length + 1}`}
              </span>
              {rounds.map((r) => (
                <span
                  key={r.round}
                  className='inline-flex items-center flex-wrap'
                  style={{
                    gap: 'var(--dim-space-200)',
                    color: 'var(--text-content-secondary, #636B72)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs)',
                  }}
                >
                  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{`รอบที่ ${r.round}`}</ColorfulBadge>
                  {r.at} น. · {r.by} · {r.summary || 'ไม่มีสรุป'}
                </span>
              ))}
            </div>
          )}

          {/* TOR 1.2.2.2 อ่านอย่างเดียว — a REAL <fieldset disabled> wrapper.
              `pointer-events: none` blocks the mouse but leaves every input in
              the tab order and fully editable from the keyboard, and
              `aria-disabled` on a container is advisory only (no browser
              honours it for descendant form controls). A disabled fieldset is
              the one mechanism that removes all descendants from the tab order
              AND blocks input everywhere; React 17 has no `inert`. The
              pointer-events/opacity pair stays for the visual cue and to stop
              non-form affordances (chips, step clicks) from reacting. */}
          {/* ขั้น "เลือกแพทย์" มีการ์ดของตัวเองสองใบอยู่แล้ว (รายชื่อแพทย์ +
              ช่วงเวลา) การ์ดขาวของ fieldset จึงกลายเป็นชั้นที่สามที่ไม่ได้ทำอะไร
              นอกจากวางพื้นขาวซ้อนพื้นขาว — ตัดออกเฉพาะขั้นนี้ ขั้นอื่นยังเป็น
              ฟอร์มยาวใบเดียวที่ต้องมีการ์ดครอบ (มติผู้ใช้ 28 ส.ค. 69) */}
          <fieldset
            disabled={readOnlyMode}
            className={stepHasOwnCards
              ? 'overflow-hidden'
              : 'bg-surface-card rounded-card shadow-card overflow-hidden'}
            style={{
              borderWidth: 0,
              borderStyle: 'none',
              paddingTop: 'var(--dim-space-0, 0px)',
              paddingRight: 'var(--dim-space-0, 0px)',
              paddingBottom: 'var(--dim-space-0, 0px)',
              paddingLeft: 'var(--dim-space-0, 0px)',
              marginTop: 'var(--dim-space-0, 0px)',
              marginRight: 'var(--dim-space-0, 0px)',
              marginBottom: 'var(--dim-space-0, 0px)',
              marginLeft: 'var(--dim-space-0, 0px)',
              minWidth: 0,
              ...(readOnlyMode ? { pointerEvents: 'none', opacity: 0.72 } : null),
            }}
            aria-disabled={readOnlyMode || undefined}
          >
            <div
              onKeyDown={markDirty}
              onPointerDown={(e) => {
                /* Chip-style selections (Pain / Triage / Care orders /
                   Cert in SymptomStep, RadioPill in history timeline)
                   expose `aria-pressed`. Stepper +/- buttons in
                   VitalCard / PressureCard expose `aria-label`
                   "decrement" / "increment" — they don't have
                   aria-pressed but they ARE the way clinicians dial
                   vitals up/down on mobile. Both should flip the
                   dirty flag; everything else (voice mic, graph
                   preview, etc.) stays invisible.                   */
                if (
                  e.target.closest(
                    '[aria-pressed], [aria-label="decrement"], [aria-label="increment"]',
                  )
                ) {
                  markDirty(e);
                }
              }}
            >
              {/* `key={current}` re-mounts the wrapper on each step change
                  so the shared keyframe re-fires (see stepTransition.js).
                  Forward / backward direction picks the slide axis. */}
              <div
                key={current}
                data-direction={stepDirection}
                className='mih-step-content'
              >
                {/* `onValidityChange` is the explicit "required complete"
                    protocol — VitalsForm wires it; steps that haven't
                    adopted it ignore the prop and the gate falls back to
                    dirty tracking (see `currentStepValid` above).      */}
                <StepBody
                  onValidityChange={(v) => setStepValid(current, v)}
                  patient={patient}
                  /* ขั้น "ตรวจสอบข้อมูล" ใช้กระโดดกลับไปแก้ที่ขั้นต้นทาง */
                  onJumpToStep={setCurrent}
                />
              </div>
            </div>
          </fieldset>
        </div>
        <Footer
          type='with BTN'
          sticky
          showAutoSave={current !== 0}
          autoSaveText='ร่างแบบฟอร์ม (บันทึกล่าสุด: 2 นาทีที่แล้ว)'
          showButton3
          button3Label={current === 0 ? 'ยกเลิก' : 'ย้อนกลับ'}
          onButton3Click={current === 0 ? handleBack : goPrev}
          /* "บันทึกร่าง" is ALWAYS visible so its location is discoverable
             and the footer doesn't reflow on first edit. We disable it
             instead until ANY step has been touched (`anyDirty`) —
             otherwise clicking it would persist a blank draft and create
             an empty row in the Queue page's draft section.            */
          showButton2
          button2Disabled={!anyDirty || readOnlyMode}
          button2Label='บันทึกร่าง'
          button2Icon='save'
          showButton1
          button1Label={nextStepLabel}
          /* Forward action — icon goes on the trailing side per Figma
             "Brand Button" (PHCIS frame 2745:104612 footer). Matches the
             pattern used by FormShell / TreatmentFormShell. */
          /* ลูกศรทั้งสองกรณี (มติผู้ใช้ 28 ส.ค. 69) — `move_down` สื่อว่าย้ายลง
             ไม่ใช่ส่งต่อ ทั้งที่ปุ่มคือ "บันทึกและส่งต่อ" */
          button1TrailingIcon='arrow_forward'
          /* Two-tier gate, in priority order:
               1. Steps that have adopted the explicit `onValidityChange`
                  protocol (VitalsForm, SymptomStep, HistoryListForm via
                  AllergyForm / DiseaseForm) — disabled until every required
                  field is satisfied (or "ไม่แพ้ยา…" on the allergy step).
               2. Steps that haven't — disabled until ANY edit
                  (`currentStepDirty`), the previous interaction proxy.
             `currentStepValid` collapses both into one boolean.
             Final "บันทึกข้อมูลผู้ป่วย" step still hard-disables (no step
             beyond).                                                  */
          /* On the last step the gate flips from "no step beyond" to the
             forward action: read-only records can't forward, everything
             else can (TOR 1.2.1.3 → 1.2.1.4). */
          button1Disabled={readOnlyMode || (!isLast && !currentStepValid)}
          onButton1Click={isLast ? () => setForwardOpen(true) : goNext}
          copyright='© 2026 ศูนย์การพยาบาลคุณภาพ ดินแดง กรุงเทพมหานคร'
        />
      </main>
    </div>
    </ClinicFilterProvider>
  );
};

export default ScreeningPage;
