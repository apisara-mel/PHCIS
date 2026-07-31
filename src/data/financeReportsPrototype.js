import { PAYMENT_METHODS, CHARGE_CATEGORIES } from '@/data/financePaymentPrototype';

/* Mock data for รายงานการเงิน (src/pages/finance/sections/FinanceReportsSection.jsx)
   — TOR appendix ก §1.20.3:

     §1.20.3.1 รายรับ  — ยอดรวม + แยกประเภท (เงินสด / e-Payment / เครดิต /
                          บริจาค) และแยกตามหมวดรายรับ (ค่ายา / ค่าบริการ / อื่น ๆ)
     §1.20.3.2 รายจ่าย — ยอดรวม + แยกประเภท (เงินเดือน / ค่าวัสดุ /
                          ค่าสาธารณูปโภค / อื่น ๆ)
     §1.20.3.3 งบประมาณ — กราฟ + ตารางเปรียบเทียบ "งบได้รับ" vs "ใช้ไป"
     §1.20.3.4 ภาพรวมรายรับ-รายจ่าย (กราฟ)

   Everything here is in **บาท** (integers). The section converts to
   พันบาท / ล้านบาท only at the chart boundary, because the shared chart
   primitives in src/components/graph/Charts.jsx print raw values as data
   labels and 8-digit baht figures don't fit in them.

   Two things are deliberately NOT invented here:
     1. The fiscal calendar — ปีงบประมาณ runs ต.ค.→ก.ย., so month index 0
        is ตุลาคม of the *previous* calendar year (FY2569 = ต.ค.2568–ก.ย.2569).
     2. Today's revenue — the current fiscal month folds in the live
        finance queue's paid receipts (see `buildFinanceReport`), so this
        report and ทะเบียนรายรับ (RevenueRegisterSection) can never disagree
        about what was collected today. That link was the gap called out in
        the TOR audit: the register's per-method totals existed but never
        reached any report. */

/* ── Calendar ─────────────────────────────────────────────── */

export const FISCAL_MONTHS = ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'];

/* `elapsed` = how many of the 12 fiscal months have data. FY2569 is the
   running year — the prototype's "today" is 31 กรกฎาคม 2569, i.e. the
   10th month of the fiscal year (ต.ค.=1 … ก.ค.=10), so ส.ค./ก.ย. have not
   happened yet and are omitted from the charts rather than plotted as 0. */
export const FISCAL_YEARS = [
  { key: '2569', label: 'ปีงบประมาณ 2569', revScale: 1,    expScale: 1,    elapsed: 10, current: true },
  { key: '2568', label: 'ปีงบประมาณ 2568', revScale: 0.93, expScale: 0.95, elapsed: 12 },
  { key: '2567', label: 'ปีงบประมาณ 2567', revScale: 0.86, expScale: 0.89, elapsed: 12 },
  { key: '2566', label: 'ปีงบประมาณ 2566', revScale: 0.80, expScale: 0.84, elapsed: 12 },
];

/* Same two centers the finance queue uses (`row.center`), so the ศูนย์
   filter here and the register/queue tables mean the same thing. */
export const REPORT_CENTERS = [
  { key: 'all',      label: 'ทุกศูนย์บริการ' },
  { key: 'bangna',   label: 'ศูนย์ 8 บางนา' },
  { key: 'central',  label: 'ศูนย์กลาง' },
];

/* ── Baseline monthly figures (FY2569, บาท) ───────────────── */

const MONTHLY = {
  bangna: {
    revenue: [4320000, 4180000, 4650000, 4890000, 4540000, 5120000, 4760000, 5010000, 5240000, 5380000, 5120000, 4940000],
    expense: [4010000, 3980000, 4520000, 4260000, 4180000, 4640000, 4310000, 4480000, 4720000, 4610000, 4530000, 5120000],
  },
  central: {
    revenue: [3050000, 2980000, 3240000, 3410000, 3180000, 3520000, 3290000, 3460000, 3610000, 3720000, 3540000, 3400000],
    expense: [2880000, 2810000, 3180000, 3020000, 2960000, 3240000, 3050000, 3180000, 3310000, 3260000, 3190000, 3580000],
  },
};

/* ── Breakdown ratios ─────────────────────────────────────── */

/* §1.20.3.1 axis A — ช่องทางรับเงิน. TOR's wording ("เงินสด/e-Payment/
   เครดิต/บริจาค") groups QR + โอนเงิน under e-Payment and บัตรเครดิต/เดบิต
   under เครดิต, which is why this is a coarser list than PAYMENT_METHODS. */
export const REVENUE_CHANNELS = [
  { key: 'cash',      label: 'เงินสด',      ratio: 0.34, color: '#14B8A6', methods: ['cash'] },
  { key: 'epayment',  label: 'e-Payment',   ratio: 0.41, color: '#0EA5E9', methods: ['qr', 'transfer'] },
  { key: 'credit',    label: 'เครดิต',      ratio: 0.21, color: '#6366F1', methods: ['credit'] },
  { key: 'donation',  label: 'เงินบริจาค',  ratio: 0.04, color: '#A855F7', methods: [] },
];

