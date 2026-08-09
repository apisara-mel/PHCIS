/* PHCIS | EMR §1.4.7.2–§1.4.7.5 + §1.4.3.23 — การเชื่อมต่อระบบภายนอก.

   ⚠ ข้อจำกัดที่ต้องรายงานตามจริง: prototype นี้ไม่มี backend/HL7 engine
   จริง ทุก transport เป็น mock. สิ่งที่ทำได้จริงในเวฟนี้คือ
     • interface monitor (สถานะ · endpoint · sync ล่าสุด · ปุ่มลองใหม่)
     • inbound feed จำลอง + การนำเข้าผลเข้าสู่ visit
     • สถานะ up/down ที่ควบคุมปุ่มปลายทางจริง (เช่น "เปิดภาพใน PACS")
   การรับส่งข้อความตามผนวก ง ต้องทำที่ integration layer จริง. */

import { CURRENT_CLINICIAN, stampNow, appendAudit } from '@/data/treatmentAudit';

export const INTERFACE_STATUSES = [
  { key: 'up',       label: 'เชื่อมต่อปกติ',   badge: 'success' },
  { key: 'degraded', label: 'ตอบสนองช้า',      badge: 'warning' },
  { key: 'down',     label: 'ขาดการเชื่อมต่อ', badge: 'error'   },
];

export const interfaceStatusMeta = (key) =>
  INTERFACE_STATUSES.find((s) => s.key === key) || INTERFACE_STATUSES[0];

const INTERFACES = [
  {
    key: 'lis', label: 'ระบบห้องปฏิบัติการ (LIS)', icon: 'biotech',
    endpoint: 'hl7://lis.bangkok.go.th:2575/ORU', protocol: 'HL7 v2.5.1 (ORU^R01) · ผนวก ง',
    status: 'up', lastSyncAt: '6 พ.ค. 2569 · 10:58', downSince: '', pending: 3,
  },
  {
    key: 'pacs', label: 'ระบบจัดเก็บภาพทางการแพทย์ (PACS)', icon: 'radiology',
    endpoint: 'dicomweb://pacs.bangkok.go.th/wado', protocol: 'DICOMweb (WADO-RS / QIDO-RS)',
    status: 'down', lastSyncAt: '6 พ.ค. 2569 · 08:12', downSince: '6 พ.ค. 2569 · 08:14', pending: 0,
  },
  {
    key: 'device', label: 'อุปกรณ์วัดค่าทางการแพทย์', icon: 'monitor_heart',
    endpoint: 'mqtt://device-gw.local:1883/vitals', protocol: 'MQTT + HL7 ORU (device gateway)',
    status: 'up', lastSyncAt: '6 พ.ค. 2569 · 11:01', downSince: '', pending: 0,
  },
  {
    key: 'telemed', label: 'ระบบปรึกษาทางไกล (Telemedicine)', icon: 'video_camera_front',
    endpoint: 'wss://telemed.bangkok.go.th/session', protocol: 'WebRTC + SIP signalling',
    status: 'degraded', lastSyncAt: '6 พ.ค. 2569 · 10:44', downSince: '', pending: 1,
  },
];

const listeners = new Set();
const emit = () => { listeners.forEach((fn) => fn(getInterfaces())); };

export const subscribeInterfaces = (fn) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

export const getInterfaces = () => INTERFACES.map((i) => ({ ...i }));
export const getInterface = (key) => {
  const found = INTERFACES.find((i) => i.key === key);
  return found ? { ...found } : null;
};

export const isInterfaceUp = (key) => {
  const found = INTERFACES.find((i) => i.key === key);
  return !!found && found.status !== 'down';
};

export const retryInterface = (key) => {
  const found = INTERFACES.find((i) => i.key === key);
  if (!found) return null;
  /* mock: ลองใหม่แล้วกลับมา degraded ก่อน (ไม่แกล้งว่าหายทันที) */
  found.status = found.status === 'down' ? 'degraded' : 'up';
  found.lastSyncAt = stampNow();
  if (found.status !== 'down') found.downSince = '';
  emit();
  appendAudit({
    hn: '', category: 'interface', field: `ลองเชื่อมต่อใหม่ — ${found.label}`,
    oldValue: 'ขาดการเชื่อมต่อ', newValue: interfaceStatusMeta(found.status).label,
  });
  return { ...found };
};

export const setInterfaceStatus = (key, status) => {
  const found = INTERFACES.find((i) => i.key === key);
  if (!found) return null;
  const before = interfaceStatusMeta(found.status).label;
  found.status = status;
  if (status === 'down' && !found.downSince) found.downSince = stampNow();
  if (status !== 'down') found.downSince = '';
  emit();
  appendAudit({
    hn: '', category: 'interface', field: `สถานะการเชื่อมต่อ — ${found.label}`,
    oldValue: before, newValue: interfaceStatusMeta(status).label,
  });
  return { ...found };
};

/* ── (a) LIS inbound results (§1.4.7.3) ──────────────────────── */

export const INBOUND_STATUSES = [
  { key: 'imported', label: 'รับแล้ว',       badge: 'success' },
  { key: 'pending',  label: 'รอตรวจสอบ',     badge: 'warning' },
  { key: 'mismatch', label: 'ไม่ตรงผู้ป่วย', badge: 'error'   },
];

export const inboundStatusMeta = (key) =>
  INBOUND_STATUSES.find((s) => s.key === key) || INBOUND_STATUSES[0];

const INBOUND_RESULTS = [
  {
    id: 'in-1', hn: '67-00001', patientName: 'นายสมชาย มั่นคง',
    testType: 'เคมีคลินิก', testCode: 'BUN-CR', testName: 'BUN / Creatinine',
    result: 'BUN 32 mg/dL (H) · Creatinine 2.4 mg/dL (H)',
    resultedAt: '6 พ.ค. 2569 · 10:41', status: 'pending', critical: true,
    note: 'ค่าวิกฤต — ต้องกดรับทราบก่อนนำเข้า',
  },
  {
    id: 'in-2', hn: '67-00001', patientName: 'นายสมชาย มั่นคง',
    testType: 'โลหิตวิทยา', testCode: 'CBC', testName: 'Complete Blood Count',
    result: 'Hb 11.2 g/dL (L) · WBC 8,400 · Plt 245,000',
    resultedAt: '6 พ.ค. 2569 · 10:22', status: 'imported', critical: false, note: '',
  },
  {
    id: 'in-3', hn: '67-99999', patientName: 'นายสมชาย มั่นดี',
    testType: 'เคมีคลินิก', testCode: 'FBS', testName: 'Fasting Blood Sugar',
    result: 'FBS 118 mg/dL',
    resultedAt: '6 พ.ค. 2569 · 09:58', status: 'mismatch', critical: false,
    note: 'HN ในข้อความไม่ตรงกับใบสั่งตรวจ — ห้าม auto-merge เข้า visit',
  },
  {
    id: 'in-4', hn: '67-00003', patientName: 'นายวีระ ดีงาม',
    testType: 'เคมีคลินิก', testCode: 'HBA1C', testName: 'HbA1c',
    result: 'HbA1c 10.2 % (H)',
    resultedAt: '6 พ.ค. 2569 · 09:31', status: 'pending', critical: false, note: '',
  },
];

