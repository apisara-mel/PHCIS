import React from 'react';
import { buildPalette, createFigmaTextButton } from './_base';

/* Mobile · DangerSubdueButton — Figma App node 2024:3592
   Soft destructive surface. Style: Fill / Outline (no Ghost).
   Size: Large / Medium / Small · Show Leading / Tailing icon. */

const PALETTE = buildPalette('dangerButton', {
  fillTier: 'subdue',
  variants: ['fill', 'outline'],
});

export const DangerSubdueButton = createFigmaTextButton(PALETTE, {
  name: 'DangerSubdueButton',
  figmaNode: '2024:3592',
  defaultStyle: 'Fill',
  allowedStyles: ['fill', 'outline'],
});

export default DangerSubdueButton;
