import React from 'react';
import { buildPalette, createFigmaTextButton } from './_base';

/* Mobile · BrandSubdueButton — Figma App node 2024:3589
   Soft brand surface. Style: Fill / Outline (no Ghost).
   Size: Large / Medium / Small · Show Leading / Tailing icon. */

const PALETTE = buildPalette('brandPrimaryButton', {
  fillTier: 'subdue',
  variants: ['fill', 'outline'],
});

export const BrandSubdueButton = createFigmaTextButton(PALETTE, {
  name: 'BrandSubdueButton',
  figmaNode: '2024:3589',
  defaultStyle: 'Fill',
  allowedStyles: ['fill', 'outline'],
});

export default BrandSubdueButton;
