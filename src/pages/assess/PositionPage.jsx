import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import Topic from '@/components/topic/Topic';
import { HeaderCell, DataCell, TableRow } from '@/components/table/Table';
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
import {
  readPositions,
  writePositions,
  sortPositions,
  computePositionStats,
  createPosition,
  reorderPositions,
  isDuplicatePositionName,
} from '@/data/positionStore';

/* PHCIS | Assess-control — Position list after create (Figma 4D3nTx53 · 10:44097).
   PHCIS_Header_Summary position · search · filters · position table
   · add/edit popup · reorder · status toggles. */

const breadcrumb = ['ตำแหน่ง'];

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
};

const TABLE_FRAME = {
  border: 'var(--dim-stroke-100) solid var(--border-table-default)',
  borderRadius: 'var(--dim-radius-400)',
  overflow: 'hidden',
};

const TEXT_CELL = {
  color: 'var(--text-neutral-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const DATA_CELL_OFF = {
  showCheckbox: false,
  showProfile: false,
  showTextGroup: false,
  showText: false,
  showSubtext: false,
  showStepper: false,
  showInputField: false,
  showSelect: false,
  showBadge: false,
  showSwitch: false,
  showButton1: false,
  showButton2: false,
  showButton3: false,
};

const COL_W = { order: 80, status: 160, action: 160 };
const DRAG_COL_W = 40;

const STATUS_OPTIONS = [
  { value: 'active', label: 'เปิดการใช้งาน' },
  { value: 'inactive', label: 'ปิดการใช้งาน' },
];

const DUPLICATE_ERROR = 'ชื่อตำแหน่งซ้ำกับที่มีอยู่ กรุณาเปลี่ยนชื่อตำแหน่งใหม่';

function Edit3LeadingIcon({ size = 16 }) {
  return <Icon name='edit_3' size={size} />;
}

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
  return <LottieIllustration animationData={anim} size={160} loop ariaLabel='ยังไม่มีตำแหน่ง' />;
}

