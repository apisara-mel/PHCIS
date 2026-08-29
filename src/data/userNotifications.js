/* TOR §1.17.5.5 — ระบบแจ้งเตือน: ศูนย์รวมการแจ้งเตือน + ตั้งค่าช่องทางรายบุคคล.

   หมวดเหตุการณ์ตาม TOR: รับส่งตัว · รับผล · ส่งตรวจ · ค่าวิกฤต

   ⚠️ ขอบเขต: การ "รับทราบ" ที่นี่เป็น mock ของงานผู้ดูแลระบบเท่านั้น —
   ทะเบียนค่าวิกฤตจริงของงานห้องปฏิบัติการอยู่ที่ src/data/labCritical.js
   (อ่านอย่างเดียวเพื่ออ้างอิงคำศัพท์/เกณฑ์เวลา) การรับทราบที่หน้านี้จะไม่
   เขียนทับสถานะฝั่งแลป ต้องไปรับทราบในระบบแลปแยกต่างหาก. */

import { CRITICAL_ESCALATE_MINUTES } from '@/data/labCritical';
import { USERS } from '@/data/usersAccess';

/* หมวดการแจ้งเตือน — อ้างข้อ TOR ที่เป็นต้นเหตุของแต่ละหมวดไว้ในตัว `tor`
   เพื่อให้ตรวจย้อนได้ว่าหมวดนี้มีเพราะอะไร ไม่ใช่คิดเอง (มติผู้ใช้ 29 ส.ค. 69)

   §1.17.5.5 เป็นข้อหลัก ("ในกรณีต่าง ๆ เช่น การรับส่งตัว การรับผล การส่งตรวจ")
   ส่วนที่เหลือเป็นข้อที่ระบุการแจ้งเตือนไว้เฉพาะเรื่อง */
export const NOTIFICATION_CATEGORIES = [
  { key: 'transfer',    label: 'รับส่งตัว',    icon: 'sync_alt',       tone: 'indigo', tor: '๑.๑๗.๕.๕', desc: 'ส่งต่อผู้ป่วยเข้า/ออก · การตอบรับหรือปฏิเสธการส่งต่อ' },
  { key: 'result',      label: 'รับผล',        icon: 'lab_profile',    tone: 'teal',   tor: '๑.๑๗.๕.๕', desc: 'ผลแลป / ผลรังสี ส่งกลับมาที่คลินิกต้นทาง' },
  { key: 'order',       label: 'ส่งตรวจ',      icon: 'send',           tone: 'blue',   tor: '๑.๑๗.๕.๕ · ๑.๕.๒.๙', desc: 'คำสั่งตรวจถูกส่ง ถูกรับเข้าห้องปฏิบัติการ หรือเป็นคำสั่งล่วงหน้าที่ถึงกำหนด' },
  { key: 'critical',    label: 'ค่าวิกฤต',     icon: 'emergency',      tone: 'red',    tor: '๑.๑๗.๕.๕', desc: 'ค่าวิกฤต (critical value) ต้องรับทราบภายในเวลาที่กำหนด' },
  { key: 'medication',  label: 'ยาและ CDSS',   icon: 'pill',           tone: 'orange', tor: '๑.๕.๔.๑๘–๒๑ · ๑.๙.๒.๙–๑๐', desc: 'แพ้ยา · ตีกัน · สั่งซ้ำ · เกินขนาด · สั่งนอกสิทธิ · แก้ไข/ยกเลิกคำสั่งยา' },
  { key: 'appointment', label: 'คิวและนัดหมาย', icon: 'event_upcoming', tone: 'green',  tor: '๔.๓.๕ · ๑.๖.๒.๖ · ๔.๒.๖', desc: 'เตือนก่อนถึงคิวหรือนัดหมาย · ผู้รับบริการยืนยัน/เลื่อน/ยกเลิกนัดผ่านแอปพลิเคชัน' },
  { key: 'flag',        label: 'ข้อมูลพึงระวัง', icon: 'flag',          tone: 'purple', tor: '๑.๑.๑.๑๙', desc: 'Flag ของผู้รับบริการที่ผู้ใช้งานที่เกี่ยวข้องต้องทราบ' },
  { key: 'inventory',   label: 'คลังยา',       icon: 'inventory_2',    tone: 'grey',   tor: '๕.๑.๑๖ · ๕.๑.๒๔.๗', desc: 'ยาใกล้หมดอายุ · คงเหลือต่ำกว่าเกณฑ์ · รออนุมัติ' },
];

