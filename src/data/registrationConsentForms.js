/* Registration consent Step 1 + detail mocks — 3 disclosure consents.
   Cards: Figma 292:104252 · Detail fill: Figma 295:41105 layout.
   Cover art matches CreateConsentFormPage wizard (356:111486). */

import { CONSENT_WORKLIST_FORM_POOL, CONSENT_TOPICS } from '@/data/consentFormRecords';

const CONSENT_TOPIC_TONE = Object.fromEntries(
  CONSENT_TOPICS.map((t) => [t.type, t.tone]),
);


/** Consent wizard cover thumbnails — `/illustration/consent/form-cover-NN.png`. */
export const consentFormCoverUrl = (index = 0) => {
  const n = String((Number(index) % 20) + 1).padStart(2, '0');
  return `/illustration/consent/form-cover-${n}.png`;
};

/* ใบยินยอมทั้ง 3 ใบของขั้นลงทะเบียนลงนามโดยผู้รับบริการฝ่ายเดียว — ไม่มีช่อง
   "แพทย์ผู้รักษา" (มติผู้ใช้ 27 ส.ค. 69). ต้องระบุไว้ชัด เพราะค่าเริ่มต้นของ
   ระบบคือ DEFAULT_SIGNATURE_KEYS = ['patient', 'doctor'] */
const patientOnlySignatures = ['patient'];

const sharedPatientFields = [
  { key: 'fullName', label: 'ชื่อตามบัตรประชาชน', required: true, placeholder: 'เช่น นายสมชาย ใจดี' },
  { key: 'nationalId', label: 'เลขบัตรประชาชน', required: true, placeholder: 'X-XXX-XXXXX-XX-X' },
  { key: 'hn', label: 'เลข HN', required: false, placeholder: 'XXXXXX' },
];

