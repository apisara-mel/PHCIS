import { getPatientByHN, getPatientDobByHN } from '@/data/patientProfiles';
import { REGISTRATION_REQUIRED_CONSENT_IDS } from '@/data/registrationConsentForms';
import { FORMS } from '@/data/formsLibrary';

/** Catalog consent forms for RegistrationConsentStep (formsLibrary source).
   Face-scan StepConsent uses `registrationConsentForms.js` instead. */
export const REGISTRATION_CONSENT_FORMS = FORMS.filter((f) => f.category === 'consent');

/* Thai prefixes — longest match first (นางสาว before นาง). */
const TH_PREFIXES_DESC = ['เด็กหญิง', 'เด็กชาย', 'นางสาว', 'นาย', 'นาง'];

const TH_PREFIX_TO_EN = {
  นาย: 'Mr.',
  นาง: 'Mrs.',
  นางสาว: 'Ms.',
  เด็กชาย: 'Master',
  เด็กหญิง: 'Miss',
};

/** Split PatientCard `fullName` (e.g. นายสมชาย มีสุข) into prefix + given + family. */
const parseThaiFullName = (fullName = '') => {
  let rest = String(fullName).trim();
  let prefixTh = '';
  for (const p of TH_PREFIXES_DESC) {
    if (rest.startsWith(p)) {
      prefixTh = p;
      rest = rest.slice(p.length).trim();
      break;
    }
  }
  const parts = rest.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { prefixTh, firstNameTh: '', lastNameTh: '' };
  if (parts.length === 1) return { prefixTh, firstNameTh: parts[0], lastNameTh: '' };
  return {
    prefixTh,
    firstNameTh: parts.slice(0, -1).join(' '),
    lastNameTh: parts[parts.length - 1],
  };
};

const parseEnglishName = (englishName = '') => {
  const parts = String(englishName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstNameEn: '', lastNameEn: '' };
  if (parts.length === 1) return { firstNameEn: parts[0], lastNameEn: '' };
  return { firstNameEn: parts[0], lastNameEn: parts.slice(1).join(' ') };
};

/* Registration form state — Figma PHCIS-Registration 204:14241 (empty /
   default on first entry) vs chip-read prefill after อ่านบัตรสมาร์ทการ์ด.
   Photo mocks exported from Figma 101:12707 (node 1:3964 / 100:4186). */

/** รูปบัตรประชาชน — chip portrait with height-chart backdrop (Figma). */
export const ID_CARD_CHIP_PHOTO_MOCK = '/illustration/id-card-chip-photo-mock.png';

export const EMPTY_ADDRESS = {
  zip: '',
  province: '',
  district: '',
  subdistrict: '',
  road: '',
  moo: '',
  houseNo: '',
  lat: null,
  lng: null,
  pinSaved: false,
};

/** Consent-form status seed — every registration-relevant consent form
   starts `pending` on first entry; a returning patient's mock record may
   already carry `signed` entries (see `mrPatients.js`). */
export const buildEmptyConsentRecords = () =>
  REGISTRATION_CONSENT_FORMS.map((f) => ({
    slug: f.slug,
    title: f.name,
    code: f.code,
    status: 'pending',
    signedAt: null,
  }));

