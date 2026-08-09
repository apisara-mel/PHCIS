/* §1.20.7 — Dashboard ผลการดูแลผู้รับบริการคลินิกพิเศษ (7.1–7.11)
   Aggregate outcome ของแต่ละคลินิก ที่ store เดิม (ncdVisits, mentalHealthClinic,
   tbRegistry, addictionVisits, hivStiVisits, immunizationClinic, rehabVisits,
   socialWorkSupplies, homevisitVisits) เก็บเป็นรายเคสระดับปฏิบัติการ แต่ไม่มี
   ชั้น outcome สรุปสำหรับ dashboard — ไฟล์นี้เก็บชั้นสรุปนั้น (playbook §4)

   คลินิกที่เป็นข้อมูลลับตาม §1.4.2 (HIV, PEP/PrEP, สุขภาพจิต, สารเสพติด, วัณโรค)
   เก็บเฉพาะตัวเลขรวม — ไม่มีชื่อ/CID ในไฟล์นี้เลย */

import { makeRng, between, THAI_MONTHS_SHORT, isoOffsetMonths } from '@/data/dashboardCommon';

/** คลินิกพิเศษที่แสดงบน Dashboard §1.20.7 (7.7 ANC อยู่บน /dashboard แล้ว)
    `queuePath` ต้องตรงกับ route ที่ลงทะเบียนจริงใน `src/routes/Routes.jsx` เท่านั้น
    (ไม่มี catch-all — path ที่ไม่มีจริงจะเปิดเป็นหน้าว่าง) คลินิกส่วนใหญ่ใช้
    `/clinic/<slug>` เป็นหน้าคิว ยกเว้น ANC (`/treat/anc/queue`) และเยี่ยมบ้าน
    (`/homevisit` — ระบบระดับ rail ตาม §1.18 ไม่ได้อยู่ใต้ /clinic) */
export const CLINIC_TABS = [
  { key: 'ncd',       torId: '1.20.7.1',  label: 'โรคเฉพาะ / NCD',      icon: 'monitor_heart',   confidential: false, queuePath: '/clinic/ncd' },
  { key: 'mental',    torId: '1.20.7.2',  label: 'สุขภาพจิต',            icon: 'psychology',      confidential: true,  queuePath: '/clinic/mental-health' },
  { key: 'tb',        torId: '1.20.7.3',  label: 'วัณโรค',               icon: 'coronavirus',     confidential: true,  queuePath: '/clinic/tb' },
  { key: 'addiction', torId: '1.20.7.4',  label: 'สารเสพติด',            icon: 'medication',      confidential: true,  queuePath: '/clinic/addiction' },
  { key: 'hiv',       torId: '1.20.7.5',  label: 'HIV',                  icon: 'bloodtype',       confidential: true,  queuePath: '/clinic/hiv-sti' },
  { key: 'pep',       torId: '1.20.7.6',  label: 'PEP / PrEP',           icon: 'shield',          confidential: true,  queuePath: '/clinic/hiv-sti' },
  { key: 'anc',       torId: '1.20.7.7',  label: 'ฝากครรภ์ (ANC)',       icon: 'pregnant_woman',  confidential: false, queuePath: '/treat/anc/queue' },
  { key: 'epi',       torId: '1.20.7.8',  label: 'สร้างเสริมภูมิคุ้มกัน', icon: 'vaccines',        confidential: false, queuePath: '/clinic/immunization' },
  { key: 'rehab',     torId: '1.20.7.9',  label: 'ฟื้นฟู/กายภาพบำบัด',    icon: 'accessible',      confidential: false, queuePath: '/clinic/rehab' },
  { key: 'social',    torId: '1.20.7.10', label: 'สังคมสงเคราะห์',       icon: 'volunteer_activism', confidential: false, queuePath: '/clinic/social-work' },
  { key: 'homevisit', torId: '1.20.7.11', label: 'เยี่ยมบ้าน',            icon: 'home_health',     confidential: false, queuePath: '/homevisit' },
];

export const clinicTab = (key) => CLINIC_TABS.find((c) => c.key === key) || CLINIC_TABS[0];

/** สิทธิ์ที่เปิดดูคลินิกข้อมูลลับตาม §1.4.2 ได้ (แม้เป็นข้อมูลสรุปเชิงสถิติ)
    — สิทธิ์อื่นเห็นสถานะ “ไม่มีสิทธิ์เข้าถึง” และระบบไม่ประมวลผลข้อมูลให้ */
