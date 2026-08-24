/* ════════════════════════════════════════════════════════════════════════
   queueCenterStore — ศูนย์กลางข้อมูลคิว (TOR ภาคผนวก ก §1.3)

   แหล่งความจริงเดียวของโมดูล /queue-center (ฝั่งเจ้าหน้าที่) และของโมดูล
   จอแสดงคิว (/queue-display) ที่ import ไฟล์นี้เช่นกัน

   ── PUBLIC CONTRACT (ห้ามเปลี่ยนชื่อ/รูปร่างโดยไม่แจ้ง integrator) ────────
     QUEUE_STATIONS          Array<Station>
     currentByStation        object  { [stationId]: Queue | null }   ← live
     nextQueues(stationId)   Queue[] (เรียงตามลำดับที่จัดแล้ว)
     passedNumbers(stationId)Queue[] (ข้าม / เรียกแล้วไม่มา)
     remainingCount(stationId) number
     announcements           Announcement[] (ใหม่ → เก่า)             ← live
     subscribeQueueCenter(fn) → unsubscribe

   `currentByStation` และ `announcements` เป็น object/array ที่ถูก **แก้ใน
   ที่เดิม (mutate in place)** ไม่เคยถูกแทนที่ด้วย reference ใหม่ — จอ TV จึง
   อ่านค่าเป็นข้อมูลตรง ๆ ได้โดยไม่ค้าง แล้วใช้ subscribeQueueCenter() เป็น
   ตัวสั่ง re-render (คู่ getter `getCurrentByStation()` / `getAnnouncements()`
   มีให้ด้วยสำหรับผู้เรียกที่อยากได้ snapshot)

   ── ข้อจำกัดที่ต้องรู้ ───────────────────────────────────────────────────
   • ไม่มี backend — ทุกอย่างเป็น mock ใน memory (รีเฟรชหน้าแล้วค่ากลับค่าเริ่มต้น)
   • คิวของระบบเดิม (/opd/queue, /registration/queue, /pharmacy/queue,
     /lab/queue, /finance) มี mock ของตัวเอง และ **ห้ามแก้ไฟล์เหล่านั้น**
     ตัวเลขจึงไม่ผูกกัน 1:1 — ไฟล์นี้คือแหล่งเดียวของ /queue-center
   • subscribe/notify pattern เดียวกับ labPrintSettings.js / labCatalog.js
     (React 17 — ห้าม useSyncExternalStore)

   ── ศัพท์/ฟิลด์อิงคู่มือ HCIS เดิม §2.2 "ระบบงานส่งตรวจ" ────────────────
     ส่งตรวจ [ห้องตรวจ] · วันเวลาที่ส่งตรวจ · สิทธิการรักษา · แพทย์ · อาการ ·
     การเข้ามาของผู้ป่วย (ห้องบัตร / นัดมา / ส่งมาจากสถานพยาบาลอื่น) · เหตุผล ·
     เวลามารับบริการ (ในเวลา/นอกเวลา) · ประเภทผู้มารับบริการ · ความเร่งด่วน
   พฤติกรรมที่ยกมาตรง ๆ: แถวที่ยกเลิก "แสดงเป็นสีแดงขีดฆ่า ไม่ลบทิ้ง" และ
   record ที่ปิดแล้ว "แก้ไขไม่ได้ (read-only)"
   ════════════════════════════════════════════════════════════════════════ */

import { PATIENT_PROFILES, getPatientByHN } from '@/data/patientProfiles';
import { MR_PATIENTS } from '@/data/mrPatients';

/* §1.3.6.2 — สถานะห้องยาบนจอคิว **อ่านจากห้องยาจริง** ไม่ใช่ค่า mock ในไฟล์นี้
   เดิม pharmacyStatus ถูก seed ไว้ตายตัว จอ TV จึงโชว์ "พร้อมรับยา" ทั้งที่
   เภสัชยังไม่ได้จัดยา — ผู้รับบริการเดินไปรอที่ช่องจ่ายยาแล้วต้องกลับมานั่งรอใหม่ */
import {
  PHARMACY_QUEUE,
  DISPENSE_STATUS,
  canDispensePharmacyOrder,
} from '@/data/pharmacyQueue';

/* ─────────────────────────────────────────────────────────── หน่วยบริการ */

export const QUEUE_CENTER_SITE = {
  name: 'ศูนย์บริการสาธารณสุข 4 ดินแดง',
  office: 'สำนักอนามัย กรุงเทพมหานคร',
  code: '11004',
  phone: '0 2245 1000',
};

/* ─────────────────────────────────────────────────────── จุดบริการ (1.3.7.1)

   prefix ตรงกับ SERVICES / SUB_SERVICES ใน `src/data/kioskMock.js` ทุกตัว
   (S F P L A B K E C M D T V G X Y) เพื่อให้บัตรคิวที่ออกจาก /kiosk กับที่
   ออกจากเคาน์เตอร์เป็นเลขชุดเดียวกัน                                        */

export const QUEUE_STATIONS = [
  { id: 'st-screening', code: 'SCR', label: 'ซักประวัติ / คัดกรอง', zone: 'โซน A', floor: 'ชั้น 1', prefix: 'S', sourceModule: 'registration', sourcePath: '/registration/queue', displayId: 'tv-a1', active: true, order: 1,  serviceType: 'screening' },
  { id: 'st-opd',       code: 'OPD', label: 'ห้องตรวจ OPD ทั่วไป',   zone: 'โซน A', floor: 'ชั้น 1', prefix: 'A', sourceModule: 'opd',          sourcePath: '/opd/queue',          displayId: 'tv-a1', active: true, order: 2,  serviceType: 'consultation' },
  { id: 'st-anc',       code: 'ANC', label: 'คลินิกฝากครรภ์',        zone: 'โซน C', floor: 'ชั้น 3', prefix: 'B', sourceModule: 'opd',          sourcePath: '/opd/queue',          displayId: 'tv-c3', active: true, order: 3,  serviceType: 'consultation' },
  { id: 'st-ped',       code: 'PED', label: 'คลินิกกุมารเวช',        zone: 'โซน B', floor: 'ชั้น 2', prefix: 'K', sourceModule: 'opd',          sourcePath: '/opd/queue',          displayId: 'tv-b2', active: true, order: 4,  serviceType: 'consultation' },
  { id: 'st-elderly',   code: 'ELD', label: 'คลินิกผู้สูงอายุ',       zone: 'โซน B', floor: 'ชั้น 2', prefix: 'E', sourceModule: 'opd',          sourcePath: '/opd/queue',          displayId: 'tv-b2', active: true, order: 5,  serviceType: 'consultation' },
  { id: 'st-ncd',       code: 'NCD', label: 'คลินิกโรคเรื้อรัง',      zone: 'โซน B', floor: 'ชั้น 2', prefix: 'C', sourceModule: 'opd',          sourcePath: '/opd/queue',          displayId: 'tv-b2', active: true, order: 6,  serviceType: 'consultation' },
  { id: 'st-mental',    code: 'MEN', label: 'คลินิกสุขภาพจิต',       zone: 'โซน C', floor: 'ชั้น 3', prefix: 'M', sourceModule: 'opd',          sourcePath: '/opd/queue',          displayId: 'tv-c3', active: true, order: 7,  serviceType: 'consultation' },
  { id: 'st-dental',    code: 'DEN', label: 'คลินิกทันตกรรม',        zone: 'โซน C', floor: 'ชั้น 3', prefix: 'D', sourceModule: 'opd',          sourcePath: '/opd/queue',          displayId: 'tv-c3', active: true, order: 8,  serviceType: 'consultation' },
  { id: 'st-tb',        code: 'TB',  label: 'คลินิกวัณโรค',          zone: 'โซน D', floor: 'ชั้น 1', prefix: 'T', sourceModule: 'opd',          sourcePath: '/opd/queue',          displayId: 'tv-d1', active: true, order: 9,  serviceType: 'consultation' },
  { id: 'st-vaccine',   code: 'VAC', label: 'ห้องวัคซีน',            zone: 'โซน D', floor: 'ชั้น 1', prefix: 'V', sourceModule: 'opd',          sourcePath: '/opd/queue',          displayId: 'tv-d1', active: true, order: 10, serviceType: 'other' },
  { id: 'st-family',    code: 'FPL', label: 'วางแผนครอบครัว',        zone: 'โซน D', floor: 'ชั้น 1', prefix: 'G', sourceModule: 'opd',          sourcePath: '/opd/queue',          displayId: 'tv-d1', active: true, order: 11, serviceType: 'other' },
  { id: 'st-lab',       code: 'LAB', label: 'เจาะเลือด / ฉีดยา',     zone: 'โซน A', floor: 'ชั้น 1', prefix: 'L', sourceModule: 'lab',          sourcePath: '/lab/queue',          displayId: 'tv-a1', active: true, order: 12, serviceType: 'lab' },
  { id: 'st-xray',      code: 'XR',  label: 'ห้องเอกซเรย์',          zone: 'โซน A', floor: 'ชั้น 1', prefix: 'X', sourceModule: 'xray',         sourcePath: '/xray',               displayId: 'tv-a1', active: true, order: 13, serviceType: 'other' },
  { id: 'st-physio',    code: 'PHY', label: 'กายภาพบำบัด',           zone: 'โซน D', floor: 'ชั้น 1', prefix: 'Y', sourceModule: 'manual',       sourcePath: '',                    displayId: 'tv-d1', active: false, order: 14, serviceType: 'other' },
  { id: 'st-finance',   code: 'FIN', label: 'การเงิน / ชำระเงิน',     zone: 'โซน A', floor: 'ชั้น 1', prefix: 'F', sourceModule: 'finance',      sourcePath: '/finance',            displayId: 'tv-a1', active: true, order: 15, serviceType: 'finance' },
  { id: 'st-pharmacy',  code: 'PHA', label: 'ห้องยา / รับยา',        zone: 'โซน A', floor: 'ชั้น 1', prefix: 'P', sourceModule: 'pharmacy',     sourcePath: '/pharmacy/queue',     displayId: 'tv-a1', active: true, order: 16, serviceType: 'pharmacy' },
];

export const QUEUE_DISPLAYS = [
  { id: 'tv-a1', label: 'จอ A1 — โถงชั้น 1',      zone: 'โซน A', floor: 'ชั้น 1' },
  { id: 'tv-b2', label: 'จอ B2 — หน้าห้องตรวจ 2', zone: 'โซน B', floor: 'ชั้น 2' },
  { id: 'tv-c3', label: 'จอ C3 — หน้าห้องตรวจ 3', zone: 'โซน C', floor: 'ชั้น 3' },
  { id: 'tv-d1', label: 'จอ D1 — อาคารบริการ',    zone: 'โซน D', floor: 'ชั้น 1' },
];

