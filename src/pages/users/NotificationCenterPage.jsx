import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import Alert from '@/components/alert/Alert';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Select from '@/components/forms/Select';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import Pagination from '@/components/pagination/Pagination';
import AlertDialog from '@/components/popup/AlertDialog';
import Popup from '@/components/popup/Popup';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { NotificationMatrix } from '@/pages/users/UserNotifyTab';
import {
  AUDIENCES,
  NOTIFICATION_CATEGORIES,
  SEVERITIES,
  acknowledge,
  assignTo,
  getNotifications,
  getNotificationPref,
  isEscalated,
  markAllRead,
  markRead,
  pendingCriticalCount,
  revokeAcknowledge,
  saveNotificationPref,
  subscribeNotifications,
  unreadCount,
} from '@/data/userNotifications';
import { USERS } from '@/data/usersAccess';
import {
  CURRENT_USER_ID,
  EmptyState,
  ModuleCard,
  PermissionGate,
  ReadOnlyNotice,
  SectionTitle,
  auditAdmin,
  currentUserName,
  useActiveCenter,
} from '@/pages/users/usersShared';

/* NotificationCenterPage — TOR §1.17.5.5 "ระบบแจ้งเตือน".

   ครึ่งแรก: ศูนย์รวมการแจ้งเตือน 4 หมวด (รับส่งตัว · รับผล · ส่งตรวจ · ค่าวิกฤต)
   ครึ่งหลัง: แท็บ "ตั้งค่าช่องทาง" ที่ใช้ store เดียวกับแท็บการแจ้งเตือนใน
   หน้าแก้ไขผู้ใช้ (src/data/userNotifications.js).

   ขอบเขตข้อมูลผูกกับศูนย์ที่กำลังให้บริการ — สลับศูนย์แล้วรายการเปลี่ยนตาม. */

const breadcrumb = ['ระบบงานผู้ดูแลระบบ', 'ผู้ใช้และสิทธิ์การเข้าถึง', 'ศูนย์รวมการแจ้งเตือน'];
const PAGE_SIZE = 20;

const FILTER_DEFAULTS = { severity: 'all', status: 'all', audience: 'all', day: 'all' };

const catMeta = (key) => NOTIFICATION_CATEGORIES.find((c) => c.key === key);
const sevMeta = (key) => SEVERITIES.find((s) => s.key === key);

