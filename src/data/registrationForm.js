import { getPatientByHN, getPatientDobByHN } from '@/data/patientProfiles';

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

/** First visit — all fields default / empty (placeholders only). */
export const buildEmptyRegistrationForm = () => ({
  // Step 1 — personal
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
  marital: '',
  spouseFirstName: '',
  spouseLastName: '',
  hospitalPhoto: null,
  idCardPhoto: null,
  idCardFromChip: false,
  idCardAddress: '',

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
  emergency: [{ name: '', last: '', relation: '', phone: '', tag: '' }],

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

/** Mock lookup result — Figma PHCIS-Registration 1:4150 (สิทธิที่ 1 + สิทธิที่ 2). */
export const buildMockRightsGroups = () => [
  {
    id: 'rights-g1',
    title: 'สิทธิที่ 1',
    priorityItems: [
      { id: 'rights-g1-i1', label: 'บัตรทอง' },
      { id: 'rights-g1-i2', label: 'สิทธิ ข้าราชการ กทม.' },
      { id: 'rights-g1-i3', label: 'ประกันสังคม' },
    ],
    documents: [],
    photos: [],
    showAddPriority: false,
  },
  {
    id: 'rights-g2',
    title: 'สิทธิที่ 2',
    priorityItems: [
      { id: 'rights-g2-i1', label: 'AIA H&S Extra Plan 2' },
      { id: 'rights-g2-i2', label: 'AIA NPA2500' },
      { id: 'rights-g2-i3', label: 'ออมสิน Smart Care Plus' },
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
    idCardPhoto: ID_CARD_CHIP_PHOTO_MOCK,
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

const STEP1_REQUIRED_KEYS = [
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

const isStep1Complete = (form) => allFilled(form, STEP1_REQUIRED_KEYS);

const isStep2Complete = (form) => {
  if (!form) return false;
  if (!isAddressFilled(form.addressRegistered)) return false;
  const currentOk = form.useRegisteredForCurrent || isAddressFilled(form.addressCurrent);
  const contactOk = form.useRegisteredForContact || isAddressFilled(form.addressContact);
  return currentOk && contactOk;
};

const isEmergencyEntryFilled = (entry) =>
  nonEmpty(entry?.name) && nonEmpty(entry?.last)
  && nonEmpty(entry?.relation) && nonEmpty(entry?.phone);

const isStep3Complete = (form) => {
  if (!form) return false;
  if (!nonEmpty(form.phone)) return false;
  const list = Array.isArray(form.emergency) ? form.emergency : [];
  return list.some(isEmergencyEntryFilled);
};

/* Step 4 — completes once the user has run the rights lookup (Figma
   214:21954 → 1:4150). Empty result groups still count as a confirmed
   lookup answer. */
const isStep4Complete = (form) => Boolean(form?.rightsLookupDone);

const isStep5Complete = (form) => {
  if (!form) return false;
  if (!nonEmpty(form.mobility)) return false;
  if (form.mobility === 'other' && !nonEmpty(form.mobilityOther)) return false;
  return true;
};

export const getRegistrationCompletedSteps = (form) => [
  isStep1Complete(form),
  isStep2Complete(form),
  isStep3Complete(form),
  isStep4Complete(form),
  isStep5Complete(form),
];
