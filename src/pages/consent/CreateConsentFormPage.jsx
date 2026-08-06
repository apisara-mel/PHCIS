import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import WizardMorphHeader, { WIZARD_MORPH_SHELL_PROPS } from '@/components/layout/WizardMorphHeader';
import { MIH_CHROME_MORPH_FOOTER } from '@/components/layout/wizardChromeMorphStyles';
import StepProgress from '@/components/step/StepProgress';
import {
  POPUP_MORPH_MOTION_VAR,
  POPUP_MORPH_VAR,
  useLocalHeaderMorph,
} from '@/hooks/useGlobalHeaderMorph';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Checkbox from '@/components/checkbox/Checkbox';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import DangerSubdueIconButton from '@/components/button/DangerSubdueIconButton';
import BrandCircleSubdueIconButton from '@/components/button/BrandCircleSubdueIconButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import RadioButton from '@/components/radio/RadioButton';
import AlertDialog from '@/components/popup/AlertDialog';
import ConsentFormCancelEditPopup from '@/components/popup/ConsentFormCancelEditPopup';
import Popup from '@/components/popup/Popup';
import ErrorBoundary from '@/components/ErrorBoundary';
import SuccessScreen from '@/components/layout/SuccessScreen';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import { markTypeSuperseded, previewConsentSupersedeImpact } from '@/data/consentWorkflowStore';
import TabCapsule from '@/components/tab/TabCapsule';
import { getConsentFormById, CONSENT_FORM_SCOPE_CATALOG, CONSENT_FORM_NAME_SUGGESTIONS, getConsentFormCodeSuggestions, getConsentFormVersionSuggestions } from '@/data/consentFormRecords';
import { buildWizardDraftFromRecord, buildWizardPrefillFromRecord } from '@/data/consentFormWizardContent';
import { buildConsentFormWizardDiff } from '@/data/consentFormVersionDiff';
import { resolveNextConsentFormVersion } from '@/data/consentFormVersion';
import {
  ConsentFormVersionDiffPanel,
  ConsentSupersedeImpactPanel,
  ConsentFormSaveConfirmBody,
} from '@/components/consent/ConsentFormVersionReviewPanels';
import {
  buildWizardPrefillFromDraft,
  formatRelativeSavedThai,
  getConsentFormDraftById,
  saveConsentFormWizardDraft,
} from '@/data/consentFormDraftStore';
import {
  consentScopeKey,
  extractPositionsFromScopes,
  stripConsentScopes,
} from '@/data/consentFormScopes';
import {
  DEFAULT_PATIENT_FIELD_KEYS,
  DEFAULT_SIGNATURE_KEYS,
  fieldSetHas,
  normalizeFieldKeys,
  setFieldKey,
  sortedFieldKeys,
} from '@/data/consentFormFieldKeys';
import ConsentFieldCheckboxGroup from '@/components/consent/ConsentFieldCheckboxGroup';
import FormScopeAccessEditor from '@/components/consent/FormScopeAccessEditor';
import FormPositionAccessEditor from '@/components/consent/FormPositionAccessEditor';
import CONSENT_NAV from '@/pages/consent/consentNav';

/* PHCIS | Consent — สร้างแบบฟอร์มใหม่ (Figma node 294:124265, steps
   350:130712 / 354:135439 / 355:140557).

   A 4-step create-consent-form wizard that lives ENTIRELY inside the Consent
   Management system: it reuses the same <QueuePageShell> + consent side menu
   (CONSENT_NAV) so pressing "สร้างแบบฟอร์มใหม่" never bounces the user out to
   the PHCIS forms library. Step state is local; the stepper drives which panel
   shows. All values alias design.md tokens; copy is Thai; data is local mock. */

/* Figma top bar (350:130181): breadcrumb is just Home / สร้างแบบฟอร์มใหม่ —
   the "ระบบจัดการความยินยอม" program name shows separately above it. */
const breadcrumb = ['สร้างแบบฟอร์มจัดการความยินยอมใหม่'];
const STEPS = ['ข้อมูลพื้นฐาน', 'ผู้ที่มีสิทธิเข้าถึงได้', 'เนื้อหาเอกสาร', 'ตรวจสอบและเผยแพร่'];

/* Popup step morph — continuous label sizing (no compact snap). */
if (typeof document !== 'undefined' && !document.getElementById('mih-consent-popup-step-morph-style')) {
  const s = document.createElement('style');
  s.id = 'mih-consent-popup-step-morph-style';
  s.textContent = [
    '.mih-consent-popup-step-morph [data-step-label]{',
    'font-size:calc(var(--type-size-sm) + (var(--type-size-xs) - var(--type-size-sm)) * var(--mih-popup-morph-motion,0))!important;',
    'line-height:calc(1.5 + (1.35 - 1.5) * var(--mih-popup-morph-motion,0))!important;',
    'transition:none!important;',
    '}',
    '.mih-consent-popup-step-morph button.rounded-full{',
    'width:calc(28px + (24px - 28px) * var(--mih-popup-morph-motion,0))!important;',
    'height:calc(28px + (24px - 28px) * var(--mih-popup-morph-motion,0))!important;',
    'transition:background-color 220ms cubic-bezier(0.16,1,0.3,1),color 220ms cubic-bezier(0.16,1,0.3,1),border-color 220ms cubic-bezier(0.16,1,0.3,1),box-shadow 220ms cubic-bezier(0.16,1,0.3,1),transform 200ms cubic-bezier(0.16,1,0.3,1)!important;',
    '}',
  ].join('');
  document.head.appendChild(s);
}

/* ── Reference data (mock, local) ───────────────────────────────────── */
const TEMPLATES = [
  { key: 'blank', title: 'หน้าเปล่า',              subtitle: 'สร้างเองจากหน้าว่าง' },
  { key: 'data',  title: 'เปิดเผยข้อมูลสุขภาพ',    subtitle: 'Health Data Disclosure (PDPA)' },
];

/* Selecting a แม่แบบ pre-fills Step 1 (ข้อมูลพื้นฐาน) + Step 3 (เนื้อหาเอกสาร).
   The template key === the TYPE_OPTIONS value, so `type` is the key itself.
   Every field stays fully editable afterwards. (Figma 350:130188.) */
const COMMON_CLAUSES = [
  { title: 'การคุ้มครองข้อมูลส่วนบุคคล', detail: 'ข้าพเจ้ายินยอมให้สถานพยาบาลเก็บรวบรวมและใช้ข้อมูลสุขภาพเพื่อการรักษาพยาบาล ภายใต้พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)' },
  { title: 'สิทธิในการเพิกถอนความยินยอม', detail: 'ข้าพเจ้าทราบว่าสามารถเพิกถอนความยินยอมนี้ได้ทุกเมื่อ โดยไม่กระทบต่อสิทธิในการรับบริการอื่น ๆ' },
];
const TPL = (name, lead, extra = {}) => ({ name, version: 'V 1.0', ttl: '30', leadClauses: lead, cover: 0, ...extra });
const TEMPLATE_PREFILL = {
  data: TPL('ใบยินยอมเปิดเผยข้อมูลสุขภาพ (PDPA)', [{ title: 'การเปิดเผยข้อมูลสุขภาพ', detail: 'ข้าพเจ้ายินยอมให้เปิดเผยข้อมูลสุขภาพแก่บุคคล/หน่วยงานที่ระบุ เพื่อวัตถุประสงค์ที่กำหนดไว้' }], { ttl: '365', cover: 1 }),
};

/* Form-cover thumbnails — MIH Consent wizard (356:111486). */
const COVERS = Array.from({ length: 20 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return {
    key: `cover-${n}`,
    label: `หน้าปกแบบฟอร์ม ${i + 1}`,
    image: `/illustration/consent/form-cover-${n}.png`,
  };
});

const TYPE_OPTIONS = [
  { value: 'data', label: 'ความยินยอมเปิดเผยข้อมูลสุขภาพ (PDPA)' },
];
const TTL_OPTIONS = [
  { value: '1',   label: '1 วัน' },
  { value: '3',   label: '3 วัน' },
  { value: '5',   label: '5 วัน' },
  { value: '7',   label: '7 วัน' },
  { value: '15',  label: '15 วัน' },
  { value: '30',  label: '30 วัน' },
  { value: '60',  label: '60 วัน' },
  { value: '90',  label: '90 วัน' },
  { value: '365', label: '1 ปี (365 วัน)' },
];
/* ตำแหน่ง — options จาก consentFormScopes.js */

const PATIENT_FIELDS = [
  { key: 'name',       label: 'ชื่อผู้ป่วย' },
  { key: 'hn',         label: 'หมายเลข HN' },
  { key: 'doctor',     label: 'แพทย์ผู้รักษา' },
  { key: 'birth',      label: 'วันเกิด / อายุ' },
  { key: 'citizen',    label: 'เลขบัตรประชาชน' },
  { key: 'contact',    label: 'ข้อมูลบุคคล' },
];
const SIGNATURE_FIELDS = [
  { key: 'patient', label: 'ผู้ป่วย / ผู้ปกครอง' },
  { key: 'doctor',  label: 'แพทย์ผู้รักษา' },
  { key: 'witness', label: 'พยาน' },
  { key: 'nurse',   label: 'พยาบาล' },
];

const TITLE_HINTS = ['ความยินยอมในการรักษา', 'การเปิดเผยข้อมูล', 'ความเสี่ยงและภาวะแทรกซ้อน', 'การถอนความยินยอม'];
const DETAIL_HINTS = [
  'ข้าพเจ้ายินยอมรับการตรวจวินิจฉัยและการรักษาตามที่แพทย์เห็นสมควร',
  'ข้าพเจ้าได้รับคำอธิบายถึงความเสี่ยงและภาวะแทรกซ้อนที่อาจเกิดขึ้นแล้ว',
  'ข้าพเจ้าสามารถถอนความยินยอมนี้ได้ทุกเมื่อโดยแจ้งเป็นลายลักษณ์อักษร',
];

/* ด.1.1.13 — field type ต่อข้อความยินยอม (form builder) */
const FIELD_TYPE_OPTIONS = [
  { value: 'boolean',  label: 'ยินยอม / ไม่ยินยอม (Boolean)' },
  { value: 'checkbox', label: 'Checkbox รับทราบ' },
  { value: 'text',     label: 'ข้อความสั้น (Text)' },
  { value: 'textarea', label: 'ข้อความยาว (Textarea)' },
  { value: 'date',     label: 'วันที่ (Date)' },
  { value: 'number',   label: 'ตัวเลข (Number)' },
];

/* แผนที่ประเภทไทย (registry) → ค่า TYPE_OPTIONS ของ wizard — ใช้ตอน prefill
   จาก "สร้างเวอร์ชันใหม่" (ด.1.1.5) */
const TYPE_THAI_TO_VALUE = {
  PDPA: 'data',
};

let SECTION_SEQ = 2;
const makeSection = () => ({ id: `cs-${SECTION_SEQ++}`, title: '', detail: '', fieldType: 'boolean' });

const sectionHasContent = (s) => (
  Boolean(s) && String(s.title ?? '').trim() && String(s.detail ?? '').trim()
);

const PREVIEW_DETAIL_MAX = 280;
const truncatePreviewText = (text, max = PREVIEW_DETAIL_MAX) => {
  const s = String(text ?? '').trim();
  if (!s) return '';
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
};

