import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import AppointmentMenuButton from '@/components/layout/AppointmentMenuButton';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import { FilterDropdown } from '@/components/forms/FilterTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandIconButton from '@/components/button/BrandIconButton';
import Table, { EllipsisText as TableEllipsisText } from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Badge from '@/components/badge/Badge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import DeleteQueueConfirmPopup from '@/components/popup/DeleteQueueConfirmPopup';
import { PATIENT_PROFILES, getPatientByHN } from '@/data/patientProfiles';
import { applyOpdScreeningDrafts, isScreeningCompleted } from '@/data/opdScreeningDrafts';
import OpdDischargePopup from '@/pages/opd/OpdDischargePopup';
import { addWalkinRequest } from '@/data/opdWalkinRequests';
/* READ-ONLY import from the appointment system (TOR 1.2.1.2) — never
   modified here; consumed defensively (see TODAY_MASTER_APPOINTMENTS). */
import { INITIAL_APPOINTMENTS } from '@/pages/appointment/appointmentMockData';
import { getOpdConsentSummary } from '@/data/consentWorkflowStore';
import { buildOpdSearchHistorySeed } from '@/data/primarySearchHistorySeeds';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import { withDoctorAvatars } from '@/pages/appointment/appointmentDoctorRoster';

/* Topbar breadcrumb — ต้องตรงกับชื่อเมนู "คัดกรอง" ที่พาเข้ามาหน้านี้
   ไม่งั้น breadcrumb กับหัวข้อหน้าจะเรียกชื่อระบบเดียวกันคนละอย่าง */
const breadcrumb = ['คัดกรอง'];

/* localStorage key for PrimarySearch recent-search history. Page-scoped so
   the OPD, registration, and treatment queues each keep their own list. */
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:opd-queue';

/* ── Status summary cards (Figma 115:35757 — 6 cards in one row) ─
   Cards 1-3: today overview (info-blue) · 4-6: queue status (mixed). */
const SUMMARY_CARDS = [
  { key: 'total',        label: 'ผู้รับบริการรวมวันนี้',  value: 130, indicator: 'เพิ่ม 5 จากเมื่อวาน', color: 'info',       icon: 'directions_walk' },
  { key: 'walkin',       label: 'Walk-in วันนี้',         value: 47,  indicator: 'เพิ่ม 5 จากเมื่อวาน', color: 'info',       icon: 'directions_walk' },
  { key: 'telemedicine', label: 'Telemedicine วันนี้',    value: 4,   indicator: 'เพิ่ม 2 จากเมื่อวาน', color: 'info',       icon: 'videocam'        },
  { key: 'appointment',  label: 'นัดหมายวันนี้',           value: 83,  indicator: 'เหลือรอ 31 ราย',     color: 'positive',   icon: 'calendar_clock'  },
  { key: 'waiting',      label: 'กำลังรอคัดกรอง',          value: 12,  indicator: 'เฉลี่ยรอ 22 นาที',   color: 'inprogress', icon: 'hourglass_top'   },
  { key: 'done',         label: 'คัดกรองเสร็จ',             value: 118, indicator: 'ทุกห้องรวมกัน',       color: 'positive',   icon: 'how_to_reg'      },
];

/* ── Tabs (รายการคิว) ─ Figma 2756:146122 / PHCIS-ALL 3093:172146 —
   5 tabs + leading icons. Tab → statusKey mapping (per Figma's per-tab
   row content):
     · waiting  → 'waiting'        (status pill "รอคัดกรอง")
     · progress → 'doing'          (status pill "กำลังคัดกรอง")
     · done     → 'screened'       (status pill "คัดกรองแล้ว"; รอตรวจ = `done` ในแท็บทั้งหมด)
     · draft    → 'draft'          (status pill "กำลังคัดกรอง", workflow=draft) */
const TABS = [
  { key: 'all',      label: 'ทั้งหมด',         icon: 'group',         count: 130 },
  { key: 'waiting',  label: 'รอคัดกรอง',       icon: 'schedule',      count: 83  },
  { key: 'progress', label: 'กำลังคัดกรอง',    icon: 'assignment',    count: 12  },
  { key: 'done',     label: 'คัดกรองแล้ว',     icon: 'check_circle',  count: 2   },
  { key: 'draft',    label: 'ที่ร่างไว้',       icon: 'save',          count: 6   },
];

/* Reverse map — used by the activeTab filter below. 'all' bypasses the
   filter; every other tab keeps only rows whose statusKey matches. */
const TAB_STATUS_FILTER = {
  waiting:  (r) => r.statusKey === 'waiting',
  progress: (r) => r.statusKey === 'doing',
  done:     (r) => r.statusKey === 'screened',
  draft:    (r) => r.statusKey === 'draft',
};

