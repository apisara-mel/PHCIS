/* queueDisplayView — selector layer ของจอ TV แสดงผลการเรียกคิว (TOR §1.3.4)

   ── ทำไมเป็นไฟล์นี้ ไม่ใช่ store ของตัวเอง ─────────────────────────────────
   ตอนเริ่มเขียนโมดูลนี้ `src/data/queueCenterStore.js` (โมดูล 1.3) ยังไม่มี
   จึงเตรียม mock ของตัวเองไว้ก่อน — ระหว่างสร้าง โมดูล 1.3 ลงมาแล้วและ
   store นั้นเขียนหัวข้อไว้ตรง ๆ ว่า "selectors (สัญญากับจอ TV)" พร้อม
   `currentByStation` / `nextQueues` / `passedNumbers` / `remainingCount`
   ให้ใช้ ไฟล์นี้จึงเป็น **adapter บาง ๆ** ที่แปลงรูปข้อมูลของ store จริง
   ให้เป็นรูปที่ component ของจอใช้ แทนที่จะ fork ข้อมูลคิวเป็นชุดที่สอง
   (คิวสองชุดที่ไม่ตรงกันคือบั๊กที่แพงที่สุดของ surface นี้)

   ไฟล์นี้ **ไม่แก้** อะไรใน `src/pages/queue-center` หรือ `queueCenterStore.js`
   — อ่านอย่างเดียว + เรียก action ที่ store เปิดให้

   สิ่งที่ store ยังไม่มีและโมดูลนี้เป็นเจ้าของเอง:
   · ข้อความบนแถบประกาศท้ายจอ (marquee) — เก็บใน localStorage ของเครื่องจอ
   · การจับกลุ่มจุดบริการเป็น "โซนของจอ" ตามเลย์เอาต์ Figma (hall / finance)
   · สีประจำแผนกของจอ (map จาก serviceType → คีย์สีใน design token) */

import {
  QUEUE_CENTER_SITE,
  QUEUE_DISPLAYS,
  QUEUE_ROLES,
  QUEUE_STATIONS as STORE_STATIONS,
  callQueue,
  cancelQueue,
  confirmArrival as storeConfirmArrival,
  currentByStation,
  getQueueActor,
  getQueueSettings,
  getQueues,
  getStation as storeGetStation,
  nextQueues,
  passedNumbers,
  recallQueue,
  remainingCount,
  restoreSkipped,
  setQueueActorRole,
  skipQueue,
  subscribeQueueCenter,
} from '@/data/queueCenterStore';

export {
  QUEUE_CENTER_SITE,
  QUEUE_DISPLAYS,
  QUEUE_ROLES,
  getQueueActor,
  setQueueActorRole,
};

/* ── สีประจำแผนกบนจอ ──────────────────────────────────────────────────────
   Figma กำหนดสีต่อคอลัมน์: ซักประวัติ #60A5FA · ห้องตรวจ/ชำระเงิน #F472B6 ·
   การเงินและรับยา #818CF8 → แปลงเป็นคีย์ที่ชั้น UI ไป resolve เป็น token
   (ไฟล์ data ห้ามถือ hex ตาม CLAUDE.md) */
const ACCENT_BY_SERVICE = {
  screening: 'blue',
  consultation: 'pink',
  finance: 'pink',
  pharmacy: 'indigo',
  lab: 'blue',
  other: 'indigo',
};

const accentFor = (station) =>
  (station && ACCENT_BY_SERVICE[station.serviceType]) || 'indigo';

/** station ของ store + ฟิลด์ที่จอต้องใช้ (accent / room)
    `room` = ตำแหน่งจริงในอาคาร ใช้บนแถบ "กำลังเรียก · <ห้อง>" ของ TV2
    (store ยังไม่มีเลขห้องแยก จึงประกอบจากโซน+ชั้น ซึ่งเป็นข้อมูลที่มีจริง
    และไม่ซ้ำกับชื่อจุดบริการที่อยู่กลาง header อยู่แล้ว) */
const decorate = (station) => {
  if (!station) return null;
  return {
    ...station,
    accent: accentFor(station),
    room: `${station.zone} · ${station.floor}`,
    shortLabel: station.label,
  };
};

