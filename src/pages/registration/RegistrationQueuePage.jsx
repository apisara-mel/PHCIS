import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
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
import Icon from '@/components/icons/Icon';
import { formatNationalId } from '@/data/registrationForm';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import Popover from '@/components/popup/Popover';
import SuccessToast from '@/components/toast/SuccessToast';
import DeleteQueueConfirmPopup from '@/components/popup/DeleteQueueConfirmPopup';
import { MR_PATIENTS, findMrPatientByHn, lifeStatusLabel } from '@/data/mrPatients';
import { MOBILE_PUSH_LOG, pushArrivalConfirmation } from '@/data/registrationVisits';
import QueueTicketPrintPopup from './QueueTicketPrintPopup';
import PatientCardPrintPopup, { buildOpdCardFromMr } from './PatientCardPrintPopup';
import {
  getPatientByHN,
} from '@/data/patientProfiles';
import { buildRegistrationSearchHistorySeed } from '@/data/primarySearchHistorySeeds';
import { NEW_USER_AVATAR } from '@/data/avatarAssets';
import QueuePatientAvatar from '@/components/patient/QueuePatientAvatar';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import {
  buildRegistrationQueueRoster,
  REGISTRATION_QUEUE_ROWS,
} from '@/data/registrationQueue';

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
  /* TOR 1.1.1.2 — สถานะการมีชีวิต */
  life: [
    { value: 'all',      label: 'ทั้งหมด'   },
    { value: 'alive',    label: 'มีชีวิตอยู่' },
    { value: 'deceased', label: 'เสียชีวิต'  },
  ],
};
const FILTER_DEFAULTS = {
  status: 'all',
  type: 'all',
  visitStatus: 'all',
  life: 'all',
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

/* Name display — worklist masking (3 ตัวแรก + 3 ตัวท้าย) via MaskedWorklistName. */
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
      <MaskedWorklistName
        name={row.name}
        recordKey={row.hn || row.id}
        className='truncate min-w-0 flex-1'
      />
      {/* TOR 1.1.1.2 — dark-grey StatusBadge on deceased rows (directory + queue) */}
      {row.lifeStatus === 'deceased' && (
        <StatusBadge style='neutral' size='small' showDot>
          เสียชีวิต
        </StatusBadge>
      )}
    </div>
  );
};

const renderHn = (row) => (
  <EllipsisText text={!row.hn ? EMPTY_PENDING : row.hn} />
);

const renderAge = (row) => (
  <EllipsisText text={isNewPatientRow(row) || !row.age ? EMPTY_PENDING : String(row.age)} />
);

/* TOR §1.1.1.2 — dedicated สถานะชีวิต column (directory + queue). */
const renderLifeStatus = (row) => {
  const status = row.lifeStatus || 'alive';
  return (
    <StatusBadge style={status === 'deceased' ? 'neutral' : 'success'} size='small' showDot>
      {lifeStatusLabel(status)}
    </StatusBadge>
  );
};

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

/* TOR 1.1.1.3 + §1.4.2 — Passport เป็นเอกสารระบุตัวตนเช่นเดียวกับเลขบัตร
   ประชาชน จึงต้อง mask ทุกที่ที่แสดงนอกหน้าทะเบียน (รวม sublabel ของ
   suggestion list ที่ค้นเจอด้วย Passport). */
