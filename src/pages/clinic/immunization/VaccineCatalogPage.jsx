import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Textarea from '@/components/forms/Textarea';
import SelectableTag from '@/components/forms/SelectableTag';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Popup from '@/components/popup/Popup';
import PrimarySearch from '@/components/search/PrimarySearch';
import {
  VACCINE_TYPE_OPTIONS,
  VACCINE_ROUTE_OPTIONS,
  EPI_AGE_MILESTONES,
  resolveVaccineType,
  resolveVaccineRoute,
  resolveMilestoneLabel,
  getVaccineCatalogRows,
  getVaccineLots,
  saveVaccine,
  cancelVaccine,
  reactivateVaccine,
  findVaccineDuplicate,
  countVaccineUsage,
  vaccineDoseCount,
  VACCINE_CATALOG_ADMIN_USER,
} from '@/data/immunizationVaccines';
import {
  getAllImmDoses,
  formatImmDate,
  formatImmDateTime,
  hasImmunizationRights,
  setImmunizationRights,
} from '@/data/immunizationClinic';

/* VaccineCatalogPage — ทะเบียนรายการวัคซีน + โปรแกรม EPI (TOR §1.11.1.1).
   Pattern list + create/edit ในหน้าเดียวแบบ PharmacyRegistryPage (อ่านเป็น
   แบบอย่างเท่านั้น — ไม่แตะไฟล์ของโมดูลเภสัช). ครบ 4 กริยา:

     แสดง   — ตารางรายการวัคซีน + ตารางอายุที่ถึงกำหนดของแต่ละเข็ม
     บันทึก — เพิ่ม/แก้ไขรายการ พร้อม validation ชื่อ/รหัสซ้ำ
     แก้ไข  — ฟอร์มเดียวกัน เปิดพร้อมข้อมูลเดิม + audit ผู้แก้ + เวลา
     ยกเลิก — soft-inactivate เท่านั้น (แจ้งจำนวนประวัติที่อ้างถึงก่อน)
              ห้าม hard delete เพื่อไม่ให้ประวัติการฉีดเดิมเสียหาย

   ผู้ใช้ที่ไม่มีสิทธิผู้ดูแลระบบ → อ่านอย่างเดียว (ปุ่มเขียนทั้งหมด disabled). */

const breadcrumb = ['บันทึกการรักษา', 'งานสร้างเสริมภูมิคุ้มกัน', 'ทะเบียนรายการวัคซีน'];
const PAGE_SIZE = 10;

const TABS = [
  { key: 'all',      label: 'ทั้งหมด',    icon: 'group' },
  { key: 'active',   label: 'ใช้งาน',     icon: 'check_circle' },
  { key: 'inactive', label: 'ยกเลิกแล้ว', icon: 'block' },
];

const EMPTY_FORM = {
  id: '', code: '', abbr: '', nameTh: '', nameEn: '',
  type: '', route: '', dose: '', stockCode: '',
  schedule: [{ seq: 1, months: 0 }],
  status: 'active',
};

const Field = ({ label, required, children, hint, hintTone, width }) => (
  <div className='flex flex-col gap-1.5 min-w-0' style={{ flex: width ? `0 0 ${width}px` : '1 1 0', minWidth: 180 }}>
    <div className='flex items-center text-sm text-ink leading-snug'>
      <span>{label}</span>
      {required && <span className='ml-0.5' style={{ color: 'var(--text-input-require)' }}>*</span>}
    </div>
    {children}
    {hint && (
      <span style={{
        color: hintTone === 'error' ? 'var(--text-danger-default, #B91C1C)' : 'var(--text-content-quaternary, #ADB2B7)',
        fontSize: 'var(--type-size-xs)',
      }}>
        {hint}
      </span>
    )}
  </div>
);

