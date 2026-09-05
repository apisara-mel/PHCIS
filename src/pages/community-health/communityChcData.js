/* ข้อมูลตัวอย่างศูนย์สุขภาพชุมชน (ศบส.) — ported from claude/Community
   community-chc.html / chc-add.html / chc-detail.html.

   The dashboard (CommunityDashboardPage) reports "ศูนย์สุขภาพชุมชน: 6" so
   this mock registry ships exactly 6 rows, reusing the same district set
   as the dashboard's "จำนวนบ้านตามเขต" chart (ดินแดง/ห้วยขวาง/พญาไท/
   คลองเตย/บางกะปิ) — ดินแดง carries two centers since it also carries the
   largest house count (630) in that chart. Plain JS export, no JSX. */

/** สถานะศูนย์สุขภาพชุมชน — tone maps straight onto <ColorfulBadge style>. */
export const CHC_STATUS_META = {
  open: { label: 'เปิดให้บริการ', tone: 'green' },
  renovate: { label: 'ปิดปรับปรุง', tone: 'orange' },
  closed: { label: 'ปิดถาวร', tone: 'grey' },
};

export const CHC_STATUS_TABS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'open', label: CHC_STATUS_META.open.label },
  { key: 'renovate', label: CHC_STATUS_META.renovate.label },
  { key: 'closed', label: CHC_STATUS_META.closed.label },
];

/** เขต → แขวง — ใช้ทั้งในฟอร์มเพิ่มศูนย์ (cascade) และเป็นตัวเลือกชุมชน */
export const DISTRICT_SUBDISTRICTS = {
  เขตดินแดง: ['แขวงดินแดง', 'แขวงรัชดาภิเษก'],
  เขตห้วยขวาง: ['แขวงห้วยขวาง', 'แขวงสามเสนนอก'],
  เขตพญาไท: ['แขวงพญาไท', 'แขวงสามเสนใน'],
  เขตคลองเตย: ['แขวงคลองเตย', 'แขวงคลองตัน', 'แขวงพระโขนง'],
  เขตบางกะปิ: ['แขวงคลองจั่น', 'แขวงหัวหมาก'],
};

export const DISTRICT_OPTIONS = Object.keys(DISTRICT_SUBDISTRICTS).map((d) => ({ value: d, label: d }));

export const subdistrictOptionsFor = (district) =>
  (DISTRICT_SUBDISTRICTS[district] || []).map((s) => ({ value: s, label: s }));

/** ชุมชนที่มีอยู่ในแต่ละแขวง — ใช้ในขั้นตอน "ชุมชนที่รับผิดชอบ" ของฟอร์มเพิ่มศูนย์ */
export const SUBDISTRICT_COMMUNITIES = {
  แขวงดินแดง: ['ชุมชนดินแดง', 'ชุมชนประชาสงเคราะห์'],
  แขวงรัชดาภิเษก: ['ชุมชนรัชดา'],
  แขวงห้วยขวาง: ['ชุมชนห้วยขวาง'],
  แขวงสามเสนนอก: ['ชุมชนสามเสนนอก'],
  แขวงพญาไท: ['ชุมชนพญาไท'],
  แขวงสามเสนใน: ['ชุมชนสามเสนใน'],
  แขวงคลองเตย: ['ชุมชนคลองเตย'],
  แขวงคลองตัน: ['ชุมชนคลองตัน'],
  แขวงพระโขนง: ['ชุมชนพระโขนง'],
  แขวงคลองจั่น: ['ชุมชนคลองจั่น'],
  แขวงหัวหมาก: ['ชุมชนหัวหมาก'],
};

export const communityOptionsFor = (subdistrict) =>
  (SUBDISTRICT_COMMUNITIES[subdistrict] || []).map((c) => ({ value: c, label: c }));

