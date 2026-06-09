import React from 'react';
import { BrandButton } from './button/BrandButton';
import { BrandSubdueButton } from './button/BrandSubdueButton';
import { DangerButton } from './button/DangerButton';
import { NeutralButton } from './button/NeutralButton';

/* MIH Mobile · MobileButton — DEPRECATED variant-translation shim.

   The 19 existing /m/* pages import { MobileButton } from './MobileShell'
   and use a `variant` prop ('primary' | 'secondary' | 'ghost' | 'danger'
   | 'neutral'). The new mobile button family (see ./button/*) follows
   Figma names 1:1 — BrandButton, BrandSubdueButton, etc. — with a
   `variant` of 'fill' | 'outline' | 'ghost'.

   This shim translates the old API onto the new components so the
   existing pages keep working without churn. NEW CODE should import
   the canonical Figma-named button directly:

     import { BrandButton, DangerButton } from '@/components/mobile';

   See design.md §7.3 for the full mapping. */

const VARIANT_TO_COMPONENT = {
  primary:   { Component: BrandButton,       variant: 'fill'    },
  secondary: { Component: BrandSubdueButton, variant: 'outline' },
  ghost:     { Component: BrandButton,       variant: 'ghost'   },
  danger:    { Component: DangerButton,      variant: 'fill'    },
  neutral:   { Component: NeutralButton,     variant: 'outline' },
};

export const MobileButton = ({
  variant = 'primary',
  icon,
  iconRight,
  children,
  ...rest
}) => {
  const mapped = VARIANT_TO_COMPONENT[variant] || VARIANT_TO_COMPONENT.primary;
  const { Component, variant: figmaVariant } = mapped;
  return (
    <Component
      variant={figmaVariant}
      leadingIcon={icon}
      trailingIcon={iconRight}
      {...rest}
    >
      {children}
    </Component>
  );
};

export default MobileButton;