export const SEVERITIES = [
  { key: 'normal',   label: 'ปกติ',     tone: 'grey'   },
  { key: 'urgent',   label: 'เร่งด่วน', tone: 'orange' },
  { key: 'critical', label: 'วิกฤต',    tone: 'red'    },
];

export const AUDIENCES = [
  { key: 'me',     label: 'ถึงฉัน' },
  { key: 'dept',   label: 'ถึงแผนก' },
  { key: 'center', label: 'ทั้งศูนย์' },
];

export const CHANNELS = [
  { key: 'inapp', label: 'ในระบบ', icon: 'notifications' },
  { key: 'email', label: 'อีเมล',  icon: 'mail' },
  { key: 'sms',   label: 'SMS',    icon: 'sms' },
];

/** เกณฑ์ escalation ของค่าวิกฤต — ยึดค่าเดียวกับทะเบียนแลป (อ่านอย่างเดียว). */
export const DEFAULT_ESCALATE_MINUTES = CRITICAL_ESCALATE_MINUTES;

const SEED = [
  {
    id: 'nt-001', category: 'critical', severity: 'critical', center: 'hc-4',
    title: 'ค่าวิกฤต: Potassium 6.8 mmol/L', patient: 'นางสมศรี ทองดี', hn: '00123456',
    body: 'ผลแลปเคมีคลินิกเกินเกณฑ์วิกฤต (K > 6.5) — ห้องปฏิบัติการโทรแจ้งแล้ว 10:41 น.',
    source: 'ห้องปฏิบัติการ', link: '/lab/results', audience: 'dept', dept: 'opd',
    at: '3 ส.ค. 2569 10:42', ageMinutes: 18, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-002', category: 'critical', severity: 'critical', center: 'hc-4',
    title: 'ค่าวิกฤต: Hb 5.2 g/dL', patient: 'นายประสิทธิ์ แซ่ลิ้ม', hn: '00119874',
    body: 'ผลโลหิตวิทยาต่ำกว่าเกณฑ์วิกฤต — ต้องรับทราบภายใน 30 นาที',
    source: 'ห้องปฏิบัติการ', link: '/lab/results', audience: 'me', dept: 'opd',
    at: '3 ส.ค. 2569 09:58', ageMinutes: 62, read: true, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-003', category: 'transfer', severity: 'urgent', center: 'hc-4',
    title: 'ส่งต่อผู้ป่วยเข้า — จากศูนย์ 25 ห้วยขวาง', patient: 'นางสาวมณี ศรีทอง', hn: '00131209',
    body: 'ขอส่งต่อเพื่อรับยาต้านไวรัสต่อเนื่อง — รอการตอบรับจากศูนย์ปลายทาง',
    source: 'ระบบส่งต่อผู้ป่วย', link: '/referral', audience: 'center', dept: 'std',
    at: '3 ส.ค. 2569 09:30', ageMinutes: 90, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-004', category: 'transfer', severity: 'normal', center: 'hc-4',
    title: 'ปลายทางตอบรับการส่งต่อแล้ว', patient: 'นายวิรัตน์ เกิดผล', hn: '00128877',
    body: 'โรงพยาบาลราชวิถีตอบรับการส่งต่อ นัดตรวจ 6 ส.ค. 2569 เวลา 09:00 น.',
    source: 'ระบบส่งต่อผู้ป่วย', link: '/referral', audience: 'me', dept: 'opd',
    at: '3 ส.ค. 2569 08:55', ageMinutes: 125, read: true, acknowledged: true, ackBy: 'นางสาวมาลี เจริญสุข', ackAt: '3 ส.ค. 2569 09:02', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-005', category: 'result', severity: 'urgent', center: 'hc-4',
    title: 'ผลรังสีกลับมาแล้ว — CXR ผิดปกติ', patient: 'นายสมพงษ์ ใจงาม', hn: '00120033',
    body: 'พบฝ้าที่ปอดขวาบน — รังสีแพทย์แนะนำให้ส่งตรวจเสมหะเพิ่ม',
    source: 'งานรังสีวินิจฉัย', link: '/xray', audience: 'dept', dept: 'tb',
    at: '3 ส.ค. 2569 08:40', ageMinutes: 140, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-006', category: 'result', severity: 'normal', center: 'hc-4',
    title: 'ผลแลปพร้อมแล้ว — CBC, FBS, Lipid', patient: 'นางบุญมี สุขสันต์', hn: '00114520',
    body: 'ผลครบทุกรายการ อยู่ในเกณฑ์ปกติ',
    source: 'ห้องปฏิบัติการ', link: '/lab/results', audience: 'me', dept: 'opd',
    at: '3 ส.ค. 2569 08:15', ageMinutes: 165, read: true, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-007', category: 'order', severity: 'normal', center: 'hc-4',
    title: 'คำสั่งตรวจถูกรับเข้าห้องแลปแล้ว', patient: 'นายเอกชัย รุ่งเรือง', hn: '00126641',
    body: 'รับสิ่งส่งตรวจครบ 3 หลอด — คาดว่าผลออกภายใน 2 ชั่วโมง',
    source: 'ห้องปฏิบัติการ', link: '/lab/receive', audience: 'me', dept: 'opd',
    at: '3 ส.ค. 2569 08:05', ageMinutes: 175, read: true, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-008', category: 'order', severity: 'normal', center: 'hc-4',
    title: 'ส่งตรวจใหม่ — HbA1c', patient: 'นางสาวจันทร์เพ็ญ ดีงาม', hn: '00130012',
    body: 'คำสั่งตรวจถูกส่งไปยังห้องปฏิบัติการเรียบร้อย',
    source: 'คลินิกโรคเรื้อรัง (NCD)', link: '/lab/orders', audience: 'dept', dept: 'opd',
    at: '3 ส.ค. 2569 07:52', ageMinutes: 188, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: true,
  },
  {
    id: 'nt-009', category: 'critical', severity: 'critical', center: 'hc-25',
    title: 'ค่าวิกฤต: Glucose 32 mg/dL', patient: 'นายสุชาติ พูนทรัพย์', hn: '00140088',
    body: 'ระดับน้ำตาลต่ำวิกฤต — ต้องรับทราบและติดต่อผู้ป่วยทันที',
    source: 'ห้องปฏิบัติการ', link: '/lab/results', audience: 'center', dept: 'opd',
    at: '3 ส.ค. 2569 10:20', ageMinutes: 40, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-010', category: 'transfer', severity: 'normal', center: 'hc-25',
    title: 'ส่งต่อผู้ป่วยออก — ไปศูนย์ 4 ดินแดง', patient: 'นางกัลยา วงศ์ทอง', hn: '00141277',
    body: 'ขอส่งต่อเพื่อทำทันตกรรม — รอศูนย์ปลายทางตอบรับ',
    source: 'ระบบส่งต่อผู้ป่วย', link: '/referral', audience: 'dept', dept: 'dental',
    at: '3 ส.ค. 2569 09:10', ageMinutes: 110, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-011', category: 'result', severity: 'normal', center: 'hc-25',
    title: 'ผลแลปพร้อมแล้ว — Urine analysis', patient: 'นายกิตติ ทรัพย์เจริญ', hn: '00142001',
    body: 'พบเม็ดเลือดขาวในปัสสาวะเล็กน้อย — แนะนำติดตามอาการ',
    source: 'ห้องปฏิบัติการ', link: '/lab/results', audience: 'me', dept: 'opd',
    at: '2 ส.ค. 2569 15:44', ageMinutes: 1096, read: true, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-012', category: 'order', severity: 'urgent', center: 'hc-15',
    title: 'คำสั่งตรวจด่วน — Troponin I', patient: 'นายอำนวย สุขใจ', hn: '00150432',
    body: 'ผู้ป่วยเจ็บหน้าอก — ส่งตรวจด่วน รอผลภายใน 30 นาที',
    source: 'ห้องอุบัติเหตุ-ฉุกเฉิน', link: '/lab/orders', audience: 'center', dept: 'opd',
    at: '3 ส.ค. 2569 10:05', ageMinutes: 55, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-013', category: 'medication', severity: 'critical', center: 'hc-4',
    title: 'CDSS: สั่งยาที่ผู้รับบริการแพ้ — Amoxicillin', patient: 'นางสาวมณี ศรีทอง', hn: '00131209',
    body: 'ประวัติแพ้ Penicillin (ผื่นลมพิษทั่วตัว) — ระบบระงับคำสั่งไว้รอการยืนยันจากแพทย์',
    source: 'ระบบสนับสนุนการตัดสินใจ (CDSS)', link: '/treat/queue', audience: 'me', dept: 'opd',
    at: '3 ส.ค. 2569 10:35', ageMinutes: 25, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-014', category: 'medication', severity: 'urgent', center: 'hc-4',
    title: 'CDSS: ยาตีกัน — Warfarin + Ibuprofen', patient: 'นายวิรัตน์ เกิดผล', hn: '00128877',
    body: 'เสี่ยงเลือดออกเพิ่มขึ้น — แนะนำเปลี่ยนเป็น Paracetamol หรือปรึกษาเภสัชกร',
    source: 'ระบบสนับสนุนการตัดสินใจ (CDSS)', link: '/treat/queue', audience: 'me', dept: 'opd',
    at: '3 ส.ค. 2569 10:12', ageMinutes: 48, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-015', category: 'medication', severity: 'normal', center: 'hc-4',
    title: 'แพทย์แก้ไขคำสั่งยา — แจ้งห้องยา', patient: 'นางบุญมี สุขสันต์', hn: '00114520',
    body: 'เปลี่ยนขนาด Metformin จาก 500 mg เป็น 850 mg วันละ 2 ครั้ง',
    source: 'ระบบบันทึกการรักษา', link: '/pharmacy/queue', audience: 'dept', dept: 'pharmacy',
    at: '3 ส.ค. 2569 09:48', ageMinutes: 72, read: true, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-016', category: 'appointment', severity: 'normal', center: 'hc-4',
    title: 'พรุ่งนี้มีนัดหมาย 11 ราย', patient: '', hn: '',
    body: 'คลินิกตรวจรักษา 6 ราย · ฝากครรภ์ 3 ราย · ทันตกรรม 2 ราย — ตรวจสอบการเตรียมล่วงหน้าได้ที่แท็บนัดล่วงหน้า',
    source: 'ระบบนัดหมาย', link: '/treat/queue', audience: 'dept', dept: 'opd',
    at: '3 ส.ค. 2569 09:00', ageMinutes: 120, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-017', category: 'appointment', severity: 'urgent', center: 'hc-4',
    title: 'ผู้รับบริการใกล้ถึงคิว — A012', patient: 'นายวิชัย รุ่งเรือง', hn: '00126641',
    body: 'เหลืออีก 2 คิวจะถึงคิวนี้ — เตรียมเรียกเข้าห้องตรวจ',
    source: 'ระบบบริหารจัดการคิว', link: '/treat/queue', audience: 'me', dept: 'opd',
    at: '3 ส.ค. 2569 10:50', ageMinutes: 10, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-018', category: 'flag', severity: 'urgent', center: 'hc-4',
    title: 'ข้อมูลพึงระวัง: แพ้ยา + ตั้งครรภ์', patient: 'นางสาวจันทร์เพ็ญ ดีงาม', hn: '00130012',
    body: 'ผู้รับบริการที่กำลังเข้าตรวจมี Flag แพ้ยา (Sulfa) และอยู่ระหว่างตั้งครรภ์ 12 สัปดาห์',
    source: 'เวชระเบียน', link: '/registration/queue', audience: 'me', dept: 'opd',
    at: '3 ส.ค. 2569 10:44', ageMinutes: 16, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-021', category: 'appointment', severity: 'normal', center: 'hc-4',
    title: 'ยืนยันนัดหมายผ่านแอปแล้ว — 4 ก.ย. 69 09:00 น.', patient: 'นางสาวมณี ศรีทอง', hn: '00131209',
    body: 'ผู้รับบริการกดยืนยันนัดในแอปพลิเคชันประชาชน · คลินิกตรวจรักษา · นพ. วันชัย อยู่เย็น',
    source: 'แอปพลิเคชันประชาชน', link: '/appointment', audience: 'dept', dept: 'opd',
    appointment: {
      id: 'AP-69-004821', date: '4 ก.ย. 2569', time: '09:00 น.',
      clinic: 'คลินิกตรวจรักษา', doctor: 'นพ. วันชัย อยู่เย็น',
      type: 'ตรวจตามนัด', channel: 'แอปพลิเคชันประชาชน',
      confirmed: true, confirmedAt: '3 ส.ค. 2569 10:48',
      note: 'งดน้ำงดอาหารก่อนเจาะเลือด 8 ชั่วโมง',
    },
    at: '3 ส.ค. 2569 10:48', ageMinutes: 12, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-022', category: 'appointment', severity: 'urgent', center: 'hc-4',
    title: 'ขอเลื่อนนัดผ่านแอป — รอเจ้าหน้าที่ยืนยัน', patient: 'นายเอกชัย รุ่งเรือง', hn: '00126641',
    body: 'ขอเลื่อนจาก 5 ก.ย. 69 เป็น 12 ก.ย. 69 (เหตุผล: ติดภารกิจ) — ต้องตรวจสอบ slot ว่างก่อนตอบกลับ',
    source: 'แอปพลิเคชันประชาชน', link: '/appointment', audience: 'dept', dept: 'opd',
    appointment: {
      id: 'AP-69-004902', date: '12 ก.ย. 2569', time: '10:30 น.',
      clinic: 'คลินิกตรวจรักษา', doctor: 'พญ. สุภาพร มณีรัตน์',
      type: 'ขอเลื่อนนัด', channel: 'แอปพลิเคชันประชาชน',
      confirmed: false, confirmedAt: '',
      note: 'เดิมนัด 5 ก.ย. 69 13:00 น. · เหตุผล: ติดภารกิจ',
    },
    at: '3 ส.ค. 2569 10:26', ageMinutes: 34, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-023', category: 'appointment', severity: 'urgent', center: 'hc-4',
    title: 'ยกเลิกนัดผ่านแอป — 6 ก.ย. 69 13:30 น.', patient: 'นางกัลยา วงศ์ทอง', hn: '00141277',
    body: 'ผู้รับบริการยกเลิกนัดทันตกรรมเอง — slot ว่างแล้ว จัดคิวให้รายอื่นได้',
    source: 'แอปพลิเคชันประชาชน', link: '/appointment', audience: 'dept', dept: 'dental',
    at: '3 ส.ค. 2569 09:12', ageMinutes: 108, read: true, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-024', category: 'appointment', severity: 'normal', center: 'hc-4',
    title: 'ยังไม่ยืนยันนัด 5 ราย — นัดพรุ่งนี้', patient: 'นางกัลยา วงศ์ทอง', hn: '00141277',
    body: 'ส่งแจ้งเตือนผ่านแอปแล้วแต่ยังไม่กดยืนยัน — ควรโทรยืนยันก่อนสิ้นวัน',
    source: 'แอปพลิเคชันประชาชน', link: '/appointment', audience: 'dept', dept: 'opd',
    appointment: {
      id: 'AP-69-004777', date: '30 ส.ค. 2569', time: '13:30 น.',
      clinic: 'คลินิกทันตกรรม', doctor: 'ทพ. สมชาย ใสสวัสดี',
      type: 'ตรวจตามนัด', channel: 'แอปพลิเคชันประชาชน',
      confirmed: false, confirmedAt: '',
      note: 'ส่งแจ้งเตือนแล้ว 2 ครั้ง ยังไม่ตอบกลับ',
    },
    at: '3 ส.ค. 2569 08:30', ageMinutes: 150, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-019', category: 'inventory', severity: 'urgent', center: 'hc-4',
    title: 'ยาใกล้หมดอายุ 6 รายการ', patient: '', hn: '',
    body: 'Amoxicillin 500 mg (หมดอายุ 15 ก.ย. 69) และอีก 5 รายการ — ควรเบิกใช้ก่อนหรือส่งคืนคลังกลาง',
    source: 'คลังยาและเวชภัณฑ์', link: '/pharmacy/stock', audience: 'dept', dept: 'pharmacy',
    at: '3 ส.ค. 2569 08:00', ageMinutes: 180, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-020', category: 'inventory', severity: 'normal', center: 'hc-4',
    title: 'ยาคงเหลือต่ำกว่าเกณฑ์ — Losartan 50 mg', patient: '', hn: '',
    body: 'คงเหลือ 120 เม็ด ต่ำกว่าจุดสั่งซื้อ (500 เม็ด) — ใบขอเบิกรออนุมัติอยู่ 1 ใบ',
    source: 'คลังยาและเวชภัณฑ์', link: '/pharmacy/stock', audience: 'dept', dept: 'pharmacy',
    at: '2 ส.ค. 2569 16:20', ageMinutes: 1060, read: true, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
];

let ITEMS = SEED.map((n) => ({ ...n }));
const listeners = new Set();
const notify = () => listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });

export const subscribeNotifications = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getNotifications = (centerValue = null) =>
  ITEMS.filter((n) => !centerValue || n.center === centerValue).map((n) => ({ ...n }));

export const unreadCount = (centerValue = null) =>
  getNotifications(centerValue).filter((n) => !n.read).length;

export const pendingCriticalCount = (centerValue = null) =>
  getNotifications(centerValue).filter((n) => n.category === 'critical' && !n.acknowledged).length;

export const urgentCount = (centerValue = null) =>
  getNotifications(centerValue).filter((n) => n.severity !== 'normal' && !n.acknowledged).length;

const stamp = () => new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

/** ยืนยันนัดหมายที่มากับการแจ้งเตือน — ใช้จากศูนย์รวมแจ้งเตือนโดยตรง
    เจ้าหน้าที่ไม่ต้องเปิดหน้าอื่นเพื่อกดยืนยันสิ่งที่อ่านอยู่ตรงหน้า
    (มติผู้ใช้ 29 ส.ค. 69) */
export function confirmAppointment(id, at = '') {
  const i = ITEMS.findIndex((n) => n.id === id);
  if (i < 0 || !ITEMS[i].appointment) return;
  ITEMS[i] = {
    ...ITEMS[i],
    read: true,
    appointment: { ...ITEMS[i].appointment, confirmed: true, confirmedAt: at },
  };
  notify();
}

