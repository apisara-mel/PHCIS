/* PHCIS | Consent — สถิติและรายงาน (Figma 358:113804).
   ตัวเลข/แถวตาราง/ชุดกราฟ ดึงจาก mock ที่ใช้ในเมนูจริง
   (CONSENT_RECORDS · ACCESS_RECORDS · CONSENT_FORM_RECORDS)
   ไม่สร้างชุดตัวเลขลอย ๆ ที่ไม่สัมพันธ์กับ worklist.

   chart:
     'donut' — สัดส่วนส่วนของทั้งหมด (เช่น ยินยอม vs ปฏิเสธ)
     'hbar'  — อันดับตามหมวด (ประเภท / แผนก / สถานะ)
     'bars'  — แนวโน้มตามเวลา (ใช้ร่วมกับ selectable period chips)
     'none'  — แสดงเฉพาะ SummaryCard ไม่มีกราฟสัดส่วน */

import { parseThaiBuddhistDate } from '@/data/registrationForm';
import { CONSENT_RECORDS, CONSENT_STATUS, CONSENT_TYPES } from '@/data/consentRecords';
import { ACCESS_RECORDS } from '@/data/accessRecords';
import { CONSENT_FORM_RECORDS } from '@/data/consentFormRecords';
import { PHCIS_CHART, PHCIS_CHART_PALETTE } from '@/data/phcisChartPalette';

const fmt = (n) => Number(n || 0).toLocaleString('th-TH');