/* ── HL7 v2.5.1 ORU^R01 ต้นฉบับของแต่ละข้อความ (§1.4.7.3 / §1.5.2.1) ──
   ผนวก ง กำหนดให้ LIS ส่งผลกลับด้วย ORU^R01. หน้าจอเดิมมีแค่ "กล่องขาเข้า"
   ที่แสดงผลที่ parse แล้ว — ไม่มีทางดูข้อความดิบเพื่อตรวจว่าทำไมบางแถวถึง
   ถูกตีกลับ. ที่เพิ่มคือ raw segment + ตารางฟิลด์ที่ถอดแล้ว วางคู่กัน.

   **ยังไม่มี HL7 parser จริง** — ข้อความดิบด้านล่างเขียนตามรูปแบบผนวก ง
   ไว้ล่วงหน้า และ `parsed` คือผลที่ parser ควรถอดได้ ไม่ได้ถอดสด. */
const HL7_MESSAGES = {
  'in-1': {
    controlId: 'MSG00001',
    raw: [
      'MSH|^~\\&|LIS|BMA-LAB|PHCIS|BMA-CENTER04|20260506104112||ORU^R01|MSG00001|P|2.5.1',
      'PID|1||67-00001^^^PHCIS^MR||มั่นคง^สมชาย||19640312|M|||99/12 ลาดพร้าว 15^^จตุจักร^กรุงเทพมหานคร^10900||081-234-9999',
      'OBR|1|LAB-2569-04412|L24041201|BUN-CR^BUN / Creatinine^L|||20260506094000|||||||||1234^รักษ์ดี^สมหญิง',
      'OBX|1|NM|BUN^Blood Urea Nitrogen^L||32|mg/dL|7-20|H|||F|||20260506104100',
      'OBX|2|NM|CR^Creatinine^L||2.4|mg/dL|0.7-1.3|HH|||F|||20260506104100',
    ],
    parsed: [
      { seg: 'MSH', field: 'MSH-9 ชนิดข้อความ', value: 'ORU^R01 (รายงานผลตรวจ)' },
      { seg: 'MSH', field: 'MSH-7 วันเวลาที่ส่ง', value: '6 พ.ค. 2569 · 10:41:12' },
      { seg: 'MSH', field: 'MSH-10 เลขที่ควบคุมข้อความ', value: 'MSG00001' },
      { seg: 'MSH', field: 'MSH-12 เวอร์ชัน', value: '2.5.1' },
      { seg: 'PID', field: 'PID-3 เลขประจำตัวผู้ป่วย (HN)', value: '67-00001' },
      { seg: 'PID', field: 'PID-5 ชื่อ-นามสกุล', value: 'สมชาย มั่นคง' },
      { seg: 'OBR', field: 'OBR-2 เลขที่ใบสั่งตรวจ', value: 'LAB-2569-04412' },
      { seg: 'OBR', field: 'OBR-4 รายการตรวจ', value: 'BUN-CR — BUN / Creatinine' },
      { seg: 'OBX', field: 'OBX-3 / OBX-5 ผล BUN', value: '32 mg/dL (ค่าปกติ 7–20) — flag H' },
      { seg: 'OBX', field: 'OBX-3 / OBX-5 ผล Creatinine', value: '2.4 mg/dL (ค่าปกติ 0.7–1.3) — flag HH (ค่าวิกฤต)' },
      { seg: 'OBX', field: 'OBX-11 สถานะผล', value: 'F (Final — ผลสมบูรณ์)' },
    ],
  },
  'in-2': {
    controlId: 'MSG00002',
    raw: [
      'MSH|^~\\&|LIS|BMA-LAB|PHCIS|BMA-CENTER04|20260506102210||ORU^R01|MSG00002|P|2.5.1',
      'PID|1||67-00001^^^PHCIS^MR||มั่นคง^สมชาย||19640312|M',
      'OBR|1|LAB-2569-04412|L24041202|CBC^Complete Blood Count^L|||20260506094000',
      'OBX|1|NM|HB^Hemoglobin^L||11.2|g/dL|13-17|L|||F|||20260506102200',
      'OBX|2|NM|WBC^White Blood Cell^L||8400|/uL|4000-10000|N|||F|||20260506102200',
      'OBX|3|NM|PLT^Platelet^L||245000|/uL|150000-400000|N|||F|||20260506102200',
    ],
    parsed: [
      { seg: 'MSH', field: 'MSH-9 ชนิดข้อความ', value: 'ORU^R01 (รายงานผลตรวจ)' },
      { seg: 'MSH', field: 'MSH-10 เลขที่ควบคุมข้อความ', value: 'MSG00002' },
      { seg: 'PID', field: 'PID-3 เลขประจำตัวผู้ป่วย (HN)', value: '67-00001' },
      { seg: 'OBR', field: 'OBR-4 รายการตรวจ', value: 'CBC — Complete Blood Count' },
      { seg: 'OBX', field: 'ผล Hemoglobin', value: '11.2 g/dL (ค่าปกติ 13–17) — flag L' },
      { seg: 'OBX', field: 'ผล WBC', value: '8,400 /uL — ปกติ' },
      { seg: 'OBX', field: 'ผล Platelet', value: '245,000 /uL — ปกติ' },
    ],
  },
  'in-3': {
    controlId: 'MSG00003',
    /* HN ในข้อความไม่ตรงกับใบสั่งตรวจ — ต้องดู segment ได้แต่ห้ามนำเข้า */
    raw: [
      'MSH|^~\\&|LIS|BMA-LAB|PHCIS|BMA-CENTER04|20260506095803||ORU^R01|MSG00003|P|2.5.1',
      'PID|1||67-99999^^^PHCIS^MR||มั่นดี^สมชาย||19640312|M',
      'OBR|1|LAB-2569-04412|L24041203|FBS^Fasting Blood Sugar^L|||20260506080000',
      'OBX|1|NM|FBS^Fasting Blood Sugar^L||118|mg/dL|70-99|H|||F|||20260506095800',
    ],
    parsed: [
      { seg: 'MSH', field: 'MSH-10 เลขที่ควบคุมข้อความ', value: 'MSG00003' },
      { seg: 'PID', field: 'PID-3 เลขประจำตัวผู้ป่วย (HN)', value: '67-99999 ⚠ ไม่ตรงกับ HN ของใบสั่งตรวจ LAB-2569-04412 (67-00001)', mismatch: true },
      { seg: 'PID', field: 'PID-5 ชื่อ-นามสกุล', value: 'สมชาย มั่นดี ⚠ นามสกุลไม่ตรงกับผู้ป่วยในใบสั่ง (มั่นคง)', mismatch: true },
      { seg: 'OBR', field: 'OBR-2 เลขที่ใบสั่งตรวจ', value: 'LAB-2569-04412' },
      { seg: 'OBX', field: 'ผล FBS', value: '118 mg/dL (ค่าปกติ 70–99) — flag H' },
    ],
  },
  'in-4': {
    controlId: 'MSG00004',
    /* ข้อความไม่สมบูรณ์ — segment OBX ขาด field ต้องแสดง raw ได้ ไม่ crash */
    raw: [
      'MSH|^~\\&|LIS|BMA-LAB|PHCIS|BMA-CENTER04|20260506093105||ORU^R01|MSG00004|P|2.5.1',
      'PID|1||67-00003^^^PHCIS^MR||ดีงาม^วีระ||19710820|M',
      'OBR|1|LAB-2569-04120|L24041204|HBA1C^HbA1c^L|||20260506083000',
      'OBX|1|NM|HBA1C^HbA1c^L||10.2|%|',
    ],
    parsed: [
      { seg: 'MSH', field: 'MSH-10 เลขที่ควบคุมข้อความ', value: 'MSG00004' },
      { seg: 'PID', field: 'PID-3 เลขประจำตัวผู้ป่วย (HN)', value: '67-00003' },
      { seg: 'OBR', field: 'OBR-4 รายการตรวจ', value: 'HBA1C — HbA1c' },
      { seg: 'OBX', field: 'ผล HbA1c', value: '10.2 %' },
      { seg: 'OBX', field: 'OBX-7 ค่าอ้างอิง', value: '⚠ ไม่มีค่าในข้อความ (segment ถูกตัดกลางคัน)', malformed: true },
      { seg: 'OBX', field: 'OBX-8 flag การแปลผล', value: '⚠ ไม่มีค่าในข้อความ — ต้องให้ห้องแล็บส่งซ้ำ', malformed: true },
      { seg: 'OBX', field: 'OBX-11 สถานะผล', value: '⚠ ไม่มีค่าในข้อความ', malformed: true },
    ],
  },
};

