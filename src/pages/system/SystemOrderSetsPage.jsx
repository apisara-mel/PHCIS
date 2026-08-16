import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import SYSTEM_NAV from '@/pages/system/systemNav';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import PrimarySearch from '@/components/search/PrimarySearch';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import InputField from '@/components/forms/InputField';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Select from '@/components/forms/Select';
import SelectableTag from '@/components/forms/SelectableTag';
import RadioGroup from '@/components/radio/RadioGroup';
import Stepper from '@/components/stepper/Stepper';
import Alert from '@/components/alert/Alert';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import Switch from '@/components/switch/Switch';
import Icon from '@/components/icons/Icon';
import { GuardedAction } from '@/pages/treat/panels/panelHooks';
import { EmptyState, ModuleCard, ReadOnlyNotice } from '@/pages/users/usersShared';
import {
  ORDER_SET_ITEM_KINDS,
  blankOrderSet,
  blankOrderSetItem,
  getOrderSets,
  subscribeOrderSets,
  upsertOrderSet,
  setOrderSetActive,
  itemKindMeta,
} from '@/data/treatmentOrderSets';
import { ROLES, DEPARTMENTS, USERS } from '@/data/usersAccess';
import { PHCIS_CURRENT_USER } from '@/data/phcisCurrentUser';
import { DRUG_REGISTRY, UNIT_TYPES } from '@/data/pharmacyRegistry';
import { LAB_TESTS } from '@/data/labCatalog';
import { XRAY_EXAMS } from '@/data/xrayCatalog';
import { MEDICAL_SUPPLY_CATALOG } from '@/pages/treat/panels/MedicalSupplyOrderPanel';
import { ICD9_PROCEDURES } from '@/pages/treat/panels/ProcedureOrderPanel';
import { CONSULT_CLINICS } from '@/data/treatmentConsult';
import { CURRENT_CLINICIAN } from '@/data/treatmentAudit';

/* ระบบจัดการระบบ · ชุดคำสั่งการรักษา
   แยกทะเบียนตาม “อาการ” / “โรค” เพื่อให้ผู้ดูแลระบบเห็นโครงสร้างทางคลินิก
   ก่อนเห็นรายละเอียดเชิงเทคนิคของแต่ละ order. ชุดหนึ่งผสมยา เวชภัณฑ์มิใช่ยา
   Lab, X-ray, หัตถการ, ปรึกษา และรายการอื่นได้ พร้อมกำหนดกลุ่มผู้เข้าถึง. */

const breadcrumb = ['จัดการระบบ', 'ชุดคำสั่งการรักษา'];

const CARD = {
  background: 'var(--surface-card-100, #FFFFFF)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
  borderRadius: 'var(--dim-radius-500, 16px)',
  boxShadow: 'var(--shadow-card, 0px 1px 4px rgb(8 167 104 / 0.08), 0px 1px 8px rgb(8 167 104 / 0.10))',
};

const SUBCARD = {
  background: 'var(--surface-card-100, #FFFFFF)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
  borderRadius: 'var(--dim-radius-400, 12px)',
};

const TITLE = {
  color: 'var(--text-content-default, #363B3F)',
  fontFamily: 'var(--type-family-heading-graphic2, Mitr)',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-regular, 400)',
};

const BODY = {
  color: 'var(--text-content-default, #363B3F)',
  fontFamily: 'var(--type-family-body, Sarabun)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-regular, 400)',
};

const MUTED = {
  ...BODY,
  color: 'var(--text-content-tertiary, #858C92)',
  fontSize: 'var(--type-size-xs, 12px)',
};

const ACCESS_MODES = [
  {
    value: 'all',
    label: 'ผู้ให้บริการทุกคน',
    description: 'ผู้ให้บริการที่มีสิทธิ์สั่งการรักษาสามารถเห็นชุดนี้ได้',
  },
  {
    value: 'restricted',
    label: 'กำหนดผู้เข้าถึง',
    description: 'จำกัดตามบทบาท แผนก หรือผู้ใช้งานรายบุคคล',
  },
];

const STATUS_OPTIONS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'active', label: 'เปิดใช้งาน' },
  { value: 'inactive', label: 'ปิดใช้งาน' },
];

const ACCESS_OPTIONS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'all', label: 'ผู้ให้บริการทุกคน' },
  { value: 'restricted', label: 'กำหนดผู้เข้าถึง' },
];

/* Quick actions shown in the editor even before an Admin has created the
   first local preset in a category. Existing persisted Group names are merged
   with these examples below so the prototype remains useful on a fresh store. */
const MOCK_GROUPS = [
  'เบาหวาน',
  'ระบบทางเดินหายใจ',
  'อาการปวด',
  'แผลและหัตถการ',
  'ความดันโลหิตสูง',
];

const cloneAccess = (row = {}) => {
  const source = row.access || {};
  const legacyRestricted = row.scope === 'personal';
  return {
    mode: source.mode || row.accessMode || (legacyRestricted ? 'restricted' : 'all'),
    roles: [...(source.roles || row.allowedRoles || [])],
    departments: [...(source.departments || row.allowedDepartments || [])],
    users: [...(source.users || row.allowedUsers || [])],
  };
};

const blankAdminOrderSet = () => ({
  ...blankOrderSet(),
  scope: 'shared',
  ownerId: 'system-admin',
  owner: CURRENT_CLINICIAN.center,
  access: {
    mode: 'all',
    roles: [],
    departments: [],
    users: [],
  },
});

const normalizeDraft = (row) => {
  const base = row || blankAdminOrderSet();
  return {
    ...base,
    groupLabel: base.groupLabel || base.classificationLabel || base.conditionLabel || '',
    description: base.description || '',
    active: base.active !== false,
    access: cloneAccess(base),
    items: (base.items || []).map((item) => ({ ...item })),
  };
};

const accessModeOf = (row) => cloneAccess(row).mode;