export const QUEUE_STATIONS = STORE_STATIONS.map(decorate);

export const getStation = (stationId) => decorate(storeGetStation(stationId));

/* ── โซนของจอ (เลย์เอาต์ Figma) ───────────────────────────────────────────
   TV1 = 3 คอลัมน์ · TV3 = 2 คอลัมน์ · TV2 = จุดบริการเดียว
   นอกจากโซนตาม Figma แล้ว ยังเปิดให้ใช้ `displayId` ของ store (tv-a1 …)
   เป็นโซนได้ เพื่อให้ตั้งจอตามผังจริงของศูนย์ได้โดยไม่ต้องแก้โค้ด */
export const QUEUE_ZONES = [
  {
    id: 'hall',
    key: 'hall',
    label: 'จุดพักคอยรวม (Main Hall)',
    kind: 'hall',
    /* accent override: Figma TV1 คอลัมน์ 3 "การเงินและรับยา" เป็นสีม่วง
       (#818CF8) แม้จุดบริการจะเป็นการเงิน — คอลัมน์นี้แทนโซนการเงิน+ห้องยา
       รวมกัน จึงใช้สีของโซนไม่ใช่สีของ serviceType */
    columns: [
      { stationId: 'st-screening', label: 'แผนกซักประวัติ' },
      { stationId: 'st-opd', label: 'รอเข้าห้องตรวจ' },
      { stationId: 'st-finance', label: 'การเงินและรับยา', accent: 'indigo' },
    ],
  },
  {
    id: 'finance',
    key: 'finance',
    label: 'การเงินและรับยา',
    kind: 'finance',
    columns: [
      { stationId: 'st-finance', label: 'คิวชำระเงิน' },
      { stationId: 'st-pharmacy', label: 'คิวรับยา' },
    ],
  },
];

/** โซนจาก QUEUE_DISPLAYS ของ store — คอลัมน์คือจุดบริการที่ผูกกับจอนั้น */
const zoneFromDisplay = (displayId, maxColumns) => {
  const display = QUEUE_DISPLAYS.find((d) => d.id === displayId);
  if (!display) return null;
  const columns = STORE_STATIONS
    .filter((s) => s.displayId === displayId && s.active)
    .slice(0, maxColumns)
    .map((s) => ({ stationId: s.id, label: s.label }));
  return { id: display.id, key: display.id, label: display.label, kind: 'display', columns };
};

export const getZone = (zoneId, maxColumns = 3) =>
  QUEUE_ZONES.find((z) => z.id === zoneId) || zoneFromDisplay(zoneId, maxColumns) || null;

/* ── สถานะย่อยของคิว → badge บนแถวคิวถัดไป ───────────────────────────────
   จุดรับยาใช้ pharmacyStatus (1.3.6.2) ตามข้อความที่ตั้งไว้ในหน้าตั้งค่าคิว
   จุดอื่นใช้ประเภทคิว (ด่วน / ผู้สูงอายุ / นัดหมาย) — ทั่วไปไม่ต้องมี badge */
const PHARMACY_BADGE = { pending: 'grey', preparing: 'orange', ready: 'green' };
const QUEUE_TYPE_BADGE = { urgent: 'red', elderly: 'purple', appointment: 'blue', general: null };
const QUEUE_TYPE_LABEL = { urgent: 'ด่วน', elderly: 'ผู้สูงอายุ/ผู้พิการ', appointment: 'นัดหมาย', general: 'ทั่วไป' };

const rowStatus = (q) => {
  if (!q) return { key: 'waiting', label: 'รอเรียก', badge: null };
  if (q.pharmacyStatus) {
    const map = getQueueSettings().pharmacyMap || {};
    return {
      key: q.pharmacyStatus,
      label: map[q.pharmacyStatus] || q.pharmacyStatus,
      badge: PHARMACY_BADGE[q.pharmacyStatus] || null,
    };
  }
  return {
    key: q.queueType || 'general',
    label: QUEUE_TYPE_LABEL[q.queueType] || '',
    badge: QUEUE_TYPE_BADGE[q.queueType] || null,
  };
};

const toMillis = (value) => {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
};

