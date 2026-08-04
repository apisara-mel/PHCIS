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
