import { PATIENT_PROFILES } from '@/data/patientProfiles';
import {
  XRAY_EXAMS, XRAY_EXAM_BY_ID, XRAY_MODALITY_BY_KEY, XRAY_REGION_BY_KEY,
  XRAY_RIGHT_BY_KEY, XRAY_VIEWS, claimFor,
} from '@/data/xrayCatalog';
import { XRAY_RADIOLOGISTS, XRAY_RADIOGRAPHERS } from '@/data/xrayResultTemplates';

/* Worklist rows for the X-ray (RIS) module. Mock data, not wired to a
   backend — same tier as labOrders.js / treatmentQueue.js. Exam definitions
   live in xrayCatalog.js; this file is only the day's requests on top of
   that catalog.

   Grounded in:
     • TOR ภาคผนวก ก §1.12 (docs/tor-checklist.html) — cited per field.
     • คู่มือ MyHOSPITAL งานรังสีวิทยา (X-Ray) — the pipeline screens:
       Request รายการ X-Ray → รับ Request แผนกอื่น → บันทึกผล → ยืนยันผล,
       with ปฏิเสธรับ Request / ยกเลิกการรายงานผล / ประวัติยกเลิก as the
       exception paths (manual pages 6–9).
     • คู่มืออบรมระบบงานรังสีวินิจฉัย สำนักอนามัย §2.2 ลำดับการตรวจผู้ป่วย —
       the 5-tab worklist ("การเรียงลำดับงานตามขั้นตอนการทำงานของระบบ"),
       which is exactly the status pipeline below rendered as tabs. */

/* ─────────────────────────────────────────────────────────────────────────
   STATUS FLOW

   The MyHOSPITAL screens map 1:1 onto these stages: Request รายการ X-Ray
   creates `requested`; รับ Request แผนกอื่น moves it to `accepted`; the
   radiographer's exposure makes it `performed`; บันทึกผล X-Ray → `reported`;
   ยืนยันผล X-Ray → `verified`. `scheduled` is the นัดตรวจ branch (legacy
   §2.2: changing วันเวลาส่ง/นัด flips ลักษณะการขอตรวจ to นัดตรวจ
   automatically) — the row re-enters at `accepted` when the patient shows
   up on the appointment day.

   `terminalForDoctor` — the ordering doctor may only read the report after
   ยืนยันผล (mirrors the lab's "แพทย์จะดูได้ต่อเมื่อได้รับอนุมัติผล" gate):
   only `verified` clears it.

   `color` uses only the style keys StatusBadge.jsx supports
   (neutral | info | success | warning | error | yellow). */
export const XRAY_STATUSES = [
  { key: 'requested', thai: 'รอรับรายการ (Request)',      short: 'รอรับรายการ', icon: 'assignment',   color: 'neutral', terminalForDoctor: false },
  { key: 'scheduled', thai: 'นัดตรวจ',                    short: 'นัดตรวจ',     icon: 'event',        color: 'yellow',  terminalForDoctor: false },
  { key: 'accepted',  thai: 'รอตรวจ (รับ Request แล้ว)',  short: 'รอตรวจ',      icon: 'schedule',     color: 'info',    terminalForDoctor: false },
  { key: 'performed', thai: 'ถ่ายแล้ว / รอบันทึกผล',      short: 'รอบันทึกผล',  icon: 'radiology',    color: 'warning', terminalForDoctor: false },
  { key: 'reported',  thai: 'บันทึกผลแล้ว / รอยืนยัน',    short: 'รอยืนยันผล',  icon: 'edit_note',    color: 'info',    terminalForDoctor: false },
  { key: 'verified',  thai: 'ยืนยันผลแล้ว',               short: 'ยืนยันผล',    icon: 'check_circle', color: 'success', terminalForDoctor: true },
];

export const XRAY_STATUS_BY_KEY = Object.fromEntries(XRAY_STATUSES.map((s) => [s.key, s]));

/* Off-pipeline outcomes — MyHOSPITAL manual pages 8–9. Not tabs of their
   own: a rejected request goes BACK to the ordering doctor to fix
   (TOR §1.12.5.6 lets the radiologist demand a complete order), a
   cancelled report re-enters at `performed` for re-reporting, so the
   exception rides on the row alongside `status` + `cancelReason` instead
   of replacing the status. ประวัติยกเลิก (manual p.9) filters on these. */
export const XRAY_EXCEPTIONS = [
  { key: 'rejected',        thai: 'ปฏิเสธรับ Request',     icon: 'block',  color: 'error' },
  { key: 'cancelled',       thai: 'ยกเลิกรายการตรวจ',      icon: 'cancel', color: 'error' },
  { key: 'reportCancelled', thai: 'ยกเลิกการรายงานผล',     icon: 'undo',   color: 'warning' },
];

export const XRAY_EXCEPTION_BY_KEY = Object.fromEntries(XRAY_EXCEPTIONS.map((e) => [e.key, e]));

/* ความเร่งด่วน — TOR §1.12.5.4 lists ความเร่งด่วน as the first order-table
   column. STAT sorts to the top (rank 0) and renders red; `slaMinutes`
   drives the aging column (a STAT portable chest must be shot within half
   an hour). */
export const XRAY_URGENCIES = [
  { key: 'stat',    thai: 'ด่วนที่สุด (STAT)', rank: 0, slaMinutes: 30,  color: 'error' },
  { key: 'urgent',  thai: 'ด่วน',              rank: 1, slaMinutes: 120, color: 'warning' },
  { key: 'routine', thai: 'ปกติ',              rank: 2, slaMinutes: 480, color: 'neutral' },
];

