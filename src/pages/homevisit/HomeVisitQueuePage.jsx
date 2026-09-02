import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  getCenterDistricts, buildDistrictFilterOptions, resolveDistrictFilter,
} from '@/data/centerDistricts';
import { useActiveCenter } from '@/pages/users/usersShared';
import QueuePageShell from '@/templates/QueuePageShell';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import { Field } from '@/components/forms/Fields';
import FollowUpStatusMenuButton from '@/components/homevisit/FollowUpStatusMenuButton';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import { FilterDropdown } from '@/components/forms/FilterTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
/* หน้านี้ใช้ underline tab แทนแถบชิปแล้ว — ยังยืมค่า sticky offset ของแถบสถานะ
   มาใช้กับหัวตาราง เพราะตำแหน่ง/ความสูงของแถบยังอยู่ระดับเดียวกัน */
import { QUEUE_STICKY_UNDER_STATUS_TABS } from '@/components/tab/StickyStatusTabBar';
import TabUnderline from '@/components/tab/TabUnderline';
import ViewToggle from '@/components/toggle/ViewToggle';
import SuccessToast from '@/components/toast/SuccessToast';
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Popup from '@/components/popup/Popup';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import QueuePatientAvatar, { resolveQueuePatientAvatarProps } from '@/components/patient/QueuePatientAvatar';
import PatientCard from '@/components/card/PatientCard';
import ScreeningConfirmPopup from '@/components/popup/ScreeningConfirmPopup';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  HOMEVISIT_GROUPS,
  HOMEVISIT_STATUSES,
  upsertHomeVisitAppointment,
  HOMEVISIT_SOURCES,
  HOMEVISIT_PROFESSIONS,
  HOMEVISIT_TIME_SLOTS,
  HOMEVISIT_CANCEL_REASONS,
  addDaysIso,
  todayIsoDate,
  formatHomeVisitDate,
  getHomeVisitQueueRows,
  getHomeVisitAppointmentCancellation,
  cancelHomeVisitAppointment,
  reactivateHomeVisitAppointment,
  getVisitFollowUpOverdue,
  resolveGroup,
  resolveSource,
  resolveProfession,
  resolveVisitStatus,
} from '@/data/homevisitVisits';
import { getGroupFollowUpDays } from '@/data/homevisitQuotaSettings';
import { getVisitHistory } from '@/data/homevisitRegistry';
import {
  HOMEVISIT_ROLES,
  getHomeVisitRole,
  filterRowsByRole,
  volunteerScopeNote,
  getQuotaUsage,
  getQuotaOverride,
  saveQuotaOverride,
  QUOTA_OVERRIDE_REASONS,
} from '@/data/homevisitHhc';
import HomeVisitRouteMapPanel from '@/pages/homevisit/HomeVisitRouteMapPanel';
import HomeVisitMapPopup from '@/pages/homevisit/HomeVisitMapPopup';
import {
  HomeVisitAccessGate,
  GroupBadge,
  SourceBadge,
  flagText,
  EmptyHint,
  NoticeBand,
  GREYED,
  dateFilterToIsoRange,
} from '@/pages/homevisit/homevisitShared';

/* HomeVisitQueuePage — คิวนัดหมายเยี่ยมบ้าน (TOR 1.18.1 + 1.18.2).

   โครงเดียวกับ AncQueuePage/AddictionQueuePage: QueuePageShell + summary
   cards + แท็บสถานะ + ค้นหา + ตัวกรอง + ตารางคิว + pagination 20 แถว.
   เพิ่มจากคลินิกอื่น 2 อย่างที่เป็นของเยี่ยมบ้านโดยเฉพาะ:
     • สลับมุมมอง "รายการ / แผนที่" — มุมมองแผนที่คือแผนเส้นทางออกเยี่ยม
       ของวัน (1.18.2 ระดับคิว) บน mock map ของ AddressMapBlock
     • แท็บ "เลยกำหนดติดตาม" — รอบติดตามตามกลุ่มผู้รับบริการของระบบเดิม
       (คู่มือฯ §2.2.6: ระยะสุดท้าย 30 วัน · เรื้อรัง/พิการช่วยเหลือไม่ได้
       6 เดือน · กลุ่มอื่นปีละครั้ง)
   ชื่อผู้รับบริการของเคส "ข้อมูลลับ" ถูกปิดบังด้วย MaskedWorklistName (§1.4.2). */

const breadcrumb = ['ระบบเยี่ยมบ้าน', 'คิวนัดหมายเยี่ยมบ้าน'];
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:homevisit-queue';
const PAGE_SIZE = 20;

const FILTER_DEFAULTS = {
  group: 'all',
  profession: 'all',
  source: 'all',
  district: 'all',
  /* กรองตามสถานะการเยี่ยมได้จากแถวตัวกรองด้วย (มติผู้ใช้ 2 ก.ย. 69) — แท็บ
     ด้านบนแบ่งชุดงานหยาบ ๆ ส่วนชิปนี้ไว้เจาะสถานะภายในแท็บที่เปิดอยู่ */
  status: 'all',
};

const DATE_CHIP_LABELS = { today: 'วันนี้', yesterday: 'เมื่อวาน', tomorrow: 'พรุ่งนี้' };

/* §2.4.1 (มติ คทง.4) — นำส่งออกรายงานด้วย ExportFormatPopup ตัวเดียวกับ
   หน้าอื่นในระบบ (ทะเบียนศูนย์บริการ / ความยินยอม / เภสัชกรรม) แทนการ
   ดาวน์โหลด CSV ตรง ๆ เพื่อให้เลือกรูปแบบไฟล์/หัวข้อ และมี log การส่งออก */
const HOMEVISIT_QUEUE_EXPORT_COLUMNS = [
  { key: 'hn', header: 'HN', width: 110 },
  { key: 'name', header: 'ชื่อ-นามสกุล', width: 200 },
  { key: 'groupLabel', header: 'กลุ่มผู้รับบริการ', width: 160 },
  { key: 'sourceLabel', header: 'แหล่งรับเข้า', width: 150 },
  { key: 'district', header: 'เขต', width: 130 },
  { key: 'community', header: 'ชุมชน', width: 180 },
  { key: 'responsible', header: 'ผู้รับผิดชอบ', width: 170 },
  { key: 'professionLabel', header: 'วิชาชีพ', width: 140 },
  { key: 'visitDate', header: 'วันนัด', width: 120 },
  { key: 'appointmentTime', header: 'เวลานัด', width: 100 },
  { key: 'statusLabel', header: 'สถานะ', width: 130 },
  { key: 'visitCount', header: 'จำนวนครั้งที่เยี่ยมสะสม (Visit)', width: 190 },
  { key: 'quotaUsed', header: 'ใช้สิทธิ สปสช. ปีงบนี้ (ครั้ง)', width: 190 },
  { key: 'quotaRemaining', header: 'สิทธิคงเหลือ (ครั้ง)', width: 150 },
  { key: 'nextDue', header: 'กำหนดติดตามครั้งถัดไป', width: 180 },
];

