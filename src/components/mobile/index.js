/* MIH Mobile · barrel.
   New code should import canonical Figma names from this barrel:
     import { BrandButton, BrandIconButton, MobileCard } from 'src/components/mobile';

   The legacy `MobileButton` alias is preserved for the 19 existing
   pages — it translates the old `variant` prop onto the new button
   family. New code should NOT use MobileButton — see design.md §7.3. */
export { MobileShell, MobileAppProvider, useMobileApp } from './MobileShell';
export { Sym } from './Sym';
export { FigmaIcon, resolveFigmaIconKey } from './figmaIcons';
export { MobileButton } from './MobileButton';   /* deprecated alias */
export { MobileCard } from './Card';
/* OptionCard — Figma DS "Card" (E5DppVK8yi0EKJp1SUuKa9 39:407): selectable list card. */
export { default as MobileOptionCard } from './OptionCard';
/* ClinicCard — Figma DS "Card / Clinic" (E5DppVK8yi0EKJp1SUuKa9 39:197): centre row. */
export { default as ClinicCard } from './ClinicCard';
/* DoctorCard — Figma DS "Card / Doctor" (E5DppVK8yi0EKJp1SUuKa9 1:703): doctor row/summary. */
export { default as DoctorCard } from './DoctorCard';
/* BookingCalendar — Figma DS "Calendar / Single" (Archive 152:46901): inline month picker. */
export { default as BookingCalendar } from './BookingCalendar';
/* ServiceRequestCard — Archive Figma 194:153209 (Home ส่งคำขอ). */
export {
  default as ServiceRequestCard,
  SERVICE_REQUEST_CARD_WIDTH,
  SERVICE_REQUEST_CARD_HEIGHT,
} from './ServiceRequestCard';
export { MobileInput } from './Input';
export { MobileField } from './Field';
/* Canonical text field — mirrors the Figma DS component set "Input Field"
   (opz7X9AAKGQf5prHhsPDGn 267:50): Size × State + the 4 Show toggles.
   Prefer this over MobileInput / MobileField, which predate that component
   and do not match it (radius 12 vs full, h48 vs 56, 1.5px vs 1px border). */
export { default as MobileInputField } from './InputField';
/* Password — Figma App DS "Password" 5021:1008 (lock + eye toggle). */
export { default as Password } from './Password';
/* Textarea — Figma App DS "Textarea" 268:26 (label · multiline · helper). */
export { default as Textarea } from './Textarea';
/* SuccessCard — Archive Figma 178:122765 success template (gradient + arch card). */
export {
  default as SuccessCard,
  SUCCESS_CARD_BG,
  SUCCESS_CARD_HERO,
  SUCCESS_CARD_HERO_SIZE,
  SUCCESS_CARD_CTA_WIDTH,
} from './SuccessCard';
/* NavigationMenu — Figma DS "Navigation" (L8AlrWha3QNKcxaVCH1UFE 3:555) bottom tab bar. */
export { default as NavigationMenu, NAV_MENU_ITEMS } from './NavigationMenu';
export { MobileBadge } from './Badge';
/* ColorfulBadge — Figma App DS 2076:8413 (shared with web; same tokens). */
export { default as ColorfulBadge, COLORFUL_BADGE_STYLES } from '@/components/badge/ColorfulBadge';
export { default as SmsPush } from './SmsPush';
export { default as EmailPush } from './EmailPush';
/* AppNotification — Archive Figma 175:90671 (booking confirm push banner). */
export { default as AppNotification, buildAppointmentConfirmBody } from './AppNotification';
/* NotificationCard — Figma Design System · Card 59:148 (Default / Pressed). */
export { default as NotificationCard } from './NotificationCard';
/* HealthInfoSheet — Archive 262:33351, opened from the health-form notification. */
export { default as HealthInfoSheet } from './HealthInfoSheet';
export { default as CameraPermissionPopup } from './CameraPermissionPopup';
/* LocationPermissionPopup — Archive Figma 253:35159 (booking "ที่ศูนย์" → ตำแหน่ง). */
export { default as LocationPermissionPopup } from './LocationPermissionPopup';
export { MobileHeader, MobileNavHeader } from './Header';
export { MobileSectionLabel } from './SectionLabel';

/* Button family — Figma file MIH-Design-System-Foundation section 319:2012 */
export * from './button';
