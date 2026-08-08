import React, { useState } from 'react';
import Popup from '@/components/popup/Popup';
import PharmacyRegistryEditor from '@/components/pharmacy/PharmacyRegistryEditor';

/* ExtraLarge edit popup for drug registry rows — same 4-step wizard as
   `/pharmacy/registry/:id`, shared via PharmacyRegistryEditor variant='popup'.
   Footer / header back are driven by onStateChange (AccessRequestForm pattern). */

const EMPTY_API = {
  title: 'แก้ไขทะเบียนยา',
  subtitle: undefined,
  step: 0,
  nextLabel: 'ถัดไป',
  canAdvance: false,
  goNext: () => {},
  goBack: () => {},
  cancel: () => {},
};

const PharmacyRegistryEditPopup = ({ open, drugId, onClose }) => {
  const [api, setApi] = useState(EMPTY_API);
  const step = api.step ?? 0;

  return (
    <Popup
      open={open && Boolean(drugId)}
      onClose={onClose}
      size='extraLarge'
      title={api.title || 'แก้ไขทะเบียนยา'}
      subtitle={api.subtitle}
      onBack={step > 0 ? () => api.goBack() : undefined}
      tertiaryAction={
        step > 0
          ? { label: 'ยกเลิก', onClick: onClose }
          : undefined
      }
      secondaryAction={
        step > 0
          ? { label: 'ย้อนกลับ', onClick: () => api.goBack() }
          : { label: 'ยกเลิก', onClick: onClose }
      }
      primaryAction={{
        label: api.nextLabel || 'ถัดไป',
        onClick: () => api.goNext(),
        disabled: !api.canAdvance,
      }}
    >
      {drugId ? (
        <PharmacyRegistryEditor
          key={drugId}
          variant='popup'
          drugId={drugId}
          onCancel={onClose}
          onSaved={onClose}
          onStateChange={setApi}
        />
      ) : null}
    </Popup>
  );
};

export default PharmacyRegistryEditPopup;
