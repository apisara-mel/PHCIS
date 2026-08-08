import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Alert from '@/components/alert/Alert';
import CenterSwitcherPopup from '@/components/users/CenterSwitcherPopup';
import {
  USERS,
  ROLES,
  DEPARTMENTS,
  ROLE_PALETTE,
  getRole,
  getSubRole,
  getDepartment,
  countAccess,
  subscribeUsers,
} from '@/data/usersAccess';
import { unreadCount, pendingCriticalCount } from '@/data/userNotifications';
import {
  ActiveBadge,
  EmptyState,
  ModuleCard,
  PermissionGate,
  ReadOnlyNotice,
  SourceBadge,
  auditAdmin,
  centerLabel,
  getCurrentUser,
  useActiveCenter,
} from '@/pages/users/usersShared';

/* UsersAccessPage — TOR §1.17 หน้าแรกของ "ระบบงานผู้ดูแลระบบ".

   ต่อยอดจากหน้าเดิม (รายชื่อ + ตัวกรอง + สรุปสิทธิ์) โดยเพิ่ม 3 อย่างตาม TOR:
     1) แถบศูนย์ที่กำลังให้บริการ + ปุ่มสลับศูนย์            (1.17.5.4)
     2) คอลัมน์/ตัวกรอง attribute ครบตาม TOR + แหล่งบัญชี      (1.17.1.3)
     3) แถว nav ไปยัง 4 หน้าใหม่ของโมดูล พร้อม badge แจ้งเตือน

   รายการยาวใช้ Table + Pagination + sort ตาม column header (แบบ AncQueuePage). */

const breadcrumb = ['ระบบงานผู้ดูแลระบบ', 'ผู้ใช้และสิทธิ์การเข้าถึง'];
const SUMMARY_TITLE = 'ผู้ใช้และสิทธิ์การเข้าถึง';
const PAGE_SIZE = 20;

const FILTER_DEFAULTS = { role: 'all', dept: 'all', center: 'all', source: 'all' };

const MODULE_LINKS = [
  { key: 'directory',     label: 'Directory Service',   icon: 'hub',                 path: '/users/directory-service', desc: 'OIDC / SAML' },
  { key: 'routing',       label: 'Routing คำสั่งยา',     icon: 'alt_route',           path: '/users/drug-routing',      desc: 'คลินิก → ห้องยา' },
  { key: 'reports',       label: 'รายงานการใช้งาน',      icon: 'monitoring',          path: '/users/reports',           desc: 'ยอดผู้ใช้ + export' },
  { key: 'notifications', label: 'ศูนย์รวมการแจ้งเตือน', icon: 'notifications_active', path: '/users/notifications',    desc: 'รับส่งตัว · ค่าวิกฤต' },
];

const RoleCell = ({ user }) => {
  const role = getRole(user.role);
  const sub = getSubRole(user.role, user.subRole);
  if (!role) return <span>—</span>;
  const tone = ROLE_PALETTE[role.color] || ROLE_PALETTE.brand;
  return (
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span
        className='inline-flex items-center self-start'
        style={{
          gap: 'var(--dim-space-150, 6px)',
          height: 'var(--dim-size-500, 24px)',
          paddingLeft: 'var(--dim-space-200, 8px)',
          paddingRight: 'var(--dim-space-200, 8px)',
          borderRadius: 'var(--dim-radius-full)',
          background: tone.surface,
          color: tone.text,
          fontFamily: 'var(--type-family-body)',
          fontWeight: 'var(--type-weight-medium, 500)',
          fontSize: 'var(--type-size-xs, 12px)',
        }}
      >
        <Icon name={role.icon} size={14} />
        {role.label}
      </span>
      {sub ? (
        <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>
          {sub.label}
        </span>
      ) : null}
    </div>
  );
};

