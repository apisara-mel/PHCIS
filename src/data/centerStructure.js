/* ระบบจัดการระบบ · โครงสร้างศูนย์บริการ
   ══════════════════════════════════════════════════════════════════════
   สองระดับ ไม่ใช่สาม:

     Level 1  หน่วยบริการ — **แผนก และ คลินิก อยู่ระดับเดียวกัน**
              ต่างกันแค่ประเภท (`kind`) ไม่ใช่แผนกซ้อนคลินิก
              แต่ละหน่วยมี **เวลาเปิด-ปิดของตัวเอง** (หรือใช้ตามเวลาศูนย์)
     Level 2  ห้องตรวจ (แพทย์) / เตียง (สังเกตอาการ) — ผูกกับหน่วยด้านบน

   ⚠️ เคยออกแบบเป็น แผนก → คลินิก → ห้อง/เตียง (3 ชั้น) แล้วแก้เป็นแบบนี้
   10 ส.ค. 2569 ตามที่ผู้ใช้ยืนยันว่า "แผนก/คลินิก คือ level เดียวกัน".

   โครงสร้างชุดหนึ่งเป็น "รูปแบบ" ที่เลือกได้ว่าจะใช้กับศูนย์บริการใดบ้าง
   (`appliedCenters`) จึงตั้งค่าครั้งเดียวแล้วนำไปใช้ซ้ำข้ามศูนย์ได้ และเลือก
   รูปแบบที่เคยสร้างไว้ได้ตอนเพิ่มศูนย์บริการ.

   เวลาเปิด-ปิดของหน่วยใช้สคีมาเดียวกับเวลาทำการของศูนย์ (3 กลุ่มวัน:
   จันทร์-ศุกร์ / เสาร์-อาทิตย์ / วันหยุดนักขัตฤกษ์) — ดู HOUR_GROUPS ใน
   centerStore.js เพื่อไม่ให้มีสคีมาเวลาสองชุดในระบบ. */

import { DEFAULT_HOUR_GROUPS, normalizeCenterHours } from '@/data/centerStore';

const STORAGE_KEY = 'mih:center-structures';

let seq = 0;
const uid = (prefix) => {
  seq += 1;
  return `${prefix}-${seq}-${Math.random().toString(36).slice(2, 7)}`;
};

/* ── ระดับที่ 2 · ห้องตรวจ / เตียง ─────────────────────────────────── */

export const NODE_KINDS = [
  { key: 'room', label: 'ห้องตรวจ (แพทย์)', sub: 'ห้องตรวจที่ผูกกับแพทย์ผู้ให้บริการ', icon: 'meeting_room' },
  { key: 'bed',  label: 'เตียงสังเกตอาการ',  sub: 'เตียงสำหรับสังเกตอาการหลังรับบริการ', icon: 'bed' },
];

export const nodeKindLabel = (kind) => (NODE_KINDS.find((k) => k.key === kind) || NODE_KINDS[0]).label;

export function createRoomNode(patch = {}) {
  return {
    id: uid('node'),
    kind: patch.kind === 'bed' ? 'bed' : 'room',
    name: String(patch.name || '').trim(),
    code: String(patch.code || '').trim(),
    /* ห้องตรวจ = แพทย์ประจำห้อง · เตียง = จำนวนที่รองรับ */
    doctor: String(patch.doctor || '').trim(),
    capacity: Number(patch.capacity) > 0 ? Number(patch.capacity) : 1,
    /* เตียงสังเกตอาการที่ผูกกับจุดรับบริการนี้ — ผู้รับบริการที่ตรวจเสร็จแล้ว
       ต้องนอนสังเกตอาการต่อจะใช้เตียงของจุดที่ตรวจ ไม่ใช่เตียงกลางของศูนย์
       (26 ส.ค. 2569 มติผู้ใช้) 0 = จุดนี้ไม่มีเตียง */
    beds: Number(patch.beds) > 0 ? Number(patch.beds) : 0,
    active: patch.active !== false,
  };
}

/* ── ระดับที่ 1 · หน่วยบริการ (แผนก หรือ คลินิก — ระดับเดียวกัน) ────── */

