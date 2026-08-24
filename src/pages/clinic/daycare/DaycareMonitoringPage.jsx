import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import { FilterDropdown } from '@/components/forms/FilterTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import {
  ALERT_LEAD_DAYS, ALERT_LEVELS, DC_ROOMS,
  daycareCenterOptions, formatShDate, getCenterAlerts, getDaycareChildren, roomLabel,
} from '@/data/daycareCore';
import {
  EmptyState, NoticeBar, SectionHeader, StatRow, StatTile, SubCard,
} from '@/pages/clinic/school-health/schoolHealthShared';

/* DaycareMonitoringPage — หน้าติดตามกิจกรรมที่ถึงกำหนด (มติ คทง.5 ครั้งที่ 4)

   ที่ประชุมขอ "หน้าจอ Dashboard หรือหน้าจอติดตามที่แสดงภาพรวมของเด็กใน
   ความดูแล ว่าเด็กคนไหนถึงกำหนดที่ต้องทำกิจกรรมอะไร โดยอาจใช้สัญลักษณ์หรือ
   แถบสีเพื่อบ่งบอกสถานะ (เช่น สีแดง = เกินกำหนด) เพื่อป้องกัน Human Error"

   จึงจัดเรียงจากรุนแรงที่สุดลงมาเสมอ (เกินกำหนด → ถึงกำหนด → ใกล้ถึงกำหนด)
   ไม่ให้เรียงตามชื่อหรือวันที่ เพราะสิ่งที่เจ้าหน้าที่ต้องเห็นก่อนคือ "อะไร
   หลุดไปแล้ว" ไม่ใช่ "อะไรเรียงตามตัวอักษร"                                */

const breadcrumb = ['สถานรับเลี้ยงเด็กกลางวัน', 'ติดตามกิจกรรม'];

const KIND_OPTIONS = [
  { value: 'all', label: 'ทุกกิจกรรม' },
  { value: 'growth', label: 'ชั่งน้ำหนัก/วัดส่วนสูง' },
  { value: 'development', label: 'ประเมินพัฒนาการ' },
  { value: 'vaccine', label: 'วัคซีน' },
];

const LEVEL_OPTIONS = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'overdue', label: 'เกินกำหนด' },
  { value: 'due', label: 'ถึงกำหนดแล้ว' },
  { value: 'upcoming', label: `ใกล้ถึงกำหนด (${ALERT_LEAD_DAYS} วัน)` },
];

