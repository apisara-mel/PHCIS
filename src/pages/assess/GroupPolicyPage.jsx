import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
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
import Topic from '@/components/topic/Topic';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import ASSESS_NAV from '@/pages/assess/assessNav';
import {
  readGroupPolicies,
  writeGroupPolicies,
  computeGroupPolicyStats,
  createGroupPolicy,
  createSubBranch,
  sortSubBranches,
  reorderSubBranches,
  isDuplicateGroupPolicyName,
} from '@/data/groupPolicyStore';

/* PHCIS | Assess-control — Create Group Policy (Figma 4D3nTx53 · 3:18430).
   Empty state · summary cards · search · filters · grouped sub-branch tables
   · add/edit popups · reorder · status toggles · confirm dialogs. */

const breadcrumb = ['Group Policy'];

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

const DUPLICATE_POLICY_ERROR = 'ชื่อGroup Policyซ้ำกับที่มีอยู่ กรุณาเปลี่ยนชื่อGroup Policyใหม่';

/* Figma 9:14401 — Edit 3 leading icon on outline subdue buttons (16px sm). */
function Edit3LeadingIcon({ size = 16 }) {
  return <Icon name='edit_3' size={size} />;
}

/* Figma 3:18431 Roles_Empty — Ambulance Lottie 160×160; list footer 6:21313 / 10:29241 — 128×128. */
const AMBULANCE_LOTTIE = '/illustration/ambulance.json';

function EmptyIllustration({ size = 160, ariaLabel = 'ยังไม่มี Group Policy' }) {
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
  { key: 'name', label: 'ชื่อ Group Policy' },
  { key: 'subBranch', label: 'สาขาย่อย' },
];

function GroupPolicyEditMenu({ onEditName, onEditSubBranch }) {
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
        <div role='menu' aria-label='แก้ไข Group Policy'>
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
                if (item.key === 'subBranch') onEditSubBranch?.();
              }}
            />
          ))}
        </div>
      </Popover>
    </div>
  );
}

