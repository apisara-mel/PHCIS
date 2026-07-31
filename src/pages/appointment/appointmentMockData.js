/* Appointment mock roster — keyed to MR / patientProfiles HNs + doctor roster.
   Single source for INITIAL_APPOINTMENTS; avatars from `public/avatars/`. */

import { DOCTOR_SEEDS } from './appointmentDoctorRoster';

/** Demo patient 67-00001 — MR `mrPatients.js` / AppointmentFormPopup default. */
export const SOMCHAI_AVATAR = '/avatars/somchai-mock.png';

/** Patient catalog — HN, display name, rights, portrait (aligned with patientProfiles + MR). */
export const APPOINTMENT_PATIENTS = {
  '67-00001': {
    hn: '67-00001',
    patient: 'นายสมชาย มั่นใจดี',
    rights: 'ประกันสังคม',
    avatar: SOMCHAI_AVATAR,
  },
  '67-00002': {
    hn: '67-00002',
    patient: 'นางสาวดวงใจ พินิจ',
    rights: 'บัตรทอง',
    avatar: '/avatars/patient-female-a.png',
  },
  '67-00003': {
    hn: '67-00003',
    patient: 'นางปริญญา รัตนา',
    rights: 'ข้าราชการ',
    avatar: '/avatars/patient-female-e.png',
  },
  '67-00004': {
    hn: '67-00004',
    patient: 'นายภูริ ใจกล้า',
    rights: 'ชำระเอง',
    avatar: '/avatars/mock-male-asian-b.png',
  },
  '67-00005': {
    hn: '67-00005',
    patient: 'นางสุดา ปลอดโปร่ง',
    rights: 'บัตรทอง',
    avatar: '/avatars/patient-female-c.png',
  },
  '67-00006': {
    hn: '67-00006',
    patient: 'นายศุภชัย แก้วใส',
    rights: 'ประกันสังคม',
    avatar: '/avatars/mock-male-asian-c.png',
  },
  '67-00007': {
    hn: '67-00007',
    patient: 'นางมาลี อ่อนน้อม',
    rights: 'ประกันสังคม',
    avatar: '/avatars/patient-mock-03.png',
  },
  '67-00008': {
    hn: '67-00008',
    patient: 'นางสาวธนพร สุนทรา',
    rights: 'บัตรทอง',
    avatar: '/avatars/patient-mock-09.png',
  },
  '67-00009': {
    hn: '67-00009',
    patient: 'นายกิตติ ศรีสมบูรณ์',
    rights: 'ข้าราชการ',
    avatar: '/avatars/patient-mock-06.png',
  },
  '67-00010': {
    hn: '67-00010',
    patient: 'นายนพดล ช่วยเหลือ',
    rights: 'ชำระเอง',
    avatar: '/avatars/patient-mock-08.png',
  },
  '67-00011': {
    hn: '67-00011',
    patient: 'นางอรอุมา ดวงสว่าง',
    rights: 'ประกันสังคม',
    avatar: '/avatars/patient-mock-05.png',
  },
  '67-00012': {
    hn: '67-00012',
    patient: 'นายวิชัย รุ่งเรือง',
    rights: 'บัตรทอง',
    avatar: '/avatars/patient-male-e.png',
  },
  '67-00013': {
    hn: '67-00013',
    patient: 'นางสาวพิมพ์ใจ จันทรา',
    rights: 'ประกันสังคม',
    avatar: '/avatars/patient-mock-02.png',
  },
  '67-00014': {
    hn: '67-00014',
    patient: 'นายชัยวัฒน์ ก้องเกียรติ',
    rights: 'ประกันสังคม',
    avatar: '/avatars/patient-mock-04.png',
  },
  '67-00015': {
    hn: '67-00015',
    patient: 'นางรัตนาภรณ์ ใสสะอาด',
    rights: 'ข้าราชการ',
    avatar: '/avatars/patient-female-d.png',
  },
  '67-00016': {
    hn: '67-00016',
    patient: 'นายปกรณ์ บุญพิทักษ์',
    rights: 'ประกันสังคม',
    avatar: '/avatars/patient-mock-01.png',
  },
  '67-00017': {
    hn: '67-00017',
    patient: 'นางภัคจิรา วงศ์อนันต์',
    rights: 'ประกันสังคม',
    avatar: '/avatars/patient-female-b.png',
  },
  '67-00018': {
    hn: '67-00018',
    patient: 'นายธีรเดช อัครพงศ์',
    rights: 'ชำระเอง',
    avatar: '/avatars/patient-male-d.png',
  },
  '67-00019': {
    hn: '67-00019',
    patient: 'นางสาวนันทิดา พรเลิศ',
    rights: 'บัตรทอง',
    avatar: '/avatars/patient-female-f.png',
  },
  '67-00020': {
    hn: '67-00020',
    patient: 'นายกฤษดา ผ่องใส',
    rights: 'ประกันสังคม',
    avatar: '/avatars/mock-male-asian-c.png',
  },
  '67-00021': {
    hn: '67-00021',
    patient: 'นางวรรณภา ทองดี',
    rights: 'ข้าราชการ',
    avatar: '/avatars/patient-female-e.png',
  },
  '67-00022': {
    hn: '67-00022',
    patient: 'นายอนุชา สมบูรณ์ทรัพย์',
    rights: 'ประกันสังคม',
    avatar: '/avatars/mock-male-asian-a.png',
  },
  '67-00023': {
    hn: '67-00023',
    patient: 'นางสาวภัทรานิษฐ์ บูรณะ',
    rights: 'ประกันสังคม',
    avatar: '/avatars/patient-mock-07.png',
  },
  '67-00024': {
    hn: '67-00024',
    patient: 'นายเอกชัย พิทยาคม',
    rights: 'บัตรทอง',
    avatar: '/avatars/mock-male-asian-b.png',
  },
  '67-00025': {
    hn: '67-00025',
    patient: 'นายภาสกร ชาญฉลาด',
    rights: 'ประกันสังคม',
    avatar: '/avatars/patient-mock-10.png',
  },
};