/* ข้อความ HL7 ของแถวขาเข้าแถวหนึ่ง — คืน null ถ้าไม่มีต้นฉบับเก็บไว้ */
export const hl7MessageFor = (inboundId) => {
  const m = HL7_MESSAGES[inboundId];
  if (!m) return null;
  return {
    ...m,
    raw: [...m.raw],
    parsed: m.parsed.map((p) => ({ ...p })),
    malformed: m.parsed.some((p) => p.malformed),
    hasMismatch: m.parsed.some((p) => p.mismatch),
  };
};

const inboundListeners = new Set();
const emitInbound = () => { inboundListeners.forEach((fn) => fn(getInboundResults())); };

export const subscribeInbound = (fn) => {
  inboundListeners.add(fn);
  return () => { inboundListeners.delete(fn); };
};

export const getInboundResults = () => INBOUND_RESULTS.map((r) => ({ ...r }));

export const importInboundResult = (id) => {
  const row = INBOUND_RESULTS.find((r) => r.id === id);
  if (!row) return { ok: false, message: 'ไม่พบรายการผลตรวจ' };
  if (row.status === 'mismatch') {
    return { ok: false, message: 'ข้อมูลผู้ป่วยไม่ตรงกับใบสั่งตรวจ — ต้องตรวจสอบก่อน ไม่สามารถนำเข้าอัตโนมัติได้' };
  }
  row.status = 'imported';
  row.importedBy = CURRENT_CLINICIAN.name;
  row.importedAt = stampNow();
  emitInbound();
  appendAudit({
    hn: row.hn, category: 'interface', field: `นำเข้าผลแล็บ — ${row.testName}`,
    oldValue: 'รอตรวจสอบ', newValue: `นำเข้าสู่ visit แล้ว (${row.result})`,
  });
  return { ok: true, message: `นำเข้าผล ${row.testName} เข้าสู่ visit เรียบร้อย`, row: { ...row } };
};

export const flagInboundMismatch = (id, reason) => {
  const row = INBOUND_RESULTS.find((r) => r.id === id);
  if (!row) return null;
  row.status = 'mismatch';
  row.note = reason || 'ผู้ใช้ระบุว่าข้อมูลผู้ป่วยไม่ตรง';
  emitInbound();
  appendAudit({
    hn: row.hn, category: 'interface', field: `ตีกลับผลแล็บ — ${row.testName}`,
    oldValue: 'รอตรวจสอบ', newValue: `ไม่ตรงผู้ป่วย — ${row.note}`,
  });
  return { ...row };
};

/* ── (b) การแจ้งเตือนผลแล็บเสร็จ (§1.4.7.2) ──────────────────── */

const NOTIFICATIONS = [
  {
    id: 'ntf-1', hn: '67-00001', patientName: 'นายสมชาย มั่นคง',
    testName: 'BUN / Creatinine', critical: true,
    completedAt: '6 พ.ค. 2569 · 10:41', notifiedAt: '6 พ.ค. 2569 · 10:42',
    recipient: 'พญ.สมหญิง รักษ์ดี', read: false, acknowledgedAt: '',
  },
  {
    id: 'ntf-2', hn: '67-00001', patientName: 'นายสมชาย มั่นคง',
    testName: 'Complete Blood Count', critical: false,
    completedAt: '6 พ.ค. 2569 · 10:22', notifiedAt: '6 พ.ค. 2569 · 10:23',
    recipient: 'พญ.สมหญิง รักษ์ดี', read: true, acknowledgedAt: '6 พ.ค. 2569 · 10:25',
  },
  {
    id: 'ntf-3', hn: '67-00003', patientName: 'นายวีระ ดีงาม',
    testName: 'HbA1c', critical: false,
    completedAt: '6 พ.ค. 2569 · 09:31', notifiedAt: '6 พ.ค. 2569 · 09:32',
    recipient: 'นพ.ปิยะ วัฒนชัย', read: false, acknowledgedAt: '',
  },
];

