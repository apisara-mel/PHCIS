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
      if (n.kind === 'bed') beds += 1; else rooms += 1;
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

export function readStructures() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw == null ? [] : JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeTemplate) : [];
  } catch {
    return [];
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
