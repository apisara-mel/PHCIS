import React, { useEffect, useMemo, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import InventoryCard from '@/components/card/InventoryCard';
import BrandCircleSubdueIconButton from '@/components/button/BrandCircleSubdueIconButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import { BED_TYPE_PAGE_SIZE, MOCK_PATIENT_BEDS } from '@/data/mockPatientBeds';

/* Bed picker — Figma "Popup ExtraLarge" 166:36434 / 332:53289 (เลือกเตียงผู้ป่วย).
   Bed tiles are aliased to the DS `InventoryCard` (Figma 93:2643).
   Catalogue is paged: 5 cards per view with L/R buttons, mouse-drag,
   and touch swipe (iPad). */

const SLIDE_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const SLIDE_MS = 420;
const SWIPE_MIN_PX = 48;
const SWIPE_THRESHOLD_RATIO = 0.18;
const DRAG_AXIS_LOCK_PX = 8;

function chunkBeds(beds, pageSize) {
  const pages = [];
  for (let i = 0; i < beds.length; i += pageSize) {
    pages.push(beds.slice(i, i + pageSize));
  }
  return pages.length ? pages : [[]];
}

export function BedSelectionGrid({
  beds = MOCK_PATIENT_BEDS,
  selectedId,
  onSelect,
  showBadge = true,
  showStatusBadge = true,
  pageSize = BED_TYPE_PAGE_SIZE,
}) {
  const [page, setPage] = useState(0);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pages = useMemo(() => chunkBeds(beds, pageSize), [beds, pageSize]);
  const pageCount = pages.length;
  const safePage = Math.min(page, pageCount - 1);

  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const offsetRef = useRef(0);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    setPage(0);
    setDragOffsetPx(0);
    offsetRef.current = 0;
  }, [beds, pageSize]);

  const canPrev = safePage > 0;
  const canNext = safePage < pageCount - 1;

  const endDrag = (clientX) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    const width = viewportRef.current?.offsetWidth || 1;
    const dx = clientX != null ? clientX - drag.startX : offsetRef.current;
    const threshold = Math.max(SWIPE_MIN_PX, width * SWIPE_THRESHOLD_RATIO);

    let next = safePage;
    if (drag.locked === 'x') {
      if (dx <= -threshold && safePage < pageCount - 1) next = safePage + 1;
      else if (dx >= threshold && safePage > 0) next = safePage - 1;
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    }

    offsetRef.current = 0;
    setDragOffsetPx(0);
    setIsDragging(false);
    if (next !== safePage) setPage(next);
  };

  const onPointerDown = (e) => {
    if (pageCount <= 1) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      locked: null,
    };
    offsetRef.current = 0;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.locked) {
      if (Math.abs(dx) < DRAG_AXIS_LOCK_PX && Math.abs(dy) < DRAG_AXIS_LOCK_PX) return;
      /* Vertical intent → abandon so the modal can scroll. */
      if (Math.abs(dy) > Math.abs(dx)) {
        dragRef.current = null;
        offsetRef.current = 0;
        setDragOffsetPx(0);
        setIsDragging(false);
        return;
      }
      drag.locked = 'x';
      setIsDragging(true);
    }

    let offset = dx;
    if (safePage === 0 && offset > 0) offset *= 0.35;
    if (safePage === pageCount - 1 && offset < 0) offset *= 0.35;
    offsetRef.current = offset;
    setDragOffsetPx(offset);
  };

  const onPointerUp = (e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    endDrag(e.clientX);
  };

  const onPointerCancel = (e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    endDrag(null);
  };

  const handleSelect = (bedId) => {
    if (suppressClickRef.current || isDragging) return;
    onSelect?.(bedId);
  };

  return (
    <div
      className='flex w-full min-w-0 items-center'
      style={{ gap: 'var(--dim-space-300, 12px)' }}
    >
      <BrandCircleSubdueIconButton
        icon='chevron_left'
        variant='fill'
        size='sm'
        aria-label='รูปแบบเตียงก่อนหน้า'
        disabled={!canPrev}
        onClick={() => setPage((p) => Math.max(0, p - 1))}
        style={{ flexShrink: 0 }}
      />

      <div className='flex min-w-0 flex-1 flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        {/* Pointer drag / touch swipe on the card group; L/R buttons still work. */}
        <div
          ref={viewportRef}
          className='w-full min-w-0 overflow-hidden'
          style={{
            touchAction: 'pan-y',
            cursor: pageCount > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            userSelect: isDragging ? 'none' : undefined,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <div
            className='flex'
            style={{
              width: '100%',
              transform: `translateX(calc(-${safePage * 100}% + ${dragOffsetPx}px))`,
              transition: isDragging ? 'none' : `transform ${SLIDE_MS}ms ${SLIDE_EASE}`,
              willChange: 'transform',
            }}
          >
            {pages.map((pageBeds, pageIndex) => (
              <div
                key={`bed-page-${pageIndex}`}
                className='grid min-w-0'
                style={{
                  flex: '0 0 100%',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  gap: 'var(--dim-space-400, 16px)',
                  gridTemplateColumns: `repeat(${pageSize}, minmax(0, 1fr))`,
                  paddingTop: 'var(--dim-space-300, 12px)',
                  paddingBottom: 'var(--dim-space-300, 12px)',
                  paddingLeft: 'var(--dim-space-500, 20px)',
                  paddingRight: 'var(--dim-space-300, 12px)',
                }}
              >
                {pageBeds.map((bed) => (
                  <InventoryCard
                    key={bed.id}
                    image={bed.imageSrc}
                    imageAlt={bed.title}
                    title={bed.titleTh || bed.title}
                    titleSecondary={bed.titleEn}
                    subtext={bed.description}
                    badge={showBadge ? { label: bed.code, style: 'blue', showDot: false } : undefined}
                    showBadge={showBadge}
                    showStatusBadge={showStatusBadge && !!bed.isNew}
                    statusBadge={
                      showStatusBadge && bed.isNew
                        ? { label: 'ใหม่', style: 'success', showDot: false }
                        : undefined
                    }
                    selected={selectedId === bed.id}
                    onClick={() => handleSelect(bed.id)}
                    style={{ width: '100%', cursor: pageCount > 1 ? 'inherit' : undefined }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {pageCount > 1 && (
          <div
            className='flex items-center justify-center'
            style={{
              gap: 'var(--dim-space-150, 6px)',
              color: 'var(--text-content-tertiary)',
              fontSize: 'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-medium)',
            }}
            aria-live='polite'
          >
            {safePage + 1} / {pageCount}
          </div>
        )}
      </div>

      <BrandCircleSubdueIconButton
        icon='chevron_right'
        variant='fill'
        size='sm'
        aria-label='รูปแบบเตียงถัดไป'
        disabled={!canNext}
        onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
        style={{ flexShrink: 0 }}
      />
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
          fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
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
