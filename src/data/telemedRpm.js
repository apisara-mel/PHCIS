/* RPM — ตรวจผู้รับบริการระยะไกล (TOR §1.13.1 / §1.13.6).
   รับค่าจากอุปกรณ์วัดที่บ้าน แล้วเฝ้าระวังตาม "เกณฑ์ส่ง Telemedicine"
   ในคู่มือ (~/MIH-Docs-Vault/คู่มือ Telemed/ตัวอย่างคู่มือ Telamed.pdf):

     · HbA1c  > 8 %
     · BP     > 160/90 ติดกัน 2 ครั้ง
     · DTX    < 80  mg/dL ติดกัน 2 ครั้ง
     · DTX    > 180 mg/dL ติดกัน 3 ครั้ง

   ค่าจากอุปกรณ์ (device) ต้องแยกจากค่าที่ผู้ป่วยกรอกเอง (self) และค่าที่
   เจ้าหน้าที่บันทึกแทน (staff) — self-reported ห้ามทับค่าที่มาจากอุปกรณ์. */

import { todayAt } from '@/data/telemedVisits';

/* ── แหล่งที่มาของค่า ────────────────────────────────────────────────── */
export const RPM_SOURCE = {
  device: { label: 'อุปกรณ์ที่บ้าน',   tone: 'teal',   icon: 'bluetooth_connected', trust: 'high' },
  self:   { label: 'ผู้ป่วยส่งเอง',     tone: 'orange', icon: 'smartphone',          trust: 'self-reported' },
  staff:  { label: 'จนท.บันทึกแทน',    tone: 'blue',   icon: 'stethoscope',         trust: 'staff' },
};

/* ── ชนิดอุปกรณ์ ─────────────────────────────────────────────────────── */
export const RPM_DEVICE_TYPES = [
  { key: 'bp',     label: 'เครื่องวัดความดันโลหิต', icon: 'blood_pressure', unit: 'mmHg' },
  { key: 'dtx',    label: 'เครื่องเจาะน้ำตาลปลายนิ้ว (DTX)', icon: 'glucose', unit: 'mg/dL' },
  { key: 'temp',   label: 'ปรอทวัดไข้ดิจิทัล', icon: 'thermostat', unit: '°C' },
  { key: 'o2sat',  label: 'Pulse oximeter', icon: 'spo2', unit: '%' },
  { key: 'weight', label: 'ตาชั่งน้ำหนัก', icon: 'monitor_weight', unit: 'กก.' },
];

export const RPM_PARAM_META = {
  bpSys:  { label: 'ความดันตัวบน (SBP)', unit: 'mmHg', min: 50,  max: 260 },
  bpDia:  { label: 'ความดันตัวล่าง (DBP)', unit: 'mmHg', min: 30,  max: 160 },
  dtx:    { label: 'น้ำตาลปลายนิ้ว (DTX)', unit: 'mg/dL', min: 20,  max: 600 },
  temp:   { label: 'อุณหภูมิ', unit: '°C', min: 32, max: 43 },
  o2sat:  { label: 'ออกซิเจนปลายนิ้ว (O₂Sat)', unit: '%', min: 50, max: 100 },
  pulse:  { label: 'ชีพจร (PR)', unit: '/นาที', min: 30, max: 220 },
  weight: { label: 'น้ำหนัก', unit: 'กก.', min: 20, max: 250 },
  hba1c:  { label: 'HbA1c', unit: '%', min: 3, max: 20 },
};

/** ก่อน/หลังอาหาร — คู่มือ "บันทึกซักประวัติ" ระบุสถานะนี้คู่กับ DTX เสมอ */
export const DTX_MEAL_STATE = [
  { value: 'fasting', label: 'ก่อนอาหาร (FBS)' },
  { value: 'post',    label: 'หลังอาหาร 2 ชม.' },
  { value: 'random',  label: 'สุ่ม (Random)' },
];

