/* PHCIS | Assess-control — Position registry (Figma 3:15678).
   Mock persistence via localStorage. */

const STORAGE_KEY = 'mih:assess-positions';

const uid = () => `pos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const DEMO_POSITIONS = [
  { id: 'pos-specialist', name: 'ผู้เชี่ยวชาญ (Specialist)', active: true, order: 1 },
  { id: 'pos-consultant', name: 'ที่ปรึกษา (Consultant)', active: true, order: 2 },
];

export function readPositions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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
