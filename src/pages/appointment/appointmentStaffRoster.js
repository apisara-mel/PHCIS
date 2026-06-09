/* Staff roster mock data — Figma Appointment 1:18433 (Table inside card).
   Personas model real hospital roles (แพทย์ · พยาบาล · เวชระเบียน · ทะเบียน · ธุรการ). */

import { STAFF_AVATAR, STAFF_AVATAR_POOL } from './appointmentStaffAvatars';

export const STAFF_ROSTER_TOTAL = 248;

/** ColorfulBadge style per visible label (Figma table cells). */
export const STAFF_BADGE_TONE_BY_LABEL = {
  แพทย์: 'blue',
  พยาบาล: 'purple',
  'เจ้าหน้าที่ธุรการ': 'purple',
  'เจ้าหน้าที่ทะเบียน': 'yellow',
  'เจ้าหน้าที่เวชระเบียน': 'blue',
  เวชระเบียน: 'blue',
  ทันตกรรม: 'blue',
  อายุรกรรม: 'blue',
  กุมารเวช: 'blue',
  'ผู้ป่วยนอก (OPD)': 'teal',
  'เห็นพาเชนต์': 'grey',
  ศัลยกรรม: 'blue',
  จักษุวิทยา: 'blue',
  'เวชศาสตร์ครอบครัว': 'teal',
  ประสาทวิทยา: 'indigo',
  'ศัลยกรรมกระดูก': 'blue',
  'โรคผิวหนัง': 'teal',
  'อุบัติเหตุและฉุกเฉิน': 'red',
  สุขภาพจิต: 'purple',
  รังสีวิทยา: 'grey',
  'โสต ศอ นาสิก': 'blue',
  'เวชศาสตร์ฟื้นฟู': 'teal',
  'สูติ-นรีเวช': 'pink',
  'สูติ-นรีแพทย์': 'pink',
  อายุรแพทย์: 'blue',
  ทันตแพทย์: 'blue',
  กุมารแพทย์: 'blue',
  ศัลยแพทย์: 'blue',
  จักษุแพทย์: 'blue',
  'แพทย์ครอบครัว': 'teal',
  โรคหัวใจ: 'red',
  ประสาทแพทย์: 'indigo',
  นิวัลย์แพทย์: 'blue',
  ผิวหนัง: 'teal',
  ฉุกเฉิน: 'red',
  จิตแพทย์: 'purple',
  รังสีวิทยา: 'grey',
  ต่อมไร้น้ำตาล: 'orange',
  โรคปอด: 'blue',
};

export function staffBadgeTone(label) {
  return STAFF_BADGE_TONE_BY_LABEL[label] || 'grey';
}

