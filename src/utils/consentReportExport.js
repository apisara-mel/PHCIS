/* consentReportExport — ดาวน์โหลดรายงาน consent ตาม preview (PDF/CSV/XLSX).
   หัวเอกสาร · คอลัมน์ · PDPA-safe rows ตรงกับ consentExportPopup preview.
   PDF ใช้หน้าต่างพิมพ์ของเบราว์เซอร์ (ไม่มี PDF engine ในโปรเจกต์). */

import { CONSENT_STATUS } from '@/data/consentRecords';

export const CONSENT_EXPORT_LOGO = '/images/office-health-logo.png';
export const CONSENT_EXPORT_ORG = 'สำนักอนามัย กรุงเทพมหานคร';
export const CONSENT_EXPORT_FOOTER = 'ออกเอกสารโดยระบบจัดการความยินยอม (PHCIS)';

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toIsoDate = (d) => {
  if (!d) return null;
  return new Date(d).toISOString().slice(0, 10);
};

/** กรองแถวด้วย _iso — แถวที่ไม่มี _iso (เช่น worklist) คงไว้ทั้งหมด */
export function filterRowsByDateRange(rows, startDate, endDate) {
  const startIso = toIsoDate(startDate);
  const endIso = toIsoDate(endDate);
  if (!startIso || !endIso) return rows || [];
  return (rows || []).filter((r) => {
    if (!r._iso) return true;
    return r._iso >= startIso && r._iso <= endIso;
  });
}

export function exportCellValue(row, col) {
  const v = row[col.key];
  if (v == null || v === '') return '-';
  return String(v);
}

