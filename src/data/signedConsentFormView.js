import { findMrPatientByHn } from '@/data/mrPatients';
import { formatNationalId } from '@/data/registrationForm';
import { resolveConsentPatient } from '@/data/consentPatientDisplay';

/** ข้อความยินยอม PDPA มาตรฐาน (4 ข้อ) — ตรง preview ใน wizard / ภาพ patient view */
export const PH_SIGNED_CONSENT_SECTIONS = [
  {
    id: 's1',
    title: 'วัตถุประสงค์ของการให้ความยินยอม',
    detail: 'ข้าพเจ้าได้รับคำอธิบายถึงวัตถุประสงค์ ขั้นตอน ประโยชน์ และความเสี่ยงที่อาจเกิดขึ้นจากการรักษา/หัตถการนี้จากแพทย์ผู้ดูแลอย่างครบถ้วนแล้ว',
  },
  {
    id: 's2',
    title: 'ความเสี่ยงและภาวะแทรกซ้อนที่อาจเกิดขึ้น',
    detail: 'ข้าพเจ้าเข้าใจว่าการรักษาทุกชนิดมีความเสี่ยง และอาจเกิดภาวะแทรกซ้อนที่ไม่สามารถคาดการณ์ได้ ซึ่งทีมแพทย์จะดูแลอย่างเต็มความสามารถตามมาตรฐานวิชาชีพ',
  },
  {
    id: 's3',
    title: 'การเปิดเผยและคุ้มครองข้อมูลส่วนบุคคล',
    detail: 'ข้าพเจ้ายินยอมให้สถานพยาบาลเก็บรวบรวมและใช้ข้อมูลสุขภาพเพื่อการรักษาพยาบาล ภายใต้พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)',
  },
  {
    id: 's4',
    title: 'สิทธิในการเพิกถอนความยินยอม',
    detail: 'ข้าพเจ้าทราบว่าสามารถเพิกถอนความยินยอมนี้ได้ทุกเมื่อ โดยไม่กระทบต่อสิทธิในการรับบริการอื่น ๆ',
  },
];

export const PH_SIGNED_PATIENT_FIELDS = [
  { key: 'name', label: 'ชื่อผู้ป่วย' },
  { key: 'hn', label: 'หมายเลข HN' },
  { key: 'doctor', label: 'แพทย์ผู้รักษา' },
  { key: 'birth', label: 'วันเกิด / อายุ' },
];

export const isPhConsentFormCode = (formCode) => /^PH-/i.test(String(formCode || '').trim());

const MOCK_DOCTORS = ['นพ. สมชาย มั่นใจดี', 'นพ. วิชัย สุขใจ', 'พญ. ลดา ดีงาม'];
const MOCK_BIRTHS = ['12 ม.ค. 2535', '3 ก.พ. 2540', '18 ก.ค. 2528'];

/** คำตอบรายข้อ (mock) — derive จาก record id + action รวม */
export const buildSignedClauseAnswers = (recordId, overall = 'yes') => {
  const seed = Number(recordId) || 0;
  const defaultAnswer = overall === 'no' ? 'no' : 'yes';
  return PH_SIGNED_CONSENT_SECTIONS.reduce((acc, section, index) => {
    if (overall === 'no') {
      acc[section.id] = index === 0 ? 'no' : 'no';
    } else {
      /* mock คละ: ~80% ยินยอมทุกข้อ · บางรายการข้อ 3 ไม่ยินยอม */
      acc[section.id] = (seed % 7 === 0 && index === 2) ? 'no' : defaultAnswer;
    }
    return acc;
  }, {});
};

export const resolveSignedPatientFields = (hn, fallbackName = '') => {
  const resolved = resolveConsentPatient(hn, fallbackName);
  const roster = hn ? findMrPatientByHn(String(hn).replace(/-\d+$/, '')) : null;
  const seed = Number(String(hn || '').replace(/\D/g, '').slice(-2)) || 0;
  const fullName = [
    roster?.prefixTh,
    roster?.firstNameTh,
    roster?.lastNameTh,
  ].filter(Boolean).join(' ')
    || resolved.name
    || fallbackName
    || '—';
  const nationalIdRaw = roster?.nationalId || '';
  return {
    name: fullName,
    fullName,
    hn: resolved.hn || hn || '—',
    doctor: roster?.attendingDoctor || MOCK_DOCTORS[seed % MOCK_DOCTORS.length],
    birth: roster?.birthDateTh || MOCK_BIRTHS[seed % MOCK_BIRTHS.length],
    nationalId: nationalIdRaw ? formatNationalId(nationalIdRaw) : '—',
  };
};

const DECLINED_STATUSES = new Set(['ปฏิเสธ', 'ถอนความยินยอม', 'ยกเลิกคำขอ', 'ไม่ยินยอม']);

const resolveSignedAction = (status) => (
  DECLINED_STATUSES.has(status) ? 'ไม่ให้ความยินยอม' : 'ให้ความยินยอม'
);

const resolveSignedDateTime = (item) => {
  const dateTime = item.signedDate && item.signedDate !== '-'
    ? item.signedDate
    : item.createdDate;
  return dateTime && dateTime !== '-' ? dateTime : '—';
};

const resolveSignedChannel = (record) => {
  if (record?.signChannel && record.signChannel !== '-') return record.signChannel;
  if (record?.revokeRequestChannel && record.revokeRequestChannel !== '-') {
    return record.revokeRequestChannel;
  }
  return record?.requestChannel || '—';
};

/** สร้าง event สำหรับ read-only view จากแถว worklist โดยตรง (รองรับ ขอเพิกถอn ที่ยังมี signedDate) */
export const toSignedFormViewEventFromRecord = (record) => {
  if (!record) return null;
  return {
    recordId: record.id,
    action: resolveSignedAction(record.status),
    formCode: record.formCode,
    formName: record.formName,
    type: record.type,
    version: record.version,
    dateTime: resolveSignedDateTime(record),
    channel: resolveSignedChannel(record),
  };
};

export const toSignedFormViewEvent = (item, records = []) => {
  const record = records.find((r) => String(r.id) === String(item.id));
  return {
    recordId: item.id,
    action: resolveSignedAction(item.status),
    formCode: item.formCode,
    formName: item.formName,
    type: item.type,
    version: item.version,
    dateTime: resolveSignedDateTime(item),
    channel: record ? resolveSignedChannel(record) : '—',
  };
};
