import React from 'react';
import { MobileButtonBase, buildPalette } from './_base';

/* Mobile · HistoryListFormButton (Figma node 3360:2711).
   Tone = neutralButton (subdue tier). Wide pill row used inside history
   forms — sits inline with other list rows; takes leading icon + label.
   Uses neutral subdue surface so it doesn't compete with the row's
   actual data. */

const PALETTE = buildPalette('neutralButton', {
  fillTier: 'subdue',
  variants: ['fill'],
});

export const HistoryListFormButton = ({ icon, ...props }) => (
  <MobileButtonBase
    palette={PALETTE}
    leadingIcon={icon}
    size='md'
    {...props}
  />
);

export default HistoryListFormButton;
