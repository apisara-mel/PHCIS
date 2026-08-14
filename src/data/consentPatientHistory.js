/* PHCIS | Consent — aggregate patient consent history for timeline view. */

import { getConsentRecords } from '@/data/consentWorkflowStore';
import { MOBILE_APP_CHANNEL } from '@/data/consentChannels';

export const CONSENT_HISTORY_ACTIONS = {
  'สร้างคำขอ': { tone: 'blue', icon: 'add' },
  'ให้ความยินยอม': { tone: 'green', icon: 'check_circle' },
  'ไม่ให้ความยินยอม': { tone: 'red', icon: 'cancel' },
  'ถอนความยินยอม': { tone: 'red', icon: 'undo' },
  'แก้ไขความยินยอม': { tone: 'yellow', icon: 'edit' },
  'มีเวอร์ชันใหม่': { tone: 'yellow', icon: 'new_releases' },
};

const actionFromStatus = (status) => {
  if (status === 'ยินยอมแล้ว') return 'ให้ความยินยอม';
  if (status === 'ถอนความยินยอม') return 'ถอนความยินยอม';
  if (status === 'ปฏิเสธ' || status === 'ไม่ยินยอม') return 'ไม่ให้ความยินยอม';
  if (status === 'มีเวอร์ชันใหม่') return 'มีเวอร์ชันใหม่';
  if (status === 'รอลงนาม' || status === 'อยู่ระหว่างลงนาม') return 'สร้างคำขอ';
  return 'ให้ความยินยอม';
};

const changeDetail = (action, fromStatus, toStatus, version) => {
  if (action === 'มีเวอร์ชันใหม่' && version) return `อัปเดตเป็น ${version}`;
  if (fromStatus && fromStatus !== '—' && toStatus) return `${fromStatus} → ${toStatus}`;
  if (toStatus) return `— → ${toStatus}`;
  return action;
};

const normalizeEntry = (entry, record, index, historyList) => {
  const prevStatus = entry.fromStatus
    ?? (index > 0 ? historyList[index - 1].status : '—');
  const toStatus = entry.toStatus ?? entry.status;
  const action = entry.action || actionFromStatus(toStatus);
  return {
    id: `${record.id}-${entry.date}-${entry.formCode || record.formCode}-${toStatus}-${index}`,
    action,
    fromStatus: prevStatus,
    toStatus,
    formCode: entry.formCode || record.formCode,
    formName: entry.formName || record.formName,
    type: entry.type || record.type,
    version: entry.version || record.version,
    channel: entry.channel || record.signChannel || record.requestChannel || MOBILE_APP_CHANNEL,
    dateTime: entry.dateTime || entry.date,
    changeDetail: entry.changeDetail || changeDetail(action, prevStatus, toStatus, entry.version || record.version),
    recordId: record.id,
  };
};

const synthesizeFromRecord = (record) => {
  const events = [];
  const base = {
    formCode: record.formCode,
    formName: record.formName,
    type: record.type,
    version: record.version,
  };

  if (record.createdDate && record.createdDate !== '-') {
    events.push({
      ...base,
      action: 'สร้างคำขอ',
      fromStatus: '—',
      toStatus: 'รอลงนาม',
      channel: record.requestChannel || record.signChannel || MOBILE_APP_CHANNEL,
      dateTime: record.createdDate,
      changeDetail: '— → รอลงนาม',
    });
  }

  if (record.signedDate && record.signedDate !== '-') {
    const rejected = record.status === 'ปฏิเสธ';
    events.push({
      ...base,
      action: rejected ? 'ไม่ให้ความยินยอม' : 'ให้ความยินยอม',
      fromStatus: 'รอลงนาม',
      toStatus: rejected ? 'ปฏิเสธ' : 'ยินยอมแล้ว',
      channel: record.signChannel || record.requestChannel || MOBILE_APP_CHANNEL,
      dateTime: record.signedDate,
      changeDetail: rejected ? 'รอลงนาม → ปฏิเสธ' : 'รอลงนาม → ยินยอมแล้ว',
    });
  }

  if (record.withdrawnDate && record.withdrawnDate !== '-') {
    events.push({
      ...base,
      action: 'ถอนความยินยอม',
      fromStatus: 'ยินยอมแล้ว',
      toStatus: 'ถอนความยินยอม',
      channel: record.revokeRequestChannel || record.signChannel || MOBILE_APP_CHANNEL,
      dateTime: record.withdrawnDate,
      changeDetail: 'ยินยอมแล้ว → ถอนความยินยอม',
    });
  }

  if (record.status === 'มีเวอร์ชันใหม่') {
    events.push({
      ...base,
      action: 'มีเวอร์ชันใหม่',
      fromStatus: 'ยินยอมแล้ว',
      toStatus: 'มีเวอร์ชันใหม่',
      channel: record.signChannel || MOBILE_APP_CHANNEL,
      dateTime: record.createdDate,
      changeDetail: changeDetail('มีเวอร์ชันใหม่', 'ยินยอมแล้ว', 'มีเวอร์ชันใหม่', record.version),
    });
  }

  return events;
};

