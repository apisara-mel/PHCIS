/* ประวัติการตรวจทางรังสีวิทยาต่อผู้รับบริการ — ใช้โดยแท็บ "ผลการ X-ray / RIS"
   ในป๊อปอัปประวัติการรักษา (โหมดดูตามรายการตรวจ) ซึ่งอ่านเป็นไทม์ไลน์

   ⚠️ ภาพฟิล์มใน `films[]` เป็น **ภาพแทนแบบ stylized** ใน `public/images/films/`
   ไม่ใช่ภาพรังสีจริงของใคร — ต้นแบบยังไม่มี DICOMweb/PACS จริง (ดู
   `treatmentInterfaces.js`) จึงวางภาพแทนไว้ให้เห็นว่าฟิล์มจะอยู่ตรงไหน
   แทนการสร้างภาพที่ดูเหมือนภาพถ่ายจริง */

export const FILM_ASSETS = {
  cxr: '/images/films/cxr.svg',
  kub: '/images/films/kub.svg',
  knee: '/images/films/knee.svg',
  lsspine: '/images/films/lsspine.svg',
};

const STUDIES = [
  {
    id: 'img-7-1', hn: '67-00007', reportedOn: '18 กุมภาพันธ์ 2569', reportedAt: '11:24',
    xn: 'XN X69-0447', modality: 'X-ray', bodyPart: 'เข่าทั้งสองข้าง (AP/Lateral)',
    orderedBy: 'นพ.สมชาย ใจดี', radiologist: 'พญ.พรทิพย์ ศรีวัฒนา', center: 'ศูนย์ 8 บางนา',
    resultClass: 'abnormal',
    findings: 'Joint space narrowing ที่ medial compartment ทั้งสองข้าง มี osteophyte ที่ขอบข้อ '
      + 'ไม่พบ fracture หรือ dislocation · subchondral sclerosis เล็กน้อย',
    impression: 'Degenerative change ของข้อเข่าทั้งสองข้าง เข้าได้กับ osteoarthritis ระยะเริ่มต้นถึงปานกลาง',
    films: [{ key: 'knee', label: 'Knee AP' }, { key: 'knee', label: 'Knee Lateral' }],
  },
  {
    id: 'img-7-2', hn: '67-00007', reportedOn: '22 พฤศจิกายน 2568', reportedAt: '09:48',
    xn: 'XN X68-2210', modality: 'X-ray', bodyPart: 'ทรวงอก (PA)',
    orderedBy: 'พญ.วิภา สุขศรี', radiologist: 'นพ.ธนากร อินทรา', center: 'ศูนย์ 4 ดินแดง',
    resultClass: 'normal',
    findings: 'ปอดทั้งสองข้างโปร่งดี ไม่พบ infiltration หรือ effusion · หัวใจขนาดปกติ (CTR < 0.5) '
      + '· กระบังลมและมุม costophrenic ปกติ',
    impression: 'ไม่พบความผิดปกติของทรวงอก',
    films: [{ key: 'cxr', label: 'Chest PA' }],
  },
  {
    id: 'img-7-3', hn: '67-00007', reportedOn: '30 มิถุนายน 2568', reportedAt: '14:02',
    xn: 'XN X68-1187', modality: 'อัลตราซาวด์', bodyPart: 'ช่องท้องส่วนบน / KUB',
    orderedBy: 'พญ.ปรียาภรณ์ สุขสวัสดิ์', radiologist: 'พญ.พรทิพย์ ศรีวัฒนา', center: 'ศูนย์ 4 ดินแดง',
    resultClass: 'normal',
    findings: 'ตับ ม้าม ตับอ่อน ขนาดและ echogenicity ปกติ · ไม่พบนิ่วในถุงน้ำดี '
      + '· ไตทั้งสองข้างขนาดปกติ ไม่พบ hydronephrosis',
    impression: 'ไม่พบความผิดปกติในช่องท้อง',
    films: [{ key: 'kub', label: 'Abdomen / KUB' }],
  },
  {
    id: 'img-1-1', hn: '67-00001', reportedOn: '2 เมษายน 2569', reportedAt: '10:36',
    xn: 'XN X69-0512', modality: 'X-ray', bodyPart: 'กระดูกสันหลังส่วนเอว (L-S spine)',
    orderedBy: 'พญ.สมหญิง รักษ์ดี', radiologist: 'นพ.ธนากร อินทรา', center: 'ศูนย์ 8 บางนา',
    resultClass: 'abnormal',
    findings: 'Disc space narrowing ที่ L4-L5 · mild spondylosis ที่ขอบกระดูก '
      + 'ไม่พบ compression fracture หรือ spondylolisthesis',
    impression: 'Degenerative disc disease ที่ L4-L5 · แนะนำติดตามอาการทางคลินิก',
    films: [{ key: 'lsspine', label: 'L-S Spine AP' }],
  },
  {
    id: 'img-1-2', hn: '67-00001', reportedOn: '30 มีนาคม 2569', reportedAt: '08:55',
    xn: 'XN X69-0498', modality: 'X-ray', bodyPart: 'ทรวงอก (PA)',
    orderedBy: 'นพ.สมชาย ใจดี', radiologist: 'พญ.พรทิพย์ ศรีวัฒนา', center: 'ศูนย์ 8 บางนา',
    resultClass: 'normal',
    findings: 'ปอดโปร่งดีทั้งสองข้าง หัวใจขนาดปกติ ไม่พบรอยโรค',
    impression: 'ทรวงอกปกติ — ตรวจสุขภาพประจำปี',
    films: [{ key: 'cxr', label: 'Chest PA' }],
  },
];

