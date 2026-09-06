import React from 'react';
import { useHistory, useParams } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SummaryCardsBar from '@/components/layout/SummaryCardsBar';
import CommunityLayout from './CommunityLayout';
import { CommunityCard, CommunityComingSoon } from './communityShared';
import { CHC_STATUS_META, getChcById } from './communityChcData';

/* รายละเอียดศูนย์สุขภาพชุมชน — ported from claude/Community chc-detail.html.
   Read-only view: PHCIS_Header_Summary Card Register (status + 4 stat
   tiles) → ข้อมูลทั่วไป (dl list) → ชุมชนที่รับผิดชอบ. The prototype's
   interactive GIS pin map (drag/zoom/layers/popovers) is intentionally
   NOT rebuilt here — same call as CommunityDashboardPage's MapTeaserCard:
   the real map lives on its own page (/community-health/gis), this card
   only teases it so we don't duplicate a second map widget implementation. */

const InfoRow = ({ label, value }) => (
  <div
    className='flex items-start justify-between'
    style={{
      gap: 'var(--dim-space-400, 16px)',
      paddingTop: 'var(--dim-space-300, 12px)',
      paddingBottom: 'var(--dim-space-300, 12px)',
      borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
    }}
  >
    <dt
      style={{
        flex: '0 0 auto',
        minWidth: 180,
        color: 'var(--text-content-tertiary, #8A9099)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
      }}
    >
      {label}
    </dt>
    <dd
      style={{
        margin: 0,
        flex: '1 1 auto',
        textAlign: 'right',
        color: 'var(--text-content-default, #363B3F)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-medium, 500)',
      }}
    >
      {value}
    </dd>
  </div>
);

const CardTitle = ({ children }) => (
  <p
    style={{
      margin: 0,
      fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-title, var(--type-weight-medium, 500))',
      color: 'var(--text-topic-tertiary-title, #363B3F)',
    }}
  >
    {children}
  </p>
);

const CommunityRow = ({ community }) => (
  <div
    className='flex items-center justify-between'
    style={{
      gap: 'var(--dim-space-400, 16px)',
      padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-300, 10px)',
      background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
    }}
  >
    <span
      className='inline-flex items-center'
      style={{
        gap: 'var(--dim-space-200, 8px)',
        color: 'var(--text-brandPrimary-default, #007549)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-medium, 500)',
      }}
    >
      <Icon name='holiday_village' size={16} />
      {community.name}
    </span>
    <span style={{ color: 'var(--text-content-tertiary, #8A9099)', fontSize: 'var(--type-size-xs, 12px)' }}>
      {community.district} {community.subdistrict}
    </span>
  </div>
);

const NotFoundCard = () => (
  <CommunityCard>
    <CommunityComingSoon title='ไม่พบข้อมูลศูนย์สุขภาพชุมชนนี้' />
  </CommunityCard>
);