/** First visit — all fields default / empty (placeholders only). */
export const buildEmptyRegistrationForm = () => ({
  // Step 1 — consent (Figma 292:104252 · face-scan StepConsent)
  consentCompletedIds: [],
  // Kept for RegistrationConsentStep / catalog-driven consent UI
  consentRecords: buildEmptyConsentRecords(),
  // Step 2 — personal
  patientStatus: 'active',
  /* TOR 1.1.1.2 — สถานะการมีชีวิต บนทะเบียนผู้รับบริการ */
  lifeStatus: 'alive',
  deceasedDate: '',
  /* TOR 1.1.1.20 — กลุ่มการออกเลข HN (3 กลุ่ม) */
  hnGroup: 'thai-cid',
  passportNo: '',
  /* TOR 1.1.1.11 — ไม่ทราบวันเดือนปีเกิด → เก็บเฉพาะปีเกิด (พ.ศ.) */
  dobUnknown: false,
  birthYearBE: '',
  /* TOR 1.1.1.14 — ข้อมูลการเกิด (ใบรับรองการเกิด) */
  birthCertDoctor: '',
  birthTime: '',
  birthPlace: '',
  prefixTh: '',
  firstNameTh: '',
  lastNameTh: '',
  prefixEn: '',
  firstNameEn: '',
  lastNameEn: '',
  gender: '',
  genderIdentity: '',
  nationalId: '',
  idIssueDate: '',
  idExpiryDate: '',
  dob: '',
  ageDisplay: '',
  bloodType: '',
  education: '',
  occupation: '',
  /* ข้อความที่พิมพ์เองเมื่อเลือก "อื่นๆ" — แยกจากค่าที่เลือกไว้ เพื่อให้ยังนับ
     สถิติจากค่าในทะเบียนได้ และรู้ว่ารายไหนเป็นค่านอกทะเบียน */
  occupationOther: '',
  birthPlaceOther: '',
  marital: '',
  spouseFirstName: '',
  spouseLastName: '',
  hospitalPhoto: null,
  idCardPhoto: null,
  idCardFromChip: false,
  idCardAddress: '',
  /** Face-match result after FaceScanVerifyPopup (Figma 303:132573). */
  faceMatchScore: null,
  faceVerifiedAt: '',

  // Consents (การยินยอมเปิดเผยข้อมูล - default true 3 รายการ)
  consentPersonal: true,
  consentMedical: true,
  consentBilling: true,

  // Step 2 — addresses
  addressRegistered: { ...EMPTY_ADDRESS },
  useRegisteredForCurrent: false,
  addressCurrent: { ...EMPTY_ADDRESS },
  useRegisteredForContact: false,
  addressContact: { ...EMPTY_ADDRESS },

  // Step 3 — contact
  phone: '',
  altPhone: '',
  email: '',
  emergency: [{ name: '', last: '', relation: '', relationOther: '', phone: '', tag: '' }],

  // Step 4 — rights (Figma 214:21954 lookup · 1:4150 post-search card group)
  rightsLookupDone: false,
  rightsGroups: [],

  // Step 5 — flags
  mobility: '',
  /** Free text when mobility === 'other' (Figma 134:29264 Voice Textarea). */
  mobilityOther: '',
  flags: {
    vip: false,
    allergyDrug: false,
    allergyOther: false,
    skinReaction: false,
    chronic: false,
    flagOther: false,
  },
  drugAllergies: [],
  /* Same entry shape as drugAllergies (`{ id, name, symptom, severity }`)
     — populated when the receptionist ticks "แพ้อาหาร" in Step 5. */
  foodAllergies: [],
  /* Same entry shape — surfaced when "แพ้สารเคมี" is ticked. */
  chemicalAllergies: [],
  /* Same entry shape — surfaced when "โรคประจำตัว" is ticked. The
     `severity` field reads as "ระดับความรุนแรงของโรค" in that context. */
  chronicConditions: [],
});

/** Mock lookup result — Figma PHCIS-Registration 1:4150 (สิทธิที่ 1 + สิทธิที่ 2).

   ชุดสิทธิตรงกับหน้าตรวจสอบสิทธิของตู้ Kiosk (`08-EntitlementDetailsSelf`) —
   สองที่ต้องเห็นสิทธิชุดเดียวกันเมื่อเป็นคนคนเดียวกัน (มติผู้ใช้ 27 ส.ค. 69)
   `role` = "ใช้สิทธิในฐานะ" ตามที่ Kiosk แสดง */
