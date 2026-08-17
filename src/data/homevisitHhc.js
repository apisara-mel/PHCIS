/* งานเยี่ยมบ้าน — ส่วนที่มาจาก "Gap analysis" มติคณะทำงาน คทง.4
   (พยาบาลต่อเนื่องที่บ้าน · HHC) ที่แก้/ขยาย TOR เดิม.

   หนึ่งไฟล์ต่อหนึ่งมติ เพื่อให้ย้อนรอยได้ว่าโค้ดส่วนไหนมาจากข้อไหน:

     §2.1.6  (เปลี่ยน)   ลำดับบันทึก ชุมชน → สำรวจบ้าน → บุคคล → งานเยี่ยม
     §1.18.7 (เปลี่ยน)   “แบบส่งต่อ” → “แบบลงทะเบียน HHC” 3 ทางรับเคส + บันทึกหน้างาน
     §1.18.2 (ขยาย)     ปักหมุด GPS อัตโนมัติ + ขอบเขตพื้นที่รับผิดชอบบนแผนที่
     §1.18.1 (เพิ่มใหม่) โควตาจำนวนครั้งการเยี่ยมตามสิทธิ สปสช. รายกลุ่มผู้ป่วย
     §1.7.1.1 (ขยาย)    คีย์ครั้งเดียวแล้วส่ง สปสช. อัตโนมัติ (เลิกคีย์ซ้ำ BKK Home Care)
     §1.1.1.20 (ขยาย)   บังคับค้นเลขบัตรประชาชน 13 หลักจากฐานข้อมูลกลางก่อนสร้างประวัติ
     §2.2.2  (ขยาย)     อสส. มี User ของตนเอง แต่เห็นเฉพาะเคสที่ได้รับมอบหมาย
     §2.4.1  (ขยาย)     ดึงข้อมูลดิบไป Pivot/Export + แยกนับรายบุคคล (Person) กับการให้บริการ (Visit)

   ค่าโควตา / ฐานข้อมูลกลาง / ผลตอบกลับ สปสช. เป็น mock ทั้งหมด (ยังไม่มี
   API จริงในเฟสนี้) แต่รูปทรงข้อมูลออกแบบให้ตรงกับที่ระบบจริงต้องส่ง. */

import {
  HOMEVISIT_CURRENT_USER,
  HOMEVISIT_CENTER,
  HOMEVISIT_CENTER_LOCATION,
  formatHomeVisitDateTime,
  todayIsoDate,
  readJson,
  writeJson,
  resolveGroup,
} from '@/data/homevisitVisits';

/* ═══ §1.18.1 — โควตาการเยี่ยมตามสิทธิ สปสช. รายกลุ่มผู้ป่วย ═══════
   “ระบบต้องแจ้งเตือนหรือล็อกจำนวนครั้งการเยี่ยมตามโควตาที่ สปสช. กำหนด
    รายกลุ่มผู้ป่วย เพื่อกันการเยี่ยมเกินสิทธิจนเบิกไม่ได้”

   นับตามปีงบประมาณ (1 ต.ค. – 30 ก.ย.) ซึ่งเป็นรอบที่ สปสช. ใช้เบิกจ่าย. */

export const NHSO_VISIT_QUOTA = {
  curable:          { visits: 4,  note: 'เยี่ยมติดตามจนสิ้นสุดการรักษา' },
  chronic:          { visits: 6,  note: 'ผู้ป่วยเรื้อรังที่บ้าน' },
  mildDisability:   { visits: 8,  note: 'พิการระยะยาวที่ช่วยเหลือตัวเองได้บ้าง' },
  severeDisability: { visits: 12, note: 'พิการระยะยาวที่ช่วยเหลือตัวเองไม่ได้' },
  terminal:         { visits: 24, note: 'ผู้ป่วยระยะสุดท้าย (ประคับประคอง)' },
  special:          { visits: 6,  note: 'กลุ่มพิเศษตามที่สำนักอนามัยกำหนด' },
};

export const NHSO_QUOTA_FALLBACK = 6;

export const getVisitQuota = (group) =>
  NHSO_VISIT_QUOTA[group]?.visits ?? NHSO_QUOTA_FALLBACK;

