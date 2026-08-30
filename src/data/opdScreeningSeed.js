/* ผลคัดกรองตั้งต้น (mock) ต่อ HN — ใช้เป็นค่าสำรองเมื่อ `opdScreeningReview`
   ใน sessionStorage ยังว่าง

   ⚠️ เดิม `screeningHandoff` ตั้งใจไม่ใส่ข้อมูลตัวอย่างเลย เพราะผลคัดกรองอยู่ใน
   บริบทการรักษาจริง — ค่าที่พยาบาลยังไม่กรอกต้องอ่านว่า "ยังไม่ได้บันทึก"
   แต่ในต้นแบบที่ยังไม่มีใครเดินผ่านจุดคัดกรองจริง ทุกแท็บฝั่งแพทย์จึงว่างหมด
   จนดูงานไม่ได้ (มติผู้ใช้ 28 ส.ค. 69 — ให้ mock ข้อมูลทุกอย่าง)

   ของจริงจาก sessionStorage ชนะเสมอ: seed ถูกใช้เฉพาะหมวดที่ยังไม่มีใครกรอก
   ดังนั้นพอเดินผ่านจุดคัดกรองจริง ค่าที่กรอกจะทับ seed ทันที */

const REC = (name, severity, status, symptom, note = '') => ({
  name, severity, status, symptom, note,
});