export const RESULT_CLASS_META = {
  normal: { label: 'ปกติ', style: 'success' },
  abnormal: { label: 'ผิดปกติ', style: 'warning' },
  urgent: { label: 'เร่งด่วน', style: 'error' },
  unclear: { label: 'ไม่ชัดเจน', style: 'neutral' },
};

/* ผู้รับบริการที่ยังไม่มีผลรังสีของตัวเอง ใช้ชุด mock กลางนี้ (มติผู้ใช้ 3 ก.ย. 69) —
   ต้นแบบต้องมีเนื้อหาให้เห็นทุกคลินิก ไม่ใช่ตารางว่าง */
const FALLBACK_STUDIES = [
  {
    id: 'img-fallback-1', reportedOn: '26 สิงหาคม 2569', reportedAt: '10:15',
    xn: 'XN X69-1180', modality: 'อัลตราซาวด์', bodyPart: 'อัลตราซาวด์ครรภ์ (Obstetric US)',
    orderedBy: 'นพ.สมชาย ใจดี', radiologist: 'พญ.พรทิพย์ ศรีวัฒนา', center: 'ศูนย์ 4 ดินแดง',
    resultClass: 'normal',
    findings: 'ทารกในครรภ์ 1 คน ท่า Vertex · หัวใจเต้น 152 ครั้ง/นาที · รกเกาะด้านหน้าส่วนบน '
      + '· ปริมาณน้ำคร่ำปกติ (AFI 12 ซม.) · ไม่พบความผิดปกติของโครงสร้างทารก',
    impression: 'ครรภ์เดี่ยว อายุครรภ์ 13 สัปดาห์ 2 วัน ทารกมีชีวิต เจริญเติบโตตามเกณฑ์',
    films: [{ key: 'kub', label: 'Obstetric US' }],
  },
  {
    id: 'img-fallback-2', reportedOn: '12 มิถุนายน 2569', reportedAt: '09:20',
    xn: 'XN X69-0894', modality: 'X-ray', bodyPart: 'ทรวงอก (PA)',
    orderedBy: 'พญ.สมหญิง รักษ์ดี', radiologist: 'นพ.ธนากร อินทรา', center: 'ศูนย์ 4 ดินแดง',
    resultClass: 'normal',
    findings: 'ปอดทั้งสองข้างโปร่งดี ไม่พบ infiltration หรือ effusion · หัวใจขนาดปกติ (CTR < 0.5)',
    impression: 'ไม่พบความผิดปกติของทรวงอก',
    films: [{ key: 'cxr', label: 'Chest PA' }],
  },
];

export const imagingHistoryForPatient = (hn) => {
  const key = String(hn || '').trim();
  if (!key) return [];
  const own = STUDIES.filter((s) => s.hn === key).map((s) => ({ ...s }));
  return own.length ? own : FALLBACK_STUDIES.map((s) => ({ ...s, hn: key }));
};

export default STUDIES;
