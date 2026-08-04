import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import Table from '@/components/table/Table';
import Alert from '@/components/alert/Alert';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import StaffProfileAvatar from '@/components/appointment/StaffProfileAvatar';
import {
  SHIFT_TYPES,
  SCHEDULE_STATUS_META,
  THAI_MONTH_NAMES,
  THAI_WEEKDAY_SHORT,
  buildUserSchedule,
  scheduleTableRows,
} from '@/data/usersSchedule';
import { getUserById, getRole, getSubRole, getDepartment } from '@/data/usersAccess';
import {
  EmptyState,
  ModuleCard,
  PermissionGate,
  SectionTitle,
  auditAdmin,
  centerLabel,
} from '@/pages/users/usersShared';

/* UserSchedulePage — TOR §1.17.5.3 "บันทึกตารางการทำงานของผู้ใช้".

   หน้านี้เป็น **อ่านอย่างเดียว 100%** — ไม่มีปุ่มบันทึก/แก้ไข/ลบใด ๆ
   ข้อมูลมาจากระบบจัดการตารางเวร (Schedule Management, src/pages/schedule)
   ซึ่งอยู่นอกขอบเขตที่แก้ได้ในรอบนี้ การแก้ไขต้องทำที่ระบบนั้น. */

const PRINT_AREA_ID = 'mih-schedule-print-area';
const PRINT_STYLE_ID = 'mih-schedule-print-style';

