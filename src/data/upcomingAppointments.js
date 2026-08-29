/* นัดล่วงหน้า — คิวนัดหมายของวันข้างหน้า สำหรับแท็บในหน้า worklist ทุกโมดูล
   ══════════════════════════════════════════════════════════════════════════
   เจ้าหน้าที่แต่ละจุดงานต้องเห็นล่วงหน้าได้ว่าคิวที่นัดไว้จะมาวันไหนบ้าง ตั้งแต่
   พรุ่งนี้จนถึง 3 เดือนข้างหน้า เพื่อเตรียมคน เตรียมของ และเห็นวันที่แน่นเกินรับไหว
   ก่อนวันจริง (มติผู้ใช้ 29 ส.ค. 69)

   **วันนี้ไม่นับ** — คิวของวันนี้อยู่ในแท็บ "คิววันนี้" ของหน้านั้นอยู่แล้ว
   แท็บนี้เริ่มที่พรุ่งนี้เสมอ ไม่งั้นคนเดียวกันจะโผล่สองแท็บและนับซ้ำ

   ⚠️ ชุดข้อมูลตัวอย่างของโมดูลนัดหมาย (`INITIAL_APPOINTMENTS`) เป็นนัดของ
   มิ.ย. 2569 ซึ่งเป็นอดีตเมื่อเทียบกับ "วันนี้" ของระบบ ถ้าอ่านอย่างเดียวแท็บนี้
   จะว่างเปล่าตลอด จึงสร้างชุดนัดล่วงหน้าแบบ deterministic เพิ่มขึ้นมา (ไม่สุ่ม
   ค่าจึงไม่กระโดดทุก render) แล้ว **รวมกับนัดจริงในสโตร์ที่ตกอยู่ในช่วง** —
   พอมีนัดจริงถูกสร้างจากหน้านัดหมาย มันจะโผล่ในแท็บนี้ด้วยทันที */

import { INITIAL_APPOINTMENTS } from '@/pages/appointment/appointmentShared';
import { getExtraAppointments } from '@/pages/appointment/appointmentExtraStore';
import { buildDoctorRoster } from '@/pages/appointment/appointmentDoctorRoster';
import { PATIENT_PROFILES } from '@/data/patientProfiles';

const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (base, n) => {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
};

/* ช่วงเวลาที่ให้เลือกดู — เริ่มพรุ่งนี้เสมอ ต่างกันแค่ปลายทาง
   3 เดือนคือเพดานที่ผู้ใช้กำหนด (มติผู้ใช้ 29 ส.ค. 69) */
export const UPCOMING_RANGES = [
  { key: 'd1',  label: 'พรุ่งนี้',      days: 1 },
  { key: 'd7',  label: '7 วัน',        days: 7 },
  { key: 'd30', label: '1 เดือน',      days: 30 },
  { key: 'd90', label: '3 เดือน',      days: 90 },
];

export const DEFAULT_UPCOMING_RANGE = 'd7';

/* ── ชุดนัดล่วงหน้าจำลอง ────────────────────────────────────────────────
   กระจายไปข้างหน้าตั้งแต่พรุ่งนี้ถึง ~80 วัน ครอบคลุมหลายแผนก เพื่อให้ทุกหน้า
   worklist มีของให้ดูและตัวกรองช่วงเวลาเห็นผลต่างจริง */
