/* ระบบจัดการระบบ · Template กิจกรรมและเป้าหมายการเยี่ยมบ้าน
   มาสเตอร์กลางของสำนักอนามัยตามมติ คทง.4 ครั้งที่ 5 ต่อ TOR §1.18.5.
   หน้าปฏิบัติการเลือก snapshot ของ template ได้ แต่สร้าง/แก้สูตรกลางไม่ได้. */

const STORAGE_KEY = 'mih:homevisit:care-templates';

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const clone = (value) => JSON.parse(JSON.stringify(value));

const stampNow = () => new Date().toISOString();

/* แคตตาล็อกเดิมจาก §1.18.7 ย้ายมาเป็น seed ที่เดียว เพื่อให้หน้า admin และ
   แบบบันทึกเยี่ยมบ้านไม่ถือรายการกิจกรรมคนละชุด. */
export const CARE_ACTIVITIES = [
  { key: 'vitalCheck', label: 'ตรวจวัดสัญญาณชีพ', group: 'พยาบาล', active: true },
  { key: 'woundCare', label: 'ทำแผล/ดูแลแผลกดทับ', group: 'พยาบาล', active: true },
  { key: 'suction', label: 'ดูดเสมหะ', group: 'พยาบาล', active: true },
  { key: 'catheter', label: 'ใส่/เปลี่ยนสายสวนปัสสาวะ', group: 'พยาบาล', active: true },
  { key: 'ngTube', label: 'ใส่/เปลี่ยนสายให้อาหาร', group: 'พยาบาล', active: true },
  { key: 'medReview', label: 'ทบทวนยาและยาเหลือใช้', group: 'เภสัชกรรม', active: true },
  { key: 'physioTrain', label: 'ฝึกกายภาพบำบัด/การเคลื่อนไหว', group: 'กายภาพบำบัด', active: true },
  { key: 'healthEdu', label: 'ให้สุขศึกษาผู้ป่วยและญาติ', group: 'ส่งเสริมสุขภาพ', active: true },
  { key: 'caregiverTrain', label: 'สอนผู้ดูแลเรื่องการดูแลที่บ้าน', group: 'ส่งเสริมสุขภาพ', active: true },
  { key: 'mentalSupport', label: 'ให้คำปรึกษาด้านจิตใจ', group: 'จิตสังคม', active: true },
  { key: 'welfareCoord', label: 'ประสานสวัสดิการ/อุปกรณ์ช่วย', group: 'จิตสังคม', active: true },
  { key: 'envAdjust', label: 'ปรับสภาพแวดล้อมในบ้าน', group: 'สิ่งแวดล้อม', active: true },
  { key: 'vaccineAdvice', label: 'แนะนำ/ให้วัคซีนตามเกณฑ์', group: 'ส่งเสริมสุขภาพ', active: true },
  { key: 'referCoord', label: 'ประสานส่งต่อสถานพยาบาล', group: 'ส่งต่อ', active: true },
];

export const HOMEVISIT_CARE_TEMPLATE_SEED = [
  {
    id: 'pressure-sore', active: true, sortOrder: 1,
    problem: 'แผลกดทับบริเวณก้นกบ', goal: 'แผลกดทับหายภายใน 2 เดือน', horizon: 'short',
    evaluation: 'แผลเล็กลง ขอบแผลไม่แดง และไม่มีหนอง', activityIds: ['woundCare', 'caregiverTrain'],
  },
  {
    id: 'mobility', active: true, sortOrder: 2,
    problem: 'การเคลื่อนไหวและการเดินลดลง', goal: 'ผู้ป่วยเดินได้ดีขึ้น', horizon: 'short',
    evaluation: 'ลุกยืนและเดินตามระยะที่กำหนดได้อย่างปลอดภัยมากขึ้น', activityIds: ['physioTrain'],
  },
  {
    id: 'medication-adherence', active: true, sortOrder: 3,
    problem: 'ใช้ยาไม่ต่อเนื่องหรือมีความเสี่ยงใช้ยาคลาดเคลื่อน', goal: 'ทบทวนยาและเพิ่มความร่วมมือในการใช้ยา', horizon: 'short',
    evaluation: 'ผู้ป่วยหรือผู้ดูแลอธิบายวิธีใช้ยาได้ และรับประทานยาตามแผน', activityIds: ['medReview'],
  },
  {
    id: 'caregiver-understanding', active: true, sortOrder: 4,
    problem: 'ผู้ดูแลยังไม่มั่นใจในการดูแลผู้รับบริการที่บ้าน', goal: 'ผู้ดูแลเข้าใจการดูแลที่บ้านภายใน 6 เดือน', horizon: 'long',
    evaluation: 'ผู้ดูแลสาธิตการดูแลพื้นฐานได้ และรู้สัญญาณที่ต้องประสานทีม', activityIds: ['caregiverTrain', 'healthEdu'],
  },
];

