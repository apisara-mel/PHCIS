import React, { useEffect, useRef, useState } from 'react';
import Icon from '@/components/icons/Icon';
import Dropdown from '@/components/forms/Dropdown';
import SecondarySearch from '@/components/search/SecondarySearch';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { TabBar, TabPillLarge } from '@/components/tab/TabPill';
import { PyramidPct, AreaLineChart, Pie } from '@/components/graph/Charts';

/* Deterministic 0.6 - 1.4 scale factor — keeps mock data feeling
 * "live" when filters change without needing a backend. */
const scaleFactor = (...vals) => {
  const s = vals.filter(Boolean).join('|');
  if (!s) return 1;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return 0.6 + (Math.abs(h) % 80) / 100;
};
const labelOf = (opts, val) => opts.find((o) => o.value === val)?.label;
const useFilters = (defaults = {}) => {
  const [filters, setFilters] = useState(defaults);
  const setKey = (key) => (v) => setFilters((f) => ({ ...f, [key]: v }));
  return [filters, setKey, () => setFilters(defaults)];
};

/**
 * Detailed analytical charts (Figma 4:8608, 4:8609, 4:8610, 4:8611).
 * Each card has filter toolbar (selects + buttons) and chart body.
 *
 * Color usage (per design.md):
 *   - "ค้นหา" button = brand-p700 (filled brand) → switches with [data-brand]
 *   - "Export Excel" = Figma "Brand Subdue Button" 2024:2430
 *       surface/brandprimarybutton/tertiary  +  text/brandprimarybutton/default
 *     Both tokens are brand-aware → retint when [data-brand] changes.
 *   - Chart series use semantic pills (blue/red/orange/teal/purple) so
 *     categories stay distinguishable across brand modes; the "primary"
 *     series in #2 (line chart) uses brand-aware tokens.
 */

/* ── Filter toolbar — shared by all 4 widgets ───────────────── */
const Select = ({ placeholder, value, onChange, options }) => (
  <Dropdown
    className='flex-1 min-w-[160px]'
    placeholder={placeholder}
    value={value || ''}
    onChange={onChange}
    options={options || []}
    size='md'
  />
);

/* Common filter option sets used by the chart toolbars */
const DISTRICT_OPTS = [
  { value: 'minburi',    label: 'เขตมีนบุรี'    },
  { value: 'ladkrabang', label: 'เขตลาดกระบัง' },
  { value: 'yannawa',    label: 'เขตยานนาวา'   },
  { value: 'sampanthawong', label: 'เขตสัมพันธวงศ์' },
  { value: 'phayathai',  label: 'เขตพญาไท'    },
  { value: 'thonburi',   label: 'เขตธนบุรี'    },
  { value: 'bangkokyai', label: 'เขตบางกอกใหญ่' },
  { value: 'huaykwang',  label: 'เขตห้วยขวาง'  },
  { value: 'klongsan',   label: 'เขตคลองสาน'   },
  { value: 'taling-chan', label: 'เขตตลิ่งชัน'  },
];
const CENTER_OPTS = [
  { value: 'c1', label: 'ศูนย์ 1 บางรัก'   },
  { value: 'c2', label: 'ศูนย์ 2 ราชเทวี'  },
  { value: 'c3', label: 'ศูนย์ 3 บางซื่อ'  },
  { value: 'c4', label: 'ศูนย์ 4 ดินแดง'   },
  { value: 'c5', label: 'ศูนย์ 5 จุฬาลงกรณ์' },
];
const YEAR_OPTS = [
  { value: '2569', label: '2569' },
  { value: '2568', label: '2568' },
  { value: '2567', label: '2567' },
  { value: '2566', label: '2566' },
];

const Toolbar = ({ children, onReset, onExport }) => (
  <div className='flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[var(--border-brandPrimary-quaternary)] shadow-header'>
    {children}
    <div className='flex items-center gap-2 ml-auto'>
      <button
        type='button'
        onClick={onReset}
        className='h-9 px-4 rounded-lg bg-brand-500 text-white text-sm font-medium inline-flex items-center gap-1.5 hover:bg-brand-600'
        title='ล้างตัวกรอง'
      >
        <Icon name='search' size={14} />
        ค้นหา
      </button>
      <BrandSubdueButton size='sm' onClick={onExport} leadingIcon='description'>
        Export Excel
      </BrandSubdueButton>
    </div>
  </div>
);

