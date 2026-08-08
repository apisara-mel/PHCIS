import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrimarySearch from '@/components/search/PrimarySearch';
import { FilterDropdown } from '@/components/forms/FilterTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { Field, FieldGrid } from '@/components/forms/Fields';
import Switch from '@/components/switch/Switch';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import AlertDialog from '@/components/popup/AlertDialog';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import { Sym } from '@/components/forms/_inputBox';
import {
  APPT_TYPE_MODES,
  APPT_TYPE_MODE_LABEL,
  BUILTIN_APPT_TYPES,
  RECURRENCE_PRESETS,
  countFutureAppointmentsUsingType,
  deleteApptType,
  getAllApptTypes,
  isApptTypeCodeTaken,
  saveApptType,
  setApptTypeActive,
  subscribeApptTypes,
} from './appointmentTypeCatalog';
import {
  APPT_PURPOSE_MASTER,
  APPT_TYPE_PREP_SUGGESTIONS,
  CLINIC_MASTER,
} from './appointmentHcisMasters';
import { DEFAULT_RESOURCE_PATTERN, appendSettingsAudit } from './appointmentSettingsStore';
import { withExtraAppointments } from './appointmentExtraStore';
import { INITIAL_APPOINTMENTS } from './appointmentShared';
import {
  NO_PERMISSION_TOOLTIP,
  canConfigureAppointments,
  getApptActor,
  subscribeApptRole,
} from './appointmentPermissions';

/* TOR 1.6.2.5 (+1.6.1.2 / 1.6.3.1) — ทะเบียน "รูปแบบการนัดหมายตามผู้ใช้งานกำหนด".
   list + create/edit อยู่หน้าเดียวกันตาม pattern ของ PharmacyRegistryPage. */

const breadcrumb = ['ระบบนัดหมาย', 'รูปแบบการนัดหมาย'];
const PAGE_SIZE = 10;

const TEXT_CELL = {
  color: 'var(--text-neutral-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  lineHeight: 1.5,
};

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500, 16px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-brand-top-200)',
  paddingTop: 'var(--dim-space-600, 24px)',
  paddingBottom: 'var(--dim-space-600, 24px)',
  paddingLeft: 'var(--dim-space-600, 24px)',
  paddingRight: 'var(--dim-space-600, 24px)',
  gap: 'var(--dim-space-400, 16px)',
};

const TITLE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-medium)',
};

const HINT = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs, 12px)',
  lineHeight: 1.6,
};

const TABS = [
  { key: 'all', label: 'ทั้งหมด', icon: 'list' },
  { key: 'active', label: 'เปิดใช้งาน', icon: 'check_circle' },
  { key: 'inactive', label: 'ปิดใช้งาน', icon: 'do_not_disturb_on' },
  { key: 'custom', label: 'ที่หน่วยบริการสร้างเอง', icon: 'edit_note' },
];

const MODE_FILTER = [
  { value: '', label: 'ทุกโหมด' },
  ...APPT_TYPE_MODES.map((m) => ({ value: m.value, label: m.label })),
];

const BLANK_FORM = {
  code: '',
  name: '',
  clinics: [],
  slotMinutes: 12,
  mode: 'onsite',
  autoAccept: false,
  needsRoom: true,
  recurrenceEveryDays: 0,
  purposes: [],
  prepText: '',
  active: true,
};

const SLOT_MINUTE_OPTIONS = [6, 10, 12, 15, 18, 20, 24, 30, 60]
  .map((n) => ({ value: String(n), label: `${n} นาที` }));

const SwitchRow = ({ label, hint, checked, onChange, disabled }) => (
  <div className='flex items-start justify-between w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span style={{ ...TEXT_CELL, fontWeight: 'var(--type-weight-medium)' }}>{label}</span>
      <span style={HINT}>{hint}</span>
    </div>
    <Switch checked={checked} onChange={onChange} disabled={disabled} aria-label={label} />
  </div>
);

