import React, { useMemo } from 'react';

/* ════════════════════════════════════════════════════════════════════════
   QueueQrCode — QR จริง (ไม่ใช่ placeholder) สำหรับบัตรคิว

   ทำไมต้องเขียนเอง: repo มี `Barcode128` (Code 128) แต่ไม่มีตัวสร้าง QR ที่
   ใช้ซ้ำได้ — ที่อื่นในโปรเจกต์วาดเป็นสี่เหลี่ยม placeholder — และ playbook
   ห้าม builder เพิ่ม dependency ใหม่ (qrcode / qrcode.react) เอง จึง encode
   ตามมาตรฐาน ISO/IEC 18004 ในไฟล์นี้แทน แล้วรายงานผ่าน manifest
   `newComponents` ให้ integrator พิจารณายกขึ้น design system

   ขอบเขตที่รองรับ (พอสำหรับ URL บัตรคิว):
     • Model 2, Byte mode (UTF-8), Error correction level L
     • Version 1–6 (เลือกอัตโนมัติ) → สูงสุด 134 ไบต์
       เลือกหยุดที่ v6 เพราะ v1–6 ไม่ต้องมี version-information block
       และ character-count indicator ยังเป็น 8 บิต
     • Mask pattern 0 ((row + col) % 2 === 0) — สแกนได้ปกติ ไม่ได้ทำ
       penalty optimisation เพราะ payload เป็น URL สั้น ๆ ที่ contrast ดีอยู่แล้ว

   ทุกค่าที่วาดออกจอ alias token ตาม CLAUDE.md (สีมาจาก --text-* / --surface-*)
   ════════════════════════════════════════════════════════════════════════ */

/* ── GF(256) สำหรับ Reed–Solomon (primitive polynomial 0x11D) ───────────── */
const GF_EXP = new Array(512);
const GF_LOG = new Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];
})();

const gfMul = (a, b) => ((a === 0 || b === 0) ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]]);

const rsGenPoly = (degree) => {
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly;
};

const rsRemainder = (data, ecLen) => {
  const gen = rsGenPoly(ecLen);
  const res = new Array(data.length + ecLen).fill(0);
  for (let i = 0; i < data.length; i += 1) res[i] = data[i];
  for (let i = 0; i < data.length; i += 1) {
    const coef = res[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j += 1) res[i + j] ^= gfMul(gen[j], coef);
    }
  }
  return res.slice(data.length);
};

/* ── ตารางเวอร์ชัน (EC level L เท่านั้น) ────────────────────────────────
   { version, ecPerBlock, blocks, dataPerBlock } — v6 มี 2 บล็อกเท่ากัน  */
const VERSIONS = [
  { version: 1, ecPerBlock: 7,  blocks: 1, dataPerBlock: 19 },
  { version: 2, ecPerBlock: 10, blocks: 1, dataPerBlock: 34 },
  { version: 3, ecPerBlock: 15, blocks: 1, dataPerBlock: 55 },
  { version: 4, ecPerBlock: 20, blocks: 1, dataPerBlock: 80 },
  { version: 5, ecPerBlock: 26, blocks: 1, dataPerBlock: 108 },
  { version: 6, ecPerBlock: 18, blocks: 2, dataPerBlock: 68 },
];

/* พิกัดกึ่งกลาง alignment pattern ต่อเวอร์ชัน (v1 ไม่มี) */
const ALIGN_COORDS = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
};