const formatPassportMasked = (passportNo) => {
  const s = String(passportNo ?? '').trim();
  if (s.length < 4) return s;
  return `${s.slice(0, 2)}${'x'.repeat(Math.max(s.length - 4, 1))}${s.slice(-2)}`;
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

const makeRenderActions = ({ onCall, onPause, onCancel, onMore }) => function ActionsCell(row) {
  const mode = actionModeForStatus(row.status);
  /* TOR 1.1.1.2 — แถวผู้เสียชีวิต: ปิดเรียกคิว/พักคิว (และเปิด Visit ผ่านเมนู) */
  const deceased = row.lifeStatus === 'deceased';
  const enabled = mode !== 'disabled' && !deceased;
  const isPaused = Boolean(row.paused);
  const canCall = enabled && !isPaused;
  const callVariant = mode === 'default' ? 'fill' : mode === 'quaternary' ? 'quaternary' : 'ghost';
  const pauseLabel = isPaused ? 'หยุดพักคิว' : 'พักคิว';
  return (
    <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
      <Tooltip
        content={deceased ? 'ผู้รับบริการเสียชีวิต — เรียกคิวไม่ได้' : 'เรียกคิว'}
        position='top'
        disabled={!canCall && !deceased}
      >
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
        disabled={mode === 'disabled'}
        aria-label='ยกเลิกคิว'
        onClick={mode !== 'disabled'
          ? (e) => { e.stopPropagation(); onCancel?.(row); }
          : undefined}
      >
        ยกเลิกคิว
      </NeutralSubdueButton>
      {/* Row overflow — ส่งตรวจ · พิมพ์บัตรคิว (Kiosk ขัดข้อง) · ยืนยันการมา ·
          พิมพ์บัตรผู้รับบริการ (TOR 1.1.1.9 / 1.1.1.10 / 1.1.2.2) */}
      <Tooltip content='ตัวเลือกเพิ่มเติม' position='top'>
        <BrandIconButton
          icon='more_vert'
          size='sm'
          variant='quaternary'
          aria-label='ตัวเลือกเพิ่มเติม'
          onClick={(e) => {
            e.stopPropagation();
            onMore?.(row, e.currentTarget);
          }}
        />
      </Tooltip>
    </div>
  );
};

/* Column config — Figma Registration Dashboard 292:88376 (queue tabs).
   Tab "รายชื่อผู้ป่วยทั้งหมด" (Register Home 331:147299) omits คิว +
   สถานะการเข้าใช้บริการ — patient directory, not today's visit queue.
   Actions column is bound later with page-level onCall / onPause / onCancel. */
const buildColumns = ({ renderPrivacyCell, isDirectory = false, onCall, onPause, onCancel, onMore }) => {
  const cols = [
    !isDirectory && { key: 'queue',        header: 'คิว',  sortable: true, render: renderQueue },
    { key: 'hn',           header: 'HN',  sortable: true, render: renderHn },
    { key: 'name',         header: 'ชื่อ-นามสกุล', sortable: true, render: renderName },
    { key: 'queueChannel', header: 'การรับคิว', sortable: true },
    { key: 'visitType',    header: 'ประเภท', sortable: true, render: renderVisitType },
    { key: 'age',          header: 'อายุ (ปี)',  sortable: true, render: renderAge },
    { key: 'nationalId',   header: 'เลขบัตรประชาชน', sortable: true, render: renderPrivacyCell('nationalId') },
    { key: 'phone',        header: 'โทรศัพท์', sortable: true, render: renderPrivacyCell('phone') },
    { key: 'lifeStatus',   header: 'สถานะชีวิต', sortable: true, render: renderLifeStatus },
    !isDirectory && { key: 'status',       header: 'สถานะการเข้าใช้บริการ', sortable: true, render: renderStatus },
    { key: 'actions',      header: 'การดำเนินการ', render: makeRenderActions({ onCall, onPause, onCancel, onMore }) },
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

/* Page-scoped localStorage key — keeps Registration's recent-search list
   separate from the OPD / Treatment queues. */
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:registration-queue';

/* Demo recent-search — Figma PHCIS-OPD 290:48930 (MR id + HN pills). */
const REGISTRATION_SEARCH_HISTORY_SEED = buildRegistrationSearchHistorySeed(
  REGISTRATION_QUEUE_ROWS.slice(0, 4),
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
    /* TOR 1.1.1.3 — sublabel surfaces every search axis: เลขบัตร ·
       Passport · โทรศัพท์ so a passport/phone hit is legible in the list.
       §1.4.2 — ค่าที่แสดงถูก mask เหมือนคอลัมน์ในตาราง (การเปิดเผยค่าเต็ม
       ต้องผ่าน PrivacyRevealPopup ที่แถวของตารางเท่านั้น). */
    sublabel: isNewPatientRow(row)
      ? 'ผู้รับบริการใหม่'
      : [
        row.nationalId ? `เลขบัตร ${formatNationalIdMasked(row.nationalId)}` : '',
        row.passportNo ? `Passport ${formatPassportMasked(row.passportNo)}` : '',
        row.phone ? `โทร ${formatPhoneMasked(row.phone)}` : '',
      ].filter(Boolean).join(' · '),
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
  const [rows, setRows] = useState(() => buildRegistrationQueueRoster());

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

  /* ── Row overflow menu — ส่งตรวจ / พิมพ์บัตรคิว / ยืนยันการมา / OPD Card ── */
  const [rowMenu, setRowMenu] = useState(null); /* { row } — anchor kept in a ref */
  const rowMenuAnchorRef = React.useRef(null);
  const handleOpenRowMenu = useCallback((row, anchorEl) => {
    rowMenuAnchorRef.current = anchorEl;
    setRowMenu((prev) => (prev?.row?.id === row.id ? null : { row }));
  }, []);
  const closeRowMenu = useCallback(() => setRowMenu(null), []);

  /* TOR 1.1.1.9 — พิมพ์บัตรคิวสำรอง (Kiosk ขัดข้อง) */
  const [ticketRow, setTicketRow] = useState(null);
  /* TOR 1.1.1.10 — OPD Card จาก directory row */
  const [opdCard, setOpdCard] = useState(null);
  /* TOR 1.1.2.2 — mock mobile push + log popover */
  const [pushLogVersion, setPushLogVersion] = useState(0);
  const [pushLogOpen, setPushLogOpen] = useState(false);
  const pushLogAnchorRef = React.useRef(null);
  const [successToast, setSuccessToast] = useState('');

  const handleConfirmArrival = useCallback((row) => {
    pushArrivalConfirmation({
      hn: row.hn,
      patientName: row.name,
      queue: row.queue,
      message: 'ยืนยันการมาตามนัดหมายวันนี้',
    });
    setPushLogVersion((v) => v + 1);
    setSuccessToast('ส่งการแจ้งเตือนยืนยันการมาตามนัดผ่าน Mobile Application แล้ว');
  }, []);

  const handleOpenVisit = useCallback((row) => {
    history.push({
      pathname: '/registration/visit',
      state: { hn: row.hn, queue: row.queue },
    });
  }, [history]);

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
      onMore: handleOpenRowMenu,
    }),
    [renderPrivacyCell, isDirectoryTab, handlePause, handleAskCancel, handleOpenRowMenu],
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
      [row.queue, row.id, row.hn, row.name, row.nationalId, row.passportNo, row.phone]
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
    /* TOR 1.1.1.2 — filter สถานะชีวิต */
    if (filters.life !== 'all') {
      r = r.filter((row) => (row.lifeStatus || 'alive') === filters.life);
    }
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      const qDigits = q.replace(/\D/g, '');
      r = r.filter((row) =>
        (row.queue && row.queue.toLowerCase().includes(q)) ||
        row.hn.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        (row.phone && row.phone.toLowerCase().includes(q)) ||
        /* TOR 1.1.1.3 — passport axis */
        (row.passportNo && row.passportNo.toLowerCase().includes(q)) ||
        (qDigits && row.nationalId
          && row.nationalId.replace(/\D/g, '').includes(qDigits)),
      );
    }
    return r;
  }, [rows, activeTab, searchQ, filters.status, filters.type, filters.visitStatus, filters.life, editMode]);

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
                      .filter((row) => [row.queue, row.id, row.hn, row.name, row.nationalId, row.passportNo, row.phone]
                        .some((f) => f && String(f).toLowerCase().includes(q)))
                      .slice(0, 8)
                      .map(registrationRowToSearchItem);
                  })()}
                  history={searchHistory}
                  onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                  avatars={searchAvatars}
                  placeholder='ค้นหา HN / เลขบัตร / Passport / ชื่อ-สกุล / โทรศัพท์'
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
                  <FilterDropdown
                    prefix='สถานะชีวิต :'
                    options={FILTER_OPTIONS.life}
                    value={filters.life}
                    onChange={setFilter('life')}
                  />
                </OverflowFlexRow>
                <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
                  {/* TOR 1.1.2.2 — mock mobile-app notification log */}
                  <span ref={pushLogAnchorRef} className='inline-flex'>
                    <NeutralSubdueButton
                      leadingIcon='notifications'
                      collapseLabelBelow='lg'
                      accessibilityLabel='การแจ้งเตือน Mobile App'
                      onClick={() => setPushLogOpen((o) => !o)}
                    >
                      {`แจ้งเตือน App (${MOBILE_PUSH_LOG.length})`}
                    </NeutralSubdueButton>
                  </span>
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
                stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                emptyMessage='ไม่พบผู้รับบริการ'
              />

              {/* ค้นหาไม่พบ — CTA เพิ่มผู้รับบริการใหม่ (edge case 1.1.1.3) */}
              {sorted.length === 0 && (
                <div
                  className='w-full flex flex-col items-center'
                  style={{ gap: 'var(--dim-space-200)', paddingTop: 'var(--dim-space-200)', paddingBottom: 'var(--dim-space-200)' }}
                >
                  <span style={{
                    color: 'var(--text-content-tertiary)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm)',
                  }}>
                    {searchQ.trim()
                      ? `ไม่พบผู้รับบริการที่ตรงกับ "${searchQ.trim()}"`
                      : 'ไม่มีรายการในมุมมองนี้'}
                  </span>
                  <BrandSubdueButton
                    variant='outline'
                    size='sm'
                    leadingIcon='person_add'
                    onClick={() => history.push('/registration/register')}
                  >
                    เพิ่มผู้รับบริการใหม่
                  </BrandSubdueButton>
                </div>
              )}

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

      {/* Row overflow menu — anchored Popover */}
      <Popover
        open={!!rowMenu}
        onClose={closeRowMenu}
        anchorRef={rowMenuAnchorRef}
        style={{ zIndex: 1600 }}
      >
        {rowMenu && (
          <div
            className='flex flex-col'
            style={{
              minWidth: 260,
              background: 'var(--surface-card-100, #FFFFFF)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
              boxShadow: 'var(--shadow-drop-bottom-400)',
              paddingTop: 'var(--dim-space-100, 4px)',
              paddingBottom: 'var(--dim-space-100, 4px)',
            }}
          >
            {[
              {
                key: 'visit',
                label: 'ส่งตรวจ (เปิด Visit)',
                icon: 'stethoscope',
                disabled: !rowMenu.row.hn || rowMenu.row.lifeStatus === 'deceased',
                hint: rowMenu.row.lifeStatus === 'deceased'
                  ? 'ผู้รับบริการเสียชีวิต — เปิด Visit ไม่ได้'
                  : (!rowMenu.row.hn ? 'ต้องลงทะเบียนก่อน' : ''),
                onClick: () => { closeRowMenu(); handleOpenVisit(rowMenu.row); },
              },
              {
                key: 'ticket',
                label: 'พิมพ์บัตรคิว (Kiosk ขัดข้อง)',
                icon: 'print',
                disabled: false,
                hint: '',
                onClick: () => { closeRowMenu(); setTicketRow(rowMenu.row); },
              },
              ...(rowMenu.row.visitType === 'นัดหมายล่วงหน้า' ? [{
                key: 'arrival',
                label: 'ยืนยันการมา (แจ้งเตือนผ่าน App)',
                icon: 'notifications_active',
                disabled: rowMenu.row.lifeStatus === 'deceased',
                hint: 'Mock — ไม่มี push จริง',
                onClick: () => { closeRowMenu(); handleConfirmArrival(rowMenu.row); },
              }] : []),
              ...(rowMenu.row.hn ? [{
                key: 'opd-card',
                label: 'พิมพ์บัตรผู้รับบริการ (OPD Card)',
                icon: 'badge',
                disabled: false,
                hint: '',
                onClick: () => {
                  closeRowMenu();
                  setOpdCard(buildOpdCardFromMr(findMrPatientByHn(rowMenu.row.hn)) || null);
                },
              }] : []),
            ].map((item) => (
              <button
                key={item.key}
                type='button'
                disabled={item.disabled}
                onClick={item.disabled ? undefined : item.onClick}
                className='flex items-center w-full text-left'
                style={{
                  gap: 'var(--dim-space-200, 8px)',
                  paddingTop: 'var(--dim-space-200, 8px)',
                  paddingBottom: 'var(--dim-space-200, 8px)',
                  paddingLeft: 'var(--dim-space-300, 12px)',
                  paddingRight: 'var(--dim-space-300, 12px)',
                  background: 'transparent',
                  border: 'none',
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  opacity: item.disabled ? 0.45 : 1,
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  color: 'var(--text-content-default, #363B3F)',
                }}
              >
                <Icon name={item.icon} size={18} />
                <span className='flex-1 min-w-0'>
                  {item.label}
                  {item.hint && (
                    <span style={{
                      display: 'block',
                      fontSize: 'var(--type-size-xs, 12px)',
                      color: 'var(--text-content-tertiary, #858C92)',
                    }}>
                      {item.hint}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </Popover>

      {/* TOR 1.1.2.2 — mock mobile-app push log */}
      <Popover
        open={pushLogOpen}
        onClose={() => setPushLogOpen(false)}
        anchorRef={pushLogAnchorRef}
        style={{ zIndex: 1600 }}
      >
        <div
          key={pushLogVersion}
          className='flex flex-col'
          style={{
            width: 360,
            maxHeight: 420,
            overflowY: 'auto',
            background: 'var(--surface-card-100, #FFFFFF)',
            borderRadius: 'var(--dim-radius-300, 10px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
            boxShadow: 'var(--shadow-drop-bottom-400)',
            padding: 'var(--dim-space-300, 12px)',
            gap: 'var(--dim-space-200, 8px)',
          }}
        >
          <span style={{
            fontFamily: 'var(--type-family-heading-content)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
            color: 'var(--text-content-default, #363B3F)',
          }}>
            การแจ้งเตือนผ่าน Mobile Application (จำลอง)
          </span>
          {MOBILE_PUSH_LOG.length === 0 ? (
            <span style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              color: 'var(--text-content-tertiary, #858C92)',
            }}>
              ยังไม่มีการแจ้งเตือน
            </span>
          ) : MOBILE_PUSH_LOG.map((entry) => (
            <div
              key={entry.id}
              className='flex flex-col'
              style={{
                gap: 2,
                paddingTop: 'var(--dim-space-200, 8px)',
                paddingBottom: 'var(--dim-space-200, 8px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
                borderRadius: 'var(--dim-radius-200, 8px)',
                background: 'var(--surface-neutral-quaternary, #F9FBFB)',
              }}
            >
              <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{entry.queue || '—'}</ColorfulBadge>
                <span style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  fontWeight: 'var(--type-weight-medium, 500)',
                  color: 'var(--text-content-default, #363B3F)',
                }}>
                  {entry.patientName || entry.hn}
                </span>
                <div className='flex-1' />
                <span style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs, 12px)',
                  color: 'var(--text-content-tertiary, #858C92)',
                }}>
                  {entry.sentAt}
                </span>
              </div>
              <span style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs, 12px)',
                color: 'var(--text-content-secondary, #636B72)',
              }}>
                {entry.message} · ช่องทาง: {entry.channel}
              </span>
            </div>
          ))}
        </div>
      </Popover>

      {/* TOR 1.1.1.9 — บัตรคิวสำรอง */}
      <QueueTicketPrintPopup
        open={!!ticketRow}
        onClose={() => setTicketRow(null)}
        row={ticketRow}
      />

      {/* TOR 1.1.1.10 — OPD Card จาก directory */}
      <PatientCardPrintPopup
        open={!!opdCard}
        onClose={() => setOpdCard(null)}
        card={opdCard}
      />

      <SuccessToast
        open={!!successToast}
        message={successToast}
        onClose={() => setSuccessToast('')}
      />
    </QueuePageShell>
    </>
  );
};

export default RegistrationQueuePage;
