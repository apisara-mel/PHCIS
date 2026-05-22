import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/icons/Icon';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import BrandCircleSubdueIconButton from '@/components/button/BrandCircleSubdueIconButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import BadgeSelectForm from '@/components/forms/BadgeSelectForm';
import { HistoryPillBadge } from '@/components/forms/historyPillBadges';
import TextareaCanonical from '@/components/forms/Textarea';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import HistoryCopyToast from '@/components/forms/HistoryCopyToast';
import AlertDialog from '@/components/popup/AlertDialog';
import Tooltip from '@/components/tooltip/Tooltip';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import RadioButton from '@/components/radio/RadioButton';

/* Brand-aware scroll-fade overlay — matches the pattern used by
   HistoryTimeline (Step 1 left column) so the two step screens look
   coherent. `--PrimaryShadow-602` (12%) stacked over `--PrimaryShadow-
   600` (8%) tints the sash with the active brand's p600 RGB. */
const SCROLL_FADE_HEIGHT = 4;
const SCROLL_FADE_TOP =
  'linear-gradient(to bottom, var(--PrimaryShadow-602) 0%, var(--PrimaryShadow-600) 50%, transparent 100%)';
const SCROLL_FADE_BOTTOM =
  'linear-gradient(to top, var(--PrimaryShadow-602) 0%, var(--PrimaryShadow-600) 50%, transparent 100%)';

/**
 * Shared two-column "history → new record" layout used by Step 3
 * (allergies) and Step 4 (chronic diseases). All brand colors are
 * aliased through tailwind/CSS variables → switches with [data-brand].
 */

/** @typedef {{ name: string, detail?: string, severity?: string, status?: string, nameValue?: string }} HistoryRow */

/**
 * Map a left-column history row to the dropdown `value` for the name
 * field. Prefer explicit `nameValue` on the row when labels in MR
 * don't match `nameOptions` labels exactly (common for Thai + suffix).
 */
const resolveHistoryNameValue = (h, schema) => {
  if (h.nameValue != null && h.nameValue !== '') return h.nameValue;
  const opts = (schema.nameOptions || []).filter((o) => o.value !== '');
  const n = h.name;
  if (!n) return '';
  const byLabel = opts.find((o) => o.label === n);
  if (byLabel) return byLabel.value;
  const byValue = opts.find((o) => o.value === n);
  if (byValue) return byValue.value;
  const nl = String(n).toLowerCase();
  const byCi = opts.find((o) => String(o.label).toLowerCase() === nl);
  if (byCi) return byCi.value;
  const byPrefix = opts.find(
    (o) =>
      String(o.label).startsWith(n) ||
      String(n).startsWith(String(o.label).split('(')[0].trim()),
  );
  if (byPrefix) return byPrefix.value;
  return '';
};

const isRecordEmpty = (r) =>
  (!r.name || r.name === '') &&
  (!r.severity || r.severity === '') &&
  (!r.status || r.status === '') &&
  (!r.symptom || String(r.symptom).trim() === '') &&
  (!r.note || String(r.note).trim() === '');

/** Every required field on the row is filled — used to gate OPD footer "ถัดไป". */
const isRecordComplete = (r, schema) => {
  if (!r || !r.name || r.name === '') return false;
  if (!r.severity || r.severity === '') return false;
  if (schema.statusRequired !== false && (!r.status || r.status === '')) return false;
  if (schema.symptomRequired !== false && (!r.symptom || String(r.symptom).trim() === '')) {
    return false;
  }
  if (schema.noteRequired === true && (!r.note || String(r.note).trim() === '')) return false;
  return true;
};

/* Default severity pick list — DiseaseForm (162:19069) uses full MR set;
   AllergyForm overrides with PHCIS | OPD 334:56417 (three levels only). */
const DEFAULT_SEVERITY_OPTIONS = [
  { value: 'critical', label: 'วิกฤต'   },
  { value: 'high',     label: 'รุนแรง'   },
  { value: 'medium',   label: 'ปานกลาง'  },
  { value: 'low',      label: 'เล็กน้อย' },
  { value: 'mild',     label: 'น้อย'     },
];

/**
 * Build a right-column record from a ฝ่ายเวชระเบียน card: dropdowns from
 * name / severity / status, and narrative `detail` → `symptom` so the
 * clinician sees MR text carried into บันทึกประวัติใหม่ in one click.
 */
