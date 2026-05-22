import React from 'react';
import Popup from '@/components/popup/Popup';

/* MIH VitalsGraphPopup — Figma "Popup Very Large" (PHCIS-ALL 3185:144347 /
   2745:104642) wraps Vital sign graph in Title+Body+Footer (ยกเลิก · ปิด).
   Thin wrapper around Popup size='extraLarge' (fluid up to 1440×1024; same
   viewport logic as BodyRecordPopup). */

const VitalsGraphPopup = ({
  open,
  onClose,
  onSave,
  title = 'กราฟสัญญาณชีพ',
  subtitle,
  showFooter = true,
  children,
}) => (
  <Popup
    open={open}
    onClose={onClose}
    title={title}
    subtitle={subtitle}
    size='extraLarge'
    bodyStyle={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      padding: 'var(--dim-space-0)',
      paddingTop: 'var(--dim-space-0)',
      gap: 'var(--dim-space-0)',
      overflow: 'hidden',
    }}
    secondaryAction={showFooter ? { label: 'ยกเลิก', onClick: onClose } : undefined}
    primaryAction={showFooter ? {
      label: 'ปิด',
      onClick: () => (onSave ? onSave() : onClose?.()),
    } : undefined}
  >
    {children}
  </Popup>
);

export default VitalsGraphPopup;