/* ── Readers ที่จอใช้ ─────────────────────────────────────────────────── */

/**
 * getStationState(stationId, { nextCount, label, accent })
 * @returns {{ station, label, current, next, remaining, passed, updatedAt }}
 *   current: { queueId, number, calledAt, calledBy, callCount, confirmed }
 *   next:    [{ queueId, number, seq, statusKey, statusLabel, statusBadge }]
 *   passed:  [{ queueId, number, passedAt }]
 */
export const getStationState = (stationId, opts = {}) => {
  const base = getStation(stationId);
  if (!base) {
    return { station: null, label: '', current: null, next: [], remaining: 0, passed: [], updatedAt: Date.now() };
  }
  const nextCount = opts.nextCount || 6;
  const active = currentByStation[stationId] || null;
  /* คอลัมน์ของจอสั่งทับสีประจำแผนกได้ (ดู QUEUE_ZONES) */
  const station = opts.accent ? { ...base, accent: opts.accent } : base;

  return {
    station,
    label: opts.label || station.label,
    current: active
      ? {
          queueId: active.id,
          number: active.code,
          calledAt: toMillis(active.lastCallAt || active.calledAt),
          calledBy: (active.audit && active.audit.length ? active.audit[active.audit.length - 1].actor : '') || '',
          callCount: active.callCount || 1,
          /* store แยก calling (เรียกแล้วยังไม่มา) กับ serving (ยืนยันมาแล้ว) */
          confirmed: active.status === 'serving' ? true : null,
        }
      : null,
    next: nextQueues(stationId).slice(0, nextCount).map((q, i) => {
      const status = rowStatus(q);
      return {
        queueId: q.id,
        number: q.code,
        seq: i + 1,
        statusKey: status.key,
        statusLabel: status.label,
        statusBadge: status.badge,
      };
    }),
    remaining: remainingCount(stationId),
    passed: passedNumbers(stationId).map((q) => ({
      queueId: q.id,
      number: q.code,
      passedAt: toMillis(q.lastCallAt || q.issuedAt),
    })),
    updatedAt: Date.now(),
  };
};

const zoneState = (zoneId, fallbackZoneId, nextCount, maxColumns) => {
  const zone = getZone(zoneId, maxColumns) || getZone(fallbackZoneId, maxColumns);
  if (!zone) return { zone: null, columns: [], updatedAt: Date.now() };
  return {
    zone,
    columns: zone.columns.map((c) => getStationState(c.stationId, {
      nextCount,
      label: c.label,
      accent: c.accent,
    })),
    updatedAt: Date.now(),
  };
};

/** TV1 — 3 คอลัมน์ */
export const getHallState = (zoneId = 'hall') => zoneState(zoneId, 'hall', 4, 3);

/** TV3 — 2 คอลัมน์ */
export const getFinanceState = (zoneId = 'finance') => zoneState(zoneId, 'finance', 4, 2);

/* ── แถบประกาศท้ายจอ ─────────────────────────────────────────────────────
   store ยังไม่มีโมเดลของข้อความ marquee (มีแค่ข้อความบนบัตรคิว) จอจึงเป็น
   เจ้าของเอง และเก็บลง localStorage เพื่อให้เปิดซ้ำหลังไฟดับได้ค่าเดิม */
const ANNOUNCEMENT_KEY = 'mih:queue-display:announcement';
const DEFAULT_ANNOUNCEMENT =
  'หมายเลขที่เรียกผ่านไปแล้ว กรุณาติดต่อเจ้าหน้าที่ ณ จุดบริการ | '
  + 'กรุณาเตรียมบัตรประชาชนและใบนัดให้พร้อมก่อนเข้ารับบริการ';
const FALLBACK_ANNOUNCEMENT = `${QUEUE_CENTER_SITE.office}`;

const displayListeners = new Set();

/** แจ้ง subscriber ของจอ (ประกาศ / โหมดสาธิต) — ไม่เกี่ยวกับ store ของคิว */
const notifyDisplay = () => {
  displayListeners.forEach((fn) => { try { fn(); } catch (e) { /* no-op */ } });
};

