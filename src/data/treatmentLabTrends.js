/* PHCIS | EMR §1.4.3.12 / §1.4.3.13 — ผลตรวจทางห้องปฏิบัติการแบบ
   "รายครั้ง" และ "เปรียบเทียบข้ามช่วงเวลา".

   `labResults.js` เดิมเป็นตัว *คำนวณ* (classifyAnalyte / evaluateResult /
   parseRange) สำหรับตอนห้องแล็บคีย์ผล ไม่ใช่คลังผลย้อนหลัง — ไฟล์นี้จึงเก็บ
   ผลที่ออกแล้วของผู้รับบริการ เพื่อให้แพทย์ดูย้อนหลังและเทียบแนวโน้มได้
   ตามที่ TOR สั่ง โดยยังคงคำศัพท์ H/L/critical ชุดเดียวกับฝั่งห้องแล็บ.

   ค่าที่เป็นข้อความ (เช่น ผลเพาะเชื้อ) ตั้งใจใส่ไว้ด้วย เพราะ TOR edge case
   ระบุว่าห้ามพยายามวาดกราฟจากค่าที่ไม่ใช่ตัวเลข. */

import { CURRENT_CLINICIAN, stampNow, appendAudit } from '@/data/treatmentAudit';

/* ── แหล่งข้อมูลข้ามหน่วยบริการ (HIE · TOR §1.4.3.2) ─────────────
   ผลตรวจที่แสดงเดิมมาจากคลังของศูนย์เดียว. TOR สั่งให้ดู "ประวัติการรับ
   บริการรายคน" ซึ่งในบริบท กทม. หมายถึงข้ามศูนย์บริการสาธารณสุข (ศบส. 69
   แห่ง) และโรงพยาบาลสังกัด กทม. ด้วย.

   `kind` ใช้กำหนดสีป้ายและระดับความน่าเชื่อถือ:
     own          — คลังของศูนย์เราเอง (เชื่อถือได้เต็ม แก้ไขได้)
     bmr-center   — ศบส. อื่นในสำนักอนามัย (อ่านอย่างเดียว)
     bmr-hospital — โรงพยาบาลสังกัด กทม. (อ่านอย่างเดียว)

   **ยังไม่มี HIE gateway จริง** — แถวข้ามหน่วยบริการเป็น mock feed ที่
   จัดรูปแบบตามข้อกำหนดไว้ล่วงหน้า ไม่ได้ query ออกไปจริง. */
export const HIE_SOURCES = [
  {
    id: 'own', kind: 'own', tone: 'teal',
    label: 'ศูนย์บริการสาธารณสุข 4 ดินแดง',
    shortLabel: 'ศูนย์เรา',
    centerCode: '04',
  },
  {
    id: 'center-21', kind: 'bmr-center', tone: 'blue',
    label: 'ศูนย์บริการสาธารณสุข 21 วัดธาตุทอง',
    shortLabel: 'ศบส. 21',
    centerCode: '21',
    endpoint: 'https://hie.bangkok.go.th/fhir/DiagnosticReport',
  },
  {
    id: 'center-41', kind: 'bmr-center', tone: 'blue',
    label: 'ศูนย์บริการสาธารณสุข 41 คลองเตย',
    shortLabel: 'ศบส. 41',
    centerCode: '41',
    endpoint: 'https://hie.bangkok.go.th/fhir/DiagnosticReport',
  },
  {
    id: 'bmr-klang', kind: 'bmr-hospital', tone: 'purple',
    label: 'โรงพยาบาลกลาง (สังกัด กทม.)',
    shortLabel: 'รพ.กลาง',
    centerCode: 'KLG',
    endpoint: 'https://hie.bangkok.go.th/fhir/DiagnosticReport',
  },
];

export const hieSourceMeta = (id) =>
  HIE_SOURCES.find((s) => s.id === id) || HIE_SOURCES[0];

