/* tbQueue.js — คิวคลินิกวัณโรค (TOR §1.10.4.1–.2) mock roster.
   Vocabulary lifted from คู่มือระบบวัณโรค.pdf (legacy HCIS TB module):
   ประเภทผู้ป่วย New M+/New M-/EP/Relapse/TAD/MDR, การมารับยา, นัด DOT.
   Patients reuse HNs that exist in patientProfiles.js so PatientCard /
   QueuePatientAvatar resolve real identities (same rule ANC learned the
   hard way — see the 67-00027 note in patientProfiles.js). */

/* ประเภทผู้ป่วยวัณโรค — exact legacy registration categories. */
export const TB_PATIENT_TYPES = [
  { value: 'newMPlus',  label: 'New M+',  description: 'ผู้ป่วยใหม่ เสมหะพบเชื้อ (Smear positive)' },
  { value: 'newMMinus', label: 'New M-',  description: 'ผู้ป่วยใหม่ เสมหะไม่พบเชื้อ (Smear negative)' },
  { value: 'ep',        label: 'EP',      description: 'วัณโรคนอกปอด (Extrapulmonary)' },
  { value: 'relapse',   label: 'Relapse', description: 'กลับเป็นซ้ำหลังรักษาหายแล้ว' },
  { value: 'tad',       label: 'TAD',     description: 'รักษาซ้ำภายหลังขาดยา (Treatment After Default)' },
  { value: 'mdr',       label: 'MDR',     description: 'วัณโรคดื้อยาหลายขนาน (Multidrug-resistant)' },
];

export const TB_PATIENT_TYPE_BADGE = {
  newMPlus:  'red',
  newMMinus: 'orange',
  ep:        'purple',
  relapse:   'yellow',
  tad:       'pink',
  mdr:       'grey',
};

export const resolveTbPatientType = (value) =>
  TB_PATIENT_TYPES.find((t) => t.value === value) || null;

/* วันนี้ = คิวคลินิกวัณโรคประจำสัปดาห์ของศูนย์บริการสาธารณสุข (กทม.)
   `registryNo` links a row to its ทะเบียนวัณโรค record (tbRegistry.js);
   suspects not yet registered carry `registryNo: null` — the form's
   diagnosis step offers the ขึ้นทะเบียน CTA for exactly those rows.
   `rightsExpired` drives the สิทธิหมดอายุ warning on the queue row and
   the PatientCard banner (playbook §5 no-rights edge). */
export const TB_QUEUE = [
  {
    queue: 'T01', hn: '67-00009', name: 'นายกิตติ ศรีสมบูรณ์', idCard: '3550900462158',
    patientType: 'newMPlus', registryNo: '01/2569', treatmentMonth: 2,
    doctor: 'พญ.ศิรินทร์ พัฒนกุล', room: 'TB-1', waitMinutes: 25,
    statusKey: 'waiting', telemedicine: false, dotToday: true,
    rights: 'สิทธิข้าราชการ กรมบัญชีกลาง', rightsExpired: false,
    drugAllergies: [], chronicDiseases: ['เบาหวานชนิดที่ 2'],
  },
  {
    queue: 'T02', hn: '67-00014', name: 'นายชัยวัฒน์ ก้องเกียรติ', idCard: '3100401872569',
    patientType: 'relapse', registryNo: '03/2569', treatmentMonth: 1,
    doctor: 'พญ.สมหญิง รักษ์ดี', room: 'TB-1', waitMinutes: 18,
    statusKey: 'waiting', telemedicine: false, dotToday: true,
    rights: 'สิทธิประกันสังคม รพ.พระมงกุฎเกล้า', rightsExpired: false,
    drugAllergies: ['Rifampicin (ผื่นแพ้ยา)'], chronicDiseases: [],
  },
  {
    queue: 'T03', hn: '67-00018', name: 'นายธีรเดช อัครพงศ์', idCard: '5670012467128',
    patientType: 'mdr', registryNo: '02/2569', treatmentMonth: 5,
    doctor: 'พญ.ศิรินทร์ พัฒนกุล', room: 'TB-2', waitMinutes: 40,
    statusKey: 'progress', telemedicine: true, dotToday: true,
    rights: 'ชำระเงินเอง', rightsExpired: false,
    drugAllergies: [], chronicDiseases: ['ความดันโลหิตสูง'],
  },
  {
    queue: 'T04', hn: '67-00016', name: 'นายปกรณ์ บุญพิทักษ์', idCard: '1100401473652',
    patientType: 'newMMinus', registryNo: '05/2569', treatmentMonth: 0,
    doctor: 'นพ.ณัฐวุฒิ บุญมี', room: 'TB-1', waitMinutes: 12,
    statusKey: 'waiting', telemedicine: false, dotToday: false,
    rights: 'สิทธิประกันสังคม รพ.เกษมราษฎร์ (หมดอายุ 30 มิ.ย. 2569)', rightsExpired: true,
    drugAllergies: [], chronicDiseases: [],
  },
  {
    queue: 'T05', hn: '67-00024', name: 'นายเอกชัย พิทยาคม', idCard: '1101400485273',
    patientType: null, registryNo: null, treatmentMonth: null,
    doctor: 'พญ.สมหญิง รักษ์ดี', room: 'TB-1', waitMinutes: 8,
    statusKey: 'waiting', telemedicine: false, dotToday: false,
    rights: 'สิทธิหลักประกันสุขภาพถ้วนหน้า (บัตรทอง)', rightsExpired: false,
    drugAllergies: [], chronicDiseases: [],
    suspectNote: 'ส่งต่อจากคัดกรองกลุ่มเสี่ยง — CXR พบ infiltration ปอดขวาบน',
  },
  {
    queue: 'T06', hn: '67-00022', name: 'นายอนุชา สมบูรณ์ทรัพย์', idCard: '5670012849137',
    patientType: 'tad', registryNo: '04/2569', treatmentMonth: 1,
    doctor: 'นพ.ณัฐวุฒิ บุญมี', room: 'TB-2', waitMinutes: 33,
    statusKey: 'progress', telemedicine: false, dotToday: false,
    rights: 'สิทธิประกันสังคม รพ.พระมงกุฎเกล้า', rightsExpired: false,
    drugAllergies: [], chronicDiseases: [],
  },
  {
    queue: 'T07', hn: '67-00007', name: 'นางมาลี อ่อนน้อม', idCard: '3100501239876',
    patientType: 'ep', registryNo: '06/2569', treatmentMonth: 4,
    doctor: 'พญ.ศิรินทร์ พัฒนกุล', room: 'TB-1', waitMinutes: 0,
    statusKey: 'done', telemedicine: false, dotToday: false,
    rights: 'สิทธิประกันสังคม รพ.มงกุฎวัฒนะ', rightsExpired: false,
    drugAllergies: [], chronicDiseases: [],
  },
  {
    queue: 'T08', hn: '67-00025', name: 'นายภาสกร ชาญฉลาด', idCard: '3100401273658',
    patientType: 'newMPlus', registryNo: '52/2568', treatmentMonth: 6,
    doctor: 'นพ.ณัฐวุฒิ บุญมี', room: 'TB-2', waitMinutes: 0,
    statusKey: 'done', telemedicine: true, dotToday: false,
    rights: 'สิทธิประกันสังคม รพ.สุขุมวิท', rightsExpired: false,
    drugAllergies: [], chronicDiseases: [],
  },
];

