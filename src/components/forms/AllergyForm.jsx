import React from 'react';
import HistoryListForm from '@/components/forms/HistoryListForm';

/* Step 3 — ประวัติการแพ้ยา / สารเคมี (Figma PHCIS · OPD nodes
   162:17951 + 299:53214 / empty state).

   Empty-state contract (299:53214): first entry into step 3 lands with
   TWO blank "ยาตัวที่ N" cards (no name / severity / probability /
   symptom / note pre-filled) so the clinician knows exactly where to
   start filling in. The cards keep the same 3-dropdown + 2-textarea
   shape used by step 4 (DiseaseForm) — HistoryListForm stays generic.

   Each left-column "ข้อมูลจากฝ่ายเวชระเบียน" card carries a **severity** pill
   (likelihood is not shown on the MR rail — `showHistoryStatusBadge: false`). */
const ALLERGY_HISTORY = [
  { name: 'Penicillin',    detail: 'อาการแพ้รุนแรง เช่น Anaphylaxis, ผื่นลมพิษทั่วตัว, หน้าบวม, หายใจไม่ออก', severity: 'high',   status: 'definite' },
  { name: 'NSAIDs',        detail: 'ติดผ่าเร็บ / หลอดลมหดเกร็ง, ผื่นลมพิษ, คัดจมูก น้ำมูกไหล',              severity: 'medium', status: 'probable' },
  { name: 'Aspirin',       detail: 'ติดผ่าเร็บ / หลอดลมหดเกร็ง, ผื่นลมพิษ, คัดจมูก น้ำมูกไหล',              severity: 'medium', status: 'probable' },
  { name: 'Codeine',       detail: 'คลื่นไส้ อาเจียน วิงเวียน, ท้องผูก, ง่วงซึมมากผิดปกติ',                  severity: 'low',    status: 'possible' },
  { name: 'Sulfonamides',  detail: 'ผื่น Stevens-Johnson Syndrome (SJS) หรือผื่นแดงทั่วตัว, ไข้, ตุ่มน้ำพอง', severity: 'high',   status: 'definite' },
  { name: 'Sulfonamide',   detail: 'ผื่นแดงเล็กน้อย คัน เฉพาะที่',                                          severity: 'low',    status: 'unlikely' },
];

const ALLERGY_OPTIONS = [
  { value: '',           label: 'เลือกชื่อยา' },
  { value: 'penicillin', label: 'Penicillin'  },
  { value: 'nsaids',     label: 'NSAIDs'      },
  { value: 'aspirin',    label: 'Aspirin'     },
  { value: 'codeine',    label: 'Codeine'     },
  { value: 'sulfa',      label: 'Sulfonamides' },
];

/* Figma PHCIS | OPD 334:56749 — four likelihood levels (ColorfulBadge
   teal / blue / indigo / purple). Value `unlikely` is kept for data keys;
   label in UI is สงสัย per Figma. */
const ALLERGY_STATUS_OPTIONS = [
  { value: 'definite',  label: 'แน่นอน'      },
  { value: 'probable',  label: 'น่าจะใช่'     },
  { value: 'possible',  label: 'เป็นไปได้'   },
  { value: 'unlikely',  label: 'สงสัย'       },
];

const BLANK_RECORD = { name: '', severity: '', status: '', symptom: '', note: '' };

/* Common Thai phrases clinicians type into the "อาการ" textarea when
   recording a drug-allergy reaction — Figma 162:24221 dropdown.
   HistoryListForm shows these as autocomplete suggestions after the
   user types ≥ `symptomSuggestMinChars` characters (3 by default).
   Matched substring is highlighted in brand color in the popover. */
const ALLERGY_SYMPTOM_SUGGESTIONS = [
  'ผู้ป่วยมีอาการหายใจลำบาก แน่นหน้าอก หลังได้รับยา Penicillin',
  'ผู้ป่วยมีอาการความดันโลหิตต่ำ ช็อค หลังฉีด Penicillin',
  'ผู้ป่วยมีอาการบวมที่ลิ้น ลำคอ และหายใจไม่ออก (Angioedema)',
  'ผู้ป่วยมีอาการผื่นลมพิษขึ้นทั่วตัวหลังรับประทาน Penicillin',
  'ผู้ป่วยมีอาการคันตามผิวหนัง ผื่นแดง หลังได้รับกลุ่ม Penicillin',
  'ผู้ป่วยมีอาการหน้าบวม ตาบวม หลังได้รับยา Amoxicillin',
  'ผู้ป่วยมีอาการคันเล็กน้อยบริเวณผิวหนังหลังได้รับ Penicillin',
  'ผู้ป่วยมีอาการคลื่นไส้ อาเจียน หลังได้รับ NSAIDs',
  'ผู้ป่วยมีอาการหลอดลมหดเกร็ง หายใจมีเสียงหวีด หลังได้รับ Aspirin',
  'ผู้ป่วยมีอาการผื่น Stevens-Johnson Syndrome หลังได้รับ Sulfonamides',
  'ผู้ป่วยมีอาการง่วงซึมมากผิดปกติ คลื่นไส้ หลังได้รับ Codeine',
  'ผู้ป่วยมีอาการตุ่มน้ำพอง ผิวหนังลอก หลังได้รับ Sulfonamides',
];