export const buildMockRightsGroups = () => [
  {
    id: 'rights-g1',
    title: 'สิทธิที่ 1',
    priorityItems: [
      { id: 'rights-g1-i1', label: 'บัตรทอง', role: 'เจ้าของสิทธิ (ตนเอง)' },
      { id: 'rights-g1-i2', label: 'สิทธิ ข้าราชการ กทม.', role: 'เจ้าของสิทธิ (ตนเอง)' },
      { id: 'rights-g1-i3', label: 'ประกันสังคม', role: 'เจ้าของสิทธิ (ตนเอง)' },
    ],
    documents: [],
    photos: [],
    showAddPriority: false,
  },
  {
    id: 'rights-g2',
    title: 'สิทธิที่ 2',
    priorityItems: [
      { id: 'rights-g2-i1', label: 'AIA H&S Extra Plan 2', role: 'เจ้าของสิทธิ (ตนเอง)' },
      { id: 'rights-g2-i2', label: 'AIA NPA2500', role: 'เจ้าของสิทธิ (ตนเอง)' },
      { id: 'rights-g2-i3', label: 'ออมสิน Smart Care Plus', role: 'เจ้าของสิทธิ (ตนเอง)' },
    ],
    documents: [],
    photos: [],
    showAddPriority: true,
  },
];

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const startOfLocalDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Thai Buddhist display — e.g. "20 กุมภาพันธ์ 2563" (DatePicker format). */
export const formatThaiBuddhistDate = (d) => {
  if (!d || Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

/** Parse Thai Buddhist date strings for DatePicker `value` binding. */
export const parseThaiBuddhistDate = (raw) => {
  if (!raw) return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : startOfLocalDay(raw);
  }
  const s = String(raw).trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\s+(\S+)\s+(\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monthIdx = THAI_MONTHS.indexOf(m[2]);
  const buddhistYear = parseInt(m[3], 10);
  if (monthIdx < 0 || !Number.isFinite(day) || !Number.isFinite(buddhistYear)) return null;
  const gregorian = buddhistYear - 543;
  const d = startOfLocalDay(new Date(gregorian, monthIdx, day));
  if (d.getDate() !== day || d.getMonth() !== monthIdx || d.getFullYear() !== gregorian) {
    return null;
  }
  return d;
};

/** Thai national ID display — 1-####-##-###-### (13 digits, Figma / card format). */
/* Step 5 — mobility "อื่นๆ" Voice Textarea suggestions (Figma 134:29264).
   Clinicians pick a close phrase then edit; `minChars: 1` surfaces matches
   on leading ใช้ / ต้อง / เดิน / นั่ง / ช่วย … */
export const MOBILITY_OTHER_SUGGESTIONS = [
  'ใช้ไม้เท้า / ใช้ walker',
  'ใช้ไม้เท้าคนละข้าง',
  'ใช้ walker พร้อมล้อ',
  'ใช้คู่ขาเทียม',
  'ใช้ไม้ค้ำยัน',
  'เดินได้ระยะสั้น ต้องพักบ่อย',
  'เดินช้า ต้องมีผู้ดูแลช่วยพยุง',
  'เคลื่อนไหวช้า ต้องมีผู้ช่วยเหลือ',
  'นั่งเก้าอี้เคลื่อนที่ ไม่สามารถเดินได้',
  'ต้องใช้เปลยกจากเตียงไปรถเข็น',
  'ปีน-ลงบันไดไม่ได้ ต้องใช้ลิฟต์',
  'อ่อนแรงมาก ต้องช่วยลุกจากเตียง',
  'ช่วยเหลือตนเองได้บางส่วน',
  'พึ่งพาผู้ดูแลในการเคลื่อนไหวทุกครั้ง',
  'ต้องอุ้ม / ยกตัวผู้ป่วย',
];

export const formatNationalId = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 13);
  if (!digits) return '';
  let out = digits.slice(0, 1);
  if (digits.length > 1) out += `-${digits.slice(1, 5)}`;
  if (digits.length > 5) out += `-${digits.slice(5, 7)}`;
  if (digits.length > 7) out += `-${digits.slice(7, 10)}`;
  if (digits.length > 10) out += `-${digits.slice(10, 13)}`;
  return out;
};

const formatAgeDisplay = (age) => {
  if (typeof age === 'string' && age.includes('ปี')) return age;
  const years = Number(age);
  if (!Number.isFinite(years)) return '';
  return `${years} ปี - 7 เดือน - 11 วัน`;
};

const formatIdCardAddress = (addr) => {
  if (!addr) return '';
  return `${addr.houseNo || ''} ${addr.moo || ''} ${addr.road || ''} แขวง${addr.subdistrict || ''} เขต${addr.district || ''} ${addr.province || ''}`
    .replace(/\s+/g, ' ')
    .trim();
};

/** Chip read — prefill personal data (+ registered address from card).
   Identity fields prefer `patientProfiles` (same roster as หน้าตรวจรักษา /
   PatientCard) so smart-card mock names match the treatment queue row. MR
   row data still supplies structured address, education, marital, etc. */
