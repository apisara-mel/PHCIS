import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import Alert from '@/components/alert/Alert';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import SelectableTag from '@/components/forms/SelectableTag';
import Switch from '@/components/switch/Switch';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import PrimarySearch from '@/components/search/PrimarySearch';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  DRUG_CATEGORIES,
  VISIT_TYPES,
  SERVICE_WINDOWS,
  WEEKDAYS,
  PATIENT_RIGHTS,
  DEFAULT_PHARMACY,
  blankRoutingRule,
  detectOverlaps,
  deleteRoutingRule,
  findUncoveredClinics,
  getRoutingRules,
  moveRoutingRule,
  resolveRoute,
  rulesCoveringClinic,
  saveRoutingRule,
  subscribeRoutingRules,
  toggleRoutingRule,
  validateRoutingRule,
} from '@/data/drugRoutingRules';
import { clinicServices, pharmacyServices, getHealthcareService } from '@/data/usersAccess';
import {
  EmptyState,
  LastEditedNote,
  ModuleCard,
  PermissionGate,
  ReadOnlyNotice,
  SectionTitle,
  auditAdmin,
  useActiveCenter,
} from '@/pages/users/usersShared';

/* DrugOrderRoutingPage — TOR §1.17.3 "กำหนดการ routing คำสั่งยาระหว่าง
   Healthcare Service (คลินิก) กับ Healthcare Service (ห้องยา)".

   ตารางกติกาเรียงตามลำดับความสำคัญ + ตรวจกติกาซ้อนทับ + ทดลองเส้นทาง.
   ครบ แสดง / บันทึก / ยกเลิก / แก้ไข (+ ลบ, เปิด-ปิด, เลื่อนลำดับ). */

const breadcrumb = ['ระบบงานผู้ดูแลระบบ', 'ผู้ใช้และสิทธิ์การเข้าถึง', 'Routing คำสั่งยา'];
const PAGE_SIZE = 20;

const TABS = [
  { key: 'rules',    label: 'กติกาการส่งต่อ', icon: 'alt_route' },
  { key: 'conflict', label: 'ตรวจกติกาซ้อนทับ', icon: 'rule' },
  { key: 'simulate', label: 'ทดลองเส้นทาง',   icon: 'science' },
];

const FILTER_DEFAULTS = { clinic: 'all', pharmacy: 'all', drug: 'all', state: 'all' };

const drugTone = (key) => DRUG_CATEGORIES.find((d) => d.key === key)?.tone || 'grey';
const drugLabel = (key) => DRUG_CATEGORIES.find((d) => d.key === key)?.label || key;
const serviceName = (id) => getHealthcareService(id)?.name || '—';