/* ── เกณฑ์เฝ้าระวังตามคู่มือ (ปรับได้รายผู้รับบริการ) ────────────────── */
export const RPM_DEFAULT_THRESHOLDS = {
  hba1cHigh:      { value: 8,   streak: 1, label: 'HbA1c > 8 %' },
  bpHighSys:      { value: 160, streak: 2, label: 'BP > 160/90 ติดกัน 2 ครั้ง' },
  bpHighDia:      { value: 90,  streak: 2, label: 'BP > 160/90 ติดกัน 2 ครั้ง' },
  dtxLow:         { value: 80,  streak: 2, label: 'DTX < 80 ติดกัน 2 ครั้ง' },
  dtxHigh:        { value: 180, streak: 3, label: 'DTX > 180 ติดกัน 3 ครั้ง' },
  noReadingDays:  { value: 3,   streak: 1, label: 'ไม่ส่งค่าเกิน 3 วัน' },
};

const daysAgoAt = (days, h, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

/* ── ผู้รับบริการที่ติดตามผ่าน RPM ───────────────────────────────────── */
const SEED_PATIENTS = [
  {
    id: 'RPM-001', hn: '67-00007', name: 'นางบุญมา ทองดี', age: 68, sex: 'หญิง',
    originUnit: 'ศบส.41 คลองเตย (ชุมชนล็อค 1-2-3)', doctor: 'พญ.สมหญิง รักษาดี',
    program: 'HT ควบคุมไม่ได้', phone: '086-773-4412',
    homeLocation: { lat: 13.7180, lng: 100.5820, label: 'ชุมชนล็อค 1-2-3 คลองเตย กรุงเทพมหานคร 10110' },
    thresholds: { ...RPM_DEFAULT_THRESHOLDS },
    devices: [
      { type: 'bp', model: 'Omron HEM-7121', serial: 'OM-77120A', battery: 62, lastSync: todayAt(7, 20), online: true },
      { type: 'o2sat', model: 'Beurer PO-30', serial: 'BR-3092', battery: 41, lastSync: daysAgoAt(1, 7, 15), online: true },
    ],
    hba1c: { value: 7.4, at: daysAgoAt(21, 9, 0) },
  },
  {
    id: 'RPM-002', hn: '67-00009', name: 'นายวิเชียร มั่นคง', age: 61, sex: 'ชาย',
    originUnit: 'ศบส.21 วัดธาตุทอง (หน่วยเคลื่อนที่)', doctor: 'นพ.ธนกร ใจดี',
    program: 'DM ควบคุมไม่ได้ (HbA1c > 8)', phone: '090-889-2311',
    homeLocation: { lat: 13.7350, lng: 100.5860, label: 'ซอยสุขุมวิท 51 คลองตันเหนือ วัฒนา กรุงเทพมหานคร 10110' },
    thresholds: { ...RPM_DEFAULT_THRESHOLDS },
    devices: [
      { type: 'dtx', model: 'Accu-Chek Guide', serial: 'AC-55118', battery: 88, lastSync: todayAt(6, 45), online: true },
      { type: 'weight', model: 'Xiaomi Body Scale 2', serial: 'XM-2210', battery: 73, lastSync: todayAt(6, 50), online: true },
    ],
    hba1c: { value: 9.2, at: daysAgoAt(10, 9, 30) },
  },
  {
    id: 'RPM-003', hn: '67-00011', name: 'นายประเสริฐ วัฒนกุล', age: 57, sex: 'ชาย',
    originUnit: 'รพ.สต. คลองสามวา', doctor: 'นพ.ปรัชญา อินทรวิเชียร',
    program: 'DM เสี่ยงน้ำตาลต่ำ', phone: '',
    homeLocation: { lat: 13.8620, lng: 100.7180, label: 'หมู่ 4 ต.สามวาตะวันตก คลองสามวา กรุงเทพมหานคร 10510' },
    thresholds: { ...RPM_DEFAULT_THRESHOLDS, dtxLow: { value: 85, streak: 2, label: 'DTX < 85 ติดกัน 2 ครั้ง (ปรับเฉพาะราย)' } },
    devices: [
      { type: 'dtx', model: 'OneTouch Verio', serial: 'OT-33471', battery: 24, lastSync: todayAt(6, 10), online: true },
    ],
    hba1c: { value: 6.8, at: daysAgoAt(35, 8, 45) },
  },
  {
    id: 'RPM-004', hn: '67-00013', name: 'นางมาลี ศรีวิไล', age: 73, sex: 'หญิง',
    originUnit: 'ศบส.4 ดินแดง (หน่วยชุมชน)', doctor: 'พญ.สมหญิง รักษาดี',
    program: 'ผู้สูงอายุติดบ้าน (Home ward)', phone: '081-990-0022',
    homeLocation: { lat: 13.7690, lng: 100.5540, label: 'แฟลตดินแดง อาคาร 12 ดินแดง กรุงเทพมหานคร 10400' },
    thresholds: { ...RPM_DEFAULT_THRESHOLDS },
    devices: [
      { type: 'bp', model: 'Yuwell YE-680A', serial: 'YW-68012', battery: 9, lastSync: daysAgoAt(5, 8, 30), online: false },
      { type: 'temp', model: 'Microlife MT-500', serial: 'ML-5002', battery: 55, lastSync: daysAgoAt(5, 8, 32), online: false },
    ],
    hba1c: null,
  },
  {
    id: 'RPM-005', hn: '67-00001', name: 'นายสมชาย มีสุข', age: 42, sex: 'ชาย',
    originUnit: 'รพ.สต. บางบัวทอง 2', doctor: 'พญ.สมหญิง รักษาดี',
    program: 'DM + HT คุมได้ดี', phone: '081-234-5678',
    homeLocation: { lat: 13.6890, lng: 100.6020, label: '124/64 พงษ์เวชอนุสรณ์ 2 บางจาก พระโขนง กรุงเทพมหานคร 10260' },
    thresholds: { ...RPM_DEFAULT_THRESHOLDS },
    devices: [
      { type: 'bp', model: 'Omron HEM-7156', serial: 'OM-71562', battery: 91, lastSync: todayAt(7, 5), online: true },
      { type: 'dtx', model: 'Accu-Chek Instant', serial: 'AC-90211', battery: 67, lastSync: todayAt(7, 6), online: true },
    ],
    hba1c: { value: 6.4, at: daysAgoAt(28, 9, 15) },
  },
];

/* ── ค่าที่วัดได้ (readings) ─────────────────────────────────────────── */
const SEED_READINGS = [
  /* RPM-001 — BP สูงติดกัน 2 ครั้ง → เข้าเกณฑ์วิกฤต */
  { id: 'R-1006', patientId: 'RPM-001', at: todayAt(7, 20),        source: 'device', bpSys: 172, bpDia: 98,  pulse: 88 },
  { id: 'R-1005', patientId: 'RPM-001', at: daysAgoAt(1, 7, 10),   source: 'device', bpSys: 166, bpDia: 94,  pulse: 84 },
  { id: 'R-1004', patientId: 'RPM-001', at: daysAgoAt(2, 7, 15),   source: 'device', bpSys: 152, bpDia: 88,  pulse: 80 },
  { id: 'R-1003', patientId: 'RPM-001', at: daysAgoAt(3, 7, 5),    source: 'self',   bpSys: 148, bpDia: 86,  pulse: 78 },
  { id: 'R-1002', patientId: 'RPM-001', at: daysAgoAt(5, 7, 25),   source: 'device', bpSys: 158, bpDia: 92,  pulse: 82 },
  { id: 'R-1001', patientId: 'RPM-001', at: daysAgoAt(6, 7, 12),   source: 'device', bpSys: 144, bpDia: 84,  pulse: 76 },

  /* RPM-002 — DTX สูงติดกัน 3 ครั้ง + HbA1c 9.2 */
  { id: 'R-2006', patientId: 'RPM-002', at: todayAt(6, 45),        source: 'device', dtx: 232, meal: 'post' },
  { id: 'R-2005', patientId: 'RPM-002', at: daysAgoAt(1, 6, 50),   source: 'device', dtx: 208, meal: 'post' },
  { id: 'R-2004', patientId: 'RPM-002', at: daysAgoAt(2, 6, 40),   source: 'device', dtx: 194, meal: 'post' },
  { id: 'R-2003', patientId: 'RPM-002', at: daysAgoAt(3, 6, 55),   source: 'self',   dtx: 176, meal: 'fasting' },
  { id: 'R-2002', patientId: 'RPM-002', at: daysAgoAt(4, 6, 35),   source: 'device', dtx: 168, meal: 'fasting' },
  { id: 'R-2001', patientId: 'RPM-002', at: daysAgoAt(6, 6, 30),   source: 'device', dtx: 158, meal: 'fasting', weight: 82.4 },

  /* RPM-003 — DTX ต่ำติดกัน 2 ครั้ง (แบตอุปกรณ์ต่ำด้วย) */
  { id: 'R-3005', patientId: 'RPM-003', at: todayAt(6, 10),        source: 'device', dtx: 62, meal: 'fasting' },
  { id: 'R-3004', patientId: 'RPM-003', at: daysAgoAt(1, 6, 20),   source: 'device', dtx: 71, meal: 'fasting' },
  { id: 'R-3003', patientId: 'RPM-003', at: daysAgoAt(2, 6, 15),   source: 'device', dtx: 96, meal: 'fasting' },
  { id: 'R-3002', patientId: 'RPM-003', at: daysAgoAt(3, 6, 25),   source: 'staff',  dtx: 104, meal: 'fasting', note: 'อสม. เจาะให้ที่บ้าน' },
  { id: 'R-3001', patientId: 'RPM-003', at: daysAgoAt(5, 6, 18),   source: 'device', dtx: 112, meal: 'fasting' },

  /* RPM-004 — ไม่ส่งค่ามา 5 วัน + อุปกรณ์ออฟไลน์ */
  { id: 'R-4003', patientId: 'RPM-004', at: daysAgoAt(5, 8, 30),   source: 'device', bpSys: 138, bpDia: 82, pulse: 72, temp: 36.6 },
  { id: 'R-4002', patientId: 'RPM-004', at: daysAgoAt(6, 8, 25),   source: 'device', bpSys: 142, bpDia: 84, pulse: 74 },
  { id: 'R-4001', patientId: 'RPM-004', at: daysAgoAt(7, 8, 40),   source: 'self',   bpSys: 136, bpDia: 80, pulse: 70 },

  /* RPM-005 — ค่าปกติ */
  { id: 'R-5005', patientId: 'RPM-005', at: todayAt(7, 5),         source: 'device', bpSys: 124, bpDia: 78, pulse: 72, dtx: 108, meal: 'fasting' },
  { id: 'R-5004', patientId: 'RPM-005', at: daysAgoAt(1, 7, 8),    source: 'device', bpSys: 128, bpDia: 80, pulse: 74, dtx: 114, meal: 'fasting' },
  { id: 'R-5003', patientId: 'RPM-005', at: daysAgoAt(2, 7, 2),    source: 'device', bpSys: 122, bpDia: 76, pulse: 70, dtx: 102, meal: 'fasting' },
  { id: 'R-5002', patientId: 'RPM-005', at: daysAgoAt(4, 7, 12),   source: 'self',   bpSys: 130, bpDia: 82, pulse: 76 },
  { id: 'R-5001', patientId: 'RPM-005', at: daysAgoAt(6, 7, 0),    source: 'device', bpSys: 126, bpDia: 78, pulse: 72, dtx: 98, meal: 'fasting' },
];

/* ── store ───────────────────────────────────────────────────────────── */
const PATIENTS = SEED_PATIENTS.map((p) => ({
  ...p,
  thresholds: { ...p.thresholds },
  devices: p.devices.map((d) => ({ ...d })),
  acknowledged: null,
}));
const READINGS = SEED_READINGS.map((r) => ({ ...r, history: [] }));

const listeners = new Set();
const emit = () => listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });

export const subscribeRpm = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export const getRpmPatients = () => PATIENTS.map((p) => ({
  ...p,
  thresholds: { ...p.thresholds },
  devices: p.devices.map((d) => ({ ...d })),
}));

export const getRpmPatient = (id) => getRpmPatients().find((p) => p.id === id) || null;

export const getRpmPatientByHn = (hn) => getRpmPatients().find((p) => p.hn === hn) || null;

/** readings ของผู้รับบริการ (ใหม่ → เก่า), ไม่รวมที่ยกเลิก เว้นแต่ระบุ */
export const getRpmReadings = (patientId, { includeCancelled = false } = {}) =>
  READINGS
    .filter((r) => r.patientId === patientId && (includeCancelled || !r.cancelled))
    .map((r) => ({ ...r, history: r.history.map((h) => ({ ...h })) }))
    .sort((a, b) => new Date(b.at) - new Date(a.at));

export const getLatestReading = (patientId) => getRpmReadings(patientId)[0] || null;

/* ── การประเมินเกณฑ์ (ตามคู่มือ) ─────────────────────────────────────── */

/** นับ streak ล่าสุด (จากค่าใหม่สุดย้อนหลัง) ที่ผ่านเงื่อนไข */
const leadingStreak = (rows, predicate, hasValue) => {
  let n = 0;
  for (const r of rows) {
    if (!hasValue(r)) continue;
    if (predicate(r)) n += 1;
    else break;
  }
  return n;
};

