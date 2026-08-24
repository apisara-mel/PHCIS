/* immunizationVaccines.js — ทะเบียนรายการวัคซีน + โปรแกรม EPI (TOR §1.11.1.1)
   และ mock lot / stock ที่ใช้ผูกกับการให้วัคซีน (§1.11.2.1 "เชื่อมโยงระบบคลัง").

   ขอบเขตที่ทำได้จริงในสาขานี้: ระบบคลังเวชภัณฑ์ (§1.9) เป็นของอีกโมดูล
   (ห้ามแก้ src/pages/pharmacy) — ที่นี่จึงเก็บ lot/ขวด/วันหมดอายุ/จำนวนคงเหลือ
   เป็น mock ในไฟล์นี้ แล้วให้หน้าบันทึกวัคซีน lookup ผ่าน helper ด้านล่าง
   (getVaccineLots / resolveLotWarning). เมื่อระบบคลังจริงพร้อม ให้สลับเฉพาะ
   helper ชุดนี้เป็น API call โดยหน้าจอไม่ต้องแก้.

   Session-mutable state (เพิ่ม/แก้ไข/ยกเลิกรายการวัคซีน) อยู่ใน sessionStorage
   แบบเดียวกับ mentalHealthClinic.js — reset ทุก browser session. */

const storageAvailable = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const readJson = (key, fallback) => {
  if (!storageAvailable()) return fallback;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!storageAvailable()) return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
};

const K = {
  catalog: 'mih:imm:vaccine-catalog-overlay',
  catalogRun: 'mih:imm:vaccine-catalog-run',
};

export const VACCINE_CATALOG_ADMIN_USER = 'ภก.สิริกร วงศ์อนันต์';

/* ── ชนิด / วิธีบริหาร / ตำแหน่งที่ให้ ────────────────────────────── */
export const VACCINE_TYPE_OPTIONS = [
  { value: 'live',        label: 'วัคซีนเชื้อเป็นอ่อนฤทธิ์ (Live attenuated)' },
  { value: 'inactivated', label: 'วัคซีนเชื้อตาย (Inactivated)' },
  { value: 'toxoid',      label: 'ทอกซอยด์ (Toxoid)' },
  { value: 'subunit',     label: 'วัคซีนหน่วยย่อย / รีคอมบิแนนท์ (Subunit)' },
];

export const VACCINE_ROUTE_OPTIONS = [
  { value: 'ID', label: 'ฉีดเข้าในผิวหนัง (ID)' },
  { value: 'IM', label: 'ฉีดเข้ากล้ามเนื้อ (IM)' },
  { value: 'SC', label: 'ฉีดเข้าใต้ผิวหนัง (SC)' },
  { value: 'PO', label: 'หยอดทางปาก / รับประทาน (PO)' },
];

export const INJECTION_SITE_OPTIONS = [
  { value: 'lt-deltoid',   label: 'ต้นแขนซ้าย (Lt. deltoid)' },
  { value: 'rt-deltoid',   label: 'ต้นแขนขวา (Rt. deltoid)' },
  { value: 'lt-thigh',     label: 'ต้นขาซ้าย (Lt. vastus lateralis)' },
  { value: 'rt-thigh',     label: 'ต้นขาขวา (Rt. vastus lateralis)' },
  { value: 'lt-forearm',   label: 'ปลายแขนซ้าย (Lt. forearm)' },
  { value: 'oral',         label: 'หยอดทางปาก' },
];

export const resolveVaccineType  = (v) => VACCINE_TYPE_OPTIONS.find((o) => o.value === v)?.label || '—';
export const resolveVaccineRoute = (v) => VACCINE_ROUTE_OPTIONS.find((o) => o.value === v)?.label || '—';
export const resolveInjectionSite = (v) => INJECTION_SITE_OPTIONS.find((o) => o.value === v)?.label || '—';

/* ── ช่วงอายุตามตาราง EPI (คอลัมน์ของ EPI completeness matrix) ─────── */
export const EPI_AGE_MILESTONES = [
  { key: 'birth', label: 'แรกเกิด',      months: 0 },
  { key: 'm1',    label: '1 เดือน',      months: 1 },
  { key: 'm2',    label: '2 เดือน',      months: 2 },
  { key: 'm4',    label: '4 เดือน',      months: 4 },
  { key: 'm6',    label: '6 เดือน',      months: 6 },
  { key: 'm9',    label: '9 เดือน',      months: 9 },
  { key: 'm12',   label: '1 ปี',         months: 12 },
  { key: 'm18',   label: '1 ปี 6 เดือน', months: 18 },
  { key: 'm30',   label: '2 ปี 6 เดือน', months: 30 },
  { key: 'm48',   label: '4 ปี',         months: 48 },
  { key: 'm84',   label: 'ป.1 (7 ปี)',   months: 84 },
  { key: 'm132',  label: 'ป.6 (11 ปี)',  months: 132 },
];

