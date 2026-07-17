/* Figma Mobile Application · Colorful icon Badge tones (6dCDQkwc8DhvyovBbDTyp5).
   Secondary hierarchy: light 100-shade bg + saturated 700-shade icon glyph.
   `bgPressed` = one level darker (100 → 200) for Quick Action press —
   Archive Figma Quick Action Booking 519:54747 State=Hover. */

export const MOBILE_ICON_TONES = {
  purple: {
    bg: 'var(--surface-colorfulbadge-purple, #F3E8FF)',
    bgPressed: 'var(--surface-quickaction-purple-pressed, #E9D5FF)', /* purple/200 */
    fg: 'var(--text-colorfulbadge-purple, #7E22CE)',
  },
  blue: {
    bg: 'var(--surface-colorfulbadge-blue, #DBEAFE)',
    bgPressed: 'var(--surface-quickaction-blue-pressed, #BFDBFE)', /* blue/200 */
    fg: 'var(--text-colorfulbadge-blue, #1D4ED8)',
  },
  green: {
    bg: 'var(--surface-colorfulbadge-green, #E2F3EB)',
    bgPressed: 'var(--surface-quickaction-green-pressed, #C5EDDA)', /* brand/200 */
    /* Archive Figma Colorful icon Badge glyph fill #08A768 (brand/600),
       not Colorful Badge label text which stays brand/700. */
    fg: 'var(--text-brandPrimary-secondary, #08A768)',
  },
  pink: {
    bg: 'var(--surface-colorfulbadge-pink, #FCE7F3)',
    bgPressed: 'var(--surface-quickaction-pink-pressed, #FBCFE8)', /* pink/200 */
    fg: 'var(--text-colorfulbadge-pink, #BE185D)',
  },
  indigo: {
    bg: 'var(--surface-colorfulbadge-indigo, #EEF2FF)',
    bgPressed: 'var(--surface-quickaction-indigo-pressed, #C7D2FE)', /* indigo/300 */
    fg: 'var(--text-colorfulbadge-indigo, #4F46E5)',
  },
  teal: {
    bg: 'var(--surface-colorfulbadge-teal, #D1F6EE)',
    bgPressed: 'var(--surface-quickaction-teal-pressed, #A2EDDE)', /* teal/200 */
    fg: 'var(--text-colorfulbadge-teal, #196C65)',
  },
  orange: {
    bg: 'var(--surface-colorfulbadge-orange, #FFEDD5)',
    bgPressed: 'var(--surface-quickaction-orange-pressed, #FED7AA)', /* orange/200 */
    fg: 'var(--text-colorfulbadge-orange, #C2410C)',
  },
  yellow: {
    bg: 'var(--surface-colorfulbadge-yellow, #FEF9C3)',
    bgPressed: 'var(--surface-quickaction-yellow-pressed, #FEF08A)', /* yellow/200 */
    fg: 'var(--text-colorfulbadge-yellow, #A16207)',
  },
};

/* Service / appointment type → icon badge + ColorfulBadge style
   (Archive Figma Appointment Card 367:41054 · Home Feather). */
export const MOBILE_SERVICE_META = {
  video: {
    icon: 'video',
    tone: 'indigo',
    badgeStyle: 'indigo',
    badgeLabel: 'เข้ารับบริการออนไลน์',
    listIcon: 'video',
  },
  visit: {
    icon: 'map-pin',
    tone: 'green',
    badgeStyle: 'green',
    badgeLabel: 'เข้ารับบริการที่ศูนย์',
    listIcon: 'map-pin',
  },
  homevisit: {
    icon: 'home',
    tone: 'blue',
    badgeStyle: 'blue',
    badgeLabel: 'เยี่ยมบ้าน',
    listIcon: 'home',
  },
};
