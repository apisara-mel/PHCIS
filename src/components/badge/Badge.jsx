/* Legacy alias — the canonical implementation moved to `StatusBadge.jsx`
   to match the Figma component name (Status Badge · 302:73). Imports of
   `Badge` keep working unchanged. New callers should import StatusBadge
   directly:
     import StatusBadge from '@/components/badge/StatusBadge';            */

export { default } from '@/components/badge/StatusBadge';
