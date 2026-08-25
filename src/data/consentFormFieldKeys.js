/** Shared helpers for consent wizard checkbox groups (patient fields, signatures). */

export const DEFAULT_PATIENT_FIELD_KEYS = ['name', 'hn', 'doctor'];
export const DEFAULT_SIGNATURE_KEYS = ['patient', 'doctor'];

/** ผู้ลงนามที่เลือกได้ใน wizard — ใช้ร่วมกันทั้งหน้าสร้าง, preview และฟอร์มจริง
    เพื่อให้จำนวนช่องเซ็นตรงกันทั้งสามที่ (มติผู้ใช้ 25 ส.ค. 69) */
export const CONSENT_SIGNATURE_FIELDS = [
  { key: 'patient', label: 'ผู้ป่วย / ผู้ปกครอง' },
  { key: 'doctor',  label: 'แพทย์ผู้รักษา' },
  { key: 'witness', label: 'พยาน' },
  { key: 'nurse',   label: 'พยาบาล' },
];

const SIGNATURE_LABEL = Object.fromEntries(
  CONSENT_SIGNATURE_FIELDS.map((f) => [f.key, f.label]),
);

export const consentSignatureLabel = (key) => SIGNATURE_LABEL[key] || key;

/** keys ที่เลือกไว้ → [{ key, label }] เรียงตามลำดับใน CONSENT_SIGNATURE_FIELDS */
export const consentSignatureRoles = (value) => {
  const set = new Set(normalizeFieldKeys(value, DEFAULT_SIGNATURE_KEYS));
  return CONSENT_SIGNATURE_FIELDS.filter((f) => set.has(f.key));
};

/** Normalize Set / array / corrupted JSON (e.g. `{}` from old Set saves) → string[]. */
export const normalizeFieldKeys = (value, fallback = []) => {
  if (value instanceof Set) return [...value].filter(Boolean);
  if (Array.isArray(value)) return value.filter((k) => typeof k === 'string' && k);
  if (value && typeof value === 'object') {
    const vals = Object.values(value).filter((k) => typeof k === 'string' && k);
    if (vals.length) return vals;
  }
  return [...fallback];
};

export const fieldKeySet = (value, fallback = []) => new Set(normalizeFieldKeys(value, fallback));

export const fieldSetHas = (value, key, fallback = []) => fieldKeySet(value, fallback).has(key);

export const sortedFieldKeys = (value, fallback = []) => [...fieldKeySet(value, fallback)].sort();

export const setFieldKey = (prev, key, checked, fallback = []) => {
  const list = normalizeFieldKeys(prev, fallback);
  const has = list.includes(key);
  if (checked && !has) return [...list, key];
  if (!checked && has) return list.filter((k) => k !== key);
  return list;
};

export const toggleFieldKey = (prev, key, fallback = []) => {
  const list = normalizeFieldKeys(prev, fallback);
  return list.includes(key)
    ? list.filter((k) => k !== key)
    : [...list, key];
};

export const makeFieldKeySetter = (setter, fallback = []) => (key, checked) => {
  setter((prev) => setFieldKey(prev, key, Boolean(checked), fallback));
};

export const makeFieldKeyToggler = (setter, fallback = []) => (key) => {
  setter((prev) => toggleFieldKey(prev, key, fallback));
};
