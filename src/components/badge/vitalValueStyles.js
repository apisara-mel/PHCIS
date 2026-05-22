/* Vital summary tile value colours — Figma PHCIS | CPOE 184:17588.
 *
 * Normal reading  → text/content/default
 * Above normal    → text/danger/default (e.g. BP 128/80 + badge "สูงเล็กน้อย")
 * Mild elevation  → text/warning/default (queue PR, etc.)
 *
 * Status pill under the value uses StatusBadge (`surface/statusbadge/*`);
 * do not reuse those tokens for the numeric value. */

/** @typedef {'default'|'danger'|'warning'} VitalValueTone */

export const VITAL_VALUE_COLOR = {
  default: 'var(--text-content-default)',
  danger:  'var(--text-danger-default)',
  warning: 'var(--text-warning-default)',
};

const TONE_ALIASES = {
  default: 'default',
  danger:  'danger',
  error:   'danger',
  warning: 'warning',
  high:    'danger',
};

/** @param {{ valueTone?: string, danger?: boolean, badge?: { tone?: string, label?: string }, valueColor?: string } | null | undefined} slot */
export function resolveVitalValueTone(slot) {
  if (!slot) return 'default';
  if (slot.valueColor) return null;
  const explicit = slot.valueTone || (slot.danger ? 'danger' : null);
  if (explicit) {
    return TONE_ALIASES[explicit] || 'default';
  }
  if (slot.badge?.label) {
    const badgeTone = slot.badge.tone || 'warning';
    if (badgeTone === 'error' || badgeTone === 'danger') return 'danger';
    /* Figma 184:17588 — warning status badge still pairs with danger value text. */
    if (badgeTone === 'warning') return 'danger';
  }
  return 'default';
}

/** @param {Parameters<typeof resolveVitalValueTone>[0]} slot */
export function resolveVitalValueColor(slot) {
  if (!slot) return VITAL_VALUE_COLOR.default;
  if (slot.valueColor) return slot.valueColor;
  const tone = resolveVitalValueTone(slot);
  return VITAL_VALUE_COLOR[tone] || VITAL_VALUE_COLOR.default;
}

/** Map vital slot badge tone → StatusBadge `style` (Figma Status Badge 236:25121). */
export function resolveVitalStatusBadgeStyle(slot) {
  const tone = slot?.badge?.tone || 'warning';
  if (tone === 'error' || tone === 'danger') return 'error';
  if (tone === 'success') return 'success';
  if (tone === 'info') return 'info';
  if (tone === 'neutral') return 'neutral';
  return 'warning';
}
