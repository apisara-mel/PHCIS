/* คิวรวมรอรับเคส — ผู้รับบริการที่ผ่านจุดคัดกรองแล้วแต่ "ยังไม่มีแพทย์เจ้าของ"
   ══════════════════════════════════════════════════════════════════════════
   ศูนย์บริการสาธารณสุขบางแห่งไม่ให้พยาบาลที่จุดคัดกรองเป็นคนเลือกแพทย์ผู้รักษา
   พยาบาลจะเลือก "ไม่ระบุแพทย์" แทน แล้วปล่อยให้แพทย์ที่ว่างเป็นคนหยิบเคสเอง
   (มติผู้ใช้ 28 ส.ค. 69) แถวที่ถูกคัดกรองแบบนั้นจึงไม่มีที่ไปในคิวของคลินิกใด
   คลินิกหนึ่ง — ต้องมีกองกลางให้มันไปรวมกัน ซึ่งคือ store นี้

   ทำไมต้องเป็น store แยก ไม่ใช่ field ใน treatmentQueue
     คิวตรวจรักษาปกติตั้งต้นว่า "ทุกแถวมีแพทย์แล้ว" ทั้ง sort, filter แพทย์ และ
     พาเนลคิวข้างฟอร์มอ่าน `row.doctor` ตรง ๆ การยัดแถวไร้แพทย์เข้าไปแปลว่าทุก
     จุดที่อ่าน doctor ต้องเผื่อ null พร้อมกันหมด กองกลางจึงแยกออกมา แล้วแถวจะ
     "ย้าย" เข้าคิวปกติเมื่อมีแพทย์รับเคส (claimCase) ซึ่งเป็นตอนที่มันมีแพทย์จริง

   sessionStorage-backed แบบเดียวกับ opdWalkinRequests / labOrders — รีเฟรชแล้ว
   ยังอยู่ ปิดแท็บแล้วหาย ซึ่งพอดีกับต้นแบบที่ไม่มี backend */

import { PATIENT_PROFILES } from '@/data/patientProfiles';
import { TREAT_DEPARTMENT_SUBITEMS } from '@/data/phcisSideMenu';

/* ค่าที่พยาบาลเลือกในหน้าคัดกรองเมื่อไม่ระบุแพทย์ — เก็บเป็นค่าเดียวทั้งระบบ
   เพื่อให้ฝั่งคัดกรองกับฝั่งแพทย์เทียบกันได้โดยไม่ต้องจำสตริง */
export const UNASSIGNED_DOCTOR = 'ไม่ระบุแพทย์';

/* คลินิกปลายทาง = รายการเดียวกับเมนูย่อยของ "บันทึกการรักษา" ตัด key ที่ไม่ใช่
   ปลายทางของการตรวจรักษาออก (ตั้งค่า / ทะเบียน / นโยบาย ไม่ใช่คลินิก) */
export const TREAT_CLINICS = TREAT_DEPARTMENT_SUBITEMS.map((d) => ({
  key: d.key,
  label: d.label,
  path: d.path,
}));

export const TREAT_CLINIC_BY_KEY = Object.fromEntries(TREAT_CLINICS.map((c) => [c.key, c]));

export const clinicLabel = (key) => TREAT_CLINIC_BY_KEY[key]?.label ?? key ?? '—';

/* ป้ายสั้นสำหรับคอลัมน์และหัวกลุ่ม — ชื่อเต็มบางอันยาว 40+ ตัวอักษร ใส่ในตาราง
   แล้วดันคอลัมน์อื่นจนอ่านไม่ได้ ตัดคำว่า "คลินิก" นำหน้าออกก็พอ เพราะทั้งหน้า
   พูดถึงคลินิกอยู่แล้ว */
export const clinicShortLabel = (key) => clinicLabel(key).replace(/^คลินิก/, '').trim();

/* ระดับความเร่งด่วนจากการคัดแยกที่จุดคัดกรอง (ESI) — ใช้ตัวเดียวกับหน้าคัดกรอง */
export const TRIAGE_LEVELS = {
  1: { label: 'ESI 1 — วิกฤต',      badge: 'red',    rank: 1 },
  2: { label: 'ESI 2 — ฉุกเฉิน',    badge: 'red',    rank: 2 },
  3: { label: 'ESI 3 — เร่งด่วน',   badge: 'orange', rank: 3 },
  4: { label: 'ESI 4 — กึ่งเร่งด่วน', badge: 'blue',  rank: 4 },
  5: { label: 'ESI 5 — ไม่เร่งด่วน', badge: 'grey',  rank: 5 },
};