export const buildPersonalDataFromPatient = (patient) => {
  if (!patient) return {};
  const cardProfile = getPatientByHN(patient.hn);
  const th = cardProfile?.fullName
    ? parseThaiFullName(cardProfile.fullName)
    : {
        prefixTh: patient.prefixTh ?? '',
        firstNameTh: patient.firstNameTh ?? '',
        lastNameTh: patient.lastNameTh ?? '',
      };
  const en = cardProfile?.englishName
    ? parseEnglishName(cardProfile.englishName)
    : {
        firstNameEn: patient.firstNameEn ?? '',
        lastNameEn: patient.lastNameEn ?? '',
      };
  const address = patient.address ? { ...patient.address } : { ...EMPTY_ADDRESS };

  return {
    prefixTh: th.prefixTh,
    firstNameTh: th.firstNameTh,
    lastNameTh: th.lastNameTh,
    prefixEn: TH_PREFIX_TO_EN[th.prefixTh] ?? patient.prefixEn ?? '',
    firstNameEn: en.firstNameEn,
    lastNameEn: en.lastNameEn,
    gender: cardProfile?.sex ?? patient.gender ?? '',
    genderIdentity: patient.genderIdentity ?? cardProfile?.sex ?? patient.gender ?? '',
    nationalId: formatNationalId(cardProfile?.nationalId ?? patient.nationalId ?? ''),
    idIssueDate: '20 กุมภาพันธ์ 2563',
    idExpiryDate: '19 สิงหาคม 2571',
    dob: getPatientDobByHN(patient.hn) || patient.dob || '',
    ageDisplay: cardProfile?.age ?? formatAgeDisplay(patient.age),
    bloodType: cardProfile?.bloodType ?? patient.bloodType ?? '',
    education: patient.education ?? '',
    occupation: patient.occupation ?? '',
    marital: patient.marital ?? '',
    idCardFromChip: true,
    /* Every mock card must show the same person as the registered profile.
       A generated chip portrait is used when available; profile photo is the
       safe fallback until that patient's card artwork is generated. */
    idCardPhoto: patient.idCardPhotoUrl || patient.avatarUrl || ID_CARD_CHIP_PHOTO_MOCK,
    idCardAddress: formatIdCardAddress(patient.address),
    /* Only the registered address is on the chip — Figma 207:20375 shows
       the other two cards stay in default empty state with their
       "เหมือนที่อยู่ตามทะเบียนบ้าน" checkbox unchecked, so the user
       explicitly opts in to copy or types fresh data. */
    addressRegistered: address,
    useRegisteredForCurrent: false,
    addressCurrent: { ...EMPTY_ADDRESS },
    useRegisteredForContact: false,
    addressContact: { ...EMPTY_ADDRESS },
  };
};

/* Fields the Thai ID chip does NOT carry. The smart-card mock would
   otherwise overwrite them from the patient record, but in production the
   reader can't return these values — the receptionist still has to type
   them in. Keep whatever the user has already typed; if they haven't
   typed anything, leave the field empty for them to fill. */
const NON_CHIP_FIELDS = ['education', 'occupation', 'marital'];

export const applySmartCardRead = (form, patient) => {
  const fromCard = buildPersonalDataFromPatient(patient);
  NON_CHIP_FIELDS.forEach((k) => { fromCard[k] = form?.[k] ?? ''; });
  return { ...form, ...fromCard };
};

/* Step-completion gating — drives the StepProgress check mark so a step
   only shows ✓ when every required field on it is filled. Mirrors the
   `<Field required>` markers in RegistrationSteps.jsx. */

const nonEmpty = (v) => String(v ?? '').trim() !== '';
const allFilled = (form, keys) => keys.every((k) => nonEmpty(form?.[k]));

const STEP1_REQUIRED_CONSENT_IDS = REGISTRATION_REQUIRED_CONSENT_IDS;

/* ทะเบียนอาชีพ (มติผู้ใช้ 27 ส.ค. 69) — ของเดิมมี 8 รายการซึ่งครอบไม่ถึง
   ประชากรที่ศูนย์บริการดูแลจริง (เกษตรกร ประมง พระภิกษุ ผู้พิการ เด็กก่อนวัยเรียน
   ไม่มีสักตัว) เจ้าหน้าที่จึงต้องเลือก "อื่นๆ" แทบทุกราย จนช่องนี้ไม่มีความหมาย
   ทางสถิติ. เรียงจากกลุ่มที่พบบ่อยที่สุดลงไป และปิดท้ายด้วย "อื่นๆ" เสมอ
   ดรอปดาวน์ของระบบพิมพ์ค้นได้อยู่แล้ว (Select searchable) */