export const getStation = (stationId) =>
  QUEUE_STATIONS.find((s) => s.id === stationId) || null;

export const getStationLabel = (stationId) => getStation(stationId)?.label || '—';

/* ────────────────────────────────────────────── ประเภทคิว / ความเร่งด่วน */

/** ประเภทคิว (1.3.2.2 / 1.3.7.1) — `weight` ยิ่งน้อยยิ่งถูกจัดไว้ก่อน */
export const QUEUE_TYPES = [
  { key: 'urgent',      label: 'ด่วน',              color: 'red',    weight: 1 },
  { key: 'elderly',     label: 'ผู้สูงอายุ/ผู้พิการ', color: 'purple', weight: 2 },
  { key: 'appointment', label: 'นัดหมาย',            color: 'blue',   weight: 3 },
  { key: 'general',     label: 'ทั่วไป',             color: 'teal',   weight: 4 },
];

/** ความเร่งด่วน — คู่มือ HCIS §2.2 (อุบัติเหตุ / ฉุกเฉิน / เร่งด่วน) */
export const URGENCY_LEVELS = [
  { key: 'normal',    label: 'ปกติ',      color: 'grey'   },
  { key: 'urgent',    label: 'เร่งด่วน',   color: 'yellow' },
  { key: 'emergency', label: 'ฉุกเฉิน',    color: 'orange' },
  { key: 'accident',  label: 'อุบัติเหตุ',  color: 'red'    },
];

/** การเข้ามาของผู้ป่วย — คู่มือ HCIS §2.2 */
export const ENTRY_CHANNELS = [
  { key: 'counter',  label: 'ห้องบัตร' },
  { key: 'kiosk',    label: 'Kiosk (ตู้กดบัตรคิว)' },
  { key: 'appointment', label: 'นัดมา' },
  { key: 'referral', label: 'ส่งมาจากสถานพยาบาลอื่น' },
];

/** ประเภทผู้มารับบริการ — คู่มือ HCIS §2.2 */
export const VISITOR_TYPES = [
  { key: 'existing', label: 'ผู้ป่วยเก่า' },
  { key: 'new',      label: 'ผู้ป่วยใหม่' },
  { key: 'other',    label: 'ผู้รับบริการอื่น' },
];

/** เวลามารับบริการ — ในเวลา / นอกเวลา */
export const SERVICE_TIMES = [
  { key: 'inTime',  label: 'ในเวลาราชการ' },
  { key: 'outTime', label: 'นอกเวลาราชการ' },
];

export const QUEUE_STATUSES = [
  { key: 'waiting',   label: 'รอเรียก',        color: 'blue'   },
  { key: 'calling',   label: 'กำลังเรียก',      color: 'orange' },
  { key: 'serving',   label: 'กำลังให้บริการ',  color: 'teal'   },
  { key: 'paused',    label: 'พักคิว',         color: 'yellow' },
  { key: 'passed',    label: 'ข้ามคิว',        color: 'magenta' },
  { key: 'done',      label: 'เสร็จสิ้น',       color: 'green'  },
  { key: 'cancelled', label: 'ยกเลิก',         color: 'red'    },
];

export const statusMeta = (key) =>
  QUEUE_STATUSES.find((s) => s.key === key) || QUEUE_STATUSES[0];

/** สถานะเตรียมยา (1.3.6.2) — เฉพาะคิวจุดรับยา */
export const PHARMACY_PREP_STATUSES = [
  { key: 'pending',   label: 'รอจัดยา',   color: 'grey'   },
  { key: 'preparing', label: 'กำลังจัดยา', color: 'orange' },
  { key: 'ready',     label: 'พร้อมจ่าย',  color: 'green'  },
];

/** คิวที่ปิดแล้ว — แก้ไขไม่ได้ (คู่มือ HCIS: record เก่าเป็น read-only) */
export const isQueueClosed = (q) => !!q && (q.status === 'done' || q.status === 'cancelled');

/* ────────────────────────────────────────────────── ผู้ทำรายการ / สิทธิ */

export const QUEUE_ROLES = [
  { key: 'staff',  name: 'สมหญิง รักษาดี',  role: 'เจ้าหน้าที่จุดบริการ',      canOperate: true,  canAdmin: false },
  { key: 'admin',  name: 'ปรีชา ธนบดินทร์', role: 'ผู้ดูแลระบบคิว',           canOperate: true,  canAdmin: true  },
  { key: 'viewer', name: 'อารีย์ ชมชื่น',    role: 'ผู้ดูข้อมูล (อ่านอย่างเดียว)', canOperate: false, canAdmin: false },
];

let actorKey = 'staff';

export const getQueueActor = () =>
  QUEUE_ROLES.find((r) => r.key === actorKey) || QUEUE_ROLES[0];

export const setQueueActorRole = (key) => {
  if (!QUEUE_ROLES.some((r) => r.key === key)) return;
  actorKey = key;
  notify();
};

/* ────────────────────────────────────────────── subscribe / notify (React 17) */

const listeners = new Set();
const settingsListeners = new Set();

export const subscribeQueueCenter = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const subscribeQueueSettings = (fn) => {
  settingsListeners.add(fn);
  return () => settingsListeners.delete(fn);
};

const notify = () => listeners.forEach((fn) => fn());
const notifySettings = () => {
  settingsListeners.forEach((fn) => fn());
  notify();
};

/* ──────────────────────────────────────────────────── ตั้งค่าระบบคิว (1.3.7) */

const defaultTicketText =
  'กรุณานั่งรอบริเวณหน้าจุดบริการ และเตรียมบัตรประชาชนให้เจ้าหน้าที่\n'
  + 'หากไม่ได้ยินเสียงเรียกคิว โปรดติดต่อเจ้าหน้าที่ประจำจุด';

const settings = {
  /* (4) เสียงเรียกคิว — 1.3.4.2 · ค่าเหล่านี้จอ TV อ่านไปเล่นจริง */
  voice: {
    enabled: true,
    language: 'th',
    template: 'ขอเชิญหมายเลข {queue} ที่ {station}',
    repeat: 2,
    volume: 70,
    chime: 'ding-dong',
    rateMs: 900,
  },
  /* (3) รูปแบบรหัสคิว */
  codeFormat: {
    digits: 3,
    separator: '-',
    resetCycle: 'daily',
    padZero: true,
    /* **มติ คทง.1 ครั้งที่ 3** — "คิวเดียวตลอดการรับบริการ" (Single Queue):
       ผู้รับบริการหนึ่งคนใน 1 Visit ถือเลขคิวใบเดียวตั้งแต่คัดกรอง → ห้องตรวจ
       → ห้องยา → การเงิน ไม่ต้องรับบัตรคิวใหม่ทุกจุด เพราะของเดิมสับสนมาก
       (คนไข้ถือบัตร 4 ใบ เลขคนละชุด ไม่รู้ว่าจอไหนเรียกเลขไหน)
       ลำดับ "เรียก" ยังเป็นของแต่ละจุดตามเดิม จอ TV จึงต้องมีข้อความกำกับว่า
       ลำดับเรียกอาจไม่เรียงตามเลขคิว */
    singleQueuePerVisit: true,
  },
  /* (5) การเตือนเวลารอ — 1.3.7.2 (นาที ต่อประเภทคิว) */
  waitAlert: {
    enabled: true,
    thresholds: { urgent: 10, elderly: 20, appointment: 25, general: 30 },
    level: 'warning',
    channels: ['screen', 'toast'],
  },
  /* (6) ข้อความบนบัตรคิว — 1.3.7.3 */
  ticketText: {
    default: defaultTicketText,
    maxChars: 220,
    perStation: {
      'st-pharmacy': 'รอเรียกคิวรับยาที่หน้าห้องยา · ตรวจสอบชื่อ-สกุลบนซองยาทุกครั้งก่อนออกจากจุดบริการ',
      'st-lab': 'งดน้ำ-งดอาหารตามที่แพทย์สั่ง · แจ้งเจ้าหน้าที่หากมีประวัติเป็นลมขณะเจาะเลือด',
    },
  },
  /* (2) นัดหมาย → คิว (1.3.2.3 / 1.3.6.1) */
  appointmentRule: {
    sortByAppointment: true,
    roundWindowMinutes: 30,
    walkinRule: 'append',
    graceMinutes: 15,
  },
  /* (3) สถานะเตรียมยา → ป้ายบนคิว/จอ TV (1.3.6.2) */
  pharmacyMap: {
    pending: 'รอจัดยา',
    preparing: 'กำลังจัดยา',
    /* มติ คทง.1 (Sequence Lock) — ยาจัดเสร็จแล้วแต่ยังไม่ได้ชำระเงิน/ปิดสิทธิ
       ต้องไม่ขึ้นว่า "พร้อมรับยา" บนจอ ไม่งั้นผู้รับบริการมายืนรอที่ช่องจ่ายยา
       ทั้งที่ยังจ่ายเงินไม่เสร็จ แล้วเกิดข้อโต้แย้งหน้าเคาน์เตอร์ */
    awaitingPayment: 'รอชำระเงิน/ปิดสิทธิ',
    ready: 'พร้อมรับยา',
  },
  /* บันทึกผู้แก้ไขล่าสุดของแต่ละ section (ConsentAuditBar) */
  audit: {},
};

export const getQueueSettings = () => JSON.parse(JSON.stringify(settings));

/**
 * setQueueSetting('voice', 'repeat', 3)          → ตั้งค่าเดี่ยว
 * setQueueSetting('voice', { repeat: 3, ... })   → patch ทั้งก้อน
 */
export const setQueueSetting = (section, keyOrPatch, maybeValue) => {
  if (!settings[section]) return;
  if (keyOrPatch && typeof keyOrPatch === 'object') {
    settings[section] = { ...settings[section], ...keyOrPatch };
  } else {
    settings[section] = { ...settings[section], [keyOrPatch]: maybeValue };
  }
  const actor = getQueueActor();
  settings.audit = {
    ...settings.audit,
    [section]: { by: actor.name, role: actor.role, at: new Date().toISOString() },
  };
  notifySettings();
};

export const getSettingsAudit = (section) => settings.audit[section] || null;

/* ─────────────────────────────────────── ประเภทคิวที่แก้ไขได้ (1.3.7.1) */

let queueTypes = QUEUE_TYPES.map((t) => ({ ...t, stationIds: 'all' }));

export const getQueueTypes = () => queueTypes.map((t) => ({ ...t }));

export const queueTypeMeta = (key) =>
  queueTypes.find((t) => t.key === key) || { key, label: key, color: 'grey', weight: 99 };

