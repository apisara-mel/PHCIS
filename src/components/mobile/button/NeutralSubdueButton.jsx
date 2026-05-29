import React from 'react';
import { MobileButtonBase, buildPalette } from './_base';

/* Mobile · NeutralSubdueButton (Figma node 2024:2940).
   Tone = neutralButton (subdue tier). Soft neutral surface used for
   "later" / "skip" actions next to a primary CTA. */

const PALETTE = buildPalette('neutralButton', {
  fillTier: 'subdue',
  variants: ['fill', 'outline'],
});

export const NeutralSubdueButton = (props) => (
  <MobileButtonBase palette={PALETTE} {...props} />
);

export default NeutralSubdueButton;