/** All consent timeline events for one patient (every worklist record with same HN). */
export const buildPatientConsentTimeline = (hn, records = getConsentRecords()) => {
  const patientRecords = records.filter((r) => r.hn === hn);
  if (patientRecords.length === 0) return { patient: null, events: [] };

  const patient = {
    hn,
    name: patientRecords[0].name,
    guardian: patientRecords.find((r) => r.guardian)?.guardian,
  };

  const events = [];
  patientRecords.forEach((record) => {
    const history = record.history || [];
    if (history.length > 0) {
      history.forEach((h, i) => events.push(normalizeEntry(h, record, i, history)));
    } else {
      synthesizeFromRecord(record).forEach((e) => events.push({ ...e, recordId: record.id, id: `${record.id}-${e.dateTime}-${e.action}` }));
    }
  });

  events.sort((a, b) => String(b.dateTime).localeCompare(String(a.dateTime), 'th'));
  return { patient, events };
};

export const openConsentHistoryTab = (hn) => {
  if (typeof window === 'undefined' || !hn) return;
  const from = `${window.location.pathname}${window.location.search}`;
  const qs = from && from !== '/' ? `?from=${encodeURIComponent(from)}` : '';
  window.open(
    `${window.location.origin}/consent/history/${encodeURIComponent(hn)}${qs}`,
    '_blank',
    'noopener,noreferrer',
  );
};

/** เปิดแท็บค้นหาประวัติความยินยอม (ชื่อ / HN) แล้วเลือกผู้ป่วยดู timeline */
export const openConsentHistorySearchTab = () => {
  if (typeof window === 'undefined') return;
  const from = `${window.location.pathname}${window.location.search}`;
  const qs = from && from !== '/' ? `?from=${encodeURIComponent(from)}` : '';
  window.open(
    `${window.location.origin}/consent/history${qs}`,
    '_blank',
    'noopener,noreferrer',
  );
};

/** ค้นหาผู้ป่วยจากรายการ consent (unique ตาม HN) — ชื่อหรือ HN */
export const searchConsentPatients = (query, records = getConsentRecords()) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const byHn = new Map();
  records.forEach((r) => {
    if (!r?.hn || byHn.has(r.hn)) return;
    const name = String(r.name || '');
    const hn = String(r.hn);
    if (name.toLowerCase().includes(q) || hn.toLowerCase().includes(q)) {
      byHn.set(r.hn, {
        hn: r.hn,
        name: r.name,
        guardian: r.guardian || null,
        formCount: records.filter((x) => x.hn === r.hn).length,
      });
    }
  });
  return [...byHn.values()].sort((a, b) => String(a.name).localeCompare(String(b.name), 'th'));
};

/* ── เปรียบเทียบให้ / ไม่ให้ความยินยอม (worklist icon → popup) ───────── */

const CONSENTED_LIKE = new Set([
  'ยินยอมแล้ว', 'ใกล้หมดอายุ', 'หมดอายุ', 'หมดอายุ-Reconsent', 'มีเวอร์ชันใหม่',
]);
const DECLINED_LIKE = new Set([
  'ปฏิเสธ', 'ถอนความยินยอม', 'ยกเลิกคำขอ', 'ไม่ยินยอม',
]);
const PENDING_LIKE = new Set(['รอลงนาม', 'อยู่ระหว่างลงนาม', 'ขอเพิกถอน']);

const historyShowsConsent = (history = []) => history.some((h) => (
  h.action === 'ให้ความยินยอม'
  || h.toStatus === 'ยินยอมแล้ว'
  || CONSENTED_LIKE.has(h.toStatus)
  || CONSENTED_LIKE.has(h.fromStatus)
));

const historyShowsDecline = (history = []) => history.some((h) => (
  h.action === 'ไม่ให้ความยินยอม'
  || h.action === 'ถอนความยินยอม'
  || DECLINED_LIKE.has(h.toStatus)
));

