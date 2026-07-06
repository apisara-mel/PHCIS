/* PHCIS | Assess-control — Group Policy registry (Figma 3:18430).
   Mock persistence via localStorage; shapes match the list + popup flows. */

const STORAGE_KEY = 'mih:group-policies';

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const DEMO_GROUP_POLICIES = [
  {
    id: 'gp-doctor',
    name: 'แพทย์',
    subBranches: [
      { id: 'sb-dent', name: 'ทันตกรรม', active: true, order: 1 },
      { id: 'sb-thai', name: 'แพทย์แผนไทย', active: true, order: 2 },
    ],
  },
  {
    id: 'gp-nurse',
    name: 'พยาบาล',
    subBranches: [
      { id: 'sb-opd', name: 'OPD', active: true, order: 1 },
      { id: 'sb-ipd', name: 'IPD', active: false, order: 2 },
    ],
  },
];

export function readGroupPolicies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeGroupPolicies(policies) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(policies));
}

export function computeGroupPolicyStats(policies) {
  const subBranches = policies.flatMap((p) => p.subBranches || []);
  return {
    total: policies.length,
    active: subBranches.filter((s) => s.active).length,
    inactive: subBranches.filter((s) => !s.active).length,
  };
}

export function createGroupPolicy(name) {
  return {
    id: uid('gp'),
    name: name.trim(),
    subBranches: [],
  };
}

export function createSubBranch(name, order) {
  return {
    id: uid('sb'),
    name: name.trim(),
    active: true,
    order,
  };
}

export function sortSubBranches(subBranches) {
  return [...(subBranches || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function reorderSubBranches(subBranches, fromIdx, toIdx) {
  const copy = sortSubBranches(subBranches);
  const [moved] = copy.splice(fromIdx, 1);
  copy.splice(toIdx, 0, moved);
  return copy.map((sb, i) => ({ ...sb, order: i + 1 }));
}

export function isDuplicateGroupPolicyName(policies, name, excludeId = null) {
  const norm = name.trim().toLowerCase();
  if (!norm) return false;
  return policies.some((p) => (
    p.id !== excludeId && p.name.trim().toLowerCase() === norm
  ));
}

export function loadDemoPolicies() {
  writeGroupPolicies(DEMO_GROUP_POLICIES);
  return DEMO_GROUP_POLICIES;
}

export function clearGroupPolicies() {
  localStorage.removeItem(STORAGE_KEY);
}
