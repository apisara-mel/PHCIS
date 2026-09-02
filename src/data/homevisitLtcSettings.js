/* เกณฑ์ LTC กลุ่ม 1–4 ระดับสำนักอนามัย ตามมติ คทง.4 ต่อ TOR §1.18.1 */
const BARTHEL_MAX_SCORE = 20;

const STORAGE_KEY = 'mih:homevisit:ltc-settings';
const clone = (v) => JSON.parse(JSON.stringify(v));
const hasSession = () => typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
const now = () => new Date().toISOString();

export const HOMEVISIT_LTC_SEED = {
  gate: { barthelMin: 0, barthelMax: 11, requireCareManager: true, requireCareGiver: true },
  groups: [
    { group: 1, adlMin: 0, adlMax: 4, visitsPerMonth: 2, extraRule: '' },
    { group: 2, adlMin: 5, adlMax: 8, visitsPerMonth: 1, extraRule: '' },
    { group: 3, adlMin: 9, adlMax: 11, visitsPerMonth: 1, extraRule: '' },
    { group: 4, adlMin: null, adlMax: null, visitsPerMonth: 1, extraRule: 'เกณฑ์เพิ่มตามสำนักอนามัย เช่น TAI / ภาวะสมองเสื่อม (มติไม่ได้ระบุช่วงคะแนน)' },
  ],
};

const normalize = (source = {}) => ({
  gate: {
    barthelMin: Number.isInteger(Number(source.gate?.barthelMin)) ? Number(source.gate.barthelMin) : 0,
    barthelMax: Number.isInteger(Number(source.gate?.barthelMax)) ? Number(source.gate.barthelMax) : 11,
    requireCareManager: source.gate?.requireCareManager !== false,
    requireCareGiver: source.gate?.requireCareGiver !== false,
  },
  groups: [1, 2, 3, 4].map((group) => {
    const row = source.groups?.find((item) => Number(item.group) === group) || HOMEVISIT_LTC_SEED.groups[group - 1];
    return { group, adlMin: row.adlMin == null ? null : Number(row.adlMin), adlMax: row.adlMax == null ? null : Number(row.adlMax), visitsPerMonth: Number(row.visitsPerMonth), extraRule: String(row.extraRule || '').replace('ตัวอย่างตามมติ คทง.4: ', '') };
  }),
});

const seedState = () => ({ settings: normalize(HOMEVISIT_LTC_SEED), audit: [], savedBy: null, savedAt: null });
const readState = () => {
  if (!hasSession()) return seedState();
  try { const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null'); if (parsed?.settings) return { ...seedState(), ...parsed, settings: normalize(parsed.settings), audit: Array.isArray(parsed.audit) ? parsed.audit : [] }; } catch { /* seed */ }
  const seeded = seedState(); window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(seeded)); return seeded;
};
const writeState = (state) => { if (hasSession()) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export const getHomeVisitLtcSettings = () => clone(readState().settings);
export const getHomeVisitLtcAudit = () => clone(readState().audit).sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));

const validate = (settings) => {
  const { gate, groups } = settings;
  if (gate.barthelMin < 0 || gate.barthelMax > BARTHEL_MAX_SCORE || gate.barthelMax < gate.barthelMin) throw new Error('ช่วง ADL ของประตู LTC ต้องอยู่ระหว่าง 0–20 และเรียงลำดับถูกต้อง');
  const numbered = groups.filter((row) => row.group < 4);
  numbered.forEach((row) => { if (!Number.isInteger(row.adlMin) || !Number.isInteger(row.adlMax) || row.adlMin < 0 || row.adlMax > BARTHEL_MAX_SCORE || row.adlMin > row.adlMax) throw new Error('ช่วง ADL กลุ่ม 1–3 ต้องเป็นจำนวนเต็มระหว่าง 0–20'); if (!Number.isInteger(row.visitsPerMonth) || row.visitsPerMonth < 1) throw new Error('ความถี่เยี่ยมต้องเป็นจำนวนเต็มบวก'); });
  for (let i = 0; i < numbered.length; i += 1) for (let j = i + 1; j < numbered.length; j += 1) if (numbered[i].adlMin <= numbered[j].adlMax && numbered[j].adlMin <= numbered[i].adlMax) throw new Error('ช่วง ADL กลุ่ม 1–3 ต้องไม่ซ้อนกัน');
  const ordered = numbered.slice().sort((a, b) => a.adlMin - b.adlMin);
  if (ordered[0]?.adlMin !== gate.barthelMin || ordered[ordered.length - 1]?.adlMax !== gate.barthelMax || ordered.some((row, index) => index > 0 && row.adlMin !== ordered[index - 1].adlMax + 1)) throw new Error('กลุ่ม 1–3 ต้องครอบคลุมช่วงประตู LTC ทั้งหมดโดยไม่มีช่องว่าง');
  const group4 = groups.find((row) => row.group === 4);
  if (!Number.isInteger(group4.visitsPerMonth) || group4.visitsPerMonth < 1) throw new Error('ความถี่เยี่ยมกลุ่ม 4 ต้องเป็นจำนวนเต็มบวก');
};

export const saveHomeVisitLtcSettings = (next, { reason, by } = {}) => {
  const previous = readState(); const settings = normalize(next); validate(settings);
  const cleanReason = String(reason || '').trim(); const changed = !same(previous.settings, settings);
  if (changed && !cleanReason) throw new Error('กรุณาระบุเหตุผลเมื่อปรับเกณฑ์ LTC');
  const at = now(); const savedBy = String(by || 'ผู้ดูแลระบบ').trim() || 'ผู้ดูแลระบบ';
  const audit = changed ? [...previous.audit, { id: `hv-ltc-${Date.now()}`, before: previous.settings, after: settings, by: savedBy, at, reason: cleanReason }] : previous.audit;
  const state = { settings, audit, savedBy, savedAt: at }; writeState(state); return clone({ state, audit: getHomeVisitLtcAudit() });
};

export const isLtcEligible = ({ barthel, hasCareManager, hasCareGiver } = {}) => {
  const { gate } = readState().settings; const score = Number(barthel);
  return Number.isFinite(score) && score >= gate.barthelMin && score <= gate.barthelMax && (!gate.requireCareManager || !!hasCareManager) && (!gate.requireCareGiver || !!hasCareGiver);
};

export const resolveLtcGroup = ({ barthel, hasCareManager, hasCareGiver, extraFlags } = {}) => {
  const settings = readState().settings; if (!isLtcEligible({ barthel, hasCareManager, hasCareGiver })) return { group: null, visitsPerMonth: null, eligible: false };
  const row = settings.groups.find((item) => item.group < 4 && Number(barthel) >= item.adlMin && Number(barthel) <= item.adlMax) || (extraFlags?.length ? settings.groups.find((item) => item.group === 4) : null);
  const fallback = row || settings.groups.find((item) => item.group === 4);
  return { group: fallback.group, visitsPerMonth: fallback.visitsPerMonth, eligible: true };
};

export const getLtcVisitsPerMonth = (group) => readState().settings.groups.find((item) => Number(item.group) === Number(group))?.visitsPerMonth || null;
