import React, { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import Table from '@/components/table/Table';
import AppointmentStaffHero from '@/components/appointment/AppointmentStaffHero';
import AssessUserCreatePage from '@/pages/assess/AssessUserCreatePage';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import Textarea from '@/components/forms/Textarea';
import ASSESS_NAV from '@/pages/assess/assessNav';
import {
  ACCESS_SYSTEMS,
  PERM_META,
  PERM_MIXED,
  menuLeafKeys,
  systemLeafKeys,
  rollupLevel,
} from '@/data/accessMenuCatalog';
import {
  PERM_NONE,
  readAccessControls,
  resolveUserAccess,
  dataScopeLabel,
  piiLabel,
  formatDailyWindow,
  formatVersion,
  latestVersion,
} from '@/data/accessControlStore';
import {
  findAssessUser,
  fullName,
  fullNameEn,
  primaryAssignment,
  upsertAssessUser,
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

const GENDER_LABEL = { male: 'ชาย', female: 'หญิง', other: 'อื่นๆ' };

function PermBadge({ level }) {
  if (level === PERM_MIXED) {
    return (
      <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>
        กำหนดรายเมนู
      </ColorfulBadge>
    );
  }
  const meta = PERM_META[level] || PERM_META[PERM_NONE];
  return (
    <ColorfulBadge style={meta.badge} size='small' hierarchy='secondary' width='hug'>
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

/* สิทธิ์ที่บุคลากรได้รับจริง — ระบบ → เมนู → เมนูย่อย แสดงเฉพาะที่มีสิทธิ์
   (26 ส.ค. 2569 โครงเดียวกับหน้าแม่แบบสิทธิ์) */
function ReadonlyPermTree({ permissions }) {
  const rows = [];
  ACCESS_SYSTEMS.forEach((system) => {
    const sysLeaves = systemLeafKeys(system);
    if (sysLeaves.every((k) => (permissions[k] || PERM_NONE) === PERM_NONE)) return;
    rows.push({ id: system.key, label: system.label, depth: 0, level: rollupLevel(permissions, sysLeaves) });
    system.menus.forEach((menu) => {
      const leaves = menuLeafKeys(menu);
      if (leaves.every((k) => (permissions[k] || PERM_NONE) === PERM_NONE)) return;
      const level = rollupLevel(permissions, leaves);
      rows.push({ id: menu.key, label: menu.label, depth: 1, level });
      if (level === PERM_MIXED) {
        menu.children.forEach((sub) => {
          const subLevel = permissions[sub.key] || PERM_NONE;
          if (subLevel === PERM_NONE) return;
          rows.push({ id: sub.key, label: sub.label, depth: 2, level: subLevel });
        });
      }
    });
  });

  const columns = [
    {
      key: 'label',
      header: 'ระบบ / เมนู / เมนูย่อย',
      flex: 1,
      minWidth: 260,
      render: (row) => (
        <span
          style={{
            ...TEXT_CELL,
            paddingLeft: `calc(${row.depth} * var(--dim-space-600))`,
            fontFamily: row.depth === 0
              ? 'var(--type-family-heading-graphic2)'
              : 'var(--type-family-body)',
            color: row.depth === 0 ? 'var(--text-brandPrimary-default)' : TEXT_CELL.color,
          }}
        >
          {row.label}
        </span>
      ),
    },
    {
      key: 'level',
      header: 'ระดับสิทธิ์',
      render: (row) => <PermBadge level={row.level} />,
    },
  ];

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <Table
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        emptyMessage='ยังไม่ได้รับสิทธิ์เข้าถึงระบบใด'
      />
    </div>
  );
}

/* การจับคู่แม่แบบสิทธิ์กับ assignment ย้ายไปอยู่ที่ resolveUserAccess ใน
   accessControlStore แล้ว (ABAC + รวมหลายแม่แบบ + เช็คสถานะอนุมัติ/ช่วงเวลา)
   ของเดิมที่นี่จับคู่แค่ assignment หลักใบเดียวและไม่สนสถานะอนุมัติ */

export default function AssessUserDetailPage() {
  const navigate = useHistory();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('personal');
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [accountAction, setAccountAction] = useState(null);
  const [accountReason, setAccountReason] = useState('');
  const [reactivateConfirmOpen, setReactivateConfirmOpen] = useState(false);
  const [userRevision, setUserRevision] = useState(0);
  const user = useMemo(() => findAssessUser(id), [id, userRevision]);
  const accessList = useMemo(() => readAccessControls(), [id]);

  const primary = useMemo(() => (user ? primaryAssignment(user) : null), [user]);
  /* สิทธิ์ที่ได้รับจริง — รวมทุกแม่แบบที่ "อนุมัติแล้ว + ยังมีผล" และตรงกับ
     assignment ของคนนี้ (ABAC) ไม่ใช่ดูแค่กิจกรรมหลักใบเดียวเหมือนเดิม */
  const access = useMemo(() => resolveUserAccess(user, accessList), [user, accessList]);
  const permissions = useMemo(
    () => Object.fromEntries(Object.entries(access.modules).map(([k, v]) => [k, v.level])),
    [access],
  );
  const matchedAccess = access.templates.length > 0;

  const closeAccountAction = () => {
    setAccountAction(null);
    setAccountReason('');
  };

  const applyAccountAction = () => {
    const reason = accountReason.trim();
    if (!reason) return;
    const now = new Date().toISOString();
    const isDelete = accountAction === 'delete';
    upsertAssessUser({
      ...user,
      active: false,
      accountStatus: isDelete ? 'deleted' : 'suspended',
      ...(isDelete
        ? { deletionReason: reason, deletedAt: now }
        : { suspensionReason: reason, suspendedAt: now }),
    });
    closeAccountAction();
    if (isDelete) {
      navigate.push('/assess/users');
      return;
    }
    setUserRevision((revision) => revision + 1);
  };

  const reactivateAccount = () => {
    upsertAssessUser({
      ...user,
      active: true,
      accountStatus: 'active',
      reactivatedAt: new Date().toISOString(),
    });
    setReactivateConfirmOpen(false);
    setUserRevision((revision) => revision + 1);
  };

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

  /* The schedule-style profile stays in the PHCIS white header band under
     the SubHeader. The summary-card row was intentionally removed. */
  const profileHeader = (
    <AppointmentStaffHero
      staff={{
        name: fullName(user),
        nameTh: fullName(user),
        nameEn: fullNameEn(user),
        avatarSrc: user.photo,
        groupPolicy: primary?.activity || '—',
        groupPolicyLabel: primary?.activity || '—',
        subDivision: primary?.subActivity || '—',
        dept: primary?.department || '—',
      }}
      showAvgExamTime={false}
    />
  );

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
    <>
      <QueuePageShell
      activeKey='system-staff'
      sidebarItems={ASSESS_NAV}
      sidebarFallbackKey='system-staff'
      brandTitle='จัดการระบบ'
      breadcrumb={breadcrumb}
      title='บุคลากรและการเข้าถึง'
      onBack={() => navigate.push('/assess/users')}
      actions={(
        <div className='flex items-center flex-wrap justify-end' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueButton leadingIcon='edit' size='sm' onClick={() => setEditPopupOpen(true)}>
            แก้ไข
          </NeutralSubdueButton>
          {user.active ? (
            <NeutralSubdueButton leadingIcon='pause_circle' size='sm' onClick={() => setAccountAction('suspend')}>
              พักบัญชี
            </NeutralSubdueButton>
          ) : (
            <BrandSubdueButton leadingIcon='check_circle' size='sm' variant='outline' onClick={() => setReactivateConfirmOpen(true)}>
              เปิดใช้งานบัญชี
            </BrandSubdueButton>
          )}
          <DangerSubdueButton leadingIcon='delete' size='sm' variant='outline' onClick={() => setAccountAction('delete')}>
            ลบบัญชี
          </DangerSubdueButton>
        </div>
      )}
      headerInfo={profileHeader}
      tabs={[
        { key: 'personal', label: 'ข้อมูลส่วนตัว' },
        { key: 'access', label: 'สิทธิ์การเข้าถึงระบบ' },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        {activeTab === 'personal' ? (
          <>
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
          <div
            className='grid w-full'
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 'var(--dim-space-600)',
            }}
          >
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
          </>
        ) : (

        <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-600)' }}>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
            <span style={{
              color: 'var(--text-topic-primary-title)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-base)',
              lineHeight: 1.5,
            }}
            >
              สิทธิ์การเข้าถึงระบบ
            </span>
            <span style={{
              color: 'var(--text-topic-primary-subtext-default)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.5,
            }}
            >
              {matchedAccess
                ? `รวมจากแม่แบบที่อนุมัติแล้ว ${access.templates.length} ฉบับ — ได้สิทธิ์กว้างที่สุดที่แต่ละแม่แบบให้ไว้`
                : 'ยังไม่ได้รับสิทธิ์ — ไม่มีแม่แบบที่อนุมัติแล้วและตรงกับศูนย์/กิจกรรม/แผนกที่ปฏิบัติงาน'}
            </span>
          </div>
          {matchedAccess ? (
            <>
              {/* ที่มาของสิทธิ์ + ธรรมาภิบาลที่ได้จากการรวมแม่แบบ */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                {access.templates.map(({ record }) => (
                  <div
                    key={record.id}
                    className='flex flex-wrap items-baseline w-full'
                    style={{ gap: 'var(--dim-space-300)' }}
                  >
                    <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>
                      {formatVersion(latestVersion(record))}
                    </ColorfulBadge>
                    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                      {record.templateName}
                    </span>
                    <span style={{
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm)',
                      color: 'var(--text-content-tertiary)',
                    }}
                    >
                      {[record.center, record.activity, record.department].filter(Boolean).join(' · ')}
                      {` · เข้าใช้ได้ ${formatDailyWindow(record)}`}
                    </span>
                  </div>
                ))}
              </div>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-600)' }}>
                <InfoField label='ขอบเขตข้อมูลที่มองเห็น' value={dataScopeLabel(access.dataScope)} />
                <InfoField label='ข้อมูลระบุตัวตน (PII)' value={piiLabel(access.piiVisibility)} />
                <InfoField
                  label='สถานะเข้าใช้ ณ ตอนนี้'
                  value={access.openNow ? 'อยู่ในช่วงเวลาที่เข้าใช้ได้' : 'นอกช่วงเวลาที่กำหนด'}
                />
              </div>
              <ReadonlyPermTree permissions={permissions} />
            </>
          ) : null}
        </section>
        )}
      </div>
      </QueuePageShell>
      {editPopupOpen ? (
        <AssessUserCreatePage
          asPopup
          existingId={id}
          onClose={() => setEditPopupOpen(false)}
          onSaved={() => setUserRevision((revision) => revision + 1)}
        />
      ) : null}
      <Popup
        open={!!accountAction}
        onClose={closeAccountAction}
        size='large'
        title={accountAction === 'delete' ? 'ลบบัญชีผู้ใช้งาน' : 'พักบัญชีชั่วคราว'}
        subtitle={accountAction === 'delete'
          ? 'การลบบัญชีจะซ่อนบัญชีออกจากทะเบียนบุคลากร แต่เก็บเหตุผลไว้สำหรับตรวจสอบ'
          : 'ผู้ใช้งานจะไม่สามารถเข้าสู่ระบบได้จนกว่าจะกำหนดเปิดใช้งานใหม่'}
        secondaryAction={{ label: 'ยกเลิก', onClick: closeAccountAction }}
        primaryAction={{
          label: accountAction === 'delete' ? 'ยืนยันการลบบัญชี' : 'ยืนยันการพักบัญชี',
          tone: accountAction === 'delete' ? 'danger' : undefined,
          disabled: !accountReason.trim(),
          onClick: applyAccountAction,
        }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
          <span style={{ ...VALUE, color: 'var(--text-content-tertiary)' }}>
            {fullName(user)} · {user.employeeCode || '—'}
          </span>
          <Textarea
            label={accountAction === 'delete' ? 'เหตุผลการลบบัญชี' : 'เหตุผลการพักบัญชี'}
            required
            value={accountReason}
            onChange={setAccountReason}
            placeholder='ระบุเหตุผลเพื่อบันทึกไว้ในการตรวจสอบ'
            rows={3}
          />
        </div>
      </Popup>
      <AlertDialog
        open={reactivateConfirmOpen}
        onClose={() => setReactivateConfirmOpen(false)}
        type='warning'
        alignment='center'
        title='เปิดใช้งานบัญชีอีกครั้ง?'
        description={`บัญชีของ ${fullName(user)} จะกลับเข้าสู่ระบบได้ทันที`}
        confirmLabel='เปิดใช้งานบัญชี'
        cancelLabel='ยกเลิก'
        onConfirm={reactivateAccount}
      />
    </>
  );
}
