import React, { useState } from 'react';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import BrandButton from './button/BrandButton';

/* Notification Card — Figma Design System · Card 59:148.
   Default and Pressed states share the brand rail, badge, content hierarchy,
   and optional small action button. */
const NotificationCard = ({
  title,
  time,
  body,
  icon = 'check',
  tone = 'green',
  showButton = true,
  buttonLabel = 'ชำระเงิน',
  onButtonClick,
  onClick,
  state = 'Default',
  className = '',
  style,
}) => {
  const [pressed, setPressed] = useState(false);
  const isPressed = state === 'Pressed' || pressed;

  return (
    <article
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`flex items-start overflow-hidden ${className}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick(event);
        }
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        width: '100%',
        gap: 'var(--dim-space-300, 12px)',
        padding: 'calc(var(--dim-space-300, 12px) + var(--dim-space-050, 2px)) var(--dim-space-400, 16px)',
        background: isPressed
          ? 'var(--surface-brandPrimary-quaternary-hover, #E2F3EB)'
          : 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
        borderLeft: 'var(--dim-stroke-400, 4px) solid var(--text-brandPrimary-secondary, #08A768)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      <ColorfulIconBadge
        style={tone}
        size='medium'
        icon={icon}
        styleProp={{
          width: 'var(--dim-size-600, 32px)',
          height: 'var(--dim-size-600, 32px)',
        }}
      />

      <div
        className='flex flex-1 min-w-0 flex-col items-start overflow-hidden'
        style={{ gap: 'calc(var(--dim-space-050, 2px) + var(--dim-stroke-100, 1px))' }}
      >
        <div
          className='flex items-center w-full overflow-hidden'
          style={{ gap: 'var(--dim-space-200, 8px)' }}
        >
          <h2
            className='flex-1 min-w-0'
            style={{
              margin: 0,
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
              fontStyle: 'normal',
              letterSpacing: 0,
              wordBreak: 'break-word',
              color: 'var(--text-brandPrimary-default, #007549)',
            }}
          >
            {title}
          </h2>
          <time
            className='shrink-0 whitespace-nowrap'
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'calc(var(--type-size-xxs, 10px) + var(--dim-stroke-100, 1px))',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1,
              color: 'var(--text-content-tertiary, #858C92)',
            }}
          >
            {time}
          </time>
        </div>

        <p
          style={{
            width: '100%',
            margin: 0,
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            fontWeight: 'var(--type-weight-medium, 500)',
            lineHeight: 1.5,
            color: 'var(--text-content-tertiary, #858C92)',
          }}
        >
          {body}
        </p>

        {showButton && (
          <div style={{ paddingTop: 'var(--dim-space-100, 4px)' }}>
            <BrandButton
              size='Small'
              fullWidth={false}
              trailingIcon='arrow_forward'
              onClick={(event) => {
                event.stopPropagation();
                onButtonClick?.(event);
              }}
            >
              {buttonLabel}
            </BrandButton>
          </div>
        )}
      </div>
    </article>
  );
};

export default NotificationCard;
