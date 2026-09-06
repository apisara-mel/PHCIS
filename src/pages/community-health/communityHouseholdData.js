/* Mock data for the household/member cluster — ported from claude/Community
   community-household.html / household-add.html / household-detail.html /
   member-add.html. Plain data module (no JSX) shared by the four pages.

   Numbers are kept consistent with CommunityDashboardPage's cards/charts
   (1,240 houses; survey status สำรวจแล้ว/กำลังสำรวจ/ยังไม่สำรวจ). */

/** Household survey-status meta — same three labels as the dashboard's
    "จำนวนการสำรวจตามสถานะ" donut, mapped to ColorfulBadge styles. */
export const HOUSEHOLD_STATUS_META = {
  surveyed: { key: 'surveyed', label: 'สำรวจแล้ว', badge: 'teal' },
  inProgress: { key: 'inProgress', label: 'กำลังสำรวจ', badge: 'pink' },
  pending: { key: 'pending', label: 'ยังไม่สำรวจ', badge: 'yellow' },
};

export const HOUSEHOLD_STATUS_TABS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'surveyed', label: 'สำรวจแล้ว' },
  { key: 'inProgress', label: 'กำลังสำรวจ' },
  { key: 'pending', label: 'ยังไม่สำรวจ' },
];

export const COMMUNITY_OPTIONS = [
  'ชุมชนดินแดง', 'ชุมชนห้วยขวาง', 'ชุมชนพญาไท', 'ชุมชนคลองเตย 1-2-3',
  'ชุมชนบางกะปิ', 'ชุมชนประชาสงเคราะห์', 'ชุมชนรัชดา',
];

export const DISTRICT_OPTIONS = [
  'เขตดินแดง', 'เขตห้วยขวาง', 'เขตพญาไท', 'เขตคลองเตย', 'เขตบางกะปิ',
];

export const SUBDISTRICT_OPTIONS = [
  'แขวงดินแดง', 'แขวงห้วยขวาง', 'แขวงสามเสนใน', 'แขวงคลองตัน', 'แขวงคลองจั่น',
];

export const VOLUNTEER_OPTIONS = [
  'อสส.001 นางสมหญิง ใจดี',
  'อสส.002 นายประเสริฐ วงศ์สุข',
  'อสส.003 นางสาวรัตนา ทองดี',
  'อสส.004 นายวิชัย ศรีสุข',
  'อสส.007 นางพิกุล แสงจันทร์',
];

export const RELATION_OPTIONS = [
  'เจ้าบ้าน', 'คู่สมรส', 'บุตร', 'บิดา / มารดา', 'พี่ / น้อง',
  'ปู่ / ย่า / ตา / ยาย', 'หลาน', 'ญาติ', 'ผู้อาศัย',
];

export const PERSON_STATUS_OPTIONS = ['มีชีวิต', 'ย้ายออก', 'เสียชีวิต'];
export const DISABILITY_OPTIONS = ['ไม่มี', 'มีความพิการ'];
export const DISABILITY_TYPE_OPTIONS = [
  'ทางการเห็น', 'ทางการได้ยิน / สื่อความหมาย', 'ทางการเคลื่อนไหว / ร่างกาย',
  'ทางจิตใจ / พฤติกรรม', 'ทางสติปัญญา', 'ทางการเรียนรู้', 'ออทิสติก',
];
export const COVERAGE_OPTIONS = [
  'หลักประกันสุขภาพถ้วนหน้า (บัตรทอง)', 'ประกันสังคม',
  'สวัสดิการข้าราชการ / รัฐวิสาหกิจ', 'ชำระเงินเอง', 'สิทธิอื่นๆ',
];
export const CHRONIC_OPTIONS = [
  'เบาหวาน', 'ความดันโลหิตสูง', 'โรคหัวใจและหลอดเลือด', 'โรคไตเรื้อรัง',
  'หอบหืด / ถุงลมโป่งพอง', 'ไม่มีโรคประจำตัว',
];
export const VULNERABLE_OPTIONS = [
  'ผู้สูงอายุ (60 ปีขึ้นไป)', 'เด็กเล็ก (0 - 5 ปี)', 'หญิงตั้งครรภ์',
  'ผู้ป่วยติดเตียง', 'ผู้พิการ',
];
export const OCCUPATION_OPTIONS = [
  'รับราชการ / รัฐวิสาหกิจ', 'พนักงานบริษัทเอกชน', 'ค้าขาย / ธุรกิจส่วนตัว',
  'รับจ้างทั่วไป', 'เกษตรกร', 'นักเรียน / นักศึกษา', 'ว่างงาน', 'ไม่ระบุ',
];
export const EDUCATION_OPTIONS = [
  'ไม่ได้เรียน', 'ประถมศึกษา', 'มัธยมศึกษา', 'ปวช. / ปวส.', 'ปริญญาตรี', 'สูงกว่าปริญญาตรี',
];

/** Registry list — 10 sample houses spanning the 5 districts the dashboard's
    "จำนวนบ้านตามเขต" chart already breaks out. */
