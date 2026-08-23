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

/** ผลที่ "ออกแล้ว" เท่านั้นจึงเข้า To-Do — ระหว่างทางไม่ต้องรบกวนแพทย์ */
const labIsReady = (o) => LAB_STATUS_BY_KEY[o.status]?.terminalForDoctor;
const xrayIsReady = (o) => XRAY_STATUS_BY_KEY[o.status]?.terminalForDoctor;

const severityRank = (row) => (row.critical ? 2 : row.abnormal ? 1 : 0);

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
export const getResultsInbox = (doctor, { includeAcknowledged = false } = {}) => {
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
        href: '/xray/worklist',
      };
    });

  return [...labRows, ...xrayRows]
    .filter((r) => (includeAcknowledged ? true : !r.ack))
    /* วิกฤตก่อน → ผิดปกติ → ปกติ; ในระดับเดียวกันเรียงตามเวลาที่รายงาน */
    .sort((a, b) => severityRank(b) - severityRank(a)
      || String(b.reportedAt).localeCompare(String(a.reportedAt)));
};

/** จำนวนที่ยังไม่รับทราบ — ใช้ติด badge บนแท็บ/การ์ดสรุป */
export const countPendingResults = (doctor) => getResultsInbox(doctor).length;
