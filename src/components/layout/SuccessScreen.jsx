import React, { useEffect, useState } from 'react';
import BrandButton from '@/components/button/BrandButton';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import Icon from '@/components/icons/Icon';

/* MIH SuccessScreen — full-viewport success card with Check Mark Lottie
   (`public/illustration/success.json`). Used after create/publish flows
   across PHCIS assess + system + consent. */

export const SUCCESS_LOTTIE = '/illustration/success.json';

const SuccessScreen = ({
  title,
  buttonLabel = 'ตกลง',
  onDone,
  lottieSize = 240,
  trailingIcon = 'arrow_forward',
  /* Replay the check-mark animation continuously. Off by default so the
     existing create/publish screens keep their play-once behaviour; the
     sign-in success surface opts in. */
  loop = false,
  /* Fixed CTA width (a token reference). Omitted → the button hugs its label
     as before; the sign-in success screen pins it to the Figma 298px. */
  buttonWidth,
}) => {
  const [anim, setAnim] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(SUCCESS_LOTTIE)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setAnim(d); })
      .catch(() => { /* static check fallback */ });
    return () => { alive = false; };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--sm-z-modal, 1400)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--dim-space-600)',
        background: 'radial-gradient(120% 120% at 28% 18%, #EAF7F1 0%, #F4F8FF 52%, #EAF2FF 100%)',
      }}
    >
      <div
        className='flex flex-col items-center'
        style={{
          width: '100%',
          maxWidth: 'var(--dim-size-2900, 640px)',
          background: 'var(--surface-card-100)',
          borderRadius: 'var(--dim-radius-600)',
          boxShadow: 'var(--shadow-brand-drop-bottom-400)',
          padding: 'var(--dim-space-1200, 48px) var(--dim-space-800, 32px)',
          gap: 'var(--dim-space-800)',
        }}
      >
        {anim ? (
          <LottieIllustration
            animationData={anim}
            size={lottieSize}
            loop={loop}
            ariaLabel={typeof title === 'string' ? title : 'สำเร็จ'}
          />
        ) : (
          <span
            className='inline-flex items-center justify-center'
            style={{
              width: 'var(--dim-size-2400, 120px)',
              height: 'var(--dim-size-2400, 120px)',
              borderRadius: 'var(--dim-radius-full)',
              background: 'var(--surface-positive-secondary, #A2EDDE)',
              color: 'var(--text-brandPrimary-default)',
            }}
          >
            <Icon name='check' size={48} />
          </span>
        )}
        <h1
          style={{
            color: 'var(--text-brandPrimary-default)',
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-2xl)',
            fontWeight: 'var(--type-weight-regular)',
            textAlign: 'center',
            lineHeight: 1.375,
            margin: 0,
          }}
        >
          {title}
        </h1>
        <BrandButton
          variant='fill'
          size='lg'
          trailingIcon={trailingIcon}
          onClick={onDone}
          style={buttonWidth ? { width: buttonWidth, maxWidth: '100%' } : undefined}
        >
          {buttonLabel}
        </BrandButton>
      </div>
    </div>
  );
};

export default SuccessScreen;