const CLINIC_BY_DEPT = {
  'อายุรกรรม': 'คลินิกตรวจโรคทั่วไป',
  'ทันตกรรม': 'คลินิกทันตกรรมทั่วไป',
  'กุมารเวช': 'คลินิกกุมารเวช',
  'สูติ-นรีเวช': 'คลินิกสูติ-นรีเวช',
  'ศัลยกรรม': 'คลินิกศัลยกรรม',
  'จักษุวิทยา': 'คลินิกจักษุ',
  'เวชศาสตร์ครอบครัว': 'คลินิกเวชศาสตร์ครอบครัว',
  'ประสาทวิทยา': 'คลินิกประสาทวิทยา',
  'ศัลยกรรมกระดูก': 'คลินิกศัลยกรรมกระดูก',
  'โรคผิวหนัง': 'คลินิกผิวหนัง',
  'อุบัติเหตุและฉุกเฉิน': 'คลินิกฉุกเฉิน',
  'สุขภาพจิต': 'คลินิกสุขภาพจิต',
  'รังสีวิทยา': 'คลินิกรังสีวิทยา',
  'โสต ศอ นาสิก': 'คลินิกโสต ศอ นาสิก',
  'เวชศาสตร์ฟื้นฟู': 'คลินิกฟื้นฟูสมรรถภาพ',
};

/** Figma list column — short department label. */
const DEPT_LIST_LABEL = {
  'อายุรกรรม': 'ตรวจรักษา',
  'ทันตกรรม': 'ทันตกรรม',
  'กุมารเวช': 'กุมารเวช',
  'สูติ-นรีเวช': 'สูติ-นรีเวช',
  'ศัลยกรรม': 'ศัลยกรรม',
  'จักษุวิทยา': 'จักษุวิทยา',
  'เวชศาสตร์ครอบครัว': 'เวชศาสตร์ครอบครัว',
  'ประสาทวิทยา': 'ประสาทวิทยา',
  'ศัลยกรรมกระดูก': 'ศัลยกรรมกระดูก',
  'โรคผิวหนัง': 'โรคผิวหนัง',
  'อุบัติเหตุและฉุกเฉิน': 'ฉุกเฉิน',
  'สุขภาพจิต': 'สุขภาพจิต',
  'รังสีวิทยา': 'รังสีวิทยา',
  'โสต ศอ นาสิก': 'โสต ศอ นาสิก',
  'เวชศาสตร์ฟื้นฟู': 'ฟื้นฟูสมรรถภาพ',
};

function doctorMeta(staffId) {
  const seed = DOCTOR_SEEDS[staffId - 1];
  if (!seed) return { doctor: '', clinic: 'คลินิกตรวจโรคทั่วไป', dept: 'ตรวจรักษา' };
  const deptKey = seed.dept;
  return {
    doctor: seed.name,
    clinic: CLINIC_BY_DEPT[deptKey] ?? 'คลินิกตรวจโรคทั่วไป',
    dept: DEPT_LIST_LABEL[deptKey] ?? deptKey,
  };
}