export const CASE_STATUS = {
  pool:  { key: 'pool',  label: 'รอแพทย์รับเคส', badge: 'orange' },
  mine:  { key: 'mine',  label: 'รับเคสแล้ว',    badge: 'teal'   },
};

/* ขึ้น v2 พร้อมกับชุดตัวอย่างที่ขยายเป็น 28 ราย — ถ้าใช้คีย์เดิม คนที่เคยเปิด
   หน้านี้ไปแล้วจะยังเห็นชุด 12 รายเดิมค้างอยู่ใน sessionStorage ตลอดทั้ง session */
const STORAGE_KEY = 'mih:treat-unassigned-pool:v2';

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

/* ── ตัวอย่างข้อมูล ─────────────────────────────────────────────────────────
   กระจายให้ครบทุกสถานะที่หน้าจอต้องรับมือ: หลายคลินิก · ESI ทุกระดับ · มีเคสที่
   แพทย์คนอื่นรับไปแล้ว (เพื่อพิสูจน์ว่าเคสที่ถูกหยิบไปแล้วต้องหายจากกองกลาง)
   และมีเคสที่แพทย์ที่ล็อกอินอยู่รับไว้เอง */
const SEED_PLAN = [
  /* คลินิกตรวจรักษา — ปลายทางที่รับเคสมากที่สุดของศูนย์ */
  { i: 5,  clinicKey: 'opd-treat', esi: 2, cc: 'หายใจหอบเหนื่อย พูดเป็นคำ ๆ',              wait: 6,  at: '09:02', v: ['168/98', '112', '92%'] },
  { i: 0,  clinicKey: 'opd-treat', esi: 3, cc: 'เจ็บแน่นหน้าอก ร้าวไหล่ซ้าย',              wait: 41, at: '08:12', v: ['158/96', '104', '96%'] },
  { i: 2,  clinicKey: 'opd-treat', esi: 4, cc: 'ไอมีเสมหะ มีไข้ต่ำ ๆ 3 วัน',                wait: 24, at: '08:31', v: ['124/78', '88',  '98%'] },
  { i: 14, clinicKey: 'opd-treat', esi: 3, cc: 'ท้องเสียถ่ายเหลว 6 ครั้ง อ่อนเพลียมาก',      wait: 31, at: '08:22', v: ['104/64', '108', '97%'] },
  { i: 19, clinicKey: 'opd-treat', esi: 4, cc: 'ปวดศีรษะข้างเดียว ตาพร่า 2 วัน',            wait: 16, at: '08:47', v: ['138/86', '78',  '99%'] },

  /* คลินิกส่งเสริมสุขภาพเฉพาะกลุ่มที่สำคัญ (NCD) — เบาหวาน / ความดัน */
  { i: 1,  clinicKey: 'ncd',  esi: 4, cc: 'ตามนัดเบาหวาน น้ำตาลสูง 3 วันติด',               wait: 28, at: '08:26', v: ['142/88', '82',  '98%'] },
  { i: 7,  clinicKey: 'ncd',  esi: 4, cc: 'ความดันสูง 168/98 ที่จุดคัดกรอง',                 wait: 12, at: '08:56', v: ['168/98', '90',  '98%'] },
  { i: 12, clinicKey: 'ncd',  esi: 3, cc: 'เบาหวานขึ้นตา ตามัวลงเร็วใน 1 สัปดาห์',           wait: 35, at: '08:18', v: ['152/92', '86',  '98%'] },

  /* คลินิกฝากครรภ์ */
  { i: 3,  clinicKey: 'anc',  esi: 4, cc: 'ฝากครรภ์ครั้งที่ 3 · บวมขาสองข้าง',              wait: 19, at: '08:38', v: ['132/84', '88',  '98%'] },
  { i: 16, clinicKey: 'anc',  esi: 2, cc: 'ตั้งครรภ์ 34 สัปดาห์ · ปวดศีรษะ ตาพร่า บวมหน้า', wait: 4,  at: '09:11', v: ['172/104', '96', '97%'] },
  { i: 22, clinicKey: 'anc',  esi: 5, cc: 'ฝากครรภ์ครั้งแรก อายุครรภ์ 9 สัปดาห์',           wait: 26, at: '08:35', v: ['112/70', '80',  '99%'] },

  /* คลินิกวัณโรค */
  { i: 9,  clinicKey: 'tb',   esi: 4, cc: 'ไอเรื้อรัง 3 สัปดาห์ น้ำหนักลด',                  wait: 7,  at: '09:09', v: ['118/76', '92',  '97%'] },
  { i: 25, clinicKey: 'tb',   esi: 4, cc: 'ผู้สัมผัสร่วมบ้านผู้ป่วยวัณโรค มาคัดกรอง',        wait: 21, at: '08:41', v: ['122/78', '76',  '99%'] },

  /* คลินิกสุขภาพจิต */
  { i: 6,  clinicKey: 'mental', esi: 4, cc: 'นอนไม่หลับ เบื่ออาหาร 2 สัปดาห์',               wait: 14, at: '08:51', v: ['120/76', '84',  '98%'] },
  { i: 17, clinicKey: 'mental', esi: 3, cc: 'ทำร้ายตัวเอง มีความคิดฆ่าตัวตาย (2Q บวก)',      wait: 9,  at: '09:00', v: ['128/82', '98',  '98%'] },

  /* คลินิกทันตกรรม */
  { i: 8,  clinicKey: 'dental', esi: 5, cc: 'ปวดฟันกรามล่างขวา บวมเหงือก',                  wait: 9,  at: '09:05', v: ['124/80', '78',  '99%'] },
  { i: 20, clinicKey: 'dental', esi: 3, cc: 'บวมใต้คางลามถึงคอ กลืนลำบาก',                  wait: 11, at: '08:58', v: ['136/86', '102', '97%'] },

  /* คลินิกเวชศาสตร์ฟื้นฟูและกายภาพบำบัด */
  { i: 4,  clinicKey: 'rehab', esi: 5, cc: 'ปวดหลังส่วนล่างเรื้อรัง 2 เดือน',                wait: 17, at: '08:44', v: ['126/80', '74',  '99%'] },
  { i: 18, clinicKey: 'rehab', esi: 4, cc: 'อ่อนแรงแขนขวาหลังโรคหลอดเลือดสมอง',            wait: 38, at: '08:15', v: ['144/88', '80',  '98%'] },

  /* คลินิกส่งเสริมสุขภาพ (วางแผนครอบครัว) */

  /* คลินิกสร้างเสริมภูมิคุ้มกันโรค */
  { i: 26, clinicKey: 'vaccine', esi: 5, cc: 'รับวัคซีนไข้หวัดใหญ่ประจำปี',                  wait: 8,  at: '09:07', v: ['118/74', '70',  '99%'] },
  { i: 13, clinicKey: 'vaccine', esi: 4, cc: 'ถูกสุนัขจรกัดที่น่อง เมื่อวานเย็น',            wait: 5,  at: '09:12', v: ['128/80', '88',  '99%'] },

  /* คลินิกโรคติดต่อทางเพศสัมพันธ์และโรคเอดส์ */
  { i: 15, clinicKey: 'std', esi: 4, cc: 'ปัสสาวะแสบขัด มีหนองไหล 3 วัน',                   wait: 18, at: '08:45', v: ['122/78', '82',  '99%'] },

  /* คลินิกบำบัดและรักษาผู้ป่วยติดสารเสพติด */
  { i: 27, clinicKey: 'drug', esi: 4, cc: 'ขอเข้าบำบัดเลิกเมทแอมเฟตามีน · มือสั่น',          wait: 23, at: '08:37', v: ['138/88', '104', '98%'] },

  /* คลินิกตรวจสุขภาพ */
  { i: 11, clinicKey: 'wellness', esi: 5, cc: 'ตรวจสุขภาพประจำปีของหน่วยงาน',               wait: 47, at: '08:06', v: ['120/78', '72',  '99%'] },

  /* คลินิกสังคมสงเคราะห์ */
  { i: 10, clinicKey: 'social', esi: 5, cc: 'ผู้สูงอายุอยู่ลำพัง ขอประเมินสิทธิและผู้ดูแล',   wait: 29, at: '08:29', v: ['134/82', '76',  '98%'] },

  /* เคสที่มีแพทย์รับไปแล้ว — ต้องไม่โผล่ในแท็บ "รอรับเคส"
     สองใบแรกเป็นของแพทย์ท่านอื่น (พิสูจน์ว่าเคสของคนอื่นหยิบซ้ำไม่ได้)
     ใบสุดท้ายเป็นของแพทย์ที่ล็อกอินอยู่ (แท็บ "เคสของฉัน" จึงมีของให้ดู) */
  { i: 24, clinicKey: 'opd-treat', esi: 4, cc: 'ผื่นคันทั้งตัวหลังกินยาแก้ปวด',     wait: 33, at: '08:20', v: ['126/80', '84', '98%'], claimedBy: 'นพ.สมชาย ใจดี',     claimedAt: '08:47' },
  { i: 21, clinicKey: 'ncd',       esi: 4, cc: 'ไขมันในเลือดสูง ตามผลเลือด',        wait: 25, at: '08:33', v: ['130/84', '78', '99%'], claimedBy: 'นพ.ณัฐวุฒิ บุญมี',   claimedAt: '08:59' },
  { i: 23, clinicKey: 'family',    esi: 5, cc: 'ปรึกษาการคุมกำเนิดแบบฝังยา',        wait: 22, at: '08:34', v: ['118/74', '72', '99%'], claimedBy: 'พญ.สมหญิง รักษ์ดี', claimedAt: '08:58' },
];

