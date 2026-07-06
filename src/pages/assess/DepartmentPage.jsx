import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import InputField from '@/components/forms/InputField';
import Switch from '@/components/switch/Switch';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import Icon from '@/components/icons/Icon';
import ASSESS_NAV from '@/pages/assess/assessNav';
import { useClinicFilter } from '@/components/layout/HeaderClinicContext';
import {
  readDepartments,
  writeDepartments,
  sortDepartments,
  computeDepartmentStats,
  createDepartment,
  reorderDepartments,
  isDuplicateDepartmentName,
} from '@/data/departmentStore';

/* PHCIS | Assess-control — Create Department (Figma 4D3nTx53 · 9:16022).
   Empty state · summary cards · search · filters · department table
   · add/edit popup with duplicate validation · reorder · status toggles. */

const breadcrumb = ['แผนก'];

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
};

const PANEL_TITLE = {
  color: 'var(--text-topic-tertiary-title)',
  fontFamily: 'var(--type-family-heading-content)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-bold)',
  lineHeight: 1.5,
  margin: 'var(--dim-space-0)',
};

const TEXT_CELL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'เปิดการใช้งาน' },
  { value: 'inactive', label: 'ปิดการใช้งาน' },
];

const DUPLICATE_ERROR = 'ชื่อแผนกซ้ำกับที่มีอยู่ กรุณาเปลี่ยนชื่อแผนกใหม่';

/* Figma 9:14401 — Edit 3 on outline subdue buttons (16px sm). */
function Edit3LeadingIcon({ size = 16 }) {
  return <Icon name='edit_3' size={size} />;
}

/* Same empty illustration as ศูนย์บริการ (SystemCentersPage · Figma 1:2558). */
const AMBULANCE_LOTTIE = '/illustration/ambulance.json';

function EmptyIllustration() {
  const [anim, setAnim] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(AMBULANCE_LOTTIE)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setAnim(d); })
      .catch(() => { /* decorative */ });
    return () => { alive = false; };
  }, []);

  if (!anim) {
    return <span style={{ width: 160, height: 160 }} aria-hidden />;
  }
  return <LottieIllustration animationData={anim} size={160} loop ariaLabel='ยังไม่มีแผนก' />;
}

/* Context line — makes it explicit that the departments shown belong to the
   center currently selected in the header chip. Each ศูนย์บริการ runs its own
   set of departments, so the active center is always surfaced. */
function CenterContextLine({ label }) {
  return (
    <span
      className='inline-flex items-center'
      style={{
        gap: 'var(--dim-space-150)',
        color: 'var(--text-content-secondary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.5,
      }}
    >
      <Icon name='location_on' size={16} style={{ color: 'var(--icon-brandPrimary-default)' }} />
      แผนกของ
      <strong style={{ color: 'var(--text-brandPrimary-default)', fontWeight: 'var(--type-weight-bold)' }}>
        {label}
      </strong>
    </span>
  );
}

