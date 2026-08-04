import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import AddressMapBlock from '@/components/forms/AddressMapBlock';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Popup from '@/components/popup/Popup';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import Icon from '@/components/icons/Icon';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  ADDICTION_SCHEDULED,
  getAddictionQueueRows,
  isRightsExpired,
} from '@/data/addictionVisits';
import {
  COMMUNITY_CARE_TYPES,
  COMMUNITY_CARE_STATUSES,
  COMMUNITY_DISTRICTS,
  COMMUNITY_NOTE_SUGGESTIONS,
  CANCEL_REASON_SUGGESTIONS,
  resolveCommunityCareType,
  resolveCommunityCareStatus,
  getCommunityEntries,
  upsertCommunityEntry,
  cancelCommunityEntry,
  reactivateCommunityEntry,
  getCommunityCancellation,
  findRegistryEntryByHn,
} from '@/data/addictionRegistry';
import { printCommunityRegistry } from '@/pages/clinic/addiction/addictionPrint';
import {
  AddictionAccessGate,
  AccessDemoToggle,
  NoticeBand,
  AuditStamp,
  TopicHeader,
  Field,
  SectionCard,
  EmptyHint,
} from '@/pages/clinic/addiction/addictionShared';

/* AddictionCommunityPage — ทะเบียนการดำเนินการดูแลผู้ใช้ยาเสพติดในชุมชน
   CBTx & HR (TOR 1.10.5.9).

   Registry pattern identical to AddictionRegistryPage: list + form on one
   page, all four verbs (แสดง / บันทึก / แก้ไข / ยกเลิก + เปิดใช้งานอีกครั้ง),
   audit stamps rendered, cancelled rows kept visible greyed.

   แผนที่ภูมิศาสตร์: reuses the Registration mock map `AddressMapBlock`
   (hand-drawn SVG, no Leaflet / no tile server / no API key). The
   component binds ONE pin per instance to the {lat, lng, pinSaved}
   contract, so this screen deliberately shows one house at a time — the
   form pins the selected household, and picking a table row shows that
   household's pin read-only. A multi-pin overview would need a NEW
   component, which this wave does not introduce (see manifest notes). */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานบำบัดสารเสพติด', 'CBTx & HR ชุมชน'];
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:addiction-community';
const PAGE_SIZE = 10;

const EMPTY_FORM = {
  id: '',
  hn: '',
  patientName: '',
  community: '',
  district: '',
  careType: '',
  responsible: '',
  status: 'active',
  note: '',
  houseLocation: null,
};

const FILTER_DEFAULTS = { district: 'all', careType: 'all', status: 'all' };

const RESPONSIBLE_OPTIONS = [
  'อสส.สมหญิง แข็งขัน',
  'อสส.ประยูร มั่นคง',
  'อสส.วันเพ็ญ ใจบุญ',
  'อสส.มานพ เพียรดี',
  'พว.กรรณิการ์ แสงอรุณ',
  'พว.สุภาพร ใจดี',
];