export const resolveMilestoneLabel = (months) =>
  EPI_AGE_MILESTONES.find((m) => m.months === months)?.label || `${months} เดือน`;

/* ── รายการวัคซีน (seed) ──────────────────────────────────────────────
   schedule[] = เข็มในโปรแกรม EPI: { seq, months } — months ตรงกับ
   EPI_AGE_MILESTONES เพื่อให้ matrix จับคู่คอลัมน์ได้ตรง ๆ. */
const CATALOG_SEED = [
  {
    id: 'vac-bcg', code: 'BCG', abbr: 'BCG',
    nameTh: 'วัคซีนวัณโรค', nameEn: 'Bacillus Calmette–Guérin',
    type: 'live', route: 'ID', dose: '0.1 ml', stockCode: 'STK-VAC-001',
    schedule: [{ seq: 1, months: 0 }],
    status: 'active',
    updatedBy: VACCINE_CATALOG_ADMIN_USER, updatedAt: '2026-01-06T09:10:00',
  },
  {
    id: 'vac-hbv', code: 'HBV', abbr: 'HBV',
    nameTh: 'วัคซีนตับอักเสบบี', nameEn: 'Hepatitis B vaccine',
    type: 'subunit', route: 'IM', dose: '0.5 ml', stockCode: 'STK-VAC-002',
    schedule: [{ seq: 1, months: 0 }, { seq: 2, months: 1 }],
    status: 'active',
    updatedBy: VACCINE_CATALOG_ADMIN_USER, updatedAt: '2026-01-06T09:12:00',
  },
  {
    id: 'vac-dtphb', code: 'DTP-HB', abbr: 'DTPHB',
    nameTh: 'วัคซีนรวมคอตีบ-บาดทะยัก-ไอกรน-ตับอักเสบบี', nameEn: 'DTP-HB combined vaccine',
    type: 'toxoid', route: 'IM', dose: '0.5 ml', stockCode: 'STK-VAC-003',
    schedule: [{ seq: 1, months: 2 }, { seq: 2, months: 4 }, { seq: 3, months: 6 }],
    status: 'active',
    updatedBy: VACCINE_CATALOG_ADMIN_USER, updatedAt: '2026-01-06T09:15:00',
  },
  {
    id: 'vac-opv', code: 'OPV', abbr: 'OPV',
    nameTh: 'วัคซีนโปลิโอชนิดหยอด', nameEn: 'Oral Polio Vaccine',
    type: 'live', route: 'PO', dose: '2 หยด', stockCode: 'STK-VAC-004',
    schedule: [
      { seq: 1, months: 2 }, { seq: 2, months: 4 }, { seq: 3, months: 6 },
      { seq: 4, months: 18 }, { seq: 5, months: 48 },
    ],
    status: 'active',
    updatedBy: VACCINE_CATALOG_ADMIN_USER, updatedAt: '2026-01-06T09:18:00',
  },
  {
    id: 'vac-ipv', code: 'IPV', abbr: 'IPV',
    nameTh: 'วัคซีนโปลิโอชนิดฉีด', nameEn: 'Inactivated Polio Vaccine',
    type: 'inactivated', route: 'IM', dose: '0.5 ml', stockCode: 'STK-VAC-005',
    schedule: [{ seq: 1, months: 4 }],
    status: 'active',
    updatedBy: VACCINE_CATALOG_ADMIN_USER, updatedAt: '2026-01-06T09:20:00',
  },
  {
    id: 'vac-dtp', code: 'DTP', abbr: 'DTP',
    nameTh: 'วัคซีนคอตีบ-บาดทะยัก-ไอกรน', nameEn: 'Diphtheria-Tetanus-Pertussis',
    type: 'toxoid', route: 'IM', dose: '0.5 ml', stockCode: 'STK-VAC-006',
    schedule: [{ seq: 4, months: 18 }, { seq: 5, months: 48 }],
    status: 'active',
    updatedBy: VACCINE_CATALOG_ADMIN_USER, updatedAt: '2026-01-06T09:22:00',
  },
  {
    id: 'vac-mmr', code: 'MMR', abbr: 'MMR',
    nameTh: 'วัคซีนหัด-คางทูม-หัดเยอรมัน', nameEn: 'Measles-Mumps-Rubella',
    type: 'live', route: 'SC', dose: '0.5 ml', stockCode: 'STK-VAC-007',
    schedule: [{ seq: 1, months: 9 }, { seq: 2, months: 18 }],
    status: 'active',
    updatedBy: VACCINE_CATALOG_ADMIN_USER, updatedAt: '2026-01-06T09:25:00',
  },
  {
    id: 'vac-je', code: 'LAJE', abbr: 'JE',
    nameTh: 'วัคซีนไข้สมองอักเสบเจอี (เชื้อเป็น)', nameEn: 'Live Attenuated JE vaccine',
    type: 'live', route: 'SC', dose: '0.5 ml', stockCode: 'STK-VAC-008',
    schedule: [{ seq: 1, months: 12 }, { seq: 2, months: 30 }],
    status: 'active',
    updatedBy: VACCINE_CATALOG_ADMIN_USER, updatedAt: '2026-01-06T09:28:00',
  },
  {
    id: 'vac-ipd', code: 'IPD', abbr: 'IPD',
    nameTh: 'วัคซีนนิวโมคอคคัสชนิดคอนจูเกต', nameEn: 'Pneumococcal Conjugate Vaccine',
    type: 'subunit', route: 'IM', dose: '0.5 ml', stockCode: 'STK-VAC-009',
    schedule: [{ seq: 1, months: 2 }, { seq: 2, months: 4 }, { seq: 3, months: 6 }],
    status: 'active',
    updatedBy: VACCINE_CATALOG_ADMIN_USER, updatedAt: '2026-01-06T09:30:00',
  },
  {
    id: 'vac-rota', code: 'ROTA', abbr: 'Rota',
    nameTh: 'วัคซีนโรตาไวรัส', nameEn: 'Rotavirus vaccine',
    type: 'live', route: 'PO', dose: '1.5 ml', stockCode: 'STK-VAC-010',
    schedule: [{ seq: 1, months: 2 }, { seq: 2, months: 4 }, { seq: 3, months: 6 }],
    status: 'active',
    updatedBy: VACCINE_CATALOG_ADMIN_USER, updatedAt: '2026-01-06T09:33:00',
  },
  {
    id: 'vac-dt', code: 'dT', abbr: 'dT',
    nameTh: 'วัคซีนคอตีบ-บาดทะยัก (ผู้ใหญ่)', nameEn: 'Diphtheria-Tetanus (adult)',
    type: 'toxoid', route: 'IM', dose: '0.5 ml', stockCode: 'STK-VAC-011',
    schedule: [{ seq: 1, months: 84 }, { seq: 2, months: 132 }],
    status: 'active',
    updatedBy: VACCINE_CATALOG_ADMIN_USER, updatedAt: '2026-01-06T09:36:00',
  },
  {
    id: 'vac-hpv', code: 'HPV', abbr: 'HPV',
    nameTh: 'วัคซีนเอชพีวี (นักเรียนหญิง ป.5)', nameEn: 'Human Papillomavirus vaccine',
    type: 'subunit', route: 'IM', dose: '0.5 ml', stockCode: 'STK-VAC-012',
    schedule: [{ seq: 1, months: 132 }],
    status: 'active',
    updatedBy: VACCINE_CATALOG_ADMIN_USER, updatedAt: '2026-01-06T09:38:00',
  },
  {
    id: 'vac-mumps-mono', code: 'M', abbr: 'M',
    nameTh: 'วัคซีนหัดชนิดเดี่ยว (ยกเลิกใช้แล้ว)', nameEn: 'Measles monovalent vaccine',
    type: 'live', route: 'SC', dose: '0.5 ml', stockCode: 'STK-VAC-013',
    schedule: [{ seq: 1, months: 9 }],
    status: 'inactive',
    cancellation: {
      reason: 'เปลี่ยนไปใช้วัคซีนรวม MMR ตามแผนงานสร้างเสริมภูมิคุ้มกันโรค ปี 2568',
      by: VACCINE_CATALOG_ADMIN_USER, at: '2026-02-14T10:05:00',
    },
    updatedBy: VACCINE_CATALOG_ADMIN_USER, updatedAt: '2026-02-14T10:05:00',
  },
];

