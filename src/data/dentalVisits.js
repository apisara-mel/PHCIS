/* Dental visits — งานทันตกรรม (TOR §1.10.1) queue + record mock data.

   Mirrors ancVisits.js's contract: a mock roster of today's queue, a
   นัดแล้วยังไม่มาติดต่อ list with a check-in path (legacy คู่มือระบบ
   ทันตกรรม p.2-2 "ส่งตรวจ"), sessionStorage-backed cancel/reactivate so
   ยกเลิก/เปิดใช้งาน survive in-session navigation, and a form-seed
   builder for DentalFormPage. Bangkok health-center context (ศบส.) —
   Thai patients, ทพญ./ทพ. providers, one dental operatory per shift. */

import { DENTAL_SNOMED_BY_ICD, findDentalProcedure } from '@/data/dentalCatalog';

/* ─── ผู้ใช้ปัจจุบัน (audit trail) ────────────────────────────────────
   Every save stamps ผู้บันทึก + วัน-เวลา (playbook §5). Mock signed-in
   provider — the on-duty dentist. */
export const CURRENT_DENTAL_USER = 'ทพญ.ปวีณา ทองใบ';

export const formatDentalDateTime = (d = new Date()) => {
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543} · ${hh}:${mm}`;
};

export const stampDentalAudit = () => ({
  recordedBy: CURRENT_DENTAL_USER,
  recordedAt: formatDentalDateTime(),
});

/* ─── ทันตแพทย์ / ประเภทงาน (queue filters) ─────────────────────────── */
export const DENTAL_DOCTORS = ['ทพญ.ปวีณา ทองใบ', 'ทพ.ศุภกร วัฒนชัย', 'ทพญ.กมลชนก ศรีสุวรรณ'];

/* มติ คทง.6 — "ผู้ทำหัตถการ" ต้องเลือกได้ทุกตำแหน่งที่ปฏิบัติงานในศูนย์นั้น
   (รวมทันตแพทย์ศูนย์อื่นที่มาปฏิบัติงานแทน) และ **ไม่ผูกกับ user ที่ login**
   เพราะรายงานผลงาน/การเบิกจ่ายดึงตามชื่อผู้ทำหัตถการ — ถ้าใช้ชื่อผู้เข้าระบบ
   แทน เงินจะเข้าผิดศูนย์. ส่วน "ผู้บันทึก" ยังขึ้นอัตโนมัติจาก login ตามเดิม. */
export const DENTAL_PERFORMERS = [
  { name: 'ทพญ.ปวีณา ทองใบ', role: 'ทันตแพทย์', center: 'ศูนย์ 4 ดินแดง' },
  { name: 'ทพ.ศุภกร วัฒนชัย', role: 'ทันตแพทย์', center: 'ศูนย์ 4 ดินแดง' },
  { name: 'ทพญ.กมลชนก ศรีสุวรรณ', role: 'ทันตแพทย์', center: 'ศูนย์ 4 ดินแดง' },
  { name: 'ทพ.ธนวัฒน์ อินทร์จันทร์', role: 'ทันตแพทย์ (มาปฏิบัติงานแทน)', center: 'ศูนย์ 21 วัดธาตุทอง' },
  { name: 'จพ.ทัณฑิกา บุญมาก', role: 'เจ้าพนักงานทันตสาธารณสุข', center: 'ศูนย์ 4 ดินแดง' },
  { name: 'นางสาวรุ่งนภา แก้วใส', role: 'ผู้ช่วยงานทันตกรรม', center: 'ศูนย์ 4 ดินแดง' },
];

export const DENTAL_WORK_TYPES = [
  { value: 'checkup', label: 'ตรวจสุขภาพช่องปาก' },
  { value: 'filling', label: 'อุดฟัน' },
  { value: 'extraction', label: 'ถอนฟัน/ผ่าฟันคุด' },
  { value: 'scaling', label: 'ขูดหินน้ำลาย' },
  { value: 'endo', label: 'รักษาคลองรากฟัน' },
  { value: 'prevention', label: 'ทันตกรรมป้องกัน (เด็ก)' },
];
export const dentalWorkTypeLabelOf = (value) =>
  DENTAL_WORK_TYPES.find((t) => t.value === value)?.label || value;

/* ─── คิววันนี้ ────────────────────────────────────────────────────────
   Row shape mirrors the legacy 2.1 ลำดับคิวของแพทย์ grid: คิว · วัน-เวลา
   มาตรวจ · HN · ชื่อ-สกุล · อาการ (chief complaint) · แพทย์ผู้ตรวจ ·
   คลินิก/ห้องตรวจ · สถานะ. HNs come from PATIENT_PROFILES so PatientCard
   and search avatars resolve.
     • confidential — ข้อมูลลับ §1.4.2: banner on the record page.
     • restricted   — ข้อมูลลับ + ผู้ใช้ปัจจุบันไม่มีสิทธิ์คลินิกทันตกรรม
                      → the record opens as the locked ไม่มีสิทธิ์เข้าถึง
                      card (edge case per spec). */
export const DENTAL_PATIENTS = [
  {
    queue: 'D-001', visitTime: '08:32', hn: '67-00002', name: 'สมชาย ใจดี',
    cc: 'ปวดฟันกรามล่างขวา 3 วัน เคี้ยวแล้วเสียวมาก', doctor: 'ทพญ.ปวีณา ทองใบ',
    clinic: 'ห้องทันตกรรม 1', workType: 'filling', statusKey: 'done', waitMinutes: 0,
  },
  {
    queue: 'D-002', visitTime: '08:47', hn: '67-00003', name: 'วรรณา สายทอง',
    cc: 'เหงือกบวมมีเลือดออกเวลาแปรงฟัน', doctor: 'ทพญ.ปวีณา ทองใบ',
    clinic: 'ห้องทันตกรรม 1', workType: 'scaling', statusKey: 'progress', waitMinutes: 12,
  },
  {
    queue: 'D-003', visitTime: '09:05', hn: '67-00004', name: 'ประเสริฐ บุญมาก',
    cc: 'ฟันคุดล่างซ้ายปวดบวม อ้าปากได้น้อย', doctor: 'ทพ.ศุภกร วัฒนชัย',
    clinic: 'ห้องทันตกรรม 2', workType: 'extraction', statusKey: 'waiting', waitMinutes: 25,
  },
  {
    queue: 'D-004', visitTime: '09:18', hn: '67-00005', name: 'มาลี รัตนกุล',
    cc: 'ตรวจสุขภาพช่องปากประจำปี + ขูดหินปูน', doctor: 'ทพญ.กมลชนก ศรีสุวรรณ',
    clinic: 'ห้องทันตกรรม 1', workType: 'checkup', statusKey: 'waiting', waitMinutes: 18,
  },
  {
    queue: 'D-005', visitTime: '09:26', hn: '67-00006', name: 'อนุชา พึ่งตน',
    cc: 'ฟันหน้าบนหักจากอุบัติเหตุจักรยาน', doctor: 'ทพ.ศุภกร วัฒนชัย',
    clinic: 'ห้องทันตกรรม 2', workType: 'filling', statusKey: 'waiting', waitMinutes: 10,
    confidential: true,
  },
  {
    queue: 'D-006', visitTime: '09:40', hn: '67-00007', name: 'สุภาพร แก้วใส',
    cc: 'เสียวฟันเวลาดื่มน้ำเย็น ฟันกรามบนซ้าย', doctor: 'ทพญ.ปวีณา ทองใบ',
    clinic: 'ห้องทันตกรรม 1', workType: 'filling', statusKey: 'draft', waitMinutes: 32,
  },
  {
    queue: 'D-007', visitTime: '09:52', hn: '67-00008', name: 'กัญญา วงศ์สวัสดิ์',
    cc: 'พาบุตร (5 ขวบ) เคลือบฟลูออไรด์ตามนัด', doctor: 'ทพญ.กมลชนก ศรีสุวรรณ',
    clinic: 'ห้องทันตกรรม 1', workType: 'prevention', statusKey: 'waiting', waitMinutes: 8,
  },
  {
    queue: 'D-008', visitTime: '10:04', hn: '67-00009', name: 'สมศักดิ์ พูลทรัพย์',
    cc: 'รากฟันค้างหลังฟันแตก ขอถอน', doctor: 'ทพ.ศุภกร วัฒนชัย',
    clinic: 'ห้องทันตกรรม 2', workType: 'extraction', statusKey: 'waiting', waitMinutes: 5,
    confidential: true, restricted: true,
  },
];

/* ─── นัดแล้วยังไม่มาติดต่อ (legacy tab-sheet ที่ 2, p.2-2) ───────────── */
export const DENTAL_SCHEDULED_TODAY = [
  {
    appointmentTime: '10:30', hn: '67-00010', name: 'จำรัส อินทร์แปลง',
    cc: 'นัดอุดฟัน #36 ต่อเนื่อง (ครั้งที่ 2)', doctor: 'ทพญ.ปวีณา ทองใบ',
    clinic: 'ห้องทันตกรรม 1', workType: 'filling',
  },
  {
    appointmentTime: '11:00', hn: '67-00011', name: 'บุษบา ศรีเมือง',
    cc: 'นัดตัดไหมหลังผ่าฟันคุด', doctor: 'ทพ.ศุภกร วัฒนชัย',
    clinic: 'ห้องทันตกรรม 2', workType: 'extraction',
  },
  {
    appointmentTime: '13:30', hn: '67-00012', name: 'สมพงษ์ เรืองศรี',
    cc: 'นัดขูดหินน้ำลาย (เบาหวาน — ติดตาม 6 เดือน)', doctor: 'ทพญ.กมลชนก ศรีสุวรรณ',
    clinic: 'ห้องทันตกรรม 1', workType: 'scaling',
  },
];

/* ─── Session state (sessionStorage) — same helpers as ancVisits.js ──── */
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
  } catch (e) { /* quota/private-mode — mock state is best-effort */ }
};

const CANCELLED_KEY = 'mih:dental-cancelled-visits';
const CHECKED_IN_KEY = 'mih:dental-checked-in-today';
const SAVED_KEY = 'mih:dental-saved-visits';
const REOPEN_KEY = 'mih:dental-reopen-audit';

/* ยกเลิก visit ต้องมีเหตุผล (Popup + Textarea) — the ยกเลิก half of
   1.10.1.1's แสดง/บันทึก/ยกเลิก/แก้ไข; เปิดใช้งาน is the undo. */
export const cancelDentalVisit = (hn, reason) => {
  if (!hn) return;
  const store = readJson(CANCELLED_KEY, {});
  store[hn] = {
    reason: reason || 'ไม่ระบุเหตุผล',
    cancelledBy: CURRENT_DENTAL_USER,
    cancelledAt: formatDentalDateTime(),
  };
  writeJson(CANCELLED_KEY, store);
};
export const reactivateDentalVisit = (hn) => {
  if (!hn) return;
  const store = readJson(CANCELLED_KEY, {});
  delete store[hn];
  writeJson(CANCELLED_KEY, store);
};
export const getDentalCancellation = (hn) => readJson(CANCELLED_KEY, {})[hn] || null;

/* "ส่งตรวจ" — moves a scheduled-but-not-arrived patient into today's
   queue (in-session), same as legacy p.2-2. */
export const checkInDentalAppointment = (hn) => {
  if (!hn) return;
  const store = readJson(CHECKED_IN_KEY, {});
  store[hn] = true;
  writeJson(CHECKED_IN_KEY, store);
};
export const getDentalScheduledNotArrived = () => {
  const checkedIn = readJson(CHECKED_IN_KEY, {});
  return DENTAL_SCHEDULED_TODAY.filter((p) => !checkedIn[p.hn]);
};
export const getDentalQueueRows = () => {
  const checkedIn = readJson(CHECKED_IN_KEY, {});
  const checkedInRows = DENTAL_SCHEDULED_TODAY
    .filter((p) => checkedIn[p.hn])
    .map((p, idx) => ({
      ...p,
      queue: `DW-${String(idx + 1).padStart(3, '0')}`,
      visitTime: p.appointmentTime,
      statusKey: 'waiting',
      waitMinutes: 0,
    }));
  return [...DENTAL_PATIENTS, ...checkedInRows];
};

export const findDentalQueueRowByHn = (hn) =>
  getDentalQueueRows().find((r) => r.hn === hn) || null;

/* ─── โรคประจำตัว + พฤติกรรมสุขภาพ (legacy 2.3) ──────────────────────── */
export const DENTAL_HEALTH_PROFILES = {
  '67-00002': {
    chronic: ['ความดันโลหิตสูง (รับยาต่อเนื่อง)'],
    behaviors: ['สูบบุหรี่ 10 มวน/วัน', 'ดื่มกาแฟหวานทุกเช้า'],
    note: 'ควบคุมความดันได้ดี BP ล่าสุด 132/84 — ให้ยาชาที่ผสม epinephrine ได้ตามปกติ',
  },
  '67-00003': {
    chronic: ['เบาหวานชนิดที่ 2 (HbA1c 7.2%)'],
    behaviors: ['เคี้ยวหมากเป็นประจำ'],
    note: 'เบาหวานสัมพันธ์กับโรคปริทันต์ — นัดขูดหินน้ำลายทุก 6 เดือน',
  },
  '67-00004': { chronic: [], behaviors: ['สูบบุหรี่ 5 มวน/วัน'], note: '' },
  '67-00005': { chronic: [], behaviors: [], note: '' },
};
export const getDentalHealthProfile = (hn) =>
  DENTAL_HEALTH_PROFILES[hn] || { chronic: [], behaviors: [], note: '' };

/* ─── ประวัติแพ้ยา (legacy 2.4 — Naranjo + ผู้บันทึก/แก้ไขล่าสุด) ─────── */
export const DENTAL_ALLERGY_ROWS = {
  '67-00002': [
    {
      id: 'al-1', drug: 'Penicillin V', symptom: 'ผื่นลมพิษทั่วตัว หน้าบวม',
      naranjo: 'Probable', severity: 'รุนแรง',
      recordedBy: 'ภญ.สายฝน จันทร์เพ็ญ', recordedAt: '12 มี.ค. 2568 · 10:24',
      updatedBy: 'ทพญ.ปวีณา ทองใบ', updatedAt: '2 ส.ค. 2569 · 09:02',
    },
  ],
  '67-00004': [
    {
      id: 'al-2', drug: 'Ibuprofen', symptom: 'แน่นหน้าอก หายใจลำบาก',
      naranjo: 'Possible', severity: 'ปานกลาง',
      recordedBy: 'พว.อรทัย บุญช่วย', recordedAt: '5 ม.ค. 2569 · 14:40',
      updatedBy: 'พว.อรทัย บุญช่วย', updatedAt: '5 ม.ค. 2569 · 14:40',
    },
  ],
};
export const getDentalAllergyRows = (hn) => DENTAL_ALLERGY_ROWS[hn] || [];

/* ─── Visit ที่ตรวจเสร็จแล้ว (read-only rehydration) ─────────────────────
   D-001 (67-00002) already finished today — reopening it shows every step
   read-only until แก้ไข (with audit note) reopens editing. */
export const COMPLETED_DENTAL_VISITS = {
  '67-00002': {
    chiefComplaint: 'ปวดฟันกรามล่างขวามา 3 วัน เสียวมากเวลาเคี้ยว ดื่มน้ำเย็นแล้วปวดแปลบ',
    dentalDoctorNote: 'พบฟันผุลึกด้าน O และ M ของ #46 ยังไม่ทะลุโพรงประสาทฟัน เคาะไม่เจ็บ ไม่มีหนอง',
    treatmentNote: 'อุดฟัน #46 ด้วยคอมโพสิต 2 ด้าน (O, M) ฉีดยาชา 1 หลอด แนะนำงดเคี้ยวข้างขวา 24 ชม.',
    dentition: 'permanent',
    toothMarks: {
      permanent: {
        46: { surfaces: ['O', 'M'], material: 'composite', note: 'ผุลึกใกล้โพรงประสาท เฝ้าระวังอาการปวด' },
      },
      primary: {},
    },
    otherServices: [],
    diagnoses: [
      {
        code: 'K02.1', name: 'ฟันผุลุกลามถึงเนื้อฟัน (Caries of dentine)',
        snomed: DENTAL_SNOMED_BY_ICD['K02.1'], type: 'principle',
        recordedBy: 'ทพญ.ปวีณา ทองใบ', recordedAt: '3 ส.ค. 2569 · 08:58',
      },
    ],
    procedures: [
      {
        id: 'pr-1', procedureId: 'filling-composite', teeth: [46], surfaces: ['O', 'M'],
        quantity: 2, unitPrice: 500, reimbursable: true,
        recordedBy: 'ทพญ.ปวีณา ทองใบ', recordedAt: '3 ส.ค. 2569 · 09:12',
      },
    ],
    consumables: [
      {
        id: 'cs-1', consumableId: 'anesthetic', quantity: 1,
        recordedBy: 'ทพญ.ปวีณา ทองใบ', recordedAt: '3 ส.ค. 2569 · 09:12',
      },
      {
        id: 'cs-2', consumableId: 'composite-a2', quantity: 1,
        recordedBy: 'ทพญ.ปวีณา ทองใบ', recordedAt: '3 ส.ค. 2569 · 09:12',
      },
    ],
    savedBy: 'ทพญ.ปวีณา ทองใบ',
    savedAt: '3 ส.ค. 2569 · 09:15',
  },

  /* ── เด็กคลินิกสุขภาพเด็กดี (mock ให้แผง "ผลการตรวจทันตกรรม" ในบันทึกเด็กดีมีเนื้อหา ·
     มติผู้ใช้ 3 ก.ย. 69) — ฟันน้ำนม · ตรวจช่องปาก/เคลือบฟลูออไรด์/เคลือบหลุมร่องฟัน ── */
  '69-10001': {
    chiefComplaint: 'ตรวจสุขภาพช่องปากทารกครั้งแรก (ส่งตรวจจากคลินิกเด็กดี อายุ 2 เดือน)',
    dentalDoctorNote: 'ยังไม่มีฟันขึ้น เหงือกและเยื่อบุช่องปากปกติ ไม่พบฝ้าขาว ลิ้นเคลื่อนไหวได้ดี',
    treatmentNote: 'สาธิตการเช็ดเหงือกด้วยผ้าสะอาดชุบน้ำต้มสุกหลังมื้อนม แนะนำงดนมขวดขณะหลับ นัดตรวจซ้ำเมื่อฟันซี่แรกขึ้น',
    dentition: 'primary',
    toothMarks: { permanent: {}, primary: {} },
    otherServices: [],
    diagnoses: [],
    /* ตรวจ+ให้คำแนะนำอย่างเดียว ยังไม่มีหัตถการ (ทารกยังไม่มีฟัน) */
    procedures: [],
    consumables: [],
    savedBy: 'ทพญ.กมลชนก ศรีสุวรรณ',
    savedAt: '10 ส.ค. 2569 · 10:30',
  },
  '69-10005': {
    chiefComplaint: 'ตรวจสุขภาพช่องปากตามนัด อายุ 1 ปี 6 เดือน ฟันน้ำนมขึ้น 12 ซี่',
    dentalDoctorNote: 'ฟันน้ำนมขึ้น 12 ซี่ สะอาดดี ไม่พบรอยผุ มีคราบจุลินทรีย์เล็กน้อยบริเวณฟันหน้าบน',
    treatmentNote: 'เคลือบฟลูออไรด์วานิชทั้งปาก ฝึกผู้ปกครองแปรงฟันให้ลูกด้วยยาสีฟันฟลูออไรด์ขนาดแตะขนแปรง',
    dentition: 'primary',
    toothMarks: { permanent: {}, primary: {} },
    otherServices: [],
    diagnoses: [],
    procedures: [
      {
        id: 'pr-imm-1005-1', procedureId: 'fluoride', teeth: [], surfaces: [],
        quantity: 1, unitPrice: 0, reimbursable: true,
        recordedBy: 'ทพญ.ปวีณา ทองใบ', recordedAt: '6 ส.ค. 2569 · 09:40',
      },
    ],
    consumables: [
      { id: 'cs-imm-1005-1', consumableId: 'fluoride-varnish', quantity: 1, recordedBy: 'ทพญ.ปวีณา ทองใบ', recordedAt: '6 ส.ค. 2569 · 09:40' },
    ],
    savedBy: 'ทพญ.ปวีณา ทองใบ',
    savedAt: '6 ส.ค. 2569 · 09:50',
  },
  '69-10007': {
    chiefComplaint: 'ตรวจสุขภาพช่องปากก่อนเข้าเรียน อายุ 4 ปี ผู้ปกครองสังเกตเห็นจุดดำที่ฟันกรามน้ำนม',
    dentalDoctorNote: 'ฟันน้ำนมครบ 20 ซี่ พบรอยผุระยะเริ่มต้นด้าน O ของ #54 และ #64 ยังไม่ถึงเนื้อฟัน หลุมร่องฟันกรามลึก',
    treatmentNote: 'เคลือบหลุมร่องฟัน #54 #64 #74 #84 และเคลือบฟลูออไรด์ทั้งปาก แนะนำลดขนมหวานระหว่างมื้อ นัดติดตาม 6 เดือน',
    dentition: 'primary',
    toothMarks: {
      permanent: {},
      primary: {
        54: { surfaces: ['O'], material: 'sealant', note: 'ผุระยะเริ่มต้น เคลือบหลุมร่องฟันแล้ว' },
        64: { surfaces: ['O'], material: 'sealant', note: 'ผุระยะเริ่มต้น เคลือบหลุมร่องฟันแล้ว' },
      },
    },
    otherServices: [],
    diagnoses: [
      {
        code: 'K02.0', name: 'ฟันผุระยะเริ่มต้นจำกัดที่เคลือบฟัน (Caries limited to enamel)',
        snomed: DENTAL_SNOMED_BY_ICD['K02.0'] || DENTAL_SNOMED_BY_ICD['K02.1'], type: 'principle',
        recordedBy: 'ทพ.ศุภกร วัฒนชัย', recordedAt: '15 ส.ค. 2569 · 13:20',
      },
    ],
    procedures: [
      {
        id: 'pr-imm-1007-1', procedureId: 'sealant', teeth: [54, 64, 74, 84], surfaces: ['O'],
        quantity: 4, unitPrice: 0, reimbursable: true,
        recordedBy: 'ทพ.ศุภกร วัฒนชัย', recordedAt: '15 ส.ค. 2569 · 13:35',
      },
      {
        id: 'pr-imm-1007-2', procedureId: 'fluoride', teeth: [], surfaces: [],
        quantity: 1, unitPrice: 0, reimbursable: true,
        recordedBy: 'ทพ.ศุภกร วัฒนชัย', recordedAt: '15 ส.ค. 2569 · 13:40',
      },
    ],
    consumables: [
      { id: 'cs-imm-1007-1', consumableId: 'fluoride-varnish', quantity: 1, recordedBy: 'ทพ.ศุภกร วัฒนชัย', recordedAt: '15 ส.ค. 2569 · 13:40' },
    ],
    savedBy: 'ทพ.ศุภกร วัฒนชัย',
    savedAt: '15 ส.ค. 2569 · 13:45',
  },
};

/* ─── Re-Diagnosis source — การวินิจฉัยจาก visit ก่อนหน้า ────────────────
   Legacy list kept for callers that don't scope by HN. */
export const DENTAL_PAST_DIAGNOSES = [
  { id: 'past-1', date: '14 พ.ค. 2569', code: 'K05.1', name: 'เหงือกอักเสบเรื้อรัง (Chronic gingivitis)' },
  { id: 'past-2', date: '14 พ.ค. 2569', code: 'K03.6', name: 'คราบหินน้ำลายเกาะฟัน (Deposits on teeth)' },
  { id: 'past-3', date: '9 ธ.ค. 2568', code: 'K02.1', name: 'ฟันผุลุกลามถึงเนื้อฟัน (Caries of dentine)' },
];

/* Per-HN Re-Diagnosis source. HNs that are genuinely first-visit (เด็กมา
   เคลือบฟลูออไรด์ครั้งแรก ฯลฯ) map to an empty array on purpose so the
   Re-Diagnosis CTA renders disabled + tooltip instead of an empty popup
   (spec edge case). */
export const DENTAL_PAST_DIAGNOSES_BY_HN = {
  '67-00002': DENTAL_PAST_DIAGNOSES,
  '67-00003': [
    { id: 'past-3a', date: '2 ก.พ. 2569', code: 'K05.3', name: 'ปริทันต์อักเสบเรื้อรัง (Chronic periodontitis)' },
    { id: 'past-3b', date: '2 ก.พ. 2569', code: 'K03.6', name: 'คราบหินน้ำลายเกาะฟัน (Deposits on teeth)' },
  ],
  '67-00004': [
    { id: 'past-4a', date: '18 มิ.ย. 2569', code: 'K01.1', name: 'ฟันคุด (Impacted teeth)' },
  ],
  '67-00005': [
    { id: 'past-5a', date: '30 ม.ค. 2569', code: 'K05.1', name: 'เหงือกอักเสบเรื้อรัง (Chronic gingivitis)' },
  ],
  '67-00006': [
    { id: 'past-6a', date: '11 ก.ค. 2569', code: 'S02.5', name: 'ฟันหัก (Fracture of tooth)' },
  ],
  '67-00007': [
    { id: 'past-7a', date: '5 มี.ค. 2569', code: 'K02.1', name: 'ฟันผุลุกลามถึงเนื้อฟัน (Caries of dentine)' },
  ],
  '67-00008': [],
  '67-00009': [
    { id: 'past-9a', date: '21 เม.ย. 2569', code: 'K08.3', name: 'รากฟันค้าง (Retained dental root)' },
  ],
};
export const getDentalPastDiagnoses = (hn) => DENTAL_PAST_DIAGNOSES_BY_HN[hn] || [];

/* ─── ประวัติย้อนหลังต่อซี่ (TOR 1.10.1.2 "ประวัติการให้บริการของซี่ฟัน") ──
   Legacy สมุดทันตกรรม keeps a per-tooth ledger so the dentist sees what
   was done to #46 two years ago before re-opening it. Derived here as a
   flat mock ledger keyed by HN → toothId (FDI). DentalStep2 filters it
   with the tooth the clinician just clicked. */
export const DENTAL_TOOTH_HISTORY = {
  '67-00002': {
    46: [
      { id: 'th-1', date: '9 ธ.ค. 2568', procedure: 'อุดฟันด้วยคอมโพสิต (ต่อด้าน)', surfaces: ['O'], material: 'composite', dentist: 'ทพญ.ปวีณา ทองใบ', note: 'อุดด้านบดเคี้ยว ผุตื้น' },
      { id: 'th-2', date: '14 พ.ค. 2569', procedure: 'ถ่ายภาพรังสีรอบปลายราก (Periapical film)', surfaces: [], material: 'none', dentist: 'ทพญ.ปวีณา ทองใบ', note: 'ไม่พบรอยโรครอบปลายราก' },
    ],
    36: [
      { id: 'th-3', date: '9 ธ.ค. 2568', procedure: 'อุดฟันด้วยอมัลกัม (ต่อด้าน)', surfaces: ['O', 'D'], material: 'amalgam', dentist: 'ทพ.ศุภกร วัฒนชัย', note: 'วัสดุยังอยู่ในสภาพดี' },
    ],
    16: [
      { id: 'th-4', date: '20 ส.ค. 2567', procedure: 'เคลือบหลุมร่องฟัน (Sealant)', surfaces: ['O'], material: 'sealant', dentist: 'ทพญ.กมลชนก ศรีสุวรรณ', note: '' },
    ],
  },
  '67-00003': {
    31: [
      { id: 'th-5', date: '2 ก.พ. 2569', procedure: 'ขูดหินน้ำลายทั้งปาก (Full-mouth scaling)', surfaces: [], material: 'none', dentist: 'ทพญ.ปวีณา ทองใบ', note: 'ร่องลึกปริทันต์ 4 มม. ด้านลิ้น' },
    ],
    41: [
      { id: 'th-6', date: '2 ก.พ. 2569', procedure: 'ขูดหินน้ำลายทั้งปาก (Full-mouth scaling)', surfaces: [], material: 'none', dentist: 'ทพญ.ปวีณา ทองใบ', note: 'เลือดออกขณะตรวจ (BOP +)' },
    ],
  },
  '67-00004': {
    38: [
      { id: 'th-7', date: '18 มิ.ย. 2569', procedure: 'ถ่ายภาพรังสีรอบปลายราก (Periapical film)', surfaces: [], material: 'none', dentist: 'ทพ.ศุภกร วัฒนชัย', note: 'ฟันคุดเอียง mesioangular นัดผ่าออก' },
    ],
    37: [
      { id: 'th-8', date: '18 มิ.ย. 2569', procedure: 'อุดฟันชั่วคราว (Temporary filling)', surfaces: ['D'], material: 'temp', dentist: 'ทพ.ศุภกร วัฒนชัย', note: 'รอผ่าฟันคุด #38 ก่อนอุดถาวร' },
    ],
  },
  '67-00005': {
    26: [
      { id: 'th-9', date: '30 ม.ค. 2569', procedure: 'อุดฟันด้วยคอมโพสิต (ต่อด้าน)', surfaces: ['M', 'O'], material: 'composite', dentist: 'ทพญ.กมลชนก ศรีสุวรรณ', note: '' },
    ],
  },
  '67-00007': {
    27: [
      { id: 'th-10', date: '5 มี.ค. 2569', procedure: 'อุดฟันด้วยกลาสไอโอโนเมอร์', surfaces: ['B'], material: 'gi', dentist: 'ทพญ.ปวีณา ทองใบ', note: 'ฟันสึกคอฟัน เสียวฟัน' },
    ],
  },
  '67-00009': {
    47: [
      { id: 'th-11', date: '21 เม.ย. 2569', procedure: 'ถอนฟันแท้', surfaces: [], material: 'none', dentist: 'ทพ.ศุภกร วัฒนชัย', note: 'ตัวฟันแตก เหลือรากค้าง 1 ราก' },
    ],
  },
};

export const getDentalToothHistory = (hn, toothId) =>
  (DENTAL_TOOTH_HISTORY[hn] || {})[Number(toothId)] || [];

/* ซี่ที่เคยมีประวัติ — Step 2 ใช้ติดจุดเล็ก ๆ ในรายการ ไม่ต้องกดเข้าไปดูก่อน */
export const getDentalTeethWithHistory = (hn) =>
  Object.keys(DENTAL_TOOTH_HISTORY[hn] || {}).map(Number);

/* ─── Saved records (in-session) + reopen audit ──────────────────────── */
export const saveDentalVisitRecord = (hn, payload) => {
  if (!hn) return null;
  const store = readJson(SAVED_KEY, {});
  const record = { ...payload, savedBy: CURRENT_DENTAL_USER, savedAt: formatDentalDateTime() };
  store[hn] = record;
  writeJson(SAVED_KEY, store);
  return record;
};
export const getSavedDentalVisit = (hn) =>
  readJson(SAVED_KEY, {})[hn] || COMPLETED_DENTAL_VISITS[hn] || null;

/* แก้ไข visit ที่ตรวจเสร็จแล้ว — reopening requires an audit note; the
   note is kept per-HN so the record header can surface who reopened it. */
export const recordDentalReopen = (hn, reason) => {
  if (!hn) return;
  const store = readJson(REOPEN_KEY, {});
  store[hn] = { reason: reason || 'ไม่ระบุเหตุผล', by: CURRENT_DENTAL_USER, at: formatDentalDateTime() };
  writeJson(REOPEN_KEY, store);
};
export const getDentalReopenAudit = (hn) => readJson(REOPEN_KEY, {})[hn] || null;

/* ─── SuggestibleTextarea word-lists ─────────────────────────────────── */
export const DENTAL_CC_SUGGESTIONS = [
  'ปวดฟันกรามล่างขวา เคี้ยวแล้วปวดมากขึ้น',
  'เสียวฟันเวลาดื่มน้ำเย็น/ของหวาน',
  'เหงือกบวม มีเลือดออกเวลาแปรงฟัน',
  'ฟันโยก เคี้ยวอาหารไม่ได้',
  'ฟันแตก/บิ่นจากอุบัติเหตุ',
  'มีกลิ่นปาก ต้องการขูดหินปูน',
  'ฟันคุดปวดบวม อ้าปากลำบาก',
  'มาตรวจสุขภาพช่องปากประจำปี',
];
export const DENTAL_DOCTOR_NOTE_SUGGESTIONS = [
  'พบฟันผุลึกด้านบดเคี้ยว ยังไม่ทะลุโพรงประสาทฟัน',
  'เหงือกอักเสบทั่วไป มีหินน้ำลายเกาะมาก bleeding on probing เป็นบวก',
  'ฟันคุดล่างซ้ายเอียง mesioangular ต้องผ่าออก',
  'เคาะเจ็บ แนวโน้มเนื้อเยื่อในอักเสบ ส่งถ่ายภาพรังสีรอบปลายราก',
  'รากฟันค้าง เหงือกรอบ ๆ ไม่อักเสบ',
  'ฟันน้ำนมโยกใกล้หลุด แนะนำถอนเพื่อให้ฟันแท้ขึ้นตรงตำแหน่ง',
];
export const DENTAL_DIAGNOSIS_NOTE_SUGGESTIONS = [
  'ฟันผุลุกลามถึงเนื้อฟัน ซี่ 46 ด้าน O/M',
  'ปริทันต์อักเสบเรื้อรังทั่วปาก ร่องลึกปริทันต์ 4-6 มม.',
  'เนื้อเยื่อในอักเสบเฉียบพลัน ซี่ 21 จากฟันผุลึก',
  'ฟันคุดล่างซ้าย (#38) impacted mesioangular',
  'ฝีปลายรากฟัน ซี่ 36 พร้อมเหงือกบวม',
];
export const DENTAL_TREATMENT_NOTE_SUGGESTIONS = [
  'อุดฟันด้วยคอมโพสิต ฉีดยาชา 1 หลอด ไม่มีภาวะแทรกซ้อน',
  'ขูดหินน้ำลายทั้งปาก แนะนำการแปรงฟันวิธี Modified Bass',
  'ถอนฟันโดยไม่มีภาวะแทรกซ้อน กัดผ้าก๊อซ 1 ชม. นัดติดตามอาการ',
  'ผ่าฟันคุด เย็บแผล 2 เข็ม นัดตัดไหม 7 วัน จ่ายยาแก้ปวดและยาปฏิชีวนะ',
  'อุดชั่วคราวรอประเมินอาการ 1 สัปดาห์ก่อนรักษาคลองรากฟัน',
];
export const DENTAL_TOOTH_NOTE_SUGGESTIONS = [
  'ผุลึกใกล้โพรงประสาทฟัน เฝ้าระวังอาการปวด',
  'ผุด้านประชิด ตรวจพบจากภาพรังสี bitewing',
  'ฟันสึกบริเวณคอฟันจากการแปรงฟันแรง',
  'มีหินน้ำลายเกาะหนาด้านลิ้น',
  'ฟันตายสีคล้ำ รอประเมินรักษาคลองรากฟัน',
];
export const DENTAL_CANCEL_REASON_SUGGESTIONS = [
  'ผู้รับบริการขอยุติการรักษากลางคัน',
  'ส่งตรวจผิดคลินิก — ย้ายไปคลินิกทั่วไป',
  'บันทึกผิดคน (HN ไม่ตรงกับผู้รับบริการ)',
  'ผู้รับบริการมีความดันโลหิตสูงเกินเกณฑ์ เลื่อนการทำหัตถการ',
  'เครื่องมือ/ยูนิตทำฟันขัดข้อง นัดใหม่',
];
export const DENTAL_REOPEN_REASON_SUGGESTIONS = [
  'แก้ไขตำแหน่งฟันที่บันทึกผิดซี่',
  'เพิ่มหัตถการที่ยังไม่ได้ลงบันทึก',
  'แก้ไขจำนวนวัสดุสิ้นเปลืองให้ตรงกับที่ใช้จริง',
  'ปรับรหัสวินิจฉัยตามผลภาพรังสี',
];

/* ─── Vital signs carried from OPD screening (Step 1 read-only) ───────── */
export const DENTAL_SCREENING_VITALS = {
  recordedAt: '3 ส.ค. 2569 · 08:20',
  recordedBy: 'พว.อรทัย บุญช่วย',
  nurseNote: 'ซักประวัติแล้ว ไม่มีไข้ รับประทานอาหารเช้าแล้ว ไม่มีข้อห้ามการฉีดยาชา',
  values: [
    { key: 'bp', label: 'ความดันโลหิต', value: '128/82', unit: 'mmHg' },
    { key: 'hr', label: 'ชีพจร', value: '78', unit: 'ครั้ง/นาที' },
    { key: 'temp', label: 'อุณหภูมิ', value: '36.7', unit: '°C' },
    { key: 'rr', label: 'การหายใจ', value: '18', unit: 'ครั้ง/นาที' },
    { key: 'weight', label: 'น้ำหนัก', value: '64.5', unit: 'กก.' },
    { key: 'height', label: 'ส่วนสูง', value: '168', unit: 'ซม.' },
  ],
};

/* ─── Form seed ──────────────────────────────────────────────────────
   Includes the OPD keys the reused Step5Orders / Step6Appointment /
   Step7Certificate read (orderCategory…, appointment, cert*) so those
   components work wholesale — see TreatmentFormPage.buildInitialForm. */
/* visitId ที่ผูก audit / e-Document / Medication Reconciliation เข้ากับ
   การตรวจครั้งนี้. MedRecPanel + DocumentCenterPanel อ่าน `form.visitId`
   เพื่อ scope session ของตัวเอง — ถ้าไม่ใส่ ทุก HN จะไปใช้ 'v-current'
   ก้อนเดียวกันแล้ว audit ข้ามคนไข้ (risk ที่ระบุไว้ใน spec). */
export const dentalVisitIdOf = (hn) => `dental-${hn || 'unknown'}-${new Date().toISOString().slice(0, 10)}`;

/* Vitals ในรูปแบบที่ ConsultComposerPanel / MedicationCdssPanel อ่าน
   (bp / hr / temp / rr / weight / height) — map จาก DENTAL_SCREENING_VITALS
   ก้อนเดียวกับที่ Step 1 โชว์ เพื่อไม่ให้ตัวเลขสองที่ขัดกัน. */
const dentalVitalsObject = () => DENTAL_SCREENING_VITALS.values.reduce(
  (acc, v) => ({ ...acc, [v.key]: v.key === 'bp' ? v.value : Number(v.value) }),
  {},
);

export const buildDentalVisitForm = (hn, { defaultAppointment = {} } = {}) => {
  const saved = getSavedDentalVisit(hn);
  const base = {
    // Step 1 — ประวัติผู้ป่วย
    chiefComplaint: '',
    dentalDoctorNote: '',
    // Step 2 — การตรวจฟัน
    dentition: 'permanent',
    toothMarks: { permanent: {}, primary: {} },
    otherServices: [],
    annotationMarkers: [],
    annotationDrawings: [],
    // Step 3 — วินิจฉัย
    diagnosisNote: '',
    treatmentNote: '',
    orderingDoctor: 'somying',
    diagnoses: [],
    icdQuery: '',
    // Step 4 — หัตถการและวัสดุ
    procedures: [],
    consumables: [],
    // Step 5 — คำสั่งทางการแพทย์ (reused Step5Orders keys)
    orderCategory: 'medication',
    medications: [],
    labs: [],
    xrayOrders: [],
    procedureOrders: [],
    consultOrders: [],
    showAllergyAlert: true,
    // Step 6 — นัดหมาย (reused Step6Appointment key)
    appointment: { ...defaultAppointment, doctor: 'somying' },
    // Step 7 — ใบรับรองแพทย์ (reused Step7Certificate keys)
    certIssue: '',
    certType: 'general',
    certNo: 'MC-2569-005912',
    restDays: '',
    startDate: '',
    endDate: '',
    certSignerDoctor: 'somying',
    certSignerLicense: 'TH-00012345',
    certSignature: '',
    certSignedAt: '',
    /* ── คีย์ที่คอมโพเนนต์กลางของ OPD อ่าน (ห้ามตัดออก) ──────────────
       Step5Orders → LabOrderPanel / ProcedureOrderPanel /
       ConsultComposerPanel / MedRecPanel / MedicationCdssPanel และ
       Step7Certificate → DocumentCenterPanel. ทุกตัวใช้ optional
       chaining แต่การ seed ไว้ทำให้ตาราง/แบนเนอร์แสดงผลถูกต้องตั้งแต่
       เฟรมแรก และทำให้ audit ผูกกับ visit ของ HN นี้จริง ๆ */
    visitId: dentalVisitIdOf(hn),
    vitals: dentalVitalsObject(),
    doctorExam: '',
    doctorOrderNote: '',
    medRecDispositions: {},
    medRecPending: 0,
    visitAttachments: [],
    patientAdvice: '',
    patientAdviceTopics: {},
    externalCauseDraft: '',
    continueOrder: false,
    labRequest: {},
    nursingActivities: {},
    nursingOther: '',
    cdssDismissed: {},
    radiologistDecisions: {},
    xrayAcknowledged: {},
    sameDayPrescriptions: [],
  };
  if (!saved) return { form: base, isCompleted: false, saved: null };
  return {
    form: {
      ...base,
      chiefComplaint: saved.chiefComplaint ?? base.chiefComplaint,
      dentalDoctorNote: saved.dentalDoctorNote ?? base.dentalDoctorNote,
      treatmentNote: saved.treatmentNote ?? base.treatmentNote,
      dentition: saved.dentition ?? base.dentition,
      toothMarks: saved.toothMarks ?? base.toothMarks,
      otherServices: saved.otherServices ?? base.otherServices,
      annotationMarkers: saved.annotationMarkers ?? base.annotationMarkers,
      annotationDrawings: saved.annotationDrawings ?? base.annotationDrawings,
      diagnosisNote: saved.diagnosisNote ?? base.diagnosisNote,
      diagnoses: saved.diagnoses ?? base.diagnoses,
      procedures: saved.procedures ?? base.procedures,
      consumables: saved.consumables ?? base.consumables,
      appointment: saved.appointment ?? base.appointment,
      certIssue: saved.certIssue ?? base.certIssue,
    },
    isCompleted: true,
    saved,
  };
};

/* Step-completion flags for StepProgress — same contract as
   getTreatmentCompletedSteps (array of booleans aligned to the steps):
   a step renders SUCCESS only when its own data says it's really done.
   Steps whose content is optional (orders) fall back to "visited". */
export const getDentalCompletedSteps = (form, stepIndex = 0) => {
  const marksCount = Object.keys(form.toothMarks?.permanent || {}).length
    + Object.keys(form.toothMarks?.primary || {}).length;
  return [
    !!(form.chiefComplaint || '').trim() && stepIndex > 0,
    (marksCount > 0 || (form.otherServices?.length || 0) > 0) && stepIndex > 1,
    (form.diagnoses?.length || 0) > 0,
    ((form.procedures?.length || 0) > 0 || (form.consumables?.length || 0) > 0) && stepIndex > 3,
    stepIndex > 4, /* orders are optional — visiting the step completes it */
    !!(form.appointment?.date || form.appointment?.reason),
    !!form.certIssue,
  ];
};

/* ═══ ผลทันตกรรมที่ส่งไปแสดงในคลินิกส่งเสริม (มติ คทง.6 ครั้งที่ 3) ═══════
   Pain point จาก blueprint หน้า 9: เดิมพยาบาลคลินิกส่งเสริมต้องเปิด Visit
   ทันตกรรมใหม่เพื่อดู/ลงผลตรวจฟัน ทำให้เกิด double entry และสถิติซ้ำ
   มติคือ **ลงข้อมูลที่หน้าทันตกรรมที่เดียว แล้วส่งผลไปแสดงในหน้าคลินิก
   ส่งเสริมต่าง ๆ โดยไม่ต้องเปิด Visit ใหม่** — ฝั่งคลินิกส่งเสริมเป็น
   read-only ทั้งหมด ทำได้อย่างเดียวคือ "ส่งตรวจทันตกรรม" (flagging) ซึ่ง
   เป็นคำขอ ไม่ใช่การเปิด Visit (Screen first, data entry later — หน้า 10)

   หน้าที่ต้องเห็นแผงนี้ตามขอบเขต UI หน้า 13 (8 หน้า):
     ทันตกรรม (ต้นทาง) · ผู้สูงอายุ · วัยทอง · เยี่ยมบ้าน · เด็กดี (WBC) ·
     ฝากครรภ์ (ANC) · อนามัยโรงเรียน · เบาหวาน (DM)
   §1.10.2.8 ก็สั่งไว้ตรงกัน — การติดตามผู้ป่วยโรคเฉพาะต้องแสดง
   "การตรวจทันตกรรม" ร่วมกับ Lab/X-ray                                    */

export const DENTAL_CARE_SURFACES = [
  { key: 'dental', label: 'คลินิกทันตกรรม', route: '/clinic/dental', source: true },
  /* TOR §1.10 มีคลินิกพิเศษ 12 คลินิก ไม่มี "ผู้สูงอายุ / วัยทอง / เด็กดี"
     เป็นคลินิกแยก — ในระบบนี้ทั้งสามกลุ่มรับบริการผ่านโมดูลที่มีอยู่จริง
     (ตรวจสุขภาพตามกลุ่มวัย §1.19 · สร้างเสริมภูมิคุ้มกัน §1.10.9) จึงชี้
     route ไปที่โมดูลนั้นแทนการสร้างคลินิกใหม่นอกขอบเขต TOR */
  { key: 'elderly', label: 'ตรวจสุขภาพผู้สูงอายุ', route: '/checkup' },
  { key: 'menopause', label: 'ตรวจสุขภาพวัยทอง', route: '/checkup' },
  { key: 'homevisit', label: 'เยี่ยมบ้าน', route: '/homevisit' },
  { key: 'wbc', label: 'คลินิกสุขภาพเด็กดี (WBC)', route: '/clinic/immunization' },
  { key: 'anc', label: 'คลินิกหญิงตั้งครรภ์ (ANC)', route: '/treat/anc' },
  { key: 'school', label: 'อนามัยโรงเรียน', route: '/clinic/school-health' },
  { key: 'dm', label: 'คลินิกเบาหวาน (DM)', route: '/clinic/ncd' },
];
/* "#46, #36" — ป้ายตำแหน่งฟันสำหรับแผงสรุป (dentalShared มีตัวเดียวกัน
   แต่อยู่ฝั่งหน้าเพจ; แผงที่ใช้ร่วมทุกคลินิกต้องอ่านจาก data layer) */
export const toothListLabelOf = (teeth = []) =>
  (teeth.length === 0 ? 'ทั้งปาก' : teeth.map((t) => `#${t}`).join(', '));

