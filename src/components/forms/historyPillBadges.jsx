import React from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import {
  resolveClinicalBadgeStyle,
  getClinicalBadgeLabel,
} from '@/components/badge/clinicalBadgeStyles';

/* MR / Select trigger pills — alias ColorfulBadge (Figma 2076:8413) with
   clinical palette maps from CPOE dropdowns 245:24395 · 245:24530 · 245:24603. */

export const HistoryPillBadge = ({ kind = 'severity', value }) => {
  if (!value) return null;
  const style = resolveClinicalBadgeStyle(kind, value);
  const label = getClinicalBadgeLabel(kind, value);
  return (
    <ColorfulBadge
      style={style}
      size='small'
      hierarchy='secondary'
      width='hug'
      showDot={false}
      showIcon={false}
    >
      {label}
    </ColorfulBadge>
  );
};
