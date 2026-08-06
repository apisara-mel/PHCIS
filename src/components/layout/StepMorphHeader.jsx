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
}) => {
  if (dense) {
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
              ...morphStepHeaderTitleWrapDenseStyle,
            }}
          >
            <h1 style={morphTopicTitleDenseStyle}>{title}</h1>
            {afterTitle}
          </div>
        )}
        <div style={hideTitle ? morphStepOnlyAreaDenseStyle : morphStepHeaderStepAreaDenseStyle}>
          <div style={hideTitle ? morphStepOnlyGlideDenseStyle : morphStepHeaderStepGlideDenseStyle}>
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