export const OCCUPATION_OPTIONS = [
  'นักเรียน/นักศึกษา',
  'เด็กก่อนวัยเรียน',
  'ข้าราชการ',
  'พนักงานราชการ/ลูกจ้างภาครัฐ',
  'พนักงานรัฐวิสาหกิจ',
  'ทหาร/ตำรวจ',
  'ครู/อาจารย์',
  'บุคลากรทางการแพทย์และสาธารณสุข',
  'พนักงานบริษัทเอกชน',
  'พนักงานโรงงาน/อุตสาหกรรม',
  'ค้าขาย/ธุรกิจส่วนตัว',
  'รับจ้างทั่วไป',
  'เกษตรกร',
  'ประมง',
  'ปศุสัตว์',
  'งานก่อสร้าง',
  'ขับรถรับจ้าง/ขนส่ง',
  'งานบริการ/ท่องเที่ยว',
  'แม่บ้าน/งานบ้าน',
  'พระภิกษุ/นักบวช',
  'เกษียณอายุ',
  'ว่างงาน',
  'ผู้พิการ/ทุพพลภาพ',
  'อื่นๆ',
];

export const EDUCATION_OPTIONS = [
  'ไม่ได้รับการศึกษา',
  'ประถมศึกษา',
  'มัธยมศึกษาตอนต้น',
  'มัธยมศึกษาตอนปลาย',
  'ปวช.',
  'ปวส./อนุปริญญา',
  'ปริญญาตรี',
  'ปริญญาโท',
  'ปริญญาเอก',
];

const STEP2_REQUIRED_KEYS = [
  'prefixTh', 'firstNameTh', 'lastNameTh',
  'prefixEn', 'firstNameEn', 'lastNameEn',
  'gender',
  'nationalId', 'idIssueDate', 'idExpiryDate',
  'dob',
  'education', 'occupation',
];

/* Address keys required by AddressBlock (Figma 207:19757 — zip / province /
   district). Subdistrict and the rest are optional. */
const ADDRESS_REQUIRED_KEYS = ['zip', 'province', 'district'];
const isAddressFilled = (addr) =>
  Boolean(addr) && ADDRESS_REQUIRED_KEYS.every((k) => nonEmpty(addr[k]));

const isStepConsentComplete = (form) => {
  const done = Array.isArray(form?.consentCompletedIds) ? form.consentCompletedIds : [];
  return STEP1_REQUIRED_CONSENT_IDS.every((id) => done.includes(id));
};

/** Derives the 3 Figma consent-status banners from `form.consentRecords`:
   'none-signed' · 'partial' · 'all-signed'. Used by RegistrationConsentStep. */
export const getConsentSummary = (consentRecords) => {
  const records = Array.isArray(consentRecords) ? consentRecords : [];
  const total = records.length;
  const signedCount = records.filter((r) => r?.status === 'signed').length;
  const pendingCount = total - signedCount;
  let state = 'all-signed';
  if (signedCount === 0 && total > 0) state = 'none-signed';
  else if (pendingCount > 0) state = 'partial';
  return { state, pendingCount, signedCount, total };
};

/* ── TOR 1.1.1.13 — แจ้งเตือนข้อมูลไม่ครบ (รายชื่อ field + step) ─────────
   Single source for both the step-progress check mark and the explicit
   missing-field toast/panel, so the two can never disagree. */

/** Thai characters (for the foreign-document EN-name block — TOR 1.1.1.20). */
export const hasThaiCharacters = (value) => /[฀-๿]/.test(String(value ?? ''));

const currentBuddhistYear = () => new Date().getFullYear() + 543;

/** ปีเกิด พ.ศ. validation — ปีอนาคต/อายุติดลบ → error string, else ''. */
export const getBirthYearError = (birthYearBE) => {
  const s = String(birthYearBE ?? '').trim();
  if (!s) return '';
  const y = Number(s);
  if (!Number.isFinite(y) || s.length !== 4) return 'กรอกปี พ.ศ. 4 หลัก';
  if (y > currentBuddhistYear()) return 'ปีเกิดอยู่ในอนาคต';
  if (currentBuddhistYear() - y > 130) return 'อายุเกิน 130 ปี — ตรวจสอบปีเกิด';
  return '';
};

