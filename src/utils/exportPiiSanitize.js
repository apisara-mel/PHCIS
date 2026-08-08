/* exportPiiSanitize — ตัดคอลัมน์ชื่อ-นามสกุลผู้รับบริการออกจากรายงานที่ส่งออก (PDPA)
   ใช้เฉพาะ export / print-preview / CSV — ไม่กระทบตารางบนหน้าจอ */

import { NON_PERSON_NAME_HEADER_RE } from '@/utils/piiMasking';

const PATIENT_NAME_HEADER_RE = /ชื่อ[-\s]?นามสกุล|ชื่อ[-\s]?สกุล|ชื่อ\s*-\s*(?:นาม)?สกุล|^ชื่อ$|^ผู้ป่วย$|ผู้รับบริการ|ชื่อผู้รับบริการ/;

const HN_COLUMN_RE = /^HN$|Hospital Number/i;

export function isPatientNameExportColumn(col) {
  if (!col) return false;
  const header = String(col.header || col.label || '').trim();
  const key = String(col.key || '');

  if (NON_PERSON_NAME_HEADER_RE.test(header)) return false;
  if (PATIENT_NAME_HEADER_RE.test(header)) return true;
  if (key === 'patientName' || key === 'fullName') return true;
  if (key === 'patient') return true;
  if (key === 'name' && (PATIENT_NAME_HEADER_RE.test(header) || header === 'ผู้ป่วย')) return true;
  return false;
}

function hasHnColumn(columns) {
  return (columns || []).some((c) => {
    const header = String(c.header || c.label || '').trim();
    return c.key === 'hn' || HN_COLUMN_RE.test(header);
  });
}

function hnFromRow(row) {
  return row?.hn ?? row?.patient?.hn ?? '';
}

/** ตัดคอลัมน์ชื่อ + ค่าในแถว — ถ้ายังไม่มีคอลัมน์ HN จะแทนที่ด้วย HN */
export function sanitizeExportTable(table) {
  if (!table?.columns?.length) return table;
  const dropKeys = new Set(
    table.columns.filter(isPatientNameExportColumn).map((c) => c.key),
  );
  if (dropKeys.size === 0) return table;

  const keepHn = hasHnColumn(table.columns);
  const nextColumns = table.columns.filter((c) => !dropKeys.has(c.key));
  if (!keepHn) {
    nextColumns.unshift({ key: 'hn', header: 'HN', width: 120 });
  }

  return {
    ...table,
    columns: nextColumns,
    rows: (table.rows || []).map((row) => {
      const next = { ...row };
      dropKeys.forEach((k) => { delete next[k]; });
      if (!keepHn) next.hn = hnFromRow(row);
      return next;
    }),
  };
}

/** ตัด/แทนที่คอลัมน์ชื่อใน column defs (CSV / spreadsheet export) */
export function sanitizeExportColumns(columns) {
  if (!Array.isArray(columns)) return columns;
  const keepHn = hasHnColumn(columns);
  const next = [];

  columns.forEach((c) => {
    if (!isPatientNameExportColumn(c)) {
      next.push(c);
      return;
    }
    if (!keepHn) {
      next.push({
        ...c,
        key: 'hn',
        label: 'HN',
        header: 'HN',
        csv: c.csv || ((r) => hnFromRow(r)),
        value: c.value || ((r) => hnFromRow(r)),
      });
    }
  });

  return next;
}

/** ลบชื่อออกจากข้อความ metadata ของรายงาน (คง HN ถ้ามี) */
export function sanitizeExportReportMeta(report) {
  if (!report) return report;
  const next = { ...report };
  if (typeof next.title === 'string') {
    if (next.patient?.name) {
      next.title = next.title.replace(
        new RegExp(`\\s*·\\s*${escapeRegExp(next.patient.name)}\\s*·`, 'g'),
        ' · ',
      );
    }
    next.title = next.title.replace(/\s*·\s*[^·]*?(?:นาย|นาง|น\.ส\.|ด\.|Mr\.|Ms\.)\S.*$/u, '');
  }
  if (next.patient) {
    next.patient = { hn: next.patient.hn };
  }
  if (next.table) {
    next.table = sanitizeExportTable(next.table);
  }
  return next;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
