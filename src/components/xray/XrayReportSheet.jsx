import React, { useEffect } from 'react';
import { XRAY_REQUEST_TYPES } from '@/data/xrayOrders';

/* ─────────────────────────────────────────────────────────────────────────
   XrayReportSheet — the printed paperwork of งานรังสีวินิจฉัย.

   One masthead system, four formats (`variant`):

     report      ใบรายงานผลการตรวจทางรังสีวิทยา   (TOR §1.12.6.5)
     request     ใบส่งตรวจทางรังสีวิทยา            (legacy manual §2.1 item 11)
     appointment ใบนัดตรวจรังสี                    (§2.1 item 11 · patient-facing)
     filmLabel   ฉลากติดซองฟิล์ม                   (§2.1 item 11 · 70×40 mm)

   Design thesis — the ONE job of the result sheet is: let the ordering
   clinician find the IMPRESSION in about two seconds, and prove who read
   the study and when. Most hospital printouts bury the impression at the
   bottom in the same 10 pt type as the rest, so here it is the hero: an
   ink spine down its left edge, two type steps larger than FINDINGS, and
   the ประเภทผลตรวจ set beside it as a ruled **stamp** rather than a coloured
   pill — colour dies on the mono laser printers these centres actually own,
   so the classification is carried by a border, a label and (for
   ผิดปกติเร่งด่วน) a double rule. Section eyebrows are TECHNIQUE → FINDINGS
   → IMPRESSION, the order a radiologist dictates in; everything
   administrative stays Thai. No 01/02/03 markers — a report is not a
   sequence, so numbering them would encode something untrue.

   The deliberate risk: a report that has been written but NOT yet verified
   prints a large rotated "ฉบับร่าง · DRAFT" ghost behind the body. An
   unverified read is not clinically citable (§1.12.6.3), and a sheet that
   looks final when it isn't is the kind of thing that ends up in a chart.

   ── Why this file opts out of theming ──────────────────────────────────
   Paper has no dark mode. If the sheet aliased `--surface-card-100` /
   `--text-content-default`, then under `[data-mode="dark"]` the preview
   would render near-white ink on a dark sheet and print almost blank. So
   PAPER/INK/RULE below are pinned to the **light-mode values of the very
   tokens they mirror** — they are not new colours:

     PAPER  #FFFFFF = --surface-card-100      (light)
     INK    #363B3F = --text-content-default  (light)
     INK_2  #636B72 = --text-content-secondary
     INK_3  #858C92 = --text-content-tertiary
     RULE   #E2E4E6 = --border-neutral-tertiary

   Proposed follow-up for `@mih/design-tokens` (NOT added here — that repo
   is read-only from this one): a print medium set — `--print-paper`,
   `--print-ink`, `--print-ink-soft`, `--print-rule` — so this component can
   alias tokens like everything else. Everything that is not ink or paper
   (space, radius, stroke, type size, weight, family) still aliases tokens.

   Millimetre values (`@page`, the film-label box) are medium geometry, not
   style: there is no token scale for physical paper, and there shouldn't be.

   ── Printing ──────────────────────────────────────────────────────────
   This component renders only the sheet. Hiding the surrounding app while
   printing stays with the host page, which already owns that trick (see
   `.mih-xray-print-area` in XrayResultPage / XrayDetailPanel). Wrap the
   sheet in that print area and call `window.print()`.
   ───────────────────────────────────────────────────────────────────── */

const PAPER = '#FFFFFF';
const INK = '#363B3F';
const INK_2 = '#636B72';
const INK_3 = '#858C92';
const RULE = '#E2E4E6';

const AGENCY = 'สำนักอนามัย กรุงเทพมหานคร';

/* ลักษณะการขอตรวจ arrives on the row as a key (`walkin` / `appointment`);
   resolve it here rather than expecting every caller to pass a label. */
const REQUEST_TYPE_LABEL = Object.fromEntries(
  XRAY_REQUEST_TYPES.map((t) => [t.key, t.thai]),
);

