/* งานเยี่ยมบ้าน — สะพานเชื่อมคำสั่งการรักษาเข้าระบบ CPOE (TOR §1.18.6).

   “สามารถบันทึกข้อมูลการสั่งการรักษาได้ (เชื่อมโยง CPOE)”

   เดิมขั้นตอนที่ 6 ของแบบบันทึกการเยี่ยมเก็บคำสั่งเป็น "ข้อความ" ชุดหนึ่ง
   ที่ไม่ได้ผูกกับรายการจริงของระบบ จึงถูกให้สถานะ partial ไว้ ไฟล์นี้ทำให้
   คำสั่งที่พยาบาลบันทึก "ที่บ้าน" กลายเป็นรายการเดียวกับที่แพทย์เห็นใน
   `/treat/record` ขั้นสั่งการรักษา:

     1. แคตตาล็อกของขั้นตอนที่ 6 อ้างรายการจริง — `LAB_TESTS`
        (`labCatalog.js`) · `XRAY_EXAMS` (`xrayCatalog.js`) · รหัส ICD-9-CM
        ของ ProcedureOrderPanel · รายการยา/เวชภัณฑ์ของ Step5Orders —
        โดยใช้ **id เดียวกับ `orderPickerItems`** ของ Step5Orders
     2. เมื่อกด “ส่งคำสั่งเข้า CPOE” ระบบเก็บรายการไว้เป็น handoff รายผู้ป่วย
     3. หน้าจอ CPOE (Step5Orders) อ่าน handoff ของ HN นั้น แล้วนำเข้าด้วย
        `commitPickedOrders` ตัวเดิม — จึงได้ตรวจซ้ำซ้อน / CDSS / กติกา
        ทุกอย่างของ CPOE เหมือนกับที่แพทย์สั่งเองที่ศูนย์ฯ

   ไม่ทำ id/แคตตาล็อกชุดใหม่ในโมดูลเยี่ยมบ้าน เพราะจะกลายเป็นแหล่งข้อมูล
   ที่สองที่ต้องคอยไล่ให้ตรงกับ CPOE ตลอด. */

import { LAB_TESTS } from '@/data/labCatalog';
import { XRAY_EXAMS } from '@/data/xrayCatalog';
import {
  HOMEVISIT_CURRENT_USER,
  HOMEVISIT_CENTER,
  formatHomeVisitDateTime,
  readJson,
  writeJson,
} from '@/data/homevisitVisits';

/* ─── แคตตาล็อกคำสั่งที่ "สั่งได้จริงตอนเยี่ยมบ้าน" ─────────────────
   คัดจากแคตตาล็อกกลางเฉพาะรายการที่ทำที่บ้านได้ หรือส่งนัดต่อที่ศูนย์ฯ ได้
   — id ต้องตรงกับที่ Step5Orders สร้างใน `orderPickerItems` เป๊ะ ๆ. */

const LAB_BY_ID = Object.fromEntries(LAB_TESTS.map((t) => [t.id, t]));
const XRAY_BY_ID = Object.fromEntries(XRAY_EXAMS.map((x) => [x.id, x]));

/** ยา/เวชภัณฑ์ — id ตามที่ Step5Orders ตั้งไว้ (med-* / supply-*). */
const HOME_MEDICATIONS = [
  { id: 'med-paracetamol', name: 'Paracetamol 500mg', detail: 'แก้ปวด ลดไข้' },
  { id: 'med-cetirizine',  name: 'Cetirizine 10mg',   detail: 'แก้แพ้ ลดน้ำมูก' },
  { id: 'med-catalog-2',   name: 'Ibuprofen 400mg',   detail: 'แก้ปวด ลดอักเสบ — ระวังในผู้ป่วยโรคไต' },
  { id: 'med-catalog-3',   name: 'Amoxicillin 500mg', detail: 'ยาปฏิชีวนะ — ตรวจประวัติแพ้ยากลุ่มเพนิซิลลินก่อน' },
];

const HOME_SUPPLIES = [
  { id: 'supply-gauze',   name: 'ผ้าก๊อซปลอดเชื้อ 2x2 นิ้ว', detail: 'ชุดทำแผลที่บ้าน' },
  { id: 'supply-cotton',  name: 'สำลีก้อน',                  detail: 'ชุดทำแผลที่บ้าน' },
  { id: 'supply-tape',    name: 'พลาสเตอร์ปิดแผล 1 นิ้ว',     detail: 'ชุดทำแผลที่บ้าน' },
  { id: 'supply-syringe', name: 'กระบอกฉีดยา 5 มล.',          detail: 'สำหรับฉีดยา/ล้างแผล' },
  { id: 'supply-mask',    name: 'หน้ากากอนามัย',              detail: 'ป้องกันการติดเชื้อระหว่างเยี่ยม' },
];

