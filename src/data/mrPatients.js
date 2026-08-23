/* Medical Records (MR) patient roster — Thai names with realistic IDs,
   phone numbers, and treatment-rights labels. Source of truth for both
   the MR queue table and the MR registration form (data flows via
   <Link state={...}> when the user clicks a row).

   Target size: 100 unique MPI rows (HN 67-00001…67-00100, unique full name).
   Portraits live under public/avatars/ (41 headshots, cycled — see the
   avatar-assignment block below). */

import { PATIENT_AVATAR_POOL } from '@/data/avatarAssets';

export const MR_RIGHTS = [
  'บัตรทอง',
  'ประกันสังคม',
  'ข้าราชการ',
  'รัฐวิสาหกิจ',
  'ชำระเงินเอง',
  'ประกันชีวิต AIA',
];

export const MR_STATUS = [
  { key: 'active',    label: 'Active'    },
  { key: 'inactive',  label: 'Inactive'  },
  { key: 'pending',   label: 'รอลงทะเบียน' },
  { key: 'draft',     label: 'ที่ร่างไว้'   },
];

/* TOR §1.1.1.2 — สถานะการมีชีวิต (shared by registration + module MPI tables). */
export const MR_LIFE_STATUS = [
  { key: 'alive',    label: 'มีชีวิตอยู่' },
  { key: 'deceased', label: 'เสียชีวิต'  },
];

export const lifeStatusLabel = (status) => (
  MR_LIFE_STATUS.find((s) => s.key === (status || 'alive'))?.label
  || 'มีชีวิตอยู่'
);

/** เพศกำเนิด — smart-card / MR registration (matches `gender` on roster rows). */
export const MR_GENDERS = ['ชาย', 'หญิง', 'อื่นๆ'];

/** เพศสภาพ — MR master list (distinct from เพศกำเนิด; PHCIS registration Step 1). */
export const MR_GENDER_IDENTITIES = ['ชาย', 'หญิง', 'ข้ามเพศ', 'อื่นๆ', 'ไม่ระบุ'];

/* Each row carries enough to fully prefill Step 1 (personal) without
   round-tripping a fetch. Step 2-5 use the same row plus their own
   form-specific defaults. */
