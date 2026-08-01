import React from 'react';
import Alert from '@/components/alert/Alert';
import StatusBadge from '@/components/badge/StatusBadge';
import XCloseButton from '@/components/button/XCloseButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { Icon } from '@/components/icons/Icon';
import {
  XRAY_STATUS_BY_KEY, XRAY_EXCEPTION_BY_KEY, XRAY_REQUEST_TYPES, xrayHistoryFor,
} from '@/data/xrayOrders';
import { XRAY_EXAM_BY_ID } from '@/data/xrayCatalog';
import { XRAY_RADIOLOGISTS } from '@/data/xrayResultTemplates';

/* Print scoping — TOR §1.12.6.5 "สามารถพิมพ์ใบผลเอกซเรย์ได้". A bare
   window.print() would print the whole app chrome (sidebar/header/table),
   so on @media print everything except `.mih-xray-print-area` is hidden
   and `.no-print` elements (close/print buttons) are hidden even inside
   the area. Idempotent module-load injection — same pattern as the
   "no browser-default input chrome" convention (see AISearch.jsx). */
if (typeof document !== 'undefined') {
  const styleId = 'mih-xray-print-style';
  const css = `
@media print {
  body * { visibility: hidden !important; }
  .mih-xray-print-area, .mih-xray-print-area * { visibility: visible !important; }
  .mih-xray-print-area { position: fixed; inset: 0; padding: 24px; overflow: visible; }
  .mih-xray-print-area .no-print { display: none !important; }
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

/* Detail panel shown alongside XrayQueuePage's table when a row is
   selected — the radiology department's per-request drill-down.

   Covers TOR ภาคผนวก ก §1.12:
     §1.12.5.2 — ข้อมูลเบื้องต้น: HN ชื่อ-สกุล วันเวลาที่บันทึกขอ เลข XN
                 คลินิกที่ขอตรวจ สถานะการตรวจ แพทย์ผู้ส่งตรวจ วันที่ส่งหรือนัด.
     §1.12.5.3 — ข้อมูลผู้รับบริการ: ประวัติการแพ้ + สารที่แพ้ + อาการ,
                 ประวัติประจำเดือน/การตั้งครรภ์, อาการและผลตรวจทางคลินิกโดยย่อ.
     §1.12.5.4 — รายการตรวจ: ความเร่งด่วน รายการตรวจ ตำแหน่ง ราคา ยอดที่
                 เบิกได้ และยอดรวมทั้งหมด — scoped to the ONE order
                 (`orderRows` = every exam sharing this orderId, so the
                 multi-exam case ORD-X405 shows all its rows together).
     §1.12.5.8 — Note (ข้อมูลเพิ่มเติม).
     §1.12.6.3 — ประวัติการแก้ไขผล (amendments) rendered under the report.
     §1.12.6.4 — ผลเอกซเรย์ย้อนหลังของผู้รับบริการรายนี้ (xrayHistoryFor).
     §1.12.6.5 — พิมพ์ใบผลเอกซเรย์ (print button, enabled once verified).
     §1.12.6.9 — ประเภทผลตรวจ badge on the report block. */

const REQUEST_TYPE_BY_KEY = Object.fromEntries(XRAY_REQUEST_TYPES.map((t) => [t.key, t]));

/* Pipeline milestones for the status timeline — the five MyHOSPITAL
   screens in order (ขอตรวจ → รับ Request → ถ่าย → บันทึกผล → ยืนยันผล),
   plus the นัดตรวจ branch when the order carries a scheduledAt. Each step
   reads its own *At field so the timeline can never disagree with the
   row's actual status transitions. */
const TIMELINE_STEPS = [
  { key: 'orderedAt',   label: 'ขอตรวจ (Request)',   who: (o) => o.orderedBy },
  { key: 'scheduledAt', label: 'นัดตรวจ',            who: () => null, optional: true },
  { key: 'acceptedAt',  label: 'รับ Request',        who: (o) => o.radiographer },
  { key: 'performedAt', label: 'ถ่ายภาพรังสี',        who: (o) => o.radiographer },
  { key: 'reportedAt',  label: 'บันทึกผล',           who: (o) => o.radiologist },
  { key: 'verifiedAt',  label: 'ยืนยันผล',           who: (o) => o.radiologist },
];

const bodyFont = { fontFamily: 'var(--type-family-body)' };

/* One shaded sub-card — the panel's repeating section chrome. */
const SectionCard = ({ title, action, children }) => (
  <div
    className='flex flex-col'
    style={{
      background: 'var(--surface-card-200)',
      borderRadius: 'var(--dim-radius-300)',
      border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
      /* Longhand padding — inline `padding:` shorthand carrying var()
         renders as 0 (CSSOM drops it, project memory). */
      paddingTop: 'var(--dim-space-400)',
      paddingBottom: 'var(--dim-space-400)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      gap: 'var(--dim-space-200)',
    }}
  >
    <div className='flex items-center justify-between'>
      <span style={{ ...bodyFont, fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
        {title}
      </span>
      {action}
    </div>
    {children}
  </div>
);

/* Label → value line used across the request-info / patient-info cards. */
const FieldRow = ({ label, value, tone }) => (
  <div className='flex items-baseline justify-between' style={{ gap: 'var(--dim-space-200)' }}>
    <span className='shrink-0' style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
      {label}
    </span>
    <span
      className='min-w-0 text-right'
      style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', color: tone ?? 'var(--text-content-secondary)' }}
    >
      {value ?? '—'}
    </span>
  </div>
);

/* Vertical status timeline — dot + connector per milestone. A step with a
   timestamp is "reached" (brand dot); the rest stay hollow so the eye
   reads exactly how far this request has travelled down the pipeline. */
const StatusTimeline = ({ order }) => {
  const steps = TIMELINE_STEPS.filter((s) => !s.optional || order[s.key]);
  return (
    <div className='flex flex-col'>
      {steps.map((step, i) => {
        const at = order[step.key];
        const reached = !!at;
        const who = reached ? step.who(order) : null;
        const last = i === steps.length - 1;
        return (
          <div key={step.key} className='flex items-stretch' style={{ gap: 'var(--dim-space-300)' }}>
            {/* Dot geometry uses numeric px like StatusBadge's dotSize —
                the token scale has no 10px size step (smallest size token
                is --dim-size-200 = 12px), and glyph-internal geometry is
                the DS's own precedent for numeric literals. */}
            <div className='flex flex-col items-center' style={{ width: 12 }}>
              <span
                aria-hidden
                className='shrink-0'
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 'var(--dim-radius-full, 9999px)',
                  background: reached ? 'var(--surface-brandPrimary-default)' : 'var(--surface-card-100)',
                  border: reached
                    ? 'none'
                    : 'var(--dim-stroke-150) solid var(--border-neutral-tertiary)',
                  marginTop: 'var(--dim-space-100)',
                }}
              />
              {!last && (
                <span
                  aria-hidden
                  className='flex-1'
                  style={{ width: 'var(--dim-stroke-100, 1px)', background: 'var(--border-neutral-quaternary)' }}
                />
              )}
            </div>
            <div className='flex flex-col min-w-0 flex-1' style={{ paddingBottom: last ? 0 : 'var(--dim-space-300)' }}>
              <div className='flex items-baseline justify-between' style={{ gap: 'var(--dim-space-200)' }}>
                <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', color: reached ? 'var(--text-content-default)' : 'var(--text-content-quaternary)' }}>
                  {step.label}
                </span>
                <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                  {reached ? at : 'รอดำเนินการ'}
                </span>
              </div>
              {who && (
                <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                  โดย {who}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const XrayDetailPanel = ({
  order,
  /* Every row sharing this order's orderId (one XN per request,
     §1.12.5.2) — ORD-X405 carries two LS-spine exams that must appear
     together with a single order-level money total (§1.12.5.4). */
  orderRows = [],
  onClose,
  /* XrayQueuePage's print-preview dialog carries its own
     `.mih-xray-print-area`; while that dialog is open the parent flips
     this off so ONLY the dialog's area prints — two live areas would
     both pass the visibility rule and print on top of each other. */
  printEnabled = true,
  emptyMessage = 'เลือกรายการทางซ้ายเพื่อดูรายละเอียด',
}) => {
  if (!order) {
    return (
      <div className='flex-1 flex items-center justify-center' style={{ ...bodyFont, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)', minHeight: 240 }}>
        {emptyMessage}
      </div>
    );
  }

  const rows = orderRows.length ? orderRows : [order];
  const total = rows.reduce((s, r) => s + (r.price ?? 0), 0);
  const claimTotal = rows.reduce((s, r) => s + (r.claimAmount ?? 0), 0);

  const hasReport = order.status === 'reported' || order.status === 'verified';
  const exception = order.exception ? XRAY_EXCEPTION_BY_KEY[order.exception] : null;
  const pregnant = order.pregnancy?.status === 'ตั้งครรภ์';
  const reader = XRAY_RADIOLOGISTS.find((r) => r.name === order.radiologist) ?? null;
  const history = xrayHistoryFor(order.hn);

  return (
    <div
      className='flex-1 flex flex-col'
      style={{
        /* Longhand — inline padding shorthand + var() = 0px bug. */
        paddingTop: 'var(--dim-space-600)',
        paddingBottom: 'var(--dim-space-600)',
        paddingLeft: 'var(--dim-space-600)',
        paddingRight: 'var(--dim-space-600)',
        gap: 'var(--dim-space-400)',
      }}
    >
      {onClose && (
        <div className='flex justify-end no-print' style={{ marginBottom: 'calc(-1 * var(--dim-space-200))' }}>
          <XCloseButton onClick={onClose} ariaLabel='ปิดรายละเอียดการส่งตรวจ' />
        </div>
      )}

      {/* Printable region — what "พิมพ์ใบผลเอกซเรย์" (§1.12.6.5) actually
          prints; buttons above/inside are marked no-print. */}
      <div className={`${printEnabled ? 'mih-xray-print-area ' : ''}flex-1 flex flex-col`.trim()} style={{ gap: 'var(--dim-space-400)' }}>
        {/* Contrast allergy — §1.12.5.3's allergy block doing its job: an
            iodinated-contrast allergy on a contrast exam is the one thing
            the radiographer must NOT miss before injecting. */}
        {order.contrast && order.allergy?.has && (
          <Alert
            type='error'
            iconName='flag'
            title={`แพ้: ${order.allergy.agent}`}
            subtext={`อาการ: ${order.allergy.symptom || '—'} — รายการนี้ใช้สารทึบรังสี ต้องปรึกษารังสีแพทย์ก่อนฉีด`}
            showBadge={false}
            showIndicator={false}
            showDetail={false}
          />
        )}
        {/* Pregnancy — §1.12.5.3: asked before irradiating a female's
            abdomen/pelvis; surfaced as a banner, not a buried field. */}
        {pregnant && (
          <Alert
            type='warning'
            iconName='warning'
            title='ผู้รับบริการตั้งครรภ์'
            subtext={`LMP: ${order.pregnancy.lmp ?? '—'} — ระวังการฉายรังสีบริเวณช่องท้อง/เชิงกราน`}
            showBadge={false}
            showIndicator={false}
            showDetail={false}
          />
        )}
        {/* ผิดปกติเร่งด่วน (§1.12.6.9) — the classification that must page
            the ordering doctor immediately (active TB, fracture). */}
        {order.resultType === 'abnormalUrgent' && (
          <Alert
            type='error'
            iconName='e911_emergency'
            title='ผลผิดปกติเร่งด่วน'
            subtext={`แจ้งแพทย์ผู้ส่งตรวจโดยด่วน — ${order.orderedBy} (${order.orderingLocation})`}
            showBadge={false}
            showIndicator={false}
            showDetail={false}
          />
        )}

        {/* Header — exam + urgency + status, then the §1.12.5.2 identity
            lines everyone phoning the department will be asked for. */}
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <div className='flex items-center justify-between' style={{ gap: 'var(--dim-space-200)' }}>
            <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
              <h2 className='min-w-0' style={{ margin: 0, fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-lg)', color: 'var(--text-content-default)' }}>
                {order.examLabel}
              </h2>
              {order.urgency === 'stat' && <StatusBadge style='error' size='small'>STAT</StatusBadge>}
            </div>
            {/* พิมพ์ใบผลเอกซเรย์ — §1.12.6.5. Only meaningful once the
                report is verified: before ยืนยันผล there is no result the
                ordering doctor may act on (terminalForDoctor gate). */}
            <BrandSubdueButton
              className='no-print shrink-0'
              variant='outline'
              size='sm'
              leadingIcon='print'
              disabled={order.status !== 'verified'}
              onClick={() => window.print()}
            >
              พิมพ์ใบผล
            </BrandSubdueButton>
          </div>
          <span style={{ ...bodyFont, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
            {order.patient?.fullName ?? order.patient?.shortName} · HN {order.hn} · {order.patient?.sex} · {parseInt(order.patient?.age, 10) || '—'} ปี
          </span>
          <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            XN {order.xn} · VN {order.vn} · สิทธิ{order.rightLabel}
          </span>
        </div>

        {/* Exception banner — why a request left the pipeline (manual
            pp.8–9: ปฏิเสธรับ Request / Cancel Request / Cancel Report). */}
        {exception && (
          <div
            className='flex items-start'
            style={{
              gap: 'var(--dim-space-200)',
              paddingTop: 'var(--dim-space-300)',
              paddingBottom: 'var(--dim-space-300)',
              paddingLeft: 'var(--dim-space-300)',
              paddingRight: 'var(--dim-space-300)',
              borderRadius: 'var(--dim-radius-300)',
              background: 'var(--surface-statusbadge-error)',
            }}
          >
            <span className='shrink-0' style={{ color: 'var(--text-statusbadge-error)' }}>
              <Icon name={exception.icon} size={16} />
            </span>
            <div className='flex flex-col min-w-0'>
              <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-statusbadge-error)' }}>
                {exception.thai}
              </span>
              {order.cancelReason && (
                <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
                  {order.cancelReason}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ข้อมูลการขอตรวจ — §1.12.5.2 verbatim field set. */}
        <SectionCard title='ข้อมูลการขอตรวจ'>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
            <FieldRow label='เลข XN' value={order.xn} />
            <FieldRow label='VN' value={order.vn} />
            <FieldRow label='คลินิกที่ขอตรวจ' value={order.orderingLocation} />
            <FieldRow label='แพทย์ผู้ส่งตรวจ' value={order.orderedBy} />
            <FieldRow
              label='ความเร่งด่วน'
              value={order.urgencyLabel}
              tone={order.urgency === 'stat' ? 'var(--text-statusbadge-error)' : undefined}
            />
            <FieldRow label='ลักษณะการขอตรวจ' value={REQUEST_TYPE_BY_KEY[order.requestType]?.thai ?? order.requestType} />
            <FieldRow label='วันเวลาส่ง/นัด' value={order.scheduledAt ?? `วันนี้ ${order.orderedAt}`} />
            <FieldRow label='สถานะ' value={XRAY_STATUS_BY_KEY[order.status]?.thai ?? order.status} />
            {/* referralOnly — modality the ศบส. does not operate in-house:
                the order prints a referral to a BMA hospital instead of
                joining the room queue (see xrayCatalog XRAY_MODALITIES). */}
            {order.referralOnly && (
              <FieldRow label='การส่งตรวจ' value='ส่งตรวจภายนอก (Referral)' tone='var(--text-statusbadge-warning)' />
            )}
          </div>
        </SectionCard>

        {/* ข้อมูลผู้รับบริการ — §1.12.5.3: allergy + สารที่แพ้ + อาการ,
            ประจำเดือน/ตั้งครรภ์, อาการโดยย่อ, การวินิจฉัย. */}
        <SectionCard title='ข้อมูลผู้รับบริการ'>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
            <FieldRow
              label='ประวัติการแพ้'
              value={order.allergy?.has ? `${order.allergy.agent} — ${order.allergy.symptom || 'ไม่ระบุอาการ'}` : 'ไม่มี'}
              tone={order.allergy?.has ? 'var(--text-statusbadge-error)' : undefined}
            />
            <FieldRow
              label='ประจำเดือน / ตั้งครรภ์'
              value={order.pregnancy?.status ? `${order.pregnancy.status}${order.pregnancy.lmp ? ` (LMP ${order.pregnancy.lmp})` : ''}` : '—'}
              tone={pregnant ? 'var(--text-statusbadge-warning)' : undefined}
            />
          </div>
          {order.clinicalSummary && (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
              <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                อาการและผลตรวจทางคลินิกโดยย่อ
              </span>
              <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)', lineHeight: 1.6 }}>
                {order.clinicalSummary}
              </span>
            </div>
          )}
          {order.diagnosis && <FieldRow label='การวินิจฉัย' value={order.diagnosis} />}
        </SectionCard>

        {/* รายการตรวจของคำขอนี้ — §1.12.5.4. All rows of one orderId render
            together (ORD-X405's two LS-spine exams), each with its own
            view/film/money; ราคา + ยอดเบิกได้ per row were derived from
            claimFor() at data-build time so money can never drift from the
            exam catalog. */}
        <SectionCard title={`รายการตรวจ (${rows.length})`}>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
            {rows.map((r) => (
              <div
                key={r.id}
                className='flex flex-col'
                style={{
                  gap: 'var(--dim-space-050, 2px)',
                  paddingBottom: 'var(--dim-space-200)',
                  borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                }}
              >
                <div className='flex items-baseline justify-between' style={{ gap: 'var(--dim-space-200)' }}>
                  <span className='min-w-0' style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)' }}>
                    {r.examLabel}
                  </span>
                  <span className='shrink-0' style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-default)' }}>
                    {(r.price ?? 0).toLocaleString('th-TH')} บาท
                  </span>
                </div>
                <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                  {r.regionLabel} · ท่าถ่าย {r.view} · ฟิล์ม {(r.filmSizes ?? []).join(', ') || '—'}
                </span>
                <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                  เบิกได้ {(r.claimAmount ?? 0).toLocaleString('th-TH')} บาท · สถานะ: {XRAY_STATUS_BY_KEY[r.status]?.short ?? r.status}
                </span>
              </div>
            ))}
            {/* ยอดรวมทั้งหมดของคำขอ — §1.12.5.4's "ข้อมูลยอดรวมทั้งหมด":
                the ONE order the doctor placed, not the whole worklist. */}
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
              <FieldRow label='ยอดรวมทั้งหมด' value={`${total.toLocaleString('th-TH')} บาท`} tone='var(--text-content-default)' />
              <FieldRow label='เบิกได้รวม' value={`${claimTotal.toLocaleString('th-TH')} บาท`} />
              <FieldRow
                label='ผู้รับบริการชำระ'
                value={`${(total - claimTotal).toLocaleString('th-TH')} บาท`}
                tone={total - claimTotal > 0 ? 'var(--text-statusbadge-warning)' : undefined}
              />
            </div>
          </div>
        </SectionCard>

        {/* สถานะการดำเนินการ — the manual's 5-tab pipeline rendered as a
            timeline for this single request (legacy §2.2). */}
        <SectionCard title='สถานะการดำเนินการ'>
          <StatusTimeline order={order} />
        </SectionCard>

        {/* รายงานผล — visible when บันทึกผลแล้ว; before ยืนยันผล the header
            says so explicitly, mirroring the lab's "แพทย์จะดูได้ต่อเมื่อ
            ได้รับอนุมัติผล" gate. */}
        {hasReport && (
          <SectionCard
            title='รายงานผลการตรวจ'
            action={
              order.resultTypeLabel ? (
                <StatusBadge style={order.resultTypeColor} size='small'>{order.resultTypeLabel}</StatusBadge>
              ) : null
            }
          >
            {order.status === 'reported' && (
              <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-statusbadge-warning)' }}>
                รอยืนยันผล — แพทย์ผู้ส่งตรวจจะเห็นรายงานนี้เมื่อยืนยันผลแล้ว
              </span>
            )}
            {order.technique && (
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>Technique</span>
                <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)', lineHeight: 1.6 }}>{order.technique}</span>
              </div>
            )}
            {order.findings && (
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>Findings</span>
                <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)', lineHeight: 1.6 }}>{order.findings}</span>
              </div>
            )}
            {order.impression && (
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>Impression</span>
                <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)', lineHeight: 1.6 }}>{order.impression}</span>
              </div>
            )}
            {/* ผู้อ่านผล + เลขใบประกอบวิชาชีพ — printed on ใบผลเอกซเรย์
                (§1.12.6.5); the license comes from the reader registry so
                it stays in step with the setup screen. */}
            {order.radiologist && (
              <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-quaternary)' }}>
                อ่านผลโดย {order.radiologist}{reader?.license ? ` (${reader.license})` : ''}
                {order.reportedAt ? ` · บันทึกผล ${order.reportedAt}` : ''}
                {order.verifiedAt ? ` · ยืนยันผล ${order.verifiedAt}` : ''}
              </span>
            )}
            {/* ประวัติการแก้ไขผล — §1.12.6.3: kept when the SAME doctor
                re-edits their own verified report (any other doctor is
                blocked by the lockedBy guard upstream). */}
            {order.amendments?.length > 0 && (
              <div
                className='flex flex-col'
                style={{
                  gap: 'var(--dim-space-100)',
                  paddingTop: 'var(--dim-space-200)',
                  borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                }}
              >
                <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)', ...bodyFont, fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)' }}>
                  <Icon name='history_edu' size={14} />
                  ประวัติการแก้ไขผล ({order.amendments.length})
                </span>
                {order.amendments.map((a, i) => (
                  <span key={`${a.at}-${i}`} style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
                    {a.at} — {a.by}: {a.reason}
                  </span>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {/* Note — §1.12.5.8 ข้อมูลเพิ่มเติม. */}
        {order.note && (
          <SectionCard title='Note (ข้อมูลเพิ่มเติม)'>
            <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)', lineHeight: 1.6 }}>
              {order.note}
            </span>
          </SectionCard>
        )}

        {/* ผลเอกซเรย์ย้อนหลัง — §1.12.6.4, keyed by HN. Also the data the
            §1.12.5.9 duplicate-warning glyph on the worklist reads from,
            so the two can never disagree about what was shot before. */}
        {history.length > 0 && (
          <SectionCard title={`ผลเอกซเรย์ย้อนหลัง (${history.length})`}>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
              {history.map((h, i) => (
                <div
                  key={`${h.examId}-${i}`}
                  className='flex flex-col'
                  style={{
                    gap: 'var(--dim-space-050, 2px)',
                    paddingBottom: 'var(--dim-space-150)',
                    borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                  }}
                >
                  <div className='flex items-baseline justify-between' style={{ gap: 'var(--dim-space-200)' }}>
                    <span className='min-w-0' style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)' }}>
                      {XRAY_EXAM_BY_ID[h.examId]?.name ?? h.examId}
                    </span>
                    <span className='shrink-0' style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                      {h.daysAgo} วันก่อน
                    </span>
                  </div>
                  {h.resultSummary && (
                    <span style={{ ...bodyFont, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
                      {h.resultSummary}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
};

export default XrayDetailPanel;
