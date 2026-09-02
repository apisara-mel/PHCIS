import React, { useMemo } from 'react';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { EPI_AGE_MILESTONES } from '@/data/immunizationVaccines';
import { DOSE_STATUS_META, formatImmDate, resolveDoseSource } from '@/data/immunizationClinic';

/* EpiScheduleMatrix — ตารางความครบถ้วนวัคซีน EPI รายคน (TOR §1.11.2.4):
   แถว = รายการวัคซีน · คอลัมน์ = ช่วงอายุตามตาราง EPI · ช่อง = สถานะเข็ม
   (ได้รับแล้ว / ถึงกำหนด / เกินกำหนด / ยังไม่ถึงกำหนด).

   ไม่มีใน DS: `Table` รองรับ column config แบบ dynamic อยู่แล้ว แต่ "เมทริกซ์
   เข็ม × ช่วงอายุ พร้อมสถานะและ tooltip วันครบกำหนด" เป็นรูปแบบเฉพาะของ IIS
   จึงห่อไว้เป็นคอมโพเนนต์ในโฟลเดอร์โมดูล (ใช้ <Table> ของ DS ข้างในทั้งหมด
   ไม่ได้ fork) แล้วรายงานผ่าน manifest ให้ integrator พิจารณายกขึ้น DS. */

const CellBadge = ({ cell, onCellClick }) => {
  const meta = DOSE_STATUS_META[cell.status] || DOSE_STATUS_META.upcoming;
  const title = cell.status === 'done'
    ? `เข็มที่ ${cell.seq} — ได้รับเมื่อ ${formatImmDate(cell.given?.date)}${cell.given?.otherFacility ? ` (${cell.given.facilityName || 'หน่วยงานอื่น'})` : ''}`
    : `เข็มที่ ${cell.seq} — ครบกำหนด ${formatImmDate(cell.dueDate)}`;

  /* เขียนสถานะเป็นคำในช่องไปเลย (มติผู้ใช้ 3 ก.ย. 69) — อ่านง่ายกว่าอ่านจากสี
     อย่างเดียว และไม่ต้องเทียบกับคำอธิบายสีด้านบนตาราง */
  /* เข็มที่ไม่ได้ฉีดที่ศูนย์ ต่อท้ายแหล่งที่มา (รพ.อื่น / อนามัยโรงเรียน / ออกหน่วย) */
  const source = cell.status === 'done' ? resolveDoseSource(cell.given) : null;
  const badge = (
    <ColorfulBadge style={meta.style} size='small' hierarchy='secondary'>
      {`เข็ม ${cell.seq} · ${meta.label}`}
      {source && source.key !== 'center' ? ` · ${source.short}` : ''}
    </ColorfulBadge>
  );

  if (!onCellClick) return <span title={title}>{badge}</span>;
  return (
    <button
      type='button'
      title={title}
      onClick={(e) => { e.stopPropagation(); onCellClick(cell); }}
      style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer' }}
    >
      {badge}
    </button>
  );
};

const EpiScheduleMatrix = ({ matrix = [], onCellClick, emptyMessage = 'ยังไม่มีรายการวัคซีนในโปรแกรม EPI' }) => {
  /* แสดงเฉพาะช่วงอายุที่มีเข็มอยู่จริง — กันคอลัมน์ว่างยาวเกินจอ */
  const milestones = useMemo(() => {
    const used = new Set(matrix.flatMap((r) => r.cells.map((c) => c.months)));
    return EPI_AGE_MILESTONES.filter((m) => used.has(m.months));
  }, [matrix]);

  const columns = useMemo(() => ([
    {
      key: 'vaccine',
      label: 'วัคซีน',
      flex: true,
      minWidth: 180,
      render: (row) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}>
            {row.abbr} — {row.code}
          </span>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {row.nameTh}{row.status === 'inactive' ? ' · ยกเลิกใช้แล้ว' : ''}
          </span>
        </div>
      ),
    },
    ...milestones.map((m) => ({
      key: m.key,
      label: m.label,
      align: 'center',
      sortable: false,
      render: (row) => {
        const cells = row.cells.filter((c) => c.months === m.months);
        /* ช่องที่ไม่มีเข็มปล่อยว่าง — ไม่ใส่ขีด (มติผู้ใช้ 3 ก.ย. 69) */
        if (cells.length === 0) return null;
        return (
          <div className='flex items-center justify-center flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            {cells.map((c) => (
              <CellBadge key={`${row.vaccineId}-${c.seq}`} cell={c} onCellClick={onCellClick} />
            ))}
          </div>
        );
      },
    })),
  ]), [milestones, onCellClick]);

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      <Table
        columns={columns}
        rows={matrix}
        rowKey={(row) => row.vaccineId}
        stickyColCount={1}
        emptyMessage={emptyMessage}
      />
    </div>
  );
};

export default EpiScheduleMatrix;
