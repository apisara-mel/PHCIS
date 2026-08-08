import React, { useEffect, useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrimarySearch from '@/components/search/PrimarySearch';
import { FilterDropdown } from '@/components/forms/FilterTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  NOTIFY_CHANNELS,
  NOTIFY_KINDS,
  NOTIFY_STATUS,
  getNotifyLog,
  notifyChannelLabel,
  notifyKindLabel,
  retryNotify,
  subscribeApptNotify,
} from './appointmentNotifyStore';
import { NO_PERMISSION_TOOLTIP } from './appointmentPermissions';

/* TOR 4.2.5 — บันทึกการแจ้งเตือนกลับผู้รับบริการ (MOCK push / LINE / SMS).
   ⚠️ ไม่มีผู้ให้บริการ push จริง — ต้องรายงาน 4.2.5 เป็น partial เสมอ. */

const PAGE_SIZE = 10;

const TEXT_CELL = {
  color: 'var(--text-neutral-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  lineHeight: 1.5,
};

const CHANNEL_STYLE = { push: 'blue', line: 'green', sms: 'purple' };

const CHANNEL_FILTER = [
  { value: '', label: 'ทุกช่องทาง' },
  ...NOTIFY_CHANNELS.map((c) => ({ value: c.value, label: c.label })),
];

const KIND_FILTER = [
  { value: '', label: 'ทุกประเภทข้อความ' },
  ...NOTIFY_KINDS.map((k) => ({ value: k.value, label: k.label })),
];

const STATUS_FILTER = [
  { value: '', label: 'ทุกสถานะการส่ง' },
  { value: NOTIFY_STATUS.SENT, label: 'ส่งสำเร็จ' },
  { value: NOTIFY_STATUS.FAILED, label: 'ส่งไม่สำเร็จ' },
];

