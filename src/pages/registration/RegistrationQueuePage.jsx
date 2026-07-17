import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import AppointmentMenuButton from '@/components/layout/AppointmentMenuButton';
import BrandIconButton from '@/components/button/BrandIconButton';
import Table, { EllipsisText } from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrivacyRevealPopup from '@/components/popup/PrivacyRevealPopup';
import { formatNationalId } from '@/data/registrationForm';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { MR_PATIENTS } from '@/data/mrPatients';
import {
  PATIENT_PROFILES,
  PENDING_REGISTRATION_NO_PHOTO,
  getPatientByHN,
  getPatientDobByHN,
} from '@/data/patientProfiles';
import { buildRegistrationSearchHistorySeed } from '@/data/primarySearchHistorySeeds';

/* MIH RegistrationQueuePage — Figma node 2756:148259 / queue col 199:9243.
   Patient roster for the Medical Records (เวชระเบียน) workflow. Shares the
   shell (Sidebar / Topbar / PageFooter) and design tokens with OPD QueuePage
   but uses the Registration-specific table schema (คิว, HN, ชื่อ, วันเกิด, อายุ,
   เลขบัตร, โทรศัพท์, สิทธิ, สถานะ, การจัดการคิว). Identity fields come from
   PATIENT_PROFILES (same as Screening PatientCard). Clicking a row navigates to
   /registration/register with the selected HN in router state — the registration form
   prefills from MR_PATIENTS via that key. */

const breadcrumb = ['ระบบงานเวชระเบียน'];

/* Summary cards — 6-card row per Figma 2756:148259. Labels mirror the
   MR (เวชระเบียน) flow: ซักประวัติ rather than the OPD "ลงทะเบียน". */
const SUMMARY_CARDS = [
  { key: 'total',        label: 'ผู้รับบริการรวมวันนี้', value: 130, indicator: 'เพิ่ม 5 จากเมื่อวาน', color: 'info',       icon: 'directions_walk' },
  { key: 'walkin',       label: 'Walk-in วันนี้',        value: 47,  indicator: 'เพิ่ม 5 จากเมื่อวาน', color: 'info',       icon: 'directions_walk' },
  { key: 'telemedicine', label: 'Telemedicine วันนี้',   value: 4,   indicator: 'เพิ่ม 2 จากเมื่อวาน', color: 'info',       icon: 'videocam'        },
  { key: 'appointment',  label: 'นัดหมายวันนี้',          value: 83,  indicator: 'เหลือรอ 31 ราย',     color: 'positive',   icon: 'calendar_clock'  },
  { key: 'waiting',      label: 'กำลังรอซักประวัติ',      value: 12,  indicator: 'เฉลี่ยรอ 22 นาที',   color: 'inprogress', icon: 'hourglass_top'   },
  { key: 'done',         label: 'ซักประวัติเสร็จ',        value: 118, indicator: 'ทุกห้องรวมกัน',       color: 'positive',   icon: 'how_to_reg'      },
];

/* Tab strip — Figma PHCIS-Registration 104:20512 (Tab Bar / Underline). */
const TABS = [
  { key: 'all',      label: 'ทั้งหมด',         icon: 'group',         count: 130 },
  { key: 'pending',  label: 'รอลงทะเบียน',     icon: 'schedule',      count: 12  },
  { key: 'progress', label: 'กำลังลงทะเบียน',   icon: 'assignment',    count: 2   },
  { key: 'done',     label: 'ลงทะเบียนแล้ว',    icon: 'check_circle',  count: 2   },
  { key: 'draft',    label: 'ที่ร่างไว้',        icon: 'save',          count: 6   },
];

/* Filter axes — Figma 104:20512 collapses the OPD-style แผนก/แพทย์/ประเภท
   triplet into a single `สถานะ` dropdown for the Registration queue.
   The remaining axes (วัน / เวลา) keep the OPD queue's pattern. */