export const EMPTY_VACCINE = {
  id: '', code: '', abbr: '', nameTh: '', nameEn: '',
  type: '', route: '', dose: '', stockCode: '',
  schedule: [], status: 'active',
};

/* Catalog rows = seed + sessionStorage overlay (new / edited / cancelled). */
export const getVaccineCatalogRows = () => {
  const overlay = readJson(K.catalog, {});
  const seedIds = CATALOG_SEED.map((r) => r.id);
  const merged = CATALOG_SEED.map((r) => (overlay[r.id] ? { ...r, ...overlay[r.id] } : r));
  const added = Object.values(overlay).filter((r) => !seedIds.includes(r.id));
  return [...merged, ...added];
};

export const getActiveVaccines = () => getVaccineCatalogRows().filter((v) => v.status === 'active');

export const getVaccineById = (id) => getVaccineCatalogRows().find((v) => v.id === id) || null;

export const getVaccineByCode = (code) =>
  getVaccineCatalogRows().find((v) => v.code === code) || null;

/* รหัส/ชื่อซ้ำ → validation ก่อนบันทึก (ยกเว้นแถวตัวเอง). */
export const findVaccineDuplicate = (entry) =>
  getVaccineCatalogRows().find((v) =>
    v.id !== entry.id
    && (v.code.trim().toLowerCase() === (entry.code || '').trim().toLowerCase()
      || v.nameTh.trim() === (entry.nameTh || '').trim()))
  || null;

