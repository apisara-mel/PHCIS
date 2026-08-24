import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Icon from '@/components/icons/Icon';
import Badge from '@/components/badge/Badge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueIconButton from '@/components/button/DangerSubdueIconButton';
import SuccessToast from '@/components/toast/SuccessToast';
import AlertDialog from '@/components/popup/AlertDialog';
import Alert from '@/components/alert/Alert';
import Popup from '@/components/popup/Popup';
import Checkbox from '@/components/checkbox/Checkbox';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import XrayOrderPicker from '@/components/xray/XrayOrderPicker';
import XrayReportSheet from '@/components/xray/XrayReportSheet';
import XraySlotPicker from '@/components/xray/XraySlotPicker';
import { PATIENT_PROFILES } from '@/data/patientProfiles';
import {
  XRAY_EXAM_BY_ID, XRAY_VIEWS, XRAY_FILM_SIZES, XRAY_RIGHT_BY_KEY,
  getRegion, claimFor, summariseSelection, duplicateWarning,
} from '@/data/xrayCatalog';
import {
  XRAY_URGENCIES, XRAY_LOCATIONS, XRAY_REQUEST_TYPES, XRAY_ORDERS,
  generateXN, xrayHistoryFor,
} from '@/data/xrayOrders';
import { XRAY_RADIOGRAPHERS } from '@/data/xrayResultTemplates';
import { roomsForExams, bookXraySlot, formatThaiDateTime } from '@/data/xraySchedule';

/* บันทึกส่งตรวจทางรังสีวิทยา — the RIS order-entry screen (TOR §1.12.5,
   with the นัดตรวจ branch of §1.12.3 and the patient search of §1.12.2).

   Modeled 1:1 on the legacy manual (คู่มืออบรมระบบงานรังสีวินิจฉัย สำนักอนามัย
   §2.1 บันทึกขอตรวจรังสี), whose 12 numbered steps map onto the sections
   below: patient look-up → วันเวลาส่ง/นัด + ลักษณะการขอตรวจ → อาการโดยย่อ +
   การวินิจฉัย → รายการตรวจ (เดี่ยว/ชุด) with running รวมเงินทั้งหมด →
   รายการฟิล์ม + ผู้ถ่าย → บันทึก → เลือกพิมพ์ ใบส่งตรวจรังสี / ใบนัดตรวจรังสี /
   ฉลากติดซองฟิล์ม / ใบฉายรังสี.

   The exam-selection control itself is <XrayOrderPicker> — deliberately a
   standalone component so the doctor's CPOE screen (TreatmentSteps) can
   mount the same control against its xrayOrders[] slice without
   duplicating the price-per-right / duplicate-block logic. This page is
   the surrounding context that turns a selection into a real request:
   who it's for, from which clinic, how urgent, and on whose สิทธิ.       */

const breadcrumb = ['งานรังสีวินิจฉัย (X-ray)', 'บันทึกส่งตรวจทางรังสีวิทยา'];

/* ── Native-control chrome strip ────────────────────────────────────────
   CLAUDE.md "No browser-default input chrome". This page is form-heavy;
   every native input/textarea/select carries `.mih-xrayorder-field`.
   These controls OWN their border (drawn inline from input tokens), so
   the strip removes outline / box-shadow / appearance — the things
   Webkit/Chromium add on focus — while the focus state is expressed by
   swapping the inline border colour to the brand-aware typing token.
   Idempotent module-load injection (AISearch.jsx canonical pattern) so
   HMR never leaves a stale <style> behind. */
