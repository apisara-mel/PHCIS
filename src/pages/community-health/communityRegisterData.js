/* ข้อมูลทะเบียนชุมชน — mock data ported from claude/Community
   community-register.html (ROWS[]) + community-detail.html (ชุมชนดินแดง
   sample) + community-add.html (ตัวเลือกฟอร์ม). Plain JS only (no JSX) —
   values line up with the totals already shown on CommunityDashboardPage
   (34 ชุมชน / 1,240 บ้าน / 4,186 สมาชิก) so the two pages read as one
   consistent dataset; this file lists a representative page of that set. */

export const DISTRICT_OPTIONS = ['เขตดินแดง', 'เขตห้วยขวาง', 'เขตพญาไท', 'เขตคลองเตย', 'เขตบางกะปิ', 'เขตสวนหลวง'];

export const SUBDISTRICT_OPTIONS = [
  'แขวงดินแดง', 'แขวงรัชดาภิเษก', 'แขวงห้วยขวาง', 'แขวงสามเสนใน',
  'แขวงคลองต้น', 'แขวงคลองเตย', 'แขวงคลองจั่น', 'แขวงสวนหลวง',
];

export const CENTER_OPTIONS = ['ศบส.4 ดินแดง', 'ศบส.9 ประชาธิปไตย', 'ศบส.21 วัดธาตุทอง'];

export const CENTER_FULL_NAME = {
  'ศบส.4 ดินแดง': 'ศูนย์บริการสาธารณสุข 4 ดินแดง',
  'ศบส.9 ประชาธิปไตย': 'ศูนย์บริการสาธารณสุข 9 ประชาธิปไตย',
  'ศบส.21 วัดธาตุทอง': 'ศูนย์บริการสาธารณสุข 21 วัดธาตุทอง',
};

export const RISK_OPTIONS = ['น้ำท่วมซ้ำซาก', 'ไฟไหม้ / อัคคีภัย', 'จุดเสี่ยงอาชญากรรม', 'มลพิษทางอากาศ', 'โรคระบาด'];

export const FACILITY_OPTIONS = ['โรงเรียน', 'วัด / ศาสนสถาน', 'ตลาด', 'สวนสาธารณะ', 'ศูนย์เด็กเล็ก', 'สนามกีฬา'];

export const STATUS_LABEL = { active: 'ใช้งาน', inactive: 'ไม่ใช้งาน' };

/* Registry rows — extracted from community-register.html's ROWS[] (rows
   1-7 are verbatim; the source repeated row 7 three more times as
   placeholder padding, replaced here with 3 distinct communities from the
   "อื่นๆ" district bucket the dashboard donut already accounts for). */
