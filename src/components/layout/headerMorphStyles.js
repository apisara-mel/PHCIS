/** Shared scroll-morph styles — all read `--header-morph` (0→1) from `:root`. */

export const MORPH_SMOOTH_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

export const morphTitleStyle = {
  /* Page titles stay 16px (type-size-title / base) — do not shrink on scroll morph. */
  fontSize: 'var(--type-size-title, var(--type-size-base, 16px))',
  lineHeight: 'calc(1.5 + (1.3 - 1.5) * var(--header-morph, 0))',
};

export const morphTopicTitleStyle = {
  color: 'var(--text-topic-tertiary-title)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontWeight: 'var(--type-weight-regular, 400)',
  margin: 0,
  whiteSpace: 'nowrap',
  ...morphTitleStyle,
};

/** Consent wizard — collapsed title stops at sm (14px), not xs (12px). */
export const morphTopicTitleDenseStyle = {
  color: 'var(--text-topic-tertiary-title)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontWeight: 'var(--type-weight-regular, 400)',
  margin: 0,
  whiteSpace: 'nowrap',
  fontSize:
    'calc(var(--type-size-base) + (var(--type-size-sm) - var(--type-size-base)) * var(--header-morph, 0))',
  lineHeight: 'calc(1.4 + (1.35 - 1.4) * var(--header-morph, 0))',
};

export const morphStepScaleStyle = {
  transform: 'scale(calc(1 + (0.82 - 1) * var(--header-morph, 0)))',
  transformOrigin: 'center center',
  willChange: 'transform',
  backfaceVisibility: 'hidden',
};

export const morphPanelPaddingStyle = {
  paddingLeft:
    'calc(var(--dim-space-400) + (var(--dim-space-300) - var(--dim-space-400)) * var(--header-morph, 0))',
  paddingRight:
    'calc(var(--dim-space-400) + (var(--dim-space-300) - var(--dim-space-400)) * var(--header-morph, 0))',
  paddingTop:
    'calc(var(--dim-space-400) + (var(--dim-space-200) - var(--dim-space-400)) * var(--header-morph, 0))',
  paddingBottom:
    'calc(var(--dim-space-400) + (var(--dim-space-200) - var(--dim-space-400)) * var(--header-morph, 0))',
};

export const morphSubHeaderPaddingStyle = {
  paddingTop:
    'calc(var(--dim-space-400) + (var(--dim-space-200) - var(--dim-space-400)) * var(--header-morph, 0))',
  paddingBottom:
    'calc(var(--dim-space-400) + (var(--dim-space-200) - var(--dim-space-400)) * var(--header-morph, 0))',
};

export const morphStepHeaderRootStyle = {
  columnGap: 'var(--dim-space-300)',
  rowGap:
    'calc(var(--dim-space-300) + (var(--dim-space-150) - var(--dim-space-300)) * var(--header-morph, 0))',
  paddingTop:
    'calc(var(--dim-space-400) + (var(--dim-space-100) - var(--dim-space-400)) * var(--header-morph, 0))',
};

/** Consent wizard — title row + stepper glides center → right on scroll. */
export const morphStepHeaderRootDenseStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  columnGap: 'var(--dim-space-300)',
  overflow: 'hidden',
  paddingTop:
    'calc(var(--dim-space-200) + (var(--dim-space-100) - var(--dim-space-200)) * var(--header-morph, 0))',
  paddingBottom: 'var(--dim-space-0)',
};

export const morphStepHeaderTitleWrapDenseStyle = {
  flex: '1 1 auto',
  minWidth: 0,
  maxWidth: 'calc(100% - var(--header-morph-motion, 0) * 58%)',
  paddingRight: 'calc(var(--header-morph-motion, 0) * var(--dim-space-400, 16px))',
};

