/* PHCIS | Consent — สถิติและรายงาน (Figma 358:113804).
   Report cards: each has a title + subtitle, a row of filter chips, a row of
   stat cards (icon tile + value + label), and view/export actions. Local mock.

   stat.tone: 'positive' (green) / 'danger' (red) / 'info' (blue).

   `table`: the detail rows shown when "ดูรายงาน" is pressed (Figma 358:113494) —
   the list of users / ผู้รับบริการ related to that report topic. Columns mirror
   the report's filter chips. column.kind: 'status' | 'badge' | undefined(text).
   Each table mocks 20 rows so the charts show a clear distribution. */

/* ── shared mock pools ─────────────────────────────────────────────── */
const PATIENTS = [
  'สมชาย ใจดี', 'มาลี ศรีสุข', 'ประเสริฐ วงศ์ทอง', 'อรุณี แสงเดือน', 'วิชัย รุ่งเรือง',
  'สุดารัตน์ พงษ์ไพร', 'ธนา มั่นคง', 'กนกพร สุขใจ', 'อนุชา ทองคำ', 'ปิยะ วัฒนชัย',
  'วราภรณ์ ดีเลิศ', 'สมศักดิ์ ทองดี', 'ชนิดา ผ่องใส', 'มานพ เกษมสุข', 'ศิริพร บุญมา',
  'เอกชัย รักไทย', 'นภา จันทร์เพ็ญ', 'ดวงใจ แก้วใส', 'ภานุ ศรีสมบัติ', 'รัตนา พูนผล',
];
const STAFF = [
  'นพ.สมศักดิ์ ทองดี', 'พว.สุชาดา แก้วมณี', 'นพ.อนุชา ศรีวิไล', 'ภก.วราภรณ์ ดีเลิศ',
  'ทพ.ชนิดา ผ่องใส', 'พว.มานพ เกษมสุข', 'นพ.ปิยะ วัฒนชัย', 'ภก.รัตนา พูนผล',
];
const TYPES = ['การรักษา', 'ผ่าตัด', 'การวิจัย', 'วัคซีน', 'บันทึกภาพ/สื่อ', 'PDPA'];
const UNITS = ['รพ.ราชวิถี', 'สสจ. กรุงเทพฯ', 'รพ.จุฬาลงกรณ์', 'รพ.ศิริราช', 'สปสช. เขต 13', 'รพ.ตำรวจ', 'รพ.รามาธิบดี', 'สสอ. เขตดินแดง'];
const DATA_TYPES = ['ประวัติการรักษา', 'ผลตรวจ Lab', 'ภาพรังสี', 'ใบสั่งยา', 'ข้อมูลสิทธิ'];
const ROLES = ['Admin', 'Editor', 'Viewer'];
const DEPTS = ['อายุรกรรม', 'ผู้ป่วยนอก', 'เภสัชกรรม', 'ศัลยกรรม', 'ทันตกรรม', 'ส่งเสริมสุขภาพ', 'สุขภาพจิต'];

/* 44 แถวต่อรายงาน (ด.1.1.16 — ให้ตาราง "ดูรายงาน" มี pagination เห็นจริง) */
const N = 44;
const seq = (fn) => Array.from({ length: N }, (_, i) => fn(i));
const HN = (i) => `HN-4802${String(21 + i).padStart(2, '0')}`;
const consentStatus = (i) => (i % 4 === 2 ? 'ไม่ยินยอม' : 'ยินยอม');           // ~25% ไม่ยินยอม
const exportStatus = (i) => (i % 5 === 2 ? 'ถูกปฏิเสธ' : i % 5 === 4 ? 'รอตรวจสอบ' : 'สำเร็จ');
const dateTH = (i) => `${1 + (i % 12)} มิ.ย. 2569`;
const dtTH = (i) => `${1 + (i % 12)} มิ.ย. 2569 ${String(8 + (i % 9)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`;
/* ISO ประกบวันที่ไทย — ใช้กรองช่วงวันที่ในตาราง "ดูรายงาน" (มิ.ย. 2569 = 2026-06) */
const isoOf = (i) => `2026-06-${String(1 + (i % 12)).padStart(2, '0')}`;

