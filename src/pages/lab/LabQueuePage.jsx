import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import { LabPrintLabelsButton, LabOrderCtaButton } from '@/components/lab/LabHeaderActions';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import Table, { EllipsisText } from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import { FilterDropdown } from '@/components/forms/FilterTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import AlertDialog from '@/components/popup/AlertDialog';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SelectableCardButton from '@/components/button/SelectableCardButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import Pagination from '@/components/pagination/Pagination';
import { Icon } from '@/components/icons/Icon';
import LabSubNav from '@/components/lab/LabSubNav';
import StickyStatusTabBar from '@/components/tab/StickyStatusTabBar';
import {
  LAB_ORDERS, LAB_STATUSES, LAB_URGENCIES, LAB_LOCATIONS,
  LAB_STATUS_BY_KEY, LAB_URGENCY_BY_KEY,
  LAB_REJECT_REASONS, LAB_REJECT_REASON_BY_KEY,
  withTestLabel, labHistoryFor,
  subscribeOrders, updateLabOrder, deleteLabOrder,
  dueAdvanceOrders, activateAdvanceOrder, cancelAdvanceOrder,
} from '@/data/labOrders';
import { LAB_GROUPS, LAB_TUBES, LAB_TEST_BY_ID, duplicateWarning } from '@/data/labCatalog';
import LabDetailPanel from '@/pages/lab/LabDetailPanel';
import LabTubeDot from '@/pages/lab/LabTubeDot';
import LabSpecimenLabel from '@/components/lab/LabSpecimenLabel';
import LabResultEntryPopup from '@/components/lab/LabResultEntryPopup';
import LabReportPopup from '@/components/lab/LabReportPopup';
import { printLab } from '@/data/labPrintSettings';
import { LAB_AUDIT, LAB_AUDIT_SCOPES, appendLabAudit, subscribeLabAudit } from '@/data/labAudit';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import SuccessToast from '@/components/toast/SuccessToast';
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';
import QueuePatientAvatar, { resolveQueuePatientAvatarProps } from '@/components/patient/QueuePatientAvatar';

/* งานชันสูตรโรค — Worklist. The lab's own working screen: every specimen
   the department owes somebody, from the moment a doctor's order lands to
   the moment an approved result is released back.

   Rebuilt directly against the worklist widget the team drew in
   `Lab dicussion with team.pdf` (Kaebrain folder, MIH-Docs-Vault Obsidian
   vault), which is a tighter spec than TOR §1.15 alone and supersedes it
   wherever the two disagree. From that deck:

     • Six tabs, in this order: รอรับคำขอ · รอเก็บ/รับตัวอย่าง · กำลังตรวจ ·
       ส่งตรวจภายนอก · รอรับรองผล · รายงานผลแล้ว.
     • A "สแกนบาร์โค้ด" primary action, because the bench works barcode-first.
     • Search covers Accession as well as HN/ชื่อ — the mockup's placeholder
       is literally "ค้นหา HN / ชื่อ / Accession".
     • A "STAT ก่อน" toggle: "STAT ต้องเด้งขึ้นบนสุด (สีแดง)".
     • The column list in the deck's table A, minus การเตรียมตัว — the team
       struck that one explicitly ("column การเตรียมตัวไม่ต้อง").
     • Row actions: พิมพ์ label · เก็บแล้ว · reject · เจาะซ้ำ.
     • A footer legend: ค่าวิกฤต (แจ้งแพทย์) · ผลปิด/ปกติ · เตือนสั่งซ้ำ ·
       EDTA · Clot · Fluoride/Hep.

   Still TOR-compliant on the points it also covers: §1.15.4.9 (ความเร่งด่วน,
   สิ่งส่งตรวจ, ราคา, ลบข้อมูลได้), §1.15.4.6 (ผลผิดปกติ), §1.15.3.2 (ค่าวิกฤต),
   §1.15.2.4 (ปกปิดผลที่เป็นความลับ), §1.15.4.10 (แถบข้อมูลตามประเภท → the
   group filter), §1.15.5 (สติกเกอร์/บาร์โค้ด → the label + scan actions). */

const breadcrumb = ['ห้องปฏิบัติการ'];

/* The mock's "today", matching LabOrderPage — a real deployment reads the
   clock; pinning it keeps the seeded advance orders reproducible. */
const TODAY = '2026-07-31';

/* StatusBadge only ships these style keys (see STYLES in StatusBadge.jsx):
   neutral | info | success | warning | error | yellow. LAB_STATUSES already
   carries a `color` drawn from that set, so this is just a lookup. */
const STATUS_STYLE = Object.fromEntries(LAB_STATUSES.map((s) => [s.key, s.color]));

const PAGE_SIZE = 20;

/* Summary cards mirror what a lab lead actually watches: the two queues
   where work piles up, plus the two exception classes that need a human
   right now. Built from `liveRows` so a delete updates them. */
const buildSummaryCards = (rows) => [
  { key: 'pending',  label: 'รอดำเนินการ', value: rows.filter((o) => o.status === 'requested' || o.status === 'collect').length, indicator: 'รอรับคำขอ + รอเก็บตัวอย่าง', color: 'info', icon: 'colorize' },
  { key: 'approval', label: 'รอรับรองผล', value: rows.filter((o) => o.status === 'approval').length, indicator: 'แพทย์ยังดูผลไม่ได้', color: 'inprogress', icon: 'fact_check' },
  { key: 'critical', label: 'ค่าวิกฤต (Critical)', value: rows.filter((o) => o.critical).length, indicator: 'ต้องแจ้งแพทย์', color: 'destructive', icon: 'warning' },
  { key: 'exception', label: 'ปฏิเสธ / เจาะซ้ำ', value: rows.filter((o) => o.exception).length, indicator: 'ต้องเก็บตัวอย่างใหม่', color: 'destructive', icon: 'block' },
];

/* Tabs are the six pipeline stages, in pipeline order, exactly as the
   mockup's tab strip renders them (รอรับคำขอ 4 · รอเก็บ/รับตัวอย่าง 9 ·
   กำลังตรวจ 6 · ส่งตรวจภายนอก 5 · รอรับรองผล 3 · รายงานผลแล้ว 58). */
const buildTabs = (rows, advanceCount = 0) => [
  /* คำสั่งล่วงหน้าอยู่ก่อน "รอรับคำขอ" เพราะยังไม่เข้าสายพาน — ยังไม่มี
     Accession จนกว่าผู้ป่วยจะมาถึงแล้วกด "ดึงมาใช้" */
  ...(advanceCount > 0
    ? [{ key: 'advance', label: 'คำสั่งตรวจล่วงหน้า', icon: 'event_upcoming', count: advanceCount }]
    : []),
  ...LAB_STATUSES.map((s) => ({
    key: s.key,
    label: s.label,
    icon: s.icon,
    count: rows.filter((r) => r.status === s.key).length,
  })),
  /* ทั้งหมด sits LAST (มติผู้ใช้ 28 ส.ค. 69) — the strip then reads as the
     pipeline first and the catch-all after it, rather than opening on the
     one tab that is not a stage. */
  { key: 'all', label: 'ทั้งหมด', icon: 'biotech', count: rows.length },
];

/* Patient avatar chip — 36px circle, same shape/size as QueuePage.jsx's
   `Avatar` cell (Figma 3185:144272 row rhythm). Falls back to the initial
   when the image fails, or to a lock glyph for a confidential row whose
   identity the worklist deliberately does not show. */