const AppointmentTypeCatalogPage = () => {
  const history = useHistory();
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => subscribeApptTypes(bump), [bump]);
  useEffect(() => subscribeApptRole(bump), [bump]);

  const canConfigure = canConfigureAppointments();
  const actor = getApptActor();

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  /* snapshot ของฟอร์มตอนเพิ่งเปิด — ใช้เทียบว่ามีการแก้จริงหรือยัง */
  const baselineRef = useRef(null);
  const [originalCode, setOriginalCode] = useState(null);
  const [touched, setTouched] = useState(false);
  const [toast, setToast] = useState(null);
  const [disableTarget, setDisableTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const flash = useCallback((message, variant = 'success') => {
    setToast({ id: Date.now(), variant, message });
  }, []);

  const appointments = useMemo(() => withExtraAppointments(INITIAL_APPOINTMENTS), [tick]);
  const allTypes = useMemo(() => getAllApptTypes(), [tick]);
  const customCount = allTypes.filter((t) => !t.builtin).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTypes.filter((t) => {
      if (tab === 'active' && t.active === false) return false;
      if (tab === 'inactive' && t.active !== false) return false;
      if (tab === 'custom' && t.builtin) return false;
      if (modeFilter && t.mode !== modeFilter) return false;
      if (!q) return true;
      return [t.code, t.name, ...(t.clinics || [])]
        .some((f) => String(f || '').toLowerCase().includes(q));
    });
  }, [allTypes, tab, modeFilter, search]);

  const hasFilter = !!(search || modeFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /* ── validation ─────────────────────────────────────────────── */
  const errors = useMemo(() => {
    if (!form) return [];
    const out = [];
    const code = String(form.code || '').trim();
    if (!code) out.push('ต้องระบุรหัสรูปแบบ');
    else if (isApptTypeCodeTaken(code, { ignoreCode: originalCode })) {
      out.push(`รหัส ${code.toUpperCase()} ถูกใช้แล้ว — ต้องไม่ซ้ำกับรูปแบบอื่น`);
    }
    if (!String(form.name || '').trim()) out.push('ต้องระบุชื่อรูปแบบ');
    if (!(form.clinics || []).length) out.push('ต้องเลือกคลินิก/หน่วยงานที่ใช้ได้อย่างน้อย 1 แห่ง');
    const minor = DEFAULT_RESOURCE_PATTERN.minorMinutes || 6;
    if (Number(form.slotMinutes) % minor !== 0) {
      out.push(`ความยาว Slot ต้องหารลงตัวกับ ${minor} นาที (minorMinutes ของรูปแบบตาราง) มิฉะนั้นเลขคิวซ้อนชั้นจะเพี้ยน`);
    }
    return out;
  }, [form, originalCode]);

  /* เทียบกับ snapshot ตอนเปิดฟอร์ม — เดิม `dirty = !!form` ทำให้ทุกครั้งที่ปิด
     แผงสร้าง/แก้ไข (แม้เพิ่งกด "สร้างรูปแบบใหม่" แล้วยังไม่พิมพ์อะไรเลย)
     เด้ง UnsavedChangesPopup เป็น false alarm */
  const dirty = !!form && JSON.stringify(form) !== JSON.stringify(baselineRef.current);

  const openForm = (next) => {
    baselineRef.current = { ...next };
    setForm(next);
    setTouched(false);
  };

  const startCreate = () => {
    openForm({ ...BLANK_FORM });
    setOriginalCode(null);
  };

  const startEdit = (row) => {
    openForm({
      code: row.code,
      name: row.name,
      clinics: [...(row.clinics || [])],
      slotMinutes: row.slotMinutes,
      mode: row.mode,
      autoAccept: !!row.autoAccept,
      needsRoom: !!row.needsRoom,
      recurrenceEveryDays: row.recurrenceEveryDays || 0,
      purposes: [...(row.purposes || [])],
      prepText: row.prepText || '',
      active: row.active !== false,
    });
    setOriginalCode(row.code);
  };

  const cancelEdit = () => {
    if (dirty) { setLeaveOpen(true); return; }
    setForm(null);
  };

  const doSave = () => {
    setTouched(true);
    if (!canConfigure || errors.length) return;
    const before = originalCode ? allTypes.find((t) => t.code === originalCode) : null;
    saveApptType(form, { actor, originalCode });
    appendSettingsAudit({
      action: originalCode ? 'แก้ไขรูปแบบการนัดหมาย' : 'สร้างรูปแบบการนัดหมาย',
      target: `${form.code} · ${form.name}`,
      before: before ? `${before.name} · ${before.slotMinutes} นาที · ${APPT_TYPE_MODE_LABEL(before.mode)}` : '—',
      after: `${form.name} · ${form.slotMinutes} นาที · ${APPT_TYPE_MODE_LABEL(form.mode)}`,
      actor,
    });
    flash(originalCode ? 'บันทึกการแก้ไขรูปแบบสำเร็จ' : 'สร้างรูปแบบการนัดหมายใหม่สำเร็จ');
    setForm(null);
    setOriginalCode(null);
  };

  const doToggleActive = (row, nextActive) => {
    setApptTypeActive(row.code, nextActive, { actor });
    appendSettingsAudit({
      action: nextActive ? 'เปิดใช้งานรูปแบบการนัดหมาย' : 'ปิดใช้งานรูปแบบการนัดหมาย',
      target: `${row.code} · ${row.name}`,
      before: row.active === false ? 'ปิดใช้งาน' : 'เปิดใช้งาน',
      after: nextActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน',
      actor,
    });
    flash(nextActive ? `เปิดใช้งาน ${row.name} แล้ว` : `ปิดใช้งาน ${row.name} แล้ว — นัดเดิมยังแสดงชื่อรูปแบบนี้ได้ต่อ`);
    setDisableTarget(null);
  };

  const doDelete = (row) => {
    const used = countFutureAppointmentsUsingType(appointments, row);
    if (used > 0) {
      flash(`ลบไม่ได้ — ยังมีนัดในอนาคต ${used} รายการที่ใช้รูปแบบนี้ ให้ใช้ "ปิดใช้งาน" แทน`, 'error');
      setDeleteTarget(null);
      return;
    }
    const ok = deleteApptType(row.code);
    if (!ok) {
      flash('ลบไม่ได้ — รูปแบบมาตรฐานของระบบปิดใช้งานได้เท่านั้น', 'error');
    } else {
      appendSettingsAudit({
        action: 'ลบรูปแบบการนัดหมาย',
        target: `${row.code} · ${row.name}`,
        before: 'มีอยู่ในทะเบียน',
        after: 'ถูกลบ',
        actor,
      });
      flash(`ลบรูปแบบ ${row.name} แล้ว`);
    }
    setDeleteTarget(null);
  };

  const columns = [
    {
      key: 'code', header: 'รหัส', sortable: false,
      render: (t) => <span style={{ ...TEXT_CELL, fontWeight: 'var(--type-weight-medium)' }}>{t.code}</span>,
    },
    {
      key: 'name', header: 'ชื่อรูปแบบ', sortable: false,
      render: (t) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span className='truncate' style={TEXT_CELL}>{t.name}</span>
          {t.builtin ? (
            <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>รูปแบบมาตรฐานระบบ</ColorfulBadge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'clinics', header: 'คลินิก/หน่วยงานที่ใช้ได้', flex: true, minWidth: 240, sortable: false,
      render: (t) => <span className='truncate' style={TEXT_CELL}>{(t.clinics || []).join(' · ') || '—'}</span>,
    },
    {
      key: 'slotMinutes', header: 'ความยาว Slot', sortable: false,
      render: (t) => <span style={TEXT_CELL}>{t.slotMinutes} นาที</span>,
    },
    {
      key: 'mode', header: 'โหมด', sortable: false,
      render: (t) => <span className='truncate' style={TEXT_CELL}>{APPT_TYPE_MODE_LABEL(t.mode)}</span>,
    },
    {
      key: 'accept', header: 'การรับคำขอ', sortable: false,
      render: (t) => (
        <StatusBadge style={t.autoAccept ? 'success' : 'info'} size='small'>
          {t.autoAccept ? 'รับอัตโนมัติ' : 'ต้องยืนยันก่อน'}
        </StatusBadge>
      ),
    },
    {
      key: 'recurrence', header: 'นัดต่อเนื่องเริ่มต้น', sortable: false,
      render: (t) => (
        <span style={TEXT_CELL}>
          {t.recurrenceEveryDays ? `ทุก ${t.recurrenceEveryDays} วัน` : 'ไม่ตั้งค่า'}
        </span>
      ),
    },
    {
      key: 'active', header: 'สถานะ', sortable: false,
      render: (t) => (
        <StatusBadge style={t.active === false ? 'neutral' : 'success'} size='small'>
          {t.active === false ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
        </StatusBadge>
      ),
    },
    {
      key: 'actions', header: 'การดำเนินการ', sortable: false,
      render: (t) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          <span title={canConfigure ? 'แก้ไขรูปแบบนี้' : NO_PERMISSION_TOOLTIP}>
            <BrandSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='edit'
              disabled={!canConfigure}
              onClick={(e) => { e.stopPropagation(); startEdit(t); }}
            >
              แก้ไข
            </BrandSubdueButton>
          </span>
          <NeutralSubdueButton
            variant='outline'
            size='sm'
            leadingIcon={t.active === false ? 'play_arrow' : 'pause'}
            disabled={!canConfigure}
            onClick={(e) => {
              e.stopPropagation();
              if (t.active === false) doToggleActive(t, true);
              else setDisableTarget(t);
            }}
          >
            {t.active === false ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
          </NeutralSubdueButton>
          {!t.builtin ? (
            <DangerSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='delete'
              disabled={!canConfigure}
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(t); }}
            >
              ลบ
            </DangerSubdueButton>
          ) : null}
        </div>
      ),
    },
  ];

  const summaryCards = [
    { key: 'all', label: 'รูปแบบทั้งหมด', value: allTypes.length, indicator: 'ใช้ในฟอร์มนัด', color: 'info', icon: 'style' },
    { key: 'custom', label: 'สร้างเองโดยหน่วยบริการ', value: customCount, indicator: 'TOR 1.6.2.5', color: 'positive', icon: 'edit_note' },
    { key: 'active', label: 'เปิดใช้งาน', value: allTypes.filter((t) => t.active !== false).length, indicator: 'เลือกได้ในฟอร์ม', color: 'positive', icon: 'check_circle' },
    { key: 'inactive', label: 'ปิดใช้งาน', value: allTypes.filter((t) => t.active === false).length, indicator: 'นัดเดิมยังอ้างอิงได้', color: 'neutral', icon: 'do_not_disturb_on' },
  ];

  const disableUsage = disableTarget ? countFutureAppointmentsUsingType(appointments, disableTarget) : 0;

  return (
    <>
      <QueuePageShell
        activeKey='appoint'
        breadcrumb={breadcrumb}
        title='รูปแบบการนัดหมาย (ผู้ใช้งานกำหนดเอง)'
        onBack={() => history.push('/appointment')}
        summaryCards={summaryCards}
        tabs={TABS}
        activeTab={tab}
        onTabChange={(k) => { setTab(k); setPage(1); }}
        actions={(
          <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <NeutralSubdueButton
              size='lg'
              variant='outline'
              leadingIcon='tune'
              onClick={() => history.push('/appointment/settings')}
            >
              ตั้งค่าระบบนัดหมาย
            </NeutralSubdueButton>
            <span title={canConfigure ? 'สร้างรูปแบบใหม่' : NO_PERMISSION_TOOLTIP}>
              <BrandButton
                variant='fill'
                size='lg'
                leadingIcon='add'
                disabled={!canConfigure}
                onClick={startCreate}
              >
                สร้างรูปแบบใหม่
              </BrandButton>
            </span>
          </div>
        )}
      >
        <div
          className='flex flex-1 min-w-0'
          style={{
            paddingTop: 'var(--dim-space-600, 24px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
            paddingLeft: 'var(--dim-space-600, 24px)',
            paddingRight: 'var(--dim-space-600, 24px)',
            gap: 'var(--dim-space-500, 20px)',
            alignItems: 'flex-start',
          }}
        >
          {/* ── รายการรูปแบบ ─────────────────────────────────── */}
          <section className='flex flex-col min-w-0' style={{ ...CARD, flex: 1 }}>
            {!canConfigure ? (
              <StatusBadge style='neutral' size='default' icon='lock'>
                บทบาทปัจจุบันแก้ไขการตั้งค่าไม่ได้ — {NO_PERMISSION_TOOLTIP}
              </StatusBadge>
            ) : null}

            <div className='w-full flex items-start justify-center'>
              <PrimarySearch
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                onSubmit={(v) => { setSearch(v); setPage(1); }}
                placeholder='ค้นหา รหัส / ชื่อรูปแบบ / คลินิก'
                width={520}
              />
            </div>

            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterDropdown prefix='โหมด:' options={MODE_FILTER} value={modeFilter} onChange={(v) => { setModeFilter(v); setPage(1); }} />
              {hasFilter ? (
                <NeutralSubdueButton size='sm' variant='outline' leadingIcon='filter_alt_off' onClick={() => { setSearch(''); setModeFilter(''); setPage(1); }}>
                  ล้างตัวกรอง
                </NeutralSubdueButton>
              ) : null}
            </OverflowFlexRow>

            {customCount === 0 && tab === 'custom' ? (
              <div
                className='flex flex-col items-start'
                style={{
                  gap: 'var(--dim-space-300, 12px)',
                  paddingTop: 'var(--dim-space-600, 24px)',
                  paddingBottom: 'var(--dim-space-600, 24px)',
                  paddingLeft: 'var(--dim-space-600, 24px)',
                  paddingRight: 'var(--dim-space-600, 24px)',
                  borderRadius: 'var(--dim-radius-400, 12px)',
                  background: 'var(--surface-brandPrimary-quaternary)',
                }}
              >
                <span className='flex items-center' style={{ ...TITLE, gap: 'var(--dim-space-200, 8px)' }}>
                  <Sym name='style' size={20} color='var(--icon-brandPrimary-default)' />
                  ยังไม่เคยสร้างรูปแบบการนัดหมายเอง
                </span>
                <span style={HINT}>
                  ระหว่างนี้ระบบใช้รูปแบบมาตรฐาน {BUILTIN_APPT_TYPES.map((t) => t.name).join(' · ')} —
                  สร้างรูปแบบของหน่วยบริการเองเพื่อกำหนดความยาว Slot · โหมดตรวจ · การรับคำขออัตโนมัติ ·
                  นัดต่อเนื่องเริ่มต้น และข้อความเตรียมตัวที่จะพิมพ์ลงใบนัด
                </span>
                <BrandButton variant='fill' size='md' leadingIcon='add' disabled={!canConfigure} onClick={startCreate}>
                  สร้างรูปแบบแรก
                </BrandButton>
              </div>
            ) : (
              <>
                <Table
                  columns={columns}
                  rows={pageRows}
                  rowKey={(t) => t.code}
                  onRowClick={canConfigure ? startEdit : undefined}
                  stickyColCount={2}
                  emptyMessage={hasFilter ? 'ไม่พบรูปแบบที่ตรงกับเงื่อนไข' : 'ยังไม่มีรูปแบบในแท็บนี้'}
                  emptySubtext={hasFilter ? 'ลองล้างตัวกรองแล้วค้นหาใหม่' : 'กด “สร้างรูปแบบใหม่” เพื่อเพิ่มรูปแบบของหน่วยบริการ'}
                  style={{ maxHeight: 560, overflow: 'auto' }}
                />

                <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
                  <span
                    style={{
                      flex: 1,
                      color: 'var(--text-content-secondary)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm, 14px)',
                    }}
                  >
                    แสดง {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-
                    {Math.min(safePage * PAGE_SIZE, filtered.length)} จาก {filtered.length} รูปแบบ
                  </span>
                  <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
                </div>
              </>
            )}
          </section>

          {/* ── ฟอร์มสร้าง/แก้ไข ─────────────────────────────── */}
          {form ? (
            <section className='flex flex-col shrink-0' style={{ ...CARD, width: 480 }}>
              <div className='flex items-center justify-between' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <span style={TITLE}>{originalCode ? `แก้ไขรูปแบบ ${originalCode}` : 'สร้างรูปแบบการนัดหมายใหม่'}</span>
                <NeutralSubdueButton size='sm' variant='outline' leadingIcon='close' onClick={cancelEdit}>
                  ปิด
                </NeutralSubdueButton>
              </div>

              <FieldGrid cols={2} columnGap='var(--dim-space-400)' rowGap='var(--dim-space-300)'>
                <Field label='รหัสรูปแบบ' required>
                  <InputField
                    size='md'
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder='เช่น NCD-FU'
                    showLabel={false}
                    showHelperText={false}
                    error={touched && !String(form.code).trim() ? 'ต้องระบุรหัส' : undefined}
                  />
                </Field>
                <Field label='ชื่อรูปแบบ' required>
                  <InputField
                    size='md'
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder='เช่น ติดตาม NCD ทุก 14 วัน'
                    showLabel={false}
                    showHelperText={false}
                    error={touched && !String(form.name).trim() ? 'ต้องระบุชื่อ' : undefined}
                  />
                </Field>
              </FieldGrid>

              <Field label='คลินิก / หน่วยงานที่ใช้ได้' required>
                <Select
                  options={CLINIC_MASTER.map((c) => ({ value: c, label: c }))}
                  value={form.clinics}
                  onChange={(v) => setForm({ ...form, clinics: v })}
                  multiple
                  selectAllLabel='เลือกทุกคลินิก'
                  size='md'
                  showLabel={false}
                  showHelperText={false}
                  placeholder='เลือกคลินิก'
                />
              </Field>

              <FieldGrid cols={2} columnGap='var(--dim-space-400)' rowGap='var(--dim-space-300)'>
                <Field label='ความยาว Slot' required>
                  <Select
                    options={SLOT_MINUTE_OPTIONS}
                    value={String(form.slotMinutes)}
                    onChange={(v) => setForm({ ...form, slotMinutes: Number(v) })}
                    size='md'
                    searchable={false}
                    showLabel={false}
                    showHelperText={false}
                  />
                </Field>
                <Field label='โหมดการให้บริการ' required>
                  <Select
                    options={APPT_TYPE_MODES}
                    value={form.mode}
                    onChange={(v) => setForm({ ...form, mode: v, needsRoom: v === 'onsite' ? form.needsRoom : false })}
                    size='md'
                    searchable={false}
                    showLabel={false}
                    showHelperText={false}
                  />
                </Field>
              </FieldGrid>

              <Field label='นัดต่อเนื่องเริ่มต้น'>
                <Select
                  options={RECURRENCE_PRESETS.map((p) => ({ value: String(p.value), label: p.label }))}
                  value={String(form.recurrenceEveryDays)}
                  onChange={(v) => setForm({ ...form, recurrenceEveryDays: Number(v) })}
                  size='md'
                  searchable={false}
                  showLabel={false}
                  showHelperText={false}
                />
              </Field>

              <Field label='รายการ “นัดมาเพื่อ” เริ่มต้น'>
                <Select
                  options={APPT_PURPOSE_MASTER.map((p) => ({ value: p.code, label: `${p.code} · ${p.label}` }))}
                  value={form.purposes}
                  onChange={(v) => setForm({ ...form, purposes: v })}
                  multiple
                  size='md'
                  showLabel={false}
                  showHelperText={false}
                  placeholder='เลือกได้หลายรายการ'
                />
              </Field>

              <SuggestibleTextarea
                label='ข้อความ “การเตรียมตัวก่อนตรวจ” (พิมพ์ลงใบนัด)'
                value={form.prepText}
                onChange={(e) => setForm({ ...form, prepText: e?.target ? e.target.value : e })}
                placeholder='พิมพ์อย่างน้อย 3 ตัวอักษรเพื่อดูข้อความมาตรฐาน'
                suggestions={APPT_TYPE_PREP_SUGGESTIONS}
                minChars={3}
                voice
                rows={3}
                height={128}
              />

              <SwitchRow
                label='รับคำขออัตโนมัติ'
                hint='เปิด = คำขอจากผู้รับบริการที่ตรงรูปแบบนี้จะยืนยันทันทีเมื่อไม่พบการชน · ปิด = ต้องให้เจ้าหน้าที่ยืนยันก่อน'
                checked={form.autoAccept}
                onChange={(v) => setForm({ ...form, autoAccept: v })}
              />
              <SwitchRow
                label='ต้องใช้ห้องตรวจ'
                hint='เปิด = ตรวจการชนห้องตรวจกับผังห้องของ OPD ก่อนยืนยัน'
                checked={form.needsRoom}
                onChange={(v) => setForm({ ...form, needsRoom: v })}
                disabled={form.mode !== 'onsite'}
              />
              <SwitchRow
                label='เปิดใช้งานรูปแบบนี้'
                hint='ปิด = ยังคงแสดงในนัดเดิม แต่เลือกใหม่ไม่ได้'
                checked={form.active}
                onChange={(v) => setForm({ ...form, active: v })}
              />

              {touched && errors.length ? (
                <ul className='flex flex-col m-0 p-0 list-none' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                  {errors.map((e) => (
                    <li
                      key={e}
                      className='flex items-start'
                      style={{ ...HINT, gap: 'var(--dim-space-100, 4px)', color: 'var(--text-alert-error)' }}
                    >
                      <Sym name='error' size={16} color='var(--icon-alertdialog-destructive)' />
                      {e}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <span title={canConfigure ? 'บันทึกรูปแบบนี้' : NO_PERMISSION_TOOLTIP}>
                  <BrandButton
                    variant='fill'
                    size='md'
                    leadingIcon='save'
                    disabled={!canConfigure || (touched && errors.length > 0)}
                    onClick={doSave}
                  >
                    บันทึก
                  </BrandButton>
                </span>
                <NeutralSubdueButton size='md' variant='outline' onClick={cancelEdit}>
                  ยกเลิก
                </NeutralSubdueButton>
              </div>
            </section>
          ) : null}
        </div>
      </QueuePageShell>

      <AlertDialog
        open={!!disableTarget}
        type='warning'
        title='ปิดใช้งานรูปแบบการนัดหมาย'
        description={disableTarget
          ? `${disableTarget.name} มีนัดในอนาคตที่ยังใช้รูปแบบนี้อยู่ ${disableUsage} รายการ — ปิดใช้งานแล้วนัดเดิมยังแสดงชื่อรูปแบบเดิมได้ต่อ แต่จะเลือกใหม่ไม่ได้`
          : ''}
        confirmLabel='ยืนยันปิดใช้งาน'
        cancelLabel='ยกเลิก'
        onConfirm={() => doToggleActive(disableTarget, false)}
        onClose={() => setDisableTarget(null)}
      />

      <AlertDialog
        open={!!deleteTarget}
        type='destructive'
        title='ลบรูปแบบการนัดหมาย'
        description={deleteTarget
          ? `ลบ ${deleteTarget.code} · ${deleteTarget.name} ออกจากทะเบียนถาวร — ลบได้เฉพาะรูปแบบที่ไม่มีนัดในอนาคตอ้างถึงเท่านั้น`
          : ''}
        confirmLabel='ยืนยันลบ'
        cancelLabel='ยกเลิก'
        onConfirm={() => doDelete(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      />

      <UnsavedChangesPopup
        open={leaveOpen}
        title='ปิดฟอร์มโดยยังไม่บันทึก ?'
        description='ข้อมูลรูปแบบที่กรอกไว้จะหายไปทั้งหมด'
        onClose={() => setLeaveOpen(false)}
        onSave={() => { setLeaveOpen(false); doSave(); }}
        onDiscard={() => { setLeaveOpen(false); setForm(null); setOriginalCode(null); }}
      />

      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />
    </>
  );
};

export default AppointmentTypeCatalogPage;
