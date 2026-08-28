import React, { useEffect, useMemo, useState } from 'react';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import Table, { EllipsisText as TableEllipsisText } from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Checkbox from '@/components/checkbox/Checkbox';
import Textarea from '@/components/forms/Textarea';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import DutyRosterAction from '@/components/patient/DutyRosterAction';
import { withEmrRowAction } from '@/components/patient/EmrRowAction';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  EXIT_STATUS, EXIT_TASKS, getExitRows, subscribeExitQueue,
  taskProgress, toggleExitTask, closeExitVisit, reopenExitVisit, updateExitRow,
  compareExitRows,
} from '@/data/exitNurseQueue';

/* MIH ExitNurseQueuePage — "Exist Nurse" (/exit)
   ══════════════════════════════════════════════════════════════════════════
   คู่ตรงข้ามของจุดคัดกรอง: คัดกรองรับคนเข้า Exist Nurse ส่งคนออก
   ชื่อเมนูใช้คำว่า "Exist Nurse" ตามที่ผู้ใช้กำหนด
   เดิมพอแพทย์กดจบการตรวจ ผู้รับบริการก็หายไปจากทุกจอ ทั้งที่ยังมีงานค้างกับเขา
   อีกหลายอย่าง งานพวกนั้นเคยอยู่ในความจำของพยาบาลล้วน ๆ (มติผู้ใช้ 28 ส.ค. 69)

   หน้านี้ทำสองอย่าง: บอกว่าใครยังรออยู่และรอมานานแค่ไหน กับบอกว่าคนคนนั้น
   เหลืออะไรต้องทำก่อนกลับ รายการงานเป็นของเฉพาะคน ไม่ใช่ checklist ชุดเดียว
   ใช้ทุกคน — คนที่ไม่ได้รับยาไม่ควรมีข้อ "อธิบายวิธีใช้ยา" ให้ติ๊ก */

const breadcrumb = ['Exist Nurse'];
const SUMMARY_TITLE = 'Exist Nurse';
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:exit-nurse';

const TABS = [
  { key: 'waiting', label: 'รอส่งกลับ',    icon: 'hourglass_top' },
  { key: 'doing',   label: 'กำลังส่งกลับ', icon: 'pending_actions' },
  { key: 'done',    label: 'ส่งกลับแล้ว',  icon: 'check_circle' },
  { key: 'all',     label: 'ทั้งหมด',      icon: 'group' },
];

const PatientAvatar = ({ row }) => {
  const [imgError, setImgError] = useState(false);
  const src = row.avatarUrl || getPatientByHN(row.hn)?.avatarUrl;
  return (
    <div
      className='shrink-0 flex items-center justify-center text-white overflow-hidden'
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'var(--surface-neutral-tertiary, #9AA1A8)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
      }}
      aria-hidden
    >
      {src && !imgError ? (
        <img
          src={src}
          alt=''
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (row.name || '?').trim().charAt(0)}
    </div>
  );
};