const isReconsentSent = (record) => {
  if (record.pendingReconsent) return true;
  if (record.status === 'หมดอายุ-Reconsent') return true;
  if (record.status === 'มีเวอร์ชันใหม่') return true;
  const history = record.history || [];
  if (PENDING_LIKE.has(record.status) && historyShowsConsent(history)) return true;
  /* สร้างคำขอใหม่หลังสถานะหมดอายุ / ใกล้หมด / ปฏิเสธ / ถอน */
  return history.some((h) => (
    h.action === 'สร้างคำขอ'
    && (CONSENTED_LIKE.has(h.fromStatus) || DECLINED_LIKE.has(h.fromStatus) || h.fromStatus === 'มีเวอร์ชันใหม่')
  ));
};

/**
 * จัดกลุ่มแบบฟอร์มของผู้ป่วยตามผลลัพธ์ล่าสุด
 * ซ้าย = ให้ความยินยอม · ขวา = ไม่ให้ความยินยอม
 * ติด badge เมื่อมีการส่งคำขอ Reconsent แล้ว
 *
 * ⚠️ เดิมมี DEMO_DECLINED_FORMS คอยเติมแถวปลอมฝั่ง "ไม่ให้ความยินยอม" เมื่อคนไข้
 * ไม่มีรายการฝั่งนั้นจริง (เพื่อให้ภาพเปรียบเทียบดูครบสองฝั่ง) — ถอดออกแล้ว
 * เพราะทำให้แท็บเปรียบเทียบโชว์แบบฟอร์มที่ไม่มีอยู่ในตาราง "แบบฟอร์มทั้งหมด"
 * และไม่มีใน Timeline ของคนคนนั้น = สามแท็บเล่าคนละเรื่อง
 * ฝั่งที่ว่างต้องปล่อยให้ว่าง (GroupColumn มี emptyLabel รองรับอยู่แล้ว)
 */
const COMPARE_THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/** "17 สิงหาคม 2569" → ms · คืน 0 เมื่อไม่ใช่วันที่ */
const thaiDateMs = (raw) => {
  const s = String(raw || '').trim();
  if (!s || s === '-') return 0;
  const monthIdx = COMPARE_THAI_MONTHS.findIndex((m) => s.includes(m));
  const yearMatch = s.match(/(25\d{2}|20\d{2})/);
  const dayMatch = s.match(/^(\d{1,2})\s/);
  if (monthIdx < 0 || !yearMatch || !dayMatch) return 0;
  let year = Number(yearMatch[1]);
  if (year >= 2400) year -= 543;
  return new Date(year, monthIdx, Number(dayMatch[1])).getTime() || 0;
};

/** ความ "ล่าสุด" ของหนึ่งฉบับ = วันที่ที่ขยับล่าสุดในบรรดา ถอน / ลงนาม / สร้าง */
const recordRecencyKey = (r) => Math.max(
  thaiDateMs(r?.withdrawnDate), thaiDateMs(r?.signedDate), thaiDateMs(r?.createdDate),
);