/* ── Tag-group filter mock data ──────────────────────────── */
const FILTER_OPTIONS = {
  department: [
    { value: 'all',        label: 'ทุกแผนก'    },
    { value: 'อายุรกรรม',   label: 'อายุรกรรม'   },
    { value: 'ศัลยกรรม',   label: 'ศัลยกรรม'    },
    { value: 'กุมารเวช',    label: 'กุมารเวช'     },
    { value: 'จิตเวช',     label: 'จิตเวช'      },
    { value: 'ตรวจรักษา',  label: 'ตรวจรักษา'   },
  ],
  doctor: [
    { value: 'all',                  label: 'ทุกคน'              },
    { value: 'พญ.สมหญิง รักษ์ดี',     label: 'พญ.สมหญิง รักษ์ดี'   },
    { value: 'นพ.สมชาย ใจดี',         label: 'นพ.สมชาย ใจดี'      },
    { value: 'พญ.วิภา สุขศรี',         label: 'พญ.วิภา สุขศรี'       },
    { value: 'นพ.ณัฐวุฒิ บุญมี',        label: 'นพ.ณัฐวุฒิ บุญมี'      },
  ],
  /* Filter exposes Walk-in plus three appointment scopes. "นัดหมาย: ทั้งหมด"
     includes both hospital appointments and Telemedicine, while the latter
     two options drill into those appointment channels individually. */
  type: [
    { value: 'all',                  label: 'ทุกประเภท'              },
    { value: 'walkin',               label: 'Walk-in'                },
    { value: 'appointment_all',      label: 'นัดหมาย: ทั้งหมด'        },
    { value: 'appointment_hospital', label: 'นัดหมาย: ที่โรงพยาบาล'   },
    { value: 'telemedicine',         label: 'นัดหมาย: Telemedicine'  },
  ],
  date: [
    { value: 'today',     label: 'วันนี้'             },
    { value: 'yesterday', label: 'เมื่อวาน'           },
    { value: '7days',     label: '7 วันที่ผ่านมา'     },
    { value: '30days',    label: '30 วันที่ผ่านมา'    },
    { value: 'custom',    label: 'เลือกช่วงเวลา…'   },
  ],
  time: [
    { value: 'all',       label: 'ทั้งวัน'                  },
    { value: 'morning',   label: 'ช่วงเช้า (06:00–12:00)'  },
    { value: 'afternoon', label: 'ช่วงบ่าย (12:00–18:00)'  },
    { value: 'evening',   label: 'ช่วงเย็น (18:00–24:00)'  },
  ],
};
const FILTER_DEFAULTS = {
  department: 'all', doctor: 'all', type: 'all',
  /* Date filter is an object so the FilterDateTag can carry both the quick
     key and (when 'custom') the picked single/range — see FilterDateTag.jsx. */
  dateValue: { quick: 'today' },
  time: 'all',
};

/* Chip-only quick keys (not in DateFilterPopup's sidebar). FilterDateTag
   merges these on top of the popup's own QUICK_OPTIONS to label the chip. */
const DATE_CHIP_LABELS = {
  today:     'วันนี้',
  yesterday: 'เมื่อวาน',
};

/* ── Queue table — Figma 119:57301 (12 columns) ─────────────
   Each column declares its layout (width / flex / align) plus an
   optional `render(row, index, ctx)` cell renderer. Columns without
   `render` fall back to <EllipsisText text={row[col.key]} /> in the
   shared <Table> component.                                          */
const renderQueue = (row) =>
  <Pill pill={{ label: row.queue, ...QUEUE_BADGE }} />;

const renderName = (row, idx, { editMode }) => (
  <>
    <Avatar name={row.name} seed={idx} />
    <MaskedWorklistName
      name={row.name}
      recordKey={row.hn || row.queue}
      linkTo={editMode ? null : {
        pathname: '/opd/screening',
        state: { hn: row.hn, queue: row.queue, name: row.name, statusKey: row.statusKey },
      }}
    />
  </>
);

/* Telemedicine indicator — Figma PHCIS | OPD 115:35757 → 124:34721 (DataCell).
   Design uses "Colorful icon Badge" + **Video** glyph (Material `videocam`,
   outline axis per Figma 329:51905). */
const renderTelemedicine = (row) => (
  row.typeKey === 'telemedicine' ? (
    <ColorfulIconBadge
      style='blue'
      size='medium'
      fill='default'
      icon='videocam'
    />
  ) : null
);

/* Action cell — 4 โหมดตามสถานะ (Figma PHCIS-OPD):
     · ตรวจเสร็จแล้ว     → 119:57361 disabled
     · รอตรวจ / คัดกรองแล้ว → 169:52023 / 169:52091 quaternary
     · รอคัดกรอง (ที่เหลือ) → 119:57381 fill default */
const actionModeForOpdStatus = (statusKey) => {
  if (statusKey === 'examined') return 'disabled';
  if (isScreeningCompleted(statusKey)) return 'quaternary';
  return 'default';
};

const makeRenderActions = ({ onCall, onDelete, onDischarge }) => function ActionsCell(row) {
  const mode = actionModeForOpdStatus(row.statusKey);
  const enabled = mode !== 'disabled';
  const callVariant = mode === 'default' ? 'fill' : mode === 'quaternary' ? 'quaternary' : 'ghost';
  /* ตรวจเสร็จแล้ว rows swap the call/cancel pair for จำหน่าย/ส่งต่อ
     (TOR 1.2.6.1 fallback mount — canonical mount is /treat/record). */
  if (row.statusKey === 'examined') {
    return (
      <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
        <NeutralSubdueButton
          variant='outline'
          size='sm'
          disabled={!!row.disposition}
          aria-label={row.disposition ? 'จำหน่ายแล้ว' : 'จำหน่าย/ส่งต่อ'}
          onClick={row.disposition
            ? undefined
            : (e) => { e.stopPropagation(); onDischarge?.(row); }}
        >
          {row.disposition ? 'จำหน่ายแล้ว' : 'จำหน่าย/ส่งต่อ'}
        </NeutralSubdueButton>
      </div>
    );
  }
  return (
    <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
      <BrandIconButton
        icon='volume_up'
        size='sm'
        variant={callVariant}
        disabled={!enabled}
        aria-label={enabled ? 'เรียกคิว' : 'ตรวจเสร็จแล้ว'}
        onClick={(e) => { e.stopPropagation(); onCall?.(row); }}
      />
      <NeutralSubdueButton
        variant='outline'
        size='sm'
        disabled={!enabled}
        aria-label='ยกเลิก'
        onClick={enabled
          ? (e) => { e.stopPropagation(); onDelete?.(row); }
          : undefined}
      >
        ยกเลิก
      </NeutralSubdueButton>
    </div>
  );
};

/* Build the per-page COLUMNS list. Static config lives at module scope;
   the only dynamic column is "การดำเนินการ" because its renderer needs
   access to the page-level `onDelete` callback. Callers in the component
   memo-ise the final list with their bound handlers. */
const renderConsent = (row) => {
  const { signed, pending, blocked } = getOpdConsentSummary(row.hn);
  if (blocked) return <Pill pill={{ style: 'error', label: 'ปฏิเสธ/ถอน' }} />;
  if (pending > 0) return <Pill pill={{ style: 'warning', label: `รอลงนาม ${pending}` }} />;
  if (signed > 0) return <Pill pill={{ style: 'success', label: `ยินยอม ${signed}` }} />;
  return <Pill pill={{ style: 'neutral', label: 'ยังไม่มี' }} />;
};