const buildRecordFromHistory = (h, schema) => {
  const template =
    (Array.isArray(schema.defaultRecords) && schema.defaultRecords.find((x) => isRecordEmpty(x))) ||
    { name: '', severity: 'low', status: 'new', symptom: '', note: '' };
  const nameVal = resolveHistoryNameValue(h, schema);
  const detailText = h.detail != null && String(h.detail).trim() !== '' ? String(h.detail).trim() : '';
  return {
    ...template,
    name: nameVal,
    severity: h.severity != null && h.severity !== '' ? h.severity : template.severity || 'low',
    status:
      h.status != null && h.status !== ''
        ? h.status
        : template.status !== undefined && template.status !== ''
          ? template.status
          : 'new',
    symptom: detailText,
    note: template.note != null ? template.note : '',
  };
};

/* ── Left column: prior history entries ───────────────────────
   Each card mirrors Figma 162:17951's "ข้อมูลการแพ้ยาในอดีต" tile:
   name + optional detail + up to two pills: **severity** (always when
   present) and optional **status** when `schema.showHistoryStatusBadge`
   is true (default). Allergy step sets the flag false so MR likelihood
   (แน่นอน / น่าจะใช่ / …) is not duplicated on the left — only severity.

   State machine — borrows the VitalSignTimelineCard contract used by
   Step 1 (Figma 133:1448):
     • Default : 1 px neutral border (`border/card/default`)
     • Hover   : 2 px brand-tertiary border (`border/brandPrimary/tertiary`)
                 + `--shadow-card-hover` lift
   No "selected" state — history cards are reference reads, the right
   column records are the source of truth. The copy affordance is a
   Figma "Brand Circle Subdue Icon Button" (fill · xs = 32px) with the
   `content_copy` glyph — one click copies the row into บันทึกประวัติใหม่: name / severity / status map to the
   dropdowns (with optional `nameValue` on the history row when MR text
   does not match an option label), and `detail` is copied into the
   "อาการ" textarea so ฝ่ายเวชระเบียน narrative carries across in one
   gesture. If a blank starter card exists it is filled first; otherwise
   a new card is appended.

   The copy control is a **controlled visual** — `copied` is derived by
   the parent from the right column records (a Set of currently-present
   `name` values). So if the clinician deletes the corresponding record
   in บันทึกประวัติใหม่, or rewrites it to a different disease, the
   left icon reverts to `content_copy` automatically. Re-copying the
   same row is still allowed: clicking always runs merge + toast, only
   the icon's check/copy glyph follows the relationship to the right
   column.
   Polite `aria-live` on the row supplements the toast.

   To avoid the "กระตุก" subpixel jitter, `border-width` and `padding`
   snap instantly while only `border-color` + `box-shadow` ease in.
   Padding compensates by 1 px in the default state so the inner layout
   is mathematically identical between default (1 px border + 13 px
   padding) and hover (2 px border + 12 px padding). */
const HistoryEntry = ({
  name,
  detail,
  severity,
  status,
  showStatusBadge = true,
  statusBadgeKind = 'status',
  copied = false,
  onAdd,
  copyDisabled = false,
}) => {
  const [hovered, setHovered] = useState(false);
  const [liveStamp, setLiveStamp] = useState(0);

  const handleCopy = useCallback(() => {
    if (copyDisabled) return;
    onAdd?.();
    setLiveStamp((k) => k + 1);
  }, [copyDisabled, onAdd]);

  const borderWidth = hovered ? 'var(--dim-stroke-200)' : 'var(--dim-stroke-100)';
  const borderColor = hovered
    ? 'var(--border-brandPrimary-tertiary)'    /* brand-p200, brand-aware */
    : 'var(--border-card-default)';            /* neutral-200 */
  const padCompensate = hovered ? 0 : 1; /* px — keep inner box steady */
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='w-full rounded-xl flex flex-col gap-1.5'
      style={{
        background: 'var(--surface-card-100, #FFFFFF)',
        borderWidth,
        borderStyle: 'solid',
        borderColor,
        boxShadow: hovered ? 'var(--shadow-card-hover)' : 'none',
        padding: `calc(12px + ${padCompensate}px)`,
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
      }}
    >
      <div className='flex items-start gap-2 w-full'>
        <div className='flex-1 min-w-0 flex flex-col gap-0.5'>
          <p className='text-sm font-bold text-ink leading-snug'>{name}</p>
          {detail && <p className='text-xs text-ink-secondary leading-snug'>{detail}</p>}
        </div>
        <div className='relative shrink-0 flex flex-col items-end gap-1'>
          <Tooltip
            position='top'
            maxWidth={280}
            content={copied ? 'คลิกเพื่อคัดลอกซ้ำอีกครั้ง' : undefined}
          >
            <BrandCircleSubdueIconButton
              type='button'
              variant='fill'
              size='xs'
              visualActive={copied}
              icon={copied ? 'check' : 'content_copy'}
              className='shrink-0'
              disabled={copyDisabled}
              aria-label={
                copyDisabled
                  ? `คัดลอก ${name} — ปิดใช้งานเมื่อระบุว่าไม่แพ้ยาและสารเคมี`
                  : copied
                    ? `คัดลอก ${name} ไปยังบันทึกประวัติใหม่อีกครั้ง`
                    : `คัดลอก ${name} ไปยังบันทึกประวัติใหม่`
              }
              onClick={handleCopy}
            />
          </Tooltip>
          <div className='sr-only' aria-live='polite' aria-atomic='true'>
            {copied ? (
              <span key={liveStamp}>คัดลอกไปยังบันทึกประวัติใหม่แล้ว</span>
            ) : null}
          </div>
        </div>
      </div>
      {(severity || (showStatusBadge && status)) && (
        <div className='flex flex-wrap items-center gap-1.5'>
          {severity && <HistoryPillBadge kind='severity' value={severity} />}
          {showStatusBadge && status && (
            <HistoryPillBadge kind={statusBadgeKind} value={status} />
          )}
        </div>
      )}
    </div>
  );
};

