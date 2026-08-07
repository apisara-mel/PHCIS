import React, { useMemo } from 'react';
import AISearch from '@/components/search/AISearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import { DEFAULT_ICD_SUGGESTIONS } from '@/data/treatmentVisits';
import doctorAiAnim from '@/assets/illustrations/Aijson.json';

/* Doctor AI ICD-10 search panel — Figma PHCIS|Medical-examination 156:27359.
   Shared by Treatment diagnosis step and ส่งต่อภายนอก ICD-10 picker. */

const DOCTOR_AI_GRADIENT_START = '#6B83FF';
const DOCTOR_AI_GRADIENT_MID = '#A875FF';
const DOCTOR_AI_GRADIENT_END = '#FF7EB3';

const ICD_SEARCH_INDEX = DEFAULT_ICD_SUGGESTIONS.map((c) => ({
  ...c,
  haystack: `${c.code} ${c.name}`.toLowerCase(),
}));

export const icdToRow = (c) => ({
  id: c.code,
  label: c.name,
  badge: c.code,
  badgeStyle: 'blue',
  value: c.name,
});

/**
 * @param {object} props
 * @param {string} props.value
 * @param {(next: string) => void} [props.onChange]
 * @param {(next: string, picked?: object) => void} [props.onSubmit]
 * @param {number} [props.width] — AISearch width (default 640)
 * @param {boolean} [props.dropdownInFlow] — keep suggestion list in flow (for Popup)
 */
export default function DoctorAiIcdPanel({
  value,
  onChange,
  onSubmit,
  width = 640,
  dropdownInFlow = false,
}) {
  const search = useSearchHistory('mih:doctor-ai-icd', { limit: 8 });
  const suggestions = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q) return undefined;
    return ICD_SEARCH_INDEX
      .filter((c) => c.haystack.includes(q))
      .slice(0, 8)
      .map(icdToRow);
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
        background:
          'linear-gradient(to right, rgba(111, 130, 255, 0.2) 0%, rgba(192, 120, 234, 0.2) 100%)',
      }}
    >
      <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
        <LottieIllustration
          animationData={doctorAiAnim}
          size={68}
          ariaLabel='Doctor AI'
        />
        <span
          style={{
            fontFamily: 'var(--type-family-heading-content)',
            fontWeight: 'var(--type-weight-medium)',
            fontSize: 20,
            letterSpacing: '-0.7px',
            lineHeight: 1.5,
            background: `linear-gradient(to right, ${DOCTOR_AI_GRADIENT_START} 0%, ${DOCTOR_AI_GRADIENT_MID} 50%, ${DOCTOR_AI_GRADIENT_END} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            whiteSpace: 'nowrap',
          }}
        >
          Doctor AI
        </span>
      </div>

      <span
        style={{
          fontFamily: 'var(--type-family-heading-content)',
          fontWeight: 'var(--type-weight-bold)',
          fontSize: 'var(--type-size-sm)',
          color: 'var(--text-content-default)',
          lineHeight: 1.5,
        }}
      >
        ตัวช่วยค้นหารหัสการวินิจฉัย (ICD10)
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
        historyEmptyMessage='ยังไม่มีประวัติการค้นหารหัส ICD-10'
        emptyMessage='ไม่พบรหัสที่ตรงกับคำค้น'
        aria-label='ค้นหารหัส ICD-10'
        placeholder='ค้นหารหัสโรค เช่น ไข้เลือดออก'
        width={width}
        dropdownInFlow={dropdownInFlow}
      />
    </div>
  );
}
