/* สถิติการตรวจรักษาของผู้ใช้งานที่ล็อกอิน (My practice statistics)

   ToR ไม่มีข้อไหนสั่ง "แดชบอร์ดรายบุคคลของผู้ให้บริการ" โดยตรง — §1.20 ทั้ง 11 หมวด
   เป็นรายงานระดับหน่วยบริการ/ศูนย์/พื้นที่ทั้งหมด หน้านี้จึงยืนอยู่บน
   §1.20.11 "รายงาน และ Dashboard อื่น ๆ ตามที่สำนักอนามัยกำหนด" คู่กับ
   **มติ คทง.3 ครั้งที่ 7 (10 พ.ย. 68)**: "ทุกระบบงานต้องมี Dashboard ... รายงานและ
   Dashboard ควรเป็นข้อมูลที่ผู้ใช้งานทุกระดับเข้าถึงได้ เพื่อนำไปปรับปรุงงานคุณภาพ"
   โดยตัวเลขทุกตัวเป็น slice "เฉพาะของฉัน" ของข้อที่ ToR สั่งไว้แล้ว:

     §1.20.1.1        จำนวนผู้รับบริการทั้งหมด
     §1.20.5.1–5.3    นัดหมาย / ไม่มาตามนัด / Walk-in
     §1.20.5.4–5.5    จำแนกตามโรค + อันดับโรค (ICD-10)
     §1.20.5.6        ระยะเวลารอคอย
     §1.20.6.1–6.2    จำนวนใบสั่งยา/รายการ + การตีกลับใบยาให้แพทย์
     §1.5.9.1         ชุดคำสั่งการรักษารายแพทย์ (scope personal) + สถิติการใช้

   ความเป็นส่วนตัว: หน้านี้แสดง "ของฉัน" เท่านั้น การเทียบกับเพื่อนร่วมงานใช้เป็น
   **ค่าเฉลี่ยต่อแพทย์แบบไม่ระบุชื่อ** ไม่มีจุดใดที่เปิดผลงานรายคนของคนอื่น

   แหล่งข้อมูล: `SERVICE_VISIT_RECORDS` (dashboardServiceReports) ซึ่งมีฟิลด์
   `doctor` อยู่แล้ว — ไม่สร้างจักรวาล mock ใหม่ ส่วน "เวลาตรวจ" และ "ใบสั่งยา/
   การตีกลับ" ไม่มี store เดิมรองรับ จึง derive ต่อยอดจาก record เดิมแบบ
   deterministic (seed จาก id ของ visit) ตาม playbook §4 — ค่าคงที่ทุก reload */

import { makeRng, between, SERVICE_UNITS, serviceUnitLabel } from '@/data/dashboardCommon';
import { SERVICE_VISIT_RECORDS } from '@/data/dashboardServiceReports';
import { PHCIS_CURRENT_USER } from '@/data/phcisCurrentUser';
import { getOrderSets } from '@/data/treatmentOrderSets';

/* ── ตัวตนของผู้ใช้ที่ล็อกอิน ─────────────────────────────────────────────
   ชื่อแพทย์ในชุดข้อมูลบางโมดูลสะกดไม่ตรงกัน ('รักษ์ดี' vs 'รักษาดี') จึงจับคู่
   ด้วยรายชื่อ alias ไม่ใช่ === ตัวเดียว — ของจริงต้อง join ด้วย staff id */
export const MY_CLINICIAN = {
  id: PHCIS_CURRENT_USER.id,
  name: PHCIS_CURRENT_USER.displayName,
  aliases: [PHCIS_CURRENT_USER.displayName, 'พญ.สมหญิง รักษาดี'],
  center: PHCIS_CURRENT_USER.centerName,
  department: PHCIS_CURRENT_USER.department,
  activity: PHCIS_CURRENT_USER.activity,
};

export const isMine = (row) => MY_CLINICIAN.aliases.includes(row.doctor);

/* ── เวลาตรวจต่อราย (derive) ─────────────────────────────────────────────
   ไม่มีฟิลด์เวลาเริ่ม–สิ้นสุดการตรวจใน record เดิม (มีแต่ระยะเวลา "รอคอย")
   ค่าฐานอิงลักษณะงานจริงของแต่ละหน่วยบริการ แล้วกระจายรอบฐาน ±35% */
const EXAM_BASE_MIN = {
  opd: 12, ncd: 15, anc: 18, epi: 8, dental: 22, mental: 26, rehab: 20, checkup: 10,
};

const hashSeed = (text = '') => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) || 1;
};

/* เหตุผลการตีกลับใบยา — อิง §1.5.4.15 (แจ้งเตือนเอกสารประกอบเพื่อลดการตีกลับ)
   และเงื่อนไขที่เภสัชกรใช้จริงในหน้า /pharmacy */
