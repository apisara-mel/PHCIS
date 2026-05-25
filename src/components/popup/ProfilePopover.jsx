import React, { useEffect, useRef } from 'react';
import ActionList from '@/components/list/ActionList';

/* All visual values are aliased from design.md via the
   `--dim-*` / `--type-*` mirrors declared in src/index.css. Menu rows
   are rendered through the shared ActionList component (Figma 2796:3168 ·
   2796:4397) so the popover stays consistent with every other action-list
   surface in the app. */

const LanguageBadge = ({ children = 'TH' }) => (
  <span
    className='inline-flex items-center justify-center shrink-0'
    style={{
      height:        'var(--dim-size-500)',      /* 24px */
      minWidth:      'var(--dim-size-800)',      /* 40px */
      maxWidth:      224,                          /* Figma literal 224px */
      gap:           'var(--dim-space-100)',     /* 4px  */
      paddingLeft:   'var(--dim-space-200)',     /* 8px  */
      paddingRight:  'var(--dim-space-200)',
      paddingTop:    'var(--dim-space-100)',
      paddingBottom: 'var(--dim-space-100)',
      borderRadius:  'var(--dim-radius-full)',
      background:    'var(--surface-colorfulBadge-blue)',
      color:         'var(--text-colorfulBadge-blue)',
      fontFamily:    'var(--type-family-body)',
      fontSize:      'var(--type-size-xs)',      /* 12px */
      fontWeight:    'var(--type-weight-medium)',
      lineHeight: 1.5,
    }}
  >
    {children}
  </span>
);

const ProfilePopover = ({ open, anchorRect, anchorRef, onClose, onSelect }) => {
  const popRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => {
      const inPop = popRef.current && popRef.current.contains(e.target);
      const inAnchor = anchorRef && anchorRef.current && anchorRef.current.contains(e.target);
      if (!inPop && !inAnchor) onClose && onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !anchorRect) return null;

  const GAP = 8;
  // Figma 276:5059 — Logout list pins inner width to 256px; +4px outer padding × 2 = 264.
  const WIDTH = 264;
  const left = Math.round(anchorRect.right + GAP);
  const bottom = Math.round(window.innerHeight - anchorRect.bottom);

  const handle = (key) => () => {
    onSelect && onSelect(key);
    onClose && onClose();
  };

  return (
    <div
      ref={popRef}
      role='menu'
      onMouseLeave={() => onClose && onClose()}
      style={{
        position: 'fixed',
        left, bottom,
        width: WIDTH,
        zIndex: 'calc(var(--sm-z-overlay) + 1)',
        background:    'var(--surface-dropdown-default)',
        border:        'var(--dim-stroke-100) solid var(--border-dropdown-default)',
        borderRadius:  'var(--dim-radius-500)',
        boxShadow:     'var(--shadow-drop-bottom-400)',
        padding:       'var(--dim-space-100)',
        fontFamily:    'var(--type-family-body)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* User block */}
      <div
        className='flex items-center w-full overflow-hidden'
        style={{
          gap:           'var(--dim-space-300)',     /* 12px */
          paddingLeft:   'var(--dim-space-300)',
          paddingRight:  'var(--dim-space-300)',
          paddingTop:    'var(--dim-space-200)',     /* 8px  */
          paddingBottom: 'var(--dim-space-200)',
          borderBottom:  'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
        }}
      >
        <div
          className='shrink-0 overflow-hidden relative'
          style={{
            width:  'var(--dim-size-800)',           /* 40px */
            height: 'var(--dim-size-800)',
            borderRadius: 'var(--dim-radius-full)',
            background: '#e7f1f8',
          }}
        >
          {/* Inner 42×42 crop at (-1,-1) — Figma 276:5061 percentage math is
              relative to this 42px wrapper, not the 40px outer. */}
          <div
            className='absolute overflow-hidden pointer-events-none'
            style={{ width: 42, height: 42, left: -1, top: -1 }}
          >
            <img
              src='/images/doctor-a.png'
              alt='Doctor avatar'
              className='absolute max-w-none'
              style={{ width: '203.9%', height: '204.23%', left: '-1.3%', top: '-103.09%' }}
            />
          </div>
        </div>
        <div className='flex-1 min-w-0 flex flex-col overflow-hidden'>
          <span
            className='truncate'
            style={{
              color:      'var(--text-modal-text)',
              fontSize:   'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.5,
            }}
          >
            พญ.สมหญิง รักษ์ดี
          </span>
          <span
            className='truncate'
            style={{
              color:      'var(--text-modal-subtext)',
              fontSize:   'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.5,
            }}
          >
            อายุรกรรม
          </span>
        </div>
      </div>

      {/* Settings group — popover items act as flat menu actions (no
          submenu drill-down, no selection toggle), so both the trailing
          check + chevron_right that the central <ActionList> renders by
          default are hidden at every call site here. Central ActionList
          defaults stay untouched so other call sites keep their full
          property panel. */}
      <div
        className='flex flex-col w-full'
        style={{
          paddingTop:    'var(--dim-space-300)',     /* 12px */
          paddingBottom: 'var(--dim-space-300)',
        }}
      >
        <ActionList leadingIcon='translate'     label='ภาษา'             trailing={<LanguageBadge />} showCheck={false} showChevronRight={false} onClick={handle('language')} />
        <ActionList leadingIcon='palette'       label='โหมดและธีม'                                    showCheck={false} showChevronRight={false} onClick={handle('theme')} />
        <ActionList leadingIcon='lock'          label='เปลี่ยนรหัสผ่าน'                                showCheck={false} showChevronRight={false} onClick={handle('password')} />
        <ActionList leadingIcon='notifications' label='การตั้งค่าแจ้งเตือน'                            showCheck={false} showChevronRight={false} onClick={handle('notifications')} />
      </div>

      {/* Divider · border/neutral/quaternary, height = dim-stroke-100 (1px) */}
      <div
        aria-hidden
        style={{
          height: 'var(--dim-stroke-100)',
          width: '100%',
          background: 'var(--border-neutral-quaternary)',
        }}
      />

      {/* Logout */}
      <div
        className='flex flex-col w-full'
        style={{
          paddingTop:    'var(--dim-space-200)',     /* 8px */
          paddingBottom: 'var(--dim-space-200)',
        }}
      >
        <ActionList leadingIcon='logout' label='Log out' showCheck={false} showChevronRight={false} onClick={handle('logout')} />
      </div>
    </div>
  );
};

export default ProfilePopover;
