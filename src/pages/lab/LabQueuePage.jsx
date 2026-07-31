import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Table, { EllipsisText } from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import AlertDialog from '@/components/popup/AlertDialog';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import Pagination from '@/components/pagination/Pagination';
import { Icon } from '@/components/icons/Icon';
import {
  LAB_ORDERS, LAB_STATUSES, LAB_URGENCIES, LAB_LOCATIONS,
  withTestLabel, labHistoryFor,
  subscribeOrders, updateLabOrder, deleteLabOrder,
} from '@/data/labOrders';
import { LAB_GROUPS, LAB_TUBES, duplicateWarning } from '@/data/labCatalog';
import LabDetailPanel from '@/pages/lab/LabDetailPanel';
import LabTubeDot from '@/pages/lab/LabTubeDot';

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

const breadcrumb = ['งานชันสูตรโรค (Lab)'];

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
const buildTabs = (rows) => [
  { key: 'all', label: 'ทั้งหมด', icon: 'biotech', count: rows.length },
  ...LAB_STATUSES.map((s) => ({
    key: s.key,
    label: s.label,
    icon: s.icon,
    count: rows.filter((r) => r.status === s.key).length,
  })),
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

const STATUS_OPTIONS = [
  { value: 'all', label: 'ทุกสถานะ' },
  ...LAB_STATUSES.map((s) => ({ value: s.key, label: s.label })),
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
    key: 'queueNo', label: 'คิว', width: 64, align: 'center',
    render: (row) => (
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)' }}>
        {row.queueNo}
      </span>
    ),
  },
  /* Accession / บาร์โค้ด — "สแกนพิมพ์สติกเกอร์ติดหลอด". Leads the row in the
     mockup, and doubles as the sticker-printed state: a row whose label
     hasn't been printed yet shows "รอพิมพ์ label" underneath. */
  {
    key: 'accessionNo', label: 'Accession / บาร์โค้ด', width: 172,
    render: (row) => (
      <div className='flex flex-col min-w-0' style={{ gap: 2 }}>
        <span
          className='inline-flex items-center'
          style={{ gap: 'var(--dim-space-150)', fontFamily: 'var(--type-family-mono, monospace)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}
        >
          <Icon name='barcode' size={14} />
          {row.accessionNo}
        </span>
        {!row.labeled && (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-statusbadge-warning, #C2410C)' }}>
            รอพิมพ์ label
          </span>
        )}
      </div>
    ),
  },
  /* ความเร่งด่วน — STAT / ด่วน / Routine, "STAT ต้องเด้งขึ้นบนสุด (สีแดง)". */
  {
    key: 'urgency', label: 'ความเร่งด่วน', width: 124,
    render: (row) => {
      if (row.urgency === 'stat') return <Badge style='error' size='small'>STAT</Badge>;
      if (row.urgency === 'urgent') return <Badge style='warning' size='small'>ด่วน</Badge>;
      return <Badge style='neutral' size='small'>Routine</Badge>;
    },
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
            <EllipsisText text={row.confidential ? 'ปกปิด (VCT)' : row.patient.shortName} />
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
    key: 'ageSex', label: 'อายุ / เพศ', width: 104,
    render: (row) => (
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
        {row.confidential ? '—' : `${parseInt(row.patient.age, 10) || '—'} ปี / ${row.patient.sex}`}
      </span>
    ),
  },
  /* เวลาสั่ง + aging — "ดู aging / SLA รอคิวนานเกินไหม". */
  {
    key: 'orderedAt', label: 'เวลาสั่ง', width: 120,
    render: (row) => {
      const age = ageMinutes(row);
      const overdue = isOverdue(row);
      return (
        <div className='flex flex-col' style={{ gap: 2 }}>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
            {row.orderedAt}
          </span>
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              color: overdue ? 'var(--text-statusbadge-error, #B91C1C)' : 'var(--text-content-tertiary)',
              fontWeight: overdue ? 'var(--type-weight-medium)' : 'var(--type-weight-regular)',
            }}
          >
            {overdue ? `เกิน SLA · ${formatAge(age)}` : formatAge(age)}
          </span>
        </div>
      );
    },
  },
  /* จุดสั่ง / ward — the team clarified this is the ordering clinic. */
  {
    key: 'location', label: 'จุดสั่ง / ward', width: 168,
    render: (row) => (
      <span className='block min-w-0' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
        <EllipsisText text={row.location} />
      </span>
    ),
  },
  /* แพทย์ผู้สั่ง — "ติดต่อกลับเมื่อสงสัย". */
  {
    key: 'doctor', label: 'แพทย์ผู้สั่ง', width: 168,
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
          {/* Duplicate-order warning — TOR §1.15.4.7/§1.15 "เตือนสั่งซ้ำ".
              Same helper the order-entry form uses, so a repeat flagged at
              ordering time stays flagged here on the bench. */}
          {historyFor(row) && (
            <span className='shrink-0' title={historyFor(row).message} style={{ color: 'var(--text-statusbadge-warning, #C2410C)' }}>
              <Icon name='content_copy' size={14} />
            </span>
          )}
          {/* พยาบาลเจาะน้ำตาลปลายนิ้ว บันทึกผลเองได้เลย — a bedside test never
              reaches the bench, so it is marked to explain why it has no
              analyser step. */}
          {row.bedside && (
            <span className='shrink-0' title={`ตรวจข้างเตียงโดย ${row.performedBy ?? 'พยาบาล'}`} style={{ color: 'var(--text-colorfulbadge-purple, #7E22CE)' }}>
              <Icon name='vaccines' size={14} />
            </span>
          )}
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
    key: 'tube', label: 'ตัวอย่าง + หลอด', width: 156,
    render: (row) => <LabTubeDot tube={row.tube} count={row.tubeCount} />,
  },
  /* จำนวนหลอด + ปริมาตร — "เตรียมหลอดให้ครบ ไม่ต้องเจาะซ้ำ". */
  {
    key: 'volumeMl', label: 'จำนวน / ปริมาตร', width: 128,
    render: (row) => (
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
        {row.tubeCount} หลอด · {row.volumeMl} mL
      </span>
    ),
  },
  /* สถานะ — "ติดตามงาน". An exception (rejected/redraw) overrides the pill,
     because "ปฏิเสธแล้วรอเจาะใหม่" is the fact the bench needs to see first. */
  {
    key: 'status', label: 'สถานะ', width: 148,
    render: (row) => {
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
    key: 'resultFlag', label: 'ผล', width: 132,
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
    key: 'price', label: 'ราคา', width: 88,
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
    key: 'actions', label: 'การจัดการ', width: 252, sortable: false, align: 'center',
    render: (row) => {
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
          <NeutralSubdueIconButton
            icon='block'
            variant='outline'
            size='sm'
            disabled={!canReject}
            aria-label={`ปฏิเสธสิ่งส่งตรวจ ${row.accessionNo}`}
            title='ปฏิเสธสิ่งส่งตรวจ'
            onClick={(e) => { e.stopPropagation(); onAction('reject', row); }}
          />
          <NeutralSubdueIconButton
            icon='replay'
            variant='outline'
            size='sm'
            aria-label={`สั่งเจาะซ้ำ ${row.accessionNo}`}
            title='เจาะซ้ำ'
            onClick={(e) => { e.stopPropagation(); onAction('redraw', row); }}
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
  /* "STAT ก่อน" — on by default, matching the mockup where the toggle is
     already active and the STAT row sits at the top of the list. */
  const [statFirst, setStatFirst] = useState(true);
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

  /* Barcode scan — the deck's primary action. There's no scanner hardware
     behind this frontend, so the button focuses the search box and puts it
     in scan mode; a real HID barcode wedge types into the focused field and
     submits, which is exactly what PrimarySearch already handles. */
  const [scanMode, setScanMode] = useState(false);
  const searchWrapRef = useRef(null);
  const handleScan = () => {
    setScanMode(true);
    setQuery('');
    const input = searchWrapRef.current?.querySelector('input');
    if (input) input.focus();
  };

  const summaryCards = useMemo(() => buildSummaryCards(liveRows), [liveRows]);
  const tabs = useMemo(() => buildTabs(liveRows), [liveRows]);

  /* Row-action confirmation — one dialog reused for every destructive-ish
     action, holding the pending row + action so the copy stays correct
     until the user confirms or cancels (same `deleteCandidate` pattern as
     QueuePage.jsx). Printing a label needs no confirmation. */
  const [pendingAction, setPendingAction] = useState(null);
  const closeAction = () => setPendingAction(null);

  /* Audit trail — no auth context exists anywhere in this frontend-only app
     yet (Sidebar's user footer is placeholder text, not a real auth
     object), so CURRENT_ACTOR stands in for whoever a real auth layer would
     resolve. Local to this page: src/pages/audit/auditData.js's `LOG` is
     presentational mock data with no shared append API. Specimen state
     changes, confidential reveals and label prints are exactly what a real
     lab audit log has to capture. */
  const CURRENT_ACTOR = 'เจ้าหน้าที่ห้องปฏิบัติการ';
  const [auditLog, setAuditLog] = useState([]);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const auditSeq = useRef(0);
  const logAudit = (action, detail) => {
    auditSeq.current += 1;
    const entry = {
      id: `AUD-${auditSeq.current}`,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      actor: CURRENT_ACTOR,
      action,
      detail,
    };
    setAuditLog((prev) => [entry, ...prev].slice(0, 20));
  };

  const rowLabel = (row) => `${row.testLabel} · ${row.accessionNo} — ${row.confidential ? 'ผู้ป่วยปกปิด' : row.patient.shortName}`;

  const handleAction = (kind, row) => {
    if (kind === 'label') {
      /* Sticker printing (TOR §1.15.5) needs no confirmation — it's additive
         and re-printable. Marks the row labelled so "รอพิมพ์ label" clears. */
      updateLabOrder(row.id, { labeled: true });
      logAudit('พิมพ์สติกเกอร์ติดหลอด', rowLabel(row));
      return;
    }
    if (kind === 'result') {
      /* Result entry is a full screen of its own (TOR §1.15.6.1) — it needs
         room for one typed input per analyte plus the critical-value
         notification block, which will not fit in a row action. */
      history.push(`/lab/result/${row.id}`);
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
    reject: {
      title: 'ปฏิเสธสิ่งส่งตรวจนี้?',
      confirmLabel: 'ปฏิเสธตัวอย่าง',
      type: 'warning',
      describe: (row) => `ตัวอย่าง ${row.accessionNo} (${row.testLabel}) จะถูกปฏิเสธและส่งกลับไปรอเก็บตัวอย่างใหม่ ต้องแจ้ง${row.location}ให้ทราบ`,
    },
    redraw: {
      title: 'สั่งเจาะซ้ำ?',
      confirmLabel: 'สั่งเจาะซ้ำ',
      type: 'warning',
      describe: (row) => `ระบบจะออก Accession ใหม่สำหรับ ${row.testLabel} และส่งกลับไปยังขั้นตอนรอเก็บตัวอย่าง`,
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
    } else if (kind === 'reject') {
      /* A rejected specimen goes back to `collect` carrying the exception,
         rather than into a dead-end status — the team's flow re-draws it. */
      updateLabOrder(row.id, { status: 'collect', exception: 'rejected', rejectReason: 'ปฏิเสธโดยเจ้าหน้าที่ห้องปฏิบัติการ' });
      logAudit('ปฏิเสธสิ่งส่งตรวจ', rowLabel(row));
    } else if (kind === 'redraw') {
      updateLabOrder(row.id, { status: 'collect', exception: 'redraw', labeled: false, rejectReason: 'สั่งเจาะซ้ำโดยเจ้าหน้าที่ห้องปฏิบัติการ' });
      logAudit('สั่งเจาะซ้ำ', rowLabel(row));
    } else if (kind === 'delete') {
      /* §1.15.4.9 — removes the request. Also drops it from the shared
         order store so it stays gone when other lab screens re-read. */
      deleteLabOrder(row.id);
      setSelectedId((prev) => (prev === row.id ? null : prev));
      logAudit('ลบรายการขอตรวจ', rowLabel(row));
    }
    setPendingAction(null);
  };

  const handleRevealConfidential = (order) => {
    logAudit('ดูผลตรวจที่เป็นความลับ', `${order.testLabel} — HN ${order.patient.hn}`);
  };

  /* Duplicate-order lookup for the table's เตือนสั่งซ้ำ glyph — the same
     helper the order-entry form calls, reading the patient's prior lab
     history by HN. */
  const historyFor = useMemo(() => (row) => duplicateWarning(row.testId, labHistoryFor(row.patient.hn)), []);

  const columns = useMemo(() => buildColumns(handleAction, historyFor), [historyFor]);

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY);

  const filtered = useMemo(() => liveRows
    .filter((r) => activeTab === 'all' || r.status === activeTab)
    .filter((r) => group === 'all' || r.group === group)
    .filter((r) => urgency === 'all' || r.urgency === urgency)
    .filter((r) => location === 'all' || r.location === location)
    .filter((r) => tube === 'all' || r.test?.tubeKey === tube)
    .filter((r) => matchesQuery(r, query)),
  [liveRows, activeTab, group, urgency, location, tube, query]);

  /* Queue numbers are assigned over the CURRENT view, so "คิว" always reads
     1..n down the visible list rather than showing gaps after a filter. */
  const sorted = useMemo(
    () => sortRows(filtered, sortConfig, statFirst).map((r, i) => ({ ...r, queueNo: i + 1 })),
    [filtered, sortConfig, statFirst],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
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
      <QueuePageShell
        activeKey='lab'
        breadcrumb={breadcrumb}
        title='งานชันสูตรโรค (Lab) — Worklist'
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
                padding: 'var(--dim-space-600)',
                gap: 'var(--dim-space-400)',
              }}
            >
              {/* Search + scan. The mockup puts "สแกนบาร์โค้ด" as the widget's
                  one primary action, to the right of the search field. */}
              <div className='w-full flex items-start justify-center' style={{ gap: 'var(--dim-space-300)' }} ref={searchWrapRef}>
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
                {/* The other two lab screens. Ordering is upstream of this
                    worklist and Setup is what defines every row in it, so
                    both are reachable from here rather than only from the
                    hub. */}
                <NeutralSubdueButton
                  variant='outline'
                  size='md'
                  leadingIcon='add'
                  onClick={() => history.push('/lab/order')}
                >
                  สั่งตรวจ
                </NeutralSubdueButton>
                <NeutralSubdueIconButton
                  icon='settings'
                  variant='outline'
                  size='md'
                  aria-label='ตั้งค่ารายการตรวจ'
                  title='ตั้งค่ารายการตรวจ'
                  onClick={() => history.push('/lab/setup')}
                />
              </div>

              <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
                {/* "STAT ก่อน" — the mockup renders it as a pressed pill
                    beside the filters, so it reads as a mode not a filter:
                    it re-orders the list, it doesn't remove rows. */}
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
                <FilterDropdown prefix='ความเร่งด่วน:' options={URGENCY_OPTIONS} value={urgency} onChange={setUrgency} />
                <FilterDropdown prefix='กลุ่มตรวจ:' options={GROUP_OPTIONS} value={group} onChange={setGroup} />
                <FilterDropdown prefix='จุดสั่ง:' options={LOCATION_OPTIONS} value={location} onChange={setLocation} />
                <FilterDropdown prefix='ชนิดหลอด:' options={TUBE_OPTIONS} value={tube} onChange={setTube} />
                {/* Second way to set the same `activeTab` the sticky tab
                    strip controls, not a separate filter dimension. */}
                <FilterDropdown prefix='สถานะ:' options={STATUS_OPTIONS} value={activeTab} onChange={setActiveTab} />
              </OverflowFlexRow>

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

              {/* Legend — the strip along the bottom of the mockup widget:
                  ค่าวิกฤต (แจ้งแพทย์) · ผลปิด/ปกติ · เตือนสั่งซ้ำ · EDTA · Clot ·
                  Fluoride/Hep. Tube swatches read straight off LAB_TUBES so
                  they can never drift from the colours in the table. */}
              <div
                className='flex flex-wrap items-center w-full'
                style={{
                  gap: 'var(--dim-space-400)',
                  paddingTop: 'var(--dim-space-300)',
                  borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                }}
              >
                <LegendItem icon='warning' color='var(--text-statusbadge-error, #B91C1C)' label='ค่าวิกฤต (แจ้งแพทย์)' />
                <LegendItem icon='lock' color='var(--text-content-quaternary)' label='ผลปิด / ปกปิด' />
                <LegendItem icon='content_copy' color='var(--text-statusbadge-warning, #C2410C)' label='เตือนสั่งซ้ำ' />
                <LegendItem icon='vaccines' color='var(--text-colorfulbadge-purple, #7E22CE)' label='ตรวจข้างเตียง (พยาบาลบันทึกเอง)' />
                <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
                  {Object.values(LAB_TUBES).map((t) => (
                    <LabTubeDot key={t.key} tube={t} size={8} />
                  ))}
                </span>
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

          {/* Audit trail — specimen state changes, label prints and
              confidential reveals: the actions a real lab audit log cares
              about most. See CURRENT_ACTOR/logAudit above for why this is
              local-only rather than wired to src/pages/audit's shared log. */}
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
              ประวัติการดำเนินการ{auditLog.length > 0 ? ` (${auditLog.length})` : ''}
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
                      <span style={{ flexShrink: 0, width: 72, fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                        {entry.time}
                      </span>
                      <div className='flex flex-col min-w-0'>
                        <span style={{ fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
                          {entry.actor} — {entry.action}
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
    </>
  );
};

/* One legend entry — glyph + caption, sized to sit quietly under the table. */
const LegendItem = ({ icon, color, label }) => (
  <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', color: 'var(--text-content-tertiary)' }}>
    <span style={{ color }}><Icon name={icon} size={14} /></span>
    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>{label}</span>
  </span>
);

export default LabQueuePage;
