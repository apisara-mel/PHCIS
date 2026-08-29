/* ═══ To-Do List ผลตรวจของแพทย์ (มติ คทง.1 ครั้งที่ 3) ═══════════════════
   ช่องว่างที่ที่ประชุมชี้: แพทย์สั่ง Lab / X-ray แล้วผลกลับมาทีหลัง ผู้ป่วย
   กลับบ้านไปแล้ว — ไม่มีที่ไหนในระบบบอกว่า "ผลของคนไข้ที่คุณสั่งออกแล้ว
   และยังไม่มีใครดู" ผลผิดปกติจึงค้างโดยไม่มีคนตาม

   โมดูลนี้จึงรวมผลที่ **ออกแล้ว (terminalForDoctor)** จากทั้ง Lab และ X-ray
   มาเป็นรายการเดียวต่อแพทย์ผู้สั่ง พร้อมสถานะ "รับทราบผล" ที่ประทับชื่อ
   ผู้รับทราบ + เวลา (ไม่ใช่แค่ mark as read เงียบ ๆ) และเรียงให้ผลวิกฤต /
   ผิดปกติ ขึ้นก่อนเสมอ

   ไม่มี engine ใหม่: อ่านจาก LAB_ORDERS / XRAY_ORDERS ที่มีอยู่แล้ว
   ไม่ทำสำเนา — เปลี่ยนสถานะที่ไหนรายการนี้ก็เปลี่ยนตาม                */

import { LAB_ORDERS, LAB_STATUS_BY_KEY, withTestLabel } from '@/data/labOrders';
import { XRAY_ORDERS, XRAY_STATUS_BY_KEY, withExamLabel } from '@/data/xrayOrders';

const ACK_KEY = 'mih:results-inbox-ack';

const readJson = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
};
const writeJson = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) { /* quota / private mode — best-effort like the other mocks */ }
};

const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());
export const subscribeResultsInbox = (fn) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

