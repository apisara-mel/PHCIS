/* PHCIS | EMR §1.4.3.11 — ประวัติการฉีดวัคซีน (แสดง + บันทึก + แก้ไข + ยกเลิก)
   §1.4.3.10 — กราฟการเจริญเติบโต (percentile band)

   ⚠ ตาราง percentile ด้านล่างเป็น "ค่าประมาณสำหรับ prototype" ที่ย่อมาจาก
   เกณฑ์อ้างอิงการเจริญเติบโตของเด็กไทย (สมาคมต่อมไร้ท่อเด็กและวัยรุ่นไทย)
   เพื่อให้กราฟมีแถบ P3–P97 ให้ดูรูปทรงถูกต้อง — ห้ามนำไปใช้ทางคลินิกจริง
   จนกว่าจะ import ตารางฉบับเต็มจากแหล่งอ้างอิง. */

import { CURRENT_CLINICIAN, stampNow, appendAudit } from '@/data/treatmentAudit';

/* ── ตาราง EPI (กระทรวงสาธารณสุข) แบบย่อ — ใช้เช็ค "เกินกำหนด" ── */
export const EPI_SCHEDULE = [
  { key: 'bcg',      vaccine: 'BCG (วัณโรค)',                     dose: 1, dueMonths: 0   },
  { key: 'hbv-1',    vaccine: 'HB (ตับอักเสบบี)',                  dose: 1, dueMonths: 0   },
  { key: 'dtp-hb-1', vaccine: 'DTP-HB-Hib เข็มที่ 1',              dose: 1, dueMonths: 2   },
  { key: 'opv-1',    vaccine: 'OPV (โปลิโอชนิดหยอด) เข็มที่ 1',    dose: 1, dueMonths: 2   },
  { key: 'dtp-hb-2', vaccine: 'DTP-HB-Hib เข็มที่ 2',              dose: 2, dueMonths: 4   },
  { key: 'dtp-hb-3', vaccine: 'DTP-HB-Hib เข็มที่ 3',              dose: 3, dueMonths: 6   },
  { key: 'mmr-1',    vaccine: 'MMR (หัด-คางทูม-หัดเยอรมัน) เข็มที่ 1', dose: 1, dueMonths: 9   },
  { key: 'je-1',     vaccine: 'JE (ไข้สมองอักเสบ) เข็มที่ 1',      dose: 1, dueMonths: 12  },
  { key: 'mmr-2',    vaccine: 'MMR เข็มที่ 2',                     dose: 2, dueMonths: 30  },
  { key: 'dtp-4',    vaccine: 'DTP กระตุ้นเข็มที่ 4',              dose: 4, dueMonths: 18  },
  { key: 'dtp-5',    vaccine: 'DTP กระตุ้นเข็มที่ 5',              dose: 5, dueMonths: 48  },
  { key: 'flu',      vaccine: 'ไข้หวัดใหญ่ตามฤดูกาล',              dose: 1, dueMonths: null, annual: true },
  { key: 'td',       vaccine: 'dT (คอตีบ-บาดทะยัก) กระตุ้นผู้ใหญ่', dose: 1, dueMonths: null, everyYears: 10 },
];

export const VACCINE_OPTIONS = EPI_SCHEDULE.map((s) => ({ value: s.key, label: s.vaccine }));

export const VACCINE_REACTION_SUGGESTIONS = [
  'ไม่พบปฏิกิริยาหลังฉีด สังเกตอาการ 30 นาทีแล้วปกติ',
  'ปวดบวมแดงบริเวณที่ฉีดเล็กน้อย หายเองภายใน 2 วัน',
  'มีไข้ต่ำ ๆ ภายใน 24 ชั่วโมงแรก ให้ยาลดไข้แล้วอาการดีขึ้น',
  'งอแง เบื่ออาหารเล็กน้อย 1 วัน ไม่ต้องรักษาเพิ่มเติม',
];

export const VACCINE_CANCEL_SUGGESTIONS = [
  'บันทึกผิดคน — ยกเลิกรายการนี้และบันทึกใหม่ให้ถูกต้อง',
  'บันทึกเข็มซ้ำโดยไม่ตั้งใจ',
  'ระบุ Lot / วันที่ฉีดผิด จึงยกเลิกและบันทึกใหม่',
];

let seq = 0;
const uid = () => `vac-${Date.now().toString(36)}-${(seq += 1)}`;