function deriveAppointmentStatus(id, date, time, extras = {}) {
  if (extras.status) return extras.status;
  const today = mockTodayKey();
  if (date > today) {
    const num = parseInt(String(id).replace(/\D/g, ''), 10) || 0;
    /* ~1/3 of upcoming appointments await confirmation. */
    return num % 3 === 0 ? 'pending' : 'confirmed';
  }

  const slotPast = date < today || (() => {
    const [h, m] = time.split(':').map(Number);
    const now = new Date();
    const slot = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
    return slot.getTime() < Date.now();
  })();

  if (slotPast) {
    const num = parseInt(String(id).replace(/\D/g, ''), 10) || 0;
    return num % 6 === 0 ? 'no_show' : 'completed';
  }

  const num = parseInt(String(id).replace(/\D/g, ''), 10) || 0;
  return num % 3 === 0 ? 'pending' : 'confirmed';
}

/** TOR 1.6.1.2 — unit that placed the appointment order. */
const ORDERING_UNITS = [
  'ศูนย์ 4 ดินแดง',
  'ศูนย์ 8 บางนา',
  'OPD อายุรกรรม',
  'ห้องฉุกเฉิน',
  'คลินิกเวชศาสตร์ครอบครัว',
  'ทันตกรรม',
  'กุมารเวช',
  'ศูนย์บริการสาธารณสุข 7',
];

function appt(id, hn, staffId, date, time, extras = {}) {
  const p = APPOINTMENT_PATIENTS[hn];
  const doc = doctorMeta(staffId);
  const num = parseInt(String(id).replace(/\D/g, ''), 10) || 0;
  const orderingUnit = extras.orderingUnit
    || extras.site
    || ORDERING_UNITS[num % ORDERING_UNITS.length];
  return {
    id,
    staffId,
    date,
    time,
    status: deriveAppointmentStatus(id, date, time, extras),
    patient: p.patient,
    patientAvatar: p.avatar,
    hn: p.hn,
    rights: p.rights,
    clinic: doc.clinic,
    dept: doc.dept,
    type: extras.type ?? 'พบแพทย์',
    doctor: doc.doctor,
    examMode: extras.examMode ?? 'onsite',
    orderingUnit,
    ...(extras.site ? { site: extras.site } : {}),
    ...(extras.reason ? { reason: extras.reason } : {}),
    ...(extras.prep ? { prep: extras.prep } : {}),
    ...(extras.preOrder ? { preOrder: extras.preOrder } : {}),
  };
}

const SOMCHAI_FOLLOWUP = {
  reason: 'มาติดตามผลการรักษาและตรวจซ้ำตามนัด',
  prep: 'งดอาหารและเครื่องดื่มยกเว้นน้ำเปล่าเล็กน้อยอย่างน้อย 8 ชั่วโมงก่อนเจาะเลือด',
  preOrder: 'none',
};

/** Local calendar date — must match FilterDateTag / resolveDateBounds. */
function mockTodayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mockYesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return mockTodayKey(d);
}

function mockOffsetKey(daysFromToday) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return mockTodayKey(d);
}

/** Today — full-day schedule (เช้า / บ่าย / ดึก) across 25 doctors. */
const TODAY = mockTodayKey();
const YESTERDAY = mockYesterdayKey();
const TOMORROW = mockOffsetKey(1);
const IN_2_DAYS = mockOffsetKey(2);
const IN_3_DAYS = mockOffsetKey(3);
const IN_5_DAYS = mockOffsetKey(5);
const IN_7_DAYS = mockOffsetKey(7);

const TODAY_MORNING_TIMES = [
  '07:00', '07:15', '07:30', '07:45', '08:00', '08:15', '08:30', '08:45',
  '09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:30',
];
const TODAY_AFTERNOON_TIMES = [
  '12:00', '12:15', '12:30', '12:45', '13:00', '13:15', '13:30', '13:45',
  '14:00', '14:15', '14:30', '14:45', '15:00', '15:30', '16:00', '16:15', '16:30', '17:00', '17:30',
];
const TODAY_EVENING_TIMES = [
  '18:00', '18:15', '18:30', '18:45', '19:00', '19:15', '19:30', '19:45', '20:00', '20:15', '20:30',
];

const TODAY_HNS = Object.keys(APPOINTMENT_PATIENTS);