export const CONFIDENTIAL_ROLES = [
  'แพทย์',
  'พยาบาลวิชาชีพ',
  'เภสัชกร',
  'ผู้อำนวยการศูนย์',
  'ผู้บริหาร',
];

/** สิทธิ์จำลองสำหรับสลับทดสอบสถานะ “สิทธิ์ไม่พอ” ใน UAT */
export const RESTRICTED_MOCK_ROLE = 'เจ้าหน้าที่ธุรการ';

/** วิดเจ็ตที่ผู้ใช้กำหนดเองได้ (ทุกข้อ §1.20.7.x ระบุ "ตามที่ผู้ใช้งานกำหนดได้") */
export const CLINIC_WIDGETS = {
  ncd: [
    { key: 'kpi',        label: 'ตัวชี้วัดสรุป (KPI)' },
    { key: 'control',    label: 'อัตราคุมระดับได้ตามเป้า' },
    { key: 'group',      label: 'สัดส่วนตามกลุ่มโรค' },
    { key: 'complication', label: 'ภาวะแทรกซ้อนที่พบ' },
    { key: 'trend',      label: 'แนวโน้มผู้ป่วยรายใหม่' },
  ],
  mental: [
    { key: 'kpi',      label: 'ตัวชี้วัดสรุป (KPI)' },
    { key: 'screening',label: 'ผลคัดกรอง 2Q / 9Q / 8Q' },
    { key: 'outcome',  label: 'ผลการดูแลต่อเนื่อง' },
    { key: 'trend',    label: 'แนวโน้มผู้รับบริการรายเดือน' },
  ],
  tb: [
    { key: 'kpi',      label: 'ตัวชี้วัดสรุป (KPI)' },
    { key: 'outcome',  label: 'ผลการรักษาวัณโรค' },
    { key: 'screening',label: 'ผลคัดกรองกลุ่มเสี่ยง' },
    { key: 'trend',    label: 'แนวโน้มขึ้นทะเบียนรายเดือน' },
  ],
  addiction: [
    { key: 'kpi',     label: 'ตัวชี้วัดสรุป (KPI)' },
    { key: 'program', label: 'ผลการบำบัดตามโปรแกรม' },
    { key: 'substance', label: 'สารเสพติดที่พบ' },
    { key: 'trend',   label: 'แนวโน้มผู้เข้าบำบัด' },
  ],
  hiv: [
    { key: 'kpi',      label: 'ตัวชี้วัดสรุป (KPI)' },
    { key: 'cascade',  label: 'HIV Care Cascade' },
    { key: 'viral',    label: 'ผล Viral Load' },
    { key: 'trend',    label: 'แนวโน้มผู้รับบริการรายเดือน' },
  ],
  pep: [
    { key: 'kpi',    label: 'ตัวชี้วัดสรุป (KPI)' },
    { key: 'starts', label: 'ผู้เริ่มยา PEP / PrEP' },
    { key: 'retain', label: 'อัตราคงอยู่ในระบบ' },
  ],
  epi: [
    { key: 'kpi',      label: 'ตัวชี้วัดสรุป (KPI)' },
    { key: 'coverage', label: 'ความครอบคลุมวัคซีนรายชนิด' },
    { key: 'ontime',   label: 'ฉีดตรงตามกำหนด' },
    { key: 'trend',    label: 'แนวโน้มการให้บริการ' },
  ],
  rehab: [
    { key: 'kpi',      label: 'ตัวชี้วัดสรุป (KPI)' },
    { key: 'improve',  label: 'ผลการฟื้นฟูสมรรถภาพ' },
    { key: 'cause',    label: 'สาเหตุที่เข้ารับการฟื้นฟู' },
    { key: 'trend',    label: 'แนวโน้มจำนวนครั้งบริการ' },
  ],
  social: [
    { key: 'kpi',    label: 'ตัวชี้วัดสรุป (KPI)' },
    { key: 'type',   label: 'ประเภทการช่วยเหลือ' },
    { key: 'budget', label: 'มูลค่าการช่วยเหลือ' },
  ],
  homevisit: [
    { key: 'kpi',    label: 'ตัวชี้วัดสรุป (KPI)' },
    { key: 'status', label: 'เยี่ยมสำเร็จ / ตามแผน' },
    { key: 'group',  label: 'กลุ่มผู้ป่วยที่เยี่ยม' },
    { key: 'trend',  label: 'แนวโน้มการเยี่ยมรายเดือน' },
  ],
  anc: [
    { key: 'kpi', label: 'ตัวชี้วัดสรุป (KPI)' },
  ],
};

