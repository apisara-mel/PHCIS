import { appendAuditEvent } from '@/pages/audit/auditData';

const STORAGE_KEY = 'mih:worklist-name-revealed';

/** ชื่อเต็มแสดงได้ 30 นาทีหลังยืนยันตัวตน แล้วกลับมา masking */
export const WORKLIST_NAME_REVEAL_TTL_MS = 30 * 60 * 1000;

const readStore = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    /* legacy: string[] — ไม่มี expiry → ล้างแล้วให้ยืนยันใหม่ */
    if (Array.isArray(parsed)) {
      sessionStorage.removeItem(STORAGE_KEY);
      return {};
    }
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeStore = (store) => {
  try {
    if (!store || Object.keys(store).length === 0) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* sessionStorage unavailable */
  }
};

/** ลบรายการที่หมดอายุ · คืน store ที่ prune แล้ว */
const pruneExpired = (store, now = Date.now()) => {
  const next = { ...store };
  let changed = false;
  Object.keys(next).forEach((key) => {
    const exp = next[key];
    if (typeof exp !== 'number' || exp <= now) {
      delete next[key];
      changed = true;
    }
  });
  if (changed) writeStore(next);
  return next;
};

export function getWorklistNameRevealExpiresAt(recordKey) {
  if (!recordKey) return null;
  const store = pruneExpired(readStore());
  const exp = store[String(recordKey)];
  return typeof exp === 'number' && exp > Date.now() ? exp : null;
}

export function isWorklistNameRevealed(recordKey) {
  return getWorklistNameRevealExpiresAt(recordKey) != null;
}

export function markWorklistNameRevealed(recordKey) {
  if (!recordKey) return;
  const key = String(recordKey);
  const store = pruneExpired(readStore());
  store[key] = Date.now() + WORKLIST_NAME_REVEAL_TTL_MS;
  writeStore(store);
}

export function logWorklistNameReveal(recordKey, fieldLabel = 'ชื่อ-นามสกุล ของผู้รับบริการ') {
  appendAuditEvent({
    user: 'ผู้ใช้งานระบบ',
    action: `เปิดดู${fieldLabel}${recordKey ? ` · ${recordKey}` : ''}`,
    mod: 'Worklist',
  });
}
