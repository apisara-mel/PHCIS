import React from 'react';
import { LAB_TEST_BY_ID, resolveAnalyteRange, LAB_GROUPS } from '@/data/labCatalog';
import { parseRange, analyteResultType, classifyAnalyte } from '@/data/labResults';
import { ANALYTE_COPY, ANALYTE_NAME_TH, VERDICT } from '@/data/labPatientCopy';
import { getPrintSettings } from '@/data/labPrintSettings';

/* ใบรายงานผลตรวจทางห้องปฏิบัติการ — the sheet the PATIENT takes home.

   Distinct from the clinician print in LabDetailPanel, which prints the
   screen panel: terse, English-led, and readable only by someone who
   already knows what a reference range is.

   The design question this sheet answers is not "what is my value" but
   "am I okay, and by how much". Those are different questions, and a table
   of value-next-to-range only answers the first — it hands the reader a
   comparison and expects them to perform it. Most people cannot, reliably,
   and the ones who most need this sheet (elderly patients reading at home,
   often without a clinician beside them) can least.

   So the central device is POSITION, not number: every numeric value is
   plotted on its own reference range, with the normal band drawn and the
   patient's value pinned on it. Inside the band or outside it is
   pre-attentive — no arithmetic, no legend to learn.

   Consequences that shaped the rest:
     • It costs vertical space. Everything else is therefore stripped —
       no icons, no logo mark, no coloured header, no rounded cards — so a
       typical 4–6 value visit still lands on one A4 sheet.
     • It only works for values with a numeric range. Enum results
       (Negative / Reactive) get a plain two-state line instead; forcing the
       ruler where the data is not continuous would be decoration.
     • It must survive a monochrome printer, which many clinics have. The
       band is a tint AND has rule marks; the marker is a filled triangle
       with the number printed beside it. Colour is reinforcement, never the
       only carrier.

   Typography: Mitr (the Thai geometric display face already loaded) is used
   with restraint — the sheet title and the patient's name, nothing else.
   Sarabun carries the body. Numerals are set tabular so a column of values
   aligns on the decimal and a 1 occupies the same width as an 8, which is
   the difference between a table of figures reading as data or as noise. */

const INK = '#16191C';
const PAPER = '#FFFFFF';
/* Print-only raw values: a sheet is ink on paper, and the semantic surface
   tokens are tuned for a lit screen. The three meaning colours below DO
   alias the design system (brand green / error red / warning orange) so the
   report agrees with the worklist about what counts as out of range. */
const RULE = '#C9D2CC';
const BAND = 'var(--brand-p200, #C5EDDA)';
const IN_RANGE = 'var(--text-brandPrimary-default, #007549)';
const OUT_RANGE = 'var(--text-statusbadge-error, #B91C1C)';
const WATCH = 'var(--text-statusbadge-warning, #C2410C)';

const TONE_COLOR = { in: IN_RANGE, out: OUT_RANGE, critical: OUT_RANGE, neutral: INK };

/* ─────────────────────────────────────────────────────────────────────────
   THE RULER

   Given a reference range and a value, work out where to draw the band and
   where to pin the marker.

   The axis deliberately extends past the band on both sides — a value that
   sits exactly at the edge of the drawing would read as "off the scale"
   rather than "just outside", and the difference matters to someone reading
   this at their kitchen table. When a value falls far outside, the axis
   stretches to keep the marker on the paper rather than clipping it. */