export const RPM_ALERT_LEVEL = {
  critical: { label: 'เกินเกณฑ์ (ต้องดำเนินการ)', tone: 'red' },
  warning:  { label: 'เฝ้าระวัง', tone: 'orange' },
  stale:    { label: 'ขาดส่งค่า', tone: 'yellow' },
  device:   { label: 'อุปกรณ์มีปัญหา', tone: 'purple' },
  normal:   { label: 'ปกติ', tone: 'green' },
};

/**
 * ประเมินผู้รับบริการ 1 ราย → { level, alerts[] }
 * alerts: [{ key, level, label, detail }]
 */
export const evaluateRpmPatient = (patient, readings) => {
  const t = patient.thresholds || RPM_DEFAULT_THRESHOLDS;
  const alerts = [];

  const bpRows = readings.filter((r) => r.bpSys != null);
  const bpStreak = leadingStreak(
    bpRows,
    (r) => r.bpSys > t.bpHighSys.value || r.bpDia > t.bpHighDia.value,
    (r) => r.bpSys != null,
  );
  if (bpStreak >= t.bpHighSys.streak) {
    alerts.push({
      key: 'bpHigh', level: 'critical', label: t.bpHighSys.label,
      detail: `วัดได้เกินเกณฑ์ติดกัน ${bpStreak} ครั้ง · ล่าสุด ${bpRows[0].bpSys}/${bpRows[0].bpDia} mmHg`,
    });
  } else if (bpStreak === 1) {
    alerts.push({
      key: 'bpHighOnce', level: 'warning', label: 'ความดันเกินเกณฑ์ 1 ครั้ง',
      detail: `ล่าสุด ${bpRows[0].bpSys}/${bpRows[0].bpDia} mmHg — ต้องเกินติดกัน ${t.bpHighSys.streak} ครั้งจึงเข้าเกณฑ์ส่ง Telemedicine`,
    });
  }

  const dtxRows = readings.filter((r) => r.dtx != null);
  const lowStreak = leadingStreak(dtxRows, (r) => r.dtx < t.dtxLow.value, (r) => r.dtx != null);
  if (lowStreak >= t.dtxLow.streak) {
    alerts.push({
      key: 'dtxLow', level: 'critical', label: t.dtxLow.label,
      detail: `น้ำตาลต่ำติดกัน ${lowStreak} ครั้ง · ล่าสุด ${dtxRows[0].dtx} mg/dL`,
    });
  }
  const highStreak = leadingStreak(dtxRows, (r) => r.dtx > t.dtxHigh.value, (r) => r.dtx != null);
  if (highStreak >= t.dtxHigh.streak) {
    alerts.push({
      key: 'dtxHigh', level: 'critical', label: t.dtxHigh.label,
      detail: `น้ำตาลสูงติดกัน ${highStreak} ครั้ง · ล่าสุด ${dtxRows[0].dtx} mg/dL`,
    });
  } else if (highStreak > 0) {
    alerts.push({
      key: 'dtxHighWatch', level: 'warning', label: 'น้ำตาลสูงกว่าเกณฑ์',
      detail: `สูงติดกัน ${highStreak} ครั้ง (เข้าเกณฑ์เมื่อครบ ${t.dtxHigh.streak} ครั้ง)`,
    });
  }

  if (patient.hba1c && patient.hba1c.value > t.hba1cHigh.value) {
    alerts.push({
      key: 'hba1c', level: 'critical', label: t.hba1cHigh.label,
      detail: `HbA1c ล่าสุด ${patient.hba1c.value} %`,
    });
  }

  const latest = readings[0];
  const daysSince = latest ? Math.floor((Date.now() - new Date(latest.at)) / 86400000) : 99;
  if (daysSince > t.noReadingDays.value) {
    alerts.push({
      key: 'stale', level: 'stale', label: t.noReadingDays.label,
      detail: latest ? `ค่าล่าสุดเมื่อ ${daysSince} วันก่อน` : 'ยังไม่เคยส่งค่าเข้าระบบ',
    });
  }

  const offline = patient.devices.filter((d) => !d.online);
  const lowBattery = patient.devices.filter((d) => d.online && d.battery <= 20);
  if (offline.length) {
    alerts.push({
      key: 'offline', level: 'device', label: 'อุปกรณ์ออฟไลน์',
      detail: offline.map((d) => d.model).join(', '),
    });
  }
  if (lowBattery.length) {
    alerts.push({
      key: 'battery', level: 'device', label: 'แบตเตอรี่อุปกรณ์ต่ำ',
      detail: lowBattery.map((d) => `${d.model} (${d.battery}%)`).join(', '),
    });
  }

  const order = ['critical', 'stale', 'device', 'warning'];
  const level = order.find((lv) => alerts.some((a) => a.level === lv)) || 'normal';
  return { level, alerts, daysSince, latest };
};

