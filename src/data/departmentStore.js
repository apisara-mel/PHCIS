/* PHCIS | Assess-control — Department registry (Figma 9:16022).
   Mock persistence via localStorage.

   Departments are SCOPED PER ศูนย์บริการ — each record carries a `centerId`
   (the header clinic value, e.g. 'hc-4' = ศูนย์ 4 ดินแดง) because every
   center runs a different set of departments. All records live in one flat
   array under STORAGE_KEY; read/write/create take a centerId to scope to the
   currently-selected center, and duplicate-name checks run within that
   center only (the same department name may exist across different centers). */

const STORAGE_KEY = 'mih:assess-departments';

const uid = () => `dept-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const DEMO_DEPARTMENTS = [
  { id: 'dept-im', centerId: 'hc-4', name: 'อายุรกรรม (Internal Medicine)', active: true, order: 1 },
  { id: 'dept-surg', centerId: 'hc-4', name: 'ศัลยกรรม (Surgery)', active: true, order: 2 },
];

/* Raw read of the full cross-center array (unscoped). */
function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* Departments for a single center, sorted by order. Omit centerId to read
   the whole cross-center array (used by reports / migrations). */
export function readDepartments(centerId) {
  const all = readAll();
  if (!centerId) return all;
  return sortDepartments(all.filter((d) => d.centerId === centerId));
}

/* Replace the department list for ONE center, preserving every other
   center's records. Omit centerId to overwrite the whole array. */
export function writeDepartments(centerId, departments) {
  if (!centerId) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(departments || []));
    return;
  }
  const others = readAll().filter((d) => d.centerId !== centerId);
  const scoped = (departments || []).map((d) => ({ ...d, centerId }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...others, ...scoped]));
}

export function sortDepartments(departments) {
  return [...(departments || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function computeDepartmentStats(departments) {
  const list = departments || [];
  return {
    total: list.length,
    active: list.filter((d) => d.active).length,
    inactive: list.filter((d) => !d.active).length,
  };
}

export function createDepartment(name, order, centerId) {
  return {
    id: uid(),
    centerId,
    name: name.trim(),
    active: true,
    order,
  };
}

export function reorderDepartments(departments, fromIdx, toIdx) {
  const copy = sortDepartments(departments);
  const [moved] = copy.splice(fromIdx, 1);
  copy.splice(toIdx, 0, moved);
  return copy.map((d, i) => ({ ...d, order: i + 1 }));
}

export function isDuplicateDepartmentName(departments, name, excludeId = null) {
  const norm = name.trim().toLowerCase();
  if (!norm) return false;
  return departments.some((d) => (
    d.id !== excludeId && d.name.trim().toLowerCase() === norm
  ));
}
