import React, { useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Icon from '@/components/icons/Icon';
import Table from '@/components/table/Table';
import ASSESS_NAV from '@/pages/assess/assessNav';
import {
  PHCIS_MODULES,
  CONSENT_MODULES,
  PERM_NONE,
  PERM_VIEW,
  PERM_EDIT,
  readAccessControls,
} from '@/data/accessControlStore';
import {
  findAssessUser,
  fullName,
  fullNameEn,
  primaryAssignment,
  uniqueCenterCount,
} from '@/data/assessUserStore';

/* PHCIS | Assess-control — Personnel detail (Figma 4D3nTx53 · 12:38968). */

const breadcrumb = ['บุคลากร'];

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};

const TEXT_CELL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const LABEL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};

const VALUE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

const PERM_BADGE = {
  [PERM_NONE]: { style: 'red', label: 'ไม่มีสิทธิ' },
  [PERM_VIEW]: { style: 'blue', label: 'มีสิทธิดู' },
  [PERM_EDIT]: { style: 'teal', label: 'มีสิทธิแก้ไข' },
};

const GENDER_LABEL = { male: 'ชาย', female: 'หญิง', other: 'อื่นๆ' };

function PermBadge({ level }) {
  const meta = PERM_BADGE[level] || PERM_BADGE[PERM_NONE];
  return (
    <ColorfulBadge style={meta.style} size='small' hierarchy='secondary' width='hug'>
      {meta.label}
    </ColorfulBadge>
  );
}

function InfoField({ label, value }) {
  return (
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100)', flex: '1 1 160px' }}>
      <span style={LABEL}>{label}</span>
      <span style={VALUE}>{value || '—'}</span>
    </div>
  );
}

function ReadonlyPermTable({ title, modules, permissions }) {
  const rows = modules.map((mod) => ({
    id: mod.key,
    label: mod.label,
    level: permissions[mod.key] || PERM_NONE,
  }));

  const columns = [
    {
      key: 'label',
      header: 'ระบบ',
      flex: 1,
      minWidth: 220,
      render: (row) => <span style={TEXT_CELL}>{row.label}</span>,
    },
    {
      key: 'level',
      header: 'สิทธิการเข้าถึง',
      render: (row) => <PermBadge level={row.level} />,
    },
  ];

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <span style={{
        color: 'var(--text-topic-tertiary-title)',
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-base)',
        fontWeight: 'var(--type-weight-regular)',
        lineHeight: 1.5,
      }}
      >
        {title}
      </span>
      <Table columns={columns} rows={rows} rowKey={(row) => row.id} />
    </div>
  );
}

/* จับคู่แม่แบบสิทธิ์กับ assignment ด้วย ศูนย์ + กิจกรรม + กิจกรรมย่อย + แผนก —
   ไม่มี positionId เพราะแม่แบบสิทธิ์ไม่ผูกกับตำแหน่ง (เดิมเทียบ positionId
   ซึ่งแม่แบบไม่มี field นี้ ทำให้จับคู่ไม่เจอเลย) */
function findAccessForAssignment(accessList, assignment) {
  if (!assignment) return null;
  return accessList.find((ac) => (
    ac.centerId === assignment.centerId
    && ac.activityId === assignment.activityId
    && ac.subActivityId === assignment.subActivityId
    && ac.departmentId === assignment.departmentId
  )) || null;
}

function countSystemsWithAccess(permissions) {
  if (!permissions) return 0;
  return Object.values(permissions).filter((p) => p === PERM_VIEW || p === PERM_EDIT).length;
}