if (typeof document !== 'undefined') {
  const styleId = 'mih-xrayorder-field-style';
  const css = `
.mih-xrayorder-field::placeholder { color: var(--text-primarysearch-default, #ADB2B7); opacity: 1; }
@media print {
  body * { visibility: hidden !important; }
  .mih-xrayorder-print-area, .mih-xrayorder-print-area * { visibility: visible !important; }
  .mih-xrayorder-print-area { position: fixed; inset: 0; overflow: visible; background: #FFFFFF; }
  .mih-xrayorder-print-area .no-print { display: none !important; }
}
.mih-xrayorder-field,
.mih-xrayorder-field:focus,
.mih-xrayorder-field:focus-visible {
  outline: none !important;
  box-shadow: none !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-xrayorder-field:focus,
.mih-xrayorder-field:focus-visible {
  border-color: var(--border-input-typing) !important;
}
/* Invalid state wins over the typing colour so the red border stays put
   while the user is fixing the field — the error clears live (the rule
   stops matching) the moment the value satisfies the requirement. */
.mih-xrayorder-field[aria-invalid='true'] {
  border-color: var(--border-input-error) !important;
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

/* ── Local helpers (same idiom as LabOrderPage — page-scoped, not shared
      files, so other agents' screens stay decoupled) ─────────────────── */

const SectionCard = ({ id, icon, title, subtitle, children, action }) => (
  <section
    id={id}
    className='bg-surface-card rounded-card shadow-card flex flex-col w-full'
    style={{
      /* Anchor-chip jumps land the section heading BELOW the sticky
         header + section rail instead of underneath them. */
      scrollMarginTop: 'var(--dim-size-2100, 160px)',
      /* Longhand only — React inline `padding:` shorthand carrying var()
         is dropped by CSSOM and renders as 0. */
      paddingTop: 'var(--dim-space-600)',
      paddingRight: 'var(--dim-space-600)',
      paddingBottom: 'var(--dim-space-600)',
      paddingLeft: 'var(--dim-space-600)',
      gap: 'var(--dim-space-400)',
    }}
  >
    <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <div
        className='shrink-0 inline-flex items-center justify-center'
        style={{
          width: 'var(--dim-size-800, 40px)',
          height: 'var(--dim-size-800, 40px)',
          borderRadius: 'var(--dim-radius-300, 10px)',
          background: 'var(--surface-brandPrimary-quaternary)',
          color: 'var(--text-brandPrimary-default)',
        }}
      >
        <Icon name={icon} size={20} />
      </div>
      <div className='flex-1 min-w-0 flex flex-col'>
        <h2 className='text-base font-bold text-ink'>{title}</h2>
        {subtitle && <p className='text-xs text-ink-tertiary'>{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

/* Same radio-card shape as LabOrderPage / PharmacyRegistryEditPage so the
   selection language stays consistent across modules. These buttons ACT
   as radios, so they carry radio semantics (role='radio' + aria-checked)
   and a roving tabIndex managed by <RadioCardGroup> (WCAG 4.1.2). */
const RadioCard = ({ label, sublabel, icon = 'category', selected, onSelect, tone, tabIndex, buttonRef }) => (
  <button
    type='button'
    ref={buttonRef}
    role='radio'
    aria-checked={selected}
    tabIndex={tabIndex}
    onClick={onSelect}
    className='flex items-center w-full text-left'
    style={{
      gap: 'var(--dim-space-200)',
      paddingTop: 'var(--dim-space-300)',
      paddingRight: 'var(--dim-space-300)',
      paddingBottom: 'var(--dim-space-300)',
      paddingLeft: 'var(--dim-space-300)',
      background: selected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
      border: `var(--dim-stroke-100) solid ${selected ? 'var(--border-brandPrimary-default)' : 'var(--border-card-default)'}`,
      borderRadius: 'var(--dim-radius-200)',
      cursor: 'pointer',
    }}
  >
    <Icon name={icon} size={18} style={{ color: tone ?? (selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-tertiary)') }} />
    <span className='flex-1 min-w-0 flex flex-col'>
      <span className='text-sm font-bold' style={{ color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-default)' }}>
        {label}
      </span>
      {sublabel && <span className='text-xs text-ink-tertiary'>{sublabel}</span>}
    </span>
    {selected && <Icon name='check_circle' size={18} style={{ color: 'var(--text-brandPrimary-default)' }} />}
  </button>
);

/* Inline field error — rendered under the offending control, tied to it
   via aria-describedby (WCAG 3.3.1/3.3.2). Icon + text, never colour
   alone (WCAG 1.4.1). */
const FieldError = ({ id, children }) => (
  <span
    id={id}
    className='inline-flex items-start'
    style={{
      gap: 'var(--dim-space-100)',
      color: 'var(--text-input-require)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs)',
    }}
  >
    <span className='shrink-0' aria-hidden><Icon name='error' size={14} /></span>
    <span>{children}</span>
  </span>
);

/* ค่าที่ใช้ครั้งล่าสุด hint — marks a session-prefilled field so the value
   is obviously inherited, never silently submitted (Nielsen #1). */
const PrefillHint = () => (
  <span
    className='inline-flex items-center'
    style={{
      gap: 'var(--dim-space-100)',
      color: 'var(--text-content-tertiary)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs)',
    }}
  >
    <span aria-hidden><Icon name='history' size={12} /></span>
    ค่าที่ใช้ครั้งล่าสุด — แก้ไขได้
  </span>
);

/* Radio-card group — the accessible wrapper the RadioCard buttons live in:
   role='radiogroup' + accessible name, roving tabIndex (selected option —
   or the first — is the single tab stop) and arrow-key navigation that
   moves AND selects, per the WAI-ARIA radio-group pattern. */
const RadioCardGroup = ({ id, groupLabel, options, value, onChange, gridClass = 'grid grid-cols-2 gap-3', required, error }) => {
  const refs = React.useRef({});
  const move = (dir) => {
    const keys = options.map((o) => o.key);
    const idx = keys.indexOf(value);
    const next = keys[((idx < 0 ? 0 : idx) + dir + keys.length) % keys.length];
    onChange(next);
    const el = refs.current[next];
    if (el) el.focus();
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
  };
  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
      <div
        id={id}
        role='radiogroup'
        aria-label={groupLabel}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        tabIndex={-1}
        className={gridClass}
        onKeyDown={onKeyDown}
        style={{ outline: 'none' }}
      >
        {options.map((o, i) => (
          <RadioCard
            key={o.key}
            label={o.label}
            sublabel={o.sublabel}
            icon={o.icon}
            tone={o.tone}
            selected={value === o.key}
            onSelect={() => onChange(o.key)}
            tabIndex={value === o.key || (value == null && i === 0) ? 0 : -1}
            buttonRef={(el) => { refs.current[o.key] = el; }}
          />
        ))}
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
};

/* Shared inline style for the bordered native fields — the control owns
   its border; the injected class above owns the focus behaviour. */
const fieldStyle = {
  width: '100%',
  paddingTop: 'var(--dim-space-150)',
  paddingRight: 'var(--dim-space-300)',
  paddingBottom: 'var(--dim-space-150)',
  paddingLeft: 'var(--dim-space-300)',
  background: 'var(--surface-input-default)',
  border: 'var(--dim-stroke-100) solid var(--border-input-default)',
  borderRadius: 'var(--dim-radius-200)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  color: 'var(--text-content-default)',
};

/* Required-field label — the legacy manual marks required data in BOLD
   (§2.1 item 2 "ข้อมูลที่แสดงเป็นตัวหนาเป็นข้อมูลที่จำเป็นต้องใส่"); this app
   renders bold + the red asterisk of the DS input spec (§1.12.5.5). */
const FieldLabel = ({ children, required }) => (
  <span
    className='text-xs'
    style={{
      color: 'var(--text-content-secondary)',
      fontWeight: required ? 'var(--type-weight-bold)' : 'var(--type-weight-regular)',
    }}
  >
    {children} {required && <span style={{ color: 'var(--text-input-require)' }}>*</span>}
  </span>
);

/* Every field: explicit id + htmlFor (WCAG 1.3.1 / 4.1.2 — the wrapping
   <label> already associates implicitly, the explicit pair makes it
   robust for AT and lets the save gate focus the exact control),
   aria-required on required fields, and an inline error tied via
   aria-describedby (WCAG 3.3.1/3.3.2). */
const SelectField = ({ id, label, value, onChange, options, required, placeholder, error, hint }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
    <label htmlFor={id} className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <select
        id={id}
        className='mih-xrayorder-field'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        style={fieldStyle}
      >
        {placeholder !== undefined && <option value=''>{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
    {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    {!error && hint}
  </div>
);

const TextField = ({ id, label, value, onChange, required, placeholder, type = 'text', readOnly = false, error, hint }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
    <label htmlFor={id} className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        id={id}
        className='mih-xrayorder-field'
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={readOnly ? undefined : (e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        style={{
          ...fieldStyle,
          ...(readOnly ? { background: 'var(--surface-input-disabled)', color: 'var(--text-content-secondary)' } : null),
        }}
      />
    </label>
    {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    {!error && hint}
  </div>
);

const TextAreaField = ({ id, label, value, onChange, required, placeholder, rows = 3, error }) => (
  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)' }}>
    <label htmlFor={id} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)' }}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <textarea
        id={id}
        className='mih-xrayorder-field'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        style={{ ...fieldStyle, resize: 'vertical' }}
      />
    </label>
    {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
  </div>
);

/* ── Domain lookups ────────────────────────────────────────────────────── */

/* สิทธิการรักษา — PATIENT_PROFILES stores the registration module's free-
   text insurance line; claimFor() needs the 5-key right. BMA is matched
   before the generic ข้าราชการ so "ข้าราชการกรุงเทพมหานคร" doesn't fall
   into the กรมบัญชีกลาง bucket. Unknown → CASH (claim 0), the safe
   default per xrayCatalog's claimFor contract. */
const rightKeyForInsurance = (insurance = '') => {
  if (insurance.includes('ประกันสังคม')) return 'SSS';
  if (insurance.includes('บัตรทอง') || insurance.includes('หลักประกัน')) return 'UCS';
  if (insurance.includes('ข้าราชการกรุงเทพมหานคร')) return 'BMA';
  if (insurance.includes('ข้าราชการ')) return 'OFC';
  return 'CASH';
};

const VIEW_BY_KEY = Object.fromEntries(XRAY_VIEWS.map((v) => [v.key, v]));
const allViewsCode = (exam) => (exam.views ?? []).map((k) => VIEW_BY_KEY[k]?.code ?? k).join('/');

const FILM_BY_KEY = Object.fromEntries(XRAY_FILM_SIZES.map((f) => [f.key, f]));

const baht = (n) => (n ?? 0).toLocaleString('th-TH');

/* เลข XN — §1.12.5.2 "ระบบ Automatic Generate เลข XN". The mock's last
   issued sequence is 412 (first curated XN) + the number of unique XNs
   already in XRAY_ORDERS, so this preview is exactly the next number the
   backend would hand out — derived, never hard-coded, so it can't drift
   when the mock grows. */
const NEXT_XN = generateXN(412 + new Set(XRAY_ORDERS.map((o) => o.xn)).size);

/* Ionizing modalities — the pregnancy hard-warning below applies to these
   only (US and MRI carry no radiation dose, which is exactly why the ANC
   clinic can order us-ob for a pregnant patient). */
const IONIZING = new Set(['xr', 'fl', 'mg', 'ct', 'bd', 'dn']);

const PREGNANCY_STATUSES = ['ตั้งครรภ์', 'ไม่ตั้งครรภ์', 'ไม่แน่ใจ', 'หมดประจำเดือน'];

/* ── ข้อมูลที่จำเป็นตามทะเบียนรายการตรวจ (TOR §1.12.5.5) ─────────────────
   "สามารถกำหนดข้อมูลที่จำเป็นสำหรับการส่งตรวจทางรังสีวิทยาได้" — the setup
   screen (XraySetupPage, ORDER_REQUIRED_FIELD_OPTIONS) lets the admin tag
   each exam with `requiredFields: string[]` (persisted via upsertXrayExam);
   THAT per-exam config is the source of truth here. This screen reads it
   and layers it as a UNION on top of its own baseline requirements — it
   never writes it. Exams saved before the setup screen existed carry no
   `requiredFields` property → treated as []. Keys mirror the setup
   screen's stable identifiers; the labels are what the doctor sees. */
const REQUIRED_FIELD_LABELS = {
  briefSymptoms:   'อาการและผลการตรวจทางคลินิกโดยย่อ',
  diagnosis:       'การวินิจฉัย',
  allergyHistory:  'ประวัติการแพ้ (ตอบ มี/ไม่มี)',
  femaleScreening: 'ประวัติประจำเดือน/การตั้งครรภ์',
  views:           'ท่าถ่าย',
  reason:          'เหตุผลการส่งตรวจ',
};

/* ── Sticky section rail (Nielsen #1 visibility of status) ──────────────
   One chip per form section; each shows ครบ / ยังไม่ครบ and scrolls to its
   section. Kept to six compact chips — a wayfinder, not a wizard. */
const FORM_SECTIONS = [
  { key: 'patient',   label: 'ผู้รับบริการ' },
  { key: 'request',   label: 'ข้อมูลการขอตรวจ' },
  { key: 'screening', label: 'คัดกรอง' },
  { key: 'exams',     label: 'รายการตรวจ' },
  { key: 'film',      label: 'ฟิล์ม' },
  { key: 'note',      label: 'บันทึกเพิ่มเติม' },
];
const sectionDomId = (key) => `xray-order-sec-${key}`;

/* ── Session memory for the repeat-entry fields ─────────────────────────
   A clerk keying 30 orders re-types their own clinic 30 times without
   this. sessionStorage (not localStorage) on purpose: the prefill dies
   with the browser session, so a shared workstation never inherits
   yesterday's clinic. The value is always visibly marked ค่าที่ใช้
   ครั้งล่าสุด and freely editable — never silently submitted. */
const PREFILL_STORE_KEY = 'mih-xray-order-lastused';
const readLastUsed = () => {
  try { return JSON.parse(sessionStorage.getItem(PREFILL_STORE_KEY) || 'null') || {}; }
  catch { return {}; }
};
const writeLastUsed = (data) => {
  try { sessionStorage.setItem(PREFILL_STORE_KEY, JSON.stringify(data)); }
  catch { /* storage unavailable — prefill is a convenience, not a requirement */ }
};

const XrayOrderPage = () => {
  const routerHistory = useHistory();

  /* ── ผู้รับบริการ (§1.12.2) ─────────────────────────────────────────── */
  const [patientQuery, setPatientQuery] = useState('');
  const [patient, setPatient] = useState(null);

  /* ── ข้อมูลการขอตรวจ (§1.12.5.2) ────────────────────────────────────── */
  /* วันเวลาที่ขอบันทึก — legacy §2.1 item 1: defaulted by the system and
     "ไม่สามารถทำการแก้ไขข้อมูลได้". Captured once at page open. */
  const [requestedAt] = useState(() => new Date().toLocaleString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }));
  const [sendAt, setSendAt] = useState('');
  /* ช่วงเวลานัดที่จองไว้จริงในตารางห้องตรวจ — TOR §1.12.3. `sendAt` remains
     the raw datetime the form has always carried (and the walk-in path
     still uses it alone); `slot` is the booked room slot behind it. */
  const [slot, setSlot] = useState(null);
  const [requestType, setRequestType] = useState('');
  const [urgency, setUrgency] = useState('');
  /* คลินิกที่ขอตรวจ / แพทย์ผู้ส่งตรวจ open pre-filled from the last saved
     order in this browser session (see PREFILL_STORE_KEY above). The
     *Prefilled flags drive the ค่าที่ใช้ครั้งล่าสุด hint and clear the
     moment the user edits — an edited value is theirs, not inherited. */
  const [lastUsed] = useState(readLastUsed);
  const [location, setLocation] = useState(() => lastUsed.location ?? '');
  const [doctor, setDoctor] = useState(() => lastUsed.doctor ?? '');
  const [locationPrefilled, setLocationPrefilled] = useState(() => Boolean(lastUsed.location));
  const [doctorPrefilled, setDoctorPrefilled] = useState(() => Boolean(lastUsed.doctor));
  const handleLocation = (v) => { setLocation(v); setLocationPrefilled(false); };
  const handleDoctor = (v) => { setDoctor(v); setDoctorPrefilled(false); };

  /* ── ข้อมูลผู้รับบริการก่อนเข้ารับรังสี (§1.12.5.3) ─────────────────── */
  /* ประวัติการแพ้ is a TRI-state on purpose (§1.12.5.5): the registry can
     declare allergy history required per exam, and "required" means
     ANSWERED — "ไม่แพ้" (false) is an answer; the untouched control (null)
     is not. A plain checkbox can't tell "no" from "not asked yet". */
  const [allergyHas, setAllergyHas] = useState(null);
  const [allergyAgent, setAllergyAgent] = useState('');
  const [allergySymptom, setAllergySymptom] = useState('');
  const [lmp, setLmp] = useState('');
  const [pregStatus, setPregStatus] = useState('');
  const [clinicalSummary, setClinicalSummary] = useState('');
  const [diagnosis, setDiagnosis] = useState('');

  /* ── รายการตรวจ (§1.12.5.4) ─────────────────────────────────────────── */
  const [selected, setSelected] = useState([]);
  const [viewSel, setViewSel] = useState({}); /* examId → view key | 'all' */
  const [pickerOpen, setPickerOpen] = useState(false);
  /* A blocked สั่งซ้ำ from the history list — AlertDialog with the reason
     (§1.12.5.9 'block' must explain itself, not just refuse). */
  const [blockDialog, setBlockDialog] = useState(null);

  /* ── รายการฟิล์ม (legacy §2.1 item 8) ───────────────────────────────── */
  const [filmRows, setFilmRows] = useState([]);
  const [filmSizeKey, setFilmSizeKey] = useState('14x17');
  const [filmQty, setFilmQty] = useState('1');
  const [radiographerId, setRadiographerId] = useState('');

  /* เหตุผลการส่งตรวจ — §1.12.5.5: exists so the registry's `reason` key
     has a field to guard. Optional unless a selected exam demands it. */
  const [reason, setReason] = useState('');

  /* ── Note (§1.12.5.8) + save flow ───────────────────────────────────── */
  const [note, setNote] = useState('');
  const [showMissing, setShowMissing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printSel, setPrintSel] = useState({ request: true, appointment: false, filmLabel: true, exposure: true });
  const [printToast, setPrintToast] = useState(false);

  const rightKey = patient ? rightKeyForInsurance(patient.insurance) : 'CASH';
  const right = XRAY_RIGHT_BY_KEY[rightKey];
  const patientHistory = useMemo(() => (patient ? xrayHistoryFor(patient.hn) : []), [patient]);
  const selectedExams = useMemo(() => selected.map((id) => XRAY_EXAM_BY_ID[id]).filter(Boolean), [selected]);
  const summary = useMemo(() => summariseSelection(selected, rightKey), [selected, rightKey]);

  /* Patient search suggestions — §1.12.2 verbatim: HN / ชื่อ-สกุล /
     เลขบัตรประชาชน. Matching starts at 2 characters so the dropdown never
     lists all 25 profiles on the first keystroke. */
  const patientMatchCount = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (q.length < 2) return 0;
    return PATIENT_PROFILES.filter((p) => p.hn.toLowerCase().includes(q)
      || p.fullName.toLowerCase().includes(q)
      || (p.nationalId ?? '').includes(q)).length;
  }, [patientQuery]);

  const patientSuggestions = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return PATIENT_PROFILES
      .filter((p) => p.hn.toLowerCase().includes(q)
        || p.fullName.toLowerCase().includes(q)
        || (p.nationalId ?? '').includes(q))
      .slice(0, 8)
      .map((p) => ({
        id: p.hn,
        label: `${p.fullName} · HN ${p.hn}`,
        sublabel: `${p.sex} · ${p.age} · ${p.insurance}`,
        value: p.hn,
        icon: 'person',
      }));
  }, [patientQuery]);

  /* Selecting a patient RESETS the clinical slice of the form. Duplicate
     warnings, pregnancy screening and allergy history are all per-patient
     — carrying นาย ก.'s exam list onto นาง ข.'s order is the wrong-patient
     error this screen exists to prevent. */
  const selectPatient = (hn) => {
    const p = PATIENT_PROFILES.find((x) => x.hn === hn);
    if (!p) return;
    setPatient(p);
    setPatientQuery(`${p.fullName} · HN ${p.hn}`);
    /* The patient's own attending doctor wins over the session prefill;
       when the profile names none, an untouched prefill stays (clearly
       hinted as ค่าที่ใช้ครั้งล่าสุด) while a hand-typed value resets —
       same per-patient reset semantics as the clinical slice below. */
    if (p.doctor && p.doctor !== '—') {
      setDoctor(p.doctor);
      setDoctorPrefilled(false);
    } else if (!doctorPrefilled) {
      setDoctor('');
    }
    setSelected([]);
    setViewSel({});
    setAllergyHas(null); /* back to "ยังไม่ได้ตอบ" — see the tri-state note above */
    setAllergyAgent('');
    setAllergySymptom('');
    setLmp('');
    setPregStatus('');
    setClinicalSummary('');
    setDiagnosis('');
    setReason('');
    setFilmRows([]);
    setShowMissing(false);
    /* the booked slot belonged to the previous patient's basket */
    setSlot(null);
    setSendAt('');
  };

  /* วันเวลาส่ง/นัด → ลักษณะการขอตรวจ auto-flip — legacy §2.2 behaviour
     preserved verbatim: "changing วันเวลาส่ง/นัด flips ลักษณะการขอตรวจ to
     นัดตรวจ automatically" (and TOR §1.12.3 carries the appointment
     requirement forward). A past/now datetime keeps walk-in semantics. */
  const handleSendAt = (v) => {
    setSendAt(v);
    /* Hand-typing the datetime bypasses the room calendar, so the booked
       slot no longer describes what is on screen — drop it rather than
       print an appointment slip for a slot nobody holds. */
    if (slot && v !== slot.isoLocal) setSlot(null);
    if (v && new Date(v).getTime() > Date.now()) {
      if (requestType !== 'appointment') setRequestType('appointment');
    } else if (requestType === 'appointment') {
      setRequestType('walkin');
    }
  };

  /* Adding or removing an exam changes how many consecutive slots the
     booking needs, so a slot chosen for the OLD basket may no longer fit.
     Drop it and make the user re-pick rather than silently keeping a time
     the room cannot honour. Keyed on the basket itself so a re-render (or
     the save that books the slot) does not clear a still-valid choice. */
  const basketKey = selected.join('|');
  const prevBasket = useRef(basketKey);
  useEffect(() => {
    if (prevBasket.current === basketKey) return;
    prevBasket.current = basketKey;
    setSlot((cur) => {
      if (cur) setSendAt('');
      return null;
    });
  }, [basketKey]);

  /* Picking a slot in the calendar IS setting วันเวลาส่ง/นัด — the two stay
     in lockstep so the existing validation, sheet and auto-flip keep
     working unchanged. */
  const handleSlot = (next) => {
    setSlot(next);
    setSendAt(next?.isoLocal ?? '');
    if (next && requestType !== 'appointment') setRequestType('appointment');
  };

  /* Single add gate — every path that ADDS exams (picker rows handle their
     own gating internally; this covers สั่งตามประวัติเดิม) runs the same
     §1.12.5.9 check: 'block' refuses with the reason, 'warn' proceeds and
     the roll-up alert below the table informs. */
  const tryAdd = (examId) => {
    if (selected.includes(examId)) return;
    const w = duplicateWarning(examId, patientHistory);
    if (w?.level === 'block') {
      setBlockDialog({ examId, warning: w });
      return;
    }
    setSelected((prev) => [...prev, examId]);
  };

  const removeExam = (examId) => {
    setSelected((prev) => prev.filter((x) => x !== examId));
    setViewSel((prev) => {
      const next = { ...prev };
      delete next[examId];
      return next;
    });
  };

  /* ── Clinical safety derivations ────────────────────────────────────── */
  const contrastExams = selectedExams.filter((e) => e.contrast);
  /* แจ้งเตือนแพ้สารทึบรังสี — the §1.12.5.3 allergy block crossed with a
     contrast exam. This is the real safety gate of the screen: iodinated-
     contrast anaphylaxis is the death-on-the-table scenario, so the alert
     is destructive-toned and sits right above the exam table. */
  const contrastAllergyDanger = allergyHas === true && contrastExams.length > 0;

  /* The catalog's femaleScreening flag OR the registry's §1.12.5.5
     `femaleScreening` required-field both open the ประจำเดือน/ตั้งครรภ์
     block — the admin can demand the screening even on an exam whose
     catalog row wasn't flagged. */
  const needPregnancy = Boolean(
    patient && patient.sex === 'หญิง'
    && selectedExams.some((e) => e.femaleScreening || (e.requiredFields ?? []).includes('femaleScreening')),
  );
  const pregnantIrradiation = needPregnancy
    && pregStatus === 'ตั้งครรภ์'
    && selectedExams.some((e) => e.femaleScreening && IONIZING.has(e.modality));

  const selectedWarns = selected
    .map((id) => ({ id, warning: duplicateWarning(id, patientHistory) }))
    .filter((x) => x.warning?.level === 'warn');

  /* ── รายการฟิล์ม helpers ────────────────────────────────────────────── */
  const addFilmRow = () => {
    const qty = Math.max(1, parseInt(filmQty, 10) || 1);
    setFilmRows((prev) => {
      const idx = prev.findIndex((r) => r.sizeKey === filmSizeKey);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...prev, { sizeKey: filmSizeKey, qty }];
    });
  };

  /* เติมตามรายการตรวจ — each exam's catalog entry lists the film consumed
     per exposure (legacy §2.5 item 2), so the film block can be derived
     instead of hand-keyed. Digital entries collapse to one line. */
  const autoFillFilm = () => {
    const counts = new Map();
    selectedExams.forEach((e) => (e.filmSizes ?? []).forEach((k) => {
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }));
    setFilmRows([...counts.entries()].map(([sizeKey, qty]) => ({
      sizeKey,
      qty: sizeKey === 'digital' ? 1 : qty,
    })));
  };

  /* Does ANY selected exam's registry config demand this key? Drives the
     required markers (bold + asterisk) on the guarded fields so the
     doctor sees the demand where the data is keyed, not only at save. */
  const configRequires = (key) => selectedExams.some((e) => (e.requiredFields ?? []).includes(key));

  /* Surface the admin's demands BEFORE save (§1.12.5.5): the moment an
     exam with `requiredFields` joins the order, the doctor sees what
     extra data it will insist on — no surprise at the save gate. */
  const configDemandLines = selectedExams
    .filter((e) => (e.requiredFields ?? []).length > 0)
    .map((e) => `${e.name}: ${(e.requiredFields ?? []).map((k) => REQUIRED_FIELD_LABELS[k] ?? k).join(' · ')}`);

  /* ── Required-field enforcement (§1.12.5.5) ──────────────────────────
     Two layers, one union:
       1. Baseline — what this screen always demands regardless of exam.
       2. Per-exam config — `exam.requiredFields` set on the setup screen
          (TOR §1.12.5.5 "สามารถกำหนดข้อมูลที่จำเป็นสำหรับการส่งตรวจทาง
          รังสีวิทยาได้"). Config entries NAME the demanding exam and carry
          the "ตั้งค่าโดยผู้ดูแลระบบ" hint, so the doctor can tell admin
          policy from screen baseline at a glance. */
  /* Each entry carries the summary-Alert label PLUS where it lives:
     `section` feeds the sticky rail's per-section ครบ/ยังไม่ครบ state and
     `target` is the DOM id the save gate scrolls to and focuses, so a
     blocked save lands the user ON the first offending field instead of
     leaving them to hunt from the summary (Nielsen #9). Validation
     itself is unchanged — same baseline + per-exam-config union. */
  /* Can this basket be booked in-house at all? Drives both the validation
     rule below and the picker's own warning panel. */
  const slotBlockReason = useMemo(() => roomsForExams(selected).blockReason, [selected]);

  const missingItems = useMemo(() => {
    const out = [];
    const push = (label, section, target, short) => out.push({ label, section, target, short: short ?? label });
    if (!patient) push('ผู้รับบริการ (ค้นหาและเลือกผู้ป่วย)', 'patient', 'xo-field-patient', 'กรุณาค้นหาและเลือกผู้รับบริการ');
    if (!requestType) push('ลักษณะการขอตรวจ', 'request', 'xo-field-requestType', 'กรุณาเลือกลักษณะการขอตรวจ');
    if (requestType === 'appointment' && !sendAt) push('วันเวลาส่ง/นัด (จำเป็นเมื่อเป็นนัดตรวจ)', 'request', 'xo-field-sendAt', 'กรุณาระบุวันเวลาส่ง/นัด — จำเป็นเมื่อเป็นนัดตรวจ');
    /* §1.12.3 — a นัดตรวจ has to hold a real room slot. Skipped only when
       the basket has no in-house room to book (referral-only / mixed),
       where the datetime alone is all the system can promise. */
    if (requestType === 'appointment' && !slotBlockReason && !slot) push('ช่วงเวลานัดจากปฏิทินห้องตรวจ', 'request', 'xo-slot-picker', 'กรุณาเลือกช่วงเวลานัดจากปฏิทินห้องตรวจ');
    if (!urgency) push('ความเร่งด่วน', 'request', 'xo-field-urgency', 'กรุณาเลือกความเร่งด่วน');
    if (!location) push('คลินิกที่ขอตรวจ', 'request', 'xo-field-location', 'กรุณาเลือกคลินิกที่ขอตรวจ');
    if (!doctor.trim()) push('แพทย์ผู้ส่งตรวจ', 'request', 'xo-field-doctor', 'กรุณาระบุแพทย์ผู้ส่งตรวจ');
    if (selected.length === 0) push('รายการตรวจอย่างน้อย 1 รายการ', 'exams', sectionDomId('exams'), 'กรุณาเพิ่มรายการตรวจอย่างน้อย 1 รายการ');
    if (!clinicalSummary.trim()) push('อาการและผลการตรวจทางคลินิกโดยย่อ', 'screening', 'xo-field-clinicalSummary', 'กรุณาระบุอาการและผลการตรวจทางคลินิกโดยย่อ');
    if (allergyHas === true && !allergyAgent.trim()) push('สารที่แพ้ (ระบุเมื่อมีประวัติการแพ้)', 'screening', 'xo-field-allergyAgent', 'กรุณาระบุสารที่แพ้ — จำเป็นเมื่อมีประวัติการแพ้');
    if (needPregnancy && !pregStatus) push('สถานะประจำเดือน/การตั้งครรภ์ (จำเป็นสำหรับการตรวจที่กำหนด)', 'screening', 'xo-field-pregStatus', 'กรุณาเลือกสถานะประจำเดือน/การตั้งครรภ์');

    /* Per-exam registry demands, union'ed after the baseline. Each key
       maps onto the actual field it guards on this screen. */
    const CONFIG_FIELD_PLACE = {
      diagnosis:       { section: 'screening', target: 'xo-field-diagnosis' },
      allergyHistory:  { section: 'screening', target: 'xo-field-allergy' },
      femaleScreening: { section: 'screening', target: 'xo-field-pregStatus' },
      views:           { section: 'exams' }, /* target = the exam's own select, set per-row below */
      reason:          { section: 'request',  target: 'xo-field-reason' },
    };
    selectedExams.forEach((exam) => {
      (exam.requiredFields ?? []).forEach((key) => { /* pre-setup exams → [] */
        const satisfied = (() => {
          switch (key) {
            case 'briefSymptoms':   return Boolean(clinicalSummary.trim());
            case 'diagnosis':       return Boolean(diagnosis.trim());
            /* Answered EITHER way counts — "ไม่แพ้" (false) satisfies; the
               untouched tri-state (null) does not. "มี" also needs สารที่แพ้. */
            case 'allergyHistory':  return allergyHas !== null && (allergyHas === false || Boolean(allergyAgent.trim()));
            /* Only meaningful for a female patient — a male patient has no
               menstruation/pregnancy history to collect, so the demand is
               satisfied by definition. Female → the block must be answered. */
            case 'femaleScreening': return !patient || patient.sex !== 'หญิง' || Boolean(pregStatus);
            /* An explicit ท่าถ่าย choice on the exam's own row. The
               untouched select DISPLAYS 'ตามทะเบียน' but records nothing;
               any explicit pick (including 'all') counts. Exams with no
               views (US/CT) have nothing to choose. */
            case 'views':           return (exam.views ?? []).length === 0 || viewSel[exam.id] != null;
            case 'reason':          return Boolean(reason.trim());
            default:                return true;
          }
        })();
        if (satisfied) return;
        /* Fields the baseline list already blocks on are not repeated —
           briefSymptoms is always baseline-required, and an unmet
           femaleScreening implies needPregnancy already flagged it. */
        if (key === 'briefSymptoms') return;
        if (key === 'femaleScreening' && needPregnancy) return;
        const place = CONFIG_FIELD_PLACE[key] ?? { section: 'exams', target: sectionDomId('exams') };
        push(
          `${REQUIRED_FIELD_LABELS[key] ?? key} — จำเป็นสำหรับ ${exam.name} · ตั้งค่าโดยผู้ดูแลระบบ`,
          place.section,
          key === 'views' ? `xo-view-${exam.id}` : place.target,
          `${REQUIRED_FIELD_LABELS[key] ?? key} — จำเป็นสำหรับ ${exam.name} (ตั้งค่าโดยผู้ดูแลระบบ)`,
        );
      });
    });
    return out;
  }, [patient, requestType, sendAt, slot, slotBlockReason, urgency, location, doctor, selected, selectedExams, clinicalSummary, diagnosis, allergyHas, allergyAgent, needPregnancy, pregStatus, viewSel, reason]);

  /* Unchanged public shape: `missing` stays the summary-Alert string list. */
  const missing = useMemo(() => missingItems.map((m) => m.label), [missingItems]);

  /* First unmet requirement per focus target — feeds the inline errors
     once a save has been refused (showMissing). Live: the moment a field
     is satisfied its entry drops out and the error disappears. */
  const errorByTarget = useMemo(() => {
    const map = {};
    missingItems.forEach((m) => { if (!(m.target in map)) map[m.target] = m.short; });
    return map;
  }, [missingItems]);
  const fieldError = (target) => (showMissing ? errorByTarget[target] ?? null : null);

  /* Per-section unmet counts for the rail chips. */
  const missingBySection = useMemo(() => {
    const map = {};
    missingItems.forEach((m) => { map[m.section] = (map[m.section] ?? 0) + 1; });
    return map;
  }, [missingItems]);

  /* Scroll to + focus the actual offending control. Falls back to the
     first focusable inside a container target (e.g. the patient search). */
  const focusTarget = (targetId) => {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable = el.matches('input, select, textarea, button, [tabindex]')
      ? el
      : el.querySelector('input, select, textarea, button, [tabindex]');
    (focusable ?? el).focus({ preventScroll: true });
  };

  const handleSave = () => {
    if (missingItems.length > 0) {
      setShowMissing(true);
      /* Error prevention beats error recovery (Nielsen #9): land the user
         ON the first offending field, not just next to a summary list. */
      focusTarget(missingItems[0].target);
      return;
    }
    setShowMissing(false);
    /* Remember the repeat-entry fields for the next order this session —
       surfaced next time as ค่าที่ใช้ครั้งล่าสุด, never silently. */
    writeLastUsed({ location, doctor: doctor.trim() });
    /* No backend — the worklist reads the static XRAY_ORDERS mock, so this
       confirms the request rather than persisting it. The shape it would
       POST is one row per selected exam sharing NEXT_XN, exactly what
       xrayOrders.js CURATED_ORDERS model (ORD-X405 = the multi-row case). */
    /* §1.12.3 — hold the room slot. Everything else on this screen is a
       mock POST (there is no radiology backend), but the schedule IS real
       client state: the slot has to disappear from the calendar for the
       next person booking, so this one write actually persists. */
    if (requestType === 'appointment' && slot) {
      bookXraySlot({
        dateISO: slot.dateISO,
        time: slot.time,
        roomId: slot.roomId,
        examIds: selected,
        hn: patient?.hn,
        patientName: patient?.fullName,
        xn: NEXT_XN,
        note: reason || null,
      });
    }
    setSaved(true);
    /* ใบนัดตรวจรังสี pre-ticks itself for appointment orders — legacy §2.2
       opens it automatically after the นัดตรวจ flip. */
    setPrintSel({
      request: true,
      appointment: requestType === 'appointment',
      filmLabel: true,
      exposure: true,
    });
    setPrintOpen(true);
  };

  const urgencyMeta = XRAY_URGENCIES.find((u) => u.key === urgency) ?? null;

  /* Props for <XrayReportSheet> in the print modal. Built from the live form
     rather than from a saved row, so what the clerk sees on paper is exactly
     what they just typed — and the sheet's own totals come from the same
     `claimFor` / `summariseSelection` the on-screen table uses. */
  const sheetProps = useMemo(() => ({
    order: {
      xn: NEXT_XN,
      examLabel: selectedExams[0]?.name,
      orderingLocation: location,
      orderedBy: doctor,
      urgencyLabel: urgencyMeta?.thai,
      requestType,
      /* the slip is patient-facing — print the Thai stamp and the room,
         not the raw datetime-local value the form field holds */
      scheduledAt: slot
        ? `${slot.scheduledAt} น. · ${slot.room?.name ?? ''}`
        : (sendAt ? formatThaiDateTime(sendAt.slice(0, 10), sendAt.slice(11, 16)) : ''),
      orderedAt: requestedAt,
      rightLabel: XRAY_RIGHT_BY_KEY[rightKey]?.thai,
      allergy: { has: allergyHas === true, agent: allergyAgent, symptom: allergySymptom },
      pregnancy: { status: pregStatus, lmp },
      clinicalSummary,
      diagnosis,
      note,
    },
    patient: patient ? {
      hn: patient.hn,
      fullName: patient.fullName,
      age: patient.age,
      sex: patient.sex,
      rightLabel: XRAY_RIGHT_BY_KEY[rightKey]?.thai,
    } : null,
    items: selectedExams.map((exam) => {
      const money = claimFor(exam, rightKey);
      const viewKey = viewSel[exam.id];
      return {
        id: exam.id,
        name: exam.name,
        code: exam.code,
        regionLabel: getRegion(exam)?.thai,
        view: viewKey && viewKey !== 'all' ? (VIEW_BY_KEY[viewKey]?.code ?? viewKey) : null,
        price: money.price,
        claim: money.claim,
        patientPay: money.patientPay,
        prep: exam.prep,
      };
    }),
    totals: summary,
    center: 'ศูนย์บริการสาธารณสุข 4 ดินแดง',
    printedAt: requestedAt,
  }), [
    selectedExams, location, doctor, urgencyMeta, requestType, sendAt, slot, requestedAt,
    rightKey, allergyHas, allergyAgent, allergySymptom, pregStatus, lmp,
    clinicalSummary, diagnosis, note, patient, viewSel, summary,
  ]);

  return (
    <div className='min-h-screen flex' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <Sidebar activeKey='radiology' />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header breadcrumb={breadcrumb} />
        <div className='p-3 md:p-6 flex-1 flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
          <div>
            <button
              type='button'
              onClick={() => routerHistory.push('/xray/queue')}
              className='inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-brand-500'
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <Icon name='chevron-left' size={16} />
              กลับไปยัง Worklist
            </button>
          </div>

          {/* ═══ Sticky section rail — a compact wayfinder over the long
                 form: one chip per section, per-section ครบ/ยังไม่ครบ, and
                 anchor scrolling (Nielsen #1: the state of the whole form
                 is visible without scrolling it). ═══ */}
          <nav
            aria-label='ส่วนของแบบฟอร์ม'
            className='flex items-center flex-wrap w-full sticky'
            style={{
              top: 'var(--dim-size-1400, 64px)',
              zIndex: 'var(--sm-z-dropdown, 1196)',
              gap: 'var(--dim-space-150)',
              background: 'var(--surface-card-100)',
              border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
              borderRadius: 'var(--dim-radius-200)',
              boxShadow: 'var(--shadow-card)',
              paddingTop: 'var(--dim-space-150)',
              paddingRight: 'var(--dim-space-300)',
              paddingBottom: 'var(--dim-space-150)',
              paddingLeft: 'var(--dim-space-300)',
            }}
          >
            {FORM_SECTIONS.map((s) => {
              const unmet = missingBySection[s.key] ?? 0;
              const complete = unmet === 0;
              return (
                <button
                  key={s.key}
                  type='button'
                  onClick={() => {
                    const el = document.getElementById(sectionDomId(s.key));
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className='inline-flex items-center'
                  aria-label={`${s.label} — ${complete ? 'ครบ' : `ยังไม่ครบ ${unmet} รายการ`}`}
                  style={{
                    gap: 'var(--dim-space-100)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    paddingTop: 'var(--dim-space-100)',
                    paddingRight: 'var(--dim-space-200)',
                    paddingBottom: 'var(--dim-space-100)',
                    paddingLeft: 'var(--dim-space-200)',
                    borderRadius: 'var(--dim-radius-full)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs)',
                    color: complete ? 'var(--text-alert-success)' : 'var(--text-content-secondary)',
                  }}
                >
                  <span aria-hidden>
                    <Icon name={complete ? 'check_circle' : 'radio_button_unchecked'} size={14} />
                  </span>
                  {s.label}
                  {!complete && (
                    <span
                      style={{
                        color: 'var(--text-statusbadge-warning, #C2410C)',
                        fontWeight: 'var(--type-weight-medium)',
                      }}
                    >
                      {unmet}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* ═══ 1 · ผู้รับบริการ — §1.12.2 ค้นหาจาก HN / ชื่อ-สกุล /
                 เลขบัตรประชาชน, then the two-identifier confirmation strip
                 (มาตรฐานความปลอดภัยผู้ป่วย — same rationale as the lab). ═══ */}
          <SectionCard
            id={sectionDomId('patient')}
            icon='person_search'
            title='ผู้รับบริการ'
            subtitle='ค้นหาด้วยเลข HN ชื่อ-สกุล หรือเลขบัตรประชาชน แล้วเลือกจากรายการ'
          >
            <div
              id='xo-field-patient'
              className='w-full'
              aria-label='ค้นหาผู้รับบริการ'
              aria-describedby={fieldError('xo-field-patient') ? 'xo-field-patient-error' : undefined}
            >
              <PrimarySearch
                value={patientQuery}
              onChange={(v) => {
                setPatientQuery(v);
                /* Editing the query invalidates the previous selection —
                   the confirmation card must never show a patient the
                   search box no longer names. */
                if (patient && v !== `${patient.fullName} · HN ${patient.hn}`) setPatient(null);
              }}
              onSubmit={(v, item) => selectPatient(item?.id ?? item?.value ?? v)}
              suggestions={patientSuggestions}
              placeholder='ค้นหาเลข HN / เลขบัตรประชาชน / ชื่อ-นามสกุล'
              historyEmptyMessage={null}
              />
            </div>
            {patientQuery.trim().length >= 2 && !patient ? (
              <SearchResultCount found={patientMatchCount} total={PATIENT_PROFILES.length} />
            ) : null}
            {fieldError('xo-field-patient') && (
              <FieldError id='xo-field-patient-error'>{fieldError('xo-field-patient')}</FieldError>
            )}

            {patient ? (
              <div
                className='flex items-center flex-wrap w-full'
                style={{
                  gap: 'var(--dim-space-300)',
                  background: 'var(--surface-brandPrimary-quaternary)',
                  borderRadius: 'var(--dim-radius-200)',
                  paddingTop: 'var(--dim-space-300)',
                  paddingRight: 'var(--dim-space-400)',
                  paddingBottom: 'var(--dim-space-300)',
                  paddingLeft: 'var(--dim-space-400)',
                }}
              >
                <span className='text-sm font-bold text-ink'>{patient.fullName}</span>
                <span className='text-sm text-ink-secondary'>HN {patient.hn}</span>
                <span className='text-sm text-ink-secondary'>{patient.age} / {patient.sex}</span>
                {/* สิทธิ drives claimFor() on every money figure below —
                    showing the resolved right here makes the ราคา/เบิกได้
                    columns explainable at a glance (§1.12.4.2). */}
                <Badge style='info' size='small'>{right?.short ?? rightKey}</Badge>
                <span className='text-xs text-ink-tertiary'>{patient.insurance}</span>
              </div>
            ) : (
              <span className='text-xs text-ink-tertiary'>
                ยังไม่ได้เลือกผู้รับบริการ — พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา
              </span>
            )}
          </SectionCard>

          {/* ═══ 2 · ข้อมูลการขอตรวจ — §1.12.5.2 header fields + §1.12.3
                 appointment branch + ความเร่งด่วน. ═══ */}
          <SectionCard
            id={sectionDomId('request')}
            icon='assignment'
            title='ข้อมูลการขอตรวจ'
            subtitle='วันเวลาที่ขอบันทึกกำหนดโดยระบบ · การตั้งวันเวลาส่ง/นัดเป็นอนาคตจะเปลี่ยนลักษณะการขอตรวจเป็นนัดตรวจโดยอัตโนมัติ'
          >
            {/* XN + status preview strip — §1.12.5.2: เลข XN (automatic
                generate), สถานะการตรวจ, วันเวลาที่บันทึกขอ. */}
            <div
              className='flex items-center flex-wrap w-full'
              style={{
                gap: 'var(--dim-space-300)',
                background: 'var(--surface-card-200)',
                border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                borderRadius: 'var(--dim-radius-200)',
                paddingTop: 'var(--dim-space-300)',
                paddingRight: 'var(--dim-space-400)',
                paddingBottom: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-400)',
              }}
            >
              <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
                <Icon name='barcode' size={16} style={{ color: 'var(--text-content-secondary)' }} />
                <span className='text-sm font-bold text-ink'>เลข XN {NEXT_XN}</span>
              </span>
              <Badge style='neutral' size='small'>สถานะ: รอรับรายการ (Request)</Badge>
              <span className='text-xs text-ink-tertiary'>ออกเลขอัตโนมัติเมื่อบันทึก · 1 XN ต่อ 1 คำขอ</span>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-3 w-full'>
              {/* Legacy §2.1 item 1 — system-defaulted, "ไม่สามารถแก้ไขได้". */}
              <TextField id='xo-field-requestedAt' label='วันเวลาที่ขอบันทึก (ไม่สามารถแก้ไขได้)' value={requestedAt} readOnly />
              <TextField
                id='xo-field-sendAt'
                label='วันเวลาส่ง/นัด'
                type='datetime-local'
                value={sendAt}
                onChange={handleSendAt}
                required={requestType === 'appointment'}
                error={fieldError('xo-field-sendAt')}
              />
              <SelectField
                id='xo-field-location'
                label='คลินิกที่ขอตรวจ'
                required
                value={location}
                onChange={handleLocation}
                placeholder='— เลือกคลินิก —'
                options={XRAY_LOCATIONS.map((l) => ({ value: l, label: l }))}
                error={fieldError('xo-field-location')}
                hint={locationPrefilled && location ? <PrefillHint /> : null}
              />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 w-full'>
              {/* ลักษณะการขอตรวจ — legacy §2.1 item 2; the date auto-flip
                  above can set this, but the user can still override. */}
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                <FieldLabel required>ลักษณะการขอตรวจ</FieldLabel>
                <RadioCardGroup
                  id='xo-field-requestType'
                  groupLabel='ลักษณะการขอตรวจ'
                  required
                  value={requestType || null}
                  onChange={setRequestType}
                  error={fieldError('xo-field-requestType')}
                  options={XRAY_REQUEST_TYPES.map((t) => ({
                    key: t.key,
                    label: t.thai,
                    icon: t.key === 'appointment' ? 'event' : 'send',
                  }))}
                />
              </div>
              <TextField
                id='xo-field-doctor'
                label='แพทย์ผู้ส่งตรวจ'
                required
                value={doctor}
                onChange={handleDoctor}
                placeholder='เช่น นพ.สมชาย ใจดี'
                error={fieldError('xo-field-doctor')}
                hint={doctorPrefilled && doctor ? <PrefillHint /> : null}
              />
            </div>

            {/* เหตุผลการส่งตรวจ — §1.12.5.5's `reason` key. Optional by
                default; flips to required the moment a selected exam's
                registry config demands it (ตั้งค่าโดยผู้ดูแลระบบ). */}
            <TextField
              id='xo-field-reason'
              label={configRequires('reason') ? 'เหตุผลการส่งตรวจ (จำเป็นตามทะเบียนรายการตรวจ)' : 'เหตุผลการส่งตรวจ (ไม่บังคับ)'}
              required={configRequires('reason')}
              value={reason}
              onChange={setReason}
              placeholder='เช่น ติดตามผลการรักษา / ประเมินก่อนทำหัตถการ / คัดกรองตามเกณฑ์'
              error={fieldError('xo-field-reason')}
            />

            {/* Appointment affordances — TOR §1.12.3: what the นัดตรวจ
                branch promises (slot on the appointment day + printed
                ใบนัดตรวจรังสี carrying the prep instructions). */}
            {requestType === 'appointment' && (
              <div id='xo-slot-picker' className='flex flex-col w-full' style={{ gap: 'var(--dim-space-250)' }}>
                <XraySlotPicker
                  examIds={selected}
                  patient={patient}
                  value={slot}
                  onChange={handleSlot}
                />
                <Alert
                  type={slot ? 'success' : fieldError('xo-slot-picker') ? 'error' : 'info'}
                  iconName='print'
                  title={slot
                    ? `นัดตรวจ ${slot.scheduledAt} น. · ${slot.room?.name ?? ''}`
                    : fieldError('xo-slot-picker') ?? 'ยังไม่ได้เลือกช่วงเวลานัด'}
                  subtext={slot
                    ? 'ระบบจะพิมพ์ใบนัดตรวจรังสีพร้อมคำแนะนำการเตรียมตัวให้หลังบันทึก'
                    : `เลือกช่วงเวลาจากปฏิทินด้านบน · เวลาห้องตรวจโดยประมาณ ${selectedExams.reduce((s, e) => s + (e.durationMin ?? 0), 0)} นาที (${selected.length} รายการ)`}
                  showBadge={false}
                  showIndicator={false}
                  showDetail={false}
                />
              </div>
            )}

            {/* ความเร่งด่วน — §1.12.5.4 first column; STAT is red and jumps
                the worklist (rank 0, SLA 30 นาที). */}
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
              <FieldLabel required>ความเร่งด่วน</FieldLabel>
              <RadioCardGroup
                id='xo-field-urgency'
                groupLabel='ความเร่งด่วน'
                required
                gridClass='grid grid-cols-1 md:grid-cols-3 gap-3 w-full'
                value={urgency || null}
                onChange={setUrgency}
                error={fieldError('xo-field-urgency')}
                options={XRAY_URGENCIES.map((u) => ({
                  key: u.key,
                  label: u.thai,
                  sublabel: `เป้าหมายดำเนินการภายใน ${u.slaMinutes >= 60 ? `${u.slaMinutes / 60} ชม.` : `${u.slaMinutes} นาที`}`,
                  icon: u.key === 'stat' ? 'bolt' : u.key === 'urgent' ? 'schedule' : 'check_circle',
                  tone: u.key === 'stat' ? 'var(--text-statusbadge-error, #B91C1C)' : undefined,
                }))}
              />
            </div>
          </SectionCard>

          {/* ═══ 3 · ข้อมูลผู้รับบริการ (ก่อนเข้ารับรังสี) — §1.12.5.3
                 verbatim: ประวัติการแพ้ + สารที่แพ้ + อาการ · ประวัติ
                 ประจำเดือน/การตั้งครรภ์ · อาการโดยย่อ · การวินิจฉัย. ═══ */}
          <SectionCard
            id={sectionDomId('screening')}
            icon='health_and_safety'
            title='ข้อมูลผู้รับบริการ (ก่อนเข้ารับรังสี)'
            subtitle='ประวัติการแพ้และการตั้งครรภ์คือด่านความปลอดภัยก่อนฉายรังสี — ระบบจะเตือนเมื่อขัดกับรายการตรวจที่เลือก'
          >
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              {/* มี/ไม่มี as an explicit pair (not a lone checkbox) so the
                  §1.12.5.5 `allergyHistory` demand can distinguish
                  "ไม่แพ้" (answered) from "ยังไม่ได้ถาม" (null). */}
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                <FieldLabel required={configRequires('allergyHistory')}>
                  ประวัติการแพ้ (ยา / อาหาร / สารทึบรังสี)
                </FieldLabel>
                <RadioCardGroup
                  id='xo-field-allergy'
                  groupLabel='ประวัติการแพ้ (ยา / อาหาร / สารทึบรังสี)'
                  required={configRequires('allergyHistory')}
                  gridClass='grid grid-cols-1 md:grid-cols-2 gap-3'
                  value={allergyHas === true ? 'yes' : allergyHas === false ? 'no' : null}
                  onChange={(k) => setAllergyHas(k === 'yes')}
                  error={fieldError('xo-field-allergy')}
                  options={[
                    {
                      key: 'yes',
                      label: 'มีประวัติการแพ้',
                      icon: 'report',
                      tone: allergyHas === true ? 'var(--text-statusbadge-warning, #C2410C)' : undefined,
                    },
                    { key: 'no', label: 'ไม่มีประวัติการแพ้ (ไม่แพ้)', icon: 'check_circle' },
                  ]}
                />
              </div>
              {allergyHas === true && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3 w-full'>
                  <TextField
                    id='xo-field-allergyAgent'
                    label='สารที่แพ้'
                    required
                    value={allergyAgent}
                    onChange={setAllergyAgent}
                    placeholder='เช่น สารทึบรังสีชนิดไอโอดีน, Penicillin'
                    error={fieldError('xo-field-allergyAgent')}
                  />
                  <TextField
                    id='xo-field-allergySymptom'
                    label='อาการที่เกิด'
                    value={allergySymptom}
                    onChange={setAllergySymptom}
                    placeholder='เช่น ผื่นลมพิษ แน่นหน้าอก'
                  />
                </div>
              )}

              {/* แจ้งเตือนแพ้สารทึบรังสี — the safety gate: allergy history
                  × a contrast exam. Destructive tone on purpose; the exams
                  are named so the orderer knows exactly which row tripped
                  the alarm (see ORD-X413 in the mock for the real case). */}
              {contrastAllergyDanger && (
                <Alert
                  type='destructive'
                  iconName='warning'
                  iconFill={1}
                  title='แจ้งเตือนแพ้สารทึบรังสี — ผู้ป่วยมีประวัติการแพ้ และรายการที่เลือกใช้สารทึบรังสี'
                  subtext={`รายการที่ใช้สารทึบรังสี: ${contrastExams.map((e) => e.name).join(' · ')} · สารที่แพ้: ${allergyAgent || 'ยังไม่ระบุ'}${allergySymptom ? ` (${allergySymptom})` : ''} — ปรึกษารังสีแพทย์ก่อนส่งตรวจ และพิจารณา premedication หรือเปลี่ยนวิธีตรวจ`}
                  showBadge={false}
                  showIndicator={false}
                  showDetail={false}
                />
              )}

              {/* ประจำเดือน / การตั้งครรภ์ — asked only when it matters:
                  female patient + a selected exam flagged femaleScreening
                  (abdomen/pelvis radiography, mammography — §1.12.5.3). */}
              {needPregnancy && (
                <div
                  className='flex flex-col w-full'
                  style={{
                    gap: 'var(--dim-space-300)',
                    background: 'var(--surface-card-200)',
                    border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                    borderRadius: 'var(--dim-radius-200)',
                    paddingTop: 'var(--dim-space-300)',
                    paddingRight: 'var(--dim-space-400)',
                    paddingBottom: 'var(--dim-space-300)',
                    paddingLeft: 'var(--dim-space-400)',
                  }}
                >
                  <span className='text-sm font-bold text-ink'>
                    ประวัติประจำเดือน / การตั้งครรภ์
                    <span className='text-xs text-ink-tertiary' style={{ fontWeight: 'var(--type-weight-regular)' }}>
                      {' '}· จำเป็นเพราะรายการที่เลือกฉายรังสีบริเวณช่องท้อง/เชิงกราน หรือเป็นแมมโมแกรม
                    </span>
                  </span>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-3 w-full'>
                    <TextField
                      id='xo-field-lmp'
                      label='ประจำเดือนครั้งสุดท้าย (LMP)'
                      type='date'
                      value={lmp}
                      onChange={setLmp}
                    />
                    <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                      <FieldLabel required>สถานะ</FieldLabel>
                      <RadioCardGroup
                        id='xo-field-pregStatus'
                        groupLabel='สถานะประจำเดือน/การตั้งครรภ์'
                        required
                        gridClass='grid grid-cols-2 gap-2'
                        value={pregStatus || null}
                        onChange={setPregStatus}
                        error={fieldError('xo-field-pregStatus')}
                        options={PREGNANCY_STATUSES.map((s) => ({
                          key: s,
                          label: s,
                          icon: s === 'ตั้งครรภ์' ? 'pregnant_woman' : 'female',
                          tone: s === 'ตั้งครรภ์' ? 'var(--text-statusbadge-warning, #C2410C)' : undefined,
                        }))}
                      />
                    </div>
                  </div>
                  {/* ตั้งครรภ์ + ionizing exam — the ANC mock (ORD-X404)
                      documents the rule: US is allowed, abdominal/pelvic
                      radiography is not without a radiologist consult. */}
                  {pregnantIrradiation && (
                    <Alert
                      type='destructive'
                      iconName='warning'
                      iconFill={1}
                      title='ผู้ป่วยตั้งครรภ์ — รายการที่เลือกมีการฉายรังสีบริเวณช่องท้อง/เชิงกราน'
                      subtext='ห้ามฉายรังสีช่องท้อง/เชิงกรานในหญิงตั้งครรภ์โดยไม่ปรึกษารังสีแพทย์ — พิจารณาอัลตราซาวด์แทน หรือเลื่อนการตรวจ'
                      showBadge={false}
                      showIndicator={false}
                      showDetail={false}
                    />
                  )}
                </div>
              )}

              {/* Legacy §2.1 item 3 — อาการโดยย่อ (required: the radiologist
                  reads the film AGAINST the clinical question; a blank
                  indication is the #1 reason for ปฏิเสธรับ Request) +
                  การวินิจฉัย. */}
              <TextAreaField
                id='xo-field-clinicalSummary'
                label='อาการและผลการตรวจทางคลินิกโดยย่อ'
                required
                value={clinicalSummary}
                onChange={setClinicalSummary}
                placeholder='เช่น ไอเรื้อรัง 3 สัปดาห์ มีไข้ต่ำ ๆ ตอนเย็น น้ำหนักลด — ระบุคำถามทางคลินิกที่ต้องการคำตอบจากภาพ'
                error={fieldError('xo-field-clinicalSummary')}
              />
              {/* required flips on when a selected exam's registry config
                  demands `diagnosis` (§1.12.5.5). */}
              <TextAreaField
                id='xo-field-diagnosis'
                label='การวินิจฉัย'
                required={configRequires('diagnosis')}
                value={diagnosis}
                onChange={setDiagnosis}
                rows={2}
                placeholder='เช่น R/O pulmonary tuberculosis'
                error={fieldError('xo-field-diagnosis')}
              />
            </div>
          </SectionCard>

          {/* ═══ 4 · รายการตรวจทางรังสีวิทยา — §1.12.5.4 table + §1.12.5.7
                 ประวัติเดิม + §1.12.5.9 duplicate gate. ═══ */}
          <SectionCard
            id={sectionDomId('exams')}
            icon='radiology'
            title='รายการตรวจทางรังสีวิทยา'
            subtitle='เพิ่มจากรายการเดี่ยว ชุดรายการตรวจ หรือสั่งตามประวัติเดิม · ราคาและยอดเบิกคิดตามสิทธิของผู้รับบริการ'
            action={
              <BrandButton size='md' leadingIcon='add' onClick={() => setPickerOpen(true)} disabled={!patient}>
                เพิ่มรายการตรวจ
              </BrandButton>
            }
          >
            {!patient && (
              <span className='text-xs text-ink-tertiary'>เลือกผู้รับบริการก่อน เพื่อให้ระบบคิดยอดเบิกตามสิทธิและตรวจการสั่งซ้ำจากประวัติ</span>
            )}

            {selected.length > 0 && (
              /* The §1.12.5.4 table verbatim: ความเร่งด่วน · รายการตรวจ ·
                 ตำแหน่งที่ตรวจ · (ท่าถ่าย) · ราคา · ยอดที่เบิกได้ · ลบได้ —
                 wide content scrolls inside its own container. */
              <div className='w-full' style={{ overflowX: 'auto' }}>
                <table className='w-full' style={{ borderCollapse: 'collapse', minWidth: '760px' }}>
                  <thead>
                    <tr>
                      {['ความเร่งด่วน', 'รายการตรวจ', 'ตำแหน่งที่ตรวจ', 'ท่าถ่าย', 'ราคา (บาท)', 'เบิกได้ (บาท)', 'ผู้ป่วยจ่าย (บาท)', ''].map((h) => (
                        <th
                          key={h || 'del'}
                          className='text-left'
                          style={{
                            paddingTop: 'var(--dim-space-200)',
                            paddingRight: 'var(--dim-space-300)',
                            paddingBottom: 'var(--dim-space-200)',
                            paddingLeft: 'var(--dim-space-300)',
                            borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                            fontFamily: 'var(--type-family-body)',
                            fontSize: 'var(--type-size-xs)',
                            fontWeight: 'var(--type-weight-medium)',
                            color: 'var(--text-content-tertiary)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedExams.map((exam) => {
                      const { price, claim, patientPay } = claimFor(exam, rightKey);
                      const region = getRegion(exam);
                      const cell = {
                        paddingTop: 'var(--dim-space-200)',
                        paddingRight: 'var(--dim-space-300)',
                        paddingBottom: 'var(--dim-space-200)',
                        paddingLeft: 'var(--dim-space-300)',
                        borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-sm)',
                        color: 'var(--text-content-default)',
                        verticalAlign: 'top',
                      };
                      return (
                        <tr key={exam.id}>
                          <td style={cell}>
                            {urgencyMeta
                              ? <Badge style={urgencyMeta.color} size='small'>{urgencyMeta.thai}</Badge>
                              : <span className='text-xs text-ink-tertiary'>—</span>}
                          </td>
                          <td style={cell}>
                            <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
                              <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                                {exam.name}
                                {exam.referralOnly && <Badge style='info' size='small'>ส่งตรวจภายนอก</Badge>}
                                {exam.contrast && <Badge style='warning' size='small'>สารทึบรังสี</Badge>}
                              </span>
                              <span className='text-xs text-ink-tertiary'>{exam.code} · {exam.nameEn}</span>
                            </div>
                          </td>
                          <td style={cell}>{region?.thai ?? '—'}</td>
                          <td style={cell}>
                            {(exam.views ?? []).length === 0 ? (
                              <span className='text-xs text-ink-tertiary'>—</span>
                            ) : (
                              /* ท่าถ่ายเลือกได้จาก views ของรายการนั้น —
                                 default = ทุกท่าตามที่ทะเบียนกำหนด (the
                                 ใบฉายรังสี prints one line per exposure).
                                 When the registry demands `views`
                                 (§1.12.5.5) an explicit pick is required —
                                 the * marks the untouched select. */
                              <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
                                <select
                                  id={`xo-view-${exam.id}`}
                                  className='mih-xrayorder-field'
                                  value={viewSel[exam.id] ?? 'all'}
                                  onChange={(e) => setViewSel((prev) => ({ ...prev, [exam.id]: e.target.value }))}
                                  aria-label={`ท่าถ่ายของ ${exam.name}`}
                                  aria-required={(exam.requiredFields ?? []).includes('views') || undefined}
                                  aria-invalid={fieldError(`xo-view-${exam.id}`) ? true : undefined}
                                  style={{ ...fieldStyle, width: 'auto', fontSize: 'var(--type-size-xs)' }}
                                >
                                  <option value='all'>ตามทะเบียน ({allViewsCode(exam)})</option>
                                  {exam.views.map((k) => (
                                    <option key={k} value={k}>
                                      {VIEW_BY_KEY[k]?.thai ?? k}
                                    </option>
                                  ))}
                                </select>
                                {(exam.requiredFields ?? []).includes('views') && viewSel[exam.id] == null && (
                                  <span
                                    title={`ท่าถ่าย — จำเป็นสำหรับ ${exam.name} (ตั้งค่าโดยผู้ดูแลระบบ)`}
                                    aria-label={`ท่าถ่าย — จำเป็นสำหรับ ${exam.name} (ตั้งค่าโดยผู้ดูแลระบบ)`}
                                    style={{ color: 'var(--text-input-require)', fontWeight: 'var(--type-weight-bold)' }}
                                  >
                                    *
                                  </span>
                                )}
                              </span>
                            )}
                          </td>
                          <td style={{ ...cell, whiteSpace: 'nowrap' }}>{baht(price)}</td>
                          <td style={{ ...cell, whiteSpace: 'nowrap' }}>{baht(claim)}</td>
                          <td style={{ ...cell, whiteSpace: 'nowrap', color: patientPay > 0 ? 'var(--text-statusbadge-warning, #C2410C)' : 'var(--text-content-default)' }}>
                            {baht(patientPay)}
                          </td>
                          <td style={cell}>
                            <DangerSubdueIconButton
                              icon='delete'
                              variant='ghost'
                              size='sm'
                              aria-label={`ลบ ${exam.name}`}
                              onClick={() => removeExam(exam.id)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      {/* §1.12.5.4 "ข้อมูลยอดรวมทั้งหมด" — the legacy screen's
                          "รวมเงินทั้งหมด" line, split per-right. */}
                      <td
                        colSpan={4}
                        style={{
                          paddingTop: 'var(--dim-space-300)',
                          paddingRight: 'var(--dim-space-300)',
                          paddingBottom: 'var(--dim-space-300)',
                          paddingLeft: 'var(--dim-space-300)',
                          fontFamily: 'var(--type-family-body)',
                          fontSize: 'var(--type-size-sm)',
                          fontWeight: 'var(--type-weight-bold)',
                          color: 'var(--text-content-default)',
                          textAlign: 'right',
                        }}
                      >
                        รวมเงินทั้งหมด ({summary.count} รายการ)
                      </td>
                      {[summary.total, summary.claimTotal, summary.patientPay].map((v, i) => (
                        <td
                          key={i}
                          style={{
                            paddingTop: 'var(--dim-space-300)',
                            paddingRight: 'var(--dim-space-300)',
                            paddingBottom: 'var(--dim-space-300)',
                            paddingLeft: 'var(--dim-space-300)',
                            fontFamily: 'var(--type-family-body)',
                            fontSize: 'var(--type-size-sm)',
                            fontWeight: 'var(--type-weight-bold)',
                            whiteSpace: 'nowrap',
                            color: i === 2 && summary.patientPay > 0
                              ? 'var(--text-statusbadge-warning, #C2410C)'
                              : 'var(--text-content-default)',
                          }}
                        >
                          {baht(v)}
                        </td>
                      ))}
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* §1.12.5.5 pre-save surfacing — which selected exams carry
                admin-configured extra requirements, listed the moment the
                exam is added so the demand never ambushes at save time.
                Source of truth: exam.requiredFields from the setup screen. */}
            {configDemandLines.length > 0 && (
              <Alert
                type='info'
                iconName='rule'
                title='ข้อมูลที่จำเป็นเพิ่มเติมตามทะเบียนรายการตรวจ — ตั้งค่าโดยผู้ดูแลระบบ'
                indicators={configDemandLines}
                showBadge={false}
                showDetail={false}
              />
            )}

            {/* Roll-up of warn-level repeats among the chosen rows —
                ordering anyway is allowed for 'warn' (§1.12.5.9 requires
                the warning; only 'block' refuses), so this informs. */}
            {selectedWarns.length > 0 && (
              <Alert
                type='warning'
                iconName='content_copy'
                title={`มี ${selectedWarns.length} รายการที่เพิ่งตรวจไปไม่นาน`}
                subtext={selectedWarns
                  .map(({ id, warning }) => `${XRAY_EXAM_BY_ID[id]?.name ?? id} (${warning.daysAgo} วันก่อน · เกณฑ์ ${warning.windowDays} วัน)`)
                  .join(' · ')}
                showBadge={false}
                showIndicator={false}
                showDetail={false}
              />
            )}

            {/* §1.12.5.7 — ประวัติการส่งตรวจเดิม + สั่งตามประวัติเดิม. Each
                repeat runs the same duplicate gate as every other add. */}
            {patient && patientHistory.length > 0 && (
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                <div
                  className='flex items-center'
                  style={{
                    gap: 'var(--dim-space-200)',
                    paddingBottom: 'var(--dim-space-150)',
                    borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                  }}
                >
                  <Icon name='history' size={16} style={{ color: 'var(--text-content-secondary)' }} />
                  <span className='text-sm font-bold text-ink'>ประวัติการส่งตรวจเดิม</span>
                  <span className='text-xs text-ink-tertiary'>เลือก "สั่งซ้ำ" เพื่อสั่งตามประวัติ — ระบบจะตรวจเกณฑ์การสั่งซ้ำให้ก่อนเสมอ</span>
                </div>
                {patientHistory.map((h) => {
                  const exam = XRAY_EXAM_BY_ID[h.examId];
                  if (!exam) return null;
                  const already = selected.includes(h.examId);
                  return (
                    <div
                      key={`${h.examId}-${h.daysAgo}`}
                      className='flex items-center flex-wrap w-full'
                      style={{
                        gap: 'var(--dim-space-300)',
                        background: 'var(--surface-card-200)',
                        border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                        borderRadius: 'var(--dim-radius-200)',
                        paddingTop: 'var(--dim-space-200)',
                        paddingRight: 'var(--dim-space-300)',
                        paddingBottom: 'var(--dim-space-200)',
                        paddingLeft: 'var(--dim-space-300)',
                      }}
                    >
                      <span className='text-sm text-ink'>{exam.name}</span>
                      <Badge style='neutral' size='small'>{h.daysAgo} วันก่อน</Badge>
                      {h.resultSummary && (
                        <span className='flex-1 min-w-0 text-xs text-ink-tertiary truncate'>ผลเดิม: {h.resultSummary}</span>
                      )}
                      <BrandSubdueButton
                        variant='outline'
                        size='sm'
                        leadingIcon={already ? 'check' : 'replay'}
                        disabled={already}
                        onClick={() => tryAdd(h.examId)}
                      >
                        {already ? 'อยู่ในรายการแล้ว' : 'สั่งซ้ำ'}
                      </BrandSubdueButton>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* ═══ 5 · รายการฟิล์ม — legacy §2.1 item 8: ขนาดฟิล์ม + จำนวน
                 ต่อคำขอ และผู้ถ่าย (กำหนดผู้ให้บริการใน MyHOSPITAL). ═══ */}
          <SectionCard
            id={sectionDomId('film')}
            icon='image'
            title='รายการฟิล์ม'
            subtitle='ขนาดและจำนวนฟิล์มที่ใช้ พร้อมผู้ถ่าย — เติมอัตโนมัติจากทะเบียนรายการตรวจได้'
            action={
              <NeutralSubdueButton
                variant='outline'
                size='sm'
                leadingIcon='auto_fix_high'
                disabled={selected.length === 0}
                onClick={autoFillFilm}
              >
                เติมตามรายการตรวจ
              </NeutralSubdueButton>
            }
          >
            <div className='flex items-end flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <div style={{ minWidth: 'var(--dim-size-2100, 160px)' }}>
                <SelectField
                  id='xo-field-filmSize'
                  label='ขนาดฟิล์ม'
                  value={filmSizeKey}
                  onChange={setFilmSizeKey}
                  options={XRAY_FILM_SIZES.map((f) => ({ value: f.key, label: f.thai }))}
                />
              </div>
              <div style={{ width: 'var(--dim-size-1700, 80px)' }}>
                <TextField id='xo-field-filmQty' label='จำนวน' type='number' value={filmQty} onChange={setFilmQty} />
              </div>
              <BrandSubdueButton variant='outline' size='md' leadingIcon='add' onClick={addFilmRow} aria-label='เพิ่มรายการฟิล์ม'>
                เพิ่ม
              </BrandSubdueButton>
              <div className='flex-1' style={{ minWidth: 'var(--dim-size-2450, 280px)' }}>
                <SelectField
                  id='xo-field-radiographer'
                  label='ผู้ถ่าย'
                  value={radiographerId}
                  onChange={setRadiographerId}
                  placeholder='— เลือกผู้ถ่าย —'
                  options={XRAY_RADIOGRAPHERS.map((r) => ({ value: r.id, label: r.name }))}
                />
              </div>
            </div>

            {filmRows.length > 0 ? (
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)' }}>
                {filmRows.map((r) => (
                  <div
                    key={r.sizeKey}
                    className='flex items-center w-full'
                    style={{
                      gap: 'var(--dim-space-300)',
                      background: 'var(--surface-card-200)',
                      border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                      borderRadius: 'var(--dim-radius-200)',
                      paddingTop: 'var(--dim-space-200)',
                      paddingRight: 'var(--dim-space-300)',
                      paddingBottom: 'var(--dim-space-200)',
                      paddingLeft: 'var(--dim-space-300)',
                    }}
                  >
                    <Icon name='image' size={16} style={{ color: 'var(--text-content-secondary)' }} />
                    <span className='flex-1 min-w-0 text-sm text-ink'>{FILM_BY_KEY[r.sizeKey]?.thai ?? r.sizeKey}</span>
                    <span className='text-sm text-ink-secondary'>× {r.qty}</span>
                    <DangerSubdueIconButton
                      icon='delete'
                      variant='ghost'
                      size='sm'
                      aria-label={`ลบ ${FILM_BY_KEY[r.sizeKey]?.thai ?? r.sizeKey}`}
                      onClick={() => setFilmRows((prev) => prev.filter((x) => x.sizeKey !== r.sizeKey))}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <span className='text-xs text-ink-tertiary'>ยังไม่มีรายการฟิล์ม — รายการตรวจดิจิทัล (US/CT/MRI) ไม่ใช้ฟิล์ม</span>
            )}
          </SectionCard>

          {/* ═══ 6 · บันทึกเพิ่มเติม (Note) — §1.12.5.8. ═══ */}
          <SectionCard id={sectionDomId('note')} icon='edit_note' title='บันทึกเพิ่มเติม (Note)' subtitle='ไม่บังคับ — เช่น ผู้ป่วยเคลื่อนไหวลำบาก ต้องถ่ายที่เตียง หรือข้อควรระวังอื่น'>
            <textarea
              id='xo-field-note'
              className='mih-xrayorder-field'
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              aria-label='บันทึกเพิ่มเติม (Note)'
              placeholder='เช่น ผู้ป่วยใช้รถเข็น ต้องการเจ้าหน้าที่ช่วยพยุงขณะจัดท่า'
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
          </SectionCard>

          {/* ═══ 7 · Sticky save bar + §1.12.5.5 missing-field summary. ═══ */}
          <section
            className='bg-surface-card rounded-card shadow-card flex flex-col w-full sticky bottom-0'
            style={{
              gap: 'var(--dim-space-300)',
              paddingTop: 'var(--dim-space-500)',
              paddingRight: 'var(--dim-space-500)',
              paddingBottom: 'var(--dim-space-500)',
              paddingLeft: 'var(--dim-space-500)',
            }}
          >
            {/* The inline blocker: save is refused until every required
                field is present, and the reasons are listed here rather
                than scattered as red borders the user must hunt for. */}
            {showMissing && missing.length > 0 && (
              <Alert
                type='destructive'
                iconName='error'
                title={`ยังบันทึกไม่ได้ — ข้อมูลที่จำเป็นยังไม่ครบ ${missing.length} รายการ`}
                indicators={missing}
                showBadge={false}
                showDetail={false}
              />
            )}
            <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <span className='text-sm text-ink-secondary'>
                {selected.length === 0
                  ? 'เลือกรายการตรวจอย่างน้อย 1 รายการเพื่อบันทึกส่งตรวจ'
                  : `${summary.count} รายการ · รวม ${baht(summary.total)} บาท · เบิกได้ ${baht(summary.claimTotal)} บาท · ผู้ป่วยจ่าย ${baht(summary.patientPay)} บาท`}
              </span>
              {urgency === 'stat' && <Badge style='error' size='small'>STAT</Badge>}
              {requestType === 'appointment' && <Badge style='yellow' size='small'>นัดตรวจ</Badge>}
              {contrastAllergyDanger && <Badge style='error' size='small' icon='warning'>แพ้สารทึบรังสี</Badge>}
              <div className='flex-1' />
              {/* Live readiness counter (Nielsen #1): what the save gate
                  will say, said BEFORE the button is pressed. Clicking it
                  jumps to the first unmet field; aria-live keeps SR users
                  in the loop as the count falls. */}
              <span aria-live='polite'>
                {missingItems.length > 0 ? (
                  <button
                    type='button'
                    onClick={() => focusTarget(missingItems[0].target)}
                    className='inline-flex items-center'
                    style={{
                      gap: 'var(--dim-space-100)',
                      background: 'var(--surface-alert-warning)',
                      border: 'var(--dim-stroke-100) solid var(--border-alert-warning)',
                      borderRadius: 'var(--dim-radius-full)',
                      cursor: 'pointer',
                      paddingTop: 'var(--dim-space-100)',
                      paddingRight: 'var(--dim-space-300)',
                      paddingBottom: 'var(--dim-space-100)',
                      paddingLeft: 'var(--dim-space-200)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-xs)',
                      fontWeight: 'var(--type-weight-medium)',
                      color: 'var(--text-alert-warning)',
                    }}
                  >
                    <span aria-hidden><Icon name='edit_note' size={14} /></span>
                    ยังต้องกรอก {missingItems.length} รายการ — ไปยังรายการแรก
                  </button>
                ) : (
                  <span
                    className='inline-flex items-center'
                    style={{
                      gap: 'var(--dim-space-100)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-xs)',
                      fontWeight: 'var(--type-weight-medium)',
                      color: 'var(--text-alert-success)',
                    }}
                  >
                    <span aria-hidden><Icon name='check_circle' size={14} /></span>
                    ครบถ้วน พร้อมบันทึก
                  </span>
                )}
              </span>
              <NeutralSubdueButton variant='outline' size='md' onClick={() => routerHistory.push('/xray/queue')}>
                ยกเลิก
              </NeutralSubdueButton>
              <BrandButton size='md' leadingIcon='send' onClick={handleSave}>
                บันทึกส่งตรวจ
              </BrandButton>
            </div>
          </section>
        </div>
      </main>

      {/* The reusable picker — popup variant; the CPOE screen mounts the
          same component with variant='embedded'. */}
      <XrayOrderPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        value={selected}
        onChange={setSelected}
        patient={patient}
        rightKey={rightKey}
        history={patientHistory}
        variant='popup'
      />

      {/* §1.12.5.9 'block' explanation for สั่งตามประวัติเดิม — the refusal
          names the exam, the days, and the window, because a silent no
          would just push users to work around the gate. */}
      <AlertDialog
        open={Boolean(blockDialog)}
        type='destructive'
        title='ไม่สามารถสั่งซ้ำได้'
        description={blockDialog
          ? `${blockDialog.warning.message} — ${XRAY_EXAM_BY_ID[blockDialog.examId]?.name ?? ''} ตรวจล่าสุด ${blockDialog.warning.daysAgo} วันก่อน (เกณฑ์ ${blockDialog.warning.windowDays} วัน)${blockDialog.warning.resultSummary ? ` · ผลเดิม: ${blockDialog.warning.resultSummary}` : ''} หากจำเป็นทางคลินิก ให้ปรึกษารังสีแพทย์เพื่อพิจารณาเป็นรายกรณี`
          : ''}
        confirmLabel='รับทราบ'
        showCancel={false}
        onConfirm={() => setBlockDialog(null)}
        onClose={() => setBlockDialog(null)}
      />

      {/* พิมพ์เอกสาร — legacy §2.1 items 11–12: the four sheets the old
          system prints after save. Mock preview: checkbox per sheet. */}
      <Popup
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        title='พิมพ์เอกสาร'
        subtitle={`คำขอ ${NEXT_XN} บันทึกแล้ว — เลือกเอกสารที่ต้องการพิมพ์`}
        primaryAction={{
          label: 'พิมพ์เอกสารที่เลือก',
          onClick: () => {
            /* Print the previews below, not a mock toast — the @media print
               rules above scope the output to `.mih-xrayorder-print-area`. */
            window.print();
            setPrintToast(true);
          },
        }}
        secondaryAction={{ label: 'ปิด', onClick: () => setPrintOpen(false) }}
        tertiaryAction={{ label: 'ไปยัง Worklist', onClick: () => routerHistory.push('/xray/queue') }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          {[
            { key: 'request', label: 'ใบส่งตรวจรังสี', hint: 'คำสั่งตรวจ + อาการโดยย่อ + การวินิจฉัย สำหรับห้องเอกซเรย์' },
            { key: 'appointment', label: 'ใบนัดตรวจรังสี', hint: 'วันเวลานัด + คำแนะนำการเตรียมตัวก่อนตรวจ สำหรับผู้ป่วย' },
            { key: 'filmLabel', label: 'ฉลากติดซองฟิล์ม', hint: 'HN ชื่อ-สกุล และเลข XN สำหรับติดซองฟิล์ม' },
            { key: 'exposure', label: 'ใบฉายรังสี', hint: 'รายการท่าถ่ายต่อ exposure สำหรับผู้ถ่าย' },
          ].map((sheet) => (
            <Checkbox
              key={sheet.key}
              checked={printSel[sheet.key]}
              onChange={() => setPrintSel((prev) => ({ ...prev, [sheet.key]: !prev[sheet.key] }))}
              label={sheet.label}
              description={sheet.hint}
            />
          ))}

          {/* ตัวอย่างก่อนพิมพ์ — the same <XrayReportSheet> the result screen
              and /preview/xray-sheets use, so a form never disagrees with the
              paper it produces. ใบฉายรังสี has no designed sheet yet; say so
              rather than silently printing nothing for it. */}
          <div
            className='mih-xrayorder-print-area flex flex-col w-full'
            style={{ gap: 'var(--dim-space-400)' }}
          >
            {printSel.request ? (
              <XrayReportSheet variant='request' {...sheetProps} />
            ) : null}
            {printSel.appointment ? (
              <XrayReportSheet variant='appointment' {...sheetProps} />
            ) : null}
            {printSel.filmLabel ? (
              <XrayReportSheet variant='filmLabel' {...sheetProps} />
            ) : null}
          </div>

          {printSel.exposure ? (
            <span
              className='no-print text-xs'
              style={{ color: 'var(--text-content-tertiary, #858C92)' }}
            >
              ใบฉายรังสียังไม่มีแบบพิมพ์ในระบบ — จะพิมพ์เฉพาะเอกสารอื่นที่เลือกไว้
            </span>
          ) : null}
        </div>
      </Popup>

      <SuccessToast
        open={saved}
        message={`บันทึกส่งตรวจทางรังสีวิทยาแล้ว · ${NEXT_XN}`}
        onClose={() => setSaved(false)}
      />
      <SuccessToast
        open={printToast}
        message='ส่งพิมพ์เอกสารที่เลือกแล้ว'
        onClose={() => setPrintToast(false)}
      />
    </div>
  );
};

export default XrayOrderPage;
