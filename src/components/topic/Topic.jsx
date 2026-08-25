import React from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';

/* MIH Topic — Figma "Topic" (node 2334:1841).

   Property panel (matches Figma 1:1):
     • Hierarchy        'primary' | 'secondary' | 'tertiary'
                         | 'secondary-on' | 'tertiary-on'
     • State            'default' | 'hover' | 'disabled'    (Primary only)
     • Show Sub Text
     • Show Badge       (trailing green ColorfulBadge)
     • Show Chevron     (Primary only — chevron-up at the trailing edge)
     • Show Leading Icon (Primary only — 24×24 avatar/face slot)
     • Show Success     (24×24 green TickOnCircle)
     • trailing         optional React node — rendered after the title
                        block on Primary (e.g. Step 6 Appointment toolbar
                        actions beside the heading; Figma 4046:18305).

   Visual rules per hierarchy:
     • Primary   — card-style row: 12px padding, 12px radius, surface tint;
                   leading icon + title (`--type-weight-title` / Regular) +
                   subtext + trailing affordances.
                   State swaps the surface (default white / hover brand-p50 /
                   disabled neutral-50) and dims title/subtext on disabled.
     • Secondary — text-only row, brand-p700 title + neutral-300 subtext.
     • Tertiary  — text-only row, neutral-800 title + neutral-300 subtext.
     • Secondary-on / Tertiary-on — same titles as the base variant but with
                   a darker subtext (#858c92) for use on tinted surfaces.

   Tokens alias from design.md; brand surfaces retint via [data-brand].   */

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

const Sym = ({ name, size = 20, color }) => (
  <span
    className='material-symbols-outlined shrink-0'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
    }}
    aria-hidden
  >
    {name}
  </span>
);

/* Trailing 24×24 brand-p700 filled check-on-circle. Matches Figma's
   "TickOnCircle" component (node 2865:3972). */
const TickOnCircle = ({ size = 24, color = 'var(--text-brandprimary-default, var(--brand-p700))' }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' aria-hidden>
    <circle cx='12' cy='12' r='9' fill={color} />
    <path d='M8 12.5 11 15.5 16 9.5' stroke='#FFFFFF' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
);

const resolvePrimary = (state) => {
  switch (state) {
    case 'hover':
      return {
        bg: 'var(--surface-topic-hover, var(--brand-p50, #F4FBF8))',
        title: 'var(--text-topic-primary-hover, var(--brand-p700, #007549))',
        subtext: 'var(--text-topic-primary-subtext-hover, var(--text-content-tertiary, #858C92))',
        icon: 'var(--icon-topic-primary-default, var(--brand-p700, #007549))',
        chevron: 'var(--icon-topic-primary-default, var(--brand-p700, #007549))',
      };
    case 'disabled':
      return {
        bg: 'var(--surface-topic-disabled, #F9FBFB)',
        title: 'var(--text-topic-primary-disabled, #ADB2B7)',
        subtext: 'var(--text-topic-primary-subtext-disabled, #C9CDD0)',
        icon: 'var(--icon-topic-primary-disabled, #C9CDD0)',
        chevron: 'var(--icon-topic-primary-disabled, #C9CDD0)',
      };
    default:
      return {
        bg: 'var(--surface-topic-default, #FFFFFF)',
        title: 'var(--text-topic-primary-title, var(--brand-p700, #007549))',
        subtext: 'var(--text-topic-primary-subtext-default, var(--text-content-tertiary, #858C92))',
        icon: 'var(--icon-topic-primary-default, var(--brand-p700, #007549))',
        chevron: 'var(--icon-topic-primary-default, var(--brand-p700, #007549))',
      };
  }
};

const resolveHierarchyText = (hierarchy) => {
  switch (hierarchy) {
    case 'secondary':
    case 'secondary-on':
      return {
        title: 'var(--text-topic-secondary-title, var(--brand-p700, #007549))',
        subtext: hierarchy === 'secondary-on'
          ? 'var(--text-topic-tertiary-subtext-on, #858C92)'
          : 'var(--text-topic-tertiary-subtext, #ADB2B7)',
        titleSize: 'var(--type-size-base)',
        subSize: 'var(--type-size-xs)',
      };
    case 'tertiary':
    case 'tertiary-on':
      return {
        title: 'var(--text-topic-tertiary-title, #363B3F)',
        subtext: hierarchy === 'tertiary-on'
          ? 'var(--text-topic-tertiary-subtext-on, #858C92)'
          : 'var(--text-topic-tertiary-subtext, #ADB2B7)',
        titleSize: 'var(--type-size-base)',
        subSize: 'var(--type-size-xs)',
      };
    default:
      return null; /* primary uses its own resolver */
  }
};

