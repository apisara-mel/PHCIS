/* แคตตาล็อก Flag เยี่ยมบ้านระดับสำนักอนามัย (TOR §1.10.12.1, §1.1.3.1). */
import { COLORFUL_BADGE_STYLES } from '@/components/badge/ColorfulBadge';

const STORAGE_KEY = 'mih:homevisit:flag-catalog';
const clone = (value) => JSON.parse(JSON.stringify(value));
const canUseSessionStorage = () => typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
const stampNow = () => new Date().toISOString();

export const HOMEVISIT_FLAG_SEED = [
  { value: 'bedbound', label: 'ผู้ป่วยติดเตียง', badge: 'orange', note: 'ผู้รับบริการช่วยเหลือตัวเองไม่ได้ ต้องดูแลบนเตียง' },
  { value: 'fallRisk', label: 'เสี่ยงหกล้ม', badge: 'yellow', note: 'ประเมินความปลอดภัยและป้องกันการหกล้มในบ้าน' },
  { value: 'alone', label: 'อยู่ลำพัง/ไม่มีผู้ดูแลกลางวัน', badge: 'red', note: 'ไม่มีผู้ดูแลอยู่บ้านในช่วงกลางวัน' },
  { value: 'pressureSore', label: 'มีแผลกดทับ', badge: 'red', note: 'ใช้เมื่อมีแผลกดทับหรือจำเป็นต้องพลิกตัวช่วย' },
  { value: 'tubeFeeding', label: 'ให้อาหารทางสายยาง', badge: 'indigo', note: 'ต้องดูแลการให้อาหารทางสายยางที่บ้าน' },
  { value: 'oxygen', label: 'ใช้ออกซิเจนที่บ้าน', badge: 'blue', note: 'มีอุปกรณ์ออกซิเจนที่ต้องใช้อย่างต่อเนื่อง' },
  { value: 'infection', label: 'เฝ้าระวังการติดเชื้อ', badge: 'magenta', note: 'ติดตามอาการและสัญญาณเตือนการติดเชื้อ' },
  { value: 'palliative', label: 'ดูแลแบบประคับประคอง', badge: 'purple', note: 'ดูแลตามเป้าหมายและความต้องการระยะท้าย' },
].map((item, index) => ({ ...item, active: true, sortOrder: index + 1 }));

export const HOMEVISIT_FLAG_AUDIT_SEED = [
  {
    id: 'hv-flag-seed-pressure', entity: 'flag', entityId: 'pressureSore',
    before: { value: 'pressureSore', label: 'แผลกดทับ', badge: 'orange', active: true },
    after: { value: 'pressureSore', label: 'มีแผลกดทับ', badge: 'red', active: true },
    by: 'นายวรพล รัศมีพร', at: '2026-08-25T03:45:00.000Z', reason: 'ปรับชื่อและสีป้ายให้สื่อความหมายภาวะที่ต้องระวังชัดเจนขึ้น',
  },
  {
    id: 'hv-flag-seed-infection', entity: 'flag', entityId: 'infection',
    before: { value: 'infection', label: 'ติดเชื้อ', badge: 'red', active: true },
    after: { value: 'infection', label: 'เฝ้าระวังการติดเชื้อ', badge: 'magenta', active: true },
    by: 'นางสาวกมลวรรณ ศรีสุข', at: '2026-08-18T04:20:00.000Z', reason: 'ปรับถ้อยคำตามแนวทางการเฝ้าระวังการติดเชื้อในชุมชน',
  },
];

const normalize = (source = {}, index = 0) => ({
  value: String(source.value || '').trim(),
  label: String(source.label || '').trim(),
  badge: COLORFUL_BADGE_STYLES.includes(source.badge) ? source.badge : 'grey',
  active: source.active !== false,
  sortOrder: Number.isInteger(Number(source.sortOrder)) ? Number(source.sortOrder) : index + 1,
  note: String(source.note || '').trim(),
  updatedBy: source.updatedBy || null,
  updatedAt: source.updatedAt || null,
});

