import { PATIENT_PROFILES } from '@/data/patientProfiles';
import { parseThaiBuddhistDate } from '@/data/registrationForm';
import { computeQuickRange, computeQuickSingle } from '@/components/popup/DateFilterPopup';

/* Mock data for the `finance` module (src/pages/finance/FinancePaymentPage.jsx).
   Not wired to a backend yet — see product-spec.md §10.4 for the intended
   data flow (completed Treatment records + Registration rightsGroups).

   Shaped after product-spec.md §10.4 / user-flow.md §9.4 in the
   MIH-Docs-Vault Obsidian vault ("finance — งานการเงิน": charge
   calculation per visit → claim eligibility per rightsGroup → payment
   receipt printing → sign-off), and the TOR requirements + legacy cashier
   manual found in that same vault:

     - TOR appendix ก §1.5 "ระบบงานการเงิน" (finance system) — charge
       breakdown by category (lab / radiology / medication / supplies /
       other), payer/rights coverage split, ≥3 payment methods (cash /
       credit card / QR / bank transfer), receipt print + void, discount
       %/flat, revenue register, outstanding-balance tracking.
     - คู่มือระบบงานห้องเงิน §2.1 "บันทึกรับเงินผู้ป่วย" — the literal
       cashier screen: search patient → rights shown read-only → line
       items with a select-all checkbox → amount received → auto-computed
       change (เงินทอน) → payment method → payer name → save → receipt
       number issued → print, including the "การยกเลิกใบเสร็จ" (void by
       receipt number) sub-flow within this same §2.1 screen. §2.2 covers
       cutoff/remittance, §2.3 records miscellaneous other charges, §2.4
       corrects payment status, §2.5 adjusts treatment rights. */

export const RIGHTS_GROUPS = {
  gold:  { key: 'gold',  label: 'บัตรทอง (สปสช.)',        short: 'บัตรทอง',   badge: 'blue' },
  sso:   { key: 'sso',   label: 'ประกันสังคม',              short: 'ประกันสังคม', badge: 'green' },
  civil: { key: 'civil', label: 'ข้าราชการ (เบิกจ่ายตรง)', short: 'ข้าราชการ', badge: 'purple' },
  cash:  { key: 'cash',  label: 'ชำระเงินเอง',              short: 'ชำระเงินเอง', badge: 'grey' },
};

const rightsFromInsurance = (insurance = '') => {
  if (insurance.includes('บัตรทอง') || insurance.includes('หลักประกันสุขภาพ')) return RIGHTS_GROUPS.gold;
  if (insurance.includes('ประกันสังคม')) return RIGHTS_GROUPS.sso;
  if (insurance.includes('ข้าราชการ')) return RIGHTS_GROUPS.civil;
  return RIGHTS_GROUPS.cash;
};

export const PAYMENT_METHODS = [
  { key: 'cash',     label: 'เงินสด',              icon: 'payments' },
  { key: 'credit',   label: 'บัตรเครดิต/เดบิต',    icon: 'credit_card' },
  { key: 'qr',       label: 'QR พร้อมเพย์',        icon: 'qr_code_2' },
  { key: 'transfer', label: 'โอนเงิน/เช็ค',         icon: 'account_balance', requiresBankDetail: true },
];

export const CHARGE_CATEGORIES = {
  service:    { key: 'service',    label: 'ค่าบริการตรวจรักษา',        icon: 'stethoscope' },
  lab:        { key: 'lab',        label: 'ค่าตรวจทางห้องปฏิบัติการ', icon: 'biotech' },
  radiology:  { key: 'radiology',  label: 'ค่าตรวจทางรังสีวินิจฉัย',  icon: 'radiology' },
  medication: { key: 'medication', label: 'ค่ายา',                     icon: 'pill' },
  supplies:   { key: 'supplies',   label: 'ค่าเวชภัณฑ์/วัสดุ',        icon: 'medical_services' },
  equipment:  { key: 'equipment',  label: 'ค่าอุปกรณ์',                icon: 'wheelchair_pickup' },
  other:      { key: 'other',      label: 'ค่าบริการอื่นๆ',            icon: 'receipt_long' },
};

/* เจ้าหน้าที่เตรียมยา — TOR §1.8.8.1: cashier queue needs to see whether
   pharmacy has finished preparing an OPD patient's medication before
   calling them to pay, so the two queues (pharmacy prep → finance
   checkout) can hand off in sequence. */
