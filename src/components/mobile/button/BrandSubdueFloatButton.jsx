import React from 'react';
import { MobileButtonBase, buildPalette } from './_base';

/* Mobile · BrandSubdueFloatButton (Figma node 2293:11088).
   Tone = brandPrimaryButton (subdue tier). FAB-style — pairs with a
   list/feed where one persistent action floats in the bottom-right
   corner. Renders an icon only; pair with the parent's `position:
   fixed` for placement.

   Differs from BrandSubdueIconButton in that it ships a hard shadow so
   it reads as "lifted" above scrolling content. */

const PALETTE = buildPalette('brandPrimaryButton', {
  fillTier: 'subdue',
  variants: ['fill'],
});

export const BrandSubdueFloatButton = ({ icon, style, ...props }) => (
  <MobileButtonBase
    palette={PALETTE}
    iconOnly
    shape='circle'
    leadingIcon={icon}
    style={{
      boxShadow: 'var(--shadow-brand-drop-bottom-300, 0 8px 24px rgba(0,117,73,0.18))',
      ...(style || {}),
    }}
    {...props}
  />
);

export default BrandSubdueFloatButton;