/** ปีงบประมาณของวันที่ ISO (ต.ค. เป็นต้นไปนับเป็นปีงบถัดไป). */
export const fiscalYearOf = (iso = todayIsoDate()) => {
  const [y, m] = String(iso).split('-').map(Number);
  if (!y) return null;
  return m >= 10 ? y + 1 : y;
};

export const fiscalYearLabel = (fy = fiscalYearOf()) =>
  `ปีงบประมาณ ${fy + 543} (1 ต.ค. ${fy + 542} – 30 ก.ย. ${fy + 543})`;

/** นับครั้งที่เยี่ยมไปแล้วในปีงบประมาณปัจจุบันจากประวัติการเยี่ยมจริง. */
export const countVisitsInFiscalYear = (history = [], fy = fiscalYearOf()) =>
  history.filter((h) => fiscalYearOf(h.date || h.visitDate) === fy).length;

/**
 * สถานะโควตาของผู้รับบริการ 1 ราย.
 * @param {{group:string}} entry ทะเบียนผู้รับบริการ
 * @param {Array} history ประวัติการเยี่ยม (จาก getVisitHistory)
 * @returns {{quota,used,remaining,level,label,badge,message}}
 */
export const getQuotaUsage = (entry = {}, history = []) => {
  const quota = getVisitQuota(entry.group);
  const fy = fiscalYearOf();
  const used = countVisitsInFiscalYear(history, fy);
  const remaining = quota - used;
  const groupLabel = resolveGroup(entry.group)?.short || 'กลุ่มผู้รับบริการ';

  if (remaining <= 0) {
    return {
      quota, used, remaining, fiscalYear: fy, level: 'over', badge: 'red',
      label: `ใช้สิทธิครบ ${used}/${quota} ครั้ง`,
      message: `${groupLabel} ใช้โควตาการเยี่ยมตามสิทธิ สปสช. ครบ ${quota} ครั้งใน${fiscalYearLabel(fy)} แล้ว — `
        + 'การเยี่ยมเพิ่มจะเบิกไม่ได้ ต้องระบุเหตุผลเพื่อขออนุมัติเยี่ยมนอกโควตาก่อน',
    };
  }
  if (remaining <= 1) {
    return {
      quota, used, remaining, fiscalYear: fy, level: 'near', badge: 'orange',
      label: `เหลือสิทธิอีก ${remaining} ครั้ง (${used}/${quota})`,
      message: `${groupLabel} เหลือโควตาการเยี่ยมตามสิทธิ สปสช. อีก ${remaining} ครั้งใน${fiscalYearLabel(fy)}`
        + ' — วางแผนการเยี่ยมครั้งถัดไปให้คุ้มค่าที่สุด',
    };
  }
  return {
    quota, used, remaining, fiscalYear: fy, level: 'ok', badge: 'green',
    label: `ใช้สิทธิแล้ว ${used}/${quota} ครั้ง`,
    message: `เหลือโควตาการเยี่ยมตามสิทธิ สปสช. อีก ${remaining} ครั้งใน${fiscalYearLabel(fy)}`,
  };
};

/* การอนุมัติเยี่ยมนอกโควตา — ต้องมีเหตุผล และเก็บ audit ไว้เสมอ. */
const QUOTA_OVERRIDE_KEY = 'mih:homevisit:quota-override';

export const getQuotaOverride = (visitId) => readJson(QUOTA_OVERRIDE_KEY, {})[visitId] || null;

export const saveQuotaOverride = (visitId, reason) => {
  const all = readJson(QUOTA_OVERRIDE_KEY, {});
  const entry = { reason, by: HOMEVISIT_CURRENT_USER, at: formatHomeVisitDateTime() };
  writeJson(QUOTA_OVERRIDE_KEY, { ...all, [visitId]: entry });
  return entry;
};