const VACCINES = [
  {
    id: 'vac-seed-1', hn: '67-00001', epiKey: 'flu', vaccine: 'ไข้หวัดใหญ่ตามฤดูกาล',
    doseNo: 1, injectedOn: '18 มิถุนายน 2568', lot: 'FLU-2568-A21', expiry: '30 เมษายน 2569',
    injectedBy: 'พว.มานพ เกษมสุข', unit: 'ศูนย์บริการสาธารณสุข 4 ดินแดง',
    site: 'ต้นแขนซ้าย (IM)', reaction: 'ไม่พบปฏิกิริยาหลังฉีด สังเกตอาการ 30 นาทีแล้วปกติ',
    ageMonthsAtDose: null, overdueDays: 0,
    recordedBy: 'พว.มานพ เกษมสุข', recordedAt: '18 มิ.ย. 2568 · 10:12', amendedAt: '',
    cancelledAt: '', cancelReason: '',
  },
  {
    id: 'vac-seed-2', hn: '67-00001', epiKey: 'td', vaccine: 'dT (คอตีบ-บาดทะยัก) กระตุ้นผู้ใหญ่',
    doseNo: 1, injectedOn: '4 กุมภาพันธ์ 2567', lot: 'DT-2567-C08', expiry: '31 ธันวาคม 2568',
    injectedBy: 'พว.สุชาดา แก้วมณี', unit: 'ศูนย์บริการสาธารณสุข 4 ดินแดง',
    site: 'ต้นแขนขวา (IM)', reaction: 'ปวดบวมแดงบริเวณที่ฉีดเล็กน้อย หายเองภายใน 2 วัน',
    ageMonthsAtDose: null, overdueDays: 0,
    recordedBy: 'พว.สุชาดา แก้วมณี', recordedAt: '4 ก.พ. 2567 · 14:36', amendedAt: '',
    cancelledAt: '', cancelReason: '',
  },
  {
    id: 'vac-seed-3', hn: '67-00026', epiKey: 'mmr-1', vaccine: 'MMR (หัด-คางทูม-หัดเยอรมัน) เข็มที่ 1',
    doseNo: 1, injectedOn: '20 มีนาคม 2569', lot: 'MMR-2569-B14', expiry: '30 กันยายน 2570',
    injectedBy: 'พว.มานพ เกษมสุข', unit: 'ศูนย์บริการสาธารณสุข 4 ดินแดง',
    site: 'ต้นขาซ้าย (SC)', reaction: 'มีไข้ต่ำ ๆ ภายใน 24 ชั่วโมงแรก ให้ยาลดไข้แล้วอาการดีขึ้น',
    ageMonthsAtDose: 11, overdueDays: 61,
    recordedBy: 'พว.มานพ เกษมสุข', recordedAt: '20 มี.ค. 2569 · 09:48', amendedAt: '',
    cancelledAt: '', cancelReason: '',
  },
  {
    id: 'vac-seed-4', hn: '67-00026', epiKey: 'dtp-hb-3', vaccine: 'DTP-HB-Hib เข็มที่ 3',
    doseNo: 3, injectedOn: '12 ตุลาคม 2568', lot: 'DTP-2568-K02', expiry: '31 พฤษภาคม 2570',
    injectedBy: 'พว.สุชาดา แก้วมณี', unit: 'ศูนย์บริการสาธารณสุข 4 ดินแดง',
    site: 'ต้นขาขวา (IM)', reaction: 'งอแง เบื่ออาหารเล็กน้อย 1 วัน ไม่ต้องรักษาเพิ่มเติม',
    ageMonthsAtDose: 6, overdueDays: 0,
    recordedBy: 'พว.สุชาดา แก้วมณี', recordedAt: '12 ต.ค. 2568 · 11:02', amendedAt: '',
    cancelledAt: '', cancelReason: '',
  },
];

const listeners = new Set();
const emit = () => { listeners.forEach((fn) => fn(VACCINES)); };

export const subscribeVaccines = (fn) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

export const vaccinesForPatient = (hn) => VACCINES
  .filter((v) => v.hn === hn)
  .map((v) => ({ ...v }));

/* เตือนก่อนบันทึกซ้ำ: วัคซีนเดียวกัน + เข็มเดียวกัน หรือวันเดียวกัน */
export const findDuplicateVaccine = (hn, { epiKey, doseNo, injectedOn }) => VACCINES.find(
  (v) => v.hn === hn && !v.cancelledAt && v.epiKey === epiKey
    && (String(v.doseNo) === String(doseNo) || v.injectedOn === injectedOn),
) || null;

