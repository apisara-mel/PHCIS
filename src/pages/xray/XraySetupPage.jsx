import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Icon from '@/components/icons/Icon';
import TabUnderline from '@/components/tab/TabUnderline';
import Badge from '@/components/badge/Badge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import SuccessToast from '@/components/toast/SuccessToast';
import AlertDialog from '@/components/popup/AlertDialog';
import {
  XRAY_MODALITIES, XRAY_MODALITY_BY_KEY, XRAY_BODY_REGIONS, XRAY_REGION_BY_KEY,
  XRAY_VIEWS, XRAY_RIGHTS, XRAY_FILM_SIZES, XRAY_EXAMS,
  subscribeCatalog, upsertXrayExam, setXrayExamRetired,
} from '@/data/xrayCatalog';
import {
  XRAY_RADIOLOGISTS, XRAY_RADIOLOGIST_BY_ID, XRAY_RADIOGRAPHERS,
  XRAY_TEMPLATES, XRAY_PHRASES, XRAY_PHRASE_SETS,
  subscribeTemplates, upsertTemplate, removeTemplate, upsertPhrase,
} from '@/data/xrayResultTemplates';
import { XRAY_RESULT_TYPES } from '@/data/xrayOrders';

/* ตั้งค่าทะเบียนรายการตรวจทางรังสีวิทยา (RIS Setup) — the admin screen behind
   the whole X-ray module. Four tabs:

     1. รายการตรวจทางรังสีวิทยา   — TOR §1.12.4.1 (exam registry, user-defined)
                                    + §1.12.4.2 (ราคา/การเบิกแยกตามสิทธิ)
                                    + §1.12.5.5 (ข้อมูลที่จำเป็นสำหรับการส่งตรวจ)
     2. Template ผลการตรวจ        — TOR §1.12.6.1 (standard results, unlimited,
                                    bindable per reading doctor) + §1.12.6.7
     3. คำช่วย / ชุดคำช่วย        — TOR §1.12.6.6 (ตัวช่วยข้อความ)
     4. ผู้ให้บริการ / แพทย์อ่านผล — the MyHOSPITAL "กำหนดผู้ให้บริการ" /
                                    "กำหนดแพทย์อ่านผล X-ray" setup screens,
                                    reproduced as the manual's two-list
                                    transfer UI with ◀ ▶ buttons.

   Sources: TOR ภาคผนวก ก §1.12 (docs/tor-checklist.html), คู่มือ MyHOSPITAL
   งานรังสีวิทยา (X-Ray) การจัดการระบบ + บันทึก Template, and the legacy
   คู่มืออบรมระบบงานรังสีวินิจฉัย §2.5 ทะเบียนรายการตรวจรังสี.

   Data flows through the module-level stores in @/data/xrayCatalog and
   @/data/xrayResultTemplates — never by mutating the arrays directly.
   Re-rendering on writes uses subscribe + a version counter (React 17:
   useSyncExternalStore does not exist on this runtime). */

const breadcrumb = ['งานรังสีวินิจฉัย (X-ray)', 'ตั้งค่าทะเบียนรายการตรวจ'];

/* ─── Chrome-free native inputs (CLAUDE.md "No browser-default input chrome")
   The wrapper <div> owns border/background/radius; the native control inside
   is stripped of every UA style with !important so no Webkit vertical edges
   or focus rings leak through. Idempotent module-load injection (canonical
   pattern: src/components/search/AISearch.jsx) so HMR replaces, not stacks.
   The caret stays visible — these are real data-entry fields, not a
   design-system search bar. */
const FIELD_STYLE_ID = 'mih-xrsetup-field-style';
const FIELD_CSS = `
.mih-xrsetup-input,
.mih-xrsetup-input:focus,
.mih-xrsetup-input:focus-visible,
.mih-xrsetup-textarea,
.mih-xrsetup-textarea:focus,
.mih-xrsetup-textarea:focus-visible,
.mih-xrsetup-select,
.mih-xrsetup-select:focus,
.mih-xrsetup-select:focus-visible {
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-xrsetup-input::-webkit-outer-spin-button,
.mih-xrsetup-input::-webkit-inner-spin-button {
  -webkit-appearance: none !important;
  margin: 0;
}
.mih-xrsetup-input::placeholder,
.mih-xrsetup-textarea::placeholder {
  color: var(--text-content-quaternary, #ADB2B7);
  opacity: 1; /* Firefox defaults to 0.54 */
}
.mih-xrsetup-fieldwrap:focus-within {
  border-color: var(--border-brandPrimary-default, #007549) !important;
}
`;
const injectFieldStyles = () => {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(FIELD_STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = FIELD_STYLE_ID;
    document.head.appendChild(el);
  }
  if (el.textContent !== FIELD_CSS) el.textContent = FIELD_CSS;
};
injectFieldStyles();

/* Wrapper owns the visual border; the class above keeps the native control
   chrome-free inside it. */
const WRAP_STYLE = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  background: 'var(--surface-input-default)',
  border: 'var(--dim-stroke-100) solid var(--border-input-default)',
  borderRadius: 'var(--dim-radius-200, 8px)',
  paddingLeft: 'var(--dim-space-300)',
  paddingRight: 'var(--dim-space-300)',
};

const CONTROL_STYLE = {
  width: '100%',
  paddingTop: 'var(--dim-space-150)',
  paddingBottom: 'var(--dim-space-150)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  /* `--text-content-primary` only exists inside the dark blocks, so in light
     mode it silently fell through to the literal. `--text-content-default`
     is the token defined in `:root` (#363B3F) and re-mapped per theme. */
  color: 'var(--text-content-default, #363B3F)',
};

/* Stable per-instance field ids — React 17 has no useId, so a module
   counter captured once per component instance (useRef) gives htmlFor /
   aria-describedby wiring a collision-free id that never changes across
   re-renders. */
let fieldIdSeq = 0;
const useFieldId = () => {
  const ref = useRef(null);
  if (ref.current === null) {
    fieldIdSeq += 1;
    ref.current = `mih-xrsetup-f${fieldIdSeq}`;
  }
  return ref.current;
};

/* aria-describedby id list — error first so screen readers announce the
   problem before the hint. */
const describedBy = (id, hint, error) => {
  const ids = [];
  if (error) ids.push(`${id}-err`);
  if (hint) ids.push(`${id}-hint`);
  return ids.length > 0 ? ids.join(' ') : undefined;
};

/* Renders a real <label> when a control id is supplied (programmatic name —
   WCAG 1.3.1 / 3.3.2 / 4.1.2); with `id` only, it renders an id-bearing
   <span> that groups reference via aria-labelledby. */
const FieldLabel = ({ id, htmlFor, label, required, suffix }) => {
  const Tag = htmlFor ? 'label' : 'span';
  return (
    <Tag id={id} htmlFor={htmlFor} className='text-xs text-ink-secondary'>
      {label} {required && <span aria-hidden style={{ color: 'var(--text-input-require)' }}>*</span>}
      {suffix && <span className='text-ink-tertiary'> ({suffix})</span>}
    </Tag>
  );
};

const TextField = ({ label, value, onChange, placeholder, required, hint }) => {
  const id = useFieldId();
  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
      <FieldLabel htmlFor={id} label={label} required={required} />
      <div className='mih-xrsetup-fieldwrap' style={WRAP_STYLE}>
        <input
          id={id}
          type='text'
          className='mih-xrsetup-input'
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-required={required || undefined}
          aria-describedby={describedBy(id, hint)}
          style={CONTROL_STYLE}
        />
      </div>
      {hint && <span id={`${id}-hint`} className='text-xs text-ink-tertiary'>{hint}</span>}
    </div>
  );
};

const NumberField = ({ label, value, onChange, suffix, required, invalid, error, hint }) => {
  const id = useFieldId();
  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
      <FieldLabel htmlFor={id} label={label} required={required} suffix={suffix} />
      <div
        className='mih-xrsetup-fieldwrap'
        style={{
          ...WRAP_STYLE,
          borderColor: invalid ? 'var(--text-input-require)' : 'var(--border-input-default)',
        }}
      >
        <input
          id={id}
          type='number'
          min='0'
          className='mih-xrsetup-input'
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy(id, hint, error)}
          style={{ ...CONTROL_STYLE, textAlign: 'right' }}
        />
      </div>
      {/* role='alert' → announced immediately (WCAG 3.3.1); tied to the
          field via aria-describedby above. */}
      {error && (
        <span id={`${id}-err`} role='alert' className='text-xs' style={{ color: 'var(--text-input-require)' }}>
          {error}
        </span>
      )}
      {hint && <span id={`${id}-hint`} className='text-xs text-ink-tertiary'>{hint}</span>}
    </div>
  );
};

const SelectField = ({ label, value, onChange, options, required, hint }) => {
  const id = useFieldId();
  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
      <FieldLabel htmlFor={id} label={label} required={required} />
      <div className='mih-xrsetup-fieldwrap relative' style={WRAP_STYLE}>
        <select
          id={id}
          className='mih-xrsetup-select'
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          aria-required={required || undefined}
          aria-describedby={describedBy(id, hint)}
          style={{ ...CONTROL_STYLE, cursor: 'pointer', paddingRight: 'var(--dim-space-500)' }}
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {/* appearance:none removes the UA dropdown arrow — repaint our own. */}
        <span
          aria-hidden
          className='absolute pointer-events-none inline-flex'
          style={{ right: 'var(--dim-space-200)', color: 'var(--text-content-tertiary)' }}
        >
          <Icon name='keyboard_arrow_down' size={16} />
        </span>
      </div>
      {hint && <span id={`${id}-hint`} className='text-xs text-ink-tertiary'>{hint}</span>}
    </div>
  );
};

const TextAreaField = ({ label, value, onChange, placeholder, rows = 3, required, hint }) => {
  const id = useFieldId();
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)' }}>
      <FieldLabel htmlFor={id} label={label} required={required} />
      <div
        className='mih-xrsetup-fieldwrap'
        style={{
          ...WRAP_STYLE,
          alignItems: 'stretch',
          paddingTop: 'var(--dim-space-150)',
          paddingBottom: 'var(--dim-space-150)',
        }}
      >
        <textarea
          id={id}
          className='mih-xrsetup-textarea'
          rows={rows}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-required={required || undefined}
          aria-describedby={describedBy(id, hint)}
          style={{ ...CONTROL_STYLE, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>
      {hint && <span id={`${id}-hint`} className='text-xs text-ink-tertiary'>{hint}</span>}
    </div>
  );
};

/* Toggle — same visual as the lab setup's checkbox rows (native checkbox
   tinted via accentColor token, its own chrome is meaningful here).
   Explicit id + htmlFor so the checkbox always has a programmatic label. */
