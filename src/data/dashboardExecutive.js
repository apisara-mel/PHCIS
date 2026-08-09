/* §1.20.10 — Dashboard ผู้บริหาร (Area Health Analytics)
   10.1 ภาพรวมสุขภาพรายพื้นที่ เขต/แขวง/สถานบริการ + แผนที่ + NCD รายพื้นที่
   10.2 แนวโน้มการลงทะเบียนผู้ป่วยใหม่ + การกระจายตัวตามเพศ/อายุ
   10.3 แนวโน้มความต้องการยาล่วงหน้า (forecast) เพื่อป้องกันการขาดสต็อก
   10.4 แนวโน้มด้านการเงิน — รายรับจากการให้บริการ
   10.5 การแจ้งเตือนเมื่อผลวิเคราะห์เปลี่ยนแปลงผิดปกติ

   ไม่มี store เดิมที่เก็บ aggregate ระดับพื้นที่ (เขต/แขวง), forecast ยา หรือ
   กติกาการแจ้งเตือนความผิดปกติ — ไฟล์นี้เป็นชั้นข้อมูลผู้บริหาร (playbook §4) */

import {
  makeRng, between, THAI_MONTHS_SHORT, isoOffsetMonths, isoOffsetDays,
} from '@/data/dashboardCommon';

/** สิทธิ์ที่เข้าถึง Dashboard ผู้บริหารได้ (§1.20.10 role gate) */
export const EXECUTIVE_ROLES = ['ผู้บริหาร', 'ผู้อำนวยการศูนย์', 'ผู้บริหารสำนักอนามัย'];

/** พื้นที่ กทม. ที่มีศูนย์บริการสาธารณสุขในชุดข้อมูลนี้ (เขต → แขวง → สถานบริการ) */
export const BKK_AREAS = [
  {
    key: 'dindaeng',
    district: 'เขตดินแดง',
    lat: 13.7699, lng: 100.5525,
    population: 128400,
    subDistricts: [
      { key: 'dindaeng-1', name: 'แขวงดินแดง',   population: 72400, dm: 3120, ht: 4480, elderly: 12800 },
      { key: 'dindaeng-2', name: 'แขวงรัชดาภิเษก', population: 56000, dm: 2210, ht: 3260, elderly: 9400 },
    ],
    centers: ['ศบส.4 ดินแดง'],
  },
  {
    key: 'ladphrao',
    district: 'เขตลาดพร้าว',
    lat: 13.8180, lng: 100.6070,
    population: 116200,
    subDistricts: [
      { key: 'ladphrao-1', name: 'แขวงลาดพร้าว', population: 61200, dm: 2410, ht: 3620, elderly: 10600 },
      { key: 'ladphrao-2', name: 'แขวงจรเข้บัว',  population: 55000, dm: 2050, ht: 3010, elderly: 9100 },
    ],
    centers: ['ศบส.15 ลาดพร้าว'],
  },
  {
    key: 'watthana',
    district: 'เขตวัฒนา',
    lat: 13.7380, lng: 100.5860,
    population: 84600,
    subDistricts: [
      { key: 'watthana-1', name: 'แขวงคลองเตยเหนือ', population: 31200, dm: 1180, ht: 1760, elderly: 5200 },
      { key: 'watthana-2', name: 'แขวงคลองตันเหนือ', population: 29800, dm: 1090, ht: 1620, elderly: 4900 },
      { key: 'watthana-3', name: 'แขวงพระโขนงเหนือ', population: 23600, dm: 880,  ht: 1310, elderly: 4100 },
    ],
    centers: ['ศบส.21 วัดธาตุทอง'],
  },
  {
    key: 'khlongtoei',
    district: 'เขตคลองเตย',
    lat: 13.7080, lng: 100.5740,
    population: 103800,
    subDistricts: [
      { key: 'khlongtoei-1', name: 'แขวงคลองเตย', population: 48200, dm: 2380, ht: 3410, elderly: 8600 },
      { key: 'khlongtoei-2', name: 'แขวงคลองตัน', population: 29400, dm: 1320, ht: 1980, elderly: 5200 },
      { key: 'khlongtoei-3', name: 'แขวงพระโขนง', population: 26200, dm: 1180, ht: 1720, elderly: 4700 },
    ],
    centers: ['ศบส.41 คลองเตย'],
  },
  {
    key: 'buengkum',
    district: 'เขตบึงกุ่ม',
    lat: 13.7853, lng: 100.6690,
    population: 148900,
    subDistricts: [
      { key: 'buengkum-1', name: 'แขวงคลองกุ่ม',  population: 74200, dm: 3080, ht: 4520, elderly: 12100 },
      { key: 'buengkum-2', name: 'แขวงนวมินทร์',  population: 40100, dm: 1620, ht: 2410, elderly: 6500 },
      { key: 'buengkum-3', name: 'แขวงนวลจันทร์', population: 34600, dm: 1370, ht: 2020, elderly: 5600 },
    ],
    centers: ['ศบส.56 ทับเจริญ'],
  },
  {
    key: 'thawiwatthana',
    district: 'เขตทวีวัฒนา',
    lat: 13.7826, lng: 100.3820,
    population: 79400,
    subDistricts: [
      { key: 'thawi-1', name: 'แขวงทวีวัฒนา',   population: 44200, dm: 1610, ht: 2380, elderly: 7800 },
      { key: 'thawi-2', name: 'แขวงศาลาธรรมสพน์', population: 35200, dm: 1240, ht: 1840, elderly: 6100 },
    ],
    centers: ['ศบส.67 ทวีวัฒนา'],
  },
];

