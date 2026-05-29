import React from 'react';
import { MobileButtonBase, buildPalette } from './_base';

/* Mobile · DangerIconButton (Figma node 2024:3701).
   Tone = dangerButton (solid fill). Icon-only counterpart of DangerButton. */

const PALETTE = buildPalette('dangerButton', { fillTier: 'solid' });

export const DangerIconButton = ({ icon, ...props }) => (
  <MobileButtonBase palette={PALETTE} iconOnly leadingIcon={icon} {...props} />
);

export default DangerIconButton;