/** cache ใน memory คือแหล่งความจริงระหว่าง session — localStorage เป็นแค่
    ที่เก็บถาวรให้เปิดซ้ำหลังไฟดับได้ ถ้าเขียน/อ่านไม่ได้ (private mode,
    โควตาเต็ม, SSR) ระบบต้องยังทำงานต่อ ไม่ใช่เด้งกลับเป็นค่า default เงียบ ๆ */
let announcementCache = null;

const readAnnouncement = () => {
  if (announcementCache) return { ...announcementCache };
  const fallback = { text: DEFAULT_ANNOUNCEMENT, updatedAt: null, updatedBy: 'ระบบ' };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(ANNOUNCEMENT_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    announcementCache = {
      text: parsed.text || FALLBACK_ANNOUNCEMENT,
      updatedAt: parsed.updatedAt || null,
      updatedBy: parsed.updatedBy || 'ระบบ',
    };
    return { ...announcementCache };
  } catch (err) {
    return fallback;
  }
};

export const getAnnouncement = () => readAnnouncement();
export const getDefaultAnnouncement = () => DEFAULT_ANNOUNCEMENT;

/** แก้ไขข้อความประกาศ — ว่างเปล่าให้กลับไปใช้ชื่อหน่วยงาน ไม่ปล่อย undefined */
export const setAnnouncement = (text, actor) => {
  const clean = String(text == null ? '' : text).trim();
  announcementCache = {
    text: clean || FALLBACK_ANNOUNCEMENT,
    updatedAt: Date.now(),
    updatedBy: actor || getQueueActor().name,
  };
  try {
    window.localStorage.setItem(ANNOUNCEMENT_KEY, JSON.stringify(announcementCache));
  } catch (err) {
    /* private mode / SSR → ใช้ค่าใน memory ต่อได้ */
  }
  logDisplayAudit(null, null, 'announcement', announcementCache.text);
  notifyDisplay();
  return { ...announcementCache };
};

/* ── subscribe ────────────────────────────────────────────────────────────
   รวม subscribe ของ store จริง + ประกาศของจอ ให้เป็นสัญญาเดียว
   คืน unsubscribe ที่เก็บกวาดครบ (จอเปิดค้างข้ามวัน ห้าม leak) */
export const subscribe = (fn) => {
  if (typeof fn !== 'function') return () => {};
  const unsubStore = subscribeQueueCenter(fn);
  displayListeners.add(fn);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    if (typeof unsubStore === 'function') unsubStore();
    displayListeners.delete(fn);
  };
};

/* ── heartbeat ────────────────────────────────────────────────────────────
   ⚠ สองสัญญาณนี้ต้องไม่ปนกัน (บั๊กเดิม: จอเงียบ 45 วิ = ขึ้น "กำลังเชื่อมต่อ")

   · `lastBeat` = **ตัวรับข้อมูลของจอยังเดินอยู่ไหม** — adapter ปิงตัวเองทุก
     15 วิ โดยไม่แตะข้อมูลคิว ดังนั้นจอที่เปิดทิ้งไว้ตอนพักเที่ยง (ไม่มีใคร
     กดเรียกคิวเลย) จะ **ไม่** ขึ้นแถบเตือน — แถบจะขึ้นก็ต่อเมื่อ event loop
     ของแท็บถูกแช่แข็งจริง ๆ ซึ่งคือกรณี "จอค้าง" ที่ต้องการเตือน
     (store ไม่มี tick ของตัวเอง — notify เกิดเฉพาะตอนมีการกระทำกับคิว
     จึงใช้ store notify เป็น liveness ไม่ได้)
   · `lastQueueEvent` = เวลาที่คิวขยับจริงล่าสุด ใช้บอก "ไม่มีการเรียกคิว
     มาแล้ว N นาที" ซึ่งเป็นคนละเรื่องกับ feed ตาย

   interval ระดับ module ตัวนี้ตั้งใจให้อยู่ตลอดอายุของแอป (ไม่มี unmount
   ให้เก็บกวาด) และไม่แตะข้อมูลใด ๆ จึงไม่สร้าง side-effect กับคิว */
let lastBeat = Date.now();
let lastQueueEvent = Date.now();
const HEARTBEAT_PING_MS = 15000;

