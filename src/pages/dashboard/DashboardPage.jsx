import React, { useMemo, useRef, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import Icon from '@/components/icons/Icon';
import { Reveal } from '@/components/graph/Charts';
import SummaryCardsBar from '@/components/layout/SummaryCardsBar';
import { screenValue } from '@/components/dashboard/DashboardTemplateSwitcher';
import DashboardPageHeader, { DashboardExportButton } from '@/components/dashboard/DashboardPageHeader';
import DashboardWidget, { DASHBOARD_WIDGET_RENDERERS } from '@/components/dashboard/dashboardWidgetRegistry';
import {
  ALL_WIDGET_KEYS,
  DASHBOARD_LAYOUTS,
  listDashboardTemplates,
  widgetMeta,
} from '@/data/dashboardTemplates';
import Popover from '@/components/popup/Popover';
import ActionList from '@/components/list/ActionList';
import { REPORT_CATEGORIES } from '@/pages/dashboard/DashboardReportsHubPage';
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';
import { DASHBOARD_EXPORT_FOOTER } from '@/pages/dashboard/dashboardReportKit';
import SuccessPopup from '@/components/popup/SuccessPopup';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { MIH_FOOTER_LEGAL_AUTOHIDE } from '@/components/layout/wizardChromeMorphStyles';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';

const YEAR_OPTIONS = [
  { value: '2569', label: 'ปีงบประมาณ 2569' },
  { value: '2568', label: 'ปีงบประมาณ 2568' },
  { value: '2567', label: 'ปีงบประมาณ 2567' },
  { value: '2566', label: 'ปีงบประมาณ 2566' },
];

/* Hospital-overview banner cards — feed into <SummaryCardsBar variant='banner' />.
   Each card uses a semantic-pill tone + optional sub line. */
const DASHBOARD_OVERVIEW_CARDS = [
  { key: 'pop',     icon: 'users',          tone: 'blue',   value: '332,628',   label: 'ประชากรทั้งหมด (คน)',          subIcon: 'users',        sub: 'ชาย 159,483 / หญิง 173,145' },
  { key: 'birth',   icon: 'smile',          tone: 'teal',   value: '10',        label: 'เกิด ปีงบฯ 2569 (คน)',          subIcon: 'history',      sub: 'ปีงบ 2568: 688 คน' },
  { key: 'death',   icon: 'activity',       tone: 'red',    value: '21',        label: 'เสียชีวิต ปีงบฯ 2569 (คน)',     subIcon: 'history',      sub: 'ปีงบ 2568: 1,575 คน' },
  { key: 'visits',  icon: 'clipboard-list', tone: 'brand',  value: '299,445',   label: 'การรับบริการสะสม (ครั้ง)',      subIcon: 'check-circle', sub: 'เฉลี่ย 820.40 ครั้ง/วัน', subTone: 'success' },
  { key: 'fee',     icon: 'baht',           tone: 'purple', value: '1,496,420', label: 'ค่าบริการสะสม (บาท)',           subIcon: 'file-text',    sub: 'รายรับ 0 บาท' },
  { key: 'units',   icon: 'building',       tone: 'orange', value: '69',        label: 'หน่วยบริการที่ส่งข้อมูล (แห่ง)' },
  { key: 'telemed', icon: 'stethoscope',    tone: 'teal',   value: '167',       label: 'สาย Telemed ปีงบฯ (ครั้ง)', subIcon: 'history', sub: 'เฉลี่ย 18:42 นาที/สาย' },
];

/* Card wrapper — used by the recent-patients table and the ANC results
   section. The chart cards already ship with their own internal Card chrome. */
const DashboardPage = () => {
  const history = useHistory();
  const [year, setYear] = useState('2569');
  const [pageDate, setPageDate] = useState({ quick: 'thisyear' });
  /* "ดูรายงานทั้งหมด" เปิดเป็น dropdown รายการรายงานทั้งหมดของ §1.20 แทนการ
     พาไปหน้าศูนย์รวมรายงานทันที (มติผู้ใช้ 27 ส.ค. 69) */
  /* เทมเพลตหน้าจอ — แทนแถบ Tab เดิม (มติผู้ใช้ 27 ส.ค. 69)
     `templateId === null` = หน้าจอมาตรฐาน "ภาพรวมโรงพยาบาล" (การ์ดครบทุกใบ) */
  const [templates, setTemplates] = useState(() => listDashboardTemplates());
  const [templateId, setTemplateId] = useState(null);
  const [reportsMenuOpen, setReportsMenuOpen] = useState(false);
  const reportsMenuAnchor = useRef(null);
  /* เลือกรายงานจากลิสต์ → เปิด popup นำส่งออก (ตัวเดียวกับหน้ารายงานอื่น) */
  const [exportReport, setExportReport] = useState(null);
  const [exported, setExported] = useState(false);
  /* catalog/topics ของ popup — หมวดรายงานทั้งหมดของ §1.20 */
  const exportCatalog = useMemo(
    () => REPORT_CATEGORIES.map((c) => ({ key: c.key, title: c.title })),
    [],
  );
  const exportTopics = useMemo(
    () => REPORT_CATEGORIES.map((c) => ({ value: c.key, label: c.title })),
    [],
  );
  const yearLabel = YEAR_OPTIONS.find((o) => o.value === year)?.label || `ปีงบประมาณ ${year}`;

  const activeTemplate = templateId ? templates.find((t) => t.id === templateId) : null;
  /* หน้าจอมาตรฐาน = การ์ดครบทุกใบตามลำดับเดิมของหน้า (key ล้วน)
     เทมเพลตที่สร้างเอง = widget object ที่มี type + span ตามเค้าโครงที่เลือก */
  const activeWidgets = activeTemplate
    ? activeTemplate.widgets.map((w) => (typeof w === 'string' ? { type: w, span: null } : w))
    : ALL_WIDGET_KEYS.map((k) => ({ type: k, span: null }));
  const templateColumns = activeTemplate
    ? (DASHBOARD_LAYOUTS.find((l) => l.key === activeTemplate.layout) || {}).columns || 3
    : null;
  const showKpi = activeWidgets.some((w) => w.type === 'kpi');

  const applyTemplate = (saved) => {
    setTemplates(listDashboardTemplates());
    if (saved?.deleted) { setTemplateId(null); return; }
    if (saved?.id) setTemplateId(saved.id);
  };

  /* การ์ดมาจากทะเบียนกลาง (dashboardWidgetRegistry) — หน้าจริงกับตัวอย่างใน
     wizard สร้างเทมเพลตจึงเรนเดอร์การ์ดใบเดียวกัน */
  const bodyWidgets = activeWidgets.filter((w) => DASHBOARD_WIDGET_RENDERERS[w.type]);

  /* เมนูนำส่งออกรายงาน — ส่งเข้า slot `actions` ของหัวหน้าจอกลาง */
  /* เลือกหมวดรายงานจาก dropdown แล้วเปิด ExportFormatPopup ตัวเดียวกับหน้าอื่น */
  const reportsExportMenu = (
          <div className='relative shrink-0' ref={reportsMenuAnchor}>
            <DashboardExportButton
              menu
              open={reportsMenuOpen}
              onClick={() => setReportsMenuOpen((v) => !v)}
            />
            <Popover
              open={reportsMenuOpen}
              onClose={() => setReportsMenuOpen(false)}
              anchorRef={reportsMenuAnchor}
              style={{
                minWidth: 'var(--dim-size-2900, 640px)',
                maxWidth: '90vw',
                zIndex: 'var(--sm-z-popover, 1200)',
                background: 'var(--surface-dropdown-default)',
                border: 'var(--dim-stroke-100) solid var(--border-dropdown-default)',
                borderRadius: 'var(--dim-radius-500)',
                boxShadow: 'var(--shadow-dropdown)',
                padding: 'var(--dim-space-100)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'min(70vh, 520px)',
                overflowY: 'auto',
              }}
            >
              <div role='menu'>
                {REPORT_CATEGORIES.map((cat) => (
                  <ActionList
                    key={cat.key}
                    as='button'
                    role='menuitem'
                    leadingIcon={cat.icon}
                    label={cat.title}
                    subtext={cat.desc}
                    showSubtext
                    /* เหลือแค่ชื่อ + คำอธิบาย: ไม่มีเลข TOR, ไม่มีป้ายฝั่งขวา
                       และไม่มีเครื่องหมายถูก (แถวนี้เป็นทางเข้า ไม่ใช่ตัวเลือก
                       ที่ถูกเลือกอยู่) — มติผู้ใช้ 27 ส.ค. 69 */
                    showBadge={false}
                    showCheck={false}
                    showChevronRight={false}
                    onClick={() => {
                      setReportsMenuOpen(false);
                      setExportReport({ key: cat.key, title: cat.title });
                    }}
                  />
                ))}
                {/* ปลายทางเดิมของปุ่มนี้ — ยังเข้าถึงได้จากรายการสุดท้าย */}
                <ActionList
                  as='button'
                  role='menuitem'
                  leadingIcon='lab_profile'
                  label='ไปที่ศูนย์รวมรายงาน'
                  subtext='ทะเบียนแม่แบบรายงานทั้งหมด + ขอรายงานใหม่'
                  showSubtext
                  showBadge={false}
                  showCheck={false}
                  showChevronRight={false}
                  onClick={() => { setReportsMenuOpen(false); history.push('/dashboard/reports'); }}
                />
              </div>
            </Popover>
          </div>
  );

  return (
  <ClinicFilterProvider>
  <div className='min-h-screen w-full flex bg-brand-50'>
    <Sidebar activeKey='dashboard' />
    <main className='flex-1 flex flex-col min-w-0'>
      <Header breadcrumb={['แดชบอร์ด']} />

      {/* — หัวหน้าจอ: component กลางของกลุ่มแดชบอร์ด (มติผู้ใช้ 27 ส.ค. 69) — */}
      <DashboardPageHeader
        title='แดชบอร์ดภาพรวมโรงพยาบาล'
        dateFilter={pageDate}
        onDateFilterChange={setPageDate}
        templateValue={activeTemplate ? activeTemplate.id : screenValue('overview')}
        templates={templates}
        onSelectTemplate={setTemplateId}
        onApplyTemplate={applyTemplate}
        actions={reportsExportMenu}
      />

      {/* Body grid — การ์ดและลำดับมาจากเทมเพลตที่เลือก */}
      <div className='px-6 pt-6 pb-6 flex flex-col gap-4'>
        {showKpi && (
          <Reveal>
            <section
              className='bg-surface-card rounded-card shadow-card'
              /* longhand — inline shorthand `padding` + var() ไม่ render ในโปรเจกต์นี้ */
              style={{
                paddingTop: 'var(--dim-space-600)',
                paddingRight: 'var(--dim-space-600)',
                paddingBottom: 'var(--dim-space-600)',
                paddingLeft: 'var(--dim-space-600)',
              }}
            >
              <SummaryCardsBar variant='banner' cards={DASHBOARD_OVERVIEW_CARDS} columns={4} />
            </section>
          </Reveal>
        )}

        {bodyWidgets.length === 0 ? (
          <div
            className='flex flex-col items-center justify-center bg-surface-card rounded-card shadow-card'
            style={{ gap: 'var(--dim-space-300)', paddingTop: 'var(--dim-space-1200, 48px)', paddingBottom: 'var(--dim-space-1200, 48px)' }}
          >
            <Icon name='dashboard_customize' size={32} />
            <span className='text-sm text-ink-tertiary'>
              เทมเพลต “{activeTemplate?.name}” ยังไม่มีการ์ด — กด “สร้างเทมเพลท” เพื่อเลือกการ์ดที่จะแสดง
            </span>
          </div>
        ) : (
          /* `grid` บน <Reveal> ทำให้การ์ดลูกยืดเต็มความสูงแถวเหมือนตอนที่การ์ด
             เป็น grid item โดยตรง (align-items: stretch) */
          <div
            className={templateColumns ? 'grid gap-4' : 'grid grid-cols-12 gap-4'}
            style={templateColumns
              ? { gridTemplateColumns: `repeat(${templateColumns}, minmax(0, 1fr))` }
              : undefined}
          >
            {bodyWidgets.map((w, i) => (
              <Reveal
                key={w.id || `${w.type}-${i}`}
                className={templateColumns ? 'grid' : `${widgetMeta(w.type)?.span || 'col-span-12'} grid`}
                style={templateColumns
                  ? { gridColumn: `span ${Math.min(w.span || 1, templateColumns)}` }
                  : undefined}
              >
                <DashboardWidget type={w.type} yearLabel={yearLabel} />
              </Reveal>
            ))}
          </div>
        )}

        {/* — Footer credits — */}
        <div className={`py-3 flex items-center justify-between text-xs text-ink-tertiary ${MIH_FOOTER_LEGAL_AUTOHIDE}`}>
          <span>© 2026 ศูนย์การพยาบาลคุณภาพ ดินแดง กรุงเทพมหานคร</span>
          <div className='flex items-center gap-4'>
            <a href='/privacy' target='_blank' rel='noopener noreferrer' className='hover:text-brand-500'>Privacy Policy</a>
            <a href='/terms' target='_blank' rel='noopener noreferrer' className='hover:text-brand-500'>Terms of Service</a>
          </div>
        </div>
      </div>
    </main>


    {/* นำส่งออกรายงานตามหมวดที่เลือกจาก dropdown */}
    <ExportFormatPopup
      open={!!exportReport}
      report={exportReport}
      reportsCatalog={exportCatalog}
      topics={exportTopics}
      onClose={() => setExportReport(null)}
      onExported={() => setExported(true)}
      documentFooter={DASHBOARD_EXPORT_FOOTER}
      logExportFn={null}
      topicsFieldName='dashboard-overview-export-topics'
    />

    <SuccessPopup
      open={exported}
      onClose={() => setExported(false)}
      buttonLabel='เรียบร้อย'
      title='นำส่งออกรายงานแล้ว'
      description='ไฟล์รายงานถูกสร้างตามรูปแบบและช่วงเวลาที่เลือก'
    />
  </div>
  </ClinicFilterProvider>
  );
};

export default DashboardPage;
