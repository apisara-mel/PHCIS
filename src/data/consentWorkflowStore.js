/* PHCIS | Consent — persisted mock store (localStorage) + pub/sub.
   Connects consent worklist, form fill, OPD, CPOE, Telemed, and mobile flows. */

import { CONSENT_RECORDS as SEED_RECORDS, AUTO_MR_REQUEST_CHANNEL, AUTO_SYSTEM_REQUESTER } from '@/data/consentRecords';
import { DEFAULT_SERVICE_CENTER_CHANNEL, MOBILE_APP_CHANNEL } from '@/data/consentChannels';
import { resolveConsentPatient } from '@/data/consentPatientDisplay';
import { resolveConsentFormForWorklistType } from '@/data/consentFormRecords';
import { bumpConsentFormVersionMinor } from '@/data/consentFormVersion';

const STORAGE_KEY = 'mih:consent-workflow';
/* bump when CONSENT_RECORDS row count / shape changes
   13 = worklist ผูกกับพูลแบบฟอร์มจริง 15 ใบ (เดิม PH-009 ใบเดียวทุกแถว) */
const SEED_VERSION = 13;
const SIGN_TOKEN_TTL_MS = 72 * 60 * 60 * 1000;

const listeners = new Set();

const canPersist = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const defaultState = () => ({
  seedVersion: SEED_VERSION,
  records: SEED_RECORDS.map((r) => ({ ...r, history: [...(r.history || [])] })),
  supersededTypes: [],
  exportLog: [],
  signTokens: {},
  formDrafts: {},
  telemedRecording: {},
});

const readState = () => {
  if (!canPersist()) return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const seedStale = parsed.seedVersion !== SEED_VERSION;
    return {
      ...defaultState(),
      ...parsed,
      seedVersion: SEED_VERSION,
      records: !seedStale && Array.isArray(parsed.records) && parsed.records.length
        ? parsed.records
        : defaultState().records,
    };
  } catch {
    return defaultState();
  }
};

let state = readState();

const persist = () => {
  if (canPersist()) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach((fn) => fn());
};

export const subscribeConsentStore = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const resetConsentStore = () => {
  state = defaultState();
  persist();
};

/* ── Records ─────────────────────────────────────────────────────── */
export const getConsentRecords = () => state.records.map((r) => ({
  ...r,
  history: [...(r.history || [])],
}));

export const setConsentRecords = (records) => {
  state.records = records.map((r) => ({ ...r, history: [...(r.history || [])] }));
  persist();
};

export const patchConsentRecord = (id, patch) => {
  state.records = state.records.map((r) => (r.id === id ? { ...r, ...patch } : r));
  persist();
};

export const addConsentRecord = (record) => {
  state.records = [...state.records, { ...record, history: record.history || [] }];
  persist();
  return record;
};

export const nextConsentRecordId = () =>
  state.records.reduce((m, r) => Math.max(m, r.id), 0) + 1;

const todayThai = () =>
  new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

const normalizeConsentVersion = (version) => {
  if (!version) return 'V 1.0';
  const v = String(version).trim();
  if (/^V\s/i.test(v)) return v.replace(/^v\s/i, 'V ');
  return `V ${v}`;
};

const bumpConsentVersion = bumpConsentFormVersionMinor;

const formatSupersededVersionRange = (oldVersion, newVersion) => {
  const oldNorm = normalizeConsentVersion(oldVersion);
  return `${oldNorm} → ${newVersion}`;
};

const hasOpenSignatureRequest = (hn, type) =>
  state.records.some(
    (r) => r.hn === hn
      && r.type === type
      && ['รอลงนาม', 'อยู่ระหว่างลงนาม'].includes(r.status),
  );

/** เผยแพร่เทมเพลตใหม่ — ฉบับเซ็นแล้ว → ถูกแทนที่ · สร้าง รอลงนาม อัตโนมัติไปเวชระเบียน
    คืน true เมื่อมีการแก้ state จริง (ให้ผู้เรียกตัดสินใจว่าต้อง persist ไหม) */