/** พิมพ์ / ส่งออกบันทึกการแจ้งเตือน. */
export function printNotifyLog(rows) {
  const body = (rows || []).map((r) => `
    <tr>
      <td>${r.at}</td><td>${notifyChannelLabel(r.channel)}</td>
      <td>${notifyKindLabel(r.kind)}</td>
      <td>${r.hn}</td>
      <td>${r.title}<br/><span class="sub">${r.body}</span></td>
      <td>${r.status === NOTIFY_STATUS.SENT ? 'ส่งสำเร็จ' : `ส่งไม่สำเร็จ — ${r.failReason || ''}`}</td>
      <td>${r.actor}</td>
    </tr>`).join('');
  const html = `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"/><title>บันทึกการแจ้งเตือนนัดหมาย</title>
<style>
  body{font-family:Sarabun,sans-serif;padding:24px;color:#232B36}
  h1{font-size:18px;color:#007549;margin:0 0 4px}
  .meta{color:#858C92;font-size:12px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #E2E4E6;padding:6px;text-align:left;vertical-align:top}
  th{background:#F4FBF8}
  .sub{color:#858C92}
  @media print{body{padding:0}}
</style></head><body>
<h1>บันทึกการแจ้งเตือนผู้รับบริการ (ระบบนัดหมาย)</h1>
<div class="meta">พิมพ์เมื่อ ${new Date().toLocaleString('th-TH')} · ${(rows || []).length} รายการ · ข้อมูลจำลอง (mock) ยังไม่เชื่อมผู้ให้บริการ push จริง</div>
<table><thead><tr>
<th>เวลา</th><th>ช่องทาง</th><th>ประเภท</th><th>HN</th><th>ข้อความ</th><th>สถานะ</th><th>ผู้ดำเนินการ</th>
</tr></thead><tbody>${body}</tbody></table>
</body></html>`;
  const w = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=800');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

const AppointmentNotifyLogTable = ({ canManage = true }) => {
  const [, setTick] = useState(0);
  useEffect(() => subscribeApptNotify(() => setTick((n) => n + 1)), []);

  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const rows = getNotifyLog();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (channel && r.channel !== channel) return false;
      if (kind && r.kind !== kind) return false;
      if (status && r.status !== status) return false;
      if (!q) return true;
      return [r.patient, r.hn, r.title, r.body, r.appointmentId, r.requestId]
        .some((f) => String(f || '').toLowerCase().includes(q));
    });
  }, [rows, search, channel, kind, status]);

  const hasFilter = !!(search || channel || kind || status);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const clearFilters = () => {
    setSearch(''); setChannel(''); setKind(''); setStatus(''); setPage(1);
  };

  const columns = [
    {
      key: 'at', header: 'เวลาที่ส่ง', sortable: false,
      render: (r) => <span style={{ ...TEXT_CELL, whiteSpace: 'nowrap' }}>{r.at}</span>,
    },
    {
      key: 'channel', header: 'ช่องทาง', sortable: false,
      render: (r) => (
        <ColorfulBadge style={CHANNEL_STYLE[r.channel] || 'grey'} size='small' hierarchy='secondary' width='hug'>
          {notifyChannelLabel(r.channel)}
        </ColorfulBadge>
      ),
    },
    {
      key: 'kind', header: 'ประเภทข้อความ', sortable: false,
      render: (r) => <span style={TEXT_CELL}>{notifyKindLabel(r.kind)}</span>,
    },
    {
      key: 'patient', header: 'ผู้รับบริการ', sortable: false,
      render: (r) => (
        <span className='truncate' style={TEXT_CELL}>{r.patient} · {r.hn}</span>
      ),
    },
    {
      key: 'body', header: 'ข้อความที่ส่ง', flex: true, minWidth: 260, sortable: false,
      render: (r) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span className='truncate' style={{ ...TEXT_CELL, fontWeight: 'var(--type-weight-medium)' }}>{r.title}</span>
          <span
            className='truncate'
            style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
            }}
          >
            {r.body}
          </span>
        </div>
      ),
    },
    {
      key: 'status', header: 'สถานะการส่ง', sortable: false,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <StatusBadge style={r.status === NOTIFY_STATUS.SENT ? 'success' : 'error'} size='small'>
            {r.status === NOTIFY_STATUS.SENT ? 'ส่งสำเร็จ' : 'ส่งไม่สำเร็จ'}
          </StatusBadge>
          {r.status === NOTIFY_STATUS.FAILED ? (
            <span
              style={{
                color: 'var(--text-content-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs, 12px)',
              }}
            >
              {r.failReason} · ส่งซ้ำแล้ว {r.retries} ครั้ง
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'actor', header: 'ผู้ดำเนินการ', sortable: false,
      render: (r) => <span className='truncate' style={TEXT_CELL}>{r.actor}</span>,
    },
    {
      key: 'actions', header: 'ส่งซ้ำ', sortable: false,
      render: (r) => (r.status === NOTIFY_STATUS.FAILED ? (
        <span title={canManage ? 'ส่งข้อความนี้อีกครั้ง' : NO_PERMISSION_TOOLTIP}>
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='refresh'
            disabled={!canManage}
            onClick={() => retryNotify(r.id)}
          >
            ส่งซ้ำ
          </BrandSubdueButton>
        </span>
      ) : null),
    },
  ];

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      <div className='w-full flex items-start justify-center'>
        <PrimarySearch
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          onSubmit={(v) => { setSearch(v); setPage(1); }}
          placeholder='ค้นหา ชื่อผู้รับบริการ / HN / ข้อความ'
          width={560}
        />
      </div>

      <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
        <FilterDropdown prefix='ช่องทาง:' options={CHANNEL_FILTER} value={channel} onChange={(v) => { setChannel(v); setPage(1); }} />
        <FilterDropdown prefix='ประเภท:' options={KIND_FILTER} value={kind} onChange={(v) => { setKind(v); setPage(1); }} />
        <FilterDropdown prefix='สถานะ:' options={STATUS_FILTER} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
        <NeutralSubdueButton size='sm' variant='outline' leadingIcon='print' onClick={() => printNotifyLog(filtered)}>
          พิมพ์ / ส่งออก
        </NeutralSubdueButton>
        {hasFilter ? (
          <NeutralSubdueButton size='sm' variant='outline' leadingIcon='filter_alt_off' onClick={clearFilters}>
            ล้างตัวกรอง
          </NeutralSubdueButton>
        ) : null}
      </OverflowFlexRow>

      <Table
        columns={columns}
        rows={pageRows}
        rowKey={(r) => r.id}
        emptyMessage={hasFilter ? 'ไม่พบการแจ้งเตือนที่ตรงกับตัวกรอง' : 'ยังไม่มีการแจ้งเตือนที่ส่งออก'}
        emptySubtext={hasFilter
          ? 'ลองล้างตัวกรองแล้วค้นหาใหม่อีกครั้ง'
          : 'เมื่อยืนยัน / ปฏิเสธ / เลื่อนนัด ระบบจะบันทึกข้อความที่ส่งกลับผู้รับบริการไว้ที่นี่'}
        style={{ maxHeight: 520, overflow: 'auto' }}
      />

      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
        <span
          style={{
            flex: 1,
            color: 'var(--text-content-secondary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
          }}
        >
          แสดง {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-
          {Math.min(safePage * PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ
          {' · '}ข้อมูลจำลอง (mock) — ยังไม่เชื่อมผู้ให้บริการ Push / LINE / SMS จริง
        </span>
        <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default AppointmentNotifyLogTable;
