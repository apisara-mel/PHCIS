import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import Textarea from '@/components/forms/Textarea';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Popup from '@/components/popup/Popup';
import PrimarySearch from '@/components/search/PrimarySearch';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import {
  IMM_CHILDREN,
  EMPTY_IMM_REGISTRATION,
  EMPTY_GUARDIAN,
  GUARDIAN_RELATIONS,
  resolveGuardianRelation,
  DELIVERY_TYPES,
  resolveDeliveryType,
  getImmRegistryRows,
  saveImmRegistration,
  cancelImmRegistration,
  reactivateImmRegistration,
  findImmRegistrationDuplicate,
  summarizeEpi,
  formatImmDate,
  formatImmDateTime,
  formatAgeYMD,
  hasImmunizationRights,
  setImmunizationRights,
} from '@/data/immunizationClinic';

/* ImmunizationRegistryPage — ทะเบียนผู้รับบริการสร้างเสริมภูมิคุ้มกัน
   (TOR 1.10.9.6 "บันทึกชื่อผู้ปกครอง" + 1.11.2.4 สรุปความครบถ้วน EPI).
   Pattern เดียวกับ PharmacyRegistryPage / MentalHealthRegistryPage:
   list + create/edit บนหน้าเดียว (ฟอร์มกางอยู่เหนือรายการ). ครบ 4 กริยา:

     แสดง   — ตารางทะเบียน + สถานะ EPI ครบ/ค้างเข็ม + ลิงก์สมุดวัคซีน
     บันทึก — เลขทะเบียน สภ.xx-xxxx auto-run เมื่อบันทึกสำเร็จเท่านั้น
     แก้ไข  — ปุ่มบนแถวเปิดฟอร์มเดิมพร้อมข้อมูล (ยกเลิกแล้วคืนค่าเดิม)
     ยกเลิก — soft cancel พร้อมเหตุผล + audit (ไม่มีการลบจริง) และเปิดใช้งานคืนได้ */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานสร้างเสริมภูมิคุ้มกัน', 'ทะเบียนผู้รับบริการ'];
const PAGE_SIZE = 10;

const STATUS_TABS = [
  { key: 'all',       label: 'ทั้งหมด',      icon: 'group' },
  { key: 'active',    label: 'ใช้งาน',       icon: 'check_circle' },
  { key: 'cancelled', label: 'ยกเลิกแล้ว',   icon: 'block' },
];

const emptyForm = () => JSON.parse(JSON.stringify(EMPTY_IMM_REGISTRATION));

