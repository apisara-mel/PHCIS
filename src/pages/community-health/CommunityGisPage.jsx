import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import StatusBadge from '@/components/badge/StatusBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import PHCIS_CHART from '@/data/phcisChartPalette';
import CommunityLayout from './CommunityLayout';
import { CommunityCard } from './communityShared';
import { GIS_PINS, GIS_KIND_META, GIS_LAYERS } from './communityGisData';

/* แผนที่ภูมิศาสตร์ (GIS) — ported from claude/Community community-gis.html.

   The source is a fully custom (non-Leaflet) fake-map widget: absolutely
   positioned pin buttons over a static "world" div (percent left/top),
   a hand-rolled pan/zoom viewport, a layer switcher that swaps a
   background image, and a vanilla-JS popover built from each pin's
   data-title/data-sub/data-rows/data-badge/data-href attributes. This
   port keeps the same interaction shape but as React state:
     - selectedPin (was #gpop content built from data-* attrs)
     - zoom        (was the vp/world CSS transform + pointer drag math)
     - layer       (was #gmap[data-layer] + background image swap)

   Simplifications vs. the prototype (see task brief — correctness of
   markup/tokens/icons prioritized over 1:1 interaction fidelity):
     - No drag-to-pan and no wheel-zoom. Zoom is a discrete +/- button
       scale on the pin layer (same idea as AddressMapBlock's zoom
       buttons elsewhere in this codebase); "Recenter" resets it to 1×.
     - No real basemap imagery for the layer switcher (out of scope —
       this was never a real georeferenced map in the prototype either).
       Each layer instead tints the map surface with a distinct design
       token so the control still visibly does something.
     - No filter panel / search box (community-gis.html's #gFilterPanel,
       #gSearch) and no survey ("จุดสำรวจ") pin kind — the task scope for
       this page is pins for house / CHC / volunteer + legend + layer
       switcher + zoom + popover, which is what's built below.
     - The popover is a fixed detail panel under the map (same pattern as
       TelemedGisOverviewPanel's selected-pin panel) rather than a tooltip
       anchored to the clicked pin's on-screen position — anchoring a
       floating popover correctly under a CSS `scale()` zoom transform
       adds real complexity for no functional gain here. */

const ZOOM_MIN = 1;
const ZOOM_MAX = 2.2;
const ZOOM_STEP = 0.3;

const KIND_COLOR = {
  house: PHCIS_CHART.teal,
  chc: PHCIS_CHART.indigo,
  vol: PHCIS_CHART.pink,
};

const LAYER_BACKGROUND = {
  roads: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
  satellite: 'var(--surface-colorfulbadge-grey, #F5F7F9)',
  terrain: 'var(--surface-colorfulbadge-orange, #FFEDD5)',
};

const pinBadgeTone = (badge) => (badge ? badge.tone : 'neutral');