/* HN ข้ามศูนย์ตามคู่มือ HCIS §8.1.3 — รูปแบบ "เลขลำดับ/ปี-เลขศูนย์"
   เช่น 01234/69-21 = ผู้ป่วยลำดับ 1234 ปี 2569 ของ ศบส. 21.
   ศูนย์เราเองใช้ HN ปกติ ไม่ต้องเติมรหัสศูนย์. */
export const crossCenterHn = (hn, sourceId) => {
  const src = hieSourceMeta(sourceId);
  if (!hn) return '—';
  if (src.kind === 'own') return hn;
  const digits = String(hn).replace(/[^0-9]/g, '');
  const seq = digits.slice(-5).padStart(5, '0');
  const year = digits.slice(0, 2) || '69';
  return `${seq}/${year}-${src.centerCode}`;
};

/* แหล่งภายนอกที่ล่มอยู่ — ต้องบอกว่าข้อมูลช่วงไหนขาดไป ห้ามแสดงตารางว่าง
   เงียบ ๆ (edge case ของ TOR) */
export const HIE_SOURCE_OUTAGES = {
  'center-41': {
    since: '7 ส.ค. 2569 · 22:15',
    missingRange: 'ผลตรวจตั้งแต่ 1 ก.ค. 2569 เป็นต้นมา',
    reason: 'ปลายทางปิดปรับปรุงระบบ LIS ประจำปี',
  },
};

export const LAB_FLAGS = [
  { key: 'critical', label: 'ค่าวิกฤต', badge: 'error',   symbol: '!!' },
  { key: 'high',     label: 'สูงกว่าค่าปกติ', badge: 'warning', symbol: '↑' },
  { key: 'low',      label: 'ต่ำกว่าค่าปกติ', badge: 'info',    symbol: '↓' },
  { key: 'normal',   label: 'อยู่ในเกณฑ์ปกติ', badge: 'success', symbol: '' },
];

export const labFlagMeta = (key) =>
  LAB_FLAGS.find((f) => f.key === key) || LAB_FLAGS[3];