const buildVersionDiffSafe = (baseline, current) => {
  try {
    return buildConsentFormWizardDiff(baseline, current);
  } catch (err) {
    console.error('[consent] buildConsentFormWizardDiff failed', err);
    return {
      hasChanges: true,
      groups: [{
        id: 'summary',
        label: 'เนื้อหาเอกสาร',
        changes: [{
          label: 'การเปลี่ยนแปลง',
          before: '—',
          after: 'มีการแก้ไข — เปิด Console (F12) เพื่อดูรายละเอียด',
        }],
      }],
    };
  }
};

const setsEqual = (a, b, fallback = []) => {
  const setA = new Set(sortedFieldKeys(a, fallback));
  const setB = new Set(sortedFieldKeys(b, fallback));
  if (setA.size !== setB.size) return false;
  for (const key of setA) if (!setB.has(key)) return false;
  return true;
};

/** มีการกรอก/เลือกอะไรบ้าง — ไม่นับค่า default ของฟอร์มว่าง */
const consentWizardHasUserInput = ({
  template,
  cover,
  name,
  code,
  version,
  ttl,
  type,
  accessScopes,
  position,
  docTitle,
  patientFields,
  sections,
  signatures,
  note,
  requireGuardian,
  allowESign,
}) => {
  if (template !== 'blank') return true;
  if (cover !== 0) return true;
  if (String(name || '').trim() || String(code || '').trim()
    || String(version || '').trim() || String(ttl || '').trim()) return true;
  if (type !== 'data') return true;
  if (String(docTitle || '').trim() || String(note || '').trim()) return true;
  if (requireGuardian || !allowESign) return true;
  if ((accessScopes?.length ?? 0) > 0 || (position?.length ?? 0) > 0) return true;
  if (!setsEqual(patientFields, DEFAULT_PATIENT_FIELD_KEYS, DEFAULT_PATIENT_FIELD_KEYS)) return true;
  if (!setsEqual(signatures, DEFAULT_SIGNATURE_KEYS, DEFAULT_SIGNATURE_KEYS)) return true;
  if ((sections?.length ?? 0) !== 2) return true;
  if (sections.some((s) => String(s.title || '').trim() || String(s.detail || '').trim())) return true;
  if (sections.some((s) => s.fieldType && s.fieldType !== 'boolean')) return true;
  return false;
};

const consentWizardSnapshot = (state) => JSON.stringify({
  step: state.step ?? 0,
  template: state.template ?? 'blank',
  cover: state.cover ?? 0,
  name: state.name ?? '',
  code: state.code ?? '',
  type: state.type ?? 'data',
  version: state.version ?? '',
  ttl: state.ttl ?? '',
  accessScopes: state.accessScopes ?? [],
  position: state.position ?? [],
  docTitle: state.docTitle ?? '',
  patientFields: sortedFieldKeys(state.patientFields, DEFAULT_PATIENT_FIELD_KEYS),
  signatures: sortedFieldKeys(state.signatures, DEFAULT_SIGNATURE_KEYS),
  sections: (state.sections || [])
    .filter(Boolean)
    .map((s) => ({
      title: String(s.title ?? '').trim(),
      detail: String(s.detail ?? '').trim(),
      fieldType: s.fieldType ?? 'boolean',
    })),
  note: state.note ?? '',
  requireGuardian: !!state.requireGuardian,
  allowESign: state.allowESign !== false,
});

const buildWizardStateFromPrefill = (prefill) => ({
  step: prefill.step ?? 0,
  template: prefill.template ?? 'blank',
  cover: prefill.cover ?? 0,
  name: prefill.name ?? '',
  code: prefill.code ?? '',
  type: prefill.type ?? TYPE_THAI_TO_VALUE[prefill.typeLabel] ?? 'data',
  version: prefill.version ?? '',
  ttl: prefill.ttl ?? '',
  accessScopes: prefill.accessScopes?.length ? stripConsentScopes(prefill.accessScopes) : [],
  position: prefill.position?.length
    ? prefill.position
    : extractPositionsFromScopes(prefill.accessScopes || []),
  docTitle: prefill.docTitle ?? prefill.name ?? '',
  patientFields: normalizeFieldKeys(prefill.patientFields, DEFAULT_PATIENT_FIELD_KEYS),
  sections: prefill.sections?.length
    ? prefill.sections.map((s, i) => ({
      id: s.id || `cs-prefill-${i}`,
      title: s.title || '',
      detail: s.detail || '',
      fieldType: s.fieldType || 'boolean',
    }))
    : [makeSection(), makeSection()],
  signatures: normalizeFieldKeys(prefill.signatures, DEFAULT_SIGNATURE_KEYS),
  note: prefill.note ?? '',
  requireGuardian: !!prefill.requireGuardian,
  allowESign: prefill.allowESign !== false,
});

/* ── Small presentational helpers ───────────────────────────────────── */
const SectionCard = ({ children, style }) => (
  <section
    className='w-full flex flex-col'
    style={{
      background: 'var(--surface-card-100)',
      borderRadius: 'var(--dim-radius-500)',
      border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      boxShadow: 'var(--shadow-card)',
      padding: 'var(--dim-space-600)',
      gap: 'var(--dim-space-400)',
      ...style,
    }}
  >
    {children}
  </section>
);

