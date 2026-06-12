import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useHistory } from 'react-router-dom';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import HubCard from '@/pages/hub/HubCard';
import { SYSTEM_CATALOG_ROWS } from '@/data/systemCatalog';
import useModalMotion from '@/components/popup/useModalMotion';

/* MIH SystemGridMenu — apps-grid system picker overlay (Figma PHCIS | Consent
   359:129936). Full content-area panel below the 64px header: green intro,
   3×3 HubCard grid, Brand Subdue fill footer "กลับสู่หน้าเลือกระบบทั้งหมด". */

const INTRO_STYLE = {
  margin: 0,
  width: '100%',
  fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
  fontSize: 'var(--type-size-lg, 18px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.5,
  color: 'var(--text-brandPrimary-secondary, var(--brand-p600, #08A768))',
};

const SystemGridPanel = ({ onSelectSystem, onBackToHub }) => (
  <div
    role='dialog'
    aria-modal='true'
    aria-label='เลือกระบบ'
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--dim-space-600, 24px)',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      padding: 'var(--dim-space-600, 24px)',
      background: 'var(--surface-card-100, #FFFFFF)',
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
          gap: 'var(--dim-space-600, 24px)',
          alignItems: 'stretch',
          width: '100%',
        }}
      >
        {row.map((system) => (
          <HubCard
            key={system.key}
            illustration={system.illustration}
            title={system.title}
            description={system.desc}
            lastUsed={system.lastUsed}
            onClick={system.route ? () => onSelectSystem(system) : undefined}
          />
        ))}
      </div>
    ))}

    <BrandSubdueButton variant='fill' size='lg' onClick={onBackToHub}>
      กลับสู่หน้าเลือกระบบทั้งหมด
    </BrandSubdueButton>
  </div>
);

const SystemGridMenu = ({
  className = '',
  buttonVariant = 'outline',
  buttonSize = 'md',
}) => {
  const history = useHistory();
  const [open, setOpen] = React.useState(false);
  const { mounted, visible, motionState } = useModalMotion(open);

  const close = () => setOpen(false);

  const handleSelect = (system) => {
    close();
    if (system.route) history.push(system.route);
  };

  const handleBackToHub = () => {
    close();
    history.push('/hub');
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <div className={`relative shrink-0 ${className}`}>
        <BrandSubdueIconButton
          variant={buttonVariant}
          size={buttonSize}
          icon='apps'
          active={open}
          aria-label='เปลี่ยนระบบ'
          aria-haspopup='dialog'
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        />
      </div>

      {mounted && typeof document !== 'undefined' && createPortal(
        <div
          className='mih-system-grid-overlay'
          data-state={motionState}
          style={{
            position: 'fixed',
            top: 'var(--dim-size-1400, 64px)',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 'var(--sm-z-modal-overlay, 1400)',
            overflowY: 'auto',
            background: 'var(--surface-card-100, #FFFFFF)',
            opacity: visible ? 1 : 0,
            transition: 'opacity var(--motion-duration-modal, 220ms) ease',
          }}
        >
          <SystemGridPanel
            onSelectSystem={handleSelect}
            onBackToHub={handleBackToHub}
          />
        </div>,
        document.body,
      )}
    </>
  );
};

export default SystemGridMenu;
