import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import FormPositionAccessEditor from '@/components/consent/FormPositionAccessEditor';
import PharmacyDrugMetaBanner from '@/components/pharmacy/PharmacyDrugMetaBanner';

/* Pharmacy registry — pick ตำแหน่งที่อนุญาตให้สั่ง
   (same chrome as consent FormPositionViewPopup edit mode). */

const PharmacyPrescriberPositionPopup = ({
  open,
  positions = [],
  drugCode = '',
  drugName = '',
  drugImage = '',
  onClose,
  onSave,
}) => {
  const [draftPositions, setDraftPositions] = useState([]);

  const baseline = useMemo(
    () => [...(positions || [])],
    [positions],
  );

  const resetDraft = useCallback(() => {
    setDraftPositions([...baseline]);
  }, [baseline]);

  useEffect(() => {
    if (open) resetDraft();
  }, [open, resetDraft]);

  const originalSet = useMemo(() => new Set(baseline), [baseline]);

  const isDirty = useMemo(() => {
    const draftSet = new Set(draftPositions);
    if (draftSet.size !== originalSet.size) return true;
    for (const value of draftSet) {
      if (!originalSet.has(value)) return true;
    }
    return false;
  }, [draftPositions, originalSet]);

  return (
    <Popup
      open={!!open}
      onClose={onClose}
      size='extraLarge'
      title='แก้ไขตำแหน่งที่มีสิทธิเข้าถึงได้'
      primaryAction={{
        label: 'บันทึก',
        onClick: () => onSave?.([...draftPositions]),
        disabled: !isDirty,
      }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    >
      <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
        <PharmacyDrugMetaBanner
          drugCode={drugCode}
          drugName={drugName}
          drugImage={drugImage}
        />

        <FormPositionAccessEditor
          value={draftPositions}
          onChange={setDraftPositions}
          columns={2}
          heading='ตำแหน่งที่มีสิทธิสั่งจ่ายได้'
          allLabel='ทุกตำแหน่ง'
        />
      </div>
    </Popup>
  );
};

export default PharmacyPrescriberPositionPopup;