subscribeQueueCenter(() => {
  lastBeat = Date.now();
  lastQueueEvent = Date.now();
});

if (typeof window !== 'undefined') {
  window.setInterval(() => { lastBeat = Date.now(); }, HEARTBEAT_PING_MS);
}

export const getHeartbeat = () => lastBeat;

/** เวลาที่ "คิวขยับจริง" ล่าสุด — จอใช้บอกช่วงที่ไม่มีการเรียกคิว */
export const getLastQueueEvent = () => lastQueueEvent;

/* ── การกระทำจากคอนโซล (แปลง stationId → queueId ให้ store) ──────────────

   หมายเหตุขอบเขต: ปุ่มเรียกคิว/เรียกซ้ำ/ยืนยันการมา/ยกเลิก ของ **เจ้าหน้าที่**
   อยู่ที่หน้าจัดการคิวของโมดูล 1.3 (`/queue-center`) ที่เดียว — จอและคอนโซล
   ของจอไม่ทำปุ่มชุดที่สองซ้อนกัน (Nielsen: consistency & standards)
   ฟังก์ชันด้านล่างคือ action adapter ของโมดูลจอ ที่แปลง stationId → queueId
   ให้ store พร้อมบันทึก audit ฝั่งจอ — ใช้โดยคอนโซลจอ/คีออสก์ที่ต้องสั่งงาน
   ในระดับ "จุดบริการ" แทนที่จะรู้จัก queueId */

const firstWaiting = (stationId) => nextQueues(stationId)[0] || null;

/**
 * เรียกคิวถัดไป (1.3.3.1)
 * @param {string} stationId
 * @param {{ skipUncalled?: boolean }} [opts]
 *   skipUncalled=true → บันทึกคิวที่กำลังเรียกอยู่เป็น "ไม่มาตามเรียก" ก่อน
 *   **ค่าเริ่มต้นคือ false**: การเขียนสถานะ passed ให้ผู้รับบริการมีผลจริง
 *   (ชิปจาง + คำเตือนบนจอสาธารณะ + audit ว่าข้ามคิว) จึงต้องเป็นสิ่งที่
 *   เจ้าหน้าที่ตั้งใจกดและยืนยันเอง ไม่ใช่ผลข้างเคียงของการกดเรียกคิวถัดไป
 *   (store rebuildCurrent เลือกคิวที่ lastCallAt ใหม่สุดเป็น current อยู่แล้ว
 *   คิวเดิมจึงหลุดจากจอเองโดยไม่ต้องทำเครื่องหมายว่าไม่มา)
 */
export const callNext = (stationId, opts = {}) => {
  const q = firstWaiting(stationId);
  if (!q) return { ok: false, message: 'ไม่มีคิวรอที่จุดบริการนี้' };
  const active = currentByStation[stationId];
  if (opts.skipUncalled && active && active.status === 'calling') {
    const skipped = skipQueue(active.id, 'เรียกคิวถัดไปโดยยังไม่ได้ยืนยันการมา');
    if (skipped.ok) {
      logDisplayAudit(stationId, active.code, 'confirm-absent', 'ข้ามคิวก่อนเรียกคิวถัดไป');
    }
  }
  const res = callQueue(q.id);
  if (res.ok) logDisplayAudit(stationId, q.code, 'call', 'เรียกคิวถัดไป');
  return res;
};

/** เรียกซ้ำ (1.3.4.3) — store throttle 8 วินาที และคืน throttled=true */
export const recallCurrent = (stationId) => {
  const active = currentByStation[stationId];
  if (!active) return { ok: false, message: 'ยังไม่มีคิวที่กำลังเรียกอยู่' };
  const res = recallQueue(active.id);
  if (res.ok) logDisplayAudit(stationId, active.code, 'recall', `เรียกครั้งที่ ${(active.callCount || 0) + 1}`);
  return res;
};