function PositionTable({
  rows,
  editMode,
  draggedIdx,
  overIdx,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onToggleActive,
  onEdit,
  onDelete,
}) {
  const headers = [
    { title: 'ลำดับ', width: COL_W.order, sort: true },
    { title: 'ชื่อตำแหน่ง', flex: true, sort: true },
    { title: 'สถานะการใช้งาน', width: COL_W.status, sort: true },
    { title: 'การดำเนินการ', width: COL_W.action, sort: true },
  ];

  return (
    <div className='w-full overflow-x-auto' style={TABLE_FRAME}>
      <div style={{ minWidth: 480 }}>
        <div className='flex w-full'>
          {editMode ? (
            <div
              aria-hidden
              style={{
                width: DRAG_COL_W,
                flexShrink: 0,
                minHeight: 44,
                background: 'var(--surface-table-header)',
                borderBottom: 'var(--dim-stroke-200) solid var(--border-table-default)',
              }}
            />
          ) : null}
          {headers.map(({ title, width, flex, sort }, i) => (
            <HeaderCell
              key={title}
              title={title}
              showSubtext={false}
              showSorting={sort}
              style={{
                ...(flex ? { flex: '1 1 0', minWidth: 0 } : { width, flexShrink: 0 }),
                ...(i === 0 && !editMode ? { borderTopLeftRadius: 'var(--dim-radius-400)' } : {}),
                ...(i === headers.length - 1 ? { borderTopRightRadius: 'var(--dim-radius-400)' } : {}),
              }}
            />
          ))}
        </div>
        {rows.length === 0 ? (
          <div
            className='flex items-center justify-center w-full'
            style={{
              minHeight: 120,
              padding: 'var(--dim-space-600)',
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
            }}
          >
            ไม่พบตำแหน่ง
          </div>
        ) : rows.map((row, idx) => {
          const isDragging = editMode && draggedIdx === idx;
          const isOver = editMode && overIdx === idx && draggedIdx !== idx;
          const isLast = idx === rows.length - 1;
          const rowStyle = {
            background: isOver
              ? 'var(--surface-list-hover)'
              : 'var(--surface-table-default)',
            borderBottom: isLast ? 'none' : undefined,
            opacity: isDragging ? 0.4 : 1,
            cursor: editMode ? (isDragging ? 'grabbing' : 'grab') : 'default',
          };
          const cellBorder = isLast ? { borderBottom: 'none' } : {};

          return (
            <TableRow
              key={row.id}
              draggable={editMode}
              onDragStart={editMode ? (e) => onDragStart(e, idx) : undefined}
              onDragOver={editMode ? (e) => onDragOver(e, idx) : undefined}
              onDrop={editMode ? (e) => onDrop(e, idx) : undefined}
              onDragEnd={editMode ? onDragEnd : undefined}
              style={rowStyle}
            >
              {editMode ? (
                <div
                  aria-label={`ลากแถว ${idx + 1}`}
                  className='flex items-center justify-center shrink-0'
                  style={{
                    width: DRAG_COL_W,
                    minHeight: 56,
                    color: 'var(--text-content-tertiary)',
                    ...cellBorder,
                  }}
                >
                  <Icon name='drag_indicator' size={18} />
                </div>
              ) : null}
              <DataCell {...DATA_CELL_OFF} style={{ width: COL_W.order, flexShrink: 0, ...cellBorder }}>
                <span style={TEXT_CELL}>{row.order}</span>
              </DataCell>
              <DataCell {...DATA_CELL_OFF} style={{ flex: '1 1 0', minWidth: 0, ...cellBorder }}>
                <span style={TEXT_CELL}>{row.name}</span>
              </DataCell>
              <DataCell
                {...DATA_CELL_OFF}
                state='default'
                style={{ width: COL_W.status, flexShrink: 0, ...cellBorder }}
              >
                <Switch
                  checked={row.active}
                  onChange={(next) => onToggleActive(row.id, next)}
                  aria-label={`สถานะ ${row.name}`}
                  disabled={editMode}
                />
              </DataCell>
              <DataCell
                {...DATA_CELL_OFF}
                state='default'
                style={{ width: COL_W.action, flexShrink: 0, ...cellBorder }}
              >
                <div className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                  <NeutralSubdueButton
                    variant='outline'
                    size='sm'
                    leadingIconElement={<Edit3LeadingIcon />}
                    onClick={() => onEdit(row)}
                    disabled={editMode}
                  >
                    แก้ไข
                  </NeutralSubdueButton>
                  <NeutralSubdueIconButton
                    variant='outline'
                    size='sm'
                    aria-label={`ลบ ${row.name}`}
                    onClick={() => onDelete(row)}
                    disabled={editMode}
                  >
                    <Icon name='trash' size={16} />
                  </NeutralSubdueIconButton>
                </div>
              </DataCell>
            </TableRow>
          );
        })}
      </div>
    </div>
  );
}