/* สัญญาณชีพเขียนไว้ในแผนทีละแถว — ค่าที่คำนวณจาก ESI อย่างเดียวทำให้ทั้งกระดาน
   ขึ้น 122/78 เหมือนกันหมดจนดูเป็นข้อมูลปลอม ตัวนี้ใช้เฉพาะเคสที่จุดคัดกรองส่ง
   เข้ามาสดโดยยังไม่มีค่าวัด */
const buildVitals = (esi) => ({
  bp:   esi <= 3 ? '156/94' : '124/78',
  pr:   esi <= 3 ? '102'    : '78',
  spo2: esi <= 2 ? '94%'    : '98%',
});

const buildSeed = () => SEED_PLAN.map((plan, idx) => {
  const profile = PATIENT_PROFILES[plan.i % PATIENT_PROFILES.length];
  return {
    id: `UA-${String(idx + 1).padStart(3, '0')}`,
    /* คิวจากจุดคัดกรอง — ยังไม่ใช่คิวห้องตรวจ เพราะห้องตรวจจะรู้ก็ต่อเมื่อมีแพทย์ */
    queue: `S${String(idx + 1).padStart(3, '0')}`,
    hn: profile.hn,
    name: profile.shortName,
    avatarUrl: profile.avatarUrl,
    clinicKey: plan.clinicKey,
    cc: plan.cc,
    esi: plan.esi,
    vitals: plan.v
      ? { bp: plan.v[0], pr: plan.v[1], spo2: plan.v[2] }
      : buildVitals(plan.esi),
    waitMinutes: plan.wait,
    screenedAt: plan.at,
    screenedBy: 'พว.กานดา ศรีวิไล',
    /* ไม่มีแพทย์ = ยังอยู่กองกลาง; มี = ถูกหยิบไปแล้ว */
    doctor: plan.claimedBy ?? null,
    claimedAt: plan.claimedAt ?? null,
  };
});

