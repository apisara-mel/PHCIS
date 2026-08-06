import React from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';

/* Inline unread lab-result counter — Figma treatment record nav pills
   (light red/100 surface · red/700 numeral). Hide at zero; cap at 99+. */

const LabNotificationCountBadge = ({ count, className = '', ...rest }) => {
  if (!count || count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);

  return (
    <span
      className={`inline-flex shrink-0 items-center ${className}`}
      aria-label={`ผลแล็บใหม่ ${label} รายการ`}
      {...rest}
    >
      <ColorfulBadge
        style='red'
        size='small'
        fill='default'
        hierarchy='secondary'
        width='hug'
      >
        {label}
      </ColorfulBadge>
    </span>
  );
};

export default LabNotificationCountBadge;