const TODAY_MORNING_REASONS = [
  'มาติดตามผลการรักษาและตรวจซ้ำตามนัด',
  'มาตรวจสุขภาพประจำปี',
  'เจาะเลือดและตรวจแลป',
  'ตรวจความดันโลหิตและน้ำตาล',
  'ขูดหินปูนและตรวจฟัน',
  'ตรวจวัดความดันลูกตา',
  'ฉีดวัคซีนตามอายุ',
  'ตรวจพัฒนาการเด็ก',
  'ปรึกษาก่อนการผ่าตัด',
  'ตรวจสุขภาพสตรีประจำปี',
  'ตรวจคลื่นไฟฟ้าหัวใจ',
  'ติดตามผลแลปล่าสุด',
  'ตรวจผื่นภูมิแพ้',
  'ตรวจหูติดเชื้อเรื้อรัง',
  'ตรวจไตวายเรื้อรัง',
  'อุดฟันและรีเทนเนอร์',
  'ตรวจกระดูกสันหลัง',
  'ปรึกษาโรคเรื้อรัง',
];

const TODAY_AFTERNOON_REASONS = [
  'ถอนฟันกรามและอุดฟัน',
  'ติดตามฝากครรภ์',
  'ฟื้นฟูหลังผ่าตัด',
  'ตรวจน้ำตาลและไขมัน',
  'รับบาดเจ็บเล็กน้อย',
  'ติดตามอาการชัก',
  'ตรวจ X-ray ตามนัด',
  'ปรึกษาอาการวิตกกังวล',
  'ติดตามการใช้ยาจิตเวช',
  'ตรวจความดันโลหิต',
  'ติดตามอาการไข้เรื้อรัง',
  'อุดฟันและตรวจสุขภาพช่องปาก',
  'ตรวจสายตาและวัดความดันลูกตา',
  'ปรึกษาปรับยาความดัน',
  'ตรวจสุขภาพจิตตามนัด',
  'ติดตามผล ECG และปรับยา',
  'ตรวจสุขภาพประจำ',
  'เจาะเลือดตามนัด',
  'ติดตามผลการรักษา',
];

const TODAY_EVENING_REASONS = [
  'ติดตามอาการหลังรับประทานยา',
  'ปรึกษาผลตรวจทางไกล',
  'ตรวจอาการเร่งด่วนนอกเวลา',
  'ติดตามความดันหลังเย็น',
  'ปรึกษาแพทย์ผ่าน Telemedicine',
  'รับยาตามนัดหมายเย็น',
  'ตรวจอาการปวดเรื้อรัง',
  'ติดตามผลการรักษาก่อนนอน',
  'ปรึกษาอาการแพ้ยา',
  'ตรวจอาการหายใจลำบาก',
  'ติดตามน้ำตาลหลังอาหารเย็น',
];

function buildTodaySlot(idNum, hn, staffId, time, period, index) {
  const reasons = period === 'morning'
    ? TODAY_MORNING_REASONS
    : period === 'afternoon'
      ? TODAY_AFTERNOON_REASONS
      : TODAY_EVENING_REASONS;
  const extras = { reason: reasons[index % reasons.length] };
  if (period === 'evening' && index % 3 === 0) {
    extras.examMode = 'tele';
  }
  if (hn === '67-00001' && time === '08:00') {
    Object.assign(extras, SOMCHAI_FOLLOWUP);
  }
  return appt(`A-${String(idNum).padStart(3, '0')}`, hn, staffId, TODAY, time, extras);
}

function buildTodayPeriod(times, period, startId, startStaffOffset) {
  return times.map((time, i) => {
    const staffId = (i + startStaffOffset) % 25 + 1;
    let hn = TODAY_HNS[(i + startStaffOffset) % TODAY_HNS.length];
    if (period === 'morning' && time === '08:00') hn = '67-00001';
    return buildTodaySlot(startId + i, hn, staffId, time, period, i);
  });
}

const TODAY_APPOINTMENTS = [
  ...buildTodayPeriod(TODAY_MORNING_TIMES, 'morning', 16, 0),
  ...buildTodayPeriod(TODAY_AFTERNOON_TIMES, 'afternoon', 16 + TODAY_MORNING_TIMES.length, 2),
  ...buildTodayPeriod(TODAY_EVENING_TIMES, 'evening', 16 + TODAY_MORNING_TIMES.length + TODAY_AFTERNOON_TIMES.length, 4),
];

function buildYesterdaySlot(index, hn, staffId, time, period, periodIndex) {
  const reasons = period === 'morning'
    ? TODAY_MORNING_REASONS
    : period === 'afternoon'
      ? TODAY_AFTERNOON_REASONS
      : TODAY_EVENING_REASONS;
  const extras = {
    reason: reasons[periodIndex % reasons.length],
    status: index % 6 === 0 ? 'no_show' : 'completed',
  };
  if (period === 'evening' && periodIndex % 3 === 0) {
    extras.examMode = 'tele';
  }
  if (periodIndex % 4 === 0) {
    extras.prep = 'นำบัตรประชาชนและผลแลปล่าสุด';
  }
  if (hn === '67-00001' && time === '08:00') {
    Object.assign(extras, SOMCHAI_FOLLOWUP);
  }
  return appt(
    `A-YD-${String(index + 1).padStart(2, '0')}`,
    hn,
    staffId,
    YESTERDAY,
    time,
    extras,
  );
}

