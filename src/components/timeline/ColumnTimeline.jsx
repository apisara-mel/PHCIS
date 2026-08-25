import React, { useMemo } from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import GroupedTimeline from '@/components/timeline/GroupedTimeline';
import { groupTimelineEventsByMonth } from '@/components/timeline/groupTimelineByMonth';

/* MIH ColumnTimeline — timeline แนวตั้งที่แบ่งคอลัมน์ชัด (มติผู้ใช้ 25 ส.ค. 69)

   ใช้เมื่อ "ประวัติ" มีหลายฟิลด์ที่ต้องเทียบข้ามรายการ — การ์ดที่ยัดหลายฟิลด์
   ต่อบรรทัดคั่นด้วย "·" กวาดตาลงมาเทียบไม่ได้เพราะไม่มีอะไร align กัน

   โครง: grid ใช้ `gridTemplateColumns` สตริงเดียวทั้งหัวตารางและทุกแถว
   คอลัมน์จึงตรงกันเสมอ + หัวข้อเดือน sticky ผ่าน GroupedTimeline ที่ระบบ
   ใช้ร่วมกันอยู่แล้ว

   ไม่มีรางจุด/เส้นเชื่อมด้านหน้าแล้ว (มติผู้ใช้ 25 ส.ค. 69) — สถานะสื่อด้วย
   badge ท้ายแถวอยู่แล้ว จุดหน้าแถวจึงซ้ำซ้อนและเบียดพื้นที่คอลัมน์แรก

   ผู้ใช้ปัจจุบัน: ประวัติคำขอเข้าถึงข้อมูล (consent) · ประวัติสร้างการนัดหมาย
   ดู docs/awaiting-components.md */

/* ตรงกับ HeaderCell ของ <Table> เพื่อให้หัวคอลัมน์กับข้อมูลอยู่แนวเดียวกัน */
const CELL_PAD_X = 'var(--dim-space-400, 16px)';

/* กว้างขั้นต่ำก่อน scroll แนวนอน */
const MIN_ROW_WIDTH = 'var(--dim-size-2900, 640px)';

/* หัวคอลัมน์ใช้ typography ชุดเดียวกับ HeaderCell ของ <Table> (มติผู้ใช้
   25 ส.ค. 69) — fontSize ตรึง 12px ตามคอมเมนต์ใน Table.jsx ห้าม fallback ไป
   --type-size-xs เพราะจะกลายเป็น 10px ตอน data-font-size=sm */
const labelStyle = {
  color: 'var(--text-table-title, var(--brand-p800, #004C31))',
  fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
  fontSize: 'var(--type-size-table-title, 12px)',
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
  lineHeight: 1.5,
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

/**
 * @param {object}   props
 * @param {Array}    props.rows
 * @param {Array}    props.columns   — [{ key, label, track, align?, primary(row), secondary?(row) }]
 *                                     คอลัมน์สุดท้ายที่ตั้ง `badge: true` จะเรนเดอร์เป็น ColorfulBadge
 * @param {Function} props.getDateTime — (row) => "3 สิงหาคม 2569 · 02:00" ใช้จัดกลุ่มรายเดือน
 * @param {Function} props.getTone     — (row) => 'green' | 'orange' | … tone ของ badge สถานะ
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
    () => columns.map((c) => c.track).join(' '),
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
            background: 'var(--surface-table-header, var(--brand-p50, #F4FBF8))',
            minHeight: 'var(--dim-size-900, 44px)',
            alignItems: 'center',
            paddingTop: 'var(--dim-space-200, 8px)',
            paddingBottom: 'var(--dim-space-200, 8px)',
            borderBottom: 'var(--dim-stroke-200, 2px) solid var(--border-table-default, var(--brand-p100, #E2F3EB))',
          }}
        >
          {columns.map((col) => (
            <div
              key={col.key}
              role='columnheader'
              className='min-w-0 flex items-center'
              style={{
                paddingLeft: 'var(--dim-space-400, 16px)',
                paddingRight: 'var(--dim-space-400, 16px)',
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
                  {columns.map((col) => (
                    <div
                      key={col.key}
                      role='cell'
                      /* ทุกเซลล์ในแถวเดียวกันชิดบน (มติผู้ใช้ 25 ส.ค. 69) —
                         ของเดิม justify-center ทำให้ช่องบรรทัดเดียวลอยกลาง
                         เทียบกับช่องสองบรรทัด */
                      className='min-w-0 flex flex-col justify-start'
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
