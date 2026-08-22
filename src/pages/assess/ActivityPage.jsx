import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import { Icon } from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Switch from '@/components/switch/Switch';
import Popup from '@/components/popup/Popup';
import Popover from '@/components/popup/Popover';
import AlertDialog from '@/components/popup/AlertDialog';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import ActionList from '@/components/list/ActionList';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import ASSESS_NAV from '@/pages/assess/assessNav';
import {
  readActivities,
  writeActivities,
  computeActivityStats,
  createActivity,
  createSubActivity,
  sortSubActivities,
  reorderSubActivities,
  isDuplicateActivityName,
} from '@/data/activityStore';

/* PHCIS | Assess-control — กิจกรรม (Activity-based Access Control).
   แทนหน้า Group Policy เดิม (Figma 4D3nTx53 · 3:18430) — โครงหน้าเดียวกัน:
   Empty state · summary cards · search · filters · grouped sub-activity tables
   · add/edit popups · reorder · status toggles · confirm dialogs.
   ลำดับชั้น กิจกรรมหลัก → กิจกรรมย่อย แสดงเป็นการ์ดหัวกิจกรรม + ตารางย่อยในการ์ด. */

const breadcrumb = ['กิจกรรม'];

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
};

const TEXT_CELL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const STATUS_OPTIONS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'active', label: 'เปิดการใช้งาน' },
  { value: 'inactive', label: 'ปิดการใช้งาน' },
];

const DUPLICATE_ACTIVITY_ERROR = 'ชื่อกิจกรรมซ้ำกับที่มีอยู่ กรุณาเปลี่ยนชื่อกิจกรรมใหม่';

/* Figma 9:14401 — Edit 3 leading icon on outline subdue buttons (16px sm). */
function Edit3LeadingIcon({ size = 16 }) {
  return <Icon name='edit_3' size={size} />;
}

/* Figma 3:18431 Roles_Empty — Ambulance Lottie 160×160; list footer 6:21313 / 10:29241 — 128×128. */
const AMBULANCE_LOTTIE = '/illustration/ambulance.json';

function EmptyIllustration({ size = 160, ariaLabel = 'ยังไม่มีกิจกรรม' }) {
  const [anim, setAnim] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(AMBULANCE_LOTTIE)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setAnim(d); })
      .catch(() => { /* decorative — text still conveys empty state */ });
    return () => { alive = false; };
  }, []);

  if (!anim) {
    return <span style={{ width: size, height: size }} aria-hidden />;
  }
  return <LottieIllustration animationData={anim} size={size} loop ariaLabel={ariaLabel} />;
}

/* Figma 9:15461 Dropdown/Default — edit menu on Brand Subdue "แก้ไข". */
const EDIT_MENU_ITEMS = [
  { key: 'name', label: 'ชื่อกิจกรรม' },
  { key: 'subActivity', label: 'กิจกรรมย่อย' },
];

function ActivityEditMenu({ onEditName, onEditSubActivity }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const [menuWidth, setMenuWidth] = useState(256);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const w = triggerRef.current.getBoundingClientRect().width;
    setMenuWidth(Math.max(256, Math.round(w)));
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className='inline-flex shrink-0'>
      <BrandSubdueButton
        ref={triggerRef}
        variant='outline'
        size='sm'
        leadingIconElement={<Edit3LeadingIcon />}
        active={open}
        aria-haspopup='menu'
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        แก้ไข
      </BrandSubdueButton>
      <Popover
        open={open}
        onClose={close}
        anchorRef={triggerRef}
        style={{
          width: menuWidth,
          background: 'var(--surface-dropdown-default)',
          border: 'var(--dim-stroke-100) solid var(--border-dropdown-default)',
          borderRadius: 'var(--dim-radius-500)',
          boxShadow: 'var(--shadow-dropdown)',
          padding: 'var(--dim-space-100)',
          zIndex: 'var(--sm-z-modal-popover, 1450)',
        }}
      >
        <div role='menu' aria-label='แก้ไขกิจกรรม'>
          {EDIT_MENU_ITEMS.map((item) => (
            <ActionList
              key={item.key}
              as='button'
              role='menuitem'
              label={item.label}
              showLeadingIcon={false}
              showSubtext={false}
              showSwitch={false}
              showBadge={false}
              showCheck={false}
              showChevronRight={false}
              onClick={() => {
                close();
                if (item.key === 'name') onEditName?.();
                if (item.key === 'subActivity') onEditSubActivity?.();
              }}
            />
          ))}
        </div>
      </Popover>
    </div>
  );
}

