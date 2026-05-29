import React from 'react';
import { MobileButtonBase, buildPalette } from './_base';

/* Mobile · NeutralSubdueIconButton (Figma node 2024:4516).
   Tone = neutralButton (subdue tier). Icon-only counterpart of
   NeutralSubdueButton. */

const PALETTE = buildPalette('neutralButton', {
  fillTier: 'subdue',
  variants: ['fill', 'outline'],
});

export const NeutralSubdueIconButton = ({ icon, ...props }) => (
  <MobileButtonBase palette={PALETTE} iconOnly leadingIcon={icon} {...props} />
);

export default NeutralSubdueIconButton;
