/* PHCIS | Consent — ดาวน์โหลดแบบฟอร์มความยินยอมเป็น PDF จริง (ด.1.1.15).
   Render เนื้อหาแบบฟอร์มลง canvas (Sarabun/Mitr) แล้วประกอบเป็น PDF A4
   หลายหน้า (JPEG per page) — ไม่พึ่ง popup/print. */

import { buildWizardDraftFromRecord } from '@/data/consentFormWizardContent';

const A4_W_PT = 595.28;
const A4_H_PT = 841.89;
const SCALE = 2;
const PAGE_W = Math.round(A4_W_PT * SCALE);
const PAGE_H = Math.round(A4_H_PT * SCALE);
const MARGIN = 56 * SCALE;
const CONTENT_W = PAGE_W - MARGIN * 2;

const SIGNATURE_LABELS = {
  patient: 'ลายมือชื่อผู้ป่วย',
  doctor: 'ลายมือชื่อแพทย์ผู้ดูแล',
  witness: 'ลายมือชื่อพยาน',
  guardian: 'ลายมือชื่อผู้ปกครอง',
};

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

const sanitizeFilename = (code) => String(code || 'consent-form')
  .replace(/[^\w\u0E00-\u0E7F.-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '') || 'consent-form';

const wrapText = (ctx, text, maxWidth) => {
  const src = String(text || '').trim();
  if (!src) return [''];
  const lines = [];
  let line = '';
  for (const ch of src) {
    const next = line + ch;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = ch.trim() ? ch : '';
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
};

/** Flat list of draw ops: { kind, ... } */
const buildLayout = (record) => {
  const draft = buildWizardDraftFromRecord(record) || {};
  const scopes = record.scopes || [{ group: record.group, subBranch: record.subBranch, dept: record.dept }];
  const scopeText = scopes.map((s) => `${s.group} · ${s.subBranch} · ${s.dept}`).join(' / ');
  const ops = [];

  ops.push({ kind: 'title', text: 'สำนักอนามัย กรุงเทพมหานคร' });
  ops.push({ kind: 'subtitle', text: 'แบบฟอร์มความยินยอม (Consent Form)' });
  ops.push({ kind: 'gap', h: 12 * SCALE });
  ops.push({ kind: 'heading', text: draft.docTitle || record.name || '—' });
  ops.push({ kind: 'meta', text: `รหัส ${record.code || '—'} · เวอร์ชัน ${record.version || '—'} · ประเภท ${record.type || '—'}` });
  ops.push({ kind: 'meta', text: `สถานะ ${record.status || '—'} · อัปเดต ${record.updatedDate || '—'} · ผู้สร้าง ${record.creator || '—'}` });
  ops.push({ kind: 'meta', text: `ขอบเขตการใช้งาน: ${scopeText}` });
  ops.push({ kind: 'rule' });
  ops.push({ kind: 'sectionTitle', text: 'ข้อมูลผู้ให้ความยินยอม (ตัวอย่าง)' });
  ops.push({ kind: 'field', text: 'ชื่อ-นามสกุล: _________________________________' });
  ops.push({ kind: 'field', text: 'HN: _________________  วันเกิด: _________________' });
  ops.push({ kind: 'field', text: 'แพทย์ผู้ดูแล: _________________________________' });
  if (draft.requireGuardian) {
    ops.push({ kind: 'field', text: 'ผู้ปกครอง (กรณีจำเป็น): _________________________' });
  }
  ops.push({ kind: 'gap', h: 8 * SCALE });

  (draft.sections || []).forEach((sec, i) => {
    ops.push({ kind: 'clauseTitle', text: `${i + 1}. ${sec.title || '—'}` });
    ops.push({ kind: 'body', text: sec.detail || '—' });
    ops.push({ kind: 'checkbox', text: '☐  ข้าพเจ้าได้อ่านและเข้าใจข้อความข้างต้นแล้ว' });
    ops.push({ kind: 'gap', h: 6 * SCALE });
  });

  if (draft.note) {
    ops.push({ kind: 'sectionTitle', text: 'หมายเหตุท้ายเอกสาร' });
    ops.push({ kind: 'body', text: draft.note });
    ops.push({ kind: 'gap', h: 8 * SCALE });
  }

  ops.push({ kind: 'sectionTitle', text: 'ลายมือชื่อ' });
  (draft.signatures || ['patient', 'doctor']).forEach((sig) => {
    ops.push({ kind: 'signature', text: SIGNATURE_LABELS[sig] || sig });
  });

  ops.push({ kind: 'gap', h: 16 * SCALE });
  ops.push({
    kind: 'footer',
    text: `ออกเอกสารโดยระบบจัดการความยินยอม (PHCIS) · ${new Date().toLocaleString('th-TH')}`,
  });

  return ops;
};

const measureOps = (ctx, ops) => {
  let y = MARGIN;
  const pages = [[]];

  const ensure = (need) => {
    if (y + need > PAGE_H - MARGIN) {
      pages.push([]);
      y = MARGIN;
    }
  };

  ops.forEach((op) => {
    if (op.kind === 'gap') {
      ensure(op.h);
      y += op.h;
      pages[pages.length - 1].push({ ...op, y: y - op.h });
      return;
    }
    if (op.kind === 'rule') {
      ensure(16 * SCALE);
      pages[pages.length - 1].push({ ...op, y });
      y += 16 * SCALE;
      return;
    }
    if (op.kind === 'signature') {
      ensure(72 * SCALE);
      pages[pages.length - 1].push({ ...op, y });
      y += 72 * SCALE;
      return;
    }

    let font = `${14 * SCALE}px Sarabun, sans-serif`;
    let lineH = 20 * SCALE;
    if (op.kind === 'title') font = `bold ${20 * SCALE}px Mitr, Sarabun, sans-serif`;
    if (op.kind === 'subtitle') font = `${13 * SCALE}px Sarabun, sans-serif`;
    if (op.kind === 'heading') font = `600 ${17 * SCALE}px Mitr, Sarabun, sans-serif`;
    if (op.kind === 'sectionTitle') font = `600 ${15 * SCALE}px Sarabun, sans-serif`;
    if (op.kind === 'clauseTitle') font = `600 ${14 * SCALE}px Sarabun, sans-serif`;
    if (op.kind === 'meta') { font = `${12 * SCALE}px Sarabun, sans-serif`; lineH = 18 * SCALE; }
    if (op.kind === 'body') { font = `${13 * SCALE}px Sarabun, sans-serif`; lineH = 20 * SCALE; }
    if (op.kind === 'field') { font = `${13 * SCALE}px Sarabun, sans-serif`; lineH = 22 * SCALE; }
    if (op.kind === 'checkbox') { font = `${13 * SCALE}px Sarabun, sans-serif`; lineH = 22 * SCALE; }
    if (op.kind === 'footer') { font = `${11 * SCALE}px Sarabun, sans-serif`; lineH = 16 * SCALE; }

    ctx.font = font;
    const lines = wrapText(ctx, op.text, CONTENT_W);
    const blockH = lines.length * lineH + (op.kind === 'heading' ? 8 * SCALE : 4 * SCALE);
    ensure(blockH);
    pages[pages.length - 1].push({ ...op, y, lines, lineH, font });
    y += blockH;
  });

  return pages;
};

const drawPage = (ctx, pageOps) => {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  pageOps.forEach((op) => {
    if (op.kind === 'gap') return;
    if (op.kind === 'rule') {
      ctx.strokeStyle = '#C5EDDA';
      ctx.lineWidth = SCALE;
      ctx.beginPath();
      ctx.moveTo(MARGIN, op.y + 8 * SCALE);
      ctx.lineTo(PAGE_W - MARGIN, op.y + 8 * SCALE);
      ctx.stroke();
      return;
    }
    if (op.kind === 'signature') {
      ctx.fillStyle = '#232B36';
      ctx.font = `${13 * SCALE}px Sarabun, sans-serif`;
      ctx.fillText(op.text, MARGIN, op.y + 16 * SCALE);
      ctx.strokeStyle = '#ADB2B7';
      ctx.lineWidth = SCALE;
      ctx.beginPath();
      ctx.moveTo(MARGIN, op.y + 48 * SCALE);
      ctx.lineTo(MARGIN + CONTENT_W * 0.55, op.y + 48 * SCALE);
      ctx.stroke();
      ctx.fillStyle = '#858C92';
      ctx.font = `${11 * SCALE}px Sarabun, sans-serif`;
      ctx.fillText('วันที่ ____ / ____ / ______', MARGIN, op.y + 64 * SCALE);
      return;
    }

    ctx.font = op.font;
    if (op.kind === 'title') ctx.fillStyle = '#007549';
    else if (op.kind === 'subtitle' || op.kind === 'meta' || op.kind === 'footer') ctx.fillStyle = '#858C92';
    else if (op.kind === 'heading' || op.kind === 'sectionTitle' || op.kind === 'clauseTitle') ctx.fillStyle = '#007549';
    else ctx.fillStyle = '#232B36';

    let y = op.y + op.lineH;
    (op.lines || [op.text]).forEach((line) => {
      ctx.fillText(line, MARGIN, y);
      y += op.lineH;
    });
  });
};

const canvasToJpeg = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) {
      reject(new Error('canvas-to-blob failed'));
      return;
    }
    blob.arrayBuffer().then(resolve).catch(reject);
  }, 'image/jpeg', 0.92);
});