export const addVaccine = (entry) => {
  const meta = EPI_SCHEDULE.find((s) => s.key === entry.epiKey);
  const row = {
    id: uid(),
    hn: entry.hn,
    epiKey: entry.epiKey,
    vaccine: meta?.vaccine || entry.vaccine || '',
    doseNo: entry.doseNo || 1,
    injectedOn: entry.injectedOn || '',
    lot: entry.lot || '',
    expiry: entry.expiry || '',
    injectedBy: entry.injectedBy || CURRENT_CLINICIAN.name,
    unit: entry.unit || CURRENT_CLINICIAN.center,
    site: entry.site || '',
    reaction: entry.reaction || '',
    ageMonthsAtDose: entry.ageMonthsAtDose ?? null,
    overdueDays: entry.overdueDays ?? 0,
    recordedBy: CURRENT_CLINICIAN.name,
    recordedAt: stampNow(),
    amendedAt: '', cancelledAt: '', cancelReason: '',
  };
  VACCINES.unshift(row);
  emit();
  appendAudit({
    hn: row.hn, category: 'vaccine', field: `${row.vaccine} เข็มที่ ${row.doseNo}`,
    oldValue: '—', newValue: `ฉีด ${row.injectedOn} · Lot ${row.lot || '—'}`,
  });
  return { ...row };
};

export const updateVaccine = (id, patch = {}) => {
  const row = VACCINES.find((v) => v.id === id);
  if (!row) return null;
  const before = `ฉีด ${row.injectedOn} · Lot ${row.lot || '—'}`;
  Object.assign(row, patch, { amendedAt: stampNow() });
  emit();
  appendAudit({
    hn: row.hn, category: 'vaccine', field: `แก้ไข ${row.vaccine} เข็มที่ ${row.doseNo}`,
    oldValue: before, newValue: `ฉีด ${row.injectedOn} · Lot ${row.lot || '—'}`,
  });
  return { ...row };
};

export const cancelVaccine = (id, reason) => {
  const row = VACCINES.find((v) => v.id === id);
  if (!row) return null;
  row.cancelledAt = stampNow();
  row.cancelReason = reason || 'ไม่ได้ระบุเหตุผล';
  row.cancelledBy = CURRENT_CLINICIAN.name;
  emit();
  appendAudit({
    hn: row.hn, category: 'vaccine', field: `ยกเลิก ${row.vaccine} เข็มที่ ${row.doseNo}`,
    oldValue: `ฉีด ${row.injectedOn}`, newValue: `ยกเลิก — ${row.cancelReason}`,
  });
  return { ...row };
};

/* ─────────────────────────────────────────────────────────────
   §1.4.3.10 — Growth chart percentile bands (0–18 ปี, ค่าประมาณ)
   ทุกชุดเป็น [ageYears, P3, P10, P25, P50, P75, P90, P97]
   ───────────────────────────────────────────────────────────── */

export const GROWTH_PERCENTILE_KEYS = ['p3', 'p10', 'p25', 'p50', 'p75', 'p90', 'p97'];

const band = (rows) => rows.map(([age, p3, p10, p25, p50, p75, p90, p97]) => ({
  age, p3, p10, p25, p50, p75, p90, p97,
}));