const CardHeading = ({ title, subtext, badge }) => (
  <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
      <h2
        style={{
          color: 'var(--text-brandPrimary-default)',
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-base)',
          fontWeight: 'var(--type-weight-regular, 400)',
          lineHeight: 1.4,
        }}
      >
        {title}
      </h2>
      {subtext && (
        <span style={{ color: 'var(--text-content-quaternary, #ADB2B7)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>
          {subtext}
        </span>
      )}
    </div>
    <div className='flex-1' />
    {badge && (
      <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>{badge}</ColorfulBadge>
    )}
  </div>
);

const ColumnHeading = ({ children }) => (
  <h3
    style={{
      color: 'var(--text-brandPrimary-default)',
      fontFamily: 'var(--type-family-heading-graphic2)',
      fontSize: 'var(--type-size-base)',
      fontWeight: 'var(--type-weight-regular, 400)',
      lineHeight: 1.4,
    }}
  >
    {children}
  </h3>
);

const CarouselArrows = ({ onPrev, onNext, prevDisabled = false, nextDisabled = false }) => (
  <div className='flex items-center justify-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
    <BrandCircleSubdueIconButton icon='chevron_left' size='md' aria-label='ก่อนหน้า' onClick={onPrev} disabled={prevDisabled} />
    <BrandCircleSubdueIconButton icon='chevron_right' size='md' aria-label='ถัดไป' onClick={onNext} disabled={nextDisabled} />
  </div>
);

/* Template / category select-card — Figma "Select card Left" (350:128162)
   with the 3 interaction states from MIH Design System Card 247:32:
     • Default  : 1px border brandPrimary-quaternary (#e2f3eb) · shadow Bottom/200
     • Hover    : same border · shadow Bottom/400 (lift)
     • Selected : 2px border brandPrimary-default (#007549) · shadow Bottom/400
   Background stays surface/card/100 (white) in every state. */
const TemplateCard = ({ tpl, selected, onClick, style }) => {
  const [hovered, setHovered] = useState(false);
  const lifted = hovered || selected;
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={selected}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='flex flex-col min-w-0 items-start justify-center text-left'
      style={{
        flex: '1 0 0',
        gap: 'var(--dim-space-200)',
        background: 'var(--surface-card-100)',
        /* Border WIDTH is constant 1px in every state — only the colour
           changes — so the content box never resizes and the card can't
           jolt on click. The selected state's 2px brand outline is the 1px
           border + a 1px inset box-shadow ring (layout-neutral). */
        border: `var(--dim-stroke-100) solid ${selected ? 'var(--border-brandPrimary-default, #007549)' : 'var(--border-brandPrimary-quaternary)'}`,
        borderRadius: 'var(--dim-radius-500)',
        padding: 'var(--dim-space-600)',
        boxShadow: selected
          ? 'inset 0 0 0 var(--dim-stroke-100) var(--border-brandPrimary-default, #007549), var(--shadow-brand-drop-bottom-400)'
          : lifted ? 'var(--shadow-brand-drop-bottom-400)' : 'var(--shadow-card)',
        outline: 'none',
        cursor: 'pointer',
        transition: 'box-shadow 0.18s ease, border-color 0.18s ease',
        ...(style || {}),
      }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{ color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', lineHeight: 1.5 }}>
          {tpl.title}
        </span>
        <span style={{ color: 'var(--color-emerald-600, #08A768)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.5 }}>
          {tpl.subtitle}
        </span>
      </div>
    </button>
  );
};

/* Hide the template track's scrollbar (idempotent module-load injection). */
if (typeof document !== 'undefined' && !document.getElementById('mih-tpl-track-style')) {
  const s = document.createElement('style');
  s.id = 'mih-tpl-track-style';
  s.textContent = '.mih-tpl-track{scrollbar-width:none;-ms-overflow-style:none;}.mih-tpl-track::-webkit-scrollbar{display:none;height:0;}';
  document.head.appendChild(s);
}

/* Template carousel — all 20 แม่แบบ in one horizontal track, 5 visible per view.
     • Arrow click slides exactly one view with smooth scroll.
     • Hovering near the left/right edge of the strip auto-slides continuously
       ("hover เพื่อ slide บนการ์ด") — pointer position drives the direction.
   Arrows disable once the track hits either end. */
/* Flex value that shows 5 cards per view (4 gaps of space/300 between them).
   Cards passed to <CardCarousel> carry `style={{ flex: CARD_BASIS }}`. */
const CARD_BASIS = '0 0 calc((100% - 4 * var(--dim-space-300)) / 5)';

const INLINE_SUGGESTION_CHIP_STYLE = {
  height: 'var(--dim-size-600, 32px)',
  paddingLeft: 'var(--dim-space-200, 8px)',
  paddingRight: 'var(--dim-space-200, 8px)',
  paddingTop: 'var(--dim-space-050, 2px)',
  paddingBottom: 'var(--dim-space-050, 2px)',
  fontSize: 'var(--type-size-xs, 12px)',
};

/** Reserve chip-row height so prefill / chip pick doesn't shift sticky header morph. */
const SUGGESTION_ROW_SLOT = { minHeight: 'var(--dim-size-600, 32px)' };

const canNavigateToStep = (idx, step, completedSteps) =>
  idx < step || Boolean(completedSteps[idx - 1]);

/** Sticky wizard header — stepper uses visit order only (not live validation)
    so filling Step 1 from a template never animates future steps in the chrome. */
const ConsentWizardHeader = React.memo(function ConsentWizardHeader({
  step, prefill, onStepClick,
}) {
  return (
    <WizardMorphHeader
      title='สร้างแบบฟอร์มจัดการความยินยอมใหม่'
      afterTitle={prefill?.fromVersion ? (
        <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>
          สร้างเวอร์ชันใหม่จาก {prefill.fromVersion} → {prefill.version}
        </ColorfulBadge>
      ) : null}
      steps={STEPS}
      current={step}
      onStepClick={onStepClick}
    />
  );
});

/** Stepper band for ConsentFormEditPopup — sticky + scroll-morph (CSS vars only, no layout snap). */
const ConsentFormEditPopupSteps = React.memo(function ConsentFormEditPopupSteps({
  step,
  completedSteps,
  onStepClick,
  fromVersion,
  nextVersion,
}) {
  return (
    <div
      className='sticky top-0 z-10 w-full shrink-0 flex flex-col items-center'
      style={{
        marginTop: 'calc(-1 * var(--dim-space-600, 24px))',
        paddingTop:
          `calc(var(--dim-space-200) + (var(--dim-space-150) - var(--dim-space-200)) * var(${POPUP_MORPH_VAR}, 0))`,
        paddingBottom:
          `calc(var(--dim-space-200) + (var(--dim-space-150) - var(--dim-space-200)) * var(${POPUP_MORPH_VAR}, 0))`,
        paddingLeft: 'clamp(var(--dim-space-300), 4vw, var(--dim-space-600))',
        paddingRight: 'clamp(var(--dim-space-300), 4vw, var(--dim-space-600))',
        background: 'var(--surface-card-100)',
        borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        boxShadow: 'var(--shadow-brand-drop-bottom-100)',
        gap: `calc(var(--dim-space-200) * (1 - var(${POPUP_MORPH_VAR}, 0)))`,
      }}
    >
      <div
        className='w-full min-w-0 flex justify-center mih-consent-popup-step-morph'
        style={{
          transform: `scale(calc(1 + (0.94 - 1) * var(${POPUP_MORPH_MOTION_VAR}, 0)))`,
          transformOrigin: 'center top',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
      >
        <StepProgress
          steps={STEPS}
          current={step}
          completedSteps={completedSteps}
          onStepClick={onStepClick}
          className='justify-center w-full'
        />
      </div>
      {fromVersion && nextVersion ? (
        <div
          style={{
            overflow: 'hidden',
            maxHeight: `calc((1 - var(${POPUP_MORPH_VAR}, 0)) * var(--dim-size-800, 40px))`,
            opacity: `calc(1 - var(${POPUP_MORPH_VAR}, 0))`,
          }}
        >
          <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>
            {`สร้างเวอร์ชันใหม่จาก ${fromVersion} → ${nextVersion}`}
          </ColorfulBadge>
        </div>
      ) : null}
    </div>
  );
});

const InlineSuggestionChips = ({ items, value, onSelect, getLabel, getKey }) => {
  if (!items.length) return null;
  return (
    <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
      {items.map((item) => {
        const label = getLabel(item);
        return (
          <TabCapsule
            key={getKey(item)}
            variant='filter'
            label={label}
            selected={value.trim() === label}
            onClick={() => onSelect(label)}
            style={INLINE_SUGGESTION_CHIP_STYLE}
          />
        );
      })}
    </div>
  );
};

/* Generic sliding carousel — a horizontal track + arrows + hover-to-slide.
   Used by both เลือกแม่แบบ and เลือกหน้าปก so they behave identically:
     • Arrow click slides exactly one view with smooth scroll.
     • Hovering near the left/right edge auto-slides continuously.
   Children are the flex items (cards). Arrows disable at either end. */
/* Horizontal track padding so card box-shadows are not clipped by overflow-x. */
const CAROUSEL_SHADOW_PAD = {
  paddingTop: 'var(--dim-space-300)',
  paddingBottom: 'calc(var(--dim-space-800) + var(--dim-space-300))',
  paddingInline: 'var(--dim-space-100)',
  marginTop: 'calc(-1 * var(--dim-space-300))',
  marginBottom: 'calc(-1 * (var(--dim-space-800) + var(--dim-space-300)))',
  marginInline: 'calc(-1 * var(--dim-space-100))',
};

function CardCarousel({ children, showArrows = true }) {
  const trackRef = useRef(null);
  const hoverDir = useRef(0);
  const hoverTimer = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = () => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  };
  useEffect(() => { updateEdges(); }, [children]);

  const stopHoverSlide = () => {
    if (hoverTimer.current) { clearInterval(hoverTimer.current); hoverTimer.current = null; }
    hoverDir.current = 0;
  };
  const startHoverSlide = (dir) => {
    if (hoverDir.current === dir) return;
    stopHoverSlide();
    hoverDir.current = dir;
    hoverTimer.current = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      el.scrollLeft += dir * 7;
    }, 16);
  };
  useEffect(() => stopHoverSlide, []);

  /* Arrow = explicit one-view smooth slide. */
  const slide = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  };

  /* Pointer within the left/right 64px gutter auto-slides that direction. */
  const onMove = (e) => {
    if (!showArrows) return;
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const edge = 64;
    if (x < edge && el.scrollLeft > 1) startHoverSlide(-1);
    else if (x > rect.width - edge && el.scrollLeft + el.clientWidth < el.scrollWidth - 1) startHoverSlide(1);
    else stopHoverSlide();
  };

  return (
    <>
      <div
        ref={trackRef}
        onScroll={updateEdges}
        onMouseMove={onMove}
        onMouseLeave={stopHoverSlide}
        className='flex w-full min-w-0 mih-tpl-track'
        style={{ gap: 'var(--dim-space-300)', overflowX: 'auto', ...CAROUSEL_SHADOW_PAD }}
      >
        {children}
      </div>
      {showArrows && (
        <CarouselArrows
          onPrev={() => slide(-1)}
          onNext={() => slide(1)}
          prevDisabled={atStart}
          nextDisabled={atEnd}
        />
      )}
    </>
  );
}

/* Cover select-card — Figma "cover" 227×113 (350:130188 / DS Card 250:2578)
   with the 3 states:
     • Default  : no border, no shadow
     • Hover    : no border + shadow Bottom/200 (lift)
     • Selected : 2px brandPrimary-default ring, no drop shadow
   Selection ring + hover lift are drawn with box-shadow (layout-neutral) so the
   card never jolts on click. Dimension stays flex-1 + aspect-227/113 per the
   section layout (cards fill the row equally). */
const CoverCard = ({ cover, selected, onClick, style }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={selected}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='relative min-w-0 overflow-hidden'
      style={{
        flex: '1 0 0',
        aspectRatio: '227 / 113',
        padding: 0,
        border: 'none',
        borderRadius: 'var(--dim-radius-400)',
        background: 'var(--surface-info-tertiary, #DBEAFE)',
        boxShadow: hovered && !selected ? 'var(--shadow-card)' : 'none',
        outline: 'none',
        cursor: 'pointer',
        transition: 'box-shadow 0.18s ease',
        ...(style || {}),
      }}
    >
      <img
        src={cover.image}
        alt={cover.label}
        draggable={false}
        className='block w-full h-full'
        style={{ objectFit: 'cover', borderRadius: 'inherit' }}
      />
      {selected && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            borderRadius: 'inherit',
            boxShadow: 'inset 0 0 0 var(--dim-stroke-200, 2px) var(--border-brandPrimary-default, #007549)',
            pointerEvents: 'none',
          }}
        />
      )}
    </button>
  );
};
/* Photo upload dropzone — Figma "Photo" (3420:2565) Default/Hover states.
   Wrapped in a <label> with a hidden <input type="file">, so a click opens
   the OS image picker natively. Hover swaps the dashed border to
   border/formbuilder/hover (#08A768) per the Figma hover variant. */
const UploadDropzone = ({ onFile, style }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <label
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='min-w-0 flex flex-col items-center justify-center'
      style={{
        flex: '1 0 0',
        aspectRatio: '227 / 113',
        border: `var(--dim-stroke-150) dashed ${hovered ? 'var(--border-formbuilder-hover, #08A768)' : 'var(--border-formbuilder-default, #c5edda)'}`,
        background: 'var(--surface-formbuilder-default, #f4fbf8)',
        borderRadius: 'var(--dim-radius-200)',
        gap: 'var(--dim-space-200)',
        padding: 'var(--dim-space-600)',
        color: 'var(--text-formbuilder-text, #007549)',
        cursor: 'pointer',
        transition: 'border-color 0.18s ease',
        ...(style || {}),
      }}
    >
      <input
        type='file'
        accept='image/*'
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files && e.target.files[0];
          if (file && onFile) onFile(file);
          e.target.value = '';
        }}
      />
      <Icon name='add_photo_alternate' size={20} />
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', textAlign: 'center' }}>
        เพิ่มรูปจากคอมพิวเตอร์
      </span>
    </label>
  );
};