const nextVaccineId = () => {
  const run = readJson(K.catalogRun, 0) + 1;
  writeJson(K.catalogRun, run);
  return `vac-new-${run}`;
};

export const saveVaccine = (entry) => {
  const overlay = readJson(K.catalog, {});
  const isNew = !entry.id;
  const saved = {
    ...entry,
    id: entry.id || nextVaccineId(),
    status: entry.status || 'active',
    updatedBy: VACCINE_CATALOG_ADMIN_USER,
    updatedAt: new Date().toISOString(),
  };
  overlay[saved.id] = saved;
  writeJson(K.catalog, overlay);
  return { saved, isNew };
};

/* ยกเลิกรายการวัคซีน = soft-inactivate เท่านั้น — ประวัติการฉีดเดิมต้องยัง
   อ่านได้ (ห้าม hard delete, TOR §1.11.1.1 edge case). */
export const cancelVaccine = (id, reason) => {
  const overlay = readJson(K.catalog, {});
  const current = getVaccineById(id);
  if (!current) return;
  overlay[id] = {
    ...current,
    status: 'inactive',
    cancellation: { reason: reason || '', by: VACCINE_CATALOG_ADMIN_USER, at: new Date().toISOString() },
    updatedBy: VACCINE_CATALOG_ADMIN_USER,
    updatedAt: new Date().toISOString(),
  };
  writeJson(K.catalog, overlay);
};

export const reactivateVaccine = (id) => {
  const overlay = readJson(K.catalog, {});
  const current = getVaccineById(id);
  if (!current) return;
  overlay[id] = {
    ...current,
    status: 'active',
    cancellation: null,
    updatedBy: VACCINE_CATALOG_ADMIN_USER,
    updatedAt: new Date().toISOString(),
  };
  writeJson(K.catalog, overlay);
};

/* ── Lot / ขวด / คลัง (mock — ระบบคลังจริงอยู่ §1.9 ซึ่งเป็นของอีกโมดูล) ── */
const iso = (y, m, d) => new Date(y, m - 1, d).toISOString().slice(0, 10);

