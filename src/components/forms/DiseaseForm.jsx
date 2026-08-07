import React from 'react';
import HistoryListForm from '@/components/forms/HistoryListForm';
/* Figma PHCIS · OPD 339:59936 — empty + “ไม่มีโรคประจำตัว” panels use the same
   Lottie as `public/illustration/Doctor Prescription.json` (Vite alias import). */
import doctorPrescriptionAnim from '@/assets/illustrations/doctor-prescription.json';

/* MR column + demo rows — Figma PHCIS | OPD 162:19069 (left "ข้อมูลจากฝ่ายเวชระเบียน").
   Left rail shows **ระดับความรุนแรง** only (`showHistoryStatusBadge: false`);
   สถานะการรักษา is captured on the right. Optional `status` on each row still
   merges when copying to บันทึกประวัติใหม่. */
const DISEASE_HISTORY = [
  {
    name: 'หัวใจล้มเหลว (CHF)',
    nameValue: 'chf',
    detail: 'หายใจหอบ, บวมขา, เหนื่อยง่ายมาก, นอนราบไม่ได้',
    severity: 'critical',
    status: 'ongoing',
  },
  {
    name: 'โรคไตเรื้อรัง ระยะ 3–4 (CKD)',
    nameValue: 'ckd',
    detail: 'บวม, ปัสสาวะผิดปกติ, ความดันสูง, อ่อนเพลีย',
    severity: 'high',
    status: 'inTreatment',
  },
  {
    name: 'โรคหลอดเลือดสมอง (Stroke)',
    nameValue: 'stroke',
    detail: 'แขนขาอ่อนแรงครึ่งซีก, ปากเบี้ยว, พูดไม่ชัด',
    severity: 'critical',
    status: 'new',
  },
  {
    name: 'โรคเบาหวานชนิดที่ 2 (DM)',
    nameValue: 'dm',
    detail: 'กระหายน้ำ ปัสสาวะบ่อย, น้ำหนักลด, ชาปลายมือเท้า',
    severity: 'high',
    status: 'controlled',
  },
  {
    name: 'ความดันโลหิตสูง (HT)',
    nameValue: 'ht',
    detail: 'ปวดท้ายทอย, เวียนหัว',
    severity: 'medium',
    status: 'controlled',
  },
  {
    name: 'ไขมันในเลือดสูง (Dyslipidemia)',
    nameValue: 'lipid',
    detail: 'ไม่มีอาการเฉพาะ, ตรวจพบจากผลเลือดประจำปี',
    severity: 'medium',
    status: 'inactive',
  },
  {
    name: 'หอบหืด (Asthma)',
    nameValue: 'asthma',
    detail: 'หายใจมีเสียงหวีด, แน่นหน้าอกตอนกลางคืน, ไอเรื้อรัง',
    severity: 'medium',
    status: 'ongoing',
  },
  {
    name: 'โรคข้อเข่ารูมาตอยด์',
    nameValue: 'rh',
    detail: 'ข้อเข่าบวม, ปวดเรื้อรัง, ฝืดเช้า',
    severity: 'medium',
    status: 'inTreatment',
  },
  {
    name: 'โรคเกาต์',
    nameValue: 'gout',
    detail: 'ปวดบวมแดงร้อนที่นิ้วเท้า/ข้อเท้า กะทันหัน',
    severity: 'low',
    status: 'resolved',
  },
  {
    name: 'ไมเกรน (Migraine)',
    nameValue: 'migraine',
    detail: 'ปวดศีรษะข้างเดียวเป็นพัก ๆ, คลื่นไส้, ไวต่อแสงเสียง',
    severity: 'low',
    status: 'controlled',
  },
  {
    name: 'โรคลมชัก (Epilepsy)',
    nameValue: 'epilepsy',
    detail: 'ชักเกร็งกระตุก, หมดสติชั่วคราว, ต้องกินยากันชัก',
    severity: 'high',
    status: 'inTreatment',
  },
];

/** Shared with ส่งต่อภายนอก “โรคประจำตัว” dropdown — keep in sync with screening. */
export const DISEASE_OPTIONS = [
  { value: '',         label: 'เลือกโรค/อาการ' },
  { value: 'ht',       label: 'ความดันโลหิตสูง (HT)'      },
  { value: 'dm',       label: 'โรคเบาหวาน (DM)'           },
  { value: 'chf',      label: 'หัวใจล้มเหลว (CHF)'        },
  { value: 'ckd',      label: 'โรคไตเรื้อรัง ระยะ 3–4 (CKD)' },
  { value: 'stroke',   label: 'โรคหลอดเลือดสมอง (Stroke)' },
  { value: 'lipid',    label: 'ไขมันในเลือดสูง (Dyslipidemia)' },
  { value: 'asthma',   label: 'หอบหืด (Asthma)'           },
  { value: 'rh',       label: 'โรคข้อเข่ารูมาตอยด์'        },
  { value: 'gout',     label: 'โรคเกาต์'                  },
  { value: 'migraine', label: 'ไมเกรน (Migraine)'         },
  { value: 'epilepsy', label: 'โรคลมชัก (Epilepsy)'       },
];