const ExitNurseQueuePage = () => {
  const [activeTab, setActiveTab] = useState('waiting');
  const [searchQ, setSearchQ] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [openId, setOpenId] = useState(null);
  const [toast, setToast] = useState('');

  const [tick, setTick] = useState(0);
  useEffect(() => subscribeExitQueue(() => setTick((t) => t + 1)), []);
  const allRows = useMemo(
    () => getExitRows(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY);

  const open = useMemo(() => allRows.find((r) => r.id === openId) ?? null, [allRows, openId]);

  const counts = useMemo(() => ({
    waiting: allRows.filter((r) => r.status === 'waiting').length,
    doing: allRows.filter((r) => r.status === 'doing').length,
    done: allRows.filter((r) => r.status === 'done').length,
    all: allRows.length,
  }), [allRows]);

  const summaryCards = useMemo(() => {
    const openRows = allRows.filter((r) => r.status !== 'done');
    const longest = openRows.reduce((m, r) => Math.max(m, r.waitMinutes ?? 0), 0);
    const pendingTasks = openRows.reduce((n, r) => {
      const { total, done } = taskProgress(r);
      return n + (total - done);
    }, 0);
    return [
      { key: 'waiting', label: 'รอส่งกลับ',        value: counts.waiting, color: 'inprogress', icon: 'hourglass_top' },
      { key: 'doing',   label: 'กำลังส่งกลับ',     value: counts.doing,   color: 'info',       icon: 'pending_actions' },
      { key: 'done',    label: 'ส่งกลับแล้ววันนี้', value: counts.done,    color: 'positive',   icon: 'check_circle' },
      { key: 'tasks',   label: 'งานที่ยังไม่ปิด',   value: pendingTasks,   color: 'info',       icon: 'checklist' },
      { key: 'longest', label: 'รอนานสุด (นาที)',   value: longest,        color: 'destructive', icon: 'schedule' },
    ];
  }, [allRows, counts]);

  const tabs = useMemo(
    () => TABS.map((t) => ({ ...t, count: counts[t.key] ?? 0 })),
    [counts],
  );

  const tabRows = activeTab === 'all'
    ? allRows
    : allRows.filter((r) => r.status === activeTab);

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return tabRows;
    return tabRows.filter((r) => [r.queue, r.hn, r.name, r.clinic, r.doctor, r.diagnosis]
      .some((f) => f && String(f).toLowerCase().includes(q)));
  }, [tabRows, searchQ]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return filtered.slice().sort(compareExitRows);
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    const numeric = ['waitMinutes'];
    return filtered.slice().sort((a, b) => {
      const av = a[sortConfig.key] ?? '';
      const bv = b[sortConfig.key] ?? '';
      const primary = numeric.includes(sortConfig.key)
        ? (Number(av) || 0) - (Number(bv) || 0)
        : collator.compare(String(av), String(bv));
      return primary !== 0 ? sign * primary : compareExitRows(a, b);
    });
  }, [filtered, sortConfig]);

  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }
  ));

  const handleClose = () => {
    if (!open) return;
    const closed = closeExitVisit(open.id);
    if (!closed) {
      setToast('ยังทำไม่ครบทุกข้อ — ปิดเยี่ยมไม่ได้');
      return;
    }
    setToast(`ส่งกลับ ${open.name} เรียบร้อย`);
    setOpenId(null);
  };

  const renderTasks = (row) => {
    const { done, total } = taskProgress(row);
    return (
      <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
        <ColorfulBadge
          style={done === total ? 'teal' : done > 0 ? 'blue' : 'orange'}
          size='small'
          hierarchy='secondary'
          width='hug'
        >
          {`${done}/${total}`}
        </ColorfulBadge>
        <TableEllipsisText
          text={row.tasks.map((t) => EXIT_TASKS[t]?.label).filter(Boolean).join(' · ')}
        />
      </div>
    );
  };

  const renderActions = (row) => (
    row.status === 'done' ? (
      <NeutralSubdueButton
        variant='outline'
        size='sm'
        leadingIcon='undo'
        onClick={(e) => { e.stopPropagation(); reopenExitVisit(row.id); setToast(`เปิด ${row.name} กลับมาแก้ไขแล้ว`); }}
      >
        เปิดกลับมาแก้
      </NeutralSubdueButton>
    ) : (
      <BrandSubdueButton
        variant='fill'
        size='sm'
        leadingIcon='logout'
        onClick={(e) => { e.stopPropagation(); setOpenId(row.id); }}
      >
        {row.status === 'doing' ? 'ทำต่อ' : 'เริ่มส่งกลับ'}
      </BrandSubdueButton>
    )
  );

  const columns = useMemo(() => ([
    {
      key: 'queue', label: 'คิว',
      render: (row) => (
        <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{row.queue}</ColorfulBadge>
      ),
    },
    { key: 'hn', label: 'HN' },
    {
      key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 170,
      render: (row) => (
        <div className='flex items-center gap-2 min-w-0'>
          <PatientAvatar row={row} />
          <MaskedWorklistName name={row.name} recordKey={row.hn || row.queue} />
        </div>
      ),
    },
    { key: 'clinic', label: 'คลินิก', flex: true, minWidth: 150, render: (row) => <TableEllipsisText text={row.clinic} /> },
    { key: 'doctor', label: 'แพทย์ผู้ตรวจ', flex: true, minWidth: 140, render: (row) => <TableEllipsisText text={row.doctor} /> },
    { key: 'diagnosis', label: 'การวินิจฉัย', flex: true, minWidth: 180, render: (row) => <TableEllipsisText text={row.diagnosis} /> },
    { key: 'tasks', label: 'สิ่งที่ต้องทำก่อนกลับ', flex: true, minWidth: 220, sortable: false, render: renderTasks },
    { key: 'examDoneAt', label: 'ตรวจเสร็จเมื่อ' },
    { key: 'waitMinutes', label: 'รอนาน', render: (row) => `${row.waitMinutes} นาที` },
    {
      key: 'status', label: 'สถานะ',
      render: (row) => {
        const s = EXIT_STATUS[row.status] ?? EXIT_STATUS.waiting;
        return (
          <div className='flex flex-col' style={{ gap: 2 }}>
            <ColorfulBadge style={s.badge} size='small' hierarchy='secondary' width='hug'>{s.label}</ColorfulBadge>
            {row.closedAt && (
              <span style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                color: 'var(--text-content-tertiary)',
              }}
              >
                {`${row.closedBy ?? ''} ${row.closedAt}`.trim()}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false, align: 'center',
      render: withEmrRowAction(renderActions),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), []);

  const progress = open ? taskProgress(open) : { done: 0, total: 0, complete: false };

  return (
    <>
      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} />

      {/* ป๊อปอัปปิดเยี่ยม — รายการงานของคนคนนี้ ไม่ใช่ checklist มาตรฐาน */}
      <Popup
        open={!!open}
        onClose={() => setOpenId(null)}
        title={open ? `ส่งกลับ ${open.name}` : 'ส่งกลับ'}
        subtitle={open
          ? `HN ${open.hn} · ${open.clinic} · ${open.doctor} · ${open.diagnosis}`
          : ''}
        size='large'
        primaryAction={{
          label: progress.complete ? 'ยืนยันส่งกลับ' : `ยังเหลือ ${progress.total - progress.done} ข้อ`,
          onClick: handleClose,
          disabled: !progress.complete,
        }}
        secondaryAction={{ label: 'ปิด', onClick: () => setOpenId(null) }}
      >
        {open && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            {open.tasks.map((key) => {
              const task = EXIT_TASKS[key];
              if (!task) return null;
              const checked = !!open.doneTasks?.[key];
              return (
                <button
                  key={key}
                  type='button'
                  onClick={() => toggleExitTask(open.id, key)}
                  className='flex items-start text-left w-full'
                  style={{
                    gap: 'var(--dim-space-300)',
                    padding: 'var(--dim-space-300)',
                    borderRadius: 'var(--dim-radius-300)',
                    background: checked
                      ? 'var(--surface-brandPrimary-quaternary)'
                      : 'var(--surface-card-200)',
                    border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                    cursor: 'pointer',
                  }}
                >
                  {/* กล่องติ๊กเป็นตัวบอกสถานะเท่านั้น — ทั้งแถวคือปุ่มกดอยู่แล้ว
                      ถ้าให้กล่องรับคลิกเองด้วยจะสลับสองครั้งในคลิกเดียว */}
                  <span className='shrink-0' style={{ paddingTop: 2, pointerEvents: 'none' }}>
                    <Checkbox checked={checked} onChange={() => {}} />
                  </span>
                  <Icon name={task.icon} size={20} color='var(--icon-brandPrimary-default)' />
                  <span className='flex flex-col min-w-0 flex-1'>
                    <span style={{
                      fontFamily: 'var(--type-family-body)',
                      fontWeight: 'var(--type-weight-medium)',
                      fontSize: 'var(--type-size-sm)',
                      color: 'var(--text-content-default)',
                    }}
                    >
                      {task.label}
                    </span>
                    <span style={{
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-xs)',
                      color: 'var(--text-content-tertiary)',
                    }}
                    >
                      {task.detail}
                    </span>
                  </span>
                </button>
              );
            })}

            {/* บันทึกของพยาบาล — สิ่งที่ผู้ป่วยถามหรือกังวล ซึ่งไม่มีช่องไหนรับ */}
            <Textarea
              label='บันทึกของพยาบาล Exist Nurse'
              placeholder='เช่น ผู้ป่วยยังไม่เข้าใจวิธีฉีดอินซูลิน นัดมาสอนซ้ำสัปดาห์หน้า'
              rows={3}
              value={open.note}
              onChange={(v) => updateExitRow(open.id, { note: typeof v === 'string' ? v : v?.target?.value ?? '' })}
            />
          </div>
        )}
      </Popup>

      <QueuePageShell
        activeKey='exit'
        breadcrumb={breadcrumb}
        summaryTitle={SUMMARY_TITLE}
        summaryCards={summaryCards}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        leadingActions={<DutyRosterAction />}
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}
        >
          <div
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              boxShadow: 'var(--shadow-card-strong)',
              padding: 'var(--dim-space-600)',
              gap: 'var(--dim-space-600)',
            }}
          >
            <div className='w-full flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex-1' />
              <PrimarySearch
                value={searchQ}
                onChange={setSearchQ}
                onSubmit={(label, item) => { setSearchQ(label); pushHistory(item ?? label); }}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                placeholder='ค้นหา HN / ชื่อ-สกุล / คิว / คลินิก / แพทย์'
                width={640}
              />
              <div className='flex-1' />
            </div>

            <SearchResultCount found={sortedRows.length} total={tabRows.length} />

            <Table
              columns={columns}
              rows={sortedRows}
              rowKey={(row) => row.id}
              sortConfig={sortConfig}
              onSort={handleSort}
              onRowClick={(row) => (row.status === 'done' ? null : setOpenId(row.id))}
              stickyColCount={3}
              stickyRightColCount={1}
              stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
              emptyMessage={activeTab === 'waiting'
                ? 'ไม่มีผู้รับบริการรอส่งกลับ — ทุกคนที่ตรวจเสร็จถูกปิดเยี่ยมแล้ว'
                : 'ไม่พบรายการ'}
            />
          </div>
        </div>
      </QueuePageShell>
    </>
  );
};

export default ExitNurseQueuePage;
