import React from 'react';
import Checkbox from '@/components/checkbox/Checkbox';
import { CONSENT_POSITION_OPTIONS } from '@/data/consentFormScopes';

const PANEL = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--dim-space-300)',
  padding: 'var(--dim-space-400)',
  borderRadius: 'var(--dim-radius-200, 8px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
  background: 'var(--surface-card-100, #FFFFFF)',
};

/** เลือกตำแหน่งที่มีสิทธิเข้าถึงได้ — ลิสต์ครบทุกตำแหน่ง. */
export default function FormPositionEditor({
  options = CONSENT_POSITION_OPTIONS,
  value = [],
  onChange,
  columns = 2,
  readOnly = false,
}) {
  const selected = new Set(value);

  const toggle = (posValue) => {
    if (readOnly) return;
    const next = new Set(selected);
    if (next.has(posValue)) next.delete(posValue);
    else next.add(posValue);
    onChange?.([...next]);
  };

  const colCount = Math.max(1, columns);
  const perCol = Math.ceil(options.length / colCount);
  const cols = Array.from({ length: colCount }, (_, i) =>
    options.slice(i * perCol, (i + 1) * perCol),
  ).filter((col) => col.length > 0);

  return (
    <div style={PANEL}>
      <div
        className='grid w-full min-w-0'
        style={{
          gridTemplateColumns: columns > 2
            ? 'repeat(auto-fit, minmax(var(--dim-size-2000, 128px), 1fr))'
            : `repeat(${cols.length}, minmax(0, 1fr))`,
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
            {col.map(({ value: posValue, label }) => (
              <li key={posValue} className='min-w-0'>
                <Checkbox
                  className='w-fit max-w-full'
                  checked={selected.has(posValue)}
                  onChange={() => toggle(posValue)}
                  label={label}
                  disabled={readOnly}
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