/* ── Page ───────────────────────────────────────────────────────────── */
export default function CreateConsentFormPage() {
  const history = useHistory();
  const location = useLocation();
  /* ด.1.1.5 — prefill จาก route state หรือ ?editId= (แท็บใหม่จากปุ่มแก้ไข) */
  const prefill = useMemo(() => {
    if (location.state && location.state.prefill) return location.state.prefill;
    const params = new URLSearchParams(location.search || '');
    const draftId = params.get('draftId');
    if (draftId) {
      const entry = getConsentFormDraftById(draftId);
      if (entry) return buildWizardPrefillFromDraft(entry);
      return null;
    }
    const editId = params.get('editId');
    if (!editId) return null;
    const record = getConsentFormById(editId);
    if (!record) return null;
    return buildWizardPrefillFromRecord(record, { newVersion: params.get('newVersion') === '1' });
  }, [location.state, location.search]);
  const [step, setStep] = useState(0);
  const [draftId, setDraftId] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [showSaveBadge, setShowSaveBadge] = useState(false);
  const [saveToast, setSaveToast] = useState(null);
  const [savedLabelTick, setSavedLabelTick] = useState(0);
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [publishVersion, setPublishVersion] = useState('');
  const [published, setPublished] = useState(false);
  const pendingScrollY = useRef(null);

  useLayoutEffect(() => {
    if (pendingScrollY.current == null) return;
    window.scrollTo(0, pendingScrollY.current);
    pendingScrollY.current = null;
  });
  const [template, setTemplate] = useState('blank');
  const [cover, setCover] = useState(0);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('data');
  const [version, setVersion] = useState('');
  const [ttl, setTtl] = useState('');
  /* Step 1 — access rights */
  const [accessScopes, setAccessScopes] = useState([]);
  const [position, setPosition] = useState([]);

  /* Step 3 — document content */
  const [docTitle, setDocTitle] = useState('');
  const [patientFields, setPatientFields] = useState(() => [...DEFAULT_PATIENT_FIELD_KEYS]);
  const [sections, setSections] = useState(() => [makeSection(), makeSection()]);
  const [signatures, setSignatures] = useState(() => [...DEFAULT_SIGNATURE_KEYS]);
  const [note, setNote] = useState('');
  const [requireGuardian, setRequireGuardian] = useState(false);
  const [allowESign, setAllowESign] = useState(true);

  /* Prefill ครั้งเดียวตอน mount — แก้ไข / สร้างเวอร์ชันใหม่: โหลดทุก field
     ที่เคยกรอก (Step 1 + Step 2) ให้แก้ต่อได้ทั้งหมด (ด.1.1.5). */
  useEffect(() => {
    if (!prefill) return;
    if (prefill.draftId != null) setDraftId(prefill.draftId);
    if (prefill.savedAt) setLastSavedAt(new Date(prefill.savedAt));
    if (prefill.step != null) setStep(prefill.step);
    if (prefill.name) { setName(prefill.name); setDocTitle(prefill.docTitle || prefill.name); }
    if (prefill.code) setCode(prefill.code);
    if (prefill.type) setType(prefill.type);
    else if (prefill.typeLabel && TYPE_THAI_TO_VALUE[prefill.typeLabel]) setType(TYPE_THAI_TO_VALUE[prefill.typeLabel]);
    if (prefill.version) setVersion(prefill.version);
    if (prefill.ttl) setTtl(prefill.ttl);
    else setTtl((prev) => prev || '30');
    if (prefill.template) setTemplate(prefill.template);
    if (prefill.cover != null) setCover(prefill.cover);
    if (prefill.accessScopes?.length) {
      setAccessScopes(stripConsentScopes(prefill.accessScopes));
      setPosition(
        prefill.position?.length
          ? prefill.position
          : extractPositionsFromScopes(prefill.accessScopes),
      );
    }
    setPatientFields(normalizeFieldKeys(prefill.patientFields, DEFAULT_PATIENT_FIELD_KEYS));
    if (prefill.sections?.length) {
      setSections(prefill.sections.map((s, i) => ({
        id: s.id || `cs-prefill-${i}`,
        title: s.title || '',
        detail: s.detail || '',
        fieldType: s.fieldType || 'boolean',
      })));
    }
    setSignatures(normalizeFieldKeys(prefill.signatures, DEFAULT_SIGNATURE_KEYS));
    if (prefill.note != null) setNote(prefill.note);
    if (prefill.requireGuardian != null) setRequireGuardian(prefill.requireGuardian);
    if (prefill.allowESign != null) setAllowESign(prefill.allowESign);
    setSavedSnapshot(consentWizardSnapshot(buildWizardStateFromPrefill(prefill)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!lastSavedAt) return undefined;
    const id = window.setInterval(() => setSavedLabelTick((v) => v + 1), 30_000);
    return () => window.clearInterval(id);
  }, [lastSavedAt]);

  useEffect(() => {
    if (!showSaveBadge) return undefined;
    const id = window.setTimeout(() => setShowSaveBadge(false), 4000);
    return () => window.clearTimeout(id);
  }, [showSaveBadge]);

  const lastSavedLabel = useMemo(() => {
    if (!lastSavedAt) return 'ยังไม่ได้บันทึก';
    void savedLabelTick;
    return formatRelativeSavedThai(lastSavedAt);
  }, [lastSavedAt, savedLabelTick]);

  const wizardState = useMemo(() => ({
    step,
    template,
    cover,
    name,
    code,
    type,
    version,
    ttl,
    accessScopes,
    position,
    docTitle,
    patientFields,
    sections,
    signatures,
    note,
    requireGuardian,
    allowESign,
  }), [
    step, template, cover, name, code, type, version, ttl,
    accessScopes, position, docTitle, patientFields, sections,
    signatures, note, requireGuardian, allowESign,
  ]);

  const baselineDraft = useMemo(() => {
    if (!prefill?.fromVersion) return null;
    const record = prefill.sourceFormId ? getConsentFormById(prefill.sourceFormId) : null;
    return record ? buildWizardDraftFromRecord(record) : null;
  }, [prefill?.fromVersion, prefill?.sourceFormId]);

  const versionDiff = useMemo(() => (
    baselineDraft && step === 3
      ? buildVersionDiffSafe(baselineDraft, wizardState)
      : null
  ), [baselineDraft, wizardState, step]);

  const consentImpact = useMemo(() => (
    prefill?.supersedeType
      ? previewConsentSupersedeImpact(prefill.supersedeType, { newVersion: version.trim() })
      : null
  ), [prefill?.supersedeType, version]);

  const canSaveDraft = useMemo(() => {
    if (!consentWizardHasUserInput(wizardState)) return false;
    const current = consentWizardSnapshot(wizardState);
    if (savedSnapshot == null) return true;
    return current !== savedSnapshot;
  }, [wizardState, savedSnapshot]);

  const handleSaveDraft = useCallback(() => {
    if (!consentWizardHasUserInput(wizardState)) return;
    const current = consentWizardSnapshot(wizardState);
    if (savedSnapshot != null && current === savedSnapshot) return;
    const result = saveConsentFormWizardDraft({
      step,
      template,
      cover,
      name,
      code,
      type,
      version,
      ttl,
      accessScopes,
      position,
      docTitle,
      patientFields: normalizeFieldKeys(patientFields, DEFAULT_PATIENT_FIELD_KEYS),
      sections,
      signatures: normalizeFieldKeys(signatures, DEFAULT_SIGNATURE_KEYS),
      note,
      requireGuardian,
      allowESign,
    }, { draftId });

    setDraftId(result.id);
    setLastSavedAt(result.savedAt);
    setSavedSnapshot(consentWizardSnapshot(wizardState));
    setShowSaveBadge(true);
    setSaveToast({
      id: Date.now(),
      variant: 'success',
      message: 'บันทึกแบบร่างแล้ว สามารถดูได้ที่เมนูแบบฟอร์มความยินยอม แท็บบันทึกร่าง',
      action: {
        label: 'ไปที่แท็บบันทึกร่าง',
        onClick: () => {
          setSaveToast(null);
          history.push('/consent/forms?tab=draft');
        },
      },
    });

    if (!draftId) {
      history.replace(`/consent/forms/new?draftId=${result.id}`);
    }
  }, [wizardState, savedSnapshot, draftId, history]);

  /* Select a แม่แบบ → pre-fill Step 1 + Step 2 (still fully editable).
     'blank' resets to an empty form. (Figma 350:130188.) */
  const applyTemplate = (key) => {
    pendingScrollY.current = window.scrollY;
    setTemplate(key);
    if (key === 'blank' || !TEMPLATE_PREFILL[key]) {
      setName(''); setType('data'); setVersion(''); setTtl('');
      setDocTitle(''); setRequireGuardian(false);
      setSections([makeSection(), makeSection()]);
      setCover(0);
      return;
    }
    const p = TEMPLATE_PREFILL[key];
    setName(p.name);
    setType('data');
    setVersion('');
    setTtl(p.ttl);
    setCover(p.cover ?? 0);
    setDocTitle(p.name);
    setRequireGuardian(!!p.requireGuardian);
    setSections([...p.leadClauses, ...COMMON_CLAUSES].map((c) => ({ ...makeSection(), ...c })));
  };

  /* Step-1 validity gates the "ถัดไป" button (Figma annotation). */
  const step1Valid = name.trim() && code.trim() && type && version.trim() && ttl;
  const step2Valid = accessScopes.length > 0 && position.length;
  const step3Valid = sections.some(sectionHasContent);
  const completedSteps = [Boolean(step1Valid), Boolean(step2Valid), Boolean(step3Valid), false];
  const canAdvance = step === 0 ? step1Valid : step === 1 ? step2Valid : step === 2 ? step3Valid : true;
  const handleStepClick = useCallback(
    (idx) => { if (canNavigateToStep(idx, step, completedSteps)) setStep(idx); },
    [step, step1Valid, step2Valid, step3Valid],
  );

  const doPublish = (confirmedVersion) => {
    const publishedVersion = (confirmedVersion || version).trim();
    if (confirmedVersion) setVersion(confirmedVersion);
    if (prefill?.supersedeType) {
      markTypeSuperseded(prefill.supersedeType, { newVersion: publishedVersion });
    }
    setConfirmPublish(false);
    setPublished(true);
  };

  const goNext = () => {
    if (step < 3) { setStep(step + 1); window.scrollTo?.({ top: 0 }); }
    else if (prefill?.fromVersion) {
      setPublishVersion(version.trim());
      setConfirmPublish(true);
    } else {
      doPublish();
    }
  };

  const updateSection = (id, patch) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSection = (id) =>
    setSections((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  const reorderSections = (from, to) =>
    setSections((prev) => {
      if (from == null || to == null || from === to || from < 0 || to < 0) return prev;
      if (from >= prev.length || to > prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      next.splice(to, 0, moved);
      return next;
    });

  const setPatientField = useCallback(
    (key, checked) => setPatientFields((prev) => setFieldKey(prev, key, checked, DEFAULT_PATIENT_FIELD_KEYS)),
    [],
  );
  const setSignatureField = useCallback(
    (key, checked) => setSignatures((prev) => setFieldKey(prev, key, checked, DEFAULT_SIGNATURE_KEYS)),
    [],
  );

  const nextLabel = step === 0
    ? 'ถัดไป: ผู้ที่มีสิทธิเข้าถึงได้'
    : step === 1
      ? 'ถัดไป: เนื้อหาเอกสาร'
      : step === 2
        ? 'ถัดไป: ตรวจสอบและเผยแพร่'
        : 'เผยแพร่';
  const nextIcon = 'arrow_forward';

  return (
    <>
      <QueuePageShell
        activeKey='consent-new'
        sidebarItems={CONSENT_NAV}
        sidebarFallbackKey='consent-new'
        brandTitle='ระบบจัดการความยินยอม'
        breadcrumb={breadcrumb}
        {...WIZARD_MORPH_SHELL_PROPS}
        headerInfo={(
          <ConsentWizardHeader
            step={step}
            prefill={prefill}
            onStepClick={handleStepClick}
          />
        )}
      >
        <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)', paddingBottom: 96 }}>
          {step === 0 && (
            <StepBasics
              template={template} setTemplate={setTemplate} applyTemplate={applyTemplate}
              cover={cover} setCover={setCover}
              name={name} setName={setName} code={code} setCode={setCode}
              type={type} setType={setType} version={version} setVersion={setVersion} ttl={ttl} setTtl={setTtl}
              showCodeSuggestions={!prefill?.code}
              showVersionSuggestions={!prefill?.code && !prefill?.fromVersion}
              versionReadOnly={Boolean(prefill?.fromVersion)}
              fromVersion={prefill?.fromVersion}
            />
          )}
          {step === 1 && (
            <StepAccess
              accessScopes={accessScopes} setAccessScopes={setAccessScopes}
              position={position} setPosition={setPosition}
            />
          )}
          {step === 2 && (
            <ErrorBoundary>
            <StepContent
              patientFields={patientFields}
              setPatientField={setPatientField}
              sections={sections} updateSection={updateSection} removeSection={removeSection}
              reorderSections={reorderSections}
              addSection={() => setSections((p) => [...p, makeSection()])}
              signatures={signatures}
              setSignatureField={setSignatureField}
              note={note} setNote={setNote}
              requireGuardian={requireGuardian} setRequireGuardian={setRequireGuardian}
              allowESign={allowESign} setAllowESign={setAllowESign}
            />
            </ErrorBoundary>
          )}
          {step === 3 && (
            <ErrorBoundary>
              <StepReview
                name={name} code={code} type={type} version={version} ttl={ttl}
                docTitle={docTitle} sections={sections} patientFields={patientFields} allowESign={allowESign}
                note={note}
                fromVersion={prefill?.fromVersion}
                versionDiff={versionDiff}
                consentImpact={consentImpact}
              />
            </ErrorBoundary>
          )}
        </div>

        {/* Sticky wizard action bar (Figma footer 350:130686) */}
        <div
          className={`sticky bottom-0 z-10 flex items-center w-full ${MIH_CHROME_MORPH_FOOTER}`}
          style={{
            background: 'var(--surface-card-100)',
            borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            boxShadow: '0 -2px 8px rgba(8,167,104,0.06)',
            padding: 'var(--dim-space-400) var(--dim-space-600)',
            gap: 'var(--dim-space-600)',
          }}
        >
          {step > 0 ? (
            <NeutralSubdueButton
              size='lg'
              leadingIcon='arrow_back'
              onClick={() => { setStep(step - 1); window.scrollTo?.({ top: 0 }); }}
              className='shrink-0'
            >
              ย้อนกลับ
            </NeutralSubdueButton>
          ) : (
            <NeutralSubdueButton size='lg' onClick={() => setConfirmCancel(true)} className='shrink-0'>
              ยกเลิก
            </NeutralSubdueButton>
          )}
          <div className='flex items-center min-w-0 flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            {showSaveBadge ? (
              <ColorfulBadge style='green' size='small' hierarchy='secondary' icon='check_circle' showIcon width='hug'>
                บันทึกร่างแล้ว
              </ColorfulBadge>
            ) : (
              <span style={{ width: 8, height: 8, borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-positive-secondary, #A2EDDE)' }} />
            )}
            <span className='truncate' style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
              {`ร่างแบบฟอร์ม (บันทึกล่าสุด: ${lastSavedLabel})`}
            </span>
          </div>
          <div className='flex-1' />
          <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-300)' }}>
            {step > 0 && (
              <NeutralSubdueButton size='lg' onClick={() => setConfirmCancel(true)}>
                ยกเลิก
              </NeutralSubdueButton>
            )}
            <BrandSubdueButton variant='outline' size='lg' leadingIcon='save' disabled={!canSaveDraft} onClick={handleSaveDraft}>บันทึกร่าง</BrandSubdueButton>
            <BrandButton variant='fill' size='lg' trailingIcon={nextIcon} disabled={!canAdvance} onClick={goNext}>
              {nextLabel}
            </BrandButton>
          </div>
        </div>
      </QueuePageShell>

      <ConsentFormCancelEditPopup
        open={confirmCancel}
        title='ยกเลิกการสร้างแบบฟอร์ม?'
        description='ข้อมูลที่ยังไม่ได้บันทึกจะหายไป ต้องการออกจากหน้านี้หรือไม่'
        confirmLabel='ออกจากหน้านี้'
        cancelLabel='ทำต่อ'
        onConfirm={() => { setConfirmCancel(false); history.push('/consent'); }}
        onClose={() => setConfirmCancel(false)}
      />

      {/* ด.1.1.5 — ยืนยันเวอร์ชันใหม่ก่อนเผยแพร่ */}
      <AlertDialog
        open={confirmPublish}
        type='info'
        title='ยืนยันเผยแพร่เวอร์ชันใหม่'
        description={
          prefill?.fromVersion
            ? `แบบฟอร์ม ${code || prefill.code} จะเผยแพร่เป็นเวอร์ชันใหม่แทน ${prefill.fromVersion} — ตรวจสอบเลขเวอร์ชันก่อนยืนยัน`
            : 'ตรวจสอบเลขเวอร์ชันก่อนเผยแพร่'
        }
        confirmLabel='เผยแพร่เวอร์ชันนี้'
        cancelLabel='ยกเลิก'
        onConfirm={() => doPublish(publishVersion.trim())}
        onCancel={() => setConfirmPublish(false)}
        onClose={() => setConfirmPublish(false)}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)', marginTop: 'var(--dim-space-300)' }}>
          <InputField
            label='เวอร์ชั่นใหม่'
            required
            value={publishVersion}
            onChange={setPublishVersion}
            placeholder='V 2.0'
            helperText={prefill?.fromVersion ? `เวอร์ชันเดิม: ${prefill.fromVersion}` : undefined}
          />
        </div>
      </AlertDialog>

      {published && (
        <SuccessScreen
          title='คุณสร้างแบบฟอร์มใหม่สำเร็จ'
          buttonLabel='แบบฟอร์มความยินยอมทั้งหมด'
          lottieSize={256}
          onDone={() => { setPublished(false); history.push('/consent/forms'); }}
        />
      )}

      <PhcisTopToast session={saveToast} onDismiss={() => setSaveToast(null)} />
    </>
  );
}

/* ── Step 1 · ข้อมูลพื้นฐาน ───────────────────────────────────────────── */
function StepBasics(props) {
  const {
    template, setTemplate, applyTemplate, cover, setCover,
    name, setName, code, setCode, type, setType, version, setVersion, ttl, setTtl,
    showCodeSuggestions = true,
    showVersionSuggestions = true,
    codeReadOnly = false,
    versionReadOnly = false,
    versionHelperText,
    fromVersion,
    showTemplatePicker = true,
    templateCardStyle,
    coverCardStyle,
    basicsCardStyle,
  } = props;
  const [customCover, setCustomCover] = useState(null);
  const handleCoverFile = (file) => {
    setCustomCover((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    setCover('custom');
  };
  const scrollSelectIntoView = (node) =>
    node && node.scrollIntoView({ block: 'center', behavior: 'smooth' });

  const codeSuggestions = useMemo(() => {
    if (!showCodeSuggestions || codeReadOnly) return [];
    return getConsentFormCodeSuggestions({ query: code }).filter((s) => s.code !== code.trim());
  }, [code, showCodeSuggestions, codeReadOnly]);

  const versionSuggestions = useMemo(() => {
    if (!showVersionSuggestions || versionReadOnly) return [];
    return getConsentFormVersionSuggestions({ query: version, code })
      .filter((s) => s.version !== version.trim());
  }, [version, code, showVersionSuggestions, versionReadOnly]);

  const resolvedVersionHelperText = versionHelperText
    ?? (versionReadOnly && fromVersion ? `เวอร์ชันเดิม: ${fromVersion}` : undefined);

  return (
    <>
      {showTemplatePicker ? (
        <SectionCard style={templateCardStyle}>
          <CardHeading title='เลือกแม่แบบ' subtext='เป็นแม่แบบเบื้องต้น ซึ่งสามารถแก้ไขได้ภายหลัง' badge={`${TEMPLATES.length} แม่แบบ`} />
          <CardCarousel showArrows={false}>
            {TEMPLATES.map((t) => (
              <TemplateCard key={t.key} tpl={t} selected={template === t.key} onClick={() => applyTemplate(t.key)} style={{ flex: CARD_BASIS }} />
            ))}
          </CardCarousel>
        </SectionCard>
      ) : null}

      <SectionCard style={coverCardStyle}>
        <CardHeading title='เลือกหน้าปกแบบฟอร์ม' subtext='เป็นแม่แบบเบื้องต้น ซึ่งสามารถแก้ไขได้ภายหลัง' badge={`${COVERS.length} หน้าปก`} />
        <CardCarousel>
          <UploadDropzone key='upload' onFile={handleCoverFile} style={{ flex: CARD_BASIS }} />
          {customCover && (
            <CoverCard
              key='custom'
              cover={{ key: 'custom', label: 'รูปที่อัปโหลด', image: customCover }}
              selected={cover === 'custom'}
              onClick={() => setCover('custom')}
              style={{ flex: CARD_BASIS }}
            />
          )}
          {COVERS.map((c, i) => (
            <CoverCard key={c.key} cover={c} selected={cover === i} onClick={() => setCover(i)} style={{ flex: CARD_BASIS }} />
          ))}
        </CardCarousel>
      </SectionCard>

      <SectionCard style={{ gap: 'var(--dim-space-400)', ...basicsCardStyle }}>
        <ColumnHeading>ข้อมูลพื้นฐาน</ColumnHeading>
        <div
          className='grid w-full min-w-0'
          style={{
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            columnGap: 'var(--dim-space-1200, 48px)',
            rowGap: 'var(--dim-space-800, 32px)',
          }}
        >
          <div
            className='flex flex-col min-w-0'
            style={{ gap: 'var(--dim-space-200, 8px)' }}
          >
            <SuggestibleTextarea
              voice label='ชื่อแบบฟอร์ม Consent' required
              value={name} onChange={(v) => setName(typeof v === 'string' ? v : v?.target?.value ?? '')}
              placeholder='พิมพ์หรือกดปุ่มไมโครโฟนเพื่อพูด...'
              suggestions={CONSENT_FORM_NAME_SUGGESTIONS}
              minChars={3}
              height={120}
              popoverAriaLabel='ชื่อแบบฟอร์มที่แนะนำ'
            />
            <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
              เช่น ใบยินยอมเปิดเผยข้อมูลสุขภาพ (PDPA)
            </span>
          </div>
          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <InputField
              label='รหัสแบบฟอร์ม Consent'
              required
              value={code}
              onChange={setCode}
              placeholder='เช่น PH-001'
              readOnly={codeReadOnly}
              disabled={codeReadOnly}
              showHelperText={false}
            />
            {showCodeSuggestions && !codeReadOnly && (
              <div style={SUGGESTION_ROW_SLOT}>
                {codeSuggestions.length > 0 && (
                  <InlineSuggestionChips
                    items={codeSuggestions}
                    value={code}
                    onSelect={setCode}
                    getKey={(s) => s.code}
                    getLabel={(s) => s.code}
                  />
                )}
              </div>
            )}
          </div>
          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {fromVersion && version ? (
              <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>
                {`เปลี่ยนเวอร์ชัน ${fromVersion} → ${version}`}
              </ColorfulBadge>
            ) : null}
            <InputField
              label='เวอร์ชั่น'
              required
              value={version}
              onChange={setVersion}
              placeholder='V 1.2'
              readOnly={versionReadOnly}
              disabled={versionReadOnly}
              helperText={resolvedVersionHelperText}
              showHelperText={Boolean(resolvedVersionHelperText)}
            />
            {showVersionSuggestions && !versionReadOnly && (
              <div style={SUGGESTION_ROW_SLOT}>
                {versionSuggestions.length > 0 && (
                  <InlineSuggestionChips
                    items={versionSuggestions}
                    value={version}
                    onSelect={setVersion}
                    getKey={(s) => s.version}
                    getLabel={(s) => s.version}
                  />
                )}
              </div>
            )}
          </div>
          <Select label='อายุการใช้งาน (วัน)' required options={TTL_OPTIONS} value={ttl} onChange={setTtl} placeholder='เลือกจำนวนวัน' searchable={false} onOpen={scrollSelectIntoView} />
        </div>
      </SectionCard>
    </>
  );
}

/* ── Step 2 · ผู้ที่มีสิทธิเข้าถึงได้ ─────────────────────────────────────── */
function StepAccess({ accessScopes, setAccessScopes, position, setPosition, positionCardStyle, scopeCardStyle }) {
  const selectedScopeKeys = useMemo(
    () => new Set(accessScopes.map(consentScopeKey)),
    [accessScopes],
  );

  const handleScopeToggle = (scope) => {
    const key = consentScopeKey(scope);
    setAccessScopes((prev) => {
      if (prev.some((s) => consentScopeKey(s) === key)) {
        return prev.filter((s) => consentScopeKey(s) !== key);
      }
      return [...prev, scope];
    });
  };

  const handleScopeToggleMany = (scopes, select) => {
    setAccessScopes((prev) => {
      if (select) {
        const prevKeys = new Set(prev.map(consentScopeKey));
        const toAdd = scopes.filter((s) => !prevKeys.has(consentScopeKey(s)));
        return toAdd.length ? [...prev, ...toAdd] : prev;
      }
      const removeKeys = new Set(scopes.map(consentScopeKey));
      return prev.filter((s) => !removeKeys.has(consentScopeKey(s)));
    });
  };

  return (
    <>
      <FormPositionAccessEditor
        value={position}
        onChange={setPosition}
        columns={2}
        style={positionCardStyle}
      />

      <FormScopeAccessEditor
        catalog={CONSENT_FORM_SCOPE_CATALOG}
        selectedKeys={selectedScopeKeys}
        onToggle={handleScopeToggle}
        onToggleMany={handleScopeToggleMany}
        columns={2}
        style={scopeCardStyle}
      />
    </>
  );
}

/* ── Step 3 · เนื้อหาเอกสาร ───────────────────────────────────────────── */
/* Close (x) icon button — Figma "x button / info" (104:5369). 32×32 neutral
   close glyph; transparent at rest, hover fills with neutral-tertiary (#F4F5F5). */
const CardXButton = ({ onClick, disabled, label }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className='inline-flex items-center justify-center shrink-0'
      style={{
        width: 'var(--dim-size-600, 32px)', height: 'var(--dim-size-600, 32px)',
        borderRadius: 'var(--dim-radius-200)',
        background: hover && !disabled ? 'var(--surface-neutral-tertiary, #F4F5F5)' : 'transparent',
        border: 'none', outline: 'none',
        color: 'var(--text-content-tertiary, #858C92)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background-color 120ms ease',
      }}
    >
      <Icon name='close' size={16} />
    </button>
  );
};

const SectionDropIndicator = ({ active }) => (
  <div
    aria-hidden
    style={{
      height: active ? 4 : 0,
      borderRadius: 'var(--dim-radius-full)',
      background: active ? 'var(--icon-brandPrimary-quaternary, #91DFBB)' : 'transparent',
      transition: 'height 120ms ease',
      margin: active ? 'var(--dim-space-100, 4px) 0' : 0,
      flexShrink: 0,
    }}
  />
);

function StepContent(props) {
  const {
    patientFields, setPatientField,
    sections, updateSection, removeSection, reorderSections, addSection,
    signatures, setSignatureField, note, setNote,
    requireGuardian, setRequireGuardian, allowESign, setAllowESign,
    patientCardStyle,
    notesCardStyle,
  } = props;
  /* Drag-to-reorder consent clauses (HTML5 DnD). A card becomes draggable only
     while its grab handle is held, so typing/selecting inside the fields is
     never hijacked by a drag. */
  const [dragIdx, setDragIdx] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [grabIdx, setGrabIdx] = useState(null);
  const resetDrag = () => { setDragIdx(null); setDropIndex(null); setGrabIdx(null); };
  const dropAt = (insertAt) => {
    if (dragIdx == null || insertAt == null) return;
    let to = insertAt;
    if (dragIdx < to) to -= 1;
    if (dragIdx !== to) reorderSections(dragIdx, to);
    resetDrag();
  };
  const handleDragOverCard = (e, i) => {
    if (dragIdx == null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    const next = e.clientY < mid ? i : i + 1;
    if (dropIndex !== next) setDropIndex(next);
  };
  return (
    <>
      <SectionCard style={patientCardStyle}>
        <ColumnHeading>ข้อมูลผู้ป่วย</ColumnHeading>
        <ConsentFieldCheckboxGroup
          fields={PATIENT_FIELDS}
          value={patientFields}
          onSetField={setPatientField}
          fallback={DEFAULT_PATIENT_FIELD_KEYS}
        />
      </SectionCard>

      <SectionCard>
        <ColumnHeading>ข้อความยินยอม</ColumnHeading>
        <div
          className='flex flex-col'
          style={{ gap: 'var(--dim-space-300)' }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setDropIndex(null);
          }}
        >
          <SectionDropIndicator active={dragIdx != null && dropIndex === 0} />
          {sections.map((s, i) => (
            <React.Fragment key={s.id}>
              <div
                draggable={grabIdx === i}
                onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(i)); } catch (_) { /* noop */ } }}
                onDragOver={(e) => handleDragOverCard(e, i)}
                onDrop={(e) => { e.preventDefault(); dropAt(dropIndex); }}
                onDragEnd={resetDrag}
                className='flex flex-col'
                style={{
                  gap: 'var(--dim-space-800, 32px)',
                  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                  borderRadius: 'var(--dim-radius-400)',
                  padding: 'var(--dim-space-400)',
                  background: 'var(--surface-neutral-quaternary, #F9FBFB)',
                  opacity: dragIdx === i ? 0.45 : 1,
                  transition: 'opacity 120ms ease',
                }}
              >
              <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <span
                  onMouseDown={() => setGrabIdx(i)}
                  onMouseUp={() => setGrabIdx(null)}
                  title='ลากเพื่อจัดลำดับ'
                  style={{ color: 'var(--text-content-tertiary)', cursor: 'grab', lineHeight: 0, touchAction: 'none' }}
                >
                  <Icon name='drag_indicator' size={18} />
                </span>
                <span
                  className='inline-flex items-center justify-center'
                  style={{
                    width: 24, height: 24, borderRadius: 'var(--dim-radius-full)',
                    background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-brandPrimary-default)',
                    fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm)',
                  }}
                >
                  {i + 1}
                </span>
                <div className='flex-1' />
                <CardXButton label='ลบข้อความ' onClick={() => removeSection(s.id)} disabled={sections.length <= 1} />
              </div>
              <div
                className='grid w-full min-w-0'
                style={{
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  columnGap: 'var(--dim-space-1200, 48px)',
                  rowGap: 'var(--dim-space-800, 32px)',
                }}
              >
                <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-800, 32px)' }}>
                  <InputField label='หัวข้อ' required value={s.title} onChange={(v) => updateSection(s.id, { title: v })} placeholder='เช่น ยินยอมรับการรักษา' />
                  <SuggestibleTextarea
                    voice label='รายละเอียด' required
                    value={s.detail} onChange={(v) => updateSection(s.id, { detail: typeof v === 'string' ? v : v?.target?.value ?? '' })}
                    placeholder='พิมพ์หรือกดปุ่มไมโครโฟนเพื่อพูด...'
                    suggestions={DETAIL_HINTS} minChars={3} height={120}
                  />
                </div>
                <div className='flex flex-col min-w-0'>
                  {/* ด.1.1.13 — consent forms lock field type to boolean */}
                  <Select
                    label='รูปแบบคำตอบของข้อนี้ (Field Type)'
                    options={FIELD_TYPE_OPTIONS}
                    value={s.fieldType || 'boolean'}
                    onChange={(v) => updateSection(s.id, { fieldType: v })}
                    searchable={false}
                    disabled
                  />
                </div>
              </div>
              </div>
              <SectionDropIndicator active={dragIdx != null && dropIndex === i + 1} />
            </React.Fragment>
          ))}
          <BrandDashedAddButton icon='add' onClick={addSection}>เพิ่มข้อความ</BrandDashedAddButton>
        </div>
      </SectionCard>

      <SectionCard>
        <ColumnHeading>ลายมือชื่อ</ColumnHeading>
        <ConsentFieldCheckboxGroup
          fields={SIGNATURE_FIELDS}
          value={signatures}
          onSetField={setSignatureField}
          fallback={DEFAULT_SIGNATURE_KEYS}
        />
      </SectionCard>

      <SectionCard style={notesCardStyle}>
        <ColumnHeading>หมายเหตุพิเศษ และการตั้งค่าเพิ่มเติม</ColumnHeading>
        <SuggestibleTextarea
          voice label='ข้อความท้ายเอกสาร'
          value={note} onChange={(v) => setNote(typeof v === 'string' ? v : v?.target?.value ?? '')}
          placeholder='พิมพ์หรือกดปุ่มไมโครโฟนเพื่อพูด...'
          suggestions={DETAIL_HINTS} minChars={3} height={120}
        />
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-400) var(--dim-space-600)' }}>
          <Checkbox checked={requireGuardian} onChange={(checked) => setRequireGuardian(Boolean(checked))} label='สำหรับผู้ป่วย / จำเป็นต้องกรอกผู้ปกครอง' />
          <Checkbox checked={allowESign} onChange={(checked) => setAllowESign(Boolean(checked))} label='อนุญาตให้ใช้ e-Signature' />
        </div>
      </SectionCard>
    </>
  );
}