const ChartCard = ({ label, title, toolbar, onReset, onExport, children, className = '' }) => (
  <section
    className={`bg-white rounded-card shadow-card overflow-hidden flex flex-col ${className}`}
  >
    {label && (
      <div className='px-4 pt-3 text-sm font-bold text-ink'>{label}</div>
    )}
    <Toolbar onReset={onReset} onExport={onExport}>{toolbar}</Toolbar>
    {title && (
      <h4 className='text-sm font-bold text-ink-secondary text-center px-4 pt-4'>{title}</h4>
    )}
    <div className='flex-1 p-4'>{children}</div>
  </section>
);

/* ───────── 1) จำนวนประชากรจำแนกตามช่วงอายุ — pyramid (Figma 4:8608) ───────── */
const PYRAMID_PCT = [
  { label: '85+',   malePct: 1.01, femalePct: 1.36 },
  { label: '80-84', malePct: 0.93, femalePct: 1.17 },
  { label: '75-79', malePct: 1.71, femalePct: 2.13 },
  { label: '70-74', malePct: 2.99, femalePct: 3.65 },
  { label: '65-69', malePct: 3.99, femalePct: 4.96 },
  { label: '60-64', malePct: 4.30, femalePct: 5.18 },
  { label: '55-59', malePct: 3.59, femalePct: 4.37 },
  { label: '50-54', malePct: 3.13, femalePct: 3.48 },
  { label: '45-49', malePct: 3.23, femalePct: 3.35 },
  { label: '40-44', malePct: 3.28, femalePct: 3.27 },
  { label: '35-39', malePct: 3.21, femalePct: 3.05 },
  { label: '30-34', malePct: 3.17, femalePct: 3.10 },
  { label: '25-29', malePct: 2.69, femalePct: 2.54 },
  { label: '20-24', malePct: 2.63, femalePct: 2.44 },
  { label: '15-19', malePct: 2.80, femalePct: 2.53 },
  { label: '10-14', malePct: 2.49, femalePct: 2.42 },
  { label: '05-09', malePct: 1.95, femalePct: 1.84 },
  { label: '00-04', malePct: 1.11, femalePct: 1.06 },
];

const subtitleFor = (district, center) =>
  labelOf(CENTER_OPTS, center) || labelOf(DISTRICT_OPTS, district) || 'ภาพรวม';

export const PopulationPyramidCard = () => {
  const [{ district, center }, set, reset] = useFilters({});
  const k = scaleFactor(district, center);
  const data = PYRAMID_PCT.map((g) => ({
    ...g,
    malePct:   +(g.malePct   * k).toFixed(2),
    femalePct: +(g.femalePct * k).toFixed(2),
  }));
  return (
    <ChartCard
      label='จำนวนประชากรจำแนกตามช่วงอายุ'
      title={`จำนวนประชากรจำแนกตามช่วงอายุ ${subtitleFor(district, center)}`}
      onReset={reset}
      toolbar={
        <>
          <Select placeholder='เลือกเขต'         value={district} onChange={set('district')} options={DISTRICT_OPTS} />
          <Select placeholder='เลือกศูนย์บริการ'  value={center}   onChange={set('center')}   options={CENTER_OPTS} />
        </>
      }
    >
      <div className='flex'>
        <div className='w-8 flex items-center justify-center'>
          <span
            className='text-[10px] text-ink-tertiary'
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            ช่วงอายุ
          </span>
        </div>
        <div className='flex-1'>
          <PyramidPct
            groups={data}
            maleColor='#6366F1'
            femaleColor='#EC4899'
          />
        </div>
      </div>
    </ChartCard>
  );
};

/* ───────── 2) ประเภทผู้มารับบริการ OPD — area line (Figma 4:8609) ───────── */
const FISCAL_MONTHS = ['ต.ค.','พ.ย.','ธ.ค.','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.'];
const OPD_TYPE = {
  months: FISCAL_MONTHS,
  series: [
    {
      label: 'ในเขต',
      color: '#14B8A6',
      values: [4526, 6851, 13778, 21833, 22265, 21012, 14494, 15317, 18139, 19202, 16881, 3224],
    },
    {
      label: 'นอกเขต',
      color: '#EC4899',
      values: [1252, 1912, 1991, 3386, 2693, 2296, 1133, 1350, 2414, 3152, 2417, 414],
    },
  ],
};

