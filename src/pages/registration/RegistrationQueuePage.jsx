import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import AppointmentMenuButton from '@/components/layout/AppointmentMenuButton';
import BrandIconButton from '@/components/button/BrandIconButton';
import Table, { EllipsisText } from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrivacyRevealPopup from '@/components/popup/PrivacyRevealPopup';
import Tooltip from '@/components/tooltip/Tooltip';
import { formatNationalId } from '@/data/registrationForm';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import DeleteQueueConfirmPopup from '@/components/popup/DeleteQueueConfirmPopup';
import { MR_PATIENTS } from '@/data/mrPatients';
import {
  PATIENT_PROFILES,
  PENDING_REGISTRATION_NO_PHOTO,
  getPatientByHN,
} from '@/data/patientProfiles';
import { buildRegistrationSearchHistorySeed } from '@/data/primarySearchHistorySeeds';
import { NEW_USER_AVATAR } from '@/data/avatarAssets';
import QueuePatientAvatar from '@/components/patient/QueuePatientAvatar';

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

/* Tab strip — Figma Registration Dashboard 292:88376 (Tab Bar / Underline). */
const TABS = [
  { key: 'pending',   label: 'รอลงทะเบียน',          icon: 'schedule',      count: 0 },
  { key: 'progress',  label: 'กำลังลงทะเบียน',        icon: 'assignment',    count: 0 },
  { key: 'done',      label: 'ลงทะเบียนแล้ว',         icon: 'check_circle',  count: 0 },
  { key: 'draft',     label: 'ที่ร่างไว้',             icon: 'save',          count: 0 },
  { key: 'directory', label: 'รายชื่อผู้ป่วยทั้งหมด',  icon: 'group',         count: 0 },
];

/* Filter axes — Figma Register Home 331:147299:
   สถานะ · ประเภท · สถานะการเข้าใช้บริการ */
const FILTER_OPTIONS = {
  /* Active/Inactive patient flag — Figma annotation 275:44876 (guide). */
  status: [
    { value: 'all',      label: 'ทุกสถานะ'     },
    { value: 'active',   label: 'ยังคง Active'  },
    { value: 'inactive', label: 'ไม่ Active แล้ว' },
  ],
  type: [
    { value: 'all',          label: 'ทุกประเภท'              },
    { value: 'appointment',  label: 'นัดหมายล่วงหน้า'         },
    { value: 'walkin',       label: 'ไม่ได้นัดหมาย'            },
    { value: 'app',          label: 'ด้วยตนเองผ่าน Application' },
  ],
  /* Visit workflow — Figma annotation 331:149624–649 */
  visitStatus: [
    { value: 'all',      label: 'ทุกสถานะ'                         },
    { value: 'pending',  label: 'รอลงทะเบียน'                       },
    { value: 'progress', label: 'กำลังลงทะเบียน'                     },
    { value: 'done',     label: 'ลงทะเบียนสำเร็จ และรอซักประวัติ'   },
    { value: 'draft',    label: 'ที่ร่างไว้'                         },
  ],
};
const FILTER_DEFAULTS = {
  status: 'all',
  type: 'all',
  visitStatus: 'all',
};

/* การรับคิว — Figma Registration Dashboard cell values. */
const QUEUE_CHANNEL_OPTIONS = [
  'ผ่านตู้ Kiosk',
  'รับกับเจ้าหน้าที่',
  'กับเจ้าหน้าที่ ณ อนามัย',
];
const VISIT_TYPE_OPTIONS = [
  'นัดหมายล่วงหน้า',
  'ไม่ได้นัดหมาย',
  'ด้วยตนเองผ่าน Application',
];
const VISIT_TYPE_TO_FILTER = {
  'นัดหมายล่วงหน้า': 'appointment',
  'ไม่ได้นัดหมาย': 'walkin',
  'ด้วยตนเองผ่าน Application': 'app',
};