const buildScale = (bounds, value) => {
  if (!bounds) return null;
  const hasLow = typeof bounds.low === 'number';
  const hasHigh = typeof bounds.high === 'number';
  if (!hasLow && !hasHigh) return null;

  /* An open range ("< 200", "> 40") still has one real edge; the other side
     of the band runs to the end of the axis. */
  const low = hasLow ? bounds.low : 0;
  const high = hasHigh ? bounds.high : Math.max(low * 2, value * 1.3, low + 1);

  const span = Math.max(high - low, Math.abs(high) * 0.1, 1);
  const pad = span * 0.55;

  let min = hasLow ? low - pad : 0;
  let max = high + pad;
  if (Number.isFinite(value)) {
    /* Keep the marker well inside the drawing. The margin is generous
       (0.6 of the band's own width) because a marker pressed against the
       edge reads as "off the scale" — the reader cannot tell whether the
       value is just outside or wildly outside, which is the one thing this
       ruler exists to show. */
    min = Math.min(min, value - span * 0.6);
    max = Math.max(max, value + span * 0.6);
  }
  if (!hasLow) min = 0;
  if (max <= min) max = min + 1;

  const pct = (v) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));

  return {
    min, max,
    bandStart: pct(low),
    bandEnd: pct(high),
    markerPct: Number.isFinite(value) ? pct(value) : null,
    lowLabel: hasLow ? low : null,
    highLabel: hasHigh ? high : null,
  };
};

const RangeRuler = ({ scale, tone }) => {
  const color = TONE_COLOR[tone] ?? INK;
  const TRACK_H = '3.2mm';

  return (
    <div style={{ marginTop: '2.2mm' }}>
      {/* Track */}
      <div style={{ position: 'relative', height: TRACK_H, background: '#F1F4F2', borderRadius: '0.6mm' }}>
        {/* Normal band — a tint plus hard edges, so it survives a
            monochrome printer that flattens the tint to nothing. */}
        <div
          style={{
            position: 'absolute',
            left: `${scale.bandStart}%`,
            width: `${Math.max(scale.bandEnd - scale.bandStart, 1)}%`,
            top: 0,
            bottom: 0,
            background: BAND,
            borderLeft: `0.4mm solid ${IN_RANGE}`,
            borderRight: `0.4mm solid ${IN_RANGE}`,
            borderRadius: '0.6mm',
          }}
        />
        {/* The patient's value. A filled triangle rather than a dot: on a
            300dpi office printer a small dot fills in and loses its centre,
            while a triangle keeps a readable point. */}
        {scale.markerPct != null && (
          <div
            style={{
              position: 'absolute',
              left: `${scale.markerPct}%`,
              top: '-1.6mm',
              bottom: '-0.8mm',
              width: 0,
              borderLeft: `0.5mm solid ${color}`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-1.4mm',
                left: '-1.3mm',
                width: 0,
                height: 0,
                borderLeft: '1.3mm solid transparent',
                borderRight: '1.3mm solid transparent',
                borderTop: `1.6mm solid ${color}`,
              }}
            />
          </div>
        )}
      </div>

      {/* Edge labels — the numbers that define the band, kept small and
          tabular so they read as scale marks, not as results. */}
      <div
        style={{
          position: 'relative',
          height: '3.6mm',
          marginTop: '0.6mm',
          fontFamily: "'Sarabun', sans-serif",
          fontSize: '6.5pt',
          fontVariantNumeric: 'tabular-nums',
          color: '#5B6560',
        }}
      >
        {scale.lowLabel != null && (
          <span style={{ position: 'absolute', left: `${scale.bandStart}%`, transform: 'translateX(-50%)' }}>
            {scale.lowLabel}
          </span>
        )}
        {scale.highLabel != null && (
          <span style={{ position: 'absolute', left: `${scale.bandEnd}%`, transform: 'translateX(-50%)' }}>
            {scale.highLabel}
          </span>
        )}
      </div>
    </div>
  );
};