export const QUOTA_OVERRIDE_REASONS = [
  'อาการทรุดลงเฉียบพลัน จำเป็นต้องเยี่ยมเพิ่มเพื่อความปลอดภัยของผู้ป่วย',
  'ผู้ป่วยระยะสุดท้าย ต้องดูแลจัดการอาการต่อเนื่องตามแผนประคับประคอง',
  'แผลกดทับลุกลาม ต้องทำแผลต่อเนื่องจนกว่าจะควบคุมได้',
  'ผู้ดูแลหลักเจ็บป่วย/ไม่พร้อมดูแล ต้องเยี่ยมประเมินซ้ำ',
  'เยี่ยมโดยงบประมาณของสำนักอนามัย (ไม่เบิกจาก สปสช.)',
];

/* ═══ §1.7.1.1 — คีย์ครั้งเดียว ส่ง สปสช. อัตโนมัติ ═════════════════
   “คีย์ที่เดียวใน HIS กทม. แล้วส่งข้อมูลที่ สปสช. ต้องการต่อให้อัตโนมัติ
    ผ่าน API — เลิกคีย์ซ้ำในระบบ BKK Home Care ซึ่งเป็นต้นเหตุที่ข้อมูล
    ไม่ครบจนเบิกจ่ายไม่ได้”

   ชุดข้อมูลขั้นต่ำที่ต้องส่ง (ถ้าขาดข้อใดข้อหนึ่ง สปสช. ตีกลับ). */

const NHSO_CLAIM_KEY = 'mih:homevisit:nhso-claim';

export const NHSO_REQUIRED_FIELDS = [
  { key: 'nationalId', label: 'เลขบัตรประชาชน 13 หลัก', get: (c) => c.entry?.nationalId },
  { key: 'group',      label: 'กลุ่มผู้รับบริการ',       get: (c) => c.entry?.group },
  { key: 'serviceDate', label: 'วันที่ให้บริการ',        get: (c) => c.form?.serviceDate },
  { key: 'arrivalTime', label: 'เวลาที่ถึงบ้านผู้รับบริการ', get: (c) => c.form?.arrivalTime },
  { key: 'adl',        label: 'คะแนน ADL (ดัชนีบาร์เธล)', get: (c) => (c.adlComplete ? 'ok' : '') },
  { key: 'activities', label: 'กิจกรรมการดูแลอย่างน้อย 1 รายการ', get: (c) => (Object.values(c.form?.activities || {}).some(Boolean) ? 'ok' : '') },
];

/** ตรวจความครบถ้วนก่อนส่ง — คืนรายการที่ยังขาด. */
export const checkNhsoClaimReady = (context = {}) =>
  NHSO_REQUIRED_FIELDS.filter((f) => !String(f.get(context) || '').trim());

/**
 * ส่งข้อมูลการเยี่ยมเข้าชุดข้อมูล สปสช. (mock API).
 * ผลลัพธ์ 'accepted' เมื่อข้อมูลครบ · 'incomplete' เมื่อยังขาด —
 * ไม่มีสถานะ "ต้องไปคีย์ซ้ำที่ระบบอื่น" โดยเจตนา ตามมติ คทง.4.
 */
export const sendNhsoClaim = (visitId, context = {}) => {
  const missing = checkNhsoClaimReady(context);
  const at = formatHomeVisitDateTime();
  const claim = missing.length > 0
    ? {
      status: 'incomplete',
      at,
      by: HOMEVISIT_CURRENT_USER,
      missing: missing.map((m) => m.label),
      ref: null,
    }
    : {
      status: 'accepted',
      at,
      by: HOMEVISIT_CURRENT_USER,
      missing: [],
      ref: `NHSO-HHC-${String(visitId || '').replace(/[^0-9A-Za-z]/g, '').slice(-6).toUpperCase() || '000000'}-${fiscalYearOf()}`,
    };
  const all = readJson(NHSO_CLAIM_KEY, {});
  writeJson(NHSO_CLAIM_KEY, { ...all, [visitId]: claim });
  return claim;
};

export const getNhsoClaim = (visitId) => readJson(NHSO_CLAIM_KEY, {})[visitId] || null;

/* ═══ §1.1.1.20 — ค้นเลขบัตร 13 หลักจากฐานข้อมูลกลางก่อนสร้างประวัติ ═
   “ก่อนสร้างประวัติใหม่ ระบบต้องบังคับค้นด้วยเลขบัตรประชาชน 13 หลัก
    จากฐานข้อมูลกลางก่อน เพื่อกันการสร้าง HN ซ้ำซ้อน” */

