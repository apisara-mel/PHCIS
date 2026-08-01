import React from 'react';

/* Code 128 (subset B) barcode, rendered as inline SVG.

   TOR ภาคผนวก ก §1.15.5.3 — "สามารถออก Barcode Lab แยกได้ตามชนิดสิ่งส่งตรวจ".
   A lab sticker's barcode is not decoration: the bench scans it off the
   tube to pull the order up, which is the whole premise of the team's
   "สแกนบาร์โค้ด" worklist action. So this encodes for real rather than
   drawing a plausible-looking stripe pattern — a fake would pass visual
   review and then fail on the first scanner.

   Implemented here rather than pulled from npm because it is ~60 lines of
   table lookup, and adding a barcode dependency for one glyph is a poor
   trade. Subset B covers ASCII 32–126, which is everything an accession
   number ("L69-0712") uses.

   Encoding: Start-B, then one symbol per character, then a modulo-103
   weighted checksum, then Stop. Each symbol is six run-lengths alternating
   bar/space; the stop symbol carries a seventh element (the final bar). */

/* Run-length patterns for Code 128 values 0–106. Index = symbol value.
   Each string is 6 digits: bar, space, bar, space, bar, space. */
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312',
  '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
  '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131',
  '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
  '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
  '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
  '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112',
  '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412',
  '211214', '211232', '233111',
];

const START_B = 104;
const STOP = 106;
/* The stop symbol is followed by a 2-module bar that closes the pattern. */
const STOP_TERMINATOR = '11';

/* Turns a string into the module run-lengths for the whole symbol. */
const encode = (value) => {
  const text = String(value ?? '');
  /* Subset B maps ASCII 32..126 onto values 0..94. Anything outside that
     is replaced rather than silently corrupting the checksum. */
  const codes = [...text].map((ch) => {
    const v = ch.charCodeAt(0) - 32;
    return v >= 0 && v <= 94 ? v : 0; /* 0 = space */
  });

  /* Checksum: start value plus each symbol weighted by its 1-based
     position, modulo 103. */
  let sum = START_B;
  codes.forEach((v, i) => { sum += v * (i + 1); });
  const check = sum % 103;

  const symbols = [START_B, ...codes, check, STOP];
  return symbols.map((s) => PATTERNS[s]).join('') + STOP_TERMINATOR;
};

/* `moduleWidth` is the width of one narrow bar in px — 1 is the smallest
   most thermal label printers reliably resolve at 203 dpi; 2 is safer on a
   plain office printer, which is what this mock prints to. */
const Barcode128 = ({
  value,
  height = 44,
  moduleWidth = 1.6,
  showText = true,
  className = '',
  style,
}) => {
  const runs = encode(value);
  const totalModules = [...runs].reduce((n, d) => n + Number(d), 0);
  const width = totalModules * moduleWidth;

  /* Walk the run-lengths, emitting a rect for every bar (even indices) and
     skipping the spaces. */
  const bars = [];
  let x = 0;
  [...runs].forEach((d, i) => {
    const w = Number(d) * moduleWidth;
    if (i % 2 === 0) bars.push({ x, w });
    x += w;
  });

  return (
    <div className={`inline-flex flex-col items-center ${className}`} style={style}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role='img'
        aria-label={`บาร์โค้ด ${value}`}
        shapeRendering='crispEdges'
      >
        {/* White backing so the bars stay readable if the sticker sits on a
            tinted surface — scanners need the quiet-zone contrast. */}
        <rect x={0} y={0} width={width} height={height} fill='#FFFFFF' />
        {bars.map((b, i) => (
          <rect key={i} x={b.x} y={0} width={b.w} height={height} fill='#000000' />
        ))}
      </svg>
      {showText && (
        <span
          style={{
            fontFamily: 'var(--type-family-mono, monospace)',
            fontSize: 'var(--type-size-xs)',
            letterSpacing: 1,
            color: '#000000',
          }}
        >
          {value}
        </span>
      )}
    </div>
  );
};

export default Barcode128;
