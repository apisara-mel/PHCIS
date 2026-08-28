import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import FileUploadField from '@/components/forms/FileUploadField';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import SuccessToast from '@/components/toast/SuccessToast';
import {
  SwSectionCard, SwField, SwBanner, SwInlineSearch,
  SwAuditLine, SwEmptyHint, toLocalIso,
} from '@/pages/clinic/social-work/SocialWorkShared';
import {
  SW_CURRENT_USER,
  SW_CONTACT_CHANNELS,
  resolveSwContactChannel,
  swContactChannelBadge,
  hasSocialWorkRights,
  setSocialWorkRights,
  formatSwDate,
  formatSwDateTime,
  todayIso,
} from '@/data/socialWorkClinic';
import {
  SW_ACTIVITY_OPTIONS,
  SW_ACTIVITY_VENUES,
  SW_ACTIVITY_RESULT_SUGGESTIONS,
  SW_ACTIVITY_IMAGE_ACCEPT,
  SW_PROFESSIONS,
  swSubActivityOptions,
  swActivityUnit,
  resolveSwActivity,
  resolveSwSubActivity,
  validateSwActivityImage,
  getSwActivities,
  saveSwActivity,
  cancelSwActivity,
  reactivateSwActivity,
  logSwActivityPrint,
} from '@/data/socialWorkActivities';

/* SocialWorkActivityPage — เมนูที่ 3 "แบบบันทึกกิจกรรมทางสังคมสงเคราะห์
   (ส.ส.4)" (TOR §1.10.11.2 · §1.10.11.5 · มติ คทง.10 ครั้งที่ 3 รหัส สส.4-x).

   งานกลุ่ม/งานที่ไม่ใช่เคสเวิร์ค — vocabulary กิจกรรมหลัก → กิจกรรมย่อย
   (dropdown 2 ชั้น) พร้อมสิ่งที่มติสั่งเพิ่ม:
     • ทีมสหวิชาชีพที่ร่วมกิจกรรม (มติข้อ 3)
     • แนบรูปภาพกิจกรรม (มติข้อ 5) — ตรวจชนิดไฟล์และขนาด ≤ 10 MB
     • ช่องทาง ศูนย์บริการสาธารณสุข / โทรติดตาม / ประสาน อสส. (มติข้อ 7)

   ครบ 4 กริยา: แสดง (ตาราง + พิมพ์) · บันทึก · แก้ไข · ยกเลิก (เหตุผลบังคับ
   + กู้คืนได้) — ทุกแถวประทับผู้บันทึก เวลาบันทึก และเวลาแก้ไขล่าสุด. */

const breadcrumb = ['บันทึกการรักษา', 'งานสังคมสงเคราะห์', 'แบบบันทึกกิจกรรม (ส.ส.4)'];

const EMPTY_FORM = {
  id: '',
  date: todayIso(),
  activity: '',
  subActivity: '',
  venue: '',
  channel: 'center',
  count: '',
  unit: '',
  participants: [],
  team: [],
  images: [],
  result: '',
};

const cancelledText = {
  textDecoration: 'line-through',
  color: 'var(--text-content-tertiary, #858C92)',
};

