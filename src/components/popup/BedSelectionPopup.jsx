import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import InventoryCard from '@/components/card/InventoryCard';
import { MOCK_PATIENT_BEDS } from '@/data/mockPatientBeds';

/* Bed picker — Figma "Popup ExtraLarge" 166:36434 / 332:53289 (เลือกเตียงผู้ป่วย).
   Bed tiles are aliased to the DS `InventoryCard` (Figma 93:2643) so
   chrome (180h photo, badges, title, subtext, default / hover / selected
   borders) stays canonical. Footer matches 332:53289 (L→R with
   `justify-end`): ยกเลิก (Neutral) · optional ไม่ใช้เตียง (Brand outline)
   when clearing an existing pick · ตกลง (Primary). */

const BedSelectionPopup = ({
  open,
  onClose,
  onConfirm,
  onClearBed,
  showClearOption = false,
  initialSelectedId = 'bed04',
  beds = MOCK_PATIENT_BEDS,
}) => {
  const [draftId, setDraftId] = useState(initialSelectedId);

  useEffect(() => {
    if (open) setDraftId(initialSelectedId || 'bed04');
  }, [open, initialSelectedId]);

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='เลือกเตียงผู้ป่วย'
      subtitle='เลือกเตียงที่ว่างสำหรับรับผู้ป่วย'
      size='extraLarge'
      bodyStyle={{
        paddingTop: 'var(--dim-space-0)',
        paddingBottom: 'var(--dim-space-400)',
      }}
      tertiaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      secondaryAction={
        showClearOption
          ? {
              label: 'ไม่ใช้เตียง',
              onClick: () => {
                onClearBed?.();
                onClose?.();
              },
            }
          : undefined
      }
      primaryAction={{
        label: 'ตกลง',
        onClick: () => {
          onConfirm?.(draftId);
          onClose?.();
        },
      }}
    >
      <div
        className='grid w-full min-w-0 pt-2'
        style={{
          boxSizing: 'content-box',
          gap: 'var(--dim-space-400, 16px)',
          gridTemplateColumns: 'repeat(auto-fill, minmax(227px, 1fr))',
        }}
      >
        {beds.map((bed) => (
          <InventoryCard
            key={bed.id}
            image={bed.imageSrc}
            imageAlt=''
            title={bed.title}
            subtext={bed.description}
            badge={{ label: bed.code, style: 'blue', showDot: false }}
            showStatusBadge={!!bed.isNew}
            statusBadge={
              bed.isNew
                ? { label: 'ใหม่', style: 'success', showDot: false }
                : undefined
            }
            selected={draftId === bed.id}
            onClick={() => setDraftId(bed.id)}
            style={{ width: '100%' }}
          />
        ))}
      </div>
    </Popup>
  );
};

export default BedSelectionPopup;
