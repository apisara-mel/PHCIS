const STORAGE_KEY = 'mih:opd-screening-drafts';

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const rowKey = ({ queue, hn, name } = {}) =>
  [queue || '', hn || '', name || ''].join('|');

const readDraftKeys = () => {
  if (!canUseSessionStorage()) return [];
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const writeDraftKeys = (keys) => {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(keys)]));
};

export const saveOpdScreeningDraft = (patient = {}) => {
  const key = rowKey(patient);
  if (!key.replace(/\|/g, '')) return;
  writeDraftKeys([...readDraftKeys(), key]);
};

export const applyOpdScreeningDrafts = (rows = []) => {
  const draftKeys = new Set(readDraftKeys());
  if (draftKeys.size === 0) return rows;

  return rows.map((row) => {
    const key = rowKey(row);
    return draftKeys.has(key)
      ? { ...row, statusKey: 'draft' }
      : row;
  });
};