const FILTER_OPTIONS = {
  /* Figma PHCIS-Registration — ตรวจเสร็จแล้ว → รอคัดกรอง → กำลังลงทะเบียน → รอลงทะเบียน */
  status: [
    { value: 'all',       label: 'ทุกสถานะ'        },
    { value: 'done',      label: 'ตรวจเสร็จแล้ว'   },
    { value: 'screening', label: 'รอคัดกรอง'      },
    { value: 'progress',  label: 'กำลังลงทะเบียน'  },
    { value: 'pending',   label: 'รอลงทะเบียน'     },
    { value: 'draft',     label: 'ที่ร่างไว้'      },
  ],
  time: [
    { value: 'all',       label: 'ทั้งวัน'                  },
    { value: 'morning',   label: 'ช่วงเช้า (06:00–12:00)'    },
    { value: 'afternoon', label: 'ช่วงบ่าย (12:00–18:00)'   },
  ],
};
const FILTER_DEFAULTS = {
  status: 'all',
  /* Object shape for FilterDateTag + DateFilterPopup (same as OPD queue). */
  dateValue: { quick: 'today' },
  time: 'all',
};

/* Chip labels for quick keys not shown in DateFilterPopup sidebar. */
const DATE_CHIP_LABELS = {
  today:     'วันนี้',
  yesterday: 'เมื่อวาน',
};

/* สถานะ column — Figma PHCIS-Registration ColorfulBadge (secondary / small):
     101:7918 ตรวจเสร็จแล้ว (teal) · 104:17991 รอคัดกรอง (orange) ·
     กำลังลงทะเบียน (blue) · 104:19593 รอลงทะเบียน (orange) */
const STATUS_TO_BADGE = {
  done:       { tone: 'teal',   label: 'ตรวจเสร็จแล้ว'   },
  screening:  { tone: 'orange', label: 'รอคัดกรอง'      },
  progress:   { tone: 'blue',   label: 'กำลังลงทะเบียน'  },
  pending:    { tone: 'orange', label: 'รอลงทะเบียน'    },
  draft:      { tone: 'grey',   label: 'ที่ร่างไว้'     },
  /* Legacy MR_PATIENTS keys */
  active:     { tone: 'teal',   label: 'ตรวจเสร็จแล้ว'   },
  inactive:   { tone: 'orange', label: 'รอลงทะเบียน'    },
};

const STATUS_SORT_ORDER = {
  done: 0, screening: 1, progress: 2, pending: 3, draft: 4, active: 0, inactive: 3,
};

const StatusPill = ({ status }) => {
  const s = STATUS_TO_BADGE[status] || STATUS_TO_BADGE.pending;
  return (
    <ColorfulBadge style={s.tone} size='small' hierarchy='secondary'>
      {s.label}
    </ColorfulBadge>
  );
};

const RIGHTS_TONE = {
  'ประกันสังคม': 'blue',
  'บัตรทอง':     'orange',
  'ข้าราชการ':   'green',
  'รัฐวิสาหกิจ': 'purple',
  'ชำระเงินเอง': 'purple',
};
const RightsPill = ({ rights }) => (
  <ColorfulBadge style={RIGHTS_TONE[rights] || 'grey'} size='small' hierarchy='secondary'>
    {rights}
  </ColorfulBadge>
);

/* Avatar — colored circle with first character of name (deterministic by HN). */
const HUES = ['#F472B6', '#A78BFA', '#60A5FA', '#34D399', '#FBBF24', '#FB7185'];
const Avatar = ({ name, hn }) => {
  const seed = hn ? parseInt(hn.replace(/\D/g, ''), 10) : 0;
  const bg = HUES[seed % HUES.length];
  const ch = (name || '?').trim().charAt(0);
  return (
    <span
      className='shrink-0 inline-flex items-center justify-center rounded-full'
      style={{
        width: 32, height: 32,
        background: bg,
        color: 'var(--text-content-on-content)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
      }}
    >
      {ch}
    </span>
  );
};

const MR_BY_HN = Object.fromEntries(MR_PATIENTS.map((p) => [p.hn, p]));

/* Queue pill — Figma PHCIS-Registration 199:9243 (teal ColorfulBadge). */
const renderQueue = (row) => (
  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
    {row.queue}
  </ColorfulBadge>
);

/* Table column config — shared with EllipsisText fallback for unspecified cells. */
const renderName = (row) => {
  const profile = getPatientByHN(row.hn);
  /* No profile photo only for รอลงทะเบียน — other statuses keep portraits. */
  const avatarUrl = row.status === 'pending' && row.noProfilePhoto
    ? null
    : profile?.avatarUrl;
  const avatarLabel = profile?.shortName ?? row.name;
  return (
    <div className='flex items-center gap-2 min-w-0 flex-1'>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=''
          className='shrink-0 rounded-full object-cover'
          style={{ width: 32, height: 32 }}
        />
      ) : (
        <Avatar name={avatarLabel} hn={row.hn} />
      )}
      <span className='truncate'>{row.name}</span>
    </div>
  );
};