const ChcDetailPage = () => {
  const { id } = useParams();
  const history = useHistory();
  const chc = getChcById(id);

  if (!chc) {
    return (
      <CommunityLayout activeKey='community' breadcrumb={['ข้อมูลชุมชน', 'ข้อมูลศูนย์สุขภาพชุมชน', 'รายละเอียด']}>
        <NotFoundCard />
      </CommunityLayout>
    );
  }

  const statusMeta = CHC_STATUS_META[chc.status];

  const summaryCards = [
    { key: 'communities', color: 'info', icon: 'holiday_village', value: String(chc.communities.length), label: 'จำนวนชุมชนที่รับผิดชอบ', indicator: null, indicatorIcon: null },
    { key: 'volunteers', color: 'positive', icon: 'volunteer_activism', value: String(chc.volunteerCount), label: 'จำนวน อสส.', indicator: null, indicatorIcon: null },
    { key: 'population', color: 'destructive', icon: 'groups', value: chc.population.toLocaleString('th-TH'), label: 'ประชากรในพื้นที่รับผิดชอบ', indicator: null, indicatorIcon: null },
    { key: 'households', color: 'positive', icon: 'home', value: chc.households.toLocaleString('th-TH'), label: 'ครัวเรือนในพื้นที่รับผิดชอบ', indicator: null, indicatorIcon: null },
  ];

  return (
    <CommunityLayout
      activeKey='community'
      breadcrumb={['ข้อมูลชุมชน', 'ข้อมูลศูนย์สุขภาพชุมชน', chc.name]}
      headerActions={(
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <NeutralSubdueButton
            size='md'
            leadingIcon='arrow_back'
            onClick={() => history.push('/community-health/chc')}
          >
            กลับ
          </NeutralSubdueButton>
          <h1
            className='flex-1'
            style={{
              margin: 0,
              fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
              fontSize: 'var(--type-size-lg, 18px)',
              fontWeight: 'var(--type-weight-title, var(--type-weight-medium, 500))',
              color: 'var(--text-topic-tertiary-title, #363B3F)',
            }}
          >
            {chc.name}
          </h1>
          {statusMeta && (
            <ColorfulBadge style={statusMeta.tone} size='default' hierarchy='secondary' width='hug' showDot>
              {statusMeta.label}
            </ColorfulBadge>
          )}
        </div>
      )}
    >
      <SummaryCardsBar cards={summaryCards} variant='panel' detached />

      <div
        className='grid'
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--dim-space-600, 24px)' }}
      >
        <CommunityCard>
          <CardTitle>ข้อมูลทั่วไป</CardTitle>
          <dl style={{ margin: 0 }}>
            <InfoRow label='รหัสศูนย์สุขภาพชุมชน' value={chc.code} />
            <InfoRow label='ชื่อศูนย์สุขภาพชุมชน' value={chc.name} />
            <InfoRow label='เขต' value={chc.district} />
            <InfoRow label='แขวง' value={chc.subdistrict} />
            <InfoRow label='ที่อยู่' value={chc.address} />
            <InfoRow label='พื้นที่รับผิดชอบ' value={chc.coverageArea} />
          </dl>
        </CommunityCard>

        <CommunityCard>
          <CardTitle>{`ชุมชนที่รับผิดชอบ (${chc.communities.length} ชุมชน)`}</CardTitle>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {chc.communities.map((c) => (
              <CommunityRow key={c.name} community={c} />
            ))}
          </div>
        </CommunityCard>
      </div>

      {/* Map teaser — see file-header note; the real interactive GIS map
          (pins, layers, zoom, popovers) lives on its own page. */}
      <CommunityCard style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <div className='flex items-center justify-between'>
          <CardTitle>ตำแหน่งบนแผนที่</CardTitle>
          <button
            type='button'
            onClick={() => history.push('/community-health/gis')}
            className='inline-flex items-center'
            style={{
              gap: 'var(--dim-space-100, 4px)',
              background: 'none',
              border: 0,
              padding: 0,
              cursor: 'pointer',
              color: 'var(--text-brandPrimary-default, var(--brand-p700, #007549))',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-medium, 500)',
            }}
          >
            ดูแผนที่เต็ม
            <Icon name='arrow_forward' size={16} />
          </button>
        </div>
        <div
          className='flex flex-col items-center justify-center w-full'
          style={{
            minHeight: 220,
            borderRadius: 'var(--dim-radius-400, 12px)',
            background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
            border: 'var(--dim-stroke-100, 1px) dashed var(--border-brandPrimary-quaternary, #E2F3EB)',
            gap: 'var(--dim-space-200, 8px)',
          }}
        >
          <Icon name='location_on' size={32} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
          <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-sm, 14px)' }}>
            {`${chc.name} — ${chc.lat.toFixed(4)}, ${chc.lng.toFixed(4)}`}
          </span>
        </div>
      </CommunityCard>
    </CommunityLayout>
  );
};

export default ChcDetailPage;