/* ── Right column: record fields — Figma 162:17951 row + DS Select w/ badge
   slot (2510:7072) via {@link BadgeSelectForm}. Badges sit inside the
   trigger only (no duplicate pill under the control).                */
/* Thin alias over the canonical Textarea (Figma 268:26). The component
   ships its own label + asterisk via FieldShell, so we just forward
   props through and let the canonical implementation own everything. */
const Textarea = ({ label, required, value, onChange, ...rest }) => (
  <TextareaCanonical
    label={label}
    required={required}
    showLabel={!!label}
    showHelperText={false}
    value={value ?? ''}
    onChange={(next, e) => {
      if (typeof onChange === 'function') onChange(e || { target: { value: next } });
    }}
    rows={3}
    className='flex-1 min-w-0'
    {...rest}
  />
);


const RecordCard = ({ index, record, schema, onChange, onRemove }) => (
  <div className='w-full bg-white border border-ink-line rounded-xl p-4 flex flex-col gap-4'>
    <div className='flex items-center justify-between'>
      <h4 className='text-sm font-bold text-ink'>{schema.recordLabel} {index + 1}</h4>
      <NeutralSubdueIconButton
        type='button'
        variant='outline'
        size='sm'
        icon='delete'
        onClick={onRemove}
        aria-label='ลบรายการ'
      />
    </div>

    <div className='flex items-start gap-3 w-full'>
      <BadgeSelectForm
        label={schema.nameLabel}
        required
        value={record.name}
        onChange={(v) => onChange({ ...record, name: v })}
        options={schema.nameOptions}
      />
      <BadgeSelectForm
        badgeKind='severity'
        label='ระดับความรุนแรง'
        required
        value={record.severity}
        onChange={(v) => onChange({ ...record, severity: v })}
        options={schema.severityOptions || DEFAULT_SEVERITY_OPTIONS}
      />
      <BadgeSelectForm
        badgeKind={schema.statusBadgeKind || 'status'}
        label={schema.statusLabel}
        required={schema.statusRequired !== false}
        value={record.status}
        onChange={(v) => onChange({ ...record, status: v })}
        options={schema.statusOptions || [
          { value: 'new',      label: 'ใหม่'      },
          { value: 'ongoing',  label: 'รักษาอยู่' },
          { value: 'resolved', label: 'หายดี'     },
          { value: 'inactive', label: 'หยุด'      },
        ]}
      />
    </div>

    <div className='flex items-start gap-3 w-full'>
      <SuggestibleTextarea
        label='อาการ'
        required={schema.symptomRequired !== false}
        value={record.symptom}
        onChange={(e) => onChange({ ...record, symptom: e.target.value })}
        placeholder={schema.symptomPlaceholder || ''}
        suggestions={schema.symptomSuggestions}
        minChars={schema.symptomSuggestMinChars ?? 3}
      />
      <Textarea
        label='หมายเหตุ'
        required={schema.noteRequired === true}
        value={record.note}
        onChange={(e) => onChange({ ...record, note: e.target.value })}
        placeholder={schema.notePlaceholder || 'บันทึกข้อมูลเพิ่มเติม'}
      />
    </div>
  </div>
);

