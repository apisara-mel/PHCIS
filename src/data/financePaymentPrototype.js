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

/* Queue rows — one per patient at the cashier counter. `status` +
   payment metadata mock the outcome of §2.1's checkout flow. */
export const FINANCE_QUEUE = VISITS.map((v, idx) => {
  const patient = { ...NAMED(idx), hn: v.hn };
  const rights = rightsFromInsurance(patient.insurance);
  const items = buildItems(v.items, v.coverage);
  const { totalCharge, rightsCoverage, amountDue } = totalsOf(items);
  const discount = idx === 5 ? money(amountDue * 0.1) : 0; // one exemption/discount example (TOR §1.5.2)
  const netDue = amountDue - discount;

  const isPaid = idx < 3;
  const isVoided = idx === 3;
  const status = isVoided ? 'voided' : isPaid ? 'paid' : 'pending';

  return {
    id: `fin-${v.hn}`,
    hn: v.hn,
    vn: `A${String(idx + 1).padStart(4, '0')}`,
    counter: `เคาน์เตอร์การเงิน ${(idx % 3) + 1}`,
    patient,
    rights,
    dept: v.dept,
    center: v.center,
    visitDate: '29 กรกฎาคม 2569',
    visitTime: `${8 + (idx % 4)}:${(idx * 7) % 60 < 10 ? '0' : ''}${(idx * 7) % 60}`,
    queueNo: `F${String(idx + 1).padStart(3, '0')}`,
    diagnosis: idx % 2 === 0 ? 'Follow-up (Z09)' : '',
    items,
    totalCharge,
    rightsCoverage,
    discount,
    amountDue: netDue,
    status,
    receiptNo: status !== 'pending' ? `RE69-${String(1000 + idx)}` : null,
    /* A voided receipt was paid before being reversed, so it keeps its
       original payment method/date/reference for the printed record —
       only `status` flips to 'voided' (see คู่มือ §2.1's "ยกเลิกใบเสร็จ"
       sub-flow, which reverses an existing paid receipt). */
    paymentMethod: (isPaid || isVoided) ? PAYMENT_METHODS[idx % PAYMENT_METHODS.length].key : null,
    amountReceived: (isPaid || isVoided) ? netDue : null,
    changeDue: 0,
    payerName: (isPaid || isVoided) ? patient.shortName : null,
    paidAt: (isPaid || isVoided) ? `29 กรกฎาคม 2569 · ${8 + (idx % 4)}:${(idx * 7) % 60 < 10 ? '0' : ''}${(idx * 7) % 60} น.` : null,
    paymentRef: (isPaid || isVoided) ? `REF-${PAYMENT_METHODS[idx % PAYMENT_METHODS.length].key.toUpperCase()}-${1000 + idx}` : null,
    cashier: isPaid || isVoided ? 'จนท.การเงิน สมศรี' : null,
    voidReason: isVoided ? 'บันทึกรายการซ้ำ' : null,
    /* Rows with no medication line have nothing for pharmacy to prepare;
       the rest cycle through preparing/ready so the queue table has a
       realistic mix (§1.8.8.1). */
    pharmacyStatus: items.some((i) => i.category === 'medication')
      ? (idx % 2 === 0 ? 'ready' : 'preparing')
      : 'none',
  };
});

export const computeTotals = totalsOf;

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

/* Daily revenue-register summary strip (TOR §1.5.5 "ทะเบียนรายรับ") —
   derived from the live queue (defaults to the FINANCE_QUEUE seed) so the
   summary cards stay in sync after a void. */
export const financeSummary = (queue = FINANCE_QUEUE) => {
  const paid = queue.filter((r) => r.status === 'paid');
  const pending = queue.filter((r) => r.status === 'pending');
  const voided = queue.filter((r) => r.status === 'voided');
  return {
    pendingCount: pending.length,
    paidCount: paid.length,
    paidTotal: paid.reduce((s, r) => s + (r.amountReceived || 0), 0),
    voidedCount: voided.length,
    outstandingTotal: pending.reduce((s, r) => s + r.amountDue, 0),
  };
};
