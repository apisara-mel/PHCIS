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
import { CONSENT_RECORDS, CONSENT_STATUS } from '@/data/consentRecords';
import { ACCESS_RECORDS } from '@/data/accessRecords';
import { CONSENT_FORM_RECORDS } from '@/data/consentFormRecords';

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

/* เดือนปฏิทิน (0–11) จาก createdDate — ใช้ทำแนวโน้ม VBars */
const monthHistogram = (rows, predicate = () => true) => {
  const buckets = Array.from({ length: 12 }, () => 0);
  rows.forEach((r) => {
    if (!predicate(r)) return;
    const d = parseThaiBuddhistDate(r.createdDate);
    if (!d) return;
    buckets[d.getMonth()] += 1;
  });
  /* ถ้าเดือนไหนเป็น 0 ทั้งปี → ใส่ค่าเล็กน้อยเพื่อให้กราฟไม่ว่าง (mock) */
  const hasAny = buckets.some((n) => n > 0);
  if (!hasAny) return buckets.map((_, i) => (i % 3 === 0 ? 2 : 1));
  return buckets.map((n) => Math.max(n, 0));
};

const tabOf = (r) => (CONSENT_STATUS[r.status] || {}).tab;

const isConsentedOutcome = (r) => ['consented', 'expiring', 'expired'].includes(tabOf(r));
const isRejectedOutcome = (r) => tabOf(r) === 'rejected';

/** สถานะรายงานรายบุคคล — ย่อจากสถานะ worklist ให้สแกนง่าย */
const reportStatusOf = (r) => {
  if (isConsentedOutcome(r)) return 'ยินยอม';
  if (isRejectedOutcome(r)) return 'ไม่ยินยอม';
  return 'รอดำเนินการ';
};

const DATA_TYPES = ['ประวัติการรักษา', 'ผลตรวจ Lab', 'ภาพรังสี', 'ใบสั่งยา', 'ข้อมูลสิทธิ'];

const HBAR_SEG_CONSENT = 'var(--text-colorfulbadge-green, #007549)';
const HBAR_SEG_DECLINE = 'var(--text-colorfulbadge-red, #B91C1C)';

/** แถบตามประเภท — แบ่งยินยอม / ไม่ยินยอม ในเส้นเดียวกัน */
const typeHbarFrom = (records) => {
  const map = new Map();
  records.forEach((r) => {
    const cur = map.get(r.type) || { label: r.type, value: 0, consented: 0, declined: 0 };
    cur.value += 1;
    if (isConsentedOutcome(r)) cur.consented += 1;
    else cur.declined += 1;
    map.set(r.type, cur);
  });
  return [...map.values()]
    .map((row) => ({
      label: row.label,
      value: row.value,
      segments: [
        { value: row.consented, color: HBAR_SEG_CONSENT, label: 'ยินยอม' },
        { value: row.declined, color: HBAR_SEG_DECLINE, label: 'ไม่ยินยอม' },
      ],
    }))
    .sort((a, b) => b.value - a.value);
};

/* ── รายงาน 16.1 — สถิติยินยอม / ไม่ยินยอม จาก worklist ─────────────── */
const buildConsentStatsReport = (records) => {
  const consented = records.filter(isConsentedOutcome);
  const rejected = records.filter(isRejectedOutcome);
  const consentBars = monthHistogram(records, isConsentedOutcome);
  const rejectBars = monthHistogram(records, isRejectedOutcome);

  return {
    key: 'consent-stats',
    title: 'สัดส่วนการให้ความยินยอม / ไม่ให้ความยินยอม',
    subtitle: 'นับจากรายการในเมนูจัดการความยินยอม ตามวันที่สร้างคำขอ',
    selectable: true,
    chart: 'donut',
    chips: ['รายวัน', 'รายสัปดาห์', 'รายเดือน', 'รายปี'],
    stats: [],
    /* Donut = ส่วนของผลลัพธ์ที่ตัดสินแล้วเท่านั้น (ไม่รวมรอดำเนินการ) */
    donut: [
      { label: 'ยินยอม', value: consented.length, tone: 'positive' },
      { label: 'ปฏิเสธ / ถอน', value: rejected.length, tone: 'danger' },
    ].filter((s) => s.value > 0),
    bars: [
      { name: 'ยินยอม', tone: 'positive', base: consentBars },
      { name: 'ไม่ยินยอม', tone: 'danger', base: rejectBars },
    ],
    hbar: typeHbarFrom(records),
    hbarTitle: 'จำนวนตามประเภท Consent',
    hbarValueLabel: 'รายการ',
    hbarLegend: [
      { label: 'ยินยอม', color: HBAR_SEG_CONSENT },
      { label: 'ไม่ยินยอม', color: HBAR_SEG_DECLINE },
    ],
    table: {
      columns: [
        { key: 'patient', header: 'ชื่อ-สกุล', width: 200 },
        { key: 'hn', header: 'HN', width: 120 },
        { key: 'type', header: 'ประเภท Consent', width: 160, kind: 'badge' },
        { key: 'status', header: 'สถานะ', width: 130, kind: 'status' },
        { key: 'date', header: 'วันที่สร้าง', width: 170 },
      ],
      rows: records.map((r) => ({
        patient: r.name,
        hn: r.hn,
        type: r.type,
        status: reportStatusOf(r),
        date: r.createdDate,
        _iso: toIso(r.createdDate),
      })),
    },
  };
};