const UsersAccessPage = () => {
  const history = useHistory();
  const { center, label: centerName, setCenter } = useActiveCenter();
  const me = getCurrentUser();

  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [page, setPage] = useState(1);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => subscribeUsers(() => setTick((t) => t + 1)), []);
  useEffect(() => { setPage(1); }, [activeTab, searchQ, filters, center]);

  const setFilter = (key) => (value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const isAllDefault = Object.keys(FILTER_DEFAULTS).every((k) => filters[k] === FILTER_DEFAULTS[k]) && !searchQ;

  /* ── scope: รายชื่อผูกกับศูนย์ที่กำลังให้บริการ (คู่มือ MIS หน้า 1-4) ── */
  const scoped = useMemo(
    () => USERS.filter((u) => (u.centers || []).includes(center) || u.homeCenter === center),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [center, tick],
  );

  const tabs = useMemo(() => ([
    { key: 'all',      label: 'ทั้งหมด',              icon: 'group',        count: scoped.length },
    { key: 'active',   label: 'ใช้งานอยู่',           icon: 'check_circle', count: scoped.filter((u) => u.status === 'active').length },
    { key: 'inactive', label: 'ปิดการใช้งาน',         icon: 'block',        count: scoped.filter((u) => u.status !== 'active').length },
    { key: 'idp',      label: 'จาก Directory Service', icon: 'hub',         count: scoped.filter((u) => u.source === 'idp').length },
  ]), [scoped]);

  const summaryCards = useMemo(() => ([
    { key: 'total',   label: `ผู้ใช้ทั้งหมดที่ ${centerName}`, value: scoped.length, color: 'brand',       icon: 'group' },
    { key: 'active',  label: 'ใช้งานอยู่',                    value: scoped.filter((u) => u.status === 'active').length, color: 'positive', icon: 'check_circle' },
    { key: 'idp',     label: 'บัญชีจาก Directory Service',     value: scoped.filter((u) => u.source === 'idp').length,    color: 'info',     icon: 'hub' },
    { key: 'nolic',   label: 'บทบาทวิชาชีพที่ยังไม่มีรหัสวิชาชีพ', value: scoped.filter((u) => ['doctor', 'nurse', 'pharmacist', 'lab-tech'].includes(u.role) && !u.licenseNo).length, color: 'destructive', icon: 'badge' },
  ]), [scoped, centerName]);

  const filtered = useMemo(() => {
    let rows = scoped;
    if (activeTab === 'active') rows = rows.filter((u) => u.status === 'active');
    if (activeTab === 'inactive') rows = rows.filter((u) => u.status !== 'active');
    if (activeTab === 'idp') rows = rows.filter((u) => u.source === 'idp');
    if (filters.role !== 'all') rows = rows.filter((u) => u.role === filters.role);
    if (filters.dept !== 'all') rows = rows.filter((u) => (u.departments || []).includes(filters.dept));
    if (filters.center !== 'all') rows = rows.filter((u) => (u.centers || []).includes(filters.center));
    if (filters.source !== 'all') rows = rows.filter((u) => u.source === filters.source);
    const q = searchQ.trim().toLowerCase();
    if (q) {
      rows = rows.filter((u) => [u.name, u.email, u.licenseNo, u.departmentCode, u.phone]
        .some((f) => f && String(f).toLowerCase().includes(q)));
    }
    return rows;
  }, [scoped, activeTab, filters, searchQ]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return filtered;
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const pick = (u) => {
      switch (sortConfig.key) {
        case 'name': return u.name;
        case 'role': return getRole(u.role)?.label || '';
        case 'dept': return u.departmentCode || '';
        case 'center': return centerLabel(u.homeCenter);
        case 'source': return u.source;
        case 'status': return u.status;
        case 'access': return countAccess(u.features).total;
        case 'lastActive': return u.lastActive || '';
        default: return '';
      }
    };
    return [...filtered].sort((a, b) => {
      const av = pick(a);
      const bv = pick(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sign;
      return String(av).localeCompare(String(bv), 'th') * sign;
    });
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = sortedRows.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, sortedRows.length);

  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }
  ));

  const allowedCenters = me?.centers || [];
  const pendingWork = scoped.filter((u) => u.status === 'active').length;

  const confirmSwitch = (value) => {
    setCenter(value);
    setSwitcherOpen(false);
    auditAdmin(`สลับศูนย์ที่กำลังให้บริการเป็น ${centerLabel(value)}`);
    setToast(`เปลี่ยนขอบเขตข้อมูลเป็น ${centerLabel(value)} แล้ว`);
    setTimeout(() => setToast(''), 4000);
  };

  const unread = unreadCount(center);
  const pendingCritical = pendingCriticalCount(center);

  const columns = useMemo(() => ([
    {
      key: 'name', label: 'ชื่อ-นามสกุล / Email', flex: true, minWidth: 220,
      render: (u) => (
        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-250, 10px)' }}>
          <span
            className='shrink-0 rounded-full overflow-hidden inline-flex items-center justify-center'
            style={{ width: 'var(--dim-size-700, 36px)', height: 'var(--dim-size-700, 36px)', background: 'var(--surface-table-header)' }}
          >
            {u.avatarUrl ? <img src={u.avatarUrl} alt='' className='w-full h-full object-cover' /> : <Icon name='person' size={18} />}
          </span>
          <span className='flex flex-col min-w-0'>
            <span className='truncate' style={{ color: 'var(--text-content-primary)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)' }}>{u.name}</span>
            <span className='truncate' style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>{u.email}</span>
          </span>
        </div>
      ),
    },
    { key: 'role', label: 'บทบาท', render: (u) => <RoleCell user={u} /> },
    {
      key: 'dept', label: 'แผนก / Department-Code',
      render: (u) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span className='truncate' style={{ color: 'var(--text-content-primary)', fontSize: 'var(--type-size-xs, 12px)' }}>
            {(u.departments || []).map((d) => getDepartment(d)?.label || d).join(', ') || '—'}
          </span>
          <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)', fontFamily: 'var(--type-family-body)' }}>
            {u.departmentCode || 'ยังไม่ระบุรหัสแผนก'}
          </span>
        </div>
      ),
    },
    {
      key: 'license', label: 'รหัสวิชาชีพ', sortable: false,
      render: (u) => (u.licenseNo
        ? <span style={{ fontSize: 'var(--type-size-xs, 12px)' }}>{u.licenseNo}</span>
        : <ColorfulBadge style='grey' size='small'>ไม่ต้องใช้</ColorfulBadge>),
    },
    {
      key: 'center', label: 'ศูนย์ที่สังกัด',
      render: (u) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span className='truncate' style={{ fontSize: 'var(--type-size-xs, 12px)' }}>{centerLabel(u.homeCenter)}</span>
          {(u.centers || []).length > 1 ? (
            <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>
              สลับได้อีก {(u.centers || []).length - 1} ศูนย์
            </span>
          ) : null}
        </div>
      ),
    },
    { key: 'source', label: 'แหล่งบัญชี', render: (u) => <SourceBadge source={u.source} /> },
    {
      key: 'access', label: 'สิทธิ์การเข้าถึง', align: 'left',
      render: (u) => {
        const { view, edit, total } = countAccess(u.features);
        if (!total) return <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>ยังไม่ได้กำหนด</span>;
        return (
          <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs, 12px)' }}>
            ดูได้ {view} · แก้ไขได้ {edit}
          </span>
        );
      },
    },
    { key: 'status', label: 'สถานะ (Active)', render: (u) => <ActiveBadge active={u.status === 'active'} /> },
    { key: 'lastActive', label: 'เข้าใช้ล่าสุด', render: (u) => <span style={{ fontSize: 'var(--type-size-xs, 12px)' }}>{u.lastActive || '—'}</span> },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (u) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={(e) => { e.stopPropagation(); history.push(`/users/${u.id}`); }}>
            แก้ไข
          </BrandSubdueButton>
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='calendar_month' onClick={(e) => { e.stopPropagation(); history.push(`/users/${u.id}/schedule`); }}>
            ตารางเวร
          </NeutralSubdueButton>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [history]);

  const roleOptions = [{ value: 'all', label: 'ทุกบทบาท' }, ...ROLES.map((r) => ({ value: r.key, label: r.label }))];
  const deptOptions = [{ value: 'all', label: 'ทุกแผนก' }, ...DEPARTMENTS.map((d) => ({ value: d.key, label: d.label }))];
  const centerOptions = [
    { value: 'all', label: 'ทุกศูนย์ที่มีสิทธิ์' },
    ...allowedCenters.map((c) => ({ value: c, label: centerLabel(c) })),
  ];
  const sourceOptions = [
    { value: 'all',   label: 'ทุกแหล่งบัญชี' },
    { value: 'local', label: 'สร้างในระบบ (Local)' },
    { value: 'idp',   label: 'Directory Service (IdP)' },
  ];

  /* แถบศูนย์ที่กำลังให้บริการ — headerInfo ของ shell */
  const headerInfo = (
    <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      <span
        className='shrink-0 inline-flex items-center justify-center'
        style={{
          width: 'var(--dim-size-900, 44px)',
          height: 'var(--dim-size-900, 44px)',
          borderRadius: 'var(--dim-radius-400, 12px)',
          background: 'var(--surface-brandPrimary-quaternary)',
          color: 'var(--text-brandPrimary-default)',
        }}
      >
        <Icon name='location_on' size={22} />
      </span>
      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)' }}>
          ศูนย์บริการที่กำลังให้บริการ
        </span>
        <span style={{ color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-bold, 700)' }}>
          {centerName}
        </span>
        <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)' }}>
          คิว · รายงาน · การแจ้งเตือน · หัวกระดาษพิมพ์ ทั้งหมดอ้างอิงศูนย์นี้
        </span>
      </div>
      <div className='flex-1' />
      {allowedCenters.length <= 1 ? (
        <span
          className='inline-flex items-center'
          style={{
            gap: 'var(--dim-space-150, 6px)',
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            maxWidth: 260,
          }}
        >
          <Icon name='info' size={14} />
          บัญชีของคุณสังกัดศูนย์เดียว จึงสลับศูนย์ไม่ได้
        </span>
      ) : null}
      <NeutralSubdueButton
        variant='outline'
        size='md'
        leadingIcon='swap_horiz'
        disabled={allowedCenters.length <= 1}
        onClick={() => setSwitcherOpen(true)}
      >
        สลับศูนย์
      </NeutralSubdueButton>
    </div>
  );

  /* แถว nav ไป 4 หน้าใหม่ของโมดูล */
  const belowSummary = (
    <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)', paddingBottom: 'var(--dim-space-200, 8px)' }}>
      {MODULE_LINKS.map((l) => {
        const badge = l.key === 'notifications' ? unread : 0;
        return (
          <button
            key={l.key}
            type='button'
            onClick={() => history.push(l.path)}
            className='inline-flex items-center'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              height: 'var(--dim-size-800, 40px)',
              paddingLeft: 'var(--dim-space-300, 12px)',
              paddingRight: 'var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-full)',
              background: 'var(--surface-card-100)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-input-default)',
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              cursor: 'pointer',
            }}
          >
            <Icon name={l.icon} size={18} />
            {l.label}
            <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>{l.desc}</span>
            {badge > 0 ? <ColorfulBadge style='red' size='small'>{badge}</ColorfulBadge> : null}
          </button>
        );
      })}
    </div>
  );

  return (
    <QueuePageShell
      activeKey='users'
      breadcrumb={breadcrumb}
      title={SUMMARY_TITLE}
      actions={(
        <BrandButton size='md' leadingIcon='person_add' onClick={() => history.push('/users/new')}>
          เพิ่มผู้ใช้ใหม่
        </BrandButton>
      )}
      headerInfo={headerInfo}
      summaryCards={summaryCards}
      belowSummary={belowSummary}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <CenterSwitcherPopup
        open={switcherOpen}
        current={center}
        allowedCenters={allowedCenters}
        pendingWork={pendingWork}
        onConfirm={confirmSwitch}
        onClose={() => setSwitcherOpen(false)}
      />

      <div className='flex flex-col flex-1 min-w-0' style={{ paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-600, 24px)' }}>
        <PermissionGate feature='users.manage' featureLabel='จัดการผู้ใช้และสิทธิ์'>
          {(readOnly) => (
            <ModuleCard>
              {readOnly ? <ReadOnlyNotice feature='รายชื่อผู้ใช้' /> : null}
              {toast ? <Alert type='success' title='สลับศูนย์เรียบร้อย' subtext={toast} onClose={() => setToast('')} /> : null}
              {pendingCritical > 0 ? (
                <Alert
                  type='error'
                  title={`มีค่าวิกฤตค้างรับทราบ ${pendingCritical} รายการที่ ${centerName}`}
                  subtext='เปิดศูนย์รวมการแจ้งเตือนเพื่อรับทราบ — ค่าวิกฤตต้องถูกรับทราบพร้อมบันทึกผู้รับทราบและเวลา'
                  detail={(
                    <BrandSubdueButton variant='outline' size='sm' leadingIcon='notifications_active' onClick={() => history.push('/users/notifications')}>
                      ไปยังศูนย์รวมการแจ้งเตือน
                    </BrandSubdueButton>
                  )}
                />
              ) : null}

              <div className='w-full flex items-start justify-center'>
                <PrimarySearch
                  value={searchQ}
                  onChange={setSearchQ}
                  onSubmit={(label) => setSearchQ(label)}
                  placeholder='ค้นหาชื่อ / อีเมล / รหัสวิชาชีพ / Department-Code'
                  width={640}
                />
              </div>

              <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <OverflowFlexRow itemGap='var(--dim-space-200, 8px)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
                  <FilterTag value='ทั้งหมด' selected={isAllDefault} onClick={() => { setFilters(FILTER_DEFAULTS); setSearchQ(''); }} />
                  <FilterDropdown prefix='บทบาท:' options={roleOptions} value={filters.role} onChange={setFilter('role')} />
                  <FilterDropdown prefix='แผนก:' options={deptOptions} value={filters.dept} onChange={setFilter('dept')} />
                  <FilterDropdown prefix='ศูนย์:' options={centerOptions} value={filters.center} onChange={setFilter('center')} />
                  <FilterDropdown prefix='แหล่งบัญชี:' options={sourceOptions} value={filters.source} onChange={setFilter('source')} />
                </OverflowFlexRow>
              </div>

              {scoped.length === 0 ? (
                <EmptyState
                  icon='group_off'
                  title={`ยังไม่มีผู้ใช้ที่ ${centerName}`}
                  subtitle='ศูนย์นี้ยังไม่มีบัญชีผู้ใช้ในระบบ — เริ่มจากการสร้างบัญชีแรก หรือเชื่อม Directory Service เพื่อ sync บัญชีเข้ามา'
                  action={!readOnly ? (
                    <BrandButton size='md' leadingIcon='person_add' onClick={() => history.push('/users/new')}>สร้างผู้ใช้คนแรก</BrandButton>
                  ) : null}
                />
              ) : sortedRows.length === 0 ? (
                <EmptyState
                  icon='search_off'
                  title='ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข'
                  subtitle='ลองปรับคำค้นหรือล้างตัวกรองเพื่อดูรายชื่อทั้งหมดของศูนย์นี้'
                  action={(
                    <NeutralSubdueButton variant='outline' size='md' leadingIcon='filter_alt_off' onClick={() => { setFilters(FILTER_DEFAULTS); setSearchQ(''); }}>
                      ล้างตัวกรอง
                    </NeutralSubdueButton>
                  )}
                />
              ) : (
                <>
                  <Table
                    columns={columns}
                    rows={pageRows}
                    rowKey={(row) => row.id}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    onRowClick={(row) => history.push(`/users/${row.id}`)}
                    stickyColCount={1}
                    stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                    emptyMessage='ไม่พบรายการ'
                  />
                  <div
                    className='flex items-center w-full'
                    style={{
                      gap: 'var(--dim-space-200, 8px)',
                      position: 'sticky',
                      bottom: 'var(--dim-space-0, 0px)',
                      zIndex: 50,
                      background: 'var(--surface-card-100)',
                      paddingTop: 'var(--dim-space-200, 8px)',
                      borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
                    }}
                  >
                    <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
                      {`แสดง ${rangeStart}–${rangeEnd} จาก ${sortedRows.length} รายการ`}
                    </span>
                    <div className='flex-1' />
                    <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
                  </div>
                </>
              )}
            </ModuleCard>
          )}
        </PermissionGate>
      </div>
    </QueuePageShell>
  );
};

export default UsersAccessPage;
