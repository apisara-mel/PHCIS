import React, { useState } from 'react';
import BodyDrawingCanvas from '@/components/examination/BodyDrawingCanvas';
import BodyRecordPopup from '@/components/examination/BodyRecordPopup';
import { DEMO_BODY_MARKERS } from '@/data/treatmentVisits';

/* Standalone sandbox — /preview/body-record
   Default: inline canvas (no modal). Popup mode optional. */

const tabStyle = (active) => ({
  padding: 'var(--dim-space-150) var(--dim-space-300)',
  borderRadius: 'var(--dim-radius-300)',
  border: active
    ? '2px solid var(--brand-p600)'
    : 'var(--dim-stroke-100) solid var(--border-card-default)',
  background: active ? 'var(--surface-brandPrimary-tertiary)' : 'var(--surface-card-100)',
  color: active ? 'var(--text-brandPrimary-default)' : 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  cursor: 'pointer',
});

const BodyRecordPreviewPage = () => {
  const [mode, setMode] = useState('inline');
  const [popupOpen, setPopupOpen] = useState(false);
  const [viewKey, setViewKey] = useState('both');
  const [markers, setMarkers] = useState(DEMO_BODY_MARKERS);
  const [drawings, setDrawings] = useState([]);

  const canvasProps = {
    fillHeight: true,
    viewKey,
    onViewChange: setViewKey,
    markers,
    onMarkersChange: setMarkers,
    drawings,
    onDrawingsChange: setDrawings,
  };

  return (
    <div
      className='flex h-screen w-full flex-col'
      style={{ background: 'var(--background-screen-default, #F4F5F5)' }}
    >
      <header
        className='flex shrink-0 flex-wrap items-center'
        style={{
          gap: 'var(--dim-space-300)',
          padding: 'var(--dim-space-400) var(--dim-space-600)',
          borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
          background: 'var(--surface-card-100)',
        }}
      >
        <strong
          style={{
            fontFamily: 'var(--type-family-heading-content)',
            fontSize: 'var(--type-size-base)',
            color: 'var(--text-content-default)',
          }}
        >
          Preview · บันทึกร่างกาย
        </strong>
        <span
          style={{
            flex: 1,
            minWidth: 200,
            color: 'var(--text-content-secondary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
          }}
        >
          รัน npm run dev แล้วเปิด http://127.0.0.1:3000/preview/body-record
        </span>
        <div className='flex' style={{ gap: 'var(--dim-space-200)' }}>
          <button type='button' onClick={() => setMode('inline')} style={tabStyle(mode === 'inline')}>
            Canvas ในหน้า
          </button>
          <button
            type='button'
            onClick={() => {
              setMode('popup');
              setPopupOpen(true);
            }}
            style={tabStyle(mode === 'popup')}
          >
            Popup (modal)
          </button>
        </div>
      </header>

      {mode === 'inline' ? (
        <div
          className='flex min-h-0 flex-1 flex-col'
          style={{ padding: 'var(--dim-space-400) var(--dim-space-600)' }}
        >
          <BodyDrawingCanvas {...canvasProps} />
        </div>
      ) : (
        <div
          className='flex flex-1 flex-col items-center justify-center'
          style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-600)' }}
        >
          <p
            style={{
              margin: 'var(--dim-space-0)',
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
            }}
          >
            โหมด Popup — กดปุ่มด้านล่างถ้า modal ปิดอยู่
          </p>
          <button type='button' onClick={() => setPopupOpen(true)} style={tabStyle(false)}>
            เปิด BodyRecordPopup
          </button>
        </div>
      )}

      <BodyRecordPopup
        open={mode === 'popup' && popupOpen}
        onClose={() => setPopupOpen(false)}
        onSave={(nextMarkers, nextDrawings) => {
          setMarkers(nextMarkers);
          setDrawings(nextDrawings ?? drawings);
          setPopupOpen(false);
        }}
        systemKey='heent'
        viewKey={viewKey}
        markers={markers}
        onMarkersChange={setMarkers}
        drawings={drawings}
        onDrawingsChange={setDrawings}
        onViewChange={setViewKey}
      />
    </div>
  );
};

export default BodyRecordPreviewPage;