const NotificationRow = ({ item, onOpen, onAck, onRead, onAssign, readOnly }) => {
  const cat = catMeta(item.category);
  const sev = sevMeta(item.severity);
  const escalated = isEscalated(item);
  return (
    <div
      className='flex flex-wrap items-start w-full'
      style={{
        gap: 'var(--dim-space-300, 12px)',
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        paddingLeft: 'var(--dim-space-300, 12px)',
        paddingRight: 'var(--dim-space-300, 12px)',
        background: item.read ? 'var(--surface-card-100)' : 'var(--surface-brandPrimary-quaternary)',
        border: `var(--dim-stroke-100, 1px) solid ${escalated ? 'var(--text-pill-red)' : 'var(--border-card-default)'}`,
        borderRadius: 'var(--dim-radius-300, 10px)',
      }}
    >
      <span
        className='shrink-0 inline-flex items-center justify-center'
        style={{
          width: 'var(--dim-size-800, 40px)',
          height: 'var(--dim-size-800, 40px)',
          borderRadius: 'var(--dim-radius-300, 10px)',
          background: item.severity === 'critical' ? 'var(--surface-pill-red)' : 'var(--surface-pill-blue)',
          color: item.severity === 'critical' ? 'var(--text-pill-red)' : 'var(--text-pill-blue)',
        }}
      >
        <Icon name={cat?.icon || 'notifications'} size={20} />
      </span>

      <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-150, 6px)' }}>
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <span style={{ color: 'var(--text-content-primary)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: item.read ? 'var(--type-weight-regular, 400)' : 'var(--type-weight-bold, 700)' }}>
            {item.title}
          </span>
          <ColorfulBadge style={cat?.tone || 'grey'} size='small'>{cat?.label}</ColorfulBadge>
          <ColorfulBadge style={sev?.tone || 'grey'} size='small' showDot>{sev?.label}</ColorfulBadge>
          {!item.read ? <ColorfulBadge style='blue' size='small'>ยังไม่อ่าน</ColorfulBadge> : null}
          {item.acknowledged ? <ColorfulBadge style='green' size='small' icon='check_circle'>รับทราบแล้ว</ColorfulBadge> : null}
          {escalated ? <ColorfulBadge style='red' size='small' icon='priority_high'>เกินเวลารับทราบ</ColorfulBadge> : null}
          {item.sourceCancelled ? <ColorfulBadge style='grey' size='small' icon='block'>รายการต้นทางถูกยกเลิก</ColorfulBadge> : null}
        </div>
        <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs, 12px)' }}>{item.body}</span>
        <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>
          {item.patient} · HN {item.hn} · จาก {item.source} · {item.at}
          {' · '}{AUDIENCES.find((a) => a.key === item.audience)?.label}
          {item.assignedTo ? ` · มอบหมายให้ ${item.assignedTo}` : ''}
          {item.acknowledged ? ` · รับทราบโดย ${item.ackBy} เมื่อ ${item.ackAt}` : ''}
        </span>
      </div>

      <div className='flex flex-wrap items-center shrink-0' style={{ gap: 'var(--dim-space-150, 6px)' }}>
        {!item.read ? (
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='drafts' onClick={() => onRead(item)}>ทำเครื่องหมายอ่าน</NeutralSubdueButton>
        ) : null}
        {!item.acknowledged ? (
          <BrandSubdueButton variant='outline' size='sm' leadingIcon='task_alt' disabled={readOnly} onClick={() => onAck(item)}>รับทราบ</BrandSubdueButton>
        ) : (
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='undo' disabled={readOnly} onClick={() => onAck(item, true)}>ยกเลิกการรับทราบ</NeutralSubdueButton>
        )}
        <NeutralSubdueButton variant='outline' size='sm' leadingIcon='person_add' disabled={readOnly} onClick={() => onAssign(item)}>มอบหมายต่อ</NeutralSubdueButton>
        <NeutralSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='open_in_new'
          disabled={item.sourceCancelled}
          title={item.sourceCancelled ? 'รายการต้นทางถูกยกเลิกแล้ว' : undefined}
          onClick={() => onOpen(item)}
        >
          ไปยังต้นทาง
        </NeutralSubdueButton>
      </div>
    </div>
  );
};