export const UNIT_KINDS = [
  { key: 'department', label: 'แผนก',   sub: 'หน่วยงานภายในศูนย์ เช่น ผู้ป่วยนอก ทันตกรรม', icon: 'local_hospital' },
  { key: 'clinic',     label: 'คลินิก', sub: 'จุดให้บริการเฉพาะทาง เช่น คลินิกเบาหวาน',      icon: 'medical_services' },
];

export const unitKindLabel = (kind) => (UNIT_KINDS.find((k) => k.key === kind) || UNIT_KINDS[0]).label;

export function createUnit(patch = {}) {
  return {
    id: uid('unit'),
    kind: patch.kind === 'clinic' ? 'clinic' : 'department',
    name: String(patch.name || '').trim(),
    code: String(patch.code || '').trim(),
    /* ค่าตั้งต้น = ตามเวลาศูนย์ จนกว่าจะกด "กำหนดเวลาเฉพาะหน่วยนี้" */
    followsCenterHours: patch.followsCenterHours !== false,
    hours: normalizeCenterHours(patch.hours || DEFAULT_HOUR_GROUPS),
    nodes: Array.isArray(patch.nodes) ? patch.nodes.map(createRoomNode) : [],
    active: patch.active !== false,
  };
}

/* ── สำเนา (duplicate) ─────────────────────────────────────────────────
   ทุกระดับสั่ง "ทำสำเนา" จากเมนู ⋮ ได้ — คัดลอกลูกทั้งกิ่งพร้อม id ใหม่
   เพื่อไม่ให้สองรายการอ้าง id เดียวกัน (ไม่งั้นแก้อันหนึ่งแล้วอีกอันเปลี่ยนตาม). */

const copyName = (name, suffix = 'สำเนา') => (name ? `${name} (${suffix})` : `(${suffix})`);

export function duplicateRoomNode(node) {
  return { ...createRoomNode(node), name: copyName(node.name) };
}

export function duplicateUnit(unit) {
  return {
    ...createUnit({ ...unit, nodes: [] }),
    name: copyName(unit.name),
    nodes: (unit.nodes || []).map((n) => createRoomNode(n)),
  };
}

/* ── สรุปจำนวน (ใช้บนหัวการ์ด/หน้ารีวิว/ทะเบียน) ──────────────────── */

export function countStructure(units = []) {
  let departments = 0;
  let clinics = 0;
  let rooms = 0;
  let beds = 0;
  units.forEach((u) => {
    if (u.kind === 'clinic') clinics += 1; else departments += 1;
    (u.nodes || []).forEach((n) => {
      /* node ชนิด 'bed' = เตียงเดี่ยวยุคเดิม (ตัวแก้ไขแบบละเอียดยังสร้างได้)
         ส่วนจุดรับบริการนับเตียงจากช่อง beds ที่ผูกกับจุดนั้น */
      if (n.kind === 'bed') { beds += 1; return; }
      rooms += 1;
      beds += Number(n.beds) || 0;
    });
  });
  return { units: units.length, departments, clinics, rooms, beds };
}

export function summarizeStructure(units = []) {
  const c = countStructure(units);
  return `${c.departments} แผนก · ${c.clinics} คลินิก · ${c.rooms} ห้องตรวจ · ${c.beds} เตียง`;
}

/* ── โครงสร้างตั้งต้น ────────────────────────────────────────────────
   ศูนย์บริการสาธารณสุขเปิดใหม่มักตั้งด้วยชุดนี้ก่อนแล้วค่อยปรับ. */

export function defaultStructure() {
  return [
    createUnit({
      kind: 'department',
      name: 'ผู้ป่วยนอก (OPD)',
      code: 'OPD',
      followsCenterHours: true,
      nodes: [
        { kind: 'room', name: 'ห้องตรวจ 1', code: 'R1' },
        { kind: 'room', name: 'ห้องตรวจ 2', code: 'R2' },
        { kind: 'bed', name: 'เตียงสังเกตอาการ 1', code: 'B1', capacity: 1 },
      ],
    }),
    createUnit({
      kind: 'clinic',
      name: 'คลินิกตรวจโรคทั่วไป',
      code: 'GP',
      followsCenterHours: true,
      nodes: [
        { kind: 'room', name: 'ห้องตรวจโรคทั่วไป', code: 'GP1' },
      ],
    }),
  ];
}