/* มุมมองของหน้าคิว — รายการ ↔ แผนที่วางแผนเส้นทาง (§1.18.2) */
const HOMEVISIT_VIEW_OPTIONS = [
  { value: 'list', icon: 'format_list_bulleted', label: 'มุมมองรายการ' },
  { value: 'map',  icon: 'map',                  label: 'มุมมองแผนที่ (แผนเส้นทาง)' },
];

/* นัดที่วันนัดอยู่ในอนาคต — แยกออกจากคิวของวันนี้ทุกแท็บ ไม่งั้นงานพรุ่งนี้
   จะมาปนกับงานที่ต้องออกเยี่ยมวันนี้ (มติผู้ใช้ 30 ส.ค. 69) */
const isUpcomingVisit = (r) => !!r.visitDate && r.visitDate > todayIsoDate();

const TAB_PREDICATE = {
  /* แท็บรายชื่อทั้งหมด — ไม่กรองอะไรเลย รวมนัดที่ถูกยกเลิกด้วย */
  all: () => true,
  /* แท็บ "นัดวันนี้" เหลือเฉพาะสถานะ "รอเยี่ยม" (มติผู้ใช้ 2 ก.ย. 69) — ที่ออก
     ไปแล้วหรือเยี่ยมเสร็จแล้วมีแท็บของตัวเอง ปนกันอยู่ในแท็บเดียวทำให้มองไม่ออก
     ว่าวันนี้เหลือกี่บ้านที่ยังไม่ได้ไป */
  today:    (r) => !r.cancellation && !isUpcomingVisit(r) && r.statusKey === 'scheduled',
  toDepart: (r) => !r.cancellation && !isUpcomingVisit(r) && r.statusKey === 'toDepart',
  done:     (r) => !r.cancellation && !isUpcomingVisit(r) && r.statusKey === 'done',
  draft:    (r) => !r.cancellation && !isUpcomingVisit(r) && r.statusKey === 'draft',
  overdue:  (r) => !r.cancellation && !!r.overdue,
  cancelled: (r) => !!r.cancellation,
  upcoming: (r) => !r.cancellation && isUpcomingVisit(r),
};

/** นัดติดตามครั้งถัดไปตามรอบของกลุ่มผู้รับบริการ. */
const nextDueDate = (row) => {
  const base = row.lastVisitDate || row.registeredDate || row.visitDate;
  if (!base) return null;
  return addDaysIso(base, getGroupFollowUpDays(row.group));
};

/* ขนาดรูปโปรไฟล์ในตาราง — ค่าเดียวกับตารางหน้าเวชระเบียน */
const TABLE_AVATAR_SIZE = 36;

