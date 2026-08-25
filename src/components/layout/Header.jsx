import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import BrandIconButton from '@/components/button/BrandIconButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SystemGridMenu from '@/components/layout/SystemGridMenu';
import { FilterDropdown } from '@/components/forms/FilterTag';
import { CLINIC_OPTIONS, DEFAULT_CLINIC_VALUE, useClinicFilter } from '@/components/layout/HeaderClinicContext';
import FontSizeControls from '@/components/layout/FontSizeControls';
import { useHeaderAutoHide } from '@/context/HeaderAutoHideContext';
import {
  APP_TOPBAR_HEIGHT,
  CHROME_TRANSITION_EASE,
  CHROME_TRANSITION_MS,
} from '@/hooks/useHeaderAutoHide';
import { EllipsisText } from '@/components/table/Table';

const HUB_PATH = '/hub';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const formatThaiDate = (d) =>
  `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;

/** Accept string[] or `{ label, to? }[]` — `to` makes the crumb a Link. */
function normalizeBreadcrumb(items = []) {
  return items.map((item) => {
    if (item && typeof item === 'object') {
      return { label: item.label ?? '', to: item.to || item.href || undefined };
    }
    return { label: String(item ?? ''), to: undefined };
  });
}

/**
 * @param {object}  props
 * @param {(string|{label:string,to?:string})[]} [props.breadcrumb]
 * @param {boolean} [props.standalone=true] — when false, the page has a
 *   section flush below the Header (same surface / no gap). In that case
 *   `shadow-header` is omitted so the bar does not cast a second shadow
 *   onto the touching panel. Full-width routes with empty body under the
 *   bar should pass `standalone={false}`.
 * @param {boolean} [props.merged] — when true the drop shadow is suppressed
 *   (rare: e.g. a custom layout where a second sticky bar must sit flush with
 *   no stacked shadow). Default false — OPD Queue keeps the shadow even when
 *   the tab row is pinned beneath the bar.
 * @param {'none'|'brand-100'} [props.flushShadow='none'] — when `standalone`
 *   is false, optionally keep a subtle brand lift on the bar (System Hub
 *   Figma 25:3107 · Brand Drop Shadow Bottom/100 above the greeting card).
 * @param {boolean} [props.autoHide=true] — when true, collapse on scroll-down
 *   via global HeaderAutoHideProvider (Consent / queue shell behaviour).
 * @param {boolean} [props.collapsed] — explicit override; wins over autoHide.
 * @param {'default'|'hub'} [props.variant='default'] — `hub` = System
 *   Selection page (Figma PHCIS | Consent 270:72714 · Header withBTN=No):
 *   location tag only on the left — no apps grid, no program name/breadcrumb.
 */
const Header = ({
  breadcrumb = ['ระบบงานผู้รับบริการนอก (OPD)', 'คัดกรองและซักประวัติ'],
  brandTitle = 'ระบบ PHCIS',
  variant = 'default',
  standalone = true,
  merged = false,
  flushShadow = 'none',
  autoHide = true,
  /* ชิปเลือกศูนย์บริการบนแถบบน — ปิดได้รายระบบ (26 ส.ค. 2569) */
  showClinicFilter = true,
  collapsed: collapsedProp,
}) => {
  const autoHideCtx = useHeaderAutoHide();
  const liveTop = autoHideCtx?.topbarOffset ?? APP_TOPBAR_HEIGHT;
  const driveHeightFromLerp = autoHide && collapsedProp === undefined && autoHideCtx;
  const collapsed = collapsedProp ?? (autoHide && liveTop <= 0);
  const barHeight = driveHeightFromLerp
    ? liveTop
    : (collapsed ? 0 : APP_TOPBAR_HEIGHT);
  const barOpacity = driveHeightFromLerp
    ? Math.min(1, liveTop / APP_TOPBAR_HEIGHT)
    : (collapsed ? 0 : 1);
  const barTranslateY = driveHeightFromLerp
    ? APP_TOPBAR_HEIGHT - barHeight
    : (collapsed ? APP_TOPBAR_HEIGHT : 0);
  const isHub = variant === 'hub';
  const crumbs = normalizeBreadcrumb(breadcrumb);
  const clinicCtx = useClinicFilter();
  const [localClinic, setLocalClinic] = useState(DEFAULT_CLINIC_VALUE);
  const clinic = clinicCtx ? clinicCtx.clinic : localClinic;
  const setClinic = clinicCtx ? clinicCtx.setClinic : setLocalClinic;
  const clinicOptions = clinicCtx ? clinicCtx.options : CLINIC_OPTIONS;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const openMobileSidebar = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('mih:open-mobile-sidebar'));
  };

  const barShadow = merged
    ? 'none'
    : standalone
      ? 'var(--shadow-header)'
      : flushShadow === 'brand-100'
        ? 'var(--shadow-brand-drop-bottom-100)'
        : 'none';

  return (
    <header
      className='sticky top-0 z-[1200] w-full text-[color:var(--border-brandPrimary-quaternary)] flex items-center gap-3 md:gap-8 px-3 md:px-6'
      aria-hidden={barHeight < 4 || undefined}
      style={{
        height: driveHeightFromLerp ? `${barHeight}px` : (collapsed ? 0 : 'var(--dim-size-1400, 64px)'),
        minHeight: driveHeightFromLerp ? `${barHeight}px` : (collapsed ? 0 : 'var(--dim-size-1400, 64px)'),
        paddingTop: collapsed && !driveHeightFromLerp ? 0 : (barHeight < 8 ? 0 : undefined),
        paddingBottom: collapsed && !driveHeightFromLerp ? 0 : (barHeight < 8 ? 0 : undefined),
        overflow: 'hidden',
        opacity: barOpacity,
        pointerEvents: barHeight < 4 ? 'none' : 'auto',
        transform: barTranslateY > 0 ? `translateY(-${barTranslateY}px)` : undefined,
        willChange: driveHeightFromLerp ? 'height, opacity, transform' : undefined,
        background: 'var(--surface-navigation-default)',
        borderBottom: barHeight < 4
          ? 'none'
          : 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        boxShadow: barHeight < 4 ? 'none' : barShadow,
        transition: driveHeightFromLerp
          ? 'none'
          : `height ${CHROME_TRANSITION_MS}ms ${CHROME_TRANSITION_EASE}, min-height ${CHROME_TRANSITION_MS}ms ${CHROME_TRANSITION_EASE}, opacity ${CHROME_TRANSITION_MS}ms ${CHROME_TRANSITION_EASE}, box-shadow ${CHROME_TRANSITION_MS}ms ${CHROME_TRANSITION_EASE}, border-color ${CHROME_TRANSITION_MS}ms ${CHROME_TRANSITION_EASE}`,
      }}
    >
    {!isHub && (
      <BrandIconButton
        className='md:hidden shrink-0'
        variant='fill'
        size='md'
        icon='menu'
        aria-label='เปิดเมนู'
        onClick={openMobileSidebar}
      />
    )}

    {!isHub && (
      <div className='flex items-center gap-3 min-w-0'>
        <SystemGridMenu buttonVariant='outline' />
        <div
          className='flex flex-col items-start min-w-0'
          style={{ gap: 'var(--dim-space-0)' }}
        >
          <p
            className='text-base text-brand-500 truncate'
            style={{
              fontFamily: 'var(--type-family-heading-content, var(--type-family-heading-graphic2))',
              fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
              lineHeight: 1.25,
            }}
          >
            {brandTitle}
          </p>
          <nav
            className='hidden md:flex items-center gap-2 min-w-0 w-full'
            aria-label='breadcrumb'
            style={{
              marginTop: 'calc(-1 * var(--dim-space-100, 4px))',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.25,
            }}
          >
            <Link
              to={HUB_PATH}
              aria-label='ไปที่ System Hub'
              className='shrink-0 inline-flex items-center'
              style={{ color: 'var(--text-breadcrumb-pagename)', textDecoration: 'none' }}
            >
              <Icon name='home' size={16} />
            </Link>
            {crumbs.map((seg, i) => {
              const isCurrent = i === crumbs.length - 1;
              const canLink = Boolean(seg.to) && !isCurrent;
              const crumbStyle = {
                color: isCurrent
                  ? 'var(--text-breadcrumb-current)'
                  : 'var(--text-breadcrumb-pagename)',
                textDecoration: 'none',
              };
              return (
                <React.Fragment key={`${seg.label}-${i}`}>
                  <span
                    className='shrink-0'
                    style={{ color: 'var(--text-breadcrumb-pagename)' }}
                    aria-hidden
                  >
                    /
                  </span>
                  {canLink ? (
                    <Link
                      to={seg.to}
                      className='min-w-0 hover:underline focus-visible:underline'
                      style={crumbStyle}
                    >
                      <EllipsisText text={seg.label} fill={false} />
                    </Link>
                  ) : (
                    <span
                      className='min-w-0'
                      style={crumbStyle}
                      aria-current={isCurrent ? 'page' : undefined}
                    >
                      <EllipsisText text={seg.label} fill={false} />
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>
      </div>
    )}

      {/* Hub: location tag left (Figma 270:72714). Default: md+ in bar. */}
      {showClinicFilter ? (
      <FilterDropdown
        leadingIcon='location_on'
        options={clinicOptions}
        value={clinic}
        onChange={setClinic}
        className={isHub ? 'shrink-0 inline-flex' : 'shrink-0 hidden md:inline-flex'}
      />
      ) : null}

      <div className='flex-1' />

      {/* Right side — progressively reveal items as the viewport grows */}
      <div className='flex items-center gap-3 lg:gap-8 text-sm text-ink-secondary'>
        {/* Date — lg+ only */}
        <div className='hidden lg:flex items-center gap-2'>
          <Icon name='calendar' size={16} />
          <span>{formatThaiDate(now)}</span>
        </div>
        {/* Font-size controls — md+ in bar; below md see <Sidebar /> mobile drawer */}
        <FontSizeControls className='hidden md:flex' />
        {/* Manual — aliases Neutral Subdue Button (design.md §6.19 / §5.6).
            Label collapses below lg; typography from button tokens (Mitr Regular sm). */}
        <NeutralSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='menu_book'
          collapseLabelBelow='lg'
          accessibilityLabel='คู่มือใช้งานระบบ'
          className='shrink-0'
        >
          คู่มือใช้งานระบบ
        </NeutralSubdueButton>
      </div>
    </header>
  );
};

export default Header;
export { default as SubHeader } from '@/components/layout/SubHeader';
