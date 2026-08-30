/* เวชระเบียน → จุดคัดกรอง — ข้อมูลที่ห้องบัตรบันทึกไว้ต้องไปปรากฏที่หน้าคัดกรอง
   **ยกเว้น** ข้อมูลส่วนตัว · ที่อยู่ · ข้อมูลการติดต่อ (มติผู้ใช้ 29 ส.ค. 69)
   สามหมวดนั้นเป็นข้อมูลระบุตัวบุคคลที่หัวแฟ้ม (PatientCard) แสดงเท่าที่จำเป็น
   อยู่แล้ว จุดคัดกรองไม่มีเหตุต้องอ่านซ้ำ — สิ่งที่จุดคัดกรองต้องเห็นคือ
   *สิทธิการรักษา* กับ *หมายเหตุและ Flag* ซึ่งเปลี่ยนวิธีให้บริการทันที

   ที่หน้าคัดกรองข้อมูลชุดนี้เป็น **ข้อความอ่านอย่างเดียว** — การแก้ไขทำที่หน้า
   เวชระเบียนเสมอ (สอดคล้องกับของจริงที่ศูนย์ฯ: การปิดสิทธิ์/เปลี่ยนสิทธิ์ทำที่
   ห้องบัตรและห้องเงินเท่านั้น — บันทึกลงพื้นที่ ส.ค. 69 ศบส. 28)

   เก็บใน sessionStorage แบบเดียวกับ opdScreeningDrafts / opdWalkinRequests. */

import { findMrPatientByHn } from './mrPatients';
import { resolveSource, HOMEVISIT_SOURCES } from './homevisitVisits';
import { TREATMENT_PATIENT_FLAG_OVERRIDES } from './treatmentPatientFlags';
import {
  SAFETY_RISK_OPTIONS,
  ORGAN_DONATION_SCOPES,
  buildRegistrationFlagSources,
  patientGroupLabel,
  PATIENT_GROUP_OPTIONS,
} from './registrationForm';