const HomeVisitQueuePage = () => {
  const history = useHistory();

  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState('today');
  const [view, setView] = useState('list'); /* 'list' | 'map' */
  const [selectedStopId, setSelectedStopId] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  /* เขตที่เลือกได้ = เขตที่ศูนย์บน Header รับผิดชอบ (มติผู้ใช้ 2 ก.ย. 69) —
     สลับศูนย์แล้วเขตที่ค้างอยู่ซึ่งไม่ใช่ของศูนย์ใหม่จะตกกลับเป็น "ทุกเขต"
     เองผ่าน `resolveDistrictFilter` ไม่ต้องล้างตัวกรองเอง */
  const { center } = useActiveCenter();
  const districtOptions = useMemo(() => buildDistrictFilterOptions(center), [center]);
  const centerDistrictOptions = useMemo(
    () => getCenterDistricts(center).map((d) => ({ value: d, label: d })),
    [center],
  );

  /* เพิ่มผู้ป่วยใหม่เข้าคิวเยี่ยมบ้านจากหัวหน้าจอ (มติผู้ใช้ 2 ก.ย. 69) —
     บันทึกลงทะเบียนนัดชุดเดียวกับแถวอื่น (`upsertHomeVisitAppointment`)
     กดบันทึกแล้วแถวจึงขึ้นในตารางทันที */
  const [addOpen, setAddOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', hn: '', group: '', district: '', appointmentTime: '' });
  const canSaveNewPatient = String(newPatient.name || '').trim() !== '';
  const saveNewPatient = () => {
    if (!canSaveNewPatient) return;
    upsertHomeVisitAppointment({
      hn: newPatient.hn || `HV-${Date.now().toString().slice(-5)}`,
      name: newPatient.name.trim(),
      group: newPatient.group || 'chronic',
      source: 'walkin',
      statusKey: 'toDepart',
      district: newPatient.district || getCenterDistricts(center)[0],
      appointmentTime: newPatient.appointmentTime || '',
      timeSlot: 'morning',
      visitDate: null,
      visitCount: 0,
      confidential: false,
      flags: [],
    });
    setNewPatient({ name: '', hn: '', group: '', district: '', appointmentTime: '' });
    setAddOpen(false);
    setTick((t) => t + 1);
  };
  const districtFilter = resolveDistrictFilter(center, filters.district);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  /* มติ คทง.4 — §2.2.2 อสส. เห็นเฉพาะเคสที่ได้รับมอบหมาย
     (ยังกรองรายการอยู่ แต่ปุ่มสลับมุมมองถูกลบพร้อมแถบปุ่มบนหัวหน้า —
      ค่าอ่านจาก session ที่ `setHomeVisitRole` เขียนไว้) */
  const [role] = useState(() => getHomeVisitRole());
  /* มติ คทง.4 — §1.18.1 เยี่ยมเกินโควตา สปสช. ต้องขออนุมัติพร้อมเหตุผล */
  /* §1.18.2 — ป๊อปอัปแผนที่/ปักหมุดของแถวที่กด */
  const [mapTarget, setMapTarget] = useState(null);
  const [exportReport, setExportReport] = useState(null);
  const [exportDone, setExportDone] = useState(false);
  const [quotaTarget, setQuotaTarget] = useState(null);
  const [quotaReason, setQuotaReason] = useState('');
  const [quotaError, setQuotaError] = useState('');

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  /* แถวคิวพร้อมสถานะยกเลิก + สถานะเลยกำหนดติดตาม เพื่อให้ตาราง/แท็บ/สรุป
     อ่านจากรูปทรงเดียวกัน (session writes ไม่ใช่ React state จึงพึ่ง tick). */
  const rows = useMemo(() => filterRowsByRole(getHomeVisitQueueRows(), role).map((r) => ({
    ...r,
    cancellation: getHomeVisitAppointmentCancellation(r.id),
    overdue: getVisitFollowUpOverdue(r),
    nextDue: nextDueDate(r),
    /* โควตาการเยี่ยมตามสิทธิ สปสช. ของปีงบประมาณปัจจุบัน (§1.18.1) */
    quota: getQuotaUsage(r, getVisitHistory(r.hn)),
    quotaOverride: getQuotaOverride(r.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [tick, role]);

  const hiddenByRole = useMemo(
    () => getHomeVisitQueueRows().length - filterRowsByRole(getHomeVisitQueueRows(), role).length,
    [role],
  );

  const tabs = useMemo(() => ([
    { key: 'today',     label: 'นัดวันนี้',         icon: 'event_available',      count: rows.filter(TAB_PREDICATE.today).length },
    { key: 'toDepart',  label: 'กำลังเยี่ยม',        icon: 'directions_car',       count: rows.filter(TAB_PREDICATE.toDepart).length },
    { key: 'done',      label: 'เยี่ยมเสร็จแล้ว',   icon: 'check_circle',         count: rows.filter(TAB_PREDICATE.done).length },
    { key: 'draft',     label: 'ที่ร่างไว้',        icon: 'save',                 count: rows.filter(TAB_PREDICATE.draft).length },
    { key: 'cancelled', label: 'ยกเลิกนัดแล้ว',     icon: 'block',                count: rows.filter(TAB_PREDICATE.cancelled).length },
    /* รายชื่อทั้งหมด — ทุกสถานะรวมนัดที่ยกเลิก ไว้ค้นหาคนที่ไม่รู้ว่าอยู่แท็บไหน
       (มติผู้ใช้ 30 ส.ค. 69) ทรงเดียวกับแท็บ "รายชื่อผู้ป่วยทั้งหมด" ของเวชระเบียน */
    { key: 'all',       label: 'รายชื่อผู้ป่วยทั้งหมด', icon: 'groups',            count: rows.length },
    { key: 'upcoming',  label: 'นัดล่วงหน้า',        icon: 'event_upcoming',       count: rows.filter(TAB_PREDICATE.upcoming).length },
  ]), [rows]);

  /* แถบสถานะเหนือช่องค้นหา — ชื่อสถานะ + จำนวน (ไม่ใช้ไอคอน) */
  const statusTabs = useMemo(
    () => tabs.map(({ key, label, count }) => ({ key, label, count })),
    [tabs],
  );

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return rows.filter((r) => {
      const pred = TAB_PREDICATE[activeTab];
      if (pred) {
        if (!pred(r)) return false;
      }
      if (filters.group !== 'all' && r.group !== filters.group) return false;
      if (filters.profession !== 'all' && r.profession !== filters.profession) return false;
      if (filters.source !== 'all' && r.source !== filters.source) return false;
      if (filters.status !== 'all' && r.statusKey !== filters.status) return false;
      if (districtFilter !== 'all' && r.district !== districtFilter) return false;
      /* ไม่กรองตามวันนัด/ช่วงเวลาแล้ว — ตัวกรองสองตัวถูกถอดออกจากหน้าจอ
         (มติผู้ใช้ 30 ส.ค. 69) ถ้ายังกรองอยู่เบื้องหลัง แท็บอื่นจะขึ้นศูนย์รายการ
         ทั้งที่มีข้อมูล และผู้ใช้จะแก้อะไรไม่ได้เพราะไม่มีชิปให้กด */
      if (!q) return true;
      return [r.hn, r.name, r.responsible, r.community, r.district, r.address]
        .some((f) => f && String(f).toLowerCase().includes(q));
    });
  }, [rows, activeTab, filters, searchQ]);

  const sortedRows = useMemo(() => {
    const byTime = (a, b) => String(a.appointmentTime || '').localeCompare(String(b.appointmentTime || ''));
    if (!sortConfig.key) return [...filtered].sort(byTime);
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const normalize = (row, key) => {
      switch (key) {
        case 'group': return resolveGroup(row.group)?.short ?? '';
        case 'source': return resolveSource(row.source)?.short ?? '';
        case 'status': return resolveVisitStatus(row.statusKey)?.label ?? '';
        case 'nextDue': return row.nextDue ?? '';
        case 'place': return `${row.district || ''} ${row.community || ''}`;
        default: return row[key] ?? '';
      }
    };
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    return [...filtered].sort((a, b) => {
      const primary = collator.compare(
        String(normalize(a, sortConfig.key)),
        String(normalize(b, sortConfig.key)),
      );
      return primary !== 0 ? sign * primary : byTime(a, b);
    });
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = sortedRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, sortedRows.length);

  useEffect(() => { setPage(1); }, [activeTab, filters, searchQ]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const summaryCards = useMemo(() => ([
    { key: 'today',    label: 'นัดเยี่ยมวันนี้',   value: rows.filter((r) => !r.cancellation).length, color: 'info',        icon: 'event_available' },
    { key: 'toDepart', label: 'กำลังเยี่ยม',        value: rows.filter(TAB_PREDICATE.toDepart).length,  color: 'brand',       icon: 'directions_car'  },
    { key: 'done',     label: 'เยี่ยมเสร็จแล้ว',   value: rows.filter(TAB_PREDICATE.done).length,      color: 'positive',    icon: 'check_circle'    },
    { key: 'overdue',  label: 'เลยกำหนดติดตาม',    value: rows.filter(TAB_PREDICATE.overdue).length,   color: 'destructive', icon: 'running_with_errors' },
  ]), [rows]);

  /* ── การดำเนินการ ────────────────────────────────────────────────── */
  const openRecord = (row) => history.push({
    pathname: '/homevisit/visit',
    state: { visitId: row.id, hn: row.hn, name: row.name },
  });

  /* §1.18.1 (มติ คทง.4) — เยี่ยมเกินโควตา สปสช. ถูกล็อกไว้ก่อน ต้องระบุ
     เหตุผลขออนุมัติเยี่ยมนอกโควตา จึงจะเปิดแบบบันทึกการเยี่ยมได้
     (ด่านนี้เดิมอยู่ที่ปุ่ม "ออกเยี่ยม" ซึ่งถูกตัดออกแล้ว). */
  const startRecord = (row) => {
    if (row.quota?.level === 'over' && !row.quotaOverride) {
      setQuotaReason('');
      setQuotaError('');
      setQuotaTarget(row);
      return;
    }
    openRecord(row);
  };

  const confirmQuotaOverride = () => {
    if (!quotaReason.trim()) {
      setQuotaError('กรุณาระบุเหตุผลที่จำเป็นต้องเยี่ยมเกินโควตาสิทธิ สปสช.');
      return;
    }
    saveQuotaOverride(quotaTarget.id, quotaReason.trim());
    const target = quotaTarget;
    setQuotaTarget(null);
    openRecord(target);
  };

  /* ป๊อปอัป "ยืนยันรับผู้ป่วย" คั่นก่อนเข้าแบบบันทึกการเยี่ยม (มติผู้ใช้ 30 ส.ค. 69)
     — ชุดเดียวกับจุดคัดกรอง (ScreeningConfirmPopup) เพื่อให้สองที่ถามเหมือนกัน
     ด่านโควตา สปสช. ยังทำงานก่อนหน้านั้นเสมอ (§1.18.1) */
  const [acceptTarget, setAcceptTarget] = useState(null);

  const requestOpenRecord = (row) => {
    if (row.quota?.level === 'over' && !row.quotaOverride) {
      startRecord(row);
      return;
    }
    setAcceptTarget(row);
  };

  const confirmAccept = () => {
    const target = acceptTarget;
    setAcceptTarget(null);
    if (target) openRecord(target);
  };

  const openCancel = (row) => {
    setCancelReason('');
    setCancelError('');
    setCancelTarget(row);
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('กรุณาระบุเหตุผลการยกเลิกนัดเยี่ยม');
      return;
    }
    cancelHomeVisitAppointment(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };

  const reactivate = (row) => {
    reactivateHomeVisitAppointment(row.id);
    setTick((t) => t + 1);
  };

  /* ── ค้นหา ───────────────────────────────────────────────────────── */
  const rowToSearchItem = (r) => ({
    id: r.id,
    label: r.confidential ? `ผู้รับบริการ HN ${r.hn} (ข้อมูลลับ)` : r.name,
    sublabel: `${r.community || '—'} · ${r.responsible || '—'}`,
    value: r.confidential ? r.hn : r.name,
    badges: [
      { label: r.hn, tone: 'indigo' },
      { label: resolveGroup(r.group)?.short || '—', tone: 'teal' },
    ],
    avatarSrc: r.confidential ? undefined : getPatientByHN(r.hn)?.avatarUrl,
  });

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return rows
      .filter((r) => [r.hn, r.name, r.responsible, r.community].some((f) => f && String(f).toLowerCase().includes(q)))
      .slice(0, 8)
      .map(rowToSearchItem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, rows]);

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = rows.find((r) => r.id === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return rows.find((r) => [r.hn, r.name].some((f) => f && String(f).toLowerCase().includes(q))) ?? null;
  };

  /* ── ตัวกรอง / สถานะว่าง ─────────────────────────────────────────── */
  /* ปุ่ม "ล้างตัวกรอง" ขึ้นเฉพาะตอนที่มีตัวกรองถูกเลือกจริง ๆ (มติผู้ใช้ 30 ส.ค. 69)
     — การอยู่คนละแท็บไม่ใช่ "ตัวกรองที่ตั้งไว้" แต่เป็นการเลือกดูคนละชุด ถ้านับรวม
     ปุ่มจะโผล่ตลอดเวลาที่ไม่ได้อยู่แท็บแรก และการกดล้างจะเด้งกลับแท็บอื่นโดยไม่คาดคิด */
  const filtersActive = searchQ.trim() !== ''
    || filters.group !== 'all'
    || filters.profession !== 'all'
    || filters.source !== 'all'
    || filters.status !== 'all'
    || districtFilter !== 'all';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setSearchQ('');
      setFilters(FILTER_DEFAULTS);
    },
  );

  const filterSummary = [
    activeTab === 'today' ? null : tabs.find((t) => t.key === activeTab)?.label,
    filters.group === 'all' ? null : resolveGroup(filters.group)?.label,
    filters.profession === 'all' ? null : `วิชาชีพ ${resolveProfession(filters.profession)?.label}`,
    filters.source === 'all' ? null : `แหล่งรับเข้า ${resolveSource(filters.source)?.short}`,
    districtFilter === 'all' ? null : districtFilter,
    searchQ.trim() ? `ค้นหา "${searchQ.trim()}"` : null,
  ].filter(Boolean).join(' · ');

  const buildExportReport = () => ({
    key: 'homevisit-queue',
    title: 'คิวนัดหมายเยี่ยมบ้าน',
    subtitle: filterSummary || 'นัดเยี่ยมวันนี้ทั้งหมด',
    table: {
      columns: HOMEVISIT_QUEUE_EXPORT_COLUMNS,
      rows: sortedRows.map((r) => ({
        hn: r.hn,
        name: r.confidential ? 'ข้อมูลลับ' : r.name,
        groupLabel: resolveGroup(r.group)?.short || r.group,
        sourceLabel: resolveSource(r.source)?.short || r.source,
        district: r.district,
        community: r.community,
        responsible: r.responsible,
        professionLabel: resolveProfession(r.profession)?.label || r.profession,
        visitDate: r.visitDate,
        appointmentTime: r.appointmentTime,
        statusLabel: r.cancellation ? 'ยกเลิกนัด' : resolveVisitStatus(r.statusKey)?.label,
        visitCount: r.visitCount,
        quotaUsed: r.quota?.used,
        quotaRemaining: r.quota?.remaining,
        nextDue: r.nextDue,
      })),
    },
  });

  /* ── คอลัมน์ ─────────────────────────────────────────────────────── */
  /* รูปผู้รับบริการ + ชื่อ — แบบเดียวกับคิวตรวจสุขภาพ/เภสัชกรรม.
     เคส "ข้อมูลลับ" (§1.4.2) ไม่โชว์รูปจริง ใช้อักษรย่อแทน (noProfilePhoto)
     ไม่งั้นรูปจะเปิดเผยตัวตนทั้งที่ชื่อถูกปิดบังอยู่ */
  const renderName = (row) => {
    /* รูปจริงเฉพาะเคสที่ไม่ใช่ข้อมูลลับ · คนที่ยังไม่มีรูปโปรไฟล์ใช้ภาพ Avatar
       (ซิลูเอตต์) ไม่ใช่วงกลมอักษรย่อ และขนาดเท่ากับตารางหน้าเวชระเบียน
       (มติผู้ใช้ 30 ส.ค. 69) */
    const avatarUrl = row.confidential ? undefined : getPatientByHN(row.hn)?.avatarUrl;
    return (
    <span className='inline-flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
      <QueuePatientAvatar
        hn={row.hn}
        name={row.name}
        avatarUrl={avatarUrl}
        newUser={!avatarUrl}
        size={TABLE_AVATAR_SIZE}
      />
      {row.confidential ? (
        <MaskedWorklistName
          name={row.name}
          recordKey={row.id}
          linkTo={{ pathname: '/homevisit/visit', state: { visitId: row.id, hn: row.hn, name: row.name } }}
        />
      ) : (
        <span
          className='min-w-0 truncate'
          style={row.cancellation ? GREYED : { fontWeight: 'var(--type-weight-medium)' }}
        >
          {row.name}
        </span>
      )}
    </span>
    );
  };

  const columns = useMemo(() => ([
    {
      key: 'appointmentTime', label: 'คิว/เวลานัด',
      render: (r) => (
        <ColorfulBadge style={r.cancellation ? 'grey' : 'teal'} size='small' hierarchy='secondary'>
          {r.appointmentTime || '—'}
        </ColorfulBadge>
      ),
    },
    { key: 'hn', label: 'HN', render: (r) => <span style={r.cancellation ? GREYED : undefined}>{r.hn}</span> },
    {
      key: 'name', label: 'ชื่อ-สกุล ผู้รับบริการ', flex: true, minWidth: 190,
      render: (r) => renderName(r),
    },
    {
      /* ธง/ภาวะที่ต้องระวังแยกเป็นคอลัมน์ของตัวเอง — เดิมกองอยู่ใต้ชื่อ
         ทำให้แถวสูงไม่เท่ากันและอ่านเทียบกันระหว่างแถวไม่ได้ */
      key: 'flags', label: 'ภาวะที่ต้องระวัง', sortable: false, flex: true, minWidth: 200,
      render: (r) => (
        <span style={r.cancellation ? GREYED : { color: 'var(--text-content-secondary, #636B72)' }}>
          {flagText(r.group, r.flags)}
        </span>
      ),
    },
    { key: 'group', label: 'กลุ่มผู้รับบริการ', render: (r) => <GroupBadge group={r.group} /> },
    { key: 'source', label: 'แหล่งรับเข้า', render: (r) => <SourceBadge source={r.source} /> },
    {
      key: 'place', label: 'ที่อยู่/เขต', flex: true, minWidth: 260,
      render: (r) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={r.cancellation ? GREYED : undefined}>{r.community || '—'} · {r.district || '—'}</span>
          {/* §1.18.2 — ต้องดูแผนที่/แก้หมุดได้จากแถวในคิว เพื่อเดินทางไปถูกบ้าน
              ครอบด้วย inline-flex เพื่อให้ปุ่มกว้างเท่าเนื้อหา ไม่ยืดเต็มคอลัมน์
              (พ่อแม่เป็น flex-col ซึ่ง stretch ลูกโดยปริยาย) */}
          <span className='inline-flex self-start'>
            <NeutralSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='map'
              onClick={(e) => { e.stopPropagation(); setMapTarget(r); }}
            >
              ดูแผนที่
            </NeutralSubdueButton>
          </span>
        </div>
      ),
    },
    {
      key: 'responsible', label: 'ผู้รับผิดชอบ', flex: true, minWidth: 160,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={r.cancellation ? GREYED : undefined}>{r.responsible}</span>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {resolveProfession(r.profession)?.label || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'status', label: 'สถานะ', sortable: false,
      render: (r) => {
        if (r.cancellation) {
          return (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกนัดแล้ว</ColorfulBadge>
              <span style={{ fontSize: 'var(--type-size-xs)', ...GREYED }}>
                ยกเลิกโดย {r.cancellation.by} · {r.cancellation.at}
                <br />เหตุผล: {r.cancellation.reason}
              </span>
            </div>
          );
        }
        const st = resolveVisitStatus(r.statusKey);
        return (
          <ColorfulBadge style={st?.badge || 'grey'} size='small' hierarchy='secondary'>
            {st?.label || r.statusKey}
          </ColorfulBadge>
        );
      },
    },
    {
      key: 'quota', label: 'สิทธิ สปสช.', sortable: false, flex: true, minWidth: 170,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <ColorfulBadge
            style={r.cancellation ? 'grey' : (r.quota?.badge || 'grey')}
            size='small' hierarchy='secondary' width='hug' maxWidth={220}
          >
            {r.quota?.label || '—'}
          </ColorfulBadge>
          {r.quotaOverride ? (
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-pill-orange, #C2410C)' }}>
              อนุมัติเยี่ยมนอกโควตาโดย {r.quotaOverride.by}
            </span>
          ) : (
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              โควตากลุ่มนี้ {r.quota?.quota ?? '—'} ครั้ง/ปีงบ
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'nextDue', label: 'นัดครั้งถัดไป', flex: true, minWidth: 170,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={r.cancellation ? GREYED : undefined}>
            {r.nextDue ? formatHomeVisitDate(r.nextDue) : 'ยังไม่กำหนด'}
          </span>
          {r.overdue ? (
            <ColorfulBadge style='red' size='small' hierarchy='secondary' width='hug' maxWidth={220}>
              เลยกำหนด {r.overdue.daysOverdue} วัน
            </ColorfulBadge>
          ) : (
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              รอบติดตามทุก {getGroupFollowUpDays(r.group)} วัน
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {r.cancellation ? (
            <BrandSubdueButton
              variant='outline' size='sm' leadingIcon='restart_alt'
              onClick={(e) => { e.stopPropagation(); reactivate(r); }}
            >
              เปิดใช้งานอีกครั้ง
            </BrandSubdueButton>
          ) : (
            <>
              {/* ไม่มีปุ่มเปิดแบบบันทึกในคอลัมน์นี้แล้ว (มติผู้ใช้ 30 ส.ค. 69) — กดที่แถว
                  เป็นทางเข้าเดียว · เคสเกินโควตา สปสช. ยังถูกกันไว้ที่ `startRecord`
                  ซึ่งเปิดป๊อปอัปขออนุมัติก่อนเสมอ (§1.18.1) */}
              <NeutralSubdueButton
                size='sm'
                onClick={(e) => { e.stopPropagation(); openCancel(r); }}
              >
                ยกเลิกนัด
              </NeutralSubdueButton>
            </>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick, rows]);

  const handleSort = (key) => {
    setSortConfig((prev) => (prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }));
  };

  const mapStops = useMemo(
    () => sortedRows.filter((r) => !r.cancellation),
    [sortedRows],
  );

  return (
    <QueuePageShell
      activeKey='homevisit'
      breadcrumb={breadcrumb}
      title='เยี่ยมบ้าน (Home Visit)'
      /* แถบปุ่มบนหัวหน้าถูกลบออก — ทะเบียน/ติดตามเข้าถึงได้จากเมนูซ้าย
         (Sidebar subItems ของ "ระบบการเยี่ยมบ้าน") อยู่แล้ว
         เหลือไว้ปุ่มเดียวคือ "ติดตามสถานะ" (มติผู้ใช้ 2 ก.ย. 69) — หัวหน้าทีมเปิด
         ดูสถานะโครงการของทั้งคิวได้โดยไม่ต้องเข้าไปในบันทึกของใครคนหนึ่งก่อน */
      /* "เพิ่มผู้ป่วยใหม่" อยู่ขวาสุดของแถวปุ่ม และเป็น brand subdued (fill)
         (มติผู้ใช้ 2 ก.ย. 69) — ปุ่มลงมือของหน้าอยู่ท้ายแถว ถัดจากคำขอเข้าถึง
         ข้อมูลและติดตามสถานะ ไม่ใช่หัวแถวอย่างเดิม */
      actions={(
        <>
          <FollowUpStatusMenuButton />
          <BrandSubdueButton variant='fill' size='sm' leadingIcon='person_add' onClick={() => setAddOpen(true)}>
            เพิ่มผู้ป่วยใหม่
          </BrandSubdueButton>
        </>
      )}
      summaryCards={summaryCards}
      /* แถบสถานะเป็น underline tab และอยู่ใต้การ์ดสรุป (มติผู้ใช้ 30 ส.ค. 69)
         — การ์ดสรุปบอกภาพรวมทั้งวัน แล้วแท็บคือตัวกรองตารางที่อยู่ถัดลงไป
         ลำดับจึงอ่านจากบนลงล่างได้ตรง ๆ */
      belowSummary={(
        <TabUnderline
          tabs={statusTabs}
          value={activeTab}
          onChange={setActiveTab}
          aria-label='กรองตามสถานะ'
        />
      )}
    >
      <Popup
        open={addOpen}
        onClose={() => setAddOpen(false)}
        /* กว้างพอให้ห้าช่องอยู่แถวเดียว/สองแถว ไม่ใช่คอลัมน์เดียวยาว ๆ
           (มติผู้ใช้ 2 ก.ย. 69) */
        size='large'
        title='เพิ่มผู้ป่วยใหม่เข้าคิวเยี่ยมบ้าน'
        subtitle='บันทึกแล้วแถวจะขึ้นในตารางคิวทันที'
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setAddOpen(false) }}
        primaryAction={{ label: 'เพิ่มเข้าคิว', onClick: saveNewPatient, disabled: !canSaveNewPatient }}
      >
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-600, 24px)' }}>
          <Field label='ชื่อ-สกุล' required>
            <InputField
              showLabel={false} showHelperText={false}
              value={newPatient.name}
              onChange={(v) => setNewPatient((p) => ({ ...p, name: v }))}
              placeholder='ชื่อผู้รับบริการ'
            />
          </Field>
          <Field label='HN'>
            <InputField
              showLabel={false} showHelperText={false}
              value={newPatient.hn}
              onChange={(v) => setNewPatient((p) => ({ ...p, hn: v }))}
              placeholder='เว้นว่างได้ ระบบจะออกเลขชั่วคราวให้'
            />
          </Field>
          <Field label='กลุ่มผู้รับบริการ'>
            <Select
              showLabel={false} showHelperText={false} searchable={false} size='lg'
              value={newPatient.group}
              onChange={(v) => setNewPatient((p) => ({ ...p, group: v }))}
              options={HOMEVISIT_GROUPS.map((g) => ({ value: g.value, label: g.label }))}
              placeholder='เลือกกลุ่ม'
            />
          </Field>
          <Field label='เขต'>
            <Select
              showLabel={false} showHelperText={false} searchable={false} size='lg'
              value={newPatient.district}
              onChange={(v) => setNewPatient((p) => ({ ...p, district: v }))}
              options={centerDistrictOptions}
              placeholder='เลือกเขต'
            />
          </Field>
          <Field label='เวลานัด'>
            <InputField
              showLabel={false} showHelperText={false}
              value={newPatient.appointmentTime}
              onChange={(v) => setNewPatient((p) => ({ ...p, appointmentTime: v }))}
              placeholder='เช่น 09:00'
            />
          </Field>
        </div>
      </Popup>

      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกนัดหมายเยี่ยมบ้าน'
        subtitle={cancelTarget ? `${cancelTarget.confidential ? 'ผู้รับบริการ (ข้อมูลลับ)' : cancelTarget.name} · HN: ${cancelTarget?.hn}` : ''}
        /* ปุ่มรองเป็น "ปิด" (มติผู้ใช้ 30 ส.ค. 69) — ป๊อปอัปนี้ไม่ได้กลับไปแก้อะไร
           แค่ปิดหน้าต่างแล้วนัดยังอยู่เหมือนเดิม */
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกนัด', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          {/* การ์ดผู้รับบริการในป๊อปอัป (มติผู้ใช้ 30 ส.ค. 69) — คนกดยกเลิกต้องเห็น
              ว่ากำลังยกเลิกนัดของใคร ไม่ใช่อ่านจากบรรทัดหัวข้อบรรทัดเดียว
              เคสข้อมูลลับไม่ส่งโปรไฟล์จริงเข้าไป */}
          {cancelTarget && !cancelTarget.confidential && (
            <PatientCard
              embedded
              showBack={false}
              showMedicalHistory={false}
              patient={getPatientByHN(cancelTarget.hn) || { name: cancelTarget.name, hn: cancelTarget.hn }}
            />
          )}
          <SuggestibleTextarea
            label='เหตุผลการยกเลิกนัด'
            required
            voice
            value={cancelReason}
            onChange={(e) => { setCancelReason(e.target.value); if (e.target.value.trim()) setCancelError(''); }}
            suggestions={HOMEVISIT_CANCEL_REASONS}
            minChars={2}
            placeholder='เช่น ครอบครัวขอเลื่อน / ผู้รับบริการเข้ารับการรักษาในโรงพยาบาล'
          />
          {/* เหลือเฉพาะข้อความ error — คำอธิบายว่าระบบบันทึกผู้ยกเลิก/เวลาให้เอง
              ถูกถอดออก (มติผู้ใช้ 30 ส.ค. 69) */}
          {cancelError && (
            <span style={{
              color: 'var(--text-input-errorHelper, #DC2626)',
              fontSize: 'var(--type-size-xs)',
            }}>
              {cancelError}
            </span>
          )}
        </div>
      </Popup>

      <ScreeningConfirmPopup
        open={!!acceptTarget}
        description='ยืนยันการรับผู้รับบริการเข้าสู่แบบบันทึกประเมินการเยี่ยมบ้าน'
        patient={acceptTarget ? {
          ...(getPatientByHN(acceptTarget.hn) || {}),
          fullName: getPatientByHN(acceptTarget.hn)?.fullName || acceptTarget.name,
          hn: acceptTarget.hn,
          /* เคสข้อมูลลับไม่โชว์รูปจริงในป๊อปอัปเช่นกัน */
          avatarUrl: acceptTarget.confidential ? undefined : getPatientByHN(acceptTarget.hn)?.avatarUrl,
        } : undefined}
        onConfirm={confirmAccept}
        onCancel={() => setAcceptTarget(null)}
      />

      <Popup
        open={!!quotaTarget}
        onClose={() => setQuotaTarget(null)}
        title='ขออนุมัติเยี่ยมเกินโควตาสิทธิ สปสช.'
        subtitle={quotaTarget ? `${quotaTarget.confidential ? 'ผู้รับบริการ (ข้อมูลลับ)' : quotaTarget.name} · HN: ${quotaTarget.hn}` : ''}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setQuotaTarget(null) }}
        primaryAction={{ label: 'อนุมัติและเปิดแบบบันทึก', onClick: confirmQuotaOverride }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <NoticeBand tone='danger' icon='block'>
            {quotaTarget?.quota?.message}
          </NoticeBand>
          <SuggestibleTextarea
            label='เหตุผลที่จำเป็นต้องเยี่ยมเกินโควตา'
            required
            voice
            value={quotaReason}
            onChange={(e) => { setQuotaReason(e.target.value); if (e.target.value.trim()) setQuotaError(''); }}
            suggestions={QUOTA_OVERRIDE_REASONS}
            minChars={2}
            placeholder='เช่น อาการทรุดลงเฉียบพลัน จำเป็นต้องเยี่ยมเพิ่มเพื่อความปลอดภัยของผู้ป่วย'
          />
          <span style={{
            color: quotaError ? 'var(--text-input-errorHelper, #DC2626)' : 'var(--text-content-tertiary, #858C92)',
            fontSize: 'var(--type-size-xs)',
          }}>
            {quotaError || 'ระบบบันทึกผู้อนุมัติและเวลาไว้กับนัดนี้ — การเยี่ยมนอกโควตาจะไม่ถูกส่งเบิกอัตโนมัติ '
              + 'และต้องใช้งบประมาณของสำนักอนามัยแทน'}
          </span>
        </div>
      </Popup>

      <ExportFormatPopup
        open={!!exportReport}
        report={exportReport}
        onClose={() => setExportReport(null)}
        onExported={() => setExportDone(true)}
      />
      <SuccessToast
        open={exportDone}
        message='นำส่งออกรายงานคิวเยี่ยมบ้านแล้ว — ระบบบันทึก log การส่งออกข้อมูล'
        onClose={() => setExportDone(false)}
      />

      <HomeVisitMapPopup
        open={!!mapTarget}
        row={mapTarget}
        onClose={() => setMapTarget(null)}
        onSaved={() => setTick((t) => t + 1)}
      />

      <HomeVisitAccessGate subject='คิวนัดหมายเยี่ยมบ้าน'>
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            paddingTop: 'var(--dim-space-600, 24px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
            paddingLeft: 'var(--dim-space-600, 24px)',
            paddingRight: 'var(--dim-space-600, 24px)',
            gap: 'var(--dim-space-600, 24px)',
          }}
        >
          <div
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              boxShadow: 'var(--shadow-card-strong)',
              paddingTop: 'var(--dim-space-600, 24px)',
              paddingBottom: 'var(--dim-space-600, 24px)',
              paddingLeft: 'var(--dim-space-600, 24px)',
              paddingRight: 'var(--dim-space-600, 24px)',
              gap: 'var(--dim-space-600, 24px)',
            }}
          >
            <div className='w-full flex items-start' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <div className='flex-1 min-w-0' />
              <PrimarySearch
                value={searchQ}
                onChange={setSearchQ}
                onSubmit={(label, item) => {
                  setSearchQ(label);
                  const match = resolveSearchRow(label, item);
                  pushHistory(match ? rowToSearchItem(match) : (item ?? label));
                  if (match) openRecord(match);
                }}
                suggestions={searchSuggestions}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                placeholder='ค้นหา HN / ชื่อผู้รับบริการ / ผู้รับผิดชอบ / ชุมชน'
                width={640}
              />
              <div className='flex-1 min-w-0 flex justify-end'>
                <NeutralSubdueButton
                  leadingIcon='ios_share'
                  size='sm'
                  collapseLabelBelow='lg'
                  onClick={() => setExportReport(buildExportReport())}
                >
                  นำส่งออกรายงาน
                </NeutralSubdueButton>
              </div>
            </div>

            <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
                <FilterDropdown
                  prefix='กลุ่ม:'
                  options={[{ value: 'all', label: 'ทุกกลุ่ม' }, ...HOMEVISIT_GROUPS.map((g) => ({ value: g.value, label: g.short }))]}
                  value={filters.group}
                  onChange={(v) => setFilters((f) => ({ ...f, group: v }))}
                />
                <FilterDropdown
                  prefix='ทีม/วิชาชีพ:'
                  options={[{ value: 'all', label: 'ทุกวิชาชีพ' }, ...HOMEVISIT_PROFESSIONS.map((p) => ({ value: p.value, label: p.label }))]}
                  value={filters.profession}
                  onChange={(v) => setFilters((f) => ({ ...f, profession: v }))}
                />
                <FilterDropdown
                  prefix='แหล่งรับเข้า:'
                  options={[{ value: 'all', label: 'ทุกแหล่ง' }, ...HOMEVISIT_SOURCES.map((s) => ({ value: s.value, label: s.short }))]}
                  value={filters.source}
                  onChange={(v) => setFilters((f) => ({ ...f, source: v }))}
                />
                <FilterDropdown
                  prefix='สถานะ:'
                  options={[{ value: 'all', label: 'ทุกสถานะ' }, ...HOMEVISIT_STATUSES.map((st) => ({ value: st.value, label: st.label }))]}
                  value={filters.status}
                  onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
                />
                <FilterDropdown
                  prefix='เขต:'
                  options={districtOptions}
                  value={districtFilter}
                  onChange={(v) => setFilters((f) => ({ ...f, district: v }))}
                />
                {/* ถอดตัวกรอง "วันนัด" และ "ช่วงเวลา" ออก (มติผู้ใช้ 30 ส.ค. 69) —
                    แท็บสถานะบอกอยู่แล้วว่ากำลังดูชุดไหน และตัวกรองวันนัดที่ตั้งค้าง
                    เป็น "วันนี้" ทำให้แท็บอื่น (เช่น เยี่ยมเสร็จแล้ว) ขึ้นศูนย์รายการ
                    ทั้งที่มีข้อมูลอยู่ */}
                <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
              </OverflowFlexRow>
              {/* สลับ รายการ ↔ แผนที่ — อยู่ท้ายแถวตัวกรอง (นอก OverflowFlexRow
                  เพื่อไม่ให้ถูกยุบเข้าเมนู "เพิ่มเติม" เวลาจอแคบ) */}
              <ViewToggle
                value={view}
                onChange={setView}
                options={HOMEVISIT_VIEW_OPTIONS}
              />
            </div>

            <SmoothFilterResults opaque={resultsOpaque}>
            {role === 'volunteer' && (
              <NoticeBand tone='info' icon='volunteer_activism'>
                {volunteerScopeNote()}
                {hiddenByRole > 0 ? ` — ขณะนี้ซ่อนอยู่ ${hiddenByRole} เคส` : ''}
              </NoticeBand>
            )}

            <SearchResultCount found={sortedRows.length} total={rows.length} />

            {/* แท็บ "เลยกำหนดติดตาม" ไม่กรองตามวันนัด — ต้องบอกไว้ ไม่งั้น
                ตัวกรองวันนัดที่ตั้งค้างอยู่จะดูเหมือนไม่ทำงาน */}
            {activeTab === 'overdue' && (
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                แท็บนี้ไม่กรองตามวันนัด — แสดงทุกรายที่เลยรอบติดตามของกลุ่ม
              </span>
            )}

            {activeTab === 'overdue' && rows.filter(TAB_PREDICATE.overdue).length > 0 && (
              <NoticeBand tone='warning' icon='running_with_errors'>
                รายชื่อในแท็บนี้เลยรอบ “เยี่ยม/ติดตามประเมินผล” ตามกลุ่มผู้รับบริการแล้ว
                (ระยะสุดท้าย 30 วัน · เรื้อรัง/พิการช่วยเหลือไม่ได้ 6 เดือน · กลุ่มอื่นปีละครั้ง)
                — ควรนัดเยี่ยมใหม่หรือบันทึกเหตุผลที่ยังติดตามไม่ได้
              </NoticeBand>
            )}

            {view === 'map' ? (
              <HomeVisitRouteMapPanel
                stops={mapStops}
                selectedId={selectedStopId || mapStops[0]?.id}
                onSelect={setSelectedStopId}
                onOpenRecord={openRecord}
                onClearFilters={filtersActive ? clearFilters : undefined}
              />
            ) : rows.length === 0 ? (
              <EmptyHint icon='event_busy'>
                ยังไม่มีนัดหมายเยี่ยมบ้านในระบบ — เพิ่มผู้รับบริการที่หน้าทะเบียนก่อน แล้วจึงนัดหมายออกเยี่ยม
              </EmptyHint>
            ) : sortedRows.length === 0 ? (
              <EmptyHint
                icon='filter_alt_off'
                action={(
                  <NeutralSubdueButton variant='outline' leadingIcon='restart_alt' onClick={clearFilters}>
                    ล้างตัวกรอง
                  </NeutralSubdueButton>
                )}
              >
                ไม่พบนัดเยี่ยมที่ตรงกับเงื่อนไข ({filterSummary || 'ตัวกรองปัจจุบัน'}) — ปรับหรือล้างตัวกรองแล้วลองอีกครั้ง
              </EmptyHint>
            ) : (
              <>
                <Table
                  columns={columns}
                  rows={pageRows}
                  rowKey={(r) => r.id}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  /* กดแถว → ป๊อปอัปยืนยันรับผู้ป่วย → เข้าแบบบันทึก · เคสเกินโควตา
                     เด้งป๊อปอัปขออนุมัติแทน (ด่าน §1.18.1 อยู่ใน `startRecord`) */
                  onRowClick={(r) => (r.cancellation ? undefined : requestOpenRecord(r))}
                  stickyColCount={3}
                  stickyHeaderTop={QUEUE_STICKY_UNDER_STATUS_TABS}
                  emptyMessage='ไม่พบนัดเยี่ยมที่ตรงกับเงื่อนไข'
                />
                <div
                  className='flex items-center w-full'
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
                  <span style={{
                    color: 'var(--text-content-secondary)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm)',
                  }}>
                    {`แสดง ${rangeStart}–${rangeEnd} จาก ${sortedRows.length} รายการ`}
                  </span>
                  <div className='flex-1' />
                  <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
                </div>
              </>
            )}
            </SmoothFilterResults>
          </div>
        </div>
      </HomeVisitAccessGate>
    </QueuePageShell>
  );
};

export default HomeVisitQueuePage;
