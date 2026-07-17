import React from 'react';
import { buildPalette, createFigmaTextButton } from './_base';

/* Mobile · BrandButton — Figma App node 231:29
   Style: Fill / Outline / Ghost · Size: Large / Medium / Small
   State: Default / Hover / Active / Focus / Disable
   Show Leading icon / Show Tailing icon */

const PALETTE = buildPalette('brandPrimaryButton', { fillTier: 'solid' });

export const BrandButton = createFigmaTextButton(PALETTE, {
  name: 'BrandButton',
  figmaNode: '231:29',
  defaultStyle: 'Fill',
});

export default BrandButton;
