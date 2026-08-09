/* OPD screening worklist content chrome — Figma 115:35757 / QueuePage.jsx.
   Shadow-only surfaces: no border on page content cards or nested panels. */

export const PHARMACY_WORKLIST_CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  boxShadow: 'var(--shadow-card-strong)',
};

/** Primary page body card (tabs + search + table). */
export const PHARMACY_WORKLIST_CARD_BODY = {
  ...PHARMACY_WORKLIST_CARD,
  padding: 'var(--dim-space-600)',
  gap: 'var(--dim-space-600)',
};

/** Inset panel inside a worklist card (forms, sub-sections). */
export const PHARMACY_NESTED_PANEL = {
  background: 'var(--surface-card-200)',
  borderRadius: 'var(--dim-radius-300)',
  boxShadow: 'var(--shadow-card)',
};

/** Soft inset group — same wash + border as ทะเบียนยา unit panel (UNIT_GROUP_PANEL). */
export const PHARMACY_INSET_GROUP = {
  background: 'var(--surface-neutral-quaternary, #F9FBFB)',
  borderRadius: 'var(--dim-radius-300, 12px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
  boxShadow: 'none',
};

/** Collapsed/interactive inset group — Topic-style brand wash on hover.
   Pair with `PHARMACY_INSET_GROUP` but omit inline `background` so this
   class owns default + hover surfaces (inline bg would beat `:hover`). */
export const PHARMACY_INSET_GROUP_HOVERABLE_CLASS = 'mih-pharmacy-inset-group--hoverable';

const EASE_TOPIC = 'cubic-bezier(0.32, 0.72, 0, 1)';
if (typeof document !== 'undefined') {
  const STYLE_ID = 'mih-pharmacy-inset-group-hover';
  const existing = document.getElementById(STYLE_ID);
  const css = `
.${PHARMACY_INSET_GROUP_HOVERABLE_CLASS} {
  background: var(--surface-neutral-quaternary, #F9FBFB);
  transition:
    background-color 160ms ${EASE_TOPIC},
    border-color 160ms ${EASE_TOPIC};
}
.${PHARMACY_INSET_GROUP_HOVERABLE_CLASS}:hover,
.${PHARMACY_INSET_GROUP_HOVERABLE_CLASS}:focus-within {
  background: var(--surface-topic-hover, var(--brand-p50, #F4FBF8));
  border-color: var(--border-brandPrimary-quaternary, var(--brand-p100, #E2F3EB));
}
`;
  if (existing) {
    existing.textContent = css;
  } else {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }
}

/** Clickable list row (registry drug row). */
export const PHARMACY_LIST_ROW = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-300)',
  boxShadow: 'var(--shadow-card)',
};