const SEED_PLAN = [
  { offset: 1,  i: 0,  dept: 'ตรวจรักษา',   time: '08:30', type: 'ติดตามอาการ',      note: 'ติดตามความดันโลหิต · งดกาแฟเช้าวันนัด' },
  { offset: 1,  i: 6,  dept: 'ตรวจรักษา',   time: '09:00', type: 'พบแพทย์',          note: 'ตรวจตามนัดหลังปรับยา' },
  { offset: 1,  i: 3,  dept: 'สูติ-นรีเวช', time: '10:15', type: 'ฝากครรภ์',         note: 'ANC ครั้งที่ 4 · ตรวจปัสสาวะก่อนพบแพทย์' },
  { offset: 2,  i: 1,  dept: 'อายุรกรรม',   time: '08:45', type: 'ติดตามอาการ',      note: 'เบาหวาน — งดอาหาร 8 ชม. ก่อนเจาะเลือด' },
  { offset: 2,  i: 8,  dept: 'ทันตกรรม',    time: '13:30', type: 'ทันตกรรม',         note: 'อุดฟันต่อจากครั้งก่อน' },
  { offset: 3,  i: 2,  dept: 'ตรวจรักษา',   time: '09:30', type: 'พบแพทย์',          note: 'ตรวจแผลหลังทำหัตถการ' },
  { offset: 4,  i: 9,  dept: 'อายุรกรรม',   time: '10:00', type: 'ติดตามอาการ',      note: 'วัณโรค — เดือนที่ 2 ของการรักษา' },
  { offset: 5,  i: 4,  dept: 'เวชศาสตร์ฟื้นฟู', time: '14:00', type: 'กายภาพบำบัด',  note: 'กายภาพบำบัดหลังผ่าตัดเข่า ครั้งที่ 3' },
  { offset: 6,  i: 5,  dept: 'ตรวจรักษา',   time: '08:15', type: 'พบแพทย์',          note: 'ตรวจตามนัดประจำเดือน' },
  { offset: 7,  i: 7,  dept: 'สุขภาพจิต',   time: '11:00', type: 'ให้คำปรึกษา',      note: 'ติดตามอาการซึมเศร้า · ประเมิน 9Q ซ้ำ' },
  { offset: 9,  i: 10, dept: 'ตรวจรักษา',   time: '09:45', type: 'ติดตามอาการ',      note: 'ตรวจติดตามหลังส่งต่อ' },
  { offset: 12, i: 11, dept: 'อายุรกรรม',   time: '08:30', type: 'พบแพทย์',          note: 'ไขมันในเลือดสูง — ตรวจเลือดซ้ำ' },
  { offset: 14, i: 12, dept: 'สูติ-นรีเวช', time: '10:30', type: 'ฝากครรภ์',         note: 'ANC ครั้งที่ 5 · อัลตราซาวด์' },
  { offset: 18, i: 13, dept: 'ทันตกรรม',    time: '14:30', type: 'ทันตกรรม',         note: 'ขูดหินปูนประจำปี' },
  { offset: 21, i: 14, dept: 'ตรวจรักษา',   time: '09:00', type: 'ติดตามอาการ',      note: 'ตรวจติดตาม 3 สัปดาห์' },
  { offset: 28, i: 15, dept: 'อายุรกรรม',   time: '08:45', type: 'ติดตามอาการ',      note: 'เบาหวาน — ตรวจ HbA1c' },
  { offset: 35, i: 16, dept: 'เวชศาสตร์ฟื้นฟู', time: '13:00', type: 'กายภาพบำบัด',  note: 'ประเมินซ้ำหลังครบโปรแกรม' },
  { offset: 45, i: 17, dept: 'ตรวจรักษา',   time: '10:00', type: 'พบแพทย์',          note: 'ตรวจตามนัดราย 6 สัปดาห์' },
  { offset: 60, i: 18, dept: 'สุขภาพจิต',   time: '11:30', type: 'ให้คำปรึกษา',      note: 'ติดตามผลการรักษาต่อเนื่อง' },
  { offset: 75, i: 19, dept: 'ตรวจรักษา',   time: '08:30', type: 'ติดตามอาการ',      note: 'ตรวจติดตามราย 3 เดือน' },
  { offset: 80, i: 20, dept: 'อายุรกรรม',   time: '09:15', type: 'พบแพทย์',          note: 'ตรวจสุขภาพประจำปี' },
];

const DOCTORS = buildDoctorRoster();

