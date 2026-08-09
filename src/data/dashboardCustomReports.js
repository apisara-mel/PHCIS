/* §1.20.11 — "รายงาน และ Dashboard อื่น ๆ ตามที่สำนักอนามัยกำหนด"
   ข้อกำหนดนี้เปิดปลาย (open-ended) — สิ่งที่ระบบส่วนหน้าทำได้จริงคือ
   (ก) ทะเบียนแม่แบบรายงานที่สำนักอนามัยสั่งเพิ่มไว้แล้ว พร้อมสถานะ
   (ข) ช่องทาง "ขอรายงานใหม่" ที่บันทึกผู้ขอ + เวลา + รายละเอียด แล้วเข้าคิวพัฒนา
   จึงรายงานเป็น partial เสมอ ไม่ใช่ done */

import { isoOffsetDays } from '@/data/dashboardCommon';

export const CUSTOM_REPORT_FREQUENCIES = [
  { value: 'daily',     label: 'รายวัน'      },
  { value: 'weekly',    label: 'รายสัปดาห์'  },
  { value: 'monthly',   label: 'รายเดือน'    },
  { value: 'quarterly', label: 'รายไตรมาส'   },
  { value: 'yearly',    label: 'รายปี'        },
  { value: 'adhoc',     label: 'เฉพาะกิจ'     },
];

export const frequencyLabel = (key) =>
  CUSTOM_REPORT_FREQUENCIES.find((f) => f.value === key)?.label || key || '—';

export const CUSTOM_REPORT_REQUESTERS = [
  { value: 'sanit',    label: 'กองสร้างเสริมสุขภาพ'      },
  { value: 'control',  label: 'กองควบคุมโรคติดต่อ'       },
  { value: 'ncd',      label: 'กองควบคุมโรคเอดส์ฯ'       },
  { value: 'pharmacy', label: 'กองเภสัชกรรม'             },
  { value: 'plan',     label: 'สำนักงานพัฒนาระบบสาธารณสุข' },
  { value: 'center',   label: 'ศูนย์บริการสาธารณสุข'      },
];

export const requesterLabel = (key) =>
  CUSTOM_REPORT_REQUESTERS.find((r) => r.value === key)?.label || key || '—';

export const CUSTOM_REPORT_STATUS = {
  live:      { label: 'เปิดใช้งานแล้ว', badge: 'success' },
  building:  { label: 'อยู่ระหว่างพัฒนา', badge: 'info'   },
  requested: { label: 'รอพิจารณา',        badge: 'warning' },
};

/** แม่แบบรายงานที่สำนักอนามัยกำหนดเพิ่มเติม (นอกเหนือ §1.20.1–1.20.10) */
export const CUSTOM_REPORT_TEMPLATES = [
  {
    id: 'cr-001',
    name: 'รายงานผลการดำเนินงานตามตัวชี้วัดสำนักอนามัย (KPI ประจำปี)',
    requester: 'plan',
    frequency: 'quarterly',
    status: 'live',
    owner: 'สำนักงานพัฒนาระบบสาธารณสุข',
    updatedAt: isoOffsetDays(-12),
    detail: 'สรุปผลตัวชี้วัด 24 ตัวของสำนักอนามัย แยกตามศูนย์บริการสาธารณสุขและรายไตรมาส',
    linkPath: '/dashboard/reports/service',
  },
  {
    id: 'cr-002',
    name: 'รายงานเฝ้าระวังโรคติดต่อตามฤดูกาล (ไข้เลือดออก/ไข้หวัดใหญ่)',
    requester: 'control',
    frequency: 'weekly',
    status: 'live',
    owner: 'กองควบคุมโรคติดต่อ',
    updatedAt: isoOffsetDays(-3),
    detail: 'จำนวนผู้ป่วยรายสัปดาห์แยกตามเขต พร้อมเส้นค่ามัธยฐาน 5 ปีย้อนหลัง',
    linkPath: '/dashboard/executive',
  },
  {
    id: 'cr-003',
    name: 'รายงานการใช้ยาปฏิชีวนะอย่างสมเหตุผล (RDU)',
    requester: 'pharmacy',
    frequency: 'monthly',
    status: 'live',
    owner: 'กองเภสัชกรรม',
    updatedAt: isoOffsetDays(-8),
    detail: 'สัดส่วนการสั่งใช้ยาปฏิชีวนะในกลุ่มโรค URI และอุจจาระร่วงเฉียบพลัน',
    linkPath: '/dashboard/reports/pharmacy',
  },
  {
    id: 'cr-004',
    name: 'รายงานสุขภาพผู้สูงอายุกลุ่มติดบ้านติดเตียงรายเขต',
    requester: 'sanit',
    frequency: 'monthly',
    status: 'building',
    owner: 'กองสร้างเสริมสุขภาพ',
    updatedAt: isoOffsetDays(-20),
    detail: 'เชื่อมข้อมูลเยี่ยมบ้านกับทะเบียนผู้สูงอายุ เพื่อประเมิน ADL รายเขต',
    linkPath: '/dashboard/clinics',
  },
  {
    id: 'cr-005',
    name: 'รายงานความครอบคลุมวัคซีนนักเรียนในโรงเรียนสังกัด กทม.',
    requester: 'sanit',
    frequency: 'yearly',
    status: 'building',
    owner: 'กองสร้างเสริมสุขภาพ',
    updatedAt: isoOffsetDays(-35),
    detail: 'ความครอบคลุม HPV / dT / MMR ของนักเรียน ป.5–ป.6 รายโรงเรียน',
    linkPath: '/dashboard/clinics',
  },
  {
    id: 'cr-006',
    name: 'รายงานผลการคัดกรองมะเร็งปากมดลูกและมะเร็งเต้านม',
    requester: 'ncd',
    frequency: 'quarterly',
    status: 'requested',
    owner: 'กองควบคุมโรคเอดส์ฯ',
    updatedAt: isoOffsetDays(-2),
    detail: 'ยังไม่มีชุดข้อมูลผลคัดกรองในระบบ ต้องรอการเชื่อมต่อกับระบบห้องปฏิบัติการก่อน',
    linkPath: '',
  },
];

