import React from 'react';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { compareCellStatus, formatShortThaiDate } from '@/data/checkupStore';
import { EmptyState } from '@/pages/checkup/CheckupUi';

/* CheckupCompareTable — ตารางเปรียบเทียบผลตรวจข้ามครั้ง (TOR 1.19.12).

   NOT in the design system: the generic `<Table>` orchestrator pins its sticky
   columns by fixed pixel width taken from `column.width`, which works for
   row-per-record worklists. This view is transposed — rows are metrics and
   columns are visits, so the number of columns is data-driven and the first
   column must stay pinned while an arbitrary number of visit columns scroll.
   Building it on `<Table>` would mean generating a column config per visit and
   still not getting the metric-name pinning right. Reported as a new component
   through the manifest.

   Chrome (surfaces, borders, header tint, hover, radii) aliases exactly the
   same tokens `<Table>` uses so the two read as one family. */

/* Pinned metric column width. Aliases dimension.size.2450 (280px) rather than
   a literal — the visit columns keep the numeric contract that <Table> uses for
   its own `column.width` config. */
const METRIC_COL_W = 'var(--dim-size-2450, 280px)';

const STATUS_TINT = {
  abnormal: {
    bg: 'var(--surface-colorfulbadge-red, #FEE2E2)',
    fg: 'var(--text-colorfulbadge-red, #B91C1C)',
  },
  normal: {
    bg: 'var(--surface-colorfulbadge-green, #E2F3EB)',
    fg: 'var(--text-colorfulbadge-green, #007549)',
  },
  'no-criteria': {
    bg: 'transparent',
    fg: 'var(--text-content-secondary, #636B72)',
  },
  plain: {
    bg: 'transparent',
    fg: 'var(--text-content-default, #363B3F)',
  },
  empty: {
    bg: 'transparent',
    fg: 'var(--text-content-quaternary, #ADB2B7)',
  },
};

