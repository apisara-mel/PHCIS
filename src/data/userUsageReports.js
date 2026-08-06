/* TOR §1.17.4.3 — รายงานยอดผู้ใช้งานระบบ (realtime + ประวัติ) + export XLS/PDF.

   โครงเงื่อนไขรายงานยึดตามคู่มือระบบสารสนเทศส่วนกลาง (MIS/EIS) หน้า 1-4:
   ขอบเขต "ทุกศูนย์บริการสาธารณสุข / ศูนย์บริการสาธารณสุข: [ศูนย์]" คู่กับ
   ช่วงเวลา "เดือน/พ.ศ." หรือ "ตั้งแต่วันที่–ถึงวันที่" และหัวเอกสารของไฟล์ที่
   ส่งออกต้องมี ชื่อรายงาน · ขอบเขตศูนย์ · ช่วงเวลา · ผู้ออกรายงาน · วันเวลา.

   Export ทำฝั่ง client ล้วน — XLS ใช้ SpreadsheetML/CSV blob, PDF ใช้
   print stylesheet (window.print) — ไม่เพิ่ม dependency ใหม่ (xlsx/jspdf)
   เพราะ build ต้องผ่านด้วย npm ci บนเครื่องที่ไม่มีเน็ตภายนอก. */

import { USERS, getRole, getDepartment } from '@/data/usersAccess';
import { FUNCTION_USAGE, PEAK_HOURS } from '@/pages/audit/auditData';
import { sanitizeExportColumns } from '@/utils/exportPiiSanitize';

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
export const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/* ยอดผู้ใช้งานรายเดือน (ก.ย. 2568 – ส.ค. 2569) แยกตามศูนย์ */
const MONTHLY_BY_CENTER = {
  'hc-4':  [88, 92, 95, 90, 101, 106, 110, 108, 115, 121, 118, 126],
  'hc-25': [42, 40, 45, 44, 47, 51, 53, 50, 55, 58, 56, 61],
  'hc-15': [21, 22, 20, 24, 25, 23, 27, 29, 28, 31, 30, 33],
  'hc-3':  [16, 15, 18, 17, 19, 21, 20, 22, 24, 23, 25, 27],
};

export const MONTH_LABELS = [
  'ก.ย.68', 'ต.ค.68', 'พ.ย.68', 'ธ.ค.68', 'ม.ค.69', 'ก.พ.69',
  'มี.ค.69', 'เม.ย.69', 'พ.ค.69', 'มิ.ย.69', 'ก.ค.69', 'ส.ค.69',
];

/** ศูนย์ที่มีข้อมูลรายงานอยู่จริง (ศูนย์อื่นใน 69 ศูนย์ = ยังไม่เปิดใช้ระบบ). */
export const REPORT_CENTERS = Object.keys(MONTHLY_BY_CENTER);

/* ช่วงชั่วโมงการใช้งาน — ต่อยอด PEAK_HOURS ของ /audit ให้ละเอียดขึ้น */
export const HOURLY_USAGE = [
  { label: '07:00–08:00', value: 24,  tag: 'ต่ำ' },
  { label: '08:00–10:00', value: 148, tag: 'สูง' },
  { label: '10:00–12:00', value: 196, tag: 'สูงสุด' },
  { label: '12:00–13:00', value: 41,  tag: 'ต่ำ' },
  { label: '13:00–15:00', value: 132, tag: 'ปานกลาง' },
  { label: '15:00–17:00', value: 118, tag: 'ปานกลาง' },
  { label: '17:00–20:00', value: 52,  tag: 'ต่ำ' },
];

/** ค่าอ้างอิงจาก /audit (คงไว้ให้เทียบกันได้ — อ่านอย่างเดียว). */
export const AUDIT_PEAK_HOURS = PEAK_HOURS;

/* การใช้งานรายฟังก์ชัน — ต่อยอด FUNCTION_USAGE เดิม + สัดส่วนต่อศูนย์ */
const CENTER_WEIGHT = { 'hc-4': 1, 'hc-25': 0.46, 'hc-15': 0.24, 'hc-3': 0.2 };

export function functionUsageFor(centerValue) {
  const w = centerValue === 'all' ? 1.9 : (CENTER_WEIGHT[centerValue] ?? 0);
  return FUNCTION_USAGE.map((f) => ({ label: f.label, value: Math.round(f.value * w) }));
}

/* การใช้งานของเจ้าหน้าที่รายบุคคล — ผูกกับ USERS จริงเพื่อให้คลิกไป /users/:id ได้ */
const SESSION_SEED = [
  { sessions: 182, minutes: 5470, last: '3 ส.ค. 2569 09:42' },
  { sessions: 121, minutes: 3210, last: '3 ส.ค. 2569 08:11' },
  { sessions: 96,  minutes: 2740, last: '2 ส.ค. 2569 16:30' },
  { sessions: 210, minutes: 7180, last: '3 ส.ค. 2569 09:50' },
  { sessions: 164, minutes: 4980, last: '3 ส.ค. 2569 07:20' },
  { sessions: 12,  minutes: 260,  last: '22 เม.ย. 2569 11:00' },
  { sessions: 174, minutes: 5320, last: '3 ส.ค. 2569 08:55' },
  { sessions: 158, minutes: 4610, last: '3 ส.ค. 2569 09:05' },
  { sessions: 201, minutes: 6120, last: '3 ส.ค. 2569 09:38' },
  { sessions: 88,  minutes: 2110, last: '2 ส.ค. 2569 18:00' },
  { sessions: 143, minutes: 4020, last: '3 ส.ค. 2569 09:12' },
  { sessions: 233, minutes: 8340, last: '3 ส.ค. 2569 09:55' },
];