/* Common Thai symptom phrases that clinicians type into the "อาการ"
   textarea on each chronic-disease record — Figma 162:24221 dropdown.
   HistoryListForm renders these as autocomplete suggestions after the
   user types ≥ `symptomSuggestMinChars` characters (3 by default).
   Matched substring is highlighted in brand color in the popover.

   Each phrase pairs presenting symptoms with the underlying chronic
   condition so a quick keyword (เบาหวาน / ไต / หัวใจ / หอบ / ความดัน /
   ชา / บวม) surfaces realistic clinical narratives. */
const DISEASE_SYMPTOM_SUGGESTIONS = [
  /* — Diabetes Mellitus — */
  'ผู้ป่วยมีอาการชาปลายมือเท้าทั้งสองข้าง น้ำหนักลด กระหายน้ำ ปัสสาวะบ่อย ควบคุมระดับน้ำตาลไม่ดี',
  'ผู้ป่วยมีแผลที่เท้าหายช้า มีน้ำเหลือง สงสัยภาวะแทรกซ้อนจากเบาหวาน',
  'ผู้ป่วยมีอาการมองภาพไม่ชัด ตาพร่ามัว ร่วมกับน้ำตาลในเลือดสูง',
  /* — Hypertension — */
  'ผู้ป่วยมีอาการปวดท้ายทอย เวียนศีรษะ ตรวจวัดความดันได้ 160/100 mmHg',
  'ผู้ป่วยปวดศีรษะ เลือดกำเดาไหล ความดันสูงควบคุมไม่ได้แม้รับประทานยาสม่ำเสมอ',
  /* — Chronic Kidney Disease — */
  'ผู้ป่วยมีอาการบวมที่ขาทั้งสองข้าง ปัสสาวะออกน้อยลง อ่อนเพลีย คลื่นไส้',
  'ผู้ป่วยมีอาการคันตามผิวหนัง เบื่ออาหาร เหนื่อยง่าย ค่า eGFR ลดลงต่อเนื่อง',
  /* — Heart Failure (CHF) — */
  'ผู้ป่วยมีอาการหายใจหอบ บวมขา เหนื่อยง่ายมาก นอนราบไม่ได้ ต้องนอนหนุนหมอนสูง',
  'ผู้ป่วยมีอาการไอตอนกลางคืน หายใจไม่อิ่ม ใจสั่น เป็นมาประมาณ 1 สัปดาห์',
  /* — Stroke — */
  'ผู้ป่วยมีอาการแขนขาอ่อนแรงครึ่งซีก ปากเบี้ยว พูดไม่ชัด เริ่มเป็นเมื่อ 2 ชั่วโมงก่อน',
  'ผู้ป่วยมีอาการชาครึ่งซีก ทรงตัวลำบาก กลืนน้ำลายลำบาก หลังจากเป็น stroke เมื่อ 6 เดือนก่อน',
  /* — Dyslipidemia — */
  'ผู้ป่วยไม่มีอาการเฉพาะเจาะจง ตรวจพบไขมันในเลือดสูงจากผลเลือดประจำปี',
  /* — Asthma — */
  'ผู้ป่วยมีอาการหายใจมีเสียงหวีด แน่นหน้าอกตอนกลางคืน ไอเรื้อรัง หอบเหนื่อยเมื่ออากาศเย็น',
  'ผู้ป่วยมีอาการหอบกำเริบ ใช้ยาพ่นมากกว่าปกติ ตื่นกลางดึกเพราะไอ',
  /* — Gout — */
  'ผู้ป่วยมีอาการปวดบวมแดงร้อนที่นิ้วเท้าหัวแม่เท้าด้านขวา กะทันหัน เดินลำบาก',
  'ผู้ป่วยมีอาการปวดข้อเข่ากำเริบ บวมแดง ปวดมากตอนกลางคืน หลังรับประทานอาหารทะเล',
  /* — Rheumatoid Arthritis — */
  'ผู้ป่วยมีอาการข้อเข่าบวม ฝืดเช้า ปวดเรื้อรัง รบกวนการเดิน',
  /* — Migraine — */
  'ผู้ป่วยมีอาการปวดศีรษะข้างเดียวเป็นพัก ๆ คลื่นไส้ ไวต่อแสงเสียง เป็นมาประมาณ 2 ปี',
  /* — Epilepsy — */
  'ผู้ป่วยมีอาการชักเกร็งกระตุก หมดสติชั่วคราว ครั้งล่าสุดเมื่อ 1 สัปดาห์ก่อน',
  'ผู้ป่วยขาดยากันชักไปประมาณ 2 สัปดาห์ มีอาการชักกำเริบ',
  /* — General — */
  'ผู้ป่วยสามารถควบคุมโรคได้ดี รับประทานยาสม่ำเสมอ ไม่มีอาการรบกวนการดำเนินชีวิต',
  'ผู้ป่วยมาตรวจตามนัดเพื่อรับยาต่อเนื่อง ไม่มีอาการเปลี่ยนแปลง',
];

