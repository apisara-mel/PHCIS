/* socialWorkReporting.js — selector รวมศูนย์สำหรับ "รายงานที่เกี่ยวข้องทาง
   สังคมสงเคราะห์" 12 ฉบับ (มติ คทง.10 ครั้งที่ 4–5) และนโยบาย PDPA 3 ระดับ.

   หน้ารายงานเรียกจากไฟล์นี้ที่เดียว ไม่กระจายตรรกะการรวมข้อมูลไปอยู่บนหน้าจอ
   — ข้อมูลมาจาก 5 แหล่ง: ทะเบียน ส.ส.1 · แบบ ส.ส.2 (visit records + แบบย่อย) ·
   ส่งต่อ ส.ส.3 · กิจกรรม ส.ส.4 · วัสดุ-อุปกรณ์ และเคสโภชนาการ.

   PDPA 3 ระดับ (แบบฟอร์มรายงานทั้ง 12 ฉบับระบุตรงกัน):
     • ระดับ ศบส.            → ดูละเอียดเฉพาะหน่วยตน · แสดง PII (HN/ชื่อ/เลขบัตร)
     • ระดับสำนักงาน (กอง)   → ดูสรุปทุกศูนย์ · ไม่แสดง PII · drill-down รหัสนิรนาม
     • ระดับผู้บริหารสำนัก   → ดูสรุป/แนวโน้ม · ไม่แสดง PII · drill-down รหัสนิรนาม
   ใช้ค่าคงที่ dataScope / piiVisibility ของ accessControlStore เป็นสัญญาเดียวกัน
   กับระบบจัดการสิทธิ์ และต้อง sanitize ทั้งบนจอ ใน popup ดูรายงาน และในไฟล์
   export (ผ่าน sanitizeExportReportMeta) ให้สอดคล้องกัน มิฉะนั้นถือว่า fail §1.4.2 */

import {
  SCOPE_CENTER, SCOPE_ALL, PII_VISIBLE, PII_MASKED,
} from '@/data/accessControlStore';
import {
  SW_CURRENT_USER,
  SW_HOME_CENTER,
  SW_CROSS_CENTER_VISITS,
  SW_QUEUE_PATIENTS,
  SW_TARGET_GROUPS,
  resolveSwTargetGroup,
  resolveSwIntakeChannel,
  resolveSwClientType,
  getSwRegistryRows,
  calcAgeYears,
  thaiFiscalYear,
  fiscalYearBounds,
  formatSwDate,
} from '@/data/socialWorkClinic';
import {
  swProblemCategoryOf, resolveSwProblemCodeLabel, resolveSwProblemCategoryLabel,
  findSwProblemCode,
} from '@/data/socialWorkProblems';
import { getSwReferrals, resolveSwReferralAgency, resolveSwReferralStatus } from '@/data/socialWorkReferrals';
import {
  getSwActivities, resolveSwActivity, resolveSwSubActivity, resolveSwContactChannel,
} from '@/data/socialWorkActivities';
import { getSwIssues, findSwMaterial } from '@/data/socialWorkSupplies';
import {
  getSwNutritionCases, resolveSwNutriGroup, assessSwNutritionCase, resolveNutriMaterialLabel,
} from '@/data/socialWorkNutrition';

const storageAvailable = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const readJson = (key, fallback) => {
  if (!storageAvailable()) return fallback;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!storageAvailable()) return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
};

const K = { viewer: 'mih:sw:report-viewer' };

/* ── ระดับผู้ดูรายงาน (PDPA 3 ระดับ) ───────────────────────────────── */
export const SW_REPORT_ROLES = [
  {
    value: 'center',
    label: 'ระดับศูนย์บริการสาธารณสุข',
    hint: 'ดูละเอียดเฉพาะหน่วยตน · แสดง HN / ชื่อ / เลขบัตร',
    dataScope: SCOPE_CENTER,
    piiVisibility: PII_VISIBLE,
    downloads: ['Excel', 'PDF', 'CSV'],
  },
  {
    value: 'office',
    label: 'ระดับสำนักงาน (กอง)',
    hint: 'ดูสรุปทุกศูนย์ · ไม่แสดง PII · drill-down ใช้รหัสนิรนาม',
    dataScope: SCOPE_ALL,
    piiVisibility: PII_MASKED,
    downloads: ['PDF', 'CSV'],
  },
  {
    value: 'executive',
    label: 'ระดับผู้บริหารสำนักอนามัย',
    hint: 'ดูสรุป/แนวโน้ม · ไม่แสดง PII · drill-down ใช้รหัสนิรนาม',
    dataScope: SCOPE_ALL,
    piiVisibility: PII_MASKED,
    downloads: ['PDF'],
  },
];