export const HOUSEHOLDS = [
  { id: 'h1', houseNo: '12/45', address: 'ซอยดินแดง 5 ถนนดินแดง แขวงดินแดง เขตดินแดง กรุงเทพมหานคร', community: 'ชุมชนดินแดง', district: 'เขตดินแดง', subdistrict: 'แขวงดินแดง', head: 'นายสมชาย ใจดี', memberCount: 4, status: 'surveyed', coordinates: '13.7651, 100.5525', volunteer: 'นางสมหญิง ใจดี', surveyDate: '10 ส.ค. 2569', surveyor: 'นาง วันดี ทองใจ' },
  { id: 'h2', houseNo: '88/12', address: 'ซอยคลองเตย 3 ถนนสุนทรโกษา แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร', community: 'ชุมชนคลองเตย 1-2-3', district: 'เขตคลองเตย', subdistrict: 'แขวงคลองตัน', head: 'นางมาลี ศรีสุข', memberCount: 6, status: 'inProgress', coordinates: '13.7075, 100.5602', volunteer: 'นายประเสริฐ วงศ์สุข', surveyDate: '2 ส.ค. 2569', surveyor: 'นาง วันดี ทองใจ' },
  { id: 'h3', houseNo: '3/7', address: 'ซอยห้วยขวาง 8 ถนนประชาราษฎร์บำเพ็ญ แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร', community: 'ชุมชนห้วยขวาง', district: 'เขตห้วยขวาง', subdistrict: 'แขวงห้วยขวาง', head: 'นายอนันต์ พูนผล', memberCount: 3, status: 'surveyed', coordinates: '13.7683, 100.5765', volunteer: 'นางสาวรัตนา ทองดี', surveyDate: '15 ก.ค. 2569', surveyor: 'นาง วันดี ทองใจ' },
  { id: 'h4', houseNo: '55/2', address: 'ซอยดินแดง 12 ถนนดินแดง แขวงดินแดง เขตดินแดง กรุงเทพมหานคร', community: 'ชุมชนดินแดง', district: 'เขตดินแดง', subdistrict: 'แขวงดินแดง', head: 'นางสุภาพร แก้วมณี', memberCount: 5, status: 'surveyed', coordinates: '13.7660, 100.5540', volunteer: 'นางสมหญิง ใจดี', surveyDate: '11 ส.ค. 2569', surveyor: 'นาง วันดี ทองใจ' },
  { id: 'h5', houseNo: '120/8', address: 'ซอยพญาไท 4 ถนนพญาไท แขวงสามเสนใน เขตพญาไท กรุงเทพมหานคร', community: 'ชุมชนพญาไท', district: 'เขตพญาไท', subdistrict: 'แขวงสามเสนใน', head: 'นายวิรัตน์ ทองคำ', memberCount: 2, status: 'surveyed', coordinates: '13.7789, 100.5385', volunteer: 'นายวิชัย ศรีสุข', surveyDate: '20 ก.ค. 2569', surveyor: 'นาง วันดี ทองใจ' },
  { id: 'h6', houseNo: '9/141', address: 'ซอยบางกะปิ 7 ถนนลาดพร้าว แขวงคลองจั่น เขตบางกะปิ กรุงเทพมหานคร', community: 'ชุมชนบางกะปิ', district: 'เขตบางกะปิ', subdistrict: 'แขวงคลองจั่น', head: 'นางประนอม สาระบุตร', memberCount: 7, status: 'pending', coordinates: '13.7657, 100.6478', volunteer: 'นางพิกุล แสงจันทร์', surveyDate: '—', surveyor: '—' },
  { id: 'h7', houseNo: '201', address: 'ซอยคลองเตย 15 ถนนพระราม 4 แขวงคลองตัน เขตคลองเตย กรุงเทพมหานคร', community: 'ชุมชนคลองเตย 1-2-3', district: 'เขตคลองเตย', subdistrict: 'แขวงคลองตัน', head: 'นายเกรียงศักดิ์ พงษ์ไพร', memberCount: 4, status: 'surveyed', coordinates: '13.7091, 100.5588', volunteer: 'นายประเสริฐ วงศ์สุข', surveyDate: '5 ส.ค. 2569', surveyor: 'นาง วันดี ทองใจ' },
  { id: 'h8', houseNo: '17/33', address: 'ซอยห้วยขวาง 2 ถนนประชาราษฎร์บำเพ็ญ แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร', community: 'ชุมชนห้วยขวาง', district: 'เขตห้วยขวาง', subdistrict: 'แขวงห้วยขวาง', head: 'นางสาววันเพ็ญ จันทร์ดี', memberCount: 1, status: 'surveyed', coordinates: '13.7699, 100.5772', volunteer: 'นางสาวรัตนา ทองดี', surveyDate: '18 ก.ค. 2569', surveyor: 'นาง วันดี ทองใจ' },
  { id: 'h9', houseNo: '44/9', address: 'ซอยพญาไท 9 ถนนศรีอยุธยา แขวงสามเสนใน เขตพญาไท กรุงเทพมหานคร', community: 'ชุมชนพญาไท', district: 'เขตพญาไท', subdistrict: 'แขวงสามเสนใน', head: 'นางกัลยา รุ่งเรือง', memberCount: 3, status: 'pending', coordinates: '13.7801, 100.5372', volunteer: 'นายวิชัย ศรีสุข', surveyDate: '—', surveyor: '—' },
  { id: 'h10', houseNo: '76/5', address: 'ซอยบางกะปิ 2 ถนนลาดพร้าว แขวงคลองจั่น เขตบางกะปิ กรุงเทพมหานคร', community: 'ชุมชนบางกะปิ', district: 'เขตบางกะปิ', subdistrict: 'แขวงคลองจั่น', head: 'นายบุญเลิศ อยู่เย็น', memberCount: 5, status: 'inProgress', coordinates: '13.7645, 100.6465', volunteer: 'นางพิกุล แสงจันทร์', surveyDate: '28 ก.ค. 2569', surveyor: 'นาง วันดี ทองใจ' },
];