/** In-flow slot — reserves header height so the stepper never bleeds into page body. */
export const morphStepHeaderStepAreaDenseStyle = {
  flex: '1 1 calc(100% - 100% * var(--header-morph-motion, 0))',
  minWidth: 0,
  position: 'relative',
  minHeight:
    'calc((1 - var(--header-morph-motion, 0)) * var(--dim-size-800, 40px) + var(--header-morph-motion, 0) * var(--dim-size-600, 32px))',
  marginTop: 'calc((1 - var(--header-morph-motion, 0)) * var(--dim-space-100, 4px))',
  alignSelf: 'center',
};

/** GPU glide — horizontal center → right within the in-flow step slot. */
export const morphStepHeaderStepGlideDenseStyle = {
  position: 'absolute',
  top: 'calc(var(--header-morph-motion, 0) * 50%)',
  left: 'calc(50% + var(--header-morph-motion, 0) * 50%)',
  transform: [
    'translate3d(calc(-50% - var(--header-morph-motion, 0) * 50%), calc(var(--header-morph-motion, 0) * -50%), 0)',
    'scale(calc(1 + (0.8 - 1) * var(--header-morph-motion, 0)))',
  ].join(' '),
  transformOrigin: 'center center',
  willChange: 'transform',
  backfaceVisibility: 'hidden',
  whiteSpace: 'nowrap',
};

/** Stepper-only root (SubHeader owns title) — tighter vertical padding. */
export const morphStepOnlyRootDenseStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  columnGap: 'var(--dim-space-300)',
  overflow: 'hidden',
  paddingTop:
    'calc(var(--dim-space-100) * (1 - var(--header-morph, 0)))',
  paddingBottom: 'var(--dim-space-0)',
};

/** Stepper-only dense band (title lives in SubHeader) — scale + height
   shrink on scroll, centred; no horizontal glide toward a title row. */
export const morphStepOnlyAreaDenseStyle = {
  flex: '1 1 100%',
  minWidth: 0,
  position: 'relative',
  minHeight:
    'calc((1 - var(--header-morph-motion, 0)) * var(--dim-size-800, 40px) + var(--header-morph-motion, 0) * var(--dim-size-600, 32px))',
  marginTop: 0,
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const morphStepOnlyGlideDenseStyle = {
  position: 'relative',
  transform: 'scale(calc(1 + (0.8 - 1) * var(--header-morph-motion, 0)))',
  transformOrigin: 'center center',
  willChange: 'transform',
  backfaceVisibility: 'hidden',
  whiteSpace: 'nowrap',
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
};

/** Title narrows as morph→1 so the stepper eases onto one row (not a flex-wrap snap). */
export const morphStepHeaderTitleWrapStyle = {
  flex: '1 1 auto',
  minWidth: 0,
  maxWidth: 'calc(100% - var(--header-morph, 0) * 62%)',
};

export const morphStepHeaderStepWrapStyle = {
  flex: '1 1 calc(100% - 100% * var(--header-morph, 0))',
  transform: 'translate3d(0, calc((1 - var(--header-morph, 0)) * var(--dim-space-200, 8px)), 0)',
  willChange: 'transform',
  backfaceVisibility: 'hidden',
};

/* TabUnderline scroll-compact — GPU scale only (no height/font-size tween).
   Extra CSS transitions on top of the rAF-lerped `--header-morph-motion`
   fight each other and read as stutter; match SubHeader: drive from the var. */
export const morphTabUnderlineBarStyle = {
  transform:
    'scale3d(calc(1 + (0.88 - 1) * var(--header-morph-motion, 0)), calc(1 + (0.88 - 1) * var(--header-morph-motion, 0)), 1)',
  transformOrigin: 'left bottom',
  willChange: 'transform',
  backfaceVisibility: 'hidden',
};

/** Sticky strip hosting TabUnderline under summary (QueuePageShell). */
export const morphTabStripPaddingStyle = {
  paddingTop:
    'calc(var(--dim-space-200) + (var(--dim-space-0) - var(--dim-space-200)) * var(--header-morph-motion, 0))',
};