function GroupPolicySection({
  policy,
  search,
  filterStatus,
  reorderMode,
  onToggleReorder,
  onEditPolicy,
  onAddSubBranch,
  onEditSubBranch,
  onDeleteSubBranch,
  onToggleSubActive,
  onReorderSubBranches,
}) {
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const isReordering = reorderMode === policy.id;

  const hasSubBranches = (policy.subBranches || []).length > 0;
  const q = search.trim().toLowerCase();

  const subBranches = useMemo(() => {
    const sorted = sortSubBranches(policy.subBranches);
    return sorted.filter((sb) => {
      const matchesSearch = !q
        || policy.name.toLowerCase().includes(q)
        || sb.name.toLowerCase().includes(q);
      const matchesStatus = !filterStatus
        || (filterStatus === 'active' && sb.active)
        || (filterStatus === 'inactive' && !sb.active);
      return matchesSearch && matchesStatus;
    });
  }, [policy, q, filterStatus]);

  const policyMatchesSearch = !q
    || policy.name.toLowerCase().includes(q)
    || (policy.subBranches || []).some((sb) => sb.name.toLowerCase().includes(q));

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
    const sorted = sortSubBranches(policy.subBranches);
    const fromId = subBranches[from]?.id;
    const toId = subBranches[idx]?.id;
    const fromFull = sorted.findIndex((s) => s.id === fromId);
    const toFull = sorted.findIndex((s) => s.id === toId);
    if (fromFull >= 0 && toFull >= 0) {
      onReorderSubBranches(policy.id, fromFull, toFull);
    }
    setDraggedIdx(null);
    setOverIdx(null);
  };
  const handleDragEnd = () => { setDraggedIdx(null); setOverIdx(null); };

  const columns = useMemo(() => [
    {
      key: 'order',
      header: 'ลำดับ',
      width: 80,
      sortable: true,
      render: (row) => <span style={TEXT_CELL}>{row.order}</span>,
    },
    {
      key: 'name',
      header: 'ชื่อสาขาย่อย',
      flex: 1,
      minWidth: 200,
      sortable: true,
      render: (row) => <span style={TEXT_CELL}>{row.name}</span>,
    },
    {
      key: 'active',
      header: 'สถานะการใช้งาน',
      width: 160,
      render: (row) => (
        <Switch
          checked={row.active}
          onChange={(next) => onToggleSubActive(policy.id, row.id, next)}
          aria-label={`สถานะ ${row.name}`}
        />
      ),
    },
    {
      key: 'action',
      header: 'การดำเนินการ',
      width: 160,
      render: (row) => (
        <div className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueButton
            variant='outline'
            size='sm'
            leadingIconElement={<Edit3LeadingIcon />}
            onClick={() => onEditSubBranch(policy, row)}
            disabled={isReordering}
          >
            แก้ไข
          </NeutralSubdueButton>
          <NeutralSubdueIconButton
            variant='outline'
            size='sm'
            aria-label={`ลบ ${row.name}`}
            onClick={() => onDeleteSubBranch(policy, row)}
            disabled={isReordering}
          >
            <Icon name='trash' size={16} />
          </NeutralSubdueIconButton>
        </div>
      ),
    },
  ], [policy, isReordering, onToggleSubActive, onEditSubBranch, onDeleteSubBranch]);

  if (!hasSubBranches) {
    if (filterStatus) return null;
    if (q && !policyMatchesSearch) return null;
  } else if (subBranches.length === 0 && (q || filterStatus)) {
    return null;
  }

  const badgeLabel = `${policy.subBranches.length} สาขาย่อย`;

  return (
    <section
      className='w-full flex flex-col'
      style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}
    >
      {!hasSubBranches ? (
        /* Figma 6:21313 — policy created, no sub-branches yet */
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
              {policy.name}
            </span>
            <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>
              {badgeLabel}
            </ColorfulBadge>
          </div>
          <BrandDashedAddButton onClick={() => onAddSubBranch(policy)}>
            เพิ่มสาขาย่อย
          </BrandDashedAddButton>
        </>
      ) : (
        /* Figma 10:29241 — policy with sub-branch table */
        <>
          <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <div className='flex items-center min-w-0 flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <span style={{ ...TEXT_CELL, fontFamily: 'var(--type-family-heading-graphic2)', color: 'var(--text-topic-secondary-title)' }}>
                {policy.name}
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
                onClick={() => onToggleReorder(policy.id)}
              >
                {isReordering ? 'เสร็จสิ้น' : 'แก้ไขลำดับ'}
              </NeutralSubdueButton>
              <GroupPolicyEditMenu
                onEditName={() => onEditPolicy(policy)}
                onEditSubBranch={() => onAddSubBranch(policy)}
              />
            </div>
          </div>

          <Table
            columns={columns}
            rows={subBranches}
            rowKey={(row) => row.id}
            editMode={isReordering}
            draggedIdx={draggedIdx}
            overIdx={overIdx}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            emptyMessage='ยังไม่มีสาขาย่อย'
          />

          {!isReordering ? (
            <BrandDashedAddButton onClick={() => onAddSubBranch(policy)}>
              เพิ่มสาขาย่อย
            </BrandDashedAddButton>
          ) : null}
        </>
      )}
    </section>
  );
}