/* ประวัติจำลองสำหรับให้หน้าจอ audit เห็นทั้งการปรับโควตาและการปรับ Template
   ตั้งแต่เริ่มใช้งานจริง โดยการบันทึกของผู้ดูแลจะต่อท้ายรายการนี้. */
export const HOMEVISIT_CARE_TEMPLATE_AUDIT_SEED = [
  {
    id: 'hv-care-seed-pressure-sore', entity: 'template', entityId: 'pressure-sore',
    before: { problem: 'แผลกดทับบริเวณก้นกบ', goal: 'แผลดีขึ้นภายใน 3 เดือน' },
    after: { problem: 'แผลกดทับบริเวณก้นกบ', goal: 'แผลกดทับหายภายใน 2 เดือน' },
    reason: 'ปรับเป้าหมายและเกณฑ์ประเมินผลตามแนวทางการดูแลแผลกดทับของสำนักอนามัย',
    by: 'พญ.วิภา รักษ์ดี', at: '2026-08-22T03:15:00.000Z',
  },
  {
    id: 'hv-care-seed-medication', entity: 'template', entityId: 'medication-adherence',
    before: { problem: 'ใช้ยาไม่ต่อเนื่อง', goal: 'ผู้ป่วยรับประทานยาตามแผน' },
    after: { problem: 'ใช้ยาไม่ต่อเนื่องหรือมีความเสี่ยงใช้ยาคลาดเคลื่อน', goal: 'ทบทวนยาและเพิ่มความร่วมมือในการใช้ยา' },
    reason: 'รวบรวมปัญหาและเป้าหมายร่วมจากการปฏิบัติงานของทีมเภสัชกรรม',
    by: 'นางสาวกมลวรรณ ศรีสุข', at: '2026-08-16T04:30:00.000Z',
  },
  {
    id: 'hv-care-seed-caregiver', entity: 'template', entityId: 'caregiver-understanding',
    before: { problem: 'ผู้ดูแลขาดความรู้เรื่องการดูแลที่บ้าน', goal: 'ผู้ดูแลเข้าใจการดูแลที่บ้าน' },
    after: { problem: 'ผู้ดูแลยังไม่มั่นใจในการดูแลผู้รับบริการที่บ้าน', goal: 'ผู้ดูแลเข้าใจการดูแลที่บ้านภายใน 6 เดือน' },
    reason: 'กำหนดระยะเป้าหมายระยะยาวให้ชัดเจนตามมติ คทง.4',
    by: 'นายวรพล รัศมีพร', at: '2026-08-09T02:00:00.000Z',
  },
];

const normalizeActivity = (source = {}, index = 0) => ({
  key: String(source.key || '').trim(),
  label: String(source.label || '').trim(),
  group: String(source.group || '').trim(),
  active: source.active !== false,
  sortOrder: Number.isInteger(Number(source.sortOrder)) ? Number(source.sortOrder) : index + 1,
});

const normalizeTemplate = (source = {}, index = 0, activities = []) => ({
  id: String(source.id || '').trim(),
  active: source.active !== false,
  problem: String(source.problem || '').trim(),
  goal: String(source.goal || '').trim(),
  horizon: source.horizon === 'long' ? 'long' : 'short',
  evaluation: String(source.evaluation || '').trim(),
  activityIds: [...new Set((Array.isArray(source.activityIds) ? source.activityIds : [])
    .map((id) => String(id || '').trim())
    .filter((id) => activities.some((activity) => activity.key === id)))],
  sortOrder: Number.isInteger(Number(source.sortOrder)) ? Number(source.sortOrder) : index + 1,
});

const defaultState = () => ({
  activities: CARE_ACTIVITIES.map((activity, index) => normalizeActivity(activity, index)),
  templates: HOMEVISIT_CARE_TEMPLATE_SEED.map((template, index) => normalizeTemplate(template, index, CARE_ACTIVITIES)),
  audit: HOMEVISIT_CARE_TEMPLATE_AUDIT_SEED.map((row) => ({ ...row, before: { ...row.before }, after: { ...row.after } })),
  savedBy: null,
  savedAt: null,
});

