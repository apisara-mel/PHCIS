import React, { useMemo } from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import GroupedTimeline from '@/components/timeline/GroupedTimeline';
import { groupTimelineEventsByMonth } from '@/components/timeline/groupTimelineByMonth';

/* MIH ColumnTimeline — timeline แนวตั้งที่แบ่งคอลัมน์ชัด (มติผู้ใช้ 25 ส.ค. 69)

   ใช้เมื่อ "ประวัติ" มีหลายฟิลด์ที่ต้องเทียบข้ามรายการ — การ์ดที่ยัดหลายฟิลด์
   ต่อบรรทัดคั่นด้วย "·" กวาดตาลงมาเทียบไม่ได้เพราะไม่มีอะไร align กัน

   โครง: grid ใช้ `gridTemplateColumns` สตริงเดียวทั้งหัวตารางและทุกแถว
   คอลัมน์จึงตรงกันเสมอ + รางเวลาซ้ายสุด (เส้นเชื่อม + จุดสีตามสถานะ)
   + หัวข้อเดือน sticky ผ่าน GroupedTimeline ที่ระบบใช้ร่วมกันอยู่แล้ว

   จุดบนรางใช้ token ชุดเดียวกับ ColorfulBadge ของสถานะนั้น ๆ สีจึงตรงกับ
   badge ท้ายแถวเสมอโดยไม่ต้อง map สีเอง

   ผู้ใช้ปัจจุบัน: ประวัติคำขอเข้าถึงข้อมูล (consent) · ประวัติสร้างการนัดหมาย
   ดู docs/awaiting-components.md */

const RAIL_WIDTH = 'var(--dim-size-500, 24px)';
const DOT_SIZE = 'var(--dim-space-200, 8px)';
const CELL_PAD_X = 'var(--dim-space-300, 12px)';

/* กว้างขั้นต่ำก่อน scroll แนวนอน */
const MIN_ROW_WIDTH = 'var(--dim-size-2900, 640px)';

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

const dotColor = (tone) =>
  `var(--surface-colorfulbadge-${tone}-bold, var(--text-colorfulbadge-${tone}))`;

/* บรรทัดเดียว ตัดด้วย ellipsis — คอลัมน์ต้องไม่ยืดตามความยาวข้อความ */
const Line = ({ style, children }) => (
  <span
    className='block w-full truncate'
    style={style}
    title={typeof children === 'string' ? children : undefined}
  >
    {children}
  </span>
);

const Rail = ({ tone, isFirst, isLast }) => (
  /* ครึ่งบน/ครึ่งล่างแยกกัน จะได้ตัดหัวและท้ายของแต่ละกลุ่มเดือนได้ */
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
        boxShadow: '0 0 0 var(--dim-stroke-200, 2px) var(--surface-card-100)',
      }}
    />
  </div>
);

/**
 * @param {object}   props
 * @param {Array}    props.rows
 * @param {Array}    props.columns   — [{ key, label, track, align?, primary(row), secondary?(row) }]
 *                                     คอลัมน์สุดท้ายที่ตั้ง `badge: true` จะเรนเดอร์เป็น ColorfulBadge
 * @param {Function} props.getDateTime — (row) => "3 สิงหาคม 2569 · 02:00" ใช้จัดกลุ่มรายเดือน
 * @param {Function} props.getTone     — (row) => 'green' | 'orange' | … สีจุดบนราง + badge
 * @param {Function} [props.getKey]
 * @param {string}   [props.countLabel]
 * @param {string}   [props.ariaLabel]
 * @param {string}   [props.emptyTitle]
 * @param {string}   [props.emptyHint]
 */
export default function ColumnTimeline({
  rows = [],
  columns = [],
  getDateTime,
  getTone = () => 'grey',
  getKey = (row, idx) => row.id ?? idx,
  countLabel = 'รายการ',
  ariaLabel = 'ประวัติ',
  emptyTitle = 'ยังไม่มีรายการ',
  emptyHint = '',
}) {
  const gridTemplate = useMemo(
    () => [RAIL_WIDTH, ...columns.map((c) => c.track)].join(' '),
    [columns],
  );

  const groups = useMemo(
    () => groupTimelineEventsByMonth(rows, getDateTime),
    [rows, getDateTime],
  );

  if (!groups.length) {
    return (
      <div
        className='w-full flex flex-col items-center text-center'
        style={{
          gap: 'var(--dim-space-200, 8px)',
          paddingTop: 'var(--dim-space-800, 32px)',
          paddingBottom: 'var(--dim-space-800, 32px)',
        }}
      >
        <span style={primaryStyle}>{emptyTitle}</span>
        {emptyHint ? <span style={secondaryStyle}>{emptyHint}</span> : null}
      </div>
    );
  }

  const renderCell = (col, row) => {
    if (col.badge) {
      const tone = getTone(row);
      return (
        <ColorfulBadge style={tone} size='small' showDot width='hug'>
          {col.primary(row)}
        </ColorfulBadge>
      );
    }
    return (
      <>
        <Line style={primaryStyle}>{col.primary(row)}</Line>
        {col.secondary ? <Line style={secondaryStyle}>{col.secondary(row)}</Line> : null}
      </>
    );
  };

  return (
    <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
      <div role='table' aria-label={ariaLabel} className='flex flex-col'>
        {/* หัวคอลัมน์ — sticky ไว้ให้ยังอ่านได้ตอน scroll ลงลึก */}
        <div
          role='row'
          className='w-full'
          style={{
            display: 'grid',
            gridTemplateColumns: gridTemplate,
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
          {columns.map((col) => (
            <div
              key={col.key}
              role='columnheader'
              className='min-w-0 flex items-center'
              style={{
                paddingLeft: CELL_PAD_X,
                paddingRight: CELL_PAD_X,
                justifyContent: col.align === 'end' ? 'flex-end' : 'flex-start',
              }}
            >
              <Line style={labelStyle}>{col.label}</Line>
            </div>
          ))}
        </div>

        <GroupedTimeline
          groups={groups}
          countLabel={countLabel}
          stickyTop={0}
          sectionGap='var(--dim-space-400, 16px)'
          groupGap='var(--dim-space-0, 0px)'
          renderGroupBody={(group) => (
            <div role='rowgroup' className='flex flex-col w-full min-w-0'>
              {group.events.map((row, idx) => (
                <div
                  key={getKey(row, idx)}
                  role='row'
                  className='w-full items-stretch'
                  style={{
                    display: 'grid',
                    gridTemplateColumns: gridTemplate,
                    minWidth: MIN_ROW_WIDTH,
                    paddingTop: 'var(--dim-space-300, 12px)',
                    paddingBottom: 'var(--dim-space-300, 12px)',
                    borderBottom: idx === group.events.length - 1
                      ? 'none'
                      : 'var(--dim-stroke-100, 1px) solid var(--border-card-default)',
                  }}
                >
                  <Rail
                    tone={getTone(row)}
                    isFirst={idx === 0}
                    isLast={idx === group.events.length - 1}
                  />
                  {columns.map((col) => (
                    <div
                      key={col.key}
                      role='cell'
                      className='min-w-0 flex flex-col justify-center'
                      style={{
                        paddingLeft: CELL_PAD_X,
                        paddingRight: CELL_PAD_X,
                        alignItems: col.align === 'end' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      {renderCell(col, row)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        />
      </div>
    </div>
  );
}
