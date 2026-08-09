/* telemedEmr — สร้าง "chart จาก PHCIS" ระหว่างสายให้ครบทุก HN (TOR §1.13.6)
   + ตัวแปลงพิกัดจุดประเมิน GIS (TOR §1.13.5).

   เดิม TelemedEmrPanel ผูก mock ไว้กับ HN แค่ 2 ราย (67-00007, 67-00001)
   คนไข้รายอื่นจึงเห็น "ว่างทุกพาเนล" ซึ่งอ่านเหมือนระบบพัง ไม่ใช่ผู้ป่วยรายใหม่.

   ที่นี่จึงสร้าง chart แบบ deterministic จาก HN (hash → PRNG) โดย
     · ชื่อยา       ดึงจาก src/data/medicationCatalog.js
     · ชื่อ LAB     ดึงจาก src/data/labCatalog.js  (พร้อมค่าอ้างอิง/ราคา)
     · ชื่อ X-ray   ดึงจาก src/data/xrayCatalog.js
     · หน่วยบริการ/แพทย์/โรคประจำตัว จาก mock ของโมดูล Telemedicine
   ผลลัพธ์คงที่ต่อ HN (เปิดกี่ครั้งก็เหมือนเดิม) แต่ต่างกันระหว่าง HN และมี
   ผู้ป่วยรายใหม่ (ไม่มีประวัติ) ปนอยู่จริงเพื่อให้ empty state ยังได้ทดสอบ.

   ⚠️ ข้อจำกัดที่ต้องรายงานตรง ๆ: นี่คือ chart จำลอง ไม่ใช่ข้อมูลจาก API PHCIS
   จริง — UI ต้องติดป้าย "ข้อมูลสาธิต" และมีทางลัดไปเปิด chart เต็มที่
   /treat/record เสมอ. */

import { MEDICATION_NAME_OPTIONS } from '@/data/medicationCatalog';
import { LAB_TESTS } from '@/data/labCatalog';
import { XRAY_EXAMS } from '@/data/xrayCatalog';
import { getRpmPatientByHn, getRpmReadings } from '@/data/telemedRpm';
import { getTelemedVisitByHn, TELEMED_DOCTORS, TELEMED_ORIGIN_UNITS } from '@/data/telemedVisits';

/* ── PRNG แบบ deterministic ──────────────────────────────────────────── */
const hashString = (text) => {
  let h = 2166136261;
  const s = String(text || '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const makeRng = (seed) => {
  let state = seed || 1;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5;  state >>>= 0;
    return state / 4294967296;
  };
};

const pick = (rng, list) => list[Math.floor(rng() * list.length) % list.length];
const pickMany = (rng, list, count) => {
  const out = [];
  const pool = [...list];
  for (let i = 0; i < count && pool.length; i += 1) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return out;
};

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const thaiDate = (d) => `${String(d.getDate()).padStart(2, '0')} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
const thaiDateTime = (d) => `${thaiDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(9, 30, 0, 0); return d; };
const daysAhead = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(9, 0, 0, 0); return d; };

/* ── คลังค่าอ้างอิงของโรคเรื้อรังที่พบบ่อยในศูนย์บริการสาธารณสุข กทม. ── */
const CHRONIC_POOL = [
  { name: 'เบาหวานชนิดที่ 2', dx: 'Type 2 diabetes mellitus (E11.9)' },
  { name: 'ความดันโลหิตสูง', dx: 'Essential hypertension (I10)' },
  { name: 'ไขมันในเลือดสูง', dx: 'Hyperlipidaemia (E78.5)' },
  { name: 'โรคไตเรื้อรังระยะ 3', dx: 'Chronic kidney disease stage 3 (N18.3)' },
  { name: 'หอบหืด', dx: 'Asthma, unspecified (J45.9)' },
  { name: 'ข้อเข่าเสื่อม', dx: 'Gonarthrosis (M17.9)' },
  { name: 'ภาวะซีดจากการขาดธาตุเหล็ก', dx: 'Iron deficiency anaemia (D50.9)' },
];

