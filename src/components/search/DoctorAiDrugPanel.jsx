import React, { useMemo } from 'react';
import AISearch from '@/components/search/AISearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import {
  TMT_CATALOG,
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

/* Official TMT assets mirrored from this.or.th (see public/images/brands/). */
const TMT_LOGO_SRC = '/images/brands/tmt.svg';
const TMT_ICON_SRC = '/images/brands/tmt-icon.png';

/**
 * @param {object} props
 * @param {string} props.value
 * @param {(next: string) => void} [props.onChange]
 * @param {(next: string, picked?: object) => void} [props.onSubmit]
 * @param {number} [props.width]
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

  return (
    <div
      className='flex flex-col items-center'
      style={{
        width: 'fit-content',
        maxWidth: '100%',
        gap: 'var(--dim-space-200)',
        padding: 'var(--dim-space-600)',
        borderRadius: 'var(--dim-radius-500)',
        /* Soft medical teal wash (capsule-hero tone) — replaces Doctor AI purple. */
        background:
          'linear-gradient(90deg, #E6F7F8 0%, rgba(168, 218, 220, 0.55) 52%, rgba(122, 176, 181, 0.42) 100%)',
      }}
    >
      <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
        <img
          src={TMT_ICON_SRC}
          alt=''
          width={48}
          height={48}
          style={{
            width: 'var(--dim-size-1000, 48px)',
            height: 'var(--dim-size-1000, 48px)',
            objectFit: 'contain',
            display: 'block',
          }}
          aria-hidden
        />
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
      </div>

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
      />

      <span
        className='text-xs text-ink-tertiary text-center'
        style={{ maxWidth: width }}
      >
        มีรายการในบัญชีมาตรฐาน {TMT_CATALOG.length} รายการ — พิมพ์เพื่อค้นหาแล้วกด + เพื่อเพิ่มเข้าทะเบียน
      </span>
    </div>
  );
}