/* ── รายงาน 16.2 — รายบุคคล ─────────────────────────────────────────── */
const buildPersonalConsentReport = (records) => {
  const uniqueHn = new Set(records.map((r) => r.hn)).size;
  const consented = records.filter(isConsentedOutcome).length;
  const rejected = records.filter(isRejectedOutcome).length;
  const byType = countBy(records, (r) => r.type);

  return {
    key: 'personal-consent',
    title: 'รายงานความยินยอมรายบุคคล',
    subtitle: 'ผู้รับบริการแต่ละคนให้ / ไม่ให้ความยินยอมเรื่องใดบ้าง — จาก worklist',
    chips: ['ชื่อ / HN', 'ประเภท Consent', 'สถานะ', 'ช่วงเวลา'],
    chart: 'hbar',
    stats: [
      { icon: 'groups', tone: 'info', value: fmt(uniqueHn), label: 'ผู้รับบริการ' },
      { icon: 'check_circle', tone: 'positive', value: fmt(consented), label: 'รายการยินยอม' },
      { icon: 'cancel', tone: 'danger', value: fmt(rejected), label: 'รายการไม่ยินยอม' },
    ],
    bars: [
      { name: 'ยินยอม', tone: 'positive', base: monthHistogram(records, isConsentedOutcome) },
      { name: 'ไม่ยินยอม', tone: 'danger', base: monthHistogram(records, isRejectedOutcome) },
    ],
    hbar: byType,
    hbarTitle: 'จำนวนรายการตามประเภท',
    hbarValueLabel: 'รายการ',
    table: {
      columns: [
        { key: 'patient', header: 'ชื่อ / HN', width: 220 },
        { key: 'type', header: 'ประเภท Consent', width: 160, kind: 'badge' },
        { key: 'status', header: 'สถานะ', width: 130, kind: 'status' },
        { key: 'period', header: 'วันที่สร้าง', width: 170 },
      ],
      rows: records.map((r) => ({
        patient: `${r.name} · ${r.hn}`,
        name: r.name,
        hn: r.hn,
        type: r.type,
        status: reportStatusOf(r),
        period: r.createdDate,
        _iso: toIso(r.createdDate),
      })),
    },
  };
};