const supersedeSignedRecordsForType = (type, { newVersion } = {}) => {
  const now = todayThai();
  const toCreate = [];
  let created = 0;

  state.records = state.records.map((r) => {
    if (r.status !== 'ยินยอมแล้ว' || r.type !== type) return r;
    const nextVer = newVersion || bumpConsentVersion(r.version);
    toCreate.push({ ...r, nextVer });
    return {
      ...r,
      status: 'ถูกแทนที่ด้วยเวอร์ชันใหม่',
      version: formatSupersededVersionRange(r.version, nextVer),
      supersededAt: now,
      history: [
        ...(r.history || []),
        {
          date: now,
          dateTime: `${now} · ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
          action: 'ถูกแทนที่ด้วยเวอร์ชันใหม่',
          fromStatus: 'ยินยอมแล้ว',
          toStatus: 'ถูกแทนที่ด้วยเวอร์ชันใหม่',
          formCode: r.formCode,
          formName: r.formName,
          type: r.type,
          version: nextVer,
          status: 'ถูกแทนที่ด้วยเวอร์ชันใหม่',
          channel: AUTO_MR_REQUEST_CHANNEL,
        },
      ],
    };
  });

  toCreate.forEach((src) => {
    if (hasOpenSignatureRequest(src.hn, src.type)) return;
    const formMeta = resolveConsentFormForWorklistType(src.type);
    const newId = nextConsentRecordId();
    const newRec = {
      id: newId,
      hn: src.hn,
      name: src.name,
      type: src.type,
      formCode: src.formCode || formMeta.formCode,
      formName: src.formName || formMeta.formName,
      version: src.nextVer,
      status: 'รอลงนาม',
      signChannel: '-',
      requestChannel: AUTO_MR_REQUEST_CHANNEL,
      requester: AUTO_SYSTEM_REQUESTER,
      autoSent: true,
      supersededFromId: src.id,
      createdDate: now,
      signedDate: '-',
      withdrawnDate: '-',
      guardian: src.guardian,
      history: [
        {
          date: now,
          dateTime: `${now} · ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
          action: 'ส่งอัตโนมัติ',
          fromStatus: 'ถูกแทนที่ด้วยเวอร์ชันใหม่',
          toStatus: 'รอลงนาม',
          formCode: src.formCode || formMeta.formCode,
          formName: src.formName || formMeta.formName,
          type: src.type,
          version: src.nextVer,
          status: 'รอลงนาม',
          channel: AUTO_MR_REQUEST_CHANNEL,
        },
      ],
    };
    state.records.push(newRec);
    state.records = state.records.map((r) => (
      r.id === src.id ? { ...r, supersededById: newId } : r
    ));
    created += 1;
  });

  return toCreate.length > 0 || created > 0;
};

/* persist() แจ้ง listener ทุกตัว และ ConsentManagementPage subscribe ด้วย
   `setRows(loadRows())` ซึ่ง loadRows เรียกฟังก์ชันนี้อีกรอบ — ถ้า persist
   ทุกครั้งแบบไม่มีเงื่อนไข จะกลายเป็น persist → listener → persist วนไม่จบ
   (RangeError: Maximum call stack size exceeded ทั้งหน้า) จึง persist เฉพาะ
   ตอนที่ state เปลี่ยนจริง ซึ่งเกิดแค่ครั้งแรกที่เทมเพลตถูกเผยแพร่เวอร์ชันใหม่ */
export const applySupersededTypesToRecords = (supersededSet) => {
  let changed = false;
  supersededSet.forEach((type) => {
    if (!state.supersededTypes.includes(type)) {
      state.supersededTypes.push(type);
      changed = true;
    }
    if (supersedeSignedRecordsForType(type)) changed = true;
  });
  if (changed) persist();
  return getConsentRecords();
};