export default function PositionPage() {
  const [positions, setPositions] = useState(() => readPositions());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const [modal, setModal] = useState(null);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState('');
  const [toggleConfirm, setToggleConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:positions');

  const persist = useCallback((next) => {
    writePositions(next);
    setPositions(next);
  }, []);

  const showToast = (message) => {
    setToast({ id: Date.now(), variant: 'success', message });
  };

  const closeModal = () => {
    setModal(null);
    setNameDraft('');
    setNameError('');
  };

  const stats = useMemo(() => computePositionStats(positions), [positions]);

  const summaryCards = useMemo(() => [
    { key: 'total', icon: 'clipboard-list', color: 'info', value: String(stats.total), label: 'ตำแหน่งทั้งหมด' },
    { key: 'active', icon: 'clipboard-list', color: 'positive', value: String(stats.active), label: 'ตำแหน่งที่เปิดใช้งาน' },
    {
      key: 'inactive',
      icon: 'clipboard-list',
      color: 'destructive',
      value: String(stats.inactive),
      label: 'ตำแหน่งที่ปิดใช้งาน',
    },
  ], [stats]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortPositions(positions).filter((p) => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q);
      const matchesStatus = !filterStatus
        || (filterStatus === 'active' && p.active)
        || (filterStatus === 'inactive' && !p.active);
      return matchesSearch && matchesStatus;
    });
  }, [positions, search, filterStatus]);

  const hasPositions = positions.length > 0;
  const filtersActive = !!filterStatus || !!search.trim();
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setSearch('');
      setFilterStatus('');
    },
  );

  const openAdd = () => {
    setNameDraft('');
    setNameError('');
    setModal({ mode: 'add' });
  };

  const openEdit = (position) => {
    setNameDraft(position.name);
    setNameError('');
    setModal({ mode: 'edit', position });
  };

  const validateName = (name, excludeId = null) => {
    const trimmed = name.trim();
    if (!trimmed) return '';
    if (isDuplicatePositionName(positions, trimmed, excludeId)) return DUPLICATE_ERROR;
    return '';
  };

  const handleNameChange = (next) => {
    setNameDraft(next);
    setNameError(validateName(next, modal?.position?.id));
  };

  const handleSubmitSearch = (value) => {
    const q = (value || '').trim();
    if (q) pushHistory({ label: q, value: q });
    setSearch(q);
  };

  const savePosition = () => {
    const trimmed = nameDraft.trim();
    const err = validateName(trimmed, modal?.position?.id);
    if (!trimmed || err) {
      setNameError(err || 'กรุณาระบุชื่อตำแหน่ง');
      return;
    }
    if (modal?.mode === 'add') {
      persist([...positions, createPosition(trimmed, positions.length + 1)]);
      showToast('เพิ่มตำแหน่งสำเร็จ');
    } else {
      if (trimmed === modal.position.name.trim()) return;
      persist(positions.map((p) => (
        p.id === modal.position.id ? { ...p, name: trimmed } : p
      )));
      showToast('แก้ไขชื่อตำแหน่งสำเร็จ');
    }
    closeModal();
  };

  const applyDeletePosition = () => {
    if (!deleteConfirm) return;
    const next = positions
      .filter((p) => p.id !== deleteConfirm.id)
      .map((p, i) => ({ ...p, order: i + 1 }));
    persist(next);
    setDeleteConfirm(null);
    closeModal();
    showToast('ลบตำแหน่งสำเร็จ');
  };

  const applyToggleActive = (positionId, next) => {
    persist(positions.map((p) => (p.id === positionId ? { ...p, active: next } : p)));
    setToggleConfirm(null);
    showToast(next ? 'เปิดใช้งานตำแหน่งแล้ว' : 'ปิดใช้งานตำแหน่งแล้ว');
  };

  const handleToggleActive = (positionId, next) => {
    if (!next) {
      setToggleConfirm({ positionId, next });
      return;
    }
    applyToggleActive(positionId, next);
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
    const sorted = sortPositions(positions);
    const fromId = filteredRows[from]?.id;
    const toId = filteredRows[idx]?.id;
    const fromFull = sorted.findIndex((p) => p.id === fromId);
    const toFull = sorted.findIndex((p) => p.id === toId);
    if (fromFull >= 0 && toFull >= 0) {
      persist(reorderPositions(positions, fromFull, toFull));
    }
    setDraggedIdx(null);
    setOverIdx(null);
  };
  const handleDragEnd = () => { setDraggedIdx(null); setOverIdx(null); };

  const canSave = nameDraft.trim() && !nameError;

  const canSaveEditName = useMemo(() => {
    const trimmed = nameDraft.trim();
    if (!trimmed || nameError || modal?.mode !== 'edit' || !modal.position) return false;
    return trimmed !== modal.position.name.trim();
  }, [nameDraft, nameError, modal]);

  return (
    <>
      <QueuePageShell
        activeKey='assess-positions'
        sidebarItems={ASSESS_NAV}
        sidebarFallbackKey='assess-positions'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        title={hasPositions ? undefined : 'ตำแหน่ง'}
        headerInfo={hasPositions ? (
          <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex-1 min-w-0'>
                <Topic
                  hierarchy='tertiary'
                  title='ตำแหน่ง'
                  showSubText={false}
                  showBadge={false}
                  showChevron={false}
                  showLeadingIcon={false}
                  showSuccess={false}
                />
              </div>
              <BrandButton variant='fill' size='md' leadingIcon='add' onClick={openAdd}>
                เพิ่มตำแหน่ง
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
        {!hasPositions ? (
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
                ในระบบยังไม่มีตำแหน่ง
              </span>
              <BrandButton variant='fill' size='lg' leadingIcon='add' onClick={openAdd}>
                เพิ่มตำแหน่ง
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
                placeholder='ค้นหาชื่อตำแหน่ง'
                width={640}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              />

              <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                  <FilterDropdown
                    prefix='สถานะ:'
                    options={STATUS_OPTIONS}
                    value={filterStatus}
                    onChange={setFilterStatus}
                    placeholder='ทั้งหมด'
                  />
                  <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
                </div>
                <div className='flex-1' />
                <NeutralSubdueButton
                  leadingIcon='ios_share'
                  variant='outline'
                  size='sm'
                  collapseLabelBelow='lg'
                >
                  นำส่งออกรายงาน
                </NeutralSubdueButton>
              </div>
            </section>

            <section
              className='w-full flex flex-col'
              style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}
            >
              <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-600)' }}>
                <div className='flex items-center min-w-0 flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                  <Topic
                    hierarchy='secondary'
                    title='ตำแหน่ง'
                    showSubText={false}
                    showBadge={false}
                    showChevron={false}
                    showLeadingIcon={false}
                    showSuccess={false}
                  />
                  <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>
                    {positions.length} ตำแหน่ง
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

              <SmoothFilterResults opaque={resultsOpaque}>
              <PositionTable
                rows={filteredRows}
                editMode={editMode}
                draggedIdx={draggedIdx}
                overIdx={overIdx}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onToggleActive={handleToggleActive}
                onEdit={openEdit}
                onDelete={setDeleteConfirm}
              />
              </SmoothFilterResults>

              {!editMode ? (
                <BrandDashedAddButton onClick={openAdd}>
                  เพิ่มตำแหน่ง
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
        title={modal?.mode === 'edit' ? 'แก้ไขชื่อตำแหน่ง' : 'ชื่อตำแหน่ง'}
        subtitle='ใส่ชื่อตำแหน่งที่ต้องการเพิ่ม'
        tertiaryAction={{ label: 'ยกเลิก', onClick: closeModal }}
        secondaryAction={modal?.mode === 'edit' ? {
          label: 'ลบตำแหน่ง',
          onClick: () => modal.position && setDeleteConfirm(modal.position),
        } : undefined}
        primaryAction={{
          label: 'ตกลง',
          onClick: savePosition,
          disabled: modal?.mode === 'edit' ? !canSaveEditName : !canSave,
        }}
      >
        <InputField
          autoFocus
          showLabel={false}
          showHelperText={false}
          showLeadingIcon={false}
          placeholder='เช่น ผู้เชี่ยวชาญ (Specialist)'
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
        title='ปิดการใช้งานตำแหน่ง?'
        description='การปิดใช้งานจะทำให้ตำแหน่งนี้ไม่สามารถใช้งานได้จนกว่าจะเปิดอีกครั้ง'
        confirmLabel='ปิดการใช้งาน'
        cancelLabel='ยกเลิก'
        onConfirm={() => {
          if (toggleConfirm) {
            applyToggleActive(toggleConfirm.positionId, toggleConfirm.next);
          }
        }}
      />

      <AlertDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        type='warning'
        alignment='center'
        title='ลบตำแหน่ง?'
        description={deleteConfirm ? `ต้องการลบ "${deleteConfirm.name}" ออกจากระบบหรือไม่` : ''}
        confirmLabel='ลบ'
        cancelLabel='ยกเลิก'
        onConfirm={applyDeletePosition}
      />

      <PhcisTopToast session={toast} onDismiss={dismissToast} />
    </>
  );
}