export const dentalSurfaceLabelOf = (key) =>
  DENTAL_CARE_SURFACES.find((s) => s.key === key)?.label || key;

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/* "9 ธ.ค. 2568" / "3 ส.ค. 2569 · 09:15" → Date (พ.ศ. → ค.ศ.).
   คืน null เมื่อ parse ไม่ได้ เพื่อให้ผู้เรียกตัดสินใจเองแทนที่จะได้
   Invalid Date ไปคำนวณต่อ */
export const parseThaiDate = (text) => {
  if (!text) return null;
  const m = String(text).match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})/);
  if (!m) return null;
  const monthIdx = THAI_MONTHS.indexOf(m[2]);
  if (monthIdx < 0) return null;
  return new Date(Number(m[3]) - 543, monthIdx, Number(m[1]));
};

const monthsSince = (date) => {
  if (!date) return null;
  const now = new Date();
  return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
};

/* ─── คำขอส่งตรวจทันตกรรมจากคลินิกส่งเสริม (flagging) ──────────────────
   ไม่เปิด Visit — เป็นธงที่ไปโผล่ในคิวทันตกรรมให้ทันตแพทย์ดึงเข้าตรวจ
   เอง (ทันตแพทย์เป็นคนเปิด Visit จริงที่หน้าทันตกรรมตามเดิม)          */
