/* Medical Records (MR) patient roster — Thai names with realistic IDs,
   phone numbers, and treatment-rights labels. Source of truth for both
   the MR queue table and the MR registration form (data flows via
   <Link state={...}> when the user clicks a row). */

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
      { name: 'โรคลมชัก',      symptom: 'ชักเกร็งกระตุก, หมดสติชั่วคราว',                                            severity: 'medium'   },
    ],
    chronicDiseases: [
      { name: 'หัวใจล้มเหลว',                severity: 'critical' },
      { name: 'โรคไตเรื้อรัง ระยะ 3–4 (CKD)', severity: 'high'     },
      { name: 'ความดันโลหิตสูง (HT)',         severity: 'medium'   },
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
    mobility: 'เดิน', flags: { vip: false, allergyDrug: false, allergyOther: false, chronic: false },
    drugAllergies: [],
    chronicDiseases: [],
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
    mobility: 'เดิน', flags: { vip: false, allergyDrug: false, allergyOther: false, chronic: true },
    drugAllergies: [],
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
    mobility: 'เดิน', flags: { vip: false, allergyDrug: false, allergyOther: false, chronic: false },
    drugAllergies: [],
    chronicDiseases: [],
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
    mobility: 'เดิน', flags: { vip: false, allergyDrug: false, allergyOther: false, chronic: false },
    drugAllergies: [],
    chronicDiseases: [],
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
    mobility: 'นั่งรถเข็น', flags: { vip: true, allergyDrug: false, allergyOther: false, chronic: true },
    drugAllergies: [],
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
    mobility: 'เดิน', flags: { vip: false, allergyDrug: false, allergyOther: false, chronic: false },
    drugAllergies: [],
    chronicDiseases: [],
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
};
MR_PATIENTS.forEach((p) => {
  p.specialWatch = { pregnant: false, breastfeeding: false, g6pd: false, ...SPECIAL_WATCH_OVERRIDES[p.hn] };
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
