/* ระบบจัดการระบบ · วันหยุดประจำปี
   ══════════════════════════════════════════════════════════════════════
   ทะเบียนวันหยุดของสำนักอนามัย ใช้เป็นแหล่งความจริงเดียวของ "วันที่ศูนย์
   บริการไม่เปิดทำการ" — ผูกกับกลุ่มวัน `holiday` ในเวลาทำการของศูนย์
   (centerStore.HOUR_GROUPS) ที่ระบุไว้ว่า "ตามประกาศวันหยุดราชการ"

   3 ประเภท:
     official  วันหยุดราชการตามประกาศสำนักนายกรัฐมนตรี
     substitute วันหยุดชดเชย (วันหยุดตรงกับเสาร์-อาทิตย์)
     agency    วันหยุดเฉพาะหน่วยงาน/กรณีพิเศษที่สำนักอนามัยประกาศเอง

   ⚠️ วันสำคัญทางพุทธศาสนา (มาฆบูชา/วิสาขบูชา/อาสาฬหบูชา/เข้าพรรษา) คำนวณ
   จากปฏิทินจันทรคติ — ชุดตั้งต้นนี้ใส่ไว้ให้ใช้งานได้ทันที แต่ทุกปีต้อง
   ทานกับประกาศสำนักนายกรัฐมนตรีฉบับจริงก่อนใช้จริง */

const STORAGE_KEY = 'mih:annual-holidays';

const uid = () => `hol-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const HOLIDAY_OFFICIAL = 'official';
export const HOLIDAY_SUBSTITUTE = 'substitute';
export const HOLIDAY_AGENCY = 'agency';

export const HOLIDAY_TYPE_OPTIONS = [
  { value: HOLIDAY_OFFICIAL, label: 'วันหยุดราชการ', badge: 'green' },
  { value: HOLIDAY_SUBSTITUTE, label: 'วันหยุดชดเชย', badge: 'yellow' },
  { value: HOLIDAY_AGENCY, label: 'วันหยุดเฉพาะหน่วยงาน', badge: 'blue' },
];

export const holidayTypeMeta = (type) => HOLIDAY_TYPE_OPTIONS.find((o) => o.value === type)
  || HOLIDAY_TYPE_OPTIONS[0];

/* ขอบเขตการใช้งาน — วันหยุดส่วนใหญ่เป็นประกาศระดับสำนักอนามัย ใช้ทุกศูนย์
   แต่วันหยุดเฉพาะหน่วยงาน (HOLIDAY_AGENCY) มักใช้แค่บางศูนย์ เช่น ปิดปรับปรุง
   อาคาร หรือกิจกรรมประจำเขต จึงต้องระบุศูนย์ได้ (มติผู้ใช้ 29 ส.ค. 69)
   record เก่าที่ยังไม่มีฟิลด์นี้ = 'all' เท่ากับพฤติกรรมเดิมทุกประการ */
export const HOLIDAY_SCOPE_ALL = 'all';
export const HOLIDAY_SCOPE_CENTERS = 'centers';

export const HOLIDAY_SCOPE_OPTIONS = [
  { value: HOLIDAY_SCOPE_ALL, label: 'ใช้กับทุกศูนย์' },
  { value: HOLIDAY_SCOPE_CENTERS, label: 'เลือกเฉพาะบางศูนย์' },
];

/** ป้ายสรุปขอบเขตสำหรับตาราง — 'ทุกศูนย์' หรือ 'N ศูนย์' */
export function holidayScopeLabel(row) {
  if (!row || row.scope !== HOLIDAY_SCOPE_CENTERS) return 'ทุกศูนย์';
  return `${(row.centerIds || []).length} ศูนย์`;
}

/** วันหยุดแถวนี้มีผลกับศูนย์นี้ไหม — ไม่ส่ง centerId มา = ถามระดับทะเบียน */
export function appliesToCenter(row, centerId) {
  if (!row) return false;
  if (row.scope !== HOLIDAY_SCOPE_CENTERS) return true;
  if (!centerId) return false;
  return (row.centerIds || []).includes(String(centerId));
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

/** '2026-04-13' → '13 เมษายน 2569' */
export function formatThaiDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

/** '2026-04-13' → 'จันทร์' */
export function thaiWeekday(iso) {
  if (!iso) return '';
  const dt = new Date(`${iso}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? '' : THAI_DAYS[dt.getDay()];
}

/** วันหยุดที่ตรงกับเสาร์/อาทิตย์ — ต้องมีวันชดเชย */
export function fallsOnWeekend(iso) {
  if (!iso) return false;
  const dt = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return false;
  return dt.getDay() === 0 || dt.getDay() === 6;
}

export const holidayYear = (iso) => Number(String(iso || '').slice(0, 4)) || null;

/** ปี พ.ศ. จากวันที่ ISO (ค.ศ.) */
export const buddhistYear = (iso) => {
  const y = holidayYear(iso);
  return y ? y + 543 : null;
};