/* สถานะการเข้าใช้บริการ — Figma Registration Dashboard badges:
     ลงทะเบียนสำเร็จ และรอซักประวัติ (teal) · กำลังลงทะเบียน (blue) ·
     รอลงทะเบียน (orange). Annotation 331:149624–649. */
const STATUS_TO_BADGE = {
  done:       { tone: 'teal',   label: 'ลงทะเบียนสำเร็จ และรอซักประวัติ' },
  progress:   { tone: 'blue',   label: 'กำลังลงทะเบียน'  },
  pending:    { tone: 'orange', label: 'รอลงทะเบียน'    },
  draft:      { tone: 'grey',   label: 'ที่ร่างไว้'     },
  /* Legacy MR_PATIENTS keys → visit-status wording */
  active:     { tone: 'teal',   label: 'ลงทะเบียนสำเร็จ และรอซักประวัติ' },
  inactive:   { tone: 'orange', label: 'รอลงทะเบียน'    },
};

/* Default sort is ตามลำดับคิว (Figma annotation 43:6234) — status order
   only used when the user explicitly sorts the visit-status column. */
const STATUS_SORT_ORDER = {
  done: 0, progress: 1, pending: 2, draft: 3, active: 0, inactive: 2,
};

const StatusPill = ({ status }) => {
  const s = STATUS_TO_BADGE[status] || STATUS_TO_BADGE.pending;
  return (
    <ColorfulBadge style={s.tone} size='small' hierarchy='secondary'>
      {s.label}
    </ColorfulBadge>
  );
};

/* Table avatar size — Figma Register Home UserA / New User = 36px. */
const TABLE_AVATAR_SIZE = 36;

const MR_BY_HN = Object.fromEntries(MR_PATIENTS.map((p) => [p.hn, p]));

/* Queue pill — Figma PHCIS-Registration 199:9243 (teal ColorfulBadge). */
const renderQueue = (row) => (
  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
    {row.queue}
  </ColorfulBadge>
);

/* Name display — show given name (+ title) in full; mask only นามสกุล
   with `x` per character (e.g. "นายสมชาย มีสุข" → "นายสมชาย xxxx"). */
const formatNameSurnameMasked = (fullName) => {
  const s = String(fullName ?? '').trim();
  if (!s) return '';
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return s;
  const surname = parts[parts.length - 1];
  const given = parts.slice(0, -1).join(' ');
  return `${given} ${'x'.repeat(Math.max(surname.length, 1))}`;
};

/* Table column config — shared with EllipsisText fallback for unspecified cells.
   ผู้รับบริการใหม่ (New User avatar): ชื่อ / ประเภท / อายุ / เลขบัตร / โทรศัพท์ = "—"
   ผู้รับบริการเก่าในคิวรอลงทะเบียนมีข้อมูลครบ + รูปโปรไฟล์ */
const EMPTY_PENDING = '—';

/** Walk-in ใหม่ — New User avatar, no PII on the queue row yet. */
const isNewPatientRow = (row) => Boolean(row?.neverServed || row?.noProfilePhoto);

/** True walk-in with no identity on the queue row yet. */
const isUnregistered = (row) => isNewPatientRow(row) || (!row.hn && !row.name);

const renderName = (row) => {
  if (isNewPatientRow(row) || !row.name) {
    return (
      <div className='flex items-center gap-2 min-w-0 flex-1'>
        <QueuePatientAvatar newUser size={TABLE_AVATAR_SIZE} />
        <span className='truncate'>{EMPTY_PENDING}</span>
      </div>
    );
  }
  const profile = getPatientByHN(row.hn);
  const avatarUrl = profile?.avatarUrl;
  const avatarLabel = profile?.shortName ?? row.name;
  return (
    <div className='flex items-center gap-2 min-w-0 flex-1'>
      <QueuePatientAvatar
        name={avatarLabel}
        hn={row.hn}
        avatarUrl={avatarUrl}
        size={TABLE_AVATAR_SIZE}
      />
      <span className='truncate'>{formatNameSurnameMasked(row.name)}</span>
    </div>
  );
};

