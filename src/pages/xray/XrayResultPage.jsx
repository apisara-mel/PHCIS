import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Icon from '@/components/icons/Icon';
import StatusBadge from '@/components/badge/StatusBadge';
import Alert from '@/components/alert/Alert';
import AlertDialog from '@/components/popup/AlertDialog';
import SuccessToast from '@/components/toast/SuccessToast';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerButton from '@/components/button/DangerButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import {
  XRAY_ORDERS, XRAY_STATUS_BY_KEY, XRAY_EXCEPTION_BY_KEY,
  XRAY_RESULT_TYPES, XRAY_RESULT_TYPE_BY_KEY,
  withExamLabel, xrayHistoryFor,
} from '@/data/xrayOrders';
import {
  XRAY_RADIOLOGISTS, XRAY_RADIOLOGIST_BY_ID,
  XRAY_RADIOGRAPHERS, XRAY_RADIOGRAPHER_BY_ID,
  XRAY_PHRASES, XRAY_PHRASE_BY_ID, XRAY_PHRASE_SETS,
  templatesFor, subscribeTemplates, upsertTemplate, upsertPhrase,
} from '@/data/xrayResultTemplates';
import { XRAY_MODALITIES, XRAY_EXAM_BY_ID } from '@/data/xrayCatalog';
import XrayReportSheet from '@/components/xray/XrayReportSheet';

/* บันทึกผล + ยืนยันผลการตรวจทางรังสีวิทยา — the reading room's working
   screen of the RIS module (TOR ภาคผนวก ก §1.12.6 บันทึกอ่านผลตรวจทาง
   รังสีวิทยา).

   Layout mirrors the legacy screen the ศบส. staff already know (คู่มืออบรม
   ระบบงานรังสีวินิจฉัย §2.3 บันทึกผลการตรวจรังสี): a worklist of patients
   waiting for a read on the LEFT, and the report editor for the selected
   study on the RIGHT — the same "ตารางด้านซ้ายเป็นรายการ … ส่วนของรายการ
   ตรวจจะไปปรากฏหน้าจอทางด้านขวา" shape, and the MyHOSPITAL บันทึกผล /
   ยืนยันผล X-Ray screens (คู่มือ X-Ray pp.7–8) share it too.

   TOR §1.12.6.x coverage map (each cited again inline where implemented):
     .1  Template ผลมาตรฐาน ผูกกับแพทย์อ่านผลรายคนได้   → template picker
     .2  ค้นหารายชื่อผู้รับบริการที่ได้รับการเอกซเรย์     → left-pane search
     .3  ป้องกันแพทย์ท่านอื่นแก้ผล + ประวัติการแก้ไข     → lockedBy guard
     .4  ดูผลเอกซเรย์ย้อนหลัง                          → history panel
     .5  พิมพ์ใบผลเอกซเรย์                             → print-preview modal
     .6  สร้างตัวช่วยข้อความ (คำช่วย/ชุดคำช่วย)          → phrase chips + save
     .7  Template ตามที่สำนักอนามัยกำหนด                → shared templates
     .8  ค้นหาผลตามชนิด/ประเภทผล/คำในผล                → worklist filters
     .9  ประเภทผลตรวจ ปกติ/ผิดปกติ/ผิดปกติเร่งด่วน/ไม่ชัดเจน → radio row

   Data comes from the module's mock tier (`xrayOrders` / `xrayCatalog` /
   `xrayResultTemplates`). All mutations act on a useState COPY of
   XRAY_ORDERS — the imported array is never written back, same rule as
   every other mock-backed screen. */

/* ─────────────────────────────────────────────────────────────────────────
   Injected stylesheet — idempotent module-load pattern (canonical example:
   AISearch.jsx). Two jobs:

   1. "No browser-default input chrome" (CLAUDE.md): the report editor's
      native <textarea>s live inside DS wrappers that own the border, so
      the inner control must be stripped of every UA form chrome with
      `!important` (inline style alone loses to Tailwind preflight / UA
      styles on some browsers). Scoped via the `.mih-xrayresult-report`
      wrapper class around the editor fields.
      ★ Unlike the design-system search bars, the CARET STAYS VISIBLE
        (`caret-color` aliases --brand-p600): this screen is a long-form
        report editor — the radiologist/typist needs to see exactly where
        the next phrase will land, especially when inserting คำช่วย
        at-cursor. Hiding it here would make the editor feel dead.

   2. Print scoping for ใบผลการตรวจทางรังสีวิทยา (§1.12.6.5) — same
      @media print visibility trick as the lab result print, so hitting
      พิมพ์ inside the preview only prints the report sheet, never the
      app chrome. */
