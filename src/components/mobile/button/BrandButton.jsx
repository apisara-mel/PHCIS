import React from 'react';
import { MobileButtonBase, buildPalette } from './_base';

/* Mobile · BrandButton (Figma node 231:29).
   Tone = brandPrimaryButton (solid fill). Variants: fill / outline / ghost.
   Sizes: md=44h, lg=56h. Pill radius. State matrix mirrors web BrandButton
   (default / hover / active / focus / disabled). See design.md §7.3.1. */

const PALETTE = buildPalette('brandPrimaryButton', { fillTier: 'solid' });

export const BrandButton = (props) => (
  <MobileButtonBase palette={PALETTE} {...props} />
);

export default BrandButton;
