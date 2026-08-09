import React from 'react';
import Badge from '@/components/badge/Badge';
import Tooltip from '@/components/tooltip/Tooltip';

/* ยานอกสิทธิ — shown only when this line is outside the patient's coverage
   (ToR §1.9.2.9). Distinct from ยานอกบัญชี (NLEM / FormularyStatusBadge). */

export const OUT_OF_RIGHTS_TIP =
  'ไม่อยู่ในสิทธิการรักษาของผู้ป่วย — ต้องมีเอกสารประกอบ หรือให้ผู้ป่วยชำระเงินเอง';

const OutOfRightsBadge = ({ size = 'small', rightsLabel }) => {
  const tip = rightsLabel
    ? `${OUT_OF_RIGHTS_TIP} (สิทธิปัจจุบัน: ${rightsLabel})`
    : OUT_OF_RIGHTS_TIP;
  return (
    <Tooltip
      variant='light'
      position='top'
      maxWidth={320}
      content={(
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            lineHeight: 1.5,
            color: 'var(--text-content-secondary, #5F676D)',
          }}
        >
          {tip}
        </span>
      )}
    >
      <span className='inline-flex cursor-default'>
        <Badge style='error' size={size}>
          ยานอกสิทธิ
        </Badge>
      </span>
    </Tooltip>
  );
};

export default OutOfRightsBadge;
