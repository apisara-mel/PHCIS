/* Exist Nurse — ผู้รับบริการที่แพทย์ตรวจเสร็จแล้ว รอพยาบาลปิดเยี่ยมก่อนกลับบ้าน
   ══════════════════════════════════════════════════════════════════════════
   จุดคัดกรองรับคนเข้า Exist Nurse ส่งคนออก — เป็นคู่กัน แต่เดิมมีแค่ครึ่งแรก
   (มติผู้ใช้ 28 ส.ค. 69) พอแพทย์กดจบการตรวจ ผู้รับบริการก็หายไปจากทุกหน้าจอ
   ทั้งที่ยังมีงานค้างกับเขาอีกหลายอย่าง: อธิบายวิธีกินยา ยืนยันวันนัดครั้งหน้า
   ให้คำแนะนำการดูแลตัวเอง ส่งมอบเอกสาร และบอกว่าต้องแวะจ่ายเงินหรือรับยาที่ไหนต่อ
   งานเหล่านี้เคยอาศัยการจำของพยาบาลล้วน ๆ ตกหล่นแล้วรู้อีกทีตอนผู้ป่วยโทรกลับมาถาม

   `tasks` คือสิ่งที่ต้องทำกับคนคนนั้นก่อนปล่อยกลับ ไม่ใช่ checklist มาตรฐาน
   ชุดเดียวใช้ทุกคน — คนที่ไม่ได้รับยาก็ไม่ควรมีข้อ "อธิบายวิธีใช้ยา" ให้ติ๊ก

   sessionStorage-backed แบบเดียวกับ unassignedWorklist / opdWalkinRequests */

import { PATIENT_PROFILES } from '@/data/patientProfiles';

export const EXIT_STATUS = {
  waiting:   { key: 'waiting',   label: 'รอส่งกลับ',      badge: 'orange', rank: 0 },
  doing:     { key: 'doing',     label: 'กำลังส่งกลับ',   badge: 'blue',   rank: 1 },
  done:      { key: 'done',      label: 'ส่งกลับแล้ว',    badge: 'teal',   rank: 2 },
  /* ยกเลิกคิว — ผู้รับบริการกลับไปเองก่อนปิดเยี่ยม แถวคงไว้ให้ตรวจสอบย้อนหลัง
     ไม่ลบทิ้ง (ทรงเดียวกับ walk-in request) */
  cancelled: { key: 'cancelled', label: 'ยกเลิกคิว',      badge: 'grey',   rank: 3 },
};

/* งานที่ต้องปิดก่อนผู้รับบริการกลับบ้าน — คำอธิบายคือสิ่งที่พยาบาลต้องพูดจริง
   ไม่ใช่ชื่อระบบ */
export const EXIT_TASKS = {
  medication: {
    key: 'medication',
    label: 'อธิบายวิธีใช้ยา',
    detail: 'ทบทวนชื่อยา ขนาด เวลาที่กิน และอาการข้างเคียงที่ต้องกลับมาพบแพทย์',
    icon: 'pill',
  },
  appointment: {
    key: 'appointment',
    label: 'ยืนยันวันนัดครั้งต่อไป',
    detail: 'ย้ำวัน เวลา และสิ่งที่ต้องเตรียมมา เช่น งดอาหารก่อนเจาะเลือด',
    icon: 'event_available',
  },
  advice: {
    key: 'advice',
    label: 'ให้คำแนะนำการดูแลตนเอง',
    detail: 'อาหาร การออกกำลังกาย และสัญญาณอันตรายที่ต้องรีบกลับมา',
    icon: 'volunteer_activism',
  },
  document: {
    key: 'document',
    label: 'ส่งมอบเอกสาร',
    detail: 'ใบรับรองแพทย์ / ใบส่งตัว / ใบนัด — ตรวจว่าครบและลงลายมือชื่อแล้ว',
    icon: 'description',
  },
  payment: {
    key: 'payment',
    label: 'แจ้งจุดชำระเงินและรับยา',
    detail: 'บอกลำดับว่าต้องแวะที่ใดต่อ เพื่อไม่ให้เดินวนกลับมาถาม',
    icon: 'baht',
  },
};

export const EXIT_TASK_LIST = Object.values(EXIT_TASKS);

/* v2: ชุดตัวอย่างมีเคสรอเกิน 2 ชม. เพื่อให้เห็นตัวบ่งชี้ — คีย์เดิมจะทำให้
   session ที่เคยเปิดหน้านี้ค้างชุดเก่าอยู่ */
