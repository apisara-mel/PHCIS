/* Mock data for /community-health/report — ported from claude/Community's
   community-report.html, which lists 7 report categories (รายงานข้อมูลชุมชน,
   รายงานข้อมูลบ้านและสมาชิก, รายงานการสำรวจชุมชนและบ้าน, รายงานการประเมิน
   สภาพแวดล้อมและสุขาภิบาล, รายงานข้อมูลศูนย์สุขภาพชุมชน, รายงานข้อมูล อสส.,
   รายงานกิจกรรม) with only a "ดูรายงาน" stub per row — no real dataset in the
   prototype. Row-level records are mocked here (same deterministic-RNG
   convention as src/data/dashboard*.js) so the ported page can chart +
   date-filter + export each domain like every other PHCIS report page. */

import {
  makeRng, pick, between, isoOffsetDays,
} from '@/data/dashboardCommon';

export const DISTRICTS = ['ดินแดง', 'ห้วยขวาง', 'พญาไท', 'คลองเตย', 'บางกะปิ', 'สวนหลวง'];

/* ── รายงานข้อมูลชุมชน ────────────────────────────────────────────────── */

export const COMMUNITY_TYPES = ['ชุมชนแออัด', 'ชุมชนเมือง', 'ชุมชนชานเมือง'];

const COMMUNITY_NAMES = [
  'สามัคคีร่วมใจ', 'พัฒนาใหม่', 'ริมคลองเจริญ', 'บึงพัฒนา', 'หนองแขมสามัคคี',
  'ร่มเกล้าพัฒนา', 'สุขใจริมทาง', 'มิตรไมตรี', 'บ้านมั่นคง', 'เอื้ออาทร',
  'สร้างสรรค์พัฒนา', 'ทุ่งสองห้อง',
];

export const COMMUNITIES = COMMUNITY_NAMES.map((name, i) => {
  const rng = makeRng(7100000 + i);
  const houseCount = between(rng, 45, 180);
  const memberCount = Math.round(houseCount * (2.8 + rng() * 1.2));
  return {
    id: `CM-${String(i + 1).padStart(3, '0')}`,
    code: `CM-${String(i + 1).padStart(3, '0')}`,
    name: `ชุมชน${name}`,
    district: pick(rng, DISTRICTS),
    type: pick(rng, COMMUNITY_TYPES),
    houseCount,
    memberCount,
    registeredDate: isoOffsetDays(-between(rng, 30, 1460)),
  };
});

/* ── รายงานข้อมูลบ้านและสมาชิก ───────────────────────────────────────── */

export const HOUSES = (() => {
  const rows = [];
  const rng = makeRng(7200000);
  for (let i = 0; i < 26; i += 1) {
    const community = pick(rng, COMMUNITIES);
    const children = between(rng, 0, 2);
    const working = between(rng, 1, 4);
    const elderly = rng() < 0.35 ? between(rng, 1, 2) : 0;
    rows.push({
      id: `HS-${String(i + 1).padStart(4, '0')}`,
      houseNo: `${between(rng, 1, 99)}/${between(rng, 1, 20)}`,
      community: community.name,
      district: community.district,
      children,
      working,
      elderly,
      memberCount: children + working + elderly,
      registeredDate: isoOffsetDays(-between(rng, 0, 720)),
    });
  }
  return rows;
})();

/* ── รายงานการสำรวจชุมชนและบ้าน ──────────────────────────────────────── */

export const SURVEY_STATUSES = ['สำรวจแล้ว', 'กำลังสำรวจ', 'ยังไม่สำรวจ'];
const SURVEYORS = ['อสส.สมหญิง', 'อสส.ประไพ', 'จนท.สาธารณสุข วิชัย', 'อสส.มาลี', 'จนท.สาธารณสุข อรทัย'];

export const SURVEYS = (() => {
  const rows = [];
  const rng = makeRng(7300000);
  const weights = [...Array(56).fill('สำรวจแล้ว'), ...Array(18).fill('กำลังสำรวจ'), ...Array(26).fill('ยังไม่สำรวจ')];
  for (let i = 0; i < 30; i += 1) {
    const isHouse = rng() < 0.7;
    const target = isHouse ? pick(rng, HOUSES) : pick(rng, COMMUNITIES);
    rows.push({
      id: `SV-${String(i + 1).padStart(4, '0')}`,
      targetType: isHouse ? 'บ้าน' : 'ชุมชน',
      targetName: isHouse ? `บ้านเลขที่ ${target.houseNo}` : target.name,
      district: target.district,
      status: pick(rng, weights),
      surveyor: pick(rng, SURVEYORS),
      surveyDate: isoOffsetDays(-between(rng, 0, 400)),
    });
  }
  return rows;
})();

/* ── รายงานการประเมินสภาพแวดล้อมและสุขาภิบาล ─────────────────────────── */

export const ASSESSMENT_RESULTS = ['ผ่านเกณฑ์', 'ต้องปรับปรุง', 'ยังไม่ได้ประเมิน'];