let cache = null;
const listeners = new Set();

const read = () => {
  if (cache) return cache;
  if (canUseSessionStorage()) {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        cache = JSON.parse(raw);
        return cache;
      }
    } catch {
      /* storage ปิดอยู่หรือ JSON เสีย — ตกไปใช้ seed แทนการพังทั้งหน้า */
    }
  }
  cache = buildSeed();
  write(cache);
  return cache;
};

function write(rows) {
  cache = rows;
  if (canUseSessionStorage()) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch {
      /* เขียนไม่ได้ก็ยังทำงานต่อได้ในหน่วยความจำรอบนี้ */
    }
  }
  listeners.forEach((fn) => fn());
}

export const subscribeUnassignedPool = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getUnassignedRows = () => read().map((r) => ({
  ...r,
  statusKey: r.doctor ? 'mine' : 'pool',
}));

/** เคสที่ยังไม่มีเจ้าของ — หัวใจของหน้านี้ */
export const getPoolRows = () => getUnassignedRows().filter((r) => !r.doctor);

/** เคสที่แพทย์คนนี้รับไว้แล้ว */
export const getClaimedRows = (doctorName) =>
  getUnassignedRows().filter((r) => r.doctor === doctorName);

/** แพทย์กดรับเคสเป็นของตัวเอง — §"คุณหมอสามารถ Assign คนไข้คนนั้นให้ตัวเองได้"
    กันการแย่งเคส: ถ้ามีคนรับไปก่อนแล้ว คืน null และผู้เรียกต้องแจ้งผู้ใช้
    (ในต้นแบบยังเป็น session เดียว แต่กติกาต้องถูกตั้งแต่แรก) */