const STORAGE_KEY = 'mih:exit-nurse-queue:v2';

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const SEED_PLAN = [
  { i: 0,  clinic: 'คลินิกตรวจรักษา',  doctor: 'พญ.สมหญิง รักษ์ดี',  at: '09:42', wait: 18,
    dx: 'ความดันโลหิตสูง (I10)',
    tasks: ['medication', 'appointment', 'advice', 'payment'] },
  { i: 2,  clinic: 'คลินิกตรวจรักษา',  doctor: 'นพ.สมชาย ใจดี',      at: '09:55', wait: 11,
    dx: 'หลอดลมอักเสบเฉียบพลัน (J20.9)',
    tasks: ['medication', 'advice', 'payment'] },
  { i: 1,  clinic: 'คลินิกส่งเสริมสุขภาพเฉพาะกลุ่มที่สำคัญ (NCD)', doctor: 'พญ.สมหญิง รักษ์ดี', at: '09:58', wait: 8,
    dx: 'เบาหวานชนิดที่ 2 (E11.9)',
    tasks: ['medication', 'appointment', 'advice'] },
  { i: 3,  clinic: 'คลินิกฝากครรภ์',  doctor: 'พญ.อรทัย ใจอารี',    at: '10:04', wait: 5,
    dx: 'ตั้งครรภ์ปกติ ไตรมาสที่ 2 (Z34.0)',
    tasks: ['appointment', 'advice', 'document'] },
  { i: 8,  clinic: 'คลินิกทันตกรรม',  doctor: 'ทพญ.วรางคณา ฟันสวย', at: '10:07', wait: 3,
    dx: 'ฟันผุถึงโพรงประสาทฟัน (K04.0)',
    tasks: ['medication', 'appointment', 'payment'] },
  /* รอเกิน 2 ชม. โดยตั้งใจ — พิสูจน์ตัวบ่งชี้รอนานบนคอลัมน์รอนาน */
  { i: 6,  clinic: 'คลินิกสุขภาพจิต', doctor: 'นพ.ณัฐวุฒิ บุญมี',   at: '07:52', wait: 134,
    dx: 'ภาวะซึมเศร้า (F32.1)',
    tasks: ['medication', 'appointment', 'advice'], status: 'doing' },
  { i: 9,  clinic: 'คลินิกวัณโรค',   doctor: 'นพ.ประวิทย์ ชาญเวชกิจ', at: '09:12', wait: 44,
    dx: 'วัณโรคปอด รอผลเสมหะ (A15.0)',
    tasks: ['medication', 'appointment', 'advice', 'document'], status: 'done',
    closedBy: 'พว.กานดา ศรีวิไล', closedAt: '09:36' },
  { i: 4,  clinic: 'คลินิกเวชศาสตร์ฟื้นฟูและกายภาพบำบัด', doctor: 'นพ.ประวิทย์ ชาญเวชกิจ', at: '09:05', wait: 51,
    dx: 'ปวดหลังส่วนล่าง (M54.5)',
    tasks: ['appointment', 'advice'], status: 'done',
    closedBy: 'พว.กานดา ศรีวิไล', closedAt: '09:21' },
];

const buildSeed = () => SEED_PLAN.map((plan, idx) => {
  const profile = PATIENT_PROFILES[plan.i % PATIENT_PROFILES.length];
  const status = plan.status || 'waiting';
  return {
    id: `EX-${String(idx + 1).padStart(3, '0')}`,
    queue: `A${String(idx + 1).padStart(3, '0')}`,
    hn: profile.hn,
    name: profile.shortName,
    avatarUrl: profile.avatarUrl,
    clinic: plan.clinic,
    doctor: plan.doctor,
    diagnosis: plan.dx,
    /* เวลาที่แพทย์กดจบการตรวจ = เวลาที่งานนี้เริ่มรอ */
    examDoneAt: plan.at,
    waitMinutes: plan.wait,
    tasks: plan.tasks,
    /* ติ๊กแล้วกี่ข้อ — เก็บเป็น map เพื่อให้กลับมาทำต่อได้ */
    doneTasks: status === 'done'
      ? Object.fromEntries(plan.tasks.map((t) => [t, true]))
      : {},
    note: '',
    status,
    /* พักคิว — เรียกแล้วยังไม่มา ขอข้ามไปเรียกคนถัดไปก่อน */
    paused: false,
    closedBy: plan.closedBy ?? null,
    closedAt: plan.closedAt ?? null,
  };
});

let cache = null;
const listeners = new Set();