const renderHn = (row) => (
  <EllipsisText text={!row.hn ? EMPTY_PENDING : row.hn} />
);

const renderAge = (row) => (
  <EllipsisText text={isNewPatientRow(row) || !row.age ? EMPTY_PENDING : String(row.age)} />
);

const renderVisitType = (row) => (
  <EllipsisText text={isNewPatientRow(row) || !row.visitType ? EMPTY_PENDING : row.visitType} />
);

const renderStatus = (row) => <StatusPill status={row.status} />;

/* Privacy — queue roster display formats (Figma / preview spec). */
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

/* Action cell — โหมดตามสถานะ (Figma Registration Dashboard):
     · กำลังลงทะเบียน → Brand Icon quaternary
     · รอลงทะเบียน    → Brand Icon fill (default)
     · พักคิว (flag)  → แถวยังอยู่ลิสเดิม · ปุ่ม play คืนคิว · เรียกคิวปิดชั่วคราว
     · อื่นๆ           → disabled */
const actionModeForStatus = (status) => {
  if (status === 'progress') return 'quaternary';
  if (status === 'pending') return 'default';
  return 'disabled';
};

const makeRenderActions = ({ onCall, onPause, onCancel }) => function ActionsCell(row) {
  const mode = actionModeForStatus(row.status);
  const enabled = mode !== 'disabled';
  const isPaused = Boolean(row.paused);
  const canCall = enabled && !isPaused;
  const callVariant = mode === 'default' ? 'fill' : mode === 'quaternary' ? 'quaternary' : 'ghost';
  const pauseLabel = isPaused ? 'หยุดพักคิว' : 'พักคิว';
  return (
    <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
      <Tooltip content='เรียกคิว' position='top' disabled={!canCall}>
        <BrandIconButton
          icon='volume_up'
          size='sm'
          variant={callVariant}
          disabled={!canCall}
          aria-label='เรียกคิว'
          onClick={canCall
            ? (e) => { e.stopPropagation(); onCall?.(row); }
            : undefined}
        />
      </Tooltip>
      <Tooltip content={pauseLabel} position='top' disabled={!enabled}>
        <BrandIconButton
          icon={isPaused ? 'play_arrow' : 'pause'}
          size='sm'
          variant='quaternary'
          disabled={!enabled}
          aria-label={pauseLabel}
          onClick={enabled
            ? (e) => { e.stopPropagation(); onPause?.(row); }
            : undefined}
        />
      </Tooltip>
      <NeutralSubdueButton
        variant='outline'
        size='sm'
        disabled={!enabled}
        aria-label='ยกเลิกคิว'
        onClick={enabled
          ? (e) => { e.stopPropagation(); onCancel?.(row); }
          : undefined}
      >
        ยกเลิกคิว
      </NeutralSubdueButton>
    </div>
  );
};

/* Column config — Figma Registration Dashboard 292:88376 (queue tabs).
   Tab "รายชื่อผู้ป่วยทั้งหมด" (Register Home 331:147299) omits คิว +
   สถานะการเข้าใช้บริการ — patient directory, not today's visit queue.
   Actions column is bound later with page-level onCall / onPause / onCancel. */
const buildColumns = ({ renderPrivacyCell, isDirectory = false, onCall, onPause, onCancel }) => {
  const cols = [
    !isDirectory && { key: 'queue',        header: 'คิว',                    width: 80,  sortable: true, render: renderQueue },
    { key: 'hn',           header: 'HN',                     width: 96,  sortable: true, render: renderHn },
    { key: 'name',         header: 'ชื่อ-นามสกุล',            width: 220, sortable: true, render: renderName },
    { key: 'queueChannel', header: 'การรับคิว',               width: 160, sortable: true },
    { key: 'visitType',    header: 'ประเภท',                 width: 180, sortable: true, render: renderVisitType },
    { key: 'age',          header: 'อายุ (ปี)',               width: 96,  sortable: true, render: renderAge },
    { key: 'nationalId',   header: 'เลขบัตรประชาชน',          width: 180, sortable: true, render: renderPrivacyCell('nationalId') },
    { key: 'phone',        header: 'โทรศัพท์',               width: 128, sortable: true, render: renderPrivacyCell('phone') },
    !isDirectory && { key: 'status',       header: 'สถานะการเข้าใช้บริการ',    width: 240, sortable: true, render: renderStatus },
    { key: 'actions',      header: 'การดำเนินการ',           width: 220, render: makeRenderActions({ onCall, onPause, onCancel }) },
  ];
  return cols.filter(Boolean);
};

