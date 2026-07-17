import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  Sym,
  BrandButton,
} from '@/components/mobile';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import MobileIconBadge from '@/components/mobile/MobileIconBadge';
import { MOBILE_SERVICE_META } from '@/components/mobile/mobileIconTones';
import { BILLS, resolveDoctorAvatar } from '@/data/mobileMock';
import { usePhcisLink } from '@/data/phcisLink';

/* BMA Health · History — Figma 284:33170.
   The "ครรภ์/เด็ก" tab follows annotation 371:55950:
   ANC visits, child growth, development, and immunizations. */

const TYPE_FILTERS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'video', label: 'เข้ารับบริการออนไลน์' },
  { key: 'visit', label: 'เข้ารับที่ศูนย์บริการ' },
];

const SegmentTab = ({ active, onClick, children }) => (
  <button
    type='button'
    onClick={onClick}
    style={{
      height: 'var(--dim-size-1000, 48px)',
      padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-full)',
      border: 0,
      background: active ? 'var(--surface-card-100, #FFFFFF)' : 'transparent',
      color: 'var(--text-brandPrimary-default, #007549)',
      fontFamily: 'var(--type-family-heading-graphic2)',
      fontSize: 'var(--type-size-lg, 18px)',
      fontWeight: 'var(--type-weight-regular, 400)',
      lineHeight: 1.5,
      boxShadow: active ? 'var(--shadow-brand-drop-top-100)' : 'none',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </button>
);

const FilterChip = ({ active, onClick, children }) => (
  <button
    type='button'
    onClick={onClick}
    style={{
      flexShrink: 0,
      height: 'var(--dim-size-800, 40px)',
      minWidth: 'var(--dim-size-800, 40px)',
      padding: '0 var(--dim-space-300, 12px)',
      borderRadius: 'var(--dim-radius-full)',
      border: active
        ? 'var(--dim-stroke-100, 1px) solid var(--border-brandtag-selected, #C5EDDA)'
        : 'var(--dim-stroke-100, 1px) solid var(--border-brandtag-default, #E2E4E6)',
      background: active
        ? 'var(--surface-brandtag-selected, #F4FBF8)'
        : 'var(--surface-card-100, #FFFFFF)',
      color: active
        ? 'var(--text-brandtag-selected, #007549)'
        : 'var(--text-brandtag-default, #4D5358)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-medium, 500)',
      lineHeight: 1.5,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </button>
);

const DateHeader = ({ label }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
    {/* Archive Figma 194:153538 — Colorful icon Badge · Purple · Medium · Calendar */}
    <ColorfulIconBadge style='purple' size='medium' icon='calendar' />
    <span style={{
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-bold, 700)',
      lineHeight: 1.5,
      color: 'var(--text-content-default, #363B3F)',
    }}
    >
      {label}
    </span>
  </div>
);

const VisitCard = ({ visit, onOpen, onConfirmMed }) => {
  const serviceMeta = MOBILE_SERVICE_META[visit.type] || MOBILE_SERVICE_META.visit;
  const avatar = visit.doctorAvatar || resolveDoctorAvatar(visit.doctor);

  return (
    <div
      style={{
        background: 'var(--surface-card-100)',
        borderRadius: 'var(--dim-radius-500, 16px)',
        boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        padding: 'var(--dim-space-400, 16px) var(--dim-space-400, 16px) var(--dim-space-200, 8px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--dim-space-300, 12px)',
      }}
    >
      <div className='flex items-center justify-between'>
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
          <Sym name='schedule' size='var(--dim-size-250, 14px)' />
          {visit.time} น.
        </span>
        <ColorfulBadge style={serviceMeta.badgeStyle} size='small' hierarchy='secondary' width='hug'>
          {serviceMeta.badgeLabel}
        </ColorfulBadge>
      </div>

      <p style={{
        margin: 0,
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        lineHeight: 1.5,
        color: 'var(--text-content-default)',
      }}
      >
        {visit.title || visit.dx || visit.dept}
      </p>

      <div
        className='flex items-center'
        style={{
          gap: 'var(--dim-space-200, 8px)',
          padding: 'var(--dim-space-300, 12px)',
          background: 'var(--surface-card-skycyan-100, #F4F9FD)',
          borderRadius: 'var(--dim-radius-400, 12px)',
        }}
      >
        <span className='overflow-hidden shrink-0' style={{ width: 'var(--dim-size-800, 40px)', height: 'var(--dim-size-800, 40px)', borderRadius: 'var(--dim-radius-full)' }}>
          <img src={avatar} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </span>
        <div className='min-w-0'>
          <p style={{ margin: 0, fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm)' }}>{visit.doctor}</p>
          <p style={{ margin: 0, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{visit.specialty || visit.dept}</p>
        </div>
      </div>

      {visit.confirmMed && (
        <BrandButton size='lg' onClick={(e) => { e.stopPropagation(); onConfirmMed?.(visit); }}>
          ยืนยันการรับยา
        </BrandButton>
      )}

      <button
        type='button'
        onClick={() => onOpen?.(visit)}
        className='flex items-center justify-between w-full'
        style={{
          border: 0,
          borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
          background: 'var(--surface-list-default, #FFFFFF)',
          borderRadius: 'var(--dim-radius-150, 6px)',
          padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
          minHeight: 'var(--dim-size-1200, 56px)',
          cursor: 'pointer',
          gap: 'var(--dim-space-200, 8px)',
          /* Figma List 194:153552 — text/list/default */
          color: 'var(--text-list-default, #4D5358)',
          fontSize: 'var(--type-size-sm, 14px)',
          fontFamily: 'var(--type-family-body)',
          fontWeight: 'var(--type-weight-regular, 400)',
          lineHeight: 1.5,
          textAlign: 'left',
        }}
      >
        ดูผลตรวจหรือบันทึกการรักษา
        <Sym name='chevron_right' size='var(--dim-size-300, 16px)' color='var(--text-list-default, #4D5358)' />
      </button>
    </div>
  );
};

const PaymentCard = ({ bill, onOpen }) => {
  const pending = bill.status === 'pending';
  return (
    <button
      type='button'
      onClick={() => onOpen?.(bill)}
      className='flex items-start w-full text-left'
      style={{
        gap: 'var(--dim-space-300, 12px)',
        padding: 'var(--dim-space-400, 16px)',
        background: 'var(--surface-card-100)',
        borderRadius: 'var(--dim-radius-500, 16px)',
        border: 'var(--dim-stroke-100) solid var(--border-content-tertiary)',
        boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        cursor: 'pointer',
      }}
    >
      <div className='flex-1 min-w-0' style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-200, 8px)' }}>
        <div className='flex items-center justify-between'>
          <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
            <Sym name='schedule' size='var(--dim-size-250, 14px)' />
            {bill.time || '—'} น.
          </span>
          <StatusBadge style={pending ? 'warning' : 'success'} size='small'>
            {pending ? 'รอชำระ' : 'ชำระแล้ว'}
          </StatusBadge>
        </div>
        <p style={{
          margin: 0,
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-sm)',
          color: 'var(--text-content-default)',
        }}
        >
          {bill.title || bill.id}
        </p>
        <p style={{
          margin: 0,
          fontSize: 'var(--type-size-lg, 18px)',
          fontWeight: 'var(--type-weight-bold, 700)',
          color: pending ? 'var(--text-warning-default, #D97706)' : 'var(--text-content-default)',
        }}
        >
          ฿ {Number(bill.amount || 0).toFixed(2)}
        </p>
      </div>
      <Sym name='chevron_right' size='var(--dim-size-400, 20px)' color='var(--text-content-tertiary)' />
    </button>
  );
};

const MATERNAL_VISITS = [
  { id: 'anc-01', date: '12 มิ.ย. 2569', gestation: '24 สัปดาห์ 3 วัน', result: 'ครรภ์ปกติ ทารกดิ้นดี', doctor: 'พญ. สมหญิง รักษาดี' },
  { id: 'anc-02', date: '15 พ.ค. 2569', gestation: '20 สัปดาห์ 2 วัน', result: 'ผลอัลตราซาวด์ปกติ', doctor: 'พญ. สมหญิง รักษาดี' },
];

const CHILD_GROWTH = [
  { label: 'แรกเกิด', weight: '3.2 kg', height: '50 cm', level: 42 },
  { label: '2 เดือน', weight: '5.1 kg', height: '57 cm', level: 58 },
  { label: '4 เดือน', weight: '6.4 kg', height: '63 cm', level: 72 },
  { label: '6 เดือน', weight: '7.3 kg', height: '67 cm', level: 84 },
];

const HistoryInfoCard = ({ icon, title, children }) => (
  <section
    className='flex flex-col'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      padding: 'var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      background: 'var(--surface-card-100, #FFFFFF)',
      boxShadow: 'var(--shadow-brand-drop-bottom-200)',
    }}
  >
    <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      <MobileIconBadge icon={icon} tone='green' size={40} iconSize={16} />
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-base, 16px)',
          fontWeight: 'var(--type-weight-regular, 400)',
          lineHeight: 1.5,
          color: 'var(--text-brandPrimary-default, #007549)',
        }}
      >
        {title}
      </h2>
    </div>
    {children}
  </section>
);

