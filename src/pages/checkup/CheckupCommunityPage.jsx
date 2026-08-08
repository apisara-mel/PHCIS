import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Table from '@/components/table/Table';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import TimePicker from '@/components/forms/TimePicker';
import AddressMapBlock from '@/components/forms/AddressMapBlock';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { UploadProgressBox, useSmoothUploadProgress } from '@/components/forms/UploadProgressBar';
import {
  COMMUNITY_STATUSES, COMMUNITY_FILE_ACCEPT, CHECKUP_ACTIVITY_SUGGESTIONS,
  CANCEL_REASON_SUGGESTIONS,
  listCommunityActivities, saveCommunityActivity,
  cancelCommunityActivity, restoreCommunityActivity, isCommunityDocFile,
  uniqueAttachmentName, listTargetGroups, formatThaiDate, formatThaiDateTime,
} from '@/data/checkupStore';
import {
  PageBody, PageCard, PagerRow, EmptyState, NoticeBar, SectionHeader,
  ReadField, StatTile, CheckupAuditBar,
} from '@/pages/checkup/CheckupUi';

/* CheckupCommunityPage — กิจกรรมสุขภาพชุมชน / ออกหน่วย (TOR 1.19.8).

   ทะเบียนโครงการ + create/edit on the same route: ชื่อโครงการ, นัดหมายวัน-เวลา,
   สถานที่พร้อม mock map (AddressMapBlock), กลุ่มเป้าหมายที่ผูก, ผลการทำกิจกรรม,
   และแนบเอกสารโครงการ DOC/PDF (หลายไฟล์ · ลบ/ดาวน์โหลดได้).

   Verbs: แสดง · บันทึก · แก้ไข · ยกเลิก (เหตุผลบังคับ + กู้คืนได้). */

const breadcrumb = ['ระบบงานตรวจสุขภาพ', 'กิจกรรมสุขภาพชุมชน'];
const PAGE_SIZE = 10;

const EMPTY_ACTIVITY = {
  id: '', name: '', date: '', timeStart: '', timeEnd: '', place: '',
  location: { lat: 13.7563, lng: 100.5018 },
  groupId: '', status: 'planned', attendees: '', targetAttendees: '',
  outcome: '', attachments: [],
};

const STATUS_OPTIONS = Object.values(COMMUNITY_STATUSES)
  .filter((s) => s.key !== 'cancelled')
  .map((s) => ({ value: s.key, label: s.label }));

/* ── attachments (§1.19.8 DOC/PDF) ───────────────────────────────── */