/* One measured value. */
const ValueRow = ({ test, analyte, raw, patient }) => {
  const type = analyteResultType(test, analyte);
  const status = classifyAnalyte(test, analyte, type === 'numeric' ? Number(raw) : raw, patient);
  const rangeText = resolveAnalyteRange(analyte, patient);
  const bounds = type === 'numeric' ? parseRange(rangeText) : null;
  const numeric = type === 'numeric' ? Number(raw) : null;
  const scale = bounds ? buildScale(bounds, numeric) : null;

  /* Verdict wording differs for measured vs. detected results: "สูงกว่าเกณฑ์"
     is meaningless for an Anti-HIV, and "ตรวจพบ" is meaningless for a
     sodium. */
  let verdict;
  if (status === 'critical') verdict = VERDICT.critical;
  else if (type !== 'numeric') verdict = status === 'normal' ? VERDICT.notfound : VERDICT.found;
  else if (status === 'normal') verdict = VERDICT.normal;
  else if (status === 'abnormal') {
    verdict = (bounds && Number.isFinite(numeric) && typeof bounds.low === 'number' && numeric < bounds.low)
      ? VERDICT.low : VERDICT.high;
  } else verdict = VERDICT.reported;

  const color = TONE_COLOR[verdict.tone] ?? INK;
  const nameTh = ANALYTE_NAME_TH[analyte.key];
  const copy = ANALYTE_COPY[analyte.key];

  return (
    <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid', paddingTop: '3.4mm', paddingBottom: '3.4mm', borderBottom: `0.2mm solid ${RULE}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '3mm' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Sarabun', sans-serif", fontSize: '10pt', fontWeight: 600, color: INK, lineHeight: 1.25 }}>
            {nameTh ? `${nameTh} ` : ''}
            <span style={{ fontWeight: 400, color: '#5B6560' }}>
              {nameTh ? `(${analyte.label.replace(/\s*\(.*\)$/, '')})` : analyte.label}
            </span>
          </div>
          {copy && (
            <div style={{ fontFamily: "'Sarabun', sans-serif", fontSize: '7.5pt', color: '#6B746F', lineHeight: 1.4, marginTop: '0.4mm' }}>
              {copy}
            </div>
          )}
        </div>

        {/* The value. Largest thing on the row, tabular, with the verdict
            directly beneath so the two are read as one statement. */}
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '32mm' }}>
          <div
            style={{
              fontFamily: "'Sarabun', sans-serif",
              fontSize: '13pt',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.01em',
              color,
              lineHeight: 1.1,
            }}
          >
            {raw}
            {analyte.unit && (
              <span style={{ fontSize: '8pt', fontWeight: 500, color: '#6B746F' }}> {analyte.unit}</span>
            )}
          </div>
          <div style={{ fontFamily: "'Sarabun', sans-serif", fontSize: '8pt', fontWeight: 600, color, marginTop: '0.3mm' }}>
            {verdict.label}
          </div>
        </div>
      </div>

      {scale
        ? <RangeRuler scale={scale} tone={verdict.tone} />
        : (
          /* No continuous scale to plot — say the expected answer in words
             instead of drawing a ruler that would mean nothing. */
          rangeText ? (
            <div style={{ fontFamily: "'Sarabun', sans-serif", fontSize: '7.5pt', color: '#6B746F', marginTop: '1.4mm' }}>
              ผลที่คาดหวังตามเกณฑ์: {rangeText}
            </div>
          ) : null
        )}
    </div>
  );
};

/* `rows` — every worklist row of one order, already decorated by
   withTestLabel. The sheet is per VISIT, not per test: the patient was
   stuck with a needle once and should get one piece of paper. */
/* `preview` renders the same sheet visibly, for the on-screen proof on
   LabReportPage. Without it the component carries `.mih-lab-print-only` and
   is hidden until a print — which is correct for the copy mounted purely as
   a print target, and useless for checking the layout. One component, two
   mount points, no second layout to drift. */
