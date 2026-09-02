/* ระบบจัดการระบบ · การตั้งค่าโควตาเยี่ยมบ้าน
   ═══════════════════════════════════════════════════════════════════════
   มาสเตอร์ระดับสำนักอนามัยจากมติ คทง.4 ครั้งที่ 6 ต่อ TOR §1.18.1:
   ผู้ดูแลระบบกำหนดเพดานการเยี่ยมตาม 6 กลุ่มผู้รับบริการ ส่วนหน้าปฏิบัติการ
   อ่านค่าเดียวกันเพื่อเตือน/ล็อกเมื่อใช้สิทธิครบ ห้ามเก็บค่าเพดานซ้ำในคิว
   หรือแบบบันทึกเยี่ยมบ้าน.

   Prototype นี้ใช้ sessionStorage เช่น OPD room config เพื่อให้ refresh แล้ว
   ค่ายังอยู่ตลอด session โดยไม่มี backend. */

const STORAGE_KEY = 'mih:homevisit:quota-settings';

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const clone = (value) => JSON.parse(JSON.stringify(value));

const stampNow = () => new Date().toISOString();

export const NHSO_QUOTA_FALLBACK = 6;

/* ค่า seed เดิมจาก NHSO_VISIT_QUOTA และ GROUP_FOLLOWUP_DAYS — เก็บไว้ที่นี่
   ที่เดียว เพื่อให้ทั้งหน้า admin และ workflow การเยี่ยมบ้านใช้แหล่งจริงเดียวกัน. */
export const HOMEVISIT_QUOTA_SEED = [
  { group: 'curable', quota: 4, followUpDays: 180, note: 'เยี่ยมติดตามจนสิ้นสุดการรักษา' },
  { group: 'chronic', quota: 6, followUpDays: 180, note: 'ผู้ป่วยเรื้อรังที่บ้าน' },
  { group: 'mildDisability', quota: 8, followUpDays: 365, note: 'พิการระยะยาวที่ช่วยเหลือตัวเองได้บ้าง' },
  { group: 'severeDisability', quota: 12, followUpDays: 180, note: 'พิการระยะยาวที่ช่วยเหลือตัวเองไม่ได้' },
  { group: 'terminal', quota: 24, followUpDays: 30, note: 'ผู้ป่วยระยะสุดท้าย (ประคับประคอง)' },
  { group: 'special', quota: 6, followUpDays: 365, note: 'กลุ่มพิเศษตามที่สำนักอนามัยกำหนด' },
];

/* ประวัติจำลองสำหรับ prototype — ทำให้ผู้ดูแลเห็นรูปแบบ audit ตั้งแต่เปิดใช้
   ครั้งแรก โดยการบันทึกจริงจะต่อท้ายรายการชุดนี้จาก saveHomeVisitQuotaSettings. */
export const HOMEVISIT_QUOTA_AUDIT_SEED = [
  {
    id: 'hv-quota-seed-chronic', group: 'chronic',
    before: { quota: 8, followUpDays: 365 }, after: { quota: 6, followUpDays: 180 },
    reason: 'ปรับตามแนวทางติดตามผู้ป่วยโรคเรื้อรังของสำนักอนามัย',
    by: 'นางสาวกมลวรรณ ศรีสุข', at: '2026-08-18T03:30:00.000Z',
  },
  {
    id: 'hv-quota-seed-terminal', group: 'terminal',
    before: { quota: 18, followUpDays: 30 }, after: { quota: 24, followUpDays: 30 },
    reason: 'เพิ่มเพดานดูแลแบบประคับประคองตามมติคณะทำงาน',
    by: 'พญ.วิภา รักษ์ดี', at: '2026-08-11T02:15:00.000Z',
  },
  {
    id: 'hv-quota-seed-mild-disability', group: 'mildDisability',
    before: { quota: 6, followUpDays: 365 }, after: { quota: 8, followUpDays: 365 },
    reason: 'ปรับเพดานตามสิทธิ สปสช. ประจำปีงบประมาณ',
    by: 'นายวรพล รัศมีพร', at: '2026-08-04T04:00:00.000Z',
  },
  /* สองรายการนี้คือการกดบันทึก master พร้อมกันหนึ่งรอบ — เวลา/ผู้ทำ/เหตุผล
     ตรงกัน เพื่อให้ตาราง audit แสดงพฤติกรรมจริงเมื่อมีการแก้หลายกลุ่มในครั้งเดียว. */
  {
    id: 'hv-quota-seed-batch-curable', group: 'curable',
    before: { quota: 3, followUpDays: 365 }, after: { quota: 4, followUpDays: 180 },
    reason: 'ปรับตามประกาศสิทธิ สปสช. ประจำปีงบประมาณ 2569',
    by: 'นายวรพล รัศมีพร', at: '2026-08-25T03:45:00.000Z',
  },
  {
    id: 'hv-quota-seed-batch-special', group: 'special',
    before: { quota: 4, followUpDays: 365 }, after: { quota: 6, followUpDays: 365 },
    reason: 'ปรับตามประกาศสิทธิ สปสช. ประจำปีงบประมาณ 2569',
    by: 'นายวรพล รัศมีพร', at: '2026-08-25T03:45:00.000Z',
  },
];