const notifListeners = new Set();
const emitNotif = () => { notifListeners.forEach((fn) => fn(getLabNotifications())); };

export const subscribeLabNotifications = (fn) => {
  notifListeners.add(fn);
  return () => { notifListeners.delete(fn); };
};

export const getLabNotifications = () => NOTIFICATIONS.map((n) => ({ ...n }));

export const unreadLabNotificationCount = (hn) => NOTIFICATIONS
  .filter((n) => (!hn || n.hn === hn) && !n.read).length;

export const acknowledgeLabNotification = (id) => {
  const row = NOTIFICATIONS.find((n) => n.id === id);
  if (!row) return null;
  row.read = true;
  row.acknowledgedAt = stampNow();
  emitNotif();
  appendAudit({
    hn: row.hn, category: 'interface', field: `รับทราบผลแล็บ — ${row.testName}`,
    oldValue: 'ยังไม่อ่าน', newValue: `รับทราบเมื่อ ${row.acknowledgedAt}`,
  });
  return { ...row };
};

/* การสมัครรับแจ้งเตือนรายบุคคล / รายคลินิก */
const SUBSCRIPTIONS = [
  { id: 'sub-1', scope: 'ผู้ใช้', name: 'พญ.สมหญิง รักษ์ดี',      channel: 'ในระบบ + อีเมล', enabled: true,  criticalOnly: false },
  { id: 'sub-2', scope: 'ผู้ใช้', name: 'นพ.ปิยะ วัฒนชัย',         channel: 'ในระบบ',        enabled: true,  criticalOnly: true  },
  { id: 'sub-3', scope: 'คลินิก', name: 'คลินิกโรคไม่ติดต่อเรื้อรัง', channel: 'ในระบบ',        enabled: false, criticalOnly: false },
  { id: 'sub-4', scope: 'คลินิก', name: 'ห้องตรวจ OPD ทั่วไป',      channel: 'ในระบบ + SMS',   enabled: true,  criticalOnly: false },
];

export const getLabSubscriptions = () => SUBSCRIPTIONS.map((s) => ({ ...s }));

export const toggleLabSubscription = (id, enabled) => {
  const row = SUBSCRIPTIONS.find((s) => s.id === id);
  if (!row) return null;
  row.enabled = enabled;
  appendAudit({
    hn: '', category: 'interface', field: `การแจ้งเตือนผลแล็บ — ${row.name}`,
    oldValue: enabled ? 'ปิด' : 'เปิด', newValue: enabled ? 'เปิด' : 'ปิด',
  });
  return { ...row };
};

/* ── (c) PACS studies (§1.4.7.4) ─────────────────────────────── */

/* `report` = ตัวรายงานผลที่ "ดึงมาแล้ว" — ต้องอ่านได้แม้ PACS ขาดการเชื่อมต่อ
   (ปุ่มเปิดใบรายงานผลจึงทำงานได้เสมอ ต่างจากปุ่มเปิดภาพ).
   `reportedBy` / `reportedAt` ว่าง = ยังไม่มีรังสีแพทย์อ่านผล */
export const PACS_STUDIES = [
  {
    id: 'st-1', accession: 'ACC-2569-00871', hn: '67-00001', examType: 'Chest PA',
    studyDate: '6 พ.ค. 2569 · 09:55', images: 2, status: 'พร้อมดูภาพ',
    reportedBy: 'พญ.ปิยะดา รังสีวัฒน์ (รังสีวิทยา)', reportedAt: '6 พ.ค. 2569 · 11:20',
    report: 'FINDINGS: Lungs are clear. No focal consolidation, pleural effusion or pneumothorax. '
      + 'Cardiac silhouette within normal limits (CTR 0.46). Bony thorax intact.\n'
      + 'IMPRESSION: Normal chest radiograph.\n'
      + 'สรุป: ภาพรังสีทรวงอกปกติ ไม่พบรอยโรคในเนื้อปอด',
  },
  {
    id: 'st-2', accession: 'ACC-2569-00812', hn: '67-00001', examType: 'KUB',
    studyDate: '2 เม.ย. 2569 · 10:31', images: 3, status: 'พร้อมดูภาพ',
    reportedBy: 'นพ.ธนดล ภาพวินิจ (รังสีวิทยา)', reportedAt: '2 เม.ย. 2569 · 13:05',
    report: 'FINDINGS: Bowel gas pattern unremarkable. A 5 mm radiopaque density projecting over '
      + 'the left renal shadow, suspicious for a small renal calculus. No dilated bowel loops.\n'
      + 'IMPRESSION: Suspected small left renal calculus — correlate with ultrasound.\n'
      + 'สรุป: สงสัยนิ่วในไตข้างซ้ายขนาดเล็ก แนะนำตรวจอัลตราซาวด์ยืนยัน',
  },
  {
    id: 'st-3', accession: 'ACC-2569-00644', hn: '67-00003', examType: 'Foot AP/Lateral (Rt)',
    studyDate: '28 เม.ย. 2569 · 14:10', images: 4, status: 'พร้อมดูภาพ',
    reportedBy: 'พญ.ปิยะดา รังสีวัฒน์ (รังสีวิทยา)', reportedAt: '28 เม.ย. 2569 · 16:02',
    report: 'FINDINGS: No acute fracture or dislocation. Soft tissue swelling over the dorsum of '
      + 'the right foot. Mild degenerative change at the first MTP joint.\n'
      + 'IMPRESSION: No acute bony injury; soft tissue swelling.\n'
      + 'สรุป: ไม่พบกระดูกหัก มีบวมของเนื้อเยื่ออ่อนหลังเท้าขวา',
  },
  {
    id: 'st-4', accession: 'ACC-2569-00602', hn: '67-00005', examType: 'Chest PA + Lateral',
    studyDate: '14 มี.ค. 2569 · 08:22', images: 5, status: 'กำลังถ่ายโอน',
    reportedBy: '', reportedAt: '',
    report: '',
  },
];

export const pacsStudiesFor = (hn) => PACS_STUDIES
  .filter((s) => !hn || s.hn === hn)
  .map((s) => ({ ...s }));

