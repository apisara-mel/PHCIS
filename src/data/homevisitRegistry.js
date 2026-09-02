/* งานเยี่ยมบ้าน (TOR §1.10.12) — ทะเบียนผู้รับบริการ + ข้อมูลย้อนหลังรายบุคคล.

   คู่กับ `homevisitVisits.js`:
     • ทะเบียนผู้รับบริการเยี่ยมบ้าน (1.10.12.1) — แสดง / บันทึก / ยกเลิก / แก้ไข
     • ประวัติการเยี่ยมบ้านย้อนหลัง (1.18.3) — ใช้ทั้งขั้นตอนประวัติและหน้าติดตาม
     • การติดตามการเยี่ยมบ้าน (1.10.12.4) — ผลตรวจร่างกาย/ADL/Lab/X-ray ตามช่วงเวลา
     • อ่านบัตรประชาชน (smart card) แบบ mock

   Seed เป็น mock ผู้รับบริการไทยในพื้นที่ศูนย์บริการสาธารณสุข กทม.;
   ทุกการเขียนของผู้ใช้ overlay ผ่าน sessionStorage พร้อม audit (ผู้บันทึก+เวลา)
   เพื่อให้ครบทั้ง 4 กริยาโดยไม่ต้องมี backend. */

import {
  HOMEVISIT_CURRENT_USER,
  BARTHEL_MAX_SCORE,
  formatHomeVisitDateTime,
  todayIsoDate,
  addDaysIso,
  readJson,
  writeJson,
} from '@/data/homevisitVisits';
import {
  MNA_MAX_SCORE,
  SCREEN_9Q_MAX_SCORE,
  STANDARD_TOOLS,
  interpretStandardTool,
} from '@/data/homevisitAssessments';

/* ─── ทะเบียนผู้รับบริการเยี่ยมบ้าน (1.10.12.1) ────────────────────── */

