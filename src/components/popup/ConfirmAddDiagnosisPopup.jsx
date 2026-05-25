import React from 'react';
import Popup from '@/components/popup/Popup';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';

/* MIH ConfirmAddDiagnosisPopup — Figma PHCIS | Medical-examination
   339:42259. Confirmation gate that fires when the clinician picks an
   ICD-10 row out of the Doctor AI search dropdown — gives them one
   "are you sure?" step before the row is appended to the ICD table.

   Layout (centred, default 448 px popup width):
     • Brand-green info-circle icon (24 px) at the top.
     • Bold prompt  "คุณต้องการเพิ่มรหัสนี้ ในรหัสการวินิจฉัย"
     • Picked ICD code badge (secondary blue)
     • Picked diagnosis name (muted body text)
     • 50/50 footer:
         - "ไม่เพิ่ม"   → BrandSubdueButton outline (white bg, green text)
         - "เพิ่มรหัส"  → BrandPrimaryButton fill (white-on-green)

   The base Popup chrome still renders the close X top-right; clicking
   it / Esc / overlay click fires `onClose` only (same as ไม่เพิ่ม).
   Only the green เพิ่มรหัส button fires `onConfirm`. */

const Sym = ({ name, size = 16, color }) => (
  <span
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
    }}
    aria-hidden
  >
    {name}
  </span>
);

const ConfirmAddDiagnosisPopup = ({
  open,
  onClose,
  onConfirm,
  /** Picked ICD record: { code, name }. */
  diagnosis,
  title = 'คุณต้องการเพิ่มรหัสนี้ ในรหัสการวินิจฉัย',
  cancelLabel = 'ไม่เพิ่ม',
  confirmLabel = 'เพิ่มรหัส',
}) => {
  return (
    <Popup
      open={open}
      onClose={onClose}
      /* Title/subtitle intentionally omitted on the Popup props so we
         can center the title inside the body alongside the info icon
         (Popup header would left-align by default). */
      footer={(
        <div
          className='flex w-full items-center'
          style={{ gap: 'var(--dim-space-300, 12px)' }}
        >
          <BrandSubdueButton
            variant='outline'
            size='md'
            onClick={onClose}
            className='flex-1'
          >
            {cancelLabel}
          </BrandSubdueButton>
          <BrandPrimaryButton
            onClick={onConfirm}
            className='flex-1'
          >
            {confirmLabel}
          </BrandPrimaryButton>
        </div>
      )}
    >
      <div
        className='flex flex-col items-center text-center'
        style={{ gap: 'var(--dim-space-300, 12px)', padding: 'var(--dim-space-200, 8px) 0' }}
      >
        <span
          className='inline-flex items-center justify-center'
          style={{
            width: 24,
            height: 24,
            borderRadius: 'var(--dim-radius-500, 16px)',
            border: 'var(--dim-stroke-150, 1.5px) solid var(--text-brandprimary-default, #007549)',
            color: 'var(--text-brandprimary-default, #007549)',
          }}
          aria-hidden
        >
          <Sym name='info_i' size={16} color='currentColor' />
        </span>
        <span
          style={{
            color: 'var(--text-modal-text, #4D5358)',
            fontFamily: 'var(--type-family-heading-content)',
            fontSize: 'var(--type-size-base, 16px)',
            fontWeight: 'var(--type-weight-bold)',
            lineHeight: 1.5,
          }}
        >
          {title}
        </span>
        {diagnosis?.code && (
          <ColorfulBadge style='blue' size='small' width='hug' hierarchy='primary'>
            {diagnosis.code}
          </ColorfulBadge>
        )}
        {diagnosis?.name && (
          <span
            style={{
              color: 'var(--text-content-tertiary, #858C92)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.5,
            }}
          >
            {diagnosis.name}
          </span>
        )}
      </div>
    </Popup>
  );
};

export default ConfirmAddDiagnosisPopup;
