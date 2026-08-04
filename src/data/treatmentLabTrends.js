/* PHCIS | EMR §1.4.3.12 / §1.4.3.13 — ผลตรวจทางห้องปฏิบัติการแบบ
   "รายครั้ง" และ "เปรียบเทียบข้ามช่วงเวลา".

   `labResults.js` เดิมเป็นตัว *คำนวณ* (classifyAnalyte / evaluateResult /
   parseRange) สำหรับตอนห้องแล็บคีย์ผล ไม่ใช่คลังผลย้อนหลัง — ไฟล์นี้จึงเก็บ
   ผลที่ออกแล้วของผู้รับบริการ เพื่อให้แพทย์ดูย้อนหลังและเทียบแนวโน้มได้
   ตามที่ TOR สั่ง โดยยังคงคำศัพท์ H/L/critical ชุดเดียวกับฝั่งห้องแล็บ.

   ค่าที่เป็นข้อความ (เช่น ผลเพาะเชื้อ) ตั้งใจใส่ไว้ด้วย เพราะ TOR edge case
   ระบุว่าห้ามพยายามวาดกราฟจากค่าที่ไม่ใช่ตัวเลข. */

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
    id: 'lv-2569-05-06', hn: '67-00001', visitId: 'v-2569-05-06',
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
    id: 'lv-2569-04-02', hn: '67-00001', visitId: 'v-2569-04-02',
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
    id: 'lv-2568-12-11', hn: '67-00001', visitId: 'v-2568-12-11',
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
  {
    id: 'lv-2569-04-28', hn: '67-00003', visitId: 'v-2569-04-28',
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

/* ครั้งที่ตรวจของผู้รับบริการ (ใหม่ → เก่า) */
export const labVisitsFor = (hn) => LAB_VISITS
  .filter((v) => v.hn === hn)
  .map((v) => ({ ...v, panels: v.panels.map((p) => ({ ...p, rows: p.rows.map((r) => ({ ...r })) })) }));

/* รายการ analyte ที่เคยตรวจ (สำหรับตัวเลือกในโหมดเปรียบเทียบ) */
export const analytesFor = (hn) => {
  const seen = new Map();
  labVisitsFor(hn).forEach((v) => v.panels.forEach((p) => p.rows.forEach((r) => {
    if (!seen.has(r.key)) {
      seen.set(r.key, { key: r.key, name: r.name, unit: r.unit || '', ref: r.ref, numeric: r.value != null });
    }
  })));
  return [...seen.values()];
};

/* ชุดค่าข้าม visit ของ analyte เดียว (เก่า → ใหม่ เพื่อพล็อตแนวโน้ม) */
export const seriesFor = (hn, analyteKey) => labVisitsFor(hn)
  .map((v) => {
    let hit = null;
    v.panels.forEach((p) => p.rows.forEach((r) => { if (r.key === analyteKey) hit = r; }));
    return hit ? { visitId: v.visitId, reportedAt: v.reportedAt, ...hit } : null;
  })
  .filter(Boolean)
  .reverse();

/* หมายเหตุ: ยังไม่มี HL7 engine จริง — ผลชุดนี้เป็น mock feed ที่ควรมาจาก
   ORU^R01 ของ LIS ตามผนวก ง (ดู treatmentInterfaces.js) */
export default LAB_VISITS;
