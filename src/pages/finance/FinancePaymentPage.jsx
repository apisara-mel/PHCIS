import React, { useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import Table, { EllipsisText } from '@/components/table/Table';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag from '@/components/forms/FilterTag';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import InputField from '@/components/forms/InputField';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Checkbox from '@/components/checkbox/Checkbox';
import RadioGroup from '@/components/radio/RadioGroup';
import Popup from '@/components/popup/Popup';
import Alert from '@/components/alert/Alert';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import SelectableCardButton from '@/components/button/SelectableCardButton';
import { Icon } from '@/components/icons/Icon';
import RevenueRegisterSection from '@/pages/finance/sections/RevenueRegisterSection';
import OutstandingSection from '@/pages/finance/sections/OutstandingSection';
import CutoffSection from '@/pages/finance/sections/CutoffSection';
import RightsAdjustmentSection from '@/pages/finance/sections/RightsAdjustmentSection';
import EclaimSection from '@/pages/finance/sections/EclaimSection';
import OtherChargesSection from '@/pages/finance/sections/OtherChargesSection';
import PaymentStatusAdjustmentSection from '@/pages/finance/sections/PaymentStatusAdjustmentSection';
import SignatureSection from '@/pages/finance/sections/SignatureSection';
import PricingSettingsSection, { defaultPricing } from '@/pages/finance/sections/PricingSettingsSection';
import CashierAuditSection from '@/pages/finance/sections/CashierAuditSection';
import NhsoImportSection from '@/pages/finance/sections/NhsoImportSection';
import FinanceReportsSection from '@/pages/finance/sections/FinanceReportsSection';
import {
  FINANCE_QUEUE,
  QUEUE_STATUSES,
  PAYMENT_METHODS,
  CHARGE_CATEGORIES,
  RIGHTS_GROUPS,
  PHARMACY_STATUSES,
  financeSummary,
  computeTotals,
  formatBaht,
  formatTaxId,
  thaiDate,
  thaiTime,
  applyPricing,
  hasPricingAdjustment,
} from '@/data/financePaymentPrototype';

/* งานการเงิน (Finance / Payment) — checkout screen per คู่มือระบบงานห้องเงิน
   §2.1 "บันทึกรับเงินผู้ป่วย".

   Two-level navigation, hierarchy matters:
     1. Section switcher (SECTIONS) — which functional area of the finance
        module (คิวชำระเงิน / ทะเบียนรายรับ / ยอดค้างชำระ / ตัดยอด /
        ปรับสิทธิ / NHSO e-Claim). This is the OUTER level, so it owns
        QueuePageShell's sticky `tabs` slot (same position/style as OPD's
        screening queue in src/pages/opd/QueuePage.jsx).
     2. Payment-status filter (ทั้งหมด/รอชำระเงิน/ชำระแล้ว/ยกเลิกใบเสร็จ) —
        the INNER level, only meaningful inside the "คิวชำระเงิน" section,
        rendered as <FilterTag> chips below the search box (same filter-tag
        style/position as OPD's screening queue) instead of competing for
        the same sticky slot as the section switcher.

   Covers TOR appendix ก §1.5 in full: charge breakdown by category
   (§1.5.1), %-discount/exemption (§1.5.2), and the "การยกเลิกใบเสร็จ"
   void-by-receipt-number sub-flow (with reason + authorizing signer
   added for auditability) inside the "คิวชำระเงิน" section (§2.1), plus
   the rest of the finance module's logic-sketch scope via the section
   switcher: daily cutoff/remittance (§2.2), miscellaneous other charges
   (§2.3), payment-status correction (§2.4), rights adjustment (§2.5),
   revenue register (§1.5.5), outstanding-receivables follow-up
   (§1.5.6), and NHSO e-Claim export. Section references verified
   against the real คู่มือระบบงานห้องเงิน text (extracted with pdftotext
   — it has a real text layer, unlike the TOR appendix PDF). All of it
   is still mock/session-local — nothing persists past a page reload,
   and rights adjustment only relabels a row rather than re-deriving
   its charge split (that needs a real per-rights-group coverage rule).

   The "รายงานการเงิน" section is the odd one out: it answers TOR §1.20.3
   (รายงานการเงิน, part of the §1.20 reporting chapter) rather than §1.8,
   and it lives here instead of /dashboard because it reads the same queue
   this page already owns — today's paid receipts feed the current fiscal
   month, so the report and ทะเบียนรายรับ can't disagree. */

const SECTIONS = [
  { key: 'queue', label: 'คิวชำระเงิน', icon: 'receipt_long' },
  { key: 'other', label: 'ค่าใช้จ่ายอื่นๆ', icon: 'add_circle' },
  { key: 'status', label: 'ปรับสถานะรับชำระ', icon: 'sync_alt' },
  { key: 'signature', label: 'ลายเซ็นใบเสร็จ', icon: 'draw' },
  { key: 'register', label: 'ทะเบียนรายรับ', icon: 'summarize' },
  { key: 'outstanding', label: 'ยอดค้างชำระ', icon: 'account_balance_wallet' },
  { key: 'cutoff', label: 'ตัดยอด/นำส่งเงิน', icon: 'point_of_sale' },
  { key: 'rights', label: 'ปรับสิทธิ', icon: 'verified_user' },
  { key: 'eclaim', label: 'NHSO e-Claim', icon: 'file_upload' },
  { key: 'nhsoImport', label: 'นำเข้าไฟล์ สปสช.', icon: 'download' },
  { key: 'audit', label: 'ตรวจสอบยอด (Audit)', icon: 'fact_check' },
  { key: 'reports', label: 'รายงานการเงิน', icon: 'monitoring' },
  { key: 'pricing', label: 'ตั้งค่าราคาขาย', icon: 'sell' },
];

const breadcrumb = ['งานการเงิน (Finance / Payment)'];

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:finance-queue';

const STATUS_STYLE = { pending: 'info', paid: 'success', voided: 'error' };
const STATUS_TAB_ICON = { pending: 'hourglass_top', paid: 'check_circle', voided: 'cancel' };

/* Generic person avatar — used for both the queue table's ผู้ป่วย column
   and the logged-in staff display (e.g. void-receipt approver). design.md
   §6.11 generic avatar chrome (surface/avatar/default fallback fill +
   white ring), falling back to the first letter of the name if the
   portrait fails to load. */
const PersonAvatar = ({ name = '', src }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div
      className='shrink-0 flex items-center justify-center overflow-hidden'
      style={{
        width: 'var(--dim-size-800, 40px)',
        height: 'var(--dim-size-800, 40px)',
        borderRadius: 'var(--dim-radius-full, 9999px)',
        border: 'var(--dim-stroke-200, 2px) solid var(--border-avatar)',
        background: 'var(--surface-avatar-default)',
        color: 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
        lineHeight: 1,
      }}
      aria-hidden
    >
      {src && !imgError ? (
        <img src={src} alt={name} onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        name.trim().charAt(0) || '?'
      )}
    </div>
  );
};

