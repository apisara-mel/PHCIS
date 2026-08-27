import React, { useState } from 'react';
import { FilterDropdown } from '@/components/forms/FilterTag';
import StatusBadge from '@/components/badge/StatusBadge';
import VitalsSignGraphDialog from '@/components/vitals/VitalsSignGraphDialog';
import {
  resolveVitalValueColor,
  resolveVitalStatusBadgeStyle,
} from '@/components/badge/vitalValueStyles';
import { DEFAULT_MEASUREMENT_ROUNDS } from '@/data/treatmentVisits';
import {
  VITAL_SIGN_TILES,
  VITAL_SIGN_TABLET_ROW1_COUNT,
  VITAL_SIGN_TABLET_COLUMN_COUNT,
  VITAL_SIGN_MOBILE_GRID_KEYS,
} from '@/components/vitals/vitalsSignConfig';

/* MIH VitalsSignHorizontalPanel — responsive vitals strip (PHCIS | CPOE):
     layout="responsive" (default):
       lg   (≥1024) 250:25052 — 1 row
       md   (768–1023) 250:25053 — 2 rows (5 + 4, padEnd)
       <md (<768) 250:25054 — 3×3 grid
     layout="tablet" — CPOE 251:25289 / 251:25374 (Step 1): 5-column grid × 2 rows,
       row gap + py `space/300` (12px), vertical dividers.                      */

/** CPOE 251:25289 — white card shell; row py + inter-row gap live on row wrappers. */
const stripShellStyle = {
  borderRadius: 'var(--dim-radius-400)',
  background: 'var(--surface-card-100)',
};

/** Per-row vertical padding — Figma "Vial Sign" rows (251:25290 · 251:25300). */
const stripRowShellStyle = {
  paddingTop: 'var(--dim-space-300)',
  paddingBottom: 'var(--dim-space-300)',
  width: '100%',
};

/** Gap between tablet strip rows — Figma 251:25289 `gap/space/300`. */
const tabletStripGapStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--dim-space-300)',
  width: '100%',
};

