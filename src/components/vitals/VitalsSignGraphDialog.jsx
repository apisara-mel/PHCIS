import React, { useCallback, useState } from 'react';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import VitalsGraphPopup from '@/components/popup/VitalsGraphPopup';
import VitalsSignGraph from '@/components/graph/VitalsSignGraph';

/* Reusable "ดูแบบกราฟ" affordance + VitalsGraphPopup / Popup extraLarge (PHCIS-ALL 3185:144347).
 *
 * Composes:
 *   • NeutralSubdueButton trigger (bar_chart_4_bars · ดูแบบกราฟ)
 *   • VitalsGraphPopup (title · ยกเลิก / ปิด footer)
 *   • VitalsSignGraph (TabPill vitals + chart area)
 *
 * Used in VitalsForm, treatment-record VitalsSignPanel, and anywhere
 * a read-only vitals time-series is needed. Open state can be controlled
 * via `open` + `onOpenChange` or left uncontrolled. */

const VitalsSignGraphDialog = ({
  open: openProp,
  onOpenChange,
  title = 'กราฟสัญญาณชีพ',
  subtitle,
  disabled = false,
  triggerLabel = 'ดูแบบกราฟ',
  triggerIcon = 'bar_chart_4_bars',
  triggerSize = 'sm',
  triggerVariant = 'outline',
  showTrigger = true,
  showFooter = true,
  initialTab = 'pressure',
  onSave,
  onClose,
  renderTrigger,
  className = '',
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const setOpen = useCallback((next) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  }, [isControlled, onOpenChange]);

  const handleOpen = useCallback(() => {
    if (!disabled) setOpen(true);
  }, [disabled, setOpen]);

  const handleClose = useCallback(() => {
    setOpen(false);
    onClose?.();
  }, [onClose, setOpen]);

  const handleSave = useCallback(() => {
    if (onSave) onSave();
    else handleClose();
  }, [handleClose, onSave]);

  const trigger = renderTrigger
    ? renderTrigger({ open, disabled, onOpen: handleOpen })
    : (
      <NeutralSubdueButton
        type='button'
        variant={triggerVariant}
        size={triggerSize}
        leadingIcon={triggerIcon}
        disabled={disabled}
        onClick={handleOpen}
        aria-haspopup='dialog'
        aria-expanded={open}
        className={className}
      >
        {triggerLabel}
      </NeutralSubdueButton>
    );

  return (
    <>
      {showTrigger && trigger}
      <VitalsGraphPopup
        open={open}
        onClose={handleClose}
        onSave={showFooter ? handleSave : undefined}
        title={title}
        subtitle={subtitle}
        showFooter={showFooter}
      >
        <VitalsSignGraph initialTab={initialTab} fillHeight />
      </VitalsGraphPopup>
    </>
  );
};

export default VitalsSignGraphDialog;