/* ── รูปแบบโครงสร้าง + ศูนย์ที่นำไปใช้ ───────────────────────────────── */

export function createStructureTemplate(patch = {}) {
  return {
    id: uid('structure'),
    name: String(patch.name || '').trim() || 'รูปแบบโครงสร้างศูนย์',
    units: Array.isArray(patch.units) ? patch.units : defaultStructure(),
    /* รหัสศูนย์ (hcode9 หรือรหัสศูนย์ภายใน) ที่ใช้รูปแบบนี้ —
       ว่าง = ยังไม่ผูกกับศูนย์ใด */
    appliedCenters: Array.isArray(patch.appliedCenters) ? patch.appliedCenters : [],
    draft: !!patch.draft,
  };
}

/* ── ชุดตั้งต้นสำหรับเดโม ─────────────────────────────────────────────
   ศูนย์บริการสาธารณสุขของ กทม. ไม่ได้มีโครงสร้างเดียวกันทั้ง 69 แห่ง —
   ศูนย์ใหญ่มีทันตกรรม/ชันสูตร/รังสีครบ ส่วนศูนย์เล็กมีแค่ตรวจโรคทั่วไป
   กับห้องยา จึงทำเป็น "รูปแบบ" ไว้ 4 แบบให้เลือกใช้ซ้ำตอนเพิ่มศูนย์
   ⚠️ การจับคู่ว่าศูนย์ไหนใช้รูปแบบไหนเป็นข้อมูลสมมุติสำหรับเดโม
   ยังไม่ใช่ผังจริงจากสำนักอนามัย */

const hcode = (n) => `GA00${12456 + n}`;

/* ศูนย์บริการทุกแห่งต้องผูกรูปแบบโครงสร้าง — แบ่งตามขนาดของศูนย์
   ที่เหลือจาก "ใหญ่" กับ "กลาง" ถือเป็นศูนย์ขนาดเล็กทั้งหมด จึงไม่มีศูนย์ไหน
   หลุดออกจากทะเบียนรูปแบบ (25 ส.ค. 2569) */
const ALL_CENTER_NOS = Array.from({ length: 69 }, (_, i) => i + 1);
const BIG_CENTER_NOS = [1, 3, 4, 7, 10, 21, 22, 25, 35, 41, 43, 49, 57, 60, 64, 69];
const MEDIUM_CENTER_NOS = [
  2, 5, 6, 8, 9, 11, 12, 15, 17, 19, 23, 24, 26, 29, 30,
  33, 36, 37, 40, 45, 48, 51, 53, 56, 61, 62, 66, 67,
];
const SMALL_CENTER_NOS = ALL_CENTER_NOS.filter(
  (n) => !BIG_CENTER_NOS.includes(n) && !MEDIUM_CENTER_NOS.includes(n),
);