const DOC_TITLE = {
  report: 'ใบรายงานผลการตรวจทางรังสีวิทยา',
  request: 'ใบส่งตรวจทางรังสีวิทยา',
  appointment: 'ใบนัดตรวจทางรังสีวิทยา',
  filmLabel: 'ฉลากติดซองฟิล์ม',
};

/* Print rules live in a stylesheet rather than inline style because
   `@page`, `@media print` and `break-inside` cannot be expressed inline.
   Injection is idempotent so HMR replaces the tag instead of stacking
   copies — same pattern as AISearch.jsx per CLAUDE.md. */
const SHEET_STYLE_ID = 'mih-xray-sheet-style';
const SHEET_CSS = `
@page { size: A4 portrait; margin: 12mm; }
.mih-xray-sheet {
  color: ${INK};
  background: ${PAPER};
  font-family: var(--type-family-body);
}
/* Keep a section and its heading together, and never split the impression
   block or the signature band across two pages — a radiology report whose
   impression starts on page 2 is a misread waiting to happen. */
.mih-xray-sheet .mih-xray-sheet-block { break-inside: avoid; page-break-inside: avoid; }
.mih-xray-sheet .mih-xray-sheet-eyebrow { break-after: avoid; page-break-after: avoid; }
@media print {
  .mih-xray-sheet {
    box-shadow: none !important;
    border: 0 !important;
    width: auto !important;
    min-height: 0 !important;
    padding: 0 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* The draft ghost must survive "background graphics off" — it is text,
     not a background image, precisely so it still prints. */
  .mih-xray-sheet-draft { color: ${RULE} !important; }
}
`;

const injectSheetStyles = () => {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(SHEET_STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = SHEET_STYLE_ID;
    document.head.appendChild(el);
  }
  if (el.textContent !== SHEET_CSS) el.textContent = SHEET_CSS;
};

/* ── type roles ─────────────────────────────────────────────────────────
   The system ships one family (Sarabun), so personality has to come from
   the scale, weight and tracking rather than from a second typeface.
   Eyebrows are the only uppercase text and they are Latin only — ALL CAPS
   Thai is unreadable and is banned by the UX gates. */
const eyebrow = {
  margin: 0,
  color: INK_2,
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xxs, 10px)',
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
};

const fieldLabel = {
  margin: 0,
  color: INK_3,
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xxs, 10px)',
  fontWeight: 'var(--type-weight-medium, 500)',
  letterSpacing: '0.04em',
};

const fieldValue = {
  margin: 0,
  color: INK,
  fontFamily: 'var(--type-family-heading-content)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
  lineHeight: 1.45,
};

const bodyText = {
  margin: 0,
  color: INK,
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.7,
  whiteSpace: 'pre-line',
};

const microText = {
  margin: 0,
  color: INK_3,
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xxs, 10px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.6,
};

const dash = (v) => (v === 0 ? '0' : (v || '—'));
/* Joins the parts of a compound field. Drops empties AND the data layer's
   own '—' placeholder, so an ultrasound (no ท่าถ่าย) prints
   "ช่องท้อง / KUB" rather than "ช่องท้อง / KUB · —", which reads as broken
   data on paper. */
const joinParts = (parts, sep = ' · ') =>
  parts.filter((p) => p && p !== '—').join(sep) || null;
const baht = (n) => (typeof n === 'number' ? n.toLocaleString('th-TH') : '—');

/* ── shared pieces ─────────────────────────────────────────────────────── */

const Eyebrow = ({ children }) => (
  <div
    className='mih-xray-sheet-eyebrow flex flex-col w-full'
    style={{ gap: 'var(--dim-space-100, 4px)' }}
  >
    <span style={eyebrow}>{children}</span>
    <div style={{ height: 'var(--dim-stroke-100, 1px)', background: RULE }} aria-hidden />
  </div>
);

const Field = ({ label, value, span = 1 }) => (
  <div
    className='flex flex-col min-w-0'
    style={{ gap: 'var(--dim-space-050, 2px)', gridColumn: `span ${span}` }}
  >
    <span style={fieldLabel}>{label}</span>
    <span style={fieldValue}>{dash(value)}</span>
  </div>
);