const SCHEMA = {
  topic:        'ประวัติการแพ้ยา / สารเคมี',
  icon:         'pill',
  /* Figma 299:53214 — each new entry header reads "ยาตัวที่ N" (mirrors
     how clinicians enumerate medication-by-medication allergies).
     `nameLabel` likewise frames the cause as a generic problem source
     rather than a strict drug name. */
  recordLabel:  'ยาตัวที่',
  nameLabel:    'ชื่อยา/ปัญหาที่แพ้',
  statusLabel:  'ระดับความน่าจะเป็น',
  nameOptions:  ALLERGY_OPTIONS,
  statusOptions:     ALLERGY_STATUS_OPTIONS,
  statusBadgeKind:   'likelihood',
  history:      ALLERGY_HISTORY,
  addLabel:     'เพิ่มชื่อยา/สารเคมี',
  /* Figma 162:17951 — left MR rail `w-[320px]` in the two-column card row. */
  historyAsideWidthPx: 320,
  historyTitle:    'ข้อมูลจากฝ่ายเวชระเบียน',
  historySubtitle: 'คลิกไอคอนคัดลอกเพื่อนำรายการจากเวชระเบียนไปยังบันทึกประวัติใหม่',
  recordsTitle:    'บันทึกประวัติใหม่',
  recordsSubtitle: 'ใช้ข้อมูลจากระบบ OPD เป็นหลัก โดยใช้ข้อมูลเวชระเบียนประกอบเท่านั้น',
  /* Hide MR likelihood pill on the left — likelihood is captured on the right only. */
  showHistoryStatusBadge: false,
  /* Figma 335:57765 — two card-style radios before the repeating record list. */
  allergyModeToggle: {
    name:           'opd-screening-allergy-mode',
    groupLabel:     'การแพ้ยาและสารเคมี',
    negativeLabel: 'ไม่แพ้ยาและสารเคมี',
    positiveLabel:  'แพ้ยาและสารเคมี',
    defaultHasAllergy: true,
    noAllergyTitle: 'ระบุว่าผู้ป่วยไม่มีประวัติการแพ้ยาและสารเคมี',
    noAllergyHint: 'ไม่ต้องกรอกรายการยา',
    noAllergyIllustrationPath: '/illustration/Medicine.json',
    /* Figma 335:54424 — zero allergen rows while "แพ้ยาและสารเคมี" is on. */
    emptyAllergenTitle: 'ยังไม่ได้ระบุชื่อยา/สารเคมี',
    emptyAllergenHint: 'คัดลอกข้อมูลจากด้านซ้าย หรือกดที่ปุ่มด้านล่าง',
    emptyAllergenIllustrationPath: '/illustration/Medicine.json',
  },
  /* When positive mode is on and every row was removed — Figma 335:54424 flat empty. */
  allergenListEmptyPlaceholder: true,
  /* Empty-state Figma 299:53214 — two blank cards on first visit. The
     clinician fills them in (or removes one) before moving on; the
     "+ เพิ่ม…" button below extends past two as needed. */
  defaultRecords: [
    { ...BLANK_RECORD },
    { ...BLANK_RECORD },
  ],
  symptomPlaceholder: 'เช่น อาการแพ้รุนแรง ผื่นลมพิษทั่วตัว, หน้าบวม, หายใจไม่ออก',
  symptomSuggestions:    ALLERGY_SYMPTOM_SUGGESTIONS,
  symptomSuggestMinChars: 3,
  notePlaceholder:    'บันทึกข้อมูลเพิ่มเติม',
  severityRequired: true,
  statusRequired:   true,
  symptomRequired:  true,
  /* หมายเหตุ is optional — most allergy entries carry nothing beyond the
     symptom, and forcing a note made clinicians type filler to move on. */
  noteRequired:     false,
  /* PHCIS | OPD 334:56417 — three severity levels (ColorfulBadge red / orange / blue). */
  severityOptions: [
    { value: 'high',   label: 'รุนแรง'   },
    { value: 'medium', label: 'ปานกลาง'  },
    { value: 'low',    label: 'เล็กน้อย' },
  ],
  /* Figma 322:50126 — delete confirmation before removing a "ยาตัวที่ N" card. */
  deleteConfirmTitle:       'ยืนยันการลบยา',
  deleteConfirmDescription: 'คุณต้องการลบข้อมูลยาของผู้ป่วย',
  deleteConfirmLabel:       'ลบข้อมูลยา',
};

const AllergyForm = ({ onValidityChange, onRecordsChange }) => (
  <HistoryListForm schema={SCHEMA} onValidityChange={onValidityChange} onRecordsChange={onRecordsChange} />
);

export default AllergyForm;
