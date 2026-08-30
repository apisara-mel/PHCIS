import React, { useCallback, useMemo, useState } from 'react';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import AllergyForm from '@/components/forms/AllergyForm';
import DiseaseForm from '@/components/forms/DiseaseForm';
import HistoryListForm from '@/components/forms/HistoryListForm';
import ScreeningFlagForm from '@/components/forms/ScreeningFlagForm';
import { setScreeningSection } from '@/data/opdScreeningReview';
import {
  SAFETY_RISK_OPTIONS,
  SAFETY_NOTE_SUGGESTIONS,
  ORGAN_DONATION_SCOPES,
} from '@/data/registrationForm';

/**
 * OPD Screening — Step 3: ประวัติการแพ้ / โรคประจำตัว.
 *
 * TOR 1.2.2.5 asks the screening record to cover every allergy category, not
 * only drugs. Rather than stacking five long forms in one scroll, the step
 * keeps the existing `HistoryListForm` design and splits the categories into
 * pill sub-tabs (DS `TabPill` / `TabBar`):
 *
 *   แพ้ยา · แพ้อาหาร · แพ้สารเคมี · โรคประจำตัว ·
 *   ความปลอดภัย · DNR · บริจาคอวัยวะ · อื่น ๆ
 *
 * สามหมวดที่เป็น Flag (ความปลอดภัย · DNR · บริจาคอวัยวะ) เพิ่มเข้ามาเมื่อ
 * 31 ส.ค. 69 — เดิมจุดคัดกรองเห็นแต่หมวดที่เป็น "ประวัติ" ทั้งที่ต้องยืนยัน
 * Flag ตาม TOR ๑.๑.๑.๑๙ ซ้ำตอนซักประวัติด้วย ทั้งสามใช้ `ScreeningFlagForm`
 * ที่ขับด้วย schema เดียวกัน · VIP ไม่มีในแถบนี้ (มติผู้ใช้ 31 ส.ค. 69) —
 * เป็นธงเชิงบริการที่ห้องบัตรตั้ง ไม่ใช่ข้อมูลที่ซักตอนคัดกรอง
 *
 * แพ้ยา reuses `AllergyForm` and โรคประจำตัว reuses `DiseaseForm` verbatim —
 * both are shared DS forms and are NOT modified here. The three new
 * categories are the same `HistoryListForm` fed a category-specific schema.
 *
 * โรคประจำตัว lives here (not in step 4) so there is exactly one instance of
 * `DiseaseForm` in the flow — two instances would each hold their own local
 * state and silently disagree. Step 4 keeps พฤติกรรมสุขภาพ.
 */

const BLANK_RECORD = { name: '', severity: '', status: '', symptom: '', note: '' };

const SEVERITY_OPTIONS = [
  { value: 'high',   label: 'รุนแรง'   },
  { value: 'medium', label: 'ปานกลาง'  },
  { value: 'low',    label: 'เล็กน้อย' },
];

const LIKELIHOOD_OPTIONS = [
  { value: 'confirmed', label: 'ยืนยันแล้ว'   },
  { value: 'probable',  label: 'น่าจะใช่'     },
  { value: 'suspected', label: 'สงสัย'        },
];

/* แถวคอลัมน์ซ้าย "ข้อมูลจากฝ่ายเวชระเบียน" — mock อย่างละ 5 รายการต่อหมวด
   (มติผู้ใช้ 28 ส.ค. 69) เดิม `history: []` ทำให้คอลัมน์ซ้ายว่างเปล่าทั้งสามหมวด
   จนดูเหมือนหน้าจอพัง ทั้งที่ทั้งขั้นตอนออกแบบมาให้คัดลอกจากเวชระเบียนมาฝั่งขวา
   ชื่อรายการเลือกจาก `nameOptions` ของหมวดนั้น ๆ เพื่อให้คัดลอกแล้วดรอปดาวน์ตรงกัน */
