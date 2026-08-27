import React, { useMemo, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import FilterDateTag from '@/components/forms/FilterDateTag';
import Popup from '@/components/popup/Popup';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Dropdown from '@/components/forms/Dropdown';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import SecondarySearch from '@/components/search/SecondarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import { DashboardHeaderActions, DashboardHeaderFilters } from '@/components/dashboard/DashboardPageHeader';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import { Reveal } from '@/components/graph/Charts';
import { PHCIS_CURRENT_USER } from '@/data/phcisCurrentUser';
import {
  CARD,
  FISCAL_YEAR_OPTIONS,
  EmptyChartNote,
  ReportGroupCard,
  SectionTopic,
  fiscalYearDateFilter,
  fiscalYearOf,
} from '@/pages/dashboard/dashboardReportKit';
import { formatIsoDateThai } from '@/data/dashboardCommon';
import {
  CUSTOM_REPORT_DETAIL_SUGGESTIONS,
  CUSTOM_REPORT_FREQUENCIES,
  CUSTOM_REPORT_REQUESTERS,
  CUSTOM_REPORT_STATUS,
  CUSTOM_REPORT_TEMPLATES,
  addCustomReportRequest,
  cancelCustomReportRequest,
  frequencyLabel,
  listCustomReportRequests,
  requesterLabel,
  updateCustomReportRequest,
} from '@/data/dashboardCustomReports';

/* TOR §1.20 — ศูนย์รวมรายงานและแพลตฟอร์มวิเคราะห์ข้อมูล
   หน้ารวมทางเข้าของทุกหมวดรายงาน (แบบเดียวกับหน้าเลือกรายงานของระบบ HCIS เดิม)
   พร้อมสองส่วนที่รายงานตรง ๆ ว่าเป็น partial:
     • §1.20.9  แถบสถานะฐานข้อมูลซ้ำ (Read Replica) — UI แสดงสถานะ ไม่ใช่ตัว replica
     • §1.20.11 ทะเบียนรายงานอื่น ๆ ตามที่สำนักอนามัยกำหนด + ช่องทางขอรายงานใหม่ */

const breadcrumb = ['แดชบอร์ด', 'ศูนย์รวมรายงาน'];

/** หมวดรายงานทั้งหมดของ §1.20 — ใช้ทั้งการ์ดในหน้านี้และ dropdown
    "ดูรายงานทั้งหมด" บนหน้าภาพรวมโรงพยาบาล (แก้ที่เดียวพอ) */
export const REPORT_CATEGORIES = [
  {
    key: 'overview',
    icon: 'dashboard',
    title: 'ภาพรวมผู้รับบริการ (Dashboard โรงพยาบาล)',
    desc: 'จำนวนผู้รับบริการ โรคประจำตัว การแพ้ยา สิทธิการรักษา ช่วงอายุ และจำนวนผู้รับบริการรายคลินิก',
    path: '/dashboard',
    torRange: '1.20.1.1 – 1.20.1.9',
    leaves: 9,
    status: 'live',
  },
  {
    key: 'service',
    icon: 'groups',
    title: 'รายงานผู้รับบริการ',
    desc: 'นัดหมาย · Walk-in · ไม่มาตามนัด · อันดับโรค · ระยะเวลารอคอย · สรุปการเปิดสิทธิและโรคประจำวัน',
    path: '/dashboard/reports/service',
    torRange: '1.20.4.1 – 1.20.5.6',
    leaves: 8,
    status: 'live',
  },
  {
    key: 'pharmacy',
    icon: 'medication',
    title: 'รายงานเภสัชกรรม (ภาพรวมทุกศูนย์)',
    desc: 'สถิติการใช้ยา/เวชภัณฑ์ · การเบิกยากับ สปสช. และกองเภสัชกรรม · Medication Error · ใบสั่งยาและการตีกลับ',
    path: '/dashboard/reports/pharmacy',
    torRange: '1.20.2.1 – 1.20.6.2',
    leaves: 9,
    status: 'live',
  },
  {
    key: 'clinics',
    icon: 'stethoscope',
    title: 'Dashboard คลินิกพิเศษ',
    desc: 'ผลการดูแลผู้รับบริการ NCD · สุขภาพจิต · วัณโรค · สารเสพติด · HIV · PEP/PrEP · EPI · ฟื้นฟู · สังคมสงเคราะห์ · เยี่ยมบ้าน',
    path: '/dashboard/clinics',
    torRange: '1.20.7.1 – 1.20.7.11',
    leaves: 11,
    status: 'live',
  },
  {
    key: 'checkup',
    icon: 'assignment',
    title: 'รายงานตรวจสุขภาพ',
    desc: 'ออกรายงานตามรูปแบบสำนักอนามัย · ส่งออนไลน์/อีเมล · ตามปัจจัยเสี่ยง · ต่อเนื่อง 3 ปี · ไทย/อังกฤษ',
    path: '/dashboard/reports/checkup',
    torRange: '1.20.8.1 – 1.20.8.5',
    leaves: 5,
    status: 'live',
  },
  {
    key: 'executive',
    icon: 'insights',
    title: 'Dashboard ผู้บริหาร',
    desc: 'Area Health Analytics รายเขต/แขวง · แนวโน้มผู้ป่วยใหม่ · พยากรณ์ความต้องการยา · แนวโน้มรายรับ · การแจ้งเตือนความผิดปกติ',
    path: '/dashboard/executive',
    torRange: '1.20.10.1 – 1.20.10.5',
    leaves: 5,
    status: 'restricted',
  },
  {
    key: 'finance',
    icon: 'payments',
    title: 'รายงานการเงิน',
    desc: 'รายรับ · รายจ่าย · งบประมาณ · ภาพรวมรายรับ-รายจ่าย (อยู่ในระบบการเงิน)',
    path: '/finance',
    torRange: '1.20.3.1 – 1.20.3.4',
    leaves: 4,
    status: 'live',
  },
];

const CATEGORY_STATUS_BADGE = {
  live: { style: 'green', label: 'เปิดใช้งาน' },
  restricted: { style: 'yellow', label: 'จำกัดสิทธิ์ผู้บริหาร' },
};

const TEMPLATE_COLUMNS = (onOpen) => [
  {
    key: 'name',
    label: 'ชื่อรายงาน',
    flex: true,
    minWidth: 320,
    render: (r) => (
      <button
        type='button'
        onClick={() => onOpen(r)}
        style={{
          textAlign: 'left',
          color: 'var(--text-brandPrimary-default, #007549)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          paddingTop: 'var(--dim-space-0)',
          paddingRight: 'var(--dim-space-0)',
          paddingBottom: 'var(--dim-space-0)',
          paddingLeft: 'var(--dim-space-0)',
        }}
      >
        {r.name}
      </button>
    ),
    csv: (r) => r.name,
  },
  {
    key: 'requester', label: 'หน่วยงานผู้ขอ', flex: true, minWidth: 220,
    render: (r) => requesterLabel(r.requester), csv: (r) => requesterLabel(r.requester),
  },
  {
    key: 'frequency', label: 'ความถี่',
    render: (r) => frequencyLabel(r.frequency), csv: (r) => frequencyLabel(r.frequency),
  },
  {
    key: 'status', label: 'สถานะ',
    render: (r) => (
      <Badge style={CUSTOM_REPORT_STATUS[r.status]?.badge || 'neutral'} size='small'>
        {CUSTOM_REPORT_STATUS[r.status]?.label || r.status}
      </Badge>
    ),
    csv: (r) => CUSTOM_REPORT_STATUS[r.status]?.label || r.status,
  },
  {
    key: 'updatedAt', label: 'ปรับปรุงล่าสุด',
    render: (r) => formatIsoDateThai(r.updatedAt), csv: (r) => r.updatedAt,
  },
];

const EMPTY_FORM = { name: '', requester: 'plan', frequency: 'monthly', detail: '' };

const DashboardReportsHubPage = () => {
  const history = useHistory();
  const [search, setSearch] = useState('');
  const [pageDate, setPageDate] = useState({ quick: 'thisyear' });
  const [requests, setRequests] = useState(() => listCustomReportRequests());
  const [requestOpen, setRequestOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  /* ค่าตั้งต้นของฟอร์มรอบที่เปิดอยู่ — ฟอร์ม "แก้ไข" ที่เพิ่งเปิดต้องนับว่ายัง
     ไม่มีการแก้ ไม่งั้นกดยกเลิกทีไรก็ถามยืนยันทิ้งข้อมูลที่ผู้ใช้ไม่เคยพิมพ์ */
  const [baseline, setBaseline] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const [detailTemplate, setDetailTemplate] = useState(null);
  const [toast, setToast] = useState('');

  const totalLeaves = REPORT_CATEGORIES.reduce((s, c) => s + c.leaves, 0);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CUSTOM_REPORT_TEMPLATES;
    return CUSTOM_REPORT_TEMPLATES.filter((t) => (
      t.name.toLowerCase().includes(q)
      || requesterLabel(t.requester).toLowerCase().includes(q)
      || t.detail.toLowerCase().includes(q)
    ));
  }, [search]);

  const summaryCards = useMemo(() => ([
    { key: 'cats',   label: 'หมวดรายงาน',            value: REPORT_CATEGORIES.length, indicator: 'ทางเข้าทุกหมวด', color: 'brand',      icon: 'category' },
    { key: 'leaves', label: 'หัวข้อรายงานตาม TOR',   value: totalLeaves,              indicator: 'ข้อกำหนด §1.20',  color: 'info',       icon: 'checklist' },
    { key: 'custom', label: 'แม่แบบรายงานเพิ่มเติม', value: CUSTOM_REPORT_TEMPLATES.length, indicator: 'TOR 1.20.11', color: 'positive', icon: 'lab_profile' },
    { key: 'req',    label: 'คำขอรายงานใหม่',        value: requests.length,          indicator: 'รอพิจารณา',       color: 'inprogress', icon: 'pending_actions' },
  ]), [requests, totalLeaves]);

  const formDirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const nameInvalid = touched && form.name.trim().length < 5;
  const detailInvalid = touched && form.detail.trim().length < 10;
  const ready = form.name.trim().length >= 5 && form.detail.trim().length >= 10;

  const openNewRequest = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setBaseline(EMPTY_FORM);
    setTouched(false);
    setRequestOpen(true);
  };

  const openEditRequest = (req) => {
    const loaded = {
      name: req.name,
      requester: req.requester,
      frequency: req.frequency,
      detail: req.detail,
    };
    setEditingId(req.id);
    setForm(loaded);
    setBaseline(loaded);
    setTouched(false);
    setRequestOpen(true);
  };

  /* ถามยืนยันเฉพาะตอนที่ค่าต่างจากตอนเปิดจริง ๆ */
  const closeRequest = () => {
    if (formDirty) { setDiscardOpen(true); return; }
    setEditingId(null);
    setRequestOpen(false);
  };

  const discardRequest = () => {
    setForm(EMPTY_FORM);
    setBaseline(EMPTY_FORM);
    setTouched(false);
    setEditingId(null);
    setDiscardOpen(false);
    setRequestOpen(false);
  };

  const saveRequest = () => {
    if (editingId) {
      setRequests(updateCustomReportRequest(editingId, {
        name: form.name.trim(),
        requester: form.requester,
        frequency: form.frequency,
        detail: form.detail.trim(),
      }, PHCIS_CURRENT_USER.displayName));
      setToast('แก้ไขคำขอรายงานแล้ว — บันทึกลงประวัติการใช้งานแล้ว');
    } else {
      addCustomReportRequest({
        name: form.name.trim(),
        requester: form.requester,
        frequency: form.frequency,
        detail: form.detail.trim(),
        requestedBy: PHCIS_CURRENT_USER.displayName,
      });
      setRequests(listCustomReportRequests());
      setToast('ส่งคำขอรายงานใหม่แล้ว — บันทึกผู้ขอและเวลาลงประวัติการใช้งานแล้ว');
    }
    setForm(EMPTY_FORM);
    setBaseline(EMPTY_FORM);
    setTouched(false);
    setEditingId(null);
    setRequestOpen(false);
  };

  const confirmCancel = () => {
    if (!cancelTarget) return;
    setRequests(cancelCustomReportRequest(cancelTarget.id, PHCIS_CURRENT_USER.displayName));
    setCancelTarget(null);
    setToast('ยกเลิกคำขอรายงานแล้ว — บันทึกลงประวัติการใช้งานแล้ว');
  };

  return (
    <QueuePageShell
      activeKey='dashboard'
      breadcrumb={breadcrumb}
      title='ศูนย์รวมรายงานและแพลตฟอร์มวิเคราะห์ข้อมูล'
      afterTitle={(
        <DashboardHeaderFilters
          dateFilter={pageDate}
          onDateFilterChange={setPageDate}
          defaultQuick='thisyear'
        ></DashboardHeaderFilters>
      )}
      actions={(
        <DashboardHeaderActions>
          <BrandButton size='md' leadingIcon='add' onClick={openNewRequest}>
            ขอรายงานใหม่
          </BrandButton>
        </DashboardHeaderActions>
      )}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          gap: 'var(--dim-space-600)',
        }}
      >
        {/* การ์ดสรุปย้ายลงมาอยู่ใต้แถบ Tab (มติผู้ใช้ 27 ส.ค. 69) — `summaryCards`
            ของ QueuePageShell จะถูกวางเหนือ tab เสมอ จึง render เองตรงนี้แทน */}
        <section className='w-full flex items-stretch flex-wrap' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          {summaryCards.map((card) => (
            <SummaryCard key={card.key} card={card} variant='panel' />
          ))}
        </section>

        {/* หมวดรายงาน */}
        <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-500)' }}>
          <SectionTopic
            title='หมวดรายงาน'
            subtitle='เลือกหมวดเพื่อเข้าสู่หน้ารายงานที่มีกราฟ ตาราง และการนำส่งออกครบชุด'
          />
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full' style={{ gap: 'var(--dim-space-400)' }}>
            {REPORT_CATEGORIES.map((c) => (
              <Reveal key={c.key} className='flex'>
                <Link
                  to={c.path}
                  className='flex flex-col w-full min-w-0'
                  style={{
                    gap: 'var(--dim-space-200)',
                    border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                    borderRadius: 'var(--dim-radius-400, 12px)',
                    background: 'var(--surface-card-100, #FFFFFF)',
                    paddingTop: 'var(--dim-space-400)',
                    paddingBottom: 'var(--dim-space-400)',
                    paddingLeft: 'var(--dim-space-400)',
                    paddingRight: 'var(--dim-space-400)',
                    textDecoration: 'none',
                  }}
                >
                  <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
                    <span
                      className='inline-flex items-center justify-center shrink-0'
                      style={{
                        width: 'var(--dim-size-700, 36px)',
                        height: 'var(--dim-size-700, 36px)',
                        borderRadius: 'var(--dim-radius-300, 10px)',
                        background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                        color: 'var(--text-brandPrimary-default, #007549)',
                      }}
                    >
                      <Icon name={c.icon} size={20} />
                    </span>
                    <span
                      className='flex-1 min-w-0'
                      style={{
                        color: 'var(--text-content-default)',
                        fontFamily: 'var(--type-family-heading-graphic2)',
                        fontSize: 'var(--type-size-sm)',
                        lineHeight: 1.4,
                      }}
                    >
                      {c.title}
                    </span>
                    <Icon name='chevron_right' size={18} />
                  </div>
                  <span
                    style={{
                      color: 'var(--text-content-secondary)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-xs)',
                      lineHeight: 1.6,
                    }}
                  >
                    {c.desc}
                  </span>
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                    <ColorfulBadge
                      style={CATEGORY_STATUS_BADGE[c.status]?.style || 'grey'}
                      size='small'
                      hierarchy='secondary'
                    >
                      {CATEGORY_STATUS_BADGE[c.status]?.label || c.status}
                    </ColorfulBadge>
                    <Badge style='neutral' size='small'>{c.leaves} หัวข้อ</Badge>
                    <span
                      style={{
                        color: 'var(--text-content-tertiary)',
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-xs)',
                      }}
                    >
                      TOR {c.torRange}
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* §1.20.11 */}
        <ReportGroupCard
          title='รายงานอื่น ๆ ตามที่สำนักอนามัยกำหนด'
          subtitle='TOR 1.20.11 — ทะเบียนแม่แบบรายงานที่สั่งเพิ่ม พร้อมช่องทางขอรายงานใหม่'
          extraActions={(
            <NeutralSubdueButton size='sm' leadingIcon='add' collapseLabelBelow='lg' onClick={openNewRequest}>
              ขอรายงานใหม่
            </NeutralSubdueButton>
          )}
        >
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
              <SecondarySearch
                size='small'
                value={search}
                onChange={setSearch}
                placeholder='ค้นหาชื่อรายงาน / หน่วยงานผู้ขอ / รายละเอียด'
                style={{ width: 'auto', maxWidth: 'var(--dim-size-2600, 384px)' }}
              />
              <SearchResultCount found={filteredTemplates.length} total={CUSTOM_REPORT_TEMPLATES.length} />
            </div>

            <Table
              columns={TEMPLATE_COLUMNS(setDetailTemplate)}
              rows={filteredTemplates}
              rowKey={(r) => r.id}
              emptyMessage='ไม่พบรายการที่ตรงกัน'
              emptySubtext='ลองแก้คำค้น หรือกด “ขอรายงานใหม่” เพื่อเสนอรายงานที่ยังไม่มี'
              pagination={false}
            />

            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
              <span
                style={{
                  color: 'var(--text-brandPrimary-default)',
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-base)',
                }}
              >
                คำขอรายงานใหม่ (บันทึกผู้ขอและเวลา)
              </span>
              {requests.length === 0 ? (
                <EmptyChartNote
                  text='ยังไม่มีคำขอรายงานใหม่'
                  hint='กด “ขอรายงานใหม่” เพื่อเสนอรายงานที่สำนักอนามัยต้องการเพิ่ม'
                  icon='post_add'
                />
              ) : (
                <Table
                  columns={[
                    { key: 'name', label: 'ชื่อรายงานที่ขอ', flex: true, minWidth: 320 },
                    {
                      key: 'requester', label: 'หน่วยงานผู้ขอ', flex: true, minWidth: 220,
                      render: (r) => requesterLabel(r.requester), csv: (r) => requesterLabel(r.requester),
                    },
                    {
                      key: 'frequency', label: 'ความถี่',
                      render: (r) => frequencyLabel(r.frequency), csv: (r) => frequencyLabel(r.frequency),
                    },
                    { key: 'requestedBy', label: 'ผู้ขอ', flex: true, minWidth: 200 },
                    { key: 'requestedAt', label: 'วันเวลาที่ขอ', flex: true, minWidth: 200 },
                    {
                      key: 'actions',
                      label: 'จัดการ',
                      sortable: false,
                      minWidth: 180,
                      render: (r) => (
                        <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
                          <NeutralSubdueButton size='sm' leadingIcon='edit' onClick={() => openEditRequest(r)}>
                            แก้ไข
                          </NeutralSubdueButton>
                          <NeutralSubdueButton size='sm' leadingIcon='close' onClick={() => setCancelTarget(r)}>
                            ยกเลิก
                          </NeutralSubdueButton>
                        </div>
                      ),
                      csv: () => '',
                    },
                  ]}
                  rows={requests}
                  rowKey={(r) => r.id}
                  emptyMessage='ยังไม่มีคำขอรายงานใหม่'
                  pagination={false}
                />
              )}
            </div>

            <span
              style={{
                color: 'var(--text-content-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                lineHeight: 1.6,
              }}
            >
              ข้อกำหนด §1.20.11 เป็นข้อเปิดปลาย — ระบบส่วนหน้าทำได้ถึงระดับ “ทะเบียนแม่แบบ +
              ช่องทางขอรายงานใหม่พร้อม audit ผู้ขอและเวลา” ส่วนการพัฒนารายงานแต่ละฉบับ
              ต้องดำเนินการเป็นรอบตามที่สำนักอนามัยกำหนดเพิ่มเติม
            </span>
          </div>
        </ReportGroupCard>
      </div>

      {/* ขอรายงานใหม่ / แก้ไขคำขอ */}
      <Popup
        open={requestOpen}
        onClose={closeRequest}
        size='large'
        title={editingId ? 'แก้ไขคำขอรายงาน' : 'ขอรายงานใหม่'}
        subtitle='ระบบจะบันทึกชื่อผู้ขอและวันเวลาที่ส่งคำขอไว้เป็นหลักฐาน'
        primaryAction={{ label: editingId ? 'บันทึกการแก้ไข' : 'ส่งคำขอ', onClick: saveRequest, disabled: !ready }}
        secondaryAction={{ label: 'ยกเลิก', onClick: closeRequest }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <InputField
            label='ชื่อรายงานที่ต้องการ'
            required
            size='md'
            value={form.name}
            onChange={(v) => { setForm((p) => ({ ...p, name: v })); setTouched(true); }}
            placeholder='เช่น รายงานผู้ป่วยเบาหวานที่ควบคุมระดับน้ำตาลไม่ได้'
            showLeadingIcon={false}
            error={nameInvalid ? 'ระบุชื่อรายงานอย่างน้อย 5 ตัวอักษร' : undefined}
            helperText={nameInvalid ? 'ระบุชื่อรายงานอย่างน้อย 5 ตัวอักษร' : undefined}
            showHelperText={nameInvalid}
          />
          <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div style={{ flex: '1 1 240px', minWidth: 'min(100%, 240px)' }}>
              <span
                style={{
                  display: 'block',
                  marginBottom: 'var(--dim-space-150)',
                  color: 'var(--text-content-secondary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                }}
              >
                หน่วยงานผู้ขอ
              </span>
              <Dropdown
                size='md'
                value={form.requester}
                onChange={(v) => setForm((p) => ({ ...p, requester: v }))}
                options={CUSTOM_REPORT_REQUESTERS}
                placeholder='เลือกหน่วยงาน'
              />
            </div>
            <div style={{ flex: '1 1 240px', minWidth: 'min(100%, 240px)' }}>
              <span
                style={{
                  display: 'block',
                  marginBottom: 'var(--dim-space-150)',
                  color: 'var(--text-content-secondary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                }}
              >
                ความถี่ที่ต้องการ
              </span>
              <Dropdown
                size='md'
                value={form.frequency}
                onChange={(v) => setForm((p) => ({ ...p, frequency: v }))}
                options={CUSTOM_REPORT_FREQUENCIES}
                placeholder='เลือกความถี่'
              />
            </div>
          </div>
          <SuggestibleTextarea
            voice
            required
            label='รายละเอียดรายงานที่ขอ'
            value={form.detail}
            onChange={(e) => { setForm((p) => ({ ...p, detail: e.target.value })); setTouched(true); }}
            placeholder='ระบุข้อมูลที่ต้องการ มิติการแยกกลุ่ม ช่วงเวลา และการนำไปใช้…'
            suggestions={CUSTOM_REPORT_DETAIL_SUGGESTIONS}
            minChars={3}
            popoverAriaLabel='คำแนะนำรายละเอียดรายงาน'
          />
          {detailInvalid ? (
            <span
              style={{
                color: 'var(--text-danger-default, #B91C1C)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
              }}
            >
              ระบุรายละเอียดอย่างน้อย 10 ตัวอักษร เพื่อให้ทีมพัฒนาประเมินได้
            </span>
          ) : null}
          <span
            style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
            }}
          >
            ผู้ขอ: {PHCIS_CURRENT_USER.displayName} · ระบบจะบันทึกวันเวลาที่ส่งคำขอโดยอัตโนมัติ
          </span>
        </div>
      </Popup>

      <Popup
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title='ยกเลิกการกรอกคำขอ?'
        subtitle='ข้อมูลที่กรอกไว้จะไม่ถูกบันทึก'
        primaryAction={{ label: 'ยกเลิกและปิด', onClick: discardRequest }}
        secondaryAction={{ label: 'กรอกต่อ', onClick: () => setDiscardOpen(false) }}
      />

      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกคำขอรายงาน?'
        subtitle={cancelTarget?.name}
        primaryAction={{ label: 'ยกเลิกคำขอ', onClick: confirmCancel }}
        secondaryAction={{ label: 'เก็บคำขอไว้', onClick: () => setCancelTarget(null) }}
      >
        <span
          style={{
            color: 'var(--text-content-secondary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            lineHeight: 1.6,
          }}
        >
          คำขอนี้จะถูกลบออกจากคิวพิจารณา หากต้องการอีกครั้งต้องส่งคำขอใหม่
        </span>
      </Popup>

      {/* รายละเอียดแม่แบบรายงาน */}
      <Popup
        open={!!detailTemplate}
        onClose={() => setDetailTemplate(null)}
        size='large'
        title={detailTemplate?.name || 'รายละเอียดรายงาน'}
        subtitle={detailTemplate ? `${requesterLabel(detailTemplate.requester)} · ${frequencyLabel(detailTemplate.frequency)}` : undefined}
        primaryAction={detailTemplate?.linkPath
          ? { label: 'เปิดหน้ารายงาน', onClick: () => { const p = detailTemplate.linkPath; setDetailTemplate(null); history.push(p); } }
          : { label: 'ปิด', onClick: () => setDetailTemplate(null) }}
        secondaryAction={detailTemplate?.linkPath ? { label: 'ปิด', onClick: () => setDetailTemplate(null) } : undefined}
      >
        {detailTemplate ? (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <Badge style={CUSTOM_REPORT_STATUS[detailTemplate.status]?.badge || 'neutral'} size='small'>
                {CUSTOM_REPORT_STATUS[detailTemplate.status]?.label || detailTemplate.status}
              </Badge>
              <span
                style={{
                  color: 'var(--text-content-tertiary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                }}
              >
                เจ้าของรายงาน {detailTemplate.owner} · ปรับปรุงล่าสุด {formatIsoDateThai(detailTemplate.updatedAt)}
              </span>
            </div>
            <span
              style={{
                color: 'var(--text-content-secondary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                lineHeight: 1.6,
              }}
            >
              {detailTemplate.detail}
            </span>
            {!detailTemplate.linkPath ? (
              <span
                style={{
                  color: 'var(--text-warning-default, #C2410C)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                }}
              >
                รายงานนี้ยังไม่มีหน้าจอ — อยู่ระหว่างรอชุดข้อมูลต้นทาง
              </span>
            ) : null}
          </div>
        ) : null}
      </Popup>

      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} />
    </QueuePageShell>
  );
};

export default DashboardReportsHubPage;