/* ── Template version bump (ด.1.1.5) ─────────────────────────────── */
/** Dry-run preview — no mutation. Used on Step 4 before publish. */
export const previewConsentSupersedeImpact = (type, { newVersion } = {}) => {
  if (!type) {
    return {
      signedCount: 0,
      patientCount: 0,
      reconsentCount: 0,
      skippedOpenRequestCount: 0,
      newVersion: newVersion || '—',
    };
  }

  const signed = state.records.filter((r) => r.status === 'ยินยอมแล้ว' && r.type === type);
  const patientSet = new Set(signed.map((r) => r.hn));
  let reconsentCount = 0;
  let skippedOpenRequestCount = 0;

  signed.forEach((r) => {
    if (hasOpenSignatureRequest(r.hn, r.type)) skippedOpenRequestCount += 1;
    else reconsentCount += 1;
  });

  return {
    signedCount: signed.length,
    patientCount: patientSet.size,
    reconsentCount,
    skippedOpenRequestCount,
    newVersion: newVersion || (signed[0] ? bumpConsentVersion(signed[0].version) : '—'),
  };
};

export const markTypeSuperseded = (type, { newVersion } = {}) => {
  if (!type) return;
  if (!state.supersededTypes.includes(type)) state.supersededTypes.push(type);
  /* migrate legacy rows still on old status */
  state.records = state.records.map((r) => (
    r.status === 'มีเวอร์ชันใหม่' && r.type === type
      ? { ...r, status: 'ถูกแทนที่ด้วยเวอร์ชันใหม่' }
      : r
  ));
  supersedeSignedRecordsForType(type, { newVersion });
  persist();
};

export const isTypeSuperseded = (type) => state.supersededTypes.includes(type);
export const listSupersededTypes = () => [...state.supersededTypes];

/* ── Export log (ด.1.1.16) ───────────────────────────────────────── */
export const logExport = ({ source, format, by = 'ลดา ดีงาม' }) => {
  state.exportLog.push({
    source,
    format: format || '-',
    by,
    at: new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' }),
  });
  persist();
};

export const listExportLog = () => [...state.exportLog];

/* ── Form-fill drafts (offline) ────────────────────────────────────── */
const draftKey = (slug, role, requestId) => `fill:${slug}:${role}:${requestId || 'anon'}`;

export const saveFormDraft = (slug, role, requestId, values) => {
  const key = draftKey(slug, role, requestId);
  state.formDrafts[key] = { values, savedAt: Date.now() };
  persist();
};

export const loadFormDraft = (slug, role, requestId) => {
  const entry = state.formDrafts[draftKey(slug, role, requestId)];
  return entry ? { ...entry } : null;
};

export const clearFormDraft = (slug, role, requestId) => {
  delete state.formDrafts[draftKey(slug, role, requestId)];
  persist();
};

/* ── Sign tokens (QR / Mobile link) ──────────────────────────────── */
export const createSignToken = (recordId, ttlMs = SIGN_TOKEN_TTL_MS) => {
  const token = `cs-${recordId}-${Date.now().toString(36)}`;
  state.signTokens[token] = {
    recordId,
    expiresAt: Date.now() + ttlMs,
    cancelled: false,
  };
  persist();
  return token;
};

export const getSignTokenMeta = (token) => state.signTokens[token] || null;

export const validateSignToken = (token) => {
  const meta = getSignTokenMeta(token);
  if (!meta) return { ok: false, reason: 'invalid' };
  if (meta.cancelled) return { ok: false, reason: 'cancelled' };
  if (Date.now() > meta.expiresAt) return { ok: false, reason: 'expired' };
  const record = state.records.find((r) => r.id === meta.recordId);
  if (!record) return { ok: false, reason: 'missing' };
  if (record.status === 'ยกเลิกคำขอ') return { ok: false, reason: 'cancelled' };
  return { ok: true, recordId: meta.recordId, record };
};

export const cancelConsentRequest = (recordId) => {
  patchConsentRecord(recordId, { status: 'ยกเลิกคำขอ' });
  Object.keys(state.signTokens).forEach((tok) => {
    if (state.signTokens[tok].recordId === recordId) state.signTokens[tok].cancelled = true;
  });
  persist();
};