const AttachmentSection = ({ files, onChange, readOnly }) => {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);

  const finish = () => {
    if (!pending) return;
    onChange([
      ...files,
      {
        id: `F-${Date.now()}`,
        name: uniqueAttachmentName(pending.name, files),
        size: pending.size,
        type: /\.pdf$/i.test(pending.name) ? 'pdf' : 'doc',
        uploadedAt: new Date().toISOString(),
      },
    ]);
    setPending(null);
  };

  const progress = useSmoothUploadProgress({ active: !!pending, durationMs: 1000, onDone: finish });

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isCommunityDocFile(file.name)) {
      setError(`ไฟล์ "${file.name}" ไม่รองรับ — แนบได้เฉพาะไฟล์เอกสาร DOC / DOCX / PDF`);
      return;
    }
    setError('');
    const kb = file.size / 1024;
    setPending({ name: file.name, size: kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB` });
  };

  const columns = [
    {
      key: 'name',
      label: 'ชื่อไฟล์',
      flex: true,
      minWidth: 280,
      render: (r) => (
        <span className='inline-flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
          <Icon name={r.type === 'pdf' ? 'picture_as_pdf' : 'description'} size={18} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
        </span>
      ),
    },
    { key: 'size', label: 'ขนาด' },
    { key: 'uploadedAt', label: 'แนบเมื่อ', render: (r) => formatThaiDateTime(r.uploadedAt) },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
          <BrandSubdueIconButton
            variant='outline'
            size='sm'
            icon='download'
            aria-label={`ดาวน์โหลด ${r.name}`}
            onClick={() => {
              /* Prototype download — emits a placeholder text file so the
                 action is observable without a real document store. */
              const blob = new Blob([`เอกสารตัวอย่างสำหรับ ${r.name}`], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = r.name;
              a.click();
              URL.revokeObjectURL(url);
            }}
          />
          <BrandSubdueIconButton
            variant='outline'
            size='sm'
            icon='delete'
            disabled={readOnly}
            aria-label={`ลบไฟล์ ${r.name}`}
            onClick={() => setRemoveTarget(r)}
          />
        </span>
      ),
    },
  ];

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <SectionHeader
        icon='attach_file'
        title='เอกสารโครงการที่แนบ'
        subtitle='รองรับไฟล์ DOC / DOCX / PDF — แนบได้หลายไฟล์ ดาวน์โหลดหรือลบได้'
        trailing={(
          <BrandSubdueButton variant='outline' size='sm' leadingIcon='upload_file' disabled={readOnly} onClick={() => inputRef.current?.click()}>
            แนบเอกสาร
          </BrandSubdueButton>
        )}
      />
      <input
        ref={inputRef}
        type='file'
        accept={COMMUNITY_FILE_ACCEPT}
        onChange={handleFile}
        style={{ display: 'none' }}
        aria-hidden
      />
      {error ? <NoticeBar tone='danger' icon='error'>{error}</NoticeBar> : null}
      {pending ? <UploadProgressBox progress={progress} fileName={pending.name} label='กำลังแนบเอกสารโครงการ…' /> : null}
      {files.length === 0 ? (
        <EmptyState
          compact
          icon='folder_open'
          title='ยังไม่มีเอกสารโครงการที่แนบ'
          subtitle='แนบเอกสารโครงการหรือสรุปผลกิจกรรมในรูปแบบ DOC / PDF'
          actionLabel={readOnly ? undefined : 'แนบเอกสาร'}
          onAction={readOnly ? undefined : () => inputRef.current?.click()}
        />
      ) : (
        <Table columns={columns} rows={files} rowKey={(r) => r.id} emptyMessage='ไม่มีไฟล์แนบ' />
      )}

      <Popup
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title='ยืนยันลบไฟล์แนบ'
        subtitle={removeTarget?.name}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setRemoveTarget(null) }}
        primaryAction={{
          label: 'ลบไฟล์',
          tone: 'danger',
          onClick: () => {
            onChange(files.filter((f) => f.id !== removeTarget.id));
            setRemoveTarget(null);
          },
        }}
      >
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
          {`ลบไฟล์ "${removeTarget?.name}" ออกจากโครงการนี้? การลบไม่สามารถย้อนกลับได้`}
        </span>
      </Popup>
    </div>
  );
};

/* ── page ────────────────────────────────────────────────────────── */

const CheckupCommunityPage = () => {
  const history = useHistory();
  const [mode, setMode] = useState('list');
  const [form, setForm] = useState(EMPTY_ACTIVITY);
  const [isNew, setIsNew] = useState(false);
  const [errors, setErrors] = useState({});
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [toast, setToast] = useState('');

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const activities = useMemo(() => listCommunityActivities(), [tick]);
  const groups = useMemo(() => listTargetGroups().filter((g) => g.status !== 'cancelled'), []);
  const groupOptions = useMemo(
    () => [{ value: '', label: 'ไม่ผูกกลุ่มเป้าหมาย' }, ...groups.map((g) => ({ value: g.id, label: `${g.code} — ${g.name}` }))],
    [groups],
  );

  const filtered = useMemo(() => {
    let rows = activities;
    if (activeTab === 'upcoming') rows = rows.filter((a) => a.status === 'planned' || a.status === 'running');
    if (activeTab === 'done') rows = rows.filter((a) => a.status === 'done');
    if (activeTab === 'cancelled') rows = rows.filter((a) => a.status === 'cancelled');
    if (statusFilter !== 'all') rows = rows.filter((a) => a.status === statusFilter);
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      rows = rows.filter((a) => [a.name, a.place, a.outcome].some((f) => f && f.toLowerCase().includes(q)));
    }
    return rows;
  }, [activities, activeTab, statusFilter, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const startNew = () => {
    setForm({ ...EMPTY_ACTIVITY, id: `ACT-${Date.now().toString().slice(-6)}` });
    setIsNew(true);
    setErrors({});
    setMode('edit');
  };

  const startEdit = (a) => {
    setForm({ ...EMPTY_ACTIVITY, ...a, attendees: a.attendees ?? '', targetAttendees: a.targetAttendees ?? '' });
    setIsNew(false);
    setErrors({});
    setMode('edit');
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'ต้องระบุชื่อโครงการหรือกิจกรรม';
    if (!form.date) e.date = 'ต้องระบุวันที่นัดหมาย';
    if (!form.place.trim()) e.place = 'ต้องระบุสถานที่จัดกิจกรรม';
    if (form.timeStart && form.timeEnd && form.timeEnd <= form.timeStart) e.timeEnd = 'เวลาสิ้นสุดต้องหลังเวลาเริ่ม';
    if (form.status === 'done' && !(form.outcome || '').trim()) e.outcome = 'สถานะ "สรุปแล้ว" ต้องบันทึกผลการทำกิจกรรม';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    saveCommunityActivity({
      ...form,
      name: form.name.trim(),
      attendees: Number(form.attendees) || 0,
      targetAttendees: Number(form.targetAttendees) || 0,
    });
    setTick((t) => t + 1);
    setToast(`บันทึกกิจกรรม "${form.name}" เรียบร้อยแล้ว`);
    setMode('list');
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) { setCancelError('ต้องระบุเหตุผลการยกเลิกกิจกรรม'); return; }
    cancelCommunityActivity(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };

  const columns = useMemo(() => ([
    {
      key: 'name',
      label: 'ชื่อโครงการ / กิจกรรม',
      flex: true,
      minWidth: 320,
      render: (r) => (
        <span className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm, 14px)' }}>{r.name}</span>
          {r.groupId ? (
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
              {`ผูกกลุ่มเป้าหมาย: ${groups.find((g) => g.id === r.groupId)?.name || r.groupId}`}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'date',
      label: 'วันที่นัดหมาย',
      render: (r) => (
        <span className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm, 14px)' }}>{formatThaiDate(r.date)}</span>
          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {r.timeStart ? `${r.timeStart}${r.timeEnd ? `–${r.timeEnd}` : ''} น.` : '—'}
          </span>
        </span>
      ),
    },
    { key: 'place', label: 'สถานที่', flex: true, minWidth: 260 },
    {
      key: 'attendees',
      label: 'ผู้เข้าร่วม',
      align: 'center',
      render: (r) => `${r.attendees || 0}${r.targetAttendees ? ` / ${r.targetAttendees}` : ''} คน`,
    },
    {
      key: 'attachments',
      label: 'เอกสารแนบ',
      align: 'center',
      render: (r) => ((r.attachments || []).length > 0
        ? <ColorfulBadge style='indigo' size='small' hierarchy='secondary' icon='attach_file'>{`${r.attachments.length} ไฟล์`}</ColorfulBadge>
        : <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>—</span>),
    },
    {
      key: 'status',
      label: 'สถานะ',
      render: (r) => {
        const cfg = COMMUNITY_STATUSES[r.status] || COMMUNITY_STATUSES.planned;
        return (
          <span className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
            <ColorfulBadge style={cfg.badge} size='small' hierarchy='secondary'>{cfg.label}</ColorfulBadge>
            {r.status === 'cancelled' && r.cancelReason ? (
              <span title={r.cancelReason} style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 'var(--dim-size-2100, 160px)' }}>
                {r.cancelReason}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
          <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={(e) => { e.stopPropagation(); startEdit(r); }}>
            แสดง / แก้ไข
          </BrandSubdueButton>
          {r.status === 'cancelled' ? (
            <BrandSubdueButton variant='fill' size='sm' leadingIcon='restart_alt' onClick={(e) => { e.stopPropagation(); restoreCommunityActivity(r.id); setTick((t) => t + 1); }}>
              กู้คืน
            </BrandSubdueButton>
          ) : (
            <NeutralSubdueButton size='sm' leadingIcon='block' onClick={(e) => { e.stopPropagation(); setCancelReason(''); setCancelError(''); setCancelTarget(r); }}>
              ยกเลิก
            </NeutralSubdueButton>
          )}
        </span>
      ),
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  ]), [groups]);

  const tabs = [
    { key: 'all', label: `ทั้งหมด (${activities.length})`, icon: 'list' },
    { key: 'upcoming', label: `วางแผน / กำลังดำเนินการ (${activities.filter((a) => a.status === 'planned' || a.status === 'running').length})`, icon: 'event_upcoming' },
    { key: 'done', label: `สรุปแล้ว (${activities.filter((a) => a.status === 'done').length})`, icon: 'fact_check' },
    { key: 'cancelled', label: `ยกเลิก (${activities.filter((a) => a.status === 'cancelled').length})`, icon: 'block' },
  ];

  const readOnly = form.status === 'cancelled';

  return (
    <QueuePageShell
      activeKey='checkup'
      breadcrumb={mode === 'edit' ? [...breadcrumb, form.name || 'กิจกรรมใหม่'] : breadcrumb}
      title={mode === 'edit' ? (isNew ? 'สร้างกิจกรรมสุขภาพชุมชนใหม่' : 'แก้ไขกิจกรรมสุขภาพชุมชน') : 'กิจกรรมสุขภาพชุมชน / ออกหน่วย'}
      onBack={() => (mode === 'edit' ? setMode('list') : history.push('/checkup'))}
      backLabel={mode === 'edit' ? 'กลับไปทะเบียนกิจกรรม' : 'กลับไปคิวตรวจสุขภาพ'}
      actions={mode === 'list' ? (
        <BrandSubdueButton variant='fill' size='md' leadingIcon='add' onClick={startNew}>
          สร้างกิจกรรมใหม่
        </BrandSubdueButton>
      ) : (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueButton size='md' leadingIcon='print' onClick={() => { if (typeof window !== 'undefined') window.print(); }}>
            พิมพ์รายละเอียดโครงการ
          </NeutralSubdueButton>
          <BrandSubdueButton variant='fill' size='md' leadingIcon='save' disabled={readOnly} onClick={handleSave}>
            บันทึกกิจกรรม
          </BrandSubdueButton>
        </div>
      )}
      tabs={mode === 'list' ? tabs : undefined}
      activeTab={activeTab}
      onTabChange={(k) => { setActiveTab(k); setPage(1); }}
    >
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกกิจกรรมสุขภาพชุมชน'
        subtitle={cancelTarget?.name}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกกิจกรรม', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          <NoticeBar tone='warning' icon='warning'>
            ระบบไม่ลบโครงการ แต่จะตั้งสถานะเป็น "ยกเลิก" พร้อมเหตุผล ผู้ยกเลิก และเวลา — กู้คืนได้ภายหลัง
          </NoticeBar>
          <SuggestibleTextarea
            voice
            label='เหตุผลการยกเลิกกิจกรรม'
            required
            value={cancelReason}
            onChange={(e) => { setCancelReason(e?.target ? e.target.value : e); setCancelError(''); }}
            placeholder='เช่น ฝนตกหนัก เลื่อนกิจกรรมออกไป'
            suggestions={[
              'ฝนตกหนัก เลื่อนกิจกรรมออกไป',
              'ชุมชนขอเลื่อนวันจัดกิจกรรม',
              'บุคลากรไม่เพียงพอ',
              'ซ้ำกับกิจกรรมอื่นในวันเดียวกัน',
              ...CANCEL_REASON_SUGGESTIONS,
            ]}
            minChars={2}
          />
          {cancelError ? (
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-danger-secondary, #DC2626)' }}>
              {cancelError}
            </span>
          ) : null}
        </div>
      </Popup>

      <PageBody>
        {toast ? (
          <NoticeBar
            tone='success'
            icon='check_circle'
            trailing={(
              <button type='button' aria-label='ปิดการแจ้งเตือน' onClick={() => setToast('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                <Icon name='close' size={16} />
              </button>
            )}
          >
            {toast}
          </NoticeBar>
        ) : null}

        {mode === 'list' ? (
          <PageCard>
            <div className='w-full flex items-start justify-center'>
              <PrimarySearch
                value={searchQ}
                onChange={(v) => { setSearchQ(v); setPage(1); }}
                onSubmit={(label) => setSearchQ(label)}
                placeholder='ค้นหาชื่อโครงการ / สถานที่ / ผลการทำกิจกรรม'
                width={640}
              />
            </div>

            <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
                <FilterTag value='ทั้งหมด' selected={statusFilter === 'all'} onClick={() => { setStatusFilter('all'); setPage(1); }} />
                <FilterDropdown
                  prefix='สถานะ:'
                  options={[{ value: 'all', label: 'ทุกสถานะ' }, ...Object.values(COMMUNITY_STATUSES).map((s) => ({ value: s.key, label: s.label }))]}
                  value={statusFilter}
                  onChange={(v) => { setStatusFilter(v); setPage(1); }}
                />
              </OverflowFlexRow>
            </div>

            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <StatTile label='โครงการทั้งหมด' value={activities.length} unit='โครงการ' tone='info' icon='volunteer_activism' />
              <StatTile label='ผู้เข้าร่วมสะสม' value={activities.reduce((s, a) => s + (a.attendees || 0), 0)} unit='คน' tone='brand' icon='groups' />
              <StatTile label='เอกสารแนบทั้งหมด' value={activities.reduce((s, a) => s + (a.attachments || []).length, 0)} unit='ไฟล์' tone='info' icon='attach_file' />
            </div>

            {activities.length === 0 ? (
              <EmptyState
                icon='volunteer_activism'
                title='ยังไม่มีกิจกรรมสุขภาพชุมชน'
                subtitle='สร้างโครงการหรือกิจกรรมแรก ระบุวันนัดหมาย สถานที่ และแนบเอกสารโครงการ'
                actionLabel='สร้างกิจกรรมแรก'
                onAction={startNew}
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon='search_off'
                title='ไม่พบผลลัพธ์'
                subtitle='ลองปรับคำค้นหาหรือล้างตัวกรองสถานะ'
                actionLabel='ล้างตัวกรองทั้งหมด'
                onAction={() => { setSearchQ(''); setStatusFilter('all'); setActiveTab('all'); }}
              />
            ) : (
              <>
                <Table
                  columns={columns}
                  rows={pageRows}
                  rowKey={(r) => r.id}
                  onRowClick={startEdit}
                  stickyColCount={1}
                  stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                  emptyMessage='ไม่พบรายการ'
                />
                <PagerRow page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} unit='โครงการ' />
              </>
            )}
          </PageCard>
        ) : (
          <>
            {readOnly ? (
              <NoticeBar
                tone='danger'
                icon='block'
                trailing={(
                  <BrandSubdueButton variant='outline' size='sm' leadingIcon='restart_alt' onClick={() => { restoreCommunityActivity(form.id); setForm((f) => ({ ...f, status: 'planned', cancelReason: '' })); setTick((t) => t + 1); }}>
                    กู้คืนกิจกรรม
                  </BrandSubdueButton>
                )}
              >
                {`กิจกรรมนี้ถูกยกเลิกแล้ว${form.cancelReason ? ` — ${form.cancelReason}` : ''} (แสดงแบบอ่านอย่างเดียว)`}
              </NoticeBar>
            ) : null}

            <PageCard>
              <SectionHeader
                icon='volunteer_activism'
                title='รายละเอียดโครงการ / กิจกรรม'
                subtitle='ระบุชื่อโครงการ วันเวลานัดหมาย สถานที่ และกลุ่มเป้าหมายที่ผูกกับกิจกรรมนี้'
              />
              <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full' style={{ gap: 'var(--dim-space-400)' }}>
                <div className='md:col-span-2 xl:col-span-3'>
                  <InputField
                    label='ชื่อโครงการหรือกิจกรรม'
                    required
                    showLeadingIcon={false}
                    showHelperText={!!errors.name}
                    helperText={errors.name}
                    error={!!errors.name}
                    size='md'
                    disabled={readOnly}
                    placeholder='เช่น โครงการคนลาดพร้าวสุขภาพดี — ตรวจสุขภาพเชิงรุกชุมชนลาดพร้าว 71'
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e?.target ? e.target.value : e }))}
                  />
                </div>
                <DatePicker
                  label='วันที่นัดหมาย'
                  required
                  showHelperText={!!errors.date}
                  helperText={errors.date}
                  error={!!errors.date}
                  size='md'
                  disabled={readOnly}
                  value={form.date ? new Date(form.date) : undefined}
                  onChange={(d) => setForm((f) => ({ ...f, date: d ? new Date(d).toISOString().slice(0, 10) : '' }))}
                />
                <TimePicker
                  label='เวลาเริ่ม'
                  showHelperText={false}
                  size='md'
                  disabled={readOnly}
                  value={form.timeStart}
                  onChange={(v) => setForm((f) => ({ ...f, timeStart: v }))}
                />
                <TimePicker
                  label='เวลาสิ้นสุด'
                  showHelperText={!!errors.timeEnd}
                  helperText={errors.timeEnd}
                  error={!!errors.timeEnd}
                  size='md'
                  disabled={readOnly}
                  value={form.timeEnd}
                  onChange={(v) => setForm((f) => ({ ...f, timeEnd: v }))}
                />
                <div className='md:col-span-2'>
                  <InputField
                    label='สถานที่จัดกิจกรรม'
                    required
                    showLeadingIcon={false}
                    showHelperText={!!errors.place}
                    helperText={errors.place}
                    error={!!errors.place}
                    size='md'
                    disabled={readOnly}
                    placeholder='เช่น ศาลาชุมชนลาดพร้าว 71 แขวงลาดพร้าว เขตลาดพร้าว'
                    value={form.place}
                    onChange={(e) => setForm((f) => ({ ...f, place: e?.target ? e.target.value : e }))}
                  />
                </div>
                <Select
                  label='สถานะกิจกรรม'
                  showHelperText={false}
                  showLeadingIcon={false}
                  size='md'
                  disabled={readOnly}
                  options={STATUS_OPTIONS}
                  value={form.status === 'cancelled' ? 'planned' : form.status}
                  onChange={(v) => setForm((f) => ({ ...f, status: typeof v === 'string' ? v : v?.value }))}
                />
                <Select
                  label='กลุ่มเป้าหมายที่ผูกกับกิจกรรม'
                  showHelperText={false}
                  showLeadingIcon={false}
                  size='md'
                  disabled={readOnly}
                  options={groupOptions}
                  value={form.groupId || ''}
                  onChange={(v) => setForm((f) => ({ ...f, groupId: typeof v === 'string' ? v : v?.value }))}
                />
                <InputField
                  label='เป้าหมายผู้เข้าร่วม (คน)'
                  showLeadingIcon={false}
                  showHelperText={false}
                  size='md'
                  type='number'
                  disabled={readOnly}
                  value={form.targetAttendees}
                  onChange={(e) => setForm((f) => ({ ...f, targetAttendees: e?.target ? e.target.value : e }))}
                />
                <InputField
                  label='จำนวนผู้เข้าร่วมจริง (คน)'
                  showLeadingIcon={false}
                  showHelperText={false}
                  size='md'
                  type='number'
                  disabled={readOnly}
                  value={form.attendees}
                  onChange={(e) => setForm((f) => ({ ...f, attendees: e?.target ? e.target.value : e }))}
                />
              </div>
            </PageCard>

            <PageCard>
              <SectionHeader
                icon='map'
                title='ตำแหน่งสถานที่จัดกิจกรรม'
                subtitle='ปักหมุดตำแหน่งบนแผนที่ (mock map ในต้นแบบ) เพื่อใช้อ้างอิงตอนออกหน่วย'
              />
              <AddressMapBlock
                heading='ปักหมุดตำแหน่งจัดกิจกรรม'
                hint='ลากหมุดเพื่อปรับตำแหน่ง คลิกบนแผนที่ หรือกด "ใช้ตำแหน่งปัจจุบัน"'
                readOnly={readOnly}
                value={form.location}
                onChange={(loc) => setForm((f) => ({ ...f, location: loc }))}
              />
            </PageCard>

            <PageCard>
              <SectionHeader
                icon='fact_check'
                title='ผลการทำกิจกรรม'
                subtitle='บันทึกจำนวนผู้เข้าร่วมและผลลัพธ์ที่ได้ — จำเป็นเมื่อสถานะเป็น "สรุปแล้ว"'
              />
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <StatTile label='ผู้เข้าร่วม' value={Number(form.attendees) || 0} unit='คน' tone='brand' icon='groups' />
                <StatTile label='เป้าหมาย' value={Number(form.targetAttendees) || 0} unit='คน' tone='info' icon='flag' />
                <StatTile
                  label='บรรลุเป้าหมาย'
                  value={Number(form.targetAttendees) ? `${Math.round((Number(form.attendees) / Number(form.targetAttendees)) * 100)}%` : '—'}
                  tone={Number(form.targetAttendees) && Number(form.attendees) >= Number(form.targetAttendees) ? 'brand' : 'warning'}
                  icon='trending_up'
                />
              </div>
              <SuggestibleTextarea
                voice
                label='ผลการทำกิจกรรม / ผลลัพธ์ที่ได้'
                required={form.status === 'done'}
                value={form.outcome || ''}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, outcome: e?.target ? e.target.value : e }))}
                placeholder='เช่น คัดกรองผู้สูงอายุ 87 ราย พบกลุ่มเสี่ยงเบาหวาน 14 ราย ส่งต่อคลินิก NCD 12 ราย'
                suggestions={CHECKUP_ACTIVITY_SUGGESTIONS}
                minChars={3}
              />
              {errors.outcome ? <NoticeBar tone='danger' icon='error'>{errors.outcome}</NoticeBar> : null}
            </PageCard>

            <PageCard>
              <AttachmentSection
                files={form.attachments || []}
                readOnly={readOnly}
                onChange={(files) => setForm((f) => ({ ...f, attachments: files }))}
              />
            </PageCard>

            {!isNew ? (
              <PageCard>
                <SectionHeader icon='history' title='บันทึกการทำรายการ' subtitle='ผู้บันทึก วันเวลา และการแก้ไขล่าสุด' />
                <CheckupAuditBar record={form} />
                <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-600)' }}>
                  <ReadField label='สร้างเมื่อ' value={formatThaiDateTime(form.createdAt)} minWidth={220} />
                  <ReadField label='แก้ไขล่าสุด' value={formatThaiDateTime(form.updatedAt)} minWidth={220} />
                  <ReadField label='จำนวนไฟล์แนบ' value={`${(form.attachments || []).length} ไฟล์`} />
                </div>
              </PageCard>
            ) : null}
          </>
        )}
      </PageBody>
    </QueuePageShell>
  );
};

export default CheckupCommunityPage;