/** บันทึกการมายืนยัน (1.3.4.5) · present=false → ย้ายเข้า "เรียกผ่านไปแล้ว" */
export const confirmArrival = (stationId, queueId, present = true, reason = '') => {
  const target = currentByStation[stationId] || null;
  const id = queueId || (target && target.id);
  if (!id) return { ok: false, message: 'ยังไม่มีคิวที่กำลังเรียกอยู่' };
  /* ⚠ อ่านเลขคิวไว้ **ก่อน** สั่ง action: skipQueue ทำให้ store rebuild
     currentByStation[stationId] เป็น null ทันที ถ้าอ่านทีหลังจะได้ค่าว่าง
     แล้ว audit ของเคส "ไม่มาตามเรียก" (เคสที่ต้องตรวจย้อนหลังมากที่สุด)
     จะบันทึกเลขคิวเป็น "—" ทุกครั้ง */
  const code = (target && target.code) || '';
  const res = present ? storeConfirmArrival(id) : skipQueue(id, reason || 'ไม่มาตามเรียก');
  if (res.ok) {
    logDisplayAudit(stationId, code,
      present ? 'confirm-present' : 'confirm-absent', present ? 'มาแล้ว' : 'ไม่มาตามเรียก');
  }
  return res;
};

/** เลขคิวของ queueId — อ่านก่อนสั่ง action เสมอ เพื่อให้ audit ไม่ว่าง */
const codeOf = (queueId) => {
  const q = getQueues().find((row) => row.id === queueId);
  return (q && q.code) || '';
};

/** แก้ไขการบันทึกที่ผิด: ไม่มา → มาแล้ว (ดึงกลับจากรายการเรียกผ่านไปแล้ว) */
export const reopenPassed = (stationId, queueId, mode = 'priority') => {
  const code = codeOf(queueId);
  const res = restoreSkipped(queueId, { mode, reason: 'แก้ไขสถานะ — ผู้รับบริการมาติดต่อภายหลัง' });
  if (res.ok) logDisplayAudit(stationId, code, 'recall-passed', 'นำกลับเข้าคิว');
  return res;
};

/** ยกเลิกการเรียกล่าสุด (undo) — คืนคิวกลับเป็น "รอเรียก" ที่หัวแถว
    ใช้ restoreSkipped โหมด priority เพราะเป็น action เดียวใน store ที่คืน
    สถานะเป็น waiting พร้อมดันขึ้นหัวแถว โดยไม่สลับลำดับของคิวอื่น */
export const undoLastCall = (stationId, reason = 'ยกเลิกการเรียกล่าสุด') => {
  const active = currentByStation[stationId];
  if (!active) return { ok: false, message: 'ยังไม่มีคิวที่กำลังเรียกอยู่' };
  const res = restoreSkipped(active.id, { mode: 'priority', reason });
  if (res.ok) logDisplayAudit(stationId, active.code, 'undo', reason);
  return res;
};

/** ยกเลิกคิว (บังคับเหตุผล — store เป็นผู้ตรวจ) */
export const cancelQueueFromConsole = (stationId, queueId, reason) => {
  const code = codeOf(queueId);
  const res = cancelQueue(queueId, reason);
  if (res.ok) logDisplayAudit(stationId, code, 'cancel', reason);
  return res;
};

/* ── audit เฉพาะฝั่งจอ (การกระทำที่ทำจากคอนโซลจอ + การแก้ประกาศ) ───────── */

export const DISPLAY_AUDIT = [];

/* running number ที่เพิ่มขึ้นอย่างเดียว — ห้ามผูก id กับ DISPLAY_AUDIT.length
   เพราะ array ถูกตัดท้ายที่ 300 รายการ (ด้านล่าง) ทำให้รายการใหม่ทุกใบได้
   id ซ้ำกันหมดหลังเต็ม แล้ว rowKey ของ Table ก็ reconcile แถวผิด */
let displayAuditSeq = 0;

function logDisplayAudit(stationId, number, action, detail) {
  const actor = getQueueActor();
  displayAuditSeq += 1;
  DISPLAY_AUDIT.unshift({
    id: `disp-${displayAuditSeq}`,
    ts: Date.now(),
    stationId,
    number,
    action,
    actor: actor.name,
    role: actor.role,
    detail: detail || '',
  });
  if (DISPLAY_AUDIT.length > 300) DISPLAY_AUDIT.length = 300;
}