const CommunityGisPage = () => {
  const history = useHistory();
  const [selectedId, setSelectedId] = useState(null);
  const [layer, setLayer] = useState('roads');
  const [zoom, setZoom] = useState(ZOOM_MIN);

  const selected = useMemo(() => GIS_PINS.find((p) => p.id === selectedId) || null, [selectedId]);

  const handlePinClick = (pin) => setSelectedId((cur) => (cur === pin.id ? null : pin.id));
  const handleZoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
  const handleRecenter = () => setZoom(ZOOM_MIN);

  return (
    <CommunityLayout activeKey='gis' breadcrumb={['แผนที่ภูมิศาสตร์ (GIS)']}>
      <CommunityCard style={{ flex: '1 1 auto', minHeight: 0, gap: 'var(--dim-space-400, 16px)' }}>
        {/* Head row — title + layer switcher */}
        <div className='flex items-center justify-between flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <Icon name='travel_explore' size={20} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
                fontSize: 'var(--type-size-base, 16px)',
                fontWeight: 'var(--type-weight-title, var(--type-weight-medium, 500))',
                color: 'var(--text-content-default, #363B3F)',
              }}
            >
              ขอบเขตชุมชนดินแดง
            </p>
          </div>

          <div
            className='inline-flex items-center'
            role='group'
            aria-label='รูปแบบแผนที่'
            style={{
              gap: 'var(--dim-space-100, 4px)',
              padding: 'var(--dim-space-100, 4px)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              background: 'var(--surface-neutral-tertiary, #F4F5F5)',
            }}
          >
            {GIS_LAYERS.map((l) => {
              const active = layer === l.key;
              return (
                <button
                  key={l.key}
                  type='button'
                  onClick={() => setLayer(l.key)}
                  aria-pressed={active}
                  style={{
                    border: 0,
                    cursor: 'pointer',
                    padding: 'var(--dim-space-150, 6px) var(--dim-space-300, 12px)',
                    borderRadius: 'var(--dim-radius-200, 8px)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs, 12px)',
                    fontWeight: 'var(--type-weight-medium, 500)',
                    background: active ? 'var(--surface-card-100, #FFFFFF)' : 'transparent',
                    color: active ? 'var(--text-brandPrimary-default, #007549)' : 'var(--text-content-tertiary, #858C92)',
                    boxShadow: active ? 'var(--shadow-brand-drop-bottom-100, 0 1px 4px rgba(8,167,104,0.08))' : 'none',
                  }}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Map surface */}
        <div
          className='relative w-full flex-1'
          style={{
            minHeight: 'calc(100vh - 320px)',
            borderRadius: 'var(--dim-radius-400, 12px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            background: LAYER_BACKGROUND[layer],
            overflow: 'hidden',
            transition: 'background 150ms ease',
          }}
        >
          {/* decorative coordinate grid — same device as TelemedGisOverviewPanel */}
          {[25, 50, 75].map((p) => (
            <div
              key={`v-${p}`}
              style={{
                position: 'absolute', top: 0, bottom: 0, left: `${p}%`,
                width: 'var(--dim-stroke-100, 1px)',
                background: 'var(--border-neutral-tertiary, #E2E4E6)',
                opacity: 0.6,
              }}
            />
          ))}
          {[25, 50, 75].map((p) => (
            <div
              key={`h-${p}`}
              style={{
                position: 'absolute', left: 0, right: 0, top: `${p}%`,
                height: 'var(--dim-stroke-100, 1px)',
                background: 'var(--border-neutral-tertiary, #E2E4E6)',
                opacity: 0.6,
              }}
            />
          ))}

          {/* boundary badge */}
          <span
            className='absolute inline-flex items-center'
            style={{
              top: 'var(--dim-space-300, 12px)',
              left: 'var(--dim-space-300, 12px)',
              gap: 'var(--dim-space-150, 6px)',
              padding: 'var(--dim-space-150, 6px) var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: 'var(--surface-card-100, #FFFFFF)',
              boxShadow: 'var(--shadow-brand-drop-bottom-100, 0 1px 4px rgba(8,167,104,0.08))',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              color: 'var(--text-content-secondary, #636B72)',
            }}
          >
            <Icon name='fence' size={14} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
            ขอบเขตชุมชนดินแดง
          </span>

          {/* pin layer — scaled as a whole so the grid + boundary chrome above stay put */}
          <div
            className='absolute inset-0'
            style={{ transform: `scale(${zoom})`, transformOrigin: '50% 50%', transition: 'transform 150ms ease' }}
          >
            {GIS_PINS.map((pin) => {
              const meta = GIS_KIND_META[pin.kind];
              const color = KIND_COLOR[pin.kind];
              const active = selectedId === pin.id;
              return (
                <button
                  key={pin.id}
                  type='button'
                  onClick={() => handlePinClick(pin)}
                  aria-label={`${pin.title} · ${meta.label}`}
                  aria-pressed={active}
                  className='flex flex-col items-center'
                  style={{
                    position: 'absolute',
                    left: `${pin.x}%`,
                    top: `${pin.y}%`,
                    gap: 'var(--dim-space-050, 2px)',
                    background: 'none',
                    border: 0,
                    padding: 0,
                    cursor: 'pointer',
                    transform: active ? 'translate(-50%, -100%) scale(1.15)' : 'translate(-50%, -100%)',
                    transformOrigin: '50% 100%',
                    transition: 'transform 120ms ease',
                    zIndex: active ? 3 : 2,
                  }}
                >
                  <span
                    className='inline-flex items-center justify-center'
                    style={{
                      width: 'var(--dim-size-600, 32px)',
                      height: 'var(--dim-size-600, 32px)',
                      borderRadius: 'var(--dim-radius-full, 9999px)',
                      background: color,
                      boxShadow: active
                        ? `0 0 0 var(--dim-stroke-200, 2px) ${color}, var(--shadow-brand-drop-bottom-100, 0 1px 4px rgba(8,167,104,0.08))`
                        : 'var(--shadow-brand-drop-bottom-100, 0 1px 4px rgba(8,167,104,0.08))',
                    }}
                  >
                    <Icon name={meta.icon} size={16} style={{ color: 'var(--text-colorfulbadge-badge-on, #FFFFFF)' }} />
                  </span>
                </button>
              );
            })}
          </div>

          {/* zoom / recenter controls */}
          <div
            className='absolute flex flex-col overflow-hidden'
            style={{
              right: 'var(--dim-space-300, 12px)',
              top: 'var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-card-100, #FFFFFF)',
              boxShadow: 'var(--shadow-brand-drop-bottom-100, 0 1px 4px rgba(8,167,104,0.08))',
            }}
          >
            {[
              { icon: 'add', onClick: handleZoomIn, label: 'ขยายแผนที่' },
              { icon: 'remove', onClick: handleZoomOut, label: 'ย่อแผนที่' },
              { icon: 'my_location', onClick: handleRecenter, label: 'กลับไปตำแหน่งเริ่มต้น' },
            ].map(({ icon, onClick, label }, i) => (
              <button
                key={icon}
                type='button'
                aria-label={label}
                title={label}
                onClick={onClick}
                className='inline-flex items-center justify-center'
                style={{
                  width: 'var(--dim-size-700, 36px)',
                  height: 'var(--dim-size-700, 36px)',
                  background: 'transparent',
                  border: 0,
                  borderTop: i === 0 ? 'none' : 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
                  color: 'var(--text-content-default, #363B3F)',
                  cursor: 'pointer',
                }}
              >
                <Icon name={icon} size={18} />
              </button>
            ))}
          </div>

          {/* legend */}
          <div
            className='absolute flex flex-col'
            style={{
              left: 'var(--dim-space-300, 12px)',
              bottom: 'var(--dim-space-300, 12px)',
              gap: 'var(--dim-space-100, 4px)',
              padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              background: 'var(--surface-card-100, #FFFFFF)',
              boxShadow: 'var(--shadow-brand-drop-bottom-100, 0 1px 4px rgba(8,167,104,0.08))',
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xxs, 10px)',
                fontWeight: 'var(--type-weight-medium, 500)',
                color: 'var(--text-content-tertiary, #858C92)',
              }}
            >
              ประเภทข้อมูล
            </p>
            {Object.entries(GIS_KIND_META).map(([kind, meta]) => (
              <span
                key={kind}
                className='inline-flex items-center'
                style={{ gap: 'var(--dim-space-150, 6px)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}
              >
                <span
                  style={{
                    width: 'var(--dim-space-200, 8px)',
                    height: 'var(--dim-space-200, 8px)',
                    borderRadius: 'var(--dim-radius-full, 9999px)',
                    background: KIND_COLOR[kind],
                  }}
                />
                {meta.label}
              </span>
            ))}
          </div>
        </div>

        {/* Selected pin detail — same content the prototype's #gpop popover
            showed (title/sub/rows/badge/href), rendered as a panel under
            the map instead of a floating tooltip (see header comment). */}
        {selected ? (
          <div
            className='flex flex-col w-full'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              padding: 'var(--dim-space-400, 16px)',
            }}
          >
            <div className='flex items-start justify-between' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)', color: 'var(--text-content-default, #363B3F)' }}>
                    {selected.title}
                  </span>
                  {selected.badge && (
                    <StatusBadge style={pinBadgeTone(selected.badge)} size='small'>
                      {selected.badge.label}
                    </StatusBadge>
                  )}
                </div>
                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  {selected.sub}
                </span>
              </div>
              <button
                type='button'
                aria-label='ปิด'
                onClick={() => setSelectedId(null)}
                className='inline-flex items-center justify-center'
                style={{ width: 'var(--dim-size-600, 32px)', height: 'var(--dim-size-600, 32px)', borderRadius: 'var(--dim-radius-full, 9999px)', background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--text-content-tertiary, #858C92)', flexShrink: 0 }}
              >
                <Icon name='close' size={18} />
              </button>
            </div>

            <div style={{ height: 'var(--dim-stroke-100, 1px)', background: 'var(--border-brandPrimary-quaternary, #E2F3EB)' }} />

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-150, 6px)' }}>
              {selected.rows.map(([k, v]) => (
                <div key={k} className='flex items-start justify-between' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)', flexShrink: 0 }}>
                    {k}
                  </span>
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', fontWeight: 'var(--type-weight-medium, 500)', color: 'var(--text-content-default, #363B3F)', textAlign: 'right' }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>

            {selected.route && (
              <BrandSubdueButton
                size='sm'
                variant='outline'
                trailingIcon='arrow_forward'
                onClick={() => history.push(selected.route)}
              >
                {selected.routeLabel}
              </BrandSubdueButton>
            )}
          </div>
        ) : (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            คลิกที่หมุดบนแผนที่เพื่อดูรายละเอียด
          </span>
        )}
      </CommunityCard>
    </CommunityLayout>
  );
};

export default CommunityGisPage;