export const REGISTRATION_CONSENT_FORMS = {
  'PD-1011': {
    id: 'PD-1011',
    title: 'ใบยินยอมเปิดเผยข้อมูลส่วนบุคคล',
    categoryLabel: 'PDPA',
    categoryStyle: 'blue',
    version: '1.0',
    cover: consentFormCoverUrl(0),
    cardCategoryLabel: 'PDPA',
    cardCategoryStyle: 'blue',
    cardVersion: '1.0',
    patientFields: sharedPatientFields,
    signatures: patientOnlySignatures,
    intro:
      'ข้าพเจ้าได้รับคำอธิบายจากเจ้าหน้าที่ของสถานพยาบาล ให้ทราบถึงวัตถุประสงค์ในการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล เพื่อการขึ้นทะเบียนผู้รับบริการ และการให้บริการทางการแพทย์และสาธารณสุข ทั้งในรูปแบบเอกสารและอิเล็กทรอนิกส์',
    signatureNote: 'หมายเหตุ เอกสารมีอายุ 365 วัน นับจากวันที่ลงนาม',
    clauses: [
      {
        id: 'c1',
        title: 'ยินยอมเก็บรวบรวมข้อมูลส่วนบุคคล',
        detail:
          'ข้าพเจ้ายินยอมให้สถานพยาบาลเก็บรวบรวมและใช้ข้อมูลส่วนบุคคลของข้าพเจ้า เช่น ชื่อ-นามสกุล เลขบัตรประชาชน ที่อยู่ วันเกิด และข้อมูลติดต่อ เพื่อการขึ้นทะเบียนและให้บริการทางการแพทย์',
      },
      {
        id: 'c2',
        title: 'ยินยอมใช้ข้อมูลเพื่อการให้บริการ',
        detail:
          'ข้าพเจ้ายินยอมให้ใช้ข้อมูลส่วนบุคคลเพื่อการนัดหมาย การติดต่อกลับ การยืนยันตัวตน และการดำเนินการอื่นที่จำเป็นต่อการรับบริการของข้าพเจ้า',
      },
      {
        id: 'c3',
        title: 'ยินยอมเปิดเผยข้อมูลแก่บุคลากรที่เกี่ยวข้อง',
        detail:
          'ข้าพเจ้ายินยอมให้เปิดเผยข้อมูลส่วนบุคคลแก่บุคลากรของสถานพยาบาลและหน่วยงานในเครือข่ายที่จำเป็นต่อการให้บริการ โดยจำกัดเฉพาะผู้ที่มีสิทธิ์เข้าถึงตามหน้าที่',
      },
      {
        id: 'c4',
        title: 'ยินยอมจัดเก็บในรูปแบบอิเล็กทรอนิกส์',
        detail:
          'ข้าพเจ้ายินยอมให้จัดเก็บและประมวลผลข้อมูลส่วนบุคคลในระบบสารสนเทศของสถานพยาบาล รวมถึงการสำรองข้อมูลตามมาตรฐานความมั่นคงปลอดภัยที่กำหนด',
      },
      {
        id: 'c5',
        title: 'ระยะเวลาการเก็บรักษาข้อมูล',
        detail:
          'ข้าพเจ้าได้รับทราบว่าข้อมูลส่วนบุคคลจะถูกเก็บรักษาตามระยะเวลาที่กฎหมายและนโยบายของสถานพยาบาลกำหนด และจะถูกทำลายหรือทำให้ระบุตัวตนไม่ได้เมื่อหมดความจำเป็น',
      },
      {
        id: 'c6',
        title: 'สิทธิ์ในการเข้าถึงและแก้ไขข้อมูล',
        detail:
          'ข้าพเจ้าเข้าใจว่ามีสิทธิ์ขอเข้าถึง ขอสำเนา หรือขอแก้ไขข้อมูลส่วนบุคคลของตนได้ตามช่องทางที่สถานพยาบาลกำหนด ภายใต้เงื่อนไขของกฎหมาย',
      },
      {
        id: 'c7',
        title: 'สิทธิ์ในการถอนความยินยอม',
        detail:
          'ข้าพเจ้าเข้าใจว่าสามารถถอนความยินยอมนี้ได้ทุกเมื่อ โดยแจ้งเจ้าหน้าที่เป็นลายลักษณ์อักษรหรือผ่านช่องทางที่สถานพยาบาลกำหนด โดยไม่กระทบสิทธิ์ในการรับบริการที่กฎหมายกำหนด',
      },
      {
        id: 'c8',
        title: 'ยืนยันว่าได้อ่านและเข้าใจข้อมูลครบถ้วน',
        detail:
          'ข้าพเจ้ายืนยันว่าได้อ่าน เข้าใจ และมีโอกาสซักถามเกี่ยวกับเนื้อหาในแบบฟอร์มนี้ครบถ้วนก่อนลงนามให้ความยินยอมเปิดเผยข้อมูลส่วนบุคคล',
      },
    ],
  },
  'TX-1011': {
    id: 'TX-1011',
    title: 'ใบยินยอมเปิดเผยข้อมูลการรักษา',
    categoryLabel: 'การรักษา',
    categoryStyle: 'teal',
    version: '1.0',
    cover: consentFormCoverUrl(1),
    cardCategoryLabel: 'การรักษา',
    cardCategoryStyle: 'teal',
    cardVersion: '1.0',
    patientFields: sharedPatientFields,
    signatures: patientOnlySignatures,
    intro:
      'ข้าพเจ้าได้รับคำอธิบายถึงความจำเป็นในการเปิดเผยและแลกเปลี่ยนข้อมูลการรักษา เพื่อความต่อเนื่องของการดูแลรักษา ความปลอดภัยของผู้รับบริการ และการประสานงานระหว่างทีมสหวิชาชีพและหน่วยบริการที่เกี่ยวข้อง',
    signatureNote: 'หมายเหตุ เอกสารมีอายุ 365 วัน นับจากวันที่ลงนาม',
    clauses: [
      {
        id: 'c1',
        title: 'ยินยอมเปิดเผยประวัติและแผนการรักษา',
        detail:
          'ข้าพเจ้ายินยอมให้เปิดเผยข้อมูลประวัติการรักษา การวินิจฉัย แผนการรักษา และผลการตรวจที่เกี่ยวข้องแก่แพทย์ พยาบาล และทีมสหวิชาชีพที่ให้บริการแก่ข้าพเจ้า',
      },
      {
        id: 'c2',
        title: 'ยินยอมเปิดเผยผลการตรวจทางห้องปฏิบัติการและภาพทางการแพทย์',
        detail:
          'ข้าพเจ้ายินยอมให้เปิดเผยผลการตรวจทางห้องปฏิบัติการ ภาพรังสี และข้อมูลวินิจฉัยอื่นที่จำเป็นต่อการรักษาและการติดตามอาการ',
      },
      {
        id: 'c3',
        title: 'ยินยอมเปิดเผยข้อมูลยาและการแพ้ยา',
        detail:
          'ข้าพเจ้ายินยอมให้เปิดเผยข้อมูลยาที่ใช้ การแพ้ยา และข้อควรระวังทางเภสัชกรรมแก่บุคลากรที่เกี่ยวข้อง เพื่อความปลอดภัยในการรักษา',
      },
      {
        id: 'c4',
        title: 'ยินยอมแลกเปลี่ยนข้อมูลระหว่างหน่วยบริการ',
        detail:
          'ข้าพเจ้ายินยอมให้แลกเปลี่ยนข้อมูลการรักษากับสถานพยาบาลหรือหน่วยบริการอื่นในเครือข่าย เมื่อมีความจำเป็นต่อการต่อเนื่องของการดูแลรักษาหรือการส่งต่อ',
      },
      {
        id: 'c5',
        title: 'ยินยอมใช้ข้อมูลเพื่อการติดตามอาการ',
        detail:
          'ข้าพเจ้ายินยอมให้ใช้และเปิดเผยข้อมูลการรักษาเพื่อการนัดติดตามอาการ การฟื้นฟู และการประเมินผลลัพธ์ของการรักษา',
      },
      {
        id: 'c6',
        title: 'ขอบเขตการใช้ข้อมูลสุขภาพ',
        detail:
          'ข้าพเจ้าเข้าใจว่าข้อมูลการรักษาจะถูกใช้เพื่อการดูแลรักษา การส่งต่อ และการติดตามอาการเท่านั้น เว้นแต่ได้รับความยินยอมเพิ่มเติมหรือมีกฎหมายกำหนด',
      },
      {
        id: 'c7',
        title: 'สิทธิ์ในการถอนความยินยอม',
        detail:
          'ข้าพเจ้าเข้าใจว่าสามารถถอนความยินยอมเปิดเผยข้อมูลการรักษานี้ได้ทุกเมื่อ โดยไม่กระทบสิทธิ์ในการรับการรักษาพยาบาลที่จำเป็น',
      },
      {
        id: 'c8',
        title: 'ยืนยันว่าได้อ่านและเข้าใจข้อมูลครบถ้วน',
        detail:
          'ข้าพเจ้ายืนยันว่าได้อ่าน เข้าใจ และมีโอกาสซักถามเกี่ยวกับเนื้อหาในแบบฟอร์มนี้ครบถ้วนก่อนลงนามให้ความยินยอมเปิดเผยข้อมูลการรักษา',
      },
    ],
  },
  'CL-1011': {
    id: 'CL-1011',
    title: 'ใบยินยอมเปิดเผยข้อมูลเพื่อการเบิกจ่าย',
    categoryLabel: 'เบิกจ่าย',
    categoryStyle: 'magenta',
    version: '1.0',
    cover: consentFormCoverUrl(2),
    cardCategoryLabel: 'เบิกจ่าย',
    cardCategoryStyle: 'magenta',
    cardVersion: '1.0',
    patientFields: sharedPatientFields,
    signatures: patientOnlySignatures,
    intro:
      'ข้าพเจ้าได้รับคำอธิบายถึงความจำเป็นในการเปิดเผยข้อมูลส่วนบุคคลและข้อมูลการรักษาที่จำเป็น เพื่อใช้ในการตรวจสอบสิทธิ์ พิจารณาอนุมัติ และเบิกจ่ายค่ารักษาพยาบาลตามสิทธิ์ที่ข้าพเจ้าใช้',
    signatureNote: 'หมายเหตุ เอกสารมีอายุ 365 วัน นับจากวันที่ลงนาม',
    clauses: [
      {
        id: 'c1',
        title: 'ยินยอมเปิดเผยข้อมูลเพื่อการเบิกค่ารักษา',
        detail:
          'ข้าพเจ้ายินยอมให้เปิดเผยข้อมูลที่จำเป็นต่อการเบิกจ่ายค่ารักษาพยาบาล เช่น รายการบริการ รหัสโรค/หัตถการ และเอกสารประกอบสิทธิ์ แก่หน่วยงานประกันหรือหน่วยงานเบิกจ่ายที่เกี่ยวข้อง',
      },
      {
        id: 'c2',
        title: 'ยินยอมส่งข้อมูลแก่ผู้ให้สิทธิ์/บริษัทประกัน',
        detail:
          'ข้าพเจ้ายินยอมให้สถานพยาบาลส่งข้อมูลการรักษาและค่าใช้จ่ายไปยังสำนักงานหลักประกันสุขภาพ หน่วยงานราชการ หรือบริษัทประกันตามสิทธิ์ที่ข้าพเจ้าใช้',
      },
      {
        id: 'c3',
        title: 'ยินยอมเปิดเผยข้อมูลสิทธิ์และการรับรองสิทธิ์',
        detail:
          'ข้าพเจ้ายินยอมให้เปิดเผยข้อมูลสิทธิ์การรักษา สถานะการรับรองสิทธิ์ และเอกสารอ้างอิงที่จำเป็นต่อการพิจารณาเบิกจ่าย',
      },
      {
        id: 'c4',
        title: 'ยินยอมเปิดเผยใบแจ้งหนี้และรายการค่าใช้จ่าย',
        detail:
          'ข้าพเจ้ายินยอมให้เปิดเผยใบแจ้งหนี้ รายการค่าบริการ และเอกสารทางการเงินที่เกี่ยวข้องกับการเบิกจ่ายแก่หน่วยงานที่รับผิดชอบ',
      },
      {
        id: 'c5',
        title: 'ยินยอมให้ตรวจสอบข้อมูลย้อนหลัง',
        detail:
          'ข้าพเจ้ายินยอมให้หน่วยงานที่เกี่ยวข้องตรวจสอบและเรียกดูข้อมูลที่จำเป็นต่อการตรวจสอบการเบิกจ่ายย้อนหลัง ตามระยะเวลาที่กฎหมายหรือข้อตกลงกำหนด',
      },
      {
        id: 'c6',
        title: 'ขอบเขตข้อมูลที่ใช้ในการเบิกจ่าย',
        detail:
          'ข้าพเจ้าได้รับทราบว่าจะเปิดเผยเฉพาะข้อมูลที่จำเป็นต่อการพิจารณาอนุมัติและเบิกจ่ายเท่านั้น และจะไม่เปิดเผยข้อมูลส่วนเกินโดยไม่จำเป็น',
      },
      {
        id: 'c7',
        title: 'สิทธิ์ในการถอนความยินยอม',
        detail:
          'ข้าพเจ้าเข้าใจว่าสามารถถอนความยินยอมนี้ได้ทุกเมื่อ แต่การถอนอาจส่งผลต่อการเบิกจ่ายสิทธิ์บางประเภทตามเงื่อนไขของหน่วยงานที่เกี่ยวข้อง',
      },
      {
        id: 'c8',
        title: 'ยืนยันว่าได้อ่านและเข้าใจข้อมูลครบถ้วน',
        detail:
          'ข้าพเจ้ายืนยันว่าได้อ่าน เข้าใจ และมีโอกาสซักถามเกี่ยวกับเนื้อหาในแบบฟอร์มนี้ครบถ้วนก่อนลงนามให้ความยินยอมเปิดเผยข้อมูลเพื่อการเบิกจ่าย',
      },
    ],
  },
};