export const PHARMACY_STATUSES = {
  preparing: { key: 'preparing', label: 'กำลังจัดยา',    color: 'warning' },
  ready:     { key: 'ready',     label: 'พร้อมรับยา',    color: 'success' },
  none:      { key: 'none',      label: 'ไม่มีรายการยา', color: 'neutral' },
};

/* Queue pipeline — cashier-facing statuses. Not the same shape as the
   clinical lab/pharmacy pipelines: a payment either hasn't happened yet
   (pending), has (paid → a receipt exists), or was reversed (voided). */
export const QUEUE_STATUSES = [
  { key: 'pending', label: 'รอชำระเงิน',  color: 'info' },
  { key: 'paid',    label: 'ชำระแล้ว',    color: 'positive' },
  { key: 'voided',  label: 'ยกเลิกใบเสร็จ', color: 'destructive' },
];

const NAMED = (i) => PATIENT_PROFILES[i % PATIENT_PROFILES.length];

const money = (n) => Math.round(n);

/* Builds a line-item set + derives totals. `coverage` (0..1) is how much
   of that line the patient's rights group pays for MIH's mock purposes —
   the remainder ("ส่วนเกินสิทธิ") is what the patient owes, mirroring
   TOR §1.5.1's "full price + amount exceeding rights coverage". */
const buildItems = (spec, coverage) =>
  spec.map((it, idx) => {
    const amount = money(it.qty * it.unitPrice);
    const covered = it.selfPayOnly ? 0 : money(amount * coverage);
    return {
      id: `${it.category}-${idx}`,
      category: it.category,
      label: it.label,
      qty: it.qty,
      unitPrice: it.unitPrice,
      amount,
      covered,
      patientPortion: amount - covered,
      selected: true,
    };
  });

const totalsOf = (items, selectedOnly = false) => {
  const rows = selectedOnly ? items.filter((i) => i.selected) : items;
  const totalCharge = rows.reduce((s, i) => s + i.amount, 0);
  const rightsCoverage = rows.reduce((s, i) => s + i.covered, 0);
  const amountDue = totalCharge - rightsCoverage;
  return { totalCharge, rightsCoverage, amountDue };
};

const VISITS = [
  {
    hn: '67-00001', dept: 'อายุรกรรม', center: 'ศูนย์ 8 บางนา', coverage: 0.8,
    items: [
      { category: 'service', label: 'ค่าตรวจรักษา OPD', qty: 1, unitPrice: 300 },
      { category: 'lab', label: 'CBC + BUN/Cr/Electrolyte panel', qty: 1, unitPrice: 620 },
      { category: 'medication', label: 'Paracetamol 500mg (30 เม็ด)', qty: 1, unitPrice: 90 },
      { category: 'medication', label: 'Physical therapy (PT)', qty: 1, unitPrice: 450 },
    ],
  },
  {
    hn: '67-00002', dept: 'ตรวจรักษา', center: 'ศูนย์ 8 บางนา', coverage: 1,
    items: [
      { category: 'service', label: 'ค่าตรวจรักษา OPD', qty: 1, unitPrice: 250 },
      { category: 'medication', label: 'Antacid suspension', qty: 1, unitPrice: 65 },
    ],
  },
  {
    hn: '67-00003', dept: 'ศัลยกรรม', center: 'ศูนย์ 8 บางนา', coverage: 0.5,
    items: [
      { category: 'service', label: 'ค่าทำแผล', qty: 1, unitPrice: 350 },
      { category: 'medication', label: 'Amoxicillin 500mg (21 เม็ด)', qty: 1, unitPrice: 120 },
      { category: 'supplies', label: 'ชุดทำแผลปลอดเชื้อ', qty: 1, unitPrice: 180 },
    ],
  },
  {
    hn: '67-00004', dept: 'อายุรกรรม', center: 'ศูนย์กลาง', coverage: 0,
    items: [
      { category: 'service', label: 'ค่าตรวจรักษา OPD (นอกสิทธิ)', qty: 1, unitPrice: 500, selfPayOnly: true },
      { category: 'radiology', label: 'Chest X-ray', qty: 1, unitPrice: 350, selfPayOnly: true },
    ],
  },
  {
    hn: '67-00005', dept: 'กุมารเวช', center: 'ศูนย์ 8 บางนา', coverage: 0.8,
    items: [
      { category: 'service', label: 'ค่าตรวจรักษา OPD', qty: 1, unitPrice: 300 },
      { category: 'medication', label: 'Hydrocortisone cream 1% 15g', qty: 1, unitPrice: 55 },
    ],
  },
  {
    hn: '67-00006', dept: 'อายุรกรรม', center: 'ศูนย์ 8 บางนา', coverage: 1,
    items: [
      { category: 'service', label: 'ค่าตรวจรักษา OPD', qty: 1, unitPrice: 300 },
      { category: 'lab', label: 'FBS / HbA1c', qty: 1, unitPrice: 280 },
      { category: 'medication', label: 'Metformin 500mg (60 เม็ด)', qty: 1, unitPrice: 110 },
      { category: 'medication', label: 'Enalapril 5mg (30 เม็ด)', qty: 1, unitPrice: 75 },
    ],
  },
  {
    hn: '67-00007', dept: 'ตรวจรักษา', center: 'ศูนย์กลาง', coverage: 0.8,
    items: [
      { category: 'service', label: 'ค่าตรวจรักษา OPD', qty: 1, unitPrice: 300 },
      { category: 'radiology', label: 'Knee X-ray (2 views)', qty: 1, unitPrice: 420 },
      { category: 'medication', label: 'Diclofenac gel', qty: 1, unitPrice: 85 },
      { category: 'equipment', label: 'ไม้ค้ำยัน (Crutches)', qty: 1, unitPrice: 150 },
    ],
  },
  {
    hn: '67-00008', dept: 'ตรวจรักษา', center: 'ศูนย์ 8 บางนา', coverage: 0.8,
    items: [
      { category: 'service', label: 'ค่าตรวจรักษา OPD', qty: 1, unitPrice: 300 },
      { category: 'medication', label: 'Lorazepam 0.5mg (10 เม็ด, PRN)', qty: 1, unitPrice: 60 },
    ],
  },
];

