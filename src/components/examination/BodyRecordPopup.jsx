import React, { useMemo } from 'react';
import DrawingCanvasPopup from '@/components/popup/DrawingCanvasPopup';
import { EXAM_SYSTEM_TABS } from '@/data/treatmentVisits';

/* MIH BodyRecordPopup — Figma PHCIS | Medical-examination
   node 75:35675 "Popup Very Large" · DrawingCanvas 75:34452.
   Opens from BodyDiagramPanel "บันทึกร่างกาย".

   Thin domain wrapper over DrawingCanvasPopup that resolves the popup
   title from the active exam system (HEENT / Heart / Lungs / …). All
   other behaviour — dirty tracking, save/cancel, markers + view state
   mirroring — lives in DrawingCanvasPopup so other contexts can reuse
   the same drawing-canvas modal shell. */

const resolveSystemLabel = (systemKey) =>
  EXAM_SYSTEM_TABS.find((t) => t.key === systemKey)?.label ?? systemKey;

const BodyRecordPopup = ({
  systemKey = 'heent',
  ...rest
}) => {
  const title = useMemo(() => resolveSystemLabel(systemKey), [systemKey]);
  return <DrawingCanvasPopup title={title} {...rest} />;
};

export default BodyRecordPopup;
