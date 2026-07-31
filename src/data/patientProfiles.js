import { MR_PATIENTS } from '@/data/mrPatients';

/* Shared mock patient profiles — single source of truth used by both
   QueuePage (to seed table rows) and ScreeningPage (to render the
   PatientCard for the selected patient). Keyed by `shortName` so the
   queue table can reference patients by their display name.

   25 unique profiles — names + HN + doctors all unique so the OPD queue
   never duplicates a patient. Doctor pool of ~10 spread across the list
   for diversity.

   Avatars are AI-generated Thai studio portraits under `public/avatars/`
   (Thai/Asian, front-facing, solid light sky-blue background — same
   style as `somchai-mock.png`). `patient-mock-01` … `patient-mock-10`
   extend that set; older `patient-female-*` / `patient-male-*` /
   `mock-male-asian-{a,b,c}.png` — male variety (somchai sky-blue style). Portraits may be reused
   across patients when sex + age band match. */

/** Somchai-style portraits — sky-blue studio headshots (see `somchai-mock.png`). */
export const PATIENT_MOCK_AVATARS = [
  '/avatars/patient-mock-01.png',
  '/avatars/patient-mock-02.png',
  '/avatars/patient-mock-03.png',
  '/avatars/patient-mock-04.png',
  '/avatars/patient-mock-05.png',
  '/avatars/patient-mock-06.png',
  '/avatars/patient-mock-07.png',
  '/avatars/patient-mock-08.png',
  '/avatars/patient-mock-09.png',
  '/avatars/patient-mock-10.png',
];