/* Right-column empty state — surfaces only while `records.length === 0`,
   i.e. the clinician hasn't started (or has deleted) every "บันทึก
   ประวัติใหม่" card. Mirrors the Vitals timeline's first-visit empty
   state (Figma 293:65594):
     • brand-tinted Lottie illustration (schema-supplied, e.g.
       Disease History.json for chronic diseases)
     • brand-p700 heading ("ยังไม่มี[ประวัติ X]")
     • content-quaternary hint ("กรุณาเริ่ม…")
   Sits in a dashed brand-tinted card so the surrounding "+ Add" CTA
   keeps its visual hierarchy as the primary action. */
const EmptyRecordsPlaceholder = ({ schema }) => (
  <div
    className='w-full flex flex-col items-center justify-center text-center'
    style={{
      gap: 'var(--dim-space-150, 6px)',
      padding: 'var(--dim-space-700, 28px) var(--dim-space-500, 20px)',
      borderRadius: 'var(--dim-radius-400, 16px)',
      background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
      border: 'var(--dim-stroke-100, 1px) dashed var(--border-brandPrimary-quaternary, #DCEAE3)',
    }}
  >
    {schema.emptyIllustration && (
      <LottieIllustration animationData={schema.emptyIllustration} size={140} />
    )}
    <p
      style={{
        margin: 'var(--dim-space-0)',
        color: 'var(--text-brandPrimary-default, #007549)',
        fontFamily: 'var(--type-family-heading-content)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-bold, 700)',
        lineHeight: 1.5,
      }}
    >
      {schema.emptyTitle || `ยังไม่มีรายการ${schema.topic}`}
    </p>
    <p
      style={{
        margin: 'var(--dim-space-0)',
        color: 'var(--text-content-quaternary, #ADB2B7)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-medium, 500)',
        lineHeight: 1.5,
      }}
    >
      {schema.emptyHint || `กรุณาเพิ่มรายการ${schema.topic}ของผู้ป่วย`}
    </p>
  </div>
);

/** Shown when a presence `modeToggle` is on and the negative option is selected.
    PHCIS | OPD Figma 335:62769 / 339:64753 — Lottie (160px) + title in
    `text/brandPrimaryButton/default` + hint in **label1** +
    `text/content/quaternary`. Pass `animationData` to skip fetch; else
    `Medicine.json` under `public/illustration/` loads at runtime. */
const NoAllergyPlaceholder = ({ title, hint, illustrationPath, animationData: injectedAnim }) => {
  const path = illustrationPath || '/illustration/Medicine.json';
  const [fetchedAnim, setFetchedAnim] = useState(null);
  useEffect(() => {
    if (injectedAnim) return undefined;
    let cancelled = false;
    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setFetchedAnim(json);
      })
      .catch(() => {
        if (!cancelled) setFetchedAnim(null);
      });
    return () => {
      cancelled = true;
    };
  }, [path, injectedAnim]);
  const animationData = injectedAnim || fetchedAnim;

  const titleStyle = {
    margin: 'var(--dim-space-0)',
    color: 'var(--text-brandPrimaryButton-default, #007549)',
    fontFamily: 'var(--type-family-heading-content)',
    fontSize: 'var(--type-size-sm, 14px)',
    fontWeight: 'var(--type-weight-bold, 700)',
    lineHeight: 1.5,
  };
  /* design.md typography.label1 — body Medium 14px / 1.5 */
  const hintStyle = {
    margin: 'var(--dim-space-0)',
    color: 'var(--text-content-quaternary, #ADB2B7)',
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-sm, 14px)',
    fontWeight: 'var(--type-weight-medium, 500)',
    lineHeight: 1.5,
  };

  return (
    <div
      className='w-full flex flex-col items-center justify-center text-center'
      style={{
        gap: 'var(--dim-space-0)',
        padding: 'var(--dim-space-0)',
      }}
    >
      {animationData && (
        <LottieIllustration animationData={animationData} size={160} />
      )}
      <div
        className='flex flex-col items-center text-center'
        style={{ gap: 'var(--dim-space-100, 4px)' }}
      >
        <p style={titleStyle}>{title}</p>
        <p style={hintStyle}>{hint}</p>
      </div>
    </div>
  );
};