/* ── PACS: บันทึกการ query DICOMweb ราย study (§1.4.7.4) ────────
   ผนวก ง กำหนดให้ใช้ DICOMweb (QIDO-RS ค้น study / WADO-RS ดึงภาพ).
   หน้าจอเดิมบอกได้แค่ "เปิดภาพไม่ได้" — ไม่มีทางดูว่า query ที่ยิงไปหน้าตา
   อย่างไรและปลายทางตอบอะไรกลับมา ซึ่งเป็นสิ่งแรกที่ต้องดูเวลา debug.

   **ยังไม่มี DICOMweb client จริง** — log ด้านล่างเป็นรูปแบบที่ควรได้
   ไม่ได้ยิงออกไปจริง. */
const PACS_BASE = 'https://pacs.bangkok.go.th/dicom-web';

export const pacsQueryLogFor = (study) => {
  if (!study) return [];
  const up = isInterfaceUp('pacs');
  return [
    {
      id: `${study.id}-qido`,
      kind: 'QIDO-RS',
      purpose: 'ค้นหา study ของผู้ป่วยรายนี้',
      url: `${PACS_BASE}/studies?PatientID=${encodeURIComponent(study.hn)}&AccessionNumber=${encodeURIComponent(study.accession)}`,
      method: 'GET',
      at: study.studyDate,
      status: up ? '200 OK' : '504 Gateway Timeout',
      ok: up,
      detail: up
        ? `พบ 1 study · ${study.images} ภาพ · Modality ${study.examType}`
        : 'ปลายทางไม่ตอบสนองภายใน 30 วินาที — รายการ study ที่เห็นมาจากแคชครั้งล่าสุด',
    },
    {
      id: `${study.id}-wado`,
      kind: 'WADO-RS',
      purpose: 'ดึงภาพชุดเต็มมาแสดงในโปรแกรมดูภาพ',
      url: `${PACS_BASE}/studies/${study.accession}/series`,
      method: 'GET',
      at: up ? study.studyDate : '—',
      status: up ? '200 OK' : 'ยังไม่ได้เรียก',
      ok: up,
      detail: up
        ? `พร้อมสตรีมภาพ ${study.images} ภาพ`
        : 'ไม่ได้เรียกเพราะ QIDO-RS ล้มเหลวก่อน — ปุ่มเปิดภาพจึงถูกปิดไว้',
    },
    {
      id: `${study.id}-report`,
      kind: 'WADO-RS (SR)',
      purpose: 'ดึงรายงานผลอ่าน (Structured Report)',
      url: `${PACS_BASE}/studies/${study.accession}/metadata`,
      method: 'GET',
      at: study.reportedAt || '—',
      status: study.report ? '200 OK (จากแคช)' : '204 No Content',
      ok: !!study.report,
      detail: study.report
        ? 'รายงานผลถูกดึงมาเก็บไว้แล้ว จึงอ่านได้แม้ PACS ขาดการเชื่อมต่อ'
        : 'ยังไม่มีรายงานผล — รังสีแพทย์ยังไม่อ่านฟิล์ม',
    },
  ];
};

export const openPacsStudy = (study) => {
  if (!isInterfaceUp('pacs')) {
    return { ok: false, message: 'PACS ไม่พร้อมใช้งาน — ไม่สามารถเปิดภาพได้ในขณะนี้' };
  }
  appendAudit({
    hn: study.hn, category: 'interface', field: `เปิดภาพใน PACS — ${study.examType}`,
    oldValue: '—', newValue: `${study.accession} (${study.images} ภาพ)`,
  });
  return { ok: true, message: `เปิดภาพ ${study.accession} ในโปรแกรมดูภาพแล้ว` };
};

/* อ่านใบรายงานผลที่ดึงมาแล้ว — ทำได้เสมอ ไม่ขึ้นกับสถานะ PACS
   (ตรงกับข้อความที่หน้าจอสัญญาไว้ว่า "ยังให้อ่านรายงานผลได้ตามปกติ") */
export const openPacsReport = (study) => {
  if (!study?.report) {
    return {
      ok: false,
      title: `ยังไม่มีใบรายงานผล — ${study?.examType || ''}`,
      message: `${study?.accession || ''} ยังอยู่ระหว่าง${study?.status === 'กำลังถ่ายโอน' ? 'ถ่ายโอนภาพ' : 'การอ่านผลของรังสีแพทย์'} — ใบรายงานผลจะปรากฏที่นี่เมื่อรังสีแพทย์รายงานผลเสร็จ`,
    };
  }
  appendAudit({
    hn: study.hn, category: 'interface', field: `เปิดใบรายงานผล — ${study.examType}`,
    oldValue: '—', newValue: `${study.accession} · รายงานโดย ${study.reportedBy || '—'}`,
  });
  return {
    ok: true,
    title: `ใบรายงานผล — ${study.examType}`,
    message: `${study.accession} · ถ่ายเมื่อ ${study.studyDate}\nรายงานโดย ${study.reportedBy || '—'}${study.reportedAt ? ` (${study.reportedAt})` : ''}\n\n${study.report}`,
  };
};

/* ── (d) อุปกรณ์วัดค่า (§1.4.7.5) ─────────────────────────────── */

const DEVICES = [
  {
    id: 'dev-1', name: 'เครื่องวัดความดันโลหิตอัตโนมัติ', code: 'BP-OPD-01', room: 'ห้องคัดกรอง 1',
    status: 'พร้อมใช้งาน', online: true,
    reading: { bpSys: 148, bpDia: 92, pulse: 84 },
    readingLabel: 'BP 148/92 mmHg · Pulse 84 /min', readAt: '6 พ.ค. 2569 · 09:19',
    targets: ['bpSys', 'bpDia', 'pulse'],
  },
  {
    id: 'dev-2', name: 'เครื่องชั่งน้ำหนัก / วัดส่วนสูง', code: 'WS-OPD-02', room: 'ห้องคัดกรอง 1',
    status: 'พร้อมใช้งาน', online: true,
    reading: { weight: 68.4, height: 168 },
    readingLabel: 'น้ำหนัก 68.4 กก. · ส่วนสูง 168 ซม.', readAt: '6 พ.ค. 2569 · 09:17',
    targets: ['weight', 'height'],
  },
  {
    /* เครื่องนี้ตั้งใจให้ค่าอยู่ "นอกช่วงที่ยอมรับ" (SpO₂ ต่ำกว่า 50 %) เพื่อให้
       สถานะกันค่าผิดของ §1.4.7.5 ทดสอบได้จริงใน UAT — หัววัดหลุดนิ้วจะอ่าน
       ได้ค่าต่ำผิดปกติแบบนี้ ห้ามให้ระบบดึงเข้าสัญญาณชีพอัตโนมัติ */
    id: 'dev-3', name: 'Pulse Oximeter', code: 'SPO2-OPD-04', room: 'ห้องตรวจ 3',
    status: 'พร้อมใช้งาน', online: true,
    reading: { spo2: 47, pulse: 82 },
    readingLabel: 'SpO₂ 47 % · Pulse 82 /min', readAt: '6 พ.ค. 2569 · 09:21',
    targets: ['spo2', 'pulse'],
  },
  {
    id: 'dev-4', name: 'เครื่องตรวจน้ำตาลปลายนิ้ว', code: 'DTX-OPD-07', room: 'ห้องคัดกรอง 2',
    status: 'แบตเตอรี่ต่ำ — ตรวจสอบก่อนใช้', online: false,
    reading: { dtx: 132 },
    readingLabel: 'DTX 132 mg/dL', readAt: '5 พ.ค. 2569 · 16:48',
    targets: ['dtx'],
  },
];

