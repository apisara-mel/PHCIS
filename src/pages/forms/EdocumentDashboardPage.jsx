import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { Donut } from '@/components/graph/Charts';
import { PHCIS_CHART, PHCIS_CHART_PALETTE } from '@/data/phcisChartPalette';
import { FORM_CATEGORIES, FORMS, getFormsByCategory } from '@/data/formsLibrary';
import EDOCUMENT_NAV, { EDOCUMENT_BRAND_TITLE } from '@/pages/forms/edocumentNav';

const CARD_STYLE = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};

const TITLE_TEXT = {
  color: 'var(--text-brandPrimary-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.4,
};

const CATEGORY_COLORS = {
  consent: PHCIS_CHART.teal,
  assessment: PHCIS_CHART.indigo,
  report: PHCIS_CHART.yellow,
  survey: PHCIS_CHART.pink,
};

export default function EdocumentDashboardPage() {
  const history = useHistory();

  const categorySegments = useMemo(
    () => FORM_CATEGORIES.map((cat, i) => ({
      label: cat.label,
      value: getFormsByCategory(cat.key).length,
      color: CATEGORY_COLORS[cat.key] || PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
    })).filter((s) => s.value > 0),
    [],
  );

  const totalForms = FORMS.length;
  const categoryCount = FORM_CATEGORIES.length;

  const summaryCards = [
    {
      key: 'total',
      icon: 'folder_open',
      color: 'info',
      value: String(totalForms),
      label: 'เอกสาร e-document ทั้งหมด',
      indicator: `${categoryCount} หมวดหมู่`,
    },
    {
      key: 'consent',
      icon: 'verified_user',
      color: 'positive',
      value: String(getFormsByCategory('consent').length),
      label: 'แบบฟอร์มยินยอมทางการแพทย์',
    },
    {
      key: 'assessment',
      icon: 'fact_check',
      color: 'info',
      value: String(getFormsByCategory('assessment').length),
      label: 'แบบฟอร์มประเมิน',
    },
    {
      key: 'survey',
      icon: 'assignment',
      color: 'warning',
      value: String(getFormsByCategory('survey').length + getFormsByCategory('report').length),
      label: 'แบบสอบถาม / รายงาน',
    },
  ];

  const segmentTotal = categorySegments.reduce((sum, s) => sum + s.value, 0);

  return (
    <QueuePageShell
      activeKey='edocument-dashboard'
      sidebarItems={EDOCUMENT_NAV}
      sidebarFallbackKey='edocument-dashboard'
      brandTitle={EDOCUMENT_BRAND_TITLE}
      breadcrumb={['แดชบอร์ด']}
      title='แดชบอร์ด'
      actions={(
        <>
          <NeutralSubdueButton
            variant='outline'
            size='md'
            leadingIcon='folder_open'
            onClick={() => history.push('/forms')}
          >
            ดูคลังทั้งหมด
          </NeutralSubdueButton>
          <BrandButton
            size='md'
            leadingIcon='note_add'
            onClick={() => history.push('/doc-template/new')}
          >
            สร้างเอกสารใหม่
          </BrandButton>
        </>
      )}
      summaryCards={summaryCards}
      summaryTitle='ภาพรวมคลังเอกสาร e-document'
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        <section className='flex flex-col w-full' style={{ ...CARD_STYLE, gap: 'var(--dim-space-400)' }}>
          <h2 style={TITLE_TEXT}>เอกสารแยกตามหมวดหมู่</h2>
          <div className='flex flex-wrap items-start' style={{ gap: 'var(--dim-space-600)' }}>
            <Donut
              segments={categorySegments}
              centerLabel={String(segmentTotal)}
              centerSub='เอกสาร'
              size={200}
            />
            <div className='flex flex-col flex-1 min-w-[200px]' style={{ gap: 'var(--dim-space-200)' }}>
              {categorySegments.map((seg) => (
                <div
                  key={seg.label}
                  className='flex items-center justify-between'
                  style={{ gap: 'var(--dim-space-300)' }}
                >
                  <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 'var(--dim-radius-full)',
                        background: seg.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      className='truncate'
                      style={{
                        color: 'var(--text-content-default)',
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-sm)',
                      }}
                    >
                      {seg.label}
                    </span>
                  </div>
                  <span
                    style={{
                      color: 'var(--text-content-secondary)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm)',
                      flexShrink: 0,
                    }}
                  >
                    {seg.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
          {FORM_CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              className='flex flex-col flex-1'
              style={{
                ...CARD_STYLE,
                minWidth: 'min(100%, 240px)',
                gap: 'var(--dim-space-200)',
              }}
            >
              <span style={TITLE_TEXT}>{cat.label}</span>
              <span
                style={{
                  color: 'var(--text-content-tertiary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                  lineHeight: 1.5,
                }}
              >
                {cat.description}
              </span>
              <span
                style={{
                  color: 'var(--text-content-default)',
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-lg)',
                }}
              >
                {getFormsByCategory(cat.key).length}
                {' '}
                เอกสาร
              </span>
            </div>
          ))}
        </section>
      </div>
    </QueuePageShell>
  );
}