export const REGISTRATION_REQUIRED_CONSENT_IDS = Object.keys(REGISTRATION_CONSENT_FORMS);

export const REGISTRATION_PENDING_CONSENT_CARDS = Object.values(REGISTRATION_CONSENT_FORMS).map((f) => ({
  id: f.id,
  categoryLabel: f.cardCategoryLabel,
  categoryStyle: f.cardCategoryStyle,
  version: f.cardVersion,
  title: f.title,
  code: f.id,
  cover: f.cover,
}));

/** การ์ดหน้าตาเดียวกับที่ใช้ในขั้นที่ 1 — ประกอบจาก meta ของใบ */
export const consentFormToCard = (f) => (f ? {
  id: f.id,
  categoryLabel: f.cardCategoryLabel,
  categoryStyle: f.cardCategoryStyle,
  version: f.cardVersion,
  title: f.title,
  code: f.id,
  cover: f.cover,
} : null);

/** เข้มกว่า `getRegistrationConsentForm` — ไม่ fallback เป็น PD-1011
    ใช้ตอนถามว่า "รหัสนี้เป็นใบของขั้นลงทะเบียนจริงไหม" */
export const findRegistrationConsentForm = (id) => (
  REGISTRATION_CONSENT_FORMS[id] || REGISTRATION_OTHER_CONSENT_FORMS[id] || null
);

