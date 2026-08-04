/* TOR 1.6.2.5 — "รูปแบบการนัดหมายตามที่ผู้ใช้งานกำหนด".

   Mirrors the HCIS master-data pattern (รหัส + ชื่อ + แบ่งหน้า + เพิ่มรายการเองได้)
   from คู่มือระบบคลินิกตรวจรักษา §2.3. A saved format carries the default
   "นัดมาเพื่อ" list and the "การเตรียมตัวก่อนตรวจ" text that flows onto the printed
   slip (TOR 1.6.3.1).

   Built-in formats are always present and cannot be deleted (only disabled), so
   AppointmentFormPopup's hardcoded TYPE_OPTIONS keeps working as a fallback when
   the catalog is empty. sessionStorage-backed · React 17 subscribe+tick. */

const STORAGE_KEY = 'mih:appointment-type-catalog';

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const pad2 = (n) => String(n).padStart(2, '0');

const stampNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export const APPT_TYPE_MODES = [
  { value: 'onsite', label: 'ตรวจที่หน่วยบริการ (Onsite)' },
  { value: 'telemedicine', label: 'ปรึกษาแพทย์ออนไลน์ (Telemedicine)' },
  { value: 'homevisit', label: 'นัดหมายเยี่ยมบ้าน (Home visit)' },
];

export const APPT_TYPE_MODE_LABEL = (v) =>
  APPT_TYPE_MODES.find((m) => m.value === v)?.label || 'ตรวจที่หน่วยบริการ (Onsite)';

export const RECURRENCE_PRESETS = [
  { value: 0, label: 'ไม่ตั้งค่านัดต่อเนื่อง' },
  { value: 7, label: 'ทุก 7 วัน' },
  { value: 14, label: 'ทุก 14 วัน' },
  { value: 15, label: 'ทุก 15 วัน' },
  { value: 28, label: 'ทุก 28 วัน' },
  { value: 30, label: 'ทุก 30 วัน' },
  { value: 90, label: 'ทุก 90 วัน' },
];

/** รูปแบบมาตรฐานของระบบ — ลบไม่ได้ ปิดใช้งานได้เท่านั้น. */
export const BUILTIN_APPT_TYPES = [
  {
    code: 'STD-GEN', name: 'ตรวจทั่วไป',
    clinics: ['คลินิกตรวจโรคทั่วไป', 'คลินิกอายุรกรรม'],
    slotMinutes: 15, mode: 'onsite', autoAccept: false, needsRoom: true,
    recurrenceEveryDays: 0, purposes: ['P01'],
    prepText: 'นำบัตรประชาชนและบัตรโรงพยาบาลมาด้วยทุกครั้ง มาก่อนเวลานัด 30 นาที',
    active: true, builtin: true,
  },
  {
    code: 'STD-FU', name: 'ติดตามผลการรักษา',
    clinics: ['คลินิกตรวจโรคทั่วไป', 'คลินิกโรคเรื้อรัง (NCD)', 'คลินิกอายุรกรรม'],
    slotMinutes: 15, mode: 'onsite', autoAccept: false, needsRoom: true,
    recurrenceEveryDays: 14, purposes: ['P02', 'P03'],
    prepText: 'งดอาหารและเครื่องดื่มอย่างน้อย 8 ชั่วโมงก่อนเจาะเลือด นำยาที่รับประทานอยู่มาด้วย',
    active: true, builtin: true,
  },
  {
    code: 'STD-MED', name: 'รับยาต่อเนื่อง',
    clinics: ['คลินิกโรคเรื้อรัง (NCD)', 'คลินิกตรวจโรคทั่วไป'],
    slotMinutes: 10, mode: 'onsite', autoAccept: true, needsRoom: false,
    recurrenceEveryDays: 30, purposes: ['P05'],
    prepText: 'นำสมุดบันทึกความดัน / น้ำตาล และซองยาเดิมมาด้วย',
    active: true, builtin: true,
  },
  {
    code: 'STD-TELE', name: 'Telemedicine',
    clinics: ['คลินิกตรวจโรคทั่วไป', 'คลินิกสุขภาพจิต'],
    slotMinutes: 20, mode: 'telemedicine', autoAccept: false, needsRoom: false,
    recurrenceEveryDays: 0, purposes: ['P25'],
    prepText: 'เตรียมอุปกรณ์และสัญญาณอินเทอร์เน็ต เข้าห้องตรวจก่อนเวลานัด 10 นาที',
    active: true, builtin: true,
  },
  {
    code: 'STD-HOME', name: 'เยี่ยมบ้าน',
    clinics: ['คลินิกเวชศาสตร์ครอบครัว', 'คลินิกผู้สูงอายุ'],
    slotMinutes: 60, mode: 'homevisit', autoAccept: false, needsRoom: false,
    recurrenceEveryDays: 30, purposes: ['P24'],
    prepText: 'กรุณามีผู้ดูแลอยู่ที่บ้านในช่วงเวลานัด และเตรียมยาที่ใช้อยู่ทั้งหมด',
    active: true, builtin: true,
  },
];

let catalog = null;
const listeners = new Set();

const notify = () => {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* listener errors must not break the store */ }
  });
};

