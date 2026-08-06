/** Shared helpers for consent wizard checkbox groups (patient fields, signatures). */

export const DEFAULT_PATIENT_FIELD_KEYS = ['name', 'hn', 'doctor'];
export const DEFAULT_SIGNATURE_KEYS = ['patient', 'doctor'];

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
