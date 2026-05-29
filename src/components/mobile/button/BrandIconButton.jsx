import React from 'react';
import { MobileButtonBase, buildPalette } from './_base';

/* Mobile · BrandIconButton (Figma node 377:11596).
   Square 44×44 (md) / 56×56 (lg) — pill radius makes it visually round.
   Tone = brandPrimaryButton (solid fill). Same state matrix as
   BrandButton; renders an icon only. */

const PALETTE = buildPalette('brandPrimaryButton', { fillTier: 'solid' });

export const BrandIconButton = ({ icon, ...props }) => (
  <MobileButtonBase palette={PALETTE} iconOnly leadingIcon={icon} {...props} />
);

export default BrandIconButton;
