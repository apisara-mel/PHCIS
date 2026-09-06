/* อาสาสมัครชุมชน (อสส.) — mock registry data ported from claude/Community's
   community-volunteer.html / volunteer-add.html / volunteer-detail.html.
   Plain JS (no JSX) per CLAUDE.md community-health task scope.

   Districts match the dashboard's "จำนวนบ้านตามเขต" chart
   (CommunityDashboardPage.jsx → HOUSES_BY_DISTRICT): ดินแดง / ห้วยขวาง /
   พญาไท / คลองเตย / บางกะปิ. The dashboard's "จำนวน อสส." summary card shows
   214 — these 10 rows are a realistic sample page of that registry, not the
   full list (same convention as SchedulePage's sample staff roster). */

export const VOLUNTEER_STATUS_META = {
  active:   { label: 'ปฏิบัติงาน', tone: 'green' },
  inactive: { label: 'พ้นสภาพ',   tone: 'red' },
};

export const VOLUNTEER_STATUS_TABS = [
  { key: 'all',      label: 'ทั้งหมด' },
  { key: 'active',   label: 'ปฏิบัติงาน' },
  { key: 'inactive', label: 'พ้นสภาพ' },
];

export const VOLUNTEER_DISTRICTS = ['ดินแดง', 'ห้วยขวาง', 'พญาไท', 'คลองเตย', 'บางกะปิ'];

export const VOLUNTEER_CENTERS = [
  'ศูนย์บริการสาธารณสุข 4 ดินแดง',
  'ศูนย์บริการสาธารณสุข 21 ห้วยขวาง',
  'ศูนย์บริการสาธารณสุข 29 พญาไท',
  'ศูนย์บริการสาธารณสุข 41 คลองเตย',
  'ศูนย์บริการสาธารณสุข 15 บางกะปิ',
];

export const VOLUNTEER_COMMUNITIES = [
  'ชุมชนดินแดง', 'ชุมชนประชาสงเคราะห์',
  'ชุมชนห้วยขวาง', 'ชุมชนโชคชัย 4',
  'ชุมชนสามเสนใน', 'ชุมชนอินทามระ',
  'ชุมชนคลองเตย', 'ชุมชนพัฒนาใหม่',
  'ชุมชนบางกะปิ', 'ชุมชนลาดพร้าว',
];

export const VOLUNTEER_TYPES = ['อสส.ทั่วไป', 'อสส.เชี่ยวชาญเฉพาะด้าน', 'อสส.ประจำชุมชน'];

/* แต่ละแถวมี houseList (บ้านที่รับผิดชอบ) และ workHistory (ประวัติการ
   ปฏิบัติงาน) สำหรับหน้ารายละเอียด — ปริมาณย่อจากต้นแบบ (130 หลัง) ให้พอ
   สาธิต UI ตาราง/ประวัติโดยไม่ทำให้ mock data ใหญ่เกินจำเป็น. */