export const XRAY_URGENCY_BY_KEY = Object.fromEntries(XRAY_URGENCIES.map((u) => [u.key, u]));

/* คลินิกที่ขอตรวจ — TOR §1.12.5.2 requires the order header to show the
   requesting clinic. Values are this app's real ศบส. departments (the same
   ones the OPD side routes to), not a hospital ward list. */
export const XRAY_LOCATIONS = [
  'ตรวจรักษาทั่วไป (OPD)',
  'คลินิกทันตกรรม',
  'คลินิกวัณโรค',
  'คลินิกฝากครรภ์ (ANC)',
  'คลินิกสุขภาพจิต',
  'คลินิกโรคติดต่อทางเพศสัมพันธ์และเอดส์',
  'ห้องสังเกตอาการ',
  'งานส่งเสริมสุขภาพ',
];

/* ลักษณะการขอตรวจ — legacy §2.1 item 2. The legacy behaviour to preserve:
   editing วันเวลาส่ง/นัด to a future date flips the type to นัดตรวจ
   automatically and opens ใบนัดตรวจรังสี for printing (§2.2 การนัดตรวจ);
   TOR §1.12.3 carries the appointment requirement forward. */
export const XRAY_REQUEST_TYPES = [
  { key: 'walkin',      thai: 'ส่งตรวจทันที' },
  { key: 'appointment', thai: 'นัดตรวจ' },
];

/* ประเภทผลตรวจ — TOR §1.12.6.9 verbatim: "ปกติ ผิดปกติ ผิดปกติเร่งด่วน
   ไม่ชัดเจน เป็นอย่างน้อย". `abnormalUrgent` is the one that must page the
   ordering doctor immediately (active TB, fracture); §1.12.6.8 searches
   filter on these keys. Colors are StatusBadge style keys. */
export const XRAY_RESULT_TYPES = [
  { key: 'normal',         thai: 'ปกติ',             color: 'success' },
  { key: 'abnormal',       thai: 'ผิดปกติ',          color: 'warning' },
  { key: 'abnormalUrgent', thai: 'ผิดปกติเร่งด่วน',   color: 'error' },
  { key: 'inconclusive',   thai: 'ไม่ชัดเจน',        color: 'neutral' },
];

export const XRAY_RESULT_TYPE_BY_KEY = Object.fromEntries(XRAY_RESULT_TYPES.map((r) => [r.key, r]));

/* ─────────────────────────────────────────────────────────────────────────
   XN — TOR §1.12.5.2 "เลข XN ระบบ Automatic Generate เลข XN". One XN per
   REQUEST (all rows of one order share it), format X{BE-year-2}-{seq}
   matching the lab's L69-XXXX accession convention (69 = พ.ศ. 2569). */
const XN_YEAR = '69';
export const generateXN = (seq) => `X${XN_YEAR}-${String(seq).padStart(4, '0')}`;

/* ISO ของ "วันนี้ ลบ n วัน" — ใช้สร้างวันที่ให้ mock กระจายหลายวัน
   คิวที่ยังไม่จบ (requested/accepted/performed) ต้องเป็นวันนี้เสมอ เพราะเป็น
   งานค้างหน้าเครื่อง ส่วนใบที่อ่านผล/รับรองแล้วย้อนหลังได้ */
const dayAgoISO = (n) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const XRAY_TODAY_ISO = dayAgoISO(0);

const NAMED = (i) => PATIENT_PROFILES[i % PATIENT_PROFILES.length];
const RADIOLOGIST = (i) => XRAY_RADIOLOGISTS[i % XRAY_RADIOLOGISTS.length];
const RADIOGRAPHER = (i) => XRAY_RADIOGRAPHERS[i % XRAY_RADIOGRAPHERS.length];

/* Display string for an exam's views ("PA", "AP/Lateral") — resolved once
   here so curated rows stay literal-free. */
const VIEW_BY_KEY = Object.fromEntries(XRAY_VIEWS.map((v) => [v.key, v]));
const viewLabel = (exam) =>
  (exam?.views ?? []).map((k) => VIEW_BY_KEY[k]?.code ?? k).join('/') || '—';

/* Every row carries the full §1.12.5 field set; BLANK keeps the curated
   rows readable by defaulting the not-yet-reached pipeline fields.
     allergy     §1.12.5.3 — ประวัติการแพ้ สารที่แพ้ + ช่องระบุอาการ (the
                 gate before any contrast exam).
     pregnancy   §1.12.5.3 — ประวัติประจำเดือน/การตั้งครรภ์ (asked before
                 irradiating a female's abdomen/pelvis; `lmp` = LMP date).
     note        §1.12.5.8 — ข้อมูลเพิ่มเติม (Note).
     amendments  §1.12.6.3 — ประวัติการแก้ไขผล when the SAME doctor edits
                 their own verified report.
     lockedBy    §1.12.6.3 — radiologist ID that owns the report; any other
                 doctor's edit must be refused. (radiologist/radiographer
                 hold display NAMES; lockedBy holds the ID for the guard.)
     cancelReason exception paths (manual pp.8–9). */