/* SubHeader action group — Figma Registration Dashboard:
   การนัดหมาย → เพิ่มคิว → อ่านบัตรสมาร์ทการ์ด.
   เพิ่มคิว lands on ข้อมูลผู้รับบริการ (/registration/register). */
const buildMrActions = ({ onAddQueue }) => (
  <>
    <AppointmentMenuButton />
    <BrandPrimaryButton onClick={onAddQueue}>เพิ่มคิว</BrandPrimaryButton>
    <BrandPrimaryButton leadingIcon='credit_card'>อ่านบัตรสมาร์ทการ์ด</BrandPrimaryButton>
  </>
);

const PAGE_SIZE = 20;

/* Demo distribution — ลงทะเบียนสำเร็จ 2 · กำลังลงทะเบียน 2 · รอลงทะเบียน … */
const seedRegistrationStatus = (i) => {
  if (i < 2) return 'done';
  if (i < 4) return 'progress';
  if (i < 16) return 'pending';
  if (i < 22) return 'draft';
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
   Most รอลงทะเบียน rows are ผู้รับบริการเก่า (full columns + profile photo).
   Exactly 4 walk-in ใหม่ (PENDING_REGISTRATION_NO_PHOTO) — ไม่เคยใช้บริการ,
   ไม่มี HN, ใช้ New User avatar (Figma DS 3891:7747). */
const buildRoster = () => {
  const rows = [];
  let pendingNoPhotoIdx = 0;
  for (let i = 0; i < 130; i += 1) {
    const status = seedRegistrationStatus(i);
    const usePendingNoPhoto = status === 'pending'
      && pendingNoPhotoIdx < PENDING_REGISTRATION_NO_PHOTO.length;
    const profile = usePendingNoPhoto
      ? PENDING_REGISTRATION_NO_PHOTO[pendingNoPhotoIdx++]
      : PATIENT_PROFILES[i % PATIENT_PROFILES.length];
    const neverServed = Boolean(usePendingNoPhoto || profile.neverServed);
    const mr = profile.hn ? MR_BY_HN[profile.hn] : null;
    const fallbackMr = MR_PATIENTS[i % MR_PATIENTS.length];
    rows.push({
      id: `MR-${String(i + 1).padStart(3, '0')}`,
      queue: `A${String(i + 1).padStart(3, '0')}`,
      hn: neverServed ? '' : profile.hn,
      /* New patients: dash columns + New User avatar (no PII yet). */
      name: neverServed ? '' : profile.fullName,
      age: neverServed ? '' : ageYearsOnly(profile.age),
      nationalId: neverServed ? '' : profile.nationalId,
      phone: neverServed ? '' : (mr?.phone ?? fallbackMr.phone),
      rights: neverServed
        ? (profile.rights || fallbackMr.rights)
        : (mr?.rights ?? fallbackMr.rights),
      queueChannel: QUEUE_CHANNEL_OPTIONS[i % QUEUE_CHANNEL_OPTIONS.length],
      visitType: neverServed ? '' : VISIT_TYPE_OPTIONS[i % VISIT_TYPE_OPTIONS.length],
      /* Active flag — Figma annotation 275:44876 (≤ 2 ปี since last visit). */
      patientStatus: neverServed ? 'inactive' : (i % 7 === 0 ? 'inactive' : 'active'),
      status,
      noProfilePhoto: neverServed,
      neverServed,
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
  const [activeTab, setActiveTab] = useState('pending');
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
    label: row.name || row.queue || 'รอลงทะเบียน',
    sublabel: isNewPatientRow(row)
      ? 'ผู้รับบริการใหม่'
      : (row.nationalId
        ? `เลขบัตร ${row.nationalId}`
        : (row.phone || '')),
    value: row.name || row.queue || '',
    badges: [
      { label: row.queue, tone: 'teal' },
      ...(row.hn ? [{ label: row.hn, tone: 'indigo' }] : []),
    ],
    avatarSrc: isNewPatientRow(row)
      ? null
      : getPatientByHN(row.hn)?.avatarUrl,
  });

  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const setFilter = (key) => (val) => setFilters((f) => ({ ...f, [key]: val }));

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
    /* ผู้รับบริการใหม่ — dash, not a revealable mask. */
    if (isNewPatientRow(row)) {
      return <EllipsisText text={EMPTY_PENDING} />;
    }
    const raw = field === 'nationalId' ? row.nationalId : row.phone;
    if (!raw) {
      return <EllipsisText text={EMPTY_PENDING} />;
    }
    const revealed = isPrivacyRevealed(row, field);
    let maskedText = '';
    let plainText = '';
    if (field === 'nationalId') {
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

  const isDirectoryTab = activeTab === 'directory';

  /* Cancel-queue confirmation — set when user clicks ยกเลิกคิว. */
  const [cancelCandidate, setCancelCandidate] = useState(null);
  const handleAskCancel = useCallback((row) => setCancelCandidate(row), []);
  const handleCloseCancel = useCallback(() => setCancelCandidate(null), []);
  const handleConfirmCancel = useCallback(() => {
    if (!cancelCandidate) return;
    setRows((prev) => prev.filter((r) => r.id !== cancelCandidate.id));
    setCancelCandidate(null);
  }, [cancelCandidate]);

  /* พักคิวชั่วคราว — แถวยังอยู่ลิสเดิม แค่สลับปุ่ม pause ↔ play. */
  const handlePause = useCallback((row) => {
    setRows((prev) => prev.map((r) => (
      r.id === row.id ? { ...r, paused: !r.paused } : r
    )));
  }, []);

  const tabsWithCounts = useMemo(() => {
    const counts = {
      pending: 0,
      progress: 0,
      done: 0,
      draft: 0,
      directory: rows.length,
    };
    for (const row of rows) {
      if (counts[row.status] !== undefined) counts[row.status] += 1;
    }
    return TABS.map((tab) => ({ ...tab, count: counts[tab.key] ?? 0 }));
  }, [rows]);

  const columns = useMemo(
    () => buildColumns({
      renderPrivacyCell,
      isDirectory: isDirectoryTab,
      onCall: () => {},
      onPause: handlePause,
      onCancel: handleAskCancel,
    }),
    [renderPrivacyCell, isDirectoryTab, handlePause, handleAskCancel],
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
      const src = directAvatar ?? (row && !row.noProfilePhoto
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
    /* Tab "รายชื่อผู้ป่วยทั้งหมด" shows the full directory (no visit-status filter). */
    if (activeTab !== 'directory') {
      r = r.filter((row) => row.status === activeTab);
    }
    if (filters.status !== 'all') {
      r = r.filter((row) => row.patientStatus === filters.status);
    }
    if (filters.type !== 'all') {
      r = r.filter((row) => VISIT_TYPE_TO_FILTER[row.visitType] === filters.type);
    }
    if (filters.visitStatus !== 'all') {
      r = r.filter((row) => row.status === filters.visitStatus);
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
  }, [rows, activeTab, searchQ, filters.status, filters.type, filters.visitStatus, editMode]);

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
    /* Default ordering — ตามลำดับคิว (Figma annotation 43:6234). */
    const sign = direction === 'desc' ? -1 : 1;
    const queueCompare = (a, b) => String(a.queue ?? '').localeCompare(String(b.queue ?? ''), 'th', { numeric: true });
    if (!key) return filtered.slice().sort(queueCompare);
    const copy = filtered.slice();
    copy.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const primary = key === 'status'
        ? (STATUS_SORT_ORDER[av] ?? 99) - (STATUS_SORT_ORDER[bv] ?? 99)
        : key === 'age'
          ? (Number(av) || 0) - (Number(bv) || 0)
          : String(av ?? '').localeCompare(String(bv ?? ''), 'th', { numeric: true });
      if (primary !== 0) return sign * primary;
      return queueCompare(a, b);
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
    /* ผู้รับบริการเก่า / มี HN — prefill ฟอร์ม; walk-in ใหม่เปิดฟอร์มว่าง */
    if (isUnregistered(row) || !row.hn) {
      history.push({
        pathname: '/registration/register',
        state: { queue: row.queue },
      });
      return;
    }
    history.push({
      pathname: '/registration/register',
      state: { hn: row.hn, queue: row.queue },
    });
  };

  /* Pagination ellipsis logic is now owned by <Pagination /> from
     @/components/pagination — caller only passes currentPage / pageCount. */

  return (
    <>
    <DeleteQueueConfirmPopup
      open={!!cancelCandidate}
      onClose={handleCloseCancel}
      onConfirm={handleConfirmCancel}
      title='ยืนยันการยกเลิกคิว'
      subtitle='คิวนี้จะถูกนำออกจากรายการ และไม่สามารถย้อนกลับได้'
      queue={cancelCandidate?.queue}
      hn={cancelCandidate?.hn || EMPTY_PENDING}
      patientName={cancelCandidate?.name || EMPTY_PENDING}
      avatarSrc={
        !cancelCandidate
          ? undefined
          : (cancelCandidate.noProfilePhoto || isUnregistered(cancelCandidate)
            ? NEW_USER_AVATAR
            : (getPatientByHN(cancelCandidate.hn)?.avatarUrl || NEW_USER_AVATAR))
      }
    />
    <QueuePageShell
      activeKey='registration'
      breadcrumb={breadcrumb}
      title='ระบบงานเวชระเบียน'
      actions={buildMrActions({
        onAddQueue: () => history.push('/registration/register'),
      })}
      summaryCards={SUMMARY_CARDS}
      tabs={tabsWithCounts}
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
                  placeholder='ค้นหา HN / เลขบัตร / ชื่อ-สกุล / โทรศัพท์'
                  width={640}
                />
              </div>

              {/* Action bar — filter chips on the left, secondary actions on the right */}
              <div
                className='flex items-start w-full'
                style={{ gap: 'var(--dim-space-300)' }}
              >
                <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
                  <FilterDropdown prefix='สถานะ :' options={FILTER_OPTIONS.status} value={filters.status} onChange={setFilter('status')} />
                  <FilterDropdown prefix='ประเภท :' options={FILTER_OPTIONS.type} value={filters.type} onChange={setFilter('type')} />
                  <FilterDropdown
                    prefix='สถานะการเข้าใช้บริการ :'
                    options={FILTER_OPTIONS.visitStatus}
                    value={filters.visitStatus}
                    onChange={setFilter('visitStatus')}
                  />
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
                    onClick={() => history.push('/registration/register')}
                  >
                    เพิ่มผู้รับบริการใหม่
                  </BrandSubdueButton>
                </div>
              </div>

              {/* Patient table — queue tabs pin คิว / HN / ชื่อ; directory
                  tab omits คิว so sticky pins HN / ชื่อ only. */}
              <Table
                columns={columns}
                rows={visibleRows}
                rowKey={(row) => row.id}
                sortConfig={sortConfig}
                onSort={editMode ? undefined : handleSort}
                onRowClick={editMode ? undefined : handleRowClick}
                stickyColCount={isDirectoryTab ? 2 : 3}
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
            : PRIVACY_FIELD_LABELS.nationalId
        }
        onClose={() => setPrivacyRevealRequest(null)}
        onConfirm={handlePrivacyRevealConfirm}
      />
    </QueuePageShell>
    </>
  );
};

export default RegistrationQueuePage;