/* §1.20.3.1 axis B — หมวดรายรับ, mapped onto the charge categories the
   cashier screen already bills against (CHARGE_CATEGORIES). */
export const REVENUE_TYPES = [
  { key: 'service',    label: 'ค่าบริการตรวจรักษา',   ratio: 0.38, categories: ['service'] },
  { key: 'medication', label: 'ค่ายา',                 ratio: 0.27, categories: ['medication'] },
  { key: 'lab',        label: 'ค่าตรวจทางห้องปฏิบัติการ', ratio: 0.14, categories: ['lab'] },
  { key: 'radiology',  label: 'ค่าตรวจทางรังสีวินิจฉัย', ratio: 0.09, categories: ['radiology'] },
  { key: 'supplies',   label: 'ค่าเวชภัณฑ์และอุปกรณ์',  ratio: 0.07, categories: ['supplies', 'equipment'] },
  { key: 'other',      label: 'รายรับอื่น ๆ',           ratio: 0.05, categories: ['other'] },
];

/* §1.20.3.2 — TOR names exactly these four expense types. */
export const EXPENSE_TYPES = [
  { key: 'salary',    label: 'เงินเดือนและค่าตอบแทน', ratio: 0.48, color: '#6366F1' },
  { key: 'supplies',  label: 'ค่าวัสดุ (ยา/เวชภัณฑ์)', ratio: 0.26, color: '#F59E0B' },
  { key: 'utilities', label: 'ค่าสาธารณูปโภค',         ratio: 0.11, color: '#0EA5E9' },
  { key: 'other',     label: 'รายจ่ายอื่น ๆ',           ratio: 0.15, color: '#EC4899' },
];

/* §1.20.3.3 — งบได้รับ per หมวดรายจ่ายภาครัฐ, per fiscal year (บาท).
   FY2567's งบดำเนินงาน is deliberately under-allocated so the comparison
   table has a real "เกินงบประมาณ" row to render, not only healthy ones. */
const BUDGET_ALLOCATION = {
  2569: { personnel: 46000000, operating: 32000000, investment: 12500000, subsidy: 6000000, other: 4500000 },
  2568: { personnel: 44000000, operating: 31000000, investment: 11000000, subsidy: 5600000, other: 4200000 },
  2567: { personnel: 41500000, operating: 26000000, investment: 10200000, subsidy: 5200000, other: 3900000 },
  2566: { personnel: 39000000, operating: 27500000, investment:  9500000, subsidy: 4800000, other: 3600000 },
};

/* How a year's actual รายจ่าย lands on the budget หมวด. Keeping this an
   explicit mapping (rather than a second set of invented numbers) means
   "ใช้ไป" in §1.20.3.3 always ties out to the total in §1.20.3.2 — the
   shares below sum to 1. */
export const BUDGET_CATEGORIES = [
  { key: 'personnel',  label: 'งบบุคลากร',       share: 0.48,  color: '#6366F1' },
  { key: 'operating',  label: 'งบดำเนินงาน',      share: 0.37,  color: '#14B8A6' },
  { key: 'investment', label: 'งบลงทุน (ครุภัณฑ์/สิ่งก่อสร้าง)', share: 0.0675, color: '#F59E0B' },
  { key: 'subsidy',    label: 'งบเงินอุดหนุน',    share: 0.045, color: '#0EA5E9' },
  { key: 'other',      label: 'งบรายจ่ายอื่น',     share: 0.0375, color: '#EC4899' },
];

/* ── Helpers ──────────────────────────────────────────────── */

const round = (n) => Math.round(n);
const sum = (arr) => arr.reduce((s, n) => s + n, 0);

const centerKeys = (center) => (center === 'all' ? ['bangna', 'central'] : [center]);

/* Live-queue passthrough — today's paid receipts, split the same way the
   report splits its mock months, so the current fiscal month reflects what
   ทะเบียนรายรับ actually shows. Voided receipts are excluded (their money
   was reversed); pending ones haven't been collected yet. */
const CENTER_OF = { 'ศูนย์ 8 บางนา': 'bangna', 'ศูนย์กลาง': 'central' };

const todayFromQueue = (queue = [], center = 'all') => {
  const keys = centerKeys(center);
  const paid = queue.filter((r) => r.status === 'paid' && keys.includes(CENTER_OF[r.center]));
  const total = sum(paid.map((r) => r.amountReceived || 0));

  const byChannel = Object.fromEntries(REVENUE_CHANNELS.map((c) => [c.key, 0]));
  paid.forEach((r) => {
    const channel = REVENUE_CHANNELS.find((c) => c.methods.includes(r.paymentMethod));
    if (channel) byChannel[channel.key] += r.amountReceived || 0;
  });

  /* Charge lines are billed at full price; the receipt only collects the
     patient's portion. Distribute the collected amount across that visit's
     categories by their share of the total charge so the type breakdown
     never exceeds what was actually received. */
  const byType = Object.fromEntries(REVENUE_TYPES.map((t) => [t.key, 0]));
  paid.forEach((r) => {
    const charge = sum(r.items.map((i) => i.amount)) || 1;
    r.items.forEach((item) => {
      const type = REVENUE_TYPES.find((t) => t.categories.includes(item.category));
      if (type) byType[type.key] += (item.amount / charge) * (r.amountReceived || 0);
    });
  });

  return {
    total,
    count: paid.length,
    byChannel,
    byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, round(v)])),
  };
};