function buildYesterdayPeriod(times, period, startIndex, startStaffOffset) {
  return times.map((time, i) => {
    const index = startIndex + i;
    const staffId = (i + startStaffOffset) % 25 + 1;
    let hn = TODAY_HNS[(i + startStaffOffset) % TODAY_HNS.length];
    if (period === 'morning' && time === '08:00') hn = '67-00001';
    return buildYesterdaySlot(index, hn, staffId, time, period, i);
  });
}

/** Yesterday — full-day schedule; aligns with FilterDateTag quick `yesterday`. */
const YESTERDAY_APPOINTMENTS = [
  ...buildYesterdayPeriod(TODAY_MORNING_TIMES, 'morning', 0, 1),
  ...buildYesterdayPeriod(TODAY_AFTERNOON_TIMES, 'afternoon', TODAY_MORNING_TIMES.length, 3),
  ...buildYesterdayPeriod(
    TODAY_EVENING_TIMES,
    'evening',
    TODAY_MORNING_TIMES.length + TODAY_AFTERNOON_TIMES.length,
    5,
  ),
];

const LAST_MONTH_TIMES = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
];

const LAST_MONTH_REASONS = [
  'มาติดตามผลการรักษาและตรวจซ้ำตามนัด',
  'มาตรวจสุขภาพประจำปี',
  'เจาะเลือดและตรวจแลป',
  'ตรวจความดันโลหิตและน้ำตาล',
  'ขูดหินปูนและตรวจฟัน',
  'ติดตามฝากครรภ์',
  'ตรวจคลื่นไฟฟ้าหัวใจ',
  'ติดตามผลแลปล่าสุด',
  'ปรึกษาโรคเรื้อรัง',
  'ตรวจสุขภาพประจำ',
];

/** Previous calendar month — aligns with FilterDateTag quick `lastmonth`. */
function buildLastMonthAppointments() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  const appts = [];
  let index = 0;

  for (let day = 1; day <= daysInMonth && appts.length < 22; day += 1) {
    const cursor = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
    if (cursor.getDay() === 0) continue;

    const dateKey = mockTodayKey(cursor);
    const time = LAST_MONTH_TIMES[index % LAST_MONTH_TIMES.length];
    const hn = TODAY_HNS[index % TODAY_HNS.length];
    const staffId = (index % 25) + 1;
    const extras = {
      reason: LAST_MONTH_REASONS[index % LAST_MONTH_REASONS.length],
      prep: index % 3 === 0 ? 'นำบัตรประชาชนและผลแลปล่าสุด' : undefined,
      status: index % 6 === 0 ? 'no_show' : 'completed',
    };
    appts.push(appt(
      `A-LM-${String(index + 1).padStart(2, '0')}`,
      hn,
      staffId,
      dateKey,
      time,
      extras,
    ));
    index += 1;
  }
  return appts;
}

const LAST_MONTH_APPOINTMENTS = buildLastMonthAppointments();

