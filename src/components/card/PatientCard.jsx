import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useHeaderAutoHide } from '@/context/HeaderAutoHideContext';
import {
  APP_TOPBAR_HEIGHT,
  CHROME_TRANSITION_EASE,
  CHROME_TRANSITION_MS,
  MIH_PATIENT_CARD_STICKY_HEIGHT_VAR,
  MIH_TOPBAR_OFFSET,
  clearLerpedCssLength,
  setLerpedCssLength,
  snapLerpedCssLength,
} from '@/hooks/useHeaderAutoHide';
import { useHistory } from 'react-router-dom';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { ButtonSizeAliasProvider } from '@/components/button/ButtonSizeAliasContext';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Tooltip from '@/components/tooltip/Tooltip';
import { resolveSeverityBadgeStyle } from '@/components/badge/clinicalBadgeStyles';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { DEFAULT_PATIENT } from '@/data/patientProfiles';

/* ประวัติการรักษา popup — loaded lazily ON CLICK, never at module init.
   MedicalHistoryPopup imports MedicalHistoryReadOnlyLayout from
   TreatmentSteps, and TreatmentSteps imports MedicalHistoryPopup back;
   a static import from PatientCard (which nearly every clinical page
   mounts) would join that cycle and can read a binding still in its
   temporal dead zone. A dynamic import sidesteps the graph entirely. */
const MedicalHistoryPopupLazy = React.lazy(() => import('@/components/popup/MedicalHistoryPopup'));

/* Derive 1-2 character initials from the patient's name. Prefers the
   first two Thai given-name graphemes ("นายสมชาย มั่นใจดี" → "สม"),
   then falls back to the English first/last initials ("Somchai
   Manjaidee" → "SM"), then to "—". The pattern matches the avatar
   conventions used by RegistrationStep1 and the screening header. */
const getInitials = (patient) => {
  const stripPrefix = (s = '') =>
    s
      .replace(/^(นาย|นาง|นางสาว|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.)\s*/u, '')
      .trim();
  const th = stripPrefix(patient?.fullName || '');
  if (th) {
    const firstWord = th.split(/\s+/)[0] || '';
    const chars = Array.from(firstWord).filter((c) => /\S/.test(c));
    if (chars.length >= 2) return chars.slice(0, 2).join('');
    if (chars.length === 1) return chars[0];
  }
  const en = (patient?.englishName || '').trim();
  if (en) {
    const parts = en.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  }
  return '—';
};

const Field = ({ label, value, minWidth }) => (
  <div
    className='flex flex-col text-white shrink-0'
    style={minWidth ? { minWidth } : undefined}
    title={typeof value === 'string' && value.length > 28 ? value : undefined}
  >
    <span className='text-xs leading-snug opacity-90 whitespace-nowrap'>{label}</span>
    <span
      className='text-sm leading-snug -tracking-[0.28px] whitespace-nowrap'
      style={{ fontWeight: 'var(--type-weight-regular, 400)' }}
    >
      {value}
    </span>
  </div>
);

/* แพ้ยา / โรคประจำตัว row beneath the gradient card.
   Label sits INLINE on the same row as its badges in BOTH layouts (มติ
   ผู้ใช้ ส.ค. 69) — the stacked variant burned a whole line on a 2-word
   label and pushed the alert badges further from the patient identity
   they qualify. `compact` now only tunes the gap.
   Each entry resolves to a severity-coded ColorfulBadge via
   resolveSeverityBadgeStyle (red / orange / blue / teal / yellow).
   แพ้ยา — รายการสุดท้ายใช้ yellow; รายการที่มีรายละเอียด (`symptom` /
   `detail` / `note`) แสดง popover สีขาวเมื่อ hover — ใช้ได้ทั้งแพ้ยา
   และโรคประจำตัว. */