const BLANK = {
  /* วันที่ส่งตรวจ (ISO) — แยกจาก orderedAt ที่เก็บแค่ "เวลา"
     §1.12.6.8 ต้องกรองตาม "ช่วงเวลาที่ตรวจ" ได้จริง ซึ่งทำไม่ได้ถ้า mock
     ทุกใบเป็นวันเดียวกัน (ตัวกรองเลยไม่เคยตัดอะไรออกเลย) */
  orderedOn: null,
  scheduledAt: null, acceptedAt: null, performedAt: null, reportedAt: null, verifiedAt: null,
  radiographer: null, radiologist: null,
  allergy: { has: false, agent: '', symptom: '' },
  pregnancy: { status: null, lmp: null },
  diagnosis: '', note: '',
  resultType: null, technique: '', findings: '', impression: '',
  amendments: [], lockedBy: null, cancelReason: null,
};

/* Builds price + claim from the catalog so money never drifts from the
   exam definition (§1.12.4.2). */
const money = (examId, rightKey) => {
  const { price, claim } = claimFor(XRAY_EXAM_BY_ID[examId], rightKey);
  return { price, claimAmount: claim };
};

/* One row per requested exam; rows sharing `orderId`/`xn` came from one
   request (ORD-X405 below shows the multi-exam case). */
