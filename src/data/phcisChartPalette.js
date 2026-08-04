/* PHCIS dashboard categorical chart series — alias design.md only.
   Order matches /dashboard RightsDonut + DM-HT stacked bars:
   teal → pink → indigo → yellow.

   Hex fallbacks match each token's light-mode value in design.md §4
   (not the older Tailwind literals #14B8A6 / #F59E0B used in mock dashboards). */

export const PHCIS_CHART = {
  /* surface.colorfulBadge.teal-bold → Primitive/teal/500 */
  teal: 'var(--surface-colorfulbadge-teal-bold, #24A899)',
  /* surface.colorfulBadge.pink-bold → Primitive/pink/500 */
  pink: 'var(--surface-colorfulbadge-pink-bold, #EC4899)',
  /* surface.indicator.indigo → Primitive/indigo/600 */
  indigo: 'var(--surface-indicator-indigo, #6366F1)',
  /* surface.colorfulBadge.yellow-bold → Primitive/yellow/500 */
  yellow: 'var(--surface-colorfulbadge-yellow-bold, #EAB308)',
};

export const PHCIS_CHART_PALETTE = [
  PHCIS_CHART.teal,
  PHCIS_CHART.pink,
  PHCIS_CHART.indigo,
  PHCIS_CHART.yellow,
];

/** Tone keys used by consent report builders → chart series colour */
export const PHCIS_CHART_TONE = {
  positive: PHCIS_CHART.teal,
  danger: PHCIS_CHART.pink,
  info: PHCIS_CHART.indigo,
  warning: PHCIS_CHART.yellow,
  teal: PHCIS_CHART.teal,
  pink: PHCIS_CHART.pink,
  indigo: PHCIS_CHART.indigo,
  orange: PHCIS_CHART.yellow,
  yellow: PHCIS_CHART.yellow,
};

export default PHCIS_CHART;
