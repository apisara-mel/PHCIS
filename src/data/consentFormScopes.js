/* Group Policy · สาขาย่อย · แผนก — canonical catalog (mirrors CreateConsentFormPage wizard). */

export const CONSENT_SCOPE_DEPTS = [
  'แผนกผู้ป่วยนอก (OPD)',
  'งานทันตกรรม',
  'งานเภสัชกรรม',
  'งานการพยาบาล',
  'งานส่งเสริมสุขภาพ',
  'งานอนามัยแม่และเด็ก',
  'งานควบคุมโรคติดต่อ',
  'งานอนามัยสิ่งแวดล้อม',
  'งานสุขภาพจิต',
  'งานการแพทย์แผนไทย',
  'งานเวชศาสตร์ฟื้นฟู',
  'งานชันสูตรสาธารณสุข (Lab)',
  'งานเวชระเบียน',
];

/** ทุก Group Policy + สาขาย่อย (label ตรง wizard). */
export const CONSENT_SCOPE_TREE = [
  {
    group: 'แพทย์',
    subBranches: ['แพทย์ทั่วไป', 'แพทย์เฉพาะทาง', 'ทันตแพทย์', 'แพทย์แผนไทย'],
  },
  {
    group: 'พยาบาล',
    subBranches: ['พยาบาลวิชาชีพ', 'พยาบาลห้องฉุกเฉิน', 'พยาบาลเวชปฏิบัติ', 'ผู้ช่วยพยาบาล'],
  },
  {
    group: 'เภสัชกร',
    subBranches: ['เภสัชกรคลินิก', 'เภสัชกรชุมชน', 'เภสัชกรการผลิต'],
  },
  {
    group: 'นักเทคนิคการแพทย์',
    subBranches: ['นักเทคนิคการแพทย์', 'นักวิทยาศาสตร์การแพทย์'],
  },
  {
    group: 'นักกายภาพบำบัด',
    subBranches: ['นักกายภาพบำบัด', 'นักกิจกรรมบำบัด'],
  },
  {
    group: 'นักรังสีการแพทย์',
    subBranches: ['นักรังสีการแพทย์', 'เจ้าพนักงานรังสีการแพทย์'],
  },
  {
    group: 'นักวิชาการสาธารณสุข',
    subBranches: ['นักวิชาการสาธารณสุข', 'นักวิชาการส่งเสริมสุขภาพ', 'นักระบาดวิทยา'],
  },
  {
    group: 'นักโภชนาการ',
    subBranches: ['นักโภชนาการ', 'นักกำหนดอาหาร'],
  },
  {
    group: 'นักจิตวิทยา',
    subBranches: ['นักจิตวิทยาคลินิก', 'นักจิตวิทยา'],
  },
  {
    group: 'นักสังคมสงเคราะห์',
    subBranches: ['นักสังคมสงเคราะห์', 'นักพัฒนาสังคม'],
  },
  {
    group: 'เจ้าพนักงานสาธารณสุข',
    subBranches: ['เจ้าพนักงานสาธารณสุข', 'เจ้าพนักงานทันตสาธารณสุข'],
  },
  {
    group: 'เจ้าหน้าที่บริหาร / ธุรการ',
    subBranches: ['เจ้าหน้าที่บริหารงานทั่วไป', 'เจ้าพนักงานธุรการ', 'นักวิชาการเงินและบัญชี'],
  },
];

const scopeKey = (s) => `${s.group}\0${s.subBranch}\0${s.dept}`;

export { scopeKey as consentScopeKey };

/** ตำแหน่งองค์กร — ระดับอำนาจในศูนย์ฯ (Figma 369:124873). */
export const CONSENT_POSITION_OPTIONS = [
  { value: 'director', label: 'ผู้อำนวยการศูนย์บริการสาธารณสุข' },
  { value: 'deputy', label: 'รองผู้อำนวยการ' },
  { value: 'group-head', label: 'หัวหน้ากลุ่มงาน' },
  { value: 'dept-head', label: 'หัวหน้าแผนก' },
  { value: 'section-head', label: 'หัวหน้างาน' },
  { value: 'head-nurse', label: 'หัวหน้าพยาบาล' },
  { value: 'practitioner', label: 'ผู้ปฏิบัติงาน' },
  { value: 'staff', label: 'เจ้าหน้าที่ทั่วไป' },
];

