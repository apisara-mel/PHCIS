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

/** Clickable list row (registry drug row). */
export const PHARMACY_LIST_ROW = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-300)',
  boxShadow: 'var(--shadow-card)',
};
