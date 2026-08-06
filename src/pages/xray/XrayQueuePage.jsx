import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Table, { EllipsisText } from '@/components/table/Table';
import StatusBadge from '@/components/badge/StatusBadge';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import { computeQuickRange, computeQuickSingle } from '@/components/popup/DateFilterPopup';
import CheckboxBox from '@/components/checkbox/CheckboxBox';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import AlertDialog from '@/components/popup/AlertDialog';
import SuccessToast from '@/components/toast/SuccessToast';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Pagination from '@/components/pagination/Pagination';
import { Icon } from '@/components/icons/Icon';
import {
  XRAY_ORDERS, XRAY_STATUSES, XRAY_STATUS_BY_KEY, XRAY_EXCEPTION_BY_KEY,
  XRAY_URGENCIES, XRAY_LOCATIONS, XRAY_RESULT_TYPES, withExamLabel, xrayHistoryFor,
} from '@/data/xrayOrders';
import { XRAY_MODALITIES, XRAY_VIEWS, duplicateWarning } from '@/data/xrayCatalog';
import { XRAY_RADIOLOGISTS, XRAY_RADIOGRAPHERS } from '@/data/xrayResultTemplates';
import XrayDetailPanel from '@/pages/xray/XrayDetailPanel';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';

/* งานรังสีวินิจฉัย (X-ray) — ลำดับการตรวจผู้ป่วย. The radiology
   department's own working screen: every request the department owes
   somebody, from the moment a doctor's order lands to the moment a
   verified report is released back.

   Grounded in three sources, not invented:

     • TOR ภาคผนวก ก §1.12 (docs/tor-checklist.html) — cited inline:
       §1.12.1 (คิวเข้ารับบริการ), §1.12.2 (ค้นหา HN/ชื่อ/เลขบัตร),
       §1.12.5.6 (รังสีแพทย์แก้ไขรายละเอียดการส่งตรวจจากส่วนงานอื่น —
       the amend-in-place row action), §1.12.6.2 (ค้นหารายชื่อผู้ที่ได้รับ
       การเอกซเรย์), §1.12.6.5 (พิมพ์ใบผลเอกซเรย์), §1.12.6.8 (ค้นหาผล
       จำแนกตามชนิดการตรวจ / ประเภทผล / คำในผลตรวจ / ช่วงเวลา / ผู้อ่านผล).
     • คู่มืออบรมระบบงานรังสีวินิจฉัย สำนักอนามัย §2.2 "ลำดับการตรวจผู้ป่วย"
       — the 5-Tab-sheet worklist ("การเรียงลำดับงานตามขั้นตอนการทำงาน
       ของระบบ"): those tab sheets are exactly XRAY_STATUSES rendered as
       the sticky tab strip here.
     • คู่มือ MyHOSPITAL งานรังสีวิทยา (X-Ray) — the row actions map 1:1
       onto its screens: รับ Request แผนกอื่น (เลือกเจ้าหน้าที่รับ Request)
       · บันทึกผล X-Ray · ยืนยันผล X-Ray · ปฏิเสธรับ Request (Cancel
       Request) · ยกเลิกการรายงานผล (Cancel Report) · ประวัติยกเลิก
       รายการตรวจ (the exception tabs). */

/* Chrome-free reason textarea — per CLAUDE.md "No browser-default input
   chrome": the textarea inside the reject/cancel dialog owns its border
   via tokens, so every UA default (focus ring, appearance, shadow) is
   stripped with !important. The caret stays VISIBLE here — unlike a
   search bar, the user is typing a free-text reason and needs to see
   where the insertion point is. The SAME class also dresses the amend
   dialog's native <select>/<input> controls (§1.12.5.6 below) — one
   strip mechanism for every native control this page owns, per the
   CLAUDE.md rule against parallel injection mechanisms. Idempotent
   module-load injection so HMR never leaves a stale <style> behind. */
if (typeof document !== 'undefined') {
  const styleId = 'mih-xrayq-reason-style';
  const css = `
.mih-xrayq-reason,
.mih-xrayq-reason:focus,
.mih-xrayq-reason:focus-visible {
  outline: none !important;
  box-shadow: none !important;
  -webkit-appearance: none !important;
  appearance: none !important;
  background: var(--surface-card-100, #FFFFFF) !important;
  border: var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary, #E2E4E6) !important;
}
.mih-xrayq-reason:focus,
.mih-xrayq-reason:focus-visible {
  border-color: var(--border-brandPrimary-default, #007549) !important;
}
.mih-xrayq-reason::placeholder {
  color: var(--text-content-quaternary, #ADB2B7);
  opacity: 1; /* Firefox defaults to 0.54 */
}
/* Bulk-selection checkboxes — the real <input type=checkbox> is sr-only
   (CheckboxBox paints the visual), so the browser's focus ring lands on
   an invisible box. Re-draw it on the painted sibling so keyboard users
   can SEE where focus is (WCAG 2.4.7 Focus Visible). Same idempotent
   injection, same .mih-xrayq-* namespace — no second mechanism. */
.mih-xrayq-check-box { border-radius: var(--dim-radius-100, 4px); }
.mih-xrayq-check input:focus-visible ~ .mih-xrayq-check-box {
  outline: var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-default, #007549);
  outline-offset: var(--dim-stroke-200, 2px); /* stroke token — no 2px space token exists */
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

const breadcrumb = ['งานรังสีวินิจฉัย (X-ray)'];

const PAGE_SIZE = 20;

/* Seed rows — decorated once via withExamLabel so columns read resolved
   labels. State below owns a LOCAL copy; the imported XRAY_ORDERS array
   is never written back (module data is shared mock). */
const ROWS = XRAY_ORDERS.map(withExamLabel);

/* ── แก้ไขรายละเอียดการส่งตรวจ (TOR §1.12.5.6) ──────────────────────────
   "สามารถให้รังสีแพทย์แก้ไขรายละเอียดการส่งตรวจจากส่วนงานอื่นเพื่อให้คำสั่ง
   สมบูรณ์มากขึ้นได้" — the OPPOSITE direction of ปฏิเสธรับ Request: instead
   of bouncing an incomplete order back to the clinic (the patient is
   standing at the door — a bounce costs them a whole extra visit), the
   radiologist completes it IN PLACE and the study proceeds.

   What may be amended: the clinically-safe details — ท่าถ่าย, ความเร่งด่วน,
   อาการโดยย่อ, การวินิจฉัย, ประวัติการแพ้, ประจำเดือน/ตั้งครรภ์ (the
   radiographer routinely collects those two at the door — exactly why this
   requirement exists), and Note.
   What may NOT: examId / HN / XN / ราคา / ยอดเบิก / คลินิก-แพทย์ผู้สั่ง —
   changing the exam or the patient is a NEW order, not an amendment (and
   money follows the exam definition, §1.12.4.2). Reported/verified rows
   are excluded entirely: §1.12.6.3 locks them behind the report flow. */
const AMENDABLE_STATUSES = ['requested', 'scheduled', 'accepted', 'performed'];

const VIEW_BY_KEY = Object.fromEntries(XRAY_VIEWS.map((v) => [v.key, v]));

/* Same answer set as the order screen's §1.12.5.3 pregnancy block. */
const PREGNANCY_STATUSES = ['ตั้งครรภ์', 'ไม่ตั้งครรภ์', 'ไม่แน่ใจ', 'หมดประจำเดือน'];

/* Which amendable fields actually differ — feeds the amendment note so
   the worklist badge can say WHAT changed, not just that something did. */
const AMEND_FIELD_LABELS = {
  view: 'ท่าถ่าย',
  urgency: 'ความเร่งด่วน',
  clinicalSummary: 'อาการโดยย่อ',
  diagnosis: 'การวินิจฉัย',
  allergy: 'ประวัติการแพ้',
  pregnancy: 'ประจำเดือน/ตั้งครรภ์',
  note: 'Note',
};

const diffAmend = (row, d) => {
  const changed = [];
  if (d.view !== row.view) changed.push(AMEND_FIELD_LABELS.view);
  if (d.urgency !== row.urgency) changed.push(AMEND_FIELD_LABELS.urgency);
  if (d.clinicalSummary.trim() !== (row.clinicalSummary ?? '').trim()) changed.push(AMEND_FIELD_LABELS.clinicalSummary);
  if (d.diagnosis.trim() !== (row.diagnosis ?? '').trim()) changed.push(AMEND_FIELD_LABELS.diagnosis);
  if (d.allergyHas !== Boolean(row.allergy?.has)
    || d.allergyAgent.trim() !== (row.allergy?.agent ?? '').trim()
    || d.allergySymptom.trim() !== (row.allergy?.symptom ?? '').trim()) changed.push(AMEND_FIELD_LABELS.allergy);
  if ((d.pregStatus ?? null) !== (row.pregnancy?.status ?? null)
    || d.pregLmp.trim() !== (row.pregnancy?.lmp ?? '').trim()) changed.push(AMEND_FIELD_LABELS.pregnancy);
  if (d.note.trim() !== (row.note ?? '').trim()) changed.push(AMEND_FIELD_LABELS.note);
  return changed;
};

/* ─────────── Mock clock ─────────── */

/* orderedAt is a wall-clock 'HH:MM' string and the mock day's latest
   timestamps run to ~12:15, so aging is measured against a fixed NOW
   (12:30) rather than the real clock — a real deployment reads the order
   timestamp. Fixed also means the mock renders identically on every load
   (no Date.now() drift), mirroring LabQueuePage. */
const NOW_MINUTES = 12 * 60 + 30;
const NOW_CLOCK = '12:30';

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm ?? '').split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};
const ageMinutes = (row) => {
  const t = toMinutes(row.orderedAt);
  return t == null ? null : Math.max(0, NOW_MINUTES - t);
};
/* SLA (urgency.slaMinutes) is time-to-EXPOSURE — a STAT film must be shot
   within 30 minutes — so the clock stops at performedAt and never flags
   scheduled rows (they are waiting for their appointment day, not for a
   room) or exception rows (they left the pipeline). */
const isOverdue = (row) =>
  !row.exception
  && !row.performedAt
  && row.status !== 'scheduled'
  && (ageMinutes(row) ?? 0) > row.slaMinutes;
const formatAge = (mins) => {
  if (mins == null) return '';
  if (mins < 60) return `${mins} นาที`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} ชม.` : `${h} ชม. ${m} น.`;
};

/* ─────────── Date-range filter (ช่วงวันที่ส่งตรวจ, §1.12.6.8) ───────────

   The FilterDateTag chip must actually subset rows — a control that looks
   live but filters nothing violates Nielsen #1 (visibility of system
   status) and teaches users to distrust every filter on the page.

   How the mock stores dates: `orderedAt` is wall-clock 'HH:MM' with no
   calendar date — every order in the mock belongs to ONE working day,
   which we treat as "today" (matching the chip's default วันนี้ and the
   fixed 12:30 clock above). `scheduledAt` on นัดตรวจ rows DOES carry a
   Thai calendar date ('5 ส.ค. 2569 09:00'), so appointments are the one
   place a different day genuinely exists in the data.

   A row matches the selected range when EITHER date falls inside it:
     • its order day (today for every mock row), OR
     • its appointment day (scheduled rows only)
   so the default วันนี้ keeps the whole worklist visible (everything was
   ordered today), while picking a future day answers the radiographer's
   real question "ใครนัดมาวันนั้นบ้าง". Ranges that cover neither show the
   date-specific empty state — correct behaviour, not a bug, because the
   mock really has no rows on those days. */
