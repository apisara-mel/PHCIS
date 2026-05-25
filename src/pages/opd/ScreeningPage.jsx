import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import PatientCard from '@/components/card/PatientCard';
import StepProgress from '@/components/step/StepProgress';
import { useStepDirection } from '@/components/step/stepTransition';
import VitalsForm from '@/components/forms/VitalsForm';
import AllergyForm from '@/components/forms/AllergyForm';
import ScreeningStep4 from '@/pages/opd/ScreeningStep4';
import FormsLibrary from '@/components/forms/FormsLibrary';
import Textarea from '@/components/forms/Textarea';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Icon from '@/components/icons/Icon';
import Footer from '@/components/layout/Footer';
import ScreeningConfirmPopup from '@/components/popup/ScreeningConfirmPopup';
import BedSelectionPopup from '@/components/popup/BedSelectionPopup';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { formatThaiBedChipLabel } from '@/data/mockPatientBeds';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import {
  DEFAULT_PATIENT,
  getPatientByHN,
  getPatientByShortName,
} from '@/data/patientProfiles';
import { saveOpdScreeningDraft } from '@/data/opdScreeningDrafts';

const STEPS = [
  'สัญญาณชีพ',
  'อาการป่วย',
  'ประวัติการแพ้ยา / สารเคมี',
  'ประวัติโรคประจำตัว',
  'แบบฟอร์ม',
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
const PAIN_LEVELS = [
  { key: 'none',   label: 'ไม่ปวด',   icon: 'sentiment_satisfied', tone: 'green'  },
  { key: 'mild',   label: 'เล็กน้อย', icon: 'sentiment_calm',           tone: 'blue'   },
  { key: 'mod',    label: 'ปานกลาง',  icon: 'sentiment_neutral',        tone: 'yellow' },
  { key: 'severe', label: 'มาก',      icon: 'sentiment_dissatisfied',   tone: 'orange' },
  { key: 'agony',  label: 'ทรมาน',    icon: 'sentiment_stressed',       tone: 'red'    },
];

/* Pain tone tokens — Figma alias mapping (each `surface-{tone}-quaternary`
   pairs with the corresponding `text-{tone}-default`). Fallback hexes
   mirror the Figma swatches verbatim so the colour resolves even before
   the semantic vars are registered in `index.css`:
     • brandPrimary → green   (#F4FBF8 / brand-p700 #007549)
     • info         → blue    (#F0F6FF / #2580EA)
     • progress     → yellow  (#FBFAF4 / #F0C03D)
     • warning      → orange  (#FFF9F0 / #F46928)
     • danger       → red     (#FFF0F0 / #C72121)                       */
const PAIN_TONE_TOKENS = {
  green:  {
    bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
    fg: 'var(--text-brandPrimary-default, #007549)',
  },
  blue:   {
    bg: 'var(--surface-info-quaternary, #F0F6FF)',
    fg: 'var(--text-info-default, #2580EA)',
  },
  yellow: {
    bg: 'var(--surface-progress-quaternary, #FBFAF4)',
    fg: 'var(--text-progress-default, #F0C03D)',
  },
  orange: {
    bg: 'var(--surface-warning-quaternary, #FFF9F0)',
    fg: 'var(--text-warning-default, #F46928)',
  },
  red:    {
    bg: 'var(--surface-danger-quaternary, #FFF0F0)',
    fg: 'var(--text-danger-default, #C72121)',
  },
};

/* Triage catalogue — Figma PHCIS-OPD "ความเร่งด่วน" row (5 levels).
   Each entry carries the colored "Level N" badge (top-left of the
   button) plus a bilingual label (Thai / English). Surface + text
   tokens flow through `--surface-triage-levelN` / `--text-triage-levelN`
   already declared in index.css so brand swaps retint correctly. */
const TRIAGE_LEVELS = [
  { lv: 1, en: 'Resuscitation', th: 'วิกฤต',       bg: 'var(--surface-triage-level1)', fg: 'var(--text-triage-level1)' },
  { lv: 2, en: 'Emergency',     th: 'ฉุกเฉิน',     bg: 'var(--surface-triage-level2)', fg: 'var(--text-triage-level2)' },
  { lv: 3, en: 'Urgent',        th: 'เร่งด่วน',    bg: 'var(--surface-triage-level3)', fg: 'var(--text-triage-level3)' },
  { lv: 4, en: 'Semi-urgent',   th: 'ไม่เร่งด่วน', bg: 'var(--surface-triage-level4)', fg: 'var(--text-triage-level4)' },
  { lv: 5, en: 'Non-urgent',    th: 'ทั่วไป',      bg: 'var(--surface-triage-level5)', fg: 'var(--text-triage-level5)' },
];

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
  { key: 'bed',         th: 'เตียงผู้ป่วย',           en: 'Patient bed'      },
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

/* Shared button shell used by all 4 button groups (Pain / Triage /
   Care Orders / Cert). Mirrors the canonical `RadioButton` chrome
   per MIH DS Foundation:
     • Default  → 1px `--border-neutralbutton-tertiary`, no shadow.
     • Hover    → 2px `--border-brandprimarybutton-tertiary` (#C5EDDA)
                  + Brand Drop Shadow Top/200 (Figma 2254:8437).
     • Selected → 2px `--border-brandprimarybutton-default` (#007549,
                  brand-p700) + Brand Drop Shadow Top/200
                  (Figma 2250:8270; we unify the elevation cue with
                  hover so engaged buttons read as one family).

   Stroke uses OUTSET box-shadow (spread only, 0 offset) instead of a
   real CSS border so the 1px ↔ 2px transition on hover/selected does
   not nudge sibling buttons AND does not leave the white "gap" the
   inset technique produced when the parent surface was also white.
   The same shadow stack carries the brand drop shadow as the second
   layer, so the card visibly lifts off the page.                    */
const SelectableCardButton = ({
  selected,
  onClick,
  ariaLabel,
  minHeight = 56,
  padX = 'var(--dim-space-400, 16px)',
  children,
}) => {
  const [hover, setHover] = useState(false);
  /* Selected wins over hover when both are true so the dark
     brand-p700 stroke remains visible while the cursor is still over
     the active button. */
  const state = selected ? 'selected' : hover ? 'hover' : 'default';

  let strokeShadow;
  if (state === 'selected') {
    strokeShadow =
      '0 0 0 var(--dim-stroke-200, 2px) var(--border-brandprimarybutton-default, #007549)';
  } else if (state === 'hover') {
    strokeShadow =
      '0 0 0 var(--dim-stroke-200, 2px) var(--border-brandprimarybutton-tertiary, #C5EDDA)';
  } else {
    strokeShadow =
      '0 0 0 var(--dim-stroke-100, 1px) var(--border-neutralbutton-tertiary, #E2E4E6)';
  }

  /* Drop shadow stack — `none` keyword on default so the shadow
     transition starts from a clean baseline. Hover + selected share
     the same Brand Drop Shadow Top/200 token. */
  const dropShadow =
    state === 'default'
      ? 'none'
      : 'var(--shadow-brand-top-200, 0px -1px 4px rgba(8, 167, 104, 0.08), 0px -1px 8px rgba(8, 167, 104, 0.10))';

  return (
    <button
      type='button'
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      aria-pressed={selected}
      aria-label={ariaLabel}
      className='inline-flex items-center'
      style={{
        minHeight,
        minWidth: 40,
        paddingLeft: padX,
        paddingRight: padX,
        paddingTop: 'var(--dim-space-200, 8px)',
        paddingBottom: 'var(--dim-space-200, 8px)',
        gap: 'var(--dim-space-200, 8px)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        background: 'var(--surface-neutralbutton-quinary, #FFFFFF)',
        border: 'none',
        boxShadow:
          dropShadow === 'none' ? strokeShadow : `${strokeShadow}, ${dropShadow}`,
        color: 'var(--text-content-default, #363B3F)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        lineHeight: 1.5,
        cursor: 'pointer',
        outline: 'none',
        userSelect: 'none',
        boxSizing: 'border-box',
        transition: 'background 120ms ease, box-shadow 120ms ease',
      }}
    >
      {children}
    </button>
  );
};

const SymptomStep = ({ onValidityChange }) => {
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
  const [bedPopupOpen, setBedPopupOpen] = useState(false);
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

  const toggleOrder = (k) => setOrders((o) => ({ ...o, [k]: !o[k] }));

  const onCareOrderClick = (k) => {
    if (k === 'bed') {
      /* Always open the bed picker first — including when a bed is
         already chosen — so the user can change bed without the chip
         toggling off on a second tap (Figma PHCIS | OPD flow). */
      setBedPopupOpen(true);
      return;
    }
    toggleOrder(k);
  };

  return (
    <section className='bg-white rounded-b-card p-6 flex flex-col gap-6'>
      <div className='flex flex-col gap-3'>
        <TopicHeader icon='smile'>อาการป่วย</TopicHeader>
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
        {/* "ประวัติปัจจุบัน (Present Illness)" — full-width textarea per
            Figma 294:47891, sits below the two half-width fields above. */}
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

      <BedSelectionPopup
        open={bedPopupOpen}
        onClose={() => setBedPopupOpen(false)}
        initialSelectedId={selectedBedId || 'bed04'}
        showClearOption={!!orders.bed}
        onClearBed={() => {
          setOrders((o) => ({ ...o, bed: false }));
          setSelectedBedId(null);
        }}
        onConfirm={(id) => {
          setSelectedBedId(id);
          setOrders((o) => ({ ...o, bed: true }));
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

const STEP_COMPONENTS = [
  VitalsForm,
  SymptomStep,
  AllergyForm,
  ScreeningStep4,
  FormsLibrary,
];

const ScreeningPage = () => {
  const [current, setCurrent] = useState(0);
  const StepBody = STEP_COMPONENTS[current];
  const isLast = current === STEPS.length - 1;
  /* Step-content slide animation (forward / backward). Shared with
     FormShell so the OPD Screening flow matches Registration's UX. */
  const stepDirection = useStepDirection(current);
  const nextStepLabel = isLast
    ? 'บันทึกข้อมูลผู้ป่วย'
    : `ถัดไป: ${STEPS[current + 1]}`;

  /* Look up the selected patient from QueuePage's <Link state={...}>.
     Fall back to the default profile so direct visits don't render empty. */
  const { state: navState } = useLocation();
  const history = useHistory();
  const patient =
    (navState && (getPatientByHN(navState.hn) || getPatientByShortName(navState.name))) ||
    DEFAULT_PATIENT;

  /* Entry confirmation (Figma PHCIS-ALL 2400:55040) — open on first mount,
     close on confirm, go back to the OPD queue on cancel/close/Esc. */
  const [confirmOpen, setConfirmOpen] = useState(true);
  const handleCancelEntry = () => {
    setConfirmOpen(false);
    history.push('/opd/queue');
  };

  const goNext = () => setCurrent((c) => Math.min(STEPS.length - 1, c + 1));
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
  const completedSteps = STEPS.map((_, idx) => {
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
    clearDirty();
    setUnsavedOpen(false);
    history.push('/opd/queue', { activeTab: 'progress', focusDrafts: true });
  }, [clearDirty, history, navState?.name, navState?.queue, patient.hn, patient.shortName]);

  const handleDiscardAndLeave = useCallback(() => {
    clearDirty();
    setUnsavedOpen(false);
    leaveScreen();
  }, [clearDirty, leaveScreen]);

  return (
    <ClinicFilterProvider>
    <ScreeningConfirmPopup
      open={confirmOpen}
      patient={patient}
      onConfirm={() => setConfirmOpen(false)}
      onCancel={handleCancelEntry}
    />
    <UnsavedChangesPopup
      open={unsavedOpen}
      onClose={() => setUnsavedOpen(false)}
      onSave={handleSaveDraftAndLeave}
      onDiscard={handleDiscardAndLeave}
    />
    <div className='min-h-screen w-full flex bg-brand-50'>
      <Sidebar activeKey='opd' />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header />
        <PatientCard sticky patient={patient} onBack={handleBack} />
        {/* User-gesture dirty proxy — scoped to the StepBody subtree
            so StepProgress's step-navigation buttons do NOT leak
            through and false-positive the dirty flag (which would
            enable the "ถัดไป" button before any real user input).

            We listen on `onKeyDown` and `onPointerDown` instead of
            `onInput` / `onChange` / `onClick` because:
              • `keydown` and `pointerdown` originate ONLY from real
                user input devices. They never fire from React mount,
                programmatic state updates, browser autofill, or
                `dispatchEvent` calls from third-party libraries.
              • `input` / `change` events, by contrast, are routinely
                dispatched by autofill engines and some controlled-
                input libraries on mount — which previously kept the
                footer's Next button enabled before the clinician had
                touched anything.

            For pointer presses we additionally require an ancestor
            with `aria-pressed` so only SelectableCardButton-style
            chips (Pain / Triage / Care orders / Cert) flip the flag.
            Voice mic, expand chevrons, etc. do NOT carry aria-pressed
            and therefore stay invisible to the dirty proxy.

            `markDirty` itself also checks `event.isTrusted` as a
            belt-and-braces guard against any future event source we
            haven't anticipated.                                     */}
        <div className='p-3 md:p-6 flex-1'>
          <div className='bg-white rounded-card shadow-card overflow-hidden'>
            <StepProgress
              framed
              steps={STEPS}
              current={current}
              completedSteps={completedSteps}
              onStepClick={setCurrent}
            />
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
                <StepBody onValidityChange={(v) => setStepValid(current, v)} />
              </div>
            </div>
          </div>
        </div>
        <Footer
          type='with BTN'
          sticky
          showAutoSave
          autoSaveText='ร่างแบบฟอร์ม (บันทึกล่าสุด: 2 นาทีที่แล้ว)'
          showButton3 button3Label='ยกเลิก'         onButton3Click={goPrev}
          /* "บันทึกร่าง" is ALWAYS visible so its location is discoverable
             and the footer doesn't reflow on first edit. We disable it
             instead until ANY step has been touched (`anyDirty`) —
             otherwise clicking it would persist a blank draft and create
             an empty row in the Queue page's draft section.            */
          showButton2
          button2Disabled={!anyDirty}
          button2Label='บันทึกร่าง'
          button2Icon='save'
          showButton1
          button1Label={nextStepLabel}
          /* Forward action — icon goes on the trailing side per Figma
             "Brand Button" (PHCIS frame 2745:104612 footer). Matches the
             pattern used by FormShell / TreatmentFormShell. */
          button1TrailingIcon={isLast ? 'check' : 'arrow_forward'}
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
          button1Disabled={isLast || !currentStepValid}
          onButton1Click={goNext}
          copyright='© 2026 ศูนย์การพยาบาลคุณภาพ ดินแดง กรุงเทพมหานคร'
        />
      </main>
    </div>
    </ClinicFilterProvider>
  );
};

export default ScreeningPage;