function write(rows) {
  cache = rows;
  if (canUseSessionStorage()) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch {
      /* เขียนไม่ได้ก็ยังทำงานต่อในหน่วยความจำรอบนี้ */
    }
  }
  listeners.forEach((fn) => fn());
}

const read = () => {
  if (cache) return cache;
  if (canUseSessionStorage()) {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) { cache = JSON.parse(raw); return cache; }
    } catch {
      /* storage ปิดหรือ JSON เสีย — ใช้ seed แทนการพังทั้งหน้า */
    }
  }
  cache = buildSeed();
  write(cache);
  return cache;
};

export const subscribeExitQueue = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getExitRows = () => read().map((r) => ({ ...r }));

/** ความคืบหน้าของแถว — ใช้ทั้งในตารางและในป๊อปอัป จึงคิดที่เดียว */
export const taskProgress = (row) => {
  const total = row?.tasks?.length ?? 0;
  const done = (row?.tasks ?? []).filter((t) => row?.doneTasks?.[t]).length;
  return { done, total, complete: total > 0 && done === total };
};

export const updateExitRow = (id, patch = {}) => {
  const rows = read();
  const next = rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
  write(next);
  return next.find((r) => r.id === id) ?? null;
};

/** ติ๊ก/ยกเลิกงานหนึ่งข้อ — แถวที่ยังรออยู่จะขยับเป็น "กำลังส่งกลับ" เอง
    เพราะการเริ่มติ๊กคือการเริ่มทำ ไม่ต้องให้กดปุ่มเปลี่ยนสถานะซ้ำอีกครั้ง */
export const toggleExitTask = (id, taskKey) => {
  const rows = read();
  const target = rows.find((r) => r.id === id);
  if (!target || target.status === 'done') return null;
  const doneTasks = { ...target.doneTasks, [taskKey]: !target.doneTasks?.[taskKey] };
  const anyDone = Object.values(doneTasks).some(Boolean);
  return updateExitRow(id, {
    doneTasks,
    status: anyDone ? 'doing' : 'waiting',
  });
};

/** ปิดเยี่ยม — ต้องทำครบทุกข้อก่อน ไม่งั้นคืน null ให้ผู้เรียกไปบอกผู้ใช้
    (ปล่อยกลับทั้งที่ยังไม่ได้อธิบายยาคือความเสี่ยงจริง ไม่ใช่เรื่องรูปแบบ) */
export const closeExitVisit = (id, { by = 'พว.กานดา ศรีวิไล', at = null } = {}) => {
  const rows = read();
  const target = rows.find((r) => r.id === id);
  if (!target || !taskProgress(target).complete) return null;
  return updateExitRow(id, {
    status: 'done',
    closedBy: by,
    closedAt: at ?? nowHHMM(),
  });
};

/** พักคิว / ยกเลิกพัก — เรียกแล้วไม่มาจึงข้ามไปก่อน ค่าไม่แตะสถานะงาน */
export const toggleExitPause = (id) => {
  const rows = read();
  const target = rows.find((r) => r.id === id);
  if (!target || target.status === 'done' || target.status === 'cancelled') return null;
  return updateExitRow(id, { paused: !target.paused });
};

/** ยกเลิกคิว — ผู้รับบริการกลับไปเองก่อนปิดเยี่ยม เก็บแถวไว้ ไม่ลบ */
export const cancelExitVisit = (id, { by = 'พว.กานดา ศรีวิไล', at = null } = {}) => {
  const rows = read();
  const target = rows.find((r) => r.id === id);
  if (!target || target.status === 'done') return null;
  return updateExitRow(id, { status: 'cancelled', paused: false, closedBy: by, closedAt: at ?? nowHHMM() });
};

/** เปิดกลับมาแก้ — ปิดผิดคนหรือลืมบอกอะไรไปต้องย้อนได้ */
export const reopenExitVisit = (id) => updateExitRow(id, {
  status: 'doing',
  closedBy: null,
  closedAt: null,
});

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** เรียงงานที่ยังไม่ปิดขึ้นก่อน แล้วรอนานก่อน — คนที่รอมานานสุดคือคนที่ควรถูก
    เรียกคนต่อไป ไม่ใช่คนที่เพิ่งออกจากห้องตรวจ */
export const compareExitRows = (a, b) => {
  const byStatus = (EXIT_STATUS[a.status]?.rank ?? 9) - (EXIT_STATUS[b.status]?.rank ?? 9);
  if (byStatus !== 0) return byStatus;
  return (b.waitMinutes ?? 0) - (a.waitMinutes ?? 0);
};