const MR_HISTORY = {
  food: [
    { name: 'อาหารทะเล (กุ้ง/ปู/หอย)', detail: 'ผื่นลมพิษขึ้นทั่วตัวภายใน 30 นาทีหลังรับประทาน', severity: 'high',   status: 'confirmed' },
    { name: 'ถั่วลิสง',                 detail: 'ปากบวม ลิ้นบวม กลืนลำบาก',                       severity: 'high',   status: 'confirmed' },
    { name: 'นมวัว',                    detail: 'คลื่นไส้ อาเจียน ปวดท้อง ถ่ายเหลว',              severity: 'medium', status: 'probable'  },
    { name: 'ไข่',                       detail: 'คันในลำคอและเพดานปาก',                          severity: 'low',    status: 'suspected' },
    { name: 'ผงชูรส (MSG)',             detail: 'ปวดศีรษะ หน้าแดง ใจสั่นหลังมื้ออาหาร',           severity: 'low',    status: 'suspected' },
  ],
  chemical: [
    { name: 'น้ำยาง (Latex)',                  detail: 'ผื่นแดงคันเฉพาะบริเวณที่สัมผัส',            severity: 'medium', status: 'confirmed' },
    { name: 'พลาสเตอร์ / เทปทางการแพทย์',      detail: 'บวมแดงบริเวณที่ติดพลาสเตอร์',              severity: 'low',    status: 'confirmed' },
    { name: 'สารทึบรังสี (Contrast media)',    detail: 'อาการแพ้รุนแรงหลังฉีดสารทึบรังสี',          severity: 'high',   status: 'probable'  },
    { name: 'ไอโอดีน / Betadine',              detail: 'ตุ่มน้ำใส ผิวลอกหลังสัมผัส 1-2 วัน',        severity: 'medium', status: 'probable'  },
    { name: 'ผงซักฟอก / น้ำยาทำความสะอาด',     detail: 'หายใจไม่สะดวกเมื่อสูดดมไอระเหย',           severity: 'low',    status: 'suspected' },
  ],
  other: [
    { name: 'ฝุ่น / ไรฝุ่น',              detail: 'จามติดต่อกัน คัดจมูก น้ำมูกไหล',              severity: 'medium', status: 'confirmed' },
    { name: 'เกสรดอกไม้',                 detail: 'ตาคัน ตาแดง น้ำตาไหล',                        severity: 'low',    status: 'probable'  },
    { name: 'ขนสัตว์',                    detail: 'หอบเหนื่อย แน่นหน้าอกเมื่อเจอฝุ่น',            severity: 'medium', status: 'probable'  },
    { name: 'แมลงกัดต่อย (ผึ้ง/ต่อ/มด)',  detail: 'บวมแดงบริเวณที่ถูกแมลงต่อย',                  severity: 'high',   status: 'confirmed' },
    { name: 'อากาศเย็น',                  detail: 'ผื่นลมพิษเมื่อสัมผัสอากาศเย็น',                severity: 'low',    status: 'suspected' },
  ],
};

/* Shared skeleton — each category only overrides its own vocabulary so the
   five tabs stay visually identical to the existing ประวัติการแพ้ยา design. */