/** แล็บที่เจาะเก็บสิ่งส่งตรวจที่บ้านแล้วส่งเข้าห้องแล็บของศูนย์ฯ ได้. */
const HOME_LAB_IDS = ['lab-cbc', 'lab-fbs', 'lab-hba1c', 'lab-lipid', 'lab-creatinine', 'lab-electrolytes', 'lab-ua'];

/** เอกซเรย์ — สั่งจากที่บ้านได้ในความหมาย "นัดมาถ่ายที่ศูนย์ฯ". */
const HOME_XRAY_IDS = ['xr-cxr-pa', 'xr-cxr-palat', 'xr-kub', 'xr-lsspine', 'xr-hip', 'xr-pelvis'];

/** หัตถการที่ทำที่บ้านได้จริง — code ตรงกับ ICD9_PROCEDURES ของ CPOE. */
const HOME_PROCEDURES = [
  { code: '86.28', name: 'ทำแผลและตัดเนื้อตายแบบไม่ผ่าตัด', detail: 'ICD-9-CM 86.28' },
  { code: '96.59', name: 'ล้างแผลด้วยน้ำเกลือ',              detail: 'ICD-9-CM 96.59' },
  { code: '99.29', name: 'ฉีดยาหรือสารเข้ากล้ามเนื้อ/ใต้ผิวหนัง', detail: 'ICD-9-CM 99.29' },
  { code: '93.94', name: 'พ่นยาขยายหลอดลม (Nebulization)',   detail: 'ICD-9-CM 93.94' },
  { code: '57.94', name: 'ใส่สายสวนปัสสาวะ',                 detail: 'ICD-9-CM 57.94' },
  { code: '96.07', name: 'ใส่สายให้อาหารทางจมูก (NG tube)',   detail: 'ICD-9-CM 96.07' },
  { code: '89.52', name: 'ตรวจคลื่นไฟฟ้าหัวใจ (EKG 12 lead)', detail: 'ICD-9-CM 89.52' },
];

const priceLabel = (price) =>
  (Number.isFinite(Number(price)) ? `${Number(price).toLocaleString('th-TH')} บาท` : '');

/** กลุ่มคำสั่งของขั้นตอนที่ 6 — รูปทรงเดียวกับ orderPickerItems ของ CPOE. */
export const HOMEVISIT_ORDER_GROUPS = [
  {
    key: 'drugOrders',
    label: 'ยาและเวชภัณฑ์',
    icon: 'pill',
    hint: 'ยาและเวชภัณฑ์ที่จ่ายให้ผู้รับบริการที่บ้าน — ส่งเข้าใบสั่งยาของ CPOE เพื่อให้เภสัชกรตรวจสอบ',
    items: [
      ...HOME_MEDICATIONS.map((m) => ({ id: m.id, category: 'medication', name: m.name, detail: m.detail, unit: 'เม็ด' })),
      ...HOME_SUPPLIES.map((s) => ({ id: s.id, category: 'medicalSupply', name: s.name, detail: s.detail, unit: 'ชิ้น' })),
    ],
  },
  {
    key: 'labOrders',
    label: 'ส่งตรวจทางห้องปฏิบัติการ',
    icon: 'biotech',
    hint: 'เก็บสิ่งส่งตรวจที่บ้านแล้วนำส่งห้องปฏิบัติการของศูนย์บริการฯ',
    items: HOME_LAB_IDS.filter((id) => LAB_BY_ID[id]).map((id) => {
      const t = LAB_BY_ID[id];
      return {
        id: `lab-${t.id}`,
        category: 'lab',
        name: `${t.nameEn} — ${t.nameTh}`,
        detail: `${t.code} · ${priceLabel(t.price)}`,
      };
    }),
  },
  {
    key: 'xrayOrders',
    label: 'ส่งตรวจเอกซเรย์',
    icon: 'radiology',
    hint: 'สั่งจากที่บ้านเพื่อนัดผู้รับบริการมาถ่ายภาพรังสีที่ศูนย์บริการฯ',
    items: HOME_XRAY_IDS.filter((id) => XRAY_BY_ID[id]).map((id) => {
      const x = XRAY_BY_ID[id];
      return {
        id: `xray-${x.id}`,
        category: 'xray',
        name: x.name,
        detail: `${x.code} · ${priceLabel(x.price)}`,
      };
    }),
  },
  {
    key: 'procedureOrders',
    label: 'หัตถการ/การดูแลต่อเนื่อง',
    icon: 'clipboard',
    hint: 'หัตถการที่ทำที่บ้าน — บันทึกด้วยรหัส ICD-9-CM ชุดเดียวกับที่ศูนย์บริการฯ ใช้',
    items: HOME_PROCEDURES.map((p) => ({
      id: `procedure-${p.code}`,
      category: 'procedure',
      name: p.name,
      detail: p.detail,
    })),
  },
];

