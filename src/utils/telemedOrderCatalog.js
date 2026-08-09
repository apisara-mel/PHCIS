/* telemedOrderCatalog — อะแดปเตอร์อ่านอย่างเดียวจากแคตตาล็อกกลางของ PHCIS
   (TOR §4.3.3 · §1.13.3).

   ก่อนหน้านี้แถบคำสั่งระหว่างสาย (TelemedOrderStrip) และแอปผู้รับบริการ
   อ่านแคตตาล็อกย่อ 6 + 6 + 3 รายการที่ประกาศไว้ใน src/data/telemedVisits.js
   ทำให้ชื่อ/รหัส/ราคา ไม่ตรงกับ CPOE จริง. ไฟล์นี้ห่อแคตตาล็อกกลาง
     · ยา     — src/data/medicationCatalog.js  (MEDICATION_NAME_OPTIONS)
     · LAB    — src/data/labCatalog.js         (LAB_TESTS · รหัส L###### · ราคา)
     · X-ray  — src/data/xrayCatalog.js        (XRAY_EXAMS · รหัส X###### · ราคา)
   แล้วคืนรูปแบบเดียวกับที่ Select / มือถือใช้อยู่ — ไม่แก้ไฟล์กลางแม้แต่บรรทัดเดียว
   (โมดูลนี้ห้ามแตะ src/data/telemedVisits.js และแคตตาล็อกกลาง).

   ความเข้ากันได้ย้อนหลัง: คำสั่งที่บันทึกไว้แล้วด้วยรหัสย่อเดิม (MET500 · HBA1C
   · CXR ...) ต้องยังอ่านออก → LEGACY_*_ALIAS แปลงรหัสเดิมเป็นรายการกลาง และ
   describeStoredOrder() จะ fallback ไปใช้ label ที่เก็บไว้เสมอ ไม่มีวันทิ้งแถว.

   ข้อจำกัดที่ยังเหลือ (รายงานตรง ๆ): แคตตาล็อกยากลางเก็บชื่อ+รูปแผงยา แต่ยัง
   ไม่มีรหัส TMT/ราคาในไฟล์เดียวกัน (อยู่ในทะเบียนยาของโมดูลเภสัชกรรมซึ่ง
   โมดูลนี้ไม่ import เพื่อไม่ผูกกับไฟล์ที่ทีมอื่นดูแล) — ราคายาจึงแสดงเป็น
   "ตามทะเบียนยาหน่วยบริการ" ไม่ใช่ตัวเลขปลอม. */

import { MEDICATION_NAME_OPTIONS } from '@/data/medicationCatalog';
import { LAB_TESTS, LAB_GROUP_LABEL } from '@/data/labCatalog';
import { XRAY_EXAMS } from '@/data/xrayCatalog';
import {
  TELEMED_MED_CATALOG,
  TELEMED_LAB_CATALOG,
  TELEMED_XRAY_CATALOG,
  TELEMED_CONSULT_TARGETS,
  TELEMED_REFER_TARGETS,
} from '@/data/telemedVisits';

/** ป้ายกำกับที่แสดงบน UI เพื่อไม่ให้เข้าใจผิดว่าเป็นข้อมูลจาก API จริง */
export const TELEMED_CATALOG_SOURCE_LABEL =
  'แคตตาล็อกกลาง PHCIS (ทะเบียนยา · รายการตรวจ LAB · รายการเอกซเรย์)';