export const CONSENT_REPORTS = [
  {
    key: 'consent-stats',
    title: 'สถิติการให้ความยินยอม / ไม่ให้ความยินยอม',
    subtitle: 'จำนวนและร้อยละ แบ่งตามช่วงเวลา รายวัน รายสัปดาห์ รายเดือน และรายปี',
    selectable: true,
    chips: ['รายวัน', 'รายสัปดาห์', 'รายเดือน', 'รายปี'],
    stats: [
      { icon: 'check_circle',   tone: 'positive', value: '1,156', label: 'ยินยอมแล้ว' },
      { icon: 'cancel',         tone: 'danger',   value: '328',   label: 'ปฏิเสธ / ถอน' },
      { icon: 'hourglass_empty', tone: 'info',    value: '77.9%', label: 'อัตรา' },
    ],
    bars: [
      { name: 'ยินยอม', tone: 'positive', base: [640, 1180, 860, 990, 720] },
      { name: 'ไม่ยินยอม', tone: 'danger', base: [190, 72, 140, 110, 205] },
    ],
    table: {
      columns: [
        { key: 'patient', header: 'ชื่อ-สกุล', width: 200 },
        { key: 'hn', header: 'HN', width: 120 },
        { key: 'type', header: 'ประเภท Consent', width: 200, kind: 'badge' },
        { key: 'status', header: 'สถานะ', width: 130, kind: 'status' },
        { key: 'date', header: 'วันที่', width: 150 },
      ],
      rows: seq((i) => ({ patient: PATIENTS[i % PATIENTS.length], hn: HN(i), type: TYPES[i % TYPES.length], status: consentStatus(i), date: dateTH(i), _iso: isoOf(i) })),
    },
  },
  {
    key: 'personal-consent',
    title: 'รายงานความยินยอมรายบุคคล',
    subtitle: 'ผู้รับบริการรายไหน ให้ความยินยอมเรื่องใดบ้าง และไม่ให้ความยินยอมเรื่องใดบ้าง',
    chips: ['ชื่อ / HN', 'ประเภท Consent', 'สถานะ', 'ช่วงเวลา'],
    stats: [
      { icon: 'groups',       tone: 'info',     value: '248',   label: 'ผู้รับบริการ' },
      { icon: 'check_circle', tone: 'positive', value: '1,156', label: 'ยินยอมแล้ว' },
      { icon: 'cancel',       tone: 'danger',   value: '328',   label: 'ไม่ยินยอม' },
    ],
    bars: [
      { name: 'ยินยอม', tone: 'positive', base: [380, 520, 470, 410, 360] },
      { name: 'ไม่ยินยอม', tone: 'danger', base: [110, 78, 132, 96, 124] },
    ],
    table: {
      columns: [
        { key: 'patient', header: 'ชื่อ / HN', width: 220 },
        { key: 'type', header: 'ประเภท Consent', width: 200, kind: 'badge' },
        { key: 'status', header: 'สถานะ', width: 130, kind: 'status' },
        { key: 'period', header: 'ช่วงเวลา', width: 170 },
      ],
      /* 16.2 — คลิกแถวเปิด ConsentHistoryPopup ของ HN นั้น (hn/name แยกไว้ให้หน้าใช้) */
      rows: seq((i) => ({ patient: `${PATIENTS[i % PATIENTS.length]} · ${HN(i)}`, name: PATIENTS[i % PATIENTS.length], hn: HN(i), type: TYPES[i % TYPES.length], status: consentStatus(i), period: '01–12 มิ.ย. 2569', _iso: isoOf(i) })),
    },
  },
  {
    key: 'export-external',
    title: 'รายงานการส่งออกข้อมูลนอกหน่วยงาน',
    subtitle: 'บันทึกการแสดงผล การส่งออก และการเข้าถึงข้อมูลจากภายนอกหน่วยงาน',
    chips: ['หน่วยงาน', 'ช่วงเวลา', 'สถานะ', 'ประเภทข้อมูล'],
    stats: [
      { icon: 'ios_share',   tone: 'danger', value: '64', label: 'ครั้งส่งออก' },
      { icon: 'open_in_new', tone: 'danger', value: '48', label: 'ครั้งเข้าถึงจากนอกหน่วยงาน' },
      { icon: 'groups',      tone: 'info',   value: '8',  label: 'หน่วยงาน' },
    ],
    bars: [
      { name: 'สำเร็จ', tone: 'positive', base: [16, 24, 19, 21, 14] },
      { name: 'ถูกปฏิเสธ', tone: 'danger', base: [4, 2, 6, 3, 5] },
    ],
    table: {
      columns: [
        { key: 'actor', header: 'ผู้ดำเนินการ', width: 180 },
        { key: 'unit', header: 'หน่วยงานปลายทาง', width: 200 },
        { key: 'dataType', header: 'ประเภทข้อมูล', width: 170, kind: 'badge' },
        { key: 'status', header: 'สถานะ', width: 130, kind: 'status' },
        { key: 'datetime', header: 'วันเวลา', width: 170 },
      ],
      rows: seq((i) => ({ actor: STAFF[i % STAFF.length], unit: UNITS[i % UNITS.length], dataType: DATA_TYPES[i % DATA_TYPES.length], status: exportStatus(i), datetime: dtTH(i), _iso: isoOf(i) })),
    },
  },
  {
    key: 'access-rights',
    title: 'รายงานผู้มีสิทธิ์เข้าถึงข้อมูลบุคคล',
    subtitle: 'ใครบ้างที่มีสิทธิ์เข้าถึงข้อมูลส่วนบุคคล พร้อมวันเวลาการเข้าถึง',
    chips: ['ชื่อผู้ใช้', 'บทบาท', 'วันเวลา', 'แผนก'],
    stats: [
      { icon: 'groups',       tone: 'info',     value: '24',  label: 'ผู้มีสิทธิ์' },
      { icon: 'groups',       tone: 'info',     value: '542', label: 'ครั้งเข้าถึง' },
      { icon: 'check_circle', tone: 'positive', value: '3',   label: 'Roles' },
    ],
    bars: [
      { name: 'ครั้งเข้าถึง', tone: 'info', base: [142, 210, 186, 168, 124] },
    ],
    table: {
      columns: [
        { key: 'user', header: 'ชื่อผู้ใช้', width: 200 },
        { key: 'role', header: 'บทบาท', width: 150, kind: 'badge' },
        { key: 'dept', header: 'แผนก', width: 170 },
        { key: 'lastAccess', header: 'วันเวลาเข้าถึงล่าสุด', width: 190 },
      ],
      /* 16.4 — วันเวลาการเข้าถึง "รายครั้ง" (ไม่ใช่แค่ล่าสุด): คลิกแถวเปิดรายการ accessTimes */
      rows: seq((i) => ({
        user: STAFF[i % STAFF.length],
        role: ROLES[i % ROLES.length],
        dept: DEPTS[i % DEPTS.length],
        lastAccess: dtTH(i),
        _iso: isoOf(i),
        accessTimes: Array.from({ length: 3 + (i % 3) }, (_, k) => ({
          datetime: `${1 + ((i + k) % 12)} มิ.ย. 2569 ${String(8 + ((i + k * 3) % 9)).padStart(2, '0')}:${String((i * 7 + k * 13) % 60).padStart(2, '0')}`,
          action: k % 3 === 2 ? 'EXPORT' : 'VIEW',
          target: `${DATA_TYPES[(i + k) % DATA_TYPES.length]} · ${HN(i + k)}`,
        })),
      })),
    },
  },
];

/** รายงานที่แสดงใน Consent dashboard (ไม่รวม access-log — ย้ายไป /audit/pii-access) */
export const CONSENT_DASHBOARD_REPORTS = CONSENT_REPORTS.filter((r) => r.key !== 'access-log');

export default CONSENT_REPORTS;