export const AREA_OPTIONS = [
  { value: 'all', label: 'ทุกเขต' },
  ...BKK_AREAS.map((a) => ({ value: a.key, label: a.district })),
];

export const subDistrictOptions = (areaKey) => {
  const base = [{ value: 'all', label: 'ทุกแขวง' }];
  if (!areaKey || areaKey === 'all') {
    return [
      ...base,
      ...BKK_AREAS.flatMap((a) => a.subDistricts.map((s) => ({ value: s.key, label: `${s.name} (${a.district})` }))),
    ];
  }
  const area = BKK_AREAS.find((a) => a.key === areaKey);
  if (!area) return base;
  return [...base, ...area.subDistricts.map((s) => ({ value: s.key, label: s.name }))];
};

export const centerOptionsForArea = (areaKey) => {
  const base = [{ value: 'all', label: 'ทุกสถานบริการ' }];
  const areas = !areaKey || areaKey === 'all' ? BKK_AREAS : BKK_AREAS.filter((a) => a.key === areaKey);
  return [...base, ...areas.flatMap((a) => a.centers.map((c) => ({ value: c, label: c })))];
};

/** แถวข้อมูลระดับแขวง ตามตัวกรอง เขต/แขวง/สถานบริการ */
export const areaRows = ({ area = 'all', subDistrict = 'all', center = 'all' } = {}) => {
  const rows = [];
  BKK_AREAS.forEach((a) => {
    if (area !== 'all' && a.key !== area) return;
    if (center !== 'all' && !a.centers.includes(center)) return;
    a.subDistricts.forEach((s) => {
      if (subDistrict !== 'all' && s.key !== subDistrict) return;
      rows.push({
        id: s.key,
        areaKey: a.key,
        district: a.district,
        subDistrict: s.name,
        center: a.centers[0] || '—',
        population: s.population,
        dm: s.dm,
        ht: s.ht,
        elderly: s.elderly,
        ncdTotal: s.dm + s.ht,
        prevalence: s.population ? Math.round(((s.dm + s.ht) / s.population) * 1000) / 10 : 0,
      });
    });
  });
  return rows;
};

/** สรุปรายเขต (สำหรับ HBarList โรคไม่ติดต่อเรื้อรังแยกตามเขต) */
export const districtSummaries = (filter = {}) => {
  const rows = areaRows(filter);
  const map = new Map();
  rows.forEach((r) => {
    const e = map.get(r.areaKey) || {
      key: r.areaKey, district: r.district, center: r.center,
      population: 0, dm: 0, ht: 0, elderly: 0,
    };
    e.population += r.population;
    e.dm += r.dm;
    e.ht += r.ht;
    e.elderly += r.elderly;
    map.set(r.areaKey, e);
  });
  return [...map.values()]
    .map((e) => ({
      ...e,
      ncdTotal: e.dm + e.ht,
      prevalence: e.population ? Math.round(((e.dm + e.ht) / e.population) * 1000) / 10 : 0,
      lat: BKK_AREAS.find((a) => a.key === e.key)?.lat ?? 13.75,
      lng: BKK_AREAS.find((a) => a.key === e.key)?.lng ?? 100.5,
    }))
    .sort((a, b) => b.ncdTotal - a.ncdTotal);
};