/** Representative hospital staff — each row ships a unique generated portrait. */
const STAFF_SEEDS = [
  {
    role: 'doctor',
    name: 'นพ. วันชัย อยู่เย็น',
    nameEn: 'Dr. Wanchai Yuyuen',
    employeeId: 'MED-1042',
    groupPolicy: 'doctor',
    groupPolicyLabel: 'แพทย์',
    subDivision: 'อายุรแพทย์',
    dept: 'อายุรกรรม',
    workDays: 5,
    avgExamMin: 12,
    slotMinutes: 15,
    avatarSrc: STAFF_AVATAR.doctorGeneral,
    icon: 'medical_services',
  },
  {
    role: 'doctor',
    name: 'ทพ. สมชาย ใสสวัสดี',
    nameEn: 'Dr. Somchai Jaisawaddee',
    employeeId: 'MED-2088',
    groupPolicy: 'doctor',
    groupPolicyLabel: 'แพทย์',
    subDivision: 'ทันตแพทย์',
    dept: 'ทันตกรรม',
    workDays: 5,
    avgExamMin: 15,
    slotMinutes: 15,
    avatarSrc: STAFF_AVATAR.doctorDental,
    icon: 'medical_services',
  },
  {
    role: 'nurse',
    name: 'นางสาวประภา สุขใจ',
    nameEn: 'Ms. Prapa Sukjai',
    employeeId: 'NRS-3015',
    groupPolicy: 'nurse',
    groupPolicyLabel: 'พยาบาล',
    subDivision: 'ผู้ป่วยนอก (OPD)',
    dept: 'อายุรกรรม',
    workDays: 5,
    avgExamMin: 10,
    avatarSrc: STAFF_AVATAR.nurseOpd,
    icon: 'health_and_safety',
  },
  {
    role: 'nurse',
    name: 'นางสาวรัตนา ดีงาม',
    nameEn: 'Ms. Rattana Deengam',
    employeeId: 'NRS-3022',
    groupPolicy: 'nurse',
    groupPolicyLabel: 'พยาบาล',
    subDivision: 'เจ้าหน้าที่เวชระเบียน',
    dept: 'เวชระเบียน',
    workDays: 5,
    avgExamMin: 10,
    avatarSrc: STAFF_AVATAR.nurseRecords,
    icon: 'health_and_safety',
  },
  {
    role: 'staff',
    name: 'นางสาววิภา รักษ์ดี',
    nameEn: 'Ms. Wipa Rakdee',
    employeeId: 'REG-4011',
    groupPolicy: 'registrar',
    groupPolicyLabel: 'เจ้าหน้าที่เวชระเบียน',
    subDivision: 'เจ้าหน้าที่เวชระเบียน',
    dept: 'เวชระเบียน',
    workDays: 5,
    avgExamMin: 8,
    avatarSrc: STAFF_AVATAR.registrar,
    icon: 'folder_shared',
  },
  {
    role: 'staff',
    name: 'นางสมศรี มีสุข',
    nameEn: 'Mrs. Somsri Meesuk',
    employeeId: 'REG-4018',
    groupPolicy: 'registrar',
    groupPolicyLabel: 'เจ้าหน้าที่เวชระเบียน',
    subDivision: 'เจ้าหน้าที่เวชระเบียน',
    dept: 'เวชระเบียน',
    workDays: 5,
    avgExamMin: 8,
    avatarSrc: STAFF_AVATAR.registrarSenior,
    icon: 'folder_shared',
  },
  {
    role: 'staff',
    name: 'นางสาวสาวลดา ใสสะอาด',
    nameEn: 'Ms. Sawalada Saisaad',
    employeeId: 'REC-5012',
    groupPolicy: 'reception',
    groupPolicyLabel: 'เจ้าหน้าที่ทะเบียน',
    subDivision: 'เจ้าหน้าที่ทะเบียน',
    dept: 'เวชระเบียน',
    workDays: 5,
    avgExamMin: 6,
    avatarSrc: STAFF_AVATAR.reception,
    icon: 'badge',
  },
  {
    role: 'staff',
    name: 'นายวิชัย เก่งดี',
    nameEn: 'Mr. Wichai Kengdee',
    employeeId: 'ADM-6010',
    groupPolicy: 'admin',
    groupPolicyLabel: 'เจ้าหน้าที่ธุรการ',
    subDivision: 'เจ้าหน้าที่ธุรการ',
    dept: 'เวชระเบียน',
    workDays: 5,
    avgExamMin: 5,
    avatarSrc: STAFF_AVATAR.admin,
    icon: 'support_agent',
  },
  {
    role: 'doctor',
    name: 'นพ. จักรพงษ์ โสยรวา',
    nameEn: 'Dr. Jakrapong Soyarwa',
    employeeId: 'MED-1105',
    groupPolicy: 'doctor',
    groupPolicyLabel: 'แพทย์',
    subDivision: 'กุมารแพทย์',
    dept: 'กุมารเวช',
    workDays: 4,
    avgExamMin: 18,
    slotMinutes: 20,
    avatarSrc: STAFF_AVATAR.doctorGeneral,
    avatarObjectPosition: '52% 18%',
    icon: 'medical_services',
  },
  {
    role: 'staff',
    name: 'นางสาวพิมพ์ใจ แจ่มใส',
    nameEn: 'Ms. Pimpai Jaemjai',
    employeeId: 'REC-5020',
    groupPolicy: 'reception',
    groupPolicyLabel: 'เจ้าหน้าที่ทะเบียน',
    subDivision: 'เจ้าหน้าที่ทะเบียน',
    dept: 'เวชระเบียน',
    workDays: 6,
    avgExamMin: 6,
    avatarSrc: STAFF_AVATAR.reception,
    avatarObjectPosition: '48% 22%',
    icon: 'badge',
  },
];

/** Default duty window + slot grid step (minutes) per staff row. */
const DEFAULT_SLOT_MINUTES = 15;
const DEFAULT_WORK_HOURS = { start: '08:00', end: '16:00' };

export function buildStaffRoster(total = STAFF_ROSTER_TOTAL) {
  return Array.from({ length: total }, (_, index) => {
    const seed = STAFF_SEEDS[index % STAFF_SEEDS.length];
    const cycle = Math.floor(index / STAFF_SEEDS.length);
    return {
      id: index + 1,
      slotMinutes: seed.slotMinutes ?? DEFAULT_SLOT_MINUTES,
      workHours: seed.workHours ?? DEFAULT_WORK_HOURS,
      avatarSrc: seed.avatarSrc ?? STAFF_AVATAR_POOL[index % STAFF_AVATAR_POOL.length],
      ...seed,
      /* Distinguish cycled clones in search while keeping the same portrait family. */
      employeeId: cycle > 0
        ? `${seed.employeeId}-${String(cycle + 1).padStart(2, '0')}`
        : seed.employeeId,
    };
  });
}
