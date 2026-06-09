import React from 'react';
import { MobileButtonBase, buildPalette } from './_base';

/* Mobile · BrandCircleSubdueIconButton (Figma node 2103:645).
   Tone = brandPrimaryButton (subdue tier). Circular variant of
   BrandSubdueIconButton. */

const PALETTE = buildPalette('brandPrimaryButton', {
  fillTier: 'subdue',
  variants: ['fill', 'outline'],
});

export const BrandCircleSubdueIconButton = ({ icon, ...props }) => (
  <MobileButtonBase palette={PALETTE} iconOnly shape='circle' leadingIcon={icon} {...props} />
);

export default BrandCircleSubdueIconButton;
