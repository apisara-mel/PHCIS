import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import PhotoUploadField from '@/components/forms/PhotoUploadField';
import AddressMapBlock from '@/components/forms/AddressMapBlock';
import SelectableOptionCard from '@/components/card/SelectableOptionCard';
import PatientCard from '@/components/card/PatientCard';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Popup from '@/components/popup/Popup';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  HOMEVISIT_GROUPS,
  HOMEVISIT_SOURCES,
  HOMEVISIT_PROFESSIONS,
  HOMEVISIT_STAFF,
  HOMEVISIT_DISTRICTS,
  HOMEVISIT_FLAGS,
  HOMEVISIT_ILLNESS_SUGGESTIONS,
  formatHomeVisitDate,
  todayIsoDate,
  isAutoReceivedSource,
  resolveGroup,
  resolveSource,
  resolveProfession,
} from '@/data/homevisitVisits';
import {
  REGISTRY_NOTE_SUGGESTIONS,
  REGISTRY_CANCEL_SUGGESTIONS,
  getRegistryEntries,
  findRegistryEntryByHn,
  upsertRegistryEntry,
  cancelRegistryEntry,
  reactivateRegistryEntry,
  getRegistryCancellation,
  getSmartCardPresent,
  setSmartCardPresent,
  readSmartCard,
} from '@/data/homevisitRegistry';
import { printHomeVisitRegistry } from '@/pages/homevisit/homevisitPrint';
import {
  HomeVisitAccessGate,
  AccessDemoToggle,
  GroupBadge,
  SourceBadge,
  FlagBadges,
  TopicHeader,
  Field,
  SectionCard,
  EmptyHint,
  NoticeBand,
  AuditStamp,
  GREYED,
  dateFilterToIsoRange,
} from '@/pages/homevisit/homevisitShared';

/* HomeVisitRegistryPage — ทะเบียนผู้รับบริการเยี่ยมบ้าน (TOR 1.10.12.1,
   ต่อเนื่องถึง 1.18.2 ปักหมุดตำแหน่งบ้าน).

   ใช้ registry pattern ตาม playbook §3 (PharmacyRegistryPage / Addiction
   RegistryPage): หน้าเดียวถือทั้งรายการและฟอร์มสร้าง/แก้ไข ครบทั้ง 4 กริยา
     แสดง   — แท็บตามกลุ่ม + ตาราง + เปิดอ่านรายการที่ยกเลิกแล้วแบบอ่านอย่างเดียว
     บันทึก — อ่าน Smart card (mock) เติมข้อมูลบัตร → เลือกกลุ่ม 6 ประเภท →
              ปักหมุดบ้าน → upsertRegistryEntry (data layer ประทับผู้บันทึก+เวลา)
     แก้ไข  — ฟอร์มเดิม prefilled พร้อมแถบ audit ผู้บันทึก/ผู้แก้ไข
     ยกเลิก — popup เหตุผล; แถวยังอยู่ (เทา) พร้อมปุ่มเปิดใช้งานอีกครั้ง

   เคสที่ "รับต่อจากระบบอื่น" (HHC / HV / Health Desk–HV / มารดาและทารก–HV
   ตามคู่มือระบบเดิม §2.2) จะล็อกช่องประเภทรับเข้าและแสดงแถบแหล่งที่รับมา;
   เคส "ศูนย์พบเอง" แก้ไขได้อิสระ. */

const breadcrumb = ['ระบบเยี่ยมบ้าน', 'ทะเบียนผู้รับบริการเยี่ยมบ้าน'];
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:homevisit-registry';
const PAGE_SIZE = 10;

const GROUP_ICONS = {
  curable: 'healing',
  chronic: 'ecg_heart',
  mildDisability: 'accessible',
  severeDisability: 'bed',
  terminal: 'volunteer_activism',
  special: 'diversity_3',
};

const GROUP_DESCRIPTIONS = {
  curable: 'เจ็บป่วยเฉียบพลัน/หลังผ่าตัด ที่คาดว่าจะหายและยุติการเยี่ยมได้',
  chronic: 'โรคเรื้อรังที่ต้องดูแลต่อเนื่อง เช่น เบาหวาน ความดัน ไตเรื้อรัง',
  mildDisability: 'พิการ/ทุพพลภาพระยะยาว แต่ยังช่วยเหลือตัวเองได้บางส่วน',
  severeDisability: 'พิการ/ทุพพลภาพระยะยาว ช่วยเหลือตัวเองไม่ได้ ต้องพึ่งผู้ดูแล',
  terminal: 'ผู้ป่วยระยะสุดท้าย ดูแลแบบประคับประคองที่บ้าน',
  special: 'กลุ่มเปราะบางอื่น ๆ เช่น อยู่ลำพัง ไร้บ้าน หรือมีปัญหาสังคมซับซ้อน',
};

const EMPTY_FORM = {
  id: '',
  hn: '',
  name: '',
  nationalId: '',
  age: '',
  gender: '',
  group: '',
  source: '',
  district: '',
  community: '',
  address: '',
  home: null,
  responsible: '',
  profession: '',
  registeredDate: '',
  illnessHistory: '',
  contactName: '',
  contactPhone: '',
  flags: [],
  confidential: false,
  note: '',
  photoName: '',
};

const FILTER_DEFAULTS = {
  group: 'all',
  source: 'all',
  district: 'all',
  responsible: 'all',
  dateValue: { quick: 'all' },
};

const DATE_CHIP_LABELS = { all: 'ทุกช่วงเวลา' };

/** patientProfiles เก็บอายุเป็น "52 ปี - 6 เดือน - 2 วัน" — ทะเบียนใช้เฉพาะปี. */
const ageYearsOf = (profile) => {
  const m = /(\d+)/.exec(profile?.age || '');
  return m ? Number(m[1]) : '';
};

