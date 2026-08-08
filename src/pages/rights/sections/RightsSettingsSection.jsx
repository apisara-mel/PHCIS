import React, { useEffect, useState } from 'react';
import Table, { EllipsisText } from '@/components/table/Table';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import FilterTag from '@/components/forms/FilterTag';
import Switch from '@/components/switch/Switch';
import Popup from '@/components/popup/Popup';
import Alert from '@/components/alert/Alert';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import BrandIconButton from '@/components/button/BrandIconButton';
import {
  SectionCard,
  FieldGrid,
  ReadField,
  EmptyState,
  AuditNote,
  PermissionHint,
  T,
} from '@/pages/rights/rightsUi';
import {
  RIGHTS_MASTER,
  DEDUCTION_TYPES,
  DEDUCTION_MODES,
  RECEIPT_TYPES,
  BILLING_MODES,
  CHARGE_CATEGORY_LIST,
  CHARGE_CATEGORIES,
  receiptTypeLabel,
  billingModeLabel,
  upsertRightsMaster,
  setRightsMasterActive,
  deleteRightsMaster,
  rightsUsageCount,
  upsertDeductionType,
  deleteDeductionType,
  formatBaht,
} from '@/data/rightsClaimStore';

/* §1.7.5.1 – §1.7.5.5 — ตั้งค่าสิทธิการรักษา.

   Layout follows PharmacyRegistryPage's list+edit-on-one-page pattern:
   the master table stays visible, and picking a row opens its detail form
   underneath instead of navigating away — so the operator can compare two
   rights groups without losing their place.

   Requirement map
     §1.7.5.1 ตั้งค่า / แก้ไข / ค้นหาสิทธิ      → search box + เพิ่มสิทธิ + row edit
     §1.7.5.2 เงื่อนไขปลีกย่อย                → การคิดค่าบริการ · ส่วนลด% · วงเงินต่อครั้ง/ปี ·
                                              รายการยกเว้น · ค่าธรรมเนียม
     §1.7.5.3 เพิ่มรายการ/ค่าใช้จ่ายในสิทธิ    → ตารางรายการที่ผูกกับสิทธิ (เพิ่ม/แก้/ลบ)
     §1.7.5.4 แยกประเภทใบเสร็จ + ชนิดการคิดค่าบริการ → Select สองช่องแยกกัน
     §1.7.5.5 ประเภทการลดหย่อน               → แท็บย่อยที่สอง (CRUD)

   Deleting a rights row that a visit already bills against is blocked — the
   dialog steers the user to "ปิดสถานะใช้งาน" instead, because a hard delete
   would orphan the claim history. */

const TABS = [
  { key: 'rights',     label: 'สิทธิการรักษา',      icon: 'verified_user' },
  { key: 'deductions', label: 'ประเภทการลดหย่อน',   icon: 'percent' },
];

const emptyRights = () => ({
  id: null,
  code: '',
  name: '',
  receiptType: 'claimInvoice',
  billingMode: 'full',
  discountPct: 0,
  capPerVisit: 0,
  capPerYear: 0,
  coveragePct: 100,
  exclusions: [],
  fees: [],
  items: [],
  requiresCivilConfirm: false,
  active: true,
});

const emptyDeduction = () => ({
  id: null,
  name: '',
  condition: '',
  mode: 'percent',
  value: 0,
  active: true,
});

const toForm = (row) => ({
  ...row,
  exclusions: [...(row.exclusions || [])],
  fees: (row.fees || []).map((f) => ({ ...f })),
  items: (row.items || []).map((i) => ({ ...i })),
});