/* Masthead + the single ornament of the whole sheet: a 3px double rule.
   Thai government forms use a double rule under the letterhead, so it reads
   as "official document" without adding anything decorative. */
const Masthead = ({ variant, center, docNo, printedAt }) => (
  <div
    className='mih-xray-sheet-block flex flex-col w-full'
    style={{ gap: 'var(--dim-space-300, 12px)' }}
  >
    <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <span style={{ ...microText, color: INK_2, letterSpacing: '0.08em' }}>{AGENCY}</span>
        <span style={{
          margin: 0,
          color: INK,
          fontFamily: 'var(--type-family-heading-content)',
          fontSize: 'var(--type-size-base, 16px)',
          fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
          lineHeight: 1.4,
        }}>
          {center || 'ศูนย์บริการสาธารณสุข'}
        </span>
      </div>
      <div className='flex flex-col items-end' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <span style={{
          margin: 0,
          color: INK,
          fontFamily: 'var(--type-family-heading-content)',
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
        }}>
          {DOC_TITLE[variant] || DOC_TITLE.report}
        </span>
        {docNo ? <span style={microText}>เลขที่เอกสาร {docNo}</span> : null}
        {printedAt ? <span style={microText}>พิมพ์เมื่อ {printedAt}</span> : null}
      </div>
    </div>
    <div style={{ borderTop: `3px double ${INK}` }} aria-hidden />
  </div>
);

const IdentityGrid = ({ patient, order, columns = 4 }) => (
  <div
    className='mih-xray-sheet-block w-full'
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      gap: 'var(--dim-space-400, 16px)',
      paddingTop: 'var(--dim-space-300, 12px)',
      paddingBottom: 'var(--dim-space-300, 12px)',
      borderBottom: `var(--dim-stroke-100, 1px) solid ${RULE}`,
    }}
  >
    <Field label='ผู้รับบริการ' value={patient?.fullName} />
    <Field label='เลข HN' value={patient?.hn} />
    <Field
      label='อายุ / เพศ'
      value={joinParts([patient?.age, patient?.sex])}
    />
    <Field label='สิทธิการรักษา' value={patient?.rightLabel || order?.rightLabel} />
  </div>
);

/* The ประเภทผลตรวจ stamp (TOR §1.12.6.9). Ruled, not coloured: these
   sheets print on mono lasers, so the classification has to survive
   greyscale. ผิดปกติเร่งด่วน gets the double rule + the escalation line —
   the one place the sheet raises its voice. */
const ResultStamp = ({ label, urgent }) => (
  <div
    className='flex flex-col'
    style={{
      gap: 'var(--dim-space-100, 4px)',
      minWidth: '132px',
      paddingTop: 'var(--dim-space-200, 8px)',
      paddingRight: 'var(--dim-space-300, 12px)',
      paddingBottom: 'var(--dim-space-200, 8px)',
      paddingLeft: 'var(--dim-space-300, 12px)',
      border: urgent ? `3px double ${INK}` : `var(--dim-stroke-100, 1px) solid ${INK}`,
      borderRadius: 'var(--dim-radius-100, 4px)',
    }}
  >
    <span style={{ ...fieldLabel, color: INK_2 }}>ผลการอ่าน</span>
    <span style={{
      margin: 0,
      color: INK,
      fontFamily: 'var(--type-family-heading-content)',
      fontSize: 'var(--type-size-base, 16px)',
      fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
      lineHeight: 1.3,
    }}>
      {label || 'ยังไม่ระบุ'}
    </span>
    {urgent ? (
      <span style={{ ...microText, color: INK }}>แจ้งแพทย์ผู้ส่งตรวจแล้ว</span>
    ) : null}
  </div>
);

const DraftGhost = () => (
  <span
    className='mih-xray-sheet-draft'
    aria-hidden
    style={{
      position: 'absolute',
      top: '42%',
      left: '50%',
      transform: 'translate(-50%, -50%) rotate(-24deg)',
      color: RULE,
      fontFamily: 'var(--type-family-heading-content)',
      fontSize: '64px',
      fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
      letterSpacing: '0.08em',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      userSelect: 'none',
    }}
  >
    ฉบับร่าง · DRAFT
  </span>
);