const ToggleRow = ({ label, hint, checked, onChange }) => {
  const id = useFieldId();
  return (
    <span className='inline-flex items-start' style={{ gap: 'var(--dim-space-200)' }}>
      <input
        id={id}
        type='checkbox'
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        style={{
          width: 'var(--dim-size-300, 16px)',
          height: 'var(--dim-size-300, 16px)',
          marginTop: 'var(--dim-space-100)',
          accentColor: 'var(--surface-brandPrimary-default)',
          cursor: 'pointer',
        }}
      />
      <span className='flex flex-col'>
        <label htmlFor={id} className='text-sm text-ink cursor-pointer'>{label}</label>
        {hint && <span id={`${id}-hint`} className='text-xs text-ink-tertiary'>{hint}</span>}
      </span>
    </span>
  );
};

/* Multi-select chip row — ท่าถ่าย / ขนาดฟิล์ม / รายการตรวจที่ผูก Template.
   Real checkbox semantics: the wrapper is a labelled group and each chip
   is role='checkbox' + aria-checked (space/enter toggle via native
   button behaviour) — WCAG 1.3.1 / 4.1.2. */
const MultiPick = ({ label, options, values = [], onToggle, hint, required, emptyText }) => {
  const labelId = useFieldId();
  return (
  <div
    className='flex flex-col w-full'
    role='group'
    aria-labelledby={labelId}
    aria-describedby={hint ? `${labelId}-hint` : undefined}
    style={{ gap: 'var(--dim-space-200)' }}
  >
    <FieldLabel id={labelId} label={label} required={required} />
    <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
      {options.length === 0 && (
        <span className='text-xs text-ink-tertiary'>{emptyText ?? 'ไม่มีตัวเลือก'}</span>
      )}
      {options.map((o) => {
        const selected = values.includes(o.value);
        return (
          <button
            key={o.value}
            type='button'
            role='checkbox'
            aria-checked={selected}
            onClick={() => onToggle(o.value)}
            className='inline-flex items-center'
            style={{
              gap: 'var(--dim-space-150)',
              minHeight: 'var(--dim-size-700, 36px)',
              paddingTop: 'var(--dim-space-150)',
              paddingRight: 'var(--dim-space-300)',
              paddingBottom: 'var(--dim-space-150)',
              paddingLeft: 'var(--dim-space-300)',
              background: selected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
              border: `var(--dim-stroke-100) solid ${selected ? 'var(--border-brandPrimary-default)' : 'var(--border-card-default)'}`,
              borderRadius: 'var(--dim-radius-200, 8px)',
              cursor: 'pointer',
            }}
          >
            <Icon
              name={selected ? 'check_box' : 'check_box_outline_blank'}
              size={16}
              style={{ color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-tertiary)' }}
            />
            <span className='flex flex-col text-left'>
              <span
                className='text-sm'
                style={{ color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-secondary)' }}
              >
                {o.label}
              </span>
              {o.sub && <span className='text-xs text-ink-tertiary'>{o.sub}</span>}
            </span>
          </button>
        );
      })}
    </div>
    {hint && <span id={`${labelId}-hint`} className='text-xs text-ink-tertiary'>{hint}</span>}
  </div>
  );
};

const SectionCard = ({ icon, title, subtitle, children, action }) => (
  <section
    className='bg-surface-card rounded-card shadow-card flex flex-col w-full'
    style={{
      /* Longhand only — React inline `padding:` shorthand carrying var()
         renders as 0 (CSSOM drops it). */
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

/* ─── Tab 1 constants ──────────────────────────────────────────────────── */

/* ข้อมูลที่จำเป็นสำหรับการส่งตรวจ — TOR §1.12.5.5 "สามารถกำหนดข้อมูลที่จำเป็น
   สำหรับการส่งตรวจทางรังสีวิทยาได้".

   ⚠ Shape extension: this screen ADDS `requiredFields: string[]` to each
   exam in XRAY_EXAMS (persisted via upsertXrayExam). The order-entry screen
   must read `exam.requiredFields` and refuse submission until every listed
   key has a value. Keys are stable identifiers, not Thai labels. */
const ORDER_REQUIRED_FIELD_OPTIONS = [
  { key: 'briefSymptoms',   thai: 'อาการและผลการตรวจทางคลินิกโดยย่อ' },
  { key: 'diagnosis',       thai: 'การวินิจฉัย' },
  { key: 'allergyHistory',  thai: 'ประวัติการแพ้ / สารที่แพ้' },
  { key: 'femaleScreening', thai: 'ประวัติประจำเดือน / การตั้งครรภ์' },
  { key: 'views',           thai: 'ท่าถ่าย' },
  { key: 'reason',          thai: 'เหตุผลการส่งตรวจ' },
];

/* A blank entry, shaped exactly like a catalog row so the form never has to
   special-case "new". */
const blankExam = () => ({
  id: '',
  code: '',
  name: '',
  nameEn: '',
  modality: 'xr',
  region: 'chest',
  views: [],
  price: 0,
  claimByRight: { UCS: 0, SSS: 0, OFC: 0, BMA: 0, CASH: 0 },
  prep: '',
  contrast: false,
  femaleScreening: false,
  durationMin: 10,
  filmSizes: [],
  defaultTemplateId: null,
  referralOnly: false,
  retired: false,
  requiredFields: [],
});

const slugify = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/* Exam-table grid — one template string shared by the header row and every
   data row so columns always align. */
const EXAM_GRID = '90px minmax(220px, 1.4fr) 120px 150px 90px 76px 70px 120px 110px 96px';

/* ─── Configuration audit — which exams are only half-configured? ─────────
   36 exams × 5 สิทธิ is too many cells to eyeball, so every row is checked
   against the fields the rest of the module actually reads:

     noPrice     price is missing or 0 — the cashier would bill ฿0
     claimGap    some สิทธิ has NO claim value at all (key absent/null) —
                 an untouched ยอดเบิก block, not a deliberate 0
     claimOver   some สิทธิ claims MORE than the price — a keying error
                 (also blocks save in the editor, TOR 1.12.4.2)
     noTemplate  no default result template bound (or it was deleted) —
                 result entry opens blank (TOR 1.12.6.7)
     noRequired  ข้อมูลที่จำเป็นสำหรับการส่งตรวจ never configured —
                 the order screen enforces nothing (TOR 1.12.5.5)

   Retired exams are excluded from the "ตั้งค่าไม่ครบ" count — they are
   switched off on purpose, not misconfigured. */
const AUDIT_GAP_LABELS = {
  noPrice:    'ยังไม่ตั้งราคา',
  claimGap:   'ยังไม่ตั้งยอดเบิกครบทุกสิทธิ',
  claimOver:  'ยอดเบิกเกินราคาค่าตรวจ',
  noTemplate: 'ยังไม่ผูก Template ผลตรวจ',
  noRequired: 'ยังไม่กำหนดข้อมูลที่จำเป็นสำหรับการส่งตรวจ',
};

const auditExam = (e, templates) => {
  const gaps = [];
  if (!(Number(e.price) > 0)) gaps.push('noPrice');
  if (XRAY_RIGHTS.some((r) => e.claimByRight?.[r.key] == null)) gaps.push('claimGap');
  if (XRAY_RIGHTS.some((r) => (e.claimByRight?.[r.key] ?? 0) > (e.price ?? 0))) gaps.push('claimOver');
  if (!e.defaultTemplateId || !templates.some((t) => t.id === e.defaultTemplateId)) gaps.push('noTemplate');
  if (!(Array.isArray(e.requiredFields) && e.requiredFields.length > 0)) gaps.push('noRequired');
  return gaps;
};

/* Quick-filter chips above the table. `claim` folds claimGap + claimOver —
   both mean "the ยอดเบิก block needs another look". */
const AUDIT_CHIPS = [
  { key: 'noPrice',    label: 'ยังไม่ตั้งราคา' },
  { key: 'claim',      label: 'ยังไม่ตั้งยอดเบิกครบทุกสิทธิ' },
  { key: 'noTemplate', label: 'ยังไม่ผูก Template' },
  { key: 'noRequired', label: 'ยังไม่กำหนดข้อมูลที่จำเป็น' },
  { key: 'retired',    label: 'ยกเลิกใช้งานแล้ว' },
];

const chipMatches = (chipKey, exam, gaps) => {
  if (chipKey === 'retired') return !!exam.retired;
  if (chipKey === 'claim') return gaps.includes('claimGap') || gaps.includes('claimOver');
  return gaps.includes(chipKey);
};

/* ─── Tab 2 constants ──────────────────────────────────────────────────── */

const blankTemplate = () => ({
  id: '',
  name: '',
  modality: 'xr',
  examIds: [],
  radiologistId: null,
  technique: '',
  findings: '',
  impression: '',
  resultType: 'normal',
});

/* ─── Tab 3 constants ──────────────────────────────────────────────────── */

const PHRASE_GROUPS = [
  { key: 'chest',   thai: 'ทรวงอก' },
  { key: 'bone',    thai: 'กระดูกและข้อ' },
  { key: 'us',      thai: 'อัลตราซาวด์' },
  { key: 'general', thai: 'ทั่วไป' },
];

const blankPhrase = () => ({ id: '', group: 'general', text: '' });

/* ─── Tab 4: two-list transfer UI ──────────────────────────────────────────
   The MyHOSPITAL manual's การจัดการระบบ pattern, verbatim:
     ๐ ดูรายชื่อเจ้าหน้าที่ทั้งหมด หรือค้นหาเฉพาะประเภทผู้ให้บริการ
     ๐ ติ๊กเลือกเจ้าหน้าที่ → กดปุ่ม ◀ เพิ่มเจ้าหน้าที่ในแผนก
     ๐ คลิกรายชื่อด้านซ้ายแล้วกดปุ่ม ▶ นำข้อมูลออก
   Left list = staff already in the radiology unit, right list = the whole
   roster. Assignment is kept in local useState — the real system persists
   this configuration per หน่วยบริการ (ศบส.), which is the wiring/back-end
   agent's job. */

/* One name in a transfer list — real checkbox semantics (role='checkbox'
   + aria-checked on a native button, so space/enter toggle for free) —
   WCAG 1.3.1 / 4.1.2. */
const PersonRow = ({ person, meta, checked, onToggle }) => (
  <button
    type='button'
    role='checkbox'
    aria-checked={checked}
    onClick={onToggle}
    className='flex items-start w-full text-left'
    style={{
      gap: 'var(--dim-space-200)',
      paddingTop: 'var(--dim-space-200)',
      paddingRight: 'var(--dim-space-300)',
      paddingBottom: 'var(--dim-space-200)',
      paddingLeft: 'var(--dim-space-300)',
      background: checked ? 'var(--surface-brandPrimary-quaternary)' : 'transparent',
      border: 'none',
      borderRadius: 'var(--dim-radius-200, 8px)',
      cursor: 'pointer',
    }}
  >
    <Icon
      name={checked ? 'check_box' : 'check_box_outline_blank'}
      size={16}
      style={{
        color: checked ? 'var(--text-brandPrimary-default)' : 'var(--text-content-tertiary)',
        marginTop: 'var(--dim-space-100)',
      }}
    />
    <span className='flex flex-col min-w-0'>
      <span className='text-sm text-ink'>{person.name}</span>
      {meta && <span className='text-xs text-ink-tertiary'>{meta}</span>}
    </span>
  </button>
);

const TransferList = ({ title, count, checkedCount = 0, children }) => (
  <div
    className='flex flex-col flex-1 min-w-0'
    style={{
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-300, 10px)',
      background: 'var(--surface-card-100)',
      overflow: 'hidden',
    }}
  >
    <div
      className='flex items-center justify-between'
      style={{
        paddingTop: 'var(--dim-space-200)',
        paddingRight: 'var(--dim-space-300)',
        paddingBottom: 'var(--dim-space-200)',
        paddingLeft: 'var(--dim-space-300)',
        background: 'var(--surface-card-200)',
        borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
      }}
    >
      <span className='text-xs font-bold text-ink-secondary'>{title}</span>
      <span className='text-xs text-ink-tertiary'>
        {count} คน{checkedCount > 0 ? ` · ติ๊กไว้ ${checkedCount}` : ''}
      </span>
    </div>
    {/* The checkbox rows get a labelled group so AT reads
        "รายชื่อทั้งหมด, group" before the names. */}
    <div
      role='group'
      aria-label={title}
      className='flex flex-col'
      style={{
        paddingTop: 'var(--dim-space-200)',
        paddingRight: 'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-200)',
        paddingLeft: 'var(--dim-space-200)',
        gap: 'var(--dim-space-100)',
        minHeight: 160,
      }}
    >
      {children}
    </div>
  </div>
);

const TransferBoard = ({
  icon, title, subtitle, universe, initialAssignedIds,
  metaOf, typeFilterOptions, typeOf,
}) => {
  const [assigned, setAssigned] = useState(() => new Set(initialAssignedIds));
  const [leftSel, setLeftSel] = useState(() => new Set());
  const [rightSel, setRightSel] = useState(() => new Set());
  const [typeFilter, setTypeFilter] = useState('all');

  const leftItems = universe.filter((p) => assigned.has(p.id));
  const rightItems = universe.filter((p) =>
    !assigned.has(p.id)
    && (typeFilter === 'all' || !typeOf || typeOf(p) === typeFilter));

  const toggleIn = (set, setSet, id) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSet(next);
  };

  /* ◀ เพิ่มเข้าแผนก — move checked names from the full roster into the unit. */
  const addChecked = () => {
    if (rightSel.size === 0) return;
    const next = new Set(assigned);
    rightSel.forEach((id) => next.add(id));
    setAssigned(next);
    setRightSel(new Set());
  };

  /* ▶ นำออก — move checked names out of the unit back to the roster. */
  const removeChecked = () => {
    if (leftSel.size === 0) return;
    const next = new Set(assigned);
    leftSel.forEach((id) => next.delete(id));
    setAssigned(next);
    setLeftSel(new Set());
  };

  return (
    <SectionCard icon={icon} title={title} subtitle={subtitle}>
      {typeFilterOptions && (
        <div style={{ maxWidth: 320 }}>
          <SelectField
            label='ประเภทผู้ให้บริการ'
            value={typeFilter}
            onChange={setTypeFilter}
            options={[{ value: 'all', label: 'ทุกประเภท' }, ...typeFilterOptions]}
          />
        </div>
      )}
      {/* Live tally — the admin sees the split before/after every ◀ ▶. */}
      <span className='text-sm text-ink-secondary' role='status'>
        ในแผนก {leftItems.length} คน · ทั้งหมด {universe.length} คน
      </span>
      <div className='flex flex-col md:flex-row w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <TransferList title='เจ้าหน้าที่ในแผนกรังสี' count={leftItems.length} checkedCount={leftSel.size}>
          {leftItems.length === 0 && (
            <span
              className='text-xs text-ink-tertiary'
              style={{ paddingTop: 'var(--dim-space-200)', paddingRight: 'var(--dim-space-200)', paddingBottom: 'var(--dim-space-200)', paddingLeft: 'var(--dim-space-200)' }}
            >
              ยังไม่มีเจ้าหน้าที่ในแผนก — เลือกจากรายชื่อทั้งหมดแล้วกด ◀
            </span>
          )}
          {leftItems.map((p) => (
            <PersonRow
              key={p.id}
              person={p}
              meta={metaOf ? metaOf(p) : undefined}
              checked={leftSel.has(p.id)}
              onToggle={() => toggleIn(leftSel, setLeftSel, p.id)}
            />
          ))}
        </TransferList>

        {/* ◀ ▶ — the manual's arrow buttons between the two lists. Multiple
            names can be ticked before transferring; when nothing is ticked
            the button is disabled and its title says why. */}
        <div
          className='flex flex-row md:flex-col items-center justify-center shrink-0'
          style={{ gap: 'var(--dim-space-200)' }}
        >
          <BrandButton
            size='sm'
            leadingIcon='chevron_left'
            disabled={rightSel.size === 0}
            title={rightSel.size === 0
              ? 'ติ๊กเลือกรายชื่อจากฝั่ง "รายชื่อทั้งหมด" ก่อน จึงจะเพิ่มเข้าแผนกได้'
              : `เพิ่มรายชื่อที่ติ๊กไว้ ${rightSel.size} คนเข้าแผนก`}
            onClick={addChecked}
          >
            เพิ่มเข้าแผนก{rightSel.size > 0 ? ` (${rightSel.size})` : ''}
          </BrandButton>
          <NeutralSubdueButton
            variant='outline'
            size='sm'
            trailingIcon='chevron_right'
            disabled={leftSel.size === 0}
            title={leftSel.size === 0
              ? 'ติ๊กเลือกรายชื่อจากฝั่ง "เจ้าหน้าที่ในแผนกรังสี" ก่อน จึงจะนำออกได้'
              : `นำรายชื่อที่ติ๊กไว้ ${leftSel.size} คนออกจากแผนก`}
            onClick={removeChecked}
          >
            นำออก{leftSel.size > 0 ? ` (${leftSel.size})` : ''}
          </NeutralSubdueButton>
        </div>

        <TransferList title='รายชื่อทั้งหมด' count={rightItems.length} checkedCount={rightSel.size}>
          {rightItems.length === 0 && (
            <span
              className='text-xs text-ink-tertiary'
              style={{ paddingTop: 'var(--dim-space-200)', paddingRight: 'var(--dim-space-200)', paddingBottom: 'var(--dim-space-200)', paddingLeft: 'var(--dim-space-200)' }}
            >
              ไม่มีรายชื่อที่ตรงกับประเภทที่เลือก
            </span>
          )}
          {rightItems.map((p) => (
            <PersonRow
              key={p.id}
              person={p}
              meta={metaOf ? metaOf(p) : undefined}
              checked={rightSel.has(p.id)}
              onToggle={() => toggleIn(rightSel, setRightSel, p.id)}
            />
          ))}
        </TransferList>
      </div>
    </SectionCard>
  );
};

/* ─── Page ─────────────────────────────────────────────────────────────── */

const TABS = [
  { key: 'exams',     label: 'รายการตรวจทางรังสีวิทยา', icon: 'list_alt' },
  { key: 'templates', label: 'Template ผลการตรวจ',       icon: 'description' },
  { key: 'phrases',   label: 'คำช่วย / ชุดคำช่วย',       icon: 'text_snippet' },
  { key: 'staff',     label: 'ผู้ให้บริการ / แพทย์อ่านผล', icon: 'group' },
];

const XraySetupPage = () => {
  const history = useHistory();
  const location = useLocation();

  /* Re-render on store writes — both stores are module-level mutable arrays,
     so a version counter is what turns a mutation into a render (React 17:
     no useSyncExternalStore). */
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeCatalog(() => setVersion((v) => v + 1)), []);
  useEffect(() => subscribeTemplates(() => setVersion((v) => v + 1)), []);

  /* ── Tab in the URL (react-router v5) ──────────────────────────────────
     The active tab is DERIVED from `?tab=` instead of living in useState:
     reload / shared links land on the right tab, and back/forward move
     between tabs for free because every switch is a history.push. The
     edited row travels as `?exam=` / `?tpl=` via history.replace so
     stepping back leaves the tab history clean (no per-row entries). */
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const urlTab = searchParams.get('tab');
  const tab = TABS.some((t) => t.key === urlTab) ? urlTab : 'exams';

  const navigateToTab = (key) => {
    if (key === tab) return;
    history.push({
      pathname: location.pathname,
      search: key === 'exams' ? '' : `?tab=${key}`,
    });
  };

  const [toast, setToast] = useState({ open: false, message: '' });
  const showToast = (message) => setToast({ open: true, message });

  /* ── Tab 1 state ── */
  const [query, setQuery] = useState('');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [auditFilter, setAuditFilter] = useState(null);
  const [editingExamId, setEditingExamId] = useState(null);
  const [examForm, setExamForm] = useState(null);

  /* Dirty tracking — snapshot the draft as JSON when the editor opens;
     any divergence means unsaved work worth a confirmation. */
  const examSnapRef = useRef(null);
  const tplSnapRef = useRef(null);

  const setExamField = (key, value) => setExamForm((prev) => ({ ...prev, [key]: value }));
  const toggleInList = (key, value) => setExamForm((prev) => ({
    ...prev,
    [key]: (prev[key] ?? []).includes(value)
      ? prev[key].filter((v) => v !== value)
      : [...(prev[key] ?? []), value],
  }));

  /* Configuration audit per exam — recomputed on every store write. */
  const auditByExamId = useMemo(() => {
    const map = {};
    XRAY_EXAMS.forEach((e) => { map[e.id] = auditExam(e, XRAY_TEMPLATES); });
    return map;
  /* `version` is the dependency that matters — XRAY_EXAMS / XRAY_TEMPLATES
     are mutated in place by the stores, so their identities never change. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const incompleteCount = useMemo(
    () => XRAY_EXAMS.filter((e) => !e.retired && (auditByExamId[e.id] ?? []).length > 0).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auditByExamId],
  );

  const chipCounts = useMemo(() => {
    const counts = {};
    AUDIT_CHIPS.forEach((c) => {
      counts[c.key] = XRAY_EXAMS
        .filter((e) => chipMatches(c.key, e, auditByExamId[e.id] ?? [])).length;
    });
    return counts;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditByExamId]);

  const examRows = useMemo(() => XRAY_EXAMS
    .filter((e) => modalityFilter === 'all' || e.modality === modalityFilter)
    .filter((e) => regionFilter === 'all' || e.region === regionFilter)
    .filter((e) => statusFilter === 'all'
      || (statusFilter === 'active' ? !e.retired : e.retired))
    .filter((e) => !auditFilter || chipMatches(auditFilter, e, auditByExamId[e.id] ?? []))
    .filter((e) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return [e.code, e.name, e.nameEn].some((f) => String(f ?? '').toLowerCase().includes(q));
    }),
  /* `version` is the dependency that matters — XRAY_EXAMS is mutated in
     place by the store, so its identity never changes. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [query, modalityFilter, regionFilter, statusFilter, auditFilter, auditByExamId, version]);

  const startEditExam = (exam) => {
    setEditingExamId(exam.id);
    /* Deep-copy nested structures so editing the draft never mutates the
       stored entry before the user saves. */
    const draft = {
      ...exam,
      views: [...(exam.views ?? [])],
      filmSizes: [...(exam.filmSizes ?? [])],
      claimByRight: { ...(exam.claimByRight ?? {}) },
      requiredFields: [...(exam.requiredFields ?? [])],
    };
    setExamForm(draft);
    examSnapRef.current = JSON.stringify(draft);
    /* Reflect the edited row in the URL (replace, not push — stepping back
       should leave the tab, not walk through every row visited). */
    if (exam.id) {
      history.replace({ pathname: location.pathname, search: `?exam=${exam.id}` });
    }
  };
  const startNewExam = () => {
    setEditingExamId('new');
    const draft = blankExam();
    setExamForm(draft);
    examSnapRef.current = JSON.stringify(draft);
    /* A brand-new draft has no shareable id — drop any stale ?exam=. */
    if (searchParams.get('exam')) {
      history.replace({ pathname: location.pathname, search: '' });
    }
  };
  const closeExamEditor = () => {
    setEditingExamId(null);
    setExamForm(null);
    examSnapRef.current = null;
  };
  const cancelExamEdit = () => {
    closeExamEditor();
    if (searchParams.get('exam')) {
      history.replace({ pathname: location.pathname, search: '' });
    }
  };

  /* TOR §1.12.4.2 validation — a fund can never reimburse more than the
     price; a claim above price is a keying error and blocks save. */
  const claimErrors = examForm
    ? XRAY_RIGHTS.filter((r) => (examForm.claimByRight?.[r.key] ?? 0) > (examForm.price ?? 0)).map((r) => r.key)
    : [];
  /* Every claim at 0 = the patient pays the full price under EVERY สิทธิ.
     Legal, but usually means the ยอดเบิก block was never filled in — say
     so explicitly instead of letting the block look finished. */
  const allClaimsZero = !!examForm
    && XRAY_RIGHTS.every((r) => (examForm.claimByRight?.[r.key] ?? 0) === 0);
  const examFormValid = !!examForm
    && !!examForm.code && !!examForm.name && claimErrors.length === 0;
  /* Why is save disabled? — surfaced as `title` on the disabled button. */
  const examSaveBlocker = !examForm
    ? null
    : (!examForm.code && 'กรอกรหัสรายการก่อนบันทึก')
      || (!examForm.name && 'กรอกชื่อรายการ (ไทย) ก่อนบันทึก')
      || (claimErrors.length > 0 && 'ยอดเบิกบางสิทธิเกินราคาค่าตรวจ — แก้ไขก่อนบันทึก')
      || null;

  const handleSaveExam = () => {
    if (!examFormValid) return;
    const id = examForm.id
      || `${examForm.modality}-${slugify(examForm.code || examForm.nameEn || examForm.name)}`;
    upsertXrayExam({ ...examForm, id, defaultTemplateId: examForm.defaultTemplateId || null });
    showToast('บันทึกรายการตรวจแล้ว');
    cancelExamEdit();
  };

  /* ── Tab 2 state ── */
  const [editingTplId, setEditingTplId] = useState(null);
  const [tplForm, setTplForm] = useState(null);
  const [tplToDelete, setTplToDelete] = useState(null);

  const setTplField = (key, value) => setTplForm((prev) => ({ ...prev, [key]: value }));
  const startEditTpl = (tpl) => {
    setEditingTplId(tpl.id);
    const draft = { ...tpl, examIds: [...(tpl.examIds ?? [])] };
    setTplForm(draft);
    tplSnapRef.current = JSON.stringify(draft);
    if (tpl.id) {
      history.replace({ pathname: location.pathname, search: `?tab=templates&tpl=${tpl.id}` });
    }
  };
  const startNewTpl = () => {
    setEditingTplId('new');
    const draft = blankTemplate();
    setTplForm(draft);
    tplSnapRef.current = JSON.stringify(draft);
    if (searchParams.get('tpl')) {
      history.replace({ pathname: location.pathname, search: '?tab=templates' });
    }
  };
  const closeTplEditor = () => {
    setEditingTplId(null);
    setTplForm(null);
    tplSnapRef.current = null;
  };
  const cancelTplEdit = () => {
    closeTplEditor();
    if (searchParams.get('tpl')) {
      history.replace({ pathname: location.pathname, search: '?tab=templates' });
    }
  };

  const handleSaveTpl = () => {
    if (!tplForm?.name) return;
    /* TOR §1.12.6.1: templates are "สร้างได้ไม่จำกัด" — no cap is enforced
       anywhere on this path, deliberately. */
    const id = tplForm.id || `tpl-${slugify(tplForm.name)}`;
    upsertTemplate({ ...tplForm, id, radiologistId: tplForm.radiologistId || null });
    showToast('บันทึก Template แล้ว');
    cancelTplEdit();
  };

  /* ── Unsaved-changes guard ──────────────────────────────────────────────
     A dirty editor + tab switch / row switch / leave = a confirm first.
     `guard(fn)` runs fn immediately when clean, otherwise parks it behind
     the AlertDialog; confirming discards the draft and runs fn. */
  const examDirty = !!examForm && JSON.stringify(examForm) !== examSnapRef.current;
  const tplDirty = !!tplForm && JSON.stringify(tplForm) !== tplSnapRef.current;
  const anyDirty = examDirty || tplDirty;

  const [pendingAction, setPendingAction] = useState(null);
  const guard = (fn) => {
    if (anyDirty) setPendingAction(() => fn);
    else fn();
  };
  const confirmDiscard = () => {
    const fn = pendingAction;
    setPendingAction(null);
    closeExamEditor();
    closeTplEditor();
    if (fn) fn();
  };

  /* Reload / close-tab while dirty → the browser's native "leave site?"
     prompt (history back/forward inside the SPA is not interceptable in
     react-router v5 without a <Prompt>, which this page skips). */
  useEffect(() => {
    if (!anyDirty) return undefined;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [anyDirty]);

  /* Restore the edited row from the URL on mount (`?exam=` / `?tpl=`). */
  useEffect(() => {
    const examId = searchParams.get('exam');
    if (examId) {
      const exam = XRAY_EXAMS.find((e) => e.id === examId);
      if (exam) startEditExam(exam);
    }
    const tplId = searchParams.get('tpl');
    if (tplId) {
      const tpl = XRAY_TEMPLATES.find((t) => t.id === tplId);
      if (tpl) startEditTpl(tpl);
    }
  // Mount-only by design — afterwards the URL follows the UI, not vice versa.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteTpl = () => {
    if (!tplToDelete) return;
    removeTemplate(tplToDelete.id);
    if (editingTplId === tplToDelete.id) cancelTplEdit();
    setTplToDelete(null);
    showToast('ลบ Template แล้ว');
  };

  /* ── Tab 3 state ── */
  const [phraseGroupFilter, setPhraseGroupFilter] = useState('all');
  const [phraseForm, setPhraseForm] = useState(null);
  const setPhraseField = (key, value) => setPhraseForm((prev) => ({ ...prev, [key]: value }));

  const handleSavePhrase = () => {
    if (!phraseForm?.text) return;
    const id = phraseForm.id || `ph-${slugify(phraseForm.text).slice(0, 40)}`;
    upsertPhrase({ ...phraseForm, id });
    showToast('บันทึกคำช่วยแล้ว');
    setPhraseForm(null);
  };

  /* ── Shared option lists ── */
  const modalityOptions = XRAY_MODALITIES.map((m) => ({
    value: m.key,
    label: `${m.code} — ${m.thai}${m.referralOnly ? ' (ส่งตรวจภายนอก)' : ''}`,
  }));
  const regionOptions = XRAY_BODY_REGIONS.map((r) => ({ value: r.key, label: r.thai }));

  /* Template ผลตรวจเริ่มต้น options — only templates of the SAME modality
     make sense as a default (TOR §1.12.6.7). Depends on `version` because
     XRAY_TEMPLATES is mutated in place. */
  const defaultTplOptions = useMemo(() => [
    { value: '', label: 'ไม่กำหนด' },
    ...XRAY_TEMPLATES
      .filter((t) => t.modality === (examForm?.modality ?? ''))
      .map((t) => ({ value: t.id, label: t.name })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [examForm?.modality, version]);

  return (
    <div className='min-h-screen flex' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <Sidebar activeKey='radiology' />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header breadcrumb={breadcrumb} />
        <div className='p-3 md:p-6 flex-1 flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <button
              type='button'
              onClick={() => guard(() => history.push('/xray/queue'))}
              className='inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-brand-500'
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <Icon name='chevron_left' size={16} />
              กลับไปยัง Worklist
            </button>
          </div>

          {/* TabUnderline already exposes role='tablist' / role='tab' /
              aria-selected internally; the accessible NAME of the tablist
              is passed through here (spread onto the container). */}
          <TabUnderline
            tabs={TABS}
            value={tab}
            onChange={(key) => guard(() => navigateToTab(key))}
            aria-label='หมวดการตั้งค่าทะเบียนรายการตรวจ'
            style={{ borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)' }}
          />

          {/* ════ Tab 1 — รายการตรวจทางรังสีวิทยา (TOR §1.12.4.1) ════ */}
          {tab === 'exams' && (
            <div
              role='tabpanel'
              aria-label='รายการตรวจทางรังสีวิทยา'
              className='flex flex-col'
              style={{ gap: 'var(--dim-space-500)' }}
            >
              <SectionCard
                icon='radiology'
                title='ทะเบียนรายการตรวจทางรังสีวิทยา'
                subtitle={`${XRAY_EXAMS.length} รายการ · ${incompleteCount > 0
                  ? `${incompleteCount} รายการยังตั้งค่าไม่ครบ`
                  : 'ตั้งค่าครบทุกรายการ'} · TOR 1.12.4.1 บันทึกรายการตรวจตามที่ผู้ใช้งานกำหนด`}
                action={
                  <BrandButton size='sm' leadingIcon='add' onClick={() => guard(startNewExam)}>
                    เพิ่มรายการตรวจ
                  </BrandButton>
                }
              >
                {/* Audit quick filters — one chip per gap type, count included.
                    Toggle buttons (aria-pressed), single-select: click the
                    active chip again to clear. */}
                <div
                  role='group'
                  aria-label='ตัวกรองรายการที่ตั้งค่าไม่ครบ'
                  className='flex flex-wrap items-center w-full'
                  style={{ gap: 'var(--dim-space-200)' }}
                >
                  {AUDIT_CHIPS.map((c) => {
                    const count = chipCounts[c.key] ?? 0;
                    const active = auditFilter === c.key;
                    return (
                      <button
                        key={c.key}
                        type='button'
                        aria-pressed={active}
                        title={active
                          ? 'กดอีกครั้งเพื่อเลิกกรอง'
                          : `แสดงเฉพาะรายการที่${c.label} (${count} รายการ)`}
                        onClick={() => setAuditFilter(active ? null : c.key)}
                        className='inline-flex items-center'
                        style={{
                          gap: 'var(--dim-space-150)',
                          paddingTop: 'var(--dim-space-100)',
                          paddingRight: 'var(--dim-space-300)',
                          paddingBottom: 'var(--dim-space-100)',
                          paddingLeft: 'var(--dim-space-300)',
                          borderRadius: 'var(--dim-radius-full)',
                          border: `var(--dim-stroke-100) solid ${active ? 'var(--border-brandPrimary-default)' : 'var(--border-card-default)'}`,
                          background: active ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
                          color: active ? 'var(--text-brandPrimary-default)' : 'var(--text-content-secondary)',
                          fontSize: 'var(--type-size-xs)',
                          fontFamily: 'var(--type-family-body)',
                          cursor: 'pointer',
                        }}
                      >
                        <span>{c.label}</span>
                        <span style={{ fontWeight: 'var(--type-weight-bold)' }}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  <div style={{ flex: '1 1 260px', minWidth: 200 }}>
                    <TextField
                      label='ค้นหา'
                      value={query}
                      onChange={setQuery}
                      placeholder='รหัสรายการ · ชื่อไทย · ชื่ออังกฤษ'
                    />
                  </div>
                  <div style={{ flex: '0 1 220px', minWidth: 170 }}>
                    <SelectField
                      label='ชนิดการตรวจ'
                      value={modalityFilter}
                      onChange={setModalityFilter}
                      options={[{ value: 'all', label: 'ทุกชนิด' }, ...modalityOptions]}
                    />
                  </div>
                  <div style={{ flex: '0 1 220px', minWidth: 170 }}>
                    <SelectField
                      label='ตำแหน่งที่ตรวจ'
                      value={regionFilter}
                      onChange={setRegionFilter}
                      options={[{ value: 'all', label: 'ทุกตำแหน่ง' }, ...regionOptions]}
                    />
                  </div>
                  <div style={{ flex: '0 1 180px', minWidth: 140 }}>
                    <SelectField
                      label='สถานะ'
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={[
                        { value: 'all', label: 'ทั้งหมด' },
                        { value: 'active', label: 'ใช้งาน' },
                        { value: 'retired', label: 'ยกเลิกใช้งาน' },
                      ]}
                    />
                  </div>
                </div>

                {/* Wide table scrolls inside its own container — the page
                    body never scrolls horizontally. ARIA table semantics
                    (role table/row/columnheader/cell) because the layout is
                    a CSS grid, not a native <table> — WCAG 1.3.1. Rows are
                    plain rows (no nested-button ARIA violation); keyboard
                    editing goes through the named แก้ไข button in each row,
                    row click stays as a pointer convenience. */}
                <div className='w-full' style={{ overflowX: 'auto' }}>
                  <div
                    role='table'
                    aria-label='ทะเบียนรายการตรวจทางรังสีวิทยา'
                    className='flex flex-col'
                    style={{ minWidth: 1140, gap: 'var(--dim-space-100)' }}
                  >
                    <div
                      role='row'
                      className='text-xs text-ink-tertiary'
                      style={{
                        display: 'grid',
                        gridTemplateColumns: EXAM_GRID,
                        gap: 'var(--dim-space-200)',
                        paddingTop: 'var(--dim-space-100)',
                        paddingRight: 'var(--dim-space-300)',
                        paddingBottom: 'var(--dim-space-100)',
                        paddingLeft: 'var(--dim-space-300)',
                      }}
                    >
                      <span role='columnheader'>รหัส</span>
                      <span role='columnheader'>ชื่อรายการ</span>
                      <span role='columnheader'>ชนิดการตรวจ</span>
                      <span role='columnheader'>ตำแหน่ง</span>
                      <span role='columnheader'>ท่าถ่าย</span>
                      <span role='columnheader' style={{ textAlign: 'right' }}>ราคา</span>
                      <span role='columnheader' style={{ textAlign: 'right' }}>เวลา</span>
                      <span role='columnheader'>ข้อควรระวัง</span>
                      <span role='columnheader'>สถานะ</span>
                      <span role='columnheader' style={{ textAlign: 'right' }}>แก้ไข</span>
                    </div>

                    {examRows.map((e) => {
                      const modality = XRAY_MODALITY_BY_KEY[e.modality];
                      const region = XRAY_REGION_BY_KEY[e.region];
                      const viewCodes = (e.views ?? [])
                        .map((v) => XRAY_VIEWS.find((x) => x.key === v)?.code ?? v)
                        .join('/');
                      const selectedRow = editingExamId === e.id;
                      const gaps = auditByExamId[e.id] ?? [];
                      const gapTitle = gaps.length > 0
                        ? `ตั้งค่าไม่ครบ: ${gaps.map((g) => AUDIT_GAP_LABELS[g]).join(' · ')}`
                        : '';
                      return (
                        <div
                          key={e.id}
                          role='row'
                          onClick={() => guard(() => startEditExam(e))}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: EXAM_GRID,
                            gap: 'var(--dim-space-200)',
                            alignItems: 'center',
                            background: selectedRow ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-200)',
                            border: `var(--dim-stroke-100) solid ${selectedRow ? 'var(--border-brandPrimary-default)' : 'var(--border-neutral-quaternary)'}`,
                            borderRadius: 'var(--dim-radius-200, 8px)',
                            paddingTop: 'var(--dim-space-200)',
                            paddingRight: 'var(--dim-space-300)',
                            paddingBottom: 'var(--dim-space-200)',
                            paddingLeft: 'var(--dim-space-300)',
                            opacity: e.retired ? 0.55 : 1,
                            cursor: 'pointer',
                          }}
                        >
                          <span role='cell' className='text-sm' style={{ color: 'var(--text-content-tertiary)' }}>
                            {e.code}
                          </span>
                          <span role='cell' className='flex flex-col min-w-0'>
                            <span className='inline-flex items-center min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
                              <span className='text-sm font-bold text-ink truncate'>{e.name}</span>
                              {/* Audit glyph — names exactly what is missing
                                  (title for pointer, aria-label for AT). */}
                              {gaps.length > 0 && !e.retired && (
                                <span
                                  role='img'
                                  aria-label={gapTitle}
                                  title={gapTitle}
                                  className='inline-flex shrink-0'
                                  style={{ color: 'var(--text-warning-default, #C2410C)' }}
                                >
                                  <Icon name='warning' size={14} />
                                </span>
                              )}
                            </span>
                            <span className='text-xs text-ink-tertiary truncate'>{e.nameEn}</span>
                          </span>
                          <span role='cell' className='inline-flex items-center text-xs text-ink-secondary' style={{ gap: 'var(--dim-space-100)' }}>
                            <Icon name={modality?.icon ?? 'radiology'} size={14} style={{ color: 'var(--text-content-tertiary)' }} />
                            {modality?.thai ?? e.modality}
                          </span>
                          <span role='cell' className='text-xs text-ink-secondary truncate'>{region?.thai ?? e.region}</span>
                          <span role='cell' className='text-xs text-ink-secondary'>{viewCodes || '—'}</span>
                          <span role='cell' className='text-sm text-ink' style={{ textAlign: 'right' }}>
                            {(e.price ?? 0).toLocaleString('th-TH')}
                          </span>
                          <span role='cell' className='text-xs text-ink-secondary' style={{ textAlign: 'right' }}>
                            {e.durationMin} น.
                          </span>
                          <span role='cell' className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', color: 'var(--text-content-tertiary)' }}>
                            {e.contrast && (
                              <span role='img' aria-label='ใช้สารทึบรังสี' title='ใช้สารทึบรังสี — ต้องตรวจสอบประวัติการแพ้ (TOR 1.12.5.3)'>
                                <Icon name='vaccines' size={16} />
                              </span>
                            )}
                            {e.femaleScreening && (
                              <span role='img' aria-label='ต้องคัดกรองประจำเดือน/การตั้งครรภ์' title='ต้องคัดกรองประจำเดือน/การตั้งครรภ์ก่อนตรวจ (TOR 1.12.5.3)'>
                                <Icon name='pregnant_woman' size={16} />
                              </span>
                            )}
                            {e.referralOnly && (
                              <span role='img' aria-label='ส่งตรวจภายนอก' title='ส่งตรวจภายนอก — สั่งได้จาก ศบส. แต่ไปตรวจที่โรงพยาบาล'>
                                <Icon name='outbound' size={16} />
                              </span>
                            )}
                            {!e.contrast && !e.femaleScreening && !e.referralOnly && <span className='text-xs'>—</span>}
                          </span>
                          <span role='cell'>
                            {/* Retired state is text + icon, never colour
                                alone (WCAG 1.4.1). */}
                            <Badge style={e.retired ? 'neutral' : 'success'} size='small' icon={e.retired ? 'block' : undefined}>
                              {e.retired ? 'ยกเลิกใช้งาน' : 'ใช้งาน'}
                            </Badge>
                          </span>
                          <span
                            role='cell'
                            className='inline-flex items-center justify-end'
                            style={{ gap: 'var(--dim-space-150)' }}
                            onClick={(ev) => ev.stopPropagation()}
                            onKeyDown={(ev) => ev.stopPropagation()}
                          >
                            <NeutralSubdueIconButton
                              icon='edit'
                              variant='outline'
                              size='sm'
                              aria-label={`แก้ไข ${e.name}`}
                              title={`แก้ไข ${e.name}`}
                              onClick={() => guard(() => startEditExam(e))}
                            />
                            {/* Retire — never delete: a code already used on
                                past orders (and printed ใบผลเอกซเรย์) must
                                keep resolving forever. */}
                            <NeutralSubdueIconButton
                              icon={e.retired ? 'restart_alt' : 'block'}
                              variant='outline'
                              size='sm'
                              aria-label={e.retired ? `เปิดใช้งาน ${e.name}` : `ยกเลิกใช้งาน ${e.name}`}
                              title={e.retired ? 'เปิดใช้งานอีกครั้ง' : 'ยกเลิกใช้งาน (ไม่ลบ — รหัสเดิมต้องอ้างอิงได้ตลอด)'}
                              onClick={() => {
                                setXrayExamRetired(e.id, !e.retired);
                                showToast(e.retired ? 'เปิดใช้งานรายการตรวจแล้ว' : 'ยกเลิกใช้งานรายการตรวจแล้ว');
                              }}
                            />
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {examRows.length === 0 && (
                    <span
                      role='status'
                      className='block text-sm text-ink-tertiary'
                      style={{ paddingTop: 'var(--dim-space-300)', paddingRight: 'var(--dim-space-300)', paddingBottom: 'var(--dim-space-300)', paddingLeft: 'var(--dim-space-300)' }}
                    >
                      ไม่พบรายการตรวจที่ตรงกับการค้นหาหรือตัวกรองที่เลือก
                    </span>
                  )}
                </div>
              </SectionCard>

              {/* ─── Exam editor ─── */}
              {examForm && (
                <>
                  <SectionCard
                    icon='edit'
                    title={editingExamId === 'new' ? 'เพิ่มรายการตรวจใหม่' : `แก้ไข ${examForm.name || examForm.code}`}
                    subtitle='ข้อมูลพื้นฐานของรายการตรวจ — TOR 1.12.4.1'
                  >
                    <div className='grid grid-cols-1 md:grid-cols-4 gap-3 w-full'>
                      <TextField label='รหัสรายการ' required value={examForm.code} onChange={(v) => setExamField('code', v)} placeholder='เช่น X000001' />
                      <TextField label='ชื่อรายการ (ไทย)' required value={examForm.name} onChange={(v) => setExamField('name', v)} placeholder='เช่น เอกซเรย์ทรวงอก (CXR) PA' />
                      <TextField label='ชื่อรายการ (อังกฤษ)' value={examForm.nameEn} onChange={(v) => setExamField('nameEn', v)} placeholder='เช่น Chest PA upright' />
                      <NumberField label='ระยะเวลาตรวจ' suffix='นาที' value={examForm.durationMin} onChange={(v) => setExamField('durationMin', v)} />
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3 w-full'>
                      <SelectField
                        label='ชนิดการตรวจ'
                        required
                        value={examForm.modality}
                        onChange={(v) => setExamField('modality', v)}
                        options={modalityOptions}
                      />
                      <SelectField
                        label='ตำแหน่งที่ตรวจ'
                        required
                        value={examForm.region}
                        onChange={(v) => setExamField('region', v)}
                        options={regionOptions}
                      />
                    </div>
                    <MultiPick
                      label='ท่าถ่ายที่ใช้ได้'
                      options={XRAY_VIEWS.map((v) => ({ value: v.key, label: v.code, sub: v.thai }))}
                      values={examForm.views}
                      onToggle={(v) => toggleInList('views', v)}
                      hint='เว้นว่างได้สำหรับการตรวจที่ไม่ระบุท่า (เช่น อัลตราซาวด์)'
                    />
                    <MultiPick
                      label='ขนาดฟิล์มที่ใช้'
                      options={XRAY_FILM_SIZES.map((f) => ({ value: f.key, label: f.thai }))}
                      values={examForm.filmSizes}
                      onToggle={(v) => toggleInList('filmSizes', v)}
                    />
                    <TextAreaField
                      label='การเตรียมตัวผู้รับบริการ'
                      value={examForm.prep}
                      onChange={(v) => setExamField('prep', v)}
                      placeholder='เช่น งดอาหารและเครื่องดื่ม 6–8 ชั่วโมงก่อนตรวจ'
                      hint='ข้อความนี้พิมพ์ลงใบนัดตรวจรังสี เพื่อให้ผู้รับบริการเตรียมตัวมาถูกต้อง'
                    />
                    <div className='flex flex-col md:flex-row md:items-start w-full' style={{ gap: 'var(--dim-space-400)' }}>
                      <ToggleRow
                        label='ใช้สารทึบรังสี'
                        hint='บังคับให้หน้าส่งตรวจแสดงบล็อกประวัติการแพ้ (TOR 1.12.5.3)'
                        checked={examForm.contrast}
                        onChange={(v) => setExamField('contrast', v)}
                      />
                      <ToggleRow
                        label='ต้องคัดกรองประจำเดือน/การตั้งครรภ์'
                        hint='ถามก่อนฉายรังสีบริเวณช่องท้อง/เชิงกรานของผู้หญิง'
                        checked={examForm.femaleScreening}
                        onChange={(v) => setExamField('femaleScreening', v)}
                      />
                      <ToggleRow
                        label='ส่งตรวจภายนอก'
                        hint='สั่งได้จาก ศบส. — ใบสั่งพิมพ์เป็นใบส่งต่อไปโรงพยาบาล'
                        checked={!!examForm.referralOnly}
                        onChange={(v) => setExamField('referralOnly', v)}
                      />
                    </div>
                    <div style={{ maxWidth: 420 }}>
                      <SelectField
                        label='Template ผลตรวจเริ่มต้น'
                        value={examForm.defaultTemplateId ?? ''}
                        onChange={(v) => setExamField('defaultTemplateId', v || null)}
                        options={defaultTplOptions}
                        hint='หน้าบันทึกผลตรวจจะเปิด Template นี้ให้อัตโนมัติ (TOR 1.12.6.7) — แสดงเฉพาะ Template ของชนิดการตรวจเดียวกัน'
                      />
                    </div>
                  </SectionCard>

                  {/* ราคาและการเบิกแยกตามสิทธิ — TOR §1.12.4.2 */}
                  <SectionCard
                    icon='payments'
                    title='ราคาและการเบิกแยกตามสิทธิการรักษา'
                    subtitle='TOR 1.12.4.2 — ราคาหนึ่งค่า แต่ยอดที่กองทุนเบิกให้ต่างกันตามสิทธิ · ส่วนต่างคือยอดที่ผู้ป่วยจ่ายเอง'
                  >
                    <div style={{ maxWidth: 260 }}>
                      <NumberField
                        label='ราคาค่าตรวจ'
                        suffix='บาท'
                        required
                        value={examForm.price}
                        onChange={(v) => setExamField('price', v)}
                      />
                    </div>
                    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                      {XRAY_RIGHTS.map((r) => {
                        const claim = examForm.claimByRight?.[r.key] ?? 0;
                        const invalid = claim > (examForm.price ?? 0);
                        const patientPay = Math.max(0, (examForm.price ?? 0) - Math.min(claim, examForm.price ?? 0));
                        return (
                          <div
                            key={r.key}
                            className='flex flex-wrap items-end w-full'
                            style={{
                              gap: 'var(--dim-space-300)',
                              background: 'var(--surface-card-200)',
                              border: `var(--dim-stroke-100) solid ${invalid ? 'var(--text-input-require)' : 'var(--border-neutral-quaternary)'}`,
                              borderRadius: 'var(--dim-radius-200, 8px)',
                              paddingTop: 'var(--dim-space-200)',
                              paddingRight: 'var(--dim-space-300)',
                              paddingBottom: 'var(--dim-space-200)',
                              paddingLeft: 'var(--dim-space-300)',
                            }}
                          >
                            <span className='flex flex-col' style={{ flex: '1 1 220px', minWidth: 180 }}>
                              <span className='text-sm text-ink'>{r.thai}</span>
                              <span className='text-xs text-ink-tertiary'>{r.key} · {r.short}</span>
                            </span>
                            <div style={{ flex: '0 1 160px', minWidth: 130 }}>
                              <NumberField
                                label='เบิกได้'
                                suffix='บาท'
                                invalid={invalid}
                                error={invalid
                                  ? `${r.short}เบิกเกินราคา — เบิกได้ไม่เกิน ${(examForm.price ?? 0).toLocaleString('th-TH')} บาท`
                                  : undefined}
                                value={claim}
                                onChange={(v) => setExamForm((prev) => ({
                                  ...prev,
                                  claimByRight: { ...prev.claimByRight, [r.key]: v },
                                }))}
                              />
                            </div>
                            {/* Live ส่วนต่าง — a mis-keyed claim is obvious
                                the moment it is typed. */}
                            <span className='flex flex-col' style={{ flex: '0 1 180px', minWidth: 150, textAlign: 'right' }}>
                              <span className='text-xs text-ink-tertiary'>ผู้ป่วยจ่ายส่วนต่าง</span>
                              <span
                                className='text-sm font-bold'
                                style={{ color: invalid ? 'var(--text-input-require)' : 'var(--text-brandPrimary-default)' }}
                              >
                                {invalid
                                  ? 'เบิกเกินราคา!'
                                  : `${patientPay.toLocaleString('th-TH')} บาท`}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {claimErrors.length > 0 && (
                      <span role='alert' className='text-xs' style={{ color: 'var(--text-input-require)' }}>
                        ยอดเบิกของสิทธิ {claimErrors
                          .map((k) => `${k} (${XRAY_RIGHTS.find((r) => r.key === k)?.short ?? k})`)
                          .join(', ')} มากกว่าราคาค่าตรวจ — ปุ่มบันทึกจะเปิดให้กดเมื่อแก้ไขแล้ว
                      </span>
                    )}
                    {/* Every claim at 0 looks "finished" but means the
                        patient pays everything — call it out so an unset
                        price block can't masquerade as configured. */}
                    {claimErrors.length === 0 && allClaimsZero && (
                      <div
                        role='status'
                        className='flex items-start w-full'
                        style={{
                          gap: 'var(--dim-space-200)',
                          background: 'var(--surface-alert-warning, #FFF9F0)',
                          border: 'var(--dim-stroke-100) solid var(--border-alert-warning, #FFEDD5)',
                          borderRadius: 'var(--dim-radius-200, 8px)',
                          paddingTop: 'var(--dim-space-300)',
                          paddingRight: 'var(--dim-space-300)',
                          paddingBottom: 'var(--dim-space-300)',
                          paddingLeft: 'var(--dim-space-300)',
                        }}
                      >
                        <span aria-hidden className='inline-flex shrink-0' style={{ color: 'var(--text-alert-warning, #C2410C)' }}>
                          <Icon name='warning' size={16} />
                        </span>
                        <span className='text-xs' style={{ color: 'var(--text-alert-warning, #C2410C)' }}>
                          ผู้ป่วยจ่ายเต็มจำนวนทุกสิทธิ — ยังไม่มีสิทธิใดเบิกได้เลย
                          ถ้าตั้งใจให้เบิกได้ ให้กรอกยอดเบิกของแต่ละสิทธิก่อนบันทึก
                        </span>
                      </div>
                    )}
                  </SectionCard>

                  {/* ข้อมูลที่จำเป็นสำหรับการส่งตรวจ — TOR §1.12.5.5 */}
                  <SectionCard
                    icon='fact_check'
                    title='ข้อมูลที่จำเป็นสำหรับการส่งตรวจ'
                    subtitle='TOR 1.12.5.5 — หน้าส่งตรวจจะบังคับกรอกหัวข้อที่ติ๊กไว้ ก่อนยืนยันคำสั่งตรวจรายการนี้'
                  >
                    <div
                      role='group'
                      aria-label='ข้อมูลที่จำเป็นสำหรับการส่งตรวจ'
                      className='grid grid-cols-1 md:grid-cols-2 gap-2 w-full'
                    >
                      {ORDER_REQUIRED_FIELD_OPTIONS.map((o) => (
                        <ToggleRow
                          key={o.key}
                          label={o.thai}
                          checked={(examForm.requiredFields ?? []).includes(o.key)}
                          onChange={() => toggleInList('requiredFields', o.key)}
                        />
                      ))}
                    </div>
                  </SectionCard>

                  <section
                    className='bg-surface-card rounded-card shadow-card flex flex-wrap items-center w-full sticky bottom-0'
                    style={{
                      gap: 'var(--dim-space-300)',
                      paddingTop: 'var(--dim-space-500)',
                      paddingRight: 'var(--dim-space-500)',
                      paddingBottom: 'var(--dim-space-500)',
                      paddingLeft: 'var(--dim-space-500)',
                    }}
                  >
                    <span className='text-sm text-ink-secondary'>
                      {examForm.code || '(ยังไม่ระบุรหัส)'} · {examForm.name || '(ยังไม่ระบุชื่อ)'} ·
                      {' '}{XRAY_MODALITY_BY_KEY[examForm.modality]?.thai ?? examForm.modality}
                    </span>
                    <div className='flex-1' />
                    <NeutralSubdueButton variant='outline' size='md' onClick={() => guard(cancelExamEdit)}>
                      ยกเลิก
                    </NeutralSubdueButton>
                    <BrandButton
                      size='md'
                      leadingIcon='save'
                      disabled={!examFormValid}
                      title={examSaveBlocker ?? undefined}
                      onClick={handleSaveExam}
                    >
                      บันทึกรายการตรวจ
                    </BrandButton>
                  </section>
                </>
              )}
            </div>
          )}

          {/* ════ Tab 2 — Template ผลการตรวจ (TOR §1.12.6.1 + §1.12.6.7) ════ */}
          {tab === 'templates' && (
            <div
              role='tabpanel'
              aria-label='Template ผลการตรวจ'
              className='flex flex-col'
              style={{ gap: 'var(--dim-space-500)' }}
            >
              <SectionCard
                icon='description'
                title='Template ผลการตรวจ'
                subtitle={`${XRAY_TEMPLATES.length} Template ในระบบ · สร้างได้ไม่จำกัด และผูกกับแพทย์อ่านผลรายท่านได้ (TOR 1.12.6.1)`}
                action={
                  <BrandButton size='sm' leadingIcon='add' onClick={() => guard(startNewTpl)}>
                    เพิ่ม Template
                  </BrandButton>
                }
              >
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
                  {XRAY_MODALITIES
                    .filter((m) => XRAY_TEMPLATES.some((t) => t.modality === m.key))
                    .map((m) => (
                      <div key={m.key} className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                        <span className='inline-flex items-center text-xs font-bold text-ink-secondary' style={{ gap: 'var(--dim-space-150)' }}>
                          <Icon name={m.icon} size={14} style={{ color: 'var(--text-content-tertiary)' }} />
                          {m.thai} ({m.code})
                        </span>
                        {XRAY_TEMPLATES.filter((t) => t.modality === m.key).map((t) => {
                          const owner = t.radiologistId
                            ? XRAY_RADIOLOGIST_BY_ID[t.radiologistId]?.name ?? t.radiologistId
                            : 'ใช้ร่วมกัน (ทุกแพทย์)';
                          const rt = XRAY_RESULT_TYPES.find((x) => x.key === t.resultType);
                          const boundExams = (t.examIds ?? [])
                            .map((id) => XRAY_EXAMS.find((e) => e.id === id)?.name ?? id);
                          const selectedRow = editingTplId === t.id;
                          return (
                            <div
                              key={t.id}
                              className='flex flex-wrap items-center w-full'
                              style={{
                                gap: 'var(--dim-space-300)',
                                background: selectedRow ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-200)',
                                border: `var(--dim-stroke-100) solid ${selectedRow ? 'var(--border-brandPrimary-default)' : 'var(--border-neutral-quaternary)'}`,
                                borderRadius: 'var(--dim-radius-200, 8px)',
                                paddingTop: 'var(--dim-space-200)',
                                paddingRight: 'var(--dim-space-300)',
                                paddingBottom: 'var(--dim-space-200)',
                                paddingLeft: 'var(--dim-space-300)',
                              }}
                            >
                              <span className='flex flex-col' style={{ flex: '1 1 260px', minWidth: 200 }}>
                                <span className='text-sm font-bold text-ink'>{t.name}</span>
                                <span className='text-xs text-ink-tertiary truncate' title={boundExams.join(' · ')}>
                                  ผูกกับ {boundExams.length} รายการตรวจ{boundExams.length > 0 ? ` — ${boundExams.slice(0, 2).join(' · ')}${boundExams.length > 2 ? ' …' : ''}` : ''}
                                </span>
                              </span>
                              <span className='inline-flex items-center text-xs text-ink-secondary' style={{ gap: 'var(--dim-space-100)' }}>
                                <Icon name={t.radiologistId ? 'person' : 'group'} size={14} style={{ color: 'var(--text-content-tertiary)' }} />
                                {owner}
                              </span>
                              {rt && <Badge style={rt.color} size='small'>{rt.thai}</Badge>}
                              <div className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
                                <NeutralSubdueIconButton
                                  icon='edit'
                                  variant='outline'
                                  size='sm'
                                  aria-label={`แก้ไข ${t.name}`}
                                  title={`แก้ไข ${t.name}`}
                                  onClick={() => guard(() => startEditTpl(t))}
                                />
                                {/* Templates CAN be hard-deleted (unlike exams) —
                                    a template is a typing aid, not a medical
                                    record; the report text is already copied
                                    onto each saved order. */}
                                <NeutralSubdueIconButton
                                  icon='delete'
                                  variant='outline'
                                  size='sm'
                                  aria-label={`ลบ ${t.name}`}
                                  title={`ลบ ${t.name} (มีกล่องยืนยันก่อนลบจริง)`}
                                  onClick={() => setTplToDelete(t)}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                </div>
              </SectionCard>

              {/* ─── Template editor ─── */}
              {tplForm && (
                <>
                  <SectionCard
                    icon='edit_document'
                    title={editingTplId === 'new' ? 'เพิ่ม Template ใหม่' : `แก้ไข ${tplForm.name}`}
                    subtitle='TOR 1.12.6.1 — เว้นแพทย์อ่านผลว่างไว้ = ใช้ร่วมกันทุกท่าน · ระบุแพทย์ = เห็นเฉพาะท่านนั้น'
                  >
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-3 w-full'>
                      <TextField label='ชื่อ Template' required value={tplForm.name} onChange={(v) => setTplField('name', v)} placeholder='เช่น Chest PA — Normal study' />
                      <SelectField
                        label='ชนิดการตรวจ'
                        value={tplForm.modality}
                        onChange={(v) => setTplForm((prev) => ({ ...prev, modality: v, examIds: [] }))}
                        options={modalityOptions}
                      />
                      <SelectField
                        label='แพทย์อ่านผลที่ผูก'
                        value={tplForm.radiologistId ?? ''}
                        onChange={(v) => setTplField('radiologistId', v || null)}
                        options={[
                          { value: '', label: 'ใช้ร่วมกัน (ทุกแพทย์)' },
                          ...XRAY_RADIOLOGISTS.map((r) => ({ value: r.id, label: `${r.name} (${r.license})` })),
                        ]}
                      />
                    </div>
                    <MultiPick
                      label='รายการตรวจที่ผูก'
                      options={XRAY_EXAMS
                        .filter((e) => e.modality === tplForm.modality && !e.retired)
                        .map((e) => ({ value: e.id, label: e.name, sub: e.code }))}
                      values={tplForm.examIds}
                      onToggle={(v) => setTplForm((prev) => ({
                        ...prev,
                        examIds: prev.examIds.includes(v)
                          ? prev.examIds.filter((x) => x !== v)
                          : [...prev.examIds, v],
                      }))}
                      emptyText='ไม่มีรายการตรวจของชนิดนี้'
                      hint='หน้าบันทึกผลจะเสนอ Template นี้เฉพาะเมื่ออ่านผลรายการที่ติ๊กไว้'
                    />
                    <TextAreaField label='Technique' rows={2} value={tplForm.technique} onChange={(v) => setTplField('technique', v)} placeholder='เช่น PA upright chest radiograph.' />
                    <TextAreaField label='Findings' rows={5} value={tplForm.findings} onChange={(v) => setTplField('findings', v)} placeholder='ข้อความผลตรวจมาตรฐาน — แพทย์แก้ไขรายละเอียดได้ตอนบันทึกผลจริง' />
                    <TextAreaField label='Impression' rows={3} value={tplForm.impression} onChange={(v) => setTplField('impression', v)} placeholder='สรุปผลการอ่าน' />
                    <div style={{ maxWidth: 320 }}>
                      <SelectField
                        label='ประเภทผลเริ่มต้น'
                        value={tplForm.resultType}
                        onChange={(v) => setTplField('resultType', v)}
                        options={XRAY_RESULT_TYPES.map((r) => ({ value: r.key, label: r.thai }))}
                        hint='TOR 1.12.6.9 — ปกติ / ผิดปกติ / ผิดปกติเร่งด่วน / ไม่ชัดเจน'
                      />
                    </div>
                  </SectionCard>
                  <section
                    className='bg-surface-card rounded-card shadow-card flex flex-wrap items-center w-full sticky bottom-0'
                    style={{
                      gap: 'var(--dim-space-300)',
                      paddingTop: 'var(--dim-space-500)',
                      paddingRight: 'var(--dim-space-500)',
                      paddingBottom: 'var(--dim-space-500)',
                      paddingLeft: 'var(--dim-space-500)',
                    }}
                  >
                    <span className='text-sm text-ink-secondary'>
                      {tplForm.name || '(ยังไม่ระบุชื่อ)'} · ผูก {tplForm.examIds.length} รายการตรวจ
                    </span>
                    <div className='flex-1' />
                    <NeutralSubdueButton variant='outline' size='md' onClick={() => guard(cancelTplEdit)}>
                      ยกเลิก
                    </NeutralSubdueButton>
                    <BrandButton
                      size='md'
                      leadingIcon='save'
                      disabled={!tplForm.name}
                      title={!tplForm.name ? 'กรอกชื่อ Template ก่อนบันทึก' : undefined}
                      onClick={handleSaveTpl}
                    >
                      บันทึก Template
                    </BrandButton>
                  </section>
                </>
              )}
            </div>
          )}

          {/* ════ Tab 3 — คำช่วย / ชุดคำช่วย (TOR §1.12.6.6) ════ */}
          {tab === 'phrases' && (
            <div
              role='tabpanel'
              aria-label='คำช่วย / ชุดคำช่วย'
              className='flex flex-col'
              style={{ gap: 'var(--dim-space-500)' }}
            >
              {/* คำช่วย — the result-entry screen inserts the chosen phrase at
                  the CURSOR position inside Findings/Impression (legacy §2.3
                  items 6–7: the typist's Look-up while keying a dictation). */}
              <SectionCard
                icon='text_snippet'
                title='คำช่วย (Standard phrases)'
                subtitle='TOR 1.12.6.6 — ข้อความสำเร็จรูปที่หน้าบันทึกผลแทรก ณ ตำแหน่งเคอร์เซอร์'
                action={
                  <BrandButton size='sm' leadingIcon='add' onClick={() => setPhraseForm(blankPhrase())}>
                    เพิ่มคำช่วย
                  </BrandButton>
                }
              >
                <div style={{ maxWidth: 260 }}>
                  <SelectField
                    label='แสดงเฉพาะกลุ่ม'
                    value={phraseGroupFilter}
                    onChange={setPhraseGroupFilter}
                    options={[
                      { value: 'all', label: 'ทุกกลุ่ม' },
                      ...PHRASE_GROUPS.map((g) => ({ value: g.key, label: g.thai })),
                    ]}
                  />
                </div>
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
                  {PHRASE_GROUPS
                    .filter((g) => phraseGroupFilter === 'all' || g.key === phraseGroupFilter)
                    .map((g) => {
                      const phrases = XRAY_PHRASES.filter((p) => p.group === g.key);
                      return (
                        <div key={g.key} className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                          <span className='text-xs font-bold text-ink-secondary'>
                            {g.thai} ({phrases.length})
                          </span>
                          {phrases.map((p) => {
                            /* ชุดคำช่วย membership — display-only (no phrase-SET
                               writer in the store yet) but at least legible per
                               phrase instead of buried in the set cards below. */
                            const memberSets = XRAY_PHRASE_SETS.filter((s) => s.phraseIds.includes(p.id));
                            return (
                              <div
                                key={p.id}
                                className='flex items-center w-full'
                                style={{
                                  gap: 'var(--dim-space-300)',
                                  background: 'var(--surface-card-200)',
                                  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                                  borderRadius: 'var(--dim-radius-200, 8px)',
                                  paddingTop: 'var(--dim-space-150)',
                                  paddingRight: 'var(--dim-space-300)',
                                  paddingBottom: 'var(--dim-space-150)',
                                  paddingLeft: 'var(--dim-space-300)',
                                }}
                              >
                                <span className='flex flex-col flex-1 min-w-0'>
                                  <span className='text-sm text-ink'>{p.text}</span>
                                  <span className='text-xs text-ink-tertiary'>
                                    {memberSets.length > 0
                                      ? `อยู่ในชุดคำช่วย: ${memberSets.map((s) => s.name).join(' · ')}`
                                      : 'ไม่ได้อยู่ในชุดคำช่วยใด'}
                                  </span>
                                </span>
                                <NeutralSubdueIconButton
                                  icon='edit'
                                  variant='outline'
                                  size='sm'
                                  aria-label={`แก้ไขคำช่วย ${p.text}`}
                                  title={`แก้ไขคำช่วย ${p.text}`}
                                  onClick={() => setPhraseForm({ ...p })}
                                />
                              </div>
                            );
                          })}
                          {phrases.length === 0 && (
                            <span className='text-xs text-ink-tertiary'>ยังไม่มีคำช่วยในกลุ่มนี้</span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </SectionCard>

              {phraseForm && (
                <SectionCard
                  icon='edit'
                  title={phraseForm.id ? 'แก้ไขคำช่วย' : 'เพิ่มคำช่วยใหม่'}
                >
                  <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-300)' }}>
                    <div style={{ flex: '0 1 220px', minWidth: 170 }}>
                      <SelectField
                        label='กลุ่ม'
                        value={phraseForm.group}
                        onChange={(v) => setPhraseField('group', v)}
                        options={PHRASE_GROUPS.map((g) => ({ value: g.key, label: g.thai }))}
                      />
                    </div>
                    <div style={{ flex: '1 1 320px', minWidth: 240 }}>
                      <TextField
                        label='ข้อความ'
                        required
                        value={phraseForm.text}
                        onChange={(v) => setPhraseField('text', v)}
                        placeholder='เช่น The lungs are clear.'
                      />
                    </div>
                    <div className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                      <NeutralSubdueButton variant='outline' size='md' onClick={() => setPhraseForm(null)}>
                        ยกเลิก
                      </NeutralSubdueButton>
                      <BrandButton size='md' leadingIcon='save' disabled={!phraseForm.text} onClick={handleSavePhrase}>
                        บันทึกคำช่วย
                      </BrandButton>
                    </div>
                  </div>
                </SectionCard>
              )}

              {/* ชุดคำช่วย — a named bundle inserted in one click (the whole
                  "normal paragraph" macro). Membership is display-only here:
                  the template store exposes upsertPhrase but no phrase-SET
                  writer yet — flagged for the data-layer owner. */}
              <SectionCard
                icon='library_books'
                title='ชุดคำช่วย (Phrase sets)'
                subtitle='แทรกทั้งชุดในคลิกเดียว — สมาชิกของชุดแก้ไขได้เมื่อ store รองรับ (ปัจจุบันแสดงอย่างเดียว)'
              >
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3 w-full'>
                  {XRAY_PHRASE_SETS.map((s) => (
                    <div
                      key={s.id}
                      className='flex flex-col'
                      style={{
                        gap: 'var(--dim-space-200)',
                        background: 'var(--surface-card-200)',
                        border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                        borderRadius: 'var(--dim-radius-300, 10px)',
                        paddingTop: 'var(--dim-space-300)',
                        paddingRight: 'var(--dim-space-400)',
                        paddingBottom: 'var(--dim-space-300)',
                        paddingLeft: 'var(--dim-space-400)',
                      }}
                    >
                      <span className='text-sm font-bold text-ink'>
                        {s.name} <span className='text-xs text-ink-tertiary font-normal'>· {s.phraseIds.length} คำช่วย</span>
                      </span>
                      <ul className='flex flex-col' style={{ gap: 'var(--dim-space-100)', margin: 0, paddingLeft: 'var(--dim-space-400)' }}>
                        {s.phraseIds.map((pid) => {
                          const phrase = XRAY_PHRASES.find((p) => p.id === pid);
                          return (
                            <li key={pid} className='text-xs text-ink-secondary'>
                              {phrase?.text ?? pid}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {/* ════ Tab 4 — ผู้ให้บริการ / แพทย์อ่านผล X-ray ════ */}
          {tab === 'staff' && (
            <div
              role='tabpanel'
              aria-label='ผู้ให้บริการ / แพทย์อ่านผล'
              className='flex flex-col'
              style={{ gap: 'var(--dim-space-500)' }}
            >
              <TransferBoard
                icon='badge'
                title='กำหนดผู้ให้บริการ (ผู้ถ่ายภาพรังสี)'
                subtitle='คู่มือ MyHOSPITAL "กำหนดผู้ให้บริการ" — ติ๊กเลือกรายชื่อแล้วกด ◀ เพิ่มเข้าแผนก / ▶ นำออก'
                universe={XRAY_RADIOGRAPHERS}
                initialAssignedIds={[XRAY_RADIOGRAPHERS[0]?.id, XRAY_RADIOGRAPHERS[1]?.id].filter(Boolean)}
                metaOf={(p) => (p.name.includes('เจ้าพนักงาน') ? 'เจ้าพนักงานรังสีการแพทย์' : 'นักรังสีการแพทย์')}
                typeOf={(p) => (p.name.includes('เจ้าพนักงาน') ? 'officer' : 'tech')}
                typeFilterOptions={[
                  { value: 'tech', label: 'นักรังสีการแพทย์' },
                  { value: 'officer', label: 'เจ้าพนักงานรังสีการแพทย์' },
                ]}
              />
              <TransferBoard
                icon='clinical_notes'
                title='กำหนดแพทย์อ่านผล X-ray'
                subtitle='คู่มือ MyHOSPITAL "กำหนดแพทย์อ่านผล X-ray" — รายชื่อแสดงเลขใบอนุญาตและชนิดการตรวจที่อ่านได้'
                universe={XRAY_RADIOLOGISTS}
                initialAssignedIds={[XRAY_RADIOLOGISTS[0]?.id, XRAY_RADIOLOGISTS[1]?.id].filter(Boolean)}
                metaOf={(p) => `เลขที่ใบอนุญาต ${p.license} · อ่าน ${(p.modalities ?? [])
                  .map((m) => XRAY_MODALITY_BY_KEY[m]?.code ?? m).join(', ')}`}
              />
              <span className='text-xs text-ink-tertiary'>
                การกำหนดเจ้าหน้าที่ในหน้านี้เป็นข้อมูลระดับหน่วยบริการ (ศบส.) — ระบบจริงบันทึกแยกตามศูนย์ฯ ที่ล็อกอินอยู่
              </span>
            </div>
          )}
        </div>
      </main>

      <SuccessToast
        open={toast.open}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />

      {/* Hard-delete confirm — templates only (exams are retired, never
          deleted). Confirm button carries the actual verb, not ตกลง. */}
      <AlertDialog
        open={!!tplToDelete}
        type='destructive'
        title='ลบ Template ผลการตรวจ'
        description={tplToDelete ? `ลบ "${tplToDelete.name}" ออกจากระบบ? Template ที่ลบแล้วไม่สามารถกู้คืนได้ แต่ผลตรวจที่เคยบันทึกด้วย Template นี้ยังอยู่ครบ` : ''}
        confirmLabel='ลบ Template'
        cancelLabel='ยกเลิก'
        onConfirm={handleDeleteTpl}
        onClose={() => setTplToDelete(null)}
      />

      {/* Unsaved-changes guard — parked action runs only after an explicit
          "ออกโดยไม่บันทึก"; Esc / backdrop / แก้ไขต่อ stay in the editor. */}
      <AlertDialog
        open={!!pendingAction}
        type='warning'
        title='ยังไม่ได้บันทึกการแก้ไข'
        description={`${examDirty ? 'รายการตรวจ' : 'Template'}ที่กำลังแก้ไขมีข้อมูลที่ยังไม่ได้บันทึก ถ้าออกจากหน้าจอแก้ไขตอนนี้ การแก้ไขจะหายไป`}
        confirmLabel='ออกโดยไม่บันทึก'
        cancelLabel='แก้ไขต่อ'
        onConfirm={confirmDiscard}
        onClose={() => setPendingAction(null)}
      />
    </div>
  );
};

export default XraySetupPage;