export const COMMUNITY_ROWS = [
  {
    id: 'cm-001', code: 'ชม.001', nameTh: 'ชุมชนดินแดง', nameEn: 'Din Daeng Community',
    district: 'เขตดินแดง', subdistrict: 'แขวงดินแดง', center: 'ศบส.4 ดินแดง',
    houses: 245, members: 892, status: 'active', updatedAt: '26 ส.ค. 2569',
    leaderName: 'ประสงค์ มั่นคง', leaderRole: 'ประธานชุมชน', leaderTel: '081-234-5678',
    postcode: '10400', address: 'ซอยดินแดง 5 ถนนดินแดง แขวงดินแดง เขตดินแดง กรุงเทพมหานคร',
    coords: '13.7649, 100.5522',
    risks: ['น้ำท่วมซ้ำซาก'], facilities: ['โรงเรียน', 'ตลาด'],
    population: { total: 892, male: 430, female: 462, elder: 134, child: 98, disabled: 12, chronic: 76 },
    surveyedHouses: 200, unsurveyedHouses: 45,
    deltaHouses: '+5.2%', deltaMembers: '+12%', deltaSurveyed: '81.6%', deltaUnsurveyed: '18.4%',
  },
  {
    id: 'cm-002', code: 'ชม.002', nameTh: 'ชุมชนประชาสงเคราะห์', nameEn: 'Pracha Songkhro Community',
    district: 'เขตดินแดง', subdistrict: 'แขวงดินแดง', center: 'ศบส.4 ดินแดง',
    houses: 178, members: 654, status: 'active', updatedAt: '20 ส.ค. 2569',
    leaderName: 'สมใจ ใจดี', leaderRole: 'ประธานชุมชน', leaderTel: '081-555-1122',
    postcode: '10400', address: 'ซอยประชาสงเคราะห์ 2 ถนนดินแดง แขวงดินแดง เขตดินแดง กรุงเทพมหานคร',
    coords: '13.7671, 100.5568',
    risks: ['ไฟไหม้ / อัคคีภัย'], facilities: ['ศูนย์เด็กเล็ก'],
    population: { total: 654, male: 310, female: 344, elder: 88, child: 71, disabled: 9, chronic: 52 },
    surveyedHouses: 140, unsurveyedHouses: 38,
    deltaHouses: '+2.1%', deltaMembers: '+4%', deltaSurveyed: '78.7%', deltaUnsurveyed: '21.3%',
  },
  {
    id: 'cm-003', code: 'ชม.003', nameTh: 'ชุมชนห้วยขวาง', nameEn: 'Huai Khwang Community',
    district: 'เขตห้วยขวาง', subdistrict: 'แขวงห้วยขวาง', center: 'ศบส.21 วัดธาตุทอง',
    houses: 312, members: 1120, status: 'active', updatedAt: '18 ส.ค. 2569',
    leaderName: 'หญิงจิต สมหวัง', leaderRole: 'ประธานชุมชน', leaderTel: '089-876-5432',
    postcode: '10310', address: 'ซอยห้วยขวาง 8 ถนนประชาราษฎร์บำเพ็ญ แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร',
    coords: '13.7735, 100.5758',
    risks: ['น้ำท่วมซ้ำซาก', 'โรคระบาด'], facilities: ['ตลาด', 'สนามกีฬา'],
    population: { total: 1120, male: 545, female: 575, elder: 176, child: 122, disabled: 20, chronic: 98 },
    surveyedHouses: 260, unsurveyedHouses: 52,
    deltaHouses: '+6.8%', deltaMembers: '+9%', deltaSurveyed: '83.3%', deltaUnsurveyed: '16.7%',
  },
  {
    id: 'cm-004', code: 'ชม.004', nameTh: 'ชุมชนรัชดา', nameEn: 'Ratchada Community',
    district: 'เขตดินแดง', subdistrict: 'แขวงรัชดาภิเษก', center: 'ศบส.4 ดินแดง',
    houses: 203, members: 745, status: 'active', updatedAt: '15 ส.ค. 2569',
    leaderName: 'กิตติศักดิ์ วงศ์ประเสริฐ', leaderRole: 'รองประธานชุมชน', leaderTel: '086-321-9900',
    postcode: '10400', address: 'ซอยรัชดาภิเษก 7 ถนนรัชดาภิเษก แขวงรัชดาภิเษก เขตดินแดง กรุงเทพมหานคร',
    coords: '13.7802, 100.5691',
    risks: ['มลพิษทางอากาศ'], facilities: ['วัด / ศาสนสถาน'],
    population: { total: 745, male: 360, female: 385, elder: 102, child: 80, disabled: 11, chronic: 60 },
    surveyedHouses: 168, unsurveyedHouses: 35,
    deltaHouses: '+3.4%', deltaMembers: '+6%', deltaSurveyed: '82.8%', deltaUnsurveyed: '17.2%',
  },
  {
    id: 'cm-005', code: 'ชม.005', nameTh: 'ชุมชนคลองต้น', nameEn: 'Khlong Ton Community',
    district: 'เขตคลองเตย', subdistrict: 'แขวงคลองต้น', center: 'ศบส.9 ประชาธิปไตย',
    houses: 156, members: 520, status: 'inactive', updatedAt: '10 ก.ค. 2569',
    leaderName: 'ธนากร เจริญสุข', leaderRole: 'ประธานชุมชน', leaderTel: '084-712-3456',
    postcode: '10110', address: 'ซอยคลองต้น 4 ถนนสุขุมวิท แขวงคลองต้น เขตคลองเตย กรุงเทพมหานคร',
    coords: '13.7189, 100.5822',
    risks: ['จุดเสี่ยงอาชญากรรม'], facilities: ['สวนสาธารณะ'],
    population: { total: 520, male: 250, female: 270, elder: 61, child: 55, disabled: 7, chronic: 40 },
    surveyedHouses: 92, unsurveyedHouses: 64,
    deltaHouses: '-1.2%', deltaMembers: '-2%', deltaSurveyed: '59.0%', deltaUnsurveyed: '41.0%',
  },
  {
    id: 'cm-006', code: 'ชม.006', nameTh: 'ชุมชนสามเสนใน', nameEn: 'Samsen Nai Community',
    district: 'เขตพญาไท', subdistrict: 'แขวงสามเสนใน', center: 'ศบส.9 ประชาธิปไตย',
    houses: 289, members: 967, status: 'active', updatedAt: '30 ก.ค. 2569',
    leaderName: 'วิภาวดี จันทร์แก้ว', leaderRole: 'ประธานชุมชน', leaderTel: '080-234-1188',
    postcode: '10400', address: 'ซอยพหลโยธิน 6 ถนนพหลโยธิน แขวงสามเสนใน เขตพญาไท กรุงเทพมหานคร',
    coords: '13.7841, 100.5423',
    risks: ['น้ำท่วมซ้ำซาก'], facilities: ['โรงเรียน', 'สวนสาธารณะ'],
    population: { total: 967, male: 470, female: 497, elder: 140, child: 105, disabled: 15, chronic: 82 },
    surveyedHouses: 231, unsurveyedHouses: 58,
    deltaHouses: '+4.6%', deltaMembers: '+7%', deltaSurveyed: '79.9%', deltaUnsurveyed: '20.1%',
  },
  {
    id: 'cm-007', code: 'ชม.007', nameTh: 'ชุมชนบางกะปิ', nameEn: 'Bang Kapi Community',
    district: 'เขตบางกะปิ', subdistrict: 'แขวงคลองจั่น', center: 'ศบส.21 วัดธาตุทอง',
    houses: 198, members: 701, status: 'active', updatedAt: '27 ก.ค. 2569',
    leaderName: 'อรุณี พรหมเทพ', leaderRole: 'ประธานชุมชน', leaderTel: '082-901-4477',
    postcode: '10240', address: 'ซอยลาดพร้าว 101 ถนนลาดพร้าว แขวงคลองจั่น เขตบางกะปิ กรุงเทพมหานคร',
    coords: '13.7663, 100.6432',
    risks: ['โรคระบาด'], facilities: ['ตลาด', 'ศูนย์เด็กเล็ก'],
    population: { total: 701, male: 338, female: 363, elder: 96, child: 77, disabled: 10, chronic: 55 },
    surveyedHouses: 151, unsurveyedHouses: 47,
    deltaHouses: '+1.8%', deltaMembers: '+3%', deltaSurveyed: '76.3%', deltaUnsurveyed: '23.7%',
  },
  {
    id: 'cm-008', code: 'ชม.008', nameTh: 'ชุมชนคลองเตยพัฒนา', nameEn: 'Khlong Toei Phatthana Community',
    district: 'เขตคลองเตย', subdistrict: 'แขวงคลองเตย', center: 'ศบส.9 ประชาธิปไตย',
    houses: 167, members: 588, status: 'active', updatedAt: '22 ก.ค. 2569',
    leaderName: 'ปรีชา ทองคำ', leaderRole: 'ประธานชุมชน', leaderTel: '088-345-6621',
    postcode: '10110', address: 'ซอยพระราม 4 ซอย 44 แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร',
    coords: '13.7052, 100.5741',
    risks: ['มลพิษทางอากาศ', 'จุดเสี่ยงอาชญากรรม'], facilities: ['วัด / ศาสนสถาน'],
    population: { total: 588, male: 284, female: 304, elder: 79, child: 62, disabled: 8, chronic: 44 },
    surveyedHouses: 121, unsurveyedHouses: 46,
    deltaHouses: '+2.9%', deltaMembers: '+5%', deltaSurveyed: '72.5%', deltaUnsurveyed: '27.5%',
  },
  {
    id: 'cm-009', code: 'ชม.009', nameTh: 'ชุมชนสวนหลวง', nameEn: 'Suan Luang Community',
    district: 'เขตสวนหลวง', subdistrict: 'แขวงสวนหลวง', center: 'ศบส.21 วัดธาตุทอง',
    houses: 132, members: 410, status: 'active', updatedAt: '18 ก.ค. 2569',
    leaderName: 'นภัสสร ชัยวัฒนา', leaderRole: 'ประธานชุมชน', leaderTel: '090-112-7788',
    postcode: '10250', address: 'ซอยอ่อนนุช 17 ถนนสวนหลวง แขวงสวนหลวง เขตสวนหลวง กรุงเทพมหานคร',
    coords: '13.7291, 100.6503',
    risks: ['น้ำท่วมซ้ำซาก'], facilities: ['สนามกีฬา'],
    population: { total: 410, male: 198, female: 212, elder: 55, child: 40, disabled: 5, chronic: 30 },
    surveyedHouses: 88, unsurveyedHouses: 44,
    deltaHouses: '+0.9%', deltaMembers: '+2%', deltaSurveyed: '66.7%', deltaUnsurveyed: '33.3%',
  },
  {
    id: 'cm-010', code: 'ชม.010', nameTh: 'ชุมชนบางนา', nameEn: 'Bang Na Community',
    district: 'เขตสวนหลวง', subdistrict: 'แขวงสวนหลวง', center: 'ศบส.9 ประชาธิปไตย',
    houses: 120, members: 380, status: 'inactive', updatedAt: '05 ก.ค. 2569',
    leaderName: 'สุภาพร แก้วมณี', leaderRole: 'ประธานชุมชน', leaderTel: '061-778-2200',
    postcode: '10260', address: 'ซอยบางนา-ตราด 25 แขวงสวนหลวง เขตสวนหลวง กรุงเทพมหานคร',
    coords: '13.6675, 100.6088',
    risks: ['ไฟไหม้ / อัคคีภัย'], facilities: ['ตลาด'],
    population: { total: 380, male: 183, female: 197, elder: 47, child: 36, disabled: 4, chronic: 25 },
    surveyedHouses: 58, unsurveyedHouses: 62,
    deltaHouses: '-0.6%', deltaMembers: '-1%', deltaSurveyed: '48.3%', deltaUnsurveyed: '51.7%',
  },
];