export const upsertQueueType = (type) => {
  const idx = queueTypes.findIndex((t) => t.key === type.key);
  if (idx >= 0) queueTypes[idx] = { ...queueTypes[idx], ...type };
  else queueTypes = [...queueTypes, { stationIds: 'all', ...type }];
  const actor = getQueueActor();
  settings.audit = {
    ...settings.audit,
    queueTypes: { by: actor.name, role: actor.role, at: new Date().toISOString() },
  };
  notifySettings();
};

export const removeQueueType = (key) => {
  /* กันลบประเภทที่ยังมีคิว active อยู่ */
  const inUse = queues.some((q) => q.queueType === key && !isQueueClosed(q));
  if (inUse) return { ok: false, reason: 'ยังมีคิวที่ใช้ประเภทนี้อยู่' };
  queueTypes = queueTypes.filter((t) => t.key !== key);
  notifySettings();
  return { ok: true };
};

/* ─────────────────────────────────────────── จุดบริการ CRUD (1.3.7.1) */

/** บันทึกจุดบริการ — prefix ว่าง/ซ้ำ ถูกปฏิเสธที่ store (ไม่ใช่แค่ hint ใน UI)
 *  คืน { ok, reason } เสมอ เพื่อให้ทุกหน้าจอ (popup + grid ตั้งค่า) แสดง error ได้ */
export const upsertStation = (station) => {
  const prefix = String(station.prefix ?? '').trim().toUpperCase();
  if (!prefix) return { ok: false, reason: 'กรุณาระบุ prefix ของจุดบริการ' };
  if (isPrefixTaken(prefix, station.id)) {
    return { ok: false, reason: `prefix "${prefix}" ถูกใช้กับจุดบริการอื่นแล้ว` };
  }
  const next = { ...station, prefix };
  const idx = QUEUE_STATIONS.findIndex((s) => s.id === next.id);
  if (idx >= 0) QUEUE_STATIONS[idx] = { ...QUEUE_STATIONS[idx], ...next };
  else QUEUE_STATIONS.push({ active: true, order: QUEUE_STATIONS.length + 1, ...next });
  QUEUE_STATIONS.sort((a, b) => a.order - b.order);
  notifySettings();
  return { ok: true };
};

/** ห้ามลบจุดบริการที่ยังมีคิวค้าง — คืนจำนวนคิวค้างให้ UI แจ้งผู้ใช้ */
export const removeStation = (stationId) => {
  const pending = queues.filter((q) => q.stationId === stationId && !isQueueClosed(q)).length;
  if (pending > 0) return { ok: false, pending };
  const idx = QUEUE_STATIONS.findIndex((s) => s.id === stationId);
  if (idx >= 0) QUEUE_STATIONS.splice(idx, 1);
  notifySettings();
  return { ok: true, pending: 0 };
};

/** prefix ซ้ำระหว่างจุดบริการไม่ได้ (validation 1.3.7.1) */
export const isPrefixTaken = (prefix, exceptStationId) =>
  QUEUE_STATIONS.some((s) => s.prefix === String(prefix).toUpperCase() && s.id !== exceptStationId);

/* ─────────────────────────────────────────────────── ตัวช่วยเวลา / รหัสคิว */

const now = () => new Date();
const iso = (d) => d.toISOString();
const minutesAgo = (m) => new Date(Date.now() - m * 60000);

export const formatClock = (value) => {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const formatDateTh = (value) => {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const waitMinutes = (q) => {
  if (!q?.issuedAt) return 0;
  const end = q.completedAt || q.cancelledAt || q.arrivedAt || q.calledAt || Date.now();
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(q.issuedAt).getTime()) / 60000));
};

export const waitThresholdFor = (q) =>
  settings.waitAlert.thresholds[q?.queueType] ?? settings.waitAlert.thresholds.general;

/** 1.3.7.2 — เกินเกณฑ์เวลารอหรือยัง */
export const isOverdue = (q) => {
  if (!settings.waitAlert.enabled) return false;
  if (!q || isQueueClosed(q)) return false;
  if (q.status === 'serving' || q.status === 'paused') return false;
  return waitMinutes(q) > waitThresholdFor(q);
};

const counters = {};

/* มติ คทง.1 — ทะเบียนเลขคิวประจำ Visit: HN → { code, issuedDate, firstStationId }
   ใช้ตัดสินว่าผู้รับบริการรายนี้ "มีเลขคิวของวันนี้แล้วหรือยัง" ก่อนออกใบใหม่
   (คีย์เป็น HN + วันที่ เพราะรอบคิว reset รายวันตาม codeFormat.resetCycle) */
const visitCodes = {};

const todayKey = () => iso(now()).slice(0, 10);

const visitKeyOf = (patient) => {
  const hn = patient?.hn || patient?.HN || '';
  return hn ? `${hn}@${todayKey()}` : '';
};

/** เลขคิวประจำ Visit ของผู้รับบริการรายนี้ (null = ยังไม่เคยออกคิววันนี้) */
export const getVisitQueueCode = (patient) => {
  const key = visitKeyOf(patient);
  return key ? visitCodes[key] || null : null;
};

export const previewQueueCode = (stationId, seq) => {
  const st = getStation(stationId);
  const { digits, separator, padZero } = settings.codeFormat;
  const n = seq ?? ((counters[stationId] || 0) + 1);
  const body = padZero ? String(n).padStart(Math.max(1, digits), '0') : String(n);
  return `${st?.prefix || '?'}${separator}${body}`;
};

/* ยังคงไว้สำหรับโหมด "คิวแยกตามจุดบริการ" (singleQueuePerVisit = false) และ
   ทางเรียกอื่นในอนาคต — issueQueue/transferQueue เดินเลขเองเพื่อรองรับ
   Single Queue (มติ คทง.1) */
// eslint-disable-next-line no-unused-vars
const nextQueueCode = (stationId) => {
  counters[stationId] = (counters[stationId] || 0) + 1;
  return previewQueueCode(stationId, counters[stationId]);
};

/* ──────────────────────────────────────────────────────────── audit trail */

const pushAudit = (q, action, reason) => {
  const actor = getQueueActor();
  q.audit = [
    ...(q.audit || []),
    { actor: actor.name, role: actor.role, at: iso(now()), action, reason: reason || '' },
  ];
};

export const getQueueHistory = (queueId) => {
  const q = queues.find((row) => row.id === queueId);
  return q ? [...(q.audit || [])].reverse() : [];
};

/* ────────────────────────────────────────────── บันทึกการเปิดดูข้อมูลลับ */

const piiLog = [];

/** บันทึกการกดเปิด HN / เลขบัตรประชาชน (edge case: ข้อมูลส่วนบุคคล) */
export const logPiiReveal = (queueId, field) => {
  const actor = getQueueActor();
  piiLog.unshift({
    id: `pii-${piiLog.length + 1}`,
    queueId,
    field,
    actor: actor.name,
    role: actor.role,
    at: iso(now()),
  });
  notify();
};

export const getPiiLog = () => [...piiLog];

/** ปกปิด HN/เลขบัตรจนกว่าจะกดเปิด */
export const maskIdentifier = (value) => {
  const s = String(value || '');
  if (s.length <= 4) return '••••';
  return `${s.slice(0, 2)}${'•'.repeat(Math.max(3, s.length - 4))}${s.slice(-2)}`;
};

/* ═══════════════════════════════════════════════════════ ข้อมูลคิว (mock) */

/* live objects — mutate in place, never reassign (สัญญากับจอ TV) */
export const currentByStation = {};
export const announcements = [];

export const getCurrentByStation = () => ({ ...currentByStation });
export const getAnnouncements = () => [...announcements];

let seq = 0;
let queues = [];

const profilePool = PATIENT_PROFILES.map((p) => ({
  hn: p.hn,
  name: p.shortName,
  fullName: p.fullName,
  nationalId: p.nationalId,
  rights: p.insurance,
  avatarUrl: p.avatarUrl,
  doctor: p.doctor,
  patientType: p.patientType === 'ผู้ป่วยใหม่' ? 'new' : 'existing',
}));

const mrPool = MR_PATIENTS.slice(0, 12).map((p) => ({
  hn: p.hn,
  name: `${p.firstNameTh} ${p.lastNameTh}`,
  fullName: `${p.prefixTh}${p.firstNameTh} ${p.lastNameTh}`,
  nationalId: String(p.nationalId || '').replace(/-/g, ''),
  rights: p.rights || 'บัตรทอง',
  avatarUrl: getPatientByHN(p.hn)?.avatarUrl,
  doctor: p.doctor || 'นพ.อนันต์ พงศ์ภักดี',
  patientType: 'existing',
}));

/** ชุดผู้รับบริการที่ใช้สร้าง mock — ไม่ซ้ำ HN */
export const QUEUE_PATIENT_POOL = (() => {
  const seen = new Set();
  return [...profilePool, ...mrPool].filter((p) => {
    if (!p.hn || seen.has(p.hn)) return false;
    seen.add(p.hn);
    return true;
  });
})();

const SYMPTOMS = [
  'ไข้ ไอ เจ็บคอ 2 วัน',
  'ปวดศีรษะ เวียนหัว',
  'ตรวจติดตามความดันโลหิตสูง',
  'ตรวจติดตามเบาหวาน + รับยาต่อเนื่อง',
  'ปวดท้องน้อย',
  'ผื่นคันตามลำตัว',
  'มารับวัคซีนไข้หวัดใหญ่',
  'ปวดเข่าเรื้อรัง เดินลำบาก',
  'นอนไม่หลับ เครียดจากงาน',
  'ปวดฟันกรามล่างขวา',
  'ตรวจครรภ์ตามนัด',
  'ตรวจสุขภาพประจำปี',
];

