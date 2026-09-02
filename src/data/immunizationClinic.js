/* immunizationClinic.js — mock data + helpers for งานสร้างเสริมภูมิคุ้มกัน
   (คลินิกสุขภาพเด็กดี, TOR §1.10.9) และทะเบียนวัคซีน / IIS (TOR §1.11).

   คำศัพท์และลำดับงานยึดตามคู่มือ HCIS เดิม (คู่มือระบบงานสร้างเสริมภูมิคุ้มกันโรค
   บทที่ 2): ลำดับคิว "ลงทะเบียนส่งตรวจแล้ว / นัดยังไม่มาติดต่อ / ตรวจเสร็จแล้ว",
   ใบบันทึกสุขภาพเด็กดีที่ประกอบด้วย ข้อมูลทั่วไป (Vital Signs, โภชนาการ,
   ประวัติฝากครรภ์และคลอด) · พัฒนาการเด็ก (การเจริญเติบโต + DSPM) ·
   การสร้างเสริมภูมิคุ้มกันโรค · การตรวจสุขภาพทั่วไป 14 ระบบ ·
   การเจริญเติบโตของเด็ก (กราฟ 4 แบบ).

   Session-mutable state (check-in, ยกเลิกคิว, ทะเบียน, เข็มวัคซีน, AEFI,
   ร่าง/บันทึกการตรวจ, นัดหมาย, print log, สิทธิ) อยู่ใน sessionStorage —
   pattern เดียวกับ ancVisits.js / mentalHealthClinic.js. */

import {
  getVaccineById,
  getVaccineCatalogRows,
  EPI_AGE_MILESTONES,
  commitLotUsage,
} from '@/data/immunizationVaccines';

/* ── sessionStorage plumbing ───────────────────────────────────────── */
const storageAvailable = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const readJson = (key, fallback) => {
  if (!storageAvailable()) return fallback;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!storageAvailable()) return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
};

const K = {
  checkedIn: 'mih:imm:checked-in',
  queueCancelled: 'mih:imm:queue-cancelled',
  registry: 'mih:imm:registry-overlay',
  registryRun: 'mih:imm:registry-run',
  doses: 'mih:imm:dose-overlay',
  doseRun: 'mih:imm:dose-run',
  aefi: 'mih:imm:aefi-overlay',
  aefiRun: 'mih:imm:aefi-run',
  visits: 'mih:imm:visit-records',
  drafts: 'mih:imm:drafts',
  appointments: 'mih:imm:appointments',
  printLog: 'mih:imm:print-log',
  rights: 'mih:imm:rights',
};

/* ── Date / age helpers ────────────────────────────────────────────── */
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export const formatImmDate = (v) => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

export const formatImmDateTime = (v) => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatImmDate(d)} ${hh}:${mm} น.`;
};

export const todayIso = () => new Date().toISOString().slice(0, 10);

/* อายุ ป-ด-ว ตามรูปแบบคู่มือ HCIS (ปี - เดือน - วัน) */
export const ageParts = (birthDate, atDate) => {
  if (!birthDate) return null;
  const b = new Date(`${String(birthDate).slice(0, 10)}T00:00:00`);
  const a = atDate ? new Date(`${String(atDate).slice(0, 10)}T00:00:00`) : new Date();
  if (Number.isNaN(b.getTime()) || Number.isNaN(a.getTime()) || a < b) return null;
  let years = a.getFullYear() - b.getFullYear();
  let months = a.getMonth() - b.getMonth();
  let days = a.getDate() - b.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(a.getFullYear(), a.getMonth(), 0).getDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
};

export const formatAgeYMD = (birthDate, atDate) => {
  const p = ageParts(birthDate, atDate);
  if (!p) return '—';
  return `${p.years} ปี - ${p.months} เดือน - ${p.days} วัน`;
};

export const formatAgeShort = (birthDate, atDate) => {
  const p = ageParts(birthDate, atDate);
  if (!p) return '—';
  if (p.years === 0 && p.months === 0) return `${p.days} วัน`;
  if (p.years === 0) return `${p.months} เดือน ${p.days} วัน`;
  return `${p.years} ปี ${p.months} เดือน`;
};

export const ageInMonths = (birthDate, atDate) => {
  const p = ageParts(birthDate, atDate);
  if (!p) return null;
  return p.years * 12 + p.months + p.days / 30.4375;
};

export const addMonthsIso = (birthDate, months) => {
  if (!birthDate) return '';
  const b = new Date(`${String(birthDate).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(b.getTime())) return '';
  const d = new Date(b.getFullYear(), b.getMonth() + months, b.getDate());
  return d.toISOString().slice(0, 10);
};

/* ── ผู้ใช้ / บุคลากร / สิทธิเข้าถึงคลินิกเด็กดี ────────────────────── */
export const IMM_CURRENT_USER = 'พว.ศิริพร ใจดี';

export const IMM_NURSES = [
  'พว.ศิริพร ใจดี',
  'พว.มาลี พงษ์ทอง',
  'พว.นันทวัน ศรีสุข',
  'พว.อารีย์ เจริญพร',
];

export const IMM_DOCTORS = ['พญ.กมลรัตน์ วรกุล', 'นพ.ธีรภัทร สุขสวัสดิ์'];

export const IMM_ROOMS = ['ห้องเด็กดี 1', 'ห้องเด็กดี 2'];

/* สิทธิผู้ใช้งานคลินิกสุขภาพเด็กดี — ผู้ใช้ที่ไม่มีสิทธิเห็นข้อมูลได้แต่แก้ไม่ได้
   (read-only banner) ตาม edge case ของ spec. */
export const hasImmunizationRights = () => readJson(K.rights, 'granted') === 'granted';
export const setImmunizationRights = (granted) =>
  writeJson(K.rights, granted ? 'granted' : 'denied');

/* ── เด็กที่รับบริการ (PatientCard shape + วันเกิด/ผู้ปกครอง) ───────── */
export const IMM_CHILDREN = [
  {
    hn: '69-10001', vn: '69-20001',
    avatarUrl: '/avatars/immunization-child-01.png',
    shortName: 'ปุณณวิช สายทอง', fullName: 'ด.ช.ปุณณวิช สายทอง', englishName: 'Punnawich Saithong',
    sex: 'ชาย', birthDate: '2026-06-02', nationalId: '1100704512883',
    bloodType: 'O', patientType: 'ผู้ป่วยเก่า', doctor: 'พญ.กมลรัตน์ วรกุล',
    insurance: 'สิทธิบัตรทอง (UC เด็ก) ศบส.22 วัดปากบ่อ',
    address: '89/12 ซ.อ่อนนุช 17 สวนหลวง กรุงเทพมหานคร 10250',
    birthWeight: 3.15, birthPlace: 'โรงพยาบาลเจริญกรุงประชารักษ์', deliveryType: 'คลอดปกติ',
  },
  {
    hn: '69-10002', vn: '69-20002',
    avatarUrl: '/avatars/immunization-child-02.png',
    shortName: 'พิชญาภา แก้วมณี', fullName: 'ด.ญ.พิชญาภา แก้วมณี', englishName: 'Pitchayapa Kaewmanee',
    sex: 'หญิง', birthDate: '2026-02-14', nationalId: '1100704498271',
    bloodType: 'A', patientType: 'ผู้ป่วยเก่า', doctor: 'พญ.กมลรัตน์ วรกุล',
    insurance: 'สิทธิบัตรทอง (UC เด็ก) ศบส.22 วัดปากบ่อ',
    address: '55/3 ซ.พัฒนาการ 30 สวนหลวง กรุงเทพมหานคร 10250',
    birthWeight: 2.95, birthPlace: 'โรงพยาบาลกลาง', deliveryType: 'คลอดปกติ',
  },
  {
    hn: '69-10003', vn: '69-20003',
    avatarUrl: '/avatars/immunization-child-03.png',
    shortName: 'ณัฐกรณ์ บุญมาก', fullName: 'ด.ช.ณัฐกรณ์ บุญมาก', englishName: 'Nattakorn Boonmak',
    sex: 'ชาย', birthDate: '2025-11-05', nationalId: '1100704451930',
    bloodType: 'B', patientType: 'ผู้ป่วยเก่า', doctor: 'นพ.ธีรภัทร สุขสวัสดิ์',
    insurance: 'สิทธิข้าราชการ (บิดา) กรมบัญชีกลาง',
    address: '120/8 ซ.รามคำแหง 24 หัวหมาก บางกะปิ กรุงเทพมหานคร 10240',
    birthWeight: 3.40, birthPlace: 'โรงพยาบาลรามคำแหง', deliveryType: 'ผ่าตัดคลอด',
  },
  {
    hn: '69-10004', vn: '69-20004',
    avatarUrl: '/avatars/immunization-child-04.png',
    shortName: 'ไอลดา จันทร์เพ็ญ', fullName: 'ด.ญ.ไอลดา จันทร์เพ็ญ', englishName: 'Ailada Chanpen',
    sex: 'หญิง', birthDate: '2025-08-20', nationalId: '1100704412665',
    bloodType: 'O', patientType: 'ผู้ป่วยเก่า', doctor: 'พญ.กมลรัตน์ วรกุล',
    insurance: 'สิทธิประกันสังคม (มารดา) รพ.สิรินธร',
    address: '7/45 ชุมชนคลองจั่น บางกะปิ กรุงเทพมหานคร 10240',
    birthWeight: 2.70, birthPlace: 'โรงพยาบาลสิรินธร', deliveryType: 'คลอดปกติ',
  },
  {
    hn: '69-10005', vn: '69-20005',
    avatarUrl: '/avatars/immunization-child-05.png',
    shortName: 'กันตพัฒน์ ศรีวิชัย', fullName: 'ด.ช.กันตพัฒน์ ศรีวิชัย', englishName: 'Kantapat Sriwichai',
    sex: 'ชาย', birthDate: '2025-02-10', nationalId: '1100704377418',
    bloodType: 'AB', patientType: 'ผู้ป่วยเก่า', doctor: 'นพ.ธีรภัทร สุขสวัสดิ์',
    insurance: 'สิทธิบัตรทอง (UC เด็ก) ศบส.22 วัดปากบ่อ',
    address: '333 ซ.ลาดพร้าว 101 คลองจั่น บางกะปิ กรุงเทพมหานคร 10240',
    birthWeight: 3.05, birthPlace: 'โรงพยาบาลนพรัตนราชธานี', deliveryType: 'คลอดปกติ',
  },
  {
    hn: '69-10006', vn: '69-20006',
    avatarUrl: '/avatars/immunization-child-06.png',
    shortName: 'ธัญชนก ทองอยู่', fullName: 'ด.ญ.ธัญชนก ทองอยู่', englishName: 'Thanchanok Thongyoo',
    sex: 'หญิง', birthDate: '2024-02-28', nationalId: '1100704298114',
    bloodType: 'A', patientType: 'ผู้ป่วยเก่า', doctor: 'พญ.กมลรัตน์ วรกุล',
    insurance: 'สิทธิหมดอายุ (ต้องต่อสิทธิ)', rightsExpired: true,
    address: '19 ซ.เสรีไทย 41 คลองกุ่ม บึงกุ่ม กรุงเทพมหานคร 10240',
    birthWeight: 2.45, birthPlace: 'โรงพยาบาลนพรัตนราชธานี', deliveryType: 'คลอดปกติ',
  },
  {
    hn: '69-10007', vn: '69-20007',
    avatarUrl: '/avatars/immunization-child-07.png',
    shortName: 'ภูมิรพี เกิดผล', fullName: 'ด.ช.ภูมิรพี เกิดผล', englishName: 'Phumrapee Kerdphon',
    sex: 'ชาย', birthDate: '2022-07-15', nationalId: '1100704122507',
    bloodType: 'O', patientType: 'ผู้ป่วยเก่า', doctor: 'นพ.ธีรภัทร สุขสวัสดิ์',
    insurance: 'สิทธิบัตรทอง (UC เด็ก) ศบส.22 วัดปากบ่อ',
    address: '88 ซ.นวมินทร์ 70 คลองกุ่ม บึงกุ่ม กรุงเทพมหานคร 10240',
    birthWeight: 3.60, birthPlace: 'โรงพยาบาลเวชการุณย์รัศมิ์', deliveryType: 'คลอดปกติ',
  },
  {
    hn: '69-10008', vn: '69-20008',
    avatarUrl: '/avatars/immunization-child-08.png',
    shortName: 'ปวีณ์ธิดา นาคสุข', fullName: 'ด.ญ.ปวีณ์ธิดา นาคสุข', englishName: 'Paweethida Naksuk',
    sex: 'หญิง', birthDate: '2026-08-01', nationalId: '1100704531002',
    bloodType: 'B', patientType: 'ผู้ป่วยใหม่', doctor: 'พญ.กมลรัตน์ วรกุล',
    insurance: 'ชำระเอง (รอขึ้นทะเบียนสิทธิ)',
    address: '45/2 ซ.อ่อนนุช 46 สวนหลวง กรุงเทพมหานคร 10250',
    birthWeight: 2.60, birthPlace: 'โรงพยาบาลกลาง', deliveryType: 'คลอดปกติ',
  },
  {
    hn: '69-10009', vn: '69-20009',
    avatarUrl: '/avatars/immunization-child-09.png',
    shortName: 'เตชินท์ พูลสวัสดิ์', fullName: 'ด.ช.เตชินท์ พูลสวัสดิ์', englishName: 'Techin Poolsawat',
    sex: 'ชาย', birthDate: '2026-04-06', nationalId: '1100704505119',
    bloodType: 'O', patientType: 'ผู้ป่วยเก่า', doctor: 'พญ.กมลรัตน์ วรกุล',
    insurance: 'สิทธิบัตรทอง (UC เด็ก) ศบส.22 วัดปากบ่อ',
    address: '212 ซ.อ่อนนุช 65 ประเวศ กรุงเทพมหานคร 10250',
    birthWeight: 3.25, birthPlace: 'โรงพยาบาลสิรินธร', deliveryType: 'คลอดปกติ',
  },
  {
    hn: '69-10010', vn: '69-20010',
    avatarUrl: '/avatars/immunization-child-10.png',
    shortName: 'ณิชานันท์ อ่อนน้อม', fullName: 'ด.ญ.ณิชานันท์ อ่อนน้อม', englishName: 'Nichanan Onnom',
    sex: 'หญิง', birthDate: '2025-05-12', nationalId: '1100704391273',
    bloodType: 'A', patientType: 'ผู้ป่วยเก่า', doctor: 'นพ.ธีรภัทร สุขสวัสดิ์',
    insurance: 'สิทธิบัตรทอง (UC เด็ก) ศบส.22 วัดปากบ่อ',
    address: '9/9 ซ.พัฒนาการ 44 สวนหลวง กรุงเทพมหานคร 10250',
    birthWeight: 3.00, birthPlace: 'โรงพยาบาลกลาง', deliveryType: 'คลอดปกติ',
  },
];

export const getImmChild = (hn) => IMM_CHILDREN.find((c) => c.hn === hn) || null;

/* PatientCard ต้องการ `age` เป็นข้อความ — คำนวณสด ๆ จากวันเกิดทุกครั้ง */
export const getImmPatientCard = (hn) => {
  const c = getImmChild(hn);
  if (!c) return null;
  return {
    ...c,
    /* PatientCard renders a photograph whenever avatarUrl exists. The child
       portraits are curated project assets, not a generated or third-party
       icon, and preserve the Thai child context of this clinic. */
    avatarUrl: c.avatarUrl || (c.sex === 'หญิง'
      ? '/avatars/patient-child-girl.png'
      : '/avatars/patient-child-boy.png'),
    age: formatAgeYMD(c.birthDate),
  };
};