const utf8Bytes = (str) => {
  const out = [];
  for (let i = 0; i < str.length; i += 1) {
    let code = str.charCodeAt(i);
    if (code < 0x80) out.push(code);
    else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
      i += 1;
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return out;
};

const buildCodewords = (bytes, spec) => {
  const totalData = spec.blocks * spec.dataPerBlock;
  const capacityBits = totalData * 8;
  const bits = [];
  const push = (value, len) => {
    for (let i = len - 1; i >= 0; i -= 1) bits.push((value >> i) & 1);
  };
  push(0b0100, 4);              /* byte mode */
  push(bytes.length, 8);        /* character count — 8 บิตสำหรับ v1–9 */
  bytes.forEach((b) => push(b, 8));
  const terminator = Math.min(4, capacityBits - bits.length);
  if (terminator > 0) push(0, terminator);
  while (bits.length % 8 !== 0) bits.push(0);
  const PAD = [0xec, 0x11];
  let padIndex = 0;
  while (bits.length < capacityBits) {
    push(PAD[padIndex % 2], 8);
    padIndex += 1;
  }
  /* bits → codewords */
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }
  /* split → RS → interleave */
  const dataBlocks = [];
  const ecBlocks = [];
  for (let b = 0; b < spec.blocks; b += 1) {
    const chunk = codewords.slice(b * spec.dataPerBlock, (b + 1) * spec.dataPerBlock);
    dataBlocks.push(chunk);
    ecBlocks.push(rsRemainder(chunk, spec.ecPerBlock));
  }
  const out = [];
  for (let i = 0; i < spec.dataPerBlock; i += 1) {
    dataBlocks.forEach((blk) => { if (i < blk.length) out.push(blk[i]); });
  }
  for (let i = 0; i < spec.ecPerBlock; i += 1) {
    ecBlocks.forEach((blk) => { if (i < blk.length) out.push(blk[i]); });
  }
  return out;
};

const formatBitsForMask0L = () => {
  /* EC level L = 0b01, mask 0 = 0b000 → data = 0b01000 */
  const data = 0b01000;
  let rem = data << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if ((rem >> i) & 1) rem ^= 0b10100110111 << (i - 10);
  }
  return ((data << 10) | rem) ^ 0b101010000010010;
};

/** สร้างเมทริกซ์ QR (true = โมดูลดำ) หรือ null เมื่อ payload ยาวเกิน v6 */
export const buildQrMatrix = (text) => {
  const bytes = utf8Bytes(String(text ?? ''));
  const spec = VERSIONS.find((v) => bytes.length + 2 <= v.blocks * v.dataPerBlock);
  if (!spec) return null;

  const size = spec.version * 4 + 17;
  const m = Array.from({ length: size }, () => new Array(size).fill(0));
  const fixed = Array.from({ length: size }, () => new Array(size).fill(false));
  const setF = (r, c, v) => {
    if (r < 0 || c < 0 || r >= size || c >= size) return;
    m[r][c] = v;
    fixed[r][c] = true;
  };

  /* finder + separator */
  const placeFinder = (r0, c0) => {
    for (let dr = -1; dr <= 7; dr += 1) {
      for (let dc = -1; dc <= 7; dc += 1) {
        const inside = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        let dark = 0;
        if (inside) {
          const border = dr === 0 || dr === 6 || dc === 0 || dc === 6;
          const core = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
          dark = border || core ? 1 : 0;
        }
        setF(r0 + dr, c0 + dc, dark);
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  /* timing */
  for (let i = 8; i < size - 8; i += 1) {
    setF(6, i, i % 2 === 0 ? 1 : 0);
    setF(i, 6, i % 2 === 0 ? 1 : 0);
  }

  /* alignment */
  const coords = ALIGN_COORDS[spec.version] || [];
  coords.forEach((r) => {
    coords.forEach((c) => {
      const isFinderCorner = (r === 6 && c === 6)
        || (r === 6 && c === size - 7)
        || (r === size - 7 && c === 6);
      if (isFinderCorner) return;
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const ring = Math.max(Math.abs(dr), Math.abs(dc));
          setF(r + dr, c + dc, ring === 1 ? 0 : 1);
        }
      }
    });
  });

  /* reserve format-info areas (ค่าจริงเติมทีหลัง) */
  for (let i = 0; i <= 8; i += 1) {
    if (!fixed[8][i]) { m[8][i] = 0; fixed[8][i] = true; }
    if (!fixed[i][8]) { m[i][8] = 0; fixed[i][8] = true; }
  }
  for (let i = 0; i < 8; i += 1) {
    if (!fixed[8][size - 1 - i]) { m[8][size - 1 - i] = 0; fixed[8][size - 1 - i] = true; }
    if (!fixed[size - 1 - i][8]) { m[size - 1 - i][8] = 0; fixed[size - 1 - i][8] = true; }
  }

  /* data + EC → zigzag placement + mask 0 */
  const codewords = buildCodewords(bytes, spec);
  const dataBits = [];
  codewords.forEach((cw) => {
    for (let i = 7; i >= 0; i -= 1) dataBits.push((cw >> i) & 1);
  });
  let idx = 0;
  /* zigzag คู่คอลัมน์จากขวาล่างขึ้นซ้าย ข้ามคอลัมน์ 6 (vertical timing) */
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let vert = 0; vert < size; vert += 1) {
      for (let k = 0; k < 2; k += 1) {
        const c = right - k;
        const row = upward ? size - 1 - vert : vert;
        if (c < 0 || fixed[row][c]) continue;
        let bit = idx < dataBits.length ? dataBits[idx] : 0;
        idx += 1;
        if ((row + c) % 2 === 0) bit ^= 1;     /* mask pattern 0 */
        m[row][c] = bit;
      }
    }
  }

  /* format info (สำเนา 2 ชุด) + dark module */
  /* หมายเหตุ: ดัชนีเป็น m[row][col] — สเปกอ้างอิงส่วนใหญ่เขียนเป็น (x=col, y=row)
     ห้ามคัดลอกตรง ๆ ต้องสลับแกนก่อน ไม่งั้นสองสำเนาสลับกันแล้วสแกนไม่ได้ */
  const fmt = formatBitsForMask0L();
  const getBit = (i) => (fmt >> i) & 1;
  /* สำเนาที่ 1 — คอลัมน์ 8 ด้านบน + แถว 8 ด้านซ้าย */
  for (let i = 0; i <= 5; i += 1) m[i][8] = getBit(i);
  m[7][8] = getBit(6);
  m[8][8] = getBit(7);
  m[8][7] = getBit(8);
  for (let i = 9; i < 15; i += 1) m[8][14 - i] = getBit(i);
  /* สำเนาที่ 2 — แถว 8 ด้านขวา (บิต 0–7) + คอลัมน์ 8 ด้านล่าง (บิต 8–14) */
  for (let i = 0; i < 8; i += 1) m[8][size - 1 - i] = getBit(i);
  for (let i = 8; i < 15; i += 1) m[size - 15 + i][8] = getBit(i);
  m[size - 8][8] = 1;                           /* dark module */

  return m;
};