export const getCommunityById = (id) => COMMUNITY_ROWS.find((c) => c.id === id);

/* Aggregate totals shown on the registry summary bar — same figures the
   dashboard already established (34 ชุมชน / 1,240 บ้าน / 4,186 สมาชิก);
   the 10 rows above are one filtered page of that citywide set, same
   relationship the source prototype's own list ("แสดง 1-20 จาก 130
   รายการ") has to its visible rows. */
export const REGISTRY_TOTALS = { communities: 34, houses: 1240, members: 4186 };

/* ---- Detail-page sub-tables (บ้านและสมาชิก / การสำรวจ / การประเมิน) ----
   Deterministic small samples per community, generated from name pools so
   every community's detail page shows distinct-looking (but still mock)
   rows without hand-authoring 40+ literal records. */

const RESIDENT_NAMES = [
  'ณัฐพล ศรีสุวรรณ', 'พิมพ์ใจ รัตนโชติ', 'กิตติศักดิ์ วงศ์ประเสริฐ', 'สมชาย สุขสวัสดิ์', 'วิภาวดี จันทร์แก้ว',
  'อรุณี พรหมเทพ', 'ธนากร เจริญสุข', 'สุภาพร แก้วมณี', 'ปรีชา ทองคำ', 'นภัสสร ชัยวัฒนา',
];

