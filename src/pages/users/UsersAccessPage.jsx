import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Icon from '@/components/icons/Icon';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  USERS,
  ROLES,
  DEPARTMENTS,
  ROLE_PALETTE,
  getRole,
  getSubRole,
  getDepartment,
  countAccess,
} from '@/data/usersAccess';

const breadcrumb = ['ผู้ใช้และสิทธิ์การเข้าถึง'];

/* Filter dropdown — same visual as the OPD queue page filter chips:
   small inline pill with leading icon, value, chevron. Token-driven so
   the brand swap retints automatically. */
const FilterSelect = ({ icon, label, value, options, onChange }) => (
  <label
    className='inline-flex items-center'
    style={{
      gap: 'var(--dim-space-200)',
      height: 36,
      paddingLeft: 'var(--dim-space-300)',
      paddingRight: 'var(--dim-space-200)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-input-default)',
      border: 'var(--dim-stroke-100) solid var(--border-input-default)',
      color: 'var(--text-content-secondary)',
      fontSize: 'var(--type-size-sm)',
      cursor: 'pointer',
    }}
  >
    <Icon name={icon} size={16} />
    <span className='text-ink-tertiary'>{label}:</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        appearance: 'none',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        color: 'var(--text-content-primary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        cursor: 'pointer',
        paddingRight: 'var(--dim-space-100)',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    <Icon name='chevron-down' size={14} />
  </label>
);

const RoleBadge = ({ roleKey }) => {
  const role = getRole(roleKey);
  if (!role) return null;
  const tone = ROLE_PALETTE[role.color] || ROLE_PALETTE.brand;
  return (
    <span
      className='inline-flex items-center'
      style={{
        gap: 'var(--dim-space-150)',
        height: 24,
        paddingLeft: 'var(--dim-space-200)',
        paddingRight: 10,
        borderRadius: 'var(--dim-radius-full)',
        background: tone.surface,
        color: tone.text,
        fontFamily: 'var(--type-family-body)',
        fontWeight: 'var(--type-weight-medium)',
        fontSize: 'var(--type-size-xs)',
      }}
    >
      <Icon name={role.icon} size={14} />
      {role.label}
    </span>
  );
};