/* Seed dates are derived from the clock, never hardcoded. A fixed
   "29 กรกฎาคม 2569" drifts further from reality every day the prototype
   sits unopened, and because the register/outstanding tabs default their
   date chip to a *relative* range ("วันนี้" / "30 วันที่ผ่านมา"), a stale
   seed silently filters every row out — the tab renders empty while the
   summary cards above it still show money. Keep this relative. */
export const thaiDate = (d) =>
  d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

export const thaiTime = (d) =>
  d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

/* How many days before today each visit happened. Most sit on today so the
   register's "วันนี้" default has something to show; some pending rows are
   deliberately older so ยอดค้างชำระ exercises debt that crosses days. */
const visitDaysAgoFor = (status, i) => {
  if (status === 'pending' && i % 5 === 0) return 3 + (i % 10);
  if (status === 'pending' && i % 7 === 0) return 12;
  return 0;
};

const DEPTS = ['อายุรกรรม', 'ตรวจรักษา', 'ศัลยกรรม', 'กุมารเวช', 'ศูนย์กลาง'];
const CENTERS = ['ศูนย์ 8 บางนา', 'ศูนย์กลาง', 'ศูนย์ 8 บางนา'];

/** Build one cashier-queue row from a VISITS template + status. */
const buildQueueRow = (visit, idx, status) => {
  const patient = { ...NAMED(idx), hn: visit.hn };
  const rights = rightsFromInsurance(patient.insurance);
  const items = buildItems(visit.items, visit.coverage).map((it, itemIdx) => ({
    ...it,
    id: `${visit.hn}-${it.category}-${itemIdx}`,
  }));
  const { totalCharge, rightsCoverage, amountDue } = totalsOf(items);
  const discount = idx % 11 === 5 ? money(amountDue * 0.1) : 0;
  const netDue = amountDue - discount;

  const isPaid = status === 'paid';
  const isVoided = status === 'voided';
  const settled = isPaid || isVoided;

  const visitTime = `${8 + (idx % 4)}:${String((idx * 7) % 60).padStart(2, '0')}`;
  const visitDate = thaiDate(daysAgo(visitDaysAgoFor(status, idx)));

  const paidClock = new Date();
  paidClock.setHours(8 + (idx % 4), ((idx * 7) % 60) + 40 > 59 ? ((idx * 7) % 60) - 20 : ((idx * 7) % 60) + 40, 0, 0);
  const paidDate = thaiDate(new Date());
  const paidTime = thaiTime(paidClock);

  /* ~1 in 8 paid rows keep a residual so ยอดค้างชำระ / partial banner stay realistic. */
  const residualDue = isPaid && idx % 8 === 0 ? money(netDue * 0.35) : 0;

  return {
    id: `fin-${status}-${idx}`,
    hn: visit.hn,
    vn: `A${String(idx + 1).padStart(4, '0')}`,
    counter: `เคาน์เตอร์การเงิน ${(idx % 3) + 1}`,
    patient,
    rights,
    dept: visit.dept || DEPTS[idx % DEPTS.length],
    center: visit.center || CENTERS[idx % CENTERS.length],
    visitDate,
    visitTime,
    queueNo: `F${String(idx + 1).padStart(3, '0')}`,
    diagnosis: idx % 2 === 0 ? 'Follow-up (Z09)' : '',
    items,
    totalCharge,
    rightsCoverage,
    discount,
    amountDue: netDue,
    residualDue,
    status,
    receiptNo: settled ? `RE69-${String(1000 + idx)}` : null,
    paymentMethod: settled ? PAYMENT_METHODS[idx % PAYMENT_METHODS.length].key : null,
    amountReceived: settled ? (residualDue ? money(netDue - residualDue) : netDue) : null,
    changeDue: 0,
    payerName: settled ? patient.shortName : null,
    paidDate: settled ? paidDate : null,
    paidTime: settled ? paidTime : null,
    paidAt: settled ? `${paidDate} · ${paidTime} น.` : null,
    paymentRef: settled
      ? `REF-${PAYMENT_METHODS[idx % PAYMENT_METHODS.length].key.toUpperCase()}-${1000 + idx}`
      : null,
    cashier: settled ? 'จนท.การเงิน สมศรี' : null,
    voidReason: isVoided ? (idx % 2 === 0 ? 'บันทึกรายการซ้ำ' : 'ผู้ป่วยขอเปลี่ยนวิธีชำระเงิน') : null,
    pharmacyStatus: items.some((i) => i.category === 'medication')
      ? (idx % 2 === 0 ? 'ready' : 'preparing')
      : 'none',
  };
};