const MaternalChildHistory = () => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
    <HistoryInfoCard icon='pregnant_woman' title='การตั้งครรภ์ปัจจุบัน'>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <div className='flex items-center justify-between'>
          <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary, #858C92)' }}>อายุครรภ์</span>
          <strong style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #111314)' }}>24 สัปดาห์ 3 วัน</strong>
        </div>
        <div className='flex items-center justify-between'>
          <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary, #858C92)' }}>กำหนดคลอด</span>
          <strong style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #111314)' }}>28 ก.ย. 2569</strong>
        </div>
        <StatusBadge style='success' size='small'>ฝากครรภ์ตามนัด</StatusBadge>
      </div>
    </HistoryInfoCard>

    <HistoryInfoCard icon='event_available' title='ประวัติการฝากครรภ์ (ANC)'>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        {MATERNAL_VISITS.map((visit, index) => (
          <React.Fragment key={visit.id}>
            <div className='flex items-start' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <ColorfulIconBadge style='purple' size='medium' icon='calendar' />
              <div className='flex flex-col' style={{ flex: 1, minWidth: 0, gap: 'var(--dim-space-050, 2px)' }}>
                <strong style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #111314)' }}>
                  {visit.date} · {visit.gestation}
                </strong>
                <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>{visit.result}</span>
                <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>{visit.doctor}</span>
              </div>
            </div>
            {index < MATERNAL_VISITS.length - 1 && (
              <span style={{ width: '100%', height: 'var(--dim-stroke-100, 1px)', background: 'var(--border-neutral-quaternary, #F4F5F5)' }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </HistoryInfoCard>

    <HistoryInfoCard icon='monitor_weight' title='กราฟการเจริญเติบโตของลูก'>
      <div
        className='flex items-end w-full'
        aria-label='น้ำหนักและส่วนสูงของลูกอยู่ในเกณฑ์ปกติ'
        style={{
          height: 'var(--dim-size-1800, 96px)',
          gap: 'var(--dim-space-200, 8px)',
          paddingTop: 'var(--dim-space-200, 8px)',
        }}
      >
        {CHILD_GROWTH.map((point) => (
          <div key={point.label} className='flex flex-1 flex-col items-center justify-end' style={{ height: '100%', gap: 'var(--dim-space-100, 4px)' }}>
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>{point.weight}</span>
            <span
              aria-hidden
              style={{
                width: '100%',
                height: `${point.level}%`,
                minHeight: 'var(--dim-size-300, 16px)',
                borderRadius: 'var(--dim-radius-200, 8px) var(--dim-radius-200, 8px) 0 0',
                background: 'var(--surface-brandPrimary-tertiary, #E2F3EB)',
              }}
            />
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>{point.label}</span>
          </div>
        ))}
      </div>
      <div className='flex items-center justify-between'>
        <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>ส่วนสูงล่าสุด 67 cm</span>
        <StatusBadge style='success' size='small'>อยู่ในเกณฑ์ปกติ</StatusBadge>
      </div>
    </HistoryInfoCard>

    <HistoryInfoCard icon='vaccines' title='พัฒนาการและการสร้างภูมิคุ้มกันโรค'>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <div className='flex items-start' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <Sym name='check_circle' size='var(--dim-size-400, 20px)' color='var(--icon-positive-default, #196C65)' />
          <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>พัฒนาการสมวัย: ชันคอและมองตามวัตถุได้</span>
        </div>
        <div className='flex items-start' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <Sym name='vaccines' size='var(--dim-size-400, 20px)' color='var(--icon-brandPrimary-default, #007549)' />
          <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>วัคซีนครบตามวัย: BCG, HBV, DTP-HB-Hib, OPV</span>
        </div>
      </div>
    </HistoryInfoCard>
  </div>
);

const groupByDate = (rows, getKey, getLabel) => {
  const map = new Map();
  rows.forEach((row) => {
    const key = getKey(row);
    if (!map.has(key)) map.set(key, { key, label: getLabel(row), items: [] });
    map.get(key).items.push(row);
  });
  return Array.from(map.values());
};

const MobileRecordsInner = () => {
  const history = useHistory();
  const { visits } = usePhcisLink();
  const [tab, setTab] = useState('treatment'); /* treatment | payment | maternal-child */
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState('');

  const filteredVisits = useMemo(() => {
    let list = [...visits];
    if (filter === 'video') list = list.filter((v) => v.type === 'video');
    if (filter === 'visit') list = list.filter((v) => v.type === 'visit' || v.type === 'homevisit');
    return list;
  }, [visits, filter]);

  const visitGroups = useMemo(
    () => groupByDate(
      filteredVisits,
      (v) => v.dateKey || v.date || v.id,
      (v) => v.dateLabel || v.date || v.dateKey,
    ),
    [filteredVisits],
  );

  const filteredBills = useMemo(() => {
    let list = [...BILLS];
    if (filter === 'video') list = list.filter((b) => b.type === 'video');
    if (filter === 'visit') list = list.filter((b) => b.type === 'visit');
    return list;
  }, [filter]);

  const billGroups = useMemo(
    () => groupByDate(
      filteredBills,
      (b) => b.dateKey || b.date || b.id,
      (b) => b.date || b.dateKey,
    ),
    [filteredBills],
  );

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <MobileHeader
        title='ประวัติ'
        hideBack
        reserveBackSpace
        right={<span aria-hidden style={{ width: 'var(--dim-size-800, 40px)', height: 'var(--dim-size-800, 40px)' }} />}
        containerStyle={{
          height: 'var(--dim-size-1500, 68px)',
          padding: '0 var(--dim-space-200, 8px)',
          background: 'var(--surface-navigation-default, #FFFFFF)',
          borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        }}
        titleStyle={{
          textAlign: 'center',
          fontSize: 'var(--type-size-base, 16px)',
          fontWeight: 'var(--type-weight-regular, 400)',
          lineHeight: 1.5,
        }}
      />

      <div
        className='flex items-center justify-start shrink-0 overflow-x-auto'
        style={{
          padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
          background: 'var(--surface-card-100, #FFFFFF)',
        }}
      >
        <div
          className='flex items-start shrink-0'
          style={{
            padding: 'var(--dim-space-100, 4px)',
            borderRadius: 'var(--dim-radius-full, 9999px)',
            background: 'var(--surface-tabpill-background, #E2F3EB)',
            gap: 'var(--dim-space-050, 2px)',
          }}
        >
          <SegmentTab active={tab === 'treatment'} onClick={() => setTab('treatment')}>ประวัติการรักษา</SegmentTab>
          <SegmentTab active={tab === 'payment'} onClick={() => setTab('payment')}>ประวัติการชำระเงิน</SegmentTab>
          <SegmentTab active={tab === 'maternal-child'} onClick={() => setTab('maternal-child')}>ครรภ์/เด็ก</SegmentTab>
        </div>
      </div>

      {tab !== 'maternal-child' && (
        <div
          className='flex items-center shrink-0'
          style={{
            padding: 'var(--dim-space-200, 8px) var(--dim-space-400, 16px) var(--dim-space-200, 8px) 0',
            gap: 'var(--dim-space-400, 16px)',
            background: 'var(--surface-card-100, #FFFFFF)',
            boxShadow: 'var(--shadow-brand-drop-bottom-200)',
          }}
        >
        <div
          className='flex flex-1 min-w-0 overflow-x-auto'
          style={{
            gap: 'var(--dim-space-200, 8px)',
            paddingLeft: 'var(--dim-space-400, 16px)',
            paddingRight: 'var(--dim-space-400, 16px)',
            borderRight: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-tertiary, #C5EDDA)',
          }}
        >
          {TYPE_FILTERS.map((filterItem) => (
            <FilterChip
              key={filterItem.key}
              active={filter === filterItem.key}
              onClick={() => setFilter(filterItem.key)}
            >
              {filterItem.label}
            </FilterChip>
          ))}
        </div>
        <button
          type='button'
          aria-label='กรองวันที่'
          onClick={() => setToast('ตัวกรองวันที่ (สาธิต)')}
          className='inline-flex items-center justify-center shrink-0'
          style={{
            width: 'var(--dim-size-1000, 48px)',
            height: 'var(--dim-size-1000, 48px)',
            borderRadius: 'var(--dim-radius-full, 9999px)',
            border: 0,
            background: 'var(--surface-brandPrimaryButton-tertiary, #E2F3EB)',
            color: 'var(--text-brandPrimary-default, #007549)',
            cursor: 'pointer',
          }}
        >
          <Sym name='calendar_month' size='var(--dim-size-400, 20px)' />
        </button>
        </div>
      )}

      <div
        className='flex-1 min-h-0 overflow-y-auto'
        style={{
          padding: 'var(--dim-space-400, 16px) var(--dim-space-400, 16px) var(--dim-space-600, 24px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dim-space-400, 16px)',
          background: 'var(--background-screen-brand-100, #F4FBF8)',
        }}
      >
        {toast && (
          <p style={{ margin: 0, textAlign: 'center', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{toast}</p>
        )}

        {tab === 'treatment' && (
          visitGroups.length === 0 ? (
            <EmptyState text='ยังไม่มีประวัติการรักษา' />
          ) : (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              {visitGroups.map((g) => (
                <section key={g.key} className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  <DateHeader label={g.label} />
                  <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                    {g.items.map((v) => (
                      <VisitCard
                        key={v.id}
                        visit={v}
                        onOpen={(row) => history.push(`/m/visit/${row.id}`)}
                        onConfirmMed={() => setToast('ยืนยันการรับยาแล้ว (สาธิต)')}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        )}

        {tab === 'payment' && (
          billGroups.length === 0 ? (
            <EmptyState text='ยังไม่มีประวัติการชำระเงิน' />
          ) : (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              {billGroups.map((g) => (
                <section key={g.key} className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  <DateHeader label={g.label} />
                  <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                    {g.items.map((b) => (
                      <PaymentCard
                        key={b.id}
                        bill={b}
                        onOpen={(row) => history.push(`/m/payment/${row.id}`)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        )}

        {tab === 'maternal-child' && <MaternalChildHistory />}
      </div>
    </div>
  );
};

const EmptyState = ({ text }) => (
  <div
    style={{
      padding: 'var(--dim-space-800, 32px)',
      textAlign: 'center',
      background: 'var(--surface-card-100)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      color: 'var(--text-content-tertiary)',
      fontSize: 'var(--type-size-sm)',
    }}
  >
    {text}
  </div>
);

const MobileRecordsPage = () => (
  <MobileShell
    requireAuth
    background='var(--background-screen-brand-100, #F4FBF8)'
    statusBarStyle={{ height: 'var(--dim-size-1050, 50px)' }}
  >
    <MobileRecordsInner />
  </MobileShell>
);

export default MobileRecordsPage;