const buildSchema = (o) => ({
  icon:              o.icon,
  topic:             o.topic,
  /* แท็บด้านบนบอกหมวดอยู่แล้ว ไม่ต้องมีหัวข้อซ้ำในแผง */
  showTopic:         false,
  recordLabel:       o.recordLabel,
  nameLabel:         o.nameLabel,
  statusLabel:       'ระดับความน่าจะเป็น',
  nameOptions:       o.nameOptions,
  statusOptions:     LIKELIHOOD_OPTIONS,
  statusBadgeKind:   'likelihood',
  severityOptions:   SEVERITY_OPTIONS,
  addLabel:          o.addLabel,
  history:           MR_HISTORY[o.key] || [],
  historyAsideWidthPx: 320,
  historyTitle:      'ข้อมูลจากฝ่ายเวชระเบียน',
  historySubtitle:   'คลิกไอคอนคัดลอกเพื่อนำรายการจากเวชระเบียนไปยังบันทึกประวัติใหม่',
  recordsTitle:      'บันทึกประวัติใหม่',
  recordsSubtitle:   'ใช้ข้อมูลจากระบบ OPD เป็นหลัก โดยใช้ข้อมูลเวชระเบียนประกอบเท่านั้น',
  showHistoryStatusBadge: false,
  allergyModeToggle: {
    name:              `opd-screening-${o.key}-mode`,
    groupLabel:        o.groupLabel,
    negativeLabel:     o.negativeLabel,
    positiveLabel:     o.positiveLabel,
    defaultHasAllergy: false,
    noAllergyTitle:    o.noAllergyTitle,
    noAllergyHint:     'ไม่ต้องกรอกรายการ',
    noAllergyIllustrationPath: o.illustration,
    emptyAllergenTitle: o.emptyTitle,
    emptyAllergenHint:  'กดปุ่มด้านล่างเพื่อเพิ่มรายการ',
    emptyAllergenIllustrationPath: o.illustration,
  },
  allergenListEmptyPlaceholder: true,
  defaultRecords: [{ ...BLANK_RECORD }],
  symptomPlaceholder:     o.symptomPlaceholder,
  symptomSuggestions:     o.symptomSuggestions,
  symptomSuggestMinChars: 3,
  notePlaceholder:        'บันทึกข้อมูลเพิ่มเติม',
  severityRequired: true,
  statusRequired:   true,
  symptomRequired:  true,
  noteRequired:     false,
  deleteConfirmTitle:       o.deleteConfirmTitle,
  deleteConfirmDescription: 'คุณต้องการลบข้อมูลนี้ของผู้ป่วย',
  deleteConfirmLabel:       'ลบข้อมูล',
});

const FOOD_SCHEMA = buildSchema({
  key: 'food',
  icon: 'restaurant',
  topic: 'ประวัติการแพ้อาหาร',
  recordLabel: 'อาหารที่',
  nameLabel: 'อาหารที่แพ้',
  addLabel: 'เพิ่มอาหารที่แพ้',
  groupLabel: 'การแพ้อาหาร',
  negativeLabel: 'ไม่แพ้อาหาร',
  positiveLabel: 'แพ้อาหาร',
  noAllergyTitle: 'ระบุว่าผู้ป่วยไม่มีประวัติการแพ้อาหาร',
  emptyTitle: 'ยังไม่ได้ระบุอาหารที่แพ้',
  illustration: '/illustration/Medicine.json',
  nameOptions: [
    'อาหารทะเล (กุ้ง/ปู/หอย)', 'ปลา', 'นมวัว', 'ไข่', 'ถั่วลิสง',
    'ถั่วเปลือกแข็ง (อัลมอนด์/เม็ดมะม่วง)', 'แป้งสาลี / กลูเตน', 'ถั่วเหลือง',
    'งา', 'ผงชูรส (MSG)', 'สารกันบูด (Sulfite)', 'อื่น ๆ',
  ],
  symptomPlaceholder: 'เช่น ผื่นลมพิษหลังกินอาหารทะเล ปากบวม แน่นหน้าอก',
  symptomSuggestions: [
    'ผื่นลมพิษขึ้นทั่วตัวภายใน 30 นาทีหลังรับประทาน',
    'ปากบวม ลิ้นบวม กลืนลำบาก',
    'คลื่นไส้ อาเจียน ปวดท้อง ถ่ายเหลว',
    'แน่นหน้าอก หายใจมีเสียงหวีด',
    'อาการแพ้รุนแรง (Anaphylaxis) ต้องฉีด Adrenaline',
    'คันในลำคอและเพดานปาก',
  ],
  deleteConfirmTitle: 'ยืนยันการลบอาหารที่แพ้',
});