const renderStatus = (row) => <StatusPill status={row.status} />;
const renderRights = (row) => <RightsPill rights={row.rights} />;

/* Privacy — queue roster display formats (Figma / preview spec). */
const formatDobMasked = (dob) => {
  const m = String(dob ?? '').trim().match(/^(\d+)\s+(.+?)\s+(\d{4})$/u);
  if (!m) return String(dob ?? '');
  return `xx xxxx ${m[3]}`;
};

const formatNationalIdMasked = (nationalId) => {
  const digits = String(nationalId ?? '').replace(/\D/g, '');
  if (digits.length !== 13) return String(nationalId ?? '');
  return `x-xxxx-xx-xx${digits[7]}-${digits.slice(-3)}`;
};

const formatPhoneMasked = (phone) => {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length < 4) return String(phone ?? '');
  return `xxx-xxx-${digits.slice(-4)}`;
};

const PRIVACY_FIELD_LABELS = {
  dob: 'วันเกิด',
  nationalId: 'เลขบัตรประชาชน',
  phone: 'โทรศัพท์',
};

const privacyRevealKey = (rowId, field) => `${rowId}:${field}`;

/* Masked PII cell — click opens PrivacyRevealPopup; after auth shows plain text. */
const PrivacyTableCell = ({
  revealed,
  maskedText,
  plainText,
  fieldLabel,
  onRequestReveal,
}) => (
  <button
    type='button'
    className='min-w-0 w-full text-left'
    aria-label={revealed ? undefined : `แสดง${fieldLabel}`}
    onClick={(e) => {
      e.stopPropagation();
      if (!revealed) onRequestReveal();
    }}
    style={{
      cursor: revealed ? 'default' : 'pointer',
      background: 'none',
      border: 'none',
      padding: 0,
      margin: 0,
      font: 'inherit',
      color: 'inherit',
    }}
  >
    <EllipsisText text={revealed ? plainText : maskedText} />
  </button>
);

/* Action cell — 3 โหมดตามสถานะ (Figma PHCIS-Registration):
     · รอคัดกรอง / กำลังลงทะเบียน → 200:11828 Brand Icon quaternary
     · รอลงทะเบียน            → 104:19594 Brand Icon fill (default)
     · อื่นๆ                  → disabled */
const actionModeForStatus = (status) => {
  if (status === 'screening' || status === 'progress') return 'quaternary';
  if (status === 'pending') return 'default';
  return 'disabled';
};

const makeRenderActions = ({ onCall }) => function ActionsCell(row) {
  const mode = actionModeForStatus(row.status);
  const enabled = mode !== 'disabled';
  const callVariant = mode === 'default' ? 'fill' : mode === 'quaternary' ? 'quaternary' : 'ghost';
  return (
    <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
      <BrandIconButton
        icon='volume_up'
        size='sm'
        variant={callVariant}
        disabled={!enabled}
        aria-label={enabled ? 'เรียกผู้รับบริการ' : 'ไม่สามารถเรียกผู้รับบริการได้'}
        onClick={(e) => { e.stopPropagation(); onCall?.(row); }}
      />
      <NeutralSubdueButton
        variant='outline'
        size='sm'
        disabled={!enabled}
        aria-label='ยกเลิก'
        onClick={(e) => e.stopPropagation()}
      >
        ยกเลิก
      </NeutralSubdueButton>
    </div>
  );
};

/* Column config — Figma 104:20512. Every header gets an unfold_more sort
   affordance (`sortable: true`); `flex` columns share the remaining width
   after the fixed-width columns are laid out. Widths line up with the
   Figma cell rhythm: HN/age 96 px, phone/rights 128 px, status 180 px,
   national-id/actions 160 px, name 220 px, dob 240 px. */