const CHECK_REQUEST_KEY = 'mih:dental-check-requests';

export const requestDentalCheck = (hn, { from, fromLabel, reason, patientName } = {}) => {
  if (!hn) return null;
  const store = readJson(CHECK_REQUEST_KEY, {});
  const record = {
    hn,
    patientName: patientName || '',
    from: from || 'other',
    fromLabel: fromLabel || dentalSurfaceLabelOf(from),
    reason: (reason || '').trim() || 'ไม่ระบุเหตุผล',
    requestedBy: CURRENT_DENTAL_USER,
    requestedAt: formatDentalDateTime(),
  };
  store[hn] = record;
  writeJson(CHECK_REQUEST_KEY, store);
  return record;
};

export const getDentalCheckRequest = (hn) => (hn ? readJson(CHECK_REQUEST_KEY, {})[hn] || null : null);

export const cancelDentalCheckRequest = (hn) => {
  if (!hn) return;
  const store = readJson(CHECK_REQUEST_KEY, {});
  delete store[hn];
  writeJson(CHECK_REQUEST_KEY, store);
};

/* คิวทันตกรรมใช้ดึงคำขอทั้งหมดมาแสดงเป็นแท็บ "ส่งตรวจจากคลินิกอื่น" */
export const getDentalCheckRequests = () => Object.values(readJson(CHECK_REQUEST_KEY, {}));

