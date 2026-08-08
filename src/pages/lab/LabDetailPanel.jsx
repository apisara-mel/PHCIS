import React, { useState } from 'react';
import Alert from '@/components/alert/Alert';
import Badge from '@/components/badge/Badge';
import XCloseButton from '@/components/button/XCloseButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { Icon } from '@/components/icons/Icon';
import { LAB_STATUS_BY_KEY } from '@/data/labOrders';
import { LAB_TEST_BY_ID, resolveAnalyteRange } from '@/data/labCatalog';
import LabTubeDot from '@/pages/lab/LabTubeDot';

/* Print scoping — TOR §1.15.6.3's print button used to call bare
   window.print(), which printed the whole app chrome (sidebar/header/
   table) since nothing told the browser to isolate just the result.
   Idempotent stylesheet injection, same pattern as the "no browser-
   default input chrome" convention elsewhere in this project: on
   @media print, hide everything except `.mih-lab-print-area`, and hide
   `.no-print` elements (the print button itself) even inside that area. */
if (typeof document !== 'undefined') {
  const styleId = 'mih-lab-print-style';
  const css = `
@media print {
  body * { visibility: hidden !important; }
  .mih-lab-print-area, .mih-lab-print-area * { visibility: visible !important; }
  .mih-lab-print-area { position: fixed; inset: 0; padding: 24px; }
  .mih-lab-print-area .no-print { display: none !important; }
}
`;
  let el = document.getElementById(styleId);
  if (!el) {
    el = document.createElement('style');
    el.id = styleId;
    document.head.appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
}

/* Detail panel + trend-chart shown alongside LabQueuePage's table when a
   row is selected.

   Covers TOR ภาคผนวก ก §1.15:
     §1.15.4.9 — STAT urgency badge next to the test title; specimen +
                 price shown in the meta line.
     §1.15.4.6 — "ผลผิดปกติ" (abnormal, non-critical) alert — same Alert
                 component as the critical banner, `type='warning'` instead
                 of `type='error'`, shown only when NOT critical (critical
                 already implies/supersedes abnormal).
     §1.15.3.2 — reference range resolved per patient sex/age via
                 `resolveReferenceRange()` instead of a single flat string.
     §1.15.2.4 — "ปกปิดผลการตรวจที่เป็นความลับ" — confidential results
                 (e.g. Anti-HIV) render masked behind a reveal toggle.
     §1.15.6.3 — "สามารถพิมพ์ผลตรวจได้" — print button, enabled only once
                 a result exists and (for confidential rows) is revealed.
     §1.15.4.9 — "ข้อมูลยอดรวมทั้งหมด" — total scoped to the ONE order this
                 test belongs to (`orderItemCount` / `orderTotal` props from
                 LabQueuePage), not the whole table — see that file's
                 comment on `orderSiblings` for why. */

/* Status label comes from the single pipeline definition in labOrders.js so
   this panel can never drift out of step with the worklist's tabs. */
const statusLabel = (key) => LAB_STATUS_BY_KEY[key]?.label ?? key;

const CHART_W = 420;
const CHART_H = 160;
const PAD_L = 32;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 28;

export const TrendChart = ({ points }) => {
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const plotW = CHART_W - PAD_L - PAD_R;
  const plotH = CHART_H - PAD_T - PAD_B;

  const coords = points.map((p, i) => {
    const x = PAD_L + (plotW * i) / Math.max(1, points.length - 1);
    const y = PAD_T + plotH - ((p.value - min) / span) * plotH;
    return { ...p, x, y };
  });
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

  return (
    <svg width='100%' viewBox={`0 0 ${CHART_W} ${CHART_H}`} role='img' aria-label='แนวโน้มผลตรวจย้อนหลัง'>
      <rect x={0} y={0} width={CHART_W} height={CHART_H} rx={10} fill='var(--surface-chart-area)' />
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={CHART_H - PAD_B} stroke='var(--stroke-chart-grid)' strokeWidth={1} />
      <line x1={PAD_L} y1={CHART_H - PAD_B} x2={CHART_W - PAD_R} y2={CHART_H - PAD_B} stroke='var(--stroke-chart-grid)' strokeWidth={1} />
      <path d={path} fill='none' stroke='var(--stroke-chart-series-sbp)' strokeWidth={2} strokeLinejoin='round' strokeLinecap='round' />
      {coords.map((c) => (
        <circle key={c.date} cx={c.x} cy={c.y} r={3} fill='var(--stroke-chart-series-sbp)' />
      ))}
      {coords.map((c) => (
        <text
          key={`${c.date}-label`}
          x={c.x}
          y={CHART_H - 8}
          fontSize={9}
          textAnchor='middle'
          fill='var(--text-chart-axis-label)'
        >
          {c.date}
        </text>
      ))}
    </svg>
  );
};

const LabDetailPanel = ({
  order,
  onClose,
  onReveal,
  orderItemCount = 1,
  orderTotal = 0,
  emptyMessage = 'เลือกรายการทางซ้ายเพื่อดูรายละเอียด',
}) => {
  /* Reset per order — LabQueuePage passes `key={order.id}` on this
     component so a freshly-selected row always starts masked again. */
  const [revealed, setRevealed] = useState(false);

  if (!order) {
    return (
      <div className='flex-1 flex items-center justify-center' style={{ color: 'var(--text-content-tertiary)' }}>
        {emptyMessage}
      </div>
    );
  }
  const test = LAB_TEST_BY_ID[order.testId] ?? null;
  const masked = order.confidential && !revealed;
  /* "แพทย์จะดูได้ต่อเมื่อได้รับอนุมัติผล" — until a result is approved and
     released it is not a result the ward may act on, so the panel says so
     explicitly rather than showing a bare status word. */
  const awaitingApproval = order.status === 'approval';

  return (
    <div className='flex-1 flex flex-col' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
      {onClose && (
        <div className='flex justify-end no-print' style={{ marginBottom: 'calc(-1 * var(--dim-space-200))' }}>
          <XCloseButton onClick={onClose} ariaLabel='ปิดรายละเอียดผลตรวจ' />
        </div>
      )}
      {/* Printable region — everything below is what "พิมพ์ผลตรวจ" actually
          prints; the close button above and the print button itself
          (marked no-print) stay out of the printout. */}
      <div className='mih-lab-print-area flex-1 flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
      {order.critical && (
        <Alert
          type='error'
          iconName='warning'
          iconFill={1}
          title='ค่าวิกฤต (Critical value)'
          subtext={`แพทย์ผู้สั่งตรวจ — ${order.doctor}${order.status === 'reported' ? ' (ได้รับผลแล้ว)' : ''}`}
          showBadge={false}
          showIndicator={false}
          showDetail={false}
        />
      )}
      {/* Abnormal but not critical — TOR §1.15.4.6, own tone from critical. */}
      {!order.critical && order.abnormal && (
        <Alert
          type='warning'
          iconName='warning'
          iconFill={1}
          title='ผลผิดปกติ (Abnormal)'
          subtext='ค่าอยู่นอกช่วงอ้างอิงปกติ แต่ยังไม่ถึงระดับวิกฤต'
          showBadge={false}
          showIndicator={false}
          showDetail={false}
        />
      )}

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))', fontSize: 'var(--type-size-lg)', color: 'var(--text-content-default)' }}>
              {order.testLabel}
            </h2>
            {/* STAT urgency — TOR §1.15.4.9 "ความเร่งด่วน" */}
            {order.urgency === 'stat' && <Badge style='error' size='small'>STAT</Badge>}
          </div>
          {/* Print result — TOR §1.15.6.3 "สามารถพิมพ์ผลตรวจได้". Only
              meaningful once a result exists, and not while a confidential
              result is still masked. */}
          <BrandSubdueButton
            className='no-print'
            variant='outline'
            size='sm'
            leadingIcon='print'
            disabled={order.status !== 'reported' || masked}
            onClick={() => window.print()}
          >
            พิมพ์ผลตรวจ
          </BrandSubdueButton>
        </div>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
          {order.confidential ? 'ผู้ป่วยปกปิด' : order.patient.shortName} · HN {order.confidential ? '•••••' : order.patient.hn} · สั่งโดย {order.doctor} · {order.orderedAt}
        </span>
        {/* Accession + จุดสั่ง — the two things anyone phoning the lab about
            this specimen will be asked for. */}
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
          Accession: {order.accessionNo} · จุดสั่ง: {order.location}
          {test?.tmlt && <> · TMLT {test.tmlt}</>}
        </span>
        {/* Specimen + price — TOR §1.15.4.9 "สิ่งส่งตรวจ...ราคา". The tube is
            shown as its cap-colour swatch, the same one the worklist row
            renders, both resolved from the test's group. */}
        <span
          className='inline-flex items-center flex-wrap'
          style={{ gap: 'var(--dim-space-150)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}
        >
          {order.tube && (
            <>
              <LabTubeDot tube={order.tube} count={order.tubeCount} size={8} />
              <span>· {order.volumeMl} mL ·</span>
            </>
          )}
          <span>ราคา: {order.price?.toLocaleString('th-TH')} บาท</span>
        </span>
        {/* Order-level total — TOR §1.15.4.9 "ข้อมูลยอดรวมทั้งหมด", scoped
            to this ONE order (orderId), same order the doctor placed
            together — only shown when the order has more than one test,
            otherwise it would just repeat the price line above. */}
        {orderItemCount > 1 && (
          <span
            className='inline-flex items-center'
            style={{
              gap: 'var(--dim-space-100)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-medium)',
              color: 'var(--text-content-secondary)',
            }}
          >
            ยอดรวมของคำสั่ง {order.orderId} ({orderItemCount} รายการ): {orderTotal.toLocaleString('th-TH')} บาท
          </span>
        )}
      </div>

      <div
        className='flex flex-col'
        style={{
          background: 'var(--surface-card-200)',
          borderRadius: 'var(--dim-radius-300)',
          border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
          padding: 'var(--dim-space-400)',
          gap: 'var(--dim-space-150)',
        }}
      >
        <div className='flex items-center justify-between'>
          <span style={{ fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
            ผลตรวจ
          </span>
          {/* Confidential masking — TOR §1.15.2.4 "ปกปิดผลการตรวจที่เป็น
              ความลับได้ เช่น ผลการตรวจ Anti-HIV". Requires an explicit
              click to reveal; re-masks on the next row selection. */}
          {order.confidential && (
            <button
              type='button'
              onClick={() => setRevealed((v) => {
                const next = !v;
                if (next) onReveal?.(order);
                return next;
              })}
              className='inline-flex items-center no-print'
              style={{
                gap: 'var(--dim-space-100)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-brandPrimary-default)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                fontWeight: 'var(--type-weight-medium)',
              }}
            >
              <Icon name={revealed ? 'visibility_off' : 'visibility'} size={14} />
              {revealed ? 'ปกปิดผลตรวจ' : 'แสดงผลตรวจ (เป็นความลับ)'}
            </button>
          )}
        </div>
        {masked ? (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)', letterSpacing: 2 }}>
            ••••••••••
          </span>
        ) : order.resultSummary ? (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
            {order.resultSummary}
          </span>
        ) : (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
            {awaitingApproval
              ? 'ผลตรวจเสร็จแล้ว รอผู้มีสิทธิ์รับรองผล — แพทย์จะดูผลได้เมื่อรับรองแล้ว'
              : `รอผลตรวจ — สถานะปัจจุบัน: ${statusLabel(order.status)}`}
          </span>
        )}

        {/* Per-analyte breakdown. A panel like CBC or Electrolytes reports
            four values, each with its own unit and reference range, so a
            single summary string cannot carry the result — the team's
            two-level status ("status รวม และ status ย่อย") has a matching
            two-level RESULT, and this is that second level.
            TOR §1.15.3.2 — each range is resolved per patient sex/age. */}
        {!masked && test?.analytes?.length > 0 && order.results && (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)', marginTop: 'var(--dim-space-150)' }}>
            {test.analytes.map((a) => {
              const value = order.results[a.key];
              if (value == null) return null;
              const range = resolveAnalyteRange(a, order.patient);
              return (
                <div
                  key={a.key}
                  className='flex items-baseline justify-between'
                  style={{ gap: 'var(--dim-space-200)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}
                >
                  <span className='min-w-0 truncate' style={{ color: 'var(--text-content-secondary)' }}>
                    {a.label}
                  </span>
                  <span className='shrink-0' style={{ color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>
                    {value}{a.unit ? ` ${a.unit}` : ''}
                    {range && (
                      <span style={{ fontWeight: 'var(--type-weight-regular)', color: 'var(--text-content-quaternary)' }}>
                        {' '}({range})
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Reference range for a single-analyte test, where the breakdown
            above would be a one-row table saying the same thing. */}
        {!masked && !order.results && test?.analytes?.length === 1 && resolveAnalyteRange(test.analytes[0], order.patient) && (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-quaternary)' }}>
            ค่าปกติ: {resolveAnalyteRange(test.analytes[0], order.patient)}
            {test.analytes[0].unit ? ` ${test.analytes[0].unit}` : ''}
          </span>
        )}

        {/* Who released the result — the approval step the team insisted on
            ("อนุมัติผล (ต้องมีคนอนุมัติผล)"). Without a named approver a
            reported result has no accountable owner. */}
        {!masked && order.approvedBy && (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-quaternary)' }}>
            รับรองผลโดย {order.approvedBy}{order.approvedAt ? ` · ${order.approvedAt}` : ''}
          </span>
        )}
        {/* Bedside tests skip the bench entirely — "พยาบาลเจาะน้ำตาลปลายนิ้ว
            บันทึกผลเองได้เลย" — so the performer is named instead. */}
        {!masked && order.bedside && order.performedBy && (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-quaternary)' }}>
            ตรวจข้างเตียงและบันทึกผลโดย {order.performedBy}
          </span>
        )}
        {/* Lab-out — the vendor manual's "ส่งตรวจภายนอก / lab-out upload". */}
        {order.status === 'external' && order.externalLab && (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-quaternary)' }}>
            ส่งตรวจภายนอกที่ {order.externalLab}{order.sentOutAt ? ` · ${order.sentOutAt}` : ''}
          </span>
        )}
        {/* Why a specimen was refused / re-drawn, so the ward isn't left
            guessing when the result doesn't arrive. */}
        {order.exception && order.rejectReason && (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-statusbadge-error, #B91C1C)' }}>
            {order.exception === 'rejected' ? 'ปฏิเสธสิ่งส่งตรวจ' : 'สั่งเจาะซ้ำ'}: {order.rejectReason}
          </span>
        )}
      </div>

      {order.trend && (
        <div
          className='flex flex-col'
          style={{
            background: 'var(--surface-card-200)',
            borderRadius: 'var(--dim-radius-300)',
            border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
            padding: 'var(--dim-space-400)',
            gap: 'var(--dim-space-200)',
          }}
        >
          <span style={{ fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
            แนวโน้มผลตรวจย้อนหลัง
          </span>
          <TrendChart points={order.trend} />
        </div>
      )}
      </div>
    </div>
  );
};

export default LabDetailPanel;
