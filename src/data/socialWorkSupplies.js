/* socialWorkSupplies.js — วัสดุสังคมสงเคราะห์ + ทะเบียนผู้ขอวัสดุ
   (TOR §1.10.11.3 บันทึกรับ-จ่ายวัสดุ · §1.10.11.4 บันทึกทะเบียนผู้ขอวัสดุ
   พร้อมการประเมินผู้ขอด้วย Barthel ADL).

   Field vocabulary comes from the legacy HCIS manual §2.8–2.9 (บันทึกรับนมผง /
   บันทึกรับอาหารทางการแพทย์): ศูนย์บริการสาธารณสุข · เลขที่ใบเบิก · วันที่รับ ·
   ยี่ห้อ · สูตร/ชนิด · Lot Number · Expire Date · รับมาจาก · ปริมาณ · หน่วยนับ ·
   ราคาต่อหน่วย · จำนวนเงิน (คำนวณอัตโนมัติ = ปริมาณ × ราคาต่อหน่วย).
   Cancelled ledger rows stay visible (ขีดฆ่า/สีจาง) with ยกเลิกโดย/เมื่อ/เหตุผล
   ตามธรรมเนียมของระบบเดิม.

   เชื่อมระบบคลัง (1.10.11.3) — MOCK ONLY. ห้าม import จาก src/pages/pharmacy
   หรือโมดูลคลัง (เป็นพื้นที่ของทีมอื่น §1.9) — สถานะการซิงก์ที่แสดงบนหน้าจอ
   มาจาก SW_INVENTORY_LINK ด้านล่างเท่านั้น. */

/* ── sessionStorage plumbing ───────────────────────────────────────── */
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
  receipts: 'mih:sw:supply-receipts',
  issues: 'mih:sw:supply-issues',
  requesters: 'mih:sw:requesters',
  requesterRun: 'mih:sw:requester-run',
  assessments: 'mih:sw:adl-assessments',
  printLog: 'mih:sw:supply-print-log',
};

export const SW_SUPPLY_USER = 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ';

/* ── mock ระบบคลัง (display only) ──────────────────────────────────── */
export const SW_INVENTORY_LINK = {
  system: 'ระบบคลังเวชภัณฑ์และวัสดุ (Inventory)',
  lastSyncAt: '2026-08-08T07:30:00',
  mode: 'อ่านอย่างเดียว (mock) — ยอดคงเหลือจริงยืนยันที่ระบบคลัง',
};

/* ── หมวดและรายการวัสดุ ────────────────────────────────────────────── */
export const SW_MATERIAL_CATEGORIES = [
  { value: 'milk', label: 'นมผง', icon: 'water_full' },
  { value: 'medfood', label: 'อาหารทางการแพทย์', icon: 'nutrition' },
  { value: 'dryfood', label: 'ข้าวสารอาหารแห้ง', icon: 'grocery' },
  { value: 'diaper', label: 'ผ้าอ้อม', icon: 'child_care' },
  { value: 'device', label: 'กายอุปกรณ์', icon: 'accessible_forward' },
];

export const resolveSwCategory = (value) =>
  SW_MATERIAL_CATEGORIES.find((c) => c.value === value)?.label || '—';

export const SW_MATERIALS = [
  { code: 'M-01', category: 'milk', name: 'นมผงสูตร 1 (แรกเกิด–6 เดือน)', brand: 'แอนมัม', unit: 'กระป๋อง' },
  { code: 'M-02', category: 'milk', name: 'นมผงสูตร 2 (6 เดือน–1 ปี)', brand: 'แอนมัม', unit: 'กระป๋อง' },
  { code: 'M-03', category: 'medfood', name: 'อาหารทางการแพทย์สูตรครบถ้วน', brand: 'เอนชัวร์', unit: 'กระป๋อง' },
  { code: 'M-04', category: 'medfood', name: 'อาหารทางการแพทย์สูตรเบาหวาน', brand: 'กลูเซอนา', unit: 'กระป๋อง' },
  { code: 'M-05', category: 'dryfood', name: 'ชุดข้าวสารอาหารแห้ง (ถุงยังชีพ)', brand: '—', unit: 'ชุด' },
  { code: 'M-06', category: 'diaper', name: 'ผ้าอ้อมผู้ใหญ่ ไซส์ M', brand: 'เซอร์เทนตี้', unit: 'ห่อ' },
  { code: 'M-07', category: 'diaper', name: 'ผ้าอ้อมผู้ใหญ่ ไซส์ L', brand: 'เซอร์เทนตี้', unit: 'ห่อ' },
  { code: 'M-08', category: 'diaper', name: 'ผ้าอ้อมเด็ก ไซส์ M', brand: 'มามี่โพโค', unit: 'ห่อ' },
  { code: 'M-09', category: 'device', name: 'รถเข็นนั่ง (Wheelchair)', brand: 'ไทยเมดิคอล', unit: 'คัน' },
  { code: 'M-10', category: 'device', name: 'ไม้เท้าสามขา', brand: 'ไทยเมดิคอล', unit: 'อัน' },
  { code: 'M-11', category: 'device', name: 'ที่นอนลมป้องกันแผลกดทับ', brand: 'แคร์แมท', unit: 'ชุด' },
  { code: 'M-12', category: 'device', name: 'วอล์คเกอร์ (Walker)', brand: 'ไทยเมดิคอล', unit: 'อัน' },
];

