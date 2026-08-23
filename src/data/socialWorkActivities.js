/* socialWorkActivities.js — แบบบันทึกกิจกรรมทางสังคมสงเคราะห์ (ส.ส.4)
   ตามมติ คทง.10 ครั้งที่ 3 (รหัส สส.4-x) และแบบฟอร์มรายงานฉบับที่ 4 ของ
   มติครั้งที่ 4 (มิติ: กระบวนการ · กิจกรรม · งาน — หน่วยนับ ครั้ง/คน/เรื่อง/
   กิจกรรม/ชมรม).

   งานกลุ่ม/งานที่ไม่ใช่เคสเวิร์ค บันทึกเป็นรายกิจกรรม (event) แล้วรายงาน
   รวมยอดรายเดือนให้เอง — เก็บครบตามมติเพิ่มเติม:
     • ทีมสหวิชาชีพที่ร่วมกิจกรรม (มติครั้งที่ 3 ข้อ 3)
     • แนบรูปภาพกิจกรรม (มติครั้งที่ 3 ข้อ 5)
     • ช่องทางการดำเนินการ ศบส. / โทรติดตาม / ประสาน อสส. (มติข้อ 7)

   ครบ 4 กริยา: แสดง / บันทึก / แก้ไข / ยกเลิก (เหตุผลบังคับ + กู้คืน)
   ทุกแถวประทับผู้บันทึก + เวลา + เวลาแก้ไข. */

import {
  SW_CURRENT_USER,
  todayIso,
  SW_CONTACT_CHANNELS,
  resolveSwContactChannel,
  swContactChannelBadge,
} from '@/data/socialWorkClinic';

/* ช่องทางการดำเนินการ (นิยามใหม่ มติ คทง.10 ครั้งที่ 3 ข้อ 7) — นิยามจริง
   อยู่ใน socialWorkClinic.js เพื่อให้หน้าติดตามผล (1.10.11.5) ใช้ร่วมกันได้
   โดยไม่เกิด import วน; re-export ไว้ตรงนี้ให้หน้ากิจกรรมเรียกจากที่เดียว */
export { SW_CONTACT_CHANNELS, resolveSwContactChannel, swContactChannelBadge };

const storageAvailable = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const readJson = (key, fallback) => {
  if (!storageAvailable()) return fallback;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!storageAvailable()) return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
};

const K = {
  activities: 'mih:sw:activities',
  printLog: 'mih:sw:activity-print-log',
};

