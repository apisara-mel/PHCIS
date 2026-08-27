import { INITIAL_APPOINTMENTS } from '@/pages/appointment/appointmentMockData';
import { APPT_STATUS_PRESENTATIONS } from '@/pages/appointment/appointmentShared';
import { PHCIS_CURRENT_USER } from '@/data/phcisCurrentUser';

/* ประวัติ "สร้างการนัดหมาย" ของผู้ใช้ที่ล็อกอินอยู่ (มติผู้ใช้ 25 ส.ค. 69)

   นัดหมายใน mock ไม่ได้เก็บว่าใครเป็นคนสร้าง (`appt()` มีแต่ staffId ของแพทย์
   เจ้าของ slot) — โมดูลนี้จึง derive ขึ้นมาแทนที่จะไปแก้ factory ที่ทั้งระบบ
   นัดหมายใช้ร่วมกัน: หยิบ 1 ใน 5 มาเป็นของผู้ใช้คนนี้ แล้วสมมติเวลาที่กด
   สร้างว่าอยู่ก่อนวันนัดไม่กี่วัน

   ⚠️ ของจริงต้องมาจาก audit trail (createdBy / createdAt ของ appointment)
   ไม่ใช่ derive แบบนี้ — ดู docs/awaiting-components.md */

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const pad2 = (n) => String(n).padStart(2, '0');

/** '2026-06-01' → { date: '25 พฤษภาคม 2569', time: '09:00 น.', key: '2026-05-25' }
    ย้อนหลัง `daysBefore` วัน — `key` เป็น ISO ไว้ให้ตัวกรอง "วันที่สร้าง"
    เทียบช่วงวันได้ (ป้ายไทยเทียบไม่ได้) */
const createdStampOf = (iso, daysBefore, hour) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return { date: '-', time: '-', key: '' };
  d.setDate(d.getDate() - daysBefore);
  return {
    date: `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`,
    time: `${pad2(hour)}:${pad2((hour * 7) % 60)} น.`,
    key: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
  };
};

/** style ของ StatusBadge → tone ของ ColorfulBadge (ที่ ColumnTimeline ใช้) */
const TONE_OF_STYLE = {
  warning: 'orange',
  info: 'blue',
  success: 'green',
  yellow: 'yellow',
  error: 'red',
};

export const appointmentStatusLabel = (status) =>
  APPT_STATUS_PRESENTATIONS[status]?.label || status || '-';

export const appointmentStatusTone = (status) =>
  TONE_OF_STYLE[APPT_STATUS_PRESENTATIONS[status]?.style] || 'grey';

/** นัดหมายที่ผู้ใช้คนนี้เป็นคนสร้าง — ใหม่สุดอยู่บน (ColumnTimeline เรียงให้อีกที) */
export const MY_CREATED_APPOINTMENTS = INITIAL_APPOINTMENTS
  .filter((_, i) => i % 5 === 2)
  .map((appt, i) => {
    const stamp = createdStampOf(appt.date, (i % 6) + 2, (i % 9) + 8);
    return {
      ...appt,
      createdBy: PHCIS_CURRENT_USER.displayName,
      createdDate: stamp.date,
      createdTime: stamp.time,
      createdKey: stamp.key,
      /* วันนัดจริง (ไม่ใช่วันที่กดสร้าง) — แสดงเป็นคอลัมน์แยก */
      apptDateLabel: (() => {
        const d = new Date(`${appt.date}T00:00:00`);
        if (Number.isNaN(d.getTime())) return '-';
        return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
      })(),
    };
  });

export default MY_CREATED_APPOINTMENTS;
