/* TOR 1.6.2.x "รับนัดหมาย" + 4.2.6.4 — inbox of appointment requests arriving from
   the citizen mobile app (§4.2 /m/book), LINE / โทรศัพท์, the walk-in counter, and
   คำสั่งนัดต่อเนื่อง จากหน้าการรักษา (§1.4.12.1).

   IMPORTANT (integration note): the continuation rows below are SEEDED MOCK orders.
   `src/components/forms/TreatmentSteps.jsx` (Step 6) is a shared component outside
   this module's scope, so the real handoff /treat/record → inbox must be wired by
   the integrator by calling `ingestContinuationRequest()` from the CPOE save path.

   sessionStorage-backed (same pattern as src/data/opdRoomConfig.js) so a page
   reload during a demo does not wipe decisions. React 17 — consumers subscribe
   with useEffect + setTick (never useSyncExternalStore). */

import { APPOINTMENT_PATIENTS } from './appointmentMockData';

const STORAGE_KEY = 'mih:appointment-requests';

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const pad2 = (n) => String(n).padStart(2, '0');

const dayKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const offsetKey = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dayKey(d);
};

const stampMinutesAgo = (mins) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - mins);
  return `${dayKey(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const stampNow = () => stampMinutesAgo(0);

/** คำขอที่ยังไม่ตอบกลับภายในกี่ชั่วโมงถือว่า "เกินกำหนดตอบกลับ". */
export const REQUEST_SLA_HOURS = 24;

export const REQUEST_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  PROPOSED: 'proposed',
  PATIENT_CANCELLED: 'patient_cancelled',
};

export const REQUEST_STATUS_PRESENTATION = {
  [REQUEST_STATUS.PENDING]: { label: 'รอตรวจสอบ', style: 'warning' },
  [REQUEST_STATUS.CONFIRMED]: { label: 'ยืนยันแล้ว', style: 'success' },
  [REQUEST_STATUS.REJECTED]: { label: 'ปฏิเสธ', style: 'error' },
  [REQUEST_STATUS.PROPOSED]: { label: 'เสนอเวลาใหม่', style: 'info' },
  [REQUEST_STATUS.PATIENT_CANCELLED]: { label: 'ผู้รับบริการยกเลิกเอง', style: 'neutral' },
};

const patientOf = (hn) => APPOINTMENT_PATIENTS[hn] || {
  hn,
  patient: 'ไม่พบชื่อในทะเบียน',
  rights: 'ไม่ระบุ',
  avatar: null,
};

/** Seed inbox — Bangkok health-center context, every status + edge case present. */
const buildSeed = () => {
  const mk = ({
    id, channel, hn, clinic, doctor, staffId, date, time, symptom,
    status = REQUEST_STATUS.PENDING, minsAgo = 30, extra = {},
  }) => {
    const p = patientOf(hn);
    return {
      id,
      channel,
      submittedAt: stampMinutesAgo(minsAgo),
      hn: p.hn,
      patient: p.patient,
      patientAvatar: p.avatar,
      rights: p.rights,
      rightsExpiry: extra.rightsExpiry ?? null,
      clinic,
      doctor: doctor ?? null,
      staffId: staffId ?? null,
      requestedDate: date,
      requestedTime: time,
      symptom,
      note: extra.note ?? '',
      purposeCode: extra.purposeCode ?? 'P01',
      status,
      decision: extra.decision ?? null,
      appointmentId: extra.appointmentId ?? null,
      sourceRef: extra.sourceRef ?? null,
      sourceLabel: extra.sourceLabel ?? null,
      history: extra.history ?? [],
    };
  };

  return [
    mk({
      id: 'REQ-2601', channel: 'mobile', hn: '67-00002', clinic: 'คลินิกตรวจโรคทั่วไป',
      doctor: 'นพ. วันชัย อยู่เย็น', staffId: 1, date: offsetKey(3), time: '09:00',
      symptom: 'เวียนศีรษะตอนเช้า ความดันสูงกว่าปกติ 2 สัปดาห์', minsAgo: 25,
      extra: { purposeCode: 'P10', note: 'ขอช่วงเช้าเพราะต้องไปทำงานบ่าย' },
    }),
    mk({
      id: 'REQ-2602', channel: 'mobile', hn: '67-00004', clinic: 'คลินิกโรคเรื้อรัง (NCD)',
      doctor: null, staffId: null, date: offsetKey(2), time: '10:00',
      symptom: 'น้ำตาลปลายนิ้วสูง 210 mg/dL ขอพบแพทย์', minsAgo: 55,
      extra: { purposeCode: 'P09', note: 'ไม่ระบุแพทย์ — แพทย์ท่านใดก็ได้' },
    }),
    mk({
      id: 'REQ-2603', channel: 'line', hn: '67-00005', clinic: 'ทันตกรรม',
      doctor: 'ทพ. สมชาย ใสสวัสดี', staffId: 2, date: offsetKey(1), time: '13:30',
      symptom: 'ปวดฟันกรามล่างขวา เคี้ยวอาหารไม่ได้', minsAgo: 95,
      extra: { purposeCode: 'P15' },
    }),
    mk({
      id: 'REQ-2604', channel: 'phone', hn: '67-00007', clinic: 'คลินิกผู้สูงอายุ',
      doctor: null, staffId: null, date: offsetKey(5), time: '09:30',
      symptom: 'ผู้สูงอายุ 78 ปี ขอนัดตรวจสุขภาพประจำปีและรับยาต่อเนื่อง', minsAgo: 150,
      extra: {
        purposeCode: 'P06',
        rightsExpiry: offsetKey(2),
        note: 'ลูกสาวโทรมาแทน — สิทธิบัตรทองใกล้หมดอายุ',
      },
    }),
    mk({
      id: 'REQ-2605', channel: 'continuation', hn: '67-00001', clinic: 'คลินิกตรวจโรคทั่วไป',
      doctor: 'นพ. วันชัย อยู่เย็น', staffId: 1, date: offsetKey(14), time: '08:15',
      symptom: 'ติดตามผลการรักษาและตรวจซ้ำตามแผน 14 วัน', minsAgo: 210,
      extra: {
        purposeCode: 'P02',
        sourceRef: 'CPOE-2026-08-0417',
        sourceLabel: 'คำสั่งนัดต่อเนื่อง · SOAP/CPOE · /treat/record ขั้นตอนที่ 6',
        note: 'แพทย์สั่งนัดต่อเนื่องทุก 14 วัน จำนวน 4 ครั้ง',
      },
    }),
    mk({
      id: 'REQ-2606', channel: 'continuation', hn: '67-00009', clinic: 'คลินิกอายุรกรรม',
      doctor: 'พญ. อรุณี ชัยมงคล', staffId: 5, date: offsetKey(7), time: '09:30',
      symptom: 'ติดตามผลแลปหลังปรับยา', minsAgo: 240,
      extra: {
        purposeCode: 'P03',
        sourceRef: 'CPOE-2026-08-0402',
        sourceLabel: 'คำสั่งนัดต่อเนื่อง · SOAP/CPOE · /treat/record ขั้นตอนที่ 6',
      },
    }),
    mk({
      id: 'REQ-2607', channel: 'walkin', hn: '67-00011', clinic: 'คลินิกฝากครรภ์ (ANC)',
      doctor: 'พญ. นลินี รุ่งเรือง', staffId: 7, date: offsetKey(9), time: '10:00',
      symptom: 'ฝากครรภ์ครั้งที่ 4 ตามกำหนด', minsAgo: 320,
      extra: { purposeCode: 'P11' },
    }),
    /* เกินกำหนดตอบกลับ (SLA 24 ชม.) — ปุ่มตัดสินใจยังกดได้แต่ติดป้ายเตือน */
    mk({
      id: 'REQ-2591', channel: 'mobile', hn: '67-00012', clinic: 'คลินิกสุขภาพจิต',
      doctor: null, staffId: null, date: offsetKey(4), time: '14:00',
      symptom: 'นอนไม่หลับต่อเนื่อง 3 สัปดาห์ ขอปรึกษาจิตแพทย์', minsAgo: 60 * 30,
      extra: { purposeCode: 'P16' },
    }),
    /* ผู้รับบริการยกเลิกเองจาก mobile → read-only */
    mk({
      id: 'REQ-2588', channel: 'mobile', hn: '67-00013', clinic: 'ทันตกรรม',
      doctor: 'ทพ. สมชาย ใสสวัสดี', staffId: 2, date: offsetKey(6), time: '15:00',
      symptom: 'ขอนัดขูดหินปูน', status: REQUEST_STATUS.PATIENT_CANCELLED, minsAgo: 60 * 20,
      extra: {
        purposeCode: 'P14',
        decision: {
          action: 'patient_cancelled',
          by: 'ผู้รับบริการ (Mobile App)',
          at: stampMinutesAgo(60 * 6),
          reasonLabel: 'ผู้รับบริการยกเลิกคำขอเองผ่านแอปพลิเคชัน',
          note: '',
        },
      },
    }),
    /* ยืนยันแล้ว — มีเลขนัดจริง */
    mk({
      id: 'REQ-2585', channel: 'line', hn: '67-00003', clinic: 'คลินิกตรวจโรคทั่วไป',
      doctor: 'นพ. วันชัย อยู่เย็น', staffId: 1, date: offsetKey(8), time: '08:30',
      symptom: 'ตรวจสุขภาพประจำปี', status: REQUEST_STATUS.CONFIRMED, minsAgo: 60 * 26,
      extra: {
        purposeCode: 'P06',
        appointmentId: 'A-REQ-2585',
        decision: {
          action: 'confirm',
          by: 'จนท.สมพร ทองดี',
          at: stampMinutesAgo(60 * 25),
          reasonLabel: 'ยืนยันตามวัน-เวลาที่ขอ',
          note: 'ไม่พบการชนตารางแพทย์และโควตาคลินิกยังว่าง',
        },
      },
    }),
    /* ปฏิเสธ — มีเหตุผลจาก master */
    mk({
      id: 'REQ-2580', channel: 'phone', hn: '67-00014', clinic: 'คลินิกวัณโรค',
      doctor: null, staffId: null, date: offsetKey(1), time: '11:00',
      symptom: 'ขอนัดตรวจเสมหะ', status: REQUEST_STATUS.REJECTED, minsAgo: 60 * 40,
      extra: {
        purposeCode: 'P18',
        decision: {
          action: 'reject',
          by: 'จนท.วีระ พงษ์พานิช',
          at: stampMinutesAgo(60 * 38),
          reasonCode: 'clinic_closed',
          reasonLabel: 'คลินิกปิดให้บริการในวันที่ขอ',
          note: 'คลินิกวัณโรคเปิดเฉพาะวันอังคารและพฤหัสบดี แนะนำวันถัดไป',
        },
      },
    }),
    /* เสนอเวลาใหม่ */
    mk({
      id: 'REQ-2578', channel: 'mobile', hn: '67-00006', clinic: 'คลินิกอายุรกรรม',
      doctor: 'พญ. อรุณี ชัยมงคล', staffId: 5, date: offsetKey(2), time: '09:00',
      symptom: 'ปวดท้องเรื้อรัง ขอพบแพทย์เฉพาะทาง', status: REQUEST_STATUS.PROPOSED, minsAgo: 60 * 44,
      extra: {
        purposeCode: 'P01',
        decision: {
          action: 'propose',
          by: 'จนท.สมพร ทองดี',
          at: stampMinutesAgo(60 * 43),
          reasonLabel: 'เสนอเวลาใหม่ — ช่วงที่ขอเต็มโควตา',
          note: 'เสนอวันเดียวกันเวลา 11:00 น. รอผู้รับบริการยืนยันในแอป',
          proposedDate: offsetKey(2),
          proposedTime: '11:00',
        },
      },
    }),
  ];
};

let requests = null;

const listeners = new Set();

const notify = () => {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* listener errors must not break the store */ }
  });
};

const persist = () => {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch { /* quota / private mode — keep in-memory copy */ }
};

const load = () => {
  if (requests) return requests;
  if (canUseSessionStorage()) {
    try {
      const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(parsed) && parsed.length) {
        requests = parsed;
        return requests;
      }
    } catch { /* fall through to seed */ }
  }
  requests = buildSeed();
  persist();
  return requests;
};

export const subscribeApptRequests = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** All requests, newest submission first. */
export const getAppointmentRequests = () =>
  load().map((r) => ({ ...r })).sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));

export const getRequestById = (id) => {
  const hit = load().find((r) => r.id === id);
  return hit ? { ...hit } : null;
};

/** True when a pending request has blown the reply SLA. */
export const isRequestOverdue = (req) => {
  if (!req || req.status !== REQUEST_STATUS.PENDING) return false;
  const parsed = Date.parse(String(req.submittedAt).replace(' ', 'T'));
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed > REQUEST_SLA_HOURS * 60 * 60 * 1000;
};

/** Row is locked from any decision (patient withdrew the request). */
export const isRequestReadOnly = (req) =>
  !req || req.status === REQUEST_STATUS.PATIENT_CANCELLED;

export const getRequestCounts = () => {
  const all = load();
  const counts = {
    all: all.length, pending: 0, confirmed: 0, rejected: 0, proposed: 0,
    patient_cancelled: 0, overdue: 0,
  };
  all.forEach((r) => {
    counts[r.status] = (counts[r.status] || 0) + 1;
    if (isRequestOverdue(r)) counts.overdue += 1;
  });
  return counts;
};

const applyDecision = (id, patch) => {
  const all = load();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const prev = all[idx];
  const next = {
    ...prev,
    ...patch,
    history: [
      ...(prev.history || []),
      {
        at: stampNow(),
        from: prev.status,
        to: patch.status ?? prev.status,
        by: patch.decision?.by || 'เจ้าหน้าที่ระบบนัดหมาย',
        note: patch.decision?.note || patch.decision?.reasonLabel || '',
      },
    ],
  };
  requests = all.map((r, i) => (i === idx ? next : r));
  persist();
  notify();
  return { ...next };
};

/** ยืนยันคำขอ → กลายเป็นนัดจริง (คืนค่า row ที่อัปเดตแล้ว). */
export const confirmRequest = (id, {
  actor = 'จนท.สมพร ทองดี',
  appointmentId,
  doctor,
  staffId,
  date,
  time,
  slotRange,
  queueNo,
  note = '',
} = {}) => applyDecision(id, {
  status: REQUEST_STATUS.CONFIRMED,
  appointmentId: appointmentId || null,
  ...(doctor ? { doctor } : {}),
  ...(staffId != null ? { staffId } : {}),
  ...(date ? { requestedDate: date } : {}),
  ...(time ? { requestedTime: time } : {}),
  decision: {
    action: 'confirm',
    by: actor,
    at: stampNow(),
    reasonLabel: 'ยืนยันคำขอนัดหมาย',
    note,
    slotRange: slotRange || '',
    queueNo: queueNo ?? null,
  },
});

/** ปฏิเสธคำขอ — บังคับมีเหตุผลจาก master. */
export const rejectRequest = (id, {
  actor = 'จนท.สมพร ทองดี',
  reasonCode,
  reasonLabel,
  note = '',
} = {}) => applyDecision(id, {
  status: REQUEST_STATUS.REJECTED,
  decision: {
    action: 'reject',
    by: actor,
    at: stampNow(),
    reasonCode: reasonCode || 'other',
    reasonLabel: reasonLabel || 'ไม่ระบุ',
    note,
  },
});

/** เสนอเวลาใหม่ / เลื่อนนัด. */
export const proposeNewSlot = (id, {
  actor = 'จนท.สมพร ทองดี',
  proposedDate,
  proposedTime,
  doctor,
  staffId,
  note = '',
} = {}) => applyDecision(id, {
  status: REQUEST_STATUS.PROPOSED,
  ...(doctor ? { doctor } : {}),
  ...(staffId != null ? { staffId } : {}),
  decision: {
    action: 'propose',
    by: actor,
    at: stampNow(),
    reasonLabel: 'เสนอวัน-เวลาใหม่ให้ผู้รับบริการ',
    note,
    proposedDate: proposedDate || '',
    proposedTime: proposedTime || '',
  },
});

/**
 * Ingest point for §1.4.12.1 นัดต่อเนื่องจากหน้าการรักษา.
 * The integrator calls this from the CPOE/SOAP follow-up save path so the request
 * lands in this inbox without any builder touching TreatmentSteps.jsx.
 */
export const ingestContinuationRequest = ({
  hn,
  clinic = 'คลินิกตรวจโรคทั่วไป',
  doctor = null,
  staffId = null,
  requestedDate,
  requestedTime,
  symptom = '',
  note = '',
  purposeCode = 'P02',
  sourceRef = null,
  sourceLabel = 'คำสั่งนัดต่อเนื่องจากหน้าการรักษา',
} = {}) => {
  const p = patientOf(hn);
  const row = {
    /* ตัวคั่นกันชน — ingest หลายคำสั่งในลูปเดียวจะได้ id ไม่ซ้ำ */
    id: `REQ-C${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    channel: 'continuation',
    submittedAt: stampNow(),
    hn: p.hn,
    patient: p.patient,
    patientAvatar: p.avatar,
    rights: p.rights,
    rightsExpiry: null,
    clinic,
    doctor,
    staffId,
    requestedDate,
    requestedTime,
    symptom,
    note,
    purposeCode,
    status: REQUEST_STATUS.PENDING,
    decision: null,
    appointmentId: null,
    sourceRef,
    sourceLabel,
    history: [],
  };
  requests = [row, ...load()];
  persist();
  notify();
  return { ...row };
};

/** Demo helper — restore the seeded inbox (used by the "คืนค่าตัวอย่าง" action). */
export const resetAppointmentRequests = () => {
  requests = buildSeed();
  persist();
  notify();
};