/** audit ของ **ฝั่งจอ** เท่านั้น: แก้ข้อความประกาศ · การเรียกจากโหมดสาธิต ·
    การสั่งงานที่ผ่าน adapter ของจอ
    ประวัติการเรียกคิวรายใบเป็นของหน้าจัดการคิว (`/queue-center`) ซึ่งมีตาราง
    audit ของตัวเองอยู่แล้ว — จอไม่ทำสำเนาชุดที่สองที่ใช้คำ/คอลัมน์คนละแบบ */
export const getDisplayAudit = (stationId) => DISPLAY_AUDIT
  .filter((e) => !stationId || e.stationId === stationId || e.stationId === null)
  .slice()
  .sort((a, b) => b.ts - a.ts);

/* ── ติดตามคิวออนไลน์ (1.3.4.4) ──────────────────────────────────────── */

const normalizeTicket = (raw) => {
  const v = String(raw == null ? '' : raw).trim().toUpperCase().replace(/\s+/g, '');
  if (!v) return '';
  if (v.indexOf('-') !== -1) return v;
  const m = v.match(/^([A-Z]+)(\d+)$/);
  const { digits, separator, padZero } = getQueueSettings().codeFormat;
  if (!m) return v;
  const body = padZero ? m[2].padStart(Math.max(1, digits), '0') : m[2];
  return `${m[1]}${separator}${body}`;
};

const AVG_MINUTES_BY_SERVICE = {
  screening: 3, consultation: 8, finance: 4, pharmacy: 5, lab: 4, other: 6,
};

/**
 * getTicketStatus(queueNumber)
 * @returns {{ found, number, station, calling, positionsAhead, etaMinutes,
 *             statusKey, statusLabel, reason }}
 */
export const getTicketStatus = (queueNumber) => {
  const number = normalizeTicket(queueNumber);
  const base = {
    found: false,
    number,
    station: null,
    calling: null,
    positionsAhead: null,
    etaMinutes: null,
    statusKey: 'unknown',
    statusLabel: 'ไม่พบบัตรคิวนี้ในระบบของวันนี้',
    reason: 'not-found',
    updatedAt: Date.now(),
  };
  if (!number) return { ...base, reason: 'empty', statusLabel: 'ยังไม่ได้ระบุเลขคิว' };

  const q = getQueues().find((row) => row.code === number);
  if (!q) return base;

  const station = getStation(q.stationId);
  const active = currentByStation[q.stationId] || null;
  const calling = active ? active.code : null;
  const avg = AVG_MINUTES_BY_SERVICE[station && station.serviceType] || 6;

  if (q.status === 'cancelled') {
    return { ...base, found: true, station, calling, reason: 'cancelled', statusKey: 'cancelled', statusLabel: 'บัตรคิวนี้ถูกยกเลิกแล้ว', detail: q.cancelReason };
  }
  if (q.status === 'done') {
    return { ...base, found: true, station, calling, reason: null, statusKey: 'done', statusLabel: 'รับบริการเสร็จสิ้นแล้ว', positionsAhead: 0, etaMinutes: 0 };
  }
  if (q.status === 'calling' || q.status === 'serving') {
    return {
      ...base,
      found: true,
      station,
      calling,
      positionsAhead: 0,
      etaMinutes: 0,
      reason: null,
      statusKey: q.status === 'serving' ? 'serving' : 'calling',
      statusLabel: q.status === 'serving' ? 'กำลังรับบริการ' : 'กำลังเรียกคิวของคุณ',
      callCount: q.callCount,
    };
  }
  if (q.status === 'passed') {
    return {
      ...base,
      found: true,
      station,
      calling,
      positionsAhead: 0,
      etaMinutes: 0,
      reason: null,
      statusKey: 'passed',
      statusLabel: 'หมายเลขที่เรียกผ่านไปแล้ว กรุณาติดต่อเจ้าหน้าที่',
    };
  }
  if (q.status === 'paused') {
    return { ...base, found: true, station, calling, reason: null, statusKey: 'paused', statusLabel: 'คิวถูกพักไว้ กรุณาติดต่อเจ้าหน้าที่' };
  }

  const queueList = nextQueues(q.stationId);
  const idx = queueList.findIndex((row) => row.id === q.id);
  const ahead = idx === -1 ? queueList.length : idx;
  return {
    ...base,
    found: true,
    station,
    calling,
    positionsAhead: ahead,
    etaMinutes: ahead * avg,
    reason: null,
    statusKey: 'waiting',
    statusLabel: ahead === 0 ? 'คิวของคุณเป็นคิวถัดไป' : 'รอเรียกคิว',
  };
};