const DEMO_TEMPLATES = [
  {
    id: 'structure-demo-full',
    name: 'ศูนย์ขนาดใหญ่ — ครบทุกงานบริการ',
    appliedCenters: BIG_CENTER_NOS.map(hcode),
    units: [
      { kind: 'department', name: 'ผู้ป่วยนอก (OPD)', code: 'OPD', nodes: [
        { kind: 'room', name: 'ห้องตรวจ 1', code: 'R1', doctor: 'พญ.สมหญิง รักษ์ดี' },
        { kind: 'room', name: 'ห้องตรวจ 2', code: 'R2', doctor: 'นพ.ธนกฤต ใจดี' },
        { kind: 'room', name: 'ห้องตรวจ 3', code: 'R3', doctor: '' },
        { kind: 'bed', name: 'เตียงสังเกตอาการ', code: 'B1', capacity: 4 },
      ] },
      { kind: 'department', name: 'ทันตกรรม', code: 'DENT', nodes: [
        { kind: 'room', name: 'ยูนิตทำฟัน 1', code: 'D1', doctor: 'ทพ.ณัฐพล ยิ้มสวย' },
        { kind: 'room', name: 'ยูนิตทำฟัน 2', code: 'D2', doctor: '' },
      ] },
      { kind: 'department', name: 'เภสัชกรรม', code: 'PHAR', nodes: [
        { kind: 'room', name: 'ช่องจ่ายยา 1', code: 'P1' },
        { kind: 'room', name: 'ช่องจ่ายยา 2', code: 'P2' },
      ] },
      { kind: 'department', name: 'ชันสูตรโรค', code: 'LAB', nodes: [
        { kind: 'room', name: 'ห้องเจาะเลือด', code: 'L1' },
      ] },
      { kind: 'department', name: 'รังสีวินิจฉัย', code: 'XRAY', nodes: [
        { kind: 'room', name: 'ห้องเอกซเรย์', code: 'X1' },
      ] },
      { kind: 'clinic', name: 'คลินิกโรคเรื้อรัง (เบาหวาน/ความดัน)', code: 'NCD', nodes: [
        { kind: 'room', name: 'ห้องตรวจ NCD', code: 'N1', doctor: 'นพ.ธนกฤต ใจดี' },
      ] },
      { kind: 'clinic', name: 'คลินิกฝากครรภ์', code: 'ANC', nodes: [
        { kind: 'room', name: 'ห้องตรวจ ANC', code: 'A1' },
      ] },
      { kind: 'clinic', name: 'คลินิกสร้างเสริมภูมิคุ้มกันโรค', code: 'EPI', nodes: [
        { kind: 'room', name: 'ห้องฉีดวัคซีน', code: 'E1' },
      ] },
    ],
  },
  {
    id: 'structure-demo-medium',
    name: 'ศูนย์ขนาดกลาง — มีทันตกรรม',
    appliedCenters: MEDIUM_CENTER_NOS.map(hcode),
    units: [
      { kind: 'department', name: 'ผู้ป่วยนอก (OPD)', code: 'OPD', nodes: [
        { kind: 'room', name: 'ห้องตรวจ 1', code: 'R1', doctor: '' },
        { kind: 'room', name: 'ห้องตรวจ 2', code: 'R2', doctor: '' },
        { kind: 'bed', name: 'เตียงสังเกตอาการ', code: 'B1', capacity: 2 },
      ] },
      { kind: 'department', name: 'ทันตกรรม', code: 'DENT', nodes: [
        { kind: 'room', name: 'ยูนิตทำฟัน', code: 'D1' },
      ] },
      { kind: 'department', name: 'เภสัชกรรม', code: 'PHAR', nodes: [
        { kind: 'room', name: 'ช่องจ่ายยา', code: 'P1' },
      ] },
      { kind: 'clinic', name: 'คลินิกโรคเรื้อรัง (เบาหวาน/ความดัน)', code: 'NCD', nodes: [
        { kind: 'room', name: 'ห้องตรวจ NCD', code: 'N1' },
      ] },
    ],
  },
  {
    id: 'structure-demo-small',
    name: 'ศูนย์ขนาดเล็ก — ตรวจโรคทั่วไป',
    appliedCenters: SMALL_CENTER_NOS.map(hcode),
    units: [
      { kind: 'department', name: 'ผู้ป่วยนอก (OPD)', code: 'OPD', nodes: [
        { kind: 'room', name: 'ห้องตรวจ', code: 'R1' },
        { kind: 'bed', name: 'เตียงสังเกตอาการ', code: 'B1', capacity: 1 },
      ] },
      { kind: 'department', name: 'เภสัชกรรม', code: 'PHAR', nodes: [
        { kind: 'room', name: 'ช่องจ่ายยา', code: 'P1' },
      ] },
    ],
  },
  {
    id: 'structure-demo-branch',
    name: 'สาขาย่อย/จุดบริการชุมชน',
    appliedCenters: [],
    draft: true,
    units: [
      { kind: 'clinic', name: 'จุดบริการชุมชน', code: 'CBS', nodes: [
        { kind: 'room', name: 'โต๊ะตรวจ', code: 'C1' },
      ] },
    ],
  },
];

export const DEMO_STRUCTURES = DEMO_TEMPLATES.map((t) => ({
  ...createStructureTemplate({
    name: t.name,
    units: t.units.map((u) => createUnit(u)),
    appliedCenters: t.appliedCenters,
    draft: t.draft,
  }),
  /* id คงที่ เพื่อให้ลิงก์ /admin/structures/:id/edit ใช้ได้ทุกครั้งที่โหลด */
  id: t.id,
}));