/* ผลตรวจที่ออกแล้ว — จัดกลุ่มตามครั้งที่ตรวจ (visit) */
const LAB_VISITS = [
  {
    id: 'lv-2569-05-06', hn: '67-00001', visitId: 'v-2569-05-06', sourceId: 'own',
    collectedAt: '6 พ.ค. 2569 · 09:40', reportedAt: '6 พ.ค. 2569 · 10:41',
    orderNo: 'LAB-2569-04412', reportedBy: 'ทนพ.ญ.กรรณิการ์ สุขใจ',
    panels: [
      {
        panel: 'เคมีคลินิก (Blood Chemistry)',
        rows: [
          { key: 'bun',  name: 'BUN',            value: 32,   unit: 'mg/dL',  ref: '7 – 20',      flag: 'high' },
          { key: 'cr',   name: 'Creatinine',     value: 2.4,  unit: 'mg/dL',  ref: '0.7 – 1.3',   flag: 'critical' },
          { key: 'egfr', name: 'eGFR',           value: 31,   unit: 'mL/min', ref: '> 90',        flag: 'critical' },
          { key: 'k',    name: 'Potassium (K)',  value: 5.4,  unit: 'mmol/L', ref: '3.5 – 5.1',   flag: 'high' },
          { key: 'na',   name: 'Sodium (Na)',    value: 138,  unit: 'mmol/L', ref: '136 – 145',   flag: 'normal' },
        ],
      },
      {
        panel: 'โลหิตวิทยา (Hematology)',
        rows: [
          { key: 'hb',  name: 'Hemoglobin',  value: 11.2,   unit: 'g/dL',  ref: '13 – 17',        flag: 'low' },
          { key: 'wbc', name: 'WBC',         value: 8400,   unit: '/µL',   ref: '4,000 – 10,000', flag: 'normal' },
          { key: 'plt', name: 'Platelet',    value: 245000, unit: '/µL',   ref: '150,000 – 400,000', flag: 'normal' },
        ],
      },
    ],
  },
  {
    id: 'lv-2569-04-02', hn: '67-00001', visitId: 'v-2569-04-02', sourceId: 'own',
    collectedAt: '2 เม.ย. 2569 · 09:12', reportedAt: '2 เม.ย. 2569 · 10:20',
    orderNo: 'LAB-2569-03871', reportedBy: 'ทนพ.สมภพ ทองแท้',
    panels: [
      {
        panel: 'เคมีคลินิก (Blood Chemistry)',
        rows: [
          { key: 'bun',  name: 'BUN',           value: 24,   unit: 'mg/dL',  ref: '7 – 20',    flag: 'high' },
          { key: 'cr',   name: 'Creatinine',    value: 1.9,  unit: 'mg/dL',  ref: '0.7 – 1.3', flag: 'high' },
          { key: 'egfr', name: 'eGFR',          value: 41,   unit: 'mL/min', ref: '> 90',      flag: 'high' },
          { key: 'k',    name: 'Potassium (K)', value: 4.8,  unit: 'mmol/L', ref: '3.5 – 5.1', flag: 'normal' },
          { key: 'na',   name: 'Sodium (Na)',   value: 140,  unit: 'mmol/L', ref: '136 – 145', flag: 'normal' },
        ],
      },
      {
        panel: 'โลหิตวิทยา (Hematology)',
        rows: [
          { key: 'hb',  name: 'Hemoglobin', value: 12.1,   unit: 'g/dL', ref: '13 – 17',        flag: 'low' },
          { key: 'wbc', name: 'WBC',        value: 7900,   unit: '/µL',  ref: '4,000 – 10,000', flag: 'normal' },
          { key: 'plt', name: 'Platelet',   value: 262000, unit: '/µL',  ref: '150,000 – 400,000', flag: 'normal' },
        ],
      },
      {
        panel: 'จุลชีววิทยา (Microbiology)',
        rows: [
          /* ค่าเป็นข้อความ — ห้ามวาดกราฟ ต้องแสดงเป็นข้อความพร้อมป้าย */
          { key: 'urine-culture', name: 'Urine culture', text: 'พบเชื้อ Escherichia coli มากกว่า 100,000 CFU/mL — ไวต่อ Ceftriaxone, ดื้อต่อ Ampicillin', ref: 'ไม่พบเชื้อก่อโรค', flag: 'high' },
        ],
      },
    ],
  },
  {
    id: 'lv-2568-12-11', hn: '67-00001', visitId: 'v-2568-12-11', sourceId: 'own',
    collectedAt: '11 ธ.ค. 2568 · 08:50', reportedAt: '11 ธ.ค. 2568 · 09:58',
    orderNo: 'LAB-2568-09920', reportedBy: 'ทนพ.ญ.กรรณิการ์ สุขใจ',
    panels: [
      {
        panel: 'เคมีคลินิก (Blood Chemistry)',
        rows: [
          { key: 'bun',  name: 'BUN',           value: 19,   unit: 'mg/dL',  ref: '7 – 20',    flag: 'normal' },
          { key: 'cr',   name: 'Creatinine',    value: 1.5,  unit: 'mg/dL',  ref: '0.7 – 1.3', flag: 'high' },
          { key: 'egfr', name: 'eGFR',          value: 54,   unit: 'mL/min', ref: '> 90',      flag: 'high' },
          { key: 'k',    name: 'Potassium (K)', value: 4.2,  unit: 'mmol/L', ref: '3.5 – 5.1', flag: 'normal' },
          { key: 'na',   name: 'Sodium (Na)',   value: 141,  unit: 'mmol/L', ref: '136 – 145', flag: 'normal' },
        ],
      },
      {
        panel: 'โลหิตวิทยา (Hematology)',
        rows: [
          { key: 'hb',  name: 'Hemoglobin', value: 13.4,   unit: 'g/dL', ref: '13 – 17',        flag: 'normal' },
          { key: 'wbc', name: 'WBC',        value: 6800,   unit: '/µL',  ref: '4,000 – 10,000', flag: 'normal' },
          { key: 'plt', name: 'Platelet',   value: 271000, unit: '/µL',  ref: '150,000 – 400,000', flag: 'normal' },
        ],
      },
    ],
  },
  /* ── ผลข้ามหน่วยบริการผ่าน HIE (§1.4.3.2) — อ่านอย่างเดียว ────────
     ต้องผ่านประตูความยินยอมก่อนจึงจะแสดง (hieConsent ด้านล่าง) */
  {
    id: 'lv-hie-2569-02-19', hn: '67-00001', visitId: 'v-hie-2569-02-19', sourceId: 'center-21',
    collectedAt: '19 ก.พ. 2569 · 08:20', reportedAt: '19 ก.พ. 2569 · 11:05',
    orderNo: 'L21-2569-00877', reportedBy: 'ทนพ.ญ.พรทิพย์ เจริญสุข (ศบส. 21)',
    panels: [
      {
        panel: 'เคมีคลินิก (Blood Chemistry)',
        rows: [
          { key: 'bun',  name: 'BUN',           value: 21,   unit: 'mg/dL',  ref: '7 – 20',    flag: 'high' },
          { key: 'cr',   name: 'Creatinine',    value: 1.7,  unit: 'mg/dL',  ref: '0.7 – 1.3', flag: 'high' },
          { key: 'egfr', name: 'eGFR',          value: 47,   unit: 'mL/min', ref: '> 90',      flag: 'high' },
          { key: 'k',    name: 'Potassium (K)', value: 4.5,  unit: 'mmol/L', ref: '3.5 – 5.1', flag: 'normal' },
        ],
      },
    ],
  },
  {
    id: 'lv-hie-2568-09-04', hn: '67-00001', visitId: 'v-hie-2568-09-04', sourceId: 'bmr-klang',
    collectedAt: '4 ก.ย. 2568 · 07:45', reportedAt: '4 ก.ย. 2568 · 13:30',
    orderNo: 'KLG-L-2568-11902', reportedBy: 'พญ.ณัฐกานต์ วิริยะกุล (รพ.กลาง)',
    panels: [
      {
        panel: 'เคมีคลินิก (Blood Chemistry)',
        rows: [
          { key: 'bun',  name: 'BUN',           value: 17,   unit: 'mg/dL',  ref: '7 – 20',    flag: 'normal' },
          { key: 'cr',   name: 'Creatinine',    value: 1.3,  unit: 'mg/dL',  ref: '0.7 – 1.3', flag: 'normal' },
          { key: 'egfr', name: 'eGFR',          value: 62,   unit: 'mL/min', ref: '> 90',      flag: 'high' },
        ],
      },
      {
        panel: 'โลหิตวิทยา (Hematology)',
        rows: [
          { key: 'hb',  name: 'Hemoglobin', value: 13.9,   unit: 'g/dL', ref: '13 – 17',        flag: 'normal' },
          { key: 'wbc', name: 'WBC',        value: 7100,   unit: '/µL',  ref: '4,000 – 10,000', flag: 'normal' },
        ],
      },
    ],
  },
  {
    id: 'lv-hie-2569-03-12', hn: '67-00003', visitId: 'v-hie-2569-03-12', sourceId: 'center-21',
    collectedAt: '12 มี.ค. 2569 · 08:05', reportedAt: '12 มี.ค. 2569 · 10:12',
    orderNo: 'L21-2569-00612', reportedBy: 'ทนพ.ญ.พรทิพย์ เจริญสุข (ศบส. 21)',
    panels: [
      {
        panel: 'เคมีคลินิก (Blood Chemistry)',
        rows: [
          { key: 'fbs',   name: 'FBS',   value: 198, unit: 'mg/dL', ref: '70 – 99', flag: 'high' },
          { key: 'hba1c', name: 'HbA1c', value: 9.1, unit: '%',     ref: '< 5.7',   flag: 'critical' },
        ],
      },
    ],
  },
  {
    id: 'lv-2569-04-28', hn: '67-00003', visitId: 'v-2569-04-28', sourceId: 'own',
    collectedAt: '28 เม.ย. 2569 · 08:30', reportedAt: '28 เม.ย. 2569 · 09:31',
    orderNo: 'LAB-2569-04120', reportedBy: 'ทนพ.สมภพ ทองแท้',
    panels: [
      {
        panel: 'เคมีคลินิก (Blood Chemistry)',
        rows: [
          { key: 'fbs',   name: 'FBS',   value: 246,  unit: 'mg/dL', ref: '70 – 99',  flag: 'critical' },
          { key: 'hba1c', name: 'HbA1c', value: 10.2, unit: '%',     ref: '< 5.7',    flag: 'critical' },
        ],
      },
    ],
  },
];