/* ── vocabulary กิจกรรมหลัก → กิจกรรมย่อย (dropdown 2 ชั้น) ─────────── */
export const SW_ACTIVITY_TREE = [
  {
    value: 'home-visit', label: 'เยี่ยมบ้าน (งาน 2.13)', unit: 'คน',
    items: [
      { value: 'hv-new', label: 'เยี่ยมบ้านรายใหม่เพื่อประเมินสภาพปัญหา' },
      { value: 'hv-follow', label: 'เยี่ยมบ้านติดตามผลการช่วยเหลือ' },
      { value: 'hv-team', label: 'เยี่ยมบ้านร่วมทีมสหวิชาชีพ' },
      { value: 'hv-equipment', label: 'เยี่ยมบ้านเพื่อส่งมอบวัสดุ/กายอุปกรณ์' },
    ],
  },
  {
    value: 'group-activity', label: 'การจัดกิจกรรมกลุ่ม (งาน 1.2 (2))', unit: 'ครั้ง',
    items: [
      { value: 'ga-club-setup', label: 'สนับสนุนการจัดตั้งชมรม (หน่วย: ชมรม)', unit: 'ชมรม' },
      { value: 'ga-prepost', label: 'ดำเนินงานก่อน–หลังการจัดกิจกรรมชมรม/กลุ่ม (หน่วย: กิจกรรม)', unit: 'กิจกรรม' },
      { value: 'ga-run', label: 'การจัดกิจกรรมกลุ่ม (หน่วย: ครั้ง)' },
      { value: 'ga-annual', label: 'การสรุปรายงานประจำปีของชมรม (หน่วย: ครั้ง)' },
    ],
  },
  {
    value: 'community-survey', label: 'สำรวจ/ศึกษาชุมชน (งาน 1.4)', unit: 'ครั้ง',
    items: [
      { value: 'cs-survey', label: 'สำรวจข้อมูลชุมชนและกลุ่มเปราะบาง' },
      { value: 'cs-map', label: 'จัดทำแผนที่ทางสังคม/ทำเนียบเครือข่าย' },
      { value: 'cs-case-find', label: 'ค้นหากลุ่มเปราะบางเชิงรุกให้เข้าถึงสิทธิ' },
    ],
  },
  {
    value: 'health-education', label: 'การให้ความรู้แก่ประชาชน/ชุมชน (งาน 1.1)', unit: 'ครั้ง',
    items: [
      { value: 'he-talk', label: 'บรรยาย/อบรมให้ความรู้ในชุมชน' },
      { value: 'he-school', label: 'ให้ความรู้ในสถานศึกษา' },
      { value: 'he-media', label: 'จัดทำสื่อ/นิทรรศการเผยแพร่ความรู้' },
      { value: 'he-volunteer', label: 'อบรมอาสาสมัครสาธารณสุข (อสส.) และแกนนำชุมชน' },
    ],
  },
  {
    value: 'mobile-service', label: 'จัดบริการสังคม / ออกหน่วยเคลื่อนที่ (งาน 4.4)', unit: 'ครั้ง',
    items: [
      { value: 'ms-screening', label: 'ออกหน่วยคัดกรองสุขภาพ' },
      { value: 'ms-doctor', label: 'ออกหน่วยแพทย์เคลื่อนที่' },
      { value: 'ms-social', label: 'ออกหน่วยสังคมสงเคราะห์เคลื่อนที่' },
      { value: 'ms-drug', label: 'ออกหน่วยยาเสพติด' },
    ],
  },
  {
    value: 'community-meeting', label: 'ประชุมกับองค์กรชุมชน (งาน 4.3)', unit: 'ครั้ง',
    items: [
      { value: 'cm-prepost', label: 'ดำเนินการก่อน–หลังการเข้าร่วมประชุม (หน่วย: เรื่อง)', unit: 'เรื่อง' },
      { value: 'cm-network', label: 'จัด/เข้าร่วมประชุมนักสังคมสงเคราะห์ในศูนย์ประสานงาน' },
      { value: 'cm-represent', label: 'เป็นผู้แทนศูนย์บริการสาธารณสุขเข้าร่วมประชุมรับนโยบาย' },
      { value: 'cm-internal', label: 'เข้าร่วมประชุมภายในและภายนอกหน่วยงาน' },
    ],
  },
  {
    value: 'academic', label: 'งานด้านวิชาการและการวิจัยเพื่อพัฒนางานสังคม (กระบวนการย่อย 3)', unit: 'เรื่อง',
    items: [
      { value: 'ac-research', label: 'ศึกษาวิจัย/ถอดบทเรียนงานสังคมสงเคราะห์' },
      { value: 'ac-manual', label: 'จัดทำคู่มือ/แนวปฏิบัติงาน' },
      { value: 'ac-train', label: 'เป็นวิทยากร/พี่เลี้ยงนักศึกษาฝึกปฏิบัติงาน' },
    ],
  },
  {
    value: 'admin', label: 'งานบริหารจัดการ สนับสนุนภารกิจ และขับเคลื่อนนโยบาย (กระบวนการย่อย 4)', unit: 'เรื่อง',
    items: [
      { value: 'ad-plan', label: 'จัดทำแผนงาน/โครงการ และรายงานผลการดำเนินงาน' },
      { value: 'ad-supply', label: 'บริหารคลังวัสดุและกายอุปกรณ์ทางการแพทย์' },
      { value: 'ad-policy', label: 'ขับเคลื่อนนโยบายของสำนักอนามัย' },
    ],
  },
  {
    value: 'other', label: 'อื่น ๆ (กระบวนการย่อย 5)', unit: 'เรื่อง',
    items: [{ value: 'ot-other', label: 'อื่น ๆ (ระบุในผลการจัดกิจกรรม)' }],
  },
];

export const SW_ACTIVITY_OPTIONS = SW_ACTIVITY_TREE.map((a) => ({ value: a.value, label: a.label }));

export const swSubActivityOptions = (activityValue) => {
  const group = SW_ACTIVITY_TREE.find((a) => a.value === activityValue);
  if (!group) return [];
  return group.items.map((i) => ({ value: i.value, label: i.label }));
};

export const findSwActivity = (value) => SW_ACTIVITY_TREE.find((a) => a.value === value) || null;

export const resolveSwActivity = (value) => findSwActivity(value)?.label || '—';