export const buildConsentCompareGroups = (hn, records = getConsentRecords()) => {
  const patientRecords = records.filter((r) => r.hn === hn);
  if (patientRecords.length === 0) {
    return { patient: null, consented: [], declined: [] };
  }

  const patient = {
    hn,
    name: patientRecords[0].name,
    guardian: patientRecords.find((r) => r.guardian)?.guardian || null,
  };

  /* รวมแถวของแบบฟอร์มเดียวกันไว้ด้วยกัน ใหม่สุดก่อน */
  const byForm = new Map();
  patientRecords.forEach((r) => {
    const key = r.formCode || `${r.type}::${r.formName}`;
    if (!byForm.has(key)) byForm.set(key, []);
    byForm.get(key).push(r);
  });
  /* เรียง "ใหม่สุดก่อน" ด้วยวันที่จริง ไม่ใช่ id — id ของ mock เรียงตามลำดับที่
     ถูกสร้าง ไม่ได้เรียงตามเวลาเกิดเหตุ ถ้าใช้ id การ์ดจะหยิบฉบับที่เก่ากว่ามา
     เป็น "ผลล่าสุด" แล้วขัดกับแถวบนสุดของแบบฟอร์มนั้นในตาราง
     (PH-001: ปฏิเสธ 9 ส.ค. ถูกเลือกทั้งที่มี ยินยอมแล้ว 17 ส.ค. อยู่) */
  byForm.forEach((list) => list.sort(
    (a, b) => recordRecencyKey(b) - recordRecencyKey(a) || Number(b.id) - Number(a.id),
  ));

  const consented = [];
  const declined = [];

  const decisionOf = (r) => {
    const history = r.history || [];
    if (CONSENTED_LIKE.has(r.status) || (PENDING_LIKE.has(r.status) && historyShowsConsent(history))) return 'consented';
    if (DECLINED_LIKE.has(r.status) || (PENDING_LIKE.has(r.status) && historyShowsDecline(history))) return 'declined';
    return null;
  };

  byForm.forEach((list) => {
    /* เดิมหยิบแค่แถวล่าสุดแถวเดียว — ถ้าแถวล่าสุดเป็นคำขอที่ยังไม่มีผล
       (รอลงนาม / ขอเพิกถอน) แบบฟอร์มนั้นจะหายไปจากทั้งสองคอลัมน์ ทั้งที่
       ก่อนหน้านั้นผู้รับบริการเคยตัดสินใจไปแล้ว → ตารางโชว์ "ยินยอมแล้ว 3"
       แต่เปรียบเทียบขึ้น 0 · คำขอใหม่ที่ค้างอยู่ไม่ได้ลบล้างคำตอบครั้งก่อน
       จึงไล่ย้อนหาแถวล่าสุด "ที่มีผลจริง" ของแบบฟอร์มนั้นแทน */
    const decided = list.find((r) => decisionOf(r));
    if (!decided) return; /* แบบฟอร์มที่ขอไปแล้วยังไม่เคยมีคำตอบเลย — ไม่มีอะไรให้เทียบ */

    const latest = list[0];
    const item = {
      id: decided.id,
      formCode: decided.formCode || '-',
      formName: decided.formName || '-',
      type: decided.type,
      version: decided.version,
      status: decided.status,
      signedDate: decided.signedDate,
      createdDate: decided.createdDate,
      /* badge Reconsent ดูจากแถวล่าสุด — คำขอใหม่ที่ค้างอยู่คือ reconsent นั่นเอง */
      reconsentSent: isReconsentSent(latest) || latest !== decided,

      /* ── ข้อมูลที่ทำให้การ์ดนี้เทียบกับตาราง "แบบฟอร์มทั้งหมด" ได้ ──────
         การ์ดจัดกลุ่มด้วย "ผลล่าสุดที่มีผลจริง" ส่วนตารางแสดงทีละฉบับ ถ้าไม่บอก
         ว่าฉบับล่าสุดของแบบฟอร์มนี้สถานะอะไร ผู้ใช้จะเห็น PH-017 อยู่ใต้
         "ให้ความยินยอม" แต่ในตารางขึ้น "ขอเพิกถอน" แล้วอ่านว่าขัดกันเอง */
      recordCount: list.length,
      /* วันที่ที่การตัดสินใจนั้นเกิดผล — ถอน > ลงนาม > สร้างคำขอ */
      decidedDate: [decided.withdrawnDate, decided.signedDate, decided.createdDate]
        .find((d) => d && d !== '-') || '-',
      /* สถานะของฉบับล่าสุดในแบบฟอร์มนี้ (= แถวบนสุดของแบบฟอร์มนี้ในตาราง) */
      currentStatus: latest.status,
      currentVersion: latest.version,
      hasPendingNewer: latest !== decided,
      /* ใช้เรียงการ์ด — ยึดความเคลื่อนไหวล่าสุดของแบบฟอร์มนั้น (ฉบับบนสุด)
         ไม่ใช่วันที่ตัดสินใจ เพื่อให้ลำดับตรงกับแถวบนสุดในตารางแท็บแรก */
      latestKey: recordRecencyKey(latest),
      latestId: Number(latest.id) || 0,
    };
    (decisionOf(decided) === 'consented' ? consented : declined).push(item);
  });

  /* ใหม่สุดขึ้นบน — ชุดเดียวกับตาราง "แบบฟอร์มทั้งหมด" ที่เรียงวันที่ล่าสุดก่อน
     (เดิมเรียงตามชื่อแบบฟอร์ม ทำให้สองแท็บไล่ลำดับคนละแบบ) */
  /* วันชนกันให้ตัดสินด้วย id เหมือนตาราง (`recordRecency … || b.id - a.id`)
     สองแท็บจะได้ลำดับเดียวกันแม้วันเท่ากัน */
  const byRecent = (a, b) => (b.latestKey - a.latestKey) || (b.latestId - a.latestId);
  return {
    patient,
    consented: consented.sort(byRecent),
    declined: declined.sort(byRecent),
  };
};