const REGISTRY_SEED = [
  {
    id: 'hvreg-001', hn: '67-00005', name: 'สุดา ปลอดโปร่ง', age: 67, gender: 'หญิง',
    nationalId: '1100400512341', group: 'severeDisability', source: 'hhc',
    district: 'เขตดินแดง', community: 'ชุมชนแฟลตดินแดง 1-2-3',
    address: '48/12 ถนนวิภาวดีรังสิต ซอย 3 แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    home: { lat: 13.7717, lng: 100.556, pinSaved: true },
    responsible: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse',
    registeredDate: '2025-03-11', lastVisitDate: '2026-06-12', visitCount: 8,
    confidential: false, flags: ['bedbound', 'pressureSore'], active: true,
    photoLabel: 'ภาพผู้รับบริการ (ถ่ายเมื่อเยี่ยมครั้งที่ 1)',
    illnessHistory: 'อัมพาตครึ่งซีกขวาหลังเส้นเลือดสมองตีบ พ.ศ. 2567 · ความดันโลหิตสูง · แผลกดทับก้นกบ',
    contactName: 'นางสาวจิตรา ปลอดโปร่ง (บุตรสาว)', contactPhone: '081-234-5678',
    /* แฟ้มครอบครัวระดับครัวเรือน — บันทึกการเยี่ยมทุกครั้งอ่านชุดนี้เป็นค่าตั้งต้น */
    familyMembers: [
      { id: 'fam-67-00005-1', name: 'นางสาวจิตรา ปลอดโปร่ง', relation: 'บุตร', age: '41', health: 'caregiver' },
      { id: 'fam-67-00005-2', name: 'นายสมชาย ปลอดโปร่ง', relation: 'บุตร', age: '38', health: 'ncd' },
    ],
    recordedBy: 'พว.ศิริพร เยี่ยมสุข', recordedAt: '11 มีนาคม 2568 09:20',
  },
  {
    id: 'hvreg-002', hn: '67-00012', name: 'วิชัย รุ่งเรือง', age: 60, gender: 'ชาย',
    nationalId: '3100600298764', group: 'chronic', source: 'hv',
    district: 'เขตห้วยขวาง', community: 'ชุมชนริมคลองบางซื่อ',
    address: '109 ถนนประชาสงเคราะห์ 26 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    home: { lat: 13.7734, lng: 100.5769, pinSaved: true },
    responsible: 'พว.กาญจนา ถึงบ้าน', profession: 'nurse',
    registeredDate: '2025-11-04', lastVisitDate: '2026-07-10', visitCount: 5,
    confidential: false, flags: [], active: true,
    illnessHistory: 'เบาหวานชนิดที่ 2 · ความดันโลหิตสูง · ควบคุมน้ำตาลไม่ได้ ขาดนัด 2 ครั้ง',
    contactName: 'นางสมพร รุ่งเรือง (ภรรยา)', contactPhone: '089-777-1120',
    recordedBy: 'พว.กาญจนา ถึงบ้าน', recordedAt: '4 พฤศจิกายน 2568 13:45',
  },
  {
    id: 'hvreg-003', hn: '67-00018', name: 'ธีรเดช อัครพงศ์', age: 55, gender: 'ชาย',
    nationalId: '1102700884512', group: 'terminal', source: 'hhc',
    district: 'เขตพญาไท', community: 'ชุมชนวัดไผ่ตัน',
    address: '77/3 ถนนราชวิถี ซอย 4 แขวงสามเสนใน เขตพญาไท กรุงเทพมหานคร 10400',
    home: { lat: 13.7818, lng: 100.5288, pinSaved: true },
    responsible: 'นพ.ธนวัฒน์ เมตตา', profession: 'doctor',
    registeredDate: '2026-02-02', lastVisitDate: '2026-07-30', visitCount: 12,
    confidential: true, flags: ['palliative', 'oxygen'], active: true,
    illnessHistory: 'มะเร็งปอดระยะแพร่กระจาย · ปวดเรื้อรังควบคุมด้วยมอร์ฟีน · ใช้ออกซิเจนที่บ้าน',
    contactName: 'นางพิกุล อัครพงศ์ (ภรรยา)', contactPhone: '086-543-2211',
    recordedBy: 'นพ.ธนวัฒน์ เมตตา', recordedAt: '2 กุมภาพันธ์ 2569 10:05',
  },
  {
    id: 'hvreg-004', hn: '67-00027', name: 'จิราพร มณีโชติ', age: 23, gender: 'หญิง',
    nationalId: '1409901234560', group: 'curable', source: 'motherChildHv',
    district: 'เขตดินแดง', community: 'ชุมชนประชาสงเคราะห์ 24',
    address: '15/44 ซอยดินแดง 1 แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    home: { lat: 13.7771, lng: 100.5497, pinSaved: true },
    responsible: 'พว.ดวงพร ห่วงใย', profession: 'nurse',
    registeredDate: '2026-07-28', lastVisitDate: '2026-08-01', visitCount: 1,
    confidential: false, flags: [], active: true,
    illnessHistory: 'มารดาหลังคลอดปกติ 5 วัน · ทารกน้ำหนัก 3,050 กรัม กินนมแม่อย่างเดียว',
    contactName: 'นายสมพงษ์ มณีโชติ (สามี)', contactPhone: '092-118-4477',
    recordedBy: 'พว.ดวงพร ห่วงใย', recordedAt: '28 กรกฎาคม 2569 15:30',
  },
  {
    id: 'hvreg-005', hn: '67-00003', name: 'ปริญญา รัตนา', age: 54, gender: 'หญิง',
    nationalId: '3101200477883', group: 'mildDisability', source: 'healthDeskHv',
    district: 'เขตห้วยขวาง', community: 'ชุมชนรุ่งมณีพัฒนา',
    address: '223 ถนนประชาสงเคราะห์ 26 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    home: { lat: 13.7734, lng: 100.5832, pinSaved: true },
    responsible: 'กภ.ณัฐวุฒิ ฟื้นฟู', profession: 'physio',
    registeredDate: '2026-01-19', lastVisitDate: '2026-07-18', visitCount: 4,
    confidential: false, flags: ['fallRisk'], active: true,
    illnessHistory: 'อ่อนแรงซีกซ้ายหลังอุบัติเหตุ · เดินด้วยเครื่องช่วยเดิน · เคยหกล้มในบ้าน 1 ครั้ง',
    contactName: 'นายกิตติพงษ์ รัตนา (บุตรชาย)', contactPhone: '083-909-2244',
    recordedBy: 'กภ.ณัฐวุฒิ ฟื้นฟู', recordedAt: '19 มกราคม 2569 11:10',
  },
  {
    id: 'hvreg-006', hn: '67-00021', name: 'วรรณภา ทองดี', age: 50, gender: 'หญิง',
    nationalId: '3100900556670', group: 'chronic', source: 'centerFound',
    district: 'เขตดินแดง', community: 'ชุมชนแฟลตดินแดง 4-5-6',
    address: '9/88 ซอยประชาสงเคราะห์ 12 แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    home: { lat: 13.7663, lng: 100.5476, pinSaved: true },
    responsible: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse',
    registeredDate: '2025-09-08', lastVisitDate: todayIsoDate(), visitCount: 6,
    confidential: false, flags: [], active: true,
    illnessHistory: 'ไตวายเรื้อรังระยะที่ 4 · ความดันโลหิตสูง · จำกัดน้ำและโปรตีน',
    contactName: 'นายประเสริฐ ทองดี (สามี)', contactPhone: '081-556-3312',
    recordedBy: 'พว.ศิริพร เยี่ยมสุข', recordedAt: '8 กันยายน 2568 14:00',
  },
  {
    id: 'hvreg-007', hn: '67-00014', name: 'ชัยวัฒน์ ก้องเกียรติ', age: 47, gender: 'ชาย',
    nationalId: '1103300221142', group: 'severeDisability', source: 'hhc',
    district: 'เขตพญาไท', community: 'ชุมชนซอยอารีย์สัมพันธ์',
    address: '66/2 ถนนมิตรไมตรี แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    home: { lat: 13.7746, lng: 100.533, pinSaved: true },
    responsible: 'พว.ดวงพร ห่วงใย', profession: 'nurse',
    registeredDate: '2024-12-02', lastVisitDate: '2026-01-15', visitCount: 9,
    confidential: false, flags: ['bedbound', 'tubeFeeding'], active: true,
    illnessHistory: 'บาดเจ็บไขสันหลังระดับ C5 · ให้อาหารทางสายยาง · คาสายสวนปัสสาวะ',
    contactName: 'นางอารีย์ ก้องเกียรติ (มารดา)', contactPhone: '086-221-9987',
    recordedBy: 'พว.ดวงพร ห่วงใย', recordedAt: '2 ธันวาคม 2567 09:35',
  },
  {
    id: 'hvreg-008', hn: '67-00011', name: 'อรอุมา ดวงสว่าง', age: 48, gender: 'หญิง',
    nationalId: '3120100998872', group: 'special', source: 'healthDeskHv',
    district: 'เขตดินแดง', community: 'ชุมชนซอยประชาสงเคราะห์ 12',
    address: '5/7 ซอยประชาสงเคราะห์ 12 แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    home: { lat: 13.7681, lng: 100.5602, pinSaved: true },
    responsible: 'นสค.ปิยะ ช่วยชุมชน', profession: 'social',
    registeredDate: '2025-05-06', lastVisitDate: '2026-05-06', visitCount: 2,
    confidential: true, flags: ['alone'], active: true,
    illnessHistory: 'กลุ่มพิเศษ — อยู่ลำพัง ไม่มีผู้ดูแล · ซึมเศร้าเรื้อรัง · ขาดรายได้',
    contactName: 'อสส.บุญมี รักชุมชน (ผู้ประสาน)', contactPhone: '087-441-2003',
    recordedBy: 'นสค.ปิยะ ช่วยชุมชน', recordedAt: '6 พฤษภาคม 2568 16:20',
  },
  {
    id: 'hvreg-009', hn: '67-00009', name: 'กิตติ ศรีสมบูรณ์', age: 52, gender: 'ชาย',
    nationalId: '3100200334453', group: 'chronic', source: 'hv',
    district: 'เขตห้วยขวาง', community: 'ชุมชนตลาดห้วยขวาง',
    address: '18 ซอยรัชดาภิเษก 7 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    home: { lat: 13.7806, lng: 100.5874, pinSaved: true },
    responsible: 'พว.กาญจนา ถึงบ้าน', profession: 'nurse',
    registeredDate: '2026-03-15', lastVisitDate: '2026-07-25', visitCount: 3,
    confidential: false, flags: [], active: true,
    illnessHistory: 'ถุงลมโป่งพองจากการสูบบุหรี่ · หอบเหนื่อยเมื่อออกแรง',
    contactName: 'นางมณี ศรีสมบูรณ์ (ภรรยา)', contactPhone: '085-330-1188',
    recordedBy: 'พว.กาญจนา ถึงบ้าน', recordedAt: '15 มีนาคม 2569 10:50',
  },
  {
    id: 'hvreg-010', hn: '67-00025', name: 'ภาสกร ชาญฉลาด', age: 41, gender: 'ชาย',
    nationalId: '1101800776656', group: 'special', source: 'healthDeskHv',
    district: 'เขตห้วยขวาง', community: 'ชุมชนใต้ทางด่วนรัชดา',
    address: '4 ซอยพระราม 9 ซอย 41 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    home: null,
    responsible: 'นสค.ปิยะ ช่วยชุมชน', profession: 'social',
    registeredDate: '2025-08-14', lastVisitDate: '2025-08-14', visitCount: 1,
    confidential: true, flags: ['alone', 'infection'], active: true,
    illnessHistory: 'ผู้ป่วยไร้บ้านมีที่พักชั่วคราว · วัณโรคปอดรักษาครบแล้ว เฝ้าระวังการกลับเป็นซ้ำ',
    contactName: 'อสส.บุญมี รักชุมชน (ผู้ประสาน)', contactPhone: '087-441-2003',
    recordedBy: 'นสค.ปิยะ ช่วยชุมชน', recordedAt: '14 สิงหาคม 2568 11:15',
  },
  {
    id: 'hvreg-011', hn: '67-00007', name: 'มาลี อ่อนน้อม', age: 45, gender: 'หญิง',
    nationalId: '3101100443324', group: 'curable', source: 'hv',
    district: 'เขตห้วยขวาง', community: 'ชุมชนประชาราษฎร์บำเพ็ญ',
    address: '31 ถนนประชาสงเคราะห์ 26 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    home: { lat: 13.777, lng: 100.5706, pinSaved: true },
    responsible: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse',
    registeredDate: '2026-07-20', lastVisitDate: todayIsoDate(), visitCount: 2,
    confidential: false, flags: [], active: true,
    illnessHistory: 'แผลผ่าตัดหน้าท้องหลังจำหน่ายจากโรงพยาบาล · ไม่มีโรคประจำตัว',
    contactName: 'นายวีระ อ่อนน้อม (สามี)', contactPhone: '084-778-9911',
    recordedBy: 'พว.ศิริพร เยี่ยมสุข', recordedAt: '20 กรกฎาคม 2569 09:05',
  },
  {
    id: 'hvreg-012', hn: '67-00017', name: 'ภัคจิรา วงศ์อนันต์', age: 41, gender: 'หญิง',
    nationalId: '3130200665549', group: 'mildDisability', source: 'hhc',
    district: 'เขตดินแดง', community: 'ชุมชนแฟลตดินแดง 7-8',
    address: '88 ถนนมิตรไมตรี แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    home: { lat: 13.7753, lng: 100.5602, pinSaved: true },
    responsible: 'กภ.ณัฐวุฒิ ฟื้นฟู', profession: 'physio',
    registeredDate: '2025-10-01', lastVisitDate: '2026-07-28', visitCount: 6,
    confidential: false, flags: ['fallRisk'], active: true,
    illnessHistory: 'ข้อเข่าเสื่อมทั้งสองข้าง · น้ำหนักเกิน · เดินได้ระยะสั้น',
    contactName: 'นางสาวปทุม วงศ์อนันต์ (บุตรสาว)', contactPhone: '090-224-6677',
    recordedBy: 'กภ.ณัฐวุฒิ ฟื้นฟู', recordedAt: '1 ตุลาคม 2568 08:55',
  },
];