/** อายุ (ปี) → ปีเกิด พ.ศ. (legacy "กรอกอายุแทน" back-computation, manual ch.2). */
export const ageToBirthYearBE = (ageYears) => {
  const n = Number(String(ageYears ?? '').trim());
  if (!Number.isFinite(n) || n < 0 || n > 130) return '';
  return String(currentBuddhistYear() - Math.floor(n));
};

/* TOR 1.1.1.20 — HN 3 กลุ่ม */
export const HN_GROUPS = [
  {
    key: 'thai-cid',
    label: 'คนไทย มีเลขบัตรประชาชน 13 หลัก',
    hint: 'ออก HN อัตโนมัติจากเลขบัตรประชาชน',
    prefix: '',
  },
  {
    key: 'foreign-doc',
    label: 'ชาวต่างชาติ มีเอกสารยืนยันตัวตน (Passport)',
    hint: 'ต้องกรอกเลข Passport และชื่อภาษาอังกฤษ (ห้ามอักษรไทย)',
    prefix: 'F',
  },
  {
    key: 'no-doc',
    label: 'ไม่มีเอกสารยืนยันตัวตน',
    hint: 'ออก HN ชั่วคราว — ช่องเลขบัตรประชาชนถูกปิด',
    prefix: 'T',
  },
];

/** HN preview per group — mock running number with the group prefix. */
export const buildHnPreview = (form) => {
  const be2 = String(currentBuddhistYear() % 100).padStart(2, '0');
  const group = HN_GROUPS.find((g) => g.key === (form?.hnGroup || 'thai-cid')) || HN_GROUPS[0];
  if (group.key === 'thai-cid') {
    const digits = String(form?.nationalId ?? '').replace(/\D/g, '');
    if (digits.length !== 13) return `${be2}-กำหนดจากเลขบัตร 13 หลัก`;
    return `${be2}-1${digits.slice(9, 13)}`;
  }
  return `${group.prefix}${be2}-10236`;
};

const STEP2_FIELD_LABELS = {
  prefixTh: 'คำนำหน้า (ไทย)',
  firstNameTh: 'ชื่อ (ไทย)',
  lastNameTh: 'นามสกุล (ไทย)',
  prefixEn: 'Prefix (EN)',
  firstNameEn: 'ชื่อ (อังกฤษ)',
  lastNameEn: 'นามสกุล (อังกฤษ)',
  gender: 'เพศกำเนิด',
  nationalId: 'เลขบัตรประชาชน',
  idIssueDate: 'วันออกบัตร',
  idExpiryDate: 'วันหมดอายุบัตร',
  dob: 'วันเดือนปีเกิด',
  education: 'การศึกษา',
  occupation: 'อาชีพ',
};

/** Missing required fields on Step ข้อมูลส่วนตัว, TOR-1.1-aware
   (hnGroup / dobUnknown / lifeStatus rules). Returns Thai field labels. */
export const getPersonalMissingFields = (form) => {
  const missing = [];
  const idRequired = (form?.hnGroup || 'thai-cid') === 'thai-cid';
  STEP2_REQUIRED_KEYS.forEach((k) => {
    if (k === 'dob') return; /* handled below */
    if (!idRequired && (k === 'nationalId' || k === 'idIssueDate' || k === 'idExpiryDate')) return;
    if (!nonEmpty(form?.[k])) missing.push(STEP2_FIELD_LABELS[k] || k);
  });
  if (form?.dobUnknown) {
    if (!nonEmpty(form?.birthYearBE) || getBirthYearError(form?.birthYearBE)) {
      missing.push('ปีเกิด (พ.ศ.)');
    }
  } else if (!nonEmpty(form?.dob)) {
    missing.push(STEP2_FIELD_LABELS.dob);
  }
  if (form?.hnGroup === 'foreign-doc') {
    if (!nonEmpty(form?.passportNo)) missing.push('เลขที่ Passport');
    if (hasThaiCharacters(form?.firstNameEn) || hasThaiCharacters(form?.lastNameEn)) {
      missing.push('ชื่อภาษาอังกฤษ (ห้ามอักษรไทย)');
    }
  }
  if (form?.lifeStatus === 'deceased' && !nonEmpty(form?.deceasedDate)) {
    missing.push('วันที่เสียชีวิต');
  }
  /* เลือก "อื่นๆ" แล้วไม่ระบุ = ข้อมูลหายไปเฉย ๆ ต้องบล็อกเหมือนช่องว่าง */
  if (form?.occupation === 'อื่นๆ' && !nonEmpty(form?.occupationOther)) {
    missing.push('อาชีพ (ระบุ)');
  }
  if (form?.birthPlace === '__other' && !nonEmpty(form?.birthPlaceOther)) {
    missing.push('สถานที่เกิด (ระบุ)');
  }
  return missing;
};

