import React from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Tooltip from '@/components/tooltip/Tooltip';
import { OVERSTAY_LIMIT_MINUTES } from '@/data/observationMock';

const OVERSTAY_HOURS = OVERSTAY_LIMIT_MINUTES / 60;

export const overstayTooltipContent = (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--dim-space-100, 4px)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm, 14px)',
      lineHeight: 1.5,
      textAlign: 'left',
    }}
  >
    <strong
      style={{
        fontWeight: 'var(--type-weight-bold)',
        color: 'var(--text-content-default)',
      }}
    >
      {`Overstay Warning (เกิน ${OVERSTAY_HOURS} ชม.)`}
    </strong>
    <span style={{ color: 'var(--text-content-secondary)' }}>
      แจ้งแพทย์ผู้ดูแลประเมินซ้ำ (Re-evaluate) เพื่อตัดสินใจ Admit IPD หรือส่งต่อ
    </span>
  </div>
);

/**
 * Orange overstay pill — full warning copy lives in the hover tooltip.
 * @param {{ iconOnly?: boolean, className?: string }} props
 */
export default function OverstayBadge({ iconOnly = false, className = '' }) {
  const badge = (
    <ColorfulBadge
      width='hug'
      style='orange'
      icon='hourglass_top'
      showText={!iconOnly}
    >
      {iconOnly ? undefined : `เกิน ${OVERSTAY_HOURS} ชม.`}
    </ColorfulBadge>
  );

  return (
    <Tooltip
      variant='light'
      position='bottom'
      maxWidth={320}
      wrap
      content={overstayTooltipContent}
    >
      <span className={`inline-flex cursor-default ${className}`.trim()}>{badge}</span>
    </Tooltip>
  );
}