const AlertBadgeColumn = ({ label, items, compact = false }) => {
  const labelEl = (
    <span
      style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
        lineHeight: 1.5,
        color: 'var(--text-content-tertiary, #858c92)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
  const badgesEl = (
    <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
      {items.length === 0 ? (
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-tertiary, #858c92)',
          }}
        >
          —
        </span>
      ) : (
        items.map((item, idx) => {
          const isLastAllergy = label === 'แพ้ยา' && idx === items.length - 1;
          const badgeStyle = isLastAllergy
            ? 'yellow'
            : resolveSeverityBadgeStyle(item.severity);
          const badge = (
            <ColorfulBadge
              style={badgeStyle}
              size='small'
              width='hug'
            >
              {item.name}
            </ColorfulBadge>
          );
          const detail = item.symptom || item.detail || item.note || item.description;
          const wrapped = detail ? (
            <Tooltip
              variant='light'
              position='bottom'
              maxWidth={320}
              content={(
                <span
                  style={{
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    lineHeight: 1.5,
                    color: 'var(--text-content-secondary, #5F676D)',
                  }}
                >
                  {detail}
                </span>
              )}
            >
              <span className='inline-flex cursor-default'>{badge}</span>
            </Tooltip>
          ) : badge;

          return (
            <React.Fragment key={`${item.name}-${idx}`}>
              {wrapped}
            </React.Fragment>
          );
        })
      )}
    </div>
  );
  return (
    <div
      className='flex-1 min-w-0 flex flex-row flex-wrap items-center'
      style={{ gap: compact ? 'var(--dim-space-200, 8px)' : 'var(--dim-space-150, 6px)' }}
    >
      {labelEl}
      {badgesEl}
    </div>
  );
};

const normalizeAlertItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map((item, idx) => {
    if (typeof item === 'string') {
      return { name: item, severity: 'medium', id: `alert-str-${idx}` };
    }
    return item;
  }).filter((item) => item?.name);
};

