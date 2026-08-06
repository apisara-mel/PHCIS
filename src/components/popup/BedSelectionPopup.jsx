import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import InventoryCard from '@/components/card/InventoryCard';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import { MOCK_PATIENT_BEDS } from '@/data/mockPatientBeds';

/* Bed picker — Figma "Popup ExtraLarge" 166:36434 / 332:53289 (เลือกเตียงผู้ป่วย).
   Bed tiles are aliased to the DS `InventoryCard` (Figma 93:2643). */

export function BedSelectionGrid({
  beds = MOCK_PATIENT_BEDS,
  selectedId,
  onSelect,
}) {
  return (
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
          selected={selectedId === bed.id}
          onClick={() => onSelect?.(bed.id)}
          style={{ width: '100%' }}
        />
      ))}
    </div>
  );
}

export function useBedSelectionDraft({ open, initialSelectedId = 'bed04' }) {
  const [draftId, setDraftId] = useState(initialSelectedId);

  useEffect(() => {
    if (open) setDraftId(initialSelectedId || 'bed04');
  }, [open, initialSelectedId]);

  return [draftId, setDraftId];
}

const BedSelectionPopup = ({
  open,
  onClose,
  onConfirm,
  onClearBed,
  showClearOption = false,
  initialSelectedId = 'bed04',
  beds = MOCK_PATIENT_BEDS,
}) => {
  const [draftId, setDraftId] = useBedSelectionDraft({ open, initialSelectedId });

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
      <BedSelectionGrid beds={beds} selectedId={draftId} onSelect={setDraftId} />
    </Popup>
  );
};

/** Nested bed picker body — ใช้ภายใน modal/popup แม่ (ไม่เปิด Popup ซ้อน) */
export function NestedBedSelectionPanel({
  open,
  beds = MOCK_PATIENT_BEDS,
  initialSelectedId,
  onClose,
  onConfirm,
}) {
  const [draftId, setDraftId] = useBedSelectionDraft({ open, initialSelectedId });

  if (!open) return null;

  return (
    <div
      className='absolute inset-0 z-[5] flex flex-col min-h-0'
      style={{ background: 'var(--surface-modal-default)' }}
    >
      <div
        className='shrink-0 flex flex-col'
        style={{
          gap: 'var(--dim-space-100)',
          padding: 'var(--dim-space-600) var(--dim-space-600) var(--dim-space-200)',
          borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
        }}
      >
        <p style={{
          color: 'var(--text-modal-text)',
          fontFamily: 'var(--type-family-heading-content)',
          fontSize: 'var(--type-size-base)',
          fontWeight: 'var(--type-weight-bold)',
          lineHeight: 1.5,
          margin: 0,
        }}
        >
          เลือกเตียงผู้ป่วย
        </p>
        <p style={{
          color: 'var(--text-modal-subtext)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          fontWeight: 'var(--type-weight-medium)',
          lineHeight: 1.5,
          margin: 0,
        }}
        >
          เลือกเตียงที่ว่างสำหรับรับผู้ป่วย
        </p>
      </div>
      <div className='flex-1 min-h-0 overflow-y-auto overflow-x-clip p-6'>
        <BedSelectionGrid beds={beds} selectedId={draftId} onSelect={setDraftId} />
      </div>
      <div
        className='shrink-0 flex w-full items-center justify-end'
        style={{
          gap: 'var(--dim-space-300)',
          padding: 'var(--dim-space-400) var(--dim-space-600)',
          borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
        }}
      >
        <NeutralSubdueButton onClick={onClose}>ยกเลิก</NeutralSubdueButton>
        <BrandPrimaryButton
          onClick={() => {
            onConfirm?.(draftId);
            onClose?.();
          }}
        >
          ตกลง
        </BrandPrimaryButton>
      </div>
    </div>
  );
}

export default BedSelectionPopup;
