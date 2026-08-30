import React, { useEffect, useState } from 'react';
import BrandCircleSubdueIconButton from '@/components/button/BrandCircleSubdueIconButton';
import BodyRecordPopup from '@/components/examination/BodyRecordPopup';
import { BodyDiagramCard } from '@/components/examination/BodyDrawingCanvas';
import {
  EXAM_SYSTEM_TABS,
} from '@/data/treatmentVisits';

/* MIH BodyDiagramPanel — Figma PHCIS | Medical-examination
   151:36633 · system tabs 150:36315 · diagram row 191:25071 · image 150:36340.
   System TabCapsule row + diagram card + ExamSupportList (320px).
   "บันทึกร่างกาย" opens Popup 75:35675 (BodyRecordPopup). */

const BodyDiagramPanel = ({
  systemKey = 'heent',
  viewKey = 'both',
  markers = [],
  onMarkersChange,
  /* Optional per-tab drawings persistence. Parent (TreatmentSteps)
     supplies the current system's drawings array; saves write back
     to the same per-system slot, so pen/text/circle/square/arrow
     strokes stay isolated to the active exam tab. */
  drawings = [],
  onDrawingsChange,
  onSystemChange,
  onViewChange,
  onAddSystem,
  onBodyRecordSave,
  visibleSystemKeys,
  visibleViewKeys,
  sidebar = null,
  variant = 'default',
  className = '',
}) => {
  const [recordOpen, setRecordOpen] = useState(false);
  const [draftMarkers, setDraftMarkers] = useState(markers);
  const [draftDrawings, setDraftDrawings] = useState(drawings);
  const currentSystemLabel = EXAM_SYSTEM_TABS.find((tab) => tab.key === systemKey)?.label ?? systemKey;

  useEffect(() => {
    setDraftMarkers(markers);
  }, [markers]);

  useEffect(() => {
    setDraftDrawings(drawings);
  }, [drawings]);

  const bodyCard = (
    <BodyDiagramCard
      viewKey={viewKey}
      onViewChange={onViewChange}
      markers={draftMarkers}
      drawings={draftDrawings}
      visibleViewKeys={visibleViewKeys}
      showMarkerNotes
      expandedTitle={currentSystemLabel}
      onSaveClick={variant === 'default' ? () => setRecordOpen(true) : undefined}
      embedded={variant === 'summary'}
      framed={variant === 'default'}
    />
  );

  return (
    <div
      className={`flex flex-col w-full min-w-0 ${className}`}
      style={{ gap: variant === 'summary' ? 'var(--dim-space-300)' : 'var(--dim-space-400)' }}
    >
      {variant === 'summary' ? (
        <div
          className='flex flex-col w-full min-w-0'
          style={{
            gap: 'var(--dim-space-300)',
            padding: 'var(--dim-space-600)',
            borderRadius: 'var(--dim-radius-400)',
            border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
            background: 'var(--surface-card-100, #FFFFFF)',
          }}
        >
          {/* แถบชิประบบตรวจ (Heent · Heart · …) และเส้นคั่นใต้แถบ ถูกเอาออกจากโหมด
              summary 31 ส.ค. 69 (มติผู้ใช้) — ในการ์ดสรุปของขั้นวินิจฉัยมักเหลือชิป
              ใบเดียวตามระบบที่ตรวจจริง กลายเป็นแถวที่กดก็ไม่เปลี่ยนอะไร · โหมด
              default ถอดแถบนี้ไปตั้งแต่ 28 ส.ค. 69 ตอนนี้จึงไม่มีโหมดไหนใช้แล้ว */}
          {bodyCard}
        </div>
      ) : (
        <>
          {/* แถบชิประบบตรวจ (Heent · Heart · Lungs · Abdomen · Extremities + ปุ่มเพิ่ม)
              ถูกเอาออก 28 ส.ค. 69 — โหมด `summary` ยังมีแถบนี้อยู่ */}

          <div
            className='flex w-full min-w-0 items-stretch'
            style={{ gap: 'var(--dim-space-300)' }}
          >
            {bodyCard}
            {sidebar}
          </div>
        </>
      )}

      <BodyRecordPopup
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        onSave={(nextMarkers, nextDrawings) => {
          setDraftMarkers(nextMarkers);
          setDraftDrawings(nextDrawings ?? draftDrawings);
          onMarkersChange?.(nextMarkers);
          onDrawingsChange?.(nextDrawings ?? draftDrawings);
          onBodyRecordSave?.(nextMarkers, nextDrawings ?? draftDrawings);
        }}
        systemKey={systemKey}
        viewKey={viewKey}
        markers={draftMarkers}
        onMarkersChange={setDraftMarkers}
        drawings={draftDrawings}
        onDrawingsChange={setDraftDrawings}
        onViewChange={onViewChange}
      />
    </div>
  );
};

export default BodyDiagramPanel;