export const ASSESSMENTS = (() => {
  const rows = [];
  const rng = makeRng(7400000);
  const weights = [...Array(62).fill('ผ่านเกณฑ์'), ...Array(24).fill('ต้องปรับปรุง'), ...Array(14).fill('ยังไม่ได้ประเมิน')];
  for (let i = 0; i < 24; i += 1) {
    const house = pick(rng, HOUSES);
    const result = pick(rng, weights);
    rows.push({
      id: `AS-${String(i + 1).padStart(4, '0')}`,
      houseNo: house.houseNo,
      community: house.community,
      district: house.district,
      result,
      score: result === 'ผ่านเกณฑ์' ? between(rng, 80, 100) : result === 'ต้องปรับปรุง' ? between(rng, 45, 79) : null,
      assessor: pick(rng, SURVEYORS),
      assessDate: isoOffsetDays(-between(rng, 0, 400)),
    });
  }
  return rows;
})();

/* ── รายงานข้อมูลศูนย์สุขภาพชุมชน ───────────────────────────────────── */

export const CENTER_TYPES = ['ศูนย์บริการสาธารณสุข', 'คลินิกชุมชนอบอุ่น'];

export const HEALTH_CENTERS = [
  { name: 'ศูนย์บริการสาธารณสุข 1 ดินแดง', district: 'ดินแดง' },
  { name: 'ศูนย์บริการสาธารณสุข 2 ห้วยขวาง', district: 'ห้วยขวาง' },
  { name: 'ศูนย์บริการสาธารณสุข 3 พญาไท', district: 'พญาไท' },
  { name: 'คลินิกชุมชนอบอุ่นคลองเตย', district: 'คลองเตย' },
  { name: 'ศูนย์บริการสาธารณสุข 5 บางกะปิ', district: 'บางกะปิ' },
  { name: 'คลินิกชุมชนอบอุ่นสวนหลวง', district: 'สวนหลวง' },
].map((c, i) => {
  const rng = makeRng(7500000 + i);
  return {
    id: `HC-${String(i + 1).padStart(3, '0')}`,
    ...c,
    type: c.name.startsWith('คลินิก') ? 'คลินิกชุมชนอบอุ่น' : 'ศูนย์บริการสาธารณสุข',
    staffCount: between(rng, 8, 32),
    coverageHouses: between(rng, 120, 420),
    coverageMembers: between(rng, 900, 3400),
    openDate: isoOffsetDays(-between(rng, 400, 1200)),
  };
});

/* ── รายงานข้อมูล อสส. ───────────────────────────────────────────────── */

const VOLUNTEER_NAMES = [
  'สมหญิง ใจดี', 'ประไพ รักงาน', 'มาลี พงศ์เพชร', 'อรทัย ภักดีไทย', 'สุนีย์ เจริญสุข',
  'บุญมี จันทร์โอภาส', 'ลัดดา ศักดิ์สิทธิ์', 'วิภา มั่งมี', 'จันทนา สงวนทรัพย์', 'ทองใบ ไทยเจริญ',
  'กาญจนา วงศ์สถิตย์', 'สายทิพย์ แสงทองดี', 'อำไพ ชูเกียรติ', 'พรทิพย์ พิทักษ์', 'สมศรี จิตรเย็น',
  'เพ็ญศรี รัตน์โกสินทร์',
];

export const VOLUNTEERS = VOLUNTEER_NAMES.map((name, i) => {
  const rng = makeRng(7600000 + i);
  const community = pick(rng, COMMUNITIES);
  return {
    id: `VO-${String(i + 1).padStart(3, '0')}`,
    name: `อสส. ${name}`,
    community: community.name,
    district: community.district,
    houseCount: between(rng, 15, 60),
    status: rng() < 0.88 ? 'active' : 'inactive',
    joinDate: isoOffsetDays(-between(rng, 30, 1200)),
  };
});

export const VOLUNTEER_STATUS_LABEL = { active: 'ปฏิบัติงาน', inactive: 'พ้นสภาพ' };

/* ── รายงานกิจกรรม ───────────────────────────────────────────────────── */

export const ACTIVITY_TYPES = ['เยี่ยมบ้าน', 'สำรวจชุมชนและบ้าน', 'ประเมินสภาพแวดล้อม', 'อบรม/ให้ความรู้', 'อื่นๆ'];

export const ACTIVITIES = (() => {
  const rows = [];
  const rng = makeRng(7700000);
  const weights = [
    ...Array(22).fill('เยี่ยมบ้าน'),
    ...Array(16).fill('สำรวจชุมชนและบ้าน'),
    ...Array(10).fill('ประเมินสภาพแวดล้อม'),
    ...Array(7).fill('อบรม/ให้ความรู้'),
    ...Array(3).fill('อื่นๆ'),
  ];
  for (let i = 0; i < 28; i += 1) {
    const community = pick(rng, COMMUNITIES);
    const type = pick(rng, weights);
    rows.push({
      id: `AC-${String(i + 1).padStart(4, '0')}`,
      title: `${type} — ${community.name}`,
      type,
      community: community.name,
      district: community.district,
      participantCount: between(rng, 4, 60),
      responsible: pick(rng, SURVEYORS),
      activityDate: isoOffsetDays(-between(rng, 0, 400)),
    });
  }
  return rows;
})();