/* ── โหมดสาธิต: เดินคิวเองทุก ~15 วินาที ────────────────────────────────
   จอสาธิตต้องขยับให้เห็นว่า live จริง แต่ต้อง **ไม่แอบ** สร้างการเรียกคิว
   ปลอมโดยผู้ใช้ไม่รู้ตัว → ปิดเป็นค่าเริ่มต้น เปิดได้จากหน้าเลือกจอ และทุก
   ครั้งที่เรียกจะถูกบันทึกลง audit ด้วยหมายเหตุว่ามาจากโหมดสาธิต

   ⚠ ตั้งใจให้ interval **เดินต่อหลังออกจากหน้าเลือกจอ** เพราะขั้นตอนใช้งาน
   จริงคือ "เปิดโหมดสาธิต → กดเปิดจอ TV → ดูคิวขยับ" ถ้าหยุดตอน unmount
   ฟีเจอร์นี้จะไม่มีทางใช้ได้เลย — แลกกับข้อนี้ ทุก surface ที่เห็นผลของมัน
   (จอ TV ทั้งสามแบบ + คอนโซลจอ) ต้องแสดงแถบ "โหมดสาธิตกำลังทำงาน" พร้อม
   ทางปิด และการเปลี่ยนสถานะจะ notify subscriber ของจอทันที */
let demoTimer = null;
let demoIndex = 0;
const DEMO_ROTATION = ['st-screening', 'st-opd', 'st-finance', 'st-pharmacy'];

export const isDemoAutoCallRunning = () => demoTimer !== null;

export const startDemoAutoCall = (intervalMs = 15000) => {
  if (demoTimer || typeof window === 'undefined') return;
  demoTimer = window.setInterval(() => {
    const stationId = DEMO_ROTATION[demoIndex % DEMO_ROTATION.length];
    demoIndex += 1;
    const q = firstWaiting(stationId);
    if (!q) return;
    const res = callQueue(q.id);
    if (res.ok) logDisplayAudit(stationId, q.code, 'call', 'โหมดสาธิต — เรียกอัตโนมัติ');
  }, intervalMs);
  notifyDisplay();
};

export const stopDemoAutoCall = () => {
  if (!demoTimer) return;
  window.clearInterval(demoTimer);
  demoTimer = null;
  notifyDisplay();
};

/* ── Formatting helpers (ใช้ร่วมทั้งจอ TV และหน้าออนไลน์) ──────────────── */

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const pad2 = (n) => String(n).padStart(2, '0');

/** "6 พฤษภาคม 2569" */
export const formatThaiDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

/** "10:45:23" */
export const formatClock = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—:—:—';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

/** "10:42" */
export const formatHm = (date) => {
  if (date == null) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

/** ประโยคอ่านออกเสียง — ใช้ template จากหน้าตั้งค่าคิว (1.3.4.2)
    อ่านเลขทีละตัวเพื่อให้ฟังชัดในโถงที่มีเสียงรบกวน */
export const buildSpeechText = (number, stationLabel, callCount = 1) => {
  if (!number) return '';
  const voice = getQueueSettings().voice || {};
  /* "A-125" → "A 1 2 5" — แยกอักขระให้อ่านทีละตัว แล้วยุบช่องว่างซ้ำที่เกิด
     จากขีดคั่น (ไม่งั้นจะได้ "A   1 2 5" ซึ่งทำให้เสียงหยุดยาวผิดจังหวะ) */
  const spoken = String(number).replace(/-/g, ' ').split('').join(' ').replace(/\s+/g, ' ').trim();
  const template = voice.template || 'ขอเชิญหมายเลข {queue} ที่ {station}';
  const base = template
    .replace('{queue}', spoken)
    .replace('{station}', stationLabel || 'จุดบริการ');
  return callCount > 1 ? `ขอเรียกซ้ำ ${base}` : base;
};
