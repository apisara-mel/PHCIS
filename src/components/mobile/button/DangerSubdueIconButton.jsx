import React from 'react';
import { MobileButtonBase, buildPalette } from './_base';

/* Mobile · DangerSubdueIconButton (Figma node 2024:4434).
   Tone = dangerButton (subdue tier). Icon-only counterpart of
   DangerSubdueButton. */

const PALETTE = buildPalette('dangerButton', {
  fillTier: 'subdue',
  variants: ['fill', 'outline'],
});

export const DangerSubdueIconButton = ({ icon, ...props }) => (
  <MobileButtonBase palette={PALETTE} iconOnly leadingIcon={icon} {...props} />
);

export default DangerSubdueIconButton;