const slug = (name) => String(name || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

/** รหัสอ้างอิงยาในโมดูลนี้ — ผูกกับชื่อยาในแคตตาล็อกกลางแบบ 1:1 */
export const medCode = (name) => `MED-${slug(name)}`;

/* วิธีใช้ยา + จำนวนตั้งต้นที่พบบ่อยในคลินิกโรคเรื้อรังของศูนย์บริการฯ
   (ค่าตั้งต้นเท่านั้น — แพทย์แก้ได้ทุกครั้งก่อนบันทึก) */
const MED_DEFAULTS = {
  'Metformin 500 mg':          { sig: 'รับประทาน 1 เม็ด หลังอาหารเช้า-เย็น', qty: '60 เม็ด' },
  'Enalapril 5 mg':            { sig: 'รับประทาน 1 เม็ด ก่อนอาหารเช้า',      qty: '30 เม็ด' },
  'Amlodipine 5 mg':           { sig: 'รับประทาน 1 เม็ด หลังอาหารเช้า',      qty: '30 เม็ด' },
  'Simvastatin 20 mg':         { sig: 'รับประทาน 1 เม็ด ก่อนนอน',            qty: '30 เม็ด' },
  'Atorvastatin 20 mg':        { sig: 'รับประทาน 1 เม็ด ก่อนนอน',            qty: '30 เม็ด' },
  'Paracetamol 500 mg':        { sig: 'รับประทานครั้งละ 1-2 เม็ด เวลาปวด',   qty: '20 เม็ด' },
  'Losartan 50 mg':            { sig: 'รับประทาน 1 เม็ด หลังอาหารเช้า',      qty: '30 เม็ด' },
  'Hydrochlorothiazide 25 mg': { sig: 'รับประทาน 1/2 เม็ด หลังอาหารเช้า',    qty: '30 เม็ด' },
  'Aspirin 81 mg':             { sig: 'รับประทาน 1 เม็ด หลังอาหารเช้า',      qty: '30 เม็ด' },
  'Furosemide 40 mg':          { sig: 'รับประทาน 1 เม็ด หลังอาหารเช้า',      qty: '30 เม็ด' },
  'Omeprazole 20 mg':          { sig: 'รับประทาน 1 เม็ด ก่อนอาหารเช้า 30 นาที', qty: '30 เม็ด' },
  'Cetirizine 10 mg':          { sig: 'รับประทาน 1 เม็ด ก่อนนอน เวลาคัน',    qty: '10 เม็ด' },
};

const DEFAULT_MED_SIG = 'รับประทานตามแพทย์สั่ง';
const DEFAULT_MED_QTY = '30 เม็ด';

/* ── ยา ─────────────────────────────────────────────────────────────── */
const MED_ITEMS = MEDICATION_NAME_OPTIONS
  /* แคตตาล็อกกลางมี alias ที่เขียน "500mg" ติดกันไว้ให้ mock เก่า — ตัดออก
     ไม่ให้ dropdown มีรายการซ้ำสองบรรทัด */
  .filter((o) => !/\d(mg|mcg)\b/i.test(o.value))
  .map((o) => ({
    code: medCode(o.value),
    name: o.value,
    image: o.image,
    sig: MED_DEFAULTS[o.value]?.sig || DEFAULT_MED_SIG,
    qty: MED_DEFAULTS[o.value]?.qty || DEFAULT_MED_QTY,
    price: null,
    priceLabel: 'ราคาตามทะเบียนยาหน่วยบริการ',
  }));

const MED_BY_CODE = MED_ITEMS.reduce((acc, m) => { acc[m.code] = m; return acc; }, {});
const MED_BY_NAME = MED_ITEMS.reduce((acc, m) => { acc[m.name.toLowerCase()] = m; return acc; }, {});

/* ── LAB ────────────────────────────────────────────────────────────── */
const LAB_ITEMS = LAB_TESTS
  .filter((t) => !t.retired)
  .map((t) => ({
    code: t.code,
    id: t.id,
    name: t.nameTh ? `${t.nameEn} — ${t.nameTh}` : (t.nameFull || t.nameEn),
    shortName: t.nameEn,
    group: LAB_GROUP_LABEL[t.group] || '',
    fastingHours: t.fastingHours || 0,
    price: t.price ?? null,
    priceLabel: t.price != null ? `${t.price.toLocaleString('th-TH')} บาท` : 'ตามอัตราหน่วยบริการ',
    note: t.fastingHours
      ? `ต้องงดอาหาร ${t.fastingHours} ชั่วโมงก่อนเจาะเลือด`
      : 'ไม่ต้องงดอาหาร — เจาะที่หน่วยบริการต้นทางได้',
  }));

const LAB_BY_CODE = LAB_ITEMS.reduce((acc, l) => { acc[l.code] = l; return acc; }, {});

/* ── X-ray ──────────────────────────────────────────────────────────── */
const XRAY_ITEMS = XRAY_EXAMS
  .filter((x) => !x.retired)
  .map((x) => ({
    code: x.code,
    id: x.id,
    name: x.name,
    nameEn: x.nameEn,
    price: x.price ?? null,
    priceLabel: x.price != null ? `${x.price.toLocaleString('th-TH')} บาท` : 'ตามอัตราหน่วยบริการ',
    note: x.prep || 'ไม่ต้องเตรียมตัวเป็นพิเศษ',
    femaleScreening: Boolean(x.femaleScreening),
    durationMin: x.durationMin || null,
  }));

const XRAY_BY_CODE = XRAY_ITEMS.reduce((acc, x) => { acc[x.code] = x; return acc; }, {});

/* ── รหัสย่อเดิมของโมดูล → รายการกลาง (คำสั่งเก่าต้องยังอ่านออก) ────── */
const LEGACY_MED_ALIAS = {
  MET500: 'Metformin 500 mg',
  ENA5: 'Enalapril 5 mg',
  AMLO5: 'Amlodipine 5 mg',
  SIM20: 'Simvastatin 20 mg',
  PARA500: 'Paracetamol 500 mg',
};

const LEGACY_LAB_ALIAS = {
  HBA1C: 'lab-hba1c',
  FBS: 'lab-fbs',
  LIPID: 'lab-lipid',
  BUNCR: 'lab-creatinine',
  CBC: 'lab-cbc',
  UA: 'lab-ua',
};

const LEGACY_XRAY_ALIAS = {
  CXR: 'xr-cxr-pa',
  KUB: 'xr-kub',
};

const legacyMini = (kind, code) => {
  const table = kind === 'med' ? TELEMED_MED_CATALOG
    : kind === 'lab' ? TELEMED_LAB_CATALOG
      : kind === 'xray' ? TELEMED_XRAY_CATALOG : [];
  return table.find((x) => x.code === code) || null;
};

/* ── options สำหรับ <Select searchable> ──────────────────────────────── */
export const medOptions = () => MED_ITEMS.map((m) => ({
  value: m.code,
  label: m.name,
  subtext: `${m.sig} · ${m.qty} · ${m.priceLabel}`,
}));

export const labOptions = () => LAB_ITEMS.map((l) => ({
  value: l.code,
  label: `${l.name} (${l.code})`,
  subtext: `${l.group} · ${l.priceLabel} · ${l.note}`,
}));

export const xrayOptions = () => XRAY_ITEMS.map((x) => ({
  value: x.code,
  label: `${x.name} (${x.code})`,
  subtext: `${x.priceLabel} · ${x.note}`,
}));

export const consultOptions = () => TELEMED_CONSULT_TARGETS.map((t) => ({ value: t, label: t }));
export const referOptions = () => TELEMED_REFER_TARGETS.map((t) => ({ value: t, label: t }));

export const optionsForKind = (kind) => {
  switch (kind) {
    case 'med':     return medOptions();
    case 'lab':     return labOptions();
    case 'xray':    return xrayOptions();
    case 'consult': return consultOptions();
    case 'refer':   return referOptions();
    default:        return [];
  }
};

/** จำนวนรายการในแคตตาล็อกกลางที่เปิดให้สั่งได้ (ใช้บอกผู้ใช้ว่าค้นจากกี่รายการ) */
export const catalogCounts = () => ({
  med: MED_ITEMS.length,
  lab: LAB_ITEMS.length,
  xray: XRAY_ITEMS.length,
});

/**
 * คืนรายละเอียดของรายการที่เลือก — ใช้ตอนสร้างคำสั่งใหม่.
 * @returns {{code:string,label:string,detail:string,price:number|null,priceLabel:string,sig?:string,qty?:string,source:'central'|'legacy'}|null}
 */
export const resolveCatalogItem = (kind, value) => {
  if (!kind || !value) return null;
  if (kind === 'med') {
    const item = MED_BY_CODE[value]
      || MED_BY_NAME[String(LEGACY_MED_ALIAS[value] || '').toLowerCase()];
    if (item) {
      return {
        code: item.code,
        label: item.name,
        detail: `${item.sig} · ${item.qty}`,
        sig: item.sig,
        qty: item.qty,
        price: null,
        priceLabel: item.priceLabel,
        source: 'central',
      };
    }
  }
  if (kind === 'lab') {
    const item = LAB_BY_CODE[value]
      || LAB_ITEMS.find((l) => l.id === LEGACY_LAB_ALIAS[value]);
    if (item) {
      return {
        code: item.code,
        label: `${item.name} (${item.code})`,
        detail: `${item.group} · ${item.note} · ${item.priceLabel}`,
        price: item.price,
        priceLabel: item.priceLabel,
        source: 'central',
      };
    }
  }
  if (kind === 'xray') {
    const item = XRAY_BY_CODE[value]
      || XRAY_ITEMS.find((x) => x.id === LEGACY_XRAY_ALIAS[value]);
    if (item) {
      return {
        code: item.code,
        label: `${item.name} (${item.code})`,
        detail: `${item.note} · ${item.priceLabel}${item.femaleScreening ? ' · ต้องคัดกรองการตั้งครรภ์ก่อนถ่ายภาพ' : ''}`,
        price: item.price,
        priceLabel: item.priceLabel,
        source: 'central',
      };
    }
  }
  if (kind === 'consult') {
    return {
      code: value,
      label: `ส่งปรึกษา ${value}`,
      detail: 'ปรึกษาภายในเครือข่ายศูนย์บริการสาธารณสุข',
      price: null,
      priceLabel: 'ไม่มีค่าใช้จ่ายเพิ่ม',
      source: 'central',
    };
  }
  if (kind === 'refer') {
    return {
      code: value,
      label: `ส่งต่อ ${value}`,
      detail: 'ออกใบส่งต่อและนัดหมายปลายทาง',
      price: null,
      priceLabel: 'ตามสิทธิการรักษาปลายทาง',
      source: 'central',
    };
  }
  /* รหัสที่ไม่รู้จัก → ลองแคตตาล็อกย่อเดิมของโมดูลก่อนยอมแพ้ */
  const mini = legacyMini(kind, value);
  if (mini) {
    return {
      code: mini.code,
      label: mini.name,
      detail: mini.sig ? `${mini.sig} · ${mini.qty}` : (mini.note || ''),
      sig: mini.sig,
      qty: mini.qty,
      price: null,
      priceLabel: 'รายการเดิมของโมดูล (ยังไม่ผูกแคตตาล็อกกลาง)',
      source: 'legacy',
    };
  }
  return null;
};

/**
 * อ่านคำสั่งที่ "บันทึกไว้แล้ว" ให้แสดงผลด้วยชื่อ/รหัส/ราคาจากแคตตาล็อกกลาง
 * โดยไม่ทิ้งข้อมูลเดิม — ใช้ทั้งฝั่ง web และ mobile.
 * ถ้า resolve ไม่ได้เลย จะคืน label/detail ที่เก็บไว้ตามเดิม (ไม่มีวันหาย).
 */
export const describeStoredOrder = (order) => {
  if (!order) return null;
  const byCode = order.code ? resolveCatalogItem(order.kind, order.code) : null;
  const byLabel = !byCode && order.kind === 'med'
    ? resolveCatalogItem('med', medCode(order.label))
    : null;
  const resolved = byCode || byLabel;
  if (!resolved) {
    return {
      ...order,
      catalogLabel: order.label,
      catalogDetail: order.detail,
      priceLabel: '',
      code: order.code || '',
      unresolved: true,
    };
  }
  return {
    ...order,
    /* label ที่แพทย์บันทึกไว้ชนะเสมอ (อาจมี sig ที่แก้เอง) — แคตตาล็อกกลาง
       เติมรหัสและราคาให้เท่านั้น */
    catalogLabel: order.label || resolved.label,
    catalogDetail: order.detail || resolved.detail,
    priceLabel: resolved.priceLabel,
    code: resolved.code,
    unresolved: false,
    legacy: resolved.source === 'legacy',
  };
};

/** ราคารวมของคำสั่งที่ยังไม่ถูกยกเลิก (ใช้บนมือถือก่อนกด "ไปชำระเงิน") */
export const estimateOrderTotal = (orders = []) => orders
  .filter((o) => o.status !== 'cancelled')
  .reduce((sum, o) => {
    const item = resolveCatalogItem(o.kind, o.code);
    return sum + (item?.price || 0);
  }, 0);
