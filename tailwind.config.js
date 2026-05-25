const { fontFamily } = require('tailwindcss/defaultTheme');

module.exports = {
  mode: 'jit',
  /* Negation entry skips Google Drive sync placeholders (`.!NNNNN!*`)
     and other dotfiles so the JIT scanner doesn't try to read paths
     that vanish before fs.readFileSync can resolve them. */
  purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}', '!./src/**/.*'],
  darkMode: false,
  theme: {
    extend: {
      screens: {
        xs: '402px',
      },
      fontFamily: {
        sarabun: ['Sarabun', ...fontFamily.sans],
        primary: ['Sarabun', ...fontFamily.sans],
      },
      colors: {
        // ── Brand · primary (alias var(--brand-p*) — switches per data-brand) ──
        brand: {
          50:  'var(--brand-p50)',
          100: 'var(--brand-p100)',
          200: 'var(--brand-p100)',  // tertiary surface
          300: 'var(--brand-p200)',  // border / accent
          400: 'var(--brand-p600)',  // hover / secondary text
          500: 'var(--brand-p700)',  // default fill / title
          600: 'var(--brand-p800)',  // active fill
          tealStart: '#00A4AC',
          tealEnd:   '#1FA091',
        },
        brandSecondary: {
          100: 'var(--brand-s100)',
          200: 'var(--brand-s200)',
          700: 'var(--brand-s700)',
        },
        ink: {
          DEFAULT:    '#363B3F',
          secondary:  '#636B72',
          tertiary:   '#858C92',
          quaternary: '#ADB2B7',
          line:       '#E2E4E6',
          surface:    '#F9FBFB',
          neutral:    '#F4F5F5',
        },
        badge: {
          greenBg:  '#DFF2E9', greenText:  '#007549',
          redBg:    '#FEE2E2', redText:    '#B91C1C',
          orangeBg: '#FFEDD5', orangeText: '#C2410C',
          yellowBg: '#FEF9C3', yellowText: '#A16207',
          blueBg:   '#DBEAFE', blueText:   '#1D4ED8',
          tealBg:   '#D1F6EE', tealText:   '#196C65',
          purpleBg: '#F3E8FF', purpleText: '#7E22CE',
          pinkBg:   '#FCE7F3', pinkText:   '#BE185D',
        },
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        cardHover: 'var(--shadow-card-hover)',
        header: 'var(--shadow-header)',
      },
      borderRadius: {
        /* `rounded-card` — currently --dim-radius-500 (16 px) so existing
           VitalCard / VitalSignTimelineCard / InventoryCard etc keep their
           visual. NOTE: Figma "MIH Design System · Card" (KGU3Sk3s04cgRNSbE2M78w,
           nodes 17:1458 / 17:1504) currently specs 12 px = --dim-radius-400
           for the new VitalCard variants. Track the drift in design.md before
           switching the alias — flipping 16 → 12 will shrink every existing
           card visually. */
        card: 'var(--dim-radius-500, 16px)',
        chip: 'var(--dim-radius-full, 9999px)',
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [require('@tailwindcss/forms')],
};