const REGISTRY_OVERLAY_KEY = 'mih:homevisit:registry-overlay';
const REGISTRY_CANCEL_KEY = 'mih:homevisit:registry-cancelled';

/** Seed + สิ่งที่ผู้ใช้สร้าง/แก้ใน session นี้ (แก้ทับด้วย id). */
export const getRegistryEntries = () => {
  const overlay = readJson(REGISTRY_OVERLAY_KEY, {});
  const merged = REGISTRY_SEED.map((row) => (overlay[row.id] ? { ...row, ...overlay[row.id] } : row));
  const created = Object.values(overlay).filter(
    (row) => !REGISTRY_SEED.some((seed) => seed.id === row.id),
  );
  return [...created, ...merged];
};

export const findRegistryEntryByHn = (hn) =>
  getRegistryEntries().find((row) => row.hn === hn) || null;

export const findRegistryEntryById = (id) =>
  getRegistryEntries().find((row) => row.id === id) || null;

/** บันทึก/แก้ไข — ประทับ ผู้บันทึก / ผู้แก้ไข + เวลา (audit trail). */
export const upsertRegistryEntry = (entry) => {
  const overlay = readJson(REGISTRY_OVERLAY_KEY, {});
  const isNew = !entry.id;
  const id = entry.id || `hvreg-${Date.now()}`;
  const prev = overlay[id] || REGISTRY_SEED.find((row) => row.id === id) || {};
  const stamped = {
    ...prev,
    ...entry,
    id,
    ...(isNew
      ? { recordedBy: HOMEVISIT_CURRENT_USER, recordedAt: formatHomeVisitDateTime() }
      : { editedBy: HOMEVISIT_CURRENT_USER, editedAt: formatHomeVisitDateTime() }),
  };
  writeJson(REGISTRY_OVERLAY_KEY, { ...overlay, [id]: stamped });
  return stamped;
};

/** ยกเลิกทะเบียน — ต้องมีเหตุผล; แถวยังแสดงอยู่ (เทา) และเปิดใช้งานใหม่ได้. */
export const cancelRegistryEntry = (id, reason) => {
  const all = readJson(REGISTRY_CANCEL_KEY, {});
  writeJson(REGISTRY_CANCEL_KEY, {
    ...all,
    [id]: { reason, by: HOMEVISIT_CURRENT_USER, at: formatHomeVisitDateTime() },
  });
};

export const reactivateRegistryEntry = (id) => {
  const all = readJson(REGISTRY_CANCEL_KEY, {});
  const { [id]: _removed, ...rest } = all;
  writeJson(REGISTRY_CANCEL_KEY, rest);
};

export const getRegistryCancellation = (id) =>
  readJson(REGISTRY_CANCEL_KEY, {})[id] || null;

/* ─── อ่านบัตรประชาชน (smart card) — mock integration ────────────────
   คืน null เมื่อ "ไม่มีบัตร/อ่านไม่สำเร็จ" เพื่อให้หน้าจอเดโม fallback
   เป็นการกรอกมือได้ตามที่ TOR กำหนด. */

const SMARTCARD_POOL = [
  {
    nationalId: '1100400512341', name: 'สุดา ปลอดโปร่ง', gender: 'หญิง', age: 67,
    address: '48/12 ถนนวิภาวดีรังสิต ซอย 3 แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    district: 'เขตดินแดง', hn: '67-00005',
  },
  {
    nationalId: '3100600298764', name: 'วิชัย รุ่งเรือง', gender: 'ชาย', age: 60,
    address: '109 ถนนประชาสงเคราะห์ 26 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    district: 'เขตห้วยขวาง', hn: '67-00012',
  },
  {
    nationalId: '1103300221142', name: 'ชัยวัฒน์ ก้องเกียรติ', gender: 'ชาย', age: 47,
    address: '66/2 ถนนมิตรไมตรี แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    district: 'เขตพญาไท', hn: '67-00014',
  },
  {
    nationalId: '1409901234560', name: 'จิราพร มณีโชติ', gender: 'หญิง', age: 23,
    address: '15/44 ซอยดินแดง 1 แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    district: 'เขตดินแดง', hn: '67-00027',
  },
];

const SMARTCARD_KEY = 'mih:homevisit:smartcard-present';

/** สลับสถานะ "มีบัตรเสียบอยู่หรือไม่" เพื่อเดโม state อ่านบัตรไม่สำเร็จ. */
export const getSmartCardPresent = () => readJson(SMARTCARD_KEY, true);
export const setSmartCardPresent = (present) => writeJson(SMARTCARD_KEY, !!present);

/** อ่านบัตร — คืน null เมื่อไม่มีบัตร/เครื่องอ่านไม่พร้อม (ให้กรอกมือแทน). */
export const readSmartCard = (index = null) => {
  if (!getSmartCardPresent()) return null;
  const i = Number.isFinite(index)
    ? index % SMARTCARD_POOL.length
    : Math.floor(Math.random() * SMARTCARD_POOL.length);
  return { ...SMARTCARD_POOL[i], readAt: formatHomeVisitDateTime() };
};

/* ─── ประวัติการเยี่ยมบ้านย้อนหลัง (1.18.3 / 1.10.12.4) ──────────────
   แต่ละรายการคือการเยี่ยม 1 ครั้ง พร้อมผลตรวจร่างกาย (vitals) และคะแนน ADL
   เพื่อให้หน้าติดตามวาดกราฟแนวโน้มได้ทันที. */