/** In-memory request log — คำขอรายงานใหม่ที่ผู้ใช้ส่งจากหน้าศูนย์รวมรายงาน */
let requestLog = [
  {
    id: 'req-001',
    name: 'รายงานผู้ป่วยเบาหวานที่ควบคุมระดับน้ำตาลไม่ได้ 3 ครั้งติดต่อกัน',
    requester: 'ncd',
    frequency: 'monthly',
    detail: 'ต้องการรายชื่อ (แบบปกปิดข้อมูลส่วนบุคคล) เพื่อวางแผนติดตามเชิงรุกรายเขต',
    requestedBy: 'พญ.สมหญิง รักษ์ดี',
    requestedAt: `${isoOffsetDays(-5)} 10:24`,
    status: 'requested',
  },
];

/** ตัวนับที่เดินหน้าอย่างเดียว — ห้ามคิด id จาก `requestLog.length`
    เพราะความยาวลดลงเมื่อยกเลิกคำขอ ทำให้ id ซ้ำกับแถวที่ยังอยู่
    (เพิ่ม A → req-002, ยกเลิก req-001, เพิ่ม B → req-002 ซ้ำ) แล้ว
    ยกเลิก/แก้ไขจะไปโดนสองแถวพร้อมกัน และ React key ก็ชนกัน */
let requestSeq = requestLog.length;

export const listCustomReportRequests = () => [...requestLog];

/** บันทึกคำขอรายงานใหม่ (§1.20.11) พร้อม audit ผู้ขอ + เวลา */
export const addCustomReportRequest = ({ name, requester, frequency, detail, requestedBy }) => {
  const now = new Date();
  const stamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  requestSeq += 1;
  const entry = {
    id: `req-${String(requestSeq).padStart(3, '0')}`,
    name,
    requester,
    frequency,
    detail,
    requestedBy,
    requestedAt: `${isoOffsetDays(0)} ${stamp}`,
    status: 'requested',
  };
  requestLog = [entry, ...requestLog];
  return entry;
};

/** ยกเลิกคำขอที่ยังไม่ถูกรับพิจารณา (ทุกข้อ "แสดง/บันทึก/ยกเลิก/แก้ไข") */
export const cancelCustomReportRequest = (id) => {
  requestLog = requestLog.filter((r) => r.id !== id);
  return listCustomReportRequests();
};

/** แก้ไขคำขอเดิม */
export const updateCustomReportRequest = (id, patch) => {
  requestLog = requestLog.map((r) => (r.id === id ? { ...r, ...patch } : r));
  return listCustomReportRequests();
};

/** ข้อความแนะนำที่ใช้กับ SuggestibleTextarea ของช่อง "รายละเอียดรายงานที่ขอ" */
export const CUSTOM_REPORT_DETAIL_SUGGESTIONS = [
  'ต้องการข้อมูลย้อนหลัง 3 ปีงบประมาณ แยกตามศูนย์บริการสาธารณสุข',
  'ต้องการแยกตามเขตและแขวงของกรุงเทพมหานคร',
  'ต้องการเปรียบเทียบกับค่าเป้าหมายตามตัวชี้วัดของสำนักอนามัย',
  'ต้องการข้อมูลแบบปกปิดข้อมูลส่วนบุคคล (ไม่แสดงชื่อและเลขบัตรประชาชน)',
  'ต้องการส่งออกเป็นไฟล์ Excel เพื่อนำไปวิเคราะห์ต่อ',
  'ต้องการให้ระบบส่งรายงานอัตโนมัติทางอีเมลทุกต้นเดือน',
  'ต้องการแยกตามกลุ่มอายุและเพศ',
  'ต้องการแสดงแนวโน้มรายเดือนพร้อมค่าเฉลี่ยเคลื่อนที่',
];
