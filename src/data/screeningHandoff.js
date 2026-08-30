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
import { screeningSeedForHn } from '@/data/opdScreeningSeed';
import { painLevelByKey, triageLevelByLevel } from '@/data/opdScreeningCatalog';
import { clinicLabel, UNASSIGNED_DOCTOR } from '@/data/unassignedWorklist';

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

/* ค่าที่ "มีความหมาย" — ใช้ตัดสินว่าของจริงมาทับ seed ได้หรือยัง
   `false` ต้องผ่าน (เช่น `declaresPresence: false` = ถามแล้วตอบว่าไม่มี ซึ่งเป็น
   คำตอบจริงที่ต้องชนะ seed) ส่วน `0` / `'0'` ต้องไม่ผ่าน เพราะ VitalsForm seed
   ช่องที่ยังไม่วัดด้วยศูนย์ (เหตุผลเดียวกับ `measured`) */
const isMeaningful = (v) => {
  if (v === undefined || v === null) return false;
  if (typeof v === 'boolean') return true;
  if (Array.isArray(v)) {
    if (v.length === 0) return false;
    /* ฟอร์มซักประวัติ (HistoryListForm/AllergyForm) เปิดมาพร้อมแถวร่างเปล่าหนึ่งแถว
       และ publish ลง store ทันทีที่แตะหมวดนั้น — ถ้านับว่าเป็นข้อมูลจริง แถวเปล่า
       จะไปทับรายการที่ seed ไว้ทั้งชุด แล้วหน้าของแพทย์จะขึ้นว่า "ยังไม่ได้ซัก
       ประวัติหมวดนี้" ทั้งที่ seed มีของอยู่ (พบ 31 ส.ค. 69) */
    const rows = v.filter((r) => r && typeof r === 'object' && 'name' in r);
    if (rows.length === v.length) return v.some((r) => String(r.name || '').trim() !== '');
    return true;
  }
  if (typeof v === 'object') return Object.keys(v).length > 0;
  const t = String(v).trim();
  return t !== '' && Number(t) !== 0;
};

/* รวม seed กับของจริง **ทีละช่อง** ไม่ใช่ทีละหมวด (มติผู้ใช้ 31 ส.ค. 69)

   ของเดิม `{ ...seed, ...live }` ทับกันทั้งก้อน พอพยาบาลเปิดขั้นสัญญาณชีพค้างไว้
   โดยยังไม่กรอก `ScreeningStep1` ก็ publish `vitals` ที่มีแต่ `round` ลง
   sessionStorage แล้ว — หมวด vitals ที่ seed ไว้ทั้งชุดจึงหายไปทันที เหลือแค่
   บรรทัด "รอบที่วัด" ให้หมออ่าน หมวดอื่นก็โดนแบบเดียวกัน

   กติกาใหม่: ของจริงชนะเมื่อช่องนั้นมีค่าจริง ช่องที่ยังว่างตกกลับไปใช้ seed */
const mergeDeep = (seed, live) => {
  if (live === undefined || live === null) return seed;
  if (Array.isArray(live) || Array.isArray(seed)) {
    return isMeaningful(live) ? live : seed;
  }
  if (typeof live !== 'object' || typeof seed !== 'object' || seed === null) {
    return isMeaningful(live) ? live : seed;
  }
  const out = { ...seed };
  Object.entries(live).forEach(([key, value]) => {
    out[key] = mergeDeep(seed[key], value);
  });
  return out;
};

/* `2026-08-30T20:24:37.317Z` อ่านไม่ออกบนหน้าจอหมอ — แปลงเป็นวันที่ไทยแบบเดียว
   กับที่ทุกหน้าใช้ ถ้าแปลงไม่ได้คืนค่าเดิมไว้ ดีกว่าทิ้งเป็นค่าว่าง */
const asThaiDateTime = (iso) => {
  const t = String(iso || '').trim();
  if (!t) return '';
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return t;
  return d.toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
};

