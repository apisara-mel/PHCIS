/* ตัวอ่านไฟล์การเงินจาก สปสช. — TOR §1.8.6.7.
   "สามารถนำเข้า (import) ไฟล์ด้านการเงินจากสำนักงานหลักประกันสุขภาพแห่งชาติ
   (สปสช.) ได้ เพื่อใช้เป็นข้อมูลประกอบการทำรายงานทางการเงินได้"

   ข้อสำคัญคือท่อนหลัง — ไฟล์ที่นำเข้าต้องไปโผล่ในรายงานการเงิน ไม่ใช่แค่
   ถูกอ่านแล้วทิ้ง. โมดูลนี้เลยแปลงไฟล์เป็น record ที่ §1.20.3 เอาไปบวกได้จริง.

   ขอบเขตของ prototype: สคีมาที่รองรับคือไฟล์สรุปการโอนเงิน (statement) แบบ
   CSV/pipe ที่ศูนย์บริการได้รับรายงวด ไม่ใช่ตัว 18 แฟ้ม/12 แฟ้มเต็มรูปแบบ
   (นั่นเป็นชุดไฟล์ผู้ป่วยหลายไฟล์ที่ต้อง join กัน — ต้องมี backend). คอลัมน์
   ที่คาดหวัง (มี header หรือไม่มีก็ได้ อ่านตามลำดับ):

     เลขที่อ้างอิง | HN | วันที่รับบริการ | รหัสสิทธิ | ยอดเรียกเก็บ | ยอดอนุมัติ | สถานะ

   สิ่งที่ทำจริงและสำคัญกว่าการนับบรรทัด:
     • รองรับ encoding TIS-620 (ไฟล์ราชการไทยส่วนใหญ่ยังไม่ใช่ UTF-8)
     • ข้าม header/trailer และบรรทัดว่าง
     • dedupe ด้วยเลขที่อ้างอิง — นำเข้างวดเดิมซ้ำต้องไม่บวกยอดทบ
     • เก็บบรรทัดที่ parse ไม่ผ่านไว้รายงาน ไม่ใช่กลืนเงียบ */

const DELIMITERS = [',', '|', '\t'];

/* ไฟล์จากหน่วยงานราชการไทยมักเป็น TIS-620 ไม่ใช่ UTF-8 — ถ้าอ่านเป็น UTF-8
   ตรงๆ ภาษาไทยจะกลายเป็น � ทั้งไฟล์. ลอง UTF-8 ก่อน ถ้าเจอ replacement char
   ค่อยถอยไป TIS-620 (Chrome/Safari รองรับใน TextDecoder). */
export const decodeThaiFile = (buffer) => {
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  if (!utf8.includes('�')) return utf8;
  try {
    return new TextDecoder('tis-620').decode(buffer);
  } catch {
    return utf8;
  }
};

const detectDelimiter = (line) =>
  DELIMITERS.map((d) => ({ d, n: line.split(d).length }))
    .sort((a, b) => b.n - a.n)[0].d;

/* NaN — not 0 — when a cell holds no digits at all. `Number('')` is 0, which
   made the header row ("…,ยอดเรียกเก็บ,…") look like a valid ฿0 record and
   slip past the header check as a 6th line. */
const toNumber = (raw) => {
  const cleaned = String(raw ?? '').replace(/[^\d.-]/g, '');
  if (!/\d/.test(cleaned)) return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
};

const HEADER_HINTS = ['เลขที่', 'อ้างอิง', 'hn', 'ยอด', 'สิทธิ', 'ref'];
const isHeaderRow = (cells) => {
  const joined = cells.join(' ').toLowerCase();
  return HEADER_HINTS.some((h) => joined.includes(h)) && Number.isNaN(toNumber(cells[4]));
};

/* สถานะที่ สปสช. ส่งมา — normalise ให้เหลือ 2 สถานะที่การเงินสนใจจริง */
const normaliseStatus = (raw = '') => {
  const s = String(raw).trim().toLowerCase();
  if (s.includes('ปฏิเสธ') || s.includes('reject') || s.includes('deny')) return 'rejected';
  return 'approved';
};

export const parseNhsoStatement = (text, existingRefs = new Set()) => {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { records: [], skipped: [], duplicates: 0 };

  const delimiter = detectDelimiter(lines[0]);
  const records = [];
  const skipped = [];
  const seen = new Set(existingRefs);
  let duplicates = 0;

  lines.forEach((line, idx) => {
    const cells = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));

    if (idx === 0 && isHeaderRow(cells)) return;
    /* trailer มักเป็นบรรทัดสรุปสั้นๆ ("รวม 120 รายการ") — คอลัมน์ไม่ครบ */
    if (cells.length < 6) { skipped.push({ line: idx + 1, reason: 'คอลัมน์ไม่ครบ', raw: line.slice(0, 60) }); return; }

    const [ref, hn, serviceDate, rightsCode, billedRaw, approvedRaw, status] = cells;
    const billed = toNumber(billedRaw);
    const approved = toNumber(approvedRaw);

    if (!ref) { skipped.push({ line: idx + 1, reason: 'ไม่มีเลขที่อ้างอิง', raw: line.slice(0, 60) }); return; }
    if (Number.isNaN(billed) || Number.isNaN(approved)) {
      skipped.push({ line: idx + 1, reason: 'ยอดเงินไม่ใช่ตัวเลข', raw: line.slice(0, 60) });
      return;
    }
    if (seen.has(ref)) { duplicates += 1; return; }

    seen.add(ref);
    records.push({
      ref,
      hn,
      serviceDate,
      rightsCode,
      billed,
      approved,
      status: normaliseStatus(status),
    });
  });

  return { records, skipped, duplicates };
};

export const summariseNhso = (records = []) => {
  const approved = records.filter((r) => r.status === 'approved');
  const rejected = records.filter((r) => r.status === 'rejected');
  return {
    count: records.length,
    approvedCount: approved.length,
    rejectedCount: rejected.length,
    billedTotal: records.reduce((s, r) => s + r.billed, 0),
    approvedTotal: approved.reduce((s, r) => s + r.approved, 0),
    /* ส่วนต่างเรียกเก็บ-อนุมัติ คือยอดที่ศูนย์ต้องตามหรือรับรู้เป็นส่วนขาด */
    shortfall: approved.reduce((s, r) => s + (r.billed - r.approved), 0)
      + rejected.reduce((s, r) => s + r.billed, 0),
  };
};

/* ไฟล์ตัวอย่างให้ QA กดโหลดไปลองนำเข้าได้ทันที โดยไม่ต้องรอไฟล์จริงจาก สปสช. */
export const SAMPLE_STATEMENT = [
  'เลขที่อ้างอิง,HN,วันที่รับบริการ,รหัสสิทธิ,ยอดเรียกเก็บ,ยอดอนุมัติ,สถานะ',
  'NHSO69-000101,67-00002,2569-07-28,UCS,315,315,อนุมัติ',
  'NHSO69-000102,67-00005,2569-07-28,UCS,710,640,อนุมัติ',
  'NHSO69-000103,67-00008,2569-07-19,UCS,480,0,ปฏิเสธ',
  'NHSO69-000104,67-00011,2569-07-30,UCS,1250,1180,อนุมัติ',
  'NHSO69-000105,67-00014,2569-07-30,UCS,860,860,อนุมัติ',
  'รวม 5 รายการ',
].join('\n');