const SURVEY_TYPES = ['สำรวจสิ่งแวดล้อม', 'สำรวจลูกน้ำยุงลาย', 'สำรวจชุมชน'];
const SURVEYOR_NAMES = ['สมชาย ใจดี', 'วิภา สุขสันต์', 'ณัฐพล เจริญผล', 'อรุณี แสงทอง', 'กิตติศักดิ์ รุ่งเรือง'];
const ASSESSOR_NAMES = ['สมชาย วงศ์สกุล', 'สุภาพร แก้วมณี', 'ธนากร พิทักษ์ธรรม', 'ปิยะดา จันทร์เพ็ญ', 'วิทยา ศรีสุวรรณ'];
const RATING = ['ดี', 'พอใช้', 'ควรปรับปรุง'];

export const buildHouseholds = (community, count = 5) => Array.from({ length: count }, (_, i) => {
  const surveyed = (i + community.houses) % 3 !== 0;
  return {
    id: `${community.id}-hh-${i + 1}`,
    no: i + 1,
    houseNo: `${12 + i * 7}${i % 2 ? `/${i}` : ''}`,
    address: `${12 + i * 7} ${community.address}`,
    members: `${3 + (i % 4)} คน`,
    responsible: RESIDENT_NAMES[(i + community.houses) % RESIDENT_NAMES.length],
    surveyedAt: surveyed ? community.updatedAt : '—',
    surveyed,
  };
});