const HomeVisitRegistryPage = () => {
  const history = useHistory();

  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [page, setPage] = useState(1);

  /* null = list only · 'new' = create · row id = edit that row */
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [baseline, setBaseline] = useState('');
  const [errors, setErrors] = useState({});
  const [savedBanner, setSavedBanner] = useState(null);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const [cardStatus, setCardStatus] = useState(null); /* {ok, message} */

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  const rows = useMemo(() => getRegistryEntries().map((r) => ({
    ...r,
    cancellation: getRegistryCancellation(r.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [tick]);

  const responsibleOptions = useMemo(() => {
    const names = new Set(rows.map((r) => r.responsible).filter(Boolean));
    HOMEVISIT_STAFF.forEach((s) => names.add(s.name));
    return Array.from(names).map((n) => ({ value: n, label: n }));
  }, [rows]);

  const tabs = useMemo(() => ([
    { key: 'all', label: 'ทั้งหมด', icon: 'group', count: rows.filter((r) => !r.cancellation).length },
    ...HOMEVISIT_GROUPS.map((g) => ({
      key: g.value,
      label: g.short,
      icon: GROUP_ICONS[g.value] || 'person',
      count: rows.filter((r) => !r.cancellation && r.group === g.value).length,
    })),
    { key: 'cancelled', label: 'ยกเลิกทะเบียน', icon: 'block', count: rows.filter((r) => r.cancellation).length },
  ]), [rows]);

  const dateRange = useMemo(() => dateFilterToIsoRange(filters.dateValue), [filters.dateValue]);

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return rows.filter((r) => {
      if (activeTab === 'cancelled') {
        if (!r.cancellation) return false;
      } else if (activeTab !== 'all') {
        if (r.cancellation || r.group !== activeTab) return false;
      } else if (r.cancellation) {
        return false;
      }
      if (filters.group !== 'all' && r.group !== filters.group) return false;
      if (filters.source !== 'all' && r.source !== filters.source) return false;
      if (filters.district !== 'all' && r.district !== filters.district) return false;
      if (filters.responsible !== 'all' && r.responsible !== filters.responsible) return false;
      if (dateRange) {
        if (!r.registeredDate) return false;
        if (r.registeredDate < dateRange.from || r.registeredDate > dateRange.to) return false;
      }
      if (!q) return true;
      return [r.hn, r.name, r.community, r.district, r.responsible, r.nationalId]
        .some((f) => f && String(f).toLowerCase().includes(q));
    });
  }, [rows, activeTab, filters, dateRange, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [activeTab, filters, searchQ]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const summaryCards = useMemo(() => ([
    { key: 'total',    label: 'ทะเบียนทั้งหมด',        value: rows.filter((r) => !r.cancellation).length, color: 'info',        icon: 'contact_page' },
    { key: 'chronic',  label: 'เรื้อรัง/พิการระยะยาว', value: rows.filter((r) => !r.cancellation && ['chronic', 'mildDisability', 'severeDisability'].includes(r.group)).length, color: 'brand', icon: 'ecg_heart' },
    { key: 'terminal', label: 'ระยะสุดท้าย',           value: rows.filter((r) => !r.cancellation && r.group === 'terminal').length, color: 'destructive', icon: 'volunteer_activism' },
    { key: 'special',  label: 'กลุ่มพิเศษ',            value: rows.filter((r) => !r.cancellation && r.group === 'special').length, color: 'inprogress', icon: 'diversity_3' },
    { key: 'nopin',    label: 'ยังไม่ปักหมุดบ้าน',     value: rows.filter((r) => !r.cancellation && !r.home?.pinSaved).length, color: 'positive', icon: 'wrong_location' },
  ]), [rows]);

  /* ── เปิด / ปิดฟอร์ม ─────────────────────────────────────────────── */
  const rowToForm = (row) => ({
    id: row.id,
    hn: row.hn || '',
    name: row.name || '',
    nationalId: row.nationalId || '',
    age: row.age ?? '',
    gender: row.gender || '',
    group: row.group || '',
    source: row.source || '',
    district: row.district || '',
    community: row.community || '',
    address: row.address || '',
    home: row.home || null,
    responsible: row.responsible || '',
    profession: row.profession || '',
    registeredDate: row.registeredDate || '',
    illnessHistory: row.illnessHistory || '',
    contactName: row.contactName || '',
    contactPhone: row.contactPhone || '',
    flags: row.flags || [],
    confidential: !!row.confidential,
    note: row.note || '',
    photoName: row.photoName || '',
  });

  const openCreate = () => {
    const next = { ...EMPTY_FORM, registeredDate: todayIsoDate(), source: 'centerFound' };
    setForm(next);
    setBaseline(JSON.stringify(next));
    setErrors({});
    setCardStatus(null);
    setSavedBanner(null);
    setEditing('new');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEdit = (row) => {
    const next = rowToForm(row);
    setForm(next);
    setBaseline(JSON.stringify(next));
    setErrors({});
    setCardStatus(null);
    setSavedBanner(null);
    setEditing(row.id);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeFormNow = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setBaseline('');
    setErrors({});
    setCardStatus(null);
  };

  const dirty = editing !== null && JSON.stringify(form) !== baseline;
  const requestCloseForm = () => (dirty ? setUnsavedOpen(true) : closeFormNow());

  const setField = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const editingRow = useMemo(
    () => (editing && editing !== 'new' ? rows.find((r) => r.id === editing) || null : null),
    [editing, rows],
  );
  const readOnly = !!(editingRow && editingRow.cancellation);
  const sourceLocked = isAutoReceivedSource(form.source) && editing !== 'new';

  const profile = useMemo(() => (form.hn ? getPatientByHN(form.hn) : null), [form.hn]);

  const duplicate = useMemo(() => {
    if (!form.hn) return null;
    const existing = findRegistryEntryByHn(form.hn.trim());
    if (!existing) return null;
    if (editing !== 'new' && existing.id === form.id) return null;
    return existing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.hn, form.id, editing, tick]);

  const applyHn = (hn) => {
    const clean = String(hn || '').trim();
    const p = getPatientByHN(clean);
    setForm((f) => ({
      ...f,
      hn: clean,
      name: p?.shortName || f.name,
      age: p ? ageYearsOf(p) : f.age,
      gender: p?.sex || f.gender,
      address: p?.address || f.address,
      nationalId: p?.nationalId || f.nationalId,
    }));
    setErrors((e) => ({ ...e, hn: undefined }));
  };

  /* ── อ่านบัตรประชาชน (mock) ─────────────────────────────────────── */
  const handleReadSmartCard = () => {
    const card = readSmartCard();
    if (!card) {
      setCardStatus({
        ok: false,
        message: 'อ่านบัตรประชาชนไม่สำเร็จ — ไม่พบบัตรในเครื่องอ่านหรือเครื่องอ่านไม่พร้อมใช้งาน กรุณากรอกข้อมูลด้วยตนเอง',
      });
      return;
    }
    setForm((f) => ({
      ...f,
      nationalId: card.nationalId,
      name: card.name,
      gender: card.gender,
      age: card.age,
      address: card.address,
      district: card.district || f.district,
      hn: f.hn || card.hn || '',
    }));
    setErrors((e) => ({ ...e, nationalId: undefined, name: undefined, address: undefined }));
    setCardStatus({
      ok: true,
      message: `อ่านบัตรประชาชนสำเร็จเมื่อ ${card.readAt} — เติมเลขบัตร ชื่อ-สกุล และที่อยู่ตามบัตรให้แล้ว (ตรวจสอบและแก้ไขที่อยู่ปัจจุบันได้)`,
    });
  };

  const toggleFlag = (key) => setForm((f) => ({
    ...f,
    flags: f.flags.includes(key) ? f.flags.filter((k) => k !== key) : [...f.flags, key],
  }));

  /* ── บันทึก ─────────────────────────────────────────────────────── */
  const save = () => {
    const next = {};
    if (!form.hn.trim()) next.hn = 'กรุณาระบุ HN ผู้รับบริการ';
    else if (!getPatientByHN(form.hn.trim())) next.hn = `ไม่พบ HN ${form.hn.trim()} ในทะเบียนผู้ป่วย — ตรวจสอบอีกครั้ง`;
    else if (duplicate && editing === 'new') {
      next.hn = `HN ${form.hn.trim()} มีทะเบียนเยี่ยมบ้านอยู่แล้ว (${duplicate.name}) — ให้แก้ไขรายการเดิมแทนการสร้างซ้ำ`;
    }
    if (!form.name.trim()) next.name = 'กรุณาระบุชื่อ-นามสกุลผู้รับบริการ';
    if (!form.group) next.group = 'กรุณาเลือกกลุ่มผู้รับบริการ 1 ใน 6 กลุ่ม';
    if (!form.source) next.source = 'กรุณาเลือกประเภทรับเข้า';
    if (!form.district) next.district = 'กรุณาเลือกเขตที่อยู่ปัจจุบัน';
    if (!form.address.trim()) next.address = 'กรุณาระบุที่อยู่ปัจจุบันที่จะไปเยี่ยม';
    if (!form.responsible) next.responsible = 'กรุณาเลือกผู้รับผิดชอบ';
    if (!String(form.illnessHistory || '').trim()) next.illnessHistory = 'กรุณาบันทึกประวัติการเจ็บป่วยโดยสังเขป';

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    const staff = HOMEVISIT_STAFF.find((s) => s.name === form.responsible);
    const saved = upsertRegistryEntry({
      id: form.id || undefined,
      hn: form.hn.trim(),
      name: form.name.trim(),
      nationalId: form.nationalId.trim(),
      age: form.age === '' ? undefined : Number(form.age),
      gender: form.gender,
      group: form.group,
      source: form.source,
      district: form.district,
      community: form.community.trim(),
      address: form.address.trim(),
      home: form.home,
      responsible: form.responsible,
      profession: form.profession || staff?.profession || 'nurse',
      registeredDate: form.registeredDate || todayIsoDate(),
      illnessHistory: form.illnessHistory.trim(),
      contactName: form.contactName.trim(),
      contactPhone: form.contactPhone.trim(),
      flags: form.flags,
      confidential: form.confidential,
      note: form.note.trim(),
      photoName: form.photoName,
      active: true,
      visitCount: editingRow?.visitCount ?? 0,
      lastVisitDate: editingRow?.lastVisitDate ?? null,
    });
    setTick((t) => t + 1);
    closeFormNow();
    setSavedBanner({ name: saved.name, hn: saved.hn, isNew: editing === 'new' });
  };

  /* ── ยกเลิก / เปิดใช้งานอีกครั้ง ────────────────────────────────── */
  const openCancel = (row) => {
    setCancelReason('');
    setCancelError('');
    setCancelTarget(row);
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('กรุณาระบุเหตุผลการยกเลิกทะเบียน');
      return;
    }
    cancelRegistryEntry(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };

  const reactivate = (row) => {
    reactivateRegistryEntry(row.id);
    setTick((t) => t + 1);
  };

  /* ── ค้นหา ───────────────────────────────────────────────────────── */
  const rowToSearchItem = (r) => ({
    id: r.id,
    label: r.confidential ? `ผู้รับบริการ HN ${r.hn} (ข้อมูลลับ)` : r.name,
    sublabel: `${resolveGroup(r.group)?.short || '—'} · ${r.responsible || '—'}`,
    value: r.confidential ? r.hn : r.name,
    badges: [{ label: r.hn, tone: 'indigo' }],
    avatarSrc: r.confidential ? undefined : getPatientByHN(r.hn)?.avatarUrl,
  });

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return rows
      .filter((r) => [r.hn, r.name, r.community, r.responsible].some((f) => f && String(f).toLowerCase().includes(q)))
      .slice(0, 8)
      .map(rowToSearchItem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, rows]);

  /* ── ตัวกรอง / สรุป ─────────────────────────────────────────────── */
  const filtersActive = searchQ.trim() !== ''
    || filters.group !== 'all'
    || filters.source !== 'all'
    || filters.district !== 'all'
    || filters.responsible !== 'all'
    || (filters.dateValue?.quick || 'all') !== 'all'
    || activeTab !== 'all';

  const clearFilters = () => {
    setSearchQ('');
    setFilters(FILTER_DEFAULTS);
    setActiveTab('all');
  };

  const filterSummary = [
    activeTab === 'all' ? null : tabs.find((t) => t.key === activeTab)?.label,
    filters.group === 'all' ? null : resolveGroup(filters.group)?.label,
    filters.source === 'all' ? null : `แหล่งรับเข้า ${resolveSource(filters.source)?.short}`,
    filters.district === 'all' ? null : filters.district,
    filters.responsible === 'all' ? null : `ผู้รับผิดชอบ ${filters.responsible}`,
    dateRange ? `ลงทะเบียน ${formatHomeVisitDate(dateRange.from)} – ${formatHomeVisitDate(dateRange.to)}` : null,
    searchQ.trim() ? `ค้นหา "${searchQ.trim()}"` : null,
  ].filter(Boolean).join(' · ');

  const doPrint = () => printHomeVisitRegistry(
    filtered.map((r) => ({
      ...r,
      groupLabel: resolveGroup(r.group)?.short,
      sourceLabel: resolveSource(r.source)?.short,
      statusLabel: r.cancellation ? 'ยกเลิกทะเบียน' : 'ใช้งาน',
    })),
    filterSummary || 'ทั้งหมด',
  );

  /* ── คอลัมน์ตาราง ────────────────────────────────────────────────── */
  const columns = useMemo(() => ([
    { key: 'hn', label: 'HN', render: (r) => <span style={r.cancellation ? GREYED : undefined}>{r.hn}</span> },
    {
      key: 'name', label: 'ชื่อ-สกุล', flex: true, minWidth: 190,
      render: (r) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          {r.confidential ? (
            <MaskedWorklistName name={r.name} recordKey={r.id} onRevealedClick={() => openEdit(r)} />
          ) : (
            <span style={r.cancellation ? GREYED : { fontWeight: 'var(--type-weight-medium)' }}>{r.name}</span>
          )}
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {`${r.age ?? '—'} ปี / ${r.gender || '—'}`}
          </span>
          <FlagBadges group={r.group} flags={r.flags} />
        </div>
      ),
    },
    { key: 'group', label: 'กลุ่มผู้รับบริการ', render: (r) => <GroupBadge group={r.group} /> },
    { key: 'source', label: 'ประเภทรับเข้า', render: (r) => <SourceBadge source={r.source} /> },
    {
      key: 'place', label: 'ที่อยู่/ชุมชน', flex: true, minWidth: 240,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={r.cancellation ? GREYED : undefined}>{r.community || '—'} · {r.district || '—'}</span>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {r.home?.pinSaved
              ? `ปักหมุดแล้ว (${r.home.lat.toFixed(4)}, ${r.home.lng.toFixed(4)})`
              : 'ยังไม่ได้ปักหมุดตำแหน่งบ้าน'}
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
      key: 'registeredDate', label: 'ลงทะเบียน/เยี่ยมล่าสุด',
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={r.cancellation ? GREYED : undefined}>{formatHomeVisitDate(r.registeredDate)}</span>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {r.lastVisitDate ? `เยี่ยมล่าสุด ${formatHomeVisitDate(r.lastVisitDate)}` : 'ยังไม่เคยออกเยี่ยม'}
            {r.visitCount ? ` · ${r.visitCount} ครั้ง` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'status', label: 'สถานะทะเบียน', sortable: false,
      render: (r) => (r.cancellation ? (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกทะเบียน</ColorfulBadge>
          <span style={{ fontSize: 'var(--type-size-xs)', ...GREYED }}>
            ยกเลิกโดย {r.cancellation.by} · {r.cancellation.at}
            <br />เหตุผล: {r.cancellation.reason}
          </span>
        </div>
      ) : (
        <ColorfulBadge style='green' size='small' hierarchy='secondary'>ใช้งาน</ColorfulBadge>
      )),
    },
    {
      key: 'recordedBy', label: 'ผู้บันทึก', sortable: false,
      render: (r) => (
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary, #636B72)' }}>
          {r.recordedBy}<br />{r.recordedAt}
          {r.editedBy && <><br />แก้ไข: {r.editedBy} · {r.editedAt}</>}
        </span>
      ),
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {r.cancellation ? (
            <>
              <BrandSubdueButton
                variant='outline' size='sm' leadingIcon='restart_alt'
                onClick={(e) => { e.stopPropagation(); reactivate(r); }}
              >
                เปิดใช้งานอีกครั้ง
              </BrandSubdueButton>
              <NeutralSubdueButton size='sm' leadingIcon='eye' onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                ดูข้อมูล
              </NeutralSubdueButton>
            </>
          ) : (
            <>
              <BrandSubdueButton
                variant='outline' size='sm' leadingIcon='edit'
                onClick={(e) => { e.stopPropagation(); openEdit(r); }}
              >
                แก้ไข
              </BrandSubdueButton>
              <NeutralSubdueButton
                size='sm' leadingIcon='monitoring'
                onClick={(e) => {
                  e.stopPropagation();
                  history.push(`/homevisit/follow-up?hn=${encodeURIComponent(r.hn)}`);
                }}
              >
                ดูการติดตาม
              </NeutralSubdueButton>
              <NeutralSubdueButton
                size='sm' leadingIcon='block'
                onClick={(e) => { e.stopPropagation(); openCancel(r); }}
              >
                ยกเลิก
              </NeutralSubdueButton>
            </>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick, rows]);

  return (
    <QueuePageShell
      activeKey='homevisit'
      breadcrumb={breadcrumb}
      title='ทะเบียนผู้รับบริการเยี่ยมบ้าน'
      onBack={() => history.push('/homevisit')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <AccessDemoToggle onRevoked={() => setTick((t) => t + 1)} />
          <NeutralSubdueButton
            variant='outline' size='sm'
            leadingIcon={getSmartCardPresent() ? 'credit_card' : 'credit_card_off'}
            onClick={() => { setSmartCardPresent(!getSmartCardPresent()); setTick((t) => t + 1); }}
          >
            {getSmartCardPresent() ? 'จำลองไม่มีบัตรในเครื่องอ่าน' : 'จำลองมีบัตรในเครื่องอ่าน'}
          </NeutralSubdueButton>
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='print' onClick={doPrint}>
            พิมพ์ทะเบียน
          </NeutralSubdueButton>
          <BrandSubdueButton variant='fill' leadingIcon='person_add' onClick={openCreate}>
            ลงทะเบียนผู้รับบริการ
          </BrandSubdueButton>
        </div>
      )}
      summaryCards={summaryCards}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกทะเบียนผู้รับบริการเยี่ยมบ้าน'
        subtitle={cancelTarget ? `${cancelTarget.confidential ? 'ผู้รับบริการ (ข้อมูลลับ)' : cancelTarget.name} · HN: ${cancelTarget?.hn}` : ''}
        tertiaryAction={{ label: 'กลับไปแก้ต่อ', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกทะเบียน', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <SuggestibleTextarea
            label='เหตุผลการยกเลิก'
            required
            voice
            value={cancelReason}
            onChange={(e) => { setCancelReason(e.target.value); if (e.target.value.trim()) setCancelError(''); }}
            suggestions={REGISTRY_CANCEL_SUGGESTIONS}
            minChars={2}
            placeholder='เช่น ย้ายออกนอกพื้นที่ / ครอบครัวปฏิเสธการเยี่ยม'
          />
          <span style={{
            color: cancelError ? 'var(--text-input-errorHelper, #DC2626)' : 'var(--text-content-tertiary, #858C92)',
            fontSize: 'var(--type-size-xs)',
          }}>
            {cancelError || 'ต้องระบุเหตุผล — ระบบบันทึกผู้ยกเลิกและเวลาให้อัตโนมัติ ทะเบียนจะยังแสดงอยู่และเปิดใช้งานใหม่ได้'}
          </span>
        </div>
      </Popup>

      <UnsavedChangesPopup
        open={unsavedOpen}
        onClose={() => setUnsavedOpen(false)}
        onSave={() => { setUnsavedOpen(false); save(); }}
        onDiscard={() => { setUnsavedOpen(false); closeFormNow(); }}
        title='ออกจากแบบฟอร์มทะเบียนโดยยังไม่บันทึก?'
        description='ข้อมูลที่กรอกไว้จะหายไปหากออกโดยไม่บันทึก — เลือก “บันทึก” เพื่อบันทึกทะเบียนก่อนออก'
      />

      <HomeVisitAccessGate subject='ทะเบียนผู้รับบริการเยี่ยมบ้าน'>
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
          {savedBanner && (
            <NoticeBand tone='info' icon='check-circle'>
              {savedBanner.isNew
                ? `ลงทะเบียน ${savedBanner.name} (HN ${savedBanner.hn}) เข้าทะเบียนผู้รับบริการเยี่ยมบ้านแล้ว`
                : `บันทึกการแก้ไขทะเบียนของ ${savedBanner.name} (HN ${savedBanner.hn}) แล้ว`}
            </NoticeBand>
          )}

          {/* ── ฟอร์มลงทะเบียน / แก้ไข ─────────────────────────────── */}
          {editing !== null && (
            <section
              className='w-full flex flex-col'
              style={{
                background: 'var(--surface-card-100, #FFFFFF)',
                borderRadius: 'var(--dim-radius-500, 16px)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
                boxShadow: 'var(--shadow-card-strong)',
                paddingTop: 'var(--dim-space-600, 24px)',
                paddingBottom: 'var(--dim-space-600, 24px)',
                paddingLeft: 'var(--dim-space-600, 24px)',
                paddingRight: 'var(--dim-space-600, 24px)',
                gap: 'var(--dim-space-600, 24px)',
              }}
            >
              <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <h1 className='text-base font-bold' style={{ color: 'var(--text-content-default, #363B3F)' }}>
                  {editing === 'new' ? 'ลงทะเบียนผู้รับบริการเยี่ยมบ้าน' : `แก้ไขทะเบียน — ${form.name || form.hn}`}
                </h1>
                {readOnly && <ColorfulBadge style='grey' size='small' hierarchy='secondary'>อ่านอย่างเดียว</ColorfulBadge>}
                {form.group && <GroupBadge group={form.group} />}
                {form.source && <SourceBadge source={form.source} />}
                <div className='flex-1' />
                <NeutralSubdueButton size='sm' leadingIcon='close' onClick={requestCloseForm}>ปิดแบบฟอร์ม</NeutralSubdueButton>
              </div>

              {readOnly && (
                <NoticeBand tone='warning' icon='lock'>
                  ทะเบียนนี้ถูกยกเลิกโดย {editingRow?.cancellation?.by} เมื่อ {editingRow?.cancellation?.at}
                  {' '}(เหตุผล: {editingRow?.cancellation?.reason}) — กด “เปิดใช้งานอีกครั้ง” ที่ตารางก่อนจึงจะแก้ไขได้
                </NoticeBand>
              )}

              {duplicate && (
                <NoticeBand tone='warning' icon='content_copy'>
                  HN {form.hn} มีทะเบียนเยี่ยมบ้านอยู่แล้ว ({duplicate.name} · ลงทะเบียน {formatHomeVisitDate(duplicate.registeredDate)}) —
                  ควรแก้ไขรายการเดิมแทนการสร้างซ้ำ{' '}
                  <button
                    type='button'
                    onClick={() => openEdit(rows.find((r) => r.id === duplicate.id) || duplicate)}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                      color: 'var(--text-brandPrimary-default, #007549)',
                      fontWeight: 'var(--type-weight-bold)', textDecoration: 'underline',
                    }}
                  >
                    เปิดแก้ไขรายการเดิม
                  </button>
                </NoticeBand>
              )}

              {cardStatus && (
                <NoticeBand tone={cardStatus.ok ? 'info' : 'danger'} icon={cardStatus.ok ? 'credit_card' : 'credit_card_off'}>
                  {cardStatus.message}
                </NoticeBand>
              )}

              {/* §1 ข้อมูลผู้รับบริการ + อ่านบัตร */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <TopicHeader
                  icon='person'
                  aside={(
                    <BrandPrimaryButton size='md' leadingIcon='credit_card' onClick={handleReadSmartCard} disabled={readOnly}>
                      อ่านข้อมูลจากบัตรประชาชน
                    </BrandPrimaryButton>
                  )}
                >
                  ข้อมูลผู้รับบริการ
                </TopicHeader>

                <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <Field label='HN' required error={errors.hn} hint='พิมพ์ HN แล้วระบบจะดึงชื่อ อายุ เพศ และที่อยู่จากทะเบียนผู้ป่วยให้'>
                    <InputField
                      showLabel={false} showHelperText={false}
                      value={form.hn} onChange={applyHn}
                      disabled={readOnly || editing !== 'new'}
                      placeholder='เช่น 67-00005'
                      error={errors.hn ? ' ' : undefined}
                    />
                  </Field>
                  <Field label='เลขบัตรประชาชน' hint='เติมอัตโนมัติเมื่ออ่านบัตรสำเร็จ'>
                    <InputField
                      showLabel={false} showHelperText={false}
                      value={form.nationalId} onChange={setField('nationalId')}
                      disabled={readOnly} placeholder='13 หลัก'
                    />
                  </Field>
                  <Field label='ชื่อ-นามสกุล' required error={errors.name}>
                    <InputField
                      showLabel={false} showHelperText={false}
                      value={form.name} onChange={setField('name')}
                      disabled={readOnly} placeholder='ชื่อ-นามสกุลผู้รับบริการ'
                      error={errors.name ? ' ' : undefined}
                    />
                  </Field>
                  <Field label='อายุ (ปี)'>
                    <InputField showLabel={false} showHelperText={false} value={String(form.age ?? '')} onChange={setField('age')} disabled={readOnly} placeholder='ปี' />
                  </Field>
                  <Field label='เพศ'>
                    <Select
                      showLabel={false} showHelperText={false} searchable={false} size='lg'
                      value={form.gender} onChange={setField('gender')} disabled={readOnly}
                      options={[{ value: 'ชาย', label: 'ชาย' }, { value: 'หญิง', label: 'หญิง' }]}
                      placeholder='เลือกเพศ'
                    />
                  </Field>
                  <Field label='วันที่ลงทะเบียน'>
                    <DatePicker
                      showLabel={false}
                      value={form.registeredDate ? new Date(form.registeredDate) : null}
                      onChange={(d) => setField('registeredDate')(d ? d.toISOString().slice(0, 10) : '')}
                      disabled={readOnly}
                      placeholder='เลือกวันที่'
                    />
                  </Field>
                </div>

                <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <div className='flex flex-col' style={{ gap: 'var(--dim-space-150, 6px)', minWidth: 260 }}>
                    <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                      รูปผู้รับบริการ
                    </span>
                    <PhotoUploadField
                      label={form.photoName ? `เปลี่ยนรูป (${form.photoName})` : 'ถ่าย/อัปโหลดรูปผู้รับบริการ'}
                      icon='photo_camera'
                      capture='environment'
                      disabled={readOnly}
                      onFiles={(files) => {
                        const file = files && files[0];
                        if (file) setField('photoName')(file.name);
                      }}
                    />
                    <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                      ใช้ยืนยันตัวบุคคลเมื่อออกเยี่ยม — เก็บในเวชระเบียนของผู้รับบริการ
                    </span>
                  </div>
                  {profile ? (
                    <div className='flex-1 min-w-0' style={{ minWidth: 320 }}>
                      <PatientCard patient={profile} compact title='ข้อมูลทั่วไปผู้รับบริการ' />
                    </div>
                  ) : (
                    <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
                      ยังไม่ได้ระบุ HN ที่ถูกต้อง — ข้อมูลทั่วไปผู้รับบริการจะแสดงเมื่อพบทะเบียนผู้ป่วย
                    </span>
                  )}
                </div>
              </div>

              {/* §2 กลุ่มผู้รับบริการ 6 ประเภท */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <TopicHeader icon='groups'>กลุ่มผู้รับบริการ (6 ประเภท)</TopicHeader>
                {errors.group && (
                  <span style={{ color: 'var(--text-input-errorHelper, #DC2626)', fontSize: 'var(--type-size-xs)' }}>
                    {errors.group}
                  </span>
                )}
                <div className='flex items-stretch w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }} role='radiogroup' aria-label='กลุ่มผู้รับบริการ'>
                  {HOMEVISIT_GROUPS.map((g) => (
                    <div key={g.value} style={{ flex: '1 1 260px', minWidth: 240, display: 'flex' }}>
                      <SelectableOptionCard
                        icon={GROUP_ICONS[g.value]}
                        title={g.label}
                        description={GROUP_DESCRIPTIONS[g.value]}
                        selected={form.group === g.value}
                        disabled={readOnly}
                        onSelect={() => setField('group')(g.value)}
                        className='w-full'
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* §3 ประเภทรับเข้า */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <TopicHeader icon='call_received'>ประเภทรับเข้า</TopicHeader>
                {sourceLocked && (
                  <NoticeBand tone='info' icon='link'>
                    เคสนี้รับต่อจากระบบอื่น ({resolveSource(form.source)?.label}) — ระบบล็อกช่องประเภทรับเข้าไว้
                    เพื่อรักษาที่มาของข้อมูลตามคู่มือระบบงานเดิม §2.2 หากต้องแก้ ให้ประสานระบบต้นทาง
                  </NoticeBand>
                )}
                <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <Field label='ช่องทางรับเข้า' required error={errors.source}>
                    <Select
                      showLabel={false} showHelperText={false} searchable={false} size='lg'
                      value={form.source} onChange={setField('source')}
                      disabled={readOnly || sourceLocked}
                      options={HOMEVISIT_SOURCES.map((s) => ({ value: s.value, label: s.label }))}
                      placeholder='เลือกประเภทรับเข้า'
                      error={errors.source ? ' ' : undefined}
                    />
                  </Field>
                  <Field label='ผู้รับผิดชอบ' required error={errors.responsible}>
                    <Select
                      showLabel={false} showHelperText={false} size='lg'
                      value={form.responsible}
                      onChange={(v) => {
                        const staff = HOMEVISIT_STAFF.find((s) => s.name === v);
                        setForm((f) => ({ ...f, responsible: v, profession: staff?.profession || f.profession }));
                        setErrors((e) => ({ ...e, responsible: undefined }));
                      }}
                      disabled={readOnly}
                      options={responsibleOptions}
                      placeholder='เลือกผู้รับผิดชอบ'
                      error={errors.responsible ? ' ' : undefined}
                    />
                  </Field>
                  <Field label='วิชาชีพ/ทีม'>
                    <Select
                      showLabel={false} showHelperText={false} searchable={false} size='lg'
                      value={form.profession} onChange={setField('profession')} disabled={readOnly}
                      options={HOMEVISIT_PROFESSIONS.map((p) => ({ value: p.value, label: p.label }))}
                      placeholder='เลือกวิชาชีพ'
                    />
                  </Field>
                </div>
              </div>

              {/* §4 ที่อยู่ปัจจุบัน + ปักหมุดบ้าน */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <TopicHeader icon='map-pin'>ที่อยู่ปัจจุบันและตำแหน่งบ้าน</TopicHeader>
                <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <Field label='เขต' required error={errors.district}>
                    <Select
                      showLabel={false} showHelperText={false} searchable={false} size='lg'
                      value={form.district} onChange={setField('district')} disabled={readOnly}
                      options={HOMEVISIT_DISTRICTS.map((d) => ({ value: d, label: d }))}
                      placeholder='เลือกเขต'
                      error={errors.district ? ' ' : undefined}
                    />
                  </Field>
                  <Field label='ชุมชน'>
                    <InputField showLabel={false} showHelperText={false} value={form.community} onChange={setField('community')} disabled={readOnly} placeholder='เช่น ชุมชนล็อค 1-2-3' />
                  </Field>
                </div>
                <Field label='ที่อยู่ปัจจุบันที่จะไปเยี่ยม' required error={errors.address} hint='ที่อยู่ตามบัตรอาจต่างจากที่อยู่ปัจจุบัน — ให้ใช้ที่อยู่ที่ไปเยี่ยมจริง'>
                  <InputField
                    showLabel={false} showHelperText={false}
                    value={form.address} onChange={setField('address')} disabled={readOnly}
                    placeholder='บ้านเลขที่ ซอย ถนน แขวง เขต จังหวัด รหัสไปรษณีย์'
                    error={errors.address ? ' ' : undefined}
                  />
                </Field>
                {!form.home?.pinSaved && (
                  <NoticeBand tone='warning' icon='location_searching'>
                    ยังไม่ได้ปักหมุดตำแหน่งบ้าน — คลิกบนแผนที่หรือลากหมุดไปยังตำแหน่งบ้าน แล้วกด “บันทึกตำแหน่ง”
                    เพื่อให้ทีมวางแผนเส้นทางออกเยี่ยมและเทียบระยะพิกัดตอนถึงบ้านได้ (ยังบันทึกทะเบียนได้แม้ยังไม่ปักหมุด)
                  </NoticeBand>
                )}
                <AddressMapBlock
                  value={form.home || {}}
                  readOnly={readOnly}
                  onChange={(next) => setField('home')(next)}
                  heading='ปักหมุดตำแหน่งบ้านผู้รับบริการ'
                  hint='แผนที่จำลอง (mock) — GIS จริงอยู่ในขอบเขต TOR §2.3 · ลากหมุด คลิกบนแผนที่ หรือกด “ใช้ตำแหน่งปัจจุบัน”'
                />
              </div>

              {/* §5 ประวัติเจ็บป่วย + ผู้ติดต่อ + ธงสถานะ */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <TopicHeader icon='clipboard'>ประวัติการเจ็บป่วยและผู้ติดต่อ</TopicHeader>
                <SuggestibleTextarea
                  label='ประวัติการเจ็บป่วย'
                  required
                  voice
                  value={form.illnessHistory}
                  onChange={(e) => setField('illnessHistory')(e.target.value)}
                  suggestions={HOMEVISIT_ILLNESS_SUGGESTIONS}
                  minChars={3}
                  disabled={readOnly}
                  placeholder='โรคประจำตัว การรักษาที่ได้รับ อุปกรณ์ที่ใช้ที่บ้าน และข้อจำกัดสำคัญ'
                />
                {errors.illnessHistory && (
                  <span style={{ color: 'var(--text-input-errorHelper, #DC2626)', fontSize: 'var(--type-size-xs)' }}>
                    {errors.illnessHistory}
                  </span>
                )}
                <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <Field label='ผู้ดูแล/ผู้ติดต่อ'>
                    <InputField showLabel={false} showHelperText={false} value={form.contactName} onChange={setField('contactName')} disabled={readOnly} placeholder='ชื่อ (ความสัมพันธ์)' />
                  </Field>
                  <Field label='เบอร์ติดต่อ'>
                    <InputField showLabel={false} showHelperText={false} value={form.contactPhone} onChange={setField('contactPhone')} disabled={readOnly} placeholder='08x-xxx-xxxx' />
                  </Field>
                </div>

                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                  ธงสถานะ (Flag) — แสดงติดตัวผู้รับบริการทุกหน้าจอ
                </span>
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  {HOMEVISIT_FLAGS.map((f) => (
                    <SelectableTag
                      key={f.value}
                      label={f.label}
                      size='md'
                      selected={form.flags.includes(f.value)}
                      onClick={readOnly ? undefined : () => toggleFlag(f.value)}
                    />
                  ))}
                  <SelectableTag
                    label='ข้อมูลลับ (§1.4.2) — ปิดบังชื่อในคิวและทะเบียน'
                    size='md'
                    selected={form.confidential}
                    onClick={readOnly ? undefined : () => setField('confidential')(!form.confidential)}
                  />
                </div>

                <SuggestibleTextarea
                  label='บันทึกเพิ่มเติม'
                  voice
                  value={form.note}
                  onChange={(e) => setField('note')(e.target.value)}
                  suggestions={REGISTRY_NOTE_SUGGESTIONS}
                  minChars={2}
                  disabled={readOnly}
                  placeholder='บริบทการรับเข้า สภาพครอบครัว/ชุมชน และสิ่งที่ทีมเยี่ยมต้องรู้ล่วงหน้า'
                />
              </div>

              {/* ── audit ผู้บันทึก + เวลา ───────────────────────────── */}
              {editingRow && (
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <TopicHeader icon='history'>ประวัติการแก้ไขข้อมูลทะเบียนนี้</TopicHeader>
                  <AuditStamp
                    by={editingRow.recordedBy}
                    at={editingRow.recordedAt}
                    editedBy={editingRow.editedBy}
                    editedAt={editingRow.editedAt}
                  />
                  {editingRow.cancellation && (
                    <AuditStamp
                      prefix='ยกเลิกโดย'
                      by={editingRow.cancellation.by}
                      at={editingRow.cancellation.at}
                    />
                  )}
                </div>
              )}

              <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <div className='flex-1' />
                <NeutralSubdueButton size='lg' onClick={requestCloseForm}>ยกเลิก</NeutralSubdueButton>
                <BrandSubdueButton variant='fill' size='lg' leadingIcon='save' onClick={save} disabled={readOnly}>
                  {editing === 'new' ? 'บันทึกทะเบียน' : 'บันทึกการแก้ไข'}
                </BrandSubdueButton>
              </div>
            </section>
          )}

          {/* ── รายการทะเบียน ────────────────────────────────────── */}
          <SectionCard>
            <div className='w-full flex items-start justify-center'>
              <PrimarySearch
                value={searchQ}
                onChange={setSearchQ}
                onSubmit={(label, item) => {
                  setSearchQ(label);
                  const match = item?.id ? rows.find((r) => r.id === item.id) : null;
                  pushHistory(match ? rowToSearchItem(match) : (item ?? label));
                }}
                suggestions={searchSuggestions}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                placeholder='ค้นหา HN / ชื่อ-สกุล / ชุมชน / ผู้รับผิดชอบ'
                width={620}
              />
            </div>

            <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
                <FilterTag value='ทั้งหมด' selected={!filtersActive} onClick={clearFilters} />
                <FilterDropdown
                  prefix='กลุ่ม:'
                  options={[{ value: 'all', label: 'ทุกกลุ่ม' }, ...HOMEVISIT_GROUPS.map((g) => ({ value: g.value, label: g.short }))]}
                  value={filters.group}
                  onChange={(v) => setFilters((f) => ({ ...f, group: v }))}
                />
                <FilterDropdown
                  prefix='ประเภทรับเข้า:'
                  options={[{ value: 'all', label: 'ทุกประเภท' }, ...HOMEVISIT_SOURCES.map((s) => ({ value: s.value, label: s.short }))]}
                  value={filters.source}
                  onChange={(v) => setFilters((f) => ({ ...f, source: v }))}
                />
                <FilterDropdown
                  prefix='เขต:'
                  options={[{ value: 'all', label: 'ทุกเขต' }, ...HOMEVISIT_DISTRICTS.map((d) => ({ value: d, label: d }))]}
                  value={filters.district}
                  onChange={(v) => setFilters((f) => ({ ...f, district: v }))}
                />
                <FilterDropdown
                  prefix='ผู้รับผิดชอบ:'
                  options={[{ value: 'all', label: 'ทุกคน' }, ...responsibleOptions]}
                  value={filters.responsible}
                  onChange={(v) => setFilters((f) => ({ ...f, responsible: v }))}
                />
                <FilterDateTag
                  prefix='ลงทะเบียน:'
                  value={filters.dateValue}
                  onChange={(v) => setFilters((f) => ({ ...f, dateValue: v }))}
                  defaultQuick='all'
                  quickLabels={DATE_CHIP_LABELS}
                />
              </OverflowFlexRow>
            </div>

            {rows.length === 0 ? (
              <EmptyHint
                icon='contact_page'
                action={(
                  <BrandSubdueButton variant='fill' leadingIcon='person_add' onClick={openCreate}>
                    ลงทะเบียนรายแรก
                  </BrandSubdueButton>
                )}
              >
                ยังไม่มีผู้รับบริการในทะเบียนเยี่ยมบ้าน — เริ่มจากการลงทะเบียนผู้รับบริการรายแรกของศูนย์บริการฯ
              </EmptyHint>
            ) : filtered.length === 0 ? (
              <EmptyHint
                icon='filter_alt_off'
                action={(
                  <NeutralSubdueButton variant='outline' leadingIcon='restart_alt' onClick={clearFilters}>
                    ล้างตัวกรอง
                  </NeutralSubdueButton>
                )}
              >
                ไม่พบข้อมูลที่ตรงกับเงื่อนไข ({filterSummary || 'ตัวกรองปัจจุบัน'}) — ปรับหรือล้างตัวกรองแล้วลองอีกครั้ง
              </EmptyHint>
            ) : (
              <>
                <Table
                  columns={columns}
                  rows={pageRows}
                  rowKey={(r) => r.id}
                  onRowClick={(r) => openEdit(r)}
                  stickyColCount={2}
                  emptyMessage='ไม่พบข้อมูลที่ตรงกับเงื่อนไข'
                />
                <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <span style={{
                    color: 'var(--text-content-secondary, #636B72)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm)',
                  }}>
                    {`แสดง ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} จาก ${filtered.length} รายการ`}
                  </span>
                  <div className='flex-1' />
                  <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
                </div>
              </>
            )}
          </SectionCard>
        </div>
      </HomeVisitAccessGate>
    </QueuePageShell>
  );
};

export default HomeVisitRegistryPage;
