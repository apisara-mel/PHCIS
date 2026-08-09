/* §1.20.4 (สรุปรายวัน) + §1.20.5 (รายงานผู้รับบริการ)
   ชุดข้อมูลการมารับบริการ 12 เดือนย้อนหลัง — นัดหมาย / Walk-in / ไม่มาตามนัด,
   โรคที่วินิจฉัย (ICD-10 group), ระยะเวลารอคอย และการเปิดสิทธิรายวัน

   ไม่มี store เดิมที่เก็บ appointment outcome + wait-time sample ระดับรายงาน
   (opdQueue เป็นคิววันนี้เท่านั้น) จึงสร้างไฟล์นี้ตาม playbook §4 */

import {
  makeRng, pick, between, isoOffsetDays, toIsoDate,
  BMA_SERVICE_CENTERS, SERVICE_UNITS, RIGHT_TYPES, ICD10_DISEASE_GROUPS,
} from '@/data/dashboardCommon';

export const VISIT_TYPES = [
  { key: 'appointment', label: 'นัดหมาย'          },
  { key: 'walkin',      label: 'Walk-in'          },
  { key: 'noshow',      label: 'ไม่มาตามนัดหมาย'  },
];

export const visitTypeLabel = (key) =>
  VISIT_TYPES.find((t) => t.key === key)?.label || key || '—';

const FIRST_NAMES = [
  'สมชาย', 'อัจฉรา', 'ธนากร', 'พิมลรัตน์', 'อภินันท์', 'วรรณา', 'ชัยรัตน์', 'สุวพร',
  'กชกร', 'ปรีชา', 'สมพิศ', 'ธีรพงษ์', 'มัลลิกา', 'เกรียงไกร', 'พรพิมล', 'อนุชิต',
  'อรัญญา', 'ไพศาล', 'รวิวรรณ', 'ณัฐพล', 'จิราภรณ์', 'สุทธิพงษ์', 'เบญจมาศ', 'ยุพิน',
  'ประเสริฐ', 'ลัดดาวัลย์', 'วิโรจน์', 'กนกวรรณ',
];
const LAST_NAMES = [
  'มั่นใจดี', 'ใจดี', 'ศักดิ์สิทธิ์', 'จันทร์โอภาส', 'พิทักษ์', 'จิตรเย็น', 'พงศ์เพชร',
  'ภักดีไทย', 'เจริญสุข', 'รักงาน', 'ใจสะอาด', 'มั่งมี', 'จิรกุล', 'พรพิทักษ์', 'สุขสันต์',
  'รัตน์โกสินทร์', 'บุญรอด', 'สงวนทรัพย์', 'ไทยเจริญ', 'วงศ์สถิตย์', 'แสงทองดี', 'ชูเกียรติ',
];
const PREFIXES = ['นาย', 'นาง', 'น.ส.'];

const DOCTORS = [
  'พญ.สมหญิง รักษ์ดี', 'นพ.วิรัช รักการ', 'นพ.อภิชาติ ภักดี',
  'พญ.ศิรินทร์ พัฒนกุล', 'นพ.ณัฐวุฒิ บุญมี', 'พญ.กมลรัตน์ วรกุล',
];

/* น้ำหนักการวินิจฉัยให้เหมือน profile โรคของศูนย์บริการสาธารณสุข กทม. */
const DISEASE_WEIGHTS = [
  ...Array(16).fill('i10'),
  ...Array(14).fill('e11'),
  ...Array(12).fill('j00'),
  ...Array(10).fill('e78'),
  ...Array(9).fill('m54'),
  ...Array(7).fill('k29'),
  ...Array(6).fill('j45'),
  ...Array(6).fill('a09'),
  ...Array(5).fill('n39'),
  ...Array(5).fill('l30'),
  ...Array(4).fill('f32'),
  ...Array(4).fill('h25'),
];

const RIGHT_WEIGHTS = [
  ...Array(42).fill('uc'),
  ...Array(20).fill('bma'),
  ...Array(16).fill('sso'),
  ...Array(12).fill('ofc'),
  ...Array(5).fill('moph'),
  ...Array(5).fill('selfpay'),
];