/* ── Step 4 · ตรวจสอบและเผยแพร่ (Figma 355:140557) ────────────────────────
   Two columns: a full document preview (patient-info fields, numbered consent
   clauses with ยินยอม/ไม่ยินยอม buttons, signature) on the left, and a live
   "Patient View" phone mock-up on the right. */
const PATIENT_SAMPLE = {
  name:    'เช่น นายสมชาย ใจดี',
  hn:      'เช่น 66-000123',
  doctor:  'เช่น พญ.วราภรณ์ สุขใจ',
  birth:   'เช่น 12/05/2530',
  citizen: 'เช่น 1-2345-67890-12-3',
  contact: 'เช่น 08x-xxx-xxxx',
};

/** Figma 295:41105 — ปุ่มเลือก ยินยอม / ไม่ยินยอม ใต้แต่ละข้อ (preview = inert). */
const consentRadioStyle = {
  minHeight: 40,
  height: 40,
  paddingTop: 'var(--dim-space-200)',
  paddingBottom: 'var(--dim-space-200)',
  paddingLeft: 'var(--dim-space-400)',
  paddingRight: 'var(--dim-space-400)',
  pointerEvents: 'none',
};

const ConsentChoiceRadios = ({ value = '', name, compact }) => {
  const iconSize = compact ? 14 : 16;
  return (
  <div
    className='flex flex-wrap items-center'
    style={{
      gap: compact ? 'var(--dim-space-150)' : 'var(--dim-space-200)',
      paddingTop: compact ? 'var(--dim-space-100)' : 'var(--dim-space-150)',
    }}
    role='radiogroup'
    aria-label={name}
    aria-disabled
  >
    <RadioButton
      name={name}
      value='yes'
      title='ยินยอม'
      checked={value === 'yes'}
      onChange={() => {}}
      border
      showRadio={false}
      showCircleIcon={false}
      showIcon
      icon={<Icon name='check' size={iconSize} color='var(--text-brandPrimary-default)' />}
      showDescription={false}
      showBadge={false}
      showBadgeTitle={false}
      style={{
        ...consentRadioStyle,
        ...(compact ? { minHeight: 32, height: 32, paddingLeft: 'var(--dim-space-300)', paddingRight: 'var(--dim-space-300)', fontSize: 11 } : {}),
      }}
    />
    <RadioButton
      name={name}
      value='no'
      title='ไม่ยินยอม'
      checked={value === 'no'}
      onChange={() => {}}
      border
      showRadio={false}
      showCircleIcon={false}
      showIcon
      icon={<Icon name='close' size={iconSize} color='var(--text-danger-default, #DC2626)' />}
      showDescription={false}
      showBadge={false}
      showBadgeTitle={false}
      style={{
        ...consentRadioStyle,
        ...(compact ? { minHeight: 32, height: 32, paddingLeft: 'var(--dim-space-300)', paddingRight: 'var(--dim-space-300)', fontSize: 11 } : {}),
      }}
    />
  </div>
  );
};