const VaccineCatalogPage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);

  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState([]);
  const [savedBanner, setSavedBanner] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const canWrite = hasImmunizationRights();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getVaccineCatalogRows(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allDoses = useMemo(() => getAllImmDoses(), [tick]);

  const tabs = useMemo(() => TABS.map((t) => ({
    ...t,
    count: t.key === 'all' ? rows.length : rows.filter((r) => (t.key === 'active' ? r.status === 'active' : r.status !== 'active')).length,
  })), [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (activeTab === 'active') result = result.filter((r) => r.status === 'active');
    if (activeTab === 'inactive') result = result.filter((r) => r.status !== 'active');
    const q = searchQ.trim().toLowerCase();
    if (q) {
      result = result.filter((r) => [r.code, r.abbr, r.nameTh, r.nameEn, r.stockCode]
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
    setErrors([]);
    setSavedBanner('');
    setDraft(JSON.parse(JSON.stringify(EMPTY_FORM)));
  };

  const openEdit = (row) => {
    setErrors([]);
    setSavedBanner('');
    setDraft({
      id: row.id, code: row.code, abbr: row.abbr, nameTh: row.nameTh, nameEn: row.nameEn || '',
      type: row.type, route: row.route, dose: row.dose, stockCode: row.stockCode || '',
      schedule: (row.schedule || []).map((s) => ({ ...s })),
      status: row.status,
    });
  };

  const closeDraft = () => {
    setDraft(null);
    setErrors([]);
    setDiscardOpen(false);
  };

  const setField = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));

  const setScheduleRow = (idx, key) => (value) => setDraft((d) => ({
    ...d,
    schedule: d.schedule.map((s, i) => (i === idx ? { ...s, [key]: Number(value) } : s)),
  }));

  const addScheduleRow = () => setDraft((d) => ({
    ...d,
    schedule: [...d.schedule, { seq: d.schedule.length + 1, months: 0 }],
  }));

  const removeScheduleRow = (idx) => setDraft((d) => ({
    ...d,
    schedule: d.schedule.length > 1 ? d.schedule.filter((_, i) => i !== idx) : d.schedule,
  }));

  const validate = () => {
    const errs = [];
    if (!draft.code.trim()) errs.push('กรุณาระบุรหัสวัคซีน');
    if (!draft.abbr.trim()) errs.push('กรุณาระบุตัวย่อที่ใช้แสดงในสมุดวัคซีน');
    if (!draft.nameTh.trim()) errs.push('กรุณาระบุชื่อวัคซีนภาษาไทย');
    if (!draft.type) errs.push('กรุณาเลือกชนิดวัคซีน');
    if (!draft.route) errs.push('กรุณาเลือกวิธีบริหาร');
    if (!draft.dose.trim()) errs.push('กรุณาระบุขนาดยาต่อครั้ง');
    if ((draft.schedule || []).length === 0) errs.push('ต้องมีตารางเข็มอย่างน้อย 1 เข็ม');
    const seqs = (draft.schedule || []).map((s) => s.seq);
    if (new Set(seqs).size !== seqs.length) errs.push('ลำดับเข็ม (ครั้งที่) ซ้ำกัน');
    const dup = findVaccineDuplicate(draft);
    if (dup) errs.push(`รหัสหรือชื่อวัคซีนซ้ำกับรายการที่มีอยู่ (${dup.code} — ${dup.nameTh})`);
    return errs;
  };

  const submit = () => {
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }
    const { saved, isNew } = saveVaccine(draft);
    setSavedBanner(isNew
      ? `เพิ่มรายการวัคซีน ${saved.code} — ${saved.nameTh} เรียบร้อย`
      : `แก้ไขรายการวัคซีน ${saved.code} เรียบร้อย · โดย ${saved.updatedBy}`);
    setTick((t) => t + 1);
    setDraft(null);
    setErrors([]);
  };

  const openCancel = (row) => {
    setCancelReason('');
    setCancelError('');
    setCancelTarget(row);
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) { setCancelError('กรุณาระบุเหตุผลการยกเลิกรายการวัคซีน'); return; }
    cancelVaccine(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setCancelReason('');
    setTick((t) => t + 1);
  };

  const columns = useMemo(() => ([
    { key: 'code', label: 'รหัสวัคซีน' },
    { key: 'abbr', label: 'ตัวย่อ' },
    { key: 'nameTh', label: 'ชื่อวัคซีน (ไทย)', flex: true, minWidth: 260 },
    { key: 'nameEn', label: 'ชื่อวัคซีน (อังกฤษ)', flex: true, minWidth: 240, render: (r) => r.nameEn || '—' },
    { key: 'type', label: 'ชนิด', flex: true, minWidth: 200, render: (r) => resolveVaccineType(r.type) },
    { key: 'route', label: 'วิธีบริหาร', flex: true, minWidth: 180, render: (r) => resolveVaccineRoute(r.route) },
    { key: 'dose', label: 'ขนาดต่อครั้ง' },
    { key: 'doseCount', label: 'จำนวนเข็มในโปรแกรม', render: (r) => `${vaccineDoseCount(r)} เข็ม` },
    {
      key: 'schedule', label: 'ตารางอายุที่ถึงกำหนด', flex: true, minWidth: 300, sortable: false,
      render: (r) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          {(r.schedule || []).map((s) => (
            <ColorfulBadge key={s.seq} style='blue' size='small' hierarchy='secondary'>
              {`เข็ม ${s.seq} · ${resolveMilestoneLabel(s.months)}`}
            </ColorfulBadge>
          ))}
        </div>
      ),
    },
    {
      key: 'stock', label: 'รหัสคลังเวชภัณฑ์', flex: true, minWidth: 200,
      render: (r) => {
        const lots = getVaccineLots(r.id);
        return (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <span style={{ fontSize: 'var(--type-size-sm)' }}>{r.stockCode || '—'}</span>
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              {lots.length === 0 ? 'คลังไม่มี lot (mock)' : `${lots.length} lot · คงเหลือรวม ${lots.reduce((sum, l) => sum + l.remaining, 0)} โดส`}
            </span>
          </div>
        );
      },
    },
    {
      key: 'usage', label: 'ประวัติที่อ้างถึง', sortable: false,
      render: (r) => {
        const n = countVaccineUsage(r.id, allDoses);
        return <ColorfulBadge style={n > 0 ? 'teal' : 'grey'} size='small' hierarchy='secondary'>{`${n} เข็ม`}</ColorfulBadge>;
      },
    },
    {
      key: 'status', label: 'สถานะ',
      render: (r) => (r.status === 'active'
        ? <StatusBadge style='success' size='small' icon='check_circle'>ใช้งาน</StatusBadge>
        : (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }} title={r.cancellation?.reason}>
            <StatusBadge style='error' size='small' icon='block'>ยกเลิกแล้ว</StatusBadge>
            {r.cancellation && (
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                เหตุผล: {r.cancellation.reason}
              </span>
            )}
          </div>
        )),
    },
    {
      key: 'audit', label: 'ผู้แก้ไขล่าสุด', flex: true, minWidth: 220,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm)' }}>{r.updatedBy || '—'}</span>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {formatImmDateTime(r.updatedAt)}
          </span>
        </div>
      ),
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton size='sm' leadingIcon='edit' disabled={!canWrite} onClick={() => canWrite && openEdit(r)}>
            แก้ไข
          </NeutralSubdueButton>
          {r.status === 'active' ? (
            <DangerSubdueButton size='sm' leadingIcon='block' disabled={!canWrite} onClick={() => canWrite && openCancel(r)}>
              ยกเลิกใช้งาน
            </DangerSubdueButton>
          ) : (
            <BrandSubdueButton
              variant='outline' size='sm' leadingIcon='restart_alt'
              disabled={!canWrite}
              onClick={() => { if (canWrite) { reactivateVaccine(r.id); setTick((t) => t + 1); } }}
            >
              เปิดใช้งาน
            </BrandSubdueButton>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canWrite, allDoses, tick]);

  const cancelUsage = cancelTarget ? countVaccineUsage(cancelTarget.id, allDoses) : 0;
  const isEditing = !!draft?.id;

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='ทะเบียนรายการวัคซีนและโปรแกรม EPI'
      onBack={() => history.push('/clinic/immunization')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canWrite ? 'lock_open' : 'lock'}
            onClick={() => { setImmunizationRights(!hasImmunizationRights()); setTick((t) => t + 1); }}
            title='สลับสิทธิผู้ดูแลทะเบียนวัคซีน (สำหรับทดสอบ)'
          >
            {canWrite ? 'สิทธิ: แก้ไขได้' : 'สิทธิ: อ่านอย่างเดียว'}
          </NeutralSubdueButton>
          <BrandSubdueButton variant='fill' leadingIcon='add' disabled={!canWrite} onClick={() => canWrite && openCreate()}>
            เพิ่มรายการวัคซีน
          </BrandSubdueButton>
        </div>
      )}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(k) => { setActiveTab(k); setPage(1); }}
    >
      {/* create / edit popup */}
      <Popup
        open={!!draft}
        onClose={() => setDiscardOpen(true)}
        title={isEditing ? `แก้ไขรายการวัคซีน ${draft?.code || ''}` : 'เพิ่มรายการวัคซีนใหม่'}
        subtitle='ข้อมูลนี้ใช้ทั้งในหน้าให้วัคซีน สมุดวัคซีน และตารางความครบถ้วน EPI'
        size='large'
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setDiscardOpen(true) }}
        primaryAction={{ label: isEditing ? 'บันทึกการแก้ไข' : 'บันทึกรายการวัคซีน', onClick: submit }}
      >
        {draft && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
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

            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field label='รหัสวัคซีน' required width={180}>
                <InputField
                  showLabel={false} showHelperText={false} showLeadingIcon={false}
                  value={draft.code} onChange={setField('code')} placeholder='เช่น DTP-HB'
                />
              </Field>
              <Field label='ตัวย่อในสมุดวัคซีน' required width={180}>
                <InputField
                  showLabel={false} showHelperText={false} showLeadingIcon={false}
                  value={draft.abbr} onChange={setField('abbr')} placeholder='เช่น DTPHB'
                />
              </Field>
              <Field label='ชื่อวัคซีน (ไทย)' required>
                <InputField
                  showLabel={false} showHelperText={false} showLeadingIcon={false}
                  value={draft.nameTh} onChange={setField('nameTh')} placeholder='เช่น วัคซีนรวมคอตีบ-บาดทะยัก-ไอกรน-ตับอักเสบบี'
                />
              </Field>
            </div>

            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field label='ชื่อวัคซีน (อังกฤษ)'>
                <InputField
                  showLabel={false} showHelperText={false} showLeadingIcon={false}
                  value={draft.nameEn} onChange={setField('nameEn')} placeholder='เช่น DTP-HB combined vaccine'
                />
              </Field>
              <Field label='ชนิดวัคซีน' required>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  value={draft.type} onChange={setField('type')}
                  options={VACCINE_TYPE_OPTIONS} placeholder='เลือกชนิด'
                />
              </Field>
            </div>

            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field label='วิธีบริหาร' required>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  value={draft.route} onChange={setField('route')}
                  options={VACCINE_ROUTE_OPTIONS} placeholder='เลือกวิธีบริหาร'
                />
              </Field>
              <Field label='ขนาดต่อครั้ง' required width={200}>
                <InputField
                  showLabel={false} showHelperText={false} showLeadingIcon={false}
                  value={draft.dose} onChange={setField('dose')} placeholder='เช่น 0.5 ml'
                />
              </Field>
              <Field label='รหัสคลังเวชภัณฑ์ (mock)' hint='ระบบคลังจริงอยู่ในโมดูลเภสัชกรรม — ที่นี่เก็บเป็นรหัสอ้างอิงเท่านั้น'>
                <InputField
                  showLabel={false} showHelperText={false} showLeadingIcon={false}
                  value={draft.stockCode} onChange={setField('stockCode')} placeholder='เช่น STK-VAC-003'
                />
              </Field>
            </div>

            <div className='flex items-center gap-2 w-full'>
              <span className='text-brand-500'><Icon name='event_list' size={20} /></span>
              <h3 className='text-base font-bold text-brand-500'>ตารางเข็มในโปรแกรม EPI</h3>
            </div>

            {draft.schedule.map((s, idx) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={`sched-${idx}`} className='flex items-end w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <Field label='ครั้งที่ / เข็มที่' width={160}>
                  <Select
                    showLabel={false} searchable={false} size='lg'
                    value={String(s.seq)} onChange={setScheduleRow(idx, 'seq')}
                    options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `ครั้งที่ ${n}` }))}
                    placeholder='เลือก'
                  />
                </Field>
                <Field label='อายุที่ถึงกำหนด'>
                  <Select
                    showLabel={false} searchable={false} size='lg'
                    value={String(s.months)} onChange={setScheduleRow(idx, 'months')}
                    options={EPI_AGE_MILESTONES.map((m) => ({ value: String(m.months), label: m.label }))}
                    placeholder='เลือกช่วงอายุ'
                  />
                </Field>
                <NeutralSubdueButton
                  size='sm' leadingIcon='delete'
                  disabled={draft.schedule.length <= 1}
                  onClick={() => removeScheduleRow(idx)}
                >
                  ลบเข็ม
                </NeutralSubdueButton>
              </div>
            ))}

            <BrandDashedAddButton onClick={addScheduleRow}>เพิ่มเข็มในโปรแกรม</BrandDashedAddButton>

            <div className='flex items-center gap-2 flex-wrap'>
              <SelectableTag
                label='เปิดใช้งานรายการนี้'
                size='lg'
                selected={draft.status === 'active'}
                onClick={() => setDraft((d) => ({ ...d, status: d.status === 'active' ? 'inactive' : 'active' }))}
              />
            </div>
          </div>
        )}
      </Popup>

      <Popup
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title='ยกเลิกการแก้ไขรายการวัคซีน'
        tertiaryAction={{ label: 'ทำต่อ', onClick: () => setDiscardOpen(false) }}
        primaryAction={{ label: 'ทิ้งการแก้ไข', onClick: closeDraft, tone: 'danger' }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
          ข้อมูลที่กรอกไว้จะไม่ถูกบันทึกและกลับไปใช้ค่าเดิมของรายการ ต้องการทิ้งการแก้ไขหรือไม่
        </span>
      </Popup>

      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกการใช้งานรายการวัคซีน'
        subtitle={cancelTarget ? `${cancelTarget.code} — ${cancelTarget.nameTh}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกการใช้งาน', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <div
            className='flex items-start gap-2 w-full'
            style={{
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
            <span>
              รายการนี้ถูกอ้างถึงในประวัติการฉีดแล้ว <strong>{cancelUsage} เข็ม</strong> —
              ระบบจะปิดการใช้งาน (soft-inactivate) เท่านั้น ไม่ลบข้อมูล
              ประวัติเดิมทั้งหมดยังดูย้อนหลังและพิมพ์ได้ตามปกติ แต่จะเลือกวัคซีนนี้ให้เข็มใหม่ไม่ได้
            </span>
          </div>
          <Textarea
            label='เหตุผลการยกเลิกการใช้งาน'
            required
            value={cancelReason}
            onChange={(v) => { setCancelReason(v); if (v.trim()) setCancelError(''); }}
            error={cancelError || undefined}
            placeholder='เช่น เปลี่ยนไปใช้วัคซีนรวมตามแผนงานสร้างเสริมภูมิคุ้มกันโรคปีล่าสุด'
          />
        </div>
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
            <span>บัญชีของคุณไม่มีสิทธิผู้ดูแลทะเบียนวัคซีน — ดูข้อมูลได้อย่างเดียว</span>
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
              placeholder='ค้นหา รหัสวัคซีน / ตัวย่อ / ชื่อวัคซีน / รหัสคลัง'
              width={640}
            />
          </div>

          <Table
            columns={columns}
            rows={pageRows}
            rowKey={(r) => r.id}
            stickyColCount={2}
            emptyMessage={searchQ.trim()
              ? 'ไม่พบรายการวัคซีนที่ตรงกับคำค้นหา'
              : 'ยังไม่มีรายการวัคซีนในกลุ่มนี้ — กด "เพิ่มรายการวัคซีน" เพื่อเริ่มบันทึก'}
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

          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            ผู้ดูแลทะเบียนวัคซีน (mock): {VACCINE_CATALOG_ADMIN_USER} · ข้อมูล lot/คงเหลือเป็น mock
            เนื่องจากระบบคลังเวชภัณฑ์จริงอยู่ในโมดูลเภสัชกรรม (TOR §1.9)
          </span>
        </div>
      </div>
    </QueuePageShell>
  );
};

export default VaccineCatalogPage;