export function markRead(id, read = true) {
  const n = ITEMS.find((x) => x.id === id);
  if (n) n.read = read;
  notify();
}

export function markAllRead(centerValue) {
  ITEMS.forEach((n) => { if (!centerValue || n.center === centerValue) n.read = true; });
  notify();
}

/** รับทราบ — บังคับสำหรับค่าวิกฤต, บันทึกผู้รับทราบ + เวลา. */
export function acknowledge(id, actor) {
  const n = ITEMS.find((x) => x.id === id);
  if (!n) return null;
  n.acknowledged = true;
  n.read = true;
  n.ackBy = actor;
  n.ackAt = stamp();
  notify();
  return { ...n };
}

/** ยกเลิกการรับทราบ (กรณีกดผิด) — TOR "ยกเลิก". */
export function revokeAcknowledge(id) {
  const n = ITEMS.find((x) => x.id === id);
  if (!n) return null;
  n.acknowledged = false;
  n.ackBy = '';
  n.ackAt = '';
  notify();
  return { ...n };
}

/** มอบหมายต่อให้เจ้าหน้าที่คนอื่น. */
export function assignTo(id, userName) {
  const n = ITEMS.find((x) => x.id === id);
  if (!n) return null;
  n.assignedTo = userName;
  n.read = true;
  notify();
  return { ...n };
}

