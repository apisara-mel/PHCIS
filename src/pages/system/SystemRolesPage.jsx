import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import Icon from '@/components/icons/Icon';
import { ROLES, SUB_ROLES, DEPARTMENTS, getRole } from '@/data/usersAccess';
import SYSTEM_NAV from '@/pages/system/systemNav';

/* ระบบจัดการระบบ · บทบาทและสิทธิ์ (Figma 0EDfjwf1 · 0:1116).
   Roles grouped by Group Policy (role) → sub-roles, each with a permission
   summary + "แก้ไขสิทธิ์". Reuses ROLES / SUB_ROLES + shared components. */

const breadcrumb = ['จัดการระบบ', 'บทบาทและสิทธิ์'];
const roleTone = (color) => (color === 'brand' ? 'green' : color || 'grey');
const totalSubRoles = ROLES.reduce((n, r) => n + (SUB_ROLES[r.key] || []).length, 0);

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};
const META = { color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' };
const VAL = { color: 'var(--text-content-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' };

/* deterministic mock metrics per sub-role */
const metricFor = (i) => ({ people: 12 + (i * 7) % 50, used: 4 + (i % 5), reach: 5 + (i % 4) });

const MetaCol = ({ label, value }) => (
  <div className='flex flex-col items-start' style={{ minWidth: 70 }}>
    <span style={META}>{label}</span>
    <span style={VAL}>{value}</span>
  </div>
);

export default function SystemRolesPage() {
  const navigate = useHistory();
  const [filterRole, setFilterRole] = useState('');
  const [filterDept, setFilterDept] = useState('');

  const roleOptions = useMemo(() => [{ value: '', label: 'Group policy: ทั้งหมด' }, ...ROLES.map((r) => ({ value: r.key, label: r.label }))], []);
  const deptOptions = useMemo(() => [{ value: '', label: 'แผนก: ทั้งหมด' }, ...DEPARTMENTS.map((d) => ({ value: d.key, label: d.label }))], []);
  const isAll = !filterRole && !filterDept;
  const shownRoles = ROLES.filter((r) => !filterRole || r.key === filterRole);

  return (
    <QueuePageShell
      activeKey='system-roles'
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-roles'
      brandTitle='ระบบ PHCIS'
      breadcrumb={breadcrumb}
      title='บทบาทและสิทธิ์'
      actions={(
        <BrandButton variant='fill' size='md' leadingIcon='add' onClick={() => navigate.push('/admin/roles/new')}>สร้างบทบาทใหม่</BrandButton>
      )}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
            <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
              เพิ่ม จัดการบุคลากร บทบาท และสิทธิ์การเข้าถึงระบบ · บทบาททั้งหมด {totalSubRoles} รายการ
            </span>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)', marginTop: 'var(--dim-space-200)' }}>
              <FilterTag value='ทั้งหมด' selected={isAll} onClick={() => { setFilterRole(''); setFilterDept(''); }} />
              <FilterDropdown prefix='Group policy:' options={roleOptions} value={filterRole} onChange={setFilterRole} />
              <FilterDropdown prefix='แผนก:' options={deptOptions} value={filterDept} onChange={setFilterDept} />
            </div>
          </div>

          {/* grouped roles */}
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
            {shownRoles.map((role) => (
              <div key={role.key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                <span style={{ color: 'var(--text-content-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)' }}>{role.label}</span>
                {(SUB_ROLES[role.key] || []).map((sub, i) => {
                  const m = metricFor(i + role.key.length);
                  return (
                    <div key={sub.key} className='flex items-center justify-between flex-wrap w-full' style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-300)', border: 'var(--dim-stroke-100) solid var(--border-card-default)', borderRadius: 'var(--dim-radius-400)' }}>
                      <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-300)', flex: '2 1 220px' }}>
                        <span className='inline-flex items-center justify-center shrink-0' style={{ width: 36, height: 36, borderRadius: 'var(--dim-radius-200)', background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-brandPrimary-default)' }}>
                          <Icon name={role.icon} size={18} />
                        </span>
                        <div className='flex flex-col min-w-0'>
                          <span className='truncate' style={VAL}>สาขาย่อย: {sub.label}</span>
                          <span className='truncate' style={META}>สิทธิ์เริ่มต้นตามมาตรฐานวิชาชีพ</span>
                        </div>
                      </div>
                      <div className='flex items-center' style={{ gap: 'var(--dim-space-500)' }}>
                        <MetaCol label='จำนวน' value={`${m.people} คน`} />
                        <MetaCol label='มีสิทธิ์ใช้' value={`${m.used} ระบบ`} />
                        <MetaCol label='เข้าถึง' value={`${m.reach} ระบบ`} />
                        <NeutralSubdueButton leadingIcon='edit' size='sm' onClick={() => navigate.push('/admin/roles/new')}>แก้ไขสิทธิ์</NeutralSubdueButton>
                      </div>
                    </div>
                  );
                })}
                <BrandDashedAddButton onClick={() => navigate.push('/admin/roles/new')}>สร้างบทบาทใหม่และจัดการสิทธิ์</BrandDashedAddButton>
              </div>
            ))}
          </div>
        </section>
      </div>
    </QueuePageShell>
  );
}
