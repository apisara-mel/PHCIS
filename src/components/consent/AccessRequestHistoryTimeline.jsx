import React, { useMemo } from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import GroupedTimeline from '@/components/timeline/GroupedTimeline';
import { groupTimelineEventsByMonth } from '@/components/timeline/groupTimelineByMonth';
import { ACCESS_STATUS } from '@/data/accessRecords';

/* ประวัติคำขอเข้าถึงข้อมูล — timeline แบ่งคอลัมน์ (มติผู้ใช้ 25 ส.ค. 69)

   เดิมเป็นการ์ดเรียงกันโดยยัด 2 ฟิลด์ต่อบรรทัดคั่นด้วย "·" ทำให้กวาดตาลงมา
   เทียบข้อมูลข้ามรายการไม่ได้ (ไม่มีอะไร align กัน) และไม่มีหัวคอลัมน์บอกว่า
   วันที่ที่เห็นคือวันที่ยื่นคำขอ ไม่ใช่ช่วงเวลาที่ขอเข้าถึง

   โครงใหม่ = grid คอลัมน์ตายตัวทุกแถว + รางเวลา (เส้น + จุดสีตามสถานะ) ทาง
   ซ้าย + หัวข้อเดือนแบบ sticky (ใช้ GroupedTimeline ร่วมกับ timeline อื่นใน
   ระบบ) จุดบนรางใช้ token สีเดียวกับ ColorfulBadge ของสถานะนั้น ๆ

   คอลัมน์แยก "ผู้ขอ" ออกจาก "ผู้รับบริการ" — ของเดิมใช้
   `patientName || name` ช่องเดียว ซึ่งเป็นคนละคนกันแต่แสดงที่เดียวกัน */

const RAIL_WIDTH = 'var(--dim-size-500, 24px)';
const DOT_SIZE = 'var(--dim-space-200, 8px)';

const COLUMNS = [
  { key: 'when',    label: 'วันที่ / เวลา',  track: 'var(--dim-size-2000, 128px)' },
  { key: 'reqNo',   label: 'เลขคำขอ',       track: 'var(--dim-size-2000, 128px)' },
  { key: 'by',      label: 'ผู้ขอ',          track: 'minmax(var(--dim-size-2100, 160px), 1.1fr)' },
  { key: 'patient', label: 'ผู้รับบริการ',    track: 'minmax(var(--dim-size-2100, 160px), 1.1fr)' },
  { key: 'reason',  label: 'วัตถุประสงค์',    track: 'minmax(var(--dim-size-2100, 160px), 1.4fr)' },
  { key: 'status',  label: 'สถานะ',          track: 'var(--dim-size-2000, 128px)' },
];

/* rail + คอลัมน์ — ใช้สตริงเดียวกันทั้งหัวตารางและทุกแถว คอลัมน์จึงตรงกันเสมอ */
const GRID_TEMPLATE = [RAIL_WIDTH, ...COLUMNS.map((c) => c.track)].join(' ');

/* กว้างขั้นต่ำก่อน scroll แนวนอน — ผลรวม track ที่ตายตัว + minmax ขั้นต่ำ */
const MIN_ROW_WIDTH = 'var(--dim-size-2900, 640px)';

const CELL_PAD_X = 'var(--dim-space-300, 12px)';

const labelStyle = {
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  fontWeight: 'var(--type-weight-medium, 500)',
  color: 'var(--text-content-tertiary)',
  lineHeight: 1.4,
};

const primaryStyle = {
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-medium, 500)',
  color: 'var(--text-content-primary)',
  lineHeight: 1.45,
};

const secondaryStyle = {
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  fontWeight: 'var(--type-weight-regular, 400)',
  color: 'var(--text-content-tertiary)',
  lineHeight: 1.4,
};

/* จุดบนราง — ใช้ token ชุดเดียวกับ ColorfulBadge ของสถานะนั้น (bold ถ้ามี) */
const dotColor = (tone) =>
  `var(--surface-colorfulbadge-${tone}-bold, var(--text-colorfulbadge-${tone}))`;

const Cell = ({ children, align = 'start' }) => (
  <div
    role='cell'
    className='min-w-0 flex flex-col justify-center'
    style={{
      paddingLeft: CELL_PAD_X,
      paddingRight: CELL_PAD_X,
      alignItems: align === 'end' ? 'flex-end' : 'flex-start',
    }}
  >
    {children}
  </div>
);

/* บรรทัดเดียว ตัดด้วย ellipsis — คอลัมน์ต้องไม่ยืดตามความยาวข้อความ */
const Line = ({ style, title, children }) => (
  <span
    className='block w-full truncate'
    style={style}
    title={typeof children === 'string' ? children : title}
  >
    {children}
  </span>
);