const HANDOFF_KEY = 'mih:registration-handoff';

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const readMap = (key) => {
  if (!canUseSessionStorage()) return {};
  try {
    const raw = window.sessionStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeMap = (key, value) => {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — หน้าจอยังทำงานต่อได้ด้วย fallback */
  }
};

/* ระดับความรุนแรงมาจากสองที่: ทะเบียนใหม่ใช้ low/medium/high ส่วนผู้ป่วย seed
   ในทะเบียนกลางใช้ mild/medium/high/critical — แปลงเป็นคำไทยชุดเดียว */
const SEVERITY_LABELS = {
  low: 'น้อย', mild: 'น้อย',
  medium: 'ปานกลาง',
  high: 'มาก',
  critical: 'รุนแรงมาก',
};

export const severityLabel = (value) => SEVERITY_LABELS[value] || '';

const labelsOf = (options, keys) => (keys || [])
  .map((k) => options.find((o) => o.key === k)?.label)
  .filter(Boolean);

const entryLine = (e) => {
  if (!e) return '';
  const detail = [e.symptom || e.detail, severityLabel(e.severity)].filter(Boolean).join(' · ');
  return [e.name, detail && `(${detail})`].filter(Boolean).join(' ');
};

const cleanEntries = (list) => (list || [])
  .filter((e) => String(e?.name || '').trim())
  .map((e) => ({
    name: e.name,
    symptom: e.symptom || e.detail || '',
    severity: e.severity || '',
  }));

/** สิทธิการรักษาที่ทะเบียนตรวจสอบไว้ — ใบแรกของแต่ละกลุ่มคือสิทธิที่ใช้จริง */
const rightsFromForm = (form) => (form?.rightsGroups || []).map((g) => ({
  title: g.title,
  primary: g.priorityItems?.[0]?.label || '',
  role: g.priorityItems?.[0]?.role || '',
  items: (g.priorityItems || []).map((i) => i.label).filter(Boolean),
}));

/** สิ่งที่จุดคัดกรองต้องเห็น — ไม่มีชื่อ ที่อยู่ หรือเบอร์โทรอยู่ในนี้โดยตั้งใจ */
export const buildRegistrationHandoff = (form) => ({
  savedAt: new Date().toISOString(),
  /* ทะเบียนต้นทาง — เวชระเบียนเยี่ยมบ้านเก็บ ๖ กลุ่มผู้รับบริการกับประเภท
     รับ–ส่งต่อ ส่วนทะเบียนของศูนย์ไม่มีสองอย่างนี้ */
  registryKey: form?.registryKey || 'center',
  rights: rightsFromForm(form),
  patientGroup: patientGroupLabel(form?.patientGroup),
  /* งานเยี่ยมบ้านต้องเห็นว่าเคสมาจากไหน — "รับจาก <แหล่ง>" หรือ "ศูนย์พบเอง" */
  homevisitIntake: form?.homevisitIntake === 'received'
    ? `รับจาก ${resolveSource(form?.homevisitSource)?.label || 'ไม่ระบุแหล่งที่มา'}`
    : (form?.homevisitIntake === 'centerFound' ? 'ศูนย์พบเอง' : ''),
  mobility: form?.mobility === 'other' ? (form?.mobilityOther || 'อื่นๆ') : (form?.mobility || ''),
  flags: { ...(form?.flags || {}) },
  flagSources: buildRegistrationFlagSources(form),
  flagOtherNote: form?.flagOtherNote || '',
  safetyRisks: labelsOf(SAFETY_RISK_OPTIONS, form?.safetyRisks),
  organDonorScopes: labelsOf(ORGAN_DONATION_SCOPES, form?.organDonorScopes),
  drugAllergies: cleanEntries(form?.drugAllergies),
  foodAllergies: cleanEntries(form?.foodAllergies),
  chemicalAllergies: cleanEntries(form?.chemicalAllergies),
  chronicConditions: cleanEntries(form?.chronicConditions),
});

/** เรียกตอนกด "บันทึกและส่งต่อ" ที่หน้าเวชระเบียน */
export const publishRegistrationHandoff = (hn, form) => {
  if (!hn) return null;
  const record = buildRegistrationHandoff(form);
  const map = readMap(HANDOFF_KEY);
  map[hn] = record;
  writeMap(HANDOFF_KEY, map);
  return record;
};

/* ใครอยู่ใน "เวชระเบียนเยี่ยมบ้าน" — เดโมยังไม่มีทะเบียนจริง จึงชี้ด้วยกติกาที่
   คำนวณจาก HN ตรง ๆ เพื่อให้ทุกหน้าตอบตรงกันว่าใครอยู่เล่มไหน: คิวคัดกรอง
   แยกสองจุดด้วยค่านี้ และการ์ด "ข้อมูลจากเวชระเบียน" ก็อ่านค่าเดียวกัน
   (มติผู้ใช้ 29 ส.ค. 69) — วันที่มีทะเบียนจริง เปลี่ยนที่ฟังก์ชันนี้ที่เดียว */
const hnSeed = (hn = '') => String(hn).split('').reduce((a, c) => a + c.charCodeAt(0), 0);

export const isHomeVisitPatient = (hn) => Boolean(hn) && hnSeed(hn) % 4 === 2;

const HOMEVISIT_AUTO_SOURCES = HOMEVISIT_SOURCES.filter((o) => o.auto);

/* ผู้ป่วย seed ของเดโมไม่ได้เดินผ่านหน้าเวชระเบียนในเซสชันนี้ ถ้าไม่มี fallback
   หน้าคัดกรองจะว่างเปล่าทั้งที่ทะเบียนกลางมีข้อมูลอยู่ — ประกอบจาก
   `mrPatients` + overlay ของ `treatmentPatientFlags` (ที่มาเดียวกับป้ายใน
   หน้าบันทึกการรักษา) เพื่อให้สามหน้าจอเล่าเรื่องเดียวกัน */
const buildFallbackHandoff = (hn) => {
  const patient = findMrPatientByHn(hn);
  if (!patient) return null;
  const overlay = TREATMENT_PATIENT_FLAG_OVERRIDES[hn] || {};
  const { source = {}, ...overlayFlags } = overlay;
  const flags = {
    ...(patient.flags || {}),
    safety: !!overlayFlags.fallRisk,
    dnr: !!overlayFlags.dnr,
    organDonor: !!overlayFlags.organDonor,
  };
  /* เคสของงานเยี่ยมบ้านต้องเห็นสิ่งที่ทะเบียนเล่มนั้นถาม (๖ กลุ่มผู้รับบริการ ·
     ประเภทรับ–ส่งต่อ) ไม่ใช่ตกไปใช้หน้าตาของทะเบียนศูนย์ */
  const homeVisit = isHomeVisitPatient(hn);
  const seed = hnSeed(hn);
  const autoSource = HOMEVISIT_AUTO_SOURCES[seed % HOMEVISIT_AUTO_SOURCES.length];
  return {
    savedAt: '',
    fallback: true,
    registryKey: homeVisit ? 'home-visit' : 'center',
    patientGroup: homeVisit
      ? PATIENT_GROUP_OPTIONS[seed % PATIENT_GROUP_OPTIONS.length].label
      : '',
    homevisitIntake: homeVisit
      ? (seed % 3 === 0 ? 'ศูนย์พบเอง' : `รับจาก ${autoSource.label}`)
      : '',
    rights: patient.rights
      ? [{ title: 'สิทธิที่ 1', primary: patient.rights, role: 'เจ้าของสิทธิ (ตนเอง)', items: [patient.rights] }]
      : [],
    mobility: patient.mobility || '',
    flags,
    flagSources: {
      safety: source.fallRisk || '',
      dnr: source.dnr || '',
      organDonor: source.organDonor || '',
    },
    flagOtherNote: '',
    safetyRisks: overlayFlags.fallRisk ? ['เสี่ยงพลัดตกหกล้ม'] : [],
    organDonorScopes: overlayFlags.organDonor ? ['บริจาคอวัยวะ'] : [],
    drugAllergies: cleanEntries(patient.drugAllergies),
    foodAllergies: [],
    chemicalAllergies: [],
    chronicConditions: cleanEntries(patient.chronicDiseases),
  };
};

/** อ่านข้อมูลทะเบียนของผู้รับบริการรายหนึ่ง — คืน null เมื่อไม่รู้จัก HN */
export const getRegistrationHandoff = (hn) => {
  if (!hn) return null;
  return readMap(HANDOFF_KEY)[hn] || buildFallbackHandoff(hn);
};

/** รายการข้อความของ Flag ทั้งหมด — ใช้ทั้งการ์ดสรุปและขั้นตรวจสอบข้อมูล */
export const handoffFlagLines = (handoff) => {
  if (!handoff) return [];
  const f = handoff.flags || {};
  const src = handoff.flagSources || {};
  const lines = [];
  const push = (label, value) => { if (value) lines.push({ label, value }); };
  /* ป้ายหัวข้อและลำดับตรงกับแท็บของขั้น "หมายเหตุและ Flag" ในหน้าลงทะเบียน
     ตัวต่อตัว — คนที่อ่านสองหน้าต่อกันต้องเห็นคำเดียวกัน (มติผู้ใช้ 29 ส.ค. 69) */
  push('แพ้ยา', (handoff.drugAllergies || []).map(entryLine).join(' · ')
    || (f.allergyDrug ? 'ระบุว่ามีประวัติแพ้ยา' : ''));
  push('แพ้อาหาร', (handoff.foodAllergies || []).map(entryLine).join(' · ')
    || (f.allergyOther ? 'ระบุว่ามีประวัติแพ้อาหาร' : ''));
  push('แพ้สารเคมี', (handoff.chemicalAllergies || []).map(entryLine).join(' · ')
    || (f.skinReaction ? 'ระบุว่ามีประวัติแพ้สารเคมี' : ''));
  push('โรคประจำตัว', (handoff.chronicConditions || []).map(entryLine).join(' · ')
    || (f.chronic ? 'ระบุว่ามีโรคประจำตัว' : ''));
  if (f.safety) {
    push('ความปลอดภัย',
      src.safety || (handoff.safetyRisks || []).join(' · ') || 'ไม่ได้ระบุที่มา');
  }
  if (f.dnr) push('DNR', src.dnr || 'ไม่ได้ระบุที่มา');
  if (f.organDonor) {
    push('บริจาคอวัยวะ',
      src.organDonor || (handoff.organDonorScopes || []).join(' · ') || 'ไม่ได้ระบุที่มา');
  }
  if (f.vip) push('VIP', 'ผู้รับบริการพิเศษตามที่เวชระเบียนระบุ');
  if (f.flagOther) push('อื่น ๆ', handoff.flagOtherNote || 'ไม่ได้ระบุรายละเอียด');
  return lines;
};
