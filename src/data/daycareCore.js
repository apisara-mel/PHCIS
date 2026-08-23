/* ═══ สถานรับเลี้ยงเด็กกลางวัน (Daycare) — TOR §3.5 · มติ คทง.5 ครั้งที่ 4–5 ══
   โมดูลพี่น้องของงานอนามัยโรงเรียน: กลุ่มเป้าหมายคือ **เด็กปฐมวัย 0–5 ปี**
   ในสถานรับเลี้ยงเด็กกลางวันของ ศบส. ไม่ใช่นักเรียนในโรงเรียน จึงแยกโมดูล
   ตามมติ คทง.5 (เกณฑ์แปลผล ช่วงอายุ กิจกรรม และหน่วยงานปลายทางคนละชุด)

   สิ่งที่ที่ประชุมสั่งไว้และสะท้อนอยู่ในไฟล์นี้:
     • ครั้งที่ 4 — รวมฟิลด์ที่ **กรมกิจการเด็กและเยาวชน (ดย.)** ต้องการไว้ใน
       ระบบเดียวแล้ว export เป็นไฟล์รวมส่งในนามสำนักอนามัย (เดิมเจ้าหน้าที่
       ต้องคีย์ซ้ำสองระบบ: HCIS + ฐานข้อมูลเด็กปฐมวัยของ ดย.)
     • ครั้งที่ 4 — ประเมินพัฒนาการ 2 ครั้ง: "สงสัยล่าช้า" ระบบนัดครั้งที่ 2
       อัตโนมัติ (+1 เดือน) · "ล่าช้า" มีตัวเลือกส่งต่อคลินิกกระตุ้นพัฒนาการ/
       สุขภาพจิต
     • ครั้งที่ 4 — หน้าจอ Monitoring บอกว่าเด็กคนไหนถึงกำหนดทำกิจกรรมอะไร
       ใช้แถบสี (แดง = เกินกำหนด) เพื่อกัน Human Error
     • ครั้งที่ 5 — แจ้งเตือนกิจกรรมประจำเดือน **ล่วงหน้า 1 สัปดาห์** และถ้า
       เลยกำหนดแล้วยังไม่ทำ ให้ค้างการแจ้งเตือนไว้ (ไม่หายไปเอง)
     • ครั้งที่ 5 — ชั่งน้ำหนัก/วัดส่วนสูงทุก 3 เดือน แปลผลอัตโนมัติ + กราฟ
     • ครั้งที่ 4 — ค่าบริการ 10 บาท/วัน **ยังเป็น manual** ที่ประชุมยังไม่ได้
       ข้อสรุป (พยาบาลไม่มีสิทธิ์ใช้ระบบการเงิน) → โมดูลนี้จึงไม่สร้าง flow
       การเงิน แต่แสดงข้อจำกัดไว้บนหน้าจอตามจริง

   ใช้ helper ของ schoolHealthCore ร่วม (readJson/writeJson/วันที่/audit)
   เพื่อไม่ให้เกิด util ซ้ำสองชุดในสองโมดูลที่ทำงานคู่กัน                    */

import {
  readJson, writeJson, nextRunNo, todayIso, addDaysIso, daysBetween,
  formatShDate, formatShDateTime, auditStamp,
} from '@/data/schoolHealthCore';

export {
  readJson, writeJson, todayIso, addDaysIso, daysBetween,
  formatShDate, formatShDateTime, auditStamp,
};

export const DC_KEYS = {
  children: 'mih:dc:children-overlay',
  childRun: 'mih:dc:children-run',
  growth: 'mih:dc:growth-overlay',
  development: 'mih:dc:development-overlay',
  vaccine: 'mih:dc:vaccine-overlay',
  lessons: 'mih:dc:lessons-overlay',
  lessonRun: 'mih:dc:lessons-run',
  referrals: 'mih:dc:referrals',
  exports: 'mih:dc:dcy-export-log',
  ackAlerts: 'mih:dc:alert-acks',
};

/* ─── สถานรับเลี้ยงเด็กกลางวันของ ศบส. ────────────────────────────────── */
export const DAYCARE_CENTERS = [
  { id: 'dc-03', name: 'สถานรับเลี้ยงเด็กกลางวัน ศบส. 3 บางซื่อ', phc: 'ศบส. 3 บางซื่อ', capacity: 60, nurse: 'พว.สุนิสา ทองแท้' },
  { id: 'dc-21', name: 'สถานรับเลี้ยงเด็กกลางวัน ศบส. 21 วัดธาตุทอง', phc: 'ศบส. 21 วัดธาตุทอง', capacity: 45, nurse: 'พว.ณัฐธิดา บุญมั่น' },
];

export const daycareCenterOptions = () =>
  DAYCARE_CENTERS.map((c) => ({ value: c.id, label: c.name }));

export const resolveDaycareCenter = (id) =>
  DAYCARE_CENTERS.find((c) => c.id === id)?.name || '—';

/* ห้อง/กลุ่มอายุ — สถานรับเลี้ยงแบ่งตามช่วงอายุ ไม่ใช่ระดับชั้นแบบโรงเรียน */
export const DC_ROOMS = [
  { value: 'room-baby',    label: 'ห้องเด็กเล็ก (6 เดือน – 1.5 ปี)', minMonths: 6,  maxMonths: 18 },
  { value: 'room-toddler', label: 'ห้องเตาะแตะ (1.5 – 3 ปี)',        minMonths: 18, maxMonths: 36 },
  { value: 'room-pre',     label: 'ห้องเตรียมอนุบาล (3 – 5 ปี)',     minMonths: 36, maxMonths: 60 },
];