export const getSwReportViewer = () => {
  const value = readJson(K.viewer, 'center');
  return SW_REPORT_ROLES.find((r) => r.value === value) || SW_REPORT_ROLES[0];
};

export const setSwReportViewer = (value) => writeJson(K.viewer, value);

export const swPiiHidden = () => getSwReportViewer().piiVisibility === PII_MASKED;

/** รหัสนิรนามคงที่ต่อ HN — ใช้แทน HN/ชื่อ/เลขบัตรในระดับกอง/ผู้บริหาร */
export const anonCode = (hn) => {
  const key = String(hn || '');
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  return `AN-${String(Math.abs(hash) % 100000).padStart(5, '0')}`;
};

export const SW_ANON_LABEL = '—';

/**
 * ปิดบัง PII ของแถวรายงานตามระดับผู้ดู
 * คีย์ที่ถือเป็น PII: hn · name · cid · currentAddress · informant · phone
 */
export const sanitizeSwRow = (row) => {
  if (!swPiiHidden()) return row;
  const next = { ...row };
  const code = anonCode(row.hn || row.name || row.id);
  if ('hn' in next) next.hn = code;
  if ('name' in next) next.name = code;
  if ('cid' in next) next.cid = SW_ANON_LABEL;
  if ('birthDate' in next) next.birthDate = SW_ANON_LABEL;
  if ('currentAddress' in next) next.currentAddress = SW_ANON_LABEL;
  if ('informant' in next) next.informant = SW_ANON_LABEL;
  if ('phone' in next) next.phone = SW_ANON_LABEL;
  if ('caseNo' in next) next.caseNo = code;
  if ('sn' in next) next.sn = code;
  next.anonymized = true;
  return next;
};

export const sanitizeSwRows = (rows) => (rows || []).map(sanitizeSwRow);

/* ── ตัวช่วยช่วงเวลา (วัน / เดือน / ปีงบประมาณไทย) ────────────────── */
export const SW_RANGE_MODES = [
  { value: 'date', label: 'ช่วงวันที่' },
  { value: 'month', label: 'รายเดือน' },
  { value: 'monthRange', label: 'ช่วงเดือน' },
  { value: 'fiscal', label: 'ปีงบประมาณ' },
];

/**
 * แปลงค่าตัวกรองช่วงเวลาเป็น { from, to, label }
 * @param {{ mode, from, to, month, year, monthFrom, monthTo, fiscalYear }} v
 */
export const resolveSwRange = (v) => {
  const mode = v?.mode || 'fiscal';
  if (mode === 'date') {
    return { from: v.from || '', to: v.to || '', label: `${v.from ? formatSwDate(v.from) : '—'} ถึง ${v.to ? formatSwDate(v.to) : '—'}` };
  }
  if (mode === 'month' && v.month && v.year) {
    const ce = Number(v.year) - 543;
    const mm = String(v.month).padStart(2, '0');
    const last = new Date(ce, Number(v.month), 0).getDate();
    return { from: `${ce}-${mm}-01`, to: `${ce}-${mm}-${last}`, label: `เดือน ${mm}/${v.year}` };
  }
  if (mode === 'monthRange' && v.monthFrom && v.monthTo && v.year) {
    const ce = Number(v.year) - 543;
    const mf = String(v.monthFrom).padStart(2, '0');
    const mt = String(v.monthTo).padStart(2, '0');
    const last = new Date(ce, Number(v.monthTo), 0).getDate();
    return { from: `${ce}-${mf}-01`, to: `${ce}-${mt}-${last}`, label: `เดือน ${mf}–${mt}/${v.year}` };
  }
  const fy = Number(v?.fiscalYear) || thaiFiscalYear();
  const bounds = fiscalYearBounds(fy);
  return { ...bounds, label: `ปีงบประมาณ ${fy}` };
};