const mkQueue = ({
  stationId,
  patient,
  queueType = 'general',
  urgency = 'normal',
  entryChannel = 'kiosk',
  visitorType = 'existing',
  serviceTime = 'inTime',
  status = 'waiting',
  issuedMinAgo = 10,
  calledMinAgo = null,
  appointmentTime = null,
  symptom = SYMPTOMS[0],
  pharmacyStatus = null,
  rightsExpired = false,
  order,
  reason = '',
}) => {
  seq += 1;
  counters[stationId] = (counters[stationId] || 0) + 1;
  const issuedAt = minutesAgo(issuedMinAgo);
  const q = {
    id: `q-${String(seq).padStart(4, '0')}`,
    code: previewQueueCode(stationId, counters[stationId]),
    seqNo: counters[stationId],
    stationId,
    patient: { ...patient, rightsExpired },
    queueType,
    urgency,
    entryChannel,
    visitorType,
    serviceTime,
    symptom,
    doctor: patient.doctor,
    appointmentTime,
    issuedAt: iso(issuedAt),
    calledAt: calledMinAgo != null ? iso(minutesAgo(calledMinAgo)) : null,
    arrivedAt: null,
    completedAt: null,
    cancelledAt: null,
    status,
    order: order ?? counters[stationId],
    priority: queueType === 'urgent' || urgency !== 'normal',
    pharmacyStatus,
    callCount: calledMinAgo != null ? 1 : 0,
    lastCallAt: calledMinAgo != null ? iso(minutesAgo(calledMinAgo)) : null,
    printCount: 1,
    lastPrintAt: iso(issuedAt),
    cancelReason: '',
    transferFrom: null,
    note: '',
    audit: [
      {
        actor: entryChannel === 'kiosk' ? 'ตู้ Kiosk (อัตโนมัติ)' : 'สมหญิง รักษาดี',
        role: entryChannel === 'kiosk' ? 'ระบบ' : 'เจ้าหน้าที่จุดบริการ',
        at: iso(issuedAt),
        action: 'ออกคิว',
        reason: reason || '',
      },
    ],
  };
  if (calledMinAgo != null) {
    q.audit.push({
      actor: 'สมหญิง รักษาดี', role: 'เจ้าหน้าที่จุดบริการ',
      at: iso(minutesAgo(calledMinAgo)), action: 'เรียกคิว', reason: '',
    });
  }
  return q;
};

const P = (i) => QUEUE_PATIENT_POOL[i % QUEUE_PATIENT_POOL.length];

queues = [
  /* ── ห้องตรวจ OPD ทั่วไป (A) — จุดบริการหลักที่หน้าคอนโซลเปิดมาเจอ ── */
  mkQueue({ stationId: 'st-opd', patient: P(0),  queueType: 'appointment', entryChannel: 'appointment', status: 'serving', issuedMinAgo: 62, calledMinAgo: 12, appointmentTime: '09:00', symptom: SYMPTOMS[2] }),
  mkQueue({ stationId: 'st-opd', patient: P(1),  queueType: 'urgent', urgency: 'emergency', entryChannel: 'counter', status: 'waiting', issuedMinAgo: 41, symptom: 'เจ็บแน่นหน้าอก หายใจไม่สะดวก' }),
  mkQueue({ stationId: 'st-opd', patient: P(2),  queueType: 'elderly', entryChannel: 'kiosk', status: 'waiting', issuedMinAgo: 35, symptom: SYMPTOMS[7] }),
  mkQueue({ stationId: 'st-opd', patient: P(3),  queueType: 'general', entryChannel: 'kiosk', status: 'waiting', issuedMinAgo: 28, symptom: SYMPTOMS[0] }),
  mkQueue({ stationId: 'st-opd', patient: P(4),  queueType: 'general', entryChannel: 'kiosk', status: 'waiting', issuedMinAgo: 22, symptom: SYMPTOMS[4], rightsExpired: true }),
  mkQueue({ stationId: 'st-opd', patient: P(5),  queueType: 'appointment', entryChannel: 'appointment', status: 'paused', issuedMinAgo: 55, appointmentTime: '09:30', symptom: SYMPTOMS[3] }),
  mkQueue({ stationId: 'st-opd', patient: P(6),  queueType: 'general', entryChannel: 'kiosk', status: 'passed', issuedMinAgo: 70, calledMinAgo: 18, symptom: SYMPTOMS[5] }),
  mkQueue({ stationId: 'st-opd', patient: P(7),  queueType: 'general', entryChannel: 'counter', status: 'done', issuedMinAgo: 120, calledMinAgo: 95, symptom: SYMPTOMS[11] }),
  mkQueue({ stationId: 'st-opd', patient: P(8),  queueType: 'general', entryChannel: 'kiosk', status: 'done', issuedMinAgo: 140, calledMinAgo: 115, symptom: SYMPTOMS[1] }),
  mkQueue({ stationId: 'st-opd', patient: P(9),  queueType: 'general', entryChannel: 'kiosk', status: 'cancelled', issuedMinAgo: 100, symptom: SYMPTOMS[6], reason: 'ผู้รับบริการแจ้งขอเลื่อนไปวันอื่น' }),
  mkQueue({ stationId: 'st-opd', patient: P(10), queueType: 'general', entryChannel: 'kiosk', status: 'waiting', issuedMinAgo: 15, symptom: SYMPTOMS[1] }),
  mkQueue({ stationId: 'st-opd', patient: P(11), queueType: 'general', entryChannel: 'referral', visitorType: 'new', status: 'waiting', issuedMinAgo: 9, symptom: 'ส่งตัวจาก รพ.กลาง เพื่อติดตามอาการ' }),

  /* ── ซักประวัติ (S) ── */
  mkQueue({ stationId: 'st-screening', patient: P(12), queueType: 'general', status: 'serving', issuedMinAgo: 25, calledMinAgo: 5, symptom: SYMPTOMS[0] }),
  mkQueue({ stationId: 'st-screening', patient: P(13), queueType: 'elderly', status: 'waiting', issuedMinAgo: 33, symptom: SYMPTOMS[7] }),
  mkQueue({ stationId: 'st-screening', patient: P(14), queueType: 'general', visitorType: 'new', entryChannel: 'counter', status: 'waiting', issuedMinAgo: 12, symptom: SYMPTOMS[11] }),
  mkQueue({ stationId: 'st-screening', patient: P(15), queueType: 'general', status: 'waiting', issuedMinAgo: 6, symptom: SYMPTOMS[4] }),
  mkQueue({ stationId: 'st-screening', patient: P(16), queueType: 'general', status: 'done', issuedMinAgo: 90, calledMinAgo: 80, symptom: SYMPTOMS[1] }),

  /* ── ห้องยา (P) — มีสถานะเตรียมยา 1.3.6.2 ── */
  mkQueue({ stationId: 'st-pharmacy', patient: P(7),  queueType: 'general', status: 'waiting', issuedMinAgo: 24, pharmacyStatus: 'ready', symptom: SYMPTOMS[11] }),
  mkQueue({ stationId: 'st-pharmacy', patient: P(8),  queueType: 'elderly', status: 'waiting', issuedMinAgo: 19, pharmacyStatus: 'preparing', symptom: SYMPTOMS[1] }),
  mkQueue({ stationId: 'st-pharmacy', patient: P(17), queueType: 'general', status: 'waiting', issuedMinAgo: 11, pharmacyStatus: 'pending', symptom: SYMPTOMS[3] }),
  mkQueue({ stationId: 'st-pharmacy', patient: P(18), queueType: 'general', status: 'serving', issuedMinAgo: 30, calledMinAgo: 3, pharmacyStatus: 'ready', symptom: SYMPTOMS[2] }),
  mkQueue({ stationId: 'st-pharmacy', patient: P(19), queueType: 'general', status: 'done', issuedMinAgo: 75, calledMinAgo: 60, pharmacyStatus: 'ready', symptom: SYMPTOMS[5] }),

  /* ── การเงิน (F) ── */
  mkQueue({ stationId: 'st-finance', patient: P(20), queueType: 'general', status: 'waiting', issuedMinAgo: 18, symptom: SYMPTOMS[2] }),
  mkQueue({ stationId: 'st-finance', patient: P(21), queueType: 'general', status: 'waiting', issuedMinAgo: 8, symptom: SYMPTOMS[0] }),
  mkQueue({ stationId: 'st-finance', patient: P(22), queueType: 'general', status: 'serving', issuedMinAgo: 27, calledMinAgo: 2, symptom: SYMPTOMS[11] }),

  /* ── เจาะเลือด (L) ── */
  mkQueue({ stationId: 'st-lab', patient: P(23), queueType: 'general', status: 'waiting', issuedMinAgo: 45, symptom: SYMPTOMS[3] }),
  mkQueue({ stationId: 'st-lab', patient: P(24), queueType: 'appointment', entryChannel: 'appointment', status: 'waiting', issuedMinAgo: 20, appointmentTime: '10:00', symptom: SYMPTOMS[11] }),
  mkQueue({ stationId: 'st-lab', patient: P(0),  queueType: 'general', status: 'serving', issuedMinAgo: 38, calledMinAgo: 4, symptom: SYMPTOMS[2] }),
  mkQueue({ stationId: 'st-lab', patient: P(3),  queueType: 'general', status: 'passed', issuedMinAgo: 58, calledMinAgo: 22, symptom: SYMPTOMS[1] }),

  /* ── คลินิกเฉพาะทาง ── */
  mkQueue({ stationId: 'st-ncd', patient: P(5),  queueType: 'appointment', entryChannel: 'appointment', status: 'waiting', issuedMinAgo: 31, appointmentTime: '09:30', symptom: SYMPTOMS[3] }),
  mkQueue({ stationId: 'st-ncd', patient: P(6),  queueType: 'elderly', status: 'serving', issuedMinAgo: 44, calledMinAgo: 7, symptom: SYMPTOMS[2] }),
  mkQueue({ stationId: 'st-ncd', patient: P(9),  queueType: 'general', status: 'waiting', issuedMinAgo: 14, symptom: SYMPTOMS[2] }),
  mkQueue({ stationId: 'st-anc', patient: P(10), queueType: 'appointment', entryChannel: 'appointment', status: 'waiting', issuedMinAgo: 16, appointmentTime: '10:15', symptom: SYMPTOMS[10] }),
  mkQueue({ stationId: 'st-anc', patient: P(11), queueType: 'general', status: 'serving', issuedMinAgo: 36, calledMinAgo: 6, symptom: SYMPTOMS[10] }),
  mkQueue({ stationId: 'st-dental', patient: P(12), queueType: 'general', status: 'waiting', issuedMinAgo: 26, symptom: SYMPTOMS[9] }),
  mkQueue({ stationId: 'st-dental', patient: P(13), queueType: 'urgent', urgency: 'urgent', status: 'waiting', issuedMinAgo: 13, symptom: 'ปวดฟันรุนแรง บวมแก้ม' }),
  mkQueue({ stationId: 'st-mental', patient: P(14), queueType: 'appointment', entryChannel: 'appointment', status: 'waiting', issuedMinAgo: 21, appointmentTime: '10:30', symptom: SYMPTOMS[8] }),
  mkQueue({ stationId: 'st-ped', patient: P(15), queueType: 'general', status: 'waiting', issuedMinAgo: 17, symptom: 'เด็กมีไข้สูง 38.5 องศา' }),
  mkQueue({ stationId: 'st-ped', patient: P(16), queueType: 'general', status: 'serving', issuedMinAgo: 29, calledMinAgo: 5, symptom: 'ตรวจพัฒนาการตามวัย' }),
  mkQueue({ stationId: 'st-elderly', patient: P(17), queueType: 'elderly', status: 'waiting', issuedMinAgo: 39, symptom: SYMPTOMS[7] }),
  mkQueue({ stationId: 'st-vaccine', patient: P(18), queueType: 'general', status: 'waiting', issuedMinAgo: 10, symptom: SYMPTOMS[6] }),
  mkQueue({ stationId: 'st-tb', patient: P(19), queueType: 'general', status: 'waiting', issuedMinAgo: 23, symptom: 'ไอเรื้อรังเกิน 2 สัปดาห์' }),
  mkQueue({ stationId: 'st-xray', patient: P(20), queueType: 'general', status: 'waiting', issuedMinAgo: 12, symptom: 'ถ่ายภาพรังสีทรวงอก' }),
];