export default function AssessUserDetailPage() {
  const navigate = useHistory();
  const { id } = useParams();
  const user = useMemo(() => findAssessUser(id), [id]);
  const accessList = useMemo(() => readAccessControls(), [id]);

  const primary = useMemo(() => (user ? primaryAssignment(user) : null), [user]);
  const matchedAccess = useMemo(() => findAccessForAssignment(accessList, primary), [accessList, primary]);
  const permissions = matchedAccess?.permissions || {};

  if (!user) {
    return (
      <QueuePageShell
        activeKey='system-staff'
        sidebarItems={ASSESS_NAV}
        sidebarFallbackKey='system-staff'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        title='บุคลากร'
        onBack={() => navigate.push('/assess/users')}
      >
        <div style={{ padding: 'var(--dim-space-600)' }}>ไม่พบบุคลากร</div>
      </QueuePageShell>
    );
  }

  const summaryCards = [
    {
      key: 'activity',
      icon: 'face',
      color: 'info',
      value: primary?.activity || '—',
      label: 'กิจกรรม',
    },
    {
      key: 'centers',
      icon: 'map',
      color: 'positive',
      value: String(uniqueCenterCount(user)),
      label: 'ศูนย์บริการทั้งหมด',
    },
    {
      key: 'primary-center',
      icon: 'location_on',
      color: 'positive',
      value: primary?.center || '—',
      label: 'ศูนย์บริการหลัก',
    },
    {
      key: 'systems',
      icon: 'settings',
      color: 'positive',
      value: String(countSystemsWithAccess(permissions)),
      label: 'ระบบที่มีสิทธิเข้าถึง',
    },
    {
      key: 'status',
      icon: 'clipboard_list',
      color: 'positive',
      value: user.active ? 'ใช้งานอยู่' : 'ปิดใช้งาน',
      label: 'สถานะบัญชี',
    },
  ];

  const assignmentColumns = [
    { key: 'order', header: 'ลำดับ', render: (_row, idx) => <span style={TEXT_CELL}>{idx + 1}</span> },
    { key: 'center', header: 'ศูนย์บริการ', render: (row) => <span style={TEXT_CELL}>{row.center}</span> },
    { key: 'activity', header: 'กิจกรรม', render: (row) => <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{row.activity}</ColorfulBadge> },
    { key: 'subActivity', header: 'กิจกรรมย่อย', render: (row) => <ColorfulBadge style='teal' size='small' hierarchy='secondary' width='hug'>{row.subActivity}</ColorfulBadge> },
    { key: 'department', header: 'แผนก', render: (row) => <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{row.department}</ColorfulBadge> },
    { key: 'position', header: 'ตำแหน่ง', render: (row) => <ColorfulBadge style='purple' size='small' hierarchy='secondary' width='hug'>{row.position}</ColorfulBadge> },
    {
      key: 'isPrimary',
      header: 'สาขาหลัก',
      render: (row) => (
        row.isPrimary
          ? <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug' showDot>สาขาหลัก</ColorfulBadge>
          : <span style={TEXT_CELL}>—</span>
      ),
    },
  ];

  return (
    <QueuePageShell
      activeKey='system-staff'
      sidebarItems={ASSESS_NAV}
      sidebarFallbackKey='system-staff'
      brandTitle='จัดการระบบ'
      breadcrumb={breadcrumb}
      title='บุคลากรและการเข้าถึง'
      onBack={() => navigate.push('/assess/users')}
      actions={(
        <NeutralSubdueButton leadingIcon='edit' size='sm' onClick={() => navigate.push(`/assess/users/${id}/edit`)}>
          แก้ไข
        </NeutralSubdueButton>
      )}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        <section
          className='w-full'
          style={{
            borderRadius: 'var(--dim-radius-500)',
            padding: 'var(--dim-space-600)',
            background: 'linear-gradient(135deg, var(--surface-brandPrimary-default, #007549) 0%, var(--surface-brandPrimary-hover, #00A86B) 100%)',
            color: 'var(--text-content-on-content, #FFFFFF)',
          }}
        >
          <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-600)' }}>
            <span
              className='inline-flex items-center justify-center shrink-0'
              style={{
                width: 'var(--dim-size-2000, 80px)',
                height: 'var(--dim-size-2000, 80px)',
                borderRadius: 'var(--dim-radius-full)',
                background: 'var(--surface-card-100)',
                color: 'var(--text-brandPrimary-default)',
              }}
            >
              <Icon name='person' size={40} />
            </span>
            <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
                <span style={{
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-lg)',
                  fontWeight: 'var(--type-weight-medium)',
                  lineHeight: 1.25,
                }}
                >
                  {fullName(user)}
                </span>
                <span style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  lineHeight: 1.5,
                  opacity: 0.9,
                }}
                >
                  {fullNameEn(user) || '—'}
                </span>
              </div>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-600)' }}>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
                  <span style={{ fontSize: 'var(--type-size-xs)', opacity: 0.85 }}>กิจกรรม</span>
                  <span style={{ fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm)' }}>{primary?.activity || '—'}</span>
                </div>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
                  <span style={{ fontSize: 'var(--type-size-xs)', opacity: 0.85 }}>กิจกรรมย่อย</span>
                  <span style={{ fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm)' }}>{primary?.subActivity || '—'}</span>
                </div>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
                  <span style={{ fontSize: 'var(--type-size-xs)', opacity: 0.85 }}>แผนก</span>
                  <span style={{ fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm)' }}>{primary?.department || '—'}</span>
                </div>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
                  <span style={{ fontSize: 'var(--type-size-xs)', opacity: 0.85 }}>รหัสวิชาชีพ</span>
                  <span style={{ fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm)' }}>{user.licenseNo || '—'}</span>
                </div>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
                  <span style={{ fontSize: 'var(--type-size-xs)', opacity: 0.85 }}>อีเมล</span>
                  <span style={{ fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm)' }}>{user.email || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
          {summaryCards.map((c) => (
            <SummaryCard key={c.key} card={c} variant='panel' />
          ))}
        </div>

        <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-500)' }}>
          <span style={{
            color: 'var(--text-topic-secondary-title)',
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-base)',
            lineHeight: 1.5,
          }}
          >
            ข้อมูลส่วนตัว
          </span>
          <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-600)' }}>
            <InfoField label='คำนำหน้า' value={user.title} />
            <InfoField label='ชื่อ' value={user.firstName} />
            <InfoField label='นามสกุล' value={user.lastName} />
            <InfoField label='Prefix' value={user.prefixEn} />
            <InfoField label='Name' value={user.nameEn} />
            <InfoField label='Surname' value={user.surnameEn} />
            <InfoField label='เพศกำเนิด' value={GENDER_LABEL[user.gender] || '—'} />
            <InfoField label='เลขบัตรประชาชน' value={user.nationalId} />
            <InfoField label='รหัสวิชาชีพ (ว.)' value={user.licenseNo} />
            <InfoField label='วันเดือนปีเกิด' value={user.birthDate} />
            <InfoField label='อายุ (ปี-เดือน-วัน)' value={user.age} />
            <InfoField label='เบอร์โทรศัพท์' value={user.phone} />
            <InfoField label='อีเมล' value={user.email} />
          </div>
        </section>

        <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          <span style={{
            color: 'var(--text-topic-secondary-title)',
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-base)',
            lineHeight: 1.5,
          }}
          >
            หน่วยงานและตำแหน่ง
          </span>
          <Table
            columns={assignmentColumns}
            rows={user.assignments || []}
            rowKey={(row) => row.id}
          />
        </section>

        <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-600)' }}>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
            <span style={{
              color: 'var(--text-topic-primary-title)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-base)',
              lineHeight: 1.5,
            }}
            >
              สิทธิ์เข้าถึงระบบ
            </span>
            <span style={{
              color: 'var(--text-topic-primary-subtext-default)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.5,
            }}
            >
              {matchedAccess
                ? `สิทธิ์ตามกิจกรรม ${primary?.activity} · ${primary?.position}`
                : 'ยังไม่มีสิทธิการเข้าถึงที่ตรงกับกิจกรรมหลัก'}
            </span>
          </div>
          {matchedAccess ? (
            <>
              <ReadonlyPermTable title='ระบบ PHCIS' modules={PHCIS_MODULES} permissions={permissions} />
              <ReadonlyPermTable title='ระบบ Consent' modules={CONSENT_MODULES} permissions={permissions} />
            </>
          ) : null}
        </section>
      </div>
    </QueuePageShell>
  );
}