/* ── คิวคลินิกสุขภาพเด็กดี (คู่มือ HCIS §2.1) ──────────────────────── */
const todayAt = (h, m) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const IMM_QUEUE_PATIENTS = [
  {
    queue: 'V01', hn: '69-10001', doctor: 'พญ.กมลรัตน์ วรกุล', room: 'ห้องเด็กดี 1',
    arrivedAt: todayAt(8, 15), statusKey: 'waiting', waitMinutes: 22, visitType: 'followup',
    reason: 'นัดรับวัคซีนอายุ 2 เดือน', telemedicine: false,
  },
  {
    queue: 'V02', hn: '69-10002', doctor: 'พญ.กมลรัตน์ วรกุล', room: 'ห้องเด็กดี 1',
    arrivedAt: todayAt(8, 30), statusKey: 'waiting', waitMinutes: 14, visitType: 'followup',
    reason: 'นัดรับวัคซีนอายุ 6 เดือน + ชั่งน้ำหนัก', telemedicine: false,
  },
  {
    queue: 'V03', hn: '69-10003', doctor: 'นพ.ธีรภัทร สุขสวัสดิ์', room: 'ห้องเด็กดี 2',
    arrivedAt: todayAt(8, 45), statusKey: 'progress', waitMinutes: 35, visitType: 'followup',
    reason: 'นัดรับวัคซีน MMR อายุ 9 เดือน', telemedicine: false,
  },
  {
    queue: 'V04', hn: '69-10004', doctor: 'พญ.กมลรัตน์ วรกุล', room: 'ห้องเด็กดี 1',
    arrivedAt: todayAt(9, 5), statusKey: 'progress', waitMinutes: 18, visitType: 'followup',
    reason: 'ประเมินพัฒนาการ 12 เดือน + วัคซีน JE เข็ม 1',
    telemedicine: true, telemedAppointmentAt: todayAt(10, 30),
  },
  {
    queue: 'V05', hn: '69-10005', doctor: 'นพ.ธีรภัทร สุขสวัสดิ์', room: 'ห้องเด็กดี 2',
    arrivedAt: todayAt(9, 20), statusKey: 'done', waitMinutes: 0, visitType: 'followup',
    reason: 'วัคซีนอายุ 1 ปี 6 เดือน (DTP4, OPV4, MMR2)', telemedicine: false,
  },
  {
    queue: 'V06', hn: '69-10006', doctor: 'พญ.กมลรัตน์ วรกุล', room: 'ห้องเด็กดี 1',
    arrivedAt: todayAt(9, 40), statusKey: 'waiting', waitMinutes: 9, visitType: 'followup',
    reason: 'ตามเด็กค้างเข็ม — ขาดนัด JE เข็ม 2', telemedicine: false,
  },
  {
    queue: 'V07', hn: '69-10007', doctor: 'นพ.ธีรภัทร สุขสวัสดิ์', room: 'ห้องเด็กดี 2',
    arrivedAt: todayAt(10, 0), statusKey: 'draft', draftStep: 2, waitMinutes: 0, visitType: 'followup',
    reason: 'วัคซีนอายุ 4 ปี (DTP5, OPV5) + ตรวจสุขภาพก่อนเข้าเรียน', telemedicine: false,
  },
  {
    queue: 'V08', hn: '69-10008', doctor: 'พญ.กมลรัตน์ วรกุล', room: 'ห้องเด็กดี 1',
    arrivedAt: todayAt(10, 15), statusKey: 'waiting', waitMinutes: 5, visitType: 'first',
    reason: 'ตรวจหลังคลอดครั้งแรก + BCG/HBV แรกเกิด (คลอดที่ รพ. ยังไม่ได้รับ)',
    telemedicine: false,
  },
];

/* ผู้ป่วยนัดที่ยังไม่มาติดต่อ (คู่มือ §2.1 tab 2) */
export const IMM_SCHEDULED_TODAY = [
  {
    hn: '69-10009', appointmentTime: '13:00', doctor: 'พญ.กมลรัตน์ วรกุล',
    reason: 'นัดวัคซีนอายุ 4 เดือน (DTP-HB2, OPV2, IPV, Rota2, IPD2)', visitType: 'followup',
  },
  {
    hn: '69-10010', appointmentTime: '14:30', doctor: 'นพ.ธีรภัทร สุขสวัสดิ์',
    reason: 'นัดประเมินพัฒนาการ 15 เดือน', visitType: 'followup',
  },
];

/* วัคซีนที่ถึงกำหนดวันนี้ (คอลัมน์บนหน้าคิว) — คำนวณจาก EPI matrix จริง */
export const getDueVaccineLabels = (hn) => {
  const child = getImmChild(hn);
  if (!child) return [];
  const matrix = buildEpiMatrix(hn);
  return matrix
    .flatMap((row) => row.cells
      .filter((c) => c.status === 'due' || c.status === 'overdue')
      .map((c) => `${row.abbr} เข็ม ${c.seq}`))
    .slice(0, 4);
};

const decorateQueueRow = (row) => {
  const child = getImmChild(row.hn) || {};
  return {
    ...row,
    name: child.fullName || '—',
    shortName: child.shortName || '—',
    sex: child.sex || '—',
    birthDate: child.birthDate || '',
    age: formatAgeYMD(child.birthDate),
    ageShort: formatAgeShort(child.birthDate),
    cid: child.nationalId || '—',
    insurance: child.insurance || '—',
    rightsExpired: !!child.rightsExpired,
  };
};

export const checkInImmAppointment = (hn) => {
  const checked = readJson(K.checkedIn, []);
  if (!checked.includes(hn)) writeJson(K.checkedIn, [...checked, hn]);
};

export const getImmScheduledNotArrived = () => {
  const checked = readJson(K.checkedIn, []);
  const seeded = IMM_SCHEDULED_TODAY
    .filter((r) => !checked.includes(r.hn))
    .map(decorateQueueRow);
  /* นัดที่บันทึกจากขั้นตอนที่ 8 ของใบบันทึก จะโผล่ที่แท็บนี้ในวันถึงกำหนด */
  const today = todayIso();
  const booked = getAllImmAppointments()
    .filter((a) => a.date === today && a.status === 'booked' && !checked.includes(a.hn))
    .filter((a) => !seeded.some((s) => s.hn === a.hn))
    .map((a) => decorateQueueRow({
      hn: a.hn,
      appointmentTime: a.time || '—',
      doctor: a.doctor || '—',
      reason: a.note || 'นัดรับวัคซีนเข็มถัดไป',
      visitType: 'followup',
      fromVisitRecord: true,
      bookedBy: a.bookedBy,
      bookedAt: a.bookedAt,
    }));
  return [...seeded, ...booked];
};

export const getImmQueueRows = () => {
  const checked = readJson(K.checkedIn, []);
  const arrivals = IMM_SCHEDULED_TODAY
    .filter((r) => checked.includes(r.hn))
    .map((r, i) => decorateQueueRow({
      queue: `V${String(IMM_QUEUE_PATIENTS.length + i + 1).padStart(2, '0')}`,
      hn: r.hn, doctor: r.doctor, room: 'ห้องเด็กดี 1',
      arrivedAt: new Date().toISOString(),
      statusKey: 'waiting', waitMinutes: 0, visitType: r.visitType,
      reason: r.reason, telemedicine: false,
    }));
  return [...IMM_QUEUE_PATIENTS.map(decorateQueueRow), ...arrivals];
};

/* ยกเลิกคิว — audit (ผู้ยกเลิก + เวลา + เหตุผล), คืนคิวได้ */
export const cancelImmQueue = (hn, reason) => {
  const cancelled = readJson(K.queueCancelled, {});
  cancelled[hn] = { reason: reason || '', by: IMM_CURRENT_USER, at: new Date().toISOString() };
  writeJson(K.queueCancelled, cancelled);
};
export const restoreImmQueue = (hn) => {
  const cancelled = readJson(K.queueCancelled, {});
  delete cancelled[hn];
  writeJson(K.queueCancelled, cancelled);
};
export const getImmQueueCancellation = (hn) => readJson(K.queueCancelled, {})[hn] || null;

/* ── ทะเบียนผู้รับบริการสร้างเสริมภูมิคุ้มกัน (TOR 1.10.9.6) ────────── */
export const GUARDIAN_RELATIONS = [
  { value: 'father',    label: 'บิดา' },
  { value: 'mother',    label: 'มารดา' },
  { value: 'grandpa',   label: 'ปู่ / ตา' },
  { value: 'grandma',   label: 'ย่า / ยาย' },
  { value: 'relative',  label: 'ญาติ' },
  { value: 'caretaker', label: 'ผู้ดูแล / ผู้ปกครองตามกฎหมาย' },
];

export const resolveGuardianRelation = (v) =>
  GUARDIAN_RELATIONS.find((o) => o.value === v)?.label || '—';

export const EMPTY_GUARDIAN = { name: '', relation: '', phone: '', occupation: '' };

export const EMPTY_IMM_REGISTRATION = {
  id: '', epiNumber: '', hn: '', name: '', birthDate: '', sex: '',
  birthWeight: '', birthPlace: '', deliveryType: '',
  guardians: [{ ...EMPTY_GUARDIAN }],
  address: '', status: 'active',
};

export const DELIVERY_TYPES = [
  { value: 'normal',  label: 'คลอดปกติ (Normal labour)' },
  { value: 'cs',      label: 'ผ่าตัดคลอด (C/S)' },
  { value: 'vacuum',  label: 'ใช้เครื่องดูดสุญญากาศ (Vacuum)' },
  { value: 'forceps', label: 'ใช้คีม (Forceps)' },
];

export const resolveDeliveryType = (v) =>
  DELIVERY_TYPES.find((o) => o.value === v)?.label || v || '—';

const REGISTRY_SEED = [
  {
    id: 'epi-1', epiNumber: 'สภ.69-0001', hn: '69-10001',
    guardians: [
      { name: 'นางสาวจุฑามาศ สายทอง', relation: 'mother', phone: '081-234-5678', occupation: 'พนักงานบริษัท' },
      { name: 'นายวรพล สายทอง', relation: 'father', phone: '089-123-4567', occupation: 'ช่างเทคนิค' },
    ],
    registeredDate: '2026-06-09', status: 'active',
    recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-06-09T09:20:00',
  },
  {
    id: 'epi-2', epiNumber: 'สภ.69-0002', hn: '69-10002',
    guardians: [{ name: 'นางกัลยา แก้วมณี', relation: 'mother', phone: '086-555-1212', occupation: 'แม่บ้าน' }],
    registeredDate: '2026-02-21', status: 'active',
    recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2026-02-21T10:05:00',
  },
  {
    id: 'epi-3', epiNumber: 'สภ.69-0003', hn: '69-10003',
    guardians: [
      { name: 'นายอนุชา บุญมาก', relation: 'father', phone: '092-888-4141', occupation: 'ข้าราชการ' },
      { name: 'นางสุพรรณี บุญมาก', relation: 'mother', phone: '092-888-4142', occupation: 'ครู' },
    ],
    registeredDate: '2025-11-12', status: 'active',
    recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2025-11-12T08:50:00',
  },
  {
    id: 'epi-4', epiNumber: 'สภ.69-0004', hn: '69-10004',
    guardians: [{ name: 'นางสาวเบญจวรรณ จันทร์เพ็ญ', relation: 'mother', phone: '083-777-2020', occupation: 'ค้าขาย' }],
    registeredDate: '2025-08-27', status: 'active',
    recordedBy: 'พว.นันทวัน ศรีสุข', recordedAt: '2025-08-27T13:40:00',
  },
  {
    id: 'epi-5', epiNumber: 'สภ.69-0005', hn: '69-10005',
    guardians: [{ name: 'นางพัชรี ศรีวิชัย', relation: 'mother', phone: '095-303-1177', occupation: 'พยาบาล' }],
    registeredDate: '2025-02-17', status: 'active',
    recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2025-02-17T09:15:00',
  },
  {
    id: 'epi-6', epiNumber: 'สภ.69-0006', hn: '69-10006',
    guardians: [{ name: 'นางสมคิด ทองอยู่', relation: 'grandma', phone: '084-919-3355', occupation: 'รับจ้างทั่วไป' }],
    registeredDate: '2024-03-05', status: 'active',
    recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2024-03-05T11:30:00',
  },
  {
    id: 'epi-7', epiNumber: 'สภ.69-0007', hn: '69-10007',
    guardians: [{ name: 'นายกิตติพงษ์ เกิดผล', relation: 'father', phone: '090-456-7788', occupation: 'ขับรถส่งของ' }],
    registeredDate: '2022-07-22', status: 'active',
    recordedBy: 'พว.อารีย์ เจริญพร', recordedAt: '2022-07-22T10:10:00',
  },
  {
    id: 'epi-8', epiNumber: 'สภ.69-0008', hn: '69-10010',
    guardians: [{ name: 'นางสาวชลธิชา อ่อนน้อม', relation: 'mother', phone: '087-221-9090', occupation: 'พนักงานขาย' }],
    registeredDate: '2025-05-19', status: 'cancelled',
    cancellation: {
      reason: 'ย้ายไปรับบริการที่ ศบส.24 บางเขน (ผู้ปกครองแจ้งย้ายที่อยู่)',
      by: 'พว.ศิริพร ใจดี', at: '2026-07-02T14:05:00',
    },
    recordedBy: 'พว.นันทวัน ศรีสุข', recordedAt: '2025-05-19T09:00:00',
  },
];

const decorateRegistryRow = (row) => {
  const child = getImmChild(row.hn) || {};
  return {
    ...row,
    name: row.name || child.fullName || '—',
    sex: row.sex || child.sex || '—',
    birthDate: row.birthDate || child.birthDate || '',
    age: formatAgeYMD(row.birthDate || child.birthDate),
    birthWeight: row.birthWeight ?? child.birthWeight ?? '',
    birthPlace: row.birthPlace || child.birthPlace || '',
    deliveryType: row.deliveryType || child.deliveryType || '',
    address: row.address || child.address || '',
  };
};

export const getImmRegistryRows = () => {
  const overlay = readJson(K.registry, {});
  const seedIds = REGISTRY_SEED.map((r) => r.id);
  const merged = REGISTRY_SEED.map((r) => (overlay[r.id] ? { ...r, ...overlay[r.id] } : r));
  const added = Object.values(overlay).filter((r) => !seedIds.includes(r.id));
  return [...merged, ...added].map(decorateRegistryRow);
};

export const getImmRegistrationByHn = (hn) =>
  getImmRegistryRows().find((r) => r.hn === hn && r.status !== 'cancelled')
  || getImmRegistryRows().find((r) => r.hn === hn)
  || null;

/* HN ซ้ำ → เตือนก่อนสร้าง (ไม่บล็อค — เด็กอาจถูกลงทะเบียนซ้ำจากคนละจุด) */
export const findImmRegistrationDuplicate = (entry) =>
  getImmRegistryRows().find((r) => r.id !== entry.id && r.hn === (entry.hn || '').trim()) || null;

const nextEpiNumber = () => {
  const base = 8;
  const run = readJson(K.registryRun, base) + 1;
  writeJson(K.registryRun, run);
  return `สภ.69-${String(run).padStart(4, '0')}`;
};

export const saveImmRegistration = (entry) => {
  const overlay = readJson(K.registry, {});
  const isNew = !entry.id;
  const saved = {
    ...entry,
    id: entry.id || `epi-new-${Date.now()}`,
    epiNumber: entry.epiNumber || nextEpiNumber(),
    registeredDate: entry.registeredDate || todayIso(),
    status: entry.status || 'active',
    recordedBy: IMM_CURRENT_USER,
    recordedAt: new Date().toISOString(),
  };
  overlay[saved.id] = saved;
  writeJson(K.registry, overlay);
  return { saved, isNew };
};

export const cancelImmRegistration = (id, reason) => {
  const overlay = readJson(K.registry, {});
  const current = getImmRegistryRows().find((r) => r.id === id);
  if (!current) return;
  overlay[id] = {
    ...current,
    status: 'cancelled',
    cancellation: { reason: reason || '', by: IMM_CURRENT_USER, at: new Date().toISOString() },
  };
  writeJson(K.registry, overlay);
};