const THAI_MONTH_INDEX = {
  'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3, 'พ.ค.': 4, 'มิ.ย.': 5,
  'ก.ค.': 6, 'ส.ค.': 7, 'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11,
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/* '5 ส.ค. 2569 09:00' → Date(2026, 7, 5). BE year − 543 = CE. */
const parseThaiDate = (s) => {
  const m = /^(\d{1,2})\s+(\S+)\s+(\d{4})/.exec(String(s ?? '').trim());
  if (!m) return null;
  const month = THAI_MONTH_INDEX[m[2]];
  if (month == null) return null;
  return new Date(Number(m[3]) - 543, month, Number(m[1]));
};

/* The mock worklist day — resolved once per session so every row's order
   day and the chip's วันนี้ agree. */
const MOCK_DAY = startOfDay(new Date());

/* FilterDateTag value → inclusive {start, end} day pair, resolved through
   the SAME computeQuickSingle/computeQuickRange the popup itself uses so
   the chip label and the filter can never disagree on what "สัปดาห์นี้"
   means. Returns null for an unresolvable value (→ no date filtering). */
const resolveDateRange = (value) => {
  if (!value) return null;
  if (value.quick === 'custom') {
    if (value.tab === 'single' && value.single) {
      const day = startOfDay(value.single);
      return { start: day, end: day };
    }
    if (value.tab === 'range' && value.range?.start && value.range?.end) {
      return { start: startOfDay(value.range.start), end: startOfDay(value.range.end) };
    }
    return null;
  }
  const single = computeQuickSingle(value.quick);
  if (single) return { start: single, end: single };
  const range = computeQuickRange(value.quick);
  return range ? { start: startOfDay(range.start), end: startOfDay(range.end) } : null;
};

const rowMatchesDateRange = (row, range) => {
  if (!range) return true;
  const inRange = (d) => d != null && d >= range.start && d <= range.end;
  if (inRange(MOCK_DAY)) return true; /* order day — today for every mock row */
  const scheduledDay = row.scheduledAt ? parseThaiDate(row.scheduledAt) : null;
  return inRange(scheduledDay);
};

/* ─────────── Barcode / keyboard-first search ───────────

   Radiographers scan the XN barcode printed on the ใบส่งตรวจ; the scanner
   just types 'X69-0412' + Enter into whatever holds focus. Everything the
   scanner needs is therefore keyboard-only: the search focuses on mount,
   `/` refocuses it from anywhere, Enter on an unambiguous match opens the
   row directly. One XN can span several rows (multi-exam order, e.g.
   ORD-X405) — opening ANY of them is right because the detail panel shows
   the whole order (§1.12.5.4). */
const XN_PATTERN = /^X\d{2}-\d{4}$/i;

/* ─────────── Tabs + summary ─────────── */

/* Which tab a row belongs to. Exception rows (ปฏิเสธรับ Request / ยกเลิก)
   are pulled OUT of the pipeline tabs — a rejected request sitting in
   "รอรับรายการ" would look actionable when it is actually waiting on the
   ordering doctor — and collected under the manual's ประวัติยกเลิก
   buckets instead. `reportCancelled` rides with ยกเลิกรายการตรวจ because
   the manual files both under ประวัติยกเลิกรายการตรวจ (p.9). */
const rowInTab = (row, key) => {
  if (key === 'all') return true;
  if (key === 'rejected') return row.exception === 'rejected';
  if (key === 'cancelled') return row.exception === 'cancelled' || row.exception === 'reportCancelled';
  return !row.exception && row.status === key;
};

/* Tabs = 'ทั้งหมด' + the legacy manual's pipeline Tab sheets (§2.2) with
   live counts + the two exception buckets. Counts rebuild from liveRows
   so every row action moves the numbers immediately (TOR §1.12.1). */
const buildTabs = (rows) => [
  { key: 'all', label: 'ทั้งหมด', icon: 'radiology', count: rows.length },
  ...XRAY_STATUSES.map((s) => ({
    key: s.key,
    label: s.short,
    icon: s.icon,
    count: rows.filter((r) => rowInTab(r, s.key)).length,
  })),
  { key: 'rejected', label: 'ปฏิเสธรับ Request', icon: 'block', count: rows.filter((r) => rowInTab(r, 'rejected')).length },
  { key: 'cancelled', label: 'ยกเลิกรายการตรวจ', icon: 'cancel', count: rows.filter((r) => rowInTab(r, 'cancelled')).length },
];

/* Summary cards — what a radiology lead actually watches: the four
   places work piles up down the pipeline, plus the one result class that
   must interrupt somebody (ผิดปกติเร่งด่วน, §1.12.6.9). Built from
   liveRows so transitions update them live. */
const buildSummaryCards = (rows) => [
  { key: 'requested', label: 'รอรับ Request', value: rows.filter((r) => rowInTab(r, 'requested')).length, indicator: 'คำขอใหม่จากคลินิก', color: 'info', icon: 'assignment' },
  { key: 'accepted', label: 'รอตรวจ', value: rows.filter((r) => rowInTab(r, 'accepted')).length, indicator: 'รับ Request แล้ว รอถ่าย', color: 'brand', icon: 'schedule' },
  { key: 'performed', label: 'รอบันทึกผล', value: rows.filter((r) => rowInTab(r, 'performed') || r.exception === 'reportCancelled').length, indicator: 'ถ่ายแล้ว รอรายงาน', color: 'inprogress', icon: 'edit_note' },
  { key: 'reported', label: 'รออ่าน/ยืนยันผล', value: rows.filter((r) => rowInTab(r, 'reported')).length, indicator: 'แพทย์ยังดูผลไม่ได้', color: 'positive', icon: 'fact_check' },
  { key: 'urgent', label: 'ผิดปกติเร่งด่วนวันนี้', value: rows.filter((r) => r.resultType === 'abnormalUrgent').length, indicator: 'ต้องแจ้งแพทย์ผู้ส่งตรวจ', color: 'destructive', icon: 'e911_emergency' },
];

/* ─────────── Patient avatar ─────────── */

/* 36px avatar chip — same shape/size as QueuePage.jsx's `Avatar` cell
   (Figma 3185:144272 row rhythm), falling back to the name initial when
   the portrait fails. Fallback surface aliases the neutral button token
   (#4D5358) — this branch's index.css has no dedicated avatar-fallback
   token yet. */
const PatientAvatar = ({ patient }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div
      className='shrink-0 flex items-center justify-center text-white overflow-hidden'
      style={{
        width: 36,
        height: 36,
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: 'var(--surface-neutralButton-default, #4D5358)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
        lineHeight: 1,
      }}
      aria-hidden
    >
      {patient?.avatarUrl && !imgError ? (
        /* alt='' + aria-hidden ON PURPOSE (WCAG 1.1.1): the patient's name
           is the adjacent cell text, so a named alt would make screen
           readers announce every patient twice. Decorative, keep it empty
           — do NOT "fix" this into alt={name}. */
        <img
          src={patient.avatarUrl}
          alt=''
          aria-hidden='true'
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        patient?.shortName?.trim().charAt(0) || '?'
      )}
    </div>
  );
};

/* ─────────── Bulk-selection checkbox ───────────

   The MIH X-Ray manual's own รับ Request screen is checkbox-driven — a
   radiographer accepts a whole batch of incoming requests at once, not
   one row at a time (Nielsen #7 flexibility & efficiency). The shared
   <Checkbox> names its input from visible label text, which a 52px table
   cell has no room for, so this thin wrapper keeps CheckboxBox's visual
   contract and labels the sr-only native input via aria-label instead
   (WCAG 4.1.2 Name, Role, Value). stopPropagation on click AND keydown —
   Table's Row treats both as "open the detail panel", which must never
   fire from a selection toggle. */
const SelectCheckbox = ({ checked, indeterminate = false, disabled = false, label, title, onChange }) => {
  const inputRef = useRef(null);
  /* Native indeterminate is property-only (no attribute) — set it via ref
     so AT announces "mixed" when only part of the page is selected. */
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <label
      className='mih-xrayq-check inline-flex items-center justify-center'
      title={title}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <input
        ref={inputRef}
        type='checkbox'
        className='sr-only'
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange && onChange(e.target.checked)}
      />
      <span className='mih-xrayq-check-box inline-flex'>
        <CheckboxBox checked={checked} disabled={disabled} />
      </span>
    </label>
  );
};

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:xray-queue';

/* PrimarySearch suggestion/history item shape (Figma 3345:2981 — two
   colourful pills + label + sublabel), mirroring LabQueuePage. XN leads
   the pills because that is the number stamped on every film envelope. */
const rowToSearchItem = (row) => ({
  id: row.id,
  label: row.patient.shortName,
  sublabel: `${row.examLabel} · ${row.orderingLocation}`,
  value: row.xn,
  badges: [
    { label: row.xn, tone: 'indigo' },
    { label: row.hn, tone: 'purple' },
  ],
  avatarSrc: row.patient.avatarUrl,
});

/* Free-text search — TOR §1.12.2 (HN / ชื่อ-สกุล / เลขบัตรประชาชน) plus
   เลข XN, exam name and ordering doctor. It ALSO matches words inside
   findings/impression: §1.12.6.8 requires searching results by "คำที่
   ปรากฏในผลตรวจ", and this one box is where that requirement lands —
   type "cavitary" or "fatty liver" and the reported studies surface. */
const matchesQuery = (row, q) => {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const fields = [
    row.xn, row.hn, row.orderId,
    row.patient.shortName, row.patient.fullName, row.patient.nationalId,
    row.examLabel, row.examNameEn, row.orderedBy,
    row.findings, row.impression,
  ];
  return fields.some((f) => String(f ?? '').toLowerCase().includes(needle));
};

/* ─────────── Action-bar filter options ─────────── */

/* Together these dropdowns satisfy §1.12.6.8 — ค้นหาผลจำแนกตาม ชนิดการ
   ตรวจ (modality) / ประเภทผลตรวจ / ช่วงเวลาที่ตรวจ (date tag) / ผู้อ่าน
   ผลตรวจ — layered on top of the free-text box above. */
const MODALITY_OPTIONS = [
  { value: 'all', label: 'ทุกชนิดการตรวจ' },
  ...XRAY_MODALITIES.map((m) => ({ value: m.key, label: `${m.thai} (${m.code})` })),
];

const URGENCY_OPTIONS = [
  { value: 'all', label: 'ทุกระดับความเร่งด่วน' },
  ...XRAY_URGENCIES.map((u) => ({ value: u.key, label: u.thai })),
];

/* คลินิกที่ขอตรวจ — §1.12.5.2's requesting clinic, the same ศบส.
   departments the OPD side routes to. */
const LOCATION_OPTIONS = [
  { value: 'all', label: 'ทุกคลินิกที่ขอตรวจ' },
  ...XRAY_LOCATIONS.map((l) => ({ value: l, label: l })),
];

const RESULT_TYPE_OPTIONS = [
  { value: 'all', label: 'ทุกประเภทผล' },
  ...XRAY_RESULT_TYPES.map((r) => ({ value: r.key, label: r.thai })),
];

/* แพทย์ผู้อ่านผล — §1.12.6.8 "ผู้อ่านผลตรวจ". Options come from the
   reader registry (setup screen), matched against the name stamped on
   the row when the report was keyed. */
const RADIOLOGIST_OPTIONS = [
  { value: 'all', label: 'ทุกแพทย์ผู้อ่านผล' },
  ...XRAY_RADIOLOGISTS.map((r) => ({ value: r.name, label: r.name })),
];

/* สถานะ dropdown — a second way to drive the SAME activeTab the sticky
   tab strip controls, not a separate filter dimension (lab precedent). */
const STATUS_OPTIONS = [
  { value: 'all', label: 'ทุกสถานะ' },
  ...XRAY_STATUSES.map((s) => ({ value: s.key, label: s.thai })),
  { value: 'rejected', label: 'ปฏิเสธรับ Request' },
  { value: 'cancelled', label: 'ยกเลิกรายการตรวจ' },
];