const HistoryRow = ({ record, isFirst, isLast }) => {
  const tone = ACCESS_STATUS[record.status]?.tone || 'grey';
  return (
    <div
      role='row'
      className='w-full items-stretch'
      style={{
        display: 'grid',
        gridTemplateColumns: GRID_TEMPLATE,
        minWidth: MIN_ROW_WIDTH,
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        borderBottom: isLast
          ? 'none'
          : 'var(--dim-stroke-100, 1px) solid var(--border-card-default)',
      }}
    >
      {/* ราง: ครึ่งบน/ครึ่งล่างแยกกัน จะได้ตัดหัวและท้ายกลุ่มได้ */}
      <div className='relative flex justify-center' aria-hidden>
        <span
          className='absolute'
          style={{
            top: 0,
            bottom: '50%',
            width: 'var(--dim-stroke-100, 1px)',
            background: isFirst ? 'transparent' : 'var(--border-card-default)',
          }}
        />
        <span
          className='absolute'
          style={{
            top: '50%',
            bottom: 0,
            width: 'var(--dim-stroke-100, 1px)',
            background: isLast ? 'transparent' : 'var(--border-card-default)',
          }}
        />
        <span
          className='absolute rounded-full'
          style={{
            top: `calc(50% - ${DOT_SIZE} / 2)`,
            width: DOT_SIZE,
            height: DOT_SIZE,
            background: dotColor(tone),
            boxShadow: `0 0 0 var(--dim-stroke-200, 2px) var(--surface-card-100)`,
          }}
        />
      </div>

      <Cell>
        <Line style={primaryStyle}>{record.createdTime}</Line>
        <Line style={secondaryStyle}>{record.createdDate}</Line>
      </Cell>

      <Cell>
        <Line style={primaryStyle}>{record.reqNo}</Line>
        <Line style={secondaryStyle}>{record.formCode}</Line>
      </Cell>

      <Cell>
        <Line style={primaryStyle}>{record.name}</Line>
        <Line style={secondaryStyle}>{record.dept || record.group}</Line>
      </Cell>

      <Cell>
        <Line style={primaryStyle}>{record.patientName || '—'}</Line>
        <Line style={secondaryStyle}>{record.hn ? `HN ${record.hn}` : '—'}</Line>
      </Cell>

      <Cell>
        <Line style={primaryStyle}>{record.reason}</Line>
        <Line style={secondaryStyle}>{record.purpose}</Line>
      </Cell>

      <Cell align='end'>
        <ColorfulBadge style={tone} size='small' showDot width='hug'>
          {record.status}
        </ColorfulBadge>
      </Cell>
    </div>
  );
};

const HeaderRow = () => (
  <div
    role='row'
    className='w-full'
    style={{
      display: 'grid',
      gridTemplateColumns: GRID_TEMPLATE,
      minWidth: MIN_ROW_WIDTH,
      position: 'sticky',
      top: 0,
      zIndex: 2,
      background: 'var(--surface-card-100)',
      paddingTop: 'var(--dim-space-200, 8px)',
      paddingBottom: 'var(--dim-space-200, 8px)',
      borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-card-default)',
    }}
  >
    <div aria-hidden />
    {COLUMNS.map((col) => (
      <div
        key={col.key}
        role='columnheader'
        className='min-w-0 flex items-center'
        style={{
          paddingLeft: CELL_PAD_X,
          paddingRight: CELL_PAD_X,
          justifyContent: col.key === 'status' ? 'flex-end' : 'flex-start',
        }}
      >
        <Line style={labelStyle}>{col.label}</Line>
      </div>
    ))}
  </div>
);

/**
 * @param {object} props
 * @param {Array} props.records — ACCESS_RECORDS (หรือชุดที่กรองแล้ว)
 */
export default function AccessRequestHistoryTimeline({ records = [] }) {
  const groups = useMemo(
    () => groupTimelineEventsByMonth(
      records,
      (r) => `${r.createdDate} · ${r.createdTime}`,
    ),
    [records],
  );

  if (!groups.length) {
    return (
      <div
        className='w-full flex flex-col items-center text-center'
        style={{ gap: 'var(--dim-space-200, 8px)', paddingTop: 'var(--dim-space-800, 32px)', paddingBottom: 'var(--dim-space-800, 32px)' }}
      >
        <span style={primaryStyle}>ยังไม่มีคำขอเข้าถึงข้อมูล</span>
        <span style={secondaryStyle}>คำขอที่สร้างจากเมนู “สร้างคำขอเข้าถึงข้อมูล” จะมาแสดงที่นี่</span>
      </div>
    );
  }

  return (
    <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
      <div role='table' aria-label='ประวัติคำขอเข้าถึงข้อมูล' className='flex flex-col'>
        <HeaderRow />
        <GroupedTimeline
          groups={groups}
          countLabel='คำขอ'
          stickyTop={0}
          sectionGap='var(--dim-space-400, 16px)'
          groupGap='var(--dim-space-0, 0px)'
          renderGroupBody={(group) => (
            <div role='rowgroup' className='flex flex-col w-full min-w-0'>
              {group.events.map((record, idx) => (
                <HistoryRow
                  key={record.id ?? record.reqNo}
                  record={record}
                  isFirst={idx === 0}
                  isLast={idx === group.events.length - 1}
                />
              ))}
            </div>
          )}
        />
      </div>
    </div>
  );
}