/* ── Report builder ───────────────────────────────────────── */

/* Returns everything the section renders for one (fiscalYear × center)
   selection. Pure — no dates read at call time, so the numbers are stable
   across reloads (the prototype's "today" is fixed at 31 ก.ค. 2569). */
export const buildFinanceReport = ({ fiscalYear = '2569', center = 'all', queue = [] } = {}) => {
  const year = FISCAL_YEARS.find((y) => y.key === fiscalYear) ?? FISCAL_YEARS[0];
  const keys = centerKeys(center);
  const months = FISCAL_MONTHS.slice(0, year.elapsed);

  const revenueMonthly = months.map((_, i) =>
    round(sum(keys.map((k) => MONTHLY[k].revenue[i])) * year.revScale));
  const expenseMonthly = months.map((_, i) =>
    round(sum(keys.map((k) => MONTHLY[k].expense[i])) * year.expScale));

  /* Today's collected cash lands in the last elapsed month of the running
     fiscal year only — a closed year can't gain new receipts. */
  const today = year.current ? todayFromQueue(queue, center) : { total: 0, count: 0, byChannel: {}, byType: {} };
  if (year.current && revenueMonthly.length) {
    revenueMonthly[revenueMonthly.length - 1] += today.total;
  }

  const revenueTotal = sum(revenueMonthly);
  const expenseTotal = sum(expenseMonthly);

  const byChannel = REVENUE_CHANNELS.map((c) => ({
    ...c,
    /* Mock months follow the fixed ratio; today's real receipts are added
       on top at their actual channel, so a cash-heavy day shows up. */
    value: round((revenueTotal - today.total) * c.ratio) + (today.byChannel[c.key] || 0),
  }));

  const byType = REVENUE_TYPES.map((t) => ({
    ...t,
    value: round((revenueTotal - today.total) * t.ratio) + (today.byType[t.key] || 0),
  }));

  const byExpense = EXPENSE_TYPES.map((e) => ({ ...e, value: round(expenseTotal * e.ratio) }));

  const allocation = BUDGET_ALLOCATION[year.key];
  /* A center-filtered view gets its proportional slice of the center's
     budget — งบประมาณ is allocated to the whole สำนักงาน, so filtering to
     one center without scaling would make every หมวด look wildly underspent. */
  const centerShare = center === 'all' ? 1
    : sum(MONTHLY[center].revenue) / sum(Object.values(MONTHLY).map((m) => sum(m.revenue)));

  const budgetRows = BUDGET_CATEGORIES.map((b) => {
    const allocated = round(allocation[b.key] * centerShare);
    const used = round(expenseTotal * b.share);
    return {
      ...b,
      allocated,
      used,
      remaining: allocated - used,
      pct: allocated ? (used / allocated) * 100 : 0,
      overBudget: used > allocated,
    };
  });

  const budgetTotal = {
    allocated: sum(budgetRows.map((b) => b.allocated)),
    used: sum(budgetRows.map((b) => b.used)),
  };
  budgetTotal.remaining = budgetTotal.allocated - budgetTotal.used;
  budgetTotal.pct = budgetTotal.allocated ? (budgetTotal.used / budgetTotal.allocated) * 100 : 0;

  return {
    year,
    months,
    revenueMonthly,
    expenseMonthly,
    netMonthly: revenueMonthly.map((r, i) => r - expenseMonthly[i]),
    revenueTotal,
    expenseTotal,
    netTotal: revenueTotal - expenseTotal,
    byChannel,
    byType,
    byExpense,
    budgetRows,
    budgetTotal,
    today,
  };
};

/* Charts print raw values as data labels, so money goes in scaled down.
   Both helpers keep one decimal for readability at typical health-center
   volumes (≈฿8M/เดือน → 8,400 พันบาท → 8.4 ล้านบาท). */
export const toThousand = (baht) => Math.round(baht / 100) / 10;
export const toMillion = (baht) => Math.round(baht / 100000) / 10;

export const formatPct = (n) => `${n.toFixed(1)}%`;

/* Payment-method → channel label, for the "วิธีชำระวันนี้" hint that ties
   this report back to ทะเบียนรายรับ. */
export const channelOfMethod = (methodKey) =>
  REVENUE_CHANNELS.find((c) => c.methods.includes(methodKey))?.label
  ?? PAYMENT_METHODS.find((m) => m.key === methodKey)?.label
  ?? '-';

export const chargeCategoryLabel = (key) => CHARGE_CATEGORIES[key]?.label ?? key;
