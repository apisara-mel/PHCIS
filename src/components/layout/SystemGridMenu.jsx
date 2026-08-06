import React, { useRef } from 'react';
import { useHistory } from 'react-router-dom';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import Popover from '@/components/popup/Popover';
import HubCard from '@/pages/hub/HubCard';
import { SYSTEM_CATALOG_ROWS } from '@/data/systemCatalog';

/* MIH SystemGridMenu — apps-grid system picker popover (Figma PHCIS | Consent
   359:129936). Anchored below the header grid button: compact 3×3 HubCard grid. */

const INTRO_STYLE = {
  margin: 0,
  width: '100%',
  fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.5,
  color: 'var(--text-brandPrimary-secondary, var(--brand-p600, #08A768))',
};

const GRID_ROW_GAP = 'var(--dim-space-400, 16px)';

const SystemGridPanel = ({ onSelectSystem }) => (
  <div
    role='dialog'
    aria-label='เลือกระบบ'
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--dim-space-400, 16px)',
      width: '100%',
      boxSizing: 'border-box',
      padding: 'var(--dim-space-400, 16px) var(--dim-space-600, 24px) var(--dim-space-600, 24px)',
    }}
  >
    <p style={INTRO_STYLE}>
      กรุณาเลือกระบบที่คุณต้องการปฏิบัติงานจากรายการด้านล่าง
    </p>

    {SYSTEM_CATALOG_ROWS.map((row) => (
      <div
        key={row.map((s) => s.key).join('-')}
        style={{
          display: 'flex',
          gap: GRID_ROW_GAP,
          alignItems: 'stretch',
          width: '100%',
        }}
      >
        {row.map((system) => (
          <HubCard
            key={system.key}
            size='compact'
            illustration={system.illustration}
            title={system.title}
            description={system.desc}
            onClick={system.route ? () => onSelectSystem(system) : undefined}
          />
        ))}
      </div>
    ))}

  </div>
);

const SystemGridMenu = ({
  className = '',
  buttonVariant = 'outline',
  buttonSize = 'md',
}) => {
  const history = useHistory();
  const [open, setOpen] = React.useState(false);
  const anchorRef = useRef(null);

  const close = () => setOpen(false);

  const handleSelect = (system) => {
    close();
    if (system.route) history.push(system.route);
  };

  return (
    <div className={`relative shrink-0 ${className}`} ref={anchorRef}>
      <BrandSubdueIconButton
        variant={buttonVariant}
        size={buttonSize}
        icon='apps'
        iconActive='close'
        active={open}
        aria-label={open ? 'ปิดเมนูระบบ' : 'เปลี่ยนระบบ'}
        aria-haspopup='dialog'
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      />

      <Popover
        open={open}
        onClose={close}
        anchorRef={anchorRef}
        className='mih-system-grid-popover'
        style={{
          width: 'min(960px, calc(100vw - var(--dim-space-400, 16px)))',
          zIndex: 'var(--sm-z-popover-nested, calc(var(--sm-z-overlay) + 2))',
          background: 'var(--surface-card-100, #FFFFFF)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
          borderRadius: 'var(--dim-radius-500, 16px)',
          boxShadow: 'var(--shadow-drop-bottom-400)',
        }}
      >
        <div
          className='scrollbar-thin'
          style={{
            maxHeight: 'min(75vh, 720px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            /* Match hub landing — brand-tinted canvas so card shadows read;
               extra padding keeps Brand Drop Shadow Bottom/200 from being
               clipped by the scrollport (`overflow` clips descendant shadows). */
            padding: 'var(--dim-space-400, 16px)',
            background: 'var(--background-screen-brand-100, var(--brand-p50, #F4FBF8))',
            borderRadius: 'calc(var(--dim-radius-500, 16px) - var(--dim-stroke-100, 1px))',
            boxSizing: 'border-box',
          }}
        >
          <SystemGridPanel onSelectSystem={handleSelect} />
        </div>
      </Popover>
    </div>
  );
};

export default SystemGridMenu;
