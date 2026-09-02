/* งานวางแผนครอบครัว (Family Planning clinic) — mock data + domain logic.

   Sources
   ───────
   • TOR §1.10.8 "งานวางแผนครอบครัว" (docs/tor-checklist.html), leaves
     1.10.8.1 – 1.10.8.7.
   • คู่มือระบบคลินิกส่งเสริมสุขภาพ (วางแผนครอบครัว), บทที่ 2 —
     ~/MIH-Docs-Vault/คู่มือระบบงาน/. The legacy HCIS screens this module
     replaces are:
       §2.1.1.1 บันทึกวางแผนครอบครัว        → FamilyPlanningSteps S1/S2/S3
       §2.1.2  บันทึกการตรวจมะเร็งเต้านม     → S4 tab "มะเร็งเต้านม"
       §2.1.3  บันทึกการตรวจภายใน/มะเร็งปากมดลูก → S4 tab "ตรวจภายใน"
       §2.1.4  บันทึกการดูแลมารดาหลังคลอด    → S5 tab "มารดา"
       §2.1.5  บันทึกการดูแลเด็กหลังคลอด     → S5 tab "เด็กหลังคลอด"
       §2.2.1–2.2.7 รายงานทะเบียน 7 ฉบับ     → registry filter chips
     Deliberately OUT of scope (not a TOR 1.10.8 leaf): §2.1.6 คลินิก
     สุขภาพสตรีวัยทอง.

   Session-scoped persistence (sessionStorage) follows the same contract as
   `mentalHealthClinic.js` / `ancVisits.js`: real behaviour for ลงทะเบียน /
   แก้ไข / ยกเลิก / ส่งตรวจ / พิมพ์ without standing up a backend. */

/* ── sessionStorage plumbing ──────────────────────────────────────── */
const canUseSession = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const readJson = (key, fallback) => {
  if (!canUseSession()) return fallback;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!canUseSession()) return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
};

const K = {
  checkedIn: 'mih:fp:checked-in',
  queueCancelled: 'mih:fp:queue-cancelled',
  registry: 'mih:fp:registry-overlay',
  registryRun: 'mih:fp:registry-run',
  visits: 'mih:fp:visit-records',
  drafts: 'mih:fp:drafts',
  rights: 'mih:fp:rights',
  printLog: 'mih:fp:print-log',
};

/* ── Date helpers (Thai Buddhist display) ─────────────────────────── */
const TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const FP_THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export const formatFpDate = (v) => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${TH_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
};