export const MR_PATIENTS = [
  {
    hn: '67-00001',
    prefixTh: 'นาย',
    firstNameTh: 'สมชาย',
    lastNameTh: 'มั่นใจดี',
    prefixEn: 'Mr.',
    firstNameEn: 'Somchai',
    lastNameEn: 'Manjaidee',
    nationalId: '1-1670-89302-23-5',
    dob: '20 พฤศจิกายน 2532',
    age: 37,
    gender: 'ชาย',
    genderIdentity: 'ชาย',
    phone: '081-234-5678',
    altPhone: '081-234-9078',
    email: 'somchai.m@email.com',
    rights: 'ประกันสังคม',
    status: 'active',
    registeredOn: '5 กรกฎาคม 2566',
    bloodType: 'O',
    education: 'ปริญญาตรี',
    occupation: 'พนักงานบริษัทเอกชน',
    marital: 'สมรส',
    spouseName: '',
    address: {
      zip: '10260', province: 'กรุงเทพมหานคร', district: 'พระโขนง', subdistrict: 'บางจาก',
      road: 'สุขุมวิท', moo: 'พงษ์เวชอนุสรณ์ 2', houseNo: '124/64',
    },
    emergency: [
      { name: 'กิตติ', last: 'มั่นใจดี', relation: 'บิดา', phone: '081-326-9865' },
    ],
    insurance: [
      { type: 'ประกันสังคม', claimCode: 'CLAIM-001', verified: true },
    ],
    mobility: 'เดิน',
    flags: { vip: false, allergyDrug: true, allergyOther: false, chronic: true },
    /* Figma 150:33649 — seed the demo patient with the full allergy +
       chronic-disease set so the treatment header reflects the prototype
       1:1 across all 7 steps. */
    drugAllergies: [
      { name: 'Penicillin',   symptom: 'อาการแพ้รุนแรง เช่น Anaphylaxis, ผื่นลมพิษทั่วตัว, หน้าบวม, หายใจไม่ออก', severity: 'critical' },
      { name: 'Sulfonamides', symptom: 'ผื่น Stevens-Johnson Syndrome (SJS) หรือผื่นแดงทั่วตัว, ไข้, ตุ่มน้ำพอง',  severity: 'critical' },
      { name: 'Aspirin',      symptom: 'ติดผ่าเร็บ / หลอดลมหดเกร็ง, ผื่นลมพิษ, คัดจมูก น้ำมูกไหล',                  severity: 'high'     },
      { name: 'NSAIDs',       symptom: 'ปวดท้อง / หลอดอาหารอักเสบ, ผื่นลมพิษ, คัดจมูก น้ำมูกไหล',                   severity: 'high'     },
      { name: 'โรคลมชัก',      symptom: 'ชักเกร็งกระตุก, หมดสติชั่วคราว',                                            severity: 'mild'     },
    ],
    chronicDiseases: [
      { name: 'หัวใจล้มเหลว',                severity: 'critical', detail: 'NYHA class II · EF 35% · รับยา Furosemide, Carvedilol · ติดตาม cardiology ทุก 3 เดือน' },
      { name: 'โรคไตเรื้อรัง ระยะ 3–4 (CKD)', severity: 'high',     detail: 'eGFR 32 ml/min/1.73m² · ควบคุมอาการ · งด NSAIDs · ติดตาม nephrology ทุก 3 เดือน' },
      { name: 'ความดันโลหิตสูง (HT)',         severity: 'medium',   detail: 'BP เป้าหมาย < 130/80 mmHg · รับยา Amlodipine 5 mg วันละ 1 ครั้ง · ตรวจ BP ที่บ้านสัปดาห์ละ 2 ครั้ง' },
    ],
  },
  {
    hn: '67-00002',
    prefixTh: 'นางสาว', firstNameTh: 'สมหญิง', lastNameTh: 'มีสุข',
    prefixEn: 'Ms.', firstNameEn: 'Somying', lastNameEn: 'Meesuk',
    nationalId: '1-1001-08881-44-6',
    dob: '15 มกราคม 2520', age: 49, gender: 'หญิง', genderIdentity: 'หญิง',
    phone: '089-435-3543', altPhone: '', email: 'somying.m@email.com',
    rights: 'บัตรทอง', status: 'active', registeredOn: '12 มีนาคม 2565',
    bloodType: 'A', education: 'มัธยมศึกษา', occupation: 'พนักงานราชการ',
    marital: 'โสด', spouseName: '',
    address: { zip: '10310', province: 'กรุงเทพมหานคร', district: 'ดินแดง', subdistrict: 'ดินแดง', road: 'ประชาสงเคราะห์', moo: '', houseNo: '88/12' },
    emergency: [{ name: 'มาลี', last: 'มีสุข', relation: 'มารดา', phone: '081-555-1212' }],
    insurance: [{ type: 'บัตรทอง', claimCode: 'UC-2024-1024', verified: true }],
    mobility: 'เดิน', flags: { vip: false, allergyDrug: true, allergyOther: false, chronic: true },
    drugAllergies: [
      { name: 'Codeine', symptom: 'ผื่นลมพิษ, คลื่นไส้', severity: 'medium' },
    ],
    chronicDiseases: [
      { name: 'โรคจมูกอักเสบจากภูมิแพ้ (AR)', severity: 'medium', detail: 'แพ้ฝุ่นละออง · ใช้ Cetirizine ตามอาการ' },
      { name: 'โรคหืด (Asthma)', severity: 'high', detail: 'ควบคุมด้วย ICS · มีเครื่องพ่นยาสำรอง' },
    ],
  },
  {
    hn: '67-00003',
    prefixTh: 'นาย', firstNameTh: 'วีระ', lastNameTh: 'ดีงาม',
    prefixEn: 'Mr.', firstNameEn: 'Veera', lastNameEn: 'Deengarm',
    nationalId: '1-1101-34561-67-9',
    dob: '22 มีนาคม 2535', age: 32, gender: 'ชาย', genderIdentity: 'ชาย',
    phone: '089-564-2425', altPhone: '02-100-2200', email: '',
    rights: 'ข้าราชการ', status: 'pending', registeredOn: '—',
    bloodType: 'B', education: 'ปริญญาโท', occupation: 'ข้าราชการ',
    marital: 'สมรส', spouseName: 'ปิยะดา ดีงาม',
    address: { zip: '11000', province: 'นนทบุรี', district: 'เมืองนนทบุรี', subdistrict: 'บางกระสอ', road: 'ติวานนท์', moo: '5', houseNo: '301' },
    emergency: [{ name: 'ปิยะดา', last: 'ดีงาม', relation: 'คู่สมรส', phone: '081-401-3399' }],
    insurance: [{ type: 'ข้าราชการ', claimCode: 'CSMBS-66-019', verified: true }],
    mobility: 'เดิน', flags: { vip: false, allergyDrug: true, allergyOther: false, chronic: true },
    drugAllergies: [
      { name: 'Penicillin', symptom: 'ผื่นลมพิษทั่วตัว, หน้าบวม', severity: 'critical' },
      { name: 'NSAIDs', symptom: 'ปวดท้อง / ผื่นลมพิษ', severity: 'high' },
    ],
    chronicDiseases: [
      { name: 'โรคเบาหวานชนิดที่ 2 (DM)', severity: 'high'   },
      { name: 'ไขมันในเลือดสูง (Dyslipidemia)', severity: 'medium' },
    ],
  },
  {
    hn: '67-00004',
    prefixTh: 'นาง', firstNameTh: 'ทักษพร', lastNameTh: 'ขำใจ',
    prefixEn: 'Mrs.', firstNameEn: 'Taksaporn', lastNameEn: 'Khamjai',
    nationalId: '1-1101-34561-67-9',
    dob: '8 ตุลาคม 2519', age: 50, gender: 'หญิง', genderIdentity: 'หญิง',
    phone: '089-564-2425', altPhone: '', email: 'taksaporn@gmail.com',
    rights: 'ประกันสังคม', status: 'active', registeredOn: '20 กันยายน 2566',
    bloodType: 'AB', education: 'ปริญญาตรี', occupation: 'พยาบาล',
    marital: 'สมรส', spouseName: 'ชัยพร ขำใจ',
    address: { zip: '10160', province: 'กรุงเทพมหานคร', district: 'บางบอน', subdistrict: 'บางบอน', road: 'เอกชัย', moo: '4', houseNo: '99/77' },
    emergency: [{ name: 'ชัยพร', last: 'ขำใจ', relation: 'คู่สมรส', phone: '081-922-1100' }],
    insurance: [{ type: 'ประกันสังคม', claimCode: 'SSO-2566-770', verified: true }],
    mobility: 'เดิน', flags: { vip: false, allergyDrug: true, allergyOther: false, chronic: true },
    drugAllergies: [
      { name: 'Sulfa', symptom: 'ผื่นแดงทั่วตัว', severity: 'high' },
    ],
    chronicDiseases: [
      { name: 'ไมเกรน (Migraine)', severity: 'medium', detail: 'ปวดศีรษะเป็นพัก ๆ · หลีกเลี่ยงทริกเกอร์' },
    ],
  },
  {
    hn: '67-00005',
    prefixTh: 'นาย', firstNameTh: 'สุวัฒน์', lastNameTh: 'จิรพัฒนกุล',
    prefixEn: 'Mr.', firstNameEn: 'Suwat', lastNameEn: 'Jirapatanakul',
    nationalId: '1-1101-34561-67-9',
    dob: '3 กรกฎาคม 2558', age: 10, gender: 'ชาย', genderIdentity: 'ชาย',
    phone: '089-564-2425', altPhone: '', email: '',
    rights: 'บัตรทอง', status: 'active', registeredOn: '1 กุมภาพันธ์ 2566',
    bloodType: 'O', education: 'ประถมศึกษา', occupation: 'นักเรียน',
    marital: 'โสด', spouseName: '',
    address: { zip: '10240', province: 'กรุงเทพมหานคร', district: 'บางกะปิ', subdistrict: 'หัวหมาก', road: 'ลาดพร้าว', moo: '', houseNo: '15/2' },
    emergency: [{ name: 'จิรา', last: 'จิรพัฒนกุล', relation: 'มารดา', phone: '089-101-2233' }],
    insurance: [{ type: 'บัตรทอง', claimCode: 'UC-2024-1188', verified: true }],
    mobility: 'เดิน', flags: { vip: false, allergyDrug: true, allergyOther: false, chronic: true },
    drugAllergies: [
      { name: 'Amoxicillin', symptom: 'ผื่นลมพิษ', severity: 'high' },
    ],
    chronicDiseases: [
      { name: 'โรคหืดในเด็ก (Asthma)', severity: 'medium', detail: 'ใช้ยาพ่นตามแผน · ติดตามคลินิกเด็ก' },
    ],
  },
  {
    hn: '67-00006',
    prefixTh: 'นาง', firstNameTh: 'ปรียา', lastNameTh: 'สุพรรณ',
    prefixEn: 'Mrs.', firstNameEn: 'Preeya', lastNameEn: 'Suphan',
    nationalId: '3-1009-22341-89-2',
    dob: '30 ธันวาคม 2498', age: 70, gender: 'หญิง', genderIdentity: 'หญิง',
    phone: '081-394-3346', altPhone: '02-345-6677', email: '',
    rights: 'บัตรทอง', status: 'active', registeredOn: '15 เมษายน 2565',
    bloodType: 'A', education: 'ประถมศึกษา', occupation: 'แม่บ้าน',
    marital: 'หม้าย', spouseName: '',
    address: { zip: '10110', province: 'กรุงเทพมหานคร', district: 'วัฒนา', subdistrict: 'คลองเตยเหนือ', road: 'อโศก', moo: '', houseNo: '71/9' },
    emergency: [{ name: 'อรอนงค์', last: 'สุพรรณ', relation: 'บุตรสาว', phone: '089-712-4455' }],
    insurance: [{ type: 'บัตรทอง', claimCode: 'UC-2024-2299', verified: true }],
    mobility: 'นั่งรถเข็น', flags: { vip: true, allergyDrug: true, allergyOther: false, chronic: true },
    drugAllergies: [
      { name: 'Penicillin', symptom: 'ผื่นลมพิษ, คัน', severity: 'high' },
      { name: 'Aspirin', symptom: 'หายใจลำบาก / หลอดลมหดเกร็ง', severity: 'critical' },
    ],
    chronicDiseases: [
      { name: 'ความดันโลหิตสูง (HT)',         severity: 'medium'   },
      { name: 'โรคหลอดเลือดสมอง (Stroke)',    severity: 'critical' },
    ],
  },
  {
    hn: '67-00007',
    prefixTh: 'นาย', firstNameTh: 'ธนาพล', lastNameTh: 'วศ์กุล',
    prefixEn: 'Mr.', firstNameEn: 'Thanapol', lastNameEn: 'Wongkul',
    nationalId: '1-1010-44567-90-1',
    dob: '18 สิงหาคม 2533', age: 35, gender: 'ชาย', genderIdentity: 'ชาย',
    phone: '089-564-2425', altPhone: '', email: 'thanapol.w@example.com',
    rights: 'รัฐวิสาหกิจ', status: 'active', registeredOn: '8 พฤษภาคม 2566',
    bloodType: 'B', education: 'ปริญญาตรี', occupation: 'วิศวกร',
    marital: 'สมรส', spouseName: 'ณัฐิกา วศ์กุล',
    address: { zip: '11140', province: 'นนทบุรี', district: 'บางใหญ่', subdistrict: 'บางใหญ่', road: 'รัตนาธิเบศร์', moo: '8', houseNo: '256' },
    emergency: [{ name: 'ณัฐิกา', last: 'วศ์กุล', relation: 'คู่สมรส', phone: '089-887-1100' }],
    insurance: [{ type: 'รัฐวิสาหกิจ', claimCode: 'SOE-66-554', verified: true }],
    mobility: 'เดิน', flags: { vip: false, allergyDrug: true, allergyOther: false, chronic: true },
    drugAllergies: [
      { name: 'Statins', symptom: 'ปวดกล้ามเนื้อ / Myalgia', severity: 'medium' },
    ],
    chronicDiseases: [
      { name: 'ไขมันในเลือดสูง (Dyslipidemia)', severity: 'high', detail: 'LDL สูง · ปรับอาหาร + ติดตาม lipid profile' },
      { name: 'ความดันโลหิตสูง (HT)', severity: 'medium', detail: 'BP เป้าหมาย < 130/80' },
    ],
  },
  {
    hn: '67-00008',
    prefixTh: 'นางสาว', firstNameTh: 'มาลีรัตน์', lastNameTh: 'ธนาวัตน',
    prefixEn: 'Ms.', firstNameEn: 'Maleeratana', lastNameEn: 'Thanawat',
    nationalId: '1-1020-78090-11-3',
    dob: '12 กุมภาพันธ์ 2545', age: 23, gender: 'หญิง', genderIdentity: 'ข้ามเพศ',
    phone: '089-564-2425', altPhone: '', email: 'malee.t@email.com',
    rights: 'ชำระเงินเอง', status: 'pending', registeredOn: '—',
    bloodType: 'O', education: 'ปริญญาตรี', occupation: 'นักศึกษา',
    marital: 'โสด', spouseName: '',
    address: { zip: '10330', province: 'กรุงเทพมหานคร', district: 'ปทุมวัน', subdistrict: 'ปทุมวัน', road: 'พระราม 1', moo: '', houseNo: '49/8' },
    emergency: [{ name: 'สมศรี', last: 'ธนาวัตน', relation: 'มารดา', phone: '081-441-9090' }],
    insurance: [{ type: 'ชำระเงินเอง', claimCode: '—', verified: false }],
    mobility: 'เดิน', flags: { vip: false, allergyDrug: false, allergyOther: false, chronic: false },
    drugAllergies: [],
    chronicDiseases: [],
  },
  {
    hn: '67-00009',
    prefixTh: 'นาง', firstNameTh: 'น้ำใส', lastNameTh: 'โพธิ์',
    prefixEn: 'Mrs.', firstNameEn: 'Numsai', lastNameEn: 'Pho',
    nationalId: '1-1019-34561-67-9',
    dob: '11 พ.ค. 2488', age: 80, gender: 'หญิง', genderIdentity: 'หญิง',
    phone: '089-564-2425', altPhone: '', email: '',
    rights: 'บัตรทอง', status: 'active', registeredOn: '10 มิถุนายน 2564',
    bloodType: 'A', education: 'ประถมศึกษา', occupation: 'เกษียณ',
    marital: 'หม้าย', spouseName: '',
    address: { zip: '10120', province: 'กรุงเทพมหานคร', district: 'บางรัก', subdistrict: 'สีลม', road: 'สีลม', moo: '', houseNo: '212/5' },
    emergency: [{ name: 'ณัฐกานต์', last: 'โพธิ์', relation: 'บุตรชาย', phone: '081-554-7788' }],
    insurance: [{ type: 'บัตรทอง', claimCode: 'UC-2024-3309', verified: true }],
    mobility: 'นั่งรถเข็น', flags: { vip: false, allergyDrug: true, allergyOther: false, chronic: true },
    drugAllergies: [{ name: 'NSAIDs', symptom: 'ปวดท้อง / หลอดอาหารอักเสบ, ผื่นลมพิษ, คัดจมูก น้ำมูกไหล', severity: 'medium' }],
    chronicDiseases: [
      { name: 'หัวใจล้มเหลว (CHF)',          severity: 'critical' },
      { name: 'โรคไตเรื้อรัง ระยะ 3–4 (CKD)', severity: 'high'     },
    ],
  },
  {
    hn: '67-00010',
    prefixTh: 'นาย', firstNameTh: 'นภา', lastNameTh: 'มนตรา',
    prefixEn: 'Mr.', firstNameEn: 'Napha', lastNameEn: 'Montra',
    nationalId: '1-1011-34561-67-9',
    dob: '22 มีนาคม 2535', age: 31, gender: 'ชาย', genderIdentity: 'ชาย',
    phone: '089-564-2425', altPhone: '', email: '',
    rights: 'ประกันสังคม', status: 'active', registeredOn: '3 มกราคม 2566',
    bloodType: 'B', education: 'ปริญญาตรี', occupation: 'พนักงานบริษัท',
    marital: 'โสด', spouseName: '',
    address: { zip: '10310', province: 'กรุงเทพมหานคร', district: 'ห้วยขวาง', subdistrict: 'ห้วยขวาง', road: 'ประชาราษฎร์บำเพ็ญ', moo: '', houseNo: '64/22' },
    emergency: [{ name: 'นภัสสร', last: 'มนตรา', relation: 'พี่สาว', phone: '081-988-3344' }],
    insurance: [{ type: 'ประกันสังคม', claimCode: 'SSO-2566-902', verified: true }],
    mobility: 'เดิน', flags: { vip: false, allergyDrug: false, allergyOther: false, chronic: false },
    drugAllergies: [],
    chronicDiseases: [],
  },
  /* New walk-ins — ไม่เคยใช้บริการ · รอลงทะเบียน (see PENDING_REGISTRATION_NO_PHOTO). */
  {
    hn: '67-00026',
    prefixTh: 'นาย', firstNameTh: 'ก้องภพ', lastNameTh: 'ศรีวงศ์',
    prefixEn: 'Mr.', firstNameEn: 'Kongphop', lastNameEn: 'Srivong',
    nationalId: '1-1012-00894-52-1',
    dob: '14 มีนาคม 2534', age: 34, gender: 'ชาย', genderIdentity: 'ชาย',
    phone: '081-902-1143', altPhone: '', email: '',
    rights: 'ประกันสังคม', status: 'pending', registeredOn: '—',
    bloodType: 'O', education: 'ปริญญาตรี', occupation: 'พนักงานบริษัท',
    marital: 'โสด', spouseName: '',
    address: { zip: '10150', province: 'กรุงเทพมหานคร', district: 'บางมด', subdistrict: 'บางมด', road: 'พระราม 2', moo: '', houseNo: '42/8' },
    emergency: [{ name: 'สุภาพร', last: 'ศรีวงศ์', relation: 'มารดา', phone: '089-441-2201' }],
    insurance: [{ type: 'ประกันสังคม', claimCode: '—', verified: false }],
    mobility: 'เดิน', flags: { vip: false, allergyDrug: false, allergyOther: false, chronic: false },
    drugAllergies: [], chronicDiseases: [],
  },
  {
    hn: '67-00027',
    prefixTh: 'นางสาว', firstNameTh: 'จิราพร', lastNameTh: 'มณีโชติ',
    prefixEn: 'Ms.', firstNameEn: 'Jiraporn', lastNameEn: 'Maneechot',
    nationalId: '1-8099-00812-36-4',
    dob: '2 กุมภาพันธ์ 2546', age: 22, gender: 'หญิง', genderIdentity: 'หญิง',
    phone: '092-558-9034', altPhone: '', email: 'jiraporn.m@email.com',
    rights: 'บัตรทอง', status: 'pending', registeredOn: '—',
    bloodType: 'A', education: 'ปริญญาตรี', occupation: 'นักศึกษา',
    marital: 'โสด', spouseName: '',
    address: { zip: '10240', province: 'กรุงเทพมหานคร', district: 'บางกะปิ', subdistrict: 'หัวหมาก', road: 'ลาดพร้าว', moo: '', houseNo: '19/3' },
    emergency: [{ name: 'วิไล', last: 'มณีโชติ', relation: 'มารดา', phone: '081-773-4490' }],
    insurance: [{ type: 'บัตรทอง', claimCode: '—', verified: false }],
    mobility: 'เดิน', flags: { vip: false, allergyDrug: false, allergyOther: false, chronic: false },
    drugAllergies: [], chronicDiseases: [],
  },
  {
    hn: '67-00028',
    prefixTh: 'นาย', firstNameTh: 'พงศ์ศักดิ์', lastNameTh: 'แสงทอง',
    prefixEn: 'Mr.', firstNameEn: 'Pongsak', lastNameEn: 'Saengthong',
    nationalId: '3-1040-19284-75-9',
    dob: '19 มกราคม 2527', age: 41, gender: 'ชาย', genderIdentity: 'ชาย',
    phone: '089-701-3382', altPhone: '', email: '',
    rights: 'ชำระเงินเอง', status: 'pending', registeredOn: '—',
    bloodType: 'B', education: 'มัธยมศึกษา', occupation: 'ค้าขาย',
    marital: 'สมรส', spouseName: 'นภา แสงทอง',
    address: { zip: '10700', province: 'กรุงเทพมหานคร', district: 'บางพลัด', subdistrict: 'บางพลัด', road: 'จรัญสนิทวงศ์', moo: '', houseNo: '7/11' },
    emergency: [{ name: 'นภา', last: 'แสงทอง', relation: 'คู่สมรส', phone: '081-220-9910' }],
    insurance: [{ type: 'ชำระเงินเอง', claimCode: '—', verified: false }],
    mobility: 'เดิน', flags: { vip: false, allergyDrug: false, allergyOther: false, chronic: false },
    drugAllergies: [], chronicDiseases: [],
  },
  {
    hn: '67-00029',
    prefixTh: 'นางสาว', firstNameTh: 'อาทิตยา', lastNameTh: 'บุญเรือง',
    prefixEn: 'Ms.', firstNameEn: 'Arthiya', lastNameEn: 'Boonruang',
    nationalId: '3-4012-01029-58-7',
    dob: '6 กรกฎาคม 2541', age: 27, gender: 'หญิง', genderIdentity: 'หญิง',
    phone: '063-884-1205', altPhone: '', email: '',
    rights: 'ประกันสังคม', status: 'pending', registeredOn: '—',
    bloodType: 'O', education: 'ปวส.', occupation: 'พนักงานโรงแรม',
    marital: 'โสด', spouseName: '',
    address: { zip: '10400', province: 'กรุงเทพมหานคร', district: 'ดินแดง', subdistrict: 'ดินแดง', road: 'รัชดาภิเษก', moo: '', houseNo: '63/5' },
    emergency: [{ name: 'บุญมี', last: 'บุญเรือง', relation: 'บิดา', phone: '02-641-7788' }],
    insurance: [{ type: 'ประกันสังคม', claimCode: '—', verified: false }],
    mobility: 'เดิน', flags: { vip: false, allergyDrug: false, allergyOther: false, chronic: false },
    drugAllergies: [], chronicDiseases: [],
  },
];

