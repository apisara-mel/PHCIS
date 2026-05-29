import React from 'react';
import { MobileButtonBase, buildPalette } from './_base';

/* Mobile · DangerButton (Figma node 2024:3590).
   Tone = dangerButton (solid fill). Destructive / irreversible actions —
   cancel, delete, sign out. */

const PALETTE = buildPalette('dangerButton', { fillTier: 'solid' });

export const DangerButton = (props) => (
  <MobileButtonBase palette={PALETTE} {...props} />
);

export default DangerButton;