/* ────────────────────────────── นัดหมายวันนี้ที่ยังไม่มาติดต่อ (1.3.6.1) */

let appointmentsToday = [
  { id: 'apt-q-01', time: '09:45', hn: QUEUE_PATIENT_POOL[2].hn,  name: QUEUE_PATIENT_POOL[2].name,  stationId: 'st-ncd',    doctor: 'นพ.อนันต์ พงศ์ภักดี', note: 'ตรวจติดตามเบาหวาน', arrived: false },
  { id: 'apt-q-02', time: '10:00', hn: QUEUE_PATIENT_POOL[4].hn,  name: QUEUE_PATIENT_POOL[4].name,  stationId: 'st-opd',    doctor: 'พญ.สมหญิง รักษ์ดี',  note: 'ตรวจติดตามความดัน',  arrived: false },
  { id: 'apt-q-03', time: '10:15', hn: QUEUE_PATIENT_POOL[6].hn,  name: QUEUE_PATIENT_POOL[6].name,  stationId: 'st-anc',    doctor: 'พญ.นภาพร อภิรักษ์',  note: 'ฝากครรภ์ครั้งที่ 3',  arrived: false },
  { id: 'apt-q-04', time: '10:30', hn: QUEUE_PATIENT_POOL[8].hn,  name: QUEUE_PATIENT_POOL[8].name,  stationId: 'st-dental', doctor: 'ทพ.ธนกร ศรีสุข',    note: 'ขูดหินปูน',          arrived: false },
  { id: 'apt-q-05', time: '11:00', hn: QUEUE_PATIENT_POOL[13].hn, name: QUEUE_PATIENT_POOL[13].name, stationId: 'st-mental', doctor: 'พญ.กมลชนก แสงทอง',  note: 'ติดตามอาการซึมเศร้า', arrived: false },
];

export const getAppointmentsNotArrived = () => appointmentsToday.filter((a) => !a.arrived);

/* ─────────────────────────────────────────────── การเชื่อมต่อ (1.3.6.x) */

const integrationSources = [
  { id: 'src-registration', label: 'ระบบเวชระเบียน',   module: 'registration', path: '/registration/queue', stationIds: ['st-screening'], enabled: true,  connected: true,  lastSyncAt: iso(minutesAgo(3)),  todayCount: 5,  message: 'ซิงก์สำเร็จ' },
  { id: 'src-opd',          label: 'ระบบผู้ป่วยนอก (OPD)', module: 'opd',      path: '/opd/queue',          stationIds: ['st-opd', 'st-anc', 'st-ped', 'st-elderly', 'st-ncd', 'st-mental', 'st-dental', 'st-tb', 'st-vaccine', 'st-family'], enabled: true, connected: true, lastSyncAt: iso(minutesAgo(2)), todayCount: 23, message: 'ซิงก์สำเร็จ' },
  { id: 'src-lab',          label: 'ระบบชันสูตรโรค (Lab)', module: 'lab',      path: '/lab/queue',          stationIds: ['st-lab'],       enabled: true,  connected: true,  lastSyncAt: iso(minutesAgo(6)),  todayCount: 4,  message: 'ซิงก์สำเร็จ' },
  { id: 'src-pharmacy',     label: 'ระบบห้องยา',         module: 'pharmacy',   path: '/pharmacy/queue',     stationIds: ['st-pharmacy'],  enabled: true,  connected: true,  lastSyncAt: iso(minutesAgo(1)),  todayCount: 5,  message: 'ซิงก์สำเร็จ · ดึงสถานะเตรียมยาด้วย' },
  { id: 'src-finance',      label: 'ระบบการเงิน',        module: 'finance',    path: '/finance',            stationIds: ['st-finance'],   enabled: true,  connected: false, lastSyncAt: iso(minutesAgo(48)), todayCount: 3,  message: 'เชื่อมต่อไม่สำเร็จ — timeout จากปลายทาง' },
  { id: 'src-xray',         label: 'ระบบเอกซเรย์',       module: 'xray',       path: '/xray',               stationIds: ['st-xray'],      enabled: false, connected: false, lastSyncAt: null,                todayCount: 0,  message: 'ปิดการเชื่อมต่อไว้' },
];

const integrationLog = [
  { id: 'ilog-1', at: iso(minutesAgo(48)), sourceId: 'src-finance', actor: 'ระบบ (อัตโนมัติ)', role: 'ระบบ', action: 'ซิงก์อัตโนมัติ', result: 'fail',    detail: 'เชื่อมต่อไม่สำเร็จ — timeout จากปลายทาง' },
  { id: 'ilog-2', at: iso(minutesAgo(6)),  sourceId: 'src-lab',      actor: 'ปรีชา ธนบดินทร์', role: 'ผู้ดูแลระบบคิว', action: 'ดึงข้อมูลใหม่', result: 'success', detail: 'ดึงคิวเข้ามา 4 รายการ' },
  { id: 'ilog-3', at: iso(minutesAgo(2)),  sourceId: 'src-opd',      actor: 'ระบบ (อัตโนมัติ)', role: 'ระบบ', action: 'ซิงก์อัตโนมัติ', result: 'success', detail: 'ดึงคิวเข้ามา 23 รายการ' },
];

export const getIntegrationSources = () => integrationSources.map((s) => ({ ...s }));
export const getIntegrationLog = () => [...integrationLog].sort((a, b) => new Date(b.at) - new Date(a.at));

export const setIntegrationEnabled = (sourceId, enabled) => {
  const src = integrationSources.find((s) => s.id === sourceId);
  if (!src) return;
  src.enabled = enabled;
  if (!enabled) { src.connected = false; src.message = 'ปิดการเชื่อมต่อไว้'; }
  const actor = getQueueActor();
  integrationLog.unshift({
    id: `ilog-${integrationLog.length + 1}`,
    at: iso(now()), sourceId, actor: actor.name, role: actor.role,
    action: enabled ? 'เปิดการเชื่อมต่อ' : 'ปิดการเชื่อมต่อ',
    result: 'success', detail: `${src.label} → ${enabled ? 'เปิด' : 'ปิด'}`,
  });
  notify();
};

/** ดึงข้อมูลใหม่ — mock: การเงินยัง fail เพื่อให้เห็น error state จริง */
export const syncSource = (sourceId) => {
  const src = integrationSources.find((s) => s.id === sourceId);
  if (!src) return { ok: false, message: 'ไม่พบระบบต้นทาง' };
  if (!src.enabled) return { ok: false, message: 'ระบบต้นทางนี้ถูกปิดการเชื่อมต่อไว้' };
  const ok = src.module !== 'finance';
  src.connected = ok;
  src.lastSyncAt = iso(now());
  src.message = ok ? 'ซิงก์สำเร็จ' : 'เชื่อมต่อไม่สำเร็จ — timeout จากปลายทาง';
  const actor = getQueueActor();
  integrationLog.unshift({
    id: `ilog-${integrationLog.length + 1}`,
    at: src.lastSyncAt, sourceId, actor: actor.name, role: actor.role,
    action: 'ดึงข้อมูลใหม่', result: ok ? 'success' : 'fail',
    detail: ok ? `ดึงคิวเข้ามา ${src.todayCount} รายการ` : src.message,
  });
  notify();
  return { ok, message: src.message };
};

/* ═══════════════════════════════════════════ selectors (สัญญากับจอ TV) */

const byOrder = (a, b) => {
  const wa = queueTypeMeta(a.queueType).weight;
  const wb = queueTypeMeta(b.queueType).weight;
  if (a.priority !== b.priority) return a.priority ? -1 : 1;
  if (wa !== wb) return wa - wb;
  if (a.order !== b.order) return a.order - b.order;
  return new Date(a.issuedAt) - new Date(b.issuedAt);
};

/* §1.3.6.2 — ทุกทางที่อ่านคิวออกไปแสดงผล ต้องได้สถานะห้องยา "สด" จาก
   pharmacyQueue.js ไม่ใช่ค่าที่ seed ไว้ในไฟล์นี้
   ทำเป็น decorator จุดเดียวแล้วเรียกจากทุก getter เพื่อไม่ให้จอ TV กับหน้าคิว
   เห็นสถานะไม่ตรงกัน (ปัญหาเดิมของการ copy ค่าไปหลายที่)
   ถ้า HN นั้นไม่มีใบยาในห้องยา คงค่าเดิมไว้ — ไม่เดาสถานะให้ */
const withLivePharmacyStatus = (q) => {
  if (!q || !q.pharmacyStatus) return q;
  const live = resolvePharmacyStatus(q.patient?.hn);
  return live ? { ...q, pharmacyStatus: live } : q;
};

export const getQueues = () => queues.map((q) => withLivePharmacyStatus({ ...q }));

export const getQueuesByStation = (stationId) =>
  queues.filter((q) => q.stationId === stationId).map((q) => withLivePharmacyStatus({ ...q }));

export const getQueueById = (id) => {
  const q = queues.find((row) => row.id === id);
  return q ? { ...q } : null;
};

/** คิวถัดไปตามลำดับที่จัดแล้ว (ไม่รวมคิวที่กำลังให้บริการ/พัก/ปิดแล้ว) */
export const nextQueues = (stationId) =>
  queues
    .filter((q) => q.stationId === stationId && q.status === 'waiting')
    .sort(byOrder)
    .map((q) => ({ ...q }));

/** คิวที่ข้าม / เรียกแล้วไม่มา */
export const passedNumbers = (stationId) =>
  queues
    .filter((q) => q.stationId === stationId && q.status === 'passed')
    .sort((a, b) => new Date(b.lastCallAt || b.issuedAt) - new Date(a.lastCallAt || a.issuedAt))
    .map((q) => ({ ...q }));

/** จำนวนคิวคงเหลือ (รอเรียก + กำลังเรียก + พัก + ข้าม) */
export const remainingCount = (stationId) =>
  queues.filter(
    (q) => q.stationId === stationId
      && ['waiting', 'calling', 'paused', 'passed'].includes(q.status),
  ).length;

