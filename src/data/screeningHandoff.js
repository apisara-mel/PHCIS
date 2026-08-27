/* ── ผลคัดกรองที่ส่งต่อไปทุกแผนก (single source of truth) ─────────────────
   "คัดกรองและซักประวัติ" ทำที่เดียวคือ `/opd/screening` — คลินิกพิเศษ
   (ANC / สุขภาพจิต / ยาเสพติด / HIV-STI / วางแผนครอบครัว) และหน้าตรวจรักษา
   ของแพทย์ **ไม่มีฟอร์มคัดกรองของตัวเอง** แต่เรียกฟังก์ชันนี้เพื่ออ่านผล
   ของรอบล่าสุดมาแสดงแบบอ่านอย่างเดียว

   ก่อนหน้านี้แต่ละที่เขียนฟอร์มคัดกรองของตัวเอง (ANC 338 บรรทัด ·
   สุขภาพจิต 334 · ยาเสพติด 159 · HIV-STI 97 · วางแผนครอบครัว 147) และ
   Step2Screening ของ CPOE ก็ hardcode `DEFAULT_SCREENING_SUMMARY` ไว้เฉย ๆ
   ไม่ได้อ่านของที่พยาบาลกรอกจริงเลย — ข้อมูลจึงไม่ตรงกันทั้งระบบ

   ค่าที่ยังไม่ได้กรอกต้องแสดงเป็นค่าว่าง ไม่ใช้ข้อมูลตัวอย่างจาก Figma
   เพราะข้อมูลนี้อยู่ในบริบทการรักษาจริงของผู้รับบริการ */

import { getScreeningReview } from '@/data/opdScreeningReview';
import { painLevelByKey, triageLevelByLevel } from '@/data/opdScreeningCatalog';

/* VitalsForm seeds ช่องที่ยังไม่วัดด้วย 0 — อุณหภูมิ 0 °C ไม่ใช่ค่าที่วัดได้
   (เหตุผลเดียวกับ ScreeningStep5) */
const measured = (x) => {
  const t = String(x ?? '').trim();
  return t === '' || Number(t) === 0 ? '' : t;
};

/** ผลคัดกรองรอบล่าสุดของผู้รับบริการในรูปแบบอ่านอย่างเดียวของหน้าตรวจรักษา */
/* บันทึกจาก HistoryListForm/AllergyForm/DiseaseForm มาในรูป
   `{ topic, declaresPresence, records: [{ name, severity, status, symptom, note }] }`
   — การ์ดฝั่งแพทย์อ่าน `probability` สำหรับการแพ้ (ระดับความน่าจะเป็น) จึง map
   `status` → `probability` ให้ตรงชื่อช่องที่การ์ดใช้ · แถวที่ยังไม่ได้กรอกชื่อ
   ถือว่ายังไม่ใช่บันทึกจริง ตัดออกไม่ให้ขึ้นเป็นการ์ดเปล่า */
const asRecords = (section, extra = (r) => r) => {
  if (!section) return [];
  if (section.declaresPresence === false) return [];
  return (section.records || [])
    .filter((r) => String(r?.name || '').trim() !== '')
    .map((r) => extra({ ...r }));
};

/* "ระบุว่าไม่มี" ต่างจาก "ยังไม่ได้กรอก" — หมอต้องอ่านออกว่าพยาบาลถามแล้ว */
const deniedPresence = (section) => section?.declaresPresence === false;

