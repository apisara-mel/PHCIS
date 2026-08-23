/* PHCIS | Assess-control — Position registry (Figma 3:15678).
   Mock persistence via localStorage. */

const STORAGE_KEY = 'mih:assess-positions';

const uid = () => `pos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/* ตำแหน่ง = ระดับ/บทบาทในสายงาน ไม่ผูกกับวิชาชีพ (กิจกรรม) และไม่ผูกกับ
   แม่แบบสิทธิ — กำหนดให้บุคลากรตอนเพิ่มบุคลากร (step หน่วยงานและตำแหน่ง).
   ชุดตั้งต้นครอบทั้งสายบริหาร สายวิชาชีพ และสายสนับสนุนของสำนักอนามัย. */
export const DEMO_POSITIONS = [
  { id: 'pos-director',     name: 'ผู้อำนวยการศูนย์บริการสาธารณสุข', active: true, order: 1 },
  { id: 'pos-deputy',       name: 'รองผู้อำนวยการศูนย์', active: true, order: 2 },
  { id: 'pos-head',         name: 'หัวหน้ากลุ่มงาน', active: true, order: 3 },
  { id: 'pos-head-dept',    name: 'หัวหน้าแผนก', active: true, order: 4 },
  { id: 'pos-specialist',   name: 'ผู้เชี่ยวชาญ (Specialist)', active: true, order: 5 },
  { id: 'pos-consultant',   name: 'ที่ปรึกษา (Consultant)', active: true, order: 6 },
  { id: 'pos-senior',       name: 'ชำนาญการพิเศษ', active: true, order: 7 },
  { id: 'pos-professional', name: 'ชำนาญการ', active: true, order: 8 },
  { id: 'pos-practitioner', name: 'ปฏิบัติการ', active: true, order: 9 },
  { id: 'pos-staff',        name: 'เจ้าหน้าที่', active: true, order: 10 },
  { id: 'pos-assistant',    name: 'ผู้ช่วยเจ้าหน้าที่', active: true, order: 11 },
  { id: 'pos-temp',         name: 'ลูกจ้างชั่วคราว', active: true, order: 12 },
  { id: 'pos-intern',       name: 'นักศึกษาฝึกงาน', active: false, order: 13 },
];

/** ทะเบียนว่าง (เบราว์เซอร์ใหม่) ให้คืนชุดตั้งต้น ไม่งั้น dropdown "ตำแหน่ง"
    ตอนเพิ่มบุคลากรจะว่างจนไปต่อไม่ได้. เขียนทับได้ที่หน้า "ตำแหน่ง". */
export function readPositions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEMO_POSITIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEMO_POSITIONS;
  } catch {
    return DEMO_POSITIONS;
  }
}

export function writePositions(positions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

export function sortPositions(positions) {
  return [...(positions || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function computePositionStats(positions) {
  const list = positions || [];
  return {
    total: list.length,
    active: list.filter((p) => p.active).length,
    inactive: list.filter((p) => !p.active).length,
  };
}

export function createPosition(name, order) {
  return {
    id: uid(),
    name: name.trim(),
    active: true,
    order,
  };
}

export function reorderPositions(positions, fromIdx, toIdx) {
  const copy = sortPositions(positions);
  const [moved] = copy.splice(fromIdx, 1);
  copy.splice(toIdx, 0, moved);
  return copy.map((p, i) => ({ ...p, order: i + 1 }));
}

export function isDuplicatePositionName(positions, name, excludeId = null) {
  const norm = name.trim().toLowerCase();
  if (!norm) return false;
  return positions.some((p) => (
    p.id !== excludeId && p.name.trim().toLowerCase() === norm
  ));
}
