import { STAFF_AVATARS } from '@/data/avatarAssets';

/* PHCIS | Audit — Log การเข้าถึงข้อมูลส่วนบุคคล (PDPA audit trail).
   ย้ายจากรายงาน Consent → ระบบประวัติการใช้งาน (/audit/pii-access). */

const STAFF = [
  'นพ.สมศักดิ์ ทองดี', 'พว.สุชาดา แก้วมณี', 'นพ.อนุชา ศรีวิไล', 'ภก.วราภรณ์ ดีเลิศ',
  'ทพ.ชนิดา ผ่องใส', 'พว.มานพ เกษมสุข', 'นพ.ปิยะ วัฒนชัย', 'ภก.รัตนา พูนผล',
];

const N = 100;
const seq = (fn) => Array.from({ length: N }, (_, i) => fn(i));
const dtTH = (i) => `${1 + (i % 12)} มิ.ย. 2569 ${String(8 + (i % 9)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`;
const isoOf = (i) => `2026-06-${String(1 + (i % 12)).padStart(2, '0')}`;

export const PII_ACCESS_LOG_STATS = [
  { icon: 'groups', tone: 'info', value: '4,821', label: 'log entries' },
  { icon: 'visibility', tone: 'info', value: '3,412', label: 'VIEW' },
  { icon: 'ios_share', tone: 'purple', value: '892', label: 'EXPORT' },
  { icon: 'delete', tone: 'danger', value: '48', label: 'DELETE' },
];

export const PII_ACCESS_LOG_BARS = [
  { name: 'VIEW', tone: 'info', base: [280, 360, 330, 310, 240] },
  { name: 'EXPORT / UPDATE', tone: 'teal', base: [70, 96, 84, 78, 60] },
  { name: 'DELETE', tone: 'orange', base: [18, 12, 24, 16, 10] },
];

export const PII_ACCESS_LOG_ROWS = seq((i) => ({
  id: `pii-${i}`,
  user: STAFF[i % STAFF.length],
  avatarUrl: STAFF_AVATARS[i % STAFF_AVATARS.length],
  ip: `10.12.${(i % 6) + 4}.${((i * 11) % 200) + 1}`,
  action: i % 6 === 5 ? 'DELETE' : i % 3 === 0 ? 'EXPORT' : 'VIEW',
  target: i % 3 === 0 ? 'ประวัติการรักษา · HN-4802' + String(21 + (i % 20)).padStart(2, '0') : 'ผลตรวจ Lab · HN-4802' + String(21 + (i % 20)).padStart(2, '0'),
  datetime: `${dtTH(i)}:${String((i * 13) % 60).padStart(2, '0')}`,
  sessionId: `SES-${1000 + i}`,
  _iso: isoOf(i),
}));

export const getPiiAccessLog = () => PII_ACCESS_LOG_ROWS.map((r) => ({ ...r }));
