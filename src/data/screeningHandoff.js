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
export const getCarriedScreening = (patient = {}) => {
  const review = getScreeningReview(patient.hn);
  const symptom = review.symptom || null;
  const vitals = review.vitals || null;
  const captured = Object.keys(review).some((key) => key !== '_meta');

  const pain = painLevelByKey(symptom?.pain);
  const triage = triageLevelByLevel(symptom?.triage);

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
    vitalItems: [
      { label: 'อุณหภูมิ', value: measured(vitals?.temp) ? `${measured(vitals.temp)} °C` : '' },
      {
        label: 'ความดันโลหิต',
        value: measured(vitals?.pressureSys) && measured(vitals?.pressureDia)
          ? `${measured(vitals.pressureSys)}/${measured(vitals.pressureDia)} mmHg`
          : '',
      },
      { label: 'น้ำหนัก', value: measured(vitals?.weight) ? `${measured(vitals.weight)} กก.` : '' },
      { label: 'ส่วนสูง', value: measured(vitals?.height) ? `${measured(vitals.height)} ซม.` : '' },
    ],
    behaviour: review.behaviour || null,
    mobility: null,
    assessor: null,
    allergies: patient.drugAllergies || [],
    chronic: patient.chronicDiseases || [],
  };
};

/** true = มีผลคัดกรองรอบนี้จริง (ไม่ใช่ค่า mock) */
export const hasCarriedScreening = (patient = {}) =>
  getCarriedScreening(patient).captured;
