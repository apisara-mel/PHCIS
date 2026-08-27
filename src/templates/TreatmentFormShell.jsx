import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import RecordWizardMorphBand, { MORPH_STICKY_BELOW_PATIENT } from '@/components/layout/RecordWizardMorphBand';
import { MIH_CHROME_MORPH_FOOTER, MIH_STEP_BODY_ENTER } from '@/components/layout/wizardChromeMorphStyles';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import InternalReferPopup from '@/components/popup/InternalReferPopup';

/* MIH TreatmentFormShell — Figma PHCIS | Medical-examination 317:29773.
   RecordWizardMorphBand (scroll-morph stepper) + unified step card body +
   sticky footer. Header + PatientCard live on the parent form page. */

export const TREATMENT_STEPS = [
  { title: 'ประวัติการรักษา', subtitle: 'Medical History' },
  { title: 'คัดกรองและซักประวัติ', subtitle: 'Screening' },
  { title: 'ตรวจร่างกาย', subtitle: 'Physical Examination' },
  { title: 'วินิจฉัย', subtitle: 'Diagnosis' },
  { title: 'สั่งการรักษา', subtitle: 'Treatment Order' },
  { title: 'นัดหมาย', subtitle: 'Appointment' },
  { title: 'ใบรับรองแพทย์', subtitle: 'Medical Certificate' },
];

export const TREATMENT_STEP_LABELS = TREATMENT_STEPS.map((s) => s.title);

/* ความยาวการเลื่อนตอนสลับ step — ล้อกับ --motion-duration-calendar (320ms)
   ซึ่งเป็นจังหวะเดียวกับ keyframe จางเข้าของเนื้อหา step */
const STEP_SCROLL_MS = 320;