export const validateSwRange = (v) => {
  const r = resolveSwRange(v);
  if (v?.mode === 'date') {
    if (!v.from || !v.to) return 'กรุณาเลือกวันที่เริ่มต้นและวันที่สิ้นสุด';
    if (v.from > v.to) return 'วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด';
  }
  if (v?.mode === 'monthRange' && Number(v.monthFrom) > Number(v.monthTo)) {
    return 'เดือนเริ่มต้นต้องไม่มากกว่าเดือนสิ้นสุด';
  }
  if (!r.from || !r.to) return 'ช่วงเวลาไม่ถูกต้อง';
  return null;
};

const inRange = (iso, from, to) => !!iso && (!from || iso >= from) && (!to || iso <= to);

/* ── seed ผลคัดกรอง 4 ชุด (รายงานฉบับที่ 6–9) ────────────────────────
   ในระบบจริงข้อมูลนี้มาจากแบบย่อยของ ส.ส.2 — seed ไว้เพื่อให้รายงานมีข้อมูล
   ย้อนหลังตั้งแต่เปิดหน้าครั้งแรก แล้ว merge กับที่ผู้ใช้บันทึกใน session */
const SCREENING_SEED = {
  childRisk: [
    { id: 'cr-1', date: '2026-04-18', hn: '67-00017', name: 'ด.ญ.ปาลิดา วงศ์อนันต์', cid: '1101100728942', birthDate: '2014-06-02', risks: ['school', 'economy'], level: 'watch', plan: 'ประสานทุนการศึกษาและติดตามการมาเรียนร่วมกับครูประจำชั้น', by: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์' },
    { id: 'cr-2', date: '2026-05-22', hn: '67-00021', name: 'ด.ช.กันตพัฒน์ ทองดี', cid: '1102200478201', birthDate: '2016-01-14', risks: ['violence', 'neglect', 'caregiver'], level: 'high', plan: 'ส่งต่อบ้านพักเด็กและครอบครัว วางแผนความปลอดภัยร่วมกับมารดา', by: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์' },
    { id: 'cr-3', date: '2026-06-30', hn: '67-00031', name: 'ด.ช.ปุณณวิช แจ่มใส', cid: '1102700845513', birthDate: '2024-03-18', risks: ['nutrition', 'economy'], level: 'watch', plan: 'เข้าโปรแกรมช่วยเหลือด้านโภชนาการและติดตามน้ำหนักทุกเดือน', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ' },
    { id: 'cr-4', date: '2026-07-15', hn: '67-00033', name: 'ด.ญ.พิมพ์ชนก ตั้งใจดี', cid: '1103700912284', birthDate: '2021-11-05', risks: [], level: 'none', plan: '', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ' },
  ],
  violence: [
    { id: 'vi-1', date: '2026-03-05', hn: '67-00021', name: 'วรรณภา ทองดี', cid: '3102200478196', types: ['physical', 'mental'], items: ['hurt', 'threat', 'fear', 'child'], level: 'high', plan: 'ประสานตำรวจในพื้นที่ ส่งต่อบ้านพักฉุกเฉิน และวางแผนความปลอดภัย', by: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์' },
    { id: 'vi-2', date: '2026-05-19', hn: '67-00007', name: 'มาลี อ่อนน้อม', cid: '3101700592318', types: ['economic'], items: ['control'], level: 'moderate', plan: 'ให้คำปรึกษาและติดตามทางโทรศัพท์ทุก 2 สัปดาห์', by: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล' },
    { id: 'vi-3', date: '2026-07-02', hn: '67-00019', name: 'นันทิดา พรเลิศ', cid: '1101400963275', types: ['mental'], items: ['threat', 'fear'], level: 'moderate', plan: 'ประสานคลินิกสุขภาพจิตและ อสส. ในพื้นที่', by: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล' },
  ],
  disability: [
    { id: 'db-1', date: '2026-03-30', hn: '67-00014', name: 'ชัยวัฒน์ ก้องเกียรติ', cid: '3100900341827', types: ['physical'], card: 'have', adl: 82, need: 'ขาเทียมใต้เข่าและการฝึกใช้งาน', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ' },
    { id: 'db-2', date: '2026-06-02', hn: '67-00022', name: 'อนุชา สมบูรณ์ทรัพย์', cid: '3100300581927', types: ['physical'], card: 'processing', adl: 65, need: 'รถเข็นนั่งและราวจับในห้องน้ำ', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ' },
    { id: 'db-3', date: '2026-01-09', hn: '67-00012', name: 'วิชัย รุ่งเรือง', cid: '3100600287451', types: ['physical', 'mental'], card: 'none', adl: 18, need: 'เตียงลม ผ้าอ้อมผู้ใหญ่ และผู้ดูแลประจำ', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ' },
  ],
  elderly: [
    { id: 'el-1', date: '2026-05-06', hn: '67-00005', name: 'สุดา ปลอดโปร่ง', cid: '3550900192864', adl: 74, band: 'ติดบ้าน', by: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล' },
    { id: 'el-2', date: '2026-02-11', hn: '67-00003', name: 'ปริญญา รัตนา', cid: '5670012380043', adl: 46, band: 'ติดบ้าน', by: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์' },
    { id: 'el-3', date: '2026-01-09', hn: '67-00012', name: 'วิชัย รุ่งเรือง', cid: '3100600287451', adl: 18, band: 'ติดเตียง', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ' },
    { id: 'el-4', date: '2026-06-24', hn: '67-00025', name: 'ภาสกร ชาญฉลาด', cid: '3100700493812', adl: 92, band: 'ติดสังคม', by: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์' },
  ],
};

/** ผลคัดกรองที่ผู้ใช้บันทึกผ่าน popup ของ ส.ส.2 ใน session นี้ */
const savedSubForms = (key) => {
  const all = readJson('mih:sw:visit-records', {});
  const rows = [];
  Object.entries(all).forEach(([hn, list]) => {
    (list || []).forEach((visit, idx) => {
      const sub = visit?.subForms?.[key];
      if (sub && sub.savedAt) {
        rows.push({
          id: `${key}-${hn}-${idx}`,
          hn,
          name: visit.patientName || hn,
          cid: visit.patientCid || '',
          date: visit.visitDate || visit.serviceDate,
          by: sub.savedBy || visit.savedBy,
          ...sub,
        });
      }
    });
  });
  return rows;
};

const screeningRows = (key, from, to) =>
  [...(SCREENING_SEED[key] || []), ...savedSubForms(key)]
    .filter((r) => inRange(r.date, from, to))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

/* ── ①  ส.ส.1 ทะเบียนรับเรื่อง ─────────────────────────────────────── */
export const swIntakeRegisterRows = (from, to) => getSwRegistryRows()
  .filter((r) => inRange(r.receivedDate, from, to))
  .map((r) => ({
    ...r,
    date: r.receivedDate,
    targetGroupLabel: resolveSwTargetGroup(r.targetGroup),
    intakeChannelLabel: resolveSwIntakeChannel(r.intakeChannel),
    clientTypeLabel: resolveSwClientType(r.clientType),
    problemCode: r.problemCode || r.firstProblem || '',
    problemLabel: resolveSwProblemCodeLabel(r.problemCode || r.firstProblem),
    statusLabel: r.status === 'cancelled' ? 'ยกเลิกทะเบียน' : 'ใช้งาน',
  }))
  .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

/* ── ②  ส.ส.2 รายงานผู้ใช้บริการ ────────────────────────────────────
   รวมการมารับบริการที่บันทึกในระบบ (seed ข้ามศูนย์ที่เป็นของศูนย์ตนเอง +
   ที่บันทึกผ่านหน้า ส.ส.2 ใน session) */
export const swServiceVisitRows = (from, to) => {
  const seed = SW_CROSS_CENTER_VISITS
    .filter((v) => v.center === SW_HOME_CENTER.code)
    .map((v) => {
      const queue = SW_QUEUE_PATIENTS.find((q) => q.hn === v.hn);
      const reg = getSwRegistryRows().find((r) => r.hn === v.hn);
      return {
        id: `${v.hn}-${v.visitDate}`,
        date: v.visitDate,
        hn: v.hn,
        sn: v.sn,
        name: v.name,
        cid: v.cid,
        birthDate: v.birthDate,
        age: calcAgeYears(v.birthDate, v.visitDate),
        sex: v.sex,
        caseNo: reg?.caseNo || '',
        targetGroup: queue?.targetGroup || reg?.targetGroup || 'elderly',
        intakeChannel: queue?.intakeChannel || reg?.intakeChannel || 'walkin',
        clientType: queue?.clientType || reg?.clientType || 'old',
        problemCode: v.problemCode,
        worker: queue?.worker || reg?.owner || SW_CURRENT_USER,
        center: v.center,
        centerName: v.centerName,
      };
    });

  const stored = readJson('mih:sw:visit-records', {});
  const saved = [];
  Object.entries(stored).forEach(([hn, list]) => {
    (list || []).forEach((visit, idx) => {
      saved.push({
        id: `saved-${hn}-${idx}`,
        date: visit.visitDate || visit.serviceDate,
        hn,
        sn: visit.sn || '',
        name: visit.patientName || hn,
        cid: visit.patientCid || '',
        birthDate: visit.patientBirthDate || '',
        age: visit.patientAge || null,
        sex: visit.patientSex || '',
        caseNo: visit.caseNo || '',
        targetGroup: visit.targetGroup,
        intakeChannel: visit.intakeChannel,
        clientType: visit.clientType,
        problemCode: visit.subForms?.diagnosis?.primaryProblem || visit.primaryProblem,
        worker: visit.savedBy || SW_CURRENT_USER,
        center: SW_HOME_CENTER.code,
        centerName: SW_HOME_CENTER.name,
      });
    });
  });

  return [...seed, ...saved]
    .filter((r) => inRange(r.date, from, to))
    .map((r) => ({
      ...r,
      targetGroupLabel: resolveSwTargetGroup(r.targetGroup),
      intakeChannelLabel: resolveSwIntakeChannel(r.intakeChannel),
      clientTypeLabel: resolveSwClientType(r.clientType),
      problemLabel: resolveSwProblemCodeLabel(r.problemCode),
      problemCategory: swProblemCategoryOf(r.problemCode),
      problemCategoryLabel: resolveSwProblemCategoryLabel(swProblemCategoryOf(r.problemCode)),
    }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
};

/* ── ③  ส.ส.3 การส่งต่อ ────────────────────────────────────────────── */
export const swReferralRows = (from, to) => getSwReferrals()
  .filter((r) => inRange(r.issueDate, from, to))
  .map((r) => ({
    ...r,
    date: r.issueDate,
    agencyLabel: resolveSwReferralAgency(r.agency),
    statusLabel: r.status === 'cancelled' ? 'ยกเลิกใบส่งต่อ' : resolveSwReferralStatus(r.status),
    problemLabel: resolveSwProblemCodeLabel(r.problemCode),
    replyCount: (r.replies || []).length,
  }));

/* ── ④  ส.ส.4 กิจกรรม ──────────────────────────────────────────────── */
export const swActivityRows = (from, to) => getSwActivities()
  .filter((r) => inRange(r.date, from, to))
  .map((r) => ({
    ...r,
    activityLabel: resolveSwActivity(r.activity),
    subActivityLabel: resolveSwSubActivity(r.activity, r.subActivity),
    channelLabel: resolveSwContactChannel(r.channel),
    teamLabel: (r.team || []).join(', '),
    participantLabel: (r.participants || []).join(', '),
    imageCount: (r.images || []).length,
    statusLabel: r.status === 'cancelled' ? 'ยกเลิกกิจกรรม' : 'บันทึกแล้ว',
  }));

/* ── ⑥–⑨ ผลคัดกรอง 4 ชุด ───────────────────────────────────────────── */
export const swChildRiskRows = (from, to) => screeningRows('childRisk', from, to);
export const swViolenceRows = (from, to) => screeningRows('violence', from, to);
export const swDisabilityRows = (from, to) => screeningRows('disability', from, to);
export const swElderlyRows = (from, to) => screeningRows('elderly', from, to);

/* ── ⑩ การช่วยเหลือวัสดุและอุปกรณ์ทางการแพทย์ ─────────────────────── */
export const swSupplyIssueRows = (from, to) => getSwIssues()
  .filter((r) => inRange(r.issueDate, from, to))
  .map((r) => ({
    ...r,
    date: r.issueDate,
    materialLabel: findSwMaterial(r.materialCode)?.name || r.materialCode || '—',
    category: findSwMaterial(r.materialCode)?.category || '',
    statusLabel: r.status === 'cancelled' ? 'ยกเลิกรายการจ่าย' : 'จ่ายออกแล้ว',
  }))
  .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

/* ── ⑫ การช่วยเหลือด้านโภชนาการ ─────────────────────────────────────
   กระจายเป็นรายครั้งที่ให้การช่วยเหลือ (visit) เพื่อให้นับ "ครั้ง" ได้ตรง */
export const swNutritionRows = (from, to) => {
  const rows = [];
  getSwNutritionCases().forEach((entry) => {
    (entry.visits || []).forEach((v) => {
      if (!inRange(v.date, from, to)) return;
      const assess = assessSwNutritionCase(entry, v);
      rows.push({
        id: `${entry.id}-${v.id}`,
        caseId: entry.id,
        date: v.date,
        group: entry.group,
        groupLabel: resolveSwNutriGroup(entry.group),
        hn: entry.hn,
        sn: entry.sn,
        name: entry.name,
        cid: entry.cid,
        birthDate: entry.birthDate,
        materialLabel: resolveNutriMaterialLabel(entry.group, v.material),
        size: v.size,
        qty: v.qty,
        unit: v.unit,
        assessment: assess?.summary || 'ยังประเมินไม่ครบ',
        tone: assess?.tone || 'neutral',
        status: v.cancelled ? 'cancelled' : entry.status,
        statusLabel: v.cancelled
          ? 'ยกเลิกรายการ'
          : (entry.status === 'ended' ? 'ยุติการช่วยเหลือแล้ว' : (entry.status === 'cancelled' ? 'ยกเลิกเคส' : 'อยู่ระหว่างช่วยเหลือ')),
        endedReason: entry.endedReason || '',
        by: v.by,
      });
    });
  });
  return rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
};

/* ── ⑪ สถานการณ์ปัญหาทางสังคม — นับตามหมวด 01–17 และรหัส 4 หลัก ────── */
export const swProblemSituation = (from, to) => {
  const visits = swServiceVisitRows(from, to);
  const byCategory = new Map();
  const byCode = new Map();
  visits.forEach((v) => {
    if (!v.problemCode) return;
    const cat = swProblemCategoryOf(v.problemCode);
    byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
    byCode.set(v.problemCode, (byCode.get(v.problemCode) || 0) + 1);
  });
  const categoryRows = [...byCategory.entries()]
    .map(([code, count]) => ({
      id: code,
      code,
      label: resolveSwProblemCategoryLabel(code),
      count,
      percent: visits.length ? Math.round((count / visits.length) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
  const codeRows = [...byCode.entries()]
    .map(([code, count]) => ({
      id: code,
      code,
      label: resolveSwProblemCodeLabel(code),
      categoryLabel: resolveSwProblemCategoryLabel(swProblemCategoryOf(code)),
      sensitive: !!findSwProblemCode(code)?.sensitive,
      count,
    }))
    .sort((a, b) => b.count - a.count);
  return { total: visits.length, categoryRows, codeRows };
};

/* ── ⑤ ส.ส.5 Workload — รวมข้ามหน้าทั้งหมด ────────────────────────── */
export const swWorkloadRows = (from, to) => {
  const visits = swServiceVisitRows(from, to);
  const referrals = swReferralRows(from, to).filter((r) => r.status !== 'cancelled');
  const activities = swActivityRows(from, to).filter((r) => r.status !== 'cancelled');
  const supplies = swSupplyIssueRows(from, to).filter((r) => r.status !== 'cancelled');
  const nutrition = swNutritionRows(from, to).filter((r) => r.status !== 'cancelled');
  const register = swIntakeRegisterRows(from, to).filter((r) => r.status !== 'cancelled');

  const uniquePeople = new Set(visits.map((v) => v.hn)).size;
  const newCases = register.filter((r) => r.clientType === 'new').length;

  return [
    { id: 'wl-1', item: 'ทะเบียนรับเรื่องผู้ใช้บริการ (ส.ส.1)', unit: 'เรื่อง', count: register.length, newCount: newCases },
    { id: 'wl-2', item: 'การให้บริการรายบุคคล (ส.ส.2)', unit: 'ครั้ง', count: visits.length, newCount: uniquePeople },
    { id: 'wl-3', item: 'การส่งต่อผู้ใช้บริการ (ส.ส.3)', unit: 'เรื่อง', count: referrals.length, newCount: new Set(referrals.map((r) => r.hn)).size },
    { id: 'wl-4', item: 'กิจกรรมทางสังคมสงเคราะห์ (ส.ส.4)', unit: 'ครั้ง', count: activities.length, newCount: activities.reduce((s, a) => s + (Number(a.count) || 0), 0) },
    { id: 'wl-5', item: 'การจ่ายวัสดุและอุปกรณ์ทางการแพทย์', unit: 'รายการ', count: supplies.length, newCount: new Set(supplies.map((s) => s.hn)).size },
    { id: 'wl-6', item: 'การช่วยเหลือด้านโภชนาการ', unit: 'ครั้ง', count: nutrition.length, newCount: new Set(nutrition.map((n) => n.hn)).size },
    { id: 'wl-7', item: 'การคัดกรองเด็กเสี่ยง', unit: 'ราย', count: swChildRiskRows(from, to).length, newCount: swChildRiskRows(from, to).filter((r) => r.level === 'high').length },
    { id: 'wl-8', item: 'การคัดกรองความรุนแรงในครอบครัว', unit: 'ราย', count: swViolenceRows(from, to).length, newCount: swViolenceRows(from, to).filter((r) => r.level === 'high').length },
    { id: 'wl-9', item: 'การประเมินความพิการ', unit: 'ราย', count: swDisabilityRows(from, to).length, newCount: swDisabilityRows(from, to).filter((r) => r.card !== 'have').length },
    { id: 'wl-10', item: 'การคัดกรองผู้สูงอายุ (ADL)', unit: 'ราย', count: swElderlyRows(from, to).length, newCount: swElderlyRows(from, to).filter((r) => Number(r.adl) <= 11).length },
  ];
};

/** สรุปตัวเลขสำหรับการ์ด KPI ด้านบนหน้ารายงาน */
export const swReportSummary = (from, to) => {
  const visits = swServiceVisitRows(from, to);
  const referrals = swReferralRows(from, to).filter((r) => r.status !== 'cancelled');
  const activities = swActivityRows(from, to).filter((r) => r.status !== 'cancelled');
  const nutrition = swNutritionRows(from, to).filter((r) => r.status !== 'cancelled');
  const highRisk = swChildRiskRows(from, to).filter((r) => r.level === 'high').length
    + swViolenceRows(from, to).filter((r) => r.level === 'high').length;
  return {
    visits: visits.length,
    people: new Set(visits.map((v) => v.hn)).size,
    referrals: referrals.length,
    activities: activities.length,
    nutrition: nutrition.length,
    highRisk,
  };
};

/** กลุ่มเป้าหมายที่ใช้เป็นตัวกรองของทุกรายงาน */
export const SW_REPORT_TARGET_OPTIONS = [
  { value: 'all', label: 'ทุกกลุ่มเป้าหมาย' },
  ...SW_TARGET_GROUPS,
];

export default swReportSummary;