/** รีบิลด์ currentByStation ในที่เดิม (จอ TV ถือ reference เดิมตลอด) */
/* ── §1.3.6.2 สถานะเตรียมยาจริงจากห้องยา ────────────────────────────────
   จับคู่คิวจุดรับยากับใบยาใน pharmacyQueue.js ด้วย HN แล้วแปลงสถานะการจ่ายยา
   เป็นสถานะที่จอคิวเข้าใจ

   ลำดับการตัดสินสำคัญ: **เช็คการชำระเงินก่อนบอกว่าพร้อมรับยา** เพราะ
   Sequence Lock (มติ คทง.1) ห้ามจ่ายยาก่อนชำระเงิน/ปิดสิทธิ — ถ้าจอบอก
   "พร้อมรับยา" ทั้งที่ยังจ่ายเงินไม่เสร็จ ผู้รับบริการจะไปยืนรอผิดที่ */
/* ⚠️ pharmacyQueue.js import `getStation` จากไฟล์นี้อยู่แล้ว การ import กลับ
   จึงปิดวงจร (circular import) — ถ้าสร้าง map นี้เป็น const ระดับโมดูล มันจะ
   ถูกประเมินตอน module init ซึ่งฝั่ง pharmacyQueue อาจยังไม่ export
   DISPENSE_STATUS ออกมา → อ่านได้ undefined แล้วพังทั้งไฟล์
   (เจอจริงตอน bundle โดยให้ pharmacyQueue เป็น entry)
   แก้โดยสร้าง map ตอนเรียกใช้ ไม่ใช่ตอนโหลดไฟล์ */
const dispenseToQueueStatus = () => ({
  [DISPENSE_STATUS.WAITING]:   'pending',
  [DISPENSE_STATUS.CALLED]:    'preparing',
  [DISPENSE_STATUS.PREPARING]: 'preparing',
  [DISPENSE_STATUS.DISPENSED]: 'ready',
  [DISPENSE_STATUS.PARTIAL]:   'ready',
  [DISPENSE_STATUS.PROBLEM]:   'pending',
});

/** คืนสถานะห้องยาจริงของ HN นี้ — null = ไม่มีใบยาในห้องยา (ให้ใช้ค่าเดิม) */
export const resolvePharmacyStatus = (hn) => {
  /* กันกรณีถูกเรียกระหว่าง module init ของวงจร import — ยังไม่พร้อมก็คืน null
     ให้ผู้เรียกใช้ค่าเดิมไปก่อน ดีกว่าโยน error ทั้งหน้า */
  if (!hn || !Array.isArray(PHARMACY_QUEUE) || !DISPENSE_STATUS) return null;
  const row = PHARMACY_QUEUE.find((r) => r.hn === hn);
  if (!row) return null;

  const mapped = dispenseToQueueStatus()[row.status];
  if (!mapped) return null;

  /* ยาจัดเสร็จแล้วแต่ยังติดขั้นชำระเงิน → ยังไม่ใช่ "พร้อมรับยา" */
  if (mapped === 'ready' && !canDispensePharmacyOrder(row).ok) return 'awaitingPayment';
  return mapped;
};

const rebuildCurrent = () => {
  QUEUE_STATIONS.forEach((st) => {
    const active = queues
      .filter((q) => q.stationId === st.id && (q.status === 'calling' || q.status === 'serving'))
      .sort((a, b) => new Date(b.lastCallAt || b.issuedAt) - new Date(a.lastCallAt || a.issuedAt))[0];
    currentByStation[st.id] = active ? withLivePharmacyStatus({ ...active }) : null;
  });
  /* ล้าง key ของจุดบริการที่ถูกลบไปแล้ว */
  Object.keys(currentByStation).forEach((k) => {
    if (!QUEUE_STATIONS.some((s) => s.id === k)) delete currentByStation[k];
  });
};

const pushAnnouncement = (q, { repeatOf = null } = {}) => {
  const st = getStation(q.stationId);
  const text = settings.voice.template
    .replace('{queue}', q.code)
    .replace('{station}', st?.label || '')
    .replace('{zone}', st?.zone || '')
    .replace('{floor}', st?.floor || '');
  announcements.unshift({
    id: `ann-${Date.now()}-${q.id}`,
    queueId: q.id,
    queueCode: q.code,
    stationId: q.stationId,
    stationLabel: st?.label || '',
    text,
    at: iso(now()),
    repeatOf,
  });
  if (announcements.length > 60) announcements.length = 60;
};

/* ═════════════════════════════════════════════════════════════ actions */

const guard = (needAdmin = false) => {
  const actor = getQueueActor();
  if (needAdmin) return actor.canAdmin;
  return actor.canOperate;
};

const find = (queueId) => queues.find((q) => q.id === queueId);