const ALLERGY_POOL = [
  'Penicillin (ผื่นลมพิษ)',
  'Sulfa (คลื่นไส้ อาเจียน)',
  'NSAIDs (หอบเหนื่อย)',
  'อาหารทะเล (ผื่นคัน)',
  'Aspirin (ระคายกระเพาะ)',
];

const CLINIC_POOL = [
  'คลินิกโรคเรื้อรัง (NCD)',
  'คลินิกผู้สูงอายุ (Telemedicine)',
  'เวชศาสตร์ครอบครัว',
  'อายุรกรรมทั่วไป',
];

/* ผลตรวจเชิงคุณภาพ (ไม่มีช่วงตัวเลข) — ห้ามสุ่มเป็นตัวเลข เพราะจะอ่านผิดทาง
   คลินิก (เช่น "ABO grouping = 1.4"). ใช้ค่าที่พบจริงของ analyte นั้นแทน */
const QUALITATIVE_RESULT = {
  'ABO grouping': ['A', 'B', 'O', 'AB'],
  'Rh (D) Typing': ['Positive', 'Negative'],
  default: ['Negative', 'Trace', 'Positive'],
};

const qualitativeFor = (rng, analyte) => {
  const label = String(analyte?.label || '');
  /* analyte ที่เป็น enum มีชุดคำตอบของตัวเองอยู่แล้ว (Non-reactive/Reactive ฯลฯ)
     ใช้ชุดนั้นแทนการตกไปที่ "รอผล" */
  const options = Array.isArray(analyte?.options) && analyte.options.length ? analyte.options : null;
  const pool = QUALITATIVE_RESULT[label]
    || options
    || (/negative|positive/i.test(String(analyte?.normalRange || ''))
      ? QUALITATIVE_RESULT.default
      : null);
  if (!pool) return null;
  const value = pick(rng, pool);
  /* ผิดปกติเมื่อไม่ตรงกับค่าอ้างอิงที่ระบุไว้ — ไม่มีค่าอ้างอิง (ABO / Rh) แปลว่า
     ผลนั้นไม่มีคำว่า "ผิดปกติ" */
  const normal = String(analyte?.normalRange || '').trim();
  const abnormal = normal ? value.toLowerCase() !== normal.toLowerCase() : false;
  return { value, abnormal };
};

const fmtLabValue = (value) => (Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1));

/* ค่าอ้างอิงคร่าว ๆ ของ analyte ที่ใช้แสดงผลตรวจ (ค่าจริงมาจาก labCatalog) */
const numericFor = (rng, analyte) => {
  const raw = String(analyte?.normalRange || '');
  const range = raw.match(/([\d.]+)\s*[–-]\s*([\d.]+)/);
  if (range) {
    const low = Number(range[1]);
    const high = Number(range[2]);
    const abnormal = rng() > 0.72;
    const span = high - low || 1;
    const value = abnormal
      ? (rng() > 0.5 ? high + span * (0.1 + rng() * 0.4) : Math.max(0, low - span * (0.1 + rng() * 0.3)))
      : low + span * rng();
    return { value: fmtLabValue(value), abnormal };
  }

  /* ค่าอ้างอิงแบบ "เกณฑ์ด้านเดียว" — HbA1c '< 5.7', LDL '< 130', HDL '> 40',
     eGFR '≥ 90' ฯลฯ. ถ้าไม่รองรับตรงนี้ ค่าโรคเรื้อรังที่แพทย์เปิดดูบ่อยที่สุด
     จะตกไปที่ 'รอผลจากห้องปฏิบัติการ' ทั้งที่เป็น visit ย้อนหลังหลายสัปดาห์ */
  const threshold = raw.match(/^\s*([<>≤≥])\s*([\d.]+)/);
  if (threshold) {
    const op = threshold[1];
    const limit = Number(threshold[2]);
    if (Number.isFinite(limit) && limit > 0) {
      const upperBound = op === '<' || op === '≤';   /* ปกติ = ต่ำกว่าเกณฑ์ */
      const abnormal = rng() > 0.72;
      /* คิดเป็นสัดส่วนของเกณฑ์ ไม่ใช่ค่าคงที่ เพื่อให้ค่าที่ได้ยังอยู่ในช่วงที่
         เป็นไปได้ทางสรีรวิทยา (HbA1c 4.6–5.6 ไม่ใช่ 3.4) */
      const value = upperBound
        ? limit * (abnormal ? 1.10 + rng() * 0.30 : 0.80 + rng() * 0.17)
        : limit * (abnormal ? 0.55 + rng() * 0.35 : 1.03 + rng() * 0.30);
      return { value: fmtLabValue(value), abnormal };
    }
  }

  const qualitative = qualitativeFor(rng, analyte);
  if (qualitative) return qualitative;
  /* ไม่รู้จักรูปแบบเลย ('No growth', 'ไม่พบสิ่งผิดปกติ', '') → ไม่เดาค่า
     แสดงว่ารอผลแทนการสร้างตัวเลขปลอม */
  return { value: 'รอผลจากห้องปฏิบัติการ', abnormal: false, pending: true };
};

