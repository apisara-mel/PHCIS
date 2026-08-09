/* telemedAuditPersist — ทำให้ "บันทึกการเข้าใช้งาน" ของ Telemedicine
   รอด refresh (TOR §1.13.11)

   src/pages/audit/auditData.js เป็น log ในหน่วยความจำล้วน (LOG array +
   subscribeAuditLog) และเป็นไฟล์ของโมดูลอื่น — ห้ามแก้. ไฟล์นี้จึงเป็น
   "ตัวสะท้อน" ที่ subscribe แล้วคัดเฉพาะเหตุการณ์ mod === 'Telemedicine'
   ไปเก็บใน localStorage พร้อม retention cap.

   หมายเหตุสำคัญเรื่อง API ที่ verify มาแล้ว:
     · subscribeAuditLog(fn) ไม่ replay ประวัติย้อนหลัง — fn ถูกเรียกเฉพาะตอนมี
       แถวใหม่ (appendAuditEvent → unshift → notify) ดังนั้นต้องอ่าน snapshot
       ด้วย getAuditLog() เองตอนเริ่ม แล้วจำความยาวไว้เพื่อตัดเฉพาะแถวใหม่
     · แถวไม่มี id — จึงติด id ให้ตอนบันทึกและกันซ้ำด้วย (session + ลำดับ)

   ทุกแถวเก็บ sessionId ของหน้าต่างที่สร้างมัน หน้ารายงานจึงแยกได้ว่า
   แถวไหน "สด" (session ปัจจุบัน) แถวไหน "จากเครื่อง" (session ก่อนหน้า)
   และไม่แสดงซ้ำสองครั้ง. */

import { getAuditLog, subscribeAuditLog } from '@/pages/audit/auditData';

const STORAGE_KEY = 'mih:telemed:audit-log:v1';
const MAX_ROWS = 500;
const RETENTION_DAYS = 90;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const TELEMED_AUDIT_RETENTION_LABEL = `เก็บสูงสุด ${MAX_ROWS} รายการ / ${RETENTION_DAYS} วัน`;

/** id ของหน้าต่างปัจจุบัน — แถวที่มี sessionId นี้คือแถว "สด" */
export const AUDIT_SESSION_ID = `S-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

let rows = null;
let degraded = false;
let degradeReason = '';
let started = false;
let seenLogLength = 0;
let seq = 0;

const listeners = new Set();
const emit = () => listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });

export const subscribePersistedAudit = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const auditStorageState = () => ({ ok: !degraded, reason: degradeReason });

const load = () => {
  if (rows) return rows;
  rows = [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        rows = parsed.filter((r) => r && r.action && typeof r.storedAt === 'number');
      } else {
        throw new Error('รูปแบบข้อมูลไม่ถูกต้อง');
      }
    }
  } catch (err) {
    degraded = true;
    degradeReason = 'อ่านบันทึกที่เก็บในเครื่องไม่ได้ (ข้อมูลเสียหาย) — แสดงเฉพาะเหตุการณ์ของ session ปัจจุบัน';
    rows = [];
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }
  return rows;
};

const trim = (list) => {
  const cutoff = Date.now() - RETENTION_MS;
  const fresh = list.filter((r) => r.storedAt >= cutoff);
  return fresh.length > MAX_ROWS ? fresh.slice(0, MAX_ROWS) : fresh;
};

const save = () => {
  if (degraded) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch (err) {
    /* โควตาเต็ม → ตัดครึ่งแล้วลองอีกครั้ง ถ้ายังไม่ได้ค่อย degrade */
    try {
      rows = rows.slice(0, Math.floor(rows.length / 2));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch {
      degraded = true;
      degradeReason = 'พื้นที่จัดเก็บในเครื่องเต็ม — บันทึกใหม่จะอยู่ในหน่วยความจำจนกว่าจะปิดแท็บ';
    }
  }
};

const persistRow = (row) => {
  seq += 1;
  const stored = {
    id: `${AUDIT_SESSION_ID}-${seq}`,
    sessionId: AUDIT_SESSION_ID,
    storedAt: Date.now(),
    time: row.time,
    user: row.user,
    action: row.action,
    mod: row.mod,
    ok: Boolean(row.ok),
  };
  rows = trim([stored, ...load()]);
  save();
  return stored;
};

/**
 * เริ่มสะท้อน audit log ลงเครื่อง — idempotent (เรียกซ้ำได้จากทุกหน้า)
 * @returns {Function} ฟังก์ชันยกเลิกการสะท้อน (ปกติไม่ต้องเรียก)
 */
export const startTelemedAuditMirror = () => {
  load();
  if (started) return () => {};
  started = true;
  seenLogLength = getAuditLog().length;
  const unsubscribe = subscribeAuditLog(() => {
    const snapshot = getAuditLog();
    const added = snapshot.length - seenLogLength;
    seenLogLength = snapshot.length;
    if (added <= 0) return;
    /* แถวใหม่ถูก unshift ไว้หัวลิสต์ — เก็บจากเก่าไปใหม่เพื่อให้ลำดับถูก */
    const fresh = snapshot.slice(0, added).reverse();
    let touched = false;
    fresh.forEach((r) => {
      if (r.mod !== 'Telemedicine') return;
      persistRow(r);
      touched = true;
    });
    if (touched) emit();
  });
  return () => { started = false; unsubscribe(); };
};

/** แถวที่บันทึกไว้ทั้งหมด (ใหม่สุดก่อน) */
export const getPersistedAudit = () => trim(load()).slice();

/** เฉพาะแถวจาก session ก่อนหน้า — ใช้รวมกับแถวสดโดยไม่ซ้ำ */
export const getPreviousSessionAudit = () =>
  getPersistedAudit().filter((r) => r.sessionId !== AUDIT_SESSION_ID);

export const persistedAuditCounts = () => {
  const all = getPersistedAudit();
  return {
    total: all.length,
    thisSession: all.filter((r) => r.sessionId === AUDIT_SESSION_ID).length,
    previous: all.filter((r) => r.sessionId !== AUDIT_SESSION_ID).length,
  };
};

/**
 * ล้างบันทึกที่เก็บในเครื่อง (เฉพาะเจ้าหน้าที่ PDPA — หน้าจอเป็นผู้ตรวจสิทธิ์)
 * การล้างเองก็ต้องถูกบันทึก → หน้าจอเรียก logTelemedEvent ต่อทันที ซึ่งจะถูก
 * เก็บลงเครื่องรอบใหม่โดยตัวสะท้อนนี้.
 */
export const purgePersistedAudit = () => {
  const removed = load().length;
  rows = [];
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  degraded = false;
  degradeReason = '';
  emit();
  return removed;
};