export const findSwSubActivity = (activityValue, subValue) => {
  const group = findSwActivity(activityValue);
  if (!group) return null;
  return group.items.find((i) => i.value === subValue) || null;
};

export const resolveSwSubActivity = (activityValue, subValue) =>
  findSwSubActivity(activityValue, subValue)?.label || '—';

/** หน่วยนับของกิจกรรมย่อย (fallback = หน่วยของกิจกรรมหลัก) */
export const swActivityUnit = (activityValue, subValue) =>
  findSwSubActivity(activityValue, subValue)?.unit
  || findSwActivity(activityValue)?.unit
  || 'ครั้ง';

/* ── ทีมสหวิชาชีพที่ร่วมกิจกรรม (มติครั้งที่ 3 ข้อ 3) ───────────────── */
export const SW_PROFESSIONS = [
  'นักสังคมสงเคราะห์',
  'พยาบาลวิชาชีพ',
  'แพทย์',
  'นักจิตวิทยา',
  'นักกายภาพบำบัด',
  'นักโภชนาการ',
  'เภสัชกร',
  'นักวิชาการสาธารณสุข',
  'อาสาสมัครสาธารณสุข (อสส.)',
  'เจ้าหน้าที่สำนักงานเขต',
];

export const SW_ACTIVITY_VENUES = [
  'ศูนย์บริการสาธารณสุข 21 วัดธาตุทอง',
  'ศูนย์เยาวชนคลองเตย',
  'ชุมชนหลังวัดธาตุทอง',
  'ชุมชนคลองเตยล็อค 1–6',
  'โรงเรียนวัดธาตุทอง',
  'สำนักงานเขตวัฒนา',
  'ศาลาประชาคมชุมชนพระโขนงเหนือ',
  'บ้านผู้รับบริการ (ลงพื้นที่)',
];

export const SW_ACTIVITY_RESULT_SUGGESTIONS = [
  'ผู้เข้าร่วมมีความรู้ความเข้าใจเพิ่มขึ้น และแสดงความสนใจเข้าร่วมกิจกรรมครั้งต่อไป',
  'พบผู้มีภาวะเสี่ยงและได้ส่งต่อเข้าสู่ระบบบริการของศูนย์บริการสาธารณสุขแล้ว',
  'ชุมชนมีมติจัดตั้งชมรมและกำหนดคณะกรรมการชมรมเรียบร้อยแล้ว',
  'ประสานอาสาสมัครสาธารณสุขในพื้นที่ให้ติดตามกลุ่มเปราะบางต่อเนื่องรายเดือน',
  'ได้ข้อมูลสำรวจครัวเรือนกลุ่มเปราะบางเพื่อวางแผนการช่วยเหลือในไตรมาสถัดไป',
  'ยังมีข้อจำกัดด้านจำนวนผู้เข้าร่วม ควรปรับช่วงเวลาการจัดกิจกรรมในครั้งถัดไป',
];

export const SW_ACTIVITY_IMAGE_ACCEPT = '.png,.jpg,.jpeg';
const IMAGE_MAX_MB = 10;

export const validateSwActivityImage = (fileName, sizeBytes) => {
  if (!/\.(png|jpe?g)$/i.test(fileName || '')) {
    return `ชนิดไฟล์ไม่รองรับ — แนบรูปได้เฉพาะ ${SW_ACTIVITY_IMAGE_ACCEPT}`;
  }
  if (sizeBytes != null && sizeBytes > IMAGE_MAX_MB * 1024 * 1024) {
    return `ไฟล์ใหญ่เกิน ${IMAGE_MAX_MB} MB`;
  }
  return null;
};