/* ── Medical-record (เวชระเบียน) consent → worklist sync ─────────── */
const MR_FORM_ID_TO_TYPE = {
  'PD-1011': 'PDPA',
  'TX-1011': 'การรักษา',
  'CL-1011': 'เบิกจ่าย',
};

const MR_SLUG_TO_TYPE = {
  'consent-treatment': 'การรักษา',
  'consent-surgery': 'ผ่าตัด',
  'consent-blood': 'เลือด',
};

export const consentTypeFromMrForm = ({ id, slug, categoryLabel } = {}) => {
  if (id && MR_FORM_ID_TO_TYPE[id]) return MR_FORM_ID_TO_TYPE[id];
  if (slug && MR_SLUG_TO_TYPE[slug]) return MR_SLUG_TO_TYPE[slug];
  if (categoryLabel) return categoryLabel;
  return 'การรักษา';
};

/** Record consent signed/declined on เวชระเบียน into the central worklist. */
export const recordMrConsentSigning = ({
  hn,
  name,
  formId,
  formCode,
  formTitle,
  type,
  version,
  channel = DEFAULT_SERVICE_CENTER_CHANNEL,
  outcome = 'signed',
  requester = 'เวชระเบียน',
} = {}) => {
  const hnTrim = String(hn || '').trim();
  if (!hnTrim) return null;
  const resolved = resolveConsentPatient(hnTrim, name);
  const nameTrim = String(resolved.name || name || '').trim();
  if (!nameTrim) return null;

  const consentType = type || consentTypeFromMrForm({ id: formId, slug: formCode });
  const normVersion = normalizeConsentVersion(version);
  const now = todayThai();
  const status = outcome === 'declined' ? 'ปฏิเสธ' : 'ยินยอมแล้ว';
  const code = formId || formCode || consentType;
  const formMeta = (formTitle && formCode)
    ? { formCode, formName: formTitle }
    : resolveConsentFormForWorklistType(consentType);

  const historyEntry = {
    date: now,
    formCode: code,
    formName: formTitle || consentType,
    type: consentType,
    version: normVersion,
    status,
    channel,
  };

  const pending = state.records.find(
    (r) => r.hn === hnTrim
      && r.type === consentType
      && ['รอลงนาม', 'อยู่ระหว่างลงนาม'].includes(r.status),
  );
  if (pending) {
    patchConsentRecord(pending.id, {
      status,
      signChannel: channel,
      signedDate: now,
      version: normVersion,
      history: [...(pending.history || []), historyEntry],
    });
    return getConsentRecords().find((r) => r.id === pending.id);
  }

  const existing = state.records.find(
    (r) => r.hn === hnTrim
      && r.type === consentType
      && ['ยินยอมแล้ว', 'ปฏิเสธ'].includes(r.status),
  );
  if (existing) {
    patchConsentRecord(existing.id, {
      status,
      signChannel: channel,
      signedDate: now,
      version: normVersion,
      history: [...(existing.history || []), historyEntry],
    });
    return getConsentRecords().find((r) => r.id === existing.id);
  }

  const record = {
    id: nextConsentRecordId(),
    hn: hnTrim,
    name: nameTrim,
    type: consentType,
    formCode: formMeta.formCode,
    formName: formMeta.formName,
    version: normVersion,
    status,
    signChannel: channel,
    requester,
    createdDate: now,
    signedDate: now,
    withdrawnDate: '-',
    history: [historyEntry],
  };
  addConsentRecord(record);
  return record;
};

export const completeConsentSigning = (recordId, { outcome = 'signed', channel = MOBILE_APP_CHANNEL } = {}) => {
  const record = state.records.find((r) => r.id === recordId);
  if (!record) return null;
  const now = todayThai();
  const patch = outcome === 'declined'
    ? { status: 'ปฏิเสธ', signChannel: channel, signedDate: now }
    : { status: 'ยินยอมแล้ว', signChannel: channel, signedDate: now };
  const historyEntry = {
    date: now,
    formCode: record.type,
    formName: record.type,
    type: record.type,
    version: record.version,
    status: patch.status,
    channel,
  };
  patchConsentRecord(recordId, {
    ...patch,
    history: [...(record.history || []), historyEntry],
  });
  return getConsentRecords().find((r) => r.id === recordId);
};

