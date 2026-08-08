import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import SecondarySearch from '@/components/search/SecondarySearch';
import { Sym } from '@/components/forms/Fields';

/* MIH AddressMapBlock — PHCIS Registration 133:9181 "ปักหมุดตำแหน่งบ้าน".

   This is a MOCK map — no Leaflet, no tile servers, no API keys. The
   background is a hand-illustrated SVG that loosely resembles a Bangkok
   street grid (parks, two highways, a river, a few side streets). The
   real interaction lives in the overlay layer:
     • Click anywhere on the map → pin jumps to the clicked spot.
     • Drag the pin → pin follows the cursor.
     • Pin position (percent of the canvas) projects to a mock lat/lng
       so the existing form state contract (`{lat, lng, pinSaved}`)
       still holds and downstream code reads the same fields it always
       did.
     • "ใช้ตำแหน่งปัจจุบัน" uses the real Geolocation API; if the device
       returns coords inside the mock bounding box we land the pin there,
       otherwise we clamp to the closest edge.
     • Zoom +/− buttons remain visual chrome (the mock has no real zoom);
       they bump a CSS scale on the SVG so the click → drag UX still
       feels alive at the high end. */

/* Mock-projection box: a 0.10° × 0.10° square around central Bangkok.
   Pin (xPct, yPct) maps linearly into this box for the displayed
   coordinate label and the persisted form state. */
const MOCK_BOUNDS = {
  /* y=0 (top of canvas) → north (higher lat).
     y=1 (bottom)        → south (lower lat). */
  north: 13.7900,
  south: 13.7400,
  /* x=0 (left)  → west (lower lng).
     x=1 (right) → east (higher lng). */
  west: 100.4700,
  east: 100.5400,
};

/* Default pin position on the canvas — roughly the "city centre" mark in
   the SVG below. Drives the initial visible coords and where the pin
   sits on first paint. */
const DEFAULT_PIN_PCT = { x: 0.5, y: 0.55 };

const clamp01 = (n) => Math.max(0, Math.min(1, n));

/* Pin percentage → lat/lng. Note the inverted y axis: top of canvas is
   higher lat (north), bottom is lower lat (south). */
const pctToLatLng = ({ x, y }) => ({
  lat: MOCK_BOUNDS.north - (MOCK_BOUNDS.north - MOCK_BOUNDS.south) * clamp01(y),
  lng: MOCK_BOUNDS.west  + (MOCK_BOUNDS.east  - MOCK_BOUNDS.west)  * clamp01(x),
});

/* lat/lng → pin percentage (inverse of the projection above). Used when
   the value comes in from outside (controlled re-render, GPS, etc.). */
const latLngToPct = ({ lat, lng }) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ...DEFAULT_PIN_PCT };
  return {
    x: clamp01((lng - MOCK_BOUNDS.west)  / (MOCK_BOUNDS.east  - MOCK_BOUNDS.west)),
    y: clamp01((MOCK_BOUNDS.north - lat) / (MOCK_BOUNDS.north - MOCK_BOUNDS.south)),
  };
};

/* Hand-drawn SVG map — 800×360 viewBox. Beige built-up base, an orange
   east-west highway with a vertical cross, a green park top-right, a
   blue river curving along the bottom, and a few thin white side
   streets to break up the negative space. Labels are positioned to
   read like a typical Thai municipal map. */