/** §1.20.10.2 — แนวโน้มการลงทะเบียนผู้ป่วยใหม่ 12 เดือน
    `monthsIso` = วันที่ 1 ของแต่ละเดือน เพื่อให้หน้าจอตัดช่วงตามตัวกรองเวลาได้
    (ป้ายชื่อเดือนภาษาไทยอย่างเดียวเทียบช่วงวันที่ไม่ได้) */
const buildRegistrationTrend = () => {
  const rng = makeRng(20100213);
  const months = [];
  const monthsIso = [];
  const values = [];
  const returning = [];
  for (let back = 11; back >= 0; back -= 1) {
    const iso = isoOffsetMonths(back, 1);
    months.push(THAI_MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]);
    monthsIso.push(iso);
    values.push(between(rng, 180, 420));
    returning.push(between(rng, 620, 1180));
  }
  return { months, monthsIso, newPatients: values, returningPatients: returning };
};

export const REGISTRATION_TREND = buildRegistrationTrend();

/** §1.20.10.2 — การกระจายตัวประชากรที่ลงทะเบียน ตามเพศและอายุ (ร้อยละ) */
export const POPULATION_PYRAMID = [
  { label: '80+',    malePct: 0.9, femalePct: 1.6 },
  { label: '70-79',  malePct: 2.4, femalePct: 3.3 },
  { label: '60-69',  malePct: 4.6, femalePct: 5.6 },
  { label: '50-59',  malePct: 5.8, femalePct: 6.7 },
  { label: '40-49',  malePct: 6.1, femalePct: 6.4 },
  { label: '30-39',  malePct: 5.7, femalePct: 5.9 },
  { label: '20-29',  malePct: 5.2, femalePct: 5.1 },
  { label: '10-19',  malePct: 4.4, femalePct: 4.2 },
  { label: '0-9',    malePct: 3.3, femalePct: 3.1 },
];

/** §1.20.10.3 — แนวโน้มความต้องการยาล่วงหน้า
    12 เดือนที่ผ่านมา (actual) + 3 เดือนพยากรณ์ (forecast) */
const buildDrugForecast = () => {
  const drugs = [
    { name: 'Metformin 500 mg',  unit: 'เม็ด', seed: 3001, base: 42000, stock: 38600, dailyUse: 1380 },
    { name: 'Enalapril 5 mg',    unit: 'เม็ด', seed: 3002, base: 28000, stock: 41200, dailyUse: 910  },
    { name: 'Simvastatin 20 mg', unit: 'เม็ด', seed: 3003, base: 24000, stock: 19800, dailyUse: 790  },
    { name: 'Amlodipine 5 mg',   unit: 'เม็ด', seed: 3004, base: 31000, stock: 52400, dailyUse: 1010 },
    { name: 'Insulin NPH',       unit: 'ขวด',  seed: 3005, base: 640,   stock: 380,   dailyUse: 21   },
    { name: 'Losartan 50 mg',    unit: 'เม็ด', seed: 3006, base: 26000, stock: 61200, dailyUse: 850  },
  ];
  const months = [];
  for (let back = 11; back >= 0; back -= 1) {
    const iso = isoOffsetMonths(back, 1);
    months.push(THAI_MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]);
  }
  const forecastMonths = [];
  for (let ahead = 1; ahead <= 3; ahead += 1) {
    const iso = isoOffsetMonths(-ahead, 1);
    forecastMonths.push(THAI_MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]);
  }
  return drugs.map((d) => {
    const rng = makeRng(d.seed);
    const actual = months.map((_, i) => Math.round(d.base * (0.86 + i * 0.014) + (rng() - 0.5) * d.base * 0.08));
    const last = actual[actual.length - 1];
    const growth = 1 + (rng() * 0.06 + 0.015);
    const forecast = forecastMonths.map((_, i) => Math.round(last * Math.pow(growth, i + 1)));
    const daysToStockout = d.dailyUse > 0 ? Math.floor(d.stock / d.dailyUse) : 999;
    return {
      id: d.name,
      name: d.name,
      unit: d.unit,
      months,
      forecastMonths,
      actual,
      forecast,
      stock: d.stock,
      dailyUse: d.dailyUse,
      daysToStockout,
      /* วิกฤต ≤ 30 วัน · เฝ้าระวัง ≤ 60 วัน · ปกติ > 60 วัน */
      severity: daysToStockout <= 30 ? 'critical' : daysToStockout <= 60 ? 'watch' : 'ok',
    };
  });
};