if (typeof document !== 'undefined') {
  const styleId = 'mih-xrayresult-style';
  const css = `
.mih-xrayresult-report textarea,
.mih-xrayresult-report textarea:focus,
.mih-xrayresult-report textarea:focus-visible {
  caret-color: var(--brand-p600, #08A768) !important; /* report editor keeps the blinking caret — see header comment */
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-xrayresult-report textarea::placeholder {
  color: var(--text-primarysearch-default, #ADB2B7);
  opacity: 1; /* Firefox defaults ::placeholder to 0.54 */
}
@media print {
  body * { visibility: hidden !important; }
  .mih-xrayresult-print-area, .mih-xrayresult-print-area * { visibility: visible !important; }
  .mih-xrayresult-print-area { position: fixed; inset: 0; overflow: visible; background: var(--surface-card-100, #FFFFFF); }
  .mih-xrayresult-print-area .no-print { display: none !important; }
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

const breadcrumb = ['งานรังสีวินิจฉัย (X-ray)', 'บันทึกผลการตรวจทางรังสีวิทยา'];

/* Worklist scope — this screen owns the tail of the pipeline: ถ่ายแล้ว
   (รอบันทึกผล) → บันทึกผลแล้ว (รอยืนยัน) → ยืนยันผลแล้ว. Earlier stages
   belong to the queue/worklist screens. A row carrying the
   `reportCancelled` exception sits at `performed` again (the data layer's
   re-entry rule) so it shows up here for re-reporting automatically. */
const WORKLIST_STATUSES = ['performed', 'reported', 'verified'];

const STATUS_FILTER_OPTIONS = [
  { value: 'all',       label: 'ทุกสถานะ' },
  { value: 'performed', label: 'รอบันทึกผล' },
  { value: 'reported',  label: 'รอยืนยันผล' },
  { value: 'verified',  label: 'ยืนยันผลแล้ว' },
];

const PHRASE_GROUPS = [
  { key: 'chest',   label: 'ทรวงอก' },
  { key: 'bone',    label: 'กระดูกและข้อ' },
  { key: 'us',      label: 'อัลตราซาวด์' },
  { key: 'general', label: 'ทั่วไป' },
];

/* Result-type glyphs + one-line meaning — §1.12.6.9. `abnormalUrgent` is
   deliberately the loudest card of the four: TOR pairs it with the duty to
   reach the ordering clinician NOW (active TB, fresh fracture), so it gets
   the emergency glyph and an explicit "ระบบจะแจ้งเตือนแพทย์ทันที" subline. */
const RESULT_TYPE_META = {
  normal:         { icon: 'check_circle',   sub: 'ไม่พบความผิดปกติ' },
  abnormal:       { icon: 'error',          sub: 'พบความผิดปกติ ไม่เร่งด่วน' },
  abnormalUrgent: { icon: 'emergency_home', sub: 'ระบบจะแจ้งเตือนแพทย์ผู้ส่งตรวจทันที' },
  inconclusive:   { icon: 'help',           sub: 'ภาพไม่ชัดเจน / สรุปไม่ได้' },
};

/* คำช่วย suggestions for the autocomplete popover — every clinician-typed
   field on this screen ships with `suggestions` + `minChars` (house rule:
   no bare voice textarea). The phrase texts double as the §1.12.6.6
   ตัวช่วยข้อความ, so typing "lungs…" surfaces the same stock sentences the
   chips insert. Recomputed when the phrase store notifies (see
   `tplVersion`). */
const phraseSuggestionTexts = () => XRAY_PHRASES.map((p) => p.text);

const CANCEL_REASON_SUGGESTIONS = [
  'ผลถูกบันทึกสลับกับผู้ป่วยรายอื่น',
  'เลือกรายการตรวจไม่ถูกต้อง',
  'ภาพถ่ายไม่ได้คุณภาพ ต้องถ่ายซ้ำ',
  'รายงานผลไม่ครบถ้วน ต้องบันทึกใหม่',
];

const AMEND_REASON_SUGGESTIONS = [
  'แก้ไขคำอ่านหลังเปรียบเทียบกับภาพเดิม',
  'แก้ไขตัวเลข/ค่าที่พิมพ์ผิด',
  'เพิ่มคำแนะนำการตรวจติดตาม',
];

/* Mock clock — the order rows keep plain HH:MM strings (no Date.now in the
   data layer), so stamps written by this screen use the same format. */
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const thaiToday = () => {
  const d = new Date();
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

/* ─────────────────────────────────────────────────────────────────────────
   Local UI helpers — same visual language as the Lab module's pages so the
   two diagnostic departments read as one product. */

const SectionCard = ({ icon, title, subtitle, children, action, tone }) => (
  <section
    className='bg-surface-card rounded-card shadow-card flex flex-col w-full'
    style={{
      paddingTop: 'var(--dim-space-500)',
      paddingRight: 'var(--dim-space-500)',
      paddingBottom: 'var(--dim-space-500)',
      paddingLeft: 'var(--dim-space-500)',
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
          background: tone === 'danger' ? 'var(--surface-statusbadge-error)' : 'var(--surface-brandPrimary-quaternary)',
          color: tone === 'danger' ? 'var(--text-statusbadge-error)' : 'var(--text-brandPrimary-default)',
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

/* `id` pairs the visible label with the control (htmlFor + implicit
   wrapping); `ariaLabel` names label-less instances (WCAG 4.1.2). */
const SelectField = ({ label, value, onChange, options, required, disabled, id, ariaLabel }) => (
  <label className='flex flex-col flex-1 min-w-0' htmlFor={id} style={{ gap: 'var(--dim-space-150)' }}>
    {label && (
      <span className='text-xs text-ink-secondary'>
        {label} {required && <span style={{ color: 'var(--text-input-require)' }}>*</span>}
      </span>
    )}
    <select
      id={id}
      aria-label={label ? undefined : ariaLabel}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: '100%',
        paddingTop: 'var(--dim-space-150)',
        paddingRight: 'var(--dim-space-300)',
        paddingBottom: 'var(--dim-space-150)',
        paddingLeft: 'var(--dim-space-300)',
        background: disabled ? 'var(--surface-card-200)' : 'var(--surface-input-default)',
        border: 'var(--dim-stroke-100) solid var(--border-input-default)',
        borderRadius: 'var(--dim-radius-200)',
        fontSize: 'var(--type-size-sm)',
        fontFamily: 'var(--type-family-body)',
        color: 'var(--text-content-default)',
        outline: 'none',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </label>
);

/* Read-only labelled value — the patient/order header grid. */
const InfoItem = ({ label, children, span }) => (
  <div className={`flex flex-col min-w-0 ${span ? 'col-span-2 md:col-span-3' : ''}`} style={{ gap: 'var(--dim-space-100)' }}>
    <span className='text-xs text-ink-tertiary'>{label}</span>
    <span className='text-sm text-ink' style={{ overflowWrap: 'anywhere' }}>{children ?? '—'}</span>
  </div>
);

/* MiniDialog — compact local modal for the flows AlertDialog can't hold
   (AlertDialog has no children slot): เหตุผลการยกเลิก/แก้ไข, save-template,
   save-phrase, and the print preview. Same overlay + card chrome tokens as
   AlertDialog, kept local per the "no shared helper files" rule. */
const MiniDialog = ({ open, icon, iconColor, title, subtitle, width = 520, children, footer, onClose }) => {
  const cardRef = useRef(null);
  const openerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /* Keyboard reachability (WCAG 2.4.3 / 2.1.1): on open, remember the
     opener and move focus INTO the dialog card; on close, hand focus back
     to the opener so the keyboard user isn't dropped at <body>. Esc is
     handled above; React 17 — no useId, so the title id is static (only
     one MiniDialog is ever open at a time on this page). */
  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;
    const t = setTimeout(() => { cardRef.current?.focus(); }, 0);
    return () => {
      clearTimeout(t);
      const el = openerRef.current;
      openerRef.current = null;
      if (el && typeof el.focus === 'function') setTimeout(() => el.focus(), 0);
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      role='presentation'
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--sm-z-modal, 1400)',
        background: 'var(--surface-overlay-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 'var(--dim-space-600, 24px)',
        paddingRight: 'var(--dim-space-600, 24px)',
        paddingBottom: 'var(--dim-space-600, 24px)',
        paddingLeft: 'var(--dim-space-600, 24px)',
      }}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        role='dialog'
        aria-modal='true'
        aria-labelledby='mih-xrayresult-minidialog-title'
        className='flex flex-col'
        style={{
          outline: 'none',
          width: `min(${width}px, calc(100vw - 2 * var(--dim-space-600, 24px)))`,
          maxHeight: 'calc(100vh - 2 * var(--dim-space-600, 24px))',
          background: 'var(--surface-alertdialog-default)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-alertdialog-default)',
          borderRadius: 'var(--dim-radius-500, 16px)',
          boxShadow: 'var(--shadow-drop-bottom-400)',
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-400)',
          fontFamily: 'var(--type-family-body)',
          overflowY: 'auto',
        }}
      >
        <div className='flex items-start' style={{ gap: 'var(--dim-space-300)' }}>
          {icon && <Icon name={icon} size={24} style={{ color: iconColor ?? 'var(--text-brandPrimary-default)' }} />}
          <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
            <h3 id='mih-xrayresult-minidialog-title' className='text-base font-bold text-ink'>{title}</h3>
            {subtitle && <p className='text-xs text-ink-tertiary'>{subtitle}</p>}
          </div>
        </div>
        {children}
        {footer && (
          <div className='flex items-center justify-end flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/* Plain tokenised text input for non-clinical strings (template/phrase
   names). Owns its border directly — same idiom as the Lab pages' inputs. */
const TextInput = ({ value, onChange, placeholder, label, required, id }) => (
  <label className='flex flex-col w-full' htmlFor={id} style={{ gap: 'var(--dim-space-150)' }}>
    {label && (
      <span className='text-xs text-ink-secondary'>
        {label} {required && <span style={{ color: 'var(--text-input-require)' }}>*</span>}
      </span>
    )}
    <input
      id={id}
      type='text'
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        paddingTop: 'var(--dim-space-150)',
        paddingRight: 'var(--dim-space-300)',
        paddingBottom: 'var(--dim-space-150)',
        paddingLeft: 'var(--dim-space-300)',
        background: 'var(--surface-input-default)',
        border: 'var(--dim-stroke-100) solid var(--border-input-default)',
        borderRadius: 'var(--dim-radius-200)',
        fontSize: 'var(--type-size-sm)',
        fontFamily: 'var(--type-family-body)',
        color: 'var(--text-content-default)',
        outline: 'none',
      }}
    />
  </label>
);

/* ─────────────────────────────────────────────────────────────────────────
   Page component */
const XrayResultPage = () => {
  /* react-router v5 on this branch — location.search is read directly for
     the ?xn / ?mode deep link; no v6 APIs (useNavigate/useSearchParams). */
  const location = useLocation();

  /* Working copy — mutations stay in component state; the imported
     XRAY_ORDERS array is never written back. */
  const [rows, setRows] = useState(() => XRAY_ORDERS.map((o) => ({ ...o })));
  const [selectedId, setSelectedId] = useState(null);

  /* ผู้ใช้งานปัจจุบัน (แพทย์อ่านผล) — stand-in for the logged-in user.
     §1.12.6.3 keys the edit lock on the doctor's CODE, so the demo needs a
     way to "be" different doctors; in production this comes from the auth
     session, not a select. */
  const [currentUserId, setCurrentUserId] = useState(XRAY_RADIOLOGISTS[0].id);
  const currentUser = XRAY_RADIOLOGIST_BY_ID[currentUserId];

  /* Left-pane filters — §1.12.6.2 (ค้นหารายชื่อผู้รับบริการที่ได้รับการ
     เอกซเรย์) + §1.12.6.8 (จำแนกตามชนิดการตรวจ / สถานะ). */
  const [q, setQ] = useState('');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  /* ช่วงวันที่ส่งตรวจ — the legacy screen's first filter (§2.3 item 2
     "ใส่วันที่ส่งตรวจแล้วค้นหา"). The mock rows all carry today's times
     only, so the range is kept as a working control but doesn't subset the
     data; a real backend would push it into the query. */
  const todayISO = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(todayISO);
  const [dateTo, setDateTo] = useState(todayISO);

  /* Editor draft — seeded from the selected row; nothing touches `rows`
     until an action button commits. */
  const [draft, setDraft] = useState({
    technique: '', findings: '', impression: '', resultType: null,
    radiographerId: XRAY_RADIOGRAPHERS[0].id, radiologistId: null,
  });

  /* Template/phrase store subscription — module-level mutable store, so we
     re-render by bumping a version counter (React 17: useSyncExternalStore
     does NOT exist; this mirrors how LabSetupPage subscribes). */
  const [tplVersion, setTplVersion] = useState(0);
  useEffect(() => subscribeTemplates(() => setTplVersion((v) => v + 1)), []);

  /* Which editor field the caret last sat in — คำช่วย chips insert there. */
  const [activeField, setActiveField] = useState('findings');
  const techniqueWrapRef = useRef(null);
  const findingsWrapRef = useRef(null);
  const impressionWrapRef = useRef(null);
  const fieldWrapRefs = { technique: techniqueWrapRef, findings: findingsWrapRef, impression: impressionWrapRef };

  /* ประเภทผลตรวจ as a real radiogroup — roving tabindex + arrow keys
     (WCAG 2.1.1 / 4.1.2: button-as-radio rows must be announced and
     keyboard-operable like native radios). */
  const resultTypeGroupRef = useRef(null);
  const onResultTypeKey = (e) => {
    const keys = XRAY_RESULT_TYPES.map((t) => t.key);
    let delta = 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') delta = 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') delta = -1;
    if (!delta) return;
    e.preventDefault();
    const idx = Math.max(0, keys.indexOf(draft.resultType));
    const next = keys[(idx + delta + keys.length) % keys.length];
    setDraft((d) => ({ ...d, resultType: next }));
    requestAnimationFrame(() => {
      resultTypeGroupRef.current?.querySelector(`[data-rtkey="${next}"]`)?.focus();
    });
  };

  /* Dialog + toast state */
  const [confirmUrgentOpen, setConfirmUrgentOpen] = useState(false);
  const [confirmVerifyOpen, setConfirmVerifyOpen] = useState(false);
  const [cancelDialog, setCancelDialog] = useState({ open: false, reason: '' });
  const [amendDialog, setAmendDialog] = useState({ open: false, reason: '' });
  const [tplDialog, setTplDialog] = useState({ open: false, name: '', bindToMe: true });
  const [phraseDialog, setPhraseDialog] = useState({ open: false, text: '' });
  const [printOpen, setPrintOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState({});
  const [toast, setToast] = useState({ open: false, message: '' });
  const notify = (message) => setToast({ open: true, message });

  /* ── Batch reading + dirty-draft guard state ─────────────────────────
     · navConfirm     — "ยังไม่ได้บันทึกผลของ …" 3-way dialog opened when
                        the reader tries to leave a dirty draft.
     · navAfterCommitRef — row id to jump to after the next successful
                        commit ('DONE' = end of the filtered list). Set by
                        บันทึก/ยืนยัน-และไปรายการถัดไป and by the guard's
                        "บันทึกก่อนไป"; consumed once by finishNav().
     · batchDone      — the reader just committed the last row of the
                        filtered list → say so instead of a blank editor.
     · tplConfirm     — "แทนที่ข้อความเดิม?" gate before a template
                        overwrites non-empty report text. */
  const [navConfirm, setNavConfirm] = useState({ open: false, targetId: null });
  const navAfterCommitRef = useRef(null);
  const [batchDone, setBatchDone] = useState(false);
  const [tplConfirm, setTplConfirm] = useState({ open: false, tpl: null });

  const selectedRaw = rows.find((r) => r.id === selectedId) ?? null;
  const row = selectedRaw ? withExamLabel(selectedRaw) : null;

  /* Deep link — the worklist navigates here as
     `/xray/result?xn=X69-0418&mode=verify` (react-router v5: read
     location.search directly; no v6 useSearchParams on this branch). */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const xn = params.get('xn');
    const mode = params.get('mode');
    if (mode === 'verify') setStatusFilter('reported');
    if (xn) {
      const candidates = rows.filter((r) => r.xn === xn && WORKLIST_STATUSES.includes(r.status));
      /* verify mode prefers the row that is actually waiting for ยืนยันผล */
      const match = (mode === 'verify' && candidates.find((r) => r.status === 'reported')) || candidates[0];
      if (match) setSelectedId(match.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); /* mount only — the URL is the entry ticket, not live state */

  /* Seed the draft whenever the selection changes. `lockedBy` (an ID) wins
     over the display-name lookup because it is the authoritative owner key
     (§1.12.6.3); names are display-only. */
  useEffect(() => {
    if (!selectedRaw) return;
    const eligible = XRAY_RADIOLOGISTS.filter((r) => r.modalities.includes(selectedRaw.modality));
    const idByName = XRAY_RADIOLOGISTS.find((r) => r.name === selectedRaw.radiologist)?.id ?? null;
    const techId = XRAY_RADIOGRAPHERS.find((r) => r.name === selectedRaw.radiographer)?.id
      ?? XRAY_RADIOGRAPHERS[0].id;
    setDraft({
      technique: selectedRaw.technique || '',
      findings: selectedRaw.findings || '',
      impression: selectedRaw.impression || '',
      resultType: selectedRaw.resultType ?? null,
      radiographerId: techId,
      radiologistId: selectedRaw.lockedBy
        ?? idByName
        ?? (eligible.some((r) => r.id === currentUserId) ? currentUserId : (eligible[0]?.id ?? null)),
    });
    setActiveField('findings');
    setHistoryOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  /* ── Worklist rows ──────────────────────────────────────────────────── */
  const worklist = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const stageRank = { performed: 0, reported: 1, verified: 2 };
    return rows
      .filter((r) => WORKLIST_STATUSES.includes(r.status))
      .map(withExamLabel)
      .filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter))
      .filter((r) => (modalityFilter === 'all' ? true : r.modality === modalityFilter))
      .filter((r) => !qq
        || r.hn.toLowerCase().includes(qq)
        || r.xn.toLowerCase().includes(qq)
        || r.patient?.shortName?.toLowerCase().includes(qq)
        || r.patient?.fullName?.toLowerCase().includes(qq))
      /* STAT ต้องเด้งขึ้นบนสุด (สีแดง) — then work-to-do before finished
         studies, then arrival order. */
      .sort((a, b) => (a.urgencyRank - b.urgencyRank)
        || (stageRank[a.status] - stageRank[b.status])
        || a.orderedAt.localeCompare(b.orderedAt));
  }, [rows, q, statusFilter, modalityFilter]);

  /* ── §1.12.6.3 lock guard — the requirement this screen exists to get
        right. `lockedBy` carries the radiologist ID that owns the report:
        · lockedBy set + ≠ current doctor → READ-ONLY, explicit banner.
        · lockedBy === current doctor     → editing allowed, but committing
          a change to a verified report demands เหตุผลการแก้ไข and appends
          to `amendments` (เก็บประวัติการแก้ไขผล). */
  const lockedByOther = Boolean(selectedRaw?.lockedBy && selectedRaw.lockedBy !== currentUserId);
  const lockingDoctor = lockedByOther ? XRAY_RADIOLOGIST_BY_ID[selectedRaw.lockedBy] : null;
  const isOwner = Boolean(selectedRaw?.lockedBy && selectedRaw.lockedBy === currentUserId);
  const editable = Boolean(selectedRaw) && !lockedByOther;

  const dirty = Boolean(selectedRaw) && (
    draft.technique !== (selectedRaw.technique || '')
    || draft.findings !== (selectedRaw.findings || '')
    || draft.impression !== (selectedRaw.impression || '')
    || draft.resultType !== (selectedRaw.resultType ?? null)
  );

  /* ── Batch reading flow — the radiologist clears the whole filtered
        list in one sitting and should never detour back to the list
        between studies (Nielsen #1: show where you are + what's left). */
  const selectedIndex = worklist.findIndex((r) => r.id === selectedId);
  const prevRow = selectedIndex > 0 ? worklist[selectedIndex - 1] : null;
  const nextRow = selectedIndex >= 0 ? (worklist[selectedIndex + 1] ?? null) : (worklist[0] ?? null);
  /* อ่านแล้ว = already carries a report (reported/verified) within the
     currently filtered ช่วงที่เลือก. */
  const readCount = worklist.filter((r) => r.status === 'reported' || r.status === 'verified').length;
  const pendingWork = worklist.filter((r) => r.status === 'performed' || r.status === 'reported');

  const anyDialogOpen = confirmUrgentOpen || confirmVerifyOpen || cancelDialog.open
    || amendDialog.open || tplDialog.open || phraseDialog.open || printOpen
    || navConfirm.open || tplConfirm.open;

  /* Row switch with the dirty-draft guard in front — EVERY way of leaving
     a row (list click, prev/next buttons, shortcuts) funnels through here
     so a half-dictated report can never be discarded silently. */
  const requestSelect = (id) => {
    if (id == null || id === selectedId) return;
    setBatchDone(false);
    if (dirty && editable) setNavConfirm({ open: true, targetId: id });
    else setSelectedId(id);
  };

  const gotoOffset = (delta) => {
    if (worklist.length === 0) return;
    if (selectedIndex < 0) { requestSelect(worklist[0].id); return; }
    const target = worklist[selectedIndex + delta];
    if (target) requestSelect(target.id);
  };

  /* After a successful commit, jump wherever the batch flow queued up.
     'DONE' = past the end of the filtered list → explicit all-done state
     instead of silently landing on an empty editor. */
  const finishNav = () => {
    const target = navAfterCommitRef.current;
    navAfterCommitRef.current = null;
    if (target == null) return;
    if (target === 'DONE') { setSelectedId(null); setBatchDone(true); }
    else setSelectedId(target);
  };
  const clearQueuedNav = () => { navAfterCommitRef.current = null; };

  /* Keyboard shortcuts — Alt+↑/Alt+↓ anywhere, J/K only when focus is NOT
     inside a text field (so dictation typing never triggers navigation).
     Both are surfaced in the nav bar hint + button titles — no invisible
     shortcuts. Re-registered per render so the handler always sees fresh
     worklist/dirty state (cheap: one listener). */
  useEffect(() => {
    const onKey = (e) => {
      if (anyDialogOpen) return;
      const t = e.target;
      const tag = t?.tagName;
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable;
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        gotoOffset(e.key === 'ArrowDown' ? 1 : -1);
      } else if (!inField && !e.altKey && !e.ctrlKey && !e.metaKey
        && (e.key === 'j' || e.key === 'J' || e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        gotoOffset(e.key === 'j' || e.key === 'J' ? 1 : -1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* Browser unload guard — a dirty dictation must survive an accidental
     tab close / refresh (data-loss protection, same risk as row switch). */
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  /* Changing the ช่วงที่เลือก (filters/search) starts a new batch. */
  useEffect(() => { setBatchDone(false); }, [q, statusFilter, modalityFilter, dateFrom, dateTo]);

  /* Focus management for the shared <AlertDialog> confirms (ผิดปกติ
     เร่งด่วน / ยืนยันผล / แทนที่ Template): the component renders
     role='alertdialog' + Esc but does not move focus, so the page does —
     focus lands on the dialog's first button on open and returns to the
     opener on close (WCAG 2.4.3 focus order; no keyboard trap). The
     timeout outlives the dialog's mount animation frame. */
  const alertDialogOpen = confirmUrgentOpen || confirmVerifyOpen || tplConfirm.open;
  const alertOpenerRef = useRef(null);
  useEffect(() => {
    if (alertDialogOpen) {
      alertOpenerRef.current = document.activeElement;
      const t = setTimeout(() => {
        const dlg = document.querySelector('[role="alertdialog"]');
        const btn = dlg?.querySelector('button');
        (btn ?? dlg)?.focus?.();
      }, 30);
      return () => clearTimeout(t);
    }
    const el = alertOpenerRef.current;
    alertOpenerRef.current = null;
    if (el && typeof el.focus === 'function') {
      const t = setTimeout(() => el.focus(), 30);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [alertDialogOpen]);

  /* แพทย์อ่านผลตัวเลือก — scoped by the exam's modality (`modalities[]` on
     each reader: the visiting รังสีแพทย์ reads films/US, the dentist reads
     dental films only). */
  const eligibleReaders = useMemo(
    () => (row ? XRAY_RADIOLOGISTS.filter((r) => r.modalities.includes(row.modality)) : []),
    [row?.modality], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const currentUserEligible = row ? currentUser.modalities.includes(row.modality) : true;

  /* Templates — §1.12.6.1/§1.12.6.7: shared (สำนักอนามัยกำหนด) + the
     selected reading doctor's own. tplVersion re-runs this after
     upsertTemplate mutates the store in place. */
  const templates = useMemo(
    () => (row ? templatesFor(row.examId, draft.radiologistId) : []),
    [row?.examId, draft.radiologistId, tplVersion], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const phraseSuggestions = useMemo(() => phraseSuggestionTexts(), [tplVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Helpers ────────────────────────────────────────────────────────── */
  const updateRow = (id, patch) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  /* Insert-at-cursor — the legacy Look-up behaviour (§2.3 item 6): the
     phrase lands where the caret is, not at the end of the paragraph.
     SuggestibleTextarea doesn't expose the inner textarea ref, so we reach
     it through the wrapper div; falls back to appending. */
  const insertPhrase = (text) => {
    if (!editable) return;
    const key = activeField;
    const ta = fieldWrapRefs[key]?.current?.querySelector('textarea') ?? null;
    const current = draft[key] ?? '';
    let next;
    let caret;
    if (ta && typeof ta.selectionStart === 'number' && document.activeElement === ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = current.slice(0, start);
      const after = current.slice(end);
      const glue = before && !/\s$/.test(before) ? ' ' : '';
      next = `${before}${glue}${text}${after}`;
      caret = (before + glue + text).length;
    } else {
      const glue = current && !/\s$/.test(current) ? ' ' : '';
      next = `${current}${glue}${text}`;
      caret = next.length;
    }
    setDraft((d) => ({ ...d, [key]: next }));
    if (ta) {
      requestAnimationFrame(() => {
        ta.focus();
        try { ta.setSelectionRange(caret, caret); } catch (e) { /* detached mid-frame — harmless */ }
      });
    }
  };

  const applyTemplate = (tpl) => {
    if (!editable) return;
    setDraft((d) => ({
      ...d,
      technique: tpl.technique,
      findings: tpl.findings,
      impression: tpl.impression,
      resultType: tpl.resultType,
    }));
  };

  /* ── Actions ────────────────────────────────────────────────────────── */
  const canReport = editable
    && row?.status === 'performed'
    && draft.findings.trim().length > 0
    && draft.impression.trim().length > 0
    && Boolean(draft.resultType)
    && Boolean(draft.radiologistId)
    && Boolean(draft.radiographerId);

  const commitReport = () => {
    if (!selectedRaw) return;
    updateRow(selectedRaw.id, {
      status: 'reported',
      reportedAt: nowTime(),
      technique: draft.technique,
      findings: draft.findings,
      impression: draft.impression,
      resultType: draft.resultType,
      radiologist: XRAY_RADIOLOGIST_BY_ID[draft.radiologistId]?.name ?? null,
      radiographer: XRAY_RADIOGRAPHER_BY_ID[draft.radiographerId]?.name ?? null,
      /* From this moment the report is owned by the reading doctor's code —
         §1.12.6.3. Any other login sees it read-only. */
      lockedBy: draft.radiologistId,
      /* A reportCancelled row being re-reported clears its exception ride-
         along; the cancellation itself stays in `amendments`. */
      exception: null,
      cancelReason: null,
    });
    setConfirmUrgentOpen(false);
    notify('บันทึกผลการตรวจแล้ว — รอยืนยันผล');
    finishNav();
  };

  const handleReport = () => {
    if (!canReport) return;
    clearQueuedNav(); /* plain save — stay on this row */
    /* ผิดปกติเร่งด่วน blocks on an explicit confirmation because saving it
       is a promise: the ordering clinician gets paged NOW (§1.12.6.9). */
    if (draft.resultType === 'abnormalUrgent') setConfirmUrgentOpen(true);
    else commitReport();
  };

  /* บันทึกและไปรายการถัดไป — commit, then load the next row of the
     filtered list without a detour back to the list. The next id is
     captured BEFORE the commit because the committed row may drop out of
     the filtered worklist (e.g. filter = รอบันทึกผล). */
  const handleReportNext = () => {
    if (!canReport) return;
    navAfterCommitRef.current = (selectedIndex >= 0 && worklist[selectedIndex + 1]?.id) || 'DONE';
    if (draft.resultType === 'abnormalUrgent') setConfirmUrgentOpen(true);
    else commitReport();
  };

  const handleVerifyNext = () => {
    navAfterCommitRef.current = (selectedIndex >= 0 && worklist[selectedIndex + 1]?.id) || 'DONE';
    setConfirmVerifyOpen(true);
  };

  const commitVerify = () => {
    if (!selectedRaw) return;
    updateRow(selectedRaw.id, {
      status: 'verified',
      verifiedAt: nowTime(),
      /* The verifier may polish wording before signing off — the verify
         commit carries the draft so nothing typed is lost. */
      technique: draft.technique,
      findings: draft.findings,
      impression: draft.impression,
      resultType: draft.resultType,
      /* คทง.9 hardening — ยืนยันผล **ห้ามโอนความเป็นเจ้าของ**: ถ้ารายงานถูก
         ล็อกด้วยรหัสแพทย์ผู้อ่านแล้ว การเปลี่ยน dropdown ตอน verify ต้องไม่
         เขียนทับ lockedBy (ไม่งั้นเจ้าของเดิมกลายเป็นคนอื่นแก้แทนได้) */
      lockedBy: selectedRaw.lockedBy || draft.radiologistId,
      radiologist: selectedRaw.lockedBy
        ? selectedRaw.radiologist
        : (XRAY_RADIOLOGIST_BY_ID[draft.radiologistId]?.name ?? selectedRaw.radiologist),
    });
    setConfirmVerifyOpen(false);
    notify('ยืนยันผลการตรวจแล้ว — แพทย์ผู้ส่งตรวจเปิดดูผลได้ทันที');
    finishNav();
  };

  /* §1.12.6.3 second half: the SAME doctor editing their own verified
     report must leave a paper trail — เหตุผล + {at, by, reason} appended to
     `amendments`, displayed below the editor. */
  const commitAmend = () => {
    if (!selectedRaw || !amendDialog.reason.trim()) return;
    updateRow(selectedRaw.id, {
      technique: draft.technique,
      findings: draft.findings,
      impression: draft.impression,
      resultType: draft.resultType,
      amendments: [
        ...selectedRaw.amendments,
        /* byId = รหัสแพทย์ (authoritative) — ชื่ออาจซ้ำ/เปลี่ยนได้ */
        { at: nowTime(), by: currentUser.name, byId: currentUserId, reason: amendDialog.reason.trim() },
      ],
    });
    setAmendDialog({ open: false, reason: '' });
    notify('บันทึกการแก้ไขผลแล้ว (เก็บประวัติการแก้ไข)');
    finishNav();
  };

  /* ── Dirty-draft guard actions (the 3-way "ยังไม่ได้บันทึกผลของ …") ──
     · บันทึกก่อนไป — commit via the status-appropriate flow (report /
       verify-confirm / amend-reason), then navigate on success.
     · ทิ้งฉบับร่าง — navigate; the seed effect resets the draft.
     · ยกเลิก — stay put, draft intact. */
  const saveBeforeNav = () => {
    if (!selectedRaw) return;
    const target = navConfirm.targetId;
    setNavConfirm({ open: false, targetId: null });
    navAfterCommitRef.current = target;
    if (selectedRaw.status === 'performed') {
      if (draft.resultType === 'abnormalUrgent') setConfirmUrgentOpen(true);
      else commitReport();
    } else if (selectedRaw.status === 'reported') {
      setConfirmVerifyOpen(true);
    } else if (selectedRaw.status === 'verified') {
      setAmendDialog({ open: true, reason: '' });
    }
  };

  const discardAndNav = () => {
    const target = navConfirm.targetId;
    setNavConfirm({ open: false, targetId: null });
    clearQueuedNav();
    if (target != null) setSelectedId(target); /* seed effect discards the draft */
  };

  /* Whether "บันทึกก่อนไป" can actually commit right now. */
  const canSaveBeforeNav = selectedRaw
    ? (selectedRaw.status === 'performed' ? canReport : true)
    : false;

  /* Template overwrite gate — applying a template over half-written text
     was silent; now it asks first (only when there IS text to lose). */
  const requestTemplate = (tpl) => {
    if (!editable) return;
    const hasText = Boolean(draft.technique.trim() || draft.findings.trim() || draft.impression.trim());
    if (hasText) setTplConfirm({ open: true, tpl });
    else applyTemplate(tpl);
  };

  /* ยกเลิกการรายงานผล (Cancel Report — Kaebrain manual p.8): the exception
     rides on the row (`exception: 'reportCancelled'`) while `status` drops
     back to `performed` so the study re-enters the reporting queue. The
     keyed text is kept in place for correction; the cancellation is logged
     in `amendments`. */
  const commitCancelReport = () => {
    if (!selectedRaw || !cancelDialog.reason.trim()) return;
    updateRow(selectedRaw.id, {
      status: 'performed',
      exception: 'reportCancelled',
      cancelReason: `Cancel Report — ${cancelDialog.reason.trim()}`,
      reportedAt: null,
      verifiedAt: null,
      lockedBy: null,
      amendments: [
        ...selectedRaw.amendments,
        { at: nowTime(), by: currentUser.name, byId: currentUserId, reason: `ยกเลิกการรายงานผล (Cancel Report) — ${cancelDialog.reason.trim()}` },
      ],
    });
    setCancelDialog({ open: false, reason: '' });
    notify('ยกเลิกการรายงานผลแล้ว — รายการกลับไปรอบันทึกผลใหม่');
  };

  /* §1.12.6.6 — save the current report text as a reusable Template
     (optionally ผูกกับแพทย์อ่านผลปัจจุบัน per §1.12.6.1) or a single
     phrase. upsert* notifies subscribers → tplVersion bumps → pickers and
     suggestion lists refresh. */
  const commitSaveTemplate = () => {
    if (!row || !tplDialog.name.trim()) return;
    upsertTemplate({
      id: `tpl-user-${Date.now()}`,
      name: tplDialog.name.trim(),
      modality: row.modality,
      examIds: [row.examId],
      radiologistId: tplDialog.bindToMe ? currentUserId : null,
      technique: draft.technique,
      findings: draft.findings,
      impression: draft.impression,
      resultType: draft.resultType ?? 'normal',
    });
    setTplDialog({ open: false, name: '', bindToMe: true });
    notify('บันทึก Template ใหม่แล้ว');
  };

  const commitSavePhrase = () => {
    if (!phraseDialog.text.trim()) return;
    upsertPhrase({ id: `ph-user-${Date.now()}`, group: 'general', text: phraseDialog.text.trim() });
    setPhraseDialog({ open: false, text: '' });
    notify('บันทึกคำช่วยใหม่แล้ว');
  };

  /* §1.12.6.4 — ดูผลเอกซเรย์ย้อนหลัง: the static history registry plus any
     row of the same HN already verified in this working set. Comparison
     with the prior film is standard radiology practice — a nodule that
     hasn't moved in two years reads very differently from a new one — so
     the panel sits directly under the editor, one click away. */
  const priorStudies = useMemo(() => {
    if (!row) return [];
    const registry = xrayHistoryFor(row.hn).map((h, i) => ({
      key: `hist-${i}`,
      examLabel: XRAY_EXAM_BY_ID[h.examId]?.name ?? h.examId,
      when: `${h.daysAgo} วันก่อน`,
      summary: h.resultSummary,
      findings: null,
      impression: null,
    }));
    const verifiedRows = rows
      .filter((r) => r.hn === row.hn && r.id !== row.id && r.status === 'verified')
      .map((r) => ({
        key: r.id,
        examLabel: r.examLabel,
        when: `วันนี้ ${r.verifiedAt ?? ''}`.trim(),
        summary: r.impression ? `${r.impression.slice(0, 80)}${r.impression.length > 80 ? '…' : ''}` : '—',
        findings: r.findings,
        impression: r.impression,
      }));
    return [...verifiedRows, ...registry];
  }, [row?.hn, row?.id, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className='min-h-screen flex' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <Sidebar activeKey='radiology' />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header breadcrumb={breadcrumb} />
        <div className='p-3 md:p-6 flex-1 flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>

          {/* ผู้ใช้งานปัจจุบัน — the login stand-in the §1.12.6.3 guard keys
              on. Kept at the very top so "who am I reading as" is never
              ambiguous while demoing the lock. */}
          <section
            className='bg-surface-card rounded-card shadow-card flex flex-wrap items-center w-full'
            style={{
              gap: 'var(--dim-space-300)',
              paddingTop: 'var(--dim-space-300)',
              paddingRight: 'var(--dim-space-500)',
              paddingBottom: 'var(--dim-space-300)',
              paddingLeft: 'var(--dim-space-500)',
            }}
          >
            <Icon name='badge' size={20} style={{ color: 'var(--text-brandPrimary-default)' }} />
            <span className='text-sm font-bold text-ink'>ผู้ใช้งานปัจจุบัน (แพทย์อ่านผล)</span>
            <div style={{ minWidth: 260 }}>
              <SelectField
                id='mih-xrayresult-current-user'
                ariaLabel='ผู้ใช้งานปัจจุบัน (แพทย์อ่านผล)'
                value={currentUserId}
                onChange={setCurrentUserId}
                options={XRAY_RADIOLOGISTS.map((r) => ({ value: r.id, label: `${r.name} · ${r.license}` }))}
              />
            </div>
            <span className='text-xs text-ink-tertiary'>
              ผลที่อ่าน/ยืนยันภายใต้รหัสแพทย์ท่านหนึ่ง แพทย์ท่านอื่นจะแก้ไขไม่ได้ (TOR 1.12.6.3)
            </span>
          </section>

          <div className='flex flex-col xl:flex-row items-start w-full' style={{ gap: 'var(--dim-space-400)' }}>

            {/* ═══ LEFT PANE — รายชื่อผู้รับบริการรอบันทึก/ยืนยันผล ═══ */}
            <aside className='w-full xl:w-96 shrink-0 flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
              <SectionCard
                icon='patient_list'
                title='รายชื่อรอบันทึก / ยืนยันผล'
                subtitle='ค้นหาผู้รับบริการที่ได้รับการเอกซเรย์ (TOR 1.12.6.2)'
                action={(
                  <StatusBadge style='neutral' size='small'>{worklist.length} รายการ</StatusBadge>
                )}
              >
                {/* Filters — ช่วงวันที่ส่งตรวจ · HN/ชื่อ/XN · ชนิดการตรวจ ·
                    สถานะ (the §1.12.6.8 axes this worklist supports). */}
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  <div className='flex w-full' style={{ gap: 'var(--dim-space-200)' }}>
                    {[['ตั้งแต่วันที่ส่งตรวจ', dateFrom, setDateFrom, 'mih-xrayresult-date-from'], ['ถึงวันที่', dateTo, setDateTo, 'mih-xrayresult-date-to']].map(([label, val, set, inputId]) => (
                      <label key={label} htmlFor={inputId} className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
                        <span className='text-xs text-ink-secondary'>{label}</span>
                        <input
                          id={inputId}
                          type='date'
                          value={val}
                          onChange={(e) => set(e.target.value)}
                          style={{
                            width: '100%',
                            paddingTop: 'var(--dim-space-150)',
                            paddingRight: 'var(--dim-space-200)',
                            paddingBottom: 'var(--dim-space-150)',
                            paddingLeft: 'var(--dim-space-200)',
                            background: 'var(--surface-input-default)',
                            border: 'var(--dim-stroke-100) solid var(--border-input-default)',
                            borderRadius: 'var(--dim-radius-200)',
                            fontSize: 'var(--type-size-xs)',
                            fontFamily: 'var(--type-family-body)',
                            color: 'var(--text-content-default)',
                            outline: 'none',
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <label className='flex flex-col w-full' htmlFor='mih-xrayresult-search' style={{ gap: 'var(--dim-space-150)' }}>
                    <span className='text-xs text-ink-secondary'>ค้นหา HN / ชื่อ / เลข XN</span>
                    <input
                      id='mih-xrayresult-search'
                      type='text'
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder='เช่น 67-00008 หรือ X69-0418'
                      style={{
                        width: '100%',
                        paddingTop: 'var(--dim-space-150)',
                        paddingRight: 'var(--dim-space-300)',
                        paddingBottom: 'var(--dim-space-150)',
                        paddingLeft: 'var(--dim-space-300)',
                        background: 'var(--surface-input-default)',
                        border: 'var(--dim-stroke-100) solid var(--border-input-default)',
                        borderRadius: 'var(--dim-radius-200)',
                        fontSize: 'var(--type-size-sm)',
                        fontFamily: 'var(--type-family-body)',
                        color: 'var(--text-content-default)',
                        outline: 'none',
                      }}
                    />
                  </label>
                  <div className='flex w-full' style={{ gap: 'var(--dim-space-200)' }}>
                    <SelectField
                      id='mih-xrayresult-filter-modality'
                      label='ชนิดการตรวจ'
                      value={modalityFilter}
                      onChange={setModalityFilter}
                      options={[
                        { value: 'all', label: 'ทุกชนิด' },
                        ...XRAY_MODALITIES.map((m) => ({ value: m.key, label: `${m.thai} (${m.code})` })),
                      ]}
                    />
                    <SelectField
                      id='mih-xrayresult-filter-status'
                      label='สถานะ'
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={STATUS_FILTER_OPTIONS}
                    />
                  </div>
                </div>

                {/* Worklist — STAT first (red), then รอบันทึกผล → รอยืนยัน →
                    ยืนยันแล้ว. Selecting a row loads it into the editor. */}
                <div
                  className='flex flex-col w-full overflow-y-auto'
                  style={{ gap: 'var(--dim-space-200)', maxHeight: 640 }}
                >
                  {worklist.length === 0 && (
                    <p className='text-sm text-ink-tertiary text-center' style={{ paddingTop: 'var(--dim-space-400)', paddingBottom: 'var(--dim-space-400)' }}>
                      ไม่พบรายการตามเงื่อนไขที่ค้นหา
                    </p>
                  )}
                  {worklist.map((r) => {
                    const selected = r.id === selectedId;
                    const status = XRAY_STATUS_BY_KEY[r.status];
                    const isStat = r.urgency === 'stat';
                    return (
                      <button
                        key={r.id}
                        type='button'
                        aria-label={`เปิดรายการ ${r.xn} · ${r.patient?.shortName ?? ''} HN ${r.hn} · ${r.examLabel} · ${status?.thai ?? r.status}${isStat ? ' · STAT' : ''}`}
                        aria-current={selected ? 'true' : undefined}
                        onClick={() => requestSelect(r.id)}
                        className='flex flex-col w-full text-left'
                        style={{
                          gap: 'var(--dim-space-100)',
                          paddingTop: 'var(--dim-space-300)',
                          paddingRight: 'var(--dim-space-300)',
                          paddingBottom: 'var(--dim-space-300)',
                          paddingLeft: 'var(--dim-space-300)',
                          background: selected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
                          border: `var(--dim-stroke-100) solid ${selected
                            ? 'var(--border-brandPrimary-default)'
                            : isStat ? 'var(--text-statusbadge-error)' : 'var(--border-card-default)'}`,
                          borderRadius: 'var(--dim-radius-200)',
                          cursor: 'pointer',
                        }}
                      >
                        <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
                          <span className='text-xs font-bold' style={{ color: 'var(--text-brandPrimary-default)' }}>{r.xn}</span>
                          {isStat && (
                            <StatusBadge style='error' size='small' icon='bolt'>STAT</StatusBadge>
                          )}
                          {r.urgency === 'urgent' && (
                            <StatusBadge style='warning' size='small'>ด่วน</StatusBadge>
                          )}
                          {/* Unsaved dictation lives HERE — visible from the
                              list so the reader always knows where the
                              draft is parked. */}
                          {selected && dirty && (
                            <StatusBadge style='warning' size='small' icon='edit_note'>ฉบับร่าง</StatusBadge>
                          )}
                          <span className='flex-1' />
                          <StatusBadge style={status?.color ?? 'neutral'} size='small' icon={status?.icon}>
                            {status?.short ?? r.status}
                          </StatusBadge>
                        </div>
                        <span className='text-sm font-bold text-ink truncate w-full'>
                          {r.patient?.shortName} · HN {r.hn}
                        </span>
                        <span className='text-xs text-ink-secondary truncate w-full'>{r.examLabel}</span>
                        {/* Exception rides ALONGSIDE status — a cancelled
                            report shows both "รอบันทึกผล" and the exception
                            badge so nobody misses why it came back. */}
                        {r.exception && (
                          <StatusBadge
                            style={XRAY_EXCEPTION_BY_KEY[r.exception]?.color ?? 'warning'}
                            size='small'
                            icon={XRAY_EXCEPTION_BY_KEY[r.exception]?.icon}
                          >
                            {r.exceptionLabel}
                          </StatusBadge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </SectionCard>
            </aside>

            {/* ═══ RIGHT PANE — เครื่องมือบันทึกผล ═══ */}
            <section className='flex-1 min-w-0 w-full flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>

              {/* ── Batch reading nav — ก่อนหน้า/ถัดไป on the filtered list,
                  position + progress readout, and the shortcut hint. The
                  radiologist clears the whole ช่วงที่เลือก without ever
                  going back to the list (Nielsen #1: visibility of where
                  you are and how much is left). */}
              <section
                className='bg-surface-card rounded-card shadow-card flex flex-wrap items-center w-full'
                style={{
                  gap: 'var(--dim-space-300)',
                  paddingTop: 'var(--dim-space-300)',
                  paddingRight: 'var(--dim-space-500)',
                  paddingBottom: 'var(--dim-space-300)',
                  paddingLeft: 'var(--dim-space-500)',
                }}
              >
                <NeutralSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='arrow_upward'
                  disabled={!prevRow}
                  onClick={() => gotoOffset(-1)}
                  title='รายการก่อนหน้า — ทางลัด Alt+↑ หรือปุ่ม K'
                  aria-label='รายการก่อนหน้า (Alt+ลูกศรขึ้น หรือปุ่ม K)'
                >
                  ก่อนหน้า
                </NeutralSubdueButton>
                <NeutralSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='arrow_downward'
                  disabled={selectedIndex >= 0 ? !worklist[selectedIndex + 1] : worklist.length === 0}
                  onClick={() => gotoOffset(1)}
                  title='รายการถัดไป — ทางลัด Alt+↓ หรือปุ่ม J'
                  aria-label='รายการถัดไป (Alt+ลูกศรลง หรือปุ่ม J)'
                >
                  ถัดไป
                </NeutralSubdueButton>
                <span className='text-sm font-bold text-ink'>
                  {selectedIndex >= 0
                    ? `รายการที่ ${selectedIndex + 1} / ${worklist.length}`
                    : `${worklist.length} รายการในช่วงที่เลือก`}
                </span>
                <span
                  role='status'
                  className='text-xs text-ink-secondary'
                  style={{
                    paddingTop: 'var(--dim-space-050, 2px)',
                    paddingRight: 'var(--dim-space-200)',
                    paddingBottom: 'var(--dim-space-050, 2px)',
                    paddingLeft: 'var(--dim-space-200)',
                    background: 'var(--surface-brandPrimary-quaternary)',
                    borderRadius: 'var(--dim-radius-full)',
                  }}
                >
                  อ่านแล้ว {readCount} / {worklist.length} ของช่วงที่เลือก
                </span>
                <span className='flex-1' />
                <span className='text-xs text-ink-tertiary'>
                  ทางลัด: Alt+↑ / Alt+↓ หรือปุ่ม J / K (เมื่อไม่ได้พิมพ์อยู่ในช่องข้อความ)
                </span>
              </section>

              {/* All caught up — the batch flow ran off the end of the
                  filtered list; say so instead of a silent empty editor. */}
              {!row && batchDone && (
                <div
                  role='status'
                  className='bg-surface-card rounded-card shadow-card flex flex-col items-center justify-center text-center w-full'
                  style={{
                    gap: 'var(--dim-space-300)',
                    paddingTop: 'var(--dim-space-800)',
                    paddingRight: 'var(--dim-space-600)',
                    paddingBottom: 'var(--dim-space-800)',
                    paddingLeft: 'var(--dim-space-600)',
                  }}
                >
                  <Icon name='task_alt' size={40} style={{ color: 'var(--text-brandPrimary-default)' }} />
                  {pendingWork.length === 0 ? (
                    <>
                      <p className='text-base font-bold text-ink'>บันทึกผลครบทุกรายการในช่วงที่เลือกแล้ว</p>
                      <p className='text-sm text-ink-tertiary'>
                        อ่านแล้ว {readCount} / {worklist.length} รายการ — ปรับช่วงวันที่หรือตัวกรองเพื่อเริ่มชุดถัดไป
                      </p>
                    </>
                  ) : (
                    <>
                      <p className='text-base font-bold text-ink'>สุดรายการในช่วงที่เลือกแล้ว</p>
                      <p className='text-sm text-ink-tertiary'>
                        ยังเหลืออีก {pendingWork.length} รายการที่รอบันทึก/ยืนยันผลในช่วงที่เลือก
                      </p>
                      <BrandSubdueButton
                        variant='outline'
                        size='md'
                        leadingIcon='skip_next'
                        onClick={() => requestSelect(pendingWork[0].id)}
                      >
                        ไปรายการแรกที่ยังไม่เสร็จ
                      </BrandSubdueButton>
                    </>
                  )}
                </div>
              )}

              {!row && !batchDone && (
                <div
                  className='bg-surface-card rounded-card shadow-card flex flex-col items-center justify-center text-center w-full'
                  style={{
                    gap: 'var(--dim-space-300)',
                    paddingTop: 'var(--dim-space-800)',
                    paddingRight: 'var(--dim-space-600)',
                    paddingBottom: 'var(--dim-space-800)',
                    paddingLeft: 'var(--dim-space-600)',
                  }}
                >
                  <Icon name='radiology' size={40} style={{ color: 'var(--text-content-tertiary)' }} />
                  <p className='text-base font-bold text-ink'>เลือกผู้รับบริการจากรายการด้านซ้าย</p>
                  <p className='text-sm text-ink-tertiary'>
                    เลือกรายการที่สถานะ "รอบันทึกผล" เพื่อคีย์รายงาน หรือ "รอยืนยันผล" เพื่อตรวจทานและยืนยันผล
                  </p>
                </div>
              )}

              {row && (
                <>
                  {/* ── Patient + order header — the §1.12.5.2/.3 context the
                      reader needs before touching the film: identity, exam,
                      clinic, and the two safety blocks (allergy, pregnancy). */}
                  <SectionCard
                    icon='person'
                    title={`${row.patient?.fullName} · HN ${row.hn}`}
                    subtitle={`${row.patient?.age} · ${row.patient?.sex} · สิทธิ ${row.rightLabel}`}
                    action={(
                      <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                        {row.urgency === 'stat' && <StatusBadge style='error' size='small' icon='bolt'>STAT</StatusBadge>}
                        <StatusBadge style={row.statusColor} size='small' icon={XRAY_STATUS_BY_KEY[row.status]?.icon}>
                          {XRAY_STATUS_BY_KEY[row.status]?.thai}
                        </StatusBadge>
                      </div>
                    )}
                  >
                    <div className='grid grid-cols-2 md:grid-cols-3 w-full' style={{ gap: 'var(--dim-space-300)' }}>
                      <InfoItem label='เลข XN'>{row.xn}</InfoItem>
                      <InfoItem label='รายการตรวจ'>{row.examLabel}</InfoItem>
                      <InfoItem label='ตำแหน่ง / ท่าถ่าย'>{row.regionLabel} · {row.view}</InfoItem>
                      <InfoItem label='คลินิกที่ขอตรวจ'>{row.orderingLocation}</InfoItem>
                      <InfoItem label='แพทย์ผู้ส่งตรวจ'>{row.orderedBy}</InfoItem>
                      <InfoItem label='ถ่ายเมื่อ'>{row.performedAt ?? '—'} · โดย {row.radiographer ?? '—'}</InfoItem>
                      <InfoItem label='อาการโดยย่อ' span>{row.clinicalSummary || '—'}</InfoItem>
                      <InfoItem label='การวินิจฉัย (ที่ส่งมา)' span>{row.diagnosis || '—'}</InfoItem>
                      {row.pregnancy?.status && (
                        <InfoItem label='ประจำเดือน / การตั้งครรภ์'>
                          {row.pregnancy.status}{row.pregnancy.lmp ? ` · LMP ${row.pregnancy.lmp}` : ''}
                        </InfoItem>
                      )}
                    </div>

                    {/* ประวัติแพ้ — §1.12.5.3's allergy block re-surfaced at
                        read time; a contrast allergy must stay loud on every
                        screen that touches this order. */}
                    {row.allergy?.has && (
                      <Alert
                        type='error'
                        title={`ประวัติแพ้: ${row.allergy.agent}`}
                        subtext={`อาการ: ${row.allergy.symptom}`}
                      />
                    )}
                    {row.pregnancy?.status === 'ตั้งครรภ์' && (
                      <Alert
                        type='warning'
                        title='ผู้รับบริการตั้งครรภ์'
                        subtext='ระวังการแปลผล/คำแนะนำที่เกี่ยวข้องกับการได้รับรังสีของทารกในครรภ์'
                      />
                    )}
                  </SectionCard>

                  {/* ── §1.12.6.3 lock banner — another doctor's report is
                      READ-ONLY here, full stop. */}
                  {lockedByOther && (
                    <Alert
                      type='error'
                      title={`ผลอ่านโดย ${lockingDoctor?.name ?? 'แพทย์ท่านอื่น'} — ไม่สามารถแก้ไขได้`}
                      subtext={'รายงานฉบับนี้ถูกบันทึก/ยืนยันภายใต้รหัสแพทย์ท่านอื่น ระบบเปิดให้อ่านอย่างเดียวเท่านั้น '
                        + '(TOR 1.12.6.3 — ป้องกันข้อมูลการอ่านผลของแพทย์แต่ละท่าน)'}
                    />
                  )}
                  {isOwner && row.status === 'verified' && (
                    <Alert
                      type='info'
                      title='คุณเป็นแพทย์เจ้าของรายงานฉบับนี้'
                      subtext='แก้ไขได้ แต่การบันทึกการแก้ไขต้องระบุเหตุผล และระบบจะเก็บประวัติการแก้ไขทุกครั้ง (TOR 1.12.6.3)'
                    />
                  )}
                  {row.exception === 'reportCancelled' && (
                    <Alert
                      type='warning'
                      title='รายการนี้ถูกยกเลิกการรายงานผล — รอบันทึกผลใหม่'
                      subtext={row.cancelReason ?? ''}
                    />
                  )}

                  {/* ── Report editor ── */}
                  <SectionCard
                    icon='edit_note'
                    title='บันทึกผลการอ่าน'
                    subtitle='Technique · Findings · Impression · ประเภทผลตรวจ (TOR 1.12.6.9)'
                  >
                    {/* Template picker — §1.12.6.1 (per-doctor binding) +
                        §1.12.6.7 (สำนักอนามัยกำหนด = shared set). */}
                    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
                        <span className='text-xs font-bold text-ink-secondary'>Template ผลมาตรฐานสำหรับ {row.examLabel}</span>
                        <span className='flex-1' />
                        <BrandSubdueButton
                          variant='outline'
                          size='sm'
                          leadingIcon='bookmark_add'
                          disabled={!editable || !draft.findings.trim()}
                          onClick={() => setTplDialog({
                            open: true,
                            name: `${row.examLabel} — ${draft.resultType ? XRAY_RESULT_TYPE_BY_KEY[draft.resultType]?.thai : 'Template ใหม่'}`,
                            bindToMe: true,
                          })}
                        >
                          บันทึกเป็น Template
                        </BrandSubdueButton>
                      </div>
                      {templates.length === 0 && (
                        <p className='text-xs text-ink-tertiary'>ยังไม่มี Template สำหรับรายการตรวจนี้</p>
                      )}
                      <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-200)' }}>
                        {templates.map((t) => {
                          const own = t.radiologistId != null;
                          /* Hover/focus preview of what the template will
                             insert — the reader sees the content BEFORE
                             committing to the overwrite. */
                          const preview = `Findings: ${t.findings}\n\nImpression: ${t.impression}`
                            + (draft.findings.trim() || draft.impression.trim() || draft.technique.trim()
                              ? '\n\n(ระบบจะถามยืนยันก่อนแทนที่ข้อความเดิม)' : '');
                          return (
                            <button
                              key={t.id}
                              type='button'
                              aria-label={`ใช้ Template ${t.name}${own ? ' (ของแพทย์ท่านนี้)' : ' (ส่วนกลาง)'}`}
                              disabled={!editable}
                              onClick={() => requestTemplate(t)}
                              title={preview}
                              className='inline-flex items-center'
                              style={{
                                gap: 'var(--dim-space-150)',
                                paddingTop: 'var(--dim-space-150)',
                                paddingRight: 'var(--dim-space-300)',
                                paddingBottom: 'var(--dim-space-150)',
                                paddingLeft: 'var(--dim-space-300)',
                                background: own ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-200)',
                                border: `var(--dim-stroke-100) solid ${own ? 'var(--border-brandPrimary-default)' : 'var(--border-neutral-quaternary)'}`,
                                borderRadius: 'var(--dim-radius-full)',
                                fontSize: 'var(--type-size-xs)',
                                fontFamily: 'var(--type-family-body)',
                                color: 'var(--text-content-default)',
                                cursor: editable ? 'pointer' : 'not-allowed',
                                opacity: editable ? 1 : 0.6,
                              }}
                            >
                              <Icon name={own ? 'person_book' : 'menu_book'} size={14} style={{ color: 'var(--text-brandPrimary-default)' }} />
                              {t.name}
                              <span className='text-ink-tertiary'>{own ? '· ของแพทย์ท่านนี้' : '· ส่วนกลาง'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* คำช่วย / ชุดคำช่วย — §1.12.6.6 + legacy §2.3 items
                        6–9: stock phrases inserted AT THE CARET of the field
                        last focused; ชุดคำช่วย inserts a whole bundle. */}
                    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
                        <span className='text-xs font-bold text-ink-secondary'>คำช่วย · แทรกที่ตำแหน่งเคอร์เซอร์</span>
                        {/* Where the phrase will land — the insertion
                            target follows the last-focused field, so it
                            must be VISIBLE, not guessed. aria-live lets a
                            screen-reader hear the target change too. */}
                        <span
                          aria-live='polite'
                          className='text-xs font-bold'
                          style={{
                            color: 'var(--text-brandPrimary-default)',
                            background: 'var(--surface-brandPrimary-quaternary)',
                            paddingTop: 'var(--dim-space-050, 2px)',
                            paddingRight: 'var(--dim-space-200)',
                            paddingBottom: 'var(--dim-space-050, 2px)',
                            paddingLeft: 'var(--dim-space-200)',
                            borderRadius: 'var(--dim-radius-full)',
                          }}
                        >
                          จะแทรกใน: {activeField === 'technique' ? 'Technique' : activeField === 'impression' ? 'Impression' : 'Findings'}
                        </span>
                        <span className='flex-1' />
                        <BrandSubdueButton
                          variant='outline'
                          size='sm'
                          leadingIcon='add'
                          onClick={() => setPhraseDialog({ open: true, text: '' })}
                        >
                          เพิ่มคำช่วย
                        </BrandSubdueButton>
                      </div>
                      {PHRASE_GROUPS.map((g) => {
                        const phrases = XRAY_PHRASES.filter((p) => p.group === g.key);
                        if (phrases.length === 0) return null;
                        return (
                          <div key={g.key} className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-150)' }}>
                            <span className='text-xs text-ink-tertiary' style={{ minWidth: 88 }}>{g.label}</span>
                            {phrases.map((p) => (
                              <button
                                key={p.id}
                                type='button'
                                aria-label={`แทรกคำช่วย: ${p.text}`}
                                disabled={!editable}
                                onClick={() => insertPhrase(p.text)}
                                title={p.text}
                                style={{
                                  paddingTop: 'var(--dim-space-100)',
                                  paddingRight: 'var(--dim-space-200)',
                                  paddingBottom: 'var(--dim-space-100)',
                                  paddingLeft: 'var(--dim-space-200)',
                                  background: 'var(--surface-card-200)',
                                  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                                  borderRadius: 'var(--dim-radius-full)',
                                  fontSize: 'var(--type-size-xs)',
                                  fontFamily: 'var(--type-family-body)',
                                  color: 'var(--text-content-secondary)',
                                  cursor: editable ? 'pointer' : 'not-allowed',
                                  opacity: editable ? 1 : 0.6,
                                  maxWidth: 260,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {p.text}
                              </button>
                            ))}
                          </div>
                        );
                      })}
                      <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-150)' }}>
                        <span className='text-xs text-ink-tertiary' style={{ minWidth: 88 }}>ชุดคำช่วย</span>
                        {XRAY_PHRASE_SETS.map((s) => (
                          <button
                            key={s.id}
                            type='button'
                            aria-label={`แทรกชุดคำช่วย ${s.name}`}
                            disabled={!editable}
                            onClick={() => insertPhrase(s.phraseIds.map((id) => XRAY_PHRASE_BY_ID[id]?.text).filter(Boolean).join(' '))}
                            title={s.phraseIds.map((id) => XRAY_PHRASE_BY_ID[id]?.text).filter(Boolean).join(' ')}
                            className='inline-flex items-center'
                            style={{
                              gap: 'var(--dim-space-100)',
                              paddingTop: 'var(--dim-space-100)',
                              paddingRight: 'var(--dim-space-200)',
                              paddingBottom: 'var(--dim-space-100)',
                              paddingLeft: 'var(--dim-space-200)',
                              background: 'var(--surface-brandPrimary-quaternary)',
                              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-default)',
                              borderRadius: 'var(--dim-radius-full)',
                              fontSize: 'var(--type-size-xs)',
                              fontFamily: 'var(--type-family-body)',
                              color: 'var(--text-brandPrimary-default)',
                              cursor: editable ? 'pointer' : 'not-allowed',
                              opacity: editable ? 1 : 0.6,
                            }}
                          >
                            <Icon name='library_add' size={14} />
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Editor fields — SuggestibleTextarea per house rule:
                        every clinician-typed field ships with `suggestions`
                        + `minChars` (the คำช่วย texts double as the
                        autocomplete corpus). Findings/Impression are voice-
                        enabled — radiologists dictate. The wrapper class
                        scopes the injected chrome-strip CSS; onFocusCapture
                        tracks which field the next คำช่วย chip inserts into. */}
                    <div className='mih-xrayresult-report flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                      <div ref={techniqueWrapRef} onFocusCapture={() => setActiveField('technique')} className='flex w-full'>
                        <SuggestibleTextarea
                          label='Technique'
                          value={draft.technique}
                          onChange={(e) => setDraft((d) => ({ ...d, technique: e.target.value }))}
                          placeholder='เช่น PA upright chest radiograph.'
                          suggestions={phraseSuggestions}
                          minChars={3}
                          rows={2}
                          disabled={!editable}
                        />
                      </div>
                      <div ref={findingsWrapRef} onFocusCapture={() => setActiveField('findings')} className='flex w-full'>
                        <SuggestibleTextarea
                          label='Findings'
                          required
                          voice
                          value={draft.findings}
                          onChange={(e) => setDraft((d) => ({ ...d, findings: e.target.value }))}
                          placeholder='สิ่งที่พบจากภาพถ่ายรังสี — พิมพ์ ใช้เสียง หรือแทรกคำช่วย/Template'
                          suggestions={phraseSuggestions}
                          minChars={3}
                          height={180}
                          minHeight={120}
                          disabled={!editable}
                        />
                      </div>
                      <div ref={impressionWrapRef} onFocusCapture={() => setActiveField('impression')} className='flex w-full'>
                        <SuggestibleTextarea
                          label='Impression'
                          required
                          voice
                          value={draft.impression}
                          onChange={(e) => setDraft((d) => ({ ...d, impression: e.target.value }))}
                          placeholder='สรุปผลการอ่านและคำแนะนำถึงแพทย์ผู้ส่งตรวจ'
                          suggestions={phraseSuggestions}
                          minChars={3}
                          height={140}
                          minHeight={96}
                          disabled={!editable}
                        />
                      </div>
                    </div>

                    {/* ── Sticky commit zone — ประเภทผลตรวจ + ผู้บันทึกผล/
                        แพทย์อ่านผล + action buttons pinned to the bottom of
                        the right pane, so after a long dictation nothing
                        forces a scroll past the whole report to commit.
                        Negative bottom margin + own padding make the zone
                        sit flush with the card edge and paint over content
                        scrolling behind it. */}
                    <div
                      className='flex flex-col w-full'
                      style={{
                        position: 'sticky',
                        bottom: 0,
                        zIndex: 1,
                        background: 'var(--surface-card-100)',
                        boxShadow: 'var(--shadow-brand-drop-top-100)',
                        gap: 'var(--dim-space-400)',
                        paddingTop: 'var(--dim-space-300)',
                        paddingBottom: 'var(--dim-space-500)',
                        marginBottom: 'calc(-1 * var(--dim-space-500, 20px))',
                        borderBottomLeftRadius: 'var(--dim-radius-500, 16px)',
                        borderBottomRightRadius: 'var(--dim-radius-500, 16px)',
                      }}
                    >
                    {/* ประเภทผลตรวจ — §1.12.6.9 verbatim: ปกติ / ผิดปกติ /
                        ผิดปกติเร่งด่วน / ไม่ชัดเจน. Rendered as an ARIA
                        radiogroup: roving tabindex, arrow keys select. */}
                    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)' }}>
                      <span id='mih-xrayresult-resulttype-label' className='text-xs text-ink-secondary'>
                        ประเภทผลตรวจ <span style={{ color: 'var(--text-input-require)' }}>*</span>
                      </span>
                      <div
                        ref={resultTypeGroupRef}
                        role='radiogroup'
                        aria-labelledby='mih-xrayresult-resulttype-label'
                        aria-required='true'
                        onKeyDown={onResultTypeKey}
                        className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 w-full'
                        style={{ gap: 'var(--dim-space-200)' }}
                      >
                        {XRAY_RESULT_TYPES.map((t, ti) => {
                          const selected = draft.resultType === t.key;
                          const meta = RESULT_TYPE_META[t.key];
                          const urgent = t.key === 'abnormalUrgent';
                          return (
                            <button
                              key={t.key}
                              type='button'
                              role='radio'
                              aria-checked={selected}
                              aria-label={`${t.thai} — ${meta.sub}`}
                              data-rtkey={t.key}
                              tabIndex={selected || (!draft.resultType && ti === 0) ? 0 : -1}
                              disabled={!editable}
                              onClick={() => setDraft((d) => ({ ...d, resultType: t.key }))}
                              className='flex items-start text-left'
                              style={{
                                gap: 'var(--dim-space-200)',
                                paddingTop: 'var(--dim-space-200)',
                                paddingRight: 'var(--dim-space-300)',
                                paddingBottom: 'var(--dim-space-200)',
                                paddingLeft: 'var(--dim-space-300)',
                                background: selected ? `var(--surface-statusbadge-${t.color})` : 'var(--surface-card-100)',
                                /* ผิดปกติเร่งด่วน stays red-bordered even
                                   unselected — it must be findable at a
                                   glance, the same way STAT rows are. */
                                border: `var(--dim-stroke-100) solid ${selected || urgent
                                  ? `var(--text-statusbadge-${t.color})`
                                  : 'var(--border-card-default)'}`,
                                borderRadius: 'var(--dim-radius-200)',
                                cursor: editable ? 'pointer' : 'not-allowed',
                                opacity: editable ? 1 : 0.6,
                              }}
                            >
                              <Icon name={meta.icon} size={18} style={{ color: `var(--text-statusbadge-${t.color})` }} />
                              <span className='flex flex-col min-w-0'>
                                <span
                                  className='text-sm'
                                  style={{
                                    color: `var(--text-statusbadge-${t.color})`,
                                    fontWeight: (selected || urgent) ? 'var(--type-weight-bold)' : 'var(--type-weight-medium)',
                                  }}
                                >
                                  {t.thai}
                                </span>
                                <span className='text-xs text-ink-tertiary'>{meta.sub}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ผู้บันทึกผล + แพทย์อ่านผล */}
                    <div className='grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-300)' }}>
                      <SelectField
                        id='mih-xrayresult-radiographer'
                        label='ผู้บันทึกผล (เจ้าหน้าที่รังสี)'
                        required
                        disabled={!editable}
                        value={draft.radiographerId}
                        onChange={(v) => setDraft((d) => ({ ...d, radiographerId: v }))}
                        options={XRAY_RADIOGRAPHERS.map((r) => ({ value: r.id, label: r.name }))}
                      />
                      <SelectField
                        id='mih-xrayresult-radiologist'
                        label={`แพทย์อ่านผล (เฉพาะผู้อ่าน ${row.modalityLabel})`}
                        required
                        disabled={!editable}
                        value={draft.radiologistId ?? ''}
                        onChange={(v) => setDraft((d) => ({ ...d, radiologistId: v }))}
                        options={eligibleReaders.map((r) => ({ value: r.id, label: `${r.name} · ${r.license}` }))}
                      />
                    </div>
                    {!currentUserEligible && (
                      <Alert
                        type='warning'
                        title={`${currentUser.name} ไม่ได้ถูกกำหนดให้อ่านผล ${row.modalityLabel}`}
                        subtext='เลือกแพทย์อ่านผลจากรายชื่อที่ถูกกำหนดไว้สำหรับชนิดการตรวจนี้ (ทะเบียนแพทย์อ่านผล X-ray)'
                      />
                    )}

                    {/* Action bar */}
                    <div
                      className='flex flex-wrap items-center w-full'
                      style={{
                        gap: 'var(--dim-space-300)',
                        borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                        paddingTop: 'var(--dim-space-400)',
                      }}
                    >
                      <span className='text-xs text-ink-tertiary'>
                        {row.status === 'performed' && 'บันทึกผลเพื่อส่งต่อขั้นตอนยืนยันผล'}
                        {row.status === 'reported' && !lockedByOther && 'ตรวจทานรายงาน แล้วยืนยันผลเพื่อเปิดให้แพทย์ผู้ส่งตรวจอ่าน'}
                        {row.status === 'verified' && isOwner && (dirty ? 'มีการแก้ไขที่ยังไม่บันทึก — ต้องระบุเหตุผลการแก้ไข' : 'รายงานยืนยันแล้ว')}
                        {lockedByOther && 'อ่านอย่างเดียว — รายงานเป็นของแพทย์ท่านอื่น'}
                      </span>
                      <span className='flex-1' />
                      {(row.status === 'reported' || row.status === 'verified') && (
                        <NeutralSubdueButton
                          variant='outline'
                          size='md'
                          leadingIcon='print'
                          onClick={() => setPrintOpen(true)}
                        >
                          พิมพ์ใบผลเอกซเรย์
                        </NeutralSubdueButton>
                      )}
                      {(row.status === 'reported' || row.status === 'verified') && !lockedByOther && (
                        <DangerSubdueButton
                          variant='outline'
                          size='md'
                          leadingIcon='undo'
                          onClick={() => setCancelDialog({ open: true, reason: '' })}
                        >
                          ยกเลิกการรายงานผล
                        </DangerSubdueButton>
                      )}
                      {/* Batch primaries — commit AND move on in one click;
                          the plain commit stays for "save and stay". */}
                      {row.status === 'performed' && (
                        <>
                          <BrandSubdueButton
                            variant='outline'
                            size='md'
                            leadingIcon='save'
                            disabled={!canReport}
                            onClick={handleReport}
                            title='บันทึกผลและอยู่ที่รายการนี้'
                          >
                            บันทึกผล
                          </BrandSubdueButton>
                          <BrandButton
                            size='md'
                            leadingIcon='skip_next'
                            disabled={!canReport}
                            onClick={handleReportNext}
                            title='บันทึกผล แล้วเปิดรายการถัดไปในช่วงที่เลือกทันที (ไม่ต้องกลับไปที่รายการ)'
                          >
                            บันทึกและไปรายการถัดไป
                          </BrandButton>
                        </>
                      )}
                      {row.status === 'reported' && !lockedByOther && (
                        <>
                          <BrandSubdueButton
                            variant='outline'
                            size='md'
                            leadingIcon='check_circle'
                            onClick={() => { clearQueuedNav(); setConfirmVerifyOpen(true); }}
                            title='ยืนยันผลและอยู่ที่รายการนี้'
                          >
                            ยืนยันผล
                          </BrandSubdueButton>
                          <BrandButton
                            size='md'
                            leadingIcon='skip_next'
                            onClick={handleVerifyNext}
                            title='ยืนยันผล แล้วเปิดรายการถัดไปในช่วงที่เลือกทันที'
                          >
                            ยืนยันและไปรายการถัดไป
                          </BrandButton>
                        </>
                      )}
                      {row.status === 'verified' && isOwner && (
                        <BrandButton
                          size='md'
                          leadingIcon='edit_note'
                          disabled={!dirty}
                          onClick={() => { clearQueuedNav(); setAmendDialog({ open: true, reason: '' }); }}
                        >
                          บันทึกการแก้ไข
                        </BrandButton>
                      )}
                    </div>
                    </div>
                  </SectionCard>

                  {/* ── ประวัติการแก้ไขผล — §1.12.6.3 second half made
                      visible: every amendment (and every cancel-report) is a
                      row of {เวลา, โดย, เหตุผล}. */}
                  {row.amendments.length > 0 && (
                    <SectionCard
                      icon='history_edu'
                      title='ประวัติการแก้ไขผล'
                      subtitle='ระบบเก็บทุกการแก้ไขของแพทย์เจ้าของรายงาน (TOR 1.12.6.3)'
                    >
                      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                        {row.amendments.map((a, i) => (
                          <div
                            key={`${a.at}-${i}`}
                            className='flex items-start w-full'
                            style={{
                              gap: 'var(--dim-space-300)',
                              paddingTop: 'var(--dim-space-200)',
                              paddingRight: 'var(--dim-space-300)',
                              paddingBottom: 'var(--dim-space-200)',
                              paddingLeft: 'var(--dim-space-300)',
                              background: 'var(--surface-card-200)',
                              borderRadius: 'var(--dim-radius-200)',
                            }}
                          >
                            <Icon name='schedule' size={16} style={{ color: 'var(--text-content-tertiary)' }} />
                            <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                              <span className='text-xs text-ink-tertiary'>{a.at} · {a.by}</span>
                              <span className='text-sm text-ink'>{a.reason}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}

                  {/* ── §1.12.6.4 ดูผลเอกซเรย์ย้อนหลัง — collapsible so it
                      doesn't crowd the editor, one click when the reader
                      wants to compare with the prior film. */}
                  <SectionCard
                    icon='history'
                    title='ผลเอกซเรย์ย้อนหลังของผู้รับบริการ'
                    subtitle='เปรียบเทียบกับภาพ/ผลเดิมก่อนสรุป (TOR 1.12.6.4)'
                    action={(
                      <NeutralSubdueButton
                        variant='outline'
                        size='sm'
                        leadingIcon={historyOpen ? 'expand_less' : 'expand_more'}
                        onClick={() => setHistoryOpen((v) => !v)}
                      >
                        {historyOpen ? 'ซ่อน' : `แสดง (${priorStudies.length})`}
                      </NeutralSubdueButton>
                    )}
                  >
                    {historyOpen && (
                      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                        {priorStudies.length === 0 && (
                          <p className='text-sm text-ink-tertiary'>ไม่พบผลตรวจย้อนหลังของ HN นี้</p>
                        )}
                        {priorStudies.map((h) => {
                          const expanded = Boolean(expandedHistory[h.key]);
                          const expandable = Boolean(h.findings || h.impression);
                          return (
                            <div
                              key={h.key}
                              className='flex flex-col w-full'
                              style={{
                                gap: 'var(--dim-space-150)',
                                paddingTop: 'var(--dim-space-200)',
                                paddingRight: 'var(--dim-space-300)',
                                paddingBottom: 'var(--dim-space-200)',
                                paddingLeft: 'var(--dim-space-300)',
                                background: 'var(--surface-card-200)',
                                border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                                borderRadius: 'var(--dim-radius-200)',
                              }}
                            >
                              <button
                                type='button'
                                aria-label={`${expandable ? (expanded ? 'ซ่อน' : 'แสดง') + 'รายละเอียดผลเดิม ' : ''}${h.examLabel} · ${h.when}`}
                                aria-expanded={expandable ? expanded : undefined}
                                onClick={() => expandable && setExpandedHistory((m) => ({ ...m, [h.key]: !expanded }))}
                                className='flex items-center w-full text-left'
                                style={{ gap: 'var(--dim-space-200)', background: 'transparent', border: 'none', cursor: expandable ? 'pointer' : 'default', paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0 }}
                              >
                                <Icon name='imagesmode' size={16} style={{ color: 'var(--text-brandPrimary-default)' }} />
                                <span className='text-sm font-bold text-ink flex-1 min-w-0 truncate'>{h.examLabel}</span>
                                <span className='text-xs text-ink-tertiary'>{h.when}</span>
                                {expandable && <Icon name={expanded ? 'expand_less' : 'expand_more'} size={16} style={{ color: 'var(--text-content-tertiary)' }} />}
                              </button>
                              <span className='text-xs text-ink-secondary'>{h.summary}</span>
                              {expanded && (
                                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                                  {h.findings && (
                                    <p className='text-xs text-ink' style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                      <span className='font-bold'>Findings: </span>{h.findings}
                                    </p>
                                  )}
                                  {h.impression && (
                                    <p className='text-xs text-ink' style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                      <span className='font-bold'>Impression: </span>{h.impression}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </SectionCard>
                </>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}

      {/* ผิดปกติเร่งด่วน gate — saving this classification pages the
          ordering clinician (§1.12.6.9), so it gets a hard confirm. */}
      <AlertDialog
        open={confirmUrgentOpen}
        type='warning'
        title='บันทึกผล "ผิดปกติเร่งด่วน" ?'
        description={`ระบบจะแจ้งเตือน ${row?.orderedBy ?? 'แพทย์ผู้ส่งตรวจ'} (${row?.orderingLocation ?? ''}) ทันทีที่บันทึกผล เพื่อให้ติดต่อผู้รับบริการโดยด่วน`}
        confirmLabel='บันทึกและแจ้งเตือนทันที'
        cancelLabel='กลับไปแก้ไข'
        onConfirm={commitReport}
        onClose={() => { clearQueuedNav(); setConfirmUrgentOpen(false); }}
      />

      <AlertDialog
        open={confirmVerifyOpen}
        type='info'
        title='ยืนยันผลการตรวจ ?'
        description={`ยืนยันผลภายใต้รหัส ${XRAY_RADIOLOGIST_BY_ID[draft.radiologistId]?.name ?? ''} (${XRAY_RADIOLOGIST_BY_ID[draft.radiologistId]?.license ?? ''}) — หลังยืนยัน แพทย์ผู้ส่งตรวจจะเปิดดูผลได้ และแพทย์ท่านอื่นจะแก้ไขไม่ได้`}
        confirmLabel='ยืนยันผล'
        cancelLabel='ยกเลิก'
        onConfirm={commitVerify}
        onClose={() => { clearQueuedNav(); setConfirmVerifyOpen(false); }}
      />

      {/* Dirty-draft guard — leaving a row with unsaved dictation is an
          explicit 3-way choice, never a silent discard. */}
      <MiniDialog
        open={navConfirm.open}
        icon='edit_note'
        iconColor='var(--icon-alertdialog-warning)'
        title={`ยังไม่ได้บันทึกผลของ ${row?.patient?.shortName ?? 'รายการนี้'} (HN ${row?.hn ?? '—'})`}
        subtitle='มีฉบับร่างที่ยังไม่ได้บันทึกในรายการปัจจุบัน — เลือกว่าจะทำอย่างไรก่อนไปรายการอื่น'
        onClose={() => setNavConfirm({ open: false, targetId: null })}
        footer={(
          <>
            <NeutralSubdueButton
              variant='outline'
              size='md'
              onClick={() => setNavConfirm({ open: false, targetId: null })}
            >
              ยกเลิก
            </NeutralSubdueButton>
            <DangerSubdueButton
              variant='outline'
              size='md'
              leadingIcon='delete'
              onClick={discardAndNav}
            >
              ทิ้งฉบับร่าง
            </DangerSubdueButton>
            <BrandButton
              size='md'
              leadingIcon='save'
              disabled={!canSaveBeforeNav}
              onClick={saveBeforeNav}
              title={canSaveBeforeNav
                ? 'บันทึก/ยืนยันฉบับร่างนี้ก่อน แล้วจึงไปรายการที่เลือก'
                : 'กรอก Findings · Impression · ประเภทผลตรวจ ให้ครบก่อนจึงจะบันทึกได้'}
            >
              บันทึกก่อนไป
            </BrandButton>
          </>
        )}
      >
        <p className='text-sm text-ink-secondary'>
          {selectedRaw?.status === 'performed' && !canSaveBeforeNav
            ? 'ฉบับร่างยังไม่ครบถ้วน (ต้องมี Findings, Impression และประเภทผลตรวจ) — บันทึกก่อนไปยังทำไม่ได้ เลือกกลับไปกรอกต่อ หรือทิ้งฉบับร่าง'
            : selectedRaw?.status === 'verified'
              ? '"บันทึกก่อนไป" จะเปิดหน้าต่างระบุเหตุผลการแก้ไขตามข้อกำหนด (TOR 1.12.6.3) ก่อนไปรายการถัดไป'
              : '"บันทึกก่อนไป" จะบันทึก/ยืนยันฉบับร่างนี้ แล้วเปิดรายการที่เลือกให้ทันที'}
        </p>
      </MiniDialog>

      {/* Template overwrite gate — a template click on non-empty text asks
          before wiping the half-written report. */}
      <AlertDialog
        open={tplConfirm.open}
        type='warning'
        title='แทนที่ข้อความเดิม?'
        description={`Template "${tplConfirm.tpl?.name ?? ''}" จะแทนที่ Technique / Findings / Impression และประเภทผลตรวจที่กรอกไว้ทั้งหมด`}
        confirmLabel='แทนที่ด้วย Template'
        cancelLabel='ยกเลิก'
        onConfirm={() => { applyTemplate(tplConfirm.tpl); setTplConfirm({ open: false, tpl: null }); }}
        onClose={() => setTplConfirm({ open: false, tpl: null })}
      />

      {/* ยกเลิกการรายงานผล — เหตุผลบังคับ (Kaebrain: Cancel Report). */}
      <MiniDialog
        open={cancelDialog.open}
        icon='undo'
        iconColor='var(--icon-alertdialog-destructive)'
        title='ยกเลิกการรายงานผล (Cancel Report)'
        subtitle='รายการจะกลับไปสถานะ "รอบันทึกผล" และการยกเลิกจะถูกเก็บในประวัติการแก้ไข'
        onClose={() => setCancelDialog({ open: false, reason: '' })}
        footer={(
          <>
            <NeutralSubdueButton variant='outline' size='md' onClick={() => setCancelDialog({ open: false, reason: '' })}>
              กลับ
            </NeutralSubdueButton>
            <DangerButton size='md' leadingIcon='undo' disabled={!cancelDialog.reason.trim()} onClick={commitCancelReport}>
              ยืนยันการยกเลิก
            </DangerButton>
          </>
        )}
      >
        <div className='mih-xrayresult-report flex w-full'>
          <SuggestibleTextarea
            label='เหตุผลการยกเลิก'
            required
            value={cancelDialog.reason}
            onChange={(e) => setCancelDialog((s) => ({ ...s, reason: e.target.value }))}
            placeholder='เช่น ผลถูกบันทึกสลับกับผู้ป่วยรายอื่น'
            suggestions={CANCEL_REASON_SUGGESTIONS}
            minChars={2}
            rows={3}
          />
        </div>
      </MiniDialog>

      {/* เหตุผลการแก้ไข — §1.12.6.3: owner edits a verified report only
          with a recorded reason. */}
      <MiniDialog
        open={amendDialog.open}
        icon='history_edu'
        title='บันทึกการแก้ไขผล'
        subtitle={`การแก้ไขจะถูกเก็บเป็นประวัติ: ${nowTime()} · ${currentUser.name}`}
        onClose={() => { clearQueuedNav(); setAmendDialog({ open: false, reason: '' }); }}
        footer={(
          <>
            <NeutralSubdueButton variant='outline' size='md' onClick={() => { clearQueuedNav(); setAmendDialog({ open: false, reason: '' }); }}>
              กลับ
            </NeutralSubdueButton>
            <BrandButton size='md' leadingIcon='save' disabled={!amendDialog.reason.trim()} onClick={commitAmend}>
              บันทึกการแก้ไข
            </BrandButton>
          </>
        )}
      >
        <div className='mih-xrayresult-report flex w-full'>
          <SuggestibleTextarea
            label='เหตุผลการแก้ไข'
            required
            value={amendDialog.reason}
            onChange={(e) => setAmendDialog((s) => ({ ...s, reason: e.target.value }))}
            placeholder='เช่น แก้ค่า cardiothoracic ratio หลังวัดซ้ำจากภาพ PA'
            suggestions={AMEND_REASON_SUGGESTIONS}
            minChars={2}
            rows={3}
          />
        </div>
      </MiniDialog>

      {/* บันทึกเป็น Template — §1.12.6.1/.6: unlimited templates, optionally
          bound to the current reading doctor. */}
      <MiniDialog
        open={tplDialog.open}
        icon='bookmark_add'
        title='บันทึกผลนี้เป็น Template'
        subtitle='Template ใหม่จะปรากฏในตัวเลือกของรายการตรวจนี้ทันที'
        onClose={() => setTplDialog({ open: false, name: '', bindToMe: true })}
        footer={(
          <>
            <NeutralSubdueButton variant='outline' size='md' onClick={() => setTplDialog({ open: false, name: '', bindToMe: true })}>
              กลับ
            </NeutralSubdueButton>
            <BrandButton size='md' leadingIcon='bookmark_add' disabled={!tplDialog.name.trim()} onClick={commitSaveTemplate}>
              บันทึก Template
            </BrandButton>
          </>
        )}
      >
        <TextInput
          id='mih-xrayresult-tpl-name'
          label='ชื่อ Template'
          required
          value={tplDialog.name}
          onChange={(v) => setTplDialog((s) => ({ ...s, name: v }))}
          placeholder='เช่น Chest PA — Normal (แบบย่อ)'
        />
        <label className='flex items-center text-sm text-ink' htmlFor='mih-xrayresult-tpl-bindme' style={{ gap: 'var(--dim-space-200)', cursor: 'pointer' }}>
          <input
            id='mih-xrayresult-tpl-bindme'
            type='checkbox'
            checked={tplDialog.bindToMe}
            onChange={(e) => setTplDialog((s) => ({ ...s, bindToMe: e.target.checked }))}
          />
          ผูกกับ {currentUser.name} เท่านั้น (ไม่ผูก = Template ส่วนกลางที่แพทย์ทุกท่านเห็น)
        </label>
      </MiniDialog>

      {/* เพิ่มคำช่วย — §1.12.6.6 */}
      <MiniDialog
        open={phraseDialog.open}
        icon='add_comment'
        title='เพิ่มคำช่วยใหม่'
        subtitle='คำช่วยใหม่จะแทรกได้จากแถบคำช่วย และโผล่ในคำแนะนำอัตโนมัติขณะพิมพ์'
        onClose={() => setPhraseDialog({ open: false, text: '' })}
        footer={(
          <>
            <NeutralSubdueButton variant='outline' size='md' onClick={() => setPhraseDialog({ open: false, text: '' })}>
              กลับ
            </NeutralSubdueButton>
            <BrandButton size='md' leadingIcon='add' disabled={!phraseDialog.text.trim()} onClick={commitSavePhrase}>
              บันทึกคำช่วย
            </BrandButton>
          </>
        )}
      >
        <TextInput
          id='mih-xrayresult-phrase-text'
          label='ข้อความคำช่วย'
          required
          value={phraseDialog.text}
          onChange={(v) => setPhraseDialog((s) => ({ ...s, text: v }))}
          placeholder='เช่น No significant interval change from the prior study.'
        />
      </MiniDialog>

      {/* พิมพ์ใบผลเอกซเรย์ — §1.12.6.5 print preview (legacy §2.3 items
          10–11). The @media print rules scope printing to the sheet only. */}
      <MiniDialog
        open={printOpen && Boolean(row)}
        icon='print'
        title='ใบรายงานผลการตรวจทางรังสีวิทยา — ตัวอย่างก่อนพิมพ์'
        width={780}
        onClose={() => setPrintOpen(false)}
        footer={(
          <>
            <NeutralSubdueButton variant='outline' size='md' onClick={() => setPrintOpen(false)}>
              ปิด
            </NeutralSubdueButton>
            <BrandButton size='md' leadingIcon='print' onClick={() => window.print()}>
              พิมพ์
            </BrandButton>
          </>
        )}
      >
        {/* ใบรายงานผลการตรวจทางรังสีวิทยา — now the shared
            <XrayReportSheet>, so the paper is identical wherever it is
            printed from (/xray/order, /preview/xray-sheets). The wrapper
            keeps this page's print-scoping class. */}
        {row ? (
          <div className='mih-xrayresult-print-area w-full'>
            <XrayReportSheet
              variant='report'
              order={{
                ...row,
                radiologistLicense: (XRAY_RADIOLOGIST_BY_ID[row.lockedBy]
                  ?? XRAY_RADIOLOGISTS.find((d) => d.name === row.radiologist))?.license,
              }}
              patient={{
                hn: row.hn,
                fullName: row.patient?.fullName,
                age: row.patient?.age,
                sex: row.patient?.sex,
                rightLabel: row.rightLabel,
              }}
              center='ศูนย์บริการสาธารณสุข 4 ดินแดง'
              printedAt={`${thaiToday()} ${row.verifiedAt || row.reportedAt || ''}`.trim()}
            />
          </div>
        ) : null}
      </MiniDialog>

      <SuccessToast
        open={toast.open}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
};

export default XrayResultPage;