/** แถวสำหรับกระดาน RPM — patient + การประเมิน + ค่าล่าสุด + trend 7 วัน */
export const getRpmBoardRows = () => getRpmPatients().map((p) => {
  const readings = getRpmReadings(p.id);
  const evalResult = evaluateRpmPatient(p, readings);
  return {
    ...p,
    readings,
    trend: readings.slice(0, 7).reverse(),
    ...evalResult,
  };
});

/* ── การกระทำต่อค่า (บันทึก / แก้ไข / ยกเลิก) ────────────────────────── */

/** ค่าซ้ำเวลาเดิม (ภายใน 1 นาที) ของ parameter เดียวกัน */
export const findDuplicateReading = (patientId, at, keys) => {
  const target = new Date(at).getTime();
  return getRpmReadings(patientId).find((r) => {
    if (Math.abs(new Date(r.at).getTime() - target) > 60_000) return false;
    return keys.some((k) => r[k] != null);
  }) || null;
};

/** ตรวจช่วงค่าที่เป็นไปได้ — คืน { field: message } */
export const validateReadingValues = (values) => {
  const errors = {};
  Object.keys(values).forEach((k) => {
    const meta = RPM_PARAM_META[k];
    const raw = values[k];
    if (meta == null || raw === '' || raw == null) return;
    const n = Number(raw);
    if (Number.isNaN(n)) { errors[k] = `${meta.label} ต้องเป็นตัวเลข`; return; }
    if (n < meta.min || n > meta.max) {
      errors[k] = `${meta.label} ต้องอยู่ระหว่าง ${meta.min}–${meta.max} ${meta.unit}`;
    }
  });
  if (values.bpSys && values.bpDia && Number(values.bpDia) >= Number(values.bpSys)) {
    errors.bpDia = 'ความดันตัวล่างต้องน้อยกว่าตัวบน';
  }
  return errors;
};