/** ตรวจ checksum เลขประจำตัวประชาชนไทย (หลักที่ 13). */
export const isValidThaiNationalId = (value) => {
  const id = String(value || '').replace(/\D/g, '');
  if (id.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i += 1) sum += Number(id[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
};

export const formatNationalId = (value) => {
  const id = String(value || '').replace(/\D/g, '').slice(0, 13);
  const parts = [id.slice(0, 1), id.slice(1, 5), id.slice(5, 10), id.slice(10, 12), id.slice(12, 13)];
  return parts.filter(Boolean).join('-');
};

/* ฐานข้อมูลกลาง (mock) — มีทั้งคนที่มี HN แล้วและคนที่ยังไม่เคยมีประวัติ
   ในศูนย์นี้ เพื่อให้เห็นทั้ง 3 ผลลัพธ์ของการค้น. */
const CENTRAL_PERSON_DB = [
  { nationalId: '1100400512341', hn: '67-00005', name: 'สุดา ปลอดโปร่ง', age: 67, gender: 'หญิง', district: 'เขตคลองเตย', address: '48/12 ซอยอาจณรงค์ 5 แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110' },
  { nationalId: '3100600298764', hn: '67-00012', name: 'วิชัย รุ่งเรือง', age: 60, gender: 'ชาย', district: 'เขตวัฒนา', address: '109 ซอยสุขุมวิท 55 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110' },
  { nationalId: '1102700884512', hn: '67-00018', name: 'ธีรเดช อัครพงศ์', age: 55, gender: 'ชาย', district: 'เขตพระโขนง', address: '77/3 ซอยสุขุมวิท 71 แขวงพระโขนงเหนือ เขตพระโขนง กรุงเทพมหานคร 10260' },
  { nationalId: '1409901234560', hn: '67-00027', name: 'จิราพร มณีโชติ', age: 23, gender: 'หญิง', district: 'เขตคลองเตย', address: '15/44 ซอยไผ่สิงโต แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110' },
  /* มีในฐานข้อมูลกลาง แต่ยังไม่เคยมีประวัติที่ศูนย์นี้ → สร้าง HN ใหม่ได้ */
  { nationalId: '3101700456788', hn: '', name: 'บุญช่วย ศรีสุข', age: 72, gender: 'ชาย', district: 'เขตคลองเตย', address: '120/5 ซอยอาจณรงค์ 1 แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110' },
  { nationalId: '1102002233443', hn: '', name: 'มาลี ใจงาม', age: 64, gender: 'หญิง', district: 'เขตวัฒนา', address: '77 ซอยสุขุมวิท 49 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110' },
];

export const CENTRAL_DB_LABEL = 'ฐานข้อมูลประชากรกลาง (กรมการปกครอง · ทะเบียนผู้ป่วย กทม.)';

/**
 * ค้นด้วยเลขบัตร 13 หลัก.
 * @returns {{state:'invalid'|'notFound'|'found', person?:object, message:string}}
 */
export const searchCentralPerson = (nationalId) => {
  const id = String(nationalId || '').replace(/\D/g, '');
  if (id.length !== 13) {
    return { state: 'invalid', message: 'กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลักก่อนค้นหา' };
  }
  if (!isValidThaiNationalId(id)) {
    return { state: 'invalid', message: 'เลขบัตรประชาชนไม่ถูกต้อง (หลักตรวจสอบไม่ตรง) — ตรวจสอบตัวเลขอีกครั้ง' };
  }
  const person = CENTRAL_PERSON_DB.find((p) => p.nationalId === id);
  if (!person) {
    return {
      state: 'notFound',
      message: `ไม่พบเลขบัตรนี้ใน${CENTRAL_DB_LABEL} — บันทึกเป็นผู้รับบริการรายใหม่ได้ `
        + 'โดยต้องกรอกข้อมูลด้วยตนเองหรืออ่านจากบัตรประชาชน',
    };
  }
  return {
    state: 'found',
    person,
    message: person.hn
      ? `พบประวัติเดิมในระบบ — ${person.name} (HN ${person.hn}) ระบบเติมข้อมูลจากฐานข้อมูลกลางให้แล้ว ไม่ต้องสร้าง HN ใหม่`
      : `พบข้อมูลใน${CENTRAL_DB_LABEL} — ${person.name} ยังไม่เคยมีประวัติที่${HOMEVISIT_CENTER} ระบบเติมข้อมูลให้แล้ว`,
  };
};

/* ═══ §1.18.7 — “แบบลงทะเบียน HHC” แทน “แบบส่งต่อ” ═════════════════
   รองรับ 3 ทางที่เคสเข้าระบบ + บันทึกหน้างานแบบ real-time บน Tablet. */

export const HHC_INTAKE_ROUTES = [
  {
    value: 'hospital',
    label: 'รับเคสจากโรงพยาบาล',
    description: 'โรงพยาบาลจำหน่ายผู้ป่วยพร้อมแผนการดูแลต่อเนื่องที่บ้าน (D/C Plan)',
    sources: ['hhc', 'hv'],
    icon: 'local_hospital',
    badge: 'purple',
  },
  {
    value: 'centerFound',
    label: 'ศูนย์บริการสาธารณสุขพบเอง',
    description: 'เจ้าหน้าที่หรือ อสส. พบผู้ป่วยระหว่างสำรวจชุมชนหรือรับแจ้งจากครอบครัว',
    sources: ['centerFound', 'healthDeskHv', 'motherChildHv'],
    icon: 'diversity_3',
    badge: 'teal',
  },
  {
    value: 'centerTransfer',
    label: 'ส่งต่อระหว่างศูนย์บริการสาธารณสุข',
    description: 'ผู้ป่วยย้ายที่อยู่ข้ามพื้นที่รับผิดชอบ ศูนย์เดิมส่งต่อทะเบียนและประวัติมาให้',
    sources: ['centerTransfer'],
    icon: 'swap_horiz',
    badge: 'indigo',
  },
];

export const resolveIntakeRoute = (value) =>
  HHC_INTAKE_ROUTES.find((r) => r.value === value) || null;

/** เดา “ทางรับเคส” จากแหล่งรับเข้าเดิม เพื่อให้ข้อมูลเก่าแสดงผลได้ทันที. */
export const intakeRouteOfSource = (source) =>
  HHC_INTAKE_ROUTES.find((r) => r.sources.includes(source))?.value || 'centerFound';

export const HHC_FIELD_RECORDING_NOTE =
  'แบบลงทะเบียน HHC นี้บันทึกได้ทันที ณ จุดเกิดเหตุบน Tablet/Mobile — '
  + 'ไม่ต้องจดกระดาษแล้วกลับมาคีย์ที่ศูนย์ฯ (มติ คทง.4 ต่อ TOR §1.18.7)';

/* ═══ §2.1.6 — ลำดับการบันทึก ชุมชน → สำรวจบ้าน → บุคคล → งานเยี่ยม ═
   “ลำดับการบันทึกต้องเริ่มจากภาพใหญ่ไปเล็ก … ไม่ใช่เริ่มที่งานเยี่ยมบ้าน
    ซึ่งทำให้ข้อมูลไม่ครบ” */

/* ทะเบียนชุมชนที่สำรวจแล้ว (โมดูล Community §2.1 เป็นของอีกทีม — ที่นี่
   อ่านสถานะมาแสดงและใช้เป็นเงื่อนไข ไม่ได้เป็นเจ้าของข้อมูล). */
const COMMUNITY_SURVEY = {
  'ชุมชนล็อค 1-2-3':        { surveyedAt: '2568-11-14', houses: 412, by: 'ทีมสำรวจชุมชน ศบส.41' },
  'ชุมชนคลองเตยล็อค 4-5-6': { surveyedAt: '2568-12-02', houses: 388, by: 'ทีมสำรวจชุมชน ศบส.41' },
  'ชุมชนพัฒนาใหม่':          { surveyedAt: '2569-01-21', houses: 174, by: 'ทีมสำรวจชุมชน ศบส.41' },
  'ชุมชนซอยทองหล่อ 20':      { surveyedAt: '2569-02-08', houses: 96,  by: 'ทีมสำรวจชุมชน ศบส.15' },
  'ชุมชนริมคลองพระโขนง':     { surveyedAt: '2569-03-19', houses: 233, by: 'ทีมสำรวจชุมชน ศบส.21' },
  'ชุมชนสวนอ้อย':            { surveyedAt: '2569-04-02', houses: 118, by: 'ทีมสำรวจชุมชน ศบส.15' },
};

/* แบบสำรวจบ้าน (Family Folder) รายหลัง — key = HN ของผู้รับบริการหลัก. */
const HOUSE_SURVEY = {
  '67-00005': { folderNo: 'FF-41-0412', surveyedAt: '2568-11-20', members: 4, by: 'พว.ศิริพร เยี่ยมสุข' },
  '67-00012': { folderNo: 'FF-15-0096', surveyedAt: '2569-02-10', members: 2, by: 'พว.กาญจนา ถึงบ้าน' },
  '67-00018': { folderNo: 'FF-21-0233', surveyedAt: '2569-03-25', members: 3, by: 'นพ.ธนวัฒน์ เมตตา' },
  '67-00027': { folderNo: 'FF-41-0174', surveyedAt: '2569-07-29', members: 3, by: 'พว.ดวงพร ห่วงใย' },
  '67-00021': { folderNo: 'FF-41-0388', surveyedAt: '2568-09-10', members: 5, by: 'พว.ศิริพร เยี่ยมสุข' },
};

export const getCommunitySurvey = (community) => COMMUNITY_SURVEY[community] || null;
export const getHouseSurvey = (hn) => HOUSE_SURVEY[hn] || null;

/**
 * สถานะลูกโซ่การบันทึกของผู้รับบริการ 1 ราย (ภาพใหญ่ → เล็ก).
 * @returns {Array<{key,label,done,detail,owner}>}
 */
export const getRecordChain = (entry = {}) => {
  const community = getCommunitySurvey(entry.community);
  const house = getHouseSurvey(entry.hn);
  return [
    {
      key: 'community',
      label: 'ข้อมูลชุมชน',
      owner: 'โมดูลงานชุมชน (§2.1)',
      done: !!community,
      detail: community
        ? `${entry.community} — สำรวจเมื่อ ${community.surveyedAt} · ${community.houses} หลังคาเรือน`
        : `ยังไม่มีข้อมูลชุมชน "${entry.community || '—'}" ในทะเบียนชุมชน`,
    },
    {
      key: 'house',
      label: 'สำรวจบ้าน (Family Folder)',
      owner: 'งานเยี่ยมบ้าน + งานชุมชน',
      done: !!house,
      detail: house
        ? `${house.folderNo} — สำรวจเมื่อ ${house.surveyedAt} · สมาชิก ${house.members} คน`
        : 'ยังไม่มีแบบสำรวจบ้าน — บันทึก Family Folder ในขั้นตอนที่ 7 ของการเยี่ยมได้',
    },
    {
      key: 'person',
      label: 'ข้อมูลบุคคล (ทะเบียนเยี่ยมบ้าน)',
      owner: 'งานเยี่ยมบ้าน (§1.10.12.1)',
      done: !!entry.hn && !!entry.group,
      detail: entry.hn ? `HN ${entry.hn} · ${resolveGroup(entry.group)?.short || 'ยังไม่ระบุกลุ่ม'}` : 'ยังไม่ได้ลงทะเบียนผู้รับบริการ',
    },
    {
      key: 'visit',
      label: 'งานเยี่ยมบ้าน',
      owner: 'งานเยี่ยมบ้าน (§1.18)',
      done: (entry.visitCount || 0) > 0,
      detail: (entry.visitCount || 0) > 0
        ? `เยี่ยมแล้ว ${entry.visitCount} ครั้ง · ครั้งล่าสุด ${entry.lastVisitDate || '—'}`
        : 'ยังไม่เคยบันทึกการเยี่ยม',
    },
  ];
};

/** ขั้นที่ยังไม่ครบ "ก่อนหน้า" งานเยี่ยม — ใช้เตือนก่อนเริ่มบันทึกการเยี่ยม. */
export const getChainGaps = (entry = {}) =>
  getRecordChain(entry).filter((s) => s.key !== 'visit' && !s.done);

/* ═══ §2.2.2 — อสส. เห็นเฉพาะเคสที่ได้รับมอบหมาย ═══════════════════ */

const ROLE_KEY = 'mih:homevisit:user-role';

export const HOMEVISIT_ROLES = [
  {
    value: 'staff',
    label: 'เจ้าหน้าที่ศูนย์บริการฯ',
    user: HOMEVISIT_CURRENT_USER,
    description: `เห็นทุกเคสในความรับผิดชอบของ${HOMEVISIT_CENTER}`,
  },
  {
    value: 'volunteer',
    label: 'อสส. ประจำชุมชน',
    user: 'อสส.บุญมี รักชุมชน',
    description: 'เห็นและบันทึกได้เฉพาะเคสที่ได้รับมอบหมาย และไม่เห็นเคสข้อมูลลับ',
  },
];

export const resolveRole = (value) =>
  HOMEVISIT_ROLES.find((r) => r.value === value) || HOMEVISIT_ROLES[0];

export const getHomeVisitRole = () => readJson(ROLE_KEY, 'staff');
export const setHomeVisitRole = (value) => writeJson(ROLE_KEY, value === 'volunteer' ? 'volunteer' : 'staff');

/* เคสที่มอบหมายให้ อสส. คนนี้ — ในระบบจริงมาจากการมอบหมายรายเคส
   ที่นี่ผูกกับชุมชนที่ อสส. ดูแล. */
export const VOLUNTEER_COMMUNITIES = ['ชุมชนล็อค 1-2-3', 'ชุมชนคลองเตยล็อค 4-5-6'];

export const isAssignedToVolunteer = (row = {}) =>
  !row.confidential && VOLUNTEER_COMMUNITIES.includes(row.community);

/** กรองรายการตามบทบาทผู้ใช้ปัจจุบัน. */
export const filterRowsByRole = (rows = [], role = getHomeVisitRole()) =>
  (role === 'volunteer' ? rows.filter(isAssignedToVolunteer) : rows);

export const volunteerScopeNote = () =>
  `บัญชี อสส. เห็นเฉพาะเคสที่ได้รับมอบหมาย (${VOLUNTEER_COMMUNITIES.join(' · ')}) `
  + 'และไม่เห็นเคสที่ทำเครื่องหมายข้อมูลลับ — รายการที่ไม่ได้รับมอบหมายถูกซ่อน ไม่ใช่ “ไม่มีข้อมูล” (มติ คทง.4 ต่อ TOR §2.2.2)';

/* ═══ §1.18.2 — ขอบเขตพื้นที่รับผิดชอบ + ปักหมุดอัตโนมัติ ═══════════ */

/** ขอบเขตพื้นที่รับผิดชอบของศูนย์ฯ (mock polygon รอบพิกัดศูนย์). */
export const SERVICE_AREA = {
  label: `พื้นที่รับผิดชอบ${HOMEVISIT_CENTER}`,
  radiusMeters: 3200,
  center: HOMEVISIT_CENTER_LOCATION,
  polygon: [
    { lat: 13.7902, lng: 100.4762 },
    { lat: 13.7880, lng: 100.5312 },
    { lat: 13.7560, lng: 100.5420 },
    { lat: 13.7402, lng: 100.5210 },
    { lat: 13.7438, lng: 100.4790 },
    { lat: 13.7688, lng: 100.4660 },
  ],
};

/** ray-casting: จุดอยู่ในขอบเขตพื้นที่รับผิดชอบหรือไม่. */
export const isInsideServiceArea = (point, polygon = SERVICE_AREA.polygon) => {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects = (a.lat > point.lat) !== (b.lat > point.lat)
      && point.lng < ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lng;
    if (intersects) inside = !inside;
  }
  return inside;
};

/* geocode จำลอง: กระจายหมุดรอบศูนย์ฯ แบบคงที่ต่อที่อยู่หนึ่ง ๆ เพื่อให้
   กดปักหมุดอัตโนมัติซ้ำแล้วได้ตำแหน่งเดิมทุกครั้ง (ไม่ใช่ค่าสุ่ม). */
const hashOf = (text) => {
  let h = 0;
  const s = String(text || '');
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return h;
};

/**
 * §1.18.2 “ปักหมุด GPS อัตโนมัติ … แทนการวาดแผนที่ด้วยมือ”
 * @returns {{lat,lng,pinSaved:true,auto:true,accuracyMeters:number}}
 */
export const autoPinFromAddress = (address, community = '') => {
  const h = hashOf(`${address}|${community}`);
  const lat = SERVICE_AREA.center.lat + (((h % 197) - 98) / 10000);
  const lng = SERVICE_AREA.center.lng + ((((h / 197) | 0) % 197 - 98) / 10000);
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    pinSaved: true,
    auto: true,
    accuracyMeters: 25 + (h % 40),
  };
};