const BASE_COLUMNS = [
  { key: 'queue',        label: 'คิว',  render: renderQueue },
  { key: 'hn',           label: 'HN'  },
  /* VN (Visit Number) — Figma 3185:144272 cell rhythm sits next to HN. */
  { key: 'vn',           label: 'VN' },
  { key: 'name',         label: 'ชื่อ-นามสกุล', flex: true, minWidth: 160, render: renderName },
  { key: 'doctor',       label: 'แพทย์รักษา',   flex: true, minWidth: 160 },
  { key: 'type',         label: 'ประเภท',  render: (row) => <Pill pill={TYPE_PILL[row.typeKey]} /> },
  { key: 'telemedicine', label: 'Telemedicine', align: 'center', sortable: false, render: renderTelemedicine },
  { key: 'contact',      label: 'การติดต่อ', render: (row) => <Pill pill={CONTACT_PILL[row.contactKey]} /> },
  { key: 'time',         label: 'เวลา'  },
  { key: 'dept',         label: 'แผนก' },
  { key: 'room',         label: 'ห้อง' },
  { key: 'consent',      label: 'ความยินยอม', sortable: false, render: renderConsent },
  { key: 'status',       label: 'สถานะ', render: (row) => <Pill pill={STATUS_PILL[row.statusKey]} /> },
];

/* Pill records carry `{ style, label }` consumed by the shared Badge
   component (Figma 302:73). Both `done` and `examined` map to `success`
   since StatusBadge doesn't separate green vs teal at the spec level. */
/* Per Figma h0fghZdYHA7HRJcjmRsUmF (PHCIS-ALL) — OPD queue carries
   4 user-facing statuses:
     · รอคัดกรอง       (waiting tab)
     · กำลังคัดกรอง   (progress tab)
     · รอตรวจ          (done tab — screening finished, waiting for doctor)
     · ตรวจเสร็จแล้ว  (post-doctor, drains out of OPD)
   `draft` is a separate workflow state, not a fifth visible status — its
   pill reuses "กำลังคัดกรอง" because the screening was started but
   parked. Tab assignment is driven by statusKey, the pill label is what
   the user sees on the row. */
const STATUS_PILL = {
  waiting:  { style: 'warning', label: 'รอคัดกรอง'       },
  doing:    { style: 'info',    label: 'กำลังคัดกรอง'    },
  screened: { style: 'info',    label: 'คัดกรองแล้ว'     },
  done:     { style: 'warning', label: 'รอตรวจ'           },
  examined: { style: 'success', label: 'ตรวจเสร็จแล้ว'   },
  draft:    { style: 'info',    label: 'กำลังคัดกรอง'    },
};

/* Default table + สถานะ sort — รอคัดกรอง → กำลังคัดกรอง → คัดกรองแล้ว → รอตรวจ → ตรวจเสร็จแล้ว */
const STATUS_SORT_ORDER = {
  waiting: 0,
  doing: 1,
  draft: 1,
  screened: 2,
  done: 3,
  examined: 4,
};

const TYPE_PILL = {
  walkin:       { style: 'neutral', label: 'Walk-in' },
  appointment:  { style: 'info',    label: 'นัดหมาย' },
  telemedicine: { style: 'info',    label: 'นัดหมาย' },
};

const CONTACT_PILL = {
  contacted:    { style: 'info',    label: 'ติดต่อแล้ว'   },
  notContacted: { style: 'warning', label: 'ยังไม่ติดต่อ' },
  noAnswer:     { style: 'error',   label: 'ไม่รับสาย'    },
};

/* ── TOR 1.2.1.2 — appointment master-schedule sync ────────────────────
   Today's appointment rows come from the REAL appointment master schedule
   (src/pages/appointment/appointmentMockData.js, read-only). Defensive:
   any shape change in that module degrades to the static queue rows
   instead of crashing the OPD queue. */
const todayLocalKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const TODAY_MASTER_APPOINTMENTS = (() => {
  try {
    return (INITIAL_APPOINTMENTS || [])
      .filter((a) => a && a.date === todayLocalKey() && typeof a.time === 'string')
      .sort((a, b) => a.time.localeCompare(b.time));
  } catch {
    return [];
  }
})();

/* มาไม่ตรงนัด boundary: arrival exactly at slot end (slot + grace) still
   counts as ตามนัด; only past the grace flips the badge. */
const APPT_GRACE_MINUTES = 30;
const timeToMinutes = (t = '') => {
  const [h, m] = String(t).split(':').map(Number);
  return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m);
};
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const arrivalStatusFor = (slotTime, arrivedAt) => {
  if (!arrivedAt) return 'notArrived';
  return timeToMinutes(arrivedAt) <= timeToMinutes(slotTime) + APPT_GRACE_MINUTES
    ? 'onTime'
    : 'late';
};
const ARRIVAL_PILL = {
  onTime:      { style: 'success', label: 'มาตามนัด'     },
  late:        { style: 'warning', label: 'มาไม่ตรงนัด'  },
  notArrived:  { style: 'neutral', label: 'ยังไม่มา'     },
};

/* นัดหมาย cell — slot time from the master schedule + arrival badge +
   "รับลงทะเบียน" on a not-yet-arrived appointment row (stamps arrival). */