const CHEMICAL_SCHEMA = buildSchema({
  key: 'chemical',
  icon: 'science',
  topic: 'ประวัติการแพ้สารเคมี',
  recordLabel: 'สารเคมีที่',
  nameLabel: 'สารเคมีที่แพ้',
  addLabel: 'เพิ่มสารเคมีที่แพ้',
  groupLabel: 'การแพ้สารเคมี',
  negativeLabel: 'ไม่แพ้สารเคมี',
  positiveLabel: 'แพ้สารเคมี',
  noAllergyTitle: 'ระบุว่าผู้ป่วยไม่มีประวัติการแพ้สารเคมี',
  emptyTitle: 'ยังไม่ได้ระบุสารเคมีที่แพ้',
  illustration: '/illustration/Medicine.json',
  nameOptions: [
    'น้ำยาง (Latex)', 'พลาสเตอร์ / เทปทางการแพทย์', 'ไอโอดีน / Betadine',
    'แอลกอฮอล์ฆ่าเชื้อ', 'คลอร์เฮกซิดีน (Chlorhexidine)', 'สารทึบรังสี (Contrast media)',
    'นิกเกิล / โลหะ', 'น้ำยาย้อมผม', 'ผงซักฟอก / น้ำยาทำความสะอาด',
    'ยาฆ่าแมลง', 'เครื่องสำอาง / น้ำหอม', 'อื่น ๆ',
  ],
  symptomPlaceholder: 'เช่น ผื่นแดงคันบริเวณที่สัมผัส ตุ่มน้ำใส',
  symptomSuggestions: [
    'ผื่นแดงคันเฉพาะบริเวณที่สัมผัส',
    'ตุ่มน้ำใส ผิวลอกหลังสัมผัส 1-2 วัน',
    'บวมแดงบริเวณที่ติดพลาสเตอร์',
    'หายใจไม่สะดวกเมื่อสูดดมไอระเหย',
    'ตาแดง น้ำตาไหล จาม เมื่อสัมผัสสาร',
    'อาการแพ้รุนแรงหลังฉีดสารทึบรังสี',
  ],
  deleteConfirmTitle: 'ยืนยันการลบสารเคมีที่แพ้',
});

const OTHER_SCHEMA = buildSchema({
  key: 'other',
  icon: 'help',
  topic: 'ประวัติการแพ้อื่น ๆ',
  recordLabel: 'รายการที่',
  nameLabel: 'สิ่งที่แพ้',
  addLabel: 'เพิ่มรายการที่แพ้',
  groupLabel: 'การแพ้อื่น ๆ',
  negativeLabel: 'ไม่มีการแพ้อื่น ๆ',
  positiveLabel: 'มีการแพ้อื่น ๆ',
  noAllergyTitle: 'ระบุว่าผู้ป่วยไม่มีประวัติการแพ้อื่น ๆ',
  emptyTitle: 'ยังไม่ได้ระบุรายการที่แพ้',
  illustration: '/illustration/Medicine.json',
  nameOptions: [
    'ฝุ่น / ไรฝุ่น', 'เกสรดอกไม้', 'ขนสัตว์', 'แมลงกัดต่อย (ผึ้ง/ต่อ/มด)',
    'เชื้อรา / ความชื้น', 'อากาศเย็น', 'แสงแดด', 'อื่น ๆ',
  ],
  symptomPlaceholder: 'เช่น จามติดต่อกัน คัดจมูก น้ำมูกไหลเมื่อเจอฝุ่น',
  symptomSuggestions: [
    'จามติดต่อกัน คัดจมูก น้ำมูกไหล',
    'ตาคัน ตาแดง น้ำตาไหล',
    'ผื่นลมพิษเมื่อสัมผัสอากาศเย็น',
    'บวมแดงบริเวณที่ถูกแมลงต่อย',
    'หอบเหนื่อย แน่นหน้าอกเมื่อเจอฝุ่น',
    'ผื่นแดงบริเวณผิวที่โดนแดด',
  ],
  deleteConfirmTitle: 'ยืนยันการลบรายการที่แพ้',
});