/* 40 rows per payment status so each คิวชำระเงิน pill has enough list
   volume for pagination / scroll demos. Templates cycle from VISITS. */
const QUEUE_ROWS_PER_STATUS = 40;

export const FINANCE_QUEUE = QUEUE_STATUSES.flatMap((statusDef, statusOrd) => (
  Array.from({ length: QUEUE_ROWS_PER_STATUS }, (_, i) => {
    const globalIdx = statusOrd * QUEUE_ROWS_PER_STATUS + i;
    const template = VISITS[i % VISITS.length];
    const hn = `67-${String(globalIdx + 1).padStart(5, '0')}`;
    return buildQueueRow(
      { ...template, hn, dept: template.dept || DEPTS[i % DEPTS.length] },
      globalIdx,
      statusDef.key,
    );
  })
));

export const computeTotals = totalsOf;

/* ราคาขายตาม Payer/สิทธิ — TOR §1.8.9.1. The pricing screen stores a percent
   adjustment per (หมวดค่าใช้จ่าย × สิทธิ); this applies it to a visit's lines
   at checkout so the setting is a real price rule rather than a config page
   nothing reads. The rights group keeps covering the same *proportion* of
   each line, so raising a price raises both the claim and the patient's
   share rather than silently shifting cost onto one side. */
export const applyPricing = (items, rightsKey, adjustments) => {
  if (!adjustments) return items;
  return items.map((item) => {
    const pct = Number(adjustments?.[item.category]?.[rightsKey] ?? 0);
    if (!pct) return item;
    const ratio = item.amount > 0 ? item.covered / item.amount : 0;
    const amount = money(item.amount * (1 + pct / 100));
    const covered = money(amount * ratio);
    return {
      ...item,
      amount,
      covered,
      patientPortion: amount - covered,
      basePrice: item.basePrice ?? item.amount,
      pricingPct: pct,
    };
  });
};

/* True when any cell of the matrix is non-zero — used to decide whether the
   checkout screen should explain that prices were adjusted. */
export const hasPricingAdjustment = (adjustments, rightsKey) =>
  !!adjustments && Object.values(adjustments).some((byRights) => Number(byRights?.[rightsKey] ?? 0) !== 0);

export const formatBaht = (n) =>
  `฿${Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0 })}`;

/* Thai taxpayer ID for the printed receipt — same 13 digits as the
   patient's `nationalId` (Thai law uses the national ID as the default
   TIN for individuals), grouped 1-4-5-2-1 per the standard display
   format. Falls back to the raw value if it isn't 13 digits. */
export const formatTaxId = (id = '') => {
  const digits = String(id).replace(/\D/g, '');
  if (digits.length !== 13) return id;
  return `${digits[0]}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits[12]}`;
};