/** Dedicated pending queue — relative to today so the tab always has rows. */
const PENDING_APPOINTMENTS = [
  appt('A-P01', '67-00002', 1, TODAY, '14:00', {
    status: 'pending',
    reason: 'ขอนัดตรวจสุขภาพประจำปี (รอเจ้าหน้าที่ยืนยัน)',
    prep: 'นำบัตรประชาชนและผลแลปล่าสุด',
  }),
  appt('A-P02', '67-00003', 3, TODAY, '15:30', {
    status: 'pending',
    reason: 'ขอนัดเจาะเลือดและตรวจแลป',
    prep: 'งดอาหารอย่างน้อย 8 ชั่วโมง',
  }),
  appt('A-P03', '67-00004', 1, TODAY, '16:15', {
    status: 'pending',
    examMode: 'tele',
    reason: 'ขอนัด Telemedicine ติดตามความดัน',
    prep: 'เตรียมเครื่องวัดความดันที่บ้าน',
  }),
  appt('A-P04', '67-00005', 2, TODAY, '18:00', {
    status: 'pending',
    reason: 'ขอนัดขูดหินปูน',
    prep: 'แปรงฟันก่อนมาพบแพทย์',
  }),
  appt('A-P05', '67-00006', 4, TOMORROW, '09:00', {
    status: 'pending',
    reason: 'ขอนัดฝากครรภ์ครั้งแรก',
    prep: 'นำสมุดฝากครรภ์และบัตรประชาชน',
  }),
  appt('A-P06', '67-00007', 5, TOMORROW, '10:30', {
    status: 'pending',
    reason: 'ขอนัดปรึกษาก่อนผ่าตัดเล็ก',
    prep: 'งดอาหารหลังเที่ยงคืน',
  }),
  appt('A-P07', '67-00008', 6, TOMORROW, '13:15', {
    status: 'pending',
    reason: 'ขอนัดตรวจสายตา',
    prep: 'หยุดใส่คอนแทคเลนส์ 24 ชม.',
  }),
  appt('A-P08', '67-00009', 8, IN_2_DAYS, '08:30', {
    status: 'pending',
    examMode: 'tele',
    reason: 'ขอนัดติดตามผล ECG ทางไกล',
    prep: 'เตรียมรายการยาที่ใช้อยู่',
  }),
  appt('A-P09', '67-00010', 1, IN_2_DAYS, '11:00', {
    status: 'pending',
    reason: 'ขอนัดตรวจน้ำตาลและไขมัน',
    prep: 'งดอาหาร 8 ชม. ก่อนเจาะเลือด',
  }),
  appt('A-P10', '67-00011', 9, IN_3_DAYS, '14:45', {
    status: 'pending',
    reason: 'ขอนัดอุดฟัน',
    prep: 'แปรงฟันก่อนมาพบแพทย์',
  }),
  appt('A-P11', '67-00012', 17, IN_3_DAYS, '16:00', {
    status: 'pending',
    reason: 'ขอนัดตรวจสุขภาพจิต',
    prep: 'นำรายการยาที่ใช้อยู่',
  }),
  appt('A-P12', '67-00013', 2, IN_5_DAYS, '09:15', {
    status: 'pending',
    reason: 'ขอนัดตรวจฟันเด็ก',
    prep: 'แปรงฟันก่อนมาพบแพทย์',
  }),
  appt('A-P13', '67-00014', 1, IN_5_DAYS, '10:00', {
    status: 'pending',
    reason: 'ขอนัดติดตามความดันโลหิต',
    prep: 'บันทึกค่าความดัน 7 วันย้อนหลัง',
  }),
  appt('A-P14', '67-00015', 3, IN_7_DAYS, '08:00', {
    status: 'pending',
    reason: 'ขอนัดฉีดวัคซีนตามอายุ',
    prep: 'นำสมุดวัคซีน',
  }),
  appt('A-P15', '67-00001', 1, IN_7_DAYS, '08:15', {
    status: 'pending',
    ...SOMCHAI_FOLLOWUP,
    reason: 'ขอนัดติดตามผลการรักษา (รอการยืนยัน)',
    site: 'ศูนย์ 8 บางนา',
  }),
];

