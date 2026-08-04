/* งานบำบัดสารเสพติด (TOR §1.10.5) — การพิมพ์เอกสาร.

   Same mechanism the appointment module uses (`appointmentShared.js`):
   open a blank window, write a self-contained A4 document, let
   `window.onload` fire `window.print()`. No PDF engine in this wave —
   printing goes through the browser dialog. Colors here are literal hex
   because the printed document is a NEW document object: it never loads
   the app stylesheet, so `var(--…)` would resolve to nothing. Each
   literal mirrors the token it stands for (brand-p700 #007549,
   text-content-default #363B3F, text-content-tertiary #858C92,
   border-neutral-tertiary #E2E4E6, surface-brandPrimary-quaternary
   #F4FBF8). */

import { formatAddictionDate, formatAddictionDateTime } from '@/data/addictionVisits';

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const DOC_CSS = `
  body{font-family:Sarabun,sans-serif;padding:32px;color:#363B3F}
  h1{font-size:20px;color:#007549;margin:0 0 4px}
  h2{font-size:14px;color:#007549;margin:24px 0 8px}
  .meta{color:#858C92;font-size:12px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin-bottom:8px}
  th,td{padding:6px 8px;border-bottom:1px solid #E2E4E6;font-size:12px;text-align:left;vertical-align:top}
  th{background:#F4FBF8;color:#007549;font-weight:700}
  .kv td:first-child{width:180px;color:#858C92}
  .empty{font-size:12px;color:#858C92;padding:8px 0}
  .foot{margin-top:24px;font-size:11px;color:#858C92}
  @media print{body{padding:0}}
`;

