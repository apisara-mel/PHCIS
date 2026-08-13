import React from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';

/* Per-medication CPOE instruction shown across pharmacy worklists/history.
   Legacy rows predate `orderStatus`, so they remain active by default. */
const STATUS_META = {
  continue: { style: 'green', label: 'Continue' },
  discontinue: { style: 'red', label: 'Discontinue' },
  completed: { style: 'teal', label: 'Completed' },
  'on-hold': { style: 'orange', label: 'On hold' },
};

const formatDateTime = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('th-TH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const PharmacyMedicationOrderStatusBadge = ({
  status,
  effectiveMode,
  effectiveAt,
  lastDoseAt,
  reason,
  showDetails = false,
}) => {
  const meta = STATUS_META[status] || STATUS_META.continue;
  const effectiveLabel = status !== 'continue'
    ? (effectiveMode === 'scheduled' && effectiveAt
      ? `มีผล ${formatDateTime(effectiveAt)}`
      : 'มีผลทันที')
    : '';
  return (
    <span className='inline-flex flex-col items-center' style={{ gap: 'var(--dim-space-050)' }}>
      <ColorfulBadge
        style={meta.style}
        size='small'
        width='hug'
        showDot
      >
        {meta.label}
      </ColorfulBadge>
      {showDetails && effectiveLabel ? (
        <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>
          {effectiveLabel}
        </span>
      ) : null}
      {showDetails && lastDoseAt ? (
        <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>
          ครั้งสุดท้าย {formatDateTime(lastDoseAt)}
        </span>
      ) : null}
      {showDetails && reason ? (
        <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>
          {reason}
        </span>
      ) : null}
    </span>
  );
};

export default PharmacyMedicationOrderStatusBadge;
