import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import RadioButton from '@/components/radio/RadioButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';

/* Figma PHCIS | Telemedicine · TelemedLayoutPopup (70:3729 / 70:3831)
   Trigger: Call Controls → layout button
   note:layout-confirm — BrandButton ตกลง disabled until user picks a layout
   different from current (badge กำลังใช้งานอยู่). */

export const TELEMED_LAYOUTS = [
  { id: 'auto', label: 'อัตโนมัติ (ปรับตามหน้าจอ)' },
  { id: 'grid', label: 'แบบกริด' },
  { id: 'speaker', label: 'แบบโฟกัสผู้พูด' },
  { id: 'sidebar', label: 'แถบด้านข้าง' },
];

/* Figma color/slate/300 — nearest semantic fill for layout preview bars. */
const CELL = 'var(--icon-neutral-tertiary, #ADB2B7)';

const thumbShell = {
  width: 'var(--dim-size-1600, 72px)',
  height: 'var(--dim-size-800, 40px)',
  boxSizing: 'border-box',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
  borderRadius: 'var(--dim-radius-100, 4px)',
  padding: 'var(--dim-space-100, 4px)',
  display: 'flex',
  flexShrink: 0,
  gap: 'var(--dim-space-050, 2px)',
  background: 'var(--surface-neutralbutton-quinary, #FFFFFF)',
};

const cell = (extra = {}) => ({
  background: CELL,
  borderRadius: 'var(--dim-space-050, 2px)',
  flex: '1 1 0',
  minWidth: 0,
  minHeight: 0,
  ...extra,
});

/** Mini layout preview glyphs matching Figma TelemedLayoutPopup/body thumbs. */
const LayoutThumb = ({ id }) => {
  if (id === 'auto') {
    return (
      <div style={{ ...thumbShell, flexDirection: 'column' }} aria-hidden>
        {[0, 1].map((row) => (
          <div key={row} style={{ display: 'flex', flex: 1, gap: 'var(--dim-space-050, 2px)', width: '100%', minHeight: 0 }}>
            {[0, 1].map((col) => (
              <div key={col} style={cell()} />
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (id === 'grid') {
    return (
      <div style={{ ...thumbShell, flexDirection: 'column' }} aria-hidden>
        {[0, 1, 2].map((row) => (
          <div key={row} style={{ display: 'flex', flex: 1, gap: 'var(--dim-space-050, 2px)', width: '100%', minHeight: 0 }}>
            {[0, 1, 2, 3, 4].map((col) => (
              <div key={col} style={cell()} />
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (id === 'speaker') {
    return (
      <div style={{ ...thumbShell, alignItems: 'stretch' }} aria-hidden>
        <div style={cell()} />
      </div>
    );
  }
  /* sidebar */
  return (
    <div style={{ ...thumbShell, alignItems: 'stretch' }} aria-hidden>
      <div style={cell()} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%', flex: '0 0 10px' }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={cell({ width: 10, flex: '1 1 0' })} />
        ))}
      </div>
    </div>
  );
};

/**
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {'auto'|'grid'|'speaker'|'sidebar'} currentLayout — applied layout (shows badge)
 * @param {(layout: string) => void} onConfirm
 */
const TelemedLayoutPopup = ({
  open,
  onClose,
  currentLayout = 'auto',
  onConfirm,
}) => {
  const [choice, setChoice] = useState(currentLayout);

  useEffect(() => {
    if (open) setChoice(currentLayout);
  }, [open, currentLayout]);

  const canConfirm = choice && choice !== currentLayout;

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='default'
      width={448}
      title='เลือกเลย์เอาต์'
      subtitle='เลือกรูปแบบการแสดงผลที่เหมาะกับการประชุมของคุณ'
      bodyStyle={{ paddingTop: 0, gap: 'var(--dim-space-200, 8px)' }}
      tertiaryAction={{
        label: 'ยกเลิก',
        onClick: onClose,
      }}
      primaryAction={{
        label: 'ตกลง',
        disabled: !canConfirm,
        onClick: () => {
          if (!canConfirm) return;
          onConfirm?.(choice);
        },
      }}
    >
      <div
        role='radiogroup'
        aria-label='เลือกเลย์เอาต์'
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dim-space-200, 8px)',
          width: '100%',
        }}
      >
        {TELEMED_LAYOUTS.map((opt) => {
          const isCurrent = opt.id === currentLayout;
          return (
            <RadioButton
              key={opt.id}
              name='telemed-layout-choice'
              value={opt.id}
              checked={choice === opt.id}
              onChange={() => setChoice(opt.id)}
              border
              title={opt.label}
              icon={<LayoutThumb id={opt.id} />}
              showRadio={false}
              showCircleIcon={false}
              showIcon
              showDescription={false}
              showBadgeTitle={false}
              showPalette={false}
              showBadge={isCurrent}
              badge={isCurrent ? (
                <ColorfulBadge
                  style='teal'
                  size='small'
                  hierarchy='secondary'
                  width='hug'
                >
                  กำลังใช้งานอยู่
                </ColorfulBadge>
              ) : null}
              className='w-full'
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          );
        })}
      </div>
    </Popup>
  );
};

export default TelemedLayoutPopup;