const PatientAvatar = ({ patient, masked }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div
      className='shrink-0 flex items-center justify-center text-white overflow-hidden'
      style={{
        width: 36,
        height: 36,
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: 'var(--surface-avatar-fallback, #9AA1A8)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
        lineHeight: 1,
      }}
      aria-hidden
    >
      {masked ? (
        <Icon name='lock' size={16} />
      ) : patient?.avatarUrl && !imgError ? (
        <img
          src={patient.avatarUrl}
          alt={patient.shortName}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        patient?.shortName?.trim().charAt(0) || '?'
      )}
    </div>
  );
};

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:lab-queue';

/* นำส่งออกรายงาน — ExportFormatPopup ตัวเดียวกับหน้าอื่นในระบบ (ความยินยอม /
   เภสัชกรรม / เยี่ยมบ้าน) จึงได้เลือกรูปแบบไฟล์และมี log การส่งออกเหมือนกันหมด.
   คอลัมน์ตามที่ตารางแสดง — แถวปกปิด (§1.15.2.4) ส่งออกเป็นค่าปกปิดเช่นเดียวกับ
   บนหน้าจอ ไม่ใช่ชื่อจริง มิฉะนั้นการปกปิดจะรั่วออกทางไฟล์แทน. */
const LAB_WORKLIST_EXPORT_COLUMNS = [
  { key: 'queueNo', header: 'คิว', width: 70 },
  { key: 'accessionNo', header: 'Accession', width: 130 },
  { key: 'urgencyLabel', header: 'ความเร่งด่วน', width: 120 },
  { key: 'hn', header: 'HN', width: 120 },
  { key: 'name', header: 'ชื่อ-สกุล', width: 200 },
  { key: 'ageSex', header: 'อายุ / เพศ', width: 120 },
  { key: 'orderedAt', header: 'เวลาสั่ง', width: 100 },
  { key: 'location', header: 'จุดสั่ง / ward', width: 150 },
  { key: 'doctor', header: 'แพทย์ผู้สั่ง', width: 170 },
  { key: 'testLabel', header: 'รายการ / กลุ่มตรวจ', width: 220 },
  { key: 'tubeLabel', header: 'ตัวอย่าง + หลอด', width: 150 },
  { key: 'volume', header: 'จำนวน / ปริมาตร', width: 150 },
  { key: 'statusLabel', header: 'สถานะ', width: 140 },
  { key: 'resultFlag', header: 'ผล', width: 120 },
  { key: 'price', header: 'ราคา', width: 100 },
];

/* PrimarySearch suggestion/history item shape (Figma 3345:2981 — two
   colourful pills + label + sublabel), mirroring queueRowToSearchItem in
   QueuePage.jsx. Accession leads the pills because that is what a bench
   tech reads off the tube in hand. */
const rowToSearchItem = (row) => ({
  id: row.id,
  label: row.confidential ? 'ปกปิด (VCT)' : row.patient.shortName,
  sublabel: `${row.testLabel} · ${row.location}`,
  value: row.accessionNo,
  badges: [
    { label: row.accessionNo, tone: 'indigo' },
    { label: row.confidential ? 'HN •••••' : row.patient.hn, tone: 'purple' },
  ],
  avatarSrc: row.confidential ? undefined : row.patient.avatarUrl,
});

/* ─────────── Action-bar filters ─────────── */

/* TOR §1.15.4.10 "แสดงแถบข้อมูลการขอตรวจตามประเภท" — now keyed off the
   MyHOSPITAL group list (labCatalog.js LAB_GROUPS) rather than the older
   ad-hoc category buckets, so the filter, the worklist column and the
   Setup page's กลุ่ม dropdown all read from one list. */
const GROUP_OPTIONS = [
  { value: 'all', label: 'ทุกกลุ่มตรวจ' },
  ...LAB_GROUPS.map((g) => ({ value: g.key, label: `${g.thai} (${g.short})` })),
];

/* ความเร่งด่วน — the team's three levels (STAT / ด่วน / Routine), not the
   two the earlier build had. */
const URGENCY_OPTIONS = [
  { value: 'all', label: 'ทุกระดับความเร่งด่วน' },
  ...LAB_URGENCIES.map((u) => ({ value: u.key, label: u.label })),
];

/* จุดสั่ง / ward — "รู้ว่ามาจาก OPD/ward ไหน". */
const LOCATION_OPTIONS = [
  { value: 'all', label: 'ทุกจุดสั่ง' },
  ...LAB_LOCATIONS.map((l) => ({ value: l, label: l })),
];

const TUBE_OPTIONS = [
  { value: 'all', label: 'ทุกชนิดหลอด' },
  ...Object.values(LAB_TUBES).map((t) => ({ value: t.key, label: t.thai })),
];

/* ─────────── Aging / SLA ─────────── */

/* "เวลาสั่ง … ดู aging / SLA รอคิวนานเกินไหม". `orderedAt` is a wall-clock
   'HH:MM' string and the mock day runs to about 09:00, so aging is measured
   against a fixed NOW rather than the real clock — a real deployment reads
   the order timestamp instead. Keeping it fixed also means the mock renders
   identically on every load (no Date.now() drift between reloads). */
const NOW_MINUTES = 9 * 60;
const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm ?? '').split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};
const ageMinutes = (row) => {
  const t = toMinutes(row.orderedAt);
  return t == null ? null : Math.max(0, NOW_MINUTES - t);
};
/* Only work still in the pipeline can be overdue — a reported result has
   already landed, so flagging it red would be noise. */