/* ── Integration queries ───────────────────────────────────────────── */
export const getConsentForPatient = (hn, type) => {
  const matches = getConsentRecords().filter((r) => r.hn === hn && (!type || r.type === type));
  return matches.sort((a, b) => b.id - a.id)[0] || null;
};

export const hasActiveConsent = (hn, type) => {
  const rec = getConsentForPatient(hn, type);
  return rec?.status === 'ยินยอมแล้ว';
};

export const getOpdConsentSummary = (hn) => {
  const recs = getConsentRecords().filter((r) => r.hn === hn);
  const signed = recs.filter((r) => r.status === 'ยินยอมแล้ว').length;
  const pending = recs.filter((r) => ['รอลงนาม', 'อยู่ระหว่างลงนาม'].includes(r.status)).length;
  const blocked = recs.some((r) => ['ถอนความยินยอม', 'ปฏิเสธ'].includes(r.status));
  return { signed, pending, blocked, total: recs.length };
};

export const gateCpoeOrder = (hn, { orderKind = 'medication' } = {}) => {
  if (orderKind === 'research') {
    const ok = hasActiveConsent(hn, 'การวิจัย');
    return ok
      ? { allowed: true }
      : { allowed: false, reason: 'ต้องมีความยินยอม "การวิจัย" ที่สถานะยินยอมแล้วก่อนสั่งการรักษา', consentType: 'การวิจัย' };
  }
  if (orderKind === 'surgery') {
    const ok = hasActiveConsent(hn, 'ผ่าตัด');
    return ok
      ? { allowed: true }
      : { allowed: false, reason: 'ต้องมีความยินยอม "ผ่าตัด" ที่สถานะยินยอมแล้วก่อนสั่งหัตถการ', consentType: 'ผ่าตัด' };
  }
  const pdpa = hasActiveConsent(hn, 'PDPA') || hasActiveConsent(hn, 'การรักษา');
  return pdpa
    ? { allowed: true }
    : { allowed: false, reason: 'ต้องมีความยินยอม PDPA/การรักษาก่อนส่งใบสั่งยา', consentType: 'PDPA' };
};

export const gateMobileEdocument = (requestType) => {
  const DEMO_HN = '67-00008';
  if (requestType === 'medrecord') {
    const ok = hasActiveConsent(DEMO_HN, 'PDPA');
    return ok
      ? { allowed: true }
      : { allowed: false, reason: 'ต้องให้ความยินยอม PDPA (ข้อ 5.1) ก่อนขอประวัติการรักษา e-Document' };
  }
  if (requestType === 'cert') {
    return { allowed: true };
  }
  return { allowed: true };
};

/* ── Telemed recording consent (TOR 1.13.8) ────────────────────────── */
export const linkTelemedRecordingConsent = (hn, { consented, channel = 'Mobile App' } = {}) => {
  state.telemedRecording[hn] = { consented: !!consented, channel, at: Date.now() };
  const existing = getConsentForPatient(hn, 'PDPA');
  if (consented && existing && existing.status !== 'ยินยอมแล้ว') {
    completeConsentSigning(existing.id, { outcome: 'signed', channel });
  } else if (consented && !existing) {
    addConsentRecord({
      id: nextConsentRecordId(),
      hn,
      name: hn,
      type: 'PDPA',
      version: 'V 1.0',
      status: 'ยินยอมแล้ว',
      signChannel: channel,
      requester: 'Telemed',
      createdDate: todayThai(),
      signedDate: todayThai(),
      withdrawnDate: '-',
      history: [],
    });
  }
  persist();
};

export const getTelemedRecordingConsent = (hn) => state.telemedRecording[hn] || { consented: false };