/** ออกคิว (1.3.2.1–1.3.2.4) */
export const issueQueue = ({
  stationId,
  patient,
  queueType = 'general',
  urgency = 'normal',
  entryChannel = 'counter',
  visitorType = 'existing',
  serviceTime = 'inTime',
  symptom = '',
  appointmentTime = null,
  note = '',
  reason = '',
}) => {
  if (!guard()) return { ok: false, message: 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' };
  const st = getStation(stationId);
  if (!st) return { ok: false, message: 'กรุณาเลือกจุดบริการ' };
  if (!st.active) return { ok: false, message: 'จุดบริการนี้ปิดรับคิวชั่วคราว' };
  if (!queueType) return { ok: false, message: 'กรุณาเลือกประเภทคิว' };

  seq += 1;
  const stationQueues = queues.filter((q) => q.stationId === stationId);

  /* มติ คทง.1 — Single Queue: ถ้าผู้รับบริการรายนี้มีเลขคิวของ Visit วันนี้แล้ว
     ให้ **ใช้เลขเดิม** ที่จุดถัดไป แทนการออกเลขใหม่ · ลำดับภายในจุด (seqNo)
     ยังเดินของใครของมันตามเดิม เพื่อให้คิวเรียงถูกในแต่ละห้อง */
  const visitKey = visitKeyOf(patient);
  const existingVisit = visitKey ? visitCodes[visitKey] : null;
  const stationSeq = (counters[stationId] = (counters[stationId] || 0) + 1);
  const code = (settings.codeFormat.singleQueuePerVisit && existingVisit)
    ? existingVisit.code
    : previewQueueCode(stationId, stationSeq);
  if (visitKey && !existingVisit) {
    visitCodes[visitKey] = { code, issuedDate: todayKey(), firstStationId: stationId };
  }

  const q = {
    id: `q-${String(seq).padStart(4, '0')}`,
    code,
    /* จุดแรกที่ออกเลขนี้ — ใช้อธิบายบนใบคิว/จอว่าเลขนี้มาจากจุดไหน */
    visitCode: visitKey ? visitCodes[visitKey].code : code,
    carriedFromVisit: Boolean(settings.codeFormat.singleQueuePerVisit && existingVisit),
    seqNo: stationSeq,
    stationId,
    patient: { ...patient },
    queueType,
    urgency,
    entryChannel,
    visitorType,
    serviceTime,
    symptom,
    doctor: patient?.doctor || '',
    appointmentTime,
    issuedAt: iso(now()),
    calledAt: null,
    arrivedAt: null,
    completedAt: null,
    cancelledAt: null,
    status: 'waiting',
    order: stationQueues.length + 1,
    priority: queueType === 'urgent' || urgency !== 'normal',
    pharmacyStatus: st.serviceType === 'pharmacy' ? 'pending' : null,
    callCount: 0,
    lastCallAt: null,
    printCount: 0,
    lastPrintAt: null,
    cancelReason: '',
    transferFrom: null,
    note,
    audit: [],
  };
  pushAudit(q, 'ออกคิว', reason);
  queues = [...queues, q];
  applyAppointmentOrdering(stationId);
  rebuildCurrent();
  notify();
  return { ok: true, queue: { ...q } };
};

/** ตรวจว่าผู้รับบริการมีคิว active ที่จุดบริการเดียวกันอยู่แล้วหรือไม่ */
export const findActiveQueueFor = (hn, stationId) => {
  const q = queues.find(
    (row) => row.patient?.hn === hn && row.stationId === stationId && !isQueueClosed(row),
  );
  return q ? { ...q } : null;
};

/** เรียกคิว (1.3.3.1) */
export const callQueue = (queueId) => {
  if (!guard()) return { ok: false, message: 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' };
  const q = find(queueId);
  if (!q) return { ok: false, message: 'ไม่พบคิว' };
  if (isQueueClosed(q)) return { ok: false, message: 'คิวนี้ปิดแล้ว แก้ไขไม่ได้' };
  if (q.status === 'paused') return { ok: false, message: 'คิวนี้ถูกพักอยู่ — กดคืนคิวก่อน' };
  q.status = 'calling';
  q.calledAt = q.calledAt || iso(now());
  q.lastCallAt = iso(now());
  q.callCount += 1;
  pushAudit(q, 'เรียกคิว');
  pushAnnouncement(q);
  rebuildCurrent();
  notify();
  return { ok: true };
};

const RECALL_THROTTLE_MS = 8000;

/** เรียกซ้ำ (1.3.3.2 / 1.3.4.3) — throttle กัน announcements ท่วมจอ TV */
export const recallQueue = (queueId) => {
  if (!guard()) return { ok: false, message: 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' };
  const q = find(queueId);
  if (!q) return { ok: false, message: 'ไม่พบคิว' };
  if (isQueueClosed(q)) return { ok: false, message: 'คิวนี้ปิดแล้ว แก้ไขไม่ได้' };
  const since = q.lastCallAt ? Date.now() - new Date(q.lastCallAt).getTime() : Infinity;
  if (since < RECALL_THROTTLE_MS) {
    return {
      ok: false,
      throttled: true,
      waitMs: RECALL_THROTTLE_MS - since,
      message: `เพิ่งเรียกไปเมื่อ ${formatClock(q.lastCallAt)} — รออีก ${Math.ceil((RECALL_THROTTLE_MS - since) / 1000)} วินาที`,
    };
  }
  q.status = q.status === 'serving' ? 'serving' : 'calling';
  q.lastCallAt = iso(now());
  q.callCount += 1;
  pushAudit(q, 'เรียกคิวซ้ำ');
  pushAnnouncement(q, { repeatOf: q.id });
  rebuildCurrent();
  notify();
  return { ok: true };
};

/** ข้ามคิว / ไม่มาตามเรียก (1.3.3.3) */
export const skipQueue = (queueId, reason = '') => {
  if (!guard()) return { ok: false, message: 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' };
  const q = find(queueId);
  if (!q || isQueueClosed(q)) return { ok: false, message: 'คิวนี้ปิดแล้ว แก้ไขไม่ได้' };
  q.status = 'passed';
  pushAudit(q, 'ข้ามคิว (ไม่มาตามเรียก)', reason);
  rebuildCurrent();
  notify();
  return { ok: true };
};

/** คืนคิวที่ข้ามกลับเข้าแถว — ต่อท้ายรอบ หรือ แทรกตามความเร่งด่วน */
export const restoreSkipped = (queueId, { mode = 'append', reason = '' } = {}) => {
  if (!guard()) return { ok: false, message: 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' };
  const q = find(queueId);
  if (!q) return { ok: false, message: 'ไม่พบคิว' };
  q.status = 'waiting';
  if (mode === 'append') {
    const max = Math.max(0, ...queues.filter((r) => r.stationId === q.stationId).map((r) => r.order));
    q.order = max + 1;
    q.priority = false;
  } else {
    q.priority = true;
  }
  pushAudit(q, mode === 'append' ? 'คืนคิวเข้าท้ายรอบ' : 'คืนคิวแบบแทรกตามความเร่งด่วน', reason);
  rebuildCurrent();
  notify();
  return { ok: true };
};

/** ยืนยันการมา (1.3.4.5) */
export const confirmArrival = (queueId) => {
  if (!guard()) return { ok: false, message: 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' };
  const q = find(queueId);
  if (!q || isQueueClosed(q)) return { ok: false, message: 'คิวนี้ปิดแล้ว แก้ไขไม่ได้' };
  q.status = 'serving';
  q.arrivedAt = iso(now());
  pushAudit(q, 'ยืนยันผู้รับบริการมาแล้ว');
  rebuildCurrent();
  notify();
  return { ok: true };
};

/** พักคิว (1.3.1.3) */
export const pauseQueue = (queueId, reason = '') => {
  if (!guard()) return { ok: false, message: 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' };
  const q = find(queueId);
  if (!q || isQueueClosed(q)) return { ok: false, message: 'คิวนี้ปิดแล้ว แก้ไขไม่ได้' };
  q.status = 'paused';
  pushAudit(q, 'พักคิว', reason);
  rebuildCurrent();
  notify();
  return { ok: true };
};

export const resumeQueue = (queueId, reason = '') => {
  if (!guard()) return { ok: false, message: 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' };
  const q = find(queueId);
  if (!q || isQueueClosed(q)) return { ok: false, message: 'คิวนี้ปิดแล้ว แก้ไขไม่ได้' };
  q.status = 'waiting';
  pushAudit(q, 'คืนคิวเข้าแถว', reason);
  rebuildCurrent();
  notify();
  return { ok: true };
};

/** โอนคิวไปจุดบริการอื่น (1.3.1.4) — บังคับกรอกเหตุผล */
export const transferQueue = (queueId, toStationId, reason = '') => {
  if (!guard()) return { ok: false, message: 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' };
  const q = find(queueId);
  if (!q || isQueueClosed(q)) return { ok: false, message: 'คิวนี้ปิดแล้ว แก้ไขไม่ได้' };
  const to = getStation(toStationId);
  if (!to) return { ok: false, message: 'กรุณาเลือกจุดบริการปลายทาง' };
  if (!reason.trim()) return { ok: false, message: 'กรุณาระบุเหตุผลการโอนคิว' };
  const from = getStation(q.stationId);
  q.transferFrom = q.stationId;
  q.stationId = toStationId;
  /* มติ คทง.1 — โอนคิวข้ามจุดแล้ว "เลขคิวต้องไม่เปลี่ยน" (Single Queue)
     ผู้รับบริการถือใบเดิมตลอด Visit; เปลี่ยนเฉพาะลำดับภายในจุดปลายทาง */
  counters[toStationId] = (counters[toStationId] || 0) + 1;
  if (!settings.codeFormat.singleQueuePerVisit) q.code = previewQueueCode(toStationId, counters[toStationId]);
  q.seqNo = counters[toStationId];
  q.status = 'waiting';
  const max = Math.max(0, ...queues.filter((r) => r.stationId === toStationId).map((r) => r.order));
  q.order = max + 1;
  q.pharmacyStatus = to.serviceType === 'pharmacy' ? (q.pharmacyStatus || 'pending') : null;
  pushAudit(
    q,
    settings.codeFormat.singleQueuePerVisit
      ? `โอนคิว ${from?.label || ''} → ${to.label} (คงเลขคิวเดิม ${q.code} ตามระบบคิวเดียวต่อ Visit)`
      : `โอนคิว ${from?.label || ''} → ${to.label} (รหัสใหม่ ${q.code})`,
    reason,
  );
  rebuildCurrent();
  notify();
  return { ok: true, queue: { ...q } };
};

/** โอนคิวค้างทั้งหมดของจุดบริการ (กรณีจุดบริการปิด/พัก) */
export const transferAllPending = (fromStationId, toStationId, reason = '') => {
  if (!guard()) return { ok: false, message: 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' };
  if (!reason.trim()) return { ok: false, message: 'กรุณาระบุเหตุผล' };
  const targets = queues.filter((q) => q.stationId === fromStationId && !isQueueClosed(q));
  targets.forEach((q) => transferQueue(q.id, toStationId, reason));
  return { ok: true, moved: targets.length };
};

/** เปิด/ปิดรับคิวของจุดบริการ */
export const setStationActive = (stationId, active, reason = '') => {
  if (!guard(true)) return { ok: false, message: 'ต้องมีสิทธิผู้ดูแลระบบ' };
  const st = getStation(stationId);
  if (!st) return { ok: false, message: 'ไม่พบจุดบริการ' };
  st.active = active;
  const actor = getQueueActor();
  integrationLog.unshift({
    id: `ilog-${integrationLog.length + 1}`,
    at: iso(now()), sourceId: null, actor: actor.name, role: actor.role,
    action: active ? 'เปิดรับคิว' : 'ปิดรับคิวชั่วคราว',
    result: 'success', detail: `${st.label}${reason ? ` — ${reason}` : ''}`,
  });
  notifySettings();
  return { ok: true };
};

/** จัดลำดับ: เลื่อนขึ้น/ลง (1.3.1.1 / 1.3.3.2 — ไม่มี DnD library ในโปรเจกต์) */
export const reorderQueue = (queueId, direction) => {
  if (!guard()) return { ok: false, message: 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' };
  const q = find(queueId);
  if (!q || isQueueClosed(q)) return { ok: false, message: 'คิวนี้ปิดแล้ว แก้ไขไม่ได้' };
  const siblings = queues
    .filter((r) => r.stationId === q.stationId && r.status === 'waiting')
    .sort(byOrder);
  const idx = siblings.findIndex((r) => r.id === queueId);
  const swapWith = direction === 'up' ? siblings[idx - 1] : siblings[idx + 1];
  if (!swapWith) return { ok: false, message: direction === 'up' ? 'อยู่บนสุดแล้ว' : 'อยู่ล่างสุดแล้ว' };
  const tmp = q.order;
  q.order = swapWith.order;
  swapWith.order = tmp;
  if (q.priority !== swapWith.priority) {
    const p = q.priority;
    q.priority = swapWith.priority;
    swapWith.priority = p;
    q.manualPriority = q.priority;
    swapWith.manualPriority = swapWith.priority;
  }
  /* ปักธงว่าเป็นลำดับที่เจ้าหน้าที่จัดเอง — applyAppointmentOrdering จะไม่ทับ */
  q.manualOrder = true;
  swapWith.manualOrder = true;
  pushAudit(q, direction === 'up' ? 'เลื่อนลำดับขึ้น' : 'เลื่อนลำดับลง');
  notify();
  return { ok: true };
};

/** เรียกคิวนี้ก่อน / แทรกคิว (1.3.1.1) — บังคับกรอกเหตุผล */
export const prioritizeQueue = (queueId, reason = '') => {
  if (!guard()) return { ok: false, message: 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' };
  const q = find(queueId);
  if (!q || isQueueClosed(q)) return { ok: false, message: 'คิวนี้ปิดแล้ว แก้ไขไม่ได้' };
  if (!reason.trim()) return { ok: false, message: 'กรุณาระบุเหตุผลการแทรกคิว' };
  /* ต้องใช้ค่า min จริงของจุดบริการ (cap ที่ 1 เผื่อจุดบริการว่าง) — ถ้า seed เป็น 0
     ทุกคิวที่แทรกจะได้ order = -1 เท่ากันหมด แล้วแทรกซ้ำจะไม่ขึ้นก่อนคิวที่แทรกไว้ก่อน */
  const stationOrders = queues.filter((r) => r.stationId === q.stationId).map((r) => r.order);
  const min = Math.min(1, ...stationOrders);
  q.order = min - 1;
  q.priority = true;
  q.manualPriority = true;
  q.manualOrder = true;
  q.status = 'waiting';
  pushAudit(q, 'แทรกคิว — เรียกคิวนี้ก่อน', reason);
  notify();
  return { ok: true };
};

/** แก้ไขข้อมูลคิว (1.3.1.1) — คิวที่ปิดแล้วแก้ไม่ได้ */
export const editQueue = (queueId, patch, reason = '') => {
  if (!guard()) return { ok: false, message: 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' };
  const q = find(queueId);
  if (!q) return { ok: false, message: 'ไม่พบคิว' };
  if (isQueueClosed(q)) return { ok: false, message: 'คิวที่เสร็จสิ้น/ยกเลิกแล้ว แก้ไขไม่ได้' };
  const allowed = ['queueType', 'urgency', 'entryChannel', 'visitorType', 'serviceTime', 'symptom', 'doctor', 'note', 'order', 'appointmentTime', 'pharmacyStatus'];
  const changed = [];
  allowed.forEach((k) => {
    if (patch[k] !== undefined && patch[k] !== q[k]) { changed.push(k); q[k] = patch[k]; }
  });
  if (patch.order !== undefined) {
    q.order = Number(patch.order) || q.order;
    q.manualOrder = true;
  }
  /* คำนวณใหม่ทุกครั้ง (ห้าม `|| q.priority` — จะกลายเป็น latch ทางเดียว ปรับ
     ประเภทจากด่วน→ทั่วไปแล้วคิวยังแซงทั้งจุดบริการ) — คงไว้เฉพาะ "แทรกคิว"
     ที่เจ้าหน้าที่สั่งเอง ผ่าน manualPriority */
  q.priority = q.queueType === 'urgent' || q.urgency !== 'normal' || q.manualPriority === true;
  pushAudit(q, `แก้ไขข้อมูลคิว (${changed.join(', ') || 'ไม่มีการเปลี่ยนแปลง'})`, reason);
  notify();
  return { ok: true, changed };
};

/** ยกเลิกคิว (1.3.1.5) — ไม่ลบทิ้ง เก็บไว้แสดงแบบขีดฆ่า พร้อมเหตุผล+ผู้ยกเลิก */
export const cancelQueue = (queueId, reason = '') => {
  if (!guard()) return { ok: false, message: 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' };
  const q = find(queueId);
  if (!q) return { ok: false, message: 'ไม่พบคิว' };
  if (isQueueClosed(q)) return { ok: false, message: 'คิวนี้ปิดแล้ว' };
  if (!reason.trim()) return { ok: false, message: 'กรุณาระบุเหตุผลการยกเลิก' };
  const actor = getQueueActor();
  q.status = 'cancelled';
  q.cancelledAt = iso(now());
  q.cancelReason = reason;
  q.cancelledBy = actor.name;
  pushAudit(q, 'ยกเลิกคิว', reason);
  rebuildCurrent();
  notify();
  return { ok: true };
};

/** เสร็จสิ้นคิว (1.3.5.1 / 1.3.5.2) */
export const completeQueue = (queueId, note = '') => {
  if (!guard()) return { ok: false, message: 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' };
  const q = find(queueId);
  if (!q) return { ok: false, message: 'ไม่พบคิว' };
  if (isQueueClosed(q)) return { ok: false, message: 'คิวนี้ปิดแล้ว' };
  q.status = 'done';
  q.completedAt = iso(now());
  if (note) q.note = note;
  pushAudit(q, 'ให้บริการเสร็จสิ้น', note);
  rebuildCurrent();
  notify();
  return { ok: true };
};

/** พิมพ์บัตรคิวซ้ำ (1.3.2.5) — บังคับเหตุผล + นับจำนวนครั้ง */
export const MAX_REPRINT = 3;

export const reprintTicket = (queueId, reason = '') => {
  if (!guard()) return { ok: false, message: 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' };
  const q = find(queueId);
  if (!q) return { ok: false, message: 'ไม่พบคิว' };
  if (isQueueClosed(q)) return { ok: false, message: 'คิวนี้ปิดแล้ว — พิมพ์ซ้ำไม่ได้' };
  if (!reason.trim()) return { ok: false, message: 'กรุณาระบุเหตุผลการพิมพ์ซ้ำ' };
  if (q.printCount >= MAX_REPRINT + 1) {
    return { ok: false, message: `พิมพ์ซ้ำครบ ${MAX_REPRINT} ครั้งแล้ว — ต้องให้ผู้ดูแลระบบอนุมัติ` };
  }
  q.printCount += 1;
  q.lastPrintAt = iso(now());
  pushAudit(q, `พิมพ์บัตรคิวซ้ำ (ครั้งที่ ${q.printCount})`, reason);
  notify();
  return { ok: true, queue: { ...q } };
};

export const markPrinted = (queueId) => {
  const q = find(queueId);
  if (!q) return;
  q.printCount += 1;
  q.lastPrintAt = iso(now());
  notify();
};

/** ออกคิวจากนัดหมาย (1.3.6.1) */
export const issueFromAppointment = (appointmentId) => {
  const apt = appointmentsToday.find((a) => a.id === appointmentId);
  if (!apt) return { ok: false, message: 'ไม่พบนัดหมาย' };
  const profile = QUEUE_PATIENT_POOL.find((p) => p.hn === apt.hn) || QUEUE_PATIENT_POOL[0];
  const res = issueQueue({
    stationId: apt.stationId,
    patient: { ...profile, doctor: apt.doctor },
    queueType: 'appointment',
    entryChannel: 'appointment',
    appointmentTime: apt.time,
    symptom: apt.note,
    reason: `ออกคิวจากนัดหมาย ${apt.time}`,
  });
  if (res.ok) {
    appointmentsToday = appointmentsToday.map((a) => (a.id === appointmentId ? { ...a, arrived: true } : a));
    notify();
  }
  return res;
};

/** คำนวณลำดับตามช่วงเวลานัดหมาย (1.3.2.3) — pure: คืน Map(queueId → order)
 *  ไม่แตะ store เลย เพื่อให้หน้าพรีวิวเรียกจาก render body ได้อย่างปลอดภัย
 *
 *  คิวที่เจ้าหน้าที่จัดลำดับเอง (`manualOrder` — เลื่อนขึ้น/ลง, แทรกคิว, แก้ลำดับ)
 *  จะถูก "ตรึง" ไว้ที่เดิม แล้วเรียงคิวที่เหลือลงช่องว่างที่ยังไม่ถูกจอง —
 *  ไม่งั้นการออกคิวใบถัดไปจะล้างลำดับที่เพิ่งจัดด้วยมือทิ้งทั้งจุดบริการ */
function computeAppointmentOrder(stationId) {
  const rule = settings.appointmentRule;
  const waiting = queues.filter((q) => q.stationId === stationId && q.status === 'waiting');
  const result = new Map(waiting.map((q) => [q.id, q.order]));
  if (!rule.sortByAppointment) return result;
  const toMinutes = (t) => {
    if (!t) return null;
    const [h, m] = String(t).split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const roundOf = (q) => {
    const mins = toMinutes(q.appointmentTime);
    if (mins == null) return Number.MAX_SAFE_INTEGER;
    return Math.floor(mins / Math.max(1, rule.roundWindowMinutes));
  };
  const manual = waiting.filter((q) => q.manualOrder);
  const auto = waiting.filter((q) => !q.manualOrder);
  const sorted = [...auto].sort((a, b) => {
    const ra = roundOf(a);
    const rb = roundOf(b);
    if (ra !== rb) return ra - rb;
    /* Walk-in ในรอบเดียวกัน: 'append' = ต่อท้ายรอบ, 'urgency' = สลับตามความเร่งด่วน */
    if (rule.walkinRule === 'urgency') {
      const wa = queueTypeMeta(a.queueType).weight;
      const wb = queueTypeMeta(b.queueType).weight;
      if (wa !== wb) return wa - wb;
    }
    return new Date(a.issuedAt) - new Date(b.issuedAt);
  });
  const taken = new Set(manual.map((q) => q.order));
  const slots = [];
  for (let n = 1; slots.length < sorted.length; n += 1) {
    if (!taken.has(n)) slots.push(n);
  }
  sorted.forEach((q, i) => { result.set(q.id, slots[i]); });
  return result;
}

function applyAppointmentOrdering(stationId) {
  const orders = computeAppointmentOrder(stationId);
  queues.forEach((q) => { if (orders.has(q.id)) q.order = orders.get(q.id); });
}

/** พรีวิวลำดับผลลัพธ์ของกติกานัดหมาย (หน้าเชื่อมต่อข้อมูล tab 2)
 *  READ-ONLY: คืนสำเนาที่ใส่ order ที่ "จะเป็น" ลงไป โดยไม่เขียนกลับ store —
 *  QueueIntegrationPage เรียกฟังก์ชันนี้ใน render body การ mutate ที่นั่น
 *  แปลว่าแค่เปิดหน้าเว็บก็เปลี่ยนข้อมูลจริงโดยไม่มี notify() */
export const previewAppointmentOrder = (stationId) => {
  const orders = computeAppointmentOrder(stationId);
  return queues
    .filter((q) => q.stationId === stationId && q.status === 'waiting')
    .map((q) => ({ ...q, order: orders.has(q.id) ? orders.get(q.id) : q.order }))
    .sort(byOrder);
};

/* ────────────────────────────────────────────────────────── สรุปรายจุด */

export const stationSummary = (stationId) => {
  const rows = queues.filter((q) => q.stationId === stationId);
  return {
    waiting: rows.filter((q) => q.status === 'waiting').length,
    calling: rows.filter((q) => q.status === 'calling').length,
    serving: rows.filter((q) => q.status === 'serving').length,
    paused: rows.filter((q) => q.status === 'paused').length,
    passed: rows.filter((q) => q.status === 'passed').length,
    done: rows.filter((q) => q.status === 'done').length,
    cancelled: rows.filter((q) => q.status === 'cancelled').length,
    remaining: remainingCount(stationId),
    overdue: rows.filter(isOverdue).length,
  };
};

/* ─────────────────────────────────────────────── print stylesheet (บัตรคิว)

   สลับเอกสารด้วย attribute บน <html> แบบเดียวกับ labPrintSettings /
   pharmacyPrintUtils — พิมพ์เฉพาะบัตรคิว ไม่ติด chrome ของหน้า
   create-or-UPDATE (ไม่ใช่ create-if-missing) กัน stale tag ตอน HMR

   สำคัญ: กฎ `body > *:not(...)` ต้อง scope ด้วย html[data-queue-print-mode]
   เสมอ เพราะ Routes.jsx import ทุกหน้าแบบ static → stylesheet ของโมดูลอื่น
   (labPrintSettings ฯลฯ) ถูกโหลดพร้อมกันทั้งหมด ถ้าไม่ scope กฎของแต่ละ
   โมดูลจะซ่อน print-root ของกันเอง แล้วได้หน้าเปล่า                       */
if (typeof document !== 'undefined') {
  let el = document.getElementById('mih-queue-print-style');
  if (!el) {
    el = document.createElement('style');
    el.id = 'mih-queue-print-style';
    document.head.appendChild(el);
  }
  el.textContent = `
    .mih-queue-print-only { display: none; }
    @media print {
      html[data-queue-print-mode] body > *:not(.mih-queue-print-root) { display: none !important; }
      html[data-queue-print-mode] .mih-queue-no-print { display: none !important; }
      html[data-queue-print-mode="ticket"] .mih-queue-print-only.mih-queue-print-ticket { display: block !important; }
      .mih-queue-ticket { break-inside: avoid; page-break-inside: avoid; }
      @page { margin: 8mm; }
    }
  `;
}

/** เครื่องพิมพ์ไม่พร้อม → คิวยังบันทึกสำเร็จ พิมพ์ซ้ำจากแท็บประวัติได้ */
export const printQueueTicket = (mode = 'ticket') => {
  if (typeof document === 'undefined') return { ok: false, message: 'ไม่มี document' };
  try {
    document.documentElement.setAttribute('data-queue-print-mode', mode);
    window.print();
    window.setTimeout(() => {
      document.documentElement.removeAttribute('data-queue-print-mode');
    }, 500);
    return { ok: true };
  } catch (err) {
    document.documentElement.removeAttribute('data-queue-print-mode');
    return { ok: false, message: 'เครื่องพิมพ์ไม่พร้อม — เปิดพิมพ์ซ้ำได้จากแท็บ "ประวัติการออกคิววันนี้"' };
  }
};

/* init */
rebuildCurrent();
QUEUE_STATIONS.forEach((st) => applyAppointmentOrdering(st.id));
queues
  .filter((q) => q.status === 'calling' || q.status === 'serving')
  .sort((a, b) => new Date(a.lastCallAt || a.issuedAt) - new Date(b.lastCallAt || b.issuedAt))
  .forEach((q) => pushAnnouncement(q));
rebuildCurrent();
