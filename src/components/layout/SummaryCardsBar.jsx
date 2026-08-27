import React from 'react';
import Icon from '@/components/icons/Icon';

/* MIH SummaryCardsBar — shared white panel + status summary cards row.
   Two visual variants:

     • variant='panel' (default) — used on queue pages (OPD/MR/Treat).
       Renders inside a `surface-card-100` panel flush under SubHeader,
       cards have no border, optional title above. Tones map to
       `--surface-statussummarycard-*` tokens. Sub line uses `indicator`
       (always trending_up).

     • variant='banner' — used on the dashboard overview row.
       Renders flat (no panel), cards have a 1px brand-quaternary border
       and wrap on overflow. Tones use semantic pill tokens
       (brand/blue/teal/red/orange/purple/green). Sub line uses
       `sub` + optional `subIcon` + `subTone`.

   Both variants share the same `cards` prop shape — extra fields are
   only consumed by their respective variant. */

const Sym = ({ name, size = 16, color }) => (
  <span
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
    }}
    aria-hidden
  >
    {name}
  </span>
);

/* MaskIcon — renders an exported Figma glyph SVG (public/illustration/consent/…)
   as a recolourable mask so the icon takes the card's status ink instead of the
   SVG's baked fill. Used by panel cards whose `iconSvg` is set; cards without it
   fall back to the Material Symbol <Sym> font glyph. */
const MaskIcon = ({ src, size = 20, color = 'currentColor' }) => (
  <span
    aria-hidden
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      flexShrink: 0,
      background: color,
      WebkitMaskImage: `url(${src})`,
      maskImage: `url(${src})`,
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
    }}
  />
);

/* Banner-variant tone palette — semantic pills + brand. */
const BANNER_TONE = {
  brand:  { tile: 'var(--surface-brandPrimary-tertiary)', ink: 'var(--text-brandPrimary-default)' },
  blue:   { tile: 'var(--surface-pill-blue)',   ink: 'var(--text-pill-blue)'     },
  teal:   { tile: 'var(--surface-pill-teal)',   ink: 'var(--text-pill-teal)'     },
  red:    { tile: 'var(--surface-pill-red)',    ink: 'var(--text-pill-red)'      },
  orange: { tile: 'var(--surface-pill-orange)', ink: 'var(--text-pill-orange)'   },
  purple: { tile: 'var(--surface-pill-purple)', ink: 'var(--text-pill-purple)'   },
  green:  { tile: 'var(--surface-pill-green)',  ink: 'var(--text-pill-green)'    },
  yellow: { tile: 'var(--surface-pill-yellow)', ink: 'var(--text-pill-yellow)'   },
};

const SUB_TONE = {
  tertiary: 'var(--text-content-tertiary)',
  success:  'var(--text-pill-green)',
  danger:   'var(--text-pill-red)',
  info:     'var(--text-pill-blue)',
};

/* Panel-variant card — Status Summary Card_Horizontal (Figma 291:62532 · 10:37835).
   Tile + value ink default to the `statussummarycard-{color}` token pair
   (info · positive · inprogress · brand · destructive). A card may override
   with explicit `tileBg` / `iconInk` for tones outside that family. The tile
   glyph is an exported Figma SVG when `iconSvg` is set (recoloured to the ink
   via MaskIcon), else the Material Symbol `icon` font.
   Indicator glyph defaults to `trending_up`; pass `indicatorIconSvg` for an
   exported glyph or `indicatorIcon: null` for a plain line with no icon.
   Leading tile icons use Material **outline** (FILL 0) per PHCIS Figma 329:51905. */