/** PHCIS | OPD Figma 335:54424 — "แพ้ยาและสารเคมี" selected but `records.length === 0`
 *  (clinician removed every row). Same column surface as the rest of บันทึกประวัติใหม่:
 *  Lottie + brand title + neutral hint — **no** inner mint/dashed card
 *  (`EmptyRecordsPlaceholder` is for disease / non-allergy empty lists). */
const AllergenListEmptyPlaceholder = ({ title, hint, illustrationPath }) => {
  const path = illustrationPath || '/illustration/Medicine.json';
  const [animationData, setAnimationData] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setAnimationData(json);
      })
      .catch(() => {
        if (!cancelled) setAnimationData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <div
      className='w-full flex flex-col items-center justify-center text-center'
      style={{ gap: 'var(--dim-space-300, 12px)' }}
    >
      {animationData && (
        <LottieIllustration animationData={animationData} size={160} />
      )}
      <div
        className='flex flex-col items-center text-center w-full max-w-sm'
        style={{ gap: 'var(--dim-space-100, 4px)' }}
      >
        <p
          style={{
            margin: 'var(--dim-space-0)',
            color: 'var(--text-brandPrimary-default, #007549)',
            fontFamily: 'var(--type-family-heading-content)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            lineHeight: 1.5,
          }}
        >
          {title}
        </p>
        <p
          style={{
            margin: 'var(--dim-space-0)',
            color: 'var(--text-content-secondary, #636B72)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.5,
          }}
        >
          {hint}
        </p>
      </div>
    </div>
  );
};

/**
 * @param {object} props
 * @param {(valid: boolean) => void} [props.onValidityChange] — OPD footer gate:
 *   negative presence option (ไม่แพ้ / ไม่มีโรค…) → `true`; otherwise at least
 *   one fully complete row and no partially filled rows (mirrors required flags
 *   on {@link RecordCard}).
 * @param {object} props.schema  — { topic, icon, recordLabel, nameLabel, statusLabel, nameOptions, history, defaultRecords, addLabel,
 *                                   emptyIllustration?, emptyTitle?, emptyHint?,
 *                                   deleteConfirmTitle?, deleteConfirmDescription?, deleteConfirmLabel?,
 *                                   historyAsideClassName?, historyAsideWidthPx?, allergyModeToggle?, presenceModeToggle?,
 *                                   allergenListEmptyPlaceholder?, showHistoryStatusBadge?, severityOptions?, statusOptions?, … }
 *   `showHistoryStatusBadge` — when `false`, left-column MR cards hide the
 *   second pill (`status` / ความน่าจะเป็น for allergies). Default `true`.
 *   `allergyModeToggle` — optional PHCIS | OPD 335:57765 row of two card-style
 *   radios (allergy step). `presenceModeToggle` — same shape for chronic disease
 *   (Figma 162:19069); if both exist, `presenceModeToggle` wins.
 *   When the negative option is active, record cards + add CTA are hidden and
 *   MR copy on the left is disabled. Optional `noAllergyTitle`, `noAllergyHint`,
 *   `noAllergyIllustrationPath` (defaults to `/illustration/Medicine.json`) drive
 *   the negative panel (Figma 335:62769 — illustration + title/hint; hint uses
 *   label1 + text/content/quaternary). Optional
 *   `noPresenceAnimationData` — imported Lottie JSON for that panel without fetch.
 *   When the positive option is on and `records` is empty, Figma 335:54424 uses
 *   `AllergenListEmptyPlaceholder` only if `allergenListEmptyPlaceholder: true`
 *   (allergy step); otherwise `EmptyRecordsPlaceholder` (disease / generic).
 *   Allergen copy: `emptyAllergenTitle`, `emptyAllergenHint`,
 *   `emptyAllergenIllustrationPath` on the toggle object.
 *   `emptyIllustration` is a Lottie JSON object (imported via Vite) shown
 *   in the right column while `records` is empty. `emptyTitle` / `emptyHint`
 *   override the auto-generated copy.
 *   `history` — rows for ฝ่ายเวชระเบียน: `{ name, detail?, severity?, status?, nameValue? }`.
 *     Optional `nameValue` pins the right-column name dropdown to a
 *     `nameOptions[].value` when MR display text does not match an option
 *     label. Clicking the copy control merges into the first empty starter card if any,
 *     else appends: copies `detail` into the "อาการ" field and maps badges
 *     to severity / status dropdowns.
 *   `deleteConfirm*` — optional strings for the delete-record confirmation dialog
 *     (Figma 322:50126); defaults to generic Thai copy if omitted. Skipped when
 *     the row is empty per `isRecordEmpty` (instant remove).
 */