export const DENTAL_CHECK_REASON_SUGGESTIONS = [
  'พบฟันผุหลายซี่ระหว่างตรวจร่างกาย ขอส่งตรวจทันตกรรม',
  'เหงือกบวมแดง มีเลือดออกขณะแปรงฟัน',
  'คัดกรองสุขภาพช่องปากผิดปกติ ควรพบทันตแพทย์',
  'ยังไม่เคยตรวจสุขภาพช่องปากในปีนี้ ขอส่งตรวจตามรอบ',
  'ผู้รับบริการแจ้งปวดฟัน/เสียวฟันระหว่างรับบริการ',
  'มีฟันโยก/ฟันหักที่ต้องประเมินก่อนวางแผนการรักษา',
];

/* ─── สรุปผลทันตกรรมสำหรับคลินิกส่งเสริม (read-only) ───────────────────
   รวม 3 แหล่งเป็นก้อนเดียว: visit ที่บันทึกไว้ในเซสชัน → visit ที่ตรวจ
   เสร็จแล้ว → ledger รายซี่ย้อนหลัง แล้วแปลผลสถานะการตรวจฟันให้อัตโนมัติ
   (เกิน 6 เดือน = ควรตรวจซ้ำ ตามรอบตรวจสุขภาพช่องปากประจำปี)          */