const PanelSummaryCard = ({ card, hover = false }) => {
  const tile = card.tileBg || `var(--surface-statussummarycard-${card.color})`;
  const ink = card.iconInk || `var(--text-statussummarycard-${card.color}-number)`;
  const indIcon = card.indicatorIcon === undefined ? 'trending_up' : card.indicatorIcon;
  /* การ์ดสรุปเป็นตัวเลขอ่านอย่างเดียว — **ไม่มีเงา และคลิกไม่ได้** ทุกหน้า
     (ยืนยัน 10 ส.ค. 2569). prop `hover` เก็บไว้ไม่ให้ caller เดิมพัง แต่ไม่มีผล
     — อย่าเผลอใส่ .mih-summary-card หรือ onClick กลับเข้ามาอีก. */
  /* ความกว้างขั้นต่ำ 160 ไม่ใช่ 200: แถบสรุปของ "ระบบสังเกตอาการ" มี 7 ใบ
     7 × 200 + 6 × 16 (gap) = 1496px ซึ่งเกินความกว้างจริงของแถบ (~1358px)
     ใบสุดท้ายเลยตกบรรทัดใหม่แล้วยืดเต็มความกว้าง ดูเหมือนของเสีย
     160 ทำให้ 7 ใบพอดีตั้งแต่ ~1150px ขึ้นไป · หน้าที่มี ≤6 ใบไม่เปลี่ยนอะไร
     เพราะ flex-grow ยืดเต็มแถวอยู่แล้ว */
  return (
    <div
      className='flex flex-1 max-w-full min-w-[min(100%,160px)] items-start'
      style={{
        gap: 'var(--dim-space-400)',
        padding: 'var(--dim-space-400)',
        borderRadius: 'var(--dim-radius-400)',
        background: 'var(--surface-card-100)',
        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      }}
    >
      <div
        className='shrink-0 flex items-center justify-center'
        style={{
          width: 'var(--dim-size-800)',
          height: 'var(--dim-size-800)',
          borderRadius: 'var(--dim-radius-400)',
          background: tile,
          color: ink,
        }}
      >
        {card.iconSvg
          ? <MaskIcon src={card.iconSvg} size={20} color='currentColor' />
          /* Use the <Icon> adapter (not raw <Sym>) so Lucide-style names
             ('clipboard-list', 'file-text', …) render their curated SVG
             instead of leaking the ligature TEXT when Material Symbols has
             no such glyph. Material names still fall through to <Sym>. */
          : <Icon name={card.icon} size={20} color='currentColor' />}
      </div>
      <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-0)' }}>
          <span className='truncate tabular-nums' style={{
            color: ink,
            fontFamily: 'var(--type-family-body)',
            fontWeight: 'var(--type-weight-bold, 700)',
            fontSize: 'var(--type-size-lg, 18px)',
            lineHeight: 1.5,
          }}>{card.value}</span>
          {/* ป้ายกำกับตัดคำขึ้นบรรทัดใหม่ ไม่ใช่ `truncate` — พอการ์ดแคบลงเพื่อให้
             อยู่บรรทัดเดียวกันครบทุกใบ ชื่อยาว ๆ อย่าง "เตียงพร้อมรับผู้ป่วยใหม่"
             จะโดนตัดเป็น "เตียงพร้อมรับผู้…" ซึ่งอ่านไม่รู้เรื่อง */}
          <span style={{
            color: 'var(--text-statussummarycard-subtext)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            lineHeight: 1.5,
            overflowWrap: 'anywhere',
          }}>{card.label}</span>
        </div>
        {card.indicator ? (
          <span className='inline-flex items-center' style={{
            gap: 'var(--dim-space-100)',
            color: 'var(--text-statussummarycard-increase)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            lineHeight: 1.5,
          }}>
            {card.indicatorIconSvg
              ? <MaskIcon src={card.indicatorIconSvg} size={14} color='currentColor' />
              : indIcon ? <Sym name={indIcon} size={14} color='currentColor' /> : null}
            {card.indicator}
          </span>
        ) : null}
      </div>
    </div>
  );
};