const MockMapSVG = () => (
  <svg
    viewBox='0 0 800 360'
    preserveAspectRatio='xMidYMid slice'
    style={{ width: '100%', height: '100%', display: 'block', userSelect: 'none' }}
    aria-hidden
  >
    {/* Base built-up surface */}
    <rect x='0' y='0' width='800' height='360' fill='#F4EFE5' />

    {/* Land blocks — subtle off-white rectangles for variety */}
    <rect x='40'  y='30'  width='200' height='130' fill='#FBF8F1' />
    <rect x='280' y='30'  width='220' height='90'  fill='#FBF8F1' />
    <rect x='540' y='30'  width='200' height='130' fill='#FBF8F1' />
    <rect x='40'  y='200' width='180' height='130' fill='#FBF8F1' />
    <rect x='260' y='200' width='240' height='90'  fill='#FBF8F1' />
    <rect x='540' y='200' width='220' height='100' fill='#FBF8F1' />

    {/* Park */}
    <path
      d='M540 30 Q620 25 740 40 L740 150 Q650 165 540 155 Z'
      fill='#D9EAD3'
    />
    <text x='620' y='100' fill='#3F6F39' fontSize='13' fontFamily='var(--type-family-body)' fontWeight='600' textAnchor='middle'>
      สวนเบญจกิติ
    </text>

    {/* Water — curving river along the bottom */}
    <path
      d='M0 305 Q200 285 380 310 Q560 335 800 310 L800 360 L0 360 Z'
      fill='#D0E5F7'
    />
    <text x='200' y='335' fill='#1E4E80' fontSize='12' fontFamily='var(--type-family-body)' fontStyle='italic'>
      คลองแสนแสบ
    </text>

    {/* Highways — wide orange */}
    <rect x='0'   y='170' width='800' height='22' fill='#F5C188' />
    <rect x='389' y='0'   width='22'  height='360' fill='#F5C188' />
    {/* Highway center lines */}
    <line x1='0'   y1='181' x2='800' y2='181' stroke='#FFFFFF' strokeWidth='2' strokeDasharray='10 8' />
    <line x1='400' y1='0'   x2='400' y2='360' stroke='#FFFFFF' strokeWidth='2' strokeDasharray='10 8' />

    {/* Diagonal secondary road */}
    <line x1='60'  y1='30'  x2='320' y2='160' stroke='#FFE7BD' strokeWidth='10' strokeLinecap='round' />
    <line x1='480' y1='200' x2='760' y2='320' stroke='#FFE7BD' strokeWidth='10' strokeLinecap='round' />

    {/* Thin side streets */}
    {[80, 150, 240, 470, 560, 660].map((x) => (
      <line key={`v-${x}`} x1={x} y1='0' x2={x} y2='360' stroke='#FFFFFF' strokeWidth='3' />
    ))}
    {[70, 130, 230, 270, 330].map((y) => (
      <line key={`h-${y}`} x1='0' y1={y} x2='800' y2={y} stroke='#FFFFFF' strokeWidth='3' />
    ))}

    {/* Label callouts */}
    <text x='140' y='100' fill='#8B6A3F' fontSize='13' fontFamily='var(--type-family-body)' fontWeight='600' textAnchor='middle'>
      เขตคลองเตย
    </text>
    <text x='400' y='28'  fill='#8B6A3F' fontSize='12' fontFamily='var(--type-family-body)' textAnchor='middle' opacity='0.6'>
      ถนนสุขุมวิท
    </text>
    <text x='400' y='250' fill='#8B6A3F' fontSize='13' fontFamily='var(--type-family-body)' fontWeight='600' textAnchor='middle'>
      เขตวัฒนา
    </text>
    <text x='670' y='260' fill='#8B6A3F' fontSize='13' fontFamily='var(--type-family-body)' fontWeight='600' textAnchor='middle'>
      เขตพระโขนง
    </text>

    {/* Map watermark */}
    <text
      x='792'
      y='352'
      fill='#8B6A3F'
      fontSize='10'
      fontFamily='var(--type-family-body)'
      textAnchor='end'
      opacity='0.5'
    >
      MIH Map Mock — ไม่ใช่แผนที่จริง
    </text>
  </svg>
);