const trend12 = (seed, min, max) => {
  const rng = makeRng(seed);
  const months = [];
  const values = [];
  for (let back = 11; back >= 0; back -= 1) {
    const iso = isoOffsetMonths(back, 1);
    months.push(THAI_MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]);
    values.push(between(rng, min, max));
  }
  return { months, values };
};

/** ชั้นสรุป outcome ต่อคลินิก — ตัวเลขรวมทั้งหมด ไม่มี PII */
export const CLINIC_OUTCOMES = {
  ncd: {
    kpi: [
      { key: 'registered', label: 'ผู้ป่วยในทะเบียน', value: 2418, unit: 'ราย' },
      { key: 'visits',     label: 'มารับบริการเดือนนี้', value: 612, unit: 'ครั้ง' },
      { key: 'controlled', label: 'คุมระดับได้ตามเป้า', value: 61, unit: '%' , tone: 'success' },
      { key: 'lost',       label: 'ขาดนัดเกิน 3 เดือน', value: 143, unit: 'ราย', tone: 'warning' },
    ],
    diseaseGroups: [
      { key: 'dm',    label: 'เบาหวาน',              value: 968 },
      { key: 'ht',    label: 'ความดันโลหิตสูง',      value: 1104 },
      { key: 'dmht',  label: 'เบาหวาน + ความดัน',    value: 246 },
      { key: 'ckd',   label: 'ไตเรื้อรัง',            value: 62 },
      { key: 'copd',  label: 'ปอดอุดกั้นเรื้อรัง',    value: 38 },
    ],
    control: [
      { key: 'dm', label: 'เบาหวาน HbA1c < 7%',       value: 57, target: 60 },
      { key: 'ht', label: 'ความดัน < 140/90 mmHg',     value: 68, target: 70 },
    ],
    complications: [
      { key: 'eye',   label: 'จอประสาทตาผิดปกติ', value: 96 },
      { key: 'foot',  label: 'แผลที่เท้า',          value: 41 },
      { key: 'renal', label: 'ไตเสื่อม ระยะ 3+',     value: 118 },
      { key: 'cvd',   label: 'โรคหัวใจ/หลอดเลือด',  value: 73 },
    ],
    trend: trend12(4411, 38, 92),
    trendLabel: 'ผู้ป่วยรายใหม่ (ราย)',
  },
  mental: {
    kpi: [
      { key: 'screened', label: 'คัดกรองสุขภาพจิต',   value: 1846, unit: 'ราย' },
      { key: 'positive', label: 'ผลคัดกรองผิดปกติ',   value: 312,  unit: 'ราย', tone: 'warning' },
      { key: 'treated',  label: 'เข้าสู่การดูแล',      value: 268,  unit: 'ราย' },
      { key: 'referred', label: 'ส่งต่อจิตแพทย์',      value: 74,   unit: 'ราย' },
    ],
    screening: [
      { key: 'normal',   label: '2Q ปกติ',                       value: 1534 },
      { key: 'q9-mild',  label: '9Q ซึมเศร้าเล็กน้อย',           value: 168 },
      { key: 'q9-mod',   label: '9Q ซึมเศร้าปานกลาง',            value: 96 },
      { key: 'q9-severe',label: '9Q ซึมเศร้ารุนแรง',             value: 34 },
      { key: 'q8',       label: '8Q เสี่ยงฆ่าตัวตาย',             value: 14 },
    ],
    outcome: [
      { key: 'improved', label: 'อาการดีขึ้น',        value: 171 },
      { key: 'stable',   label: 'คงที่',               value: 68 },
      { key: 'worse',    label: 'อาการแย่ลง',         value: 12 },
      { key: 'lost',     label: 'ขาดการติดตาม',      value: 17 },
    ],
    trend: trend12(5522, 96, 210),
    trendLabel: 'ผู้รับบริการ (ราย)',
  },
  tb: {
    kpi: [
      { key: 'registered', label: 'ขึ้นทะเบียนรักษา', value: 138, unit: 'ราย' },
      { key: 'onTreat',    label: 'กำลังรักษา',        value: 61,  unit: 'ราย' },
      { key: 'success',    label: 'อัตรารักษาสำเร็จ',  value: 87,  unit: '%', tone: 'success' },
      { key: 'screened',   label: 'คัดกรองกลุ่มเสี่ยง', value: 942, unit: 'ราย' },
    ],
    outcome: [
      { key: 'cured',      label: 'หายขาด (Cured)',            value: 44 },
      { key: 'completed',  label: 'รักษาครบ (Completed)',      value: 23 },
      { key: 'failed',     label: 'ล้มเหลว (Failed)',           value: 4 },
      { key: 'died',       label: 'เสียชีวิต',                   value: 3 },
      { key: 'lost',       label: 'ขาดยา/ติดตามไม่ได้',        value: 3 },
    ],
    screeningFunnel: [
      { key: 'target',  label: 'กลุ่มเสี่ยงเป้าหมาย',   value: 1180 },
      { key: 'screened',label: 'คัดกรองแล้ว',           value: 942 },
      { key: 'abnormal',label: 'ผลผิดปกติ',             value: 168 },
      { key: 'cxr',     label: 'ส่ง CXR',                value: 151 },
      { key: 'confirm', label: 'ยืนยันเป็นวัณโรค',      value: 29 },
    ],
    trend: trend12(6633, 6, 21),
    trendLabel: 'ขึ้นทะเบียนใหม่ (ราย)',
  },
  addiction: {
    kpi: [
      { key: 'registered', label: 'ผู้เข้าบำบัดในทะเบียน', value: 286, unit: 'ราย' },
      { key: 'active',     label: 'อยู่ระหว่างบำบัด',       value: 118, unit: 'ราย' },
      { key: 'completed',  label: 'ครบโปรแกรม',            value: 132, unit: 'ราย', tone: 'success' },
      { key: 'relapse',    label: 'กลับไปเสพซ้ำ',           value: 36,  unit: 'ราย', tone: 'warning' },
    ],
    programs: [
      { key: 'matrix',   label: 'BMA Matrix Model (4 เดือน)', value: 118, completed: 76 },
      { key: 'methadone',label: 'Methadone Maintenance',      value: 64,  completed: 31 },
      { key: 'brief',    label: 'Brief Intervention',          value: 78,  completed: 61 },
      { key: 'quit',     label: 'คลินิกเลิกบุหรี่',             value: 96,  completed: 44 },
    ],
    substances: [
      { key: 'meth',    label: 'ยาบ้า/เมทแอมเฟตามีน', value: 132 },
      { key: 'alcohol', label: 'สุรา',                  value: 74 },
      { key: 'tobacco', label: 'บุหรี่',                 value: 96 },
      { key: 'cannabis',label: 'กัญชา',                 value: 28 },
      { key: 'opioid',  label: 'ฝิ่น/เฮโรอีน',           value: 19 },
    ],
    trend: trend12(7744, 12, 38),
    trendLabel: 'ผู้เข้าบำบัดรายใหม่ (ราย)',
  },
  hiv: {
    kpi: [
      { key: 'tested',  label: 'ตรวจ HIV',            value: 1268, unit: 'ราย' },
      { key: 'positive',label: 'ผลบวก',                value: 47,   unit: 'ราย', tone: 'warning' },
      { key: 'onArv',   label: 'ได้รับ ARV',           value: 41,   unit: 'ราย' },
      { key: 'suppress',label: 'กดไวรัสสำเร็จ',        value: 92,   unit: '%', tone: 'success' },
    ],
    cascade: [
      { key: 'tested',   label: 'ได้รับการตรวจ',        value: 1268 },
      { key: 'diagnosed',label: 'ทราบผลติดเชื้อ',       value: 47 },
      { key: 'linked',   label: 'เข้าสู่ระบบการดูแล',    value: 45 },
      { key: 'onArv',    label: 'เริ่มยาต้านไวรัส',      value: 41 },
      { key: 'suppress', label: 'กดไวรัสได้',            value: 38 },
    ],
    viral: [
      { key: 'undetect', label: 'ตรวจไม่พบเชื้อ (<50)',  value: 38 },
      { key: 'low',      label: '50–1,000 copies/mL',    value: 2 },
      { key: 'high',     label: '> 1,000 copies/mL',     value: 1 },
    ],
    trend: trend12(8855, 68, 148),
    trendLabel: 'ผู้รับบริการตรวจ (ราย)',
  },
  pep: {
    kpi: [
      { key: 'pepStart',  label: 'เริ่ม PEP',           value: 88,  unit: 'ราย' },
      { key: 'prepStart', label: 'เริ่ม PrEP',          value: 214, unit: 'ราย' },
      { key: 'continue',  label: 'คงอยู่ในระบบ 3 เดือน', value: 76, unit: '%', tone: 'success' },
      { key: 'dropout',   label: 'หยุดยาก่อนกำหนด',     value: 34,  unit: 'ราย', tone: 'warning' },
    ],
    startsTrend: (() => {
      const pep = trend12(9911, 3, 12);
      const prep = trend12(9922, 8, 28);
      return { months: pep.months, pep: pep.values, prep: prep.values };
    })(),
    retention: [
      { key: 'm1', label: 'ครบ 1 เดือน',  value: 91 },
      { key: 'm3', label: 'ครบ 3 เดือน',  value: 76 },
      { key: 'm6', label: 'ครบ 6 เดือน',  value: 62 },
      { key: 'm12',label: 'ครบ 12 เดือน', value: 48 },
    ],
  },
  epi: {
    kpi: [
      { key: 'children', label: 'เด็กในความดูแล',   value: 1642, unit: 'ราย' },
      { key: 'doses',    label: 'ให้วัคซีนเดือนนี้', value: 486,  unit: 'โดส' },
      { key: 'coverage', label: 'ความครอบคลุมรวม',  value: 89,   unit: '%', tone: 'success' },
      { key: 'overdue',  label: 'เกินกำหนดฉีด',     value: 118,  unit: 'ราย', tone: 'warning' },
    ],
    coverage: [
      { key: 'bcg',   label: 'BCG',              value: 99 },
      { key: 'hbv',   label: 'HB แรกเกิด',        value: 98 },
      { key: 'dtp',   label: 'DTP-HB-Hib 3 เข็ม', value: 92 },
      { key: 'opv',   label: 'OPV/IPV',           value: 91 },
      { key: 'mmr',   label: 'MMR เข็มที่ 1',      value: 88 },
      { key: 'je',    label: 'JE',                value: 82 },
      { key: 'hpv',   label: 'HPV (นักเรียน ป.5)', value: 74 },
    ],
    ontime: [
      { key: 'ontime', label: 'ฉีดตรงกำหนด',     value: 1284 },
      { key: 'late',   label: 'ฉีดล่าช้า',         value: 240 },
      { key: 'missed', label: 'ยังไม่ได้ฉีด',      value: 118 },
    ],
    trend: trend12(1212, 320, 560),
    trendLabel: 'โดสที่ให้บริการ',
  },
  rehab: {
    kpi: [
      { key: 'patients', label: 'ผู้รับบริการฟื้นฟู', value: 342, unit: 'ราย' },
      { key: 'sessions', label: 'ครั้งบริการเดือนนี้', value: 728, unit: 'ครั้ง' },
      { key: 'improved', label: 'สมรรถภาพดีขึ้น',    value: 64,  unit: '%', tone: 'success' },
      { key: 'imc',      label: 'อยู่ใน IMC Golden Period', value: 58, unit: 'ราย' },
    ],
    improvement: [
      { key: 'much',  label: 'ดีขึ้นมาก (Barthel +5)', value: 96 },
      { key: 'some',  label: 'ดีขึ้นเล็กน้อย',          value: 123 },
      { key: 'same',  label: 'คงที่',                    value: 88 },
      { key: 'worse', label: 'ถดถอย',                   value: 35 },
    ],
    causes: [
      { key: 'stroke', label: 'โรคหลอดเลือดสมอง',  value: 118 },
      { key: 'ortho',  label: 'กระดูกและข้อ',        value: 96 },
      { key: 'sci',    label: 'บาดเจ็บไขสันหลัง',    value: 24 },
      { key: 'elder',  label: 'ผู้สูงอายุติดเตียง',   value: 76 },
      { key: 'other',  label: 'อื่น ๆ',               value: 28 },
    ],
    trend: trend12(1313, 480, 820),
    trendLabel: 'ครั้งบริการ',
  },
  social: {
    kpi: [
      { key: 'cases',   label: 'เคสที่ให้การช่วยเหลือ', value: 264, unit: 'เคส' },
      { key: 'items',   label: 'จ่ายเวชภัณฑ์/อุปกรณ์',  value: 812, unit: 'รายการ' },
      { key: 'budget',  label: 'มูลค่าช่วยเหลือ',        value: 1284600, unit: 'บาท' },
      { key: 'pending', label: 'คำขอรอพิจารณา',        value: 23,  unit: 'เคส', tone: 'warning' },
    ],
    assistanceTypes: [
      { key: 'supply',  label: 'เวชภัณฑ์/ผ้าอ้อม',       value: 118, baht: 486200 },
      { key: 'device',  label: 'อุปกรณ์ช่วยเดิน/รถเข็น', value: 46,  baht: 392000 },
      { key: 'fund',    label: 'เงินสงเคราะห์',           value: 52,  baht: 312400 },
      { key: 'referral',label: 'ส่งต่อหน่วยงานภายนอก',    value: 34,  baht: 0 },
      { key: 'housing', label: 'ปรับสภาพที่อยู่อาศัย',     value: 14,  baht: 94000 },
    ],
  },
  homevisit: {
    kpi: [
      { key: 'planned', label: 'แผนการเยี่ยมเดือนนี้', value: 386, unit: 'ครั้ง' },
      { key: 'done',    label: 'เยี่ยมสำเร็จ',           value: 331, unit: 'ครั้ง', tone: 'success' },
      { key: 'pending', label: 'ค้างเยี่ยม',              value: 41,  unit: 'ครั้ง', tone: 'warning' },
      { key: 'patients',label: 'ผู้ป่วยในความดูแล',       value: 248, unit: 'ราย' },
    ],
    status: [
      { key: 'done',     label: 'เยี่ยมสำเร็จ',   value: 331 },
      { key: 'pending',  label: 'ค้างเยี่ยม',      value: 41 },
      { key: 'notfound', label: 'ไม่พบผู้ป่วย',    value: 9 },
      { key: 'refused',  label: 'ปฏิเสธการเยี่ยม', value: 5 },
    ],
    groups: [
      { key: 'bedridden', label: 'ผู้ป่วยติดเตียง',       value: 86 },
      { key: 'elder',     label: 'ผู้สูงอายุติดบ้าน',      value: 74 },
      { key: 'palliative',label: 'ผู้ป่วยระยะท้าย',        value: 28 },
      { key: 'disabled',  label: 'ผู้พิการ',                value: 34 },
      { key: 'postpartum',label: 'มารดาหลังคลอด/ทารก',   value: 26 },
    ],
    trend: trend12(1414, 260, 400),
    trendLabel: 'ครั้งที่เยี่ยม',
  },
};