/* Export ชื่อเดิมแบบ read-only เพื่อไม่ให้ consumer เก่าต้องสร้างตารางอีกชุด.
   ผู้เรียกใหม่ต้องใช้ getNhsoVisitQuota() ซึ่งอ่านค่าปัจจุบันจาก store. */
export const NHSO_VISIT_QUOTA = Object.fromEntries(
  HOMEVISIT_QUOTA_SEED.map((row) => [row.group, { visits: row.quota, note: row.note }]),
);

const defaultSettings = () => ({
  rows: HOMEVISIT_QUOTA_SEED.map((row) => ({ ...row })),
  savedBy: null,
  savedAt: null,
});

const normalizePositiveInteger = (value, fallback) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
};

const normalizeSettings = (source = {}) => {
  const sourceRows = Array.isArray(source.rows) ? source.rows : [];
  return {
    rows: HOMEVISIT_QUOTA_SEED.map((seed) => {
      const row = sourceRows.find((item) => item?.group === seed.group) || {};
      return {
        group: seed.group,
        quota: normalizePositiveInteger(row.quota, seed.quota),
        followUpDays: normalizePositiveInteger(row.followUpDays, seed.followUpDays),
        note: typeof row.note === 'string' && row.note.trim() ? row.note.trim() : seed.note,
      };
    }),
    savedBy: source.savedBy || null,
    savedAt: source.savedAt || null,
  };
};

const defaultState = () => ({
  settings: defaultSettings(),
  audit: HOMEVISIT_QUOTA_AUDIT_SEED.map((row) => ({ ...row, before: { ...row.before }, after: { ...row.after } })),
});

/* บัญชี prototype อาจเปิดหน้าก่อนเพิ่ม mock รุ่นใหม่ จึงรวม seed ที่ยังไม่อยู่
   ด้วย id เสมอ; ประวัติที่ผู้ใช้บันทึกจริงจะไม่ถูกเขียนทับ. */
const mergeAuditSeed = (audit) => {
  const current = Array.isArray(audit) ? audit : [];
  const missing = HOMEVISIT_QUOTA_AUDIT_SEED
    .filter((seed) => !current.some((row) => row?.id === seed.id))
    .map((row) => ({ ...row, before: { ...row.before }, after: { ...row.after } }));
  return [...current, ...missing];
};

const readState = () => {
  if (!canUseSessionStorage()) return defaultState();
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (parsed && typeof parsed === 'object') {
      return {
        settings: normalizeSettings(parsed.settings),
        /* ก่อนเพิ่ม mock audit store ที่ถูกเปิดไปแล้วเก็บ [] ไว้; เติม seed ให้
           หน้าประวัติมีตัวอย่างทันที แต่ถ้ามี audit จริงแล้วต้องเคารพของเดิม. */
        audit: mergeAuditSeed(parsed.audit),
      };
    }
  } catch { /* fall back to the approved seed */ }
  const seeded = defaultState();
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
};

const writeState = (state) => {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const getHomeVisitQuotaSettings = () => clone(readState().settings);

export const getNhsoVisitQuota = (group) => {
  const row = getHomeVisitQuotaSettings().rows.find((item) => item.group === group);
  return row?.quota ?? NHSO_QUOTA_FALLBACK;
};

export const getGroupFollowUpDays = (group) => {
  const row = getHomeVisitQuotaSettings().rows.find((item) => item.group === group);
  return row?.followUpDays ?? 365;
};

export const getHomeVisitQuotaAudit = () => clone(readState().audit)
  .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));

const hasRowChanged = (before, after) =>
  before.quota !== after.quota || before.followUpDays !== after.followUpDays;

/** บันทึก master ทั้งชุดและเพิ่ม audit เฉพาะกลุ่มที่ค่าเปลี่ยน. */
export const saveHomeVisitQuotaSettings = (next, { reason, by } = {}) => {
  const state = readState();
  const previous = normalizeSettings(state.settings);
  const settings = normalizeSettings(next);
  const changed = settings.rows.filter((row) => {
    const before = previous.rows.find((item) => item.group === row.group);
    return before && hasRowChanged(before, row);
  });
  const cleanReason = String(reason || '').trim();

  if (changed.length && !cleanReason) {
    throw new Error('กรุณาระบุเหตุผลเมื่อปรับเพดานหรือรอบติดตาม');
  }

  const at = stampNow();
  const savedBy = String(by || 'ผู้ดูแลระบบ').trim() || 'ผู้ดูแลระบบ';
  const saved = { ...settings, savedBy, savedAt: at };
  const audit = [
    ...state.audit,
    ...changed.map((after) => {
      const before = previous.rows.find((item) => item.group === after.group);
      return {
        id: `hv-quota-${Date.now()}-${after.group}`,
        group: after.group,
        before: { quota: before.quota, followUpDays: before.followUpDays },
        after: { quota: after.quota, followUpDays: after.followUpDays },
        reason: cleanReason,
        by: savedBy,
        at,
      };
    }),
  ];

  writeState({ settings: saved, audit });
  return clone({ settings: saved, audit: getHomeVisitQuotaAudit() });
};
