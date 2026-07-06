/* Figma Mobile Application · Colorful icon Badge tones (6dCDQkwc8DhvyovBbDTyp5).
   Secondary hierarchy: light 100-shade bg + saturated 700-shade icon glyph. */

export const MOBILE_ICON_TONES = {
  purple: {
    bg: 'var(--surface-colorfulbadge-purple, #F3E8FF)',
    fg: 'var(--text-colorfulbadge-purple, #7E22CE)',
  },
  blue: {
    bg: 'var(--surface-colorfulbadge-blue, #DBEAFE)',
    fg: 'var(--text-colorfulbadge-blue, #1D4ED8)',
  },
  green: {
    bg: 'var(--surface-colorfulbadge-green, #E2F3EB)',
    fg: 'var(--text-colorfulbadge-green, #007549)',
  },
  pink: {
    bg: 'var(--surface-colorfulbadge-pink, #FCE7F3)',
    fg: 'var(--text-colorfulbadge-pink, #BE185D)',
  },
  indigo: {
    bg: 'var(--surface-colorfulbadge-indigo, #E0E7FF)',
    fg: 'var(--text-colorfulbadge-indigo, #4338CA)',
  },
  teal: {
    bg: 'var(--surface-colorfulbadge-teal, #D1F6EE)',
    fg: 'var(--text-colorfulbadge-teal, #196C65)',
  },
};

/* Service / appointment type → icon badge + ColorfulBadge style (Figma Mobile Application). */
export const MOBILE_SERVICE_META = {
  video: {
    icon: 'videocam',
    tone: 'indigo',
    badgeStyle: 'indigo',
    badgeLabel: 'เข้ารับบริการออนไลน์',
    listIcon: 'videocam',
  },
  visit: {
    icon: 'local_hospital',
    tone: 'green',
    badgeStyle: 'green',
    badgeLabel: 'เข้ารับบริการที่ศูนย์',
    listIcon: 'medical_services',
  },
  homevisit: {
    icon: 'home',
    tone: 'blue',
    badgeStyle: 'blue',
    badgeLabel: 'เยี่ยมบ้าน',
    listIcon: 'home_health',
  },
};
