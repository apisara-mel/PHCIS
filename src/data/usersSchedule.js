/* TOR §1.17.5.3 — บันทึก/แสดงตารางการทำงานของผู้ใช้ (ฝั่งผู้ดูแลระบบ = อ่านอย่างเดียว).

   แหล่งความจริงของตารางเวรคือ **ระบบจัดการตารางเวร** (src/pages/schedule)
   ซึ่งอยู่นอกขอบเขตที่แก้ได้ในรอบนี้ — หน้า /users/:id/schedule จึงเป็น
   มุมมองอ่านอย่างเดียว + deep-link กลับไปแก้ที่ระบบนั้น.

   ⚠️ สำเนา read-only ของ SHIFT_TYPES
   ─────────────────────────────────
   `SHIFT_TYPES` ด้านล่างคัดลอกมาจาก const ภายใน
   `src/pages/schedule/ScheduleEditorPage.jsx` (Figma 35:7682) ซึ่ง
   **ไม่ได้ export** ออกมา และห้ามแก้ไฟล์ฝั่ง /schedule ในรอบนี้ จึงต้อง
   mirror ค่าไว้ที่นี่โดยตั้งใจ. ถ้าฝั่ง schedule เปลี่ยนเวลาเวรเมื่อไร
   ค่าชุดนี้จะ drift — ต้องตามแก้ให้ตรงกัน (หรือยกไป export ร่วมกันภายหลัง). */

import { buildScheduleStaff, SCHEDULE_STATUS_META } from '@/pages/schedule/scheduleStaff';
import { USERS } from '@/data/usersAccess';

/** สำเนา read-only จาก ScheduleEditorPage.jsx — ห้ามแก้ที่นี่โดยไม่ sync ต้นทาง. */
export const SHIFT_TYPES = [
  { key: 'morning', label: 'เวรเช้า',  time: '08:00 - 12:00', tone: 'orange', hours: 4 },
  { key: 'noon',    label: 'เวรบ่าย',  time: '13:00 - 16:00', tone: 'blue',   hours: 3 },
  { key: 'evening', label: 'เวรดึก',   time: '16:00 - 20:00', tone: 'purple', hours: 4 },
  { key: 'oncall',  label: 'เวรเสริม', time: 'On-call',       tone: 'teal',   hours: 8 },
  { key: 'dayoff',  label: 'วันหยุด',  time: 'Day Off',       tone: 'red',    hours: 0 },
];

export const SHIFT_LOOKUP = SHIFT_TYPES.reduce((acc, s) => { acc[s.key] = s; return acc; }, {});

export { SCHEDULE_STATUS_META };

export const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
export const THAI_WEEKDAY_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

/* หน่วยบริการที่ผูกกับเวรแต่ละประเภท — ให้ตารางรายสัปดาห์มีคอลัมน์ที่มีความหมาย */
const UNIT_BY_SHIFT = {
  morning: 'คลินิกผู้ป่วยนอกทั่วไป',
  noon:    'คลินิกโรคเรื้อรัง (NCD)',
  evening: 'คลินิกนอกเวลา',
  oncall:  'เวรพร้อมเรียก (On-call)',
  dayoff:  '—',
};

const NOTE_BY_SHIFT = {
  morning: '',
  noon:    '',
  evening: 'ปฏิบัติงานนอกเวลาราชการ',
  oncall:  'พร้อมเรียกตัวภายใน 30 นาที',
  dayoff:  'วันหยุดประจำสัปดาห์',
};

/* สถานะการจัดเวรของผู้ใช้ — ยืมจาก buildScheduleStaff() ของระบบตารางเวร
   โดยจับคู่ตามลำดับ (roster จริงเป็นคนละชุด id กับ USERS ของงานผู้ดูแลระบบ). */
export function scheduleStatusForUser(userId) {
  const idx = USERS.findIndex((u) => u.id === userId);
  if (idx < 0) return 'pending';
  const roster = buildScheduleStaff();
  if (!roster.length) return 'pending';
  return roster[idx % roster.length].scheduleStatus;
}

/* Hash คงที่ต่อ (userId, วันที่) เพื่อให้ตารางเวรไม่กระพริบทุก render. */
const hash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
};

/* ผู้ใช้ที่ยัง "รอจัดตารางเวร" = ยังไม่มีเวรในเดือนนี้ (empty state ของหน้า) */
const NO_SHIFT_STATUSES = ['pending'];

/**
 * สร้างตารางเวรของผู้ใช้ 1 คนในเดือนที่ระบุ.
 * @returns {{days: Array, weeks: Array, summary: Object, hasSchedule: boolean}}
 */
export function buildUserSchedule(userId, year, monthIndex) {
  const status = scheduleStatusForUser(userId);
  const hasSchedule = !NO_SHIFT_STATUSES.includes(status);
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leading = first.getDay();

  const days = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = new Date(year, monthIndex, d);
    const dow = date.getDay();
    let shiftKey = null;
    if (hasSchedule) {
      if (dow === 0) shiftKey = 'dayoff';
      else {
        const h = hash(`${userId}-${year}-${monthIndex}-${d}`);
        const pick = h % 10;
        if (dow === 6) shiftKey = pick < 6 ? 'dayoff' : 'oncall';
        else if (pick < 4) shiftKey = 'morning';
        else if (pick < 7) shiftKey = 'noon';
        else if (pick < 9) shiftKey = 'evening';
        else shiftKey = 'oncall';
      }
    }
    days.push({
      day: d,
      date,
      dow,
      shiftKey,
      shift: shiftKey ? SHIFT_LOOKUP[shiftKey] : null,
      unit: shiftKey ? UNIT_BY_SHIFT[shiftKey] : '',
      note: shiftKey ? NOTE_BY_SHIFT[shiftKey] : '',
    });
  }

  /* กริดปฏิทิน 6 แถว × 7 คอลัมน์ (ช่องว่างนำหน้า = null) */
  const cells = [
    ...Array.from({ length: leading }, () => null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const counts = SHIFT_TYPES.reduce((acc, s) => { acc[s.key] = 0; return acc; }, {});
  let totalHours = 0;
  days.forEach((d) => {
    if (!d.shiftKey) return;
    counts[d.shiftKey] += 1;
    totalHours += SHIFT_LOOKUP[d.shiftKey].hours;
  });

  return {
    days,
    weeks,
    hasSchedule,
    scheduleStatus: status,
    summary: {
      totalHours,
      counts,
      workingDays: days.filter((d) => d.shiftKey && d.shiftKey !== 'dayoff').length,
      dayOff: counts.dayoff,
    },
  };
}

/** รายการเวรแบบตาราง (เฉพาะวันที่มีเวรจริง — วันหยุดก็แสดงเพื่อความครบถ้วน). */
export function scheduleTableRows(schedule) {
  return schedule.days
    .filter((d) => d.shiftKey)
    .map((d) => ({
      id: `${d.date.getFullYear()}-${d.date.getMonth()}-${d.day}`,
      dateLabel: `${d.day} ${THAI_MONTH_NAMES[d.date.getMonth()]} ${d.date.getFullYear() + 543}`,
      weekday: THAI_WEEKDAY_SHORT[d.dow],
      shiftLabel: d.shift.label,
      tone: d.shift.tone,
      time: d.shift.time,
      unit: d.unit,
      note: d.note || '—',
    }));
}