export const PATIENT_PROFILES = [
  {
    shortName:  'สมชาย มีสุข',
    fullName:   'นายสมชาย มีสุข',
    englishName:'Somchai Misuk',
    hn:         '67-00001', vn: '69-00001',
    sex:        'ชาย',
    age:        '42 ปี - 3 เดือน - 8 วัน',
    nationalId: '1369900526072',
    bloodType:  'O',
    patientType:'ผู้ป่วยเก่า',
    doctor:     'พญ.สมหญิง รักษ์ดี',
    insurance:  'สิทธิประกันสังคม รพ.พระนั่งเกล้า (10686)',
    address:    '124/64 พงษ์เวชอนุสรณ์ 2 สุขุมวิท บางจาก พระโขนง กรุงเทพมหานคร 10260',
    avatarUrl: '/avatars/somchai-mock.png',
    vip:        false,
  },
  {
    shortName:  'ดวงใจ พินิจ',
    fullName:   'นางสาวดวงใจ พินิจ',
    englishName:'Duangjai Pinit',
    hn:         '67-00002', vn: '69-00002',
    sex:        'หญิง',
    age:        '29 ปี - 5 เดือน - 22 วัน',
    nationalId: '3401200458931',
    bloodType:  'A',
    patientType:'ผู้ป่วยเก่า',
    doctor:     'นพ.สมชาย ใจดี',
    insurance:  'สิทธิหลักประกันสุขภาพถ้วนหน้า (บัตรทอง)',
    address:    '88/12 ซ.พหลโยธิน 32 จตุจักร กรุงเทพมหานคร 10900',
    avatarUrl:  '/avatars/patient-female-a.png',
    vip:        false,
  },
  {
    shortName:  'ปริญญา รัตนา',
    fullName:   'นางปริญญา รัตนา',
    englishName:'Parinya Rattana',
    hn:         '67-00003', vn: '69-00003',
    sex:        'หญิง',
    age:        '54 ปี - 1 เดือน - 14 วัน',
    nationalId: '5670012380043',
    bloodType:  'B',
    patientType:'ผู้ป่วยเก่า',
    doctor:     'พญ.วิภา สุขศรี',
    insurance:  'สิทธิข้าราชการ กรมบัญชีกลาง',
    address:    '256 หมู่ 7 ต.บางใหญ่ อ.บางใหญ่ จ.นนทบุรี 11140',
    avatarUrl:  '/avatars/patient-female-e.png',
    vip:        true,
  },
  {
    shortName:  'ภูริ ใจกล้า',
    fullName:   'นายภูริ ใจกล้า',
    englishName:'Phuri Jaikla',
    hn:         '67-00004', vn: '69-00004',
    sex:        'ชาย',
    age:        '21 ปี - 8 เดือน - 3 วัน',
    nationalId: '1100401273359',
    bloodType:  'AB',
    patientType:'ผู้ป่วยใหม่',
    doctor:     'นพ.ณัฐวุฒิ บุญมี',
    insurance:  'ชำระเอง',
    address:    '15/9 ซ.ลาดพร้าว 71 วังทองหลาง กรุงเทพมหานคร 10310',
    avatarUrl:  '/avatars/mock-male-asian-b.png',
    vip:        false,
  },
  {
    shortName:  'สุดา ปลอดโปร่ง',
    fullName:   'นางสุดา ปลอดโปร่ง',
    englishName:'Suda Plodprong',
    hn:         '67-00005', vn: '69-00005',
    sex:        'หญิง',
    age:        '67 ปี - 0 เดือน - 26 วัน',
    nationalId: '3550900192864',
    bloodType:  'O',
    patientType:'ผู้ป่วยเก่า',
    doctor:     'พญ.สมหญิง รักษ์ดี',
    insurance:  'สิทธิหลักประกันสุขภาพถ้วนหน้า (บัตรทอง)',
    address:    '47/3 ซ.พระราม 2 ซอย 25 บางขุนเทียน กรุงเทพมหานคร 10150',
    avatarUrl:  '/avatars/patient-female-c.png',
    vip:        false,
  },
  {
    shortName:  'ศุภชัย แก้วใส',
    fullName:   'นายศุภชัย แก้วใส',
    englishName:'Suphachai Kaewsai',
    hn:         '67-00006', vn: '69-00006',
    sex:        'ชาย',
    age:        '38 ปี - 11 เดือน - 5 วัน',
    nationalId: '1809900647521',
    bloodType:  'A',
    patientType:'ผู้ป่วยเก่า',
    doctor:     'นพ.สมชาย ใจดี',
    insurance:  'สิทธิประกันสังคม รพ.กรุงเทพคริสเตียน',
    address:    '19/77 ซ.รามอินทรา 23 บางเขน กรุงเทพมหานคร 10220',
    avatarUrl:  '/avatars/mock-male-asian-c.png',
    vip:        false,
  },
  /* ── Rows 7-25 — added so the OPD queue (25 rows) has zero name
     duplicates. Doctor pool rotates across 10 names for variety;
     each row points to one of the local AI-generated Thai portraits
     in `public/avatars/` (see file header), picked to roughly match
     the patient's sex + age band. */
  {
    shortName: 'มาลี อ่อนน้อม', fullName: 'นางมาลี อ่อนน้อม', englishName: 'Malee On-nom',
    hn: '67-00007', vn: '69-00007', sex: 'หญิง', age: '45 ปี - 2 เดือน - 11 วัน',
    nationalId: '3100501239876', bloodType: 'O', patientType: 'ผู้ป่วยเก่า',
    doctor: 'พญ.ปริยากร เจริญสุข', insurance: 'สิทธิประกันสังคม รพ.มงกุฎวัฒนะ',
    address: '67/13 ซ.รัชดาภิเษก 18 ห้วยขวาง กรุงเทพมหานคร 10310',
    avatarUrl: PATIENT_MOCK_AVATARS[2], vip: false,
  },
  {
    shortName: 'ธนพร สุนทรา', fullName: 'นางสาวธนพร สุนทรา', englishName: 'Thanaporn Suntara',
    hn: '67-00008', vn: '69-00008', sex: 'หญิง', age: '31 ปี - 7 เดือน - 19 วัน',
    nationalId: '1101400785632', bloodType: 'A', patientType: 'ผู้ป่วยเก่า',
    doctor: 'นพ.ธนากร อินทรา', insurance: 'สิทธิหลักประกันสุขภาพถ้วนหน้า (บัตรทอง)',
    address: '199 ซ.อ่อนนุช 17 สวนหลวง กรุงเทพมหานคร 10250',
    avatarUrl: PATIENT_MOCK_AVATARS[8], vip: false,
  },
  {
    shortName: 'กิตติ ศรีสมบูรณ์', fullName: 'นายกิตติ ศรีสมบูรณ์', englishName: 'Kitti Srisomboon',
    hn: '67-00009', vn: '69-00009', sex: 'ชาย', age: '52 ปี - 6 เดือน - 2 วัน',
    nationalId: '3550900462158', bloodType: 'B', patientType: 'ผู้ป่วยเก่า',
    doctor: 'พญ.ศิรินทร์ พัฒนกุล', insurance: 'สิทธิข้าราชการ กรมบัญชีกลาง',
    address: '88/3 ซ.สุขุมวิท 71 พระโขนง กรุงเทพมหานคร 10110',
    avatarUrl: PATIENT_MOCK_AVATARS[5], vip: true,
  },
  {
    shortName: 'นพดล ช่วยเหลือ', fullName: 'นายนพดล ช่วยเหลือ', englishName: 'Nopadol Chuayluea',
    hn: '67-00010', vn: '69-00010', sex: 'ชาย', age: '35 ปี - 0 เดือน - 28 วัน',
    nationalId: '1100600384912', bloodType: 'O', patientType: 'ผู้ป่วยใหม่',
    doctor: 'นพ.อภิชาติ พรหมสาร', insurance: 'ชำระเอง',
    address: '12/45 ซ.จรัญสนิทวงศ์ 13 บางพลัด กรุงเทพมหานคร 10700',
    avatarUrl: PATIENT_MOCK_AVATARS[7], vip: false,
  },
  {
    shortName: 'อรอุมา ดวงสว่าง', fullName: 'นางอรอุมา ดวงสว่าง', englishName: 'Onuma Duangsawang',
    hn: '67-00011', vn: '69-00011', sex: 'หญิง', age: '48 ปี - 4 เดือน - 16 วัน',
    nationalId: '3401200583926', bloodType: 'AB', patientType: 'ผู้ป่วยเก่า',
    doctor: 'พญ.พรพิมล สุขสำราญ', insurance: 'สิทธิประกันสังคม รพ.เปาโล พหลโยธิน',
    address: '54/9 ซ.วิภาวดี 22 จตุจักร กรุงเทพมหานคร 10900',
    avatarUrl: PATIENT_MOCK_AVATARS[4], vip: false,
  },
  {
    shortName: 'วิชัย รุ่งเรือง', fullName: 'นายวิชัย รุ่งเรือง', englishName: 'Wichai Rungruang',
    hn: '67-00012', vn: '69-00012', sex: 'ชาย', age: '60 ปี - 9 เดือน - 4 วัน',
    nationalId: '5670012584731', bloodType: 'A', patientType: 'ผู้ป่วยเก่า',
    doctor: 'นพ.ปวิณ ราชาธิราช', insurance: 'สิทธิหลักประกันสุขภาพถ้วนหน้า (บัตรทอง)',
    address: '321 ซ.ลาดพร้าว 101 บางกะปิ กรุงเทพมหานคร 10240',
    avatarUrl: PATIENT_MOCK_AVATARS[5], vip: false,
  },
  {
    shortName: 'พิมพ์ใจ จันทรา', fullName: 'นางสาวพิมพ์ใจ จันทรา', englishName: 'Pimjai Janthra',
    hn: '67-00013', vn: '69-00013', sex: 'หญิง', age: '26 ปี - 11 เดือน - 7 วัน',
    nationalId: '1809900739581', bloodType: 'O', patientType: 'ผู้ป่วยใหม่',
    doctor: 'พญ.ปริยากร เจริญสุข', insurance: 'สิทธิประกันสังคม รพ.เปาโลโชคชัย 4',
    address: '11/4 ซ.รัชดาภิเษก 7 ดินแดง กรุงเทพมหานคร 10400',
    avatarUrl: PATIENT_MOCK_AVATARS[1], vip: false,
  },
  {
    shortName: 'ชัยวัฒน์ ก้องเกียรติ', fullName: 'นายชัยวัฒน์ ก้องเกียรติ', englishName: 'Chaiwat Kongkiat',
    hn: '67-00014', vn: '69-00014', sex: 'ชาย', age: '47 ปี - 1 เดือน - 25 วัน',
    nationalId: '3100401872569', bloodType: 'B', patientType: 'ผู้ป่วยเก่า',
    doctor: 'พญ.สมหญิง รักษ์ดี', insurance: 'สิทธิประกันสังคม รพ.พระมงกุฎเกล้า',
    address: '99/12 ซ.พระราม 9 ซอย 32 ห้วยขวาง กรุงเทพมหานคร 10310',
    avatarUrl: PATIENT_MOCK_AVATARS[3], vip: false,
  },
  {
    shortName: 'รัตนาภรณ์ ใสสะอาด', fullName: 'นางรัตนาภรณ์ ใสสะอาด', englishName: 'Rattanaporn Saisaard',
    hn: '67-00015', vn: '69-00015', sex: 'หญิง', age: '39 ปี - 8 เดือน - 13 วัน',
    nationalId: '3550900237845', bloodType: 'A', patientType: 'ผู้ป่วยเก่า',
    doctor: 'นพ.ณัฐวุฒิ บุญมี', insurance: 'สิทธิข้าราชการ กรมบัญชีกลาง',
    address: '7/26 ซ.บางขุนเทียน 15 บางขุนเทียน กรุงเทพมหานคร 10150',
    avatarUrl: PATIENT_MOCK_AVATARS[8], vip: false,
  },
  {
    shortName: 'ปกรณ์ บุญพิทักษ์', fullName: 'นายปกรณ์ บุญพิทักษ์', englishName: 'Pakorn Boonpitak',
    hn: '67-00016', vn: '69-00016', sex: 'ชาย', age: '24 ปี - 3 เดือน - 9 วัน',
    nationalId: '1100401473652', bloodType: 'O', patientType: 'ผู้ป่วยใหม่',
    doctor: 'นพ.ธนากร อินทรา', insurance: 'สิทธิประกันสังคม รพ.เกษมราษฎร์',
    address: '83 ซ.พหลโยธิน 60 สายไหม กรุงเทพมหานคร 10220',
    avatarUrl: PATIENT_MOCK_AVATARS[0], vip: false,
  },
  {
    shortName: 'ภัคจิรา วงศ์อนันต์', fullName: 'นางภัคจิรา วงศ์อนันต์', englishName: 'Phakchira Wonganan',
    hn: '67-00017', vn: '69-00017', sex: 'หญิง', age: '41 ปี - 5 เดือน - 30 วัน',
    nationalId: '3401200674923', bloodType: 'AB', patientType: 'ผู้ป่วยเก่า',
    doctor: 'พญ.วิภา สุขศรี', insurance: 'สิทธิประกันสังคม รพ.จุฬาลงกรณ์',
    address: '142/7 ซ.รามอินทรา 65 มีนบุรี กรุงเทพมหานคร 10510',
    avatarUrl: '/avatars/patient-female-b.png', vip: true,
  },
  {
    shortName: 'ธีรเดช อัครพงศ์', fullName: 'นายธีรเดช อัครพงศ์', englishName: 'Theerdej Akarapong',
    hn: '67-00018', vn: '69-00018', sex: 'ชาย', age: '55 ปี - 10 เดือน - 6 วัน',
    nationalId: '5670012467128', bloodType: 'A', patientType: 'ผู้ป่วยเก่า',
    doctor: 'พญ.ศิรินทร์ พัฒนกุล', insurance: 'ชำระเอง',
    address: '67 ซ.พระราม 4 ซอย 36 คลองเตย กรุงเทพมหานคร 10110',
    avatarUrl: '/avatars/patient-male-e.png', vip: false,
  },
  {
    shortName: 'นันทิดา พรเลิศ', fullName: 'นางสาวนันทิดา พรเลิศ', englishName: 'Nantida Pornlert',
    hn: '67-00019', vn: '69-00019', sex: 'หญิง', age: '28 ปี - 2 เดือน - 21 วัน',
    nationalId: '1809900472316', bloodType: 'B', patientType: 'ผู้ป่วยใหม่',
    doctor: 'นพ.อภิชาติ พรหมสาร', insurance: 'สิทธิหลักประกันสุขภาพถ้วนหน้า (บัตรทอง)',
    address: '215/3 ซ.สาทร 11 สาทร กรุงเทพมหานคร 10120',
    avatarUrl: '/avatars/patient-female-a.png', vip: false,
  },
  {
    shortName: 'กฤษดา ผ่องใส', fullName: 'นายกฤษดา ผ่องใส', englishName: 'Krisada Pongsai',
    hn: '67-00020', vn: '69-00020', sex: 'ชาย', age: '33 ปี - 6 เดือน - 14 วัน',
    nationalId: '1100600296481', bloodType: 'O', patientType: 'ผู้ป่วยเก่า',
    doctor: 'พญ.พรพิมล สุขสำราญ', insurance: 'สิทธิประกันสังคม รพ.พระนั่งเกล้า (10686)',
    address: '155 ซ.สุขุมวิท 39 วัฒนา กรุงเทพมหานคร 10110',
    avatarUrl: '/avatars/mock-male-asian-c.png', vip: false,
  },
  {
    shortName: 'วรรณภา ทองดี', fullName: 'นางวรรณภา ทองดี', englishName: 'Wannapha Thongdee',
    hn: '67-00021', vn: '69-00021', sex: 'หญิง', age: '50 ปี - 11 เดือน - 1 วัน',
    nationalId: '3100501736485', bloodType: 'A', patientType: 'ผู้ป่วยเก่า',
    doctor: 'นพ.ปวิณ ราชาธิราช', insurance: 'สิทธิข้าราชการ กรมบัญชีกลาง',
    address: '36/22 ซ.นนทรี 4 ยานนาวา กรุงเทพมหานคร 10120',
    avatarUrl: '/avatars/patient-female-e.png', vip: false,
  },
  {
    shortName: 'อนุชา สมบูรณ์ทรัพย์', fullName: 'นายอนุชา สมบูรณ์ทรัพย์', englishName: 'Anucha Somboonsap',
    hn: '67-00022', vn: '69-00022', sex: 'ชาย', age: '44 ปี - 0 เดือน - 17 วัน',
    nationalId: '5670012849137', bloodType: 'AB', patientType: 'ผู้ป่วยเก่า',
    doctor: 'นพ.สมชาย ใจดี', insurance: 'สิทธิประกันสังคม รพ.พระมงกุฎเกล้า',
    address: '4/19 ซ.รัชดาภิเษก 26 ห้วยขวาง กรุงเทพมหานคร 10310',
    avatarUrl: '/avatars/mock-male-asian-a.png', vip: false,
  },
  {
    shortName: 'ภัทรานิษฐ์ บูรณะ', fullName: 'นางสาวภัทรานิษฐ์ บูรณะ', englishName: 'Patranit Burana',
    hn: '67-00023', vn: '69-00023', sex: 'หญิง', age: '36 ปี - 9 เดือน - 23 วัน',
    nationalId: '3401200971563', bloodType: 'O', patientType: 'ผู้ป่วยเก่า',
    doctor: 'พญ.ปริยากร เจริญสุข', insurance: 'สิทธิประกันสังคม รพ.วชิรพยาบาล',
    address: '78/14 ซ.สรงประภา 7 ดอนเมือง กรุงเทพมหานคร 10210',
    avatarUrl: '/avatars/patient-female-d.png', vip: false,
  },
  {
    shortName: 'เอกชัย พิทยาคม', fullName: 'นายเอกชัย พิทยาคม', englishName: 'Ekachai Pittayakom',
    hn: '67-00024', vn: '69-00024', sex: 'ชาย', age: '29 ปี - 5 เดือน - 12 วัน',
    nationalId: '1101400485273', bloodType: 'A', patientType: 'ผู้ป่วยใหม่',
    doctor: 'พญ.สมหญิง รักษ์ดี', insurance: 'สิทธิหลักประกันสุขภาพถ้วนหน้า (บัตรทอง)',
    address: '105 ซ.รามคำแหง 24 หัวหมาก บางกะปิ กรุงเทพมหานคร 10240',
    avatarUrl: '/avatars/mock-male-asian-b.png', vip: false,
  },
  {
    shortName: 'ภาสกร ชาญฉลาด', fullName: 'นายภาสกร ชาญฉลาด', englishName: 'Passakorn Chanchalad',
    hn: '67-00025', vn: '69-00025', sex: 'ชาย', age: '41 ปี - 7 เดือน - 8 วัน',
    nationalId: '3100401273658', bloodType: 'B', patientType: 'ผู้ป่วยเก่า',
    doctor: 'นพ.ณัฐวุฒิ บุญมี', insurance: 'สิทธิประกันสังคม รพ.สุขุมวิท',
    address: '90/8 ซ.ลาดพร้าว 71 วังทองหลาง กรุงเทพมหานคร 10310',
    avatarUrl: '/avatars/mock-male-asian-a.png', vip: false,
  },
  /* 67-00027 / 67-00029 — ANC follow-up patients (ancVisits.js
     ANC_PATIENTS). The ANC queue referenced them but they had no profile
     here, so `getPatientByHN` returned undefined and every ANC screen fell
     back to DEFAULT_PATIENT — rendering a 42-year-old MALE patient card on
     an antenatal record, and (before the `ancHn` fix in AncFormPage)
     filing both mothers' pregnancy registrations under HN 67-00001.
     Ages match EXTRA_DOB_BY_HN below (2546 / 2541). */
  {
    shortName: 'จิราพร มณีโชติ', fullName: 'นางสาวจิราพร มณีโชติ', englishName: 'Jiraporn Maneechot',
    hn: '67-00027', vn: '69-00027', sex: 'หญิง', age: '23 ปี - 5 เดือน - 29 วัน',
    nationalId: '1102003847561', bloodType: 'B', patientType: 'ผู้ป่วยเก่า',
    doctor: 'พญ.สมหญิง รักษ์ดี', insurance: 'สิทธิหลักประกันสุขภาพถ้วนหน้า (บัตรทอง)',
    address: '45/9 ซ.เพชรบุรี 15 ราชเทวี กรุงเทพมหานคร 10400',
    avatarUrl: PATIENT_MOCK_AVATARS[2], vip: false,
  },
  {
    shortName: 'อาทิตยา บุญเรือง', fullName: 'นางสาวอาทิตยา บุญเรือง', englishName: 'Arthiya Boonruang',
    hn: '67-00029', vn: '69-00029', sex: 'หญิง', age: '28 ปี - 0 เดือน - 25 วัน',
    nationalId: '3401201029587', bloodType: 'O', patientType: 'ผู้ป่วยเก่า',
    doctor: 'นพ.ณัฐวุฒิ บุญมี', insurance: 'สิทธิประกันสังคม รพ.เกษมราษฎร์',
    address: '63/5 ซ.รัชดาภิเษก 12 ดินแดง กรุงเทพมหานคร 10400',
    avatarUrl: PATIENT_MOCK_AVATARS[8], vip: false,
  },
];