const AddressMapBlock = ({
  value,
  onChange,
  heading = 'ปักหมุดตำแหน่งบ้าน',
  hint = 'ลากหมุดเพื่อปรับตำแหน่ง คลิกบนแผนที่ หรือกด “ใช้ตำแหน่งปัจจุบัน”',
  readOnly = false,
  compact = false,
}) => {
  const mapRef = useRef(null);
  const draggingRef = useRef(false);
  const [pinPct, setPinPct] = useState(() => latLngToPct(value || {}));
  const [zoom, setZoom] = useState(1);
  const [query, setQuery] = useState('');

  /* Sync from the controlled value if it changes externally (GPS, save,
     "เหมือนที่อยู่ตามทะเบียนบ้าน" copy, etc.). Skip when the change
     originated locally so we don't fight our own setState. */
  useEffect(() => {
    if (draggingRef.current) return;
    if (!Number.isFinite(value?.lat) || !Number.isFinite(value?.lng)) return;
    const next = latLngToPct({ lat: value.lat, lng: value.lng });
    if (Math.abs(next.x - pinPct.x) < 1e-4 && Math.abs(next.y - pinPct.y) < 1e-4) return;
    setPinPct(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);

  const coords = useMemo(() => pctToLatLng(pinPct), [pinPct]);
  const coordLabel = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
  const pinSaved = Boolean(value?.pinSaved);

  const emit = useCallback((nextPct, extras = {}) => {
    const ll = pctToLatLng(nextPct);
    onChange?.({ lat: ll.lat, lng: ll.lng, pinSaved: false, ...extras });
  }, [onChange]);

  /* Convert a pointer event into a pin percentage relative to the SVG
     bounding box. Used by both click-to-set and drag. */
  const eventToPct = (e) => {
    const el = mapRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - r.left) / r.width),
      y: clamp01((e.clientY - r.top)  / r.height),
    };
  };

  const handleMapClick = (e) => {
    if (readOnly) return;
    if (draggingRef.current) return; /* click after drag — ignore */
    const next = eventToPct(e);
    if (!next) return;
    setPinPct(next);
    emit(next);
  };

  /* Pointer-based drag — works on mouse + touch + pen via Pointer Events. */
  const handlePinPointerDown = (e) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    e.target.setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
  };
  const handlePinPointerMove = (e) => {
    if (!draggingRef.current) return;
    const next = eventToPct(e);
    if (!next) return;
    setPinPct(next);
  };
  const handlePinPointerUp = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.target.releasePointerCapture?.(e.pointerId);
    emit(pinPct);
  };

  const handleUseCurrent = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = latLngToPct({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPinPct(next);
        emit(next);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  /* Mock gazetteer — Thai landmarks each pinned to a fixed canvas spot.
     `aliases` carries alternate spellings so the typeahead matches
     English, transliterations, and shorter colloquial names. */
  const SEARCH_MOCKS = useMemo(() => ([
    { id: 'sukhumvit',  label: 'ถนนสุขุมวิท',          sublabel: 'เขตวัฒนา · เขตคลองเตย', aliases: ['Sukhumvit Road', 'สุขุมวิท'],            pct: { x: 0.50, y: 0.50 } },
    { id: 'khlong-toei', label: 'เขตคลองเตย',           sublabel: 'กรุงเทพมหานคร',          aliases: ['Khlong Toei', 'คลองเตย'],                 pct: { x: 0.18, y: 0.40 } },
    { id: 'benjakitti',  label: 'สวนเบญจกิติ',          sublabel: 'เขตคลองเตย',              aliases: ['Benjakitti Park', 'เบญจกิติ', 'สวน'],     pct: { x: 0.78, y: 0.28 } },
    { id: 'phra-khanong',label: 'เขตพระโขนง',           sublabel: 'กรุงเทพมหานคร',          aliases: ['Phra Khanong', 'พระโขนง'],                pct: { x: 0.84, y: 0.72 } },
    { id: 'watthana',    label: 'เขตวัฒนา',              sublabel: 'กรุงเทพมหานคร',          aliases: ['Watthana', 'วัฒนา', 'ทองหล่อ'],            pct: { x: 0.50, y: 0.72 } },
    { id: 'thonglor',    label: 'ซอยทองหล่อ',           sublabel: 'เขตวัฒนา',                aliases: ['Thonglor', 'Thong Lo', 'ทองหล่อ'],         pct: { x: 0.62, y: 0.62 } },
    { id: 'asoke',       label: 'แยกอโศก-มนตรี',        sublabel: 'เขตวัฒนา',                aliases: ['Asoke', 'อโศก'],                          pct: { x: 0.42, y: 0.40 } },
    { id: 'saen-saep',   label: 'คลองแสนแสบ',           sublabel: 'กรุงเทพมหานคร',          aliases: ['Saen Saep Canal', 'แสนแสบ', 'คลอง'],       pct: { x: 0.35, y: 0.88 } },
  ]), []);

  /* Substring match over label + sublabel + aliases. Returns up to 6
     suggestions to keep the dropdown short — feels like a real
     typeahead instead of a wall of options. */
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SEARCH_MOCKS.filter((s) => {
      const hay = [s.label, s.sublabel, ...(s.aliases || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    }).slice(0, 6);
  }, [SEARCH_MOCKS, query]);

  /* Dropdown open/close — controlled so a click outside the search +
     dropdown collapses it. `searchBoxRef` wraps both elements so the
     listener can tell whether the click landed inside or outside. */
  const searchBoxRef = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    if (!searchOpen) return undefined;
    const onDocClick = (e) => {
      if (!searchBoxRef.current?.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [searchOpen]);

  const commitSuggestion = (sug) => {
    if (!sug) return;
    setPinPct(sug.pct);
    setQuery(sug.label);
    setSearchOpen(false);
    emit(sug.pct);
  };

  const handleSearch = () => {
    /* Enter / SecondarySearch.onSubmit — commit the first dropdown row if
       there's a match; otherwise fall back to the centre-with-jitter so
       the user still sees the pin move. */
    if (suggestions.length > 0) {
      commitSuggestion(suggestions[0]);
      return;
    }
    const q = query.trim();
    if (!q) return;
    const next = { x: 0.5 + (Math.random() - 0.5) * 0.1, y: 0.5 + (Math.random() - 0.5) * 0.1 };
    setPinPct(next);
    setSearchOpen(false);
    emit(next);
  };

  const handleSave = () => {
    onChange?.({ lat: coords.lat, lng: coords.lng, pinSaved: true });
  };

  const handleZoomIn  = () => setZoom((z) => Math.min(1.8, z + 0.2));
  const handleZoomOut = () => setZoom((z) => Math.max(1, z - 0.2));

  const mapHeight = compact ? 224 : 360;
  const mapRadius = compact ? 'var(--dim-radius-600, 24px)' : 'var(--dim-radius-400)';

  return (
    <div
      className='flex flex-col w-full'
      style={compact ? { maxWidth: 718 } : {
        gap: 'var(--dim-space-300)',
        padding: 'var(--dim-space-600)',
        borderRadius: 'var(--dim-radius-400)',
        background: 'var(--surface-card-100)',
        maxWidth: 780,
      }}
    >
      {!compact && (
      <>
      {/* Header row */}
      <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
          <span style={{
            color: 'var(--text-content-default)',
            fontFamily: 'var(--type-family-heading-content)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
            fontSize: 'var(--type-size-sm)',
          }}>
            {heading}
          </span>
          {!readOnly && (
            <span style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              lineHeight: 1.5,
            }}>
              {hint}
            </span>
          )}
        </div>
        {!readOnly && (
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='my_location'
            onClick={handleUseCurrent}
          >
            ใช้ตำแหน่งปัจจุบัน
          </BrandSubdueButton>
        )}
      </div>

      {/* Search — SecondarySearch alias + typeahead dropdown anchored to
          the input. The wrapper is `relative` so the suggestions
          overlay can absolutely-position right below the field. */}
      {!readOnly && (
      <div ref={searchBoxRef} className='relative w-full'>
        <SecondarySearch
          value={query}
          onChange={(next) => {
            const v = next ?? '';
            setQuery(v);
            setSearchOpen(v.trim().length > 0);
          }}
          onSubmit={handleSearch}
          onFocus={() => { if (query.trim()) setSearchOpen(true); }}
          placeholder='ค้นหาสถานที่… (เช่น สุขุมวิท, คลองเตย, พระโขนง)'
          className='w-full'
          style={{ width: '100%', maxWidth: 'none' }}
        />
        {searchOpen && suggestions.length > 0 && (
          <div
            role='listbox'
            aria-label='ผลการค้นหา'
            className='absolute left-0 right-0 flex flex-col overflow-hidden'
            style={{
              top: 'calc(100% + var(--dim-space-100))',
              zIndex: 10,
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-200)',
              border: 'var(--dim-stroke-100) solid var(--border-card-default)',
              boxShadow: 'var(--shadow-brand-drop-bottom-100)',
              maxHeight: 240,
              overflowY: 'auto',
            }}
          >
            {suggestions.map((sug) => (
              <button
                key={sug.id}
                type='button'
                role='option'
                onClick={() => commitSuggestion(sug)}
                className='flex w-full items-center text-left'
                style={{
                  gap: 'var(--dim-space-200)',
                  padding: 'var(--dim-space-200) var(--dim-space-300)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
                  cursor: 'pointer',
                  fontFamily: 'var(--type-family-body)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-list-hover, #F4FBF8)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Sym name='location_on' size={16} color='var(--icon-content-tertiary, #858C92)' />
                <span className='flex flex-col min-w-0 flex-1'>
                  <span style={{
                    color: 'var(--text-content-default)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    fontWeight: 'var(--type-weight-medium)',
                    lineHeight: 1.5,
                  }}>
                    {sug.label}
                  </span>
                  {sug.sublabel && (
                    <span style={{
                      color: 'var(--text-content-tertiary)',
                      fontSize: 'var(--type-size-xs, 12px)',
                      lineHeight: 1.5,
                    }}>
                      {sug.sublabel}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      )}
      </>
      )}

      {/* Map canvas */}
      <div
        ref={mapRef}
        className='relative w-full overflow-hidden'
        style={{
          height: mapHeight,
          borderRadius: mapRadius,
          border: 'var(--dim-stroke-100) solid var(--border-card-default)',
          cursor: readOnly ? 'default' : 'crosshair',
          pointerEvents: readOnly ? 'none' : 'auto',
        }}
        onClick={handleMapClick}
      >
        <div
          className='absolute inset-0'
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: `${pinPct.x * 100}% ${pinPct.y * 100}%`,
            transition: draggingRef.current ? 'none' : 'transform 200ms ease',
          }}
        >
          <MockMapSVG />
        </div>

        {/* Pin */}
        <div
          role='button'
          aria-label='หมุดตำแหน่งบ้าน'
          tabIndex={0}
          onPointerDown={handlePinPointerDown}
          onPointerMove={handlePinPointerMove}
          onPointerUp={handlePinPointerUp}
          onPointerCancel={handlePinPointerUp}
          onClick={(e) => e.stopPropagation()}
          className='absolute'
          style={{
            left: `${pinPct.x * 100}%`,
            top:  `${pinPct.y * 100}%`,
            transform: 'translate(-50%, -100%)',
            color: 'var(--text-brandPrimary-default, #007549)',
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
            cursor: readOnly ? 'default' : (draggingRef.current ? 'grabbing' : 'grab'),
            touchAction: readOnly ? 'auto' : 'none',
            pointerEvents: readOnly ? 'none' : 'auto',
          }}
        >
          <Sym name='location_on' size={48} color='currentColor' />
        </div>

        {/* Lat/lng chip — anchored to the pin */}
        <div
          className='absolute inline-flex items-center pointer-events-none'
          style={{
            left: `${pinPct.x * 100}%`,
            top:  `${pinPct.y * 100}%`,
            transform: 'translate(-50%, 6px)',
            gap: 'var(--dim-space-150)',
            height: 26,
            padding: '0 var(--dim-space-300)',
            borderRadius: 'var(--dim-radius-full, 9999px)',
            background: 'var(--surface-card-100)',
            border: 'var(--dim-stroke-100) solid var(--border-card-default)',
            color: 'var(--text-content-default)',
            fontFamily: 'var(--type-family-body)',
            fontWeight: 'var(--type-weight-medium)',
            fontSize: 'var(--type-size-xs)',
            boxShadow: 'var(--shadow-brand-drop-bottom-100)',
            whiteSpace: 'nowrap',
          }}
        >
          {coordLabel}
        </div>

        {!readOnly && (
          <div
            className='absolute flex flex-col overflow-hidden'
            style={{
              right: 'var(--dim-space-300)',
              top:   'var(--dim-space-300)',
              borderRadius: 'var(--dim-radius-200)',
              background: 'var(--surface-card-100)',
              border: 'var(--dim-stroke-100) solid var(--border-card-default)',
              boxShadow: 'var(--shadow-brand-drop-bottom-100)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { icon: 'add',    onClick: handleZoomIn,  label: 'ขยายแผนที่' },
              { icon: 'remove', onClick: handleZoomOut, label: 'ย่อแผนที่'  },
            ].map(({ icon, onClick, label }, i) => (
              <button
                key={icon}
                type='button'
                aria-label={label}
                onClick={onClick}
                className='inline-flex items-center justify-center'
                style={{
                  width: 32,
                  height: 32,
                  background: 'transparent',
                  border: 'none',
                  borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100) solid var(--border-card-default)',
                  color: 'var(--text-content-default)',
                  cursor: 'pointer',
                }}
              >
                <Sym name={icon} size={18} color='currentColor' />
              </button>
            ))}
          </div>
        )}
      </div>

      {!compact && (
      <>
      {/* Footer row */}
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
        <Sym name='location_on' size={16} color='var(--text-brandPrimary-default)' />
        <span style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
        }}>
          ตำแหน่งที่บันทึก:
          {' '}
          <span style={{ color: 'var(--text-brandPrimary-default)', fontWeight: 'var(--type-weight-medium)' }}>
            {coordLabel}
          </span>
        </span>
        {!readOnly && (
          <>
            <div className='flex-1' />
            <BrandPrimaryButton
              size='sm'
              variant='outline'
              leadingIcon={pinSaved ? 'check' : 'location_on'}
              active={pinSaved}
              onClick={pinSaved ? undefined : handleSave}
              aria-label={pinSaved ? 'บันทึกตำแหน่งแล้ว' : 'บันทึกตำแหน่ง'}
            >
              {pinSaved ? 'บันทึกแล้ว' : 'บันทึกตำแหน่ง'}
            </BrandPrimaryButton>
          </>
        )}
      </div>
      </>
      )}
    </div>
  );
};

export default AddressMapBlock;
