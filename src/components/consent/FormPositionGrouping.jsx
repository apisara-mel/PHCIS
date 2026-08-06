import React, { useMemo } from 'react';
import { CONSENT_POSITION_OPTIONS, resolveRecordPositions } from '@/data/consentFormScopes';

const POSITION_TEXT = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
};

const EMPTY_TEXT = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

const PANEL = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--dim-space-300)',
  padding: 'var(--dim-space-400)',
  borderRadius: 'var(--dim-radius-200, 8px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
  background: 'var(--surface-card-100, #FFFFFF)',
};

function splitIntoColumns(items, columnCount = 2) {
  const n = Math.max(1, columnCount);
  const perCol = Math.ceil(items.length / n);
  return Array.from({ length: n }, (_, i) =>
    items.slice(i * perCol, (i + 1) * perCol),
  ).filter((col) => col.length > 0);
}

/** ตำแหน่งที่มีสิทธิเข้าถึงได้ — แสดงเฉพาะที่อนุญาต (ไม่มี checkbox). */
export default function FormPositionGrouping({
  positions,
  source,
  columns = 2,
  variant = 'panel',
}) {
  const selectedLabels = useMemo(() => {
    const values = positions ?? resolveRecordPositions(source);
    const set = new Set(values);
    return CONSENT_POSITION_OPTIONS
      .filter((o) => set.has(o.value))
      .map((o) => o.label);
  }, [positions, source]);

  if (!selectedLabels.length) {
    return <span style={EMPTY_TEXT}>—</span>;
  }

  const cols = splitIntoColumns(selectedLabels, columns);
  const isPanel = variant === 'panel';

  const list = (
    <div
      className='grid w-full min-w-0'
      style={{
        gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))`,
        gap: 'var(--dim-space-500)',
      }}
    >
      {cols.map((col, colIdx) => (
        <ul
          key={colIdx}
          className='flex flex-col min-w-0'
          style={{
            gap: 'var(--dim-space-100)',
            margin: 0,
            padding: 0,
            listStyle: 'none',
          }}
        >
          {col.map((label) => (
            <li key={label} className='min-w-0'>
              <span style={POSITION_TEXT}>{label}</span>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );

  if (isPanel) {
    return (
      <div className='w-full min-w-0' style={PANEL}>
        {list}
      </div>
    );
  }

  return list;
}