const HeadCell = ({ children, sticky, width, align = 'left' }) => (
  <th
    scope='col'
    style={{
      minWidth: width,
      width,
      textAlign: align,
      verticalAlign: 'bottom',
      position: sticky ? 'sticky' : undefined,
      left: sticky ? 0 : undefined,
      zIndex: sticky ? 3 : 2,
      background: 'var(--surface-table-header, #F4FBF8)',
      borderBottom: 'var(--dim-stroke-200, 2px) solid var(--border-table-default, #E2F3EB)',
      paddingTop: 'var(--dim-space-300)',
      paddingBottom: 'var(--dim-space-300)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
      fontSize: 'var(--type-size-xs, 12px)',
      fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
      color: 'var(--text-table-title, #004C31)',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </th>
);

const TrendMark = ({ trend, better }) => {
  if (!trend) return null;
  if (trend.direction === 'flat') {
    return (
      <span
        className='inline-flex items-center'
        title='ไม่เปลี่ยนแปลงจากครั้งแรก'
        style={{ gap: 'var(--dim-space-100)', color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-xs, 12px)' }}
      >
        <Icon name='trending_flat' size={16} />
        คงที่
      </span>
    );
  }
  const improved = trend.improved;
  const color = improved
    ? 'var(--text-brandPrimary-default, #007549)'
    : 'var(--text-alert-error, #B91C1C)';
  const arrow = trend.direction === 'up' ? 'arrow_upward' : 'arrow_downward';
  return (
    <span
      className='inline-flex items-center'
      title={`${trend.direction === 'up' ? 'เพิ่มขึ้น' : 'ลดลง'} ${Math.abs(trend.delta)} จากครั้งแรก — ${improved ? 'ดีขึ้น' : 'แย่ลง'} (ค่าที่ดีคือ${better === 'higher' ? 'สูงขึ้น' : 'ต่ำลง'})`}
      style={{ gap: 'var(--dim-space-100)', color, fontSize: 'var(--type-size-xs, 12px)', whiteSpace: 'nowrap' }}
    >
      <Icon name={arrow} size={16} />
      {`${improved ? 'ดีขึ้น' : 'แย่ลง'} ${Math.abs(trend.delta)}`}
    </span>
  );
};

const CheckupCompareTable = ({ comparison, onSelectVisit }) => {
  const { visits = [], rows = [] } = comparison || {};

  if (visits.length === 0) {
    return (
      <EmptyState
        icon='compare_arrows'
        title='ยังไม่มีผลตรวจที่สรุปแล้วสำหรับเปรียบเทียบ'
        subtitle='ตารางเปรียบเทียบจะแสดงเมื่อผู้รับบริการมีผลตรวจที่สรุปผลแล้วอย่างน้อย 1 ครั้ง'
      />
    );
  }

  const withData = rows.filter((r) => r.values.some((v) => v != null));

  if (withData.length === 0) {
    return (
      <EmptyState
        icon='compare_arrows'
        title='ยังไม่มีค่าตรวจที่เทียบกันได้'
        subtitle='ผลตรวจที่บันทึกไว้ยังไม่มีรายการที่เป็นค่าตัวเลข จึงยังเปรียบเทียบข้ามครั้งไม่ได้'
      />
    );
  }

  return (
    <div
      className='w-full'
      style={{
        border: 'var(--dim-stroke-100) solid var(--border-table-default, #E2F3EB)',
        borderRadius: 'var(--dim-radius-400, 12px)',
        overflowX: 'auto',
      }}
    >
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%' }}>
        <caption
          style={{
            captionSide: 'top',
            textAlign: 'left',
            paddingTop: 'var(--dim-space-300)',
            paddingBottom: 'var(--dim-space-300)',
            paddingLeft: 'var(--dim-space-400)',
            paddingRight: 'var(--dim-space-400)',
            background: 'var(--surface-table-header, #F4FBF8)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-secondary, #636B72)',
          }}
        >
          เปรียบเทียบค่าตรวจสำคัญข้ามครั้ง — คอลัมน์คือครั้งที่ตรวจ (เรียงจากเก่าไปใหม่) · แถวคือรายการตรวจ ·
          ลูกศรเทียบครั้งแรกกับครั้งล่าสุด · พื้นแดง = ผิดปกติ, พื้นเขียว = ปกติ
        </caption>
        <thead>
          <tr>
            <HeadCell sticky width={METRIC_COL_W}>รายการตรวจ</HeadCell>
            {visits.map((v) => (
              <HeadCell key={v.id} width={150} align='right'>
                <span className='flex flex-col items-end' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                  <span>{`ครั้งที่ ${v.round || 1}`}</span>
                  <span style={{ fontWeight: 'var(--type-weight-regular, 400)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    {formatShortThaiDate(v.visitDate)}
                  </span>
                </span>
              </HeadCell>
            ))}
            <HeadCell width={170}>แนวโน้ม</HeadCell>
          </tr>
        </thead>
        <tbody>
          {withData.map((row) => (
            <tr key={row.code}>
              <th
                scope='row'
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  minWidth: METRIC_COL_W,
                  width: METRIC_COL_W,
                  textAlign: 'left',
                  background: 'var(--surface-table-default, #FFFFFF)',
                  borderBottom: 'var(--dim-stroke-100) solid var(--border-table-line, #F4FBF8)',
                  borderRight: 'var(--dim-stroke-100) solid var(--border-table-default, #E2F3EB)',
                  paddingTop: 'var(--dim-space-300)',
                  paddingBottom: 'var(--dim-space-300)',
                  paddingLeft: 'var(--dim-space-400)',
                  paddingRight: 'var(--dim-space-400)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  color: 'var(--text-content-default, #363B3F)',
                }}
              >
                <span className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                  <span>{row.label}</span>
                  <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    {`หน่วย ${row.unit} · ค่าที่ดีคือ${row.better === 'higher' ? 'สูงขึ้น' : 'ต่ำลง'}`}
                  </span>
                </span>
              </th>
              {row.values.map((value, idx) => {
                const status = compareCellStatus(row, value, visits[idx]);
                const tint = STATUS_TINT[status] || STATUS_TINT.plain;
                return (
                  <td
                    key={visits[idx].id}
                    onClick={value != null && onSelectVisit ? () => onSelectVisit(idx) : undefined}
                    style={{
                      textAlign: 'right',
                      background: tint.bg === 'transparent' ? 'var(--surface-table-default, #FFFFFF)' : tint.bg,
                      color: tint.fg,
                      borderBottom: 'var(--dim-stroke-100) solid var(--border-table-line, #F4FBF8)',
                      paddingTop: 'var(--dim-space-300)',
                      paddingBottom: 'var(--dim-space-300)',
                      paddingLeft: 'var(--dim-space-400)',
                      paddingRight: 'var(--dim-space-400)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm, 14px)',
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                      cursor: value != null && onSelectVisit ? 'pointer' : 'default',
                    }}
                  >
                    {value == null ? '—' : value}
                  </td>
                );
              })}
              <td
                style={{
                  background: 'var(--surface-table-default, #FFFFFF)',
                  borderBottom: 'var(--dim-stroke-100) solid var(--border-table-line, #F4FBF8)',
                  paddingTop: 'var(--dim-space-300)',
                  paddingBottom: 'var(--dim-space-300)',
                  paddingLeft: 'var(--dim-space-400)',
                  paddingRight: 'var(--dim-space-400)',
                }}
              >
                {row.trend
                  ? <TrendMark trend={row.trend} better={row.better} />
                  : <ColorfulBadge style='grey' size='small' hierarchy='secondary'>มีข้อมูลครั้งเดียว</ColorfulBadge>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CheckupCompareTable;
