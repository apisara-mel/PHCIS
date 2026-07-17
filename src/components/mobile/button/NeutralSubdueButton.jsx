import React from 'react';
import { buildPalette, createFigmaTextButton } from './_base';

/* Mobile · NeutralSubdueButton — Figma App node 2024:2940
   Soft neutral surface. Style: Fill / Outline (no Ghost).
   Size: Large / Medium / Small · Show Leading / Tailing icon. */

const PALETTE = buildPalette('neutralButton', {
  fillTier: 'subdue',
  variants: ['fill', 'outline'],
});

export const NeutralSubdueButton = createFigmaTextButton(PALETTE, {
  name: 'NeutralSubdueButton',
  figmaNode: '2024:2940',
  defaultStyle: 'Fill',
  allowedStyles: ['fill', 'outline'],
});

export default NeutralSubdueButton;