function slugFilename(s) {
  const base = String(s || 'consent-report')
    .replace(/[^\w\u0E00-\u0E7F-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return base || 'consent-report';
}

function downloadBlob(filename, blob) {
  if (typeof document === 'undefined') return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

function buildDateSubtitle(startDate, endDate, formatThaiDate) {
  const start = startDate ? formatThaiDate(startDate) : '—';
  const end = endDate ? formatThaiDate(endDate) : '—';
  return `ช่วงวันที่ ${start} ถึง ${end} · ${CONSENT_EXPORT_FOOTER}`;
}

function buildCompareSubtitle(patient) {
  return `HN ${patient?.hn || '—'} · ${CONSENT_EXPORT_FOOTER}`;
}

function buildSpreadsheetLines({
  orgName,
  previewTitle,
  subtitle,
  topicListLine,
  sections,
}) {
  const lines = [];
  lines.push(csvCell(orgName));
  lines.push(csvCell(previewTitle));
  if (topicListLine) lines.push(csvCell(topicListLine));
  lines.push(csvCell(subtitle));
  lines.push('');

  sections.forEach((section, idx) => {
    if (idx > 0) lines.push('');
    if (sections.length > 1) {
      lines.push(csvCell(section.title));
      lines.push('');
    }
    const cols = section.columns || [];
    lines.push(cols.map((c) => csvCell(c.header)).join(','));
    (section.rows || []).forEach((row) => {
      lines.push(cols.map((c) => csvCell(exportCellValue(row, c))).join(','));
    });
  });

  return `\uFEFF${lines.join('\r\n')}`;
}

const PRINT_CSS = `
  body{font-family:Sarabun,sans-serif;padding:32px;color:#363B3F;margin:0}
  .header{text-align:center;margin-bottom:24px}
  .logo{width:72px;height:72px;border-radius:50%;object-fit:cover;margin-bottom:8px}
  .org{color:#007549;font-size:16px;font-weight:600;margin:0 0 4px}
  .title{color:#363B3F;font-size:14px;font-weight:500;margin:0 0 4px}
  .topics{color:#6B7280;font-size:12px;margin:0 0 4px}
  .meta{color:#858C92;font-size:12px;margin:0}
  .section{margin-top:28px}
  .section-title{color:#363B3F;font-size:14px;font-weight:600;margin:0 0 12px}
  table{width:100%;border-collapse:collapse;margin-bottom:8px}
  th,td{padding:6px 8px;border-bottom:1px solid #E2E4E6;font-size:12px;text-align:left;vertical-align:top}
  th{background:#F4FBF8;color:#007549;font-weight:700}
  td.nowrap{white-space:nowrap}
  .compare-wrap{display:flex;flex-wrap:wrap;gap:16px;margin-top:8px}
  .compare-col{flex:1 1 240px;min-width:220px;padding:12px;border-radius:12px;background:#F9FBFB;border:1px solid #E2E4E6;box-sizing:border-box}
  .compare-col-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:13px;font-weight:500}
  .compare-col-head.teal{color:#0D9488}
  .compare-col-head.pink{color:#DB2777}
  .compare-count{color:#858C92;font-size:11px;font-weight:400}
  .compare-card{padding:12px;border-radius:8px;background:#fff;border:1px solid #E2E4E6;margin-bottom:8px}
  .compare-card-title{font-size:13px;margin:0 0 2px}
  .compare-card-meta{font-size:11px;color:#858C92;margin:0 0 6px}
  .compare-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;background:#F4FBF8;color:#007549;margin-right:4px}
  .compare-badge.orange{background:#FFF7ED;color:#C2410C}
  .compare-patient{padding:12px;border-radius:12px;background:#F4FBF8;border:1px solid #B8E6D4;margin-bottom:16px}
  .compare-patient-label{font-size:11px;color:#858C92;margin:0 0 2px}
  .compare-patient-value{font-size:13px;margin:0}
  .empty{color:#858C92;font-size:12px}
  @media print{body{padding:16px}}
`;

function buildTableHtml(columns, rows) {
  const cols = columns || [];
  const head = cols.map((c) => `<th>${esc(c.header)}</th>`).join('');
  const body = (rows || []).map((row) => {
    const tds = cols.map((c) => {
      const cls = c.kind === 'nowrap' || c.key === 'signChannel' ? ' class="nowrap"' : '';
      return `<td${cls}>${esc(exportCellValue(row, c))}</td>`;
    }).join('');
    return `<tr>${tds}</tr>`;
  }).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function buildCompareColumnHtml(title, tone, items, emptyLabel) {
  const toneClass = tone === 'teal' ? 'teal' : 'pink';
  const cards = items.length === 0
    ? `<p class="empty">${esc(emptyLabel)}</p>`
    : items.map((item) => {
      const statusLabel = item.statusLabel
        || (CONSENT_STATUS[item.status] || {}).label
        || item.status
        || '—';
      const reconsent = item.reconsentSent
        ? '<span class="compare-badge orange">ส่ง Reconsent แล้ว</span>'
        : '';
      return `<div class="compare-card">
        <p class="compare-card-title">${esc(item.formName)}</p>
        <p class="compare-card-meta">${esc(item.formCode)} · ${esc(item.version)}</p>
        <span class="compare-badge">${esc(statusLabel)}</span>${reconsent}
      </div>`;
    }).join('');
  return `<div class="compare-col">
    <div class="compare-col-head ${toneClass}">
      <span>${esc(title)}</span>
      <span class="compare-count">${items.length} รายการ</span>
    </div>
    ${cards}
  </div>`;
}

function buildCompareHtml(patient, compare) {
  const consented = compare?.consented || [];
  const declined = compare?.declined || [];
  return `<div class="compare-patient">
    <p class="compare-patient-label">HN (Hospital Number)</p>
    <p class="compare-patient-value">${esc(patient?.hn || '—')}</p>
  </div>
  <div class="compare-wrap">
    ${buildCompareColumnHtml('ให้ความยินยอม', 'teal', consented, 'ยังไม่มีแบบฟอร์มที่ให้ความยินยอม')}
    ${buildCompareColumnHtml('ไม่ให้ความยินยอม', 'pink', declined, 'ยังไม่มีแบบฟอร์มที่ไม่ให้ความยินยอม')}
  </div>`;
}

function openPrintDoc(title, bodyHtml) {
  if (typeof window === 'undefined') return false;
  const html = `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"/><title>${esc(title)}</title>
<style>${PRINT_CSS}</style></head><body>${bodyHtml}
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
  const w = window.open('', '_blank', 'noopener,noreferrer,width=920,height=1000');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}

function buildPrintBody({
  previewTitle,
  subtitle,
  topicListLine,
  sections,
  isCompareExport,
}) {
  const logoUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${CONSENT_EXPORT_LOGO}`
    : CONSENT_EXPORT_LOGO;

  let body = `<div class="header">
    <img class="logo" src="${esc(logoUrl)}" alt="ตราสัญลักษณ์สำนักอนามัย กรุงเทพมหานคร"/>
    <p class="org">${esc(CONSENT_EXPORT_ORG)}</p>
    <p class="title">${esc(previewTitle)}</p>
    ${topicListLine ? `<p class="topics">${esc(topicListLine)}</p>` : ''}
    <p class="meta">${esc(subtitle)}</p>
  </div>`;

  if (isCompareExport && sections[0]?.compare) {
    body += buildCompareHtml(sections[0].patient, sections[0].compare);
    return body;
  }

  sections.forEach((section) => {
    body += '<div class="section">';
    if (sections.length > 1) {
      body += `<p class="section-title">${esc(section.title)}</p>`;
    }
    if ((section.rows || []).length > 0) {
      body += buildTableHtml(section.columns, section.rows);
    } else {
      body += '<p class="empty">ไม่มีข้อมูลในช่วงที่เลือก</p>';
    }
    body += '</div>';
  });

  return body;
}

/**
 * ดาวน์โหลดรายงานตามรูปแบบที่เลือก
 * @param {object} opts
 * @param {'pdf'|'csv'|'xlsx'} opts.format
 * @param {string} opts.previewTitle
 * @param {Date|null} opts.startDate
 * @param {Date|null} opts.endDate
 * @param {(d: Date) => string} opts.formatThaiDate
 * @param {Array<{ title, columns, rows, compare?, patient? }>} opts.sections
 * @param {boolean} [opts.isCompareExport]
 * @param {string} [opts.topicListLine]
 * @param {string} [opts.filenameBase]
 */
export function downloadConsentReport({
  format,
  previewTitle,
  startDate,
  endDate,
  formatThaiDate,
  sections = [],
  isCompareExport = false,
  topicListLine,
  filenameBase,
}) {
  if (!format || typeof document === 'undefined') return false;

  const subtitle = isCompareExport
    ? buildCompareSubtitle(sections[0]?.patient)
    : buildDateSubtitle(startDate, endDate, formatThaiDate);

  const fname = slugFilename(filenameBase || previewTitle);

  if (format === 'csv' || format === 'xlsx') {
    const content = buildSpreadsheetLines({
      orgName: CONSENT_EXPORT_ORG,
      previewTitle,
      subtitle,
      topicListLine,
      sections,
    });
    const ext = format === 'xlsx' ? 'xlsx' : 'csv';
    const mime = format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;'
      : 'text/csv;charset=utf-8;';
    return downloadBlob(`${fname}.${ext}`, new Blob([content], { type: mime }));
  }

  if (format === 'pdf') {
    const bodyHtml = buildPrintBody({
      previewTitle,
      subtitle,
      topicListLine,
      sections,
      isCompareExport,
    });
    return openPrintDoc(previewTitle, bodyHtml);
  }

  return false;
}

/**
 * สร้างชุด section สำหรับ export จาก state ของ useExportFormatState
 */
export function buildConsentExportSections({
  report,
  reportsCatalog,
  selectedTopics,
  showTopicPicker,
  isCompareExport,
  isSnapshotExport,
  startDate,
  endDate,
  previewTitle,
  selectedReports,
  sanitizeExportReportMeta,
}) {
  const catalog = Array.isArray(reportsCatalog) ? reportsCatalog : [];
  const sanitize = sanitizeExportReportMeta;

  if (isCompareExport && report?.table) {
    const sanitized = sanitize(report);
    return [{
      title: sanitized.title || previewTitle,
      columns: sanitized.table.columns,
      rows: sanitized.table.rows,
      compare: sanitized.compare,
      patient: sanitized.patient,
    }];
  }

  if (!showTopicPicker && report?.table) {
    const sanitized = sanitize(report);
    const rows = isSnapshotExport
      ? sanitized.table.rows
      : filterRowsByDateRange(sanitized.table.rows, startDate, endDate);
    return [{
      title: sanitized.title || previewTitle,
      columns: sanitized.table.columns,
      rows,
    }];
  }

  return selectedTopics
    .map((key) => {
      const fromCatalog = catalog.find((r) => r.key === key);
      if (!fromCatalog?.table) return null;
      const sanitized = sanitize(fromCatalog);
      const rows = isSnapshotExport
        ? sanitized.table.rows
        : filterRowsByDateRange(sanitized.table.rows, startDate, endDate);
      return {
        title: sanitized.title || selectedReports.find((r) => r.key === key)?.title || previewTitle,
        columns: sanitized.table.columns,
        rows,
      };
    })
    .filter(Boolean);
}