const DrugOrderRoutingPage = () => {
  const history = useHistory();
  const { label: centerName } = useActiveCenter();

  const [rules, setRules] = useState(() => getRoutingRules());
  const [activeTab, setActiveTab] = useState('rules');
  const [searchQ, setSearchQ] = useState('');
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);      /* ฟอร์มกติกา (สร้าง/แก้ ใช้ popup เดียวกัน) */
  const [formDirty, setFormDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formWarnings, setFormWarnings] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDisable, setConfirmDisable] = useState(null);
  const [toast, setToast] = useState('');
  const [undoRule, setUndoRule] = useState(null);
  const [sim, setSim] = useState({
    clinic: 'hs-opd', visitType: 'walkin', window: 'in', day: 'mon', drugCategory: 'general', right: 'any',
  });
  const [simResult, setSimResult] = useState(null);

  useEffect(() => subscribeRoutingRules(() => setRules(getRoutingRules())), []);
  useEffect(() => { setPage(1); }, [searchQ, filters]);

  const clinics = clinicServices();
  const pharmacies = pharmacyServices();
  const overlaps = useMemo(() => detectOverlaps(rules), [rules]);
  const uncovered = useMemo(() => findUncoveredClinics(rules), [rules]);

  const setFilter = (key) => (value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const isAllDefault = Object.keys(FILTER_DEFAULTS).every((k) => filters[k] === FILTER_DEFAULTS[k]) && !searchQ;

  const filtered = useMemo(() => {
    let rows = rules;
    if (filters.clinic !== 'all') rows = rows.filter((r) => (r.sources || []).includes(filters.clinic));
    if (filters.pharmacy !== 'all') rows = rows.filter((r) => r.destination === filters.pharmacy || r.fallback === filters.pharmacy);
    if (filters.drug !== 'all') rows = rows.filter((r) => (r.drugCategories || []).includes(filters.drug));
    if (filters.state !== 'all') rows = rows.filter((r) => (filters.state === 'on' ? r.enabled : !r.enabled));
    const q = searchQ.trim().toLowerCase();
    if (q) rows = rows.filter((r) => [r.name, r.note, serviceName(r.destination)].some((f) => f && f.toLowerCase().includes(q)));
    return rows;
  }, [rules, filters, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  const summaryCards = useMemo(() => ([
    { key: 'total',   label: 'กติกาทั้งหมด',              value: rules.length, color: 'brand', icon: 'alt_route' },
    { key: 'on',      label: 'เปิดใช้งานอยู่',            value: rules.filter((r) => r.enabled).length, color: 'positive', icon: 'toggle_on' },
    { key: 'overlap', label: 'คู่กติกาที่ซ้อนทับ',         value: overlaps.length, color: overlaps.length ? 'destructive' : 'positive', icon: 'rule' },
    { key: 'gap',     label: 'คลินิกที่ยังไม่มีกติกาครอบคลุม', value: uncovered.length, color: uncovered.length ? 'inprogress' : 'positive', icon: 'help' },
  ]), [rules, overlaps.length, uncovered.length]);

  const openCreate = () => {
    setEditing(blankRoutingRule());
    setFormErrors({});
    setFormWarnings([]);
    setFormDirty(false);
  };
  const openEdit = (rule) => {
    setEditing({ ...rule, sources: [...rule.sources], drugCategories: [...rule.drugCategories], visitTypes: [...rule.visitTypes], days: [...rule.days] });
    setFormErrors({});
    setFormWarnings([]);
    setFormDirty(false);
  };

  /* ปิดฟอร์มทั้งที่ยังแก้ค้าง = ต้องยืนยันก่อนทิ้ง (playbook §5 "ยกเลิกกลางคัน") */
  const closeForm = () => {
    if (formDirty) { setConfirmDiscard(true); return; }
    setEditing(null);
  };
  const discardForm = () => {
    setConfirmDiscard(false);
    setFormDirty(false);
    setEditing(null);
  };

  const setForm = (key, value) => { setFormDirty(true); setEditing((prev) => ({ ...prev, [key]: value })); };
  const toggleIn = (key, value) => {
    setFormDirty(true);
    setEditing((prev) => {
      const set = new Set(prev[key] || []);
      if (set.has(value)) set.delete(value); else set.add(value);
      return { ...prev, [key]: [...set] };
    });
  };

  const submitRule = () => {
    const { errors, warnings } = validateRoutingRule(editing, rules);
    setFormErrors(errors);
    setFormWarnings(warnings);
    if (Object.keys(errors).length) {
      auditAdmin(`บันทึกกติกา routing คำสั่งยาไม่สำเร็จ — ${editing.name || 'กติกาใหม่'}`, false);
      return;
    }
    saveRoutingRule(editing, 'ผู้ดูแลระบบ');
    auditAdmin(`${editing.id ? 'แก้ไข' : 'เพิ่ม'}กติกา routing คำสั่งยา "${editing.name}"`);
    setToast(`${editing.id ? 'แก้ไข' : 'เพิ่ม'}กติกา "${editing.name}" เรียบร้อยแล้ว`);
    setFormDirty(false);
    setEditing(null);
    setTimeout(() => setToast(''), 4000);
  };

  const doDelete = () => {
    const rule = confirmDelete;
    deleteRoutingRule(rule.id);
    auditAdmin(`ลบกติกา routing คำสั่งยา "${rule.name}"`);
    setUndoRule(rule);
    setToast(`ลบกติกา "${rule.name}" แล้ว`);
    setConfirmDelete(null);
    setTimeout(() => setToast(''), 8000);
  };

  /* เลิกทำการลบ — คืนกติกาที่เพิ่งลบกลับเข้าตาราง (undo ดีกว่าถามซ้ำ) */
  const undoDelete = () => {
    if (!undoRule) return;
    saveRoutingRule({ ...undoRule, id: null }, 'ผู้ดูแลระบบ');
    auditAdmin(`เลิกทำการลบกติกา routing "${undoRule.name}" — คืนกติกากลับ`);
    setToast(`คืนกติกา "${undoRule.name}" กลับแล้ว`);
    setUndoRule(null);
    setTimeout(() => setToast(''), 4000);
  };

  const requestToggle = (rule, next) => {
    if (!next) {
      /* ปิดกติกาสุดท้ายที่ครอบคลุมคลินิกใดคลินิกหนึ่ง = ต้องเตือน */
      const orphans = (rule.sources || []).filter((s) => rulesCoveringClinic(s, rules).length <= 1);
      if (orphans.length) {
        setConfirmDisable({ rule, orphans });
        return;
      }
    }
    toggleRoutingRule(rule.id, next);
    auditAdmin(`${next ? 'เปิด' : 'ปิด'}ใช้งานกติกา routing "${rule.name}"`);
  };

  const move = (rule, dir) => {
    moveRoutingRule(rule.id, dir);
    auditAdmin(`เลื่อนลำดับกติกา routing "${rule.name}" ${dir === 'up' ? 'ขึ้น' : 'ลง'}`);
  };

  const columns = useMemo(() => ([
    {
      key: 'order', label: 'ลำดับ', width: 110, sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <ColorfulBadge style='grey' size='small'>{r.order}</ColorfulBadge>
          <button
            type='button'
            aria-label='เลื่อนลำดับขึ้น'
            onClick={(e) => { e.stopPropagation(); move(r, 'up'); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-content-tertiary)', lineHeight: 0 }}
          >
            <Icon name='keyboard_arrow_up' size={16} />
          </button>
          <button
            type='button'
            aria-label='เลื่อนลำดับลง'
            onClick={(e) => { e.stopPropagation(); move(r, 'down'); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-content-tertiary)', lineHeight: 0 }}
          >
            <Icon name='keyboard_arrow_down' size={16} />
          </button>
        </div>
      ),
    },
    {
      key: 'name', label: 'กติกา', flex: true, minWidth: 240,
      render: (r) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span className='truncate' style={{ color: 'var(--text-content-primary)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)' }}>{r.name}</span>
          <span className='truncate' style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>{r.note || '—'}</span>
        </div>
      ),
    },
    {
      key: 'sources', label: 'คลินิกต้นทาง', width: 230, sortable: false,
      render: (r) => (
        <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          {(r.sources || []).slice(0, 2).map((s) => (
            <ColorfulBadge key={s} style='grey' size='small'>{serviceName(s)}</ColorfulBadge>
          ))}
          {(r.sources || []).length > 2 ? <ColorfulBadge style='blue' size='small'>+{r.sources.length - 2}</ColorfulBadge> : null}
        </div>
      ),
    },
    {
      key: 'destination', label: 'ห้องยาปลายทาง', width: 220, sortable: false,
      render: (r) => {
        const dest = getHealthcareService(r.destination);
        return (
          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-xs, 12px)' }}>
              <Icon name='arrow_forward' size={14} />
              {dest?.name || '—'}
            </span>
            <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>
              สำรอง: {serviceName(r.fallback)}
            </span>
            {dest && !dest.active ? <ColorfulBadge style='red' size='small' icon='warning'>ห้องยาปิดอยู่</ColorfulBadge> : null}
          </div>
        );
      },
    },
    {
      key: 'drug', label: 'ประเภทยา', width: 190, sortable: false,
      render: (r) => (
        <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          {(r.drugCategories || []).map((d) => (
            <ColorfulBadge key={d} style={drugTone(d)} size='small'>{drugLabel(d)}</ColorfulBadge>
          ))}
        </div>
      ),
    },
    {
      key: 'when', label: 'เงื่อนไขเวลา', width: 200, sortable: false,
      render: (r) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)', fontSize: 'var(--type-size-xs, 12px)' }}>
          <span>{SERVICE_WINDOWS.find((w) => w.key === r.window)?.label}</span>
          <span style={{ color: 'var(--text-content-tertiary)' }}>
            {(r.days || []).map((d) => WEEKDAYS.find((w) => w.key === d)?.label).join(' ')}
          </span>
          <span style={{ color: 'var(--text-content-tertiary)' }}>
            {(r.visitTypes || []).map((v) => VISIT_TYPES.find((t) => t.key === v)?.label).join(' · ')}
          </span>
        </div>
      ),
    },
    {
      key: 'enabled', label: 'เปิดใช้', width: 110, sortable: false,
      render: (r) => (
        <span onClick={(e) => e.stopPropagation()} role='presentation'>
          <Switch checked={!!r.enabled} onChange={(next) => requestToggle(r, next)} aria-label={`เปิด-ปิดกติกา ${r.name}`} />
        </span>
      ),
    },
    {
      key: 'updatedBy', label: 'แก้ไขล่าสุด', width: 190, sortable: false,
      render: (r) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)', fontSize: 'var(--type-size-xs, 12px)' }}>
          <span className='truncate'>{r.updatedBy}</span>
          <span style={{ color: 'var(--text-content-tertiary)' }}>{r.updatedAt}</span>
        </div>
      ),
    },
    {
      key: 'actions', label: 'การดำเนินการ', width: 180, sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={(e) => { e.stopPropagation(); openEdit(r); }}>แก้ไข</BrandSubdueButton>
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='delete' onClick={(e) => { e.stopPropagation(); setConfirmDelete(r); }}>ลบ</NeutralSubdueButton>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [rules]);

  const runSim = () => {
    const result = resolveRoute(sim, rules);
    setSimResult(result);
    auditAdmin(`ทดลองเส้นทางคำสั่งยา: ${serviceName(sim.clinic)} → ${serviceName(result.destinationId)}`);
  };

  /* ── tab bodies ─────────────────────────────────────────────────── */

  const renderRules = (readOnly) => (
    <ModuleCard>
      {readOnly ? <ReadOnlyNotice feature='กติกา routing คำสั่งยา' /> : null}
      {toast ? (
        <Alert
          type='success'
          title='ดำเนินการสำเร็จ'
          subtext={toast}
          onClose={() => setToast('')}
          detail={undoRule ? (
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='undo' onClick={undoDelete}>
              เลิกทำการลบ
            </NeutralSubdueButton>
          ) : undefined}
        />
      ) : null}

      {overlaps.length > 0 ? (
        <Alert
          type='warning'
          title={`พบกติกาซ้อนทับ ${overlaps.length} คู่`}
          subtext={`ตัวอย่าง: ลำดับ ${overlaps[0].a.order} กับลำดับ ${overlaps[0].b.order} — ${overlaps[0].reason} · ผู้ชนะจริงคือลำดับ ${overlaps[0].winner.order}`}
          detail={(
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='rule' onClick={() => setActiveTab('conflict')}>
              ดูรายละเอียดกติกาซ้อนทับ
            </BrandSubdueButton>
          )}
        />
      ) : null}

      {uncovered.length > 0 ? (
        <Alert
          type='info'
          title={`มี ${uncovered.length} คลินิกที่ยังไม่มีกติกาครอบคลุม`}
          subtext={`${uncovered.map((c) => c.name).join(' · ')} — คำสั่งยาจากคลินิกเหล่านี้จะตกไปที่ ${serviceName(DEFAULT_PHARMACY)} โดยอัตโนมัติ`}
        />
      ) : null}

      <div className='w-full flex items-start justify-center'>
        <PrimarySearch
          value={searchQ}
          onChange={setSearchQ}
          onSubmit={(label) => setSearchQ(label)}
          placeholder='ค้นหาชื่อกติกา / ห้องยาปลายทาง / หมายเหตุ'
          width={640}
        />
      </div>

      <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <OverflowFlexRow itemGap='var(--dim-space-200, 8px)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
          <FilterTag value='ทั้งหมด' selected={isAllDefault} onClick={() => { setFilters(FILTER_DEFAULTS); setSearchQ(''); }} />
          <FilterDropdown prefix='คลินิก:' options={[{ value: 'all', label: 'ทุกคลินิก' }, ...clinics.map((c) => ({ value: c.id, label: c.name }))]} value={filters.clinic} onChange={setFilter('clinic')} />
          <FilterDropdown prefix='ห้องยา:' options={[{ value: 'all', label: 'ทุกห้องยา' }, ...pharmacies.map((p) => ({ value: p.id, label: p.name }))]} value={filters.pharmacy} onChange={setFilter('pharmacy')} />
          <FilterDropdown prefix='ประเภทยา:' options={[{ value: 'all', label: 'ทุกประเภท' }, ...DRUG_CATEGORIES.map((d) => ({ value: d.key, label: d.label }))]} value={filters.drug} onChange={setFilter('drug')} />
          <FilterDropdown prefix='สถานะ:' options={[{ value: 'all', label: 'ทั้งหมด' }, { value: 'on', label: 'เปิดใช้งาน' }, { value: 'off', label: 'ปิดอยู่' }]} value={filters.state} onChange={setFilter('state')} />
        </OverflowFlexRow>
        <div className='flex-1' />
        {!readOnly ? (
          <BrandButton size='md' leadingIcon='add' onClick={openCreate}>เพิ่มกติกา</BrandButton>
        ) : null}
      </div>

      {rules.length === 0 ? (
        <EmptyState
          icon='alt_route'
          title='ยังไม่มีกติกา routing คำสั่งยา'
          subtitle={`คำสั่งยาทั้งหมดจะถูกส่งไปที่ ${serviceName(DEFAULT_PHARMACY)} จนกว่าจะสร้างกติกาแรก`}
          action={!readOnly ? <BrandButton size='md' leadingIcon='add' onClick={openCreate}>สร้างกติกาแรก</BrandButton> : null}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon='search_off'
          title='ไม่พบกติกาที่ตรงกับเงื่อนไข'
          subtitle='ลองปรับคำค้นหรือล้างตัวกรอง'
          action={<NeutralSubdueButton variant='outline' size='md' leadingIcon='filter_alt_off' onClick={() => { setFilters(FILTER_DEFAULTS); setSearchQ(''); }}>ล้างตัวกรอง</NeutralSubdueButton>}
        />
      ) : (
        <>
          <Table columns={columns} rows={pageRows} rowKey={(r) => r.id} onRowClick={(r) => openEdit(r)} stickyColCount={1} emptyMessage='ไม่พบกติกา' />
          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              paddingTop: 'var(--dim-space-200, 8px)',
              borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
            }}
          >
            <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm, 14px)' }}>
              {`แสดง ${rangeStart}–${rangeEnd} จาก ${filtered.length} รายการ`}
            </span>
            <div className='flex-1' />
            <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}
    </ModuleCard>
  );

  const renderConflict = () => (
    <ModuleCard>
      <SectionTitle
        icon='rule'
        title='ตรวจกติกาซ้อนทับ'
        subtitle='กติกาที่เงื่อนไขตัดกันแต่ปลายทางคนละห้องยา — ลำดับที่น้อยกว่าเป็นผู้ชนะเสมอ'
        action={(
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='refresh'
            onClick={() => { setRules(getRoutingRules()); auditAdmin('ตรวจสอบกติกา routing ที่ซ้อนทับ'); }}
          >
            ตรวจอีกครั้ง
          </BrandSubdueButton>
        )}
      />
      {overlaps.length === 0 ? (
        <EmptyState icon='verified' title='ไม่พบกติกาที่ซ้อนทับ' subtitle='ทุกกติกาที่เปิดใช้งานอยู่มีเงื่อนไขแยกจากกันชัดเจน' />
      ) : (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          {overlaps.map((c, i) => (
            <div
              key={`${c.a.id}-${c.b.id}-${i}`}
              className='flex flex-col w-full'
              style={{
                gap: 'var(--dim-space-200, 8px)',
                paddingTop: 'var(--dim-space-300, 12px)',
                paddingBottom: 'var(--dim-space-300, 12px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
                background: 'var(--surface-pill-orange)',
                borderRadius: 'var(--dim-radius-300, 10px)',
                color: 'var(--text-pill-orange)',
              }}
            >
              <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)' }}>
                <Icon name='warning' size={18} />
                ลำดับ {c.a.order} "{c.a.name}" ซ้อนทับกับ ลำดับ {c.b.order} "{c.b.name}"
              </span>
              <span style={{ fontSize: 'var(--type-size-xs, 12px)' }}>{c.reason}</span>
              <span style={{ fontSize: 'var(--type-size-xs, 12px)' }}>
                ปลายทาง: {serviceName(c.a.destination)} vs {serviceName(c.b.destination)} — <strong>ผู้ชนะจริงคือลำดับ {c.winner.order} ({serviceName(c.winner.destination)})</strong>
              </span>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={() => openEdit(c.a)}>แก้ลำดับ {c.a.order}</BrandSubdueButton>
                <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={() => openEdit(c.b)}>แก้ลำดับ {c.b.order}</BrandSubdueButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionTitle icon='help' title='คลินิกที่ยังไม่มีกติกาครอบคลุม' subtitle={`คำสั่งยาจากคลินิกเหล่านี้จะตกไปที่ ${serviceName(DEFAULT_PHARMACY)}`} />
      {uncovered.length === 0 ? (
        <EmptyState icon='check_circle' title='ทุกคลินิกมีกติกาครอบคลุมแล้ว' subtitle='ไม่มีคำสั่งยาที่ต้องตกไป default' />
      ) : (
        <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {uncovered.map((c) => (
            <ColorfulBadge key={c.id} style='orange' size='small' icon='warning'>{c.name}</ColorfulBadge>
          ))}
        </div>
      )}
    </ModuleCard>
  );

  const renderSimulate = () => (
    <ModuleCard>
      <SectionTitle icon='science' title='ทดลองเส้นทางคำสั่งยา' subtitle='เลือกเงื่อนไขแล้วดูว่ากติกาข้อไหนถูกใช้ และปลายทางคือห้องยาใด' />
      <div className='grid grid-cols-1 md:grid-cols-3 w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <Select label='คลินิกต้นทาง' searchable={false} value={sim.clinic} onChange={(v) => setSim((p) => ({ ...p, clinic: v }))} options={clinics.map((c) => ({ value: c.id, label: c.name }))} />
        <Select label='ประเภทผู้รับบริการ' searchable={false} value={sim.visitType} onChange={(v) => setSim((p) => ({ ...p, visitType: v }))} options={VISIT_TYPES.map((v) => ({ value: v.key, label: v.label }))} />
        <Select label='ช่วงเวลา' searchable={false} value={sim.window} onChange={(v) => setSim((p) => ({ ...p, window: v }))} options={SERVICE_WINDOWS.filter((w) => w.key !== 'any').map((w) => ({ value: w.key, label: `${w.label} (${w.hours})` }))} />
        <Select label='วันในสัปดาห์' searchable={false} value={sim.day} onChange={(v) => setSim((p) => ({ ...p, day: v }))} options={WEEKDAYS.map((d) => ({ value: d.key, label: d.label }))} />
        <Select label='ประเภทยา' searchable={false} value={sim.drugCategory} onChange={(v) => setSim((p) => ({ ...p, drugCategory: v }))} options={DRUG_CATEGORIES.map((d) => ({ value: d.key, label: d.label }))} />
        <Select label='สิทธิการรักษา' searchable={false} value={sim.right} onChange={(v) => setSim((p) => ({ ...p, right: v }))} options={PATIENT_RIGHTS.map((r) => ({ value: r.key, label: r.label }))} />
      </div>
      <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <BrandButton size='md' leadingIcon='play_arrow' onClick={runSim}>ทดลองเส้นทาง</BrandButton>
        {simResult ? (
          <NeutralSubdueButton variant='outline' size='md' onClick={() => setSimResult(null)}>ล้างผลลัพธ์</NeutralSubdueButton>
        ) : null}
      </div>

      {!simResult ? (
        <EmptyState icon='route' title='ยังไม่ได้ทดลอง' subtitle='ตั้งเงื่อนไขด้านบนแล้วกด "ทดลองเส้นทาง" เพื่อดูผลลัพธ์ทีละกติกา' />
      ) : (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          {simResult.matched ? (
            <Alert
              type='success'
              title={`ปลายทาง: ${serviceName(simResult.destinationId)}`}
              subtext={`ใช้กติกาลำดับ ${simResult.rule.order} "${simResult.rule.name}"${simResult.usedFallback ? ` — ${simResult.fallbackReason}` : ''}`}
            />
          ) : (
            <Alert
              type='warning'
              title={`ไม่ตรงกับกติกาใดเลย — ตกไปที่ ${serviceName(DEFAULT_PHARMACY)}`}
              subtext='ควรสร้างกติกาให้ครอบคลุมเงื่อนไขนี้ เพื่อไม่ให้คำสั่งยาไปห้องยากลางโดยไม่ตั้งใจ'
            />
          )}
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs, 12px)' }}>ลำดับการไล่กติกา</span>
            {simResult.trace.map((t) => (
              <div
                key={t.rule.id}
                className='flex flex-wrap items-center w-full'
                style={{
                  gap: 'var(--dim-space-200, 8px)',
                  paddingTop: 'var(--dim-space-250, 10px)',
                  paddingBottom: 'var(--dim-space-250, 10px)',
                  paddingLeft: 'var(--dim-space-300, 12px)',
                  paddingRight: 'var(--dim-space-300, 12px)',
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  background: t.matched ? 'var(--surface-pill-green)' : 'var(--surface-card-100)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default)',
                  color: t.matched ? 'var(--text-pill-green)' : 'var(--text-content-secondary)',
                }}
              >
                <Icon name={t.matched ? 'check_circle' : 'radio_button_unchecked'} size={16} />
                <span style={{ fontSize: 'var(--type-size-sm, 14px)' }}>ลำดับ {t.rule.order} · {t.rule.name}</span>
                <div className='flex-1' />
                {Object.entries(t.checks).map(([k, ok]) => (
                  <ColorfulBadge key={k} style={ok ? 'green' : 'grey'} size='small'>
                    {({ clinic: 'คลินิก', drug: 'ประเภทยา', visit: 'ผู้รับบริการ', day: 'วัน', window: 'เวลา', right: 'สิทธิ' })[k]}
                  </ColorfulBadge>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </ModuleCard>
  );

  return (
    <QueuePageShell
      activeKey='users'
      breadcrumb={breadcrumb}
      title={`Routing คำสั่งยา — ${centerName}`}
      onBack={() => history.push('/users')}
      backLabel='กลับไปหน้าผู้ใช้'
      summaryCards={summaryCards}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* ฟอร์มเพิ่ม/แก้กติกา — ใช้ popup เดียวกันทั้งสองโหมด */}
      <Popup
        open={!!editing}
        onClose={closeForm}
        size='extraLarge'
        title={editing?.id ? 'แก้ไขกติกาการส่งคำสั่งยา' : 'เพิ่มกติกาการส่งคำสั่งยา'}
        subtitle='กำหนดว่าคำสั่งยาจากคลินิกใด ภายใต้เงื่อนไขใด จะถูกส่งไปห้องยาใด'
        tertiaryAction={{ label: 'ยกเลิก', onClick: closeForm }}
        primaryAction={{ label: editing?.id ? 'บันทึกการแก้ไข' : 'เพิ่มกติกา', onClick: submitRule }}
      >
        {editing ? (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            {formWarnings.length ? (
              <Alert type='warning' title='ข้อควรระวัง' subtext={formWarnings.join(' | ')} />
            ) : null}

            <InputField label='ชื่อกติกา' required value={editing.name} onChange={(v) => setForm('name', v)} error={formErrors.name} placeholder='เช่น ยาเสพติด → ห้องยาควบคุมพิเศษ' />

            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs, 12px)' }}>คลินิกต้นทาง (เลือกได้หลายคลินิก) *</span>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {clinics.map((c) => (
                  <SelectableTag key={c.id} label={c.name} selected={editing.sources.includes(c.id)} onClick={() => toggleIn('sources', c.id)} />
                ))}
              </div>
              {formErrors.sources ? <span style={{ color: 'var(--text-input-require)', fontSize: 'var(--type-size-xs, 12px)' }}>{formErrors.sources}</span> : null}
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <Select
                label='ห้องยาปลายทาง'
                required
                searchable={false}
                value={editing.destination}
                onChange={(v) => setForm('destination', v)}
                options={pharmacies.map((p) => ({ value: p.id, label: `${p.name}${p.active ? '' : ' (ปิดใช้งาน)'}` }))}
                error={formErrors.destination}
                placeholder='เลือกห้องยา'
              />
              <Select
                label='ห้องยาสำรอง (ใช้เมื่อห้องหลักปิด/เกินคิว)'
                required
                searchable={false}
                value={editing.fallback}
                onChange={(v) => setForm('fallback', v)}
                options={pharmacies.filter((p) => p.id !== editing.destination).map((p) => ({ value: p.id, label: p.name }))}
                error={formErrors.fallback}
                placeholder='เลือกห้องยาสำรอง'
              />
            </div>

            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs, 12px)' }}>ประเภทยา *</span>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {DRUG_CATEGORIES.map((d) => (
                  <SelectableTag key={d.key} label={d.label} selected={editing.drugCategories.includes(d.key)} onClick={() => toggleIn('drugCategories', d.key)} />
                ))}
              </div>
              {formErrors.drugCategories ? <span style={{ color: 'var(--text-input-require)', fontSize: 'var(--type-size-xs, 12px)' }}>{formErrors.drugCategories}</span> : null}
            </div>

            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs, 12px)' }}>ประเภทผู้รับบริการ *</span>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {VISIT_TYPES.map((v) => (
                  <SelectableTag key={v.key} label={v.label} selected={editing.visitTypes.includes(v.key)} onClick={() => toggleIn('visitTypes', v.key)} />
                ))}
              </div>
              {formErrors.visitTypes ? <span style={{ color: 'var(--text-input-require)', fontSize: 'var(--type-size-xs, 12px)' }}>{formErrors.visitTypes}</span> : null}
            </div>

            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs, 12px)' }}>วันในสัปดาห์ *</span>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {WEEKDAYS.map((d) => (
                  <SelectableTag key={d.key} label={d.label} selected={editing.days.includes(d.key)} onClick={() => toggleIn('days', d.key)} />
                ))}
              </div>
              {formErrors.days ? <span style={{ color: 'var(--text-input-require)', fontSize: 'var(--type-size-xs, 12px)' }}>{formErrors.days}</span> : null}
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <Select label='ช่วงเวลาให้บริการ' searchable={false} value={editing.window} onChange={(v) => setForm('window', v)} options={SERVICE_WINDOWS.map((w) => ({ value: w.key, label: `${w.label} (${w.hours})` }))} />
              <Select label='สิทธิการรักษา' searchable={false} value={editing.right} onChange={(v) => setForm('right', v)} options={PATIENT_RIGHTS.map((r) => ({ value: r.key, label: r.label }))} />
            </div>

            <InputField label='หมายเหตุ' value={editing.note} onChange={(v) => setForm('note', v)} placeholder='เหตุผลเชิงนโยบาย เช่น ตามระเบียบการเก็บรักษายาเสพติด' />

            <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <Switch checked={editing.enabled !== false} onChange={(v) => setForm('enabled', v)} aria-label='เปิดใช้งานกติกานี้' />
              <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm, 14px)' }}>เปิดใช้งานกติกานี้ทันทีหลังบันทึก</span>
            </div>
          </div>
        ) : null}
      </Popup>

      <AlertDialog
        open={confirmDiscard}
        type='warning'
        title='ทิ้งการแก้ไขกติกานี้หรือไม่ ?'
        description='ข้อมูลที่กรอกค้างไว้ในฟอร์มจะหายไปทั้งหมด — เลือก "กลับไปแก้ต่อ" เพื่อกรอกให้เสร็จก่อน'
        cancelLabel='กลับไปแก้ต่อ'
        confirmLabel='ทิ้งการแก้ไข'
        onCancel={() => setConfirmDiscard(false)}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={discardForm}
      />

      <AlertDialog
        open={!!confirmDelete}
        type='destructive'
        title='ลบกติกานี้ ?'
        description={confirmDelete
          ? `"${confirmDelete.name}" จะถูกลบถาวร — คลินิกที่เคยครอบคลุมอาจตกไปที่ ${serviceName(DEFAULT_PHARMACY)} ถ้าไม่มีกติกาอื่นรองรับ`
          : ''}
        cancelLabel='ยกเลิก'
        confirmLabel='ลบกติกา'
        onCancel={() => setConfirmDelete(null)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
      />

      <AlertDialog
        open={!!confirmDisable}
        type='warning'
        title='ปิดกติกาสุดท้ายที่ครอบคลุมคลินิกนี้ ?'
        description={confirmDisable
          ? `หลังปิด คลินิก ${confirmDisable.orphans.map((s) => serviceName(s)).join(', ')} จะไม่มีกติกาครอบคลุม และคำสั่งยาจะตกไปที่ ${serviceName(DEFAULT_PHARMACY)}`
          : ''}
        cancelLabel='ไม่ปิด'
        confirmLabel='ยืนยันปิดกติกา'
        onCancel={() => setConfirmDisable(null)}
        onClose={() => setConfirmDisable(null)}
        onConfirm={() => {
          toggleRoutingRule(confirmDisable.rule.id, false);
          auditAdmin(`ปิดใช้งานกติกา routing "${confirmDisable.rule.name}"`);
          setConfirmDisable(null);
        }}
      />

      <div className='flex flex-col flex-1 min-w-0' style={{ paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-500, 20px)' }}>
        <PermissionGate feature='system.settings' featureLabel='ตั้งค่าระบบ'>
          {(readOnly) => (
            <>
              {activeTab === 'rules' ? renderRules(readOnly) : null}
              {activeTab === 'conflict' ? renderConflict() : null}
              {activeTab === 'simulate' ? renderSimulate() : null}
              <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <LastEditedNote by={rules[0]?.updatedBy} at={rules[0]?.updatedAt} />
              </div>
            </>
          )}
        </PermissionGate>
      </div>
    </QueuePageShell>
  );
};

export default DrugOrderRoutingPage;
