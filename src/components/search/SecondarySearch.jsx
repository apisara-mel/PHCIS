import React, { useRef, useState } from 'react';
import { Icon } from '@/components/icons/Icon';

/* SecondarySearch — Figma MIH DS Foundation 305:43
   Sizes  : 'default' (40px · body4 14px) · 'small' (36px · caption1 12px)
   States : default · hover · focus · typing · filled — same color matrix as
            Primary Search (2056:4246); compact 8 px radius shell only.
   All colors / dimensions / typography aliased from design.md via tokens.css. */

const SIZE = {
  default: { h: 40, fontSize: 'var(--type-size-sm, 14px)' /* body4 */ },
  small:   { h: 36, fontSize: 'var(--type-size-xs, 12px)' /* caption1 */ },
};

/* XButton — Figma node 3345:2713 / 3345:2721 ("X Button · info").
   32×32 pill that clears the input. Default = brand-quaternary surface
   with 24 px radius; hover = brand-quaternary-hover surface with the
   radius easing into a perfect circle (9999 px). */
const XButton = ({ onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type='button'
      aria-label='clear search'
      onMouseDown={(e) => e.preventDefault() /* keep input focused */}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='inline-flex items-center justify-center shrink-0'
      style={{
        width:  'var(--dim-size-600)',  /* 32 */
        height: 'var(--dim-size-600)',
        borderRadius: hovered ? 'var(--dim-radius-full)' : 'var(--dim-radius-600)',
        background: hovered
          ? 'var(--surface-brandPrimary-quaternary-hover)'
          : 'var(--surface-brandPrimary-quaternary)',
        color: 'var(--text-brandPrimary-default)',
        border: 'none',
        cursor: 'pointer',
        padding: 'var(--dim-space-0)',
        transition:
          'background-color 150ms ease-out, border-radius 200ms ease-out, color 150ms ease-out',
      }}
    >
      <Icon name='close' size={16} style={{ color: 'currentColor' }} />
    </button>
  );
};

const SecondarySearch = ({
  value,
  defaultValue = '',
  onChange,
  onSubmit,
  placeholder = 'Search...',
  size = 'default',
  state: stateProp,                /* force: 'default' | 'hover' | 'focus' | 'typing' | 'filled' */
  fullWidth = false,
  className = '',
  style = {},
  ...rest
}) => {
  const isControlled = value !== undefined;
  const [innerValue, setInnerValue] = useState(defaultValue);
  const v = isControlled ? value : innerValue;

  const [focused, setFocused] = useState(false);
  const [hover,   setHover]   = useState(false);
  const inputRef = useRef(null);

  const handleChange = (e) => {
    if (!isControlled) setInnerValue(e.target.value);
    onChange && onChange(e.target.value, e);
  };
  const handleClear = () => {
    if (!isControlled) setInnerValue('');
    onChange && onChange('', null);
    inputRef.current && inputRef.current.focus();
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSubmit) onSubmit(v);
    if (e.key === 'Escape' && v) handleClear();
  };

  /* 5-state resolver — mirrors PrimarySearch (2056:4246):
       focused + empty   → focus
       focused + value   → typing
       blurred  + value  → filled */
  const filled = !!v;
  const computedState = focused
    ? (filled ? 'typing' : 'focus')
    : hover
    ? 'hover'
    : filled
    ? 'filled'
    : 'default';
  const forcedState = String(stateProp || '').toLowerCase();
  const state = forcedState === 'pressed' ? 'hover' : (forcedState || computedState);

  const showClear = filled && (state === 'typing' || state === 'filled' || state === 'hover');
  const dim = SIZE[size] || SIZE.default;

  const iconColor  = `var(--icon-secondarysearch-${state})`;
  const inputColor = `var(--text-secondarysearch-${state})`;
  const stretch = fullWidth || style.width === '100%' || /\bw-full\b/.test(className);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => inputRef.current && inputRef.current.focus()}
      className={`relative ${stretch ? 'flex' : 'inline-flex'} items-center cursor-text ${className}`}
      style={{
        height:       dim.h,
        minWidth:     stretch ? 0 : 224,
        maxWidth:     stretch ? 'none' : 448,
        width:        stretch ? '100%' : 320,
        gap:          'var(--dim-space-200)',
        paddingLeft:  'var(--dim-space-300)',
        paddingRight: 'var(--dim-space-300)',
        paddingTop:    'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-200)',
        borderRadius: 'var(--dim-radius-200)',
        background:   'var(--surface-search-default)',
        borderStyle:  'solid',
        borderWidth:  'var(--dim-stroke-200)',
        borderColor:  `var(--border-secondarysearch-${state})`,
        boxShadow:    'var(--shadow-secondarysearch, var(--shadow-primarysearch))',
        boxSizing:    'border-box',
        transition:   'border-color 120ms ease, box-shadow 120ms ease',
        ...style,
      }}
      {...rest}
    >
      <span
        aria-hidden
        className='inline-flex items-center justify-center shrink-0'
        style={{ width: 'var(--dim-size-300)', height: 'var(--dim-size-300)' }}
      >
        <Icon name='search' size={16} style={{ color: iconColor }} />
      </span>

      <input
        ref={inputRef}
        type='search'
        value={v}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className='mih-secondary-search__input flex-1 min-w-0 bg-transparent outline-none border-0 p-0'
        style={{
          fontFamily: 'var(--type-family-body)',
          fontSize:   dim.fontSize,
          fontWeight: 'var(--type-weight-regular)',
          lineHeight: 1.5,
          outline: 'none',
          boxShadow: 'none',
          WebkitAppearance: 'none',
          color: inputColor,
          '--secondarysearch-input-color': inputColor,
        }}
      />

      {showClear && <XButton onClick={handleClear} />}
    </div>
  );
};

export default SecondarySearch;
