import React from 'react';
import { BrandButton } from '@/components/mobile/button';
import LottieIllustration from '@/components/illustrations/LottieIllustration';

/* Animated hero — fetches a Lottie JSON and plays it; while loading (or if the
   JSON is missing/unreadable) it falls back to the static PNG so the card never
   shows a broken/empty hero. Mirrors the register flow's Lottie-with-fallback
   pattern. */
const LottieHero = ({ src, size, fallbackSrc }) => {
  const [anim, setAnim] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    setAnim(null);
    fetch(src)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no lottie'))))
      .then((d) => { if (alive) setAnim(d); })
      .catch(() => { /* keep null → PNG fallback */ });
    return () => { alive = false; };
  }, [src]);

  return (
    <span className='overflow-hidden shrink-0' style={{ width: size, height: size }}>
      {anim ? (
        <LottieIllustration animationData={anim} size={size} loop style={{ width: size, height: size }} />
      ) : fallbackSrc ? (
        <img
          src={fallbackSrc}
          alt=''
          aria-hidden
          width={size}
          height={size}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      ) : null}
    </span>
  );
};

/* MIH Mobile · SuccessCard — reusable success template
   Archive Figma booking success 175:94673 / 178:122765 / 246:45890.

   Teal gradient shell + white arch card (top radius-1000 · bottom radius-600)
   + award hero + title + optional description / info rows + CTA(s).

   CTAs (Figma 175:94673): Brand Button Large Fill + Brand Button Large Outline,
   both with trailing chevron_right · hug width 192. */

export const SUCCESS_CARD_BG = 'linear-gradient(155.3deg, rgb(19, 178, 146) 0%, rgb(1, 180, 160) 100%)';
export const SUCCESS_CARD_HERO = '/illustration/mobile/booking-success-award.png';
export const SUCCESS_CARD_HERO_SIZE = 160;
export const SUCCESS_CARD_CTA_WIDTH = 192;

/**
 * @typedef {{ label: string, value: React.ReactNode }} SuccessCardRow
 * @typedef {{
 *   label: React.ReactNode,
 *   onClick?: () => void,
 *   leadingIcon?: string,
 *   showLeadingIcon?: boolean,
 *   tailingIcon?: string,
 *   showTailingIcon?: boolean,
 * }} SuccessCardAction
 */

/**
 * @param {object} props
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.description]
 * @param {SuccessCardRow[]} [props.rows] — brand-soft summary card (label / value)
 * @param {SuccessCardAction} [props.primaryAction]
 * @param {SuccessCardAction} [props.secondaryAction]
 * @param {string} [props.heroSrc] — static PNG hero (also the fallback for heroLottie)
 * @param {string} [props.heroLottie] — Lottie JSON path; animates the hero, falls back to heroSrc
 * @param {number} [props.heroSize]
 * @param {boolean} [props.fill] — flex:1 + minHeight 100% for in-flow pages
 * @param {boolean} [props.showHomeIndicator] — standalone preview only; MobileShell owns the app-level indicator
 * @param {string} [props.background] — override gradient (also export SUCCESS_CARD_BG for Shell)
 * @param {React.ReactNode} [props.children] — free slot below title / above actions
 * @param {string} [props.className]
 * @param {React.CSSProperties} [props.style]
 */
