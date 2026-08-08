import React, { useMemo } from 'react';
import AISearch from '@/components/search/AISearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import {
  TMT_SEARCH_HISTORY_KEY,
  searchTmtCatalog,
  buildTmtSearchHistorySeed,
  tmtToAiSearchRow,
} from '@/data/pharmacyTmtCatalog';

/* TMT drug-search panel — same interaction contract as DoctorAiIcdPanel
   (AISearch suggestions + badge + highlight + add_circle → parent opens
   ConfirmAdd popup), but branded with the official TMT mark from THIS
   instead of the Doctor AI Lottie. Used by PharmacyRegistryEditor when
   adding a facility formulary row (ToR §1.9.1 / §5.1.2). */

/* Official TMT wordmark mirrored from this.or.th (see public/images/brands/). */
const TMT_LOGO_SRC = '/images/brands/tmt.svg';

/* Teal border/icon wash — same capsule-hero family as the panel
   background (overrides AISearch indigo tokens locally only). */
const TMT_SEARCH_CHROME = {
  '--border-aiSearch-default': '#7AB0B5',
  '--border-aiSearch-hover': '#5F9EA3',
  '--border-aiSearch-typing': '#5F9EA3',
  '--border-aiSearch-filled': '#6CA9AD',
  '--icon-aiSearch-default': '#6CA9AD',
  '--icon-aiSearch-hover': '#5F9EA3',
  '--icon-aiSearch-typing': '#5F9EA3',
  '--icon-aiSearch-filled': '#6CA9AD',
};

/**
 * @param {object} props
 * @param {string} props.value
 * @param {(next: string) => void} [props.onChange]
 * @param {(next: string, picked?: object) => void} [props.onSubmit]
 * @param {number|string} [props.width] AISearch width; use `'100%'` to stretch panel
 * @param {boolean} [props.dropdownInFlow]
 */
export default function DoctorAiDrugPanel({
  value,
  onChange,
  onSubmit,
  width = 640,
  dropdownInFlow = false,
}) {
  const search = useSearchHistory(TMT_SEARCH_HISTORY_KEY, {
    limit: 8,
    seedIfEmpty: buildTmtSearchHistorySeed(5),
  });

  const suggestions = useMemo(() => {
    const q = (value || '').trim();
    if (!q) return undefined;
    return searchTmtCatalog(q, { limit: 8 }).map(tmtToAiSearchRow);
  }, [value]);

  const stretch = width === '100%' || width === '100';

  return (
    <div
      className='flex flex-col items-center'
      style={{
        width: stretch ? '100%' : 'fit-content',
        maxWidth: '100%',
        alignSelf: stretch ? 'stretch' : undefined,
        gap: 'var(--dim-space-200)',
        padding: 'var(--dim-space-600)',
        borderRadius: 'var(--dim-radius-500)',
        /* Soft medical teal wash (capsule-hero tone) — replaces Doctor AI purple. */
        background:
          'linear-gradient(90deg, #E6F7F8 0%, rgba(168, 218, 220, 0.55) 52%, rgba(122, 176, 181, 0.42) 100%)',
      }}
    >
      <img
        src={TMT_LOGO_SRC}
        alt='TMT — Thai Medicines Terminology'
        style={{
          height: 'var(--dim-size-700, 32px)',
          width: 'auto',
          maxWidth: 'min(180px, 40vw)',
          objectFit: 'contain',
          display: 'block',
        }}
      />

      <span
        style={{
          fontFamily: 'var(--type-family-heading-content)',
          fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
          fontSize: 'var(--type-size-sm)',
          color: 'var(--text-content-default)',
          lineHeight: 1.5,
          textAlign: 'center',
        }}
      >
        ตัวช่วยค้นหารหัสยา / ชื่อยา (TMT · GPU · TPU)
      </span>

      <AISearch
        value={value || ''}
        onChange={(next) => onChange?.(next)}
        onSubmit={(next, picked) => {
          search.push(picked || next);
          onSubmit?.(next, picked);
        }}
        history={search.history}
        onClearHistory={search.history.length > 0 ? search.clear : undefined}
        suggestions={suggestions}
        historyEmptyMessage='ยังไม่มีประวัติการค้นหารหัสยา'
        emptyMessage='ไม่พบรหัสยาที่ตรงกับคำค้น'
        aria-label='ค้นหารหัสยา TMT'
        placeholder='ค้นหารหัส GPU / TPU หรือชื่อยา เช่น Losartan'
        width={width}
        dropdownInFlow={dropdownInFlow}
        style={TMT_SEARCH_CHROME}
      />
    </div>
  );
}