const NotificationCenterPage = () => {
  const history = useHistory();
  const { center, label: centerName } = useActiveCenter();

  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [ackTarget, setAckTarget] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignee, setAssignee] = useState('');
  const [toast, setToast] = useState('');
  const [prefUserId, setPrefUserId] = useState(CURRENT_USER_ID);
  const [pref, setPref] = useState(() => getNotificationPref(CURRENT_USER_ID));
  const [prefSaved, setPrefSaved] = useState('');
  const [prefError, setPrefError] = useState('');

  useEffect(() => subscribeNotifications(() => setTick((t) => t + 1)), []);
  useEffect(() => { setPage(1); }, [activeTab, filters, searchQ, center]);
  useEffect(() => { setPref(getNotificationPref(prefUserId)); setPrefSaved(''); setPrefError(''); }, [prefUserId]);

  const items = useMemo(
    () => getNotifications(center),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [center, tick],
  );

  const tabs = useMemo(() => ([
    { key: 'all', label: 'ทั้งหมด', icon: 'inbox', count: items.length },
    ...NOTIFICATION_CATEGORIES.map((c) => ({
      key: c.key, label: c.label, icon: c.icon, count: items.filter((i) => i.category === c.key).length,
    })),
    { key: 'settings', label: 'ตั้งค่าช่องทาง', icon: 'tune' },
  ]), [items]);

  const summaryCards = useMemo(() => ([
    { key: 'unread',   label: `ยังไม่อ่านที่ ${centerName}`, value: unreadCount(center), color: 'info', icon: 'mark_email_unread' },
    { key: 'urgent',   label: 'เร่งด่วน/วิกฤตที่ยังไม่จบ',   value: items.filter((i) => i.severity !== 'normal' && !i.acknowledged).length, color: 'inprogress', icon: 'priority_high' },
    { key: 'critical', label: 'ค่าวิกฤตรอรับทราบ',           value: pendingCriticalCount(center), color: 'destructive', icon: 'emergency' },
    { key: 'done',     label: 'รับทราบแล้ววันนี้',            value: items.filter((i) => i.acknowledged).length, color: 'positive', icon: 'task_alt' },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [items, center, centerName, tick]);

  const setFilter = (key) => (value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const isAllDefault = Object.keys(FILTER_DEFAULTS).every((k) => filters[k] === FILTER_DEFAULTS[k]) && !searchQ;
  const filtersActive = !isAllDefault;
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setFilters(FILTER_DEFAULTS);
      setSearchQ('');
    },
  );

  const filtered = useMemo(() => {
    let rows = items;
    if (activeTab !== 'all' && activeTab !== 'settings') rows = rows.filter((i) => i.category === activeTab);
    if (filters.severity !== 'all') rows = rows.filter((i) => i.severity === filters.severity);
    if (filters.audience !== 'all') rows = rows.filter((i) => i.audience === filters.audience);
    if (filters.status !== 'all') {
      rows = rows.filter((i) => (
        filters.status === 'unread' ? !i.read
          : filters.status === 'read' ? (i.read && !i.acknowledged)
            : i.acknowledged
      ));
    }
    if (filters.day !== 'all') {
      rows = rows.filter((i) => (filters.day === 'today' ? i.at.includes('3 ส.ค.') : !i.at.includes('3 ส.ค.')));
    }
    const q = searchQ.trim().toLowerCase();
    if (q) rows = rows.filter((i) => [i.title, i.patient, i.hn, i.body].some((f) => f && String(f).toLowerCase().includes(q)));
    return rows;
  }, [items, activeTab, filters, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const escalatedCritical = items.filter((i) => isEscalated(i));

  const doAck = () => {
    const { item, revoke } = ackTarget;
    if (revoke) {
      revokeAcknowledge(item.id);
      auditAdmin(`ยกเลิกการรับทราบการแจ้งเตือน "${item.title}"`);
      setToast('ยกเลิกการรับทราบแล้ว');
    } else {
      acknowledge(item.id, currentUserName());
      auditAdmin(`รับทราบการแจ้งเตือน${item.category === 'critical' ? 'ค่าวิกฤต' : ''} "${item.title}" (${item.patient} HN ${item.hn})`);
      setToast(`บันทึกการรับทราบโดย ${currentUserName()} แล้ว`);
    }
    setAckTarget(null);
    setTimeout(() => setToast(''), 4000);
  };

  const doAssign = () => {
    if (!assignee) return;
    assignTo(assignTarget.id, assignee);
    auditAdmin(`มอบหมายการแจ้งเตือน "${assignTarget.title}" ให้ ${assignee}`);
    setToast(`มอบหมายให้ ${assignee} แล้ว`);
    setAssignTarget(null);
    setAssignee('');
    setTimeout(() => setToast(''), 4000);
  };

  const savePref = () => {
    const result = saveNotificationPref(prefUserId, pref);
    if (!result.ok) {
      setPrefError(Object.values(result.errors).join(' · '));
      setPrefSaved('');
      return;
    }
    setPrefError('');
    setPrefSaved('บันทึกการตั้งค่าช่องทางเรียบร้อยแล้ว');
    auditAdmin(`บันทึกการตั้งค่าช่องทางแจ้งเตือนของ ${USERS.find((u) => u.id === prefUserId)?.name || prefUserId}`);
    setTimeout(() => setPrefSaved(''), 4000);
  };

  const renderList = (readOnly) => (
    <ModuleCard>
      {readOnly ? <ReadOnlyNotice feature='ศูนย์รวมการแจ้งเตือน' /> : null}
      {toast ? <Alert type='success' title='ดำเนินการสำเร็จ' subtext={toast} onClose={() => setToast('')} /> : null}

      <Alert
        type='info'
        title='ขอบเขตข้อมูลผูกกับศูนย์ที่กำลังให้บริการ'
        subtext={`ขณะนี้แสดงเฉพาะการแจ้งเตือนของ ${centerName} — สลับศูนย์ที่หน้าผู้ใช้และสิทธิ์เพื่อดูของศูนย์อื่น. การ "รับทราบ" ที่นี่เป็นบันทึกฝั่งผู้ดูแลระบบเท่านั้น ไม่เขียนทับสถานะในระบบห้องปฏิบัติการ`}
      />

      {escalatedCritical.length > 0 ? (
        <Alert
          type='error'
          title={`ค่าวิกฤตค้างรับทราบเกินเวลา ${escalatedCritical.length} รายการ`}
          subtext={escalatedCritical.map((i) => `${i.title} (${i.patient})`).join(' | ')}
        />
      ) : null}

      <div className='w-full flex items-start justify-center'>
        <PrimarySearch value={searchQ} onChange={setSearchQ} onSubmit={setSearchQ} placeholder='ค้นหา HN / ชื่อผู้รับบริการ / หัวข้อ' width={640} />
      </div>

      <div className='flex flex-wrap items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <OverflowFlexRow itemGap='var(--dim-space-200, 8px)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
          <FilterDropdown prefix='ความรุนแรง:' options={[{ value: 'all', label: 'ทุกระดับ' }, ...SEVERITIES.map((s) => ({ value: s.key, label: s.label }))]} value={filters.severity} onChange={setFilter('severity')} />
          <FilterDropdown
            prefix='สถานะ:'
            options={[
              { value: 'all', label: 'ทุกสถานะ' },
              { value: 'unread', label: 'ยังไม่อ่าน' },
              { value: 'read', label: 'อ่านแล้ว' },
              { value: 'acked', label: 'รับทราบแล้ว' },
            ]}
            value={filters.status}
            onChange={setFilter('status')}
          />
          <FilterDropdown prefix='ผู้รับ:' options={[{ value: 'all', label: 'ทั้งหมด' }, ...AUDIENCES.map((a) => ({ value: a.key, label: a.label }))]} value={filters.audience} onChange={setFilter('audience')} />
          <FilterDropdown
            prefix='ช่วงวัน:'
            options={[{ value: 'all', label: 'ทุกวัน' }, { value: 'today', label: 'วันนี้' }, { value: 'earlier', label: 'ก่อนหน้านี้' }]}
            value={filters.day}
            onChange={setFilter('day')}
          />
          <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
        </OverflowFlexRow>
        <div className='flex-1' />
        <NeutralSubdueButton
          variant='outline'
          size='md'
          leadingIcon='mark_email_read'
          disabled={readOnly || unreadCount(center) === 0}
          onClick={() => { markAllRead(center); auditAdmin(`ทำเครื่องหมายอ่านทั้งหมดที่ ${centerName}`); }}
        >
          ทำเครื่องหมายอ่านทั้งหมด
        </NeutralSubdueButton>
      </div>

      <SearchResultCount found={filtered.length} total={items.length} />

      {items.length === 0 ? (
        <EmptyState
          icon='notifications_off'
          title={`ยังไม่มีการแจ้งเตือนที่ ${centerName}`}
          subtitle='เมื่อมีการส่งต่อผู้ป่วย ผลตรวจกลับมา หรือพบค่าวิกฤต ระบบจะแจ้งที่นี่ทันที'
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon='search_off'
          title='ไม่พบการแจ้งเตือนที่ตรงกับเงื่อนไข'
          subtitle='ลองล้างตัวกรองหรือเปลี่ยนหมวดด้านบน'
          action={<NeutralSubdueButton variant='outline' size='md' leadingIcon='filter_alt_off' onClick={clearFilters}>ล้างตัวกรอง</NeutralSubdueButton>}
        />
      ) : (
        <SmoothFilterResults opaque={resultsOpaque}>
        <>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {pageRows.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                readOnly={readOnly}
                onRead={(i) => { markRead(i.id, true); }}
                onAck={(i, revoke) => setAckTarget({ item: i, revoke: !!revoke })}
                onAssign={(i) => { setAssignTarget(i); setAssignee(''); }}
                onOpen={(i) => { markRead(i.id, true); history.push(i.link); }}
              />
            ))}
          </div>
          <div
            className='flex items-center w-full'
            style={{ gap: 'var(--dim-space-200, 8px)', paddingTop: 'var(--dim-space-200, 8px)', borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)' }}
          >
            <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm, 14px)' }}>
              {`แสดง ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} จาก ${filtered.length} รายการ`}
            </span>
            <div className='flex-1' />
            <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
          </div>
        </>
        </SmoothFilterResults>
      )}
    </ModuleCard>
  );

  const renderSettings = (readOnly) => (
    <ModuleCard>
      <SectionTitle
        icon='tune'
        title='ตั้งค่าช่องทางการแจ้งเตือน'
        subtitle='ค่าเดียวกับแท็บ "การแจ้งเตือน" ในหน้าแก้ไขผู้ใช้ — แก้ที่ไหนก็เห็นตรงกัน'
        action={(
          <div style={{ width: 280 }}>
            <Select
              label='บัญชีที่กำลังตั้งค่า'
              value={prefUserId}
              onChange={setPrefUserId}
              options={USERS.map((u) => ({ value: u.id, label: `${u.name}${u.id === CURRENT_USER_ID ? ' (บัญชีของฉัน)' : ''}` }))}
              disabled={readOnly}
            />
          </div>
        )}
      />
      {prefUserId !== CURRENT_USER_ID ? (
        <Alert type='warning' title='กำลังแก้การตั้งค่าของผู้ใช้คนอื่น' subtext='ต้องมีสิทธิ์แก้ไข และการเปลี่ยนแปลงจะถูกบันทึกลงประวัติการใช้งานพร้อมชื่อผู้แก้' />
      ) : null}
      {prefError ? <Alert type='error' title='บันทึกไม่สำเร็จ' subtext={prefError} /> : null}
      {prefSaved ? <Alert type='success' title='บันทึกสำเร็จ' subtext={prefSaved} onClose={() => setPrefSaved('')} /> : null}

      <NotificationMatrix pref={pref} onChange={setPref} readOnly={readOnly} />

      <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <div className='flex-1' />
        <NeutralSubdueButton variant='outline' size='md' onClick={() => { setPref(getNotificationPref(prefUserId)); setPrefError(''); setPrefSaved(''); }}>
          ยกเลิกการแก้ไข
        </NeutralSubdueButton>
        <BrandButton size='md' leadingIcon='save' disabled={readOnly} onClick={savePref}>บันทึกการตั้งค่า</BrandButton>
      </div>
    </ModuleCard>
  );

  return (
    <QueuePageShell
      activeKey='users'
      breadcrumb={breadcrumb}
      title={`ศูนย์รวมการแจ้งเตือน — ${centerName}`}
      onBack={() => history.push('/users')}
      backLabel='กลับไปหน้าผู้ใช้'
      summaryCards={summaryCards}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <AlertDialog
        open={!!ackTarget}
        type={ackTarget?.revoke ? 'warning' : (ackTarget?.item?.category === 'critical' ? 'warning' : 'info')}
        title={ackTarget?.revoke ? 'ยกเลิกการรับทราบ ?' : 'ยืนยันการรับทราบ'}
        description={ackTarget
          ? (ackTarget.revoke
            ? `ระบบจะลบชื่อผู้รับทราบและเวลาออกจากรายการ "${ackTarget.item.title}" และนับเป็นรายการที่ยังไม่ถูกรับทราบอีกครั้ง`
            : `ระบบจะบันทึกว่า "${currentUserName()}" รับทราบ "${ackTarget.item.title}" (${ackTarget.item.patient} · HN ${ackTarget.item.hn}) พร้อมวันเวลา — สำหรับค่าวิกฤตการรับทราบเป็นข้อบังคับ ปิดทิ้งเฉย ๆ ไม่ได้`)
          : ''}
        cancelLabel='ยกเลิก'
        confirmLabel={ackTarget?.revoke ? 'ยืนยันยกเลิกการรับทราบ' : 'บันทึกการรับทราบ'}
        onCancel={() => setAckTarget(null)}
        onClose={() => setAckTarget(null)}
        onConfirm={doAck}
      />

      <Popup
        open={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title='มอบหมายการแจ้งเตือนต่อ'
        subtitle={assignTarget ? assignTarget.title : ''}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setAssignTarget(null) }}
        primaryAction={{ label: 'มอบหมาย', onClick: doAssign, disabled: !assignee }}
      >
        <Select
          label='มอบหมายให้'
          value={assignee}
          onChange={setAssignee}
          options={USERS.filter((u) => u.status === 'active').map((u) => ({ value: u.name, label: u.name }))}
          placeholder='เลือกเจ้าหน้าที่'
        />
      </Popup>

      <div className='flex flex-col flex-1 min-w-0' style={{ paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-500, 20px)' }}>
        <PermissionGate feature='users.manage' featureLabel='จัดการผู้ใช้และสิทธิ์'>
          {(readOnly) => (activeTab === 'settings' ? renderSettings(readOnly) : renderList(readOnly))}
        </PermissionGate>
      </div>
    </QueuePageShell>
  );
};

export default NotificationCenterPage;
