/* มาสเตอร์ชุดข้อมูลเคลม สปสช. และชุดวัสดุเยี่ยมบ้านระดับสำนักอนามัย */
const KEY = 'mih:homevisit:claim-settings';
const clone = (v) => JSON.parse(JSON.stringify(v));
const hasSession = () => typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
const read = (fallback) => { if (!hasSession()) return fallback; try { return JSON.parse(window.sessionStorage.getItem(KEY) || 'null') ?? fallback; } catch { return fallback; } };
const write = (v) => { if (hasSession()) window.sessionStorage.setItem(KEY, JSON.stringify(v)); };
const stamp = () => new Date().toISOString();
export const HOMEVISIT_NHSO_FIELD_SOURCES = [
  { value: 'entry.nationalId', label: 'เลขบัตรประชาชน 13 หลัก' }, { value: 'entry.group', label: 'กลุ่มผู้รับบริการ' }, { value: 'form.serviceDate', label: 'วันที่ให้บริการ' }, { value: 'form.arrivalTime', label: 'เวลาที่ถึงบ้านผู้รับบริการ' }, { value: 'adlComplete', label: 'คะแนน ADL (ดัชนีบาร์เธล)' },
];
const FIELD_SEED = HOMEVISIT_NHSO_FIELD_SOURCES.map((source, index) => ({ key: source.value.split('.').pop() || 'adl', label: source.label, source: source.value, required: true, active: true, sortOrder: index + 1, note: '' }));
const SUPPLY_SEED = [
  ['A', 'ชุด A', 'ผ้าอ้อมผู้ใหญ่ 3 ชิ้น', 28.5, true], ['B', 'ชุด B', 'แผ่นรองซับการขับถ่าย 5 ชิ้น', 30, false], ['C', 'ชุด C', 'ผ้าอ้อมผู้ใหญ่ 1 ชิ้น + แผ่นรองซับการขับถ่าย 3 ชิ้น', 27.5, true], ['D', 'ชุด D', 'ผ้าอ้อมผู้ใหญ่ 1 ชิ้น + แผ่นเสริมซึมซับ 4 ชิ้น', 28.3, true], ['E', 'ชุด E', 'ผ้าอ้อมผู้ใหญ่ 2 ชิ้น + แผ่นเสริมซึมซับ 2 ชิ้น', 28.4, true], ['other', 'อื่น ๆ', 'ระบุความต้องการเอง', null, false],
].map(([value, label, detail, priceBaht, needsDiaperSize], index) => ({ value, label, detail, priceBaht, unitLabel: 'บาท/ชุด/วัน', needsDiaperSize, isOther: value === 'other', active: true, sortOrder: index + 1 }));
const seed = () => ({ fields: FIELD_SEED, supplySets: SUPPLY_SEED, rules: { oneSetPerVisit: true }, audit: [] });
const state = () => { const current = read(seed()); return { ...seed(), ...current, fields: current.fields || FIELD_SEED, supplySets: current.supplySets || SUPPLY_SEED }; };
export const getHomeVisitClaimSettings = () => clone(state());
export const getHomeVisitNhsoFields = ({ requiredOnly = false, activeOnly = false } = {}) => getHomeVisitClaimSettings().fields.filter((f) => (!requiredOnly || f.required) && (!activeOnly || f.active));
export const getHomeVisitSupplySets = ({ activeOnly = false } = {}) => getHomeVisitClaimSettings().supplySets.filter((s) => !activeOnly || s.active).sort((a, b) => a.sortOrder - b.sortOrder);
export const resolveSupplySet = (value) => getHomeVisitClaimSettings().supplySets.find((s) => s.value === value) || null;
export const supplySetNeedsDiaperSize = (value) => !!resolveSupplySet(value)?.needsDiaperSize;
export const describeSupplyNeed = (form = {}) => { if (!form.supplyNeedSet) return ''; if (form.supplyNeedSet === 'other') return form.supplyNeedOther || 'อื่น ๆ'; const set = resolveSupplySet(form.supplyNeedSet); if (!set) return form.supplyNeedSet; return `${set.label} — ${set.detail} (${set.priceBaht == null ? '' : `${set.priceBaht} ${set.unitLabel}`})${form.diaperSize ? ` · ไซซ์ ${form.diaperSize}` : ''}`; };
export const getHomeVisitClaimAudit = () => clone(state().audit).sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
export const saveHomeVisitClaimSettings = (next, { reason, by } = {}) => { const previous = state(); const settings = { ...seed(), ...next, rules: { oneSetPerVisit: true } }; if (!settings.fields.some((f) => f.active && f.required)) throw new Error('ต้องมีฟิลด์ส่งเคลมที่จำเป็นและเปิดใช้อย่างน้อย 1 รายการ'); const sources = settings.fields.filter((f) => f.active).map((f) => f.source); if (new Set(sources).size !== sources.length || settings.supplySets.filter((s) => s.active).some((s, i, a) => a.findIndex((x) => x.value === s.value) !== i)) throw new Error('ฟิลด์หรือรหัสชุดวัสดุที่เปิดใช้ต้องไม่ซ้ำกัน'); const changed = JSON.stringify(previous) !== JSON.stringify(settings); const clean = String(reason || '').trim(); if (changed && !clean) throw new Error('กรุณาระบุเหตุผลเมื่อปรับชุดส่งเคลมหรือชุดวัสดุ'); const audit = changed ? [...previous.audit, { id: `hv-claim-${Date.now()}`, before: previous, after: settings, by: by || 'ผู้ดูแลระบบ', at: stamp(), reason: clean }] : previous.audit; const saved = { ...settings, audit }; write(saved); return clone({ state: saved, audit: getHomeVisitClaimAudit() }); };