/* Banner-variant card — bordered tile, wrapped, semantic-pill tones. */
const BannerSummaryCard = ({ card }) => {
  const tone = BANNER_TONE[card.tone] || BANNER_TONE.brand;
  const tileBg = card.tileBg || tone.tile;
  const iconInk = card.iconInk || tone.ink;
  return (
    <div
      /* borderColor inline, not `border-[var(...)]` — Tailwind v2.1 JIT reads
         that arbitrary value as border-WIDTH, so the class never tinted and the
         tile fell back to preflight's #E5E7EB (light, even on dark). Same
         pattern as StepProgress / VitalsForm. */
      className='flex-1 min-w-[180px] border rounded-xl p-3 flex flex-col gap-2'
      style={{
        background: 'var(--surface-card-100)',
        borderColor: 'var(--border-brandPrimary-quaternary)',
      }}
    >
      <div className='flex items-start gap-3'>
        <div
          className='w-10 h-10 rounded-lg flex items-center justify-center shrink-0'
          style={{ background: tileBg, color: iconInk }}
        >
          {/* Use the <Icon> adapter (not raw <Sym>) so Lucide-style names
             ('users', 'smile', 'activity', 'baht', 'building', …) render their
             SVG instead of leaking the ligature TEXT when Material Symbols has
             no such glyph. Material names still fall through to <Sym>. */}
          <Icon name={card.icon} size={20} color='currentColor' />
        </div>
        <div className='flex-1 min-w-0 flex flex-col leading-tight'>
          <span
            className='tabular-nums leading-none truncate'
            style={{
              color: tone.ink,
              fontFamily: 'var(--type-family-body)',
              fontWeight: 'var(--type-weight-bold, 700)',
              fontSize: 'var(--type-size-lg, 18px)',
            }}
          >
            {card.value}
          </span>
          <p className='text-xs text-ink-tertiary mt-1 truncate'>{card.label}</p>
        </div>
      </div>
      {card.sub && (
        <p
          className='text-[11px] inline-flex items-center gap-1 leading-tight'
          style={{ color: SUB_TONE[card.subTone] || SUB_TONE.tertiary }}
        >
          {card.subIcon && <Icon name={card.subIcon} size={12} />}
          <span className='truncate'>{card.sub}</span>
        </p>
      )}
    </div>
  );
};

/* Public single-card export — picks the right variant card via `variant`.
   `hover` opts the panel card into the interactive lift (Card 227:193). */
export const SummaryCard = ({ card, variant = 'panel', hover = false }) =>
  variant === 'banner' ? <BannerSummaryCard card={card} /> : <PanelSummaryCard card={card} hover={hover} />;

/* Panel title — Figma PHCIS-ALL 2760:140031 · Topic tertiary (16px bold).
   Shrinks with `--header-morph` like SubHeader titles. */
const PANEL_TITLE_STYLE = {
  color: 'var(--text-topic-tertiary-title)',
  fontFamily: 'var(--type-family-heading-content)',
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
  margin: 'var(--dim-space-0)',
  width: '100%',
  fontSize: 'var(--type-size-title, var(--type-size-base, 16px))',
  lineHeight: 1.5,
};

/* คลาสกริดของ banner variant — ต้องเป็นสตริงคงที่ให้ Tailwind JIT สแกนเจอ */
const BANNER_GRID_CLASS = {
  3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch',
  4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch',
};