const toIso = (thaiDate) => {
  const d = parseThaiBuddhistDate(thaiDate);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const countBy = (rows, getKey) => {
  const map = new Map();
  rows.forEach((r) => {
    const k = getKey(r);
    if (!k) return;
    map.set(k, (map.get(k) || 0) + 1);
  });
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
};

/* น้ำหนักฤดูกาล mock — รวม = 12 เดือนกะประมาณครบปี */
const YEAR_MONTH_WEIGHTS = [0.72, 0.78, 1.05, 0.98, 0.92, 1.12, 1.18, 1.08, 0.95, 0.88, 0.82, 0.90];

/** กระจายจำนวนเต็ม `total` ตาม weights ให้ผลรวมเท่าเดิมเป๊ะ */
const distributeTotal = (total, weights) => {
  const n = weights.length;
  if (n === 0) return [];
  const safeTotal = Math.max(0, Math.round(Number(total) || 0));
  if (safeTotal <= 0) return Array.from({ length: n }, () => 0);
  const sumW = weights.reduce((a, w) => a + Math.max(0, Number(w) || 0), 0) || n;
  const raw = weights.map((w) => (safeTotal * Math.max(0, Number(w) || 0)) / sumW);
  const floors = raw.map((x) => Math.floor(x));
  let rem = safeTotal - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((x, i) => ({ i, frac: x - floors[i] }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < rem; k += 1) floors[order[k % n].i] += 1;
  return floors;
};

/* เดือนปฏิทิน (0–11) จาก createdDate — ใช้ทำแนวโน้ม VBars
   ถ้าข้อมูลจริงกระจุกไม่กี่เดือน → กระจายยอดรวมครบ 12 เดือน (ผลรวมเท่าเดิม) */
const monthHistogram = (rows, predicate = () => true) => {
  const buckets = Array.from({ length: 12 }, () => 0);
  let total = 0;
  rows.forEach((r) => {
    if (!predicate(r)) return;
    total += 1;
    const d = parseThaiBuddhistDate(r.createdDate);
    if (!d) return;
    buckets[d.getMonth()] += 1;
  });
  const monthsWithData = buckets.filter((n) => n > 0).length;
  if (total <= 0) return distributeTotal(12, YEAR_MONTH_WEIGHTS);
  /* ครบเกือบทั้งปีแล้ว — ใช้ของจริง (เติม 0 ได้) */
  if (monthsWithData >= 10) return buckets;
  /* เน้นเดือนที่มีข้อมูลจริง แล้วกระจายยอดรวมครบปี */
  const weights = YEAR_MONTH_WEIGHTS.map((w, i) => (buckets[i] > 0 ? w * 1.55 : w));
  return distributeTotal(total, weights);
};

/**
 * แปลงชุด base รายเดือน (ยาว 12) → ค่าแกน x ตามชิปช่วงเวลา
 * ผลรวมช่วงรายเดือน = ปี · รายวัน/สัปดาห์ ≈ ค่าเฉลี่ยเดือน · รายปีปีล่าสุด = ยอดปี
 * ปีงบประมาณ = 12 เดือน ต.ค.→ก.ย. (1 ต.ค. – 30 ก.ย.)
 */
export const FISCAL_MONTH_SHORT_LABELS = [
  'ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.',
  'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.',
];

/** จัดเรียงยอดรายเดือนปฏิทิน (ม.ค.→ธ.ค.) เป็นลำดับปีงบประมาณ (ต.ค.→ก.ย.) */
export const calendarMonthsToFiscalOrder = (months = []) => {
  const src = Array.from({ length: 12 }, (_, i) => Math.max(0, Number(months[i]) || 0));
  return Array.from({ length: 12 }, (_, i) => src[(9 + i) % 12]);
};

export const periodValuesFromYearBase = (base = [], period = 'รายเดือน') => {
  const months = Array.from({ length: 12 }, (_, i) => Math.max(0, Number(base[i]) || 0));
  const yearTotal = months.reduce((a, b) => a + b, 0);
  const monthAvg = Math.max(0, Math.round(yearTotal / 12));
  switch (period) {
    case 'รายวัน':
      return distributeTotal(Math.max(monthAvg, yearTotal > 0 ? 1 : 0), [1, 1.1, 0.9, 1.2, 1.05, 0.85, 1.0]);
    case 'รายสัปดาห์':
      return distributeTotal(Math.max(monthAvg, yearTotal > 0 ? 1 : 0), [1.05, 1.15, 0.95, 0.85]);
    case 'รายปี':
      /* 5 ปีล่าสุด — ปีปัจจุบัน = ยอดทั้งปี · ปีก่อน ๆ สเกลลง */
      return [0.68, 0.78, 0.88, 0.95, 1].map((w) => Math.max(0, Math.round(yearTotal * w)));
    case 'ปีงบประมาณ':
      return calendarMonthsToFiscalOrder(months);
    case 'รายเดือน':
    default:
      return months;
  }
};

const tabOf = (r) => (CONSENT_STATUS[r.status] || {}).tab;

const isConsentedOutcome = (r) => ['consented', 'expiring', 'expired'].includes(tabOf(r));
const isRejectedOutcome = (r) => tabOf(r) === 'rejected';

/** สถานะรายงานรายบุคคล — ให้ / ไม่ให้ (เฉพาะผลตัดสินแล้ว) */
const reportStatusOf = (r) => {
  if (isConsentedOutcome(r)) return 'ให้ความยินยอม';
  if (isRejectedOutcome(r)) return 'ไม่ให้ความยินยอม';
  return null;
};

const DATA_TYPES = ['ประวัติการรักษา', 'ผลตรวจ Lab', 'ภาพรังสี', 'ใบสั่งยา', 'ข้อมูลสิทธิ'];

const HBAR_SEG_CONSENT = PHCIS_CHART.teal;
const HBAR_SEG_DECLINE = PHCIS_CHART.pink;

/** 5 สถานะบนแดชบอร์ด — donut + แถบตามประเภท (shared กับ ConsentDashboardPage) */
export const CONSENT_STATUS_BUCKETS = [
  { label: 'ยินยอมแล้ว', match: ['ยินยอมแล้ว'], tone: 'positive', color: PHCIS_CHART.teal },
  { label: 'รอลงนาม', match: ['รอลงนาม', 'อยู่ระหว่างลงนาม'], tone: 'warning', color: PHCIS_CHART.orange },
  { label: 'รอดำเนินการ', match: ['ขอเพิกถอน'], tone: 'warning', color: PHCIS_CHART.yellow },
  { label: 'ปฏิเสธ / ถอน', match: ['ปฏิเสธ', 'ถอนความยินยอม', 'ยกเลิกคำขอ'], tone: 'danger', color: PHCIS_CHART.pink },
  { label: 'หมดอายุ / ใกล้หมด', match: ['หมดอายุ', 'ใกล้หมดอายุ', 'หมดอายุ-Reconsent'], tone: 'info', color: PHCIS_CHART.indigo },
];

export const bucketOfConsentStatus = (status) => {
  const hit = CONSENT_STATUS_BUCKETS.find((b) => b.match.includes(status));
  return hit ? hit.label : null;
};

export const consentStatusSegmentsFrom = (records) => CONSENT_STATUS_BUCKETS.map((b, i) => ({
  label: b.label,
  color: b.color || PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
  tone: b.tone,
  value: records.filter((r) => b.match.includes(r.status)).length,
})).filter((s) => s.value > 0);

export const consentTypeStatusBarsFrom = (records) => {
  const map = new Map(
    CONSENT_TYPES.map((type) => [type, {
      label: type,
      value: 0,
      counts: Object.fromEntries(CONSENT_STATUS_BUCKETS.map((b) => [b.label, 0])),
    }]),
  );
  records.forEach((r) => {
    const row = map.get(r.type) || {
      label: r.type,
      value: 0,
      counts: Object.fromEntries(CONSENT_STATUS_BUCKETS.map((b) => [b.label, 0])),
    };
    row.value += 1;
    const bucket = bucketOfConsentStatus(r.status);
    if (bucket) row.counts[bucket] += 1;
    map.set(r.type, row);
  });
  return CONSENT_TYPES
    .map((type) => map.get(type))
    .filter((row) => row && row.value > 0)
    .map((row) => ({
      label: row.label,
      value: row.value,
      segments: CONSENT_STATUS_BUCKETS.map((b) => ({
        value: row.counts[b.label] || 0,
        color: b.color,
        label: b.label,
      })),
    }))
    .sort((a, b) => b.value - a.value);
};

const EXPORT_STATUS_SEGMENTS = [
  { key: 'success', label: 'สำเร็จ', color: PHCIS_CHART.teal },
  { key: 'expired', label: 'หมดอายุ', color: PHCIS_CHART.indigo },
  { key: 'denied', label: 'ถูกปฏิเสธ', color: PHCIS_CHART.pink },
  { key: 'pending', label: 'รอตรวจสอบ', color: PHCIS_CHART.yellow },
];

/** แผนก mock เพิ่มเติม — ให้แถบหน่วยงานในรายงานส่งออกดูครบเมื่อช่วงวันกรองเหลือไม่กี่แผนก */
const EXPORT_DEPT_MOCK = [
  'อายุรกรรม', 'ศัลยกรรม', 'กุมารเวชกรรม', 'สูตินรีเวช', 'ออร์โธปิดิกส์',
  'หู คอ จมูก', 'จักษุวิทยา', 'จิตเวช', 'เวชศาสตร์ฉุกเฉิน', 'รังสีวิทยา',
  'ผู้ป่วยนอก', 'ผู้ป่วยใน', 'เภสัชกรรม', 'ทันตกรรม', 'ห้องปฏิบัติการ',
  'วิสัญญีวิทยา', 'คลังยา', 'พยาบาลวิชาชีพ',
];

const exportOutcomeOf = (r) => {
  if (r.status === 'อนุมัติแล้ว') return 'success';
  if (r.status === 'หมดอายุ') return 'expired';
  if (r.status === 'ปฏิเสธ') return 'denied';
  if (r.status === 'รออนุมัติ') return 'pending';
  return null;
};

/** แถบตามหน่วยงาน — แบ่ง 4 สถานะเดียวกับ donut
 *  ผลรวมแต่ละสถานะ = ยอดใน pie (ไม่สร้างตัวเลขเกิน) */
const deptStatusHbarFrom = (accessRows, minCount = 8) => {
  const totals = { success: 0, expired: 0, denied: 0, pending: 0 };
  const realDepts = [];
  const seen = new Set();

  accessRows.forEach((r) => {
    const outcome = exportOutcomeOf(r);
    if (!outcome || !r.dept) return;
    totals[outcome] += 1;
    if (!seen.has(r.dept)) {
      seen.add(r.dept);
      realDepts.push(r.dept);
    }
  });

  const grand = totals.success + totals.expired + totals.denied + totals.pending;
  if (grand <= 0) return [];

  /* เลือกชื่อแผนกให้แสดง — ของจริงก่อน แล้วเติมจาก mock จนครบ minCount (ไม่เกินจำนวนคำขอ) */
  const deptLabels = [
    ...realDepts,
    ...EXPORT_DEPT_MOCK.filter((d) => !seen.has(d)),
  ].slice(0, Math.min(Math.max(minCount, realDepts.length), Math.max(1, grand)));

  const n = deptLabels.length;
  const weights = deptLabels.map((_, i) => 1.15 - (i * 0.06));
  const dist = {
    success: distributeTotal(totals.success, weights),
    expired: distributeTotal(totals.expired, weights),
    denied: distributeTotal(totals.denied, weights),
    pending: distributeTotal(totals.pending, weights),
  };

  return deptLabels
    .map((label, i) => {
      const segments = EXPORT_STATUS_SEGMENTS.map((s) => ({
        value: dist[s.key][i] || 0,
        color: s.color,
        label: s.label,
      }));
      const value = segments.reduce((a, s) => a + s.value, 0);
      return { label, value, segments };
    })
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);
};

/** แถบตามประเภท — แบ่งยินยอม / ไม่ยินยอม (เฉพาะผลตัดสินแล้ว · สัมพันธ์กับ donut) */
const typeHbarFrom = (records) => {
  const map = new Map();
  records.forEach((r) => {
    const consented = isConsentedOutcome(r);
    const declined = isRejectedOutcome(r);
    if (!consented && !declined) return;
    const cur = map.get(r.type) || { label: r.type, consented: 0, declined: 0 };
    if (consented) cur.consented += 1;
    else cur.declined += 1;
    map.set(r.type, cur);
  });
  return [...map.values()]
    .map((row) => ({
      label: row.label,
      value: row.consented + row.declined,
      segments: [
        { value: row.consented, color: HBAR_SEG_CONSENT, label: 'ยินยอม' },
        { value: row.declined, color: HBAR_SEG_DECLINE, label: 'ไม่ยินยอม' },
      ],
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);
};

/* ── แดชบอร์ด — สัดส่วนตามสถานะ (donut 5 สถานะ + แถบตามประเภท) ───────── */
const buildConsentStatusShareReport = (records) => {
  const segments = consentStatusSegmentsFrom(records);
  return {
    key: 'consent-status-share',
    title: 'สัดส่วนตามสถานะ',
    subtitle: 'นับจากรายการในเมนูจัดการความยินยอม ตามวันที่สร้างคำขอ',
    selectable: false,
    chart: 'donut',
    donutCenterMode: 'total',
    donutCenterSub: 'รายการ',
    chips: [],
    stats: [],
    donut: segments.map(({ label, value, tone }) => ({ label, value, tone })),
    hbar: consentTypeStatusBarsFrom(records),
    hbarTitle: 'จำนวนตามวัตถุการเปิดเผยข้อมูล',
    hbarValueLabel: 'รายการ',
    hbarLegend: CONSENT_STATUS_BUCKETS.map((b) => ({ label: b.label, color: b.color })),
    table: {
      columns: [
        { key: 'hn', header: 'HN', width: 120 },
        { key: 'type', header: 'ประเภท', width: 120, kind: 'badge' },
        { key: 'status', header: 'สถานะ', width: 180, kind: 'status' },
        { key: 'date', header: 'วันที่สร้าง', width: 170 },
      ],
      rows: records.map((r) => ({
        hn: r.hn,
        type: r.type,
        status: r.status,
        date: r.createdDate,
        _iso: toIso(r.createdDate),
      })),
    },
    pageSize: 40,
  };
};

/* ── รายงาน 16.1 — สถิติยินยอม / ไม่ยินยอม จาก worklist ─────────────── */
const buildConsentStatsReport = (records) => {
  const consentBars = monthHistogram(records, isConsentedOutcome);
  const rejectBars = monthHistogram(records, isRejectedOutcome);
  /* Donut = ผลรวมแท่งทั้งปี (สัมพันธ์กับกราฟแท่ง / hbar) */
  const consentTotal = consentBars.reduce((a, n) => a + n, 0);
  const rejectTotal = rejectBars.reduce((a, n) => a + n, 0);

  return {
    key: 'consent-stats',
    title: 'สัดส่วนการให้ความยินยอม / ไม่ให้ความยินยอม',
    subtitle: 'นับจากรายการในเมนูจัดการความยินยอม ตามวันที่สร้างคำขอ',
    selectable: true,
    chart: 'donut',
    chips: ['รายวัน', 'รายสัปดาห์', 'รายเดือน', 'รายปี', 'ปีงบประมาณ'],
    stats: [],
    /* Donut = ส่วนของผลลัพธ์ที่ตัดสินแล้วเท่านั้น (ไม่รวมรอดำเนินการ) */
    donut: [
      { label: 'ยินยอม', value: consentTotal, tone: 'positive' },
      { label: 'ปฏิเสธ / ถอน', value: rejectTotal, tone: 'danger' },
    ],
    bars: [
      { name: 'ยินยอม', tone: 'positive', base: consentBars },
      { name: 'ไม่ยินยอม', tone: 'danger', base: rejectBars },
    ],
    hbar: typeHbarFrom(records),
    hbarTitle: 'จำนวนตามวัตถุการเปิดเผยข้อมูล',
    hbarValueLabel: 'รายการ',
    hbarLegend: [
      { label: 'ยินยอม', color: HBAR_SEG_CONSENT },
      { label: 'ไม่ยินยอม', color: HBAR_SEG_DECLINE },
    ],
    table: {
      columns: [
        { key: 'hn', header: 'HN', width: 120 },
        { key: 'outcome', header: 'ผลลัพธ์การให้ความยินยอม', width: 220, kind: 'status' },
        { key: 'status', header: 'สถานะเอกสาร', width: 160, kind: 'status' },
        { key: 'date', header: 'วันที่สร้าง', width: 170 },
      ],
      /* เฉพาะผลตัดสินแล้ว — สอดคล้อง pie ให้ความยินยอม / ไม่ให้ความยินยอม */
      rows: records
        .filter((r) => isConsentedOutcome(r) || isRejectedOutcome(r))
        .map((r) => ({
          hn: r.hn,
          outcome: reportStatusOf(r),
          status: r.status,
          date: r.createdDate,
          _iso: toIso(r.createdDate),
        })),
    },
    pageSize: 40,
  };
};

/* ── รายงาน 16.3 — ส่งออกนอกหน่วยงาน (จากคำขอเข้าถึงที่อนุมัติแล้ว) ── */
const buildExportExternalReport = (accessRows) => {
  /* ใช้คำขอเข้าถึงที่อนุมัติ / หมดอายุ เป็น proxy ของการส่งออก-เข้าถึงจากนอก */
  const approved = accessRows.filter((r) => r.status === 'อนุมัติแล้ว');
  const expired = accessRows.filter((r) => r.status === 'หมดอายุ');
  const exported = [...approved, ...expired];
  const denied = accessRows.filter((r) => r.status === 'ปฏิเสธ');
  const pending = accessRows.filter((r) => r.status === 'รออนุมัติ');
  const byDept = deptStatusHbarFrom(accessRows, 10);

  const statusOfExport = (r) => {
    if (r.status === 'อนุมัติแล้ว') return 'สำเร็จ';
    if (r.status === 'ปฏิเสธ') return 'ถูกปฏิเสธ';
    if (r.status === 'รออนุมัติ') return 'รอตรวจสอบ';
    return 'หมดอายุ';
  };

  const donut = [
    { label: 'สำเร็จ', value: approved.length, tone: 'positive' },
    { label: 'หมดอายุ', value: expired.length, tone: 'info' },
    { label: 'ถูกปฏิเสธ', value: denied.length, tone: 'danger' },
    { label: 'รอตรวจสอบ', value: pending.length, tone: 'warning' },
  ].filter((s) => s.value > 0);

  return {
    key: 'export-external',
    title: 'รายงานการส่งออกข้อมูลนอกหน่วยงาน',
    subtitle: 'อิงคำขอสิทธิ์เข้าถึงจากเมนูจัดการสิทธิ์ — หน่วยงาน / วัตถุประสงค์ / สถานะ',
    chips: [],
    chart: 'donut',
    donutRateLabel: 'สำเร็จ',
    donutCenterSub: 'อัตราสำเร็จ',
    donutCenterExtraLabel: 'คำขอ',
    stats: [],
    donut,
    bars: [
      { name: 'สำเร็จ', tone: 'positive', base: monthHistogram(exported, () => true) },
      { name: 'ถูกปฏิเสธ', tone: 'danger', base: monthHistogram(denied, () => true) },
    ],
    hbar: byDept,
    hbarTitle: 'จำนวนตามหน่วยงาน',
    hbarValueLabel: 'ครั้ง',
    hbarLegend: EXPORT_STATUS_SEGMENTS.map((s) => ({ label: s.label, color: s.color })),
    table: {
      columns: [
        { key: 'actor', header: 'ผู้ดำเนินการ', width: 180 },
        { key: 'unit', header: 'แผนก', width: 160 },
        { key: 'dataType', header: 'ประเภทข้อมูล', width: 170, kind: 'badge' },
        { key: 'status', header: 'สถานะ', width: 130, kind: 'status' },
        { key: 'datetime', header: 'วันเวลา', width: 170 },
      ],
      rows: accessRows.map((r, i) => ({
        actor: r.name,
        unit: r.dept,
        dataType: DATA_TYPES[i % DATA_TYPES.length],
        status: statusOfExport(r),
        datetime: `${r.createdDate} ${r.createdTime || ''}`.trim(),
        _iso: toIso(r.createdDate),
      })),
    },
  };
};

/* สัดส่วนกลุ่มวิชาชีพ — สีคงที่ให้ pie กับแถบแผนกตรงกัน (PHCIS chart series) */
const PIE_FALLBACK_COLORS = PHCIS_CHART_PALETTE;
const ACCESS_ROLE_SEGMENTS = [
  { label: 'แพทย์', tone: 'info', color: PHCIS_CHART.indigo },
  { label: 'พยาบาล', tone: 'positive', color: PHCIS_CHART.teal },
  { label: 'เภสัชกร', tone: 'warning', color: PHCIS_CHART.yellow },
  { label: 'นักเทคนิคการแพทย์', tone: 'danger', color: PHCIS_CHART.pink },
];

/** แถบตามแผนก — แบ่งกลุ่มวิชาชีพเดียวกับ pie */
const deptRoleHbarFrom = (activeRows) => {
  const byDept = new Map();
  activeRows.forEach((r) => {
    if (!r.dept) return;
    const cur = byDept.get(r.dept) || {
      label: r.dept,
      counts: Object.fromEntries(ACCESS_ROLE_SEGMENTS.map((s) => [s.label, 0])),
    };
    cur.counts[r.group] = (cur.counts[r.group] || 0) + 1;
    byDept.set(r.dept, cur);
  });
  return [...byDept.values()]
    .map((row) => {
      const known = ACCESS_ROLE_SEGMENTS.map((s) => ({
        value: row.counts[s.label] || 0,
        color: s.color,
        label: s.label,
      }));
      const knownLabels = new Set(ACCESS_ROLE_SEGMENTS.map((s) => s.label));
      const extras = Object.entries(row.counts)
        .filter(([k, v]) => !knownLabels.has(k) && v > 0)
        .map(([label, value], i) => ({
          value,
          label,
          color: PIE_FALLBACK_COLORS[i % PIE_FALLBACK_COLORS.length],
        }));
      const segments = [...known, ...extras].filter((s) => s.value > 0);
      const value = segments.reduce((a, s) => a + s.value, 0);
      return { label: row.label, value, segments };
    })
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);
};

/* ── รายงาน 16.4 — ผู้มีสิทธิ์เข้าถึง (จาก ACCESS_RECORDS ที่อนุมัติ) ── */
const buildAccessRightsReport = (accessRows) => {
  const active = accessRows.filter((r) => r.status === 'อนุมัติแล้ว');
  const byDept = countBy(active, (r) => r.dept);
  const byRole = countBy(active, (r) => r.group);
  const roleToneOf = Object.fromEntries(ACCESS_ROLE_SEGMENTS.map((s) => [s.label, s.tone]));
  const donut = byRole.map((r, i) => ({
    label: r.label,
    value: r.value,
    tone: roleToneOf[r.label] || ['info', 'positive', 'warning', 'danger'][i % 4],
  })).filter((s) => s.value > 0);
  const hbar = deptRoleHbarFrom(active);
  const accessTimesSeed = (r, i) => Array.from({ length: 2 + (i % 3) }, (_, k) => ({
    datetime: `${r.createdDate} · ${String(8 + ((i + k) % 9)).padStart(2, '0')}:${String((i * 7 + k * 13) % 60).padStart(2, '0')}`,
    action: k % 3 === 2 ? 'EXPORT' : 'VIEW',
    target: `${r.formName || 'ข้อมูลความยินยอม'} · ${r.hn !== '-' ? r.hn : r.formCode}`,
  }));

  return {
    key: 'access-rights',
    title: 'รายงานผู้มีสิทธิ์เข้าถึงข้อมูลบุคคล',
    subtitle: 'จากสิทธิ์ที่อนุมัติแล้วในเมนูจัดการสิทธิ์การเข้าถึง',
    chips: [],
    chart: 'donut',
    donutTitle: 'สัดส่วนตามกลุ่มวิชาชีพ',
    donutCenterMode: 'total',
    donutCenterSub: 'ผู้มีสิทธิ์',
    donutCenterExtraLabel: 'คน',
    stats: [],
    donut,
    bars: [
      { name: 'ครั้งเข้าถึง', tone: 'info', base: byDept.slice(0, 5).map((d) => d.value * (3 + (d.value % 4))) },
    ],
    hbar,
    hbarTitle: 'จำนวนผู้มีสิทธิ์ตามแผนก',
    hbarValueLabel: 'คน',
    hbarLegend: ACCESS_ROLE_SEGMENTS.map((s) => ({ label: s.label, color: s.color })),
    table: {
      columns: [
        { key: 'user', header: 'ชื่อผู้ใช้', width: 200 },
        { key: 'role', header: 'กลุ่ม', width: 150, kind: 'badge' },
        { key: 'dept', header: 'แผนก', width: 170 },
        { key: 'lastAccess', header: 'วันเวลาเข้าถึงล่าสุด', width: 190 },
      ],
      rows: active.map((r, i) => ({
        user: r.name,
        role: r.group,
        dept: r.dept,
        lastAccess: `${r.createdDate} · ${r.createdTime || '09:00'}`,
        _iso: toIso(r.createdDate),
        accessTimes: accessTimesSeed(r, i),
      })),
    },
  };
};

/* ── รายงานเสริม — สถานะแบบฟอร์ม (จากเมนูแบบฟอร์ม) ─────────────────── */
const FORM_STATUS_TONE = {
  'เผยแพร่': 'positive',
  'รอตรวจสอบ': 'info',
  'ไม่เผยแพร่': 'danger',
  'ร่าง': 'warning',
};

const FORM_STATUS_SEGMENTS = [
  { label: 'เผยแพร่', color: PHCIS_CHART.teal },
  { label: 'รอตรวจสอบ', color: PHCIS_CHART.indigo },
  { label: 'ร่าง', color: PHCIS_CHART.yellow },
  { label: 'ไม่เผยแพร่', color: PHCIS_CHART.pink },
];

/** แถบตามประเภท — แบ่งสถานะเดียวกับ pie */
const typeStatusHbarFrom = (forms) => {
  const map = new Map();
  forms.forEach((r) => {
    if (!r.type) return;
    const cur = map.get(r.type) || {
      label: r.type,
      counts: Object.fromEntries(FORM_STATUS_SEGMENTS.map((s) => [s.label, 0])),
    };
    cur.counts[r.status] = (cur.counts[r.status] || 0) + 1;
    map.set(r.type, cur);
  });
  return [...map.values()]
    .map((row) => {
      const known = FORM_STATUS_SEGMENTS.map((s) => ({
        value: row.counts[s.label] || 0,
        color: s.color,
        label: s.label,
      }));
      const knownLabels = new Set(FORM_STATUS_SEGMENTS.map((s) => s.label));
      const extras = Object.entries(row.counts)
        .filter(([k, v]) => !knownLabels.has(k) && v > 0)
        .map(([label, value], i) => ({
          value,
          label,
          color: PIE_FALLBACK_COLORS[i % PIE_FALLBACK_COLORS.length],
        }));
      const segments = [...known, ...extras].filter((s) => s.value > 0);
      const value = segments.reduce((a, s) => a + s.value, 0);
      return { label: row.label, value, segments };
    })
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);
};

const buildFormRegistryReport = (forms) => {
  const byStatus = countBy(forms, (r) => r.status);
  const donut = byStatus.map((s) => ({
    label: s.label,
    value: s.value,
    tone: FORM_STATUS_TONE[s.label] || 'info',
  })).filter((s) => s.value > 0);

  return {
    key: 'form-registry',
    title: 'สถานะแบบฟอร์มความยินยอม',
    subtitle: 'สรุปจากเมนูแบบฟอร์มความยินยอม — เผยแพร่ / รอตรวจ / ร่าง',
    chips: [],
    chart: 'donut',
    donutRateLabel: 'เผยแพร่',
    donutCenterSub: 'อัตราเผยแพร่',
    donutCenterExtraLabel: 'ฉบับ',
    stats: [],
    donut,
    hbar: typeStatusHbarFrom(forms),
    hbarTitle: 'จำนวนแบบฟอร์มตามประเภท',
    hbarValueLabel: 'ฉบับ',
    hbarLegend: FORM_STATUS_SEGMENTS.map((s) => ({ label: s.label, color: s.color })),
    table: {
      columns: [
        { key: 'name', header: 'ชื่อแบบฟอร์ม', width: 280 },
        { key: 'type', header: 'ประเภท', width: 140, kind: 'badge' },
        { key: 'status', header: 'สถานะ', width: 130, kind: 'status' },
        { key: 'dept', header: 'แผนก', width: 160 },
      ],
      rows: forms.slice(0, 60).map((r) => ({
        name: r.name,
        type: r.type,
        status: r.status,
        dept: r.dept,
        _iso: toIso(r.updatedDate || r.createdDate),
      })),
    },
  };
};

export const buildConsentReports = ({
  records = CONSENT_RECORDS,
  access = ACCESS_RECORDS,
  forms = CONSENT_FORM_RECORDS,
} = {}) => ([
  buildConsentStatusShareReport(records),
  buildConsentStatsReport(records),
  buildExportExternalReport(access),
  buildAccessRightsReport(access),
  buildFormRegistryReport(forms),
]);

export const CONSENT_REPORTS = buildConsentReports();

/** รายงานบนแดชบอร์ด — ไม่รวม access-log (ย้ายไป /audit/pii-access) */
export const CONSENT_DASHBOARD_REPORTS = CONSENT_REPORTS.filter(
  (r) => r.key !== 'access-log',
);

export default CONSENT_REPORTS;
