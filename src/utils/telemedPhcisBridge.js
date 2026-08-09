/* telemedPhcisBridge — จำลองการเขียนข้อมูลกลับเข้า PHCIS (TOR §1.13.3)

   TOR ข้อ 1.13.3 ต้องการสองอย่าง: (ก) เชื่อมโยงข้อมูลกับระบบ PHCIS
   (ข) ดำเนินการตามกระบวนการทางคลินิกต่อได้. ระบบนี้ยังไม่มี backend จริง
   จึงทำสองอย่างนี้:

   1. mirror visit ที่ตรวจเสร็จแล้วลง localStorage เป็น "สมุดบันทึกการส่งข้อมูล"
      ที่มีรูปร่างเดียวกับเรคคอร์ดใน src/data/treatmentVisits.js (hn, วันที่,
      แพทย์, แผนก, วินิจฉัย, คำสั่ง, สรุป) — พร้อมสถานะ ซิงก์แล้ว/รอซิงก์/ล้มเหลว
   2. ให้ deep-link ไป /treat/record พร้อม HN + visit context เพื่อให้ผู้ใช้
      ทำงานทางคลินิกต่อในโมดูลตรวจรักษาได้ทันที

   ⚠️ ตรงไปตรงมา: นี่คือการ "จำลอง" — ไม่มี HTTP call ไปหา PHCIS จริง
   UI ทุกจุดที่ใช้ไฟล์นี้ต้องระบุว่ารอเชื่อม API จริง (ดู note ใน manifest).

   กติกาความล้มเหลว (deterministic ไม่ใช่สุ่ม เพื่อสาธิตปุ่ม "ลองใหม่" ได้):
     · สิทธิหมดอายุ            → ล้มเหลว
     · ยังไม่มี Authen Code    → ล้มเหลว (ยกเว้นสิทธิที่ไม่ต้อง Authen)
     · ไม่มีหลักฐาน/เวลาให้บริการ → ล้มเหลว (เบิกจ่ายไม่ได้)
   แก้เหตุที่หน้าห้องตรวจแล้วกด "ลองใหม่" → สำเร็จ */

const STORAGE_KEY = 'mih:telemed:phcis-journal:v1';
const MAX_ROWS = 300;

export const PHCIS_SYNC_STATUS = {
  synced:  { label: 'ซิงก์แล้ว', badge: 'success', icon: 'cloud_done' },
  pending: { label: 'รอซิงก์',   badge: 'warning', icon: 'cloud_upload' },
  failed:  { label: 'ล้มเหลว',   badge: 'error',   icon: 'cloud_off' },
  /* ปิดห้องโดยไม่มีการให้บริการจริง (ไม่มาตามนัด / หมดช่วงเวลานัด) — ต้องไม่ถูก
     นับเป็น "ส่งเข้า PHCIS แล้ว" และต้องเบิกจ่ายไม่ได้ */
  'no-show': { label: 'ไม่มีการให้บริการ', badge: 'neutral', icon: 'person_off' },
};

export const NO_SHOW_REASON = {
  'no-show':  'ผู้รับบริการไม่เข้าห้องตรวจ — ไม่มีการให้บริการ',
  timeslot:   'ปิดห้องเมื่อหมดช่วงเวลานัด — ผู้รับบริการไม่เข้าห้องตรวจ ไม่มีการให้บริการ',
};

/* ── storage ที่ล้มแล้วไม่พังหน้าจอ ─────────────────────────────────── */
let memoryOnly = false;
let degradeReason = '';
let journal = null;

const listeners = new Set();
const emit = () => listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });

export const subscribePhcisJournal = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** สถานะพื้นที่จัดเก็บ — หน้าจอเอาไปขึ้นแบนเนอร์เตือนเมื่อ degrade */
export const phcisStorageState = () => ({ ok: !memoryOnly, reason: degradeReason });

const readStore = () => {
  if (journal) return journal;
  journal = {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') journal = parsed;
    }
  } catch (err) {
    memoryOnly = true;
    degradeReason = 'อ่านข้อมูลที่เก็บในเครื่องไม่ได้ (ข้อมูลเสียหายหรือถูกปิดกั้น) — ทำงานในหน่วยความจำชั่วคราว';
    journal = {};
  }
  return journal;
};