export const VACCINE_LOTS = [
  { vaccineId: 'vac-bcg',   lotNo: 'BCG-6901', expiry: iso(2027, 3, 31),  vials: 12, remaining: 34, coldChain: '2–8 °C' },
  { vaccineId: 'vac-bcg',   lotNo: 'BCG-6812', expiry: iso(2026, 8, 20),  vials: 4,  remaining: 6,  coldChain: '2–8 °C' },
  { vaccineId: 'vac-hbv',   lotNo: 'HBV-6903', expiry: iso(2027, 6, 30),  vials: 20, remaining: 55, coldChain: '2–8 °C' },
  { vaccineId: 'vac-hbv',   lotNo: 'HBV-6740', expiry: iso(2026, 5, 31),  vials: 2,  remaining: 3,  coldChain: '2–8 °C' },
  { vaccineId: 'vac-dtphb', lotNo: 'DTPHB-6905', expiry: iso(2027, 1, 31), vials: 18, remaining: 48, coldChain: '2–8 °C' },
  { vaccineId: 'vac-opv',   lotNo: 'OPV-6907', expiry: iso(2026, 12, 31), vials: 25, remaining: 70, coldChain: '−20 °C' },
  { vaccineId: 'vac-ipv',   lotNo: 'IPV-6902', expiry: iso(2027, 9, 30),  vials: 10, remaining: 26, coldChain: '2–8 °C' },
  { vaccineId: 'vac-dtp',   lotNo: 'DTP-6904', expiry: iso(2027, 2, 28),  vials: 14, remaining: 40, coldChain: '2–8 °C' },
  { vaccineId: 'vac-mmr',   lotNo: 'MMR-6908', expiry: iso(2027, 4, 30),  vials: 16, remaining: 42, coldChain: '2–8 °C' },
  { vaccineId: 'vac-mmr',   lotNo: 'MMR-6801', expiry: iso(2026, 8, 31),  vials: 3,  remaining: 5,  coldChain: '2–8 °C' },
  { vaccineId: 'vac-je',    lotNo: 'JE-6906',  expiry: iso(2027, 5, 31),  vials: 11, remaining: 30, coldChain: '2–8 °C' },
  { vaccineId: 'vac-ipd',   lotNo: 'IPD-6909', expiry: iso(2027, 7, 31),  vials: 9,  remaining: 22, coldChain: '2–8 °C' },
  { vaccineId: 'vac-dt',    lotNo: 'DT-6910',  expiry: iso(2027, 10, 31), vials: 8,  remaining: 20, coldChain: '2–8 °C' },
  { vaccineId: 'vac-hpv',   lotNo: 'HPV-6911', expiry: iso(2027, 11, 30), vials: 6,  remaining: 14, coldChain: '2–8 °C' },
  /* Rota — ตั้งใจให้คลังว่าง เพื่อ demo empty state ของ lookup lot */
];

export const getVaccineLots = (vaccineId) =>
  VACCINE_LOTS.filter((l) => l.vaccineId === vaccineId);

const daysUntil = (isoDate) => {
  if (!isoDate) return null;
  const target = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
};

export const isLotExpired = (expiry) => {
  const d = daysUntil(expiry);
  return d !== null && d < 0;
};

/* เตือน lot ใกล้หมดอายุ (≤ 90 วัน) · block เมื่อหมดอายุแล้ว ·
   เตือนเมื่อคงเหลือน้อย (< 10 dose). */
export const resolveLotWarning = (lot) => {
  if (!lot) return null;
  const d = daysUntil(lot.expiry);
  if (d !== null && d < 0) {
    return { tone: 'danger', blocking: true, message: `Lot ${lot.lotNo} หมดอายุแล้วเมื่อ ${Math.abs(d)} วันก่อน — ห้ามใช้และห้ามบันทึก` };
  }
  if (d !== null && d <= 90) {
    return { tone: 'warning', blocking: false, message: `Lot ${lot.lotNo} ใกล้หมดอายุ (เหลืออีก ${d} วัน) — ใช้ก่อน lot อื่นตามหลัก FEFO` };
  }
  if (lot.remaining < 10) {
    return { tone: 'warning', blocking: false, message: `Lot ${lot.lotNo} คงเหลือ ${lot.remaining} โดส — แจ้งคลังเบิกเพิ่ม` };
  }
  return null;
};

/* จำนวนประวัติการฉีดที่อ้างถึงวัคซีนรายการนี้ — ใช้เตือนก่อน soft-inactivate.
   รับ doses จากผู้เรียก (immunizationClinic) เพื่อไม่ให้สองไฟล์ import วนกัน. */
export const countVaccineUsage = (vaccineId, allDoses = []) =>
  allDoses.filter((d) => d.vaccineId === vaccineId && d.status !== 'cancelled').length;

/* จำนวนเข็มทั้งหมดในโปรแกรม EPI ของวัคซีนรายการหนึ่ง */
export const vaccineDoseCount = (vaccine) => (vaccine?.schedule || []).length;

export const describeSchedule = (vaccine) =>
  (vaccine?.schedule || [])
    .map((s) => `เข็มที่ ${s.seq} — ${resolveMilestoneLabel(s.months)}`)
    .join(' · ') || '—';