/** Cancelled appointments — relative to today so the tab always has rows. */
const CANCELLED_APPOINTMENTS = [
  appt('A-C01', '67-00003', 1, YESTERDAY, '09:00', {
    status: 'cancelled',
    cancelReason: 'ผู้ป่วยขอยกเลิก',
    reason: 'ติดตามความดันโลหิต (ยกเลิก)',
    prep: 'บันทึกค่าความดัน 7 วันย้อนหลัง',
  }),
  appt('A-C02', '67-00004', 3, YESTERDAY, '14:30', {
    status: 'cancelled',
    cancelReason: 'แพทย์ไม่ว่าง / ปรับตาราง',
    reason: 'เจาะเลือดและตรวจแลป (ยกเลิก)',
    prep: 'งดอาหารอย่างน้อย 8 ชั่วโมง',
  }),
  appt('A-C03', '67-00005', 2, TODAY, '10:00', {
    status: 'cancelled',
    cancelReason: 'ผิดพลาดในการจอง',
    reason: 'ขูดหินปูน (ยกเลิก)',
    prep: 'แปรงฟันก่อนมาพบแพทย์',
  }),
  appt('A-C04', '67-00006', 4, TODAY, '11:30', {
    status: 'cancelled',
    cancelReason: 'ผู้ป่วยขอยกเลิก',
    examMode: 'tele',
    reason: 'Telemedicine ฝากครรภ์ (ยกเลิก)',
    prep: 'เตรียมเครื่องวัดความดันที่บ้าน',
  }),
  appt('A-C05', '67-00007', 5, TOMORROW, '09:30', {
    status: 'cancelled',
    cancelReason: 'แพทย์ไม่ว่าง / ปรับตาราง',
    reason: 'ปรึกษาก่อนผ่าตัดเล็ก (ยกเลิก)',
    prep: 'งดอาหารหลังเที่ยงคืน',
  }),
  appt('A-C06', '67-00008', 6, TOMORROW, '15:00', {
    status: 'cancelled',
    cancelReason: 'ผู้ป่วยขอยกเลิก',
    reason: 'ตรวจสายตา (ยกเลิก)',
    prep: 'หยุดใส่คอนแทคเลนส์ 24 ชม.',
  }),
  appt('A-C07', '67-00009', 8, IN_2_DAYS, '08:00', {
    status: 'cancelled',
    cancelReason: 'อื่น ๆ',
    examMode: 'tele',
    reason: 'ติดตามผล ECG (ยกเลิก)',
    prep: 'เตรียมรายการยาที่ใช้อยู่',
  }),
  appt('A-C08', '67-00010', 1, IN_3_DAYS, '13:00', {
    status: 'cancelled',
    cancelReason: 'ผิดพลาดในการจอง',
    reason: 'ตรวจน้ำตาลและไขมัน (ยกเลิก)',
    prep: 'งดอาหาร 8 ชม. ก่อนเจาะเลือด',
  }),
  appt('A-C09', '67-00001', 1, IN_5_DAYS, '08:15', {
    status: 'cancelled',
    cancelReason: 'ผู้ป่วยขอยกเลิก',
    ...SOMCHAI_FOLLOWUP,
    reason: 'ติดตามผลการรักษา (ยกเลิก)',
    site: 'ศูนย์ 8 บางนา',
  }),
  appt('A-C10', '67-00012', 17, IN_7_DAYS, '16:30', {
    status: 'cancelled',
    cancelReason: 'แพทย์ไม่ว่าง / ปรับตาราง',
    reason: 'ตรวจสุขภาพจิต (ยกเลิก)',
    prep: 'นำรายการยาที่ใช้อยู่',
  }),
];

/**
 * Light future bookings — afternoon only — so earliest-slot search (TOR 1.6.2.1)
 * still finds morning free slots for อายุรกรรม / ทันตกรรม / กุมารเวช demos.
 */
const EARLIEST_SLOT_DEMO_APPOINTMENTS = [
  appt('A-E01', '67-00002', 1, TOMORROW, '13:00', {
    reason: 'ตรวจติดตามความดันช่วงบ่าย',
    prep: 'นำบันทึกความดัน 7 วัน',
  }),
  appt('A-E02', '67-00003', 1, TOMORROW, '14:00', {
    reason: 'เจาะเลือดช่วงบ่าย',
    prep: 'งดอาหาร 8 ชั่วโมง',
  }),
  appt('A-E03', '67-00005', 2, TOMORROW, '13:30', {
    reason: 'ขูดหินปูนช่วงบ่าย',
    prep: 'แปรงฟันก่อนมาพบแพทย์',
  }),
  appt('A-E04', '67-00006', 2, IN_2_DAYS, '15:00', {
    reason: 'อุดฟัน',
    prep: 'แปรงฟันก่อนมาพบแพทย์',
  }),
  appt('A-E05', '67-00007', 3, TOMORROW, '14:30', {
    reason: 'ตรวจสุขภาพเด็กช่วงบ่าย',
    prep: 'นำสมุดวัคซีน',
  }),
  appt('A-E06', '67-00008', 1, IN_2_DAYS, '13:15', {
    reason: 'ติดตามเบาหวาน',
    prep: 'นำผลแลปล่าสุด',
  }),
  appt('A-E07', '67-00009', 9, TOMORROW, '15:30', {
    reason: 'ตรวจฟันเด็ก',
    prep: 'แปรงฟันก่อนมาพบแพทย์',
  }),
  appt('A-E08', '67-00010', 15, IN_3_DAYS, '14:00', {
    reason: 'ตรวจสุขภาพประจำปีช่วงบ่าย',
    prep: 'นำบัตรประชาชน',
  }),
];