const SocialWorkActivityPage = () => {
  const history = useHistory();
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState('active');
  const [search, setSearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [participantDraft, setParticipantDraft] = useState('');
  const [imageError, setImageError] = useState('');
  const [savedBanner, setSavedBanner] = useState(null);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [removeTarget, setRemoveTarget] = useState(null); /* { kind, index, label } */
  const [viewTarget, setViewTarget] = useState(null);
  const [toast, setToast] = useState('');
  const [, setRightsTick] = useState(0);

  const canWrite = hasSocialWorkRights();
  const toggleRightsDemo = () => {
    setSocialWorkRights(!hasSocialWorkRights());
    setRightsTick((t) => t + 1);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getSwActivities(), [tick]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === 'active' && r.status === 'cancelled') return false;
      if (tab === 'cancelled' && r.status !== 'cancelled') return false;
      if (activityFilter !== 'all' && r.activity !== activityFilter) return false;
      if (channelFilter !== 'all' && r.channel !== channelFilter) return false;
      if (!q) return true;
      return [
        resolveSwActivity(r.activity),
        resolveSwSubActivity(r.activity, r.subActivity),
        r.venue,
        r.result,
        (r.team || []).join(' '),
        (r.participants || []).join(' '),
      ].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, tab, activityFilter, channelFilter, search]);

  const activeRows = rows.filter((r) => r.status !== 'cancelled');

  const tabs = useMemo(() => ([
    { key: 'active', label: `บันทึกแล้ว (${activeRows.length})` },
    { key: 'cancelled', label: `ยกเลิก (${rows.length - activeRows.length})` },
    { key: 'all', label: `ทั้งหมด (${rows.length})` },
  ]), [rows, activeRows]);

  const summaryCards = useMemo(() => {
    const byChannel = (c) => activeRows.filter((r) => r.channel === c).length;
    return [
      { key: 'total', label: 'กิจกรรมที่บันทึกแล้ว', value: String(activeRows.length), color: 'info', icon: 'diversity_3' },
      { key: 'center', label: 'ดำเนินการที่ศูนย์บริการสาธารณสุข', value: String(byChannel('center')), color: 'positive', icon: 'local_hospital' },
      { key: 'phone', label: 'โทรติดตาม', value: String(byChannel('phone')), color: 'info', icon: 'call' },
      { key: 'volunteer', label: 'ประสาน อสส.', value: String(byChannel('volunteer')), color: 'warning', icon: 'diversity_3' },
      { key: 'images', label: 'กิจกรรมที่มีภาพประกอบ', value: String(activeRows.filter((r) => (r.images || []).length > 0).length), color: 'positive', icon: 'image' },
    ];
  }, [activeRows]);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, date: todayIso() });
    setErrors({});
    setSavedBanner(null);
    setEditing('new');
  };

  const openEdit = (row) => {
    setForm({ ...EMPTY_FORM, ...row, count: String(row.count ?? '') });
    setErrors({});
    setSavedBanner(null);
    setEditing(row.id);
  };

  const closeForm = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setParticipantDraft('');
    setImageError('');
  };

  const validate = () => {
    const next = {};
    if (!form.date) next.date = 'เลือกวันที่จัดกิจกรรม';
    if (!form.activity) next.activity = 'เลือกกิจกรรมหลัก';
    if (!form.subActivity) next.subActivity = 'เลือกกิจกรรมย่อย';
    if (!form.venue) next.venue = 'ระบุสถานที่จัดกิจกรรม';
    const n = Number(form.count);
    if (!form.count || Number.isNaN(n) || n <= 0) next.count = 'ระบุจำนวนเป็นตัวเลขมากกว่า 0';
    if (!form.result || form.result.trim().length < 10) next.result = 'ระบุผลการจัดกิจกรรมอย่างน้อย 10 ตัวอักษร';
    if ((form.team || []).length === 0) next.team = 'เลือกทีมสหวิชาชีพที่ร่วมกิจกรรมอย่างน้อย 1 รายการ';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (!canWrite || !validate()) return;
    const { saved, isNew } = saveSwActivity({
      ...form,
      count: Number(form.count),
      unit: swActivityUnit(form.activity, form.subActivity),
    });
    setTick((t) => t + 1);
    setSavedBanner({ isNew, label: resolveSwSubActivity(saved.activity, saved.subActivity) });
    setToast(isNew ? 'บันทึกกิจกรรม ส.ส.4 แล้ว' : 'แก้ไขกิจกรรม ส.ส.4 แล้ว');
    closeForm();
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('กรุณาระบุเหตุผลการยกเลิก');
      return;
    }
    cancelSwActivity(cancelTarget.id, cancelReason.trim());
    setTick((t) => t + 1);
    setCancelTarget(null);
    setCancelReason('');
    setCancelError('');
    setToast('ยกเลิกกิจกรรมแล้ว — รายการยังแสดงในตารางและกู้คืนได้');
  };

  const reactivate = (row) => {
    reactivateSwActivity(row.id);
    setTick((t) => t + 1);
    setToast('เปิดใช้งานกิจกรรมอีกครั้งแล้ว');
  };

  const addParticipant = () => {
    const text = participantDraft.trim();
    if (!text) return;
    setForm((f) => ({ ...f, participants: [...(f.participants || []), text] }));
    setParticipantDraft('');
  };

  const toggleTeam = (name) => setForm((f) => {
    const has = (f.team || []).includes(name);
    if (has) return f; /* การลบต้องยืนยันผ่าน popup */
    setErrors((e) => ({ ...e, team: undefined }));
    return { ...f, team: [...(f.team || []), name] };
  });

  const confirmRemove = () => {
    if (!removeTarget) return;
    if (removeTarget.kind === 'team') {
      setForm((f) => ({ ...f, team: f.team.filter((_, i) => i !== removeTarget.index) }));
    } else if (removeTarget.kind === 'participant') {
      setForm((f) => ({ ...f, participants: f.participants.filter((_, i) => i !== removeTarget.index) }));
    } else if (removeTarget.kind === 'image') {
      setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== removeTarget.index) }));
    }
    setRemoveTarget(null);
  };

  const attachImage = (file) => {
    const message = validateSwActivityImage(file.name, file.size);
    if (message) { setImageError(message); return; }
    setImageError('');
    setForm((f) => ({
      ...f,
      images: [...(f.images || []), { name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB` }],
    }));
  };

  const doPrint = (row) => {
    logSwActivityPrint(row.id);
    setTick((t) => t + 1);
    setToast(`ประทับผู้พิมพ์ ${SW_CURRENT_USER} ลงบันทึกกิจกรรมแล้ว`);
    if (typeof window !== 'undefined') window.print();
  };

  const dim = (r) => (r.status === 'cancelled' ? cancelledText : undefined);

  const columns = useMemo(() => ([
    { key: 'date', label: 'วันที่บันทึก', render: (r) => <span style={dim(r)}>{formatSwDate(r.date)}</span> },
    {
      key: 'activity',
      label: 'กิจกรรม / กิจกรรมย่อย',
      flex: true,
      minWidth: 300,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={r.status === 'cancelled' ? cancelledText : { fontWeight: 'var(--type-weight-medium)' }}>
            {resolveSwActivity(r.activity)}
          </span>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {resolveSwSubActivity(r.activity, r.subActivity)}
          </span>
        </div>
      ),
    },
    { key: 'venue', label: 'สถานที่', flex: true, minWidth: 200, render: (r) => <span style={dim(r)}>{r.venue}</span> },
    {
      key: 'channel',
      label: 'ช่องทาง',
      render: (r) => (
        <ColorfulBadge style={swContactChannelBadge(r.channel)} size='small' hierarchy='secondary'>
          {resolveSwContactChannel(r.channel)}
        </ColorfulBadge>
      ),
    },
    {
      key: 'count',
      label: 'จำนวน',
      render: (r) => <span style={dim(r)}>{`${r.count} ${r.unit || 'ครั้ง'}`}</span>,
    },
    {
      key: 'team',
      label: 'ทีมสหวิชาชีพ',
      flex: true,
      minWidth: 220,
      render: (r) => <span style={dim(r)}>{(r.team || []).join(', ') || '—'}</span>,
    },
    {
      key: 'images',
      label: 'ภาพกิจกรรม',
      render: (r) => ((r.images || []).length === 0
        ? <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>—</span>
        : (
          <div className='flex items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
            <Icon name='image' size={16} />
            <span style={dim(r)}>{`${r.images.length} ภาพ`}</span>
          </div>
        )),
    },
    {
      key: 'status',
      label: 'สถานะ',
      render: (r) => (r.status === 'cancelled' ? (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกกิจกรรม</ColorfulBadge>
          {r.cancellation && (
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              โดย {r.cancellation.by} · {formatSwDateTime(r.cancellation.at)}
              <br />เหตุผล: {r.cancellation.reason}
            </span>
          )}
        </div>
      ) : (
        <ColorfulBadge style='green' size='small' hierarchy='secondary'>บันทึกแล้ว</ColorfulBadge>
      )),
    },
    {
      key: 'recordedBy',
      label: 'ผู้บันทึก',
      sortable: false,
      render: (r) => (
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary, #636B72)' }}>
          {r.recordedBy}<br />{formatSwDateTime(r.recordedAt)}
          {(r.editLog || []).length > 0 && (
            <>
              <br />
              <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>
                {`แก้ไขล่าสุด ${formatSwDateTime(r.editLog[r.editLog.length - 1].at)}`}
              </span>
            </>
          )}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton size='sm' leadingIcon='visibility' onClick={(e) => { e.stopPropagation(); setViewTarget(r); }}>
            แสดง
          </NeutralSubdueButton>
          {!canWrite ? (
            <ColorfulBadge style='grey' size='small' hierarchy='secondary'>สิทธิไม่เพียงพอ</ColorfulBadge>
          ) : r.status === 'cancelled' ? (
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='restart_alt' onClick={(e) => { e.stopPropagation(); reactivate(r); }}>
              เปิดใช้งาน
            </BrandSubdueButton>
          ) : (
            <>
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                แก้ไข
              </BrandSubdueButton>
              <DangerSubdueButton size='sm' leadingIcon='block' onClick={(e) => { e.stopPropagation(); setCancelTarget(r); setCancelReason(''); setCancelError(''); }}>
                ยกเลิก
              </DangerSubdueButton>
            </>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canWrite]);

  const subOptions = useMemo(() => swSubActivityOptions(form.activity), [form.activity]);
  const unitHint = form.activity && form.subActivity
    ? `หน่วยนับ: ${swActivityUnit(form.activity, form.subActivity)}`
    : 'เลือกกิจกรรมย่อยเพื่อกำหนดหน่วยนับ';

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='แบบบันทึกกิจกรรมทางสังคมสงเคราะห์ (ส.ส.4)'
      onBack={() => history.push('/clinic/social-work')}
      backLabel='กลับหน้าแรก'
      summaryCards={summaryCards}
      tabs={tabs}
      activeTab={tab}
      onTabChange={setTab}
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canWrite ? 'lock_open' : 'lock'}
            onClick={toggleRightsDemo}
            title='สลับสิทธิงานสังคมสงเคราะห์ (สำหรับทดสอบ)'
          >
            {canWrite ? 'สิทธิ: เข้าถึงได้' : 'สิทธิ: ถูกจำกัด'}
          </NeutralSubdueButton>
          <BrandButton size='sm' leadingIcon='add' disabled={!canWrite} onClick={openCreate}>
            บันทึกกิจกรรมใหม่
          </BrandButton>
        </div>
      )}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-500, 20px)',
        }}
      >
        {!canWrite && (
          <SwBanner tone='warning' icon='lock'>
            บัญชีนี้ไม่มีสิทธิงานสังคมสงเคราะห์ (§1.4.2) — ดูรายการกิจกรรมได้
            แต่บันทึก แก้ไข หรือยกเลิกไม่ได้
          </SwBanner>
        )}

        {savedBanner && (
          <SwBanner tone='brand' icon='check-circle' onClose={() => setSavedBanner(null)}>
            {savedBanner.isNew
              ? `บันทึกกิจกรรม "${savedBanner.label}" เรียบร้อยแล้ว — ข้อมูลจะถูกรวมในรายงาน ส.ส.4 และ Workload ส.ส.5`
              : `แก้ไขกิจกรรม "${savedBanner.label}" เรียบร้อยแล้ว (บันทึกประวัติการแก้ไขไว้ในแถว)`}
          </SwBanner>
        )}

        {editing && canWrite && (
          <SwSectionCard
            icon='diversity_3'
            title={editing === 'new' ? 'บันทึกกิจกรรมทางสังคมสงเคราะห์ (ส.ส.4)' : 'แก้ไขกิจกรรมทางสังคมสงเคราะห์'}
          >
            <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <SwField label='วันที่บันทึก (สส.4-1)' required hint={errors.date} hintTone={errors.date ? 'error' : undefined} minWidth={200}>
                <DatePicker
                  showLabel={false}
                  value={form.date ? new Date(form.date) : null}
                  onChange={(d) => set('date')(d ? toLocalIso(d) : '')}
                  placeholder='เลือกวันที่'
                />
              </SwField>
              <SwField label='กิจกรรมหลัก' required hint={errors.activity} hintTone={errors.activity ? 'error' : undefined} minWidth={320}>
                <Select
                  showLabel={false}
                  searchable
                  size='lg'
                  value={form.activity}
                  onChange={(v) => { set('activity')(v); set('subActivity')(''); }}
                  options={SW_ACTIVITY_OPTIONS}
                  error={!!errors.activity}
                  placeholder='เลือกกิจกรรมหลัก'
                />
              </SwField>
              <SwField
                label='กิจกรรมย่อย'
                required
                hint={errors.subActivity || (!form.activity ? 'เลือกกิจกรรมหลักก่อน' : unitHint)}
                hintTone={errors.subActivity ? 'error' : undefined}
                minWidth={340}
              >
                <Select
                  showLabel={false}
                  searchable
                  size='lg'
                  disabled={!form.activity}
                  value={form.subActivity}
                  onChange={set('subActivity')}
                  options={subOptions}
                  error={!!errors.subActivity}
                  placeholder='เลือกกิจกรรมย่อย'
                />
              </SwField>
            </div>

            <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <SwField label='สถานที่จัดกิจกรรม' required hint={errors.venue} hintTone={errors.venue ? 'error' : undefined} minWidth={320}>
                <Select
                  showLabel={false}
                  searchable
                  size='lg'
                  value={form.venue}
                  onChange={set('venue')}
                  options={SW_ACTIVITY_VENUES.map((v) => ({ value: v, label: v }))}
                  error={!!errors.venue}
                  placeholder='เลือกหรือค้นหาสถานที่'
                />
              </SwField>
              <SwField
                label='จำนวน'
                required
                hint={errors.count || unitHint}
                hintTone={errors.count ? 'error' : undefined}
                minWidth={160}
              >
                <InputField
                  type='number'
                  value={form.count}
                  onChange={set('count')}
                  placeholder='เช่น 42'
                  error={!!errors.count}
                  showHelperText={false}
                />
              </SwField>
              <SwField label='ช่องทางการดำเนินการ (มติข้อ 7)' minWidth={320}>
                <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  {SW_CONTACT_CHANNELS.map((c) => (
                    <SelectableTag
                      key={c.value}
                      label={c.label}
                      size='md'
                      selected={form.channel === c.value}
                      onClick={() => set('channel')(c.value)}
                    />
                  ))}
                </div>
              </SwField>
            </div>

            {/* ทีมสหวิชาชีพ (มติข้อ 3) */}
            <SwField
              label='ทีมสหวิชาชีพที่ร่วมกิจกรรม'
              required
              hint={errors.team}
              hintTone={errors.team ? 'error' : undefined}
            >
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  {SW_PROFESSIONS.map((p) => (
                    <SelectableTag
                      key={p}
                      label={p}
                      size='md'
                      selected={(form.team || []).includes(p)}
                      onClick={() => ((form.team || []).includes(p)
                        ? setRemoveTarget({ kind: 'team', index: form.team.indexOf(p), label: p })
                        : toggleTeam(p))}
                    />
                  ))}
                </div>
                <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  เลือกซ้ำเพื่อนำออก — ระบบจะถามยืนยันก่อนลบทุกครั้ง
                </span>
              </div>
            </SwField>

            {/* ผู้เข้าร่วม */}
            <SwField label='จำนวน / รายชื่อกลุ่มผู้เข้าร่วม'>
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <div style={{ flex: '1 1 320px', minWidth: 260 }}>
                    <InputField
                      value={participantDraft}
                      onChange={setParticipantDraft}
                      placeholder='เช่น อสส. เขตวัฒนา 28 คน'
                      showHelperText={false}
                    />
                  </div>
                  <BrandDashedAddButton onClick={addParticipant}>เพิ่มกลุ่มผู้เข้าร่วม</BrandDashedAddButton>
                </div>
                {(form.participants || []).length > 0 && (
                  <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    {form.participants.map((p, i) => (
                      <div
                        key={`${p}-${i}`}
                        className='flex items-center'
                        style={{
                          gap: 'var(--dim-space-150, 6px)',
                          paddingTop: 'var(--dim-space-150, 6px)',
                          paddingBottom: 'var(--dim-space-150, 6px)',
                          paddingLeft: 'var(--dim-space-250, 10px)',
                          paddingRight: 'var(--dim-space-250, 10px)',
                          borderRadius: 'var(--dim-radius-200, 8px)',
                          background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                          fontSize: 'var(--type-size-xs)',
                        }}
                      >
                        <Icon name='group' size={14} />
                        <span>{p}</span>
                        <button
                          type='button'
                          aria-label={`นำ ${p} ออก`}
                          onClick={() => setRemoveTarget({ kind: 'participant', index: i, label: p })}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-danger-default, #B91C1C)' }}
                        >
                          <Icon name='close' size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SwField>

            {/* ภาพกิจกรรม (มติข้อ 5) */}
            <SwField
              label='ภาพกิจกรรม'
              hint={imageError || `รองรับ ${SW_ACTIVITY_IMAGE_ACCEPT} ขนาดไม่เกิน 10 MB ต่อไฟล์`}
              hintTone={imageError ? 'error' : undefined}
            >
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <FileUploadField
                  accept={SW_ACTIVITY_IMAGE_ACCEPT}
                  buttonLabel='แนบรูปภาพกิจกรรม'
                  onFile={attachImage}
                />
                {(form.images || []).length > 0 && (
                  <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    {form.images.map((img, i) => (
                      <div
                        key={`${img.name}-${i}`}
                        className='flex items-center'
                        style={{
                          gap: 'var(--dim-space-150, 6px)',
                          paddingTop: 'var(--dim-space-150, 6px)',
                          paddingBottom: 'var(--dim-space-150, 6px)',
                          paddingLeft: 'var(--dim-space-250, 10px)',
                          paddingRight: 'var(--dim-space-250, 10px)',
                          borderRadius: 'var(--dim-radius-200, 8px)',
                          background: 'var(--surface-card-quaternary, #F9FBFB)',
                          border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
                          fontSize: 'var(--type-size-xs)',
                        }}
                      >
                        <Icon name='image' size={14} />
                        <span>{img.name}</span>
                        <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>{img.size}</span>
                        <button
                          type='button'
                          aria-label={`ลบภาพ ${img.name}`}
                          onClick={() => setRemoveTarget({ kind: 'image', index: i, label: img.name })}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-danger-default, #B91C1C)' }}
                        >
                          <Icon name='close' size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SwField>

            <SwField label='ผลการจัดกิจกรรม' required hint={errors.result} hintTone={errors.result ? 'error' : undefined}>
              <SuggestibleTextarea
                voice
                value={form.result}
                onChange={(e) => set('result')(e.target.value)}
                suggestions={SW_ACTIVITY_RESULT_SUGGESTIONS}
                minChars={3}
                placeholder='สรุปผลที่เกิดขึ้นจากกิจกรรม ปัญหาอุปสรรค และข้อเสนอแนะ (ไม่จำกัดจำนวนคำ)'
              />
            </SwField>

            <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <SwAuditLine
                by={SW_CURRENT_USER}
                at={new Date().toISOString()}
                label='ผู้บันทึก'
                formatDateTime={formatSwDateTime}
              />
              <div className='flex-1' />
              <NeutralSubdueButton leadingIcon='close' onClick={closeForm}>ยกเลิกการกรอก</NeutralSubdueButton>
              <BrandButton leadingIcon='save' onClick={submit}>
                {editing === 'new' ? 'บันทึกกิจกรรม' : 'บันทึกการแก้ไข'}
              </BrandButton>
            </div>
          </SwSectionCard>
        )}

        <SwSectionCard icon='list_alt' title='รายการกิจกรรมที่บันทึก'>
          <div className='flex w-full flex-wrap items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <SwInlineSearch
              value={search}
              onChange={setSearch}
              placeholder='ค้นหา กิจกรรม / สถานที่ / ทีมสหวิชาชีพ / ผลการจัด'
              minWidth={280}
            />
            <div style={{ minWidth: 260 }}>
              <Select
                showLabel={false}
                searchable
                size='lg'
                value={activityFilter}
                onChange={setActivityFilter}
                options={[{ value: 'all', label: 'ทุกกิจกรรมหลัก' }, ...SW_ACTIVITY_OPTIONS]}
                placeholder='กิจกรรมหลัก'
              />
            </div>
            <div style={{ minWidth: 200 }}>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                value={channelFilter}
                onChange={setChannelFilter}
                options={[{ value: 'all', label: 'ทุกช่องทาง' }, ...SW_CONTACT_CHANNELS]}
                placeholder='ช่องทาง'
              />
            </div>
            {(search || activityFilter !== 'all' || channelFilter !== 'all') && (
              <NeutralSubdueButton
                size='sm'
                leadingIcon='close'
                onClick={() => { setSearch(''); setActivityFilter('all'); setChannelFilter('all'); }}
              >
                ล้างตัวกรอง
              </NeutralSubdueButton>
            )}
            <div className='flex-1' />
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
              {`พบ ${filtered.length} รายการ จาก ${rows.length} รายการ`}
            </span>
          </div>

          {filtered.length === 0 ? (
            <SwEmptyHint icon='diversity_3'>
              ไม่พบกิจกรรมที่ตรงกับตัวกรอง — ลองเปลี่ยนแท็บหรือกด &quot;ล้างตัวกรอง&quot;
            </SwEmptyHint>
          ) : (
            <Table
              columns={columns}
              rows={filtered}
              rowKey={(r) => r.id}
              pageSize={20}
              stickyRightColCount={1}
              emptyMessage='ไม่พบกิจกรรม'
            />
          )}
        </SwSectionCard>
      </div>

      {/* ── popup แสดงรายละเอียด + พิมพ์ ──────────────────────────── */}
      <Popup
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title='รายละเอียดกิจกรรมทางสังคมสงเคราะห์ (ส.ส.4)'
        subtitle={viewTarget ? `${formatSwDate(viewTarget.date)} · ${resolveSwActivity(viewTarget.activity)}` : ''}
        width={720}
        secondaryAction={{ label: 'ปิด', onClick: () => setViewTarget(null) }}
        primaryAction={{ label: 'พิมพ์บันทึกกิจกรรม', onClick: () => { doPrint(viewTarget); setViewTarget(null); } }}
      >
        {viewTarget && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-250, 10px)', fontSize: 'var(--type-size-sm)' }}>
            {viewTarget.status === 'cancelled' && viewTarget.cancellation && (
              <SwBanner tone='danger' icon='block'>
                {`กิจกรรมนี้ถูกยกเลิกโดย ${viewTarget.cancellation.by} · ${formatSwDateTime(viewTarget.cancellation.at)} — เหตุผล: ${viewTarget.cancellation.reason}`}
              </SwBanner>
            )}
            <span>{`กิจกรรมย่อย: ${resolveSwSubActivity(viewTarget.activity, viewTarget.subActivity)}`}</span>
            <span>{`สถานที่: ${viewTarget.venue}`}</span>
            <span>{`ช่องทาง: ${resolveSwContactChannel(viewTarget.channel)}`}</span>
            <span>{`จำนวน: ${viewTarget.count} ${viewTarget.unit || 'ครั้ง'}`}</span>
            <span>{`ผู้เข้าร่วม: ${(viewTarget.participants || []).join(' · ') || '—'}`}</span>
            <span>{`ทีมสหวิชาชีพ: ${(viewTarget.team || []).join(' · ') || '—'}`}</span>
            <span>{`ภาพกิจกรรม: ${(viewTarget.images || []).map((i) => i.name).join(' · ') || 'ไม่มีภาพแนบ'}`}</span>
            <span>{`ผลการจัดกิจกรรม: ${viewTarget.result || '—'}`}</span>
            <SwAuditLine
              by={viewTarget.recordedBy}
              at={viewTarget.recordedAt}
              label='บันทึกโดย'
              formatDateTime={formatSwDateTime}
              extra={(viewTarget.editLog || []).length > 0
                ? `แก้ไขล่าสุด ${formatSwDateTime(viewTarget.editLog[viewTarget.editLog.length - 1].at)}`
                : undefined}
            />
          </div>
        )}
      </Popup>

      {/* ── popup ยืนยันการลบผู้เข้าร่วม / สหวิชาชีพ / ภาพ ─────────── */}
      <Popup
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title='ยืนยันการนำรายการออก'
        subtitle={removeTarget ? removeTarget.label : ''}
        secondaryAction={{ label: 'ไม่นำออก', onClick: () => setRemoveTarget(null) }}
        primaryAction={{ label: 'นำออก', onClick: confirmRemove }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
          {removeTarget?.kind === 'team'
            ? 'นำผู้ร่วมทีมสหวิชาชีพรายนี้ออกจากกิจกรรม — ต้องกดบันทึกอีกครั้งจึงจะมีผล'
            : removeTarget?.kind === 'participant'
              ? 'นำกลุ่มผู้เข้าร่วมรายการนี้ออก — ต้องกดบันทึกอีกครั้งจึงจะมีผล'
              : 'ลบภาพกิจกรรมนี้ออกจากรายการแนบ — ต้องกดบันทึกอีกครั้งจึงจะมีผล'}
        </span>
      </Popup>

      {/* ── popup ยกเลิกกิจกรรม ────────────────────────────────────── */}
      <Popup
        open={!!cancelTarget}
        onClose={() => { setCancelTarget(null); setCancelError(''); }}
        title='ยกเลิกบันทึกกิจกรรม (ส.ส.4)'
        subtitle={cancelTarget ? `${formatSwDate(cancelTarget.date)} · ${resolveSwActivity(cancelTarget.activity)}` : ''}
        secondaryAction={{ label: 'ไม่ยกเลิก', onClick: () => { setCancelTarget(null); setCancelError(''); } }}
        primaryAction={{ label: 'ยืนยันการยกเลิก', onClick: confirmCancel }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <SwBanner tone='warning' icon='warning'>
            รายการที่ยกเลิกจะยังแสดงในตาราง (ขีดฆ่า) พร้อมผู้ยกเลิก เวลา และเหตุผล
            และไม่ถูกนับในรายงาน ส.ส.4 / Workload ส.ส.5 จนกว่าจะกู้คืน
          </SwBanner>
          <SwField label='เหตุผลการยกเลิก' required hint={cancelError} hintTone={cancelError ? 'error' : undefined}>
            <SuggestibleTextarea
              voice
              value={cancelReason}
              onChange={(e) => { setCancelReason(e.target.value); setCancelError(''); }}
              suggestions={[
                'บันทึกซ้ำกับกิจกรรมที่ลงไว้แล้ว',
                'กิจกรรมถูกเลื่อน ยังไม่ได้จัดจริง',
                'ลงกิจกรรมผิดประเภท ต้องบันทึกใหม่',
                'จำนวนผู้เข้าร่วมไม่ถูกต้อง ต้องบันทึกใหม่',
              ]}
              minChars={2}
              placeholder='ระบุเหตุผลการยกเลิกบันทึกกิจกรรม'
            />
          </SwField>
        </div>
      </Popup>

      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} />
    </QueuePageShell>
  );
};

export default SocialWorkActivityPage;