export const getCarriedScreening = (patient = {}) => {
  /* ของจริงจากจุดคัดกรองชนะเสมอ — seed เติมเฉพาะช่องที่ยังไม่มีใครกรอก
     (มติผู้ใช้ 28 ส.ค. 69 · ดู opdScreeningSeed.js สำหรับเหตุผลที่กลับมติเดิม) */
  const seed = screeningSeedForHn(patient.hn);
  const live = getScreeningReview(patient.hn) || {};
  const review = mergeDeep(seed, live);
  const symptom = review.symptom || null;
  const vitals = review.vitals || null;
  const captured = Object.keys(review).some((key) => key !== '_meta');

  const pain = painLevelByKey(symptom?.pain);
  const triage = triageLevelByLevel(symptom?.triage);

  /* หัวข้อฝั่งแพทย์ใช้ชุดเดียวกับแท็บในจุดคัดกรอง (แพ้ยา · แพ้อาหาร · แพ้สารเคมี ·
     โรคประจำตัว · อื่น ๆ) แทนการยุบรวมเป็น "การแพ้ยา / สารเคมี" อันเดียว —
     พยาบาลกรอกแยกหมวด หมอก็ควรอ่านแยกหมวดเดียวกัน (มติผู้ใช้ 28 ส.ค. 69) */
  const byTopic = (key, map = (r) => r) => ({
    records: asRecords(review[`allergy.${key}`], map),
    denied: deniedPresence(review[`allergy.${key}`]),
  });
  const withProbability = (r) => ({ ...r, probability: r.status });

  const allergyTopics = {
    drug: byTopic('drug', withProbability),
    food: byTopic('food', withProbability),
    chemical: byTopic('chemical', withProbability),
    other: byTopic('other', withProbability),
    disease: byTopic('disease'),
  };

  const allergyFromScreening = [
    ...allergyTopics.drug.records,
    ...allergyTopics.chemical.records.map((r) => ({ ...r, name: `${r.name} (สารเคมี)` })),
    ...allergyTopics.food.records.map((r) => ({ ...r, name: `${r.name} (อาหาร)` })),
    ...allergyTopics.other.records.map((r) => ({ ...r, name: `${r.name} (อื่น ๆ)` })),
  ];
  const chronicFromScreening = allergyTopics.disease.records;

  return {
    captured,
    capturedAt: asThaiDateTime(review._meta?.updatedAt),
    cc: symptom?.complaint || '',
    duration: symptom?.duration || '',
    presentIllness: symptom?.presentIllness || '',
    triage: triage
      ? { level: triage.lv, label: triage.en, subLabel: triage.th, tone: triage.tone }
      : null,
    /* `tone` ติดมาด้วย เพราะฝั่งที่แสดงผลทำเป็น Badge ตามระดับ ไม่ใช่ข้อความเปล่า
       (มติผู้ใช้ 30 ส.ค. 69) — สีของระดับเป็นของแคตตาล็อก ไม่ใช่ของหน้าจอ */
    pain: pain
      ? { icon: pain.icon, label: pain.label, tone: pain.tone }
      : null,
    /* `othersNote` ("รายละเอียดคำสั่งอื่น ๆ") แยกออกจาก `orders` แล้ว (31 ส.ค. 69)
       — เดิมถูก push ต่อท้ายอาร์เรย์ ทำให้ฝั่งที่ไล่เลข "คำสั่งที่ N" นับหมายเหตุ
       เป็นคำสั่งอีกข้อหนึ่ง ทั้งที่เป็นคำอธิบายของชุดคำสั่ง ไม่ใช่คำสั่ง */
    orders: [...(symptom?.orders || [])],
    othersNote: symptom?.othersNote || '',
    /* ใบรับรองแพทย์ + เตียงสังเกตอาการ ที่พยาบาลระบุไว้ตอนคัดกรอง */
    cert: symptom?.cert ?? null,
    bedId: symptom?.bedId || '',
    vitalRound: vitals?.round || null,
    /* ช่อง "บันทึกเพิ่มเติม" ของขั้นสัญญาณชีพ (ท่าที่วัด · เหตุที่ค่าผิดปกติ ·
       สิ่งที่ผู้ป่วยบอกระหว่างวัด) — เก็บมาตั้งแต่ ScreeningStep1 แต่ไม่เคยถูก
       ส่งต่อให้แพทย์อ่านเลย */
    vitalNote: String(vitals?.note || '').trim(),
    /* ค่าดิบของน้ำหนัก/ส่วนสูง — `vitalItems` เป็นข้อความพร้อมหน่วยไว้แสดงผล
       ฝั่งที่ต้องคำนวณ (ภาวะโภชนาการตาม ToR ๑.๒.๒.๕) ต้องได้ตัวเลขจริง */
    vitalRaw: {
      weight: Number(measured(vitals?.weight)) || null,
      height: Number(measured(vitals?.height)) || null,
      bmi: measured(vitals?.bmi) || '',
    },
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
    /* ขั้น "เลือกคลินิกและแพทย์" — จุดคัดกรองตัดสินใจปลายทางไว้แล้ว แพทย์ที่เปิด
       เคสควรอ่านออกว่าถูกส่งมาที่คลินิกไหน ใครเป็นเจ้าของช่วงเวลา หรือรอคิวรวมอยู่ */
    assignment: review.doctor
      ? {
        /* `clinicLabel` คืน '—' ให้คีย์ที่ไม่รู้จัก — ที่นี่ต้องการค่าว่างแทน
           เพื่อให้แถวหายไปเลยเมื่อยังไม่ได้เลือก ไม่ใช่โชว์ขีด */
        clinic: review.doctor.assignedClinicKey ? clinicLabel(review.doctor.assignedClinicKey) : '',
        doctor: review.doctor.assignedDoctor || '',
        dept: review.doctor.assignedDept || '',
        slot: review.doctor.assignedDoctor === UNASSIGNED_DOCTOR
          ? 'รอแพทย์รับเคสจากคิวรวม'
          : (review.doctor.assignedSlot ? `${review.doctor.assignedSlot} น.` : ''),
      }
      : null,
    /* รายหมวดตามแท็บของจุดคัดกรอง — แต่ละหมวดมีทั้งรายการและสถานะ "ระบุว่าไม่มี" */
    allergyTopics,
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