const LabPatientReport = ({ rows = [], reportedAt = '', preview = false }) => {
  const settings = getPrintSettings();
  const reported = rows.filter((r) => r.status === 'reported' && r.results);
  const rootClass = preview ? 'mih-lab-patient-sheet' : 'mih-lab-print-only mih-lab-print-patient';
  if (!reported.length) return <div className={rootClass} />;

  const first = reported[0];

  /* Count how the visit came out. This is the sheet's thesis and it goes
     first, because "am I okay" is the question the patient opens with —
     everything below is the evidence for the answer. */
  let total = 0;
  let outside = 0;
  const attention = [];
  reported.forEach((r) => {
    const test = LAB_TEST_BY_ID[r.testId];
    (test?.analytes ?? []).forEach((a) => {
      const raw = r.results[a.key];
      if (raw == null) return;
      total += 1;
      const type = analyteResultType(test, a);
      const status = classifyAnalyte(test, a, type === 'numeric' ? Number(raw) : raw, r.patient);
      if (status === 'abnormal' || status === 'critical') {
        outside += 1;
        attention.push(ANALYTE_NAME_TH[a.key] ?? a.label);
      }
    });
  });

  /* Group by discipline — the one structural device on the sheet, and it
     encodes something true (how the lab is organised, and how the doctor
     will read it back). No 01/02/03: a set of measurements is not a
     sequence, and numbering it would imply an order that does not exist. */
  const byGroup = new Map();
  reported.forEach((r) => {
    const g = r.group ?? 'other';
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(r);
  });

  return (
    <div
      className={rootClass}
      style={{ background: PAPER, padding: '14mm 15mm', color: INK, maxWidth: '210mm', margin: '0 auto' }}
    >
      {/* Masthead — institution left, document right. A rule, not a colour
          band: this is a record, and it should look like one. */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingBottom: '2.5mm',
          borderBottom: `0.6mm solid ${INK}`,
        }}
      >
        <div>
          <div style={{ fontFamily: "'Sarabun', sans-serif", fontSize: '9.5pt', fontWeight: 600 }}>
            {settings.siteName}
          </div>
          <div style={{ fontFamily: "'Sarabun', sans-serif", fontSize: '7.5pt', color: '#6B746F' }}>
            สำนักอนามัย กรุงเทพมหานคร · งานชันสูตรโรค
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Mitr', sans-serif", fontSize: '13pt', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
            ใบรายงานผลตรวจ
          </div>
          <div style={{ fontFamily: "'Sarabun', sans-serif", fontSize: '7.5pt', color: '#6B746F', fontVariantNumeric: 'tabular-nums' }}>
            {first.orderId} · ออกรายงาน {reportedAt || first.approvedAt || '—'}
          </div>
        </div>
      </div>

      {/* Patient. Mitr's second and last appearance — the name is the only
          other thing on the sheet that deserves the display face. */}
      <div style={{ marginTop: '6mm' }}>
        <div style={{ fontFamily: "'Mitr', sans-serif", fontSize: '17pt', fontWeight: 500, lineHeight: 1.15 }}>
          {first.confidential ? 'ผู้ป่วยปกปิดข้อมูล' : (first.patient.fullName ?? first.patient.shortName)}
        </div>
        <div style={{ fontFamily: "'Sarabun', sans-serif", fontSize: '8.5pt', color: '#5B6560', marginTop: '0.8mm', fontVariantNumeric: 'tabular-nums' }}>
          HN {first.confidential ? '•••••' : first.patient.hn}
          {!first.confidential && ` · ${parseInt(first.patient.age, 10)} ปี / ${first.patient.sex}`}
          {' · '}เก็บตัวอย่าง {first.orderedAt} · {first.location}
        </div>
      </div>

      {/* The thesis. Stated in words, not a gauge — a sentence is what the
          patient will repeat to their family. */}
      <div
        style={{
          marginTop: '5mm',
          padding: '4mm 5mm',
          border: `0.4mm solid ${outside > 0 ? WATCH : IN_RANGE}`,
          background: outside > 0 ? '#FFF9F3' : 'var(--brand-p50, #F4FBF8)',
        }}
      >
        <div style={{ fontFamily: "'Sarabun', sans-serif", fontSize: '11pt', fontWeight: 600, lineHeight: 1.4 }}>
          {outside === 0
            ? `ผลตรวจ ${total} ค่า อยู่ในเกณฑ์ทั้งหมด`
            : `ผลตรวจ ${total} ค่า อยู่ในเกณฑ์ ${total - outside} ค่า และมี ${outside} ค่าที่อยู่นอกเกณฑ์`}
        </div>
        {outside > 0 && (
          <div style={{ fontFamily: "'Sarabun', sans-serif", fontSize: '9pt', color: INK, marginTop: '1.2mm', lineHeight: 1.45 }}>
            ค่าที่อยู่นอกเกณฑ์: <strong>{[...new Set(attention)].join(' · ')}</strong>
            <br />
            ค่าที่อยู่นอกเกณฑ์ไม่ได้แปลว่าเจ็บป่วยเสมอไป แพทย์จะอ่านผลร่วมกับอาการและประวัติของท่าน
          </div>
        )}
      </div>

      {/* The values. */}
      {[...byGroup.entries()].map(([groupKey, groupRows]) => {
        const group = LAB_GROUPS.find((g) => g.key === groupKey);
        return (
          <div key={groupKey} style={{ marginTop: '6mm' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3mm',
                paddingBottom: '1.4mm',
                borderBottom: `0.4mm solid ${INK}`,
              }}
            >
              <span style={{ fontFamily: "'Sarabun', sans-serif", fontSize: '9.5pt', fontWeight: 700, letterSpacing: '0.02em' }}>
                {group?.thai ?? 'ผลตรวจอื่น ๆ'}
              </span>
              <span style={{ fontFamily: "'Sarabun', sans-serif", fontSize: '7pt', color: '#8A938E', letterSpacing: '0.06em' }}>
                {group?.code ?? ''}
              </span>
            </div>

            {groupRows.map((r) => {
              const test = LAB_TEST_BY_ID[r.testId];
              return (
                <div key={r.id}>
                  {/* The ordered test's own name, for the patient to quote
                      back at another clinic. Only shown for panels, where
                      the values below are members of something named. */}
                  {test?.type === 'panel' && (
                    <div style={{ fontFamily: "'Sarabun', sans-serif", fontSize: '8pt', fontWeight: 600, color: '#6B746F', marginTop: '3mm' }}>
                      {test.nameTh} ({test.nameEn})
                    </div>
                  )}
                  {(test?.analytes ?? []).map((a) => {
                    const raw = r.results[a.key];
                    if (raw == null) return null;
                    return (
                      <ValueRow key={`${r.id}-${a.key}`} test={test} analyte={a} raw={raw} patient={r.patient} />
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Footer. Certification, then the one thing the patient should do. */}
      <div style={{ marginTop: '8mm', paddingTop: '3mm', borderTop: `0.6mm solid ${INK}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6mm', fontFamily: "'Sarabun', sans-serif", fontSize: '7.5pt', color: '#5B6560' }}>
          <div style={{ flex: 1 }}>
            รับรองผลโดย {first.approvedBy ?? '—'}
            {first.approvedAt ? ` · ${first.approvedAt}` : ''}
            <br />
            แพทย์ผู้สั่งตรวจ {first.doctor}
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            สอบถามผลตรวจ โทร 0-2245-XXXX ในวันและเวลาราชการ
            <br />
            นำใบนี้มาด้วยทุกครั้งเมื่อพบแพทย์
          </div>
        </div>
        <div style={{ fontFamily: "'Sarabun', sans-serif", fontSize: '7pt', color: '#8A938E', marginTop: '2.5mm', lineHeight: 1.4 }}>
          ใบรายงานผลนี้ใช้ประกอบการวินิจฉัยของแพทย์เท่านั้น ไม่ใช่การวินิจฉัยโรคด้วยตนเอง ·
          ช่วงค่าปกติอาจต่างกันตามเพศ อายุ และวิธีตรวจของแต่ละห้องปฏิบัติการ
        </div>
      </div>
    </div>
  );
};

export default LabPatientReport;