/* Walk-in ใหม่ที่ไม่เคยใช้บริการ — 4 คนในคิวรอลงทะเบียน
   ใช้ New User avatar (Figma DS Foundation 3891:7747) ไม่มี HN จนกว่าจะลงทะเบียนสำเร็จ */
export const PENDING_REGISTRATION_NO_PHOTO = [
  {
    shortName: 'ก้องภพ ศรีวงศ์', fullName: 'นายก้องภพ ศรีวงศ์', englishName: 'Kongphop Srivong',
    hn: '', sex: 'ชาย', age: '34 ปี - 2 เดือน - 6 วัน',
    nationalId: '1101200894521', phone: '081-902-1143', bloodType: 'O',
    patientType: 'ผู้ใช้บริการใหม่', doctor: '—',
    insurance: 'สิทธิประกันสังคม รพ.พระนั่งเกล้า (10686)',
    rights: 'ประกันสังคม',
    address: '42/8 ซ.พระราม 2 ซอย 39 บางมด กรุงเทพมหานคร 10150',
    vip: false,
    neverServed: true,
  },
  {
    shortName: 'จิราพร มณีโชติ', fullName: 'นางสาวจิราพร มณีโชติ', englishName: 'Jiraporn Maneechot',
    hn: '', sex: 'หญิง', age: '22 ปี - 9 เดือน - 11 วัน',
    nationalId: '1809900812364', phone: '092-558-9034', bloodType: 'A',
    patientType: 'ผู้ใช้บริการใหม่', doctor: '—',
    insurance: 'สิทธิหลักประกันสุขภาพถ้วนหน้า (บัตรทอง)',
    rights: 'บัตรทอง',
    address: '19/3 ซ.ลาดพร้าว 101 บางกะปิ กรุงเทพมหานคร 10240',
    vip: false,
    neverServed: true,
  },
  {
    shortName: 'พงศ์ศักดิ์ แสงทอง', fullName: 'นายพงศ์ศักดิ์ แสงทอง', englishName: 'Pongsak Saengthong',
    hn: '', sex: 'ชาย', age: '41 ปี - 0 เดือน - 19 วัน',
    nationalId: '3100401928475', phone: '089-701-3382', bloodType: 'B',
    patientType: 'ผู้ใช้บริการใหม่', doctor: '—',
    insurance: 'ชำระเอง',
    rights: 'ชำระเงินเอง',
    address: '7/11 ซ.จรัญสนิทวงศ์ 90 บางพลัด กรุงเทพมหานคร 10700',
    vip: false,
    neverServed: true,
  },
  {
    shortName: 'อาทิตยา บุญเรือง', fullName: 'นางสาวอาทิตยา บุญเรือง', englishName: 'Arthiya Boonruang',
    hn: '', sex: 'หญิง', age: '27 ปี - 4 เดือน - 2 วัน',
    nationalId: '3401201029587', phone: '063-884-1205', bloodType: 'O',
    patientType: 'ผู้ใช้บริการใหม่', doctor: '—',
    insurance: 'สิทธิประกันสังคม รพ.เกษมราษฎร์',
    rights: 'ประกันสังคม',
    address: '63/5 ซ.รัชดาภิเษก 12 ดินแดง กรุงเทพมหานคร 10400',
    vip: false,
    neverServed: true,
  },
];