const RETURN_REASONS = [
  'ต้องแนบเอกสารประกอบการสั่งใช้ยา',
  'ขนาดยาไม่สอดคล้องกับน้ำหนัก/อายุ',
  'ยาหมดจากคลัง — ขอเปลี่ยนรายการทดแทน',
  'รายการซ้ำกับใบสั่งยาเดิมในวันเดียวกัน',
  'สิทธิการรักษาเบิกรายการนี้ไม่ได้',
];

/** ต่อยอด record เดิมด้วย เวลาตรวจ · ใบสั่งยา · การตีกลับ (deterministic) */
const enrich = (row) => {
  const rng = makeRng(hashSeed(row.id));
  const base = EXAM_BASE_MIN[row.unit] || 12;
  const attended = row.visitType !== 'noshow';
  /* ไม่มาตามนัด = ไม่มีการตรวจ จึงไม่มีเวลาตรวจและไม่มีใบสั่งยา */
  const examMinutes = attended
    ? Math.max(4, Math.round(base * (0.65 + rng() * 0.7)))
    : null;
  const hasRx = attended && rng() < 0.82;
  const rxItems = hasRx ? between(rng, 1, 6) : 0;
  const returned = hasRx && rng() < 0.032;
  return {
    ...row,
    examMinutes,
    hasRx,
    rxItems,
    returned,
    returnReason: returned ? RETURN_REASONS[between(rng, 0, RETURN_REASONS.length - 1)] : '',
  };
};

/** การรับบริการทั้งหมด 12 เดือน + ฟิลด์ที่หน้านี้ต้องใช้ (ทุกแพทย์) */
export const PRACTICE_VISIT_RECORDS = SERVICE_VISIT_RECORDS.map(enrich);

/** เฉพาะเคสที่ผู้ใช้ที่ล็อกอินเป็นผู้ตรวจ */
export const MY_VISIT_RECORDS = PRACTICE_VISIT_RECORDS.filter(isMine);

/** หน่วยบริการที่ "ฉัน" มีเคสจริง — ไม่ยัดหน่วยที่ไม่เคยออกตรวจมาให้เลือก */
export const MY_UNIT_OPTIONS = [
  { value: 'all', label: 'ทุกหน่วยบริการ' },
  ...SERVICE_UNITS
    .filter((u) => MY_VISIT_RECORDS.some((r) => r.unit === u.key))
    .map((u) => ({ value: u.key, label: u.label })),
];

/* ── ตัวชี้วัด ───────────────────────────────────────────────────────────── */

export const attendedOf = (rows) => rows.filter((r) => r.visitType !== 'noshow');

/** §1.20.5.6 + เวลาตรวจ — ค่าเฉลี่ยที่ตัดเคสข้อมูลไม่ครบออก */
export const averageOf = (rows, pick) => {
  const values = rows.map(pick).filter((v) => v != null);
  if (!values.length) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
};

/** ภาระงานตามช่วงเวลาในวัน — ใช้วางตารางออกตรวจ (มติ คทง.3: ปรับปรุงงานคุณภาพ) */
export const HOUR_BUCKETS = [
  { key: '07', label: '07:00–09:00', from: 7,  to: 9  },
  { key: '09', label: '09:00–11:00', from: 9,  to: 11 },
  { key: '11', label: '11:00–13:00', from: 11, to: 13 },
  { key: '13', label: '13:00–15:00', from: 13, to: 15 },
  { key: '15', label: '15:00–17:00', from: 15, to: 17 },
];

export const hourlyWorkload = (rows) => {
  const counts = new Map(HOUR_BUCKETS.map((b) => [b.key, 0]));
  rows.forEach((r) => {
    const hour = Number(String(r.arrivedAt || '').slice(0, 2));
    const bucket = HOUR_BUCKETS.find((b) => hour >= b.from && hour < b.to);
    if (bucket) counts.set(bucket.key, counts.get(bucket.key) + 1);
  });
  return HOUR_BUCKETS.map((b) => ({ ...b, value: counts.get(b.key) }));
};

/** ค่าเฉลี่ยต่อแพทย์หนึ่งคนในช่วงนั้น (ไม่ระบุชื่อใคร) — เส้นเทียบของกราฟแนวโน้ม
    `rows` = แถวของแพทย์ทุกคนในช่วงเวลาเดียวกัน ผ่านตัวกรองเดียวกับหน้าจอ */
export const peerAveragePerDoctor = (rows) => {
  const attended = rows.filter((r) => r.visitType !== 'noshow');
  const doctors = new Set(attended.map((r) => r.doctor));
  if (!doctors.size) return 0;
  return Math.round(attended.length / doctors.size);
};