const CURATED_ORDERS = [
  /* requested — TB screening walk-in, the คลินิกวัณโรค bread-and-butter. */
  {
    ...BLANK,
    id: 'XR-0001', orderId: 'ORD-X401', xn: generateXN(412),
    hn: NAMED(5).hn, patient: NAMED(5),
    examId: 'xr-cxr-pa', examLabel: 'เอกซเรย์ทรวงอก (CXR) PA',
    modality: 'xr', region: 'chest', view: 'PA', filmSizes: ['14x17'],
    urgency: 'routine', status: 'requested', requestType: 'walkin',
    orderedAt: '08:05', orderingLocation: 'คลินิกวัณโรค', orderedBy: NAMED(5).doctor,
    rightKey: 'UCS', ...money('xr-cxr-pa', 'UCS'),
    clinicalSummary: 'ไอเรื้อรัง 3 สัปดาห์ มีไข้ต่ำ ๆ ตอนเย็น น้ำหนักลด 4 กก. ใน 1 เดือน',
    diagnosis: 'R/O pulmonary tuberculosis',
  },

  /* requested + STAT — sorts to the very top of the worklist (rank 0). */
  {
    ...BLANK,
    id: 'XR-0002', orderId: 'ORD-X402', xn: generateXN(413),
    hn: NAMED(6).hn, patient: NAMED(6),
    examId: 'xr-acute-abd', examLabel: 'เอกซเรย์ช่องท้องเฉียบพลัน (Acute abdomen series)',
    modality: 'xr', region: 'abdomen', view: 'AP-SUP/AP-UPR', filmSizes: ['14x17', '14x17'],
    urgency: 'stat', status: 'requested', requestType: 'walkin',
    orderedAt: '08:12', orderingLocation: 'ห้องสังเกตอาการ', orderedBy: NAMED(6).doctor,
    rightKey: 'SSS', ...money('xr-acute-abd', 'SSS'),
    clinicalSummary: 'ปวดท้องรุนแรงทั่วท้อง 2 ชั่วโมง กดเจ็บ มี guarding และ rebound tenderness',
    diagnosis: 'R/O hollow viscus perforation',
    note: 'ผู้ป่วยรออยู่ห้องสังเกตอาการ — แจ้งผลทันทีที่ถ่ายเสร็จ',
  },

  /* scheduled — นัดหน่วยแมมโมแกรมเคลื่อนที่ (mobile unit visits monthly).
     ลักษณะการขอตรวจ flips to นัดตรวจ per legacy §2.2. */
  {
    ...BLANK,
    id: 'XR-0003', orderId: 'ORD-X403', xn: generateXN(414),
    hn: NAMED(2).hn, patient: NAMED(2),
    examId: 'mg-bilateral', examLabel: 'แมมโมแกรมทั้งสองข้าง',
    modality: 'mg', region: 'breast', view: 'CC/MLO', filmSizes: ['digital'],
    urgency: 'routine', status: 'scheduled', requestType: 'appointment',
    orderedAt: '08:20', scheduledAt: '5 ส.ค. 2569 09:00',
    orderingLocation: 'งานส่งเสริมสุขภาพ', orderedBy: NAMED(2).doctor,
    rightKey: 'OFC', ...money('mg-bilateral', 'OFC'),
    pregnancy: { status: 'หมดประจำเดือน', lmp: null },
    clinicalSummary: 'คัดกรองมะเร็งเต้านมตามเกณฑ์อายุ ไม่มีก้อนที่คลำได้',
    note: 'นัดรอบหน่วยแมมโมแกรมเคลื่อนที่ประจำเดือนสิงหาคม — พิมพ์ใบนัดตรวจรังสีแล้ว',
  },

  /* accepted — pregnant patient, OB ultrasound from ANC. The pregnancy
     block (§1.12.5.3) is WHY the order screen can allow US but must block
     abdominal radiography for this patient. */
  {
    ...BLANK,
    id: 'XR-0004', orderId: 'ORD-X404', xn: generateXN(415),
    hn: NAMED(1).hn, patient: NAMED(1),
    examId: 'us-ob', examLabel: 'อัลตราซาวด์ครรภ์ (OB Ultrasound)',
    modality: 'us', region: 'obstetric', view: '—', filmSizes: ['digital'],
    urgency: 'routine', status: 'accepted', requestType: 'walkin',
    orderedAt: '08:25', acceptedAt: '08:38',
    orderingLocation: 'คลินิกฝากครรภ์ (ANC)', orderedBy: NAMED(1).doctor,
    radiographer: RADIOGRAPHER(1).name,
    rightKey: 'UCS', ...money('us-ob', 'UCS'),
    pregnancy: { status: 'ตั้งครรภ์', lmp: '2 พ.ค. 2569' },
    clinicalSummary: 'ฝากครรภ์ครั้งแรก อายุครรภ์ประมาณ 12 สัปดาห์ (นับจาก LMP) ยืนยันอายุครรภ์',
    note: 'ตั้งครรภ์ — ห้ามสั่งภาพรังสีช่องท้อง/เชิงกรานโดยไม่ปรึกษารังสีแพทย์',
  },

  /* accepted — two rows of ONE order (ORD-X405 shares one XN, §1.12.5.2)
     so groupByOrder/rollUpOrderStatus have a real multi-exam case. */
  {
    ...BLANK,
    id: 'XR-0005', orderId: 'ORD-X405', xn: generateXN(416),
    hn: NAMED(4).hn, patient: NAMED(4),
    examId: 'xr-lsspine', examLabel: 'เอกซเรย์กระดูกสันหลังส่วนเอว AP/Lateral',
    modality: 'xr', region: 'lsspine', view: 'AP/LAT', filmSizes: ['14x17', '14x17'],
    urgency: 'routine', status: 'accepted', requestType: 'walkin',
    orderedAt: '08:30', acceptedAt: '08:44',
    orderingLocation: 'ตรวจรักษาทั่วไป (OPD)', orderedBy: NAMED(4).doctor,
    radiographer: RADIOGRAPHER(0).name,
    rightKey: 'UCS', ...money('xr-lsspine', 'UCS'),
    pregnancy: { status: 'หมดประจำเดือน', lmp: null },
    clinicalSummary: 'ปวดหลังส่วนล่างเรื้อรัง 3 เดือน ร้าวลงขาขวา เดินแล้วปวดมากขึ้น',
    diagnosis: 'R/O lumbar spondylosis',
  },
  {
    ...BLANK,
    id: 'XR-0006', orderId: 'ORD-X405', xn: generateXN(416),
    hn: NAMED(4).hn, patient: NAMED(4),
    examId: 'xr-lsspine-obl', examLabel: 'เอกซเรย์กระดูกสันหลังส่วนเอว Oblique (ซ้าย-ขวา)',
    modality: 'xr', region: 'lsspine', view: 'OBL', filmSizes: ['14x17', '14x17'],
    urgency: 'routine', status: 'accepted', requestType: 'walkin',
    orderedAt: '08:30', acceptedAt: '08:44',
    orderingLocation: 'ตรวจรักษาทั่วไป (OPD)', orderedBy: NAMED(4).doctor,
    radiographer: RADIOGRAPHER(0).name,
    rightKey: 'UCS', ...money('xr-lsspine-obl', 'UCS'),
    pregnancy: { status: 'หมดประจำเดือน', lmp: null },
    clinicalSummary: 'ปวดหลังส่วนล่างเรื้อรัง 3 เดือน ร้าวลงขาขวา เดินแล้วปวดมากขึ้น',
    diagnosis: 'R/O lumbar spondylosis',
  },

  /* performed — exposure done, waiting for the report (บันทึกผล tab). */
  {
    ...BLANK,
    id: 'XR-0007', orderId: 'ORD-X406', xn: generateXN(417),
    hn: NAMED(7).hn, patient: NAMED(7),
    examId: 'xr-knee', examLabel: 'เอกซเรย์ข้อเข่า AP/Lateral',
    modality: 'xr', region: 'lowerext', view: 'AP/LAT', filmSizes: ['10x12', '10x12'],
    urgency: 'routine', status: 'performed', requestType: 'walkin',
    orderedAt: '08:35', acceptedAt: '08:50', performedAt: '09:10',
    orderingLocation: 'ตรวจรักษาทั่วไป (OPD)', orderedBy: NAMED(7).doctor,
    radiographer: RADIOGRAPHER(0).name,
    rightKey: 'BMA', ...money('xr-knee', 'BMA'),
    clinicalSummary: 'ปวดเข่าขวาเรื้อรัง ขัดเวลาขึ้นบันได สงสัยข้อเข่าเสื่อม',
  },

  /* reported + ผิดปกติเร่งด่วน — the TB-clinic money shot: active TB read,
     locked by the reading doctor (§1.12.6.3), waiting for ยืนยันผล. */
  {
    ...BLANK,
    id: 'XR-0008', orderId: 'ORD-X407', xn: generateXN(418),
    hn: NAMED(8).hn, patient: NAMED(8),
    examId: 'xr-cxr-pa', examLabel: 'เอกซเรย์ทรวงอก (CXR) PA',
    modality: 'xr', region: 'chest', view: 'PA', filmSizes: ['14x17'],
    urgency: 'urgent', status: 'reported', requestType: 'walkin',
    orderedAt: '08:40', acceptedAt: '08:55', performedAt: '09:20', reportedAt: '10:15',
    orderingLocation: 'คลินิกวัณโรค', orderedBy: NAMED(8).doctor,
    radiographer: RADIOGRAPHER(2).name, radiologist: RADIOLOGIST(0).name,
    lockedBy: RADIOLOGIST(0).id,
    rightKey: 'UCS', ...money('xr-cxr-pa', 'UCS'),
    clinicalSummary: 'ผู้สัมผัสร่วมบ้านผู้ป่วยวัณโรค ไอมีเสมหะปนเลือด 1 สัปดาห์',
    diagnosis: 'R/O active pulmonary TB',
    resultType: 'abnormalUrgent',
    technique: 'PA upright chest radiograph.',
    findings: 'Patchy and reticulonodular infiltration at the right upper lobe with a thick-walled '
      + 'cavitary lesion, about 2.5 cm in diameter. Fibrotic streaks at both apices. No pleural effusion. '
      + 'The heart is not enlarged.',
    impression: 'Suggestive of active pulmonary tuberculosis, right upper lobe with cavitation. '
      + 'แนะนำส่งเสมหะตรวจ AFB smear/culture และขึ้นทะเบียนคลินิกวัณโรค — แจ้งแพทย์ผู้ส่งตรวจโดยด่วน',
  },

  /* verified — partial-claim demo: SSS reimburses 700 of the 900 THB US,
     patient pays the 200 THB difference (§1.12.4.2 / §1.12.5.4). */
  {
    ...BLANK,
    id: 'XR-0009', orderId: 'ORD-X408', xn: generateXN(419),
    hn: NAMED(0).hn, patient: NAMED(0),
    examId: 'us-upper-abd', examLabel: 'อัลตราซาวด์ช่องท้องส่วนบน',
    modality: 'us', region: 'abdomen', view: '—', filmSizes: ['digital'],
    urgency: 'routine', status: 'verified', requestType: 'walkin',
    orderedAt: '08:45', acceptedAt: '09:00', performedAt: '09:40', reportedAt: '10:30', verifiedAt: '11:00',
    orderingLocation: 'ตรวจรักษาทั่วไป (OPD)', orderedBy: NAMED(0).doctor,
    radiographer: RADIOGRAPHER(1).name, radiologist: RADIOLOGIST(1).name,
    lockedBy: RADIOLOGIST(1).id,
    rightKey: 'SSS', ...money('us-upper-abd', 'SSS'),
    clinicalSummary: 'ค่าการทำงานของตับสูงจากการตรวจสุขภาพประจำปี ดื่มสุราเป็นครั้งคราว',
    diagnosis: 'R/O fatty liver',
    resultType: 'abnormal',
    technique: 'Real-time ultrasound of the upper abdomen.',
    findings: 'Diffusely increased parenchymal echogenicity of the liver with posterior beam attenuation, '
      + 'compatible with moderate fatty infiltration. No discrete focal lesion. The gallbladder, pancreas, '
      + 'spleen and both kidneys are unremarkable. No ascites.',
    impression: 'Moderate fatty liver (ภาวะไขมันพอกตับปานกลาง). แนะนำควบคุมอาหาร ออกกำลังกาย และตรวจติดตามการทำงานของตับ',
  },

  /* verified + amendments — §1.12.6.3: the SAME doctor re-edited their own
     verified report, so the edit history is kept on the row. */
  {
    ...BLANK,
    id: 'XR-0010', orderId: 'ORD-X409', xn: generateXN(420),
    hn: NAMED(9).hn, patient: NAMED(9),
    examId: 'xr-cxr-palat', examLabel: 'เอกซเรย์ทรวงอก PA + Lateral',
    modality: 'xr', region: 'chest', view: 'PA/LAT', filmSizes: ['14x17', '14x17'],
    urgency: 'routine', status: 'verified', requestType: 'walkin',
    orderedAt: '08:50', acceptedAt: '09:05', performedAt: '09:30', reportedAt: '10:20', verifiedAt: '10:40',
    orderingLocation: 'ตรวจรักษาทั่วไป (OPD)', orderedBy: NAMED(9).doctor,
    radiographer: RADIOGRAPHER(2).name, radiologist: RADIOLOGIST(0).name,
    lockedBy: RADIOLOGIST(0).id,
    rightKey: 'OFC', ...money('xr-cxr-palat', 'OFC'),
    clinicalSummary: 'เหนื่อยง่ายเวลาออกแรง ขาบวมเล็กน้อยทั้งสองข้าง',
    diagnosis: 'R/O congestive heart failure',
    resultType: 'abnormal',
    technique: 'PA upright and lateral chest radiographs.',
    findings: 'Cardiomegaly with cardiothoracic ratio about 0.58. No pulmonary congestion or pleural '
      + 'effusion at present. The lungs are otherwise clear.',
    impression: 'Cardiomegaly without radiographic evidence of pulmonary congestion. แนะนำตรวจติดตามร่วมกับการประเมินทางคลินิก',
    amendments: [
      { at: '10:42', by: RADIOLOGIST(0).name, reason: 'แก้ค่า cardiothoracic ratio จาก 0.55 เป็น 0.58 หลังวัดซ้ำจากภาพ PA' },
    ],
  },

  /* exception: rejected — ปฏิเสธรับ Request (manual p.8). The order goes
     back to the doctor; §1.12.5.6 lets the radiologist demand completion. */
  {
    ...BLANK,
    id: 'XR-0011', orderId: 'ORD-X410', xn: generateXN(421),
    hn: NAMED(10).hn, patient: NAMED(10),
    examId: 'xr-skull', examLabel: 'เอกซเรย์กะโหลกศีรษะ AP/Lateral',
    modality: 'xr', region: 'skull', view: 'AP/LAT', filmSizes: ['10x12', '10x12'],
    urgency: 'routine', status: 'requested', requestType: 'walkin',
    orderedAt: '09:02', orderingLocation: 'ตรวจรักษาทั่วไป (OPD)', orderedBy: NAMED(10).doctor,
    rightKey: 'UCS', ...money('xr-skull', 'UCS'),
    clinicalSummary: 'ศีรษะกระแทกพื้น ไม่สลบ ไม่อาเจียน',
    exception: 'rejected',
    cancelReason: 'ปฏิเสธรับ Request — คำสั่งไม่ระบุตำแหน่ง/ท่าถ่ายที่ต้องการ และไม่มีผลประเมินทางระบบประสาท ส่งกลับให้แพทย์แก้ไขคำสั่ง',
  },

  /* exception: cancelled — ยกเลิกรายการตรวจ (ประวัติยกเลิก, manual p.9). */
  {
    ...BLANK,
    id: 'XR-0012', orderId: 'ORD-X411', xn: generateXN(422),
    hn: NAMED(11).hn, patient: NAMED(11),
    examId: 'xr-wrist', examLabel: 'เอกซเรย์ข้อมือ AP/Lateral',
    modality: 'xr', region: 'upperext', view: 'AP/LAT', filmSizes: ['8x10', '8x10'],
    urgency: 'routine', status: 'accepted', requestType: 'walkin',
    orderedAt: '09:10', acceptedAt: '09:22',
    orderingLocation: 'ตรวจรักษาทั่วไป (OPD)', orderedBy: NAMED(11).doctor,
    rightKey: 'CASH', ...money('xr-wrist', 'CASH'),
    clinicalSummary: 'ปวดข้อมือซ้ายหลังยกของหนัก',
    exception: 'cancelled',
    cancelReason: 'ผู้ป่วยกลับก่อนได้รับการตรวจ — แพทย์ยกเลิกคำสั่ง (Cancel Request)',
  },

  /* exception: reportCancelled — ยกเลิกการรายงานผล (manual p.8): the report
     was keyed against the wrong patient, so it drops back to `performed`
     for re-reporting; the cancellation is kept in `amendments`. */
  {
    ...BLANK,
    id: 'XR-0013', orderId: 'ORD-X412', xn: generateXN(423),
    hn: NAMED(12).hn, patient: NAMED(12),
    examId: 'xr-kub', examLabel: 'เอกซเรย์ช่องท้อง (Plain KUB)',
    modality: 'xr', region: 'abdomen', view: 'AP-SUP', filmSizes: ['14x17'],
    urgency: 'routine', status: 'performed', requestType: 'walkin',
    orderedAt: '09:15', acceptedAt: '09:26', performedAt: '09:55',
    orderingLocation: 'ตรวจรักษาทั่วไป (OPD)', orderedBy: NAMED(12).doctor,
    radiographer: RADIOGRAPHER(3).name, radiologist: RADIOLOGIST(2).name,
    rightKey: 'BMA', ...money('xr-kub', 'BMA'),
    clinicalSummary: 'ปวดบั้นเอวขวาเป็น ๆ หาย ๆ ปัสสาวะขุ่น',
    diagnosis: 'R/O urinary tract stone',
    exception: 'reportCancelled',
    cancelReason: 'Cancel Report — ผลถูกบันทึกสลับกับผู้ป่วยรายอื่น ยกเลิกรายงานเพื่อบันทึกใหม่',
    amendments: [
      { at: '11:20', by: RADIOLOGIST(2).name, reason: 'ยกเลิกการรายงานผล (Cancel Report) — บันทึกผลสลับราย' },
    ],
  },

  /* requested + contrast allergy — the §1.12.5.3 allergy block doing its
     job: iodinated-contrast allergy recorded on a CT-with-contrast order
     that is also referral-only (goes to a BMA hospital with the warning
     printed on the referral). */
  {
    ...BLANK,
    id: 'XR-0014', orderId: 'ORD-X413', xn: generateXN(424),
    hn: NAMED(3).hn, patient: NAMED(3),
    examId: 'ct-chest', examLabel: 'ซีทีสแกนทรวงอก (ฉีดสารทึบรังสี)',
    modality: 'ct', region: 'chest', view: '—', filmSizes: ['digital'],
    urgency: 'urgent', status: 'requested', requestType: 'appointment',
    orderedAt: '09:20', scheduledAt: '7 ส.ค. 2569 10:00',
    orderingLocation: 'ตรวจรักษาทั่วไป (OPD)', orderedBy: NAMED(3).doctor,
    rightKey: 'CASH', ...money('ct-chest', 'CASH'),
    allergy: { has: true, agent: 'สารทึบรังสีชนิดไอโอดีน (Iodinated contrast)', symptom: 'ผื่นลมพิษทั้งตัว แน่นหน้าอก (ครั้งก่อนเมื่อปี 2566)' },
    clinicalSummary: 'พบก้อนที่ปอดขวาจาก CXR ขนาดประมาณ 2 ซม. ต้องการประเมินเพิ่มเติม',
    diagnosis: 'Pulmonary nodule RUL, R/O malignancy',
    note: 'รายการส่งต่อภายนอก (referral) ไป รพ.กลาง — แนบประวัติแพ้ contrast และพิจารณา premedication ก่อนฉีด',
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   BULK ROWS — fills the day out so tab counts, STAT-first sorting and
   pagination read like real volume without hand-typing every literal.
   Deterministic (no Math.random / no Date.now — ids and times derive from
   the index) so the mock stays stable across reloads and sessions,
   mirroring labOrders.js. */
const BULK_EXAM_IDS = XRAY_EXAMS.filter((e) => !e.referralOnly && !e.retired).map((e) => e.id);
const BULK_STATUS_KEYS = ['requested', 'scheduled', 'accepted', 'performed', 'reported', 'verified'];
const BULK_RIGHT_KEYS = ['UCS', 'UCS', 'SSS', 'OFC', 'BMA', 'CASH'];

const timeAt = (minutesFrom8) => {
  const hour = 8 + Math.floor(minutesFrom8 / 60);
  const minute = minutesFrom8 % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const BULK_ORDERS = Array.from({ length: 40 }, (_, i) => {
  const n = i + 15;
  const examId = BULK_EXAM_IDS[i % BULK_EXAM_IDS.length];
  const exam = XRAY_EXAM_BY_ID[examId];
  const patient = NAMED(13 + i);
  /* Weighted so 'verified' dominates — a worklist at 09:30 is mostly
     yesterday-into-this-morning's finished studies plus a live head. */
  const status = i % 5 === 0 ? BULK_STATUS_KEYS[i % BULK_STATUS_KEYS.length] : 'verified';
  const rightKey = BULK_RIGHT_KEYS[i % BULK_RIGHT_KEYS.length];
  const isStat = i % 11 === 0 && status !== 'scheduled';
  const isUrgent = !isStat && i % 7 === 0;
  const start = 20 + i * 6;
  const reached = (key) =>
    BULK_STATUS_KEYS.indexOf(status) >= BULK_STATUS_KEYS.indexOf(key) && status !== 'scheduled';
  const resultType = status !== 'verified' && status !== 'reported'
    ? null
    : (i % 17 === 8 ? 'abnormalUrgent' : i % 9 === 4 ? 'abnormal' : i % 13 === 6 ? 'inconclusive' : 'normal');
  const { price, claimAmount } = money(examId, rightKey);

  return {
    ...BLANK,
    id: `XR-${String(n).padStart(4, '0')}`,
    orderId: `ORD-X${414 + i}`,
    xn: generateXN(425 + i),
    hn: patient.hn,
    patient,
    examId,
    examLabel: exam.name,
    modality: exam.modality,
    region: exam.region,
    view: viewLabel(exam),
    filmSizes: exam.filmSizes,
    urgency: isStat ? 'stat' : isUrgent ? 'urgent' : 'routine',
    status,
    requestType: status === 'scheduled' ? 'appointment' : 'walkin',
    orderedAt: timeAt(start),
    /* ใบที่ปิดงานแล้วกระจายย้อนหลังได้ถึง 30 วัน (deterministic ตาม i)
       ใบที่ยังค้างอยู่ในคิวต้องเป็นวันนี้ */
    orderedOn: (status === 'reported' || status === 'verified')
      ? dayAgoISO(1 + ((i * 7) % 30))
      : dayAgoISO(0),
    scheduledAt: status === 'scheduled' ? `${1 + (i % 14)} ส.ค. 2569 ${timeAt(60 + (i % 4) * 30)}` : null,
    acceptedAt: reached('accepted') ? timeAt(start + 12) : null,
    performedAt: reached('performed') ? timeAt(start + 35) : null,
    reportedAt: reached('reported') ? timeAt(start + 70) : null,
    verifiedAt: reached('verified') ? timeAt(start + 95) : null,
    orderingLocation: XRAY_LOCATIONS[i % XRAY_LOCATIONS.length],
    orderedBy: patient.doctor,
    radiographer: reached('performed') ? RADIOGRAPHER(i).name : null,
    radiologist: reached('reported') ? RADIOLOGIST(exam.modality === 'dn' ? 3 : i % 3).name : null,
    lockedBy: reached('reported') ? RADIOLOGIST(exam.modality === 'dn' ? 3 : i % 3).id : null,
    price,
    claimAmount,
    rightKey,
    pregnancy: patient.sex === 'หญิง' ? { status: 'ไม่ตั้งครรภ์', lmp: `${1 + (i % 27)} ก.ค. 2569` } : { status: null, lmp: null },
    clinicalSummary: `ส่งตรวจ ${exam.name} ตามข้อบ่งชี้ทางคลินิก`,
    resultType,
    impression: resultType == null
      ? ''
      : resultType === 'normal'
        ? `${exam.nameEn} — no significant abnormality. ไม่พบความผิดปกติ`
        : resultType === 'inconclusive'
          ? 'ภาพไม่ชัดเจน แนะนำถ่ายซ้ำหรือตรวจเพิ่มเติม (suboptimal study)'
          : `พบความผิดปกติจาก ${exam.name} — ดูรายงานฉบับเต็มในระบบ`,
  };
});

/* แถวที่คัดมาเอง (CURATED) คือ "งานของวันนี้" — เติม orderedOn ให้อัตโนมัติ
   จะได้ไม่ต้องไล่ใส่ทีละแถวและไม่มีแถวไหนหลุดออกจากตัวกรองช่วงวันที่ */
export const XRAY_ORDERS = [...CURATED_ORDERS, ...BULK_ORDERS]
  .map((o) => (o.orderedOn ? o : { ...o, orderedOn: XRAY_TODAY_ISO }));

/* ─────────────────────────────────────────────────────────────────────────
   DERIVED VIEWS

   `withExamLabel` decorates a raw order row with everything the worklist
   columns need, resolved from the catalog so modality/region/price can
   never drift from the exam definition (§1.12.4.x is the single source). */
export const withExamLabel = (order) => {
  const exam = XRAY_EXAM_BY_ID[order.examId] ?? null;
  const modality = XRAY_MODALITY_BY_KEY[order.modality ?? exam?.modality] ?? null;
  const region = XRAY_REGION_BY_KEY[order.region ?? exam?.region] ?? null;
  const urgency = XRAY_URGENCY_BY_KEY[order.urgency] ?? XRAY_URGENCY_BY_KEY.routine;
  const status = XRAY_STATUS_BY_KEY[order.status] ?? null;
  const resultType = order.resultType ? XRAY_RESULT_TYPE_BY_KEY[order.resultType] ?? null : null;

  return {
    ...order,
    exam,
    examLabel: order.examLabel ?? exam?.name ?? order.examId,
    examNameEn: exam?.nameEn ?? '',
    examCode: exam?.code ?? '',
    modalityLabel: modality?.thai ?? '',
    modalityCode: modality?.code ?? '',
    regionLabel: region?.thai ?? '',
    view: order.view ?? viewLabel(exam),
    referralOnly: Boolean(exam?.referralOnly),
    contrast: Boolean(exam?.contrast),
    femaleScreening: Boolean(exam?.femaleScreening),
    urgencyLabel: urgency.thai,
    urgencyRank: urgency.rank,
    urgencyColor: urgency.color,
    slaMinutes: urgency.slaMinutes,
    statusLabel: status?.thai ?? order.status,
    statusColor: status?.color ?? 'neutral',
    exceptionLabel: order.exception ? XRAY_EXCEPTION_BY_KEY[order.exception]?.thai ?? order.exception : null,
    rightLabel: XRAY_RIGHT_BY_KEY[order.rightKey]?.short ?? order.rightKey,
    resultTypeLabel: resultType?.thai ?? '',
    resultTypeColor: resultType?.color ?? 'neutral',
    patientPay: (order.price ?? 0) - (order.claimAmount ?? 0),
    /* VN (Visit Number) — same '69-XXXXX' convention as the OPD queue,
       derived from orderId so every row of one order shares a VN. */
    vn: `69-${order.orderId.replace('ORD-X', '').padStart(5, '0')}`,
  };
};

/* Order-level roll-up — one request can hold several exams that finish at
   different times (ORD-X405 above). The doctor-facing view shows a single
   status per XN:
     • every row verified        → 'verified' (report readable, §1.12.6.4)
     • some verified, some not   → 'partial'
     • otherwise                 → the least-advanced pipeline stage */
const PIPELINE = XRAY_STATUSES.map((s) => s.key);

export const rollUpOrderStatus = (rows = []) => {
  if (!rows.length) return null;
  if (rows.every((r) => r.status === 'verified')) return 'verified';

  const outstanding = rows
    .filter((r) => r.status !== 'verified')
    .map((r) => PIPELINE.indexOf(r.status))
    .filter((i) => i >= 0);

  if (!outstanding.length) return 'verified';
  const anyVerified = rows.some((r) => r.status === 'verified');
  return anyVerified ? 'partial' : PIPELINE[Math.min(...outstanding)];
};

/* Groups a flat row list by orderId — the detail panel and any doctor-facing
   view that needs the roll-up above. `xns` is normally a single value
   (one XN per request, §1.12.5.2) but kept as an array defensively. */
export const groupByOrder = (rows = []) => {
  const map = new Map();
  rows.forEach((r) => {
    if (!map.has(r.orderId)) map.set(r.orderId, []);
    map.get(r.orderId).push(r);
  });
  return [...map.entries()].map(([orderId, items]) => ({
    orderId,
    rows: items,
    status: rollUpOrderStatus(items),
    patient: items[0].patient,
    xns: [...new Set(items.map((i) => i.xn))],
  }));
};

/* ─────────────────────────────────────────────────────────────────────────
   PATIENT X-RAY HISTORY — keyed by HN, `daysAgo` a plain integer so nothing
   needs Date.now(). Feeds two TOR items at once:
     §1.12.5.7 — แสดงประวัติการส่งตรวจ และเลือกสั่งตามประวัติเดิมได้ (the
                 order screen lists these rows with a "สั่งซ้ำ" action)
     §1.12.5.9 — duplicateWarning() in xrayCatalog.js consumes the same
                 shape to warn on re-irradiation inside the repeat window. */
export const XRAY_HISTORY_BY_HN = {
  [PATIENT_PROFILES[0].hn]: [
    { examId: 'xr-cxr-pa',     daysAgo: 12,  resultSummary: 'ปกติ — Normal chest radiograph' },
    { examId: 'us-upper-abd',  daysAgo: 180, resultSummary: 'Mild fatty liver' },
  ],
  [PATIENT_PROFILES[1].hn]: [
    { examId: 'xr-lsspine',    daysAgo: 5,   resultSummary: 'Lumbar spondylosis L4–L5' },
  ],
  [PATIENT_PROFILES[2].hn]: [
    { examId: 'mg-bilateral',  daysAgo: 370, resultSummary: 'BI-RADS 1 — Negative' },
    { examId: 'xr-knee',       daysAgo: 500, resultSummary: 'Mild medial joint space narrowing' },
  ],
  [PATIENT_PROFILES[4].hn]: [
    /* daysAgo 2 with a 30-day CXR window → duplicateWarning() returns
       level 'block' — the re-irradiation case the demo must show. */
    { examId: 'xr-cxr-pa',     daysAgo: 2,   resultSummary: 'Old (inactive) pulmonary TB — no interval change' },
    { examId: 'xr-lsspine',    daysAgo: 400, resultSummary: 'Lumbar spondylosis' },
  ],
  [PATIENT_PROFILES[5].hn]: [
    { examId: 'xr-cxr-pa',     daysAgo: 45,  resultSummary: 'ปกติ — คัดกรองวัณโรคประจำปี' },
  ],
};

export const xrayHistoryFor = (hn) => XRAY_HISTORY_BY_HN[hn] ?? [];