export function resetNotifications() {
  ITEMS = SEED.map((n) => ({ ...n }));
  notify();
}

/** เกินเกณฑ์ escalation แล้วหรือยัง (ยังไม่รับทราบ + อายุ > N นาที). */
export const isEscalated = (n, minutes = DEFAULT_ESCALATE_MINUTES) =>
  n.category === 'critical' && !n.acknowledged && n.ageMinutes > minutes;

/* ── ตั้งค่าช่องทางรายบุคคล ─────────────────────────────────────────────
   เก็บชุดเดียวกับแท็บ "การแจ้งเตือน" ใน UserEditPage — ห้ามแยก store. */

const DEFAULT_PREF = () => ({
  channels: {
    transfer: { inapp: true,  email: true,  sms: false },
    result:   { inapp: true,  email: false, sms: false },
    order:    { inapp: true,  email: false, sms: false },
    critical: { inapp: true,  email: true,  sms: true  },
  },
  quietHours: { enabled: false, start: '22:00', end: '06:00' },
  escalateMinutes: DEFAULT_ESCALATE_MINUTES,
  escalateTo: 'หัวหน้าเวร',
});

const PREFS = new Map();
USERS.forEach((u) => PREFS.set(u.id, DEFAULT_PREF()));
/* ตัวอย่างที่ตั้งค่าต่างจาก default เพื่อให้เห็นว่าเก็บรายบุคคลจริง */
const nightNurse = PREFS.get('u-004');
if (nightNurse) {
  nightNurse.quietHours = { enabled: true, start: '22:00', end: '06:00' };
  nightNurse.channels.result.sms = true;
}