/* ── ประตูความยินยอมเชื่อมข้อมูลข้ามหน่วยบริการ (§1.4.3.2 + §1.4.2.1) ──
   ก่อนเห็นผลจากศูนย์อื่น ผู้ใช้ต้องกดยินยอมพร้อมระบุเหตุผล ≥10 ตัวอักษร
   (pattern เดียวกับประตูข้อมูลลับใน §1.4.2.1) และทุกครั้งถูกเขียน access log
   ผ่าน appendAudit ให้ตรวจสอบย้อนกลับได้ว่าใครเปิดดูข้อมูลข้ามศูนย์เมื่อไร. */
const HIE_CONSENT = new Map();   /* hn → { grantedAt, grantedBy, reason } */
const hieListeners = new Set();
const emitHie = () => { hieListeners.forEach((fn) => fn(HIE_CONSENT)); };

export const subscribeHieConsent = (fn) => {
  hieListeners.add(fn);
  return () => { hieListeners.delete(fn); };
};

export const getHieConsent = (hn) => HIE_CONSENT.get(String(hn || '')) || null;
export const hasHieConsent = (hn) => !!getHieConsent(hn);

export const grantHieConsent = (hn, reason) => {
  const record = {
    grantedAt: stampNow(),
    grantedBy: CURRENT_CLINICIAN.name,
    reason: reason || 'ไม่ได้ระบุเหตุผล',
  };
  HIE_CONSENT.set(String(hn || ''), record);
  emitHie();
  appendAudit({
    hn, category: 'access',
    field: 'เปิดดูผลตรวจข้ามหน่วยบริการ (HIE)',
    oldValue: 'ปิดอยู่',
    newValue: `เปิดโดย ${record.grantedBy} · เหตุผล: ${record.reason}`,
  });
  return record;
};