export const getCarriedScreening = (patient = {}) => {
  const review = getScreeningReview(patient.hn);
  const symptom = review.symptom || null;
  const vitals = review.vitals || null;
  const captured = Object.keys(review).some((key) => key !== '_meta');

  const pain = painLevelByKey(symptom?.pain);
  const triage = triageLevelByLevel(symptom?.triage);

  /* ประวัติการแพ้ที่พยาบาลบันทึกในขั้นที่ 3 — ยา + สารเคมี + อาหาร + อื่น ๆ
     รวมเป็นรายการเดียวโดยติดป้ายหมวดไว้ที่ชื่อ เพราะการ์ดฝั่งแพทย์เป็นการ์ดเดียว
     ก่อนหน้านี้แท็บนี้อ่านจากโปรไฟล์ผู้ป่วย ไม่ใช่ของที่เพิ่งบันทึกวันนั้น */
  const allergyFromScreening = [
    ...asRecords(review['allergy.drug'], (r) => ({ ...r, probability: r.status })),
    ...asRecords(review['allergy.chemical'], (r) => ({ ...r, name: `${r.name} (สารเคมี)`, probability: r.status })),
    ...asRecords(review['allergy.food'], (r) => ({ ...r, name: `${r.name} (อาหาร)`, probability: r.status })),
    ...asRecords(review['allergy.other'], (r) => ({ ...r, name: `${r.name} (อื่น ๆ)`, probability: r.status })),
  ];
  const chronicFromScreening = asRecords(review['allergy.disease']);

  return {
    captured,
    capturedAt: review._meta?.updatedAt || '',
    cc: symptom?.complaint || '',
    duration: symptom?.duration || '',
    presentIllness: symptom?.presentIllness || '',
    triage: triage
      ? { level: triage.lv, label: triage.en, subLabel: triage.th, tone: triage.tone }
      : null,
    pain: pain
      ? { icon: pain.icon, label: pain.label }
      : null,
    orders: (symptom?.orders || []).length > 0
      ? [...symptom.orders, ...(symptom.othersNote ? [symptom.othersNote] : [])]
      : [],
    /* ใบรับรองแพทย์ + เตียงสังเกตอาการ ที่พยาบาลระบุไว้ตอนคัดกรอง */
    cert: symptom?.cert ?? null,
    bedId: symptom?.bedId || '',
    vitalRound: vitals?.round || null,
    vitalItems: [
      { label: 'อุณหภูมิ', value: measured(vitals?.temp) ? `${measured(vitals.temp)} °C` : '' },
      { label: 'ชีพจร', value: measured(vitals?.pulse) ? `${measured(vitals.pulse)} ครั้ง/นาที` : '' },
      {
        label: 'ความดันโลหิต',
        value: measured(vitals?.pressureSys) && measured(vitals?.pressureDia)
          ? `${measured(vitals.pressureSys)}/${measured(vitals.pressureDia)} mmHg`
          : '',
      },
      { label: 'อัตราการหายใจ', value: measured(vitals?.respiration) ? `${measured(vitals.respiration)} ครั้ง/นาที` : '' },
      { label: 'ออกซิเจนปลายนิ้ว', value: measured(vitals?.oxygen) ? `${measured(vitals.oxygen)} %` : '' },
      { label: 'น้ำหนัก', value: measured(vitals?.weight) ? `${measured(vitals.weight)} กก.` : '' },
      { label: 'ส่วนสูง', value: measured(vitals?.height) ? `${measured(vitals.height)} ซม.` : '' },
      { label: 'BMI', value: measured(vitals?.bmi) || '' },
      { label: 'เส้นรอบเอว', value: measured(vitals?.waist) ? `${measured(vitals.waist)} ซม.` : '' },
    ],
    behaviour: review.behaviour || null,
    mobility: null,
    assessor: null,
    /* ของที่บันทึกวันนั้นมาก่อน — ไม่มีค่อยตกไปที่โปรไฟล์เวชระเบียน
       `deniedAllergy` / `deniedChronic` = พยาบาลถามแล้วและระบุว่าไม่มี */
    allergies: allergyFromScreening.length > 0
      ? allergyFromScreening
      : (patient.drugAllergies || []),
    deniedAllergy: allergyFromScreening.length === 0 && deniedPresence(review['allergy.drug']),
    chronicDiseases: chronicFromScreening.length > 0
      ? chronicFromScreening
      : (patient.chronicDiseases || []),
    deniedChronic: chronicFromScreening.length === 0 && deniedPresence(review['allergy.disease']),
  };
};

/** true = มีผลคัดกรองรอบนี้จริง (ไม่ใช่ค่า mock) */
export const hasCarriedScreening = (patient = {}) =>
  getCarriedScreening(patient).captured;