/**
 * QueueQrCode — วาดเมทริกซ์เป็น SVG
 *   value      ข้อความ/URL (≤134 ไบต์)
 *   size       ความกว้างจริงเป็น px (default 96)
 *   quietZone  ขอบเงียบเป็นจำนวนโมดูล (มาตรฐาน 4)
 */
const QueueQrCode = ({
  value,
  size = 96,
  quietZone = 4,
  color = 'var(--text-content-primary)',
  background = 'var(--surface-card-100)',
  ariaLabel = 'QR ดูสถานะคิวออนไลน์',
  className = '',
  style,
}) => {
  const matrix = useMemo(() => buildQrMatrix(value), [value]);

  if (!matrix) {
    return (
      <div
        className={`inline-flex items-center justify-center ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: 'var(--dim-radius-150, 6px)',
          border: 'var(--dim-stroke-100, 1px) dashed var(--border-neutral-tertiary)',
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xxs, 10px)',
          textAlign: 'center',
          ...style,
        }}
        role='img'
        aria-label='ข้อความยาวเกินกว่าจะสร้าง QR ได้'
      >
        ลิงก์ยาวเกินไป
      </div>
    );
  }

  const n = matrix.length;
  const total = n + quietZone * 2;
  const rects = [];
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (matrix[r][c]) rects.push(`M${c + quietZone} ${r + quietZone}h1v1h-1z`);
    }
  }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      shapeRendering='crispEdges'
      role='img'
      aria-label={ariaLabel}
      style={style}
    >
      <rect x='0' y='0' width={total} height={total} fill={background} />
      <path d={rects.join('')} fill={color} />
    </svg>
  );
};

export default QueueQrCode;