export const getRegistrationConsentForm = (id) => (
  REGISTRATION_CONSENT_FORMS[id]
  || REGISTRATION_OTHER_CONSENT_FORMS[id]
  || REGISTRATION_CONSENT_FORMS['PD-1011']
);

/** เข้มกว่า `resolveRegistrationConsentFormId` — คืน `null` เมื่อ record ไม่ได้
    อยู่ในหัวข้อหลักทั้งสาม แทนที่จะ fallback เป็น PD-1011
    ใช้ตอนถามว่า "ผู้รับบริการรายนี้ขอความยินยอมใบไหนไปแล้วบ้าง" — ถ้าใช้ตัวที่
    fallback จะนับ record หัวข้ออื่นเป็น "ขอข้อมูลส่วนบุคคลแล้ว" ผิดทั้งหมด */
export const matchRegistrationConsentFormId = ({ formCode, type } = {}) => {
  const code = String(formCode || '').trim();
  if (REGISTRATION_CONSENT_FORMS[code]) return code;
  const t = String(type || '').trim();
  if (/เบิก/.test(t)) return 'CL-1011';
  if (/รักษา/.test(t)) return 'TX-1011';
  if (t === 'PDPA' || /ส่วนบุคคล/.test(t)) return 'PD-1011';
  return null;
};