const Footer = ({
  stepIndex, steps, onPrev, onCancel, onNext, onSave, isLast,
  draftStatusText = 'ยังไม่มีร่างที่บันทึก', draftDirty = false, draftSaving = false,
}) => {
  /* Primary CTA label — Figma PHCIS pattern: "ถัดไป: [next step]" so the
     clinician sees where they're heading without re-reading the stepper.
     Last step swaps the forward label for the explicit commit action. */
  const nextStepLabel = isLast
    ? 'จบการบันทึก'
    : `ถัดไป: ${steps[stepIndex + 1].title}`;
  const isFirst = stepIndex === 0;

  /* Footer chrome — Figma PHCIS | Medical-examination 330:42666.
     Aliases the brand-tinted footer treatment used across PHCIS pages:
       • borderTop  → --border-brandPrimary-quaternary (#E2F3EB)
                      (not --border-card-default — that's the card grey)
       • shadow     → Brand Drop Shadow Bottom/100 — 1 px brand-green
                      glow above the bar so it floats off the form card
       • bg surface → --surface-navigation-default (same white as the
                      main app chrome — separates the action row from
                      the form's card-100 surface).
     The "บันทึกร่าง" button uses Brand Subdue outline (#C5EDDA border,
     #007549 text) per Figma — not NeutralSubdue. Same pattern as
     FormShell's footer so the two shells render identical action bars.
     mih-step-form: auto-save chip from step 2+; last primary uses check. */
  return (
    <div className={`flex items-center w-full ${MIH_CHROME_MORPH_FOOTER}`} style={{
      gap: 'var(--dim-space-300)',
      padding: 'var(--dim-space-400) var(--dim-space-600)',
      borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      background: 'var(--surface-navigation-default)',
      boxShadow: '0 -1px 2px var(--PrimaryShadow-600, rgba(8, 167, 104, 0.08))',
      position: 'sticky',
      bottom: 'var(--dim-space-0)',
    }}>
      <NeutralSubdueButton
        size='lg'
        leadingIcon={isFirst ? undefined : 'arrow_back'}
        onClick={onPrev}
        className='shrink-0'
      >
        {isFirst ? 'ยกเลิก' : 'ย้อนกลับ'}
      </NeutralSubdueButton>
      {/* ตั้งแต่ step 2 เป็นต้นไป ปุ่มซ้ายกลายเป็น "ย้อนกลับ" — ผู้ใช้จึงไม่เหลือ
          ทางออกจากฟอร์ม ใส่ "ยกเลิก" ต่อท้ายไว้ (มติผู้ใช้ 27 ส.ค. 69)
          ทำเหมือนกันทุกระบบที่ใช้ฟอร์มแบบ step */}
      {!isFirst && (
        <NeutralSubdueButton
          size='lg'
          variant='outline'
          onClick={onCancel}
          className='shrink-0'
        >
          ยกเลิก
        </NeutralSubdueButton>
      )}
      {!isFirst && (
        <span
          role='status'
          aria-live='polite'
          className='inline-flex items-center min-w-0'
          style={{
          gap: 'var(--dim-space-200)',
          color: 'var(--text-content-secondary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          }}
        >
          <span style={{
            width: 'var(--dim-space-150)',
            height: 'var(--dim-space-150)',
            borderRadius: 'var(--dim-radius-full)',
            background: draftDirty
              ? 'var(--text-warning-default)'
              : 'var(--text-brandPrimary-default)',
            flexShrink: 0,
          }} />
          {draftStatusText}
        </span>
      )}
      <div className='flex-1' />
      {/* All three buttons render at h44 (size='lg') per Figma 330:42666 —
          smaller md (36 px) sizes break the action-row rhythm against
          the 44 px primary CTA. */}
      <BrandSubdueButton
        variant='outline'
        size='lg'
        leadingIcon='save'
        onClick={onSave}
        disabled={!onSave || !draftDirty || draftSaving}
      >
        บันทึกร่าง
      </BrandSubdueButton>
      <BrandPrimaryButton size='lg' trailingIcon={isLast ? 'check' : 'arrow_forward'} onClick={onNext}>
        {nextStepLabel}
      </BrandPrimaryButton>
    </div>
  );
};

const TreatmentFormShell = ({
  stepIndex, onStepChange, completedSteps, children,
  /* Overridable for non-OPD sub-departments (e.g. ANC) that reuse this
     shell with their own step titles + queue route — defaults keep OPD's
     TreatmentFormPage behaviour unchanged. */
  steps = TREATMENT_STEPS,
  queuePath = '/treat/queue',
  morphTitle,
  hideMorphTitle = false,
  morphStickyTop = MORPH_STICKY_BELOW_PATIENT,
  /* ขั้นที่เนื้อหาเป็นการ์ดของตัวเองอยู่แล้ว (เช่น ตรวจร่างกาย · SOAP Note ของ
     CPOE) ส่งชุด index มาที่นี่ แล้วเปลือกจะไม่วางการ์ดขาวซ้อนให้อีก
     (มติผู้ใช้ 28 ส.ค. 69 — เดิมเห็นเป็นการ์ดในการ์ด) */
  plainBodySteps = [],
  /** Optional persistent clinical summary rendered beside every step. */
  sidePanel = null,
  sidePanelCollapsed = false,
  /* OPD's Step 1 brings its own ServiceDateList rail flush against the
     card's left edge, so it opts out of the 24px body padding — that's an
     OPD-specific layout quirk, not a general "step 1" rule. Sub-departments
     without that rail (e.g. ANC) pass `step0FlushLeft={false}` to keep the
     same 24px padding Step 1 gets in every other step. */
  step0FlushLeft = true,
  /** Optional leave handler for step 0 (ยกเลิก) — e.g. unsaved-changes guard. */
  onLeave,
  /** Optional บันทึกร่าง handler — wired to the sticky footer save button. */
  onSaveDraft,
  /** Truthful draft state shown in the footer; never a fabricated timestamp. */
  draftStatusText,
  draftDirty = false,
  draftSaving = false,
  /** Shown as "จากแผนก" in the last-step internal-refer popup. */
  fromDepartment,
  /** Called after internal-refer confirm, before navigating to queuePath.
      Return false to skip the default history.push(queuePath). */
  onFinish,
  /** Return false to keep the user on the form before opening final refer. */
  onBeforeFinish,
}) => {
  const history = useHistory();
  const [referOpen, setReferOpen] = useState(false);
  const bandRef = useRef(null);
  const bodyRef = useRef(null);
  const lastStepIndex = useRef(stepIndex);
  const isLast = stepIndex === steps.length - 1;

  /* เปลี่ยน step แล้วต้องกลับไปเริ่มที่หัวของ step ใหม่เสมอ — ไม่งั้นผู้ใช้ที่
     เลื่อนลงไปกลางฟอร์มอยู่ จะโดนสลับเนื้อหาใต้ตีนตัวเองแล้วโผล่กลางหน้า
     อ่านไม่รู้เรื่อง เลื่อนให้ขอบบนการ์ดมาจอดใต้แถบ stepper พอดี
     (อ่านค่า sticky `top` + ความสูงจริงของแถบ แทนการฮาร์ดโค้ดความสูง chrome)

     tween เองด้วย rAF แทน `scrollTo({behavior:'smooth'})` เพราะ native smooth
     คุม duration ไม่ได้ — ต้องให้จบพร้อม keyframe จางเข้าของเนื้อหา step */
  useEffect(() => {
    if (lastStepIndex.current === stepIndex) return;
    lastStepIndex.current = stepIndex;
    if (typeof window === 'undefined') return;
    const body = bodyRef.current;
    if (!body) return;

    const band = bandRef.current?.firstElementChild;
    const bandTop = band ? parseFloat(window.getComputedStyle(band).top) || 0 : 0;
    const chromeBottom = bandTop + (band ? band.offsetHeight : 0);
    const start = window.scrollY;
    const target = Math.max(
      0,
      start + body.getBoundingClientRect().top - chromeBottom,
    );
    const delta = target - start;
    if (Math.abs(delta) < 2) return undefined;

    /* ข้ามแอนิเมชันเมื่อผู้ใช้ขอลดการเคลื่อนไหว หรือแท็บถูกซ่อนอยู่
       (แท็บพื้นหลังไม่ได้รับ animation frame เลย ถ้ายัง tween จะไม่เลื่อนเลย
       แล้วพอผู้ใช้กลับมาก็ยังค้างกลางฟอร์มเหมือนเดิม) */
    const skipMotion = document.hidden
      || (typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (skipMotion) {
      window.scrollTo(0, target);
      return undefined;
    }

    let cancelled = false;
    /* ผู้ใช้ขยับล้อ/นิ้วเมื่อไหร่ ให้ยกเลิกทันที — อย่าแย่ง scroll กับคน */
    const cancel = () => { cancelled = true; };
    window.addEventListener('wheel', cancel, { passive: true });
    window.addEventListener('touchstart', cancel, { passive: true });

    const t0 = window.performance.now();
    const step = (now) => {
      if (cancelled) return;
      const p = Math.min(1, (now - t0) / STEP_SCROLL_MS);
      /* out-cubic — โค้ง "settle ไม่กระชาก" เดียวกับ --motion-easing-enter */
      window.scrollTo(0, start + delta * (1 - (1 - p) ** 3));
      if (p < 1) window.requestAnimationFrame(step);
    };
    const raf = window.requestAnimationFrame(step);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.removeEventListener('wheel', cancel);
      window.removeEventListener('touchstart', cancel);
    };
  }, [stepIndex]);

  const stepTitle = typeof steps[stepIndex] === 'string'
    ? steps[stepIndex]
    : steps[stepIndex]?.title;
  const headerTitle = morphTitle ?? stepTitle ?? 'บันทึกการรักษา';
  const referFromDepartment = fromDepartment || headerTitle || 'ระบบบันทึกการรักษา';
  /* ออกจากฟอร์ม — เส้นทางเดียวกับปุ่ม "ยกเลิก" ตอนอยู่ step แรก */
  const handleLeave = () => {
    if (onLeave) onLeave();
    else history.push(queuePath);
  };
  const handlePrev = () => {
    if (stepIndex === 0) handleLeave();
    else onStepChange(stepIndex - 1);
  };
  const handleNext = () => {
    if (isLast) {
      if (onBeforeFinish?.() === false) return;
      setReferOpen(true);
    }
    else onStepChange(stepIndex + 1);
  };
  const handleReferConfirm = (payload) => {
    setReferOpen(false);
    const cont = onFinish?.(payload);
    if (cont === false) return;
    history.push(queuePath);
  };

  return (
    <main className='flex-1 min-w-0 flex flex-col' style={{
      background: 'var(--background-screen-brand-100, #F4FBF8)',
    }}>
      {/* `display: contents` — ตัวห่อไว้จับ ref ของแถบ stepper เท่านั้น
         ไม่กินกล่องจริง แถบ sticky จึงยังยึดกับ <main> เหมือนเดิม */}
      <div ref={bandRef} style={{ display: 'contents' }}>
        <RecordWizardMorphBand
          title={headerTitle}
          steps={steps}
          current={stepIndex}
          completedSteps={completedSteps}
          onStepClick={onStepChange}
          stickyTop={morphStickyTop}
          hideTitle={hideMorphTitle}
        />
      </div>
      <div ref={bodyRef} className='flex-1 flex flex-col min-h-0' style={{
        padding: 'var(--dim-space-600)',
        gap: 'var(--dim-space-400)',
      }}>
        <div className={sidePanel ? 'mih-treatment-shell-layout' : 'flex flex-col flex-1 min-h-0'}>
        <div
          className='mih-treatment-shell-main flex flex-col w-full flex-1 min-h-0'
          style={plainBodySteps.includes(stepIndex)
            ? { overflow: 'visible' }
            : {
              borderRadius: 'var(--dim-radius-500)',
              background: 'var(--surface-card-100)',
              boxShadow: 'var(--shadow-brand-drop-bottom-200)',
              overflow: 'hidden',
            }}
        >
          {/* Step 1 brings its own ServiceDateList rail flush against the
              card's left edge, so it opts out of the 24px body padding.
              Steps 2–7 — Figma PHCIS treatment card body floor: min 640 px. */}
          {/* `key={stepIndex}` รีสตาร์ท keyframe ทุกครั้งที่เปลี่ยน step —
              เนื้อหา step ใหม่จึงค่อย ๆ จางขึ้นแทนการตัดภาพดิบ ๆ */}
          <div
            key={stepIndex}
            className={[
              stepIndex === 0 && step0FlushLeft ? '' : 'flex flex-1 flex-col min-h-0',
              MIH_STEP_BODY_ENTER,
            ].filter(Boolean).join(' ')}
            style={
              stepIndex === 0 && step0FlushLeft
                ? undefined
                : {
                    /* ขั้นที่เนื้อหาเป็นการ์ดเอง — ตัวห่อชั้นนอกเว้น 24px ให้แล้ว
                       ถ้าเว้นอีกชั้นจะกลายเป็น 48px (มติผู้ใช้ 28 ส.ค. 69) */
                    padding: plainBodySteps.includes(stepIndex) ? 0 : 'var(--dim-space-600)',
                    minHeight: 640,
                  }
            }
          >
            {children}
          </div>
        </div>
        {sidePanel && (
          <aside
            className={`mih-treatment-screening-rail${sidePanelCollapsed ? ' is-collapsed' : ''}`}
            aria-label='สรุปคัดกรองและซักประวัติ'
          >
            {sidePanel}
          </aside>
        )}
        </div>
      </div>

      <Footer
        stepIndex={stepIndex}
        steps={steps}
        onPrev={handlePrev}
        /* "ยกเลิก" = ออกจากฟอร์มเลย เท่ากับกด "ยกเลิก" ตอนอยู่ step แรก */
        onCancel={handleLeave}
        onNext={handleNext}
        onSave={onSaveDraft}
        isLast={isLast}
        draftStatusText={draftStatusText}
        draftDirty={draftDirty}
        draftSaving={draftSaving}
      />

      <InternalReferPopup
        open={referOpen}
        onClose={() => setReferOpen(false)}
        onConfirm={handleReferConfirm}
        fromDepartment={referFromDepartment}
        subtitle='เลือกแผนกและจุดบริการปลายทางก่อนจบการบันทึก'
      />
    </main>
  );
};

export default TreatmentFormShell;
