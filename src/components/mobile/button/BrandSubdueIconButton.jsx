import React from 'react';
import { MobileButtonBase, buildPalette } from './_base';

/* Mobile · BrandSubdueIconButton (Figma node 2024:4352).
   Tone = brandPrimaryButton (subdue tier). Icon-only counterpart of
   BrandSubdueButton. */

const PALETTE = buildPalette('brandPrimaryButton', {
  fillTier: 'subdue',
  variants: ['fill', 'outline'],
});

export const BrandSubdueIconButton = ({ icon, ...props }) => (
  <MobileButtonBase palette={PALETTE} iconOnly leadingIcon={icon} {...props} />
);

export default BrandSubdueIconButton;