const persist = () => {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
  } catch { /* quota / private mode */ }
};

const load = () => {
  if (catalog) return catalog;
  if (canUseSessionStorage()) {
    try {
      const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(parsed)) {
        catalog = parsed;
        return catalog;
      }
    } catch { /* fall through */ }
  }
  /* Empty by default — the page's empty state explains that the five built-in
     formats are in use until the unit defines its own. */
  catalog = [];
  persist();
  return catalog;
};

export const subscribeApptTypes = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** เฉพาะรูปแบบที่เจ้าหน้าที่สร้างเอง. */
export const getCustomApptTypes = () => load().map((t) => ({ ...t }));

/** รูปแบบทั้งหมด = built-in + ที่ผู้ใช้งานกำหนด (custom ทับ built-in ที่รหัสซ้ำ). */
export const getAllApptTypes = () => {
  const custom = load();
  const customCodes = new Set(custom.map((t) => t.code));
  return [
    ...BUILTIN_APPT_TYPES.filter((t) => !customCodes.has(t.code)).map((t) => ({ ...t })),
    ...custom.map((t) => ({ ...t })),
  ];
};

export const getApptTypeByCode = (code) =>
  getAllApptTypes().find((t) => t.code === code) || null;

/** Select options for the form popup — falls back to built-ins when empty. */
export const getApptTypeOptions = ({ clinic = '', includeInactive = false } = {}) => {
  const rows = getAllApptTypes()
    .filter((t) => (includeInactive ? true : t.active !== false))
    .filter((t) => (clinic ? (t.clinics || []).includes(clinic) : true));
  const source = rows.length ? rows : BUILTIN_APPT_TYPES;
  return source.map((t) => ({ value: t.name, label: `${t.code} · ${t.name}`, code: t.code }));
};

export const isApptTypeCodeTaken = (code, { ignoreCode = null } = {}) => {
  const needle = String(code || '').trim().toUpperCase();
  if (!needle) return false;
  return getAllApptTypes().some(
    (t) => t.code.toUpperCase() === needle && t.code !== ignoreCode,
  );
};

/** สร้าง / แก้ไข รูปแบบการนัดหมาย. Returns the saved row. */
export const saveApptType = (row, { actor = 'จนท.สมพร ทองดี', originalCode = null } = {}) => {
  const rows = load();
  const idx = rows.findIndex((t) => t.code === (originalCode || row.code));
  const stamp = stampNow();
  const next = {
    code: String(row.code || '').trim().toUpperCase(),
    name: String(row.name || '').trim(),
    clinics: [...(row.clinics || [])],
    slotMinutes: Number(row.slotMinutes) || 15,
    mode: row.mode || 'onsite',
    autoAccept: !!row.autoAccept,
    needsRoom: !!row.needsRoom,
    recurrenceEveryDays: Number(row.recurrenceEveryDays) || 0,
    purposes: [...(row.purposes || [])],
    prepText: row.prepText || '',
    active: row.active !== false,
    builtin: false,
    createdBy: idx >= 0 ? rows[idx].createdBy : actor,
    createdAt: idx >= 0 ? rows[idx].createdAt : stamp,
    updatedBy: actor,
    updatedAt: stamp,
  };
  catalog = idx >= 0
    ? rows.map((t, i) => (i === idx ? next : t))
    : [...rows, next];
  persist();
  notify();
  return { ...next };
};

/** เปิด/ปิดใช้งาน — ใช้แทนการลบเมื่อยังมีนัดในอนาคตอ้างถึงรูปแบบนี้. */
export const setApptTypeActive = (code, active, { actor = 'จนท.สมพร ทองดี' } = {}) => {
  const rows = load();
  const idx = rows.findIndex((t) => t.code === code);
  if (idx < 0) {
    /* Disabling a built-in materialises it into the custom catalog. */
    const builtin = BUILTIN_APPT_TYPES.find((t) => t.code === code);
    if (!builtin) return null;
    return saveApptType({ ...builtin, active }, { actor });
  }
  const next = { ...rows[idx], active: !!active, updatedBy: actor, updatedAt: stampNow() };
  catalog = rows.map((t, i) => (i === idx ? next : t));
  persist();
  notify();
  return { ...next };
};

/** ลบได้เฉพาะรูปแบบที่ผู้ใช้สร้างเองและไม่มีนัดในอนาคตอ้างถึง. */
export const deleteApptType = (code) => {
  const rows = load();
  const target = rows.find((t) => t.code === code);
  if (!target || target.builtin) return false;
  catalog = rows.filter((t) => t.code !== code);
  persist();
  notify();
  return true;
};

/** จำนวนนัดในอนาคตที่ยังใช้รูปแบบนี้ — ใช้บล็อกการลบและเตือนก่อนปิดใช้งาน. */
export const countFutureAppointmentsUsingType = (appointments, type) => {
  if (!type) return 0;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
  return (appointments || []).filter((a) => (
    a.date >= todayKey
    && a.status !== 'cancelled'
    && (a.type === type.name || a.typeCode === type.code)
  )).length;
};

export const resetApptTypeCatalog = () => {
  catalog = [];
  persist();
  notify();
};