const buildColumns = ({ renderPrivacyCell }) => [
  { key: 'queue',      header: 'คิว',               width: 80,  sortable: true, render: renderQueue },
  { key: 'hn',         header: 'HN',                width: 96,  sortable: true },
  { key: 'name',       header: 'ชื่อ-นามสกุล',       width: 220, sortable: true, render: renderName },
  { key: 'dob',        header: 'วันเกิด',            width: 240, sortable: true, render: renderPrivacyCell('dob') },
  { key: 'age',        header: 'อายุ',              width: 96,  sortable: true },
  { key: 'nationalId', header: 'เลขบัตรประชาชน',     width: 220, sortable: true, render: renderPrivacyCell('nationalId') },
  { key: 'phone',      header: 'โทรศัพท์',          width: 128, sortable: true, render: renderPrivacyCell('phone') },
  { key: 'rights',     header: 'สิทธิการรักษา',      width: 128, sortable: true, render: renderRights },
  { key: 'status',     header: 'สถานะ',             width: 180, sortable: true, render: renderStatus },
  { key: 'actions',    header: 'การดำเนินการ',      width: 160, render: makeRenderActions({ onCall: () => {} }) },
];

/* SubHeader action group — per Figma 2756:148259 + dropdown 2120:32577. */
const MR_ACTIONS = (
  <>
    <AppointmentMenuButton />
    <BrandPrimaryButton leadingIcon='credit_card'>อ่านบัตรสมาร์ทการ์ด</BrandPrimaryButton>
  </>
);

const PAGE_SIZE = 20;

/* Demo distribution — ตรวจเสร็จแล้ว 2 · รอคัดกรอง 2 · กำลังลงทะเบียน 2 · รอลงทะเบียน … */
const seedRegistrationStatus = (i) => {
  if (i < 2) return 'done';
  if (i < 4) return 'screening';
  if (i < 6) return 'progress';
  if (i < 18) return 'pending';
  if (i < 24) return 'draft';
  return 'pending';
};

/* Queue table shows years only (e.g. "27"), not the full PATIENT_PROFILES
   "NN ปี - M เดือน - D วัน" string used on PatientCard. */
const ageYearsOnly = (age) => {
  const m = String(age ?? '').match(/^(\d+)/);
  return m ? m[1] : '';
};

/* Build a 130-row roster — one PATIENT_PROFILES entry per index (same pool
   as OPD queue / Screening PatientCard), MR fields for phone/rights/status.
   First five `pending` rows use PENDING_REGISTRATION_NO_PHOTO (new service
   users with no profile photo yet). */
const buildRoster = () => {
  const rows = [];
  let pendingNoPhotoIdx = 0;
  for (let i = 0; i < 130; i += 1) {
    const status = seedRegistrationStatus(i);
    const usePendingNoPhoto = status === 'pending' && pendingNoPhotoIdx < PENDING_REGISTRATION_NO_PHOTO.length;
    const profile = usePendingNoPhoto
      ? PENDING_REGISTRATION_NO_PHOTO[pendingNoPhotoIdx++]
      : PATIENT_PROFILES[i % PATIENT_PROFILES.length];
    const mr = MR_BY_HN[profile.hn];
    const fallbackMr = MR_PATIENTS[i % MR_PATIENTS.length];
    rows.push({
      id: `MR-${String(i + 1).padStart(3, '0')}`,
      queue: `R${String(i + 1).padStart(3, '0')}`,
      hn: profile.hn,
      name: profile.fullName,
      dob: getPatientDobByHN(profile.hn),
      age: ageYearsOnly(profile.age),
      nationalId: profile.nationalId,
      phone: mr?.phone ?? fallbackMr.phone,
      rights: mr?.rights ?? fallbackMr.rights,
      status,
      noProfilePhoto: usePendingNoPhoto,
    });
  }
  return rows;
};

/* Page-scoped localStorage key — keeps Registration's recent-search list
   separate from the OPD / Treatment queues. */
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:registration-queue';

/* Demo recent-search — Figma PHCIS-OPD 290:48930 (MR id + HN pills). */
const REGISTRATION_SEARCH_HISTORY_SEED = buildRegistrationSearchHistorySeed(
  buildRoster().slice(0, 4),
);