export const getDentalCarrySummary = (hn) => {
  const request = getDentalCheckRequest(hn);
  const visit = getSavedDentalVisit(hn);

  const procedures = (visit?.procedures || []).map((p) => {
    const meta = findDentalProcedure(p.procedureId);
    return {
      id: p.id,
      name: meta?.name || p.procedureId,
      unit: meta?.unit || 'ครั้ง',
      quantity: p.quantity ?? 1,
      teeth: p.teeth || [],
      surfaces: p.surfaces || [],
      date: (p.recordedAt || visit?.savedAt || '').split(' · ')[0],
      dentist: p.recordedBy || visit?.savedBy || '',
    };
  });

  const ledger = Object.entries(DENTAL_TOOTH_HISTORY[hn] || {})
    .flatMap(([toothId, rows]) => rows.map((r) => ({ ...r, toothId: Number(toothId) })))
    .sort((a, b) => (parseThaiDate(b.date)?.getTime() || 0) - (parseThaiDate(a.date)?.getTime() || 0));

  const lastVisitAt = visit?.savedAt || null;
  const lastDate = parseThaiDate(lastVisitAt) || parseThaiDate(ledger[0]?.date);
  const lastServiceLabel = lastVisitAt ? lastVisitAt.split(' · ')[0] : (ledger[0]?.date || null);
  const months = monthsSince(lastDate);

  let status = 'never';
  if (request) status = 'requested';
  else if (!lastDate) status = 'never';
  else if (months !== null && months >= 6) status = 'due';
  else status = 'current';

  return {
    status,
    request,
    lastServiceLabel,
    monthsSinceLast: months,
    dentist: visit?.savedBy || ledger[0]?.dentist || null,
    diagnoses: visit?.diagnoses || [],
    procedures,
    ledger,
    hasAny: !!(visit || ledger.length),
  };
};