const DaycareMonitoringPage = () => {
  const history = useHistory();
  const [center, setCenter] = useState('all');
  const [room, setRoom] = useState('all');
  const [kind, setKind] = useState('all');
  const [level, setLevel] = useState('all');

  const allAlerts = useMemo(() => getCenterAlerts({ centerId: center }), [center]);
  const children = useMemo(() => getDaycareChildren({ centerId: center }), [center]);

  const rows = useMemo(() => allAlerts
    .filter((a) => (room === 'all' ? true : a.room === room))
    .filter((a) => (kind === 'all' ? true : a.kind === kind))
    .filter((a) => (level === 'all' ? true : a.level === level)),
  [allAlerts, room, kind, level]);

  const counts = useMemo(() => ({
    overdue: allAlerts.filter((a) => a.level === 'overdue').length,
    due: allAlerts.filter((a) => a.level === 'due').length,
    upcoming: allAlerts.filter((a) => a.level === 'upcoming').length,
    clearChildren: children.filter((c) => !allAlerts.some((a) => a.childId === c.id)).length,
  }), [allAlerts, children]);

  return (
    <QueuePageShell
      activeKey='daycare'
      breadcrumb={breadcrumb}
      title='ติดตามกิจกรรมที่ถึงกำหนด'
      actions={(
        <NeutralSubdueButton size='sm' leadingIcon='arrow_back' onClick={() => history.push('/clinic/daycare')}>
          กลับหน้าเด็กในความดูแล
        </NeutralSubdueButton>
      )}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}>
        <NoticeBar tone={counts.overdue > 0 ? 'danger' : 'info'} icon='notifications_active'>
          {counts.overdue > 0
            ? `มีกิจกรรมเกินกำหนด ${counts.overdue} รายการ — รายการเกินกำหนดจะค้างอยู่ที่นี่จนกว่าจะบันทึกกิจกรรมนั้นจริง (มติ คทง.5 ครั้งที่ 5)`
            : `ไม่มีกิจกรรมเกินกำหนด — ระบบแจ้งเตือนล่วงหน้า ${ALERT_LEAD_DAYS} วันก่อนถึงกำหนดของเด็กแต่ละคน`}
        </NoticeBar>

        <SubCard>
          <SectionHeader icon='monitoring' title='ภาพรวมกิจกรรมของเด็กในความดูแล' subtitle='เรียงจากเกินกำหนดลงมาเสมอ เพื่อกัน Human Error' />
          <StatRow>
            <StatTile label='เกินกำหนด' value={counts.overdue} unit='รายการ' tone='danger' icon='error' />
            <StatTile label='ถึงกำหนดวันนี้' value={counts.due} unit='รายการ' tone='warning' icon='event_available' />
            <StatTile label={`ใกล้ถึงกำหนด (${ALERT_LEAD_DAYS} วัน)`} value={counts.upcoming} unit='รายการ' tone='brand' icon='schedule' />
            <StatTile label='เด็กที่ไม่มีรายการค้าง' value={counts.clearChildren} unit='คน' tone='success' icon='task_alt' />
          </StatRow>
        </SubCard>

        <SubCard>
          <OverflowFlexRow gap='var(--dim-space-300)'>
            <FilterDropdown
              prefix='สถานรับเลี้ยง:'
              options={[{ value: 'all', label: 'ทุกแห่ง' }, ...daycareCenterOptions()]}
              value={center}
              onChange={setCenter}
            />
            <FilterDropdown
              prefix='ห้อง:'
              options={[{ value: 'all', label: 'ทุกห้อง' }, ...DC_ROOMS]}
              value={room}
              onChange={setRoom}
            />
            <FilterDropdown prefix='กิจกรรม:' options={KIND_OPTIONS} value={kind} onChange={setKind} />
            <FilterDropdown prefix='สถานะ:' options={LEVEL_OPTIONS} value={level} onChange={setLevel} />
          </OverflowFlexRow>

          {rows.length === 0 ? (
            <EmptyState
              icon='task_alt'
              title='ไม่มีกิจกรรมค้างตามตัวกรองที่เลือก'
              subtitle='ลองเปลี่ยนตัวกรอง หรือแปลว่าเด็กกลุ่มนี้ได้รับกิจกรรมครบตามกำหนดแล้ว'
            />
          ) : (
            <Table
              columns={[
                {
                  key: 'level', label: 'สถานะ', width: 140,
                  render: (r) => (
                    <ColorfulBadge style={ALERT_LEVELS[r.level].style} size='small' hierarchy='secondary' width='hug'>
                      {ALERT_LEVELS[r.level].label}
                    </ColorfulBadge>
                  ),
                },
                { key: 'childName', label: 'ชื่อเด็ก', flex: true, minWidth: 190 },
                { key: 'room', label: 'ห้อง', flex: true, minWidth: 180, render: (r) => roomLabel(r.room) },
                { key: 'kindLabel', label: 'กิจกรรมที่ต้องทำ', flex: true, minWidth: 220 },
                { key: 'dueIso', label: 'กำหนด', width: 130, render: (r) => formatShDate(r.dueIso) },
                { key: 'detail', label: 'รายละเอียด', flex: true, minWidth: 300 },
                {
                  key: 'actions', label: 'การดำเนินการ', width: 150, sortable: false,
                  render: (r) => (
                    <BrandSubdueButton
                      size='sm' variant='fill' leadingIcon='folder_open'
                      onClick={(e) => { e.stopPropagation(); history.push(`/clinic/daycare/child/${r.childId}`); }}
                    >
                      เปิดแฟ้มเด็ก
                    </BrandSubdueButton>
                  ),
                },
              ]}
              rows={rows}
              rowKey={(r) => r.key}
              onRowClick={(r) => history.push(`/clinic/daycare/child/${r.childId}`)}
              emptyMessage='ไม่มีกิจกรรมค้าง'
            />
          )}
        </SubCard>
      </div>
    </QueuePageShell>
  );
};

export default DaycareMonitoringPage;