const numeric = (v) => {
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

/* ── §1.7.5.3 — รายการ/ค่าใช้จ่ายที่ผูกกับสิทธิ ── */
const RightsItemPopup = ({ open, initial, onClose, onSave }) => {
  const [form, setForm] = useState(initial || { code: '', label: '', category: 'service', price: 0, covered: 0 });
  useEffect(() => {
    if (open) setForm(initial || { code: '', label: '', category: 'service', price: 0, covered: 0 });
  }, [open, initial]);
  if (!open) return null;

  const valid = form.code.trim() && form.label.trim();
  const coveredTooHigh = numeric(form.covered) > numeric(form.price);

  return (
    <Popup
      open
      onClose={onClose}
      size='large'
      title={initial?.id ? 'แก้ไขรายการในสิทธิ' : 'เพิ่มรายการในสิทธิ'}
      subtitle='TOR §1.7.5.3 — รายการหรือค่าใช้จ่ายที่สิทธินี้ครอบคลุม'
      primaryAction={{
        label: initial?.id ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ',
        disabled: !valid || coveredTooHigh,
        onClick: () => { onSave({ ...form, price: numeric(form.price), covered: numeric(form.covered) }); onClose(); },
      }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    >
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <div className='grid' style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--dim-space-300)' }}>
          <InputField
            label='รหัสรายการ'
            required
            placeholder='เช่น SRV-OPD'
            value={form.code}
            onChange={(v) => setForm((f) => ({ ...f, code: v }))}
            showHelperText={false}
          />
          <Select
            label='หมวดค่าใช้จ่าย'
            searchable={false}
            showHelperText={false}
            showLeadingIcon={false}
            placeholder='เลือกหมวด'
            value={form.category}
            options={CHARGE_CATEGORY_LIST.map((c) => ({ value: c.key, label: c.label }))}
            onChange={(v) => setForm((f) => ({ ...f, category: v }))}
          />
        </div>
        <InputField
          label='ชื่อรายการ'
          required
          placeholder='เช่น ค่าตรวจรักษา OPD'
          value={form.label}
          onChange={(v) => setForm((f) => ({ ...f, label: v }))}
          showHelperText={false}
        />
        <div className='grid' style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--dim-space-300)' }}>
          <InputField
            label='ราคาตั้ง (บาท)'
            type='number'
            value={String(form.price)}
            onChange={(v) => setForm((f) => ({ ...f, price: v }))}
            showHelperText={false}
          />
          <InputField
            label='ส่วนที่สิทธิครอบคลุม (บาท)'
            type='number'
            value={String(form.covered)}
            onChange={(v) => setForm((f) => ({ ...f, covered: v }))}
            error={coveredTooHigh ? 'ส่วนที่สิทธิครอบคลุมต้องไม่มากกว่าราคาตั้ง' : undefined}
            helperText={coveredTooHigh ? undefined : 'ส่วนที่เหลือจะกลายเป็นเงินสดของผู้รับบริการ'}
          />
        </div>
      </div>
    </Popup>
  );
};

/* ── §1.7.5.5 — ประเภทการลดหย่อน ── */
const DeductionPopup = ({ open, initial, onClose, onSave }) => {
  const [form, setForm] = useState(initial || emptyDeduction());
  useEffect(() => { if (open) setForm(initial || emptyDeduction()); }, [open, initial]);
  if (!open) return null;

  const valid = form.name.trim().length > 1;
  const pctTooHigh = form.mode === 'percent' && numeric(form.value) > 100;

  return (
    <Popup
      open
      onClose={onClose}
      size='large'
      title={initial?.id ? 'แก้ไขประเภทการลดหย่อน' : 'เพิ่มประเภทการลดหย่อน'}
      subtitle='TOR §1.7.5.5 — กำหนดและเพิ่มประเภทการลดหย่อนค่ารักษาพยาบาล'
      primaryAction={{
        label: initial?.id ? 'บันทึกการแก้ไข' : 'เพิ่มประเภท',
        disabled: !valid || pctTooHigh,
        onClick: () => { onSave({ ...form, value: numeric(form.value) }); onClose(); },
      }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    >
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <InputField
          label='ชื่อประเภทการลดหย่อน'
          required
          placeholder='เช่น ผู้สูงอายุ 60 ปีขึ้นไป'
          value={form.name}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          error={form.name.length > 0 && !valid ? 'ระบุชื่ออย่างน้อย 2 ตัวอักษร' : undefined}
          showHelperText={!!(form.name.length > 0 && !valid)}
        />
        <InputField
          label='เงื่อนไขการได้รับสิทธิลดหย่อน'
          placeholder='เช่น อายุ ≥ 60 ปี และมีทะเบียนบ้าน กทม.'
          value={form.condition}
          onChange={(v) => setForm((f) => ({ ...f, condition: v }))}
          showHelperText={false}
        />
        <div className='grid' style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--dim-space-300)' }}>
          <Select
            label='รูปแบบการลดหย่อน'
            searchable={false}
            showHelperText={false}
            showLeadingIcon={false}
            placeholder='เลือกรูปแบบ'
            value={form.mode}
            options={DEDUCTION_MODES}
            onChange={(v) => setForm((f) => ({ ...f, mode: v }))}
          />
          <InputField
            label={form.mode === 'percent' ? 'เปอร์เซ็นต์ลดหย่อน (%)' : 'จำนวนเงินลดหย่อน (บาท)'}
            type='number'
            value={String(form.value)}
            onChange={(v) => setForm((f) => ({ ...f, value: v }))}
            error={pctTooHigh ? 'เปอร์เซ็นต์ต้องไม่เกิน 100' : undefined}
            showHelperText={pctTooHigh}
          />
        </div>
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
          <Switch checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} aria-label='สถานะใช้งาน' />
          <span style={T.body}>{form.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
        </div>
      </div>
    </Popup>
  );
};