const isStepPersonalComplete = (form) => getPersonalMissingFields(form).length === 0;

const isStepAddressComplete = (form) => {
  if (!form) return false;
  if (!isAddressFilled(form.addressRegistered)) return false;
  const currentOk = form.useRegisteredForCurrent || isAddressFilled(form.addressCurrent);
  const contactOk = form.useRegisteredForContact || isAddressFilled(form.addressContact);
  return currentOk && contactOk;
};

const isEmergencyEntryFilled = (entry) =>
  nonEmpty(entry?.name) && nonEmpty(entry?.last)
  && nonEmpty(entry?.relation) && nonEmpty(entry?.phone);

const isStepContactComplete = (form) => {
  if (!form) return false;
  if (!nonEmpty(form.phone)) return false;
  const list = Array.isArray(form.emergency) ? form.emergency : [];
  return list.some(isEmergencyEntryFilled);
};

/* Step 5 — completes once the user has run the rights lookup (Figma
   214:21954 → 1:4150). Empty result groups still count as a confirmed
   lookup answer. */
const isStepRightsComplete = (form) => Boolean(form?.rightsLookupDone);

const isStepFlagsComplete = (form) => {
  if (!form) return false;
  if (!nonEmpty(form.mobility)) return false;
  if (form.mobility === 'other' && !nonEmpty(form.mobilityOther)) return false;
  return true;
};

export const getRegistrationCompletedSteps = (form) => [
  isStepConsentComplete(form),
  isStepPersonalComplete(form),
  isStepAddressComplete(form),
  isStepContactComplete(form),
  isStepRightsComplete(form),
  isStepFlagsComplete(form),
  /* "ตรวจสอบข้อมูล" — ขั้นทวน ถือว่าครบเมื่อ 6 ขั้นก่อนหน้าครบทั้งหมด ไม่งั้น
     stepper จะติ๊กเขียวทั้งที่ยังบันทึกไม่ได้ */
  isStepConsentComplete(form)
    && isStepPersonalComplete(form)
    && isStepAddressComplete(form)
    && isStepContactComplete(form)
    && isStepRightsComplete(form)
    && isStepFlagsComplete(form),
];

/* TOR 1.1.1.13 — per-step missing-field report ที่ <MissingFieldsPopup> ใช้
   แสดงว่าขาดอะไรบ้าง · index ต้องตรงกับ STEP_RENDERERS */
const STEP_MISSING_BUILDERS = [
  (form) => (isStepConsentComplete(form) ? [] : ['แบบฟอร์มยินยอมที่ยังไม่ได้กรอก']),
  (form) => getPersonalMissingFields(form),
  (form) => {
    const missing = [];
    if (!isAddressFilled(form?.addressRegistered)) missing.push('ที่อยู่ตามทะเบียนบ้าน (รหัสไปรษณีย์ / จังหวัด / เขต)');
    if (!form?.useRegisteredForCurrent && !isAddressFilled(form?.addressCurrent)) missing.push('ที่อยู่ปัจจุบัน');
    if (!form?.useRegisteredForContact && !isAddressFilled(form?.addressContact)) missing.push('ที่อยู่ติดต่อได้');
    return missing;
  },
  (form) => {
    const missing = [];
    if (!nonEmpty(form?.phone)) missing.push('โทรศัพท์มือถือ');
    const list = Array.isArray(form?.emergency) ? form.emergency : [];
    if (!list.some(isEmergencyEntryFilled)) missing.push('ผู้ติดต่อฉุกเฉิน (อย่างน้อย 1 ราย)');
    return missing;
  },
  (form) => (isStepRightsComplete(form) ? [] : ['ตรวจสอบสิทธิการรักษา']),
  (form) => {
    const missing = [];
    if (!nonEmpty(form?.mobility)) missing.push('การเคลื่อนไหวของผู้รับบริการ');
    else if (form?.mobility === 'other' && !nonEmpty(form?.mobilityOther)) missing.push('รายละเอียดการเคลื่อนไหว (อื่นๆ)');
    return missing;
  },
  /* ตรวจสอบข้อมูล — ขั้นทวนอย่างเดียว ไม่มีฟิลด์ของตัวเอง */
  () => [],
];

