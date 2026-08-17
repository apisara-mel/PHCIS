/* ── ผลคัดกรองที่ส่งต่อไปทุกแผนก (single source of truth) ─────────────────
   "คัดกรองและซักประวัติ" ทำที่เดียวคือ `/opd/screening` — คลินิกพิเศษ
   (ANC / สุขภาพจิต / ยาเสพติด / HIV-STI / วางแผนครอบครัว) และหน้าตรวจรักษา
   ของแพทย์ **ไม่มีฟอร์มคัดกรองของตัวเอง** แต่เรียกฟังก์ชันนี้เพื่ออ่านผล
   ของรอบล่าสุดมาแสดงแบบอ่านอย่างเดียว

   ก่อนหน้านี้แต่ละที่เขียนฟอร์มคัดกรองของตัวเอง (ANC 338 บรรทัด ·
   สุขภาพจิต 334 · ยาเสพติด 159 · HIV-STI 97 · วางแผนครอบครัว 147) และ
   Step2Screening ของ CPOE ก็ hardcode `DEFAULT_SCREENING_SUMMARY` ไว้เฉย ๆ
   ไม่ได้อ่านของที่พยาบาลกรอกจริงเลย — ข้อมูลจึงไม่ตรงกันทั้งระบบ

   ค่าที่ยังไม่ได้กรอกจะ fallback ไปที่ `DEFAULT_SCREENING_SUMMARY` (ชุด mock
   ของ Figma) เพื่อให้หน้าจอไม่ว่างเปล่าตอน demo — เช็ค `captured` ถ้าต้องรู้ว่า
   เป็นข้อมูลจริงหรือ mock */

import { DEFAULT_SCREENING_SUMMARY } from '@/data/treatmentVisits';
import { getScreeningReview } from '@/data/opdScreeningReview';
import { painLevelByKey, triageLevelByLevel } from '@/data/opdScreeningCatalog';

/* VitalsForm seeds ช่องที่ยังไม่วัดด้วย 0 — อุณหภูมิ 0 °C ไม่ใช่ค่าที่วัดได้
   (เหตุผลเดียวกับ ScreeningStep5) */
const measured = (x) => {
  const t = String(x ?? '').trim();
  return t === '' || Number(t) === 0 ? '' : t;
};

const firstFilled = (...values) =>
  values.find((v) => String(v ?? '').trim() !== '') ?? '';

/** ผลคัดกรองรอบล่าสุดของผู้รับบริการ ในรูปแบบเดียวกับ DEFAULT_SCREENING_SUMMARY */
export const getCarriedScreening = (patient = {}) => {
  const review = getScreeningReview(patient.hn);
  const symptom = review.symptom || null;
  const vitals = review.vitals || null;
  const captured = Boolean(symptom || vitals);

  const pain = painLevelByKey(symptom?.pain);
  const triage = triageLevelByLevel(symptom?.triage);

  return {
    ...DEFAULT_SCREENING_SUMMARY,
    /* false = ยังไม่มีใครคัดกรองรอบนี้ กำลังโชว์ค่า mock ของ Figma อยู่ */
    captured,
    cc: firstFilled(symptom?.complaint, DEFAULT_SCREENING_SUMMARY.cc),
    duration: firstFilled(symptom?.duration, DEFAULT_SCREENING_SUMMARY.duration),
    presentIllness: symptom?.presentIllness || '',
    triage: triage
      ? { level: triage.lv, label: triage.en, subLabel: triage.th, tone: triage.tone }
      : DEFAULT_SCREENING_SUMMARY.triage,
    pain: pain
      ? { icon: pain.icon, label: pain.label }
      : DEFAULT_SCREENING_SUMMARY.pain,
    orders: (symptom?.orders || []).length > 0
      ? [...symptom.orders, ...(symptom.othersNote ? [symptom.othersNote] : [])]
      : DEFAULT_SCREENING_SUMMARY.orders,
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
  };
};

/** true = มีผลคัดกรองรอบนี้จริง (ไม่ใช่ค่า mock) */
export const hasCarriedScreening = (patient = {}) =>
  getCarriedScreening(patient).captured;
