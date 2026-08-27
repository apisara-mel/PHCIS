import React, { useState } from 'react';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';

/* PHCIS | เวชระเบียน — ป๊อปอัป "ยังบันทึกไม่ได้" (TOR 1.1.1.13)

   เดิมตอนกดบันทึกแล้วข้อมูลไม่ครบจะขึ้น toast แดงด้านบน + แผงเตือนในหน้า +
   แถวชิปรายขั้นตอน สามชิ้นพร้อมกัน ซึ่งชิปยาวจนซ้อนทับกันอ่านไม่ออก
   (มติผู้ใช้ 27 ส.ค. 69) — ยุบเหลือป๊อปอัปเดียวที่บอกชัดว่าขาดอะไรบ้าง

   แต่ละขั้นตอนกดได้ = ปิดป๊อปอัปแล้วกระโดดไป step นั้นให้เลย ไม่ต้องไล่หาเอง */

const StepRow = ({ stepLabel, fields, index, onJump }) => {
  /* แถวกดได้ → ต้องมี hover บอกว่ากดได้ (มติผู้ใช้ 27 ส.ค. 69) */
  const [hovered, setHovered] = useState(false);
  return (
  <button
    type='button'
    onClick={onJump}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    onFocus={() => setHovered(true)}
    onBlur={() => setHovered(false)}
    className='flex items-start w-full text-left'
    style={{
      gap: 'var(--dim-space-300)',
      padding: 'var(--dim-space-300)',
      borderRadius: 'var(--dim-radius-300, 10px)',
      border: `var(--dim-stroke-100) solid ${hovered
        ? 'var(--border-brandPrimary-quaternary)'
        : 'var(--border-neutral-quaternary, #F4F5F5)'}`,
      background: hovered
        ? 'var(--surface-brandPrimary-quaternary)'
        : 'var(--surface-card-100)',
      cursor: 'pointer',
      transition: 'background-color 150ms ease-out, border-color 150ms ease-out',
    }}
  >
    {/* ลำดับขั้นตอนตรงกับตัวเลขบน stepper ด้านบนของฟอร์ม */}
    <span
      aria-hidden
      className='inline-flex items-center justify-center shrink-0'
      style={{
        width: 'var(--dim-size-500, 24px)',
        height: 'var(--dim-size-500, 24px)',
        borderRadius: 'var(--dim-radius-full)',
        background: 'var(--surface-danger-quaternary, #FEE2E2)',
        color: 'var(--text-danger-secondary, #DC2626)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        fontWeight: 'var(--type-weight-medium)',
      }}
    >
      {index + 1}
    </span>
    <span className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
      <span style={{
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-heading-content)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.5,
      }}>
        {stepLabel}
      </span>
      {/* ชื่อฟิลด์ที่ขาด — ขึ้นบรรทัดใหม่ได้ ไม่บีบให้อยู่บรรทัดเดียวจนล้น */}
      <span style={{
        color: 'var(--text-content-secondary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        lineHeight: 1.5,
        wordBreak: 'break-word',
      }}>
        {fields.join(' · ')}
      </span>
    </span>
    <Icon name='chevron_right' size={16} className='shrink-0' />
  </button>
  );
};

const MissingFieldsPopup = ({ open, onClose, report = [], onJumpToStep }) => {
  const totalFields = report.reduce((n, r) => n + r.fields.length, 0);
  return (
    <Popup
      open={open}
      onClose={onClose}
      title='ยังบันทึกไม่ได้ — ข้อมูลที่จำเป็นยังไม่ครบ'
      subtitle={`ขาดข้อมูล ${totalFields} รายการ ใน ${report.length} ขั้นตอน — กดที่ขั้นตอนเพื่อไปกรอกต่อ`}
      size='default'
      showCloseButton
      actions={[
        { key: 'close', kind: 'tertiary', label: 'ปิด', onClick: onClose },
        ...(report.length > 0 ? [{
          key: 'jump',
          kind: 'primary',
          leadingIcon: 'edit',
          label: `ไปกรอกที่ ${report[0].stepLabel}`,
          onClick: () => onJumpToStep?.(report[0].stepIndex),
        }] : []),
      ]}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
        {report.map((r, i) => (
          <StepRow
            key={r.stepIndex}
            index={i}
            stepLabel={r.stepLabel}
            fields={r.fields}
            onJump={() => onJumpToStep?.(r.stepIndex)}
          />
        ))}
      </div>
    </Popup>
  );
};

export default MissingFieldsPopup;