/** Minimal PDF 1.4 — one JPEG image per A4 page. */
const pdfFromJpegPages = (jpegBuffers) => {
  const enc = new TextEncoder();
  const chunks = [];
  let byteOffset = 0;
  const objOffsets = [];

  const appendStr = (s) => {
    const b = enc.encode(s);
    chunks.push(b);
    byteOffset += b.length;
  };
  const appendBuf = (b) => {
    chunks.push(new Uint8Array(b));
    byteOffset += b.byteLength;
  };
  const startObj = (n, body) => {
    objOffsets[n] = byteOffset;
    appendStr(`${n} 0 obj\n${body}\nendobj\n`);
  };

  appendStr('%PDF-1.4\n');

  const pageCount = jpegBuffers.length;
  const pageObjStart = 3;
  const imageObjStart = pageObjStart + pageCount;
  const contentObjStart = imageObjStart + pageCount;
  const kids = Array.from({ length: pageCount }, (_, i) => `${pageObjStart + i} 0 R`).join(' ');

  startObj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  startObj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`);

  jpegBuffers.forEach((jpeg, i) => {
    const pageNum = pageObjStart + i;
    const imgNum = imageObjStart + i;
    const contentNum = contentObjStart + i;

    startObj(pageNum, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W_PT.toFixed(2)} ${A4_H_PT.toFixed(2)}] /Resources << /XObject << /Im1 ${imgNum} 0 R >> >> /Contents ${contentNum} 0 R >>`);

    startObj(imgNum, `<< /Type /XObject /Subtype /Image /Width ${PAGE_W} /Height ${PAGE_H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.byteLength} >>\nstream\n`);
    appendBuf(jpeg);
    appendStr('\nendstream\n');

    const contentStream = `q ${A4_W_PT.toFixed(2)} 0 0 ${A4_H_PT.toFixed(2)} 0 0 cm /Im1 Do Q`;
    startObj(contentNum, `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`);
  });

  const xrefPos = byteOffset;
  const totalObjs = contentObjStart + pageCount;
  appendStr(`xref\n0 ${totalObjs}\n`);
  appendStr('0000000000 65535 f \n');
  for (let i = 1; i < totalObjs; i += 1) {
    appendStr(`${String(objOffsets[i] || 0).padStart(10, '0')} 00000 n \n`);
  }
  appendStr(`trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);

  return new Blob(chunks, { type: 'application/pdf' });
};

const renderPdfBlob = async (record) => {
  if (typeof document === 'undefined') throw new Error('download requires browser');

  await document.fonts.ready;

  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = PAGE_W;
  measureCanvas.height = PAGE_H;
  const measureCtx = measureCanvas.getContext('2d');
  const ops = buildLayout(record);
  const pages = measureOps(measureCtx, ops);

  const jpegBuffers = [];
  for (const pageOps of pages) {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    drawPage(canvas.getContext('2d'), pageOps);
    jpegBuffers.push(await canvasToJpeg(canvas));
  }

  return pdfFromJpegPages(jpegBuffers);
};

/** ดาวน์โหลดแบบฟอร์มเป็นไฟล์ PDF ลงเครื่อง — คืน filename เมื่อสำเร็จ */
export async function downloadConsentFormPdf(record) {
  if (!record) throw new Error('missing record');
  const blob = await renderPdfBlob(record);
  const filename = `${sanitizeFilename(record.code)}.pdf`;
  triggerDownload(blob, filename);
  return filename;
}
