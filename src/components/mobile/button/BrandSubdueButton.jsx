import React from 'react';
import { MobileButtonBase, buildPalette } from './_base';

/* Mobile · BrandSubdueButton (Figma node 2024:3589).
   Tone = brandPrimaryButton (subdue tier — quaternary bg + brand text).
   Variants: fill / outline (no ghost). Pairs with BrandButton as the
   softer brand surface used inside cards. */

const PALETTE = buildPalette('brandPrimaryButton', {
  fillTier: 'subdue',
  variants: ['fill', 'outline'],
});

export const BrandSubdueButton = (props) => (
  <MobileButtonBase palette={PALETTE} {...props} />
);

export default BrandSubdueButton;