/* ── ช่วงเวลาของกราฟแนวโน้ม ───────────────────────────────────────────────
   ToR §1.20.6.1/6.2 ระบุ "ตามช่วงระยะเวลา (เดือน/ไตรมาส/ปี)" ไว้ตรง ๆ และงาน
   ราชการนับรอบด้วย **ปีงบประมาณ** (ต.ค.–ก.ย.) จึงเพิ่มเป็นตัวเลือกที่สี่
   ไตรมาสในที่นี้เป็นไตรมาส *ปีงบ* (ไตรมาส 1 = ต.ค.–ธ.ค.) ตามที่หน่วยงานใช้จริง */
export const TREND_GRANULARITY_OPTIONS = [
  { key: 'month',   label: 'รายเดือน'       },
  { key: 'quarter', label: 'รายไตรมาส'      },
  { key: 'year',    label: 'รายปี'           },
  { key: 'fiscal',  label: 'รายปีงบประมาณ'  },
];

const THAI_MONTHS_ABBR = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

/** ปีงบประมาณ (พ.ศ.) ของวันที่หนึ่ง ๆ — เริ่ม 1 ต.ค. */
const fiscalYearBe = (year, month) => year + 543 + (month >= 10 ? 1 : 0);

const bucketOf = (iso, granularity) => {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  if (granularity === 'quarter') {
    const q = Math.floor(((month - 10 + 12) % 12) / 3) + 1;
    const fy = fiscalYearBe(year, month);
    return { key: `${fy}-Q${q}`, label: `ไตรมาส ${q}/${String(fy).slice(-2)}`, sortKey: `${fy}-${q}` };
  }
  if (granularity === 'year') {
    const be = year + 543;
    return { key: `y${be}`, label: `พ.ศ. ${be}`, sortKey: String(year) };
  }
  if (granularity === 'fiscal') {
    const fy = fiscalYearBe(year, month);
    return { key: `f${fy}`, label: `ปีงบ ${fy}`, sortKey: String(fy) };
  }
  return {
    key: iso.slice(0, 7),
    label: `${THAI_MONTHS_ABBR[month - 1]}${String(year + 543).slice(-2)}`,
    sortKey: iso.slice(0, 7),
  };
};

/** จัดกลุ่มแถวตามช่วงเวลาที่เลือก → [{ key, label, rows }] เรียงตามเวลา
    `limit` ตัดเอาช่วงล่าสุด n ช่วง (รายเดือนใช้ 12 เพื่อไม่ให้แกนแน่นเกินอ่าน) */
export const bucketRowsByGranularity = (rows, granularity = 'month', limit = null) => {
  const map = new Map();
  rows.forEach((r) => {
    const b = bucketOf(r.iso, granularity);
    const entry = map.get(b.key) || { ...b, rows: [] };
    entry.rows.push(r);
    map.set(b.key, entry);
  });
  const all = [...map.values()].sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)));
  return limit ? all.slice(-limit) : all;
};

/** §1.20.6.1 / §1.20.6.2 — ใบสั่งยา จำนวนรายการ และการตีกลับใบยาให้แพทย์ */
export const prescriptionSummary = (rows) => {
  const rx = rows.filter((r) => r.hasRx);
  const returned = rx.filter((r) => r.returned);
  const items = rx.reduce((s, r) => s + r.rxItems, 0);
  return {
    prescriptions: rx.length,
    items,
    itemsPerRx: rx.length ? Math.round((items / rx.length) * 10) / 10 : 0,
    returned: returned.length,
    /* อัตราต่อ 100 ใบ — เทียบข้ามเดือนได้แม้ปริมาณงานไม่เท่ากัน */
    returnedPer100: rx.length ? Math.round((returned.length / rx.length) * 1000) / 10 : 0,
    returnedRows: returned,
  };
};

/** §1.5.9.1 — ชุดคำสั่งการรักษาส่วนตัวของฉัน + สถิติการใช้
    อ่านผ่าน getOrderSets() ทุกครั้ง เพราะทะเบียนชุดคำสั่งเป็น store ที่แก้ได้
    ระหว่าง session (สร้าง/ลบชุดที่ /treat/order-sets แล้วต้องเห็นผลที่นี่ด้วย) */
export const myOrderSets = () => getOrderSets()
  .filter((s) => s.scope === 'personal' && s.ownerId === MY_CLINICIAN.id)
  .map((s) => ({
    id: s.id,
    name: s.name,
    classificationLabel: s.classificationLabel,
    itemCount: s.items.length,
    useCount: s.useCount || 0,
    lastUsedAt: s.lastUsedAt || '—',
    active: s.active,
  }))
  .sort((a, b) => b.useCount - a.useCount);

/** ป้ายกำกับหน่วยบริการ — re-export ให้หน้าเรียกจากที่เดียว */
export { serviceUnitLabel };