export const VOLUNTEERS = [
  {
    id: '001', code: 'อสส.001', name: 'สมใจ ใจดี', sex: 'หญิง', age: 36,
    cid: '1369900526072', phone: '098-450-9912', email: '',
    addr: '124/64 พงษ์เวชอนุสรณ์ 2 สุขุมวิท บางจาก พระโขนง กรุงเทพมหานคร 10260',
    center: 'ศูนย์บริการสาธารณสุข 4 ดินแดง', district: 'ดินแดง', community: 'ชุมชนดินแดง',
    coverage: 'เขตดินแดง แขวงดินแดง', houses: 45, type: 'อสส.ทั่วไป',
    startDate: '2021-03-10', status: 'active',
    houseList: [
      { no: '123/45', community: 'ชุมชนดินแดง', head: 'นายสมชาย ใจดี', members: 4, surveyedAt: '10 ส.ค. 2569' },
      { no: '88/12', community: 'ชุมชนดินแดง', head: 'นางสุภาพร แก้วมณี', members: 5, surveyedAt: '05 ส.ค. 2569' },
      { no: '45/7', community: 'ชุมชนดินแดง', head: 'นายบุญเลิศ อยู่เย็น', members: 3, surveyedAt: '28 ก.ค. 2569' },
    ],
    workHistory: [
      { date: '10 ส.ค. 2569', activity: 'สำรวจบ้าน', detail: 'บ้านเลขที่ 123/45 ชุมชนดินแดง (สร.001-2569)' },
      { date: '05 ส.ค. 2569', activity: 'ประเมินสภาพแวดล้อมและสุขาภิบาล', detail: 'บ้านเลขที่ 123/45 ชุมชนดินแดง (ปม.001-2569)' },
      { date: '28 ก.ค. 2569', activity: 'เยี่ยมบ้าน', detail: 'บ้านเลขที่ 45/7 ชุมชนดินแดง' },
    ],
  },
  {
    id: '002', code: 'อสส.002', name: 'ประเสริฐ วงศ์สุข', sex: 'ชาย', age: 44,
    cid: '1102300458821', phone: '081-223-7745', email: 'prasert.w@example.com',
    addr: '56 ซอยประชาสงเคราะห์ 12 ดินแดง กรุงเทพมหานคร 10400',
    center: 'ศูนย์บริการสาธารณสุข 4 ดินแดง', district: 'ดินแดง', community: 'ชุมชนประชาสงเคราะห์',
    coverage: 'เขตดินแดง แขวงดินแดง', houses: 38, type: 'อสส.ประจำชุมชน',
    startDate: '2019-06-01', status: 'active',
    houseList: [
      { no: '12/9', community: 'ชุมชนประชาสงเคราะห์', head: 'นายประวิทย์ บุญมาก', members: 3, surveyedAt: '02 ส.ค. 2569' },
      { no: '30/2', community: 'ชุมชนประชาสงเคราะห์', head: 'นางลำใย ศรีทอง', members: 4, surveyedAt: '30 ก.ค. 2569' },
    ],
    workHistory: [
      { date: '02 ส.ค. 2569', activity: 'สำรวจบ้าน', detail: 'บ้านเลขที่ 12/9 ชุมชนประชาสงเคราะห์' },
      { date: '15 ก.ค. 2569', activity: 'อบรม/ให้ความรู้', detail: 'อบรมการคัดกรองความดันโลหิตประจำชุมชน' },
    ],
  },
  {
    id: '003', code: 'อสส.003', name: 'หญิงจิต สมหวัง', sex: 'หญิง', age: 41,
    cid: '1100501229384', phone: '089-664-2231', email: '',
    addr: '210 ถนนประชาราษฎร์บำเพ็ญ ห้วยขวาง กรุงเทพมหานคร 10310',
    center: 'ศูนย์บริการสาธารณสุข 21 ห้วยขวาง', district: 'ห้วยขวาง', community: 'ชุมชนห้วยขวาง',
    coverage: 'เขตห้วยขวาง แขวงห้วยขวาง', houses: 52, type: 'อสส.เชี่ยวชาญเฉพาะด้าน',
    startDate: '2017-11-20', status: 'active',
    houseList: [
      { no: '9/1', community: 'ชุมชนห้วยขวาง', head: 'นายวีระ เข็มทอง', members: 5, surveyedAt: '08 ส.ค. 2569' },
      { no: '17/3', community: 'ชุมชนห้วยขวาง', head: 'นางอำไพ ศรีวิไล', members: 2, surveyedAt: '01 ส.ค. 2569' },
      { no: '22/8', community: 'ชุมชนห้วยขวาง', head: 'นายสุริยา แสงทอง', members: 6, surveyedAt: '25 ก.ค. 2569' },
    ],
    workHistory: [
      { date: '08 ส.ค. 2569', activity: 'สำรวจบ้าน', detail: 'บ้านเลขที่ 9/1 ชุมชนห้วยขวาง' },
      { date: '20 ก.ค. 2569', activity: 'เยี่ยมบ้านผู้ป่วยติดเตียง', detail: 'บ้านเลขที่ 17/3 ชุมชนห้วยขวาง' },
    ],
  },
  {
    id: '004', code: 'อสส.004', name: 'วิชัย ศรีสุข', sex: 'ชาย', age: 39,
    cid: '1103700985612', phone: '086-115-9902', email: '',
    addr: '88 ซอยโชคชัย 4/17 ห้วยขวาง กรุงเทพมหานคร 10310',
    center: 'ศูนย์บริการสาธารณสุข 21 ห้วยขวาง', district: 'ห้วยขวาง', community: 'ชุมชนโชคชัย 4',
    coverage: 'เขตห้วยขวาง แขวงลาดพร้าว', houses: 41, type: 'อสส.ทั่วไป',
    startDate: '2022-02-14', status: 'active',
    houseList: [
      { no: '15/20', community: 'ชุมชนโชคชัย 4', head: 'นางสมพร ทองใบ', members: 4, surveyedAt: '18 ก.ค. 2569' },
    ],
    workHistory: [
      { date: '18 ก.ค. 2569', activity: 'สำรวจบ้าน', detail: 'บ้านเลขที่ 15/20 ชุมชนโชคชัย 4' },
    ],
  },
  {
    id: '005', code: 'อสส.005', name: 'มาลี พูลสวัสดิ์', sex: 'หญิง', age: 55,
    cid: '1104900332218', phone: '062-778-4410', email: '',
    addr: '5 ซอยสามเสนใน 8 พญาไท กรุงเทพมหานคร 10400',
    center: 'ศูนย์บริการสาธารณสุข 29 พญาไท', district: 'พญาไท', community: 'ชุมชนสามเสนใน',
    coverage: 'เขตพญาไท แขวงสามเสนใน', houses: 33, type: 'อสส.ทั่วไป',
    startDate: '2015-05-05', status: 'inactive',
    houseList: [
      { no: '3/11', community: 'ชุมชนสามเสนใน', head: 'นายไพโรจน์ ดวงแก้ว', members: 3, surveyedAt: '12 มิ.ย. 2569' },
    ],
    workHistory: [
      { date: '12 มิ.ย. 2569', activity: 'สำรวจบ้าน', detail: 'บ้านเลขที่ 3/11 ชุมชนสามเสนใน' },
      { date: '01 มี.ค. 2569', activity: 'พ้นสภาพ', detail: 'ลาออกจากการเป็นอาสาสมัครชุมชน' },
    ],
  },
  {
    id: '006', code: 'อสส.006', name: 'สมชาย รุ่งเรือง', sex: 'ชาย', age: 48,
    cid: '1105601774903', phone: '095-330-6621', email: 'somchai.r@example.com',
    addr: '77 ถนนอินทามระ พญาไท กรุงเทพมหานคร 10400',
    center: 'ศูนย์บริการสาธารณสุข 29 พญาไท', district: 'พญาไท', community: 'ชุมชนอินทามระ',
    coverage: 'เขตพญาไท แขวงสามเสนใน', houses: 47, type: 'อสส.ประจำชุมชน',
    startDate: '2018-09-09', status: 'active',
    houseList: [
      { no: '61/4', community: 'ชุมชนอินทามระ', head: 'นางจิราพร เพชรดี', members: 5, surveyedAt: '22 ก.ค. 2569' },
      { no: '61/9', community: 'ชุมชนอินทามระ', head: 'นายอนุชา ทับทิม', members: 2, surveyedAt: '20 ก.ค. 2569' },
    ],
    workHistory: [
      { date: '22 ก.ค. 2569', activity: 'สำรวจบ้าน', detail: 'บ้านเลขที่ 61/4 ชุมชนอินทามระ' },
    ],
  },
  {
    id: '007', code: 'อสส.007', name: 'พิกุล แสงจันทร์', sex: 'หญิง', age: 33,
    cid: '1106200119957', phone: '087-902-1183', email: '',
    addr: '19 ซอยสุขุมวิท 42 คลองเตย กรุงเทพมหานคร 10110',
    center: 'ศูนย์บริการสาธารณสุข 41 คลองเตย', district: 'คลองเตย', community: 'ชุมชนคลองเตย',
    coverage: 'เขตคลองเตย แขวงคลองเตย', houses: 29, type: 'อสส.ทั่วไป',
    startDate: '2023-01-16', status: 'active',
    houseList: [
      { no: '4/2', community: 'ชุมชนคลองเตย', head: 'นายสมบูรณ์ ทรัพย์มาก', members: 6, surveyedAt: '14 ก.ค. 2569' },
    ],
    workHistory: [
      { date: '14 ก.ค. 2569', activity: 'สำรวจบ้าน', detail: 'บ้านเลขที่ 4/2 ชุมชนคลองเตย' },
    ],
  },
  {
    id: '008', code: 'อสส.008', name: 'เทวินทร์ ชูเกียรติ', sex: 'ชาย', age: 46,
    cid: '1107800662140', phone: '083-541-7729', email: '',
    addr: '3 ซอยพัฒนาใหม่ 6 คลองเตย กรุงเทพมหานคร 10110',
    center: 'ศูนย์บริการสาธารณสุข 41 คลองเตย', district: 'คลองเตย', community: 'ชุมชนพัฒนาใหม่',
    coverage: 'เขตคลองเตย แขวงคลองตัน', houses: 50, type: 'อสส.เชี่ยวชาญเฉพาะด้าน',
    startDate: '2016-08-22', status: 'active',
    houseList: [
      { no: '77/1', community: 'ชุมชนพัฒนาใหม่', head: 'นางประไพ ยิ้มแย้ม', members: 4, surveyedAt: '19 ก.ค. 2569' },
      { no: '77/6', community: 'ชุมชนพัฒนาใหม่', head: 'นายถาวร มั่งมี', members: 3, surveyedAt: '17 ก.ค. 2569' },
    ],
    workHistory: [
      { date: '19 ก.ค. 2569', activity: 'เยี่ยมบ้าน', detail: 'บ้านเลขที่ 77/1 ชุมชนพัฒนาใหม่' },
    ],
  },
  {
    id: '009', code: 'อสส.009', name: 'จินตนา เพ็ชรน้อย', sex: 'หญิง', age: 51,
    cid: '1108300447726', phone: '090-215-8834', email: '',
    addr: '150 ถนนลาดพร้าว บางกะปิ กรุงเทพมหานคร 10240',
    center: 'ศูนย์บริการสาธารณสุข 15 บางกะปิ', district: 'บางกะปิ', community: 'ชุมชนบางกะปิ',
    coverage: 'เขตบางกะปิ แขวงคลองจั่น', houses: 36, type: 'อสส.ทั่วไป',
    startDate: '2014-04-04', status: 'inactive',
    houseList: [
      { no: '5/33', community: 'ชุมชนบางกะปิ', head: 'นายอุดม ทวีทรัพย์', members: 4, surveyedAt: '03 มิ.ย. 2569' },
    ],
    workHistory: [
      { date: '03 มิ.ย. 2569', activity: 'สำรวจบ้าน', detail: 'บ้านเลขที่ 5/33 ชุมชนบางกะปิ' },
      { date: '01 เม.ย. 2569', activity: 'พ้นสภาพ', detail: 'ย้ายภูมิลำเนา' },
    ],
  },
  {
    id: '010', code: 'อสส.010', name: 'อำนาจ บุญมี', sex: 'ชาย', age: 42,
    cid: '1109900776312', phone: '084-663-2298', email: '',
    addr: '99 ซอยลาดพร้าว 101 บางกะปิ กรุงเทพมหานคร 10240',
    center: 'ศูนย์บริการสาธารณสุข 15 บางกะปิ', district: 'บางกะปิ', community: 'ชุมชนลาดพร้าว',
    coverage: 'เขตบางกะปิ แขวงคลองจั่น', houses: 44, type: 'อสส.ประจำชุมชน',
    startDate: '2020-10-10', status: 'active',
    houseList: [
      { no: '101/5', community: 'ชุมชนลาดพร้าว', head: 'นางกาญจนา ศรีสมบัติ', members: 5, surveyedAt: '11 ก.ค. 2569' },
      { no: '101/9', community: 'ชุมชนลาดพร้าว', head: 'นายเฉลิม ผลบุญ', members: 3, surveyedAt: '09 ก.ค. 2569' },
    ],
    workHistory: [
      { date: '11 ก.ค. 2569', activity: 'สำรวจบ้าน', detail: 'บ้านเลขที่ 101/5 ชุมชนลาดพร้าว' },
    ],
  },
];

export const findVolunteerById = (id) => VOLUNTEERS.find((v) => v.id === id || v.code === id);

/* รหัส อสส. ตัวถัดไปสำหรับหน้าเพิ่ม — ระบบสร้างอัตโนมัติ (readonly) ตาม
   volunteer-add.html ("อสส.011" ต่อจาก 10 แถวตัวอย่าง). */
export const nextVolunteerCode = () => {
  const n = VOLUNTEERS.length + 1;
  return `อสส.${String(n).padStart(3, '0')}`;
};
