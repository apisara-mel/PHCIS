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
  bumpAccessControlVersion,
  latestVersion,
  formatVersion,
} from '@/data/accessControlStore';
import { readGroupPolicies } from '@/data/groupPolicyStore';
import { readDepartments } from '@/data/departmentStore';

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
  description,
  centerOpts,
  groupOpts,
  subBranchOpts,
  deptOpts,
  onCenter,
  onGroup,
  onSubBranch,
  onDepartment,
  onDescription,
}) {
  /* ไม่มีคอลัมน์ "ตำแหน่ง" — บทบาทไม่ผูกกับตำแหน่ง ตำแหน่งกำหนดตอนเพิ่มบุคลากร */
  const headers = [
    { title: 'ศูนย์บริการ', width: ROLE_COL_W.field, sort: true },
    { title: 'Group Policy', width: ROLE_COL_W.field, sort: true },
    { title: 'สาขาย่อย', width: ROLE_COL_W.field, sort: true },
    { title: 'แผนก', width: ROLE_COL_W.field, sort: true },
    { title: 'คำอธิบาย', width: ROLE_COL_W.description, sort: false },
  ];

  return (
    <div className='w-full overflow-x-auto' style={TABLE_FRAME}>
      <div style={{ minWidth: ROLE_COL_W.field * 4 + ROLE_COL_W.description }}>
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

/* เวอร์ชันของแม่แบบ — ระบบใช้เวอร์ชันล่าสุดเสมอ ของเก่าเก็บไว้ย้อนดูได้.
   ตอนสร้างใหม่จึงเป็น v1 ส่วนตอนแก้จะบอกว่าบันทึกแล้วจะกลายเป็นเวอร์ชันอะไร. */
function VersionBadge({ current, next, isEdit, history = [] }) {
  return (
    <div
      className='flex flex-col'
      style={{
        flex: '1 1 220px',
        minWidth: 200,
        gap: 'var(--dim-space-100)',
        paddingTop: 'var(--dim-space-300)',
        paddingRight: 'var(--dim-space-400)',
        paddingBottom: 'var(--dim-space-300)',
        paddingLeft: 'var(--dim-space-400)',
        background: 'var(--surface-brandPrimary-quaternary)',
        border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        borderRadius: 'var(--dim-radius-300)',
      }}
    >
      <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
        เวอร์ชันแม่แบบ
      </span>
      <div className='flex items-baseline' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{ color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-lg)' }}>
          {formatVersion(isEdit ? next : current)}
        </span>
        <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
          {isEdit ? `บันทึกแล้วจะแทน ${formatVersion(current)}` : 'เวอร์ชันแรก'}
        </span>
      </div>
      {history.length ? (
        <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
          {`มีประวัติ ${history.length} เวอร์ชัน`}
        </span>
      ) : null}
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
              title='โมดูล'
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

  const [templateName, setTemplateName] = useState('');
  const [centerId, setCenterId] = useState('');
  const [groupPolicyId, setGroupPolicyId] = useState('');
  const [subBranchId, setSubBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState(defaultPermissions);
  const [saved, setSaved] = useState(false);

  const groupPolicies = useMemo(() => readGroupPolicies(), []);
  const departments = useMemo(() => readDepartments(), []);

  /* เวอร์ชันที่กำลังแก้อยู่: ของใหม่เริ่มที่ v1 · ของเดิมบันทึกทับแล้วเดินขึ้นหนึ่งขั้น */
  const currentVersion = existing ? latestVersion(existing) : 1;
  const nextVersion = existing ? currentVersion + 1 : 1;

  useEffect(() => {
    if (!existing) return;
    setTemplateName(existing.templateName || '');
    setCenterId(existing.centerId || '');
    setGroupPolicyId(existing.groupPolicyId || '');
    setSubBranchId(existing.subBranchId || '');
    setDepartmentId(existing.departmentId || '');
    setDescription(existing.description || '');
    setPermissions({ ...defaultPermissions(), ...existing.permissions });
  }, [existing]);

  const selectedGroup = groupPolicies.find((g) => g.id === groupPolicyId);
  const subBranchOpts = useMemo(() => {
    const list = selectedGroup?.subBranches || [];
    return [{ value: '', label: 'เลือกสาขาย่อย' }, ...list.map((sb) => ({ value: sb.id, label: sb.name }))];
  }, [selectedGroup]);

  const centerOpts = [{ value: '', label: 'เลือกศูนย์บริการ' }, ...CENTER_OPTIONS];
  /* Group Policy ยังไม่ผูกก็บันทึกแม่แบบได้ — ค่าว่างจึงอ่านว่า "ยังไม่ผูก" */
  const groupOpts = [{ value: '', label: 'ยังไม่ผูก Group Policy' }, ...groupPolicies.map((g) => ({ value: g.id, label: g.name }))];
  const deptOpts = [{ value: '', label: 'เลือกแผนก' }, ...departments.map((d) => ({ value: d.id, label: d.name }))];

  const labelOf = (opts, value) => opts.find((o) => o.value === value)?.label || '';

  /* บันทึกได้เมื่อ **ตั้งชื่อแม่แบบ** แล้ว — ไม่บังคับ Group Policy / ตำแหน่ง */
  const nameValid = templateName.trim().length > 0;

  const setPerm = (key, level) => {
    setPermissions((p) => ({ ...p, [key]: level }));
  };

  const buildRecord = ({ bump }) => {
    const base = existing || createAccessControl({});
    const withEdits = {
      ...base,
      templateName: templateName.trim(),
      centerId,
      center: labelOf(centerOpts, centerId),
      groupPolicyId,
      groupPolicy: groupPolicyId ? labelOf(groupOpts, groupPolicyId) : '',
      subBranchId,
      subBranch: labelOf(subBranchOpts, subBranchId),
      departmentId,
      department: labelOf(deptOpts, departmentId),
      description: description.trim(),
      permissions,
      active: base.active !== false,
    };
    /* แก้ของเดิม = ออกเวอร์ชันใหม่ (เวอร์ชันเก่าเก็บลง history ให้ย้อนดูได้) */
    return bump && existing ? bumpAccessControlVersion(withEdits) : withEdits;
  };

  const handleSaveDraft = () => {
    upsertAccessControl(buildRecord({ bump: false }));
  };

  const handleSubmit = () => {
    if (!nameValid) return;
    upsertAccessControl(buildRecord({ bump: true }));
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
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            padding: 'var(--dim-space-600)',
            gap: 'var(--dim-space-300)',
            paddingBottom: 'var(--dim-space-900)',
          }}
        >
          {/* Card 0 — แม่แบบ + เวอร์ชัน. ตั้งชื่อแม่แบบก่อนเป็นอันดับแรก
              โดยยังไม่ต้องผูก Group Policy — ผูกทีหลังได้ในการ์ดถัดไป. */}
          <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
            <Topic
              hierarchy='primary'
              title='แม่แบบสิทธิการเข้าถึง'
              showSubText={false}
              leadingIcon='dashboard_customize'
              showBadge={false}
              showChevron={false}
              showSuccess={false}
            />
            <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <div style={{ flex: '2 1 320px', minWidth: 240 }}>
                <InputField
                  label='ชื่อแม่แบบ'
                  required
                  value={templateName}
                  onChange={setTemplateName}
                  placeholder='เช่น สิทธิแพทย์ตรวจโรคทั่วไป'
                  helperText='ชื่อนี้ใช้อ้างอิงแม่แบบตอนนำไปผูกกับ Group Policy หรือบุคลากร'
                />
              </div>
              <VersionBadge current={currentVersion} next={nextVersion} isEdit={!!existing} history={existing?.versionHistory} />
            </div>
          </section>

          {/* Card 1 — ข้อมูลบทบาท (Figma 15:30160 · card) */}
          <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-300)' }}>
            <Topic
              hierarchy='primary'
              title='ข้อมูลบทบาท'
              showSubText={false}
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
              description={description}
              centerOpts={centerOpts}
              groupOpts={groupOpts}
              subBranchOpts={subBranchOpts}
              deptOpts={deptOpts}
              onCenter={setCenterId}
              onGroup={(v) => { setGroupPolicyId(v); setSubBranchId(''); }}
              onSubBranch={setSubBranchId}
              onDepartment={setDepartmentId}
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
          button2Disabled={!nameValid}
          onButton2Click={handleSaveDraft}
          showButton1
          button1Label={isEdit ? `บันทึกเป็น ${formatVersion(nextVersion)}` : 'สร้างแม่แบบสิทธิ'}
          button1TrailingIcon='arrow_forward'
          button1Disabled={!nameValid}
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