const RegistrationQueuePage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, {
    seedIfEmpty: REGISTRATION_SEARCH_HISTORY_SEED,
  });
  /* Map a registration row to the Figma 3345:2981 search-row shape:
     two colorful pills (queue id + HN) plus the patient name + the
     national-ID number as the sublabel. Used for both the live
     suggestion list and the recent-search history items. */
  const registrationRowToSearchItem = (row) => ({
    id: row.id,
    label: row.name,
    sublabel: row.nationalId ? `เลขบัตร ${row.nationalId}` : (row.phone || ''),
    value: row.name,
    badges: [
      { label: row.queue, tone: 'teal'   },
      { label: row.hn, tone: 'indigo' },
    ],
    avatarSrc: row.status === 'pending' && row.noProfilePhoto
      ? null
      : getPatientByHN(row.hn)?.avatarUrl,
  });

  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const setFilter = (key) => (val) => setFilters((f) => ({ ...f, [key]: val }));
  const isAllDefault =
    filters.status === FILTER_DEFAULTS.status &&
    filters.dateValue.quick === FILTER_DEFAULTS.dateValue.quick &&
    filters.time === FILTER_DEFAULTS.time;

  /* Mutable roster — drag-reorder in edit mode updates this array in place. */
  const [rows, setRows] = useState(() => buildRoster());

  /* PII reveal — masked dob / nationalId / phone cells open PrivacyRevealPopup. */
  const [privacyRevealRequest, setPrivacyRevealRequest] = useState(null);
  const [revealedPrivacyKeys, setRevealedPrivacyKeys] = useState([]);

  const isPrivacyRevealed = useCallback(
    (row, field) => revealedPrivacyKeys.includes(privacyRevealKey(row.id, field)),
    [revealedPrivacyKeys],
  );

  const requestPrivacyReveal = useCallback((row, field) => {
    if (isPrivacyRevealed(row, field)) return;
    setPrivacyRevealRequest({ row, field });
  }, [isPrivacyRevealed]);

  const handlePrivacyRevealConfirm = useCallback(() => {
    if (!privacyRevealRequest) return;
    const { row, field } = privacyRevealRequest;
    const key = privacyRevealKey(row.id, field);
    setRevealedPrivacyKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setPrivacyRevealRequest(null);
  }, [privacyRevealRequest]);

  const renderPrivacyCell = useCallback((field) => (row) => {
    const revealed = isPrivacyRevealed(row, field);
    let maskedText = '';
    let plainText = '';
    if (field === 'dob') {
      maskedText = formatDobMasked(row.dob);
      plainText = String(row.dob ?? '');
    } else if (field === 'nationalId') {
      maskedText = formatNationalIdMasked(row.nationalId);
      plainText = formatNationalId(row.nationalId);
    } else {
      maskedText = formatPhoneMasked(row.phone);
      plainText = String(row.phone ?? '');
    }
    return (
      <PrivacyTableCell
        revealed={revealed}
        maskedText={maskedText}
        plainText={plainText}
        fieldLabel={PRIVACY_FIELD_LABELS[field]}
        onRequestReveal={() => requestPrivacyReveal(row, field)}
      />
    );
  }, [isPrivacyRevealed, requestPrivacyReveal]);

  const columns = useMemo(
    () => buildColumns({ renderPrivacyCell }),
    [renderPrivacyCell],
  );

  /* Edit-queue-order mode — toggled by "แก้ไขลำดับคิว". Rows show a drag
     handle and reorder via HTML5 drag-and-drop; filters/search/tabs are
     bypassed so indices stay stable across the full queue. */
  const [editMode, setEditMode] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const handleDragStart = (idx) => (e) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
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

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = rows.find((row) => row.id === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return rows.find((row) =>
      [row.queue, row.id, row.hn, row.name, row.nationalId, row.phone]
        .some((f) => f && String(f).toLowerCase().includes(q)),
    ) ?? null;
  };

  /* Avatar pile — last 3 recent searches with patient profile photos. */
  const searchAvatars = useMemo(() => {
    const result = [];
    const seenHn = new Set();
    for (const entry of searchHistory) {
      if (result.length >= 3) break;
      const directAvatar = entry && typeof entry === 'object'
        ? (entry.avatarSrc ?? entry.avatarUrl ?? entry.src)
        : null;
      const row = resolveSearchRow(null, entry);
      const src = directAvatar ?? (row && !(row.status === 'pending' && row.noProfilePhoto)
        ? getPatientByHN(row.hn)?.avatarUrl
        : null);
      const dedupeKey = row?.hn ?? directAvatar;
      if (!src || !dedupeKey || seenHn.has(dedupeKey)) continue;
      seenHn.add(dedupeKey);
      result.push({ src });
    }
    return result;
  }, [searchHistory, rows]);

  const filtered = useMemo(() => {
    if (editMode) return rows;
    let r = rows;
    if (activeTab !== 'all') {
      const want = activeTab;
      r = r.filter((row) => row.status === want);
    }
    if (filters.status !== 'all') {
      r = r.filter((row) => row.status === filters.status);
    }
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      const qDigits = q.replace(/\D/g, '');
      r = r.filter((row) =>
        (row.queue && row.queue.toLowerCase().includes(q)) ||
        row.hn.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        (row.phone && row.phone.toLowerCase().includes(q)) ||
        (qDigits && row.nationalId
          && row.nationalId.replace(/\D/g, '').includes(qDigits)),
      );
    }
    return r;
  }, [rows, activeTab, searchQ, filters.status, editMode]);

  /* Sort state — Figma 104:20512 puts an `unfold_more` affordance on every
     column header; Table is controlled so the page owns `sortConfig`. Click
     the same header again to flip asc → desc; click a different header to
     start asc on that column. */
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }
  ));

  const toggleEditMode = () => {
    setEditMode((m) => {
      if (!m) setSortConfig({ key: null, direction: 'asc' });
      return !m;
    });
  };

  const sorted = useMemo(() => {
    if (editMode) return filtered;
    const { key, direction } = sortConfig;
    /* Default ordering — สถานะก่อน (ตรวจเสร็จแล้ว → รอคัดกรอง → กำลังลงทะเบียน → รอลงทะเบียน),
       then queue arrival id within the same status. */
    const sign = direction === 'desc' ? -1 : 1;
    const arrivalCompare = (a, b) => String(a.id).localeCompare(String(b.id));
    const statusCompare = (a, b) => {
      const byStatus = (STATUS_SORT_ORDER[a.status] ?? 99) - (STATUS_SORT_ORDER[b.status] ?? 99);
      if (byStatus !== 0) return byStatus;
      return arrivalCompare(a, b);
    };
    if (!key) return filtered.slice().sort(statusCompare);
    const copy = filtered.slice();
    copy.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const primary = key === 'status'
        ? (STATUS_SORT_ORDER[av] ?? 99) - (STATUS_SORT_ORDER[bv] ?? 99)
        : key === 'age'
          ? (Number(av) || 0) - (Number(bv) || 0)
          : String(av ?? '').localeCompare(String(bv ?? ''), 'th');
      if (primary !== 0) return sign * primary;
      return arrivalCompare(a, b);
    });
    return copy;
  }, [filtered, sortConfig, editMode]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const visibleRows = editMode
    ? sorted
    : sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = editMode
    ? sorted.length
    : Math.min(page * PAGE_SIZE, sorted.length);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleRowClick = (row) => {
    if (editMode) return;
    history.push({
      pathname: '/registration/register',
      state: { hn: row.hn },
    });
  };

  /* Pagination ellipsis logic is now owned by <Pagination /> from
     @/components/pagination — caller only passes currentPage / pageCount. */

  return (
    <QueuePageShell
      activeKey='registration'
      breadcrumb={breadcrumb}
      title='ระบบงานเวชระเบียน'
      actions={MR_ACTIONS}
      summaryCards={SUMMARY_CARDS}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={(key) => { setActiveTab(key); setPage(1); }}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          padding: 'var(--dim-space-600)',
          gap: 'var(--dim-space-600)',
        }}
      >
            <div
              className='w-full flex flex-col'
              style={{
                background: 'var(--surface-card-100)',
                borderRadius: 'var(--dim-radius-500)',
                border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                boxShadow: 'var(--shadow-card-strong)',
                padding: 'var(--dim-space-600)',
                gap: 'var(--dim-space-600)',
              }}
            >
              {/* Search — centered inside the card per Figma 2756:148259 */}
              <div className='w-full flex items-start justify-center'>
                <PrimarySearch
                  value={searchQ}
                  onChange={setSearchQ}
                  onSubmit={(label, item) => {
                    setSearchQ(label);
                    /* Resolve the picked row (by id from `item` first, then
                       a loose match on the typed string). Push the rich
                       badge entry into history AND navigate to the
                       registration form — same destination as clicking the
                       queue table row. */
                    const match = resolveSearchRow(label, item);
                    pushHistory(match ? registrationRowToSearchItem(match) : (item ?? label));
                    if (match) handleRowClick(match);
                  }}
                  suggestions={(() => {
                    const q = searchQ.trim().toLowerCase();
                    if (!q) return [];
                    return rows
                      .filter((row) => [row.queue, row.id, row.hn, row.name, row.nationalId, row.phone]
                        .some((f) => f && String(f).toLowerCase().includes(q)))
                      .slice(0, 8)
                      .map(registrationRowToSearchItem);
                  })()}
                  history={searchHistory}
                  onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                  avatars={searchAvatars}
                  placeholder='ค้นหา คิว / HN / เลขบัตร / ชื่อ-สกุล / โทรศัพท์'
                  width={640}
                />
              </div>

              {/* Action bar — filter chips on the left, secondary actions on the right */}
              <div
                className='flex items-start w-full'
                style={{ gap: 'var(--dim-space-300)' }}
              >
                <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
                  <FilterTag
                    value='ทั้งหมด'
                    selected={isAllDefault}
                    onClick={() => setFilters(FILTER_DEFAULTS)}
                  />
                  <FilterDropdown prefix='สถานะ :' options={FILTER_OPTIONS.status} value={filters.status} onChange={setFilter('status')} />
                  {/* Vertical divider between the สถานะ chip and the date/time
                      filters, per Figma 104:20512. */}
                  <div
                    aria-hidden
                    style={{
                      width: 1, height: 24, alignSelf: 'center', flexShrink: 0,
                      background: 'var(--border-neutral-tertiary)',
                      marginLeft: 'var(--dim-space-100)',
                      marginRight: 'var(--dim-space-100)',
                    }}
                  />
                  <FilterDateTag
                    prefix='วัน:'
                    value={filters.dateValue}
                    onChange={setFilter('dateValue')}
                    defaultQuick={FILTER_DEFAULTS.dateValue.quick}
                    quickLabels={DATE_CHIP_LABELS}
                  />
                  <FilterDropdown prefix='เวลา:'    options={FILTER_OPTIONS.time}       value={filters.time}       onChange={setFilter('time')} />
                </OverflowFlexRow>
                <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
                  <NeutralSubdueButton
                    leadingIcon={editMode ? 'check' : 'format_list_bulleted'}
                    collapseLabelBelow='lg'
                    accessibilityLabel={editMode ? 'เสร็จสิ้น' : 'แก้ไขลำดับคิว'}
                    onClick={toggleEditMode}
                  >
                    {editMode ? 'เสร็จสิ้น' : 'แก้ไขลำดับคิว'}
                  </NeutralSubdueButton>
                  <NeutralSubdueButton
                    leadingIcon='ios_share'
                    collapseLabelBelow='lg'
                    accessibilityLabel='นำส่งออกรายงาน'
                    disabled={editMode}
                  >
                    นำส่งออกรายงาน
                  </NeutralSubdueButton>
                  <BrandSubdueButton
                    variant='outline'
                    size='sm'
                    leadingIcon='person_add'
                  >
                    เพิ่มผู้รับบริการใหม่
                  </BrandSubdueButton>
                </div>
              </div>

              {/* Patient table — mirrors the OPD Screening queue: the
                  first three identity columns (คิว / HN / ชื่อ-นามสกุล)
                  pin to the left while the rest of the row scrolls
                  horizontally, so the doctor never loses sight of who
                  the row is for. */}
              <Table
                columns={columns}
                rows={visibleRows}
                rowKey={(row) => row.id}
                sortConfig={sortConfig}
                onSort={editMode ? undefined : handleSort}
                onRowClick={editMode ? undefined : handleRowClick}
                stickyColCount={3}
                editMode={editMode}
                draggedIdx={draggedIdx}
                overIdx={overIdx}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                /* Header pins below app Header 64 + tab strip 49 = 113. */
                stickyHeaderTop={113}
                emptyMessage='ไม่พบผู้รับบริการ'
              />

              {/* Pagination — sits inside the card; brand-quaternary divider
                  matches the OPD pagination contract. */}
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
                {!editMode && (
                  <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
                )}
              </div>
            </div>
      </div>

      <PrivacyRevealPopup
        open={!!privacyRevealRequest}
        fieldLabel={
          privacyRevealRequest
            ? PRIVACY_FIELD_LABELS[privacyRevealRequest.field]
            : PRIVACY_FIELD_LABELS.dob
        }
        onClose={() => setPrivacyRevealRequest(null)}
        onConfirm={handlePrivacyRevealConfirm}
      />
    </QueuePageShell>
  );
};

export default RegistrationQueuePage;
