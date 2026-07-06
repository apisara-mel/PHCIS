import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import Topic from '@/components/topic/Topic';
import Footer from '@/components/layout/Footer';
import SuccessScreen from '@/components/layout/SuccessScreen';
import BrandButton from '@/components/button/BrandButton';
import Radio from '@/components/radio/Radio';
import { HeaderCell, DataCell, TableRow } from '@/components/table/Table';
import ASSESS_NAV from '@/pages/assess/assessNav';
import {
  PHCIS_MODULES,
  CONSENT_MODULES,
  PERM_NONE,
  PERM_VIEW,
  PERM_EDIT,
  CENTER_OPTIONS,
  defaultPermissions,
  findAccessControl,
  createAccessControl,
  upsertAccessControl,
} from '@/data/accessControlStore';
import { readGroupPolicies } from '@/data/groupPolicyStore';
import { readDepartments } from '@/data/departmentStore';
import { readPositions } from '@/data/positionStore';

/* PHCIS | Assess-control — Create / edit access rights (Figma 4D3nTx53 · 15:30160). */

const breadcrumb = ['สิทธิการเข้าถึง'];

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};

const TABLE_FRAME = {
  border: 'var(--dim-stroke-100) solid var(--border-table-default)',
  borderRadius: 'var(--dim-radius-400)',
  overflow: 'hidden',
};