const SignatureLine = ({ role, name, license, at }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-150, 6px)', minWidth: 0 }}>
    <div style={{
      height: 'var(--dim-space-600, 24px)',
      borderBottom: `var(--dim-stroke-100, 1px) solid ${INK}`,
    }} aria-hidden />
    <span style={fieldLabel}>{role}</span>
    <span style={{ ...fieldValue, fontSize: 'var(--type-size-sm, 14px)' }}>{dash(name)}</span>
    {license ? <span style={microText}>เลขที่ใบอนุญาต {license}</span> : null}
    {at ? <span style={microText}>วันที่ {at}</span> : null}
  </div>
);

const SheetFooter = ({ note }) => (
  <div
    className='mih-xray-sheet-block flex items-end w-full'
    style={{
      gap: 'var(--dim-space-400, 16px)',
      paddingTop: 'var(--dim-space-300, 12px)',
      borderTop: `var(--dim-stroke-100, 1px) solid ${RULE}`,
    }}
  >
    <span style={{ ...microText, flex: 1, minWidth: 0 }}>
      {note || 'เอกสารนี้พิมพ์จากระบบสารสนเทศศูนย์บริการสาธารณสุข (PHCIS)'}
    </span>
    <span style={microText}>หน้า 1/1</span>
  </div>
);

/* ── variant: ใบรายงานผลการตรวจทางรังสีวิทยา ───────────────────────────── */

const ReportBody = ({ order }) => {
  const urgent = order?.resultType === 'abnormalUrgent';
  const amendments = Array.isArray(order?.amendments) ? order.amendments : [];
  const last = amendments[amendments.length - 1];

  return (
    <>
      <div
        className='mih-xray-sheet-block w-full'
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 'var(--dim-space-400, 16px)',
          paddingTop: 'var(--dim-space-300, 12px)',
          paddingBottom: 'var(--dim-space-300, 12px)',
          borderBottom: `var(--dim-stroke-100, 1px) solid ${RULE}`,
        }}
      >
        <Field label='เลข XN' value={order?.xn} />
        <Field label='รายการตรวจ' value={order?.examLabel} span={2} />
        <Field
          label='ตำแหน่ง / ท่าถ่าย'
          value={joinParts([order?.regionLabel, order?.view])}
        />
        <Field label='คลินิกที่ขอตรวจ' value={order?.orderingLocation} />
        <Field label='แพทย์ผู้ส่งตรวจ' value={order?.orderedBy} />
        <Field label='วันเวลาที่ถ่าย' value={order?.performedAt} />
        <Field label='ผู้ถ่ายภาพรังสี' value={order?.radiographer} />
      </div>

      {/* Clinical context the reader was given — a report without the
          indication is hard to audit later (§1.12.5.3). */}
      {(order?.clinicalSummary || order?.diagnosis) ? (
        <div className='mih-xray-sheet-block flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <Eyebrow>Clinical indication</Eyebrow>
          <p style={bodyText}>{dash(order?.clinicalSummary)}</p>
          {order?.diagnosis ? (
            <p style={{ ...microText, color: INK_2 }}>การวินิจฉัยที่ส่งมา: {order.diagnosis}</p>
          ) : null}
        </div>
      ) : null}

      <div className='mih-xray-sheet-block flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <Eyebrow>Technique</Eyebrow>
        <p style={bodyText}>{dash(order?.technique)}</p>
      </div>

      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <Eyebrow>Findings</Eyebrow>
        <p style={bodyText}>{dash(order?.findings)}</p>
      </div>

      {/* The hero. Ink spine + two type steps up + the stamp in the margin. */}
      <div
        className='mih-xray-sheet-block flex items-start w-full'
        style={{
          gap: 'var(--dim-space-500, 20px)',
          paddingTop: 'var(--dim-space-300, 12px)',
        }}
      >
        <div
          className='flex-1 min-w-0 flex flex-col'
          style={{
            gap: 'var(--dim-space-200, 8px)',
            paddingLeft: 'var(--dim-space-400, 16px)',
            borderLeft: `var(--dim-stroke-200, 2px) solid ${INK}`,
          }}
        >
          <Eyebrow>Impression</Eyebrow>
          <p style={{
            ...bodyText,
            fontSize: 'var(--type-size-lg, 18px)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
            lineHeight: 1.55,
          }}>
            {dash(order?.impression)}
          </p>
        </div>
        <ResultStamp label={order?.resultTypeLabel} urgent={urgent} />
      </div>

      {/* §1.12.6.3 — a printed report that hides its amendment history is a
          record-integrity problem, so the sheet always declares it. */}
      {amendments.length > 0 ? (
        <div
          className='mih-xray-sheet-block flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-100, 4px)',
            paddingTop: 'var(--dim-space-200, 8px)',
            paddingRight: 'var(--dim-space-300, 12px)',
            paddingBottom: 'var(--dim-space-200, 8px)',
            paddingLeft: 'var(--dim-space-300, 12px)',
            border: `var(--dim-stroke-100, 1px) solid ${INK}`,
            borderRadius: 'var(--dim-radius-100, 4px)',
          }}
        >
          <span style={{ ...fieldLabel, color: INK_2 }}>ประวัติการแก้ไขผล</span>
          <span style={{ ...bodyText, fontSize: 'var(--type-size-xs, 12px)' }}>
            {`รายงานฉบับนี้มีการแก้ไข ${amendments.length} ครั้ง`}
            {last ? ` · ครั้งล่าสุด ${dash(last.at)} โดย ${dash(last.by)}` : ''}
            {last?.reason ? ` — ${last.reason}` : ''}
          </span>
        </div>
      ) : null}

      <div
        className='mih-xray-sheet-block w-full'
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 'var(--dim-space-800, 32px)',
          paddingTop: 'var(--dim-space-600, 24px)',
        }}
      >
        <SignatureLine
          role='แพทย์ผู้อ่านผล'
          name={order?.radiologist}
          license={order?.radiologistLicense}
          at={order?.verifiedAt || order?.reportedAt}
        />
        <SignatureLine role='ผู้รับรองสำเนา / เจ้าหน้าที่' />
      </div>
    </>
  );
};