export const revokeHieConsent = (hn, reason) => {
  const before = getHieConsent(hn);
  HIE_CONSENT.delete(String(hn || ''));
  emitHie();
  appendAudit({
    hn, category: 'access',
    field: 'ปิดการดูผลตรวจข้ามหน่วยบริการ (HIE)',
    oldValue: before ? `เปิดเมื่อ ${before.grantedAt}` : 'ปิดอยู่',
    newValue: `ปิดโดย ${CURRENT_CLINICIAN.name}${reason ? ` · เหตุผล: ${reason}` : ''}`,
  });
  return null;
};

/* ครั้งที่ตรวจของผู้รับบริการ (ใหม่ → เก่า).
   `includeExternal` เริ่มต้นเป็น false — แถวข้ามหน่วยบริการต้องผ่านประตู
   ความยินยอมก่อน ผู้เรียกจึงต้องส่งมาเองอย่างชัดเจน. */
export const labVisitsFor = (hn, { includeExternal = false } = {}) => LAB_VISITS
  .filter((v) => v.hn === hn)
  .filter((v) => includeExternal || (v.sourceId || 'own') === 'own')
  .map((v) => {
    const src = hieSourceMeta(v.sourceId || 'own');
    return {
      ...v,
      sourceId: v.sourceId || 'own',
      source: src,
      external: src.kind !== 'own',
      /* HN ที่ศูนย์ต้นทางใช้ — รูปแบบ เลขลำดับ/ปี-เลขศูนย์ ตามคู่มือ §8.1.3 */
      displayHn: crossCenterHn(v.hn, v.sourceId || 'own'),
      panels: v.panels.map((p) => ({ ...p, rows: p.rows.map((r) => ({ ...r })) })),
    };
  });