export const buildSurveys = (community, count = 5) => Array.from({ length: count }, (_, i) => {
  const done = (i + community.members) % 2 === 0;
  return {
    id: `${community.id}-sv-${i + 1}`,
    no: i + 1,
    date: community.updatedAt,
    type: SURVEY_TYPES[(i + community.houses) % SURVEY_TYPES.length],
    area: i === 0 ? `ทั้ง${community.nameTh}` : `บ้านเลขที่ ${12 + i * 5}`,
    surveyor: SURVEY_TYPES ? SURVEYOR_NAMES[(i + community.members) % SURVEYOR_NAMES.length] : '—',
    summary: done ? `สำรวจครบถ้วน ${community.surveyedHouses - i * 4} หลังคาเรือน` : 'อยู่ระหว่างนัดหมายลงพื้นที่',
    done,
  };
});

export const buildAssessments = (community, count = 5) => Array.from({ length: count }, (_, i) => {
  const pending = (i + community.unsurveyedHouses) % 4 === 0;
  const pick = (seed) => RATING[(seed + community.houses) % RATING.length];
  return {
    id: `${community.id}-as-${i + 1}`,
    houseNo: `${18 + i * 11}${i % 2 ? `/${i}` : ''}`,
    date: community.updatedAt,
    assessor: ASSESSOR_NAMES[(i + community.houses) % ASSESSOR_NAMES.length],
    water: pending ? '-' : pick(i),
    sanitation: pending ? '-' : pick(i + 1),
    waste: pending ? '-' : pick(i + 2),
    environment: pending ? '-' : pick(i + 3),
    result: pending ? 'รอประเมิน' : (pick(i + 3) === 'ควรปรับปรุง' ? 'ควรปรับปรุง' : 'ผ่าน'),
    pending,
  };
});