const SEEDS = {
  '67-00007': {
    vitals: {
      round: { date: '18 ก.พ. 2569', time: '08:24' },
      temp: '36.5', pulse: '78', pressureSys: '138', pressureDia: '86',
      respiration: '18', oxygen: '98', weight: '65', height: '158',
      waist: '84', bmi: '26.0',
      note: 'วัดความดันซ้ำรอบที่สองหลังนั่งพัก 5 นาที ค่าแรก 146/90 · '
        + 'ผู้รับบริการเดินขึ้นบันไดมาก่อนวัด · ชั่งน้ำหนักโดยไม่ถอดรองเท้า',
    },
    symptom: {
      complaint: 'ปวดเข่าทั้งสองข้าง เดินขึ้นลงบันไดลำบาก',
      duration: '1 เดือน',
      presentIllness: 'ปวดเข่าทั้งสองข้างมา 1 เดือน ปวดมากตอนเช้าและเวลาขึ้นลงบันได '
        + 'มีเสียงกรอบแกรบในข้อ ไม่มีข้อบวมแดงร้อน ไม่มีไข้ เคยกินยาแก้ปวดซื้อเองแล้วดีขึ้นชั่วคราว',
      pain: 'severe', triage: 4, cert: false,
      orders: [
        'ชั่งน้ำหนัก วัดส่วนสูง',
        'ประเมินการเดินและการทรงตัว',
        'วัดความดันโลหิตซ้ำหลังนั่งพัก 5 นาที',
        'แนะนำการใช้ไม้เท้าช่วยเดินระหว่างรอตรวจ',
      ],
      othersNote: 'ผู้รับบริการมากับบุตรสาว · ขอเก้าอี้นั่งรอแทนการยืน · '
        + 'แจ้งว่ามีนัดคลินิกกระดูกและข้ออยู่แล้วเดือนหน้า',
      bedId: '',
    },
    'allergy.drug': {
      topic: 'ประวัติการแพ้ยา', declaresPresence: true,
      records: [
        REC('Statins (Simvastatin)', 'ปานกลาง', 'แน่นอน',
          'ปวดกล้ามเนื้อต้นขาทั้งสองข้างหลังกินยา 2 สัปดาห์', 'หยุดยาแล้วอาการหายภายใน 1 สัปดาห์'),
        REC('NSAIDs (Ibuprofen)', 'เล็กน้อย', 'น่าจะใช่',
          'จุกแน่นลิ้นปี่ คลื่นไส้หลังรับประทาน', 'ให้ยาลดกรดร่วมด้วยทุกครั้ง'),
      ],
    },
    'allergy.food': {
      topic: 'แพ้อาหาร', declaresPresence: true,
      records: [REC('กุ้ง / อาหารทะเลเปลือกแข็ง', 'ปานกลาง', 'แน่นอน',
        'ผื่นลมพิษขึ้นตามลำตัวและแขน คันมาก ภายใน 1 ชม.', 'เลี่ยงมาตลอด 5 ปี')],
    },
    'allergy.chemical': {
      topic: 'แพ้สารเคมี', declaresPresence: true,
      records: [REC('น้ำยาล้างจาน (ชนิดมีน้ำหอม)', 'เล็กน้อย', 'น่าจะใช่',
        'ผิวมือแห้งลอก คันบริเวณง่ามนิ้ว', 'ใส่ถุงมือเวลาล้างจานแล้วดีขึ้น')],
    },
    'allergy.disease': {
      topic: 'ประวัติโรคประจำตัว', declaresPresence: true,
      records: [
        REC('ไขมันในเลือดสูง (Dyslipidemia)', 'ปานกลาง', 'กำลังรักษา',
          'ไม่มีอาการ ตรวจพบจากผลเลือด', 'แพ้ Statins — ใช้ Fenofibrate แทน'),
        REC('ความดันโลหิตสูง (Hypertension)', 'ปานกลาง', 'กำลังรักษา',
          'ปวดท้ายทอยเวลาความดันขึ้น', 'Amlodipine 5 mg วันละครั้ง'),
      ],
    },
    'allergy.other': {
      topic: 'อื่น ๆ', declaresPresence: true,
      records: [REC('ละอองเกสร / ฝุ่นบ้าน', 'เล็กน้อย', 'น่าจะใช่',
        'จามติดกันตอนเช้า คัดจมูก น้ำมูกใส', 'อาการเป็นมากช่วงเปลี่ยนฤดู')],
    },
    behaviour: {
      smoking: 'ไม่สูบ',
      alcohol: 'ดื่มเป็นครั้งคราว (สังสรรค์ เดือนละ 1-2 ครั้ง)',
      exercise: 'สัปดาห์ละ 1-2 ครั้ง (เดินเร็ว 30 นาที)',
      detail: 'ทำงานนั่งโต๊ะเป็นหลัก · นอนวันละ 5-6 ชม. · ดื่มกาแฟวันละ 2 แก้ว',
    },
    doctor: {
      assignedClinicKey: 'opd-treat',
      assignedDoctor: 'พญ. สมหญิง รักษ์ดี',
      assignedSlot: '09:00-09:20',
      assignedDept: 'อายุรกรรม',
    },
    _meta: { updatedAt: '2026-02-18T08:24:00+07:00', seeded: true },
  },

  '67-00001': {
    vitals: {
      round: { date: '2 เม.ย. 2569', time: '09:10' },
      temp: '36.7', pulse: '76', pressureSys: '132', pressureDia: '84',
      respiration: '18', oxygen: '98', weight: '68', height: '172',
      waist: '88', bmi: '23.0',
      note: 'วัดในท่านั่ง แขนขวา · ผู้รับบริการบอกว่าปวดหลังมากเวลาลุกจากเก้าอี้ '
        + 'จึงวัดส่วนสูงหลังสุด',
    },
    symptom: {
      complaint: 'ปวดหลังช่วงล่างมาก เวลาก้ม',
      duration: '2 สัปดาห์',
      presentIllness: 'ปวดหลังช่วงเอวมา 2 สัปดาห์ ปวดมากเวลาก้มหยิบของ '
        + 'ไม่มีปวดร้าวลงขา ไม่มีชาหรืออ่อนแรง ควบคุมปัสสาวะอุจจาระได้ปกติ',
      pain: 'moderate', triage: 4, cert: true,
      orders: [
        'ประเมินท่าทางการเคลื่อนไหว',
        'แนะนำท่านอนพักและการลุกจากเตียงที่ถูกวิธี',
      ],
      othersNote: 'ขอใบรับรองแพทย์เพื่อลาป่วย 3 วัน — แจ้งให้แพทย์ทราบตอนตรวจ',
      bedId: '',
    },
    'allergy.drug': {
      topic: 'ประวัติการแพ้ยา', declaresPresence: true,
      records: [REC('Penicillin', 'มาก', 'แน่นอน',
        'ผื่นลมพิษทั่วตัว หน้าบวม หายใจลำบาก', 'เคยเข้าห้องฉุกเฉินปี 2566')],
    },
    'allergy.food': { topic: 'แพ้อาหาร', declaresPresence: false, records: [] },
    'allergy.chemical': { topic: 'แพ้สารเคมี', declaresPresence: false, records: [] },
    'allergy.disease': {
      topic: 'ประวัติโรคประจำตัว', declaresPresence: true,
      records: [REC('โรคเกาต์ (Gout)', 'เล็กน้อย', 'ควบคุมได้',
        'ปวดบวมแดงร้อนที่นิ้วหัวแม่เท้าเป็นครั้งคราว', 'งดเครื่องในสัตว์และแอลกอฮอล์')],
    },
    'allergy.other': { topic: 'อื่น ๆ', declaresPresence: false, records: [] },
    behaviour: {
      smoking: 'เคยสูบ เลิกแล้ว 3 ปี',
      alcohol: 'ไม่ดื่ม',
      exercise: 'สัปดาห์ละ 3 ครั้งขึ้นไป',
      detail: 'ยกของหนักเป็นประจำจากงานที่ทำ',
    },
    doctor: {
      assignedClinicKey: 'opd-treat',
      assignedDoctor: 'นพ. สมชาย ใจดี',
      assignedSlot: '10:20-10:40',
      assignedDept: 'เวชศาสตร์ครอบครัว',
    },
    _meta: { updatedAt: '2026-04-02T09:10:00+07:00', seeded: true },
  },
};

