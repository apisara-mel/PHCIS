/* ประเมินสภาพแวดล้อมและสุขาภิบาล — mock registry data.
   Ported from claude/Community community-assess.html (`.tbl__row` rows) and
   assess-add.html's checklist field set. Distribution matches the dashboard's
   "จำนวนการประเมินตามผล" donut (CommunityDashboardPage.ASSESSMENTS_BY_RESULT):
   62% ผ่านเกณฑ์ · 24% ต้องปรับปรุง · 14% ยังไม่ได้ประเมิน, over a total of 130
   assessments (source prototype's pager: "แสดง 1-20 จาก 130 รายการ"). */

export const ASSESS_SUMMARY = {
  total: 130,
  pass: 81,     // 62%
  improve: 31,  // 24%
  pending: 18,  // 14%
};

/** ผลการประเมิน → สี ColorfulBadge (matches PHCIS_CHART donut order: teal/pink/yellow). */
export const RESULT_TONE = {
  ผ่านเกณฑ์: 'teal',
  ต้องปรับปรุง: 'pink',
  ยังไม่ได้ประเมิน: 'yellow',
};

/** สถานะ (เอกสาร) → สี ColorfulBadge. */
export const STATUS_TONE = {
  เสร็จสิ้น: 'green',
  ฉบับร่าง: 'grey',
  รอดำเนินการ: 'yellow',
};

export const ASSESS_RESULT_OPTIONS = ['ผ่านเกณฑ์', 'ต้องปรับปรุง'];

export const ASSESS_STATUS_TABS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'ผ่านเกณฑ์', label: 'ผ่านเกณฑ์' },
  { key: 'ต้องปรับปรุง', label: 'ต้องปรับปรุง' },
  { key: 'ยังไม่ได้ประเมิน', label: 'ยังไม่ได้ประเมิน' },
];

/** Registry rows — เลขที่ประเมิน / ชื่อชุมชน / วันที่ / ผู้ประเมิน / ผล / สถานะ
    (columns per source `.tbl__hc c-as-*`). */
/** Cascading เขต → แขวง → ชุมชน picker for AssessAddPage's "เลือกพื้นที่ประเมิน"
    section (source: assess-add.html `#fld-district` / `#fld-subdistrict` /
    `#fld-community`, populated by JS from a district→subdistrict→community
    tree). Each community carries the read-only fields the source reveals
    once selected (`#fld-area`, `#fld-geo`, `#pop-*`). */
export const DISTRICT_OPTIONS = ['เขตดินแดง', 'เขตห้วยขวาง', 'เขตคลองเตย'];

export const SUBDISTRICT_BY_DISTRICT = {
  เขตดินแดง: ['แขวงดินแดง', 'แขวงรัชดาภิเษก'],
  เขตห้วยขวาง: ['แขวงห้วยขวาง', 'แขวงบางกะปิ'],
  เขตคลองเตย: ['แขวงคลองเตย', 'แขวงคลองตัน'],
};

export const COMMUNITY_BY_SUBDISTRICT = {
  แขวงดินแดง: ['ชุมชนดินแดง'],
  แขวงรัชดาภิเษก: ['ชุมชนรัชดา'],
  แขวงห้วยขวาง: ['ชุมชนห้วยขวาง'],
  แขวงบางกะปิ: ['ชุมชนประชาสงเคราะห์'],
  แขวงคลองเตย: ['ชุมชนคลองต้น'],
  แขวงคลองตัน: ['ชุมชนคลองตัน'],
};