/* `visitTime` is "H:MM" (no leading zero on the hour — e.g. "8:00", "9:07",
   "10:14"), so a plain string sort puts "10:14" before "8:00". Use this to
   sort chronologically instead. */
export const timeToMinutes = (t) => {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
};

/* Sortable instant for a visit — Thai Buddhist date + "H:MM" collapsed into
   one number. Needed wherever "ครั้งล่าสุด" is asked for (TOR §1.8.7.3):
   picking the first row that matches an HN only happens to be the latest
   while the mock holds one visit per patient. */
export const visitInstant = (row) => {
  const d = parseThaiBuddhistDate(row.visitDate);
  if (!d) return 0;
  return d.getTime() + timeToMinutes(row.visitTime) * 60000;
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/* Applies a <FilterDateTag> value ({ quick } or { quick:'custom', tab,
   single, range }) against one of our Thai Buddhist date strings (e.g.
   "29 กรกฎาคม 2569"). Reuses DateFilterPopup's own quick-range math so the
   register/outstanding tables filter by the SAME calendar logic the chip's
   popup shows, instead of re-deriving date ranges by hand. TOR §1.8.5.2 /
   §1.8.6.4 — the quick chip must actually narrow the results, not just
   change its own label. */
export const matchesDateFilter = (thaiDateStr, filterValue) => {
  const date = parseThaiBuddhistDate(thaiDateStr);
  if (!date) return true;
  const quick = filterValue?.quick;
  if (!quick) return true;

  if (quick === 'custom') {
    if (filterValue.tab === 'single' && filterValue.single) {
      return date.getTime() === startOfDay(filterValue.single).getTime();
    }
    if (filterValue.tab === 'range' && filterValue.range?.start && filterValue.range?.end) {
      const start = startOfDay(filterValue.range.start).getTime();
      const end = startOfDay(filterValue.range.end).getTime();
      return date.getTime() >= start && date.getTime() <= end;
    }
    return true;
  }

  const single = computeQuickSingle(quick);
  if (single) return date.getTime() === single.getTime();
  const range = computeQuickRange(quick);
  if (range) return date.getTime() >= range.start.getTime() && date.getTime() <= range.end.getTime();
  return true;
};

/* เงินที่เข้าลิ้นชักจริงของใบเสร็จหนึ่งใบ = เงินที่รับมา − เงินทอน.
   `amountReceived` คือสิ่งที่ผู้ป่วยยื่นให้ ไม่ใช่รายรับ — จ่ายเงินสด ฿200
   สำหรับยอด ฿107 แล้วทอน ฿93 ต้องลงทะเบียนรายรับเป็น ฿107 เท่านั้น
   (ข้อมูล seed เดิมทอน 0 เสมอ ความต่างเลยไม่เคยโผล่จนกระทั่งมีการชำระจริง). */
export const netCollected = (row) =>
  Math.max(0, (row.amountReceived || 0) - (row.changeDue || 0));

/* ยอดที่ผู้ป่วยรายนี้ยังค้างอยู่ — TOR §1.8.1.15 lets a cashier settle only
   some of a visit's charges, and §1.8.1.3/§1.8.6.1 then expect the rest to
   show up as ยอดค้างชำระ. A row that was paid in part therefore still carries
   a balance even though its status reads "ชำระแล้ว". */
export const outstandingOf = (row) => {
  if (row.status === 'pending') return row.amountDue;
  if (row.status === 'paid') return row.residualDue || 0;
  return 0; // ใบเสร็จที่ยกเลิกแล้วไม่ถือเป็นยอดค้าง จนกว่าจะออกใบใหม่
};

export const hasResidual = (row) => row.status === 'paid' && (row.residualDue || 0) > 0;

/* Daily revenue-register summary strip (TOR §1.5.5 "ทะเบียนรายรับ") —
   derived from the live queue (defaults to the FINANCE_QUEUE seed) so the
   summary cards stay in sync after a void. */
export const financeSummary = (queue = FINANCE_QUEUE) => {
  const paid = queue.filter((r) => r.status === 'paid');
  const pending = queue.filter((r) => r.status === 'pending');
  const voided = queue.filter((r) => r.status === 'voided');
  const partial = paid.filter(hasResidual);
  return {
    pendingCount: pending.length,
    paidCount: paid.length,
    paidTotal: paid.reduce((s, r) => s + netCollected(r), 0),
    voidedCount: voided.length,
    partialCount: partial.length,
    outstandingTotal: queue.reduce((s, r) => s + outstandingOf(r), 0),
  };
};