const EMPTY_CHART = {
  isNewPatient: true,
  visits: [],
  lastVisit: null,
  meds: [],
  allergies: [],
  chronic: [],
  labs: [],
  imaging: [],
  appointments: [],
  rpmRegistered: false,
  source: 'ยังไม่พบเวชระเบียนเดิมใน PHCIS',
};

/**
 * chart ย่อของผู้รับบริการ 1 ราย — คงที่ต่อ HN.
 * @param {string} hn
 * @param {{name?:string, age?:number, sex?:string}} [hint]
 */
export const getEmrChart = (hn, hint = {}) => {
  if (!hn) return { ...EMPTY_CHART };
  const seed = hashString(`emr:${hn}`);
  const rng = makeRng(seed);
  const visit = getTelemedVisitByHn(hn);
  const rpm = getRpmPatientByHn(hn);

  /* 1 ใน 5 ของ HN เป็นผู้รับบริการรายใหม่จริง ๆ (ไม่มีประวัติเดิม) — ยกเว้น
     รายที่ลงทะเบียน RPM ไว้แล้ว ซึ่งแปลว่าเคยมารับบริการแน่นอน */
  const isNewPatient = !rpm && seed % 5 === 0;
  if (isNewPatient) {
    return {
      ...EMPTY_CHART,
      appointments: visit?.appointmentAt
        ? [{ at: thaiDateTime(new Date(visit.appointmentAt)), clinic: `${visit.department} (Telemedicine)` }]
        : [],
    };
  }

  const chronicCount = 1 + (seed % 3);
  const chronic = pickMany(rng, CHRONIC_POOL, chronicCount);
  const doctor = visit?.doctor || pick(rng, TELEMED_DOCTORS);
  const place = visit?.originUnit || pick(rng, TELEMED_ORIGIN_UNITS);

  /* ── การมารับบริการย้อนหลัง 1–4 ครั้ง ── */
  const visitCount = 1 + (seed % 4);
  const visits = [];
  for (let i = 0; i < visitCount; i += 1) {
    const at = daysAgo(16 + i * 62 + Math.floor(rng() * 12));
    visits.push({
      id: `EMRV-${hn}-${i}`,
      date: thaiDate(at),
      iso: at.toISOString(),
      place: i === 0 ? place : pick(rng, TELEMED_ORIGIN_UNITS),
      dx: chronic[i % chronic.length].dx,
      doctor: i === 0 ? doctor : pick(rng, TELEMED_DOCTORS),
      type: i === 0 ? 'ปรึกษาทางไกล (Telemedicine)' : 'ตรวจที่หน่วยบริการ',
    });
  }

  /* ── ยาเดิม ── */
  const medNames = MEDICATION_NAME_OPTIONS
    .filter((m) => !/\d(mg|mcg)\b/i.test(m.value))
    .map((m) => m.value);
  const meds = pickMany(rng, medNames, 1 + (seed % 4)).map((name) => ({
    name,
    sig: pick(rng, [
      '1×1 หลังอาหารเช้า',
      '1×2 หลังอาหารเช้า-เย็น',
      '1×1 ก่อนนอน',
      '1×1 ก่อนอาหารเช้า 30 นาที',
    ]),
    lastDispensedAt: thaiDate(daysAgo(12 + Math.floor(rng() * 40))),
  }));

  /* ── แพ้ยา (ราวครึ่งหนึ่งไม่มีประวัติแพ้ → empty state ยังได้ใช้) ── */
  const allergies = rng() > 0.45 ? pickMany(rng, ALLERGY_POOL, 1 + (seed % 2)) : [];

  /* ── ผล LAB จากแคตตาล็อกกลาง ── */
  const labTests = pickMany(rng, LAB_TESTS.filter((t) => !t.retired), 2 + (seed % 3));
  const labs = [];
  labTests.forEach((t) => {
    const at = thaiDate(daysAgo(9 + Math.floor(rng() * 60)));
    const analytes = t.analytes || [];
    if (!analytes.length) {
      labs.push({ name: t.nameEn, code: t.code, value: rng() > 0.8 ? 'Positive' : 'Negative', unit: '', at, abnormal: rng() > 0.85 });
      return;
    }
    pickMany(rng, analytes, Math.min(2, analytes.length)).forEach((a) => {
      const n = numericFor(rng, a);
      labs.push({
        name: `${a.label}`,
        code: t.code,
        panel: t.nameEn,
        value: `${n.value} ${a.unit || ''}`.trim(),
        ref: a.normalRange ? `ค่าอ้างอิง ${a.normalRange}` : '',
        at,
        abnormal: n.abnormal,
      });
    });
  });

  /* ── ภาพรังสี (ราว 40% ไม่เคยถ่าย) ── */
  const imaging = rng() > 0.6
    ? pickMany(rng, XRAY_EXAMS.filter((x) => !x.retired), 1).map((x) => ({
      name: `${x.name} (${x.code})`,
      at: thaiDate(daysAgo(40 + Math.floor(rng() * 200))),
      impression: pick(rng, [
        'No active lung lesion, heart size normal',
        'Mild cardiomegaly, no pulmonary congestion',
        'Degenerative change, no acute fracture',
        'ไม่พบความผิดปกติที่มีนัยสำคัญ',
      ]),
    }))
    : [];

  /* ── นัดหมายถัดไป ── */
  const appointments = [];
  if (visit?.appointmentAt) {
    appointments.push({
      at: thaiDateTime(new Date(visit.appointmentAt)),
      clinic: `${visit.department} (Telemedicine)`,
    });
  }
  if (rng() > 0.35) {
    appointments.push({
      at: thaiDateTime(daysAhead(21 + Math.floor(rng() * 60))),
      clinic: pick(rng, CLINIC_POOL),
    });
  }

  return {
    isNewPatient: false,
    patientName: hint.name || visit?.name || '',
    visits,
    lastVisit: visits[0] || null,
    meds,
    allergies,
    chronic: chronic.map((c) => c.name),
    labs,
    imaging,
    appointments,
    rpmRegistered: Boolean(rpm),
    rpmReadingCount: rpm ? getRpmReadings(rpm.id).length : 0,
    source: 'ข้อมูลสาธิตที่จำลองการดึง chart จาก PHCIS (ยังไม่ได้เชื่อม API จริง)',
  };
};