export function StepReview({
  name, code, type, version, ttl, docTitle, sections, patientFields, allowESign, note, reviewStepStyle,
  versionDiff, fromVersion, consentImpact, stackLayout = false,
}) {
  const typeLabel = useMemo(() => (TYPE_OPTIONS.find((o) => o.value === type) || {}).label || 'เอกสารความยินยอม', [type]);
  const ttlDays = (TTL_OPTIONS.find((o) => o.value === ttl) || {}).label;
  const noteText = note ?? `เอกสารนี้มีอายุ ${ttlDays || '—'} นับจากวันที่ลงนาม`;
  const title = docTitle || name || 'ใบยินยอมรับการรักษาทั่วไป';
  const filledSections = (sections || []).filter(
    (s) => s && ((String(s.title ?? '').trim()) || (String(s.detail ?? '').trim())),
  );
  const patientPreview = PATIENT_FIELDS.filter((f) => fieldSetHas(patientFields, f.key, DEFAULT_PATIENT_FIELD_KEYS));
  const previewLimit = stackLayout ? 8 : (filledSections.length > 15 ? 12 : filledSections.length);
  const previewSections = filledSections.slice(0, previewLimit);
  const hiddenPreviewCount = Math.max(0, filledSections.length - previewSections.length);
  const displayNote = stackLayout ? truncatePreviewText(noteText, 400) : noteText;

  const Divider = () => (
    <div style={{ height: 'var(--dim-stroke-100)', background: 'var(--border-brandPrimary-quaternary)' }} />
  );

  const Clause = ({ index, title: ct, detail, compact, clauseId, lite }) => (
    <div className='flex flex-col min-w-0'>
      <div className='flex flex-col' style={{ gap: compact ? 'var(--dim-space-100)' : 'var(--dim-space-100)' }}>
        <span style={{ color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: compact ? 11 : 'var(--type-size-sm)', lineHeight: 1.4 }}>
          ข้อที่ {index} · {ct || '(ไม่มีหัวข้อ)'}
        </span>
        {detail ? (
          <span
            className={compact || lite ? 'line-clamp-3' : undefined}
            style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: compact ? 10 : 'var(--type-size-sm)', lineHeight: compact ? 1.5 : 1.6 }}
          >
            {lite ? truncatePreviewText(detail) : truncatePreviewText(detail, 480) || detail}
          </span>
        ) : null}
      </div>
      {!lite ? <ConsentChoiceRadios name={`clause-${clauseId || index}`} compact={compact} /> : null}
    </div>
  );

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-600)', ...reviewStepStyle }}>
      {(fromVersion || versionDiff?.hasChanges || consentImpact?.signedCount) ? (
        <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
          <ConsentFormVersionDiffPanel
            diff={versionDiff}
            fromVersion={fromVersion}
            toVersion={version}
          />
          <ConsentSupersedeImpactPanel impact={consentImpact} />
        </div>
      ) : null}
    <div
      className={`flex w-full min-w-0 ${stackLayout ? 'flex-col' : 'items-start'}`}
      style={{ gap: 'var(--dim-space-600)' }}
    >
      {/* ── Left — full document preview ── */}
      <SectionCard style={stackLayout ? { width: '100%' } : { flex: 1.4 }}>
        <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <span
            className='inline-flex items-center justify-center shrink-0'
            style={{ width: 'var(--dim-size-900, 44px)', height: 'var(--dim-size-900, 44px)', borderRadius: 'var(--dim-radius-200)', background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-brandPrimary-default)' }}
          >
            <Icon name='description' size={24} />
          </span>
          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
            <h2 style={{ color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-regular, 400)', lineHeight: 1.3 }}>{title}</h2>
            <span style={{ color: 'var(--text-content-quaternary, #ADB2B7)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
              {typeLabel} · {code || 'PH-001'} · {version || 'V1.0'}
            </span>
          </div>
        </div>

        <Divider />

        <ColumnHeading>ข้อมูลผู้ป่วย</ColumnHeading>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          {patientPreview.length === 0 ? (
            <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>ยังไม่ได้เลือกข้อมูลผู้ป่วย</span>
          ) : patientPreview.map((f) => (
            /* Preview field — looks like a normal (default) input but is fully
               inert: readOnly + tabIndex -1 + pointer-events none, so it can be
               neither typed into nor focused/clicked. */
            <div key={f.key} style={{ pointerEvents: 'none' }}>
              <InputField label={f.label} required readOnly tabIndex={-1} aria-readonly='true' placeholder={PATIENT_SAMPLE[f.key] || `ระบุ${f.label}`} />
            </div>
          ))}
        </div>

        <Divider />

        <ColumnHeading>ข้อความยินยอม</ColumnHeading>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-600)' }}>
          {filledSections.length === 0 ? (
            <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>ยังไม่มีข้อความยินยอม</span>
          ) : previewSections.map((s, i) => (
            <Clause key={s.id || `clause-${i}`} index={i + 1} title={s.title} detail={s.detail} clauseId={s.id} lite={stackLayout} />
          ))}
          {hiddenPreviewCount > 0 ? (
            <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
              {`… และอีก ${hiddenPreviewCount} ข้อ (แสดงตัวอย่าง ${previewSections.length} ข้อแรก)`}
            </span>
          ) : null}
        </div>

        <Divider />

        <ColumnHeading>ลายมือชื่อ</ColumnHeading>
        {/* Signature capture box — Figma "Signature / Default" (272:46900):
            formbuilder dashed box, edit glyph + "เซ็นชื่อในกล่องนี้". */}
        <div
          className='flex flex-col items-center justify-center w-full'
          style={{
            minHeight: 96,
            border: 'var(--dim-stroke-150) dashed var(--border-formbuilder-default, #C5EDDA)',
            background: 'var(--surface-formbuilder-default, #F4FBF8)',
            borderRadius: 'var(--dim-radius-200)',
            gap: 'var(--dim-space-200)',
            padding: 'var(--dim-space-600)',
            color: 'var(--text-formbuilder-subtext, #858C92)',
          }}
        >
          <Icon name='edit' size={20} />
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>เซ็นชื่อในกล่องนี้</span>
        </div>
        {allowESign && (
          <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-150)' }}>
            <Icon name='check_circle' size={16} color='var(--text-brandPrimary-default)' />
            <span style={{ color: 'var(--text-content-default, #363B3F)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
              อนุญาต e-Signature
            </span>
          </div>
        )}
        {/* Note box — Figma 355:139568. */}
        <div
          className='flex flex-col w-full'
          style={{
            background: 'var(--surface-card-200, #FDFDFD)',
            border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
            borderRadius: 'var(--dim-radius-400)',
            padding: 'var(--dim-space-400)',
            gap: 'var(--dim-space-100)',
            color: 'var(--text-content-secondary)',
          }}
        >
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>หมายเหตุ</span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.5 }}>
            {displayNote}
          </span>
        </div>
      </SectionCard>

      {!stackLayout ? (
      /* ── Right — live patient-view phone ── */
      <SectionCard style={{ flex: 1, alignItems: 'center', gap: 'var(--dim-space-400)' }}>
        <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={{ color: 'var(--text-topic-tertiary-title)', fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)' }}>
            ตัวอย่างเอกสาร (Patient View)
          </span>
          <div className='flex-1' />
          <span
            className='inline-flex items-center'
            style={{ gap: 'var(--dim-space-100)', padding: '2px var(--dim-space-200)', borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-statussummarycard-positive, #D1F6EE)', color: 'var(--text-statussummarycard-positive-number, #196C65)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 'var(--dim-radius-full)', background: 'currentColor' }} />
            Live
          </span>
        </div>

        {/* phone frame */}
        <div style={{ width: 300, borderRadius: 44, background: '#1D1D1F', padding: 10, boxShadow: '0 20px 48px rgba(8,167,104,0.14)' }}>
          <div style={{ position: 'relative', background: 'var(--surface-card-100)', borderRadius: 34, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 580 }}>
            {/* dynamic island */}
            <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 96, height: 24, borderRadius: 'var(--dim-radius-full)', background: '#1D1D1F', zIndex: 2 }} />
            {/* app bar */}
            <div
              className='flex items-center shrink-0'
              style={{ gap: 'var(--dim-space-200)', padding: '40px var(--dim-space-400) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)' }}
            >
              <Icon name='arrow_back_ios_new' size={16} color='var(--text-content-secondary)' />
              <span style={{ flex: 1, textAlign: 'center', color: 'var(--text-content-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm)' }}>ใบยินยอม</span>
              <span style={{ width: 16 }} />
            </div>
            {/* scrollable doc */}
            <div className='flex flex-col scrollbar-thin' style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--dim-space-400)', gap: 'var(--dim-space-400)' }}>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)', padding: 'var(--dim-space-300)', borderRadius: 'var(--dim-radius-200)', background: 'var(--surface-brandPrimary-quaternary)' }}>
                <span style={{ color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm)', lineHeight: 1.4 }}>{title}</span>
                <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 11 }}>{code || 'PH-001'} · {version || 'V1.0'}</span>
              </div>
              {filledSections.length === 0 ? (
                <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 11 }}>ยังไม่มีข้อความยินยอม</span>
              ) : filledSections.slice(0, 6).map((s, i) => (
                <Clause key={s.id} index={i + 1} title={s.title} detail={s.detail} compact clauseId={s.id} />
              ))}
            </div>
            {/* sticky confirm */}
            <div className='shrink-0' style={{ padding: 'var(--dim-space-300) var(--dim-space-400)', borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)' }}>
              <BrandButton variant='fill' size='md' style={{ width: '100%' }}>ยืนยันการยินยอม</BrandButton>
            </div>
          </div>
        </div>
        <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', textAlign: 'center' }}>
          มุมมองที่ผู้ป่วยจะเห็นบนอุปกรณ์มือถือ
        </span>
      </SectionCard>
      ) : null}
    </div>
    </div>
  );
}