/* ── รายงาน 16.3 — ส่งออกนอกหน่วยงาน (จากคำขอเข้าถึงที่อนุมัติแล้ว) ── */
const buildExportExternalReport = (accessRows) => {
  /* ใช้คำขอเข้าถึงที่อนุมัติ / หมดอายุ เป็น proxy ของการส่งออก-เข้าถึงจากนอก */
  const exported = accessRows.filter((r) => r.status === 'อนุมัติแล้ว' || r.status === 'หมดอายุ');
  const denied = accessRows.filter((r) => r.status === 'ปฏิเสธ');
  const pending = accessRows.filter((r) => r.status === 'รออนุมัติ');
  const units = new Set(exported.map((r) => r.dept));
  const byPurpose = countBy(exported, (r) => r.purpose);

  const statusOfExport = (r) => {
    if (r.status === 'อนุมัติแล้ว') return 'สำเร็จ';
    if (r.status === 'ปฏิเสธ') return 'ถูกปฏิเสธ';
    if (r.status === 'รออนุมัติ') return 'รอตรวจสอบ';
    return 'หมดอายุ';
  };

  return {
    key: 'export-external',
    title: 'รายงานการส่งออกข้อมูลนอกหน่วยงาน',
    subtitle: 'อิงคำขอสิทธิ์เข้าถึงจากเมนูจัดการสิทธิ์ — หน่วยงาน / วัตถุประสงค์ / สถานะ',
    chips: ['หน่วยงาน', 'ช่วงเวลา', 'สถานะ', 'ประเภทข้อมูล'],
    chart: 'hbar',
    stats: [
      { icon: 'ios_share', tone: 'danger', value: fmt(exported.length), label: 'ครั้งส่งออก / เข้าถึง' },
      { icon: 'cancel', tone: 'danger', value: fmt(denied.length), label: 'ถูกปฏิเสธ' },
      { icon: 'schedule', tone: 'info', value: fmt(pending.length), label: 'รอตรวจสอบ' },
      { icon: 'groups', tone: 'info', value: fmt(units.size), label: 'แผนกที่เกี่ยวข้อง' },
    ],
    bars: [
      { name: 'สำเร็จ', tone: 'positive', base: [exported.length, Math.max(1, Math.round(exported.length * 0.9)), Math.max(1, Math.round(exported.length * 1.1)), exported.length, Math.max(1, Math.round(exported.length * 0.85))] },
      { name: 'ถูกปฏิเสธ', tone: 'danger', base: [denied.length, Math.max(0, denied.length - 1), denied.length, Math.max(1, denied.length - 2), denied.length] },
    ],
    hbar: byPurpose.slice(0, 8),
    hbarTitle: 'วัตถุประสงค์การเข้าถึง (ที่อนุมัติแล้ว)',
    hbarValueLabel: 'ครั้ง',
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

/* ── รายงาน 16.4 — ผู้มีสิทธิ์เข้าถึง (จาก ACCESS_RECORDS ที่อนุมัติ) ── */
const buildAccessRightsReport = (accessRows) => {
  const active = accessRows.filter((r) => r.status === 'อนุมัติแล้ว');
  const byDept = countBy(active, (r) => r.dept);
  const byRole = countBy(active, (r) => r.group);
  const accessTimesSeed = (r, i) => Array.from({ length: 2 + (i % 3) }, (_, k) => ({
    datetime: `${r.createdDate} · ${String(8 + ((i + k) % 9)).padStart(2, '0')}:${String((i * 7 + k * 13) % 60).padStart(2, '0')}`,
    action: k % 3 === 2 ? 'EXPORT' : 'VIEW',
    target: `${r.formName || 'ข้อมูลความยินยอม'} · ${r.hn !== '-' ? r.hn : r.formCode}`,
  }));

  return {
    key: 'access-rights',
    title: 'รายงานผู้มีสิทธิ์เข้าถึงข้อมูลบุคคล',
    subtitle: 'จากสิทธิ์ที่อนุมัติแล้วในเมนูจัดการสิทธิ์การเข้าถึง',
    chips: ['ชื่อผู้ใช้', 'บทบาท', 'วันเวลา', 'แผนก'],
    chart: 'hbar',
    stats: [
      { icon: 'groups', tone: 'info', value: fmt(active.length), label: 'ผู้มีสิทธิ์ (Active)' },
      { icon: 'apartment', tone: 'info', value: fmt(byDept.length), label: 'แผนก' },
      { icon: 'work', tone: 'positive', value: fmt(byRole.length), label: 'กลุ่มวิชาชีพ' },
    ],
    bars: [
      { name: 'ครั้งเข้าถึง', tone: 'info', base: byDept.slice(0, 5).map((d) => d.value * (3 + (d.value % 4))) },
    ],
    hbar: byDept,
    hbarTitle: 'จำนวนผู้มีสิทธิ์ตามแผนก',
    hbarValueLabel: 'คน',
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
const buildFormRegistryReport = (forms) => {
  const byStatus = countBy(forms, (r) => r.status);
  const byType = countBy(forms, (r) => r.type);
  const published = forms.filter((r) => r.status === 'เผยแพร่').length;

  return {
    key: 'form-registry',
    title: 'สถานะแบบฟอร์มความยินยอม',
    subtitle: 'สรุปจากเมนูแบบฟอร์มความยินยอม — เผยแพร่ / รอตรวจ / ร่าง',
    chips: ['สถานะ', 'ประเภท', 'แผนก'],
    chart: 'hbar',
    stats: [
      { icon: 'assignment', tone: 'info', value: fmt(forms.length), label: 'แบบฟอร์มทั้งหมด' },
      { icon: 'check_circle', tone: 'positive', value: fmt(published), label: 'เผยแพร่แล้ว' },
      { icon: 'category', tone: 'info', value: fmt(byType.length), label: 'ประเภท' },
    ],
    hbar: byStatus,
    hbarTitle: 'จำนวนแบบฟอร์มตามสถานะ',
    hbarValueLabel: 'ฉบับ',
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
  buildConsentStatsReport(records),
  buildPersonalConsentReport(records),
  buildExportExternalReport(access),
  buildAccessRightsReport(access),
  buildFormRegistryReport(forms),
]);

export const CONSENT_REPORTS = buildConsentReports();

/** รายงานบนแดชบอร์ด — ไม่รวม access-log (ย้ายไป /audit/pii-access) */
export const CONSENT_DASHBOARD_REPORTS = CONSENT_REPORTS.filter((r) => r.key !== 'access-log');

export default CONSENT_REPORTS;