const accessSummary = (rowOrAccess, compact = false) => {
  const access = rowOrAccess?.mode ? rowOrAccess : cloneAccess(rowOrAccess);
  if (access.mode === 'all') return 'ผู้ให้บริการทุกคน';
  const parts = [];
  if (access.roles.length) parts.push(`${access.roles.length} บทบาท`);
  if (access.departments.length) parts.push(`${access.departments.length} แผนก`);
  if (access.users.length) parts.push(`${access.users.length} รายบุคคล`);
  if (!parts.length && rowOrAccess?.scope === 'personal') return compact ? 'เฉพาะเจ้าของ' : 'เฉพาะผู้สร้างชุดคำสั่ง';
  return parts.length ? parts.join(' · ') : 'ยังไม่ได้เลือกผู้เข้าถึง';
};

const kindCounts = (items = []) => ORDER_SET_ITEM_KINDS
  .map((kind) => ({ ...kind, count: items.filter((item) => item.kind === kind.key).length }))
  .filter((kind) => kind.count > 0);

const dispensingUnitLabel = (unitKey) => UNIT_TYPES.find((unit) => unit.key === unitKey)?.label || unitKey || '';

const catalogOptions = (kind) => {
  if (kind === 'medication') {
    return DRUG_REGISTRY.filter((row) => row.active).map((row) => ({
      value: row.id,
      label: row.name,
      subtext: row.code,
      storedLabel: row.name,
      unit: dispensingUnitLabel(row.unit),
      administrationDefaults: { ...(row.administrationDefaults || {}) },
    }));
  }
  if (kind === 'medicalSupply') {
    return MEDICAL_SUPPLY_CATALOG.map((row) => ({
      ...row,
      storedLabel: row.label,
    }));
  }
  if (kind === 'lab') {
    return LAB_TESTS.filter((row) => !row.retired).map((row) => ({
      value: row.id,
      label: `${row.nameEn} — ${row.nameTh}`,
      subtext: row.code,
      storedLabel: row.nameEn || row.nameTh,
    }));
  }
  if (kind === 'xray') {
    return XRAY_EXAMS.filter((row) => !row.retired).map((row) => ({
      value: row.id,
      label: row.name,
      subtext: row.code,
      storedLabel: row.name,
    }));
  }
  if (kind === 'procedure') {
    return ICD9_PROCEDURES.map((row) => ({
      value: row.code,
      label: row.nameTh,
      subtext: `ICD-9-CM ${row.code}`,
      storedLabel: row.nameTh,
      unit: row.unit,
    }));
  }
  if (kind === 'consult') {
    return CONSULT_CLINICS.map((row) => ({
      value: row.key,
      label: row.label,
      subtext: `คิวรอ ${row.waiting} ราย`,
      storedLabel: row.label,
    }));
  }
  return [];
};

const isFreeTextKind = (kind) => kind === 'other';

const normalizedIdentityPart = (value) => String(value || '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleLowerCase('th-TH');

/* รายการจากทะเบียนเทียบด้วย kind + refId; รายการกรอกเองเทียบด้วยชื่อที่
   normalize ช่องว่าง/ตัวพิมพ์แล้ว เพื่อกัน order ซ้ำแม้ผู้ใช้พิมพ์ต่างรูปแบบ. */
const itemIdentity = (item = {}) => {
  const kind = String(item.kind || 'other');
  const refId = normalizedIdentityPart(item.refId);
  if (!isFreeTextKind(kind) && refId) return `${kind}::ref::${refId}`;
  return `${kind}::label::${normalizedIdentityPart(item.label)}`;
};

const findDuplicateItem = (items = []) => {
  const seen = new Set();
  return items.find((item) => {
    const identity = itemIdentity(item);
    if (seen.has(identity)) return true;
    seen.add(identity);
    return false;
  });
};

const currentSystemActor = () => USERS.find((user) => (
  user.id === PHCIS_CURRENT_USER.id && user.status === 'active'
));

/* Admin เป็นผู้ดูแลระบบโดยหน้าที่และแก้ไขได้; บทบาทอื่นต้องผ่าน feature
   system.settings จากบัญชีที่ resolve ได้จริงเท่านั้น (หา actor ไม่พบ = deny). */
const systemSettingsAccessLevel = (actor) => {
  if (actor?.role === 'admin') return 'edit';
  const level = actor?.features?.['system.settings'];
  return level === 'edit' || level === 'view' ? level : null;
};

function SectionHeading({ icon, title, description, trailing }) {
  return (
    <div className='flex flex-wrap items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      <span
        className='inline-flex items-center justify-center shrink-0'
        style={{
          width: 'var(--dim-size-600, 32px)',
          height: 'var(--dim-size-600, 32px)',
          borderRadius: 'var(--dim-radius-200, 8px)',
          background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
          color: 'var(--text-brandPrimary-default, #007549)',
        }}
      >
        <Icon name={icon} size='var(--dim-size-300, 16px)' />
      </span>
      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)', flex: '1 1 0' }}>
        <span style={TITLE}>{title}</span>
        {description ? <span style={MUTED}>{description}</span> : null}
      </div>
      {trailing ? <div className='shrink-0'>{trailing}</div> : null}
    </div>
  );
}

function AccessBadgeList({ access }) {
  const badges = [];
  access.roles.forEach((id) => {
    const row = ROLES.find((item) => item.key === id);
    if (row) badges.push({ key: `role-${id}`, tone: row.color === 'brand' ? 'green' : row.color, label: row.label });
  });
  access.departments.forEach((id) => {
    const row = DEPARTMENTS.find((item) => item.key === id);
    if (row) badges.push({ key: `dept-${id}`, tone: 'teal', label: row.label });
  });
  access.users.forEach((id) => {
    const row = USERS.find((item) => item.id === id);
    if (row) badges.push({ key: `user-${id}`, tone: 'blue', label: row.name });
  });
  if (access.mode === 'all') {
    return <StatusBadge style='success' size='small' icon='groups'>ผู้ให้บริการทุกคน</StatusBadge>;
  }
  if (!badges.length) return <span style={MUTED}>ยังไม่ได้เลือกผู้เข้าถึง</span>;
  return (
    <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
      {badges.map((badge) => (
        <ColorfulBadge key={badge.key} style={badge.tone || 'grey'} size='small' width='hug'>
          {badge.label}
        </ColorfulBadge>
      ))}
    </div>
  );
}