export const GROWTH_BANDS = {
  boy: {
    weight: band([
      [0, 2.6, 2.9, 3.1, 3.4, 3.7, 4.0, 4.3],
      [1, 8.4, 8.9, 9.4, 10.0, 10.7, 11.4, 12.1],
      [2, 10.4, 11.0, 11.7, 12.4, 13.3, 14.2, 15.2],
      [3, 12.2, 12.9, 13.7, 14.6, 15.7, 16.8, 18.0],
      [5, 15.3, 16.2, 17.3, 18.6, 20.1, 21.8, 23.8],
      [7, 18.4, 19.6, 21.1, 23.0, 25.3, 28.0, 31.3],
      [9, 22.0, 23.7, 25.8, 28.4, 31.7, 35.7, 40.7],
      [11, 26.5, 28.8, 31.6, 35.2, 39.7, 45.3, 52.3],
      [13, 32.6, 35.5, 39.1, 43.6, 49.2, 56.0, 64.2],
      [15, 40.3, 43.6, 47.5, 52.4, 58.2, 65.0, 72.9],
      [17, 47.1, 50.6, 54.7, 59.6, 65.3, 71.7, 79.0],
      [18, 49.0, 52.5, 56.6, 61.4, 67.0, 73.3, 80.4],
    ]),
    height: band([
      [0, 46.3, 47.5, 48.6, 49.9, 51.2, 52.3, 53.4],
      [1, 71.0, 72.4, 73.9, 75.7, 77.4, 79.0, 80.5],
      [2, 81.0, 82.7, 84.5, 86.4, 88.4, 90.2, 91.9],
      [3, 88.7, 90.5, 92.5, 94.9, 97.2, 99.3, 101.2],
      [5, 100.7, 102.8, 105.1, 107.9, 110.6, 113.1, 115.4],
      [7, 111.2, 113.6, 116.2, 119.2, 122.3, 125.1, 127.8],
      [9, 120.5, 123.1, 126.0, 129.3, 132.7, 135.8, 138.8],
      [11, 129.1, 132.0, 135.2, 138.9, 142.7, 146.2, 149.6],
      [13, 139.4, 142.8, 146.6, 151.0, 155.4, 159.4, 163.2],
      [15, 152.5, 156.0, 159.9, 164.4, 168.8, 172.7, 176.4],
      [17, 159.9, 163.2, 166.9, 171.0, 175.1, 178.7, 182.1],
      [18, 161.0, 164.3, 167.9, 172.0, 176.0, 179.6, 182.9],
    ]),
    head: band([
      [0, 32.4, 33.2, 33.9, 34.7, 35.5, 36.2, 36.9],
      [1, 43.7, 44.4, 45.2, 46.0, 46.9, 47.7, 48.4],
      [2, 45.5, 46.2, 47.0, 47.9, 48.8, 49.6, 50.3],
      [3, 46.5, 47.2, 48.0, 48.9, 49.8, 50.6, 51.3],
      [5, 47.9, 48.6, 49.4, 50.3, 51.2, 52.0, 52.8],
    ]),
  },
  girl: {
    weight: band([
      [0, 2.5, 2.8, 3.0, 3.3, 3.6, 3.9, 4.2],
      [1, 7.7, 8.2, 8.7, 9.3, 10.0, 10.7, 11.5],
      [2, 9.8, 10.4, 11.1, 11.8, 12.7, 13.7, 14.7],
      [3, 11.6, 12.3, 13.1, 14.0, 15.1, 16.3, 17.6],
      [5, 14.7, 15.6, 16.7, 18.0, 19.6, 21.5, 23.6],
      [7, 17.8, 19.0, 20.5, 22.4, 24.8, 27.7, 31.2],
      [9, 21.5, 23.2, 25.3, 28.0, 31.4, 35.7, 41.0],
      [11, 26.6, 28.9, 31.7, 35.3, 39.9, 45.6, 52.5],
      [13, 33.4, 36.1, 39.4, 43.5, 48.5, 54.5, 61.6],
      [15, 39.1, 42.0, 45.4, 49.6, 54.6, 60.3, 66.9],
      [17, 42.0, 45.0, 48.5, 52.7, 57.6, 63.1, 69.3],
      [18, 42.6, 45.6, 49.1, 53.3, 58.2, 63.7, 69.8],
    ]),
    height: band([
      [0, 45.6, 46.8, 47.9, 49.1, 50.4, 51.5, 52.7],
      [1, 69.2, 70.6, 72.2, 74.0, 75.8, 77.5, 79.0],
      [2, 79.3, 81.0, 82.9, 85.0, 87.1, 89.0, 90.7],
      [3, 87.4, 89.3, 91.4, 93.9, 96.4, 98.6, 100.6],
      [5, 99.9, 102.1, 104.5, 107.4, 110.3, 112.9, 115.3],
      [7, 110.0, 112.4, 115.1, 118.2, 121.4, 124.3, 127.0],
      [9, 119.5, 122.2, 125.2, 128.7, 132.3, 135.5, 138.6],
      [11, 129.6, 132.6, 136.0, 139.8, 143.7, 147.2, 150.5],
      [13, 141.6, 144.6, 147.9, 151.6, 155.3, 158.7, 161.8],
      [15, 147.5, 150.3, 153.4, 156.9, 160.4, 163.5, 166.4],
      [17, 149.1, 151.9, 155.0, 158.4, 161.9, 165.0, 167.9],
      [18, 149.3, 152.1, 155.1, 158.6, 162.0, 165.1, 168.0],
    ]),
    head: band([
      [0, 31.9, 32.7, 33.4, 34.2, 35.1, 35.8, 36.6],
      [1, 42.6, 43.3, 44.1, 45.0, 45.9, 46.7, 47.4],
      [2, 44.4, 45.1, 46.0, 46.9, 47.8, 48.6, 49.4],
      [3, 45.5, 46.3, 47.1, 48.0, 48.9, 49.8, 50.5],
      [5, 47.0, 47.8, 48.6, 49.5, 50.4, 51.2, 52.0],
    ]),
  },
};