export default function GroupPolicyPage() {
  const [policies, setPolicies] = useState(() => readGroupPolicies());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [reorderMode, setReorderMode] = useState(null);
  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const [addPolicyOpen, setAddPolicyOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState(null);
  const [subBranchModal, setSubBranchModal] = useState(null); // { mode, policy, sub? }
  const [toggleConfirm, setToggleConfirm] = useState(null); // { policyId, subId, next }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { policyId, subId, subName }
  const [deletePolicyConfirm, setDeletePolicyConfirm] = useState(null); // policy object

  const [policyNameDraft, setPolicyNameDraft] = useState('');
  const [policyNameError, setPolicyNameError] = useState('');
  const [subBranchDraft, setSubBranchDraft] = useState('');

  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:group-policy');

  const persist = useCallback((next) => {
    writeGroupPolicies(next);
    setPolicies(next);
  }, []);

  const showToast = (message) => {
    setToast({ id: Date.now(), variant: 'success', message });
  };

  const stats = useMemo(() => computeGroupPolicyStats(policies), [policies]);

  const summaryCards = useMemo(() => [
    { key: 'total', icon: 'clipboard-list', color: 'info', value: String(stats.total), label: 'Group Policy ทั้งหมด' },
    { key: 'active', icon: 'clipboard-list', color: 'positive', value: String(stats.active), label: 'Group Policy ที่เปิดใช้งาน' },
    {
      key: 'inactive',
      icon: 'clipboard-list',
      color: 'destructive',
      value: String(stats.inactive),
      label: 'Group Policy ที่ปิดใช้งาน',
    },
  ], [stats]);

  const visiblePolicies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return policies.filter((p) => {
      if (!q) return true;
      if (p.name.toLowerCase().includes(q)) return true;
      return (p.subBranches || []).some((sb) => sb.name.toLowerCase().includes(q));
    });
  }, [policies, search]);

  const isAllFilters = !filterStatus;
  const hasPolicies = policies.length > 0;
  const hasAnySubBranch = useMemo(
    () => policies.some((p) => (p.subBranches || []).length > 0),
    [policies],
  );
  const showListChrome = hasPolicies && hasAnySubBranch;

  const validatePolicyName = (name, excludeId = null) => {
    const trimmed = name.trim();
    if (!trimmed) return '';
    if (isDuplicateGroupPolicyName(policies, trimmed, excludeId)) return DUPLICATE_POLICY_ERROR;
    return '';
  };

  const handlePolicyNameChange = (next) => {
    setPolicyNameDraft(next);
    setPolicyNameError(validatePolicyName(next, editPolicy?.id));
  };

  const closePolicyPopups = () => {
    setAddPolicyOpen(false);
    setEditPolicy(null);
    setPolicyNameDraft('');
    setPolicyNameError('');
  };

  const openAddPolicy = () => {
    setPolicyNameDraft('');
    setPolicyNameError('');
    setEditPolicy(null);
    setAddPolicyOpen(true);
  };

  const openEditPolicy = (policy) => {
    setPolicyNameDraft(policy.name);
    setPolicyNameError('');
    setAddPolicyOpen(false);
    setEditPolicy(policy);
  };

  const openAddSubBranch = (policy) => {
    setSubBranchDraft('');
    setSubBranchModal({ mode: 'add', policy });
  };

  const openEditSubBranch = (policy, sub) => {
    setSubBranchDraft(sub.name);
    setSubBranchModal({ mode: 'edit', policy, sub });
  };

  const handleSubmitSearch = (value) => {
    const q = (value || '').trim();
    if (q) pushHistory({ label: q, value: q });
    setSearch(q);
  };

  const canSavePolicyName = policyNameDraft.trim() && !policyNameError;

  const canSaveEditPolicyName = useMemo(() => {
    const trimmed = policyNameDraft.trim();
    if (!trimmed || policyNameError || !editPolicy) return false;
    return trimmed !== editPolicy.name.trim();
  }, [policyNameDraft, policyNameError, editPolicy]);

  const saveNewPolicy = () => {
    const trimmed = policyNameDraft.trim();
    const err = validatePolicyName(trimmed);
    if (!trimmed || err) {
      setPolicyNameError(err || 'กรุณาระบุชื่อ Group Policy');
      return;
    }
    const next = [...policies, createGroupPolicy(trimmed)];
    persist(next);
    closePolicyPopups();
    showToast('เพิ่ม Group Policy สำเร็จ');
  };

  const saveEditPolicy = () => {
    const trimmed = policyNameDraft.trim();
    const err = validatePolicyName(trimmed, editPolicy?.id);
    if (!trimmed || err || !editPolicy || trimmed === editPolicy.name.trim()) {
      setPolicyNameError(err || 'กรุณาระบุชื่อ Group Policy');
      return;
    }
    const next = policies.map((p) => (p.id === editPolicy.id ? { ...p, name: trimmed } : p));
    persist(next);
    closePolicyPopups();
    showToast('แก้ไขชื่อ Group Policy สำเร็จ');
  };

  const applyDeletePolicy = () => {
    if (!deletePolicyConfirm) return;
    const next = policies.filter((p) => p.id !== deletePolicyConfirm.id);
    persist(next);
    setDeletePolicyConfirm(null);
    closePolicyPopups();
    showToast('ลบ Group Policy สำเร็จ');
  };

  const saveSubBranch = () => {
    const name = subBranchDraft.trim();
    if (!name || !subBranchModal) return;
    const { mode, policy, sub } = subBranchModal;
    const next = policies.map((p) => {
      if (p.id !== policy.id) return p;
      if (mode === 'add') {
        const order = (p.subBranches?.length || 0) + 1;
        return { ...p, subBranches: [...(p.subBranches || []), createSubBranch(name, order)] };
      }
      return {
        ...p,
        subBranches: (p.subBranches || []).map((sb) => (
          sb.id === sub.id ? { ...sb, name } : sb
        )),
      };
    });
    persist(next);
    setSubBranchModal(null);
    setSubBranchDraft('');
    showToast(mode === 'add' ? 'เพิ่มสาขาย่อยสำเร็จ' : 'บันทึกสาขาย่อยสำเร็จ');
  };

  const applyToggleSubActive = (policyId, subId, next) => {
    const nextPolicies = policies.map((p) => {
      if (p.id !== policyId) return p;
      return {
        ...p,
        subBranches: (p.subBranches || []).map((sb) => (
          sb.id === subId ? { ...sb, active: next } : sb
        )),
      };
    });
    persist(nextPolicies);
    setToggleConfirm(null);
    showToast(next ? 'เปิดใช้งานสาขาย่อยแล้ว' : 'ปิดใช้งานสาขาย่อยแล้ว');
  };

  const handleToggleSubActive = (policyId, subId, next) => {
    if (!next) {
      setToggleConfirm({ policyId, subId, next });
      return;
    }
    applyToggleSubActive(policyId, subId, next);
  };

  const handleDeleteSubBranch = (policy, sub) => {
    setDeleteConfirm({ policyId: policy.id, subId: sub.id, subName: sub.name });
  };

  const applyDeleteSubBranch = () => {
    if (!deleteConfirm) return;
    const { policyId, subId } = deleteConfirm;
    const next = policies.map((p) => {
      if (p.id !== policyId) return p;
      const filtered = (p.subBranches || []).filter((sb) => sb.id !== subId);
      const reordered = filtered.map((sb, i) => ({ ...sb, order: i + 1 }));
      return { ...p, subBranches: reordered };
    });
    persist(next);
    setDeleteConfirm(null);
    showToast('ลบสาขาย่อยสำเร็จ');
  };

  const handleReorderSubBranches = (policyId, fromIdx, toIdx) => {
    const next = policies.map((p) => {
      if (p.id !== policyId) return p;
      return { ...p, subBranches: reorderSubBranches(p.subBranches, fromIdx, toIdx) };
    });
    persist(next);
  };

  const toggleReorder = (policyId) => {
    setReorderMode((prev) => (prev === policyId ? null : policyId));
  };

  return (
    <>
      <QueuePageShell
        activeKey='assess-group-policy'
        sidebarItems={ASSESS_NAV}
        sidebarFallbackKey='assess-group-policy'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        title={hasPolicies && showListChrome ? undefined : 'Group Policy'}
        headerInfo={showListChrome ? (
          <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex-1 min-w-0'>
                <Topic
                  hierarchy='tertiary'
                  title='Group Policy'
                  showSubText={false}
                  showBadge={false}
                  showChevron={false}
                  showLeadingIcon={false}
                  showSuccess={false}
                />
              </div>
              <BrandButton variant='fill' size='md' leadingIcon='add' onClick={openAddPolicy}>
                เพิ่ม Group Policy
              </BrandButton>
            </div>
            <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
              {summaryCards.map((c) => (
                <SummaryCard key={c.key} card={c} variant='panel' hover />
              ))}
            </div>
          </section>
        ) : null}
      >
        {!hasPolicies ? (
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
                ในระบบยังไม่มีบทบาทหน้าที่
              </span>
              <BrandButton variant='fill' size='lg' leadingIcon='add' onClick={openAddPolicy}>
                เพิ่ม Group Policy
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
                <PrimarySearch
                  value={search}
                  onChange={setSearch}
                  onSubmit={handleSubmitSearch}
                  placeholder='ค้นหาชื่อ Group Policy / ชื่อสาขาย่อย'
                  width={640}
                  history={searchHistory}
                  onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                />

                <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                  <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                    <FilterTag
                      value='ทั้งหมด'
                      selected={isAllFilters}
                      onClick={() => setFilterStatus('')}
                    />
                    <FilterDropdown
                      prefix='สถานะ:'
                      options={STATUS_OPTIONS.filter((o) => o.value !== '')}
                      value={filterStatus}
                      onChange={setFilterStatus}
                      placeholder='ทั้งหมด'
                    />
                  </div>
                  <div className='flex-1' />
                  <NeutralSubdueButton leadingIcon='ios_share' size='sm' collapseLabelBelow='lg'>
                    นำส่งออกรายงาน
                  </NeutralSubdueButton>
                </div>
              </section>
            ) : null}

            {visiblePolicies.map((policy) => (
              <GroupPolicySection
                key={policy.id}
                policy={policy}
                search={search}
                filterStatus={filterStatus}
                reorderMode={reorderMode}
                onToggleReorder={toggleReorder}
                onEditPolicy={openEditPolicy}
                onAddSubBranch={openAddSubBranch}
                onEditSubBranch={openEditSubBranch}
                onDeleteSubBranch={handleDeleteSubBranch}
                onToggleSubActive={handleToggleSubActive}
                onReorderSubBranches={handleReorderSubBranches}
              />
            ))}

            <section
              className='flex flex-col items-center w-full'
              style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}
            >
              <EmptyIllustration size={128} ariaLabel='เพิ่ม Group Policy' />
              <BrandButton variant='fill' size='lg' leadingIcon='add' onClick={openAddPolicy}>
                เพิ่ม Group Policy
              </BrandButton>
            </section>
          </div>
        )}
      </QueuePageShell>

      {/* Add Group Policy — Figma 8:11704 */}
      <Popup
        open={addPolicyOpen}
        onClose={closePolicyPopups}
        size='large'
        title='ชื่อ Group Policy'
        subtitle='ใส่ชื่อกลุ่มตำแหน่งหน้าที่ของบุคลากร'
        tertiaryAction={{ label: 'ยกเลิก', onClick: closePolicyPopups }}
        primaryAction={{
          label: 'ตกลง',
          onClick: saveNewPolicy,
          disabled: !canSavePolicyName,
        }}
      >
        <InputField
          autoFocus
          showLabel={false}
          showHelperText={!!policyNameError}
          showLeadingIcon={false}
          placeholder='เช่น แพทย์, พยาบาล'
          value={policyNameDraft}
          onChange={handlePolicyNameChange}
          error={policyNameError || undefined}
        />
      </Popup>

      {/* Edit Group Policy name — Figma 9:15670 */}
      <Popup
        open={!!editPolicy}
        onClose={closePolicyPopups}
        size='large'
        title='แก้ไขชื่อ Group Policy'
        subtitle='ใส่ชื่อกลุ่มตำแหน่งหน้าที่ของบุคลากร'
        tertiaryAction={{ label: 'ยกเลิก', onClick: closePolicyPopups }}
        secondaryAction={{
          label: 'ลบ Group Policy',
          onClick: () => editPolicy && setDeletePolicyConfirm(editPolicy),
        }}
        primaryAction={{
          label: 'ตกลง',
          onClick: saveEditPolicy,
          disabled: !canSaveEditPolicyName,
        }}
      >
        <InputField
          autoFocus
          showLabel={false}
          showHelperText={!!policyNameError}
          showLeadingIcon={false}
          placeholder='เช่น แพทย์, พยาบาล'
          value={policyNameDraft}
          onChange={handlePolicyNameChange}
          error={policyNameError || undefined}
        />
      </Popup>

      {/* Add / edit sub-branch — Figma 8:11833 */}
      <Popup
        open={!!subBranchModal}
        onClose={() => setSubBranchModal(null)}
        size='large'
        title={subBranchModal?.mode === 'add'
          ? `สาขาย่อยสำหรับ${subBranchModal?.policy?.name || ''}`
          : 'แก้ไขสาขาย่อย'}
        subtitle={subBranchModal?.mode === 'add'
          ? 'ระบุชื่อสาขาย่อยภายใต้ Group Policy นี้'
          : 'แก้ไขชื่อสาขาย่อย'}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setSubBranchModal(null) }}
        primaryAction={{
          label: subBranchModal?.mode === 'add' ? 'ตกลง' : 'บันทึก',
          onClick: saveSubBranch,
          disabled: !subBranchDraft.trim(),
        }}
      >
        <InputField
          autoFocus
          label='สาขาย่อย'
          required
          showLeadingIcon={false}
          placeholder='เช่น ทันตกรรม, แพทย์แผนไทย'
          value={subBranchDraft}
          onChange={setSubBranchDraft}
        />
      </Popup>

      <AlertDialog
        open={!!toggleConfirm}
        onClose={() => setToggleConfirm(null)}
        type='warning'
        alignment='center'
        title='ปิดการใช้งานสาขาย่อย?'
        description='การปิดใช้งานจะทำให้สาขาย่อยนี้ไม่สามารถใช้งานได้จนกว่าจะเปิดอีกครั้ง'
        confirmLabel='ปิดการใช้งาน'
        cancelLabel='ยกเลิก'
        onConfirm={() => {
          if (toggleConfirm) {
            applyToggleSubActive(toggleConfirm.policyId, toggleConfirm.subId, toggleConfirm.next);
          }
        }}
      />

      <AlertDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        type='warning'
        alignment='center'
        title='ลบสาขาย่อย?'
        description={deleteConfirm ? `ต้องการลบ "${deleteConfirm.subName}" ออกจากระบบหรือไม่` : ''}
        confirmLabel='ลบ'
        cancelLabel='ยกเลิก'
        onConfirm={applyDeleteSubBranch}
      />

      <AlertDialog
        open={!!deletePolicyConfirm}
        onClose={() => setDeletePolicyConfirm(null)}
        type='warning'
        alignment='center'
        title='ลบ Group Policy?'
        description={deletePolicyConfirm
          ? `ต้องการลบ "${deletePolicyConfirm.name}" และสาขาย่อยทั้งหมดออกจากระบบหรือไม่`
          : ''}
        confirmLabel='ลบ'
        cancelLabel='ยกเลิก'
        onConfirm={applyDeletePolicy}
      />

      <PhcisTopToast session={toast} onDismiss={dismissToast} />
    </>
  );
}