const Topic = React.forwardRef(function Topic(
  {
    hierarchy = 'primary',                 /* 'primary' | 'secondary' | 'tertiary' | 'secondary-on' | 'tertiary-on' */
    state,                                  /* force 'default' | 'hover' | 'disabled' (Primary only) */
    disabled = false,
    title = 'Topic',
    subText = 'Subtext',
    leadingIcon = 'face',                  /* Material Symbols name */
    badge = 'Text',                         /* badge label */
    successIcon,                            /* React node — defaults to a green TickOnCircle */
    /* Show flags — mirror Figma property panel */
    showSubText = true,
    showBadge = true,
    showChevron = true,
    showLeadingIcon = true,
    showSuccess = true,
    /** Primary only — right-side slot after title (before badge/chevron). */
    trailing,
    onClick,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const isPrimary = hierarchy === 'primary';
  const isDisabled = disabled || state === 'disabled';
  const interactive = !!onClick && !isDisabled;
  /* Runtime hover uses CSS pseudo-classes. เฉพาะแถวที่กดได้จริงเท่านั้น —
     Topic ที่เป็นหัวข้อเฉย ๆ (ไม่มี onClick) ต้องไม่ติดสีตอนเอาเมาส์ไปวาง
     เพราะอ่านเหมือนกดได้ทั้งที่กดไม่ได้ (25 ส.ค. 2569).
     Forced `state` keeps inline tones for the design-system matrix. */
  const useRuntimeHover = isPrimary && interactive && !state && !isDisabled;
  const effectiveState = state || (isDisabled ? 'disabled' : 'default');
  const tone = isPrimary ? resolvePrimary(effectiveState) : null;

  /* Primary lays out as a card row; other hierarchies are plain text-only blocks. */
  if (isPrimary) {
    return (
      <div
        ref={ref}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-disabled={isDisabled || undefined}
        onClick={interactive ? onClick : undefined}
        className={[
          'flex items-center w-full',
          useRuntimeHover
            ? 'bg-surface-topic hover:bg-surface-topicHover focus-visible:bg-surface-topicHover'
            : '',
          className,
        ].filter(Boolean).join(' ')}
        style={{
          gap: 'var(--dim-space-300, 12px)',
          paddingLeft: 'var(--dim-space-300, 12px)',
          paddingRight: 'var(--dim-space-300, 12px)',
          paddingTop: 'var(--dim-space-200, 8px)',
          paddingBottom: 'var(--dim-space-200, 8px)',
          borderRadius: 'var(--dim-radius-400, 12px)',
          /* หัวข้อที่กดไม่ได้ = ไม่มีพื้นหลังเลย (โปร่งใส) ปล่อยให้เห็นพื้นการ์ด
             ที่อยู่ข้างหลัง — ไม่ใช่แถบสีจาง ๆ พาดขวางฟอร์ม (25 ส.ค. 2569) */
          ...(useRuntimeHover
            ? {}
            : { background: interactive || state || isDisabled ? tone.bg : 'transparent' }),
          cursor: interactive ? 'pointer' : (isDisabled ? 'not-allowed' : 'default'),
          transition: `background-color 160ms ${EASE}`,
          ...style,
        }}
        {...rest}
      >
        {/* Title + subtext block */}
        <div className='flex items-start flex-1 min-w-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {showLeadingIcon && (
            <Sym name={leadingIcon} size={24} color={tone.icon} />
          )}
          <div className='flex flex-col flex-1 min-w-0'>
            <span
              className='truncate'
              style={{
                color: tone.title,
                fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
                fontSize: 'var(--type-size-base)',
                fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                lineHeight: 1.5,
              }}
            >
              {title}
            </span>
            {showSubText && subText != null && (
              <span
                className='truncate'
                style={{
                  color: tone.subtext,
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  fontWeight: 'var(--type-weight-regular)',
                  lineHeight: 1.5,
                  marginTop: 'var(--dim-space-050, 2px)',
                }}
              >
                {subText}
              </span>
            )}
          </div>
        </div>

        {trailing}

        {/* Trailing slots */}
        {showBadge && (
          <ColorfulBadge style='green' size='small' hierarchy='secondary' showDot={false} showIcon={false}>
            {badge}
          </ColorfulBadge>
        )}
        {showSuccess && (successIcon ?? <TickOnCircle />)}
        {showChevron && (
          <Sym name='keyboard_arrow_up' size={24} color={tone.chevron} />
        )}
      </div>
    );
  }

  /* Secondary / Tertiary / *-on hierarchies — text-only block. */
  const text = resolveHierarchyText(hierarchy) || resolveHierarchyText('tertiary');
  return (
    <div
      ref={ref}
      className={`flex w-full ${className}`}
      style={{
        gap: 'var(--dim-space-300, 12px)',
        alignItems: 'flex-start',
        ...style,
      }}
      {...rest}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <span
          style={{
            color: text.title,
            fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
            fontSize: text.titleSize,
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
            lineHeight: 1.5,
          }}
        >
          {title}
        </span>
        {showSubText && subText != null && (
          <span
            style={{
              color: text.subtext,
              fontFamily: 'var(--type-family-body)',
              fontSize: text.subSize,
              fontWeight: 'var(--type-weight-medium)',
              lineHeight: 1.5,
            }}
          >
            {subText}
          </span>
        )}
      </div>
      {showBadge && (
        <ColorfulBadge style='green' size='small' hierarchy='secondary' showDot={false} showIcon={false}>
          {badge}
        </ColorfulBadge>
      )}
      {showSuccess && (successIcon ?? <TickOnCircle />)}
    </div>
  );
});

export default Topic;