export const formatFpDateTime = (v) => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatFpDate(d)} ${hh}:${mm} น.`;
};

export const todayIso = () => new Date().toISOString().slice(0, 10);

/* ── ผู้บันทึก (mock current user) + สิทธิข้อมูลลับ §1.4.2 ────────────
   วิธีคุมกำเนิด / ผลตรวจภายใน / ผลตรวจมะเร็งปากมดลูก เป็นข้อมูลอ่อนไหว —
   ผู้ใช้ที่ไม่มีสิทธิคลินิกวางแผนครอบครัวเห็นเฉพาะรายการ ไม่เห็นรายละเอียด
   (pattern เดียวกับ ConfidentialMask ของงานสุขภาพจิต). */
export const FP_CURRENT_USER = 'พว.ศิริพร วงศ์สุวรรณ';

export const FP_STAFF = [
  'พว.ศิริพร วงศ์สุวรรณ',
  'พว.อรทัย เกษมสุข',
  'พว.ชุติมา ธารทอง',
];

export const FP_DOCTORS = [
  'พญ.ปริยากร เจริญสุข',
  'พญ.สมหญิง รักษ์ดี',
  'นพ.ธนากร อินทรา',
  'พญ.วิภา สุขศรี',
];

export const hasFamilyPlanningRights = () => readJson(K.rights, 'granted') === 'granted';
export const setFamilyPlanningRights = (granted) => writeJson(K.rights, granted ? 'granted' : 'denied');

/* ── §2.1.1.1 ข้อ 3 — ประเภทผู้รับบริการ (Radio Box, 5 ตัวเลือก) ────── */
export const FP_CLIENT_TYPES = [
  { value: 'new',            label: 'รายใหม่ (ไม่เคยรับบริการวางแผนครอบครัว)' },
  { value: 'oldContinue',    label: 'รายเก่า รับบริการวิธีเดิมต่อเนื่อง' },
  { value: 'oldChange',      label: 'รายเก่า เปลี่ยนวิธีคุมกำเนิด' },
  { value: 'oldReturn',      label: 'รายเก่า ขาดนัด/กลับมารับบริการใหม่' },
  { value: 'oldTransfer',    label: 'รายเก่า ย้ายมาจากสถานบริการอื่น' },
];

/* มติ คทง.2 ครั้งที่ 5 (9 ต.ค. 68): เลือกเจตนาของวิสิตก่อนแสดงแบบบันทึก
   แต่ละบริการเป็นอิสระ จึงเลือกพร้อมกันได้ เช่น ตรวจหลังคลอดและรับบริการ
   วางแผนครอบครัวในครั้งเดียวกัน. */
export const FP_PRIMARY_SERVICE_TYPES = [
  { key: 'familyPlanning', label: 'งานวางแผนครอบครัว', icon: 'family_restroom' },
  { key: 'postpartum', label: 'งานตรวจหลังคลอด', icon: 'child_care' },
  { key: 'breastScreening', label: 'งานตรวจคัดกรองมะเร็งเต้านม', icon: 'breastfeeding' },
  { key: 'cervicalScreening', label: 'งานตรวจคัดกรองมะเร็งปากมดลูก', icon: 'gynecology' },
];

export const resolveFpClientType = (v) =>
  FP_CLIENT_TYPES.find((t) => t.value === v)?.label || '—';

/* ── §2.1.1.1 ข้อ 4 — วิธีคุมกำเนิดครั้งสุดท้าย ─────────────────────
   ข้อ 4.1 ของคู่มือ: เลือก "อื่นๆ" → ช่อง "ระบุ" จะถูกเปิดให้คีย์ข้อมูล. */
export const FP_LAST_METHODS = [
  { value: 'never',     label: 'ไม่เคยคุมกำเนิด' },
  { value: 'iud',       label: 'ห่วงอนามัย' },
  { value: 'pill',      label: 'ยาเม็ดคุมกำเนิด' },
  { value: 'injection', label: 'ยาฉีดคุมกำเนิด' },
  { value: 'condom',    label: 'ถุงยางอนามัย' },
  { value: 'other',     label: 'อื่นๆ (ระบุ)' },
];

export const resolveFpLastMethod = (v) =>
  FP_LAST_METHODS.find((m) => m.value === v)?.label || '—';

/* ── §2.1.1.1 ข้อ 5 — บริการที่ได้รับ ────────────────────────────── */
export const FP_SERVICES = [
  { key: 'pill',      label: 'ยาเม็ดคุมกำเนิด',  tone: 'blue',   hormonal: true  },
  { key: 'injection', label: 'ยาฉีดคุมกำเนิด',   tone: 'purple', hormonal: true  },
  { key: 'iud',       label: 'ใส่ห่วงอนามัย',     tone: 'teal',   hormonal: false },
  { key: 'implant',   label: 'ยาฝังคุมกำเนิด',    tone: 'indigo', hormonal: true  },
  { key: 'condom',    label: 'ถุงยางอนามัย',      tone: 'green',  hormonal: false },
  { key: 'vasectomy', label: 'ทำหมันชาย',         tone: 'grey',   hormonal: false },
  { key: 'tubal',     label: 'ทำหมันหญิง',        tone: 'orange', hormonal: false },
];

export const resolveFpService = (key) => FP_SERVICES.find((s) => s.key === key) || null;

export const summarizeFpServices = (keys = []) =>
  keys.map((k) => resolveFpService(k)?.label).filter(Boolean).join(' · ') || '—';

/** วิธีที่มีฮอร์โมน — ห้ามให้บริการเมื่อผลทดสอบการตั้งครรภ์ = ตั้งครรภ์
    (ส่งฝากครรภ์แทน) และห้ามจ่ายเมื่อคัดกรอง 11 ข้อ ติด "มี" แม้ข้อเดียว. */
export const FP_HORMONAL_SERVICE_KEYS = FP_SERVICES.filter((s) => s.hormonal).map((s) => s.key);

/** บริการที่ยังทำได้แม้ติดธงแดง — คู่มือ p.2-5 ห้ามเฉพาะการจ่ายยา
    (ยาเม็ด/ยาฉีด/ยาฝัง = วิธีที่มีฮอร์โมน); ถุงยางอนามัย ใส่ห่วงอนามัย
    ทำหมันชาย/หญิง และการให้คำปรึกษายังทำได้. */
export const FP_SERVICES_ALLOWED_WHEN_FLAGGED = ['condom', 'iud', 'vasectomy', 'tubal'];

/* ── §2.2.1–2.2.7 รายงานทะเบียน 7 ฉบับ → filter chips ในหน้าทะเบียน ──
   คู่มือแยกเป็น 7 รายงาน (ยาเม็ด / ยาฉีด / ใส่ห่วง / ถอดห่วง / ฝังยา /
   ถอดยาฝัง / จ่ายยาคุม) — ที่นี่ยุบเป็นมุมมองกรองของทะเบียนเดียว
   (partial coverage โดยเจตนา — แจ้งไว้ใน manifest). */
export const FP_REGISTRY_VIEWS = [
  { value: 'all',           label: 'ทุกบริการ' },
  { value: 'pill',          label: 'ทะเบียนยาเม็ดคุมกำเนิด' },
  { value: 'injection',     label: 'ทะเบียนยาฉีดคุมกำเนิด' },
  { value: 'iudInsert',     label: 'ทะเบียนใส่ห่วงอนามัย' },
  { value: 'iudRemove',     label: 'ทะเบียนถอดห่วงอนามัย' },
  { value: 'implantInsert', label: 'ทะเบียนฝังยาคุมกำเนิด' },
  { value: 'implantRemove', label: 'ทะเบียนถอดยาฝังคุมกำเนิด' },
  { value: 'dispensed',     label: 'ทะเบียนจ่ายยาคุมกำเนิด' },
];

/** Predicate ของแต่ละมุมมองรายงาน — services = บริการที่ได้รับ,
    removals = การถอด (ห่วง/ยาฝัง), dispensed = มีการจ่ายยาคุมจริง. */
export const matchFpRegistryView = (row, view) => {
  if (!view || view === 'all') return true;
  const services = row.services || [];
  const removals = row.removals || [];
  switch (view) {
    case 'pill':          return services.includes('pill');
    case 'injection':     return services.includes('injection');
    case 'iudInsert':     return services.includes('iud');
    case 'iudRemove':     return removals.includes('iud');
    case 'implantInsert': return services.includes('implant');
    case 'implantRemove': return removals.includes('implant');
    case 'dispensed':     return !!row.dispensed;
    default:              return true;
  }
};

export const FP_REMOVAL_OPTIONS = [
  { key: 'iud',     label: 'ถอดห่วงอนามัย' },
  { key: 'implant', label: 'ถอดยาฝังคุมกำเนิด' },
];

/* ── §2.1.1.1 ข้อ 6 — ผลทดสอบการตั้งครรภ์ ────────────────────────── */
export const FP_PREGNANCY_TEST_OPTIONS = [
  { value: 'notTested',    label: 'ไม่ได้ตรวจ' },
  { value: 'negative',     label: 'ไม่ตั้งครรภ์' },
  { value: 'positive',     label: 'ตั้งครรภ์' },
];

/* ── §2.1.1.1 Tab "ประวัติการเจ็บป่วยและตรวจร่างกาย" — คัดกรอง 11 ข้อ ──
   กติกาความปลอดภัย (คู่มือ p.2-5 หมายเหตุ 1–2):
     1. ตอบ "ไม่มี" ทุกข้อ → จ่ายยาได้
     2. ตอบ "มี" แม้ข้อเดียว → ห้ามจ่ายยาเด็ดขาด ให้ส่งไปปรึกษาแพทย์ก่อน

   ตัวคำถาม 11 ข้อในคู่มือเป็นภาพสแกน (pdftotext ดึงข้อความไม่ได้) —
   รายการด้านล่างเรียบเรียงจากแบบคัดกรองข้อห้ามใช้ยาเม็ดคุมกำเนิดมาตรฐาน
   ของกรมอนามัย/WHO MEC ที่ใช้ในคลินิกวางแผนครอบครัวของ ศบส. กทม.
   (ACHES danger signs + ข้อห้ามหลัก) หากได้ต้นฉบับข้อความจริงเมื่อไร
   ให้แทนที่ list นี้ทั้งชุดโดยไม่ต้องแก้ logic — logic อ่านจาก key เท่านั้น. */
export const FP_SCREENING_ITEMS = [
  { key: 'q1',  label: '1. ปวดศีรษะรุนแรง / ไมเกรนที่มีอาการนำทางสายตา' },
  { key: 'q2',  label: '2. ตาพร่ามัว มองเห็นไม่ชัด หรือสูญเสียการมองเห็นชั่วคราว' },
  { key: 'q3',  label: '3. เจ็บแน่นหน้าอก หายใจลำบาก หรือไอเป็นเลือด' },
  { key: 'q4',  label: '4. ปวดน่อง ขาบวม แดง ร้อน (สงสัยหลอดเลือดดำอักเสบ)' },
  { key: 'q5',  label: '5. ความดันโลหิตสูง ตั้งแต่ 140/90 มม.ปรอทขึ้นไป' },
  { key: 'q6',  label: '6. ตัวเหลือง ตาเหลือง หรือมีประวัติโรคตับ/ถุงน้ำดี' },
  { key: 'q7',  label: '7. คลำพบก้อนที่เต้านม หรือมีเลือด/น้ำเหลืองออกจากหัวนม' },
  { key: 'q8',  label: '8. เลือดออกผิดปกติทางช่องคลอดโดยไม่ทราบสาเหตุ' },
  { key: 'q9',  label: '9. สงสัยตั้งครรภ์ / ประจำเดือนขาดโดยไม่ทราบสาเหตุ' },
  { key: 'q10', label: '10. เป็นเบาหวาน โรคหัวใจ โรคไต หรือโรคหลอดเลือดสมอง' },
  { key: 'q11', label: '11. สูบบุหรี่จัด (≥ 15 มวน/วัน) และอายุตั้งแต่ 35 ปีขึ้นไป' },
];

export const FP_SCREENING_ANSWERS = [
  { value: 'no',  label: 'ไม่มี' },
  { value: 'yes', label: 'มี' },
];

/** คู่มือ p.2-5 — คืนธงแดงพร้อมชื่อข้อที่ติด เพื่อให้ UI บอกได้ว่าติดข้อไหน
    ไม่ใช่แค่จำนวน. `answeredAll` ใช้ gate การบันทึก (ต้องตอบครบ 11 ข้อ). */
export const interpretFpScreening = (answers) => {
  const flagged = FP_SCREENING_ITEMS.filter((q) => answers?.[q.key] === 'yes');
  const answered = FP_SCREENING_ITEMS.filter((q) => !!answers?.[q.key]);
  return {
    flagged: flagged.map((q) => q.label),
    flaggedKeys: flagged.map((q) => q.key),
    answeredCount: answered.length,
    answeredAll: answered.length === FP_SCREENING_ITEMS.length,
    mustReferDoctor: flagged.length > 0,
    canDispense: answered.length === FP_SCREENING_ITEMS.length && flagged.length === 0,
  };
};

/* ── §2.1.1.1 หน้า 2 — ผลตรวจจากห้องซักประวัติ + dipstick ───────────
   คู่มือ p.2-6 ข้อ 2: "ความดันโลหิต / น้ำหนัก / ส่วนสูง ... จะได้ข้อมูล
   มาจากหน้าซักประวัติ ยกเว้นแต่ว่าได้มีการเปลี่ยนแปลงข้อมูลจึงจะมาใส่
   ข้อมูลใหม่ในหน้านี้" → แสดง read-only + ปุ่ม "แก้ไขจากห้องตรวจ". */
const DIPSTICK = ['Negative', 'Trace', '1+', '2+', '3+', '4+'];
export const FP_URINE_SUGAR_OPTIONS = DIPSTICK;
export const FP_URINE_ALBUMIN_OPTIONS = DIPSTICK;

/** ผลซักประวัติ/สัญญาณชีพจากห้องซักประวัติ (triage) — read-only ใน S1. */
export const FP_TRIAGE_VITALS = {
  '67-00023': { bp: '118/76', pulse: 78, temp: 36.8, weight: 54, height: 158, recordedBy: 'พว.อรทัย เกษมสุข', recordedAt: '2026-08-08T08:12:00' },
  '67-00015': { bp: '142/92', pulse: 84, temp: 36.6, weight: 68, height: 155, recordedBy: 'พว.อรทัย เกษมสุข', recordedAt: '2026-08-08T08:26:00' },
  '67-00013': { bp: '110/70', pulse: 72, temp: 36.5, weight: 48, height: 160, recordedBy: 'พว.ชุติมา ธารทอง', recordedAt: '2026-08-08T08:41:00' },
  '67-00027': { bp: '108/68', pulse: 80, temp: 36.7, weight: 51, height: 157, recordedBy: 'พว.ชุติมา ธารทอง', recordedAt: '2026-08-08T09:03:00' },
  '67-00021': { bp: '126/80', pulse: 76, temp: 36.6, weight: 62, height: 154, recordedBy: 'พว.อรทัย เกษมสุข', recordedAt: '2026-08-08T09:18:00' },
  '67-00007': { bp: '132/84', pulse: 82, temp: 36.9, weight: 65, height: 156, recordedBy: 'พว.อรทัย เกษมสุข', recordedAt: '2026-08-08T09:35:00' },
  '67-00019': { bp: '112/72', pulse: 74, temp: 36.5, weight: 53, height: 162, recordedBy: 'พว.ชุติมา ธารทอง', recordedAt: '2026-08-08T09:52:00' },
  '67-00011': { bp: '138/88', pulse: 88, temp: 36.8, weight: 71, height: 153, recordedBy: 'พว.ชุติมา ธารทอง', recordedAt: '2026-08-08T10:07:00' },
};

export const getFpTriageVitals = (hn) => FP_TRIAGE_VITALS[hn] || null;

/* ── §2.1.2 บันทึกการตรวจมะเร็งเต้านม ───────────────────────────── */
export const FP_EXAM_RESULT_OPTIONS = [
  { value: 'normal',   label: 'ปกติ' },
  { value: 'abnormal', label: 'ผิดปกติ' },
  { value: 'pending',  label: 'รอผล' },
];

export const resolveFpExamResult = (v) =>
  FP_EXAM_RESULT_OPTIONS.find((o) => o.value === v)?.label || '—';

export const FP_BREAST_SIDES = [
  { key: 'left',  label: 'เต้านมข้างซ้าย' },
  { key: 'right', label: 'เต้านมข้างขวา' },
];

export const FP_BREAST_DETAIL_SUGGESTIONS = [
  'ไม่คลำพบก้อน ไม่มีสิ่งคัดหลั่งจากหัวนม',
  'คลำพบก้อนขนาดประมาณ 1 ซม. บริเวณ upper outer quadrant',
  'ผิวหนังปกติ ไม่มีรอยบุ๋ม ไม่มีผื่นที่หัวนม',
  'มีสิ่งคัดหลั่งจากหัวนม ลักษณะใส ไม่มีเลือดปน',
  'ต่อมน้ำเหลืองรักแร้ไม่โต',
  'สอนการตรวจเต้านมด้วยตนเอง (BSE) แล้ว',
  'ส่งต่อเพื่อทำ Ultrasound เต้านม',
];

/* ── §2.1.3 บันทึกการตรวจภายใน / มะเร็งปากมดลูก (P.V. Examination) ──
   ฟิลด์ตามคู่มือ p.2-18 ข้อ 8: Vagina, Cervix, Uterus Position, Size,
   Adnex, Dx, Detail, Px + §2.1.3 ข้อ 5 ผลการตรวจมะเร็งปากมดลูก. */
export const FP_PV_VAGINA_OPTIONS = [
  { value: 'normal',       label: 'ปกติ ไม่มีตกขาวผิดปกติ' },
  { value: 'discharge',    label: 'มีตกขาวผิดปกติ' },
  { value: 'inflammation', label: 'ผนังช่องคลอดอักเสบ' },
  { value: 'lesion',       label: 'พบรอยโรค/แผล' },
];

export const FP_PV_CERVIX_OPTIONS = [
  { value: 'normal',    label: 'ปกติ' },
  { value: 'erosion',   label: 'Erosion (ปากมดลูกสึก)' },
  { value: 'polyp',     label: 'Polyp' },
  { value: 'nabothian', label: 'Nabothian cyst' },
  { value: 'suspicious', label: 'สงสัยรอยโรคมะเร็ง' },
];

export const FP_PV_UTERUS_POSITION_OPTIONS = [
  { value: 'anteverted',  label: 'Anteverted' },
  { value: 'retroverted', label: 'Retroverted' },
  { value: 'midposition', label: 'Mid-position' },
];

export const FP_PV_UTERUS_SIZE_OPTIONS = [
  { value: 'normal',   label: 'ขนาดปกติ' },
  { value: 'enlarged', label: 'โตกว่าปกติ' },
  { value: 'small',    label: 'เล็กกว่าปกติ' },
];

export const FP_PV_ADNEXA_OPTIONS = [
  { value: 'free',   label: 'Free ทั้งสองข้าง' },
  { value: 'massL',  label: 'คลำได้ก้อนข้างซ้าย' },
  { value: 'massR',  label: 'คลำได้ก้อนข้างขวา' },
  { value: 'tender', label: 'กดเจ็บ' },
];

export const FP_PAP_METHOD_OPTIONS = [
  { value: 'papSmear',  label: 'Pap smear (conventional)' },
  { value: 'liquid',    label: 'Liquid-based cytology' },
  { value: 'via',       label: 'VIA (ตรวจด้วยน้ำส้มสายชู)' },
  { value: 'hpvDna',    label: 'HPV DNA test' },
];

export const FP_PAP_RESULT_OPTIONS = [
  { value: 'normal',   label: 'ปกติ (Negative for intraepithelial lesion)' },
  { value: 'pending',  label: 'รอผลจากห้องปฏิบัติการ' },
  { value: 'abnormal', label: 'ผิดปกติ — ระบุผลในช่องรายละเอียด' },
];

/** คู่มือ §2.1.3 ข้อ 5.2: เลือกผลการตรวจ "ปกติ" → ช่องรายละเอียดจะขึ้น
    ข้อความอัตโนมัติ; "รอผล/ผิดปกติ" → เว้นว่างให้คีย์เอง. */
export const FP_PAP_AUTO_DETAIL = 'ไม่พบเซลล์ผิดปกติ (Negative for intraepithelial lesion or malignancy) — นัดตรวจซ้ำตามเกณฑ์';

export const FP_PV_DETAIL_SUGGESTIONS = [
  'ตรวจภายในไม่พบความผิดปกติ',
  'พบตกขาวสีขาวข้น คัน สงสัยเชื้อรา — ให้ยาเหน็บช่องคลอด',
  'ปากมดลูกมี erosion เล็กน้อย ไม่มีเลือดออก',
  'เก็บสิ่งส่งตรวจ Pap smear ส่งห้องปฏิบัติการแล้ว',
  'นัดฟังผลตรวจมะเร็งปากมดลูกใน 2 สัปดาห์',
  'ส่งปรึกษาสูตินรีแพทย์เพื่อประเมินเพิ่มเติม',
];

/* ── §2.1.3 ข้อ 6 · Cytologic Request — ช่องที่เหลือของใบคำขอ ────────
   หน้าจอเดิม (คู่มือ หน้า 2-15) มีมากกว่า Pertinent Clinical History:
   ชนิดสิ่งส่งตรวจ · การรักษาเดิม · Clinical Findings / Dx · Pap ครั้งล่าสุด
   ใน 5 ปี ทั้งหมดเป็นข้อมูลที่ห้องเซลล์วิทยาใช้อ่านสไลด์ ขาดไปแล้วใบคำขอ
   ไม่ครบตามของเดิม */
export const FP_SPECIMEN_TYPES = [
  { value: 'vaginal',      label: 'Vaginal' },
  { value: 'cervical',     label: 'Cervical' },
  { value: 'endocervical', label: 'Endocervical' },
  { value: 'endometrial',  label: 'Endometrial' },
  { value: 'other',        label: 'Other' },
];

/* ── §2.1.3 ข้อ 7 · แท็บ "ผลการตรวจ" — รหัสผลเซลล์วิทยาระบบ Bethesda ──
   ของเดิมเก็บเป็นรหัสตัวเลข ไม่ใช่ข้อความอิสระ เพราะต้องนับรวมเป็นรายงาน
   ได้ โครงจึงเป็น "กลุ่มหลัก → ตัวเลือกย่อย" ตามใบเดิมทุกรหัส */
export const FP_CYTOLOGY_ADEQUACY = [
  {
    code: '010',
    label: 'Satisfactory',
    items: [
      { code: '011', label: 'Presence of endocervical/transformation zone component' },
      { code: '012', label: 'Absence of endocervical/transformation zone component' },
    ],
  },
  {
    code: '020',
    label: 'Satisfactory but limited by …',
    items: [
      { code: '021', label: 'Smear too thickly spread' },
      { code: '022', label: 'Partial or complete obscuring inflame/blood' },
      { code: '023', label: 'Scant cellularity' },
      { code: '029', label: 'Other', freeText: true },
    ],
  },
  {
    code: '030',
    label: 'Unsatisfactory for evaluation',
    items: [
      { code: '031', label: 'Specimen reject/not processed (See comment)' },
      { code: '032', label: 'Specimen processed and examined (See comment)' },
    ],
  },
];

export const FP_CYTOLOGY_CATEGORIES = [
  {
    code: '100',
    label: 'Negative for Intraepithelial Lesion or Malignancy',
    groups: [
      {
        label: 'Organism',
        items: [
          { code: '101', label: 'Trichomonas spp.' },
          { code: '102', label: 'Candida spp.' },
          { code: '103', label: 'Bacterial vaginosis' },
          { code: '104', label: 'Actinomyces spp.' },
          { code: '105', label: 'HSV' },
          { code: '109', label: 'Other organism' },
        ],
      },
      {
        label: 'Other non Reactive cellular changes associated with',
        items: [
          { code: '121', label: 'Inflammation' },
          { code: '122', label: 'Radiation' },
          { code: '123', label: 'IUD' },
        ],
      },
      {
        label: 'neoplastic finding',
        items: [
          { code: '124', label: 'Glandular cells status post hysterectomy' },
          { code: '125', label: 'Atrophy' },
        ],
      },
    ],
  },
  {
    code: '200',
    label: 'Epithelial cells abnormalities',
    groups: [
      {
        label: 'Squamous cell : Atypical squamous cells',
        items: [
          { code: '211', label: 'of undetermined significance (ASC-US)' },
          { code: '212', label: 'cannot exclude HSIL (ASC-H)' },
        ],
      },
      {
        label: 'Law grade squamous intraepithelial lesion (LSIL) encompassing',
        items: [
          { code: '221', label: 'HPV change' },
          { code: '222', label: 'CIN I' },
        ],
      },
      {
        label: 'High grade squamous intraepithelial lesion (HSIL) encompassing',
        items: [
          { code: '231', label: 'CIN II' },
          { code: '232', label: 'CIN III' },
          { code: '234', label: 'with features suspicious for invasion' },
          { code: '241', label: 'SLI', freeText: true },
          { code: '251', label: 'Squamous cell carcinoma' },
        ],
      },
      {
        label: 'Glandular cell : Atypical glandular cells',
        items: [
          { code: '261', label: 'Endocervical' },
          { code: '262', label: 'Endometrial' },
          { code: '263', label: 'Not otherwise specified (NOS)' },
        ],
      },
      {
        label: 'Atypical glandular favor neoplasia',
        items: [
          { code: '271', label: 'Endocervical' },
          { code: '272', label: 'Endometrial' },
          { code: '273', label: 'Not otherwise specified (NOS)' },
          { code: '281', label: 'Endocervical adenocarcinoma in situ' },
        ],
      },
      {
        label: 'Adenocarcinoma',
        items: [
          { code: '291', label: 'Endocervical' },
          { code: '292', label: 'Endometrial' },
          { code: '293', label: 'Not otherwise specified (NOS)' },
        ],
      },
    ],
  },
  {
    code: '300',
    label: 'Other malignant neoplasms',
    groups: [
      {
        label: '',
        items: [
          { code: '301', label: 'Adenosquamous carcinoma' },
          { code: '302', label: 'Poorly differentiated squamous carcinoma with small cell' },
          { code: '303', label: 'Small cell undifferentiated carcinoma' },
          { code: '304', label: 'Carcinosarcoma' },
          { code: '305', label: 'Carcinoid tumors' },
          { code: '306', label: 'Malignant melanoma' },
          { code: '307', label: 'Malignant lymphoma' },
          { code: '308', label: 'Extrauterine carcinomas' },
        ],
      },
    ],
  },
];

/** ทุกรหัสในใบผลเซลล์วิทยา แบนเป็นลิสต์เดียวไว้แปลรหัส → ข้อความ
    เวลาสรุปลงใบผลตรวจหรือรายงาน. */
export const FP_CYTOLOGY_CODE_LABEL = (() => {
  const map = {};
  FP_CYTOLOGY_ADEQUACY.forEach((group) => {
    map[group.code] = group.label;
    group.items.forEach((item) => { map[item.code] = item.label; });
  });
  FP_CYTOLOGY_CATEGORIES.forEach((group) => {
    map[group.code] = group.label;
    group.groups.forEach((sub) => sub.items.forEach((item) => { map[item.code] = item.label; }));
  });
  return map;
})();

export const FP_COUNSELING_TYPES = [
  { value: 'preTest',       label: 'ให้คำปรึกษาก่อนตรวจ' },
  { value: 'postTest',      label: 'ให้คำปรึกษาหลังตรวจ/แจ้งผล' },
  { value: 'contraception', label: 'ให้คำปรึกษาเรื่องการคุมกำเนิด' },
  { value: 'none',          label: 'ไม่ได้ให้คำปรึกษา' },
];

/* ── §2.1.4 บันทึกการดูแลมารดาหลังคลอด ──────────────────────────── */
export const FP_NORMAL_ABNORMAL = [
  { value: 'normal',   label: 'ปกติ' },
  { value: 'abnormal', label: 'ผิดปกติ' },
];

/* หัวนมไม่ใช่แค่ ปกติ/ผิดปกติ (มติ คทง.2 9 ต.ค. 68) — ปกติ · สั้น · บอด · บุ๋ม
   บันทึกแยกซ้าย-ขวา เหมือนคลินิกฝากครรภ์ */
export const FP_NIPPLE_SIDE_OPTIONS = [
  { value: 'normal',   label: 'ปกติ' },
  { value: 'short',    label: 'สั้น' },
  { value: 'inverted', label: 'บอด' },
  { value: 'retracted', label: 'บุ๋ม' },
];

/* ตรวจภายในหลังคลอด — ปกติ/ผิดปกติ ต่อรายการ แล้วจึงระบุรายละเอียด (มติ คทง.2) */
export const FP_POSTPARTUM_PV_FIELDS = [
  { key: 'externalGenitalia', label: 'External Genitalia' },
  { key: 'vagina',            label: 'Vagina (รวมน้ำคาวปลา)' },
  { key: 'cervix',            label: 'Cervix' },
  { key: 'uterus',            label: 'Uterus ขนาด-ตำแหน่ง' },
  { key: 'adnexa',            label: 'Adnexa' },
];

/* ── งานตรวจคัดกรองมะเร็งเต้านม (มติ คทง.2 · แบบประเมินมูลนิธิกาญจนบารมี) ── */
export const FP_BREAST_RISK_FACTORS = [
  { key: 'ageOver40',        label: 'อายุ 40 ปีขึ้นไป' },
  { key: 'familyHistory',    label: 'ญาติสายตรงเป็นมะเร็งเต้านม/รังไข่' },
  { key: 'earlyMenarche',    label: 'ประจำเดือนมาครั้งแรกก่อนอายุ 12 ปี' },
  { key: 'lateMenopause',    label: 'หมดประจำเดือนหลังอายุ 55 ปี' },
  { key: 'nulliparous',      label: 'ไม่เคยมีบุตร หรือมีบุตรคนแรกหลังอายุ 30 ปี' },
  { key: 'hormoneUse',       label: 'ใช้ฮอร์โมนทดแทนต่อเนื่องเกิน 5 ปี' },
  { key: 'priorBreastLump',  label: 'เคยพบก้อนที่เต้านม/เคยผ่าตัดเต้านม' },
  { key: 'obesity',          label: 'ภาวะอ้วน (BMI ≥ 30)' },
  { key: 'alcoholSmoking',   label: 'ดื่มสุรา / สูบบุหรี่เป็นประจำ' },
  { key: 'radiationHistory', label: 'เคยฉายรังสีบริเวณทรวงอก' },
];

/* สอนตรวจเต้านมด้วยตนเอง (BSE) — พยาบาลประเมินว่าทำได้ถูกต้องหรือไม่ */
export const FP_BSE_TEACHING_ITEMS = [
  { key: 'mirrorLook',    label: 'ดูหน้ากระจก แขนแนบลำตัว สังเกตรูปร่าง สี ผิวหนัง' },
  { key: 'armsRaised',    label: 'ยกแขนขึ้นเหนือศีรษะ สังเกตรอยบุ๋ม/ผิวเปลือกส้ม' },
  { key: 'handsOnHips',   label: 'เท้าเอวเกร็งอก สังเกตความผิดปกติของผิวหนัง' },
  { key: 'nippleCheck',   label: 'บีบหัวนมเบา ๆ ดูสิ่งคัดหลั่ง' },
  { key: 'lyingPosition', label: 'นอนราบ สอดหมอนใต้ไหล่ข้างที่ตรวจ' },
  { key: 'circleMethod',  label: 'คลำแบบก้นหอย (circular) ครอบคลุมทั้งเต้า' },
  { key: 'wedgeMethod',   label: 'คลำแบบรัศมี (wedge) จากหัวนมออกด้านนอก' },
  { key: 'verticalMethod', label: 'คลำแบบขึ้น-ลง (vertical strip)' },
  { key: 'axillaCheck',   label: 'คลำต่อมน้ำเหลืองรักแร้และเหนือไหปลาร้า' },
  { key: 'monthlyRoutine', label: 'ทราบว่าต้องตรวจทุกเดือน หลังหมดประจำเดือน 3-7 วัน' },
];

/* ── งานตรวจคัดกรองมะเร็งปากมดลูก (มติ คทง.2 · 17 ธ.ค. 68 ข้อ 1.19.8) ── */
export const FP_CERVICAL_PURPOSE_OPTIONS = [
  { value: 'screening', label: 'มารับบริการตรวจ' },
  { value: 'result',    label: 'มาฟังผล' },
];

export const FP_CERVICAL_TEST_TYPES = [
  { value: 'liquidCytology', label: 'Liquid-based Cytology' },
  { value: 'hpvDna',         label: 'HPV DNA Testing' },
  { value: 'hpvSelf',        label: 'HPV Self-sampling' },
];

/** เชิงรับ/เชิงรุก — บังคับเมื่อชนิดการตรวจเป็น HPV DNA (รหัสบริการ 3150) */
export const FP_SCREENING_APPROACH_OPTIONS = [
  { value: 'passive', label: 'เชิงรับ (ผู้รับบริการมาที่หน่วยบริการ)' },
  { value: 'active',  label: 'เชิงรุก (ออกหน่วย/ลงชุมชน)' },
];

export const FP_POSTPARTUM_MOTHER_FIELDS = [
  { key: 'breast',     label: 'เต้านม',            options: FP_NORMAL_ABNORMAL },
  { key: 'milkFlow',   label: 'น้ำนมไหล',           options: [{ value: 'yes', label: 'ไหลดี' }, { value: 'no', label: 'ไม่ไหล/ไหลน้อย' }] },
  { key: 'fundus',     label: 'ระดับมดลูก',         options: FP_NORMAL_ABNORMAL },
  { key: 'lochia',     label: 'น้ำคาวปลา',          options: [{ value: 'normal', label: 'ปกติ' }, { value: 'abnormal', label: 'ผิดปกติ/มีกลิ่น' }, { value: 'none', label: 'ไม่มี' }] },
  { key: 'perineum',   label: 'เจ็บแผล/ฝีเย็บ',      options: [{ value: 'no', label: 'ไม่เจ็บ แผลแห้งดี' }, { value: 'yes', label: 'เจ็บ/แผลบวมแดง' }] },
];

export const FP_POSTPARTUM_MOTHER_SUMMARY = [
  { value: 'healthy', label: 'สุขภาพปกติ' },
  { value: 'ill',     label: 'มีภาวะผิดปกติ ต้องติดตาม' },
];

export const FP_DELIVERY_METHOD_OPTIONS = [
  { value: 'normal',   label: 'คลอดปกติทางช่องคลอด' },
  { value: 'vacuum',   label: 'ใช้เครื่องดูดสุญญากาศ' },
  { value: 'forceps',  label: 'ใช้คีม' },
  { value: 'cesarean', label: 'ผ่าตัดคลอด' },
];

export const FP_DELIVERY_PLACE_OPTIONS = [
  { value: 'hospital', label: 'โรงพยาบาล' },
  { value: 'center',   label: 'ศูนย์บริการสาธารณสุข' },
  { value: 'home',     label: 'บ้าน' },
  { value: 'other',    label: 'อื่นๆ' },
];

export const FP_PREGNANCY_OUTCOME_OPTIONS = [
  { value: 'liveBirth',  label: 'คลอดมีชีพ' },
  { value: 'stillbirth', label: 'ตายคลอด' },
  { value: 'abortion',   label: 'แท้ง' },
];

export const FP_POSTPARTUM_CHILD_FIELDS = [
  { key: 'umbilicus', label: 'สะดือ',           options: [{ value: 'normal', label: 'ปกติ/แห้งดี' }, { value: 'abnormal', label: 'แดง/มีหนอง' }] },
  { key: 'jaundice',  label: 'ภาวะตัวเหลือง',   options: [{ value: 'no', label: 'ไม่มี' }, { value: 'yes', label: 'มี' }] },
  { key: 'feeding',   label: 'การดูดนม',         options: [{ value: 'good', label: 'ดูดนมได้ดี' }, { value: 'poor', label: 'ดูดนมได้น้อย' }] },
  { key: 'skin',      label: 'ผิวหนัง',          options: FP_NORMAL_ABNORMAL },
];

export const FP_POSTPARTUM_ADVICE_SUGGESTIONS = [
  'แนะนำการเลี้ยงลูกด้วยนมแม่อย่างเดียว 6 เดือน',
  'แนะนำการดูแลแผลฝีเย็บและการทำความสะอาด',
  'แนะนำอาหารบำรุงน้ำนมและการพักผ่อน',
  'แนะนำการสังเกตอาการผิดปกติหลังคลอด (ไข้ เลือดออกมาก ปวดท้องรุนแรง)',
  'แนะนำการคุมกำเนิดหลังคลอดและนัดรับบริการวางแผนครอบครัว',
  'แนะนำการดูแลสะดือทารกและการอาบน้ำ',
  'นัดรับวัคซีนตามกำหนดของสมุดบันทึกสุขภาพแม่และเด็ก',
];

/* ── S3 คำแนะนำการวางแผนครอบครัว ───────────────────────────────── */
export const FP_ADVICE_SUGGESTIONS = [
  'รับประทานยาเม็ดคุมกำเนิดวันละ 1 เม็ด เวลาเดิมทุกวัน',
  'หากลืมรับประทานยา 1 เม็ด ให้รับประทานทันทีที่นึกได้ และเม็ดต่อไปตามเวลาเดิม',
  'มาฉีดยาคุมกำเนิดตามนัดทุก 3 เดือน (คลาดเคลื่อนได้ไม่เกิน 2 สัปดาห์)',
  'ห่วงอนามัยใช้ได้นาน 5 ปี ให้มาตรวจสายห่วงตามนัด',
  'ยาฝังคุมกำเนิดใช้ได้นาน 3–5 ปี ตามชนิดที่ฝัง',
  'ถุงยางอนามัยป้องกันทั้งการตั้งครรภ์และโรคติดต่อทางเพศสัมพันธ์',
  'สังเกตอาการผิดปกติ เช่น ปวดศีรษะรุนแรง ตาพร่า เจ็บหน้าอก ปวดน่อง ให้มาพบแพทย์ทันที',
  'ตรวจมะเร็งปากมดลูกทุก 3 ปี และตรวจเต้านมด้วยตนเองทุกเดือน',
  'มาตามนัดรับบริการวางแผนครอบครัวครั้งถัดไป',
];

export const FP_REFER_REASON_SUGGESTIONS = [
  'ผลคัดกรองประวัติการเจ็บป่วยพบข้อห้ามใช้ยาคุมกำเนิด ส่งปรึกษาแพทย์',
  'ความดันโลหิตสูง ต้องประเมินก่อนให้ฮอร์โมนคุมกำเนิด',
  'คลำพบก้อนที่เต้านม ส่งตรวจเพิ่มเติม',
  'ผลตรวจมะเร็งปากมดลูกผิดปกติ ส่งพบสูตินรีแพทย์',
  'ผลทดสอบการตั้งครรภ์เป็นบวก ส่งคลินิกฝากครรภ์ (ANC)',
  'ต้องการทำหมัน ส่งต่อโรงพยาบาลแม่ข่าย',
];

export const FP_ILLNESS_HISTORY_SUGGESTIONS = [
  'ไม่มีโรคประจำตัว ไม่แพ้ยา',
  'ความดันโลหิตสูง รับประทานยาต่อเนื่อง',
  'เบาหวานชนิดที่ 2 ควบคุมด้วยยา',
  'ไมเกรน มีอาการนำทางสายตา',
  'เคยผ่าตัดถุงน้ำดี',
  'ประวัติแพ้ยากลุ่มซัลฟา',
];

/* ── ยาและเวชภัณฑ์ที่คลินิกวางแผนครอบครัวสั่งได้ (CPOE) ───────────── */
export const FP_MED_ORDERS = [
  { key: 'coc',        label: 'ยาเม็ดคุมกำเนิดชนิดฮอร์โมนรวม (COC) 1 แผง', hormonal: true },
  { key: 'pop',        label: 'ยาเม็ดคุมกำเนิดชนิดฮอร์โมนเดี่ยว (POP) 1 แผง', hormonal: true },
  { key: 'dmpa',       label: 'ยาฉีดคุมกำเนิด DMPA 150 มก. IM', hormonal: true },
  { key: 'implantRod', label: 'ยาฝังคุมกำเนิด (Implant) 1 หลอด', hormonal: true },
  { key: 'ecp',        label: 'ยาคุมกำเนิดฉุกเฉิน (Levonorgestrel 1.5 มก.)', hormonal: true },
  { key: 'condomBox',  label: 'ถุงยางอนามัย 1 กล่อง (10 ชิ้น)', hormonal: false },
  { key: 'ferrous',    label: 'ยาเม็ดเสริมธาตุเหล็ก', hormonal: false },
  { key: 'folic',      label: 'กรดโฟลิก', hormonal: false },
];

export const FP_ADVANCE_ORDERS = [
  { key: 'upt',        label: 'ตรวจปัสสาวะทดสอบการตั้งครรภ์ (UPT)' },
  { key: 'papLab',     label: 'ส่งตรวจเซลล์วิทยาปากมดลูก (Pap smear)' },
  { key: 'hb',         label: 'ตรวจความเข้มข้นเลือด (Hb/Hct)' },
  { key: 'breastUs',   label: 'ส่งตรวจ Ultrasound เต้านม' },
];

export const FP_INTERNAL_REFER_UNITS = [
  { value: 'anc',       label: 'คลินิกฝากครรภ์ (ANC)' },
  { value: 'doctorOpd', label: 'ห้องตรวจแพทย์ (OPD)' },
  { value: 'lab',       label: 'ห้องปฏิบัติการ (Lab)' },
  { value: 'pharmacy',  label: 'ห้องจ่ายยา' },
  { value: 'ncd',       label: 'คลินิกโรคเรื้อรัง (NCD)' },
];

export const FP_EXTERNAL_REFER_HOSPITALS = [
  { value: 'vajira',    label: 'โรงพยาบาลวชิรพยาบาล' },
  { value: 'klang',     label: 'โรงพยาบาลกลาง' },
  { value: 'taksin',    label: 'โรงพยาบาลตากสิน' },
  { value: 'charoen',   label: 'โรงพยาบาลเจริญกรุงประชารักษ์' },
  { value: 'ratchapipat', label: 'โรงพยาบาลราชพิพัฒน์' },
];

export const FP_APPOINTMENT_TYPES = [
  { value: 'pillRefill',   label: 'รับยาเม็ดคุมกำเนิดต่อเนื่อง' },
  { value: 'injection',    label: 'ฉีดยาคุมกำเนิดครั้งถัดไป' },
  { value: 'iudCheck',     label: 'ตรวจสายห่วงอนามัย' },
  { value: 'implantCheck', label: 'ตรวจยาฝังคุมกำเนิด' },
  { value: 'papResult',    label: 'ฟังผลตรวจมะเร็งปากมดลูก' },
  { value: 'breastExam',   label: 'ตรวจมะเร็งเต้านมตามนัด' },
  { value: 'postpartum',   label: 'ดูแลมารดา/เด็กหลังคลอด' },
];

export const resolveFpAppointmentType = (v) =>
  FP_APPOINTMENT_TYPES.find((t) => t.value === v)?.label || '—';

export const FP_UPLOAD_ACCEPT = '.pdf,.jpg,.jpeg,.png';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** ตรวจไฟล์แนบ (TOR 1.10.8.4) — ชนิด + ขนาด; คืน error string หรือ null. */
export const validateFpUpload = (file) => {
  if (!file) return 'ไม่พบไฟล์ที่เลือก';
  const ok = /\.(pdf|jpe?g|png)$/i.test(file.name || '');
  if (!ok) return 'รองรับเฉพาะไฟล์ PDF / JPG / PNG';
  if ((file.size || 0) > MAX_UPLOAD_BYTES) return 'ไฟล์ต้องมีขนาดไม่เกิน 10 MB';
  return null;
};

/* ── Whole-visit default form state ──────────────────────────────── */
export const DEFAULT_FP_VISIT = {
  /* บริการหลักของวิสิต (มติ คทง.2) — ต้องเลือกก่อนเดินขั้นถัดไป */
  primaryServices: [],
  /* S1 — ประวัติการรักษา (1.10.8.3) */
  illnessHistory: '',
  vitalsOverride: false,
  vitals: { bp: '', pulse: '', temp: '', weight: '', height: '' },
  urineSugar: '',
  urineAlbumin: '',

  /* S2 — คัดกรอง 11 ข้อ (คู่มือ p.2-5) — ค่าตั้งต้นเป็น mock ของวิสิตนี้ (มติผู้ใช้
     3 ก.ย. 69) เพื่อให้ขั้น "ตรวจสอบ" มีข้อมูลจากขั้น 1-3 ให้ทวนจริง */
  screening: { q1: 'no', q2: 'no', q3: 'no', q4: 'no', q5: 'no', q6: 'no', q7: 'no', q8: 'no', q9: 'no', q10: 'no', q11: 'no' },
  screeningNote: 'ไม่พบข้อห้ามการใช้ยาคุมกำเนิดชนิดฮอร์โมน',
  doctorConsulted: false,          /* ส่งปรึกษาแพทย์แล้ว → ปลดล็อกการจ่ายยา */
  doctorConsultedBy: '',
  doctorConsultedAt: '',

  /* S3 — วางแผนครอบครัวและคำแนะนำ (1.10.8.7) */
  serviceDate: todayIso(),
  clientType: 'old',
  lastMethod: 'pill',
  lastMethodOther: '',
  services: [],                    /* บริการที่ได้รับ — array ของ FP_SERVICES key */
  removals: [],                    /* ถอดห่วง / ถอดยาฝัง */
  dispensed: false,                /* จ่ายยาคุมกำเนิดจริงในครั้งนี้ */
  pregnancyTest: 'negative',
  lastDeliveryMonth: '',
  lastDeliveryYear: '',
  lastDeliveryType: '',            /* 'delivery' | 'abortion' */
  lmp: '',
  adviceNote: '',

  /* S4 — ตรวจสตรี (มะเร็งเต้านม + ตรวจภายใน/ปากมดลูก) */
  breastExamDate: todayIso(),
  breast: {
    left:  { result: 'normal', detail: 'ไม่คลำพบก้อน ไม่มีสิ่งคัดหลั่งจากหัวนม' },
    right: { result: 'normal', detail: 'ไม่คลำพบก้อน ผิวหนังปกติ ต่อมน้ำเหลืองรักแร้ไม่โต' },
  },
  breastMarkers: [],
  breastDrawings: [],
  /* ข้อสรุปทางคลินิกของวิสิตนี้ ใช้กับแผงวินิจฉัยในขั้น 2 โดยไม่ปะปน
     กับ diagnosis ของ ANC หรือผล Pap จากห้องปฏิบัติการ */
  clinicalAssessment: '',
  diagnosisNote: 'ผู้รับบริการวางแผนครอบครัวรายเก่า ไม่พบข้อห้ามการใช้ฮอร์โมน ตรวจเต้านมและตรวจภายในปกติ',
  pvExamDate: '',
  pvPatientType: '',
  counselingReceived: '',
  counselingType: '',
  counselingDetail: '',
  pv: {
    vagina: 'normal', cervix: 'normal', uterusPosition: 'anteverted', uterusSize: 'normal',
    adnexa: 'free', detail: 'ตรวจภายในปกติ ไม่พบรอยโรค',
  },
  papMethod: '',
  papResult: '',
  papDetail: '',
  papSmearBy: '',
  papExaminedBy: '',
  papSentToLab: false,
  papNotifyClient: false,
  papFollowUp: false,
  papServiceCost: '',
  papReimbursement: false,
  /* Cytologic Request - คู่มือ §2.1.3 ข้อ 6.
     เก็บเป็นก้อนเดียว เพราะเป็นข้อมูลประกอบใบคำขอตรวจ ไม่ใช่ผล Pap. */
  cytologyRequest: {
    specimenTypes: [],
    specimenOther: '',
    termBirths: '',
    pretermBirths: '',
    abortions: '',
    livingChildren: '',
    youngestChildAge: '',
    lmpYears: '',
    lmpDays: '',
    lmpOther: '',
    contraception: '',
    previousSmear: '',
    /* ข้อ 6.6 ของเดิมเป็น "ทำครั้งแรก / เคยทำ __ ปี" — จำนวนปีจึงต้องมีช่องของ
       ตัวเอง ไม่ใช่แค่เคย/ไม่เคย */
    previousSmearYears: '',
    previousTreatment: '',
    clinicalFindings: '',
    clinicalDx: '',
    lastPapInFiveYears: '',
  },
  /* §2.1.3 ข้อ 7 — แท็บผลการตรวจ (ห้องเซลล์วิทยาเป็นคนกรอกกลับมา) */
  cytologyResult: {
    receivedDate: '',
    adequacy: [],
    adequacyOther: '',
    categories: [],
    sliDetail: '',
  },

  /* S5 — ดูแลหลังคลอด */
  hasPostpartum: false,
  postpartumMother: {
    visitNo: '1', visitDate: '', pregnancyNo: '', deliveryDate: '',
    outcome: '', deliveryMethod: '', deliveryPlace: '', deliveryFacility: '',
    fields: {}, sugarLevel: '', albuminLevel: '',
    cervicalScreened: '', historyTaken: '', physicalExamed: '',
    familyPlanned: '', familyPlanMethod: '',
    summary: '', advice: '', note: '', nurse: FP_CURRENT_USER,
  },
  postpartumChild: {
    visitNo: '1', visitDate: '', birthWeight: '', weight: '',
    fields: {}, examSummary: '', advice: '', motherName: '', motherCid: '',
  },

  /* S6 — คำสั่งทางการแพทย์ + ส่งปรึกษา/ส่งต่อ */
  doctor: '',
  /* ชุดยามาตรฐานของคลินิก (chip เปิด/ปิด) */
  medOrders: {},
  /* §1.10.8.7 — ยาที่สั่งผ่าน AddMedicationPopup พร้อมขนาด/วิธีใช้/จำนวน
     ชุด chip บอกได้แค่ "สั่ง/ไม่สั่ง" ซึ่งไม่พอสำหรับใบสั่งยาจริง
     [{ id, name, usage, dosePerTake, frequency, when, quantity, image }] */
  medications: [],
  advanceOrders: {},
  internalReferEnabled: false,
  internalReferUnit: '',
  internalReferReason: '',
  externalReferEnabled: false,
  externalReferHospital: '',
  externalReferReason: '',
  externalReferDate: '',

  /* ขั้นสั่งการรักษาใช้ของคลินิกฝากครรภ์ทั้งก้อน (`AncStep5Orders`) จึงต้องมี
     state ชุดเดียวกับ DEFAULT_ANC_VISIT ของขั้นนั้น (มติผู้ใช้ 3 ก.ย. 69) */
  riskLevel: 'low',
  lab1Orders: {},
  lab2Orders: {},
  labResults: {},
  diabetesScreening: {},
  supplements: {},
  termAssessment: {},

  /* S7 — e-Document + นัดหมาย + พิมพ์บัตร */
  documents: [],                   /* [{ name, size, uploadedBy, uploadedAt }] */
  /* e-Document ที่ "สร้าง" ในการมารับบริการครั้งนี้ด้วย form-builder
     (ต่างจาก documents ที่เป็นไฟล์ "แนบ" เข้ามา) — TOR §1.10.8.4
     [{ id, name, templateSlug, blocks, createdBy, createdAt, updatedAt }] */
  eDocuments: [],
  /* legacy alias — บล็อกของเอกสารใบแรก เผื่อโค้ดเดิมที่อ่าน field นี้ */
  eDocBlocks: [],
  appointment: { date: '', time: '', type: '', note: '', cancelled: false },
  cardPrinted: false,
  /* แผงวินิจฉัยใช้ชุดเดียวกับคลินิกฝากครรภ์ (มติผู้ใช้ 3 ก.ย. 69) — คีย์ต้องครบตาม
     DEFAULT_ANC_VISIT ไม่งั้นช่องในแผงนั้นจะไม่มี state รองรับ */
  riskLevel: '',
  gdmConfirmed: false,
  externalExamResults: '',
  externalExamAttachments: [],
  adviceTopics: {},
  plannedDeliveryMode: '',

};

const hasText = (v) => typeof v === 'string' && v.trim() !== '';

/** 7 booleans → StepProgress check marks (สัญญาเดียวกับ getMhCompletedSteps). */
export const getFpCompletedSteps = (form, stepIndex = 0) => {
  const screen = interpretFpScreening(form?.screening);
  return [
    stepIndex > 0 || hasText(form?.illnessHistory),
    screen.answeredAll,
    !!(hasText(form?.clientType) && (form?.services || []).length > 0),
    stepIndex > 3 || !!form?.breast?.left?.result || !!form?.breast?.right?.result || !!form?.papResult,
    stepIndex > 4,
    stepIndex > 5 || hasText(form?.doctor),
    !!form?.appointment?.date || !!form?.cardPrinted,
  ];
};

/* ── Validation (บันทึกไม่ผ่านถ้ายังมี error) ─────────────────────── */
export const validateFpVisit = (form) => {
  const errs = [];
  const screen = interpretFpScreening(form?.screening);

  /* ถอดตัวเลือก "บริการหลัก" ออกจากขั้นแบบประเมินแล้ว (มติผู้ใช้ 3 ก.ย. 69)
     คลินิกนี้เป็นงานวางแผนครอบครัวทั้งหมด กฎที่เคยผูกกับบริการหลักจึงใช้กับ
     ทุกวิสิต */
  if (!hasText(form?.serviceDate)) errs.push('ยังไม่ได้ระบุวันที่รับบริการ (ขั้นตอนสั่งการรักษา)');
  if (!hasText(form?.clientType)) errs.push('ยังไม่ได้เลือกประเภทผู้รับบริการ (ขั้นตอนสั่งการรักษา)');
  if ((form?.services || []).length === 0) errs.push('ยังไม่ได้เลือกบริการที่ได้รับ (ขั้นตอนสั่งการรักษา)');
  if (form?.lastMethod === 'other' && !hasText(form?.lastMethodOther)) {
    errs.push('เลือกวิธีคุมกำเนิดครั้งสุดท้ายเป็น "อื่นๆ" ต้องระบุรายละเอียด (ขั้นตอนที่ 3)');
  }
  if (!screen.answeredAll) {
    errs.push(`ซักประวัติคัดกรองยังไม่ครบ 11 ข้อ (ตอบแล้ว ${screen.answeredCount}/11 — ขั้นตอนที่ 2)`);
  }
  if (screen.mustReferDoctor && !form?.doctorConsulted) {
    errs.push('พบข้อคัดกรองที่ตอบ "มี" — ต้องบันทึกการส่งปรึกษาแพทย์ก่อนบันทึก (คู่มือ p.2-5)');
  }
  const flaggedBlockedServices = (form?.services || [])
    .filter((k) => !FP_SERVICES_ALLOWED_WHEN_FLAGGED.includes(k));
  if (screen.mustReferDoctor && !form?.doctorConsulted && flaggedBlockedServices.length > 0) {
    errs.push('ห้ามจ่ายยา/ให้บริการคุมกำเนิดขณะยังไม่ได้ส่งปรึกษาแพทย์ — เลือกได้เฉพาะถุงยางอนามัย/ให้คำปรึกษา');
  }
  /* คัดกรองติดธง + ยังไม่ส่งปรึกษาแพทย์ → คลุมทั้งคำสั่งยา (S6) และธง
     จ่ายยาจริง (S3) ด้วย — ไม่ใช่แค่ services */
  const hormonalMedOrders = FP_MED_ORDERS
    .filter((m) => m.hormonal && form?.medOrders?.[m.key]);
  if (screen.mustReferDoctor && !form?.doctorConsulted) {
    if (hormonalMedOrders.length > 0) {
      errs.push('พบข้อคัดกรองที่ตอบ "มี" — ห้ามสั่งยาคุมกำเนิดชนิดฮอร์โมนจนกว่าจะส่งปรึกษาแพทย์ (ลบรายการยาในขั้นตอนที่ 6 หรือบันทึกส่งปรึกษาในขั้นตอนที่ 2)');
    }
    if (form?.dispensed) {
      errs.push('พบข้อคัดกรองที่ตอบ "มี" — ห้ามจ่ายยาคุมกำเนิดจนกว่าจะส่งปรึกษาแพทย์ (เอาเครื่องหมาย "จ่ายยาคุมกำเนิดจริง" ออกในขั้นตอนที่ 3)');
    }
  }
  if (form?.pregnancyTest === 'positive') {
    const hormonal = (form?.services || []).filter((k) => FP_HORMONAL_SERVICE_KEYS.includes(k));
    if (hormonal.length > 0) {
      errs.push('ผลทดสอบการตั้งครรภ์เป็น "ตั้งครรภ์" — ห้ามให้บริการคุมกำเนิดชนิดฮอร์โมน ให้ส่งคลินิกฝากครรภ์ (ANC)');
    }
    if (hormonalMedOrders.length > 0) {
      errs.push('ผลทดสอบการตั้งครรภ์เป็น "ตั้งครรภ์" — ห้ามสั่งยาคุมกำเนิดชนิดฮอร์โมน (ลบรายการยาในขั้นตอนที่ 6)');
    }
    if (form?.dispensed) {
      errs.push('ผลทดสอบการตั้งครรภ์เป็น "ตั้งครรภ์" — ห้ามจ่ายยาคุมกำเนิด (เอาเครื่องหมาย "จ่ายยาคุมกำเนิดจริง" ออกในขั้นตอนที่ 3)');
    }
  }
  if (hasText(form?.lmp) && form.lmp > todayIso()) {
    errs.push('วันแรกของประจำเดือนครั้งสุดท้าย (LMP) ต้องไม่เป็นวันในอนาคต (ขั้นตอนที่ 3)');
  }
  if (hasText(form?.lastDeliveryMonth)) {
    const m = Number(form.lastDeliveryMonth);
    if (!Number.isInteger(m) || m < 1 || m > 12) errs.push('เดือนของการคลอด/แท้งครั้งสุดท้ายต้องอยู่ระหว่าง 1–12 (ขั้นตอนที่ 3)');
  }
  if (form?.appointment?.date && !form.appointment.cancelled && form.appointment.date < todayIso()) {
    errs.push('วันนัดหมายเป็นวันในอดีต — แก้ไขในขั้นตอนที่ 7');
  }
  if (form?.internalReferEnabled && !hasText(form?.internalReferUnit)) {
    errs.push('เปิดการส่งปรึกษาภายในแล้ว แต่ยังไม่ได้เลือกหน่วยงานปลายทาง (ขั้นตอนที่ 6)');
  }
  if (form?.externalReferEnabled && !hasText(form?.externalReferHospital)) {
    errs.push('เปิดการส่งต่อภายนอกแล้ว แต่ยังไม่ได้เลือกโรงพยาบาลปลายทาง (ขั้นตอนที่ 6)');
  }
  return errs;
};

/* ── Mock roster — คิววันนี้ (ศบส. กทม.) ─────────────────────────── */
export const FP_QUEUE_PATIENTS = [
  {
    queue: 'FP-001', hn: '67-00023', name: 'ภัทรานิษฐ์ บูรณะ', sex: 'หญิง', age: '36 ปี',
    cid: '3401200971563', insurance: 'สิทธิประกันสังคม รพ.วชิรพยาบาล', rightsExpired: false,
    fpNumber: 'วผ.69-0001', clientType: 'oldContinue', currentMethod: 'pill',
    service: 'pill', nurse: 'พว.ศิริพร วงศ์สุวรรณ', room: 'วางแผนครอบครัว 1',
    statusKey: 'waiting', waitMinutes: 8, appointmentNote: 'รับยาต่อเนื่อง',
  },
  {
    queue: 'FP-002', hn: '67-00015', name: 'รัตนาภรณ์ ใสสะอาด', sex: 'หญิง', age: '39 ปี',
    cid: '3550900237845', insurance: 'สิทธิข้าราชการ กรมบัญชีกลาง', rightsExpired: false,
    fpNumber: 'วผ.69-0002', clientType: 'oldChange', currentMethod: 'injection',
    service: 'injection', nurse: 'พว.อรทัย เกษมสุข', room: 'วางแผนครอบครัว 1',
    statusKey: 'progress', waitMinutes: 3, appointmentNote: 'ขอเปลี่ยนเป็นยาฝัง',
  },
  {
    queue: 'FP-003', hn: '67-00013', name: 'พิมพ์ใจ จันทรา', sex: 'หญิง', age: '26 ปี',
    cid: '1809900739581', insurance: 'สิทธิประกันสังคม รพ.เปาโลโชคชัย 4', rightsExpired: false,
    fpNumber: '', clientType: 'new', currentMethod: '',
    service: '', nurse: 'พว.ชุติมา ธารทอง', room: 'วางแผนครอบครัว 2',
    statusKey: 'waiting', waitMinutes: 15, appointmentNote: 'รายใหม่ ยังไม่มีทะเบียน',
  },
  {
    queue: 'FP-004', hn: '67-00027', name: 'จิราพร มณีโชติ', sex: 'หญิง', age: '23 ปี',
    cid: '1102003847561', insurance: 'สิทธิหลักประกันสุขภาพถ้วนหน้า (บัตรทอง)', rightsExpired: false,
    fpNumber: 'วผ.69-0004', clientType: 'oldReturn', currentMethod: 'condom',
    service: 'condom', nurse: 'พว.ชุติมา ธารทอง', room: 'วางแผนครอบครัว 2',
    statusKey: 'draft', waitMinutes: 0, draftStep: 2, appointmentNote: 'บันทึกค้างไว้',
  },
  {
    queue: 'FP-005', hn: '67-00021', name: 'วรรณภา ทองดี', sex: 'หญิง', age: '50 ปี',
    cid: '3100501736485', insurance: 'สิทธิข้าราชการ กรมบัญชีกลาง', rightsExpired: false,
    fpNumber: 'วผ.69-0005', clientType: 'oldContinue', currentMethod: 'iud',
    service: 'iud', nurse: 'พว.ศิริพร วงศ์สุวรรณ', room: 'วางแผนครอบครัว 1',
    statusKey: 'done', waitMinutes: 0, appointmentNote: 'ตรวจสายห่วง + Pap smear',
  },
  {
    queue: 'FP-006', hn: '67-00007', name: 'มาลี อ่อนน้อม', sex: 'หญิง', age: '45 ปี',
    cid: '3100501239876', insurance: 'สิทธิประกันสังคม รพ.มงกุฎวัฒนะ (หมดอายุ 31 ก.ค. 2569)', rightsExpired: true,
    fpNumber: 'วผ.69-0006', clientType: 'oldContinue', currentMethod: 'tubal',
    service: 'tubal', nurse: 'พว.อรทัย เกษมสุข', room: 'วางแผนครอบครัว 1',
    statusKey: 'waiting', waitMinutes: 22, appointmentNote: 'ตรวจเต้านมประจำปี',
  },
  {
    queue: 'FP-007', hn: '67-00019', name: 'นันทิดา พรเลิศ', sex: 'หญิง', age: '28 ปี',
    cid: '1809900472316', insurance: 'สิทธิหลักประกันสุขภาพถ้วนหน้า (บัตรทอง)', rightsExpired: false,
    fpNumber: 'วผ.69-0007', clientType: 'oldContinue', currentMethod: 'implant',
    service: 'implant', nurse: 'พว.ชุติมา ธารทอง', room: 'วางแผนครอบครัว 2',
    statusKey: 'done', waitMinutes: 0, appointmentNote: 'ดูแลมารดาหลังคลอด ครั้งที่ 2',
  },
];

/** นัดแล้วยังไม่มาติดต่อ — คู่มือ p.2-1: ต้อง "ส่งตรวจ" จากห้องบัตรก่อน
    จึงจะบันทึกวางแผนครอบครัวได้. */
export const FP_SCHEDULED_TODAY = [
  {
    hn: '67-00011', name: 'อรอุมา ดวงสว่าง', sex: 'หญิง', age: '48 ปี',
    cid: '3401200583926', insurance: 'สิทธิประกันสังคม รพ.เปาโล พหลโยธิน', rightsExpired: false,
    fpNumber: 'วผ.69-0003', appointmentTime: '10:30', clinic: 'วางแผนครอบครัว 1',
    clientType: 'oldContinue', currentMethod: 'iud', service: 'iud',
    nurse: 'พว.ศิริพร วงศ์สุวรรณ', appointmentNote: 'ตรวจสายห่วงอนามัย',
  },
  {
    hn: '67-00017', name: 'ภัคจิรา วงศ์อนันต์', sex: 'หญิง', age: '41 ปี',
    cid: '3401200674923', insurance: 'สิทธิประกันสังคม รพ.จุฬาลงกรณ์', rightsExpired: false,
    fpNumber: 'วผ.69-0008', appointmentTime: '13:30', clinic: 'วางแผนครอบครัว 2',
    clientType: 'oldContinue', currentMethod: 'injection', service: 'injection',
    nurse: 'พว.อรทัย เกษมสุข', appointmentNote: 'ฉีดยาคุมกำเนิดครั้งที่ 4',
  },
];

/** ส่งตรวจ (คู่มือ p.2-1) — ย้ายรายการนัดเข้าคิวหลักของวันนี้. */
export const checkInFpAppointment = (hn) => {
  if (!hn) return;
  const list = readJson(K.checkedIn, []);
  if (!list.includes(hn)) writeJson(K.checkedIn, [...list, hn]);
};

export const getFpScheduledNotArrived = () => {
  const checked = readJson(K.checkedIn, []);
  return FP_SCHEDULED_TODAY.filter((r) => !checked.includes(r.hn));
};

export const getFpQueueRows = () => {
  const checked = readJson(K.checkedIn, []);
  const arrivals = FP_SCHEDULED_TODAY
    .filter((r) => checked.includes(r.hn))
    .map((r, i) => ({
      ...r,
      queue: `FP-${String(FP_QUEUE_PATIENTS.length + i + 1).padStart(3, '0')}`,
      room: r.clinic,
      statusKey: 'waiting',
      waitMinutes: 0,
    }));
  return [...FP_QUEUE_PATIENTS, ...arrivals];
};

export const getFpQueueRowByHn = (hn) =>
  getFpQueueRows().find((r) => r.hn === hn)
  || FP_SCHEDULED_TODAY.find((r) => r.hn === hn)
  || null;

/* ── ยกเลิก / เปิดใช้งานทะเบียนจากหน้าคิว (audit: ผู้บันทึก + เวลา) ─── */
export const cancelFpQueueRegistration = (hn, reason) => {
  if (!hn) return;
  const store = readJson(K.queueCancelled, {});
  store[hn] = { reason: reason || '', by: FP_CURRENT_USER, at: new Date().toISOString() };
  writeJson(K.queueCancelled, store);
};

export const reactivateFpQueueRegistration = (hn) => {
  if (!hn) return;
  const store = readJson(K.queueCancelled, {});
  delete store[hn];
  writeJson(K.queueCancelled, store);
};

export const getFpQueueCancellation = (hn) => readJson(K.queueCancelled, {})[hn] || null;

/* ── ทะเบียนผู้รับบริการวางแผนครอบครัว (TOR 1.10.8.6) ──────────────
   คู่มือ p.2-1/2-2: HN ที่ยังไม่เคยลงทะเบียน → "ไม่พบข้อมูล กรุณาลงทะเบียน"
   → กดลงทะเบียน → ระบบออก "เลขที่วางแผนครอบครัว" ให้ตอนบันทึกสำเร็จ
   (ในหน้าลงทะเบียนช่องนี้ยังว่างจนกว่าจะกดบันทึก — คู่มือ ข้อ 2). */
const REGISTRY_SEED = [
  {
    id: 'fp-reg-1', fpNumber: 'วผ.69-0001', hn: '67-00023', name: 'ภัทรานิษฐ์ บูรณะ',
    registeredAt: '2026-02-11T09:20:00', clientType: 'oldContinue',
    services: ['pill'], removals: [], dispensed: true, firstServiceDate: '2026-02-11',
    status: 'active', recordedBy: 'พว.ศิริพร วงศ์สุวรรณ', recordedAt: '2026-02-11T09:20:00',
  },
  {
    id: 'fp-reg-2', fpNumber: 'วผ.69-0002', hn: '67-00015', name: 'รัตนาภรณ์ ใสสะอาด',
    registeredAt: '2026-03-04T10:05:00', clientType: 'oldChange',
    services: ['injection'], removals: [], dispensed: true, firstServiceDate: '2026-03-04',
    status: 'active', recordedBy: 'พว.อรทัย เกษมสุข', recordedAt: '2026-03-04T10:05:00',
  },
  {
    id: 'fp-reg-3', fpNumber: 'วผ.69-0003', hn: '67-00011', name: 'อรอุมา ดวงสว่าง',
    registeredAt: '2026-03-27T13:44:00', clientType: 'oldContinue',
    services: ['iud'], removals: [], dispensed: false, firstServiceDate: '2026-03-27',
    status: 'active', recordedBy: 'พว.ศิริพร วงศ์สุวรรณ', recordedAt: '2026-03-27T13:44:00',
  },
  {
    id: 'fp-reg-4', fpNumber: 'วผ.69-0004', hn: '67-00027', name: 'จิราพร มณีโชติ',
    registeredAt: '2026-04-18T09:02:00', clientType: 'oldReturn',
    services: ['condom'], removals: [], dispensed: false, firstServiceDate: '2026-04-18',
    status: 'active', recordedBy: 'พว.ชุติมา ธารทอง', recordedAt: '2026-04-18T09:02:00',
  },
  {
    id: 'fp-reg-5', fpNumber: 'วผ.69-0005', hn: '67-00021', name: 'วรรณภา ทองดี',
    registeredAt: '2026-05-06T11:26:00', clientType: 'oldContinue',
    services: ['iud'], removals: ['implant'], dispensed: false, firstServiceDate: '2026-05-06',
    status: 'active', recordedBy: 'พว.ศิริพร วงศ์สุวรรณ', recordedAt: '2026-05-06T11:26:00',
  },
  {
    id: 'fp-reg-6', fpNumber: 'วผ.69-0006', hn: '67-00007', name: 'มาลี อ่อนน้อม',
    registeredAt: '2026-05-29T14:12:00', clientType: 'oldContinue',
    services: ['tubal'], removals: ['iud'], dispensed: false, firstServiceDate: '2026-05-29',
    status: 'active', recordedBy: 'พว.อรทัย เกษมสุข', recordedAt: '2026-05-29T14:12:00',
  },
  {
    id: 'fp-reg-7', fpNumber: 'วผ.69-0007', hn: '67-00019', name: 'นันทิดา พรเลิศ',
    registeredAt: '2026-06-15T10:48:00', clientType: 'oldContinue',
    services: ['implant'], removals: [], dispensed: false, firstServiceDate: '2026-06-15',
    status: 'active', recordedBy: 'พว.ชุติมา ธารทอง', recordedAt: '2026-06-15T10:48:00',
  },
  {
    id: 'fp-reg-8', fpNumber: 'วผ.69-0008', hn: '67-00017', name: 'ภัคจิรา วงศ์อนันต์',
    registeredAt: '2026-07-02T08:55:00', clientType: 'oldContinue',
    services: ['injection'], removals: [], dispensed: true, firstServiceDate: '2026-07-02',
    status: 'cancelled', recordedBy: 'พว.อรทัย เกษมสุข', recordedAt: '2026-07-02T08:55:00',
    cancellation: { reason: 'ลงทะเบียนซ้ำ — ใช้เลขที่ วผ.69-0002 แทน', by: 'พว.ศิริพร วงศ์สุวรรณ', at: '2026-07-09T15:31:00' },
  },
];

export const getFpRegistryRows = () => {
  const overlay = readJson(K.registry, {});
  const seedIds = REGISTRY_SEED.map((r) => r.id);
  const merged = REGISTRY_SEED.map((r) => (overlay[r.id] ? { ...r, ...overlay[r.id] } : r));
  const added = Object.values(overlay).filter((r) => !seedIds.includes(r.id));
  return [...merged, ...added];
};

export const getFpRegistrationByHn = (hn) =>
  getFpRegistryRows().find((r) => r.hn === hn && r.status !== 'cancelled')
  || getFpRegistryRows().find((r) => r.hn === hn)
  || null;

/** เลขที่วางแผนครอบครัว — run number ออกให้ "เมื่อบันทึกสำเร็จ" เท่านั้น
    (คู่มือ p.2-3 ข้อ 2). รูปแบบ วผ.<ปี พ.ศ. 2 หลัก>-<run 4 หลัก>. */
const nextFpNumber = () => {
  const base = 8; /* seed ใช้ไปแล้ว วผ.69-0001 … วผ.69-0008 */
  const run = readJson(K.registryRun, base) + 1;
  writeJson(K.registryRun, run);
  return `วผ.69-${String(run).padStart(4, '0')}`;
};

export const saveFpRegistration = (entry) => {
  const overlay = readJson(K.registry, {});
  const isNew = !entry.id;
  const saved = {
    ...entry,
    id: entry.id || `fp-reg-new-${Date.now()}`,
    fpNumber: entry.fpNumber || nextFpNumber(),
    registeredAt: entry.registeredAt || new Date().toISOString(),
    firstServiceDate: entry.firstServiceDate || todayIso(),
    services: entry.services || [],
    removals: entry.removals || [],
    status: entry.status || 'active',
    recordedBy: FP_CURRENT_USER,
    recordedAt: new Date().toISOString(),
  };
  overlay[saved.id] = saved;
  writeJson(K.registry, overlay);
  return { saved, isNew };
};

export const cancelFpRegistration = (id, reason) => {
  const overlay = readJson(K.registry, {});
  const current = getFpRegistryRows().find((r) => r.id === id);
  if (!current) return;
  overlay[id] = {
    ...current,
    status: 'cancelled',
    cancellation: { reason: reason || '', by: FP_CURRENT_USER, at: new Date().toISOString() },
  };
  writeJson(K.registry, overlay);
};

export const reactivateFpRegistration = (id) => {
  const overlay = readJson(K.registry, {});
  const current = getFpRegistryRows().find((r) => r.id === id);
  if (!current) return;
  overlay[id] = { ...current, status: 'active', cancellation: null };
  writeJson(K.registry, overlay);
};

/* ── ประวัติการรับบริการ (S1 read-only table) ───────────────────── */
const FP_VISIT_HISTORY_SEED = {
  '67-00023': [
    { date: '2026-02-11', clientType: 'oldContinue', services: ['pill'], pregnancyTest: 'negative', bp: '116/74', weight: 53, note: 'จ่ายยาเม็ดคุมกำเนิด 3 แผง', savedBy: 'พว.ศิริพร วงศ์สุวรรณ', savedAt: '2026-02-11T09:35:00' },
    { date: '2026-05-13', clientType: 'oldContinue', services: ['pill'], pregnancyTest: 'notTested', bp: '118/76', weight: 54, note: 'จ่ายยาต่อเนื่อง ไม่มีอาการข้างเคียง', savedBy: 'พว.ศิริพร วงศ์สุวรรณ', savedAt: '2026-05-13T09:22:00' },
  ],
  '67-00015': [
    { date: '2026-03-04', clientType: 'oldChange', services: ['injection'], pregnancyTest: 'negative', bp: '136/86', weight: 66, note: 'เปลี่ยนจากยาเม็ดเป็นยาฉีด DMPA', savedBy: 'พว.อรทัย เกษมสุข', savedAt: '2026-03-04T10:30:00' },
    { date: '2026-06-02', clientType: 'oldContinue', services: ['injection'], pregnancyTest: 'notTested', bp: '140/90', weight: 67, note: 'ความดันเริ่มสูง — แนะนำติดตาม', savedBy: 'พว.อรทัย เกษมสุข', savedAt: '2026-06-02T10:11:00' },
  ],
  '67-00021': [
    { date: '2026-05-06', clientType: 'oldContinue', services: ['iud'], pregnancyTest: 'negative', bp: '124/78', weight: 61, note: 'ใส่ห่วงอนามัย Copper T 380A', savedBy: 'พว.ศิริพร วงศ์สุวรรณ', savedAt: '2026-05-06T11:50:00' },
  ],
  '67-00019': [
    { date: '2026-06-15', clientType: 'oldContinue', services: ['implant'], pregnancyTest: 'negative', bp: '110/70', weight: 52, note: 'ฝังยาคุมกำเนิด 3 ปี + ดูแลมารดาหลังคลอดครั้งที่ 1', savedBy: 'พว.ชุติมา ธารทอง', savedAt: '2026-06-15T11:05:00' },
  ],
  '67-00007': [
    { date: '2026-05-29', clientType: 'oldContinue', services: ['tubal'], pregnancyTest: 'notTested', bp: '130/82', weight: 64, note: 'ทำหมันหญิงแล้ว — ตรวจเต้านมประจำปี ปกติ', savedBy: 'พว.อรทัย เกษมสุข', savedAt: '2026-05-29T14:40:00' },
  ],
};

export const getFpVisitRecords = (hn) => {
  if (!hn) return [];
  const stored = readJson(K.visits, {});
  return [...(FP_VISIT_HISTORY_SEED[hn] || []), ...(stored[hn] || [])];
};

export const saveFpVisitRecord = (hn, form) => {
  if (!hn) return null;
  const stored = readJson(K.visits, {});
  const record = {
    ...form,
    date: form.serviceDate || todayIso(),
    savedBy: FP_CURRENT_USER,
    savedAt: new Date().toISOString(),
  };
  stored[hn] = [...(stored[hn] || []), record];
  writeJson(K.visits, stored);
  return record;
};

/* ── ร่างแบบฟอร์ม (แท็บ "ที่ร่างไว้") ─────────────────────────────── */
export const saveFpDraft = (hn, form, stepIndex) => {
  if (!hn) return;
  const store = readJson(K.drafts, {});
  store[hn] = { form, stepIndex, savedAt: new Date().toISOString(), savedBy: FP_CURRENT_USER };
  writeJson(K.drafts, store);
};

export const getFpDraft = (hn) => (hn ? readJson(K.drafts, {})[hn] || null : null);

export const clearFpDraft = (hn) => {
  if (!hn) return;
  const store = readJson(K.drafts, {});
  delete store[hn];
  writeJson(K.drafts, store);
};

/* ── พิมพ์บัตรติดตามวางแผนครอบครัว (คู่มือ p.2-8/2-9) ─────────────── */
export const logFpPrint = (hn, docType) => {
  if (!hn) return;
  const store = readJson(K.printLog, {});
  store[hn] = [...(store[hn] || []), { docType, by: FP_CURRENT_USER, at: new Date().toISOString() }];
  writeJson(K.printLog, store);
};

export const getFpPrintLog = (hn) => (hn ? readJson(K.printLog, {})[hn] || [] : []);

/** ข้อมูลบนบัตรติดตามวางแผนครอบครัว — เลขที่ วผ., ชนิดบริการ,
    วันเริ่มบริการครั้งแรก, ตารางนัดหมาย (คู่มือ p.2-9). */
export const buildFpFollowUpCard = ({ registration, patient, visits = [], appointment }) => {
  /* แสดง 6 ครั้งล่าสุด — เลขครั้งต้องเป็นลำดับจริงของการรับบริการ
     ไม่ใช่นับ 1 ใหม่ (เช่นมี 8 ครั้ง → แสดงครั้งที่ 3–8) */
  const start = Math.max(0, visits.length - 6);
  const rows = visits.slice(-6).map((v, i) => ({
    no: start + i + 1,
    date: v.date,
    service: summarizeFpServices(v.services || []),
    by: v.savedBy || FP_CURRENT_USER,
  }));
  return {
    fpNumber: registration?.fpNumber || '—',
    hn: registration?.hn || patient?.hn || '—',
    name: registration?.name || patient?.name || '—',
    firstServiceDate: registration?.firstServiceDate || '—',
    services: summarizeFpServices(registration?.services || []),
    rows,
    nextAppointment: appointment?.date && !appointment?.cancelled
      ? `${formatFpDate(appointment.date)}${appointment.time ? ` เวลา ${appointment.time} น.` : ''}`
      : 'ยังไม่มีนัดหมาย',
  };
};