const ASIDE_W_TAILWIND = /\bw-\[(\d+)px\]/;

/** Figma 162:17951 — `dimension/space/600`: inter-column gap + outer padding on both rails (24px). */
const HISTORY_LIST_SPACE_600 = 'var(--dim-space-600, 24px)';

/** Figma 335:57765 — `RadioButton` `value`s for the allergy declaration row. */
const ALLERGY_MODE_NO = 'no';
const ALLERGY_MODE_YES = 'yes';

/** Chip fill matches Figma white card, but drop the 2px transparent border
    (RadioButton default) that reads as a white rim on the neutral panel. */
const ALLERGY_MODE_RADIO_STYLE = {
  background: 'var(--surface-neutralbutton-quinary, #FFFFFF)',
  border: 'none',
};

const HistoryListForm = ({ schema, onValidityChange }) => {
  const asideWidthPx =
    typeof schema.historyAsideWidthPx === 'number'
      ? schema.historyAsideWidthPx
      : (() => {
          const m =
            typeof schema.historyAsideClassName === 'string'
            && schema.historyAsideClassName.match(ASIDE_W_TAILWIND);
          return m ? Number(m[1]) : 280;
        })();
  const asideClassExtras =
    typeof schema.historyAsideClassName === 'string'
      ? schema.historyAsideClassName
          .replace(/\bw-\[\d+px\]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      : '';

  const [records, setRecords] = useState(schema.defaultRecords);
  const modeToggle = schema.presenceModeToggle ?? schema.allergyModeToggle;
  const [declaresPresence, setDeclaresPresence] = useState(
    () => (modeToggle && modeToggle.defaultHasAllergy === false ? false : true),
  );
  const showRecordEditors = !modeToggle || declaresPresence;
  const copyFromMrDisabled = !!modeToggle && !declaresPresence;

  useEffect(() => {
    if (typeof onValidityChange !== 'function') return;
    let valid;
    if (modeToggle && !showRecordEditors) {
      valid = true;
    } else {
      const hasPartial = records.some((r) => !isRecordEmpty(r) && !isRecordComplete(r, schema));
      const hasComplete = records.some((r) => isRecordComplete(r, schema));
      valid = !hasPartial && hasComplete;
    }
    onValidityChange(valid);
  }, [
    modeToggle,
    showRecordEditors,
    records,
    schema,
    onValidityChange,
  ]);

  /* Set of name-dropdown values currently present in บันทึกประวัติใหม่.
     Drives the left-column copy → check icon swap so the relationship is
     bidirectional: copying populates the right (Set grows → left shows
     check); deleting / renaming on the right shrinks the Set → the
     corresponding left entry reverts to the copy icon. Recomputed only
     when `records` mutates. */
  const recordedNames = useMemo(() => {
    const s = new Set();
    records.forEach((r) => {
      if (r && r.name != null && String(r.name).trim() !== '') s.add(r.name);
    });
    return s;
  }, [records]);
  const [copyToast, setCopyToast] = useState(null);
  const dismissCopyToast = useCallback(() => setCopyToast(null), []);
  const [deleteTargetIndex, setDeleteTargetIndex] = useState(null);
  const closeDeleteDialog = useCallback(() => setDeleteTargetIndex(null), []);

  const removeAt = useCallback((i) => {
    setRecords((rs) => rs.filter((_, k) => k !== i));
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteTargetIndex == null) return;
    removeAt(deleteTargetIndex);
    setDeleteTargetIndex(null);
  }, [deleteTargetIndex, removeAt]);

  const requestRemoveAt = useCallback(
    (i, record) => {
      if (isRecordEmpty(record)) {
        removeAt(i);
        return;
      }
      setDeleteTargetIndex(i);
    },
    [removeAt],
  );

  const copyHistoryRow = useCallback(
    (h) => {
      setRecords((rs) => {
        const merged = buildRecordFromHistory(h, schema);
        const emptyIdx = rs.findIndex((row) => isRecordEmpty(row));
        if (emptyIdx >= 0) {
          return rs.map((row, k) => (k === emptyIdx ? merged : row));
        }
        return [...rs, merged];
      });
      setCopyToast({ id: Date.now(), variant: 'success' });
    },
    [schema],
  );

  const updateAt = (i, r) => setRecords((rs) => rs.map((x, k) => (k === i ? r : x)));
  /* New row matches blank starter shape so `isRecordEmpty` stays true until
     the clinician fills any field — delete then skips the confirm dialog. */
  const add = () =>
    setRecords((rs) => [...rs, { name: '', severity: '', status: '', symptom: '', note: '' }]);

  /* Left-column scroll-fade — mirrors HistoryTimeline (Step 1 vitals).
     Two pointer-events:none gradient sashes fade in/out based on scroll
     position so the user sees there's more content above/below. */
  const scrollRef = useRef(null);
  const [scroll, setScroll] = useState({ overflow: false, top: false, bottom: false });
  const updateScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const overflow = scrollHeight > clientHeight + 2;
    if (!overflow) {
      setScroll({ overflow: false, top: false, bottom: false });
      return;
    }
    const eps = 2;
    setScroll({
      overflow: true,
      top: scrollTop > eps,
      bottom: scrollTop < scrollHeight - clientHeight - eps,
    });
  }, []);
  useLayoutEffect(() => { updateScroll(); }, [schema.history, updateScroll]);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (typeof ResizeObserver === 'undefined' || !el) return undefined;
    const ro = new ResizeObserver(() => updateScroll());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScroll]);

  return (
    <section className='bg-white rounded-b-card p-6 flex flex-col gap-4'>
      <div className='flex items-center gap-2 w-full'>
        <span className='text-brand-500'><Icon name={schema.icon} size={20} /></span>
        <h2 className='text-base font-bold text-brand-500'>{schema.topic}</h2>
      </div>

      {/* Two-column body — Figma 162:17951: `flex` + `gap` (space/600) + two
            sibling cards (left fixed width, right `flex-1`), not one full-bleed
            panel with synthetic inset. */}
      <div
        className='flex w-full min-h-0 items-stretch'
        style={{ gap: HISTORY_LIST_SPACE_600 }}
      >
        {/* — Left: ฝ่ายเวชระเบียน — */}
        <aside
          className={`flex min-h-0 shrink-0 flex-col gap-4 self-stretch ${asideClassExtras}`}
          style={{
            width: `${asideWidthPx}px`,
            background: 'var(--surface-brandPrimary-quaternary)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            borderRadius: 'var(--dim-radius-400, 12px)',
            padding: HISTORY_LIST_SPACE_600,
          }}
        >
          <div className='flex flex-col gap-1'>
            <h3 className='text-sm font-bold text-ink'>
              {schema.historyTitle || 'ข้อมูลจากฝ่ายเวชระเบียน'}
            </h3>
            <p className='text-xs text-ink-tertiary leading-snug'>
              {schema.historySubtitle || 'คลิกไอคอนคัดลอกเพื่อนำรายการไปยังบันทึกประวัติใหม่'}
            </p>
          </div>
          {/* Scroll container — fade sashes are absolutely-positioned
              siblings of the scroller so they sit above scrolling cards
              without intercepting clicks (pointer-events: none). */}
          <div className='relative flex min-h-0 flex-1 flex-col'>
            <div
              ref={scrollRef}
              onScroll={updateScroll}
              className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto scrollbar-thin pr-1'
            >
              {schema.history.map((h, i) => {
                const nameVal = resolveHistoryNameValue(h, schema);
                return (
                  <HistoryEntry
                    key={i}
                    {...h}
                    showStatusBadge={schema.showHistoryStatusBadge !== false}
                    statusBadgeKind={schema.statusBadgeKind || 'status'}
                    copied={!!nameVal && recordedNames.has(nameVal)}
                    copyDisabled={copyFromMrDisabled}
                    onAdd={() => copyHistoryRow(h)}
                  />
                );
              })}
            </div>
            <div
              aria-hidden
              className='pointer-events-none absolute left-0 right-0 top-0 transition-opacity duration-150'
              style={{
                height: SCROLL_FADE_HEIGHT,
                background: SCROLL_FADE_TOP,
                opacity: scroll.overflow && scroll.top ? 1 : 0,
                borderTopLeftRadius: 'inherit',
                borderTopRightRadius: 'inherit',
              }}
            />
            <div
              aria-hidden
              className='pointer-events-none absolute left-0 right-0 bottom-0 transition-opacity duration-150'
              style={{
                height: SCROLL_FADE_HEIGHT,
                background: SCROLL_FADE_BOTTOM,
                opacity: scroll.overflow && scroll.bottom ? 1 : 0,
                borderBottomLeftRadius: 'inherit',
                borderBottomRightRadius: 'inherit',
              }}
            />
          </div>
        </aside>

        {/* — Right: บันทึกประวัติใหม่ — */}
        <div
          className='flex min-h-0 min-w-0 flex-1 flex-col gap-3 self-stretch'
          style={{
            padding: HISTORY_LIST_SPACE_600,
            background: 'var(--surface-neutral-quaternary)',
            border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
            borderRadius: 'var(--dim-radius-400, 12px)',
          }}
        >
          <div className='flex flex-col gap-1 px-1'>
            <h3 className='text-sm font-bold text-ink'>
              {schema.recordsTitle || 'บันทึกประวัติใหม่'}
            </h3>
            <p className='text-xs text-ink-tertiary leading-snug'>
              {schema.recordsSubtitle || 'ใช้ข้อมูลจากระบบ (HOSx) ติดต่ออ่าง Doc/SQ ของผู้ป่วยและ/หรือเอกสารทางคลินิก'}
            </p>
          </div>

          {modeToggle && (
            <div
              role='radiogroup'
              aria-label={modeToggle.groupLabel || 'เลือกสถานะ'}
              className='flex w-full flex-wrap items-center justify-center'
              style={{ gap: 'var(--dim-space-300, 12px)' }}
            >
              <RadioButton
                name={modeToggle.name}
                value={ALLERGY_MODE_NO}
                checked={!declaresPresence}
                onChange={(v) => {
                  if (v === ALLERGY_MODE_NO) setDeclaresPresence(false);
                }}
                showRadio={false}
                showCircleIcon={false}
                showIcon={false}
                showDescription={false}
                showBadge={false}
                showBadgeTitle={false}
                title={modeToggle.negativeLabel}
                style={ALLERGY_MODE_RADIO_STYLE}
              />
              <RadioButton
                name={modeToggle.name}
                value={ALLERGY_MODE_YES}
                checked={declaresPresence}
                onChange={(v) => {
                  if (v === ALLERGY_MODE_YES) setDeclaresPresence(true);
                }}
                showRadio={false}
                showCircleIcon={false}
                showIcon={false}
                showDescription={false}
                showBadge={false}
                showBadgeTitle={false}
                title={modeToggle.positiveLabel}
                style={ALLERGY_MODE_RADIO_STYLE}
              />
            </div>
          )}

          {showRecordEditors && records.length === 0 ? (
            schema.allergenListEmptyPlaceholder && modeToggle ? (
              <AllergenListEmptyPlaceholder
                title={
                  modeToggle.emptyAllergenTitle
                  ?? 'ยังไม่ได้ระบุชื่อยา/สารเคมี'
                }
                hint={
                  modeToggle.emptyAllergenHint
                  ?? 'คัดลอกข้อมูลจากด้านซ้าย หรือกดที่ปุ่มด้านล่าง'
                }
                illustrationPath={
                  modeToggle.emptyAllergenIllustrationPath
                  ?? modeToggle.noAllergyIllustrationPath
                }
              />
            ) : (
              <EmptyRecordsPlaceholder schema={schema} />
            )
          ) : showRecordEditors ? (
            records.map((r, i) => (
              <RecordCard
                key={i}
                index={i}
                record={r}
                schema={schema}
                onChange={(next) => updateAt(i, next)}
                onRemove={() => requestRemoveAt(i, r)}
              />
            ))
          ) : (
            <NoAllergyPlaceholder
              title={
                modeToggle?.noAllergyTitle
                ?? 'ระบุว่าผู้ป่วยไม่มีประวัติการแพ้ยาและสารเคมี'
              }
              hint={modeToggle?.noAllergyHint ?? 'ไม่ต้องกรอกรายการยา'}
              illustrationPath={modeToggle?.noAllergyIllustrationPath}
              animationData={modeToggle?.noPresenceAnimationData}
            />
          )}

          {showRecordEditors && (
            <BrandDashedAddButton type='button' onClick={add}>
              {schema.addLabel}
            </BrandDashedAddButton>
          )}
        </div>
      </div>

      <HistoryCopyToast session={copyToast} onDismiss={dismissCopyToast} />

      <AlertDialog
        open={deleteTargetIndex !== null}
        onClose={closeDeleteDialog}
        onConfirm={confirmDelete}
        type='destructive'
        alignment='center'
        title={schema.deleteConfirmTitle ?? 'ยืนยันการลบรายการ'}
        description={
          schema.deleteConfirmDescription
          ?? 'คุณต้องการลบรายการนี้จากบันทึกประวัติใหม่หรือไม่'
        }
        cancelLabel='ยกเลิก'
        confirmLabel={schema.deleteConfirmLabel ?? 'ลบ'}
      />
    </section>
  );
};

export default HistoryListForm;