const VISIT_HISTORY_SEED = {
  '67-00005': [
    { no: 1, date: '2025-03-18', by: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse', adl: 3, vitals: { temp: '36.8', pulse: '84', respiration: '20', oxygen: '96', sys: '148', dia: '88', weight: '52', height: '156' }, summary: 'ประเมินแรกรับ ผู้ป่วยติดเตียง มีแผลกดทับระยะ 2', orders: 'ชุดทำแผลปลอดเชื้อ · ทำแผลสัปดาห์ละ 2 ครั้ง' },
    { no: 2, date: '2025-07-22', by: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse', adl: 4, vitals: { temp: '36.6', pulse: '80', respiration: '18', oxygen: '97', sys: '142', dia: '86', weight: '51', height: '156' }, summary: 'แผลกดทับขนาดลดลง ญาติพลิกตะแคงตัวสม่ำเสมอ', orders: 'ชุดทำแผลปลอดเชื้อ' },
    { no: 3, date: '2025-12-09', by: 'กภ.ณัฐวุฒิ ฟื้นฟู', profession: 'physio', adl: 5, vitals: { temp: '36.5', pulse: '78', respiration: '18', oxygen: '97', sys: '138', dia: '84', weight: '51', height: '156' }, summary: 'เริ่มฝึกนั่งข้างเตียงได้ 10 นาที', orders: 'กายภาพบำบัดที่บ้านสัปดาห์ละ 1 ครั้ง' },
    { no: 4, date: '2026-03-05', by: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse', adl: 6, vitals: { temp: '36.7', pulse: '76', respiration: '18', oxygen: '98', sys: '134', dia: '82', weight: '52', height: '156' }, summary: 'แผลกดทับหายสนิท คงการดูแลผิวหนังต่อเนื่อง', orders: 'ไม่มีคำสั่งการรักษา' },
    { no: 5, date: '2026-06-12', by: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse', adl: 7, vitals: { temp: '36.6', pulse: '74', respiration: '18', oxygen: '98', sys: '130', dia: '80', weight: '53', height: '156' }, summary: 'ลุกนั่งได้เอง ญาติดูแลดี วางแผนฝึกยืน', orders: 'กายภาพบำบัดที่บ้านสัปดาห์ละ 1 ครั้ง' },
  ],
  '67-00012': [
    { no: 1, date: '2025-11-12', by: 'พว.กาญจนา ถึงบ้าน', profession: 'nurse', adl: 18, vitals: { temp: '36.7', pulse: '88', respiration: '20', oxygen: '97', sys: '162', dia: '98', weight: '82', height: '168' }, summary: 'ความดันสูง ผู้ป่วยขาดยา 2 สัปดาห์', orders: 'ยาลดความดัน Amlodipine 5 มก. (1x1 เช้า) · DTX เจาะน้ำตาลปลายนิ้ว' },
    { no: 2, date: '2026-02-18', by: 'พว.กาญจนา ถึงบ้าน', profession: 'nurse', adl: 18, vitals: { temp: '36.5', pulse: '84', respiration: '18', oxygen: '98', sys: '150', dia: '92', weight: '81', height: '168' }, summary: 'เริ่มรับประทานยาสม่ำเสมอ น้ำตาลยังสูง', orders: 'ยาเบาหวาน Metformin 500 มก. (1x2 หลังอาหาร)' },
    { no: 3, date: '2026-04-30', by: 'ภก.อรทัย จัดยา', profession: 'pharmacist', adl: 19, vitals: { temp: '36.6', pulse: '80', respiration: '18', oxygen: '98', sys: '142', dia: '88', weight: '80', height: '168' }, summary: 'ทบทวนยา พบยาซ้ำซ้อน 2 รายการ ปรับให้เหลือชุดเดียว', orders: 'ไม่มีคำสั่งการรักษา' },
    { no: 4, date: '2026-07-10', by: 'พว.กาญจนา ถึงบ้าน', profession: 'nurse', adl: 19, vitals: { temp: '36.6', pulse: '78', respiration: '18', oxygen: '98', sys: '136', dia: '84', weight: '79', height: '168' }, summary: 'ความดันและน้ำตาลดีขึ้น แนะนำควบคุมอาหารต่อเนื่อง', orders: 'HbA1c — น้ำตาลสะสม' },
  ],
  '67-00018': [
    { no: 1, date: '2026-02-14', by: 'นพ.ธนวัฒน์ เมตตา', profession: 'doctor', adl: 8, vitals: { temp: '37.1', pulse: '96', respiration: '24', oxygen: '92', sys: '118', dia: '72', weight: '58', height: '170' }, summary: 'เริ่มดูแลแบบประคับประคอง ปวดระดับ 6/10', orders: 'มอร์ฟีนชนิดน้ำ (ผู้ป่วยประคับประคอง)' },
    { no: 2, date: '2026-04-08', by: 'นพ.ธนวัฒน์ เมตตา', profession: 'doctor', adl: 6, vitals: { temp: '37.0', pulse: '98', respiration: '24', oxygen: '91', sys: '114', dia: '70', weight: '55', height: '170' }, summary: 'ปวดควบคุมได้ดีขึ้น เพิ่มออกซิเจนที่บ้าน', orders: 'ให้ออกซิเจนที่บ้าน 2 ลิตร/นาที' },
    { no: 3, date: '2026-06-11', by: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse', adl: 4, vitals: { temp: '37.2', pulse: '102', respiration: '26', oxygen: '90', sys: '110', dia: '68', weight: '52', height: '170' }, summary: 'อ่อนเพลียมากขึ้น ครอบครัวต้องการดูแลที่บ้านต่อ', orders: 'อาหารทางการแพทย์สูตรครบถ้วน' },
    { no: 4, date: '2026-07-30', by: 'นพ.ธนวัฒน์ เมตตา', profession: 'doctor', adl: 3, vitals: { temp: '37.3', pulse: '104', respiration: '26', oxygen: '89', sys: '106', dia: '66', weight: '50', height: '170' }, summary: 'ทบทวนแผนการดูแลระยะท้ายร่วมกับครอบครัว', orders: 'มอร์ฟีนชนิดน้ำ (ผู้ป่วยประคับประคอง)' },
  ],
  '67-00003': [
    { no: 1, date: '2026-01-26', by: 'กภ.ณัฐวุฒิ ฟื้นฟู', profession: 'physio', adl: 12, vitals: { temp: '36.5', pulse: '76', respiration: '18', oxygen: '98', sys: '128', dia: '80', weight: '64', height: '158' }, summary: 'ประเมินแรกรับ เดินด้วย walker ได้ 10 เมตร', orders: 'กายภาพบำบัดที่บ้านสัปดาห์ละ 1 ครั้ง' },
    { no: 2, date: '2026-03-30', by: 'กภ.ณัฐวุฒิ ฟื้นฟู', profession: 'physio', adl: 14, vitals: { temp: '36.6', pulse: '74', respiration: '18', oxygen: '98', sys: '126', dia: '78', weight: '64', height: '158' }, summary: 'เดินได้ 20 เมตร ปรับสภาพบ้านติดราวจับห้องน้ำ', orders: 'ไม่มีคำสั่งการรักษา' },
    { no: 3, date: '2026-05-22', by: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse', adl: 15, vitals: { temp: '36.4', pulse: '72', respiration: '18', oxygen: '99', sys: '124', dia: '78', weight: '63', height: '158' }, summary: 'ไม่มีการหกล้มซ้ำ ประเมินความเสี่ยงลดลง', orders: 'ไม่มีคำสั่งการรักษา' },
    { no: 4, date: '2026-07-18', by: 'กภ.ณัฐวุฒิ ฟื้นฟู', profession: 'physio', adl: 16, vitals: { temp: '36.5', pulse: '72', respiration: '18', oxygen: '99', sys: '122', dia: '76', weight: '63', height: '158' }, summary: 'เดินในบ้านได้เอง ใช้ไม้เท้าแทน walker', orders: 'ไม่มีคำสั่งการรักษา' },
  ],
  '67-00021': [
    { no: 1, date: '2025-09-15', by: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse', adl: 20, vitals: { temp: '36.5', pulse: '78', respiration: '18', oxygen: '98', sys: '150', dia: '90', weight: '58', height: '160' }, summary: 'แรกรับ ประเมินการจำกัดน้ำและโปรตีน', orders: 'BUN/Creatinine — การทำงานของไต' },
    { no: 2, date: '2026-01-12', by: 'นภ.พิมพา โภชนาการ', profession: 'nutrition', adl: 20, vitals: { temp: '36.6', pulse: '76', respiration: '18', oxygen: '98', sys: '144', dia: '88', weight: '57', height: '160' }, summary: 'ปรับอาหารลดเค็ม จำกัดโปรตีน 0.8 g/kg', orders: 'ไม่มีคำสั่งการรักษา' },
    { no: 3, date: '2026-05-19', by: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse', adl: 20, vitals: { temp: '36.5', pulse: '74', respiration: '18', oxygen: '99', sys: '138', dia: '84', weight: '56', height: '160' }, summary: 'ค่าไตทรงตัว ยังไม่ต้องฟอกไต', orders: 'BUN/Creatinine — การทำงานของไต' },
  ],
  '67-00014': [
    { no: 1, date: '2025-01-20', by: 'พว.ดวงพร ห่วงใย', profession: 'nurse', adl: 2, vitals: { temp: '36.8', pulse: '86', respiration: '20', oxygen: '96', sys: '112', dia: '70', weight: '54', height: '172' }, summary: 'แรกรับหลังบาดเจ็บไขสันหลัง ให้อาหารทางสายยาง', orders: 'เปลี่ยนสายให้อาหารทางจมูกทุก 4 สัปดาห์' },
    { no: 2, date: '2025-07-14', by: 'พว.ดวงพร ห่วงใย', profession: 'nurse', adl: 2, vitals: { temp: '36.9', pulse: '84', respiration: '20', oxygen: '96', sys: '110', dia: '68', weight: '53', height: '172' }, summary: 'ติดเชื้อทางเดินปัสสาวะ 1 ครั้ง รักษาหายแล้ว', orders: 'Urine Analysis — ตรวจปัสสาวะ' },
    { no: 3, date: '2026-01-15', by: 'พว.ดวงพร ห่วงใย', profession: 'nurse', adl: 3, vitals: { temp: '36.7', pulse: '82', respiration: '18', oxygen: '97', sys: '114', dia: '72', weight: '55', height: '172' }, summary: 'สภาพทั่วไปคงที่ ญาติดูแลได้ดี', orders: 'เปลี่ยนสายสวนปัสสาวะทุก 4 สัปดาห์' },
  ],
  /* กลุ่ม "รักษาหายได้" โควตา สปสช. 4 ครั้ง/ปีงบ — รายนี้ใช้ครบแล้วในปีงบ
     ปัจจุบัน จึงเป็นเคสตัวอย่างของการล็อก/ขออนุมัติเยี่ยมนอกโควตา (§1.18.1). */
  '67-00027': [
    { no: 1, date: '2026-07-28', by: 'พว.ดวงพร ห่วงใย', profession: 'nurse', adl: 20, vitals: { temp: '36.9', pulse: '84', respiration: '18', oxygen: '98', sys: '116', dia: '74', weight: '60', height: '160' }, summary: 'เยี่ยมหลังคลอดครั้งที่ 1 ประเมินแผลผ่าคลอดและการให้นม', orders: 'ไม่มีคำสั่งการรักษา' },
    { no: 2, date: '2026-08-01', by: 'พว.ดวงพร ห่วงใย', profession: 'nurse', adl: 20, vitals: { temp: '36.8', pulse: '80', respiration: '18', oxygen: '99', sys: '112', dia: '72', weight: '58', height: '160' }, summary: 'เยี่ยมหลังคลอดครั้งที่ 2 มารดาและทารกปกติ', orders: 'ไม่มีคำสั่งการรักษา' },
    { no: 3, date: '2026-08-08', by: 'พว.ดวงพร ห่วงใย', profession: 'nurse', adl: 20, vitals: { temp: '36.7', pulse: '78', respiration: '18', oxygen: '99', sys: '110', dia: '70', weight: '57', height: '160' }, summary: 'เยี่ยมหลังคลอดครั้งที่ 3 น้ำหนักทารกขึ้นตามเกณฑ์', orders: 'ไม่มีคำสั่งการรักษา' },
    { no: 4, date: '2026-08-14', by: 'พว.ดวงพร ห่วงใย', profession: 'nurse', adl: 20, vitals: { temp: '36.6', pulse: '76', respiration: '18', oxygen: '99', sys: '110', dia: '70', weight: '57', height: '160' }, summary: 'เยี่ยมหลังคลอดครั้งที่ 4 (ครบสิทธิ) มารดาฟื้นตัวดี ทารกกินนมแม่อย่างเดียว', orders: 'ไม่มีคำสั่งการรักษา' },
  ],
};

const VISIT_HISTORY_OVERLAY_KEY = 'mih:homevisit:visit-history';

/** ประวัติการเยี่ยมทั้งหมดของผู้รับบริการ (seed + ที่บันทึกใน session นี้). */
/* ผู้รับบริการที่ยังไม่มีประวัติใน seed — สร้างประวัติจำลองจาก HN แบบคงที่
   (มติผู้ใช้ 30 ส.ค. 69) ป๊อปอัป "ประวัติการเยี่ยมบ้าน" เดิมว่างเปล่าสำหรับคนส่วนใหญ่
   ค่าเดียวกันทุกครั้งที่เปิด เพราะสุ่มจากผลรวมรหัสตัวอักษรของ HN ไม่ใช่ Math.random */
const MOCK_VISITORS = [
  { by: 'พว.ศิริพร เยี่ยมสุข',   profession: 'nurse'  },
  { by: 'พว.ดวงพร ห่วงใย',      profession: 'nurse'  },
  { by: 'กภ.ณัฐวุฒิ ฟื้นฟู',     profession: 'physio' },
  { by: 'นสค.ปิยะ ช่วยชุมชน',    profession: 'social' },
  { by: 'นพ.ธนวัฒน์ เมตตา',      profession: 'doctor' },
];

const MOCK_SUMMARIES = [
  'ประเมินแรกรับ อาการคงที่ ญาติดูแลได้ดี',
  'ทบทวนการใช้ยาที่บ้าน ไม่พบยาซ้ำซ้อน',
  'ปรับสภาพบ้านลดความเสี่ยงพลัดตกหกล้ม',
  'ให้คำแนะนำโภชนาการและการดื่มน้ำ',
  'ติดตามแผลและการทำแผลโดยญาติ',
  'อาการทั่วไปดีขึ้น นัดติดตามตามรอบกลุ่ม',
];

const MOCK_ORDERS = [
  'ไม่มีคำสั่งการรักษา',
  'ชุดทำแผลปลอดเชื้อ · ทำแผลสัปดาห์ละ 2 ครั้ง',
  'กายภาพบำบัดที่บ้านสัปดาห์ละ 1 ครั้ง',
  'BUN/Creatinine — การทำงานของไต',
];

const hnSeedNumber = (hn = '') => String(hn).split('').reduce((a, c) => a + c.charCodeAt(0), 0);

const buildMockVisitHistory = (hn) => {
  const seed = hnSeedNumber(hn);
  const rounds = 2 + (seed % 3); /* 2–4 ครั้ง */
  return Array.from({ length: rounds }).map((_, i) => {
    const v = MOCK_VISITORS[(seed + i) % MOCK_VISITORS.length];
    /* ไล่ย้อนหลังจากวันนี้ทีละ ~4 เดือน ครั้งที่ 1 เก่าสุด */
    const daysAgo = (rounds - i) * 120 - (seed % 30);
    return {
      no: i + 1,
      date: addDaysIso(todayIsoDate(), -daysAgo),
      by: v.by,
      profession: v.profession,
      adl: 6 + ((seed + i * 3) % 15),
      vitals: {
        temp: (36.3 + ((seed + i) % 8) / 10).toFixed(1),
        pulse: String(70 + ((seed + i * 5) % 25)),
        respiration: String(16 + ((seed + i) % 6)),
        oxygen: String(95 + ((seed + i) % 5)),
        sys: String(110 + ((seed + i * 7) % 40)),
        dia: String(68 + ((seed + i * 3) % 20)),
        weight: String(48 + ((seed + i) % 25)),
        height: String(150 + ((seed) % 25)),
      },
      summary: MOCK_SUMMARIES[(seed + i) % MOCK_SUMMARIES.length],
      orders: MOCK_ORDERS[(seed + i) % MOCK_ORDERS.length],
      mock: true,
    };
  });
};

/* คะแนนเครื่องมือมาตรฐาน (MNA-SF · 9Q · PPS) ของการเยี่ยมที่บันทึกไว้ก่อนมี
   ขั้น "ประเมินและคัดกรอง" — seed เดิมเก็บแค่ ADL หน้าติดตามจึงวาดแนวโน้ม
   ของเครื่องมือไม่ได้เลยทั้งที่ TOR ๑.๑๐.๑๒.๔ บังคับให้แสดง "ผลการประเมิน"
   ย้อนหลัง. เติมให้แบบคงที่จาก HN + ครั้งที่ (ไม่ใช่ Math.random ค่าจึงไม่
   เปลี่ยนทุกครั้งที่เปิดหน้า) และผูกกับคะแนน ADL ของครั้งนั้น เพื่อให้
   เส้นกราฟไปทางเดียวกับสภาพผู้ป่วยจริง ไม่ใช่ตัวเลขสุ่มที่ขัดกันเอง.
   รายการที่ผู้ใช้บันทึกเองมี `toolScores` มาแล้วจึงไม่ถูกแตะ. */

const clampScore = (v, max) => Math.max(0, Math.min(max, Math.round(v)));

const buildMockToolScores = (hn, entry) => {
  const seed = hnSeedNumber(hn) + (Number(entry.no) || 0);
  const adl = Number.isFinite(entry.adl) ? entry.adl : Math.round(BARTHEL_MAX_SCORE / 2);
  const ratio = adl / BARTHEL_MAX_SCORE; /* 0 = ติดเตียง · 1 = ช่วยเหลือตัวเองได้ */
  return {
    mna: clampScore(4 + ratio * 9 + (seed % 3), MNA_MAX_SCORE),
    /* ยิ่งช่วยเหลือตัวเองไม่ได้ยิ่งมีแนวโน้มซึมเศร้าสูง — กลับทิศกับ ADL */
    '9q': clampScore((1 - ratio) * 14 + (seed % 4), SCREEN_9Q_MAX_SCORE),
    /* PPS เป็นขั้นละ 10% ตามแบบประเมินจริง จึงปัดลงเป็นหลักสิบ */
    pps: Math.max(10, Math.min(100, Math.round((20 + ratio * 70) / 10) * 10)),
  };
};

/** ป้ายสรุปเครื่องมือมาตรฐานของการเยี่ยม 1 ครั้ง (ใช้ในไฟล์ส่งออก/ใบพิมพ์). */
export const formatToolScores = (toolScores = {}) => STANDARD_TOOLS
  .filter((t) => Number.isFinite(Number(toolScores?.[t.key])))
  .map((t) => `${t.name} ${toolScores[t.key]}/${t.max}`)
  .join(' · ');

/** แปลผลทุกเครื่องมือของการเยี่ยม 1 ครั้ง — คืนเฉพาะตัวที่มีคะแนนจริง.
    เก็บคำแปลผลไว้ใน `interp` ไม่ spread ทับ เพราะทั้งสองฝั่งมีคีย์ `label`
    (ชื่อเครื่องมือ vs คำแปลผล) ซึ่งต้องแสดงคู่กัน ไม่ใช่แทนกัน. */
export const describeToolScores = (toolScores = {}) => STANDARD_TOOLS
  .filter((t) => Number.isFinite(Number(toolScores?.[t.key])))
  .map((t) => ({
    ...t,
    total: Number(toolScores[t.key]),
    interp: interpretStandardTool(t.key, toolScores[t.key]),
  }));

const withToolScores = (hn, entry) => {
  const toolScores = entry.toolScores || buildMockToolScores(hn, entry);
  return {
    ...entry,
    toolScores,
    toolsMock: !entry.toolScores,
    tools: entry.tools || formatToolScores(toolScores),
  };
};

export const getVisitHistory = (hn) => {
  if (!hn) return [];
  const overlay = readJson(VISIT_HISTORY_OVERLAY_KEY, {});
  const seeded = VISIT_HISTORY_SEED[hn] || [];
  const base = seeded.length > 0 ? seeded : buildMockVisitHistory(hn);
  return [...base, ...(overlay[hn] || [])]
    .map((entry) => withToolScores(hn, entry))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.no - b.no);
};

/** บันทึกผลการเยี่ยมครั้งนี้เข้าประวัติ (เรียกตอน "ส่งข้อมูลเข้าศูนย์ฯ"). */
export const appendVisitHistory = (hn, record) => {
  if (!hn) return null;
  const overlay = readJson(VISIT_HISTORY_OVERLAY_KEY, {});
  const existing = getVisitHistory(hn);
  const entry = {
    no: existing.length + 1,
    date: record.date || todayIsoDate(),
    by: record.by || HOMEVISIT_CURRENT_USER,
    profession: record.profession || 'nurse',
    adl: record.adl ?? null,
    vitals: record.vitals || {},
    summary: record.summary || '',
    orders: record.orders || 'ไม่มีคำสั่งการรักษา',
    /* คะแนนเครื่องมือมาตรฐานของการเยี่ยมครั้งนี้ — เดิมขั้น "ส่งข้อมูลเข้า
       ศูนย์ฯ" ส่งค่านี้เข้ามาแล้วแต่ถูกทิ้งที่นี่ คอลัมน์ "เครื่องมือมาตรฐาน"
       ในไฟล์ส่งออกจึงว่างเปล่าเสมอ และหน้าติดตามวาดแนวโน้มไม่ได้. */
    toolScores: record.toolScores || {},
    tools: record.tools || formatToolScores(record.toolScores || {}),
    at: formatHomeVisitDateTime(),
  };
  writeJson(VISIT_HISTORY_OVERLAY_KEY, { ...overlay, [hn]: [...(overlay[hn] || []), entry] });
  /* การบันทึกเยี่ยมคือจุดเดียวที่ "เยี่ยมล่าสุด/จำนวนครั้ง" ของทะเบียนต้องขยับ —
     ถ้าไม่อัปเดตที่นี่ แถวจะค้างในแท็บ "เลยกำหนดติดตาม" ตลอด และ visitNo
     ของครั้งถัดไปจะซ้ำ (getVisitFollowUpOverdue / buildHomeVisitForm อ่านค่านี้). */
  const reg = findRegistryEntryByHn(hn);
  if (reg) {
    upsertRegistryEntry({
      id: reg.id,
      lastVisitDate: entry.date,
      visitCount: (Number(reg.visitCount) || 0) + 1,
    });
  }
  return entry;
};

/* สมาชิกในครอบครัวรายครัวเรือน (mock) — เขียนเป็นรายชื่อจริงต่อ HN แทนการ
   ปั้นชื่อจากเทมเพลต (มติผู้ใช้ 30 ส.ค. 69) เพื่อให้ตารางแฟ้มครอบครัวอ่านได้
   เหมือนของจริง: นามสกุลตรงกับผู้รับบริการ · อายุสมเหตุสมผลกับอายุเจ้าของแฟ้ม ·
   ขนาดครัวเรือนต่างกัน 1–4 คนตามบริบทของแต่ละเคส (คนอยู่คนเดียว · อยู่กับคู่สมรส ·
   สามรุ่นในบ้านเดียว) · `health` ใช้ค่า value ของ FAMILY_HEALTH_OPTIONS */
const MOCK_FAMILY_BY_HN = {
  /* ติดเตียงหลังเส้นเลือดสมองตีบ — บุตรสาวลาออกจากงานมาดูแล อยู่กัน 3 คน */
  '67-00012': [
    { name: 'สมพร รุ่งเรือง', relation: 'คู่สมรส', age: '58', health: 'ncd' },
    { name: 'ณัฐพล รุ่งเรือง', relation: 'บุตร', age: '31', health: 'away' },
    { name: 'ณัฐริกา รุ่งเรือง', relation: 'บุตร', age: '27', health: 'caregiver' },
  ],
  /* ผู้ป่วยระยะสุดท้าย — ภรรยาดูแลหลัก มีหลานเล็กอยู่ด้วย */
  '67-00018': [
    { name: 'ปราณี อัครพงศ์', relation: 'คู่สมรส', age: '52', health: 'caregiver' },
    { name: 'ธนกฤต อัครพงศ์', relation: 'บุตร', age: '26', health: 'healthy' },
    { name: 'ด.ญ.พิมพ์ชนก อัครพงศ์', relation: 'หลาน', age: '6', health: 'child' },
  ],
  /* มารดาหลังคลอด — อยู่กับสามีและทารก */
  '67-00027': [
    { name: 'อนุชา มณีโชติ', relation: 'คู่สมรส', age: '26', health: 'healthy' },
    { name: 'ด.ช.ปุณณ์ มณีโชติ', relation: 'บุตร', age: '0', health: 'child' },
  ],
  /* หกล้มบ่อย เดินด้วย walker — อยู่กับน้องสาวสองคน */
  '67-00003': [
    { name: 'ปราณีต รัตนา', relation: 'พี่/น้อง', age: '49', health: 'ncd' },
  ],
  /* โรคไตเรื้อรัง — สามีเป็นผู้ดูแลหลัก บุตรทำงานต่างจังหวัด */
  '67-00021': [
    { name: 'สมศักดิ์ ทองดี', relation: 'คู่สมรส', age: '54', health: 'caregiver' },
    { name: 'พิมพ์ใจ ทองดี', relation: 'บุตร', age: '24', health: 'away' },
  ],
  /* บาดเจ็บไขสันหลัง ให้อาหารทางสายยาง — มารดาสูงอายุกับพี่สาวช่วยกันดูแล */
  '67-00014': [
    { name: 'บุญมี ก้องเกียรติ', relation: 'บิดา/มารดา', age: '74', health: 'elderly' },
    { name: 'ชไมพร ก้องเกียรติ', relation: 'พี่/น้อง', age: '50', health: 'caregiver' },
    { name: 'ด.ช.กันตพัฒน์ ก้องเกียรติ', relation: 'หลาน', age: '11', health: 'child' },
  ],
  '67-00011': [
    { name: 'ประเสริฐ ดวงสว่าง', relation: 'คู่สมรส', age: '51', health: 'ncd' },
    { name: 'ธิดารัตน์ ดวงสว่าง', relation: 'บุตร', age: '22', health: 'caregiver' },
  ],
  '67-00009': [
    { name: 'สุนีย์ ศรีสมบูรณ์', relation: 'คู่สมรส', age: '50', health: 'caregiver' },
  ],
  '67-00025': [
    { name: 'จินตนา ชาญฉลาด', relation: 'บิดา/มารดา', age: '68', health: 'elderly' },
  ],
  '67-00007': [
    { name: 'ประจักษ์ อ่อนน้อม', relation: 'คู่สมรส', age: '47', health: 'healthy' },
    { name: 'ด.ญ.ณิชา อ่อนน้อม', relation: 'บุตร', age: '14', health: 'child' },
    { name: 'ด.ช.ณัฐ อ่อนน้อม', relation: 'บุตร', age: '9', health: 'child' },
  ],
  '67-00017': [
    { name: 'วิรัช วงศ์อนันต์', relation: 'คู่สมรส', age: '44', health: 'caregiver' },
  ],
};

/* ครัวเรือนตั้งต้นสำหรับ HN ที่ยังไม่อยู่ในทะเบียนเยี่ยมบ้าน (เปิดบันทึกแบบ
   ad-hoc จากหน้าติดตาม/ลิงก์ตรง) — ตาราง Family Folder เคยว่างเปล่าทั้งใบ
   จนดูไม่ออกว่าคอลัมน์ไหนเก็บอะไร (มติผู้ใช้ 2 ก.ย. 69) */
const DEFAULT_MOCK_FAMILY = [
  { name: 'สมปอง มีสุข', relation: 'คู่สมรส', age: '65', health: 'caregiver' },
  { name: 'ธนกฤต มีสุข', relation: 'บุตร', age: '38', health: 'healthy' },
  { name: 'ด.ญ.ปุณิกา มีสุข', relation: 'หลาน', age: '9', health: 'child' },
];

/* ─── รูปประจำตัวของสมาชิกในครอบครัว ──────────────────────────────
   ทะเบียนครัวเรือนไม่ได้เก็บรูปของสมาชิก (คนที่ไม่ใช่ผู้รับบริการยังไม่มีแฟ้ม
   ของตัวเอง) — ตาราง Family Folder จึงประกอบรูป mock ให้จากชื่อ/ความสัมพันธ์
   แบบคงที่ต่อคน (มติผู้ใช้ 2 ก.ย. 69) ทีมจะได้จำหน้าคนในบ้านได้จากตาราง
   ถ้าวันหนึ่งสมาชิกมีรูปจริง ให้เก็บลง `avatarUrl` ของสมาชิกคนนั้น
   ฟังก์ชันนี้จะคืนรูปจริงก่อนเสมอ */
const FAMILY_ADULT_AVATARS = [
  '/avatars/patient-female-a.png',
  '/avatars/patient-male-d.png',
  '/avatars/patient-female-c.png',
  '/avatars/mock-male-asian-a.png',
  '/avatars/patient-female-e.png',
  '/avatars/patient-male-e.png',
  '/avatars/patient-female-b.png',
  '/avatars/mock-male-asian-c.png',
];

const CHILD_PREFIX_RE = /^(ด\.ช\.|ด\.ญ\.|เด็กชาย|เด็กหญิง)/u;

const hashOf = (text) => Array.from(String(text || ''))
  .reduce((acc, ch) => (acc * 31 + ch.codePointAt(0)) % 100000, 7);

/** รูปประจำตัวของสมาชิกในครอบครัว — รูปจริงก่อน แล้วค่อยเป็นรูป mock คงที่ต่อคน. */
export const familyMemberAvatar = (member) => {
  if (member?.avatarUrl) return member.avatarUrl;
  const name = String(member?.name || '');
  if (CHILD_PREFIX_RE.test(name)) {
    return /^(ด\.ญ\.|เด็กหญิง)/u.test(name)
      ? '/avatars/patient-child-girl.png'
      : '/avatars/patient-child-boy.png';
  }
  const seed = hashOf(`${name}|${member?.relation || ''}`);
  return FAMILY_ADULT_AVATARS[seed % FAMILY_ADULT_AVATARS.length];
};

/** ข้อมูลครัวเรือนตั้งต้นของ HN ที่ยังไม่อยู่ในทะเบียน — คู่กับ
    `DEFAULT_MOCK_FAMILY` เพื่อให้หัวแฟ้มครอบครัวไม่ขึ้น "—" ทั้งแถว */
export const DEFAULT_MOCK_HOUSEHOLD = {
  address: '112/45 ซอยประชาสงเคราะห์ 12 แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
  community: 'ชุมชนแฟลตดินแดง 1-2-3',
  district: 'เขตดินแดง',
  contactName: 'นางสมปอง มีสุข (คู่สมรส)',
  contactPhone: '089-145-2278',
};

const buildMockFamily = (entry) => {
  const rows = (entry && MOCK_FAMILY_BY_HN[entry.hn]) || DEFAULT_MOCK_FAMILY;
  const prefix = entry?.hn || 'default';
  return rows.map((m, i) => ({ id: `fam-${prefix}-${i + 1}`, ...m, mock: true }));
};

/** สมาชิกในครอบครัวของครัวเรือนนี้ — ที่บันทึกไว้จริง มิฉะนั้นเป็นชุด mock
    (HN ที่ยังไม่อยู่ในทะเบียนก็ได้ชุดตั้งต้น ไม่ปล่อยตารางว่าง). */
export const getFamilyMembers = (hn) => {
  const reg = hn ? findRegistryEntryByHn(hn) : null;
  if (reg && (reg.familyMembers || []).length > 0) return reg.familyMembers;
  return buildMockFamily(reg);
};

/** หัวแฟ้มครอบครัว (ที่อยู่ · ชุมชน · เขต · ผู้ติดต่อ) ของครัวเรือนนี้. */
export const getHouseholdProfile = (hn, fallbackEntry = null) => {
  const reg = (hn ? findRegistryEntryByHn(hn) : null) || fallbackEntry;
  if (!reg) return { ...DEFAULT_MOCK_HOUSEHOLD, mock: true };
  return {
    address: reg.address || DEFAULT_MOCK_HOUSEHOLD.address,
    community: reg.community || DEFAULT_MOCK_HOUSEHOLD.community,
    district: reg.district || DEFAULT_MOCK_HOUSEHOLD.district,
    contactName: reg.contactName || DEFAULT_MOCK_HOUSEHOLD.contactName,
    contactPhone: reg.contactPhone || DEFAULT_MOCK_HOUSEHOLD.contactPhone,
  };
};

/** บันทึกสมาชิกในครอบครัวกลับเข้าทะเบียน (ระดับครัวเรือน — S011).
    เรียกตอน "ส่งข้อมูลเข้าศูนย์ฯ" เพื่อให้การเยี่ยมครั้งถัดไปเปิดมาเจอรายชื่อเดิม
    ไม่ต้องพิมพ์ใหม่ทั้งชุด (มติผู้ใช้ 30 ส.ค. 69). */
export const saveFamilyMembers = (hn, familyMembers = []) => {
  if (!hn) return null;
  const reg = findRegistryEntryByHn(hn);
  if (!reg) return null;
  return upsertRegistryEntry({
    id: reg.id,
    familyMembers: familyMembers.map((m) => ({ ...m })),
  });
};

/* ─── ผล Lab / X-ray ย้อนหลัง (1.10.12.4) ─────────────────────────── */

export const HOMEVISIT_LAB_HISTORY = {
  '67-00005': [
    { date: '2025-03-20', test: 'CBC — ความสมบูรณ์ของเม็ดเลือด', result: 'Hb 10.2 g/dL — ซีดเล็กน้อย', abnormal: true },
    { date: '2025-12-10', test: 'Wound culture — เพาะเชื้อจากแผล', result: 'ไม่พบเชื้อก่อโรค', abnormal: false },
    { date: '2026-06-12', test: 'CBC — ความสมบูรณ์ของเม็ดเลือด', result: 'Hb 11.8 g/dL — ดีขึ้น', abnormal: false },
  ],
  '67-00012': [
    { date: '2025-11-12', test: 'DTX เจาะน้ำตาลปลายนิ้ว', result: '212 mg/dL — สูง', abnormal: true },
    { date: '2026-02-18', test: 'DTX เจาะน้ำตาลปลายนิ้ว', result: '178 mg/dL — สูง', abnormal: true },
    { date: '2026-04-30', test: 'HbA1c — น้ำตาลสะสม', result: '8.4% — ยังควบคุมไม่ได้', abnormal: true },
    { date: '2026-07-10', test: 'DTX เจาะน้ำตาลปลายนิ้ว', result: '132 mg/dL — ดีขึ้น', abnormal: false },
    { date: '2026-07-10', test: 'HbA1c — น้ำตาลสะสม', result: '7.1% — ใกล้เป้าหมาย', abnormal: false },
  ],
  '67-00018': [
    { date: '2026-02-14', test: 'CBC — ความสมบูรณ์ของเม็ดเลือด', result: 'Hb 9.6 g/dL — ซีด', abnormal: true },
    { date: '2026-06-11', test: 'BUN/Creatinine — การทำงานของไต', result: 'Cr 1.4 mg/dL — สูงเล็กน้อย', abnormal: true },
  ],
  '67-00021': [
    { date: '2025-09-15', test: 'BUN/Creatinine — การทำงานของไต', result: 'Cr 2.8 mg/dL · eGFR 24', abnormal: true },
    { date: '2026-05-19', test: 'BUN/Creatinine — การทำงานของไต', result: 'Cr 2.9 mg/dL · eGFR 23 — ทรงตัว', abnormal: true },
  ],
  '67-00014': [
    { date: '2025-07-14', test: 'Urine Analysis — ตรวจปัสสาวะ', result: 'WBC 30-40 /HPF — ติดเชื้อทางเดินปัสสาวะ', abnormal: true },
    { date: '2026-01-15', test: 'Urine Analysis — ตรวจปัสสาวะ', result: 'ปกติ', abnormal: false },
  ],
  '67-00003': [
    { date: '2026-01-26', test: 'CBC — ความสมบูรณ์ของเม็ดเลือด', result: 'ปกติ', abnormal: false },
  ],
};

export const HOMEVISIT_XRAY_HISTORY = {
  '67-00018': [
    { date: '2026-02-14', exam: 'Chest X-Ray (แรกรับการดูแลที่บ้าน)', result: 'พบก้อนที่ปอดกลีบบนขวา ขนาด 4 ซม. และน้ำในช่องเยื่อหุ้มปอดด้านขวา' },
    { date: '2026-06-11', exam: 'Chest X-Ray (ติดตาม)', result: 'น้ำในช่องเยื่อหุ้มปอดเพิ่มขึ้นเล็กน้อย' },
  ],
  '67-00009': [
    { date: '2026-03-15', exam: 'Chest X-Ray (แรกรับ)', result: 'ปอดโป่งพอง กะบังลมแบนราบ เข้าได้กับถุงลมโป่งพอง' },
  ],
  '67-00003': [
    { date: '2026-01-26', exam: 'X-Ray กระดูกสะโพก', result: 'ไม่พบกระดูกหัก' },
  ],
  '67-00025': [
    { date: '2025-08-14', exam: 'Chest X-Ray (คัดกรองวัณโรค)', result: 'พบพังผืดที่ปอดกลีบบนซ้าย เข้าได้กับรอยโรคเดิมที่รักษาหายแล้ว' },
  ],
};

/* ─── ข้อความแนะนำ (SuggestibleTextarea) ─────────────────────────── */

export const REGISTRY_NOTE_SUGGESTIONS = [
  'รับต่อจากระบบ HHC หลังจำหน่ายจากโรงพยาบาลแม่ข่าย ต้องการการดูแลต่อเนื่องที่บ้าน',
  'เจ้าหน้าที่ศูนย์บริการฯ พบระหว่างสำรวจชุมชน ครอบครัวยินยอมให้เยี่ยมบ้าน',
  'ส่งต่อจากห้องสังเกตอาการหลังจำหน่าย ต้องติดตามแผลผ่าตัดที่บ้าน',
  'Health Desk–HV รับแจ้งจาก อสส. ว่าผู้ป่วยอยู่ลำพังและช่วยเหลือตัวเองไม่ได้',
];

export const REGISTRY_CANCEL_SUGGESTIONS = [
  'บันทึกซ้ำ / ข้อมูลผิดพลาด',
  'ผู้รับบริการย้ายออกนอกพื้นที่รับผิดชอบของศูนย์บริการฯ',
  'ครอบครัวปฏิเสธการเยี่ยมบ้าน',
  'ผู้รับบริการเสียชีวิต — ปิดทะเบียนตามระเบียบ',
];