/* TOR §1.5.3 "ยกเลิกใบเสร็จ" — selectable reason list (not free text),
   optional detail, and signer name + ตำแหน่ง + date. */
const VOID_REASONS = ['บันทึกรายการซ้ำ', 'ระบุสิทธิผิด', 'ผู้ป่วยขอเปลี่ยนวิธีชำระเงิน', 'ยกเลิกตามคำร้องขอผู้ป่วย', 'อื่นๆ'];
const VOID_POSITIONS = ['เจ้าหน้าที่การเงิน', 'หัวหน้าเจ้าหน้าที่การเงิน', 'ผู้จัดการ'];
/* The logged-in user — no auth system in this prototype, so this mirrors
   the single mocked identity pattern used elsewhere (Sidebar's
   DoctorProfileAvatar), scoped to a finance officer for this module.
   Auto-fills "ผู้อนุมัติ/ลงนามกำกับ" instead of free-text entry. */
const CURRENT_FINANCE_USER = {
  name: 'จนท.การเงิน สมศรี',
  position: VOID_POSITIONS[0],
  avatarUrl: '/images/staff/staff-reception-female-01.png',
};
const VOID_DETAIL_SUGGESTIONS = [
  'บันทึกรายการซ้ำโดยเจ้าหน้าที่',
  'ผู้ป่วยแจ้งขอเปลี่ยนวิธีชำระเงินหลังพิมพ์ใบเสร็จ',
  'ระบบค้างขณะพิมพ์ใบเสร็จทำให้พิมพ์ซ้ำ',
  'ผู้ป่วยขอยกเลิกการรับบริการ',
  'ระบุสิทธิการรักษาไม่ถูกต้องตั้งแต่ลงทะเบียน',
  'พบข้อผิดพลาดของจำนวนเงินที่บันทึก',
];
const todayThai = () => new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
/* วันที่-เวลาทำรายการ — stamped onto the receipt when a payment completes. */
const nowThaiDateTime = () => `${todayThai()} · ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })} น.`;

const VoidReceiptForm = ({ row, onCancel, onConfirm }) => {
  const [reason, setReason] = useState(VOID_REASONS[0]);
  const [detail, setDetail] = useState('');
  const canConfirm = reason !== 'อื่นๆ' || detail.trim().length > 0;

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>
        เลขที่ใบเสร็จ {row.receiptNo} · วันที่ {todayThai()}
      </span>
      {/* Card-style "radio button" (same chrome as ScreeningPage's
          Pain/Triage/Care-orders/Cert chip rows) instead of a circular
          radio group, per request. */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-regular)', color: 'var(--text-neutral-default)' }}>
          เหตุผลการยกเลิก
        </span>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          {VOID_REASONS.map((r) => (
            <SelectableCardButton key={r} selected={reason === r} onClick={() => setReason(r)} ariaLabel={r}>
              {r}
            </SelectableCardButton>
          ))}
        </div>
      </div>
      <SuggestibleTextarea
        voice
        label='รายละเอียดเพิ่มเติม'
        required={reason === 'อื่นๆ'}
        height={140}
        minHeight={96}
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder='ระบุรายละเอียดเพิ่มเติม (ถ้ามี)'
        suggestions={VOID_DETAIL_SUGGESTIONS}
        minChars={3}
      />
      {/* ผู้อนุมัติ / ลงนามกำกับ — auto-filled from the logged-in user
          (avatar + name + position) instead of free-text entry, so the
          signer always matches whoever is actually signed in. */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-neutral-default)' }}>
          ผู้อนุมัติ / ลงนามกำกับ
        </span>
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <PersonAvatar name={CURRENT_FINANCE_USER.name} src={CURRENT_FINANCE_USER.avatarUrl} />
          <div className='flex flex-col'>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)' }}>
              {CURRENT_FINANCE_USER.name}
            </span>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              {CURRENT_FINANCE_USER.position}
            </span>
          </div>
        </div>
      </div>
      <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-200)' }}>
        <NeutralSubdueButton size='sm' onClick={onCancel}>ยกเลิก</NeutralSubdueButton>
        <DangerSubdueButton
          size='sm'
          disabled={!canConfirm}
          onClick={() => onConfirm({
            reason,
            detail: detail.trim(),
            signer: CURRENT_FINANCE_USER.name,
            position: CURRENT_FINANCE_USER.position,
            voidedAt: todayThai(),
          })}
        >
          ยืนยันการยกเลิกใบเสร็จ
        </DangerSubdueButton>
      </div>
    </div>
  );
};

/* TOR §1.5.2 "การยกเว้น หรืออนุมัติลดหย่อนค่ารักษาพยาบาล" — ยกเว้น
   (exemption) and ลดหย่อน (discount) are recorded as distinct kinds,
   each with its own type list "ตามประเภทที่สำนักอนามัยกำหนด", and the
   amount can be entered as a percent (auto-computed to a baht amount)
   or as a flat baht amount. */
const EXEMPTION_TYPES = ['ผู้สูงอายุ', 'ผู้พิการ', 'บุคลากรของหน่วยงาน', 'ผู้ยากไร้ตามระเบียบสำนักอนามัย'];
const DISCOUNT_TYPES = ['ส่วนลดเงินสด', 'ส่วนลดพนักงาน', 'ส่วนลดตามนโยบายศูนย์บริการ'];

const ReceiptField = ({ label, value }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{label}</span>
    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>{value || '-'}</span>
  </div>
);

/* Printed-receipt layout — คู่มือ §2.1 receipt content requirement: patient
   + visit identifiers, issuing facility/point of sale, itemized charges,
   VAT breakdown, and payment reference. Distinct from the editable
   บันทึกรับเงินผู้ป่วย form above (that one collects the payment; this one
   documents it), so it gets its own layout instead of reusing the form. */