export const getTbQueueRows = () => TB_QUEUE;

export const getTbQueueRowByHn = (hn) => TB_QUEUE.find((r) => r.hn === hn) || null;

/* ผลซักประวัติจากจุดคัดกรอง (triage) — read-only บนขั้นตอนที่ 1 ของ
   แบบบันทึกการตรวจ (TOR 1.10.4.3): Vital signs + Nurse note + แพ้ยา +
   โรคประจำตัว ถูกดึงมาแสดง ไม่ใช่กรอกซ้ำ. */
export const TB_TRIAGE_BY_HN = {
  '67-00009': {
    vitals: { bp: '132/84', hr: '88', temp: '37.1', weight: '58.5', height: '168', spo2: '97', rr: '20' },
    nurseNote: 'ไอมีเสมหะมา 3 สัปดาห์ เสมหะสีเหลือง มีไข้ต่ำ ๆ ช่วงเย็น เหงื่อออกกลางคืน น้ำหนักลด 4 กก. ใน 2 เดือน',
    recordedBy: 'พว.เพ็ญศรี สุขใจ', recordedAt: '09:05 น.',
  },
  '67-00014': {
    vitals: { bp: '128/80', hr: '76', temp: '36.8', weight: '62.0', height: '170', spo2: '98', rr: '18' },
    nurseNote: 'เคยรักษาวัณโรคหายเมื่อปี 2565 กลับมามีอาการไอเรื้อรังอีกครั้ง 1 เดือน',
    recordedBy: 'พว.เพ็ญศรี สุขใจ', recordedAt: '09:12 น.',
  },
  '67-00018': {
    vitals: { bp: '145/92', hr: '90', temp: '36.9', weight: '55.0', height: '172', spo2: '95', rr: '22' },
    nurseNote: 'ผู้ป่วย MDR-TB เดือนที่ 5 มารับยาตามนัด วันนี้ขอทำ VOT ผ่าน Telemedicine',
    recordedBy: 'พว.อรทัย แก้วประเสริฐ', recordedAt: '09:20 น.',
  },
  '67-00016': {
    vitals: { bp: '118/74', hr: '72', temp: '36.6', weight: '65.5', height: '175', spo2: '99', rr: '16' },
    nurseNote: 'ขึ้นทะเบียนใหม่ New M- ยังไม่เริ่มยา สิทธิประกันสังคมหมดอายุ — แจ้งงานสิทธิแล้ว',
    recordedBy: 'พว.อรทัย แก้วประเสริฐ', recordedAt: '09:28 น.',
  },
  '67-00024': {
    vitals: { bp: '122/78', hr: '84', temp: '37.4', weight: '60.0', height: '173', spo2: '97', rr: '20' },
    nurseNote: 'มาจากนัดคัดกรองกลุ่มเสี่ยง (ผู้สัมผัสร่วมบ้าน) CXR พบความผิดปกติ รอแพทย์วินิจฉัย',
    recordedBy: 'พว.เพ็ญศรี สุขใจ', recordedAt: '09:35 น.',
  },
};

export const getTbTriageByHn = (hn) => TB_TRIAGE_BY_HN[hn] || null;