const DepartmentChips = ({ keys = [] }) => {
  if (!keys.length) {
    return <span className='text-xs text-ink-tertiary'>—</span>;
  }
  const visible = keys.slice(0, 2);
  const overflow = keys.length - visible.length;
  return (
    <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-150)' }}>
      {visible.map((k) => {
        const dep = getDepartment(k);
        return (
          <span
            key={k}
            className='inline-flex items-center'
            style={{
              height: 22,
              paddingLeft: 'var(--dim-space-200)',
              paddingRight: 'var(--dim-space-200)',
              borderRadius: 'var(--dim-radius-full)',
              background: 'var(--surface-card-100)',
              border: 'var(--dim-stroke-100) solid var(--border-card-default)',
              color: 'var(--text-content-secondary)',
              fontSize: 'var(--type-size-xs)',
            }}
          >
            {dep?.label || k}
          </span>
        );
      })}
      {overflow > 0 && (
        <span
          className='inline-flex items-center'
          style={{
            height: 22,
            paddingLeft: 'var(--dim-space-200)',
            paddingRight: 'var(--dim-space-200)',
            borderRadius: 'var(--dim-radius-full)',
            background: 'var(--surface-brandPrimary-quaternary)',
            color: 'var(--text-brandPrimary-default)',
            fontSize: 'var(--type-size-xs)',
            fontWeight: 'var(--type-weight-medium)',
          }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
};

/* Access summary — "view N · edit M" with coloured dots. */
const AccessSummary = ({ features }) => {
  const { view, edit, total } = countAccess(features);
  if (!total) return <span className='text-xs text-ink-tertiary'>ยังไม่ได้กำหนด</span>;
  return (
    <div className='flex items-center text-xs text-ink-secondary' style={{ gap: 'var(--dim-space-300)' }}>
      <span className='inline-flex items-center gap-1'>
        <span style={{
          width: 8, height: 8, borderRadius: 'var(--dim-radius-full)',
          background: 'var(--text-colorfulbadge-blue)',
        }} />
        ดูได้ {view}
      </span>
      <span className='inline-flex items-center gap-1'>
        <span style={{
          width: 8, height: 8, borderRadius: 'var(--dim-radius-full)',
          background: 'var(--text-brandPrimary-default)',
        }} />
        แก้ไขได้ {edit}
      </span>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const isActive = status === 'active';
  return (
    <span
      className='inline-flex items-center'
      style={{
        gap: 'var(--dim-space-150)',
        height: 22,
        paddingLeft: 'var(--dim-space-200)',
        paddingRight: 10,
        borderRadius: 'var(--dim-radius-full)',
        background: isActive
          ? 'var(--surface-colorfulbadge-green, var(--surface-brandPrimary-quaternary))'
          : 'var(--surface-card-100)',
        color: isActive
          ? 'var(--text-colorfulbadge-green, var(--text-brandPrimary-default))'
          : 'var(--text-content-tertiary)',
        fontSize: 'var(--type-size-xs)',
        fontWeight: 'var(--type-weight-medium)',
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: 'var(--dim-radius-full)',
        background: 'currentColor',
      }} />
      {isActive ? 'ใช้งาน' : 'ปิดการใช้งาน'}
    </span>
  );
};

const UserRow = ({ user, onEdit }) => {
  const sub = getSubRole(user.role, user.subRole);
  return (
    <div
      role='button'
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => { if (e.key === 'Enter') onEdit(); }}
      className='flex items-center w-full cursor-pointer transition-shadow hover:shadow-cardHover'
      style={{
        gap: 'var(--dim-space-400)',
        padding: 'var(--dim-space-400)',
        background: 'var(--surface-card-100)',
        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
        borderRadius: 'var(--dim-radius-300)',
      }}
    >
      {/* Avatar */}
      <div
        className='shrink-0 rounded-full overflow-hidden'
        style={{ width: 44, height: 44, background: 'var(--surface-card-100)' }}
      >
        <img src={user.avatarUrl} alt='' className='w-full h-full object-cover' />
      </div>

      {/* Identity */}
      <div className='flex-1 min-w-0 flex flex-col'>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          <span className='text-sm font-bold text-ink truncate'>{user.name}</span>
          <StatusBadge status={user.status} />
        </div>
        <span className='text-xs text-ink-tertiary truncate'>{user.email}</span>
      </div>

      {/* Role + sub-role */}
      <div className='hidden md:flex flex-col shrink-0' style={{ gap: 'var(--dim-space-100)', minWidth: 200 }}>
        <RoleBadge roleKey={user.role} />
        {sub && (
          <span className='text-xs text-ink-tertiary'>{sub.label}</span>
        )}
      </div>

      {/* Departments */}
      <div className='hidden lg:flex flex-col shrink-0' style={{ gap: 'var(--dim-space-100)', minWidth: 200 }}>
        <span className='text-xs text-ink-tertiary'>แผนกที่ดูแล</span>
        <DepartmentChips keys={user.departments} />
      </div>

      {/* Access summary */}
      <div className='hidden lg:flex flex-col shrink-0' style={{ gap: 'var(--dim-space-100)', minWidth: 160 }}>
        <span className='text-xs text-ink-tertiary'>สิทธิ์การเข้าถึง</span>
        <AccessSummary features={user.features} />
      </div>

      {/* Edit action */}
      <div className='shrink-0 inline-flex items-center'>
        <button
          type='button'
          aria-label='แก้ไขผู้ใช้'
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className='inline-flex items-center justify-center'
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--dim-radius-full)',
            background: 'var(--surface-brandPrimary-quaternary)',
            color: 'var(--text-brandPrimary-default)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Icon name='edit' size={18} />
        </button>
      </div>
    </div>
  );
};

const UsersAccessPage = () => {
  const history = useHistory();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return USERS.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (deptFilter !== 'all' && !u.departments.includes(deptFilter)) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });
  }, [search, roleFilter, deptFilter, statusFilter]);

  const roleOptions = [
    { value: 'all', label: 'ทั้งหมด' },
    ...ROLES.map((r) => ({ value: r.key, label: r.label })),
  ];
  const deptOptions = [
    { value: 'all', label: 'ทุกแผนก' },
    ...DEPARTMENTS.map((d) => ({ value: d.key, label: d.label })),
  ];
  const statusOptions = [
    { value: 'all',      label: 'ทุกสถานะ' },
    { value: 'active',   label: 'ใช้งาน' },
    { value: 'inactive', label: 'ปิดการใช้งาน' },
  ];

  return (
    <div className='min-h-screen w-full flex bg-brand-50'>
      <Sidebar activeKey='users' />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header breadcrumb={breadcrumb} />
        <div className='p-3 md:p-6 flex-1 flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
          {/* Hero */}
          <section
            className='bg-surface-card rounded-card shadow-card flex flex-col md:flex-row md:items-center w-full'
            style={{ gap: 'var(--dim-space-400)', padding: 'var(--dim-space-600)' }}
          >
            <div
              className='shrink-0 inline-flex items-center justify-center'
              style={{
                width: 56,
                height: 56,
                borderRadius: 'var(--dim-radius-500)',
                background: 'var(--surface-brandPrimary-quaternary)',
                color: 'var(--text-brandPrimary-default)',
              }}
            >
              <Icon name='group' size={28} />
            </div>
            <div className='flex-1 min-w-0 flex flex-col gap-1'>
              <h1 className='text-lg font-bold text-ink'>ผู้ใช้และสิทธิ์การเข้าถึง</h1>
              <p className='text-sm text-ink-secondary'>
                ผู้ดูแลระบบกำหนดสิทธิ์การเข้าถึงของผู้ใช้งานตาม
                <strong className='mx-1 text-ink'>หน้าที่ · บทบาทย่อย · แผนก · ฟีเจอร์</strong>
                โดยแต่ละฟีเจอร์เลือกได้ว่าให้
                <span className='mx-1' style={{ color: 'var(--text-colorfulbadge-blue)' }}>ดูได้</span> หรือ
                <span className='ml-1' style={{ color: 'var(--text-brandPrimary-default)' }}>แก้ไขได้</span>
              </p>
              <p className='text-xs text-ink-tertiary'>
                ทั้งหมด <strong className='text-ink-secondary'>{USERS.length}</strong> คน
                ใช้งานอยู่ <strong className='text-ink-secondary'>
                  {USERS.filter((u) => u.status === 'active').length}
                </strong> คน
              </p>
            </div>
            <div className='shrink-0'>
              <BrandButton
                size='md'
                leadingIcon='person_add'
                onClick={() => history.push('/users/new')}
              >
                เพิ่มผู้ใช้ใหม่
              </BrandButton>
            </div>
          </section>

          {/* Filter bar */}
          <section
            className='bg-surface-card rounded-card shadow-card flex flex-col w-full'
            style={{ padding: 'var(--dim-space-500)', gap: 'var(--dim-space-300)' }}
          >
            <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <div
                className='flex items-center flex-1'
                style={{
                  minWidth: 240,
                  gap: 'var(--dim-space-200)',
                  height: 40,
                  paddingLeft: 'var(--dim-space-300)',
                  paddingRight: 'var(--dim-space-300)',
                  borderRadius: 'var(--dim-radius-200)',
                  background: 'var(--surface-input-default)',
                  border: 'var(--dim-stroke-100) solid var(--border-input-default)',
                }}
              >
                <Icon name='search' size={18} />
                <input
                  type='text'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='ค้นหาด้วยชื่อหรืออีเมล'
                  className='flex-1 bg-transparent border-none outline-none text-sm'
                  style={{ color: 'var(--text-content-primary)' }}
                />
                {search && (
                  <button
                    type='button'
                    onClick={() => setSearch('')}
                    aria-label='clear'
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-content-tertiary)' }}
                  >
                    <Icon name='close' size={16} />
                  </button>
                )}
              </div>
              <FilterSelect
                icon='badge'
                label='หน้าที่'
                value={roleFilter}
                options={roleOptions}
                onChange={setRoleFilter}
              />
              <FilterSelect
                icon='apartment'
                label='แผนก'
                value={deptFilter}
                options={deptOptions}
                onChange={setDeptFilter}
              />
              <FilterSelect
                icon='toggle_on'
                label='สถานะ'
                value={statusFilter}
                options={statusOptions}
                onChange={setStatusFilter}
              />
              {(search || roleFilter !== 'all' || deptFilter !== 'all' || statusFilter !== 'all') && (
                <NeutralSubdueButton
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setSearch('');
                    setRoleFilter('all');
                    setDeptFilter('all');
                    setStatusFilter('all');
                  }}
                >
                  ล้างตัวกรอง
                </NeutralSubdueButton>
              )}
            </div>
            <div className='text-xs text-ink-tertiary'>
              พบ <strong className='text-ink-secondary'>{filtered.length}</strong> รายการ จาก {USERS.length} คน
            </div>
          </section>

          {/* List */}
          <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            {filtered.length === 0 ? (
              <div
                className='bg-surface-card rounded-card shadow-card flex flex-col items-center text-center'
                style={{ padding: 'var(--dim-space-700)', gap: 'var(--dim-space-200)' }}
              >
                <Icon name='search_off' size={32} />
                <p className='text-sm text-ink-secondary'>ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข</p>
              </div>
            ) : (
              filtered.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  onEdit={() => history.push(`/users/${u.id}`)}
                />
              ))
            )}
          </section>
        </div>
        <Footer copyright='© 2026 ศูนย์การพยาบาลคุณภาพ ดินแดง กรุงเทพมหานคร' />
      </main>
    </div>
  );
};

export default UsersAccessPage;