export function buildUserUsageRows() {
  return USERS.map((u, i) => {
    const seed = SESSION_SEED[i % SESSION_SEED.length];
    const sessions = u.status === 'active' ? seed.sessions : Math.round(seed.sessions * 0.1);
    const minutes = u.status === 'active' ? seed.minutes : Math.round(seed.minutes * 0.1);
    return {
      id: u.id,
      name: u.name,
      roleLabel: getRole(u.role)?.label || u.role,
      deptLabel: (u.departments || []).map((d) => getDepartment(d)?.label || d).join(', ') || '—',
      center: u.homeCenter,
      centers: u.centers || [],
      status: u.status,
      sessions,
      minutes,
      avgMinutes: sessions ? Math.round(minutes / sessions) : 0,
      lastActive: seed.last,
      inactiveDays: u.status === 'active' ? 0 : 103,
    };
  });
}

/** ผู้ใช้ที่ออนไลน์อยู่ตอนนี้ (mock — สุ่มคงที่ตามจำนวน active). */
export function onlineNowCount(rows) {
  return Math.max(1, Math.round(rows.filter((r) => r.status === 'active').length * 0.42));
}

/* ── report builder ───────────────────────────────────────────────────── */

const inScope = (row, scope, centerValue) =>
  scope === 'all' ? true : (row.center === centerValue || (row.centers || []).includes(centerValue));

/**
 * รวมตัวเลขตามเงื่อนไขที่เลือก.
 * @param {{scope:'all'|'center', center:string, monthIndex:number|null}} q
 */
export function buildUsageReport(q) {
  const rows = buildUserUsageRows().filter((r) => inScope(r, q.scope, q.center));
  const monthly = q.scope === 'all'
    ? MONTH_LABELS.map((_, i) => REPORT_CENTERS.reduce((sum, c) => sum + MONTHLY_BY_CENTER[c][i], 0))
    : (MONTHLY_BY_CENTER[q.center] || MONTH_LABELS.map(() => 0));

  const total = rows.length;
  const active = rows.filter((r) => r.status === 'active').length;
  const dormant = rows.filter((r) => r.inactiveDays > 90).length;
  const newThisMonth = Math.max(0, monthly[monthly.length - 1] - monthly[monthly.length - 2]);
  const totalMinutes = rows.reduce((s, r) => s + r.minutes, 0);
  const totalSessions = rows.reduce((s, r) => s + r.sessions, 0);

  return {
    rows,
    monthly,
    hasData: total > 0 && monthly.some((v) => v > 0),
    summary: {
      total,
      active,
      dormant,
      newThisMonth,
      totalMinutes,
      totalSessions,
      avgSessionMinutes: totalSessions ? Math.round(totalMinutes / totalSessions) : 0,
      avgPerUserMinutes: total ? Math.round(totalMinutes / total) : 0,
      onlineNow: onlineNowCount(rows),
    },
    functions: functionUsageFor(q.scope === 'all' ? 'all' : q.center),
    hourly: HOURLY_USAGE,
  };
}

/* ── export helpers (client-side only) ────────────────────────────────── */

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * ส่งออกเป็นไฟล์ตาราง (.xls ที่ Excel เปิดได้ — CSV + BOM UTF-8).
 * หัวเอกสารมี ชื่อรายงาน · ขอบเขต · ช่วงเวลา · ผู้ออก · วันเวลา ตามคู่มือ MIS.
 */
export function exportSpreadsheet({ title, meta = [], columns, rows, filename }) {
  const exportColumns = sanitizeExportColumns(columns);
  const lines = [];
  lines.push(csvCell(title));
  meta.forEach(([k, v]) => lines.push(`${csvCell(k)},${csvCell(v)}`));
  lines.push('');
  lines.push(exportColumns.map((c) => csvCell(c.label)).join(','));
  rows.forEach((r) => lines.push(exportColumns.map((c) => csvCell(c.value(r))).join(',')));

  const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'phcis-report.xls';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** เปิดหน้าต่างพิมพ์ของเบราว์เซอร์ (ผู้ใช้เลือก "บันทึกเป็น PDF"). */
export function printReport(printAreaId = 'mih-report-print-area') {
  const el = document.getElementById(printAreaId);
  if (el) el.setAttribute('data-print-target', 'true');
  window.print();
  return true;
}

/** ตัวเลขนาที → "X ชม. Y นาที" */
export const formatMinutes = (m) => {
  const n = Math.max(0, Math.round(m || 0));
  const h = Math.floor(n / 60);
  const min = n % 60;
  if (!h) return `${min} นาที`;
  return `${h} ชม. ${min} นาที`;
};