export const STATUS_OPTIONS = Object.entries(CHC_STATUS_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

/** Flat ชุมชน → {เขต, แขวง} directory — powers the "ชุมชนที่รับผิดชอบ" step
    of the add-CHC wizard, where picking a ชุมชน auto-fills its เขต/แขวง
    (per chc-add.html's "ชุมชน -> เขต/แขวง cascade per row"). */
export const COMMUNITY_DIRECTORY = Object.entries(SUBDISTRICT_COMMUNITIES).flatMap(([subdistrict, names]) => {
  const district = Object.keys(DISTRICT_SUBDISTRICTS)
    .find((d) => DISTRICT_SUBDISTRICTS[d].includes(subdistrict));
  return names.map((name) => ({ name, district, subdistrict }));
});

export const COMMUNITY_OPTIONS = COMMUNITY_DIRECTORY.map((c) => ({ value: c.name, label: c.name }));

export const getCommunityInfo = (name) => COMMUNITY_DIRECTORY.find((c) => c.name === name);

/** รายการศูนย์สุขภาพชุมชน (6 แห่ง ตามตัวเลขบนแดชบอร์ด) */
export const CHC_LIST = [
  {
    id: 'chc-4',
    code: 'ศบส.4',
    name: 'ศูนย์บริการสาธารณสุข 4 ดินแดง',
    district: 'เขตดินแดง',
    subdistrict: 'แขวงดินแดง',
    address: 'ถนนดินแดง แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    coverageArea: 'ชุมชนในเขตดินแดงบางส่วน ครอบคลุม 3 ชุมชน',
    communities: [
      { name: 'ชุมชนดินแดง', district: 'เขตดินแดง', subdistrict: 'แขวงดินแดง' },
      { name: 'ชุมชนประชาสงเคราะห์', district: 'เขตดินแดง', subdistrict: 'แขวงดินแดง' },
      { name: 'ชุมชนรัชดา', district: 'เขตดินแดง', subdistrict: 'แขวงรัชดาภิเษก' },
    ],
    volunteerCount: 12,
    population: 8540,
    households: 2310,
    status: 'open',
    lat: 13.7649,
    lng: 100.5522,
  },
  {
    id: 'chc-9',
    code: 'ศบส.9',
    name: 'ศูนย์บริการสาธารณสุข 9 รัชดาภิเษก',
    district: 'เขตดินแดง',
    subdistrict: 'แขวงรัชดาภิเษก',
    address: 'ถนนรัชดาภิเษก แขวงรัชดาภิเษก เขตดินแดง กรุงเทพมหานคร 10400',
    coverageArea: 'ชุมชนในเขตดินแดงบางส่วน ครอบคลุม 1 ชุมชน',
    communities: [
      { name: 'ชุมชนรัชดา', district: 'เขตดินแดง', subdistrict: 'แขวงรัชดาภิเษก' },
    ],
    volunteerCount: 8,
    population: 5210,
    households: 1480,
    status: 'open',
    lat: 13.771,
    lng: 100.568,
  },
  {
    id: 'chc-20',
    code: 'ศบส.20',
    name: 'ศูนย์บริการสาธารณสุข 20 ห้วยขวาง',
    district: 'เขตห้วยขวาง',
    subdistrict: 'แขวงห้วยขวาง',
    address: 'ถนนประชาราษฎร์บำเพ็ญ แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    coverageArea: 'ชุมชนในเขตห้วยขวางบางส่วน ครอบคลุม 2 ชุมชน',
    communities: [
      { name: 'ชุมชนห้วยขวาง', district: 'เขตห้วยขวาง', subdistrict: 'แขวงห้วยขวาง' },
      { name: 'ชุมชนสามเสนนอก', district: 'เขตห้วยขวาง', subdistrict: 'แขวงสามเสนนอก' },
    ],
    volunteerCount: 9,
    population: 6120,
    households: 1740,
    status: 'open',
    lat: 13.777,
    lng: 100.576,
  },
  {
    id: 'chc-7',
    code: 'ศบส.7',
    name: 'ศูนย์บริการสาธารณสุข 7 พญาไท',
    district: 'เขตพญาไท',
    subdistrict: 'แขวงพญาไท',
    address: 'ถนนพหลโยธิน แขวงพญาไท เขตพญาไท กรุงเทพมหานคร 10400',
    coverageArea: 'ชุมชนในเขตพญาไทบางส่วน ครอบคลุม 2 ชุมชน — ปิดปรับปรุงอาคารชั่วคราว',
    communities: [
      { name: 'ชุมชนพญาไท', district: 'เขตพญาไท', subdistrict: 'แขวงพญาไท' },
      { name: 'ชุมชนสามเสนใน', district: 'เขตพญาไท', subdistrict: 'แขวงสามเสนใน' },
    ],
    volunteerCount: 6,
    population: 4380,
    households: 1190,
    status: 'renovate',
    lat: 13.777,
    lng: 100.537,
  },
  {
    id: 'chc-41',
    code: 'ศบส.41',
    name: 'ศูนย์บริการสาธารณสุข 41 คลองเตย',
    district: 'เขตคลองเตย',
    subdistrict: 'แขวงคลองเตย',
    address: 'ถนนพระรามที่ 4 แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
    coverageArea: 'ชุมชนในเขตคลองเตยบางส่วน ครอบคลุม 3 ชุมชน',
    communities: [
      { name: 'ชุมชนคลองเตย', district: 'เขตคลองเตย', subdistrict: 'แขวงคลองเตย' },
      { name: 'ชุมชนคลองตัน', district: 'เขตคลองเตย', subdistrict: 'แขวงคลองตัน' },
      { name: 'ชุมชนพระโขนง', district: 'เขตคลองเตย', subdistrict: 'แขวงพระโขนง' },
    ],
    volunteerCount: 11,
    population: 8830,
    households: 2480,
    status: 'open',
    lat: 13.708,
    lng: 100.582,
  },
  {
    id: 'chc-15',
    code: 'ศบส.15',
    name: 'ศูนย์บริการสาธารณสุข 15 บางกะปิ',
    district: 'เขตบางกะปิ',
    subdistrict: 'แขวงคลองจั่น',
    address: 'ถนนลาดพร้าว แขวงคลองจั่น เขตบางกะปิ กรุงเทพมหานคร 10240',
    coverageArea: 'ชุมชนในเขตบางกะปิบางส่วน ครอบคลุม 2 ชุมชน',
    communities: [
      { name: 'ชุมชนคลองจั่น', district: 'เขตบางกะปิ', subdistrict: 'แขวงคลองจั่น' },
      { name: 'ชุมชนหัวหมาก', district: 'เขตบางกะปิ', subdistrict: 'แขวงหัวหมาก' },
    ],
    volunteerCount: 7,
    population: 5340,
    households: 1520,
    status: 'open',
    lat: 13.766,
    lng: 100.647,
  },
];

export const getChcById = (id) => CHC_LIST.find((c) => c.id === id);