/** Map consent worklist / timeline event → registration disclosure form id.
    Prefers PD-1011 / TX-1011 / CL-1011 codes; falls back by type; else PD-1011. */
export const resolveRegistrationConsentFormId = ({ formCode, type } = {}) => {
  const code = String(formCode || '').trim();
  if (REGISTRATION_CONSENT_FORMS[code]) return code;
  const t = String(type || '').trim();
  /* รับได้ทั้งชื่อหัวข้อหลักปัจจุบัน (ข้อมูลส่วนบุคคล / ข้อมูลการรักษา /
     การเบิกจ่าย) และค่าเดิม (PDPA / การรักษา / เบิกจ่าย) ที่อาจค้างใน
     localStorage ของเครื่องที่ยังไม่ re-seed */
  if (/เบิก/.test(t)) return 'CL-1011';
  if (/รักษา/.test(t)) return 'TX-1011';
  if (t === 'PDPA' || /ส่วนบุคคล/.test(t) || /PDPA|ส่วนบุคคล/i.test(code)) return 'PD-1011';
  return 'PD-1011';
};

/* ── แบบฟอร์มอื่นๆ ของขั้นลงทะเบียน ────────────────────────────────────
   ใบยินยอมที่เผยแพร่อยู่ในระบบจัดการความยินยอม แต่ไม่ได้อยู่ในชุดบังคับ 3 ใบ
   ของการลงทะเบียน เจ้าหน้าที่พิมพ์หรือให้ลงนามที่เคาน์เตอร์ได้เช่นกัน

   เนื้อข้อสัญญา/ช่องข้อมูล/ช่องลงนามยืมของใบบังคับที่อยู่ "หัวข้อหลัก" เดียวกัน
   (ข้อมูลส่วนบุคคล → PD-1011 · ข้อมูลการรักษา → TX-1011 · การเบิกจ่าย → CL-1011)
   ส่วนรหัส/ชื่อ/เวอร์ชันเป็นของใบนั้นเอง — ทะเบียนแบบฟอร์มยังไม่ได้เก็บตัวบทของ
   แต่ละใบไว้ พอมีของจริงให้เปลี่ยนมาอ่านจากทะเบียนแทนการยืมนี้ */
export const REGISTRATION_OTHER_CONSENT_FORMS = Object.fromEntries(
  CONSENT_WORKLIST_FORM_POOL
    .filter((f) => !Object.values(REGISTRATION_CONSENT_FORMS).some((r) => r.title === f.name))
    .map((f, i) => {
      const base = REGISTRATION_CONSENT_FORMS[
        resolveRegistrationConsentFormId({ type: f.worklistType })
      ];
      const version = String(f.version || '').replace(/^V\s*/, '') || '1.0';
      return [f.code, {
        ...base,
        id: f.code,
        title: f.name,
        version,
        categoryLabel: f.worklistType,
        categoryStyle: CONSENT_TOPIC_TONE[f.worklistType] || 'grey',
        cardCategoryLabel: f.worklistType,
        cardCategoryStyle: CONSENT_TOPIC_TONE[f.worklistType] || 'grey',
        cardVersion: version,
        cover: consentFormCoverUrl(i + 3),
      }];
    }),
);

export const REGISTRATION_OTHER_CONSENT_CARDS = Object.values(REGISTRATION_OTHER_CONSENT_FORMS)
  .map((f) => ({
    id: f.id,
    categoryLabel: f.cardCategoryLabel,
    categoryStyle: f.cardCategoryStyle,
    version: f.cardVersion,
    title: f.title,
    code: f.id,
    cover: f.cover,
  }));
