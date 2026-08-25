import { LAB_TESTS } from '@/data/labCatalog';
import { XRAY_EXAMS } from '@/data/xrayCatalog';
import { ICD9_PROCEDURES } from '@/pages/treat/panels/ProcedureOrderPanel';

const TYPE_META = {
  lab: { label: 'ห้องปฏิบัติการ', short: 'Lab', destination: 'LIS', icon: 'biotech' },
  xray: { label: 'รังสีวินิจฉัย', short: 'Radiology', destination: 'RIS/PACS', icon: 'radiology' },
  procedure: { label: 'หัตถการ', short: 'Procedure', destination: 'ห้องพยาบาล', icon: 'medical_services' },
};

/* ── mapper: รายการในแค็ตตาล็อกจริง → order ที่ CPOE เข้าใจ ─────────────
   เดิม map ไว้เฉพาะ 15 รายการที่ pick มาโชว์ใน Step "เลือกรายการ" ทำให้
   คำสั่งที่หมอสั่งจาก popup "เพิ่มรายการ" (ซึ่งใช้แค็ตตาล็อกเต็ม) เช่น
   Urinalysis หลุดจากตะกร้า CPOE — ไม่ถูกตรวจสอบ ไม่ถูกลงนาม ไม่ถูกส่ง
   ปลายทาง แยก mapper ออกมาให้ resolve ได้ทุกรายการ ไม่ใช่แค่ 15 ใบ */
export const labToCpoeOrder = (item) => ({
    id: item.id,
    type: 'lab',
    code: item.code,
    name: `${item.nameEn} — ${item.nameTh}`,
    destination: TYPE_META.lab.destination,
    price: item.price,
    covered: true,
    preparation: item.fastingHours
      ? `งดอาหารอย่างน้อย ${item.fastingHours} ชั่วโมงก่อนเก็บตัวอย่าง`
      : 'ไม่ต้องงดอาหาร',
    requirement: `สิ่งส่งตรวจ ${item.tubeCount || 1} หลอด · ระบบเลือกชนิดหลอดให้อัตโนมัติ`,
    urgency: 'routine',
});

export const xrayToCpoeOrder = (item) => ({
    id: item.id,
    type: 'xray',
    code: item.code,
    name: item.name,
    destination: TYPE_META.xray.destination,
    price: item.price,
    covered: (item.claimByRight?.UCS || 0) >= item.price,
    preparation: item.prep,
    requirement: item.contrast
      ? 'ใช้สารทึบรังสี · ต้องมีผล Creatinine/eGFR และผ่านแบบประเมินความเสี่ยง'
      : item.referralOnly
        ? 'ตรวจที่โรงพยาบาลเครือข่าย · ต้องออกใบนัดและใบส่งตัว'
        : 'ตรวจภายในศูนย์บริการสาธารณสุข',
    contrast: Boolean(item.contrast),
    femaleScreening: Boolean(item.femaleScreening),
    referralOnly: Boolean(item.referralOnly),
    urgency: 'routine',
});

export const procedureToCpoeOrder = (item) => ({
  id: `procedure-${item.code}`,
  type: 'procedure',
  code: item.code,
  name: item.nameTh,
  destination: TYPE_META.procedure.destination,
  price: item.price,
  covered: item.claim >= item.price,
  preparation: 'ประเมินสัญญาณชีพและยืนยันตำแหน่งก่อนทำหัตถการ',
  requirement: `ICD-9-CM ${item.code} · หน่วย ${item.unit}`,
  urgency: 'routine',
});

/* รายการที่ยกมาโชว์เป็นการ์ดใน Step "เลือกรายการ" — เป็นแค่ shortcut
   ไม่ใช่ขอบเขตของสิ่งที่ CPOE รองรับ (ดู resolveCpoeOrder) */
const CATALOG_LAB_IDS = ['lab-cbc', 'lab-creatinine', 'lab-electrolytes', 'lab-fbs', 'lab-hba1c'];
const CATALOG_XRAY_IDS = ['xr-cxr-pa', 'xr-kub', 'ct-brain', 'ct-chest', 'mri-lspine'];

const catalogLabs = LAB_TESTS.filter((item) => CATALOG_LAB_IDS.includes(item.id)).map(labToCpoeOrder);
const catalogXrays = XRAY_EXAMS.filter((item) => CATALOG_XRAY_IDS.includes(item.id)).map(xrayToCpoeOrder);
const catalogProcedures = ICD9_PROCEDURES.slice(0, 5).map(procedureToCpoeOrder);

export const CPOE_TYPE_META = TYPE_META;
export const CPOE_CATALOG = [...catalogLabs, ...catalogXrays, ...catalogProcedures];
export const CPOE_CATALOG_BY_ID = Object.fromEntries(CPOE_CATALOG.map((item) => [item.id, item]));

/** id ใด ๆ จากแค็ตตาล็อกจริง (แล็บ · รังสี · หัตถการ `procedure-<ICD9>`)
    → order ที่ CPOE ใช้ได้ · คืน null เมื่อ resolve ไม่ได้ ผู้เรียกต้องกันเอง */
export const resolveCpoeOrder = (id) => {
  if (!id) return null;
  if (CPOE_CATALOG_BY_ID[id]) return CPOE_CATALOG_BY_ID[id];

  const lab = LAB_TESTS.find((item) => item.id === id);
  if (lab) return labToCpoeOrder(lab);

  const xray = XRAY_EXAMS.find((item) => item.id === id);
  if (xray) return xrayToCpoeOrder(xray);

  if (String(id).startsWith('procedure-')) {
    const code = String(id).slice('procedure-'.length);
    const proc = ICD9_PROCEDURES.find((item) => item.code === code);
    if (proc) return procedureToCpoeOrder(proc);
  }
  return null;
};