/** ~70 interconnected appointments — today full-day, June 2026, and past history. */
export const INITIAL_APPOINTMENTS = [
  /* ── Pending confirmation queue (tab: นัดหมายที่รอการยืนยัน) ── */
  ...PENDING_APPOINTMENTS,

  /* ── Cancelled queue (tab: นัดหมายที่ยกเลิก) ── */
  ...CANCELLED_APPOINTMENTS,

  /* ── Earliest-slot demo (morning free for common filters) ── */
  ...EARLIEST_SLOT_DEMO_APPOINTMENTS,

  /* ── Upcoming June — นายสมชาย มั่นใจดี recurring (นพ. วันชัย) ── */
  appt('A-001', '67-00001', 1, '2026-06-01', '08:15', { ...SOMCHAI_FOLLOWUP, site: 'ศูนย์ 8 บางนา' }),
  appt('A-002', '67-00001', 1, '2026-06-08', '08:15', SOMCHAI_FOLLOWUP),
  appt('A-003', '67-00001', 1, '2026-06-15', '08:15', SOMCHAI_FOLLOWUP),
  appt('A-004', '67-00001', 1, '2026-06-22', '08:15', SOMCHAI_FOLLOWUP),
  appt('A-005', '67-00001', 1, '2026-06-29', '08:15', { ...SOMCHAI_FOLLOWUP, site: 'ศูนย์ 8 บางนา' }),
  appt('A-006', '67-00002', 1, '2026-06-02', '09:00', {
    reason: 'มาตรวจสุขภาพประจำปี',
    prep: 'นำบัตรประชาชนและผลแลปล่าสุด',
  }),
  appt('A-007', '67-00005', 2, '2026-06-05', '10:30', {
    reason: 'ขูดหินปูนและตรวจฟันตามนัด',
    prep: 'แปรงฟันก่อนมาพบแพทย์',
  }),
  appt('A-024', '67-00009', 5, '2026-06-05', '09:30', {
    reason: 'ปรึกษาก่อนผ่าตัดเล็ก',
    prep: 'งดอาหารหลังเที่ยงคืน',
  }),
  appt('A-025', '67-00010', 6, '2026-06-06', '14:00', {
    reason: 'ตรวจสายตาและวัดความดันลูกตา',
    prep: 'หยุดใส่คอนแทคเลนส์ 24 ชม.',
  }),
  appt('A-026', '67-00011', 4, '2026-06-12', '10:00', {
    reason: 'ติดตามฝากครรภ์',
    prep: 'นำสมุดฝากครรภ์และผลตรวจล่าสุด',
  }),
  appt('A-027', '67-00012', 8, '2026-06-13', '11:00', {
    examMode: 'tele',
    reason: 'ติดตามผล ECG และปรับยา',
    prep: 'เตรียมเครื่องวัดความดันที่บ้าน',
  }),
  appt('A-028', '67-00013', 9, '2026-06-18', '15:00', {
    reason: 'อุดฟันและตรวจสุขภาพช่องปาก',
  }),
  appt('A-029', '67-00014', 1, '2026-06-19', '08:30', {
    reason: 'ตรวจความดันโลหิตและน้ำตาล',
    prep: 'งดอาหาร 8 ชม. ก่อนเจาะเลือด',
  }),
  appt('A-030', '67-00015', 17, '2026-06-20', '13:30', {
    reason: 'ตรวจสุขภาพจิตตามนัด',
    prep: 'นำรายการยาที่ใช้อยู่',
  }),

  /* ── Past — นายสมชาย history (Figma 29:13492) + ดวงใจ read-only demo ── */
  appt('A-009', '67-00001', 1, '2026-04-02', '08:15', { ...SOMCHAI_FOLLOWUP, site: 'ศูนย์ 8 บางนา' }),
  appt('A-010', '67-00001', 1, '2026-03-30', '09:00', SOMCHAI_FOLLOWUP),
  appt('A-011', '67-00001', 1, '2026-03-15', '08:30', SOMCHAI_FOLLOWUP),
  appt('A-012', '67-00001', 1, '2026-02-02', '10:00', { ...SOMCHAI_FOLLOWUP, site: 'ศูนย์ 8 บางนา' }),
  appt('A-013', '67-00001', 1, '2026-01-15', '08:15', SOMCHAI_FOLLOWUP),
  appt('A-014', '67-00001', 1, '2026-01-08', '08:15', SOMCHAI_FOLLOWUP),
  appt('A-015', '67-00001', 1, '2025-12-08', '08:15', SOMCHAI_FOLLOWUP),
  appt('A-008', '67-00002', 1, '2026-05-28', '08:30', {
    reason: 'มาตรวจสุขภาพประจำปี',
    prep: 'นำบัตรประชาชนและผลแลปล่าสุด',
  }),

  ...LAST_MONTH_APPOINTMENTS,
  ...YESTERDAY_APPOINTMENTS,
  ...TODAY_APPOINTMENTS,
];

/** Recent patients for search avatar pile — matches today’s busiest HNs. */
export const APPOINTMENT_SEARCH_AVATARS = [
  { src: APPOINTMENT_PATIENTS['67-00001'].avatar },
  { src: APPOINTMENT_PATIENTS['67-00002'].avatar },
  { src: APPOINTMENT_PATIENTS['67-00005'].avatar },
];