const ImmunizationRegistryPage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState([]);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [savedBanner, setSavedBanner] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const canWrite = hasImmunizationRights();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getImmRegistryRows(), [tick]);

  const tabs = useMemo(() => STATUS_TABS.map((t) => ({
    ...t,
    count: t.key === 'all' ? rows.length : rows.filter((r) => (t.key === 'active' ? r.status !== 'cancelled' : r.status === 'cancelled')).length,
  })), [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (activeTab === 'active') result = result.filter((r) => r.status !== 'cancelled');
    if (activeTab === 'cancelled') result = result.filter((r) => r.status === 'cancelled');
    const q = searchQ.trim().toLowerCase();
    if (q) {
      result = result.filter((r) =>
        [r.epiNumber, r.hn, r.name, ...(r.guardians || []).map((g) => g.name), ...(r.guardians || []).map((g) => g.phone)]
          .some((f) => f && String(f).toLowerCase().includes(q)));
    }
    return result;
  }, [rows, activeTab, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filtered.length);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const openCreate = () => {
    setForm(emptyForm());
    setErrors([]);
    setDuplicateWarning('');
    setSavedBanner('');
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      epiNumber: row.epiNumber,
      hn: row.hn,
      name: row.name,
      birthDate: row.birthDate,
      sex: row.sex,
      birthWeight: row.birthWeight ? String(row.birthWeight) : '',
      birthPlace: row.birthPlace || '',
      deliveryType: row.deliveryType || '',
      address: row.address || '',
      guardians: (row.guardians || []).length > 0
        ? row.guardians.map((g) => ({ ...g }))
        : [{ ...EMPTY_GUARDIAN }],
      status: row.status,
    });
    setErrors([]);
    setDuplicateWarning('');
    setSavedBanner('');
    setFormOpen(true);
  };

  const closeForm = () => {
    /* cancel-edit คืนค่าเดิม — form state ถูกทิ้งทั้งก้อน ไม่เขียนลง overlay */
    setFormOpen(false);
    setForm(emptyForm());
    setErrors([]);
    setDuplicateWarning('');
    setDiscardOpen(false);
  };

  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const setGuardian = (idx, key) => (value) => setForm((f) => ({
    ...f,
    guardians: f.guardians.map((g, i) => (i === idx ? { ...g, [key]: value } : g)),
  }));

  const addGuardian = () => setForm((f) => ({ ...f, guardians: [...f.guardians, { ...EMPTY_GUARDIAN }] }));
  const removeGuardian = (idx) => setForm((f) => ({
    ...f,
    guardians: f.guardians.length > 1 ? f.guardians.filter((_, i) => i !== idx) : f.guardians,
  }));

  const onHnChange = (value) => {
    setField('hn')(value);
    const known = IMM_CHILDREN.find((c) => c.hn === value.trim());
    if (known) {
      setForm((f) => ({
        ...f,
        hn: value,
        name: f.name || known.fullName,
        birthDate: f.birthDate || known.birthDate,
        sex: f.sex || known.sex,
        birthWeight: f.birthWeight || String(known.birthWeight ?? ''),
        birthPlace: f.birthPlace || known.birthPlace || '',
        address: f.address || known.address || '',
      }));
    }
    const dup = findImmRegistrationDuplicate({ id: form.id, hn: value });
    setDuplicateWarning(dup
      ? `HN นี้มีทะเบียนอยู่แล้ว (${dup.epiNumber} · ${dup.name}) — ตรวจสอบก่อนสร้างซ้ำ`
      : '');
  };

  const validate = () => {
    const errs = [];
    if (!form.hn.trim()) errs.push('กรุณาระบุ HN ของเด็ก');
    if (!form.name.trim()) errs.push('กรุณาระบุชื่อ-นามสกุลของเด็ก');
    if (!form.birthDate) errs.push('กรุณาระบุวันเกิด');
    if (!form.sex) errs.push('กรุณาระบุเพศ');
    const named = (form.guardians || []).filter((g) => g.name.trim());
    if (named.length === 0) errs.push('ต้องบันทึกชื่อผู้ปกครองอย่างน้อย 1 คน');
    named.forEach((g, i) => {
      if (!g.relation) errs.push(`ผู้ปกครองคนที่ ${i + 1}: กรุณาระบุความสัมพันธ์`);
      if (!g.phone.trim()) errs.push(`ผู้ปกครองคนที่ ${i + 1}: กรุณาระบุเบอร์ติดต่อ`);
    });
    return errs;
  };

  const submit = () => {
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }
    const payload = {
      ...form,
      guardians: form.guardians.filter((g) => g.name.trim()),
      birthWeight: form.birthWeight ? Number(form.birthWeight) : '',
    };
    const { saved, isNew } = saveImmRegistration(payload);
    setSavedBanner(isNew
      ? `บันทึกทะเบียนใหม่เรียบร้อย — เลขทะเบียน ${saved.epiNumber}`
      : `แก้ไขทะเบียน ${saved.epiNumber} เรียบร้อย · โดย ${saved.recordedBy}`);
    setTick((t) => t + 1);
    setFormOpen(false);
    setForm(emptyForm());
    setErrors([]);
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) { setCancelError('กรุณาระบุเหตุผลการยกเลิกทะเบียน'); return; }
    cancelImmRegistration(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setCancelReason('');
    setTick((t) => t + 1);
  };

  const reactivate = (row) => {
    reactivateImmRegistration(row.id);
    setTick((t) => t + 1);
  };

  const columns = useMemo(() => ([
    { key: 'epiNumber', label: 'เลขทะเบียน' },
    { key: 'hn', label: 'HN' },
    {
      key: 'name', label: 'ชื่อ-นามสกุลเด็ก', flex: true, minWidth: 180,
      render: (r) => <MaskedWorklistName name={r.name} recordKey={r.hn} className='truncate' />,
    },
    { key: 'sex', label: 'เพศ' },
    { key: 'birthDate', label: 'วันเกิด', render: (r) => formatImmDate(r.birthDate) },
    { key: 'age', label: 'อายุ (ป-ด-ว)', render: (r) => formatAgeYMD(r.birthDate) },
    { key: 'birthWeight', label: 'น้ำหนักแรกเกิด (กก.)', render: (r) => (r.birthWeight || '—') },
    { key: 'birthPlace', label: 'สถานที่คลอด', flex: true, minWidth: 200, render: (r) => r.birthPlace || '—' },
    { key: 'deliveryType', label: 'การคลอด', render: (r) => resolveDeliveryType(r.deliveryType) },
    {
      key: 'guardians', label: 'ผู้ปกครอง', flex: true, minWidth: 260,
      render: (r) => ((r.guardians || []).length === 0 ? '—' : (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          {r.guardians.map((g) => (
            <span key={`${g.name}-${g.phone}`} style={{ fontSize: 'var(--type-size-sm)' }}>
              {g.name} · {resolveGuardianRelation(g.relation)} · {g.phone || 'ไม่ระบุเบอร์'}
            </span>
          ))}
        </div>
      )),
    },
    {
      key: 'epi', label: 'สถานะ EPI', sortable: false,
      render: (r) => {
        const s = summarizeEpi(r.hn);
        return <ColorfulBadge style={s.style} size='small' hierarchy='secondary'>{s.label}</ColorfulBadge>;
      },
    },
    {
      key: 'status', label: 'สถานะทะเบียน',
      render: (r) => (r.status === 'cancelled' ? (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }} title={r.cancellation?.reason}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกแล้ว</ColorfulBadge>
          {r.cancellation && (
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              โดย {r.cancellation.by} · {formatImmDateTime(r.cancellation.at)}
            </span>
          )}
        </div>
      ) : (
        <ColorfulBadge style='green' size='small' hierarchy='secondary'>ใช้งาน</ColorfulBadge>
      )),
    },
    {
      key: 'recorded', label: 'ผู้บันทึก', flex: true, minWidth: 200,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm)' }}>{r.recordedBy}</span>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {formatImmDateTime(r.recordedAt)}
          </span>
        </div>
      ),
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <BrandSubdueButton
            variant='outline' size='sm' leadingIcon='menu_book'
            onClick={() => history.push({ pathname: '/clinic/immunization/vaccine-book', state: { hn: r.hn } })}
          >
            สมุดวัคซีน
          </BrandSubdueButton>
          <BrandSubdueButton
            variant='outline' size='sm' leadingIcon='monitoring'
            onClick={() => history.push({ pathname: '/clinic/immunization/follow-up', state: { hn: r.hn } })}
          >
            ติดตาม
          </BrandSubdueButton>
          <NeutralSubdueButton size='sm' leadingIcon='edit' disabled={!canWrite} onClick={() => canWrite && openEdit(r)}>
            แก้ไข
          </NeutralSubdueButton>
          {r.status === 'cancelled' ? (
            <BrandSubdueButton
              variant='outline' size='sm' leadingIcon='restart_alt'
              disabled={!canWrite}
              onClick={() => canWrite && reactivate(r)}
            >
              เปิดใช้งาน
            </BrandSubdueButton>
          ) : (
            <DangerSubdueButton
              size='sm' leadingIcon='block'
              disabled={!canWrite}
              onClick={() => {
                if (!canWrite) return;
                setCancelReason('');
                setCancelError('');
                setCancelTarget(r);
              }}
            >
              ยกเลิก
            </DangerSubdueButton>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canWrite, tick]);

  const isEditing = !!form.id;

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='ทะเบียนผู้รับบริการสร้างเสริมภูมิคุ้มกัน'
      onBack={() => history.push('/clinic/immunization')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canWrite ? 'lock_open' : 'lock'}
            onClick={() => { setImmunizationRights(!hasImmunizationRights()); setTick((t) => t + 1); }}
            title='สลับสิทธิปฏิบัติงานคลินิกเด็กดี (สำหรับทดสอบ)'
          >
            {canWrite ? 'สิทธิ: แก้ไขได้' : 'สิทธิ: อ่านอย่างเดียว'}
          </NeutralSubdueButton>
          <BrandSubdueButton variant='fill' leadingIcon='person_add' disabled={!canWrite} onClick={() => canWrite && openCreate()}>
            ลงทะเบียนเด็กใหม่
          </BrandSubdueButton>
        </div>
      )}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(k) => { setActiveTab(k); setPage(1); }}
    >
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกทะเบียนผู้รับบริการ'
        subtitle={cancelTarget ? `${cancelTarget.epiNumber} · ${cancelTarget.name} · HN ${cancelTarget.hn}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกทะเบียน', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
            ทะเบียนจะไม่ถูกลบ — ระบบเก็บแถวเดิมไว้ในสถานะ &quot;ยกเลิกแล้ว&quot; พร้อมเหตุผลและผู้ยกเลิก
            ประวัติการได้รับวัคซีนของเด็กยังดูย้อนหลังได้ตามปกติ
          </span>
          <Textarea
            label='เหตุผลการยกเลิก'
            required
            value={cancelReason}
            onChange={(v) => { setCancelReason(v); if (v.trim()) setCancelError(''); }}
            error={cancelError || undefined}
            placeholder='เช่น ย้ายไปรับบริการที่หน่วยบริการอื่น / ลงทะเบียนซ้ำ'
          />
        </div>
      </Popup>

      <Popup
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title='ยกเลิกการแก้ไข'
        tertiaryAction={{ label: 'ทำต่อ', onClick: () => setDiscardOpen(false) }}
        primaryAction={{ label: 'ทิ้งการแก้ไข', onClick: closeForm, tone: 'danger' }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
          ข้อมูลที่กรอกไว้จะไม่ถูกบันทึกและกลับไปใช้ค่าเดิมของทะเบียน ต้องการทิ้งการแก้ไขหรือไม่
        </span>
      </Popup>

      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-400, 16px)',
        }}
      >
        {!canWrite && (
          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-300, 12px)',
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-warning-quaternary, #FFF9F0)',
              color: 'var(--text-warning-default, #C2410C)',
              fontSize: 'var(--type-size-sm)',
            }}
          >
            <Icon name='lock' size={18} />
            <span>บัญชีของคุณไม่มีสิทธิแก้ไขทะเบียนคลินิกสุขภาพเด็กดี — ดูข้อมูลได้อย่างเดียว</span>
          </div>
        )}

        {savedBanner && (
          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-300, 12px)',
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              color: 'var(--text-brandPrimary-default, #007549)',
              fontSize: 'var(--type-size-sm)',
            }}
          >
            <Icon name='check-circle' size={18} />
            <span>{savedBanner}</span>
            <div className='flex-1' />
            <button
              type='button'
              aria-label='ปิดการแจ้งเตือน'
              onClick={() => setSavedBanner('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-brandPrimary-default, #007549)' }}
            >
              <Icon name='close' size={16} />
            </button>
          </div>
        )}

        {formOpen && (
          <div
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100, #FFFFFF)',
              borderRadius: 'var(--dim-radius-500, 16px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
              boxShadow: 'var(--shadow-card-strong)',
              paddingTop: 'var(--dim-space-600, 24px)',
              paddingBottom: 'var(--dim-space-600, 24px)',
              paddingLeft: 'var(--dim-space-600, 24px)',
              paddingRight: 'var(--dim-space-600, 24px)',
              gap: 'var(--dim-space-400, 16px)',
            }}
          >
            <div className='flex items-center gap-2 w-full'>
              <span className='text-brand-500'><Icon name='contact_page' size={20} /></span>
              <h2 className='text-base font-bold text-brand-500'>
                {isEditing ? `แก้ไขทะเบียน ${form.epiNumber}` : 'ลงทะเบียนเด็กใหม่'}
              </h2>
              <div className='flex-1' />
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                {isEditing
                  ? `เลขทะเบียน ${form.epiNumber}`
                  : 'เลขทะเบียนจะออกให้อัตโนมัติเมื่อบันทึกสำเร็จ'}
              </span>
            </div>

            {errors.length > 0 && (
              <div
                className='flex flex-col w-full'
                style={{
                  gap: 'var(--dim-space-100, 4px)',
                  paddingTop: 'var(--dim-space-300, 12px)',
                  paddingBottom: 'var(--dim-space-300, 12px)',
                  paddingLeft: 'var(--dim-space-400, 16px)',
                  paddingRight: 'var(--dim-space-400, 16px)',
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  background: 'var(--surface-danger-quaternary, #FFF0F0)',
                  color: 'var(--text-danger-default, #B91C1C)',
                  fontSize: 'var(--type-size-sm)',
                }}
              >
                <span className='flex items-center gap-2' style={{ fontWeight: 'var(--type-weight-medium)' }}>
                  <Icon name='error' size={18} />
                  ต้องแก้ไข {errors.length} รายการก่อนบันทึก
                </span>
                {errors.map((e) => <span key={e}>• {e}</span>)}
              </div>
            )}

            {duplicateWarning && (
              <div
                className='flex items-center w-full'
                style={{
                  gap: 'var(--dim-space-300, 12px)',
                  paddingTop: 'var(--dim-space-300, 12px)',
                  paddingBottom: 'var(--dim-space-300, 12px)',
                  paddingLeft: 'var(--dim-space-400, 16px)',
                  paddingRight: 'var(--dim-space-400, 16px)',
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  background: 'var(--surface-warning-quaternary, #FFF9F0)',
                  color: 'var(--text-warning-default, #C2410C)',
                  fontSize: 'var(--type-size-sm)',
                }}
              >
                <Icon name='warning' size={18} />
                <span>{duplicateWarning}</span>
              </div>
            )}

            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <div className='flex flex-col gap-1.5 min-w-0' style={{ flex: '1 1 0', minWidth: 200 }}>
                <span className='text-sm text-ink'>HN ของเด็ก <span style={{ color: 'var(--text-input-require)' }}>*</span></span>
                <InputField
                  showLabel={false} showHelperText={false} showLeadingIcon={false}
                  disabled={!canWrite}
                  value={form.hn} onChange={onHnChange}
                  placeholder='เช่น 69-10001'
                />
              </div>
              <div className='flex flex-col gap-1.5 min-w-0' style={{ flex: '2 1 0', minWidth: 240 }}>
                <span className='text-sm text-ink'>ชื่อ-นามสกุลเด็ก <span style={{ color: 'var(--text-input-require)' }}>*</span></span>
                <InputField
                  showLabel={false} showHelperText={false} showLeadingIcon={false}
                  disabled={!canWrite}
                  value={form.name} onChange={setField('name')}
                  placeholder='เช่น ด.ช.ปุณณวิช สายทอง'
                />
              </div>
              <div className='flex flex-col gap-1.5 min-w-0' style={{ flex: '1 1 0', minWidth: 180 }}>
                <span className='text-sm text-ink'>วันเกิด <span style={{ color: 'var(--text-input-require)' }}>*</span></span>
                <DatePicker
                  showLabel={false}
                  value={form.birthDate ? new Date(form.birthDate) : null}
                  onChange={(d) => setField('birthDate')(d ? d.toISOString().slice(0, 10) : '')}
                  placeholder='เลือกวันเกิด'
                />
              </div>
              <div className='flex flex-col gap-1.5 min-w-0' style={{ flex: '0 0 160px' }}>
                <span className='text-sm text-ink'>เพศ <span style={{ color: 'var(--text-input-require)' }}>*</span></span>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  disabled={!canWrite}
                  value={form.sex} onChange={setField('sex')}
                  options={[{ value: 'ชาย', label: 'ชาย' }, { value: 'หญิง', label: 'หญิง' }]}
                  placeholder='เลือกเพศ'
                />
              </div>
            </div>

            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <div className='flex flex-col gap-1.5 min-w-0' style={{ flex: '0 0 200px' }}>
                <span className='text-sm text-ink'>น้ำหนักแรกเกิด (กก.)</span>
                <InputField
                  showLabel={false} showHelperText={false} showLeadingIcon={false}
                  disabled={!canWrite}
                  value={form.birthWeight} onChange={setField('birthWeight')}
                  placeholder='เช่น 3.15' type='number'
                />
              </div>
              <div className='flex flex-col gap-1.5 min-w-0' style={{ flex: '2 1 0', minWidth: 240 }}>
                <span className='text-sm text-ink'>สถานที่คลอด</span>
                <InputField
                  showLabel={false} showHelperText={false} showLeadingIcon={false}
                  disabled={!canWrite}
                  value={form.birthPlace} onChange={setField('birthPlace')}
                  placeholder='เช่น โรงพยาบาลเจริญกรุงประชารักษ์'
                />
              </div>
              <div className='flex flex-col gap-1.5 min-w-0' style={{ flex: '1 1 0', minWidth: 200 }}>
                <span className='text-sm text-ink'>การคลอด</span>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  disabled={!canWrite}
                  value={form.deliveryType} onChange={setField('deliveryType')}
                  options={DELIVERY_TYPES} placeholder='เลือกวิธีการคลอด'
                />
              </div>
            </div>

            <div className='flex flex-col w-full gap-1.5'>
              <span className='text-sm text-ink'>ที่อยู่ปัจจุบัน</span>
              <InputField
                showLabel={false} showHelperText={false} showLeadingIcon={false}
                disabled={!canWrite}
                value={form.address} onChange={setField('address')}
                placeholder='บ้านเลขที่ ซอย ถนน แขวง เขต จังหวัด รหัสไปรษณีย์'
              />
            </div>

            <div className='flex items-center gap-2 w-full'>
              <span className='text-brand-500'><Icon name='family_restroom' size={20} /></span>
              <h3 className='text-base font-bold text-brand-500'>ชื่อผู้ปกครอง (อย่างน้อย 1 คน)</h3>
            </div>

            {form.guardians.map((g, idx) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={`guardian-${idx}`} className='flex items-end w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <div className='flex flex-col gap-1.5 min-w-0' style={{ flex: '2 1 0', minWidth: 220 }}>
                  <span className='text-sm text-ink'>ชื่อ-นามสกุลผู้ปกครอง</span>
                  <InputField
                    showLabel={false} showHelperText={false} showLeadingIcon={false}
                    disabled={!canWrite}
                    value={g.name} onChange={setGuardian(idx, 'name')}
                    placeholder='เช่น นางสาวจุฑามาศ สายทอง'
                  />
                </div>
                <div className='flex flex-col gap-1.5 min-w-0' style={{ flex: '1 1 0', minWidth: 180 }}>
                  <span className='text-sm text-ink'>ความสัมพันธ์</span>
                  <Select
                    showLabel={false} searchable={false} size='lg'
                    disabled={!canWrite}
                    value={g.relation} onChange={setGuardian(idx, 'relation')}
                    options={GUARDIAN_RELATIONS} placeholder='เลือกความสัมพันธ์'
                  />
                </div>
                <div className='flex flex-col gap-1.5 min-w-0' style={{ flex: '1 1 0', minWidth: 160 }}>
                  <span className='text-sm text-ink'>เบอร์ติดต่อ</span>
                  <InputField
                    showLabel={false} showHelperText={false} showLeadingIcon={false}
                    disabled={!canWrite}
                    value={g.phone} onChange={setGuardian(idx, 'phone')}
                    placeholder='เช่น 081-234-5678'
                  />
                </div>
                <div className='flex flex-col gap-1.5 min-w-0' style={{ flex: '1 1 0', minWidth: 160 }}>
                  <span className='text-sm text-ink'>อาชีพ</span>
                  <InputField
                    showLabel={false} showHelperText={false} showLeadingIcon={false}
                    disabled={!canWrite}
                    value={g.occupation} onChange={setGuardian(idx, 'occupation')}
                    placeholder='เช่น พนักงานบริษัท'
                  />
                </div>
                <NeutralSubdueButton
                  size='sm'
                  leadingIcon='delete'
                  disabled={!canWrite || form.guardians.length <= 1}
                  onClick={() => removeGuardian(idx)}
                >
                  ลบ
                </NeutralSubdueButton>
              </div>
            ))}

            <BrandDashedAddButton disabled={!canWrite} onClick={addGuardian}>
              เพิ่มผู้ปกครอง
            </BrandDashedAddButton>

            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <div className='flex-1' />
              <NeutralSubdueButton size='lg' leadingIcon='close' onClick={() => setDiscardOpen(true)}>
                ยกเลิก
              </NeutralSubdueButton>
              <BrandSubdueButton variant='fill' size='lg' leadingIcon='save' disabled={!canWrite} onClick={submit}>
                {isEditing ? 'บันทึกการแก้ไข' : 'บันทึกทะเบียน'}
              </BrandSubdueButton>
            </div>
          </div>
        )}

        <div
          className='w-full flex flex-col'
          style={{
            background: 'var(--surface-card-100, #FFFFFF)',
            borderRadius: 'var(--dim-radius-500, 16px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            boxShadow: 'var(--shadow-card-strong)',
            paddingTop: 'var(--dim-space-600, 24px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
            paddingLeft: 'var(--dim-space-600, 24px)',
            paddingRight: 'var(--dim-space-600, 24px)',
            gap: 'var(--dim-space-600, 24px)',
          }}
        >
          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={searchQ}
              onChange={(v) => { setSearchQ(v); setPage(1); }}
              onSubmit={(label) => { setSearchQ(label); setPage(1); }}
              placeholder='ค้นหา เลขทะเบียน / HN / ชื่อเด็ก / ชื่อผู้ปกครอง / เบอร์ติดต่อ'
              width={640}
            />
          </div>

          <Table
            columns={columns}
            rows={pageRows}
            rowKey={(r) => r.id}
            stickyColCount={3}
            emptyMessage={searchQ.trim()
              ? 'ไม่พบทะเบียนที่ตรงกับคำค้นหา'
              : 'ยังไม่มีทะเบียนผู้รับบริการในกลุ่มนี้ — กด "ลงทะเบียนเด็กใหม่" เพื่อเริ่มบันทึก'}
          />

          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              paddingTop: 'var(--dim-space-200, 8px)',
              borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            }}
          >
            <span style={{ color: 'var(--text-content-secondary, #636B72)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
              {`แสดง ${rangeStart}–${rangeEnd} จาก ${filtered.length} รายการ`}
            </span>
            <div className='flex-1' />
            <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </div>
    </QueuePageShell>
  );
};

export default ImmunizationRegistryPage;