/** ค่าผิดปกติแต่เป็นไปได้ → เตือนสีส้ม แต่บันทึกได้ */
export const softWarnings = (values) => {
  const warns = [];
  if (values.bpSys && Number(values.bpSys) > 180) warns.push('ความดันตัวบนสูงมาก (> 180) — ตรวจสอบว่าวัดถูกวิธี');
  if (values.dtx && Number(values.dtx) < 60) warns.push('น้ำตาลต่ำมาก (< 60) — ควรติดต่อผู้รับบริการทันที');
  if (values.o2sat && Number(values.o2sat) < 94) warns.push('ออกซิเจนต่ำกว่า 94 % — ประเมินอาการเหนื่อยหอบ');
  if (values.temp && Number(values.temp) >= 38.5) warns.push('อุณหภูมิสูง ≥ 38.5 °C');
  return warns;
};

export const addRpmReading = (patientId, values, { source = 'staff', actor, note, meal, at } = {}) => {
  const errors = validateReadingValues(values);
  if (Object.keys(errors).length) return { ok: false, errors };
  const row = {
    id: `R-${Date.now()}`,
    patientId,
    at: at || new Date().toISOString(),
    source,
    note: note || '',
    meal: meal || undefined,
    recordedBy: actor,
    history: [],
  };
  Object.keys(values).forEach((k) => {
    if (values[k] !== '' && values[k] != null) row[k] = Number(values[k]);
  });
  READINGS.push(row);
  emit();
  return { ok: true, reading: row };
};

