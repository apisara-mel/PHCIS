import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';
import Badge from '@/components/badge/Badge';
import Popup from '@/components/popup/Popup';
import Table from '@/components/table/Table';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  REPLICA_INFO,
  REPLICA_SYNC_LOG,
  REPLICA_STATUS_LABEL,
  getReplicaStatus,
  refreshReplicaStatus,
} from '@/data/dashboardDataSource';

/* §1.20.9 — ฐานข้อมูลซ้ำ (Read Replica) สำหรับงานวิเคราะห์/วิจัย
   แถบสถานะแหล่งข้อมูล ใช้ร่วมกันทุกหน้ารายงานของโมดูล Dashboard

   ข้อจำกัดที่ประกาศตรง ๆ บน UI: prototype นี้เป็น frontend — replica จริงเป็น
   งานฝั่ง infrastructure แถบนี้ทำหน้าที่ "แสดงสถานะ" (ปกติ / ล่าช้า) + ประวัติ
   การ sync เพื่อให้ผู้ใช้เห็นว่ารายงานอ่านจากฐานวิเคราะห์ ไม่ใช่ฐานให้บริการ */

const SYNC_COLUMNS = [
  { key: 'at', label: 'เวลา' },
  { key: 'tables', label: 'ตารางที่ซิงก์', flex: true, minWidth: 220 },
  {
    key: 'rows',
    label: 'จำนวนแถว',
    align: 'right',
    render: (r) => Number(r.rows || 0).toLocaleString('th-TH'),
  },
  {
    key: 'status',
    label: 'สถานะ',
    render: (r) => (
      <Badge style={r.status === 'ok' ? 'success' : 'warning'} size='small'>
        {REPLICA_STATUS_LABEL[r.status] || r.status}
      </Badge>
    ),
  },
];

const InfoRow = ({ label, value }) => (
  <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
    <span
      className='shrink-0'
      style={{
        width: 'var(--dim-size-2200, 192px)',
        color: 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
      }}
    >
      {label}
    </span>
    <span
      className='min-w-0'
      style={{
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
      }}
    >
      {value}
    </span>
  </div>
);

const DataSourceStrip = ({ scopeLabel }) => {
  const [status, setStatus] = useState(() => getReplicaStatus());
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <>
      <section
        className='w-full flex items-center justify-between flex-wrap'
        style={{
          background: status.degraded
            ? 'var(--surface-colorfulbadge-orange, #FFEDD5)'
            : 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
          border: `var(--dim-stroke-100) solid ${status.degraded
            ? 'var(--surface-colorfulbadge-orange-bold, #F97316)'
            : 'var(--border-brandPrimary-quaternary, #E2F3EB)'}`,
          borderRadius: 'var(--dim-radius-400, 12px)',
          gap: 'var(--dim-space-300)',
          paddingTop: 'var(--dim-space-300)',
          paddingBottom: 'var(--dim-space-300)',
          paddingLeft: 'var(--dim-space-400)',
          paddingRight: 'var(--dim-space-400)',
        }}
      >
        <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
          <span
            style={{
              color: status.degraded
                ? 'var(--text-warning-default, #C2410C)'
                : 'var(--text-brandPrimary-default, #007549)',
            }}
          >
            <Icon name={status.degraded ? 'sync_problem' : 'database'} size={20} />
          </span>
          <div className='flex flex-col min-w-0'>
            <span
              style={{
                color: 'var(--text-content-default)',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-sm)',
                lineHeight: 1.4,
              }}
            >
              แหล่งข้อมูล: ฐานข้อมูลซ้ำเพื่อการวิเคราะห์/วิจัย (Read Replica)
            </span>
            <span
              style={{
                color: 'var(--text-content-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                lineHeight: 1.4,
              }}
            >
              {scopeLabel || REPLICA_INFO.scope} · แยกจาก{REPLICA_INFO.separatedFrom} · อัปเดตล่าสุด {status.syncedAtLabel} น.
            </span>
          </div>
          <Badge style={status.degraded ? 'warning' : 'success'} size='small'>
            {status.degraded
              ? `สัญญาณล่าช้า ${status.lagSeconds} วินาที`
              : `Real-Time · หน่วงเวลา ${status.lagSeconds} วินาที`}
          </Badge>
        </div>
        <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueButton
            size='sm'
            leadingIcon='refresh'
            onClick={() => setStatus(refreshReplicaStatus())}
          >
            รีเฟรชสถานะ
          </NeutralSubdueButton>
          <NeutralSubdueButton size='sm' leadingIcon='info' onClick={() => setDetailOpen(true)}>
            รายละเอียดแหล่งข้อมูล
          </NeutralSubdueButton>
        </div>
      </section>

      <Popup
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        size='large'
        title='แหล่งข้อมูลของรายงาน (Read Replica Database)'
        subtitle='TOR §1.20.9 — ฐานข้อมูลซ้ำสำหรับวิเคราะห์และงานวิจัย แยกจากฐานข้อมูลการให้บริการ'
        primaryAction={{ label: 'ปิด', onClick: () => setDetailOpen(false) }}
        secondaryAction={{ label: 'รีเฟรชสถานะ', onClick: () => setStatus(refreshReplicaStatus()) }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <InfoRow label='ชื่อฐานข้อมูล' value={REPLICA_INFO.name} />
            <InfoRow label='ระบบฐานข้อมูล' value={REPLICA_INFO.engine} />
            <InfoRow label='ขอบเขตข้อมูล' value={REPLICA_INFO.scope} />
            <InfoRow label='รูปแบบการอัปเดต' value={REPLICA_INFO.refreshMode} />
            <InfoRow label='แยกจาก' value={REPLICA_INFO.separatedFrom} />
            <InfoRow label='เก็บข้อมูลย้อนหลัง' value={REPLICA_INFO.retention} />
            <InfoRow
              label='สถานะปัจจุบัน'
              value={(
                <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                  <Badge style={status.degraded ? 'warning' : 'success'} size='small'>
                    {status.degraded ? 'ล่าช้ากว่าเกณฑ์' : 'ปกติ'}
                  </Badge>
                  <span>
                    หน่วงเวลา {status.lagSeconds} วินาที (เกณฑ์ {status.thresholdSeconds} วินาที) ·
                    ตรวจสอบเมื่อ {status.checkedAtLabel} น.
                  </span>
                </span>
              )}
            />
          </div>

          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <span
              style={{
                color: 'var(--text-brandPrimary-default)',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-base)',
              }}
            >
              ประวัติการซิงก์ล่าสุด
            </span>
            <Table
              columns={SYNC_COLUMNS}
              rows={REPLICA_SYNC_LOG}
              rowKey={(r) => r.id}
              emptyMessage='ยังไม่มีประวัติการซิงก์'
              pagination={false}
            />
          </div>

          <span
            style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              lineHeight: 1.5,
            }}
          >
            หมายเหตุ: หน้าจอนี้แสดง “สถานะ” ของฐานข้อมูลซ้ำเพื่อให้ผู้ใช้ทราบที่มาของตัวเลขในรายงาน
            การจัดทำ replica จริง (streaming replication + monitoring) เป็นงานฝั่งโครงสร้างพื้นฐาน
            ที่ต้องดำเนินการนอกระบบส่วนหน้า
          </span>
        </div>
      </Popup>
    </>
  );
};

export default DataSourceStrip;