/* ─────────── Sorting ─────────── */

const STATUS_RANK = Object.fromEntries(XRAY_STATUSES.map((s, i) => [s.key, i]));
const RESULT_RANK = { abnormalUrgent: 0, abnormal: 1, inconclusive: 2, normal: 3 };

const sortValue = (row, key) => {
  switch (key) {
    case 'urgency':    return row.urgencyRank;
    case 'patient':    return row.patient.shortName;
    case 'exam':       return row.examLabel;
    case 'orderedAt':  return toMinutes(row.orderedAt) ?? 0;
    case 'aging':      return ageMinutes(row) ?? 0;
    /* Exception rows sort after every pipeline stage — they are history,
       not queue position. */
    case 'status':     return row.exception ? 90 : STATUS_RANK[row.status] ?? 99;
    case 'resultType': return row.resultType ? RESULT_RANK[row.resultType] ?? 8 : 9;
    case 'location':   return row.orderingLocation;
    case 'orderedBy':  return row.orderedBy;
    case 'xn':         return row.xn;
    default:           return row[key] ?? '';
  }
};

const COLLATOR = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });

const sortRows = (rows, sortConfig, statFirst) => {
  const base = sortConfig.key ? [...rows] : rows;
  if (sortConfig.key) {
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    base.sort((a, b) => {
      const av = sortValue(a, sortConfig.key);
      const bv = sortValue(b, sortConfig.key);
      if (typeof av === 'number' && typeof bv === 'number') return sign * (av - bv);
      return sign * COLLATOR.compare(String(av), String(bv));
    });
  }
  /* STAT เด้งขึ้นบนสุด — applied AFTER the chosen column sort so urgent
     work floats to the top without destroying the ordering underneath
     (stable sort keeps ties in the sorted order). urgency.rank: STAT=0. */
  if (!statFirst) return base;
  return [...base].sort((a, b) => a.urgencyRank - b.urgencyRank);
};

/* ─────────── Cell fragments ─────────── */

const subText = { fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' };
const cellText = { fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' };

/* Filled Material Symbols rendering — <Icon>'s font fallback draws
   outlined glyphs; the FILL axis is opted into per-glyph the same way
   StatusBadge's Sym does it (fontVariationSettings via style). */
const FILLED_SYMBOL = { fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" };

/* Warning glyph with Thai tooltip + aria-label — the row-level "do not
   miss this" affordances (§1.12.5.3 / referral). */
const WarnGlyph = ({ icon, color, label, fill }) => (
  <span className='shrink-0 inline-flex' role='img' aria-label={label} title={label} style={{ color }}>
    <Icon name={icon} size={14} style={fill ? FILLED_SYMBOL : undefined} />
  </span>
);

/* ─────────── Columns ─────────── */

/* Column set per the legacy §2.2 grid + TOR §1.12.5.2/5.4 field lists.
   `onAction` closes over page state, so columns are built inside the
   component via useMemo. `dupFor` feeds the §1.12.5.9 repeat-warning
   glyph from the same helper the order screen uses. */
const buildColumns = (onAction, dupFor) => [
  /* เลข XN — §1.12.5.2 "ระบบ Automatic Generate เลข XN". One XN per
     request; the orderId beneath ties multi-exam rows together. */
  {
    key: 'xn', label: 'เลข XN', width: 120,
    render: (row) => (
      <div className='flex flex-col min-w-0' style={{ gap: 2 }}>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)' }}>
          {row.xn}
        </span>
        <span style={subText}>{row.orderId}</span>
      </div>
    ),
  },
  /* ผู้รับบริการ — HN + ชื่อ in one cell, read together (verify 2
     identifiers before irradiating anyone). */
  {
    key: 'patient', label: 'ผู้รับบริการ', flex: true, minWidth: 220,
    render: (row) => (
      <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
        <PatientAvatar patient={row.patient} />
        <div className='flex flex-col min-w-0'>
          <MaskedWorklistName
            name={row.patient.shortName}
            recordKey={row.hn || row.patient?.hn}
            className='min-w-0 truncate'
          />
          <span style={subText}>HN {row.hn} · {row.vn}</span>
        </div>
      </div>
    ),
  },
  /* รายการตรวจ + ตำแหน่ง/ท่าถ่าย (§1.12.5.4) + the warning glyphs:
       flag        — contrast exam on a patient with a recorded contrast
                     allergy (§1.12.5.3). The ORD-X413 CT row must be
                     unmissable, so the glyph is red and filled.
       pregnant_woman — ตั้งครรภ์ (§1.12.5.3) before any abdominal beam.
       output      — referral-only modality, ส่งตรวจภายนอกไป รพ. กทม.
       content_copy — repeat inside the §1.12.5.9 warning window,
                     resolved by the same duplicateWarning() the order
                     screen calls so the two never disagree. */
  {
    key: 'exam', label: 'รายการตรวจ', flex: true, minWidth: 230,
    render: (row) => {
      const dup = dupFor(row);
      return (
        <div className='flex flex-col min-w-0' style={{ gap: 2 }}>
          <span className='inline-flex items-center min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
            <EllipsisText text={row.examLabel} />
            {row.contrast && row.allergy?.has && (
              <WarnGlyph icon='flag' fill={1} color='var(--text-statusbadge-error, #B91C1C)' label={`แพ้${row.allergy.agent} — ${row.allergy.symptom || 'ไม่ระบุอาการ'}`} />
            )}
            {row.pregnancy?.status === 'ตั้งครรภ์' && (
              <WarnGlyph icon='pregnant_woman' color='var(--text-statusbadge-warning, #C2410C)' label={`ตั้งครรภ์ (LMP ${row.pregnancy.lmp ?? '—'}) — ระวังการฉายรังสี`} />
            )}
            {row.referralOnly && (
              <WarnGlyph icon='output' color='var(--text-statusbadge-warning, #C2410C)' label='ส่งตรวจภายนอก (Referral) — ไม่ได้ตรวจในศูนย์ฯ' />
            )}
            {dup && (
              <WarnGlyph icon='content_copy' color='var(--text-statusbadge-warning, #C2410C)' label={dup.message} />
            )}
            {/* §1.12.5.6 — the order was amended in place by a รังสีแพทย์;
                the tooltip replays the amendment trail (when · who · what
                changed) so the ordering doctor can audit at a glance. */}
            {row.amendedByRadiology && (
              <WarnGlyph
                icon='edit'
                color='var(--text-statusbadge-info, #1D4ED8)'
                label={`รังสีแพทย์แก้ไขรายละเอียดการส่งตรวจ: ${(row.amendments ?? []).map((a) => `${a.at} ${a.by} — ${a.reason}`).join(' · ')}`}
              />
            )}
          </span>
          <span style={subText}>
            {row.modalityLabel} · {row.regionLabel} · ท่า {row.view}
          </span>
        </div>
      );
    },
  },
  /* ความเร่งด่วน — §1.12.5.4's first column. STAT reads red (error). */
  {
    key: 'urgency', label: 'ความเร่งด่วน', width: 116,
    render: (row) => {
      if (row.urgency === 'stat') return <StatusBadge style='error' size='small'>STAT</StatusBadge>;
      if (row.urgency === 'urgent') return <StatusBadge style='warning' size='small'>ด่วน</StatusBadge>;
      return <StatusBadge style='neutral' size='small'>ปกติ</StatusBadge>;
    },
  },
  /* คลินิกที่ขอตรวจ — §1.12.5.2. */
  {
    key: 'location', label: 'คลินิกที่ขอตรวจ', width: 168,
    render: (row) => (
      <span className='block min-w-0' style={cellText}>
        <EllipsisText text={row.orderingLocation} />
      </span>
    ),
  },
  /* แพทย์ผู้ส่งตรวจ — §1.12.5.2; who to phone about an incomplete order.
     (For incomplete orders the radiology side first tries the §1.12.5.6
     amend-in-place action; reject is the fallback when only the ordering
     doctor can fix it.) */
  {
    key: 'orderedBy', label: 'แพทย์ผู้ส่งตรวจ', width: 160,
    render: (row) => (
      <span className='block min-w-0' style={cellText}>
        <EllipsisText text={row.orderedBy} />
      </span>
    ),
  },
  /* วันเวลาส่ง/นัด — §1.12.5.2 "วันที่ส่งหรือนัด". A scheduled row shows
     its appointment slot beneath (legacy §2.2 การนัดตรวจ). */
  {
    key: 'orderedAt', label: 'วันเวลาส่ง/นัด', width: 132,
    render: (row) => (
      <div className='flex flex-col' style={{ gap: 2 }}>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
          {row.orderedAt}
        </span>
        {row.scheduledAt && (
          <span style={{ ...subText, color: 'var(--text-statusbadge-warning, #C2410C)' }}>
            นัด {row.scheduledAt}
          </span>
        )}
      </div>
    ),
  },
  /* รอมานาน — aging vs urgency SLA; turns red past SLA. The clock stops
     at performedAt (SLA is time-to-exposure — see isOverdue). */
  {
    key: 'aging', label: 'รอมานาน', width: 128,
    render: (row) => {
      if (row.exception) return <span style={subText}>—</span>;
      if (row.status === 'scheduled') return <span style={subText}>รอถึงวันนัด</span>;
      if (row.performedAt) {
        const took = (toMinutes(row.performedAt) ?? 0) - (toMinutes(row.orderedAt) ?? 0);
        return <span style={subText}>ถ่ายแล้ว · ใช้เวลา {formatAge(Math.max(0, took))}</span>;
      }
      const age = ageMinutes(row);
      const overdue = isOverdue(row);
      return (
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            color: overdue ? 'var(--text-statusbadge-error, #B91C1C)' : 'var(--text-content-secondary)',
            fontWeight: overdue ? 'var(--type-weight-medium)' : 'var(--type-weight-regular)',
          }}
        >
          {overdue ? `เกิน SLA · ${formatAge(age)}` : formatAge(age)}
        </span>
      );
    },
  },
  /* สถานะ — derived from the status KEY at render time (not the baked
     statusLabel) so a row action re-labels instantly. An exception
     overrides the pill: "ถูกปฏิเสธ" is the fact the department needs to
     see first (manual pp.8–9). */
  {
    key: 'status', label: 'สถานะ', width: 150,
    render: (row) => {
      if (row.exception) {
        const ex = XRAY_EXCEPTION_BY_KEY[row.exception];
        return <StatusBadge style={ex?.color ?? 'error'} size='small' icon={ex?.icon}>{ex?.thai ?? row.exception}</StatusBadge>;
      }
      const s = XRAY_STATUS_BY_KEY[row.status];
      return <StatusBadge style={s?.color ?? 'neutral'} size='small'>{s?.short ?? row.status}</StatusBadge>;
    },
  },
  /* ประเภทผล — §1.12.6.9 (ปกติ/ผิดปกติ/ผิดปกติเร่งด่วน/ไม่ชัดเจน). */
  {
    key: 'resultType', label: 'ประเภทผล', width: 136,
    render: (row) => (
      row.resultType
        ? <StatusBadge style={row.resultTypeColor} size='small'>{row.resultTypeLabel}</StatusBadge>
        : <span style={subText}>—</span>
    ),
  },
  /* การจัดการ — the department's real work, gated by pipeline position
     (MyHOSPITAL screens, one action per screen):
       requested → รับ Request / ปฏิเสธรับ Request
       accepted  → บันทึกว่าถ่ายแล้ว
       performed → บันทึกผล (result screen)
       reported  → ยืนยันผล (result screen, verify mode)
       verified  → ดูผล + พิมพ์ใบผลเอกซเรย์ (§1.12.6.5)
       ก่อนรายงานผล → แก้ไขรายละเอียดการส่งตรวจ (§1.12.5.6)
       ก่อนยืนยัน → ยกเลิกรายการตรวจ (Cancel Request) */
  {
    key: 'actions', label: 'การจัดการ', width: 184, sortable: false, align: 'center',
    render: (row) => {
      if (row.exception) return null;
      const buttons = [];
      if (row.status === 'requested' || row.status === 'scheduled') {
        buttons.push({ kind: 'accept', icon: 'how_to_reg', label: `รับ Request ${row.xn}`, title: 'รับ Request' });
        buttons.push({ kind: 'reject', icon: 'block', label: `ปฏิเสธรับ Request ${row.xn}`, title: 'ปฏิเสธรับ Request' });
      }
      if (row.status === 'accepted') {
        buttons.push({ kind: 'shot', icon: 'radiology', label: `บันทึกว่าถ่ายแล้ว ${row.xn}`, title: 'บันทึกว่าถ่ายแล้ว' });
      }
      if (row.status === 'performed') {
        buttons.push({ kind: 'report', icon: 'edit_note', label: `บันทึกผล ${row.xn}`, title: 'บันทึกผล' });
      }
      if (row.status === 'reported') {
        buttons.push({ kind: 'verify', icon: 'fact_check', label: `ยืนยันผล ${row.xn}`, title: 'ยืนยันผล' });
      }
      /* §1.12.5.6 — amend-in-place, available until the report exists
         (requested/scheduled/accepted/performed); reported/verified are
         locked by the §1.12.6.3 report flow, never editable from here. */
      if (AMENDABLE_STATUSES.includes(row.status)) {
        buttons.push({ kind: 'amend', icon: 'edit', label: `แก้ไขรายละเอียดการส่งตรวจ ${row.xn}`, title: 'แก้ไขรายละเอียดการส่งตรวจ' });
      }
      if (row.status === 'verified') {
        buttons.push({ kind: 'view', icon: 'visibility', label: `ดูผล ${row.xn}`, title: 'ดูผล' });
        buttons.push({ kind: 'print', icon: 'print', label: `พิมพ์ใบผลเอกซเรย์ ${row.xn}`, title: 'พิมพ์ใบผลเอกซเรย์' });
      } else {
        buttons.push({ kind: 'cancel', icon: 'cancel', label: `ยกเลิกรายการตรวจ ${row.xn}`, title: 'ยกเลิกรายการตรวจ' });
      }
      return (
        <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-100)' }}>
          {buttons.map((b) => (
            <NeutralSubdueIconButton
              key={b.kind}
              icon={b.icon}
              variant='outline'
              size='sm'
              aria-label={b.label}
              title={b.title}
              onClick={(e) => { e.stopPropagation(); onAction(b.kind, row); }}
            />
          ))}
        </div>
      );
    },
  },
];