/* ── GIS: จุดที่ผู้รับบริการถูกประเมิน (TOR §1.13.5) ─────────────────── */

/** พิกัดสำรองรายหน่วยบริการต้นทาง — ใช้เมื่อผู้ป่วยยังไม่ลงทะเบียน RPM */
const UNIT_FALLBACK_LOCATION = {
  'รพ.สต. บางบัวทอง 2':                { lat: 13.7440, lng: 100.5000, label: 'รพ.สต. บางบัวทอง 2 (พิกัดหน่วยบริการต้นทาง)' },
  'ศบส.4 ดินแดง (หน่วยชุมชน)':          { lat: 13.7690, lng: 100.5540, label: 'ศบส.4 ดินแดง (พิกัดหน่วยบริการต้นทาง)' },
  'ศบส.41 คลองเตย (ชุมชนล็อค 1-2-3)':  { lat: 13.7180, lng: 100.5820, label: 'ศบส.41 คลองเตย (พิกัดหน่วยบริการต้นทาง)' },
  'รพ.สต. คลองสามวา':                  { lat: 13.8620, lng: 100.7180, label: 'รพ.สต. คลองสามวา (พิกัดหน่วยบริการต้นทาง)' },
  'ศบส.21 วัดธาตุทอง (หน่วยเคลื่อนที่)': { lat: 13.7350, lng: 100.5860, label: 'ศบส.21 วัดธาตุทอง (พิกัดหน่วยบริการต้นทาง)' },
  'ศบส.15 ลาดพร้าว':                   { lat: 13.8120, lng: 100.6060, label: 'ศบส.15 ลาดพร้าว (พิกัดหน่วยบริการต้นทาง)' },
};