/* Flag ระดับผู้รับบริการตาม TOR ๑.๑.๑.๑๙ — ขั้นลงทะเบียนเก็บไว้แล้ว แต่จุด
   คัดกรองต้องยืนยันซ้ำตอนซักประวัติ จึงมีหมวดเดียวกันที่นี่ด้วย (มติผู้ใช้
   31 ส.ค. 69) รายละเอียดของแต่ละแผงยึดตามขั้นลงทะเบียนตัวต่อตัว */
const SAFETY_SCHEMA = {
  key: 'safety',
  icon: 'health_and_safety',
  topic: 'ความปลอดภัยในการรักษา',
  toggleLabel: 'มีข้อควรระวังด้านความปลอดภัย',
  choices: {
    label: 'ประเภทความเสี่ยง',
    required: true,
    options: SAFETY_RISK_OPTIONS,
  },
  note: {
    label: 'ที่มา / รายละเอียด',
    placeholder: 'เช่น ประเมิน Morse Fall Scale อยู่ในระดับเสี่ยงสูง เมื่อ 6 พ.ค. 2569',
    suggestions: SAFETY_NOTE_SUGGESTIONS,
  },
};

const DNR_SCHEMA = {
  key: 'dnr',
  icon: 'do_not_disturb_on',
  topic: 'หนังสือแสดงเจตนาไม่ประสงค์ปั๊มหัวใจ (DNR)',
  toggleLabel: 'มีหนังสือแสดงเจตนาไม่ปั๊มหัวใจ (DNR)',
  panelTitle: 'หนังสือแสดงเจตนาไม่ประสงค์ปั๊มหัวใจ (DNR)',
  presenceRecordName: 'มีหนังสือแสดงเจตนาไม่ปั๊มหัวใจ (DNR)',
  /* ธงที่มีผลทางกฎหมาย จึงผูกกับเลขที่หนังสือและวันที่ลงนามเสมอ
     (พ.ร.บ.สุขภาพแห่งชาติ ม.๑๒) ไม่ใช่ติ๊กลอย ๆ */
  fields: [
    { key: 'dnrDocNo',      label: 'เลขที่หนังสือแสดงเจตนา', placeholder: 'เช่น LW-2568-0114', required: true },
    { key: 'dnrSignedDate', label: 'วันที่ลงนาม',            type: 'date', required: true },
    { key: 'dnrWitness',    label: 'พยาน / ผู้รับมอบอำนาจ',  placeholder: 'ชื่อ-นามสกุล' },
  ],
};

const ORGAN_DONOR_SCHEMA = {
  key: 'organDonor',
  icon: 'volunteer_activism',
  topic: 'ความประสงค์บริจาคอวัยวะ',
  toggleLabel: 'ประสงค์บริจาคอวัยวะ / ดวงตา',
  panelTitle: 'ความประสงค์บริจาคอวัยวะ',
  choices: {
    label: 'สิ่งที่ประสงค์บริจาค',
    required: true,
    options: ORGAN_DONATION_SCOPES,
  },
  /* เลขบัตร/วันที่ไม่บังคับ เพราะผู้รับบริการแจ้งความประสงค์ก่อนทำบัตรได้ */
  fields: [
    { key: 'organDonorCardNo', label: 'เลขที่บัตรผู้แสดงความจำนง (สภากาชาดไทย)', placeholder: 'เช่น OD-6812774' },
    { key: 'organDonorDate',   label: 'วันที่แสดงเจตนา', type: 'date' },
  ],
};

const FLAG_SCHEMAS = {
  safety:     SAFETY_SCHEMA,
  dnr:        DNR_SCHEMA,
  organDonor: ORGAN_DONOR_SCHEMA,
};

/* ลำดับและชื่อหมวดตรงกับแถบ Flag ของขั้นลงทะเบียนตัวต่อตัว (มติผู้ใช้
   31 ส.ค. 69) — สองหน้าบันทึกข้อมูลชุดเดียวกัน ถ้าจัดหมวดคนละแบบเจ้าหน้าที่
   ต้องเรียนรู้สองระบบ · "อื่น ๆ" ของหน้าคัดกรองยังเป็นประวัติการแพ้อื่น ๆ
   ตามเดิม ไม่ใช่ Flag อื่น ๆ ของขั้นลงทะเบียน */