const ReceiptDetail = ({ row }) => {
  /* Print the lines this receipt actually settled. Seeded rows (and any
     receipt paid before `paidItemIds` existed) fall back to every line. */
  const receiptItems = row.paidItemIds
    ? row.items.filter((i) => row.paidItemIds.includes(i.id))
    : row.items;
  const { totalCharge, rightsCoverage } = computeTotals(receiptItems, false);
  const deduction = rightsCoverage + (row.discount || 0);
  const netBeforeVat = totalCharge - deduction;
  const vat = Math.round(netBeforeVat * 0.07);
  const netTotal = netBeforeVat + vat;
  const paymentMethod = PAYMENT_METHODS.find((m) => m.key === row.paymentMethod);

  return (
    <div
      className='flex flex-col'
      style={{
        gap: 'var(--dim-space-500)',
        border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        borderRadius: 'var(--dim-radius-400)',
        padding: 'var(--dim-space-500)',
      }}
    >
      <div className='grid grid-cols-2' style={{ gap: 'var(--dim-space-300) var(--dim-space-500)' }}>
        <ReceiptField label='HN' value={row.hn} />
        <ReceiptField label='เลขที่ใบเสร็จ' value={row.receiptNo} />
        <ReceiptField label='ชื่อ-สกุล' value={row.patient.fullName} />
        <ReceiptField label='วันที่-เวลาทำรายการ' value={row.paidAt} />
        <ReceiptField label='VN' value={row.vn} />
        <ReceiptField label='สิทธิการรักษา' value={row.rights.label} />
        <ReceiptField label='เพศ / อายุ' value={`${row.patient.sex || '-'} / ${row.patient.age || '-'}`} />
        <ReceiptField label='เลขผู้เสียภาษี' value={formatTaxId(row.patient.nationalId)} />
        <ReceiptField label='ศูนย์/คลินิก' value={row.center} />
        <ReceiptField label='ที่อยู่' value={row.patient.address} />
        <ReceiptField label='จุดชำระ' value={row.counter} />
      </div>

      <Table
        columns={[
          { key: 'code', label: 'รหัส', width: 56, render: (_item, idx) => idx + 1 },
          { key: 'label', label: 'รายการค่ารักษาพยาบาล', flex: true, minWidth: 200 },
          { key: 'amount', label: 'จำนวนเงิน (บาท)', width: 120, render: (item) => <span style={{ fontWeight: 'var(--type-weight-bold)' }}>{formatBaht(item.amount)}</span> },
        ]}
        rows={receiptItems}
        rowKey={(item) => item.id}
        emptyMessage='ไม่มีรายการค่ารักษาพยาบาล'
      />

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
        <div className='flex items-center justify-between'>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>ยอดรวมเบื้องต้น</span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>{formatBaht(totalCharge)}</span>
        </div>
        <div className='flex items-center justify-between'>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>หักส่วนลด/ส่วนที่เบิก</span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>-{formatBaht(deduction)}</span>
        </div>
        {/* แจกแจงส่วนลดรายรายการ — TOR §1.8.2.3 asks for the percent AND the
            baht it resolves to, per charge. */}
        {row.lineDiscounts?.length > 0 && row.lineDiscounts.map((d) => (
          <div key={d.id} className='flex items-center justify-between' style={{ paddingLeft: 'var(--dim-space-300)' }}>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              ↳ {d.label} ({d.pct}%)
            </span>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              -{formatBaht(d.amount)}
            </span>
          </div>
        ))}
        <div className='flex items-center justify-between'>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>ภาษีมูลค่าเพิ่ม (7%)</span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>{formatBaht(vat)}</span>
        </div>
        <div className='flex items-center justify-between'>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>ค่าบริการ (รวมแล้ว)</span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>{formatBaht(0)}</span>
        </div>
        <div style={{ borderTop: 'var(--dim-stroke-100) solid var(--border-card-default)', margin: 'var(--dim-space-150) 0' }} />
        <div className='flex items-center justify-between'>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-bold)' }}>ยอดรวมสุทธิ</span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-brandPrimary-default)' }}>{formatBaht(netTotal)}</span>
        </div>
        <div className='flex justify-end'>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>รวมภาษีมูลค่าเพิ่ม 7%</span>
        </div>
      </div>

      <div className='grid grid-cols-2' style={{ gap: 'var(--dim-space-300) var(--dim-space-500)' }}>
        <ReceiptField label='วิธีการชำระเงิน' value={paymentMethod?.label} />
        <ReceiptField label='อ้างอิงการชำระเงิน' value={row.paymentRef} />
      </div>

      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
        เอกสารนี้จัดพิมพ์จากระบบการเงิน PHCIS โปรดเก็บไว้เป็นหลักฐานการชำระเงิน
      </span>
    </div>
  );
};