export const GROWTH_METRICS = [
  { key: 'weight', label: 'น้ำหนัก', unit: 'กก.',  maxAge: 18 },
  { key: 'height', label: 'ส่วนสูง', unit: 'ซม.',  maxAge: 18 },
  { key: 'head',   label: 'เส้นรอบศีรษะ', unit: 'ซม.', maxAge: 5 },
];

/* จุดวัดจริงของผู้รับบริการ — เด็กในตัวอย่างคือ HN 67-00026 */
export const GROWTH_MEASUREMENTS = {
  '67-00026': [
    { date: '12 ต.ค. 2568', ageYears: 0.5,  weight: 7.6,  height: 66.5, head: 43.2 },
    { date: '15 ธ.ค. 2568', ageYears: 0.7,  weight: 8.3,  height: 69.0, head: 44.1 },
    { date: '20 มี.ค. 2569', ageYears: 0.95, weight: 9.1,  height: 73.4, head: 45.4 },
    { date: '2 มิ.ย. 2569',  ageYears: 1.15, weight: 9.6,  height: 76.1, head: 46.0 },
  ],
  /* ผู้รับบริการที่มีจุดวัดเดียว — ต้อง plot จุดเดียว ไม่ลากเส้น */
  '67-00027': [
    { date: '4 มิ.ย. 2569', ageYears: 3.2, weight: 14.1, height: null, head: null },
  ],
};

export const growthMeasurementsFor = (hn) => (GROWTH_MEASUREMENTS[hn] || []).map((m) => ({ ...m }));

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/* บันทึกค่าที่วัดวันนี้ลงชุดข้อมูลกราฟ — วันเดียวกันถือเป็นการวัดครั้งเดียว
   (บันทึกซ้ำ = แก้ค่าเดิม) และเรียงตามอายุเสมอเพื่อไม่ให้เส้นย้อนกลับ */
export const addGrowthMeasurement = (hn, entry = {}) => {
  if (!hn) return null;
  const row = {
    date: entry.date || stampNow().split(' · ')[0],
    ageYears: Number(entry.ageYears),
    weight: num(entry.weight),
    height: num(entry.height),
    head: num(entry.head),
  };
  if (!Number.isFinite(row.ageYears)) return null;
  if (row.weight == null && row.height == null && row.head == null) return null;

  const prev = GROWTH_MEASUREMENTS[hn] || [];
  GROWTH_MEASUREMENTS[hn] = [...prev.filter((m) => m.date !== row.date), row]
    .sort((a, b) => a.ageYears - b.ageYears);

  appendAudit({
    hn, category: 'vaccine', field: `บันทึกค่าการเจริญเติบโต — ${row.date}`,
    oldValue: '—',
    newValue: [
      row.weight != null ? `น้ำหนัก ${row.weight} กก.` : '',
      row.height != null ? `ส่วนสูง ${row.height} ซม.` : '',
      row.head != null ? `เส้นรอบศีรษะ ${row.head} ซม.` : '',
      `อายุ ${row.ageYears} ปี`,
    ].filter(Boolean).join(' · '),
  });
  return { ...row };
};

export const growthBandsFor = (gender, metric) => {
  const sexKey = String(gender || '').includes('หญิง') ? 'girl' : 'boy';
  return (GROWTH_BANDS[sexKey] && GROWTH_BANDS[sexKey][metric]) || [];
};

/* BMI — คำนวณไม่ได้ถ้าขาดค่าใดค่าหนึ่ง ต้องบอกว่าขาดอะไร */
export const computeBmi = ({ weight, height }) => {
  if (!weight && !height) return { value: null, missing: ['น้ำหนัก', 'ส่วนสูง'] };
  if (!weight) return { value: null, missing: ['น้ำหนัก'] };
  if (!height) return { value: null, missing: ['ส่วนสูง'] };
  const m = height / 100;
  return { value: Math.round((weight / (m * m)) * 10) / 10, missing: [] };
};

export default VACCINES;
