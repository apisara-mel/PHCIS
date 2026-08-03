/* tbDotLog.js — การกำกับการกินยา DOT (TOR §1.10.4.7 ครึ่ง DOT) mock store.
   Legacy คู่มือระบบวัณโรค.pdf: ผู้กำกับการกินยา (จนท./อสส./ญาติ) + การมารับยา;
   VOT (Video Observed Therapy ผ่าน Telemedicine) เป็นส่วนขยายตาม TOR.

   โครงสร้าง: per-registry DOT config (ความถี่ + ผู้กำกับ, เก็บประวัติการ
   เปลี่ยน schedule) + per-day log entries keyed 'YYYY-MM-DD'. Log ที่ผ่านมา
   ถูก seed แบบ deterministic จาก treatmentStartDate เพื่อให้ month grid มี
   ข้อมูลจริงเสมอไม่ว่าจะเปิดเดือนไหน. Pages mutate ผ่าน helpers แล้ว bump
   tick เอง (สัญญาเดียวกับ tbRegistry.js). */

import { getTbRegistryById, appendTbAudit, nowTbStamp } from '@/data/tbRegistry';

export const DOT_OBSERVER_TYPES = [
  { value: 'staff',    label: 'เจ้าหน้าที่สาธารณสุข (จนท.)' },
  { value: 'volunteer', label: 'อาสาสมัครสาธารณสุข (อสส.)' },
  { value: 'family',   label: 'ญาติ / ผู้ดูแลในครอบครัว' },
  { value: 'vot',      label: 'VOT ผ่าน Telemedicine' },
];

export const resolveDotObserverType = (value) =>
  DOT_OBSERVER_TYPES.find((o) => o.value === value) || null;

export const DOT_FREQUENCIES = [
  { value: 'daily',    label: 'ทุกวัน' },
  { value: 'weekday',  label: 'จันทร์–ศุกร์ (เว้นวันหยุด)' },
  { value: 'thriceWeekly', label: 'สัปดาห์ละ 3 ครั้ง (จ/พ/ศ)' },
];

/* สถานะรายวัน — ค่านอกเหนือจากนี้คือ "ไม่มีข้อมูล" (อนาคต/ก่อนเริ่มยา). */
export const DOT_DAY_STATUSES = [
  { value: 'taken',    label: 'กินยาต่อหน้าผู้กำกับ', icon: 'check_circle' },
  { value: 'vot',      label: 'กินยาผ่าน VOT',        icon: 'videocam' },
  { value: 'self',     label: 'กินยาเอง (รายงานภายหลัง)', icon: 'how_to_reg' },
  { value: 'missed',   label: 'ขาดยา',                 icon: 'cancel' },
  { value: 'holiday',  label: 'วันหยุดตาม schedule',    icon: 'event_busy' },
];

export const resolveDotDayStatus = (value) =>
  DOT_DAY_STATUSES.find((s) => s.value === value) || null;

/* ── Config per registry ──────────────────────────────────────────── */

const DOT_CONFIG = {
  'tbreg-2569-01': {
    frequency: 'daily', observerType: 'volunteer', observerName: 'อสส.สมพร ใจดี',
    history: [
      { at: 'เริ่มการรักษา', frequency: 'daily', observerType: 'family', observerName: 'นางสายใจ ศรีสมบูรณ์ (ภรรยา)' },
      { at: 'เดือนที่ 2', frequency: 'daily', observerType: 'volunteer', observerName: 'อสส.สมพร ใจดี' },
    ],
  },
  'tbreg-2569-02': {
    frequency: 'daily', observerType: 'vot', observerName: 'พว.อรทัย แก้วประเสริฐ (VOT)',
    history: [
      { at: 'เริ่มการรักษา', frequency: 'daily', observerType: 'vot', observerName: 'พว.อรทัย แก้วประเสริฐ (VOT)' },
    ],
  },
  'tbreg-2569-03': {
    frequency: 'daily', observerType: 'family', observerName: 'นางกาญจนา ก้องเกียรติ (ภรรยา)',
    history: [
      { at: 'เริ่มการรักษา', frequency: 'daily', observerType: 'family', observerName: 'นางกาญจนา ก้องเกียรติ (ภรรยา)' },
    ],
  },
  'tbreg-2569-04': {
    frequency: 'daily', observerType: 'volunteer', observerName: 'อสส.สมพร ใจดี',
    history: [
      { at: 'เริ่มการรักษา', frequency: 'daily', observerType: 'volunteer', observerName: 'อสส.สมพร ใจดี' },
    ],
  },
  /* 05 — ยังไม่เริ่มยา: ไม่มี observer → หน้า DOT แสดง warning banner
     "ยังไม่ได้กำหนดผู้กำกับการกินยา". */
  'tbreg-2569-05': null,
  'tbreg-2569-06': {
    frequency: 'weekday', observerType: 'family', observerName: 'นายอ่อน อ่อนน้อม (สามี)',
    history: [
      { at: 'เริ่มการรักษา', frequency: 'weekday', observerType: 'family', observerName: 'นายอ่อน อ่อนน้อม (สามี)' },
    ],
  },
  'tbreg-2568-52': {
    frequency: 'daily', observerType: 'volunteer', observerName: 'อสส.บุญช่วย รักงาน',
    history: [
      { at: 'เริ่มการรักษา', frequency: 'daily', observerType: 'volunteer', observerName: 'อสส.บุญช่วย รักงาน' },
    ],
  },
};

