/* OPD treatment draft/record persistence for the interactive prototype.
   Everything is encounter-scoped so switching HN/VN can never reuse another
   patient's in-memory form. Production can replace these functions with the
   API without changing the page-level safety contract. */

const DRAFT_PREFIX = 'mih:treatment:draft:v1';
const RECORD_PREFIX = 'mih:treatment:record:v1';

const storage = () => (typeof window === 'undefined' ? null : window.sessionStorage);

const encounterKey = (prefix, hn, visitKey) => (
  `${prefix}:${encodeURIComponent(String(hn || 'missing'))}:${encodeURIComponent(String(visitKey || 'current'))}`
);

const read = (key) => {
  try {
    return JSON.parse(storage()?.getItem(key) || 'null');
  } catch (error) {
    return null;
  }
};

const write = (key, value) => {
  try {
    storage()?.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
};

export const loadTreatmentDraft = (hn, visitKey) => (
  read(encounterKey(DRAFT_PREFIX, hn, visitKey))
);

export const saveTreatmentDraft = ({ hn, visitKey, form, stepIndex }) => {
  const savedAt = new Date().toISOString();
  const ok = write(encounterKey(DRAFT_PREFIX, hn, visitKey), {
    hn, visitKey, form, stepIndex, savedAt,
  });
  return { ok, savedAt };
};

export const clearTreatmentDraft = (hn, visitKey) => {
  try {
    storage()?.removeItem(encounterKey(DRAFT_PREFIX, hn, visitKey));
  } catch (error) {
    /* Storage can be unavailable in private mode; nothing else to clear. */
  }
};

export const saveTreatmentRecord = ({ hn, visitKey, form }) => {
  const savedAt = new Date().toISOString();
  const ok = write(encounterKey(RECORD_PREFIX, hn, visitKey), {
    hn, visitKey, form, status: 'completed', savedAt,
  });
  return { ok, savedAt };
};

export const loadTreatmentRecord = (hn, visitKey) => (
  read(encounterKey(RECORD_PREFIX, hn, visitKey))
);

/* จุด Exist Nurse รู้แค่ HN — ไม่รู้ `visitKey` ของ visit ที่แพทย์เพิ่งปิด
   (มติผู้ใช้ 31 ส.ค. 69) จึงต้องกวาดคีย์ทั้งหมดของ HN นั้นแล้วเอาใบที่บันทึก
   ล่าสุด · คีย์ถูก encode ไว้ตอนเขียน จึงเทียบด้วยรูปแบบเดียวกัน ไม่ใช่ substring
   ของ HN ดิบ (HN "67-00001" กับ "67-000010" จะชนกัน) */
export const findLatestTreatmentRecord = (hn) => {
  const store = storage();
  if (!store || !hn) return null;
  const prefix = `${RECORD_PREFIX}:${encodeURIComponent(String(hn))}:`;
  let latest = null;
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    const value = read(key);
    if (!value) continue;
    if (!latest || String(value.savedAt || '') > String(latest.savedAt || '')) latest = value;
  }
  return latest;
};