const prefListeners = new Set();
const notifyPrefs = () => prefListeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
export const subscribeNotificationPrefs = (fn) => {
  prefListeners.add(fn);
  return () => prefListeners.delete(fn);
};

export function getNotificationPref(userId) {
  if (!PREFS.has(userId)) PREFS.set(userId, DEFAULT_PREF());
  return JSON.parse(JSON.stringify(PREFS.get(userId)));
}

/** บันทึกการตั้งค่า — บล็อกถ้าปิดทุกช่องทางของหมวดค่าวิกฤต. */
export function saveNotificationPref(userId, pref) {
  const errors = validateNotificationPref(pref);
  if (Object.keys(errors).length) return { ok: false, errors };
  PREFS.set(userId, JSON.parse(JSON.stringify(pref)));
  notifyPrefs();
  return { ok: true, errors: {} };
}

export function validateNotificationPref(pref) {
  const errors = {};
  const crit = pref?.channels?.critical || {};
  if (!crit.inapp) errors.critical = 'หมวดค่าวิกฤตต้องเปิดการแจ้งเตือน "ในระบบ" เสมอ ปิดไม่ได้';
  else if (!crit.inapp && !crit.email && !crit.sms) errors.critical = 'ปิดทุกช่องทางของหมวดค่าวิกฤตไม่ได้';
  const q = pref?.quietHours;
  if (q?.enabled && q.start === q.end) errors.quietHours = 'เวลาเริ่มและสิ้นสุดของช่วงห้ามรบกวนต้องไม่เท่ากัน';
  const mins = Number(pref?.escalateMinutes);
  if (!Number.isFinite(mins) || mins < 5 || mins > 240) errors.escalateMinutes = 'กำหนดได้ระหว่าง 5–240 นาที';
  return errors;
}

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return (h % 24) * 60 + (m || 0);
};

/** ช่วงห้ามรบกวนคร่อมเที่ยงคืนต้องคำนวณถูก (22:00–06:00). */
export function isQuietNow(quietHours, now = new Date()) {
  if (!quietHours?.enabled) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(quietHours.start);
  const end = toMinutes(quietHours.end);
  if (start === end) return false;
  return start < end ? (cur >= start && cur < end) : (cur >= start || cur < end);
}