/** Full member rosters for the two households the source prototype shows in
    detail (household-detail.html's 123/45 example maps to h1 here — the
    house number differs because the list page seeds its own sample rows —
    plus h2 for a second, larger household). Every other house falls back to
    `buildFallbackMembers` below so every row in HOUSEHOLDS is still viewable. */
export const HOUSEHOLD_MEMBERS = {
  h1: [
    { id: 'h1-m1', nid: '1-1009-98765-43-1', name: 'นายสมชาย ใจดี', sex: 'ชาย', age: 62, relation: 'เจ้าบ้าน', status: 'มีชีวิต' },
    { id: 'h1-m2', nid: '1-1009-98765-44-9', name: 'นางสมหญิง ใจดี', sex: 'หญิง', age: 58, relation: 'คู่สมรส', status: 'มีชีวิต' },
    { id: 'h1-m3', nid: '1-1009-98765-45-7', name: 'นายภูมิพัฒน์ ใจดี', sex: 'ชาย', age: 28, relation: 'บุตร', status: 'มีชีวิต' },
    { id: 'h1-m4', nid: '1-1009-98765-46-5', name: 'เด็กหญิงพิมพ์ชนก ใจดี', sex: 'หญิง', age: 8, relation: 'หลาน', status: 'มีชีวิต' },
  ],
  h2: [
    { id: 'h2-m1', nid: '1-1099-11111-11-1', name: 'นางมาลี ศรีสุข', sex: 'หญิง', age: 49, relation: 'เจ้าบ้าน', status: 'มีชีวิต' },
    { id: 'h2-m2', nid: '1-1099-22222-22-2', name: 'นายสมพงษ์ ศรีสุข', sex: 'ชาย', age: 52, relation: 'คู่สมรส', status: 'มีชีวิต' },
    { id: 'h2-m3', nid: '1-1099-33333-33-3', name: 'นายพงศกร ศรีสุข', sex: 'ชาย', age: 24, relation: 'บุตร', status: 'มีชีวิต' },
    { id: 'h2-m4', nid: '1-1099-44444-44-4', name: 'นางสาวพิมพ์ลภัส ศรีสุข', sex: 'หญิง', age: 20, relation: 'บุตร', status: 'มีชีวิต' },
    { id: 'h2-m5', nid: '1-1099-55555-55-5', name: 'นายทองใบ ศรีสุข', sex: 'ชาย', age: 79, relation: 'บิดา / มารดา', status: 'มีชีวิต' },
    { id: 'h2-m6', nid: '1-1099-66666-66-6', name: 'นางบัวลอย ศรีสุข', sex: 'หญิง', age: 75, relation: 'บิดา / มารดา', status: 'ย้ายออก' },
  ],
};

/** Households outside HOUSEHOLD_MEMBERS get a small deterministic roster
    built from the list-row's `head` name and `memberCount`, so navigating to
    /community-health/household/:id always shows a usable member table. */
const FALLBACK_RELATIONS = ['คู่สมรส', 'บุตร', 'บุตร', 'ญาติ', 'ผู้อาศัย', 'หลาน'];

const buildFallbackMembers = (house) => {
  const head = {
    id: `${house.id}-m1`,
    nid: '-',
    name: house.head,
    sex: house.head.startsWith('นาง') || house.head.startsWith('นางสาว') ? 'หญิง' : 'ชาย',
    age: '-',
    relation: 'เจ้าบ้าน',
    status: 'มีชีวิต',
  };
  const rest = Array.from({ length: Math.max(0, (house.memberCount || 1) - 1) }, (_, i) => ({
    id: `${house.id}-m${i + 2}`,
    nid: '-',
    name: `สมาชิกคนที่ ${i + 2} (${house.head})`,
    sex: i % 2 === 0 ? 'หญิง' : 'ชาย',
    age: '-',
    relation: FALLBACK_RELATIONS[i % FALLBACK_RELATIONS.length],
    status: 'มีชีวิต',
  }));
  return [head, ...rest];
};

export const getHouseholdById = (id) => HOUSEHOLDS.find((h) => h.id === id);

export const getHouseholdMembers = (id) => {
  const house = getHouseholdById(id);
  if (!house) return [];
  return HOUSEHOLD_MEMBERS[id] || buildFallbackMembers(house);
};