const nowStamp = () => {
  const d = new Date();
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543} · ${hh}:${mm}`;
};

/* สถานะของผลตรวจในมุมของคลินิกผู้สั่ง (มติผู้ใช้ 29 ส.ค. 69) — คนละชุดกับ
   สถานะภายในห้องแล็บ (รอเก็บ · กำลังตรวจ · รอรับรองผล) ซึ่งเป็นงานของห้องแล็บ
   คลินิกต้นทางสนใจแค่สามอย่าง: ยังไม่ได้ผล · ผลส่งมาแล้ว · เปิดอ่านแล้ว */
export const RESULT_STATUSES = [
  { key: 'pending',  label: 'รอผล',      tone: 'grey' },
  { key: 'reported', label: 'ส่งผลแล้ว', tone: 'blue' },
  { key: 'received', label: 'รับผลแล้ว', tone: 'teal' },
];
export const RESULT_STATUS_BY_KEY = Object.fromEntries(
  RESULT_STATUSES.map((s2) => [s2.key, s2]),
);

/** ผลที่ "ออกแล้ว" เท่านั้นจึงเข้า To-Do — ระหว่างทางไม่ต้องรบกวนแพทย์ */
const labIsReady = (o) => LAB_STATUS_BY_KEY[o.status]?.terminalForDoctor;
const xrayIsReady = (o) => XRAY_STATUS_BY_KEY[o.status]?.terminalForDoctor;

const severityRank = (row) => (row.critical ? 2 : row.abnormal ? 1 : 0);

/* ผลที่ออกก่อนเวลานี้ถือว่าคลินิกรับเข้าระบบไปแล้ว — การ "รับผล" เป็นงาน
   อัตโนมัติของอินเทอร์เฟซห้องแล็บ ไม่ใช่ปุ่มที่คนต้องกด (มติผู้ใช้ 29 ส.ค. 69)
   ผลที่เพิ่งออกจึงยังเป็น "ส่งผลแล้ว" อยู่ครู่หนึ่งก่อนเปลี่ยนเป็น "รับผลแล้ว" */
const AUTO_RECEIVE_BEFORE_HOUR = 9;

const reportedHour = (at) => {
  const m = String(at ?? '').match(/(\d{1,2}):(\d{2})\s*$/);
  return m ? Number(m[1]) : null;
};

/** สถานะของผลในมุมคลินิก: รับทราบเองแล้ว > รับเข้าระบบอัตโนมัติ > เพิ่งส่งมา */
const resolveResultStatus = (ack, reportedAt) => {
  if (ack) return 'received';
  const h = reportedHour(reportedAt);
  return h != null && h < AUTO_RECEIVE_BEFORE_HOUR ? 'received' : 'reported';
};

export const getResultAck = (key) => readJson(ACK_KEY, {})[key] || null;

/** รับทราบผล — ประทับผู้รับทราบ + เวลา (audit ไม่ใช่แค่ซ่อนแถว) */
export const acknowledgeResult = (key, { by } = {}) => {
  if (!key) return null;
  const store = readJson(ACK_KEY, {});
  store[key] = { by: by || 'ผู้ใช้ปัจจุบัน', at: nowStamp() };
  writeJson(ACK_KEY, store);
  emit();
  return store[key];
};

export const unacknowledgeResult = (key) => {
  const store = readJson(ACK_KEY, {});
  delete store[key];
  writeJson(ACK_KEY, store);
  emit();
};

/**
 * รายการผลตรวจของแพทย์คนหนึ่ง
 * @param {string} doctor ชื่อแพทย์ผู้สั่ง — เว้นว่าง = ทุกคน (ใช้ตอนหัวหน้าตรวจงาน)
 * @param {{ includeAcknowledged?: boolean }} opts
 */
export const getResultsInbox = (
  doctor,
  /* includePending = รวมคำสั่งที่ห้องแล็บยังไม่รายงานผล เพื่อให้ตารางของคลินิก
     เห็นครบทั้งวงจร (รอผล → ส่งผลแล้ว → รับผลแล้ว) · To-Do ของแพทย์ยังใช้
     ค่าเริ่มต้นเดิมซึ่งเห็นเฉพาะผลที่ออกแล้ว จะได้ไม่ถูกรบกวนระหว่างทาง */
  { includeAcknowledged = false, includePending = false } = {},
) => {
  const acks = readJson(ACK_KEY, {});

  const labRows = LAB_ORDERS
    .filter(labIsReady)
    .filter((o) => !doctor || o.doctor === doctor)
    .map((o) => {
      const labelled = withTestLabel(o);
      const key = `lab:${o.id}`;
      return {
        key,
        kind: 'lab',
        kindLabel: 'Lab',
        id: o.id,
        hn: o.patient?.hn || o.hn,
        /* PATIENT_PROFILES ใช้ fullName/shortName ไม่มี field `name` */
        patientName: o.patient?.fullName || o.patient?.shortName || '—',
        doctor: o.doctor,
        itemLabel: labelled.testLabel || o.testId,
        resultSummary: o.resultSummary || '—',
        critical: !!o.critical,
        abnormal: !!o.abnormal,
        reportedAt: o.reportedAt || o.orderedAt || '—',
        ack: acks[key] || null,
        resultStatus: resolveResultStatus(acks[key], o.reportedAt || o.orderedAt),
        href: '/lab/worklist',
      };
    });

  /* ฝั่ง X-ray ใช้ชื่อ field คนละชุดกับ Lab: แพทย์ผู้สั่งคือ `orderedBy`
     และความผิดปกติอยู่ใน `resultType` (ไม่ใช่ boolean critical/abnormal)
     — ถ้า map ตรง ๆ แบบ Lab จะได้ตารางว่างและไม่มีป้ายวิกฤตเลย */
  const xrayRows = XRAY_ORDERS
    .filter(xrayIsReady)
    .filter((o) => !doctor || (o.orderedBy || o.doctor) === doctor)
    .map((o) => {
      const labelled = withExamLabel(o);
      const key = `xray:${o.id}`;
      return {
        key,
        kind: 'xray',
        kindLabel: 'X-ray',
        id: o.id,
        hn: o.patient?.hn || o.hn,
        patientName: o.patient?.fullName || o.patient?.shortName || '—',
        doctor: o.orderedBy || o.doctor,
        itemLabel: labelled.examLabel || o.examId,
        resultSummary: o.impression || o.resultSummary || '—',
        critical: o.resultType === 'abnormalUrgent',
        abnormal: o.resultType === 'abnormal' || o.resultType === 'inconclusive',
        reportedAt: o.verifiedAt || o.reportedAt || o.orderedAt || '—',
        ack: acks[key] || null,
        resultStatus: resolveResultStatus(acks[key], o.verifiedAt || o.reportedAt || o.orderedAt),
        href: '/xray/worklist',
      };
    });

  /* คำสั่งที่ยังไม่ได้ผล — สรุปผลยังว่าง เวลารายงานผลยังไม่มี จึงแสดงเป็น "รอผล" */
  const pendingRows = !includePending ? [] : [
    ...LAB_ORDERS
      .filter((o) => !labIsReady(o))
      .filter((o) => !doctor || o.doctor === doctor)
      .map((o) => {
        const labelled = withTestLabel(o);
        return {
          key: `lab:${o.id}`, kind: 'lab', kindLabel: 'Lab', id: o.id,
          hn: o.patient?.hn || o.hn,
          patientName: o.patient?.fullName || o.patient?.shortName || '—',
          doctor: o.doctor,
          itemLabel: labelled.testLabel || o.testId,
          resultSummary: LAB_STATUS_BY_KEY[o.status]?.label || '—',
          critical: false, abnormal: false,
          reportedAt: '—',
          ack: null, resultStatus: 'pending',
          href: '/lab/worklist',
        };
      }),
    ...XRAY_ORDERS
      .filter((o) => !xrayIsReady(o))
      .filter((o) => !doctor || (o.orderedBy || o.doctor) === doctor)
      .map((o) => {
        const labelled = withExamLabel(o);
        return {
          key: `xray:${o.id}`, kind: 'xray', kindLabel: 'X-ray', id: o.id,
          hn: o.patient?.hn || o.hn,
          patientName: o.patient?.fullName || o.patient?.shortName || '—',
          doctor: o.orderedBy || o.doctor,
          itemLabel: labelled.examLabel || o.examId,
          resultSummary: XRAY_STATUS_BY_KEY[o.status]?.label || '—',
          critical: false, abnormal: false,
          reportedAt: '—',
          ack: null, resultStatus: 'pending',
          href: '/xray/worklist',
        };
      }),
  ];

  return [...labRows, ...xrayRows, ...pendingRows]
    .filter((r) => (includeAcknowledged ? true : !r.ack))
    /* วิกฤตก่อน → ผิดปกติ → ปกติ; ในระดับเดียวกันเรียงตามเวลาที่รายงาน */
    .sort((a, b) => severityRank(b) - severityRank(a)
      || String(b.reportedAt).localeCompare(String(a.reportedAt)));
};

/** จำนวนที่ยังไม่รับทราบ — ใช้ติด badge บนแท็บ/การ์ดสรุป */
export const countPendingResults = (doctor) => getResultsInbox(doctor).length;
