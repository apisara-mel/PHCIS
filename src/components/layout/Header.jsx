import React, { useEffect, useState } from 'react';
import Icon from '@/components/icons/Icon';
import BrandIconButton from '@/components/button/BrandIconButton';
import SystemGridMenu from '@/components/layout/SystemGridMenu';
import { FilterDropdown } from '@/components/forms/FilterTag';
import { CLINIC_OPTIONS, DEFAULT_CLINIC_VALUE, useClinicFilter } from '@/components/layout/HeaderClinicContext';
import FontSizeControls from '@/components/layout/FontSizeControls';
import { EllipsisText } from '@/components/table/Table';
const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const formatThaiDate = (d) =>
  `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;

/**
 * @param {object}  props
 * @param {string[]} [props.breadcrumb]
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
}) => {
  const isHub = variant === 'hub';
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
      className='sticky top-0 z-[1200] h-16 w-full bg-white text-[color:var(--border-brandPrimary-quaternary)] flex items-center gap-3 md:gap-8 px-3 md:px-6'
      style={{
        borderBottom:
          'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        boxShadow: barShadow,
        transition:   'box-shadow 200ms ease, border-color 200ms ease',
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
        <div className='flex flex-col items-start min-w-0'>
          <p className='font-bold text-base text-brand-500 leading-[1.5] truncate'>{brandTitle}</p>
          <nav
            className='hidden md:flex items-center gap-2 min-w-0 w-full'
            aria-label='breadcrumb'
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.5,
            }}
          >
            <Icon
              name='home'
              size={16}
              className='shrink-0'
              style={{ color: 'var(--text-breadcrumb-pagename)' }}
            />
            {breadcrumb.map((seg, i) => {
              const isCurrent = i === breadcrumb.length - 1;
              return (
                <React.Fragment key={i}>
                  <span
                    className='shrink-0'
                    style={{ color: 'var(--text-breadcrumb-pagename)' }}
                    aria-hidden
                  >
                    /
                  </span>
                  <span
                    className='min-w-0'
                    style={{
                      color: isCurrent
                        ? 'var(--text-breadcrumb-current)'
                        : 'var(--text-breadcrumb-pagename)',
                    }}
                  >
                    <EllipsisText text={seg} fill={false} />
                  </span>
                </React.Fragment>
              );
            })}
          </nav>
        </div>
      </div>
    )}

      {/* Hub: location tag left (Figma 270:72714). Default: md+ in bar. */}
      <FilterDropdown
        leadingIcon='location_on'
        options={clinicOptions}
        value={clinic}
        onChange={setClinic}
        className={isHub ? 'shrink-0 inline-flex' : 'shrink-0 hidden md:inline-flex'}
      />

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
        {/* Manual button — full label lg+, icon-only below */}
        <button
          type='button'
          aria-label='คู่มือใช้งานระบบ'
          className='h-9 inline-flex items-center gap-1.5 rounded-lg border border-ink-line bg-white px-2 lg:px-3 text-sm font-medium text-[#4d5358] hover:bg-ink-neutral shrink-0'
        >
          <Icon name='book' size={16} />
          <span className='hidden lg:inline'>คู่มือใช้งานระบบ</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
export { default as SubHeader } from '@/components/layout/SubHeader';