function ActivitySection({
  activity,
  search,
  filterStatus,
  reorderMode,
  onToggleReorder,
  onEditActivity,
  onAddSubActivity,
  onEditSubActivity,
  onDeleteSubActivity,
  onToggleSubActive,
  onReorderSubActivities,
}) {
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const isReordering = reorderMode === activity.id;

  const hasSubActivities = (activity.subActivities || []).length > 0;
  const q = search.trim().toLowerCase();

  const subActivities = useMemo(() => {
    const sorted = sortSubActivities(activity.subActivities);
    return sorted.filter((sub) => {
      const matchesSearch = !q
        || activity.name.toLowerCase().includes(q)
        || sub.name.toLowerCase().includes(q);
      const matchesStatus = !filterStatus
        || (filterStatus === 'active' && sub.active)
        || (filterStatus === 'inactive' && !sub.active);
      return matchesSearch && matchesStatus;
    });
  }, [activity, q, filterStatus]);

  const activityMatchesSearch = !q
    || activity.name.toLowerCase().includes(q)
    || (activity.subActivities || []).some((sub) => sub.name.toLowerCase().includes(q));

  const handleDragStart = (e, idx) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(idx)); } catch { /* noop */ }
  };
  const handleDragOver = (e, idx) => { e.preventDefault(); setOverIdx(idx); };
  const handleDrop = (e, idx) => {
    e.preventDefault();
    const from = draggedIdx ?? Number(e.dataTransfer.getData('text/plain'));
    if (from == null || Number.isNaN(from) || from === idx) {
      setDraggedIdx(null); setOverIdx(null);
      return;
    }
    const sorted = sortSubActivities(activity.subActivities);
    const fromId = subActivities[from]?.id;
    const toId = subActivities[idx]?.id;
    const fromFull = sorted.findIndex((s) => s.id === fromId);
    const toFull = sorted.findIndex((s) => s.id === toId);
    if (fromFull >= 0 && toFull >= 0) {
      onReorderSubActivities(activity.id, fromFull, toFull);
    }
    setDraggedIdx(null);
    setOverIdx(null);
  };
  const handleDragEnd = () => { setDraggedIdx(null); setOverIdx(null); };

  const columns = useMemo(() => [
    {
      key: 'order',
      header: 'ลำดับ',
      sortable: true,
      render: (row) => <span style={TEXT_CELL}>{row.order}</span>,
    },
    {
      key: 'name',
      header: 'ชื่อกิจกรรมย่อย',
      flex: 1,
      minWidth: 200,
      sortable: true,
      render: (row) => <span style={TEXT_CELL}>{row.name}</span>,
    },
    {
      key: 'active',
      header: 'สถานะการใช้งาน',
      render: (row) => (
        <Switch
          checked={row.active}
          onChange={(next) => onToggleSubActive(activity.id, row.id, next)}
          aria-label={`สถานะ ${row.name}`}
        />
      ),
    },
    {
      key: 'action',
      header: 'การดำเนินการ',
      render: (row) => (
        <div className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueButton
            variant='outline'
            size='sm'
            leadingIconElement={<Edit3LeadingIcon />}
            onClick={() => onEditSubActivity(activity, row)}
            disabled={isReordering}
          >
            แก้ไข
          </NeutralSubdueButton>
          <NeutralSubdueIconButton
            variant='outline'
            size='sm'
            aria-label={`ลบ ${row.name}`}
            onClick={() => onDeleteSubActivity(activity, row)}
            disabled={isReordering}
          >
            <Icon name='trash' size={16} />
          </NeutralSubdueIconButton>
        </div>
      ),
    },
  ], [activity, isReordering, onToggleSubActive, onEditSubActivity, onDeleteSubActivity]);

  if (!hasSubActivities) {
    if (filterStatus) return null;
    if (q && !activityMatchesSearch) return null;
  } else if (subActivities.length === 0 && (q || filterStatus)) {
    return null;
  }

  const badgeLabel = `${activity.subActivities.length} กิจกรรมย่อย`;

  return (
    <section
      className='w-full flex flex-col'
      style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}
    >
      {!hasSubActivities ? (
        /* Figma 6:21313 — activity created, no sub-activities yet */
        <>
          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <span
              className='flex-1 min-w-0'
              style={{
                ...TEXT_CELL,
                fontFamily: 'var(--type-family-heading-graphic2)',
                color: 'var(--text-topic-secondary-title)',
              }}
            >
              {activity.name}
            </span>
            <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>
              {badgeLabel}
            </ColorfulBadge>
          </div>
          <BrandDashedAddButton onClick={() => onAddSubActivity(activity)}>
            เพิ่มกิจกรรมย่อย
          </BrandDashedAddButton>
        </>
      ) : (
        /* Figma 10:29241 — activity with sub-activity table */
        <>
          <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <div className='flex items-center min-w-0 flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <span style={{ ...TEXT_CELL, fontFamily: 'var(--type-family-heading-graphic2)', color: 'var(--text-topic-secondary-title)' }}>
                {activity.name}
              </span>
              <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>
                {badgeLabel}
              </ColorfulBadge>
            </div>
            <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-300)' }}>
              <NeutralSubdueButton
                variant='outline'
                size='sm'
                leadingIcon={isReordering ? 'check' : undefined}
                leadingIconElement={isReordering ? undefined : <Edit3LeadingIcon />}
                onClick={() => onToggleReorder(activity.id)}
              >
                {isReordering ? 'เสร็จสิ้น' : 'แก้ไขลำดับ'}
              </NeutralSubdueButton>
              <ActivityEditMenu
                onEditName={() => onEditActivity(activity)}
                onEditSubActivity={() => onAddSubActivity(activity)}
              />
            </div>
          </div>

          <Table
            columns={columns}
            rows={subActivities}
            rowKey={(row) => row.id}
            editMode={isReordering}
            draggedIdx={draggedIdx}
            overIdx={overIdx}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            emptyMessage='ยังไม่มีกิจกรรมย่อย'
          />

          {!isReordering ? (
            <BrandDashedAddButton onClick={() => onAddSubActivity(activity)}>
              เพิ่มกิจกรรมย่อย
            </BrandDashedAddButton>
          ) : null}
        </>
      )}
    </section>
  );
}

