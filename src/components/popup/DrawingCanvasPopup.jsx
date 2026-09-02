import React, { useEffect, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import BodyDrawingCanvas from '@/components/examination/BodyDrawingCanvas';

/* MIH DrawingCanvasPopup — reusable shell that hosts BodyDrawingCanvas
   inside the extraLarge Popup with built-in dirty tracking, save /
   cancel actions, and view/markers state mirroring.

   Pattern: Popup (extraLarge, body padding zeroed) + horizontal inset
   gutter + BodyDrawingCanvas fillHeight. Save button is disabled until
   the canvas reports any user-initiated change via onDirtyChange.

   Domain wrappers (e.g. BodyRecordPopup) compose this by resolving a
   title from their own context (systemKey, exam type, …) and forwarding
   the remaining props through. */

const DrawingCanvasPopup = ({
  /* รูปร่างกายของงานนั้น ๆ (คลินิกฝากครรภ์ใช้รูปหญิงตั้งครรภ์) —
     ไม่ส่งมาก็ใช้รูปเดิมของระบบ (มติผู้ใช้ 2 ก.ย. 69) */
  frontSrc,
  backSrc,
  open,
  onClose,
  onSave,
  title,
  subtitle = 'คลิกที่จุดต่างๆ บนร่างกายเพื่อบันทึกผลการตรวจเฉพาะที่',
  viewKey: viewKeyProp = 'both',
  markers: markersProp = [],
  onMarkersChange,
  /* Optional per-tab drawings persistence. When the parent supplies
     `drawings` + `onDrawingsChange` the popup mirrors the strokes
     out, so switching tabs in BodyDiagramPanel keeps each system's
     pen/text/shape annotations intact across opens. */
  drawings: drawingsProp,
  onDrawingsChange,
  onViewChange,
  saveLabel = 'บันทึก',
  cancelLabel = 'ยกเลิก',
  minBodyHeight = 480,
}) => {
  const [viewKey, setViewKey] = useState(viewKeyProp);
  const [markers, setMarkers] = useState(markersProp);
  const [drawings, setDrawings] = useState(drawingsProp ?? []);
  const [dirty, setDirty] = useState(false);

  /* Reset session state only on the open ↑ transition. Depending on
     markersProp here would re-reset on every parent reflection of
     handleMarkersChange (parent stores markers → re-passes as prop)
     which would clobber the dirty flag the moment the user edits. */
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setViewKey(viewKeyProp);
      setMarkers(markersProp);
      setDrawings(drawingsProp ?? []);
      setDirty(false);
    }
    wasOpenRef.current = open;
  }, [open, viewKeyProp, markersProp, drawingsProp]);

  const handleViewChange = (key) => {
    setViewKey(key);
    onViewChange?.(key);
  };

  const handleMarkersChange = (next) => {
    setMarkers(next);
    onMarkersChange?.(next);
  };

  const handleDrawingsChange = (next) => {
    setDrawings(next);
    onDrawingsChange?.(next);
  };

  const handleSave = () => {
    onMarkersChange?.(markers);
    onDrawingsChange?.(drawings);
    onSave?.(markers, drawings);
    onClose?.();
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size='extraLarge'
      bodyScrollable={false}
      bodyOuterStyle={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
      bodyStyle={{
        padding: 'var(--dim-space-0)',
        paddingTop: 'var(--dim-space-0)',
        marginTop: 'var(--dim-space-0)',
        gap: 'var(--dim-space-0)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
      }}
      secondaryAction={{ label: cancelLabel, onClick: onClose }}
      primaryAction={{ label: saveLabel, onClick: handleSave, disabled: !dirty }}
    >
      <div
        style={{
          flex: '1 1 0',
          minHeight: minBodyHeight,
          display: 'flex',
          flexDirection: 'column',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
        }}
      >
        <BodyDrawingCanvas
          frontSrc={frontSrc}
          backSrc={backSrc}
          fillHeight
          viewKey={viewKey}
          onViewChange={handleViewChange}
          markers={markers}
          onMarkersChange={handleMarkersChange}
          drawings={drawings}
          onDrawingsChange={handleDrawingsChange}
          onDirtyChange={setDirty}
        />
      </div>
    </Popup>
  );
};

export default DrawingCanvasPopup;
