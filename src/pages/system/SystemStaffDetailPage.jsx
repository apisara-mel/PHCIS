import React, { useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import Icon from '@/components/icons/Icon';
import {
  USERS, FEATURE_GROUPS, getUserById, getRole, getSubRole, getDepartment,
} from '@/data/usersAccess';
import SYSTEM_NAV from '@/pages/system/systemNav';

/* ระบบจัดการระบบ · รายละเอียดบุคลากร (Figma 0EDfjwf1 · 8:52).
   Staff profile: header card · stat tiles · ข้อมูล + สรุปการใช้งาน + กิจกรรม ·
   สิทธิ์การเข้าถึงระบบ. Reuses usersAccess data + shared tokens/components. */

const breadcrumb = ['จัดการระบบ', 'รายชื่อบุคลากร', 'รายละเอียด'];
const roleTone = (color) => (color === 'brand' ? 'green' : color || 'grey');

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};
const LABEL = { color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' };
const VALUE = { color: 'var(--text-content-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' };
const H = { color: 'var(--text-content-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', lineHeight: 1.4 };

/* Access summary for a feature group from the user's per-feature levels. */
const groupAccess = (features, group) => {
  const lv = group.features.map((f) => features[f.key]).filter(Boolean);
  if (lv.includes('edit')) return { tone: 'green', label: 'แก้ไข', partial: lv.length < group.features.length };
  if (lv.includes('view')) return { tone: 'blue', label: 'ดูบางส่วน', partial: lv.length < group.features.length };
  return { tone: 'grey', label: 'ไม่มีสิทธิ์', partial: false };
};

const Tile = ({ label, value, sub, subColor }) => (
  <div className='flex flex-col flex-1' style={{ ...CARD, padding: 'var(--dim-space-400)', gap: 'var(--dim-space-100)', minWidth: 'min(100%, 200px)' }}>
    <span style={LABEL}>{label}</span>
    <span style={{ color: 'var(--text-content-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-lg)' }}>{value}</span>
    {sub && <span style={{ ...LABEL, color: subColor || 'var(--text-content-tertiary)' }}>{sub}</span>}
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className='flex items-center justify-between w-full' style={{ gap: 'var(--dim-space-400)', padding: 'var(--dim-space-200) 0', borderBottom: 'var(--dim-stroke-100) solid var(--border-content-quaternary, #F0F1F3)' }}>
    <span style={LABEL}>{label}</span>
    <span style={{ ...VALUE, textAlign: 'right' }}>{value}</span>
  </div>
);

const MiniStat = ({ label, value }) => (
  <div className='flex flex-col flex-1' style={{ border: 'var(--dim-stroke-100) solid var(--border-card-default)', borderRadius: 'var(--dim-radius-400)', padding: 'var(--dim-space-300)', gap: 2, minWidth: 'min(100%, 120px)' }}>
    <span style={{ color: 'var(--text-content-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)' }}>{value}</span>
    <span style={LABEL}>{label}</span>
  </div>
);

const ACTIVITY = [
  { dot: 'var(--color-emerald-600, #08A768)', title: 'เข้าสู่ระบบ', sub: 'สำเร็จ', time: '10:45' },
  { dot: 'var(--text-info-default, #1D4ED8)', title: 'บันทึกการตรวจ OPD', sub: 'ผู้ป่วย HN-48xxxx', time: '10:32' },
  { dot: 'var(--text-colorfulbadge-orange, #C2410C)', title: 'ออกคำสั่งแพทย์ (CPOE)', sub: '3 รายการ', time: '09:58' },
  { dot: 'var(--color-emerald-600, #08A768)', title: 'เข้าสู่ระบบ', sub: 'สำเร็จ', time: '09:15' },
];

export default function SystemStaffDetailPage() {
  const navigate = useHistory();
  const { id } = useParams();
  const user = useMemo(() => getUserById(id) || USERS[0], [id]);
  const role = getRole(user.role);
  const subRole = getSubRole(user.role, user.subRole);
  const dept = getDepartment((user.departments || [])[0]);
  const systemsUsed = FEATURE_GROUPS.filter((g) => g.features.some((f) => user.features[f.key])).length;

  return (
    <QueuePageShell
      activeKey='system-staff'
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-staff'
      brandTitle='ระบบ PHCIS'
      breadcrumb={breadcrumb}
      title='รายละเอียดบุคลากร'
      onBack={() => navigate.push('/admin/staff')}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        {/* profile header card */}
        <section className='w-full flex items-start flex-wrap' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          <span className='inline-flex items-center justify-center shrink-0 overflow-hidden' style={{ width: 56, height: 56, borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-brandPrimary-quaternary)' }}>
            {user.avatarUrl && <img src={user.avatarUrl} alt='' aria-hidden style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </span>
          <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <span style={{ ...H, fontSize: 'var(--type-size-lg)' }}>{user.name}</span>
              {role && <ColorfulBadge style={roleTone(role.color)} size='small' hierarchy='secondary' width='hug'>{role.label}</ColorfulBadge>}
              <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug' showDot>ใช้งานอยู่</ColorfulBadge>
            </div>
            <span style={{ ...LABEL }}>
              {(dept && dept.label) || '-'} · {user.email} · เวลาทำงาน จ–ศ 08:00–16:00
            </span>
          </div>
          <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
            <BrandButton variant='outline' size='md' leadingIcon='edit' onClick={() => navigate.push(`/system/staff/${user.id}/edit`)}>แก้ไขข้อมูล</BrandButton>
            <NeutralSubdueIconButton icon='more_horiz' variant='outline' size='md' aria-label='เพิ่มเติม' />
          </div>
        </section>

        {/* stat tiles */}
        <section className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <Tile label='บทบาท' value={role ? role.label : '-'} sub={subRole ? subRole.label : undefined} />
          <Tile label='หน่วยบริการหลัก' value='ศูนย์ 4 ดินแดง' sub='+1 หน่วยบริการ' />
          <Tile label='สถานะบัญชี' value='ใช้งานอยู่' sub='ยืนยัน OTP แล้ว' subColor='var(--text-brandPrimary-default)' />
          <Tile label='เข้าใช้ล่าสุด' value='วันนี้ 10:45' sub='IP 10.4.x.x' />
        </section>

        {/* info + usage + activity */}
        <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <section className='flex flex-col' style={{ ...CARD, flex: '1.4 1 0', minWidth: 'min(100%, 360px)', gap: 'var(--dim-space-200)' }}>
            <span style={H}>ข้อมูลบุคลากร</span>
            <InfoRow label='ชื่อ-สกุล' value={user.name} />
            <InfoRow label='ตำแหน่ง' value={subRole ? subRole.label : (role ? role.label : '-')} />
            <InfoRow label='ประเภทบุคลากร' value={role ? role.label : '-'} />
            <InfoRow label='แผนก' value={(dept && dept.label) || '-'} />
            <InfoRow label='รหัสประจำตัว' value='ว.12345' />
            <InfoRow label='เลขประจำตัวประชาชน' value='1-2345-67890-12-3' />
            <InfoRow label='อีเมล' value={user.email} />
            <InfoRow label='เบอร์โทรศัพท์' value='08x-xxx-1234' />
          </section>

          <section className='flex flex-col' style={{ ...CARD, flex: '1 1 0', minWidth: 'min(100%, 300px)', gap: 'var(--dim-space-400)' }}>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              <span style={H}>สรุปการใช้งาน</span>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                <MiniStat label='ระบบที่ใช้' value={`${systemsUsed} ระบบ`} />
                <MiniStat label='ชม./สัปดาห์' value='42.5' />
              </div>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                <MiniStat label='เข้าใช้เดือนนี้' value='86 ครั้ง' />
                <MiniStat label='เฉลี่ย/วัน' value='3.2 ชม.' />
              </div>
            </div>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              <span style={H}>กิจกรรมล่าสุด</span>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
                {ACTIVITY.map((a, i) => (
                  <div key={i} className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
                    <span aria-hidden style={{ width: 8, height: 8, borderRadius: 'var(--dim-radius-full)', background: a.dot, flexShrink: 0 }} />
                    <div className='flex flex-col flex-1 min-w-0'>
                      <span className='truncate' style={VALUE}>{a.title}</span>
                      <span style={{ ...LABEL }}>{a.sub}</span>
                    </div>
                    <span style={LABEL}>{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* permissions */}
        <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-300)' }}>
          <span style={H}>สิทธิ์การเข้าถึงระบบ</span>
          <div className='flex flex-col w-full'>
            {FEATURE_GROUPS.map((g) => {
              const acc = groupAccess(user.features, g);
              return (
                <div key={g.key} className='flex items-center justify-between w-full' style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-300) 0', borderBottom: 'var(--dim-stroke-100) solid var(--border-content-quaternary, #F0F1F3)' }}>
                  <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
                    <span className='inline-flex items-center justify-center shrink-0' style={{ width: 36, height: 36, borderRadius: 'var(--dim-radius-200)', background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-brandPrimary-default)' }}>
                      <Icon name={g.icon} size={18} />
                    </span>
                    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                      <span style={VALUE}>{g.label}</span>
                      {acc.partial && acc.tone !== 'grey' && <ColorfulBadge style='orange' size='small' hierarchy='secondary' width='hug'>ใช้บางหน้า</ColorfulBadge>}
                    </div>
                  </div>
                  <ColorfulBadge style={acc.tone} size='small' hierarchy='secondary' width='hug'>{acc.label}</ColorfulBadge>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </QueuePageShell>
  );
}