/**
 * พิกัดของ "จุดที่เกิดการประเมิน" สำหรับ HN หนึ่ง ๆ
 * ลำดับความน่าเชื่อถือ: บ้านที่ลงทะเบียน RPM › หน่วยบริการต้นทาง › ไม่ทราบ
 * @returns {{lat:number,lng:number,label:string,precision:'home'|'unit',pinSaved:boolean}|null}
 */
export const resolveAssessmentLocation = (hn) => {
  const rpm = getRpmPatientByHn(hn);
  if (rpm?.homeLocation) {
    return { ...rpm.homeLocation, precision: 'home', pinSaved: true };
  }
  const visit = getTelemedVisitByHn(hn);
  const fallback = visit ? UNIT_FALLBACK_LOCATION[visit.originUnit] : null;
  if (fallback) return { ...fallback, precision: 'unit', pinSaved: true };
  return null;
};

/** ระดับความละเอียดของพิกัด → ข้อความอธิบายบน UI (ห้ามอ้างเกินจริง) */
export const LOCATION_PRECISION_LABEL = {
  home: 'พิกัดบ้านที่ลงทะเบียน',
  unit: 'พิกัดหน่วยบริการต้นทาง',
};

/** คำอธิบายเต็มของระดับความละเอียด — แสดงเป็นบรรทัดอธิบาย ไม่ใช่ในป้าย */
export const LOCATION_PRECISION_HINT = {
  home: 'พิกัดจากที่อยู่ที่ลงทะเบียนอุปกรณ์วัดที่บ้าน (ข้อมูลสาธิต)',
  unit: 'ยังไม่มีพิกัดบ้าน — แสดงพิกัดหน่วยบริการต้นทางแทน',
};

/**
 * รวมจุดประเมินของผู้รับบริการหลายรายให้พร้อมวางบนแผนที่รวม
 * @param {Array<{hn:string,name:string,level?:string,[k:string]:any}>} rows
 */
export const buildGisPins = (rows = []) => rows
  .map((row) => {
    const loc = resolveAssessmentLocation(row.hn);
    if (!loc) return null;
    return {
      id: row.id || row.hn,
      hn: row.hn,
      name: row.name,
      level: row.level || 'normal',
      originUnit: row.originUnit || '',
      lat: loc.lat,
      lng: loc.lng,
      label: loc.label,
      precision: loc.precision,
      row,
    };
  })
  .filter(Boolean);

/**
 * กรอบพิกัดที่ครอบทุกหมุด + ระยะเผื่อขอบ (คืนค่าคงที่เมื่อไม่มีหมุด)
 */
export const gisBounds = (pins = []) => {
  if (!pins.length) return { north: 13.90, south: 13.65, west: 100.45, east: 100.75 };
  const lats = pins.map((p) => p.lat);
  const lngs = pins.map((p) => p.lng);
  const padLat = Math.max(0.02, (Math.max(...lats) - Math.min(...lats)) * 0.25);
  const padLng = Math.max(0.02, (Math.max(...lngs) - Math.min(...lngs)) * 0.25);
  return {
    north: Math.max(...lats) + padLat,
    south: Math.min(...lats) - padLat,
    west: Math.min(...lngs) - padLng,
    east: Math.max(...lngs) + padLng,
  };
};

/** พิกัด → ตำแหน่งเป็นเปอร์เซ็นต์บนผืนแผนที่ (y กลับด้าน: บน = เหนือ) */
export const projectPin = (pin, bounds) => ({
  x: ((pin.lng - bounds.west) / (bounds.east - bounds.west)) * 100,
  y: ((bounds.north - pin.lat) / (bounds.north - bounds.south)) * 100,
});