const PaymentModal = ({ row: rawRow, onClose, onVoid, onPay, pricing }) => {
  /* Bill at the price the settings screen says this rights group pays
     (TOR §1.8.9.1). A receipt already issued keeps the price it was issued
     at — `items` on a paid row are the billed lines, not live ones. */
  const row = useMemo(() => (
    rawRow.status === 'pending'
      ? { ...rawRow, items: applyPricing(rawRow.items, rawRow.rights.key, pricing?.adjustments) }
      : rawRow
  ), [rawRow, pricing]);
  const priceAdjusted = rawRow.status === 'pending' && hasPricingAdjustment(pricing?.adjustments, rawRow.rights.key);

  const [selected, setSelected] = useState(() => new Set(row.items.map((i) => i.id)));
  const [method, setMethod] = useState(PAYMENT_METHODS[0].key);
  const [received, setReceived] = useState('');
  const [payerName, setPayerName] = useState(row.payerName || row.patient.shortName);
  const [discountKind, setDiscountKind] = useState(row.discountKind || 'discount');
  const [discountType, setDiscountType] = useState(row.discountType || DISCOUNT_TYPES[0]);
  const [discountMode, setDiscountMode] = useState('percent');
  const [discountPct, setDiscountPct] = useState(() => {
    if (!row.discount) return '0';
    const { amountDue } = computeTotals(row.items, false);
    return amountDue > 0 ? String(Math.round((row.discount / amountDue) * 1000) / 10) : '0';
  });
  /* ส่วนลดเป็น % *ราย* รายการ — TOR §1.8.2.3 words it as "ส่วนลดที่ระบุเป็น
     เปอร์เซ็นต์ในแต่ละรายการ … คำนวณออกมาเป็นจำนวนเงินส่วนลด". One percent
     applied to the whole visit (what this used to do) can't express
     "ยกเว้นค่ายา 100% แต่ค่าบริการเต็ม", which is the normal shape of a
     สำนักอนามัย exemption. The visit-level box stays as a bulk setter. */
  const [linePct, setLinePct] = useState(() => Object.fromEntries(row.items.map((i) => [i.id, 0])));
  const [discountFlat, setDiscountFlat] = useState(row.discount ? String(row.discount) : '0');
  const [voiding, setVoiding] = useState(false);

  /* Totals follow the ticked lines — TOR §1.8.1.15 "เลือกชำระเงินรายการ
     ร่วมจ่ายได้". Previously this read every line regardless of the
     checkboxes, so unticking a charge changed nothing but the button's
     disabled state.

     Prototype scope: the unticked lines are simply not on this receipt.
     The row still flips to `paid` rather than keeping the remainder as a
     residual balance — real partial payment needs a per-line settlement
     state this mock doesn't model. */
  const selectedItems = useMemo(
    () => row.items.filter((i) => selected.has(i.id)),
    [row.items, selected],
  );
  const { totalCharge, rightsCoverage, amountDue } = computeTotals(selectedItems, false);
  const isReadOnly = row.status !== 'pending';
  const discountTypeOptions = discountKind === 'exempt' ? EXEMPTION_TYPES : DISCOUNT_TYPES;

  /* Each line's discount comes off the part the patient actually owes on it
     (ส่วนเกินสิทธิ) — discounting the full price would hand back money the
     rights group already covered. */
  const lineDiscount = (item) =>
    Math.min(item.patientPortion, Math.round(item.patientPortion * (Number(linePct[item.id] || 0) / 100)));

  const percentDiscountTotal = selectedItems.reduce((s, i) => s + lineDiscount(i), 0);

  const discountAmount = isReadOnly
    ? row.discount
    : Math.min(
      amountDue,
      discountMode === 'percent' ? percentDiscountTotal : Number(discountFlat || 0),
    );

  const applyPctToAllLines = (pct) => {
    setDiscountPct(pct);
    const n = Math.max(0, Math.min(100, Number(pct || 0)));
    setLinePct(Object.fromEntries(selectedItems.map((i) => [i.id, n])));
  };
  const netDue = amountDue - discountAmount;
  const change = Math.max(0, Number(received || 0) - netDue);
  const allSelected = selected.size === row.items.length;

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(row.items.map((i) => i.id)));
  const toggleOne = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  if (row.status === 'paid' && voiding) {
    return (
      <Popup
        open
        onClose={onClose}
        onBack={() => setVoiding(false)}
        size='large'
        title='เหตุผลในการยกเลิก'
        subtitle={`${row.patient.shortName} · HN ${row.hn} · คิว ${row.queueNo}`}
      >
        <VoidReceiptForm
          row={row}
          onCancel={() => setVoiding(false)}
          onConfirm={(payload) => {
            onVoid(row.id, payload);
            onClose();
          }}
        />
      </Popup>
    );
  }

  if (isReadOnly) {
    return (
      <Popup
        open
        onClose={onClose}
        size='large'
        title={`ใบเสร็จ ${row.receiptNo}`}
        subtitle={`${row.patient.shortName} · HN ${row.hn} · คิว ${row.queueNo}`}
        /* Custom footer — ยกเลิกใบเสร็จ sits with the CTA row (not floating
           in the body) but pinned to the left, while ปิด/พิมพ์ใบเสร็จ stay
           right-aligned like every other Popup footer. */
        footer={(
          <div className='w-full flex items-center justify-between'>
            <div>
              {row.status === 'paid' && (
                <DangerSubdueButton size='sm' onClick={() => setVoiding(true)}>ยกเลิกใบเสร็จ</DangerSubdueButton>
              )}
            </div>
            <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-300)' }}>
              <BrandSubdueButton variant='outline' size='md' onClick={onClose}>ปิด</BrandSubdueButton>
              <BrandPrimaryButton size='md' onClick={() => window.print()}>พิมพ์ใบเสร็จ</BrandPrimaryButton>
            </div>
          </div>
        )}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
          <ReceiptDetail row={row} />

          {row.status === 'voided' && row.voidReason && (
            <div
              className='flex flex-col'
              style={{ gap: 'var(--dim-space-050, 2px)', padding: 'var(--dim-space-300)', background: 'var(--surface-card-sakura-200, #FDF3F2)', borderRadius: 'var(--dim-radius-300)' }}
            >
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-tertiary)' }}>เหตุผลการยกเลิก</span>
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                {row.voidReason}{row.voidDetail ? ` — ${row.voidDetail}` : ''}
                {row.cashier ? ` · ผู้อนุมัติ: ${row.cashier}${row.voidPosition ? ` (${row.voidPosition})` : ''}` : ''}
                {row.voidedAt ? ` · วันที่ ${row.voidedAt}` : ''}
              </span>
            </div>
          )}
        </div>
      </Popup>
    );
  }

  return (
    <Popup
      open
      onClose={onClose}
      /* `size='large'` is 640px — the line-item table carries 6 columns
         (หมวดหมู่ / รายการ / ราคาเต็ม / สิทธิจ่าย / ส่วนเกินสิทธิ / ส่วนลด %)
         and was clipping ส่วนเกินสิทธิ off the right edge, so §1.8.1.4's
         per-line split and §1.8.2.3's discount input were both unreachable.
         Widen the payment popup specifically; other popups keep their size. */
      width={1040}
      title='บันทึกรับเงินผู้ป่วย'
      subtitle={`${row.patient.shortName} · HN ${row.hn} · คิว ${row.queueNo}`}
      primaryAction={{
        label: 'บันทึกและพิมพ์ใบเสร็จ',
        disabled: selected.size === 0 || payerName.trim().length === 0 || Number(received || 0) < netDue,
        onClick: () => {
          onPay(row.id, {
            method,
            received: Number(received || 0),
            change,
            payerName: payerName.trim(),
            discountAmount,
            discountKind,
            discountType,
            /* Carry the settled lines + their computed net so the receipt
               and the queue's ยอดชำระ match what was actually collected,
               instead of re-deriving from every line on the visit. */
            paidItemIds: selectedItems.map((i) => i.id),
            netDue,
            /* Freeze the priced lines onto the row — the receipt must not
               change if someone edits ตั้งค่าราคาขาย afterwards. */
            pricedItems: row.items,
            totalCharge,
            rightsCoverage,
            /* Keep the per-line breakdown on the row so the receipt can show
               which charge each baht of discount came off (§1.8.2.3). */
            lineDiscounts: discountMode === 'percent'
              ? selectedItems
                .filter((i) => Number(linePct[i.id] || 0) > 0)
                .map((i) => ({ id: i.id, label: i.label, pct: Number(linePct[i.id]), amount: lineDiscount(i) }))
              : [],
          });
          onClose();
        },
      }}
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
        <div className='flex items-center justify-between'>
          <ColorfulBadge badgeStyle={row.rights.badge}>{row.rights.label}</ColorfulBadge>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>{row.dept} · {row.visitDate}</span>
        </div>
        {/* ข้อมูลทั่วไป — TOR §1.8.1.6: HN / เพศ / อายุ / เลขบัตรประชาชน
            alongside the rights badge already shown above. */}
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>HN {row.hn}</span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{row.patient.sex} · {row.patient.age}</span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>บัตรประชาชน {formatTaxId(row.patient.nationalId)}</span>
        </div>

        {/* TOR §1.8.9.1 — say so when the price on screen isn't the standard
            one, otherwise a cashier can't tell why the total moved. */}
        {priceAdjusted && (
          <Alert
            type='info'
            title='ราคานี้คิดตามการตั้งค่าราคาขายของสิทธิ'
            subtext={`${row.rights.label} · ปรับตามหมวดค่าใช้จ่ายที่ตั้งไว้ในแท็บ "ตั้งค่าราคาขาย"`}
          />
        )}

        <div className='flex items-center justify-between'>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>รายการค่าใช้จ่าย</span>
          <label className='flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
            <Checkbox checked={allSelected} onChange={toggleAll} />
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>เลือกทั้งหมด</span>
          </label>
        </div>

        {/* Line items — TOR §1.5.1 charge breakdown by category, rendered
            as the shared <Table> (same component/style as the queue
            tables elsewhere — src/pages/opd/QueuePage.jsx) instead of
            hand-rolled rows. Category is its own column rather than a
            group header, since <Table> is a flat-row component. */}
        <Table
          columns={[
            {
              key: 'select', label: '', width: 40,
              render: (item) => (
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selected.has(item.id)} onChange={() => toggleOne(item.id)} />
                </div>
              ),
            },
            {
              key: 'category', label: 'หมวดหมู่', width: 180,
              render: (item) => (
                <span className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
                  <Icon name={CHARGE_CATEGORIES[item.category].icon} size={16} />
                  {CHARGE_CATEGORIES[item.category].label}
                </span>
              ),
            },
            { key: 'label', label: 'รายการ', flex: true, minWidth: 180 },
            {
              key: 'amount', label: 'ราคาเต็ม', width: 92,
              render: (item) => (
                <div className='flex flex-col'>
                  <span>{formatBaht(item.amount)}</span>
                  {item.pricingPct ? (
                    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                      {item.pricingPct > 0 ? '+' : ''}{item.pricingPct}%
                    </span>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'covered', label: 'สิทธิจ่าย', width: 92,
              render: (item) => <span style={{ color: 'var(--text-statusbadge-success)' }}>-{formatBaht(item.covered)}</span>,
            },
            {
              key: 'patientPortion', label: 'ส่วนเกินสิทธิ', width: 104,
              render: (item) => <span style={{ fontWeight: 'var(--type-weight-bold)' }}>{formatBaht(item.patientPortion)}</span>,
            },
            /* TOR §1.8.2.3 — per-line percent, shown alongside the baht it
               works out to. Only meaningful in percent mode; flat-amount
               discounts stay a single visit-level figure (§1.8.2.4). */
            ...(discountMode === 'percent' ? [{
              key: 'lineDiscount', label: 'ส่วนลด (%)', width: 150, sortable: false,
              render: (item) => (
                <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }} onClick={(e) => e.stopPropagation()}>
                  <InputField
                    type='number'
                    size='sm'
                    showLabel={false}
                    showHelperText={false}
                    value={String(linePct[item.id] ?? 0)}
                    onChange={(v) => setLinePct((prev) => ({ ...prev, [item.id]: Math.max(0, Math.min(100, Number(v) || 0)) }))}
                    style={{ width: 60 }}
                    inputStyle={{ textAlign: 'right' }}
                  />
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                    -{formatBaht(lineDiscount(item))}
                  </span>
                </div>
              ),
            }] : []),
          ]}
          rows={row.items}
          rowKey={(item) => item.id}
          onRowClick={(item) => toggleOne(item.id)}
          emptyMessage='ไม่มีรายการค่าใช้จ่าย'
        />

        <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
          <div className='flex items-center justify-between'>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>ยอดรวม / สิทธิรับผิดชอบ</span>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>{formatBaht(totalCharge)} / -{formatBaht(rightsCoverage)}</span>
          </div>

          {/* Discount / exemption — TOR §1.5.2: distinct ยกเว้น/ลดหย่อน
              kinds each with their own type list, entered as either a
              percent (auto-computed to baht) or a flat baht amount. */}
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
            <RadioGroup
              legend='ประเภทส่วนลด'
              direction='row'
              value={discountKind}
              onChange={(v) => { setDiscountKind(v); setDiscountType(v === 'exempt' ? EXEMPTION_TYPES[0] : DISCOUNT_TYPES[0]); }}
              options={[{ value: 'exempt', label: 'ยกเว้น' }, { value: 'discount', label: 'ลดหย่อน' }]}
            />
            <RadioGroup
              legend='ตามประเภทที่สำนักอนามัยกำหนด'
              direction='row'
              value={discountType}
              onChange={setDiscountType}
              options={discountTypeOptions.map((t) => ({ value: t, label: t }))}
            />
            <div className='flex items-center justify-between'>
              <RadioGroup
                direction='row'
                value={discountMode}
                onChange={setDiscountMode}
                options={[{ value: 'percent', label: '%' }, { value: 'flat', label: 'จำนวนเงิน' }]}
              />
              <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
                {discountMode === 'percent' ? (
                  <>
                    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                      ใส่ให้ทุกรายการ
                    </span>
                    <InputField
                      type='number'
                      size='sm'
                      showLabel={false}
                      showHelperText={false}
                      value={discountPct}
                      onChange={applyPctToAllLines}
                      style={{ width: 64 }}
                      inputStyle={{ textAlign: 'right' }}
                    />
                  </>
                ) : (
                  <InputField
                    type='number'
                    size='sm'
                    showLabel={false}
                    showHelperText={false}
                    value={discountFlat}
                    onChange={setDiscountFlat}
                    style={{ width: 80 }}
                    inputStyle={{ textAlign: 'right' }}
                  />
                )}
                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>(-{formatBaht(discountAmount)})</span>
              </div>
            </div>
          </div>

          <div className='flex items-center justify-between'>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-bold)' }}>ยอดที่ต้องชำระ</span>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-brandPrimary-default)' }}>{formatBaht(netDue)}</span>
          </div>
        </div>

        <RadioGroup
          legend='วิธีชำระเงิน'
          direction='row'
          value={method}
          onChange={setMethod}
          options={PAYMENT_METHODS.map((m) => ({ value: m.key, label: m.label }))}
        />
        <div className='flex items-end' style={{ gap: 'var(--dim-space-300)' }}>
          <InputField label='จำนวนเงินที่รับ' type='number' value={received} onChange={setReceived} placeholder='0.00' />
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>เงินทอน</span>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-statusbadge-success)' }}>{formatBaht(change)}</span>
          </div>
        </div>
        {/* "ได้รับเงินจาก" — คู่มือ §2.1 step 11. */}
        <InputField label='ได้รับเงินจาก' value={payerName} onChange={setPayerName} placeholder='ชื่อผู้ชำระเงิน' />
      </div>
    </Popup>
  );
};

