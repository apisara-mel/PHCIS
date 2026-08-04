/* Shared mock handwritten signature (SVG data URL) for read-only Signature pads.
   Multi-stroke cursive + underline so it reads as ink, not a single decorative arc. */

const MOCK_SIGNATURE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 96" width="320" height="96" fill="none">
  <!-- Capital / lead flourish -->
  <path d="M18 62c4-28 18-46 34-42 10 2 14 14 8 26-8 16-22 22-34 14 14-2 36 2 48 18 4 6 2 12-6 10"
        stroke="#0F5C3A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Mid name (cursive loops) -->
  <path d="M68 58c12-22 28-34 44-28 14 6 16 24 6 34-8 8-20 6-22-4 10-2 28 4 42 18 6 6 4 12-4 11
           14-6 34-10 52 2 10 6 18 4 24-6 8-12 6-24-4-28-6-2-12 2-10 10 8 18 28 28 46 22
           14-4 22-16 18-28"
        stroke="#0F5C3A" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Trailing initial / surname kick -->
  <path d="M248 52c8-16 22-26 36-18 10 6 10 20 0 28-8 6-18 4-22-4 12 0 28 8 34 20 2 4-2 8-8 6
           10 2 22 0 30-10"
        stroke="#0F5C3A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- T-cross / accent mark -->
  <path d="M96 34c18-6 34-8 48-4" stroke="#0F5C3A" stroke-width="1.9" stroke-linecap="round"/>
  <!-- Baseline underline flourish -->
  <path d="M28 78c48 10 110 12 168 4 42-6 78-16 108-28"
        stroke="#0F5C3A" stroke-width="1.55" stroke-linecap="round" opacity="0.85"/>
  <!-- Light secondary pressure (overlap for ink depth) -->
  <path d="M72 56c10-16 24-26 38-20 12 5 14 20 5 28"
        stroke="#007549" stroke-width="1.15" stroke-linecap="round" opacity="0.45"/>
</svg>
`.trim();

export const DEMO_SIGNED_SIGNATURE_DATA_URL = `data:image/svg+xml,${encodeURIComponent(MOCK_SIGNATURE_SVG)}`;