/* ═══ ตัดสต๊อก Lot จริงเมื่อฉีดวัคซีน (TOR §1.11.2.1) ═══════════════════
   เดิม lot เป็นแค่ dropdown ให้เลือก — ฉีดไปกี่เข็มคลังก็ไม่ลด เจ้าหน้าที่
   จึงเลือก lot ที่ของหมดแล้วได้เรื่อย ๆ และยอดคงเหลือบนหน้าคลังไม่ตรงของจริง

   `remaining` = จำนวน "โดส" คงเหลือของ lot นั้น (ไม่ใช่จำนวนขวด)

   ⚠️ ต้อง idempotent: การบันทึก visit เดิมซ้ำ (แก้ไขแล้วกดบันทึกใหม่) ต้อง
   ไม่ตัดสต๊อกซ้ำ จึงจำ doseId ที่ตัดไปแล้วไว้ และคืนสต๊อกเมื่อเข็มถูกลบ/
   เปลี่ยน lot — มิฉะนั้นแก้ไขไม่กี่ครั้งคลังก็ติดลบ */

const LOT_LEDGER_KEY = 'mih:imm:lot-ledger';

const lotLedger = () => readJson(LOT_LEDGER_KEY, {});
const saveLotLedger = (v) => writeJson(LOT_LEDGER_KEY, v);

export const findVaccineLot = (vaccineId, lotNo) =>
  VACCINE_LOTS.find((l) => l.vaccineId === vaccineId && l.lotNo === lotNo) || null;

/** โดสคงเหลือของ lot หลังหักที่ใช้ไปแล้วในเซสชันนี้ */
export const lotRemaining = (vaccineId, lotNo) => {
  const lot = findVaccineLot(vaccineId, lotNo);
  if (!lot) return null;
  const used = Object.values(lotLedger())
    .filter((e) => e.vaccineId === vaccineId && e.lotNo === lotNo)
    .reduce((s, e) => s + (e.qty || 0), 0);
  return Math.max(0, lot.remaining - used);
};

/** lot ที่ยังใช้ได้จริง — ตัดที่หมดอายุและที่โดสหมดออก */
export const usableVaccineLots = (vaccineId, todayIso = new Date().toISOString().slice(0, 10)) =>
  getVaccineLots(vaccineId)
    .map((l) => ({ ...l, remaining: lotRemaining(l.vaccineId, l.lotNo) }))
    .filter((l) => l.remaining > 0 && (!l.expiry || l.expiry >= todayIso));

/** เหตุผลที่ lot ใช้ไม่ได้ (null = ใช้ได้) — ใช้แสดงบน dropdown/คำเตือน */
export const lotBlockReason = (vaccineId, lotNo, todayIso = new Date().toISOString().slice(0, 10)) => {
  const lot = findVaccineLot(vaccineId, lotNo);
  if (!lot) return null; /* คีย์เองเมื่อคลังไม่มีข้อมูล — ไม่บล็อก */
  if (lot.expiry && lot.expiry < todayIso) return `Lot ${lotNo} หมดอายุแล้ว (${lot.expiry})`;
  if (lotRemaining(vaccineId, lotNo) <= 0) return `Lot ${lotNo} โดสหมดแล้ว`;
  return null;
};

/** บันทึกการใช้โดสของเข็มหนึ่ง — เรียกซ้ำด้วย doseId เดิมจะไม่ตัดเพิ่ม
    ส่ง lotNo ว่าง/null = คืนสต๊อกของเข็มนั้น (ลบเข็ม หรือเปลี่ยนไป lot อื่น) */
export const commitLotUsage = (doseId, { vaccineId, lotNo, qty = 1 } = {}) => {
  if (!doseId) return null;
  const ledger = lotLedger();
  const prev = ledger[doseId];

  if (!lotNo || !vaccineId) {
    if (prev) { delete ledger[doseId]; saveLotLedger(ledger); }
    return null;
  }
  /* lot เดิม จำนวนเดิม → ไม่ต้องทำอะไร (กันตัดซ้ำตอนกดบันทึกหลายรอบ) */
  if (prev && prev.vaccineId === vaccineId && prev.lotNo === lotNo && prev.qty === qty) return prev;

  ledger[doseId] = { vaccineId, lotNo, qty, at: new Date().toISOString() };
  saveLotLedger(ledger);
  return ledger[doseId];
};

/** ยอดใช้ไปแล้วทั้งหมดต่อ lot — ใช้บนหน้าคลัง/สมุดวัคซีน */
export const lotUsageSummary = () => {
  const out = {};
  Object.values(lotLedger()).forEach((e) => {
    const key = `${e.vaccineId}|${e.lotNo}`;
    out[key] = (out[key] || 0) + (e.qty || 0);
  });
  return out;
};