const writeStore = () => {
  if (memoryOnly) return;
  try {
    const rows = Object.values(journal || {});
    if (rows.length > MAX_ROWS) {
      const keep = rows
        .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
        .slice(0, MAX_ROWS);
      journal = keep.reduce((acc, r) => { acc[r.visitId] = r; return acc; }, {});
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(journal));
  } catch (err) {
    memoryOnly = true;
    degradeReason = 'พื้นที่จัดเก็บในเครื่องเต็มหรือถูกปิดกั้น — สถานะการซิงก์จะหายเมื่อปิดแท็บ';
  }
};

/* ── payload ที่ "จะถูกส่ง" เข้า PHCIS ───────────────────────────────── */
const buildPayload = (visit, extra = {}) => ({
  hn: visit.hn,
  patientName: visit.name,
  visitId: visit.id,
  visitDate: visit.endedAt || visit.startedAt || visit.appointmentAt || new Date().toISOString(),
  department: visit.department,
  doctor: visit.doctor,
  originUnit: visit.originUnit,
  rights: visit.rights,
  authenCode: visit.authenCode || '',
  chiefComplaint: visit.chiefComplaint,
  diagnosis: extra.diagnosis || '',
  summary: extra.summary || '',
  durationMin: visit.startedAt && visit.endedAt
    ? Math.max(0, Math.round((new Date(visit.endedAt) - new Date(visit.startedAt)) / 60000))
    : null,
  evidenceCount: visit.evidence?.length || 0,
  orders: (visit.orders || []).map((o) => ({
    id: o.id,
    kind: o.kind,
    code: o.code || '',
    label: o.label,
    detail: o.detail,
    status: o.status,
  })),
});

/** เหตุผลที่ยังส่งเข้า PHCIS ไม่ได้ — คืน null เมื่อพร้อมส่ง */
export const blockingReason = (visit) => {
  if (!visit) return 'ไม่พบรายการตรวจ';
  if (visit.rightsExpired) return 'สิทธิการรักษาหมดอายุ — ตรวจสอบสิทธิที่เวชระเบียนก่อนส่งเข้า PHCIS';
  if (visit.authen === 'none' && !visit.authenCode) return 'ยังไม่ได้ขอ Authen Code สปสช. — ขอรหัสแล้วกด "ลองใหม่"';
  if (!visit.startedAt || !visit.endedAt) return 'ยังไม่มีเวลาเริ่ม-สิ้นสุดการให้บริการครบ — บันทึกเวลาก่อนส่ง';
  if (!visit.evidence?.length) return 'ยังไม่มีหลักฐานการให้บริการ (ภาพ/ไฟล์) — อัพโหลดก่อนส่งเพื่อให้เบิกจ่ายได้';
  return null;
};

const now = () => new Date().toISOString();

const upsert = (row) => {
  readStore();
  journal[row.visitId] = row;
  writeStore();
  emit();
  return row;
};

/**
 * ส่ง visit เข้าคิวซิงก์ (เรียกตอนจบสาย หรือตอนหน้าห้องตรวจ mirror รายการที่ตรวจแล้ว)
 * @returns {{ok:boolean, row:object}}
 */
export const queueVisitSync = (visit, actor, extra = {}) => {
  if (!visit) return { ok: false, row: null };
  readStore();
  const previous = journal[visit.id];
  const reason = blockingReason(visit);
  const attempts = (previous?.attempts || 0) + 1;
  const row = {
    visitId: visit.id,
    hn: visit.hn,
    name: visit.name,
    status: reason ? 'failed' : 'synced',
    reason: reason || '',
    at: now(),
    by: actor || 'ระบบ',
    attempts,
    phcisRef: reason ? '' : `PHCIS-${visit.hn.replace(/\D/g, '')}-${String(attempts).padStart(2, '0')}`,
    payload: buildPayload(visit, extra),
  };
  return { ok: !reason, row: upsert(row) };
};

/**
 * ปิดห้องโดย "ไม่มีการให้บริการ" (ไม่มาตามนัด / หมดช่วงเวลานัด)
 *
 * ห้ามใช้ queueVisitSync กับกรณีนี้เด็ดขาด: visit ที่มีหลักฐานแนบไว้ล่วงหน้า
 * และถูกประทับเวลาเริ่ม-สิ้นสุดตอนแพทย์เข้า/ออกห้อง จะผ่าน blockingReason()
 * แล้วถูกบันทึกเป็น "ซิงก์แล้ว" พร้อมเลขอ้างอิง PHCIS ทั้งที่ไม่มีการตรวจเกิดขึ้น
 * — เท่ากับบันทึกบริการที่ไม่ได้ให้จริงและเปิดช่องเบิกจ่าย
 *
 * @returns {{ok:boolean, row:object|null}} ok=false เสมอ (ไม่ได้ส่งเข้า PHCIS)
 */