export const COMMUNITY_META = {
  ชุมชนดินแดง: {
    area: 'เขตดินแดง แขวงดินแดง', geo: '13.76490, 100.55220',
    popTotal: '1,240 คน', popHh: '312 ครัวเรือน', popElder: '186 คน', popChild: '98 คน', popBed: '4 คน',
  },
  ชุมชนรัชดา: {
    area: 'เขตดินแดง แขวงรัชดาภิเษก', geo: '13.77680, 100.56850',
    popTotal: '860 คน', popHh: '210 ครัวเรือน', popElder: '120 คน', popChild: '64 คน', popBed: '2 คน',
  },
  ชุมชนห้วยขวาง: {
    area: 'เขตห้วยขวาง แขวงห้วยขวาง', geo: '13.77620, 100.57400',
    popTotal: '990 คน', popHh: '256 ครัวเรือน', popElder: '142 คน', popChild: '71 คน', popBed: '3 คน',
  },
  ชุมชนประชาสงเคราะห์: {
    area: 'เขตห้วยขวาง แขวงบางกะปิ', geo: '13.76840, 100.58120',
    popTotal: '1,060 คน', popHh: '268 ครัวเรือน', popElder: '150 คน', popChild: '77 คน', popBed: '3 คน',
  },
  ชุมชนคลองต้น: {
    area: 'เขตคลองเตย แขวงคลองเตย', geo: '13.71980, 100.58330',
    popTotal: '740 คน', popHh: '188 ครัวเรือน', popElder: '96 คน', popChild: '52 คน', popBed: '1 คน',
  },
  ชุมชนคลองตัน: {
    area: 'เขตคลองเตย แขวงคลองตัน', geo: '13.72410, 100.59260',
    popTotal: '680 คน', popHh: '174 ครัวเรือน', popElder: '88 คน', popChild: '47 คน', popBed: '2 คน',
  },
};

export const INFO_TYPE_OPTIONS = ['สำรวจภาคสนาม', 'แจ้งจากประชาชน', 'ข้อมูลจาก อสส.', 'หน่วยงานอื่นส่งต่อ'];
export const PIN_STATUS_OPTIONS = ['ปักหมุดแล้ว', 'ยังไม่ปักหมุด', 'ตำแหน่งไม่ชัดเจน'];
export const RESIDENCE_TYPE_OPTIONS = ['บ้านเดี่ยว', 'ห้องแถว / ตึกแถว', 'แฟลต / อาคารชุด', 'ชุมชนแออัด', 'บ้านพักอาศัยรวม'];
export const SURVEY_CONDITION_OPTIONS = ['สำรวจได้ครบถ้วน', 'สำรวจได้บางส่วน', 'ไม่พบผู้ให้ข้อมูล'];
export const INFORMANT_OPTIONS = ['ประธานชุมชน', 'กรรมการชุมชน', 'อสส. ประจำชุมชน', 'ประชาชนในพื้นที่'];

/** สุขาภิบาลในชุมชนและสิ่งแวดล้อม — 13 เกณฑ์ประเมิน (source `.fgrid--3` selects,
    each `-- เลือก --` / ดี / พอใช้ / ควรปรับปรุง). Rendered as RadioGroup rows
    so the checklist reads as a scored form, per CLAUDE.md checkbox/radio rule. */
export const SANITATION_CRITERIA = [
  { key: 'airflow', label: 'อากาศถ่ายเท' },
  { key: 'cleanliness', label: 'ความสะอาด' },
  { key: 'lighting', label: 'แสงสว่างเพียงพอ' },
  { key: 'noise', label: 'เสียงดังรบกวน' },
  { key: 'waterUse', label: 'น้ำใช้' },
  { key: 'waterDrink', label: 'น้ำดื่ม' },
  { key: 'flooding', label: 'น้ำท่วมขังบริเวณชุมชน' },
  { key: 'foodSani', label: 'สุขาภิบาลอาหาร' },
  { key: 'toilet', label: 'สุขา' },
  { key: 'wasteMgmt', label: 'การจัดการขยะมูลฝอย' },
  { key: 'elderEnv', label: 'สภาพแวดล้อมภายในชุมชนเอื้อต่อสุขภาพผู้สูงอายุ' },
  { key: 'vermin', label: 'สัตว์นำโรคและสัตว์ที่เป็นอันตราย' },
  { key: 'pets', label: 'สัตว์เลี้ยงในชุมชน' },
];