const makeRenderAppointment = ({ onRegister }) => function AppointmentCell(row) {
  if (!row.apptTime) {
    return (
      <span style={{ color: 'var(--text-content-quaternary, #ADB2B7)', fontSize: 'var(--type-size-sm)' }}>—</span>
    );
  }
  const status = arrivalStatusFor(row.apptTime, row.arrivedAt);
  return (
    <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
      <span
        style={{
          color: 'var(--text-content-secondary, #636B72)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          whiteSpace: 'nowrap',
        }}
        title={row.apptSource === 'master'
          ? 'สล็อตจากตารางนัดหมายแพทย์ (ระบบนัดหมาย)'
          : 'สล็อตจากคิวนัดของหน่วยบริการ (ไม่มีในตารางนัดหมายแพทย์วันนี้)'}
      >
        {row.apptTime} น.
      </span>
      <Pill pill={ARRIVAL_PILL[status]} />
      {status === 'notArrived' && (
        <NeutralSubdueButton
          variant='outline'
          size='sm'
          aria-label='รับลงทะเบียน (บันทึกเวลามาถึง)'
          onClick={(e) => { e.stopPropagation(); onRegister?.(row); }}
        >
          รับลงทะเบียน
        </NeutralSubdueButton>
      )}
    </div>
  );
};

const QUEUE_BADGE = { style: 'success' };

/* Avatar — Thai portrait by name (male/female) with initial fallback.
   Map is auto-derived from PATIENT_PROFILES so every unique patient
   shortName resolves to its own front-facing studio portrait (no
   duplicates across the 25-row queue). */
const NAME_AVATAR_MAP = Object.fromEntries(
  PATIENT_PROFILES
    .filter((p) => p.avatarUrl)
    .map((p) => [p.shortName, p.avatarUrl])
);
const THAI_MALE_AVATARS = [
  '/avatars/mock-male-asian-a.png',
  '/avatars/mock-male-asian-b.png',
  '/avatars/mock-male-asian-c.png',
  '/avatars/patient-male-d.png',
  '/avatars/patient-male-e.png',
];
const THAI_FEMALE_AVATARS = [
  '/avatars/patient-female-a.png',
  '/avatars/patient-female-b.png',
  '/avatars/patient-female-c.png',
  '/avatars/patient-female-d.png',
  '/avatars/patient-female-e.png',
  '/avatars/patient-female-f.png',
];
const FEMALE_NAME_HINTS = ['ดวงใจ', 'สุดา', 'ปริญญา', 'พญ.', 'นาง', 'น.ส.', 'สมหญิง', 'วิภา'];
const isFemaleName = (name = '') => FEMALE_NAME_HINTS.some((hint) => name.includes(hint));

const Avatar = ({ name = '', seed = 0 }) => {
  const [imgError, setImgError] = useState(false);
  const female = isFemaleName(name);
  const sourceList = female ? THAI_FEMALE_AVATARS : THAI_MALE_AVATARS;
  const src = NAME_AVATAR_MAP[name] || sourceList[seed % sourceList.length];

  return (
    <div
      className='shrink-0 flex items-center justify-center text-white overflow-hidden'
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: '#9AA1A8',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
        lineHeight: 1,
      }}
      aria-hidden
    >
      {!imgError ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        name.trim().charAt(0) || '?'
      )}
    </div>
  );
};

/* Each pill record now carries `{ style, label }` instead of `{ bg, fg, label }`
   — the shared Badge component (Figma 302:73) owns the actual token mapping. */
const Pill = ({ pill }) => (
  <Badge style={pill.style} size='small'>
    {pill.label}
  </Badge>
);

/* Mock queue rows — initial seed; QueuePage owns the mutable copy in state
   so users can reorder via drag-and-drop in edit mode. */
const PAGE_SIZE = 20;

/* Status seed — ผู้มาก่อน (A001…) อยู่บน: ตรวจเสร็จแล้ว 2 · คัดกรองแล้ว 2 · รอตรวจ 2 · ที่เหลือรอคัดกรอง */
const seedStatus = (i) => {
  if (i < 2) return 'examined';
  if (i < 4) return 'screened';
  if (i < 6) return 'done';
  if (i < 14) return 'waiting';
  if (i < 18) return 'doing';
  if (i < 20) return 'draft';
  return 'waiting';
};

const INITIAL_ROWS = Array.from({ length: 25 }).map((_, i) => {
  /* PATIENT_PROFILES now ships 25 unique entries — pull one per index
     so the OPD queue has zero duplicate names or HNs. Each profile
     already carries its own assigned doctor (10-doctor pool spread
     across the list), so doctor variety comes for free. */
  const profile = PATIENT_PROFILES[i];
  const statusKey  = seedStatus(i);
  const typeKey    = ['walkin', 'appointment', 'telemedicine'][i % 3];
  const contactKey = ['contacted', 'notContacted', 'noAnswer'][i % 3];
  /* Time is monotonic by queue: A001 = 08:00, then +5 min per row, so
     A025 = 10:00. Lower queue numbers always arrive earlier. */
  const totalMinutes = 8 * 60 + i * 5;
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');
  return {
    id: `Q-${String(i + 1).padStart(3, '0')}`,
    queue: `A${String(i + 1).padStart(3, '0')}`,
    hn: profile.hn,
    /* VN (Visit Number) — per-visit identifier in Thai hospitals,
       distinct from HN (lifetime patient id). Sourced from
       `profile.vn` (patientProfiles.js) rather than derived here, so
       this screening queue and the pharmacy dispensing queue always
       show the identical VN for the same patient. */
    vn: profile.vn,
    name: profile.shortName,
    doctor: profile.doctor,
    room: `ห้องตรวจที่ ${(i % 4) + 1}`,
    dept: i === 2 || i === 7
      ? 'แผนกสังคมสงเคราะห์และเวชศาสตร์ฟื้นฟู'
      : ['ตรวจรักษา', 'อายุรกรรม', 'ศัลยกรรม', 'กุมารเวช'][i % 4],
    typeKey,
    statusKey,
    contactKey,
    time: `${hh}:${mm}`,
  };
});

/* Merge the master schedule into the queue's นัดหมาย rows (TOR 1.2.1.2):
   each appointment/telemedicine row adopts ITS OWN patient's slot from
   today's appointment schedule. The join is on `hn` — never on position —
   because attaching whichever appointment happens to come next in time
   order would show one patient an appointment time, an arrival badge and a
   doctor belonging to somebody else (chart-crossing). Rows already past the
   screening stage are treated as arrived (arrival = their queue time) so the
   badge derives มาตามนัด / มาไม่ตรงนัด from slot + grace; waiting rows start
   ยังไม่มา until "รับลงทะเบียน" stamps the arrival. A row with no matching
   appointment stays exactly as it was. */