const RightsSettingsSection = ({ role }) => {
  const [tab, setTab] = useState('rights');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(null);
  const [itemPopup, setItemPopup] = useState(null);      // { item } | { item: null }
  const [feeDraft, setFeeDraft] = useState({ label: '', amount: '' });
  const [deletePopup, setDeletePopup] = useState(false);
  const [switchWarn, setSwitchWarn] = useState(null);    // pending row id while dirty
  const [deductionPopup, setDeductionPopup] = useState(null);
  const [deductionDelete, setDeductionDelete] = useState(null);
  const [savedFlash, setSavedFlash] = useState('');

  const canManage = role.canManageSettings;

  const selected = selectedId === 'new'
    ? null
    : RIGHTS_MASTER.find((r) => r.id === selectedId) || null;

  /* Not memoised on purpose: RIGHTS_MASTER / DEDUCTION_TYPES are mutated in
     place by the store, so a useMemo keyed on the row reference would keep
     serving a pre-save snapshot and leave the form permanently "dirty".
     These lists are a handful of rows — recomputing every render is free. */
  const baseline = selectedId === 'new' ? emptyRights() : selected ? toForm(selected) : null;

  const dirty = !!form && !!baseline && JSON.stringify(form) !== JSON.stringify(baseline);

  const openRow = (id) => {
    if (dirty) { setSwitchWarn(id); return; }
    setSelectedId(id);
    setForm(id === 'new' ? emptyRights() : toForm(RIGHTS_MASTER.find((r) => r.id === id)));
    setSavedFlash('');
  };

  const closeRow = () => { setSelectedId(null); setForm(null); setSavedFlash(''); };

  const searchQ = query.trim().toLowerCase();

  const rows = RIGHTS_MASTER.filter((r) => {
    if (statusFilter !== 'all' && (statusFilter === 'active') !== r.active) return false;
    if (!searchQ) return true;
    return [r.code, r.name, receiptTypeLabel(r.receiptType), billingModeLabel(r.billingMode)]
      .some((f) => f && String(f).toLowerCase().includes(searchQ));
  });

  const deductionRows = !searchQ
    ? DEDUCTION_TYPES
    : DEDUCTION_TYPES.filter((d) => [d.name, d.condition].some((f) => f && f.toLowerCase().includes(searchQ)));

  const handleSave = () => {
    const payload = {
      ...form,
      discountPct: numeric(form.discountPct),
      capPerVisit: numeric(form.capPerVisit),
      capPerYear: numeric(form.capPerYear),
      /* ชนิดการคิดค่าบริการ drives coveragePct so the claim maths (§1.7.4.4)
         stays consistent with what this screen promises. */
      coveragePct: form.billingMode === 'discount'
        ? Math.max(0, 100 - numeric(form.discountPct))
        : numeric(form.coveragePct) || 100,
    };
    const saved = upsertRightsMaster(payload, role.userName);
    if (saved) {
      setSelectedId(saved.id);
      setForm(toForm(saved));
      setSavedFlash(`บันทึกสิทธิ ${saved.code} เรียบร้อย`);
    }
  };

  const usage = selected ? rightsUsageCount(selected.id) : 0;

  const masterColumns = [
    { key: 'code', label: 'รหัสสิทธิ' },
    {
      key: 'name', label: 'ชื่อสิทธิ', flex: true, minWidth: 240,
      render: (r) => (
        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
          <ColorfulBadge badgeStyle={r.badge || 'grey'} size='small'>{r.code}</ColorfulBadge>
          <EllipsisText text={r.name} />
        </div>
      ),
    },
    { key: 'receiptType', label: 'ประเภทใบเสร็จ', render: (r) => <EllipsisText text={receiptTypeLabel(r.receiptType)} /> },
    { key: 'billingMode', label: 'ชนิดการคิดค่าบริการ', render: (r) => <EllipsisText text={billingModeLabel(r.billingMode)} /> },
    {
      key: 'cap', label: 'วงเงิน',
      render: (r) => (
        <div className='flex flex-col min-w-0'>
          <span style={T.value}>{r.capPerVisit > 0 ? `${formatBaht(r.capPerVisit)}/ครั้ง` : 'ไม่จำกัดต่อครั้ง'}</span>
          <span style={T.muted}>{r.capPerYear > 0 ? `${formatBaht(r.capPerYear)}/ปี` : 'ไม่จำกัดต่อปี'}</span>
        </div>
      ),
    },
    { key: 'usage', label: 'ใช้อยู่', align: 'center', render: (r) => <span style={T.body}>{rightsUsageCount(r.id)} ครั้งบริการ</span> },
    {
      key: 'active', label: 'สถานะใช้งาน', sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }} onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={r.active}
            disabled={!canManage}
            aria-label={r.active ? `ปิดใช้งานสิทธิ ${r.name}` : `เปิดใช้งานสิทธิ ${r.name}`}
            onChange={(next) => setRightsMasterActive(r.id, next, role.userName)}
          />
          <span style={T.muted}>{r.active ? 'ใช้งาน' : 'ปิด'}</span>
        </div>
      ),
    },
    {
      key: 'edit', label: '', sortable: false,
      render: (r) => (
        <div className='flex justify-end w-full'>
          <BrandIconButton
            icon='edit'
            size='sm'
            variant={selectedId === r.id ? 'fill' : 'quaternary'}
            aria-label={`แก้ไขสิทธิ ${r.name}`}
            onClick={(e) => { e.stopPropagation(); openRow(r.id); }}
          />
        </div>
      ),
    },
  ];

  const itemColumns = [
    { key: 'code', label: 'รหัส' },
    { key: 'label', label: 'ชื่อรายการ', flex: true, minWidth: 220, render: (i) => <EllipsisText text={i.label} /> },
    { key: 'category', label: 'หมวด', render: (i) => <EllipsisText text={CHARGE_CATEGORIES[i.category]?.label || i.category} /> },
    { key: 'price', label: 'ราคาตั้ง', render: (i) => formatBaht(i.price) },
    { key: 'covered', label: 'สิทธิครอบคลุม', render: (i) => <span style={{ ...T.value, color: 'var(--text-statusbadge-success, #196C65)' }}>{formatBaht(i.covered)}</span> },
    {
      key: 'actions', label: '', sortable: false,
      render: (i) => (
        <div className='flex items-center justify-end w-full' style={{ gap: 'var(--dim-space-150)' }}>
          <BrandIconButton icon='edit' size='sm' variant='ghost' aria-label='แก้ไขรายการ' onClick={() => setItemPopup({ item: i })} />
          <BrandIconButton
            icon='delete'
            size='sm'
            variant='ghost'
            aria-label='ลบรายการ'
            onClick={() => setForm((f) => ({ ...f, items: f.items.filter((x) => x.id !== i.id) }))}
          />
        </div>
      ),
    },
  ];

  const deductionColumns = [
    { key: 'name', label: 'ชื่อประเภทการลดหย่อน', flex: true, minWidth: 240, render: (d) => <EllipsisText text={d.name} /> },
    { key: 'condition', label: 'เงื่อนไข', render: (d) => <EllipsisText text={d.condition || '-'} /> },
    {
      key: 'value', label: 'ส่วนลด',
      render: (d) => <span style={T.value}>{d.mode === 'percent' ? `${d.value}%` : formatBaht(d.value)}</span>,
    },
    {
      key: 'active', label: 'สถานะ',
      render: (d) => <StatusBadge style={d.active ? 'success' : 'neutral'} size='small'>{d.active ? 'ใช้งาน' : 'ปิดใช้งาน'}</StatusBadge>,
    },
    {
      key: 'audit', label: 'แก้ไขล่าสุด', sortable: false,
      render: (d) => (
        <div className='flex flex-col min-w-0'>
          <EllipsisText text={d.updatedBy || '-'} />
          <span style={T.muted}>{d.updatedAt || '-'}</span>
        </div>
      ),
    },
    {
      key: 'actions', label: '', sortable: false,
      render: (d) => (
        <div className='flex items-center justify-end w-full' style={{ gap: 'var(--dim-space-150)' }}>
          <BrandIconButton
            icon='edit'
            size='sm'
            variant='quaternary'
            disabled={!canManage}
            aria-label={`แก้ไข ${d.name}`}
            onClick={(e) => { e.stopPropagation(); setDeductionPopup({ item: d }); }}
          />
          <BrandIconButton
            icon='delete'
            size='sm'
            variant='ghost'
            disabled={!canManage}
            aria-label={`ลบ ${d.name}`}
            onClick={(e) => { e.stopPropagation(); setDeductionDelete(d); }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        {TABS.map((t) => (
          <FilterTag
            key={t.key}
            leadingIcon={t.icon}
            selected={tab === t.key}
            onClick={() => { setTab(t.key); setQuery(''); }}
            value={t.label}
          />
        ))}
      </div>

      <PermissionHint show={!canManage} text='บทบาทนี้ดูการตั้งค่าได้ แต่เพิ่ม/แก้ไข/ลบไม่ได้ — ต้องเป็นเจ้าหน้าที่เบิกจ่าย' />

      {savedFlash && <Alert type='success' title={savedFlash} subtext='บันทึกชื่อผู้แก้ไขและเวลาไว้ในประวัติแล้ว' onClose={() => setSavedFlash('')} />}

      {tab === 'rights' && (
        <>
          <div className='flex items-end flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <InputField
              label='ค้นหาสิทธิการรักษา'
              leadingIcon='search'
              placeholder='รหัสสิทธิ / ชื่อสิทธิ / ประเภทใบเสร็จ'
              value={query}
              onChange={setQuery}
              showHelperText={false}
              style={{ flex: '1 1 320px', minWidth: 280 }}
            />
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)', paddingBottom: 'var(--dim-space-200)' }}>
              {[{ k: 'all', l: 'ทุกสถานะ' }, { k: 'active', l: 'ใช้งาน' }, { k: 'inactive', l: 'ปิดใช้งาน' }].map((s) => (
                <FilterTag key={s.k} selected={statusFilter === s.k} onClick={() => setStatusFilter(s.k)} value={s.l} />
              ))}
            </div>
            <div style={{ paddingBottom: 'var(--dim-space-200)' }}>
              <BrandPrimaryButton
                size='md'
                leadingIcon='add'
                disabled={!canManage}
                title={canManage ? undefined : 'ต้องเป็นเจ้าหน้าที่เบิกจ่าย'}
                onClick={() => openRow('new')}
              >
                เพิ่มสิทธิการรักษา
              </BrandPrimaryButton>
            </div>
          </div>

          <span style={T.muted}>พบ {rows.length} สิทธิ จากทั้งหมด {RIGHTS_MASTER.length} รายการ</span>

          {rows.length === 0 ? (
            <EmptyState icon='search_off' title='ไม่พบสิทธิที่ตรงกับคำค้น' subtext='ลองล้างตัวกรองสถานะ หรือค้นด้วยรหัสสิทธิสั้นลง' />
          ) : (
            <Table
              columns={masterColumns}
              rows={rows}
              rowKey={(r) => r.id}
              stickyColCount={2}
              onRowClick={(r) => openRow(r.id)}
              emptyMessage='ไม่พบสิทธิที่ตรงกับคำค้น'
            />
          )}

          {form && (
            <SectionCard
              title={selectedId === 'new' ? 'เพิ่มสิทธิการรักษาใหม่' : `แก้ไขสิทธิ ${selected?.code} · ${selected?.name}`}
              subtitle='TOR §1.7.5.1 / §1.7.5.2 / §1.7.5.3 / §1.7.5.4'
              icon='tune'
              actions={(
                <>
                  {selected && <StatusBadge style={selected.active ? 'success' : 'neutral'} size='small'>{selected.active ? 'ใช้งาน' : 'ปิดใช้งาน'}</StatusBadge>}
                  <NeutralSubdueButton size='sm' variant='outline' onClick={() => (dirty ? setSwitchWarn('close') : closeRow())}>
                    ปิดฟอร์ม
                  </NeutralSubdueButton>
                </>
              )}
            >
              {/* (ค) §1.7.5.4 — ประเภทใบเสร็จ + ชนิดการคิดค่าบริการ แยกสองช่อง */}
              <div className='grid' style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--dim-space-400)' }}>
                <InputField
                  label='รหัสสิทธิ'
                  required
                  placeholder='เช่น UC'
                  value={form.code}
                  onChange={(v) => setForm((f) => ({ ...f, code: v.toUpperCase() }))}
                  disabled={!canManage}
                  showHelperText={false}
                />
                <InputField
                  label='ชื่อสิทธิ'
                  required
                  placeholder='เช่น บัตรทอง (หลักประกันสุขภาพแห่งชาติ)'
                  value={form.name}
                  onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                  disabled={!canManage}
                  showHelperText={false}
                />
                <Select
                  label='ประเภทการออกใบเสร็จ'
                  searchable={false}
                  showHelperText={false}
                  showLeadingIcon={false}
                  placeholder='เลือกประเภทใบเสร็จ'
                  value={form.receiptType}
                  options={RECEIPT_TYPES}
                  onChange={(v) => setForm((f) => ({ ...f, receiptType: v }))}
                  disabled={!canManage}
                />
                <Select
                  label='ชนิดการคิดค่าบริการ'
                  searchable={false}
                  showHelperText={false}
                  showLeadingIcon={false}
                  placeholder='เลือกชนิดการคิดค่าบริการ'
                  value={form.billingMode}
                  options={BILLING_MODES}
                  onChange={(v) => setForm((f) => ({ ...f, billingMode: v }))}
                  disabled={!canManage}
                />
              </div>

              {/* (ก) §1.7.5.2 — เงื่อนไขปลีกย่อย */}
              <div
                className='flex flex-col w-full'
                style={{
                  gap: 'var(--dim-space-300)',
                  borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
                  paddingTop: 'var(--dim-space-400)',
                }}
              >
                <span style={T.heading}>เงื่อนไขปลีกย่อยของสิทธิ (§1.7.5.2)</span>
                <div className='grid' style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--dim-space-400)' }}>
                  <InputField
                    label={form.billingMode === 'discount' ? 'ส่วนลดที่สิทธิให้ (%)' : 'สัดส่วนที่สิทธิครอบคลุม (%)'}
                    type='number'
                    value={String(form.billingMode === 'discount' ? form.discountPct : form.coveragePct)}
                    onChange={(v) => setForm((f) => (f.billingMode === 'discount'
                      ? { ...f, discountPct: v }
                      : { ...f, coveragePct: v }))}
                    disabled={!canManage}
                    helperText='ใช้คำนวณยอดเรียกเก็บของทุกครั้งบริการที่ใช้สิทธินี้'
                  />
                  <InputField
                    label='วงเงินต่อครั้ง (บาท · 0 = ไม่จำกัด)'
                    type='number'
                    value={String(form.capPerVisit)}
                    onChange={(v) => setForm((f) => ({ ...f, capPerVisit: v }))}
                    disabled={!canManage}
                    showHelperText={false}
                  />
                  <InputField
                    label='วงเงินต่อปี (บาท · 0 = ไม่จำกัด)'
                    type='number'
                    value={String(form.capPerYear)}
                    onChange={(v) => setForm((f) => ({ ...f, capPerYear: v }))}
                    disabled={!canManage}
                    showHelperText={false}
                  />
                </div>

                <Select
                  label='รายการยกเว้น (หมวดค่าใช้จ่ายที่สิทธินี้ไม่ครอบคลุม)'
                  multiple
                  selectAllLabel='เลือกทุกหมวด'
                  searchable={false}
                  showHelperText
                  helperText='หมวดที่เลือกจะตกเป็นเงินสดของผู้รับบริการทุกครั้ง'
                  showLeadingIcon={false}
                  placeholder='ไม่มีรายการยกเว้น'
                  value={form.exclusions}
                  options={CHARGE_CATEGORY_LIST.map((c) => ({ value: c.key, label: c.label }))}
                  onChange={(v) => setForm((f) => ({ ...f, exclusions: Array.isArray(v) ? v : [] }))}
                  disabled={!canManage}
                />

                {/* ค่าธรรมเนียมต่าง ๆ */}
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                  <span style={T.label}>ค่าธรรมเนียมต่าง ๆ</span>
                  {form.fees.length === 0 ? (
                    <span style={T.muted}>ยังไม่มีค่าธรรมเนียมของสิทธินี้</span>
                  ) : form.fees.map((fee) => (
                    <div key={fee.id} className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                      <span style={T.value}>{fee.label}</span>
                      <span style={T.body}>{formatBaht(fee.amount)}</span>
                      <BrandIconButton
                        icon='delete'
                        size='sm'
                        variant='ghost'
                        disabled={!canManage}
                        aria-label={`ลบค่าธรรมเนียม ${fee.label}`}
                        onClick={() => setForm((f) => ({ ...f, fees: f.fees.filter((x) => x.id !== fee.id) }))}
                      />
                    </div>
                  ))}
                  <div className='flex items-end flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                    <InputField
                      label='ชื่อค่าธรรมเนียม'
                      placeholder='เช่น ค่าธรรมเนียมบริการนอกเวลา'
                      value={feeDraft.label}
                      onChange={(v) => setFeeDraft((d) => ({ ...d, label: v }))}
                      disabled={!canManage}
                      showHelperText={false}
                      style={{ flex: '1 1 260px', minWidth: 220 }}
                    />
                    <InputField
                      label='จำนวนเงิน (บาท)'
                      type='number'
                      value={feeDraft.amount}
                      onChange={(v) => setFeeDraft((d) => ({ ...d, amount: v }))}
                      disabled={!canManage}
                      showHelperText={false}
                      style={{ width: 180 }}
                    />
                    <div style={{ paddingBottom: 'var(--dim-space-200)' }}>
                      <BrandSubdueButton
                        size='sm'
                        variant='outline'
                        leadingIcon='add'
                        disabled={!canManage || !feeDraft.label.trim() || numeric(feeDraft.amount) <= 0}
                        onClick={() => {
                          setForm((f) => ({
                            ...f,
                            fees: [...f.fees, { id: `fee-new-${Date.now()}`, label: feeDraft.label.trim(), amount: numeric(feeDraft.amount) }],
                          }));
                          setFeeDraft({ label: '', amount: '' });
                        }}
                      >
                        เพิ่มค่าธรรมเนียม
                      </BrandSubdueButton>
                    </div>
                  </div>
                </div>
              </div>

              {/* (ข) §1.7.5.3 — รายการ/ค่าใช้จ่ายที่ผูกกับสิทธิ */}
              <div
                className='flex flex-col w-full'
                style={{
                  gap: 'var(--dim-space-300)',
                  borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
                  paddingTop: 'var(--dim-space-400)',
                }}
              >
                <div className='flex items-center justify-between w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  <span style={T.heading}>รายการ / ค่าใช้จ่ายในสิทธินี้ (§1.7.5.3)</span>
                  <BrandSubdueButton
                    size='sm'
                    leadingIcon='add'
                    disabled={!canManage}
                    onClick={() => setItemPopup({ item: null })}
                  >
                    เพิ่มรายการ
                  </BrandSubdueButton>
                </div>
                {form.items.length === 0 ? (
                  <EmptyState icon='playlist_add' title='ยังไม่มีรายการที่ผูกกับสิทธินี้' subtext='เพิ่มรายการเพื่อกำหนดราคาตั้งและส่วนที่สิทธิครอบคลุม' />
                ) : (
                  <Table columns={itemColumns} rows={form.items} rowKey={(i) => i.id} emptyMessage='ยังไม่มีรายการ' />
                )}
              </div>

              <FieldGrid cols={3}>
                <ReadField label='ครั้งบริการที่ใช้สิทธินี้อยู่' value={`${usage} รายการ`} />
                <ReadField label='แก้ไขล่าสุดโดย' value={selected?.updatedBy} />
                <ReadField label='เวลาที่แก้ไข' value={selected?.updatedAt} />
              </FieldGrid>
              <AuditNote prefix='แก้ไขล่าสุดโดย' by={selected?.updatedBy} at={selected?.updatedAt} />

              {/* footer: แสดง / บันทึก / ยกเลิก / แก้ไข (+ ลบ) */}
              <div
                className='flex items-center flex-wrap w-full'
                style={{
                  gap: 'var(--dim-space-300)',
                  borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
                  paddingTop: 'var(--dim-space-400)',
                }}
              >
                {selected && (
                  <DangerSubdueButton
                    size='md'
                    disabled={!canManage}
                    onClick={() => setDeletePopup(true)}
                  >
                    ลบสิทธินี้
                  </DangerSubdueButton>
                )}
                <div className='flex-1' />
                <NeutralSubdueButton
                  size='md'
                  variant='outline'
                  disabled={!dirty}
                  onClick={() => setForm(baseline)}
                >
                  ยกเลิกการแก้ไข
                </NeutralSubdueButton>
                <BrandPrimaryButton
                  size='md'
                  leadingIcon='save'
                  disabled={!canManage || !dirty || !form.code.trim() || !form.name.trim()}
                  title={!form.code.trim() || !form.name.trim() ? 'ต้องระบุรหัสสิทธิและชื่อสิทธิ' : undefined}
                  onClick={handleSave}
                >
                  {selectedId === 'new' ? 'เพิ่มสิทธิการรักษา' : 'บันทึกการแก้ไข'}
                </BrandPrimaryButton>
              </div>
            </SectionCard>
          )}
        </>
      )}

      {tab === 'deductions' && (
        <>
          <div className='flex items-end flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <InputField
              label='ค้นหาประเภทการลดหย่อน'
              leadingIcon='search'
              placeholder='ชื่อประเภท / เงื่อนไข'
              value={query}
              onChange={setQuery}
              showHelperText={false}
              style={{ flex: '1 1 320px', minWidth: 280 }}
            />
            <div style={{ paddingBottom: 'var(--dim-space-200)' }}>
              <BrandPrimaryButton
                size='md'
                leadingIcon='add'
                disabled={!canManage}
                title={canManage ? undefined : 'ต้องเป็นเจ้าหน้าที่เบิกจ่าย'}
                onClick={() => setDeductionPopup({ item: null })}
              >
                เพิ่มประเภทการลดหย่อน
              </BrandPrimaryButton>
            </div>
          </div>

          <span style={T.muted}>พบ {deductionRows.length} ประเภท จากทั้งหมด {DEDUCTION_TYPES.length} รายการ</span>

          {deductionRows.length === 0 ? (
            <EmptyState icon='search_off' title='ไม่พบประเภทการลดหย่อนที่ตรงกับคำค้น' subtext='ลองค้นด้วยคำที่สั้นลง' />
          ) : (
            <Table
              columns={deductionColumns}
              rows={deductionRows}
              rowKey={(d) => d.id}
              stickyColCount={1}
              emptyMessage='ไม่พบประเภทการลดหย่อน'
            />
          )}

          <Alert
            type='info'
            title='ประเภทการลดหย่อนที่เปิดใช้งานจะเลือกได้ในหน้าต่างแก้ไขการเรียกเก็บ'
            subtext='ส่วนลดจะถูกหักจากส่วนที่ผู้รับบริการต้องจ่ายเอง แล้วสะท้อนใน “จำนวนเงินส่วนลดรวม” และ “% ส่วนลดที่ออกไปแล้ว” ของรายงานทางการเงิน'
          />
        </>
      )}

      {/* ── dialogs ── */}
      <RightsItemPopup
        open={!!itemPopup}
        initial={itemPopup?.item}
        onClose={() => setItemPopup(null)}
        onSave={(item) => setForm((f) => (item.id
          ? { ...f, items: f.items.map((x) => (x.id === item.id ? item : x)) }
          : { ...f, items: [...f.items, { ...item, id: `ri-new-${Date.now()}` }] }))}
      />

      <DeductionPopup
        open={!!deductionPopup}
        initial={deductionPopup?.item}
        onClose={() => setDeductionPopup(null)}
        onSave={(payload) => { upsertDeductionType(payload, role.userName); setSavedFlash(`บันทึกประเภทการลดหย่อน “${payload.name}” เรียบร้อย`); }}
      />

      <Popup
        open={!!deductionDelete}
        onClose={() => setDeductionDelete(null)}
        title='ยืนยันการลบประเภทการลดหย่อน'
        subtitle={deductionDelete ? `“${deductionDelete.name}” จะถูกลบออกจากรายการ` : ''}
        primaryAction={{
          label: 'ลบประเภทนี้',
          onClick: () => {
            deleteDeductionType(deductionDelete.id, role.userName);
            setSavedFlash(`ลบประเภทการลดหย่อน “${deductionDelete.name}” แล้ว`);
            setDeductionDelete(null);
          },
        }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setDeductionDelete(null) }}
      >
        <span style={T.body}>
          ครั้งบริการที่เคยใช้ประเภทนี้จะไม่มีการลดหย่อนอีก และยอดเงินสดจะกลับไปเป็นยอดเต็ม
        </span>
      </Popup>

      {/* ลบสิทธิ — บล็อกเมื่อยังมี visit ผูกอยู่ */}
      <Popup
        open={deletePopup}
        onClose={() => setDeletePopup(false)}
        title={usage > 0 ? 'ลบสิทธินี้ไม่ได้' : 'ยืนยันการลบสิทธิการรักษา'}
        subtitle={selected ? `${selected.code} · ${selected.name}` : ''}
        primaryAction={usage > 0
          ? {
            label: 'ปิดสถานะใช้งานแทน',
            onClick: () => {
              setRightsMasterActive(selected.id, false, role.userName);
              setForm((f) => ({ ...f, active: false }));
              setDeletePopup(false);
              setSavedFlash(`ปิดใช้งานสิทธิ ${selected.code} แล้ว`);
            },
          }
          : {
            label: 'ลบสิทธินี้',
            onClick: () => {
              deleteRightsMaster(selected.id, role.userName);
              setDeletePopup(false);
              closeRow();
            },
          }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setDeletePopup(false) }}
      >
        {usage > 0 ? (
          <Alert
            type='warning'
            title={`สิทธินี้ถูกใช้เรียกเก็บอยู่ ${usage} ครั้งบริการ`}
            subtext='การลบจะทำให้ประวัติการเรียกเก็บอ้างสิทธิที่ไม่มีอยู่ — แนะนำปิดสถานะใช้งานเพื่อกันการเลือกใช้ใหม่ แต่เก็บประวัติเดิมไว้'
          />
        ) : (
          <span style={T.body}>ยังไม่มีครั้งบริการใดใช้สิทธินี้เรียกเก็บ จึงลบได้อย่างปลอดภัย</span>
        )}
      </Popup>

      {/* สลับแถว/ปิดฟอร์มขณะยังมีการแก้ไขค้าง */}
      <Popup
        open={!!switchWarn}
        onClose={() => setSwitchWarn(null)}
        title='ทิ้งการแก้ไขที่ยังไม่บันทึก?'
        subtitle='ค่าที่แก้ไว้ในฟอร์มสิทธิปัจจุบันจะหายไป'
        primaryAction={{
          label: 'ทิ้งการแก้ไข',
          onClick: () => {
            const next = switchWarn;
            setSwitchWarn(null);
            if (next === 'close') { closeRow(); return; }
            setSelectedId(next);
            setForm(next === 'new' ? emptyRights() : toForm(RIGHTS_MASTER.find((r) => r.id === next)));
          },
        }}
        secondaryAction={{ label: 'กลับไปแก้ต่อ', onClick: () => setSwitchWarn(null) }}
      />
    </div>
  );
};

export default RightsSettingsSection;