/* ── mock กิจกรรมที่บันทึกแล้ว ─────────────────────────────────────── */
const SEED = [
  {
    id: 'act-1', date: '2026-04-22', activity: 'health-education', subActivity: 'he-volunteer',
    venue: 'ศาลาประชาคมชุมชนพระโขนงเหนือ', channel: 'center',
    count: 42, unit: 'ครั้ง',
    participants: ['อสส. เขตวัฒนา 28 คน', 'แกนนำชุมชน 14 คน'],
    team: ['นักสังคมสงเคราะห์', 'พยาบาลวิชาชีพ', 'นักวิชาการสาธารณสุข'],
    images: [{ name: 'อบรม-อสส-2569-04-22-01.jpg', size: '1.2 MB' }],
    result: 'ผู้เข้าร่วมมีความรู้ความเข้าใจเรื่องการคัดกรองกลุ่มเปราะบางเพิ่มขึ้น และรับแบบสำรวจไปใช้ในพื้นที่',
    status: 'active',
    recordedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-04-22T16:10:00',
  },
  {
    id: 'act-2', date: '2026-05-08', activity: 'group-activity', subActivity: 'ga-run',
    venue: 'ศูนย์บริการสาธารณสุข 21 วัดธาตุทอง', channel: 'center',
    count: 1, unit: 'ครั้ง',
    participants: ['ชมรมผู้สูงอายุวัดธาตุทอง 35 คน'],
    team: ['นักสังคมสงเคราะห์', 'นักกายภาพบำบัด', 'นักโภชนาการ'],
    images: [
      { name: 'ชมรมผู้สูงอายุ-05-08-01.jpg', size: '980 KB' },
      { name: 'ชมรมผู้สูงอายุ-05-08-02.jpg', size: '1.1 MB' },
    ],
    result: 'จัดกิจกรรมส่งเสริมสุขภาพผู้สูงอายุ ประเมิน ADL รายบุคคล พบผู้มีภาวะพึ่งพิง 3 ราย ส่งต่อทีมเยี่ยมบ้าน',
    status: 'active',
    recordedBy: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', recordedAt: '2026-05-08T15:40:00',
  },
  {
    id: 'act-3', date: '2026-05-27', activity: 'home-visit', subActivity: 'hv-team',
    venue: 'บ้านผู้รับบริการ (ลงพื้นที่)', channel: 'volunteer',
    count: 6, unit: 'คน',
    participants: ['ผู้ป่วยติดเตียง 4 ราย', 'ผู้ดูแล 2 ราย'],
    team: ['นักสังคมสงเคราะห์', 'พยาบาลวิชาชีพ', 'อาสาสมัครสาธารณสุข (อสส.)'],
    images: [],
    result: 'ประสานอาสาสมัครสาธารณสุขในพื้นที่ให้ติดตามกลุ่มเปราะบางต่อเนื่องรายเดือน จ่ายผ้าอ้อมผู้ใหญ่ 4 ราย',
    status: 'active',
    recordedBy: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', recordedAt: '2026-05-27T17:05:00',
  },
  {
    id: 'act-4', date: '2026-06-11', activity: 'community-survey', subActivity: 'cs-case-find',
    venue: 'ชุมชนคลองเตยล็อค 1–6', channel: 'volunteer',
    count: 3, unit: 'ครั้ง',
    participants: ['ครัวเรือนที่สำรวจ 84 หลังคาเรือน'],
    team: ['นักสังคมสงเคราะห์', 'อาสาสมัครสาธารณสุข (อสส.)', 'เจ้าหน้าที่สำนักงานเขต'],
    images: [{ name: 'สำรวจชุมชนคลองเตย-06-11.jpg', size: '2.4 MB' }],
    result: 'ได้ข้อมูลสำรวจครัวเรือนกลุ่มเปราะบาง 84 หลังคาเรือน พบรายใหม่ที่ต้องช่วยเหลือ 11 ราย',
    status: 'active',
    recordedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-06-11T18:20:00',
  },
  {
    id: 'act-5', date: '2026-06-24', activity: 'mobile-service', subActivity: 'ms-social',
    venue: 'ชุมชนหลังวัดธาตุทอง', channel: 'center',
    count: 1, unit: 'ครั้ง',
    participants: ['ประชาชนรับบริการ 96 คน'],
    team: ['นักสังคมสงเคราะห์', 'แพทย์', 'พยาบาลวิชาชีพ', 'เภสัชกร'],
    images: [{ name: 'ออกหน่วยเคลื่อนที่-06-24.jpg', size: '1.7 MB' }],
    result: 'พบผู้มีภาวะเสี่ยงและได้ส่งต่อเข้าสู่ระบบบริการของศูนย์บริการสาธารณสุขแล้ว 8 ราย',
    status: 'active',
    recordedBy: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', recordedAt: '2026-06-24T16:55:00',
  },
  {
    id: 'act-6', date: '2026-07-09', activity: 'community-meeting', subActivity: 'cm-network',
    venue: 'สำนักงานเขตวัฒนา', channel: 'center',
    count: 1, unit: 'ครั้ง',
    participants: ['นักสังคมสงเคราะห์ศูนย์ประสานงาน 12 คน'],
    team: ['นักสังคมสงเคราะห์'],
    images: [],
    result: 'หารือแนวทางการส่งต่อผู้ประสบปัญหาทางสังคมระหว่างศูนย์บริการสาธารณสุขและสำนักงานเขต',
    status: 'active',
    recordedBy: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', recordedAt: '2026-07-09T14:30:00',
  },
  {
    id: 'act-7', date: '2026-07-21', activity: 'group-activity', subActivity: 'ga-club-setup',
    venue: 'ชุมชนคลองเตยล็อค 1–6', channel: 'phone',
    count: 1, unit: 'ชมรม',
    participants: ['สมาชิกก่อตั้ง 18 คน'],
    team: ['นักสังคมสงเคราะห์', 'นักวิชาการสาธารณสุข'],
    images: [],
    result: 'ชุมชนมีมติจัดตั้งชมรมผู้ดูแลผู้ป่วยติดเตียงและกำหนดคณะกรรมการชมรมเรียบร้อยแล้ว',
    status: 'cancelled',
    cancellation: { reason: 'บันทึกซ้ำกับกิจกรรมวันที่ 21 ก.ค. 2569 ที่ลงไว้แล้ว', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', at: '2026-07-22T09:15:00' },
    recordedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-07-21T17:40:00',
  },
  {
    id: 'act-8', date: '2026-08-05', activity: 'academic', subActivity: 'ac-manual',
    venue: 'ศูนย์บริการสาธารณสุข 21 วัดธาตุทอง', channel: 'center',
    count: 1, unit: 'เรื่อง',
    participants: ['ทีมงานสังคมสงเคราะห์ 4 คน'],
    team: ['นักสังคมสงเคราะห์'],
    images: [],
    result: 'จัดทำแนวปฏิบัติการคัดกรองเด็กเสี่ยงฉบับร่างสำหรับใช้ในศูนย์บริการสาธารณสุข',
    status: 'active',
    recordedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-08-05T11:25:00',
  },
];

export const getSwActivities = () => {
  const overlay = readJson(K.activities, {});
  const seedIds = SEED.map((r) => r.id);
  const merged = SEED.map((r) => (overlay[r.id] ? { ...r, ...overlay[r.id] } : r));
  const added = Object.values(overlay).filter((r) => !seedIds.includes(r.id));
  return [...merged, ...added].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
};

export const getSwActivity = (id) => getSwActivities().find((a) => a.id === id) || null;

export const saveSwActivity = (entry) => {
  const overlay = readJson(K.activities, {});
  const previous = entry.id ? getSwActivity(entry.id) : null;
  const editLog = [...(previous?.editLog || [])];
  if (previous) editLog.push({ by: SW_CURRENT_USER, at: new Date().toISOString() });
  const saved = {
    ...(previous || {}),
    ...entry,
    id: entry.id || `act-new-${Date.now()}`,
    date: entry.date || todayIso(),
    unit: entry.unit || swActivityUnit(entry.activity, entry.subActivity),
    participants: entry.participants || previous?.participants || [],
    team: entry.team || previous?.team || [],
    images: entry.images || previous?.images || [],
    status: entry.status || previous?.status || 'active',
    recordedBy: previous?.recordedBy || SW_CURRENT_USER,
    recordedAt: previous?.recordedAt || new Date().toISOString(),
    editLog,
  };
  overlay[saved.id] = saved;
  writeJson(K.activities, overlay);
  return { saved, isNew: !previous };
};

export const cancelSwActivity = (id, reason) => {
  const current = getSwActivity(id);
  if (!current) return null;
  const overlay = readJson(K.activities, {});
  overlay[id] = {
    ...current,
    status: 'cancelled',
    cancellation: { reason: reason || '', by: SW_CURRENT_USER, at: new Date().toISOString() },
  };
  writeJson(K.activities, overlay);
  return overlay[id];
};

export const reactivateSwActivity = (id) => {
  const current = getSwActivity(id);
  if (!current) return null;
  const overlay = readJson(K.activities, {});
  overlay[id] = { ...current, status: 'active', cancellation: null };
  writeJson(K.activities, overlay);
  return overlay[id];
};

export const logSwActivityPrint = (id, docType = 'แบบบันทึกกิจกรรม ส.ส.4') => {
  const log = readJson(K.printLog, {});
  log[id] = [...(log[id] || []), { docType, by: SW_CURRENT_USER, at: new Date().toISOString() }];
  writeJson(K.printLog, log);
};

export const getSwActivityPrintLog = (id) => readJson(K.printLog, {})[id] || [];

export default getSwActivities;
