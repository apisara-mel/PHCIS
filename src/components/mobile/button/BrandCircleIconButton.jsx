import React from 'react';
import { MobileButtonBase, buildPalette } from './_base';

/* Mobile · BrandCircleIconButton (Figma node 2103:548).
   Tone = brandPrimaryButton (solid fill). Force-circular icon button —
   `shape='circle'` applies border-radius:50% (instead of pill) for
   unambiguous circular geometry even at non-square aspect ratios. */

const PALETTE = buildPalette('brandPrimaryButton', { fillTier: 'solid' });

export const BrandCircleIconButton = ({ icon, ...props }) => (
  <MobileButtonBase palette={PALETTE} iconOnly shape='circle' leadingIcon={icon} {...props} />
);

export default BrandCircleIconButton;