const PatientCard = ({
  patient = DEFAULT_PATIENT,
  onBack,
  title = 'คัดกรองและซักประวัติ',
  actions,
  showBack = true,
  /* Optional extra badges/pills (e.g. Observation's status/VN/nurse/
     admit-time) rendered as a wrapped row below the identity fields —
     fully caller-built JSX, same pattern as `actions`, so PatientCard
     stays agnostic of which page is using it. */
  tags,
  drugAllergies,
  chronicDiseases,
  /* ปุ่ม "ประวัติการรักษา" ข้างกลุ่มโรคประจำตัว (มติผู้ใช้ ส.ค. 69).
     Pass a handler to take over the click (e.g. route to a full-page
     history); leave it undefined and the card opens the shared
     ประวัติการรักษา popup itself. `showMedicalHistory={false}` hides it. */
  onMedicalHistory,
  showMedicalHistory = true,
  /* Pharmacy / clinical dispense — always show แพ้ยา + โรคประจำตัว columns
     (empty → "—") so the alert band matches TreatmentForm even when this
     HN has no seeded allergies yet. */
  forceAlertRow = false,
  /* Figma 343:5629 — compact / scrolled-up state. Single-row gradient
     card with product-density 40px avatar, 24h HN/VIP pills, four right-aligned summary
     fields (สิทธิ์ · หมู่เลือด · ประเภท · แพทย์), title row collapsed,
     and the แพ้ยา / โรคประจำตัว labels inline with their badges. Drops
     เพศ / อายุ / เลขบัตรประชาชน to keep the header tight. Address stays
     in the medical record detail instead of this clinical safety card. */
  compact: compactProp,
  /* Figma 343:1926 parallax header. When true, PatientCard owns the
     sticky chrome: it renders a 1px sentinel above itself, observes
     when the sentinel leaves the viewport, and automatically toggles
     `compact` true/false. Pass `stickyTop` (px) to offset the sticky
     position below an app header — defaults to 64 to clear the
     PHCIS app `Header` (h-16, sticky, z-1200). Callers may still pass
     `compact` directly to force a static state (Components Library). */
  sticky = false,
  stickyTop,
  /* Render only the teal identity strip (no back/title chrome). Use when
     the host page already owns SubHeader via QueuePageShell. */
  embedded = false,
}) => {
  const history = useHistory();
  const autoHide = useHeaderAutoHide();
  /* `top:` อ่านจาก CSS var ที่ lerp อยู่แล้ว การ์ดจึงเลื่อนพร้อมแถบบนทุกเฟรม
     โดยไม่ต้อง re-render · rootMargin ของ IntersectionObserver ใช้ความสูงตอน
     แถบกางเต็ม เพราะจุดสลับเป็น/ไม่เป็น compact ไม่ควรขยับตามการซ่อนแถบ */
  const resolvedStickyTop = stickyTop ?? MIH_TOPBAR_OFFSET;
  const stickyTopPx = typeof stickyTop === 'number' ? stickyTop : APP_TOPBAR_HEIGHT;
  const [imgError, setImgError] = useState(false);
  const sentinelRef = useRef(null);
  const cardRef = useRef(null);
  const [stuck, setStuck] = useState(false);

  /* When `sticky` mode is enabled, derive `compact` from the sentinel's
     intersection. When disabled, defer to the `compact` prop so the
     Components Library demos can still pin a static compact view. */
  const compact = sticky ? stuck : !!compactProp;

  useEffect(() => {
    setImgError(false);
  }, [patient?.avatarUrl]);

  useEffect(() => {
    if (!sticky || typeof IntersectionObserver === 'undefined') return undefined;
    const node = sentinelRef.current;
    if (!node) return undefined;
    /* Observe the sentinel against the viewport with a top rootMargin
       equal to `stickyTop`, so the compact swap fires the moment the
       card tucks under the app header. */
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: 0, rootMargin: `-${stickyTopPx}px 0px 0px 0px` },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [sticky, stickyTopPx]);

  /* Default — navigate one step back. The page can intercept (e.g. to
     show an unsaved-changes confirmation) by passing its own `onBack`. */
  const handleBack = () => {
    if (onBack) onBack();
    else history.goBack();
  };

  const allergiesList = normalizeAlertItems(drugAllergies ?? patient?.drugAllergies);
  const diseasesList = normalizeAlertItems(chronicDiseases ?? patient?.chronicDiseases);
  const showAlertRow = forceAlertRow || allergiesList.length > 0 || diseasesList.length > 0;
  const [historyOpen, setHistoryOpen] = useState(false);

  /* Publish live sticky height so RecordWizardMorphBand can stick flush
     under this card (TreatmentFormPage / ScreeningPage). */
  useLayoutEffect(() => {
    if (!sticky || typeof document === 'undefined') return undefined;
    const el = cardRef.current;
    if (!el) return undefined;
    /* `snap` on the first measure of a mount / route change: the lerp only
       exists to glide the band during the scroll morph, and lerping in from
       the *previous* page's card height leaves the var stranded at a stale
       value (seen live: 202.63px against a 144px card → the sticky stepper
       band pinned ~59px too low, with page content visible through the gap).
       Steady-state updates from the ResizeObserver keep animating. */
    let first = true;
    const publish = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (first) {
        first = false;
        snapLerpedCssLength(MIH_PATIENT_CARD_STICKY_HEIGHT_VAR, h);
        return;
      }
      setLerpedCssLength(MIH_PATIENT_CARD_STICKY_HEIGHT_VAR, h);
    };
    publish();
    /* border-box, not the default content-box: the card shrinks on morph by
       animating `padding-bottom` (24px → 0/16px), which never changes the
       content box — a content-box observer stays silent and the band ends up
       pinned ~24px below the card with page content showing through the gap. */
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(publish) : null;
    if (ro) {
      try { ro.observe(el, { box: 'border-box' }); } catch (err) { ro.observe(el); }
    }
    /* Belt and braces for the padding transition — the observer reports the
       end state, this catches browsers that coalesce the last frame. */
    el.addEventListener('transitionend', publish);
    window.addEventListener('resize', publish);
    return () => {
      ro?.disconnect();
      el.removeEventListener('transitionend', publish);
      window.removeEventListener('resize', publish);
      clearLerpedCssLength(MIH_PATIENT_CARD_STICKY_HEIGHT_VAR);
    };
  }, [sticky, compact, embedded, showAlertRow, patient?.hn]);

  /* Tunable parallax timing — sync with app chrome lerp (Header · step band). */
  const T = `${CHROME_TRANSITION_MS}ms ${CHROME_TRANSITION_EASE}`;

  const cardStyle = {
    paddingTop: embedded ? 'var(--dim-space-0)' : 'var(--dim-space-300, 12px)',
    paddingLeft: 'var(--dim-space-400, 16px)',
    paddingRight: 'var(--dim-space-400, 16px)',
    /* Compact / sticky bottom space:
       • With alert row → 0 here (the alert row owns its bottom padding).
       • Sticky without alert → 12 px white pad so rounded teal corners
         don't let page content show through (OPD ScreeningPage embedded
         sticky used to set pb=0 and looked see-through).
       • Expanded non-sticky → 16 px. */
    paddingBottom: sticky
      ? (showAlertRow ? 'var(--dim-space-0)' : 'var(--dim-space-300, 12px)')
      : embedded
        ? 'var(--dim-space-0)'
        : compact
          ? (showAlertRow ? 'var(--dim-space-0)' : 'var(--dim-space-300, 12px)')
          : 'var(--dim-space-400, 16px)',
    /* Opaque white underlay — embedded previously skipped surface fill,
       so sticky ScreeningPage showed brand-100 page bg around the card. */
    background: 'var(--surface-card-100, #FFFFFF)',
    transition: `padding-bottom ${T}`,
    ...(sticky
      ? {
          position: 'sticky',
          top: MIH_TOPBAR_OFFSET,
          /* Stack above page content but below the app header (z-1200)
             and modals (z-1400). The dropdown popover tokens
             (--sm-z-popover 1199) already sit just below the header — a
             lightly lower 1100 keeps this from competing with menus. */
          zIndex: 1100,
        }
      : null),
  };

  return (
    <>
      {/* Sentinel — sits at the natural top of the card so the
         IntersectionObserver can detect when the card has scrolled
         under the app header. Rendered only in sticky mode. */}
      {sticky && <div ref={sentinelRef} aria-hidden style={{ height: 1 }} />}
    <div
      ref={cardRef}
      className={embedded
        ? 'w-full'
        : 'w-full border-b border-brand-200 shadow-card'}
      style={cardStyle}
    >
      {/* Top row (back · title · actions). Figma 343:5629 drops this row
          entirely in the stuck/compact state, so we collapse height +
          fade in lockstep to keep the parallax smooth. `aria-hidden` and
          `pointer-events: none` lock the buttons out while invisible.
          `embedded` skips this chrome when QueuePageShell owns the title. */}
      {!embedded && (
      <ButtonSizeAliasProvider size='sm'>
      <div
        aria-hidden={compact}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--dim-space-300, 12px)',
          /* Collapse animation needs hidden; expanded row must stay visible so
             header actions (BrandSubdueButton hover lift / focus ring) are not cropped. */
          overflow: compact ? 'hidden' : 'visible',
          maxHeight: compact ? 0 : 'var(--dim-size-1200, 56px)',
          opacity: compact ? 0 : 1,
          marginBottom: compact ? 0 : 'var(--dim-space-300, 12px)',
          pointerEvents: compact ? 'none' : 'auto',
          transition: `max-height ${T}, opacity ${T}, margin-bottom ${T}`,
        }}
      >
        {/* Back button — aliases Neutral Subdue Button (Figma PHCIS-ALL
            2373:119045: outline variant, leading chevron_left). */}
        {showBack && (
        <NeutralSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='chevron_left'
          onClick={handleBack}
        >
          กลับ
        </NeutralSubdueButton>
        )}
        <h1
          className='text-base text-ink'
          style={{ fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))' }}
        >
          {title}
        </h1>
        {actions && (
          <div className='ml-auto flex items-center gap-2'>{actions}</div>
        )}
      </div>
      </ButtonSizeAliasProvider>
      )}

      {/* Patient info gradient card — compact (Figma 343:5629 mini) or
          full (adapted from Figma 150:33649). Both modes keep the avatar,
          identity text, HN/VIP pills, and summary fields in one horizontal
          row. The product density aliases reduce the full avatar to 56px,
          the compact avatar to 40px, and both HN/VIP pills to 24px. The
          address is intentionally omitted here; it belongs in the medical
          record detail, not in the always-visible clinical safety card. */}
      <div
        className='w-full rounded-card flex'
        style={{
          backgroundImage:
            'linear-gradient(94.93deg, var(--patient-card-grad-start) 0.67%, var(--patient-card-grad-end) 100.76%)',
          flexDirection: 'row',
          flexWrap: compact ? 'wrap' : 'nowrap',
          alignItems: 'center',
          paddingLeft: 'var(--dim-space-300, 12px)',
          paddingRight: 'var(--dim-space-300, 12px)',
          paddingTop: compact ? 'var(--dim-space-100, 4px)' : 'var(--dim-space-300, 12px)',
          paddingBottom: compact ? 'var(--dim-space-100, 4px)' : 'var(--dim-space-300, 12px)',
          gap: 'var(--dim-space-300, 12px)',
          transition: `padding ${T}, gap ${T}, flex-direction ${T}`,
        }}
      >
        <div className='flex shrink-0 flex-wrap items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <div className='flex shrink-0 items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <div
            className='rounded-full overflow-hidden border-4 border-white bg-[color:var(--patient-card-avatar-bg)] shrink-0 flex items-center justify-center text-white'
            style={{
              /* Product density aliases the source 44/68px avatars to the
                 nearest smaller size tokens (40/56px). `border-box` keeps
                 the white ring inside the declared outer size. */
              width: compact ? 'var(--dim-size-800, 40px)' : 'var(--dim-size-1200, 56px)',
              height: compact ? 'var(--dim-size-800, 40px)' : 'var(--dim-size-1200, 56px)',
              boxSizing: 'border-box',
              transition: `width ${T}, height ${T}`,
            }}
          >
            {!imgError && patient?.avatarUrl ? (
              <img
                src={patient.avatarUrl}
                alt={patient.fullName}
                onError={() => setImgError(true)}
                className='w-full h-full object-cover'
              />
            ) : (
              <span
                aria-hidden
                style={{
                  fontFamily: 'var(--type-family-heading-content)',
                  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                  fontSize: compact ? 'var(--type-size-base, 16px)' : 'var(--type-size-xl, 20px)',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  transition: `font-size ${T}`,
                }}
              >
                {getInitials(patient)}
              </span>
            )}
          </div>
          <div className='flex flex-col text-white' style={{ width: compact ? 'auto' : 'var(--dim-size-2050, 144px)' }}>
            <p className='font-bold text-base leading-snug'>{patient.fullName}</p>
            <p className='text-sm leading-snug'>{patient.englishName}</p>
          </div>
          </div>
          <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span
              className='inline-flex items-center rounded-full bg-badge-greenBg text-badge-greenText font-medium'
              style={{
                height: 'var(--dim-size-500, 24px)',
                paddingLeft: 'var(--dim-space-200, 8px)',
                paddingRight: 'var(--dim-space-200, 8px)',
                fontSize: 'var(--type-size-xs, 12px)',
                transition: `height ${T}, padding ${T}, font-size ${T}`,
              }}
            >
              HN: {patient.hn}
            </span>
            {/* VN — เลขการมารับบริการของ visit ที่กำลังทำอยู่ แสดงต่อจาก HN
                เมื่อ caller ส่งมาเท่านั้น หน้าไหนที่ไม่มี visit เปิดอยู่ (หรือปิด
                เคสไปแล้ว) ก็แค่ไม่ส่ง `vn` มา (มติผู้ใช้ 28 ส.ค. 69) */}
            {patient.vn ? (
              <span
                className='inline-flex items-center rounded-full bg-badge-blueBg text-badge-blueText font-medium'
                style={{
                  height: 'var(--dim-size-500, 24px)',
                  paddingLeft: 'var(--dim-space-200, 8px)',
                  paddingRight: 'var(--dim-space-200, 8px)',
                  fontSize: 'var(--type-size-xs, 12px)',
                  transition: `height ${T}, padding ${T}, font-size ${T}`,
                }}
              >
                VN: {patient.vn}
              </span>
            ) : null}
            {patient.vip && (
              <span
                className='inline-flex items-center rounded-full bg-badge-redBg text-badge-redText font-medium'
                style={{
                  height: 'var(--dim-size-500, 24px)',
                  paddingLeft: 'var(--dim-space-200, 8px)',
                  paddingRight: 'var(--dim-space-200, 8px)',
                  fontSize: 'var(--type-size-xs, 12px)',
                  transition: `height ${T}, padding ${T}, font-size ${T}`,
                }}
              >
                VIP / ผู้ป่วยพิเศษ
              </span>
            )}
          </div>
        </div>

        {compact ? (
          <div
            className='flex flex-1 min-w-0 flex-wrap items-center justify-end text-white'
            style={{ columnGap: 'var(--dim-space-400, 16px)', rowGap: 'var(--dim-space-100, 4px)' }}
          >
            <Field label='สิทธิ์การรักษา' value={patient.insurance} />
            <Field label='หมู่เลือด' value={patient.bloodType} />
            <Field label='ประเภท' value={patient.patientType} />
            <Field label='แพทย์เจ้าของคนไข้' value={patient.doctor} />
          </div>
        ) : (
          <div
            className='flex flex-1 min-w-0 flex-nowrap items-start overflow-x-auto scrollbar-thin'
            style={{ gap: 'var(--dim-space-400, 16px)' }}
          >
            <Field label='เพศ' value={patient.sex} />
            <Field label='อายุ' value={patient.age} />
            <Field label='เลขบัตรประชาชน' value={patient.nationalId} />
            <Field label='หมู่เลือด' value={patient.bloodType} />
            <Field label='ประเภท' value={patient.patientType} />
            <Field label='แพทย์เจ้าของคนไข้' value={patient.doctor} minWidth={160} />
            <Field label='สิทธิ์การรักษา' value={patient.insurance} minWidth={220} />
          </div>
        )}
      </div>

      {/* Optional caller-supplied tag row (e.g. Observation's status/VN/
          nurse/admit-time) — sits in the white area below the gradient,
          same tier as the แพ้ยา/โรคประจำตัว row below. */}
      {tags && (
        <div
          className='flex w-full flex-wrap items-center'
          style={{ gap: 'var(--dim-space-100, 4px)', marginTop: 'var(--dim-space-200, 8px)' }}
        >
          {tags}
        </div>
      )}

      {/* Figma 150:33649 / 343:5629 — แพ้ยา + โรคประจำตัว row stays
         visible across all 7 treatment steps and across the parallax
         compact/full swap so clinicians never lose sight of allergies
         and chronic conditions while charting. */}
      {showAlertRow && (
        <div
          className='flex w-full flex-wrap items-center'
          style={{
            gap: 'var(--dim-space-400, 16px)',
            marginTop: compact ? 'var(--dim-space-200, 8px)' : 'var(--dim-space-300, 12px)',
            paddingBottom: 'var(--dim-space-300, 12px)',
            transition: `margin-top ${T}, padding-bottom ${T}`,
          }}
        >
          <AlertBadgeColumn label='แพ้ยา' items={allergiesList} compact={compact} />
          <AlertBadgeColumn label='โรคประจำตัว' items={diseasesList} compact={compact} />
          {showMedicalHistory && (
            /* shrink-0 + ml-auto keeps the button pinned to the end of the
               row no matter how many badges wrap above it */
            <div className='shrink-0 ml-auto self-center'>
              <BrandSubdueButton
                variant='outline'
                size='sm'
                leadingIcon='history'
                onClick={() => (onMedicalHistory ? onMedicalHistory(patient) : setHistoryOpen(true))}
              >
                ประวัติการรักษา
              </BrandSubdueButton>
            </div>
          )}
        </div>
      )}

      {historyOpen && (
        <React.Suspense fallback={null}>
          <MedicalHistoryPopupLazy open onClose={() => setHistoryOpen(false)} patient={patient} />
        </React.Suspense>
      )}
    </div>
    </>
  );
};

export default PatientCard;