const UNIT_WEIGHTS = [
  ...Array(30).fill('opd'),
  ...Array(20).fill('ncd'),
  ...Array(9).fill('anc'),
  ...Array(9).fill('epi'),
  ...Array(9).fill('dental'),
  ...Array(7).fill('mental'),
  ...Array(8).fill('rehab'),
  ...Array(8).fill('checkup'),
];

const pad2 = (n) => String(n).padStart(2, '0');

const buildVisitRecords = () => {
  const rng = makeRng(19740415);
  const rows = [];
  /* 365 วันย้อนหลัง — สุ่มจำนวนครั้งต่อวันแบบมี pattern วันธรรมดา/วันหยุด */
  for (let dayBack = 364; dayBack >= 0; dayBack -= 1) {
    const iso = isoOffsetDays(-dayBack);
    const weekday = new Date(`${iso}T00:00:00`).getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const perDay = isWeekend ? between(rng, 2, 6) : between(rng, 8, 18);
    for (let i = 0; i < perDay; i += 1) {
      /* 62% นัดหมายมาตามนัด · 27% walk-in · 11% ไม่มาตามนัด */
      const roll = rng();
      const visitType = roll < 0.62 ? 'appointment' : roll < 0.89 ? 'walkin' : 'noshow';
      const unit = pick(rng, UNIT_WEIGHTS);
      const center = pick(rng, BMA_SERVICE_CENTERS).key;
      const arrivedHour = between(rng, 7, 15);
      const arrivedMin = between(rng, 0, 59);
      const arrivedAt = `${pad2(arrivedHour)}:${pad2(arrivedMin)}`;
      /* คลินิกที่มีคิวยาว (OPD/NCD) รอนานกว่า; ไม่มาตามนัดไม่มีเวลารอ
         และบางเคส (2%) ไม่มีเวลาสิ้นสุด → ต้องถูกตัดออกจากค่าเฉลี่ย */
      const base = unit === 'opd' ? 38 : unit === 'ncd' ? 45 : unit === 'dental' ? 30 : 22;
      const missingEnd = visitType !== 'noshow' && rng() < 0.02;
      const waitMinutes = visitType === 'noshow' || missingEnd
        ? null
        : Math.max(4, Math.round(base + (rng() - 0.45) * base * 1.2));
      rows.push({
        id: `visit-${iso}-${pad2(i)}`,
        iso,
        arrivedAt,
        hn: `${between(rng, 62, 69)}-${String(between(rng, 1, 9999)).padStart(5, '0')}`,
        patientName: `${pick(rng, PREFIXES)}${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
        age: between(rng, 3, 92),
        gender: rng() < 0.53 ? 'หญิง' : 'ชาย',
        center,
        unit,
        visitType,
        right: pick(rng, RIGHT_WEIGHTS),
        disease: pick(rng, DISEASE_WEIGHTS),
        doctor: pick(rng, DOCTORS),
        waitMinutes,
        missingEndStamp: missingEnd,
        noShowReason: visitType === 'noshow'
          ? pick(rng, ['ติดธุระ', 'ลืมนัด', 'ย้ายที่อยู่', 'อาการดีขึ้น', 'ไม่ระบุ'])
          : '',
      });
    }
  }
  return rows;
};

/** การมารับบริการ 12 เดือนย้อนหลัง (แหล่งข้อมูลของทุกกลุ่มรายงานผู้รับบริการ) */
export const SERVICE_VISIT_RECORDS = buildVisitRecords();

export const todayIso = () => toIsoDate(new Date());

/** §1.20.4.1 สรุปการเปิดสิทธิรายวัน — นับจำนวนการเปิด/ตรวจสอบสิทธิของ "วันนี้" */
export const dailyRightsSummary = (iso = todayIso()) => {
  const rows = SERVICE_VISIT_RECORDS.filter((r) => r.iso === iso && r.visitType !== 'noshow');
  const map = new Map(RIGHT_TYPES.map((r) => [r.key, 0]));
  rows.forEach((r) => map.set(r.right, (map.get(r.right) || 0) + 1));
  return { iso, total: rows.length, counts: map };
};

/** §1.20.4.2 สรุปโรคของผู้รับบริการประจำวัน */
export const dailyDiseaseSummary = (iso = todayIso()) => {
  const rows = SERVICE_VISIT_RECORDS.filter((r) => r.iso === iso && r.visitType !== 'noshow');
  const map = new Map();
  rows.forEach((r) => map.set(r.disease, (map.get(r.disease) || 0) + 1));
  return { iso, total: rows.length, counts: map };
};

/** รายการ "เปิดสิทธิรายวัน" สำหรับตาราง ดูรายงาน */
export const buildDailyRightsRows = () => {
  const byDayRight = new Map();
  SERVICE_VISIT_RECORDS.forEach((r) => {
    if (r.visitType === 'noshow') return;
    const key = `${r.iso}|${r.center}|${r.right}`;
    const entry = byDayRight.get(key) || {
      id: key, iso: r.iso, center: r.center, right: r.right, count: 0, newRegistration: 0,
    };
    entry.count += 1;
    if (r.visitType === 'walkin') entry.newRegistration += 1;
    byDayRight.set(key, entry);
  });
  return [...byDayRight.values()].sort((a, b) => String(b.iso).localeCompare(String(a.iso)));
};

/** รายการ "โรคของผู้รับบริการประจำวัน" สำหรับตาราง ดูรายงาน */
export const buildDailyDiseaseRows = () => {
  const map = new Map();
  SERVICE_VISIT_RECORDS.forEach((r) => {
    if (r.visitType === 'noshow') return;
    const key = `${r.iso}|${r.disease}`;
    const entry = map.get(key) || { id: key, iso: r.iso, disease: r.disease, count: 0, units: new Set() };
    entry.count += 1;
    entry.units.add(r.unit);
    map.set(key, entry);
  });
  return [...map.values()]
    .map((e) => ({ ...e, unitCount: e.units.size }))
    .sort((a, b) => String(b.iso).localeCompare(String(a.iso)) || b.count - a.count);
};

/** อันดับโรค (§1.20.5.5) จาก records ที่กรองแล้ว */
export const rankDiseases = (rows, limit = 10) => {
  const map = new Map();
  rows.forEach((r) => { if (r.visitType !== 'noshow') map.set(r.disease, (map.get(r.disease) || 0) + 1); });
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, value]) => ({
      key,
      label: ICD10_DISEASE_GROUPS.find((d) => d.key === key)?.label || key,
      code: ICD10_DISEASE_GROUPS.find((d) => d.key === key)?.code || '',
      value,
    }));
};

/** ระยะเวลารอคอยเฉลี่ยต่อหน่วยบริการ (§1.20.5.6) — ตัดเคสที่ไม่มีเวลาสิ้นสุด */
export const averageWaitByUnit = (rows) => {
  const map = new Map();
  rows.forEach((r) => {
    if (r.waitMinutes == null) return;
    const entry = map.get(r.unit) || { unit: r.unit, sum: 0, n: 0, max: 0 };
    entry.sum += r.waitMinutes;
    entry.n += 1;
    entry.max = Math.max(entry.max, r.waitMinutes);
    map.set(r.unit, entry);
  });
  return SERVICE_UNITS
    .map((u) => {
      const e = map.get(u.key);
      return {
        key: u.key,
        label: u.label,
        avg: e && e.n ? Math.round(e.sum / e.n) : 0,
        max: e ? e.max : 0,
        samples: e ? e.n : 0,
      };
    })
    .filter((r) => r.samples > 0)
    .sort((a, b) => b.avg - a.avg);
};

/** จำนวนเคสที่ไม่มีเวลาสิ้นสุด (เชิงอรรถใต้รายงานระยะเวลารอคอย) */
export const countMissingWaitStamp = (rows) =>
  rows.filter((r) => r.visitType !== 'noshow' && r.waitMinutes == null).length;

export const CENTER_OPTIONS = [
  { value: 'all', label: 'ทุกศูนย์บริการ' },
  ...BMA_SERVICE_CENTERS.map((c) => ({ value: c.key, label: c.name })),
];

export const UNIT_OPTIONS = [
  { value: 'all', label: 'ทุกหน่วยบริการ' },
  ...SERVICE_UNITS.map((u) => ({ value: u.key, label: u.label })),
];
