import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import FilterDateTag from '@/components/forms/FilterDateTag';
import Table, { EllipsisText } from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralButton from '@/components/button/NeutralButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import AlertDialog from '@/components/popup/AlertDialog';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import SuccessToast from '@/components/toast/SuccessToast';
import PersonalDataConsentEditPopup from '@/components/forms/PersonalDataConsentEditPopup';
import ConsentIdentityVerifyPopup from '@/components/popup/ConsentIdentityVerifyPopup';
import { useClinicFilter } from '@/components/layout/HeaderClinicContext';
import { formatServiceCenterChannel, MOBILE_APP_CHANNEL } from '@/data/consentChannels';
import {
  CONSENT_TABS, buildConsentSummary, matchesConsentWorklistTab,
  CONSENT_STATUS, CONSENT_CONFIRM,
} from '@/data/consentRecords';
import {
  applySupersededTypesToRecords,
  cancelConsentRequest,
  getConsentRecords,
  isTypeSuperseded,
  listSupersededTypes,
  patchConsentRecord,
  setConsentRecords,
  subscribeConsentStore,
} from '@/data/consentWorkflowStore';
import {
  CONSENT_PATIENT_SEARCH_POOL,
  consentPatientSearchHistorySeed,
  toConsentPatientSearchItem,
} from '@/data/consentPatientSearch';
import {
  ExportFormatPopup,
  buildWorklistExportReport,
} from '@/pages/consent/consentExportPopup';
import {
  canExportConsent,
  canManageConsent,
  canRevokeConsent,
} from '@/data/consentPermissions';
import {
  ReconsentPopup, PaperConsentRecordPopup,
  STAFF_NAME, todayThai,
} from '@/pages/consent/consentWorkflowPopups';
import CONSENT_NAV from '@/pages/consent/consentNav';
import QueuePatientAvatar from '@/components/patient/QueuePatientAvatar';
import { enrichConsentRow, resolveConsentPatient, resolveConsentPatientCard } from '@/data/consentPatientDisplay';
import { MR_PATIENTS } from '@/data/mrPatients';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import Icon from '@/components/icons/Icon';
import { matchesDateFilter } from '@/data/financePaymentPrototype';
/* ConsentHistoryPopup / ConsentComparePopup ไม่ได้ mount ที่นี่แล้ว — ทั้งสอง
   มุมมองถูกยุบเข้าไปเป็นแท็บใน ConsentConsentedFormsPopup (13 ส.ค. 2569)
   ตัว popup เดิมยังอยู่ในโค้ดเบสสำหรับหน้า /consent/history */
import ConsentConsentedFormsPopup from '@/pages/consent/ConsentConsentedFormsPopup';
import ConsentRequestFormsPopup, { pendingConsentCardsFor } from '@/pages/consent/ConsentRequestFormsPopup';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';

/* PHCIS | Consent — ระบบจัดการความยินยอม (Figma node 1:4).
   Consent registry: summary cards · tabs · search · filters · table with a
   STATUS-DEPENDENT action column (annotation 277:65195 — "แต่ละ Status, CTA
   ใน Column การดำเนินการจะต่างกัน"), the Consent History popup (299:86535),
   and per-action confirm AlertDialogs (277:84661 …).

   All values alias design.md tokens; UI copy is Thai; data is local mock. */

const PAGE_SIZE = 20;
const breadcrumb = ['จัดการความยินยอม'];

/* แท็บที่ tab กรองสถานะอยู่แล้ว — ซ่อน filter chip "สถานะ" */
const STATUS_FILTER_HIDDEN_TABS = new Set(['pending', 'sent', 'consented', 'rejected', 'expiring', 'expired']);
/* ไม่มีแท็บที่ซ่อน filter ทั้งหมด — คง Set ว่างไว้ให้ onTabChange ใช้ได้ */
const FILTERS_HIDDEN_TABS = new Set();

/* แท็บ 'all' = "ผู้รับบริการทั้งหมด" — 1 แถว = 1 คน (แท็บอื่น 1 แถว = 1 ฉบับ) */
const PATIENT_TAB = 'all';

/* ค่าพิเศษของ dropdown สถานะในแท็บผู้รับบริการ — ขึ้นต้นด้วย __ ให้ชนกับชื่อ
   สถานะจริงใน CONSENT_STATUS ไม่ได้ */
const NEVER_CONSENTED_FILTER = '__never__';

/* ป้ายสรุปในแถวผู้รับบริการ — เรียงตาม "ต้องลงมือก่อน" ไม่ใช่ลำดับแท็บ
   tone ตรงกับ CONSENT_STATUS เดิม เพื่อให้สีของสถานะเดียวกันไม่เปลี่ยนความหมาย
   ข้ามแท็บ · bucket ไม่ทับกัน (ยอดรวมทั้ง 6 = จำนวนฉบับของคนนั้นพอดี) */
const PATIENT_BUCKETS = [
  { tab: 'pending',   label: 'รอดำเนินการ',      tone: 'red'    },
  { tab: 'sent',      label: 'รอลงนาม',          tone: 'orange' },
  { tab: 'expiring',  label: 'ใกล้หมดอายุ',       tone: 'yellow' },
  { tab: 'expired',   label: 'หมดอายุ',          tone: 'red'    },
  { tab: 'consented', label: 'ยินยอมแล้ว',        tone: 'green'  },
  { tab: 'rejected',  label: 'ปฏิเสธ / เพิกถอน',  tone: 'grey'   },
];

/* ทะเบียนผู้รับบริการทั้งระบบ = MPI (`MR_PATIENTS`, 100 ราย) ไม่ใช่รายชื่อที่
   ยุบจาก consent record — คนที่ยังไม่เคยมีคำขอความยินยอมเลยต้องอยู่ในตารางด้วย
   (นั่นคือกลุ่มที่เจ้าหน้าที่ต้องตามไปขอความยินยอม) · ชื่อ/รูปดึงผ่าน resolver
   ตัวเดียวกับ worklist เพื่อให้คนเดียวกันหน้าตาเหมือนกันทุกแท็บ */
const PATIENT_DIRECTORY = MR_PATIENTS.map((mr) => {
  const { name, avatarUrl } = resolveConsentPatient(mr.hn);
  return { id: mr.hn, hn: mr.hn, name, avatarUrl };
});

const TEXT_CELL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};
const MUTED_CELL = { ...TEXT_CELL, color: 'var(--text-content-tertiary)' };

const REVOKE_IMPACT_NOTES = [
  'มีผลทันทีหลังพิสูจน์ตัวตนเจ้าของข้อมูลและดำเนินการเสร็จ',
  'ประวัติการให้ความยินยอมยังคงอยู่ในระบบ (read-only)',
  'ต้องสร้างคำขอความยินยอมใหม่หากต้องใช้สิทธิอีกครั้ง',
];

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/** "2 มีนาคม 2569" → sort key (CE ms); invalid → 0 */
const thaiDateSortKey = (raw) => {
  const s = String(raw || '').trim();
  if (!s || s === '-') return 0;
  const monthIdx = THAI_MONTHS.findIndex((m) => s.includes(m));
  const yearMatch = s.match(/(25\d{2}|20\d{2})/);
  const dayMatch = s.match(/^(\d{1,2})\s/);
  if (monthIdx < 0 || !yearMatch || !dayMatch) return 0;
  let year = Number(yearMatch[1]);
  if (year >= 2400) year -= 543;
  return new Date(year, monthIdx, Number(dayMatch[1])).getTime() || 0;
};

const Cell = ({ value }) =>
  value && value !== '-'
    ? <span style={TEXT_CELL}>{value}</span>
    : <span style={MUTED_CELL}>-</span>;