/* ── variant: ใบส่งตรวจทางรังสีวิทยา ───────────────────────────────────── */

const ExamTable = ({ items, totals }) => (
  <div className='mih-xray-sheet-block flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <Eyebrow>Requested examinations</Eyebrow>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['รายการตรวจ', 'ตำแหน่ง', 'ท่าถ่าย', 'ราคา', 'เบิกได้', 'ผู้ป่วยจ่าย'].map((h, i) => (
            <th
              key={h}
              scope='col'
              style={{
                ...fieldLabel,
                textAlign: i >= 3 ? 'right' : 'left',
                paddingTop: 'var(--dim-space-150, 6px)',
                paddingBottom: 'var(--dim-space-150, 6px)',
                borderBottom: `var(--dim-stroke-100, 1px) solid ${INK}`,
                whiteSpace: 'nowrap',
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={it.id || it.examId || i}>
            <td style={{ ...bodyText, fontSize: 'var(--type-size-xs, 12px)', paddingTop: 'var(--dim-space-150, 6px)', paddingBottom: 'var(--dim-space-150, 6px)', borderBottom: `var(--dim-stroke-100, 1px) solid ${RULE}` }}>
              {it.name}
              {it.code ? <span style={{ ...microText, marginLeft: 'var(--dim-space-150, 6px)' }}>{it.code}</span> : null}
            </td>
            <td style={{ ...bodyText, fontSize: 'var(--type-size-xs, 12px)', paddingTop: 'var(--dim-space-150, 6px)', paddingBottom: 'var(--dim-space-150, 6px)', borderBottom: `var(--dim-stroke-100, 1px) solid ${RULE}` }}>{dash(it.regionLabel)}</td>
            <td style={{ ...bodyText, fontSize: 'var(--type-size-xs, 12px)', paddingTop: 'var(--dim-space-150, 6px)', paddingBottom: 'var(--dim-space-150, 6px)', borderBottom: `var(--dim-stroke-100, 1px) solid ${RULE}` }}>{dash(it.view)}</td>
            {[it.price, it.claim, it.patientPay].map((n, j) => (
              <td
                key={j}
                style={{ ...bodyText, fontSize: 'var(--type-size-xs, 12px)', textAlign: 'right', whiteSpace: 'nowrap', paddingTop: 'var(--dim-space-150, 6px)', paddingBottom: 'var(--dim-space-150, 6px)', borderBottom: `var(--dim-stroke-100, 1px) solid ${RULE}` }}
              >
                {baht(n)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {totals ? (
        <tfoot>
          <tr>
            <td colSpan={3} style={{ ...fieldValue, fontSize: 'var(--type-size-xs, 12px)', paddingTop: 'var(--dim-space-200, 8px)' }}>
              รวมทั้งหมด
            </td>
            {[totals.total, totals.claimTotal, totals.patientPay].map((n, j) => (
              <td key={j} style={{ ...fieldValue, fontSize: 'var(--type-size-xs, 12px)', textAlign: 'right', whiteSpace: 'nowrap', paddingTop: 'var(--dim-space-200, 8px)' }}>
                {baht(n)}
              </td>
            ))}
          </tr>
        </tfoot>
      ) : null}
    </table>
  </div>
);

const RequestBody = ({ order, items, totals }) => (
  <>
    <div
      className='mih-xray-sheet-block w-full'
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 'var(--dim-space-400, 16px)',
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        borderBottom: `var(--dim-stroke-100, 1px) solid ${RULE}`,
      }}
    >
      <Field label='เลข XN' value={order?.xn} />
      <Field label='คลินิกที่ขอตรวจ' value={order?.orderingLocation} />
      <Field label='แพทย์ผู้ส่งตรวจ' value={order?.orderedBy} />
      <Field label='ความเร่งด่วน' value={order?.urgencyLabel} />
      <Field
        label='ลักษณะการขอตรวจ'
        value={order?.requestTypeLabel || REQUEST_TYPE_LABEL[order?.requestType]}
      />
      <Field label='วันเวลาส่ง / นัด' value={order?.scheduledAt || order?.orderedAt} />
      <Field label='วันเวลาที่บันทึกขอ' value={order?.orderedAt} />
    </div>

    {/* Pre-exposure screening — the questions a radiographer must not have
        to ask twice at the door (§1.12.5.3). */}
    <div className='mih-xray-sheet-block flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      <Eyebrow>Pre-exposure screening</Eyebrow>
      <div
        className='w-full'
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--dim-space-300, 12px)' }}
      >
        <Field
          label='ประวัติการแพ้'
          value={order?.allergy?.has
            ? joinParts([order.allergy.agent, order.allergy.symptom], ' — ') || 'มีประวัติแพ้'
            : 'ไม่มีประวัติแพ้'}
        />
        {/* A bare '—' next to a real answer reads as missing data. When the
            question does not apply, say that instead. */}
        <Field
          label='ประจำเดือน / การตั้งครรภ์'
          value={order?.pregnancy?.status
            ? joinParts([order.pregnancy.status, order.pregnancy.lmp && `LMP ${order.pregnancy.lmp}`])
            : 'ไม่ต้องคัดกรอง'}
        />
      </div>
      <p style={{ ...bodyText, fontSize: 'var(--type-size-xs, 12px)' }}>
        อาการและผลการตรวจทางคลินิกโดยย่อ: {dash(order?.clinicalSummary)}
      </p>
      {order?.diagnosis ? (
        <p style={{ ...bodyText, fontSize: 'var(--type-size-xs, 12px)' }}>การวินิจฉัย: {order.diagnosis}</p>
      ) : null}
    </div>

    <ExamTable items={items} totals={totals} />

    {order?.note ? (
      <div className='mih-xray-sheet-block flex flex-col w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
        <Eyebrow>Note</Eyebrow>
        <p style={{ ...bodyText, fontSize: 'var(--type-size-xs, 12px)' }}>{order.note}</p>
      </div>
    ) : null}

    <div
      className='mih-xray-sheet-block w-full'
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 'var(--dim-space-800, 32px)',
        paddingTop: 'var(--dim-space-600, 24px)',
      }}
    >
      <SignatureLine role='แพทย์ผู้ส่งตรวจ' name={order?.orderedBy} />
      <SignatureLine role='เจ้าหน้าที่รับ Request (งานรังสี)' />
    </div>
  </>
);

/* ── variant: ใบนัดตรวจรังสี (patient-facing) ──────────────────────────── */

const AppointmentBody = ({ order, items, center }) => {
  const preps = items.map((it) => it.prep).filter(Boolean);
  return (
    <>
      {/* The patient holds this sheet. The one thing they must not get wrong
          is when and where, so that is the only thing set large. */}
      <div
        className='mih-xray-sheet-block flex flex-col w-full'
        style={{
          gap: 'var(--dim-space-100, 4px)',
          paddingTop: 'var(--dim-space-400, 16px)',
          paddingBottom: 'var(--dim-space-400, 16px)',
          borderBottom: `var(--dim-stroke-100, 1px) solid ${RULE}`,
        }}
      >
        <span style={fieldLabel}>วัน–เวลาที่นัดตรวจ</span>
        {/* The hero is only a hero when there is something in it — an empty
            24px slot reads as a printing fault, so an un-scheduled order
            says so at body size instead. */}
        {order?.scheduledAt ? (
          <span style={{
            margin: 0,
            color: INK,
            fontFamily: 'var(--type-family-heading-content)',
            fontSize: 'var(--type-size-2xl, 24px)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
            lineHeight: 1.3,
          }}>
            {order.scheduledAt}
          </span>
        ) : (
          <span style={{ ...bodyText, fontSize: 'var(--type-size-sm, 14px)' }}>
            ยังไม่ได้กำหนดวันเวลานัด — โปรดติดต่อเจ้าหน้าที่งานรังสีเพื่อนัดวันตรวจ
          </span>
        )}
        <span style={{ ...bodyText, fontSize: 'var(--type-size-sm, 14px)' }}>
          {`ห้องตรวจรังสีวินิจฉัย · ${center || 'ศูนย์บริการสาธารณสุข'}`}
        </span>
      </div>

      <div className='mih-xray-sheet-block flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <Eyebrow>Examinations</Eyebrow>
        <ul style={{ margin: 0, paddingLeft: 'var(--dim-space-500, 20px)' }}>
          {items.map((it, i) => (
            <li key={it.id || it.examId || i} style={{ ...bodyText, fontSize: 'var(--type-size-sm, 14px)' }}>
              {it.name}
              {it.regionLabel ? ` · ${it.regionLabel}` : ''}
            </li>
          ))}
        </ul>
      </div>

      {preps.length > 0 ? (
        <div
          className='mih-xray-sheet-block flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-200, 8px)',
            paddingTop: 'var(--dim-space-300, 12px)',
            paddingRight: 'var(--dim-space-400, 16px)',
            paddingBottom: 'var(--dim-space-300, 12px)',
            paddingLeft: 'var(--dim-space-400, 16px)',
            border: `var(--dim-stroke-100, 1px) solid ${INK}`,
            borderRadius: 'var(--dim-radius-200, 8px)',
          }}
        >
          <span style={{ ...fieldLabel, color: INK_2 }}>สิ่งที่ต้องเตรียมก่อนมาตรวจ</span>
          <ul style={{ margin: 0, paddingLeft: 'var(--dim-space-500, 20px)' }}>
            {preps.map((p, i) => (
              <li key={i} style={{ ...bodyText, fontSize: 'var(--type-size-sm, 14px)' }}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p style={{ ...bodyText, fontSize: 'var(--type-size-sm, 14px)' }}>
        โปรดนำใบนัดนี้มาแสดงที่จุดคัดกรอง และมาก่อนเวลานัดประมาณ 15 นาที
        หากต้องการเลื่อนนัด โปรดติดต่อศูนย์บริการสาธารณสุขล่วงหน้า
      </p>
    </>
  );
};

/* ── variant: ฉลากติดซองฟิล์ม ──────────────────────────────────────────── */

const FilmLabel = ({ patient, order, printedAt }) => (
  <div
    className='mih-xray-sheet mih-xray-sheet-block flex flex-col'
    style={{
      width: '70mm',
      minHeight: '40mm',
      gap: 'var(--dim-space-100, 4px)',
      paddingTop: 'var(--dim-space-300, 12px)',
      paddingRight: 'var(--dim-space-300, 12px)',
      paddingBottom: 'var(--dim-space-300, 12px)',
      paddingLeft: 'var(--dim-space-300, 12px)',
      border: `var(--dim-stroke-100, 1px) solid ${INK}`,
      borderRadius: 'var(--dim-radius-100, 4px)',
      background: PAPER,
      color: INK,
    }}
  >
    <span style={{ ...microText, letterSpacing: '0.08em' }}>{AGENCY}</span>
    <span style={{ ...fieldValue, fontSize: 'var(--type-size-sm, 14px)' }}>{dash(patient?.fullName)}</span>
    <span style={{ ...bodyText, fontSize: 'var(--type-size-xs, 12px)' }}>HN {dash(patient?.hn)}</span>
    {/* Reserved for a real Code128 of the XN — the digits are printed large
        and letterspaced so the label is usable by eye until a barcode
        renderer is added (no such dependency exists on this branch). */}
    <span style={{
      margin: 0,
      color: INK,
      fontFamily: 'var(--type-family-heading-content)',
      fontSize: 'var(--type-size-lg, 18px)',
      fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
      letterSpacing: '0.14em',
    }}>
      {dash(order?.xn)}
    </span>
    <span style={{ ...bodyText, fontSize: 'var(--type-size-xs, 12px)' }}>{dash(order?.examLabel)}</span>
    <span style={microText}>{dash(printedAt)}</span>
  </div>
);

/* ── the sheet ─────────────────────────────────────────────────────────── */

/**
 * @param {'report'|'request'|'appointment'|'filmLabel'} variant
 * @param {object} order    row-shaped order (see src/data/xrayOrders.js), ideally
 *                          passed through `withExamLabel` so the *Label fields exist
 * @param {object} patient  { hn, fullName, age, sex, rightLabel }
 * @param {Array}  items    request/appointment line items:
 *                          [{ id, name, code, regionLabel, view, price, claim, patientPay, prep }]
 * @param {object} totals   { total, claimTotal, patientPay }
 * @param {string} center   health-centre name for the masthead
 * @param {string} printedAt
 */
const XrayReportSheet = ({
  variant = 'report',
  order,
  patient,
  items = [],
  totals,
  center,
  printedAt,
}) => {
  useEffect(injectSheetStyles, []);

  if (variant === 'filmLabel') {
    return <FilmLabel patient={patient} order={order} printedAt={printedAt} />;
  }

  /* A report that has been written but not verified is not citable — say so
     on the paper itself (§1.12.6.3). */
  const isDraft = variant === 'report' && order?.status === 'reported';

  return (
    <article
      className='mih-xray-sheet flex flex-col'
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '210mm',
        gap: 'var(--dim-space-400, 16px)',
        paddingTop: 'var(--dim-space-800, 32px)',
        paddingRight: 'var(--dim-space-800, 32px)',
        paddingBottom: 'var(--dim-space-800, 32px)',
        paddingLeft: 'var(--dim-space-800, 32px)',
        background: PAPER,
        color: INK,
      }}
      aria-label={DOC_TITLE[variant] || DOC_TITLE.report}
    >
      {isDraft ? <DraftGhost /> : null}

      <Masthead
        variant={variant}
        center={center}
        docNo={order?.xn}
        printedAt={printedAt}
      />

      <IdentityGrid patient={patient} order={order} />

      {variant === 'report' ? <ReportBody order={order} /> : null}
      {variant === 'request' ? <RequestBody order={order} items={items} totals={totals} /> : null}
      {variant === 'appointment' ? (
        <AppointmentBody order={order} items={items} center={center} />
      ) : null}

      <SheetFooter
        note={isDraft
          ? 'ฉบับร่าง — ยังไม่ได้ยืนยันผล ไม่ใช้อ้างอิงทางคลินิก'
          : undefined}
      />
    </article>
  );
};

export default XrayReportSheet;