/* One legend entry — glyph + caption under the table (lab precedent). */
const LegendItem = ({ icon, color, label, fill }) => (
  <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', color: 'var(--text-content-tertiary)' }}>
    <span style={{ color }}><Icon name={icon} size={14} style={fill ? FILLED_SYMBOL : undefined} /></span>
    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>{label}</span>
  </span>
);

/* Dialog sub-header text style shared by the accept/reject bodies. */
const dialogText = { fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-alertdialog-subtext)', lineHeight: 1.5 };

const XrayQueuePage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [modality, setModality] = useState('all');
  const [urgency, setUrgency] = useState('all');
  const [location, setLocation] = useState('all');
  const [resultType, setResultType] = useState('all');
  const [radiologist, setRadiologist] = useState('all');
  /* ช่วงวันที่ส่งตรวจ — §1.12.6.8 "ช่วงเวลาที่ตรวจ". LIVE filter: resolved
     to an inclusive day range and applied against the row's order day /
     appointment day (see resolveDateRange + rowMatchesDateRange above). */
  const [dateValue, setDateValue] = useState({ quick: 'today' });
  /* Bulk selection — ids of checked rows on the CURRENT page. Pruned to
     visible rows whenever filters/tab/page change so the selection bar
     can never act on rows the user cannot see. */
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  /* STAT ก่อน — on by default so rank-0 work opens at the top, red. */
  const [statFirst, setStatFirst] = useState(true);
  const [page, setPage] = useState(1);
  /* Local mutable copy of the mock — transitions never write back into
     the imported XRAY_ORDERS array. */
  const [liveRows, setLiveRows] = useState(ROWS);
  const [toast, setToast] = useState({ open: false, message: '' });

  const summaryCards = useMemo(() => buildSummaryCards(liveRows), [liveRows]);
  const tabs = useMemo(() => buildTabs(liveRows), [liveRows]);

  /* ── Row actions ──
     One dialog reused for every confirm-worthy action, holding the
     pending {kind,row} plus the dialog's own inputs: the assignee for
     รับ Request (the MyHOSPITAL screen's "เลือกเจ้าหน้าที่รับ Request")
     and the mandatory reason for reject/cancel. */
  const [pendingAction, setPendingAction] = useState(null);
  const [assigneeId, setAssigneeId] = useState(null);
  const [reason, setReason] = useState('');
  const [dialogError, setDialogError] = useState('');
  /* §1.12.5.6 amend form — a DRAFT of the row's amendable slice, edited in
     the dialog and applied on confirm. `radiologistId` identifies the
     รังสีแพทย์ making the edit (XRAY_RADIOLOGISTS stands in for the auth
     session, same pattern as XrayResultPage's currentUser). */
  const [amendDraft, setAmendDraft] = useState(null);

  const openAction = (kind, row) => {
    setPendingAction({ kind, row });
    setAssigneeId(null);
    setReason('');
    setDialogError('');
    /* Seed the amend form from the row so the dialog opens showing the
       order exactly as the clinic sent it. Only the clinically-safe slice
       is copied — examId/hn/xn/price/claimAmount/ordering clinic+doctor
       are deliberately absent (§1.12.5.6: changing the exam or patient is
       a NEW order, not an amendment). */
    setAmendDraft(kind !== 'amend' ? null : {
      view: row.view,
      urgency: row.urgency,
      clinicalSummary: row.clinicalSummary ?? '',
      diagnosis: row.diagnosis ?? '',
      allergyHas: Boolean(row.allergy?.has),
      allergyAgent: row.allergy?.agent ?? '',
      allergySymptom: row.allergy?.symptom ?? '',
      pregStatus: row.pregnancy?.status ?? null,
      pregLmp: row.pregnancy?.lmp ?? '',
      note: row.note ?? '',
      radiologistId: null,
    });
  };
  const closeAction = () => setPendingAction(null);

  const handleAction = (kind, row) => {
    /* บันทึกผล / ยืนยันผล live on the result screen (XrayResultPage —
       another agent's file); the worklist only routes there by XN. */
    if (kind === 'report') { history.push(`/xray/result?xn=${row.xn}`); return; }
    if (kind === 'verify') { history.push(`/xray/result?xn=${row.xn}&mode=verify`); return; }
    if (kind === 'view') { setSelectedId(row.id); return; }
    openAction(kind, row);
  };

  const applyRow = (id, patch) =>
    setLiveRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const showToast = (message) => setToast({ open: true, message });

  /* Patch a whole batch in one pass — the bulk mirror of applyRow. Local
     liveRows only; XRAY_ORDERS is never mutated. */
  const applyRows = (ids, patch) =>
    setLiveRows((prev) => prev.map((r) => (ids.has(r.id) ? { ...r, ...patch } : r)));

  const handleConfirmAction = () => {
    if (!pendingAction) return;
    const { kind, row } = pendingAction;
    const batch = pendingAction.rows ?? [];
    const batchIds = new Set(batch.map((r) => r.id));

    /* ── Bulk branches — validated by bulkValidity before the dialog ever
       opened, so each branch only re-checks its own mandatory inputs
       (assignee / reason), applies ONE patch to the whole batch, clears
       the selection and toasts the count. */
    if (kind === 'bulkAccept') {
      const tech = XRAY_RADIOGRAPHERS.find((t) => t.id === assigneeId);
      if (!tech) {
        setDialogError('กรุณาเลือกเจ้าหน้าที่รับ Request');
        return;
      }
      applyRows(batchIds, { status: 'accepted', acceptedAt: NOW_CLOCK, radiographer: tech.name, exception: undefined, cancelReason: null });
      setSelectedIds(new Set());
      showToast(`รับ Request ${batch.length} รายการแล้ว — มอบหมาย ${tech.name}`);
      setPendingAction(null);
      return;
    }
    if (kind === 'bulkShot') {
      applyRows(batchIds, { status: 'performed', performedAt: NOW_CLOCK });
      setSelectedIds(new Set());
      showToast(`บันทึกว่าถ่ายแล้ว ${batch.length} รายการ — รอบันทึกผล`);
      setPendingAction(null);
      return;
    }
    if (kind === 'bulkCancel') {
      if (!reason.trim()) {
        setDialogError('ต้องระบุเหตุผลในการยกเลิกรายการตรวจ');
        return;
      }
      applyRows(batchIds, { exception: 'cancelled', cancelReason: reason.trim() });
      setSelectedIds(new Set());
      showToast(`ยกเลิกรายการตรวจ ${batch.length} รายการแล้ว`);
      setPendingAction(null);
      return;
    }
    if (kind === 'bulkPrint') {
      /* §1.12.6.5 — the dialog body stacks one ใบผลเอกซเรย์ card per
         selected verified row inside the shared print area. */
      window.print();
      setSelectedIds(new Set());
      showToast(`ส่งพิมพ์ใบผลเอกซเรย์ ${batch.length} รายการแล้ว`);
      setPendingAction(null);
      return;
    }

    if (kind === 'accept') {
      const tech = XRAY_RADIOGRAPHERS.find((t) => t.id === assigneeId);
      if (!tech) {
        setDialogError('กรุณาเลือกเจ้าหน้าที่รับ Request');
        return;
      }
      applyRow(row.id, { status: 'accepted', acceptedAt: NOW_CLOCK, radiographer: tech.name, exception: undefined, cancelReason: null });
      showToast(`รับ Request ${row.xn} แล้ว — มอบหมาย ${tech.name}`);
    } else if (kind === 'reject') {
      if (!reason.trim()) {
        setDialogError('ต้องระบุเหตุผลในการปฏิเสธรับ Request');
        return;
      }
      /* ปฏิเสธรับ Request (manual p.8) — the order goes BACK to the
         ordering doctor with the reason. This is the FALLBACK path for an
         incomplete order; the primary §1.12.5.6 path is the amend action
         below, which completes the order in place. Status stays
         `requested` and the exception rides on the row (see xrayOrders.js). */
      applyRow(row.id, { exception: 'rejected', cancelReason: `ปฏิเสธรับ Request — ${reason.trim()}` });
      showToast(`ปฏิเสธรับ Request ${row.xn} แล้ว — ส่งกลับ ${row.orderingLocation}`);
    } else if (kind === 'shot') {
      applyRow(row.id, { status: 'performed', performedAt: NOW_CLOCK });
      showToast(`บันทึกว่าถ่าย ${row.examLabel} แล้ว — รอบันทึกผล`);
    } else if (kind === 'cancel') {
      if (!reason.trim()) {
        setDialogError('ต้องระบุเหตุผลในการยกเลิกรายการตรวจ');
        return;
      }
      applyRow(row.id, { exception: 'cancelled', cancelReason: reason.trim() });
      showToast(`ยกเลิกรายการตรวจ ${row.xn} แล้ว`);
    } else if (kind === 'amend') {
      /* §1.12.5.6 — แก้ไขรายละเอียดการส่งตรวจ. Accountability is
         non-negotiable: the edit is stamped with WHO (a รังสีแพทย์ from
         the reader registry, standing in for the auth session) and WHY
         (mandatory เหตุผล/สิ่งที่แก้ไข), appended to the row's
         `amendments` history in the same {at, by, reason} shape
         XrayDetailPanel already renders — the trail and the report-edit
         trail (§1.12.6.3) read as one timeline. */
      const editor = XRAY_RADIOLOGISTS.find((r) => r.id === amendDraft?.radiologistId);
      if (!editor) {
        setDialogError('กรุณาเลือกรังสีแพทย์ผู้แก้ไข');
        return;
      }
      if (!reason.trim()) {
        setDialogError('ต้องระบุเหตุผล/สิ่งที่แก้ไข');
        return;
      }
      const changed = diffAmend(row, amendDraft);
      if (changed.length === 0) {
        setDialogError('ยังไม่ได้แก้ไขรายละเอียดใด — แก้ไขอย่างน้อย 1 รายการก่อนบันทึก');
        return;
      }
      /* urgency drives baked decorations (urgencyRank/slaMinutes/labels),
         so the amended row re-runs withExamLabel instead of a shallow
         patch — worklist sorting and the SLA clock follow the new urgency
         immediately. Local liveRows only; XRAY_ORDERS is never mutated. */
      const amendedRaw = {
        ...row,
        view: amendDraft.view,
        urgency: amendDraft.urgency,
        clinicalSummary: amendDraft.clinicalSummary.trim(),
        diagnosis: amendDraft.diagnosis.trim(),
        allergy: {
          has: amendDraft.allergyHas,
          agent: amendDraft.allergyHas ? amendDraft.allergyAgent.trim() : '',
          symptom: amendDraft.allergyHas ? amendDraft.allergySymptom.trim() : '',
        },
        pregnancy: { status: amendDraft.pregStatus, lmp: amendDraft.pregLmp.trim() || null },
        note: amendDraft.note.trim(),
        amendedByRadiology: true, /* worklist glyph + tooltip flag */
        amendments: [
          ...(row.amendments ?? []),
          { at: NOW_CLOCK, by: editor.name, reason: `แก้ไขรายละเอียดการส่งตรวจ (${changed.join(' · ')}) — ${reason.trim()}` },
        ],
      };
      setLiveRows((prev) => prev.map((r) => (r.id === row.id ? withExamLabel(amendedRaw) : r)));
      showToast(`แก้ไขรายละเอียดการส่งตรวจ ${row.xn} แล้ว — โดย ${editor.name}`);
    } else if (kind === 'print') {
      /* §1.12.6.5 — the dialog body below is the print area; the detail
         panel's own area is disabled while this dialog is open (see
         printEnabled) so only the ใบผลเอกซเรย์ preview prints. */
      window.print();
      showToast(`ส่งพิมพ์ใบผลเอกซเรย์ ${row.xn} แล้ว`);
    }
    setPendingAction(null);
  };

  /* §1.12.5.9 repeat-warning lookup for the exam-column glyph — the same
     duplicateWarning() the order screen calls, reading the patient's
     prior imaging by HN. */
  const dupFor = useMemo(() => (row) => duplicateWarning(row.examId, xrayHistoryFor(row.hn)), []);

  /* `columns` is built AFTER pagination below — the leading checkbox
     column closes over the page's selection state. */

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY);

  /* Every filter EXCEPT the date range — kept separate so the empty state
     can tell "no rows at all" apart from "rows exist, just not in the
     chosen dates" and offer the right recovery (ล้างตัวกรอง below). */
  const preDateFiltered = useMemo(() => liveRows
    .filter((r) => rowInTab(r, activeTab))
    .filter((r) => modality === 'all' || r.modality === modality)
    .filter((r) => urgency === 'all' || r.urgency === urgency)
    .filter((r) => location === 'all' || r.orderingLocation === location)
    .filter((r) => resultType === 'all' || r.resultType === resultType)
    .filter((r) => radiologist === 'all' || r.radiologist === radiologist)
    .filter((r) => matchesQuery(r, query)),
  [liveRows, activeTab, modality, urgency, location, resultType, radiologist, query]);

  const dateRange = useMemo(() => resolveDateRange(dateValue), [dateValue]);

  const filtered = useMemo(
    () => (dateRange ? preDateFiltered.filter((r) => rowMatchesDateRange(r, dateRange)) : preDateFiltered),
    [preDateFiltered, dateRange],
  );

  /* Rows exist but the date range hides them all → date-specific empty
     state + a one-click way out (Nielsen #9 recover from errors). */
  const emptyBecauseDates = filtered.length === 0 && preDateFiltered.length > 0;

  const sorted = useMemo(
    () => sortRows(filtered, sortConfig, statFirst),
    [filtered, sortConfig, statFirst],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  /* Memoized (not sliced inline) so the selection-prune effect below can
     depend on a stable identity instead of re-running every render. */
  const pageRows = useMemo(
    () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sorted, page],
  );
  const rangeStart = sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, sorted.length);

  useEffect(() => { setPage(1); }, [activeTab, modality, urgency, location, resultType, radiologist, query, dateValue]);

  /* ── Bulk selection (Nielsen #7) ──
     Selection lives at row-id level but is CONSTRAINED to the current
     page: select-all checks only visible rows, and the prune effect drops
     anything that scrolls out of view when a filter/tab/page/sort change
     re-shapes the list — the bar must never act on rows the user cannot
     see. Exception rows (ประวัติยกเลิก) are not selectable: no bulk
     action applies to history. */
  const pageSelectable = useMemo(() => pageRows.filter((r) => !r.exception), [pageRows]);
  const selectedRows = useMemo(() => pageRows.filter((r) => selectedIds.has(r.id)), [pageRows, selectedIds]);
  const allPageSelected = pageSelectable.length > 0 && pageSelectable.every((r) => selectedIds.has(r.id));

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(pageSelectable.map((r) => r.id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      /* next ⊆ prev, so equal size ⇒ equal sets — skip the state write. */
      return next.size === prev.size ? prev : next;
    });
  }, [pageSelectable]);

  const toggleRow = (id, on) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (on) next.add(id); else next.delete(id);
    return next;
  });
  const toggleAllOnPage = (on) => setSelectedIds(on ? new Set(pageSelectable.map((r) => r.id)) : new Set());
  const clearSelection = () => setSelectedIds(new Set());

  /* Bulk-action validity — an action is offered only when it is legal for
     EVERY selected row (mirror of the per-row gating above); a mixed
     selection disables it with the reason instead of silently skipping
     rows. `statuses` = the pipeline stages the per-row action accepts. */
  const BULK_ACTIONS = [
    { kind: 'bulkAccept', icon: 'how_to_reg', label: 'รับ Request', statuses: ['requested', 'scheduled'], requiredLabel: 'รอรับรายการ/นัดตรวจ' },
    { kind: 'bulkShot', icon: 'radiology', label: 'บันทึกว่าถ่ายแล้ว', statuses: ['accepted'], requiredLabel: 'รอตรวจ' },
    { kind: 'bulkPrint', icon: 'print', label: 'พิมพ์ใบผลเอกซเรย์', statuses: ['verified'], requiredLabel: 'ยืนยันผลแล้ว' },
    { kind: 'bulkCancel', icon: 'cancel', label: 'ยกเลิกรายการตรวจ', statuses: ['requested', 'scheduled', 'accepted', 'performed', 'reported'], requiredLabel: 'ก่อนยืนยันผล' },
  ];
  const mixedStatuses = new Set(selectedRows.map((r) => r.status)).size > 1;
  const bulkValidity = (action) => {
    if (selectedRows.length === 0) return { valid: false, reason: '' };
    if (selectedRows.every((r) => action.statuses.includes(r.status))) return { valid: true, reason: '' };
    return {
      valid: false,
      reason: mixedStatuses ? 'มีรายการที่สถานะไม่ตรงกัน' : `ใช้ได้เฉพาะรายการสถานะ${action.requiredLabel}`,
    };
  };

  /* Bulk dialogs reuse the SAME pendingAction plumbing as row actions —
     `rows` carries the batch, `row` stays the first row so shared body
     fragments (assignee chooser, reason field) keep working unchanged. */
  const openBulkAction = (kind) => {
    if (selectedRows.length === 0) return;
    setPendingAction({ kind, row: selectedRows[0], rows: selectedRows });
    setAssigneeId(null);
    setReason('');
    setDialogError('');
    setAmendDraft(null);
  };

  /* ── Columns (leading checkbox + the §2.2 grid) ── */
  const selectColumn = {
    key: 'select',
    width: 52,
    sortable: false,
    align: 'center',
    /* Header checkbox = "select all on this page" — scoped to the current
       filter/tab/page on purpose; labelled for AT (WCAG 4.1.2, 2.1.1). */
    label: (
      <SelectCheckbox
        checked={allPageSelected}
        indeterminate={selectedRows.length > 0 && !allPageSelected}
        disabled={pageSelectable.length === 0}
        label={`เลือกทั้งหมดในหน้านี้ (${pageSelectable.length} รายการ)`}
        title='เลือกทั้งหมดในหน้านี้'
        onChange={toggleAllOnPage}
      />
    ),
    render: (row) => (
      row.exception
        ? (
          <SelectCheckbox
            checked={false}
            disabled
            label={`${row.xn} อยู่ในประวัติยกเลิก — เลือกไม่ได้`}
            title='รายการอยู่ในประวัติยกเลิก — ไม่มีการจัดการแบบกลุ่ม'
          />
        )
        : (
          <SelectCheckbox
            checked={selectedIds.has(row.id)}
            label={`เลือก ${row.xn}`}
            onChange={(on) => toggleRow(row.id, on)}
          />
        )
    ),
  };

  const columns = useMemo(
    () => [selectColumn, ...buildColumns(handleAction, dupFor)],
    [dupFor, selectedIds, pageSelectable, allPageSelected], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ── Barcode / keyboard-first entry ──
     PrimarySearch owns its input privately, so focus is driven through
     the wrapper (querySelector) instead of forking a shared component. */
  const searchWrapRef = useRef(null);
  const focusSearch = () => {
    const el = searchWrapRef.current?.querySelector('input');
    if (el) {
      el.focus();
      el.select(); /* a new scan replaces a stale query instead of appending */
    }
  };

  /* Autofocus on mount — the radiographer walks up with a ใบส่งตรวจ and
     scans; the XN must land in the box without touching the mouse. */
  useEffect(() => { focusSearch(); }, []);

  /* Global shortcuts: `/` refocuses the search from anywhere on the page
     (skipped while typing in any field — `/` is legal free text there);
     Esc IN the search clears it and blurs. Discoverable via the hint line
     under the box — a shortcut nobody can find out about is a trap. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const t = e.target;
        const tag = t?.tagName;
        if (t?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        focusSearch();
      } else if (e.key === 'Escape') {
        const el = searchWrapRef.current?.querySelector('input');
        if (el && document.activeElement === el) {
          setQuery('');
          el.blur();
        }
      }
    };
    /* Capture phase — PrimarySearch's own Escape handler blurs the input
       before a bubble-phase listener would run, which breaks the
       activeElement check above. Capturing runs first; its blur then
       becomes a harmless no-op. */
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const panelOpen = selectedId != null;
  /* Keep rendering the last-selected order while the panel collapses
     shut — otherwise the content blanks out mid-animation. Reading/
     writing a ref during render is React's documented "remember info
     from previous render" pattern: idempotent per commit, never itself
     re-renders. */
  const lastSelectedIdRef = useRef(null);
  if (selectedId != null) lastSelectedIdRef.current = selectedId;
  const selected = useMemo(
    () => liveRows.find((r) => r.id === (selectedId ?? lastSelectedIdRef.current)) ?? null,
    [liveRows, selectedId],
  );

  /* All rows of the selected order — one XN can hold several exams
     (ORD-X405), and the panel must show them together (§1.12.5.4). */
  const orderRows = useMemo(
    () => (selected ? liveRows.filter((r) => r.orderId === selected.orderId) : []),
    [liveRows, selected],
  );

  const searchSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matches = [];
    for (const row of liveRows) {
      if (matches.length >= 8) break;
      if (matchesQuery(row, query)) matches.push(rowToSearchItem(row));
    }
    return matches;
  }, [liveRows, query]);

  const resolveSearchRow = (q, item) => {
    if (item?.id) {
      const byId = liveRows.find((row) => row.id === item.id);
      if (byId) return byId;
    }
    const needle = (q ?? item?.value ?? item?.label ?? '').toString().trim();
    if (!needle) return null;
    return liveRows.find((row) => matchesQuery(row, needle)) ?? null;
  };

  /* Enter / scanner submit — open the detail panel only when the text is
     UNAMBIGUOUS: an explicit suggestion pick, an XN barcode hit
     (X69-nnnn — a scan ends with Enter, so this is the scan-to-open
     path), or exactly one free-text match. A multi-match Enter just
     leaves the table filtered instead of gambling on the first row —
     opening the wrong patient's study is the failure mode this screen
     exists to prevent. One XN can span several rows (multi-exam order);
     any of them is right because the panel shows the whole order. */
  const handleSearchSubmit = (v, item) => {
    const needle = String(v ?? '').trim();
    let row = null;
    if (item?.id) row = liveRows.find((r) => r.id === item.id) ?? null;
    if (!row && XN_PATTERN.test(needle)) {
      row = liveRows.find((r) => String(r.xn).toLowerCase() === needle.toLowerCase()) ?? null;
    }
    if (!row && needle) {
      const matches = liveRows.filter((r) => matchesQuery(r, needle));
      if (matches.length === 1) row = matches[0];
    }
    pushHistory(row ? rowToSearchItem(row) : v);
    setQuery(v);
    if (row) setSelectedId(row.id);
  };

  const searchAvatars = useMemo(() => {
    const result = [];
    for (const entry of searchHistory) {
      if (result.length >= 3) break;
      const direct = entry && typeof entry === 'object' ? entry.avatarSrc : null;
      if (direct) { result.push(direct); continue; }
      const q = typeof entry === 'string' ? entry : (entry?.value ?? entry?.label ?? '');
      const row = q ? resolveSearchRow(q, null) : null;
      if (row?.patient.avatarUrl) result.push(row.patient.avatarUrl);
    }
    return result;
  }, [searchHistory]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }
  ));

  /* ── Dialog copy + body ──
     AlertDialog's `description` accepts a node; the interactive bits
     (assignee choices, reason textarea) are phrasing-content elements
     (button/textarea/span) so they sit legally inside its <p>. */
  const dialogRow = pendingAction?.row ?? null;
  const dialogKind = pendingAction?.kind ?? null;
  const dialogRows = pendingAction?.rows ?? null;
  const dialogCount = dialogRows?.length ?? 0;

  const DIALOG_COPY = {
    accept: { title: 'รับ Request เข้าห้องตรวจ?', type: 'info', confirmLabel: 'รับ Request' },
    reject: { title: 'ปฏิเสธรับ Request?', type: 'destructive', confirmLabel: 'ปฏิเสธรับ Request' },
    shot:   { title: 'บันทึกว่าถ่ายภาพรังสีแล้ว?', type: 'info', confirmLabel: 'บันทึกว่าถ่ายแล้ว' },
    cancel: { title: 'ยกเลิกรายการตรวจนี้?', type: 'destructive', confirmLabel: 'ยกเลิกรายการตรวจ' },
    amend:  { title: 'แก้ไขรายละเอียดการส่งตรวจ', type: 'info', confirmLabel: 'บันทึกการแก้ไข' }, /* §1.12.5.6 */
    print:  { title: 'พิมพ์ใบผลเอกซเรย์', type: 'info', confirmLabel: 'พิมพ์' },
    /* Bulk mirrors — the count in the title is the last "how many rows am
       I about to change?" check before commit. */
    bulkAccept: { title: `รับ Request ${dialogCount} รายการ?`, type: 'info', confirmLabel: 'รับ Request ทั้งหมด' },
    bulkShot:   { title: `บันทึกว่าถ่ายแล้ว ${dialogCount} รายการ?`, type: 'info', confirmLabel: 'บันทึกว่าถ่ายแล้ว' },
    bulkPrint:  { title: `พิมพ์ใบผลเอกซเรย์ ${dialogCount} รายการ`, type: 'info', confirmLabel: 'พิมพ์ทั้งหมด' },
    bulkCancel: { title: `ยกเลิกรายการตรวจ ${dialogCount} รายการ?`, type: 'destructive', confirmLabel: 'ยกเลิกทั้งหมด' },
  };
  const dialogCopy = dialogKind ? DIALOG_COPY[dialogKind] : null;

  /* `ariaLabel` — the dialogs show no visible <label> for this textarea
     (the sentence above it explains the context), so the programmatic
     name rides on aria-label (WCAG 1.3.1 / 4.1.2). Placeholder is NOT a
     name — it vanishes on input. */
  const reasonField = (placeholder, ariaLabel = 'เหตุผล') => (
    <textarea
      className='mih-xrayq-reason'
      value={reason}
      onChange={(e) => { setReason(e.target.value); if (dialogError) setDialogError(''); }}
      placeholder={placeholder}
      aria-label={ariaLabel}
      rows={3}
      style={{
        width: '100%',
        resize: 'none',
        borderRadius: 'var(--dim-radius-200, 8px)',
        paddingTop: 'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-200)',
        paddingLeft: 'var(--dim-space-300)',
        paddingRight: 'var(--dim-space-300)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        color: 'var(--text-content-default)',
        textAlign: 'left',
      }}
    />
  );

  /* ── §1.12.5.6 amend-form fragments ──
     AlertDialog renders `description` inside phrasing context, so every
     fragment here is phrasing content (span/button/select/input/textarea)
     exactly like the accept/reject bodies. All native controls carry the
     same `.mih-xrayq-reason` chrome strip — no third mechanism. */
  const setAmend = (patch) => {
    setAmendDraft((d) => ({ ...d, ...patch }));
    if (dialogError) setDialogError('');
  };

  const amendLabel = { fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-tertiary)' };

  const amendFieldStyle = {
    width: '100%',
    borderRadius: 'var(--dim-radius-200, 8px)',
    paddingTop: 'var(--dim-space-150)',
    paddingBottom: 'var(--dim-space-150)',
    paddingLeft: 'var(--dim-space-300)',
    paddingRight: 'var(--dim-space-300)',
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-sm)',
    color: 'var(--text-content-default)',
    textAlign: 'left',
  };

  const amendField = (label, control) => (
    <span className='flex flex-col text-left' style={{ gap: 'var(--dim-space-100)' }}>
      <span style={amendLabel}>{label}</span>
      {control}
    </span>
  );

  /* Compact pressable chip — the accept-dialog's assignee-row pattern
     shrunk for the urgency / allergy / pregnancy choices. */
  const amendChip = (label, active, onClick) => (
    <button
      key={label}
      type='button'
      aria-pressed={active}
      onClick={onClick}
      style={{
        paddingTop: 'var(--dim-space-100)',
        paddingBottom: 'var(--dim-space-100)',
        paddingLeft: 'var(--dim-space-300)',
        paddingRight: 'var(--dim-space-300)',
        borderRadius: 'var(--dim-radius-full, 9999px)',
        cursor: 'pointer',
        background: active ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
        border: active
          ? 'var(--dim-stroke-100) solid var(--border-brandPrimary-default)'
          : 'var(--dim-stroke-100) solid var(--border-neutral-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: active ? 'var(--text-brandPrimary-default)' : 'var(--text-content-secondary)',
        fontWeight: active ? 'var(--type-weight-medium)' : 'var(--type-weight-regular)',
      }}
    >
      {label}
    </button>
  );

  /* ท่าถ่าย options — the exam's own registered views (the same list the
     order screen offers, §1.12.5.4) plus the row's current value, so an
     already-custom view never vanishes from its own select. Dedup'ed by
     value; digital modalities with no views collapse to the current '—'. */
  const amendViewOptions = useMemo(() => {
    if (dialogKind !== 'amend' || !dialogRow) return [];
    const views = (dialogRow.exam?.views ?? []).map((k) => VIEW_BY_KEY[k]).filter(Boolean);
    const opts = [];
    const seen = new Set();
    const add = (value, label) => {
      if (!value || seen.has(value)) return;
      seen.add(value);
      opts.push({ value, label });
    };
    const all = views.map((v) => v.code).join('/');
    add(all, `ตามทะเบียน (${all})`);
    views.forEach((v) => add(v.code, v.thai));
    add(dialogRow.view, `ตามคำสั่งเดิม (${dialogRow.view})`);
    return opts;
  }, [dialogKind, dialogRow]);

  /* เลือกเจ้าหน้าที่รับ Request — the MyHOSPITAL รับ Request screen's
     step 4, rendered as choice rows instead of a native select so no
     browser dropdown chrome leaks into the dialog. Shared by the single
     accept dialog AND bulkAccept (ONE assignee applied to the whole
     batch — the manual's screen works the same way). */
  const assigneeChooser = (
    <span className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
      {XRAY_RADIOGRAPHERS.map((t) => {
        const active = assigneeId === t.id;
        return (
          <button
            key={t.id}
            type='button'
            aria-pressed={active}
            onClick={() => { setAssigneeId(t.id); if (dialogError) setDialogError(''); }}
            className='flex items-center w-full text-left'
            style={{
              gap: 'var(--dim-space-200)',
              paddingTop: 'var(--dim-space-200)',
              paddingBottom: 'var(--dim-space-200)',
              paddingLeft: 'var(--dim-space-300)',
              paddingRight: 'var(--dim-space-300)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              cursor: 'pointer',
              background: active ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
              border: active
                ? 'var(--dim-stroke-100) solid var(--border-brandPrimary-default)'
                : 'var(--dim-stroke-100) solid var(--border-neutral-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              color: active ? 'var(--text-brandPrimary-default)' : 'var(--text-content-secondary)',
              fontWeight: active ? 'var(--type-weight-medium)' : 'var(--type-weight-regular)',
            }}
          >
            <Icon name={active ? 'radio_button_checked' : 'radio_button_unchecked'} size={16} />
            {t.name}
          </button>
        );
      })}
    </span>
  );

  /* Compact recap of every row a bulk action is about to touch — the
     radiographer confirms against XN + patient + exam, never a bare
     count (wrong-batch protection mirrors the wrong-patient check). */
  const bulkRowList = dialogRows ? (
    <span className='flex flex-col text-left' style={{ gap: 'var(--dim-space-100)', maxHeight: '32vh', overflowY: 'auto' }}>
      {dialogRows.map((r) => (
        <span key={r.id} style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)', lineHeight: 1.5 }}>
          {r.xn} — {r.patient.shortName} · {r.examLabel}
        </span>
      ))}
    </span>
  ) : null;

  /* One ใบผลเอกซเรย์ preview card (§1.12.6.5) — reused by the single
     print dialog and stacked per-row by bulkPrint. */
  const printCard = (row) => (
    <span
      key={row.id}
      className='flex flex-col text-left'
      style={{
        gap: 'var(--dim-space-150)',
        /* Longhand padding — inline `padding:` shorthand carrying
           var() renders as 0 (CSSOM drops it, project memory). */
        paddingTop: 'var(--dim-space-400)',
        paddingBottom: 'var(--dim-space-400)',
        paddingLeft: 'var(--dim-space-400)',
        paddingRight: 'var(--dim-space-400)',
        borderRadius: 'var(--dim-radius-300)',
        border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
        background: 'var(--surface-card-200)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-secondary)',
      }}
    >
      <span style={{ fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
        ใบรายงานผลการตรวจทางรังสีวิทยา — ศูนย์บริการสาธารณสุข สำนักอนามัย กรุงเทพมหานคร
      </span>
      <span>{row.patient.fullName ?? row.patient.shortName} · HN {row.hn} · XN {row.xn} · สิทธิ{row.rightLabel}</span>
      <span>{row.examLabel} · ท่า {row.view} · ถ่ายเมื่อ {row.performedAt ?? '—'}</span>
      {row.resultTypeLabel && <span>ประเภทผล: {row.resultTypeLabel}</span>}
      {row.impression && (
        <span style={{ color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>
          Impression: {row.impression}
        </span>
      )}
      <span>
        อ่านผลโดย {row.radiologist ?? '—'}
        {(() => {
          const reader = XRAY_RADIOLOGISTS.find((r) => r.name === row.radiologist);
          return reader?.license ? ` (${reader.license})` : '';
        })()}
        {row.verifiedAt ? ` · ยืนยันผล ${row.verifiedAt}` : ''}
      </span>
    </span>
  );

  const dialogBody = !pendingAction ? '' : (
    <span className='flex flex-col w-full text-left' style={{ gap: 'var(--dim-space-300)' }}>
      {dialogKind === 'accept' && (
        <>
          <span style={dialogText}>
            {dialogRow.examLabel} — {dialogRow.patient.shortName} (XN {dialogRow.xn}) จาก{dialogRow.orderingLocation}
            {' '}จะเข้าสถานะรอตรวจ เลือกเจ้าหน้าที่รับ Request (ผู้ถ่าย)
          </span>
          {assigneeChooser}
        </>
      )}
      {dialogKind === 'bulkAccept' && (
        <>
          <span style={dialogText}>
            รายการทั้ง {dialogCount} รายการจะเข้าสถานะรอตรวจ — เลือกเจ้าหน้าที่รับ Request (ผู้ถ่าย) หนึ่งคนสำหรับทั้งชุด
          </span>
          {bulkRowList}
          {assigneeChooser}
        </>
      )}
      {dialogKind === 'bulkShot' && (
        <>
          <span style={dialogText}>
            รายการทั้ง {dialogCount} รายการจะถูกบันทึกว่าถ่ายภาพรังสีแล้ว และเข้าสถานะรอบันทึกผล
          </span>
          {bulkRowList}
        </>
      )}
      {dialogKind === 'bulkCancel' && (
        <>
          <span style={dialogText}>
            รายการทั้ง {dialogCount} รายการจะถูกยกเลิกและย้ายไปประวัติยกเลิกรายการตรวจ — ต้องระบุเหตุผล (ใช้เหตุผลเดียวกันทั้งชุด)
          </span>
          {bulkRowList}
          {reasonField('เหตุผลที่ยกเลิก เช่น ผู้ป่วยกลับก่อนได้รับการตรวจ', 'เหตุผลที่ยกเลิกรายการตรวจ')}
        </>
      )}
      {dialogKind === 'bulkPrint' && (
        /* Same print-area contract as the single dialog — one card per
           verified row, stacked inside the shared .mih-xray-print-area. */
        <span className='mih-xray-print-area flex flex-col text-left' style={{ gap: 'var(--dim-space-300)' }}>
          {(dialogRows ?? []).map(printCard)}
        </span>
      )}
      {dialogKind === 'reject' && (
        <>
          <span style={dialogText}>
            {dialogRow.examLabel} (XN {dialogRow.xn}) จะถูกส่งกลับให้ {dialogRow.orderedBy} ({dialogRow.orderingLocation})
            {' '}แก้ไขคำสั่งให้สมบูรณ์ — ต้องระบุเหตุผล
          </span>
          {reasonField('เหตุผลที่ปฏิเสธ เช่น ไม่ระบุตำแหน่ง/ท่าถ่ายที่ต้องการ', 'เหตุผลที่ปฏิเสธรับ Request')}
        </>
      )}
      {dialogKind === 'shot' && (
        <span style={dialogText}>
          {dialogRow.examLabel} — {dialogRow.patient.shortName} (XN {dialogRow.xn})
          {' '}โดย {dialogRow.radiographer ?? 'เจ้าหน้าที่รังสี'} จะเข้าสถานะรอบันทึกผล
        </span>
      )}
      {dialogKind === 'cancel' && (
        <>
          <span style={dialogText}>
            {dialogRow.examLabel} (XN {dialogRow.xn}) ของ{dialogRow.patient.shortName} จะถูกยกเลิก
            และย้ายไปประวัติยกเลิกรายการตรวจ — ต้องระบุเหตุผล
          </span>
          {reasonField('เหตุผลที่ยกเลิก เช่น ผู้ป่วยกลับก่อนได้รับการตรวจ', 'เหตุผลที่ยกเลิกรายการตรวจ')}
        </>
      )}
      {dialogKind === 'amend' && amendDraft && (
        <>
          {/* §1.12.5.6 — why edit-in-place beats rejecting: the patient
              is already standing at the radiology door; bouncing the
              order back to the clinic costs them a whole extra visit.
              The radiologist completes the order so the study proceeds
              NOW, and every change is stamped who/when/what below. */}
          <span style={dialogText}>
            {dialogRow.examLabel} — {dialogRow.patient.shortName} (XN {dialogRow.xn}) จาก{dialogRow.orderingLocation} ({dialogRow.orderedBy})
            {' '}· แก้ไขได้เฉพาะรายละเอียดการส่งตรวจ — เปลี่ยนรายการตรวจ ผู้ป่วย หรือราคาไม่ได้ (ต้องสั่งใหม่)
          </span>
          <span className='flex flex-col text-left' style={{ gap: 'var(--dim-space-300)', maxHeight: '44vh', overflowY: 'auto' }}>
            {amendField('ท่าถ่าย', (
              <select
                className='mih-xrayq-reason'
                value={amendDraft.view}
                onChange={(e) => setAmend({ view: e.target.value })}
                aria-label='ท่าถ่าย'
                style={amendFieldStyle}
              >
                {amendViewOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ))}
            {amendField('ความเร่งด่วน', (
              <span className='flex flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                {XRAY_URGENCIES.map((u) => amendChip(u.thai, amendDraft.urgency === u.key, () => setAmend({ urgency: u.key })))}
              </span>
            ))}
            {amendField('อาการและผลการตรวจทางคลินิกโดยย่อ', (
              <textarea
                className='mih-xrayq-reason'
                value={amendDraft.clinicalSummary}
                onChange={(e) => setAmend({ clinicalSummary: e.target.value })}
                rows={2}
                aria-label='อาการและผลการตรวจทางคลินิกโดยย่อ'
                placeholder='คำถามทางคลินิกที่ต้องการคำตอบจากภาพ'
                style={{ ...amendFieldStyle, resize: 'none' }}
              />
            ))}
            {amendField('การวินิจฉัย', (
              <input
                className='mih-xrayq-reason'
                type='text'
                value={amendDraft.diagnosis}
                onChange={(e) => setAmend({ diagnosis: e.target.value })}
                aria-label='การวินิจฉัย'
                placeholder='เช่น R/O pulmonary tuberculosis'
                style={amendFieldStyle}
              />
            ))}
            {/* ประวัติการแพ้ + ประจำเดือน/ตั้งครรภ์ — the radiographer
                collects these at the door all the time; letting radiology
                record them on the order is the everyday case §1.12.5.6
                exists for. */}
            {amendField('ประวัติการแพ้ (ซักเพิ่มได้หน้าห้องตรวจ)', (
              <span className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                <span className='flex flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                  {amendChip('มีประวัติการแพ้', amendDraft.allergyHas === true, () => setAmend({ allergyHas: true }))}
                  {amendChip('ไม่มีประวัติการแพ้', amendDraft.allergyHas === false, () => setAmend({ allergyHas: false }))}
                </span>
                {amendDraft.allergyHas && (
                  <>
                    <input
                      className='mih-xrayq-reason'
                      type='text'
                      value={amendDraft.allergyAgent}
                      onChange={(e) => setAmend({ allergyAgent: e.target.value })}
                      aria-label='สารที่แพ้'
                      placeholder='สารที่แพ้ เช่น สารทึบรังสีชนิดไอโอดีน'
                      style={amendFieldStyle}
                    />
                    <input
                      className='mih-xrayq-reason'
                      type='text'
                      value={amendDraft.allergySymptom}
                      onChange={(e) => setAmend({ allergySymptom: e.target.value })}
                      aria-label='อาการที่เกิดจากการแพ้'
                      placeholder='อาการที่เกิด เช่น ผื่นลมพิษ แน่นหน้าอก'
                      style={amendFieldStyle}
                    />
                  </>
                )}
              </span>
            ))}
            {dialogRow.patient?.sex === 'หญิง' && amendField('ประจำเดือน / การตั้งครรภ์ (ซักเพิ่มได้หน้าห้องตรวจ)', (
              <span className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                <span className='flex flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                  {PREGNANCY_STATUSES.map((s) => amendChip(s, amendDraft.pregStatus === s, () => setAmend({ pregStatus: s })))}
                </span>
                <input
                  className='mih-xrayq-reason'
                  type='text'
                  value={amendDraft.pregLmp}
                  onChange={(e) => setAmend({ pregLmp: e.target.value })}
                  aria-label='LMP (ประจำเดือนครั้งสุดท้าย)'
                  placeholder='LMP เช่น 2 พ.ค. 2569'
                  style={amendFieldStyle}
                />
              </span>
            ))}
            {amendField('บันทึกเพิ่มเติม (Note)', (
              <input
                className='mih-xrayq-reason'
                type='text'
                value={amendDraft.note}
                onChange={(e) => setAmend({ note: e.target.value })}
                aria-label='บันทึกเพิ่มเติม (Note)'
                placeholder='เช่น ผู้ป่วยใช้รถเข็น ต้องการเจ้าหน้าที่ช่วยพยุง'
                style={amendFieldStyle}
              />
            ))}
          </span>
          {/* Accountability — WHO amends (registry radiologist, standing
              in for the auth session per XrayResultPage's pattern) and
              WHY, both mandatory before confirm. */}
          {amendField('รังสีแพทย์ผู้แก้ไข', (
            <select
              className='mih-xrayq-reason'
              value={amendDraft.radiologistId ?? ''}
              onChange={(e) => setAmend({ radiologistId: e.target.value || null })}
              aria-label='รังสีแพทย์ผู้แก้ไข'
              style={amendFieldStyle}
            >
              <option value=''>— เลือกรังสีแพทย์ —</option>
              {XRAY_RADIOLOGISTS.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.license}</option>)}
            </select>
          ))}
          {amendField('เหตุผล / สิ่งที่แก้ไข', reasonField('เช่น เพิ่มประวัติแพ้สารทึบรังสีที่ซักได้หน้าห้องตรวจ และปรับท่าถ่ายให้ตรงตำแหน่งที่ปวด', 'เหตุผล / สิ่งที่แก้ไข'))}
        </>
      )}
      {dialogKind === 'print' && (
        /* ใบผลเอกซเรย์ (§1.12.6.5) — preview card; this span is the print
            area (the panel's is disabled meanwhile, see printEnabled). */
        <span className='mih-xray-print-area flex flex-col text-left' style={{ gap: 'var(--dim-space-150)' }}>
          {printCard(dialogRow)}
        </span>
      )}
      {dialogError && (
        <span role='alert' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-statusbadge-error, #B91C1C)' }}>
          {dialogError}
        </span>
      )}
    </span>
  );

  return (
    <>
      <AlertDialog
        open={!!pendingAction}
        type={dialogCopy?.type ?? 'info'}
        title={dialogCopy?.title ?? ''}
        description={dialogBody}
        cancelLabel='ยกเลิก'
        confirmLabel={dialogCopy?.confirmLabel ?? 'ยืนยัน'}
        onClose={closeAction}
        onCancel={closeAction}
        onConfirm={handleConfirmAction}
      />
      <SuccessToast
        open={toast.open}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
      <QueuePageShell
        activeKey='radiology'
        breadcrumb={breadcrumb}
        title='ลำดับการตรวจผู้ป่วย'
        summaryCards={summaryCards}
        summaryFlushUnderSubHeader={false}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            paddingTop: 'var(--dim-space-600)',
            paddingLeft: 'var(--dim-space-600)',
            paddingRight: 'var(--dim-space-600)',
            paddingBottom: 'var(--dim-space-1200)',
            gap: 'var(--dim-space-600)',
          }}
        >
          <div className='w-full flex' style={{ gap: 'var(--dim-space-400)' }}>
            <div
              className='flex flex-col flex-1 min-w-0'
              style={{
                background: 'var(--surface-card-100)',
                borderRadius: 'var(--dim-radius-500)',
                border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                boxShadow: 'var(--shadow-card-strong)',
                /* Longhand — inline padding shorthand + var() = 0px bug. */
                paddingTop: 'var(--dim-space-600)',
                paddingBottom: 'var(--dim-space-600)',
                paddingLeft: 'var(--dim-space-600)',
                paddingRight: 'var(--dim-space-600)',
                gap: 'var(--dim-space-400)',
              }}
            >
              {/* Search — §1.12.2 + §1.12.6.2/§1.12.6.8; matchesQuery
                  documents exactly what the box reaches. */}
              <div className='w-full flex items-start justify-center' style={{ gap: 'var(--dim-space-300)' }}>
                <div ref={searchWrapRef} className='flex flex-col items-start min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
                  <PrimarySearch
                    value={query}
                    onChange={setQuery}
                    onSubmit={handleSearchSubmit}
                    placeholder='ค้นหา HN / ชื่อ-สกุล / เลขบัตรประชาชน / เลข XN / คำในผลตรวจ'
                    width={560}
                    history={searchHistory}
                    onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                    suggestions={searchSuggestions}
                    avatars={searchAvatars}
                  />
                  {/* Shortcut discoverability — a hint the user can read
                      beats a shortcut only the author knows about. */}
                  <span
                    className='inline-flex items-center'
                    style={{
                      gap: 'var(--dim-space-150)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-xs)',
                      color: 'var(--text-content-tertiary)',
                    }}
                  >
                    <span aria-hidden='true' className='inline-flex'><Icon name='barcode_scanner' size={14} /></span>
                    สแกนบาร์โค้ดเลข XN หรือกด / เพื่อค้นหา · Esc ล้างคำค้นหา
                  </span>
                </div>
                {/* Ordering is upstream of this worklist and Setup defines
                    every exam in it, so both stay reachable from here
                    (routes owned by the wiring agent). */}
                <NeutralSubdueButton
                  variant='outline'
                  size='md'
                  leadingIcon='add'
                  onClick={() => history.push('/xray/order')}
                >
                  สั่งตรวจ
                </NeutralSubdueButton>
                <NeutralSubdueIconButton
                  icon='settings'
                  variant='outline'
                  size='md'
                  aria-label='ทะเบียนรายการตรวจรังสี'
                  title='ทะเบียนรายการตรวจรังสี'
                  onClick={() => history.push('/xray/setup')}
                />
              </div>

              <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
                {/* STAT ก่อน — a mode, not a filter: it re-orders the list
                    without removing rows (lab precedent). */}
                <NeutralSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='priority_high'
                  active={statFirst}
                  aria-pressed={statFirst}
                  onClick={() => setStatFirst((v) => !v)}
                >
                  STAT ก่อน
                </NeutralSubdueButton>
                <FilterDropdown prefix='ชนิดการตรวจ:' options={MODALITY_OPTIONS} value={modality} onChange={setModality} />
                <FilterDropdown prefix='ความเร่งด่วน:' options={URGENCY_OPTIONS} value={urgency} onChange={setUrgency} />
                <FilterDropdown prefix='สถานะ:' options={STATUS_OPTIONS} value={activeTab} onChange={setActiveTab} />
                <FilterDropdown prefix='คลินิก:' options={LOCATION_OPTIONS} value={location} onChange={setLocation} />
                <FilterDropdown prefix='ประเภทผล:' options={RESULT_TYPE_OPTIONS} value={resultType} onChange={setResultType} />
                <FilterDropdown prefix='ผู้อ่านผล:' options={RADIOLOGIST_OPTIONS} value={radiologist} onChange={setRadiologist} />
                <FilterDateTag prefix='วันที่ส่งตรวจ:' value={dateValue} onChange={setDateValue} defaultQuick='today' />
              </OverflowFlexRow>

              {/* ── Sticky selection bar ── appears the moment ≥1 row is
                  checked; pinned under the app chrome so it survives
                  scrolling through a long page of rows. Only actions valid
                  for EVERY selected row are enabled — a mixed selection
                  shows the reason instead of silently skipping rows. */}
              {selectedRows.length > 0 && (
                <div
                  className='flex flex-wrap items-center w-full'
                  style={{
                    position: 'sticky',
                    /* App Header 64 + sticky tab strip 49 = 113 — the same
                       chrome offset Table.jsx documents for queue pages.
                       Structural height, not a spacing token. */
                    top: 113,
                    zIndex: 35, /* above the table's sticky header cells (≤30) */
                    gap: 'var(--dim-space-200)',
                    paddingTop: 'var(--dim-space-200)',
                    paddingBottom: 'var(--dim-space-200)',
                    paddingLeft: 'var(--dim-space-300)',
                    paddingRight: 'var(--dim-space-300)',
                    borderRadius: 'var(--dim-radius-300)',
                    border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-tertiary)',
                    background: 'var(--surface-brandPrimary-quaternary)',
                    boxShadow: 'var(--shadow-card-strong)',
                  }}
                >
                  {/* role=status → polite live region: AT announces the
                      changing count without stealing focus (WCAG 4.1.3). */}
                  <span
                    role='status'
                    style={{
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm)',
                      fontWeight: 'var(--type-weight-medium)',
                      color: 'var(--text-brandPrimary-default)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    เลือก {selectedRows.length} รายการ
                  </span>
                  {BULK_ACTIONS.map((a) => {
                    const { valid, reason: whyNot } = bulkValidity(a);
                    return (
                      /* Disabled <button> can't show a native tooltip, so
                         the reason rides on the wrapper's title AND the
                         button's aria-label (WCAG 4.1.2). */
                      <span key={a.kind} title={valid ? undefined : whyNot} className='inline-flex'>
                        <NeutralSubdueButton
                          variant='outline'
                          size='sm'
                          leadingIcon={a.icon}
                          disabled={!valid}
                          aria-label={valid ? undefined : `${a.label} — ${whyNot}`}
                          onClick={() => openBulkAction(a.kind)}
                        >
                          {a.label}
                        </NeutralSubdueButton>
                      </span>
                    );
                  })}
                  <div className='flex-1' />
                  <NeutralSubdueButton
                    variant='outline'
                    size='sm'
                    leadingIcon='close'
                    onClick={clearSelection}
                  >
                    ล้างการเลือก
                  </NeutralSubdueButton>
                </div>
              )}

              <Table
                columns={columns}
                rows={pageRows}
                rowKey={(row) => row.id}
                sortConfig={sortConfig}
                onSort={handleSort}
                onRowClick={(row) => setSelectedId(row.id)}
                /* 3 = checkbox + เลข XN + ผู้รับบริการ: patient identity
                   stays pinned while the table scrolls sideways — losing
                   the XN/name mid-scan is a wrong-patient risk. */
                stickyColCount={3}
                emptyMessage={emptyBecauseDates
                  ? 'ไม่พบรายการในช่วงวันที่ที่เลือก'
                  : 'ไม่พบรายการส่งตรวจที่ตรงกับการค้นหา'}
                emptySubtext={emptyBecauseDates
                  ? 'ยังมีรายการอยู่นอกช่วงวันที่นี้ — ล้างตัวกรองเพื่อแสดงทั้งหมด'
                  : undefined}
              />

              {/* Date-filter empty-state recovery — one click back to
                  วันนี้ (the default) instead of hunting the chip. */}
              {emptyBecauseDates && (
                <div className='flex justify-center w-full'>
                  <NeutralSubdueButton
                    variant='outline'
                    size='sm'
                    leadingIcon='filter_alt_off'
                    onClick={() => setDateValue({ quick: 'today' })}
                  >
                    ล้างตัวกรอง
                  </NeutralSubdueButton>
                </div>
              )}

              {/* Legend — what the row glyphs mean, so the affordances in
                  the exam column never need guessing. */}
              <div
                className='flex flex-wrap items-center w-full'
                style={{
                  gap: 'var(--dim-space-400)',
                  paddingTop: 'var(--dim-space-300)',
                  borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                }}
              >
                <LegendItem icon='flag' fill={1} color='var(--text-statusbadge-error, #B91C1C)' label='แพ้สารทึบรังสี (ตรวจที่ใช้ contrast)' />
                <LegendItem icon='pregnant_woman' color='var(--text-statusbadge-warning, #C2410C)' label='ตั้งครรภ์ — ระวังการฉายรังสี' />
                <LegendItem icon='output' color='var(--text-statusbadge-warning, #C2410C)' label='ส่งตรวจภายนอก (Referral)' />
                <LegendItem icon='content_copy' color='var(--text-statusbadge-warning, #C2410C)' label='เคยถ่ายซ้ำในช่วงเวลาเตือน' />
                <LegendItem icon='edit' color='var(--text-statusbadge-info, #1D4ED8)' label='รังสีแพทย์แก้ไขรายละเอียดการส่งตรวจ' />
              </div>

              <div
                className='flex items-center w-full'
                style={{
                  gap: 'var(--dim-space-200)',
                  paddingTop: 'var(--dim-space-200)',
                  borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                }}
              >
                <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                  แสดง {rangeStart}–{rangeEnd} จาก {sorted.length} รายการ
                </span>
                <div className='flex-1' />
                <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
              </div>
            </div>

            {/* Detail panel — always mounted so open/close animates via
                width + opacity instead of popping; pointerEvents 'none'
                while closed stops the invisible box swallowing clicks. */}
            <div
              className='flex flex-col'
              aria-hidden={!panelOpen}
              style={{
                width: panelOpen ? 420 : 0,
                minWidth: 0,
                flexShrink: 0,
                opacity: panelOpen ? 1 : 0,
                pointerEvents: panelOpen ? 'auto' : 'none',
                transition: 'width 280ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease-out',
                background: 'var(--surface-card-100)',
                borderRadius: 'var(--dim-radius-500)',
                border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                boxShadow: 'var(--shadow-card-strong)',
                minHeight: 560,
                overflow: 'hidden',
              }}
            >
              <div style={{ width: 420 }}>
                <XrayDetailPanel
                  key={selected?.id}
                  order={selected}
                  orderRows={orderRows}
                  onClose={() => setSelectedId(null)}
                  printEnabled={dialogKind !== 'print' && dialogKind !== 'bulkPrint'}
                />
              </div>
            </div>
          </div>
        </div>
      </QueuePageShell>
    </>
  );
};

export default XrayQueuePage;
