import React, { useMemo, useState } from 'react';
import AISearch from '@/components/search/AISearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import { DEFAULT_ICD_SUGGESTIONS, commonTermsForIcd } from '@/data/treatmentVisits';
import { SNOMED_CONCEPTS } from '@/data/treatmentSnomed';
import { ICD9_PROCEDURES } from '@/pages/treat/panels/ProcedureOrderPanel';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import doctorAiAnim from '@/assets/illustrations/Aijson.json';

/* Doctor AI ICD-10 search panel — Figma PHCIS|Medical-examination 156:27359.
   Shared by Treatment diagnosis step and ส่งต่อภายนอก ICD-10 picker. */

const DOCTOR_AI_GRADIENT_START = '#6B83FF';
const DOCTOR_AI_GRADIENT_MID = '#A875FF';
const DOCTOR_AI_GRADIENT_END = '#FF7EB3';

/* มติ คทง.1 ครั้งที่ 3 — index ต้องครอบ "ศัพท์แพทย์ทั่วไป" ด้วย ไม่ใช่แค่
   ชื่อทางการของ ICD-10: แพทย์พิมพ์ "ปวดหัว" / "ความดัน" / "flu" แล้วต้องเจอ
   (เดิมค้นเฉพาะ code + ชื่อทางการ ซึ่งเป็นศัพท์ของ Coder) */
const ICD_SEARCH_INDEX = DEFAULT_ICD_SUGGESTIONS.map((c) => {
  const terms = commonTermsForIcd(c.code);
  return {
    ...c,
    commonTerms: terms,
    haystack: `${c.code} ${c.name} ${terms.join(' ')}`.toLowerCase(),
  };
});

export const icdToRow = (c, query = '') => {
  /* เมื่อหาเจอเพราะคำพูดทั่วไป ให้บอกด้วยว่าตรงกับคำไหน — แพทย์จะได้มั่นใจ
     ว่าไม่ได้เลือกรหัสผิด (ชื่อทางการมักไม่มีคำที่เพิ่งพิมพ์ไป) */
  const q = String(query || '').trim().toLowerCase();
  const hit = q ? (c.commonTerms || []).find((t) => t.toLowerCase().includes(q)) : null;
  const officialHit = q && `${c.code} ${c.name}`.toLowerCase().includes(q);
  return {
    id: c.code,
    label: c.name,
    badge: c.code,
    badgeStyle: 'blue',
    value: c.name,
    subLabel: hit && !officialHit ? `ตรงกับคำที่ใช้ทั่วไป: ${hit}` : undefined,
  };
};

/**
 * @param {object} props
 * @param {string} props.value
 * @param {(next: string) => void} [props.onChange]
 * @param {(next: string, picked?: object) => void} [props.onSubmit]
 * @param {number} [props.width] — AISearch width (default 640)
 * @param {boolean} [props.dropdownInFlow] — keep suggestion list in flow (for Popup)
 */
/* ค้นได้สามระบบรหัส (มติผู้ใช้ 28 ส.ค. 69) — ICD-10 โรค · ICD-9-CM หัตถการ ·
   SNOMED-CT concept · แต่ละระบบมีชุดข้อมูลของตัวเองอยู่แล้วในระบบ */
const CODE_TABS = [
  { key: 'icd10',  label: 'ICD-10',    hint: 'รหัสโรค' },
  { key: 'icd9',   label: 'ICD-9-CM',  hint: 'รหัสหัตถการ' },
  { key: 'snomed', label: 'SNOMED-CT', hint: 'concept' },
];

const ICD9_INDEX = ICD9_PROCEDURES.map((p) => ({
  code: p.code,
  name: `${p.nameTh} (${p.nameEn})`,
  haystack: `${p.code} ${p.nameTh} ${p.nameEn}`.toLowerCase(),
}));

const SNOMED_INDEX = SNOMED_CONCEPTS.map((c) => ({
  code: c.code,
  name: `${c.term} (${c.termTh})`,
  icd10: c.icd10,
  haystack: `${c.code} ${c.term} ${c.termTh} ${c.icd10}`.toLowerCase(),
}));

export default function DoctorAiIcdPanel({
  value,
  onChange,
  onSubmit,
  width = 640,
  dropdownInFlow = false,
}) {
  const search = useSearchHistory('mih:doctor-ai-icd', { limit: 8 });
  const [system, setSystem] = useState('icd10');
  const suggestions = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q) return undefined;
    if (system === 'icd9') {
      return ICD9_INDEX.filter((c) => c.haystack.includes(q)).slice(0, 8).map((c) => ({
        id: c.code, label: c.name, badge: c.code, badgeStyle: 'orange', value: c.name,
      }));
    }
    if (system === 'snomed') {
      return SNOMED_INDEX.filter((c) => c.haystack.includes(q)).slice(0, 8).map((c) => ({
        id: c.code, label: c.name, badge: c.code, badgeStyle: 'purple', value: c.name,
        subLabel: c.icd10 ? `เทียบ ICD-10: ${c.icd10}` : undefined,
      }));
    }
    return ICD_SEARCH_INDEX
      .filter((c) => c.haystack.includes(q))
      .slice(0, 8)
      .map((c) => icdToRow(c, q));
  }, [value, system]);
  const activeTab = CODE_TABS.find((t) => t.key === system) || CODE_TABS[0];

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
          fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
          fontSize: 'var(--type-size-sm)',
          color: 'var(--text-content-default)',
          lineHeight: 1.5,
        }}
      >
        ตัวช่วยค้นหารหัสการวินิจฉัย ({activeTab.label} — {activeTab.hint})
      </span>

      <TabBar aria-label='ระบบรหัสที่ต้องการค้น'>
        {CODE_TABS.map((t) => (
          <TabPill
            key={t.key}
            size='small'
            selected={system === t.key}
            onClick={() => setSystem(t.key)}
          >
            {t.label}
          </TabPill>
        ))}
      </TabBar>

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
        historyEmptyMessage={`ยังไม่มีประวัติการค้นหารหัส ${activeTab.label}`}
        emptyMessage={`ไม่พบรหัส ${activeTab.label} ที่ตรงกับคำค้น`}
        aria-label={`ค้นหารหัส ${activeTab.label}`}
        placeholder='ค้นหาด้วยคำที่ใช้พูดได้เลย เช่น ปวดหัว · ความดัน · flu · A90'
        width={width}
        dropdownInFlow={dropdownInFlow}
      />
    </div>
  );
}