export const roomLabel = (v) => DC_ROOMS.find((r) => r.value === v)?.label || v || '—';

/* ─── อายุเป็นเดือน — เกณฑ์เด็กปฐมวัยทุกตัวอิงเดือน ไม่ใช่ปี ────────────── */
export const ageMonthsAt = (birthDate, atIso = todayIso()) => {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const a = new Date(atIso);
  if (Number.isNaN(b.getTime()) || Number.isNaN(a.getTime())) return null;
  let months = (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
  if (a.getDate() < b.getDate()) months -= 1;
  return Math.max(0, months);
};

export const formatAgeMonths = (birthDate, atIso = todayIso()) => {
  const m = ageMonthsAt(birthDate, atIso);
  if (m == null) return '—';
  const y = Math.floor(m / 12);
  const rem = m % 12;
  if (y === 0) return `${rem} เดือน`;
  return rem === 0 ? `${y} ปี` : `${y} ปี ${rem} เดือน`;
};

/* ─── ทะเบียนเด็ก (§3.5.1) ────────────────────────────────────────────────
   ฟิลด์ครอบทั้งที่ ศบส. ใช้เองและที่ ดย. ต้องการ (ดูรายการที่ export ด้านล่าง)
   `dcyFields` คือส่วนที่ ดย. บังคับซึ่ง HCIS เดิมไม่มี จึงต้องคีย์ซ้ำ */
const SEED_CHILDREN = [
  {
    id: 'dcc-0001', centerId: 'dc-21', room: 'room-pre',
    prefix: 'ด.ช.', firstName: 'ปัณณวิชญ์', lastName: 'สุขสวัสดิ์',
    nationalId: '1103704512889', birthDate: '2022-03-14', sex: 'ชาย',
    guardianName: 'นางสาวจันทิมา สุขสวัสดิ์', guardianRelation: 'มารดา', guardianPhone: '081-234-5678',
    address: '45/7 ซ.สุขุมวิท 63 เขตวัฒนา กรุงเทพมหานคร 10110',
    rights: 'สิทธิบัตรทอง (UC เด็ก)', congenital: '-', allergies: 'ไม่มีประวัติแพ้ยา',
    enrolledAt: '2024-05-16', active: true,
    dcyFields: { childType: 'เด็กปกติ', guardianOccupation: 'พนักงานบริษัท', householdIncome: 'ต่ำกว่า 15,000 บาท/เดือน', disability: 'ไม่มี' },
  },
  {
    id: 'dcc-0002', centerId: 'dc-21', room: 'room-toddler',
    prefix: 'ด.ญ.', firstName: 'ไอริณ', lastName: 'พงษ์เจริญ',
    nationalId: '1103704512897', birthDate: '2023-09-02', sex: 'หญิง',
    guardianName: 'นางกาญจนา พงษ์เจริญ', guardianRelation: 'ยาย', guardianPhone: '089-887-1122',
    address: '112 ซ.เอกมัย 12 เขตวัฒนา กรุงเทพมหานคร 10110',
    rights: 'สิทธิบัตรทอง (UC เด็ก)', congenital: 'หอบหืด', allergies: 'แพ้นมวัว',
    enrolledAt: '2025-01-08', active: true,
    dcyFields: { childType: 'เด็กด้อยโอกาส', guardianOccupation: 'รับจ้างทั่วไป', householdIncome: 'ต่ำกว่า 15,000 บาท/เดือน', disability: 'ไม่มี' },
  },
  {
    id: 'dcc-0003', centerId: 'dc-21', room: 'room-baby',
    prefix: 'ด.ช.', firstName: 'กันตพัฒน์', lastName: 'ศรีอารยะ',
    nationalId: '1103704512900', birthDate: '2025-02-20', sex: 'ชาย',
    guardianName: 'นายวีรภัทร ศรีอารยะ', guardianRelation: 'บิดา', guardianPhone: '086-555-9090',
    address: '9/22 ซ.ทองหล่อ 25 เขตวัฒนา กรุงเทพมหานคร 10110',
    rights: 'สิทธิประกันสังคม (ผู้ปกครอง)', congenital: '-', allergies: '-',
    enrolledAt: '2026-03-02', active: true,
    dcyFields: { childType: 'เด็กปกติ', guardianOccupation: 'ค้าขาย', householdIncome: '15,000–30,000 บาท/เดือน', disability: 'ไม่มี' },
  },
  {
    id: 'dcc-0004', centerId: 'dc-03', room: 'room-pre',
    prefix: 'ด.ญ.', firstName: 'ปุณยาพร', lastName: 'มณฑาทิพย์',
    nationalId: '1103704512918', birthDate: '2021-11-30', sex: 'หญิง',
    guardianName: 'นางสาวเบญจมาศ มณฑาทิพย์', guardianRelation: 'มารดา', guardianPhone: '092-441-7788',
    address: '77 ซ.ประชาราษฎร์ 12 เขตบางซื่อ กรุงเทพมหานคร 10800',
    rights: 'สิทธิบัตรทอง (UC เด็ก)', congenital: '-', allergies: '-',
    enrolledAt: '2024-06-03', active: true,
    dcyFields: { childType: 'เด็กปกติ', guardianOccupation: 'ข้าราชการ', householdIncome: 'มากกว่า 30,000 บาท/เดือน', disability: 'ไม่มี' },
  },
];

const childOverlay = () => readJson(DC_KEYS.children, {});

export const getDaycareChildren = ({ centerId, includeInactive = false } = {}) => {
  const overlay = childOverlay();
  const merged = [
    ...SEED_CHILDREN.map((c) => ({ ...c, ...(overlay[c.id] || {}) })),
    ...Object.values(overlay).filter((c) => c && c.id && !SEED_CHILDREN.some((s) => s.id === c.id)),
  ];
  return merged
    .filter((c) => (includeInactive ? true : c.active !== false))
    .filter((c) => (centerId && centerId !== 'all' ? c.centerId === centerId : true));
};

export const getDaycareChild = (id) => getDaycareChildren({ includeInactive: true }).find((c) => c.id === id) || null;

export const childFullName = (c) => (c ? `${c.prefix || ''}${c.firstName} ${c.lastName}`.trim() : '—');

export const saveDaycareChild = (draft) => {
  const overlay = childOverlay();
  const id = draft.id || `dcc-${nextRunNo(DC_KEYS.childRun)}`;
  overlay[id] = { ...(overlay[id] || {}), ...draft, id, active: draft.active !== false, ...auditStamp() };
  writeJson(DC_KEYS.children, overlay);
  return overlay[id];
};

/** จำหน่ายเด็กออกจากสถานรับเลี้ยง (ย้ายออก/เข้าอนุบาล) — ต้องมีเหตุผล */
export const dischargeDaycareChild = (id, reason) => {
  const overlay = childOverlay();
  const base = getDaycareChild(id);
  if (!base) return null;
  overlay[id] = { ...base, ...(overlay[id] || {}), active: false, dischargeReason: reason || 'ไม่ระบุเหตุผล', ...auditStamp() };
  writeJson(DC_KEYS.children, overlay);
  return overlay[id];
};

export const restoreDaycareChild = (id) => {
  const overlay = childOverlay();
  const base = getDaycareChild(id);
  if (!base) return null;
  overlay[id] = { ...base, ...(overlay[id] || {}), active: true, dischargeReason: '', ...auditStamp() };
  writeJson(DC_KEYS.children, overlay);
  return overlay[id];
};

/* ─── โภชนาการ / การเจริญเติบโต (§3.5.2–§3.5.3 · มติ ครั้งที่ 5) ──────────
   ที่ประชุมสั่งชั่ง-วัด **ทุก 3 เดือน** และให้ระบบแปลผลเอง (สูงดีสมส่วน /
   เริ่มอ้วน / ผอม) เกณฑ์เด็ก 0–5 ปีใช้คนละชุดกับ BMI for Age 5–19 ปีของ
   อนามัยโรงเรียน จึงมีตารางของตัวเอง

   ⚠️ ตารางนี้เป็น **mock lookup** ทรง WHO Child Growth Standards (0–5 ปี)
   ยังไม่ผ่านการตรวจสอบกับสำนักอนามัย — ต้องแทนด้วยตาราง LMS จริงก่อน
   production เหมือนที่บันทึกไว้ในโมดูลอนามัยโรงเรียน (§3.4.2)         */

export const GROWTH_INTERVAL_MONTHS = 3;

export const DC_NUTRITION_BANDS = [
  { key: 'severeThin', label: 'ผอมมาก',       style: 'red',    offTarget: true },
  { key: 'thin',       label: 'ผอม',          style: 'orange', offTarget: true },
  { key: 'normal',     label: 'สูงดีสมส่วน',   style: 'green',  offTarget: false },
  { key: 'risk',       label: 'เริ่มอ้วน',     style: 'yellow', offTarget: true },
  { key: 'obese',      label: 'อ้วน',          style: 'red',    offTarget: true },
];

export const nutritionBandMeta = (key) =>
  DC_NUTRITION_BANDS.find((b) => b.key === key) || null;

/* น้ำหนักตามเกณฑ์ส่วนสูง (Weight-for-Height) — ตัวชี้วัดหลักของเด็กปฐมวัย
   ค่าที่ใช้เป็น median โดยประมาณต่อส่วนสูง แล้วเทียบเป็น % ของ median
   (แนวทางเดียวกับที่กรมอนามัยใช้สอนเจ้าหน้าที่หน้างาน) */
const MEDIAN_WEIGHT_BY_HEIGHT = [
  { cm: 60, kg: 6.0 }, { cm: 65, kg: 7.2 }, { cm: 70, kg: 8.4 }, { cm: 75, kg: 9.5 },
  { cm: 80, kg: 10.6 }, { cm: 85, kg: 11.8 }, { cm: 90, kg: 13.0 }, { cm: 95, kg: 14.3 },
  { cm: 100, kg: 15.7 }, { cm: 105, kg: 17.2 }, { cm: 110, kg: 18.9 },
];

const medianWeightFor = (heightCm) => {
  const h = Number(heightCm);
  if (!Number.isFinite(h)) return null;
  if (h <= MEDIAN_WEIGHT_BY_HEIGHT[0].cm) return MEDIAN_WEIGHT_BY_HEIGHT[0].kg;
  const last = MEDIAN_WEIGHT_BY_HEIGHT[MEDIAN_WEIGHT_BY_HEIGHT.length - 1];
  if (h >= last.cm) return last.kg;
  for (let i = 0; i < MEDIAN_WEIGHT_BY_HEIGHT.length - 1; i += 1) {
    const a = MEDIAN_WEIGHT_BY_HEIGHT[i];
    const b = MEDIAN_WEIGHT_BY_HEIGHT[i + 1];
    if (h >= a.cm && h <= b.cm) {
      const ratio = (h - a.cm) / (b.cm - a.cm);
      return a.kg + ratio * (b.kg - a.kg);
    }
  }
  return null;
};

/** แปลผลภาวะโภชนาการอัตโนมัติ — คืน null เมื่อข้อมูลไม่พอ (ไม่เดา) */
export const interpretGrowth = ({ weightKg, heightCm, birthDate, measuredAt } = {}) => {
  const w = Number(weightKg);
  const h = Number(heightCm);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;

  const months = ageMonthsAt(birthDate, measuredAt || todayIso());
  if (months != null && months > 60) {
    return {
      band: null,
      label: 'อายุเกิน 5 ปี — เกณฑ์เด็กปฐมวัยไม่ครอบคลุม',
      style: 'grey',
      offTarget: false,
      note: 'ใช้เกณฑ์ BMI for Age ของงานอนามัยโรงเรียนแทน',
    };
  }

  const median = medianWeightFor(h);
  if (!median) return null;
  const pct = (w / median) * 100;

  let band = 'normal';
  if (pct < 70) band = 'severeThin';
  else if (pct < 85) band = 'thin';
  else if (pct > 120) band = 'obese';
  else if (pct > 110) band = 'risk';

  const meta = nutritionBandMeta(band);
  return {
    band,
    label: meta.label,
    style: meta.style,
    offTarget: meta.offTarget,
    percentOfMedian: Math.round(pct),
    note: `น้ำหนัก ${w} กก. เทียบเกณฑ์ส่วนสูง ${h} ซม. (มัธยฐาน ${median.toFixed(1)} กก.) = ${Math.round(pct)}%`,
  };
};

const SEED_GROWTH = {
  'dcc-0001': [
    { id: 'g-1', measuredAt: '2026-02-14', weightKg: 15.2, heightCm: 98, by: 'พว.ณัฐธิดา บุญมั่น' },
    { id: 'g-2', measuredAt: '2026-05-16', weightKg: 15.9, heightCm: 100, by: 'พว.ณัฐธิดา บุญมั่น' },
  ],
  'dcc-0002': [
    { id: 'g-3', measuredAt: '2026-03-05', weightKg: 9.4, heightCm: 82, by: 'พว.ณัฐธิดา บุญมั่น' },
  ],
  'dcc-0004': [
    { id: 'g-4', measuredAt: '2026-06-10', weightKg: 21.4, heightCm: 104, by: 'พว.สุนิสา ทองแท้' },
  ],
};

export const getGrowthRecords = (childId) => {
  const overlay = readJson(DC_KEYS.growth, {});
  const rows = [...(SEED_GROWTH[childId] || []), ...(overlay[childId] || [])];
  return rows.slice().sort((a, b) => String(b.measuredAt).localeCompare(String(a.measuredAt)));
};

export const addGrowthRecord = (childId, record) => {
  const overlay = readJson(DC_KEYS.growth, {});
  const row = { id: `g-${Date.now()}`, ...record, ...auditStamp() };
  overlay[childId] = [...(overlay[childId] || []), row];
  writeJson(DC_KEYS.growth, overlay);
  return row;
};

/* ─── พัฒนาการ (มติ ครั้งที่ 4 — ประเมิน 2 ครั้ง) ─────────────────────────
   ช่วงอายุที่ต้องประเมินตามคู่มือ DSPM ของเด็กปฐมวัย */
export const DSPM_AGE_POINTS = [9, 18, 30, 42, 60];

export const DEV_RESULTS = [
  { value: 'normal',   label: 'สมวัย',        style: 'green'  },
  { value: 'suspect',  label: 'สงสัยล่าช้า',  style: 'yellow' },
  { value: 'delayed',  label: 'ล่าช้า',       style: 'red'    },
];

export const devResultMeta = (v) => DEV_RESULTS.find((r) => r.value === v) || null;

const SEED_DEVELOPMENT = {
  'dcc-0001': [
    { id: 'd-1', round: 1, assessedAt: '2026-04-02', ageMonths: 48, result: 'normal', note: 'พัฒนาการครบทั้ง 5 ด้าน', by: 'พว.ณัฐธิดา บุญมั่น' },
  ],
  'dcc-0002': [
    { id: 'd-2', round: 1, assessedAt: '2026-07-15', ageMonths: 34, result: 'suspect', note: 'ด้านภาษาช้ากว่าเกณฑ์ — แนะนำผู้ปกครองกระตุ้นที่บ้าน', by: 'พว.ณัฐธิดา บุญมั่น', followUpDue: '2026-08-15' },
  ],
};

export const getDevelopmentRecords = (childId) => {
  const overlay = readJson(DC_KEYS.development, {});
  const rows = [...(SEED_DEVELOPMENT[childId] || []), ...(overlay[childId] || [])];
  return rows.slice().sort((a, b) => String(b.assessedAt).localeCompare(String(a.assessedAt)));
};

/** บันทึกผลประเมิน — "สงสัยล่าช้า" ระบบนัดครั้งที่ 2 ให้เอง +1 เดือน (มติ) */
export const addDevelopmentRecord = (childId, record) => {
  const overlay = readJson(DC_KEYS.development, {});
  const existing = getDevelopmentRecords(childId);
  const round = record.round || (existing.length + 1);
  const row = {
    id: `d-${Date.now()}`,
    round,
    ...record,
    followUpDue: record.result === 'suspect'
      ? addDaysIso(record.assessedAt || todayIso(), 30)
      : '',
    needsReferral: record.result === 'delayed',
    ...auditStamp(),
  };
  overlay[childId] = [...(overlay[childId] || []), row];
  writeJson(DC_KEYS.development, overlay);
  return row;
};

/* ─── วัคซีน (มติ ครั้งที่ 5 — เตือนล่วงหน้า 1 สัปดาห์) ──────────────────── */
export const EPI_SCHEDULE = [
  { key: 'bcg',     label: 'BCG',              dueMonths: 0  },
  { key: 'hbv1',    label: 'HB1',              dueMonths: 0  },
  { key: 'dtp1',    label: 'DTP-HB-Hib 1',     dueMonths: 2  },
  { key: 'dtp2',    label: 'DTP-HB-Hib 2',     dueMonths: 4  },
  { key: 'dtp3',    label: 'DTP-HB-Hib 3',     dueMonths: 6  },
  { key: 'mmr1',    label: 'MMR 1',            dueMonths: 9  },
  { key: 'je1',     label: 'JE 1',             dueMonths: 12 },
  { key: 'dtp4',    label: 'DTP 4 (กระตุ้น)',  dueMonths: 18 },
  { key: 'mmr2',    label: 'MMR 2',            dueMonths: 18 },
  { key: 'je2',     label: 'JE 2',             dueMonths: 30 },
  { key: 'dtp5',    label: 'DTP 5 (กระตุ้น)',  dueMonths: 48 },
];

const SEED_VACCINE = {
  'dcc-0002': { bcg: '2023-09-03', hbv1: '2023-09-03', dtp1: '2023-11-08', dtp2: '2024-01-10', dtp3: '2024-03-12', mmr1: '2024-06-14' },
  'dcc-0001': { bcg: '2022-03-15', hbv1: '2022-03-15', dtp1: '2022-05-18', dtp2: '2022-07-20', dtp3: '2022-09-21', mmr1: '2022-12-16', je1: '2023-03-20', dtp4: '2023-09-25', mmr2: '2023-09-25' },
};

export const getVaccineRecord = (childId) => ({
  ...(SEED_VACCINE[childId] || {}),
  ...((readJson(DC_KEYS.vaccine, {})[childId]) || {}),
});

export const setVaccineDate = (childId, key, dateIso) => {
  const overlay = readJson(DC_KEYS.vaccine, {});
  overlay[childId] = { ...(overlay[childId] || {}), [key]: dateIso };
  writeJson(DC_KEYS.vaccine, overlay);
  return overlay[childId];
};

/* ─── กิจกรรมการเรียนการสอนรายวัน (§3.5.4–§3.5.5) ─────────────────────── */
export const LESSON_DOMAINS = [
  { value: 'motor',    label: 'กล้ามเนื้อมัดใหญ่/มัดเล็ก' },
  { value: 'language', label: 'ภาษาและการสื่อสาร' },
  { value: 'social',   label: 'สังคมและอารมณ์' },
  { value: 'cognitive',label: 'สติปัญญาและการเรียนรู้' },
  { value: 'selfhelp', label: 'การช่วยเหลือตนเอง' },
  { value: 'health',   label: 'สุขนิสัยและความปลอดภัย' },
];

export const lessonDomainLabel = (v) => LESSON_DOMAINS.find((d) => d.value === v)?.label || v || '—';

const SEED_LESSONS = [
  { id: 'ls-0001', centerId: 'dc-21', room: 'room-pre', date: '2026-08-21', domain: 'motor', topic: 'เดินทรงตัวบนเส้น + โยนรับลูกบอล', detail: 'เด็กเข้าร่วม 12 คน · ปุณณวิชญ์ทรงตัวได้ดีขึ้นจากสัปดาห์ก่อน', by: 'ครูพี่เลี้ยง อรวรรณ ใจงาม' },
  { id: 'ls-0002', centerId: 'dc-21', room: 'room-toddler', date: '2026-08-21', domain: 'language', topic: 'นิทานภาพ "ผักของหนู" + ชี้ชื่อผัก', detail: 'ไอรินยังไม่พูดตามคำ 2 พยางค์ — บันทึกไว้ประกอบการประเมินพัฒนาการ', by: 'ครูพี่เลี้ยง สุดารัตน์ พิมพ์ทอง' },
  { id: 'ls-0003', centerId: 'dc-21', room: 'room-pre', date: '2026-08-20', domain: 'health', topic: 'ฝึกแปรงฟันหลังอาหารกลางวัน', detail: 'สาธิตวิธีแปรงฟัน 2 นาที เด็กทำตามได้ 10/12 คน', by: 'พว.ณัฐธิดา บุญมั่น' },
  { id: 'ls-0004', centerId: 'dc-03', room: 'room-pre', date: '2026-08-20', domain: 'cognitive', topic: 'จับคู่รูปทรงและสี', detail: 'เด็กเข้าร่วม 15 คน', by: 'ครูพี่เลี้ยง วิภาดา สมบูรณ์' },
];

export const getLessons = ({ centerId, room, from, to } = {}) => {
  const overlay = readJson(DC_KEYS.lessons, {});
  const rows = [...SEED_LESSONS, ...Object.values(overlay)];
  return rows
    .filter((l) => (centerId && centerId !== 'all' ? l.centerId === centerId : true))
    .filter((l) => (room && room !== 'all' ? l.room === room : true))
    .filter((l) => (from ? String(l.date) >= from : true))
    .filter((l) => (to ? String(l.date) <= to : true))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
};

export const saveLesson = (draft) => {
  const overlay = readJson(DC_KEYS.lessons, {});
  const id = draft.id || `ls-${nextRunNo(DC_KEYS.lessonRun)}`;
  overlay[id] = { ...(overlay[id] || {}), ...draft, id, ...auditStamp() };
  writeJson(DC_KEYS.lessons, overlay);
  return overlay[id];
};

export const cancelLesson = (id, reason) => {
  const overlay = readJson(DC_KEYS.lessons, {});
  const base = overlay[id] || SEED_LESSONS.find((l) => l.id === id);
  if (!base) return null;
  overlay[id] = { ...base, cancelled: true, cancelReason: reason || 'ไม่ระบุเหตุผล', ...auditStamp() };
  writeJson(DC_KEYS.lessons, overlay);
  return overlay[id];
};

/* ─── ส่งต่อเข้ารับบริการที่ ศบส. (§3.5.6 — เชื่อม PHCIS) ─────────────────
   ส่งต่อจากสถานรับเลี้ยง → คลินิกใน ศบส. โดยไม่ต้องเปิด Visit ใหม่เอง
   (พยาบาลประจำสถานรับเลี้ยงเป็นผู้ส่ง จุดปลายทางเป็นคนรับเข้าคิว) */
export const REFERRAL_TARGETS = [
  { value: '/clinic/immunization', label: 'คลินิกสุขภาพเด็กดี / สร้างเสริมภูมิคุ้มกัน' },
  { value: '/clinic/dental',       label: 'คลินิกทันตกรรม' },
  { value: '/clinic/mental-health',label: 'คลินิกกระตุ้นพัฒนาการ / สุขภาพจิต' },
  { value: '/clinic/ncd',          label: 'คลินิกโรคเฉพาะ (NCD)' },
  { value: '/opd/queue',           label: 'ห้องตรวจ OPD ทั่วไป' },
];

export const referralTargetLabel = (v) => REFERRAL_TARGETS.find((t) => t.value === v)?.label || v;

export const getReferrals = (childId) => {
  const store = readJson(DC_KEYS.referrals, {});
  return childId ? (store[childId] || []) : Object.entries(store).flatMap(([id, rows]) => rows.map((r) => ({ ...r, childId: id })));
};

export const addReferral = (childId, { target, reason }) => {
  const store = readJson(DC_KEYS.referrals, {});
  const row = {
    id: `ref-${Date.now()}`,
    target,
    targetLabel: referralTargetLabel(target),
    reason: (reason || '').trim() || 'ไม่ระบุเหตุผล',
    status: 'sent',
    ...auditStamp(),
  };
  store[childId] = [...(store[childId] || []), row];
  writeJson(DC_KEYS.referrals, store);
  return row;
};

export const cancelReferral = (childId, refId, reason) => {
  const store = readJson(DC_KEYS.referrals, {});
  store[childId] = (store[childId] || []).map((r) => (
    r.id === refId ? { ...r, status: 'cancelled', cancelReason: reason || 'ไม่ระบุเหตุผล', ...auditStamp() } : r
  ));
  writeJson(DC_KEYS.referrals, store);
  return store[childId];
};

/* ─── Monitoring: กิจกรรมที่ถึงกำหนด/เกินกำหนด (มติ ครั้งที่ 4–5) ─────────
   หัวใจของมติ: "แจ้งเตือนล่วงหน้า 1 สัปดาห์ · เลยกำหนดแล้วให้ค้างไว้"
   สถานะ 3 ระดับ  upcoming (ภายใน 7 วัน) · due (ถึงกำหนดวันนี้) · overdue
   overdue ไม่หายไปเองจนกว่าจะบันทึกกิจกรรมนั้นจริง                       */
export const ALERT_LEAD_DAYS = 7;

export const ALERT_LEVELS = {
  upcoming: { label: 'ใกล้ถึงกำหนด', style: 'yellow', rank: 1 },
  due:      { label: 'ถึงกำหนดแล้ว', style: 'orange', rank: 2 },
  overdue:  { label: 'เกินกำหนด',    style: 'red',    rank: 3 },
};

const levelFor = (dueIso, today = todayIso()) => {
  const diff = daysBetween(today, dueIso);
  if (diff == null) return null;
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'due';
  if (diff <= ALERT_LEAD_DAYS) return 'upcoming';
  return null;
};

/** รายการกิจกรรมที่ต้องทำของเด็กหนึ่งคน (โภชนาการ · พัฒนาการ · วัคซีน) */
export const getChildAlerts = (child, today = todayIso()) => {
  if (!child || child.active === false) return [];
  const alerts = [];

  /* 1. ชั่งน้ำหนัก/วัดส่วนสูง ทุก 3 เดือน */
  const growth = getGrowthRecords(child.id);
  const lastGrowth = growth[0]?.measuredAt || child.enrolledAt;
  if (lastGrowth) {
    const due = addDaysIso(lastGrowth, GROWTH_INTERVAL_MONTHS * 30);
    const level = levelFor(due, today);
    if (level) {
      alerts.push({
        key: `${child.id}:growth`, kind: 'growth', kindLabel: 'ชั่งน้ำหนัก/วัดส่วนสูง',
        dueIso: due, level,
        detail: growth[0]
          ? `ชั่งครั้งล่าสุด ${formatShDate(lastGrowth)} — ครบรอบ 3 เดือน`
          : 'ยังไม่เคยชั่งน้ำหนักหลังรับเข้าสถานรับเลี้ยง',
      });
    }
  }

  /* 2. ประเมินพัฒนาการ — ทั้งรอบตามอายุ และนัดครั้งที่ 2 กรณีสงสัยล่าช้า */
  const dev = getDevelopmentRecords(child.id);
  const pendingFollowUp = dev.find((d) => d.followUpDue && !dev.some((x) => x.round > d.round));
  if (pendingFollowUp) {
    const level = levelFor(pendingFollowUp.followUpDue, today);
    if (level) {
      alerts.push({
        key: `${child.id}:dev-followup`, kind: 'development', kindLabel: 'ประเมินพัฒนาการครั้งที่ 2',
        dueIso: pendingFollowUp.followUpDue, level,
        detail: `ผลครั้งที่ ${pendingFollowUp.round} = สงสัยล่าช้า — ระบบนัดประเมินซ้ำอัตโนมัติตามมติ คทง.5`,
      });
    }
  } else {
    const months = ageMonthsAt(child.birthDate, today);
    const nextPoint = DSPM_AGE_POINTS.find((p) => p >= (months ?? 0)
      && !dev.some((d) => Math.abs((d.ageMonths ?? -99) - p) <= 2));
    if (nextPoint != null && child.birthDate) {
      const due = addDaysIso(child.birthDate, nextPoint * 30);
      const level = levelFor(due, today);
      if (level) {
        alerts.push({
          key: `${child.id}:dev-${nextPoint}`, kind: 'development', kindLabel: `ประเมินพัฒนาการ (ช่วง ${nextPoint} เดือน)`,
          dueIso: due, level,
          detail: `ตามคู่มือ DSPM เด็กควรได้รับการประเมินเมื่ออายุ ${nextPoint} เดือน`,
        });
      }
    }
  }

  /* 3. วัคซีนตามช่วงอายุที่ยังไม่ได้บันทึกวันฉีด
     ⚠️ แยกสองกรณีโดยตั้งใจ ไม่งั้นเด็กที่เข้าสถานรับเลี้ยงตอน 4 ขวบและไม่มี
     ประวัติวัคซีนในระบบ จะขึ้นเตือน "เกินกำหนด" 11 รายการย้อนไปถึงปีที่เกิด
     ซึ่งเป็น alert fatigue เต็ม ๆ — ตรงข้ามกับเจตนาของมติที่ต้องการ "กัน
     Human Error" ไม่ใช่ท่วมหน้าจอจนเจ้าหน้าที่เลิกอ่าน

       • เข็มที่ครบกำหนด **ก่อนเด็กเข้าสถานรับเลี้ยง** = ประวัติเดิมจากคลินิก
         เด็กดี/ผู้ปกครอง ไม่ใช่งานที่สถานรับเลี้ยงทำหลุด → ยุบเป็นแถวเดียว
         "ประวัติวัคซีนก่อนเข้าสถานรับเลี้ยงไม่ครบ" ให้ไปตามเอกสารมาลง
       • เข็มที่ครบกำหนด **ระหว่างอยู่ในความดูแล** = ความรับผิดชอบของสถาน
         รับเลี้ยงจริง → เตือนรายเข็มตามมติ (ล่วงหน้า 1 สัปดาห์ + ค้างเมื่อเกิน) */
  const vaccine = getVaccineRecord(child.id);
  const enrolled = child.enrolledAt || child.birthDate;
  const backlog = [];
  EPI_SCHEDULE.forEach((v) => {
    if (vaccine[v.key] || !child.birthDate) return;
    const due = addDaysIso(child.birthDate, v.dueMonths * 30);

    if (enrolled && due < enrolled) {
      backlog.push(v);
      return;
    }

    const level = levelFor(due, today);
    if (level) {
      alerts.push({
        key: `${child.id}:vac-${v.key}`, kind: 'vaccine', kindLabel: `วัคซีน ${v.label}`,
        dueIso: due, level,
        detail: `กำหนดตามอายุ ${v.dueMonths} เดือน — ยังไม่มีบันทึกวันฉีดในระบบ`,
      });
    }
  });

  if (backlog.length) {
    alerts.push({
      key: `${child.id}:vac-backlog`, kind: 'vaccine',
      kindLabel: `ประวัติวัคซีนก่อนเข้าสถานรับเลี้ยงไม่ครบ (${backlog.length} เข็ม)`,
      dueIso: enrolled, level: 'overdue',
      detail: `ยังไม่มีบันทึกวันฉีด: ${backlog.map((v) => v.label).join(' · ')} — `
        + 'ขอสมุดวัคซีนจากผู้ปกครองมาลงย้อนหลัง หรือส่งต่อคลินิกเด็กดีเพื่อฉีดเก็บตก',
    });
  }

  return alerts.sort((a, b) => ALERT_LEVELS[b.level].rank - ALERT_LEVELS[a.level].rank
    || String(a.dueIso).localeCompare(String(b.dueIso)));
};

/** รวมทุกคนในสถานรับเลี้ยง — ใช้บนหน้า Monitoring และ pop-up ตอนเปิดหน้าแรก */
export const getCenterAlerts = ({ centerId } = {}, today = todayIso()) =>
  getDaycareChildren({ centerId }).flatMap((child) => getChildAlerts(child, today).map((a) => ({
    ...a,
    childId: child.id,
    childName: childFullName(child),
    room: child.room,
    centerId: child.centerId,
  })))
    .sort((a, b) => ALERT_LEVELS[b.level].rank - ALERT_LEVELS[a.level].rank
      || String(a.dueIso).localeCompare(String(b.dueIso)));

/* ─── Export ให้ ดย. (มติ ครั้งที่ 4) ────────────────────────────────────
   รวมฟิลด์ที่ ดย. ต้องการไว้ชุดเดียวแล้วส่งออกเป็นไฟล์รวมในนามสำนักอนามัย
   เพื่อเลิกคีย์ซ้ำสองระบบ — ที่นี่คืนเป็น rows ให้ ExportFormatPopup ใช้ต่อ */
export const DCY_EXPORT_COLUMNS = [
  { key: 'nationalId',       label: 'เลขประจำตัวประชาชน' },
  { key: 'fullName',         label: 'ชื่อ-นามสกุล' },
  { key: 'sex',              label: 'เพศ' },
  { key: 'birthDate',        label: 'วันเกิด' },
  { key: 'ageLabel',         label: 'อายุ' },
  { key: 'centerName',       label: 'สถานรับเลี้ยงเด็ก' },
  { key: 'roomLabel',        label: 'ห้อง/กลุ่มอายุ' },
  { key: 'childType',        label: 'ประเภทเด็ก (ดย.)' },
  { key: 'guardianName',     label: 'ผู้ปกครอง' },
  { key: 'guardianRelation', label: 'ความสัมพันธ์' },
  { key: 'guardianOccupation', label: 'อาชีพผู้ปกครอง (ดย.)' },
  { key: 'householdIncome',  label: 'รายได้ครัวเรือน (ดย.)' },
  { key: 'disability',       label: 'ความพิการ (ดย.)' },
  { key: 'nutritionLabel',   label: 'ภาวะโภชนาการล่าสุด' },
  { key: 'developmentLabel', label: 'ผลประเมินพัฒนาการล่าสุด' },
  { key: 'vaccineComplete',  label: 'วัคซีนครบตามเกณฑ์อายุ' },
];

export const buildDcyExportRows = ({ centerId } = {}) =>
  getDaycareChildren({ centerId }).map((c) => {
    const growth = getGrowthRecords(c.id)[0];
    const interpreted = growth ? interpretGrowth({ ...growth, birthDate: c.birthDate }) : null;
    const dev = getDevelopmentRecords(c.id)[0];
    const alerts = getChildAlerts(c);
    return {
      id: c.id,
      nationalId: c.nationalId,
      fullName: childFullName(c),
      sex: c.sex,
      birthDate: formatShDate(c.birthDate),
      ageLabel: formatAgeMonths(c.birthDate),
      centerName: resolveDaycareCenter(c.centerId),
      roomLabel: roomLabel(c.room),
      childType: c.dcyFields?.childType || '—',
      guardianName: c.guardianName,
      guardianRelation: c.guardianRelation,
      guardianOccupation: c.dcyFields?.guardianOccupation || '—',
      householdIncome: c.dcyFields?.householdIncome || '—',
      disability: c.dcyFields?.disability || '—',
      nutritionLabel: interpreted?.label || 'ยังไม่มีผล',
      developmentLabel: dev ? (devResultMeta(dev.result)?.label || dev.result) : 'ยังไม่ประเมิน',
      vaccineComplete: alerts.some((a) => a.kind === 'vaccine') ? 'ไม่ครบ' : 'ครบ',
    };
  });

export const logDcyExport = ({ centerId, format, rows }) => {
  const log = readJson(DC_KEYS.exports, []);
  const entry = { id: `exp-${Date.now()}`, centerId, format, rowCount: rows, ...auditStamp() };
  writeJson(DC_KEYS.exports, [entry, ...log]);
  return entry;
};

export const getDcyExportLog = () => readJson(DC_KEYS.exports, []);

/* ─── ค่าบริการ 10 บาท/วัน — ข้อจำกัดที่ยังไม่มีข้อสรุป (มติ ครั้งที่ 4) ─── */
export const DAILY_FEE_NOTICE = 'การเก็บค่าบริการ 10 บาท/วัน ยังเป็นกระบวนการนอกระบบ (Manual) '
  + 'เนื่องจากพยาบาลประจำสถานรับเลี้ยงไม่ใช่บุคลากรด้านการเงินและไม่มีสิทธิ์ใช้ระบบการเงิน — '
  + 'ที่ประชุม คทง.5 ครั้งที่ 4 ยังไม่ได้ข้อสรุป ต้องหารือกับคณะทำงานด้านการเบิกจ่ายและฝ่ายการเงินก่อน';

/* ─── เกณฑ์อ้างอิงสำหรับกราฟการเจริญเติบโต 0–60 เดือน (§3.5.3) ───────────
   ทรง WHO Child Growth Standards — mock lookup เช่นเดียวกับตารางด้านบน
   ใช้กับ GrowthPercentileChart ของโมดูล immunization (ไม่ fork กราฟใหม่) */
export const WEIGHT_FOR_AGE_REF = [
  { x: 0,  p3: 2.5, p50: 3.3,  p97: 4.4 },
  { x: 6,  p3: 6.4, p50: 7.9,  p97: 9.8 },
  { x: 12, p3: 7.7, p50: 9.6,  p97: 12.0 },
  { x: 18, p3: 8.8, p50: 10.9, p97: 13.7 },
  { x: 24, p3: 9.7, p50: 12.2, p97: 15.3 },
  { x: 36, p3: 11.3, p50: 14.3, p97: 18.3 },
  { x: 48, p3: 12.7, p50: 16.3, p97: 21.2 },
  { x: 60, p3: 14.1, p50: 18.3, p97: 24.2 },
];

export const HEIGHT_FOR_AGE_REF = [
  { x: 0,  p3: 46.1, p50: 49.9, p97: 53.7 },
  { x: 6,  p3: 63.3, p50: 67.6, p97: 71.9 },
  { x: 12, p3: 71.0, p50: 75.7, p97: 80.5 },
  { x: 18, p3: 76.9, p50: 82.3, p97: 87.7 },
  { x: 24, p3: 81.7, p50: 87.8, p97: 93.9 },
  { x: 36, p3: 88.7, p50: 96.1, p97: 103.5 },
  { x: 48, p3: 94.9, p50: 103.3, p97: 111.7 },
  { x: 60, p3: 100.7, p50: 110.0, p97: 119.2 },
];

/** จุดของเด็กบนกราฟ — x = อายุ(เดือน) ตอนวัด, y = ค่าที่วัดได้ */
export const growthChartPoints = (child, field = 'weightKg') =>
  getGrowthRecords(child?.id)
    .map((g) => ({
      x: ageMonthsAt(child?.birthDate, g.measuredAt),
      y: Number(g[field]),
      label: formatShDate(g.measuredAt),
    }))
    .filter((p) => p.x != null && Number.isFinite(p.y))
    .sort((a, b) => a.x - b.x);