export const getDevices = () => DEVICES.map((d) => ({ ...d, reading: { ...d.reading } }));

/* ── ตารางตั้งค่าการ map ค่าอุปกรณ์ → ฟิลด์สัญญาณชีพ (§1.4.7.5) ──
   ผนวก ง ต้องบอกได้ว่าเครื่องรุ่นไหนส่งค่าอะไร หน่วยอะไร และช่วงค่าที่ระบบ
   ยอมรับก่อนเขียนลงสัญญาณชีพ. ค่าที่อ่านได้นอกช่วงนี้ห้าม auto-fill —
   ต้องให้เจ้าหน้าที่ยืนยันก่อนเสมอ (กันเครื่องเสียแล้วเขียนค่ามั่วทับ). */
export const DEVICE_FIELD_MAPPINGS = [
  { deviceId: 'dev-1', field: 'bpSys',  unit: 'mmHg',  min: 50,  max: 260, hl7Code: 'MDC_PRESS_BLD_NONINV_SYS',  note: 'ความดันซิสโตลิก' },
  { deviceId: 'dev-1', field: 'bpDia',  unit: 'mmHg',  min: 30,  max: 160, hl7Code: 'MDC_PRESS_BLD_NONINV_DIA',  note: 'ความดันไดแอสโตลิก' },
  { deviceId: 'dev-1', field: 'pulse',  unit: '/min',  min: 30,  max: 220, hl7Code: 'MDC_PULS_RATE_NON_INV',     note: 'ชีพจรจากปลอกวัดความดัน' },
  { deviceId: 'dev-2', field: 'weight', unit: 'กก.',   min: 1,   max: 300, hl7Code: 'MDC_MASS_BODY_ACTUAL',      note: 'ชั่งขณะสวมเสื้อผ้าบาง ไม่สวมรองเท้า' },
  { deviceId: 'dev-2', field: 'height', unit: 'ซม.',   min: 30,  max: 230, hl7Code: 'MDC_LEN_BODY_ACTUAL',       note: 'ยืนตรง ส้นเท้าชิดผนัง' },
  { deviceId: 'dev-3', field: 'spo2',   unit: '%',     min: 50,  max: 100, hl7Code: 'MDC_PULS_OXIM_SAT_O2',      note: 'ต้องรอค่านิ่งอย่างน้อย 10 วินาที' },
  { deviceId: 'dev-3', field: 'pulse',  unit: '/min',  min: 30,  max: 220, hl7Code: 'MDC_PULS_OXIM_PULS_RATE',   note: 'ชีพจรจากเครื่องวัดออกซิเจน' },
  { deviceId: 'dev-4', field: 'dtx',    unit: 'mg/dL', min: 20,  max: 600, hl7Code: 'MDC_CONC_GLU_CAPILLARY_WHOLEBLOOD', note: 'เจาะปลายนิ้ว เช็ดหยดแรกทิ้งก่อน' },
];

export const mappingsForDevice = (deviceId) =>
  DEVICE_FIELD_MAPPINGS.filter((m) => m.deviceId === deviceId).map((m) => ({ ...m }));

/* ตรวจว่าค่าที่อ่านได้อยู่ในช่วงที่ยอมรับหรือไม่ — ใช้กันไม่ให้ auto-fill
   ค่าที่ผิดปกติเข้าไปเงียบ ๆ */
export const validateDeviceReading = (device) => {
  const maps = mappingsForDevice(device?.id);
  const reading = device?.reading || {};
  return maps.map((m) => {
    const value = reading[m.field];
    const hasValue = value != null && value !== '';
    const inRange = hasValue && Number(value) >= m.min && Number(value) <= m.max;
    return {
      ...m,
      value: hasValue ? value : null,
      inRange,
      outOfRange: hasValue && !inRange,
      message: !hasValue
        ? 'เครื่องยังไม่ส่งค่าฟิลด์นี้'
        : inRange
          ? 'อยู่ในช่วงที่ยอมรับ'
          : `ค่า ${value} ${m.unit} อยู่นอกช่วงที่ยอมรับ (${m.min}–${m.max} ${m.unit}) — ต้องยืนยันก่อนบันทึก`,
    };
  });
};

/* อุปกรณ์นี้มีค่านอกช่วงหรือไม่ (ใช้ปิดปุ่มดึงค่าอัตโนมัติ) */
export const deviceHasOutOfRange = (device) =>
  validateDeviceReading(device).some((r) => r.outOfRange);

/* ค่าที่ดึงจากอุปกรณ์ต้องติดป้าย source='device' เสมอ.

   §1.4.7.5 — ค่าที่อยู่ "นอกช่วงที่ยอมรับ" ห้ามหลุดเข้าคิวไปเขียนลง
   สัญญาณชีพเงียบ ๆ (เครื่องเสีย/วัดพลาดจะทับค่าจริงของผู้ป่วย) จึงถูกตัด
   ออกจาก patch โดยปริยาย. ผู้เรียกที่ยืนยันรายฟิลด์กับเจ้าหน้าที่แล้วเท่านั้น
   จึงส่ง includeOutOfRange: true เข้ามา และค่าที่ได้จะติดธง needsConfirm
   เพื่อให้ฟอร์มปลายทางถามซ้ำก่อนเขียนเสมอ */
export const buildDeviceVitalPatch = (device, { includeOutOfRange = false } = {}) => {
  const outOfRangeFields = new Set(
    validateDeviceReading(device).filter((r) => r.outOfRange).map((r) => r.field),
  );
  const patch = {};
  Object.entries(device?.reading || {}).forEach(([k, v]) => {
    const bad = outOfRangeFields.has(k);
    if (bad && !includeOutOfRange) return;
    patch[k] = {
      value: v, source: 'device', deviceCode: device.code, readAt: device.readAt,
      ...(bad ? { needsConfirm: true } : {}),
    };
  });
  return patch;
};