const seedState = () => ({ catalog: HOMEVISIT_FLAG_SEED.map(normalize), audit: HOMEVISIT_FLAG_AUDIT_SEED.map((row) => ({ ...row, before: { ...row.before }, after: { ...row.after } })), savedBy: null, savedAt: null });
const mergeAuditSeed = (audit) => {
  const current = Array.isArray(audit) ? audit : [];
  const missing = HOMEVISIT_FLAG_AUDIT_SEED.filter((seed) => !current.some((row) => row?.id === seed.id)).map((row) => ({ ...row, before: { ...row.before }, after: { ...row.after } }));
  return [...current, ...missing];
};
const readState = () => {
  if (!canUseSessionStorage()) return seedState();
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (parsed?.catalog) return { ...seedState(), ...parsed, catalog: parsed.catalog.map(normalize).filter((item) => item.value), audit: mergeAuditSeed(parsed.audit) };
  } catch { /* fallback to seed */ }
  const seeded = seedState();
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
};
const writeState = (state) => { if (canUseSessionStorage()) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export const getHomeVisitFlagCatalog = ({ activeOnly = false } = {}) => {
  const rows = readState().catalog.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  return clone(activeOnly ? rows.filter((item) => item.active) : rows);
};

export const resolveHomeVisitFlag = (value) => readState().catalog.find((item) => item.value === value) || null;
export const getHomeVisitFlagAudit = () => clone(readState().audit).sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));

export const saveHomeVisitFlagCatalog = (next = [], { reason, by } = {}) => {
  const previous = readState();
  const catalog = (Array.isArray(next) ? next : previous.catalog).map(normalize).filter((item) => item.value && item.label);
  const activeLabels = new Set();
  catalog.forEach((item) => {
    if (item.active) {
      const key = item.label.toLocaleLowerCase();
      if (activeLabels.has(key)) throw new Error('ชื่อ Flag ที่เปิดใช้ต้องไม่ซ้ำกัน');
      activeLabels.add(key);
    }
    if (!COLORFUL_BADGE_STYLES.includes(item.badge)) throw new Error('สีป้ายไม่ถูกต้อง');
  });
  const changed = !same(previous.catalog.map(({ updatedBy, updatedAt, ...row }) => row), catalog.map(({ updatedBy, updatedAt, ...row }) => row));
  const cleanReason = String(reason || '').trim();
  if (changed && !cleanReason) throw new Error('กรุณาระบุเหตุผลเมื่อปรับแคตตาล็อก Flag');
  const at = stampNow();
  const savedBy = String(by || 'ผู้ดูแลระบบ').trim() || 'ผู้ดูแลระบบ';
  const ids = new Set([...previous.catalog.map((row) => row.value), ...catalog.map((row) => row.value)]);
  const audit = changed ? [...previous.audit, ...[...ids].flatMap((value) => {
    const before = previous.catalog.find((row) => row.value === value) || null;
    const after = catalog.find((row) => row.value === value) || null;
    const strip = (row) => row && (({ updatedBy, updatedAt, ...rest }) => rest)(row);
    if (same(strip(before), strip(after))) return [];
    return [{ id: `hv-flag-${Date.now()}-${value}`, entity: 'flag', entityId: value, before: strip(before), after: strip(after), by: savedBy, at, reason: cleanReason }];
  })] : previous.audit;
  const stamped = catalog.map((row) => {
    const old = previous.catalog.find((item) => item.value === row.value);
    return old && same(({ updatedBy, updatedAt, ...rest }) => rest(old), ({ updatedBy, updatedAt, ...rest }) => rest(row))
      ? row
      : { ...row, updatedBy: savedBy, updatedAt: at };
  });
  const state = { catalog: stamped, audit, savedBy, savedAt: at };
  writeState(state);
  return clone({ state, audit: getHomeVisitFlagAudit() });
};