export default function ConsentManagementPage() {
  const history = useHistory();
  const { clinic } = useClinicFilter() || {};
  const serviceCenterChannel = formatServiceCenterChannel(clinic);
  /* ── Worklist rows เป็น state จริง (mock mutate ใน session) ──────────
     ด.1.1.5: record ที่เซ็นเทมเพลตซึ่งถูกเผยแพร่เวอร์ชันใหม่ไปแล้ว (store
     ข้ามหน้า) → ฉบับเดิม «ถูกแทนที่» · คำขอใหม่ «รอลงนาม» ในแท็บรอลงนาม. */
  const loadRows = () => applySupersededTypesToRecords(new Set(listSupersededTypes()))
    .map(enrichConsentRow);
  const [rows, setRows] = useState(loadRows);
  useEffect(() => subscribeConsentStore(() => setRows(loadRows())), []);
  const canManage = canManageConsent();
  const canRevoke = canRevokeConsent();
  const [activeTab, setActiveTab] = useState('pending');
  /* ประกาศไว้ต้น ๆ เพราะทั้ง statusOptions / filtered / patientRows ใช้ร่วมกัน */
  const isPatientTab = activeTab === PATIENT_TAB;
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState({ quick: 'thisyear' });
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'createdDate', direction: 'asc' });
  const [dialog, setDialog] = useState(null);      // { record, confirmKey }
  /* ── Workflow popups (ด.1.1.7 / ด.1.1.8 / ด.1.1.1 / ด.1.1.2) ── */
  /* null | { hn, name, record, allForPatient } — popup เดียวที่รวม
     แบบฟอร์มทั้งหมด / เปรียบเทียบ / Timeline ไว้เป็นแท็บ */
  const [viewConsentedFor, setViewConsentedFor] = useState(null);
  /* null | patient row — popup เลือกแบบฟอร์มที่ยังไม่ขอความยินยอมของคนนั้น */
  const [requestFormsFor, setRequestFormsFor] = useState(null);
  const [reconsentFor, setReconsentFor] = useState(null);        // record
  const [paperFor, setPaperFor] = useState(null);                // record
  const [editFor, setEditFor] = useState(null);                  // signed record → PersonalDataConsentEditPopup
  /* Identity gate — { next: 'revoke'|'paper'|'edit', record } */
  const [verifyFor, setVerifyFor] = useState(null);
  const [toast, setToast] = useState(null);
  const [exportReport, setExportReport] = useState(null);
  const [exportDone, setExportDone] = useState(false);
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:consent', {
      seedIfEmpty: consentPatientSearchHistorySeed(4),
    });

  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set();
    return rows
      .filter((r) => {
        if (!r?.hn || seen.has(r.hn)) return false;
        const hay = `${r.hn} ${r.name} ${r.formName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
        seen.add(r.hn);
        return true;
      })
      .slice(0, 8)
      .map((r) => {
        const pool = CONSENT_PATIENT_SEARCH_POOL.find((p) => p.hn === r.hn);
        return pool
          ? toConsentPatientSearchItem(pool)
          : {
            id: r.hn,
            label: r.name,
            value: r.name,
            sublabel: r.formName || undefined,
            badges: [{ label: r.hn, tone: 'indigo' }],
          };
      });
  }, [search, rows]);

  /* ── Tabs with live counts (ทั้งระบบ) · Summary = เดือนนี้เท่านั้น ──
     สองกลุ่ม คั่นด้วยเส้นแบ่ง (`groupStart`):
       กลุ่ม 1 — worklist ตามสถานะความยินยอม (รอดำเนินการ … หมดอายุ)
                 1 แถว = 1 ฉบับ · ตอบ "งานที่ต้องทำอยู่ตรงไหน" · เรียงตามวันที่
       กลุ่ม 2 — ผู้รับบริการทั้งหมด: 1 แถว = 1 คน · ทะเบียนไว้ค้นรายคน · เรียงตาม HN
     count จึงคนละหน่วยกัน — กลุ่มซ้ายนับ "ฉบับ" กลุ่มขวานับ "คน" (HN ไม่ซ้ำ)
     แยก label ที่นี่ ไม่แก้ CONSENT_TABS เพราะ TelemedConsentPage ใช้ชุดเดียวกัน */
  const tabs = useMemo(() => CONSENT_TABS.map((t) => ({
    key: t.value,
    label: t.value === PATIENT_TAB ? 'ผู้รับบริการทั้งหมด' : t.label,
    icon: t.icon,
    groupStart: t.value === PATIENT_TAB,
    count: t.value === PATIENT_TAB
      ? PATIENT_DIRECTORY.length
      : rows.filter((r) => matchesConsentWorklistTab(r, t.value)).length})), [rows]);

  const summaryCards = useMemo(() => buildConsentSummary(rows), [rows]);

  const channelOptions = useMemo(() => {
    const channels = [...new Set(rows.map((r) => r.signChannel).filter((c) => c && c !== '-'))];
    channels.sort((a, b) => {
      if (a === MOBILE_APP_CHANNEL) return -1;
      if (b === MOBILE_APP_CHANNEL) return 1;
      return a.localeCompare(b, 'th');
    });
    return [
      { value: '', label: 'ทุกช่องทาง' },
      ...channels.map((c) => ({ value: c, label: c })),
    ];
  }, [rows]);
  /* แท็บผู้รับบริการมีตัวเลือกพิเศษที่ไม่ใช่ "สถานะของฉบับ" — คนที่ยังไม่มีฉบับ
     ใดเลยจึงไม่มีสถานะให้กรอง ต้องกรองที่ระดับคน (ดู patientRows ข้อ 4)
     เป็นกลุ่มที่เจ้าหน้าที่ต้องตามไปขอความยินยอม จึงควรกดดูได้ในคลิกเดียว
     แทนที่จะต้องไล่หน้าจนเจอ (เรียงตาม HN แล้วอยู่หน้า 3 เป็นต้นไป) */
  const statusOptions = useMemo(() => [
    { value: '', label: 'ทุกสถานะ' },
    ...(isPatientTab ? [{ value: NEVER_CONSENTED_FILTER, label: 'ไม่เคยให้ความยินยอม' }] : []),
    ...Object.keys(CONSENT_STATUS).map((s) => ({ value: s, label: s })),
  ], [isPatientTab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    /* ตัวเลือก "ไม่เคยให้ความยินยอม" ไม่ใช่สถานะของ record — ข้ามที่ชั้นนี้
       ไม่งั้นจะกรองจนไม่เหลือฉบับไหนเลย แล้วตารางว่างทั้งหน้า */
    const recordStatus = filterStatus === NEVER_CONSENTED_FILTER ? '' : filterStatus;
    return rows.filter((r) => {
      return (
        matchesConsentWorklistTab(r, activeTab) &&
        (!filterChannel || r.signChannel === filterChannel) &&
        (!recordStatus || r.status === recordStatus) &&
        matchesDateFilter(r.createdDate, filterDate) &&
        (!q || r.name.toLowerCase().includes(q) || r.hn.toLowerCase().includes(q))
      );
    });
  }, [rows, activeTab, search, filterChannel, filterStatus, filterDate]);

  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }
  ));

  const sorted = useMemo(() => {
    const { key, direction } = sortConfig;
    const sign = direction === 'desc' ? -1 : 1;
    const copy = filtered.slice();
    if (!key) {
      return copy.sort((a, b) => thaiDateSortKey(a.createdDate) - thaiDateSortKey(b.createdDate) || a.id - b.id);
    }
    const isDateKey = key === 'createdDate' || key === 'signedDate' || key === 'withdrawnDate';
    const isNumKey = key === 'expiresInDays';
    copy.sort((a, b) => {
      let primary;
      if (isDateKey) {
        const aEmpty = !a[key] || a[key] === '-';
        const bEmpty = !b[key] || b[key] === '-';
        /* วันที่ว่าง (-) อยู่ท้ายเสมอ — ไม่ให้บังแถวที่มีค่าจริง */
        if (aEmpty && bEmpty) primary = 0;
        else if (aEmpty) primary = 1;
        else if (bEmpty) primary = -1;
        else primary = sign * (thaiDateSortKey(a[key]) - thaiDateSortKey(b[key]));
        return primary !== 0 ? primary : a.id - b.id;
      }
      if (isNumKey) {
        primary = Number(a[key] ?? Infinity) - Number(b[key] ?? Infinity);
      } else if (key === 'hn') {
        primary = String(a.hn ?? '').localeCompare(String(b.hn ?? ''), 'th', { numeric: true });
      } else {
        primary = String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'th');
      }
      return primary !== 0 ? sign * primary : a.id - b.id;
    });
    return copy;
  }, [filtered, sortConfig]);

  /* ── แท็บผู้รับบริการ: ยุบ record หลายฉบับของ HN เดียวกันเป็นแถวเดียว ──
     ตัวกรองระดับฉบับ (ช่องทาง / สถานะ / วันที่) ใช้คัดว่า "ใครโผล่ในตาราง"
     ส่วนยอด/ป้ายสรุปนับจากทั้งแฟ้มของคนนั้นเสมอ (ดูข้อ 1 ด้านล่าง) */
  const patientRows = useMemo(() => {
    if (!isPatientTab) return [];
    /* 1) ยอด/ป้ายสรุปนับจาก "ทุกฉบับของคนนั้น" ไม่ใช่เฉพาะที่ผ่านตัวกรอง —
       แถวนี้เป็นแฟ้มของคน ๆ หนึ่ง และ popup ที่กดเข้าไปก็กางทั้งแฟ้มเหมือนกัน
       ถ้านับคนละชุด ตัวเลขหน้าตารางกับในป็อปอัปจะไม่ตรงกัน (6 vs 7)
       ตัวกรองยังทำงาน — แต่ทำหน้าที่คัด "ใครโผล่ในตาราง" เท่านั้น (ข้อ 3) */
    const byHn = new Map();
    rows.forEach((r) => {
      let p = byHn.get(r.hn);
      if (!p) {
        p = {
          total: 0, buckets: {}, lastActivity: '-', lastActivityKey: 0,
          lastChannel: '-', latestSigned: null, latestSignedKey: 0,
          guardian: r.guardian,
          /* ทั้งแฟ้มของคนนี้ — ใช้หา "ใบที่ยังไม่ขอความยินยอม" (popup กรอก
             แบบฟอร์ม) และรายการที่ลงนามแล้ว (ปุ่มเพิกถอนระดับคน) */
          records: [], signedRecords: [],
        };
        byHn.set(r.hn, p);
      }
      p.total += 1;
      p.records.push(r);
      if (r.status === 'ยินยอมแล้ว') p.signedRecords.push(r);

      /* ล่าสุด = วันที่ใหม่สุดในบรรดา สร้าง / ลงนาม / ถอน ของทุกฉบับของคนนี้ */
      [r.createdDate, r.signedDate, r.withdrawnDate].forEach((d) => {
        const k = thaiDateSortKey(d);
        if (k > p.lastActivityKey) {
          p.lastActivityKey = k;
          p.lastActivity = d;
          p.lastChannel = (r.signChannel && r.signChannel !== '-')
            ? r.signChannel
            : (r.requestChannel || (r.autoSent ? 'เวชระเบียน' : '-'));
        }
      });

      /* ฉบับที่ลงนามล่าสุด — ใช้เป็นเป้าของปุ่ม "ดูแบบฟอร์มที่ให้ความยินยอม" */
      if (r.status === 'ยินยอมแล้ว') {
        const k = thaiDateSortKey(r.signedDate);
        if (!p.latestSigned || k >= p.latestSignedKey) {
          p.latestSigned = r;
          p.latestSignedKey = k;
        }
      }
    });

    /* 1.1) ป้ายสรุปในคอลัมน์ "สถานะความยินยอม" = สถานะ **ล่าสุดของแต่ละ
       แบบฟอร์ม** ไม่ใช่ทุกฉบับในแฟ้ม — แบบฟอร์มใบหนึ่งอาจเคยปฏิเสธแล้วมา
       ยินยอมทีหลัง ถ้านับทุกฉบับ คนคนเดียวจะขึ้นทั้ง "ปฏิเสธ 1" และ
       "ยินยอมแล้ว 1" พร้อมกัน ทั้งที่สถานะจริงตอนนี้คือยินยอมแล้ว
       จับกลุ่มด้วยรหัสแบบฟอร์ม (fallback ชื่อฟอร์ม → หัวข้อหลัก) แล้วเลือกฉบับ
       ที่เคลื่อนไหวล่าสุด (วันที่ใหม่สุด · เท่ากันใช้ id ที่มากกว่า = สร้างทีหลัง)
       ผลข้างเคียงที่ตั้งใจ: ผลรวมป้าย ≤ "จำนวนความยินยอม" (ยอดฉบับทั้งแฟ้ม
       ที่ต้องตรงกับ popup) — ป้ายนับ "แบบฟอร์ม" ส่วนยอดนับ "ฉบับ" */
    const formKeyOf = (r) => r.formCode || r.formName || r.type || String(r.id);
    const recencyOf = (r) => Math.max(
      thaiDateSortKey(r.createdDate),
      thaiDateSortKey(r.signedDate),
      thaiDateSortKey(r.withdrawnDate),
    );
    byHn.forEach((p) => {
      const latestByForm = new Map();
      p.records.forEach((r) => {
        const k = formKeyOf(r);
        const prev = latestByForm.get(k);
        if (!prev
          || recencyOf(r) > recencyOf(prev)
          || (recencyOf(r) === recencyOf(prev) && (r.id || 0) >= (prev.id || 0))) {
          latestByForm.set(k, r);
        }
      });
      p.buckets = {};
      latestByForm.forEach((r) => {
        const bucket = PATIENT_BUCKETS.find((b) => matchesConsentWorklistTab(r, b.tab));
        if (bucket) p.buckets[bucket.tab] = (p.buckets[bucket.tab] || 0) + 1;
      });
    });

    /* 2) HN ที่มีอย่างน้อย 1 ฉบับผ่านตัวกรองปัจจุบัน — ใช้คัดว่าใครโผล่ในตาราง
          (ตัวกรองคัดคน ไม่ได้ตัดยอดของคน) */
    const passesFilter = new Set(filtered.map((r) => r.hn));
    const filterNarrows = filtered.length !== rows.length;

    /* 3) กางทะเบียนทั้ง 100 ราย แล้วค่อยติดยอด — คนที่ไม่มีฉบับเลยยังอยู่ในตาราง */
    const q = search.trim().toLowerCase();
    /* 4) ตัวเลือก "ไม่เคยให้ความยินยอม" กรองที่ระดับคน ไม่ใช่ระดับฉบับ */
    const onlyNever = filterStatus === NEVER_CONSENTED_FILTER;
    return PATIENT_DIRECTORY
      .filter((p) => (onlyNever ? !byHn.has(p.hn) : true))
      .filter((p) => !filterNarrows || passesFilter.has(p.hn) || !byHn.has(p.hn))
      .filter((p) => !q
        || String(p.name).toLowerCase().includes(q)
        || String(p.hn).toLowerCase().includes(q))
      .map((p) => {
        const agg = byHn.get(p.hn) || null;
        return {
          ...p,
          total: 0, buckets: {}, lastActivity: '-', lastActivityKey: 0,
          lastChannel: '-', latestSigned: null, latestSignedKey: 0,
          records: [], signedRecords: [],
          ...agg,
          /* จำนวนใบใน 3 หัวข้อหลักที่ยังไม่เคยมีคำขอเลย — ใช้เปิด/ปิดปุ่ม
             "กรอกแบบฟอร์มความยินยอม" โดยไม่ต้องเปิด popup มาดูว่าว่างเปล่า */
          pendingFormCount: pendingConsentCardsFor(agg?.records || []).length,
          /* ยอดนับจากทั้งแฟ้มอยู่แล้ว — everTotal จึงเท่ากับ total เสมอ
             เก็บไว้ให้คอลัมน์สถานะแยก "ไม่เคยให้ความยินยอม" ออกจากศูนย์อื่น ๆ */
          everTotal: agg?.total || 0,
        };
      });
  }, [filtered, rows, search, isPatientTab, filterStatus]);

  const sortedPatients = useMemo(() => {
    const { key, direction } = sortConfig;
    const sign = direction === 'desc' ? -1 : 1;
    const byHn = (a, b) => String(a.hn).localeCompare(String(b.hn), 'th', { numeric: true });
    const copy = patientRows.slice();
    copy.sort((a, b) => {
      let primary;
      if (key === 'total') primary = a.total - b.total;
      else if (key === 'lastActivity') primary = a.lastActivityKey - b.lastActivityKey;
      else if (key === 'name') primary = String(a.name ?? '').localeCompare(String(b.name ?? ''), 'th');
      else primary = byHn(a, b);
      return primary !== 0 ? sign * primary : byHn(a, b);
    });
    return copy;
  }, [patientRows, sortConfig]);

  const displayRows = isPatientTab ? sortedPatients : sorted;
  const totalPages = Math.max(1, Math.ceil(displayRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = displayRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = displayRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, displayRows.length);
  /* ยอด "จากทั้งหมด" ต้องเป็นหน่วยเดียวกับแถว — คน (ทั้งทะเบียน) หรือ ฉบับ */
  const displayTotal = isPatientTab ? PATIENT_DIRECTORY.length : rows.length;
  const hideStatusFilter = STATUS_FILTER_HIDDEN_TABS.has(activeTab);
  const hideFilters = FILTERS_HIDDEN_TABS.has(activeTab);

  const isAllFilters = !filterChannel
    && (!filterStatus || hideStatusFilter)
    && (!filterDate || filterDate.quick === 'thisyear');
  const filtersActive = !isAllFilters || search.trim() !== '';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(filtersActive, () => {
    setFilterChannel('');
    setFilterStatus('');
    setFilterDate({ quick: 'thisyear' });
    setSearch('');
    setPage(1);
  });

  const handleSubmit = (value, item) => {
    const q = (item?.value || item?.label || value || '').trim();
    if (q) pushHistory(item?.badges ? item : { label: q, value: q });
    setSearch(q); setPage(1);
  };

  /* ── Mock mutations (session-only — ไม่ persist) ────────────────── */
  const patchRow = (id, patch) => patchConsentRecord(id, patch);
  const nextId = () => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
  const pushToast = (message, variant = 'success') =>
    setToast({ id: Date.now(), variant, message });

  /* Re-Consent (ด.1.1.7): อัปเดตแถวเดิม → «รอลงนาม» แล้วไปแท็บรอลงนาม */
  const runReconsent = (record, { channel, dueDate, latestVersion }) => {
    const prevStatus = record.status === 'หมดอายุ-Reconsent' ? 'หมดอายุ' : record.status;
    const next = getConsentRecords().map((r) => (
      r.id !== record.id
        ? r
        : {
            ...r,
            status: 'รอลงนาม',
            version: latestVersion || r.version,
            signChannel: '-',
            requestChannel: channel,
            requester: STAFF_NAME,
            createdDate: todayThai(),
            signedDate: '-',
            withdrawnDate: '-',
            dueDate,
            pendingReconsent: false,
            history: [
              ...(r.history || []),
              {
                date: todayThai(),
                action: 'สร้างคำขอ',
                fromStatus: prevStatus,
                toStatus: 'รอลงนาม',
                formCode: r.formCode,
                formName: r.formName,
                type: r.type,
                version: latestVersion || r.version,
                channel,
                status: 'รอลงนาม',
              },
            ],
          }
    ));
    setConsentRecords(next);
    setActiveTab('sent');
    setPage(1);
    pushToast(`สร้างคำขอ ReConsent ของ ${record.name} แล้ว`);
  };

  /* ด.1.1.1 — ผ่านการพิสูจน์ตัวตนแล้วค่อยปล่อย action ที่ทำแทนเจ้าของข้อมูล */
  const handleVerified = (audit) => {
    const v = verifyFor;
    setVerifyFor(null);
    if (!v) return;
    if (v.next === 'revoke') {
      const auditNote = audit
        ? ` (พิสูจน์ตัวตนโดย ${audit.method === 'otp' ? 'OTP' : 'เอกสาร'} · ${audit.verifiedAt})`
        : '';
      patchRow(v.record.id, { status: 'ถอนความยินยอม', withdrawnDate: todayThai() });
      pushToast(`เพิกถอนความยินยอมของ ${v.record.name} แล้ว${auditNote}`);
      return;
    }
    if (v.next === 'paper') setPaperFor(v.record);
    else if (v.next === 'edit') setEditFor(v.record);
  };

  /* ── Status-dependent action column ───────────────────────────────
     `showView` ปิดได้เมื่อเอาไปใช้ในตารางของ popup "แบบฟอร์มความยินยอมทั้งหมด"
     — ที่นั่นกดแถวก็เปิดเอกสารอยู่แล้ว ปุ่ม 👁 ซ้ำจะกลายเป็นทางที่สองที่ทำ
     อย่างเดียวกัน · ส่วน CTA ตามสถานะยังใช้ dialog/verify ชุดเดียวกับหน้าหลัก */
  const renderAction = (row, { showView = true, align = 'end' } = {}) => {
    const action = (CONSENT_STATUS[row.status] || {}).action;
    const fireAction = () => {
      if (!action) return;
      if (action.confirm === 'revoke' && !canRevoke) return;
      if (action.confirm === 'revoke') {
        setDialog({ record: row, confirmKey: 'revoke' });
        return;
      }
      if (action.confirm === 'reconsent') setReconsentFor(row);
      else setDialog({ record: row, confirmKey: action.confirm });
    };
    return (
      <div
        /* worklist หลักชิดขวา (คอลัมน์สุดท้ายติดขอบตาราง) ส่วนในตารางของ popup
           ชิดซ้าย — ปุ่มอยู่ใกล้คอลัมน์สถานะที่เป็นตัวกำหนดว่าปุ่มไหนขึ้น */
        className={`flex items-center ${align === 'start' ? 'justify-start' : 'justify-end'}`}
        /* ทั้งแถวกดเพื่อเปิดเอกสารได้ — ปุ่มในคอลัมน์นี้ต้องไม่ยิง onRowClick ตาม
           ไม่งั้นกด "เพิกถอน" แล้วเปิดหน้าเอกสารซ้อนขึ้นมาพร้อม dialog ยืนยัน */
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role='presentation'
        style={{
          /* 8px ระหว่างกลุ่มไอคอนกับ CTA — มากกว่าระยะในกลุ่ม (6px) นิดเดียว
             พอให้อ่านเป็นสองกลุ่ม แต่ไม่ห่างจนดูเป็นคนละคอลัมน์ (เดิม 16px) */
          gap: 'var(--dim-space-200, 8px)',
          paddingRight: align === 'start' ? undefined : 'var(--dim-space-400, 16px)',
        }}
      >
        {/* ต้องไม่ render กล่องนี้เมื่อไม่มีไอคอนสักปุ่ม — div เปล่ากว้าง 0 ก็จริง
            แต่ `gap` ของ flex แม่ยังนับมันเป็นลูกอยู่ CTA เลยถูกดันขวาไป 16px
            แถวที่ไม่มีไอคอนจึงไม่ชิดซ้ายเท่าแถวที่มี (เห็นชัดในตารางของ popup) */}
        {(showView || row.status === 'ยินยอมแล้ว') && (
          <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
            {/* แท็บสถานะ = 1 แถว 1 ฉบับ → เหลือเฉพาะ action ระดับฉบับ
                เปรียบเทียบ (compare_arrows) และ Timeline การเปลี่ยนแปลง (history)
                เป็นมุมมองระดับ "คน" ไม่ใช่ระดับฉบับ — ย้ายไปอยู่แท็บ
                ผู้รับบริการทั้งหมด ที่ 1 แถว = 1 คน แทน (renderPatientAction) */}
            {showView && (
              <NeutralSubdueIconButton
                icon='visibility'
                variant='outline'
                size='sm'
                aria-label='ดูแบบฟอร์มที่ให้ความยินยอม'
                title='ดูแบบฟอร์มที่ให้ความยินยอม'
                onClick={() => setViewConsentedFor({ hn: row.hn, name: row.name, record: row })}
              />
            )}
            {/* ด.1.1.2 — แถว signed แก้ไข/เพิกถอนรายข้อ 5.1/5.2 (ผ่าน verify) */}
            {row.status === 'ยินยอมแล้ว' && (
              <NeutralSubdueIconButton
                icon='edit'
                variant='outline'
                size='sm'
                aria-label='แก้ไขความยินยอมรายข้อ'
                title='แก้ไขความยินยอม (5.1 / 5.2)'
                onClick={() => setVerifyFor({ next: 'edit', record: row })}
              />
            )}
          </div>
        )}
        {action && (
          action.kind === 'brand' ? (
            <BrandSubdueButton variant='fill' size='sm' onClick={fireAction}>
              {action.label}
            </BrandSubdueButton>
          ) : action.kind === 'brandSubdue' ? (
            <BrandSubdueButton variant='outline' size='sm' onClick={fireAction}>
              {action.label}
            </BrandSubdueButton>
          ) : action.kind === 'subdued' ? (
            <NeutralSubdueButton variant='outline' size='sm' onClick={fireAction}>
              {action.label}
            </NeutralSubdueButton>
          ) : (
            <NeutralButton variant='outline' size='sm' onClick={fireAction}>
              {action.label}
            </NeutralButton>
          )
        )}
      </div>
    );
  };

  /* กรอกแบบฟอร์มความยินยอม (แท็บผู้รับบริการทั้งหมด) — 1 แถว = 1 คน จึงยังไม่รู้
     ว่าใบไหน ต้องเลือกใน popup ก่อน แล้วค่อยพาไปหน้ากรอกเอกสารจริง
     (หน้าเดียวกับ Step 1 ของการลงทะเบียน) แล้วเด้งกลับมาที่ worklist */
  const openConsentFill = (patient, formId) => {
    setRequestFormsFor(null);
    history.push({
      pathname: `/registration/consent/${formId}`,
      state: {
        patient: { hn: patient.hn },
        /* เจาะจงคนแล้ว — ห้ามให้ร่างการลงทะเบียนที่ค้างอยู่มาทับชื่อ/เลขบัตร */
        preferPatientHint: true,
        returnTo: '/consent',
      },
    });
  };

  /* เพิกถอนระดับคน — คนหนึ่งอาจมีหลายฉบับที่ลงนามแล้ว
       1 ฉบับ  → เข้า dialog ยืนยัน + พิสูจน์ตัวตน ชุดเดียวกับแท็บสถานะทันที
       >1 ฉบับ → เปิด popup รวมทุกฉบับให้เลือกก่อนว่าจะเพิกถอนใบไหน
                 (คอลัมน์การดำเนินการใน popup ใช้ renderAction ตัวเดียวกัน) */
  const startPatientRevoke = (p) => {
    const signed = p.signedRecords || [];
    if (!canRevoke || signed.length === 0) return;
    if (signed.length === 1) {
      setDialog({ record: signed[0], confirmKey: 'revoke' });
      return;
    }
    setViewConsentedFor({ hn: p.hn, name: p.name, record: null, allForPatient: true });
    pushToast(`${p.name} มี ${signed.length} ฉบับที่ยินยอมแล้ว — เลือกฉบับที่ต้องการเพิกถอนจากรายการ`);
  };

  /* แถวผู้รับบริการไม่มี "สถานะเดียว" จึงไม่มี CTA ตามสถานะ — เหลือปุ่มระดับคน
     ชุดเดียวกับแท็บอื่นเพื่อไม่ให้ไอคอนเดิมเปลี่ยนความหมาย */
  const renderPatientAction = (p) => (
    <div
      className='flex items-center justify-end'
      style={{ gap: 'var(--dim-space-200)', paddingRight: 'var(--dim-space-400, 16px)' }}
      /* ทั้งแถวกดเพื่อเปิดแฟ้มของคนนี้ — ปุ่มในคอลัมน์นี้ต้องไม่ยิง onRowClick ตาม
         ไม่งั้นกด "เพิกถอน" แล้ว popup แฟ้มจะเปิดซ้อนขึ้นมาพร้อม dialog ยืนยัน */
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role='presentation'
    >
      {/* แถวนี้เป็น "คน" ไม่ใช่ "ฉบับ" — ปุ่มเดียวเปิด popup ที่รวมทั้ง 3 มุมมอง
          ของคนคนนั้นไว้เป็นแท็บ (แบบฟอร์มทั้งหมด · เปรียบเทียบให้/ไม่ให้ ·
          Timeline การเปลี่ยนแปลง) เดิมเป็น 3 ไอคอน → 3 popup แยก */}
      <NeutralSubdueIconButton
        icon='visibility'
        variant='outline'
        size='sm'
        disabled={!p.everTotal}
        aria-label='ดูความยินยอมของผู้รับบริการรายนี้'
        title={p.everTotal
          ? `ดูความยินยอม — แบบฟอร์มทั้งหมด (${p.everTotal} ฉบับ) · เปรียบเทียบ · Timeline`
          : 'ยังไม่มีแบบฟอร์มความยินยอม'}
        onClick={() => p.everTotal
          && setViewConsentedFor({ hn: p.hn, name: p.name, record: null, allForPatient: true })}
      />

      {/* ขอความยินยอมใบที่ยังไม่เคยขอ — ครบทั้ง 3 หัวข้อแล้วไม่ต้องแสดงอะไรเลย
          (ไม่ใช่ปุ่มจาง ๆ ที่กดไม่ได้) คอลัมน์นี้แสดงเฉพาะงานที่ยังทำได้จริง
          ใบที่หมดอายุ/ถูกถอนเป็นงานของ Re-Consent ในแท็บสถานะ ไม่ใช่ที่นี่ */}
      {canManage && !!p.pendingFormCount && (
        <BrandSubdueButton
          variant='fill'
          size='sm'
          leadingIcon='edit_document'
          /* ป้ายในตารางย่อเหลือ "กรอกแบบฟอร์ม" ให้คอลัมน์ไม่กินความกว้าง —
             ชื่อเต็มอยู่บนหัว popup ที่เปิดขึ้นมาแล้ว (คำสั่ง user 14 ส.ค.) */
          title={`ยังไม่ขอความยินยอม ${p.pendingFormCount} แบบฟอร์ม`}
          onClick={() => setRequestFormsFor(p)}
        >
          กรอกแบบฟอร์ม
        </BrandSubdueButton>
      )}

      {/* ด.1.1.2 / ด.1.1.1 — เพิกถอนเฉพาะคนที่มีฉบับ "ยินยอมแล้ว" อยู่จริง
          (ปุ่มไม่ขึ้นเลยเมื่อไม่มี — ไม่ใช่ขึ้นแล้ว disabled ตามแท็บสถานะ) */}
      {canRevoke && (p.signedRecords || []).length > 0 && (
        <BrandSubdueButton
          variant='outline'
          size='sm'
          title={(p.signedRecords || []).length === 1
            ? `เพิกถอน — ${p.signedRecords[0].formName || p.signedRecords[0].formCode || 'ฉบับที่ยินยอมแล้ว'}`
            : `มี ${p.signedRecords.length} ฉบับที่ยินยอมแล้ว — เลือกฉบับที่จะเพิกถอน`}
          onClick={() => startPatientRevoke(p)}
        >
          เพิกถอน
        </BrandSubdueButton>
      )}
    </div>
  );

  const columns = useMemo(() => {
    const colCreatedDate = {
      key: 'createdDate',
      header: 'วันที่สร้างคำขอ/Reconsent',
      sortable: true,
      render: (r) => <Cell value={r.createdDate} />,
    };
    const colSignedDate = {
      key: 'signedDate',
      header: 'วันที่ลงนาม',
      sortable: true,
      render: (r) => <Cell value={r.signedDate} />,
    };
    const colHn = { key: 'hn', header: 'HN', sortable: true, render: (r) => <Cell value={r.hn} /> };
    const colName = {
      key: 'name', header: 'ชื่อ-นามสกุล', sortable: true,
      render: (r) => (
        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
          <QueuePatientAvatar
            hn={r.hn}
            name={r.name}
            avatarUrl={r.avatarUrl}
            size={36}
          />
          <div className='flex flex-col min-w-0'>
            <MaskedWorklistName
              name={r.name}
              recordKey={r.hn || r.id}
              className='truncate'
              style={TEXT_CELL}
            />
            {r.guardian && (
              <span className='truncate' style={{ ...MUTED_CELL, fontSize: 'var(--type-size-xs)' }}>
                ผู้แทน:{' '}
                <MaskedWorklistName
                  name={r.guardian}
                  recordKey={`${r.hn || r.id}:guardian`}
                  fieldLabel='ชื่อผู้แทน'
                  className='inline truncate'
                  truncate={false}
                />
              </span>
            )}
          </div>
        </div>
      ),
    };
    const mid = [
      {
        key: 'formName', header: 'ชื่อแบบฟอร์ม', flex: true, minWidth: 420, sortable: true,
        render: (r) => (
          <div className='min-w-0 w-full' style={{ ...TEXT_CELL, lineHeight: 1.75, overflow: 'visible' }}>
            <EllipsisText text={r.formName || '-'} />
          </div>
        ),
      },
      {
        key: 'version', header: 'เวอร์ชั่น',
        render: (r) => <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{r.version}</ColorfulBadge>,
      },
      {
        key: 'status', header: 'สถานะ', sortable: true,
        render: (r) => {
          const subtextLineStyle = {
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            lineHeight: 1.4,
            width: '100%',
          };
          return (
          <div className='flex flex-col items-start w-full min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
            <ColorfulBadge style={(CONSENT_STATUS[r.status] || {}).tone || 'grey'} size='small' hierarchy='secondary' width='hug'>
              {(CONSENT_STATUS[r.status] || {}).label || r.status}
            </ColorfulBadge>
            {r.dueDate && r.status === 'รอลงนาม' && (
              <span style={subtextLineStyle}>
                ครบกำหนด {r.dueDate}
              </span>
            )}
            {r.autoSent && r.status === 'รอลงนาม' && (
              <div className='flex flex-col w-full min-w-0'>
                <span style={subtextLineStyle}>
                  ส่งอัตโนมัติ
                </span>
                <span style={subtextLineStyle}>
                  รอเซ็นที่เวชระเบียน
                </span>
              </div>
            )}
            {(r.status === 'ถูกแทนที่ด้วยเวอร์ชันใหม่' || r.status === 'มีเวอร์ชันใหม่') && r.supersededById && (
              <span style={subtextLineStyle}>
                คำขอใหม่ #{r.supersededById}
              </span>
            )}
            {r.revokeRequestedDate && r.status === 'ขอเพิกถอน' && (
              <div className='flex flex-col w-full min-w-0'>
                <span style={subtextLineStyle}>
                  ขอเพิกถอน {r.revokeRequestedDate}
                </span>
                {r.revokeRequestChannel && (
                  <span style={subtextLineStyle}>
                    {r.revokeRequestChannel}
                  </span>
                )}
              </div>
            )}
          </div>
          );
        },
      },
      {
        key: 'signChannel', header: 'ช่องทางที่ลงนาม', render: (r) => (
          <span
            className='block whitespace-nowrap'
            style={{
              color: 'var(--text-content-default)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.5,
            }}
          >
            {r.signChannel && r.signChannel !== '-'
              ? r.signChannel
              : r.requestChannel || (r.autoSent ? 'เวชระเบียน' : 'Mobile App')}
          </span>
        ),
      },
      { key: 'requester', header: 'ผู้สร้างคำขอ', render: (r) => <Cell value={r.requester} /> },
    ];
    const colWithdrawn = {
      key: 'withdrawnDate',
      header: 'วันที่ถอนความยินยอม',
      sortable: true,
      render: (r) => <Cell value={r.withdrawnDate} />,
    };
    const colExpiresInDays = {
      key: 'expiresInDays',
      header: 'จำนวนวันที่เหลือ',
      sortable: true,
      render: (r) => (
        <span
          style={{
            color: 'var(--text-danger-default, #B91C1C)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-medium)',
            lineHeight: 1.5,
          }}
        >
          {r.expiresInDays != null ? `${r.expiresInDays} วัน` : '-'}
        </span>
      ),
    };
    const colAction = { key: 'action', header: 'การดำเนินการ', render: renderAction };

    /* ── ผู้รับบริการทั้งหมด — 1 แถว = 1 คน ────────────────────────────
       คอลัมน์ตอบคำถามของทะเบียน: คนนี้เป็นใคร · มีความยินยอมกี่ฉบับ ·
       สภาพรวมเป็นยังไง · ขยับล่าสุดเมื่อไร — ไม่ใช่รายละเอียดของฉบับใดฉบับหนึ่ง */
    if (activeTab === PATIENT_TAB) {
      return [
        colHn,
        colName,
        {
          key: 'total', header: 'จำนวนความยินยอม', sortable: true,
          render: (p) => (
            <span
              className='whitespace-nowrap'
              style={{ ...(p.total ? TEXT_CELL : MUTED_CELL), fontVariantNumeric: 'tabular-nums' }}
            >
              {p.total} ฉบับ
            </span>
          ),
        },
        {
          key: 'buckets', header: 'สถานะความยินยอม', flex: true, minWidth: 420,
          render: (p) => {
            const shown = PATIENT_BUCKETS.filter((b) => p.buckets[b.tab]);
            if (shown.length) {
              return (
                <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
                  {shown.map((b) => (
                    <ColorfulBadge key={b.tab} style={b.tone} size='small' hierarchy='secondary' width='hug'>
                      {`${b.label} ${p.buckets[b.tab]}`}
                    </ColorfulBadge>
                  ))}
                </div>
              );
            }
            /* ยอดนับจากทั้งแฟ้ม ยอด 0 จึงมีความหมายเดียว = ไม่เคยมีคำขอเลย
               (กลุ่มที่เจ้าหน้าที่ต้องตามไปขอความยินยอม) */
            return (
              <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>
                ไม่เคยให้ความยินยอม
              </ColorfulBadge>
            );
          },
        },
        {
          key: 'lastChannel', header: 'ช่องทางล่าสุด',
          render: (p) => (
            <span className='block whitespace-nowrap' style={TEXT_CELL}>
              {p.lastChannel && p.lastChannel !== '-' ? p.lastChannel : <span style={MUTED_CELL}>-</span>}
            </span>
          ),
        },
        {
          key: 'lastActivity', header: 'เคลื่อนไหวล่าสุด', sortable: true,
          render: (p) => <Cell value={p.lastActivity} />,
        },
        { key: 'action', header: 'การดำเนินการ', render: renderPatientAction },
      ];
    }

    /* ยินยอมแล้ว: วันที่ลงนามขึ้นก่อน · วันที่สร้างอยู่หลังผู้สร้างคำขอ */
    if (activeTab === 'consented') {
      return [colSignedDate, colHn, colName, ...mid, colCreatedDate, colWithdrawn, colAction];
    }
    /* ปฏิเสธ / เพิกถอน: วันที่ถอนขึ้นก่อน · วันที่ลงนามอยู่หลังวันที่สร้างคำขอ */
    if (activeTab === 'rejected') {
      return [colWithdrawn, colHn, colName, ...mid, colCreatedDate, colSignedDate, colAction];
    }
    /* ใกล้หมดอายุ: จำนวนวันที่เหลือขึ้นก่อน · วันที่สร้างอยู่หลังผู้สร้างคำขอ */
    if (activeTab === 'expiring') {
      return [colExpiresInDays, colHn, colName, ...mid, colCreatedDate, colSignedDate, colWithdrawn, colAction];
    }
    /* หมดอายุ: วันที่สร้างอยู่หลังผู้สร้างคำขอ */
    if (activeTab === 'expired') {
      return [colHn, colName, ...mid, colCreatedDate, colSignedDate, colWithdrawn, colAction];
    }
    /* รอดำเนินการ — ขอเพิกถอน (ไม่รวม รอลงนาม / ใกล้หมดอายุ / หมดอายุ) */
    if (activeTab === 'pending') {
      return [colCreatedDate, colHn, colName, ...mid, colAction];
    }
    /* รอลงนาม — รอผู้ป่วยเซ็น (รวมส่งอัตโนมัติจากเวอร์ชันใหม่) */
    if (activeTab === 'sent') {
      return [colCreatedDate, colHn, colName, ...mid, colAction];
    }
    /* fallback */
    return [colHn, colName, ...mid, colCreatedDate, colSignedDate, colWithdrawn, colAction];
  }, [activeTab]);

  const confirm = dialog ? CONSENT_CONFIRM[dialog.confirmKey] : null;

  const revokePatientCard = useMemo(() => {
    if (dialog?.confirmKey !== 'revoke' || !dialog?.record) return null;
    return resolveConsentPatientCard(dialog.record.hn, dialog.record.name);
  }, [dialog]);

  const runDialogConfirm = () => {
    if (!dialog?.record) return;
    if (dialog.confirmKey === 'cancel') {
      cancelConsentRequest(dialog.record.id);
      pushToast(`ยกเลิกคำขอความยินยอมของ ${dialog.record.name} แล้ว — ประวัติยังอยู่ครบ`);
      setDialog(null);
      return;
    }
    if (dialog.confirmKey === 'revoke') {
      const record = dialog.record;
      setDialog(null);
      setVerifyFor({ next: 'revoke', record });
      return;
    }
    setDialog(null);
  };

  const handleExport = () => {
    if (!canExportConsent()) return;
    setExportReport(buildWorklistExportReport(filtered));
  };

  return (
    <>
      <QueuePageShell
        activeKey='consent-manage'
        sidebarItems={CONSENT_NAV}
        sidebarFallbackKey='consent-manage'
        brandTitle='ระบบจัดการความยินยอม'
        breadcrumb={breadcrumb}
        title='จัดการความยินยอม'
        headerInfo={(
          <section className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
            {summaryCards.map((c) => (
              <SummaryCard key={c.key} card={c} variant='panel' />
            ))}
          </section>
        )}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(key) => {
          setActiveTab(key);
          setPage(1);
          setSortConfig({
            key: key === 'consented'
              ? 'signedDate'
              : key === 'rejected'
                ? 'withdrawnDate'
                : key === 'expiring'
                  ? 'expiresInDays'
                  : key === PATIENT_TAB
                    /* ทะเบียนรายคน — เรียงตามชื่อ (ก-ฮ) ไม่ใช่ HN เพราะคนหา
                       ผู้รับบริการจากชื่อ ไม่ได้จำเลข HN · ชื่อในพูลตัดคำนำหน้า
                       (นาย/นาง/นางสาว) ออกแล้ว จึงเรียงตามชื่อจริงตามธรรมเนียมไทย */
                    ? 'name'
                    : key === 'pending' || key === 'sent'
                      ? 'createdDate'
                      : 'createdDate',
            direction: 'asc',
          });
          if (STATUS_FILTER_HIDDEN_TABS.has(key)) setFilterStatus('');
          if (FILTERS_HIDDEN_TABS.has(key)) {
            setFilterType('');
            setFilterChannel('');
            setFilterDate({ quick: 'thisyear' });
          }
        }}
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{ padding: 'var(--dim-space-600)' }}
        >
          <section
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              boxShadow: 'var(--shadow-card)',
              padding: 'var(--dim-space-600)',
              gap: 'var(--dim-space-600)',
            }}
          >
            <div className='w-full flex items-start justify-center'>
              <PrimarySearch
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                onSubmit={handleSubmit}
                placeholder='ค้นหา HN / เลขบัตร / Passport / ชื่อ-สกุล / โทรศัพท์'
                width={640}
                suggestions={searchSuggestions}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              />
            </div>

            <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                  {!hideFilters && (
                    <>
                      <FilterDropdown prefix='ช่องทาง:' options={channelOptions} value={filterChannel} onChange={(v) => { setFilterChannel(v); setPage(1); }} />
                      {!hideStatusFilter && (
                        <FilterDropdown prefix='สถานะ:' options={statusOptions} value={filterStatus} onChange={(v) => { setFilterStatus(v); setPage(1); }} />
                      )}
                      <FilterDateTag
                        prefix='วันที่:'
                        value={filterDate}
                        onChange={(v) => { setFilterDate(v); setPage(1); }}
                        defaultQuick='thisyear'
                      />
                      <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
                    </>
                  )}
                </div>
                <div className='flex-1' />
                {canExportConsent() && (
                  <NeutralSubdueButton leadingIcon='ios_share' size='sm' collapseLabelBelow='lg' onClick={handleExport}>
                    นำส่งออกรายงาน
                  </NeutralSubdueButton>
                )}
              </div>

              <SmoothFilterResults opaque={resultsOpaque}>
              <SearchResultCount
                found={displayRows.length}
                total={displayTotal}
                unit={isPatientTab ? 'คน' : undefined}
              />

              <Table
                columns={columns}
                rows={pageRows}
                rowKey={(row) => row.id}
                sortConfig={sortConfig}
                onSort={handleSort}
                /* กดทั้งแถวเพื่อเปิดเอกสาร — แท็บสถานะเปิดฉบับนั้นตรง ๆ
                   ส่วนแท็บผู้รับบริการ (1 แถว = 1 คน) เปิด popup รวม 3 มุมมอง
                   คนที่ยังไม่เคยมีคำขอ กดแล้วไม่ต้องเปิดอะไร (ไม่มีเอกสารให้ดู) */
                onRowClick={(row) => (
                  isPatientTab
                    ? (row.everTotal
                      && setViewConsentedFor({
                        hn: row.hn, name: row.name, record: null, allForPatient: true,
                      }))
                    : setViewConsentedFor({ hn: row.hn, name: row.name, record: row })
                )}
                trailingInset='var(--dim-space-400, 16px)'
                /* คอลัมน์ "การดำเนินการ" ไม่ตรึงขอบขวา (คำสั่ง user 14 ส.ค.) —
                   เลื่อนตารางไปทางขวาเพื่อดูปุ่มตามปกติ · `<Table>` รองรับ
                   `stickyRightColCount` อยู่ถ้าเปลี่ยนใจภายหลัง */
                stickyColCount={
                  activeTab === 'expired' || isPatientTab
                    ? 2
                    : activeTab === 'rejected'
                      ? 3
                      : 3
                }
                /* Page scroll + sticky header ใต้ SubHeader/tabs — เหมือนแบบฟอร์มความยินยอม */
                stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                emptyMessage={isPatientTab ? 'ไม่พบผู้รับบริการ' : 'ไม่พบรายการความยินยอม'}
                emptySubtext='ลองปรับตัวกรองหรือคำค้นหา'
              />

              <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600)', paddingTop: 'var(--dim-space-400)' }}>
                <span style={{ flex: 1, color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.5 }}>
                  แสดง {rangeStart}-{rangeEnd} จาก {displayRows.length} {isPatientTab ? 'คน' : 'รายการ'}
                </span>
                {totalPages > 1 && (
                  <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
                )}
              </div>
              </SmoothFilterResults>
            </div>
          </section>
        </div>
      </QueuePageShell>

      <ConsentConsentedFormsPopup
        open={!!viewConsentedFor}
        onClose={() => setViewConsentedFor(null)}
        hn={viewConsentedFor?.hn || null}
        name={viewConsentedFor?.name || null}
        record={viewConsentedFor?.record || null}
        allForPatient={!!viewConsentedFor?.allForPatient}
        /* คอลัมน์ "การดำเนินการ" ในตารางของ popup ใช้ตัวเดียวกับ worklist
           (CTA ตามสถานะ + แก้ไขฉบับที่ลงนามแล้ว) — ตัดปุ่ม 👁 ออกเพราะกดแถว
           ก็เปิดเอกสารอยู่แล้ว · dialog/verify/toast ยังเป็นของหน้านี้ */
        renderRecordAction={(row) => renderAction(row, { showView: false, align: 'start' })}
      />

      {/* แท็บผู้รับบริการทั้งหมด — เลือกใบที่ยังไม่ขอความยินยอมก่อนไปหน้ากรอก */}
      <ConsentRequestFormsPopup
        open={!!requestFormsFor}
        hn={requestFormsFor?.hn || null}
        name={requestFormsFor?.name || null}
        records={requestFormsFor?.records || []}
        onClose={() => setRequestFormsFor(null)}
        onFill={(formId) => openConsentFill(requestFormsFor, formId)}
        onPrint={() => pushToast('พิมพ์แบบฟอร์มเปล่าให้ผู้รับบริการลงนาม — การพิมพ์ไม่เก็บ log')}
      />

      {/* Per-status confirm dialog */}
      <AlertDialog
        open={!!dialog}
        type={confirm ? confirm.type : 'info'}
        title={confirm ? confirm.title : ''}
        width={dialog?.confirmKey === 'revoke' ? 520 : undefined}
        description={
          dialog?.confirmKey === 'revoke' && dialog?.record
            ? dialog.record.formName || dialog.record.formCode || '—'
            : (confirm ? confirm.description : '')
        }
        confirmLabel={confirm ? confirm.confirmLabel : 'ตกลง'}
        cancelLabel='ยกเลิก'
        onConfirm={runDialogConfirm}
        onCancel={() => setDialog(null)}
        onClose={() => setDialog(null)}
      >
        {dialog?.confirmKey === 'revoke' && (
          <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
            {revokePatientCard && (
              <PatientSummaryCard
                avatarUrl={revokePatientCard.avatarUrl}
                avatarAlt={revokePatientCard.fullName || revokePatientCard.shortName || ''}
                cells={[
                  {
                    label: 'ชื่อ-นามสกุล ผู้รับบริการ',
                    value: revokePatientCard.fullName || revokePatientCard.shortName || '—',
                  },
                  {
                    label: 'HN (Hospital Number)',
                    value: revokePatientCard.hn || dialog.record?.hn || '—',
                  },
                ]}
              />
            )}
            <div
              className='flex flex-col w-full'
              style={{ gap: 'var(--dim-space-150)', paddingBottom: 'var(--dim-space-600, 24px)' }}
            >
              <span style={{ ...TEXT_CELL, color: 'var(--text-content-secondary)' }}>
                {CONSENT_CONFIRM.revoke.description}
              </span>
              {REVOKE_IMPACT_NOTES.map((note) => (
                <div
                  key={note}
                  className='flex items-start w-full min-w-0'
                  style={{ gap: 'var(--dim-space-150)' }}
                >
                  <Icon
                    name='check_circle'
                    size={16}
                    color='var(--icon-brandPrimary-default, #007549)'
                    style={{ flexShrink: 0, marginTop: 'var(--dim-space-050, 2px)' }}
                  />
                  <span style={{ ...MUTED_CELL, fontSize: 'var(--type-size-xs)' }}>{note}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </AlertDialog>

      {/* ด.1.1.7 — Re-Consent เลือกช่องทาง + วันครบกำหนด */}
      <ReconsentPopup
        open={!!reconsentFor}
        record={reconsentFor}
        onClose={() => setReconsentFor(null)}
        onConfirm={(payload) => {
          const rec = reconsentFor;
          setReconsentFor(null);
          if (rec) runReconsent(rec, payload);
        }}
      />

      {/* ด.1.1.8 — บันทึกให้/เพิกถอนจากเอกสารกระดาษ */}
      <PaperConsentRecordPopup
        open={!!paperFor}
        record={paperFor}
        onClose={() => setPaperFor(null)}
        onSave={({ mode, fileName, effectiveDate, reason }) => {
          const rec = paperFor;
          setPaperFor(null);
          if (rec) {
            if (mode === 'revoke') {
              patchRow(rec.id, { status: 'ถอนความยินยอม', withdrawnDate: effectiveDate });
            } else {
              patchRow(rec.id, { status: 'ยินยอมแล้ว', signChannel: serviceCenterChannel, signedDate: effectiveDate });
            }
            pushToast(`บันทึกจากเอกสาร (${fileName}) ของ ${rec.name} แล้ว · เหตุผล: ${reason.slice(0, 40)}${reason.length > 40 ? '…' : ''}`);
          }
        }}
      />

      {/* ด.1.1.1 — พิสูจน์ตัวตนเจ้าของข้อมูลก่อน action แทนเจ้าของข้อมูล */}
      <ConsentIdentityVerifyPopup
        open={!!verifyFor}
        onClose={() => setVerifyFor(null)}
        onVerified={handleVerified}
        actionLabel={
          verifyFor?.next === 'paper' ? 'บันทึกจากเอกสารกระดาษ'
            : verifyFor?.next === 'edit' ? 'แก้ไขความยินยอมรายข้อ'
              : 'เพิกถอนความยินยอม'
        }
        patientName={verifyFor?.record?.name}
        hn={verifyFor?.record?.hn}
        formCode={verifyFor?.record?.formCode}
        consentType={verifyFor?.record?.type}
      />

      {/* ด.1.1.2 — แก้ไข/เพิกถอนรายข้อ 5.1/5.2 ของแถวที่ลงนามแล้ว */}
      <PersonalDataConsentEditPopup
        open={!!editFor}
        onClose={() => setEditFor(null)}
        onConfirm={() => {
          const rec = editFor;
          setEditFor(null);
          if (rec) pushToast(`บันทึกการแก้ไขความยินยอมรายข้อของ ${rec.name} แล้ว — เก็บ audit trail ครบ`);
        }}
      />

      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />

      <ExportFormatPopup
        open={!!exportReport}
        report={exportReport}
        onClose={() => setExportReport(null)}
        onExported={() => setExportDone(true)}
      />
      <SuccessToast
        open={exportDone}
        message='นำส่งออกรายงานแล้ว — ระบบบันทึก log การส่งออกข้อมูล'
        onClose={() => setExportDone(false)}
      />
    </>
  );
}