const AddictionCommunityPage = () => {
  const history = useHistory();
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState(null); /* null | 'new' | row id */
  const [form, setForm] = useState(EMPTY_FORM);
  const [baseline, setBaseline] = useState('');
  const [errors, setErrors] = useState({});
  const [savedBanner, setSavedBanner] = useState(null);
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  const [detailId, setDetailId] = useState(null);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  const rows = useMemo(() => getCommunityEntries().map((r) => ({
    ...r,
    cancellation: getCommunityCancellation(r.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [tick]);

  const roster = useMemo(() => {
    const map = new Map();
    [...getAddictionQueueRows(), ...ADDICTION_SCHEDULED].forEach((r) => {
      if (!map.has(r.hn)) map.set(r.hn, r.name);
    });
    rows.forEach((r) => { if (!map.has(r.hn)) map.set(r.hn, r.patientName); });
    return map;
  }, [rows]);

  const tabs = useMemo(() => ([
    { key: 'all', label: 'ทั้งหมด', icon: 'group', count: rows.length },
    { key: 'cbtx', label: 'CBTx', icon: 'diversity_3', count: rows.filter((r) => !r.cancellation && r.careType === 'cbtx').length },
    { key: 'hr', label: 'HR', icon: 'health_and_safety', count: rows.filter((r) => !r.cancellation && r.careType === 'hr').length },
    { key: 'closed', label: 'ยุติการดูแล', icon: 'task_alt', count: rows.filter((r) => !r.cancellation && r.status === 'closed').length },
    { key: 'cancelled', label: 'ยกเลิกแล้ว', icon: 'block', count: rows.filter((r) => r.cancellation).length },
  ]), [rows]);

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return rows.filter((r) => {
      if (activeTab === 'cancelled') {
        if (!r.cancellation) return false;
      } else if (activeTab === 'closed') {
        if (r.cancellation || r.status !== 'closed') return false;
      } else if (activeTab !== 'all') {
        if (r.cancellation || r.careType !== activeTab) return false;
      }
      if (filters.district !== 'all' && r.district !== filters.district) return false;
      if (filters.careType !== 'all' && r.careType !== filters.careType) return false;
      if (filters.status !== 'all' && r.status !== filters.status) return false;
      if (!q) return true;
      return [r.hn, r.patientName, r.community, r.district, r.responsible]
        .some((f) => f && f.toLowerCase().includes(q));
    });
  }, [rows, activeTab, filters, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [activeTab, filters, searchQ]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const summaryCards = useMemo(() => ([
    { key: 'total', label: 'ทะเบียนทั้งหมด', value: rows.filter((r) => !r.cancellation).length, color: 'info', icon: 'holiday_village' },
    { key: 'cbtx', label: 'CBTx (บำบัดโดยชุมชน)', value: rows.filter((r) => !r.cancellation && r.careType === 'cbtx').length, color: 'brand', icon: 'diversity_3' },
    { key: 'hr', label: 'HR (ลดอันตราย)', value: rows.filter((r) => !r.cancellation && r.careType === 'hr').length, color: 'info', icon: 'health_and_safety' },
    { key: 'active', label: 'กำลังดูแล', value: rows.filter((r) => !r.cancellation && r.status === 'active').length, color: 'inprogress', icon: 'volunteer_activism' },
    { key: 'unpinned', label: 'รอปักหมุดตำแหน่งบ้าน', value: rows.filter((r) => !r.cancellation && !r.houseLocation?.pinSaved).length, color: 'destructive', icon: 'wrong_location' },
  ]), [rows]);

  /* ── form open / close ──────────────────────────────────────────── */
  const rowToForm = (row) => ({
    id: row.id,
    hn: row.hn,
    patientName: row.patientName,
    community: row.community || '',
    district: row.district || '',
    careType: row.careType || '',
    responsible: row.responsible || '',
    status: row.status || 'active',
    note: row.note || '',
    houseLocation: row.houseLocation || null,
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setBaseline(JSON.stringify(EMPTY_FORM));
    setErrors({});
    setSavedBanner(null);
    setDetailId(null);
    setEditing('new');
  };

  const openEdit = (row) => {
    const next = rowToForm(row);
    setForm(next);
    setBaseline(JSON.stringify(next));
    setErrors({});
    setSavedBanner(null);
    setDetailId(null);
    setEditing(row.id);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeFormNow = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setBaseline('');
    setErrors({});
  };

  const dirty = editing !== null && JSON.stringify(form) !== baseline;
  const requestCloseForm = () => {
    if (dirty) setUnsavedOpen(true);
    else closeFormNow();
  };

  const setField = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const editingRow = useMemo(
    () => (editing && editing !== 'new' ? rows.find((r) => r.id === editing) || null : null),
    [editing, rows],
  );
  const readOnly = !!(editingRow && (editingRow.cancellation || editingRow.status === 'closed'));

  const applyHn = (hn) => {
    const clean = hn.trim();
    const p = getPatientByHN(clean);
    setForm((f) => ({
      ...f,
      hn: clean,
      patientName: roster.get(clean) || p?.shortName || f.patientName,
    }));
    setErrors((e) => ({ ...e, hn: undefined }));
  };

  const linkedRegistry = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => (form.hn ? findRegistryEntryByHn(form.hn) : null),
    [form.hn, tick],
  );

  const pinSaved = form.houseLocation?.pinSaved === true;

  /* ── บันทึก ─────────────────────────────────────────────────────── */
  const save = () => {
    const next = {};
    if (!form.hn.trim()) next.hn = 'กรุณาระบุ HN ผู้รับบริการ';
    else if (!getPatientByHN(form.hn.trim())) next.hn = `ไม่พบ HN ${form.hn.trim()} ในทะเบียนผู้ป่วย — ตรวจสอบอีกครั้ง`;
    if (!form.community.trim()) next.community = 'กรุณาระบุชื่อชุมชน';
    if (!form.district) next.district = 'กรุณาเลือกเขต';
    if (!form.careType) next.careType = 'กรุณาเลือกประเภทการดูแล (CBTx หรือ HR)';
    if (!form.responsible) next.responsible = 'กรุณาเลือกผู้รับผิดชอบ';
    if (!pinSaved) next.houseLocation = 'กรุณาปักหมุดตำแหน่งบ้านผู้ใช้ยาเสพติด แล้วกด “บันทึกตำแหน่ง” บนแผนที่';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    const saved = upsertCommunityEntry({
      id: form.id || undefined,
      hn: form.hn.trim(),
      patientName: form.patientName.trim(),
      community: form.community.trim(),
      district: form.district,
      careType: form.careType,
      responsible: form.responsible,
      status: form.status,
      note: form.note.trim(),
      houseLocation: form.houseLocation,
    });
    setTick((t) => t + 1);
    closeFormNow();
    setSavedBanner({ name: saved.patientName, hn: saved.hn, isNew: editing === 'new' });
  };

  /* ── ยกเลิก / เปิดใช้งานอีกครั้ง ──────────────────────────────── */
  const openCancel = (row) => {
    setCancelReason('');
    setCancelError('');
    setCancelTarget(row);
  };
  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('กรุณาระบุเหตุผลการยกเลิกรายการ');
      return;
    }
    cancelCommunityEntry(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };
  const reactivate = (row) => {
    reactivateCommunityEntry(row.id);
    setTick((t) => t + 1);
  };

  /* ── search ─────────────────────────────────────────────────────── */
  const rowToSearchItem = (r) => ({
    id: r.id,
    label: r.patientName,
    sublabel: `${r.community} · ${r.district}`,
    value: r.patientName,
    badges: [
      { label: r.hn, tone: 'indigo' },
      { label: r.careType === 'hr' ? 'HR' : 'CBTx', tone: 'teal' },
    ],
    avatarSrc: getPatientByHN(r.hn)?.avatarUrl,
  });

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return rows
      .filter((r) => [r.hn, r.patientName, r.community, r.district, r.responsible].some((f) => f && f.toLowerCase().includes(q)))
      .slice(0, 8)
      .map(rowToSearchItem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, rows]);

  /* ── table ──────────────────────────────────────────────────────── */
  const greyed = { color: 'var(--text-content-tertiary, #858C92)' };

  const columns = useMemo(() => ([
    { key: 'hn', label: 'HN', width: 96, render: (r) => <span style={r.cancellation ? greyed : undefined}>{r.hn}</span> },
    {
      key: 'patientName', label: 'ชื่อผู้รับบริการ', flex: true, minWidth: 160,
      render: (r) => <span style={r.cancellation ? greyed : { fontWeight: 'var(--type-weight-medium)' }}>{r.patientName}</span>,
    },
    { key: 'community', label: 'ชุมชน', flex: true, minWidth: 170, render: (r) => <span style={r.cancellation ? greyed : undefined}>{r.community}</span> },
    { key: 'district', label: 'เขต', width: 150, render: (r) => <span style={r.cancellation ? greyed : undefined}>{r.district}</span> },
    {
      key: 'careType', label: 'ประเภทการดูแล', width: 210, sortable: false,
      render: (r) => {
        const t = resolveCommunityCareType(r.careType);
        return t ? <ColorfulBadge style={r.cancellation ? 'grey' : t.badge} size='small' hierarchy='secondary' width='hug' maxWidth={200}>{t.label}</ColorfulBadge> : <span>—</span>;
      },
    },
    { key: 'responsible', label: 'ผู้รับผิดชอบ (อสส.)', flex: true, minWidth: 170, render: (r) => <span style={r.cancellation ? greyed : undefined}>{r.responsible}</span> },
    {
      key: 'status', label: 'สถานะ', width: 220, sortable: false,
      render: (r) => {
        if (r.cancellation) {
          return (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกรายการ</ColorfulBadge>
              <span style={{ fontSize: 'var(--type-size-xs)', ...greyed }}>
                ยกเลิกโดย {r.cancellation.by} · {r.cancellation.at}
                <br />เหตุผล: {r.cancellation.reason}
              </span>
            </div>
          );
        }
        const st = resolveCommunityCareStatus(r.status);
        return <ColorfulBadge style={st?.badge || 'grey'} size='small' hierarchy='secondary'>{st?.label || r.status}</ColorfulBadge>;
      },
    },
    {
      key: 'houseLocation', label: 'ตำแหน่งบ้าน', width: 170, sortable: false,
      render: (r) => (r.houseLocation?.pinSaved ? (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <ColorfulBadge style='green' size='small' hierarchy='secondary'>ปักหมุดแล้ว</ColorfulBadge>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {r.houseLocation.lat.toFixed(4)}, {r.houseLocation.lng.toFixed(4)}
          </span>
        </div>
      ) : (
        <ColorfulBadge style='orange' size='small' hierarchy='secondary'>รอปักหมุด</ColorfulBadge>
      )),
    },
    {
      key: 'actions', label: 'การดำเนินการ', width: 300, sortable: false,
      render: (r) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {r.cancellation ? (
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='restart_alt' onClick={(e) => { e.stopPropagation(); reactivate(r); }}>
              เปิดใช้งานอีกครั้ง
            </BrandSubdueButton>
          ) : (
            <>
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                แก้ไข
              </BrandSubdueButton>
              <NeutralSubdueButton size='sm' leadingIcon='location_on' onClick={(e) => { e.stopPropagation(); setDetailId(r.id); }}>
                ดูตำแหน่ง
              </NeutralSubdueButton>
              <NeutralSubdueButton size='sm' leadingIcon='block' onClick={(e) => { e.stopPropagation(); openCancel(r); }}>
                ยกเลิก
              </NeutralSubdueButton>
            </>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick, rows]);

  const detailRow = useMemo(() => rows.find((r) => r.id === detailId) || null, [rows, detailId]);

  const filtersActive = searchQ.trim() !== ''
    || filters.district !== 'all'
    || filters.careType !== 'all'
    || filters.status !== 'all'
    || activeTab !== 'all';

  const clearFilters = () => {
    setSearchQ('');
    setFilters(FILTER_DEFAULTS);
    setActiveTab('all');
  };

  const filterSummary = [
    activeTab === 'all' ? null : tabs.find((t) => t.key === activeTab)?.label,
    filters.district === 'all' ? null : filters.district,
    filters.careType === 'all' ? null : resolveCommunityCareType(filters.careType)?.label,
    filters.status === 'all' ? null : resolveCommunityCareStatus(filters.status)?.label,
    searchQ.trim() ? `ค้นหา "${searchQ.trim()}"` : null,
  ].filter(Boolean).join(' · ');

  const doPrint = () => printCommunityRegistry(
    filtered.map((r) => ({
      ...r,
      careTypeLabel: resolveCommunityCareType(r.careType)?.label || '—',
      statusLabel: r.cancellation ? 'ยกเลิกรายการ' : (resolveCommunityCareStatus(r.status)?.label || '—'),
    })),
    filterSummary || 'ทั้งหมด',
  );

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='ทะเบียนการดูแลผู้ใช้ยาเสพติดในชุมชน (CBTx & HR)'
      onBack={() => history.push('/clinic/addiction')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <AccessDemoToggle onRevoked={() => setTick((t) => t + 1)} />
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='print' onClick={doPrint}>
            พิมพ์รายชื่อตามชุมชน
          </NeutralSubdueButton>
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='contact_page' onClick={() => history.push('/clinic/addiction/registry')}>
            ทะเบียนผู้ติดสารเสพติด
          </NeutralSubdueButton>
          <BrandSubdueButton variant='fill' leadingIcon='add_home' onClick={openCreate}>
            บันทึกการดูแลในชุมชน
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
        title='ยกเลิกรายการดูแลในชุมชน'
        subtitle={cancelTarget ? `${cancelTarget.patientName} · ${cancelTarget.community}` : ''}
        tertiaryAction={{ label: 'กลับไปแก้ต่อ', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกรายการ', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <SuggestibleTextarea
            label='เหตุผลการยกเลิก'
            required
            voice
            value={cancelReason}
            onChange={(e) => { setCancelReason(e.target.value); if (e.target.value.trim()) setCancelError(''); }}
            suggestions={CANCEL_REASON_SUGGESTIONS}
            minChars={2}
            placeholder='เช่น บันทึกซ้ำ / ผู้รับบริการย้ายออกจากชุมชน'
          />
          <span style={{
            color: cancelError ? 'var(--text-input-errorHelper, #DC2626)' : 'var(--text-content-tertiary, #858C92)',
            fontSize: 'var(--type-size-xs)',
          }}>
            {cancelError || 'รายการที่ยกเลิกจะยังแสดงอยู่แบบเทา พร้อมผู้ยกเลิก เวลา และเหตุผล'}
          </span>
        </div>
      </Popup>

      <UnsavedChangesPopup
        open={unsavedOpen}
        onClose={() => setUnsavedOpen(false)}
        onSave={() => { setUnsavedOpen(false); save(); }}
        onDiscard={() => { setUnsavedOpen(false); closeFormNow(); }}
        title='ออกจากแบบฟอร์มชุมชนโดยยังไม่บันทึก?'
        description='ข้อมูลชุมชนและตำแหน่งบ้านที่ปักไว้จะหายไปหากออกโดยไม่บันทึก'
      />

      <AddictionAccessGate>
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
                ? `บันทึกการดูแลในชุมชนของ ${savedBanner.name} (HN ${savedBanner.hn}) แล้ว`
                : `บันทึกการแก้ไขข้อมูลชุมชนของ ${savedBanner.name} (HN ${savedBanner.hn}) แล้ว`}
            </NoticeBand>
          )}

          {/* ── ฟอร์มบันทึก / แก้ไข ───────────────────────────────── */}
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
                  {editing === 'new' ? 'บันทึกการดูแลผู้ใช้ยาเสพติดในชุมชน' : `แก้ไขข้อมูลชุมชน — ${form.patientName || form.hn}`}
                </h1>
                {readOnly && <ColorfulBadge style='grey' size='small' hierarchy='secondary'>อ่านอย่างเดียว</ColorfulBadge>}
                <div className='flex-1' />
                <NeutralSubdueButton size='sm' leadingIcon='close' onClick={requestCloseForm}>ปิดแบบฟอร์ม</NeutralSubdueButton>
              </div>

              {readOnly && (
                <NoticeBand tone='warning' icon='lock'>
                  {editingRow?.cancellation
                    ? `รายการนี้ถูกยกเลิกโดย ${editingRow.cancellation.by} เมื่อ ${editingRow.cancellation.at} (เหตุผล: ${editingRow.cancellation.reason}) — กด “เปิดใช้งานอีกครั้ง” ที่ตารางก่อนจึงจะแก้ไขได้`
                    : 'รายการนี้อยู่ในสถานะ “ยุติการดูแล” — เปลี่ยนสถานะกลับเป็นกำลังดูแลก่อนจึงจะแก้ไขรายละเอียดได้'}
                </NoticeBand>
              )}

              {form.hn && !linkedRegistry && (
                <NoticeBand tone='warning' icon='assignment_late'>
                  HN {form.hn} ยังไม่มีทะเบียนผู้ติดสารเสพติด — บันทึกได้ (CBTx/HR ครอบคลุมผู้ที่ยังไม่เข้าระบบบำบัด)
                  แต่ควรลงทะเบียนเพื่อให้เห็นโปรแกรมบำบัดร่วมด้วย{' '}
                  <button
                    type='button'
                    onClick={() => history.push('/clinic/addiction/registry')}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                      color: 'var(--text-brandPrimary-default, #007549)',
                      fontWeight: 'var(--type-weight-bold)', textDecoration: 'underline',
                    }}
                  >
                    ไปที่ทะเบียนผู้ติดสารเสพติด
                  </button>
                </NoticeBand>
              )}

              {form.hn && isRightsExpired(form.hn) && (
                <NoticeBand tone='warning' icon='warning'>
                  สิทธิการรักษาของ HN {form.hn} หมดอายุ — ตรวจสอบสิทธิก่อนให้บริการ (ยังบันทึกข้อมูลชุมชนได้)
                </NoticeBand>
              )}

              {/* §1 ข้อมูลผู้รับบริการ + ชุมชน */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <TopicHeader icon='holiday_village'>ข้อมูลผู้รับบริการและชุมชน</TopicHeader>
                <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <Field label='HN' required error={errors.hn} hint='พิมพ์ HN แล้วระบบจะดึงชื่อผู้รับบริการให้'>
                    <InputField
                      showLabel={false} showHelperText={false}
                      value={form.hn}
                      onChange={applyHn}
                      disabled={readOnly || editing !== 'new'}
                      placeholder='เช่น 67-00009'
                      error={errors.hn ? ' ' : undefined}
                    />
                  </Field>
                  <Field label='ชื่อผู้รับบริการ' required>
                    <InputField showLabel={false} showHelperText={false} value={form.patientName} onChange={setField('patientName')} disabled={readOnly} placeholder='ชื่อ-นามสกุล' />
                  </Field>
                  <Field label='ชุมชน' required error={errors.community}>
                    <InputField
                      showLabel={false} showHelperText={false}
                      value={form.community} onChange={setField('community')} disabled={readOnly}
                      placeholder='เช่น ชุมชนวัดระฆัง'
                      error={errors.community ? ' ' : undefined}
                    />
                  </Field>
                  <Field label='เขต' required error={errors.district}>
                    <Select
                      showLabel={false} showHelperText={false} searchable={false} size='lg'
                      value={form.district} onChange={setField('district')} disabled={readOnly}
                      options={COMMUNITY_DISTRICTS.map((d) => ({ value: d, label: d }))}
                      placeholder='เลือกเขต'
                      error={errors.district ? ' ' : undefined}
                    />
                  </Field>
                </div>
              </div>

              {/* §2 ประเภทการดูแล + ผู้รับผิดชอบ */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <TopicHeader icon='diversity_3'>ประเภทการดูแลและผู้รับผิดชอบ</TopicHeader>
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                    ประเภทการดูแล <span style={{ color: 'var(--text-input-require)' }}>*</span>
                  </span>
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    {COMMUNITY_CARE_TYPES.map((t) => (
                      <SelectableTag
                        key={t.value}
                        label={t.label}
                        size='md'
                        selected={form.careType === t.value}
                        onClick={readOnly ? undefined : () => setField('careType')(t.value)}
                      />
                    ))}
                  </div>
                  {errors.careType && (
                    <span style={{ color: 'var(--text-input-errorHelper, #DC2626)', fontSize: 'var(--type-size-xs)' }}>{errors.careType}</span>
                  )}
                </div>
                <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <Field label='ผู้รับผิดชอบ (อสส. / เจ้าหน้าที่)' required error={errors.responsible}>
                    <Select
                      showLabel={false} showHelperText={false} size='lg'
                      value={form.responsible} onChange={setField('responsible')} disabled={readOnly}
                      options={RESPONSIBLE_OPTIONS.map((r) => ({ value: r, label: r }))}
                      placeholder='เลือกผู้รับผิดชอบ'
                      error={errors.responsible ? ' ' : undefined}
                    />
                  </Field>
                  <Field label='สถานะการดูแล'>
                    <Select
                      showLabel={false} showHelperText={false} searchable={false} size='lg'
                      value={form.status} onChange={setField('status')} disabled={readOnly}
                      options={COMMUNITY_CARE_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
                      placeholder='เลือกสถานะ'
                    />
                  </Field>
                </div>
                <SuggestibleTextarea
                  label='บันทึกการดำเนินการในชุมชน'
                  voice
                  value={form.note}
                  onChange={(e) => setField('note')(e.target.value)}
                  suggestions={COMMUNITY_NOTE_SUGGESTIONS}
                  minChars={2}
                  disabled={readOnly}
                  placeholder='กิจกรรมที่ดำเนินการ ความถี่การเยี่ยม ความเสี่ยงในสภาพแวดล้อม'
                />
              </div>

              {/* §3 แผนที่ — ปักหมุดตำแหน่งบ้าน */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <TopicHeader icon='pin_drop'>ตำแหน่งบ้านผู้ใช้ยาเสพติด</TopicHeader>
                {!pinSaved && (
                  <NoticeBand tone={errors.houseLocation ? 'danger' : 'info'} icon='location_searching'>
                    {errors.houseLocation
                      || 'ยังไม่ได้ปักหมุด — คลิกบนแผนที่หรือลากหมุดไปยังตำแหน่งบ้าน แล้วกด “บันทึกตำแหน่ง” ก่อนบันทึกทะเบียน'}
                  </NoticeBand>
                )}
                <AddressMapBlock
                  heading='ปักหมุดตำแหน่งบ้านผู้ใช้ยาเสพติด'
                  hint='ลากหมุดเพื่อปรับตำแหน่ง คลิกบนแผนที่ หรือกด “ใช้ตำแหน่งปัจจุบัน” — แผนที่จำลองสำหรับระบบต้นแบบ'
                  value={form.houseLocation || undefined}
                  onChange={(next) => {
                    if (!next) return; /* never overwrite a pin with null */
                    setForm((f) => ({ ...f, houseLocation: next }));
                    if (next.pinSaved) setErrors((e) => ({ ...e, houseLocation: undefined }));
                  }}
                  readOnly={readOnly}
                />
              </div>

              {editingRow && (
                <AuditStamp
                  by={editingRow.recordedBy}
                  at={editingRow.recordedAt}
                  editedBy={editingRow.editedBy}
                  editedAt={editingRow.editedAt}
                />
              )}

              <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <div className='flex-1' />
                <NeutralSubdueButton size='lg' onClick={requestCloseForm}>ยกเลิก</NeutralSubdueButton>
                <BrandSubdueButton variant='fill' size='lg' leadingIcon='save' onClick={save} disabled={readOnly}>
                  {editing === 'new' ? 'บันทึกการดูแลในชุมชน' : 'บันทึกการแก้ไข'}
                </BrandSubdueButton>
              </div>
            </section>
          )}

          {/* ── รายละเอียดแถวที่เลือก + แผนที่ read-only ─────────── */}
          {detailRow && (
            <SectionCard
              icon='location_on'
              title={`ตำแหน่งบ้าน — ${detailRow.patientName}`}
              aside={(
                <NeutralSubdueButton size='sm' leadingIcon='close' onClick={() => setDetailId(null)}>ปิด</NeutralSubdueButton>
              )}
            >
              <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-600, 24px)' }}>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)', minWidth: 260, flex: '1 1 260px' }}>
                  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
                    HN {detailRow.hn} · {detailRow.community} · {detailRow.district}
                  </span>
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <ColorfulBadge style={resolveCommunityCareType(detailRow.careType)?.badge || 'grey'} size='small' hierarchy='secondary' width='hug' maxWidth={220}>
                      {resolveCommunityCareType(detailRow.careType)?.label || '—'}
                    </ColorfulBadge>
                    <ColorfulBadge style={resolveCommunityCareStatus(detailRow.status)?.badge || 'grey'} size='small' hierarchy='secondary'>
                      {resolveCommunityCareStatus(detailRow.status)?.label || '—'}
                    </ColorfulBadge>
                  </div>
                  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                    ผู้รับผิดชอบ: {detailRow.responsible}
                  </span>
                  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
                    {detailRow.note || '—'}
                  </span>
                  <AuditStamp
                    by={detailRow.recordedBy}
                    at={detailRow.recordedAt}
                    editedBy={detailRow.editedBy}
                    editedAt={detailRow.editedAt}
                  />
                </div>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)', flex: '2 1 420px', minWidth: 300 }}>
                  {detailRow.houseLocation?.pinSaved ? (
                    <>
                      <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                        พิกัด {detailRow.houseLocation.lat.toFixed(4)}, {detailRow.houseLocation.lng.toFixed(4)} —
                        แสดงทีละหลังตามสัญญาของคอมโพเนนต์แผนที่ (หนึ่งหมุดต่อหนึ่งรายการ)
                      </span>
                      <AddressMapBlock value={detailRow.houseLocation} readOnly compact />
                    </>
                  ) : (
                    <EmptyHint icon='wrong_location'>
                      รายการนี้ยังไม่ได้ปักหมุดตำแหน่งบ้าน — กด “แก้ไข” เพื่อปักหมุดบนแผนที่
                    </EmptyHint>
                  )}
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── รายการทะเบียนชุมชน ───────────────────────────────── */}
          <SectionCard>
            <div className='w-full flex items-start justify-center'>
              <PrimarySearch
                value={searchQ}
                onChange={setSearchQ}
                onSubmit={(label, item) => {
                  setSearchQ(label);
                  const match = item?.id ? rows.find((r) => r.id === item.id) : null;
                  pushHistory(match ? rowToSearchItem(match) : (item ?? label));
                  if (match) setDetailId(match.id);
                }}
                suggestions={searchSuggestions}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                placeholder='ค้นหา HN / ชื่อผู้รับบริการ / ชุมชน / เขต / ผู้รับผิดชอบ'
                width={620}
              />
            </div>

            <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
                <FilterTag value='ทั้งหมด' selected={!filtersActive} onClick={clearFilters} />
                <FilterDropdown
                  prefix='เขต:'
                  options={[{ value: 'all', label: 'ทุกเขต' }, ...COMMUNITY_DISTRICTS.map((d) => ({ value: d, label: d }))]}
                  value={filters.district}
                  onChange={(v) => setFilters((f) => ({ ...f, district: v }))}
                />
                <FilterDropdown
                  prefix='ประเภท:'
                  options={[{ value: 'all', label: 'ทุกประเภท' }, ...COMMUNITY_CARE_TYPES.map((t) => ({ value: t.value, label: t.label }))]}
                  value={filters.careType}
                  onChange={(v) => setFilters((f) => ({ ...f, careType: v }))}
                />
                <FilterDropdown
                  prefix='สถานะ:'
                  options={[{ value: 'all', label: 'ทุกสถานะ' }, ...COMMUNITY_CARE_STATUSES.map((s) => ({ value: s.value, label: s.label }))]}
                  value={filters.status}
                  onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
                />
              </OverflowFlexRow>
            </div>

            {rows.length === 0 ? (
              <EmptyHint
                icon='holiday_village'
                action={(
                  <BrandSubdueButton variant='fill' leadingIcon='add_home' onClick={openCreate}>
                    บันทึกรายแรก
                  </BrandSubdueButton>
                )}
              >
                ยังไม่มีรายการดูแลผู้ใช้ยาเสพติดในชุมชน — เริ่มจากการบันทึกข้อมูลชุมชนและปักหมุดตำแหน่งบ้านรายแรก
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
                  onRowClick={(r) => setDetailId(r.id)}
                  stickyColCount={2}
                  emptyMessage='ไม่พบข้อมูลที่ตรงกับเงื่อนไข'
                />
                <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <span style={{ color: 'var(--text-content-secondary, #636B72)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                    {`แสดง ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} จาก ${filtered.length} รายการ`}
                  </span>
                  <div className='flex-1' />
                  <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
                </div>
              </>
            )}

            <div
              className='flex items-start w-full'
              style={{ gap: 'var(--dim-space-200, 8px)', color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-xs)' }}
            >
              <Icon name='info' size={14} />
              <span>
                แผนที่ในหน้านี้เป็นแผนที่จำลองของระบบต้นแบบ (ไม่เชื่อมต่อ tile server ภายนอก)
                และแสดงตำแหน่งบ้านครั้งละ 1 หลังตามรายการที่เลือก
              </span>
            </div>
          </SectionCard>
        </div>
      </AddictionAccessGate>
    </QueuePageShell>
  );
};

export default AddictionCommunityPage;