function LivePreview({ draft }) {
  const counts = kindCounts(draft.items);
  return (
    <aside
      className='flex flex-col min-w-0'
      style={{
        ...SUBCARD,
        flex: '1 1 var(--dim-size-2450, 280px)',
        padding: 'var(--dim-space-400, 16px)',
        gap: 'var(--dim-space-400, 16px)',
        background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
        borderColor: 'var(--border-brandPrimary-quaternary, #E2F3EB)',
      }}
    >
      <SectionHeading icon='preview' title='ตัวอย่างก่อนบันทึก' description='สรุปสิ่งที่ผู้ให้บริการจะเห็นในหน้าสั่งการรักษา' />
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <ColorfulBadge style='teal' size='small' width='hug'>{String(draft.groupLabel || '').trim() || 'ยังไม่มีกลุ่ม'}</ColorfulBadge>
          <StatusBadge style={draft.active ? 'success' : 'neutral'} size='small'>
            {draft.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
          </StatusBadge>
        </div>
        <span style={TITLE}>{draft.name.trim() || 'ยังไม่ได้ตั้งชื่อชุดคำสั่ง'}</span>
        {draft.description ? <span style={MUTED}>{draft.description}</span> : null}
      </div>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <span style={MUTED}>รายการในชุด ({draft.items.length})</span>
        {counts.length ? (
          <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            {counts.map((kind) => (
              <ColorfulBadge key={kind.key} style={kind.badge || 'grey'} size='small' width='hug'>
                {kind.label} {kind.count}
              </ColorfulBadge>
            ))}
          </div>
        ) : <span style={MUTED}>ยังไม่มีรายการสั่งการรักษา</span>}
      </div>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <span style={MUTED}>ผู้ที่สามารถเข้าถึง</span>
        <AccessBadgeList access={draft.access} />
      </div>
    </aside>
  );
}

function ItemDefaults({ item, onPatch }) {
  if (item.kind === 'medication') {
    return (
      <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <label className='flex flex-col items-start' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={MUTED}>จำนวนจ่าย</span>
          <Stepper
            value={Number(item.quantity || 1)}
            onChange={(value) => onPatch({ quantity: value })}
            min={1}
            max={999}
            size='large'
            aria-label={`จำนวนจ่าย ${item.label}`}
          />
        </label>
        <div style={{ flex: '1 1 var(--dim-size-2000, 128px)' }}>
          <InputField label='หน่วย' value={item.unit || ''} onChange={(value) => onPatch({ unit: value })} showLeadingIcon={false} placeholder='เช่น เม็ด' />
        </div>
        <div style={{ flex: '1 1 var(--dim-size-2000, 128px)' }}>
          <InputField label='ทานครั้งละ' value={item.dosePerTake || ''} onChange={(value) => onPatch({ dosePerTake: value })} showLeadingIcon={false} placeholder='เช่น 1 เม็ด' />
        </div>
        <div style={{ flex: '1 1 var(--dim-size-2200, 192px)' }}>
          <InputField label='ความถี่' value={item.frequency || ''} onChange={(value) => onPatch({ frequency: value })} showLeadingIcon={false} placeholder='เช่น วันละ 2 ครั้ง หลังอาหาร' />
        </div>
        <div style={{ flex: '1 1 var(--dim-size-2000, 128px)' }}>
          <InputField label='ช่วงเวลา' value={item.when || ''} onChange={(value) => onPatch({ when: value })} showLeadingIcon={false} placeholder='เช่น หลังอาหาร' />
        </div>
        <div style={{ flex: '1 1 var(--dim-size-2000, 128px)' }}>
          <InputField label='จำนวนวัน' value={item.days || ''} onChange={(value) => onPatch({ days: value })} showLeadingIcon={false} placeholder='เช่น 7' />
        </div>
      </div>
    );
  }
  if (item.kind === 'medicalSupply') {
    return (
      <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <label className='flex flex-col items-start' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={MUTED}>จำนวน</span>
          <Stepper
            value={Number(item.quantity || 1)}
            onChange={(value) => onPatch({ quantity: value })}
            min={1}
            max={999}
            size='large'
            aria-label={`จำนวน ${item.label}`}
          />
        </label>
        <div style={{ minWidth: 'var(--dim-size-2000, 128px)' }}>
          <InputField label='หน่วย' value={item.unit || ''} onChange={(value) => onPatch({ unit: value })} showLeadingIcon={false} placeholder='เช่น ชิ้น' />
        </div>
      </div>
    );
  }
  return (
    <div style={{ width: 'var(--dim-size-2200, 192px)' }}>
      <Select
        label='ความเร่งด่วน'
        value={item.urgency || 'routine'}
        onChange={(value) => onPatch({ urgency: value })}
        searchable={false}
        options={[
          { value: 'routine', label: 'ปกติ' },
          { value: 'urgent', label: 'ด่วน' },
          { value: 'stat', label: 'ด่วนมาก (STAT)' },
        ]}
      />
    </div>
  );
}

function OrderItemCard({ item, onPatch, onRemove }) {
  const meta = itemKindMeta(item.kind);
  return (
    <div
      className='flex flex-col w-full'
      style={{ ...SUBCARD, padding: 'var(--dim-space-300, 12px)', gap: 'var(--dim-space-300, 12px)' }}
    >
      <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <ColorfulBadge style={meta.badge || 'grey'} size='small' width='hug'>{meta.label}</ColorfulBadge>
        <div className='flex flex-col min-w-0' style={{ flex: '1 1 0', gap: 'var(--dim-space-050, 2px)' }}>
          <span style={BODY}>{item.label || 'ยังไม่ได้ระบุรายการ'}</span>
          {item.refId ? <span style={MUTED}>{item.refId}</span> : null}
        </div>
        <NeutralSubdueIconButton icon='delete' size='sm' aria-label={`นำ ${item.label || 'รายการ'} ออกจากชุด`} onClick={onRemove} />
      </div>
      <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <div style={{ flex: '2 1 var(--dim-size-2500, 320px)' }}>
          <ItemDefaults item={item} onPatch={onPatch} />
        </div>
        <div style={{ flex: '2 1 var(--dim-size-2500, 320px)' }}>
          <InputField label='หมายเหตุ / คำแนะนำ' value={item.note || ''} onChange={(value) => onPatch({ note: value })} showLeadingIcon={false} placeholder='ข้อมูลที่จะติดไปกับรายการเมื่อเลือกใช้ชุดนี้' />
        </div>
      </div>
    </div>
  );
}

export default function SystemOrderSetsPage() {
  const history = useHistory();
  const actor = currentSystemActor();
  const accessLevel = systemSettingsAccessLevel(actor);
  const canView = accessLevel === 'view' || accessLevel === 'edit';
  const canEdit = accessLevel === 'edit';
  const [records, setRecords] = useState(() => (canView ? getOrderSets() : []));
  const [search, setSearch] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [accessFilter, setAccessFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [composerKind, setComposerKind] = useState(ORDER_SET_ITEM_KINDS[0]?.key || 'medication');
  const [composerValue, setComposerValue] = useState('');
  const [composerLabel, setComposerLabel] = useState('');
  const [groupComposerOpen, setGroupComposerOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [toast, setToast] = useState(null);

  const refresh = () => setRecords(canView ? getOrderSets() : []);
  useEffect(() => {
    if (!canView) return undefined;
    return subscribeOrderSets(refresh);
  }, [canView]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupOptions = useMemo(() => [
    { value: '', label: 'ทั้งหมด' },
    ...[...new Set([
      ...MOCK_GROUPS,
      ...records.map((row) => row.groupLabel || row.classificationLabel || 'ไม่จัดกลุ่ม'),
    ].filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'th'))
      .map((label) => ({ value: label, label }))
      .concat({ value: '__create__', label: 'สร้างกลุ่มใหม่' }),
  ], [records]);
  const quickGroupOptions = useMemo(() => {
    const options = groupOptions.filter((option) => option.value && option.value !== '__create__');
    if (draft?.groupLabel && !options.some((option) => option.value === draft.groupLabel)) {
      options.unshift({ value: draft.groupLabel, label: draft.groupLabel });
    }
    return options.slice(0, 7);
  }, [groupOptions, draft?.groupLabel]);
  const kindOptions = useMemo(() => [
    { value: '', label: 'ทั้งหมด' },
    ...ORDER_SET_ITEM_KINDS.map((item) => ({ value: item.key, label: item.label })),
  ], []);
  const roleOptions = useMemo(() => ROLES.map((item) => ({ value: item.key, label: item.label })), []);
  const departmentOptions = useMemo(() => DEPARTMENTS.map((item) => ({ value: item.key, label: item.label })), []);
  const userOptions = useMemo(() => USERS.filter((item) => item.status === 'active').map((item) => ({
    value: item.id,
    label: item.name,
    subtext: `${ROLES.find((role) => role.key === item.role)?.label || item.role} · ${item.email}`,
  })), []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((row) => {
      const groupLabel = row.groupLabel || row.classificationLabel || 'ไม่จัดกลุ่ม';
      if (classificationFilter && groupLabel !== classificationFilter) return false;
      if (statusFilter === 'active' && row.active === false) return false;
      if (statusFilter === 'inactive' && row.active !== false) return false;
      if (accessFilter && accessModeOf(row) !== accessFilter) return false;
      if (kindFilter && !(row.items || []).some((item) => item.kind === kindFilter)) return false;
      if (!query) return true;
      const haystack = [
        row.name,
        row.groupLabel,
        row.classificationLabel,
        row.conditionLabel,
        row.description,
        row.owner,
        ...(row.items || []).map((item) => item.label),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [records, search, classificationFilter, statusFilter, accessFilter, kindFilter]);

  const sorted = useMemo(() => {
    const copy = filtered.slice();
    const direction = sortConfig.direction === 'desc' ? -1 : 1;
    copy.sort((a, b) => {
      const value = (row) => {
        if (sortConfig.key === 'classificationLabel') return row.groupLabel || row.classificationLabel || row.conditionLabel || '';
        if (sortConfig.key === 'access') return accessSummary(row, true);
        if (sortConfig.key === 'active') return row.active === false ? 0 : 1;
        return row[sortConfig.key] || '';
      };
      return direction * String(value(a)).localeCompare(String(value(b)), 'th');
    });
    return copy;
  }, [filtered, sortConfig]);

  const grouped = useMemo(() => {
    const labels = [...new Set(sorted.map((row) => row.groupLabel || row.classificationLabel || 'ไม่จัดกลุ่ม'))];
    return labels
      .filter((label) => !classificationFilter || label === classificationFilter)
      .map((label) => ({
        meta: {
          key: label,
          label,
          badge: 'teal',
          icon: 'folder_special',
          description: 'กลุ่มที่ผู้ดูแลระบบกำหนดเอง',
        },
        rows: sorted.filter((row) => (row.groupLabel || row.classificationLabel || 'ไม่จัดกลุ่ม') === label),
      }));
  }, [sorted, classificationFilter]);

  const filtersActive = Boolean(search.trim() || classificationFilter || statusFilter || accessFilter || kindFilter);
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(filtersActive, () => {
    setSearch('');
    setClassificationFilter('');
    setStatusFilter('');
    setAccessFilter('');
    setKindFilter('');
    setGroupComposerOpen(false);
    setNewGroupName('');
  });

  const openCreate = (initialGroup = '') => {
    if (!canEdit) return;
    const requestedGroup = typeof initialGroup === 'string' ? initialGroup.trim() : '';
    const fallbackGroup = groupOptions.find((option) => option.value && option.value !== '__create__')?.value || MOCK_GROUPS[0];
    setDraft({ ...normalizeDraft(null), groupLabel: requestedGroup || fallbackGroup });
    setErrors({});
    setComposerKind(ORDER_SET_ITEM_KINDS[0]?.key || 'medication');
    setComposerValue('');
    setComposerLabel('');
  };

  const handleGroupFilterChange = (value) => {
    if (value === '__create__') {
      setClassificationFilter('');
      setGroupComposerOpen(true);
      setNewGroupName('');
      return;
    }
    setGroupComposerOpen(false);
    setClassificationFilter(value);
  };

  const createGroupFromFilter = () => {
    const label = newGroupName.trim();
    if (!label || !canEdit) return;
    setClassificationFilter('');
    setGroupComposerOpen(false);
    setNewGroupName('');
    openCreate(label);
  };

  const openEdit = (row) => {
    if (!canEdit) return;
    setDraft(normalizeDraft(row));
    setErrors({});
    setComposerKind(ORDER_SET_ITEM_KINDS[0]?.key || 'medication');
    setComposerValue('');
    setComposerLabel('');
  };

  const closeEditor = () => {
    setDraft(null);
    setErrors({});
  };

  const patchDraft = (patch) => setDraft((current) => ({ ...current, ...patch }));
  const patchAccess = (patch) => setDraft((current) => ({
    ...current,
    access: { ...current.access, ...patch },
  }));
  const patchItem = (id, patch) => setDraft((current) => ({
    ...current,
    items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  }));
  const removeItem = (id) => setDraft((current) => ({
    ...current,
    items: current.items.filter((item) => item.id !== id),
  }));

  const addItem = () => {
    if (!canEdit || !draft) return;
    const options = catalogOptions(composerKind);
    const selected = options.find((option) => option.value === composerValue);
    const label = isFreeTextKind(composerKind) ? composerLabel.trim() : selected?.storedLabel;
    if (!label) return;
    const base = blankOrderSetItem(composerKind);
    const item = {
      ...base,
      kind: composerKind,
      refId: selected?.value || '',
      label,
      quantity: composerKind === 'medicalSupply' ? 1 : (base.quantity || ''),
      unit: selected?.unit || base.unit || '',
      ...(composerKind === 'medication' ? {
        dosePerTake: selected?.administrationDefaults?.dosePerTake || base.dosePerTake,
        frequency: selected?.administrationDefaults?.frequency || base.frequency,
        when: selected?.administrationDefaults?.when || base.when,
        days: selected?.administrationDefaults?.days || base.days,
        note: selected?.administrationDefaults?.note || base.note,
      } : {}),
    };
    const duplicate = draft.items.find((existing) => itemIdentity(existing) === itemIdentity(item));
    if (duplicate) {
      const message = `รายการ “${label}” อยู่ในชุดคำสั่งนี้แล้ว`;
      setErrors((current) => ({ ...current, items: message }));
      setToast({ id: Date.now(), variant: 'error', message });
      return;
    }
    setDraft((current) => ({ ...current, items: [...current.items, item] }));
    setComposerValue('');
    setComposerLabel('');
    setErrors((current) => {
      const next = { ...current };
      delete next.items;
      return next;
    });
  };

  const validate = () => {
    const next = {};
    if (!draft.name.trim()) next.name = 'กรุณาระบุชื่อชุดคำสั่ง';
    if (!String(draft.groupLabel || '').trim()) next.groupLabel = 'กรุณาเลือก Group';
    if (!draft.items.length) {
      next.items = 'กรุณาเพิ่มรายการสั่งการรักษาอย่างน้อย 1 รายการ';
    } else {
      const duplicate = findDuplicateItem(draft.items);
      if (duplicate) next.items = `พบรายการ “${duplicate.label || 'ไม่ระบุชื่อ'}” ซ้ำในชุดคำสั่ง กรุณาลบรายการซ้ำก่อนบันทึก`;
    }
    if (draft.access.mode === 'restricted'
      && !draft.access.roles.length
      && !draft.access.departments.length
      && !draft.access.users.length) {
      next.access = 'กรุณาเลือกบทบาท แผนก หรือผู้ใช้งานอย่างน้อย 1 รายการ';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveDraft = () => {
    if (!canEdit || !draft) return;
    if (!validate()) return;
    const saved = upsertOrderSet({
      ...draft,
      name: draft.name.trim(),
      groupLabel: String(draft.groupLabel || '').trim(),
      description: draft.description.trim(),
      access: {
        ...draft.access,
        roles: [...draft.access.roles],
        departments: [...draft.access.departments],
        users: [...draft.access.users],
      },
      items: draft.items.map((item) => ({ ...item })),
    });
    refresh();
    setToast({
      id: Date.now(),
      variant: saved ? 'success' : 'error',
      message: saved ? `บันทึกชุดคำสั่ง “${saved.name}” แล้ว` : 'ไม่สามารถบันทึกชุดคำสั่งได้',
    });
    if (saved) closeEditor();
  };

  const toggleActive = (row) => {
    if (!canEdit) return;
    setOrderSetActive(row.id, row.active === false);
    refresh();
    setToast({
      id: Date.now(),
      variant: 'success',
      message: `${row.active === false ? 'เปิด' : 'ปิด'}ใช้งานชุดคำสั่ง “${row.name}” แล้ว`,
    });
  };

  const handleSort = (key) => setSortConfig((current) => (
    current.key === key
      ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }
  ));

  const columns = useMemo(() => [
    {
      key: 'name', header: 'ชื่อชุดคำสั่ง', sortable: true,
      render: (row) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={BODY}>{row.name}</span>
          <span style={MUTED}>{row.description || 'ไม่มีคำอธิบาย'}</span>
        </div>
      ),
    },
    {
      key: 'classificationLabel', header: 'กลุ่ม', sortable: true,
      render: (row) => <span style={BODY}>{row.groupLabel || row.classificationLabel || row.conditionLabel || '—'}</span>,
    },
    {
      key: 'items', header: 'รายการในชุด', sortable: false,
      render: (row) => (
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          {kindCounts(row.items).map((kind) => (
            <ColorfulBadge key={kind.key} style={kind.badge || 'grey'} size='small' width='hug'>
              {kind.label} {kind.count}
            </ColorfulBadge>
          ))}
        </div>
      ),
    },
    {
      key: 'access', header: 'ผู้เข้าถึง', sortable: true,
      render: (row) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <ColorfulBadge style={accessModeOf(row) === 'all' ? 'green' : 'blue'} size='small' width='hug'>
            {accessModeOf(row) === 'all' ? 'ทุกคน' : 'จำกัดสิทธิ์'}
          </ColorfulBadge>
          <span style={MUTED}>{accessSummary(row, true)}</span>
        </div>
      ),
    },
    {
      key: 'updatedAt', header: 'แก้ไขล่าสุด', sortable: true,
      render: (row) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={BODY}>{row.updatedAt || row.createdAt || '—'}</span>
          <span style={MUTED}>{row.updatedBy || row.owner || '—'}</span>
        </div>
      ),
    },
    {
      key: 'active', header: 'สถานะ', sortable: true,
      render: (row) => (
        <span
          className='inline-flex items-center'
          style={{ gap: 'var(--dim-space-200, 8px)' }}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          role='presentation'
        >
          <GuardedAction allowed={canEdit} reason='ต้องมีสิทธิ์แก้ไขการตั้งค่าระบบจึงจะเปลี่ยนสถานะชุดคำสั่งได้'>
            <Switch checked={row.active !== false} onChange={() => toggleActive(row)} aria-label={`สถานะ ${row.name}`} />
          </GuardedAction>
          <StatusBadge style={row.active !== false ? 'success' : 'neutral'} size='small'>
            {row.active !== false ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
          </StatusBadge>
        </span>
      ),
    },
    {
      key: 'actions', header: 'การดำเนินการ', sortable: false,
      render: (row) => (
        <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} role='presentation'>
          <GuardedAction allowed={canEdit} reason='ต้องมีสิทธิ์แก้ไขการตั้งค่าระบบจึงจะแก้ไขชุดคำสั่งได้'>
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={() => openEdit(row)}>
              แก้ไข
            </NeutralSubdueButton>
          </GuardedAction>
        </span>
      ),
    },
  ], [canEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const composerOptions = catalogOptions(composerKind);
  const composerValid = isFreeTextKind(composerKind) ? composerLabel.trim().length > 0 : Boolean(composerValue);

  return (
    <>
      <QueuePageShell
        activeKey='system-order-sets'
        sidebarItems={SYSTEM_NAV}
        sidebarFallbackKey='system-order-sets'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        title='ชุดคำสั่งการรักษา'
        actions={(
          <GuardedAction allowed={canEdit} reason='ต้องมีสิทธิ์แก้ไขการตั้งค่าระบบจึงจะสร้างชุดคำสั่งได้'>
            <BrandButton variant='fill' size='md' leadingIcon='add' onClick={openCreate}>
              สร้างชุดคำสั่ง
            </BrandButton>
          </GuardedAction>
        )}
      >
        {!canView ? (
          <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600, 24px)' }}>
            <ModuleCard>
              <EmptyState
                icon='lock'
                title='ไม่มีสิทธิ์เข้าถึงชุดคำสั่งการรักษากลาง'
                subtitle='บัญชีผู้ใช้ปัจจุบันยังไม่ได้รับสิทธิ์ดูการตั้งค่าระบบ กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ system.settings'
                action={(
                  <BrandButton variant='outline' size='md' leadingIcon='arrow_back' onClick={() => history.push('/admin')}>
                    กลับไปหน้าจัดการระบบ
                  </BrandButton>
                )}
              />
            </ModuleCard>
          </div>
        ) : (
          <div
            className='flex flex-col flex-1 min-w-0'
            style={{ padding: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-400, 16px)' }}
          >
          {!canEdit ? <ReadOnlyNotice feature='ชุดคำสั่งการรักษากลาง' /> : null}
          <section className='flex flex-col w-full' style={{ ...CARD, padding: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-500, 20px)' }}>
            <SectionHeading
              icon='order_approve'
              title='ค้นหาและจัดกลุ่มชุดคำสั่ง'
              description='สร้าง Group เองได้ และเลือกผสมรายการสั่งการรักษาได้ทุกประเภท'
              trailing={<StatusBadge style='info' size='small'>{filtered.length} ชุด</StatusBadge>}
            />
            <div className='flex justify-center w-full'>
              <PrimarySearch
                value={search}
                onChange={setSearch}
                onSubmit={setSearch}
                placeholder='ค้นหาชื่อชุด อาการ โรค หรือรายการสั่งการรักษา'
                width='var(--dim-size-2900, 640px)'
              />
            </div>
            <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <FilterDropdown prefix='Group:' options={groupOptions} value={classificationFilter} onChange={handleGroupFilterChange} placeholder='ทั้งหมด' />
              <FilterDropdown prefix='ประเภทรายการ:' options={kindOptions} value={kindFilter} onChange={setKindFilter} placeholder='ทั้งหมด' />
              <FilterDropdown prefix='ผู้เข้าถึง:' options={ACCESS_OPTIONS} value={accessFilter} onChange={setAccessFilter} placeholder='ทั้งหมด' />
              <FilterDropdown prefix='สถานะ:' options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} placeholder='ทั้งหมด' />
              <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
            </div>
            {groupComposerOpen ? (
              <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <div style={{ flex: '1 1 var(--dim-size-2500, 320px)' }}>
                  <InputField
                    label='ชื่อ Group ใหม่'
                    value={newGroupName}
                    onChange={setNewGroupName}
                    showLeadingIcon={false}
                    placeholder='เช่น โรคทางเดินอาหาร'
                  />
                </div>
                <BrandButton variant='fill' size='md' leadingIcon='add' disabled={!newGroupName.trim() || !canEdit} onClick={createGroupFromFilter}>
                  สร้าง Group
                </BrandButton>
                <NeutralSubdueButton variant='outline' size='md' onClick={() => { setGroupComposerOpen(false); setNewGroupName(''); }}>
                  ยกเลิก
                </NeutralSubdueButton>
              </div>
            ) : null}
          </section>

          <SmoothFilterResults opaque={resultsOpaque}>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              {filtered.length === 0 ? (
                <section className='flex flex-col items-center justify-center w-full' style={{ ...CARD, padding: 'var(--dim-space-1200, 48px)', gap: 'var(--dim-space-300, 12px)' }}>
                  <Icon name='search_off' size='var(--dim-size-600, 32px)' style={{ color: 'var(--text-content-tertiary, #858C92)' }} />
                  <span style={TITLE}>ไม่พบชุดคำสั่งที่ตรงกับตัวกรอง</span>
                  <span style={MUTED}>ลองลดคำค้นหาหรือล้างตัวกรอง แล้วค้นหาอีกครั้ง</span>
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='filter_alt_off' onClick={clearFilters}>
                    ล้างตัวกรอง
                  </NeutralSubdueButton>
                </section>
              ) : grouped.map((group) => (
                <section key={group.meta.key} className='flex flex-col w-full' style={{ ...CARD, padding: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-400, 16px)' }}>
                  <SectionHeading
                    icon={group.meta.icon}
                    title={`Group: ${group.meta.label}`}
                    description={group.meta.description}
                    trailing={<ColorfulBadge style={group.meta.badge} size='default' width='hug'>{group.rows.length} ชุด</ColorfulBadge>}
                  />
                  {group.rows.length ? (
                    <Table
                      columns={columns}
                      rows={group.rows}
                      rowKey={(row) => row.id}
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      onRowClick={canEdit ? openEdit : undefined}
                      stickyColCount={1}
                      stickyRightColCount={1}
                      emptyMessage={`ยังไม่มีชุดคำสั่งใน Group นี้`}
                    />
                  ) : (
                    <div className='flex items-center justify-between flex-wrap' style={{ ...SUBCARD, padding: 'var(--dim-space-400, 16px)', gap: 'var(--dim-space-300, 12px)' }}>
                      <span style={MUTED}>ยังไม่มีชุดคำสั่งในกลุ่มนี้</span>
                      <GuardedAction allowed={canEdit} reason='ต้องมีสิทธิ์แก้ไขการตั้งค่าระบบจึงจะสร้างชุดคำสั่งได้'>
                        <BrandButton variant='outline' size='sm' leadingIcon='add' onClick={() => {
                          const next = normalizeDraft(null);
                          setDraft({ ...next, groupLabel: group.meta.label });
                          setErrors({});
                        }}>
                          เพิ่มชุดคำสั่งใน Group นี้
                        </BrandButton>
                      </GuardedAction>
                    </div>
                  )}
                </section>
              ))}
            </div>
          </SmoothFilterResults>
          </div>
        )}
      </QueuePageShell>

      <Popup
        open={!!draft}
        onClose={closeEditor}
        size='extraLarge'
        title={draft?.id ? 'แก้ไขชุดคำสั่งการรักษา' : 'สร้างชุดคำสั่งการรักษา'}
        subtitle='กำหนดรายการมาตรฐานและผู้ให้บริการที่สามารถนำชุดนี้ไปใช้ใน CPOE'
        headerStyle={{
          position: 'sticky',
          top: 0,
          zIndex: 'var(--sm-z-modal-popover, 1450)',
          borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
        }}
        footerStyle={{
          paddingTop: 'var(--dim-space-400, 16px)',
          paddingBottom: 'var(--dim-space-400, 16px)',
        }}
        tertiaryAction={{ label: 'ยกเลิก', onClick: closeEditor }}
        primaryAction={{ label: draft?.id ? 'บันทึกการแก้ไข' : 'สร้างชุดคำสั่ง', onClick: saveDraft, disabled: !canEdit }}
      >
        {draft ? (
          <div className='flex flex-wrap items-start w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
            <div className='flex flex-col min-w-0' style={{ flex: '3 1 var(--dim-size-2900, 640px)', gap: 'var(--dim-space-400, 16px)' }}>
              {Object.keys(errors).length ? (
                <Alert
                  type='error'
                  title='ยังบันทึกชุดคำสั่งไม่ได้'
                  subtext='กรุณาตรวจสอบข้อมูลที่มีข้อความแจ้งเตือน แล้วบันทึกอีกครั้ง'
                />
              ) : null}

              <section className='flex flex-col w-full' style={{ ...SUBCARD, padding: 'var(--dim-space-400, 16px)', gap: 'var(--dim-space-400, 16px)' }}>
                <SectionHeading icon='clinical_notes' title='ข้อมูลชุดคำสั่งและรายการสั่งการรักษา' description='กำหนดข้อมูลของชุด แล้วเพิ่มรายการที่จะถูกใช้ร่วมกันใน CPOE' />
                <div className='grid w-full' style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignItems: 'start', gap: 'var(--dim-space-400, 16px)' }}>
                  <div className='min-w-0' style={{ gridColumn: '1 / -1' }}>
                    <InputField
                      label='ชื่อชุดคำสั่ง / ชื่อโรคหรืออาการ'
                      required
                      value={draft.name}
                      onChange={(value) => patchDraft({ name: value })}
                      showLeadingIcon={false}
                      placeholder='เช่น ชุดประเมินเบาหวานชนิดที่ 2 หรือชุดปวดท้องเฉียบพลัน'
                      error={errors.name}
                    />
                  </div>
                  <div className='flex flex-col min-w-0' style={{ gridColumn: '1 / -1', gap: 'var(--dim-space-200, 8px)' }}>
                    <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                      <span style={BODY}>Group <span style={{ color: 'var(--text-negative-default, #D92D20)' }}>*</span></span>
                      <span style={MUTED}>เลือกจาก Group ที่มีอยู่ หากต้องการสร้างใหม่ให้ใช้ FilterTag ด้านบน</span>
                    </div>
                    <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)', marginTop: 'var(--dim-space-200, 8px)' }}>
                      {quickGroupOptions.map((option) => (
                        <SelectableTag
                          key={option.value}
                          label={option.label}
                          selected={draft.groupLabel === option.value}
                          size='sm'
                          leadingGlyph='toggle'
                          onClick={() => patchDraft({ groupLabel: option.value })}
                        />
                      ))}
                    </div>
                    {errors.groupLabel ? <span style={{ ...MUTED, color: 'var(--text-negative-default, #D92D20)' }}>{errors.groupLabel}</span> : null}
                  </div>
                  <div className='min-w-0' style={{ gridColumn: '1 / -1' }}>
                    <SuggestibleTextarea
                      voice
                      label='คำอธิบายการใช้งาน'
                      rows={3}
                      value={draft.description}
                      onChange={(event) => patchDraft({ description: event.target.value })}
                      placeholder='อธิบายข้อบ่งใช้หรือเงื่อนไขสำคัญของชุดคำสั่งนี้'
                    />
                  </div>
                </div>
                <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <Switch checked={draft.active} onChange={(value) => patchDraft({ active: value })} aria-label='สถานะชุดคำสั่ง' />
                  <span style={BODY}>{draft.active ? 'เปิดใช้งานหลังบันทึก' : 'บันทึกไว้แบบปิดใช้งาน'}</span>
                </div>

                <div className='flex flex-col w-full' style={{ borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)', paddingTop: 'var(--dim-space-400, 16px)', gap: 'var(--dim-space-400, 16px)' }}>
                <SectionHeading icon='playlist_add' title='รายการสั่งการรักษา' description='หนึ่งชุดสามารถผสมยา เวชภัณฑ์มิใช่ยา แล็บ X-ray หัตถการ ปรึกษา และรายการอื่นได้' trailing={<StatusBadge style='info' size='small'>{draft.items.length} รายการ</StatusBadge>} />
                {errors.items ? <Alert type='error' title='ตรวจสอบรายการสั่งการรักษา' subtext={errors.items} /> : null}
                <SectionHeading icon='add_circle' title='เลือกว่าจะสั่งอะไร' description='เลือกประเภทและรายการจากคลัง แล้วกดเพิ่มรายการ' />
                <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  <div style={{ flex: '1 1 var(--dim-size-2200, 192px)' }}>
                    <Select
                      label='ประเภทรายการ'
                      value={composerKind}
                      onChange={(value) => { setComposerKind(value); setComposerValue(''); setComposerLabel(''); }}
                      options={ORDER_SET_ITEM_KINDS.map((item) => ({ value: item.key, label: item.label }))}
                      searchable={false}
                    />
                  </div>
                  <div style={{ flex: '3 1 var(--dim-size-2500, 320px)' }}>
                    {isFreeTextKind(composerKind) ? (
                      <InputField label='ชื่อรายการ' value={composerLabel} onChange={setComposerLabel} showLeadingIcon={false} placeholder='ระบุรายการสั่งการรักษาอื่นๆ' />
                    ) : (
                      <Select label='เลือกรายการ' value={composerValue} onChange={setComposerValue} options={composerOptions} placeholder='ค้นหาและเลือกรายการ' />
                    )}
                  </div>
                  <BrandButton variant='fill' size='md' leadingIcon='add' disabled={!composerValid} onClick={addItem}>
                    เพิ่มรายการ
                  </BrandButton>
                </div>
                <div className='flex flex-col w-full' style={{ borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)', paddingTop: 'var(--dim-space-400, 16px)', gap: 'var(--dim-space-400, 16px)' }}>
                  <SectionHeading icon='fact_check' title='รายการที่สั่งแล้ว' description='ตรวจสอบค่าเริ่มต้น แก้ไขหมายเหตุ หรือนำรายการออกจากชุด' />
                  {draft.items.length ? (
                    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                      {draft.items.map((item) => (
                        <OrderItemCard key={item.id} item={item} onPatch={(patch) => patchItem(item.id, patch)} onRemove={() => removeItem(item.id)} />
                      ))}
                    </div>
                  ) : (
                    <div className='flex flex-col items-center w-full' style={{ ...SUBCARD, padding: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-200, 8px)', background: 'var(--surface-neutral-quaternary, #F9FBFB)' }}>
                      <Icon name='playlist_add' size='var(--dim-size-500, 24px)' style={{ color: 'var(--text-content-tertiary, #858C92)' }} />
                      <span style={BODY}>ยังไม่มีรายการสั่งการรักษาในชุดนี้</span>
                      <span style={MUTED}>รายการที่เพิ่มจะแสดงในส่วนนี้</span>
                    </div>
                  )}
                </div>
                </div>
              </section>

              <section className='flex flex-col w-full' style={{ ...SUBCARD, padding: 'var(--dim-space-400, 16px)', gap: 'var(--dim-space-400, 16px)' }}>
                <SectionHeading icon='manage_accounts' title='สิทธิ์การเข้าถึง' description='กำหนดว่าใครจะมองเห็นและเลือกใช้ชุดคำสั่งนี้ได้' />
                {errors.access ? <Alert type='error' title='ยังไม่ได้กำหนดผู้เข้าถึง' subtext={errors.access} /> : null}
                <RadioGroup name='order-set-access-mode' options={ACCESS_MODES} value={draft.access.mode} onChange={(value) => patchAccess({ mode: value })} withDescription />
                {draft.access.mode === 'restricted' ? (
                  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                    <Select label='บทบาท' multiple selectAllLabel='เลือกทุกบทบาท' value={draft.access.roles} onChange={(value) => patchAccess({ roles: value })} options={roleOptions} placeholder='เลือกบทบาทที่เข้าถึงได้' />
                    <Select label='แผนก' multiple selectAllLabel='เลือกทุกแผนก' value={draft.access.departments} onChange={(value) => patchAccess({ departments: value })} options={departmentOptions} placeholder='เลือกแผนกที่เข้าถึงได้' />
                    <Select label='ผู้ใช้งานรายบุคคล' multiple selectAllLabel='เลือกผู้ใช้งานทั้งหมด' value={draft.access.users} onChange={(value) => patchAccess({ users: value })} options={userOptions} placeholder='ค้นหาและเลือกผู้ใช้งาน' />
                  </div>
                ) : null}
              </section>
            </div>
            <LivePreview draft={draft} />
          </div>
        ) : null}
      </Popup>

      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
