import React from 'react';
import Badge from '@/components/badge/Badge';
import Tooltip from '@/components/tooltip/Tooltip';

/* ยาในบัญชี / ยานอกบัญชี badge with hover tip — ToR §1.9.2.4 NLEM status. */

export const FORMULARY_IN_TIP =
  'อยู่ในบัญชียาหลักแห่งชาติ (NLEM) - โดยทั่วไปเบิกตามสิทธิได้ตามเงื่อนไข';

export const FORMULARY_OUT_TIP =
  'ไม่อยู่ในบัญชียาหลัก - มักต้องชำระเอง หรือมีเอกสาร/เหตุผลประกอบการสั่งใช้';

const FormularyStatusBadge = ({ inFormulary = true, size = 'small', onlyOut = false }) => {
  if (onlyOut && inFormulary) return null;
  const label = inFormulary ? 'ยาในบัญชี' : 'ยานอกบัญชี';
  const tip = inFormulary ? FORMULARY_IN_TIP : FORMULARY_OUT_TIP;
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
        <Badge style={inFormulary ? 'success' : 'warning'} size={size}>
          {label}
        </Badge>
      </span>
    </Tooltip>
  );
};

export default FormularyStatusBadge;