export const SANITATION_LEVELS = [
  { value: 'ดี', label: 'ดี' },
  { value: 'พอใช้', label: 'พอใช้' },
  { value: 'ควรปรับปรุง', label: 'ควรปรับปรุง' },
];

export const RISK_ISSUE_OPTIONS = [
  { value: 'แหล่งน้ำขังเสี่ยงยุงลาย', label: 'แหล่งน้ำขังเสี่ยงยุงลาย' },
  { value: 'การจัดการขยะไม่เหมาะสม', label: 'การจัดการขยะไม่เหมาะสม' },
  { value: 'โครงสร้างบ้านไม่มั่นคง / ชำรุด', label: 'โครงสร้างบ้านไม่มั่นคง / ชำรุด' },
  { value: 'สัตว์พาหะนำโรค (หนู แมลงสาบ)', label: 'สัตว์พาหะนำโรค (หนู แมลงสาบ)' },
  { value: 'อื่นๆ (ระบุในหมายเหตุ)', label: 'อื่นๆ (ระบุในหมายเหตุ)' },
];

export const ANIMAL_ROWS = [
  { key: 'dog', label: 'สุนัข' },
  { key: 'cat', label: 'แมว' },
  { key: 'other', label: 'สัตว์อื่นๆ ระบุ' },
];

export const ASSESS_ROWS = [
  { id: 1, code: 'ปม.001-2569', community: 'ชุมชนดินแดง', date: '10 ส.ค. 2569', assessor: 'นางสมหญิง ใจดี', result: 'ผ่านเกณฑ์', status: 'เสร็จสิ้น' },
  { id: 2, code: 'ปม.002-2569', community: 'ชุมชนประชาสงเคราะห์', date: '10 ส.ค. 2569', assessor: 'นางสมหญิง ใจดี', result: 'ผ่านเกณฑ์', status: 'เสร็จสิ้น' },
  { id: 3, code: 'ปม.003-2569', community: 'ชุมชนดินแดง', date: '9 ส.ค. 2569', assessor: 'นายสมชาย รักชาติ', result: 'ผ่านเกณฑ์', status: 'เสร็จสิ้น' },
  { id: 4, code: 'ปม.004-2569', community: 'ชุมชนรัชดา', date: '9 ส.ค. 2569', assessor: 'นางสาวพิมพ์ใจ แสนดี', result: 'ต้องปรับปรุง', status: 'เสร็จสิ้น' },
  { id: 5, code: 'ปม.005-2569', community: 'ชุมชนคลองต้น', date: '8 ส.ค. 2569', assessor: 'นางสมหญิง ใจดี', result: 'ต้องปรับปรุง', status: 'ฉบับร่าง' },
  { id: 6, code: 'ปม.006-2569', community: 'ชุมชนห้วยขวาง', date: '8 ส.ค. 2569', assessor: 'นายสมชาย รักชาติ', result: 'ผ่านเกณฑ์', status: 'เสร็จสิ้น' },
  { id: 7, code: 'ปม.007-2569', community: 'ชุมชนประชาสงเคราะห์', date: '7 ส.ค. 2569', assessor: 'นางสาวพิมพ์ใจ แสนดี', result: 'ผ่านเกณฑ์', status: 'เสร็จสิ้น' },
  { id: 8, code: 'ปม.008-2569', community: 'ชุมชนดินแดง', date: '-', assessor: 'นางสมหญิง ใจดี', result: 'ยังไม่ได้ประเมิน', status: 'รอดำเนินการ' },
  { id: 9, code: 'ปม.009-2569', community: 'ชุมชนห้วยขวาง', date: '6 ส.ค. 2569', assessor: 'นายสมชาย รักชาติ', result: 'ต้องปรับปรุง', status: 'เสร็จสิ้น' },
  { id: 10, code: 'ปม.010-2569', community: 'ชุมชนรัชดา', date: '6 ส.ค. 2569', assessor: 'นางสาวพิมพ์ใจ แสนดี', result: 'ผ่านเกณฑ์', status: 'เสร็จสิ้น' },
];