export const getDotConfig = (regId) => DOT_CONFIG[regId] || null;

export const setDotConfig = (regId, { frequency, observerType, observerName }, by) => {
  const prev = DOT_CONFIG[regId];
  DOT_CONFIG[regId] = {
    frequency, observerType, observerName,
    history: [
      ...(prev?.history || []),
      { at: nowTbStamp(), frequency, observerType, observerName },
    ],
  };
  const record = getTbRegistryById(regId);
  if (record) {
    appendTbAudit(record, 'ปรับ DOT schedule',
      `ความถี่ ${DOT_FREQUENCIES.find((f) => f.value === frequency)?.label || frequency} · ผู้กำกับ ${observerName}`, by);
  }
  return DOT_CONFIG[regId];
};

/* ── Per-day log ──────────────────────────────────────────────────── */

const DOT_LOG = {}; // { [regId]: { 'YYYY-MM-DD': { status, note, recordedBy, recordedAt, editReason? } } }

export const dateKey = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${m}-${day}`;
};

/* Seed log deterministically from treatmentStartDate → yesterday.
   Pattern: every 9th day missed, every 5th day VOT when observer is VOT,
   weekends holiday for 'weekday' schedules — realistic without random. */
const seedLog = (regId) => {
  if (DOT_LOG[regId]) return DOT_LOG[regId];
  const log = {};
  DOT_LOG[regId] = log;
  const record = getTbRegistryById(regId);
  const config = DOT_CONFIG[regId];
  if (!record || !config || !record.treatmentStartDate) return log;
  const start = new Date(record.treatmentStartDate);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  let i = 0;
  for (let d = new Date(start); d <= yesterday; d.setDate(d.getDate() + 1)) {
    i += 1;
    const key = dateKey(d);
    const dow = d.getDay();
    if (config.frequency === 'weekday' && (dow === 0 || dow === 6)) {
      log[key] = { status: 'holiday', note: '', recordedBy: '—', recordedAt: '' };
      continue;
    }
    if (config.frequency === 'thriceWeekly' && ![1, 3, 5].includes(dow)) {
      log[key] = { status: 'holiday', note: '', recordedBy: '—', recordedAt: '' };
      continue;
    }
    if (i % 9 === 0) {
      log[key] = { status: 'missed', note: 'ติดต่อไม่ได้ / ไม่มากินยา', recordedBy: config.observerName, recordedAt: key };
      continue;
    }
    if (config.observerType === 'vot') {
      log[key] = { status: 'vot', note: 'VOT ผ่าน Telemedicine', recordedBy: config.observerName, recordedAt: key };
      continue;
    }
    log[key] = {
      status: i % 5 === 0 ? 'self' : 'taken',
      note: '',
      recordedBy: config.observerName,
      recordedAt: key,
    };
  }
  return log;
};

export const getDotLog = (regId) => seedLog(regId);

export const getDotDay = (regId, key) => seedLog(regId)[key] || null;

/* บันทึก/แก้ไขรายวัน — การแก้ไขย้อนหลัง (วันที่ < วันนี้ที่มีข้อมูลแล้ว)
   ต้องส่ง editReason และถูกลง audit (playbook §5). */
export const setDotDay = (regId, key, { status, note = '', editReason = '' }, by) => {
  const log = seedLog(regId);
  const existing = log[key];
  const isRetroEdit = !!existing && key < dateKey(new Date());
  if (isRetroEdit && !editReason.trim()) {
    return { ok: false, error: 'การแก้ไขย้อนหลังต้องระบุเหตุผล' };
  }
  log[key] = {
    status, note,
    recordedBy: by || 'ผู้ใช้งานปัจจุบัน',
    recordedAt: nowTbStamp(),
    ...(isRetroEdit ? { editReason: editReason.trim(), previousStatus: existing.status } : {}),
  };
  const record = getTbRegistryById(regId);
  if (record) {
    appendTbAudit(record, isRetroEdit ? 'แก้ไข DOT ย้อนหลัง' : 'บันทึก DOT',
      `${key}: ${resolveDotDayStatus(status)?.label || status}${isRetroEdit ? ` (เหตุผล: ${editReason.trim()})` : ''}`, by);
  }
  return { ok: true };
};

/* % ความสม่ำเสมอ = taken+vot+self / วันที่ต้องกินยา (ไม่นับ holiday). */
export const computeDotAdherence = (regId) => {
  const log = seedLog(regId);
  const entries = Object.values(log).filter((e) => e.status !== 'holiday');
  if (entries.length === 0) return null;
  const taken = entries.filter((e) => ['taken', 'vot', 'self'].includes(e.status)).length;
  return {
    percent: Math.round((taken / entries.length) * 100),
    taken,
    missed: entries.filter((e) => e.status === 'missed').length,
    total: entries.length,
  };
};