const SummaryCardsBar = ({
  cards = [],
  title,
  variant = 'panel',
  /* When true the bar sits flush under SubHeader (no top pad / shadow).
     When false — Figma PHCIS_Header_Summary OPD band directly under Header.
     When flush, pass bottomShadow=true on the last white chrome row so the
     stack still casts design.md Brand Drop Shadow Bottom/100. */
  flushUnderSubHeader = true,
  bottomShadow = false,
  /* panel variant — หลุดออกจาก chrome สีขาวของส่วนหัว แล้วนั่งบนการ์ดสีขาว
     ใบของตัวเอง (แบบเดียวกับการ์ดเนื้อหาหลักของหน้า) เว้นระยะเท่ากับ container
     ของเนื้อหา การ์ดทั้งแถวจึงอ่านเป็นกลุ่มของตัวเอง ไม่ใช่ท้ายแถบหัวเรื่อง
     (มติผู้ใช้ 27 ส.ค. 69) */
  detached = false,
  /* banner variant only — จัดการ์ดเป็นกริดจำนวนคอลัมน์คงที่แทนแถวเดียวที่ยืด
     เต็มความกว้าง การ์ด 7 ใบบนจอกว้างจะบีบจนป้ายกำกับถูกตัด (…) จึงให้ตกเป็น
     สองแถวอ่านง่ายกว่า (มติผู้ใช้ 27 ส.ค. 69) รองรับ 3 หรือ 4 คอลัมน์ */
  columns,
}) => {
  if (variant === 'banner') {
    const gridClass = BANNER_GRID_CLASS[columns];
    return (
      <section className='flex flex-col gap-3'>
        {title ? <h1 style={PANEL_TITLE_STYLE}>{title}</h1> : null}
        <div className={gridClass || 'flex items-stretch gap-3 flex-wrap'}>
          {cards.map((c) => <BannerSummaryCard key={c.key} card={c} />)}
        </div>
      </section>
    );
  }

  /* panel variant (default) — Figma PHCIS-ALL 2760:140031 PHCIS_Header_Summary OPD */
  const panelTitle = title ? (
    <div className='flex w-full items-center' style={{ gap: 'var(--dim-space-400)' }}>
      <h1 style={PANEL_TITLE_STYLE}>{title}</h1>
    </div>
  ) : null;

  const cardRow = (
    <div
      className='flex w-full flex-wrap'
      style={{
        gap: 'var(--dim-space-400)',
        paddingBottom: detached ? 'var(--dim-space-0)' : 'var(--dim-space-600)',
      }}
    >
      {cards.map((c) => <PanelSummaryCard key={c.key} card={c} />)}
    </div>
  );

  /* detached — การ์ดทั้งแถวนั่งอยู่บน "การ์ดสีขาว" ใบเดียวกันแบบเดียวกับการ์ด
     เนื้อหาหลักข้างล่าง (surface-card-100 · radius 500 · shadow-card · padding 600)
     ส่วน <section> ชั้นนอกทำหน้าที่แค่เว้นระยะขอบหน้าให้ตรงคอลัมน์กัน */
  if (detached) {
    return (
      <section
        className='w-full flex flex-col'
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          paddingTop: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-0)',
        }}
      >
        <div
          className='w-full flex flex-col'
          style={{
            background: 'var(--surface-card-100, #FFFFFF)',
            borderRadius: 'var(--dim-radius-500, 24px)',
            border: 'none',
            boxShadow: 'var(--shadow-card)',
            padding: 'var(--dim-space-600)',
            gap: 'var(--dim-space-400)',
          }}
        >
          {panelTitle}
          {cardRow}
        </div>
      </section>
    );
  }

  return (
    <section
      className='w-full flex flex-col'
      style={{
        background: 'var(--surface-card-100)',
        border: 'none',
        borderTop: 'none',
        outline: 'none',
        borderBottom: flushUnderSubHeader
          ? 'none'
          : 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        boxShadow: flushUnderSubHeader
          ? (bottomShadow ? 'var(--shadow-header)' : 'none')
          : 'var(--shadow-header)',
        paddingTop: flushUnderSubHeader ? 'var(--dim-space-0)' : 'var(--dim-space-400)',
        paddingLeft: 'var(--dim-space-600)',
        paddingRight: 'var(--dim-space-600)',
        paddingBottom: 'var(--dim-space-0)',
        gap: 'var(--dim-space-400)',
      }}
    >
      {panelTitle}
      {cardRow}
    </section>
  );
};

export default SummaryCardsBar;