/* Figma 162:19069 — treatment status chips in Badge Select (right column). */
/* Figma CPOE 245:24603 — สถานะการรักษา dropdown badge colors. */
const DISEASE_STATUS_OPTIONS = [
  { value: '',            label: 'เลือกสถานะการรักษา'       },
  { value: 'untreated',   label: 'ไม่ได้รักษา'             },
  { value: 'chronic',     label: 'เรื้อรังไม่หาย'           },
  { value: 'inTreatment', label: 'อยู่ระหว่างการรักษา'      },
  { value: 'controlled',  label: 'ควบคุมได้'                },
  { value: 'remission',   label: 'สงบ/หายดีชั่วคราว'        },
  { value: 'resolved',    label: 'หายแล้ว'                  },
];

const BLANK_RECORD = { name: '', severity: '', status: '', symptom: '', note: '' };

const SCHEMA = {
  topic:        'ประวัติโรคประจำตัว',
  /* Figma 162:19069 Topic row uses Material `sick` (Topic / primary-title). */
  icon:         'sick',
  recordLabel:  'โรคประจำตัวที่',
  nameLabel:    'โรคประจำตัว',
  statusLabel:  'สถานะการรักษา',
  nameOptions:  DISEASE_OPTIONS,
  statusOptions:     DISEASE_STATUS_OPTIONS,
  statusBadgeKind:   'treatmentStatus',
  history:      DISEASE_HISTORY,
  addLabel:     'เพิ่มโรคประจำตัว',
  /* Figma 162:19069 — left rail 320px; copy affordance matches Step 3 wording. */
  historyAsideWidthPx: 320,
  /* MR rail: severity pill only — treatment status lives on the right column. */
  showHistoryStatusBadge: false,
  historyTitle:    'ข้อมูลจากฝ่ายเวชระเบียน',
  historySubtitle:
    'คลิกไอคอนคัดลอกเพื่อนำรายการจากเวชระเบียนไปยังบันทึกประวัติใหม่',
  recordsTitle:    'บันทึกประวัติใหม่',
  recordsSubtitle:
    'ใช้ข้อมูลจากระบบ OPD เป็นหลัก โดยใช้ข้อมูลเวชระเบียนประกอบเท่านั้น',
  /* Figma 162:19069 — card-style radios before the repeating disease cards. */
  presenceModeToggle: {
    name: 'opd-screening-disease-presence',
    groupLabel: 'โรคประจำตัว',
    negativeLabel: 'ไม่มีโรคประจำตัว',
    positiveLabel: 'มีโรคประจำตัว',
    defaultHasAllergy: true,
    noAllergyTitle: 'ยังไม่ได้ระบุโรคประจำตัว',
    noAllergyHint: 'คัดลอกข้อมูลจากด้านซ้าย หรือกดที่ปุ่มด้านล่าง',
    noPresenceAnimationData: doctorPrescriptionAnim,
  },
  /* Autocomplete suggestions for the "อาการ" textarea (Figma 162:24221). */
  symptomSuggestions:    DISEASE_SYMPTOM_SUGGESTIONS,
  symptomSuggestMinChars: 3,
  /* FieldShell / อาการ — example narrative (e.g. HT row in MR mock). */
  symptomPlaceholder: 'เช่น ปวดท้ายทอย, เวียนหัว',
  /* Figma 162:19069 — one starter card "โรคประจำตัวที่ 1" when "มีโรค…" is on. */
  defaultRecords: [{ ...BLANK_RECORD }],
  /* Empty right-column state — Figma 339:59936.
       • illustration: Doctor Prescription Lottie (clipboard + heart)
       • title:        "ยังไม่ได้ระบุโรคประจำตัว"
       • hint:         "คัดลอกข้อมูลจากด้านซ้าย หรือกดที่ปุ่มด้านล่าง" */
  emptyIllustration: doctorPrescriptionAnim,
  emptyTitle: 'ยังไม่ได้ระบุโรคประจำตัว',
  emptyHint: 'คัดลอกข้อมูลจากด้านซ้าย หรือกดที่ปุ่มด้านล่าง',
  deleteConfirmTitle:       'ยืนยันการลบโรคประจำตัว',
  deleteConfirmDescription: 'คุณต้องการลบข้อมูลโรคประจำตัวของผู้ป่วย',
  deleteConfirmLabel:       'ลบข้อมูลโรคประจำตัว',
};

/**
 * Step 4 chronic-disease capture — Figma 162:19069.
 * @returns {React.ReactElement}
 */
const DiseaseForm = ({ onValidityChange }) => (
  <HistoryListForm schema={SCHEMA} onValidityChange={onValidityChange} />
);

export default DiseaseForm;