export const getPatientByShortName = (shortName) =>
  PATIENT_PROFILES.find((p) => p.shortName === shortName);

export const getPatientByHN = (hn) => {
  if (!hn) return undefined;
  return PATIENT_PROFILES.find((p) => p.hn === hn)
    ?? PENDING_REGISTRATION_NO_PHOTO.find((p) => p.hn === hn);
};

/* VN (Visit Number) — single source of truth for both the OPD screening
   queue (`pages/opd/QueuePage.jsx`) and the pharmacy queue
   (`data/pharmacyQueue.js`), so the same patient always shows the same VN
   on both screens instead of each page deriving its own number. Only
   `PATIENT_PROFILES` carries a `vn` — `PENDING_REGISTRATION_NO_PHOTO`
   patients haven't started a visit yet (still "รอลงทะเบียน"), so they
   correctly have none. */
export const getVnByHn = (hn) => PATIENT_PROFILES.find((p) => p.hn === hn)?.vn || '';

/* Thai Buddhist DOB strings — MR rows for 67-00001…10, mock dates for the
   rest so registration queue วันเกิด cells align with screening ages. */
const MR_DOB_BY_HN = Object.fromEntries(MR_PATIENTS.map((p) => [p.hn, p.dob]));

const EXTRA_DOB_BY_HN = {
  '67-00011': '14 กุมภาพันธ์ 2520',
  '67-00012': '5 มิถุนายน 2508',
  '67-00013': '21 ตุลาคม 2542',
  '67-00014': '3 มีนาคม 2521',
  '67-00015': '9 กันยายน 2529',
  '67-00016': '17 มกราคม 2544',
  '67-00017': '30 กรกฎาคม 2527',
  '67-00018': '12 พฤศจิกายน 2513',
  '67-00019': '8 สิงหาคม 2540',
  '67-00020': '25 เมษายน 2535',
  '67-00021': '2 ธันวาคม 2518',
  '67-00022': '19 กุมภาพันธ์ 2524',
  '67-00023': '7 มิถุนายน 2532',
  '67-00024': '11 ตุลาคม 2539',
  '67-00025': '28 กันยายน 2527',
  '67-00026': '14 มีนาคม 2534',
  '67-00027': '2 กุมภาพันธ์ 2546',
  '67-00028': '19 มกราคม 2527',
  '67-00029': '6 กรกฎาคม 2541',
};

export const getPatientDobByHN = (hn) =>
  MR_DOB_BY_HN[hn] ?? EXTRA_DOB_BY_HN[hn] ?? '';

/* Convenience default — used as the fallback when ScreeningPage is
   reached directly (no row click) so the page never renders empty. */
export const DEFAULT_PATIENT = PATIENT_PROFILES[0];