export default function DepartmentPage() {
  /* Departments are scoped to the center selected in the header chip
     (useClinicFilter). Switching the center swaps the whole list. */
  const clinicCtx = useClinicFilter();
  const centerId = clinicCtx?.clinic;
  const centerLabel = useMemo(
    () => (clinicCtx?.options || []).find((o) => o.value === centerId)?.label || 'ศูนย์บริการ',
    [clinicCtx, centerId],
  );

  const [departments, setDepartments] = useState(() => readDepartments(centerId));

  /* Reload the list whenever the selected center changes. */
  useEffect(() => {
    setDepartments(readDepartments(centerId));
  }, [centerId]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const [modal, setModal] = useState(null); // { mode: 'add' | 'edit', dept? }
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState('');
  const [toggleConfirm, setToggleConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // dept row or from edit popup

  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:departments');

  const persist = useCallback((next) => {
    writeDepartments(centerId, next);
    setDepartments(next);
  }, [centerId]);

  const showToast = (message) => {
    setToast({ id: Date.now(), variant: 'success', message });
  };

  const closeModal = () => {
    setModal(null);
    setNameDraft('');
    setNameError('');
  };

  const stats = useMemo(() => computeDepartmentStats(departments), [departments]);

  const summaryCards = useMemo(() => [
    { key: 'total', icon: 'clipboard-list', color: 'info', value: String(stats.total), label: 'แผนกทั้งหมด' },
    { key: 'active', icon: 'clipboard-list', color: 'positive', value: String(stats.active), label: 'แผนกที่เปิดใช้งาน' },
    {
      key: 'inactive',
      icon: 'clipboard-list',
      color: 'destructive',
      value: String(stats.inactive),
      label: 'แผนกที่ปิดใช้งาน',
    },
  ], [stats]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortDepartments(departments).filter((d) => {
      const matchesSearch = !q || d.name.toLowerCase().includes(q);
      const matchesStatus = !filterStatus
        || (filterStatus === 'active' && d.active)
        || (filterStatus === 'inactive' && !d.active);
      return matchesSearch && matchesStatus;
    });
  }, [departments, search, filterStatus]);

  const hasDepartments = departments.length > 0;
  const isAllFilters = !filterStatus;

  const openAdd = () => {
    setNameDraft('');
    setNameError('');
    setModal({ mode: 'add' });
  };

  const openEdit = (dept) => {
    setNameDraft(dept.name);
    setNameError('');
    setModal({ mode: 'edit', dept });
  };

  const validateName = (name, excludeId = null) => {
    const trimmed = name.trim();
    if (!trimmed) return '';
    if (isDuplicateDepartmentName(departments, trimmed, excludeId)) return DUPLICATE_ERROR;
    return '';
  };

  const handleNameChange = (next) => {
    setNameDraft(next);
    setNameError(validateName(next, modal?.dept?.id));
  };

  const handleSubmitSearch = (value) => {
    const q = (value || '').trim();
    if (q) pushHistory({ label: q, value: q });
    setSearch(q);
  };

  const saveDepartment = () => {
    const trimmed = nameDraft.trim();
    const err = validateName(trimmed, modal?.dept?.id);
    if (!trimmed || err) {
      setNameError(err || 'กรุณาระบุชื่อแผนก');
      return;
    }
    if (modal?.mode === 'add') {
      persist([...departments, createDepartment(trimmed, departments.length + 1, centerId)]);
      showToast('เพิ่มแผนกสำเร็จ');
    } else {
      if (trimmed === modal.dept.name.trim()) return;
      const next = departments.map((d) => (
        d.id === modal.dept.id ? { ...d, name: trimmed } : d
      ));
      persist(next);
      showToast('แก้ไขชื่อแผนกสำเร็จ');
    }
    closeModal();
  };

  const applyDeleteDepartment = () => {
    if (!deleteConfirm) return;
    const next = departments
      .filter((d) => d.id !== deleteConfirm.id)
      .map((d, i) => ({ ...d, order: i + 1 }));
    persist(next);
    setDeleteConfirm(null);
    closeModal();
    showToast('ลบแผนกสำเร็จ');
  };

  const applyToggleActive = (deptId, next) => {
    persist(departments.map((d) => (d.id === deptId ? { ...d, active: next } : d)));
    setToggleConfirm(null);
    showToast(next ? 'เปิดใช้งานแผนกแล้ว' : 'ปิดใช้งานแผนกแล้ว');
  };

  const handleToggleActive = (deptId, next) => {
    if (!next) {
      setToggleConfirm({ deptId, next });
      return;
    }
    applyToggleActive(deptId, next);
  };

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
    const sorted = sortDepartments(departments);
    const fromId = filteredRows[from]?.id;
    const toId = filteredRows[idx]?.id;
    const fromFull = sorted.findIndex((d) => d.id === fromId);
    const toFull = sorted.findIndex((d) => d.id === toId);
    if (fromFull >= 0 && toFull >= 0) {
      persist(reorderDepartments(departments, fromFull, toFull));
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
      header: 'ชื่อแผนก',
      flex: 1,
      minWidth: 220,
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
          onChange={(next) => handleToggleActive(row.id, next)}
          aria-label={`สถานะ ${row.name}`}
          disabled={editMode}
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
            onClick={() => openEdit(row)}
            disabled={editMode}
          >
            แก้ไข
          </NeutralSubdueButton>
          <NeutralSubdueIconButton
            variant='outline'
            size='sm'
            aria-label={`ลบ ${row.name}`}
            onClick={() => setDeleteConfirm(row)}
            disabled={editMode}
          >
            <Icon name='trash' size={16} />
          </NeutralSubdueIconButton>
        </div>
      ),
    },
  ], [editMode, departments]);

  const canSave = nameDraft.trim() && !nameError;

  const canSaveEditName = useMemo(() => {
    const trimmed = nameDraft.trim();
    if (!trimmed || nameError || modal?.mode !== 'edit' || !modal.dept) return false;
    return trimmed !== modal.dept.name.trim();
  }, [nameDraft, nameError, modal]);

  return (
    <>
      <QueuePageShell
        activeKey='assess-departments'
        sidebarItems={ASSESS_NAV}
        sidebarFallbackKey='assess-departments'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        title={hasDepartments ? undefined : 'แผนก'}
        headerInfo={hasDepartments ? (
          <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
                <h1 style={PANEL_TITLE}>แผนก</h1>
                <CenterContextLine label={centerLabel} />
              </div>
              <BrandButton variant='fill' size='md' leadingIcon='add' onClick={openAdd}>
                เพิ่มแผนก
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
        {!hasDepartments ? (
          <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)' }}>
            <section
              className='flex flex-col items-center justify-center flex-1 w-full'
              style={{ ...CARD, padding: 'var(--dim-space-900, 48px)', gap: 'var(--dim-space-400)', minHeight: 480 }}
            >
              <EmptyIllustration />
              <CenterContextLine label={centerLabel} />
              <span
                style={{
                  color: 'var(--text-brandPrimary-default)',
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-sm)',
                }}
              >
                ยังไม่มีแผนกใน{centerLabel}
              </span>
              <BrandButton variant='fill' size='lg' leadingIcon='add' onClick={openAdd}>
                เพิ่มแผนก
              </BrandButton>
            </section>
          </div>
        ) : (
          <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}>
            <section
              className='w-full flex flex-col items-center'
              style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}
            >
              <PrimarySearch
                value={search}
                onChange={setSearch}
                onSubmit={handleSubmitSearch}
                placeholder='ค้นหาชื่อแผนก'
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
                    options={STATUS_OPTIONS}
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

            <section
              className='w-full flex flex-col'
              style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}
            >
              <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='flex items-center min-w-0 flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                  <span style={{ ...TEXT_CELL, fontFamily: 'var(--type-family-heading-graphic2)', color: 'var(--text-topic-secondary-title)' }}>
                    แผนก
                  </span>
                  <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>
                    {departments.length} แผนก
                  </ColorfulBadge>
                </div>
                <NeutralSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon={editMode ? 'check' : undefined}
                  leadingIconElement={editMode ? undefined : <Edit3LeadingIcon />}
                  onClick={() => setEditMode((v) => !v)}
                >
                  {editMode ? 'เสร็จสิ้น' : 'แก้ไขลำดับ'}
                </NeutralSubdueButton>
              </div>

              <Table
                columns={columns}
                rows={filteredRows}
                rowKey={(row) => row.id}
                editMode={editMode}
                draggedIdx={draggedIdx}
                overIdx={overIdx}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                emptyMessage='ไม่พบแผนก'
              />

              {!editMode ? (
                <BrandDashedAddButton onClick={openAdd}>
                  เพิ่มแผนก
                </BrandDashedAddButton>
              ) : null}
            </section>
          </div>
        )}
      </QueuePageShell>

      <Popup
        open={!!modal}
        onClose={closeModal}
        size='large'
        title={modal?.mode === 'edit' ? 'แก้ไขชื่อแผนก' : 'ชื่อแผนก'}
        subtitle='ใส่ชื่อแผนกที่ต้องการเพิ่ม'
        tertiaryAction={{ label: 'ยกเลิก', onClick: closeModal }}
        secondaryAction={modal?.mode === 'edit' ? {
          label: 'ลบแผนก',
          onClick: () => modal.dept && setDeleteConfirm(modal.dept),
        } : undefined}
        primaryAction={{
          label: 'ตกลง',
          onClick: saveDepartment,
          disabled: modal?.mode === 'edit' ? !canSaveEditName : !canSave,
        }}
      >
        <InputField
          autoFocus
          showLabel={false}
          showHelperText={false}
          showLeadingIcon={false}
          placeholder='เช่น อายุรกรรม (Internal Medicine)'
          value={nameDraft}
          onChange={handleNameChange}
          error={nameError || undefined}
        />
      </Popup>

      <AlertDialog
        open={!!toggleConfirm}
        onClose={() => setToggleConfirm(null)}
        type='warning'
        alignment='center'
        title='ปิดการใช้งานแผนก?'
        description='การปิดใช้งานจะทำให้แผนกนี้ไม่สามารถใช้งานได้จนกว่าจะเปิดอีกครั้ง'
        confirmLabel='ปิดการใช้งาน'
        cancelLabel='ยกเลิก'
        onConfirm={() => {
          if (toggleConfirm) {
            applyToggleActive(toggleConfirm.deptId, toggleConfirm.next);
          }
        }}
      />

      <AlertDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        type='warning'
        alignment='center'
        title='ลบแผนก?'
        description={deleteConfirm ? `ต้องการลบ "${deleteConfirm.name}" ออกจากระบบหรือไม่` : ''}
        confirmLabel='ลบ'
        cancelLabel='ยกเลิก'
        onConfirm={applyDeleteDepartment}
      />

      <PhcisTopToast session={toast} onDismiss={dismissToast} />
    </>
  );
}
