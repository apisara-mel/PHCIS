/** Global scroll-morph for wizard chrome buttons + dense step bands.
    Reads `--header-morph-motion` (0→1) from `:root` (HeaderMorphRoot). */

export const MIH_CHROME_MORPH_SUBHEADER = 'mih-chrome-morph-subheader';
export const MIH_CHROME_MORPH_FOOTER = 'mih-chrome-morph-footer';
export const MIH_CHROME_MORPH_STEP_BAND = 'mih-chrome-morph-step-band';
/** Legal/copyright row only — collapses on scroll; sticky action bars stay visible. */
export const MIH_FOOTER_LEGAL_AUTOHIDE = 'mih-footer-legal-autohide';
/** Step body of a record wizard — fades + rises in when the step changes,
    so moving step → step reads as a transition instead of a hard cut. */
export const MIH_STEP_BODY_ENTER = 'mih-step-body-enter';

const STYLE_ID = 'mih-wizard-chrome-morph-style';

const STEP_BODY_ENTER_RULES = [
  '@keyframes mihStepBodyEnter {',
  '  from { opacity: 0; transform: translate3d(0, var(--motion-panel-offset-y, 8px), 0); }',
  '  to   { opacity: 1; transform: translate3d(0, 0, 0); }',
  '}',
  `.${MIH_STEP_BODY_ENTER} {`,
  '  animation: mihStepBodyEnter var(--motion-duration-calendar, 320ms)'
  + ' var(--motion-easing-enter, cubic-bezier(0.16, 1, 0.3, 1)) both;',
  '  will-change: opacity, transform;',
  '}',
  '@media (prefers-reduced-motion: reduce) {',
  `  .${MIH_STEP_BODY_ENTER} { animation: none; }`,
  '}',
].join('\n');

const FOOTER_AUTOHIDE_RULES = [
  `.${MIH_FOOTER_LEGAL_AUTOHIDE} {`,
  '  max-height: calc(var(--dim-size-1200, 56px) * (1 - var(--mih-footer-motion, 0)));',
  '  opacity: calc(1 - var(--mih-footer-motion, 0));',
  '  overflow: hidden;',
  '  will-change: max-height, opacity;',
  '}',
  `html[data-mih-footer-hidden="1"] .${MIH_FOOTER_LEGAL_AUTOHIDE} {`,
  '  pointer-events: none;',
  '  padding-top: 0 !important;',
  '  padding-bottom: 0 !important;',
  '  border-top-width: 0 !important;',
  '}',
].join('\n');

const BTN_MORPH_RULES = [
  `.${MIH_CHROME_MORPH_SUBHEADER} button,`,
  `.${MIH_CHROME_MORPH_FOOTER} button {`,
  '  height: calc(var(--mih-chrome-morph-btn-h-from) + (var(--dim-size-700, 36px) - var(--mih-chrome-morph-btn-h-from)) * var(--header-morph-motion, 0)) !important;',
  '  min-height: calc(var(--mih-chrome-morph-btn-h-from) + (var(--dim-size-700, 36px) - var(--mih-chrome-morph-btn-h-from)) * var(--header-morph-motion, 0)) !important;',
  '  font-size: calc(var(--type-size-base) + (var(--type-size-sm) - var(--type-size-base)) * var(--header-morph-motion, 0)) !important;',
  '  padding-left: calc(var(--dim-space-400) + (var(--dim-space-300) - var(--dim-space-400)) * var(--header-morph-motion, 0)) !important;',
  '  padding-right: calc(var(--dim-space-400) + (var(--dim-space-300) - var(--dim-space-400)) * var(--header-morph-motion, 0)) !important;',
  '  padding-top: calc(var(--dim-space-200) + (var(--dim-space-150) - var(--dim-space-200)) * var(--header-morph-motion, 0)) !important;',
  '  padding-bottom: calc(var(--dim-space-200) + (var(--dim-space-150) - var(--dim-space-200)) * var(--header-morph-motion, 0)) !important;',
  '  gap: calc(var(--dim-space-200) + (var(--dim-space-150) - var(--dim-space-200)) * var(--header-morph-motion, 0)) !important;',
  '}',
  `.${MIH_CHROME_MORPH_SUBHEADER} button { --mih-chrome-morph-btn-h-from: var(--dim-size-800, 40px); }`,
  `.${MIH_CHROME_MORPH_FOOTER} button { --mih-chrome-morph-btn-h-from: var(--dim-size-900, 44px); }`,
  `.${MIH_CHROME_MORPH_SUBHEADER} button .material-symbols-outlined,`,
  `.${MIH_CHROME_MORPH_FOOTER} button .material-symbols-outlined {`,
  '  font-size: calc(20px + (16px - 20px) * var(--header-morph-motion, 0)) !important;',
  '}',
  `.${MIH_CHROME_MORPH_STEP_BAND} > section {`,
  '  padding-top: calc(var(--dim-space-200) * (1 - var(--header-morph, 0))) !important;',
  '  padding-bottom: calc(var(--dim-space-600) + (var(--dim-space-100) - var(--dim-space-600)) * var(--header-morph, 0)) !important;',
  '}',
].join('\n');

/** Idempotent — safe to call from HeaderMorphRoot on every mount. */
export function injectWizardChromeMorphStyles() {
  if (typeof document === 'undefined') return;
  let s = document.getElementById(STYLE_ID);
  if (!s) {
    s = document.createElement('style');
    s.id = STYLE_ID;
    document.head.appendChild(s);
  }
  s.textContent = `${BTN_MORPH_RULES}\n${FOOTER_AUTOHIDE_RULES}\n${STEP_BODY_ENTER_RULES}`;
}