export function readStructures() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    /* เบราว์เซอร์ใหม่ให้ชุดตัวอย่าง — ไม่งั้นหน้า "รูปแบบโครงสร้างศูนย์" ว่าง
       และ dropdown "ใช้รูปแบบที่เคยสร้างไว้" ในฟอร์มเพิ่มศูนย์ก็ไม่มีอะไรให้เลือก
       (แบบเดียวกับ readCenters ที่คืน DEMO_CENTERS) */
    if (raw == null) return DEMO_STRUCTURES.map(normalizeTemplate);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return DEMO_STRUCTURES.map(normalizeTemplate);
    return parsed.map(normalizeTemplate);
  } catch {
    return DEMO_STRUCTURES.map(normalizeTemplate);
  }
}

/** รองรับข้อมูลที่บันทึกไว้ตอนยังเป็นโครงสร้าง 3 ชั้น (departments[].clinics[])
    โดยแบนคลินิกขึ้นมาอยู่ระดับเดียวกับแผนก. */
function normalizeTemplate(tpl) {
  if (Array.isArray(tpl?.units)) return tpl;
  const legacy = Array.isArray(tpl?.departments) ? tpl.departments : [];
  const units = [];
  legacy.forEach((d) => {
    units.push(createUnit({ ...d, kind: 'department', nodes: [] }));
    (d.clinics || []).forEach((c) => units.push(createUnit({ ...c, kind: 'clinic' })));
  });
  const { departments, ...rest } = tpl || {};
  return { ...rest, units };
}

export function writeStructures(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch { /* private mode / storage เต็ม — ข้ามไป ไม่ให้หน้าจอพัง */ }
}

/** รูปแบบโครงสร้างที่ศูนย์นี้ผูกอยู่ — เทียบด้วย hcode9 ก่อน แล้วค่อยรหัสศูนย์
    (appliedCenters เก็บได้ทั้งสองแบบตามที่ผู้ใช้เลือกตอนผูก) */
export function findStructureForCenter(structures, center) {
  if (!center) return null;
  const keys = [center.hcode9, center.code].filter(Boolean).map(String);
  if (!keys.length) return null;
  return (structures || []).find(
    (t) => (t.appliedCenters || []).some((k) => keys.includes(String(k))),
  ) || null;
}

export function findStructure(id) {
  return readStructures().find((s) => s.id === id) || null;
}

export function upsertStructure(record) {
  const list = readStructures();
  const idx = list.findIndex((s) => s.id === record.id);
  writeStructures(idx >= 0 ? list.map((s, i) => (i === idx ? record : s)) : [...list, record]);
  return record;
}

export function deleteStructure(id) {
  writeStructures(readStructures().filter((s) => s.id !== id));
}

/** ทำสำเนาทั้งรูปแบบ — id ใหม่ทุกชั้น และไม่ลากศูนย์ที่ผูกไว้เดิมมาด้วย
    เพราะหนึ่งศูนย์ควรใช้รูปแบบเดียว ไม่ให้ชนกันเองตั้งแต่วินาทีที่ก๊อป. */
export function duplicateStructureTemplate(tpl) {
  return createStructureTemplate({
    name: copyName(tpl.name),
    /* ชื่อรูปแบบต่อท้าย (สำเนา) แล้ว ชั้นในจึงคงชื่อเดิมไว้ ไม่ซ้อนอีกชั้น */
    units: (tpl.units || []).map((u) => ({
      ...createUnit({ ...u, nodes: [] }),
      nodes: (u.nodes || []).map((n) => createRoomNode(n)),
    })),
    appliedCenters: [],
    draft: !!tpl.draft,
  });
}

/** คัดลอกรูปแบบมาใช้เป็นจุดตั้งต้นของศูนย์ที่กำลังสร้าง (id ใหม่ทั้งหมด). */
export function instantiateUnits(units = []) {
  return units.map((u) => ({
    ...createUnit({ ...u, nodes: [] }),
    nodes: (u.nodes || []).map((n) => createRoomNode(n)),
  }));
}