/* ═══ §2.4.1 — ข้อมูลดิบไป Pivot/Export + แยกนับ Person vs Visit ════ */

/**
 * แยกนับ “รายบุคคล” ออกจาก “การให้บริการ” ให้ชัด — ตัวเลขที่ผู้บริหาร
 * ศูนย์ฯ ใช้รายงานต่างกันคนละความหมาย และเดิมถูกนับปนกัน.
 */
export const summarizePersonVsVisit = (rows = []) => {
  const persons = new Set();
  const byGroup = new Map();
  let visits = 0;

  rows.forEach((r) => {
    const key = r.hn || r.id;
    persons.add(key);
    const count = Number(r.visitCount || 0);
    visits += count;
    const g = r.group || 'unknown';
    const bucket = byGroup.get(g) || { group: g, persons: new Set(), visits: 0 };
    bucket.persons.add(key);
    bucket.visits += count;
    byGroup.set(g, bucket);
  });

  return {
    persons: persons.size,
    visits,
    avgVisitsPerPerson: persons.size ? Number((visits / persons.size).toFixed(1)) : 0,
    byGroup: [...byGroup.values()].map((b) => ({
      group: b.group,
      label: resolveGroup(b.group)?.short || b.group,
      persons: b.persons.size,
      visits: b.visits,
    })).sort((a, b) => b.visits - a.visits),
  };
};