export const reactivateImmRegistration = (id) => {
  const overlay = readJson(K.registry, {});
  const current = getImmRegistryRows().find((r) => r.id === id);
  if (!current) return;
  overlay[id] = { ...current, status: 'active', cancellation: null };
  writeJson(K.registry, overlay);
};

/* ── ทะเบียนวัคซีนรายคน / สมุดวัคซีน (TOR §1.11.2) ──────────────────
   dose = เข็มหนึ่งครั้ง: { id, hn, vaccineId, seq, date, time, route, dose,
   site, lotNo, expiry, vialNo, place, otherFacility, facilityName,
   reference, immediateReaction, nurse, status, recordedBy/At,
   editedBy/At, cancellation }. */
const DOSE_SEED = [
  /* 69-10001 (2 เดือน) — แรกเกิดครบ */
  { id: 'd-1001-1', hn: '69-10001', vaccineId: 'vac-bcg', seq: 1, date: '2026-06-02', time: '10:20', site: 'lt-forearm', lotNo: 'BCG-6901', expiry: '2027-03-31', vialNo: '3', place: 'โรงพยาบาลเจริญกรุงประชารักษ์', otherFacility: true, facilityName: 'โรงพยาบาลเจริญกรุงประชารักษ์', reference: 'สมุดสีชมพู หน้า 12', immediateReaction: '', nurse: 'พว.รพ.เจริญกรุง', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-06-09T09:25:00' },
  { id: 'd-1001-2', hn: '69-10001', vaccineId: 'vac-hbv', seq: 1, date: '2026-06-02', time: '10:25', site: 'rt-thigh', lotNo: 'HBV-6903', expiry: '2027-06-30', vialNo: '5', place: 'โรงพยาบาลเจริญกรุงประชารักษ์', otherFacility: true, facilityName: 'โรงพยาบาลเจริญกรุงประชารักษ์', reference: 'สมุดสีชมพู หน้า 12', immediateReaction: '', nurse: 'พว.รพ.เจริญกรุง', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-06-09T09:26:00' },

  /* 69-10002 (6 เดือน) — ครบถึง 4 เดือน, 6 เดือนยังไม่ได้ (ถึงกำหนดวันนี้) */
  { id: 'd-1002-1', hn: '69-10002', vaccineId: 'vac-bcg', seq: 1, date: '2026-02-14', time: '09:40', site: 'lt-forearm', lotNo: 'BCG-6812', expiry: '2026-08-20', vialNo: '1', place: 'โรงพยาบาลกลาง', otherFacility: true, facilityName: 'โรงพยาบาลกลาง', reference: 'สมุดสีชมพู หน้า 12', immediateReaction: '', nurse: 'พว.รพ.กลาง', status: 'active', recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2026-02-21T10:10:00' },
  { id: 'd-1002-2', hn: '69-10002', vaccineId: 'vac-hbv', seq: 1, date: '2026-02-14', time: '09:45', site: 'rt-thigh', lotNo: 'HBV-6903', expiry: '2027-06-30', vialNo: '5', place: 'โรงพยาบาลกลาง', otherFacility: true, facilityName: 'โรงพยาบาลกลาง', reference: 'สมุดสีชมพู หน้า 12', immediateReaction: '', nurse: 'พว.รพ.กลาง', status: 'active', recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2026-02-21T10:11:00' },
  { id: 'd-1002-3', hn: '69-10002', vaccineId: 'vac-dtphb', seq: 1, date: '2026-04-18', time: '10:05', site: 'lt-thigh', lotNo: 'DTPHB-6905', expiry: '2027-01-31', vialNo: '2', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-04-18T10:08:00' },
  { id: 'd-1002-4', hn: '69-10002', vaccineId: 'vac-opv', seq: 1, date: '2026-04-18', time: '10:07', site: 'oral', lotNo: 'OPV-6907', expiry: '2026-12-31', vialNo: '4', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-04-18T10:09:00' },
  { id: 'd-1002-5', hn: '69-10002', vaccineId: 'vac-dtphb', seq: 2, date: '2026-06-16', time: '09:50', site: 'rt-thigh', lotNo: 'DTPHB-6905', expiry: '2027-01-31', vialNo: '6', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: 'ไข้ต่ำ ๆ 37.8 °C หลังฉีด 30 นาที', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-06-16T09:55:00' },
  { id: 'd-1002-6', hn: '69-10002', vaccineId: 'vac-opv', seq: 2, date: '2026-06-16', time: '09:52', site: 'oral', lotNo: 'OPV-6907', expiry: '2026-12-31', vialNo: '6', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-06-16T09:56:00' },

  /* 69-10003 (9 เดือน) — มีเข็มที่ถูกยกเลิก (บันทึกผิดคน) เพื่อ demo ดูย้อนหลัง */
  { id: 'd-1003-1', hn: '69-10003', vaccineId: 'vac-bcg', seq: 1, date: '2025-11-05', time: '14:10', site: 'lt-forearm', lotNo: 'BCG-6812', expiry: '2026-08-20', vialNo: '2', place: 'โรงพยาบาลรามคำแหง', otherFacility: true, facilityName: 'โรงพยาบาลรามคำแหง', reference: 'ใบสรุปการคลอด เลขที่ 68/4471', immediateReaction: '', nurse: 'พว.รพ.รามคำแหง', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2025-11-12T08:55:00' },
  { id: 'd-1003-2', hn: '69-10003', vaccineId: 'vac-hbv', seq: 1, date: '2025-11-05', time: '14:15', site: 'rt-thigh', lotNo: 'HBV-6740', expiry: '2026-05-31', vialNo: '1', place: 'โรงพยาบาลรามคำแหง', otherFacility: true, facilityName: 'โรงพยาบาลรามคำแหง', reference: 'ใบสรุปการคลอด เลขที่ 68/4471', immediateReaction: '', nurse: 'พว.รพ.รามคำแหง', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2025-11-12T08:56:00' },
  { id: 'd-1003-3', hn: '69-10003', vaccineId: 'vac-dtphb', seq: 1, date: '2026-01-08', time: '09:30', site: 'lt-thigh', lotNo: 'DTPHB-6905', expiry: '2027-01-31', vialNo: '1', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.มาลี พงษ์ทอง', status: 'active', recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2026-01-08T09:35:00' },
  { id: 'd-1003-4', hn: '69-10003', vaccineId: 'vac-opv', seq: 1, date: '2026-01-08', time: '09:32', site: 'oral', lotNo: 'OPV-6907', expiry: '2026-12-31', vialNo: '1', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.มาลี พงษ์ทอง', status: 'active', recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2026-01-08T09:36:00' },
  { id: 'd-1003-5', hn: '69-10003', vaccineId: 'vac-dtphb', seq: 2, date: '2026-03-10', time: '10:15', site: 'rt-thigh', lotNo: 'DTPHB-6905', expiry: '2027-01-31', vialNo: '3', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.มาลี พงษ์ทอง', status: 'active', recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2026-03-10T10:18:00' },
  { id: 'd-1003-6', hn: '69-10003', vaccineId: 'vac-opv', seq: 2, date: '2026-03-10', time: '10:17', site: 'oral', lotNo: 'OPV-6907', expiry: '2026-12-31', vialNo: '3', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.มาลี พงษ์ทอง', status: 'active', recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2026-03-10T10:19:00' },
  { id: 'd-1003-7', hn: '69-10003', vaccineId: 'vac-dtphb', seq: 3, date: '2026-05-12', time: '09:20', site: 'lt-thigh', lotNo: 'DTPHB-6905', expiry: '2027-01-31', vialNo: '5', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: 'บวมแดงบริเวณที่ฉีด ขนาด 2 ซม.', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-05-12T09:25:00' },
  { id: 'd-1003-8', hn: '69-10003', vaccineId: 'vac-opv', seq: 3, date: '2026-05-12', time: '09:22', site: 'oral', lotNo: 'OPV-6907', expiry: '2026-12-31', vialNo: '5', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-05-12T09:26:00' },
  {
    id: 'd-1003-9', hn: '69-10003', vaccineId: 'vac-ipv', seq: 1, date: '2026-05-12', time: '09:24',
    site: 'rt-thigh', lotNo: 'IPV-6902', expiry: '2027-09-30', vialNo: '2', place: 'ศบส.22 วัดปากบ่อ',
    otherFacility: false, immediateReaction: '', nurse: 'พว.ศิริพร ใจดี', status: 'cancelled',
    recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-05-12T09:28:00',
    cancellation: { reason: 'บันทึกผิดคน — เป็นเข็มของ HN 69-10009', by: 'พว.ศิริพร ใจดี', at: '2026-05-12T15:40:00' },
  },

  /* 69-10004 (12 เดือน) — ครบถึง 9 เดือน */
  { id: 'd-1004-1', hn: '69-10004', vaccineId: 'vac-bcg', seq: 1, date: '2025-08-20', time: '11:00', site: 'lt-forearm', lotNo: 'BCG-6812', expiry: '2026-08-20', vialNo: '3', place: 'โรงพยาบาลสิรินธร', otherFacility: true, facilityName: 'โรงพยาบาลสิรินธร', reference: 'สมุดสีชมพู หน้า 12', immediateReaction: '', nurse: 'พว.รพ.สิรินธร', status: 'active', recordedBy: 'พว.นันทวัน ศรีสุข', recordedAt: '2025-08-27T13:45:00' },
  { id: 'd-1004-2', hn: '69-10004', vaccineId: 'vac-hbv', seq: 1, date: '2025-08-20', time: '11:05', site: 'rt-thigh', lotNo: 'HBV-6740', expiry: '2026-05-31', vialNo: '2', place: 'โรงพยาบาลสิรินธร', otherFacility: true, facilityName: 'โรงพยาบาลสิรินธร', reference: 'สมุดสีชมพู หน้า 12', immediateReaction: '', nurse: 'พว.รพ.สิรินธร', status: 'active', recordedBy: 'พว.นันทวัน ศรีสุข', recordedAt: '2025-08-27T13:46:00' },
  { id: 'd-1004-3', hn: '69-10004', vaccineId: 'vac-dtphb', seq: 1, date: '2025-10-22', time: '09:10', site: 'lt-thigh', lotNo: 'DTPHB-6905', expiry: '2027-01-31', vialNo: '1', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.นันทวัน ศรีสุข', status: 'active', recordedBy: 'พว.นันทวัน ศรีสุข', recordedAt: '2025-10-22T09:14:00' },
  { id: 'd-1004-4', hn: '69-10004', vaccineId: 'vac-dtphb', seq: 2, date: '2025-12-18', time: '09:15', site: 'rt-thigh', lotNo: 'DTPHB-6905', expiry: '2027-01-31', vialNo: '2', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.นันทวัน ศรีสุข', status: 'active', recordedBy: 'พว.นันทวัน ศรีสุข', recordedAt: '2025-12-18T09:19:00' },
  { id: 'd-1004-5', hn: '69-10004', vaccineId: 'vac-dtphb', seq: 3, date: '2026-02-20', time: '09:25', site: 'lt-thigh', lotNo: 'DTPHB-6905', expiry: '2027-01-31', vialNo: '4', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-02-20T09:29:00' },
  { id: 'd-1004-6', hn: '69-10004', vaccineId: 'vac-opv', seq: 1, date: '2025-10-22', time: '09:12', site: 'oral', lotNo: 'OPV-6907', expiry: '2026-12-31', vialNo: '1', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.นันทวัน ศรีสุข', status: 'active', recordedBy: 'พว.นันทวัน ศรีสุข', recordedAt: '2025-10-22T09:16:00' },
  { id: 'd-1004-7', hn: '69-10004', vaccineId: 'vac-opv', seq: 2, date: '2025-12-18', time: '09:17', site: 'oral', lotNo: 'OPV-6907', expiry: '2026-12-31', vialNo: '2', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.นันทวัน ศรีสุข', status: 'active', recordedBy: 'พว.นันทวัน ศรีสุข', recordedAt: '2025-12-18T09:21:00' },
  { id: 'd-1004-8', hn: '69-10004', vaccineId: 'vac-opv', seq: 3, date: '2026-02-20', time: '09:27', site: 'oral', lotNo: 'OPV-6907', expiry: '2026-12-31', vialNo: '4', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-02-20T09:31:00' },
  { id: 'd-1004-9', hn: '69-10004', vaccineId: 'vac-mmr', seq: 1, date: '2026-05-21', time: '10:40', site: 'lt-deltoid', lotNo: 'MMR-6908', expiry: '2027-04-30', vialNo: '2', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-05-21T10:45:00' },

  /* 69-10005 (18 เดือน) — ครบตามเกณฑ์ */
  { id: 'd-1005-1', hn: '69-10005', vaccineId: 'vac-bcg', seq: 1, date: '2025-02-10', time: '08:40', site: 'lt-forearm', lotNo: 'BCG-6812', expiry: '2026-08-20', vialNo: '1', place: 'โรงพยาบาลนพรัตนราชธานี', otherFacility: true, facilityName: 'โรงพยาบาลนพรัตนราชธานี', reference: 'สมุดสีชมพู หน้า 12', immediateReaction: '', nurse: 'พว.รพ.นพรัตน์', status: 'active', recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2025-02-17T09:20:00' },
  { id: 'd-1005-2', hn: '69-10005', vaccineId: 'vac-hbv', seq: 1, date: '2025-02-10', time: '08:45', site: 'rt-thigh', lotNo: 'HBV-6740', expiry: '2026-05-31', vialNo: '1', place: 'โรงพยาบาลนพรัตนราชธานี', otherFacility: true, facilityName: 'โรงพยาบาลนพรัตนราชธานี', reference: 'สมุดสีชมพู หน้า 12', immediateReaction: '', nurse: 'พว.รพ.นพรัตน์', status: 'active', recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2025-02-17T09:21:00' },
  { id: 'd-1005-3', hn: '69-10005', vaccineId: 'vac-dtphb', seq: 1, date: '2025-04-14', time: '09:00', site: 'lt-thigh', lotNo: 'DTPHB-6905', expiry: '2027-01-31', vialNo: '1', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.มาลี พงษ์ทอง', status: 'active', recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2025-04-14T09:05:00' },
  { id: 'd-1005-4', hn: '69-10005', vaccineId: 'vac-dtphb', seq: 2, date: '2025-06-16', time: '09:00', site: 'rt-thigh', lotNo: 'DTPHB-6905', expiry: '2027-01-31', vialNo: '2', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.มาลี พงษ์ทอง', status: 'active', recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2025-06-16T09:05:00' },
  { id: 'd-1005-5', hn: '69-10005', vaccineId: 'vac-dtphb', seq: 3, date: '2025-08-18', time: '09:00', site: 'lt-thigh', lotNo: 'DTPHB-6905', expiry: '2027-01-31', vialNo: '3', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.มาลี พงษ์ทอง', status: 'active', recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2025-08-18T09:05:00' },
  { id: 'd-1005-6', hn: '69-10005', vaccineId: 'vac-opv', seq: 1, date: '2025-04-14', time: '09:02', site: 'oral', lotNo: 'OPV-6907', expiry: '2026-12-31', vialNo: '1', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.มาลี พงษ์ทอง', status: 'active', recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2025-04-14T09:07:00' },
  { id: 'd-1005-7', hn: '69-10005', vaccineId: 'vac-opv', seq: 2, date: '2025-06-16', time: '09:02', site: 'oral', lotNo: 'OPV-6907', expiry: '2026-12-31', vialNo: '2', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.มาลี พงษ์ทอง', status: 'active', recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2025-06-16T09:07:00' },
  { id: 'd-1005-8', hn: '69-10005', vaccineId: 'vac-opv', seq: 3, date: '2025-08-18', time: '09:02', site: 'oral', lotNo: 'OPV-6907', expiry: '2026-12-31', vialNo: '3', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.มาลี พงษ์ทอง', status: 'active', recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2025-08-18T09:07:00' },
  { id: 'd-1005-9', hn: '69-10005', vaccineId: 'vac-mmr', seq: 1, date: '2025-11-17', time: '10:00', site: 'lt-deltoid', lotNo: 'MMR-6801', expiry: '2026-08-31', vialNo: '1', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2025-11-17T10:05:00' },
  { id: 'd-1005-10', hn: '69-10005', vaccineId: 'vac-je', seq: 1, date: '2026-02-16', time: '10:10', site: 'rt-deltoid', lotNo: 'JE-6906', expiry: '2027-05-31', vialNo: '1', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-02-16T10:14:00' },
  { id: 'd-1005-11', hn: '69-10005', vaccineId: 'vac-dtp', seq: 4, date: '2026-08-06', time: '09:35', site: 'lt-deltoid', lotNo: 'DTP-6904', expiry: '2027-02-28', vialNo: '2', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-08-06T09:40:00' },
  { id: 'd-1005-12', hn: '69-10005', vaccineId: 'vac-opv', seq: 4, date: '2026-08-06', time: '09:37', site: 'oral', lotNo: 'OPV-6907', expiry: '2026-12-31', vialNo: '7', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-08-06T09:41:00' },
  { id: 'd-1005-13', hn: '69-10005', vaccineId: 'vac-mmr', seq: 2, date: '2026-08-06', time: '09:39', site: 'rt-deltoid', lotNo: 'MMR-6908', expiry: '2027-04-30', vialNo: '4', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-08-06T09:42:00' },

  /* 69-10006 (2 ปี 5 เดือน) — ค้างเข็ม JE2 / เกินกำหนด (catch-up) */
  { id: 'd-1006-1', hn: '69-10006', vaccineId: 'vac-bcg', seq: 1, date: '2024-02-28', time: '13:00', site: 'lt-forearm', lotNo: 'BCG-6812', expiry: '2026-08-20', vialNo: '1', place: 'โรงพยาบาลนพรัตนราชธานี', otherFacility: true, facilityName: 'โรงพยาบาลนพรัตนราชธานี', reference: 'สมุดสีชมพู หน้า 12', immediateReaction: '', nurse: 'พว.รพ.นพรัตน์', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2024-03-05T11:35:00' },
  { id: 'd-1006-2', hn: '69-10006', vaccineId: 'vac-hbv', seq: 1, date: '2024-02-28', time: '13:05', site: 'rt-thigh', lotNo: 'HBV-6740', expiry: '2026-05-31', vialNo: '1', place: 'โรงพยาบาลนพรัตนราชธานี', otherFacility: true, facilityName: 'โรงพยาบาลนพรัตนราชธานี', reference: 'สมุดสีชมพู หน้า 12', immediateReaction: '', nurse: 'พว.รพ.นพรัตน์', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2024-03-05T11:36:00' },
  { id: 'd-1006-3', hn: '69-10006', vaccineId: 'vac-dtphb', seq: 1, date: '2024-05-06', time: '09:30', site: 'lt-thigh', lotNo: 'DTPHB-6905', expiry: '2027-01-31', vialNo: '1', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2024-05-06T09:34:00' },
  { id: 'd-1006-4', hn: '69-10006', vaccineId: 'vac-dtphb', seq: 2, date: '2024-07-08', time: '09:30', site: 'rt-thigh', lotNo: 'DTPHB-6905', expiry: '2027-01-31', vialNo: '2', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2024-07-08T09:34:00' },
  { id: 'd-1006-5', hn: '69-10006', vaccineId: 'vac-opv', seq: 1, date: '2024-05-06', time: '09:32', site: 'oral', lotNo: 'OPV-6907', expiry: '2026-12-31', vialNo: '1', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2024-05-06T09:36:00' },
  { id: 'd-1006-6', hn: '69-10006', vaccineId: 'vac-opv', seq: 2, date: '2024-07-08', time: '09:32', site: 'oral', lotNo: 'OPV-6907', expiry: '2026-12-31', vialNo: '2', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2024-07-08T09:36:00' },
  { id: 'd-1006-7', hn: '69-10006', vaccineId: 'vac-mmr', seq: 1, date: '2024-12-02', time: '10:20', site: 'lt-deltoid', lotNo: 'MMR-6801', expiry: '2026-08-31', vialNo: '1', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.มาลี พงษ์ทอง', status: 'active', recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2024-12-02T10:25:00' },

  /* 69-10007 (4 ปี) — ครบถึง 2 ปี 6 เดือน, 4 ปีถึงกำหนดวันนี้ */
  { id: 'd-1007-1', hn: '69-10007', vaccineId: 'vac-bcg', seq: 1, date: '2022-07-15', time: '12:10', site: 'lt-forearm', lotNo: 'BCG-6812', expiry: '2026-08-20', vialNo: '1', place: 'โรงพยาบาลเวชการุณย์รัศมิ์', otherFacility: true, facilityName: 'โรงพยาบาลเวชการุณย์รัศมิ์', reference: 'สมุดสีชมพู หน้า 12', immediateReaction: '', nurse: 'พว.รพ.เวชการุณย์', status: 'active', recordedBy: 'พว.อารีย์ เจริญพร', recordedAt: '2022-07-22T10:15:00' },
  { id: 'd-1007-2', hn: '69-10007', vaccineId: 'vac-hbv', seq: 1, date: '2022-07-15', time: '12:15', site: 'rt-thigh', lotNo: 'HBV-6740', expiry: '2026-05-31', vialNo: '1', place: 'โรงพยาบาลเวชการุณย์รัศมิ์', otherFacility: true, facilityName: 'โรงพยาบาลเวชการุณย์รัศมิ์', reference: 'สมุดสีชมพู หน้า 12', immediateReaction: '', nurse: 'พว.รพ.เวชการุณย์', status: 'active', recordedBy: 'พว.อารีย์ เจริญพร', recordedAt: '2022-07-22T10:16:00' },
  { id: 'd-1007-3', hn: '69-10007', vaccineId: 'vac-dtphb', seq: 1, date: '2022-09-20', time: '09:40', site: 'lt-thigh', lotNo: 'DTPHB-6905', expiry: '2027-01-31', vialNo: '1', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.อารีย์ เจริญพร', status: 'active', recordedBy: 'พว.อารีย์ เจริญพร', recordedAt: '2022-09-20T09:45:00' },
  { id: 'd-1007-4', hn: '69-10007', vaccineId: 'vac-dtphb', seq: 2, date: '2022-11-22', time: '09:40', site: 'rt-thigh', lotNo: 'DTPHB-6905', expiry: '2027-01-31', vialNo: '2', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.อารีย์ เจริญพร', status: 'active', recordedBy: 'พว.อารีย์ เจริญพร', recordedAt: '2022-11-22T09:45:00' },
  { id: 'd-1007-5', hn: '69-10007', vaccineId: 'vac-dtphb', seq: 3, date: '2023-01-24', time: '09:40', site: 'lt-thigh', lotNo: 'DTPHB-6905', expiry: '2027-01-31', vialNo: '3', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.อารีย์ เจริญพร', status: 'active', recordedBy: 'พว.อารีย์ เจริญพร', recordedAt: '2023-01-24T09:45:00' },
  { id: 'd-1007-6', hn: '69-10007', vaccineId: 'vac-opv', seq: 1, date: '2022-09-20', time: '09:42', site: 'oral', lotNo: 'OPV-6907', expiry: '2026-12-31', vialNo: '1', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.อารีย์ เจริญพร', status: 'active', recordedBy: 'พว.อารีย์ เจริญพร', recordedAt: '2022-09-20T09:47:00' },
  { id: 'd-1007-7', hn: '69-10007', vaccineId: 'vac-opv', seq: 2, date: '2022-11-22', time: '09:42', site: 'oral', lotNo: 'OPV-6907', expiry: '2026-12-31', vialNo: '2', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.อารีย์ เจริญพร', status: 'active', recordedBy: 'พว.อารีย์ เจริญพร', recordedAt: '2022-11-22T09:47:00' },
  { id: 'd-1007-8', hn: '69-10007', vaccineId: 'vac-opv', seq: 3, date: '2023-01-24', time: '09:42', site: 'oral', lotNo: 'OPV-6907', expiry: '2026-12-31', vialNo: '3', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.อารีย์ เจริญพร', status: 'active', recordedBy: 'พว.อารีย์ เจริญพร', recordedAt: '2023-01-24T09:47:00' },
  { id: 'd-1007-9', hn: '69-10007', vaccineId: 'vac-mmr', seq: 1, date: '2023-04-19', time: '10:30', site: 'lt-deltoid', lotNo: 'MMR-6801', expiry: '2026-08-31', vialNo: '1', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.อารีย์ เจริญพร', status: 'active', recordedBy: 'พว.อารีย์ เจริญพร', recordedAt: '2023-04-19T10:35:00' },
  { id: 'd-1007-10', hn: '69-10007', vaccineId: 'vac-je', seq: 1, date: '2023-07-19', time: '10:30', site: 'rt-deltoid', lotNo: 'JE-6906', expiry: '2027-05-31', vialNo: '1', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.อารีย์ เจริญพร', status: 'active', recordedBy: 'พว.อารีย์ เจริญพร', recordedAt: '2023-07-19T10:35:00' },
  { id: 'd-1007-11', hn: '69-10007', vaccineId: 'vac-dtp', seq: 4, date: '2024-01-17', time: '09:50', site: 'lt-deltoid', lotNo: 'DTP-6904', expiry: '2027-02-28', vialNo: '1', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.มาลี พงษ์ทอง', status: 'active', recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2024-01-17T09:55:00' },
  { id: 'd-1007-12', hn: '69-10007', vaccineId: 'vac-opv', seq: 4, date: '2024-01-17', time: '09:52', site: 'oral', lotNo: 'OPV-6907', expiry: '2026-12-31', vialNo: '4', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.มาลี พงษ์ทอง', status: 'active', recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2024-01-17T09:57:00' },
  { id: 'd-1007-13', hn: '69-10007', vaccineId: 'vac-mmr', seq: 2, date: '2024-01-17', time: '09:54', site: 'rt-deltoid', lotNo: 'MMR-6801', expiry: '2026-08-31', vialNo: '2', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.มาลี พงษ์ทอง', status: 'active', recordedBy: 'พว.มาลี พงษ์ทอง', recordedAt: '2024-01-17T09:59:00' },
  { id: 'd-1007-14', hn: '69-10007', vaccineId: 'vac-je', seq: 2, date: '2025-01-15', time: '10:00', site: 'lt-deltoid', lotNo: 'JE-6906', expiry: '2027-05-31', vialNo: '3', place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, immediateReaction: '', nurse: 'พว.ศิริพร ใจดี', status: 'active', recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2025-01-15T10:05:00' },
];

/* 69-10008 (แรกเกิด 1 สัปดาห์) ตั้งใจให้ยังไม่มีเข็มเลย — demo empty state */

const doseOverlay = () => readJson(K.doses, {});

export const getAllImmDoses = () => {
  const overlay = doseOverlay();
  const seedIds = DOSE_SEED.map((d) => d.id);
  const merged = DOSE_SEED.map((d) => (overlay[d.id] ? { ...d, ...overlay[d.id] } : d));
  const added = Object.values(overlay).filter((d) => !seedIds.includes(d.id));
  return [...merged, ...added];
};

const doseSortKey = (d) => `${d.date || ''} ${d.time || ''}`;

export const getImmDoses = (hn) =>
  getAllImmDoses()
    .filter((d) => d.hn === hn)
    .sort((a, b) => doseSortKey(b).localeCompare(doseSortKey(a)));

export const getActiveImmDoses = (hn) =>
  getImmDoses(hn).filter((d) => d.status !== 'cancelled');

export const EMPTY_DOSE = {
  id: '', hn: '', vaccineId: '', seq: 1, date: '', time: '',
  site: '', lotNo: '', expiry: '', vialNo: '',
  place: 'ศบส.22 วัดปากบ่อ', otherFacility: false, facilityName: '', reference: '',
  immediateReaction: '', reactionOnsetTime: '', nurse: IMM_CURRENT_USER,
  claimSubmitted: false, status: 'active',
};

const nextDoseId = () => {
  const run = readJson(K.doseRun, 0) + 1;
  writeJson(K.doseRun, run);
  return `d-new-${run}`;
};

/* บันทึก / แก้ไข เข็มวัคซีน — audit ผู้บันทึก+เวลา และ ผู้แก้ไข+เวลา */
export const saveImmDose = (entry) => {
  const overlay = doseOverlay();
  const isNew = !entry.id;
  const now = new Date().toISOString();
  const saved = isNew
    ? { ...entry, id: nextDoseId(), status: 'active', recordedBy: IMM_CURRENT_USER, recordedAt: now }
    : { ...entry, editedBy: IMM_CURRENT_USER, editedAt: now };
  overlay[saved.id] = saved;
  writeJson(K.doses, overlay);
  return { saved, isNew };
};

/* ยกเลิกเข็ม — เก็บแถวเดิมไว้สถานะ "ยกเลิก" พร้อมเหตุผล (§1.11.2.3) */
export const cancelImmDose = (id, reason) => {
  const overlay = doseOverlay();
  const current = getAllImmDoses().find((d) => d.id === id);
  if (!current) return;
  overlay[id] = {
    ...current,
    status: 'cancelled',
    cancellation: { reason: reason || '', by: IMM_CURRENT_USER, at: new Date().toISOString() },
  };
  writeJson(K.doses, overlay);
};

export const restoreImmDose = (id) => {
  const overlay = doseOverlay();
  const current = getAllImmDoses().find((d) => d.id === id);
  if (!current) return;
  overlay[id] = { ...current, status: 'active', cancellation: null };
  writeJson(K.doses, overlay);
};

/* ── EPI completeness matrix (§1.11.2.4) ────────────────────────────
   สถานะเข็ม: done (ได้รับแล้ว) · due (ถึงกำหนด) · overdue (เกินกำหนด) ·
   upcoming (ยังไม่ถึงกำหนด). "เกินกำหนด" = เลยกำหนดมากกว่า 30 วัน. */
export const DOSE_STATUS_META = {
  done:     { label: 'ได้รับแล้ว',     style: 'green',  icon: 'check_circle' },
  due:      { label: 'ถึงกำหนด',       style: 'orange', icon: 'schedule' },
  overdue:  { label: 'เกินกำหนด',      style: 'red',    icon: 'warning' },
  upcoming: { label: 'ยังไม่ถึงกำหนด', style: 'grey',   icon: 'more_horiz' },
};

const OVERDUE_GRACE_DAYS = 30;

export const buildEpiMatrix = (hn) => {
  const child = getImmChild(hn);
  const doses = getActiveImmDoses(hn);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return getVaccineCatalogRows()
    .filter((v) => v.status === 'active' || doses.some((d) => d.vaccineId === v.id))
    .map((vaccine) => {
      const cells = (vaccine.schedule || []).map((s) => {
        const given = doses.find((d) => d.vaccineId === vaccine.id && Number(d.seq) === Number(s.seq));
        const dueIso = child ? addMonthsIso(child.birthDate, s.months) : '';
        let status = 'upcoming';
        if (given) status = 'done';
        else if (dueIso) {
          const due = new Date(`${dueIso}T00:00:00`);
          const overdueDays = Math.round((today - due) / 86400000);
          if (overdueDays > OVERDUE_GRACE_DAYS) status = 'overdue';
          else if (overdueDays >= 0) status = 'due';
        }
        return {
          seq: s.seq, months: s.months, dueDate: dueIso, status,
          given: given || null,
          milestoneKey: EPI_AGE_MILESTONES.find((m) => m.months === s.months)?.key || `m${s.months}`,
        };
      });
      return {
        vaccineId: vaccine.id,
        code: vaccine.code,
        abbr: vaccine.abbr,
        nameTh: vaccine.nameTh,
        status: vaccine.status,
        cells,
      };
    });
};

export const summarizeEpi = (hn) => {
  const matrix = buildEpiMatrix(hn);
  const cells = matrix.flatMap((r) => r.cells);
  const done = cells.filter((c) => c.status === 'done').length;
  const due = cells.filter((c) => c.status === 'due').length;
  const overdue = cells.filter((c) => c.status === 'overdue').length;
  const upcoming = cells.filter((c) => c.status === 'upcoming').length;
  const expected = done + due + overdue;
  const complete = overdue === 0 && due === 0;
  return {
    done, due, overdue, upcoming, expected,
    complete,
    percent: expected === 0 ? 100 : Math.round((done / expected) * 100),
    label: complete ? 'ครบตามเกณฑ์' : overdue > 0 ? `ค้าง ${overdue} เข็ม (เกินกำหนด)` : `ถึงกำหนด ${due} เข็ม`,
    style: complete ? 'green' : overdue > 0 ? 'red' : 'orange',
  };
};

/* เข็มถัดไปที่ถึงกำหนด (ใช้ทั้งหน้า follow-up และการนัดหมาย) */
export const getNextDueDoses = (hn) => {
  const matrix = buildEpiMatrix(hn);
  return matrix
    .flatMap((row) => row.cells
      .filter((c) => c.status === 'due' || c.status === 'overdue' || c.status === 'upcoming')
      .map((c) => ({
        vaccineId: row.vaccineId, abbr: row.abbr, nameTh: row.nameTh,
        seq: c.seq, dueDate: c.dueDate, status: c.status,
      })))
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
};

/* ── AEFI — อาการไม่พึงประสงค์ภายหลังได้รับวัคซีน (§1.11.2.5) ───────── */
export const AEFI_SEVERITY = [
  { value: 'mild',     label: 'ไม่รุนแรง (หายเองได้)' },
  { value: 'moderate', label: 'ปานกลาง (ต้องรักษาที่หน่วยบริการ)' },
  { value: 'severe',   label: 'รุนแรง (ต้องส่งต่อ / รับไว้ในโรงพยาบาล)' },
];

export const resolveAefiSeverity = (v) => AEFI_SEVERITY.find((o) => o.value === v)?.label || '—';

export const AEFI_SEVERITY_STYLE = { mild: 'yellow', moderate: 'orange', severe: 'red' };

export const EMPTY_AEFI = {
  id: '', hn: '', doseId: '', symptom: '', onsetDate: '', onsetTime: '',
  severity: '', treatment: '', outcome: '', reportedBy: '', status: 'active',
};

const AEFI_SEED = [
  {
    id: 'aefi-1', hn: '69-10003', doseId: 'd-1003-7',
    symptom: 'บวมแดงร้อนบริเวณที่ฉีดต้นขาซ้าย ขนาดประมาณ 3 ซม. ร่วมกับไข้ 38.2 °C',
    onsetDate: '2026-05-12', onsetTime: '18:30', severity: 'mild',
    treatment: 'ประคบเย็น ให้ Paracetamol syrup ตามน้ำหนัก แนะนำผู้ปกครองสังเกตอาการ 48 ชม.',
    outcome: 'อาการดีขึ้นภายใน 2 วัน ไม่มีภาวะแทรกซ้อน',
    reportedBy: 'พว.ศิริพร ใจดี', status: 'active',
    recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-05-13T09:10:00',
  },
  {
    id: 'aefi-2', hn: '69-10002', doseId: 'd-1002-5',
    symptom: 'ไข้ต่ำ ๆ 37.8 °C งอแง ไม่ยอมดูดนม 1 มื้อ',
    onsetDate: '2026-06-16', onsetTime: '14:00', severity: 'mild',
    treatment: 'เช็ดตัวลดไข้ ให้ดื่มนมบ่อยขึ้น ติดตามทางโทรศัพท์',
    outcome: 'ไข้ลงภายใน 24 ชม.',
    reportedBy: 'พว.ศิริพร ใจดี', status: 'active',
    recordedBy: 'พว.ศิริพร ใจดี', recordedAt: '2026-06-17T08:40:00',
  },
];

export const getAllAefi = () => {
  const overlay = readJson(K.aefi, {});
  const seedIds = AEFI_SEED.map((a) => a.id);
  const merged = AEFI_SEED.map((a) => (overlay[a.id] ? { ...a, ...overlay[a.id] } : a));
  const added = Object.values(overlay).filter((a) => !seedIds.includes(a.id));
  return [...merged, ...added];
};

export const getAefiRecords = (hn) =>
  getAllAefi()
    .filter((a) => a.hn === hn)
    .sort((a, b) => String(b.onsetDate).localeCompare(String(a.onsetDate)));

export const saveAefi = (entry) => {
  const overlay = readJson(K.aefi, {});
  const isNew = !entry.id;
  const now = new Date().toISOString();
  const run = readJson(K.aefiRun, 0) + 1;
  if (isNew) writeJson(K.aefiRun, run);
  const saved = isNew
    ? { ...entry, id: `aefi-new-${run}`, status: 'active', recordedBy: IMM_CURRENT_USER, recordedAt: now }
    : { ...entry, editedBy: IMM_CURRENT_USER, editedAt: now };
  overlay[saved.id] = saved;
  writeJson(K.aefi, overlay);
  return { saved, isNew };
};

export const cancelAefi = (id, reason) => {
  const overlay = readJson(K.aefi, {});
  const current = getAllAefi().find((a) => a.id === id);
  if (!current) return;
  overlay[id] = {
    ...current,
    status: 'cancelled',
    cancellation: { reason: reason || '', by: IMM_CURRENT_USER, at: new Date().toISOString() },
  };
  writeJson(K.aefi, overlay);
};

export const restoreAefi = (id) => {
  const overlay = readJson(K.aefi, {});
  const current = getAllAefi().find((a) => a.id === id);
  if (!current) return;
  overlay[id] = { ...current, status: 'active', cancellation: null };
  writeJson(K.aefi, overlay);
};

export const describeDose = (dose) => {
  if (!dose) return '—';
  const vaccine = getVaccineById(dose.vaccineId);
  return `${vaccine?.abbr || dose.vaccineId} เข็มที่ ${dose.seq} · ${formatImmDate(dose.date)}`;
};

/* ── การเจริญเติบโต (growth records) ────────────────────────────────
   record = { date, weight (kg), height (cm), headCirc, chestCirc,
   fontanelleAnterior, fontanellePosterior } */
export const GROWTH_SEED = {
  '69-10001': [
    { date: '2026-06-09', weight: 3.4, height: 51.0, headCirc: 35.0, chestCirc: 33.5, fontanelleAnterior: '2x2 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2026-07-08', weight: 4.6, height: 55.2, headCirc: 37.4, chestCirc: 35.8, fontanelleAnterior: '2x2 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
  ],
  '69-10002': [
    { date: '2026-02-21', weight: 3.1, height: 50.0, headCirc: 34.2, chestCirc: 32.8, fontanelleAnterior: '2x2 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2026-04-18', weight: 5.2, height: 57.5, headCirc: 38.6, chestCirc: 37.0, fontanelleAnterior: '2x1.5 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2026-06-16', weight: 6.6, height: 62.4, headCirc: 40.8, chestCirc: 40.0, fontanelleAnterior: '1.5x1.5 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
  ],
  '69-10003': [
    { date: '2025-11-12', weight: 3.5, height: 51.5, headCirc: 35.3, chestCirc: 33.8, fontanelleAnterior: '2x2 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2026-01-08', weight: 5.5, height: 58.0, headCirc: 39.0, chestCirc: 37.4, fontanelleAnterior: '2x2 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2026-03-10', weight: 6.9, height: 63.2, headCirc: 41.4, chestCirc: 40.6, fontanelleAnterior: '1.5x1.5 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2026-05-12', weight: 7.8, height: 67.0, headCirc: 43.0, chestCirc: 42.5, fontanelleAnterior: '1x1 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
  ],
  '69-10004': [
    { date: '2025-10-22', weight: 4.9, height: 56.0, headCirc: 37.8, chestCirc: 36.2, fontanelleAnterior: '2x2 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2025-12-18', weight: 6.0, height: 60.5, headCirc: 39.9, chestCirc: 39.0, fontanelleAnterior: '1.5x1.5 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2026-02-20', weight: 6.9, height: 64.8, headCirc: 41.6, chestCirc: 41.2, fontanelleAnterior: '1.5x1 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2026-05-21', weight: 7.6, height: 69.2, headCirc: 43.4, chestCirc: 43.0, fontanelleAnterior: '1x1 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
  ],
  '69-10005': [
    { date: '2025-04-14', weight: 5.2, height: 57.0, headCirc: 38.4, chestCirc: 36.8, fontanelleAnterior: '2x2 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2025-08-18', weight: 7.5, height: 66.0, headCirc: 42.5, chestCirc: 42.0, fontanelleAnterior: '1.5x1.5 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2025-11-17', weight: 8.6, height: 71.5, headCirc: 44.6, chestCirc: 44.5, fontanelleAnterior: '1x1 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2026-02-16', weight: 9.6, height: 76.0, headCirc: 45.9, chestCirc: 46.0, fontanelleAnterior: '0.5x0.5 ซม.', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2026-08-06', weight: 11.2, height: 82.5, headCirc: 47.5, chestCirc: 48.5, fontanelleAnterior: 'ปิดแล้ว', fontanellePosterior: 'ปิดแล้ว' },
  ],
  '69-10006': [
    { date: '2024-05-06', weight: 4.4, height: 55.0, headCirc: 37.0, chestCirc: 35.5, fontanelleAnterior: '2x2 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2024-12-02', weight: 7.2, height: 68.5, headCirc: 42.8, chestCirc: 43.0, fontanelleAnterior: '1x1 ซม.', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2025-06-10', weight: 8.9, height: 78.0, headCirc: 45.0, chestCirc: 46.0, fontanelleAnterior: 'ปิดแล้ว', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2026-01-20', weight: 10.1, height: 85.0, headCirc: 46.4, chestCirc: 48.0, fontanelleAnterior: 'ปิดแล้ว', fontanellePosterior: 'ปิดแล้ว' },
  ],
  '69-10007': [
    { date: '2023-04-19', weight: 8.4, height: 71.0, headCirc: 44.5, chestCirc: 44.8, fontanelleAnterior: '1x1 ซม.', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2024-01-17', weight: 10.8, height: 82.0, headCirc: 47.0, chestCirc: 48.5, fontanelleAnterior: 'ปิดแล้ว', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2025-01-15', weight: 13.0, height: 92.0, headCirc: 48.6, chestCirc: 51.0, fontanelleAnterior: 'ปิดแล้ว', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2026-02-10', weight: 15.4, height: 101.0, headCirc: 49.8, chestCirc: 53.5, fontanelleAnterior: 'ปิดแล้ว', fontanellePosterior: 'ปิดแล้ว' },
  ],
  /* 69-10008 ไม่มีข้อมูล growth เลย — demo empty chart state
     69-10009 มีจุดเดียว — demo "จุดข้อมูลเดียว ไม่ลากเส้น" */
  '69-10009': [
    { date: '2026-06-08', weight: 6.2, height: 61.0, headCirc: 40.2, chestCirc: 39.5, fontanelleAnterior: '1.5x1.5 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
  ],
  '69-10010': [
    { date: '2025-08-12', weight: 5.8, height: 60.0, headCirc: 39.6, chestCirc: 38.8, fontanelleAnterior: '1.5x1.5 ซม. ปกติ', fontanellePosterior: 'ปิดแล้ว' },
    { date: '2026-02-11', weight: 8.2, height: 71.0, headCirc: 43.5, chestCirc: 44.0, fontanelleAnterior: '1x1 ซม.', fontanellePosterior: 'ปิดแล้ว' },
  ],
};

export const getGrowthRecords = (hn) => {
  const seeded = GROWTH_SEED[hn] || [];
  const fromVisits = getImmVisitRecords(hn)
    .filter((v) => v.growth && (v.growth.weight || v.growth.height))
    .map((v) => ({
      date: (v.savedAt || '').slice(0, 10),
      weight: Number(v.growth.weight) || null,
      height: Number(v.growth.height) || null,
      headCirc: Number(v.growth.headCirc) || null,
      chestCirc: Number(v.growth.chestCirc) || null,
      fontanelleAnterior: v.growth.fontanelleAnterior || '',
      fontanellePosterior: v.growth.fontanellePosterior || '',
      fromVisit: true,
    }));
  return [...seeded, ...fromVisits].sort((a, b) => String(a.date).localeCompare(String(b.date)));
};

/* ── กราฟการเจริญเติบโต — เกณฑ์อ้างอิง (mock, ย่อจากกราฟกรมอนามัย) ──
   ค่าที่ใช้เป็นชุดย่อสำหรับ prototype เท่านั้น ยังไม่ได้เชื่อมตาราง LMS จริง
   (บันทึกไว้ใน notes ของ manifest). */
const REF = (x, p3, p50, p97) => ({ x, p3, p50, p97 });

export const GROWTH_REFERENCE = {
  /* น้ำหนักตามอายุ 0–36 เดือน (แกน x = เดือน, y = กก.) */
  weight0to36: {
    ชาย: [
      REF(0, 2.5, 3.3, 4.4), REF(1, 3.4, 4.5, 5.8), REF(2, 4.3, 5.6, 7.1), REF(3, 5.0, 6.4, 8.0),
      REF(4, 5.6, 7.0, 8.7), REF(6, 6.4, 7.9, 9.8), REF(9, 7.1, 8.9, 11.0), REF(12, 7.7, 9.6, 11.8),
      REF(18, 8.6, 10.9, 13.5), REF(24, 9.7, 12.2, 15.3), REF(30, 10.5, 13.3, 16.7), REF(36, 11.3, 14.3, 18.3),
    ],
    หญิง: [
      REF(0, 2.4, 3.2, 4.2), REF(1, 3.2, 4.2, 5.5), REF(2, 3.9, 5.1, 6.6), REF(3, 4.5, 5.8, 7.5),
      REF(4, 5.0, 6.4, 8.2), REF(6, 5.7, 7.3, 9.3), REF(9, 6.5, 8.2, 10.5), REF(12, 7.0, 8.9, 11.5),
      REF(18, 7.9, 10.2, 13.2), REF(24, 9.0, 11.5, 15.0), REF(30, 9.8, 12.7, 16.5), REF(36, 10.8, 13.9, 18.0),
    ],
  },
  /* ความยาว/ส่วนสูงตามอายุ 0–36 เดือน (ซม.) */
  length0to36: {
    ชาย: [
      REF(0, 46.1, 49.9, 53.7), REF(1, 50.8, 54.7, 58.6), REF(2, 54.4, 58.4, 62.4), REF(3, 57.3, 61.4, 65.5),
      REF(4, 59.7, 63.9, 68.0), REF(6, 63.6, 67.6, 71.6), REF(9, 68.0, 72.0, 76.5), REF(12, 71.0, 75.7, 80.5),
      REF(18, 76.0, 82.3, 86.7), REF(24, 80.0, 87.1, 92.2), REF(30, 83.6, 91.9, 97.0), REF(36, 87.0, 96.1, 101.5),
    ],
    หญิง: [
      REF(0, 45.4, 49.1, 52.9), REF(1, 49.8, 53.7, 57.6), REF(2, 53.0, 57.1, 61.1), REF(3, 55.6, 59.8, 64.0),
      REF(4, 57.8, 62.1, 66.4), REF(6, 61.2, 65.7, 70.3), REF(9, 65.3, 70.1, 75.0), REF(12, 68.9, 74.0, 79.2),
      REF(18, 74.0, 80.7, 85.5), REF(24, 78.0, 85.7, 90.7), REF(30, 82.5, 90.7, 95.5), REF(36, 85.7, 95.1, 100.0),
    ],
  },
  /* เส้นรอบศีรษะตามอายุ 0–36 เดือน (ซม.) */
  head0to36: {
    ชาย: [
      REF(0, 32.1, 34.5, 36.9), REF(1, 35.1, 37.3, 39.5), REF(2, 36.9, 39.1, 41.3), REF(3, 38.3, 40.5, 42.7),
      REF(4, 39.2, 41.6, 43.9), REF(6, 41.5, 43.3, 45.5), REF(9, 43.5, 45.2, 47.4), REF(12, 44.7, 46.1, 48.5),
      REF(18, 46.0, 47.4, 49.8), REF(24, 46.9, 48.3, 50.8), REF(30, 47.6, 49.1, 51.6), REF(36, 48.2, 49.8, 52.3),
    ],
    หญิง: [
      REF(0, 31.7, 33.9, 36.1), REF(1, 34.3, 36.5, 38.7), REF(2, 36.0, 38.3, 40.5), REF(3, 37.2, 39.5, 41.9),
      REF(4, 38.2, 40.6, 42.9), REF(6, 40.3, 42.2, 44.6), REF(9, 42.3, 44.0, 46.4), REF(12, 43.5, 45.0, 47.5),
      REF(18, 44.9, 46.4, 49.0), REF(24, 45.8, 47.4, 50.0), REF(30, 46.6, 48.2, 50.8), REF(36, 47.2, 48.8, 51.5),
    ],
  },
  /* น้ำหนักตามเกณฑ์ส่วนสูง (แกน x = ส่วนสูง ซม., y = กก.) */
  weightForHeight: {
    ชาย: [
      REF(65, 6.3, 7.4, 8.8), REF(70, 7.0, 8.3, 9.8), REF(75, 7.8, 9.2, 10.9), REF(80, 8.6, 10.2, 12.1),
      REF(85, 9.5, 11.2, 13.4), REF(90, 10.4, 12.4, 14.9), REF(95, 11.4, 13.7, 16.6), REF(100, 12.5, 15.2, 18.6),
      REF(105, 13.8, 16.8, 21.0), REF(110, 15.2, 18.7, 23.7), REF(115, 16.8, 20.9, 27.0), REF(120, 18.6, 23.5, 30.9),
    ],
    หญิง: [
      REF(65, 6.1, 7.2, 8.7), REF(70, 6.8, 8.1, 9.7), REF(75, 7.6, 9.1, 10.9), REF(80, 8.4, 10.1, 12.1),
      REF(85, 9.3, 11.1, 13.5), REF(90, 10.2, 12.3, 15.0), REF(95, 11.2, 13.6, 16.8), REF(100, 12.3, 15.0, 18.9),
      REF(105, 13.6, 16.7, 21.4), REF(110, 15.0, 18.6, 24.3), REF(115, 16.7, 20.9, 27.8), REF(120, 18.6, 23.6, 31.9),
    ],
  },
  /* น้ำหนักตามอายุ 2–19 ปี (แกน x = เดือน) */
  weight2to19: {
    ชาย: [
      REF(24, 9.7, 12.2, 15.3), REF(36, 11.3, 14.3, 18.3), REF(48, 12.7, 16.3, 21.2), REF(60, 14.1, 18.3, 24.2),
      REF(72, 15.9, 20.5, 27.8), REF(84, 17.7, 22.9, 32.0), REF(96, 19.5, 25.4, 36.9), REF(108, 21.3, 28.1, 42.4),
      REF(120, 23.5, 31.2, 48.5), REF(132, 26.0, 34.7, 54.9), REF(144, 29.0, 38.8, 61.3), REF(156, 32.5, 43.4, 67.5),
      REF(168, 36.5, 48.3, 73.3), REF(180, 41.0, 53.1, 78.5), REF(192, 45.0, 57.1, 82.9), REF(204, 48.5, 60.2, 86.4),
      REF(216, 51.0, 62.5, 89.2), REF(228, 53.0, 64.4, 91.4),
    ],
    หญิง: [
      REF(24, 9.0, 11.5, 14.8), REF(36, 10.8, 13.9, 18.1), REF(48, 12.3, 16.1, 21.5), REF(60, 13.7, 18.2, 25.2),
      REF(72, 15.3, 20.2, 29.5), REF(84, 17.0, 22.4, 34.0), REF(96, 18.6, 25.0, 39.2), REF(108, 20.8, 28.2, 45.0),
      REF(120, 23.3, 31.9, 50.9), REF(132, 26.1, 36.1, 56.8), REF(144, 29.0, 40.0, 61.6), REF(156, 32.0, 43.5, 65.5),
      REF(168, 35.0, 46.7, 68.5), REF(180, 37.5, 49.2, 70.6), REF(192, 39.5, 51.0, 72.0), REF(204, 41.0, 52.1, 73.0),
      REF(216, 42.0, 52.8, 73.5), REF(228, 42.5, 53.2, 74.0),
    ],
  },
  /* ส่วนสูงตามอายุ 2–19 ปี (ซม.) */
  height2to19: {
    ชาย: [
      REF(24, 81.0, 87.1, 93.2), REF(36, 88.7, 96.1, 103.5), REF(48, 94.9, 103.3, 111.7), REF(60, 100.7, 110.0, 119.3),
      REF(72, 106.1, 116.0, 125.9), REF(84, 111.2, 121.7, 132.2), REF(96, 116.0, 127.3, 138.6), REF(108, 120.5, 132.6, 144.7),
      REF(120, 125.0, 137.8, 150.6), REF(132, 129.7, 143.1, 156.5), REF(144, 134.8, 149.1, 163.4), REF(156, 140.9, 156.0, 171.1),
      REF(168, 147.6, 163.2, 178.8), REF(180, 153.7, 169.0, 184.3), REF(192, 158.2, 172.9, 187.6), REF(204, 160.9, 175.2, 189.5),
      REF(216, 162.3, 176.1, 190.0), REF(228, 163.0, 176.5, 190.0),
    ],
    หญิง: [
      REF(24, 79.9, 86.0, 92.1), REF(36, 87.4, 95.1, 102.7), REF(48, 93.9, 102.7, 111.5), REF(60, 99.9, 109.4, 118.9),
      REF(72, 105.0, 115.1, 125.4), REF(84, 109.9, 120.8, 131.7), REF(96, 114.5, 126.6, 138.6), REF(108, 119.1, 132.5, 145.9),
      REF(120, 124.0, 138.6, 153.2), REF(132, 129.7, 145.0, 160.3), REF(144, 135.9, 151.2, 166.5), REF(156, 141.2, 156.4, 171.5),
      REF(168, 144.7, 159.8, 174.9), REF(180, 146.7, 161.7, 176.7), REF(192, 147.6, 162.5, 177.4), REF(204, 148.0, 162.9, 177.8),
      REF(216, 148.2, 163.0, 177.9), REF(228, 148.3, 163.1, 178.0),
    ],
  },
};

const interpolateRef = (rows, x) => {
  if (!rows || rows.length === 0) return null;
  if (x <= rows[0].x) return rows[0];
  if (x >= rows[rows.length - 1].x) return rows[rows.length - 1];
  for (let i = 0; i < rows.length - 1; i += 1) {
    const a = rows[i];
    const b = rows[i + 1];
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x);
      return {
        x,
        p3: a.p3 + (b.p3 - a.p3) * t,
        p50: a.p50 + (b.p50 - a.p50) * t,
        p97: a.p97 + (b.p97 - a.p97) * t,
      };
    }
  }
  return rows[rows.length - 1];
};

/* Normal CDF approximation (Abramowitz & Stegun 26.2.17) — แปลง z → percentile */
const normalCdf = (z) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
};

/* P3 ≈ −1.881 SD, P97 ≈ +1.881 SD → ประมาณ SD จากช่วง p3–p97 */
export const evaluatePercentile = (refRows, x, value) => {
  const band = interpolateRef(refRows, x);
  if (!band || value == null || Number.isNaN(Number(value))) return null;
  const sd = (band.p97 - band.p3) / (2 * 1.881);
  if (!sd) return null;
  const z = (Number(value) - band.p50) / sd;
  const percentile = Math.round(normalCdf(z) * 1000) / 10;
  let label = 'ตามเกณฑ์';
  let style = 'green';
  if (z < -2) { label = 'ต่ำกว่าเกณฑ์'; style = 'red'; }
  else if (z < -1.5) { label = 'ค่อนข้างน้อย'; style = 'orange'; }
  else if (z > 2) { label = 'เกินเกณฑ์'; style = 'red'; }
  else if (z > 1.5) { label = 'ค่อนข้างมาก'; style = 'orange'; }
  return { z: Math.round(z * 100) / 100, percentile, label, style, band };
};

export const GROWTH_CHART_DEFS = [
  {
    key: 'length0to36',
    title: 'ความยาว/ส่วนสูงตามอายุ (แรกเกิด – 36 เดือน)',
    unit: 'ซม.', axis: 'months', axisLabel: 'อายุ (เดือน)',
    field: 'height', maxX: 36, referenceKey: 'length0to36',
  },
  {
    key: 'weight0to36',
    title: 'น้ำหนักตามอายุ (แรกเกิด – 36 เดือน)',
    unit: 'กก.', axis: 'months', axisLabel: 'อายุ (เดือน)',
    field: 'weight', maxX: 36, referenceKey: 'weight0to36',
  },
  {
    key: 'head0to36',
    title: 'เส้นรอบศีรษะตามอายุ (percentile)',
    unit: 'ซม.', axis: 'months', axisLabel: 'อายุ (เดือน)',
    field: 'headCirc', maxX: 36, referenceKey: 'head0to36',
  },
  {
    key: 'weightForHeight',
    title: 'น้ำหนักตามเกณฑ์ส่วนสูง',
    unit: 'กก.', axis: 'height', axisLabel: 'ส่วนสูง (ซม.)',
    field: 'weight', referenceKey: 'weightForHeight',
  },
  {
    key: 'height2to19',
    title: 'ส่วนสูงตามอายุ (2 – 19 ปี)',
    unit: 'ซม.', axis: 'months', axisLabel: 'อายุ (เดือน)', minX: 24, maxX: 228,
    field: 'height', referenceKey: 'height2to19',
  },
  {
    key: 'weight2to19',
    title: 'น้ำหนักตามอายุ (2 – 19 ปี)',
    unit: 'กก.', axis: 'months', axisLabel: 'อายุ (เดือน)', minX: 24, maxX: 228,
    field: 'weight', referenceKey: 'weight2to19',
  },
];

/* จับคู่ record → จุดบนกราฟ (x ตามชนิดแกน) */
export const buildGrowthPoints = (def, records, birthDate) => records
  .map((r) => {
    const value = r[def.field];
    if (value == null || value === '') return null;
    const x = def.axis === 'height' ? Number(r.height) : ageInMonths(birthDate, r.date);
    if (x == null || Number.isNaN(Number(x))) return null;
    if (def.minX != null && x < def.minX) return null;
    if (def.maxX != null && x > def.maxX) return null;
    return { x: Number(x), y: Number(value), date: r.date };
  })
  .filter(Boolean)
  .sort((a, b) => a.x - b.x);

/* ── พัฒนาการเด็ก — DSPM (คู่มือเฝ้าระวังและส่งเสริมพัฒนาการเด็กปฐมวัย) ──
   เกณฑ์ที่ใช้ที่นี่เป็นชุดย่อ (mock) — เกณฑ์เต็มรอเชื่อม backend. */
export const DSPM_DOMAINS = [
  { key: 'GM', label: 'GM — การเคลื่อนไหว (Gross Motor)' },
  { key: 'FM', label: 'FM — กล้ามเนื้อมัดเล็กและสติปัญญา (Fine Motor)' },
  { key: 'RL', label: 'RL — การเข้าใจภาษา (Receptive Language)' },
  { key: 'EL', label: 'EL — การใช้ภาษา (Expressive Language)' },
  { key: 'PS', label: 'PS — การช่วยเหลือตนเองและสังคม (Personal & Social)' },
];

export const DSPM_AGE_BANDS = [
  {
    months: 1, label: 'แรกเกิด – 1 เดือน',
    items: [
      { domain: 'GM', text: 'ท่านอนคว่ำ ยกศีรษะและหันไปข้างใดข้างหนึ่งได้' },
      { domain: 'FM', text: 'มองตามหน้าคนถึงกึ่งกลางลำตัว' },
      { domain: 'RL', text: 'สะดุ้งหรือเคลื่อนไหวเมื่อได้ยินเสียงพูดระดับปกติ' },
      { domain: 'EL', text: 'ส่งเสียงอ้อแอ้ในลำคอ' },
      { domain: 'PS', text: 'มองจ้องหน้าผู้เลี้ยงดูได้นาน 1–2 วินาที' },
    ],
  },
  {
    months: 2, label: '2 เดือน',
    items: [
      { domain: 'GM', text: 'ท่านอนคว่ำ ยกศีรษะตั้งขึ้น 45 องศา' },
      { domain: 'FM', text: 'มองตามวัตถุจากด้านหนึ่งไปอีกด้านหนึ่ง' },
      { domain: 'RL', text: 'หันหาเสียงเรียก' },
      { domain: 'EL', text: 'ส่งเสียงอูอาโต้ตอบ' },
      { domain: 'PS', text: 'ยิ้มตอบเมื่อผู้เลี้ยงดูยิ้มให้' },
    ],
  },
  {
    months: 4, label: '4 เดือน',
    items: [
      { domain: 'GM', text: 'ท่านอนคว่ำ ยันแขนยกอกพ้นพื้น' },
      { domain: 'FM', text: 'คว้าของที่อยู่ตรงหน้าเข้าหาตัว' },
      { domain: 'RL', text: 'หันหาเสียงเรียกชื่อได้ถูกทิศทาง' },
      { domain: 'EL', text: 'ส่งเสียงหัวเราะดังได้' },
      { domain: 'PS', text: 'ยิ้มทักคนที่คุ้นเคย' },
    ],
  },
  {
    months: 6, label: '6 เดือน',
    items: [
      { domain: 'GM', text: 'พลิกคว่ำพลิกหงายได้เอง' },
      { domain: 'FM', text: 'ถือของมือละชิ้นและเปลี่ยนมือได้' },
      { domain: 'RL', text: 'หันหาเสียงเรียกชื่อทันที' },
      { domain: 'EL', text: 'ส่งเสียงพยางค์เดียวซ้ำ ๆ เช่น "บา" "ดา"' },
      { domain: 'PS', text: 'แสดงท่าทีกลัวคนแปลกหน้า' },
    ],
  },
  {
    months: 9, label: '9 เดือน',
    items: [
      { domain: 'GM', text: 'นั่งได้มั่นคงโดยไม่ต้องพยุง' },
      { domain: 'FM', text: 'ใช้นิ้วหัวแม่มือกับนิ้วชี้หยิบของชิ้นเล็ก' },
      { domain: 'RL', text: 'หยุดทำเมื่อได้ยินคำว่า "ไม่"' },
      { domain: 'EL', text: 'เล่นเสียงเลียนแบบ เช่น "หม่ำ ๆ"' },
      { domain: 'PS', text: 'เล่นจ๊ะเอ๋โต้ตอบ' },
    ],
  },
  {
    months: 12, label: '12 เดือน',
    items: [
      { domain: 'GM', text: 'เกาะยืน / ตั้งไข่ได้' },
      { domain: 'FM', text: 'หยิบของใส่ภาชนะได้' },
      { domain: 'RL', text: 'ทำตามคำสั่งง่าย ๆ ที่มีท่าทางประกอบ' },
      { domain: 'EL', text: 'พูดคำที่มีความหมาย 1 คำ เช่น "แม่"' },
      { domain: 'PS', text: 'โบกมือลา / ปรบมือตามได้' },
    ],
  },
  {
    months: 18, label: '18 เดือน',
    items: [
      { domain: 'GM', text: 'เดินได้เองอย่างมั่นคง' },
      { domain: 'FM', text: 'ต่อก้อนไม้ 2–3 ชั้น' },
      { domain: 'RL', text: 'ชี้อวัยวะบนร่างกายได้อย่างน้อย 1 ส่วน' },
      { domain: 'EL', text: 'พูดคำที่มีความหมายได้ 4–6 คำ' },
      { domain: 'PS', text: 'ใช้ช้อนตักอาหารเข้าปากเองได้บ้าง' },
    ],
  },
  {
    months: 24, label: '2 ปี',
    items: [
      { domain: 'GM', text: 'วิ่งได้โดยไม่ล้ม / เตะลูกบอล' },
      { domain: 'FM', text: 'ต่อก้อนไม้ 5–6 ชั้น' },
      { domain: 'RL', text: 'ทำตามคำสั่ง 2 ขั้นตอนได้' },
      { domain: 'EL', text: 'พูดเป็นวลี 2 คำติดกัน' },
      { domain: 'PS', text: 'ถอดกางเกงเองได้' },
    ],
  },
  {
    months: 30, label: '2 ปี 6 เดือน',
    items: [
      { domain: 'GM', text: 'กระโดดสองเท้าพ้นพื้น' },
      { domain: 'FM', text: 'ขีดเส้นตรงตามแบบได้' },
      { domain: 'RL', text: 'ชี้ภาพตามชื่อได้ 4 ภาพ' },
      { domain: 'EL', text: 'บอกชื่อตนเองได้' },
      { domain: 'PS', text: 'บอกความต้องการเข้าห้องน้ำได้' },
    ],
  },
  {
    months: 36, label: '3 ปี',
    items: [
      { domain: 'GM', text: 'ยืนขาเดียวได้ 1–2 วินาที' },
      { domain: 'FM', text: 'วาดวงกลมตามแบบได้' },
      { domain: 'RL', text: 'เข้าใจคำบุพบท เช่น "บน" "ใต้"' },
      { domain: 'EL', text: 'พูดประโยค 3 คำขึ้นไป' },
      { domain: 'PS', text: 'เล่นร่วมกับเด็กอื่นได้' },
    ],
  },
  {
    months: 48, label: '4 ปี',
    items: [
      { domain: 'GM', text: 'กระโดดขาเดียวได้ 2–3 ครั้ง' },
      { domain: 'FM', text: 'วาดรูปกากบาทตามแบบได้' },
      { domain: 'RL', text: 'ทำตามคำสั่ง 3 ขั้นตอน' },
      { domain: 'EL', text: 'เล่าเรื่องที่เกิดขึ้นได้เข้าใจ' },
      { domain: 'PS', text: 'แต่งตัวเองได้เกือบทั้งหมด' },
    ],
  },
  {
    months: 60, label: '5 ปี',
    items: [
      { domain: 'GM', text: 'เดินต่อเท้าเป็นเส้นตรงได้' },
      { domain: 'FM', text: 'วาดรูปสี่เหลี่ยมตามแบบได้' },
      { domain: 'RL', text: 'เข้าใจคำตรงข้าม เช่น "ใหญ่-เล็ก"' },
      { domain: 'EL', text: 'เล่าเรื่องเป็นลำดับก่อนหลังได้' },
      { domain: 'PS', text: 'ทำกิจวัตรประจำวันได้เอง' },
    ],
  },
];

export const resolveDspmBand = (birthDate, atDate) => {
  const m = ageInMonths(birthDate, atDate);
  if (m == null) return DSPM_AGE_BANDS[0];
  let band = DSPM_AGE_BANDS[0];
  for (const b of DSPM_AGE_BANDS) {
    if (m + 0.001 >= b.months) band = b;
  }
  return band;
};

/* ประเมินผลอัตโนมัติ — ไม่ผ่านข้อใดข้อหนึ่ง = สงสัยล่าช้า (เกณฑ์ mock) */
export const evaluateDspm = (band, answers) => {
  const items = band?.items || [];
  const results = items.map((it, idx) => ({ ...it, key: `${band.months}-${idx}`, pass: answers?.[`${band.months}-${idx}`] }));
  const answered = results.filter((r) => r.pass !== undefined);
  const failed = results.filter((r) => r.pass === false);
  const complete = answered.length === results.length && results.length > 0;
  if (!complete) {
    return { complete: false, failed, label: 'ยังประเมินไม่ครบทุกข้อ', style: 'grey', refer: false };
  }
  if (failed.length === 0) {
    return { complete: true, failed, label: 'พัฒนาการสมวัย', style: 'green', refer: false };
  }
  const domains = [...new Set(failed.map((f) => f.domain))];
  return {
    complete: true,
    failed,
    domains,
    label: `สงสัยพัฒนาการล่าช้า (${domains.join(', ')}) — ต้องกระตุ้นและนัดประเมินซ้ำใน 1 เดือน`,
    style: failed.length >= 2 ? 'red' : 'orange',
    refer: true,
  };
};

/* ── การตรวจสุขภาพทั่วไป 14 ระบบ ──────────────────────────────────── */
export const GENERAL_EXAM_ITEMS = [
  { key: 'skin',        label: 'ผิวหนัง' },
  { key: 'headFont',    label: 'ศีรษะ / กระหม่อม' },
  { key: 'eyes',        label: 'ตา' },
  { key: 'ears',        label: 'หู' },
  { key: 'nose',        label: 'จมูก' },
  { key: 'mouth',       label: 'ปาก / ฟัน / คอ' },
  { key: 'lymph',       label: 'ต่อมน้ำเหลือง' },
  { key: 'chestLung',   label: 'ทรวงอก / ปอด' },
  { key: 'heart',       label: 'หัวใจ' },
  { key: 'abdomen',     label: 'ช่องท้อง' },
  { key: 'genital',     label: 'อวัยวะเพศ' },
  { key: 'anus',        label: 'ทวารหนัก' },
  { key: 'limbs',       label: 'แขน-ขา / กระดูกและข้อ' },
  { key: 'neuro',       label: 'ระบบประสาท' },
];

/* ── โภชนาการ / ประวัติฝากครรภ์และคลอด ─────────────────────────────── */
export const FEEDING_OPTIONS = [
  { key: 'breast',     label: 'นมมารดา' },
  { key: 'formula',    label: 'นมผสม' },
  { key: 'mixed',      label: 'นมมารดาร่วมนมผสม' },
  { key: 'complement', label: 'อาหารเสริมตามวัย' },
  { key: 'family',     label: 'อาหารครอบครัว' },
];

export const NUTRITION_STATUS_OPTIONS = [
  { value: 'normal',      label: 'สมส่วน (ตามเกณฑ์)' },
  { value: 'underweight', label: 'น้ำหนักน้อยกว่าเกณฑ์' },
  { value: 'risk',        label: 'เสี่ยงต่อภาวะทุพโภชนาการ' },
  { value: 'overweight',  label: 'น้ำหนักเกินเกณฑ์' },
  { value: 'obese',       label: 'อ้วน' },
  { value: 'stunted',     label: 'เตี้ย (ส่วนสูงน้อยกว่าเกณฑ์)' },
];

export const ANC_LAB_OPTIONS = [
  { value: 'negative', label: 'ผลลบ (Negative)' },
  { value: 'positive', label: 'ผลบวก (Positive)' },
  { value: 'unknown',  label: 'ไม่ทราบผล' },
];

export const ANC_PLACE_SUGGESTIONS = [
  'ศูนย์บริการสาธารณสุข 22 วัดปากบ่อ',
  'โรงพยาบาลกลาง',
  'โรงพยาบาลเจริญกรุงประชารักษ์',
  'โรงพยาบาลสิรินธร',
  'คลินิกเอกชนในพื้นที่',
];

/* ── ผลการซักประวัติพยาบาลที่จุดคัดกรอง (read-only, TOR 1.10.9.3) ──── */
export const IMM_INTAKE_BY_HN = {
  '69-10001': {
    vitals: { temp: 36.8, hr: 130, rr: 40, spo2: 99, weight: 4.6, height: 55.2 },
    nurseNote: 'ผู้ปกครองพามาตามนัดรับวัคซีนอายุ 2 เดือน เด็กสบายดี ไม่มีไข้ ดูดนมได้ดี',
    drugAllergies: ['ไม่มีประวัติแพ้ยา'], chronicDiseases: ['ไม่มีโรคประจำตัว'],
  },
  '69-10002': {
    vitals: { temp: 36.6, hr: 124, rr: 34, spo2: 99, weight: 6.6, height: 62.4 },
    nurseNote: 'มาตามนัดวัคซีนอายุ 6 เดือน ครั้งก่อนมีไข้ต่ำหลังฉีด หายเองใน 1 วัน',
    drugAllergies: ['ไม่มีประวัติแพ้ยา'], chronicDiseases: ['ไม่มีโรคประจำตัว'],
  },
  '69-10003': {
    vitals: { temp: 37.0, hr: 118, rr: 32, spo2: 98, weight: 7.8, height: 67.0 },
    nurseNote: 'มีน้ำมูกใสเล็กน้อย ไม่มีไข้ ให้วัคซีนได้ตามปกติ',
    drugAllergies: ['ไม่มีประวัติแพ้ยา'], chronicDiseases: ['ไม่มีโรคประจำตัว'],
  },
  '69-10004': {
    vitals: { temp: 36.7, hr: 116, rr: 30, spo2: 99, weight: 7.6, height: 69.2 },
    nurseNote: 'มาประเมินพัฒนาการ 12 เดือน ผู้ปกครองกังวลเรื่องเด็กยังไม่พูดคำที่มีความหมาย',
    drugAllergies: ['ไม่มีประวัติแพ้ยา'], chronicDiseases: ['ไม่มีโรคประจำตัว'],
  },
  '69-10005': {
    vitals: { temp: 36.5, hr: 108, rr: 26, spo2: 99, weight: 11.2, height: 82.5 },
    nurseNote: 'มาตามนัดวัคซีนอายุ 1 ปี 6 เดือน เด็กแข็งแรงดี',
    drugAllergies: ['ไม่มีประวัติแพ้ยา'], chronicDiseases: ['ไม่มีโรคประจำตัว'],
  },
  '69-10006': {
    vitals: { temp: 36.9, hr: 104, rr: 24, spo2: 98, weight: 10.1, height: 85.0 },
    nurseNote: 'ตามเด็กค้างเข็มจากรายชื่อขาดนัด ยายเป็นผู้ดูแลหลัก แจ้งว่าลืมวันนัด',
    drugAllergies: ['ไม่มีประวัติแพ้ยา'], chronicDiseases: ['น้ำหนักน้อยกว่าเกณฑ์ ติดตามต่อเนื่อง'],
  },
  '69-10007': {
    vitals: { temp: 36.6, hr: 96, rr: 22, spo2: 99, weight: 15.4, height: 101.0 },
    nurseNote: 'มาตรวจสุขภาพก่อนเข้าเรียนและรับวัคซีนอายุ 4 ปี',
    drugAllergies: ['แพ้ Amoxicillin — ผื่นลมพิษ'], chronicDiseases: ['ไม่มีโรคประจำตัว'],
  },
  '69-10008': {
    vitals: { temp: 36.8, hr: 138, rr: 44, spo2: 99, weight: 2.7, height: 49.0 },
    nurseNote: 'ทารกแรกเกิด 7 วัน มาตรวจครั้งแรก ยังไม่ได้รับวัคซีน BCG/HBV ที่โรงพยาบาล',
    drugAllergies: ['ไม่มีประวัติแพ้ยา'], chronicDiseases: ['ไม่มีโรคประจำตัว'],
  },
};

export const DEFAULT_IMM_INTAKE = {
  vitals: { temp: 36.7, hr: 120, rr: 30, spo2: 99, weight: null, height: null },
  nurseNote: 'ซักประวัติเบื้องต้นที่จุดคัดกรอง แล้วส่งต่อคลินิกสุขภาพเด็กดี',
  drugAllergies: ['ไม่มีประวัติแพ้ยา'],
  chronicDiseases: ['ไม่มีโรคประจำตัว'],
};

export const getImmIntake = (hn) => IMM_INTAKE_BY_HN[hn] || DEFAULT_IMM_INTAKE;

/* ── ค่าเริ่มต้นของใบบันทึกการตรวจ (โครง 5 ขั้น) ───────────────────── */
export const DEFAULT_IMM_VISIT = {
  /* แบบประเมิน */
  visitDate: '', visitTime: '', nurseNote: '',
  /* แบบประเมิน — มารดา/คลอด + โภชนาการ */
  ancGravida: '', ancPlace: '', deliveryType: '', birthWeight: '',
  motherAgeAtBirth: '', gestationalAgeWeeks: '', maternalBloodRh: '',
  hbTyping: '', maternalHctHb: '', apgar1: '', apgar5: '',
  birthLength: '', birthHeadCirc: '',
  vdrl: '', hbsAg: '', hiv: '',
  feeding: {}, feedingNote: '', nutritionStatus: '',
  /* ตรวจร่างกายและวินิจฉัย — การเจริญเติบโต */
  growth: {
    weight: '', height: '', headCirc: '', chestCirc: '',
    fontanelleAnterior: '', fontanellePosterior: '',
  },
  growthNote: '',
  /* แบบประเมิน — พัฒนาการ DSPM */
  dspmAnswers: {}, dspmNote: '', dspmAssessor: '', dspmAssessedAt: '', dspmReferral: false,
  /* สั่งการรักษา — ให้วัคซีนวันนี้ */
  todayDoses: [],
  /* ตรวจร่างกายและวินิจฉัย — ตรวจสุขภาพทั่วไป */
  exam: {}, examAllNormal: false, examNote: '', illnessHistory: '', allergyNote: '',
  /* step 6 — สุขภาพช่องปากเด็กดี (มติ คทง.6 ครั้งที่ 3 · blueprint หน้า 9)
     "ลงข้อมูลแปรงสีฟันซี่แรก (คลินิกเด็กดี)" — เป็นงานส่งเสริมสุขภาพของ
     WBC ไม่ใช่หัตถการทันตกรรม จึงลงที่นี่ได้ ส่วนผลตรวจฟันจริงยังมาจาก
     หน้าทันตกรรมที่เดียวผ่าน CarriedDentalPanel */
  firstToothAge: '', firstToothBrushStarted: '', oralCareAdvice: false, oralCareNote: '',
  /* สั่งการรักษา — EMR / CPOE / Telemedicine */
  labOrders: {}, medOrders: {}, orderNote: '',
  telemedStatus: '', doctor: '',
  /* นัดหมาย + สมุดวัคซีน */
  documents: [],
  appointment: { date: '', time: '', type: '', note: '', cancelled: false },
};

/* ── ร่าง / บันทึกการตรวจ ─────────────────────────────────────────── */
export const getImmDraft = (hn) => readJson(K.drafts, {})[hn] || null;

export const saveImmDraft = (hn, form, stepIndex) => {
  const drafts = readJson(K.drafts, {});
  drafts[hn] = { form, stepIndex, savedAt: new Date().toISOString() };
  writeJson(K.drafts, drafts);
};

export const clearImmDraft = (hn) => {
  const drafts = readJson(K.drafts, {});
  delete drafts[hn];
  writeJson(K.drafts, drafts);
};

export const getImmVisitRecords = (hn) => (readJson(K.visits, {})[hn] || []);

/* บันทึก/แก้ไขใบบันทึกการตรวจ — เรียกซ้ำตอน "แก้ไขบันทึก" ได้โดยไม่สร้าง
   เข็ม/นัด/visit ซ้ำ: record เก็บ visitId + doseId (ใน todayDoses) +
   appointmentId ไว้ รอบถัดไปจึง update ของเดิมแทน insert ใหม่ */
export const saveImmVisitRecord = (hn, form) => {
  const all = readJson(K.visits, {});
  const prior = all[hn] || [];
  /* หา visit เดิม: จาก visitId ที่เคยออกให้ หรือ (record เก่าก่อนมี visitId) จาก savedAt */
  const priorIdx = form.visitId
    ? prior.findIndex((r) => r.visitId === form.visitId)
    : prior.findIndex((r) => r.savedAt && r.savedAt === form.savedAt);
  const visitId = form.visitId || `v-${hn}-${Date.now()}`;

  /* เข็มที่ให้วันนี้ถูกเขียนลงสมุดวัคซีนทันที (IIS §1.11.2.1)
     — เข็มที่เคยบันทึกแล้ว (มี doseId หรือ dedupe ตรงกับเข็มเดิม) → update */
  const existingDoses = getImmDoses(hn);
  const todayDoses = (form.todayDoses || []).map((d) => {
    const doseId = d.doseId
      || existingDoses.find((x) =>
        x.vaccineId === d.vaccineId && x.seq === d.seq && x.date === d.date && x.lotNo === d.lotNo,
      )?.id
      || '';
    const { saved } = saveImmDose({ ...d, id: doseId, hn });
    /* §1.11.2.1 — ตัดสต๊อก Lot จริงตอนบันทึกเข็ม
       idempotent ต่อ doseId: แก้ไข visit แล้วกดบันทึกใหม่จะไม่ตัดซ้ำ */
    commitLotUsage(saved.id, { vaccineId: d.vaccineId, lotNo: d.lotNo, qty: 1 });
    return { ...d, doseId: saved.id };
  });

  /* เข็มที่ถูกลบออกจาก visit นี้ตอนแก้ไข → คืนโดสกลับคลัง
     ถ้าไม่คืน คลังจะหายเปล่าทุกครั้งที่เจ้าหน้าที่ลบเข็มที่คีย์ผิด */
  const keptDoseIds = new Set(todayDoses.map((d) => d.doseId).filter(Boolean));
  ((priorIdx >= 0 ? prior[priorIdx] : null)?.todayDoses || []).forEach((oldDose) => {
    if (oldDose.doseId && !keptDoseIds.has(oldDose.doseId)) commitLotUsage(oldDose.doseId, {});
  });

  /* นัดหมายเข็มถัดไป (1.10.9.5) มองเห็นได้จากหน้าคิว + follow-up
     — ส่ง id เดิมกลับเข้า saveImmAppointment เพื่อ update ใบเดิม */
  let appointmentId = form.appointmentId || '';
  if (form.appointment?.date && !form.appointment.cancelled) {
    const savedAp = saveImmAppointment({
      id: appointmentId,
      hn,
      date: form.appointment.date,
      time: form.appointment.time,
      type: form.appointment.type,
      note: form.appointment.note,
      doctor: form.doctor,
    });
    appointmentId = savedAp.id;
  }

  const record = {
    ...form,
    todayDoses,
    visitId,
    appointmentId,
    savedBy: IMM_CURRENT_USER,
    savedAt: new Date().toISOString(),
  };
  /* แก้ไข visit เดิม → replace แถวเดิม; บันทึกครั้งแรก → append */
  all[hn] = priorIdx >= 0
    ? prior.map((r, i) => (i === priorIdx ? record : r))
    : [...prior, record];
  writeJson(K.visits, all);
  return record;
};

/* ขั้นตอนที่ถือว่า "ทำแล้ว" — ใช้กับ stepper */
export const getImmCompletedSteps = (form, stepIndex) => {
  const done = [];
  if (form.nurseNote || stepIndex > 0) done.push(0);
  if (form.ancPlace || form.nutritionStatus || Object.keys(form.feeding || {}).length > 0) done.push(1);
  if (form.growth?.weight || form.growth?.height) done.push(2);
  if (Object.keys(form.dspmAnswers || {}).length > 0) done.push(3);
  if ((form.todayDoses || []).length > 0) done.push(4);
  if (form.examAllNormal || Object.keys(form.exam || {}).length > 0) done.push(5);
  if (form.doctor || Object.keys(form.labOrders || {}).length > 0 || Object.keys(form.medOrders || {}).length > 0) done.push(6);
  if ((form.documents || []).length > 0 || form.appointment?.date) done.push(7);
  return done;
};

/* ── นัดหมาย (1.10.9.5) ────────────────────────────────────────────── */
export const IMM_APPOINTMENT_TYPES = [
  { value: 'vaccine',     label: 'นัดรับวัคซีนเข็มถัดไป' },
  { value: 'growth',      label: 'นัดชั่งน้ำหนัก/วัดส่วนสูง ติดตามการเจริญเติบโต' },
  { value: 'development', label: 'นัดประเมินพัฒนาการซ้ำ' },
  { value: 'stimulate',   label: 'นัดกระตุ้นพัฒนาการ' },
  { value: 'telemed',     label: 'นัดปรึกษาผ่าน Telemedicine' },
];

export const resolveImmAppointmentType = (v) =>
  IMM_APPOINTMENT_TYPES.find((t) => t.value === v)?.label || 'นัดหมาย';

const APPOINTMENT_SEED = [
  { id: 'ap-seed-1', hn: '69-10006', date: addMonthsIso(todayIso(), 0), time: '10:00', type: 'vaccine', note: 'ตามเด็กค้างเข็ม JE เข็ม 2', doctor: 'พญ.กมลรัตน์ วรกุล', status: 'booked', bookedBy: 'พว.ศิริพร ใจดี', bookedAt: '2026-07-20T09:00:00' },
  { id: 'ap-seed-2', hn: '69-10002', date: '2026-10-16', time: '09:30', type: 'vaccine', note: 'นัดวัคซีนอายุ 9 เดือน (MMR1)', doctor: 'พญ.กมลรัตน์ วรกุล', status: 'booked', bookedBy: 'พว.ศิริพร ใจดี', bookedAt: '2026-06-16T10:00:00' },
  { id: 'ap-seed-3', hn: '69-10004', date: '2026-07-10', time: '09:00', type: 'growth', note: 'นัดชั่งน้ำหนักติดตาม', doctor: 'พญ.กมลรัตน์ วรกุล', status: 'cancelled', bookedBy: 'พว.มาลี พงษ์ทอง', bookedAt: '2026-05-21T11:00:00', cancellation: { reason: 'ผู้ปกครองขอเลื่อน — ติดธุระต่างจังหวัด', by: 'พว.มาลี พงษ์ทอง', at: '2026-07-08T14:20:00' } },
];

export const getAllImmAppointments = () => {
  const overlay = readJson(K.appointments, {});
  const seedIds = APPOINTMENT_SEED.map((a) => a.id);
  const merged = APPOINTMENT_SEED.map((a) => (overlay[a.id] ? { ...a, ...overlay[a.id] } : a));
  const added = Object.values(overlay).filter((a) => !seedIds.includes(a.id));
  return [...merged, ...added];
};

export const getImmAppointments = (hn) =>
  getAllImmAppointments()
    .filter((a) => a.hn === hn)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

export const getImmNextAppointment = (hn) => {
  const today = todayIso();
  return getImmAppointments(hn)
    .filter((a) => a.status === 'booked' && a.date >= today)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0] || null;
};

export const saveImmAppointment = (entry) => {
  const overlay = readJson(K.appointments, {});
  const id = entry.id || `ap-${entry.hn}-${Date.now()}`;
  const saved = {
    ...entry,
    id,
    status: entry.status || 'booked',
    bookedBy: IMM_CURRENT_USER,
    bookedAt: new Date().toISOString(),
  };
  overlay[id] = saved;
  writeJson(K.appointments, overlay);
  return saved;
};

export const cancelImmAppointment = (id, reason) => {
  const overlay = readJson(K.appointments, {});
  const current = getAllImmAppointments().find((a) => a.id === id);
  if (!current) return;
  overlay[id] = {
    ...current,
    status: 'cancelled',
    cancellation: { reason: reason || '', by: IMM_CURRENT_USER, at: new Date().toISOString() },
  };
  writeJson(K.appointments, overlay);
};

/* ── เอกสารแนบ (1.10.9.4) ─────────────────────────────────────────── */
export const IMM_UPLOAD_ACCEPT = '.pdf,.jpg,.jpeg,.png';
const IMM_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const validateImmUpload = (name, size) => {
  const ext = `.${String(name).split('.').pop().toLowerCase()}`;
  if (!IMM_UPLOAD_ACCEPT.split(',').includes(ext)) {
    return `ชนิดไฟล์ ${ext} ไม่รองรับ — อนุญาตเฉพาะ ${IMM_UPLOAD_ACCEPT}`;
  }
  if (size > IMM_UPLOAD_MAX_BYTES) {
    return `ไฟล์ขนาด ${(size / 1024 / 1024).toFixed(1)} MB เกิน 10 MB`;
  }
  return '';
};

/* ── Print log ─────────────────────────────────────────────────────── */
export const logImmPrint = (hn, docType) => {
  const log = readJson(K.printLog, {});
  log[hn] = [...(log[hn] || []), { docType, by: IMM_CURRENT_USER, at: new Date().toISOString() }];
  writeJson(K.printLog, log);
};

export const getImmPrintLog = (hn) => readJson(K.printLog, {})[hn] || [];

/* ── Suggestions (SuggestibleTextarea ทุกช่อง free text) ────────────── */
export const NURSE_NOTE_SUGGESTIONS = [
  'ผู้ปกครองพามารับวัคซีนตามนัด เด็กสบายดี ไม่มีไข้',
  'เด็กมีน้ำมูกใสเล็กน้อย ไม่มีไข้ ให้วัคซีนได้ตามปกติ',
  'ผู้ปกครองแจ้งว่าเด็กมีไข้เมื่อวาน วัดอุณหภูมิวันนี้ปกติ',
  'ครั้งก่อนมีไข้ต่ำหลังฉีดวัคซีน หายเองภายใน 1 วัน',
];

export const FEEDING_NOTE_SUGGESTIONS = [
  'กินนมมารดาอย่างเดียว วันละ 8–10 มื้อ',
  'กินนมผสมสูตร 1 วันละ 6 มื้อ มื้อละ 4 ออนซ์',
  'เริ่มอาหารเสริมข้าวบดผสมไข่แดง วันละ 1 มื้อ',
  'กินอาหารครอบครัว 3 มื้อ ร่วมกับนมวันละ 2 มื้อ',
  'ผู้ปกครองแจ้งว่าเด็กกินยาก แนะนำปรับเนื้อสัมผัสอาหาร',
];

export const GROWTH_NOTE_SUGGESTIONS = [
  'น้ำหนักและส่วนสูงอยู่ในเกณฑ์ปกติตามช่วงอายุ',
  'น้ำหนักเพิ่มขึ้นน้อยกว่าเกณฑ์ แนะนำเพิ่มมื้ออาหารและนัดชั่งซ้ำ 1 เดือน',
  'เส้นรอบศีรษะอยู่ในเกณฑ์ปกติ กระหม่อมหน้าปิดตามวัย',
  'ให้คำแนะนำโภชนาการแก่ผู้ปกครองและนัดติดตาม',
];

export const DSPM_NOTE_SUGGESTIONS = [
  'พัฒนาการสมวัยทุกด้าน แนะนำผู้ปกครองเล่นกระตุ้นพัฒนาการต่อเนื่อง',
  'สงสัยพัฒนาการล่าช้าด้านการใช้ภาษา แนะนำฝึกพูดคุยกับเด็กบ่อยขึ้น',
  'สอนผู้ปกครองกระตุ้นพัฒนาการตามคู่มือ DSPM และนัดประเมินซ้ำ 1 เดือน',
  'ส่งต่อคลินิกกระตุ้นพัฒนาการ โรงพยาบาลแม่ข่าย',
];

export const REACTION_SUGGESTIONS = [
  'ไม่พบอาการผิดปกติหลังสังเกตอาการ 30 นาที',
  'บวมแดงบริเวณที่ฉีดเล็กน้อย',
  'ร้องกวนหลังฉีด สงบลงเมื่อผู้ปกครองอุ้ม',
  'ไข้ต่ำ ๆ หลังฉีด ให้คำแนะนำการเช็ดตัวและยาลดไข้',
];

export const EXAM_NOTE_SUGGESTIONS = [
  'ตรวจร่างกายทั่วไปอยู่ในเกณฑ์ปกติทุกระบบ',
  'พบผื่นแดงบริเวณแก้มทั้งสองข้าง สงสัยผื่นภูมิแพ้ผิวหนัง',
  'พบฟันผุบริเวณฟันหน้าบน แนะนำพบทันตแพทย์',
  'ได้ยินเสียงหายใจครืดคราด ไม่มีอาการหอบ',
];

export const ILLNESS_HISTORY_SUGGESTIONS = [
  'ไม่มีประวัติเจ็บป่วยรุนแรง ไม่เคยนอนโรงพยาบาล',
  'เคยนอนโรงพยาบาลด้วยไข้สูงชัก 1 ครั้ง เมื่ออายุ 10 เดือน',
  'มีประวัติหอบหืดในครอบครัว (บิดา)',
  'ไม่มีประวัติแพ้ยาและแพ้วัคซีน',
];

export const ALLERGY_NOTE_SUGGESTIONS = [
  'ไม่มีประวัติแพ้ยา แพ้อาหาร หรือแพ้วัคซีน',
  'แพ้ไข่ขาว — เฝ้าระวังเป็นพิเศษเมื่อให้วัคซีนที่เพาะในไข่',
  'เคยมีผื่นลมพิษหลังได้รับ Amoxicillin',
];

export const AEFI_SYMPTOM_SUGGESTIONS = [
  'บวมแดงร้อนบริเวณที่ฉีด ขนาดมากกว่า 3 ซม.',
  'ไข้สูงมากกว่า 38.5 °C ภายใน 48 ชั่วโมงหลังได้รับวัคซีน',
  'ร้องกวนไม่หยุดนานกว่า 3 ชั่วโมง',
  'ผื่นลมพิษทั่วตัว',
  'ชักจากไข้สูงหลังได้รับวัคซีน',
];

export const AEFI_TREATMENT_SUGGESTIONS = [
  'ประคบเย็นบริเวณที่ฉีด ให้ยาลดไข้ตามน้ำหนัก และแนะนำผู้ปกครองสังเกตอาการ',
  'ให้ยาแก้แพ้ชนิดรับประทาน และนัดติดตามอาการใน 3 วัน',
  'ส่งต่อโรงพยาบาลแม่ข่ายเพื่อประเมินและรักษาต่อ',
  'รายงานเหตุการณ์ไม่พึงประสงค์ตามระบบเฝ้าระวัง AEFI',
];

export const ORDER_NOTE_SUGGESTIONS = [
  'สั่งตรวจ CBC เพื่อประเมินภาวะซีดตามเกณฑ์อายุ 6–12 เดือน',
  'จ่ายยาน้ำเสริมธาตุเหล็กตามแนวทางกรมอนามัย',
  'จ่ายพาราเซตามอลชนิดน้ำสำหรับลดไข้หลังฉีดวัคซีน',
  'ให้คำแนะนำผู้ปกครองเรื่องการดูแลหลังได้รับวัคซีน',
];

export const IMM_LAB_ORDERS = [
  { key: 'cbc',  label: 'CBC — ตรวจความสมบูรณ์ของเม็ดเลือด (คัดกรองภาวะซีด)' },
  { key: 'tsh',  label: 'TSH — คัดกรองภาวะพร่องไทรอยด์แต่กำเนิด' },
  { key: 'hbsag', label: 'HBsAg / Anti-HBs — ติดตามหลังวัคซีนตับอักเสบบี' },
  { key: 'stool', label: 'Stool exam — ตรวจอุจจาระคัดกรองพยาธิ' },
];

export const IMM_MED_ORDERS = [
  { key: 'paracetamol', label: 'Paracetamol syrup 120 mg/5 ml — ลดไข้หลังวัคซีน' },
  { key: 'ironDrop',    label: 'Ferrous drop — เสริมธาตุเหล็กตามวัย' },
  { key: 'vitaminD',    label: 'Vitamin D drop — เสริมวิตามินดี' },
  { key: 'ors',         label: 'ORS — ผงเกลือแร่สำรองที่บ้าน' },
];
