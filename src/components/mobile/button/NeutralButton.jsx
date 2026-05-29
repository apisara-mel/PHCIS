import React from 'react';
import { MobileButtonBase, buildPalette } from './_base';

/* Mobile · NeutralButton (Figma node 2024:3591).
   Tone = neutralButton (solid fill). Greyscale secondary surface — used
   when the action is neither brand-led nor destructive. */

const PALETTE = buildPalette('neutralButton', { fillTier: 'solid' });

export const NeutralButton = (props) => (
  <MobileButtonBase palette={PALETTE} {...props} />
);

export default NeutralButton;
