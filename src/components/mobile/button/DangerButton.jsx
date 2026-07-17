import React from 'react';
import { buildPalette, createFigmaTextButton } from './_base';

/* Mobile · DangerButton — Figma App node 2024:3590
   Destructive action. Style: Fill / Outline / Ghost.
   State: Default / Hover / Active / Focus / Disable.
   Size: Large / Medium / Small · Show Leading / Tailing icon. */

const PALETTE = buildPalette('dangerButton', { fillTier: 'solid' });

export const DangerButton = createFigmaTextButton(PALETTE, {
  name: 'DangerButton',
  figmaNode: '2024:3590',
  defaultStyle: 'Fill',
});

export default DangerButton;