export const claimCase = (id, doctorName, at = null) => {
  const rows = read();
  const target = rows.find((r) => r.id === id);
  if (!target || target.doctor) return null;
  const next = rows.map((r) => (r.id === id
    ? { ...r, doctor: doctorName, claimedAt: at ?? nowHHMM() }
    : r));
  write(next);
  return next.find((r) => r.id === id) ?? null;
};

/** คืนเคสกลับกองกลาง — หยิบผิดคนต้องแก้ได้ ไม่งั้นเคสจะค้างกับแพทย์ที่ไม่ได้ตรวจ */
export const releaseCase = (id) => {
  const rows = read();
  const target = rows.find((r) => r.id === id);
  if (!target || !target.doctor) return null;
  const next = rows.map((r) => (r.id === id ? { ...r, doctor: null, claimedAt: null } : r));
  write(next);
  return next.find((r) => r.id === id) ?? null;
};

/** จุดคัดกรองส่งเคสเข้ากองกลาง — เรียกเมื่อพยาบาลเลือก "ไม่ระบุแพทย์" */
export const addToUnassignedPool = ({
  hn, name, avatarUrl, clinicKey, cc, esi, vitals, screenedBy, queue,
}) => {
  const rows = read();
  /* คัดกรองซ้ำในวันเดียวกันไม่ควรได้สองแถว — อัปเดตแถวเดิมที่ยังไม่มีเจ้าของ */
  const existing = rows.find((r) => r.hn === hn && !r.doctor);
  const seq = rows.length + 1;
  const row = {
    id: existing?.id ?? `UA-${String(seq).padStart(3, '0')}`,
    queue: queue || existing?.queue || `S${String(seq).padStart(3, '0')}`,
    hn: hn || '',
    name: name || '',
    avatarUrl: avatarUrl || null,
    clinicKey: clinicKey || 'opd-treat',
    cc: cc || 'ส่งต่อจากจุดคัดกรอง',
    esi: Number(esi) || 4,
    vitals: vitals || buildVitals(Number(esi) || 4),
    waitMinutes: existing?.waitMinutes ?? 0,
    screenedAt: existing?.screenedAt ?? nowHHMM(),
    screenedBy: screenedBy || 'พว.กานดา ศรีวิไล',
    doctor: null,
    claimedAt: null,
  };
  write(existing ? rows.map((r) => (r.id === existing.id ? row : r)) : [...rows, row]);
  return row;
};

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** เรียงลำดับกองกลาง — เร่งด่วนก่อน แล้วจึงรอนานก่อน
    (คิวหมายเลขไม่ใช่ลำดับที่ถูกต้อง เพราะ ESI 2 ที่เพิ่งมาต้องมาก่อน ESI 5 ที่รอนาน) */
export const comparePoolRows = (a, b) => {
  const byEsi = (TRIAGE_LEVELS[a.esi]?.rank ?? 9) - (TRIAGE_LEVELS[b.esi]?.rank ?? 9);
  if (byEsi !== 0) return byEsi;
  const byWait = (b.waitMinutes ?? 0) - (a.waitMinutes ?? 0);
  if (byWait !== 0) return byWait;
  return String(a.queue).localeCompare(String(b.queue));
};

/** จัดกลุ่มตามคลินิกสำหรับมุมมอง "แยกตามคลินิก" — คลินิกที่ไม่มีเคสไม่ต้องขึ้น
    หัวข้อเปล่า ๆ ให้เลื่อนผ่าน */
export const groupRowsByClinic = (rows = []) => {
  const map = new Map();
  rows.forEach((r) => {
    if (!map.has(r.clinicKey)) map.set(r.clinicKey, []);
    map.get(r.clinicKey).push(r);
  });
  /* เรียงกลุ่มตามลำดับเมนู เพื่อให้ตำแหน่งของคลินิกนิ่ง ไม่กระโดดตามจำนวนเคส */
  return TREAT_CLINICS
    .filter((c) => map.has(c.key))
    .map((c) => ({
      clinic: c,
      rows: map.get(c.key).slice().sort(comparePoolRows),
    }));
};