export const OpdTypeLineCard = () => {
  const [{ year, district, center }, set, reset] = useFilters({ year: '2569' });
  const k = scaleFactor(year, district, center);
  const data = {
    ...OPD_TYPE,
    series: OPD_TYPE.series.map((s) => ({
      ...s,
      values: s.values.map((v) => Math.round(v * k)),
    })),
  };
  return (
    <ChartCard
      label='ประเภทผู้มารับบริการผู้ป่วยนอก'
      title={`กราฟแสดงจำนวนผู้มารับบริการผู้ป่วยนอกแยกตามประเภท ${subtitleFor(district, center)} ในปีงบฯ ${year || '2569'}`}
      onReset={() => reset()}
      toolbar={
        <>
          <Select placeholder='เลือกปี'           value={year}     onChange={set('year')}     options={YEAR_OPTS} />
          <Select placeholder='เลือกเขต'          value={district} onChange={set('district')} options={DISTRICT_OPTS} />
          <Select placeholder='เลือกศูนย์บริการ'   value={center}   onChange={set('center')}   options={CENTER_OPTS} />
        </>
      }
    >
      <div className='flex'>
        <div className='w-6 flex items-center justify-center'>
          <span
            className='text-[10px] text-ink-tertiary'
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            จำนวน
          </span>
        </div>
        <div className='flex-1'>
          <AreaLineChart {...data} height={300} />
        </div>
      </div>
    </ChartCard>
  );
};

/* ───────── 3) ประเภทการอยู่อาศัย — pie (Figma 4:8610) ───────── */
const RESIDENCE_TYPES = [
  { label: 'ประเภทที่ 1', value: 47.1, color: '#14B8A6' },
  { label: 'ประเภทที่ 4', value: 41.6, color: '#6366F1' },
  { label: 'ประเภทที่ 2', value:  9.8, color: '#EC4899' },
  { label: 'ประเภทที่ 3', value:  1.0, color: '#F59E0B' },
  { label: 'ประเภทที่ 5', value:  0.5, color: '#8B5CF6' },
];

const DISTRICTS = [
  'เขตมีนบุรี','เขตลาดกระบัง','เขตยานนาวา','เขตสัมพันธวงศ์','เขตพญาไท',
  'เขตธนบุรี','เขตบางกอกใหญ่','เขตห้วยขวาง','เขตคลองสาน','เขตตลิ่งชัน',
  'เขตบางกอกน้อย','เขตบางขุนเทียน',
];