/* ป้ายชื่อไทยของช่องสัญญาณชีพ — ใช้บอกใน audit ว่าแตะ "ค่าใด" บ้าง */
export const VITAL_FIELD_LABELS = {
  bpSys: 'ความดันตัวบน', bpDia: 'ความดันตัวล่าง', pulse: 'ชีพจร',
  weight: 'น้ำหนัก', height: 'ส่วนสูง', temp: 'อุณหภูมิ',
  spo2: 'ออกซิเจนปลายนิ้ว', dtx: 'น้ำตาลปลายนิ้ว', rr: 'อัตราการหายใจ',
};

export const vitalFieldLabel = (key) => VITAL_FIELD_LABELS[key] || key;

/* §1.4.7.5 "บันทึกว่าเขียนทับค่าใด" — `fields` คือช่องที่ค่าจากอุปกรณ์
   ครอบคลุม, `overwritten` คือ *เฉพาะ* ช่องที่เดิมมีค่ากรอกมืออยู่จริง
   (source !== 'device'). ห้าม hard-code true: audit ต้องตรงกับสิ่งที่
   เกิดขึ้นจริง ไม่ใช่คำกล่าวอ้าง */
export const logDevicePull = ({ hn, device, fields = [], overwritten = [], applied = true }) => {
  const over = Array.isArray(overwritten) ? overwritten : [];
  const written = fields.length ? fields.map(vitalFieldLabel).join(' · ') : 'ไม่มีช่องปลายทาง';
  appendAudit({
    hn, category: 'interface', field: `ดึงค่าจากอุปกรณ์ — ${device.name} (${device.code})`,
    oldValue: over.length
      ? `ค่าที่กรอกด้วยมือเดิม: ${over.map(vitalFieldLabel).join(' · ')}`
      : '—',
    newValue: `${device.readingLabel} · ${applied ? 'เขียนลงช่อง' : 'จัดคิวรอเขียนลงช่อง'}: ${written} · แหล่งที่มา: อุปกรณ์`,
  });
};

/* คิวค่าจากอุปกรณ์ที่รอให้หน้าบันทึกการรักษาหยิบไปเขียนลงสัญญาณชีพ.
   หน้า /treat/interfaces เป็น monitor ล้วน ไม่มีฟอร์ม vitals ให้เขียน —
   จึงเก็บ patch ไว้ที่นี่แทน แล้วรายงานตามจริงว่า "จัดคิวไว้" */
const PENDING_DEVICE_PATCHES = [];

export const queueDeviceVitalPatch = ({ hn, device, patch }) => {
  const entry = {
    id: `dvp-${Date.now().toString(36)}`,
    hn: hn || '', deviceCode: device.code, deviceName: device.name,
    patch, fields: Object.keys(patch || {}), queuedAt: stampNow(),
  };
  PENDING_DEVICE_PATCHES.unshift(entry);
  return { ...entry };
};

export const getPendingDeviceVitalPatches = (hn) => PENDING_DEVICE_PATCHES
  .filter((p) => !hn || !p.hn || p.hn === hn)
  .map((p) => ({ ...p }));

/* ช่องที่ "จะโดนเขียนทับ" = ช่องที่มีค่าอยู่แล้วและไม่ได้มาจากอุปกรณ์ */
export const overwrittenVitalFields = (patch, currentVitals = {}) =>
  Object.keys(patch || {}).filter((k) => {
    const cur = currentVitals[k];
    if (cur == null || cur === '') return false;
    return typeof cur === 'object' ? cur.source !== 'device' : true;
  });

/* ── (e) Telemedicine (§1.4.3.23) ────────────────────────────── */

export const TELEMED_STATES = [
  { key: 'waiting',  label: 'รอผู้ป่วยเข้าห้อง', badge: 'warning' },
  { key: 'active',   label: 'กำลังสนทนา',        badge: 'success' },
  { key: 'ended',    label: 'จบการสนทนา',        badge: 'neutral' },
  { key: 'noshow',   label: 'ผู้ป่วยไม่เข้าห้อง', badge: 'error'   },
  { key: 'dropped',  label: 'สายหลุด',           badge: 'error'   },
];

export const telemedStateMeta = (key) =>
  TELEMED_STATES.find((s) => s.key === key) || TELEMED_STATES[0];

const TELEMED_SESSIONS = [
  {
    id: 'tm-1', hn: '67-00002', patientName: 'นางสาวสมหญิง มีสุข',
    state: 'ended', startedAt: '6 พ.ค. 2569 · 09:05', endedAt: '6 พ.ค. 2569 · 09:21',
    participants: 'พญ.สมหญิง รักษ์ดี, ผู้รับบริการ, ญาติ (บุตรสาว)',
    recording: true, consentAt: '6 พ.ค. 2569 · 09:04', consentBy: 'ผู้รับบริการยินยอมด้วยวาจา + บันทึกในระบบ',
    noteId: 'note-seed-4',
  },
  {
    id: 'tm-2', hn: '67-00004', patientName: 'นางทักษพร ขำใจ',
    state: 'noshow', startedAt: '5 พ.ค. 2569 · 14:00', endedAt: '5 พ.ค. 2569 · 14:15',
    participants: 'นพ.อนุชา ศรีวิไล',
    recording: false, consentAt: '', consentBy: '',
    noteId: '',
  },
];

const tmListeners = new Set();
const emitTm = () => { tmListeners.forEach((fn) => fn(getTelemedSessions())); };

export const subscribeTelemedSessions = (fn) => {
  tmListeners.add(fn);
  return () => { tmListeners.delete(fn); };
};

export const getTelemedSessions = () => TELEMED_SESSIONS.map((s) => ({ ...s }));

export const startTelemedSession = ({ hn, patientName, recording, consentBy }) => {
  /* ห้ามเปิด session โดยไม่ระบุผู้รับบริการ — audit trail ที่ผูกกับคนผิด
     คือความเสี่ยง wrong-patient แบบเดียวกับที่ mismatch guard ของ LIS กันไว้ */
  if (!hn || !patientName) {
    return { ok: false, message: 'ต้องเลือกผู้รับบริการก่อนเปิดห้องสนทนา' };
  }
  if (recording && !consentBy) {
    return { ok: false, message: 'ต้องได้รับความยินยอมก่อนเริ่มบันทึกเสียง/ภาพ' };
  }
  const row = {
    id: `tm-${Date.now().toString(36)}`,
    hn, patientName, state: 'waiting',
    startedAt: stampNow(), endedAt: '',
    participants: CURRENT_CLINICIAN.name,
    recording: !!recording,
    consentAt: recording ? stampNow() : '',
    consentBy: recording ? consentBy : '',
    noteId: '',
  };
  TELEMED_SESSIONS.unshift(row);
  emitTm();
  appendAudit({
    hn, category: 'interface', field: 'เริ่มการปรึกษาทางไกล',
    oldValue: '—', newValue: `${telemedStateMeta(row.state).label}${recording ? ' · บันทึกภาพ/เสียง (ได้รับความยินยอมแล้ว)' : ''}`,
  });
  return { ok: true, row: { ...row } };
};