const ALL_ORDER_ITEMS = HOMEVISIT_ORDER_GROUPS.flatMap((g) => g.items);
const ITEM_BY_ID = Object.fromEntries(ALL_ORDER_ITEMS.map((i) => [i.id, i]));

export const resolveHomeVisitOrderItem = (id) => ITEM_BY_ID[id] || null;

/** ชื่อที่แสดงของคำสั่ง — รับได้ทั้ง id ใหม่และข้อความเดิมของร่างเก่า. */
export const homeVisitOrderLabel = (value) =>
  (ITEM_BY_ID[value]?.name || (typeof value === 'string' ? value : value?.name || ''));

/** รายการที่เลือกไว้ทั้งฟอร์ม → picker items ที่ CPOE นำเข้าได้ทันที. */
export const collectHomeVisitOrderItems = (form = {}) =>
  HOMEVISIT_ORDER_GROUPS
    .flatMap((g) => (form[g.key] || []))
    .map((value) => resolveHomeVisitOrderItem(value))
    .filter(Boolean);

export const countHomeVisitOrders = (form = {}) =>
  HOMEVISIT_ORDER_GROUPS.reduce((sum, g) => sum + (form[g.key]?.length || 0), 0);

/* ─── handoff store — คำสั่งที่รอนำเข้า CPOE รายผู้ป่วย ───────────── */

const HANDOFF_KEY = 'mih:homevisit:cpoe-handoff';

/**
 * ส่งคำสั่งจากการเยี่ยมเข้าคิวนำเข้าของ CPOE.
 * @returns {{hn,visitId,items,at,by,note,status,importedAt,importedBy}}
 */
export const sendOrdersToCpoe = ({ hn, visitId, form = {}, note = '' }) => {
  if (!hn) return null;
  const items = collectHomeVisitOrderItems(form).map((i) => ({
    id: i.id, category: i.category, name: i.name,
  }));
  const entry = {
    hn,
    visitId: visitId || '',
    items,
    note: note || form.orderNote || '',
    at: formatHomeVisitDateTime(),
    by: HOMEVISIT_CURRENT_USER,
    from: HOMEVISIT_CENTER,
    status: items.length > 0 ? 'pending' : 'empty',
    importedAt: '',
    importedBy: '',
    importedCount: 0,
  };
  const all = readJson(HANDOFF_KEY, {});
  writeJson(HANDOFF_KEY, { ...all, [hn]: entry });
  return entry;
};

export const getCpoeHandoff = (hn) => (hn ? readJson(HANDOFF_KEY, {})[hn] || null : null);

/** คำสั่งที่ยังไม่ถูกนำเข้า — ใช้เป็นเงื่อนไขแสดงแถบ inbox ในหน้า CPOE. */
export const getPendingCpoeHandoff = (hn) => {
  const entry = getCpoeHandoff(hn);
  return entry && entry.status === 'pending' && entry.items.length > 0 ? entry : null;
};

export const markCpoeHandoffImported = (hn, importedCount = 0, by = '') => {
  const all = readJson(HANDOFF_KEY, {});
  const entry = all[hn];
  if (!entry) return null;
  const next = {
    ...entry,
    status: 'imported',
    importedAt: formatHomeVisitDateTime(),
    importedBy: by || 'แพทย์ผู้ตรวจ',
    importedCount,
  };
  writeJson(HANDOFF_KEY, { ...all, [hn]: next });
  return next;
};

export const HOMEVISIT_ORDER_NOTE_SUGGESTIONS = [
  'ทำแผลทุกวันจันทร์และพฤหัสบดี โดยพยาบาลเยี่ยมบ้าน',
  'เจาะเลือดที่บ้านในการเยี่ยมครั้งถัดไป งดน้ำงดอาหารก่อน 8 ชั่วโมง',
  'นัดถ่ายภาพรังสีทรวงอกที่ศูนย์บริการฯ พร้อมพบแพทย์',
  'ให้ยาต่อเนื่องจากใบสั่งเดิม ขอให้เภสัชกรทบทวนรายการยาซ้ำซ้อน',
];