const queueRowToSearchItem = (row) => ({
  id: row.queueNo,
  label: row.patient.shortName,
  sublabel: row.dept,
  value: row.patient.shortName,
  badges: [
    { label: row.queueNo, tone: 'teal'   },
    { label: row.hn,      tone: 'indigo' },
  ],
});

const FinancePaymentPage = () => {
  const [section, setSection] = useState('queue');
  const [queue, setQueue] = useState(FINANCE_QUEUE);
  const [tab, setTab] = useState('all');
  const [activeRow, setActiveRow] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [cutoff, setCutoff] = useState(null);
  /* ตั้งค่าราคาขาย lives here, not inside its section — the section unmounts
     on every tab switch, and checkout has to read it (TOR §1.8.9.1). */
  const [pricing, setPricing] = useState(defaultPricing);
  /* ไฟล์ สปสช. ที่นำเข้า — อยู่ที่นี่เพราะรายงานการเงินต้องอ่านยอดอนุมัติไปรวม (§1.8.6.7). */
  const [nhso, setNhso] = useState({ records: [], batches: [] });
  const [calledQueue, setCalledQueue] = useState(() => new Set());
  const summary = financeSummary(queue);

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY);

  /* บันทึกรับเงินผู้ป่วย — TOR §1.5.1 / คู่มือ §2.1. Completes a pending
     receipt: records payment method, amount received, change, payer
     name, and the discount actually applied, then issues a receipt
     number. */
  const nextReceiptNo = (rows) => {
    const nums = rows.map((r) => r.receiptNo && parseInt(r.receiptNo.split('-')[1], 10)).filter((n) => !Number.isNaN(n));
    return `RE69-${(nums.length ? Math.max(...nums) : 999) + 1}`;
  };
  const handlePay = (rowId, { method, received, change, payerName, discountAmount, discountKind, discountType, paidItemIds, netDue, lineDiscounts, pricedItems, totalCharge, rightsCoverage }) => {
    setQueue((prev) => prev.map((r) => {
      if (r.id !== rowId) return r;
      const receiptNo = r.receiptNo || nextReceiptNo(prev);
      const paidOn = new Date();
      return {
        ...r,
        status: 'paid',
        paymentMethod: method,
        amountReceived: received,
        changeDue: change,
        payerName,
        discount: discountAmount,
        discountKind,
        discountType,
        lineDiscounts,
        paidItemIds,
        items: pricedItems || r.items,
        totalCharge: totalCharge ?? r.totalCharge,
        rightsCoverage: rightsCoverage ?? r.rightsCoverage,
        amountDue: netDue,
        receiptNo,
        /* Split out so ทะเบียนรายรับ can filter/sort on the date money was
           received rather than the visit date (TOR §1.8.1.12/§1.8.5.3). */
        paidDate: thaiDate(paidOn),
        paidTime: thaiTime(paidOn),
        paidAt: nowThaiDateTime(),
        paymentRef: `REF-${method.toUpperCase()}-${receiptNo.split('-')[1]}`,
        cashier: r.cashier || CURRENT_FINANCE_USER.name,
      };
    }));
  };

  /* Void — TOR §1.5.3 / คู่มือ §2.1 sub-flow. Reverses a paid receipt back
     to "voided" with the selected reason + detail + authorizing signer +
     position + date recorded on the row. Mock-local only. */
  const handleVoid = (rowId, { reason, detail, signer, position, voidedAt }) => {
    setQueue((prev) => prev.map((r) => (r.id === rowId
      ? { ...r, status: 'voided', voidReason: reason, voidDetail: detail, cashier: signer, voidPosition: position, voidedAt }
      : r)));
  };

  /* ยอดค้างชำระ follow-up — TOR §1.5.6. Appends to the row's follow-up
     log rather than overwriting it, so repeated contact attempts stay
     visible. */
  const handleFollowUp = (rowId, payload) => {
    setQueue((prev) => prev.map((r) => (r.id === rowId
      ? { ...r, followUps: [...(r.followUps || []), payload], claimStatus: payload.claimStatus }
      : r)));
  };

  /* บันทึกลายเซ็นใบเสร็จ — TOR §1.5.4. */
  const handleSign = (rowId, signature) => {
    setQueue((prev) => prev.map((r) => (r.id === rowId ? { ...r, signature } : r)));
  };

  /* ตัดยอด/นำส่งเงิน — TOR §2.2. Locks in the day's remittance total; no
     un-close action, matching real cashier practice. */
  const handleCutoff = (payload) => setCutoff(payload);

  /* ปรับสิทธิ — TOR §2.5. Relabels the row's rights group and logs the
     adjustment (from/to/reason/signer) for audit. */
  const handleAdjustRights = (rowId, { toKey, reason, signer }) => {
    setQueue((prev) => prev.map((r) => (r.id === rowId
      ? { ...r, rights: RIGHTS_GROUPS[toKey], rightsAdjustment: { fromKey: r.rights.key, toKey, reason, signer } }
      : r)));
  };

  /* บันทึกค่าใช้จ่ายอื่นๆ — คู่มือ §2.3. Appends an ad-hoc charge line.
     Scope note: reuses the visit's existing coverage ratio for the new
     line rather than a real per-rights-group coverage table (see the
     file-header + OtherChargesSection comments). */
  const handleAddOtherCharge = (rowId, charge) => {
    setQueue((prev) => prev.map((r) => {
      if (r.id !== rowId) return r;
      const ratio = r.totalCharge > 0 ? r.rightsCoverage / r.totalCharge : 0;
      const covered = Math.round(charge.amount * ratio);
      const patientPortion = charge.amount - covered;
      const newItem = {
        id: `other-manual-${r.items.length}`,
        category: 'other',
        label: charge.label,
        qty: 1,
        unitPrice: charge.amount,
        amount: charge.amount,
        covered,
        patientPortion,
        selected: true,
        addedManually: true,
        rightsKeyUsed: charge.rightsKey,
        performingUnit: charge.performingUnit,
        referringUnit: charge.referringUnit,
        doctor: charge.doctor,
      };
      return {
        ...r,
        items: [...r.items, newItem],
        totalCharge: r.totalCharge + charge.amount,
        rightsCoverage: r.rightsCoverage + covered,
        amountDue: r.amountDue + patientPortion,
      };
    }));
  };

  /* บันทึกปรับปรุงสถานะการรับชำระ — คู่มือ §2.4. Batch-corrects the
     status of one or more selected rows, separate from the §2.1 void
     sub-flow (single receipt, reason required, paid→voided only). */
  const handleAdjustStatus = (rowIds, newStatus, signer) => {
    const idSet = new Set(rowIds);
    setQueue((prev) => prev.map((r) => (idSet.has(r.id)
      ? { ...r, status: newStatus, statusAdjustedBy: signer }
      : r)));
  };

  const statusRows = useMemo(
    () => (tab === 'all' ? queue : queue.filter((r) => r.status === tab)),
    [queue, tab],
  );

  const rows = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return statusRows;
    return statusRows.filter((r) => {
      const fields = [r.queueNo, r.hn, r.patient.shortName, r.dept, r.patient.nationalId];
      return fields.some((f) => f && f.toString().toLowerCase().includes(q));
    });
  }, [statusRows, searchQ]);

  /* Queue-table sorting — click a header to sort, click again to flip
     direction. Each sortable column maps to a plain-value accessor so the
     comparator stays generic (numeric vs. Thai-locale string compare). */
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const handleSort = (key) => setSortConfig((prev) => (prev.key === key
    ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
    : { key, direction: 'asc' }));

  const QUEUE_SORT_ACCESSORS = {
    queueNo: (r) => r.queueNo,
    hn: (r) => r.hn,
    patient: (r) => r.patient.shortName,
    rights: (r) => r.rights.label,
    dept: (r) => r.dept,
    amountDue: (r) => r.amountDue,
    status: (r) => QUEUE_STATUSES.findIndex((s) => s.key === r.status),
  };

  const sortedRows = useMemo(() => {
    const accessor = QUEUE_SORT_ACCESSORS[sortConfig.key];
    if (!accessor) return rows;
    const dir = sortConfig.direction === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), 'th') * dir;
    });
  }, [rows, sortConfig]);

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return queue
      .filter((r) => [r.queueNo, r.hn, r.patient.shortName, r.dept, r.patient.nationalId]
        .some((f) => f && f.toString().toLowerCase().includes(q)))
      .slice(0, 8)
      .map(queueRowToSearchItem);
  }, [queue, searchQ]);

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = queue.find((row) => row.queueNo === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return queue.find((row) => [row.queueNo, row.hn, row.patient.shortName, row.dept, row.patient.nationalId]
      .some((f) => f && f.toString().toLowerCase().includes(q))) ?? null;
  };

  const createRecentSearchEntry = (query, item) => {
    const row = resolveSearchRow(query, item);
    return row ? queueRowToSearchItem(row) : query;
  };

  /* INNER level — payment-status filter, nested inside the "คิวชำระเงิน"
     section only (see the file-header comment on hierarchy). */
  const statusTabs = [
    { key: 'all', label: 'ทั้งหมด', icon: 'receipt_long', count: queue.length },
    ...QUEUE_STATUSES.map((s) => ({
      key: s.key,
      label: s.label,
      icon: STATUS_TAB_ICON[s.key],
      count: queue.filter((r) => r.status === s.key).length,
    })),
  ];

  /* OUTER level — section switcher, owns QueuePageShell's sticky `tabs`
     slot (same position/style as OPD's screening queue). */
  const sectionTabs = SECTIONS.map((s) => ({ key: s.key, label: s.label, icon: s.icon }));

  const columns = [
    { key: 'queueNo', label: 'คิว', width: 80 },
    { key: 'hn', label: 'HN', width: 110 },
    {
      key: 'patient', label: 'ผู้ป่วย', flex: true, minWidth: 220,
      render: (row) => (
        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
          <PersonAvatar name={row.patient.shortName} src={row.patient.avatarUrl} />
          <EllipsisText text={row.patient.shortName} />
        </div>
      ),
    },
    { key: 'rights', label: 'สิทธิ', width: 140, render: (row) => <ColorfulBadge badgeStyle={row.rights.badge} size='small'>{row.rights.short}</ColorfulBadge> },
    { key: 'dept', label: 'แผนก', width: 140 },
    {
      /* สถานะการเตรียมยา — TOR §1.8.8.1: lets the cashier see whether
         pharmacy has finished before calling the patient to pay. */
      key: 'pharmacyStatus', label: 'สถานะเตรียมยา', width: 140,
      render: (row) => (
        <StatusBadge style={PHARMACY_STATUSES[row.pharmacyStatus].color} size='small'>
          {PHARMACY_STATUSES[row.pharmacyStatus].label}
        </StatusBadge>
      ),
    },
    { key: 'amountDue', label: 'ยอดชำระ', width: 120, render: (row) => <span style={{ fontWeight: 'var(--type-weight-bold)' }}>{formatBaht(row.amountDue)}</span> },
    { key: 'status', label: 'สถานะ', width: 140, render: (row) => <StatusBadge style={STATUS_STYLE[row.status]} size='small'>{QUEUE_STATUSES.find((s) => s.key === row.status)?.label}</StatusBadge> },
    {
      key: 'action', label: '', width: 200, sortable: false,
      render: (row) => (
        <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-150)' }}>
          {row.status === 'pending' && row.pharmacyStatus === 'ready' && (
            calledQueue.has(row.id)
              ? <StatusBadge style='info' size='small'>เรียกคิวแล้ว</StatusBadge>
              : (
                <NeutralSubdueButton
                  size='sm'
                  leadingIcon='campaign'
                  onClick={(e) => { e.stopPropagation(); setCalledQueue((prev) => new Set(prev).add(row.id)); }}
                >
                  เรียกคิว
                </NeutralSubdueButton>
              )
          )}
          {row.status === 'pending'
            ? <BrandSubdueButton size='sm' onClick={(e) => { e.stopPropagation(); setActiveRow(row); }}>ชำระเงิน</BrandSubdueButton>
            : <NeutralSubdueButton size='sm' onClick={(e) => { e.stopPropagation(); setActiveRow(row); }}>ดูใบเสร็จ</NeutralSubdueButton>}
        </div>
      ),
    },
  ];

  const SUMMARY_CARDS = [
    { key: 'pending', label: 'รอชำระเงิน', value: summary.pendingCount, indicator: 'ในคิวการเงิน', color: 'info', icon: 'hourglass_top' },
    { key: 'paid', label: 'ชำระแล้ววันนี้', value: summary.paidCount, indicator: formatBaht(summary.paidTotal), color: 'positive', icon: 'check_circle' },
    { key: 'outstanding', label: 'ยอดค้างชำระ', value: formatBaht(summary.outstandingTotal), indicator: 'รอเรียกเก็บ', color: 'warning', icon: 'account_balance_wallet' },
    { key: 'voided', label: 'ใบเสร็จที่ยกเลิก', value: summary.voidedCount, indicator: 'วันนี้', color: 'destructive', icon: 'receipt_long' },
  ];

  return (
    <QueuePageShell
      activeKey='finance'
      breadcrumb={breadcrumb}
      title='งานการเงิน (Finance / Payment)'
      summaryCards={SUMMARY_CARDS}
      summaryFlushUnderSubHeader={false}
      tabs={sectionTabs}
      activeTab={section}
      onTabChange={setSection}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-600)',
          gap: 'var(--dim-space-600)',
        }}
      >
        {/* Content background — flat surface-card, no border/shadow
            (matches src/pages/opd/QueuePage.jsx's overall layout approach,
            without that page's border + box-shadow treatment). */}
        <div
          className='flex flex-col'
          style={{
            gap: 'var(--dim-space-400)',
            background: 'var(--surface-card-100)',
            borderRadius: 'var(--dim-radius-300)',
            padding: 'var(--dim-space-400)',
          }}
        >
          {section === 'queue' && (
            <>
              {/* แจ้งเตือนกรณีค้างชำระ — TOR §1.8.1.16. Surfaces the
                  outstanding-balance count/total up front instead of only
                  inside the ยอดค้างชำระ tab, with a shortcut into that
                  section's follow-up flow. */}
              {summary.pendingCount > 0 && (
                <Alert
                  type='warning'
                  title={`มีผู้รับบริการค้างชำระ ${summary.pendingCount} ราย`}
                  subtext={`ยอดรวม ${formatBaht(summary.outstandingTotal)}`}
                  detail={(
                    <div className='flex justify-end w-full'>
                      <BrandSubdueButton size='sm' onClick={() => setSection('outstanding')}>ดูรายการค้างชำระ</BrandSubdueButton>
                    </div>
                  )}
                />
              )}

              {/* Centered PrimarySearch — same component/position as
                  src/pages/opd/QueuePage.jsx's queue search. */}
              <div className='w-full flex items-start justify-center'>
                <PrimarySearch
                  value={searchQ}
                  onChange={(v) => setSearchQ(v)}
                  onSubmit={(v, item) => {
                    pushHistory(createRecentSearchEntry(v, item));
                    setSearchQ(v);
                    const row = resolveSearchRow(v, item);
                    if (row) setActiveRow(row);
                  }}
                  placeholder='ค้นหาคิว / HN / ชื่อ-สกุลผู้ป่วย / เลขบัตรประชาชน / แผนก'
                  width={640}
                  history={searchHistory}
                  onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                  suggestions={searchSuggestions}
                />
              </div>

              {/* INNER level — payment-status filter, below the search box.
                  FilterTag chips (same filter-tag style as OPD's screening
                  queue) rather than capsule tabs. */}
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                {statusTabs.map((t) => (
                  <FilterTag
                    key={t.key}
                    leadingIcon={t.icon}
                    selected={tab === t.key}
                    onClick={() => setTab(t.key)}
                    value={(
                      <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
                        {t.label}
                        {typeof t.count === 'number' && (
                          <span
                            className='inline-flex items-center justify-center'
                            style={{
                              minWidth: 20,
                              height: 18,
                              paddingLeft: 'var(--dim-space-150)',
                              paddingRight: 'var(--dim-space-150)',
                              borderRadius: 'var(--dim-radius-full)',
                              background: tab === t.key ? 'var(--surface-brandtag-selected)' : 'var(--surface-brandtag-default)',
                              color: tab === t.key ? 'var(--text-brandtag-selected)' : 'var(--text-brandtag-title)',
                              fontFamily: 'var(--type-family-body)',
                              fontSize: 'var(--type-size-xs)',
                              fontWeight: 'var(--type-weight-medium)',
                            }}
                          >
                            {t.count}
                          </span>
                        )}
                      </span>
                    )}
                  />
                ))}
              </div>
              <Table
                columns={columns}
                rows={sortedRows}
                sortConfig={sortConfig}
                onSort={handleSort}
                stickyColCount={3}
                onRowClick={(row) => setActiveRow(row)}
                emptyMessage='ไม่มีรายการในคิวการเงิน'
              />
              {activeRow && <PaymentModal row={activeRow} onClose={() => setActiveRow(null)} onVoid={handleVoid} onPay={handlePay} pricing={pricing} />}
            </>
          )}
          {section === 'other' && <OtherChargesSection queue={queue} onAddCharge={handleAddOtherCharge} />}
          {section === 'status' && <PaymentStatusAdjustmentSection queue={queue} onAdjustStatus={handleAdjustStatus} />}
          {section === 'signature' && <SignatureSection queue={queue} onSign={handleSign} />}
          {section === 'register' && <RevenueRegisterSection queue={queue} />}
          {section === 'outstanding' && <OutstandingSection queue={queue} onFollowUp={handleFollowUp} />}
          {section === 'cutoff' && <CutoffSection queue={queue} cutoff={cutoff} onCutoff={handleCutoff} />}
          {section === 'rights' && <RightsAdjustmentSection queue={queue} onAdjustRights={handleAdjustRights} />}
          {section === 'eclaim' && <EclaimSection queue={queue} />}
          {section === 'nhsoImport' && <NhsoImportSection value={nhso} onChange={setNhso} />}
          {section === 'audit' && <CashierAuditSection queue={queue} />}
          {section === 'reports' && <FinanceReportsSection queue={queue} nhso={nhso.records} />}
          {section === 'pricing' && <PricingSettingsSection value={pricing} onChange={setPricing} />}
        </div>
      </div>
    </QueuePageShell>
  );
};

export default FinancePaymentPage;
