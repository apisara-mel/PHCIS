import React from 'react';
import {
  morphStepHeaderRootDenseStyle,
  morphStepHeaderRootStyle,
  morphStepHeaderStepAreaDenseStyle,
  morphStepHeaderStepGlideDenseStyle,
  morphStepHeaderStepWrapStyle,
  morphStepHeaderTitleWrapDenseStyle,
  morphStepHeaderTitleWrapStyle,
  morphStepOnlyAreaDenseStyle,
  morphStepOnlyGlideDenseStyle,
  morphStepOnlyRootDenseStyle,
  morphStepScaleStyle,
  morphTopicTitleDenseStyle,
  morphTopicTitleStyle,
  morphStepHeaderTitleWrapInlineStyle,
  morphStepHeaderStepAreaInlineStyle,
  morphStepHeaderStepGlideInlineStyle,
} from '@/components/layout/headerMorphStyles';

/** Sticky wizard header — title + stepper morph together on scroll.
    Default: title full row · stepper below, then inline on scroll.
    `dense` — consent wizard: stepper glides from centred below title to the right.
    `hideTitle` — stepper-only band (SubHeader owns title): centred scale shrink. */
const StepMorphHeader = ({
  title,
  afterTitle,
  children,
  className = '',
  dense = false,
  /** When true, render only the stepper slot — page title lives in SubHeader. */
  hideTitle = false,
  /** Keep the stepper on its own row for the whole morph (record wizards).

      Why: the glide choreography (`stepper ย้ายจากใต้ title ไปอยู่ขวาของ title`)
      ทำงานด้วย flex-wrap — พอ `flex-basis` ของช่อง stepper หดจนพอดีบรรทัด
      เดียวกับ title มันจะ **พลิกแถวในเฟรมเดียว** วัดได้ว่าเด้ง 23px ขึ้น +
      86px ไปขวา ที่ `--header-morph ≈ 0.22` เลยกระตุกทุกครั้งที่ scroll
      ผ่านจุดนั้น (ทั้งขึ้นและลง). ฟอร์มบันทึกการรักษามี step เยอะและผู้ใช้
      เลื่อนขึ้นลงตลอด จึงให้ stepper อยู่แถวตัวเองแล้วย่อด้วย scale อย่างเดียว
      — ไม่มีการพลิกแถว = ต่อเนื่องทุกค่า morph.
      Consent wizard ยังใช้ glide เดิม (ส่ง prop นี้เป็น false) */
  stepperOwnRow = false,
  /** Title กับ stepper อยู่แถวเดียวกันตั้งแต่ยังไม่ scroll — ไม่ต้องรอ morph
      พาขึ้นมา (มติผู้ใช้ 25 ส.ค. 69 · consent wizard) */
  stepperSameRow = false,
}) => {
  if (dense) {
    /* stepper แถวตัวเอง: ใช้ชุด style เดียวกับโหมด stepper-only (scale ล้วน)
       แต่ยังคงแถว title ไว้ด้านบน */
    const stepperOnlyRow = stepperOwnRow && !hideTitle;
    const inlineRow = stepperSameRow && !hideTitle && !stepperOnlyRow;
    return (
      <div
        className={`w-full ${className}`}
        style={hideTitle ? morphStepOnlyRootDenseStyle : morphStepHeaderRootDenseStyle}
      >
        {!hideTitle && (
          <div
            className='flex items-center flex-wrap shrink-0 min-w-0'
            style={{
              gap: 'var(--dim-space-200)',
              ...(inlineRow ? morphStepHeaderTitleWrapInlineStyle : morphStepHeaderTitleWrapDenseStyle),
              /* กินเต็มแถว — ช่อง stepper จึงไม่มีวันขึ้นมาต่อท้าย title */
              ...(stepperOnlyRow ? { flex: '1 1 100%', maxWidth: '100%', paddingRight: 0 } : null),
            }}
          >
            <h1 style={morphTopicTitleDenseStyle}>{title}</h1>
            {afterTitle}
          </div>
        )}
        <div style={hideTitle || stepperOnlyRow
          ? morphStepOnlyAreaDenseStyle
          : (inlineRow ? morphStepHeaderStepAreaInlineStyle : morphStepHeaderStepAreaDenseStyle)}
        >
          <div style={hideTitle || stepperOnlyRow
            ? morphStepOnlyGlideDenseStyle
            : (inlineRow ? morphStepHeaderStepGlideInlineStyle : morphStepHeaderStepGlideDenseStyle)}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  if (hideTitle) {
    return (
      <div
        className={`w-full flex items-center justify-center ${className}`}
        style={{
          ...morphStepHeaderRootStyle,
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
      >
        <div className='flex min-w-0 w-full items-center justify-center' style={morphStepScaleStyle}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full flex flex-wrap items-center ${className}`}
      style={{
        ...morphStepHeaderRootStyle,
        willChange: 'transform',
        backfaceVisibility: 'hidden',
      }}
    >
      <div
        className='flex items-center flex-wrap shrink-0 min-w-0'
        style={{
          gap: 'var(--dim-space-200)',
          ...morphStepHeaderTitleWrapStyle,
        }}
      >
        <h1 style={morphTopicTitleStyle}>{title}</h1>
        {afterTitle}
      </div>
      <div
        className='flex min-w-0 flex-1 items-center'
        style={morphStepHeaderStepWrapStyle}
      >
        <div
          className='flex min-w-0 justify-center'
          style={morphStepScaleStyle}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default StepMorphHeader;