const INITIAL_ROWS_SYNCED = INITIAL_ROWS.map((row) => {
  if (row.typeKey === 'walkin') return row;
  const appt = TODAY_MASTER_APPOINTMENTS.find((a) => a.hn === row.hn);
  if (appt) {
    return {
      ...row,
      apptId: appt.id || null,
      apptSource: 'master',
      apptTime: appt.time,
      /* Only adopt the doctor when the matched appointment is genuinely this
         patient's — otherwise keep the assigned doctor from patientProfiles. */
      doctor: appt.doctor || row.doctor,
      arrivedAt: row.statusKey === 'waiting' ? null : row.time,
    };
  }
  /* No entry in the master schedule for THIS patient → the row keeps its own
     local OPD booking (its queue slot + its own doctor). Marked `local` so the
     cell can say where the slot came from; we never borrow another patient's
     appointment just to fill the column. */
  return {
    ...row,
    apptId: null,
    apptSource: 'local',
    apptTime: row.time,
    arrivedAt: row.statusKey === 'waiting' ? null : row.time,
  };
});

/* Demo recent-search rows — Figma PHCIS-OPD 290:48930 (shown when history is empty). */
const OPD_SEARCH_HISTORY_SEED = buildOpdSearchHistorySeed(
  applyOpdScreeningDrafts(INITIAL_ROWS_SYNCED),
);

