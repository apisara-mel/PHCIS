import React from 'react';
import { MobileButtonBase, buildPalette } from './_base';

/* Mobile · DangerSubdueButton (Figma node 2024:3592).
   Tone = dangerButton (subdue tier). Softer destructive surface for
   "cancel" rows where full-red would shout. */

const PALETTE = buildPalette('dangerButton', {
  fillTier: 'subdue',
  variants: ['fill', 'outline'],
});

export const DangerSubdueButton = (props) => (
  <MobileButtonBase palette={PALETTE} {...props} />
);

export default DangerSubdueButton;