/* ชุดตั้งต้น — วันหยุดราชการปี 2569 (ค.ศ. 2026) */
const DEMO_ROWS = [
  ['2026-01-01', 'วันขึ้นปีใหม่', HOLIDAY_OFFICIAL, ''],
  ['2026-03-03', 'วันมาฆบูชา', HOLIDAY_OFFICIAL, 'วันสำคัญทางพุทธศาสนา — ทานกับประกาศสำนักนายกฯ ทุกปี'],
  ['2026-04-06', 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช และวันที่ระลึกมหาจักรีบรมราชวงศ์', HOLIDAY_OFFICIAL, ''],
  ['2026-04-13', 'วันสงกรานต์', HOLIDAY_OFFICIAL, ''],
  ['2026-04-14', 'วันสงกรานต์', HOLIDAY_OFFICIAL, ''],
  ['2026-04-15', 'วันสงกรานต์', HOLIDAY_OFFICIAL, ''],
  ['2026-05-01', 'วันแรงงานแห่งชาติ', HOLIDAY_OFFICIAL, ''],
  ['2026-05-04', 'วันฉัตรมงคล', HOLIDAY_OFFICIAL, ''],
  ['2026-05-31', 'วันวิสาขบูชา', HOLIDAY_OFFICIAL, 'วันสำคัญทางพุทธศาสนา — ตรงกับวันอาทิตย์'],
  ['2026-06-01', 'ชดเชยวันวิสาขบูชา', HOLIDAY_SUBSTITUTE, 'ชดเชยวันอาทิตย์ที่ 31 พฤษภาคม'],
  ['2026-06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี', HOLIDAY_OFFICIAL, ''],
  ['2026-07-28', 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว', HOLIDAY_OFFICIAL, ''],
  ['2026-07-29', 'วันอาสาฬหบูชา', HOLIDAY_OFFICIAL, 'วันสำคัญทางพุทธศาสนา'],
  ['2026-07-30', 'วันเข้าพรรษา', HOLIDAY_OFFICIAL, 'วันสำคัญทางพุทธศาสนา'],
  ['2026-08-12', 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง และวันแม่แห่งชาติ', HOLIDAY_OFFICIAL, ''],
  ['2026-10-13', 'วันนวมินทรมหาราช', HOLIDAY_OFFICIAL, ''],
  ['2026-10-23', 'วันปิยมหาราช', HOLIDAY_OFFICIAL, ''],
  ['2026-12-05', 'วันคล้ายวันพระบรมราชสมภพ ร.9 · วันชาติ · วันพ่อแห่งชาติ', HOLIDAY_OFFICIAL, 'ตรงกับวันเสาร์'],
  ['2026-12-07', 'ชดเชยวันชาติ', HOLIDAY_SUBSTITUTE, 'ชดเชยวันเสาร์ที่ 5 ธันวาคม'],
  ['2026-12-10', 'วันรัฐธรรมนูญ', HOLIDAY_OFFICIAL, ''],
  ['2026-12-31', 'วันสิ้นปี', HOLIDAY_OFFICIAL, ''],
];

export const DEMO_HOLIDAYS = DEMO_ROWS.map(([date, name, type, note], i) => ({
  id: `hol-demo-${i + 1}`,
  date,
  name,
  type,
  note,
  /* ปิดสวิตช์ = ประกาศไว้แต่ยังให้บริการตามปกติ (เช่น คลินิกนอกเวลาเปิด) */
  active: true,
}));

export function normalizeHoliday(row = {}) {
  const centerIds = Array.isArray(row.centerIds)
    ? [...new Set(row.centerIds.filter(Boolean).map(String))]
    : [];
  /* เลือก "บางศูนย์" ไว้แต่ไม่ได้เลือกศูนย์เลย = ใช้ทุกศูนย์ — กันทะเบียนที่มี
     วันหยุดซึ่งไม่มีผลกับศูนย์ไหนเลย ซึ่งอ่านไม่ออกว่าตั้งใจหรือลืม */
  const scope = row.scope === HOLIDAY_SCOPE_CENTERS && centerIds.length
    ? HOLIDAY_SCOPE_CENTERS
    : HOLIDAY_SCOPE_ALL;
  return {
    id: row.id || uid(),
    date: String(row.date || '').slice(0, 10),
    name: String(row.name || '').trim(),
    type: HOLIDAY_TYPE_OPTIONS.some((o) => o.value === row.type) ? row.type : HOLIDAY_OFFICIAL,
    note: String(row.note || '').trim(),
    scope,
    centerIds: scope === HOLIDAY_SCOPE_CENTERS ? centerIds : [],
    active: row.active !== false,
  };
}

export function readHolidays() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEMO_HOLIDAYS.map(normalizeHoliday);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return DEMO_HOLIDAYS.map(normalizeHoliday);
    return parsed.map(normalizeHoliday);
  } catch {
    return DEMO_HOLIDAYS.map(normalizeHoliday);
  }
}

export function writeHolidays(rows) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function createHoliday(draft) {
  return normalizeHoliday({ ...draft, id: uid() });
}

/** ปีที่มีข้อมูลในทะเบียน เรียงใหม่→เก่า (ค.ศ.) */
export function holidayYears(rows) {
  return [...new Set((rows || []).map((r) => holidayYear(r.date)).filter(Boolean))]
    .sort((a, b) => b - a);
}

export function computeHolidayStats(rows) {
  const list = (rows || []).filter((r) => r.active !== false);
  return {
    total: list.length,
    official: list.filter((r) => r.type === HOLIDAY_OFFICIAL).length,
    substitute: list.filter((r) => r.type === HOLIDAY_SUBSTITUTE).length,
    agency: list.filter((r) => r.type === HOLIDAY_AGENCY).length,
  };
}

/** วันนี้เป็นวันหยุดไหม — ให้หน้าอื่น (คิว/นัดหมาย) เรียกใช้ได้ */
export function findHoliday(rows, iso, centerId) {
  return (rows || []).find((r) => r.active !== false
    && r.date === iso
    && appliesToCenter(r, centerId)) || null;
}

export function loadDemoHolidays() {
  const rows = DEMO_HOLIDAYS.map(normalizeHoliday);
  writeHolidays(rows);
  return rows;
}