const doctorForDept = (dept, seq) => {
  const pool = DOCTORS.filter((d) => d.dept === dept);
  const list = pool.length ? pool : DOCTORS;
  return list[seq % list.length];
};

const buildSeed = (today) => SEED_PLAN.map((plan, idx) => {
  const profile = PATIENT_PROFILES[plan.i % PATIENT_PROFILES.length];
  const doc = doctorForDept(plan.dept, idx);
  return {
    id: `UP-${String(idx + 1).padStart(3, '0')}`,
    date: dateKey(addDays(today, plan.offset)),
    time: plan.time,
    hn: profile.hn,
    patient: profile.shortName,
    patientAvatar: profile.avatarUrl,
    rights: profile.insurance || '',
    dept: plan.dept,
    clinic: doc?.clinic || '',
    doctor: doc?.name || '',
    staffId: doc?.id ?? null,
    type: plan.type,
    note: plan.note,
    status: 'confirmed',
  };
});

/* นัดจริงจากสโตร์ของโมดูลนัดหมาย — เอาเฉพาะที่ยังไม่ถูกยกเลิก */
const storeAppointments = () => {
  const extra = (() => {
    try { return getExtraAppointments() || []; } catch { return []; }
  })();
  return [...INITIAL_APPOINTMENTS, ...extra]
    .filter((a) => a && a.date && String(a.status || '').toLowerCase() !== 'cancelled');
};

/**
 * คิวนัดล่วงหน้าในช่วงที่เลือก — เรียงตามวันแล้วเวลา
 * @param {object} opts
 *  · `days`  จำนวนวันข้างหน้าที่ต้องการ (ค่าเริ่มต้น 7) นับจากพรุ่งนี้
 *  · `depts` รายชื่อแผนกที่หน้านั้นสนใจ — ไม่ส่ง = ทุกแผนก
 *            (แต่ละจุดงานเห็นเฉพาะคิวของตัวเอง ตามที่ผู้ใช้ต้องการ)
 */
export const getUpcomingAppointments = ({ days = 7, depts = null, now = new Date() } = {}) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = dateKey(addDays(today, 1));
  const to = dateKey(addDays(today, Math.max(1, days)));

  const inRange = (a) => a.date >= from && a.date <= to;
  const inDept = (a) => !depts?.length || depts.includes(a.dept);

  const rows = [...buildSeed(today), ...storeAppointments()]
    .filter(inRange)
    .filter(inDept);

  /* กันซ้ำเมื่อชุดจำลองกับนัดจริงชนกันที่ คน+วัน+เวลา เดียวกัน */
  const seen = new Set();
  return rows
    .filter((a) => {
      const k = `${a.hn}|${a.date}|${a.time}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => (a.date === b.date
      ? String(a.time).localeCompare(String(b.time))
      : a.date.localeCompare(b.date)));
};

/** จำนวนนัดในช่วง — ใช้ติดตัวเลขบนแท็บโดยไม่ต้องดึงทั้งรายการมาถือไว้ */
export const countUpcomingAppointments = (opts) => getUpcomingAppointments(opts).length;

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/** '2026-09-05' → '5 ก.ย. 69' — รูปแบบวันที่แบบเดียวกับที่หน้าอื่นใช้ */
export const formatUpcomingDate = (iso) => {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!y || !m || !d) return iso || '—';
  return `${d} ${THAI_MONTHS_SHORT[m - 1]} ${String((y + 543) % 100).padStart(2, '0')}`;
};

/** อีกกี่วันจากวันนี้ — บอก "พรุ่งนี้" เป็นคำ เพราะเป็นวันที่ต้องเตรียมทันที */
export const daysFromToday = (iso, now = new Date()) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!y) return null;
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
};

export const upcomingDayLabel = (iso, now = new Date()) => {
  const n = daysFromToday(iso, now);
  if (n == null) return '';
  if (n === 1) return 'พรุ่งนี้';
  if (n <= 7) return `อีก ${n} วัน`;
  return `อีก ${n} วัน`;
};