/* จำนวนผลที่ "ถูกซ่อนอยู่" เพราะยังไม่ยินยอมเชื่อม HIE — ต้องบอกจำนวน
   ให้ผู้ใช้เห็น ห้ามซ่อนเงียบ ๆ */
export const externalLabVisitCount = (hn) => LAB_VISITS
  .filter((v) => v.hn === hn && (v.sourceId || 'own') !== 'own').length;

/* แหล่งข้ามหน่วยบริการที่มีข้อมูลของผู้ป่วยรายนี้ พร้อมสถานะ outage */
export const externalSourcesFor = (hn) => {
  const ids = [...new Set(LAB_VISITS
    .filter((v) => v.hn === hn && (v.sourceId || 'own') !== 'own')
    .map((v) => v.sourceId))];
  return ids.map((id) => ({
    ...hieSourceMeta(id),
    outage: HIE_SOURCE_OUTAGES[id] || null,
  }));
};

/* แหล่งที่ล่มทั้งหมด (ไม่ผูกกับผู้ป่วยรายใด) — ใช้เตือนว่าข้อมูลช่วงไหนขาด */
export const hieOutages = () => Object.keys(HIE_SOURCE_OUTAGES).map((id) => ({
  ...hieSourceMeta(id),
  ...HIE_SOURCE_OUTAGES[id],
}));

/* รายการ analyte ที่เคยตรวจ (สำหรับตัวเลือกในโหมดเปรียบเทียบ) */
export const analytesFor = (hn, opts) => {
  const seen = new Map();
  labVisitsFor(hn, opts).forEach((v) => v.panels.forEach((p) => p.rows.forEach((r) => {
    if (!seen.has(r.key)) {
      seen.set(r.key, { key: r.key, name: r.name, unit: r.unit || '', ref: r.ref, numeric: r.value != null });
    }
  })));
  return [...seen.values()];
};

/* ชุดค่าข้าม visit ของ analyte เดียว (เก่า → ใหม่ เพื่อพล็อตแนวโน้ม).
   เมื่อรวมผลข้ามหน่วยบริการ แต่ละจุดพก source มาด้วย เพื่อให้กราฟและตาราง
   บอกได้ว่าค่าไหนมาจากศูนย์ไหน (ห้ามเอาค่าต่างศูนย์มาปนโดยไม่บอก) */
export const seriesFor = (hn, analyteKey, opts) => labVisitsFor(hn, opts)
  .map((v) => {
    let hit = null;
    v.panels.forEach((p) => p.rows.forEach((r) => { if (r.key === analyteKey) hit = r; }));
    return hit
      ? {
        visitId: v.visitId,
        reportedAt: v.reportedAt,
        source: v.source,
        external: v.external,
        displayHn: v.displayHn,
        ...hit,
      }
      : null;
  })
  .filter(Boolean)
  .reverse();

/* หมายเหตุ: ยังไม่มี HL7 engine จริง — ผลชุดนี้เป็น mock feed ที่ควรมาจาก
   ORU^R01 ของ LIS ตามผนวก ง (ดู treatmentInterfaces.js) */
export default LAB_VISITS;
