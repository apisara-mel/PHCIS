import React, { useRef, useState } from 'react';

/* SecondarySearch — Figma MIH DS Foundation 305:43
   Sizes  : 'default' (40px) · 'small' (36px)
   States : default (placeholder) · hover (brand border + ring)
            typing (focus, brand border + ring) · filled (neutral border + clear)
   All colors / dimensions / typography aliased from design.md via the
   dash-named CSS variables declared in src/index.css. */

const SIZE = {
  default: { h: 40, fontSize: 'var(--type-size-base)' /* 16 */ },
  small:   { h: 36, fontSize: 'var(--type-size-sm)'   /* 14 */ },
};

const Sym = ({ name, size = 16, color }) => (
  <span
    className='material-symbols-outlined'
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

/* XButton — Figma node 3345:2713 / 3345:2721 ("X Button · info").
   32×32 pill that clears the input. Default = brand-quaternary surface
   with 24 px radius; hover = brand-quaternary-hover surface with the
   radius easing into a perfect circle (9999 px). The morph happens via
   one shared transition so the rounding + tint feel cohesive.
   Background  : surface/brandprimary/quaternary       → brand/p50  (brand-aware)
   Bg (hover)  : surface/brandprimary/quaternary-hover → brand/p100 (brand-aware)
   Radius      : dimension/radius/600 (24)   → dimension/radius/full (9999) on hover
   Icon        : 16 px `close`, color text/brandPrimary/default (brand/p700) */
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
      <Sym name='close' size={16} color='currentColor' />
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
  state: stateProp,                /* force visual state: 'default' | 'hover' | 'typing' | 'filled' */
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

  // Resolve visual state (focused first; then hover; else value/empty). `stateProp` overrides for demos.
  const filled = !!v;
  const computedState = focused
    ? 'typing'
    : hover
    ? 'hover'
    : filled
    ? 'filled'
    : 'default';
  const state = stateProp || computedState;

  const isBrandBorder = state === 'typing' || state === 'hover';
  const showClear     = filled && (state === 'typing' || state === 'filled' || state === 'hover');
  const dim = SIZE[size] || SIZE.default;

  // Color of left search icon: brand on hover/typing, neutral otherwise.
  const iconColor =
    state === 'typing' ? 'var(--text-secondarysearch-typing)' :
    state === 'hover'  ? 'var(--text-secondarysearch-hover)'  :
    state === 'filled' ? 'var(--text-secondarysearch-filled)' :
                          'var(--text-secondarysearch-default)';

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => inputRef.current && inputRef.current.focus()}
      className={`relative inline-flex items-center cursor-text ${className}`}
      style={{
        height:       dim.h,
        minWidth:     224,
        maxWidth:     448,
        width:        320,
        gap:          'var(--dim-space-200)',
        paddingLeft:  'var(--dim-space-300)',
        paddingRight: 'var(--dim-space-300)',
        paddingTop:    'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-200)',
        borderRadius: 'var(--dim-radius-200)',
        background:   'var(--surface-search-default)',
        borderStyle:  'solid',
        borderWidth:  isBrandBorder ? 'var(--dim-stroke-200)' : 'var(--dim-stroke-100)',
        borderColor:  isBrandBorder
          ? `var(--border-secondarysearch-${state})`
          : `var(--border-secondarysearch-${state})`,
        boxShadow:    isBrandBorder ? '0 0 0 4px var(--ring-secondarysearch)' : 'none',
        boxSizing:    'border-box',
        transition:   'border-color 120ms ease, box-shadow 120ms ease',
        ...style,
      }}
      {...rest}
    >
      {/* Leading search icon */}
      <span
        aria-hidden
        className='inline-flex items-center justify-center shrink-0'
        style={{ width: 'var(--dim-size-300)', height: 'var(--dim-size-300)' }}
      >
        <Sym name='search' size={16} color={iconColor} />
      </span>

      {/* Input */}
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
          color: filled
            ? `var(--text-secondarysearch-${focused ? 'typing' : 'filled'})`
            : 'var(--text-secondarysearch-typing)',
        }}
      />

      {/* Clear (X) — visible when filled. Figma node 3345:2713 / 3345:2721
          ("X Button · info"). See <XButton /> definition above for the
          full hover-state spec (24→full radius, brand-quaternary tint). */}
      {showClear && <XButton onClick={handleClear} />}
    </div>
  );
};

export default SecondarySearch;