/** คอลัมน์ข้อมูลดิบสำหรับ export — ระดับ 1 แถว = 1 รายบุคคล. */
export const RAW_EXPORT_COLUMNS = [
  { key: 'hn', label: 'HN' },
  { key: 'nationalId', label: 'เลขบัตรประชาชน' },
  { key: 'name', label: 'ชื่อ-นามสกุล' },
  { key: 'group', label: 'กลุ่มผู้รับบริการ', get: (r) => resolveGroup(r.group)?.short || r.group },
  { key: 'district', label: 'เขต' },
  { key: 'community', label: 'ชุมชน' },
  { key: 'responsible', label: 'ผู้รับผิดชอบ' },
  { key: 'registeredDate', label: 'วันที่ลงทะเบียน' },
  { key: 'lastVisitDate', label: 'วันที่เยี่ยมล่าสุด' },
  { key: 'visitCount', label: 'จำนวนครั้งที่เยี่ยม (Visit)' },
  { key: 'quota', label: 'โควตา สปสช. (ครั้ง/ปีงบ)', get: (r) => getVisitQuota(r.group) },
];

const csvCell = (value) => {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (rows = [], columns = RAW_EXPORT_COLUMNS) => {
  const header = columns.map((c) => csvCell(c.label)).join(',');
  const body = rows.map((r) => columns
    .map((c) => csvCell(c.get ? c.get(r) : r[c.key]))
    .join(','));
  return [header, ...body].join('\n');
};

/** ดาวน์โหลด CSV (BOM นำหน้าเพื่อให้ Excel อ่านภาษาไทยถูก). */
export const downloadCsv = (filename, csv) => {
  if (typeof document === 'undefined') return;
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