const CELL_TEXT = {
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

const PERM_COL_W = { none: 128, view: 128, edit: 160 };
const ROLE_COL_W = { field: 224, description: 448 };

function PermRadioCell({ name, value, level, checked, onSelect }) {
  return (
    <div className='flex items-center justify-center w-full'>
      <Radio
        name={name}
        value={level}
        checked={checked}
        onChange={() => onSelect(level)}
        aria-label={value}
        showDescription={false}
        style={{ gap: 'var(--dim-space-0)' }}
      />
    </div>
  );
}

function RoleFieldsTable({
  centerId,
  groupPolicyId,
  subBranchId,
  departmentId,
  positionId,
  description,
  centerOpts,
  groupOpts,
  subBranchOpts,
  deptOpts,
  posOpts,
  onCenter,
  onGroup,
  onSubBranch,
  onDepartment,
  onPosition,
  onDescription,
}) {
  const headers = [
    { title: 'ศูนย์บริการ', width: ROLE_COL_W.field, sort: true },
    { title: 'Group Policy', width: ROLE_COL_W.field, sort: true },
    { title: 'สาขาย่อย', width: ROLE_COL_W.field, sort: true },
    { title: 'แผนก', width: ROLE_COL_W.field, sort: true },
    { title: 'ตำแหน่ง', width: ROLE_COL_W.field, sort: true },
    { title: 'คำอธิบาย', width: ROLE_COL_W.description, sort: false },
  ];

  return (
    <div className='w-full overflow-x-auto' style={TABLE_FRAME}>
      <div style={{ minWidth: ROLE_COL_W.field * 5 + ROLE_COL_W.description }}>
        <div className='flex w-full'>
          {headers.map(({ title, width, sort }, i) => (
            <HeaderCell
              key={title}
              title={title}
              showSubtext={false}
              showSorting={sort}
              style={{
                width,
                flexShrink: 0,
                ...(i === 0 ? { borderTopLeftRadius: 'var(--dim-radius-400)' } : {}),
                ...(i === headers.length - 1 ? { borderTopRightRadius: 'var(--dim-radius-400)' } : {}),
              }}
            />
          ))}
        </div>
        <TableRow>
          <DataCell {...DATA_CELL_OFF} style={{ width: ROLE_COL_W.field, flexShrink: 0 }}>
            <Select size='medium' showLabel={false} showHelperText={false} options={centerOpts} value={centerId} onChange={onCenter} />
          </DataCell>
          <DataCell {...DATA_CELL_OFF} style={{ width: ROLE_COL_W.field, flexShrink: 0 }}>
            <Select size='medium' showLabel={false} showHelperText={false} options={groupOpts} value={groupPolicyId} onChange={onGroup} />
          </DataCell>
          <DataCell {...DATA_CELL_OFF} style={{ width: ROLE_COL_W.field, flexShrink: 0 }}>
            <Select size='medium' showLabel={false} showHelperText={false} options={subBranchOpts} value={subBranchId} onChange={onSubBranch} />
          </DataCell>
          <DataCell {...DATA_CELL_OFF} style={{ width: ROLE_COL_W.field, flexShrink: 0 }}>
            <Select size='medium' showLabel={false} showHelperText={false} options={deptOpts} value={departmentId} onChange={onDepartment} />
          </DataCell>
          <DataCell {...DATA_CELL_OFF} style={{ width: ROLE_COL_W.field, flexShrink: 0 }}>
            <Select size='medium' showLabel={false} showHelperText={false} options={posOpts} value={positionId} onChange={onPosition} />
          </DataCell>
          <DataCell {...DATA_CELL_OFF} style={{ width: ROLE_COL_W.description, flexShrink: 0 }}>
            <InputField
              showLabel={false}
              showHelperText={false}
              showLeadingIcon={false}
              size='large'
              placeholder='เช่น เข้าถึงการรักษาระดับสูงสุด'
              value={description}
              onChange={onDescription}
            />
          </DataCell>
        </TableRow>
      </div>
    </div>
  );
}

function PermissionTable({ title, modules, permissions, onChange }) {
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <Topic
        hierarchy='tertiary'
        title={title}
        showSubText={false}
        showBadge={false}
        showChevron={false}
        showLeadingIcon={false}
        showSuccess={false}
      />
      <div className='w-full overflow-x-auto' style={TABLE_FRAME}>
        <div style={{ minWidth: 560 }}>
          <div className='flex w-full'>
            <HeaderCell
              title='ระบบ'
              showSubtext={false}
              style={{ flex: '1 1 0', minWidth: 0, borderTopLeftRadius: 'var(--dim-radius-400)' }}
            />
            <HeaderCell
              title='ไม่มีสิทธิ'
              showSubtext={false}
              align='center'
              style={{ width: PERM_COL_W.none, flexShrink: 0 }}
            />
            <HeaderCell
              title='มีสิทธิดู'
              showSubtext={false}
              align='center'
              style={{ width: PERM_COL_W.view, flexShrink: 0 }}
            />
            <HeaderCell
              title='มีสิทธิบันทึก'
              showSubtext={false}
              align='center'
              style={{ width: PERM_COL_W.edit, flexShrink: 0, borderTopRightRadius: 'var(--dim-radius-400)' }}
            />
          </div>
          {modules.map((mod, rowIdx) => {
            const current = permissions[mod.key] || PERM_NONE;
            const setLevel = (level) => onChange(mod.key, level);
            const isLast = rowIdx === modules.length - 1;
            const rowStyle = isLast ? { borderBottom: 'none' } : {};
            return (
              <TableRow key={mod.key}>
                <DataCell
                  {...DATA_CELL_OFF}
                  style={{ flex: '1 1 0', minWidth: 0, ...rowStyle }}
                >
                  <span style={CELL_TEXT}>{mod.label}</span>
                </DataCell>
                {[PERM_NONE, PERM_VIEW, PERM_EDIT].map((level) => (
                  <DataCell
                    key={level}
                    {...DATA_CELL_OFF}
                    style={{
                      width: PERM_COL_W[level === PERM_EDIT ? 'edit' : level === PERM_VIEW ? 'view' : 'none'],
                      flexShrink: 0,
                      justifyContent: 'center',
                      ...rowStyle,
                    }}
                  >
                    <PermRadioCell
                      name={mod.key}
                      value={mod.label}
                      level={level}
                      checked={current === level}
                      onSelect={setLevel}
                    />
                  </DataCell>
                ))}
              </TableRow>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AccessControlCreatePage() {
  const navigate = useHistory();
  const { id } = useParams();
  const isEdit = window.location.pathname.endsWith('/edit');
  const existing = useMemo(() => (id ? findAccessControl(id) : null), [id]);

  const [centerId, setCenterId] = useState('');
  const [groupPolicyId, setGroupPolicyId] = useState('');
  const [subBranchId, setSubBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState(defaultPermissions);
  const [saved, setSaved] = useState(false);

  const groupPolicies = useMemo(() => readGroupPolicies(), []);
  const departments = useMemo(() => readDepartments(), []);
  const positions = useMemo(() => readPositions(), []);

  useEffect(() => {
    if (!existing) return;
    setCenterId(existing.centerId || '');
    setGroupPolicyId(existing.groupPolicyId || '');
    setSubBranchId(existing.subBranchId || '');
    setDepartmentId(existing.departmentId || '');
    setPositionId(existing.positionId || '');
    setDescription(existing.description || '');
    setPermissions({ ...defaultPermissions(), ...existing.permissions });
  }, [existing]);

  const selectedGroup = groupPolicies.find((g) => g.id === groupPolicyId);
  const subBranchOpts = useMemo(() => {
    const list = selectedGroup?.subBranches || [];
    return [{ value: '', label: 'เลือกสาขาย่อย' }, ...list.map((sb) => ({ value: sb.id, label: sb.name }))];
  }, [selectedGroup]);

  const centerOpts = [{ value: '', label: 'เลือกศูนย์บริการ' }, ...CENTER_OPTIONS];
  const groupOpts = [{ value: '', label: 'เลือก Group Policy' }, ...groupPolicies.map((g) => ({ value: g.id, label: g.name }))];
  const deptOpts = [{ value: '', label: 'เลือกแผนก' }, ...departments.map((d) => ({ value: d.id, label: d.name }))];
  const posOpts = [{ value: '', label: 'เลือกตำแหน่ง' }, ...positions.map((p) => ({ value: p.id, label: p.name }))];

  const labelOf = (opts, value) => opts.find((o) => o.value === value)?.label || '';

  const roleComplete = !!(centerId && groupPolicyId && subBranchId && departmentId && positionId);

  const setPerm = (key, level) => {
    setPermissions((p) => ({ ...p, [key]: level }));
  };

  const buildRecord = () => {
    const base = existing || createAccessControl({});
    return {
      ...base,
      centerId,
      center: labelOf(centerOpts, centerId),
      groupPolicyId,
      groupPolicy: labelOf(groupOpts, groupPolicyId),
      subBranchId,
      subBranch: labelOf(subBranchOpts, subBranchId),
      departmentId,
      department: labelOf(deptOpts, departmentId),
      positionId,
      position: labelOf(posOpts, positionId),
      description: description.trim(),
      permissions,
      active: base.active !== false,
    };
  };

  const handleSaveDraft = () => {
    upsertAccessControl(buildRecord());
  };

  const handleSubmit = () => {
    if (!roleComplete) return;
    upsertAccessControl(buildRecord());
    if (isEdit) {
      navigate.push(`/assess/access-control/${id}`);
      return;
    }
    setSaved(true);
  };

  if (isEdit && id && !existing) {
    return (
      <QueuePageShell
        activeKey='assess-access-control'
        sidebarItems={ASSESS_NAV}
        sidebarFallbackKey='assess-access-control'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        title='สิทธิการเข้าถึง'
        onBack={() => navigate.push('/assess/access-control')}
      >
        <div style={{ padding: 'var(--dim-space-600)' }}>ไม่พบสิทธิการเข้าถึง</div>
      </QueuePageShell>
    );
  }

  return (
    <>
      <QueuePageShell
        activeKey='assess-access-control'
        sidebarItems={ASSESS_NAV}
        sidebarFallbackKey='assess-access-control'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        title='สิทธิการเข้าถึง'
        onBack={isEdit ? () => navigate.push(`/assess/access-control/${id}`) : () => navigate.push('/assess/access-control')}
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            padding: 'var(--dim-space-600)',
            gap: 'var(--dim-space-300)',
            paddingBottom: 'var(--dim-space-900)',
          }}
        >
          {/* Card 1 — ข้อมูลบทบาท (Figma 15:30160 · card) */}
          <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-300)' }}>
            <Topic
              hierarchy='primary'
              title='ข้อมูลบทบาท'
              subText='เลือกข้อมูลบทบาทเพื่อการเข้าถึงแต่ละระบบ'
              leadingIcon='face'
              showBadge={false}
              showChevron={false}
              showSuccess={false}
            />
            <RoleFieldsTable
              centerId={centerId}
              groupPolicyId={groupPolicyId}
              subBranchId={subBranchId}
              departmentId={departmentId}
              positionId={positionId}
              description={description}
              centerOpts={centerOpts}
              groupOpts={groupOpts}
              subBranchOpts={subBranchOpts}
              deptOpts={deptOpts}
              posOpts={posOpts}
              onCenter={setCenterId}
              onGroup={(v) => { setGroupPolicyId(v); setSubBranchId(''); }}
              onSubBranch={setSubBranchId}
              onDepartment={setDepartmentId}
              onPosition={setPositionId}
              onDescription={setDescription}
            />
          </section>

          {/* Card 2 — สิทธิ์เข้าถึงระบบ (Figma 15:30160 · card) */}
          <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-600)' }}>
            <Topic
              hierarchy='primary'
              title='สิทธิ์เข้าถึงระบบ'
              subText='เลือกระดับการเข้าถึงของแต่ละระบบ'
              leadingIcon='settings'
              showBadge={false}
              showChevron={false}
              showSuccess={false}
            />
            <PermissionTable
              title='ระบบ PHCIS'
              modules={PHCIS_MODULES}
              permissions={permissions}
              onChange={setPerm}
            />
            <PermissionTable
              title='ระบบจัดการความยินยอม'
              modules={CONSENT_MODULES}
              permissions={permissions}
              onChange={setPerm}
            />
          </section>
        </div>

        <Footer
          type='with BTN'
          sticky
          showButton3
          button3Label='ยกเลิก'
          onButton3Click={() => navigate.push('/assess/access-control')}
          showButton2
          button2Label='บันทึกร่าง'
          button2Icon='save'
          button2Disabled={!roleComplete}
          onButton2Click={handleSaveDraft}
          showButton1
          button1Label={isEdit ? 'บันทึก' : 'สร้างสิทธิการเข้าถึง'}
          button1TrailingIcon='arrow_forward'
          button1Disabled={!roleComplete}
          onButton1Click={handleSubmit}
        />
      </QueuePageShell>

      {saved ? (
        <SuccessScreen
          title={<>คุณสร้างสิทธิการเข้าถึงใหม่<br />สำเร็จ</>}
          buttonLabel='เข้าสู่หน้าสิทธิการเข้าถึง'
          onDone={() => navigate.push('/assess/access-control')}
        />
      ) : null}
    </>
  );
}