export const DRUG_FORECASTS = buildDrugForecast();

export const FORECAST_SEVERITY_LABEL = {
  critical: 'ควรเติมสต็อกด่วน',
  watch: 'เฝ้าระวัง',
  ok: 'สต็อกเพียงพอ',
};

/** §1.20.10.4 — แนวโน้มรายรับจากการให้บริการ 12 เดือน (บาท) */
const buildRevenueTrend = () => {
  const rng = makeRng(88112233);
  const months = [];
  const monthsIso = [];
  const values = [];
  for (let back = 11; back >= 0; back -= 1) {
    const iso = isoOffsetMonths(back, 1);
    months.push(THAI_MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]);
    monthsIso.push(iso);
    values.push(between(rng, 980000, 1680000));
  }
  return { months, monthsIso, values };
};

export const REVENUE_TREND = buildRevenueTrend();

export const REVENUE_CHANNEL_SPLIT = [
  { key: 'uc',      label: 'เบิก สปสช.',        value: 6480000 },
  { key: 'bma',     label: 'งบ กทม.',            value: 3120000 },
  { key: 'sso',     label: 'ประกันสังคม',        value: 1980000 },
  { key: 'ofc',     label: 'เบิกต้นสังกัด',       value: 1240000 },
  { key: 'cash',    label: 'เงินสด/e-Payment',   value: 860000  },
];

/* §1.20.10.5 — กติกาการแจ้งเตือนความผิดปกติ + เหตุการณ์ที่ตรวจพบ */

export const ANOMALY_RULES = [
  { key: 'disease-spike', label: 'จำนวนผู้ป่วยรายโรคเพิ่มขึ้น > 50% เทียบเดือนก่อน', metric: 'ระบาดวิทยา' },
  { key: 'stockout',      label: 'ยาคาดว่าจะขาดสต็อกภายใน 30 วัน',                   metric: 'คลังยา'     },
  { key: 'revenue-drop',  label: 'รายรับต่ำกว่าค่าเฉลี่ย 2 SD',                        metric: 'การเงิน'    },
  { key: 'wait-time',     label: 'ระยะเวลารอคอยเฉลี่ยเกิน 60 นาที ติดต่อกัน 3 วัน',    metric: 'คุณภาพบริการ' },
  { key: 'no-show',       label: 'อัตราไม่มาตามนัดเกิน 20%',                           metric: 'การนัดหมาย' },
  { key: 'med-error',     label: 'Medication Error ระดับ D ขึ้นไป มากกว่า 3 ครั้ง/เดือน', metric: 'ความปลอดภัย' },
];

export const ANOMALY_SEVERITY = {
  critical: { label: 'วิกฤต',     badge: 'red',    order: 0 },
  high:     { label: 'สูง',       badge: 'orange', order: 1 },
  medium:   { label: 'ปานกลาง',   badge: 'yellow', order: 2 },
  low:      { label: 'เฝ้าระวัง', badge: 'blue',   order: 3 },
};