const openPrintDoc = (title, bodyHtml) => {
  if (typeof window === 'undefined') return;
  const html = `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"/><title>${esc(title)}</title>
<style>${DOC_CSS}</style></head><body>${bodyHtml}
<div class="foot">พิมพ์จากระบบ PHCIS · งานบำบัดสารเสพติด · สำนักอนามัย กรุงเทพมหานคร — ${esc(formatAddictionDateTime())}</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
  const w = window.open('', '_blank', 'noopener,noreferrer,width=920,height=1000');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
};

const tableHtml = (headers, rows, emptyText) => {
  if (!rows.length) return `<div class="empty">${esc(emptyText)}</div>`;
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const body = rows
    .map((cells) => `<tr>${cells.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
};

/** พิมพ์ทะเบียนผู้ติดสารเสพติดตามตัวกรองปัจจุบัน (1.10.5.6). */
export const printAddictionRegistry = (rows, filterSummary) => {
  const body = `
    <h1>ทะเบียนผู้ติดสารเสพติด</h1>
    <div class="meta">เงื่อนไขที่พิมพ์: ${esc(filterSummary || 'ทั้งหมด')} · จำนวน ${rows.length} รายการ</div>
    ${tableHtml(
    ['HN', 'ชื่อ-สกุล', 'อายุ/เพศ', 'สารเสพติดหลัก', 'โปรแกรม', 'ASSIST', 'ความรุนแรง', 'วันลงทะเบียน', 'ผู้บำบัด', 'สถานะ'],
    rows.map((r) => [
      r.hn, r.name, `${r.age ?? '—'} ปี / ${r.gender || '—'}`,
      r.mainSubstance || '—', r.programLabel || '—',
      `${r.screeningScore ?? '—'} คะแนน`, r.severityLabel || '—',
      formatAddictionDate(r.registeredDate), r.therapist || '—', r.statusLabel || '—',
    ]),
    'ไม่มีรายการที่ตรงกับเงื่อนไขที่เลือก',
  )}`;
  openPrintDoc('ทะเบียนผู้ติดสารเสพติด', body);
};

/** พิมพ์ใบสรุปการติดตามรายบุคคลตามช่วงเวลา (1.10.5.8). */
export const printAddictionFollowUpSummary = ({
  patientName, hn, registry, range, followUps, meds, labs, xrays,
}) => {
  const body = `
    <h1>ใบสรุปการติดตามการดูแลผู้ติดสารเสพติด</h1>
    <div class="meta">ช่วงเวลา ${esc(formatAddictionDate(range.from))} – ${esc(formatAddictionDate(range.to))}</div>
    <table class="kv"><tbody>
      <tr><td>ผู้รับบริการ</td><td>${esc(patientName || '—')} (HN ${esc(hn || '—')})</td></tr>
      <tr><td>โปรแกรมบำบัด</td><td>${esc(registry?.programLabel || '—')}</td></tr>
      <tr><td>สถานะทะเบียน</td><td>${esc(registry?.statusLabel || 'ยังไม่มีทะเบียน')}</td></tr>
      <tr><td>ผู้บำบัด</td><td>${esc(registry?.therapist || '—')}</td></tr>
    </tbody></table>

    <h2>ผลการติดตาม</h2>
    ${tableHtml(['ครั้งที่', 'วันที่', 'วิธีติดตาม', 'ผลการติดตาม', 'ผู้ติดตาม', 'บันทึก'],
    followUps.map((r) => [r.no, formatAddictionDate(r.date), r.methodLabel, r.resultLabel, r.by, r.note || '—']),
    'ไม่มีรายการติดตามในช่วงเวลาที่เลือก')}

    <h2>ยาที่ได้รับ</h2>
    ${tableHtml(['วันที่', 'รายการยา', 'วิธีใช้', 'จำนวน'],
    meds.map((r) => [formatAddictionDate(r.date), r.item, r.dose, r.qty]),
    'ไม่มีรายการยาในช่วงเวลาที่เลือก')}

    <h2>ผลตรวจทางห้องปฏิบัติการ</h2>
    ${tableHtml(['วันที่', 'รายการตรวจ', 'ผล', 'สถานะ'],
    labs.map((r) => [formatAddictionDate(r.date), r.test, r.result, r.abnormal ? 'ผิดปกติ' : 'ปกติ']),
    'ไม่มีผล Lab ในช่วงเวลาที่เลือก')}

    <h2>ผลเอกซเรย์</h2>
    ${tableHtml(['วันที่', 'รายการตรวจ', 'ผล'],
    xrays.map((r) => [formatAddictionDate(r.date), r.exam, r.result]),
    'ไม่มีผล X-ray ในช่วงเวลาที่เลือก')}
  `;
  openPrintDoc(`ใบสรุปการติดตาม ${patientName || ''}`.trim(), body);
};

/** พิมพ์รายชื่อ CBTx / HR แยกตามชุมชน-เขต (1.10.5.9). */
export const printCommunityRegistry = (rows, filterSummary) => {
  const groups = rows.reduce((acc, r) => {
    const key = `${r.district || 'ไม่ระบุเขต'} · ${r.community || 'ไม่ระบุชุมชน'}`;
    (acc[key] = acc[key] || []).push(r);
    return acc;
  }, {});
  const sections = Object.keys(groups).sort().map((key) => `
    <h2>${esc(key)} (${groups[key].length} ราย)</h2>
    ${tableHtml(['HN', 'ชื่อผู้รับบริการ', 'ประเภทการดูแล', 'ผู้รับผิดชอบ', 'สถานะ', 'ตำแหน่งบ้าน'],
    groups[key].map((r) => [
      r.hn, r.patientName, r.careTypeLabel, r.responsible, r.statusLabel,
      r.houseLocation?.pinSaved
        ? `${r.houseLocation.lat.toFixed(4)}, ${r.houseLocation.lng.toFixed(4)}`
        : 'รอปักหมุด',
    ]),
    'ไม่มีรายการ')}`).join('');

  const body = `
    <h1>ทะเบียนการดูแลผู้ใช้ยาเสพติดในชุมชน (CBTx &amp; HR)</h1>
    <div class="meta">เงื่อนไขที่พิมพ์: ${esc(filterSummary || 'ทั้งหมด')} · จำนวน ${rows.length} รายการ</div>
    ${rows.length ? sections : '<div class="empty">ไม่มีรายการที่ตรงกับเงื่อนไขที่เลือก</div>'}
  `;
  openPrintDoc('ทะเบียนการดูแลผู้ใช้ยาเสพติดในชุมชน', body);
};