/* Compact filler rows — pad MPI roster to 100 with unique Thai names.
   Shared address / rights cycle keeps the file readable; each HN + name
   pair is unique (no overlap with the hand-authored rows above). */
const MR_FILLER_SEEDS = [
  { hn: '67-00011', prefixTh: 'นาย', firstNameTh: 'วิชัย', lastNameTh: 'รุ่งเรือง', prefixEn: 'Mr.', firstNameEn: 'Wichai', lastNameEn: 'Rungrueang', gender: 'ชาย', age: 45, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00012', prefixTh: 'นาง', firstNameTh: 'กนกวรรณ', lastNameTh: 'ศรีสุข', prefixEn: 'Mrs.', firstNameEn: 'Kanokwan', lastNameEn: 'Srisuk', gender: 'หญิง', age: 48, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00013', prefixTh: 'นาย', firstNameTh: 'อานนท์', lastNameTh: 'พานิช', prefixEn: 'Mr.', firstNameEn: 'Anon', lastNameEn: 'Phanit', gender: 'ชาย', age: 33, status: 'active', rights: 'ข้าราชการ' },
  { hn: '67-00014', prefixTh: 'นางสาว', firstNameTh: 'สุภาพร', lastNameTh: 'ใจดี', prefixEn: 'Ms.', firstNameEn: 'Supaporn', lastNameEn: 'Jaidee', gender: 'หญิง', age: 29, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00015', prefixTh: 'นาย', firstNameTh: 'ชาญชัย', lastNameTh: 'อินทร์ทอง', prefixEn: 'Mr.', firstNameEn: 'Chanchai', lastNameEn: 'Inthong', gender: 'ชาย', age: 52, status: 'inactive', rights: 'บัตรทอง' },
  { hn: '67-00016', prefixTh: 'นางสาว', firstNameTh: 'ปิยะดา', lastNameTh: 'วงศ์สกุล', prefixEn: 'Ms.', firstNameEn: 'Piyada', lastNameEn: 'Wongsakul', gender: 'หญิง', age: 26, status: 'active', rights: 'ชำระเงินเอง' },
  { hn: '67-00017', prefixTh: 'นาย', firstNameTh: 'ธีรพงษ์', lastNameTh: 'นาคินทร์', prefixEn: 'Mr.', firstNameEn: 'Teerapong', lastNameEn: 'Nakhin', gender: 'ชาย', age: 41, status: 'active', rights: 'รัฐวิสาหกิจ' },
  { hn: '67-00018', prefixTh: 'นาง', firstNameTh: 'วราภรณ์', lastNameTh: 'เพชรรัตน์', prefixEn: 'Mrs.', firstNameEn: 'Waraporn', lastNameEn: 'Petchrat', gender: 'หญิง', age: 55, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00019', prefixTh: 'นาย', firstNameTh: 'สมบูรณ์', lastNameTh: 'กาญจนวิทย์', prefixEn: 'Mr.', firstNameEn: 'Sombun', lastNameEn: 'Kanjanawit', gender: 'ชาย', age: 62, status: 'active', rights: 'ข้าราชการ' },
  { hn: '67-00020', prefixTh: 'นางสาว', firstNameTh: 'นิภา', lastNameTh: 'สายสมร', prefixEn: 'Ms.', firstNameEn: 'Nipa', lastNameEn: 'Saisamon', gender: 'หญิง', age: 31, status: 'draft', rights: 'ประกันสังคม' },
  { hn: '67-00021', prefixTh: 'นาย', firstNameTh: 'ฤทธิ์', lastNameTh: 'บุญมา', prefixEn: 'Mr.', firstNameEn: 'Rit', lastNameEn: 'Boonma', gender: 'ชาย', age: 38, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00022', prefixTh: 'นาง', firstNameTh: 'อรทัย', lastNameTh: 'จันทร์เพ็ญ', prefixEn: 'Mrs.', firstNameEn: 'Orathai', lastNameEn: 'Chanpen', gender: 'หญิง', age: 44, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00023', prefixTh: 'นาย', firstNameTh: 'พิชัย', lastNameTh: 'ทองดี', prefixEn: 'Mr.', firstNameEn: 'Pichai', lastNameEn: 'Thongdee', gender: 'ชาย', age: 36, status: 'pending', rights: 'ชำระเงินเอง' },
  { hn: '67-00024', prefixTh: 'นางสาว', firstNameTh: 'ศิริพร', lastNameTh: 'มหาชัย', prefixEn: 'Ms.', firstNameEn: 'Siriporn', lastNameEn: 'Mahachai', gender: 'หญิง', age: 28, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00025', prefixTh: 'นาย', firstNameTh: 'ณัฐพล', lastNameTh: 'แสงอรุณ', prefixEn: 'Mr.', firstNameEn: 'Nattapon', lastNameEn: 'Saengarun', gender: 'ชาย', age: 34, status: 'active', rights: 'ประกันชีวิต AIA' },
  { hn: '67-00030', prefixTh: 'นาง', firstNameTh: 'รุ่งนภา', lastNameTh: 'วิไลเลิศ', prefixEn: 'Mrs.', firstNameEn: 'Rungnapha', lastNameEn: 'Wilailert', gender: 'หญิง', age: 47, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00031', prefixTh: 'นาย', firstNameTh: 'เกรียงไกร', lastNameTh: 'สุวรรณ', prefixEn: 'Mr.', firstNameEn: 'Kriangkrai', lastNameEn: 'Suwan', gender: 'ชาย', age: 39, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00032', prefixTh: 'นางสาว', firstNameTh: 'มัลลิกา', lastNameTh: 'ประสิทธิ์', prefixEn: 'Ms.', firstNameEn: 'Mallika', lastNameEn: 'Prasit', gender: 'หญิง', age: 24, status: 'pending', rights: 'บัตรทอง' },
  { hn: '67-00033', prefixTh: 'นาย', firstNameTh: 'อดิศักดิ์', lastNameTh: 'เจริญผล', prefixEn: 'Mr.', firstNameEn: 'Adisak', lastNameEn: 'Charoenphon', gender: 'ชาย', age: 51, status: 'active', rights: 'ข้าราชการ' },
  { hn: '67-00034', prefixTh: 'นางสาว', firstNameTh: 'ชุติมา', lastNameTh: 'อร่าม', prefixEn: 'Ms.', firstNameEn: 'Chutima', lastNameEn: 'Aram', gender: 'หญิง', age: 30, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00035', prefixTh: 'นาย', firstNameTh: 'ปริญญา', lastNameTh: 'ตั้งใจ', prefixEn: 'Mr.', firstNameEn: 'Parinya', lastNameEn: 'Tangjai', gender: 'ชาย', age: 43, status: 'inactive', rights: 'รัฐวิสาหกิจ' },
  { hn: '67-00036', prefixTh: 'นาง', firstNameTh: 'ภัทรวดี', lastNameTh: 'มีทรัพย์', prefixEn: 'Mrs.', firstNameEn: 'Phattharawadi', lastNameEn: 'Meesap', gender: 'หญิง', age: 40, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00037', prefixTh: 'นาย', firstNameTh: 'สุรศักดิ์', lastNameTh: 'โพธิ์ทอง', prefixEn: 'Mr.', firstNameEn: 'Surasak', lastNameEn: 'Phothong', gender: 'ชาย', age: 58, status: 'active', rights: 'ข้าราชการ' },
  { hn: '67-00038', prefixTh: 'นางสาว', firstNameTh: 'อังคณา', lastNameTh: 'วัฒนา', prefixEn: 'Ms.', firstNameEn: 'Angkana', lastNameEn: 'Wattana', gender: 'หญิง', age: 27, status: 'draft', rights: 'ชำระเงินเอง' },
  { hn: '67-00039', prefixTh: 'นาย', firstNameTh: 'ธนากร', lastNameTh: 'ศิริวัฒน์', prefixEn: 'Mr.', firstNameEn: 'Thanakorn', lastNameEn: 'Siriwat', gender: 'ชาย', age: 32, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00040', prefixTh: 'นาง', firstNameTh: 'เมตตา', lastNameTh: 'บุญช่วย', prefixEn: 'Mrs.', firstNameEn: 'Metta', lastNameEn: 'Boonchuay', gender: 'หญิง', age: 49, status: 'active', rights: 'บัตรทอง' },
  /* ── 67-00041…67-00100 — ขยาย MPI เป็น 100 ราย (13 ส.ค. 2569) ────────
     ส่วนใหญ่ "ไม่เคยให้ความยินยอม" โดยตั้งใจ: consent MOCK_PATIENTS ครอบคลุม
     แค่ 32 HN แรก ที่เหลือจึงเป็นเคสจริงของทะเบียนที่ยังไม่มีความยินยอมเลย */
  { hn: '67-00041', prefixTh: 'นาย', firstNameTh: 'ก้องเกียรติ', lastNameTh: 'ไพศาล', prefixEn: 'Mr.', firstNameEn: 'Kongkiat', lastNameEn: 'Phaisan', gender: 'ชาย', age: 46, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00042', prefixTh: 'นางสาว', firstNameTh: 'ณิชาภัทร', lastNameTh: 'คำแหง', prefixEn: 'Ms.', firstNameEn: 'Nichapat', lastNameEn: 'Khamhaeng', gender: 'หญิง', age: 25, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00043', prefixTh: 'นาย', firstNameTh: 'ภูวดล', lastNameTh: 'เรืองศรี', prefixEn: 'Mr.', firstNameEn: 'Phuwadon', lastNameEn: 'Rueangsri', gender: 'ชาย', age: 37, status: 'active', rights: 'ข้าราชการ' },
  { hn: '67-00044', prefixTh: 'นาง', firstNameTh: 'สร้อยทอง', lastNameTh: 'แก้วประเสริฐ', prefixEn: 'Mrs.', firstNameEn: 'Soithong', lastNameEn: 'Kaewprasert', gender: 'หญิง', age: 53, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00045', prefixTh: 'นาย', firstNameTh: 'ธนวัฒน์', lastNameTh: 'ปานเจริญ', prefixEn: 'Mr.', firstNameEn: 'Thanawat', lastNameEn: 'Pancharoen', gender: 'ชาย', age: 29, status: 'pending', rights: 'ชำระเงินเอง' },
  { hn: '67-00046', prefixTh: 'นางสาว', firstNameTh: 'เบญจวรรณ', lastNameTh: 'อุ่นใจ', prefixEn: 'Ms.', firstNameEn: 'Benjawan', lastNameEn: 'Unjai', gender: 'หญิง', age: 34, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00047', prefixTh: 'นาย', firstNameTh: 'ศราวุธ', lastNameTh: 'กิตติชัย', prefixEn: 'Mr.', firstNameEn: 'Sarawut', lastNameEn: 'Kittichai', gender: 'ชาย', age: 42, status: 'active', rights: 'รัฐวิสาหกิจ' },
  { hn: '67-00048', prefixTh: 'นาง', firstNameTh: 'ทัศนีย์', lastNameTh: 'พรหมมา', prefixEn: 'Mrs.', firstNameEn: 'Tassanee', lastNameEn: 'Phromma', gender: 'หญิง', age: 57, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00049', prefixTh: 'นาย', firstNameTh: 'จตุพร', lastNameTh: 'ขันติธรรม', prefixEn: 'Mr.', firstNameEn: 'Jatuporn', lastNameEn: 'Khantitham', gender: 'ชาย', age: 35, status: 'inactive', rights: 'ประกันสังคม' },
  { hn: '67-00050', prefixTh: 'นางสาว', firstNameTh: 'พรทิพย์', lastNameTh: 'สินสมบัติ', prefixEn: 'Ms.', firstNameEn: 'Porntip', lastNameEn: 'Sinsombat', gender: 'หญิง', age: 22, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00051', prefixTh: 'นาย', firstNameTh: 'วรเชษฐ์', lastNameTh: 'ฤกษ์ดี', prefixEn: 'Mr.', firstNameEn: 'Woracheth', lastNameEn: 'Roekdi', gender: 'ชาย', age: 48, status: 'active', rights: 'ข้าราชการ' },
  { hn: '67-00052', prefixTh: 'นาง', firstNameTh: 'ลักษณา', lastNameTh: 'หอมกลิ่น', prefixEn: 'Mrs.', firstNameEn: 'Laksana', lastNameEn: 'Homklin', gender: 'หญิง', age: 41, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00053', prefixTh: 'นาย', firstNameTh: 'ประสิทธิ์', lastNameTh: 'ยอดแก้ว', prefixEn: 'Mr.', firstNameEn: 'Prasit', lastNameEn: 'Yodkaew', gender: 'ชาย', age: 60, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00054', prefixTh: 'นางสาว', firstNameTh: 'กมลรัตน์', lastNameTh: 'ทวีสุข', prefixEn: 'Ms.', firstNameEn: 'Kamolrat', lastNameEn: 'Thaweesuk', gender: 'หญิง', age: 26, status: 'draft', rights: 'ชำระเงินเอง' },
  { hn: '67-00055', prefixTh: 'นาย', firstNameTh: 'อนุชิต', lastNameTh: 'ภูมิใจ', prefixEn: 'Mr.', firstNameEn: 'Anuchit', lastNameEn: 'Phumjai', gender: 'ชาย', age: 31, status: 'active', rights: 'ประกันชีวิต AIA' },
  { hn: '67-00056', prefixTh: 'นาง', firstNameTh: 'สุนันทา', lastNameTh: 'เกตุแก้ว', prefixEn: 'Mrs.', firstNameEn: 'Sunantha', lastNameEn: 'Ketkaew', gender: 'หญิง', age: 50, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00057', prefixTh: 'นาย', firstNameTh: 'ไพโรจน์', lastNameTh: 'สนธิ', prefixEn: 'Mr.', firstNameEn: 'Pairote', lastNameEn: 'Sonthi', gender: 'ชาย', age: 55, status: 'active', rights: 'ข้าราชการ' },
  { hn: '67-00058', prefixTh: 'นางสาว', firstNameTh: 'ธัญญารัตน์', lastNameTh: 'ชูเกียรติ', prefixEn: 'Ms.', firstNameEn: 'Thanyarat', lastNameEn: 'Chukiat', gender: 'หญิง', age: 28, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00059', prefixTh: 'นาย', firstNameTh: 'กิตติพงษ์', lastNameTh: 'นิลกาญจน์', prefixEn: 'Mr.', firstNameEn: 'Kittipong', lastNameEn: 'Nilkan', gender: 'ชาย', age: 39, status: 'active', rights: 'รัฐวิสาหกิจ' },
  { hn: '67-00060', prefixTh: 'นาง', firstNameTh: 'อัมพร', lastNameTh: 'ดวงจันทร์', prefixEn: 'Mrs.', firstNameEn: 'Amporn', lastNameEn: 'Duangchan', gender: 'หญิง', age: 63, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00061', prefixTh: 'นาย', firstNameTh: 'ชนาธิป', lastNameTh: 'ผลบุญ', prefixEn: 'Mr.', firstNameEn: 'Chanathip', lastNameEn: 'Phonbun', gender: 'ชาย', age: 27, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00062', prefixTh: 'นางสาว', firstNameTh: 'วิภาวี', lastNameTh: 'ทรงศรี', prefixEn: 'Ms.', firstNameEn: 'Wipawee', lastNameEn: 'Songsri', gender: 'หญิง', age: 33, status: 'active', rights: 'ชำระเงินเอง' },
  { hn: '67-00063', prefixTh: 'นาย', firstNameTh: 'สุทธิพงศ์', lastNameTh: 'เลิศวิไล', prefixEn: 'Mr.', firstNameEn: 'Sutthiphong', lastNameEn: 'Loetwilai', gender: 'ชาย', age: 44, status: 'inactive', rights: 'ข้าราชการ' },
  { hn: '67-00064', prefixTh: 'นาง', firstNameTh: 'จินตนา', lastNameTh: 'พิทักษ์', prefixEn: 'Mrs.', firstNameEn: 'Jintana', lastNameEn: 'Phithak', gender: 'หญิง', age: 46, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00065', prefixTh: 'นาย', firstNameTh: 'รังสรรค์', lastNameTh: 'อ่อนหวาน', prefixEn: 'Mr.', firstNameEn: 'Rangsan', lastNameEn: 'Onwan', gender: 'ชาย', age: 52, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00066', prefixTh: 'นางสาว', firstNameTh: 'ปวีณา', lastNameTh: 'สุขสวัสดิ์', prefixEn: 'Ms.', firstNameEn: 'Paweena', lastNameEn: 'Suksawat', gender: 'หญิง', age: 24, status: 'pending', rights: 'บัตรทอง' },
  { hn: '67-00067', prefixTh: 'นาย', firstNameTh: 'เอกพันธ์', lastNameTh: 'ชัยมงคล', prefixEn: 'Mr.', firstNameEn: 'Ekkaphan', lastNameEn: 'Chaimongkhon', gender: 'ชาย', age: 36, status: 'active', rights: 'รัฐวิสาหกิจ' },
  { hn: '67-00068', prefixTh: 'นาง', firstNameTh: 'รัชนี', lastNameTh: 'ปิ่นทอง', prefixEn: 'Mrs.', firstNameEn: 'Ratchanee', lastNameEn: 'Pinthong', gender: 'หญิง', age: 58, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00069', prefixTh: 'นาย', firstNameTh: 'ยุทธนา', lastNameTh: 'เพ็ชรงาม', prefixEn: 'Mr.', firstNameEn: 'Yutthana', lastNameEn: 'Phetngam', gender: 'ชาย', age: 43, status: 'active', rights: 'ข้าราชการ' },
  { hn: '67-00070', prefixTh: 'นางสาว', firstNameTh: 'สิริกร', lastNameTh: 'วรรณศิลป์', prefixEn: 'Ms.', firstNameEn: 'Sirikorn', lastNameEn: 'Wannasin', gender: 'หญิง', age: 30, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00071', prefixTh: 'นาย', firstNameTh: 'ดนัย', lastNameTh: 'ทองสุข', prefixEn: 'Mr.', firstNameEn: 'Danai', lastNameEn: 'Thongsuk', gender: 'ชาย', age: 38, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00072', prefixTh: 'นาง', firstNameTh: 'ประไพ', lastNameTh: 'ศรีอุดม', prefixEn: 'Mrs.', firstNameEn: 'Praphai', lastNameEn: 'Sri-udom', gender: 'หญิง', age: 61, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00073', prefixTh: 'นาย', firstNameTh: 'ภาคภูมิ', lastNameTh: 'จันทโชติ', prefixEn: 'Mr.', firstNameEn: 'Phakphum', lastNameEn: 'Chanthachot', gender: 'ชาย', age: 34, status: 'draft', rights: 'ชำระเงินเอง' },
  { hn: '67-00074', prefixTh: 'นางสาว', firstNameTh: 'อรวรรณ', lastNameTh: 'กล้าหาญ', prefixEn: 'Ms.', firstNameEn: 'Orawan', lastNameEn: 'Klaharn', gender: 'หญิง', age: 27, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00075', prefixTh: 'นาย', firstNameTh: 'สมพงษ์', lastNameTh: 'นาคเงิน', prefixEn: 'Mr.', firstNameEn: 'Somphong', lastNameEn: 'Nakngoen', gender: 'ชาย', age: 49, status: 'active', rights: 'ข้าราชการ' },
  { hn: '67-00076', prefixTh: 'นาง', firstNameTh: 'กัลยา', lastNameTh: 'บวรรัตน์', prefixEn: 'Mrs.', firstNameEn: 'Kanlaya', lastNameEn: 'Bowonrat', gender: 'หญิง', age: 45, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00077', prefixTh: 'นาย', firstNameTh: 'ธเนศ', lastNameTh: 'อัครเดช', prefixEn: 'Mr.', firstNameEn: 'Thanet', lastNameEn: 'Akkharadet', gender: 'ชาย', age: 32, status: 'active', rights: 'ประกันชีวิต AIA' },
  { hn: '67-00078', prefixTh: 'นางสาว', firstNameTh: 'ชลธิชา', lastNameTh: 'พูนผล', prefixEn: 'Ms.', firstNameEn: 'Chonthicha', lastNameEn: 'Phunphon', gender: 'หญิง', age: 23, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00079', prefixTh: 'นาย', firstNameTh: 'วีรยุทธ', lastNameTh: 'สมานมิตร', prefixEn: 'Mr.', firstNameEn: 'Weerayut', lastNameEn: 'Samanmit', gender: 'ชาย', age: 40, status: 'inactive', rights: 'รัฐวิสาหกิจ' },
  { hn: '67-00080', prefixTh: 'นาง', firstNameTh: 'เพ็ญศรี', lastNameTh: 'ครองธรรม', prefixEn: 'Mrs.', firstNameEn: 'Pensri', lastNameEn: 'Khrongtham', gender: 'หญิง', age: 54, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00081', prefixTh: 'นาย', firstNameTh: 'ชูศักดิ์', lastNameTh: 'แสนสุข', prefixEn: 'Mr.', firstNameEn: 'Chusak', lastNameEn: 'Saensuk', gender: 'ชาย', age: 47, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00082', prefixTh: 'นางสาว', firstNameTh: 'ณัฐริกา', lastNameTh: 'โชคชัย', prefixEn: 'Ms.', firstNameEn: 'Nattarika', lastNameEn: 'Chokchai', gender: 'หญิง', age: 29, status: 'active', rights: 'ชำระเงินเอง' },
  { hn: '67-00083', prefixTh: 'นาย', firstNameTh: 'ปรีชา', lastNameTh: 'ทับทิม', prefixEn: 'Mr.', firstNameEn: 'Preecha', lastNameEn: 'Thapthim', gender: 'ชาย', age: 56, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00084', prefixTh: 'นาง', firstNameTh: 'มณีรัตน์', lastNameTh: 'เอี่ยมสอาด', prefixEn: 'Mrs.', firstNameEn: 'Maneerat', lastNameEn: 'Iamsa-ard', gender: 'หญิง', age: 42, status: 'active', rights: 'ข้าราชการ' },
  { hn: '67-00085', prefixTh: 'นาย', firstNameTh: 'กฤษณะ', lastNameTh: 'บำรุงเกียรติ', prefixEn: 'Mr.', firstNameEn: 'Kritsana', lastNameEn: 'Bamrungkiat', gender: 'ชาย', age: 35, status: 'pending', rights: 'ประกันสังคม' },
  { hn: '67-00086', prefixTh: 'นางสาว', firstNameTh: 'สุพัตรา', lastNameTh: 'ไชยวงศ์', prefixEn: 'Ms.', firstNameEn: 'Supatra', lastNameEn: 'Chaiwong', gender: 'หญิง', age: 31, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00087', prefixTh: 'นาย', firstNameTh: 'โกวิท', lastNameTh: 'ธรรมรักษ์', prefixEn: 'Mr.', firstNameEn: 'Kowit', lastNameEn: 'Thammarak', gender: 'ชาย', age: 59, status: 'active', rights: 'ข้าราชการ' },
  { hn: '67-00088', prefixTh: 'นาง', firstNameTh: 'ยุพิน', lastNameTh: 'แสงเดือน', prefixEn: 'Mrs.', firstNameEn: 'Yupin', lastNameEn: 'Saengduean', gender: 'หญิง', age: 48, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00089', prefixTh: 'นาย', firstNameTh: 'ทวีศักดิ์', lastNameTh: 'ปัญญาดี', prefixEn: 'Mr.', firstNameEn: 'Thaweesak', lastNameEn: 'Panyadee', gender: 'ชาย', age: 37, status: 'active', rights: 'รัฐวิสาหกิจ' },
  { hn: '67-00090', prefixTh: 'นางสาว', firstNameTh: 'จุฑามาศ', lastNameTh: 'ลีลาวดี', prefixEn: 'Ms.', firstNameEn: 'Juthamas', lastNameEn: 'Leelawadee', gender: 'หญิง', age: 25, status: 'draft', rights: 'ชำระเงินเอง' },
  { hn: '67-00091', prefixTh: 'นาย', firstNameTh: 'นครินทร์', lastNameTh: 'เสาวภาคย์', prefixEn: 'Mr.', firstNameEn: 'Nakharin', lastNameEn: 'Saowaphak', gender: 'ชาย', age: 41, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00092', prefixTh: 'นาง', firstNameTh: 'สมคิด', lastNameTh: 'อุดมทรัพย์', prefixEn: 'Mrs.', firstNameEn: 'Somkid', lastNameEn: 'Udomsap', gender: 'หญิง', age: 64, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00093', prefixTh: 'นาย', firstNameTh: 'พิษณุ', lastNameTh: 'กมลเทพ', prefixEn: 'Mr.', firstNameEn: 'Phitsanu', lastNameEn: 'Kamonthep', gender: 'ชาย', age: 33, status: 'active', rights: 'ประกันสังคม' },
  { hn: '67-00094', prefixTh: 'นางสาว', firstNameTh: 'ณัฏฐณิชา', lastNameTh: 'รักไทย', prefixEn: 'Ms.', firstNameEn: 'Natthanicha', lastNameEn: 'Rakthai', gender: 'หญิง', age: 26, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00095', prefixTh: 'นาย', firstNameTh: 'สราวุฒิ', lastNameTh: 'ภักดีชน', prefixEn: 'Mr.', firstNameEn: 'Sarawuth', lastNameEn: 'Phakdichon', gender: 'ชาย', age: 45, status: 'active', rights: 'ข้าราชการ' },
  { hn: '67-00096', prefixTh: 'นาง', firstNameTh: 'วันเพ็ญ', lastNameTh: 'สุขเกษม', prefixEn: 'Mrs.', firstNameEn: 'Wanpen', lastNameEn: 'Sukkasem', gender: 'หญิง', age: 51, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00097', prefixTh: 'นาย', firstNameTh: 'อธิป', lastNameTh: 'วรรณกิจ', prefixEn: 'Mr.', firstNameEn: 'Athip', lastNameEn: 'Wannakit', gender: 'ชาย', age: 28, status: 'active', rights: 'ประกันชีวิต AIA' },
  { hn: '67-00098', prefixTh: 'นางสาว', firstNameTh: 'รัตติกาล', lastNameTh: 'พงษ์ไพบูลย์', prefixEn: 'Ms.', firstNameEn: 'Rattikan', lastNameEn: 'Phongphaiboon', gender: 'หญิง', age: 34, status: 'inactive', rights: 'ประกันสังคม' },
  { hn: '67-00099', prefixTh: 'นาย', firstNameTh: 'บรรจง', lastNameTh: 'เขียวสด', prefixEn: 'Mr.', firstNameEn: 'Banchong', lastNameEn: 'Khiaosot', gender: 'ชาย', age: 57, status: 'active', rights: 'บัตรทอง' },
  { hn: '67-00100', prefixTh: 'นาง', firstNameTh: 'ศศิธร', lastNameTh: 'มงคลชัย', prefixEn: 'Mrs.', firstNameEn: 'Sasithorn', lastNameEn: 'Mongkolchai', gender: 'หญิง', age: 39, status: 'active', rights: 'ข้าราชการ' },
];

const FILLER_ADDRESS = {
  zip: '10400', province: 'กรุงเทพมหานคร', district: 'ดินแดง',
  subdistrict: 'ดินแดง', road: 'รัชดาภิเษก', moo: '', houseNo: '100/1',
};

MR_FILLER_SEEDS.forEach((seed, i) => {
  const female = seed.gender === 'หญิง';
  MR_PATIENTS.push({
    ...seed,
    genderIdentity: seed.gender,
    nationalId: `1-1${String(100 + i).slice(-3)}-${String(20000 + i * 17).slice(-5)}-${String(10 + (i % 89)).padStart(2, '0')}-${i % 10}`,
    dob: `${(i % 28) + 1} มกราคม ${2500 + (seed.age ? 69 - seed.age : 30)}`,
    phone: `08${1 + (i % 9)}-${String(100 + i * 3).padStart(3, '0')}-${String(1000 + i * 41).slice(-4)}`,
    altPhone: '',
    email: `${seed.firstNameEn.toLowerCase()}.${seed.lastNameEn.toLowerCase()}@email.com`,
    registeredOn: seed.status === 'pending' || seed.status === 'draft' ? '—' : `${(i % 27) + 1} มีนาคม 256${6 + (i % 3)}`,
    bloodType: ['O', 'A', 'B', 'AB'][i % 4],
    education: female ? 'ปริญญาตรี' : 'มัธยมศึกษา',
    occupation: female ? 'พนักงานบริษัท' : 'รับจ้าง',
    marital: i % 3 === 0 ? 'สมรส' : 'โสด',
    spouseName: '',
    address: { ...FILLER_ADDRESS, houseNo: `${10 + i}/${1 + (i % 9)}` },
    emergency: [{ name: female ? 'สมชาย' : 'สมหญิง', last: seed.lastNameTh, relation: female ? 'บิดา' : 'มารดา', phone: `081-${String(200 + i).slice(-3)}-${String(3000 + i).slice(-4)}` }],
    insurance: [{ type: seed.rights, claimCode: seed.status === 'pending' ? '—' : `MPI-${seed.hn}`, verified: seed.status === 'active' }],
    mobility: 'เดิน',
    flags: { vip: i % 11 === 0, allergyDrug: false, allergyOther: false, chronic: i % 7 === 0 },
    drugAllergies: [],
    chronicDiseases: [],
  });
});

/* Portrait per MPI row. PATIENT_AVATAR_POOL มี 41 headshot แต่ทะเบียนมี 100 ราย
   จึงวนซ้ำ — เลือก modulo แทนการสุ่ม เพื่อให้ 41 แถวติดกันไม่มีหน้าซ้ำ (หน้า
   ตารางละ 20 แถวจึงไม่มีวันเห็นหน้าซ้ำภายในหน้าเดียว) เตือนเฉพาะตอนพูลว่าง
   หรือเล็กกว่าหนึ่งหน้าเท่านั้น — จำนวนไม่เท่ากันเป็นเรื่องปกติแล้ว */
if (PATIENT_AVATAR_POOL.length < 20) {
  console.warn(
    `[mrPatients] avatar pool has only ${PATIENT_AVATAR_POOL.length} portraits — faces will repeat inside one table page`,
  );
}
MR_PATIENTS.forEach((p, i) => {
  p.avatarUrl = PATIENT_AVATAR_POOL[i % PATIENT_AVATAR_POOL.length];
});

/* Special-watch flags (ToR §1.9.4.7 — เฝ้าระวังพิเศษ: ตั้งครรภ์ / ให้นมบุตร /
   G6PD, on top of the existing drugAllergies list). Applied as a
   post-process merge rather than editing every literal above, since none
   of the existing mock patients needed these fields before pharmacy's
   dispense-safety checks. G6PD is X-linked and more often clinically
   significant in males, so the one demo flag goes on a male patient
   rather than forcing an implausible pregnancy flag onto this roster's
   older female patients. */
const SPECIAL_WATCH_OVERRIDES = {
  '67-00003': { g6pd: true },
  /* มติ คทง.7 — ต้องมีเคสหญิงตั้งครรภ์จริงในชุดข้อมูล ไม่งั้นกติกา "บล็อก
     ยา Pregnancy Category X" ไม่มีวันทำงานให้เห็นเลย */
  '67-00027': { pregnant: true },
};

/* มติ คทง.7 — ผลคัดกรองเภสัชพันธุศาสตร์ (HLA-B) ต่อผู้รับบริการ
   ใช้เป็นแหล่งของกติกา "ห้ามสั่ง Allopurinol / Carbamazepine เมื่อผลบวก"
   ผู้ที่ไม่มีในตารางนี้ = ยังไม่เคยตรวจ → ระบบเตือนให้ส่งตรวจก่อนเริ่มยา */
const GENETIC_SCREENING_OVERRIDES = {
  '67-00001': [{ gene: 'HLA-B*58:01', result: 'Positive', testedAt: '12 มี.ค. 2569', lab: 'ห้องปฏิบัติการกลาง สำนักอนามัย' }],
  '67-00010': [{ gene: 'HLA-B*15:02', result: 'Negative', testedAt: '5 ก.พ. 2569', lab: 'ห้องปฏิบัติการกลาง สำนักอนามัย' }],
};

/* TOR §1.1.1.3 — passport search axis. Applied as a post-process merge
   (same pattern as SPECIAL_WATCH_OVERRIDES) so existing literals stay
   untouched. Thai nationals may carry a Thai passport; 67-00008 doubles
   as the foreign-document demo (HN group 2) on the registration form. */
const PASSPORT_OVERRIDES = {
  '67-00001': 'AA1204577',
  '67-00007': 'AB0871542',
  '67-00008': 'MJ0455812',
  '67-00027': 'AC5518290',
};

/* TOR §1.1.1.2 — สถานะการมีชีวิต (alive | deceased + วันที่เสียชีวิต).
   One deceased demo record so the directory badge / filter / disabled
   queue actions are visible without hand-editing state. */
const LIFE_STATUS_OVERRIDES = {
  '67-00009': { lifeStatus: 'deceased', deceasedDate: '18 มิถุนายน 2569' },
};

MR_PATIENTS.forEach((p) => {
  p.specialWatch = { pregnant: false, breastfeeding: false, g6pd: false, ...SPECIAL_WATCH_OVERRIDES[p.hn] };
  p.geneticScreenings = p.geneticScreenings ?? GENETIC_SCREENING_OVERRIDES[p.hn] ?? [];
  p.pregnant = p.specialWatch.pregnant;
  p.passportNo = p.passportNo ?? PASSPORT_OVERRIDES[p.hn] ?? '';
  const life = LIFE_STATUS_OVERRIDES[p.hn];
  p.lifeStatus = p.lifeStatus ?? life?.lifeStatus ?? 'alive';
  p.deceasedDate = p.deceasedDate ?? life?.deceasedDate ?? '';
  /* Stable ids for the editable allergy list (ToR §1.9.2.2 / §1.9.5 —
     "สามารถแสดง/บันทึก/ยกเลิก/แก้ไขข้อมูลเกี่ยวกับการแพ้ได้") — the source
     literals above don't carry one since nothing needed to target a single
     entry before pharmacy's editor. */
  p.drugAllergies = p.drugAllergies.map((a, i) => ({ id: a.id || `da-${p.hn}-${i}`, ...a }));
});

export const findMrPatientByHn = (hn) =>
  MR_PATIENTS.find((p) => p.hn === hn) || null;

/* Editable drug-allergy list mutators — module-level in-place mutation,
   same convention as `pharmacyQueue.js`'s mutators (no backend, resets on
   reload). Used by the pharmacy dispense page so a pharmacist can record
   an allergy discovered/confirmed at the counter. */
let allergySeq = 0;
export const addDrugAllergy = (hn, { name, symptom = '', severity = 'medium' }) => {
  const p = findMrPatientByHn(hn);
  if (!p || !name?.trim()) return null;
  const entry = { id: `da-new-${++allergySeq}`, name: name.trim(), symptom, severity };
  p.drugAllergies = [...p.drugAllergies, entry];
  p.flags = { ...p.flags, allergyDrug: true };
  return entry;
};

export const removeDrugAllergy = (hn, entryId) => {
  const p = findMrPatientByHn(hn);
  if (!p) return;
  p.drugAllergies = p.drugAllergies.filter((a) => a.id !== entryId);
  if (p.drugAllergies.length === 0) p.flags = { ...p.flags, allergyDrug: false };
};

/* §1.9.5.7 — "แสดง/บันทึก/ยกเลิก/แก้ไขข้อมูลเกี่ยวกับการแพ้ได้": edit an
   existing allergy entry's symptom/severity in place, alongside add/remove
   above (the drug/allergy-class name itself is left immutable — changing
   WHAT the patient is allergic to should be a remove+add, not a silent
   in-place rename). */
export const updateDrugAllergy = (hn, entryId, { symptom, severity }) => {
  const p = findMrPatientByHn(hn);
  if (!p) return null;
  let updated = null;
  p.drugAllergies = p.drugAllergies.map((a) => {
    if (a.id !== entryId) return a;
    updated = { ...a, symptom, severity };
    return updated;
  });
  return updated;
};

export const DEFAULT_MR_PATIENT = MR_PATIENTS[0];