/** ตารางรายละเอียด (aggregate) ต่อคลินิก — ใช้ในป๊อปอัป ดูรายงาน */
export const clinicDetailRows = (clinicKey) => {
  const data = CLINIC_OUTCOMES[clinicKey];
  if (!data) return [];
  const buckets = [];
  const push = (section, rows, valueKey = 'value') => {
    (rows || []).forEach((r, i) => buckets.push({
      id: `${clinicKey}-${section}-${r.key || i}`,
      section,
      label: r.label,
      value: r[valueKey] ?? 0,
      extra: r.baht != null ? `${r.baht.toLocaleString('th-TH')} บาท`
        : r.target != null ? `เป้าหมาย ${r.target}%`
        : r.completed != null ? `ครบโปรแกรม ${r.completed} ราย`
        : '',
    }));
  };
  push('ตัวชี้วัดสรุป', data.kpi);
  push('ผลการดูแล', data.outcome || data.improvement || data.cascade || data.status || data.control);
  push('การจำแนกกลุ่ม', data.diseaseGroups || data.substances || data.causes || data.groups
    || data.assistanceTypes || data.coverage || data.screening || data.screeningFunnel || data.retention);
  if (data.complications) push('ภาวะแทรกซ้อน', data.complications);
  if (data.viral) push('ผลตรวจไวรัส', data.viral);
  if (data.ontime) push('ความตรงเวลา', data.ontime);
  if (data.programs) push('โปรแกรมบำบัด', data.programs);
  return buckets;
};
