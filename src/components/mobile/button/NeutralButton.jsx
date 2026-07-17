import React from 'react';
import { buildPalette, createFigmaTextButton } from './_base';

/* Mobile · NeutralButton — Figma App node 2024:3591
   Greyscale secondary. Style: Fill / Outline / Ghost.
   State: Default / Hover / Active / Focus / Disable.
   Size: Large / Medium / Small · Show Leading / Tailing icon. */

const PALETTE = buildPalette('neutralButton', { fillTier: 'solid' });

export const NeutralButton = createFigmaTextButton(PALETTE, {
  name: 'NeutralButton',
  figmaNode: '2024:3591',
  defaultStyle: 'Fill',
});

export default NeutralButton;
