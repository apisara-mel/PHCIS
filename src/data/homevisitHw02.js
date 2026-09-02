/* แบบ Long-Term Care (HW02) ต่อครั้งเยี่ยม — ข้อมูลร่าง/ฉบับสมบูรณ์เก็บใน session */
import { isBarthelComplete, scoreBarthel } from '@/data/homevisitVisits';
import { getHomeVisitLtcSettings, resolveLtcGroup } from '@/data/homevisitLtcSettings';

const STORAGE_KEY = 'mih:homevisit:hw02';
const hasSession = () => typeof window !== 'undefined' && !!window.sessionStorage;
const clone = (value) => JSON.parse(JSON.stringify(value));
const readAll = () => {
  if (!hasSession()) return {};
  try { return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { return {}; }
};
const writeAll = (value) => { if (hasSession()) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value)); };

export const isHw01Ready = (form = {}) => isBarthelComplete(form.adlAnswers);

export const getHw02Gate = ({ form, registryEntry } = {}) => {
  /* ค่า default ของพารามิเตอร์ไม่ช่วยเมื่อผู้เรียกส่ง `null` มา (ทะเบียนที่ยัง
     หาไม่เจอส่ง null) — ต้องกันเองทั้งสองตัว ไม่งั้นขั้นประเมินพังทั้งหน้า */
  const visit = form || {};
  const entry = registryEntry || {};
  const barthel = scoreBarthel(visit.adlAnswers);
  const hasCareManager = visit.hasCareManager ?? entry.hasCareManager;
  const hasCareGiver = visit.hasCareGiver ?? entry.hasCareGiver;
  const result = resolveLtcGroup({ barthel, hasCareManager, hasCareGiver });
  /* เหตุผลที่ยังไม่เปิดแบบ HW02 — อ่านช่วงคะแนนจากเกณฑ์ที่แอดมินตั้งไว้
     ไม่ฝังเลขไว้เอง เพราะประตู LTC ปรับได้ที่หน้าตั้งค่า */
  const { gate } = getHomeVisitLtcSettings();
  const missing = [];
  if (!isHw01Ready(visit)) missing.push('ADL ยังไม่ครบ');
  else if (!result.eligible) {
    if (gate.requireCareManager && !hasCareManager) missing.push('ไม่มี Care Manager');
    if (gate.requireCareGiver && !hasCareGiver) missing.push('ไม่มี Care Giver');
    if (barthel < gate.barthelMin || barthel > gate.barthelMax) {
      missing.push(`คะแนน ADL ${barthel} อยู่นอกช่วง ${gate.barthelMin}–${gate.barthelMax}`);
    }
  }
  return { ...result, barthelTotal: barthel, hasCareManager: !!hasCareManager, hasCareGiver: !!hasCareGiver, missing };
};

export const getHw02 = (hn, visitId) => clone(readAll()[`${hn || 'unknown'}:${visitId || 'unknown'}`] || null);

export const saveHw02 = (hn, visitId, next) => {
  const all = readAll();
  const key = `${hn || 'unknown'}:${visitId || 'unknown'}`;
  const current = all[key] || {};
  all[key] = { ...current, ...clone(next), hn, visitId, updatedAt: new Date().toISOString() };
  writeAll(all);
  return clone(all[key]);
};

/* ครบพอจะกด "ทำเครื่องหมายแผนเสร็จ" ได้หรือยัง — ต้องแยกจาก isHw02Complete
   ไม่งั้นปุ่มจะปลดล็อกไม่ได้เลย (ต้อง complete ก่อนถึงจะกดให้ complete ได้) */
export const isHw02Ready = (doc = {}) => !!String(doc?.careManagerName || '').trim()
  && !!(doc?.problem || doc?.goal || doc?.problemGoal)
  && !!doc?.physicalCare
  && !!doc?.homeCaregiver;

export const isHw02Complete = (doc = {}) => doc?.status === 'complete' && isHw02Ready(doc);