export const setTelemedState = (id, state) => {
  const row = TELEMED_SESSIONS.find((s) => s.id === id);
  if (!row) return null;
  const before = telemedStateMeta(row.state).label;
  row.state = state;
  if (state === 'ended' || state === 'noshow' || state === 'dropped') row.endedAt = stampNow();
  emitTm();
  appendAudit({
    hn: row.hn, category: 'interface', field: 'สถานะการปรึกษาทางไกล',
    oldValue: before, newValue: telemedStateMeta(state).label,
  });
  return { ...row };
};

/* ── Telemedicine: บันทึก session + หลักฐานความยินยอม (§1.4.3.23) ──
   TOR ต้องการให้ตรวจสอบย้อนกลับได้ว่า session หนึ่งเกิดอะไรขึ้นบ้าง และ
   ผู้รับบริการยินยอมให้บันทึกภาพ/เสียงจริงหรือไม่ ใครเป็นผู้ให้ความยินยอม.

   **ยังไม่มี WebRTC media server จริง** — ไม่มีไฟล์วิดีโอให้ดาวน์โหลด
   สิ่งที่ export ได้คือ "บันทึกเหตุการณ์ของ session" (log) เท่านั้น. */

/* ไทม์ไลน์เหตุการณ์ของ session — สร้างจากสถานะและเวลาที่บันทึกไว้จริง */
export const telemedSessionLog = (session) => {
  if (!session) return [];
  const log = [
    {
      at: session.startedAt,
      event: 'เปิดห้องสนทนา',
      detail: `ผู้เปิดห้อง ${session.participants || '—'} · ผู้รับบริการ ${session.patientName} (HN ${session.hn})`,
    },
  ];
  if (session.consentAt) {
    log.push({
      at: session.consentAt,
      event: 'บันทึกความยินยอมให้อัดภาพ/เสียง',
      detail: `ผู้ให้ความยินยอม: ${session.consentBy || '—'} · ขอบเขต: บันทึกภาพและเสียงตลอด session เพื่อใช้ประกอบเวชระเบียน`,
    });
  }
  if (session.recording) {
    log.push({
      at: session.consentAt || session.startedAt,
      event: 'เริ่มบันทึกภาพ/เสียง',
      detail: 'เริ่มบันทึกหลังได้รับความยินยอมแล้วเท่านั้น',
    });
  }
  const stateLabel = telemedStateMeta(session.state).label;
  if (session.endedAt) {
    log.push({
      at: session.endedAt,
      event: `สิ้นสุด session — ${stateLabel}`,
      detail: session.state === 'noshow'
        ? 'ผู้รับบริการไม่เข้าห้องสนทนาภายในเวลาที่กำหนด'
        : session.state === 'dropped'
          ? 'สายหลุดระหว่างสนทนา — ต้องนัดใหม่หรือโทรติดตาม'
          : 'จบการสนทนาตามปกติ',
    });
  } else {
    log.push({ at: '—', event: `สถานะปัจจุบัน — ${stateLabel}`, detail: 'session ยังไม่สิ้นสุด' });
  }
  return log;
};

/* หลักฐานความยินยอมของ session (ใช้แสดงในหน้าต่างรายละเอียด) */
export const telemedConsentRecord = (session) => {
  if (!session) return null;
  if (!session.recording) {
    return {
      recorded: false,
      summary: 'session นี้ไม่ได้บันทึกภาพ/เสียง จึงไม่ต้องขอความยินยอมเพื่อการบันทึก',
      consentBy: '', consentAt: '',
    };
  }
  return {
    recorded: true,
    summary: 'ผู้รับบริการให้ความยินยอมให้บันทึกภาพและเสียงระหว่างการปรึกษาทางไกล เพื่อใช้ประกอบเวชระเบียนเท่านั้น',
    consentBy: session.consentBy || '—',
    consentAt: session.consentAt || '—',
    scope: 'บันทึกภาพและเสียงตลอด session · เก็บในเวชระเบียนของผู้รับบริการ · ไม่เผยแพร่ต่อบุคคลภายนอก',
    retention: 'เก็บตามระเบียบเวชระเบียนของสำนักอนามัย',
  };
};

/* ส่งออกบันทึก session เป็นข้อความ (ไม่มีไฟล์วิดีโอให้ดาวน์โหลดจริง) */
export const exportTelemedLog = (session) => {
  if (!session) return { ok: false, message: 'ไม่พบ session' };
  const lines = telemedSessionLog(session)
    .map((e) => `${e.at}\t${e.event}\t${e.detail}`)
    .join('\n');
  const consent = telemedConsentRecord(session);
  const text = [
    `บันทึกการปรึกษาทางไกล (Telemedicine Session Log)`,
    `เลขที่ session: ${session.id}`,
    `ผู้รับบริการ: ${session.patientName} (HN ${session.hn})`,
    `ผู้ให้บริการ: ${session.participants || '—'}`,
    `สถานะ: ${telemedStateMeta(session.state).label}`,
    '',
    'เหตุการณ์:',
    lines,
    '',
    'ความยินยอม:',
    consent.recorded
      ? `${consent.summary}\nผู้ให้ความยินยอม: ${consent.consentBy}\nเมื่อ: ${consent.consentAt}\nขอบเขต: ${consent.scope}`
      : consent.summary,
    '',
    'หมายเหตุ: ระบบต้นแบบยังไม่มี WebRTC media server จริง จึงไม่มีไฟล์ภาพ/เสียงให้ดาวน์โหลด',
  ].join('\n');

  appendAudit({
    hn: session.hn, category: 'interface',
    field: `ส่งออกบันทึก session ปรึกษาทางไกล ${session.id}`,
    oldValue: '—',
    newValue: `ส่งออกโดย ${CURRENT_CLINICIAN.name} เมื่อ ${stampNow()}`,
  });

  return { ok: true, text, message: 'ส่งออกบันทึก session แล้ว (บันทึกการส่งออกลงประวัติการแก้ไขเรียบร้อย)' };
};

export default INTERFACES;