const SuccessCard = ({
  title,
  description,
  rows,
  primaryAction,
  secondaryAction,
  heroSrc = SUCCESS_CARD_HERO,
  heroLottie,
  heroSize = SUCCESS_CARD_HERO_SIZE,
  fill = true,
  showHomeIndicator = false,
  background = SUCCESS_CARD_BG,
  children,
  className = '',
  style,
}) => {
  const hasRows = Array.isArray(rows) && rows.length > 0;
  const hasSecondary = Boolean(secondaryAction?.label);

  return (
    <div
      className={`flex flex-col items-center ${className}`}
      style={{
        ...(fill ? { flex: 1, minHeight: '100%' } : null),
        background,
        ...style,
      }}
    >
      <div
        className='flex flex-1 min-h-0 items-center w-full'
        style={{ paddingInline: 'var(--dim-space-400, 16px)' }}
      >
        <div
          className='flex flex-col items-center w-full'
          style={{
            gap: 'var(--dim-space-400, 16px)',
            padding: 'var(--dim-space-1200, 48px) var(--dim-space-400, 16px)',
            background: 'var(--surface-card-100, #FFFFFF)',
            /* Archive 178:122765 — top 100px arch, bottom radius-600 */
            borderTopLeftRadius: 'var(--dim-radius-1000, 100px)',
            borderTopRightRadius: 'var(--dim-radius-1000, 100px)',
            borderBottomLeftRadius: 'var(--dim-radius-600, 24px)',
            borderBottomRightRadius: 'var(--dim-radius-600, 24px)',
            textAlign: 'center',
          }}
        >
        {heroLottie ? (
          <LottieHero src={heroLottie} size={heroSize} fallbackSrc={heroSrc} />
        ) : heroSrc ? (
          <span className='overflow-hidden shrink-0' style={{ width: heroSize, height: heroSize }}>
            <img
              src={heroSrc}
              alt=''
              aria-hidden
              width={heroSize}
              height={heroSize}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          </span>
        ) : null}

        {title != null && title !== '' ? (
          <h1
            style={{
              margin: 0,
              width: '100%',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-2xl, 24px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.375,
              color: 'var(--text-brandPrimary-default, #007549)',
            }}
          >
            {title}
          </h1>
        ) : null}

        {description != null && description !== '' ? (
          <p
            style={{
              margin: 0,
              width: '100%',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-base, 16px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
              color: 'var(--text-content-secondary, #636B72)',
            }}
          >
            {description}
          </p>
        ) : null}

        {hasRows ? (
          <div
            className='flex flex-col w-full'
            style={{
              gap: 'var(--dim-space-100, 4px)',
              padding: 'var(--dim-space-400, 16px)',
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
              borderRadius: 'var(--dim-radius-600, 24px)',
              boxSizing: 'border-box',
            }}
          >
            {rows.map((row) => (
              <div
                key={String(row.label)}
                className='flex items-start justify-between w-full'
                style={{ gap: 'var(--dim-space-300, 12px)' }}
              >
                <span
                  style={{
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    fontWeight: 'var(--type-weight-regular, 400)',
                    lineHeight: 1.5,
                    color: 'var(--text-content-quaternary, #ADB2B7)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    fontWeight: 'var(--type-weight-bold, 700)',
                    lineHeight: 1.5,
                    color: 'var(--brand-p800, #004C31)',
                    textAlign: 'right',
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {children}

        {(primaryAction || secondaryAction) ? (
          <div
            className='flex flex-col items-center w-full'
            style={{
              /* Figma 175:94673 — buttons sit in the same gap-400 stack as title/body */
              gap: 'var(--dim-space-400, 16px)',
            }}
          >
            {primaryAction?.label != null ? (
              <BrandButton
                size='Large'
                buttonStyle='Fill'
                showLeadingIcon={Boolean(primaryAction.showLeadingIcon && primaryAction.leadingIcon)}
                leadingIcon={primaryAction.leadingIcon}
                showTailingIcon={primaryAction.showTailingIcon !== false}
                tailingIcon={primaryAction.tailingIcon || 'chevron_right'}
                fullWidth={false}
                onClick={primaryAction.onClick}
                style={{ width: SUCCESS_CARD_CTA_WIDTH, maxWidth: '100%' }}
              >
                {primaryAction.label}
              </BrandButton>
            ) : null}

            {hasSecondary ? (
              <BrandButton
                size='Large'
                buttonStyle='Outline'
                showLeadingIcon={Boolean(secondaryAction.showLeadingIcon && secondaryAction.leadingIcon)}
                leadingIcon={secondaryAction.leadingIcon}
                showTailingIcon={secondaryAction.showTailingIcon !== false}
                tailingIcon={secondaryAction.tailingIcon || 'chevron_right'}
                fullWidth={false}
                onClick={secondaryAction.onClick}
                style={{ width: SUCCESS_CARD_CTA_WIDTH, maxWidth: '100%' }}
              >
                {secondaryAction.label}
              </BrandButton>
            ) : null}
          </div>
        ) : null}
        </div>
      </div>
      {showHomeIndicator && (
        <div
          className='flex items-end justify-center shrink-0 w-full'
          aria-hidden
          style={{
            height: 'var(--dim-size-600, 32px)',
            paddingBottom: 'var(--dim-space-200, 8px)',
          }}
        >
          <span
            style={{
              width: 'var(--dim-size-2050, 144px)',
              height: 'var(--dim-space-100, 4px)',
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: 'var(--text-content-default, #111314)',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SuccessCard;