export default function ActivityPage() {
  const [activities, setActivities] = useState(() => readActivities());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [reorderMode, setReorderMode] = useState(null);
  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [editActivity, setEditActivity] = useState(null);
  const [subActivityModal, setSubActivityModal] = useState(null); // { mode, activity, sub? }
  const [toggleConfirm, setToggleConfirm] = useState(null); // { activityId, subId, next }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { activityId, subId, subName }
  const [deleteActivityConfirm, setDeleteActivityConfirm] = useState(null); // activity object

  const [activityNameDraft, setActivityNameDraft] = useState('');
  const [activityNameError, setActivityNameError] = useState('');
  const [subActivityDraft, setSubActivityDraft] = useState('');

  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:activity');

  const persist = useCallback((next) => {
    writeActivities(next);
    setActivities(next);
  }, []);

  const showToast = (message) => {
    setToast({ id: Date.now(), variant: 'success', message });
  };

  const stats = useMemo(() => computeActivityStats(activities), [activities]);

  /* ค่า active/inactive นับระดับกิจกรรมย่อย (สถานะเปิด/ปิดอยู่ที่กิจกรรมย่อย)
     — label จึงต้องพูดว่า "กิจกรรมย่อย" ไม่ใช่ "กิจกรรม" */
  const summaryCards = useMemo(() => [
    { key: 'total', icon: 'clipboard-list', color: 'info', value: String(stats.total), label: 'กิจกรรมทั้งหมด' },
    { key: 'active', icon: 'clipboard-list', color: 'positive', value: String(stats.active), label: 'กิจกรรมย่อยที่เปิดใช้งาน' },
    {
      key: 'inactive',
      icon: 'clipboard-list',
      color: 'destructive',
      value: String(stats.inactive),
      label: 'กิจกรรมย่อยที่ปิดใช้งาน',
    },
  ], [stats]);

  const visibleActivities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activities.filter((a) => {
      if (!q) return true;
      if (a.name.toLowerCase().includes(q)) return true;
      return (a.subActivities || []).some((sub) => sub.name.toLowerCase().includes(q));
    });
  }, [activities, search]);

  const filtersActive = !!filterStatus || !!search.trim();
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setSearch('');
      setFilterStatus('');
    },
  );
  const hasActivities = activities.length > 0;
  const hasAnySubActivity = useMemo(
    () => activities.some((a) => (a.subActivities || []).length > 0),
    [activities],
  );
  const showListChrome = hasActivities && hasAnySubActivity;

  const validateActivityName = (name, excludeId = null) => {
    const trimmed = name.trim();
    if (!trimmed) return '';
    if (isDuplicateActivityName(activities, trimmed, excludeId)) return DUPLICATE_ACTIVITY_ERROR;
    return '';
  };

  const handleActivityNameChange = (next) => {
    setActivityNameDraft(next);
    setActivityNameError(validateActivityName(next, editActivity?.id));
  };

  const closeActivityPopups = () => {
    setAddActivityOpen(false);
    setEditActivity(null);
    setActivityNameDraft('');
    setActivityNameError('');
  };

  const openAddActivity = () => {
    setActivityNameDraft('');
    setActivityNameError('');
    setEditActivity(null);
    setAddActivityOpen(true);
  };

  const openEditActivity = (activity) => {
    setActivityNameDraft(activity.name);
    setActivityNameError('');
    setAddActivityOpen(false);
    setEditActivity(activity);
  };

  const openAddSubActivity = (activity) => {
    setSubActivityDraft('');
    setSubActivityModal({ mode: 'add', activity });
  };

  const openEditSubActivity = (activity, sub) => {
    setSubActivityDraft(sub.name);
    setSubActivityModal({ mode: 'edit', activity, sub });
  };

  const handleSubmitSearch = (value) => {
    const q = (value || '').trim();
    if (q) pushHistory({ label: q, value: q });
    setSearch(q);
  };

  const canSaveActivityName = activityNameDraft.trim() && !activityNameError;

  const canSaveEditActivityName = useMemo(() => {
    const trimmed = activityNameDraft.trim();
    if (!trimmed || activityNameError || !editActivity) return false;
    return trimmed !== editActivity.name.trim();
  }, [activityNameDraft, activityNameError, editActivity]);

  const saveNewActivity = () => {
    const trimmed = activityNameDraft.trim();
    const err = validateActivityName(trimmed);
    if (!trimmed || err) {
      setActivityNameError(err || 'กรุณาระบุชื่อกิจกรรม');
      return;
    }
    const next = [...activities, createActivity(trimmed)];
    persist(next);
    closeActivityPopups();
    showToast('เพิ่มกิจกรรมสำเร็จ');
  };

  const saveEditActivity = () => {
    const trimmed = activityNameDraft.trim();
    const err = validateActivityName(trimmed, editActivity?.id);
    if (!trimmed || err || !editActivity || trimmed === editActivity.name.trim()) {
      setActivityNameError(err || 'กรุณาระบุชื่อกิจกรรม');
      return;
    }
    const next = activities.map((a) => (a.id === editActivity.id ? { ...a, name: trimmed } : a));
    persist(next);
    closeActivityPopups();
    showToast('แก้ไขชื่อกิจกรรมสำเร็จ');
  };

  const applyDeleteActivity = () => {
    if (!deleteActivityConfirm) return;
    const next = activities.filter((a) => a.id !== deleteActivityConfirm.id);
    persist(next);
    setDeleteActivityConfirm(null);
    closeActivityPopups();
    showToast('ลบกิจกรรมสำเร็จ');
  };

  const saveSubActivity = () => {
    const name = subActivityDraft.trim();
    if (!name || !subActivityModal) return;
    const { mode, activity, sub } = subActivityModal;
    const next = activities.map((a) => {
      if (a.id !== activity.id) return a;
      if (mode === 'add') {
        const order = (a.subActivities?.length || 0) + 1;
        return { ...a, subActivities: [...(a.subActivities || []), createSubActivity(name, order)] };
      }
      return {
        ...a,
        subActivities: (a.subActivities || []).map((s) => (
          s.id === sub.id ? { ...s, name } : s
        )),
      };
    });
    persist(next);
    setSubActivityModal(null);
    setSubActivityDraft('');
    showToast(mode === 'add' ? 'เพิ่มกิจกรรมย่อยสำเร็จ' : 'บันทึกกิจกรรมย่อยสำเร็จ');
  };

  const applyToggleSubActive = (activityId, subId, next) => {
    const nextActivities = activities.map((a) => {
      if (a.id !== activityId) return a;
      return {
        ...a,
        subActivities: (a.subActivities || []).map((s) => (
          s.id === subId ? { ...s, active: next } : s
        )),
      };
    });
    persist(nextActivities);
    setToggleConfirm(null);
    showToast(next ? 'เปิดใช้งานกิจกรรมย่อยแล้ว' : 'ปิดใช้งานกิจกรรมย่อยแล้ว');
  };

  const handleToggleSubActive = (activityId, subId, next) => {
    if (!next) {
      setToggleConfirm({ activityId, subId, next });
      return;
    }
    applyToggleSubActive(activityId, subId, next);
  };

  const handleDeleteSubActivity = (activity, sub) => {
    setDeleteConfirm({ activityId: activity.id, subId: sub.id, subName: sub.name });
  };

  const applyDeleteSubActivity = () => {
    if (!deleteConfirm) return;
    const { activityId, subId } = deleteConfirm;
    const next = activities.map((a) => {
      if (a.id !== activityId) return a;
      const filtered = (a.subActivities || []).filter((s) => s.id !== subId);
      const reordered = filtered.map((s, i) => ({ ...s, order: i + 1 }));
      return { ...a, subActivities: reordered };
    });
    persist(next);
    setDeleteConfirm(null);
    showToast('ลบกิจกรรมย่อยสำเร็จ');
  };

  const handleReorderSubActivities = (activityId, fromIdx, toIdx) => {
    const next = activities.map((a) => {
      if (a.id !== activityId) return a;
      return { ...a, subActivities: reorderSubActivities(a.subActivities, fromIdx, toIdx) };
    });
    persist(next);
  };

  const toggleReorder = (activityId) => {
    setReorderMode((prev) => (prev === activityId ? null : activityId));
  };

  return (
    <>
      <QueuePageShell
        activeKey='assess-activity'
        sidebarItems={ASSESS_NAV}
        sidebarFallbackKey='assess-activity'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        /* ชื่อหน้า + ปุ่มเพิ่มอยู่ใน SubHeader มาตรฐาน (เหมือนหน้าศูนย์บริการ)
           ระยะบนจึงเท่ากับหน้าอื่น และปุ่มยัง sticky ตอนเลื่อนตาราง */
        title='กิจกรรม'
        actions={showListChrome ? (
          <BrandButton variant='fill' size='md' leadingIcon='add' onClick={openAddActivity}>
            เพิ่มกิจกรรม
          </BrandButton>
        ) : undefined}
        headerInfo={showListChrome ? (
          <section
            className='flex flex-col w-full'
            style={{ gap: 'var(--dim-space-400)', paddingTop: 'var(--dim-space-600)' }}
          >
            <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
              {summaryCards.map((c) => (
                <SummaryCard key={c.key} card={c} variant='panel' />
              ))}
            </div>
          </section>
        ) : null}
      >
        {!hasActivities ? (
          <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)' }}>
            <section
              className='flex flex-col items-center justify-center flex-1 w-full'
              style={{ ...CARD, padding: 'var(--dim-space-900, 48px)', gap: 'var(--dim-space-400)', minHeight: 480 }}
            >
              <EmptyIllustration />
              <span
                style={{
                  color: 'var(--text-brandPrimary-default)',
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-sm)',
                }}
              >
                ในระบบยังไม่มีกิจกรรม
              </span>
              <BrandButton variant='fill' size='lg' leadingIcon='add' onClick={openAddActivity}>
                เพิ่มกิจกรรม
              </BrandButton>
            </section>
          </div>
        ) : (
          <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}>
            {showListChrome ? (
              <section
                className='w-full flex flex-col items-center'
                style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}
              >
                {/* ปุ่มนำส่งออกรายงานอยู่ข้างกล่องค้นหา (ย้ายจากแถวตัวกรอง — 16 ส.ค. 2569) */}
                <div className='w-full flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
                  {/* spacer ซ้ายสมดุลกับกลุ่มปุ่มขวา — กล่องค้นหาอยู่กึ่งกลางจริง */}
                  <div className='flex-1' />
                  <PrimarySearch
                    value={search}
                    onChange={setSearch}
                    onSubmit={handleSubmitSearch}
                    placeholder='ค้นหาชื่อกิจกรรม / ชื่อกิจกรรมย่อย'
                    width={640}
                    history={searchHistory}
                    onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                  />
                  <div className='flex-1 flex justify-end'>
                  <NeutralSubdueButton leadingIcon='ios_share' size='sm' collapseLabelBelow='lg'>
                    นำส่งออกรายงาน
                  </NeutralSubdueButton>
                  </div>
                </div>

                <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                  <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                    <FilterDropdown
                      prefix='สถานะ:'
                      options={STATUS_OPTIONS.filter((o) => o.value !== '')}
                      value={filterStatus}
                      onChange={setFilterStatus}
                      placeholder='ทั้งหมด'
                    />
                    <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
                  </div>
                  <div className='flex-1' />
                </div>
              </section>
            ) : null}

            <SmoothFilterResults opaque={resultsOpaque}>
            {visibleActivities.map((activity) => (
              <ActivitySection
                key={activity.id}
                activity={activity}
                search={search}
                filterStatus={filterStatus}
                reorderMode={reorderMode}
                onToggleReorder={toggleReorder}
                onEditActivity={openEditActivity}
                onAddSubActivity={openAddSubActivity}
                onEditSubActivity={openEditSubActivity}
                onDeleteSubActivity={handleDeleteSubActivity}
                onToggleSubActive={handleToggleSubActive}
                onReorderSubActivities={handleReorderSubActivities}
              />
            ))}
            </SmoothFilterResults>

            <section
              className='flex flex-col items-center w-full'
              style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}
            >
              <EmptyIllustration size={128} ariaLabel='เพิ่มกิจกรรม' />
              <BrandButton variant='fill' size='lg' leadingIcon='add' onClick={openAddActivity}>
                เพิ่มกิจกรรม
              </BrandButton>
            </section>
          </div>
        )}
      </QueuePageShell>

      {/* Add activity — Figma 8:11704 */}
      <Popup
        open={addActivityOpen}
        onClose={closeActivityPopups}
        size='large'
        title='ชื่อกิจกรรม'
        subtitle='ใส่ชื่อกิจกรรมหลักของบุคลากร'
        tertiaryAction={{ label: 'ยกเลิก', onClick: closeActivityPopups }}
        primaryAction={{
          label: 'ตกลง',
          onClick: saveNewActivity,
          disabled: !canSaveActivityName,
        }}
      >
        <InputField
          autoFocus
          showLabel={false}
          showHelperText={!!activityNameError}
          showLeadingIcon={false}
          placeholder='เช่น แพทย์, นักสังคมสงเคราะห์'
          value={activityNameDraft}
          onChange={handleActivityNameChange}
          error={activityNameError || undefined}
        />
      </Popup>

      {/* Edit activity name — Figma 9:15670 */}
      <Popup
        open={!!editActivity}
        onClose={closeActivityPopups}
        size='large'
        title='แก้ไขชื่อกิจกรรม'
        subtitle='ใส่ชื่อกิจกรรมหลักของบุคลากร'
        tertiaryAction={{ label: 'ยกเลิก', onClick: closeActivityPopups }}
        secondaryAction={{
          label: 'ลบกิจกรรม',
          onClick: () => editActivity && setDeleteActivityConfirm(editActivity),
        }}
        primaryAction={{
          label: 'ตกลง',
          onClick: saveEditActivity,
          disabled: !canSaveEditActivityName,
        }}
      >
        <InputField
          autoFocus
          showLabel={false}
          showHelperText={!!activityNameError}
          showLeadingIcon={false}
          placeholder='เช่น แพทย์, นักสังคมสงเคราะห์'
          value={activityNameDraft}
          onChange={handleActivityNameChange}
          error={activityNameError || undefined}
        />
      </Popup>

      {/* Add / edit sub-activity — Figma 8:11833 */}
      <Popup
        open={!!subActivityModal}
        onClose={() => setSubActivityModal(null)}
        size='large'
        title={subActivityModal?.mode === 'add'
          ? `กิจกรรมย่อยสำหรับ${subActivityModal?.activity?.name || ''}`
          : 'แก้ไขกิจกรรมย่อย'}
        subtitle={subActivityModal?.mode === 'add'
          ? 'ระบุชื่อกิจกรรมย่อยภายใต้กิจกรรมนี้'
          : 'แก้ไขชื่อกิจกรรมย่อย'}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setSubActivityModal(null) }}
        primaryAction={{
          label: subActivityModal?.mode === 'add' ? 'ตกลง' : 'บันทึก',
          onClick: saveSubActivity,
          disabled: !subActivityDraft.trim(),
        }}
      >
        <InputField
          autoFocus
          label='กิจกรรมย่อย'
          required
          showLeadingIcon={false}
          placeholder='เช่น นักสังคมสงเคราะห์ศูนย์'
          value={subActivityDraft}
          onChange={setSubActivityDraft}
        />
      </Popup>

      <AlertDialog
        open={!!toggleConfirm}
        onClose={() => setToggleConfirm(null)}
        type='warning'
        alignment='center'
        title='ปิดการใช้งานกิจกรรมย่อย?'
        description='การปิดใช้งานจะทำให้กิจกรรมย่อยนี้ไม่สามารถใช้งานได้จนกว่าจะเปิดอีกครั้ง'
        confirmLabel='ปิดการใช้งาน'
        cancelLabel='ยกเลิก'
        onConfirm={() => {
          if (toggleConfirm) {
            applyToggleSubActive(toggleConfirm.activityId, toggleConfirm.subId, toggleConfirm.next);
          }
        }}
      />

      <AlertDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        type='warning'
        alignment='center'
        title='ลบกิจกรรมย่อย?'
        description={deleteConfirm ? `ต้องการลบ "${deleteConfirm.subName}" ออกจากระบบหรือไม่` : ''}
        confirmLabel='ลบ'
        cancelLabel='ยกเลิก'
        onConfirm={applyDeleteSubActivity}
      />

      <AlertDialog
        open={!!deleteActivityConfirm}
        onClose={() => setDeleteActivityConfirm(null)}
        type='warning'
        alignment='center'
        title='ลบกิจกรรม?'
        description={deleteActivityConfirm
          ? `ต้องการลบ "${deleteActivityConfirm.name}" และกิจกรรมย่อยทั้งหมดออกจากระบบหรือไม่`
          : ''}
        confirmLabel='ลบ'
        cancelLabel='ยกเลิก'
        onConfirm={applyDeleteActivity}
      />

      <PhcisTopToast session={toast} onDismiss={dismissToast} />
    </>
  );
}