export const findSwMaterial = (code) => SW_MATERIALS.find((m) => m.code === code) || null;

export const SW_MATERIAL_OPTIONS = SW_MATERIALS.map((m) => ({
  value: m.code,
  label: `${m.code} — ${m.name}`,
}));

export const SW_UNITS = ['กระป๋อง', 'ห่อ', 'ชุด', 'คัน', 'อัน', 'กล่อง', 'ถุง'];

export const SW_SUPPLY_SOURCES = [
  'คลังเวชภัณฑ์ สำนักอนามัย',
  'กองสร้างเสริมสุขภาพ สำนักอนามัย',
  'มูลนิธิช่วยเหลือผู้ป่วยยากไร้',
  'บริจาคจากภาคเอกชนในพื้นที่',
  'กองทุนหลักประกันสุขภาพระดับพื้นที่ (กปท.)',
];

/* ── รับเข้า (receive ledger) ───────────────────────────────────────── */
const RECEIPT_SEED = [
  {
    id: 'rcv-1', receiveDate: '2026-06-03', requisitionNo: 'บ.6906-011', materialCode: 'M-06',
    brand: 'เซอร์เทนตี้', formula: 'ไซส์ M (แบบเทป)', lot: 'LOT-DP2606A', expireDate: '2028-06-01',
    source: 'คลังเวชภัณฑ์ สำนักอนามัย', qty: 120, unit: 'ห่อ', unitPrice: 185,
    status: 'active', recordedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-06-03T09:20:00',
  },
  {
    id: 'rcv-2', receiveDate: '2026-06-03', requisitionNo: 'บ.6906-011', materialCode: 'M-07',
    brand: 'เซอร์เทนตี้', formula: 'ไซส์ L (แบบเทป)', lot: 'LOT-DP2606B', expireDate: '2028-06-01',
    source: 'คลังเวชภัณฑ์ สำนักอนามัย', qty: 90, unit: 'ห่อ', unitPrice: 205,
    status: 'active', recordedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-06-03T09:26:00',
  },
  {
    id: 'rcv-3', receiveDate: '2026-06-19', requisitionNo: 'บ.6906-047', materialCode: 'M-03',
    brand: 'เอนชัวร์', formula: 'สูตรครบถ้วน วานิลลา 850 ก.', lot: 'LOT-EN2606', expireDate: '2027-05-30',
    source: 'กองสร้างเสริมสุขภาพ สำนักอนามัย', qty: 60, unit: 'กระป๋อง', unitPrice: 640,
    status: 'active', recordedBy: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', recordedAt: '2026-06-19T13:05:00',
  },
  {
    id: 'rcv-4', receiveDate: '2026-07-02', requisitionNo: 'บ.6907-008', materialCode: 'M-01',
    brand: 'แอนมัม', formula: 'สูตร 1 (0–6 เดือน) 400 ก.', lot: 'LOT-MK2607', expireDate: '2026-09-01',
    source: 'มูลนิธิช่วยเหลือผู้ป่วยยากไร้', qty: 48, unit: 'กระป๋อง', unitPrice: 320,
    status: 'active', recordedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-07-02T10:12:00',
  },
  {
    id: 'rcv-5', receiveDate: '2026-07-15', requisitionNo: 'บ.6907-052', materialCode: 'M-09',
    brand: 'ไทยเมดิคอล', formula: 'รุ่นพับได้ ล้อ 24 นิ้ว', lot: 'LOT-WC2607', expireDate: '2031-07-14',
    source: 'บริจาคจากภาคเอกชนในพื้นที่', qty: 6, unit: 'คัน', unitPrice: 4200,
    status: 'active', recordedBy: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', recordedAt: '2026-07-15T11:40:00',
  },
  {
    id: 'rcv-6', receiveDate: '2026-07-15', requisitionNo: 'บ.6907-052', materialCode: 'M-11',
    brand: 'แคร์แมท', formula: 'ที่นอนลมแบบลอน พร้อมปั๊ม', lot: 'LOT-AM2607', expireDate: '2030-07-14',
    source: 'บริจาคจากภาคเอกชนในพื้นที่', qty: 10, unit: 'ชุด', unitPrice: 2350,
    status: 'active', recordedBy: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', recordedAt: '2026-07-15T11:52:00',
  },
  {
    id: 'rcv-7', receiveDate: '2026-07-28', requisitionNo: 'บ.6907-088', materialCode: 'M-05',
    brand: '—', formula: 'ข้าวสาร 5 กก. + อาหารแห้ง', lot: 'LOT-DF2607', expireDate: '2027-01-27',
    source: 'กองทุนหลักประกันสุขภาพระดับพื้นที่ (กปท.)', qty: 80, unit: 'ชุด', unitPrice: 450,
    status: 'cancelled',
    cancellation: { reason: 'บันทึกซ้ำกับใบเบิก บ.6907-089 — ยกเลิกรายการนี้', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', at: '2026-07-29T09:15:00' },
    recordedBy: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', recordedAt: '2026-07-28T14:33:00',
  },
  {
    id: 'rcv-8', receiveDate: '2026-07-29', requisitionNo: 'บ.6907-089', materialCode: 'M-05',
    brand: '—', formula: 'ข้าวสาร 5 กก. + อาหารแห้ง', lot: 'LOT-DF2607', expireDate: '2027-01-27',
    source: 'กองทุนหลักประกันสุขภาพระดับพื้นที่ (กปท.)', qty: 80, unit: 'ชุด', unitPrice: 450,
    status: 'active', recordedBy: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', recordedAt: '2026-07-29T09:40:00',
  },
];

export const getSwReceipts = () => {
  const overlay = readJson(K.receipts, {});
  const seedIds = RECEIPT_SEED.map((r) => r.id);
  const merged = RECEIPT_SEED.map((r) => (overlay[r.id] ? { ...r, ...overlay[r.id] } : r));
  const added = Object.values(overlay).filter((r) => !seedIds.includes(r.id));
  return [...merged, ...added];
};

export const saveSwReceipt = (entry) => {
  const overlay = readJson(K.receipts, {});
  const isNew = !entry.id;
  const previous = entry.id ? getSwReceipts().find((r) => r.id === entry.id) : null;
  const saved = {
    ...(previous || {}),
    ...entry,
    id: entry.id || `rcv-new-${Date.now()}`,
    status: entry.status || previous?.status || 'active',
    recordedBy: previous?.recordedBy || SW_SUPPLY_USER,
    recordedAt: previous?.recordedAt || new Date().toISOString(),
    editedBy: previous ? SW_SUPPLY_USER : undefined,
    editedAt: previous ? new Date().toISOString() : undefined,
  };
  overlay[saved.id] = saved;
  writeJson(K.receipts, overlay);
  return { saved, isNew };
};

export const cancelSwReceipt = (id, reason) => {
  const overlay = readJson(K.receipts, {});
  const current = getSwReceipts().find((r) => r.id === id);
  if (!current) return;
  overlay[id] = {
    ...current,
    status: 'cancelled',
    cancellation: { reason: reason || '', by: SW_SUPPLY_USER, at: new Date().toISOString() },
  };
  writeJson(K.receipts, overlay);
};

export const reactivateSwReceipt = (id) => {
  const overlay = readJson(K.receipts, {});
  const current = getSwReceipts().find((r) => r.id === id);
  if (!current) return;
  overlay[id] = { ...current, status: 'active', cancellation: null };
  writeJson(K.receipts, overlay);
};

/* ── จ่ายออก (issue ledger) ─────────────────────────────────────────── */
const ISSUE_SEED = [
  {
    id: 'iss-1', issueDate: '2026-06-11', requesterId: 'req-1', hn: '67-00012', name: 'วิชัย รุ่งเรือง',
    materialCode: 'M-07', lot: 'LOT-DP2606B', qty: 8, unit: 'ห่อ',
    note: 'จ่ายรอบเดือนมิถุนายน', status: 'active',
    issuedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-06-11T10:15:00',
  },
  {
    id: 'iss-2', issueDate: '2026-06-25', requesterId: 'req-2', hn: '67-00003', name: 'ปริญญา รัตนา',
    materialCode: 'M-06', lot: 'LOT-DP2606A', qty: 6, unit: 'ห่อ',
    note: 'จ่ายให้ผู้ดูแลรับแทนมารดาติดเตียง', status: 'active',
    issuedBy: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', recordedAt: '2026-06-25T14:02:00',
  },
  {
    id: 'iss-3', issueDate: '2026-07-06', requesterId: 'req-3', hn: '67-00019', name: 'นันทิดา พรเลิศ',
    materialCode: 'M-01', lot: 'LOT-MK2607', qty: 4, unit: 'กระป๋อง',
    note: 'นมผงสำหรับทารก 2 เดือน', status: 'active',
    issuedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-07-06T09:48:00',
  },
  {
    id: 'iss-4', issueDate: '2026-07-10', requesterId: 'req-1', hn: '67-00012', name: 'วิชัย รุ่งเรือง',
    materialCode: 'M-03', lot: 'LOT-EN2606', qty: 6, unit: 'กระป๋อง',
    note: 'อาหารทางการแพทย์ 1 เดือน', status: 'active',
    issuedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-07-10T11:22:00',
  },
  {
    id: 'iss-5', issueDate: '2026-07-18', requesterId: 'req-4', hn: '67-00022', name: 'อนุชา สมบูรณ์ทรัพย์',
    materialCode: 'M-09', lot: 'LOT-WC2607', qty: 1, unit: 'คัน',
    note: 'รถเข็นนั่ง — ผู้รับบริการเซ็นรับแล้ว', status: 'cancelled',
    cancellation: { reason: 'ผู้รับบริการขอเลื่อนรับเป็นวันนัด 8 ส.ค. — คืนของเข้าคลัง', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', at: '2026-07-18T16:05:00' },
    issuedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-07-18T15:40:00',
  },
  {
    id: 'iss-6', issueDate: '2026-07-24', requesterId: 'req-1', hn: '67-00012', name: 'วิชัย รุ่งเรือง',
    materialCode: 'M-11', lot: 'LOT-AM2607', qty: 1, unit: 'ชุด',
    note: 'ที่นอนลมป้องกันแผลกดทับ', status: 'active',
    issuedBy: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', recordedAt: '2026-07-24T10:31:00',
  },
];

export const getSwIssues = () => {
  const overlay = readJson(K.issues, {});
  const seedIds = ISSUE_SEED.map((r) => r.id);
  const merged = ISSUE_SEED.map((r) => (overlay[r.id] ? { ...r, ...overlay[r.id] } : r));
  const added = Object.values(overlay).filter((r) => !seedIds.includes(r.id));
  return [...merged, ...added];
};

export const saveSwIssue = (entry) => {
  const overlay = readJson(K.issues, {});
  const isNew = !entry.id;
  const previous = entry.id ? getSwIssues().find((r) => r.id === entry.id) : null;
  const saved = {
    ...(previous || {}),
    ...entry,
    id: entry.id || `iss-new-${Date.now()}`,
    status: entry.status || previous?.status || 'active',
    issuedBy: previous?.issuedBy || SW_SUPPLY_USER,
    recordedAt: previous?.recordedAt || new Date().toISOString(),
    editedBy: previous ? SW_SUPPLY_USER : undefined,
    editedAt: previous ? new Date().toISOString() : undefined,
  };
  overlay[saved.id] = saved;
  writeJson(K.issues, overlay);
  return { saved, isNew };
};

export const cancelSwIssue = (id, reason) => {
  const overlay = readJson(K.issues, {});
  const current = getSwIssues().find((r) => r.id === id);
  if (!current) return;
  overlay[id] = {
    ...current,
    status: 'cancelled',
    cancellation: { reason: reason || '', by: SW_SUPPLY_USER, at: new Date().toISOString() },
  };
  writeJson(K.issues, overlay);
};

export const reactivateSwIssue = (id) => {
  const overlay = readJson(K.issues, {});
  const current = getSwIssues().find((r) => r.id === id);
  if (!current) return;
  overlay[id] = { ...current, status: 'active', cancellation: null };
  writeJson(K.issues, overlay);
};

/* ── ยอดคงเหลือ (materialCode + lot) ────────────────────────────────── */
export const getSwStockLots = () => {
  const receipts = getSwReceipts().filter((r) => r.status !== 'cancelled');
  const issues = getSwIssues().filter((r) => r.status !== 'cancelled');
  const map = new Map();
  receipts.forEach((r) => {
    const key = `${r.materialCode}|${r.lot}`;
    const prev = map.get(key) || {
      key, materialCode: r.materialCode, lot: r.lot, expireDate: r.expireDate,
      unit: r.unit, received: 0, issued: 0, unitPrice: r.unitPrice,
    };
    prev.received += Number(r.qty) || 0;
    prev.expireDate = r.expireDate || prev.expireDate;
    prev.unitPrice = r.unitPrice ?? prev.unitPrice;
    map.set(key, prev);
  });
  issues.forEach((i) => {
    const key = `${i.materialCode}|${i.lot}`;
    const prev = map.get(key) || {
      key, materialCode: i.materialCode, lot: i.lot, expireDate: '',
      unit: i.unit, received: 0, issued: 0, unitPrice: 0,
    };
    prev.issued += Number(i.qty) || 0;
    map.set(key, prev);
  });
  return Array.from(map.values())
    .map((l) => ({ ...l, remaining: l.received - l.issued }))
    /* FEFO — first expired, first out */
    .sort((a, b) => String(a.expireDate).localeCompare(String(b.expireDate)));
};

/* `includeLot` — ตอนแก้ไขรายการจ่ายออก lot เดิมของแถวอาจมี remaining = 0
   (ถูกจ่ายจนหมดแล้ว) ถ้ากรองทิ้ง ช่อง Lot ของฟอร์มแก้ไขจะว่าง —
   จึงรวม lot ที่ระบุเข้า options เสมอแม้ยอดคงเหลือเป็น 0. */
export const getSwLotsForMaterial = (materialCode, { includeLot } = {}) =>
  getSwStockLots().filter((l) => l.materialCode === materialCode
    && (l.remaining > 0 || (!!includeLot && l.lot === includeLot)));

export const getSwRemainingForLot = (materialCode, lot, excludeIssueId) => {
  const received = getSwReceipts()
    .filter((r) => r.status !== 'cancelled' && r.materialCode === materialCode && r.lot === lot)
    .reduce((s, r) => s + (Number(r.qty) || 0), 0);
  const issued = getSwIssues()
    .filter((i) => i.status !== 'cancelled' && i.materialCode === materialCode && i.lot === lot)
    .filter((i) => i.id !== excludeIssueId)
    .reduce((s, i) => s + (Number(i.qty) || 0), 0);
  return received - issued;
};

export const getSwStockByCategory = () =>
  SW_MATERIAL_CATEGORIES.map((c) => {
    const lots = getSwStockLots().filter((l) => findSwMaterial(l.materialCode)?.category === c.value);
    return {
      ...c,
      remaining: lots.reduce((s, l) => s + l.remaining, 0),
      lots: lots.length,
    };
  });

/* ใกล้หมดอายุ ≤ 90 วัน (และยังมีของเหลือ) */
export const EXPIRY_WARN_DAYS = 90;
export const EXPIRY_BLOCK_DAYS = 30;

export const daysToExpire = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
};

export const getSwExpiringLots = (withinDays = EXPIRY_WARN_DAYS) =>
  getSwStockLots().filter((l) => {
    if (l.remaining <= 0) return false;
    const days = daysToExpire(l.expireDate);
    return days !== null && days <= withinDays;
  });

/* ── ทะเบียนผู้ขอวัสดุ (TOR 1.10.11.4) ─────────────────────────────── */
export const SW_REQUEST_STATUSES = [
  { value: 'pending', label: 'รอประเมิน', style: 'yellow' },
  { value: 'approved', label: 'อนุมัติ', style: 'green' },
  { value: 'rejected', label: 'ไม่อนุมัติ', style: 'red' },
  { value: 'received', label: 'รับของแล้ว', style: 'teal' },
];
export const resolveSwRequestStatus = (value) =>
  SW_REQUEST_STATUSES.find((s) => s.value === value) || { value, label: '—', style: 'grey' };

export const SW_REQUEST_REASONS = [
  'ผู้ป่วยติดเตียง ต้องใช้ผ้าอ้อมต่อเนื่องทุกวัน',
  'ครอบครัวรายได้น้อย ไม่สามารถซื้ออาหารทางการแพทย์เองได้',
  'มารดาน้ำนมไม่พอ ต้องใช้นมผงเสริมสำหรับทารก',
  'ผู้พิการต้องใช้กายอุปกรณ์เพื่อเคลื่อนย้ายและทำกิจวัตรประจำวัน',
  'ผู้สูงอายุอยู่ลำพัง ขาดแคลนอาหารแห้งประจำเดือน',
];

const REQUESTER_SEED = [
  {
    id: 'req-1', requestNo: 'ขว.0001/2569', hn: '67-00012', name: 'วิชัย รุ่งเรือง',
    caseNo: 'สค.0001/2569', requestDate: '2026-06-05',
    proxyName: 'นางสมทรง รุ่งเรือง', proxyRelation: 'คู่สมรส', phone: '081-234-5678',
    materials: ['M-07', 'M-03', 'M-11'],
    reason: 'ผู้ป่วยติดเตียงหลังโรคหลอดเลือดสมอง ต้องใช้ผ้าอ้อม อาหารทางการแพทย์ และที่นอนลมป้องกันแผลกดทับ',
    status: 'received',
    recordedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-06-05T09:35:00',
  },
  {
    id: 'req-2', requestNo: 'ขว.0002/2569', hn: '67-00003', name: 'ปริญญา รัตนา',
    caseNo: 'สค.0003/2569', requestDate: '2026-06-20',
    proxyName: 'นางสาวกนกวรรณ รัตนา', proxyRelation: 'บุตร', phone: '062-889-7745',
    materials: ['M-06'],
    reason: 'ขอรับผ้าอ้อมผู้ใหญ่สำหรับมารดาติดเตียง ครอบครัวมีรายได้เพียงคนเดียว',
    status: 'received',
    recordedBy: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', recordedAt: '2026-06-20T13:12:00',
  },
  {
    id: 'req-3', requestNo: 'ขว.0003/2569', hn: '67-00019', name: 'นันทิดา พรเลิศ',
    caseNo: '', requestDate: '2026-07-04',
    proxyName: '', proxyRelation: 'ตนเอง', phone: '095-118-2276',
    materials: ['M-01'],
    reason: 'มารดาวัยรุ่นน้ำนมไม่พอ ขอรับนมผงสูตร 1 สำหรับทารกอายุ 2 เดือน',
    status: 'received',
    recordedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-07-04T10:02:00',
  },
  {
    id: 'req-4', requestNo: 'ขว.0004/2569', hn: '67-00022', name: 'อนุชา สมบูรณ์ทรัพย์',
    caseNo: 'สค.0008/2569', requestDate: '2026-07-14',
    proxyName: '', proxyRelation: 'ตนเอง', phone: '086-772-3390',
    materials: ['M-09'],
    reason: 'ผู้พิการทางการเคลื่อนไหว ขอรับรถเข็นนั่งเพื่อเดินทางมารับบริการ',
    status: 'approved',
    recordedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-07-14T11:20:00',
  },
  {
    id: 'req-5', requestNo: 'ขว.0005/2569', hn: '67-00005', name: 'สุดา ปลอดโปร่ง',
    caseNo: 'สค.0007/2569', requestDate: '2026-07-27',
    proxyName: 'นายสมพงษ์ ปลอดโปร่ง', proxyRelation: 'คู่สมรส', phone: '02-415-6690',
    materials: ['M-05', 'M-10'],
    reason: 'ผู้สูงอายุอยู่ลำพัง ขอรับถุงยังชีพและไม้เท้าสามขา',
    status: 'pending',
    recordedBy: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', recordedAt: '2026-07-27T14:45:00',
  },
  {
    id: 'req-6', requestNo: 'ขว.0006/2569', hn: '67-00025', name: 'ภาสกร ชาญฉลาด',
    caseNo: 'สค.0009/2569', requestDate: '2026-07-31',
    proxyName: 'นางพิมล ชาญฉลาด', proxyRelation: 'มารดา', phone: '081-006-4471',
    materials: ['M-04'],
    reason: 'ขอรับอาหารทางการแพทย์สูตรเบาหวานสำหรับผู้ป่วยติดเตียง',
    status: 'rejected',
    decisionNote: 'ผู้รับบริการมีสิทธิเบิกจากโรงพยาบาลแม่ข่ายอยู่แล้ว — แนะนำให้เบิกตามสิทธิเดิม',
    recordedBy: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', recordedAt: '2026-07-31T09:18:00',
  },
];

const nextRequestNo = () => {
  const run = readJson(K.requesterRun, REQUESTER_SEED.length) + 1;
  writeJson(K.requesterRun, run);
  return `ขว.${String(run).padStart(4, '0')}/2569`;
};

export const getSwRequesters = () => {
  const overlay = readJson(K.requesters, {});
  const seedIds = REQUESTER_SEED.map((r) => r.id);
  const merged = REQUESTER_SEED.map((r) => (overlay[r.id] ? { ...r, ...overlay[r.id] } : r));
  const added = Object.values(overlay).filter((r) => !seedIds.includes(r.id));
  return [...merged, ...added];
};

export const getSwRequesterByHn = (hn) =>
  getSwRequesters().find((r) => r.hn === hn && r.status !== 'cancelled') || null;

export const saveSwRequester = (entry) => {
  const overlay = readJson(K.requesters, {});
  const isNew = !entry.id;
  const previous = entry.id ? getSwRequesters().find((r) => r.id === entry.id) : null;
  const editLog = [...(previous?.editLog || [])];
  if (!isNew) editLog.push({ by: SW_SUPPLY_USER, at: new Date().toISOString() });
  const saved = {
    ...(previous || {}),
    ...entry,
    id: entry.id || `req-new-${Date.now()}`,
    requestNo: previous?.requestNo || entry.requestNo || nextRequestNo(),
    requestDate: entry.requestDate || previous?.requestDate || new Date().toISOString().slice(0, 10),
    status: entry.status || previous?.status || 'pending',
    recordedBy: previous?.recordedBy || SW_SUPPLY_USER,
    recordedAt: previous?.recordedAt || new Date().toISOString(),
    editLog,
  };
  overlay[saved.id] = saved;
  writeJson(K.requesters, overlay);
  return { saved, isNew };
};

export const cancelSwRequester = (id, reason) => {
  const overlay = readJson(K.requesters, {});
  const current = getSwRequesters().find((r) => r.id === id);
  if (!current) return;
  overlay[id] = {
    ...current,
    /* เก็บสถานะก่อนยกเลิกไว้ — reactivateSwRequester ใช้คืนสถานะเดิม
       (ไม่งั้นคำขอ approved/received ที่ยกเลิกแล้วเปิดใช้งานจะเพี้ยนเป็น pending) */
    previousStatus: current.status !== 'cancelled'
      ? current.status
      : (current.previousStatus || 'pending'),
    status: 'cancelled',
    cancellation: { reason: reason || '', by: SW_SUPPLY_USER, at: new Date().toISOString() },
  };
  writeJson(K.requesters, overlay);
};

export const reactivateSwRequester = (id) => {
  const overlay = readJson(K.requesters, {});
  const current = getSwRequesters().find((r) => r.id === id);
  if (!current) return;
  overlay[id] = { ...current, status: current.previousStatus || 'pending', cancellation: null };
  writeJson(K.requesters, overlay);
};

export const setSwRequesterDecision = (id, status, note) => {
  const overlay = readJson(K.requesters, {});
  const current = getSwRequesters().find((r) => r.id === id);
  if (!current) return;
  overlay[id] = {
    ...current,
    status,
    decisionNote: note || '',
    decidedBy: SW_SUPPLY_USER,
    decidedAt: new Date().toISOString(),
  };
  writeJson(K.requesters, overlay);
};

/* ── แบบประเมิน Barthel ADL (10 หัวข้อ · เต็ม 100 คะแนน) ─────────────
   ตามคู่มือระบบเดิม §2.4 Tab "Barthel": คีย์ข้อมูลครบทุกข้อ → กด "คำนวณ
   คะแนน" → ระบบแปลผลลงตาราง. การแปลผลเป็นค่าที่คำนวณเสมอ ห้ามพิมพ์เอง. */
export const SW_BARTHEL_ITEMS = [
  {
    key: 'feeding', label: '1. การรับประทานอาหาร (Feeding)',
    options: [
      { score: 0, label: 'ไม่สามารถตักอาหารเข้าปากได้ ต้องมีคนป้อน' },
      { score: 5, label: 'ตักอาหารเองได้แต่ต้องมีคนช่วยบางส่วน' },
      { score: 10, label: 'ตักอาหารรับประทานเองได้ทั้งหมด' },
    ],
  },
  {
    key: 'grooming', label: '2. การล้างหน้า หวีผม แปรงฟัน โกนหนวด (Grooming)',
    options: [
      { score: 0, label: 'ต้องการความช่วยเหลือ' },
      { score: 5, label: 'ทำเองได้ (รวมที่ทำได้เองถ้าเตรียมอุปกรณ์ให้)' },
    ],
  },
  {
    key: 'transfer', label: '3. การลุกนั่งจากที่นอนไปยังเก้าอี้ (Transfer)',
    options: [
      { score: 0, label: 'ไม่สามารถนั่งได้ ต้องใช้คนยก 2 คน' },
      { score: 5, label: 'ต้องการความช่วยเหลืออย่างมากจึงจะนั่งได้' },
      { score: 10, label: 'ต้องการความช่วยเหลือบ้าง หรือมีคนคอยดูแล' },
      { score: 15, label: 'ทำได้เองทั้งหมด' },
    ],
  },
  {
    key: 'toilet', label: '4. การใช้ห้องน้ำ (Toilet use)',
    options: [
      { score: 0, label: 'ช่วยตัวเองไม่ได้' },
      { score: 5, label: 'ทำเองได้บ้าง ต้องการความช่วยเหลือบางอย่าง' },
      { score: 10, label: 'ช่วยตัวเองได้ดี (ขึ้นลงนั่ง ทำความสะอาด ใส่เสื้อผ้า)' },
    ],
  },
  {
    key: 'mobility', label: '5. การเคลื่อนที่ภายในห้องหรือบ้าน (Mobility)',
    options: [
      { score: 0, label: 'เคลื่อนที่ไปไหนไม่ได้' },
      { score: 5, label: 'ใช้รถเข็นช่วยตัวเองให้เคลื่อนที่ได้เอง' },
      { score: 10, label: 'เดินหรือเคลื่อนที่ได้โดยมีคนช่วยพยุง' },
      { score: 15, label: 'เดินหรือเคลื่อนที่ได้เองอย่างน้อย 50 เมตร' },
    ],
  },
  {
    key: 'dressing', label: '6. การสวมใส่เสื้อผ้า (Dressing)',
    options: [
      { score: 0, label: 'ต้องมีคนสวมใส่ให้ ช่วยตัวเองแทบไม่ได้' },
      { score: 5, label: 'ช่วยตัวเองได้ประมาณครึ่งหนึ่ง' },
      { score: 10, label: 'ช่วยตัวเองได้ดี (รวมติดกระดุม รูดซิป ผูกเชือก)' },
    ],
  },
  {
    key: 'stairs', label: '7. การขึ้นลงบันได 1 ชั้น (Stairs)',
    options: [
      { score: 0, label: 'ไม่สามารถทำได้' },
      { score: 5, label: 'ต้องการคนช่วยหรือควบคุมดูแล' },
      { score: 10, label: 'ขึ้นลงได้เอง (ใช้เครื่องช่วยเดินได้)' },
    ],
  },
  {
    key: 'bathing', label: '8. การอาบน้ำ (Bathing)',
    options: [
      { score: 0, label: 'ต้องมีคนช่วยหรือทำให้' },
      { score: 5, label: 'อาบน้ำได้เองทั้งหมด' },
    ],
  },
  {
    key: 'bowels', label: '9. การกลั้นการถ่ายอุจจาระ (Bowels)',
    options: [
      { score: 0, label: 'กลั้นไม่ได้ หรือต้องการการสวนอุจจาระอยู่เสมอ' },
      { score: 5, label: 'กลั้นไม่ได้บางครั้ง (เป็นน้อยกว่า 1 ครั้งต่อสัปดาห์)' },
      { score: 10, label: 'กลั้นได้ปกติ' },
    ],
  },
  {
    key: 'bladder', label: '10. การกลั้นปัสสาวะ (Bladder)',
    options: [
      { score: 0, label: 'กลั้นไม่ได้ หรือใส่สายสวนปัสสาวะแต่ดูแลเองไม่ได้' },
      { score: 5, label: 'กลั้นไม่ได้บางครั้ง (เป็นน้อยกว่าวันละ 1 ครั้ง)' },
      { score: 10, label: 'กลั้นได้ปกติ' },
    ],
  },
];

export const SW_BARTHEL_MAX = SW_BARTHEL_ITEMS.reduce(
  (sum, item) => sum + Math.max(...item.options.map((o) => o.score)),
  0,
);

export const isBarthelComplete = (answers) =>
  SW_BARTHEL_ITEMS.every((i) => answers?.[i.key] !== undefined && answers?.[i.key] !== null);

export const scoreBarthel = (answers) =>
  SW_BARTHEL_ITEMS.reduce((sum, i) => sum + (Number(answers?.[i.key]) || 0), 0);

/* ช่วงการแปลผลตามคู่มือระบบเดิม (0-20 / 25-45 / 50-70 / 75-95 / 100) */
export const interpretBarthel = (total) => {
  if (total >= 100) return { key: 'independent', label: 'ช่วยเหลือตนเองได้ทั้งหมด (Independent)', style: 'green', priority: 5 };
  if (total >= 75) return { key: 'slight', label: 'พึ่งพาผู้อื่นเล็กน้อย (Slight dependence)', style: 'teal', priority: 4 };
  if (total >= 50) return { key: 'moderate', label: 'พึ่งพาผู้อื่นปานกลาง (Moderate dependence)', style: 'yellow', priority: 3 };
  if (total >= 25) return { key: 'severe', label: 'พึ่งพาผู้อื่นมาก (Severe dependence)', style: 'orange', priority: 2 };
  return { key: 'total', label: 'พึ่งพาผู้อื่นทั้งหมด (Total dependence)', style: 'red', priority: 1 };
};

/* แบบประเมินเพิ่มเติมตามที่ผู้ใช้งานกำหนด (mock user-defined checklist) */
export const SW_EXTRA_ASSESSMENT_SEED = [
  { key: 'caregiver', label: 'มีผู้ดูแลหลักอยู่กับผู้รับบริการตลอดเวลา' },
  { key: 'income', label: 'รายได้ครัวเรือนต่ำกว่า 10,000 บาท/เดือน' },
  { key: 'housing', label: 'สภาพที่อยู่อาศัยเหมาะสมต่อการดูแลผู้ป่วย' },
  { key: 'pressure', label: 'มีแผลกดทับหรือความเสี่ยงต่อแผลกดทับ' },
];

const ASSESSMENT_SEED = {
  'req-1': [
    { id: 'as-1', date: '2026-06-05', answers: null, score: 15, assessor: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', note: 'ผู้ป่วยติดเตียงหลัง Stroke ระยะแรก' },
    { id: 'as-2', date: '2026-07-10', answers: null, score: 30, assessor: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', note: 'เริ่มลุกนั่งได้โดยมีผู้ช่วย' },
    { id: 'as-3', date: '2026-07-24', answers: null, score: 45, assessor: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', note: 'ใช้รถเข็นเองได้ในบ้าน' },
  ],
  'req-2': [
    { id: 'as-4', date: '2026-06-20', answers: null, score: 25, assessor: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', note: 'ประเมินมารดาของผู้ขอ (ผู้ป่วยติดเตียง)' },
  ],
  'req-4': [
    { id: 'as-5', date: '2026-07-14', answers: null, score: 75, assessor: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', note: 'พิการทางการเคลื่อนไหว ช่วยเหลือตนเองได้เกือบทั้งหมด' },
    { id: 'as-6', date: '2026-08-01', answers: null, score: 80, assessor: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', note: 'ประเมินซ้ำก่อนจ่ายรถเข็น' },
  ],
};

export const getSwAssessments = (requesterId) => {
  const overlay = readJson(K.assessments, {});
  const seeded = ASSESSMENT_SEED[requesterId] || [];
  const added = (overlay[requesterId] || []);
  return [...seeded, ...added].sort((a, b) => a.date.localeCompare(b.date));
};

export const saveSwAssessment = (requesterId, entry) => {
  const overlay = readJson(K.assessments, {});
  const list = overlay[requesterId] || [];
  const saved = {
    ...entry,
    id: entry.id || `as-new-${Date.now()}`,
    assessor: entry.assessor || SW_SUPPLY_USER,
    recordedAt: new Date().toISOString(),
  };
  overlay[requesterId] = [...list, saved];
  writeJson(K.assessments, overlay);
  return saved;
};

/* ประวัติการประเมินรายบุคคล (ใช้ในหน้าติดตามผล 1.10.11.5 — คีย์ด้วย HN) */
export const getSwAssessmentsByHn = (hn, from, to) => {
  const requesters = getSwRequesters().filter((r) => r.hn === hn);
  return requesters
    .flatMap((r) => getSwAssessments(r.id).map((a) => ({ ...a, requestNo: r.requestNo })))
    .filter((a) => (!from || a.date >= from) && (!to || a.date <= to))
    .sort((a, b) => a.date.localeCompare(b.date));
};

/* วัสดุที่ผู้รับบริการได้รับ (ใช้ในหน้าติดตามผล) — ค่าเริ่มต้นกรองรายการ
   ที่ยกเลิกออก เพื่อให้ตัวนับสรุป/ใบพิมพ์ไม่นับของที่ไม่ได้จ่ายจริง;
   ตารางรายละเอียดเรียกด้วย { includeCancelled: true } เพื่อโชว์แถวยกเลิก
   พร้อม badge ได้ */
export const getSwIssuesByHn = (hn, from, to, { includeCancelled = false } = {}) =>
  getSwIssues()
    .filter((i) => i.hn === hn)
    .filter((i) => includeCancelled || i.status !== 'cancelled')
    .filter((i) => (!from || i.issueDate >= from) && (!to || i.issueDate <= to))
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));

/* ── การพิมพ์ใบจ่ายวัสดุ (audit) ───────────────────────────────────── */
export const logSwSupplyPrint = (refId, docType) => {
  const log = readJson(K.printLog, {});
  const list = log[refId] || [];
  log[refId] = [...list, { docType, by: SW_SUPPLY_USER, at: new Date().toISOString() }];
  writeJson(K.printLog, log);
};

export const getSwSupplyPrintLog = (refId) => readJson(K.printLog, {})[refId] || [];