export const REGISTRATION_STEP_NAMES = [
  'แบบฟอร์มยินยอม',
  'ข้อมูลส่วนตัว',
  'ที่อยู่',
  'ข้อมูลการติดต่อ',
  'สิทธิการรักษา',
  'หมายเหตุและ Flag',
  'ตรวจสอบข้อมูล',
];

/** Missing fields for one step — `[ 'ชื่อ (ไทย)', … ]`. */
export const getStepMissingFields = (form, stepIndex) => {
  const builder = STEP_MISSING_BUILDERS[stepIndex];
  return builder ? builder(form) : [];
};

/** Full report — `[ { stepIndex, stepLabel, fields } ]`, incomplete steps only. */
export const getRegistrationMissingReport = (form) =>
  STEP_MISSING_BUILDERS
    .map((builder, stepIndex) => ({
      stepIndex,
      stepLabel: REGISTRATION_STEP_NAMES[stepIndex],
      fields: builder(form),
    }))
    .filter((r) => r.fields.length > 0);

/* ── TOR 1.1.1.15 / 1.1.1.5 — audit trail ของการแก้ไขทะเบียน ──────────
   Session-scoped store rendered by RegistrationEditHistoryPanel (merged
   above its historical mock). Typed change records: หมวด (step) + รายการ
   (field) + ค่าเดิม → ค่าใหม่ + ผู้บันทึก + วันเวลา. Also carries the
   duplicate-name confirmation entries (ผู้ยืนยัน + HN ที่ชนทุกครั้ง). */

export const REGISTRATION_AUDIT_USER = 'น.ส.พิมพ์ใจ ลงทะเบียน';

const REGISTRATION_AUDIT_ENTRIES = [];
let auditSeq = 0;

const nowAuditLabel = () => {
  const d = new Date();
  const th = formatThaiBuddhistDate(d);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${th} · ${hm}`;
};

export const appendRegistrationAudit = ({
  step = 'ส่วนตัว',
  field,
  oldValue = '—',
  newValue = '—',
  changedBy = REGISTRATION_AUDIT_USER,
}) => {
  const entry = {
    id: `audit-live-${++auditSeq}`,
    changedAt: nowAuditLabel(),
    changedBy,
    step,
    field: field || 'ข้อมูลทะเบียน',
    oldValue,
    newValue,
  };
  REGISTRATION_AUDIT_ENTRIES.unshift(entry);
  return entry;
};

/** Newest-first live entries (session only — resets on reload). */
export const getRegistrationAuditEntries = () => [...REGISTRATION_AUDIT_ENTRIES];

/* Persist draft across consent-fill navigation (Step 1 → fill page → back). */
const REGISTRATION_DRAFT_KEY = 'mih.registration.draft';

export const saveRegistrationDraft = (form) => {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify(form));
  } catch {
    /* ignore quota / private mode */
  }
};

export const loadRegistrationDraft = () => {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(REGISTRATION_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    /* Draft compatibility — older drafts in sessionStorage predate the
       TOR-1.1 fields (lifeStatus / hnGroup / dobUnknown / …). Merging over
       a fresh empty form guarantees every new field has its default. */
    return { ...buildEmptyRegistrationForm(), ...parsed };
  } catch {
    return null;
  }
};

export const clearRegistrationDraft = () => {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
  } catch {
    /* ignore */
  }
};

export const markRegistrationConsentCompleted = (id) => {
  const draft = loadRegistrationDraft() || buildEmptyRegistrationForm();
  const prev = Array.isArray(draft.consentCompletedIds) ? draft.consentCompletedIds : [];
  if (!prev.includes(id)) {
    draft.consentCompletedIds = [...prev, id];
  }
  saveRegistrationDraft(draft);
  return draft;
};
