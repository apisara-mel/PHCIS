import React from 'react';
import { MobileButtonBase, buildPalette } from './_base';

/* Mobile · NeutralIconButton (Figma node 2024:4189).
   Tone = neutralButton (solid fill). Icon-only counterpart of NeutralButton. */

const PALETTE = buildPalette('neutralButton', { fillTier: 'solid' });

export const NeutralIconButton = ({ icon, ...props }) => (
  <MobileButtonBase palette={PALETTE} iconOnly leadingIcon={icon} {...props} />
);

export default NeutralIconButton;