/* ── Edit / new-version wizard as Popup (แบบฟอร์มความยินยอม → แก้ไข) ── */
export function ConsentFormEditPopup({ open, record, newVersion = false, onClose, onPublished }) {
  const prefill = useMemo(
    () => (record ? buildWizardPrefillFromRecord(record, { newVersion }) : null),
    [record, newVersion],
  );

  const [step, setStep] = useState(0);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [publishVersion, setPublishVersion] = useState('');

  const [template, setTemplate] = useState('blank');
  const [cover, setCover] = useState(0);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('data');
  const [version, setVersion] = useState('');
  const [ttl, setTtl] = useState('');
  const [accessScopes, setAccessScopes] = useState([]);
  const [position, setPosition] = useState([]);

  const [docTitle, setDocTitle] = useState('');
  const [patientFields, setPatientFields] = useState(() => [...DEFAULT_PATIENT_FIELD_KEYS]);
  const [sections, setSections] = useState(() => [makeSection(), makeSection()]);
  const [signatures, setSignatures] = useState(() => [...DEFAULT_SIGNATURE_KEYS]);
  const [note, setNote] = useState('');
  const [requireGuardian, setRequireGuardian] = useState(false);
  const [allowESign, setAllowESign] = useState(true);
  const [baselineSnapshot, setBaselineSnapshot] = useState(null);

  /* Reset + prefill whenever popup opens for a record */
  useEffect(() => {
    if (!open || !prefill) return;
    setStep(0);
    setConfirmCancel(false);
    setConfirmPublish(false);
    setConfirmSave(false);
    setPublishVersion('');
    if (prefill.name) { setName(prefill.name); setDocTitle(prefill.docTitle || prefill.name); }
    if (prefill.code) setCode(prefill.code);
    if (prefill.type) setType(prefill.type);
    else if (prefill.typeLabel && TYPE_THAI_TO_VALUE[prefill.typeLabel]) setType(TYPE_THAI_TO_VALUE[prefill.typeLabel]);
    if (prefill.version) setVersion(prefill.version);
    if (prefill.ttl) setTtl(prefill.ttl);
    else setTtl((prev) => prev || '30');
    if (prefill.template) setTemplate(prefill.template);
    if (prefill.cover != null) setCover(prefill.cover);
    if (prefill.accessScopes?.length) {
      setAccessScopes(stripConsentScopes(prefill.accessScopes));
      setPosition(
        prefill.position?.length
          ? prefill.position
          : extractPositionsFromScopes(prefill.accessScopes),
      );
    }
    setPatientFields(normalizeFieldKeys(prefill.patientFields, DEFAULT_PATIENT_FIELD_KEYS));
    if (prefill.sections?.length) {
      setSections(prefill.sections.map((s, i) => ({
        id: s.id || `cs-edit-${i}`,
        title: s.title || '',
        detail: s.detail || '',
        fieldType: s.fieldType || 'boolean',
      })));
    }
    setSignatures(normalizeFieldKeys(prefill.signatures, DEFAULT_SIGNATURE_KEYS));
    if (prefill.note != null) setNote(prefill.note);
    if (prefill.requireGuardian != null) setRequireGuardian(prefill.requireGuardian);
    if (prefill.allowESign != null) setAllowESign(prefill.allowESign);
    setBaselineSnapshot(consentWizardSnapshot(buildWizardStateFromPrefill(prefill)));
  }, [open, record?.id, newVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyTemplate = (key) => {
    setTemplate(key);
    if (key === 'blank' || !TEMPLATE_PREFILL[key]) {
      setName(''); setType('data'); setVersion(''); setTtl('');
      setDocTitle(''); setRequireGuardian(false);
      setSections([makeSection(), makeSection()]);
      setCover(0);
      return;
    }
    const p = TEMPLATE_PREFILL[key];
    setName(p.name);
    setType('data');
    setVersion('');
    setTtl(p.ttl);
    setCover(p.cover ?? 0);
    setDocTitle(p.name);
    setRequireGuardian(!!p.requireGuardian);
    setSections([...p.leadClauses, ...COMMON_CLAUSES].map((c) => ({ ...makeSection(), ...c })));
  };

  const step1Valid = name.trim() && code.trim() && type && version.trim() && ttl;
  const step2Valid = accessScopes.length > 0 && position.length;
  const step3Valid = sections.some(sectionHasContent);
  const completedSteps = [Boolean(step1Valid), Boolean(step2Valid), Boolean(step3Valid), false];
  const canAdvance = step === 0 ? step1Valid : step === 1 ? step2Valid : step === 2 ? step3Valid : true;
  const handleStepClick = useCallback(
    (idx) => { if (canNavigateToStep(idx, step, completedSteps)) setStep(idx); },
    [step, step1Valid, step2Valid, step3Valid],
  );

  const wizardReviewState = useMemo(() => ({
    template,
    cover,
    name,
    code,
    type,
    version,
    ttl,
    accessScopes,
    position,
    docTitle,
    patientFields,
    sections,
    signatures,
    note,
    requireGuardian,
    allowESign,
  }), [
    template, cover, name, code, type, version, ttl, accessScopes, position, docTitle,
    patientFields, sections, signatures, note, requireGuardian, allowESign,
  ]);

  const hasChanges = useMemo(() => {
    if (!baselineSnapshot || step !== 3) return false;
    return consentWizardSnapshot(wizardReviewState) !== baselineSnapshot;
  }, [baselineSnapshot, wizardReviewState, step]);

  const baselineDraft = useMemo(
    () => (record ? buildWizardDraftFromRecord(record) : null),
    [record],
  );

  const versionDiff = useMemo(() => (
    baselineDraft && step === 3
      ? buildVersionDiffSafe(baselineDraft, wizardReviewState)
      : null
  ), [baselineDraft, wizardReviewState, step]);

  const consentImpact = useMemo(() => (
    prefill?.supersedeType
      ? previewConsentSupersedeImpact(prefill.supersedeType, { newVersion: version.trim() })
      : null
  ), [prefill?.supersedeType, version]);

  const nextEditVersion = useMemo(
    () => resolveNextConsentFormVersion({ mode: 'minor', fromVersion: record?.version || version }),
    [record?.version, version],
  );

  const doPublish = (confirmedVersion) => {
    const publishedVersion = (confirmedVersion || version).trim();
    if (confirmedVersion) setVersion(confirmedVersion);
    if (prefill?.supersedeType) {
      markTypeSuperseded(prefill.supersedeType, { newVersion: publishedVersion });
    }
    setConfirmPublish(false);
    setConfirmSave(false);
    onPublished?.({ name, code, version: publishedVersion, newVersion });
    onClose?.();
  };

  const goNext = () => {
    if (step < 3) setStep(step + 1);
    else if (prefill?.fromVersion) {
      setPublishVersion(version.trim());
      setConfirmPublish(true);
    } else if (!newVersion) {
      setConfirmSave(true);
    } else {
      doPublish();
    }
  };

  const updateSection = (id, patch) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSection = (id) =>
    setSections((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  const reorderSections = (from, to) =>
    setSections((prev) => {
      if (from == null || to == null || from === to || from < 0 || to < 0) return prev;
      if (from >= prev.length || to > prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      next.splice(to, 0, moved);
      return next;
    });

  const setPatientField = useCallback(
    (key, checked) => setPatientFields((prev) => setFieldKey(prev, key, checked, DEFAULT_PATIENT_FIELD_KEYS)),
    [],
  );
  const setSignatureField = useCallback(
    (key, checked) => setSignatures((prev) => setFieldKey(prev, key, checked, DEFAULT_SIGNATURE_KEYS)),
    [],
  );

  const nextLabel = step === 0
    ? 'ถัดไป: ผู้ที่มีสิทธิเข้าถึงได้'
    : step === 1
      ? 'ถัดไป: เนื้อหาเอกสาร'
      : step === 2
        ? 'ถัดไป: ตรวจสอบและเผยแพร่'
        : (newVersion ? 'เผยแพร่' : 'บันทึกการเปลี่ยนแปลง');
  const canSubmit = canAdvance && (newVersion || step < 3 || hasChanges);
  const title = newVersion ? 'สร้างเวอร์ชันใหม่' : 'แก้ไขแบบฟอร์มความยินยอม';
  const subtitle = record
    ? `${record.code} · ${record.name}${prefill?.fromVersion ? ` · จาก ${prefill.fromVersion}` : ''}`
    : undefined;

  const requestClose = () => setConfirmCancel(true);
  const morphHostRef = useRef(null);
  useLocalHeaderMorph(morphHostRef, { enabled: open, reactive: false });

  return (
    <>
      <ErrorBoundary compact>
      <Popup
        open={open}
        onClose={requestClose}
        size='extraLarge'
        title={title}
        subtitle={subtitle}
        showCloseButton
        closeOnEscape={false}
        tertiaryAction={{ label: 'ยกเลิก', onClick: requestClose }}
        secondaryAction={step > 0 ? { label: 'ย้อนกลับ', onClick: () => setStep(step - 1) } : undefined}
        primaryAction={{ label: nextLabel, onClick: goNext, disabled: !canSubmit }}
        bodyStyle={{ paddingTop: 0, paddingLeft: 0, paddingRight: 0 }}
      >
        <div
          ref={morphHostRef}
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-400)',
            minHeight: 0,
            [POPUP_MORPH_VAR]: 0,
            [POPUP_MORPH_MOTION_VAR]: 0,
          }}
        >
          <ConsentFormEditPopupSteps
            step={step}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
            fromVersion={prefill?.fromVersion}
            nextVersion={prefill?.version}
          />
          <div
            className='flex flex-col w-full'
            style={{
              gap: 'var(--dim-space-400)',
              paddingLeft: 'clamp(var(--dim-space-300), 4vw, var(--dim-space-600))',
              paddingRight: 'clamp(var(--dim-space-300), 4vw, var(--dim-space-600))',
            }}
          >
            {step === 0 && (
              <StepBasics
                template={template} setTemplate={setTemplate} applyTemplate={applyTemplate}
                cover={cover} setCover={setCover}
                name={name} setName={setName} code={code} setCode={setCode}
                type={type} setType={setType} version={version} setVersion={setVersion} ttl={ttl} setTtl={setTtl}
                showCodeSuggestions={!prefill?.code && newVersion}
                showVersionSuggestions={!prefill?.code && !prefill?.fromVersion}
                codeReadOnly={!newVersion}
                versionReadOnly={!newVersion || Boolean(prefill?.fromVersion)}
                versionHelperText={
                  !newVersion
                    ? 'จะมีการอัปเดตโดยอัตโนมัติหลังบันทึกการแก้ไข'
                    : undefined
                }
                fromVersion={prefill?.fromVersion}
                showTemplatePicker={false}
                coverCardStyle={{ marginTop: 'var(--dim-space-600, 24px)' }}
                basicsCardStyle={{ marginBottom: 'var(--dim-space-600, 24px)' }}
              />
            )}
            {step === 1 && (
              <StepAccess
                accessScopes={accessScopes} setAccessScopes={setAccessScopes}
                position={position} setPosition={setPosition}
                positionCardStyle={{ marginTop: 'var(--dim-space-600, 24px)' }}
                scopeCardStyle={{ marginBottom: 'var(--dim-space-600, 24px)' }}
              />
            )}
            {step === 2 && (
              <ErrorBoundary>
              <StepContent
                patientFields={patientFields}
                setPatientField={setPatientField}
                sections={sections} updateSection={updateSection} removeSection={removeSection}
                reorderSections={reorderSections}
                addSection={() => setSections((p) => [...p, makeSection()])}
                signatures={signatures}
                setSignatureField={setSignatureField}
                note={note} setNote={setNote}
                requireGuardian={requireGuardian} setRequireGuardian={setRequireGuardian}
                allowESign={allowESign} setAllowESign={setAllowESign}
                patientCardStyle={{ marginTop: 'var(--dim-space-600, 24px)' }}
                notesCardStyle={{ marginBottom: 'var(--dim-space-600, 24px)' }}
              />
              </ErrorBoundary>
            )}
            {step === 3 && (
              <ErrorBoundary>
                <StepReview
                  name={name} code={code} type={type} version={version} ttl={ttl}
                  docTitle={docTitle} sections={sections} patientFields={patientFields} allowESign={allowESign}
                  note={note}
                  fromVersion={prefill?.fromVersion}
                  versionDiff={versionDiff}
                  consentImpact={consentImpact}
                  stackLayout
                  reviewStepStyle={{
                    marginTop: 'var(--dim-space-600, 24px)',
                    marginBottom: 'var(--dim-space-600, 24px)',
                  }}
                />
              </ErrorBoundary>
            )}
          </div>
        </div>
      </Popup>

      <ConsentFormCancelEditPopup
        open={confirmCancel}
        onConfirm={() => { setConfirmCancel(false); onClose?.(); }}
        onClose={() => setConfirmCancel(false)}
      />

      <AlertDialog
        open={confirmSave}
        type='info'
        title='ยืนยันบันทึกการเปลี่ยนแปลง'
        confirmLabel='ตกลง'
        cancelLabel='ยกเลิก'
        onConfirm={() => doPublish(nextEditVersion)}
        onCancel={() => setConfirmSave(false)}
        onClose={() => setConfirmSave(false)}
      >
        <ConsentFormSaveConfirmBody
          formCode={code || record?.code}
          fromVersion={record?.version}
          toVersion={nextEditVersion}
        />
      </AlertDialog>

      <AlertDialog
        open={confirmPublish}
        type='info'
        title='ยืนยันเผยแพร่เวอร์ชันใหม่'
        description={
          prefill?.fromVersion
            ? `แบบฟอร์ม ${code || prefill.code} จะเผยแพร่เป็นเวอร์ชันใหม่แทน ${prefill.fromVersion} — ตรวจสอบเลขเวอร์ชันก่อนยืนยัน`
            : 'ตรวจสอบเลขเวอร์ชันก่อนเผยแพร่'
        }
        confirmLabel='เผยแพร่เวอร์ชันนี้'
        cancelLabel='ยกเลิก'
        onConfirm={() => doPublish(publishVersion.trim())}
        onCancel={() => setConfirmPublish(false)}
        onClose={() => setConfirmPublish(false)}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)', marginTop: 'var(--dim-space-300)' }}>
          <InputField
            label='เวอร์ชั่นใหม่'
            required
            value={publishVersion}
            onChange={setPublishVersion}
            placeholder='V 2.0'
            helperText={prefill?.fromVersion ? `เวอร์ชันเดิม: ${prefill.fromVersion}` : undefined}
          />
        </div>
      </AlertDialog>
      </ErrorBoundary>
    </>
  );
}