const BmiGradientBar = ({ gradientPercent = 0 }) => {
  const pct = Math.max(0, Math.min(100, gradientPercent));
  const showMarker = pct > 0;
  return (
    <div aria-hidden className='relative' style={{ width: 106, height: 8 }}>
      <div
        style={{
          width: '100%',
          height: 8,
          borderRadius: 'var(--dim-radius-full)',
          background:
            'linear-gradient(90deg, rgb(37,128,234) 0%, rgb(5,182,152) 25%, rgb(240,192,61) 55%, rgb(244,105,40) 75%, rgb(199,33,33) 100%)',
        }}
      />
      {showMarker && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${pct}%`,
            width: 16,
            height: 16,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: 'var(--surface-card-100, #fff)',
            border: 'var(--dim-stroke-200) solid var(--border-brandPrimary-default)',
            boxShadow: 'var(--shadow-card)',
          }}
        />
      )}
    </div>
  );
};

const TileDivider = () => (
  <div
    aria-hidden
    className='shrink-0 self-center'
    style={{
      width: 1,
      height: 74,
      background: 'var(--border-neutral-quaternary)',
    }}
  />
);

const equalColumnStyle = (columns) => {
  const gaps = Math.max(0, columns - 1);
  const share = `calc((100% - ${gaps} * var(--dim-space-300, 12px)) / ${columns})`;
  return {
    flex: '1 1 0',
    minWidth: 0,
    width: share,
    maxWidth: share,
  };
};

const HorizontalVitalItem = ({
  tile,
  slot,
  variant = 'strip',
  equalColumns = 5,
  /* พื้นที่ขั้นต่ำต่อช่อง — โหมด `single` วางครบ 9 ค่าในแถวเดียว ถ้าปล่อยให้
     ยืดหดอิสระ ป้ายภาษาอังกฤษจะถูกตัดกลางคำ ("Temperatur / e") */
  minTileWidth = null,
}) => {
  const variantClass = variant === 'grid' || variant === 'tablet-grid'
    ? 'w-full min-w-0'
    : variant === 'tablet'
      ? 'min-w-0'
      : 'flex-1 min-w-0 max-w-none';

  const variantStyle = variant === 'grid' || variant === 'tablet-grid'
    ? { width: '100%' }
    : variant === 'tablet'
      ? equalColumnStyle(equalColumns)
      : (minTileWidth ? { flex: '1 0 auto', minWidth: minTileWidth, maxWidth: 'none' } : undefined);

  return (
    <div
      className={`flex flex-col items-center ${variantClass}`}
      style={{
        gap: 'var(--dim-space-200)',
        paddingLeft: 'var(--dim-space-200)',
        paddingRight: 'var(--dim-space-200)',
        boxSizing: 'border-box',
        ...variantStyle,
      }}
    >
      <span
        className='w-full text-center'
        style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          fontWeight: 'var(--type-weight-medium)',
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}
      >
        {tile.th}
        <br />
        {tile.en}
      </span>
      <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{
          color: resolveVitalValueColor(slot),
          fontFamily: 'var(--type-family-heading-content)',
          fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
          fontSize: 'var(--type-size-base)',
          lineHeight: 1.5,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
        >
          {slot?.value ?? '—'}
        </span>
        {slot?.badge && (
          <StatusBadge
            style={resolveVitalStatusBadgeStyle(slot)}
            size='small'
            showDot={false}
            showIcon={false}
          >
            {slot.badge.label}
          </StatusBadge>
        )}
        {tile.key === 'bmi' && (
          <BmiGradientBar gradientPercent={slot?.gradientPercent ?? 0} />
        )}
      </div>
    </div>
  );
};

const VitalsSignDividedRow = ({
  tiles,
  vitals,
  variant,
  padEnd = false,
  wrap = false,
}) => {
  const equalColumns = wrap ? 3 : 5;

  return (
  <div
    className={`flex items-start w-full ${wrap ? 'flex-wrap' : 'flex-nowrap'}`}
    style={{ gap: 'var(--dim-space-300)' }}
  >
    {tiles.map((tile, i) => (
      <React.Fragment key={tile.key}>
        <HorizontalVitalItem
          tile={tile}
          slot={vitals?.[tile.key]}
          variant={variant}
          equalColumns={equalColumns}
        />
        {i < tiles.length - 1 && <TileDivider />}
      </React.Fragment>
    ))}
    {padEnd && !wrap && (
      <>
        <TileDivider />
        <div
          className='flex-1 min-w-0 opacity-0 pointer-events-none'
          style={{ minWidth: 88, maxWidth: 'calc((100% - 48px) / 5)' }}
          aria-hidden
        />
      </>
    )}
  </div>
  );
};

/** CPOE 251:25374 / 250:25053 — 5 equal columns × 2 rows, vertical dividers. */
const TabletVitalsGridRow = ({ tiles, vitals, padEnd = false }) => (
  <div
    className='grid w-full items-start'
    style={{
      gridTemplateColumns: `repeat(${VITAL_SIGN_TABLET_COLUMN_COUNT}, minmax(0, 1fr))`,
      minHeight: 74,
    }}
  >
    {tiles.map((tile, i) => (
      <div
        key={tile.key}
        className='flex flex-col items-center min-w-0'
        style={{
          paddingLeft: 'var(--dim-space-200)',
          paddingRight: 'var(--dim-space-200)',
          borderRight: i < tiles.length - 1 || (padEnd && i === tiles.length - 1)
            ? 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)'
            : undefined,
        }}
      >
        <HorizontalVitalItem
          tile={tile}
          slot={vitals?.[tile.key]}
          variant='tablet-grid'
        />
      </div>
    ))}
    {padEnd && tiles.length < VITAL_SIGN_TABLET_COLUMN_COUNT && (
      <div aria-hidden className='min-w-0' />
    )}
  </div>
);

const TabletVitalsStrip = ({ tiles, vitals }) => {
  const row1 = tiles.slice(0, VITAL_SIGN_TABLET_ROW1_COUNT);
  const row2 = tiles.slice(VITAL_SIGN_TABLET_ROW1_COUNT);

  return (
    <div style={tabletStripGapStyle}>
      <div style={stripRowShellStyle}>
        <TabletVitalsGridRow tiles={row1} vitals={vitals} />
      </div>
      {row2.length > 0 && (
        <div style={stripRowShellStyle}>
          <TabletVitalsGridRow tiles={row2} vitals={vitals} padEnd />
        </div>
      )}
    </div>
  );
};

const tilesByKeys = (tiles, keys) =>
  keys
    .map((key) => tiles.find((t) => t.key === key))
    .filter(Boolean);

export const VitalsSignHorizontalStrip = ({
  tiles,
  vitals,
  layout = 'responsive',
}) => {
  const row1 = tiles.slice(0, VITAL_SIGN_TABLET_ROW1_COUNT);
  const row2 = tiles.slice(VITAL_SIGN_TABLET_ROW1_COUNT);
  const mobileTiles = tilesByKeys(tiles, VITAL_SIGN_MOBILE_GRID_KEYS);

  if (layout === 'tablet') {
    return (
      <div className='w-full' style={stripShellStyle}>
        <TabletVitalsStrip tiles={tiles} vitals={vitals} />
      </div>
    );
  }

  if (layout === 'single') {
    return (
      <div className='w-full' style={stripShellStyle}>
        <div
          className='flex flex-nowrap items-start w-full overflow-x-auto'
          style={{ ...stripRowShellStyle, gap: 'var(--dim-space-300)' }}
        >
          {tiles.map((tile, i) => (
            <React.Fragment key={tile.key}>
              <HorizontalVitalItem
                tile={tile}
                slot={vitals?.[tile.key]}
                variant='strip'
                minTileWidth={116}
              />
              {i < tiles.length - 1 && <TileDivider />}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='w-full' style={stripShellStyle}>
      {/* lg — Figma 250:25052 */}
      <div
        className='hidden lg:flex lg:flex-nowrap items-start w-full'
        style={{ ...stripRowShellStyle, gap: 'var(--dim-space-300)' }}
      >
        {tiles.map((tile, i) => (
          <React.Fragment key={tile.key}>
            <HorizontalVitalItem tile={tile} slot={vitals?.[tile.key]} variant='strip' />
            {i < tiles.length - 1 && <TileDivider />}
          </React.Fragment>
        ))}
      </div>

      {/* md … lg−1 — Figma 250:25053 / 251:25374 */}
      <div className='hidden md:block lg:hidden w-full'>
        <TabletVitalsStrip tiles={tiles} vitals={vitals} />
      </div>

      {/* <md — Figma 250:25054 */}
      <div
        className='grid md:hidden w-full'
        style={{
          ...stripRowShellStyle,
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          columnGap: 'var(--dim-space-300)',
          rowGap: 'var(--dim-space-400)',
        }}
      >
        {mobileTiles.map((tile) => (
          <HorizontalVitalItem
            key={tile.key}
            tile={tile}
            slot={vitals?.[tile.key]}
            variant='grid'
          />
        ))}
      </div>
    </div>
  );
};

const VitalsSignHorizontalPanel = ({
  vitals: vitalsProp,
  measurementRounds = DEFAULT_MEASUREMENT_ROUNDS,
  defaultMeasurementId = 'latest',
  tiles = VITAL_SIGN_TILES,
  layout = 'responsive',
  variant = 'default',
  graphSubtitle,
  graphDisabled = false,
  className = '',
  style,
}) => {
  const isExam = variant === 'exam';
  const stripLayout = isExam ? 'single' : layout;
  const rounds = measurementRounds?.length ? measurementRounds : [];
  const [measurementId, setMeasurementId] = useState(defaultMeasurementId);
  const activeRound = rounds.find((r) => r.id === measurementId) ?? rounds[0];
  const vitals = activeRound?.vitals ?? vitalsProp;

  const graphSubtitleResolved = graphSubtitle
    ?? (activeRound ? `ครั้งที่วัด: ${activeRound.label}` : undefined);

  const measurementControl = rounds.length > 0 ? (
    <FilterDropdown
      prefix='ครั้งที่วัด:'
      options={rounds.map((r) => ({ value: r.id, label: r.label }))}
      value={activeRound?.id ?? defaultMeasurementId}
      onChange={setMeasurementId}
      size='sm'
    />
  ) : null;

  return (
    <div
      className={`flex flex-col w-full ${className}`.trim()}
      style={{
        gap: 'var(--dim-space-300)',
        padding: 'var(--dim-space-400)',
        borderRadius: 'var(--dim-radius-500)',
        border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
        background: 'var(--surface-neutral-quaternary)',
        ...style,
      }}
    >
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <span style={{
          flex: 1,
          minWidth: 0,
          color: 'var(--text-topic-tertiary-title)',
          fontFamily: 'var(--type-family-heading-content)',
          fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
          fontSize: 'var(--type-size-base)',
          lineHeight: 1.5,
        }}
        >
          สัญญาณชีพ (Vital Signs)
        </span>
        <VitalsSignGraphDialog
          subtitle={graphSubtitleResolved}
          disabled={graphDisabled}
        />
      </div>

      {!isExam && measurementControl}
      {isExam ? (
        <div
          className='w-full'
          style={{
            padding: 'var(--dim-space-600)',
            borderRadius: 'var(--dim-radius-400)',
            background: 'var(--surface-card-100)',
          }}
        >
          <VitalsSignHorizontalStrip tiles={tiles} vitals={vitals} layout={stripLayout} />
        </div>
      ) : (
        <VitalsSignHorizontalStrip tiles={tiles} vitals={vitals} layout={stripLayout} />
      )}
    </div>
  );
};

export default VitalsSignHorizontalPanel;