const isOverdue = (row) => {
  if (row.status === 'reported') return false;
  const age = ageMinutes(row);
  return age != null && age > row.slaMinutes;
};
const formatAge = (mins) => {
  if (mins == null) return '';
  if (mins < 60) return `${mins} นาที`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} ชม.` : `${h} ชม. ${m} น.`;
};

/* ─────────── Columns ─────────── */

/* Table A from the team deck, in its order, minus การเตรียมตัว. `onAction`
   is the component's row-action closure, so columns are built inside the
   component via useMemo rather than declared at module scope. */
const buildColumns = (onAction, historyFor) => [
  /* คิว / ลำดับ — "เรียงลำดับเรียกผู้ป่วย". */
  {
    key: 'queueNo', label: 'คิว', align: 'center',
    render: (row) => (
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)' }}>
        {row.queueNo}
      </span>
    ),
  },
  /* Accession / บาร์โค้ด — "สแกนพิมพ์สติกเกอร์ติดหลอด". Leads the row in the
     mockup. The "รอพิมพ์ label" sub-line was dropped 28 ส.ค. 69 (มติผู้ใช้);
     `row.labeled` is still tracked and still set when a sticker prints. */
  {
    key: 'accessionNo', label: 'Accession / บาร์โค้ด',
    render: (row) => (
      <div className='flex flex-col min-w-0' style={{ gap: 2 }}>
        {/* คำสั่งล่วงหน้ายังไม่ออก Accession — ออกตอนกด "ดึงมาใช้" (§1.15.4.7) */}
        {row.status === 'advance' ? (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            ยังไม่ออก Accession
          </span>
        ) : (
          <span
            className='inline-flex items-center'
            style={{ gap: 'var(--dim-space-150)', fontFamily: 'var(--type-family-mono, monospace)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}
          >
            <Icon name='barcode' size={14} />
            {row.accessionNo}
          </span>
        )}
      </div>
    ),
  },
  /* ความเร่งด่วน — "STAT ต้องเด้งขึ้นบนสุด (สีแดง)". */
  {
    key: 'urgency', label: 'ความเร่งด่วน',
    /* STAT is the only urgency that earns a badge (มติผู้ใช้ 28 ส.ค. 69) —
       ด่วน / Routine render blank so the red pill keeps its meaning at a
       glance. The urgency itself is unchanged: it still sorts, still
       filters, and still drives the ความเร่งด่วน dropdown. */
    render: (row) => (
      row.urgency === 'stat' ? <Badge style='error' size='small'>STAT</Badge> : null
    ),
  },
  /* HN + ชื่อ-สกุล — "ระบุตัวผู้ป่วย (ควร verify 2 identifiers)", so the two
     identifiers deliberately sit in one cell and are read together.
     Confidential rows (Anti-HIV, VDRL) mask both per TOR §1.15.2.4 — the
     mockup shows exactly this as "ปกปิด (VCT) · HN •••••". */
  {
    key: 'patient', label: 'HN + ชื่อ-สกุล', flex: true, minWidth: 220,
    render: (row) => (
      <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
        <PatientAvatar patient={row.patient} masked={row.confidential} />
        <div className='flex flex-col min-w-0'>
          <span className='inline-flex items-center min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
            {row.confidential ? (
              <EllipsisText text='ปกปิด (VCT)' />
            ) : (
              <MaskedWorklistName
                name={row.patient.shortName}
                recordKey={row.patient.hn || row.hn}
                className='min-w-0 truncate'
              />
            )}
            {row.confidential && (
              <span className='shrink-0' title='ผลตรวจเป็นความลับ' style={{ color: 'var(--text-content-quaternary)' }}>
                <Icon name='lock' size={14} />
              </span>
            )}
          </span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            HN {row.confidential ? '•••••' : row.patient.hn} · {row.vn}
          </span>
        </div>
      </div>
    ),
  },
  /* อายุ / เพศ — "ผลบางค่าใช้ค่าต่างช่วง + เลือกเทคนิคเจาะ". The stored age
     is free-text Thai ("42 ปี - 3 เดือน - 8 วัน"); only the year matters here. */
  {
    key: 'ageSex', label: 'อายุ / เพศ',
    render: (row) => (
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
        {row.confidential ? '—' : `${parseInt(row.patient.age, 10) || '—'} ปี / ${row.patient.sex}`}
      </span>
    ),
  },
  /* เวลาสั่ง — the aging / "เกิน SLA" sub-line was dropped 28 ส.ค. 69
     (มติผู้ใช้); `slaMinutes` per urgency still lives in LAB_URGENCIES. */
  {
    key: 'orderedAt', label: 'เวลาสั่ง',
    render: (row) => (
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
        {row.orderedAt}
      </span>
    ),
  },
  /* จุดสั่ง / ward — the team clarified this is the ordering clinic. */
  {
    key: 'location', label: 'จุดสั่ง / ward',
    render: (row) => (
      <span className='block min-w-0' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
        <EllipsisText text={row.location} />
      </span>
    ),
  },
  /* แพทย์ผู้สั่ง — "ติดต่อกลับเมื่อสงสัย". */
  {
    key: 'doctor', label: 'แพทย์ผู้สั่ง',
    render: (row) => (
      <span className='block min-w-0' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
        <EllipsisText text={row.doctor} />
      </span>
    ),
  },
  /* รายการ / กลุ่มตรวจ — "บอกว่าต้องเจาะอะไรบ้าง". Test name over its group,
     since the group is what determines the tube on the next column. */
  {
    key: 'testLabel', label: 'รายการ / กลุ่มตรวจ', flex: true, minWidth: 200,
    render: (row) => (
      <div className='flex flex-col min-w-0' style={{ gap: 2 }}>
        <span className='inline-flex items-center min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
          <EllipsisText text={row.testLabel} />
        </span>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
          {row.groupLabel} · {row.testNameTh}
        </span>
      </div>
    ),
  },
  /* ชนิดตัวอย่าง + หลอด (สีจุก) — "EDTA(ม่วง)/Clot(แดง)/Fluoride(เทา) ฯลฯ".
     Colour is derived from the test's group, never hand-set. */
  {
    key: 'tube', label: 'ตัวอย่าง + หลอด',
    render: (row) => <LabTubeDot tube={row.tube} count={row.tubeCount} />,
  },
  /* จำนวนหลอด + ปริมาตร — "เตรียมหลอดให้ครบ ไม่ต้องเจาะซ้ำ". */
  {
    key: 'volumeMl', label: 'จำนวน / ปริมาตร',
    render: (row) => (
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
        {row.tubeCount} หลอด · {row.volumeMl} mL
      </span>
    ),
  },
  /* สถานะ — "ติดตามงาน". An exception (rejected/redraw) overrides the pill,
     because "ปฏิเสธแล้วรอเจาะใหม่" is the fact the bench needs to see first. */
  {
    key: 'status', label: 'สถานะ',
    render: (row) => {
      /* คำสั่งล่วงหน้า — ป้ายบอกว่าเป็นคำสั่งล่วงหน้า พร้อมวันที่ต้องทำ
         (มติผู้ใช้ 28 ส.ค. 69) วันนัดคือสิ่งที่ห้องแล็บต้องเห็นคู่กับป้ายเสมอ
         ไม่งั้นแยกไม่ออกว่าเลยกำหนดมาแล้วกี่วัน */
      if (row.status === 'advance') {
        return (
          <div className='flex flex-col' style={{ gap: 2 }}>
            <Badge style='warning' size='small'>คำสั่งตรวจล่วงหน้า</Badge>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              นัดตรวจ {row.scheduledFor}
            </span>
          </div>
        );
      }
      if (row.exception === 'rejected') {
        return <Badge style='error' size='small' title={row.rejectReason}>ปฏิเสธตัวอย่าง</Badge>;
      }
      if (row.exception === 'redraw') {
        return <Badge style='warning' size='small' title={row.rejectReason}>รอเจาะซ้ำ</Badge>;
      }
      return <Badge style={STATUS_STYLE[row.status]} size='small'>{row.statusLabel}</Badge>;
    },
  },
  /* ค่าวิกฤต vs ผลผิดปกติ — TOR §1.15.3.2 vs §1.15.4.6, two severities.
     Critical wins when both are true (a panic value is always abnormal). */
  {
    key: 'resultFlag', label: 'ผล',
    render: (row) => {
      if (row.critical) {
        return (
          <div className='flex items-center' style={{ gap: 'var(--dim-space-100)', color: 'var(--text-statusbadge-error, #B91C1C)' }}>
            <Icon name='warning' size={16} />
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>ค่าวิกฤต</span>
          </div>
        );
      }
      if (row.abnormal) {
        return (
          <div className='flex items-center' style={{ gap: 'var(--dim-space-100)', color: 'var(--text-statusbadge-warning, #C2410C)' }}>
            <Icon name='error' size={16} />
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>ผิดปกติ</span>
          </div>
        );
      }
      if (row.status === 'reported') {
        return (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>ปกติ</span>
        );
      }
      return null;
    },
  },
  /* ราคา — TOR §1.15.4.9 "ราคา และข้อมูลยอดรวมทั้งหมด". The per-ORDER total
     lives in the detail panel; a table-wide sum would add up unrelated
     patients' line items, which isn't what "ยอดรวม" means. */
  {
    key: 'price', label: 'ราคา',
    render: (row) => (
      <div className='w-full flex justify-end'>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
          {row.price.toLocaleString('th-TH')}
        </span>
      </div>
    ),
  },
  /* การจัดการ — "action ต่อ 1 แถว": พิมพ์ label · เก็บแล้ว · บันทึกผล · reject ·
     เจาะซ้ำ · ลบ. Which of them apply depends on where the row sits in the
     pipeline: you cannot mark a specimen collected before its label is
     printed, and you cannot reject one that was never drawn. */
  {
    key: 'actions', label: 'การจัดการ', sortable: false, align: 'center',
    render: (row) => {
      /* คำสั่งล่วงหน้ายังทำอะไรกับสิ่งส่งตรวจไม่ได้ (ยังไม่มีตัวอย่าง) — มีแค่
         ดึงมาใช้เมื่อผู้ป่วยมาถึง กับยกเลิกคำสั่ง */
      if (row.status === 'advance') {
        return (
          <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-100)' }}>
            <NeutralSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='download'
              onClick={(e) => { e.stopPropagation(); onAction('activateAdvance', row); }}
            >
              ดึงมาใช้
            </NeutralSubdueButton>
            <NeutralSubdueIconButton
              icon='delete'
              variant='outline'
              size='sm'
              aria-label={`ยกเลิกคำสั่งล่วงหน้า ${row.orderId}`}
              title='ยกเลิกคำสั่งล่วงหน้า'
              onClick={(e) => { e.stopPropagation(); onAction('cancelAdvance', row); }}
            />
          </div>
        );
      }
      const canCollect = row.status === 'requested' || row.status === 'collect';
      const canReject = row.status !== 'requested' && row.status !== 'reported';
      /* Result entry opens once the specimen is actually in the lab. A
         released result stays reachable so it can be AMENDED — the entry
         screen switches itself into amendment mode (TOR §1.15.6.1). */
      const canEnterResult = row.status === 'analysing' || row.status === 'external'
        || row.status === 'approval' || row.status === 'reported';
      /* §1.15.4.9 "สามารถลบข้อมูลได้" — deleting a REQUEST is legitimate (a
         doctor cancels before the draw). Deleting a released RESULT is not:
         the ward may already have acted on it, and the correct route is an
         amended report, not erasure. Hence the gate rather than a bare
         delete button. */
      const canDelete = row.status !== 'reported';
      return (
        <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-100)' }}>
          <NeutralSubdueIconButton
            icon='print'
            variant='outline'
            size='sm'
            aria-label={`พิมพ์สติกเกอร์ ${row.accessionNo}`}
            title='พิมพ์ label'
            onClick={(e) => { e.stopPropagation(); onAction('label', row); }}
          />
          <NeutralSubdueIconButton
            icon='check'
            variant='outline'
            size='sm'
            disabled={!canCollect}
            aria-label={`บันทึกเก็บตัวอย่างแล้ว ${row.accessionNo}`}
            title={canCollect ? 'เก็บแล้ว' : 'เก็บตัวอย่างแล้ว'}
            onClick={(e) => { e.stopPropagation(); onAction('collect', row); }}
          />
          <NeutralSubdueIconButton
            icon='edit_note'
            variant='outline'
            size='sm'
            disabled={!canEnterResult}
            aria-label={`บันทึกผลตรวจ ${row.accessionNo}`}
            title={row.status === 'reported' ? 'แก้ไขผล (ออกรายงานฉบับแก้ไข)' : 'บันทึกผลตรวจ'}
            onClick={(e) => { e.stopPropagation(); onAction('result', row); }}
          />
          {/* One button, not two. Rejecting and re-drawing are the same
              decision from the bench's point of view — "this specimen is no
              good" — and which of the two follows depends on the REASON,
              which the dialog asks for. Collapsing them also buys back the
              column width that six icon buttons were eating. */}
          <NeutralSubdueIconButton
            icon='block'
            variant='outline'
            size='sm'
            disabled={!canReject}
            aria-label={`ปฏิเสธ/เจาะซ้ำ ${row.accessionNo}`}
            title='ปฏิเสธสิ่งส่งตรวจ / สั่งเจาะซ้ำ'
            onClick={(e) => { e.stopPropagation(); onAction('reject', row); }}
          />
          {/* The patient's own sheet — only exists once a result has been
              released, so it replaces nothing and appears only then. */}
          <NeutralSubdueIconButton
            icon='description'
            variant='outline'
            size='sm'
            disabled={row.status !== 'reported'}
            aria-label={`ใบรายงานผลสำหรับผู้ป่วย ${row.accessionNo}`}
            title='ใบรายงานผลสำหรับผู้ป่วย'
            onClick={(e) => { e.stopPropagation(); onAction('patientReport', row); }}
          />
          <NeutralSubdueIconButton
            icon='delete'
            variant='outline'
            size='sm'
            disabled={!canDelete}
            aria-label={`ลบรายการขอตรวจ ${row.accessionNo}`}
            title={canDelete ? 'ลบรายการขอตรวจ' : 'ลบไม่ได้ — รายงานผลไปแล้ว ให้ใช้การแก้ไขผลแทน'}
            onClick={(e) => { e.stopPropagation(); onAction('delete', row); }}
          />
        </div>
      );
    },
  },
];

/* Search covers the mockup's three fields — HN / ชื่อ / Accession — plus
   the test name and ordering doctor, which cost nothing and are the next
   things anyone reaches for. A confidential row is findable by Accession
   and HN but NOT by patient name: masking the name in the table while
   leaving it searchable would defeat §1.15.2.4. */
const matchesQuery = (row, q) => {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const fields = [row.accessionNo, row.patient.hn, row.orderId, row.testLabel, row.testNameTh];
  if (!row.confidential) fields.push(row.patient.shortName, row.doctor);
  return fields.some((f) => String(f ?? '').toLowerCase().includes(needle));
};

/* Every header is clickable-sortable. Table renders the arrows and tracks
   `sortConfig` but does NOT reorder rows — the caller must, same as
   QueuePage.jsx's `sortedRows`. Rank maps turn non-alphabetic columns into
   sortable numbers; everything else sorts as text via Intl.Collator, which
   handles Thai and numeric-looking strings (VN/HN/Accession) correctly. */
const STATUS_RANK = Object.fromEntries(LAB_STATUSES.map((s, i) => [s.key, i]));
const severityRank = (row) => (row.critical ? 0 : row.abnormal ? 1 : 2);

const sortValue = (row, key) => {
  switch (key) {
    case 'urgency':    return row.urgencyRank;
    case 'patient':    return row.confidential ? '' : row.patient.shortName;
    case 'ageSex':     return parseInt(row.patient.age, 10) || 0;
    case 'orderedAt':  return toMinutes(row.orderedAt) ?? 0;
    case 'status':     return STATUS_RANK[row.status] ?? 99;
    case 'resultFlag': return severityRank(row);
    case 'price':      return row.price ?? 0;
    case 'volumeMl':   return row.volumeMl ?? 0;
    case 'tube':       return row.tubeLabel ?? '';
    case 'queueNo':    return row.queueNo ?? 0;
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
  /* "STAT ต้องเด้งขึ้นบนสุด" — applied AFTER the chosen sort so it floats
     urgent work to the top without destroying the column ordering
     underneath it. A stable sort keeps ties in the sorted order. */
  if (!statFirst) return base;
  return [...base].sort((a, b) => a.urgencyRank - b.urgencyRank);
};

const LabQueuePage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [group, setGroup] = useState('all');
  const [urgency, setUrgency] = useState('all');
  const [location, setLocation] = useState('all');
  const [tube, setTube] = useState('all');
  const filtersActive = query.trim() !== ''
    || group !== 'all'
    || urgency !== 'all'
    || location !== 'all'
    || tube !== 'all';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setQuery('');
      setGroup('all');
      setUrgency('all');
      setLocation('all');
      setTube('all');
    },
  );
  /* STAT rows always sort to the top. It used to be a toggle beside the
     filters; the pill is gone, but the behaviour it defaulted to is the
     only one the bench ever wants — an urgent tube below a routine one is
     a mistake, not a view preference. */
  const statFirst = true;
  const [page, setPage] = useState(1);

  /* Rows are derived from the shared order store, not held in local state.
     Result entry happens on its own route (/lab/result/:id), so a result
     saved there has to be visible the moment you come back here — a private
     copy of the rows would show yesterday's status forever. Every mutation
     on this page therefore goes through `updateLabOrder` and re-renders via
     the version bump, which keeps exactly one source of truth. */
  const [orderVersion, setOrderVersion] = useState(0);
  useEffect(() => subscribeOrders(() => setOrderVersion((v) => v + 1)), []);
  const liveRows = useMemo(
    () => LAB_ORDERS.map(withTestLabel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orderVersion],
  );

  /* §1.15.4.8 — advance orders whose date has arrived. Re-derived on the
     same version bump, so activating one makes it disappear from the alert
     and appear in the table in the same render. */
  const dueAdvance = useMemo(
    () => dueAdvanceOrders(TODAY),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orderVersion],
  );

  /* คำสั่งตรวจล่วงหน้าที่ถึงกำหนดแล้ว เดิมอยู่ในแถบแจ้งเตือนเหนือตาราง แต่ถูก
     ย้ายลงมาเป็นแถวในตารางเอง (มติผู้ใช้ 28 ส.ค. 69) — งานที่ห้องแล็บต้องทำ
     ควรอยู่ที่เดียวกับงานอื่น ไม่ใช่กล่องแยกที่มองข้ามได้ แถวเหล่านี้ยัง
     "ไม่ใช่" รายการขอตรวจจริง: ยังไม่มี Accession จนกว่าจะกด "ดึงมาใช้"
     (§1.15.4.7) จึงถือสถานะ `advance` ของตัวเอง ไม่ปนกับ requested */
  const advanceRows = useMemo(
    () => dueAdvance.flatMap((adv) => adv.testIds.map((testId, i) => withTestLabel({
      id: `${adv.id}-${i + 1}`,
      orderId: adv.id,
      accessionNo: '',
      testId,
      patient: adv.patient,
      doctor: adv.doctor,
      location: adv.location,
      urgency: adv.urgency,
      orderedAt: adv.createdAt,
      status: 'advance',
      statusLabel: 'คำสั่งตรวจล่วงหน้า',
      /* ข้อมูลที่แถวปกติมีแต่คำสั่งล่วงหน้ายังไม่มี */
      labeled: false, critical: false, abnormal: false, exception: undefined,
      /* พาตัวคำสั่งจริงติดไปด้วย เพื่อให้ปุ่มยกเลิก/ดึงมาใช้ทำงานกับ ADV-### ได้ */
      advance: adv,
      scheduledFor: adv.scheduledFor,
      advanceNote: adv.note,
    }))),
    [dueAdvance],
  );

  /* คำสั่งล่วงหน้าขึ้นก่อนเสมอ — ถึงกำหนดแล้วแต่ยังไม่มีใครดึงมาใช้ */
  const allRows = useMemo(() => [...advanceRows, ...liveRows], [advanceRows, liveRows]);

  /* Barcode scan — the deck's primary action. There's no scanner hardware
     behind this frontend, so the button focuses the search box and puts it
     in scan mode; a real HID barcode wedge types into the focused field and
     submits, which is exactly what PrimarySearch already handles. */
  const [scanMode, setScanMode] = useState(false);
  /* Rows handed to the print-only sticker sheet — set immediately before
     printing so one click prints one tube's label, not the whole table. */
  const [printRows, setPrintRows] = useState([]);
  /* บันทึกผลตรวจ — holds the order id the result popup is editing. */
  const [resultTarget, setResultTarget] = useState(null);
  /* ใบผลตรวจ — holds the orderId whose patient report sheet is open. */
  const [reportTarget, setReportTarget] = useState(null);
  /* นำส่งออกรายงาน — the popup takes a built report, so state holds the
     report (null = closed) rather than a bare open flag. */
  const [exportReport, setExportReport] = useState(null);
  const [exportDone, setExportDone] = useState(false);
  /* Rejection dialog — holds the row and the chosen reason. */
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const searchWrapRef = useRef(null);
  const handleScan = () => {
    setScanMode(true);
    setQuery('');
    const input = searchWrapRef.current?.querySelector('input');
    if (input) input.focus();
  };

  const summaryCards = useMemo(() => buildSummaryCards(liveRows), [liveRows]);
  const tabs = useMemo(() => buildTabs(liveRows, advanceRows.length), [liveRows, advanceRows.length]);

  /* Row-action confirmation — one dialog reused for every destructive-ish
     action, holding the pending row + action so the copy stays correct
     until the user confirms or cancels (same `deleteCandidate` pattern as
     QueuePage.jsx). Printing a label needs no confirmation. */
  const [pendingAction, setPendingAction] = useState(null);
  const closeAction = () => setPendingAction(null);

  /* Audit trail — no auth context exists anywhere in this frontend-only app
     yet (Sidebar's user footer is placeholder text, not a real auth
     object), so CURRENT_ACTOR stands in for whoever a real auth layer would
     resolve.

     MIGRATED from a page-local `logAudit` + `auditSeq` pair to the shared
     appender in src/data/labAudit.js. When this was the only lab screen that
     changed anything, a local list was honest. It is now one of six —
     receiving, send-out, QC override, LIS credential changes and inbound
     message import all mutate specimen or result state — and a drawer that
     shows only this page's actions while calling itself "ประวัติการดำเนินการ"
     reads as complete while missing the riskiest ones. Every lab screen now
     writes to the same store and this drawer renders all of it. */
  const CURRENT_ACTOR = 'เจ้าหน้าที่ห้องปฏิบัติการ';
  const [auditVersion, setAuditVersion] = useState(0);
  useEffect(() => subscribeLabAudit(() => setAuditVersion((v) => v + 1)), []);
  const auditLog = useMemo(() => LAB_AUDIT.slice(0, 40), [auditVersion]);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const logAudit = (action, detail, extra) => appendLabAudit({
    actor: CURRENT_ACTOR,
    action,
    detail,
    scope: extra?.scope ?? 'specimen',
    before: extra?.before,
    after: extra?.after,
  });

  const rowLabel = (row) => `${row.testLabel} · ${row.accessionNo} — ${row.confidential ? 'ผู้ป่วยปกปิด' : row.patient.shortName}`;

  const handleAction = (kind, row) => {
    if (kind === 'activateAdvance') {
      /* §1.15.4.7 — ขยายคำสั่งล่วงหน้าเป็นรายการขอตรวจจริงและออก Accession */
      const adv = row.advance;
      const created = activateAdvanceOrder(adv.id);
      logAudit('ดึงคำสั่งตรวจล่วงหน้ามาใช้', `${adv.patient.shortName} · ${created.length} รายการ (${adv.id})`);
      return;
    }
    if (kind === 'cancelAdvance') {
      /* ยืนยันด้วยกล่องเดิม แต่ส่ง "ตัวคำสั่งล่วงหน้า" ไม่ใช่แถวในตาราง เพราะ
         cancelAdvanceOrder ทำงานกับ ADV-### และข้อความยืนยันอ่านจาก testIds */
      setPendingAction({ kind: 'cancelAdvance', row: row.advance });
      return;
    }
    if (kind === 'label') {
      /* Sticker printing (TOR §1.15.5.1) needs no confirmation — it is
         additive and re-printable. Every row sharing this accession prints
         on ONE sticker, because one accession is one tube (§1.15.5.3): a
         CBC and an HbA1c both drawn into the same EDTA tube must not
         produce two labels for one physical tube. */
      setPrintRows(liveRows.filter((r) => r.accessionNo === row.accessionNo));
      updateLabOrder(row.id, { labeled: true });
      logAudit('พิมพ์สติกเกอร์ติดหลอด', rowLabel(row));
      /* Let the print-only sheet re-render with the new rows before the
         browser snapshots the page. */
      window.setTimeout(() => printLab('sticker'), 0);
      return;
    }
    if (kind === 'reject') {
      /* Rejection needs a reason, so it gets a purpose-built dialog rather
         than the generic yes/no confirm. */
      setRejectTarget(row);
      setRejectReason('');
      return;
    }
    if (kind === 'patientReport') {
      /* Same sheet the /lab/report/:orderId route shows, opened over the
         worklist — proofreading a report is a glance, not a destination. */
      setReportTarget(row.orderId);
      return;
    }
    if (kind === 'result') {
      /* Result entry (TOR §1.15.6.1) opens over the worklist rather than
         navigating away — the same form the /lab/result/:id route renders,
         in an extraLarge popup, so the bench keeps its filters, its scroll
         position and its place in the queue. */
      setResultTarget(row.id);
      return;
    }
    setPendingAction({ kind, row });
  };

  const ACTION_COPY = {
    collect: {
      title: 'บันทึกว่าเก็บตัวอย่างแล้ว?',
      confirmLabel: 'เก็บแล้ว',
      type: 'info',
      describe: (row) => `ตัวอย่าง ${row.tubeLabel} ของ${row.confidential ? 'ผู้ป่วยปกปิด' : row.patient.fullName ?? row.patient.shortName} (${row.accessionNo}) จะถูกบันทึกว่าเก็บเรียบร้อยและส่งเข้าขั้นตอนกำลังตรวจ`,
    },

    /* Cancelling an advance order is destructive in the same way a delete is
       — the order vanishes before the patient ever arrives, and nothing in
       the worklist will show it was ever placed — so it goes through the
       same confirmation as every other row action. */
    cancelAdvance: {
      title: 'ยกเลิกคำสั่งตรวจล่วงหน้านี้?',
      confirmLabel: 'ยกเลิกคำสั่ง',
      type: 'warning',
      describe: (adv) => `คำสั่งล่วงหน้า ${adv.testIds.map((t) => LAB_TEST_BY_ID[t]?.nameEn ?? t).join(' · ')} ของ${adv.patient.fullName ?? adv.patient.shortName} (นัด ${adv.scheduledFor} · ${adv.location}) จะถูกยกเลิก และจะไม่ถูกดึงมาใช้เมื่อผู้ป่วยมาถึง`,
    },

    /* TOR §1.15.4.9 "สามารถลบข้อมูลได้". */
    delete: {
      title: 'ลบรายการขอตรวจนี้?',
      confirmLabel: 'ลบรายการ',
      type: 'warning',
      describe: (row) => `รายการ ${row.testLabel} (${row.accessionNo}) ของ${row.confidential ? 'ผู้ป่วยปกปิด' : row.patient.fullName ?? row.patient.shortName} จะถูกลบออกจากรายการขอตรวจ และต้องแจ้ง${row.location}ให้ทราบ`,
    },
  };

  const handleConfirmAction = () => {
    if (!pendingAction) return;
    const { kind, row } = pendingAction;

    if (kind === 'collect') {
      updateLabOrder(row.id, { status: 'analysing', exception: undefined, labeled: true });
      logAudit('บันทึกเก็บ/รับตัวอย่าง', rowLabel(row));
    } else if (kind === 'delete') {
      /* §1.15.4.9 — removes the request. Also drops it from the shared
         order store so it stays gone when other lab screens re-read. */
      deleteLabOrder(row.id);
      setSelectedId((prev) => (prev === row.id ? null : prev));
      logAudit('ลบรายการขอตรวจ', rowLabel(row));
    } else if (kind === 'cancelAdvance') {
      cancelAdvanceOrder(row.id);
      logAudit('ยกเลิกคำสั่งตรวจล่วงหน้า', `${row.patient.shortName} (${row.id})`);
    }
    setPendingAction(null);
  };

  const handleConfirmReject = () => {
    if (!rejectTarget || !rejectReason) return;
    const reason = LAB_REJECT_REASON_BY_KEY[rejectReason];
    /* A rejected specimen goes back to `collect` carrying the exception
       rather than into a dead-end status — the team's flow re-draws it.
       Whether it is flagged 'rejected' or 'redraw' follows from the reason:
       an unusable specimen needs a new draw, a cancelled order does not. */
    updateLabOrder(rejectTarget.id, {
      status: 'collect',
      exception: reason.redrawRequired ? 'redraw' : 'rejected',
      rejectReason: reason.label,
      /* An unlabelled or mislabelled tube must be re-drawn AND re-labelled;
         it can never be salvaged by sticking a new label on the old tube. */
      labeled: reason.patientSafety ? false : rejectTarget.labeled,
    });
    logAudit(reason.redrawRequired ? 'ปฏิเสธสิ่งส่งตรวจและสั่งเจาะซ้ำ' : 'ปฏิเสธสิ่งส่งตรวจ',
      `${rowLabel(rejectTarget)} — ${reason.label}`);
    setRejectTarget(null);
    setRejectReason('');
  };

  const handleRevealConfidential = (order) => {
    logAudit('ดูผลตรวจที่เป็นความลับ', `${order.testLabel} — HN ${order.patient.hn}`, { scope: 'confidential' });
  };

  /* Duplicate-order lookup for the table's เตือนสั่งซ้ำ glyph — the same
     helper the order-entry form calls, reading the patient's prior lab
     history by HN. */
  const historyFor = useMemo(() => (row) => duplicateWarning(row.testId, labHistoryFor(row.patient.hn)), []);


  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY);

  const filtered = useMemo(() => allRows
    .filter((r) => activeTab === 'all' || r.status === activeTab)
    .filter((r) => group === 'all' || r.group === group)
    .filter((r) => urgency === 'all' || r.urgency === urgency)
    .filter((r) => location === 'all' || r.location === location)
    .filter((r) => tube === 'all' || r.test?.tubeKey === tube)
    .filter((r) => matchesQuery(r, query)),
  [allRows, activeTab, group, urgency, location, tube, query]);

  /* Queue numbers are assigned over the CURRENT view, so "คิว" always reads
     1..n down the visible list rather than showing gaps after a filter. */
  const sorted = useMemo(
    () => sortRows(filtered, sortConfig, statFirst).map((r, i) => ({ ...r, queueNo: i + 1 })),
    [filtered, sortConfig, statFirst],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const columns = useMemo(
    () => buildColumns(handleAction, historyFor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [historyFor],
  );

  /* What the file says it contains. Built from the same filter state the
     table reads, so an exported sheet can never claim a scope the screen
     was not showing. */
  const exportFilterSummary = [
    activeTab !== 'all' && LAB_STATUS_BY_KEY[activeTab]?.label,
    urgency !== 'all' && LAB_URGENCY_BY_KEY[urgency]?.label,
    group !== 'all' && LAB_GROUPS.find((g) => g.key === group)?.thai,
    location !== 'all' && location,
    tube !== 'all' && LAB_TUBES[tube]?.thai,
    query.trim() && `ค้นหา "${query.trim()}"`,
  ].filter(Boolean).join(' · ');

  const buildExportReport = () => ({
    key: 'lab-worklist',
    title: 'คิวห้องปฏิบัติการ (Lab worklist)',
    subtitle: exportFilterSummary || 'รายการขอตรวจทั้งหมดของวันนี้',
    table: {
      columns: LAB_WORKLIST_EXPORT_COLUMNS,
      rows: sorted.map((r) => ({
        queueNo: r.queueNo,
        accessionNo: r.accessionNo,
        urgencyLabel: LAB_URGENCY_BY_KEY[r.urgency]?.label ?? r.urgency,
        hn: r.confidential ? 'HN •••••' : r.patient.hn,
        name: r.confidential ? 'ปกปิด (VCT)' : (r.patient.fullName ?? r.patient.shortName),
        ageSex: r.confidential ? '—' : `${parseInt(r.patient.age, 10) || '—'} ปี / ${r.patient.sex}`,
        orderedAt: r.orderedAt,
        location: r.location,
        doctor: r.doctor,
        testLabel: `${r.testLabel} · ${r.groupLabel}`,
        tubeLabel: r.tubeLabel,
        volume: `${r.tubeCount} หลอด · ${r.volumeMl} mL`,
        statusLabel: r.exception === 'rejected' ? 'ปฏิเสธตัวอย่าง'
          : r.exception === 'redraw' ? 'รอเจาะซ้ำ'
            : r.statusLabel,
        resultFlag: r.critical ? 'ค่าวิกฤต' : r.abnormal ? 'ผิดปกติ' : '',
        price: r.price,
      })),
    },
  });

  const rangeStart = sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, sorted.length);

  useEffect(() => { setPage(1); }, [activeTab, group, urgency, location, tube, query]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const panelOpen = selectedId != null;
  /* Keep rendering the last-selected order while the panel collapses shut,
     instead of clearing it the instant `selectedId` goes null — otherwise
     the content blanks out mid-animation while the box is still shrinking.
     Reading/writing a ref during render is safe here (React's documented
     "remember info from previous render" pattern): idempotent per commit,
     and it never itself triggers a re-render. */
  const lastSelectedIdRef = useRef(null);
  if (selectedId != null) lastSelectedIdRef.current = selectedId;
  const selected = useMemo(
    () => liveRows.find((r) => r.id === (selectedId ?? lastSelectedIdRef.current)) ?? null,
    [liveRows, selectedId],
  );

  /* TOR §1.15.4.9 "ข้อมูลยอดรวมทั้งหมด" — total for the ONE order the doctor
     placed (all rows sharing `orderId`). */
  const orderSiblings = useMemo(
    () => (selected ? liveRows.filter((r) => r.orderId === selected.orderId) : []),
    [liveRows, selected],
  );
  const orderTotal = useMemo(
    () => orderSiblings.reduce((sum, r) => sum + (r.price ?? 0), 0),
    [orderSiblings],
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

  const searchAvatars = useMemo(() => {
    const result = [];
    for (const entry of searchHistory) {
      if (result.length >= 3) break;
      const direct = entry && typeof entry === 'object' ? entry.avatarSrc : null;
      if (direct) { result.push(direct); continue; }
      const q = typeof entry === 'string' ? entry : (entry?.value ?? entry?.label ?? '');
      const row = q ? resolveSearchRow(q, null) : null;
      if (row?.patient.avatarUrl && !row.confidential) result.push(row.patient.avatarUrl);
    }
    return result;
  }, [searchHistory]);

  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }
  ));

  const actionCopy = pendingAction ? ACTION_COPY[pendingAction.kind] : null;

  return (
    <>
      <AlertDialog
        open={!!pendingAction}
        type={actionCopy?.type ?? 'warning'}
        title={actionCopy?.title ?? ''}
        description={pendingAction && actionCopy ? actionCopy.describe(pendingAction.row) : ''}
        cancelLabel='ยกเลิก'
        confirmLabel={actionCopy?.confirmLabel ?? 'ยืนยัน'}
        onClose={closeAction}
        onCancel={closeAction}
        onConfirm={handleConfirmAction}
      />
      {/* Rejection dialog — a reason is mandatory, because the reason is
          what a lab's quality indicators are built from (a ward whose
          specimens keep clotting needs retraining, not a note), and because
          it decides whether a re-draw follows. */}
      {rejectTarget && (
        <div
          role='dialog'
          aria-modal='true'
          aria-label='ปฏิเสธสิ่งส่งตรวจ'
          className='fixed inset-0 flex items-center justify-center'
          /* 1400 = Popup.jsx's BASE_MODAL_Z. This dialog is hand-rolled
             rather than a <Popup>, and at z-60 it rendered *under* the
             sticky sub-nav and status-tab bar (zIndex 1090–1101), which cut
             a band across the reason list. */
          style={{ background: 'rgba(0,0,0,0.45)', zIndex: 1400 }}
          onClick={() => setRejectTarget(null)}
        >
          <div
            className='flex flex-col'
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(920px, 94vw)',
              maxHeight: '86vh',
              overflowY: 'auto',
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              boxShadow: 'var(--shadow-card-strong)',
              paddingTop: 'var(--dim-space-600)',
              paddingRight: 'var(--dim-space-600)',
              paddingBottom: 'var(--dim-space-600)',
              paddingLeft: 'var(--dim-space-600)',
              gap: 'var(--dim-space-400)',
            }}
          >
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
              <span style={{ fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))', fontSize: 'var(--type-size-lg)', color: 'var(--text-content-default)' }}>
                ปฏิเสธสิ่งส่งตรวจ
              </span>
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
                {rejectTarget.accessionNo} · {rejectTarget.testLabel} ·{' '}
                {rejectTarget.confidential ? 'ผู้ป่วยปกปิด' : rejectTarget.patient.shortName}
              </span>
            </div>

            {/* Two columns — eleven reasons stacked single-file ran past the
                fold, so the last few (including the two no-redraw cases)
                were only reachable by scrolling. Collapses to one column on
                a narrow viewport. */}
            <div
              className='grid'
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 'var(--dim-space-300)',
              }}
            >
              {LAB_REJECT_REASONS.map((r) => {
                const on = rejectReason === r.key;
                return (
                  /* DS SelectableCardButton (Figma PHCIS-OPD 160:26432) — the
                     same card the pain / triage chip rows use, so hover, the
                     selected stroke and the trailing check all come from the
                     design system instead of being re-styled here. */
                  <SelectableCardButton
                    key={r.key}
                    selected={on}
                    onClick={() => setRejectReason(r.key)}
                    ariaLabel={r.label}
                    className='w-full'
                  >
                    <span className='flex-1 min-w-0 text-left'>{r.label}</span>
                    {/* An unlabelled or mislabelled tube is the one case that
                        can never be fixed by relabelling — say so here, not
                        after the fact. */}
                    {r.patientSafety && (
                      <span className='shrink-0' style={{ fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-statusbadge-error, #B91C1C)' }}>
                        ต้องทิ้งหลอดและเจาะใหม่
                      </span>
                    )}
                    {!r.redrawRequired && (
                      <span className='shrink-0' style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                        ไม่ต้องเจาะซ้ำ
                      </span>
                    )}
                  </SelectableCardButton>
                );
              })}
            </div>

            <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
              <span style={{ flex: 1, fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                {rejectReason
                  ? (LAB_REJECT_REASON_BY_KEY[rejectReason].redrawRequired
                    ? 'ระบบจะส่งกลับไปยังขั้นตอนรอเก็บตัวอย่างเพื่อเจาะซ้ำ'
                    : 'ระบบจะบันทึกการปฏิเสธโดยไม่สั่งเจาะซ้ำ')
                  : ''}
              </span>
              <NeutralSubdueButton variant='outline' size='md' onClick={() => setRejectTarget(null)}>
                ยกเลิก
              </NeutralSubdueButton>
              <BrandPrimaryButton size='md' disabled={!rejectReason} onClick={handleConfirmReject}>
                ยืนยันปฏิเสธ
              </BrandPrimaryButton>
            </div>
          </div>
        </div>
      )}

      <QueuePageShell
        activeKey='lab'
        breadcrumb={breadcrumb}
        title='ห้องปฏิบัติการ'
        summaryFlushUnderSubHeader={false}
        belowSummary={<LabSubNav />}
        /* ปุ่มประจำโมดูล — ดูคำอธิบายใน LabHeaderActions.jsx
           ส่งมุมมองปัจจุบันไปเป็นขอบเขตการพิมพ์ ตัวกรองบนหน้าจึงมีผลจริง */
        leadingActions={(
          <LabPrintLabelsButton
            rows={sorted}
            onPrint={(printed) => logAudit('พิมพ์สติกเกอร์ติดหลอด (ทั้งชุด)', `${printed.length} รายการจากมุมมองปัจจุบัน`)}
          />
        )}
        actions={<LabOrderCtaButton />}
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
                boxShadow: 'var(--shadow-card-strong)',
                padding: 'var(--dim-space-600)',
                gap: 'var(--dim-space-600)',
              }}
            >
              <StickyStatusTabBar
                tabs={tabs}
                value={activeTab}
                onChange={setActiveTab}
              />

              {/* Summary counts moved below the tab strip (มติผู้ใช้ 28 ส.ค. 69):
                  they describe the list the current tab is showing, so they now
                  sit with it and scroll away with it instead of riding in the
                  page header. Rendered as bare SummaryCard rows — the
                  SummaryCardsBar chrome would be a second card inside this one. */}
              <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                {summaryCards.map((c) => <SummaryCard key={c.key} card={c} />)}
              </div>

              {/* Search + scan. The mockup puts "สแกนบาร์โค้ด" as the widget's
                  one primary action, to the right of the search field. */}
              <div className='w-full flex items-center justify-center' style={{ gap: 'var(--dim-space-300)' }} ref={searchWrapRef}>
                <PrimarySearch
                  value={query}
                  onChange={(v) => { setQuery(v); if (scanMode && v === '') setScanMode(false); }}
                  onSubmit={(v, item) => {
                    const row = resolveSearchRow(v, item);
                    pushHistory(row ? rowToSearchItem(row) : v);
                    setQuery(v);
                    if (row) setSelectedId(row.id);
                    setScanMode(false);
                  }}
                  placeholder={scanMode ? 'พร้อมสแกน — ยิงบาร์โค้ดที่หลอดตัวอย่าง' : 'ค้นหา HN / ชื่อ / Accession'}
                  width={560}
                  history={searchHistory}
                  onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                  suggestions={searchSuggestions}
                  avatars={searchAvatars}
                />
                <BrandPrimaryButton
                  size='md'
                  leadingIcon='barcode_scanner'
                  onClick={handleScan}
                  aria-label='สแกนบาร์โค้ดหลอดตัวอย่าง'
                >
                  สแกนบาร์โค้ด
                </BrandPrimaryButton>
                <NeutralSubdueButton
                  variant='outline'
                  size='md'
                  leadingIcon='ios_share'
                  collapseLabelBelow='lg'
                  accessibilityLabel='นำส่งออกรายงาน'
                  onClick={() => setExportReport(buildExportReport())}
                >
                  นำส่งออกรายงาน
                </NeutralSubdueButton>
              </div>

              <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
                <FilterDropdown prefix='ความเร่งด่วน:' options={URGENCY_OPTIONS} value={urgency} onChange={setUrgency} />
                <FilterDropdown prefix='กลุ่มตรวจ:' options={GROUP_OPTIONS} value={group} onChange={setGroup} />
                <FilterDropdown prefix='จุดสั่ง:' options={LOCATION_OPTIONS} value={location} onChange={setLocation} />
                <FilterDropdown prefix='ชนิดหลอด:' options={TUBE_OPTIONS} value={tube} onChange={setTube} />
                <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
              </OverflowFlexRow>

              <SmoothFilterResults opaque={resultsOpaque}>
              <SearchResultCount found={sorted.length} total={liveRows.length} />

              <Table
                columns={columns}
                rows={pageRows}
                rowKey={(row) => row.id}
                sortConfig={sortConfig}
                onSort={handleSort}
                onRowClick={(row) => setSelectedId(row.id)}
                stickyColCount={2}
                emptyMessage='ไม่พบรายการตรวจที่ตรงกับการค้นหา'
              />

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
              </SmoothFilterResults>
            </div>

            {/* Always mounted (rather than conditionally rendered) so opening
                and closing animates via width + opacity instead of popping
                in and out. `pointerEvents: 'none'` while closed stops the
                invisible collapsed box swallowing clicks. */}
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
                <LabDetailPanel
                  key={selected?.id}
                  order={selected}
                  onClose={() => setSelectedId(null)}
                  onReveal={handleRevealConfidential}
                  orderItemCount={orderSiblings.length}
                  orderTotal={orderTotal}
                />
              </div>
            </div>
          </div>

          {/* Audit trail — now the WHOLE module's trail, not just this
              page's: receiving, send-out, QC, LIS credential changes,
              message import/bounce, critical acknowledgement and
              confidential reveals all append to the same store
              (src/data/labAudit.js). Still not wired to src/pages/audit's
              `LOG`, which is presentational mock data with no append API. */}
          <div
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              boxShadow: 'var(--shadow-card)',
              padding: 'var(--dim-space-400) var(--dim-space-600)',
              gap: 'var(--dim-space-300)',
            }}
          >
            <NeutralSubdueButton
              variant='outline'
              size='sm'
              trailingIcon={auditLogOpen ? 'expand_less' : 'expand_more'}
              onClick={() => setAuditLogOpen((v) => !v)}
              className='self-start'
            >
              ประวัติการดำเนินการทั้งห้องปฏิบัติการ{auditLog.length > 0 ? ` (${auditLog.length})` : ''}
            </NeutralSubdueButton>
            {auditLogOpen && (
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                {auditLog.length === 0 ? (
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
                    ยังไม่มีการดำเนินการที่บันทึกในเซสชันนี้
                  </span>
                ) : (
                  auditLog.map((entry) => (
                    <div
                      key={entry.id}
                      className='flex items-start'
                      style={{ gap: 'var(--dim-space-300)', paddingBottom: 'var(--dim-space-200)', borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)' }}
                    >
                      <span style={{ flexShrink: 0, width: 110, fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                        {entry.at}
                        <br />
                        {entry.date}
                      </span>
                      <div className='flex flex-col min-w-0'>
                        <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                          <span style={{ fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
                            {entry.actor} — {entry.action}
                          </span>
                          <Badge style='neutral' size='small'>
                            {LAB_AUDIT_SCOPES.find((s) => s.key === entry.scope)?.label ?? entry.scope}
                          </Badge>
                        </span>
                        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
                          {entry.detail}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </QueuePageShell>

      <LabResultEntryPopup
        open={!!resultTarget}
        orderId={resultTarget}
        onClose={() => setResultTarget(null)}
      />
      <LabReportPopup
        open={!!reportTarget}
        orderId={reportTarget}
        onClose={() => setReportTarget(null)}
      />
      <ExportFormatPopup
        open={!!exportReport}
        report={exportReport}
        onClose={() => setExportReport(null)}
        onExported={() => {
          setExportDone(true);
          logAudit('นำส่งออกรายงานคิวห้องปฏิบัติการ', `${sorted.length} รายการ${exportFilterSummary ? ` · ${exportFilterSummary}` : ''}`);
        }}
      />
      <SuccessToast
        open={exportDone}
        message='นำส่งออกรายงานคิวห้องปฏิบัติการแล้ว — ระบบบันทึก log การส่งออกข้อมูล'
        onClose={() => setExportDone(false)}
      />

      {/* Print-only sticker sheet (TOR §1.15.5.1). Always mounted but
          hidden; `printLab('sticker')` sets the root attribute that
          @media print reveals. Kept OUTSIDE QueuePageShell so the print
          stylesheet's "hide everything except the print root" rule has
          nothing of the app chrome to fight. */}
      <div className='mih-lab-print-root'>
        <LabSpecimenLabel rows={printRows} />
      </div>
    </>
  );
};

export default LabQueuePage;