/* HN ที่ไม่ได้เขียนไว้เฉพาะ ใช้ชุดกลางเพื่อให้ทุกแท็บมีของอ่าน */
const FALLBACK_SEED = {
  vitals: {
    round: { date: '—', time: '' },
    temp: '36.8', pulse: '80', pressureSys: '126', pressureDia: '80',
    respiration: '18', oxygen: '98', weight: '62', height: '165',
    waist: '80', bmi: '22.8',
    note: 'วัดในท่านั่ง แขนซ้าย หลังนั่งพัก 5 นาที',
  },
  symptom: {
    complaint: 'ตรวจติดตามอาการตามนัด',
    duration: 'ติดตามต่อเนื่อง',
    presentIllness: 'มาตามนัดติดตามอาการ ไม่มีอาการผิดปกติเพิ่มเติมระหว่างนัด รับประทานยาต่อเนื่อง',
    pain: 'none', triage: 5, cert: false,
    orders: ['วัดสัญญาณชีพ', 'ทบทวนยาที่รับประทานอยู่กับผู้รับบริการ'],
    othersNote: 'นำยาเดิมมาด้วยครบทุกรายการ',
    bedId: '',
  },
  /* ชุดกลางมีของให้อ่านทุกหมวด ไม่ปล่อยว่างทั้งแถบ (มติผู้ใช้ 31 ส.ค. 69) —
     หมวดที่ตั้งใจให้เป็น "ซักแล้ว ระบุว่าไม่มี" ยังคง `declaresPresence: false` */
  'allergy.drug': {
    topic: 'ประวัติการแพ้ยา', declaresPresence: true,
    records: [REC('Sulfonamides (Co-trimoxazole)', 'ปานกลาง', 'น่าจะใช่',
      'ผื่นแดงคันตามลำตัวหลังกินยา 3 วัน', 'เปลี่ยนเป็นยากลุ่มอื่นแล้วอาการหาย')],
  },
  'allergy.food': { topic: 'แพ้อาหาร', declaresPresence: false, records: [] },
  'allergy.chemical': { topic: 'แพ้สารเคมี', declaresPresence: false, records: [] },
  'allergy.disease': {
    topic: 'ประวัติโรคประจำตัว', declaresPresence: true,
    records: [REC('ความดันโลหิตสูง (Hypertension)', 'เล็กน้อย', 'ควบคุมได้',
      'ไม่มีอาการ ตรวจพบจากการวัดความดันตามนัด', 'Amlodipine 5 mg วันละครั้ง')],
  },
  'allergy.other': { topic: 'อื่น ๆ', declaresPresence: false, records: [] },
  behaviour: {
    smoking: 'ไม่สูบ', alcohol: 'ไม่ดื่ม', exercise: 'สัปดาห์ละ 1-2 ครั้ง',
    detail: '',
  },
  doctor: {
    assignedClinicKey: 'opd-treat',
    assignedDoctor: 'พญ. สมหญิง รักษ์ดี',
    assignedSlot: '13:00-13:20',
    assignedDept: 'อายุรกรรม',
  },
  _meta: { updatedAt: '2026-08-30T09:05:00+07:00', seeded: true },
};

export const screeningSeedForHn = (hn) => {
  const key = String(hn || '').trim();
  if (!key) return {};
  return SEEDS[key] || FALLBACK_SEED;
};

export default SEEDS;