/** แก้ไขค่า — ต้องมีเหตุผล, เก็บค่าเดิมไว้ในประวัติ */
export const editRpmReading = (readingId, values, reason, actor) => {
  const r = READINGS.find((x) => x.id === readingId);
  if (!r) return { ok: false, reason: 'ไม่พบค่าที่ต้องการแก้ไข' };
  if (!reason || !reason.trim()) return { ok: false, reason: 'ต้องระบุเหตุผลการแก้ไข' };
  const errors = validateReadingValues(values);
  if (Object.keys(errors).length) return { ok: false, errors };
  const before = {};
  Object.keys(values).forEach((k) => { before[k] = r[k]; });
  r.history.unshift({ at: new Date().toISOString(), by: actor, reason: reason.trim(), before, action: 'แก้ไขค่า' });
  Object.keys(values).forEach((k) => {
    if (values[k] !== '' && values[k] != null) r[k] = Number(values[k]);
  });
  r.editedBy = actor;
  r.editedAt = new Date().toISOString();
  emit();
  return { ok: true };
};

/** ยกเลิกค่า — soft cancel + เหตุผล (ยังเห็นในประวัติ) */
export const cancelRpmReading = (readingId, reason, actor) => {
  const r = READINGS.find((x) => x.id === readingId);
  if (!r) return { ok: false, reason: 'ไม่พบค่าที่ต้องการยกเลิก' };
  if (!reason || !reason.trim()) return { ok: false, reason: 'ต้องระบุเหตุผลการยกเลิก' };
  r.cancelled = { reason: reason.trim(), by: actor, at: new Date().toISOString() };
  r.history.unshift({ at: new Date().toISOString(), by: actor, reason: reason.trim(), action: 'ยกเลิกค่า' });
  emit();
  return { ok: true };
};

export const restoreRpmReading = (readingId, actor) => {
  const r = READINGS.find((x) => x.id === readingId);
  if (!r || !r.cancelled) return { ok: false, reason: 'ค่านี้ไม่ได้อยู่ในสถานะยกเลิก' };
  r.history.unshift({ at: new Date().toISOString(), by: actor, reason: 'กู้คืนค่า', action: 'กู้คืนค่า' });
  r.cancelled = null;
  emit();
  return { ok: true };
};

/** ปรับเกณฑ์เฝ้าระวังรายผู้รับบริการ */
export const setRpmThresholds = (patientId, thresholds, actor) => {
  const p = PATIENTS.find((x) => x.id === patientId);
  if (!p) return { ok: false, reason: 'ไม่พบผู้รับบริการ' };
  p.thresholds = { ...p.thresholds, ...thresholds };
  p.thresholdUpdatedBy = actor;
  p.thresholdUpdatedAt = new Date().toISOString();
  emit();
  return { ok: true };
};

/** บันทึกว่า "ติดตามแล้ว" — ปลดล็อกให้ปิดแบนเนอร์ค่าวิกฤตได้ */
export const acknowledgeRpmAlert = (patientId, note, actor) => {
  const p = PATIENTS.find((x) => x.id === patientId);
  if (!p) return { ok: false, reason: 'ไม่พบผู้รับบริการ' };
  if (!note || !note.trim()) return { ok: false, reason: 'ต้องระบุการดำเนินการที่ทำไปแล้ว' };
  p.acknowledged = { note: note.trim(), by: actor, at: new Date().toISOString() };
  emit();
  return { ok: true };
};

/** ข้อมูลสำหรับ VitalTrendChart — [{ time, bpSys, bpDia, ... }] */
export const toTrendData = (readings, parameter = 'bp') => readings
  .filter((r) => (parameter === 'bp' ? r.bpSys != null : r[parameter] != null))
  .map((r) => {
    const d = new Date(r.at);
    const time = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return parameter === 'bp'
      ? { time, bpSys: r.bpSys, bpDia: r.bpDia }
      : { time, [parameter]: r[parameter] };
  });