export const recordNoShowVisit = (visit, actor, choice = 'no-show') => {
  if (!visit) return { ok: false, row: null };
  readStore();
  const previous = journal[visit.id];
  const row = {
    visitId: visit.id,
    hn: visit.hn,
    name: visit.name,
    status: 'no-show',
    reason: NO_SHOW_REASON[choice] || NO_SHOW_REASON['no-show'],
    at: now(),
    by: actor || 'ระบบ',
    attempts: previous?.attempts || 0,
    phcisRef: '',
    payload: { ...buildPayload(visit), noShow: true, closeReason: choice },
  };
  return { ok: false, row: upsert(row) };
};

/** ตั้งสถานะ "รอซิงก์" ให้รายการที่เพิ่งจบสาย (ก่อนจะพยายามส่งจริง) */
export const markPending = (visit, actor) => {
  if (!visit) return null;
  readStore();
  const previous = journal[visit.id];
  return upsert({
    visitId: visit.id,
    hn: visit.hn,
    name: visit.name,
    status: 'pending',
    reason: '',
    at: now(),
    by: actor || 'ระบบ',
    attempts: previous?.attempts || 0,
    phcisRef: previous?.phcisRef || '',
    payload: buildPayload(visit),
  });
};

/** ลองส่งซ้ำ — ใช้ข้อมูล visit ปัจจุบัน จึงสำเร็จเมื่อผู้ใช้แก้เหตุที่ค้างแล้ว */
export const retryVisitSync = (visit, actor) => queueVisitSync(visit, actor);

/** สมุดบันทึกทั้งหมด (ใหม่สุดก่อน) */
export const getPhcisJournal = () => {
  readStore();
  return Object.values(journal).sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
};

export const getPhcisSyncState = (visitId) => {
  readStore();
  return journal[visitId] || null;
};

/**
 * mirror รายการที่ "ตรวจแล้ว" ทั้งหมดที่ยังไม่เคยเข้าสมุด — เรียกจากหน้าห้องตรวจ
 * (idempotent: รายการที่มีอยู่แล้วจะไม่ถูกเขียนทับ)
 */
export const ensureJournalForVisits = (visits = [], actor) => {
  readStore();
  let touched = 0;
  visits.forEach((v) => {
    if (v.status !== 'done') return;
    if (journal[v.id]) return;
    const reason = blockingReason(v);
    journal[v.id] = {
      visitId: v.id,
      hn: v.hn,
      name: v.name,
      status: reason ? 'failed' : 'synced',
      reason: reason || '',
      at: v.endedAt || now(),
      by: actor || 'ระบบ (อัตโนมัติเมื่อปิดการตรวจ)',
      attempts: 1,
      phcisRef: reason ? '' : `PHCIS-${v.hn.replace(/\D/g, '')}-01`,
      payload: buildPayload(v),
    };
    touched += 1;
  });
  if (touched) { writeStore(); emit(); }
  return touched;
};

/** นับสถานะสำหรับแถบสรุปบนหน้าห้องตรวจ */
export const phcisSyncCounts = (visits = []) => {
  readStore();
  const counts = { synced: 0, pending: 0, failed: 0, 'no-show': 0, untracked: 0 };
  visits.forEach((v) => {
    const row = journal[v.id];
    if (!row) { counts.untracked += 1; return; }
    counts[row.status] = (counts[row.status] || 0) + 1;
  });
  return counts;
};

/** ล้างสมุดบันทึกในเครื่อง (ใช้ในหน้าทดสอบ / เมื่อข้อมูลเสียหาย) */
export const clearPhcisJournal = () => {
  journal = {};
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  emit();
};

/** deep-link ไปทำงานทางคลินิกต่อในโมดูลตรวจรักษา */
export const phcisRecordLink = (visit) => {
  if (!visit) return '/treat/record';
  const q = new URLSearchParams({
    hn: visit.hn,
    visit: visit.id,
    from: 'telemed',
  });
  return `/treat/record?${q.toString()}`;
};
