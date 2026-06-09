/* MIH Mobile · barrel.
   New code should import canonical Figma names from this barrel:
     import { BrandButton, BrandIconButton, MobileCard } from 'src/components/mobile';

   The legacy `MobileButton` alias is preserved for the 19 existing
   pages — it translates the old `variant` prop onto the new button
   family. New code should NOT use MobileButton — see design.md §7.3. */
export { MobileShell, MobileAppProvider, useMobileApp } from './MobileShell';
export { Sym } from './Sym';
export { MobileButton } from './MobileButton';   /* deprecated alias */
export { MobileCard } from './Card';
export { MobileInput } from './Input';
export { MobileField } from './Field';
export { MobileBadge } from './Badge';
export { MobileHeader } from './Header';
export { MobileSectionLabel } from './SectionLabel';

/* Button family — Figma file MIH-Design-System-Foundation section 319:2012 */
export * from './button';