/* ── Page ─────────────────────────────────────────────────── */
const QueuePage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();
  const handleRowClick = (row) => history.push({
    pathname: '/opd/screening',
    /* statusKey rides along so ScreeningPage can offer อ่านอย่างเดียว vs
       คัดกรองซ้ำ on a คัดกรองแล้ว row (TOR 1.2.2.2). */
    state: { hn: row.hn, queue: row.queue, name: row.name, statusKey: row.statusKey },
  });

  const [activeTab, setActiveTab] = useState(navState?.activeTab || 'all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);

  /* Recent searches — persisted to localStorage via the shared
     useSearchHistory hook. Dropdown shows the latest 8 entries
     (case-insensitive dedupe). Page-scoped storage key so OPD,
     Registration, and Treatment queues each keep their own list. */
  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: OPD_SEARCH_HISTORY_SEED });

  /* Reset pagination when switching tabs so the user lands on page 1
     of the new tab's result set (otherwise a deep page can render
     empty if the new tab has fewer rows). */
  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  /* Edit-queue-order mode — toggled by the "แก้ไขลำดับคิว" button. While
     enabled, rows show a drag handle, become draggable, and can be reordered
     via native HTML5 drag-and-drop. Filters/search are bypassed in edit mode
     so reordering operates on the full underlying queue. */
  const [rows, setRows] = useState(() => applyOpdScreeningDrafts(INITIAL_ROWS_SYNCED));

  /* Live suggestion list — derived from `rows` whenever the user types.
     Matches against queue / HN / patient name / doctor name (the four
     fields the placeholder advertises). Capped at 8 to keep the popover
     compact and avoid masking the table behind it. Declared AFTER `rows`
     so the useMemo doesn't read a const before its initialiser runs (TDZ
     would crash render-time on first mount). */
  /* Per Figma 3345:2981 / 3346:8231, each PrimarySearch dropdown row
     renders two colorful pills (queue + HN) plus the patient name and
     doctor underneath. Map every queue row to that shape so history +
     suggestion lists both match the reference. */
  const queueRowToSearchItem = (row) => ({
    id: row.id,
    label: row.name,
    sublabel: row.doctor,
    value: row.name,
    badges: [
      { label: row.queue, tone: 'teal'   },
      { label: row.hn,    tone: 'indigo' },
    ],
    avatarSrc: getPatientByHN(row.hn)?.avatarUrl,
  });

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    const matches = [];
    const seen = new Set();
    for (const row of rows) {
      if (matches.length >= 8) break;
      if (seen.has(row.id)) continue;
      const fields = [row.queue, row.hn, row.name, row.doctor];
      if (fields.some((f) => f && f.toLowerCase().includes(q))) {
        seen.add(row.id);
        matches.push(queueRowToSearchItem(row));
      }
    }
    return matches;
  }, [rows, searchQ]);

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = rows.find((row) => row.id === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return rows.find((row) => {
      const fields = [row.queue, row.hn, row.name, row.doctor];
      return fields.some((f) => f && f.toLowerCase().includes(q));
    }) ?? null;
  };

  const createRecentSearchEntry = (query, item) => {
    const row = resolveSearchRow(query, item);
    if (!row) return query;
    return queueRowToSearchItem(row);
  };

  /* Recent-search avatar pile — resolves each persisted history entry
     back to a queue row (queue / HN / name / doctor match) and pulls the
     matching patient profile's avatar. Capped at 3 to match the Figma
     pile (32-px circles, -12 px overlap). When nothing resolves the
     PrimarySearch hides the pile + "ค้นหาล่าสุด" caption automatically. */
  const searchAvatars = useMemo(() => {
    const result = [];
    const seenHn = new Set();
    for (const entry of searchHistory) {
      if (result.length >= 3) break;
      const directAvatar = entry && typeof entry === 'object'
        ? (entry.avatarSrc ?? entry.avatarUrl ?? entry.src)
        : null;
      const q = (typeof entry === 'string'
        ? entry
        : (entry?.value ?? entry?.label ?? '')).toString().trim().toLowerCase();
      if (!q && !directAvatar) continue;
      const match = entry?.id
        ? rows.find((row) => row.id === entry.id)
        : rows.find((row) => {
          const fields = [row.queue, row.hn, row.name, row.doctor];
          return fields.some((f) => f && f.toLowerCase().includes(q));
        });
      const dedupeKey = match?.hn ?? directAvatar;
      if (!dedupeKey || seenHn.has(dedupeKey)) continue;
      const profile = match ? getPatientByHN(match.hn) : null;
      const src = directAvatar ?? profile?.avatarUrl;
      if (!src) continue;
      seenHn.add(dedupeKey);
      result.push({ src });
    }
    return result;
  }, [searchHistory, rows]);

  /* Delete-queue confirmation — set to the candidate row when the user
     clicks "ยกเลิก", cleared on cancel/confirm. Decoupled from `rows` so
     the popup keeps showing the right copy while the deletion animates
     out the table row. */
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const handleAskDelete = (row) => setDeleteCandidate(row);
  const handleCancelDelete = () => setDeleteCandidate(null);
  const handleConfirmDelete = () => {
    if (!deleteCandidate) return;
    setRows((prev) => prev.filter((r) => r.id !== deleteCandidate.id));
    setDeleteCandidate(null);
  };

  /* TOR 1.2.1.2 — "รับลงทะเบียน" on an arrived appointment row: stamps
     the arrival time; the badge derives ตามนัด/ไม่ตรงนัด from slot+grace.
     Arrivals past the grace window also enter the walk-in request path
     (TOR spec: late arrivals route through /opd/requests, not the slot). */
  const handleRegisterArrival = useCallback((row) => {
    const arrivedAt = nowHHMM();
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, arrivedAt } : r)));
    if (arrivalStatusFor(row.apptTime, arrivedAt) === 'late') {
      addWalkinRequest({
        hn: row.hn,
        name: row.name,
        complaint: `มาไม่ตรงนัด (นัด ${row.apptTime} น. มาถึง ${arrivedAt} น.) — จัดคิวผ่านคำขอ Walk-in`,
        esi: 4,
        dept: row.dept,
        requestedBy: 'จนท.สมพร ทองดี',
      });
    }
  }, []);

  /* TOR 1.2.6.1 — จำหน่าย/ส่งต่อ on ตรวจเสร็จแล้ว rows (fallback mount). */
  const [dischargeRow, setDischargeRow] = useState(null);
  const handleDischargeConfirm = useCallback((result) => {
    setRows((prev) => prev.map((r) => (
      r.id === dischargeRow?.id ? { ...r, disposition: result } : r
    )));
    setDischargeRow(null);
  }, [dischargeRow]);

  /* Final column list — actions + นัดหมาย columns are bound to the
     page-level handlers so each cell can stop propagation and act on the
     right row. นัดหมาย sits after เวลา so slot vs arrival read together. */
  const columns = useMemo(
    () => {
      const base = [...BASE_COLUMNS];
      const timeIdx = base.findIndex((c) => c.key === 'time');
      base.splice(timeIdx + 1, 0, {
        key: 'appt',
        label: 'นัดหมาย (ตารางแพทย์)',
        sortable: false,
        render: makeRenderAppointment({ onRegister: handleRegisterArrival }),
      });
      return [
        ...base,
        {
          key: 'actions',
          label: 'การดำเนินการ',
          sortable: false,
          render: makeRenderActions({
            onDelete: handleAskDelete,
            onDischarge: (row) => setDischargeRow(row),
          }),
        },
      ];
    },
    [handleRegisterArrival],
  );
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  /* ปุ่ม "แก้ไขลำดับคิว" ถูกเอาออกจากหน้านี้แล้ว — ไม่มีอะไรสลับโหมดนี้อีก
     กลไกลาก-วางจัดลำดับ (draggedIdx / overIdx / handleDrag*) ยังอยู่ในไฟล์แต่
     เข้าไม่ถึง ถ้ายืนยันว่าเลิกใช้ถาวรค่อยรื้อออกทั้งชุด */
  const [editMode] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const handleDragStart = (idx) => (e) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    /* Firefox needs some data to be set for drag to fire */
    e.dataTransfer.setData('text/plain', String(idx));
  };
  const handleDragOver = (idx) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overIdx !== idx) setOverIdx(idx);
  };
  const handleDrop = (idx) => (e) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== idx) {
      setRows((prev) => {
        const next = [...prev];
        const [item] = next.splice(draggedIdx, 1);
        next.splice(idx, 0, item);
        return next;
      });
    }
    setDraggedIdx(null);
    setOverIdx(null);
  };
  const handleDragEnd = () => {
    setDraggedIdx(null);
    setOverIdx(null);
  };
  /* Tag-group filter — Figma 115:35757 node 42:9963. Each dropdown chip
     opens a popover with its own option list (FILTER_OPTIONS). "ทั้งหมด"
     is the reset pill that snaps every filter back to its default. */
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const setFilter = (key) => (val) => setFilters((f) => ({ ...f, [key]: val }));
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };
  const isAllDefault =
    filters.department      === FILTER_DEFAULTS.department &&
    filters.doctor          === FILTER_DEFAULTS.doctor     &&
    filters.type            === FILTER_DEFAULTS.type       &&
    filters.dateValue.quick === FILTER_DEFAULTS.dateValue.quick &&
    filters.time            === FILTER_DEFAULTS.time;
  const filtersActive = !isAllDefault || searchQ.trim() !== '';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setFilters(FILTER_DEFAULTS);
      setSearchQ('');
      setPage(1);
    },
  );

  /* Draft callout — Figma 264:80153 / 264:56523. Always derived from the
     full row set so the sakura section keeps drawing attention even when
     search / filters narrow the main table. Shown only on the
     "กำลังซักประวัติ" tab per the Figma reference. */
  const draftRows = useMemo(
    () => rows.filter((r) => r.statusKey === 'draft'),
    [rows],
  );

  const filtered = useMemo(() => {
    /* In edit mode show the full underlying queue so drag-reorder works on
       a stable, unfiltered index space. */
    if (editMode) return rows;
    let result = rows;
    /* Tab filter — drives the per-tab row content per Figma
       PHCIS-ALL 3093:172146/172151/172153/172152. 'all' bypasses. */
    const tabPred = TAB_STATUS_FILTER[activeTab];
    if (tabPred) result = result.filter(tabPred);
    if (filters.department !== 'all') result = result.filter((r) => r.dept    === filters.department);
    if (filters.doctor     !== 'all') result = result.filter((r) => r.doctor  === filters.doctor);
    if (filters.type !== 'all') {
      result = result.filter((r) => {
        if (filters.type === 'appointment_all') {
          return r.typeKey === 'appointment' || r.typeKey === 'telemedicine';
        }
        if (filters.type === 'appointment_hospital') {
          return r.typeKey === 'appointment';
        }
        return r.typeKey === filters.type;
      });
    }
    /* date / time are visual placeholders — ROWS have no date field yet */
    if (searchQ) {
      const q = searchQ.toLowerCase();
      result = result.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.doctor.toLowerCase().includes(q) ||
        r.hn.toLowerCase().includes(q) ||
        String(r.queue).toLowerCase().includes(q)
      );
    }
    return result;
  }, [searchQ, filters, rows, editMode, activeTab]);

  const sortedRows = useMemo(() => {
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    /* คิว A001 = มาก่อน — HN/VN ไล่ตามลำดับมา (ผู้ตรวจเสร็จแล้วมาถึงก่อนอยู่แถวบน) */
    const arrivalCompare = (a, b) => String(a.queue).localeCompare(String(b.queue));
    if (!sortConfig.key) return [...filtered].sort(arrivalCompare);
    const normalize = (row, key) => {
      switch (key) {
        case 'type': return TYPE_PILL[row.typeKey]?.label || '';
        case 'status': return STATUS_SORT_ORDER[row.statusKey] ?? 99;
        case 'contact': return CONTACT_PILL[row.contactKey]?.label || '';
        default: return row[key] ?? '';
      }
    };
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    const next = [...filtered].sort((a, b) => {
      const av = normalize(a, sortConfig.key);
      const bv = normalize(b, sortConfig.key);
      const primary = sortConfig.key === 'status'
        ? (Number(av) || 0) - (Number(bv) || 0)
        : collator.compare(String(av), String(bv));
      if (primary !== 0) return sign * primary;
      return arrivalCompare(a, b);
    });
    return next;
  }, [filtered, sortConfig]);

  /* Paginated slice — drives the table render. Edit mode bypasses pagination
     so drag-reorder operates on the full underlying queue. */
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows = editMode
    ? sortedRows
    : sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = sortedRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd   = editMode ? sortedRows.length : Math.min(page * PAGE_SIZE, sortedRows.length);

  /* Snap page back into range when filtering / sorting shrinks the result. */
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <>
    <DeleteQueueConfirmPopup
      open={!!deleteCandidate}
      onClose={handleCancelDelete}
      onConfirm={handleConfirmDelete}
      queue={deleteCandidate?.queue}
      hn={deleteCandidate?.hn}
      patientName={deleteCandidate?.name}
      avatarSrc={getPatientByHN(deleteCandidate?.hn)?.avatarUrl}
    />
    {/* TOR 1.2.6.1 — จำหน่าย/ส่งต่อ (fallback mount on ตรวจเสร็จแล้ว rows) */}
    <OpdDischargePopup
      open={!!dischargeRow}
      onClose={() => setDischargeRow(null)}
      patient={dischargeRow ? {
        hn: dischargeRow.hn,
        name: dischargeRow.name,
        rights: getPatientByHN(dischargeRow.hn)?.insurance
          || getPatientByHN(dischargeRow.hn)?.rights,
      } : {}}
      onConfirm={handleDischargeConfirm}
      /* TOR 1.2.6.1 home-discharge leg — deep-link the follow-up visit into
         the appointment system with the patient already carried over. */
      onScheduleAppointment={(p) => history.push({
        pathname: '/appointment',
        state: { hn: p?.hn || dischargeRow?.hn, name: p?.name || dischargeRow?.name },
      })}
    />
    <QueuePageShell
      activeKey='opd'
      breadcrumb={breadcrumb}
      title='คัดกรอง'
      /* ปุ่ม "การนัดหมาย" ชุดเดียวกับหน้าเวชระเบียน (มติผู้ใช้ 25 ส.ค. 69)
         — คนคัดกรองต้องนัดหมายต่อได้จากหน้านี้เลย ไม่ต้องย้อนไปเวชระเบียน */
      actions={<AppointmentMenuButton />}
      summaryCards={SUMMARY_CARDS}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
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

          {/* Table section — Figma 115:35757 card uses 24px padding all sides
              and 24px gap between children; rounded-16, surface-card-100. */}
          <div
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              boxShadow: 'var(--shadow-card-strong)',
              padding: 'var(--dim-space-600)',
              gap: 'var(--dim-space-600)',
            }}
          >
            {/* Centered Primary Search — Figma 115:35757 / 2056:4246
                4 states (default/hover/typing/filled), brand-bordered shell,
                avatar pile + "ค้นหาล่าสุด" on the right; while typing it
                swaps to a brand circle submit button + suggestion dropdown. */}
            {/* ปุ่มนำส่งออกรายงานย้ายมาอยู่ข้างกล่องค้นหา (16 ส.ค. 2569) */}
            <div className='w-full flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
              {/* spacer ซ้ายสมดุลกับกลุ่มปุ่มขวา — กล่องค้นหาอยู่กึ่งกลางจริง */}
              <div className='flex-1' />
              <PrimarySearch
                value={searchQ}
                onChange={(v) => setSearchQ(v)}
                /* Commit triggers — Enter key, suggestion click, and history
                   click all flow through here so any successful search lands
                   in the persisted recent list AND navigates to the screening
                   page (same destination as clicking a queue table row). */
                onSubmit={(v, item) => {
                  pushHistory(createRecentSearchEntry(v, item));
                  setSearchQ(v);
                  const row = resolveSearchRow(v, item);
                  if (row) handleRowClick(row);
                }}
                placeholder='ค้นหาคิว / HN / ชื่อ-สกุลผู้ป่วย / ชื่อแพทย์'
                width={640}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                suggestions={searchSuggestions}
                avatars={searchAvatars}
              />
              <div className='flex-1 flex justify-end'>
              <NeutralSubdueButton
                leadingIcon='ios_share'
                collapseLabelBelow='lg'
                accessibilityLabel='นำส่งออกรายงาน'
                disabled={editMode}
              >
                นำส่งออกรายงาน
              </NeutralSubdueButton>
              </div>
            </div>

            {/* Action bar — filters + edit/export */}
            <div
              className='flex items-start w-full'
              style={{ gap: 'var(--dim-space-300)' }}
            >
              {/* Tag-group filter — Figma 115:35757 node 42:9963.
                  "ทั้งหมด" is selected when all dropdowns are at default
                  values; clicking it resets every filter. */}
              <OverflowFlexRow
                itemGap='var(--dim-space-200)'
                moreAriaLabel='แสดงตัวกรองที่ซ่อน'
              >
                <FilterDropdown
                  prefix='แผนก:'
                  options={FILTER_OPTIONS.department}
                  value={filters.department}
                  onChange={setFilter('department')}
                />
                <FilterDropdown
                  prefix='แพทย์:'
                  options={withDoctorAvatars(FILTER_OPTIONS.doctor)}
                  value={filters.doctor}
                  onChange={setFilter('doctor')}
                />
                <FilterDropdown
                  prefix='ประเภท:'
                  options={FILTER_OPTIONS.type}
                  value={filters.type}
                  onChange={setFilter('type')}
                />
                <FilterDateTag
                  prefix='วัน:'
                  value={filters.dateValue}
                  onChange={setFilter('dateValue')}
                  defaultQuick={FILTER_DEFAULTS.dateValue.quick}
                  quickLabels={DATE_CHIP_LABELS}
                />
                <FilterDropdown
                  prefix='เวลา:'
                  options={FILTER_OPTIONS.time}
                  value={filters.time}
                  onChange={setFilter('time')}
                />
                <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
              </OverflowFlexRow>
            </div>

            <SmoothFilterResults opaque={resultsOpaque}>
            <SearchResultCount found={sortedRows.length} total={rows.length} />

            {/* Draft callout — Figma 264:80153 / 264:56523. Lives INSIDE
                the white queue card (Figma 264:52725) between the filter
                row and the main table. Sakura-tinted card listing
                screenings parked as drafts; uses the new
                --surface-card-sakura-200 + --border-card-sakura-100 tokens
                and reuses the canonical <Table /> so column layout stays
                identical. Visible only on the "กำลังซักประวัติ" tab. */}
            {activeTab === 'progress' && draftRows.length > 0 && (
              <section
                className='w-full flex flex-col'
                style={{
                  background:   'var(--surface-card-sakura-200)',
                  border:       'var(--dim-stroke-400, 4px) solid var(--border-card-sakura-100)',
                  borderRadius: 'var(--dim-radius-500)',
                  padding:      'var(--dim-space-600)',
                  gap:          'var(--dim-space-300)',
                }}
              >
                <header
                  className='flex flex-col min-w-0'
                  style={{ gap: 'var(--dim-space-050, 2px)' }}
                >
                  <h2
                    style={{
                      margin: 'var(--dim-space-0)',
                      color: 'var(--text-topic-tertiary-title)',
                      fontFamily: 'var(--type-family-heading-content)',
                      fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                      fontSize: 'var(--type-size-base)',
                      lineHeight: 1.5,
                    }}
                  >
                    รายการที่บันทึกร่างไว้
                  </h2>
                  <p
                    style={{
                      margin: 'var(--dim-space-0)',
                      color: 'var(--text-topic-tertiary-subtext-on, var(--text-content-tertiary))',
                      fontFamily: 'var(--type-family-body)',
                      fontWeight: 'var(--type-weight-medium)',
                      fontSize: 'var(--type-size-xs)',
                      lineHeight: 1.5,
                    }}
                  >
                    กรุณาบันทึกต่อให้เสร็จ หรือลบรายการหากไม่ต้องการบันทึกต่อ
                  </p>
                </header>
                <Table
                  columns={columns}
                  rows={draftRows}
                  rowKey={(row) => row.id}
                  stickyColCount={4}
                  onRowClick={handleRowClick}
                />
              </section>
            )}

            {/* Table — generic <Table> handles layout, sticky cols, sort,
                drag-reorder, hover, and row click. Cell rendering for
                queue/name/type/contact/status/actions/telemedicine comes
                from each column's `render` function in COLUMNS above.
                Wrapping div pins a min-height so the table area doesn't
                vertically collapse when search/filters cut the row count —
                otherwise the document scrollHeight changes on every
                keystroke and the page visibly jerks up/down. */}
            <div className='flex flex-col' style={{ minHeight: 'calc(100vh - 360px)' }}>
            <Table
              columns={columns}
              rows={pageRows}
              rowKey={(row) => row.id}
              sortConfig={sortConfig}
              onSort={handleSort}
              stickyColCount={4}
              onRowClick={handleRowClick}
              editMode={editMode}
              draggedIdx={draggedIdx}
              overIdx={overIdx}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              /* Pin the header row below the sticky chrome stacked
                 above: Header 64 + tab strip 49 (8 pad + 40 tab + 1 border)
                 = 113. Mirrors how Pagination uses sticky `bottom: 0`. */
              stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
              emptyMessage='ไม่พบคิวที่ตรงกับเงื่อนไข'
            />
            </div>

            {/* Pagination */}
            <div
              className='sticky bottom-0 flex items-center w-full'
              style={{
                gap: 'var(--dim-space-200)',
                position: 'sticky',
                bottom: 'var(--dim-space-0)',
                zIndex: 50,
                background: 'var(--surface-card-100)',
                paddingTop: 'var(--dim-space-200)',
                borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              }}
            >
              <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                แสดง {rangeStart}–{rangeEnd} จาก {sortedRows.length} รายการ
              </span>
              <div className='flex-1' />
              <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
            </div>
            </SmoothFilterResults>
          </div>
        </div>
    </QueuePageShell>
    </>
  );
};

export default QueuePage;