const ensurePrintStyle = () => {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(PRINT_STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = PRINT_STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = `
    @media print {
      body * { visibility: hidden !important; }
      #${PRINT_AREA_ID}, #${PRINT_AREA_ID} * { visibility: visible !important; }
      #${PRINT_AREA_ID} {
        position: absolute !important;
        left: 0; top: 0; width: 100%;
        box-shadow: none !important;
        border: 0 !important;
      }
      .mih-schedule-no-print { display: none !important; }
    }
  `;
};

const ShiftChip = ({ shift }) => (
  <ColorfulBadge style={shift.tone} size='small'>{shift.label}</ColorfulBadge>
);

const UserSchedulePage = () => {
  const { id } = useParams();
  const history = useHistory();
  const user = getUserById(id);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [monthIndex, setMonthIndex] = useState(today.getMonth());

  useEffect(() => { ensurePrintStyle(); }, []);

  const schedule = useMemo(
    () => (user ? buildUserSchedule(user.id, year, monthIndex) : null),
    [user, year, monthIndex],
  );
  const tableRows = useMemo(() => (schedule ? scheduleTableRows(schedule) : []), [schedule]);

  if (!user) {
    return (
      <QueuePageShell
        activeKey='users'
        breadcrumb={['ระบบงานผู้ดูแลระบบ', 'ผู้ใช้และสิทธิ์การเข้าถึง', 'ไม่พบผู้ใช้']}
        title='ไม่พบผู้ใช้'
        onBack={() => history.push('/users')}
        backLabel='กลับไปรายชื่อผู้ใช้'
      >
        <div className='flex flex-col flex-1' style={{ paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)' }}>
          <ModuleCard>
            <EmptyState
              icon='person_off'
              title='ไม่พบผู้ใช้ที่ตรงกับลิงก์นี้'
              subtitle={`รหัสผู้ใช้ "${id}" ไม่มีในระบบ — อาจถูกลบไปแล้วหรือลิงก์ไม่ถูกต้อง`}
              action={<BrandButton size='md' leadingIcon='arrow_back' onClick={() => history.push('/users')}>กลับไปรายชื่อผู้ใช้</BrandButton>}
            />
          </ModuleCard>
        </div>
      </QueuePageShell>
    );
  }

  const statusMeta = SCHEDULE_STATUS_META[schedule.scheduleStatus] || SCHEDULE_STATUS_META.pending;
  const monthLabel = `${THAI_MONTH_NAMES[monthIndex]} ${year + 543}`;

  const step = (delta) => {
    const next = new Date(year, monthIndex + delta, 1);
    setYear(next.getFullYear());
    setMonthIndex(next.getMonth());
  };

  const columns = [
    { key: 'dateLabel', label: 'วันที่', width: 200 },
    { key: 'weekday', label: 'วัน', width: 80 },
    {
      key: 'shiftLabel', label: 'เวร', width: 140, sortable: false,
      render: (r) => <ColorfulBadge style={r.tone} size='small'>{r.shiftLabel}</ColorfulBadge>,
    },
    { key: 'time', label: 'เวลา', width: 150 },
    { key: 'unit', label: 'ศูนย์ / หน่วยบริการ', flex: true, minWidth: 200 },
    { key: 'note', label: 'หมายเหตุ', flex: true, minWidth: 180 },
  ];

  const summaryCards = [
    { key: 'hours', label: `ชั่วโมงรวมเดือน ${THAI_MONTH_NAMES[monthIndex]}`, value: `${schedule.summary.totalHours} ชม.`, color: 'brand', icon: 'schedule' },
    { key: 'shifts', label: 'วันที่ขึ้นเวร', value: schedule.summary.workingDays, color: 'positive', icon: 'event_available' },
    { key: 'oncall', label: 'เวรเสริม (On-call)', value: schedule.summary.counts.oncall, color: 'info', icon: 'call' },
    { key: 'off', label: 'วันหยุด / ลา', value: schedule.summary.dayOff, color: 'inprogress', icon: 'weekend' },
  ];

  const staffHeader = (
    <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      <StaffProfileAvatar staff={{ name: user.name, avatarSrc: user.avatarUrl, role: user.role }} size={48} ring />
      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <span style={{ color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-bold, 700)' }}>
          {user.name}
        </span>
        <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)' }}>
          {getRole(user.role)?.label}
          {getSubRole(user.role, user.subRole) ? ` · ${getSubRole(user.role, user.subRole).label}` : ''}
          {' · '}
          {(user.departments || []).map((d) => getDepartment(d)?.label || d).join(', ') || '—'}
        </span>
        <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)' }}>
          {centerLabel(user.homeCenter)}
        </span>
      </div>
      <ColorfulBadge style={statusMeta.tone} size='small' icon='event_note'>{statusMeta.label}</ColorfulBadge>
    </div>
  );

  return (
    <QueuePageShell
      activeKey='users'
      breadcrumb={['ระบบงานผู้ดูแลระบบ', 'ผู้ใช้และสิทธิ์การเข้าถึง', user.name, 'ตารางการทำงาน']}
      title={`ตารางการทำงาน — ${user.name}`}
      onBack={() => history.push(`/users/${user.id}`)}
      backLabel='กลับไปข้อมูลผู้ใช้'
      actions={(
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton
            variant='outline'
            size='md'
            leadingIcon='print'
            onClick={() => { auditAdmin(`พิมพ์ตารางเวรของ ${user.name} เดือน ${monthLabel}`); window.print(); }}
          >
            พิมพ์ตารางเวร
          </NeutralSubdueButton>
          <BrandSubdueButton
            variant='outline'
            size='md'
            leadingIcon='open_in_new'
            onClick={() => history.push(`/schedule/${user.id}`)}
          >
            เปิดในระบบจัดการตารางเวร
          </BrandSubdueButton>
        </div>
      )}
      headerInfo={staffHeader}
      summaryCards={summaryCards}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-500, 20px)' }}>
        <PermissionGate feature='users.manage' featureLabel='จัดการผู้ใช้และสิทธิ์'>
          {() => (
            <>
              <Alert
                className='mih-schedule-no-print'
                type='info'
                title='ข้อมูลมาจากระบบจัดการตารางเวร (Schedule Management)'
                subtext='หน้านี้แสดงผลอย่างเดียว — การเพิ่ม/แก้ไข/ลบเวรต้องทำที่ระบบจัดการตารางเวรเท่านั้น เพื่อไม่ให้ตารางเวรมีแหล่งความจริงสองชุด'
              />

              <div id={PRINT_AREA_ID} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
                <ModuleCard>
                  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                    <span style={{ color: 'var(--text-content-primary)', fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-bold, 700)' }}>
                      ตารางการทำงาน — {user.name}
                    </span>
                    <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs, 12px)' }}>
                      เดือน {monthLabel} · {centerLabel(user.homeCenter)}
                    </span>
                  </div>

                  <SectionTitle
                    icon='calendar_month'
                    title={`ปฏิทินเวรเดือน ${monthLabel}`}
                    subtitle='ชิปสีในแต่ละวันคือประเภทเวรตามระบบจัดการตารางเวร'
                    action={(
                      <div className='flex items-center mih-schedule-no-print' style={{ gap: 'var(--dim-space-150, 6px)' }}>
                        <NeutralSubdueButton variant='outline' size='sm' leadingIcon='chevron_left' onClick={() => step(-1)}>เดือนก่อน</NeutralSubdueButton>
                        <NeutralSubdueButton variant='outline' size='sm' trailingIcon='chevron_right' onClick={() => step(1)}>เดือนถัดไป</NeutralSubdueButton>
                      </div>
                    )}
                  />

                  {!schedule.hasSchedule ? (
                    <EmptyState
                      icon='event_busy'
                      title='ยังไม่มีตารางเวรในเดือนนี้'
                      subtitle={`${user.name} ยังอยู่ในสถานะ "${statusMeta.label}" — ไปจัดเวรได้ที่ระบบจัดการตารางเวร`}
                      action={(
                        <BrandButton size='md' leadingIcon='open_in_new' onClick={() => history.push(`/schedule/${user.id}`)}>
                          ไปยังระบบจัดการตารางเวร
                        </BrandButton>
                      )}
                    />
                  ) : (
                    <div className='w-full' style={{ overflowX: 'auto' }}>
                      <div className='flex flex-col' style={{ minWidth: 640, gap: 'var(--dim-space-150, 6px)' }}>
                        <div className='grid' style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--dim-space-150, 6px)' }}>
                          {THAI_WEEKDAY_SHORT.map((d) => (
                            <span
                              key={d}
                              className='text-center'
                              style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)' }}
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                        {schedule.weeks.map((week, wi) => (
                          <div key={`w-${wi}`} className='grid' style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--dim-space-150, 6px)' }}>
                            {week.map((cell, ci) => (
                              <div
                                key={`c-${wi}-${ci}`}
                                className='flex flex-col'
                                style={{
                                  gap: 'var(--dim-space-100, 4px)',
                                  minHeight: 'var(--dim-size-1600, 72px)',
                                  paddingTop: 'var(--dim-space-200, 8px)',
                                  paddingBottom: 'var(--dim-space-200, 8px)',
                                  paddingLeft: 'var(--dim-space-200, 8px)',
                                  paddingRight: 'var(--dim-space-200, 8px)',
                                  borderRadius: 'var(--dim-radius-200, 8px)',
                                  background: cell ? 'var(--surface-card-100)' : 'transparent',
                                  border: cell ? 'var(--dim-stroke-100, 1px) solid var(--border-card-default)' : 'none',
                                }}
                              >
                                {cell ? (
                                  <>
                                    <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)' }}>
                                      {cell.day}
                                    </span>
                                    {cell.shift ? <ShiftChip shift={cell.shift} /> : null}
                                    {cell.shift && cell.shift.key !== 'dayoff' ? (
                                      <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)' }}>
                                        {cell.shift.time}
                                      </span>
                                    ) : null}
                                  </>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>ประเภทเวร:</span>
                    {SHIFT_TYPES.map((s) => (
                      <span key={s.key} className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                        <ColorfulBadge style={s.tone} size='small'>{s.label}</ColorfulBadge>
                        <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>{s.time}</span>
                      </span>
                    ))}
                  </div>
                </ModuleCard>

                <ModuleCard>
                  <SectionTitle icon='list_alt' title='รายการเวรรายวัน' subtitle='เรียงตามวันที่ — อ่านอย่างเดียว' />
                  {tableRows.length === 0 ? (
                    <EmptyState
                      icon='event_busy'
                      title='ยังไม่มีเวรในเดือนนี้'
                      subtitle='เมื่อระบบจัดการตารางเวรบันทึกเวรแล้ว รายการจะปรากฏที่นี่'
                    />
                  ) : (
                    <Table columns={columns} rows={tableRows} rowKey={(r) => r.id} emptyMessage='ไม่มีเวร' />
                  )}
                </ModuleCard>

                <ModuleCard>
                  <SectionTitle icon='summarize' title='สรุปเดือนนี้' subtitle='นับจากปฏิทินด้านบน' />
                  <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                    {SHIFT_TYPES.map((s) => (
                      <div
                        key={s.key}
                        className='flex flex-col'
                        style={{
                          minWidth: 160,
                          gap: 'var(--dim-space-100, 4px)',
                          paddingTop: 'var(--dim-space-300, 12px)',
                          paddingBottom: 'var(--dim-space-300, 12px)',
                          paddingLeft: 'var(--dim-space-300, 12px)',
                          paddingRight: 'var(--dim-space-300, 12px)',
                          borderRadius: 'var(--dim-radius-300, 10px)',
                          background: 'var(--surface-card-100)',
                          border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default)',
                        }}
                      >
                        <ColorfulBadge style={s.tone} size='small'>{s.label}</ColorfulBadge>
                        <span style={{ color: 'var(--text-content-primary)', fontSize: 'var(--type-size-lg, 18px)', fontWeight: 'var(--type-weight-bold, 700)' }}>
                          {schedule.summary.counts[s.key]} วัน
                        </span>
                        <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>{s.time}</span>
                      </div>
                    ))}
                  </div>
                  <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150, 6px)', color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>
                    <Icon name='info' size={14} />
                    เวลาเวรอ้างอิงจากระบบจัดการตารางเวร (เวรเช้า 08:00-12:00 · เวรบ่าย 13:00-16:00 · เวรดึก 16:00-20:00) — ถ้าระบบนั้นเปลี่ยนเวลา ต้องตามแก้สำเนาใน src/data/usersSchedule.js
                  </span>
                </ModuleCard>
              </div>
            </>
          )}
        </PermissionGate>
      </div>
    </QueuePageShell>
  );
};

export default UserSchedulePage;