const ANOMALY_SEED = [
  {
    id: 'anom-01', rule: 'disease-spike', severity: 'critical',
    title: 'ผู้ป่วยไข้เลือดออก เขตดินแดง เพิ่มขึ้น 180%',
    detail: 'เดือนนี้ 42 ราย เทียบเดือนก่อน 15 ราย — สูงกว่าเกณฑ์ควบคุมของสำนักอนามัย',
    area: 'เขตดินแดง', metric: 'ระบาดวิทยา', delta: '+180%',
    link: '/dashboard/reports/service', linkLabel: 'ดูรายงานโรคของผู้รับบริการ',
    daysAgo: 0,
  },
  {
    id: 'anom-02', rule: 'stockout', severity: 'high',
    title: 'Metformin 500 mg คาดว่าจะขาดสต็อกใน 28 วัน',
    detail: 'อัตราการใช้เฉลี่ย 1,380 เม็ด/วัน คงเหลือ 38,600 เม็ด — ควรเบิกเพิ่มภายในสัปดาห์นี้',
    area: 'ทุกศูนย์บริการ', metric: 'คลังยา', delta: '28 วัน',
    link: '/dashboard/reports/pharmacy', linkLabel: 'ดูรายงานเภสัชกรรม',
    daysAgo: 0,
  },
  {
    id: 'anom-03', rule: 'revenue-drop', severity: 'medium',
    title: 'รายรับเดือนนี้ต่ำกว่าค่าเฉลี่ย 2 SD',
    detail: 'รายรับ 986,400 บาท เทียบค่าเฉลี่ย 12 เดือน 1,324,800 บาท (−25.5%)',
    area: 'ศบส.67 ทวีวัฒนา', metric: 'การเงิน', delta: '−25.5%',
    link: '/finance', linkLabel: 'ดูรายงานการเงิน',
    daysAgo: 1,
  },
  {
    id: 'anom-04', rule: 'wait-time', severity: 'medium',
    title: 'ระยะเวลารอคอยคลินิกโรคเรื้อรังเกิน 60 นาที ติดต่อกัน 3 วัน',
    detail: 'ค่าเฉลี่ย 68 นาที (เกณฑ์ 45 นาที) — พิจารณาเพิ่มช่องบริการช่วง 08:00–10:00 น.',
    area: 'ศบส.4 ดินแดง', metric: 'คุณภาพบริการ', delta: '+23 นาที',
    link: '/dashboard/reports/service', linkLabel: 'ดูรายงานระยะเวลารอคอย',
    daysAgo: 2,
  },
  {
    id: 'anom-05', rule: 'no-show', severity: 'low',
    title: 'อัตราไม่มาตามนัดคลินิกสุขภาพจิต 22%',
    detail: 'สูงกว่าเกณฑ์ 20% — แนะนำเพิ่มการเตือนนัดล่วงหน้า 1 วันผ่าน SMS',
    area: 'ศบส.15 ลาดพร้าว', metric: 'การนัดหมาย', delta: '+2%',
    link: '/dashboard/clinics', linkLabel: 'ดู Dashboard คลินิกพิเศษ',
    daysAgo: 3,
  },
  {
    id: 'anom-06', rule: 'med-error', severity: 'high',
    title: 'Medication Error ระดับ D ขึ้นไป 4 ครั้งในเดือนนี้',
    detail: 'สูงกว่าเกณฑ์ 3 ครั้ง/เดือน — ควรทบทวนขั้นตอน double-check ก่อนจ่ายยา',
    area: 'ศบส.41 คลองเตย', metric: 'ความปลอดภัย', delta: '+1 ครั้ง',
    link: '/dashboard/reports/pharmacy', linkLabel: 'ดูรายงาน Medication Error',
    daysAgo: 4,
  },
];

/** เหตุการณ์ผิดปกติที่ตรวจพบ — เรียงตามความรุนแรงแล้วตามเวลา (stable) */
export const ANOMALY_EVENTS = ANOMALY_SEED
  .map((a) => ({
    ...a,
    detectedIso: isoOffsetDays(-a.daysAgo),
    detectedAt: `${isoOffsetDays(-a.daysAgo)} ${a.daysAgo === 0 ? '08:15' : '07:40'}`,
  }))
  .sort((a, b) => (ANOMALY_SEVERITY[a.severity].order - ANOMALY_SEVERITY[b.severity].order)
    || a.daysAgo - b.daysAgo
    || a.id.localeCompare(b.id));

/** เวลาที่ประเมินกติกาแจ้งเตือนรอบล่าสุด (แสดงในสถานะว่าง) */
export const ANOMALY_LAST_EVALUATED = '08:15 น. วันนี้';

/* §1.20.10.5 — บันทึกผู้รับทราบ + เวลา ต้องไม่หายเมื่อออกจากหน้าแล้วกลับเข้ามา
   จึงเก็บที่ระดับโมดูล (in-memory log แบบเดียวกับ requestLog ใน
   dashboardCustomReports.js) ไม่ใช่ state ของ component ที่ unmount แล้วหาย
   หมายเหตุ: ระบบจริงต้องบันทึกฝั่งเซิร์ฟเวอร์ — in-memory หายเมื่อ reload */
let anomalyAckLog = {};

export const listAnomalyAcks = () => ({ ...anomalyAckLog });

export const acknowledgeAnomaly = (id, { by, at, note = '' }) => {
  if (!id) return listAnomalyAcks();
  anomalyAckLog = { ...anomalyAckLog, [id]: { by, at, note } };
  return listAnomalyAcks();
};

/** ยกเลิกการรับทราบ (ทุกข้อ “แสดง/บันทึก/ยกเลิก/แก้ไข” ต้องครบ) */
export const revokeAnomalyAck = (id) => {
  const next = { ...anomalyAckLog };
  delete next[id];
  anomalyAckLog = next;
  return listAnomalyAcks();
};