const TABS = [
  { key: 'drug',       label: 'แพ้ยา',        icon: 'pill'               },
  { key: 'food',       label: 'แพ้อาหาร',     icon: 'restaurant'         },
  { key: 'chemical',   label: 'แพ้สารเคมี',   icon: 'science'            },
  { key: 'disease',    label: 'โรคประจำตัว',  icon: 'sick'               },
  { key: 'safety',     label: 'ความปลอดภัย',  icon: 'health_and_safety'  },
  { key: 'dnr',        label: 'DNR',          icon: 'do_not_disturb_on'  },
  { key: 'organDonor', label: 'บริจาคอวัยวะ', icon: 'volunteer_activism' },
  { key: 'other',      label: 'อื่น ๆ',       icon: 'help'               },
];

const ScreeningStep3 = ({ onValidityChange, patient }) => {
  const [tab, setTab] = useState('drug');
  /* Only the visible tab is mounted, so a category the nurse never opened
     reports nothing — default those to valid instead of blocking "ถัดไป"
     on forms that were never shown. */
  const [validity, setValidity] = useState({});

  const reportTab = useCallback((key) => (ok) => {
    setValidity((prev) => (prev[key] === ok ? prev : { ...prev, [key]: ok }));
  }, []);

  /* ส่งรายการของแต่ละแท็บให้ step "ตรวจสอบข้อมูล" อ่านต่อ */
  const publish = useCallback(
    (key) => (payload) => setScreeningSection(patient?.hn, `allergy.${key}`, payload),
    [patient?.hn],
  );

  const allValid = useMemo(
    () => TABS.every((t) => validity[t.key] !== false),
    [validity],
  );

  React.useEffect(() => {
    if (typeof onValidityChange === 'function') onValidityChange(allValid);
  }, [allValid, onValidityChange]);

  return (
    <div className='flex flex-col'>
      {/* แถบหมวดอยู่กึ่งกลาง (มติผู้ใช้ 28 ส.ค. 69) — เดิมชิดซ้ายแล้วลอยอยู่มุมเดียว
          ของแผงกว้าง ๆ ทั้งที่เป็นตัวสลับของทั้งขั้นตอน ไม่ใช่ของคอลัมน์ซ้าย */}
      <div
        className='flex w-full justify-center'
        style={{
          paddingTop: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
        }}
      >
        <TabBar aria-label='หมวดประวัติการแพ้และโรคประจำตัว' className='max-w-full'>
          {TABS.map((t) => (
            <TabPill
              key={t.key}
              size='small'
              selected={tab === t.key}
              leadingIcon={t.icon}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </TabPill>
          ))}
        </TabBar>
      </div>

      {FLAG_SCHEMAS[tab] && (
        <ScreeningFlagForm
          key={tab}
          schema={FLAG_SCHEMAS[tab]}
          onValidityChange={reportTab(tab)}
          onRecordsChange={publish(tab)}
        />
      )}
      {tab === 'drug' && (
        <AllergyForm onValidityChange={reportTab('drug')} onRecordsChange={publish('drug')} />
      )}
      {tab === 'food' && (
        <HistoryListForm schema={FOOD_SCHEMA} onValidityChange={reportTab('food')} onRecordsChange={publish('food')} />
      )}
      {tab === 'chemical' && (
        <HistoryListForm schema={CHEMICAL_SCHEMA} onValidityChange={reportTab('chemical')} onRecordsChange={publish('chemical')} />
      )}
      {tab === 'disease' && (
        <DiseaseForm onValidityChange={reportTab('disease')} onRecordsChange={publish('disease')} />
      )}
      {tab === 'other' && (
        <HistoryListForm schema={OTHER_SCHEMA} onValidityChange={reportTab('other')} onRecordsChange={publish('other')} />
      )}
    </div>
  );
};

export default ScreeningStep3;