const mergeAuditSeed = (audit) => {
  const current = Array.isArray(audit) ? audit : [];
  const missing = HOMEVISIT_CARE_TEMPLATE_AUDIT_SEED
    .filter((seed) => !current.some((row) => row?.id === seed.id))
    .map((row) => ({ ...row, before: { ...row.before }, after: { ...row.after } }));
  return [...current, ...missing];
};

const normalizeState = (source = {}) => {
  const activities = (Array.isArray(source.activities) ? source.activities : CARE_ACTIVITIES)
    .map(normalizeActivity)
    .filter((activity) => activity.key && activity.label && activity.group)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const templates = (Array.isArray(source.templates) ? source.templates : HOMEVISIT_CARE_TEMPLATE_SEED)
    .map((template, index) => normalizeTemplate(template, index, activities))
    .filter((template) => template.id && template.problem && template.goal && template.evaluation)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    activities,
    templates,
    audit: mergeAuditSeed(source.audit),
    savedBy: source.savedBy || null,
    savedAt: source.savedAt || null,
  };
};

const readState = () => {
  if (!canUseSessionStorage()) return defaultState();
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (parsed && typeof parsed === 'object') return normalizeState(parsed);
  } catch { /* use seed */ }
  const seeded = defaultState();
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
};

const writeState = (state) => {
  if (canUseSessionStorage()) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const getHomeVisitCareActivities = () => clone(readState().activities);

export const getHomeVisitCareTemplates = ({ activeOnly = false } = {}) => {
  const templates = readState().templates;
  return clone(activeOnly ? templates.filter((template) => template.active) : templates);
};

export const getHomeVisitCareTemplateAudit = () => clone(readState().audit)
  .sort((left, right) => String(right.at || '').localeCompare(String(left.at || '')));

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const auditChanges = (entity, beforeRows, afterRows, at, by, reason) => {
  const ids = new Set([...beforeRows.map((row) => row.key || row.id), ...afterRows.map((row) => row.key || row.id)]);
  return [...ids].flatMap((id) => {
    const before = beforeRows.find((row) => (row.key || row.id) === id) || null;
    const after = afterRows.find((row) => (row.key || row.id) === id) || null;
    if (same(before, after)) return [];
    return [{
      id: `hv-care-${entity}-${Date.now()}-${id}`,
      entity, entityId: id, before, after, by, at, reason,
    }];
  });
};

/** บันทึกแคตตาล็อกและเทมเพลตทั้งชุด; การเอาออกจากหน้าจอไม่รองรับ — ปิดใช้แทน
    เพื่อให้ snapshot ในประวัติการเยี่ยมเก่ายังคงอ้างอิงและอ่านได้. */
export const saveHomeVisitCareCatalog = (next = {}, { reason, by } = {}) => {
  const previous = readState();
  const activities = (Array.isArray(next.activities) ? next.activities : previous.activities)
    .map(normalizeActivity)
    .filter((activity) => activity.key && activity.label && activity.group)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const templates = (Array.isArray(next.templates) ? next.templates : previous.templates)
    .map((template, index) => normalizeTemplate(template, index, activities))
    .filter((template) => template.id && template.problem && template.goal && template.evaluation)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const invalidTemplate = templates.find((template) => (
    !['short', 'long'].includes(template.horizon)
    || template.activityIds.length === 0
    || !template.activityIds.some((id) => activities.some((activity) => activity.key === id && activity.active))
  ));
  if (invalidTemplate) throw new Error('แต่ละเทมเพลตต้องมีข้อมูลครบและเลือกกิจกรรมที่ยังเปิดใช้อย่างน้อย 1 รายการ');
  const changed = !same(previous.activities, activities) || !same(previous.templates, templates);
  const cleanReason = String(reason || '').trim();
  if (changed && !cleanReason) throw new Error('กรุณาระบุเหตุผลเมื่อปรับเทมเพลตหรือแคตตาล็อกกิจกรรม');

  const at = stampNow();
  const savedBy = String(by || 'ผู้ดูแลระบบ').trim() || 'ผู้ดูแลระบบ';
  const audit = changed ? [
    ...previous.audit,
    ...auditChanges('activity', previous.activities, activities, at, savedBy, cleanReason),
    ...auditChanges('template', previous.templates, templates, at, savedBy, cleanReason),
  ] : previous.audit;
  const state = { activities, templates, audit, savedBy, savedAt: at };
  writeState(state);
  return clone({ state, audit: getHomeVisitCareTemplateAudit() });
};