export const CPOE_INITIAL_ORDER_IDS = ['lab-cbc', 'lab-creatinine', 'ct-chest'];

export const CPOE_RECENT_RESULTS = [
  {
    id: 'ORD-690824-0081',
    orderedAt: '24 ส.ค. 2569 08:45',
    type: 'lab',
    item: 'Electrolytes — เกลือแร่ในเลือด',
    status: 'critical',
    statusLabel: 'ผลวิกฤต',
    orderer: 'พญ.สมหญิง รักษ์ดี',
    destination: 'LIS',
    result: 'Potassium 6.2 mmol/L',
    resultNote: 'ห้องปฏิบัติการโทรแจ้งเวลา 09:18 น. รอแพทย์ยืนยันรับทราบ',
    critical: true,
    acknowledged: false,
    version: 1,
    timeline: [
      { time: '08:45', title: 'ส่งคำสั่งเข้า LIS', detail: 'เลขที่ LN-2569-10824' },
      { time: '08:52', title: 'รับสิ่งส่งตรวจ', detail: 'หลอด Li-Heparin · คุณอรอนงค์ ใจดี' },
      { time: '09:16', title: 'ยืนยันผล', detail: 'Potassium 6.2 mmol/L · Critical high' },
      { time: '09:18', title: 'แจ้งผลวิกฤต', detail: 'โทรหาแพทย์ผู้สั่ง · รอรับทราบ' },
    ],
  },
  {
    id: 'ORD-690823-0174',
    orderedAt: '23 ส.ค. 2569 14:10',
    type: 'xray',
    item: 'เอกซเรย์ทรวงอก (CXR) PA',
    status: 'reported',
    statusLabel: 'รายงานผลแล้ว',
    orderer: 'นพ.สมชาย ใจดี',
    destination: 'RIS/PACS',
    result: 'No active pulmonary disease.',
    resultNote: 'แก้ไขรายงานคำสะกด โดย พญ.วรรณา รังสีวิทยา เวลา 16:42 น.',
    critical: false,
    acknowledged: true,
    version: 2,
    amended: true,
    timeline: [
      { time: '14:10', title: 'ส่งคำสั่งเข้า RIS', detail: 'เลขที่ XN-2569-01482' },
      { time: '14:18', title: 'รังสีรับคำสั่ง', detail: 'ห้อง X-ray 1' },
      { time: '15:02', title: 'ถ่ายภาพเสร็จ', detail: 'ภาพถูกส่งเข้า PACS' },
      { time: '16:42', title: 'แก้ไขรายงานเป็นเวอร์ชัน 2', detail: 'พญ.วรรณา รังสีวิทยา' },
    ],
  },
  {
    id: 'ORD-690824-0092',
    orderedAt: '24 ส.ค. 2569 09:02',
    type: 'procedure',
    item: 'ตรวจคลื่นไฟฟ้าหัวใจ (EKG 12 lead)',
    status: 'accepted',
    statusLabel: 'รับคำสั่งแล้ว',
    orderer: 'พญ.สมหญิง รักษ์ดี',
    destination: 'ห้องพยาบาล',
    result: 'รอดำเนินการ',
    resultNote: 'คิวห้องพยาบาล N-014',
    critical: false,
    acknowledged: true,
    version: 1,
    timeline: [
      { time: '09:02', title: 'ส่งคำสั่ง', detail: 'ห้องตรวจ OPD 2' },
      { time: '09:04', title: 'ห้องพยาบาลรับคำสั่ง', detail: 'คิว N-014' },
    ],
  },
];

/* เดิมทุกแถวที่สร้างใหม่ถูกประทับ "24 ส.ค. 2569 10:24" และเลขที่ ORD-690824
   ตายตัว — คำสั่งที่เพิ่งลงนามวันนี้จึงขึ้นตารางติดตามเป็นของเมื่อวาน และ
   เลขที่ชนกับใบเก่า ให้ derive จากเวลาจริงตอนกดส่ง */
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const pad2 = (n) => String(n).padStart(2, '0');

/** "25 ส.ค. 2569 10:24" */
export const formatThaiDateTime = (d = new Date()) =>
  `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
  + ` ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

/** "ORD-690825" — ปี พ.ศ. 2 หลัก + เดือน + วัน */
export const buildOrderIdPrefix = (d = new Date()) =>
  `ORD-${String((d.getFullYear() + 543) % 100)}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;

export const buildNewTrackingRows = (orders, orderIdPrefix = buildOrderIdPrefix()) => orders.map((order, index) => ({
  id: `${orderIdPrefix}-${String(120 + index).padStart(4, '0')}`,
  orderedAt: formatThaiDateTime(),
  type: order.type,
  item: order.name,
  status: 'sent',
  statusLabel: 'ส่งปลายทางแล้ว',
  orderer: 'พญ.สมหญิง รักษ์ดี',
  destination: order.destination,
  result: 'รอผล',
  resultNote: order.preparation,
  critical: false,
  acknowledged: true,
  version: 1,
  timeline: [
    { time: formatThaiDateTime().slice(-5), title: 'ลงนามคำสั่ง', detail: 'พญ.สมหญิง รักษ์ดี · ว.12345' },
    { time: formatThaiDateTime().slice(-5), title: `ส่งคำสั่งเข้า ${order.destination}`, detail: 'ระบบปลายทางตอบรับแล้ว' },
  ],
}));