export const ALL_CONSENT_POSITION_VALUES = CONSENT_POSITION_OPTIONS.map((o) => o.value);

export function consentPositionLabel(value) {
  return CONSENT_POSITION_OPTIONS.find((o) => o.value === value)?.label || value;
}

/** คืน scope แบบ group + subBranch + dept เท่านั้น (ไม่ผูกตำแหน่ง). */
export function stripConsentScope(scope) {
  return {
    group: scope.group,
    subBranch: scope.subBranch,
    dept: scope.dept,
  };
}

export function stripConsentScopes(scopes) {
  return dedupeConsentScopes((scopes || []).map(stripConsentScope));
}

/** ดึงตำแหน่งจากข้อมูลเก่าที่ผูกใน scope (migration). */
export function extractPositionsFromScopes(scopes) {
  const set = new Set();
  (scopes || []).forEach((s) => {
    (s.positions || []).forEach((p) => set.add(p));
  });
  return [...set];
}

/** ลบ scope ซ้ำ (group + subBranch + dept). */
export function dedupeConsentScopes(list) {
  const seen = new Set();
  return list.filter((s) => {
    const key = scopeKey(s);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** สร้าง catalog ครบทุกกลุ่ม · สาขาย่อย · หมุนแผนกให้ครบทุกงาน. */
export function buildConsentScopeCatalog() {
  const scopes = [];
  let deptIdx = 0;
  CONSENT_SCOPE_TREE.forEach(({ group, subBranches }) => {
    subBranches.forEach((subBranch) => {
      scopes.push({
        group,
        subBranch,
        dept: CONSENT_SCOPE_DEPTS[deptIdx % CONSENT_SCOPE_DEPTS.length],
      });
      deptIdx += 1;
    });
  });
  /* รอบที่สอง — สาขาย่อยเดิม + แผนกสลับ เพื่อให้ทุกแผนกปรากฏมากกว่า 1 ครั้ง */
  CONSENT_SCOPE_TREE.forEach(({ group, subBranches }) => {
    subBranches.forEach((subBranch, j) => {
      scopes.push({
        group,
        subBranch,
        dept: CONSENT_SCOPE_DEPTS[(deptIdx + j + 4) % CONSENT_SCOPE_DEPTS.length],
      });
    });
    deptIdx += subBranches.length;
  });
  return dedupeConsentScopes(scopes);
}

/** Mock scopes ต่อแบบฟอร์ม — หลากหลายตาม index · แบบฟอร์มแรกได้ครบ catalog. */
export function scopesForConsentFormRecord(index, catalog = buildConsentScopeCatalog()) {
  if (!catalog.length) {
    return [{ group: '—', subBranch: '—', dept: '—' }];
  }
  if (index === 0) return [...catalog];

  const primary = catalog[index % catalog.length];
  const extraCount = 4 + (index % 9);
  const extras = Array.from({ length: extraCount }, (_, k) =>
    catalog[(index + (k + 1) * 5) % catalog.length],
  );
  return dedupeConsentScopes([primary, ...extras]);
}

/** Mock positions per registry row — index 0 = ทุกตำแหน่ง. */
export function positionsForConsentFormRecord(index) {
  const all = ALL_CONSENT_POSITION_VALUES;
  if (!all.length) return [];
  if (index === 0) return [...all];

  const count = 3 + (index % 5);
  const picked = new Set();
  for (let k = 0; k < count; k++) {
    picked.add(all[(index + k * 2) % all.length]);
  }
  return [...picked];
}

/** Positions on a registry row (or legacy positions embedded in scopes). */
export function resolveRecordPositions(source) {
  if (Array.isArray(source)) return source;
  if (source?.positions?.length) return source.positions;
  const fromScopes = extractPositionsFromScopes(source?.scopes);
  if (fromScopes.length) return fromScopes;
  return positionsForConsentFormRecord(Number(source?.id) - 1 || 0);
}
