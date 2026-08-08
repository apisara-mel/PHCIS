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
  formatHomeVisitDateTime,
  todayIsoDate,
  readJson,
  writeJson,
} from '@/data/homevisitVisits';

/* ─── ทะเบียนผู้รับบริการเยี่ยมบ้าน (1.10.12.1) ────────────────────── */

const REGISTRY_SEED = [
  {
    id: 'hvreg-001', hn: '67-00005', name: 'สุดา ปลอดโปร่ง', age: 67, gender: 'หญิง',
    nationalId: '1100400512345', group: 'severeDisability', source: 'hhc',
    district: 'เขตคลองเตย', community: 'ชุมชนล็อค 1-2-3',
    address: '48/12 ซอยอาจณรงค์ 5 แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
    home: { lat: 13.7702, lng: 100.4906, pinSaved: true },
    responsible: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse',
    registeredDate: '2025-03-11', lastVisitDate: '2026-06-12', visitCount: 8,
    confidential: false, flags: ['bedbound', 'pressureSore'], active: true,
    photoLabel: 'ภาพผู้รับบริการ (ถ่ายเมื่อเยี่ยมครั้งที่ 1)',
    illnessHistory: 'อัมพาตครึ่งซีกขวาหลังเส้นเลือดสมองตีบ พ.ศ. 2567 · ความดันโลหิตสูง · แผลกดทับก้นกบ',
    contactName: 'นางสาวจิตรา ปลอดโปร่ง (บุตรสาว)', contactPhone: '081-234-5678',
    recordedBy: 'พว.ศิริพร เยี่ยมสุข', recordedAt: '11 มีนาคม 2568 09:20',
  },
  {
    id: 'hvreg-002', hn: '67-00012', name: 'วิชัย รุ่งเรือง', age: 60, gender: 'ชาย',
    nationalId: '3100600298761', group: 'chronic', source: 'hv',
    district: 'เขตวัฒนา', community: 'ชุมชนซอยทองหล่อ 20',
    address: '109 ซอยสุขุมวิท 55 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
    home: { lat: 13.7585, lng: 100.5122, pinSaved: true },
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
    district: 'เขตพระโขนง', community: 'ชุมชนริมคลองพระโขนง',
    address: '77/3 ซอยสุขุมวิท 71 แขวงพระโขนงเหนือ เขตพระโขนง กรุงเทพมหานคร 10260',
    home: { lat: 13.7481, lng: 100.5288, pinSaved: true },
    responsible: 'นพ.ธนวัฒน์ เมตตา', profession: 'doctor',
    registeredDate: '2026-02-02', lastVisitDate: '2026-07-30', visitCount: 12,
    confidential: true, flags: ['palliative', 'oxygen'], active: true,
    illnessHistory: 'มะเร็งปอดระยะแพร่กระจาย · ปวดเรื้อรังควบคุมด้วยมอร์ฟีน · ใช้ออกซิเจนที่บ้าน',
    contactName: 'นางพิกุล อัครพงศ์ (ภรรยา)', contactPhone: '086-543-2211',
    recordedBy: 'นพ.ธนวัฒน์ เมตตา', recordedAt: '2 กุมภาพันธ์ 2569 10:05',
  },
  {
    id: 'hvreg-004', hn: '67-00027', name: 'จิราพร มณีโชติ', age: 23, gender: 'หญิง',
    nationalId: '1409901234567', group: 'curable', source: 'motherChildHv',
    district: 'เขตคลองเตย', community: 'ชุมชนพัฒนาใหม่',
    address: '15/44 ซอยไผ่สิงโต แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
    home: { lat: 13.7738, lng: 100.4972, pinSaved: true },
    responsible: 'พว.ดวงพร ห่วงใย', profession: 'nurse',
    registeredDate: '2026-07-28', lastVisitDate: '2026-08-01', visitCount: 1,
    confidential: false, flags: [], active: true,
    illnessHistory: 'มารดาหลังคลอดปกติ 5 วัน · ทารกน้ำหนัก 3,050 กรัม กินนมแม่อย่างเดียว',
    contactName: 'นายสมพงษ์ มณีโชติ (สามี)', contactPhone: '092-118-4477',
    recordedBy: 'พว.ดวงพร ห่วงใย', recordedAt: '28 กรกฎาคม 2569 15:30',
  },
  {
    id: 'hvreg-005', hn: '67-00003', name: 'ปริญญา รัตนา', age: 54, gender: 'หญิง',
    nationalId: '3101200477881', group: 'mildDisability', source: 'healthDeskHv',
    district: 'เขตวัฒนา', community: 'ชุมชนสวนอ้อย',
    address: '223 ซอยเอกมัย 12 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
    home: { lat: 13.7546, lng: 100.5205, pinSaved: true },
    responsible: 'กภ.ณัฐวุฒิ ฟื้นฟู', profession: 'physio',
    registeredDate: '2026-01-19', lastVisitDate: '2026-07-18', visitCount: 4,
    confidential: false, flags: ['fallRisk'], active: true,
    illnessHistory: 'อ่อนแรงซีกซ้ายหลังอุบัติเหตุ · เดินด้วยเครื่องช่วยเดิน · เคยหกล้มในบ้าน 1 ครั้ง',
    contactName: 'นายกิตติพงษ์ รัตนา (บุตรชาย)', contactPhone: '083-909-2244',
    recordedBy: 'กภ.ณัฐวุฒิ ฟื้นฟู', recordedAt: '19 มกราคม 2569 11:10',
  },
  {
    id: 'hvreg-006', hn: '67-00021', name: 'วรรณภา ทองดี', age: 50, gender: 'หญิง',
    nationalId: '3100900556677', group: 'chronic', source: 'centerFound',
    district: 'เขตคลองเตย', community: 'ชุมชนคลองเตยล็อค 4-5-6',
    address: '9/88 ซอยอาจณรงค์ 3 แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
    home: { lat: 13.7684, lng: 100.4861, pinSaved: true },
    responsible: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse',
    registeredDate: '2025-09-08', lastVisitDate: todayIsoDate(), visitCount: 6,
    confidential: false, flags: [], active: true,
    illnessHistory: 'ไตวายเรื้อรังระยะที่ 4 · ความดันโลหิตสูง · จำกัดน้ำและโปรตีน',
    contactName: 'นายประเสริฐ ทองดี (สามี)', contactPhone: '081-556-3312',
    recordedBy: 'พว.ศิริพร เยี่ยมสุข', recordedAt: '8 กันยายน 2568 14:00',
  },
  {
    id: 'hvreg-007', hn: '67-00014', name: 'ชัยวัฒน์ ก้องเกียรติ', age: 47, gender: 'ชาย',
    nationalId: '1103300221144', group: 'severeDisability', source: 'hhc',
    district: 'เขตพระโขนง', community: 'ชุมชนสุเหร่าบ้านดอน',
    address: '66/2 ซอยสุขุมวิท 38 แขวงพระโขนง เขตคลองเตย กรุงเทพมหานคร 10110',
    home: { lat: 13.7523, lng: 100.5341, pinSaved: true },
    responsible: 'พว.ดวงพร ห่วงใย', profession: 'nurse',
    registeredDate: '2024-12-02', lastVisitDate: '2026-01-15', visitCount: 9,
    confidential: false, flags: ['bedbound', 'tubeFeeding'], active: true,
    illnessHistory: 'บาดเจ็บไขสันหลังระดับ C5 · ให้อาหารทางสายยาง · คาสายสวนปัสสาวะ',
    contactName: 'นางอารีย์ ก้องเกียรติ (มารดา)', contactPhone: '086-221-9987',
    recordedBy: 'พว.ดวงพร ห่วงใย', recordedAt: '2 ธันวาคม 2567 09:35',
  },
  {
    id: 'hvreg-008', hn: '67-00011', name: 'อรอุมา ดวงสว่าง', age: 48, gender: 'หญิง',
    nationalId: '3120100998877', group: 'special', source: 'healthDeskHv',
    district: 'เขตบางกอกน้อย', community: 'ชุมชนวัดระฆัง',
    address: '5/7 ซอยอิสรภาพ 44 แขวงบ้านช่างหล่อ เขตบางกอกน้อย กรุงเทพมหานคร 10700',
    home: { lat: 13.7601, lng: 100.4738, pinSaved: true },
    responsible: 'นสค.ปิยะ ช่วยชุมชน', profession: 'social',
    registeredDate: '2025-05-06', lastVisitDate: '2026-05-06', visitCount: 2,
    confidential: true, flags: ['alone'], active: true,
    illnessHistory: 'กลุ่มพิเศษ — อยู่ลำพัง ไม่มีผู้ดูแล · ซึมเศร้าเรื้อรัง · ขาดรายได้',
    contactName: 'อสส.บุญมี รักชุมชน (ผู้ประสาน)', contactPhone: '087-441-2003',
    recordedBy: 'นสค.ปิยะ ช่วยชุมชน', recordedAt: '6 พฤษภาคม 2568 16:20',
  },
  {
    id: 'hvreg-009', hn: '67-00009', name: 'กิตติ ศรีสมบูรณ์', age: 52, gender: 'ชาย',
    nationalId: '3100200334455', group: 'chronic', source: 'hv',
    district: 'เขตธนบุรี', community: 'ชุมชนตลาดพลู',
    address: '18 ซอยเทอดไท 33 แขวงตลาดพลู เขตธนบุรี กรุงเทพมหานคร 10600',
    home: { lat: 13.7442, lng: 100.4756, pinSaved: true },
    responsible: 'พว.กาญจนา ถึงบ้าน', profession: 'nurse',
    registeredDate: '2026-03-15', lastVisitDate: '2026-07-25', visitCount: 3,
    confidential: false, flags: [], active: true,
    illnessHistory: 'ถุงลมโป่งพองจากการสูบบุหรี่ · หอบเหนื่อยเมื่อออกแรง',
    contactName: 'นางมณี ศรีสมบูรณ์ (ภรรยา)', contactPhone: '085-330-1188',
    recordedBy: 'พว.กาญจนา ถึงบ้าน', recordedAt: '15 มีนาคม 2569 10:50',
  },
  {
    id: 'hvreg-010', hn: '67-00025', name: 'ภาสกร ชาญฉลาด', age: 41, gender: 'ชาย',
    nationalId: '1101800776655', group: 'special', source: 'healthDeskHv',
    district: 'เขตวัฒนา', community: 'ชุมชนใต้ทางด่วนอโศก',
    address: '4 ซอยสุขุมวิท 21 แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
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
    nationalId: '3101100443322', group: 'curable', source: 'hv',
    district: 'เขตวัฒนา', community: 'ชุมชนซอยร่วมฤดี',
    address: '31 ซอยสุขุมวิท 31 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
    home: { lat: 13.7566, lng: 100.5148, pinSaved: true },
    responsible: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse',
    registeredDate: '2026-07-20', lastVisitDate: todayIsoDate(), visitCount: 2,
    confidential: false, flags: [], active: true,
    illnessHistory: 'แผลผ่าตัดหน้าท้องหลังจำหน่ายจากโรงพยาบาล · ไม่มีโรคประจำตัว',
    contactName: 'นายวีระ อ่อนน้อม (สามี)', contactPhone: '084-778-9911',
    recordedBy: 'พว.ศิริพร เยี่ยมสุข', recordedAt: '20 กรกฎาคม 2569 09:05',
  },
  {
    id: 'hvreg-012', hn: '67-00017', name: 'ภัคจิรา วงศ์อนันต์', age: 41, gender: 'หญิง',
    nationalId: '3130200665544', group: 'mildDisability', source: 'hhc',
    district: 'เขตบางกอกน้อย', community: 'ชุมชนบ้านช่างหล่อ',
    address: '88 ซอยพรานนก 6 แขวงบ้านช่างหล่อ เขตบางกอกน้อย กรุงเทพมหานคร 10700',
    home: { lat: 13.7628, lng: 100.4712, pinSaved: true },
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
    nationalId: '1100400512345', name: 'สุดา ปลอดโปร่ง', gender: 'หญิง', age: 67,
    address: '48/12 ซอยอาจณรงค์ 5 แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
    district: 'เขตคลองเตย', hn: '67-00005',
  },
  {
    nationalId: '3100600298761', name: 'วิชัย รุ่งเรือง', gender: 'ชาย', age: 60,
    address: '109 ซอยสุขุมวิท 55 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
    district: 'เขตวัฒนา', hn: '67-00012',
  },
  {
    nationalId: '1103300221144', name: 'ชัยวัฒน์ ก้องเกียรติ', gender: 'ชาย', age: 47,
    address: '66/2 ซอยสุขุมวิท 38 แขวงพระโขนง เขตคลองเตย กรุงเทพมหานคร 10110',
    district: 'เขตพระโขนง', hn: '67-00014',
  },
  {
    nationalId: '1409901234567', name: 'จิราพร มณีโชติ', gender: 'หญิง', age: 23,
    address: '15/44 ซอยไผ่สิงโต แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
    district: 'เขตคลองเตย', hn: '67-00027',
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
  '67-00027': [
    { no: 1, date: '2026-08-01', by: 'พว.ดวงพร ห่วงใย', profession: 'nurse', adl: 20, vitals: { temp: '36.8', pulse: '80', respiration: '18', oxygen: '99', sys: '112', dia: '72', weight: '58', height: '160' }, summary: 'เยี่ยมหลังคลอดครั้งที่ 1 มารดาและทารกปกติ', orders: 'ไม่มีคำสั่งการรักษา' },
  ],
};

const VISIT_HISTORY_OVERLAY_KEY = 'mih:homevisit:visit-history';

/** ประวัติการเยี่ยมทั้งหมดของผู้รับบริการ (seed + ที่บันทึกใน session นี้). */
export const getVisitHistory = (hn) => {
  if (!hn) return [];
  const overlay = readJson(VISIT_HISTORY_OVERLAY_KEY, {});
  return [...(VISIT_HISTORY_SEED[hn] || []), ...(overlay[hn] || [])]
    .slice()
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