export const ResidencePieCard = () => {
  const [{ district, center }, set, reset] = useFilters({});
  const [activeSlice, setActiveSlice] = useState(null);
  const [districtFilter, setDistrictFilter] = useState('');
  const k = scaleFactor(district, center);
  const totalRaw = RESIDENCE_TYPES.reduce((s, x) => s + x.value, 0);
  const slices = RESIDENCE_TYPES.map((t) => ({
    ...t,
    value: +(t.value * k).toFixed(2),
  }));
  const newTotal = slices.reduce((s, x) => s + x.value, 0) || 1;
  const norm = slices.map((s) => ({ ...s, value: +(s.value / newTotal * totalRaw).toFixed(1) }));

  const filteredDistricts = DISTRICTS.filter((d) =>
    !districtFilter || d.includes(districtFilter)
  );

  return (
    <ChartCard
      label='ประเภทการอยู่อาศัย'
      onReset={() => { reset(); setActiveSlice(null); }}
      toolbar={
        <>
          <Select placeholder='เลือกเขต'         value={district} onChange={set('district')} options={DISTRICT_OPTS} />
          <Select placeholder='เลือกศูนย์บริการ'  value={center}   onChange={set('center')}   options={CENTER_OPTS} />
        </>
      }
    >
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Pie + legend */}
        <div className='lg:col-span-2 flex flex-col gap-3'>
          <h4 className='text-sm font-bold text-ink-secondary text-center'>
            กราฟแสดงจำนวนประชากรแยกตามประเภทการอยู่อาศัย {subtitleFor(district, center)}
          </h4>
          <div className='flex items-center justify-center gap-6'>
            <Pie
              slices={norm}
              size={220}
              activeIndex={activeSlice}
              onSliceClick={(i) => setActiveSlice((cur) => (cur === i ? null : i))}
            />
            <ul className='text-xs flex flex-col gap-1.5'>
              {norm.map((t, i) => (
                <li
                  key={i}
                  onClick={() => setActiveSlice((cur) => (cur === i ? null : i))}
                  className={`inline-flex items-center gap-1.5 cursor-pointer rounded px-1 py-0.5 ${activeSlice === i ? 'bg-brand-50' : 'hover:bg-brand-50/50'}`}
                  style={{ color: t.color }}
                >
                  <span className='w-2.5 h-2.5 rounded-full' style={{ background: t.color }} />
                  <span>{t.label}</span>
                  <span className='ml-1 tabular-nums'>{t.value.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom mini-table */}
          <div className='border-t border-ink-line pt-2 mt-2'>
            <table className='w-full text-xs'>
              <thead>
                <tr className='text-ink-tertiary border-b border-ink-line'>
                  <th className='text-left font-medium py-1.5 px-2'>ลำดับ</th>
                  <th className='text-left font-medium py-1.5 px-2'>ประเภทการอยู่อาศัย</th>
                  <th className='text-left font-medium py-1.5 px-2'>ชื่อประเภท</th>
                  <th className='text-right font-medium py-1.5 px-2'>จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {norm.map((t, i) => (
                  <tr
                    key={i}
                    onClick={() => setActiveSlice((cur) => (cur === i ? null : i))}
                    className={`border-b border-ink-line cursor-pointer ${activeSlice === i ? 'bg-brand-50' : 'hover:bg-brand-50/50'}`}
                  >
                    <td className='py-1.5 px-2 text-ink-secondary'>{i + 1}</td>
                    <td className='py-1.5 px-2 text-ink-secondary'>{t.label}</td>
                    <td className='py-1.5 px-2 text-ink-secondary'>—</td>
                    <td className='py-1.5 px-2 text-right text-ink font-medium tabular-nums'>{t.value.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Districts list */}
        <div className='border border-ink-line rounded-lg overflow-hidden flex flex-col'>
          <header className='px-3 py-2 bg-ink-neutral border-b border-ink-line flex items-center gap-2'>
            <h4 className='text-sm font-bold text-ink shrink-0'>อำเภอ</h4>
            <SecondarySearch
              size='small'
              value={districtFilter}
              onChange={(val) => setDistrictFilter(val)}
              placeholder='ค้นหาเขต…'
              className='flex-1'
              style={{ minWidth: 0, width: 'auto', maxWidth: 'none' }}
            />
          </header>
          <ul className='max-h-[420px] overflow-y-auto scrollbar-thin'>
            {filteredDistricts.length === 0 && (
              <li className='px-3 py-3 text-xs text-ink-tertiary text-center'>ไม่พบรายการ</li>
            )}
            {filteredDistricts.map((d) => {
              const opt = DISTRICT_OPTS.find((o) => o.label === d);
              const isActive = opt && opt.value === district;
              return (
                <li
                  key={d}
                  onClick={() => opt && set('district')(isActive ? '' : opt.value)}
                  className={`mih-chart-list-row flex items-center gap-2 px-3 py-2 border-b border-ink-line text-sm cursor-pointer${isActive ? ' is-selected' : ''}`}
                >
                  <button
                    type='button'
                    onClick={(e) => { e.stopPropagation(); opt && set('district')(isActive ? '' : opt.value); }}
                    className={`w-5 h-5 rounded border border-ink-line flex items-center justify-center shrink-0 ${isActive ? 'bg-brand-500 text-white border-brand-500' : 'text-ink-tertiary bg-white'}`}
                    aria-label={`เลือก ${d}`}
                  >
                    <Icon name={isActive ? 'check' : 'plus'} size={12} />
                  </button>
                  <span className='mih-chart-list-row__label truncate text-ink-secondary'>{d}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </ChartCard>
  );
};

/* ───────── 4) แผนที่ + Pyramid ภาพรวมศูนย์บริการ (Figma 4:8611) ───────── */
const CENTER_PYRAMID = [
  { label: '85+',   malePct: 1.0, femalePct: 1.3 },
  { label: '70-79', malePct: 3.5, femalePct: 4.5 },
  { label: '60-69', malePct: 4.3, femalePct: 5.1 },
  { label: '50-59', malePct: 3.5, femalePct: 4.0 },
  { label: '40-49', malePct: 3.2, femalePct: 3.3 },
  { label: '30-39', malePct: 3.1, femalePct: 3.0 },
  { label: '20-29', malePct: 2.6, femalePct: 2.5 },
  { label: '10-19', malePct: 2.6, femalePct: 2.5 },
  { label: '00-09', malePct: 1.5, femalePct: 1.5 },
];

const colorForRatio = (v) =>
  v >= 10 ? '#6366F1'  /* indigo — highest tier */
  : v >=  6 ? '#EC4899'  /* pink */
  : v >=  3 ? '#14B8A6'  /* teal */
  :           '#CCFBF1'; /* pale teal — lowest tier */
const colorForMarker = (m) => m.color || colorForRatio(m.value);

/* ── BkkLeafletMap ────────────────────────────────────────────
 * Real OSM tiles via Leaflet (loaded as a global from index.html).
 * Markers render as DOM divIcons styled with brand tokens.
 * Hover/click syncs back to the parent through callbacks.            */
const BkkLeafletMap = ({
  markers,
  active,
  hover,
  showArea,
  showLabels,
  onHover,
  onActivate,
}) => {
  const elRef       = useRef(null);
  const mapRef      = useRef(null);
  const markerRef   = useRef([]);     /* L.marker per index */
  const circleRef   = useRef([]);     /* L.circle per index */
  const cbRef       = useRef({});     /* keep latest callbacks for L handlers */
  cbRef.current = { onHover, onActivate };

  /* Initialise map once (depends on Leaflet global from index.html) */
  useEffect(() => {
    const L = window.L;
    if (!L || !elRef.current || mapRef.current) return undefined;

    const map = L.map(elRef.current, {
      center: [13.7563, 100.5018],
      zoom: 10,
      scrollWheelZoom: false, /* avoid hijacking page scroll */
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    mapRef.current = map;

    /* Fit map to all markers so the framing is sensible at any size */
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds.pad(0.18));

    /* Resize listener for when card layout changes */
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(elRef.current);

    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Build / rebuild markers + circles whenever the data changes */
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;

    /* Tear down old layers */
    markerRef.current.forEach((m) => map.removeLayer(m));
    circleRef.current.forEach((c) => map.removeLayer(c));
    markerRef.current = [];
    circleRef.current = [];

    markers.forEach((m, i) => {
      const c = colorForMarker(m);
      /* coverage circle */
      const circle = L.circle([m.lat, m.lng], {
        radius: 1500, /* metres */
        color: c,
        weight: 0,
        fillColor: c,
        fillOpacity: 0.18,
      }).addTo(map);
      circleRef.current.push(circle);

      /* divIcon — proper teardrop pin + optional label.
       * Path: circle top (r=12 around (12,12)) tapering to a point at (12,32). */
      const icon = L.divIcon({
        className: 'mih-pin',
        html: `
          <div class="mih-pin__wrap" data-idx="${i}" style="--pin-delay: ${i * 70}ms">
            <div class="mih-pin__label" style="display:${showLabels ? 'block' : 'none'}">
              <strong>${m.district}</strong>
              <span>ประชากร ${m.value.toFixed(1)}%</span>
            </div>
            <svg width="26" height="34" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0 C 5.4 0 0 5.4 0 12 C 0 21 12 32 12 32 S 24 21 24 12 C 24 5.4 18.6 0 12 0 Z"
                    fill="${c}" stroke="#ffffff" stroke-width="2"/>
              <circle cx="12" cy="12" r="4" fill="#ffffff"/>
            </svg>
          </div>`,
        iconSize:   [26, 34],
        iconAnchor: [13, 34],
      });
      const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
      marker.on('mouseover', () => cbRef.current.onHover?.(i));
      marker.on('mouseout',  () => cbRef.current.onHover?.(null));
      marker.on('click',     () => cbRef.current.onActivate?.(i));
      markerRef.current.push(marker);
    });
  }, [markers, showLabels]);

  /* Toggle coverage circles without rebuilding everything */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    circleRef.current.forEach((c) => {
      if (showArea) c.addTo(map);
      else map.removeLayer(c);
    });
  }, [showArea]);

  /* Highlight active / hover marker */
  useEffect(() => {
    const focused = hover != null ? hover : active;
    markerRef.current.forEach((mk, i) => {
      const el = mk.getElement();
      if (!el) return;
      const wrap = el.querySelector('.mih-pin__wrap');
      if (!wrap) return;
      wrap.classList.toggle('is-active', focused === i);
      wrap.classList.toggle('is-selected', active === i);
    });
    circleRef.current.forEach((c, i) => {
      const isFocused = focused === i;
      c.setStyle({ fillOpacity: isFocused ? 0.32 : 0.18, weight: isFocused ? 2 : 0 });
      c.setRadius(isFocused ? 2400 : 1500);
    });
  }, [hover, active]);

  return <div ref={elRef} className='absolute inset-0' />;
};

const MAP_MARKERS = [
  { name: 'ศูนย์ฯ 61 สังวาลย์ ทัสนารมย์ (ดอนเมือง)', lat: 13.9203, lng: 100.5950, value: 11.5, district: 'เขตดอนเมือง', cases: 1820, visits: 2340 },
  { name: 'ศูนย์ฯ 64 คลองสามวา',                      lat: 13.8723, lng: 100.7180, value:  9.7, district: 'เขตคลองสามวา', cases: 1540, visits: 1980 },
  { name: 'ศูนย์ฯ 43 มีนบุรี',                         lat: 13.8126, lng: 100.7400, value:  8.4, district: 'เขตมีนบุรี',     cases: 1340, visits: 1720 },
  { name: 'ศูนย์ฯ 23 สี่พระยา (บางรัก)',                lat: 13.7253, lng: 100.5249, value:  7.1, district: 'เขตบางรัก',       cases: 1130, visits: 1480 },
  { name: 'ศูนย์ฯ 41 คลองเตย',                         lat: 13.7080, lng: 100.5740, value:  6.2, district: 'เขตคลองเตย',     cases:  990, visits: 1210 },
  { name: 'ศูนย์ฯ 9 ประชาธิปไตย (พระนคร)',             lat: 13.7570, lng: 100.5018, value:  5.4, district: 'เขตพระนคร',       cases:  860, visits: 1040 },
  { name: 'ศูนย์ฯ 45 ร่มเกล้า (ลาดกระบัง)',             lat: 13.7228, lng: 100.7853, value:  4.8, district: 'เขตลาดกระบัง',   cases:  770, visits:  920 },
  { name: 'ศูนย์ฯ 28 กรุงธนบุรี (คลองสาน)',             lat: 13.7250, lng: 100.5009, value:  4.2, district: 'เขตคลองสาน',     cases:  670, visits:  820 },
  { name: 'ศูนย์ฯ 33 วัดหงส์รัตนาราม (บางกอกใหญ่)',     lat: 13.7388, lng: 100.4818, value:  3.6, district: 'เขตบางกอกใหญ่',  cases:  580, visits:  710 },
  { name: 'ศูนย์ฯ 67 ทวีวัฒนา',                         lat: 13.7826, lng: 100.3820, value:  2.8, district: 'เขตทวีวัฒนา',     cases:  450, visits:  540, color: '#0EA5E9' },
];
const TABS = ['ข้อมูลปัจจุบัน', 'ประชากร/ผู้ป่วย', '21 อันดับโรค'];

export const ServiceCenterMapCard = () => {
  const [showAvg, setShowAvg]       = useState(true);
  const [showArea, setShowArea]     = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [activeTab, setActiveTab]   = useState(0);
  const [activeMarker, setActiveMarker] = useState(null);
  const [hoverMarker, setHoverMarker]   = useState(null);
  const sel = activeMarker !== null ? MAP_MARKERS[activeMarker] : null;
  return (
    <ChartCard
      label='ศูนย์บริการสาธารณสุขกรุงเทพมหานคร'
      toolbar={
        <>
          <label className='inline-flex items-center gap-1.5 text-xs text-ink-secondary cursor-pointer select-none'>
            <input type='checkbox' checked={showAvg}    onChange={(e) => setShowAvg(e.target.checked)}
              className='rounded border-ink-line text-brand-500 focus:ring-brand-300' />
            แสดงค่าเฉลี่ย
          </label>
          <label className='inline-flex items-center gap-1.5 text-xs text-ink-secondary cursor-pointer select-none'>
            <input type='checkbox' checked={showArea}   onChange={(e) => setShowArea(e.target.checked)}
              className='rounded border-ink-line text-brand-500 focus:ring-brand-300' />
            แสดงพื้นที่
          </label>
          <label className='inline-flex items-center gap-1.5 text-xs text-ink-secondary cursor-pointer select-none'>
            <input type='checkbox' checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)}
              className='rounded border-ink-line text-brand-500 focus:ring-brand-300' />
            แสดงป้ายชื่อ
          </label>
        </>
      }
    >
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Map — real Leaflet/OSM */}
        <div className='lg:col-span-2 relative rounded-lg overflow-hidden border border-ink-line bg-brand-50 h-[480px]'>
          <BkkLeafletMap
            markers={MAP_MARKERS}
            active={activeMarker}
            hover={hoverMarker}
            showArea={showArea}
            showLabels={showLabels}
            onHover={setHoverMarker}
            onActivate={(i) => setActiveMarker((cur) => (cur === i ? null : i))}
          />
          {/* Average bubble */}
          {showAvg && (
            <div className='absolute top-2 right-12 bg-white rounded-md border border-ink-line shadow-card px-3 py-1.5 text-[10px] z-[400] pointer-events-none'>
              <span className='text-ink-tertiary'>ค่าเฉลี่ย:</span>{' '}
              <span className='font-bold text-ink tabular-nums'>
                {(MAP_MARKERS.reduce((s, m) => s + m.value, 0) / MAP_MARKERS.length).toFixed(1)}%
              </span>
            </div>
          )}
          {/* Hover detail tooltip — richer than the inline label */}
          {hoverMarker != null && (
            <div className='absolute top-2 left-12 z-[400] pointer-events-none px-3 py-2 rounded-md bg-white border border-brand-300 shadow-card text-[11px] flex flex-col gap-0.5 whitespace-nowrap'>
              <div className='font-bold text-brand-500'>{MAP_MARKERS[hoverMarker].name}</div>
              <div className='text-ink-secondary'>{MAP_MARKERS[hoverMarker].district}</div>
              <div className='flex items-center gap-3 mt-1 pt-1 border-t border-ink-line'>
                <span className='flex flex-col'><span className='text-ink-tertiary'>สัดส่วน</span><span className='font-bold tabular-nums text-ink'>{MAP_MARKERS[hoverMarker].value.toFixed(1)}%</span></span>
                <span className='flex flex-col'><span className='text-ink-tertiary'>ผู้รับบริการ</span><span className='font-bold tabular-nums text-ink'>{MAP_MARKERS[hoverMarker].cases.toLocaleString()}</span></span>
                <span className='flex flex-col'><span className='text-ink-tertiary'>ครั้ง</span><span className='font-bold tabular-nums text-ink'>{MAP_MARKERS[hoverMarker].visits.toLocaleString()}</span></span>
              </div>
            </div>
          )}
          {/* Legend */}
          <div className='absolute bottom-2 left-2 bg-white rounded-md border border-ink-line shadow-card p-2 text-[10px] space-y-1 z-[400] pointer-events-none'>
            <p className='font-bold text-ink'>สัดส่วนประชากร (ร้อยละ)</p>
            {[
              { c: '#6366F1', t: '> 10%'    },
              { c: '#EC4899', t: '6 – 10%'  },
              { c: '#14B8A6', t: '3 – 6%'   },
              { c: '#CCFBF1', t: '< 3%'     },
            ].map((l, i) => (
              <div key={i} className='flex items-center gap-1.5'>
                <span className='w-3 h-3 rounded-sm' style={{ background: l.c }} />
                <span className='text-ink-secondary'>{l.t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className='flex flex-col gap-3'>
          {/* DS TabBar + TabPill — replaces the prior raw button row.
              All surface / text / shadow tokens come from the component
              (`surface/tabpill/*`, `text/tabpill/*`, `shadow/tabpill/*`)
              so theme + brand mode switches retint the control. */}
          <TabBar align='start' aria-label='ข้อมูลแผนที่ศูนย์บริการ'>
            {TABS.map((tab, i) => (
              <TabPillLarge
                key={i}
                showIcon={false}
                selected={activeTab === i}
                onClick={() => setActiveTab(i)}
              >
                {tab}
              </TabPillLarge>
            ))}
          </TabBar>

          {sel && (
            <div className='border border-brand-300 bg-brand-50 rounded-lg p-3 text-xs flex flex-col gap-1'>
              <div className='flex items-start justify-between gap-2'>
                <div className='min-w-0'>
                  <div className='font-bold text-brand-500 truncate' title={sel.name}>{sel.name}</div>
                  <div className='text-ink-tertiary'>{sel.district}</div>
                </div>
                <button type='button' onClick={() => setActiveMarker(null)}
                  className='text-ink-tertiary hover:text-ink shrink-0' aria-label='ปิด'>
                  <Icon name='x' size={12} />
                </button>
              </div>
              <div className='grid grid-cols-3 gap-2 mt-1 pt-2 border-t border-brand-300/40 text-[11px]'>
                <div><div className='text-ink-tertiary'>สัดส่วน</div><div className='font-bold tabular-nums text-ink'>{sel.value.toFixed(1)}%</div></div>
                <div><div className='text-ink-tertiary'>ผู้รับบริการ</div><div className='font-bold tabular-nums text-ink'>{sel.cases.toLocaleString()}</div></div>
                <div><div className='text-ink-tertiary'>ครั้ง</div><div className='font-bold tabular-nums text-ink'>{sel.visits.toLocaleString()}</div></div>
              </div>
            </div>
          )}

          {/* Quick list — click to select on map */}
          <div className='border border-ink-line rounded-lg overflow-hidden'>
            <header className='px-3 py-1.5 bg-ink-neutral border-b border-ink-line text-[11px] font-bold text-ink'>
              ศูนย์บริการทั้งหมด ({MAP_MARKERS.length})
            </header>
            <ul className='max-h-[140px] overflow-y-auto scrollbar-thin'>
              {MAP_MARKERS.map((m, i) => {
                const isActive = activeMarker === i;
                return (
                  <li key={i}
                    onMouseEnter={() => setHoverMarker(i)}
                    onMouseLeave={() => setHoverMarker(null)}
                    onClick={() => setActiveMarker((cur) => (cur === i ? null : i))}
                    className={`mih-chart-list-row flex items-center gap-2 px-2 py-1.5 border-b border-ink-line text-[11px] cursor-pointer${isActive ? ' is-selected' : ''}`}
                  >
                    <span className='w-2 h-2 rounded-full shrink-0' style={{ background: colorForMarker(m) }} />
                    <span className='mih-chart-list-row__label flex-1 truncate text-ink-secondary'>{m.district}</span>
                    <span className='tabular-nums text-ink font-medium'>{m.value.toFixed(1)}%</span>
                  </li>
                );
              })}
            </ul>
          </div>


          {activeTab === 0 && (
            <div>
              <h4 className='text-xs font-bold text-ink-secondary text-center'>สัดส่วนประชากรตามช่วงอายุ</h4>
              <div className='mt-2'>
                <PyramidPct
                  groups={CENTER_PYRAMID}
                  rowHeight={14}
                  maleColor='#6366F1'
                  femaleColor='#EC4899'
                />
              </div>
            </div>
          )}
          {activeTab === 1 && (
            <div className='text-xs text-ink-secondary p-3 bg-brand-50 rounded-lg'>
              <p className='font-bold text-ink mb-2'>ประชากร/ผู้ป่วย</p>
              <ul className='space-y-1'>
                <li className='flex justify-between'><span>ประชากรทั้งหมด</span><span className='tabular-nums font-bold'>117,327</span></li>
                <li className='flex justify-between'><span>ผู้ป่วย DM/HT</span><span className='tabular-nums font-bold'>14,754</span></li>
                <li className='flex justify-between'><span>ผู้ป่วยกลุ่มเสี่ยง</span><span className='tabular-nums font-bold'>159</span></li>
              </ul>
            </div>
          )}
          {activeTab === 2 && (
            <div className='text-xs text-ink-secondary p-3 bg-brand-50 rounded-lg'>
              <p className='font-bold text-ink mb-2'>21 อันดับโรค</p>
              <p>เลือกที่ Card "Top 10 อันดับโรค" ด้านบน เพื่อดูรายละเอียดเพิ่ม</p>
            </div>
          )}

          <div className='border-t border-ink-line pt-2 grid grid-cols-2 gap-2 text-[11px]'>
            <Stat icon='users' label='ผู้รับบริการ (คน)' value='1,253' tone='blue' />
            <Stat icon='clipboard-list' label='จำนวนการรับบริการ' value='1,502' tone='green' />
          </div>
        </div>
      </div>
    </ChartCard>
  );
};

const Stat = ({ icon, label, value, tone = 'brand' }) => {
  const fg = tone === 'blue'  ? 'var(--text-pill-blue)'
           : tone === 'green' ? 'var(--text-pill-green)'
           :                    'var(--brand-p700)';
  return (
    <div className='flex items-center gap-2 p-2 rounded-md bg-brand-50'>
      <span style={{ color: fg }}><Icon name={icon} size={16} /></span>
      <div className='flex flex-col leading-tight'>
        <span className='text-[10px] text-ink-tertiary'>{label}</span>
        <span className='text-sm font-bold text-ink tabular-nums'>{value}</span>
      </div>
    </div>
  );
};
