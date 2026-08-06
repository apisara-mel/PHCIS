import React, { useMemo } from 'react';
import Checkbox from '@/components/checkbox/Checkbox';
import { normalizeFieldKeys } from '@/data/consentFormFieldKeys';

/** Checkbox row for consent wizard field keys (patient info / signatures). */
export default function ConsentFieldCheckboxGroup({
  fields,
  value,
  onSetField,
  fallback = [],
}) {
  const selectedKeys = useMemo(
    () => new Set(normalizeFieldKeys(value, fallback)),
    [value, fallback],
  );

  return (
    <div
      className='flex items-center flex-wrap'
      style={{ gap: 'var(--dim-space-400) var(--dim-space-600)' }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {fields.map((f) => (
        <Checkbox
          key={f.key}
          checked={selectedKeys.has(f.key)}
          onChange={(checked) => {
            if (typeof onSetField !== 'function') {
              console.error('[ConsentFieldCheckboxGroup] missing onSetField for', f.key);
              return;
            }
            onSetField(f.key, checked === true);
          }}
          label={f.label}
        />
      ))}
    </div>
  );
}
